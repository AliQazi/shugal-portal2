import express from "express";
import { requireExternalApiKey } from "../middleware/externalApiAuth.middleware.js";
import { cancelExternalBooking, checkExternalAvailability, createExternalBooking, getExternalBooking, getInventory, getUmrahPackage, listExternalBookings, listInventory, listUmrahPackages } from "../controllers/externalApi.controller.js";

const router = express.Router();
router.get("/group-ticketing", requireExternalApiKey("inventory:read"), listInventory);
router.get("/group-ticketing/:id", requireExternalApiKey("inventory:read"), getInventory);
router.get("/umrah-packages", requireExternalApiKey("inventory:read"), listUmrahPackages);
router.get("/umrah-packages/:id", requireExternalApiKey("inventory:read"), getUmrahPackage);
router.post("/availability", requireExternalApiKey("inventory:read"), checkExternalAvailability);
router.post("/bookings", requireExternalApiKey("bookings:write"), createExternalBooking);
router.get("/bookings", requireExternalApiKey("bookings:read"), listExternalBookings);
router.get("/bookings/:id", requireExternalApiKey("bookings:read"), getExternalBooking);
router.post("/bookings/:id/cancel", requireExternalApiKey("bookings:write"), cancelExternalBooking);
export default router;
