import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import Admin from "../models/admin.js";

// Verify Admin JWT
export const verifyAdminJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request - No token provided");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const admin = await Admin.findById(decodedToken?._id).select(
      "-password -refresh_token"
    );

    if (!admin) {
      throw new ApiError(401, "Invalid Access Token");
    }

    if (!admin.is_active) {
      throw new ApiError(403, "Admin account is deactivated");
    }

    req.admin = admin;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

// Check Admin Role
export const checkAdminRole = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.admin) {
      throw new ApiError(401, "Admin authentication required");
    }

    if (!allowedRoles.includes(req.admin.role)) {
      throw new ApiError(
        403,
        `Access denied. Required role: ${allowedRoles.join(" or ")}`
      );
    }

    next();
  });
};

// Check Admin Jurisdiction
export const checkJurisdiction = asyncHandler(async (req, res, next) => {
  if (!req.admin) {
    throw new ApiError(401, "Admin authentication required");
  }

  // Super admin can access all jurisdictions
  if (req.admin.role === "admin") {
    return next();
  }

  // Check if admin has jurisdiction over the requested area
  const requestedZone = (req.query && req.query.zone) || 
                       (req.body && req.body.zone) || 
                       (req.params && req.params.zone);

  if (
    requestedZone &&
    req.admin.assigned_zones &&
    req.admin.assigned_zones.length > 0
  ) {
    if (!req.admin.assigned_zones.includes(requestedZone)) {
      throw new ApiError(403, "Access denied. Zone not in your jurisdiction");
    }
  }

  next();
});

// Optional Admin Auth (for public endpoints that can benefit from admin context)
export const optionalAdminAuth = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const admin = await Admin.findById(decodedToken?._id).select(
        "-password -refresh_token"
      );

      if (admin && admin.is_active) {
        req.admin = admin;
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }

  next();
});
