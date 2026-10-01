import Payment from "../models/Payment.js";
import Register from "../models/Register.js";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import zipAccountsService from "../services/zipAccounts.service.js";
import GroupTicketing from "../models/umrahPackgemodel.js";
import GroupTicket from "../models/GroupTicketing.js";
import { calculateBookingExpiresAt } from "../utils/bookingHoldDuration.js";
import {
  restockUmrahPackageRooms,
  reserveUmrahPackageRooms,
} from "../utils/umrahPackageInventory.js";
import { bookUmrahTNT, getTNTUser } from "../utils/Travel-Network.js";
import { createUpSkyUmrahBooking, buildUpSkyUmrahBookingPayload } from "../utils/upskyUmrah.js";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import BookingCounter from "../models/BookingCounter.js";
import ActivityLog from "../models/activitylogs.js";

/* ===========================
   HELPER: Parse FormData fields with bracket notation
   Example: "pricing[pricePerPerson]" -> { pricing: { pricePerPerson: value }}
=========================== */
const parseFormData = (body) => {
  const parsed = {};

  for (const [key, value] of Object.entries(body)) {
    // Handle bracket notation like pricing[pricePerPerson]
    const match = key.match(/^(.+?)\[(.+?)\]$/);

    if (match) {
      const [, parentKey, childKey] = match;
      if (!parsed[parentKey]) parsed[parentKey] = {};
      parsed[parentKey][childKey] = value;
    } else {
      parsed[key] = value;
    }
  }

  return parsed;
};

