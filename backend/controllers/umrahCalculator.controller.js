import UmrahCalculator from "../models/umrahCalculator.js";
import Booking from "../models/Booking.js";
import GroupTicketing from "../models/GroupTicketing.js";
import { generateVoucher } from "../utils/voucherGenerator.js";
import Voucher from "../models/voucher.js";
import mongoose from "mongoose";

const HOLD_DURATION = 2 * 60 * 60 * 1000; // 2 hours

// ➕ Create new Umrah Calculator record + Booking
export const createUmrahCalculator = async (req, res) => {
  try {
    const userId = req.user?._id;
    const {
      totalCost,
      selectedGroup: groupId,
      passengerCounts,
      passengerDetails,
      groupTicketPricing,
      visaDetails,
      transportList,
      roomType,
      hotelRooms,
      visaType,
    } = req.body;

    // For B2C users (logged out), userId might not exist
    const isB2C = !userId;

    console.log(req.body);
    // return;

    const adultsCount = passengerCounts?.adults || 0;
    const childrenCount = passengerCounts?.children || 0;
    const infantsCount = passengerCounts?.infants || 0;
    const totalPassengers = adultsCount + childrenCount + infantsCount;
    const seatCount = adultsCount + childrenCount;

    let group = null;
    let booking = null;

    const isLocalGroupTicket = mongoose.Types.ObjectId.isValid(groupId);

    // Only fetch local groups. Third-party API group ids are not Mongo ObjectIds.
    if (groupId && isLocalGroupTicket) {
      group = await GroupTicketing.findById(groupId);

      if (group && seatCount > group.totalSeats) {
        return res
          .status(400)
          .json({ success: false, message: "Not enough seats available" });
      }
    }

    const numericTotalCost = Number(String(totalCost || 0).replace(/,/g, ""));

    // Generate voucher for umrah calculator
    const voucher_id = await generateVoucher(
      "umrahcalculator",
      null,
      "UmrahCalculator",
    );

    // Build passengers array
    const passengers = (passengerDetails || []).map((p) => {
      const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
      const expiry = p.passportExpiry ? new Date(p.passportExpiry) : null;
      return {
        type: p.type || "Adult",
        title: p.title || "Mr",
        givenName: p.givenName || "",
        surName: p.surName || "",
        passport: p.passport || "",
        dateOfBirth: dob && !isNaN(dob) ? dob : null,
        passportExpiry: expiry && !isNaN(expiry) ? expiry : null,
        nationality: p.nationality || "Pakistani",
        email: p.email || "",
        phone: p.phone || "",
      };
    });

    // Build flights array only if group exists
    const flights =
      group?.flights?.map((f) => ({
        flightNo: f.flightNo,
        flightDate: f.depDate,
        depDate: f.depDate,
        depTime: f.depTime,
        origin: f.sectorFrom,
        destination: f.sectorTo,
        arrDate: f.arrDate,
        arrTime: f.arrTime,
        baggage: f.baggage,
        meal: f.meal,
      })) || [];

    // Calculate ticket pricing
    let adultPrice = 0,
      childPrice = 0,
      infantPrice = 0,
      grandTotal = 0;

    if (groupId && groupTicketPricing?.totalPrice) {
      // Ticket selected - use frontend calculated prices
      grandTotal = groupTicketPricing.totalPrice;
      adultPrice = groupTicketPricing.adultBasePrice || 0;
      childPrice = groupTicketPricing.childBasePrice || 0;
      infantPrice = groupTicketPricing.infantPrice || 0;
    } else {
      // No ticket selected - ticket cost is 0
      grandTotal = 0;
    }

    // Add visa cost to grand total
    if (visaDetails?.totalVisaCost) {
      grandTotal += visaDetails.totalVisaCost;
    }

    // Add transport cost to grand total
    if (transportList && transportList.length > 0) {
      const transportTotal = transportList.reduce(
        (sum, t) => sum + (Number(t.buyingRate) || 0),
        0,
      );
      grandTotal += transportTotal;
    }

    // Add hotel cost to grand total
    if (hotelRooms && hotelRooms.length > 0) {
      const hotelTotal = hotelRooms.reduce(
        (sum, room) => sum + (Number(room.totalCost) || 0),
        0,
      );
      grandTotal += hotelTotal;
    }

    let expiresAt = null;

    // Only create booking if a ticket is selected (for seat holding)
    if (groupId && group) {
      expiresAt = new Date(Date.now() + HOLD_DURATION);

      // Create the Booking
      booking = await Booking.create({
        groupId: group._id.toString(),
        groupType: group.groupCategory || "Umrah Groups",
        airline: {
          id: null,
          name: group.airline || "",
          logoUrl: null,
        },
        sector: group.sector || "",
        pnr: group.pnr || "",
        contactPersonName: passengers[0]
          ? `${passengers[0].givenName} ${passengers[0].surName}`
          : "N/A",
        adultsCount,
        childrenCount,
        infantsCount,
        totalPassengers,
        pricing: {
          adultPrice,
          childPrice,
          infantPrice,
          adultTotal: adultsCount * adultPrice,
          childTotal: childrenCount * childPrice,
          infantTotal: infantsCount * infantPrice,
          grandTotal: groupTicketPricing?.totalPrice || 0,
        },
        passengers,
        flights,
        departureDate: group.flights?.[0]?.depDate || new Date(),
        arrivalDate: group.flights?.[group.flights.length - 1]?.arrDate || null,
        userId: userId || null,
        status: "on hold",
        expiresAt,
      });

      // Deduct seats from GroupTicketing
      await GroupTicketing.updateOne(
        { _id: groupId },
        { $inc: { totalSeats: -seatCount } },
      );
    }

    // Create UmrahCalculator record with all details
    const umrahCalculatorData = {
      visaType: visaType || "",
      selectedGroup: isLocalGroupTicket ? groupId : null,
      selectedGroupExternalId: groupId && !isLocalGroupTicket ? groupId : "",
      passengerDetails,
      passengerCounts,
      totalCost: numericTotalCost,
      grandTotal: grandTotal,
      groupTicketPricing:
        groupId && groupTicketPricing
          ? {
              totalPrice: groupTicketPricing.totalPrice || 0,
              adultBasePrice: groupTicketPricing.adultBasePrice || 0,
              childBasePrice: groupTicketPricing.childBasePrice || 0,
              infantPrice: groupTicketPricing.infantPrice || 0,
              currency: groupTicketPricing.currency || "PKR",
            }
          : undefined,
      roomType,
      hotelRooms: (hotelRooms || [])
        .filter((r) => r.city && r.hotel && r.type)
        .map((room) => ({
          city: room.city,
          hotel: room.hotel,
          rooms: room.rooms,
          occupancy: room.occupancy || 1,
          type: room.type,
          startDate: room.startDate,
          endDate: room.endDate,
          dateFormatVersion: room.dateFormatVersion || "",
          pricePerRoom: room.pricePerRoom,
          totalCost: room.totalCost,
        })),
      transportList: (transportList || []).map((t) => ({
        route: t.route,
        selectTransport: t.selectTransport,
        buyingRate: t.buyingRate,
      })),
      visaDetails: {
        adults: visaDetails?.adults || adultsCount,
        children: visaDetails?.children || childrenCount,
        infants: visaDetails?.infants || infantsCount,
        adultVisaSelling: visaDetails?.adultVisaSelling || 0,
        childVisaSelling: visaDetails?.childVisaSelling || 0,
        infantVisaSelling: visaDetails?.infantVisaSelling || 0,
        totalVisaCost: visaDetails?.totalVisaCost || 0,
      },
      user: userId || null,
      voucher_id,
      bookingRef: booking?._id || null,
      hasTicket: !!groupId,
    };

    // Add contact info for B2C users
    if (isB2C && passengers.length > 0) {
      umrahCalculatorData.contactEmail = passengers[0].email || "";
      umrahCalculatorData.contactPhone = passengers[0].phone || "";
    }

    const umrahCalculator = new UmrahCalculator(umrahCalculatorData);
    await umrahCalculator.save();

    // Update voucher with booking reference
    if (voucher_id) {
      await Voucher.findOneAndUpdate(
        { voucher_id },
        { booking_ref: umrahCalculator._id },
        { new: true },
      );
    }

    res.status(201).json({
      success: true,
      message: isB2C
        ? "Booking inquiry submitted successfully! Our team will contact you soon."
        : "Umrah Calculator record created successfully",
      data: umrahCalculator,
      booking,
    });
  } catch (error) {
    console.error("Error in createUmrahCalculator:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// 📥 Get all Umrah Calculator records
export const getAllUmrahCalculators = async (req, res) => {
  try {
    const records = await UmrahCalculator.find()
      .populate("user", "name email phone companyName")
      .populate("selectedGroup")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error("Error in getAllUmrahCalculators:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// 📥 Get Umrah Calculator records by user ID
export const getUmrahCalculationsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    const calculations = await UmrahCalculator.find({ user: userId })
      .populate("user", "name email phone companyName")
      .populate("selectedGroup")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: calculations });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error fetching user umrah calculations",
    });
  }
};

