import mongoose from "mongoose";

/* ===========================
   FLIGHT SUB-SCHEMA
=========================== */
const FlightSchema = new mongoose.Schema(
  {
    airline: { type: String, required: true },
    flightNo: { type: String, required: true },

    depDate: { type: Date, required: true },
    depTime: { type: String, required: true },
    arrDate: { type: Date, required: true },
    arrTime: { type: String, required: true },

    sectorFrom: { type: String, required: true },
    sectorTo: { type: String, required: true },
    fromTerminal: { type: String },
    toTerminal: { type: String },

    flightClass: { type: String },
    baggage: String,
    meal: String,
  },
  { _id: false },
);

/* ===========================
   PASSENGER COUNT
=========================== */
const PassengerSchema = new mongoose.Schema(
  {
    adults: { type: Number, default: 0 },
    children: { type: Number, default: 0 },
    infants: { type: Number, default: 0 },
  },
  { _id: false },
);

/* ===========================
   PRICE BREAKDOWN
=========================== */
const PriceSchema = new mongoose.Schema(
  {
    // Buying Prices
    buyingCurrency: { type: String, default: "PKR" },
    buyingAdultPrice: { type: Number, default: 0 },
    buyingChildPrice: { type: Number, default: 0 },
    buyingInfantPrice: { type: Number, default: 0 },

    // Selling Prices B2B
    sellingCurrencyB2B: { type: String, default: "PKR" },
    sellingAdultPriceB2B: { type: Number, default: 0 },
    sellingChildPriceB2B: { type: Number, default: 0 },
    sellingInfantPriceB2B: { type: Number, default: 0 },

    total: { type: Number, default: 0 },
  },
  { _id: false },
);

/* ===========================
   PAYMENT SUB-SCHEMA
=========================== */
const PaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["Cash", "Bank", "Online"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Refunded"],
      default: "Pending",
    },
    paymentDate: Date,
  },
  { timestamps: true },
);

/* ===========================
   MAIN GROUP TICKETING
=========================== */
const GroupTicketingSchema = new mongoose.Schema(
  {
    voucher_id: {
      type: String,
      required: true,
      unique: true,
    },

    groupBookingId: {
      type: String,
      required: true,
      unique: true,
    },

    user: {
      name: { type: String, required: true },
      _id: { type: String, required: true },
    },

    evoucherAccount: { type: String },
    sector: { type: String },

    airline: { type: String },
    groupCategory: { type: String },
    groupName: { type: String },
    totalSeats: { type: Number, default: 0 },
    showSeat: { type: Boolean, default: false },
    hidePartial: { type: Boolean, default: false },
    partialSeats: {type:Number, default: 0},
    totalSeatsAfterPartial: {type: Number, default: 0},

    groupType: {
      type: String,
      enum: [
        "UAE Groups",
        "KSA Groups",
        "Bahrain Groups",
        "Mascat Groups",
        "Qatar Groups",
        "UK Groups",
        "Umrah Groups",
      ],
      required: true,
    },

    flights: [FlightSchema],

    passengers: PassengerSchema,

    price: PriceSchema,

    payments: [PaymentSchema],

    pnr: { type: String },
    contactPersonPhone: { type: String },
    contactPersonEmail: { type: String },
    internalStatus: { type: String, default: "Public" },
  },
  { timestamps: true },
);

/* ===========================
   AUTO CALCULATIONS
=========================== */
GroupTicketingSchema.pre("save", function () {
  const { adults = 0, children = 0, infants = 0 } = this.passengers || {};

  // infants do NOT occupy seats
  // Only auto-calculate totalSeats if passengers are provided, otherwise use totalSeats
  if (adults > 0 || children > 0) {
    this.totalSeats = adults + children;
  } else if (this.totalSeats > 0) {
    this.totalSeats = this.totalSeats;
  }

  // Calculate total based on selling prices (B2B)
  this.price.total =
    adults * (this.price.sellingAdultPriceB2B || 0) +
    children * (this.price.sellingChildPriceB2B || 0) +
    infants * (this.price.sellingInfantPriceB2B || 0);
});

export default mongoose.model("GroupTicketing", GroupTicketingSchema);
