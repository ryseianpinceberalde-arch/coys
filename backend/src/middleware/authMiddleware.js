import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { hasStaffPermission } from "../utils/staffPermissions.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user || !req.user.isActive || req.user.isArchived) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token" });
};

export const optionalAuth = async (req, _res, next) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  ) {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user && user.isActive && !user.isArchived) {
      req.user = user;
    }
  } catch (error) {
    // Invalid optional credentials should not block guest checkout.
  }

  return next();
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
};

export const authorizeStaffPermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== "staff") {
      return next();
    }

    if (!hasStaffPermission(req.user, permissionKey)) {
      return res.status(403).json({ message: "Forbidden: staff navigation access is disabled" });
    }

    next();
  };
};

