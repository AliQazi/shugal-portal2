import Booking from "../models/Booking.js";
import GroupTicketing from "../models/GroupTicketing.js";
import mongoose from "mongoose";
import Register from "../models/Register.js";
import { deductSeatsFromCache } from "../utils/cacheHelpers.js";
import zipAccountsService from "../services/zipAccounts.service.js";
import { calculateBookingExpiresAt } from "../utils/bookingHoldDuration.js";
import ActivityLog from "../models/activitylogs.js";
import {
  sendBookingStatusUpdateEmail,
  sendBookingCreatedEmails,
} from "../utils/emailService.js";
import { bookGroup, formatBookingForAlHaider } from "../utils/Al-Haider.js";
import { bookGroupTNT } from "../utils/Travel-Network.js";
import { submitSkyPassBooking } from "../utils/Sky-Pass.js";
import { bookGroupMCT, formatBookingForMCT } from "../utils/mct.js";
import { createUpSkyBooking, formatBookingForUpSky } from "../utils/upsky.js";
import {
  createALSABOORBooking,
  formatBookingForALSABOOR,
} from "../utils/Al-Saboor.js";
import {
  createAmaarShoaibBooking,
  formatBookingForAmaarShoaib,
} from "../utils/Amaar-Shoaib.js";

// const HOLD_DURATION = 2 * 60 * 60 * 1000;
// -------------------------
// Helper Functions
// -------------------------

// TFC is the registered agent with every third-party supplier — bookings made
// through the portal must be submitted under TFC's own identity, never the
// personal contact details of the portal agent who happened to create it.
const TFC_AGENCY_INFO = {
  agentName: "Abid Air",
  agencyName: "Abid Air",
  email: "tfctours@gmail.com",
  mobile: "+923041119786",
};

const isLocalGroup = (groupId) => mongoose.Types.ObjectId.isValid(groupId);
const normalizeGroupId = (groupId) => groupId?.toString();

/**
 * Adjust seats for local groups (admin groups)
 *
 * This function is atomic and thread-safe using MongoDB's $inc operator.
 *
 * Positive seatChange: Releases seats (booking cancelled)
 * Negative seatChange: Deducts seats (booking created/on-hold)
 *
 * @param {String} groupId - MongoDB ObjectId of the GroupTicketing
 * @param {Number} seatChange - Seats to add (+) or remove (-)
 * @param {Boolean} checkAvailability - If true, throws error if insufficient seats
 *
 * @example
 * // Booking created with 2 passengers
 * await adjustSeatsIfLocalGroup(groupId, -2, true); // Check availability
 *
 * // Booking cancelled
 * await adjustSeatsIfLocalGroup(groupId, 2); // Release 2 seats
 */
const adjustSeatsIfLocalGroup = async (
  groupId,
  seatChange,
  checkAvailability = false,
) => {
  if (!isLocalGroup(groupId)) return; // External group → ignore

  // const query = { _id: groupId };
  // if (checkAvailability && seatChange < 0)
  //   query.totalSeats = { $gte: Math.abs(seatChange) };

  // const result = await GroupTicketing.updateOne(query, {
  //   $inc: { totalSeats: seatChange },
  // });

  // if (result.matchedCount === 0) return; // Not local → ignore
  // if (checkAvailability && result.modifiedCount === 0)
  //   throw new Error("Not enough seats available");

  // // Log the seat adjustment
  // console.log(
  //   `[SEAT ADJUSTMENT] GroupID: ${groupId}, Change: ${seatChange}, Success: ${result.modifiedCount > 0}`,
  // );
};

// -------------------------
// CREATE BOOKING
// -------------------------
/**
 * Creates a new booking with automatic seat deduction
 *
 * Flow:
 * 1. Validate passenger count and pricing
 * 2. Deduct seats from GroupTicketing (throws if insufficient)
 * 3. Create booking with "on hold" status
 * 4. Set expiry timer (30 minutes)
 * 5. Seats are automatically released if booking expires or is cancelled
 *
 * Seat Tracking:
 * - Only counts adults + children (infants don't occupy seats)
 * - Deducted immediately (GroupTicketing.totalSeats -= seats)
 * - Will be restored by cron job if booking expires
 * - Can be manually restored by cancellation
 *
 * @returns {Object} Booking document with auto-generated reference
 */

// export const createBooking = async (req, res) => {
//   let seatCount = 0;
//   let booking = null;

//   try {
//     const {
//       groupId: incomingGroupId,
//       source,
//       groupType,
//       airline,
//       sector,
//       pnr,
//       contactPersonName,
//       adultsCount,
//       childrenCount,
//       infantsCount,
//       totalPassengers,
//       pricing,
//       passengers,
//       flights,
//       departureDate,
//       arrivalDate,
//     } = req.body;

//     if (passengers.length !== totalPassengers)
//       throw new Error("Passenger mismatch");

//     const calculatedTotal =
//       pricing.adultTotal + pricing.childTotal + pricing.infantTotal;
//     if (Math.abs(calculatedTotal - pricing.grandTotal) > 0.01)
//       throw new Error("Price mismatch");

//     // ⭐ Only adults + children occupy seats (infants don't)
//     seatCount = adultsCount + childrenCount;
//     // const expiresAt = new Date(Date.now() + HOLD_DURATION);
//     const expiresAt = await calculateBookingExpiresAt(new Date());

//     const groupId = normalizeGroupId(incomingGroupId);
//     const bookingSource =
//       source || (isLocalGroup(groupId) ? "admin" : "sabaoon");

//     const isSabaoonGroup =
//       bookingSource === "sabaoon" && !isLocalGroup(groupId);

//     // 1️⃣ Deduct from local DB (existing logic)
//     // This will throw an error if not enough seats available
//     // await adjustSeatsIfLocalGroup(groupId, -seatCount, true);

//     // // 2️⃣ Deduct from unified cache too
//     // await deductSeatsFromCache(groupId, seatCount);

//     // 3️⃣ Create the booking
//     booking = await Booking.create({
//       groupId,
//       groupType,
//       airline,
//       sector,
//       pnr,
//       contactPersonName,
//       adultsCount,
//       childrenCount,
//       infantsCount,
//       totalPassengers,
//       pricing,
//       passengers,
//       flights,
//       departureDate,
//       arrivalDate,
//       userId: req.user._id,
//       status: "on hold",
//       expiresAt,
//       source: bookingSource,
//       sabaoonBookingStatus: isSabaoonGroup ? "pending" : "not_applicable",
//     });

//     // ─── Sabaoon and Al-Haider third-party API calls removed ───

//     await ActivityLog.create({
//       user: req.user._id,
//       type: "Ticket Booking",
//       refModel: "Booking",
//       refId: booking._id,
//       description: `Booking "${booking.bookingReference}" created for ${booking.totalPassengers} passenger(s) on ${booking.sector}`,
//     });

//     res.status(201).json({ success: true, data: booking });
//   } catch (err) {
//     // Rollback local DB seats if booking creation failed AFTER seat deduction
//     if (seatCount > 0) {
//       await adjustSeatsIfLocalGroup(
//         normalizeGroupId(req.body.groupId),
//         seatCount,
//       ).catch(() => {});

//       // Rollback cache seats too
//       await deductSeatsFromCache(
//         normalizeGroupId(req.body.groupId),
//         -seatCount, // negative = add back
//       ).catch(() => {});
//     }
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