// 📥 Get single Umrah Calculator record by ID
export const getUmrahCalculatorById = async (req, res) => {
  try {
    const id = req.params.id || req.user._id;
    const record = await UmrahCalculator.findById(id)
      .populate("user")
      .populate("selectedGroup");

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("Error in getUmrahCalculatorById:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ✏️ Update Umrah Calculator record
export const updateUmrahCalculator = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Get the current record first to check for status changes
    const currentRecord = await UmrahCalculator.findById(id);
    if (!currentRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    const previousStatus = currentRecord.status;
    const statusChanged = status && status !== previousStatus;

    // Update the umrah calculator record
    const record = await UmrahCalculator.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    // If status was changed, handle booking status and seat adjustments
    if (statusChanged && record.bookingRef) {
      const allowedStatuses = ["On Process", "Cancel", "Confirm", "Pending"];

      if (allowedStatuses.includes(status)) {
        let bookingStatus = null;

        if (status === "Cancel") {
          bookingStatus = "cancelled";

          // Return seats to GroupTicketing (only if not already cancelled)
          if (previousStatus !== "Cancel") {
            const adultsCount = record.passengerCounts?.adults || 0;
            const childrenCount = record.passengerCounts?.children || 0;
            // Infants don't count as seats
            const seatCount = adultsCount + childrenCount;

            await GroupTicketing.updateOne(
              { _id: record.selectedGroup },
              { $inc: { totalSeats: seatCount } },
            );
          }
        } else if (status === "Confirm") {
          bookingStatus = "confirmed";
          // No seat adjustment needed - seats were already deducted during creation
        } else if (status === "On Process" || status === "Pending") {
          bookingStatus = "on hold";
        }

        // Update the corresponding booking status
        if (bookingStatus) {
          await Booking.updateOne(
            { _id: record.bookingRef },
            { status: bookingStatus },
          );

          // Handle credit management for B2B umrah bookings
          if (record.user) {
            const booking = await Booking.findById(record.bookingRef);
            if (booking) {
              const amount = booking.pricing.grandTotal;
              let creditDiff = 0;

              // Check if it's B2B (has userId and not B2C)
              const isB2BBooking = booking.userId && !booking.isB2C;

              if (isB2BBooking) {
                // Get the old booking status to compare
                const oldBookingStatus =
                  previousStatus === "Confirm"
                    ? "confirmed"
                    : previousStatus === "Cancel"
                      ? "cancelled"
                      : "on hold";

                // Deduct credit when moving TO confirmed status
                if (
                  bookingStatus === "confirmed" &&
                  oldBookingStatus !== "confirmed"
                ) {
                  creditDiff = -amount;
                }

                // Refund credit when moving FROM confirmed to any other status
                if (
                  oldBookingStatus === "confirmed" &&
                  bookingStatus !== "confirmed"
                ) {
                  creditDiff = amount;
                }

                // Update agent credit balance
                if (creditDiff !== 0) {
                  const Register = (await import("../models/Register.js"))
                    .default;
                  await Register.updateOne(
                    { _id: booking.userId },
                    { $inc: { creditAmount: creditDiff } },
                  );
                }
              }
            }
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Record updated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error in updateUmrahCalculator:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// 🗑 Delete Umrah Calculator record
export const deleteUmrahCalculator = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await UmrahCalculator.findByIdAndDelete(id);

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUmrahCalculator:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// 🔄 Update Umrah Calculator status
export const updateUmrahStatusController = async (req, res) => {
  try {
    const { umrahId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["On Process", "Cancel", "Confirm", "Pending"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    // Find the umrah calculator record first
    const umrahRecord = await UmrahCalculator.findById(umrahId);
    if (!umrahRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Umrah Calculator record not found" });
    }

    // Store previous status to check if we need to adjust seats
    const previousStatus = umrahRecord.status;

    // Update the umrah calculator status
    umrahRecord.status = status;
    await umrahRecord.save();

    // Handle booking status and seat adjustments
    if (umrahRecord.bookingRef) {
      let bookingStatus = null;

      if (status === "Cancel") {
        bookingStatus = "cancelled";

        // Return seats to GroupTicketing (only if not already cancelled)
        if (previousStatus !== "Cancel") {
          const adultsCount = umrahRecord.passengerCounts?.adults || 0;
          const childrenCount = umrahRecord.passengerCounts?.children || 0;
          // Infants don't count as seats
          const seatCount = adultsCount + childrenCount;

          await GroupTicketing.updateOne(
            { _id: umrahRecord.selectedGroup },
            { $inc: { totalSeats: seatCount } },
          );
        }
      } else if (status === "Confirm") {
        bookingStatus = "confirmed";
        // No seat adjustment needed - seats were already deducted during creation
      } else if (status === "On Process" || status === "Pending") {
        bookingStatus = "on hold";
      }

      // Update the corresponding booking status
      if (bookingStatus) {
        await Booking.updateOne(
          { _id: umrahRecord.bookingRef },
          { status: bookingStatus },
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Umrah Calculator status updated successfully",
      data: umrahRecord,
    });
  } catch (error) {
    console.error("Error in updateUmrahStatusController:", error);
    res.status(500).json({
      success: false,
      message: "Error while updating umrah status",
      error: error.message,
    });
  }
};

/* =========================================================
   CREATE PUBLIC UMRAH CALCULATOR (B2C - No Authentication Required)
========================================================= */
export const createPublicUmrahCalculator = async (req, res) => {
  try {
    const {
      totalCost,
      selectedGroup: groupId,
      passengerCounts,
      passengerDetails,
      contactEmail,
      contactPhone,
      groupTicketPricing,
      visaDetails,
      transportList,
      roomType,
      hotelRooms,
      visaType,
    } = req.body;

    let group = null;
    let booking = null;

    const adultsCount = passengerCounts?.adults || 0;
    const childrenCount = passengerCounts?.children || 0;
    const infantsCount = passengerCounts?.infants || 0;
    const totalPassengers = adultsCount + childrenCount + infantsCount;
    const seatCount = adultsCount + childrenCount;

    const isLocalGroupTicket = mongoose.Types.ObjectId.isValid(groupId);

    if (groupId && !isLocalGroupTicket) {
      if (totalPassengers !== 1) {
        return res.status(400).json({
          success: false,
          message: "Guest bookings are limited to one passenger only",
        });
      }

      const numericTotalCost = Number(String(totalCost || 0).replace(/,/g, ""));
      const voucher_id = await generateVoucher(
        "umrahcalculator",
        null,
        "UmrahCalculator",
      );

      const passengers = (passengerDetails || []).map((p) => {
        const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
        const expiry = p.passportExpiry ? new Date(p.passportExpiry) : null;
        return {
          type: p.type || "Adult",
          title: p.title || "Mr",
          givenName: p.givenName || p.name?.split(" ")[0] || "",
          surName: p.surName || p.name?.split(" ").slice(1).join(" ") || "",
          passport: p.passport || "",
          dateOfBirth: dob && !isNaN(dob) ? dob : null,
          passportExpiry: expiry && !isNaN(expiry) ? expiry : null,
          nationality: p.nationality || "Pakistani",
        };
      });

      const duplicateChecks = [];
      if (passengers[0]?.passport) {
        duplicateChecks.push({ "passengers.passport": passengers[0].passport });
      }
      if (contactEmail) duplicateChecks.push({ contactEmail });
      if (contactPhone) duplicateChecks.push({ contactPhone });

      if (duplicateChecks.length > 0) {
        const existingB2CBooking = await Booking.findOne({
          isB2C: true,
          status: { $ne: "cancelled" },
          $or: duplicateChecks,
        });

        if (existingB2CBooking) {
          return res.status(400).json({
            success: false,
            message: "This B2C customer already has a booking",
          });
        }
      }

      let grandTotal = groupTicketPricing?.totalPrice || 0;
      if (visaDetails?.totalVisaCost) grandTotal += visaDetails.totalVisaCost;
      if (transportList?.length > 0) {
        grandTotal += transportList.reduce(
          (sum, t) => sum + (Number(t.buyingRate) || 0),
          0,
        );
      }
      if (hotelRooms?.length > 0) {
        grandTotal += hotelRooms.reduce(
          (sum, room) => sum + (Number(room.totalCost) || 0),
          0,
        );
      }

      const umrahCalculatorData = {
        visaType: visaType || "",
        selectedGroup: null,
        selectedGroupExternalId: groupId,
        passengerDetails,
        passengerCounts,
        totalCost: numericTotalCost,
        grandTotal,
        groupTicketPricing: groupTicketPricing
          ? {
              totalPrice: groupTicketPricing.totalPrice || 0,
              adultBasePrice: groupTicketPricing.adultBasePrice || 0,
              childBasePrice: groupTicketPricing.childBasePrice || 0,
              infantPrice: groupTicketPricing.infantPrice || 0,
              currency: groupTicketPricing.currency || "PKR",
            }
          : undefined,
        roomType,
        hotelRooms: (hotelRooms || [])
          .filter((r) => r.city && r.hotel && r.type)
          .map((room) => ({
            city: room.city,
            hotel: room.hotel,
            rooms: room.rooms,
            occupancy: room.occupancy || 1,
            type: room.type,
            startDate: room.startDate,
            endDate: room.endDate,
            dateFormatVersion: room.dateFormatVersion || "",
            pricePerRoom: room.pricePerRoom,
            totalCost: room.totalCost,
          })),
        transportList: (transportList || []).map((t) => ({
          route: t.route,
          selectTransport: t.selectTransport,
          buyingRate: t.buyingRate,
        })),
        visaDetails: {
          adults: visaDetails?.adults || adultsCount,
          children: visaDetails?.children || childrenCount,
          infants: visaDetails?.infants || infantsCount,
          adultVisaSelling: visaDetails?.adultVisaSelling || 0,
          childVisaSelling: visaDetails?.childVisaSelling || 0,
          infantVisaSelling: visaDetails?.infantVisaSelling || 0,
          totalVisaCost: visaDetails?.totalVisaCost || 0,
        },
        user: null,
        isB2C: true,
        voucher_id,
        bookingRef: null,
        hasTicket: true,
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || "",
      };

      const umrahCalculator = new UmrahCalculator(umrahCalculatorData);
      await umrahCalculator.save();

      if (voucher_id) {
        await Voucher.findOneAndUpdate(
          { voucher_id },
          { booking_ref: umrahCalculator._id },
          { new: true },
        );
      }

      return res.status(201).json({
        success: true,
        message: "Booking inquiry submitted! Our team will contact you soon.",
        data: umrahCalculator,
        booking: null,
      });
    }

    if (groupId && isLocalGroupTicket) {
      group = await GroupTicketing.findById(groupId);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Selected group ticket not found" });
      }
      if (seatCount > group.totalSeats) {
        return res
          .status(400)
          .json({ success: false, message: "Not enough seats available" });
      }
      if (totalPassengers !== 1) {
        return res.status(400).json({
          success: false,
          message: "Guest bookings are limited to one passenger only",
        });
      }

      if (seatCount > group.totalSeats) {
        return res
          .status(400)
          .json({ success: false, message: "Not enough seats available" });
      }

      const numericTotalCost = Number(String(totalCost || 0).replace(/,/g, ""));
      const voucher_id = await generateVoucher(
        "umrahcalculator",
        null,
        "UmrahCalculator",
      );

      const passengers = (passengerDetails || []).map((p) => {
        const dob = p.dateOfBirth ? new Date(p.dateOfBirth) : null;
        const expiry = p.passportExpiry ? new Date(p.passportExpiry) : null;
        return {
          type: p.type || "Adult",
          title: p.title || "Mr",
          givenName: p.givenName || p.name?.split(" ")[0] || "",
          surName: p.surName || p.name?.split(" ").slice(1).join(" ") || "",
          passport: p.passport || "",
          dateOfBirth: dob && !isNaN(dob) ? dob : null,
          passportExpiry: expiry && !isNaN(expiry) ? expiry : null,
          nationality: p.nationality || "Pakistani",
        };
      });

      let adultPrice = 0,
        childPrice = 0,
        infantPrice = 0,
        grandTotal = 0;
      const duplicateChecks = [];
      if (passengers[0]?.passport) {
        duplicateChecks.push({ "passengers.passport": passengers[0].passport });
      }
      if (contactEmail) duplicateChecks.push({ contactEmail });
      if (contactPhone) duplicateChecks.push({ contactPhone });

      if (duplicateChecks.length > 0) {
        const existingB2CBooking = await Booking.findOne({
          isB2C: true,
          status: { $ne: "cancelled" },
          $or: duplicateChecks,
        });

        if (existingB2CBooking) {
          return res.status(400).json({
            success: false,
            message: "This B2C customer already has a booking",
          });
        }
      }

      // Build flights array for Booking
      const flights = (group.flights || []).map((f) => ({
        flightNo: f.flightNo,
        flightDate: f.depDate,
        depDate: f.depDate,
        depTime: f.depTime,
        origin: f.sectorFrom,
        destination: f.sectorTo,
        arrDate: f.arrDate,
        arrTime: f.arrTime,
        baggage: f.baggage,
        meal: f.meal,
      }));

      if (groupId && group) {
        const flights = (group.flights || []).map((f) => ({
          flightNo: f.flightNo,
          flightDate: f.depDate,
          depDate: f.depDate,
          depTime: f.depTime,
          origin: f.sectorFrom,
          destination: f.sectorTo,
          arrDate: f.arrDate,
          arrTime: f.arrTime,
          baggage: f.baggage,
          meal: f.meal,
        }));

        if (groupTicketPricing?.totalPrice) {
          grandTotal = groupTicketPricing.totalPrice;
          adultPrice = groupTicketPricing.adultBasePrice || 0;
          childPrice = groupTicketPricing.childBasePrice || 0;
          infantPrice = groupTicketPricing.infantPrice || 0;
        } else {
          adultPrice = group.price?.sellingAdultPriceB2B || 0;
          childPrice = group.price?.sellingChildPriceB2B || 0;
          infantPrice = group.price?.sellingInfantPriceB2B || 0;
          grandTotal =
            adultsCount * adultPrice +
            childrenCount * childPrice +
            infantsCount * infantPrice;
        }

        const expiresAt = new Date(Date.now() + HOLD_DURATION);
        booking = await Booking.create({
          groupId: group._id.toString(),
          groupType: group.groupCategory || "Umrah Groups",
          airline: { id: null, name: group.airline || "", logoUrl: null },
          sector: group.sector || "",
          pnr: group.pnr || "",
          contactPersonName: passengers[0]
            ? `${passengers[0].givenName} ${passengers[0].surName}`
            : "N/A",
          contactEmail: contactEmail || "",
          contactPhone: contactPhone || "",
          adultsCount,
          childrenCount,
          infantsCount,
          totalPassengers,
          pricing: {
            adultPrice,
            childPrice,
            infantPrice,
            adultTotal: adultsCount * adultPrice,
            childTotal: childrenCount * childPrice,
            infantTotal: infantsCount * infantPrice,
            grandTotal,
          },
          passengers,
          flights,
          departureDate: group.flights?.[0]?.depDate || new Date(),
          arrivalDate:
            group.flights?.[group.flights.length - 1]?.arrDate || null,
          userId: null,
          status: "on hold",
          isB2C: true,
          expiresAt,
        });

        await GroupTicketing.updateOne(
          { _id: groupId },
          { $inc: { totalSeats: -seatCount } },
        );
      }

      if (visaDetails?.totalVisaCost) grandTotal += visaDetails.totalVisaCost;
      if (transportList?.length > 0) {
        grandTotal += transportList.reduce(
          (sum, t) => sum + (Number(t.buyingRate) || 0),
          0,
        );
      }
      if (hotelRooms?.length > 0) {
        grandTotal += hotelRooms.reduce(
          (sum, room) => sum + (Number(room.totalCost) || 0),
          0,
        );
      }

      const umrahCalculatorData = {
        visaType: visaType || "",
        selectedGroup: isLocalGroupTicket ? groupId : null,
        selectedGroupExternalId: groupId && !isLocalGroupTicket ? groupId : "",
        passengerDetails,
        passengerCounts,
        totalCost: numericTotalCost,
        grandTotal,
        groupTicketPricing:
          groupId && groupTicketPricing
            ? {
                totalPrice: groupTicketPricing.totalPrice || 0,
                adultBasePrice: groupTicketPricing.adultBasePrice || 0,
                childBasePrice: groupTicketPricing.childBasePrice || 0,
                infantPrice: groupTicketPricing.infantPrice || 0,
                currency: groupTicketPricing.currency || "PKR",
              }
            : undefined,
        roomType,
        hotelRooms: (hotelRooms || [])
          .filter((r) => r.city && r.hotel && r.type)
          .map((room) => ({
            city: room.city,
            hotel: room.hotel,
            rooms: room.rooms,
            type: room.type,
            startDate: room.startDate,
            endDate: room.endDate,
            dateFormatVersion: room.dateFormatVersion || "",
            pricePerRoom: room.pricePerRoom,
            totalCost: room.totalCost,
          })),
        transportList: (transportList || []).map((t) => ({
          route: t.route,
          selectTransport: t.selectTransport,
          buyingRate: t.buyingRate,
        })),
        visaDetails: {
          adults: visaDetails?.adults || adultsCount,
          children: visaDetails?.children || childrenCount,
          infants: visaDetails?.infants || infantsCount,
          adultVisaSelling: visaDetails?.adultVisaSelling || 0,
          childVisaSelling: visaDetails?.childVisaSelling || 0,
          infantVisaSelling: visaDetails?.infantVisaSelling || 0,
          totalVisaCost: visaDetails?.totalVisaCost || 0,
        },
        user: null,
        isB2C: true,
        voucher_id,
        bookingRef: booking?._id || null,
        hasTicket: !!groupId,
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || "",
      };

      const umrahCalculator = new UmrahCalculator(umrahCalculatorData);
      await umrahCalculator.save();

      if (voucher_id) {
        await Voucher.findOneAndUpdate(
          { voucher_id },
          { booking_ref: umrahCalculator._id },
          { new: true },
        );
      }

      res.status(201).json({
        success: true,
        message: "Booking inquiry submitted! Our team will contact you soon.",
        data: umrahCalculator,
        booking,
      });
    }
  } catch (error) {
    console.error("B2C Umrah Calculator error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
