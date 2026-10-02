import express from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  getBookingByReference,
  updateBookingStatus,
  updateBooking,
  updatePassengerDiscounts,
  updateBookingPassengerDetails,
  updatePassengersLock,
  extendBookingHold,
  cancelBooking,
  deleteBooking,
  getBookingStatistics,
  getXOReportData,
  bulkTogglePriceOnCall,
  uploadPassengerDocument,
  refundBookingVoucher,
  updateTicketNumber,
} from "../controllers/booking.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { uploadPassengerDoc } from "../config/cloudinary.js";
import { getBookedSeats } from "../controllers/umrahBooking.controller.js";
import { getTopAgentsReport } from "../controllers/agentPerformance.controller.js";

const router = express.Router();

// All routes require authentication
router.get("/getBookedSeats", getBookedSeats);
router.use(protect);

// Get all bookings (view_bookings permission)
router.get("/", getAllBookings);

// Get booking statistics (manage_bookings permission)
router.get("/statistics", getBookingStatistics);

// XO Report — confirmed Group Ticket bookings (view_bookings permission)
router.get("/reports/xo", getXOReportData);

// Top performing agents — Group Ticket + Umrah Package (dashboard)
router.get("/reports/top-agents", getTopAgentsReport);

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

// Edit passenger details (owner/admin; on hold, partially confirmed or confirmed)
router.patch("/:id/passengers", updateBookingPassengerDetails);

// Lock/unlock agent-side passenger editing (admin / manage bookings)
router.patch("/:id/passengers-lock", updatePassengersLock);

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
