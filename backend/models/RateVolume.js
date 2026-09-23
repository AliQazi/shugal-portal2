// models/RateVolume.js

import mongoose from "mongoose";

const pricingFields = {
  buyingPrice: { type: Number, required: true, default: 0 },
  buyingRoe: { type: Number, default: 1 },
  buyingCurrency: { type: String, default: "PKR", trim: true },
  sellingPrice: { type: Number, required: true, default: 0 },
  sellingRoe: { type: Number, default: 1 },
  sellingCurrency: { type: String, default: "PKR", trim: true },
  sharedRoomBuyingPrice: { type: Number, default: 0 },
  sharedRoomBuyingRoe: { type: Number, default: 1 },
  sharedRoomBuyingCurrency: { type: String, default: "PKR", trim: true },
  sharedRoomSellingPrice: { type: Number, default: 0 },
  sharedRoomSellingRoe: { type: Number, default: 1 },
  sharedRoomSellingCurrency: { type: String, default: "PKR", trim: true },
};

const dateRateSchema = new mongoose.Schema(
  {
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    ...pricingFields,
  },
  { _id: false },
);

const hotelRateSchema = new mongoose.Schema(
  {
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    city: { type: String, trim: true, default: "" },
    // Retained only so records created by the transitional multi-date version
    // remain readable. New writes keep one date range at the volume root.
    fromDate: { type: Date },
    toDate: { type: Date },
    // The flat fields mirror the first date rate for old clients. New clients use
    // dateRates so every hotel can carry a different price in every date band.
    ...pricingFields,
    dateRates: { type: [dateRateSchema], default: undefined },
  },
  { _id: true },
);

const rateVolumeSchema = new mongoose.Schema(
  {
    volumeName: {
      type: String,
      required: true,
      trim: true,
    },

    // New structure: one named volume can contain rates for many hotels (and can
    // also contain more than one dated rate for the same hotel).
    hotelRates: {
      type: [hotelRateSchema],
      default: undefined,
    },

    // Legacy single-hotel fields are intentionally retained. Existing documents
    // continue to work, while new writes mirror the first hotelRates item here so
    // older consumers are not broken during deployment.
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
    },

    // City is denormalized from the hotel for easy filtering/display
    city: {
      type: String,
      trim: true,
    },

    // All date ranges in which this volume's pricing applies (must not overlap).
    // Legacy documents have no dateRanges and fall back to fromDate/toDate below.
    dateRanges: {
      type: [
        new mongoose.Schema(
          {
            fromDate: { type: Date, required: true },
            toDate: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },

    // Mirrors the first date range so older consumers keep working.
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
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
