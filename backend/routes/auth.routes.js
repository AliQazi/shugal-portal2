import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  getAllUsers,
  getDeletedUsers,
  recoverUser,
  getUserById,
  updateUserStatus,
  updatePriceOnCall,
  updateShowHideButton,
  updateUserProfile,
  deleteUser,
  changePassword,
  requestPasswordReset,
  resetPassword,
  changeUserPassword,
  sendUserCredentials,
  updateBookNowButtonBulk,
  logoutUser,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { uploadProfileLogo } from "../config/cloudinary.js";

const router = express.Router();

/* ===========================
   AUTH ROUTES
=========================== */

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/profile", protect, getProfile);

// Update own profile (for logged-in users)
// Supports both base64 in body or file upload via multipart/form-data
router.put(
  "/profile",
  protect,
  uploadProfileLogo.single("logo"),
  updateUserProfile,
);

router.get("/users", protect, getAllUsers);
router.get("/users/deleted", protect, getDeletedUsers);
router.get("/users/:id", protect, getUserById);

router.put(
  "/users/:id",
  protect,
  uploadProfileLogo.single("logo"),
  updateUserProfile,
);

router.patch("/users/:id/status", protect, updateUserStatus);
router.patch("/users/:id/price-on-call", protect, updatePriceOnCall);
router.patch("/users/:id/show-booking-now", protect, updateShowHideButton);
router.patch("/users/bulk-show-booking-now", protect, updateBookNowButtonBulk);
router.post("/logout", logoutUser);

router.delete("/users/:id", protect, deleteUser);
router.patch("/users/:id/recover", protect, recoverUser);

/* ===========================
   PASSWORD MANAGEMENT ROUTES
=========================== */

// Change password for logged-in user
router.post("/change-password", protect, changePassword);

// Request password reset (forgot password)
router.post("/forgot-password", requestPasswordReset);

// Reset password with token
router.post("/reset-password", resetPassword);

// Admin: Change user/agency password
router.post("/admin/change-user-password", protect, changeUserPassword);

// Admin: Send credentials to user
router.post("/users/:userId/send-credentials", protect, sendUserCredentials);

export default router;
