import GroupTicketing from "../models/umrahPackgemodel.js";
import ActivityLog from "../models/activitylogs.js";
import { getUmrahPackagesTNT } from "../utils/Travel-Network.js";
import { fetchNormalisedUpSkyUmrahPackages } from "../utils/upskyUmrah.js";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const daysBetween = (start, end) => {
  if (!start || !end) return 0;
  const ms = end.getTime() - start.getTime();
  const raw = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return raw > 0 ? raw : 0;
};

const addDays = (date, days) => {
  if (!date || !Number.isFinite(days) || days <= 0) return undefined;
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const normalizeSupplier = (supplier) => {
  if (!supplier) return { name: "", _id: "" };
  if (typeof supplier === "string") {
    return { name: supplier, _id: "" };
  }

  return {
    name: supplier.name || supplier.account_name || "",
    _id: supplier._id || supplier.id || "",
  };
};

const normalizeHotels = (hotels = []) => {
  return hotels.map((hotel) => {
    const checkIn = toDate(hotel.checkIn);
    const checkOut = toDate(hotel.checkOut);
    const providedNights = asNumber(hotel.nights ?? hotel.nightCount, 0);

    let nights = providedNights;
    let finalCheckOut = checkOut;

    if (checkIn && finalCheckOut) {
      nights = daysBetween(checkIn, finalCheckOut);
    } else if (checkIn && nights > 0) {
      finalCheckOut = addDays(checkIn, nights);
    }

    return {
      ...hotel,
      supplier: normalizeSupplier(hotel.supplier),
      checkIn,
      checkOut: finalCheckOut,
      nights,
      // keep legacy frontend compatibility
      nightCount: nights,
    };
  });
};

const normalizeTransports = (transports = []) => {
  return transports.map((transport) => ({
    ...transport,
    supplier: normalizeSupplier(transport.supplier),
  }));
};

// Create a new Group Ticketing package
export const createPackages = async (req, res) => {
  try {
    // Files from multer
    const logo = req.files?.logo?.[0]?.path;
    const flightLogo = req.files?.flightLogo?.[0]?.path;

    // Body fields
    const {
      packageName,
      flights,
      hotels,
      transports,
      rooms,
      availableRooms,
      days,
      visa,
      selectedGroupTicketId,
      packageTotals,
      internalStatus,
    } = req.body;

    // ✅ Parse JSON safely
    const parsedFlights =
      typeof flights === "string" ? JSON.parse(flights) : flights || [];

    const parsedHotelsRaw =
      typeof hotels === "string" ? JSON.parse(hotels) : hotels || [];
    const parsedHotels = normalizeHotels(parsedHotelsRaw);

    const parsedTransportsRaw =
      typeof transports === "string"
        ? JSON.parse(transports)
        : transports || [];
    const parsedTransports = normalizeTransports(parsedTransportsRaw);

    const parsedRooms =
      typeof rooms === "string" ? JSON.parse(rooms) : rooms || {};

    const totalRooms =
      Number(parsedRooms.sharing || 0) +
      Number(parsedRooms.quad || 0) +
      Number(parsedRooms.quint || 0) +
      Number(parsedRooms.triple || 0) +
      Number(parsedRooms.double || 0);

    // parse visa
    const parsedVisa =
      typeof visa === "string" ? JSON.parse(visa) : visa || null;

    const parsedPackageTotals =
      typeof packageTotals === "string"
        ? JSON.parse(packageTotals)
        : packageTotals || {};

    // ✅ Create the Umrah package
    const newPackage = new GroupTicketing({
      ...(logo && { logo }),
      ...(flightLogo && { flightLogo }),
      packageName,
      selectedGroupTicketId: selectedGroupTicketId || "",
      flights: parsedFlights,
      hotels: parsedHotels,
      transports: parsedTransports,
      rooms: parsedRooms,
      totalRooms,
      packageSource: "local-db",
      visa: parsedVisa,
      packageTotals: parsedPackageTotals,
      availableRooms: asNumber(availableRooms, 0),
      days: asNumber(days, 0),
      internalStatus: internalStatus || "Public",
    });

    // ✅ Save package
    const savedPackage = await newPackage.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahPackage",
      refModel: "umrahPackgemodel",
      refId: savedPackage._id,
      description: `Umrah package "${savedPackage.packageName}" created`,
    });

    // ✅ Respond
    res.status(201).json({
      success: true,
      message: "Umrah package created successfully",
      package: savedPackage,
    });
  } catch (error) {
    console.error("Error creating package:", error);
    res.status(500).json({
      success: false,
      message: "Error creating Group Ticketing package",
      error: error.message,
    });
  }
};

