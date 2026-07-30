import express from "express";
import {
  getAllLogs,
  getLogsByUser,
  getLogTypes,
  getLogUsers,
} from "../controllers/activitylog.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get("/", getAllLogs);
router.get("/types", getLogTypes);
router.get("/users", getLogUsers);
router.get("/user/:userId", getLogsByUser);

export default router;
