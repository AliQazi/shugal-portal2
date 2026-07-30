import Airline from "../models/Airline.js";
import GroupTicketing from "../models/GroupTicketing.js";
import Sector from "../models/Sector.js";
import UnifiedGroupCache from "../models/UnifiedGroupCache.js";
import Booking from "../models/Booking.js";
import Margin from "../models/Margin.js";
import { fetchNormalisedAlHaiderGroups } from "./al-haider.controller.js";
import ActivityLog from "../models/activitylogs.js";
import { getGroupPackagesTNT } from "../utils/Travel-Network.js";
import {
  fetchAndNormalizeSkyPassTickets,
  holdSkyPassAvailableSeats,
} from "../utils/Sky-Pass.js";
import { fetchNormalisedMCTGroups } from "../utils/mct.js";
import { fetchNormalisedUpSkyGroups } from "../utils/upsky.js";
import { applyPricingRules } from "../utils/applyPricingRules.js";
import { fetchNormalisedALSABOORGroups } from "../utils/Al-Saboor.js";
import { fetchNormalisedAmaarShoaibGroups } from "../utils/Amaar-Shoaib.js";

const normalizeSector = (sector) => {
  if (!sector) return null;
  return sector.toUpperCase().replace(/\s+/g, "").replace(/–/g, "-").trim();
};

// Add new sector
export const addSector = async (req, res) => {
  try {
    const { groupType, sectorTitle, fullSector } = req.body;

    if (!groupType || !sectorTitle) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ✅ Normalize karo save se pehle
    const normalizedTitle = normalizeSector(sectorTitle);

    // ✅ Check bhi normalized value se
    const existingSector = await Sector.findOne({
      groupType,
      sectorTitle: normalizedTitle,
    });

    if (existingSector) {
      return res.status(400).json({
        success: false,
        message: "Sector with this title already exists in this group",
      });
    }

    // ✅ Save bhi normalized value se
    const newSector = await Sector.create({
      groupType,
      sectorTitle: normalizedTitle,
      fullSector,
    });

    await ActivityLog.create({
      user: req.user._id,
      type: "Sector",
      refId: newSector._id,
      description: `Sector "${newSector.sectorTitle}" (${newSector.groupType}) added`,
    });

    res.status(201).json({
      success: true,
      message: "Sector added successfully",
      data: newSector,
    });
  } catch (error) {
    console.error("Error adding sector:", error);
    res.status(500).json({
      success: false,
      message: "Error adding sector",
      error: error.message,
    });
  }
};
// Get all sectors
export const getSectors = async (req, res) => {
  try {
    const sectors = await Sector.find().sort({ groupType: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sectors.length,
      data: sectors,
    });
  } catch (error) {
    console.error("Error fetching sectors:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sectors",
      error: error.message,
    });
  }
};

// Get sectors by group type
export const getSectorsByGroup = async (req, res) => {
  try {
    const { groupType } = req.params;
    const sectors = await Sector.find({ groupType }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sectors.length,
      data: sectors,
    });
  } catch (error) {
    console.error("Error fetching sectors by group:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sectors by group",
      error: error.message,
    });
  }
};

// Get single sector by ID
export const getSectorById = async (req, res) => {
  try {
    const { id } = req.params;
    const sector = await Sector.findById(id);

    if (!sector) {
      return res.status(404).json({
        success: false,
        message: "Sector not found",
      });
    }

    res.status(200).json({
      success: true,
      data: sector,
    });
  } catch (error) {
    console.error("Error fetching sector:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sector",
      error: error.message,
    });
  }
};

// Update sector
export const updateSector = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupType, sectorTitle, fullSector } = req.body;

    // Validate required fields
    if (!groupType || !sectorTitle || !fullSector) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if sector exists
    const sector = await Sector.findById(id);
    if (!sector) {
      return res.status(404).json({
        success: false,
        message: "Sector not found",
      });
    }

    // Check if another sector with the same title exists in the same group
    const existingSector = await Sector.findOne({
      _id: { $ne: id },
      groupType,
      sectorTitle: sectorTitle.toUpperCase(),
    });

    if (existingSector) {
      return res.status(400).json({
        success: false,
        message: "Another sector with this title already exists in this group",
      });
    }

    // Update sector
    const updatedSector = await Sector.findByIdAndUpdate(
      id,
      {
        groupType,
        sectorTitle: sectorTitle.toUpperCase(),
        fullSector,
      },
      { new: true, runValidators: true },
    );

    await ActivityLog.create({
      user: req.user._id,
      type: "Sector",
      refId: updatedSector._id,
      description: `Sector "${updatedSector.sectorTitle}" (${updatedSector.groupType}) updated`,
    });

    res.status(200).json({
      success: true,
      message: "Sector updated successfully",
      data: updatedSector,
    });
  } catch (error) {
    console.error("Error updating sector:", error);
    res.status(500).json({
      success: false,
      message: "Error updating sector",
      error: error.message,
    });
  }
};

