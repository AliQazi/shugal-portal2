import GlobalSetting from "../models/GlobalSetting.js";
import ActivityLog from "../models/activitylogs.js";

const MINUTES_IN_DAY = 24 * 60;

const parseTimeToMinutes = (time, period) => {
    if (!time || !period) return null;

    const [hourRaw, minuteRaw] = String(time).split(":");

    let hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 1 ||
        hour > 12 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    const normalizedPeriod = String(period).toUpperCase();

    if (normalizedPeriod === "AM") {
        if (hour === 12) hour = 0;
    } else if (normalizedPeriod === "PM") {
        if (hour !== 12) hour += 12;
    } else {
        return null;
    }

    return hour * 60 + minute;
};

const normalizeRange = (fromMinutes, toMinutes) => {
    let normalizedToMinutes = toMinutes;

    // Overnight case:
    // Example: 7 PM to 10 AM
    // fromMinutes = 1140
    // toMinutes = 600
    // normalizedToMinutes = 600 + 1440 = 2040
    if (normalizedToMinutes <= fromMinutes) {
        normalizedToMinutes += MINUTES_IN_DAY;
    }

    return {
        fromMinutes,
        toMinutes: normalizedToMinutes,
    };
};

const splitRangeForOverlap = (fromMinutes, toMinutes) => {
    // Normal same-day slab
    if (toMinutes <= MINUTES_IN_DAY) {
        return [[fromMinutes, toMinutes]];
    }

    // Overnight slab
    // Example: 1140 to 2040 becomes:
    // 1140 to 1440
    // 0 to 600
    return [
        [fromMinutes, MINUTES_IN_DAY],
        [0, toMinutes - MINUTES_IN_DAY],
    ];
};

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
    return aStart < bEnd && aEnd > bStart;
};

const hasOverlap = ({
    fromMinutes,
    toMinutes,
    timeSlabs,
    ignoreSlabId = null,
}) => {
    const newRanges = splitRangeForOverlap(fromMinutes, toMinutes);

    return timeSlabs.some((slab) => {
        if (ignoreSlabId && String(slab._id) === String(ignoreSlabId)) {
            return false;
        }

        if (slab.status !== "Active") {
            return false;
        }

        const existingRanges = splitRangeForOverlap(
            Number(slab.fromMinutes),
            Number(slab.toMinutes),
        );

        return newRanges.some(([newStart, newEnd]) =>
            existingRanges.some(([existingStart, existingEnd]) =>
                rangesOverlap(newStart, newEnd, existingStart, existingEnd),
            ),
        );
    });
};

const getOrCreateBookingHoldSetting = async (apiKey) => {
    const query = {
        type: "booking_hold_duration",
    };

    // If apiKey is provided, filter by it
    if (apiKey) {
        query.api_key = apiKey;
    }

    let setting = await GlobalSetting.findOne(query);

    if (!setting) {
        // Create new setting with the specified api_key
        setting = await GlobalSetting.create({
            type: "booking_hold_duration",
            api_key: apiKey || null, // If no apiKey, set to null (admin/default)
            timeSlabs: [],
        });
    }

    return setting;
};

// New function to aggregate all time slabs from all API keys
const getAllBookingHoldSettings = async () => {
    const allSettings = await GlobalSetting.find({ type: "booking_hold_duration" });
    
    // Aggregate all time slabs into a single virtual setting
    const aggregatedSlabs = [];
    allSettings.forEach(setting => {
        setting.timeSlabs.forEach(slab => {
            // Add metadata to identify which API key this slab belongs to
            aggregatedSlabs.push({
                ...slab.toObject(), 
                apiKey: setting.api_key || 'default'
            });
        });
    });
    
    // Return a virtual setting with all slabs combined
    return {
        _id: "aggregated-all-keys",
        type: "booking_hold_duration",
        api_key: "all", // Indicate this is aggregated
        timeSlabs: aggregatedSlabs,
        createdAt: new Date(),
        updatedAt: new Date()
    };
};

export const getGlobalSettings = async (req, res) => {
    try {
        // Always return all booking hold duration settings aggregated
        const aggregatedSettings = await getAllBookingHoldSettings();
        
        return res.status(200).json({
            success: true,
            data: aggregatedSettings,
        });
    } catch (error) {
        console.error("Error fetching global settings:", error);

        return res.status(500).json({
            success: false,
            message: "Error fetching global settings",
            error: error.message,
        });
    }
};

