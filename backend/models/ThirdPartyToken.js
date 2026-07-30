import mongoose from "mongoose";

const ThirdPartyTokenSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, unique: true },
    token: { type: String, default: null },
    expiry: { type: Date, default: null },
  },
  { timestamps: true },
);

const ThirdPartyToken = mongoose.model("ThirdPartyToken", ThirdPartyTokenSchema);

export default ThirdPartyToken;
