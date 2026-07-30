import { HotelName, CityName } from "../models/HotelCity.js";

// Get all hotel names
export const getAllHotels = async (req, res) => {
  try {
    const hotels = await HotelName.find().sort({ name: 1 });
    res.json({
      success: true,
      data: hotels.map((h) => ({ value: h.name, label: h.name })),
    });
  } catch (error) {
    console.error("Error fetching hotels:", error);
    res.status(500).json({ success: false, message: "Error fetching hotels" });
  }
};

// Create a new hotel name
export const createHotel = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Hotel name is required",
      });
    }

    // Check if hotel already exists
    const existing = await HotelName.findOne({ name: name.trim() });
    if (existing) {
      return res.json({
        success: true,
        data: { value: existing.name, label: existing.name },
        message: "Hotel already exists",
      });
    }

    const hotel = new HotelName({ name: name.trim() });
    await hotel.save();

    res.status(201).json({
      success: true,
      data: { value: hotel.name, label: hotel.name },
      message: "Hotel name saved successfully",
    });
  } catch (error) {
    console.error("Error creating hotel:", error);
    res
      .status(500)
      .json({ success: false, message: "Error saving hotel name" });
  }
};

// Search hotels by name
export const searchHotels = async (req, res) => {
  try {
    const { q } = req.query;
    const query = q ? { name: { $regex: q, $options: "i" } } : {};

    const hotels = await HotelName.find(query).sort({ name: 1 }).limit(50);
    res.json({
      success: true,
      data: hotels.map((h) => ({ value: h.name, label: h.name })),
    });
  } catch (error) {
    console.error("Error searching hotels:", error);
    res.status(500).json({ success: false, message: "Error searching hotels" });
  }
};

// Get all city names
export const getAllCities = async (req, res) => {
  try {
    const cities = await CityName.find().sort({ name: 1 });
    res.json({
      success: true,
      data: cities.map((c) => ({ value: c.name, label: c.name })),
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    res.status(500).json({ success: false, message: "Error fetching cities" });
  }
};

// Create a new city name
export const createCity = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "City name is required",
      });
    }

    // Check if city already exists
    const existing = await CityName.findOne({ name: name.trim() });
    if (existing) {
      return res.json({
        success: true,
        data: { value: existing.name, label: existing.name },
        message: "City already exists",
      });
    }

    const city = new CityName({ name: name.trim() });
    await city.save();

    res.status(201).json({
      success: true,
      data: { value: city.name, label: city.name },
      message: "City name saved successfully",
    });
  } catch (error) {
    console.error("Error creating city:", error);
    res.status(500).json({ success: false, message: "Error saving city name" });
  }
};

// Search cities by name
export const searchCities = async (req, res) => {
  try {
    const { q } = req.query;
    const query = q ? { name: { $regex: q, $options: "i" } } : {};

    const cities = await CityName.find(query).sort({ name: 1 }).limit(50);
    res.json({
      success: true,
      data: cities.map((c) => ({ value: c.name, label: c.name })),
    });
  } catch (error) {
    console.error("Error searching cities:", error);
    res.status(500).json({ success: false, message: "Error searching cities" });
  }
};
