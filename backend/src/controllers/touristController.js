import { asyncHandler } from "../utils/asyncHandler.js";
import Tourist from "../models/tourist.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import crypto from "crypto";

const generateAccessAndRefreshTokens = async (touristId) => {
  try {
    const tourist = await Tourist.findById(touristId);
    const accessToken = tourist.generateAccessToken();
    const refreshToken = tourist.generateRefreshToken();

    tourist.refreshToken = refreshToken;
    await tourist.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating the tokens");
  }
};

// Generate Digital ID (6-digit unique code)
const generateDigitalId = async () => {
  let digitalId;
  let isUnique = false;

  while (!isUnique) {
    digitalId = Math.floor(100000 + Math.random() * 900000).toString();
    const existingTourist = await Tourist.findOne({ digital_id: digitalId });
    if (!existingTourist) {
      isUnique = true;
    }
  }
  return digitalId;
};

// Generate Digital ID Hash
const generateDigitalIdHash = (touristData) => {
  const dataString = JSON.stringify({
    name: touristData.name,
    email: touristData.email,
    kyc_id: touristData.kyc_id,
    digital_id: touristData.digital_id,
    timestamp: Date.now(),
  });
  return crypto.createHash("sha256").update(dataString).digest("hex");
};

// REGISTER TOURIST
const registerTourist = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    kyc_id,
    kyc_document_type,
    nationality = "Indian",
    date_of_birth,
    gender,
    emergency_contacts,
    itinerary,
    trip_start_date,
    trip_end_date,
    accommodation_details,
    preferences = {},
  } = req.body;

  // Validation
  if (!name || !email || !password || !phone) {
    throw new ApiError(400, "Name, email, password, and phone are required");
  }

  // Check if tourist already exists
  const existedTourist = await Tourist.findOne({
    $or: [{ email }, { phone }],
  });

  if (existedTourist) {
    throw new ApiError(409, "Tourist with email or phone already exists");
  }

  // Generate digital ID and hash
  const digital_id = await generateDigitalId();

  // Set ID expiry date (default 30 days from now)
  const id_expiry_date = new Date();
  if (trip_end_date) {
    id_expiry_date.setTime(new Date(trip_end_date).getTime());
  } else {
    id_expiry_date.setDate(id_expiry_date.getDate() + 30);
  }

  // Create tourist object
  const tourist = await Tourist.create({
    name,
    email,
    password,
    phone,
    digital_id,
    id_expiry_date,
    kyc_id,
    kyc_document_type,
    nationality,
    date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
    gender,
    emergency_contacts: emergency_contacts || [],
    itinerary,
    trip_start_date: trip_start_date ? new Date(trip_start_date) : undefined,
    trip_end_date: trip_end_date ? new Date(trip_end_date) : undefined,
    accommodation_details,
    preferences: {
      language: preferences.language || "english",
      tracking_consent: preferences.tracking_consent !== false,
      emergency_notifications: preferences.emergency_notifications !== false,
      family_tracking_consent: preferences.family_tracking_consent || false,
    },
  });

  // Generate digital ID hash after creation
  const digital_id_hash = generateDigitalIdHash({
    name: tourist.name,
    email: tourist.email,
    kyc_id: tourist.kyc_id,
    digital_id: tourist.digital_id,
  });

  tourist.digital_id_hash = digital_id_hash;
  await tourist.save({ validateBeforeSave: false });

  // Get created tourist without password
  const createdTourist = await Tourist.findById(tourist._id).select(
    "-password -refreshToken"
  );

  if (!createdTourist) {
    throw new ApiError(
      500,
      "Something went wrong while registering the tourist"
    );
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdTourist, "Tourist registered successfully")
    );
});

// LOGIN TOURIST
const loginTourist = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const tourist = await Tourist.findOne({ email });

  if (!tourist) {
    throw new ApiError(404, "Tourist does not exist");
  }

  const isPasswordValid = await tourist.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid tourist credentials");
  }

  // Check if digital ID is expired
  const isIdExpired = new Date() > tourist.id_expiry_date;

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    tourist._id
  );

  // Update last login
  tourist.last_login = new Date();
  await tourist.save({ validateBeforeSave: false });

  const loggedInTourist = await Tourist.findById(tourist._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          tourist: loggedInTourist,
          accessToken,
          refreshToken,
          isIdExpired,
        },
        "Tourist logged in successfully"
      )
    );
});

// LOGOUT TOURIST
const logoutTourist = asyncHandler(async (req, res) => {
  await Tourist.findByIdAndUpdate(
    req.tourist._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Tourist logged out"));
});

// REFRESH ACCESS TOKEN
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const tourist = await Tourist.findById(decodedToken?._id);

    if (!tourist) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== tourist?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(tourist._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// GET CURRENT TOURIST
const getCurrentTourist = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.tourist, "Tourist fetched successfully"));
});

// CHANGE CURRENT PASSWORD
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const tourist = await Tourist.findById(req.tourist?._id);
  const isPasswordCorrect = await tourist.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  tourist.password = newPassword;
  await tourist.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
  registerTourist,
  loginTourist,
  logoutTourist,
  refreshAccessToken,
  getCurrentTourist,
  changeCurrentPassword,
  generateAccessAndRefreshTokens,
};
