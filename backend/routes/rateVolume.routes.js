// routes/rateVolume.routes.js

import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createRateVolume,
  getAllRateVolumes,
  getSingleRateVolume,
  updateRateVolume,
  deleteRateVolume,
  toggleRateVolumeStatus,
} from "../controllers/rateVolume.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all rate volumes (view_hotels permission)
router.get("/all", getAllRateVolumes);

// Get single rate volume (view_hotels permission)
router.get("/:id", getSingleRateVolume);

// Create rate volume (manage_hotels permission)
router.post("/create", createRateVolume);

// Update rate volume (manage_hotels permission)
router.put("/update/:id", updateRateVolume);

// Toggle active/inactive (manage_hotels permission)
router.patch("/toggle/:id", toggleRateVolumeStatus);

// Delete rate volume (manage_hotels permission)
router.delete("/delete/:id", deleteRateVolume);

export default router;
