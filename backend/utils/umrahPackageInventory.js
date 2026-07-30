import GroupTicketing from "../models/umrahPackgemodel.js";

const getTotalRoomsForBooking = (booking) =>
  booking?.passengerCount?.total || booking?.passengers?.length || 0;

export const restockUmrahPackageRooms = async (booking) => {
  if (!booking || !booking.packageId) return null;

  //   const totalRoomsToRestore = getTotalRoomsForBooking(booking);
  //   if (!totalRoomsToRestore || totalRoomsToRestore <= 0) return null;

  //   const linkedPackage = await GroupTicketing.findById(booking.packageId);
  //   if (!linkedPackage) return null;

  //   return GroupTicketing.findByIdAndUpdate(
  //     booking.packageId,
  //     { $inc: { availableRooms: totalRoomsToRestore } },
  //     { new: true },
  //   );
};

export const reserveUmrahPackageRooms = async (booking) => {
  if (!booking || !booking.packageId) return null;

  //   const totalRoomsToReserve = getTotalRoomsForBooking(booking);
  //   if (!totalRoomsToReserve || totalRoomsToReserve <= 0) return null;

  //   const linkedPackage = await GroupTicketing.findById(booking.packageId);
  //   if (!linkedPackage) return null;

  //   if (linkedPackage.availableRooms < totalRoomsToReserve) {
  //     throw new Error(
  //       "Unable to reserve package rooms. The selected package may have insufficient availability.",
  //     );
  //   }

  //   return GroupTicketing.findByIdAndUpdate(
  //     booking.packageId,
  //     { $inc: { availableRooms: -totalRoomsToReserve } },
  //     { new: true },
  //   );
};
