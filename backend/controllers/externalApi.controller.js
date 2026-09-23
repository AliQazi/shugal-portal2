import mongoose from "mongoose";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import GroupTicketing from "../models/GroupTicketing.js";
import UmrahPackage from "../models/umrahPackgemodel.js";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import BookingCounter from "../models/BookingCounter.js";
import ActivityLog from "../models/activitylogs.js";
import { calculateBookingExpiresAt } from "../utils/bookingHoldDuration.js";

const startOfToday = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};
const publicGroupQuery = () => ({
  internalStatus: "Public",
  totalSeats: { $gt: 0 },
  "flights.0.depDate": { $gte: startOfToday() },
});
const publicUmrahPackageQuery = () => ({
  internalStatus: "Public",
  availableRooms: { $gt: 0 },
  "flights.0.depDate": { $gte: startOfToday() },
});
const passengerTypes = ["Adult", "Child", "Infant"];
const AVAILABILITY_TOKEN_TTL_MS = 5 * 60 * 1000;

const availabilitySecret = () => process.env.JWT_SECRET || "";
const signAvailabilityPayload = (payload) => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", availabilitySecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
};
const verifyAvailabilityToken = (token) => {
  if (!token || !availabilitySecret()) return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = crypto.createHmac("sha256", availabilitySecret()).update(encoded).digest();
  let supplied;
  try { supplied = Buffer.from(signature, "base64url"); } catch { return null; }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return payload.expiresAt > Date.now() ? payload : null;
  } catch { return null; }
};

const nextUmrahBookingNumber = async () => {
  const [storedMaximum] = await UmrahPackageBooking.aggregate([
    { $match: { bookingNumber: /^(UP-)?\d+$/ } },
    { $project: { sequence: { $convert: { input: { $replaceOne: { input: "$bookingNumber", find: "UP-", replacement: "" } }, to: "int", onError: 0, onNull: 0 } } } },
    { $group: { _id: null, sequence: { $max: "$sequence" } } },
  ]);
  await BookingCounter.updateOne(
    { date: "umrah-global" },
    { $max: { seq: storedMaximum?.sequence || 0 } },
    { upsert: true },
  );
  const counter = await BookingCounter.findOneAndUpdate(
    { date: "umrah-global" },
    { $inc: { seq: 1 } },
    { new: true },
  );
  return `UP-${String(counter.seq).padStart(4, "0")}`;
};

const presentGroup = (group) => ({
  id: group._id,
  groupCode: group.groupBookingId,
  name: group.groupName,
  type: group.groupType,
  category: group.groupCategory,
  sector: group.sector,
  airline: group.airline,
  pnr: group.pnr || "",
  // availableSeats: group.totalSeats,
  currency: group.price?.sellingCurrencyB2B || "PKR",
  fares: {
    adult: group.price?.sellingAdultPriceB2B || 0,
    child: group.price?.sellingChildPriceB2B || 0,
    infant: group.price?.sellingInfantPriceB2B || 0,
  },
  flights: group.flights,
});

const presentBooking = (booking) => ({
  _id: booking._id,
  status: booking.status,
  expiresAt: booking.expiresAt,
  pnr: booking.pnr || "",
  contactPersonName: booking.contactPersonName,
  passengerCounts: {
    adults: booking.adultsCount,
    children: booking.childrenCount,
    infants: booking.infantsCount,
    total: booking.totalPassengers,
  },
  pricing: booking.pricing,
  passengers: booking.passengers,
  createdAt: booking.createdAt,
});

const presentUmrahBooking = (booking) => ({
  _id: booking._id,
  status: booking.overallStatus,
  expiresAt: booking.expiresAt,
  packageId: booking.packageId,
  packageName: booking.packageName,
  roomType: booking.roomType,
  passengerCounts: booking.passengerCount,
  pricing: booking.pricing,
  passengers: booking.passengers,
  createdAt: booking.createdAt,
});

