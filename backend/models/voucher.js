import mongoose from "mongoose";

const VoucherSchema = new mongoose.Schema(
  {
    voucher_id: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: [
        "umrahpackagequery",
        "groupticketing",
        "umrahcalculator",
        "hajjcalculator",
        "paymentproof",
        "gamkaToken",
        "GroupTicketingBooking",
        "visa",
        "ksaVoucher",
        "omanVoucher",
        "UAEONEWAYVoucher",
        "bahrainVoucher",
        "ukVoucher",
        "umrahpkg",
        "umrahpkgBooking",
      ],
      required: true,
    },
    booking_ref: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "typeRef",
    },
    typeRef: {
      type: String,
      enum: [
        "UmrahPackageQuery",
        "GroupTicketing",
        "UmrahCalculator",
        "HajjCalculator",
        "PaymentProof",
        "GamkaToken",
        "GroupTicketingBooking",
        "VisaBooking",
        "KSAVoucher",
        "OmanVoucher",
        "UAEONEWAYVoucher",
        "BahrainVoucher",
        "UKVoucher",
        "UmrahPkg",
        "UmrahPkgBooking",

      ],
    },
  },
  { timestamps: true }
);

// ✅ Prevent OverwriteModelError
const Voucher =
  mongoose.models.Voucher || mongoose.model("Voucher", VoucherSchema);

export default Voucher;
