import mongoose from "mongoose";
import BookingCounter from "./BookingCounter.js";

const passengerSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["Adult", "Child", "Infant"],
  },
  title: {
    type: String,
    required: true,
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
    required: false,
  },
  passportExpiry: {
    type: Date,
    required: false,
  },
  passportIssue: {
    type: Date,
    required: false,
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
  supplierDiscount: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const bookingSchema = new mongoose.Schema(
  {
    // Group and Flight Information
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    groupType: {
      type: String,
      required: true,
    },
    airline: {
      id: String,
      name: {
        type: String,
        required: true,
      },
      logoUrl: String,
    },
    sector: {
      type: String,
      required: true,
    },
    pnr: {
      type: String,
      default: "",
    },

    // Contact Information
    contactPersonName: {
      type: String,
      required: true,
      trim: true,
    },

    // Passenger Counts
    adultsCount: {
      type: Number,
      required: true,
      min: 0,
    },
    childrenCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    infantsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPassengers: {
      type: Number,
      required: true,
    },

    // Pricing Information
    pricing: {
      // Final prices (base + margin applied) — what the agent pays
      adultPrice: {
        type: Number,
        required: true,
      },
      childPrice: {
        type: Number,
        default: 0,
      },
      infantPrice: {
        type: Number,
        default: 0,
      },
      // Original base prices from the group (before any margin) — used for Sabaoon API & admin breakdown
      adultBasePrice: {
        type: Number,
        default: 0,
      },
      childBasePrice: {
        type: Number,
        default: 0,
      },
      infantBasePrice: {
        type: Number,
        default: 0,
      },
      adultTotal: {
        type: Number,
        required: true,
      },
      childTotal: {
        type: Number,
        default: 0,
      },
      infantTotal: {
        type: Number,
        default: 0,
      },
      grandTotal: {
        type: Number,
        required: true,
      },
    },

    // Passenger Details
    passengers: [passengerSchema],

    // Flight Details
    flights: [
      {
        flightNo: String,
        flightDate: Date,
        depDate: Date,
        depTime: String,
        origin: String,
        destination: String,
        arrDate: Date,
        arrTime: String,
        baggage: String,
        meal: String,
      },
    ],

    // Dates
    departureDate: {
      type: Date,
      required: true,
    },
    arrivalDate: {
      type: Date,
    },

    // Booking Status
    status: {
      type: String,
      enum: ["on hold", "confirmed", "cancelled"],
      default: "on hold",
    },

    // Ticket Information
    ticketNumber: {
      type: String,
      trim: true,
      default: "",
    },

    ticketNumberAddedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      default: null,
    },

    ticketNumberAddedAt: {
      type: Date,
      default: null,
    },

    // User Information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: true,
    },

    // Metadata
    bookingReference: {
      type: String,
      unique: true,
      // Removed index: true to avoid duplicate with schema.index() below
    },
    notes: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true, // helps cron/queries
    },

    source: {
      type: String,
      enum: [
        "al-haider",
        "admin",
        "travel-network",
        "skypass",
        "mct",
        "upsky",
        "ALSABOOR",
        "amaar-shoaib",
      ],
    },

    // Al-Haider specific fields
    alHaiderBookingId: {
      type: String,
      default: null,
    },
    alHaiderBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    alHaiderErrorMessage: {
      type: String,
      default: null,
    },

    // Sabaoon API
    sabaoonTransactionId: {
      type: Number,
      default: null,
    },
    sabaoonBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "pending",
    },

    // Refunded passenger indices
    refundedPassengerIndices: {
      type: [Number],
      default: [],
    },

    // Auto-cancellation tracking
    cancelledAt: {
      type: Date,
      default: null,
    },

    // ZIP Accounts journal voucher ID (created on confirmation)
    zipVoucherId: {
      type: String,
      default: null,
    },

    tntBookingId: {
      type: String,
      default: null,
    },
    tntBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    tntErrorMessage: {
      type: String,
      default: null,
    },
    tntErrorDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    tntResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Track if TNT fare was changed and retried automatically
    tntFareChanged: {
      type: Boolean,
      default: false,
    },
    tntNewPrice: {
      type: Number,
      default: null,
    },
    tntGroupPriceDetailId: {
      type: Number,
      default: null,
    },
    skypassBookingId: {
      type: String,
      sparse: true,
    },
    skypassBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    skypassResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    skypassErrorMessage: {
      type: String,
    },
    skypassErrorDetails: {
      type: mongoose.Schema.Types.Mixed,
    },
    mctBookingId: {
      type: String,
      default: null,
    },
    mctBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    mctResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    mctErrorMessage: {
      type: String,
      default: null,
    },
    mctErrorDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    upskyBookingId: {
      type: String,
      default: null,
    },
    upskyBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    upskyResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    upskyErrorMessage: {
      type: String,
      default: null,
    },
    upskyErrorDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    alSaboorBookingId: {
      type: String,
      default: null,
    },
    alSaboorBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    alSaboorResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    alSaboorErrorMessage: {
      type: String,
      default: null,
    },
    alSaboorErrorDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    amaarShoaibBookingId: {
      type: String,
      default: null,
    },
    amaarShoaibBookingStatus: {
      type: String,
      enum: ["pending", "success", "failed", "not_applicable"],
      default: "not_applicable",
    },
    amaarShoaibResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    amaarShoaibErrorMessage: {
      type: String,
      default: null,
    },
    amaarShoaibErrorDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Generate booking reference before saving
bookingSchema.pre("save", async function () {
  if (this.bookingReference) return;

  const counter = await BookingCounter.findOneAndUpdate(
    { date: "global" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  this.bookingReference = String(counter.seq).padStart(4, "0");
});

// Index for faster queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
