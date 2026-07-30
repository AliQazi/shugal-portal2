import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../config/cloudinary.js";
import {
  createSpecialOffer,
  deleteSpecialOffer,
  getSpecialOffers,
  updateSpecialOffer,
} from "../controllers/specialOffer.controller.js";
const router = express.Router();

router.get("/getSpecialOffers", getSpecialOffers);
router.post("/createSpecialOffer", protect, upload.single('image'), createSpecialOffer);
router.put("/updateSpecialOffer", protect, upload.single('image'), updateSpecialOffer);
router.delete("/deleteSpecialOffer", protect, deleteSpecialOffer);

export default router;
