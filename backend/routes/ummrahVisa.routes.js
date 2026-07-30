import express from "express";
import * as ummrahVisaController from "../controllers/ummrahVisa.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, ummrahVisaController.createUmmrahVisa);

// router.get("/", protect, ummrahVisaController.getAllUmmrahVisas);
router.get("/", ummrahVisaController.getAllUmmrahVisas);

router.get("/:id", protect, ummrahVisaController.getUmmrahVisaById);

router.put("/:id", protect, ummrahVisaController.updateUmmrahVisa);

router.delete("/:id", protect, ummrahVisaController.deleteUmmrahVisa);

export default router;
