import express from "express";
import {
  createUmrahBooking,
  getAllUmrahBookings,
  getMyBookings,
  getAllBookingsAdmin,
  getUmrahBookingById,
  updateUmrahBooking,
  deleteUmrahBooking,
  submitPayment,
  reviewPayment,
  updateVisaStatus,
  updateHotelStatus,
  updateVoucherStatus,
  updateOverallStatus,
  extendUmrahBookingHold,
  savePassengerDiscounts,
} from "../controllers/umrahBooking.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadUmrahDoc } from "../config/cloudinary.js";

const router = express.Router();

/* ===========================
   MAIN CRUD ROUTES
=========================== */
// Handle multiple passport uploads for passengers (max 10 passengers)
// Using .any() to accept files with dynamic field names like passportFile_0, passportFile_1, etc.
router.post("/", protect, uploadUmrahDoc.any(), createUmrahBooking);
router.get("/", protect, getAllUmrahBookings);
router.get("/my-bookings", protect, getMyBookings);
router.get("/admin/all", protect, getAllBookingsAdmin);
router.get("/:id", protect, getUmrahBookingById);
router.put("/:id", protect, updateUmrahBooking);
router.delete("/:id", protect, deleteUmrahBooking);

/* ===========================
   PAYMENT ROUTES
=========================== */
// Agent/User submits payment with receipt
router.post(
  "/:id/submit-payment",
  protect,
  uploadUmrahDoc.single("receiptFile"),
  submitPayment,
);

// Admin reviews payment (update status, upload proof, or reject)
router.patch(
  "/payment/:paymentId/review",
  protect,
  uploadUmrahDoc.single("approvalProofFile"),
  reviewPayment,
);

/* ===========================
   OTHER STATUS UPDATE ROUTES
=========================== */
router.patch(
  "/:id/visa-status",
  protect,
  uploadUmrahDoc.single("approvalDocument"),
  updateVisaStatus,
);
router.patch(
  "/:id/hotel-status",
  protect,
  uploadUmrahDoc.single("confirmationDocument"),
  updateHotelStatus,
);
router.patch("/:id/voucher-status", protect, updateVoucherStatus);
router.patch("/:id/overall-status", protect, updateOverallStatus);
router.patch("/:id/extend-hold", protect, extendUmrahBookingHold);

router.patch("/savePassengerDiscounts", protect, savePassengerDiscounts);

export default router;
