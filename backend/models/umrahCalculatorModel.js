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
    adults: Number,
    children: Number,
    infants: Number,
});

const visaDetailsSchema = new mongoose.Schema({
    adults: Number,
    children: Number,
    infants: Number,
    adultVisaSelling: Number,
    childVisaSelling: Number,
    infantVisaSelling: Number,
    totalVisaCost: Number,
});

const transportSchema = new mongoose.Schema({
    route: String,
    transportType: String,
    cost: Number,
});

const hotelRoomSchema = new mongoose.Schema({
    city: String,
    hotel: String,
    rooms: Number,
    type: String,
    startDate: Date,
    endDate: Date,
    dateFormatVersion: String,
    pricePerRoom: Number,
    totalCost: Number,
});

const umrahCalculatorSchema = new mongoose.Schema(
    {
        voucher_id: { type: String, required: true, unique: true },
        visaType: { type: String, required: true },
        selectedGroup: selectedGroupSchema,
        passengerCounts: passengerCountsSchema,
        totalCost: Number,
        visaDetails: visaDetailsSchema,
        transportList: [transportSchema],
        roomType: String,
        hotelRooms: [hotelRoomSchema],
        status: { type: String, default: "Pending" },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Register", // must match your Register model name
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("UmrahCalculator", umrahCalculatorSchema);
