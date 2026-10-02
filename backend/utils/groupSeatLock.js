import crypto from "crypto";
import Booking from "../models/Booking.js";
import GroupTicketing from "../models/GroupTicketing.js";
import UmrahPackage from "../models/umrahPackgemodel.js";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import SeatLock from "../models/SeatLock.js";

const LOCK_TTL_MS = 20 * 1000;
const LOCK_WAIT_MS = 15 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const seatsError = (message, code) => {
  const err = new Error(message);
  err.status = 409;
  err.code = code;
  return err;
};

/**
 * Takes the per-group booking lock, waiting briefly if another booking for the
 * same group is being created. Returns an async release() function.
 *
 * Works across multiple server instances because the lock lives in MongoDB:
 * the upsert only matches a missing/expired lock, and a live lock makes the
 * upsert's insert hit a duplicate _id (E11000), which means "busy, retry".
 */
export const acquireGroupSeatLock = async (groupId) => {
  const key = String(groupId);
  const token = crypto.randomUUID();
  const deadline = Date.now() + LOCK_WAIT_MS;

  for (;;) {
    try {
      const now = Date.now();
      const lock = await SeatLock.findOneAndUpdate(
        { _id: key, expiresAt: { $lt: new Date(now) } },
        { $set: { token, expiresAt: new Date(now + LOCK_TTL_MS) } },
        { upsert: true, new: true },
      );
      if (lock?.token === token) {
        return async () => {
          await SeatLock.deleteOne({ _id: key, token }).catch(() => {});
        };
      }
    } catch (err) {
      if (err?.code !== 11000) throw err; // 11000 = lock currently held
    }

    if (Date.now() > deadline) {
      throw seatsError(
        "Many bookings are being processed for this group right now. Please try again in a moment.",
        "SEAT_LOCK_BUSY",
      );
    }
    await sleep(40 + Math.floor(Math.random() * 60));
  }
};

const sumSeats = (rows) => rows[0]?.seats || 0;

/**
 * Seats already taken on a group ticket by non-cancelled bookings: direct Group
 * Ticket bookings plus Umrah Package bookings of packages linked to the ticket.
 * Mirrors getBookedSeats (the figure the listings subtract from capacity).
 */
export const getGroupBookedSeats = async (groupId) => {
  const gid = String(groupId);

  const [directRows, linkedPackages] = await Promise.all([
    Booking.aggregate([
      { $match: { groupId: gid, status: { $nin: ["cancelled"] } } },
      {
        $group: {
          _id: null,
          seats: {
            $sum: {
              $add: [
                { $ifNull: ["$adultsCount", 0] },
                { $ifNull: ["$childrenCount", 0] },
              ],
            },
          },
        },
      },
    ]),
    UmrahPackage.find({ selectedGroupTicketId: gid }).select("_id").lean(),
  ]);

  let umrahSeats = 0;
  if (linkedPackages.length) {
    const umrahRows = await UmrahPackageBooking.aggregate([
      {
        $match: {
          packageId: { $in: linkedPackages.map((pkg) => String(pkg._id)) },
          overallStatus: { $nin: ["Cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          seats: {
            $sum: {
              $add: [
                { $ifNull: ["$passengerCount.adults", 0] },
                { $ifNull: ["$passengerCount.children", 0] },
              ],
            },
          },
        },
      },
    ]);
    umrahSeats = sumSeats(umrahRows);
  }

  return sumSeats(directRows) + umrahSeats;
};

/**
 * Throws a 409 if the group ticket cannot take `seats` more passengers.
 * Call it while holding the group's seat lock.
 *
 * `product` is who is asking, and picks the capacity the listings use:
 * "Group Ticket" -> totalSeatsAfterPartial, "Umrah Package" -> totalSeats.
 */
export const assertGroupSeatsAvailable = async ({ groupId, seats, product }) => {
  if (!seats || seats <= 0) return;

  const group = await GroupTicketing.findById(groupId)
    .select("totalSeats totalSeatsAfterPartial")
    .lean();
  if (!group) return; // not one of our own group tickets - nothing to check

  const capacity =
    product === "Umrah Package"
      ? Number(group.totalSeats) || 0
      : Number(group.totalSeatsAfterPartial) || 0;
  const remaining = capacity - (await getGroupBookedSeats(groupId));

  if (seats > remaining) {
    throw seatsError(
      `This ${product} is not available for booking: ${seats} seat(s) requested but only ${Math.max(0, remaining)} left. Another booking may have just taken the seats.`,
      "SEATS_UNAVAILABLE",
    );
  }
};