export const createBooking = async (req, res) => {
  let seatCount = 0;
  let booking = null;

  try {
    const {
      groupId: incomingGroupId,
      source,
      groupType,
      airline,
      sector,
      pnr,
      contactPersonName,
      adultsCount,
      childrenCount,
      infantsCount,
      totalPassengers,
      pricing,
      passengers,
      flights,
      departureDate,
      arrivalDate,
    } = req.body;

    // console.log("📥 Received Booking Data:", JSON.stringify(req.body, null, 2));

    // Validation
    if (passengers.length !== totalPassengers) {
      throw new Error(
        `Passenger mismatch: ${passengers.length} passengers provided, ${totalPassengers} expected`,
      );
    }

    const calculatedTotal =
      pricing.adultTotal + pricing.childTotal + pricing.infantTotal;
    if (Math.abs(calculatedTotal - pricing.grandTotal) > 0.01) {
      throw new Error(
        `Price mismatch: calculated ${calculatedTotal}, grand total ${pricing.grandTotal}`,
      );
    }

    // Only adults + children occupy seats (infants don't)
    seatCount = adultsCount + childrenCount;

    const groupId = normalizeGroupId(incomingGroupId);
    const requestedSource =
      source || (isLocalGroup(groupId) ? "admin" : "sabaoon");
    const bookingSource =
      String(requestedSource).toLowerCase() === "alsaboor"
        ? "ALSABOOR"
        : requestedSource;

    const expiresAt = await calculateBookingExpiresAt(
      new Date(),
      bookingSource,
    );
    const isSabaoonGroup =
      bookingSource === "sabaoon" && !isLocalGroup(groupId);
    const isAlHaiderGroup = bookingSource === "al-haider";
    const isTravelNetworkGroup = bookingSource === "travel-network";
    const isSkyPassGroup = bookingSource === "skypass";
    const isMCTGroup = bookingSource === "mct";
    const isUpSkyGroup = bookingSource === "upsky";
    const isAlSaboorGroup = bookingSource === "ALSABOOR";
    const isAmaarShoaibGroup = bookingSource === "amaar-shoaib";

    // Create the booking (local DB record — har source ke liye banta hai)
    booking = await Booking.create({
      groupId,
      groupType,
      airline,
      sector,
      pnr,
      contactPersonName,
      adultsCount,
      childrenCount,
      infantsCount,
      totalPassengers,
      pricing,
      passengers,
      flights,
      departureDate,
      arrivalDate,
      userId: req.user._id,
      status: "on hold",
      expiresAt,
      source: bookingSource,
      sabaoonBookingStatus: isSabaoonGroup ? "pending" : "not_applicable",
      alSaboorBookingStatus: isAlSaboorGroup ? "pending" : "not_applicable",
      amaarShoaibBookingStatus: isAmaarShoaibGroup
        ? "pending"
        : "not_applicable",
    });

    // ─── Handle Al-Haider third-party API call ───
    if (isAlHaiderGroup) {
      try {
        const groupIdNumber = parseInt(groupId, 10);
        if (isNaN(groupIdNumber)) {
          throw new Error("Invalid group ID format for Al-Haider");
        }

        const alHaiderBookingData = formatBookingForAlHaider({
          groupId: groupIdNumber,
          agencyInfo: {
            ...TFC_AGENCY_INFO,
            adults: adultsCount,
            child: childrenCount,
            infant: infantsCount,
            notes: null,
          },
          passengers: passengers.map((p) => ({
            type: p.type,
            surname: p.surName || p.surname || "",
            givenName: p.givenName || "",
            title: p.title || "",
            passport: p.passport || "",
            dateOfBirth: p.dateOfBirth || "",
            passportExpiry: p.passportExpiry || "",
          })),
          pricing: {
            adults: adultsCount,
            children: childrenCount,
            infants: infantsCount,
          },
        });

        const alHaiderResponse = await bookGroup(alHaiderBookingData);

        if (alHaiderResponse) {
          booking.alHaiderBookingId =
            alHaiderResponse.booking_id ||
            alHaiderResponse.id ||
            alHaiderResponse.bookingId ||
            null;

          if (alHaiderResponse.pnr) {
            booking.pnr = alHaiderResponse.pnr;
          }

          if (
            alHaiderResponse.status === "confirmed" ||
            alHaiderResponse.status === "Confirmed"
          ) {
            booking.status = "confirmed";
          }

          booking.alHaiderResponse = alHaiderResponse;
          booking.alHaiderBookingStatus = "success";

          await booking.save();
        }
      } catch (alHaiderError) {
        console.error("❌ AlHaider API booking failed:", alHaiderError.message);
        console.error("Stack:", alHaiderError.stack);

        if (alHaiderError.response) {
          console.error("Response data:", alHaiderError.response.data);
          console.error("Response status:", alHaiderError.response.status);
        }

        booking.alHaiderBookingStatus = "failed";
        booking.alHaiderErrorMessage = alHaiderError.message;

        if (alHaiderError.response?.data) {
          booking.alHaiderErrorDetails = alHaiderError.response.data;
        }

        await booking.save();
        console.log("⚠️ Booking marked as failed but kept in database");
      }
    }

    // ─── Handle Travel Network (TNT) third-party API call ───
    if (isTravelNetworkGroup) {
      try {
        const groupIdNumber = parseInt(groupId, 10);
        if (isNaN(groupIdNumber)) {
          throw new Error("Invalid group ID format for Travel Network");
        }

        // group_price_detail_id frontend se aana chahiye (TNT groups ke saath milta hai)
        // agar nahi aaya toh null bhejo — TNT khud fare changed error mein naya ID dega
        const groupPriceDetailId =
          req.body.groupPriceDetailId || req.body.group_price_detail_id || null;

        const tntBookingData = formatBookingForTNT({
          groupId: groupIdNumber,
          agencyInfo: {
            ...TFC_AGENCY_INFO,
            adults: adultsCount,
            child: childrenCount,
            infant: infantsCount,
            notes: null,
          },
          passengers: passengers.map((p) => ({
            type: p.type,
            surname: p.surName || p.surname || "",
            givenName: p.givenName || "",
            title: p.title || "",
            passport: p.passport || "",
            dateOfBirth: p.dateOfBirth || "",
            passportExpiry: p.passportExpiry || "",
          })),
          groupPriceDetailId,
        });

        const tntResponse = await bookGroupTNT(tntBookingData);

        if (tntResponse) {
          booking.tntBookingId =
            tntResponse.booking_id ||
            tntResponse.id ||
            tntResponse.bookingId ||
            null;

          if (tntResponse.pnr) {
            booking.pnr = tntResponse.pnr;
          }

          if (
            tntResponse.status === "confirmed" ||
            tntResponse.status === "Confirmed"
          ) {
            booking.status = "confirmed";
          }

          // ─── Fare change ke baad retry hua tha — updated price note karo ───
          if (tntResponse._fareChanged) {
            console.log(
              `💰 TNT fare was updated to PKR ${tntResponse._newPrice} (group_price_detail_id: ${tntResponse._newGroupPriceDetailId})`,
            );
            booking.tntFareChanged = true;
            booking.tntNewPrice = tntResponse._newPrice;
            booking.tntGroupPriceDetailId = tntResponse._newGroupPriceDetailId;
          }

          booking.tntResponse = tntResponse;
          booking.tntBookingStatus = "success";

          await booking.save();
        }
      } catch (tntError) {
        console.error(
          "❌ Travel Network API booking failed:",
          tntError.message,
        );

        booking.tntBookingStatus = "failed";
        booking.tntErrorMessage = tntError.message;

        if (tntError.tntResponseData) {
          booking.tntErrorDetails = tntError.tntResponseData;
        }

        await booking.save();
        console.log("⚠️ TNT booking marked as failed but local booking kept");
      }
    }

    // Handle MCT third-party API call
    if (isMCTGroup) {
      try {
        const groupIdNumber = parseInt(groupId, 10);
        if (isNaN(groupIdNumber)) {
          throw new Error("Invalid group ID format for MCT");
        }

        const mctBookingData = formatBookingForMCT({
          groupId: groupIdNumber,
          agencyInfo: {
            ...TFC_AGENCY_INFO,
            adults: adultsCount,
            child: childrenCount > 0 ? childrenCount : null,
            infant: infantsCount > 0 ? infantsCount : null,
            notes: null,
          },
          passengers: passengers.map((p) => ({
            type: p.type,
            surname: p.surName || p.surname || "",
            givenName: p.givenName || "",
            title: p.title || "",
            passport: p.passport || "",
            dateOfBirth: p.dateOfBirth || "",
            passportExpiry: p.passportExpiry || "",
          })),
          pricing: {
            adults: adultsCount,
            children: childrenCount,
            infants: infantsCount,
          },
        });

        const mctResponse = await bookGroupMCT(mctBookingData);

        if (mctResponse) {
          booking.mctBookingId =
            mctResponse.booking_id ||
            mctResponse.id ||
            mctResponse.bookingId ||
            mctResponse.data?.booking_id ||
            mctResponse.data?.id ||
            null;

          if (mctResponse.pnr || mctResponse.data?.pnr) {
            booking.pnr = mctResponse.pnr || mctResponse.data?.pnr;
          }

          const status = mctResponse.status || mctResponse.data?.status || "";
          if (["confirmed", "Confirmed"].includes(status)) {
            booking.status = "confirmed";
          }

          booking.mctResponse = mctResponse;
          booking.mctBookingStatus = "success";

          await booking.save();
        }
      } catch (mctError) {
        console.error("MCT API booking failed:", mctError.message);

        booking.mctBookingStatus = "failed";
        booking.mctErrorMessage = mctError.message;

        if (mctError.mctResponseData) {
          booking.mctErrorDetails = mctError.mctResponseData;
        }

        await booking.save();
        console.log("MCT booking marked as failed but local booking kept");
      }
    }

    // ─── Handle Sky Pass third-party API call ───
    if (isSkyPassGroup) {
      try {
        // Extract ticket_id from groupId (remove skypass_ prefix if present)
        const ticketId = String(groupId)
          .replace(/^skypass_/, "")
          .replace(/^skypass-/, "")
          .split("_")[0];

        // Log SkyPass booking attempt
        console.log(`✈️ Submitting SkyPass booking for ticket: ${ticketId}`);

        // Prepare passenger data for SkyPass API
        const skypassPassengers = passengers.map((p) => ({
          type: p.type,
          title: p.title || "",
          surName: p.surName || p.surname || "",
          givenName: p.givenName || "",
          passport: p.passport || "",
          dateOfBirth: p.dateOfBirth || "",
          passportExpiry: p.passportExpiry || "",
          nationality: p.nationality || "Pakistan",
        }));

        // Prepare agent details
        const agentDetails = {
          id: req.user?.agentId || req.user?._id || "",
          name: req.user?.name || req.user?.companyName || "Agent",
          email: req.user?.email || "",
        };

        // Submit booking to SkyPass
        const skypassResponse = await submitSkyPassBooking({
          ticketId: ticketId,
          passengers: skypassPassengers,
          agent: agentDetails,
        });

        console.log(
          "✅ SkyPass booking response:",
          JSON.stringify(skypassResponse, null, 2),
        );

        // Store SkyPass response in booking
        if (skypassResponse) {
          booking.skypassBookingId =
            skypassResponse.booking_id ||
            skypassResponse.id ||
            skypassResponse.bookingId ||
            skypassResponse.data?.id ||
            null;

          // If SkyPass returns a PNR, update it
          if (skypassResponse.pnr || skypassResponse.data?.pnr) {
            booking.pnr = skypassResponse.pnr || skypassResponse.data?.pnr;
          }

          // Check if booking was confirmed
          const status =
            skypassResponse.status || skypassResponse.data?.status || "";

          // Store full response
          booking.skypassResponse = skypassResponse;

          if (skypassResponse.status === "error") {
            booking.skypassBookingStatus = "failed";
            booking.skypassErrorMessage =
              skypassResponse.message || "SkyPass returned error";
            console.error(
              "❌ SkyPass returned error:",
              skypassResponse.message,
            );
          } else {
            booking.skypassBookingStatus = "success";
          }

          await booking.save();
          console.log("✅ SkyPass booking saved successfully");
        }
      } catch (skypassError) {
        console.error("❌ SkyPass API booking failed:", skypassError.message);

        if (skypassError.skypassResponseData) {
          console.error("Response data:", skypassError.skypassResponseData);
          console.error("Response status:", skypassError.skypassStatusCode);
        }

        // Mark booking as failed but keep in database
        booking.skypassBookingStatus = "failed";
        booking.skypassErrorMessage = skypassError.message;

        if (skypassError.skypassResponseData) {
          booking.skypassErrorDetails = skypassError.skypassResponseData;
        }

        await booking.save();
        console.log("⚠️ SkyPass booking marked as failed but kept in database");

        // Optionally: You might want to throw error or handle differently
        // throw skypassError; // Uncomment if you want to fail the whole booking
      }
    }

    // ─── Handle Up Sky third-party API call ───
    if (isUpSkyGroup) {
      try {
        const groupIdNumber = parseInt(groupId, 10);
        if (isNaN(groupIdNumber)) {
          throw new Error("Invalid group ID format for Up Sky");
        }

        const upSkyBookingData = formatBookingForUpSky({
          groupId: groupIdNumber,
          roe: booking.bookingReference,
          pnr1: pnr || "",
          passengers: passengers.map((p) => ({
            type: p.type,
            surname: p.surName || p.surname || "",
            givenName: p.givenName || "",
            title: p.title || "",
            passport: p.passport || "",
            dateOfBirth: p.dateOfBirth || "",
            passportIssue: p.passportIssue || "",
            passportExpiry: p.passportExpiry || "",
          })),
          pricing: {
            adultPrice: pricing.adultPrice,
            childPrice: pricing.childPrice,
            infantPrice: pricing.infantPrice,
          },
        });

        console.log(`✈️ Submitting Up Sky booking for group: ${groupIdNumber}`);

        const upSkyResponse = await createUpSkyBooking(upSkyBookingData);

        console.log(
          "✅ Up Sky booking response:",
          JSON.stringify(upSkyResponse, null, 2),
        );

        if (upSkyResponse) {
          booking.upskyBookingId =
            upSkyResponse.transaction_id != null
              ? String(upSkyResponse.transaction_id)
              : null;

          booking.upskyResponse = upSkyResponse;

          const status = String(upSkyResponse.status || "").toLowerCase();
          if (status === "error") {
            booking.upskyBookingStatus = "failed";
            booking.upskyErrorMessage =
              upSkyResponse.message || "Up Sky returned error";
            console.error("❌ Up Sky returned error:", upSkyResponse.message);
          } else {
            booking.upskyBookingStatus = "success";
          }

          await booking.save();
          console.log("✅ Up Sky booking saved successfully");
        }
      } catch (upSkyError) {
        console.error("❌ Up Sky API booking failed:", upSkyError.message);

        booking.upskyBookingStatus = "failed";
        booking.upskyErrorMessage = upSkyError.message;

        if (upSkyError.upskyResponseData) {
          booking.upskyErrorDetails = upSkyError.upskyResponseData;
        }

        await booking.save();
        console.log("⚠️ Up Sky booking marked as failed but kept in database");
      }
    }

    // ─── Handle Al Saboor third-party API call ───
    if (isAlSaboorGroup) {
      try {
        const groupIdNumber = parseInt(groupId, 10);
        if (isNaN(groupIdNumber)) {
          throw new Error("Invalid group ID format for Al Saboor");
        }

        const alSaboorBookingData = formatBookingForALSABOOR({
          groupId: groupIdNumber,
          roe: booking.bookingReference,
          pnr1: pnr || "",
          passengers: passengers.map((p) => ({
            type: p.type,
            surname: p.surName || p.surname || "",
            givenName: p.givenName || "",
            title: p.title || "",
            passport: p.passport || "",
            dateOfBirth: p.dateOfBirth || "",
            passportIssue: p.passportIssue || "",
            passportExpiry: p.passportExpiry || "",
          })),
          pricing: {
            adultPrice: pricing.adultPrice,
            childPrice: pricing.childPrice,
            infantPrice: pricing.infantPrice,
          },
        });

        console.log(
          `✈️ Submitting Al Saboor booking for group: ${groupIdNumber}`,
        );

        const alSaboorResponse =
          await createALSABOORBooking(alSaboorBookingData);

        console.log(
          "✅ Al Saboor booking response:",
          JSON.stringify(alSaboorResponse, null, 2),
        );

        if (alSaboorResponse) {
          booking.alSaboorBookingId =
            alSaboorResponse.transaction_id != null
              ? String(alSaboorResponse.transaction_id)
              : null;
          booking.alSaboorResponse = alSaboorResponse;

          const status = String(alSaboorResponse.status || "").toLowerCase();
          if (
            status === "error" ||
            status === "failed" ||
            alSaboorResponse.error === true
          ) {
            booking.alSaboorBookingStatus = "failed";
            booking.alSaboorErrorMessage =
              alSaboorResponse.message || "Al Saboor returned error";
            console.error(
              "❌ Al Saboor returned error:",
              alSaboorResponse.message,
            );
          } else {
            booking.alSaboorBookingStatus = "success";
          }

          await booking.save();
          console.log("✅ Al Saboor booking saved successfully");
        }
      } catch (alSaboorError) {
        console.error(
          "❌ Al Saboor API booking failed:",
          alSaboorError.message,
        );

        booking.alSaboorBookingStatus = "failed";
        booking.alSaboorErrorMessage = alSaboorError.message;

        if (alSaboorError.ALSABOORResponseData) {
          booking.alSaboorErrorDetails = alSaboorError.ALSABOORResponseData;
        }

        await booking.save();
        console.log(
          "⚠️ Al Saboor booking marked as failed but kept in database",
        );
      }
    }

    // ─── Handle Amaar Shoaib third-party API call ───
    if (isAmaarShoaibGroup) {
      try {
        const groupIdNumber = parseInt(groupId, 10);
        if (isNaN(groupIdNumber)) {
          throw new Error("Invalid group ID format for Amaar Shoaib");
        }

        const amaarShoaibBookingData = formatBookingForAmaarShoaib({
          groupId: groupIdNumber,
          roe: booking.bookingReference,
          pnr1: pnr || "",
          agentName: TFC_AGENCY_INFO.agentName,
          passengers: passengers.map((p) => ({
            type: p.type,
            surname: p.surName || p.surname || "",
            givenName: p.givenName || "",
            title: p.title || "",
            passport: p.passport || "",
            dateOfBirth: p.dateOfBirth || "",
            passportIssue: p.passportIssue || "",
            passportExpiry: p.passportExpiry || "",
          })),
          pricing: {
            adultPrice: pricing.adultPrice,
            childPrice: pricing.childPrice,
            infantPrice: pricing.infantPrice,
          },
        });

        console.log(
          `✈️ Submitting Amaar Shoaib booking for group: ${groupIdNumber}`,
        );

        const amaarShoaibResponse = await createAmaarShoaibBooking(
          amaarShoaibBookingData,
        );

        console.log(
          "✅ Amaar Shoaib booking response:",
          JSON.stringify(amaarShoaibResponse, null, 2),
        );

        if (amaarShoaibResponse) {
          booking.amaarShoaibBookingId =
            amaarShoaibResponse.transaction_id != null
              ? String(amaarShoaibResponse.transaction_id)
              : null;
          booking.amaarShoaibResponse = amaarShoaibResponse;

          const status = String(amaarShoaibResponse.status || "").toLowerCase();
          if (
            status === "error" ||
            status === "failed" ||
            amaarShoaibResponse.error === true
          ) {
            booking.amaarShoaibBookingStatus = "failed";
            booking.amaarShoaibErrorMessage =
              amaarShoaibResponse.message || "Amaar Shoaib returned error";
            console.error(
              "❌ Amaar Shoaib returned error:",
              amaarShoaibResponse.message,
            );
          } else {
            booking.amaarShoaibBookingStatus = "success";
          }

          await booking.save();
          console.log("✅ Amaar Shoaib booking saved successfully");
        }
      } catch (amaarShoaibError) {
        console.error(
          "❌ Amaar Shoaib API booking failed:",
          amaarShoaibError.message,
        );

        booking.amaarShoaibBookingStatus = "failed";
        booking.amaarShoaibErrorMessage = amaarShoaibError.message;

        if (amaarShoaibError.amaarShoaibResponseData) {
          booking.amaarShoaibErrorDetails =
            amaarShoaibError.amaarShoaibResponseData;
        }

        await booking.save();
        console.log(
          "⚠️ Amaar Shoaib booking marked as failed but kept in database",
        );
      }
    }

    // Create activity log
    await ActivityLog.create({
      user: req.user._id,
      type: "Ticket Booking",
      refModel: "Booking",
      refId: booking._id,
      description: `Booking "${booking.bookingReference}" created for ${booking.totalPassengers} passenger(s) on ${booking.sector}`,
    });

    // Notify ticketing team + the agent who created the booking (non-blocking)
    sendBookingCreatedEmails({ booking, user: req.user }).catch(
      (emailError) => {
        console.error("⚠️ Booking creation emails failed:", emailError.message);
      },
    );

    console.log("✅ Booking process completed successfully");
    res.status(201).json({
      success: true,
      data: booking,
      message: "Booking created successfully",
    });
  } catch (err) {
    console.error("❌ Booking creation failed:", err.message);
    console.error("Stack:", err.stack);

    if (seatCount > 0) {
      try {
        await adjustSeatsIfLocalGroup(
          normalizeGroupId(req.body.groupId),
          seatCount,
        );
        console.log(`🔄 Rolled back ${seatCount} seats from local DB`);
      } catch (rollbackError) {
        console.error("Seat rollback failed:", rollbackError.message);
      }

      try {
        await deductSeatsFromCache(
          normalizeGroupId(req.body.groupId),
          -seatCount,
        );
        console.log(`🔄 Rolled back ${seatCount} seats from cache`);
      } catch (cacheError) {
        console.error("Cache rollback failed:", cacheError.message);
      }
    }

    res.status(400).json({
      success: false,
      message: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

// ─── Helper: title mapping for Travel Network (TNT) ───
function getTitleForTNT(type, existingTitle) {
  if (existingTitle) {
    const upperTitle = existingTitle.toUpperCase();
    const validTitles = ["MR", "MRS", "MS", "CHD", "INF"];
    if (validTitles.includes(upperTitle)) {
      return upperTitle;
    }
  }
  const titleMap = {
    Adult: "MR",
    Child: "CHD",
    Infant: "INF",
  };
  return titleMap[type] || "MR";
}

// ─── Helper: TNT chahta hai date "YYYY-MM-DD" format mein, incoming ISO string ho sakti hai ───
function formatDateForTNT(dateValue) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

// ─── Helper: payload ko TNT ke expected shape mein convert karo ───
function formatBookingForTNT({
  groupId,
  agencyInfo,
  passengers,
  groupPriceDetailId,
}) {
  return {
    group_id: groupId,
    agency_info: {
      group_id: groupId,
      agent_name: agencyInfo.agentName,
      agency_name: agencyInfo.agencyName,
      email: agencyInfo.email,
      mobile: agencyInfo.mobile,
      adults: agencyInfo.adults,
      child: agencyInfo.child,
      infant: agencyInfo.infant,
      agent_notes: agencyInfo.notes || null,
    },
    booking_details: passengers.map((p) => ({
      type: p.type,
      surname: p.surname,
      given_name: p.givenName,
      title: getTitleForTNT(p.type, p.title),
      passport_no: p.passport,
      dob: formatDateForTNT(p.dateOfBirth),
      doe: formatDateForTNT(p.passportExpiry),
    })),
    group_price_detail_id: groupPriceDetailId,
  };
}

// Helper function to get title for AlHaider API based on passenger type
function getTitleForAlHaider(type, existingTitle) {
  // If title is already provided and is valid, use it
  if (existingTitle) {
    const upperTitle = existingTitle.toUpperCase();
    // Valid titles for AlHaider: MR, MRS, MS, CHD, INF
    const validTitles = ["MR", "MRS", "MS", "CHD", "INF"];
    if (validTitles.includes(upperTitle)) {
      return upperTitle;
    }
  }

  // Otherwise map based on type
  const titleMap = {
    Adult: "MR",
    Child: "CHD",
    Infant: "INF",
  };
  return titleMap[type] || "MR";
}

// -------------------------
// GET ALL BOOKINGS
// -------------------------
// Helper function to attach group ticket data to booking(s)
const attachGroupData = async (bookings) => {
  const bookingsArray = Array.isArray(bookings) ? bookings : [bookings];

  const groupIds = [
    ...new Set(
      bookingsArray
        .map((b) => b.groupId)
        .filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  ];

  if (groupIds.length === 0) return bookingsArray;

  const groups = await GroupTicketing.find({ _id: { $in: groupIds } }).select(
    "_id price passengers totalSeats groupName groupCategory airline sector flights user",
  );

  const groupMap = {};
  groups.forEach((group) => {
    groupMap[group._id.toString()] = {
      groupTicketData: {
        // Buying prices
        buyingCurrency: group.price?.buyingCurrency || "PKR",
        buyingAdultPrice: group.price?.buyingAdultPrice || 0,
        buyingChildPrice: group.price?.buyingChildPrice || 0,
        buyingInfantPrice: group.price?.buyingInfantPrice || 0,

        // Selling prices (B2B)
        sellingCurrencyB2B: group.price?.sellingCurrencyB2B || "PKR",
        sellingAdultPriceB2B: group.price?.sellingAdultPriceB2B || 0,
        sellingChildPriceB2B: group.price?.sellingChildPriceB2B || 0,
        sellingInfantPriceB2B: group.price?.sellingInfantPriceB2B || 0,

        // Additional info
        totalSeats: group.totalSeats,
        groupName: group.groupName,
        groupCategory: group.groupCategory,
        supplierName: group.user?.name || null,
      },
    };
  });

  const result = bookingsArray.map((booking) => {
    const bookingObj = booking.toObject ? booking.toObject() : booking;
    const groupData = groupMap[booking.groupId];

    return groupData ? { ...bookingObj, ...groupData } : bookingObj;
  });

  return Array.isArray(bookings) ? result : result[0];
};

export const getAllBookings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sector,
      airline,
      fromDate,
      search,
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (sector) query.sector = sector;
    if (airline) query["airline.name"] = airline;
    if (fromDate) query.departureDate = { $gte: new Date(fromDate) };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      const matchedAgents = await Register.find({
        $or: [
          { name: searchRegex },
          { companyName: searchRegex },
          { agencyCode: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ],
      }).select("_id");

      const matchedAgentIds = matchedAgents.map((agent) => agent._id);

      query.$or = [
        { bookingReference: searchRegex },
        { contactPersonName: searchRegex },
        { pnr: searchRegex },
        { sector: searchRegex },
        { "airline.name": searchRegex },
        { "passengers.givenName": searchRegex },
        { "passengers.surName": searchRegex },
        { "passengers.passportNumber": searchRegex },
        { userId: { $in: matchedAgentIds } },
      ];
    }

    if (req.user.role !== "Super Admin" && req.user.role !== "Admin") {
      query.userId = req.user._id;
    }

    const skip = (page - 1) * limit;

    let bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "name email phone agencyCode companyName logo");

    bookings = await attachGroupData(bookings);

    bookings = bookings.map((booking) => {
      const bookingObj = booking.toObject ? booking.toObject() : booking;

      if (bookingObj.userId) {
        const agencyName =
          bookingObj.userId.companyName || bookingObj.userId.name;

        bookingObj.contactAgency = {
          name: agencyName,
          email: bookingObj.userId.email,
          phone: bookingObj.userId.phone,
          agencyCode: bookingObj.userId.agencyCode,
          companyName: bookingObj.userId.companyName,
        };

        bookingObj.contactPersonName = agencyName;
      }

      return bookingObj;
    });

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalBookings: total,
      },
    });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bookings" });
  }
};

