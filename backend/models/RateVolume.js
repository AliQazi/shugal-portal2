// models/RateVolume.js

import mongoose from "mongoose";

const rateVolumeSchema = new mongoose.Schema(
  {
    volumeName: {
      type: String,
      required: true,
      trim: true,
    },

    // Buying side
    buyingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    buyingRoe: {
      type: Number,
      default: 1,
    },
    buyingCurrency: {
      type: String,
      default: "PKR",
      trim: true,
    },

    // Selling side
    sellingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    sellingRoe: {
      type: Number,
      default: 1,
    },
    sellingCurrency: {
      type: String,
      default: "PKR",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const RateVolume = mongoose.model("RateVolume", rateVolumeSchema);

export default RateVolume;
