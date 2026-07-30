import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    voucherId: {
      type: String,
      unique: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    bankAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      // required: true,
    },
    bankAccountName: {
      type: String,
      default: "",
      trim: true,
    },
    accountNo: {
      type: String,
      default: "",
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    umrahPkgBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UmrahPackageBooking",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    receipt: {
      type: String, // Cloudinary URL
      default: null,
    },
    receiptPublicId: {
      type: String, // Cloudinary public ID
      default: null,
    },
    status: {
      type: String,
      enum: ["Un Posted", "Posted", "Cancelled", "Rejected"],
      default: "Un Posted",
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    paymentMethod: {
      type: String,
    },

    referenceNumber: {
      type: String,
    },

    notes: {
      type: String,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    zipVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    zipVoucherNo: {
      type: String,
      default: "",
      trim: true,
    },
    journalPostedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Generate voucher ID automatically before saving
paymentSchema.pre("save", async function () {
  if (!this.voucherId) {
    const count = await mongoose.model("Payment").countDocuments();
    this.voucherId = `PRV-${count + 1}`;
  }
});

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
