import mongoose from "mongoose";

const BankSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
    },
    accountTitle: {
      type: String,
      required: [true, "Account title is required"],
      trim: true,
    },
    accountNo: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
    },
    ibn: {
      type: String,
      required: [true, "IBN is required"],
      trim: true,
    },
    bankAddress: {
      type: String,
      required: [true, "Bank address is required"],
      trim: true,
    },
    logo: {
      type: String,
      default: "",
    },
    logoPublicId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "De-Active"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  },
);

const Bank = mongoose.model("Bank", BankSchema);

export default Bank;
