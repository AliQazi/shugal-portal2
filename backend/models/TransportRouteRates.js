import mongoose from "mongoose";

const TransportRouteRateSchema = new mongoose.Schema(
  {
    staffName: { type: String, required: true },
    staffNumber: { type: Number, required: true },
    supplier: { type: String, required: true },
    selectTransport: { type: String, required: true },
    route: { type: String, required: true },
    buyingRate: { type: Number, required: true },
    sellingRate: { type: Number, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("TransportRouteRate", TransportRouteRateSchema);