// Get all Group Ticketing packages
export const getAllPackages = async (req, res) => {
  try {
    // 1. Local database
    const localPackages = await GroupTicketing.find();
    const formattedLocal = localPackages.map((pkg) => ({
      ...pkg.toObject(),
      id: pkg._id,
    }));

    // 2. External APIs
    // const [TravelNetworkPackages, UpSkyPackages] = await Promise.all([
    //   getUmrahPackagesTNT(),
    //   fetchNormalisedUpSkyUmrahPackages(),
    // ]);
    const [UpSkyPackages] = await Promise.all([
      fetchNormalisedUpSkyUmrahPackages(),
    ]);
    let TravelNetworkPackages = [];
    // 3. combine  (merge)
    let combinedPackages = [...formattedLocal];

    if (TravelNetworkPackages && TravelNetworkPackages.length > 0) {
      // External packages ko transform karein taake structure match ho
      const transformedExternal = TravelNetworkPackages.map((extPkg) => ({
        // Local package structure mein convert karein
        id: extPkg.id,
        packageName:
          extPkg.group?.airline?.airline_name || `Umrah Package ${extPkg.id}`,
        logo: extPkg.group?.airline?.logo_url || "",
        flightLogo: extPkg.group?.airline?.logo_url || "",
        days: parseInt(extPkg.makkah_nights) + parseInt(extPkg.madina_nights),
        availableRooms: extPkg.available_seats || 0,
        internalStatus: "Public",
        // Flights data
        flights:
          extPkg.group?.details?.map((flight) => ({
            airline: extPkg.group?.airline?.short_name || "",
            flightNo: flight.flight_no || "",
            depDate: new Date(flight.flight_date),
            depTime: flight.dept_time || "",
            arrDate: new Date(flight.flight_date),
            arrTime: flight.arv_time || "",
            sectorFrom: flight.origin || "",
            sectorTo: flight.destination || "",
            baggage: flight.baggage || "",
          })) || [],
        // Hotels data
        hotels: [
          {
            name: extPkg.makkah?.name || "Makkah Hotel",
            location: {
              city: "Makkah",
              distance: extPkg.makkah?.distance || "",
            },
            nights: parseInt(extPkg.makkah_nights) || 0,
            checkIn: new Date(extPkg.makkah_stays?.[0]?.from),
            checkOut: new Date(extPkg.makkah_stays?.[0]?.to),
          },
          {
            name: extPkg.madina?.name || "Madina Hotel",
            location: {
              city: "Madina",
              distance: extPkg.madina?.distance || "",
            },
            nights: parseInt(extPkg.madina_nights) || 0,
            checkIn: new Date(extPkg.madina_stays?.[0]?.from),
            checkOut: new Date(extPkg.madina_stays?.[0]?.to),
          },
        ],
        // Pricing details
        packageTotals: {
          double: extPkg.pricing_details?.double?.adult || 0,
          triple: extPkg.pricing_details?.triple?.adult || 0,
          quad: extPkg.pricing_details?.quad?.adult || 0,
          shared: extPkg.pricing_details?.sharing?.adult || 0,
          childWithoutBed: extPkg.pricing_details?.sharing?.child || 0,
          infant: extPkg.pricing_details?.sharing?.infant || 0,
          incentive: 0,
        },
        // Additional metadata
        packageSource: "travel-network",
        externalId: extPkg.id,
        makkahNights: extPkg.makkah_nights,
        madinaNights: extPkg.madina_nights,
        transportType: extPkg.transport_type,
        ziarat: extPkg.ziarat,
        consumedSeats: extPkg.consumed_seats,
        allowedSeats: extPkg.allowed_seats,
        groupId: extPkg.group_id,
        tnt_package_id: extPkg.id,
        tnt_group_id: extPkg.group_id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      combinedPackages = [...combinedPackages, ...transformedExternal];
    }

    // Up Sky packages already arrive normalized to the local package shape.
    if (UpSkyPackages && UpSkyPackages.length > 0) {
      combinedPackages = [...combinedPackages, ...UpSkyPackages];
    }

    // 4. Response bhejein
    res.json({
      success: true,
      data: combinedPackages,
      meta: {
        total: combinedPackages.length,
        local: formattedLocal.length,
        external:
          (TravelNetworkPackages?.length || 0) + (UpSkyPackages?.length || 0),
        travelNetwork: TravelNetworkPackages?.length || 0,
        upsky: UpSkyPackages?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error in getAllPackages:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching packages",
      error: error.message,
    });
  }
};

// Get a single package by ID
export const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    const packageData = await GroupTicketing.findById(id);

    if (!packageData)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    res.status(200).json({ success: true, package: packageData });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching package", error });
  }
};

// Update a package
export const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;

    const logo = req.files?.logo ? req.files.logo[0].path : undefined;
    const flightLogo = req.files?.flightLogo
      ? req.files.flightLogo[0].path
      : undefined;

    const {
      packageName,
      flights,
      hotels,
      transports,
      rooms,
      availableRooms,
      days,
      visa,
      selectedGroupTicketId,
      packageTotals,
      internalStatus,
    } = req.body;

    const parsedFlights =
      typeof flights === "string" ? JSON.parse(flights) : flights;
    const parsedHotelsRaw =
      typeof hotels === "string" ? JSON.parse(hotels) : hotels;
    const parsedHotels = normalizeHotels(parsedHotelsRaw || []);
    const parsedTransportsRaw =
      typeof transports === "string" ? JSON.parse(transports) : transports;
    const parsedTransports = normalizeTransports(parsedTransportsRaw || []);
    const parsedRooms = typeof rooms === "string" ? JSON.parse(rooms) : rooms;

    const parsedVisa =
      typeof visa === "string" ? JSON.parse(visa) : visa || null;

    const parsedPackageTotals =
      typeof packageTotals === "string"
        ? JSON.parse(packageTotals)
        : packageTotals || {};

    const updatedPackage = await GroupTicketing.findByIdAndUpdate(
      id,
      {
        ...(logo && { logo }),
        ...(flightLogo && { flightLogo }),
        packageName,
        selectedGroupTicketId: selectedGroupTicketId || "",
        flights: parsedFlights,
        hotels: parsedHotels,
        transports: parsedTransports,
        rooms: parsedRooms,
        visa: parsedVisa,
        packageSource: "local-db",
        packageTotals: parsedPackageTotals,
        availableRooms: asNumber(availableRooms, 0),
        days: asNumber(days, 0),
        internalStatus: internalStatus || "Public",
      },
      { new: true },
    );

    if (!updatedPackage)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahPackage",
      refModel: "umrahPackgemodel",
      refId: updatedPackage._id,
      description: `Umrah package "${updatedPackage.packageName}" updated`,
    });

    res.status(200).json({ success: true, package: updatedPackage });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error updating package", error });
  }
};

