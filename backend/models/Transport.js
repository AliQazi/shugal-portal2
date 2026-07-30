// models/Transport.js

import mongoose from "mongoose";

const transportSchema = new mongoose.Schema(
  {
    route: {
      type: String,
      required: true,
      trim: true,
    },

    transportType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Transport = mongoose.model("Transport", transportSchema);

export default Transport;