// -------------------------
// GET BOOKING BY ID
// -------------------------
export const getBookingById = async (req, res) => {
  try {
    let booking = await Booking.findById(req.params.id).populate(
      "userId",
      "name email agencyCode companyName logo",
    );

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    if (
      req.user.role !== "Super Admin" &&
      req.user.role !== "Admin" &&
      booking.userId._id.toString() !== req.user._id.toString()
    )
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    // Attach group ticket data
    booking = await attachGroupData(booking);

    res.json({ success: true, data: booking });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch booking" });
  }
};

// -------------------------
// GET BOOKING BY REFERENCE
// -------------------------
export const getBookingByReference = async (req, res) => {
  try {
    let booking = await Booking.findOne({
      bookingReference: req.params.reference,
    }).populate("userId", "name email agencyCode companyName");

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    if (
      req.user.role !== "Super Admin" &&
      req.user.role !== "Admin" &&
      booking.userId._id.toString() !== req.user._id.toString()
    )
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    // Attach group ticket data
    booking = await attachGroupData(booking);

    res.json({ success: true, data: booking });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch booking" });
  }
};

// -------------------------
// ZIP ACCOUNT LEDGER HITTING
// -------------------------
const ledgerHiting = async (booking) => {
  // Get the agent's ZIP account ID (already stored in user)
  // booking can come either as a single object OR as an array containing one object: [ {booking} ]
  const bookingData = Array.isArray(booking) ? booking[0] : booking;

  if (!bookingData) {
    throw new Error("Booking data not found");
  }

  const agentUser = await Register.findById(
    bookingData.userId?._id || bookingData.userId,
  );

  if (!agentUser?.zipId) {
    throw new Error("Agent ZIP account ID not found");
  }
  const customerAccount = agentUser.zipId;

  // Determine supplier account based on booking source
  let supplierAccount = null;
  let supplierName = "";

  if (bookingData.source === "admin") {
    // For admin bookings, get supplier from GroupTicketing
    const groupTicketing = await GroupTicketing.findById(bookingData.groupId);
    if (!groupTicketing?.user?._id) {
      throw new Error("Supplier ZIP account ID not found in GroupTicketing");
    }
    supplierAccount = groupTicketing.user._id;
    supplierName = groupTicketing.user.name;
  } else {
    // For external suppliers (SkyPass, Al-Haider, Travel Network), find account by name
    const externalSupplierNames = {
      skypass: "SkyPass",
      "al-haider": "AL HAIDER INTERNATIONAL TRAVEL",
      "travel-network": "Travel Network",
      mct: "MCT GROUP TICKETS (MIAN CHANNU TRVL)",
      upsky: "UPSKY",
      ALSABOOR: "ALSABOOR TRAVELS",
      "amaar-shoaib": "AMAAR SHOAIB TRAVELS",
    };

    // Make sure the source exists and map it to the proper name
    if (!bookingData.source) {
      throw new Error("Booking source not found");
    }

    const standardSupplierName =
      externalSupplierNames[bookingData.source] || bookingData.source;
    supplierName = standardSupplierName;

    const accountsData = await zipAccountsService.getAllAccounts();
    const accounts = Array.isArray(accountsData)
      ? accountsData
      : accountsData.results || [];

    const supplierAccountObj = accounts.find(
      (acc) => acc.account_name === standardSupplierName,
    );

    if (!supplierAccountObj) {
      throw new Error(
        `"${standardSupplierName}" supplier account not found in ZIP Accounts`,
      );
    }
    supplierAccount = supplierAccountObj._id;
  }

  // Fetch "Ticket Income" account ID
  const accountsData = await zipAccountsService.getAllAccounts();
  const accounts = Array.isArray(accountsData)
    ? accountsData
    : accountsData.results || [];

  const ticketIncomeAcc = accounts.find(
    (acc) => acc.account_name === "Ticket Income",
  );
  if (!ticketIncomeAcc) {
    throw new Error('"Ticket Income" account not found in ZIP Accounts');
  }
  const TicketIncomeAccount = ticketIncomeAcc._id;

  // Per-passenger selling prices (customer price after customer discount)
  // According to financial calculation data source spec, use bookingData.pricing fields as actual revenue
  const sellingAdultPrice =
    bookingData.adultsCount > 0
      ? (bookingData.pricing?.adultTotal || 0) / bookingData.adultsCount
      : 0;
  const sellingChildPrice =
    bookingData.childrenCount > 0
      ? (bookingData.pricing?.childTotal || 0) / bookingData.childrenCount
      : 0;
  const sellingInfantPrice =
    bookingData.infantsCount > 0
      ? (bookingData.pricing?.infantTotal || 0) / bookingData.infantsCount
      : 0;

  // Calculate buying cost (what we pay to supplier)
  // For admin bookings, use group ticket buying prices
  // For external suppliers, use the base prices from booking as per project specification
  let buyingAdultPrice = 0;
  let buyingChildPrice = 0;
  let buyingInfantPrice = 0;

  if (bookingData.source === "admin" && bookingData.groupTicketData) {
    // For admin bookings, use the buying prices from group ticket data
    buyingAdultPrice = bookingData.groupTicketData?.buyingAdultPrice || 0;
    buyingChildPrice = bookingData.groupTicketData?.buyingChildPrice || 0;
    buyingInfantPrice = bookingData.groupTicketData?.buyingInfantPrice || 0;
  } else {
    // For external suppliers, use the base prices which represent the supplier cost
    // These are the original supplier prices before markup
    buyingAdultPrice = bookingData.pricing?.adultBasePrice || 0;
    buyingChildPrice = bookingData.pricing?.childBasePrice || 0;
    buyingInfantPrice = bookingData.pricing?.infantBasePrice || 0;

    // Fallback to adultPrice if adultBasePrice is not available (for backward compatibility)
    if (buyingAdultPrice === 0 && bookingData.pricing?.adultPrice) {
      buyingAdultPrice = bookingData.pricing.adultPrice;
    }
    if (buyingChildPrice === 0 && bookingData.pricing?.childPrice) {
      buyingChildPrice = bookingData.pricing.childPrice;
    }
    if (buyingInfantPrice === 0 && bookingData.pricing?.infantPrice) {
      buyingInfantPrice = bookingData.pricing.infantPrice;
    }
  }

  // Calculate buying cost considering supplier discounts for all bookings
  // According to financial calculation spec, apply supplier discounts to the buying prices
  const buyingCost = (bookingData.passengers || []).reduce(
    (total, passenger) => {
      let baseBuyingPrice = 0;
      if (passenger.type === "Adult") baseBuyingPrice = buyingAdultPrice;
      else if (passenger.type === "Child") baseBuyingPrice = buyingChildPrice;
      else if (passenger.type === "Infant") baseBuyingPrice = buyingInfantPrice;

      // Apply supplier discount to the buying price
      // actual cost = buying price - supplierDiscount
      const supplierDiscount = passenger.supplierDiscount || 0;
      const actualAmountPaidToSupplier = Math.max(
        0,
        baseBuyingPrice - supplierDiscount,
      );

      return total + actualAmountPaidToSupplier;
    },
    0,
  );

  const date = new Date().toISOString().split("T")[0];

  const dateOptions = { day: "2-digit", month: "short", year: "numeric" };
  const formatter = new Intl.DateTimeFormat("en-GB", dateOptions);

  const departDate = bookingData.departureDate
    ? formatter.format(new Date(bookingData.departureDate)).toUpperCase()
    : "N/A";

  const arrivalDate = bookingData.arrivalDate
    ? formatter.format(new Date(bookingData.arrivalDate)).toUpperCase()
    : "N/A";

  const airlineName = bookingData.airline?.name || "N/A";

  // Ledger entries:
  // 1. One Debit per passenger (selling price minus customer discount) against Customer (Agent)
  // 2. One Credit per passenger against Supplier (buying cost per passenger type after supplier discount)
  // 3. Ticket Income - Credit with margin (profit after discounts)
  const passengerRows = (bookingData.passengers || []).map((passenger) => {
    const passengerName = `${passenger.surName} ${passenger.givenName}`;
    const description = `${passenger.title} ${passengerName} - ${bookingData.pnr} - ${bookingData.sector} - ${airlineName} - ${departDate} - ${arrivalDate}`;
    let basePrice = 0;
    if (passenger.type === "Adult") basePrice = sellingAdultPrice;
    else if (passenger.type === "Child") basePrice = sellingChildPrice;
    else if (passenger.type === "Infant") basePrice = sellingInfantPrice;
    const discount = passenger.discount || 0;
    const effectivePrice = Math.max(0, basePrice - discount);
    return {
      account: customerAccount,
      debit: effectivePrice,
      credit: 0,
      description,
    };
  });

  const supplierRows = (bookingData.passengers || []).map((passenger) => {
    const passengerName = `${passenger.surName} ${passenger.givenName}`;
    const description = `${passenger.title} ${passengerName} - ${bookingData.pnr} - ${bookingData.sector} - ${airlineName} - ${departDate} - ${arrivalDate}`;
    let basePrice = 0;
    if (passenger.type === "Adult") basePrice = buyingAdultPrice;
    else if (passenger.type === "Child") basePrice = buyingChildPrice;
    else if (passenger.type === "Infant") basePrice = buyingInfantPrice;

    // Apply supplier discount to determine actual cost paid to supplier
    const supplierDiscount = passenger.supplierDiscount || 0;
    const actualBuyingPrice = Math.max(0, basePrice - supplierDiscount);
    return {
      account: supplierAccount,
      debit: 0,
      credit: actualBuyingPrice,
      description,
    };
  });

  // Recalculate total selling after discounts
  const discountedSellingTotal = passengerRows.reduce(
    (sum, row) => sum + row.debit,
    0,
  );
  const discountedMargin = discountedSellingTotal - buyingCost;

  const firstPassenger = bookingData.passengers?.[0];
  const firstPassengerName = firstPassenger
    ? `${firstPassenger.title} ${firstPassenger.surName} ${firstPassenger.givenName}`
    : "N/A";
  const summaryDescription = `${firstPassengerName} - ${bookingData.pnr} - ${bookingData.sector} - ${airlineName} - ${departDate} - ${arrivalDate}`;

  const rows = [
    ...passengerRows,
    ...(buyingCost > 0 ? supplierRows : []),
    {
      account: TicketIncomeAccount,
      debit: 0,
      credit: buyingCost > 0 ? discountedMargin : discountedSellingTotal,
      description: summaryDescription,
    },
  ];

  // Build voucher data in JSON format for the ZIP Accounts service
  const voucherData = {
    type: "journalPortal",
    date: date,
    transactions: rows.map((txn, index) => ({
      metadata: { id: index },
      account: txn.account,
      description: txn.description,
      credit: txn.credit,
      debit: txn.debit,
    })),
  };

  // Use the ZIP Accounts service to create the voucher
  const response = await zipAccountsService.createVoucher(voucherData);
  return response;
};

