import jwt from "jsonwebtoken";
import Register from "../models/Register.js";
import { getPermissionKeysForRole } from "../utils/permissions.js";

export const protect = async (req, res, next) => {
  try {
    let token =
      req.headers.authorization?.split(" ")[1] ||
      req.cookies?.frontend_token ||
      req.cookies?.[process.env.DASHBOARD_COOKIE_NAME || "dashboard_token"];

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await Register.findById(decoded.id);
    
    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (req.user.isSubUser && req.user.status !== "Active") {
      const message =
        req.user.status === "Suspended"
          ? "Your sub-user account is suspended. Please contact admin."
          : `Your sub-user account is ${req.user.status}. Please wait for admin activation.`;

      return res.status(403).json({
        success: false,
        message,
        status: req.user.status,
        isSubUser: true,
      });
    }

    if (req.user.userRole === "Super Admin" || req.user.role === "Super Admin") {
      req.user.permissions = getPermissionKeysForRole("Super Admin");
    } else if (req.user.isSubUser) {
      req.user.permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    } else if (Array.isArray(req.user.permissions) && req.user.permissions.length > 0) {
      req.user.permissions = req.user.permissions;
    } else {
      req.user.permissions = getPermissionKeysForRole(req.user.userRole || req.user.role);
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: "Invalid token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "Admin" && req.user.role !== "Super Admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};
