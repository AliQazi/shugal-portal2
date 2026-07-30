import Airline from "../models/Airline.js";
import { cloudinary } from "../config/cloudinary.js";
import ActivityLog from "../models/activitylogs.js";

// Add new airline
export const addAirline = async (req, res) => {
  try {
    const { airlineCode, airlineName, shortCode } = req.body;

    // Validate required fields
    if (!airlineCode || !airlineName || !shortCode) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Check if airline code already exists
    const existingAirline = await Airline.findOne({ airlineCode: airlineCode.toUpperCase() });
    if (existingAirline) {
      return res.status(400).json({
        success: false,
        message: "Airline code already exists"
      });
    }

    // Prepare airline data
    const airlineData = {
      airlineCode: airlineCode.toUpperCase(),
      airlineName,
      shortCode: shortCode.toUpperCase(),
      status: "Active"
    };

    // Add logo if uploaded
    if (req.file) {
      airlineData.logo = req.file.path;
      airlineData.logoPublicId = req.file.filename;
    }

    // Create new airline
    const newAirline = await Airline.create(airlineData);

    await ActivityLog.create({
      user: req.user._id,
      type: "Airline",
      refModel: undefined,
      refId: newAirline._id,
      description: `Airline "${newAirline.airlineName}" (${newAirline.airlineCode}) added`,
    });

    res.status(201).json({
      success: true,
      message: "Airline added successfully",
      data: newAirline
    });

  } catch (error) {
    console.error("Error adding airline:", error);
    res.status(500).json({
      success: false,
      message: "Error adding airline",
      error: error.message
    });
  }
};

// Get all airlines
export const getAirlines = async (req, res) => {
  try {
    const airlines = await Airline.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: airlines.length,
      data: airlines
    });

  } catch (error) {
    console.error("Error fetching airlines:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching airlines",
      error: error.message
    });
  }
};

// Get single airline by ID
export const getAirlineById = async (req, res) => {
  try {
    const { id } = req.params;
    const airline = await Airline.findById(id);

    if (!airline) {
      return res.status(404).json({
        success: false,
        message: "Airline not found"
      });
    }

    res.status(200).json({
      success: true,
      data: airline
    });

  } catch (error) {
    console.error("Error fetching airline:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching airline",
      error: error.message
    });
  }
};

// Update airline
export const updateAirline = async (req, res) => {
  try {
    const { id } = req.params;
    const { airlineCode, airlineName, shortCode } = req.body;

    // Find airline
    const airline = await Airline.findById(id);
    if (!airline) {
      return res.status(404).json({
        success: false,
        message: "Airline not found"
      });
    }

    // Check if new airline code conflicts with existing ones
    if (airlineCode && airlineCode.toUpperCase() !== airline.airlineCode) {
      const existingAirline = await Airline.findOne({ 
        airlineCode: airlineCode.toUpperCase(),
        _id: { $ne: id }
      });
      if (existingAirline) {
        return res.status(400).json({
          success: false,
          message: "Airline code already exists"
        });
      }
    }

    // Update fields
    if (airlineCode) airline.airlineCode = airlineCode.toUpperCase();
    if (airlineName) airline.airlineName = airlineName;
    if (shortCode) airline.shortCode = shortCode.toUpperCase();

    // Update logo if new one is uploaded
    if (req.file) {
      // Delete old logo from cloudinary if exists
      if (airline.logoPublicId) {
        try {
          await cloudinary.uploader.destroy(airline.logoPublicId);
        } catch (error) {
          console.error("Error deleting old logo:", error);
        }
      }
      
      airline.logo = req.file.path;
      airline.logoPublicId = req.file.filename;
    }

    await airline.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "Airline",
      refId: airline._id,
      description: `Airline "${airline.airlineName}" (${airline.airlineCode}) updated`,
    });

    res.status(200).json({
      success: true,
      message: "Airline updated successfully",
      data: airline
    });

  } catch (error) {
    console.error("Error updating airline:", error);
    res.status(500).json({
      success: false,
      message: "Error updating airline",
      error: error.message
    });
  }
};

// Delete airline
export const deleteAirline = async (req, res) => {
  try {
    const { id } = req.params;

    const airline = await Airline.findById(id);
    if (!airline) {
      return res.status(404).json({
        success: false,
        message: "Airline not found"
      });
    }

    // Delete logo from cloudinary if exists
    if (airline.logoPublicId) {
      try {
        await cloudinary.uploader.destroy(airline.logoPublicId);
      } catch (error) {
        console.error("Error deleting logo:", error);
      }
    }

    await Airline.findByIdAndDelete(id);

    await ActivityLog.create({
      user: req.user._id,
      type: "Airline",
      description: `Airline "${airline.airlineName}" (${airline.airlineCode}) deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Airline deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting airline:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting airline",
      error: error.message
    });
  }
};
