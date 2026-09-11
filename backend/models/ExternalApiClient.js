import mongoose from "mongoose";

const externalApiClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true, select: false },
    keyPrefix: { type: String, required: true, index: true },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: true,
    },
    scopes: {
      type: [String],
      enum: ["inventory:read", "bookings:read", "bookings:write"],
      default: ["inventory:read", "bookings:read", "bookings:write"],
    },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      index: true,
    },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("ExternalApiClient", externalApiClientSchema);
