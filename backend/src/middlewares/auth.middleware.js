import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import Tourist from "../models/tourist.js";
import Admin from "../models/admin.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const tourist = await Tourist.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!tourist) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.tourist = tourist;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

// Optional authentication (for routes that work with or without auth)
export const optionalAuth = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const tourist = await Tourist.findById(decodedToken?._id).select(
        "-password -refreshToken"
      );
      if (tourist) {
        req.tourist = tourist;
      }
    }

    next();
  } catch (error) {
    // Don't throw error, just proceed without authentication
    next();
  }
});

// Check if digital ID is not expired
export const checkDigitalIdExpiry = asyncHandler(async (req, _, next) => {
  if (req.tourist && new Date() > req.tourist.id_expiry_date) {
    throw new ApiError(
      403,
      "Digital ID has expired. Please renew your registration."
    );
  }
  next();
});

export const verifyTouristOrAdminJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request: No token provided");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // First, try to find an admin with the decoded ID
    const admin = await Admin.findById(decodedToken?._id).select("-password -refresh_token");

    if (admin && admin.is_active) {
      // If a valid admin is found, attach it to the request and proceed
      req.admin = admin;
      return next(); 
    }

    // If no admin was found, try to find a tourist
    const tourist = await Tourist.findById(decodedToken?._id).select("-password -refreshToken");

    if (tourist) {
      // If a valid tourist is found, attach it to the request and proceed
      req.tourist = tourist;
      return next();
    }
    
    // If neither an active admin nor a tourist is found, the token is invalid
    throw new ApiError(401, "Invalid Access Token: User not found");

  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});