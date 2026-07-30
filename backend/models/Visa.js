// models/Visa.js

import mongoose from "mongoose";

const visaSchema = new mongoose.Schema(
  {
    visaType: {
      type: String,
      required: true,
      trim: true,
    },

    withTransport: {
      type: Boolean,
      required: true,
      default: false,
    },

    processingTime: {
      type: Number, // in days
      required: true,
      default: 0,
    },

    buyingPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    buyingRoe: {
      type: Number,
      required: true,
      default: 0,
    },

    buyingCurrency: {
      type: String,
      required: true,
      default: "PKR",
      trim: true,
    },

    sellingPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    sellingRoe: {
      type: Number,
      required: true,
      default: 0,
    },

    sellingCurrency: {
      type: String,
      required: true,
      default: "PKR",
      trim: true,
    },

    currency: {
      type: String,
      required: true,
      default: "PKR",
    },

    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Visa = mongoose.model("Visa", visaSchema);

export default Visa;
