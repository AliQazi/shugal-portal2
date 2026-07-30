import mongoose from "mongoose";

const ummrahVisaSchema = new mongoose.Schema(
  {
    visaName: {
      type: String,
      required: true,
      trim: true,
    },
    supplierAccount: {
      type: String,
      required: true,
      trim: true,
    },
    adultVisaCost: {
      type: Number,
      required: true,
      min: 0,
    },
    adultVisaSelling: {
      type: Number,
      required: true,
      min: 0,
    },
    infantVisaCost: {
      type: Number,
      required: true,
      min: 0,
    },
    infantVisaSelling: {
      type: Number,
      required: true,
      min: 0,
    },
    childVisaCost: {
      type: Number,
      required: true,
      min: 0,
    },
    childVisaSelling: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
    },
  },
  {
    timestamps: true,
  }
);

const UmmrahVisa = mongoose.model("UmmrahVisa", ummrahVisaSchema);
export default UmmrahVisa;
