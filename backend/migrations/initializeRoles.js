/**
 * Script to initialize role definitions in the database
 * Run this once to populate the SubUserRole collection with default role definitions
 *
 * Usage: node migrations/initializeRoles.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import SubUserRole from "../models/SubUserRole.js";
import dbConnection from "../config/db.js";
import { ROLE_PERMISSIONS } from "../utils/permissions.js";

dotenv.config();

const initializeRoles = async () => {
  try {
    await dbConnection();

    console.log("Initializing roles...");

    // Clear existing roles
    await SubUserRole.deleteMany({});
    console.log("Cleared existing roles");

    // Create role definitions
    const roleDescriptions = {
      "Super Admin": "Full system access with all permissions",
      Admin: "Full administrative access except role management",
      "Operations Manager": "Manage bookings, payments, and approvals",
      "Booking Manager": "Manage bookings and group ticketing",
      "Finance Manager": "Manage payments, ledger, and financial reports",
      "Support Staff": "View-only access for customer support",
      "Data Manager": "Manage airlines, banks, sectors, and packages",
    };

    const roles = Object.keys(ROLE_PERMISSIONS).map((roleName) => ({
      roleName,
      description: roleDescriptions[roleName] || "",
      permissions: ROLE_PERMISSIONS[roleName],
      isActive: true,
    }));

    const createdRoles = await SubUserRole.insertMany(roles);
    console.log(`✓ Successfully initialized ${createdRoles.length} roles`);

    // List created roles
    console.log("\nCreated Roles:");
    createdRoles.forEach((role) => {
      console.log(`  - ${role.roleName}: ${role.description}`);
    });

    console.log("\n✓ Role initialization complete!");

    process.exit(0);
  } catch (error) {
    console.error("Error initializing roles:", error);
    process.exit(1);
  }
};

initializeRoles();
