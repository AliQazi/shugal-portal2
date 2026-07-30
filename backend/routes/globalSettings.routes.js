import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    getGlobalSettings,
    addTimeSlab,
    updateTimeSlab,
    deleteTimeSlab,
} from "../controllers/globalSettings.controller.js";

const router = express.Router();

router.use(protect);

router.get("/", getGlobalSettings);

router.post("/booking-hold/time-slabs", addTimeSlab);

router.put("/booking-hold/time-slabs/:slabId", updateTimeSlab);

router.delete("/booking-hold/time-slabs/:slabId", deleteTimeSlab);

export default router;