// Toggle Public / Private status
export const updatePackageInternalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { internalStatus } = req.body;

    if (!["Public", "Private"].includes(internalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid internalStatus. Use Public or Private.",
      });
    }

    const updatedPackage = await GroupTicketing.findByIdAndUpdate(
      id,
      { internalStatus },
      { new: true, runValidators: true },
    );

    if (!updatedPackage) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahPackage",
      refModel: "umrahPackgemodel",
      refId: updatedPackage._id,
      description: `Umrah package "${updatedPackage.packageName}" status changed to "${internalStatus}"`,
    });

    res.status(200).json({
      success: true,
      message: `Package status changed to ${internalStatus}`,
      package: updatedPackage,
    });
  } catch (error) {
    console.error("Error updating package internal status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating package internal status",
      error: error.message,
    });
  }
};

// Update only the Package Totals (Selling) pricing
export const updatePackageTotals = async (req, res) => {
  try {
    const { id } = req.params;
    const { packageTotals } = req.body;

    const parsedPackageTotals =
      typeof packageTotals === "string"
        ? JSON.parse(packageTotals)
        : packageTotals || {};

    const allowedFields = [
      "double",
      "triple",
      "quad",
      "shared",
      "childWithoutBed",
      "childWithBed",
      "infant",
      "incentive",
    ];

    const sanitizedTotals = {};
    allowedFields.forEach((field) => {
      sanitizedTotals[field] = asNumber(parsedPackageTotals[field], 0);
    });

    const updatedPackage = await GroupTicketing.findByIdAndUpdate(
      id,
      { packageTotals: sanitizedTotals },
      { new: true, runValidators: true },
    );

    if (!updatedPackage) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahPackage",
      refModel: "umrahPackgemodel",
      refId: updatedPackage._id,
      description: `Umrah package "${updatedPackage.packageName}" pricing updated`,
    });

    res.status(200).json({
      success: true,
      message: "Package pricing updated",
      package: updatedPackage,
    });
  } catch (error) {
    console.error("Error updating package pricing:", error);
    res.status(500).json({
      success: false,
      message: "Error updating package pricing",
      error: error.message,
    });
  }
};

// Delete a package
export const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPackage = await GroupTicketing.findByIdAndDelete(id);

    if (!deletedPackage)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    await ActivityLog.create({
      user: req.user._id,
      type: "UmrahPackage",
      description: `Umrah package "${deletedPackage.packageName}" deleted`,
    });

    res
      .status(200)
      .json({ success: true, message: "Package deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting package", error });
  }
};
