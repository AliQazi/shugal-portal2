import mongoose from "mongoose";

const groupPricingRuleSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["provider", "sector", "group"],
      required: true,
    },
    // provider -> source string e.g. "admin" | "al-haider" | "travel-network" | "skypass"
    // sector   -> normalized sector string e.g. "DXB-KHI"
    // group    -> `${source}:${groupId}` (id alone isn't unique across providers)
    key: { type: String, required: true },

    isHidden: { type: Boolean, default: false },
    margin: { type: Number, default: 0 }, // flat PKR, can be negative for discount

    // optional, just for the admin UI to show readable labels without re-deriving them
    label: { type: String, default: "" },
  },
  { timestamps: true },
);

groupPricingRuleSchema.index({ scope: 1, key: 1 }, { unique: true });

export default mongoose.model("GroupPricingRule", groupPricingRuleSchema);
