import express from "express";
import { upload } from "../config/cloudinary.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  getLedgerByUser,
  exportLedgerCSV,
  exportLedgerExcel,
  exportLedgerPDF,
  getMyPayments,
} from "../controllers/payment.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all payments (view_payments permission)
router.get("/", getPayments);

router.get("/me", getMyPayments);
// Get single payment by ID (view_payments permission)
router.get("/:id", getPaymentById);

// Get ledger for a specific user (view_ledger permission)
router.get("/ledger/:userId", getLedgerByUser);

// Export ledger in different formats (export_data permission)
router.get("/ledger/:userId/export/csv", exportLedgerCSV);
router.get("/ledger/:userId/export/excel", exportLedgerExcel);
router.get("/ledger/:userId/export/pdf", exportLedgerPDF);

// Create new payment (manage_payments permission)
router.post("/add", upload.single("receipt"), createPayment);

// Update payment (manage_payments permission)
router.put("/:id", upload.single("receipt"), updatePayment);

// Delete payment (manage_payments permission)
router.delete("/:id", deletePayment);

export default router;
