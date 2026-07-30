import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createSubUser,
  getSubUsers,
  getSubUserById,
  updateSubUser,
  deleteSubUser,
  updateSubUserPermissions,
  getAvailableRoles,
  activateSubUser,
  deactivateSubUser,
  sendSubUserCredentials,
} from "../controllers/subUser.controller.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get available roles
router.get("/roles", getAvailableRoles);

// Create a new sub-user
router.post("/", createSubUser);

// Get all sub-users for the authenticated admin
router.get("/", getSubUsers);

// Get a specific sub-user
router.get("/:id", getSubUserById);

// Update a sub-user
router.put("/:id", updateSubUser);

// Delete (deactivate) a sub-user
router.delete("/:id", deleteSubUser);

// Update sub-user permissions
router.patch("/:id/permissions", updateSubUserPermissions);

// Send sub-user credentials by email
router.post("/:id/send-credentials", sendSubUserCredentials);

// Activate a sub-user
router.patch("/:id/activate", activateSubUser);

// Deactivate a sub-user
router.patch("/:id/deactivate", deactivateSubUser);

export default router;
