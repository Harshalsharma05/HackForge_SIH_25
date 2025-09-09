import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import Admin from "../models/admin.js";
import connectDB from "../db/connectDB.js";

// Load environment variables
dotenv.config();

// Sample admin data
const adminData = [
  {
    email: "admin@tourism.gov.in",
    password: "admin123",
    username: "superadmin",
    name: "Super Administrator",
    department: "Tourism Department",
    contact: "+91-9876543210",
    role: "admin",
    jurisdiction: "All India",
    assigned_zones: ["all"],
  },
  {
    email: "police.mumbai@police.gov.in",
    password: "police123",
    username: "mumbai_police",
    name: "Mumbai Police Chief",
    department: "Mumbai Police",
    contact: "+91-9876543211",
    role: "police",
    jurisdiction: "Mumbai",
    assigned_zones: ["mumbai_central", "mumbai_south", "mumbai_north"],
  },
  {
    email: "tourism.goa@tourism.gov.in",
    password: "tourism123",
    username: "goa_tourism",
    name: "Goa Tourism Officer",
    department: "Goa Tourism Board",
    contact: "+91-9876543212",
    role: "tourism_officer",
    jurisdiction: "Goa",
    assigned_zones: ["north_goa", "south_goa"],
  },
  {
    email: "emergency.delhi@emergency.gov.in",
    password: "emergency123",
    username: "delhi_emergency",
    name: "Delhi Emergency Response",
    department: "Delhi Emergency Services",
    contact: "+91-9876543213",
    role: "emergency_responder",
    jurisdiction: "Delhi NCR",
    assigned_zones: [
      "delhi_central",
      "delhi_south",
      "delhi_north",
      "delhi_east",
      "delhi_west",
    ],
  },
  {
    email: "police.northeast@police.gov.in",
    password: "northeast123",
    username: "northeast_police",
    name: "Northeast Police Coordinator",
    department: "Northeast Police",
    contact: "+91-9876543214",
    role: "police",
    jurisdiction: "Northeast India",
    assigned_zones: [
      "assam",
      "meghalaya",
      "tripura",
      "mizoram",
      "manipur",
      "nagaland",
      "arunachal_pradesh",
    ],
  },
];

const seedAdmins = async () => {
  try {
    console.log("🌱 Starting admin seeding...");

    // Connect to database
    await connectDB();
    console.log("✅ Database connected");

    // Clear existing admins (optional - remove in production)
    // await Admin.deleteMany({});
    // console.log("🗑️ Existing admins cleared");

    // Create admins
    for (const admin of adminData) {
      // Check if admin already exists
      const existingAdmin = await Admin.findOne({
        $or: [{ email: admin.email }, { username: admin.username }],
      });

      if (existingAdmin) {
        console.log(
          `⚠️ Admin with email ${admin.email} already exists, skipping...`
        );
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(admin.password, 10);

      // Create admin
      const newAdmin = await Admin.create({
        ...admin,
        password: hashedPassword,
      });

      console.log(`✅ Created admin: ${newAdmin.name} (${newAdmin.email})`);
    }

    console.log("🎉 Admin seeding completed successfully!");

    // Display login credentials
    console.log("\n📋 Admin Login Credentials:");
    console.log("================================");
    adminData.forEach((admin) => {
      console.log(
        `${admin.role.toUpperCase()}: ${admin.email} / ${admin.password}`
      );
    });
    console.log("================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admins:", error);
    process.exit(1);
  }
};

// Run seeder
seedAdmins();
