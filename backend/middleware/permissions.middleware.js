import { hasPermission, hasAnyPermission, hasAllPermissions } from "../utils/permissions.js";

/**
 * Middleware to check if user has specific permission
 * @param {String} permission - Permission key to check
 */
export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        message: `You don't have permission to access this resource. Required: ${permission}`,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {Array} permissions - Array of permission keys
 */
export const checkAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasAnyPermission(req.user, permissions)) {
      return res.status(403).json({
        message: `You don't have the required permissions`,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has all specified permissions
 * @param {Array} permissions - Array of permission keys
 */
export const checkAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!hasAllPermissions(req.user, permissions)) {
      return res.status(403).json({
        message: `You don't have all the required permissions`,
      });
    }

    next();
  };
};

/**
 * Middleware for Admin-only access (existing, kept for backward compatibility)
 */
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== "Admin" && req.user.userRole !== "Super Admin") {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

/**
 * Middleware for Super Admin only
 */
export const superAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.userRole !== "Super Admin") {
    return res.status(403).json({
      message: "Super Admin access required",
    });
  }

  next();
};

/**
 * Middleware to ensure data isolation for sub-users
 * Only admins and the user themselves can access their own or their sub-users' data
 */
export const ensureDataIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const targetUserId = req.params.id || req.body.userId;

  if (!targetUserId) {
    return next(); // No user ID to isolate
  }

  // Super Admin and Admin can access all data
  if (
    req.user.userRole === "Super Admin" ||
    req.user.userRole === "Admin" ||
    req.user.role === "Admin"
  ) {
    return next();
  }

  // Sub-users can only access their own data
  if (req.user._id.toString() === targetUserId) {
    return next();
  }

  return res.status(403).json({
    message: "You don't have access to this data",
  });
};