// Delete sector
export const deleteSector = async (req, res) => {
  try {
    const { id } = req.params;

    const sector = await Sector.findById(id);
    if (!sector) {
      return res.status(404).json({
        success: false,
        message: "Sector not found",
      });
    }

    await Sector.findByIdAndDelete(id);

    await ActivityLog.create({
      user: req.user._id,
      type: "Sector",
      description: `Sector "${sector.sectorTitle}" (${sector.groupType}) deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Sector deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting sector:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting sector",
      error: error.message,
    });
  }
};

// Update Sector Order
export const updateSectorOrder = async (req, res) => {
  try {
    const { sectors } = req.body;

    if (!sectors || !Array.isArray(sectors)) {
      return res
        .status(400)
        .json({ success: false, message: "Sectors array is required" });
    }

    // Prepare bulk operations
    const bulkOps = sectors.map((sector) => ({
      updateOne: {
        filter: { _id: sector._id },
        update: { $set: { order: sector.order } },
      },
    }));

    await Sector.bulkWrite(bulkOps);

    const updatedSectors = await Sector.find().sort({ order: 1, createdAt: 1 });

    await ActivityLog.create({
      user: req.user._id,
      type: "Sector",
      description: `Sector order updated for ${sectors.length} sector(s)`,
    });

    res.status(200).json({
      success: true,
      message: "Sector order updated successfully",
      data: updatedSectors,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const makeGroupKey = (g) => {
  return [
    g.source,
    g.sector,
    g.airline?.short_name || g.airline?.airline_name,
    g.dept_date,
    g.price,
  ].join("|");
};

// const normalizeSector = (sector) => {
//   if (!sector) return null;

//   return sector
//     .toUpperCase()
//     .replace(/\s+/g, "") // remove spaces
//     .replace(/–/g, "-")
//     .trim();
// };

const normalizeTravelNetworkGroups = (rawGroups, airlines) => {
  const airlineShortMap = {};
  for (const a of airlines) {
    if (a.airlineName)
      airlineShortMap[a.airlineName.trim()] = a.shortCode || null;
  }

  return rawGroups.map((group) => {
    const normalizedDetails =
      group.details?.map((detail) => ({
        sr: parseInt(detail.sr) || 0,
        flight_no: detail.flight_no || "",
        dep_date: detail.flight_date || group.dept_date || "",
        dept_time: detail.dept_time || "",
        origin: detail.origin || "",
        destination: detail.destination || "",
        arv_date: group.arv_date || null,
        arv_time: detail.arv_time || "",
        baggage: detail.baggage || group.baggage || "",
        meal: group.meal || "",
        bookedSeats: 0,
      })) || [];

    const airlineName = group.airline?.airline_name || "";
    const shortName = group.airline?.short_name || "";

    return {
      id: group.id || `travel_${Date.now()}_${Math.random()}`,
      source: "travel-network",
      isOwnGroup: false,

      sector: group.sector || "",
      sectorKey: group.sector || "",
      type: group.type || "",

      available_no_of_pax: parseInt(group.available_no_of_pax) || 0,
      showSeat: true,
      _totalOriginalSeats: parseInt(group.available_no_of_pax) || 0,
      _onHoldSeats: 0,
      _activeBookings: 0,

      price: parseFloat(group.price) || 0,
      childPrice: 0,
      infantPrice: 0,

      // ─── TNT requires group_price_detail_id when booking ───
      groupPriceDetailId: group.group_price_detail_id || null,

      pnr: group.pnr || "",

      dept_date: group.dept_date || null,
      arv_date: group.arv_date || null,

      details: normalizedDetails,

      airline: {
        id: group.airline_id || null,
        airline_name: airlineName,
        short_name:
          airlineShortMap[airlineName] ||
          shortName ||
          airlineName.substring(0, 2),
        logo_url: group.airline?.logo_url || null,
      },

      user: null,
      bookedSeats: 0,
    };
  });
};

const ADMIN_ROLES = ["Super Admin", "Admin"];

/* ===============================
   Admin Groups (DB + cache) — shared by both the buffered
   and the streaming response paths
=============================== */
const buildAdminGroupsChunk = async () => {
  /* ===============================
     1️⃣ Fetch Admin Groups
  =============================== */
  const adminGroups = await GroupTicketing.find({ internalStatus: "Public" })
      .populate("user") // Fetch complete user/supplier object
      .sort({ createdAt: -1 })
      .lean();

    /* ===============================
       2️⃣ Fetch Airlines
    =============================== */
    const airlines = await Airline.find().lean();

    /* ===============================
       3️⃣ Fetch Sector Sorting Order
    =============================== */
    const sectors = await Sector.find().lean();

    // Make sector order map
    const sectorOrderMap = {};
    sectors.forEach((s) => {
      sectorOrderMap[normalizeSector(s.sectorTitle)] = s.order ?? 999;
    });

    /* 5️⃣ Fetch bookings for all admin groups (include cancelled for reference) */
    const groupIds = adminGroups.map((g) => g._id.toString());
    const bookings = await Booking.find({
      groupId: { $in: groupIds },
      status: { $in: ["on hold", "confirmed"] },
    }).lean();

    // Build a map: groupId -> total on-hold/confirmed passengers for the entire group
    const totalHeldSeatsMap = {};
    for (const booking of bookings) {
      const gid = booking.groupId;
      const seatsHeld = booking.adultsCount + booking.childrenCount;
      totalHeldSeatsMap[gid] = (totalHeldSeatsMap[gid] || 0) + seatsHeld;
    }

    // Also track booking count per group for admin visibility
    const bookingCountMap = {};
    for (const booking of bookings) {
      const gid = booking.groupId;
      bookingCountMap[gid] = (bookingCountMap[gid] || 0) + 1;
    }

    // Build a map: groupId -> { flightKey: total booked passengers }
    // flightKey = flightNo + '|' + depDate (ISO string)
    const bookedMap = {};
    for (const booking of bookings) {
      const gid = booking.groupId;
      if (!bookedMap[gid]) bookedMap[gid] = {};
      if (Array.isArray(booking.flights)) {
        for (const flight of booking.flights) {
          const flightNo = flight.flightNo;
          const depDate = flight.depDate || flight.flightDate;
          if (!flightNo || !depDate) continue;
          const depDateStr = new Date(depDate).toISOString().split("T")[0];
          const key = flightNo + "|" + depDateStr;
          bookedMap[gid][key] =
            (bookedMap[gid][key] || 0) +
            (booking.adultsCount + booking.childrenCount || 0);
        }
      }
    }

    console.log(
      `[GET UNIFIED GROUPS] Fetched ${adminGroups.length} admin groups, ${bookings.length} active bookings`,
    );
    for (const [gid, seats] of Object.entries(totalHeldSeatsMap)) {
      console.log(
        `  GroupID: ${gid}, On-Hold Seats: ${seats}, Bookings: ${bookingCountMap[gid]}`,
      );
    }

    /* 4️⃣ Transform Admin Groups → Unified (with bookedSeats per flight) */
    const transformedAdmin = adminGroups.map((g) => {
      const airline = airlines.find((a) => a.airlineName === g.airline);
      const gidString = g._id.toString();

      // Prepare details with bookedSeats per flight
      const details =
        g.flights?.map((f, i) => {
          const flightNo = f.flightNo;
          const depDate = f.depDate;
          const depDateStr = depDate
            ? new Date(depDate).toISOString().split("T")[0]
            : "";
          const key = flightNo + "|" + depDateStr;
          const bookedSeats = bookedMap[gidString]?.[key] || 0;
          return {
            sr: i + 1,
            flight_no: flightNo,
            dep_date: depDate,
            dept_time: f.depTime,
            origin: f.fromTerminal,
            destination: f.toTerminal,
            arv_date: f.arrDate,
            arv_time: f.arrTime,
            baggage: f.baggage,
            meal: f.meal,
            bookedSeats,
          };
        }) || [];

      // Use actual booking count instead of summing seats across flights
      // This avoids double-counting passengers on round-trip journeys
      const totalBooked = bookingCountMap[gidString] || 0;

      // ⭐ Key: totalSeats is ALREADY deducted in DB when booking is on hold
      // So available_no_of_pax = g.totalSeats (remaining after all on-hold/confirmed bookings)
      const availableSeats = g.totalSeatsAfterPartial;
      const totalOnHoldSeats = totalHeldSeatsMap[gidString] || 0;

      // Original seats can be calculated if needed
      const originalSeats = availableSeats + totalOnHoldSeats;

      return {
        id: g._id,
        source: "admin",
        isOwnGroup: true,

        sector: normalizeSector(g.sector),
        sectorKey: normalizeSector(g.sector), // for sorting only
        type: g.groupType,

        // Available seats after on-hold deductions
        available_no_of_pax: availableSeats,
        // Show seat field
        showSeat: g.showSeat,
        // Metadata for admin dashboard
        _totalOriginalSeats: originalSeats,
        _onHoldSeats: totalOnHoldSeats,
        _activeBookings: bookingCountMap[gidString] || 0,

        price: g.price?.sellingAdultPriceB2B || 0,
        childPrice: g.price?.sellingChildPriceB2B || 0,
        infantPrice: g.price?.sellingInfantPriceB2B || 0,

        pnr: g.pnr,

        dept_date: g.flights?.[0]?.depDate || null,
        arv_date: g.flights?.[g.flights.length - 1]?.arrDate || null,

        details,

        airline: {
          id: airline?._id || null,
          airline_name: g.airline,
          short_name: airline?.shortCode || null,
          logo_url: airline?.logo || null,
        },

        // Include complete user/supplier information
        user: g.user || null,

        bookedSeats: totalBooked,
      };
    });

    /* ===============================
       6️⃣ Merge & Fix Dates
    =============================== */
    let unifiedGroups = [...transformedAdmin];

    unifiedGroups = unifiedGroups.map((g) => {
      const formatDate = (dateValue) => {
        if (!dateValue) return null;
        const d = new Date(dateValue);
        return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
      };

      const finalDeptDate = formatDate(g.dept_date || g.dep_date);
      const finalArvDate = formatDate(g.arv_date);

      return {
        ...g,
        id: g.id?.toString?.() || g.id,
        dept_date: finalDeptDate,
        arv_date: finalArvDate,

        details: g.details?.map((d) => {
          const detailDepDate = formatDate(
            d.dep_date || d.flight_date || finalDeptDate,
          );

          // 2. Fix arrival date logic
          const detailArvDate = formatDate(d.arv_date);

          return {
            ...d,
            // Ensure field names are consistent
            dep_date: detailDepDate,
            flight_date: detailDepDate,
            arv_date: detailArvDate,
          };
        }),

        airline: {
          ...g.airline,
          id: g.airline?.id?.toString?.() || g.airline?.id,
        },
      };
    });

    /* ===============================
       8️⃣ Sector Sorting (ADMIN ORDER)
    =============================== */
    unifiedGroups.sort((a, b) => {
      const orderA = sectorOrderMap[normalizeSector(a.sector)] ?? 999;
      const orderB = sectorOrderMap[normalizeSector(b.sector)] ?? 999;
      return orderA - orderB;
    });

    /* ===============================
       9️⃣ Filter — Past Departures Remove
    =============================== */
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const freshGroups = unifiedGroups.filter((group) => {
      const rawDate = group.dept_date;
      if (!rawDate) return true; // no date = keep it

      const depDate = new Date(rawDate);
      depDate.setHours(0, 0, 0, 0);

      return depDate >= today; // ✅ today or future only
    });

    /* ===============================
       🔟 Smart Cache Store / Update
    =============================== */
    let cacheDoc = await UnifiedGroupCache.findOne();

    if (!cacheDoc) {
      // First time — create fresh
      cacheDoc = await UnifiedGroupCache.create({
        data: freshGroups,
        apidata: true,
      });
    } else {
      // Smart merge: preserve cache seat counts for groups
      // that were recently booked (within last HOLD_DURATION window)
      const HOLD_DURATION_MS = 15 * 60 * 1000; // match your HOLD_DURATION constant
      const recentCutoff = new Date(Date.now() - HOLD_DURATION_MS);

      // Find groups that have active/recent bookings
      const recentlyBookedGroupIds = await Booking.distinct("groupId", {
        createdAt: { $gte: recentCutoff },
        status: { $in: ["on hold", "confirmed"] },
      });

      const recentlyBookedSet = new Set(recentlyBookedGroupIds.map(String));

      // Build map from existing cache for quick lookup
      // const cachedDataMap = new Map(
      //   cacheDoc.data.map((g) => [String(g.id), g]),
      // );

      const cachedDataMap = new Map(
        cacheDoc.data.map((g) => [makeGroupKey(g), g]),
      );

      // Merge: protect seat count if group was recently booked
      const mergedGroups = freshGroups.map((freshGroup) => {
        // const gId = String(freshGroup.id);
        const gKey = makeGroupKey(freshGroup);

        // if (recentlyBookedSet.has(gId)) {
        //   // 🔒 Keep cached seat count — already deducted by createBooking
        //   const cached = cachedDataMap.get(gId);

        if (recentlyBookedSet.has(String(freshGroup.id))) {
          const cached = cachedDataMap.get(gKey);
          if (cached) {
            return {
              ...freshGroup,
              available_no_of_pax: cached.available_no_of_pax,
            };
          }
        }

        // ✅ No recent booking = use fresh API/DB data
        return freshGroup;
      });

      cacheDoc.data = mergedGroups;
      cacheDoc.apidata = true;
      cacheDoc.markModified("data"); // required for Mongoose mixed arrays
      await cacheDoc.save();
    }

    const adminGroupsData = cacheDoc.data.map((g) => ({
      ...g,
      isOwnGroup: true,
    }));

    return { adminGroupsData, sectorOrderMap };
};

/* ===============================
   Al-Haider — fetch + normalise airline short names against
   our own Airline collection (mirrors the old inline logic)
=============================== */
const fetchAlHaiderGroupsNormalized = async () => {
  const [rawAlHaider, airlines] = await Promise.all([
    fetchNormalisedAlHaiderGroups(),
    Airline.find().lean(),
  ]);

  const airlineShortMap = {};
  for (const a of airlines) {
    if (a.airlineName) airlineShortMap[a.airlineName.trim()] = a.shortCode || null;
  }

  return (rawAlHaider || []).map((g) => {
    const airlineName = g.airline?.airline_name || "";
    return {
      ...g,
      source: "al-haider",
      isOwnGroup: false,
      airline: g.airline
        ? {
            ...g.airline,
            short_name: airlineShortMap[airlineName] || g.airline.short_name || null,
          }
        : g.airline,
    };
  });
};

/* ===============================
   External provider fetchers — each is independent and
   non-fatal on failure (used by both response paths).

   EXTERNAL_PROVIDER_TASKS are fetched/streamed with normal priority.
   LOW_PRIORITY_PROVIDER_TASKS (Up Sky) are always merged/streamed
   last — it's the slowest/least reliable feed, so it should never
   hold up or jump ahead of the other sources.
=============================== */
const EXTERNAL_PROVIDER_TASKS = [
  { source: "mct", label: "MCT", run: fetchNormalisedMCTGroups },
  { source: "alHaider", label: "Al-Haider", run: fetchAlHaiderGroupsNormalized },
  {
    source: "alSaboorGroups",
    label: "Al Saboor",
    run: fetchNormalisedALSABOORGroups,
  },
  {
    source: "amaarShoaib",
    label: "Amaar Shoaib",
    run: fetchNormalisedAmaarShoaibGroups,
  },
];

const LOW_PRIORITY_PROVIDER_TASKS = [
  { source: "upsky", label: "Up Sky", run: fetchNormalisedUpSkyGroups },
];

// Travel Network and SkyPass feeds are currently disabled —
// kept as static empty sources so the response shape stays stable.
const DISABLED_PROVIDER_SOURCES = {
  travelNetwork: [],
  skyPass: [],
};

/* ===============================
   Buffered (single JSON) response — unchanged behaviour,
   used by callers that haven't switched to streaming yet
=============================== */
export const getUnifiedGroups = async (req, res) => {
  const wantsStream = req.query.stream === "true" || req.query.stream === "1";
  if (wantsStream) {
    return streamUnifiedGroups(req, res);
  }

  try {
    const allTasks = [...EXTERNAL_PROVIDER_TASKS, ...LOW_PRIORITY_PROVIDER_TASKS];

    const [{ adminGroupsData, sectorOrderMap }, ...providerSettled] = await Promise.all([
      buildAdminGroupsChunk(),
      ...allTasks.map(async ({ source, label, run }) => {
        try {
          return { source, data: await run() };
        } catch (err) {
          console.error(`${label} fetch failed:`, err.message);
          return { source, data: [] };
        }
      }),
    ]);

    const providerResults = {};
    for (const { source, data } of providerSettled) {
      providerResults[source] = data;
    }

    const combinedData = [
      ...adminGroupsData,
      ...DISABLED_PROVIDER_SOURCES.skyPass,
      ...DISABLED_PROVIDER_SOURCES.travelNetwork,
      ...providerResults.mct,
      ...providerResults.alHaider,
      ...providerResults.alSaboorGroups,
      ...providerResults.amaarShoaib,
      // Up Sky is always merged last (low priority feed)
      ...providerResults.upsky,
    ];

    /* ===============================
       Sort by Sector Order
    =============================== */
    combinedData.sort((a, b) => {
      const orderA = sectorOrderMap[normalizeSector(a.sector)] ?? 999;
      const orderB = sectorOrderMap[normalizeSector(b.sector)] ?? 999;
      return orderA - orderB;
    });

    /* ===============================
       🔐 Role-aware response
       Admin/Super Admin => raw data (so they can manage hidden items)
       Everyone else     => hide + margin rules applied
    =============================== */
    const requesterRole = req.user?.role;
    const isAdminRequester = ADMIN_ROLES.includes(requesterRole);

    const finalData = isAdminRequester
      ? combinedData
      : await applyPricingRules(combinedData);

    res.status(200).json({
      success: true,
      total: finalData.length,
      data: finalData,
      sources: {
        admin: adminGroupsData.length,
        alHaider: providerResults.alHaider.length,
        travelNetwork: DISABLED_PROVIDER_SOURCES.travelNetwork.length,
        skyPass: DISABLED_PROVIDER_SOURCES.skyPass.length,
        mct: providerResults.mct.length,
        upsky: providerResults.upsky.length,
        alSaboorGroups: providerResults.alSaboorGroups.length,
        amaarShoaib: providerResults.amaarShoaib.length,
      },
      viewMode: isAdminRequester ? "admin-raw" : "customer-filtered",
    });
  } catch (error) {
    console.error("Unified API Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ===============================
   Streaming (NDJSON) response — each source is pushed to the
   client as soon as it finishes loading, instead of waiting
   for every source to resolve before responding.

   Wire format: one JSON object per line —
     { type: "chunk", source, data }
     { type: "error", source, message }
     { type: "done", total, sources, viewMode }
=============================== */
const streamUnifiedGroups = async (req, res) => {
  const requesterRole = req.user?.role;
  const isAdminRequester = ADMIN_ROLES.includes(requesterRole);

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  try {
    await streamUnifiedGroupsBody(res, isAdminRequester);
  } catch (error) {
    console.error("Unified API stream error:", error);
    try {
      res.write(`${JSON.stringify({ type: "error", source: "fatal", message: error.message })}\n`);
    } catch {
      // response already closed — nothing more we can do
    }
  } finally {
    res.end();
  }
};

const streamUnifiedGroupsBody = async (res, isAdminRequester) => {
  const sourcesSummary = {
    admin: 0,
    alHaider: 0,
    travelNetwork: DISABLED_PROVIDER_SOURCES.travelNetwork.length,
    skyPass: DISABLED_PROVIDER_SOURCES.skyPass.length,
    mct: 0,
    alSaboorGroups: 0,
    amaarShoaib: 0,
    upsky: 0,
  };
  let total = 0;

  const writeLine = (payload) => {
    res.write(`${JSON.stringify(payload)}\n`);
  };

  const sendChunk = async (source, rawData) => {
    const data = Array.isArray(rawData) ? rawData : [];
    if (!data.length) return;
    try {
      const finalItems = isAdminRequester ? data : await applyPricingRules(data);
      sourcesSummary[source] = finalItems.length;
      total += finalItems.length;
      writeLine({ type: "chunk", source, data: finalItems });
    } catch (err) {
      console.error(`Stream chunk error (${source}):`, err.message);
      writeLine({ type: "error", source, message: err.message });
    }
  };

  const priorityTasks = [
    {
      source: "admin",
      run: async () => (await buildAdminGroupsChunk()).adminGroupsData,
    },
    ...EXTERNAL_PROVIDER_TASKS,
  ];

  // Kick off the low-priority feed (Up Sky) right away too, so its slow/flaky
  // login isn't wasted idle time — but its result is only streamed out below,
  // after every priority source, so it never jumps the queue.
  const lowPriorityPromises = LOW_PRIORITY_PROVIDER_TASKS.map((t) =>
    t
      .run()
      .then((data) => ({ source: t.source, data }))
      .catch((error) => ({ source: t.source, error })),
  );

  // Race the priority sources concurrently, streaming each one out the moment it settles.
  const wrapped = priorityTasks.map((t, i) =>
    t
      .run()
      .then((data) => ({ i, source: t.source, data }))
      .catch((error) => ({ i, source: t.source, error })),
  );
  const pending = new Set(wrapped);

  while (pending.size) {
    const result = await Promise.race(pending);
    pending.delete(wrapped[result.i]);

    if (result.error) {
      console.error(`${result.source} fetch failed:`, result.error.message);
      writeLine({ type: "error", source: result.source, message: result.error.message });
      continue;
    }

    await sendChunk(result.source, result.data);
  }

  // Now stream the low-priority (Up Sky) results, always last.
  for (const promise of lowPriorityPromises) {
    const result = await promise;
    if (result.error) {
      console.error(`${result.source} fetch failed:`, result.error.message);
      writeLine({ type: "error", source: result.source, message: result.error.message });
      continue;
    }
    await sendChunk(result.source, result.data);
  }

  writeLine({
    type: "done",
    total,
    sources: sourcesSummary,
    viewMode: isAdminRequester ? "admin-raw" : "customer-filtered",
  });
};

// Apply Margin to all public groups
export const applyMargin = async (req, res) => {
  try {
    const { value, type } = req.body;

    // Validate inputs
    if (
      (!value && value !== 0) ||
      !type ||
      !["percent", "amount"].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid input. Provide value and type (percent or amount)",
      });
    }

    const marginValue = parseFloat(value);

    if (isNaN(marginValue) || marginValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Margin value must be a positive number",
      });
    }

    /* ===============================
       Save margin to database
    =============================== */
    let marginDoc = await Margin.findOne();

    if (marginDoc) {
      // Update existing margin
      marginDoc.value = marginValue;
      marginDoc.type = type;
      marginDoc.appliedAt = new Date();
      await marginDoc.save();
    } else {
      // Create new margin
      marginDoc = await Margin.create({
        value: marginValue,
        type: type,
        appliedAt: new Date(),
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Sector",
      description: `Margin set to ${marginValue} ${type === "percent" ? "%" : "Rs"}`,
    });

    res.status(200).json({
      success: true,
      message: `Margin saved successfully: ${marginValue} ${type === "percent" ? "%" : "Rs"}`,
      data: {
        value: marginDoc.value,
        type: marginDoc.type,
        appliedAt: marginDoc.appliedAt,
      },
    });
  } catch (error) {
    console.error("Error saving margin:", error);
    res.status(500).json({
      success: false,
      message: "Error saving margin",
      error: error.message,
    });
  }
};

// Get current margin
export const getMargin = async (req, res) => {
  try {
    const marginDoc = await Margin.findOne();

    if (!marginDoc) {
      return res.status(200).json({
        success: true,
        message: "No margin set",
        data: {
          value: 0,
          type: "percent",
          appliedAt: null,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        value: marginDoc.value,
        type: marginDoc.type,
        appliedAt: marginDoc.appliedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching margin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching margin",
      error: error.message,
    });
  }
};

export const getHoldSeatsSP = async (req, res) => {
  try {
    const { ticketId, quantity, openSeatsSlot } = req.body;

    if (!ticketId) {
      return res
        .status(400)
        .json({ success: false, message: "ticketId is required" });
    }

    const spRes = await holdSkyPassAvailableSeats({
      ticketId,
      quantity,
      openSeatsSlot,
    });

    return res.status(200).json({
      success: true,
      bal_seats: spRes?.bal_seats ?? null,
      status: spRes?.status,
      message: spRes?.message,
      raw: spRes,
    });
  } catch (error) {
    console.error("[getHoldSeatsSP] error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};
