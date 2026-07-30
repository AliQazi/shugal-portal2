import dotenv from "dotenv";
import mongoose from "mongoose";
import dbConnection from "../config/db.js"; // Your existing connection logic
import Booking from "../models/Booking.js";

dotenv.config();

async function migrateGroupId() {
  try {
    await dbConnection(); // Connect to MongoDB
    console.log("✅ Connected to MongoDB");

    // Convert all non-string groupIds to string
    const result = await mongoose.connection.db.collection('bookings').updateMany(
      { groupId: { $exists: true, $not: { $type: "string" } } },
      [
        { $set: { groupId: { $toString: "$groupId" } } } // MongoDB aggregation pipeline
      ]
    );

    console.log(`✅ Migrated ${result.modifiedCount} bookings to string groupId`);

    // Ensure index
    await mongoose.connection.db.collection('bookings').createIndex({ groupId: 1 });
    console.log("✅ Index on groupId ensured");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    await mongoose.disconnect();
  }
}

migrateGroupId();
