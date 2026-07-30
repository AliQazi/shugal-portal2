import mongoose from "mongoose";

const unifiedGroupCacheSchema = new mongoose.Schema(
  {
    data: {
      type: Array,
      default: [],
    },
    apidata: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("UnifiedGroupCache", unifiedGroupCacheSchema);
