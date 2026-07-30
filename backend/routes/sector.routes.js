import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  addSector,
  getSectors,
  getSectorsByGroup,
  getSectorById,
  updateSector,
  deleteSector,
  updateSectorOrder,
  getUnifiedGroups,
  applyMargin,
  getMargin,
  getHoldSeatsSP,
} from "../controllers/sector.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get unified sectors and groups (view_sectors)
router.get("/getUnifiedGroups", getUnifiedGroups);

// Get current margin (view_sectors)
router.get("/getMargin", getMargin);

// Get all sectors (view_sectors)
router.get("/", getSectors);

// Get sectors by group type (view_sectors)
router.get("/group/:groupType", getSectorsByGroup);

// Get single sector by ID (view_sectors)
router.get("/:id", getSectorById);

// Hold SkyPass seats
router.post("/holdSkyPassSeats", getHoldSeatsSP);

// Apply margin (manage_sectors)
router.post("/applyMargin", applyMargin);

// Add new sector (manage_sectors)
router.post("/add", addSector);

// Update sector (manage_sectors)
router.put("/:id", updateSector);

// Update sector order (manage_sectors)
router.post("/updateSectorOrder", updateSectorOrder);

// Delete sector (manage_sectors)
router.delete("/:id", deleteSector);

export default router;
