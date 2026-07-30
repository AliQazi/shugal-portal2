import mongoose from "mongoose";

const HotelNameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const CityNameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true },
);

export const HotelName = mongoose.model("HotelName", HotelNameSchema);
export const CityName = mongoose.model("CityName", CityNameSchema);
