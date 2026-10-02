// Seat counting for Group Ticket bookings (Booking collection).
//
// A refund only records the passenger's index in `refundedPassengerIndices`;
// adultsCount/childrenCount stay as booked because pricing, PDFs and ledger
// entries are built from them. Seats must still be freed, so every seat count
// goes through these stages: refunded passengers are subtracted by type.
// Infants never occupy seats, but are tracked so the infant tally stays right.

const refundedOfType = (type) => ({
  $size: {
    $filter: {
      input: { $ifNull: ["$refundedPassengerIndices", []] },
      as: "idx",
      cond: {
        $eq: [{ $arrayElemAt: [{ $ifNull: ["$passengers.type", []] }, "$$idx"] }, type],
      },
    },
  },
});

// Adds _refundedAdults / _refundedChildren / _refundedInfants to each booking.
export const REFUND_COUNTS_STAGE = {
  $addFields: {
    _refundedAdults: refundedOfType("Adult"),
    _refundedChildren: refundedOfType("Child"),
    _refundedInfants: refundedOfType("Infant"),
  },
};

const activeCount = (countField, refundedField) => ({
  $max: [
    0,
    { $subtract: [{ $ifNull: [countField, 0] }, `$${refundedField}`] },
  ],
});

// Use after REFUND_COUNTS_STAGE: counts of non-refunded passengers per booking.
export const ACTIVE_ADULTS = activeCount("$adultsCount", "_refundedAdults");
export const ACTIVE_CHILDREN = activeCount("$childrenCount", "_refundedChildren");
export const ACTIVE_INFANTS = activeCount("$infantsCount", "_refundedInfants");
export const ACTIVE_SEATS = { $add: [ACTIVE_ADULTS, ACTIVE_CHILDREN] };

// Same rule for a single already-loaded booking (plain object or document).
export const getActiveSeatCounts = (booking) => {
  const types = (booking.passengers || []).map((p) => p.type);
  const refunded = { Adult: 0, Child: 0, Infant: 0 };
  (booking.refundedPassengerIndices || []).forEach((i) => {
    if (types[i] in refunded) refunded[types[i]] += 1;
  });
  const adults = Math.max(0, (booking.adultsCount || 0) - refunded.Adult);
  const children = Math.max(0, (booking.childrenCount || 0) - refunded.Child);
  const infants = Math.max(0, (booking.infantsCount || 0) - refunded.Infant);
  return { adults, children, infants, seats: adults + children };
};
