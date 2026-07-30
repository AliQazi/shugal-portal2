import express from "express";
import {
  getSabaoonGroups,
  getAdminSabaoonGroups,
  upsertGroupOverride,
} from "../controllers/sabaoon.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public — used by the frontend
router.get("/groups", getSabaoonGroups);

// Admin-only — includes hidden groups + per-group override data
router.get("/admin-groups", protect, getAdminSabaoonGroups);

// Admin-only — hide/show a group or set its individual margin
router.post("/override/:groupId", protect, upsertGroupOverride);

export default router;