const presentUmrahPackage = (pkg) => ({
  id: pkg._id,
  name: pkg.packageName,
  logo: pkg.logo,
  flightLogo: pkg.flightLogo,
  // source: pkg.packageSource,
  days: pkg.days,
  // availableRooms: pkg.availableRooms,
  // rooms: pkg.rooms,
  packageTotals: {
    double: pkg.packageTotals?.double || 0,
    triple: pkg.packageTotals?.triple || 0,
    quad: pkg.packageTotals?.quad || 0,
    shared: pkg.packageTotals?.shared || 0,
    childWithoutBed: pkg.packageTotals?.childWithoutBed || 0,
    childWithBed: pkg.packageTotals?.childWithBed || 0,
    infant: pkg.packageTotals?.infant || 0,
    // incentive: pkg.packageTotals?.incentive || 0,
  },
  flights: pkg.flights,
  hotels: pkg.hotels?.map((hotel) => ({
    name: hotel.name,
    location: hotel.location,
    rating: hotel.rating,
    checkIn: hotel.checkIn,
    checkOut: hotel.checkOut,
    nights: hotel.nights,
    nightCount: hotel.nightCount,
    // currency: hotel.sellingCurrency || hotel.currency || "PKR",
    // roomPrices: {
    //   double: hotel.doubleRoom?.sellingPrice || 0,
    //   triple: hotel.tripleRoom?.sellingPrice || 0,
    //   quad: hotel.quadRoom?.sellingPrice || 0,
    //   shared: hotel.sharedRoom?.sellingPrice || 0,
    // },
  })),
  transports: pkg.transports?.map((transport) => ({
    route: transport.route,
    transportType: transport.transportType,
    startDate: transport.startDate,
    endDate: transport.endDate,
  })),
  visa: pkg.visa ? {
    type: pkg.visa.visaType,
    withTransport: pkg.visa.withTransport,
    price: pkg.visa.sellingPrice || 0,
    currency: pkg.visa.sellingCurrency || pkg.visa.currency || "PKR",
  } : null,
});

// A package only holds a saved copy of its group ticket's flights, so swap in the
// live ones (when the group ticket still exists) so later edits are reflected.
const withLiveFlights = async (pkgs) => {
  const list = pkgs.map((pkg) => (pkg?.toObject ? pkg.toObject() : pkg));
  const ids = [...new Set(list.map((pkg) => String(pkg?.selectedGroupTicketId || "")).filter((id) => mongoose.Types.ObjectId.isValid(id)))];
  if (!ids.length) return list;
  const tickets = await GroupTicketing.find({ _id: { $in: ids } }).select("flights").lean();
  const flightsById = new Map(tickets.filter((t) => t.flights?.length).map((t) => [String(t._id), t.flights]));
  return list.map((pkg) => {
    const flights = flightsById.get(String(pkg?.selectedGroupTicketId || ""));
    return flights ? { ...pkg, flights } : pkg;
  });
};

const apiError = (res, status, code, message, details) =>
  res.status(status).json({ success: false, error: { code, message, ...(details && { details }) } });

