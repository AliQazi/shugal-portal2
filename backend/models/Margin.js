import mongoose from "mongoose";

const marginSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
      default: 0,
    },
    type: {
      type: String,
      enum: ["percent", "amount"],
      required: true,
      default: "percent",
    },
    appliedBy: {
      type: String,
      default: "admin",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Margin", marginSchema);
