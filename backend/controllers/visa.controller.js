// controllers/visa.controller.js

import Visa from "../models/Visa.js";
import ActivityLog from "../models/activitylogs.js";

// CREATE VISA
export const createVisa = async (req, res) => {
  try {
    const {
      visaType,
      withTransport,
      processingTime,
      buyingPrice,
      buyingRoe, // Added
      buyingCurrency, // Added
      sellingPrice,
      sellingRoe, // Added
      sellingCurrency, // Added
      currency,
      description,
    } = req.body;

    const visa = await Visa.create({
      visaType,
      withTransport,
      processingTime,
      buyingPrice,
      buyingRoe, // Added
      buyingCurrency, // Added
      sellingPrice,
      sellingRoe, // Added
      sellingCurrency, // Added
      currency,
      description,
    });

    await ActivityLog.create({
      user: req.user._id,
      type: "Visa",
      refModel: "Visa",
      refId: visa._id,
      description: `Visa "${visa.visaType}" created`,
    });

    res.status(201).json({
      success: true,
      message: "Visa created successfully",
      data: visa,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL VISAS
export const getAllVisas = async (req, res) => {
  try {
    const { q } = req.query;
    const query = q
      ? {
          $or: [
            { visaType: { $regex: q, $options: "i" } },
            { currency: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const visas = await Visa.find(query)
      .sort({ withTransport: 1, createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: visas.length,
      data: visas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// SEARCH VISAS (alias endpoint)
export const searchVisas = async (req, res) => {
  return getAllVisas(req, res);
};

// GET SINGLE VISA
export const getSingleVisa = async (req, res) => {
  try {
    const visa = await Visa.findById(req.params.id);

    if (!visa) {
      return res.status(404).json({
        success: false,
        message: "Visa not found",
      });
    }

    res.status(200).json({
      success: true,
      data: visa,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE VISA
export const updateVisa = async (req, res) => {
  try {
    const {
      visaType,
      withTransport,
      processingTime,
      buyingPrice,
      buyingRoe, // Added
      buyingCurrency, // Added
      sellingPrice,
      sellingRoe, // Added
      sellingCurrency, // Added
      currency,
      description,
    } = req.body;

    const visa = await Visa.findByIdAndUpdate(
      req.params.id,
      {
        visaType,
        withTransport,
        processingTime,
        buyingPrice,
        buyingRoe, // Added
        buyingCurrency, // Added
        sellingPrice,
        sellingRoe, // Added
        sellingCurrency, // Added
        currency,
        description,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!visa) {
      return res.status(404).json({
        success: false,
        message: "Visa not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Visa",
      refModel: "Visa",
      refId: visa._id,
      description: `Visa "${visa.visaType}" updated`,
    });

    res.status(200).json({
      success: true,
      message: "Visa updated successfully",
      data: visa,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE VISA
export const deleteVisa = async (req, res) => {
  try {
    const visa = await Visa.findByIdAndDelete(req.params.id);

    if (!visa) {
      return res.status(404).json({
        success: false,
        message: "Visa not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Visa",
      description: `Visa "${visa.visaType}" deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Visa deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
