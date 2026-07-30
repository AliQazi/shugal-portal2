import GlobalSetting from "../models/GlobalSetting.js";

const DEFAULT_HOLD_DURATION = 2 * 60 * 60 * 1000;
const MINUTES_IN_DAY = 24 * 60;

const getMinutesFromDate = (date) => {
    const d = new Date(date);
    return d.getHours() * 60 + d.getMinutes();
};

const isBookingInsideSlab = (bookingMinutes, slab) => {
    const fromMinutes = Number(slab.fromMinutes);
    const toMinutes = Number(slab.toMinutes);

    // Same-day slab
    if (toMinutes <= MINUTES_IN_DAY) {
        return bookingMinutes >= fromMinutes && bookingMinutes < toMinutes;
    }

    // Overnight slab
    // Example: 7 PM to 10 AM = 1140 to 2040
    // Booking at 8 PM = 1200, direct match
    // Booking at 9 AM = 540 + 1440 = 1980, next-day match
    const nextDayBookingMinutes = bookingMinutes + MINUTES_IN_DAY;

    return (
        (bookingMinutes >= fromMinutes && bookingMinutes < toMinutes) ||
        (nextDayBookingMinutes >= fromMinutes &&
            nextDayBookingMinutes < toMinutes)
    );
};

export const calculateBookingExpiresAt = async (baseDate = new Date(), bookingSource = 'admin') => {
    // Map the booking source to the API key used in the global settings
    const apiKey = bookingSource || 'admin';
    
    const setting = await GlobalSetting.findOne({
        type: "booking_hold_duration",
        api_key: apiKey
    }).lean();

    // If no specific setting found for this source, try to find the general one or use default
    if (!setting || !Array.isArray(setting.timeSlabs) || setting.timeSlabs.length === 0) {
        // Try to find the default setting (without api_key or with 'admin')
        const defaultSetting = await GlobalSetting.findOne({
            type: "booking_hold_duration",
            $or: [
                { api_key: null },
                { api_key: 'admin' },
                { api_key: { $exists: false } }
            ]
        }).lean();
        
        if (!defaultSetting || !Array.isArray(defaultSetting.timeSlabs) || defaultSetting.timeSlabs.length === 0) {
            return new Date(new Date(baseDate).getTime() + DEFAULT_HOLD_DURATION);
        }
        
        // Use the default setting
        return calculateExpiryForSetting(defaultSetting, baseDate);
    }

    return calculateExpiryForSetting(setting, baseDate);
};

// Helper function to calculate expiry based on a specific setting
const calculateExpiryForSetting = (setting, baseDate) => {
    const bookingMinutes = getMinutesFromDate(baseDate);

    const matchedSlab = setting.timeSlabs.find((slab) => {
        if (slab.status !== "Active") return false;

        return isBookingInsideSlab(bookingMinutes, slab);
    });

    if (!matchedSlab) {
        return new Date(new Date(baseDate).getTime() + DEFAULT_HOLD_DURATION);
    }

    const holdDurationMs =
        Number(matchedSlab.holdDurationHours) * 60 * 60 * 1000;

    return new Date(new Date(baseDate).getTime() + holdDurationMs);
};
