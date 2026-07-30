import mongoose from "mongoose";

const timeSlabSchema = new mongoose.Schema(
  {
    timeFrom: {
      type: String,
      required: true,
      trim: true,
    },

    timeTo: {
      type: String,
      required: true,
      trim: true,
    },

    timeFromPeriod: {
      type: String,
      enum: ["AM", "PM"],
      required: true,
    },

    timeToPeriod: {
      type: String,
      enum: ["AM", "PM"],
      required: true,
    },

    fromMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
    },

    // Overnight slabs can be above 1440.
    // Example: 09:00 PM to 10:00 AM = 1260 to 2040
    toMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 2879,
    },

    holdDurationHours: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

const globalSettingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["booking_hold_duration"],
      default: "booking_hold_duration",
      required: true,
    },

    api_key: {
      enum: [
        "admin",
        "al-haider",
        "travel-network",
        "skypass",
        "mct",
        "upsky",
        "ALSABOOR",
        "amaar-shoaib",
      ],
      default: "admin",
      type: String,
    },

    timeSlabs: [timeSlabSchema],
  },
  { timestamps: true },
);

globalSettingSchema.index({ type: 1, api_key: 1 }, { unique: true });

export default mongoose.model("GlobalSetting", globalSettingSchema);
