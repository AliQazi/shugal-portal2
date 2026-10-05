import dotenv from "dotenv";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import GroupTicketing from "../models/GroupTicketing.js";

dotenv.config();
const apply = process.argv.includes("--apply");
try {
  await mongoose.connect(process.env.MONGO_URI);
  const bookings = await Booking.find({ bookingChannel: "external_api", inventoryDeducted: true }).lean();
  for (const booking of bookings) {
    const seats = booking.adultsCount + booking.childrenCount;
    console.log(`${apply ? "Repair" : "Would repair"} group ${booking.groupId}: restore ${seats} capacity seat(s), booking ${booking.bookingReference}`);
    if (!apply) continue;
    // Restore capacity and clear the legacy deduction flag together. Re-running
    // cannot add seats again, and cancellation/expiry will not restock twice.
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const claimed = await Booking.updateOne(
          { _id: booking._id, inventoryDeducted: true },
          { $set: { inventoryDeducted: false } },
          { session },
        );
        if (!claimed.modifiedCount) return;
        const restored = await GroupTicketing.updateOne(
          { _id: booking.groupId }, { $inc: { totalSeats: seats } }, { session },
        );
        if (!restored.matchedCount) throw new Error(`Missing group ${booking.groupId}`);
      });
    } finally {
      await session.endSession();
    }
  }
  if (!apply) console.log("Dry run only. Use --apply to repair (requires MongoDB transactions).");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
