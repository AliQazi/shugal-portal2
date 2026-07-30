import express from "express";
import {
  // getAvailableBookingsByGroup,
  getAirlines,
} from "../controllers/al-haider.controller.js";

const router = express.Router();

// Get available bookings by group type
// router.get("/available-bookings-by-group", getAvailableBookingsByGroup);

// Get available airlines
router.get("/get-airlines", getAirlines);

export default router;
