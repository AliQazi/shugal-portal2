// controllers/rateVolume.controller.js

import RateVolume from "../models/RateVolume.js";

// CREATE RATE VOLUME
export const createRateVolume = async (req, res) => {
  try {
    const {
      volumeName,
      hotel,
      city,
      fromDate,
      toDate,
      buyingPrice,
      buyingRoe,
      buyingCurrency,
      sellingPrice,
      sellingRoe,
      sellingCurrency,
      sharedRoomBuyingPrice,
      sharedRoomBuyingRoe,
      sharedRoomBuyingCurrency,
      sharedRoomSellingPrice,
      sharedRoomSellingRoe,
      sharedRoomSellingCurrency,
      isActive,
    } = req.body;

    if (!volumeName) {
      return res.status(400).json({
        success: false,
        message: "Volume name is required",
      });
    }

    if (!hotel) {
      return res.status(400).json({
        success: false,
        message: "Hotel is required",
      });
    }

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "From date and to date are required",
      });
    }

    const rateVolume = await RateVolume.create({
      volumeName,
      hotel,
      city: city || "",
      fromDate,
      toDate,
      buyingPrice: buyingPrice || 0,
      buyingRoe: buyingRoe || 1,
      buyingCurrency: buyingCurrency || "PKR",
      sellingPrice: sellingPrice || 0,
      sellingRoe: sellingRoe || 1,
      sellingCurrency: sellingCurrency || "PKR",
      sharedRoomBuyingPrice: sharedRoomBuyingPrice || 0,
      sharedRoomBuyingRoe: sharedRoomBuyingRoe || 1,
      sharedRoomBuyingCurrency: sharedRoomBuyingCurrency || "PKR",
      sharedRoomSellingPrice: sharedRoomSellingPrice || 0,
      sharedRoomSellingRoe: sharedRoomSellingRoe || 1,
      sharedRoomSellingCurrency: sharedRoomSellingCurrency || "PKR",
      isActive: isActive !== undefined ? isActive : true,
    });

    await rateVolume.populate("hotel", "hotelName city");

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

    const rateVolumes = await RateVolume.find(filter)
      .sort({ createdAt: -1 })
      .select("-__v")
      .populate("hotel", "hotelName city");

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
    const rateVolume = await RateVolume.findById(req.params.id)
      .select("-__v")
      .populate("hotel", "hotelName city");

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
    const {
      volumeName,
      hotel,
      city,
      fromDate,
      toDate,
      buyingPrice,
      buyingRoe,
      buyingCurrency,
      sellingPrice,
      sellingRoe,
      sellingCurrency,
      sharedRoomBuyingPrice,
      sharedRoomBuyingRoe,
      sharedRoomBuyingCurrency,
      sharedRoomSellingPrice,
      sharedRoomSellingRoe,
      sharedRoomSellingCurrency,
      isActive,
    } = req.body;

    const updateData = {
      ...(volumeName !== undefined && { volumeName }),
      ...(hotel !== undefined && { hotel }),
      ...(city !== undefined && { city }),
      ...(fromDate !== undefined && { fromDate }),
      ...(toDate !== undefined && { toDate }),
      ...(buyingPrice !== undefined && { buyingPrice }),
      ...(buyingRoe !== undefined && { buyingRoe }),
      ...(buyingCurrency !== undefined && { buyingCurrency }),
      ...(sellingPrice !== undefined && { sellingPrice }),
      ...(sellingRoe !== undefined && { sellingRoe }),
      ...(sellingCurrency !== undefined && { sellingCurrency }),
      ...(sharedRoomBuyingPrice !== undefined && { sharedRoomBuyingPrice }),
      ...(sharedRoomBuyingRoe !== undefined && { sharedRoomBuyingRoe }),
      ...(sharedRoomBuyingCurrency !== undefined && { sharedRoomBuyingCurrency }),
      ...(sharedRoomSellingPrice !== undefined && { sharedRoomSellingPrice }),
      ...(sharedRoomSellingRoe !== undefined && { sharedRoomSellingRoe }),
      ...(sharedRoomSellingCurrency !== undefined && { sharedRoomSellingCurrency }),
      ...(isActive !== undefined && { isActive }),
    };

    const rateVolume = await RateVolume.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .select("-__v")
      .populate("hotel", "hotelName city");

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
