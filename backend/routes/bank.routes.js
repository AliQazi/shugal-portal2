import express from "express";
import { upload } from "../config/cloudinary.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  addBank,
  getBanks,
  getBankById,
  updateBank,
  deleteBank,
  toggleStatus,
} from "../controllers/bank.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all banks (view_banks permission)
router.get("/", getBanks);

// Get single bank by ID (view_banks permission)
router.get("/:id", getBankById);

// Add new bank (with logo upload) - requires manage_banks permission
router.post("/add", upload.single("logo"), addBank);

// Update bank (with optional logo upload) - requires manage_banks permission
router.put("/:id", upload.single("logo"), updateBank);

// Delete bank - requires manage_banks permission
// Delete bank
router.delete("/:id", protect, deleteBank);
router.patch("/toggleStatus/:id", protect, toggleStatus);

export default router;
