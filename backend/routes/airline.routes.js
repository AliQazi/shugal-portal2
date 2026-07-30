import express from "express";
import { upload } from "../config/cloudinary.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  addAirline,
  getAirlines,
  getAirlineById,
  updateAirline,
  deleteAirline
} from "../controllers/airline.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all airlines (view_airlines permission)
router.get("/", getAirlines);

// Get single airline by ID (view_airlines permission)
router.get("/:id", getAirlineById);

// Add new airline (with logo upload) - requires manage_airlines permission
router.post("/add", upload.single("logo"), addAirline);

// Update airline (with optional logo upload) - requires manage_airlines permission
router.put("/:id", upload.single("logo"), updateAirline);

// Delete airline - requires manage_airlines permission
router.delete("/:id", deleteAirline);

export default router;
