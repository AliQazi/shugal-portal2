import express from "express";
import {
  createUmrahCalculator,
  getAllUmrahCalculators,
  getUmrahCalculatorById,
  updateUmrahCalculator,
  deleteUmrahCalculator,
  getUmrahCalculationsByUserId,
  updateUmrahStatusController,
} from "../controller/ummrahCalculatorController.js";

const router = express.Router();

// ➕ Create new record
router.post("/", createUmrahCalculator);

// 📥 Get all records
router.get("/", getAllUmrahCalculators);
router.get("/user/:userId", getUmrahCalculationsByUserId);

// 📥 Get single record
router.get("/:id", getUmrahCalculatorById);

// ✏️ Update record
router.put("/:id", updateUmrahCalculator);

// 🗑 Delete record
router.delete("/:id", deleteUmrahCalculator);
router.put("/umrahCalculator/:umrahId/status", updateUmrahStatusController);

export default router;
