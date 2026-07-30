import mongoose from "mongoose";

const flightSchema = new mongoose.Schema({
  flightNo: String,
  depDate: String,
  depTime: String,
  sectorFrom: String,
  fromTerminal: String,
  sectorTo: String,
  toTerminal: String,
  flightClass: String,
  arrDate: String,
  arrTime: String,
  baggage: String,
  meal: String,
});

const metadataSchema = new mongoose.Schema({
  buyingCurrency: String,
  buyingPriceAdult: Number,
  buyingPriceChild: Number,
  buyingPriceInfant: Number,
  sellingCurrencyB2B: String,
  sellingPriceAdultB2B: Number,
  sellingPriceChildB2B: Number,
  sellingPriceInfantB2B: Number,
  contactPersonPhone: String,
  contactPersonEmail: String,
  pnr: String,
  internalStatus: String,
});

const selectedGroupSchema = new mongoose.Schema({
  sector: String,
  type: String,
  airline: String,
  groupCategory: String,
  groupName: String,
  noOfDays: Number,
  seats: Number,
  showSeat: Boolean,
  flights: [flightSchema],
  metadata: metadataSchema,
  status: String,
  createdAt: Date,
  updatedAt: Date,
  evoucherAccount: String,
});

const passengerCountsSchema = new mongoose.Schema({
  adults: { type: Number, default: 0 },
  children: { type: Number, default: 0 },
  infants: { type: Number, default: 0 },
});

const visaDetailsSchema = new mongoose.Schema({
  adults: { type: Number, default: 0 },
  children: { type: Number, default: 0 },
  infants: { type: Number, default: 0 },
  adultVisaSelling: { type: Number, default: 0 },
  childVisaSelling: { type: Number, default: 0 },
  infantVisaSelling: { type: Number, default: 0 },
  totalVisaCost: { type: Number, default: 0 },
});

const transportSchema = new mongoose.Schema({
  route: String,
  transportType: String,
  selectTransport: String,
  cost: { type: Number, default: 0 },
  buyingRate: { type: Number, default: 0 },
  passengers: { type: Number, default: 1 },
});

const passengerDetailSchema = new mongoose.Schema({
  type: { type: String, enum: ["Adult", "Child", "Infant"], default: "Adult" },
  title: { type: String, default: "Mr" },
  givenName: { type: String, default: "" },
  surName: { type: String, default: "" },
  passport: { type: String, default: "" },
  dateOfBirth: { type: Date, default: null },
  passportExpiry: { type: Date, default: null },
  nationality: { type: String, default: "Pakistani" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
});

const hotelRoomSchema = new mongoose.Schema({
  city: { type: String, default: "" },
  hotel: { type: String, default: "" },
  rooms: { type: Number, default: 1, min: 1 },
  type: { type: String, default: "" },
  occupancy: { type: Number, default: 1, min: 1, max: 4 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  dateFormatVersion: { type: String, default: "" },
  nights: { type: Number, default: 0 },
  pricePerRoom: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  perPersonCost: { type: Number, default: 0 },
});

const groupTicketPricingSchema = new mongoose.Schema({
  totalPrice: { type: Number, default: 0 },
  adultBasePrice: { type: Number, default: 0 },
  childBasePrice: { type: Number, default: 0 },
  infantPrice: { type: Number, default: 0 },
  currency: { type: String, default: "PKR" },
});

const umrahCalculatorSchema = new mongoose.Schema(
  {
    voucher_id: { type: String, required: true, unique: true },
    visaType: { type: String, default: "" },
    selectedGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupTicketing",
      required: false, // Changed to false - package can be without ticket
      default: null,
    },
    selectedGroupExternalId: {
      type: String,
      default: "",
      trim: true,
    },
    passengerCounts: {
      type: passengerCountsSchema,
      default: () => ({}),
    },
    passengerDetails: {
      type: [passengerDetailSchema],
      default: [],
    },
    totalCost: { type: Number, default: 0 }, // Original total without margins? Keep for reference
    grandTotal: { type: Number, default: 0 }, // Final total with all costs (ticket + visa + transport + hotel)
    groupTicketPricing: {
      type: groupTicketPricingSchema,
      default: () => ({}),
    },
    visaDetails: {
      type: visaDetailsSchema,
      default: () => ({}),
    },
    transportList: {
      type: [transportSchema],
      default: [],
    },
    roomType: {
      type: String,
      enum: ["Private", "Sharing"],
      default: "Private",
    },
    hotelRooms: {
      type: [hotelRoomSchema],
      default: [],
    },
    hasTicket: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Pending", "On Process", "Cancel", "Confirm", "pending_approval"],
      default: "Pending",
    },
    bookingRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
      required: false,
      default: null,
    },
    isB2C: {
      type: Boolean,
      default: false,
    },
    // Contact information for B2C users
    contactEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },
    // For tracking purposes
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Indexes for performance
umrahCalculatorSchema.index({ user: 1 });
umrahCalculatorSchema.index({ status: 1 });
umrahCalculatorSchema.index({ createdAt: -1 });
umrahCalculatorSchema.index({ isB2C: 1 });
// umrahCalculatorSchema.index({ voucher_id: 1 });
umrahCalculatorSchema.index({ hasTicket: 1 });

// Virtual for total passengers
umrahCalculatorSchema.virtual("totalPassengers").get(function () {
  return (
    (this.passengerCounts?.adults || 0) +
    (this.passengerCounts?.children || 0) +
    (this.passengerCounts?.infants || 0)
  );
});

// Virtual for breakdown
umrahCalculatorSchema.virtual("breakdown").get(function () {
  return {
    ticket: this.hasTicket ? this.groupTicketPricing?.totalPrice || 0 : 0,
    visa: this.visaDetails?.totalVisaCost || 0,
    transport: (this.transportList || []).reduce(
      (sum, t) => sum + (t.buyingRate || 0),
      0,
    ),
    hotel: (this.hotelRooms || []).reduce(
      (sum, h) => sum + (h.totalCost || 0),
      0,
    ),
  };
});

// Ensure virtuals are included in JSON output
umrahCalculatorSchema.set("toJSON", { virtuals: true });
umrahCalculatorSchema.set("toObject", { virtuals: true });

export default mongoose.model("UmrahCalculator", umrahCalculatorSchema);