/* ===========================
   HELPER: Parse passengers array from FormData
   Example: passengers[0][type] -> [{ type: value, ... }]
=========================== */
const parsePassengers = (body) => {
  // If multer/qs already parsed passengers into an array of objects, use it directly
  if (
    Array.isArray(body.passengers) &&
    body.passengers.length > 0 &&
    typeof body.passengers[0] === "object"
  ) {
    return body.passengers;
  }

  // If it's a JSON string, parse it
  if (typeof body.passengers === "string") {
    try {
      const parsed = JSON.parse(body.passengers);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
  }

  // Fallback: parse bracket notation keys manually (e.g. passengers[0][type])
  const passengersMap = {};
  for (const [key, value] of Object.entries(body)) {
    const match = key.match(/^passengers\[(\d+)\]\[(.+)\]$/);
    if (match) {
      const [, index, field] = match;
      const idx = parseInt(index, 10);
      if (!passengersMap[idx]) passengersMap[idx] = {};
      passengersMap[idx][field] = value;
    }
  }

  return Object.keys(passengersMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((idx) => passengersMap[idx]);
};

/* ===========================
   HELPER: Passenger type label for ledger/voucher descriptions
   Shows whether a Child passenger was booked w/ Bed or w/o Bed
=========================== */
const getPaxTypeLabel = (pax) =>
  pax.type === "Child"
    ? `Child ${pax.childType === "withBed" ? "w/ Bed" : "w/o Bed"}`
    : pax.type;

/* ===========================
   CREATE UMRAH PACKAGE BOOKING
   
   - "local-db": Locally managed packages (stored in MongoDB)
   
   Status updates work with booking data only, not package lookups.
=========================== */
export const createUmrahBooking = async (req, res) => {
  try {
    const parsedData = parseFormData(req.body);
    const passengers = parsePassengers(req.body);

    // Validate passengers exist
    if (!passengers || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No passengers found in request. Please add at least one passenger.",
      });
    }

    // Parse packageData JSON if it exists
    let packageData = parsedData.packageData;
    if (typeof packageData === "string") {
      try {
        packageData = JSON.parse(packageData);
      } catch (e) {
        console.error("Error parsing packageData:", e);
      }
    }

    // Generate sequential booking number
    const umrahCounter = await BookingCounter.findOneAndUpdate(
      { date: "umrah-global" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const bookingNumber = `UP-${String(umrahCounter.seq).padStart(4, "0")}`;

    // Get pricing from parsed data
    const pricing = parsedData.pricing || {};
    const totalPassengers = passengers?.length || 0;
    const adultCount = passengers.filter((p) => p.type === "Adult").length;
    const childCount = passengers.filter((p) => p.type === "Child").length;
    const infantCount = passengers.filter((p) => p.type === "Infant").length;

    const pricePerPerson = Number(pricing.pricePerPerson) || 0;
    const adultTotal =
      Number(pricing.adultTotal) || pricePerPerson * adultCount;
    const childTotal =
      Number(pricing.childTotal) || Number(pricing.childTotal) || 0;
    const infantTotal =
      Number(pricing.infantTotal) || Number(pricing.infantTotal) || 0;

    const incentive = Number(packageData?.packageTotals?.incentive) || 0;

    const calculatedTotal =
      Number(pricing.totalAmount) ||
      adultTotal + childTotal + infantTotal ||
      pricePerPerson * totalPassengers ||
      0;

    // Incentive applies only to adults and children with a bed. Child without
    // bed and infant package totals are stored without incentive.
    const incentiveEligiblePassengerCount = passengers.filter(
      (passenger) =>
        passenger.type === "Adult" ||
        (passenger.type === "Child" && passenger.childType === "withBed"),
    ).length;
    const totalPrice =
      calculatedTotal - incentive * incentiveEligiblePassengerCount;

    // Handle passport files — matched by index via field name passportFile_0, passportFile_1, etc.
    const uploadedFiles = req.files || [];
    const fileByIndex = {};
    uploadedFiles.forEach((f) => {
      const match = f.fieldname.match(/^passportFile_(\d+)$/);
      if (match) fileByIndex[parseInt(match[1], 10)] = f.path;
    });

    const passengersWithFiles = passengers.map((passenger, index) => ({
      ...passenger,
      documentUrl: fileByIndex[index] || null,
    }));

    const bookingSource = parsedData.packageSource || "local-db";
    const expiresAt = await calculateBookingExpiresAt(new Date(), bookingSource);

    const bookingData = {
      packageId: parsedData.packageId,
      packageName: parsedData.packageName,
      packageSource: parsedData.packageSource || "local-db",
      user: parsedData.user,
      roomType: parsedData.roomType,
      specialRequests: parsedData.specialRequests,
      passengers: passengersWithFiles,
      packageData: packageData,
      bookingNumber,
      pricing: {
        pricePerPerson,
        adultTotal,
        childTotal,
        infantTotal,
        currency: pricing.currency || "PKR",
        totalPrice: parseFloat(totalPrice),
      },
      paymentStatus: {
        status: "Pending",
        totalAmount: parseFloat(totalPrice),
        paidAmount: 0,
        remainingAmount: parseFloat(totalPrice),
        paymentHistory: [],
      },
      overallStatus: "On Hold",
      expiresAt,
    };

    // console.log(
    //   "Creating booking with data:",
    //   JSON.stringify(bookingData, null, 2),
    // );

    const booking = await UmrahPackageBooking.create(bookingData);

    // Reserve rooms for local packages on booking creation
    if (
      parsedData.packageSource !== "travel-network" &&
      parsedData.packageSource !== "upsky"
    ) {
      try {
        await reserveUmrahPackageRooms(booking);
      } catch (err) {
        await UmrahPackageBooking.findByIdAndDelete(booking._id);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    // Hit Travel Network booking API if package source is travel-network
    if (parsedData.packageSource === "travel-network" && packageData) {
      try {
        const bookingUser = await Register.findById(parsedData.user).select(
          "name email phone companyName",
        );

        const tntUser = await getTNTUser();

        const tntPayload = {
          group_id:
            packageData.tnt_group_id ??
            packageData.group_id ??
            packageData.groupId ??
            null,
          package_id:
            packageData.tnt_package_id ?? packageData.package_id ?? null,
          agency_info: {
            agency_name: bookingUser?.companyName || "",
            agent_name: bookingUser?.name || "",
            created_by_id:
              tntUser?.id ?? Number(process.env.TNT_CREATED_BY_ID) ?? null,
            email: bookingUser?.email || "",
            mobile: bookingUser?.phone || "",
            adults: passengers.filter((p) => p.type === "Adult").length,
            child: passengers.filter((p) => p.type === "Child").length,
            infant: passengers.filter((p) => p.type === "Infant").length,
            agent_notes: parsedData.specialRequests || "",
          },
          booking_details: passengers.map((p) => {
            // Map title to TNT expected format
            let title = p.title;

            if (p.type === "Adult") {
              // Adults should be MR, MRS, or MS
              const adultTitle = p.title?.toUpperCase() || "MR";
              title = ["MR", "MRS", "MS"].includes(adultTitle)
                ? adultTitle
                : "MR";
            } else if (p.type === "Child") {
              title = "CHD";
            } else if (p.type === "Infant") {
              // TNT expects "INF" for infants
              title = "INF";
            }

            return {
              type: p.type, // Keep original type: Adult, Child, Infant
              title: title,
              surname: p.surName,
              given_name: p.givenName,
              passport_no: p.passport,
              dob: p.dateOfBirth
                ? new Date(p.dateOfBirth).toISOString().split("T")[0]
                : p.dob,
              doe: p.passportExpiry
                ? new Date(p.passportExpiry).toISOString().split("T")[0]
                : p.doe,
            };
          }),
          umrah_package_price_plan: packageData.umrah_package_price_plan,
        };

        const tntResponse = await bookUmrahTNT(tntPayload);

        booking.travelNetworkBookingId =
          tntResponse?.data?.id?.toString() ||
          tntResponse?.id?.toString() ||
          null;
        booking.travelNetworkBookingRefNo =
          tntResponse?.data?.reference_no || tntResponse?.reference_no || null;
        booking.travelNetworkBookingData = tntResponse;
        booking.travelNetworkBookingCreatedAt = new Date();
        await booking.save();
      } catch (err) {
        // TNT booking failed — delete our local booking and return error
        await UmrahPackageBooking.findByIdAndDelete(booking._id);
        return res.status(400).json({
          success: false,
          message: `Travel Network booking failed: ${err.message}`,
        });
      }
    }

    // Hit Up Sky's umrah-packages booking API if package source is upsky
    if (parsedData.packageSource === "upsky" && packageData) {
      try {
        const bookingUser = await Register.findById(parsedData.user).select(
          "name email phone companyName",
        );

        const upskyPayload = buildUpSkyUmrahBookingPayload({
          upskyRaw: packageData.upskyRaw,
          passengers,
          roomType: parsedData.roomType,
          agentCode: process.env.UPSKY_AGENT_CODE,
          agentName: bookingUser?.companyName || bookingUser?.name || "",
          contactPhone: bookingUser?.phone || "",
        });

        const upskyResponse = await createUpSkyUmrahBooking(upskyPayload);

        if (upskyResponse?.status && upskyResponse.status !== "success") {
          throw new Error(upskyResponse?.message || "Up Sky booking request was rejected");
        }

        booking.upskyBookingId =
          upskyResponse?.data?.master?.booking_id?.toString() ||
          upskyResponse?.data?.booking_id?.toString() ||
          upskyResponse?.booking_id?.toString() ||
          null;
        booking.upskyBookingRefNo = upskyResponse?.data?.master?.pnr || null;
        booking.upskyBookingData = upskyResponse;
        booking.upskyBookingCreatedAt = new Date();
        await booking.save();
      } catch (err) {
        // Up Sky booking failed — delete our local booking and return error
        await UmrahPackageBooking.findByIdAndDelete(booking._id);
        return res.status(400).json({
          success: false,
          message: `Up Sky booking failed: ${err.message}`,
        });
      }
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" created for ${booking.passengers?.length || 0} passenger(s) - ${booking.packageName}`,
    });

    res.status(201).json({
      success: true,
      message: "Umrah package booking created successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Create Umrah Booking Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET ALL UMRAH BOOKINGS
=========================== */
export const getAllUmrahBookings = async (req, res) => {
  try {
    const { status, user, packageId } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.overallStatus = status;
    if (user) filter.user = user;
    if (packageId) filter.packageId = packageId;

    const bookings = await UmrahPackageBooking.find(filter)
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get All Umrah Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET MY BOOKINGS (USER)
=========================== */
export const getMyBookings = async (req, res) => {
  try {
    // First, get all bookings with user populated
    const bookings = await UmrahPackageBooking.find({
      user: req.user._id.toString(),
    })
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .lean() // Use lean for better performance
      .sort({ createdAt: -1 });

    // Separate local-db and travel-network bookings
    const localDbBookings = bookings.filter(
      (b) => b.packageSource === "local-db",
    );
    const travelNetworkBookings = bookings.filter(
      (b) => b.packageSource === "travel-network",
    );

    // Get package IDs from local-db bookings
    const localPackageIds = localDbBookings
      .map((b) => b.packageId)
      .filter((id) => id); // Remove null/undefined

    // Fetch all local packages in one query
    let localPackages = [];
    if (localPackageIds.length > 0) {
      localPackages = await GroupTicketing.find({
        _id: { $in: localPackageIds },
      })
        .select(
          "packageName packageTotals flights hotels transports visa rooms days availableRooms selectedGroupTicketId",
        )
        .lean();
    }

    // Create a map for quick lookup
    const packageMap = {};
    localPackages.forEach((pkg) => {
      packageMap[pkg._id.toString()] = pkg;
    });

    // Process all bookings
    const processedBookings = bookings.map((booking) => {
      if (booking.packageSource === "local-db") {
        // Replace packageId with populated data if found
        const packageId = booking.packageId?.toString();
        if (packageId && packageMap[packageId]) {
          booking.packageId = packageMap[packageId];
        } else {
          // If not found, keep as is or set to null
          booking.packageId = booking.packageId;
        }
      } else if (booking.packageSource !== "local-db") {
        // Keep the packageId as is for external packages (travel-network, upsky, ...)
        booking.isExternalPackage = true;
        booking.externalSource = booking.packageSource;
      }

      return booking;
    });

    res.status(200).json({
      success: true,
      count: processedBookings.length,
      data: processedBookings,
    });
  } catch (error) {
    console.error("Get My Bookings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   GET ALL BOOKINGS (ADMIN ONLY)
=========================== */
export const getAllBookingsAdmin = async (req, res) => {
  try {
    const { status, user, packageId, search } = req.query;
    // Build filter
    const filter = {};
    if (status) filter.overallStatus = status;
    if (user) filter.user = user;
    if (packageId) filter.packageId = packageId;
    if (search) {
      filter.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { packageName: { $regex: search, $options: "i" } },
      ];
    }

    // Get all bookings with user populated first
    let bookings = await UmrahPackageBooking.find(filter)
      .populate(
        "user",
        "name email phone role companyName agencyCode consultant",
      )
      .lean() // Use lean for better performance
      .sort({ createdAt: -1 });

    // Separate local-db and travel-network bookings
    const localDbBookings = bookings.filter(
      (b) => b.packageSource === "local-db",
    );
    const travelNetworkBookings = bookings.filter(
      (b) => b.packageSource === "travel-network",
    );

    // Get package IDs from local-db bookings
    const localPackageIds = localDbBookings
      .map((b) => b.packageId)
      .filter((id) => id); // Remove null/undefined

    // Fetch all local packages in one query
    let localPackages = [];
    if (localPackageIds.length > 0) {
      localPackages = await GroupTicketing.find({
        _id: { $in: localPackageIds },
      })
        .select(
          "packageName packageTotals flights hotels transports visa rooms days availableRooms selectedGroupTicketId",
        )
        .lean();
    }

    // Create a map for quick lookup
    const packageMap = {};
    localPackages.forEach((pkg) => {
      packageMap[pkg._id.toString()] = pkg;
    });

    // Process all bookings
    const processedBookings = bookings.map((booking) => {
      if (booking.packageSource === "local-db") {
        // Replace packageId with populated data if found
        const packageId = booking.packageId?.toString();
        if (packageId && packageMap[packageId]) {
          booking.packageId = packageMap[packageId];
        } else {
          // If not found, keep as is or set to null
          booking.packageId = booking.packageId;
        }
      } else if (booking.packageSource !== "local-db") {
        // Keep the packageId as is for external packages (travel-network, upsky, ...)
        booking.isExternalPackage = true;
        booking.externalSource = booking.packageSource;
        booking._externalPackageNote =
          "This package is from an external source. Please fetch details from external API.";
      }

      return booking;
    });

    res.status(200).json({
      success: true,
      count: processedBookings.length,
      data: processedBookings,
    });
  } catch (error) {
    console.error("Get All Bookings Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   SHARED BUYING-COST HELPERS (XO report + ledger voucher)
   Visa and hotel buying rates are PER PERSON and must scale with the number of
   passengers, exactly like the per-person selling price in packageTotals.
   Hotels are charged to adults (booked room type) and children with bed (shared
   room rate); children without bed and infants only carry ticket + visa.
=========================== */
const HOTEL_ROOM_FIELD_BY_ROOM_TYPE = {
  double: "doubleRoom",
  triple: "tripleRoom",
  quad: "quadRoom",
  sharing: "sharedRoom",
};

// Buying cost of ONE hotel for ONE person for the whole stay (PKR, rounded)
const getHotelBuyingPerPax = (hotel, roomField) => {
  const roomPricing = roomField ? hotel?.[roomField] : null;
  if (!roomPricing) return 0;
  const nightCount = hotel.nightCount || hotel.nights || 0;
  return Math.round(
    (roomPricing.buyingPrice || 0) * (roomPricing.buyingRoe || 1) * nightCount,
  );
};

// Which hotel room rate applies to a passenger (null = no hotel charged)
const getPaxHotelRoomField = (pax, bookingRoomType) => {
  if (pax.type === "Infant") return null;
  if (pax.type === "Child") {
    return pax.childType === "withBed" ? "sharedRoom" : null;
  }
  return HOTEL_ROOM_FIELD_BY_ROOM_TYPE[bookingRoomType] || null;
};

const getVisaBuyingPerPax = (visa) =>
  visa ? Math.round((visa.buyingPrice || 0) * (visa.buyingRoe || 1)) : 0;

/* ===========================
   XO REPORT — CONFIRMED UMRAH PACKAGE BOOKINGS
   Reports buying (supplier cost) vs selling (customer price) for confirmed
   Umrah Package bookings, mirroring the cost breakdown used to generate the
   ledger voucher when a booking is marked "Confirmed" (see updateOverallStatus).
=========================== */
export const getUmrahPackageXOReportData = async (req, res) => {
  try {
    const { fromDate, toDate, search } = req.query;

    const query = { overallStatus: "Confirmed" };

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { bookingNumber: searchRegex },
        { packageName: searchRegex },
        { "passengers.givenName": searchRegex },
        { "passengers.surName": searchRegex },
        { "passengers.passport": searchRegex },
      ];
    }

    // Agents/sub-users only ever see their own bookings; admins see everything.
    if (req.user.role !== "Super Admin" && req.user.role !== "Admin") {
      query.user = req.user._id.toString();
    }

    const bookings = await UmrahPackageBooking.find(query)
      .populate("user", "name email agencyCode companyName")
      .sort({ createdAt: -1 })
      .lean();

    // Batch-fetch linked local-db packages (visa/hotels/transports/packageTotals)
    const localPackageIds = bookings
      .filter((b) => b.packageSource === "local-db")
      .map((b) => b.packageId)
      .filter(Boolean);

    const localPackages = localPackageIds.length
      ? await GroupTicketing.find({ _id: { $in: localPackageIds } })
          .select(
            "packageName packageTotals flights hotels transports visa selectedGroupTicketId",
          )
          .lean()
      : [];

    const packageMap = {};
    localPackages.forEach((pkg) => {
      packageMap[pkg._id.toString()] = pkg;
    });

    // Batch-fetch group tickets referenced by those packages (ticket buying prices + supplier)
    const groupTicketIds = localPackages
      .map((pkg) => pkg.selectedGroupTicketId)
      .filter(Boolean);

    const groupTickets = groupTicketIds.length
      ? await GroupTicket.find({ _id: { $in: groupTicketIds } })
          .select("price user pnr flights airline")
          .populate("user", "name")
          .lean()
      : [];

    const ticketMap = {};
    groupTickets.forEach((t) => {
      ticketMap[t._id.toString()] = t;
    });

    const roomTypeKeyMap = { double: "double", triple: "triple", quad: "quad", sharing: "shared" };

    let rows = bookings.map((booking) => {
      const passengers = booking.passengers || [];
      const isExternal = booking.packageSource !== "local-db";
      const pkg = !isExternal ? packageMap[booking.packageId?.toString()] : null;

      let flights = [];
      let sector = "N/A";
      let airlineName = "N/A";
      let supplierName = "N/A";
      let pnr = "N/A";
      let totalBuying = 0;
      let totalSelling = 0;
      let totalDiscount = 0;

      if (isExternal) {
        supplierName = booking.packageSource === "upsky" ? "Up Sky" : "Travel Network";
        pnr = booking.travelNetworkBookingRefNo || booking.upskyBookingRefNo || "N/A";

        if (Array.isArray(booking.packageData?.flights)) {
          flights = booking.packageData.flights.map((f) => ({
            flightNo: f.flightNo,
            depDate: f.depDate,
            depTime: f.depTime,
            arrDate: f.arrDate,
            arrTime: f.arrTime,
            origin: f.sectorFrom || f.origin,
            destination: f.sectorTo || f.destination,
          }));
          airlineName = booking.packageData?.airlineName || booking.packageData?.airline || "N/A";
        } else if (booking.flightDetails?.departure) {
          flights = [
            {
              flightNo: booking.flightDetails.departure.flightNumber,
              depDate: booking.flightDetails.departure.date,
              origin: booking.flightDetails.departure.from,
              destination: booking.flightDetails.departure.to,
            },
          ];
        }

        if (flights.length) {
          sector = `${flights[0].origin || "?"}-${flights[flights.length - 1].destination || "?"}`;
        }

        const pricePerPerson = Math.round(booking.pricing?.pricePerPerson || 0);
        passengers.forEach((pax) => {
          totalSelling += pricePerPerson;
          totalDiscount += Math.min(Math.max(0, Number(pax.discount) || 0), pricePerPerson);
        });
        const netSellingExternal = totalSelling - totalDiscount;
        totalBuying = Math.max(
          0,
          netSellingExternal - Math.max(0, Number(booking.supplierDiscount) || 0),
        );
      } else if (pkg) {
        const packageTotals = pkg.packageTotals || {};
        const incentive = packageTotals.incentive || 0;
        const roomKey = roomTypeKeyMap[booking.roomType] || booking.roomType;

        const adultSellingPerPax = Math.round((packageTotals[roomKey] || 0) - incentive);
        const childWithoutBedSellingPerPax = Math.round(packageTotals.childWithoutBed || 0);
        const childWithBedSellingPerPax = Math.round((packageTotals.childWithBed || 0) - incentive);
        const infantSellingPerPax = Math.round(packageTotals.infant || 0);

        const getSellingPrice = (pax) => {
          if (pax.type === "Child") {
            return pax.childType === "withBed"
              ? childWithBedSellingPerPax
              : childWithoutBedSellingPerPax;
          }
          if (pax.type === "Infant") return infantSellingPerPax;
          return adultSellingPerPax;
        };

        passengers.forEach((pax) => {
          const baseSelling = getSellingPrice(pax);
          // Discount can never exceed what the passenger was charged
          const discount = Math.min(Math.max(0, Number(pax.discount) || 0), baseSelling);
          totalSelling += baseSelling;
          totalDiscount += discount;
        });

        // BUYING — built per passenger, mirroring exactly what the selling price
        // (packageTotals) charges that passenger:
        //   Adult              -> ticket + hotels (booked room type) + visa
        //   Child with bed     -> child ticket + hotels (shared room rate) + visa
        //   Child without bed  -> child ticket + visa
        //   Infant             -> infant ticket + visa
        // Visa and hotel rates are per person (hotel room rates are already the
        // per-person share of the room), so they must scale with passenger count.
        // Transports carry no price in the package schema and are not part of the
        // selling price, so they contribute no cost here (supplier name only).
        const supplierNames = new Set();

        const visaBuyingPerPax = getVisaBuyingPerPax(pkg.visa);
        if (pkg.visa?.supplier?.name) supplierNames.add(pkg.visa.supplier.name);

        const hotelBuyingPerPax = (roomField) =>
          (pkg.hotels || []).reduce(
            (sum, hotel) => sum + getHotelBuyingPerPax(hotel, roomField),
            0,
          );
        (pkg.hotels || []).forEach((hotel) => {
          if (hotel.supplier?.name) supplierNames.add(hotel.supplier.name);
        });
        (pkg.transports || []).forEach((transport) => {
          if (transport.supplier?.name) supplierNames.add(transport.supplier.name);
        });

        const adultHotelBuying = hotelBuyingPerPax(
          HOTEL_ROOM_FIELD_BY_ROOM_TYPE[booking.roomType],
        );
        const childWithBedHotelBuying = hotelBuyingPerPax("sharedRoom");

        const ticket = pkg.selectedGroupTicketId
          ? ticketMap[pkg.selectedGroupTicketId.toString()]
          : null;
        const buyingAdult = ticket?.price?.buyingAdultPrice || 0;
        const buyingChild = ticket?.price?.buyingChildPrice || 0;
        const buyingInfant = ticket?.price?.buyingInfantPrice || 0;
        if (ticket) {
          if (ticket.user?.name) supplierNames.add(ticket.user.name);
          if (ticket.pnr) pnr = ticket.pnr;
        }

        passengers.forEach((pax) => {
          if (pax.type === "Child") {
            totalBuying +=
              buyingChild +
              visaBuyingPerPax +
              (pax.childType === "withBed" ? childWithBedHotelBuying : 0);
          } else if (pax.type === "Infant") {
            totalBuying += buyingInfant + visaBuyingPerPax;
          } else {
            totalBuying += buyingAdult + visaBuyingPerPax + adultHotelBuying;
          }
        });

        supplierName = supplierNames.size
          ? supplierNames.size <= 2
            ? [...supplierNames].join(", ")
            : "Multiple Suppliers"
          : "N/A";

        // Prefer the live group ticket's flights over the package's saved copy
        const liveFlights = ticket?.flights?.length ? ticket.flights : pkg.flights;
        flights = (liveFlights || []).map((f) => ({
          flightNo: f.flightNo,
          depDate: f.depDate,
          depTime: f.depTime,
          arrDate: f.arrDate,
          arrTime: f.arrTime,
          origin: f.sectorFrom,
          destination: f.sectorTo,
        }));
        if (flights.length) {
          sector = `${flights[0].origin || "?"}-${flights[flights.length - 1].destination || "?"}`;
          airlineName = liveFlights?.[0]?.airline || "N/A";
        }
      }

      const netSelling = totalSelling - totalDiscount;
      const profit = netSelling - totalBuying;

      const agencyName = booking.user
        ? booking.user.companyName || booking.user.name
        : "N/A";

      return {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        pnr,
        packageName: booking.packageName,
        packageSource: booking.packageSource,
        roomType: booking.roomType,
        supplierName,
        agencyName,
        sector,
        airline: airlineName,
        flights,
        passengers,
        adultsCount: booking.passengerCount?.adults || 0,
        childrenCount: booking.passengerCount?.children || 0,
        infantsCount: booking.passengerCount?.infants || 0,
        totalPassengers: booking.passengerCount?.total || passengers.length,
        currency: booking.pricing?.currency || "PKR",
        totalBuying,
        totalSelling,
        totalDiscount,
        netSelling,
        profit,
        createdAt: booking.createdAt,
      };
    });

    const { sector, airline, supplier } = req.query;
    if (sector && sector.trim()) rows = rows.filter((r) => r.sector === sector.trim());
    if (airline && airline.trim()) rows = rows.filter((r) => r.airline === airline.trim());
    if (supplier && supplier.trim()) rows = rows.filter((r) => r.supplierName === supplier.trim());

    const summary = rows.reduce(
      (acc, r) => {
        acc.totalBookings += 1;
        acc.totalPassengers += r.totalPassengers || 0;
        acc.totalBuying += r.totalBuying || 0;
        acc.totalSelling += r.netSelling || 0;
        acc.totalProfit += r.profit || 0;
        return acc;
      },
      {
        totalBookings: 0,
        totalPassengers: 0,
        totalBuying: 0,
        totalSelling: 0,
        totalProfit: 0,
      },
    );

    res.json({ success: true, data: rows, summary });
  } catch (err) {
    console.error("Error generating Umrah Package XO report:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate Umrah Package XO report" });
  }
};

/* ===========================
   GET SINGLE UMRAH BOOKING BY ID
=========================== */
export const getUmrahBookingById = async (req, res) => {
  try {
    console.log("hit");
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get Umrah Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE UMRAH BOOKING
=========================== */
export const updateUmrahBooking = async (req, res) => {
  try {
    // If updating passengers, recalculate total price
    if (req.body.passengers || req.body.pricing?.pricePerPerson) {
      const booking = await UmrahPackageBooking.findById(req.params.id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Umrah booking not found",
        });
      }

      const passengers = req.body.passengers || booking.passengers;
      const pricePerPerson =
        req.body.pricing?.pricePerPerson || booking.pricing.pricePerPerson;
      const totalPrice = pricePerPerson * passengers.length;

      req.body.pricing = {
        ...booking.pricing,
        ...req.body.pricing,
        totalPrice,
      };

      // Update payment status total amount if needed
      if (req.body.paymentStatus) {
        req.body.paymentStatus.totalAmount = totalPrice;
      } else {
        req.body.paymentStatus = {
          ...booking.paymentStatus,
          totalAmount: totalPrice,
        };
      }
    }

    const booking = await UmrahPackageBooking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" updated`,
    });

    res.status(200).json({
      success: true,
      message: "Umrah booking updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Umrah Booking Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   DELETE UMRAH BOOKING
=========================== */
export const deleteUmrahBooking = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      description: `Umrah booking "${booking.bookingNumber}" deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Umrah booking deleted successfully",
    });
  } catch (error) {
    console.error("Delete Umrah Booking Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   SUBMIT PAYMENT (AGENT/USER)
   Agent/User submits payment - MUST be full amount
=========================== */
export const submitPayment = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // Verify user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only submit payments for your own bookings",
      });
    }

    if (booking.overallStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This booking is cancelled and cannot accept payments",
      });
    }

    if (
      ["On Hold", "Pending"].includes(booking.overallStatus) &&
      booking.expiresAt &&
      booking.expiresAt <= new Date()
    ) {
      booking.overallStatus = "Cancelled";
      booking.expiresAt = null;
      await restockUmrahPackageRooms(booking);
      await booking.save();

      return res.status(400).json({
        success: false,
        message: "This booking hold has expired",
      });
    }

    // Allow multiple payments - only check if there's a pending payment
    const hasPendingPayment = booking.paymentStatus.paymentHistory?.some(
      (payment) => payment.paymentStatus === "Pending",
    );

    if (hasPendingPayment) {
      return res.status(400).json({
        success: false,
        message:
          "Please wait for current payment to be reviewed before submitting another",
      });
    }

    const { amount, method, receiptNumber, notes, bankAccountId } = req.body;

    if (!amount || !method) {
      return res.status(400).json({
        success: false,
        message: "Amount and payment method are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Receipt file is required",
      });
    }

    const submittedAmount = parseFloat(amount);
    const remainingAmount = booking.paymentStatus.remainingAmount;

    // Allow partial or full payments (up to remaining amount)
    if (submittedAmount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount cannot exceed remaining amount of PKR ${remainingAmount.toLocaleString()}`,
      });
    }

    if (submittedAmount < 1) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be at least PKR 1",
      });
    }

    // Create new payment history item
    const newPayment = {
      amount: submittedAmount,
      method: method,
      paymentDate: new Date(),
      receiptNumber: receiptNumber || "",
      receiptFile: req.file.path, // Cloudinary URL
      notes: notes || "",
      paymentStatus: "Pending", // Admin needs to review
      submittedBy: req.user._id.toString(),
      bank: bankAccountId,
    };

    // Add to payment history
    if (!booking.paymentStatus.paymentHistory) {
      booking.paymentStatus.paymentHistory = [];
    }
    booking.paymentStatus.paymentHistory.push(newPayment);

    // Update overall payment status to Pending
    booking.paymentStatus.status = "Pending";

    await booking.save();

    // Now create a payment voucher entry for ledger hitting
    // Now create a payment voucher entry for ledger hitting
    const paymentVoucher = await Payment.create({
      umrahPkgBooking: booking._id,
      booking: null,

      user: booking.user,

      amount: submittedAmount,

      status: "Un Posted",

      date: new Date(),

      description: `Payment for Umrah Package Booking: ${booking.bookingNumber} - ${booking.packageName}`,

      // Receipt
      receipt: req.file.path,
      receiptPublicId: req.file.filename || null,

      // Optional Fields
      remarks: notes || "",

      // Optional custom fields
      paymentMethod: method,
      referenceNumber: receiptNumber || "",

      // If bank account exists
      bankAccount: booking.bankAccount || null,
    });

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Payment of ${submittedAmount} submitted for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Payment submitted successfully. Waiting for admin review.",
      data: booking,
    });
  } catch (error) {
    console.error("Submit Payment Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   REVIEW PAYMENT (ADMIN ONLY)
   Admin reviews single payment and updates status
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
=========================== */
export const reviewPayment = async (req, res) => {
  try {
    const { paymentId } = req.params; // This is actually bookingId now
    const { paymentStatus, rejectionReason } = req.body;

    // Find booking by ID
    const booking = await UmrahPackageBooking.findById(paymentId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if payment has been submitted (check payment history)
    const pendingPayment = booking.paymentStatus.paymentHistory?.find(
      (payment) => payment.paymentStatus === "Pending",
    );

    if (!pendingPayment) {
      return res.status(400).json({
        success: false,
        message: "No pending payment found for this booking",
      });
    }

    // Validate status
    if (!["Pending", "Approved", "Rejected"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    // Check rejection reason if status is Rejected
    if (paymentStatus === "Rejected" && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required when rejecting payment",
      });
    }

    // Update the pending payment in history
    pendingPayment.paymentStatus = paymentStatus;
    pendingPayment.reviewedBy = req.user._id.toString();
    pendingPayment.reviewedAt = new Date();

    if (paymentStatus === "Rejected") {
      pendingPayment.rejectionReason = rejectionReason;
      // Reset overall status back to On Hold if payment rejected
      booking.overallStatus = "On Hold";
      const bookingSource = booking.packageSource || "local-db";
      booking.expiresAt = await calculateBookingExpiresAt(new Date(), bookingSource);
      booking.paymentStatus.status = "Pending";
    }

    // If approved, add proof file and update overall status
    if (paymentStatus === "Approved") {
      if (req.file) {
        pendingPayment.approvalProofFile = req.file.path; // Cloudinary URL
      }

      // Update paid amount and remaining amount
      booking.paymentStatus.paidAmount += pendingPayment.amount;
      booking.paymentStatus.remainingAmount =
        booking.paymentStatus.totalAmount - booking.paymentStatus.paidAmount;

      // Update overall payment status to Approved (always, even if partial)
      booking.paymentStatus.status = "Approved";

      // Update overall booking status to In Progress when payment approved
      if (["On Hold", "Pending"].includes(booking.overallStatus)) {
        booking.overallStatus = "In Progress";
      }

      booking.expiresAt = null;

      // update the payment voucher with status posted
      await Payment.updateOne(
        { umrahPkgBooking: booking._id, status: "Un Posted" },
        { status: "Posted" },
      );

      // =========================
      // ZIP ACCOUNT LEDGER ENTRY
      // =========================

      // Get user
      const user = await Register.findById(booking.user);

      if (!user?.zipId) {
        throw new Error("User ZIP account ID not found");
      }

      // Get bank ID from payment history item
      const bankAccountId = pendingPayment.bank;

      if (!bankAccountId) {
        throw new Error("Bank account not found in payment");
      }

      const customerAccountId = user.zipId;

      const amount = pendingPayment.amount;

      const date = new Date().toISOString().split("T")[0];

      const description = `Umrah Payment - ${booking.bookingNumber} - ${booking.packageName}`;

      const rows = [
        // BANK DEBIT
        {
          account: bankAccountId,
          debit: amount,
          credit: 0,
          description,
        },

        // CUSTOMER CREDIT
        {
          account: customerAccountId,
          debit: 0,
          credit: amount,
          description,
        },
      ];

      const voucherData = {
        type: "journalPortal",
        date,
        transactions: rows.map((txn, index) => ({
          metadata: { id: index },
          account: txn.account,
          description: txn.description,
          credit: txn.credit,
          debit: txn.debit,
        })),
      };

      // Create ZIP voucher
      const response = await zipAccountsService.createVoucher(voucherData);
    }

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Payment ${paymentStatus.toLowerCase()} for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: `Payment ${paymentStatus.toLowerCase()} successfully`,
      data: booking,
    });
  } catch (error) {
    console.error("Review Payment Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE VISA STATUS
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
   Visa can be updated anytime (no payment dependency).
=========================== */
export const updateVisaStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // No payment dependency - visa can be updated anytime

    const updateData = {
      ...booking.visaStatus,
      ...req.body,
    };

    // Add approval document if file uploaded
    if (req.file) {
      updateData.approvalDocument = req.file.path; // Cloudinary URL
    }

    booking.visaStatus = updateData;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Visa status updated to "${booking.visaStatus?.status}" for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Visa status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Visa Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE HOTEL STATUS
=========================== */
/* ===========================
   UPDATE HOTEL STATUS
   
   NOTE: This function works with booking data only.
   No package lookup required - booking stores all needed info.
   Checks visa dependency before allowing hotel updates.
=========================== */
export const updateHotelStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // const linkedPackage = await GroupTicketing.findById(booking.packageId);

    // if (!linkedPackage) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Linked package not found",
    //   });
    // }

    // =========================================
    // VISA MUST BE APPROVED FIRST
    // =========================================

    if (booking.visaStatus.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Cannot update hotel status. Visa must be approved first.",
      });
    }

    // =========================================
    // UPDATE HOTEL STATUS
    // =========================================

    const updateData = {
      ...booking.hotelStatus,
      ...req.body,
    };

    if (req.file) {
      updateData.confirmationDocument = req.file.path;
    }

    booking.hotelStatus = updateData;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Hotel status updated to "${booking.hotelStatus?.status}" for Umrah booking "${booking.bookingNumber}"`,
    });

    return res.status(200).json({
      success: true,
      message: "Hotel status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Hotel Status Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE VOUCHER STATUS
=========================== */
export const updateVoucherStatus = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    booking.voucherStatus = {
      ...booking.voucherStatus,
      ...req.body,
    };

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Voucher status updated for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Voucher status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Voucher Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   EXTEND UMRAH BOOKING HOLD
=========================== */
export const extendUmrahBookingHold = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id).populate(
      "user",
      "name email phone role companyName agencyCode consultant",
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    if (!["On Hold", "Pending"].includes(booking.overallStatus)) {
      return res.status(400).json({
        success: false,
        message: "Only on-hold Umrah bookings can be extended",
      });
    }

    const holdMinutes = Number(req.body.holdMinutes);
    if (!Number.isFinite(holdMinutes) || holdMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Hold duration must be greater than zero",
      });
    }

    booking.overallStatus = "On Hold";
    booking.expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" hold extended by ${holdMinutes} minute(s)`,
    });

    res.status(200).json({
      success: true,
      message: "Umrah booking hold updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Extend Umrah Booking Hold Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE OVERALL STATUS
   get linked package whose booking was made
   hit on zip accounts ledger entries (multiple entries for all pax)
   all hotel , visa , ticket , transport supplier are credited
   customer is debited
   umrah income is debited or credited
=========================== */
export const updateOverallStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    const oldStatus = booking.overallStatus;

    // =========================================
    // DETERMINE BOOKING SOURCE
    // =========================================
    const packageSource = booking.packageSource || "local-db";
    const isTravelNetwork = packageSource === "travel-network";
    const isUpSky = packageSource === "upsky";
    const isExternalPackage = isTravelNetwork || isUpSky;

    // =========================================
    // GET LINKED PACKAGE (only for locally-managed bookings)
    // =========================================
    const linkedPackage = isExternalPackage
      ? null
      : await GroupTicketing.findById(booking.packageId);

    if (!isExternalPackage && !linkedPackage) {
      return res.status(404).json({
        success: false,
        message: "Linked package not found",
      });
    }

    // Reopening a cancelled booking should reserve inventory before any new
    // ledger voucher is created.
    // if (oldStatus === "Cancelled" && status !== "Cancelled") {
    //   await reserveUmrahPackageRooms(booking);
    // }

    // =========================================
    // CREATE VOUCHER WHEN STATUS CHANGES TO "Confirmed"
    // =========================================
    if (oldStatus !== "Confirmed" && status === "Confirmed") {
      // =========================================
      // CUSTOMER ACCOUNT
      // =========================================
      const user = await Register.findById(booking.user);

      if (!user?.zipId) {
        throw new Error("User ZIP account ID not found");
      }

      const customerAccountId = user.zipId;

      // =========================================
      // FETCH ZIP ACCOUNTS
      // =========================================
      const accountsData = await zipAccountsService.getAllAccounts();
      const accounts = Array.isArray(accountsData)
        ? accountsData
        : accountsData.results || [];

      // =========================================
      // FIND UMRAH INCOME ACCOUNT
      // =========================================
      const umrahIncomeAcc = accounts.find(
        (acc) => acc.account_name === "Umrah Income",
      );

      if (!umrahIncomeAcc) {
        throw new Error('"Umrah Income" account not found');
      }

      const umrahIncomeAccountId = umrahIncomeAcc._id;

      // =========================================
      // EXTERNAL SUPPLIER (TRAVEL NETWORK / UP SKY): SIMPLIFIED VOUCHER
      // Cost = totalSellingPrice - supplierDiscount
      // Supplier account is credited for that cost
      // Profit = supplierDiscount (remainder goes to Umrah Income)
      // =========================================
      if (isTravelNetwork || isUpSky) {
        const supplierAccountName = isTravelNetwork ? "Travel Network" : "Up Sky";
        const supplierLabel = isTravelNetwork ? "Travel Network" : "Up Sky";

        const supplierAcc = accounts.find(
          (acc) => acc.account_name === supplierAccountName,
        );

        if (!supplierAcc) {
          throw new Error(
            `"${supplierAccountName}" supplier account not found in ZIP Accounts`,
          );
        }

        const supplierAccountId = supplierAcc._id;
        const supplierDiscount = Math.max(0, Number(req.body.supplierDiscount) || 0);

        // Persist the supplier discount on the booking document
        booking.supplierDiscount = supplierDiscount;

        const passengers = booking.passengers || [];
        const rows = [];
        let totalSellingPrice = 0;

        // CUSTOMER DEBIT — ONE ROW PER PAX
        passengers.forEach((pax) => {
          const paxName =
            `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
          const description = `Umrah Package (${supplierLabel}), ${paxName} (${getPaxTypeLabel(pax)}) - ${booking.bookingNumber}`;
          const baseSellingPrice = Math.round(
            (booking.pricing?.pricePerPerson || 0),
          );
          const discount = Math.max(0, Number(pax.discount) || 0);
          const debitAmount = Math.max(0, baseSellingPrice - discount);
          totalSellingPrice += debitAmount;

          rows.push({
            account: customerAccountId,
            debit: debitAmount,
            credit: 0,
            description,
          });
        });

        // SUPPLIER CREDIT
        // Cost = totalSellingPrice - supplierDiscount
        const supplierCost = Math.max(0, totalSellingPrice - supplierDiscount);

        if (supplierCost > 0) {
          rows.push({
            account: supplierAccountId,
            debit: 0,
            credit: supplierCost,
            description: `${supplierLabel} Expense - ${booking.bookingNumber}`,
          });
        }

        // PROFIT ENTRY (= supplierDiscount, i.e. what we earn after paying supplier)
        const profitOrLoss = totalSellingPrice - supplierCost;

        if (profitOrLoss > 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: 0,
            credit: profitOrLoss,
            description: `Umrah Profit (${supplierLabel}) - ${booking.bookingNumber}`,
          });
        }

        if (profitOrLoss < 0) {
          rows.push({
            account: umrahIncomeAccountId,
            debit: Math.abs(profitOrLoss),
            credit: 0,
            description: `Umrah Loss (${supplierLabel}) - ${booking.bookingNumber}`,
          });
        }

        // BALANCE CHECK
        const totalDebit = rows.reduce((sum, row) => sum + (row.debit || 0), 0);
        const totalCredit = rows.reduce((sum, row) => sum + (row.credit || 0), 0);

        if (totalDebit !== totalCredit) {
          throw new Error(
            `Voucher is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
          );
        }

        // CREATE ZIP VOUCHER
        const voucherData = {
          type: "journalPortal",
          date: new Date().toISOString().split("T")[0],
          transactions: rows.map((txn, index) => ({
            metadata: { id: index },
            account: txn.account,
            description: txn.description,
            debit: txn.debit,
            credit: txn.credit,
          })),
        };

        const response =
          await zipAccountsService.createUnpostedVoucher(voucherData);

        const createdVoucherId = response?.newVoucher?._id;
        if (createdVoucherId) {
          booking.voucherStatus = booking.voucherStatus || {};
          booking.voucherStatus.zipVoucherId = String(createdVoucherId);
          booking.voucherStatus.zipVoucherCreatedAt = new Date();
        }
      } else {
        // =========================================
        // LOCAL-DB: FULL COST BREAKDOWN VOUCHER
        // =========================================

        // =========================================
        // SELLING PRICES (from packageTotals, incentive deducted per pax)
        // =========================================
        const packageTotals = linkedPackage.packageTotals || {};
        const incentive = packageTotals.incentive || 0;

      const roomTypeKeyMap = {
        double: "double",
        triple: "triple",
        quad: "quad",
        sharing: "shared",
      };
      const roomKey = roomTypeKeyMap[booking.roomType] || booking.roomType;

      const adultSellingPerPax = Math.round(
        (packageTotals[roomKey] || 0) - incentive,
      );
      const childWithoutBedSellingPerPax = Math.round(
        packageTotals.childWithoutBed || 0,
      );
      const childWithBedSellingPerPax = Math.round(
        (packageTotals.childWithBed || 0) - incentive,
      );
      const infantSellingPerPax = Math.round(
        packageTotals.infant || 0,
      );

      const getSellingPrice = (pax) => {
        if (pax.type === "Child") {
          return pax.childType === "withBed"
            ? childWithBedSellingPerPax
            : childWithoutBedSellingPerPax;
        }
        if (pax.type === "Infant") return infantSellingPerPax;
        return adultSellingPerPax;
      };

      // =========================================
      // FLIGHT INFO FOR DESCRIPTION
      // =========================================
      let liveTicketFlights = null;
      if (linkedPackage.selectedGroupTicketId) {
        const ticketForFlights = await GroupTicket.findById(
          linkedPackage.selectedGroupTicketId,
        ).select("flights");
        if (ticketForFlights?.flights?.length) {
          liveTicketFlights = ticketForFlights.flights;
        }
      }
      const firstFlight =
        (liveTicketFlights || linkedPackage.flights)?.[0] || {};
      const travelDate = firstFlight.depDate
        ? new Date(firstFlight.depDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "N/A";
      const sector =
        firstFlight.sectorFrom && firstFlight.sectorTo
          ? `${firstFlight.sectorFrom}-${firstFlight.sectorTo}`
          : "N/A";

      let pnr = "N/A";
      if (linkedPackage.selectedGroupTicketId) {
        const ticketForPnr = await GroupTicket.findById(
          linkedPackage.selectedGroupTicketId,
        ).select("pnr");
        if (ticketForPnr?.pnr) pnr = ticketForPnr.pnr;
      }

      // =========================================
      // CALCULATIONS & BUILD VOUCHER ROWS
      // =========================================
      const passengers = booking.passengers || [];
      let totalSellingPrice = 0;
      let totalCost = 0;
      const rows = [];

      // CUSTOMER DEBIT — ONE ROW PER PAX
      passengers.forEach((pax) => {
        const paxName =
          `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
        const description = `Umrah Package, ${paxName} (${getPaxTypeLabel(pax)}), ${travelDate}, ${pnr} & ${sector}`;
        const baseSellingPrice = getSellingPrice(pax);
        const discount = Math.max(0, Number(pax.discount) || 0);
        const debitAmount = Math.max(0, baseSellingPrice - discount);
        totalSellingPrice += debitAmount;

        rows.push({
          account: customerAccountId,
          debit: debitAmount,
          credit: 0,
          description,
        });
      });

      // VISA CREDIT ENTRY — visa buying rate is per person, so charge every pax
      if (linkedPackage.visa && passengers.length > 0) {
        const visaSupplierId = linkedPackage.visa?.supplier?._id;
        const visaCostPerPax = getVisaBuyingPerPax(linkedPackage.visa);
        const visaCost = visaCostPerPax * passengers.length;

        if (visaSupplierId && visaCost > 0) {
          totalCost += visaCost;
          rows.push({
            account: visaSupplierId,
            debit: 0,
            credit: visaCost,
            description: `Visa Expense (${passengers.length} pax x ${visaCostPerPax}) - ${booking.bookingNumber}`,
          });
        }
      }

      // HOTEL CREDIT ENTRIES — hotel buying rates are per person (per-person share
      // of the room), so charge every pax that gets a hotel: adults at the booked
      // room type and children with bed at the shared rate. Children without bed
      // and infants carry no hotel (their selling price has none either).
      if (Array.isArray(linkedPackage.hotels)) {
        linkedPackage.hotels.forEach((hotel) => {
          const supplierId = hotel?.supplier?._id;
          let hotelCost = 0;
          let hotelPaxCount = 0;

          passengers.forEach((pax) => {
            const roomField = getPaxHotelRoomField(pax, booking.roomType);
            const paxHotelCost = getHotelBuyingPerPax(hotel, roomField);
            if (paxHotelCost > 0) {
              hotelCost += paxHotelCost;
              hotelPaxCount += 1;
            }
          });

          if (supplierId && hotelCost > 0) {
            totalCost += hotelCost;
            rows.push({
              account: supplierId,
              debit: 0,
              credit: hotelCost,
              description: `Hotel Expense (${hotelPaxCount} pax) - ${hotel.name} - ${booking.bookingNumber}`,
            });
          }
        });
      }

      // TRANSPORT CREDIT ENTRIES
      if (Array.isArray(linkedPackage.transports)) {
        linkedPackage.transports.forEach((transport) => {
          const supplierId = transport?.supplier?._id;
          const transportCost = Math.round(
            (transport.buyingPrice || 0) * (transport.buyingRoe || 1),
          );

          if (supplierId && transportCost > 0) {
            totalCost += transportCost;
            rows.push({
              account: supplierId,
              debit: 0,
              credit: transportCost,
              description: `Transport Expense - ${transport.route} - ${booking.bookingNumber}`,
            });
          }
        });
      }

      // GROUP TICKET CREDIT ENTRY + DECREMENT SEATS
      if (linkedPackage.selectedGroupTicketId) {
        const ticket = await GroupTicket.findById(
          linkedPackage.selectedGroupTicketId,
        );

        if (ticket) {
          const supplierId = ticket?.user?._id;
          const buyingAdult = ticket?.price?.buyingAdultPrice || 0;
          const buyingChild = ticket?.price?.buyingChildPrice || 0;
          const buyingInfant = ticket?.price?.buyingInfantPrice || 0;

          const getTicketBuyingPrice = (type) => {
            if (type === "Child") return buyingChild;
            if (type === "Infant") return buyingInfant;
            return buyingAdult;
          };

          let ticketTotalCost = 0;

          if (supplierId) {
            passengers.forEach((pax) => {
              const paxName =
                `${pax.title || ""} ${pax.givenName || ""} ${pax.surName || ""}`.trim();
              const paxCost = getTicketBuyingPrice(pax.type);

              if (paxCost > 0) {
                ticketTotalCost += paxCost;
                rows.push({
                  account: supplierId,
                  debit: 0,
                  credit: paxCost,
                  description: `Ticket Expense - ${paxName} (${getPaxTypeLabel(pax)}) - ${booking.bookingNumber}`,
                });
              }
            });
          }

          totalCost += ticketTotalCost;

          // Decrement totalSeats on the GroupTicket
          // const seatPax =
          //   (booking.passengerCount?.adults || 0) +
          //   (booking.passengerCount?.children || 0);
          // if (seatPax > 0) {
          //   await GroupTicket.findByIdAndUpdate(ticket._id, {
          //     $inc: { totalSeats: -seatPax },
          //   });
          // }
        }
      }

      // DECREMENT AVAILABLE ROOMS ON PACKAGE
      // const totalPaxForRooms =
      //   booking.passengerCount?.total || passengers.length;
      // if (totalPaxForRooms > 0) {
      //   await GroupTicketing.findByIdAndUpdate(linkedPackage._id, {
      //     $inc: { availableRooms: -totalPaxForRooms },
      //   });
      // }

      // PROFIT / LOSS ENTRY
      const profitOrLoss = totalSellingPrice - totalCost;

      if (profitOrLoss > 0) {
        rows.push({
          account: umrahIncomeAccountId,
          debit: 0,
          credit: profitOrLoss,
          description: `Umrah Profit - ${booking.bookingNumber}`,
        });
      }

      if (profitOrLoss < 0) {
        rows.push({
          account: umrahIncomeAccountId,
          debit: Math.abs(profitOrLoss),
          credit: 0,
          description: `Umrah Loss - ${booking.bookingNumber}`,
        });
      }

      // BALANCE CHECK
      const totalDebit = rows.reduce((sum, row) => sum + (row.debit || 0), 0);
      const totalCredit = rows.reduce((sum, row) => sum + (row.credit || 0), 0);

      if (totalDebit !== totalCredit) {
        // console.log("ROWS => ", rows);
        throw new Error(
          `Voucher is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`,
        );
      }

      // CREATE ZIP VOUCHER
      const voucherData = {
        type: "journalPortal",
        date: new Date().toISOString().split("T")[0],
        transactions: rows.map((txn, index) => ({
          metadata: { id: index },
          account: txn.account,
          description: txn.description,
          debit: txn.debit,
          credit: txn.credit,
        })),
      };

      const response =
        await zipAccountsService.createUnpostedVoucher(voucherData);
      // console.log("ZIP Voucher Created:", response);

      // Save the ZIP voucher ID to the booking
      const createdVoucherId = response?.newVoucher?._id;
      if (createdVoucherId) {
        booking.voucherStatus = booking.voucherStatus || {};
        booking.voucherStatus.zipVoucherId = String(createdVoucherId);
        booking.voucherStatus.zipVoucherCreatedAt = new Date();
      }
      } // end else (local-db)
    } // end if (oldStatus !== "Confirmed" && status === "Confirmed")

    // =========================================
    // RESTOCK PACKAGE ROOMS WHEN BOOKING IS CANCELLED
    // =========================================
    if (
      (status === "Cancelled" && oldStatus !== "Cancelled") ||
      (oldStatus !== "On Hold" && status === "On Hold") ||
      (oldStatus !== "Pending" && status === "Pending") ||
      (oldStatus !== "In Progress" && status === "In Progress")
    ) {
      await restockUmrahPackageRooms(booking);

      // Void the ZIP Accounts journal voucher if it was created
      const zipVoucherId = booking.voucherStatus?.zipVoucherId;
      if (zipVoucherId) {
        try {
          // Void it, and settle it as posted so it lands in ZIP Accounts'
          // Void list instead of lingering in the Unposted queue (relevant
          // when the voucher was un-confirmed before anyone posted it).
          await zipAccountsService.voidAndPostVoucher(zipVoucherId);
          // console.log(`ZIP Voucher ${zipVoucherId} voided successfully`);
        } catch (voidError) {
          console.error(
            `Failed to void ZIP voucher ${zipVoucherId}:`,
            voidError.message,
          );
          // Non-fatal: allow cancellation to proceed even if voiding fails
        }
      }
    }

    // =========================================
    // UPDATE OVERALL STATUS
    // =========================================
    booking.overallStatus = status;
    booking.expiresAt =
      status === "On Hold" || status === "Pending"
        ? await calculateBookingExpiresAt(new Date())
        : null;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Umrah booking "${booking.bookingNumber}" overall status changed from "${oldStatus}" to "${status}"`,
    });

    res.status(200).json({
      success: true,
      message: "Overall status updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Overall Status Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// -------------------------
// UPDATE BOOKING PASSENGER WISE DISCOUNT
// -------------------------

export const savePassengerDiscounts = async (req, res) => {
  try {
    const { bookingId, passengers } = req.body;

    // Validation
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bookingId",
      });
    }

    if (!Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Passengers array is required",
      });
    }

    // Find Booking
    const booking = await UmrahPackageBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Update / Upsert passenger discounts
    booking.passengers = booking.passengers.map((existingPassenger) => {
      const matchedPassenger = passengers.find(
        (p) =>
          p.passport?.toUpperCase().trim() ===
          existingPassenger.passport?.toUpperCase().trim(),
      );

      if (matchedPassenger) {
        existingPassenger.discount = matchedPassenger.discount || 0;
      }

      return existingPassenger;
    });

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Passenger discounts saved for Umrah booking "${booking.bookingNumber}"`,
    });

    return res.status(200).json({
      success: true,
      message: "Passenger discounts saved successfully",
      data: booking.passengers,
    });
  } catch (error) {
    console.error("savePassengerDiscounts error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/* ===========================
   TOGGLE PASSENGERS EDIT LOCK (ADMIN ONLY)
   Admin locks/unlocks whether the agent can edit passenger details
=========================== */
/* ===========================
   SHIFT BOOKING ROOM TYPE (ADMIN ONLY)
   Sharing -> Double / Triple / Quad, only while the booking is On Hold and only
   when the passenger count exactly fills the target room (2 / 3 / 4).
   The booking is re-priced from the linked package's packageTotals using the
   same selling-price rules as the ledger voucher and XO report, and the payment
   total is updated to match. The preview and the real change share
   buildRoomTypeChange so what the admin confirms is exactly what gets saved.
=========================== */
const ROOM_TYPE_SHIFT_PAX_COUNT = { double: 2, triple: 3, quad: 4 };
const ROOM_TYPE_LABELS = {
  sharing: "Sharing",
  double: "Double",
  triple: "Triple",
  quad: "Quad",
};

const roomTypeChangeError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const buildRoomTypeChange = async (booking, newRoomType, user) => {
  if (!user?.permissions?.includes("manage_umrah_package_booking")) {
    throw roomTypeChangeError(
      403,
      "You do not have permission to change the room type of a booking",
    );
  }

  if (!ROOM_TYPE_SHIFT_PAX_COUNT[newRoomType]) {
    throw roomTypeChangeError(
      400,
      "Room type must be one of: double, triple, quad",
    );
  }
  if ((booking.packageSource || "local-db") !== "local-db") {
    throw roomTypeChangeError(
      400,
      "Room type can only be changed for local package bookings",
    );
  }
  if (booking.overallStatus !== "On Hold") {
    throw roomTypeChangeError(
      400,
      "Room type can only be changed while the booking is On Hold",
    );
  }
  if (booking.roomType !== "sharing") {
    throw roomTypeChangeError(
      400,
      `Only Sharing bookings can be shifted (this booking is ${ROOM_TYPE_LABELS[booking.roomType] || booking.roomType})`,
    );
  }

  const passengers = booking.passengers || [];
  const requiredPax = ROOM_TYPE_SHIFT_PAX_COUNT[newRoomType];
  if (passengers.length !== requiredPax) {
    throw roomTypeChangeError(
      400,
      `A ${ROOM_TYPE_LABELS[newRoomType]} room needs exactly ${requiredPax} passengers, but this booking has ${passengers.length}`,
    );
  }

  const linkedPackage = await GroupTicketing.findById(booking.packageId)
    .select("packageTotals")
    .lean();
  if (!linkedPackage) {
    throw roomTypeChangeError(404, "Linked package not found");
  }

  const packageTotals = linkedPackage.packageTotals || {};
  const incentive = Number(packageTotals.incentive) || 0;
  const newRoomPrice = Math.round(Number(packageTotals[newRoomType]) || 0);
  if (newRoomPrice <= 0) {
    throw roomTypeChangeError(
      400,
      `The package has no ${ROOM_TYPE_LABELS[newRoomType]} price set`,
    );
  }

  // Gross (pre-incentive) unit prices, as stored on a portal booking
  const childWithBedGross = Math.round(packageTotals.childWithBed || 0);
  const childWithoutBedGross = Math.round(packageTotals.childWithoutBed || 0);
  const infantGross = Math.round(packageTotals.infant || 0);

  const adults = passengers.filter((p) => p.type === "Adult");
  const children = passengers.filter((p) => p.type === "Child");
  const childrenWithBed = children.filter((p) => p.childType === "withBed");
  const childrenWithoutBed = children.filter((p) => p.childType !== "withBed");
  const infants = passengers.filter((p) => p.type === "Infant");

  const adultTotal = adults.length * newRoomPrice;
  const childTotal =
    childrenWithBed.length * childWithBedGross +
    childrenWithoutBed.length * childWithoutBedGross;
  const infantTotal = infants.length * infantGross;
  const subtotal = adultTotal + childTotal + infantTotal;

  // Incentive applies only to adults and children with a bed
  const incentiveEligibleCount = adults.length + childrenWithBed.length;
  const totalIncentive = incentive * incentiveEligibleCount;
  const totalPrice = Math.max(0, subtotal - totalIncentive);

  const totalDiscount = passengers.reduce(
    (sum, p) => sum + Math.max(0, Number(p.discount) || 0),
    0,
  );
  const finalTotal = Math.max(0, totalPrice - totalDiscount);

  const currentTotalPrice = Number(booking.pricing?.totalPrice) || 0;
  const currentFinalTotal = Math.max(0, currentTotalPrice - totalDiscount);
  const paidAmount = Number(booking.paymentStatus?.paidAmount) || 0;

  const lines = [
    { label: "Adults", count: adults.length, unit: newRoomPrice, total: adultTotal },
    {
      label: "Child (w/ Bed)",
      count: childrenWithBed.length,
      unit: childWithBedGross,
      total: childrenWithBed.length * childWithBedGross,
    },
    {
      label: "Child (w/o Bed)",
      count: childrenWithoutBed.length,
      unit: childWithoutBedGross,
      total: childrenWithoutBed.length * childWithoutBedGross,
    },
    { label: "Infants", count: infants.length, unit: infantGross, total: infantTotal },
  ].filter((line) => line.count > 0);

  return {
    bookingNumber: booking.bookingNumber,
    currentRoomType: booking.roomType,
    newRoomType,
    passengerCount: passengers.length,
    current: {
      pricePerPerson: Number(booking.pricing?.pricePerPerson) || 0,
      totalPrice: currentTotalPrice,
      finalTotal: currentFinalTotal,
    },
    updated: {
      pricePerPerson: newRoomPrice,
      lines,
      subtotal,
      incentivePerPassenger: incentive,
      incentiveEligibleCount,
      totalIncentive,
      totalDiscount,
      totalPrice,
      finalTotal,
      adultTotal,
      childTotal,
      infantTotal,
    },
    difference: totalPrice - currentTotalPrice,
    payment: {
      paidAmount,
      currentTotalAmount: Number(booking.paymentStatus?.totalAmount) || 0,
      newTotalAmount: totalPrice,
      newRemainingAmount: totalPrice - paidAmount,
    },
  };
};

export const previewBookingRoomTypeChange = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Umrah booking not found" });
    }

    const change = await buildRoomTypeChange(
      booking,
      req.query.roomType,
      req.user,
    );
    res.status(200).json({ success: true, data: change });
  } catch (error) {
    console.error("Preview Room Type Change Error:", error);
    res
      .status(error.status || 400)
      .json({ success: false, message: error.message });
  }
};

export const changeBookingRoomType = async (req, res) => {
  try {
    const booking = await UmrahPackageBooking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Umrah booking not found" });
    }

    const change = await buildRoomTypeChange(
      booking,
      req.body.roomType,
      req.user,
    );
    const { updated } = change;

    booking.roomType = change.newRoomType;
    booking.pricing.pricePerPerson = updated.pricePerPerson;
    booking.pricing.adultTotal = updated.adultTotal;
    booking.pricing.childTotal = updated.childTotal;
    booking.pricing.infantTotal = updated.infantTotal;
    booking.pricing.totalPrice = updated.totalPrice;
    // remainingAmount is recalculated by the model's pre-save hook
    booking.paymentStatus.totalAmount = updated.totalPrice;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Room type of Umrah booking "${booking.bookingNumber}" changed from ${ROOM_TYPE_LABELS[change.currentRoomType]} to ${ROOM_TYPE_LABELS[change.newRoomType]} (${change.passengerCount} pax); total PKR ${change.current.totalPrice} -> PKR ${updated.totalPrice}`,
    });

    res.status(200).json({
      success: true,
      message: `Room type changed to ${ROOM_TYPE_LABELS[change.newRoomType]}`,
      data: {
        roomType: booking.roomType,
        pricing: booking.pricing,
        paymentStatus: booking.paymentStatus,
      },
    });
  } catch (error) {
    console.error("Change Room Type Error:", error);
    res
      .status(error.status || 400)
      .json({ success: false, message: error.message });
  }
};

export const updatePassengersLock = async (req, res) => {
  try {
    const { locked } = req.body;

    if (typeof locked !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "'locked' boolean is required",
      });
    }

    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    booking.passengersLocked = locked;
    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Passenger edits ${locked ? "locked" : "unlocked"} for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: `Passenger edits ${locked ? "locked" : "unlocked"} successfully`,
      data: booking,
    });
  } catch (error) {
    console.error("Update Passengers Lock Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE PASSENGER DETAILS (AGENT/USER)
   Agent edits passenger details only, while unlocked by admin.
   Only editable identity fields are updated - type/childType/discount/documentUrl
   are left untouched.
=========================== */
export const updatePassengerDetails = async (req, res) => {
  try {
    // Sent as FormData - passengers travels as a JSON string alongside any
    // updated document files (documentFile_0, documentFile_1, ...).
    let passengers = req.body.passengers;
    if (typeof passengers === "string") {
      try {
        passengers = JSON.parse(passengers);
      } catch (_) {
        return res.status(400).json({
          success: false,
          message: "Invalid passengers payload",
        });
      }
    }

    if (!Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Passengers array is required",
      });
    }

    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    // Only the booking owner may edit their own passengers
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit passengers for your own bookings",
      });
    }

    if (booking.passengersLocked) {
      return res.status(403).json({
        success: false,
        message:
          "Passenger editing is locked for this booking. Please contact admin.",
      });
    }

    if (passengers.length !== booking.passengers.length) {
      return res.status(400).json({
        success: false,
        message: "Passenger count mismatch",
      });
    }

    const editableFields = [
      "title",
      "givenName",
      "surName",
      "passport",
      "dateOfBirth",
      "passportExpiry",
      "nationality",
    ];

    // Updated document files, matched by index via field name documentFile_0, documentFile_1, etc.
    const uploadedFiles = req.files || [];
    const fileByIndex = {};
    uploadedFiles.forEach((f) => {
      const match = f.fieldname.match(/^documentFile_(\d+)$/);
      if (match) fileByIndex[parseInt(match[1], 10)] = f.path;
    });

    booking.passengers.forEach((existingPassenger, index) => {
      const updated = passengers[index];
      if (updated) {
        editableFields.forEach((field) => {
          if (updated[field] !== undefined && updated[field] !== "") {
            existingPassenger[field] = updated[field];
          }
        });
      }
      if (fileByIndex[index]) {
        existingPassenger.documentUrl = fileByIndex[index];
      }
    });

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Passenger details updated by agent for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Passenger details updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Passenger Details Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===========================
   UPDATE BOOKING PACKAGE DETAILS (ADMIN ONLY)
   Lets admin edit how Flights / Hotels / Transport are displayed & printed
   for THIS booking only. This is a booking-scoped override - it never
   touches the shared UmrahPackage document, and is intentionally never
   consulted by the Confirmed-status ledger voucher logic in
   updateOverallStatus, which always prices off the original linked package.