// -------------------------
// UPDATE BOOKING STATUS
// -------------------------
// export const updateBookingStatus = async (req, res) => {
//   try {
//     const { status, notes } = req.body;
//     const booking = await Booking.findById(req.params.id);
//     if (!booking) throw new Error("Booking not found");

//     const oldStatus = booking.status;
//     const seats = booking.adultsCount + booking.childrenCount;

//     // if (oldStatus !== "cancelled" && status === "cancelled") {
//     //   await adjustSeatsIfLocalGroup(normalizeGroupId(booking.groupId), seats);
//     // }

//     if (oldStatus !== "confirmed" && status === "confirmed") {
//       const detailedBooking = await attachGroupData(booking);
//       const response = await ledgerHiting(detailedBooking);
//       const createdVoucherId = response?.newVoucher?._id;
//       if (createdVoucherId) {
//         booking.zipVoucherId = String(createdVoucherId);
//       }
//     }

//     if (oldStatus !== "cancelled" && status === "cancelled" || oldStatus !== "on hold" && status === "on hold") {
//       const zipVoucherId = booking.zipVoucherId;
//       if (zipVoucherId) {
//         try {
//           await zipAccountsService.voidUnvoidVoucher(zipVoucherId, "void");
//         } catch (voidError) {
//           console.error(
//             `Failed to void ZIP voucher ${zipVoucherId}:`,
//             voidError.message,
//           );
//           // Non-fatal: allow cancellation to proceed even if voiding fails
//         }
//       }
//     }

