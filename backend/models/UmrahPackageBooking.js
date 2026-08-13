import mongoose from "mongoose";

/* ===========================
   PASSENGER DETAIL SUB-SCHEMA
=========================== */
const PassengerDetailSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["Adult", "Child", "Infant"],
    },
    // Only meaningful when type === "Child" - which pricing tier the child was
    // booked under (occupying a bed in the room vs. sharing without an extra bed).
    childType: {
      type: String,
      enum: ["withBed", "withoutBed"],
      default: undefined,
    },
    title: {
      type: String,
      required: true,
      enum: ["Mr", "Mrs", "Ms", "Miss", "Dr", "Master", "Child", "INF", "Baby"],
    },
    givenName: {
      type: String,
      required: true,
      trim: true,
    },
    surName: {
      type: String,
      required: true,
      trim: true,
    },
    passport: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    passportExpiry: {
      type: Date,
      required: true,
    },
    nationality: {
      type: String,
      required: true,
    },
    documentUrl: {
      type: String,
      default: null,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true },
);

/* ===========================
   PAYMENT HISTORY ITEM SUB-SCHEMA
=========================== */
const PaymentHistoryItemSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["Cash", "Bank Transfer", "Online", "Credit Card"],
      required: true,
    },
    paymentDate: { type: Date, default: Date.now },
    receiptNumber: String,
    receiptFile: String, // URL to receipt uploaded by agent/user
    notes: String,
    // Individual payment status (managed by admin)
    paymentStatus: {
      type: String,
      enum: ["Pending", "Received", "Approved", "Rejected"],
      default: "Pending",
    },
    // Admin review details
    reviewedBy: {
      type: String,
      ref: "Register",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    bank: {
      type: String,
    },
    rejectionReason: String, // Reason if rejected
    approvalProofFile: String, // Admin uploads proof when approving
    // User who submitted this payment
    submittedBy: {
      type: String,
      ref: "Register",
      default: null,
    },
  },
  { _id: true }, // Enable _id for each payment history item
);

/* ===========================
   PAYMENT STATUS SUB-SCHEMA
=========================== */
const PaymentStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Pending", "Approved", "Refunded", "Paid"],
      default: "Pending",
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    paymentHistory: [PaymentHistoryItemSchema],
  },
  { _id: false },
);

/* ===========================
   VISA STATUS SUB-SCHEMA
=========================== */
const VisaStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Not Applied", "Applied", "In Process", "Approved", "Rejected"],
      default: "Not Applied",
    },
    applicationNumber: String,
    applicationDate: Date,
    approvalDate: Date,
    expiryDate: Date,
    approvalDocument: String, // URL to uploaded visa approval document
    notes: String,
  },
  { _id: false },
);

/* ===========================
   HOTEL STATUS SUB-SCHEMA
=========================== */
const HotelStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Not Booked", "Booked", "Confirmed", "Cancelled"],
      default: "Not Booked",
    },
    bookingDate: Date,
    confirmationNumber: String,
    confirmationDocument: String, // URL to uploaded hotel confirmation document
    checkInDate: Date,
    checkOutDate: Date,
    makkahHotel: {
      name: String,
      nights: Number,
    },
    madinahHotel: {
      name: String,
      nights: Number,
    },
    notes: String,
  },
  { _id: false },
);

/* ===========================
   VOUCHER STATUS SUB-SCHEMA
=========================== */
const VoucherStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Not Generated", "Generated", "Sent", "Printed"],
      default: "Not Generated",
    },
    voucherNumber: String,
    generatedDate: Date,
    sentDate: Date,
    sentTo: String,
    notes: String,
    // ZIP Accounts Integration
    zipVoucherId: String, // ID of voucher created in ZIP Accounts
    zipVoucherData: mongoose.Schema.Types.Mixed, // Complete voucher response from ZIP
    zipVoucherCreatedAt: Date, // When voucher was created in ZIP
  },
  { _id: false },
);

