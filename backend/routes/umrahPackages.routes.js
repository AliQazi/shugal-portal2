import express from "express";
import { upload } from "../config/cloudinary.js";
import {
  getAllPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  createPackages,
  updatePackageInternalStatus,
} from "../controllers/umrahPackge.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// CRUD routes
router.post(
  "/",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "flightLogo", maxCount: 1 },
  ]),
  protect, createPackages,
);

router.get("/", getAllPackages);
router.get("/:id", getPackageById);

router.put(
  "/:id",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "flightLogo", maxCount: 1 },
  ]),
  protect, updatePackage,
);

router.patch("/:id/internal-status", protect, updatePackageInternalStatus);

router.delete("/:id", protect, deletePackage);

export default router;
