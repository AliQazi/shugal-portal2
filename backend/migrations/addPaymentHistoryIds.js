import mongoose from "mongoose";
import dotenv from "dotenv";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";

dotenv.config();

/**
 * Migration Script: Add _id to existing payment history items
 *
 * This script adds MongoDB ObjectIds to payment history items that don't have them.
 * Run this once after updating the schema to enable _id generation for payment history.
 */

const addPaymentHistoryIds = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all bookings with payment history
    const bookings = await UmrahPackageBooking.find({
      "paymentStatus.paymentHistory": { $exists: true, $ne: [] },
    });

    console.log(`📦 Found ${bookings.length} bookings with payment history`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const booking of bookings) {
      let modified = false;

      for (let i = 0; i < booking.paymentStatus.paymentHistory.length; i++) {
        const payment = booking.paymentStatus.paymentHistory[i];

        // Check if payment already has _id
        if (!payment._id) {
          // Assign a new ObjectId
          payment._id = new mongoose.Types.ObjectId();
          modified = true;
          console.log(
            `  ➕ Added _id to payment ${i + 1} in booking ${booking.bookingNumber}`,
          );
        }
      }

      if (modified) {
        // Save the booking with updated payment history
        await booking.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log(`   - Updated bookings: ${updatedCount}`);
    console.log(`   - Skipped (already have IDs): ${skippedCount}`);
    console.log(`   - Total bookings processed: ${bookings.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

// Run migration
addPaymentHistoryIds();
