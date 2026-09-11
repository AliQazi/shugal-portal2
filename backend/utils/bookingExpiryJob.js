import Booking from "../models/Booking.js";
import GroupTicketing from "../models/GroupTicketing.js";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import { restockUmrahPackageRooms } from "../utils/umrahPackageInventory.js";

export const startBookingExpiryJob = () => {
  setInterval(async () => {
    try {
      const expiredBookings = await Booking.find({
        status: { $in: ["on hold", "pending", "partially confirmed"] },
        expiresAt: { $lte: new Date() },
      });

      for (const booking of expiredBookings) {
        console.log("Running booking expiry job...");
        if (booking.inventoryDeducted) {
          const claimed = await Booking.updateOne(
            { _id: booking._id, inventoryDeducted: true, status: { $ne: "cancelled" } },
            { $set: { inventoryDeducted: false } },
          );
          if (!claimed.modifiedCount) continue;
          await GroupTicketing.updateOne(
            { _id: booking.groupId },
            { $inc: { totalSeats: booking.adultsCount + booking.childrenCount } },
          );
          booking.inventoryDeducted = false;
        }
        booking.status = "cancelled";
        booking.expiresAt = null;
        booking.cancelledAt = new Date();
        booking.autoCancelled = true;
        await booking.save();

        // const seatsToReturn = booking.adultsCount + booking.childrenCount;

        // await GroupTicketing.updateOne(
        //   { _id: booking.groupId },
        //   { $inc: { totalSeats: seatsToReturn } },
        // );

        console.log(`Auto-cancelled booking ${booking._id}`);
      }

      const expiredUmrahBookings = await UmrahPackageBooking.find({
        overallStatus: { $in: ["On Hold", "Pending"] },
        expiresAt: { $lte: new Date() },
      });

      for (const booking of expiredUmrahBookings) {
        booking.overallStatus = "Cancelled";
        booking.expiresAt = null;
        await restockUmrahPackageRooms(booking);
        await booking.save();

        console.log(`Auto-cancelled Umrah package booking ${booking._id}`);
      }
    } catch (err) {
      console.error("Expiry job error:", err);
    }
  }, 60 * 1000); // runs every 1 minute
};
