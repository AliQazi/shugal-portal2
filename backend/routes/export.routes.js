import express from "express";
import {
  exportUsersToPDF,
  exportUsersToExcel,
} from "../controllers/export.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// @route   GET /api/export/users/pdf
// @desc    Export users to PDF
// @access  Private (Admin only)
router.get("/users/pdf", protect, exportUsersToPDF);

// @route   GET /api/export/users/excel
// @desc    Export users to Excel
// @access  Private (Admin only)
router.get("/users/excel", protect, exportUsersToExcel);

export default router;
