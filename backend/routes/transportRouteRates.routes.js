import express from "express";
import {
  createTransportRouteRates,
  getAllTransportRouteRates,
  getTransportRouteRatesById,
  updateTransportRouteRates,
  deleteTransportRouteRates,
} from "../controllers/transportRouteRates.controller.js";

const router = express.Router();

// Create
router.post("/", createTransportRouteRates);

// Get all
router.get("/", getAllTransportRouteRates);

// Get by ID
router.get("/:id", getTransportRouteRatesById);

// Update
router.put("/:id", updateTransportRouteRates);

// Delete
router.delete("/:id", deleteTransportRouteRates);

export default router;
