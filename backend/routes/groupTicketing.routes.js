import express from "express";
import {
  createGroupTicketing,
  getAllGroupTicketings,
  getGroupTicketingById,
  updateGroupTicketing,
  deleteGroupTicketing,
  getPublicGroupTicketings
} from "../controllers/groupTicketing.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ===========================
   GROUP TICKETING ROUTES
=========================== */

router.post("/", protect, createGroupTicketing);

router.get("/", getAllGroupTicketings);

// Public endpoint — no auth required, only returns groups with internalStatus "Public"
router.get("/public", getPublicGroupTicketings);

router.get("/:id", getGroupTicketingById);

router.put("/:id", protect, updateGroupTicketing);

router.delete("/:id", deleteGroupTicketing);

export default router;