export const listInventory = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const query = publicGroupQuery();
    if (req.query.groupType) query.groupType = req.query.groupType;
    if (req.query.airline) query.airline = new RegExp(`^${String(req.query.airline).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const [groups, total] = await Promise.all([
      GroupTicketing.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      GroupTicketing.countDocuments(query),
    ]);
    res.json({ success: true, data: groups.map(presentGroup), meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

export const getInventory = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return apiError(res, 400, "INVALID_GROUP_ID", "groupId is invalid.");
    const group = await GroupTicketing.findOne({ _id: req.params.id, ...publicGroupQuery() }).lean();
    if (!group) return apiError(res, 404, "GROUP_NOT_FOUND", "The group is unavailable or does not exist.");
    res.json({ success: true, data: presentGroup(group) });
  } catch (error) { next(error); }
};

export const listUmrahPackages = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const query = publicUmrahPackageQuery();
    if (req.query.source) query.packageSource = req.query.source;

    const [packages, total] = await Promise.all([
      UmrahPackage.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      UmrahPackage.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: (await withLiveFlights(packages)).map(presentUmrahPackage),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

export const getUmrahPackage = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return apiError(res, 400, "INVALID_PACKAGE_ID", "packageId is invalid.");
    }
    const pkg = await UmrahPackage.findOne({ _id: req.params.id, ...publicUmrahPackageQuery() }).lean();
    if (!pkg) return apiError(res, 404, "PACKAGE_NOT_FOUND", "The package is unavailable or does not exist.");
    const [livePkg] = await withLiveFlights([pkg]);
    res.json({ success: true, data: presentUmrahPackage(livePkg) });
  } catch (error) { next(error); }
};

export const checkExternalAvailability = async (req, res, next) => {
  try {
    const { inventoryId, adults = 0, children = 0, infants = 0 } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(inventoryId)) return apiError(res, 422, "VALIDATION_ERROR", "A valid inventoryId is required.");
    const counts = { adults: Number(adults), children: Number(children), infants: Number(infants) };
    if (Object.values(counts).some((value) => !Number.isInteger(value) || value < 0)) {
      return apiError(res, 422, "VALIDATION_ERROR", "adults, children, and infants must be non-negative integers.");
    }
    const [group, pkg] = await Promise.all([
      GroupTicketing.findOne({ _id: inventoryId, internalStatus: "Public", "flights.0.depDate": { $gte: startOfToday() } }).lean(),
      UmrahPackage.findOne({ _id: inventoryId, internalStatus: "Public", "flights.0.depDate": { $gte: startOfToday() } }).lean(),
    ]);
    if (!group && !pkg) return apiError(res, 404, "INVENTORY_NOT_FOUND", "The inventory is unavailable or does not exist.");
    const inventoryKind = pkg ? "umrah-package" : "group-ticketing";
    const requestedUnits = pkg ? counts.adults + counts.children + counts.infants : counts.adults + counts.children;
    if (requestedUnits < 1) return apiError(res, 422, "VALIDATION_ERROR", "At least one reservable passenger is required.");
    const availableUnits = pkg ? pkg.availableRooms : group.totalSeats;
    const available = availableUnits >= requestedUnits;
    const expiresAt = Date.now() + AVAILABILITY_TOKEN_TTL_MS;
    const availabilityToken = available ? signAvailabilityPayload({
      inventoryId: String(inventoryId), clientId: String(req.apiClient._id),
      inventoryKind, requestedUnits, counts, expiresAt,
    }) : null;
    res.json({ success: true, data: { available, requestedUnits, availableUnits, expiresAt: available ? new Date(expiresAt) : null, availabilityToken } });
  } catch (error) { next(error); }
};

export const createExternalBooking = async (req, res, next) => {
  let reservedGroupId = null;
  let reservedPackageId = null;
  let seats = 0;
  let packageUnits = 0;
  try {
    const { inventoryId = req.body?.groupId || req.body?.packageId, contactPersonName, passengers, roomType } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(inventoryId)) return apiError(res, 422, "VALIDATION_ERROR", "A valid inventoryId is required.");
    if (typeof contactPersonName !== "string" || !contactPersonName.trim()) return apiError(res, 422, "VALIDATION_ERROR", "contactPersonName is required.");
    if (!Array.isArray(passengers) || passengers.length < 1) return apiError(res, 422, "VALIDATION_ERROR", "At least one passenger is required.");

    const errors = [];
    passengers.forEach((p, index) => {
      ["type", "title", "givenName", "surName", "passport", "nationality"].forEach((field) => {
        if (!p?.[field]) errors.push(`passengers[${index}].${field} is required`);
      });
      if (p?.type && !passengerTypes.includes(p.type)) errors.push(`passengers[${index}].type must be Adult, Child, or Infant`);
      ["dateOfBirth", "passportExpiry", "passportIssue"].forEach((field) => {
        if (p?.[field] && Number.isNaN(new Date(p[field]).getTime())) errors.push(`passengers[${index}].${field} must be a valid ISO date`);
      });
    });
    if (errors.length) return apiError(res, 422, "VALIDATION_ERROR", "The payload is invalid.", errors);

    const counts = passengerTypes.reduce((result, type) => ({ ...result, [type]: passengers.filter((p) => p.type === type).length }), {});
    seats = counts.Adult + counts.Child;
    if (seats < 1) return apiError(res, 422, "VALIDATION_ERROR", "A booking must contain at least one adult or child.");

    const availability = verifyAvailabilityToken(req.get("x-availability-token"));
    if (!availability) return apiError(res, 428, "AVAILABILITY_CHECK_REQUIRED", "Check availability before creating a booking and provide a valid X-Availability-Token header.");
    if (availability.inventoryId !== String(inventoryId) || availability.clientId !== String(req.apiClient._id)) {
      return apiError(res, 428, "AVAILABILITY_CHECK_REQUIRED", "The availability token does not match this client or inventory item.");
    }

    const [groupInventory, packageInventory] = await Promise.all([
      GroupTicketing.findOne({ _id: inventoryId, ...publicGroupQuery() }).lean(),
      UmrahPackage.findOne({ _id: inventoryId, ...publicUmrahPackageQuery() }).lean(),
    ]);
    if (!groupInventory && !packageInventory) return apiError(res, 404, "INVENTORY_NOT_FOUND", "The inventory is unavailable or does not exist.");
    const detectedKind = packageInventory ? "umrah-package" : "group-ticketing";
    const requestedUnits = packageInventory ? passengers.length : seats;
    const tokenCountsMatch = availability.counts?.adults === counts.Adult &&
      availability.counts?.children === counts.Child &&
      availability.counts?.infants === counts.Infant;
    if (availability.inventoryKind !== detectedKind || availability.requestedUnits !== requestedUnits || !tokenCountsMatch) {
      return apiError(res, 428, "AVAILABILITY_CHECK_REQUIRED", "Passenger counts changed after the availability check. Check availability again.");
    }

    if (packageInventory) {
      const allowedRoomTypes = ["sharing", "quad", "triple", "double"];
      if (!allowedRoomTypes.includes(roomType)) return apiError(res, 422, "VALIDATION_ERROR", "roomType must be sharing, quad, triple, or double for an Umrah package.");
      const umrahRequiredDates = [];
      passengers.forEach((passenger, index) => {
        ["dateOfBirth", "passportExpiry"].forEach((field) => {
          if (!passenger?.[field]) umrahRequiredDates.push(`passengers[${index}].${field} is required for an Umrah package`);
        });
      });
      if (umrahRequiredDates.length) return apiError(res, 422, "VALIDATION_ERROR", "The payload is invalid.", umrahRequiredDates);

      packageUnits = passengers.length;
      const reservedPackage = await UmrahPackage.findOneAndUpdate(
        { _id: inventoryId, internalStatus: "Public", availableRooms: { $gte: packageUnits }, "flights.0.depDate": { $gte: startOfToday() } },
        { $inc: { availableRooms: -packageUnits } },
        { new: true },
      );
      if (!reservedPackage) return apiError(res, 409, "INSUFFICIENT_INVENTORY", "The Umrah package does not have enough availability.");
      reservedPackageId = reservedPackage._id;

      const roomPriceKey = { sharing: "shared", quad: "quad", triple: "triple", double: "double" }[roomType];
      const adultPrice = Number(reservedPackage.packageTotals?.[roomPriceKey]) || 0;
      const childWithBedPrice = Number(reservedPackage.packageTotals?.childWithBed) || adultPrice;
      const childWithoutBedPrice = Number(reservedPackage.packageTotals?.childWithoutBed) || 0;
      const infantPrice = Number(reservedPackage.packageTotals?.infant) || 0;
      const incentive = Number(reservedPackage.packageTotals?.incentive) || 0;
      const adultTotal = counts.Adult * Math.max(0, adultPrice - incentive);
      const childTotal = passengers.filter((p) => p.type === "Child").reduce((total, p) => {
        const price = p.childType === "withBed" ? childWithBedPrice - incentive : childWithoutBedPrice;
        return total + Math.max(0, price);
      }, 0);
      const infantTotal = counts.Infant * infantPrice;
      const totalPrice = adultTotal + childTotal + infantTotal;
      const umrahTitleMap = { MR: "Mr", MRS: "Mrs", MS: "Ms", MISS: "Miss", DR: "Dr", MASTER: "Master", CHILD: "Child", CHD: "Child", INF: "INF", BABY: "Baby" };
      const umrahPassengers = passengers.map((passenger) => ({
        ...passenger,
        title: umrahTitleMap[String(passenger.title).toUpperCase()] || passenger.title,
      }));
      const bookingNumber = await nextUmrahBookingNumber();
      const booking = await UmrahPackageBooking.create({
        bookingNumber,
        packageId: String(reservedPackage._id), packageName: reservedPackage.packageName,
        packageSource: reservedPackage.packageSource, packageData: presentUmrahPackage((await withLiveFlights([reservedPackage]))[0]),
        user: String(req.user._id), roomType, passengers: umrahPassengers,
        pricing: { pricePerPerson: adultPrice, adultTotal, childTotal, infantTotal, totalPrice, currency: "PKR" },
        paymentStatus: { status: "Pending", totalAmount: totalPrice, paidAmount: 0, remainingAmount: totalPrice },
        overallStatus: "On Hold", expiresAt: await calculateBookingExpiresAt(new Date(), "local-db"),
        bookingChannel: "external_api", externalApiClientId: req.apiClient._id,
        inventoryDeducted: true,
      });
      await ActivityLog.create({ user: req.user._id, type: "External API Umrah Booking", refModel: "UmrahPackageBooking", refId: booking._id, description: `External API client ${req.apiClient.name} created Umrah booking "${booking.bookingNumber}"` }).catch(() => {});
      return res.status(201).json({ success: true, data: presentUmrahBooking(booking) });
    }

    const group = await GroupTicketing.findOneAndUpdate(
      { _id: inventoryId, internalStatus: "Public", totalSeats: { $gte: seats }, "flights.0.depDate": { $gte: startOfToday() } },
      { $inc: { totalSeats: -seats } },
      { new: true },
    );
    if (!group) return apiError(res, 409, "INSUFFICIENT_INVENTORY", "The group is unavailable or does not have enough seats.");
    reservedGroupId = group._id;

    const fares = {
      adult: group.price?.sellingAdultPriceB2B || 0,
      child: group.price?.sellingChildPriceB2B || 0,
      infant: group.price?.sellingInfantPriceB2B || 0,
    };
    const adultTotal = counts.Adult * fares.adult;
    const childTotal = counts.Child * fares.child;
    const infantTotal = counts.Infant * fares.infant;
    const firstFlight = group.flights?.[0];
    const lastFlight = group.flights?.[group.flights.length - 1];
    const booking = await Booking.create({
      groupId: String(group._id), groupType: group.groupType,
      airline: { name: group.airline || firstFlight?.airline || "Unknown" },
      sector: group.sector || `${firstFlight?.sectorFrom || ""}-${lastFlight?.sectorTo || ""}`,
      pnr: group.pnr || "", contactPersonName: contactPersonName.trim(),
      adultsCount: counts.Adult, childrenCount: counts.Child, infantsCount: counts.Infant,
      totalPassengers: passengers.length,
      pricing: { adultPrice: fares.adult, childPrice: fares.child, infantPrice: fares.infant, adultBasePrice: fares.adult, childBasePrice: fares.child, infantBasePrice: fares.infant, adultTotal, childTotal, infantTotal, grandTotal: adultTotal + childTotal + infantTotal },
      passengers,
      flights: group.flights.map((flight) => ({ flightNo: flight.flightNo, depDate: flight.depDate, depTime: flight.depTime, origin: flight.sectorFrom, destination: flight.sectorTo, arrDate: flight.arrDate, arrTime: flight.arrTime, baggage: flight.baggage, meal: flight.meal })),
      departureDate: firstFlight?.depDate || new Date(), arrivalDate: lastFlight?.arrDate,
      userId: req.user._id, status: "on hold", expiresAt: await calculateBookingExpiresAt(new Date(), "admin"), source: "admin",
      bookingChannel: "external_api", externalApiClientId: req.apiClient._id,
      inventoryDeducted: true,
    });
    await ActivityLog.create({ user: req.user._id, type: "External API Booking", refModel: "Booking", refId: booking._id, description: `External API client ${req.apiClient.name} created booking "${booking.bookingReference}"` }).catch(() => {});
    res.status(201).json({ success: true, data: presentBooking(booking) });
  } catch (error) {
    if (reservedGroupId) await GroupTicketing.updateOne({ _id: reservedGroupId }, { $inc: { totalSeats: seats } }).catch(() => {});
    if (reservedPackageId) await UmrahPackage.updateOne({ _id: reservedPackageId }, { $inc: { availableRooms: packageUnits } }).catch(() => {});
    next(error);
  }
};

export const listExternalBookings = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const fetchLimit = page * limit;
    const clientQuery = { externalApiClientId: req.apiClient._id };
    const [groupBookings, umrahBookings, groupTotal, umrahTotal] = await Promise.all([
      Booking.find(clientQuery).sort({ createdAt: -1 }).limit(fetchLimit).lean(),
      UmrahPackageBooking.find(clientQuery).sort({ createdAt: -1 }).limit(fetchLimit).lean(),
      Booking.countDocuments(clientQuery),
      UmrahPackageBooking.countDocuments(clientQuery),
    ]);
    const bookings = [
      ...groupBookings.map(presentBooking),
      ...umrahBookings.map(presentUmrahBooking),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice((page - 1) * limit, page * limit);
    const total = groupTotal + umrahTotal;
    res.json({
      success: true,
      data: bookings,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};

export const getExternalBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return apiError(res, 400, "INVALID_BOOKING_ID", "bookingId is invalid.");
    const [groupBooking, umrahBooking] = await Promise.all([
      Booking.findOne({ _id: req.params.id, externalApiClientId: req.apiClient._id }),
      UmrahPackageBooking.findOne({ _id: req.params.id, externalApiClientId: req.apiClient._id }),
    ]);
    if (groupBooking) return res.json({ success: true, data: presentBooking(groupBooking) });
    if (umrahBooking) return res.json({ success: true, data: presentUmrahBooking(umrahBooking) });
    return apiError(res, 404, "BOOKING_NOT_FOUND", "Booking not found.");
  } catch (error) { next(error); }
};

export const cancelExternalBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return apiError(res, 400, "INVALID_BOOKING_ID", "bookingId is invalid.");
    const umrahBooking = await UmrahPackageBooking.findOne({ _id: req.params.id, externalApiClientId: req.apiClient._id });
    if (umrahBooking) {
      let booking = umrahBooking;
      if (!booking) return apiError(res, 404, "BOOKING_NOT_FOUND", "Booking not found.");
      if (booking.overallStatus === "Cancelled") return res.json({ success: true, data: presentUmrahBooking(booking), meta: { alreadyCancelled: true } });
      if (booking.overallStatus !== "On Hold") return apiError(res, 409, "BOOKING_NOT_CANCELLABLE", "Only on-hold bookings can be cancelled through the API.");
      if (booking.inventoryDeducted) {
        const claimed = await UmrahPackageBooking.findOneAndUpdate(
          { _id: booking._id, overallStatus: "On Hold", inventoryDeducted: true },
          { $set: { overallStatus: "Cancelled", inventoryDeducted: false, expiresAt: null } },
          { new: true },
        );
        if (!claimed) {
          booking = await UmrahPackageBooking.findById(booking._id);
          return res.json({ success: true, data: presentUmrahBooking(booking), meta: { alreadyCancelled: true } });
        }
        booking = claimed;
        await UmrahPackage.updateOne({ _id: booking.packageId }, { $inc: { availableRooms: booking.passengerCount.total } });
      } else {
        booking.overallStatus = "Cancelled";
        booking.expiresAt = null;
        await booking.save();
      }
      return res.json({ success: true, data: presentUmrahBooking(booking) });
    }
    let booking = await Booking.findOne({ _id: req.params.id, externalApiClientId: req.apiClient._id });
    if (!booking) return apiError(res, 404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (booking.status === "cancelled") return res.json({ success: true, data: presentBooking(booking), meta: { alreadyCancelled: true } });
    if (booking.status !== "on hold") return apiError(res, 409, "BOOKING_NOT_CANCELLABLE", "Only on-hold bookings can be cancelled through the API.");
    if (booking.inventoryDeducted) {
      const claimed = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "on hold", inventoryDeducted: true },
        { $set: { status: "cancelled", inventoryDeducted: false, expiresAt: null, cancelledAt: new Date(), autoCancelled: false } },
        { new: true },
      );
      if (!claimed) {
        booking = await Booking.findById(booking._id);
        return res.json({ success: true, data: presentBooking(booking), meta: { alreadyCancelled: true } });
      }
      booking = claimed;
      await GroupTicketing.updateOne({ _id: booking.groupId }, { $inc: { totalSeats: booking.adultsCount + booking.childrenCount } });
    } else {
      booking.status = "cancelled";
      booking.expiresAt = null;
      booking.cancelledAt = new Date();
      booking.autoCancelled = false;
      await booking.save();
    }
    res.json({ success: true, data: presentBooking(booking) });
  } catch (error) { next(error); }
};