//     if (oldStatus === "cancelled" && status !== "cancelled") {
//       await adjustSeatsIfLocalGroup(
//         normalizeGroupId(booking.groupId),
//         -seats,
//         true,
//       );
//     }

//     booking.status = status;
//     booking.notes = notes ?? booking.notes;
//     booking.cancelledAt = status === "cancelled" ? booking.cancelledAt : null;
//     booking.expiresAt =
//       status === "on hold" ? await calculateBookingExpiresAt(new Date()) : null;

//     await booking.save();

//     await ActivityLog.create({
//       user: req.user._id,
//       type: "Ticket Booking",
//       refModel: "Booking",
//       refId: booking._id,
//       description: `Booking "${booking.bookingReference}" status changed from "${oldStatus}" to "${status}"`,
//     });

//     res.json({ success: true, data: booking });
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// };

export const updateBookingStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const booking = await Booking.findById(req.params.id).populate(
      "userId",
      "name email companyName",
    );

    if (!booking) {
      throw new Error("Booking not found");
    }

    const oldStatus = booking.status;
    const seats = booking.adultsCount + booking.childrenCount;

    if (oldStatus !== "confirmed" && status === "confirmed") {
      const bookingData = Array.isArray(booking) ? booking[0] : booking;

      const detailedBooking = await attachGroupData(bookingData);
      const response = await ledgerHiting(detailedBooking);

      const createdVoucherId = response?.newVoucher?._id;

      if (createdVoucherId) {
        bookingData.zipVoucherId = String(createdVoucherId);
      }
    }

    if (
      (oldStatus !== "cancelled" && status === "cancelled") ||
      (oldStatus !== "on hold" && status === "on hold")
    ) {
      const zipVoucherId = booking.zipVoucherId;

      if (zipVoucherId) {
        try {
          await zipAccountsService.voidUnvoidVoucher(zipVoucherId, "void");
        } catch (voidError) {
          console.error(
            `Failed to void ZIP voucher ${zipVoucherId}:`,
            voidError.message,
          );
        }
      }
    }

    if (oldStatus === "cancelled" && status !== "cancelled") {
      await adjustSeatsIfLocalGroup(
        normalizeGroupId(booking.groupId),
        -seats,
        true,
      );
    }

    booking.status = status;
    booking.notes = notes ?? booking.notes;
    booking.cancelledAt = status === "cancelled" ? new Date() : null;

    // Need to get the booking source to pass to calculateBookingExpiresAt
    const bookingSource =
      booking.source ||
      (booking.groupId && isLocalGroup(booking.groupId) ? "admin" : "sabaoon");
    booking.expiresAt =
      status === "on hold"
        ? await calculateBookingExpiresAt(new Date(), bookingSource)
        : null;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "Ticket Booking",
      refModel: "Booking",
      refId: booking._id,
      description: `Booking "${booking.bookingReference}" status changed from "${oldStatus}" to "${status}"`,
    });

    // Send status update email
    try {
      const customerEmail = booking.userId?.email;

      const customerName =
        booking.contactPersonName || booking.userId?.name || "Customer";

      console.log("📧 Booking status email data:", {
        customerEmail,
        customerName,
        bookingReference: booking.bookingReference,
        oldStatus,
        newStatus: status,
      });

      if (customerEmail && oldStatus !== status) {
        await sendBookingStatusUpdateEmail({
          email: customerEmail,
          name: customerName,
          bookingReference: booking.bookingReference,
          oldStatus,
          newStatus: status,
          notes: booking.notes,
        });
      } else {
        console.log("⚠️ Booking status email not sent:", {
          reason: !customerEmail
            ? "Customer email not found"
            : "Status not changed",
          oldStatus,
          newStatus: status,
        });
      }
    } catch (emailError) {
      console.error("Booking status update email failed:", emailError.message);
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// -------------------------
// UPDATE PASSENGER DISCOUNTS
// -------------------------
export const updatePassengerDiscounts = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new Error("Booking not found");

    const { discounts, supplierDiscounts } = req.body;
    if (!Array.isArray(discounts)) {
      throw new Error("discounts must be an array");
    }

    discounts.forEach((disc, i) => {
      if (booking.passengers[i]) {
        booking.passengers[i].discount = Math.max(0, Number(disc) || 0);
        if (
          Array.isArray(supplierDiscounts) &&
          supplierDiscounts[i] !== undefined
        ) {
          booking.passengers[i].supplierDiscount = Math.max(
            0,
            Number(supplierDiscounts[i]) || 0,
          );
        }
      }
    });

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "Ticket Booking",
      refModel: "Booking",
      refId: booking._id,
      description: `Passenger discounts updated for booking "${booking.bookingReference}"`,
    });

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// EXTEND BOOKING HOLD
// -------------------------
export const extendBookingHold = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new Error("Booking not found");
    if (!["on hold", "pending"].includes(booking.status)) {
      throw new Error("Only on-hold bookings can be extended");
    }

    const holdMinutes = Number(req.body.holdMinutes);
    if (!Number.isFinite(holdMinutes) || holdMinutes <= 0) {
      throw new Error("Hold duration must be greater than zero");
    }

    const now = new Date();
    const requestedExpiry = new Date(now.getTime() + holdMinutes * 60 * 1000);
    const currentExpiry =
      booking.expiresAt && booking.expiresAt > now ? booking.expiresAt : now;

    // booking.expiresAt =
    //   requestedExpiry > currentExpiry ? requestedExpiry : currentExpiry;

    booking.expiresAt = requestedExpiry;

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id).populate(
      "userId",
      "name email agencyCode companyName phone",
    );
    const bookingWithGroupData = await attachGroupData(updatedBooking);

    await ActivityLog.create({
      user: req.user._id,
      type: "Ticket Booking",
      refModel: "Booking",
      refId: updatedBooking._id,
      description: `Booking "${updatedBooking.bookingReference}" hold extended by ${holdMinutes} minute(s)`,
    });

    res.json({
      success: true,
      message: "Booking hold extended",
      data: bookingWithGroupData,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// UPDATE BOOKING DETAILS
// -------------------------
export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "on hold")
      throw new Error("Only on-hold bookings can be edited");

    const oldSeats = booking.adultsCount + booking.childrenCount;

    // Update fields from body
    Object.assign(booking, req.body);

    // Normalize groupId if updated
    if (req.body.groupId) booking.groupId = normalizeGroupId(req.body.groupId);

    const newSeats = booking.adultsCount + booking.childrenCount;
    const diff = newSeats - oldSeats;

    if (diff > 0) {
      await adjustSeatsIfLocalGroup(booking.groupId, -diff, true);
    } else if (diff < 0) {
      await adjustSeatsIfLocalGroup(booking.groupId, Math.abs(diff));
    }

    booking.expiresAt =
      booking.status === "on hold"
        ? await calculateBookingExpiresAt(new Date())
        : null;

    await booking.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "Ticket Booking",
      refModel: "Booking",
      refId: booking._id,
      description: `Booking "${booking.bookingReference}" details updated`,
    });

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// CANCEL BOOKING
// -------------------------
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "cancelled") throw new Error("Already cancelled");

    const seats = booking.adultsCount + booking.childrenCount;

    booking.status = "cancelled";
    booking.expiresAt = null;
    await booking.save();

    await adjustSeatsIfLocalGroup(booking.groupId, seats);

    await ActivityLog.create({
      user: req.user._id,
      type: "Ticket Booking",
      refModel: "Booking",
      refId: booking._id,
      description: `Booking "${booking.bookingReference}" cancelled`,
    });

    res.json({ success: true, message: "Booking cancelled", data: booking });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// DELETE BOOKING (ADMIN ONLY)
