// controllers/hotelController.js

import Hotel from "../models/Hotel.js";

// CREATE HOTEL
export const createHotel = async (req, res) => {
  try {
    const {
      hotelName,
      name,
      city,
      distance,
      rating,
      mapUrl,
      roomOptions,
      location,
      contactNumber,
      email,
      description,
      isActive,
    } = req.body;

    // Validate required fields
    if (!hotelName || !city) {
      return res.status(400).json({
        success: false,
        message: "Hotel name and city are required",
      });
    }

    // Validate room options
    if (!roomOptions || roomOptions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one room option is required",
      });
    }

    // Validate each room option
    for (const room of roomOptions) {
      if (!room.name || !room.sellingPricePerNight) {
        return res.status(400).json({
          success: false,
          message: "Each room option must have name and selling price",
        });
      }
    }

    const hotel = await Hotel.create({
      hotelName,
      name: name || hotelName, // Sync name with hotelName if not provided
      city,
      distance: distance || 0,
      rating: rating || 0,
      mapUrl: mapUrl || "",
      roomOptions: roomOptions || [],
      location: location || { city: city, address: "" },
      contactNumber: contactNumber || "",
      email: email || "",
      description: description || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: "Hotel created successfully",
      data: hotel,
    });
  } catch (error) {
    console.error("Create hotel error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL HOTELS
export const getAllHotels = async (req, res) => {
  try {
    const { isActive, city } = req.query;

    // Build filter object
    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }
    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }

    const hotels = await Hotel.find(filter)
      .sort({ createdAt: -1 })
      .select("-__v"); // Exclude __v field

    // Transform response for better compatibility
    const transformedHotels = hotels.map((hotel) => ({
      ...hotel.toObject(),
      name: hotel.hotelName, // Ensure name field exists for calculator
      location: hotel.location || { city: hotel.city },
    }));

    res.status(200).json({
      success: true,
      count: transformedHotels.length,
      data: transformedHotels,
    });
  } catch (error) {
    console.error("Get hotels error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE HOTEL
export const getSingleHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id).select("-__v");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    // Transform response
    const transformedHotel = {
      ...hotel.toObject(),
      name: hotel.hotelName,
      location: hotel.location || { city: hotel.city },
    };

    res.status(200).json({
      success: true,
      data: transformedHotel,
    });
  } catch (error) {
    console.error("Get single hotel error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE HOTEL
export const updateHotel = async (req, res) => {
  try {
    const {
      hotelName,
      name,
      city,
      distance,
      rating,
      mapUrl,
      roomOptions,
      location,
      contactNumber,
      email,
      description,
      isActive,
    } = req.body;

    // Prepare update data
    const updateData = {
      ...(hotelName && { hotelName }),
      ...(name && { name }),
      ...(city && { city }),
      ...(distance !== undefined && { distance }),
      ...(rating !== undefined && { rating }),
      ...(mapUrl !== undefined && { mapUrl }),
      ...(roomOptions && { roomOptions }),
      ...(location && { location }),
      ...(contactNumber !== undefined && { contactNumber }),
      ...(email !== undefined && { email }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    };

    // Sync name with hotelName if hotelName is updated but name isn't
    if (hotelName && !name) {
      updateData.name = hotelName;
    }

    // Validate room options if provided
    if (roomOptions && roomOptions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Hotel must have at least one room option",
      });
    }

    if (roomOptions) {
      for (const room of roomOptions) {
        if (!room.name || !room.sellingPricePerNight) {
          return res.status(400).json({
            success: false,
            message: "Each room option must have name and selling price",
          });
        }
      }
    }

    const hotel = await Hotel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    // Transform response
    const transformedHotel = {
      ...hotel.toObject(),
      name: hotel.hotelName,
    };

    res.status(200).json({
      success: true,
      message: "Hotel updated successfully",
      data: transformedHotel,
    });
  } catch (error) {
    console.error("Update hotel error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE HOTEL
export const deleteHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Hotel deleted successfully",
    });
  } catch (error) {
    console.error("Delete hotel error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET HOTELS BY CITY (Helper for calculator)
export const getHotelsByCity = async (req, res) => {
  try {
    const { city } = req.params;

    const hotels = await Hotel.find({
      city: { $regex: city, $options: "i" },
      isActive: true,
    })
      .select("hotelName name city distance rating mapUrl roomOptions location")
      .sort({ distance: 1 }); // Sort by nearest first

    const transformedHotels = hotels.map((hotel) => ({
      ...hotel.toObject(),
      name: hotel.hotelName,
      roomOptions: hotel.roomOptions || [],
    }));

    res.status(200).json({
      success: true,
      count: transformedHotels.length,
      data: transformedHotels,
    });
  } catch (error) {
    console.error("Get hotels by city error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// TOGGLE HOTEL STATUS (Active/Inactive)
export const toggleHotelStatus = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found",
      });
    }

    hotel.isActive = !hotel.isActive;
    await hotel.save();

    res.status(200).json({
      success: true,
      message: `Hotel ${hotel.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        _id: hotel._id,
        isActive: hotel.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle hotel status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
