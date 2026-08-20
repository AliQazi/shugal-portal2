// models/RateVolume.js

import mongoose from "mongoose";

const rateVolumeSchema = new mongoose.Schema(
  {
    volumeName: {
      type: String,
      required: true,
      trim: true,
    },

    // Hotel this rate volume applies to
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
    },

    // City is denormalized from the hotel for easy filtering/display
    city: {
      type: String,
      trim: true,
    },

    // Date range this buying/selling rate is valid for
    fromDate: {
      type: Date,
    },
    toDate: {
      type: Date,
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
