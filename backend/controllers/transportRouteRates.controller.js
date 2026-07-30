import TransportRouteRates from "../models/TransportRouteRates.js";

export const createTransportRouteRates = async (req, res) => {
  try {
    const newTransportRouteRates = new TransportRouteRates({
      ...req.body,
    });
    await newTransportRouteRates.save();
    res.status(201).json({
      success: true,
      message: "TransportRouteRates created successfully",
      data: newTransportRouteRates,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllTransportRouteRates = async (req, res) => {
  try {
    const transportRouteRates = await TransportRouteRates.find({}).sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        data: transportRouteRates,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTransportRouteRatesById = async (req, res) => {
  try {
    const transportRouteRates = await TransportRouteRates.findById(req.params.id);
    if (!transportRouteRates) {
      return res.status(404).json({
        success: false,
        message: "TransportRouteRates not found",
      });
    }
    res.status(200).json({
      success: true,
      data: transportRouteRates,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTransportRouteRates = async (req, res) => {
  try {
    const updatedTransportRouteRates = await TransportRouteRates.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!updatedTransportRouteRates) {
      return res.status(404).json({
        success: false,
        message: "TransportRouteRates not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "TransportRouteRates updated successfully",
      data: updatedTransportRouteRates,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTransportRouteRates = async (req, res) => {
  try {
    const deletedTransportRouteRates = await TransportRouteRates.findByIdAndDelete(req.params.id);
    if (!deletedTransportRouteRates) {
      return res.status(404).json({
        success: false,
        message: "TransportRouteRates not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "TransportRouteRates deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
