import express from "express";
import {
  createBooking,
  fetchGroups,
  getBookingDetails,
  getGroupById,
} from "../controllers/emarShoaib.controller.js";

const router = express.Router();

router.get("/groups", fetchGroups);

router.get("/groups/:groupId", getGroupById);

router.post("/booking", createBooking);

router.get("/booking/:bookingId", getBookingDetails);

export default router;