export const addTimeSlab = async (req, res) => {
    try {
        const { api_key } = req.query;
        
        // Validate api_key if provided
        if (api_key) {
            const validKeys = ["admin", "al-haider", "travel-network", "skypass", "mct", "upsky", "ALSABOOR", "amaar-shoaib"];
            if (!validKeys.includes(api_key)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid api_key provided",
                });
            }
        }

        const {
            timeFrom,
            timeTo,
            timeFromPeriod,
            timeToPeriod,
            holdDurationHours,
        } = req.body;

        if (
            !timeFrom ||
            !timeTo ||
            !timeFromPeriod ||
            !timeToPeriod ||
            holdDurationHours === undefined ||
            holdDurationHours === null ||
            holdDurationHours === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const rawFromMinutes = parseTimeToMinutes(timeFrom, timeFromPeriod);
        const rawToMinutes = parseTimeToMinutes(timeTo, timeToPeriod);

        if (rawFromMinutes === null || rawToMinutes === null) {
            return res.status(400).json({
                success: false,
                message: "Invalid time format",
            });
        }

        const { fromMinutes, toMinutes } = normalizeRange(
            rawFromMinutes,
            rawToMinutes,
        );

        const duration = Number(holdDurationHours);

        if (Number.isNaN(duration) || duration <= 0) {
            return res.status(400).json({
                success: false,
                message: "Hold Duration must be greater than 0",
            });
        }

        // Find or create the setting for the specific api_key
        const setting = await getOrCreateBookingHoldSetting(api_key);

        const overlaps = hasOverlap({
            fromMinutes,
            toMinutes,
            timeSlabs: setting.timeSlabs,
        });

        if (overlaps) {
            return res.status(400).json({
                success: false,
                message: "This time slab overlaps with an existing active slab",
            });
        }

        setting.timeSlabs.push({
            timeFrom,
            timeTo,
            timeFromPeriod: String(timeFromPeriod).toUpperCase(),
            timeToPeriod: String(timeToPeriod).toUpperCase(),
            fromMinutes,
            toMinutes,
            holdDurationHours: duration,
            status: "Active",
        });

        await setting.save();

        await ActivityLog.create({
            user: req.user._id,
            type: "Global",
            description: `Time slab ${timeFrom} ${timeFromPeriod} - ${timeTo} ${timeToPeriod} (${duration}h hold) added for ${api_key || 'default'}`,
        });

        return res.status(201).json({
            success: true,
            message: "Time slab added successfully",
            data: setting,
        });
    } catch (error) {
        console.error("Error adding time slab:", error);

        return res.status(500).json({
            success: false,
            message: "Error adding time slab",
            error: error.message,
        });
    }
};

