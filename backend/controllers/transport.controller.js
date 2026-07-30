// controllers/transportController.js

import Transport from "../models/Transport.js";
import ActivityLog from "../models/activitylogs.js";

// CREATE TRANSPORT
export const createTransport = async (req, res) => {
  try {
    const { route, transportType } = req.body;

    const transport = await Transport.create({
      route,
      transportType,
    });

    await ActivityLog.create({
      user: req.user._id,
      type: "Transport",
      refModel: "Transport",
      refId: transport._id,
      description: `Transport "${transport.route}" (${transport.transportType}) created`,
    });

    res.status(201).json({
      success: true,
      message: "Transport created successfully",
      data: transport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL TRANSPORTS
export const getAllTransports = async (req, res) => {
  try {
    const { q } = req.query;
    const query = q
      ? {
          $or: [
            { route: { $regex: q, $options: "i" } },
            { transportType: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const transports = await Transport.find(query)
      .sort({ route: 1, createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: transports.length,
      data: transports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// SEARCH TRANSPORTS (alias endpoint)
export const searchTransports = async (req, res) => {
  return getAllTransports(req, res);
};

// GET SINGLE TRANSPORT
export const getSingleTransport = async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id);

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    res.status(200).json({
      success: true,
      data: transport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE TRANSPORT
export const updateTransport = async (req, res) => {
  try {
    const transport = await Transport.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Transport",
      refModel: "Transport",
      refId: transport._id,
      description: `Transport "${transport.route}" (${transport.transportType}) updated`,
    });

    res.status(200).json({
      success: true,
      message: "Transport updated successfully",
      data: transport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE TRANSPORT
export const deleteTransport = async (req, res) => {
  try {
    const transport = await Transport.findByIdAndDelete(req.params.id);

    if (!transport) {
      return res.status(404).json({
        success: false,
        message: "Transport not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Transport",
      description: `Transport "${transport.route}" (${transport.transportType}) deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Transport deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
