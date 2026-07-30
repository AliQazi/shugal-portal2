import mongoose from "mongoose";
import dotenv from "dotenv";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";

dotenv.config();

/**
 * Debug Script: Check payment history IDs
 *
 * This script displays all payment history items with their IDs
 */

const checkPaymentIds = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const bookings = await UmrahPackageBooking.find({
      "paymentStatus.paymentHistory": { $exists: true, $ne: [] },
    });

    console.log(`📦 Found ${bookings.length} bookings with payment history\n`);

    for (const booking of bookings) {
      console.log(`\n📋 Booking: ${booking.bookingNumber}`);
      console.log(`   Package: ${booking.packageName}`);
      console.log(`   Contact: ${booking.contactPerson.name}`);
      console.log(
        `   Payment History (${booking.paymentStatus.paymentHistory.length} items):`,
      );

      booking.paymentStatus.paymentHistory.forEach((payment, index) => {
        console.log(`\n   💳 Payment ${index + 1}:`);
        console.log(`      _id: ${payment._id || "❌ MISSING"}`);
        console.log(`      Amount: PKR ${payment.amount}`);
        console.log(`      Method: ${payment.method}`);
        console.log(`      Status: ${payment.paymentStatus || "Pending"}`);
        console.log(`      Date: ${payment.paymentDate}`);
        if (payment.receiptNumber) {
          console.log(`      Receipt: ${payment.receiptNumber}`);
        }
      });
    }

    console.log("\n\n✅ Debug completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  }
};

checkPaymentIds();