/* ===========================
   MAIN UMRAH PACKAGE BOOKING SCHEMA
=========================== */
const UmrahPackageBookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // Reference to the Umrah Package
    packageId: {
      type: String,
      required: true,
      ref: "umrahPackagemodel",
    },
    packageName: {
      type: String,
      required: true,
    },
    packageData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Package Source - to identify if from ZIP accounts or local DB
    packageSource: {
      type: String,
      enum: ["local-db", "travel-network", "upsky"],
      default: "local-db",
      required: true,
    },

    // User who made the booking
    user: {
      type: String,
      ref: "Register",
      required: true,
    },

    // Passenger Details Array (Add More functionality)
    passengers: {
      type: [PassengerDetailSchema],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one passenger is required",
      },
    },

    // Passenger Counts
    passengerCount: {
      adults: { type: Number, default: 0 },
      children: { type: Number, default: 0 },
      infants: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    // Room Selection
    roomType: {
      type: String,
      enum: ["sharing", "quad", "triple", "double"],
      required: true,
    },

    // Pricing
    pricing: {
      pricePerPerson: { type: Number, required: true },
      adultTotal: { type: Number, default: 0 },
      childTotal: { type: Number, default: 0 },
      infantTotal: { type: Number, default: 0 },
      totalPrice: { type: Number, required: true },
      currency: { type: String, default: "PKR" },
    },

    // Flight Details (optional, from package)
    flightDetails: {
      departure: {
        date: Date,
        from: String,
        to: String,
        flightNumber: String,
      },
      return: {
        date: Date,
        from: String,
        to: String,
        flightNumber: String,
      },
    },

    // Multiple Statuses
    paymentStatus: {
      type: PaymentStatusSchema,
      default: () => ({}),
    },

    visaStatus: {
      type: VisaStatusSchema,
      default: () => ({}),
    },

    hotelStatus: {
      type: HotelStatusSchema,
      default: () => ({}),
    },

    voucherStatus: {
      type: VoucherStatusSchema,
      default: () => ({}),
    },

    // Overall Booking Status
    overallStatus: {
      type: String,
      enum: [
        "On Hold",
        "Pending",
        "Confirmed",
        "In Progress",
        "Completed",
        "Cancelled",
      ],
      default: "On Hold",
    },

    // Additional Notes
    specialRequests: String,
    internalNotes: String,

    // Expiry Date (optional)
    expiresAt: Date,

    // Travel Network booking integration
    travelNetworkBookingId: String,
    travelNetworkBookingRefNo: String,
    travelNetworkBookingData: mongoose.Schema.Types.Mixed,
    travelNetworkBookingCreatedAt: Date,

    // Up Sky booking integration
    upskyBookingId: String,
    upskyBookingRefNo: String,
    upskyBookingData: mongoose.Schema.Types.Mixed,
    upskyBookingCreatedAt: Date,

    // Supplier discount for external (Travel Network / Up Sky) bookings
    // This is the discount given by the supplier on the total selling price
    // Cost = totalSellingPrice - supplierDiscount; this amount is credited to the supplier account
    supplierDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ZIP Accounts Integration (legacy fields, kept for old records)
    zipBookingId: String, // ID of booking created in ZIP Accounts
    zipBookingRefNo: String, // Reference number from ZIP Accounts
    zipBookingData: mongoose.Schema.Types.Mixed, // Complete booking response from ZIP
    zipBookingCreatedAt: Date, // When booking was created in ZIP
  },
  { timestamps: true },
);

/* ===========================
   PRE-SAVE MIDDLEWARE
=========================== */
UmrahPackageBookingSchema.pre("save", function () {
  // Auto-calculate passenger counts
  if (this.passengers && this.passengers.length > 0) {
    const adults = this.passengers.filter((p) => p.type === "Adult").length;
    const children = this.passengers.filter((p) => p.type === "Child").length;
    const infants = this.passengers.filter((p) => p.type === "Infant").length;

    this.passengerCount = {
      adults,
      children,
      infants,
      total: adults + children + infants,
    };
  }

  // Auto-calculate remaining payment amount
  if (this.paymentStatus) {
    this.paymentStatus.remainingAmount =
      this.paymentStatus.totalAmount - this.paymentStatus.paidAmount;
  }
});

export default mongoose.model("UmrahPackageBooking", UmrahPackageBookingSchema);