export const updateTimeSlab = async (req, res) => {
    try {
        const { slabId } = req.params;  // Get slabId from URL params instead of body
        const { api_key } = req.query;

        // Validate api_key if provided
        if (api_key) {
            const validKeys = ["admin", "al-haider", "travel-network", "skypass", "mct", "upsky", "ALSABOOR", "amaar-shoaib"];
            if (!validKeys.includes(api_key)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid api_key provided",
                });
            }
        }

        const {
            timeFrom,
            timeTo,
            timeFromPeriod,
            timeToPeriod,
            holdDurationHours,
            status,
        } = req.body;

        // First, find the slab in ANY document since we don't know which API key it currently belongs to
        const allSettings = await GlobalSetting.find({ type: "booking_hold_duration" });
        
        let sourceSetting = null;
        let slabIndex = -1;
        let foundSlab = null;
        
        for (const setting of allSettings) {
            slabIndex = setting.timeSlabs.findIndex(slab => String(slab._id) === String(slabId));
            if (slabIndex !== -1) {
                sourceSetting = setting;
                foundSlab = setting.timeSlabs[slabIndex];
                break;
            }
        }

        if (!foundSlab) {
            return res.status(404).json({
                success: false,
                message: "Time slab not found",
            });
        }

        // Determine target API key - if not provided in query, keep the original
        const targetApiKey = api_key || sourceSetting.api_key;

        // Update the slab properties
        const nextTimeFrom = timeFrom ?? foundSlab.timeFrom;
        const nextTimeTo = timeTo ?? foundSlab.timeTo;
        const nextTimeFromPeriod = timeFromPeriod ?? foundSlab.timeFromPeriod;
        const nextTimeToPeriod = timeToPeriod ?? foundSlab.timeToPeriod;
        const nextStatus = status ?? foundSlab.status;

        const rawFromMinutes = parseTimeToMinutes(
            nextTimeFrom,
            nextTimeFromPeriod,
        );

        const rawToMinutes = parseTimeToMinutes(
            nextTimeTo,
            nextTimeToPeriod,
        );

        if (rawFromMinutes === null || rawToMinutes === null) {
            return res.status(400).json({
                success: false,
                message: "Invalid time format",
            });
        }

        const { fromMinutes, toMinutes } = normalizeRange(
            rawFromMinutes,
            rawToMinutes,
        );

        const duration =
            holdDurationHours !== undefined &&
                holdDurationHours !== null &&
                holdDurationHours !== ""
                ? Number(holdDurationHours)
                : Number(foundSlab.holdDurationHours);

        if (Number.isNaN(duration) || duration <= 0) {
            return res.status(400).json({
                success: false,
                message: "Hold Duration must be greater than 0",
            });
        }

        if (!["Active", "Inactive"].includes(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status",
            });
        }

        if (nextStatus === "Active") {
            // Check for overlaps in the TARGET setting (the setting for the new API key)
            const targetSetting = await getOrCreateBookingHoldSetting(targetApiKey);
            
            // If changing API key, we need to check against the target setting
            const checkAgainstSetting = targetApiKey !== (sourceSetting.api_key || null) 
                ? targetSetting 
                : sourceSetting;
                
            const overlaps = hasOverlap({
                fromMinutes,
                toMinutes,
                timeSlabs: checkAgainstSetting.timeSlabs.filter(slab => String(slab._id) !== String(slabId)),
            });

            if (overlaps) {
                return res.status(400).json({
                    success: false,
                    message: "This time slab overlaps with an existing active slab",
                });
            }
        }

        // Update the slab properties
        foundSlab.timeFrom = nextTimeFrom;
        foundSlab.timeTo = nextTimeTo;
        foundSlab.timeFromPeriod = String(nextTimeFromPeriod).toUpperCase();
        foundSlab.timeToPeriod = String(nextTimeToPeriod).toUpperCase();
        foundSlab.fromMinutes = fromMinutes;
        foundSlab.toMinutes = toMinutes;
        foundSlab.holdDurationHours = duration;
        foundSlab.status = nextStatus;

        // If the API key is changing, move the slab to the target document
        if (targetApiKey !== (sourceSetting.api_key || null)) {
            // Remove the slab from the source document
            sourceSetting.timeSlabs.splice(slabIndex, 1);
            
            // Save the source setting (this might result in the document being deleted if empty)
            if (sourceSetting.timeSlabs.length === 0) {
                await GlobalSetting.findByIdAndDelete(sourceSetting._id);
            } else {
                await sourceSetting.save();
            }
            
            // Add the slab to the target document
            let targetSetting = await GlobalSetting.findOne({ 
                type: "booking_hold_duration", 
                api_key: targetApiKey 
            });
            
            if (!targetSetting) {
                targetSetting = await GlobalSetting.create({
                    type: "booking_hold_duration",
                    api_key: targetApiKey,
                    timeSlabs: [],
                });
            }
            
            targetSetting.timeSlabs.push(foundSlab);
            await targetSetting.save();
        } else {
            // Same document, just save the source setting
            await sourceSetting.save();
        }

        await ActivityLog.create({
            user: req.user._id,
            type: "Global",
            description: `Time slab updated to ${foundSlab.timeFrom} ${foundSlab.timeFromPeriod} - ${foundSlab.timeTo} ${foundSlab.timeToPeriod} (${foundSlab.holdDurationHours}h hold, status: ${foundSlab.status}), API key: ${targetApiKey || 'default'}`,
        });

        // Return the updated aggregated settings
        const updatedAggregatedSettings = await getAllBookingHoldSettings();

        return res.status(200).json({
            success: true,
            message: "Time slab updated successfully",
            data: updatedAggregatedSettings,
        });
    } catch (error) {
        console.error("Error updating time slab:", error);

        return res.status(500).json({
            success: false,
            message: "Error updating time slab",
            error: error.message,
        });
    }
};

export const deleteTimeSlab = async (req, res) => {
    try {
        const { slabId } = req.params;  // Get slabId from URL params instead of body
        const { api_key } = req.query;

        // Validate api_key if provided
        if (api_key) {
            const validKeys = ["admin", "al-haider", "travel-network", "skypass", "mct", "upsky", "ALSABOOR", "amaar-shoaib"];
            if (!validKeys.includes(api_key)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid api_key provided",
                });
            }
        }

        // Find or create the setting for the specific api_key
        const setting = await getOrCreateBookingHoldSetting(api_key);

        const slabIndex = setting.timeSlabs.findIndex(slab => String(slab._id) === String(slabId));

        if (slabIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Time slab not found",
            });
        }

        // Remove the slab from the array
        setting.timeSlabs.splice(slabIndex, 1);

        // Check if this setting has any time slabs left
        // If no time slabs are left, delete the entire document
        if (setting.timeSlabs.length === 0) {
            await GlobalSetting.findByIdAndDelete(setting._id);
        } else {
            await setting.save();
        }

        await ActivityLog.create({
            user: req.user._id,
            type: "Global",
            description: `Time slab deleted (ID: ${slabId}) for ${api_key || 'default'}`,
        });

        // Return the updated aggregated settings
        const updatedAggregatedSettings = await getAllBookingHoldSettings();

        return res.status(200).json({
            success: true,
            message: "Time slab deleted successfully",
            data: updatedAggregatedSettings,
        });
    } catch (error) {
        console.error("Error deleting time slab:", error);

        return res.status(500).json({
            success: false,
            message: "Error deleting time slab",
            error: error.message,
        });
    }
};