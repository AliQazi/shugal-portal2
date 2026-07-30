import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: [
        "Booking",
        "UmrahBooking",
        "UmrahPackage",
        "GroupTicketing",
        "Hotel",
        "Visa",
        "Transport",
        "Payment",
        "Auth",
        "Other",
        "Airline",
        "Bank",
        "Global",
        "Sector",
        "Special Offer",
        "Sub User",
        "Team Contact",
        "Ticket Booking"
      ],
      required: true,
    },
    refModel: {
      type: String,
      enum: [
        "Booking",
        "UmrahPackageBooking",
        "umrahPackgemodel",
        "GroupTicketing",
        "Hotel",
        "Visa",
        "Transport",
        "Payment",
        "Register",
      ],
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "refModel",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", activityLogSchema);
