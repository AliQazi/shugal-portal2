import UnifiedGroupCache from "../models/UnifiedGroupCache.js";

export const deductSeatsFromCache = async (groupId, seatCount) => {
  try {
    const normalizedId = String(groupId);
    const cacheDoc = await UnifiedGroupCache.findOne();
    if (!cacheDoc) return;

    let updated = false;

    cacheDoc.data = cacheDoc.data.map((group) => {
      const cacheGroupId = String(group.id);
      if (cacheGroupId === normalizedId) {
        const newSeats = (group.available_no_of_pax || 0) - seatCount;
        updated = true;
        return {
          ...group,
          available_no_of_pax: Math.max(0, newSeats),
        };
      }
      return group;
    });

    if (updated) {
      cacheDoc.markModified("data");
      await cacheDoc.save();
    }
  } catch (err) {
    console.error("Cache seat deduction failed:", err.message);
    // non-blocking — don't throw
  }
};
