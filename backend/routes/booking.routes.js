import express from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  getBookingByReference,
  updateBookingStatus,
  updateBooking,
  updatePassengerDiscounts,
  extendBookingHold,
  cancelBooking,
  deleteBooking,
  getBookingStatistics,
  bulkTogglePriceOnCall,
  uploadPassengerDocument,
  refundBookingVoucher,
  updateTicketNumber,
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadPassengerDoc } from "../config/cloudinary.js";
import { getBookedSeats } from "../controllers/umrahBooking.controller.js";

const router = express.Router();

// All routes require authentication
router.get("/getBookedSeats", getBookedSeats);
router.use(protect);

// Get all bookings (view_bookings permission)
router.get("/", getAllBookings);

// Get booking statistics (manage_bookings permission)
router.get("/statistics", getBookingStatistics);

// Get booking by reference number (view_bookings permission)
router.get("/reference/:reference", getBookingByReference);

// Get booking by ID (view_bookings permission)
router.get("/:id", getBookingById);

// Create a new booking (manage_bookings permission)
router.post("/", createBooking);

// Upload a passenger document (manage_bookings permission)
router.post(
  "/upload-document",
  uploadPassengerDoc.single("document"),
  uploadPassengerDocument,
);

// Update booking status (manage_bookings permission)
router.patch("/:id/status", updateBookingStatus);

// Update passenger discounts (manage_bookings permission)
router.patch("/:id/discounts", updatePassengerDiscounts);

// Extend on-hold booking expiry
router.patch("/:id/extend-hold", extendBookingHold);

// Refund a passenger (manage_bookings permission)
router.post("/:id/refund", refundBookingVoucher);

// Update booking details (manage_bookings permission)
router.put("/:id", updateBooking);

// Cancel booking (manage_bookings permission)
router.patch("/:id/cancel", cancelBooking);

// Delete booking (manage_bookings permission)
router.delete("/:id", deleteBooking);

// Bulk toggle (manage_bookings permission)
router.patch("/bulkTogglePriceOnCall", bulkTogglePriceOnCall);

router.patch("/:id/ticket-number", protect, updateTicketNumber);

export default router;