// -------------------------
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) throw new Error("Booking not found");

    if (booking.status !== "cancelled") {
      const seats = booking.adultsCount + booking.childrenCount;
      await adjustSeatsIfLocalGroup(booking.groupId, seats);
    }

    await booking.deleteOne();

    await ActivityLog.create({
      user: req.user._id,
      type: "Ticket Booking",
      description: `Booking "${booking.bookingReference}" deleted`,
    });

    res.json({ success: true, message: "Booking deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------------
// BOOKING STATISTICS (ADMIN DASHBOARD)
// -------------------------
export const getBookingStatistics = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          revenue: { $sum: "$pricing.grandTotal" },
        },
      },
    ]);

    const totalBookings = await Booking.countDocuments();
    const totalRevenue = await Booking.aggregate([
      { $group: { _id: null, total: { $sum: "$pricing.grandTotal" } } },
    ]);

    res.json({
      success: true,
      data: {
        byStatus: stats,
        totalBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch statistics" });
  }
};

export const bulkTogglePriceOnCall = async (req, res) => {
  try {
    const { value } = req.body;

    if (typeof value !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Value must be boolean",
      });
    }

    const result = await Register.updateMany(
      {
        role: { $in: ["Agency"] },
      },
      {
        $set: { priceOnCall: value },
      },
    );

    await ActivityLog.create({
      user: req.user._id,
      type: "Ticket Booking",
      description: `Price on call bulk set to "${value ? "ON" : "OFF"}" for all agencies (${result.modifiedCount} updated)`,
    });

    return res.json({
      success: true,
      message: `Updated ${result.modifiedCount} agents`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to Bulk toggle price on call",
    });
  }
};

