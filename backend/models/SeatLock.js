import mongoose from "mongoose";

// Short-lived mutex per group ticket. Group Ticket and Umrah Package bookings
// both draw seats from the same GroupTicketing document, so they take this
// lock (see utils/groupSeatLock.js) to make "check seats -> create booking"
// atomic. A document exists only while a booking is being created, and a
// crashed holder's lock simply expires.
const SeatLockSchema = new mongoose.Schema(
  {
    _id: { type: String },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

export default mongoose.model("SeatLock", SeatLockSchema);
