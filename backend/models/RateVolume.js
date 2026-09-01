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

    // Shared Room pricing - kept separate from the buying/selling rate above,
    // which is used for Double/Triple/Quad. Applied as-is (not split per pax).
    sharedRoomBuyingPrice: {
      type: Number,
      default: 0,
    },
    sharedRoomBuyingRoe: {
      type: Number,
      default: 1,
    },
    sharedRoomBuyingCurrency: {
      type: String,
      default: "PKR",
      trim: true,
    },
    sharedRoomSellingPrice: {
      type: Number,
      default: 0,
    },
    sharedRoomSellingRoe: {
      type: Number,
      default: 1,
    },
    sharedRoomSellingCurrency: {
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
