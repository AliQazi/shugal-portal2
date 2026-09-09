// controllers/rateVolume.controller.js

import RateVolume from "../models/RateVolume.js";

const RATE_FIELDS = [
  "hotel",
  "city",
  "buyingPrice",
  "buyingRoe",
  "buyingCurrency",
  "sellingPrice",
  "sellingRoe",
  "sellingCurrency",
  "sharedRoomBuyingPrice",
  "sharedRoomBuyingRoe",
  "sharedRoomBuyingCurrency",
  "sharedRoomSellingPrice",
  "sharedRoomSellingRoe",
  "sharedRoomSellingCurrency",
];

const normalizeHotelRate = (rate = {}) => ({
  hotel: rate.hotel,
  city: rate.city || "",
  buyingPrice: rate.buyingPrice ?? 0,
  buyingRoe: rate.buyingRoe ?? 1,
  buyingCurrency: rate.buyingCurrency || "PKR",
  sellingPrice: rate.sellingPrice ?? 0,
  sellingRoe: rate.sellingRoe ?? 1,
  sellingCurrency: rate.sellingCurrency || "PKR",
  sharedRoomBuyingPrice: rate.sharedRoomBuyingPrice ?? 0,
  sharedRoomBuyingRoe: rate.sharedRoomBuyingRoe ?? 1,
  sharedRoomBuyingCurrency: rate.sharedRoomBuyingCurrency || "PKR",
  sharedRoomSellingPrice: rate.sharedRoomSellingPrice ?? 0,
  sharedRoomSellingRoe: rate.sharedRoomSellingRoe ?? 1,
  sharedRoomSellingCurrency: rate.sharedRoomSellingCurrency || "PKR",
});

const getHotelRatesFromBody = (body) => {
  if (Array.isArray(body.hotelRates)) {
    return body.hotelRates.map(normalizeHotelRate);
  }

  // Backward-compatible support for the original single-hotel request body.
  return body.hotel ? [normalizeHotelRate(body)] : [];
};

const validateHotelRates = (hotelRates) => {
  if (!hotelRates.length) return "At least one hotel rate is required";

  for (let index = 0; index < hotelRates.length; index += 1) {
    const rate = hotelRates[index];
    if (!rate.hotel) return `Hotel is required for hotel rate ${index + 1}`;
  }

  return null;
};

const getDateRangeFromBody = (body) => {
  const firstHotelRate = Array.isArray(body.hotelRates) ? body.hotelRates[0] : undefined;
  return {
    // The nested fallbacks accept payloads sent by the short-lived version that
    // stored a separate date range in every hotelRates item.
    fromDate: body.fromDate || firstHotelRate?.fromDate,
    toDate: body.toDate || firstHotelRate?.toDate,
  };
};

const validateDateRange = ({ fromDate, toDate }) => {
  if (!fromDate || !toDate) return "From date and to date are required";
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "Date range is invalid";
  if (from > to) return "From date cannot be after to date";
  return null;
};

const legacyFieldsFromFirstRate = (hotelRates) => {
  const firstRate = hotelRates[0];
  return RATE_FIELDS.reduce((fields, key) => {
    fields[key] = firstRate[key];
    return fields;
  }, {});
};

const populateRateVolume = (query) =>
  query
    .populate("hotel", "hotelName city")
    .populate("hotelRates.hotel", "hotelName city");

// CREATE RATE VOLUME
export const createRateVolume = async (req, res) => {
  try {
    const { volumeName, isActive } = req.body;

    if (!volumeName) {
      return res.status(400).json({
        success: false,
        message: "Volume name is required",
      });
    }

    const hotelRates = getHotelRatesFromBody(req.body);
    const validationError = validateHotelRates(hotelRates);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const dateRange = getDateRangeFromBody(req.body);
    const dateValidationError = validateDateRange(dateRange);
    if (dateValidationError) {
      return res.status(400).json({ success: false, message: dateValidationError });
    }

    const rateVolume = await RateVolume.create({
      volumeName,
      ...dateRange,
      hotelRates,
      ...legacyFieldsFromFirstRate(hotelRates),
      isActive: isActive !== undefined ? isActive : true,
    });

    await rateVolume.populate([
      { path: "hotel", select: "hotelName city" },
      { path: "hotelRates.hotel", select: "hotelName city" },
    ]);

    res.status(201).json({
      success: true,
      message: "Rate volume created successfully",
      data: rateVolume,
    });
  } catch (error) {
    console.error("Create rate volume error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL RATE VOLUMES
export const getAllRateVolumes = async (req, res) => {
  try {
    const { isActive } = req.query;

    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const rateVolumes = await populateRateVolume(
      RateVolume.find(filter).sort({ createdAt: -1 }).select("-__v"),
    );

    res.status(200).json({
      success: true,
      count: rateVolumes.length,
      data: rateVolumes,
    });
  } catch (error) {
    console.error("Get rate volumes error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE RATE VOLUME
export const getSingleRateVolume = async (req, res) => {
  try {
    const rateVolume = await populateRateVolume(
      RateVolume.findById(req.params.id).select("-__v"),
    );

    if (!rateVolume) {
      return res.status(404).json({
        success: false,
        message: "Rate volume not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rateVolume,
    });
  } catch (error) {
    console.error("Get single rate volume error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE RATE VOLUME
export const updateRateVolume = async (req, res) => {
  try {
    const { volumeName, isActive } = req.body;

    const updateData = {
      ...(volumeName !== undefined && { volumeName }),
      ...(isActive !== undefined && { isActive }),
    };

    const hasRatePayload = Array.isArray(req.body.hotelRates) || req.body.hotel !== undefined;
    if (hasRatePayload) {
      const hotelRates = getHotelRatesFromBody(req.body);
      const validationError = validateHotelRates(hotelRates);
      if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
      }
      updateData.hotelRates = hotelRates;
      Object.assign(updateData, legacyFieldsFromFirstRate(hotelRates));
    }

    const hasDatePayload = req.body.fromDate !== undefined || req.body.toDate !== undefined || Array.isArray(req.body.hotelRates);
    if (hasDatePayload) {
      const dateRange = getDateRangeFromBody(req.body);
      const dateValidationError = validateDateRange(dateRange);
      if (dateValidationError) {
        return res.status(400).json({ success: false, message: dateValidationError });
      }
      Object.assign(updateData, dateRange);
    }

    const rateVolume = await populateRateVolume(
      RateVolume.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      }).select("-__v"),
    );

    if (!rateVolume) {
      return res.status(404).json({
        success: false,
        message: "Rate volume not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Rate volume updated successfully",
      data: rateVolume,
    });
  } catch (error) {
    console.error("Update rate volume error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE RATE VOLUME
export const deleteRateVolume = async (req, res) => {
  try {
    const rateVolume = await RateVolume.findByIdAndDelete(req.params.id);

    if (!rateVolume) {
      return res.status(404).json({
        success: false,
        message: "Rate volume not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Rate volume deleted successfully",
    });
  } catch (error) {
    console.error("Delete rate volume error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// TOGGLE RATE VOLUME STATUS
export const toggleRateVolumeStatus = async (req, res) => {
  try {
    const rateVolume = await RateVolume.findById(req.params.id);

    if (!rateVolume) {
      return res.status(404).json({
        success: false,
        message: "Rate volume not found",
      });
    }

    rateVolume.isActive = !rateVolume.isActive;
    await rateVolume.save();

    res.status(200).json({
      success: true,
      message: `Rate volume ${rateVolume.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        _id: rateVolume._id,
        isActive: rateVolume.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle rate volume status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
