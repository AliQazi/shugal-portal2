import express from "express";
import {
  createUmrahCalculator,
  createPublicUmrahCalculator,
  getAllUmrahCalculators,
  getUmrahCalculatorById,
  updateUmrahCalculator,
  deleteUmrahCalculator,
  getUmrahCalculationsByUserId,
  updateUmrahStatusController,
} from "../controllers/umrahCalculator.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public route for B2C umrah calculator (no authentication required)
router.post("/public", createPublicUmrahCalculator);

// ➕ Create new Umrah Calculator record
router.post("/", protect, createUmrahCalculator);

// 📥 Get all Umrah Calculator records
router.get("/", getAllUmrahCalculators);

// 📥 Get Umrah Calculator records by user ID
router.get("/user", protect, getUmrahCalculationsByUserId);

// 📥 Get single Umrah Calculator record
router.get("/:id", getUmrahCalculatorById);

// ✏️ Update Umrah Calculator record
router.put("/:id", updateUmrahCalculator);

// 🔄 Update Umrah Calculator status
router.put("/:umrahId/status", updateUmrahStatusController);

// 🗑 Delete Umrah Calculator record
router.delete("/:id", deleteUmrahCalculator);

export default router;
