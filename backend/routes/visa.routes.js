// routes/visa.routes.js

import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createVisa,
  getAllVisas,
  searchVisas,
  getSingleVisa,
  updateVisa,
  deleteVisa,
} from "../controllers/visa.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all visas (view_visas permission)
router.get("/all", getAllVisas);
router.get("/search", searchVisas);

// Get single visa (view_visas permission)
router.get("/:id", getSingleVisa);

// Create visa (manage_visas permission)
router.post("/create", createVisa);

// Update visa (manage_visas permission)
router.put("/update/:id", updateVisa);

// Delete visa (manage_visas permission)
router.delete("/delete/:id", deleteVisa);

export default router;
