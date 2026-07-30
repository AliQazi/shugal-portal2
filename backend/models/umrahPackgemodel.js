import mongoose from "mongoose";

const PackageTotalsSchema = new mongoose.Schema(
  {
    double: { type: Number, default: 0 },
    triple: { type: Number, default: 0 },
    quad: { type: Number, default: 0 },
    shared: { type: Number, default: 0 },
    childWithoutBed: { type: Number, default: 0 },
    infant: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
  },
  { _id: false },
);

const RoomPricingSchema = new mongoose.Schema(
  {
    buyingPrice: { type: Number, default: 0 },
    buyingRoe: { type: Number, default: 1 },
    buyingCurrency: { type: String, default: "PKR" },
    sellingPrice: { type: Number, default: 0 },
    sellingRoe: { type: Number, default: 1 },
    sellingCurrency: { type: String, default: "PKR" },
  },
  { _id: false },
);

const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    _id: { type: String, default: "" },
  },
  { _id: false },
);

const FlightSchema = new mongoose.Schema(
  {
    airline: { type: String },
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
    baggage: { type: String },
    meal: { type: String },
  },
  { _id: false },
);

const TransportSchema = new mongoose.Schema(
  {
    route: { type: String },
    supplier: { type: SupplierSchema, default: () => ({}) },
    transportType: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: false },
);

const VisaSchema = new mongoose.Schema(
  {
    visaId: { type: String },
    visaType: { type: String },
    supplier: { type: SupplierSchema, default: () => ({}) },
    withTransport: { type: Boolean, default: false },
    buyingPrice: { type: Number, default: 0 },
    buyingRoe: { type: Number, default: 0 },
    buyingCurrency: { type: String, default: "PKR" },
    sellingPrice: { type: Number, default: 0 },
    sellingRoe: { type: Number, default: 0 },
    sellingCurrency: { type: String, default: "PKR" },
    currency: { type: String, default: "PKR" },
  },
  { _id: false },
);

const GroupTicketingSchema = new mongoose.Schema(
  {
    packageName: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
    },
    flightLogo: {
      type: String,
    },
    packageSource: {
      type: String,
      enum: ["local-db", "travel-network"],
      default: "local-db",
      required: true,
    },
    flights: [FlightSchema],
    hotels: [
      {
        name: { type: String, required: true },
        supplier: { type: SupplierSchema, default: () => ({}) },
        location: {
          city: { type: String },
          distance: { type: String },
          mapUrl: { type: String },
        },
        rating: { type: Number, default: 0 },
        checkIn: { type: Date },
        checkOut: { type: Date },
        nights: { type: Number, default: 0 },
        nightCount: { type: Number, default: 0 },
        buyingPrice: { type: Number, default: 0 },
        buyingRoe: { type: Number, default: 1 },
        buyingCurrency: { type: String, default: "PKR" },
        sellingPrice: { type: Number, default: 0 },
        sellingRoe: { type: Number, default: 1 },
        sellingCurrency: { type: String, default: "PKR" },
        currency: { type: String, default: "PKR" },
        doubleRoom: {
          type: RoomPricingSchema,
          default: () => ({
            buyingPrice: 0,
            buyingRoe: 1,
            sellingPrice: 0,
            sellingRoe: 1,
          }),
        },
        tripleRoom: {
          type: RoomPricingSchema,
          default: () => ({
            buyingPrice: 0,
            buyingRoe: 1,
            sellingPrice: 0,
            sellingRoe: 1,
          }),
        },
        quadRoom: {
          type: RoomPricingSchema,
          default: () => ({
            buyingPrice: 0,
            buyingRoe: 1,
            sellingPrice: 0,
            sellingRoe: 1,
          }),
        },
        sharedRoom: {
          type: RoomPricingSchema,
          default: () => ({
            buyingPrice: 0,
            buyingRoe: 1,
            sellingPrice: 0,
            sellingRoe: 1,
          }),
        },
      },
    ],
    transports: [TransportSchema],
    visa: { type: VisaSchema, default: null },
    rooms: {
      sharing: { type: Number, default: 0 },
      quad: { type: Number, default: 0 },
      quint: { type: Number, default: 0 },
      triple: { type: Number, default: 0 },
      double: { type: Number, default: 0 },
      childWithoutPackage: { type: Number, default: 0 },
      InfantWithoutPackage: { type: Number, default: 0 },
    },
    selectedGroupTicketId: {
      type: String,
      default: "",
    },
    packageTotals: { type: PackageTotalsSchema, default: () => ({}) },
    days: {
      type: Number,
      required: true,
    },
    availableRooms: {
      type: Number,
      required: true,
    },
    internalStatus: {
      type: String,
      enum: ["Public", "Private"],
      default: "Public",
    },
  },
  { timestamps: true },
);

export default mongoose.model("umrahPackagemodel", GroupTicketingSchema);
