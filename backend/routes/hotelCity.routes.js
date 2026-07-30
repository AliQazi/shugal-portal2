import express from "express";
import {
  getAllHotels,
  createHotel,
  searchHotels,
  getAllCities,
  createCity,
  searchCities,
} from "../controllers/hotelCity.controller.js";

const router = express.Router();

// Hotel routes
router.get("/hotels", getAllHotels);
router.get("/hotels/search", searchHotels);
router.post("/hotels", createHotel);

// City routes
router.get("/cities", getAllCities);
router.get("/cities/search", searchCities);
router.post("/cities", createCity);

export default router;
