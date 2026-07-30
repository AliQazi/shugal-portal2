// routes/hotelRoutes.js

import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createHotel,
  getAllHotels,
  getSingleHotel,
  updateHotel,
  deleteHotel,
} from "../controllers/hotel.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all hotels (view_hotels permission)
router.get("/all", getAllHotels);

// Get single hotel (view_hotels permission)
router.get("/:id", getSingleHotel);

// Create hotel (manage_hotels permission)
router.post("/create", createHotel);

// Update hotel (manage_hotels permission)
router.put("/update/:id", updateHotel);

// Delete hotel (manage_hotels permission)
router.delete("/delete/:id", deleteHotel);

export default router;
