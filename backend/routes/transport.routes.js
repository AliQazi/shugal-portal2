// routes/transportRoutes.js

import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createTransport,
  getAllTransports,
  searchTransports,
  getSingleTransport,
  updateTransport,
  deleteTransport,
} from "../controllers/transport.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all transports (view_transport permission)
router.get("/all", getAllTransports);
router.get("/search", searchTransports);

// Get single transport (view_transport permission)
router.get("/:id", getSingleTransport);

// Create transport (manage_transport permission)
router.post("/create", createTransport);

// Update transport (manage_transport permission)
router.put("/update/:id", updateTransport);

// Delete transport (manage_transport permission)
router.delete("/delete/:id", deleteTransport);

export default router;