// -------------------------
// UPLOAD PASSENGER DOCUMENT
// -------------------------
export const uploadPassengerDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    // req.file.path is the Cloudinary secure URL
    res.json({ success: true, url: req.file.path });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------------
// REFUND BOOKING VOUCHER
// -------------------------
export const refundBookingVoucher = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "userId",
      "zipId",
    );

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    const { passengerIndex, partyCredit, partyCC, supplierCC, supplierDebit } =
      req.body;

    const passenger = booking.passengers?.[passengerIndex];
    if (!passenger)
      return res
        .status(400)
        .json({ success: false, message: "Passenger not found" });

    // Resolve accounts
    const customerAccount = booking.userId?.zipId;
    if (!customerAccount)
      return res
        .status(400)
        .json({ success: false, message: "Agent ZIP account ID not found" });

    const groupTicketing = await GroupTicketing.findById(booking.groupId);
    const supplierAccount = groupTicketing?.user?._id ?? null;

    const accountsData = await zipAccountsService.getAllAccounts();
    const accounts = Array.isArray(accountsData)
      ? accountsData
      : accountsData.results || [];
    const ticketIncomeAcc = accounts.find(
      (acc) => acc.account_name === "Ticket Income",
    );
    if (!ticketIncomeAcc)
      return res.status(400).json({
        success: false,
        message: '"Ticket Income" account not found in ZIP Accounts',
      });
    const ticketIncomeAccount = ticketIncomeAcc._id;

    // Build per-passenger description
    const dateOptions = { day: "2-digit", month: "short", year: "numeric" };
    const formatter = new Intl.DateTimeFormat("en-GB", dateOptions);
    const departDate = booking.departureDate
      ? formatter.format(new Date(booking.departureDate)).toUpperCase()
      : "N/A";
    const arrivalDate = booking.arrivalDate
      ? formatter.format(new Date(booking.arrivalDate)).toUpperCase()
      : "N/A";
    const airlineName = booking.airline?.name || "N/A";
    const passengerName = `${passenger.title} ${passenger.surName} ${passenger.givenName}`;
    const description = `Refund - ${passengerName} - ${booking.pnr} - ${booking.sector} - ${airlineName} - ${departDate} - ${arrivalDate}`;

    const transactions = [];
    let idx = 0;

    // Party Credit → credit the customer (party gets money back)
    const partyCreditAmt = Number(partyCredit) || 0;
    if (partyCreditAmt > 0) {
      transactions.push({
        metadata: { id: idx++ },
        account: customerAccount,
        description,
        debit: 0,
        credit: partyCreditAmt,
      });
    }

    // Supplier Debit → debit supplier (supplier owes us back)
    const supplierDebitAmt = Number(supplierDebit) || 0;
    if (supplierDebitAmt > 0 && supplierAccount) {
      transactions.push({
        metadata: { id: idx++ },
        account: supplierAccount,
        description,
        debit: supplierDebitAmt,
        credit: 0,
      });
    }

    // Ticket Income: profit (supplierDebit > partyCredit) → credit; loss (supplierDebit < partyCredit) → debit
    const margin = supplierDebitAmt - partyCreditAmt;
    if (margin !== 0) {
      transactions.push({
        metadata: { id: idx++ },
        account: ticketIncomeAccount,
        description,
        debit: margin < 0 ? Math.abs(margin) : 0,
        credit: margin > 0 ? margin : 0,
      });
    }

    if (transactions.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "All refund amounts are zero" });
    }

    const voucherData = {
      type: "journalPortal",
      date: new Date().toISOString().split("T")[0],
      transactions,
    };

    const response = await zipAccountsService.createVoucher(voucherData);

    // Persist refunded passenger index
    await Booking.findByIdAndUpdate(req.params.id, {
      $addToSet: { refundedPassengerIndices: passengerIndex },
    });

    await ActivityLog.create({
      user: req.user._id,
      type: "Ticket Booking",
      refModel: "Booking",
      refId: booking._id,
      description: `Refund voucher created for passenger #${passengerIndex + 1} on booking "${booking.bookingReference}"`,
    });

    res.status(201).json({
      success: true,
      message: "Refund voucher created",
      data: response,
    });
  } catch (err) {
    console.error("Error creating refund voucher:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTicketNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const { ticketNumber } = req.body;

    if (!ticketNumber || !ticketNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Ticket number is required",
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Ticket number can be added only for confirmed bookings",
      });
    }

    booking.ticketNumber = ticketNumber.trim();
    booking.ticketNumberAddedBy = req.user?._id || req.user?.id || null;
    booking.ticketNumberAddedAt = new Date();

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Ticket number saved successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Update ticket number error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update ticket number",
      error: error.message,
    });
  }
};