=========================== */
export const updateBookingPackageDetails = async (req, res) => {
  try {
    const { flights, hotels, transports } = req.body;

    if (
      !Array.isArray(flights) &&
      !Array.isArray(hotels) &&
      !Array.isArray(transports)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one of flights, hotels, or transports must be provided as an array",
      });
    }

    const booking = await UmrahPackageBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Umrah booking not found",
      });
    }

    booking.packageDetailsOverride = {
      ...(booking.packageDetailsOverride || {}),
      ...(Array.isArray(flights) ? { flights } : {}),
      ...(Array.isArray(hotels) ? { hotels } : {}),
      ...(Array.isArray(transports) ? { transports } : {}),
      updatedAt: new Date(),
      updatedBy: req.user._id.toString(),
    };
    booking.markModified("packageDetailsOverride");

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahBooking",
      refModel: "UmrahPackageBooking",
      refId: booking._id,
      description: `Flights/Hotels/Transport details edited (booking-specific) for Umrah booking "${booking.bookingNumber}"`,
    });

    res.status(200).json({
      success: true,
      message: "Booking package details updated successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update Booking Package Details Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBookedSeats = async (req, res) => {
  try {
    const { groupId } = req.query;
    const groupFilter = groupId ? { groupId: String(groupId) } : {};

    // 1. Group Tickets se booked seats (Booking collection)
    const groupTicketSeats = await Booking.aggregate([
      {
        $match: {
          ...groupFilter,
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: "$groupId",
          groupId: { $first: "$groupId" },
          groupType: { $first: "$groupType" },
          totalSeats: {
            $sum: {
              $add: [
                { $ifNull: ["$adultsCount", 0] },
                { $ifNull: ["$childrenCount", 0] },
              ],
            },
          },
          totalAdults: { $sum: "$adultsCount" },
          totalChildren: { $sum: "$childrenCount" },
          totalInfants: { $sum: "$infantsCount" },
          bookings: { $sum: 1 },
        },
      },
    ]);

    // 2. Umrah Packages se booked seats jo group ticket se关联 hain
    const umrahPackageGroupSeats = await UmrahPackageBooking.aggregate([
      {
        $match: {
          overallStatus: { $nin: ["Cancelled"] },
        },
      },
      {
        $addFields: {
          packageObjectId: {
            $convert: {
              input: "$packageId",
              to: "objectId",
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        // Lookup package details to get selectedGroupTicketId
        $lookup: {
          from: "umrahpackagemodels", // Your GroupTicketing collection
          localField: "packageObjectId",
          foreignField: "_id",
          as: "packageInfo",
        },
      },
      {
        $unwind: {
          path: "$packageInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Filter where selectedGroupTicketId exists
        $match: {
          "packageInfo.selectedGroupTicketId": {
            ...(groupId ? { $eq: String(groupId) } : {}),
            $nin: [null, ""],
          },
        },
      },
      {
        $group: {
          _id: "$packageInfo.selectedGroupTicketId",
          groupId: { $first: "$packageInfo.selectedGroupTicketId" },
          groupType: { $first: "Umrah Package Group" },
          totalSeats: {
            $sum: {
              $add: [
                { $ifNull: ["$passengerCount.adults", 0] },
                { $ifNull: ["$passengerCount.children", 0] },
              ],
            },
          },
          totalAdults: { $sum: "$passengerCount.adults" },
          totalChildren: { $sum: "$passengerCount.children" },
          totalInfants: { $sum: "$passengerCount.infants" },
          bookings: { $sum: 1 },
        },
      },
    ]);

    // 3. Combine both results by the same group ticket id
    const groupTotals = new Map();

    const addGroupTotals = (group, source) => {
      const id = group.groupId?.toString();
      if (!id) return;

      const current = groupTotals.get(id) || {
        groupId: id,
        groupType: group.groupType,
        totalSeats: 0,
        totalAdults: 0,
        totalChildren: 0,
        totalInfants: 0,
        totalBookings: 0,
        directGroupTicketBookings: 0,
        umrahPackageBookings: 0,
      };

      current.totalSeats += group.totalSeats || 0;
      current.totalAdults += group.totalAdults || 0;
      current.totalChildren += group.totalChildren || 0;
      current.totalInfants += group.totalInfants || 0;
      current.totalBookings += group.bookings || 0;

      if (source === "groupTicket") {
        current.directGroupTicketBookings += group.bookings || 0;
      }

      if (source === "umrahPackage") {
        current.umrahPackageBookings += group.bookings || 0;
        current.groupType =
          current.groupType === group.groupType ? current.groupType : "Mixed";
      }

      groupTotals.set(id, current);
    };

    groupTicketSeats.forEach((group) => addGroupTotals(group, "groupTicket"));
    umrahPackageGroupSeats.forEach((group) =>
      addGroupTotals(group, "umrahPackage"),
    );

    const breakdownByGroup = Array.from(groupTotals.values());

    res.status(200).json({
      success: true,
      data: {
        breakdown: {
          byGroup: breakdownByGroup,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching booked seats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booked seats",
      error: error.message,
    });
  }
};
