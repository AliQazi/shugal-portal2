import SabaoonGroupOverride from "../models/SabaoonGroupOverride.js";

// ─────────────────────────────────────────────────────────
// SHARED HELPER
// ─────────────────────────────────────────────────────────

export const fetchNormalisedSabaoonGroups = async (_type) => [];


// ─────────────────────────────────────────────────────────
// GET ALL GROUPS (public / frontend)
// ─────────────────────────────────────────────────────────

export const getSabaoonGroups = async (req, res) => {
  try {
    const groups = await fetchNormalisedSabaoonGroups(req.query.type);

    // Load admin overrides and build a lookup map
    const overrides = await SabaoonGroupOverride.find({}).lean();
    const overrideMap = Object.fromEntries(overrides.map((o) => [String(o.groupId), o]));

    // Filter out hidden groups; attach individualMargin when set
    const publicGroups = groups
      .filter((g) => !overrideMap[String(g.id)]?.isHidden)
      .map((g) => {
        const override = overrideMap[String(g.id)];
        return { ...g, individualMargin: override?.individualMargin ?? null };
      });

    return res.json({ success: true, data: publicGroups });
  } catch (error) {
    console.error("Error fetching Sabaoon groups:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to fetch groups from Sabaoon" });
  }
};

// ─────────────────────────────────────────────────────────
// GET ALL GROUPS (admin — includes hidden + override data)
// ─────────────────────────────────────────────────────────

export const getAdminSabaoonGroups = async (req, res) => {
  try {
    const groups = await fetchNormalisedSabaoonGroups(req.query.type);

    const overrides = await SabaoonGroupOverride.find({}).lean();
    const overrideMap = Object.fromEntries(overrides.map((o) => [String(o.groupId), o]));

    const adminGroups = groups.map((g) => {
      const override = overrideMap[String(g.id)];
      return {
        ...g,
        isHidden: override?.isHidden ?? false,
        individualMargin: override?.individualMargin ?? null,
      };
    });

    return res.json({ success: true, data: adminGroups });
  } catch (error) {
    console.error("Error fetching admin Sabaoon groups:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to fetch groups from Sabaoon" });
  }
};

// ─────────────────────────────────────────────────────────
// UPSERT GROUP OVERRIDE (admin)
// ─────────────────────────────────────────────────────────

export const upsertGroupOverride = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { isHidden, individualMargin } = req.body;

    const update = {};
    if (isHidden !== undefined) update.isHidden = Boolean(isHidden);
    if (individualMargin !== undefined) {
      // empty string or explicit null clears the margin
      update.individualMargin =
        individualMargin === "" || individualMargin === null || individualMargin == 0
          ? null
          : Number(individualMargin);
    }

    const override = await SabaoonGroupOverride.findOneAndUpdate(
      { groupId: String(groupId) },
      { $set: update },
      { upsert: true, new: true }
    );

    return res.json({ success: true, data: override });
  } catch (error) {
    console.error("Error upserting group override:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to update group override" });
  }
};

// ─────────────────────────────────────────────────────────
// CREATE BOOKING ON SABAOON
// ─────────────────────────────────────────────────────────

/**
 * Sends a booking to the Sabaoon API.
 *
 * @param {object} params
 * @param {string}   params.groupId          Sabaoon's numeric group_id
 * @param {string}   params.pnr              PNR string (may contain " / " for two PNRs)
 * @param {string}   params.bookingReference Our internal booking reference (used as roe)
 * @param {number}   params.adultsCount
 * @param {number}   params.childrenCount
 * @param {number}   params.infantsCount
 * @param {object[]} params.passengers       Passenger objects from our Booking model
 * @param {object}   params.pricing          Pricing object from our Booking model
 *
 * @returns {{ transactionId: number }} Sabaoon transaction_id
 */
export const createSabaoonBooking = async (_params) => {
  throw new Error("Sabaoon API integration is disabled");
};