import { asyncHandler } from "../utils/asyncHandler.js";
import Admin from "../models/admin.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Generate Access and Refresh Tokens
const generateAccessAndRefreshTokens = async (adminId) => {
  try {
    const admin = await Admin.findById(adminId);
    const accessToken = admin.generateAccessToken();
    const refreshToken = admin.generateRefreshToken();

    admin.refresh_token = refreshToken;
    await admin.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

// ADMIN LOGIN
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find admin by email
  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new ApiError(404, "Admin with this email does not exist");
  }

  // Check if admin is active
  if (!admin.is_active) {
    throw new ApiError(403, "Admin account is deactivated");
  }

  // Validate password
  const isPasswordValid = await admin.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    admin._id
  );

  // Update last login
  admin.last_login = new Date();
  await admin.save({ validateBeforeSave: false });

  // Return admin data without password and refresh token
  const loggedInAdmin = await Admin.findById(admin._id).select(
    "-password -refresh_token"
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          admin: loggedInAdmin,
          accessToken,
          refreshToken,
        },
        "Admin logged in successfully"
      )
    );
});

// ADMIN LOGOUT
const logoutAdmin = asyncHandler(async (req, res) => {
  await Admin.findByIdAndUpdate(
    req.admin._id,
    {
      $unset: {
        refresh_token: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Admin logged out successfully"));
});

// GET CURRENT ADMIN
const getCurrentAdmin = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, req.admin, "Current admin fetched successfully")
    );
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

    const admin = await Admin.findById(decodedToken?._id);

    if (!admin) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== admin?.refresh_token) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(admin._id);

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

// CREATE ADMIN (For initial setup/seeding)
const createAdmin = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    username,
    name,
    department,
    contact,
    role,
    jurisdiction,
    assigned_zones,
  } = req.body;

  // Validation
  if (!email || !password || !username || !name || !department || !role) {
    throw new ApiError(
      400,
      "Email, password, username, name, department, and role are required"
    );
  }

  // Check if admin already exists
  const existingAdmin = await Admin.findOne({
    $or: [{ email }, { username }],
  });

  if (existingAdmin) {
    throw new ApiError(409, "Admin with email or username already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create admin
  const admin = await Admin.create({
    email,
    password: hashedPassword,
    username,
    name,
    department,
    contact,
    role,
    jurisdiction,
    assigned_zones: assigned_zones || [],
  });

  // Return admin without password
  const createdAdmin = await Admin.findById(admin._id).select("-password");

  return res
    .status(201)
    .json(new ApiResponse(201, createdAdmin, "Admin created successfully"));
});

// GET ALL ADMINS (For super admin)
const getAllAdmins = asyncHandler(async (req, res) => {
  const { role, jurisdiction, is_active, page = 1, limit = 10 } = req.query;

  // Build filter
  const filter = {};
  if (role) filter.role = role;
  if (jurisdiction) filter.jurisdiction = jurisdiction;
  if (is_active !== undefined) filter.is_active = is_active === "true";

  const admins = await Admin.find(filter)
    .select("-password -refresh_token")
    .sort({ created_at: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Admin.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        admins,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
      "Admins fetched successfully"
    )
  );
});

// UPDATE ADMIN STATUS (Activate/Deactivate)
const updateAdminStatus = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== "boolean") {
    throw new ApiError(400, "is_active must be a boolean value");
  }

  const admin = await Admin.findByIdAndUpdate(
    adminId,
    { is_active },
    { new: true, runValidators: true }
  ).select("-password -refresh_token");

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, admin, "Admin status updated successfully"));
});

export {
  loginAdmin,
  logoutAdmin,
  getCurrentAdmin,
  refreshAccessToken,
  createAdmin,
  getAllAdmins,
  updateAdminStatus,
};
