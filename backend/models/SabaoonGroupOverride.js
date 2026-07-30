import mongoose from "mongoose";

const sabaoonGroupOverrideSchema = new mongoose.Schema(
  {
    // The Sabaoon API group id (string representation)
    groupId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // When true, this group is filtered out from the public/frontend response
    isHidden: {
      type: Boolean,
      default: false,
    },
    // Fixed PKR amount to add on top of the raw Sabaoon price.
    // null = no individual margin set (global/agent margin applies instead).
    // When a number is stored, it overrides ALL other margin types on the frontend.
    individualMargin: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SabaoonGroupOverride", sabaoonGroupOverrideSchema);
