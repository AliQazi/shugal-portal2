import mongoose from "mongoose";

const SpecialOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "image is required"],
    },
  },
  {
    timestamps: true,
  },
);

const SpecialOffer = mongoose.model("SpecialOffer", SpecialOfferSchema);

export default SpecialOffer;
