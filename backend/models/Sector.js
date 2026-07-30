import mongoose from "mongoose";

const SectorSchema = new mongoose.Schema(
  {
    groupType: {
      type: String,
      required: [true, "Group type is required"],
      enum: [
        "UAE Groups",
        "KSA Groups",
        "Bahrain Groups",
        "Mascat Groups",
        "Qatar Groups",
        "UK Groups",
        "Umrah Groups",
      ],
      trim: true,
    },
    sectorTitle: {
      type: String,
      required: [true, "Sector title is required"],
      trim: true,
      uppercase: true,
    },
    fullSector: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

const Sector = mongoose.model("Sector", SectorSchema);

export default Sector;
