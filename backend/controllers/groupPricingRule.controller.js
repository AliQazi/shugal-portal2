import GroupPricingRule from "../models/GroupPricingRule.js";
import UnifiedGroupCache from "../models/UnifiedGroupCache.js";

const KNOWN_PROVIDERS = [
  { key: "admin", label: "Admin (Own Groups)" },
  { key: "al-haider", label: "Al-Haider" },
  { key: "travel-network", label: "Travel Network" },
  { key: "skypass", label: "SkyPass" },
  { key: "mct", label: "MCT" },
];

/* ===============================
   GET /pricing-rules?scope=provider|sector|group
   List rules, optionally filtered by scope
=============================== */
export const getRules = async (req, res) => {
  try {
    const { scope } = req.query;
    const filter = scope ? { scope } : {};
    const rules = await GroupPricingRule.find(filter)
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    console.error("getRules error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   POST /pricing-rules
   Upsert a single rule: { scope, key, isHidden, margin, label }
=============================== */
export const upsertRule = async (req, res) => {
  try {
    const { scope, key, isHidden, margin, label } = req.body;

    if (!scope || !key) {
      return res
        .status(400)
        .json({ success: false, message: "scope and key are required" });
    }
    if (!["provider", "sector", "group"].includes(scope)) {
      return res.status(400).json({ success: false, message: "Invalid scope" });
    }

    const update = {};
    if (isHidden !== undefined) update.isHidden = !!isHidden;
    if (margin !== undefined) update.margin = Number(margin) || 0;
    if (label !== undefined) update.label = label;

    const rule = await GroupPricingRule.findOneAndUpdate(
      { scope, key },
      { $set: update, $setOnInsert: { scope, key } },
      { upsert: true, new: true },
    );

    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    console.error("upsertRule error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   POST /pricing-rules/bulk
   Upsert many at once: { rules: [{ scope, key, isHidden, margin, label }] }
   Handy for "save all" buttons in the admin table
=============================== */
export const bulkUpsertRules = async (req, res) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules) || rules.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "rules array is required" });
    }

    const ops = rules.map((r) => ({
      updateOne: {
        filter: { scope: r.scope, key: r.key },
        update: {
          $set: {
            ...(r.isHidden !== undefined && { isHidden: !!r.isHidden }),
            ...(r.margin !== undefined && { margin: Number(r.margin) || 0 }),
            ...(r.label !== undefined && { label: r.label }),
          },
          $setOnInsert: { scope: r.scope, key: r.key },
        },
        upsert: true,
      },
    }));

    const result = await GroupPricingRule.bulkWrite(ops);
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("bulkUpsertRules error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   DELETE /pricing-rules/:id
   Removing a rule resets that scope back to default (visible, 0 margin)
=============================== */
export const deleteRule = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await GroupPricingRule.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Rule not found" });
    }
    res.status(200).json({ success: true, message: "Rule removed" });
  } catch (error) {
    console.error("deleteRule error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===============================
   GET /pricing-rules/meta
   Returns the current list of providers + sectors so the admin UI
   always reflects what's actually present, even when a new sector
   appears from a provider feed.
=============================== */
export const getRulesMeta = async (req, res) => {
  try {
    const cacheDoc = await UnifiedGroupCache.findOne().lean();
    const adminData = cacheDoc?.data || [];

    // Sectors from admin cache (cheap, always available).
    // NOTE: this won't include sectors that ONLY exist in live provider
    // feeds (al-haider/travel-network/skypass) since those aren't cached.
    // If you need those too, have getUnifiedGroups write a lightweight
    // `distinctSectors`/`distinctProviders` snapshot to a small meta doc
    // on every call, and read that here instead.
    const sectorSet = new Set();
    adminData.forEach((g) => {
      if (g.sector) sectorSet.add(g.sector);
    });

    const existingRules = await GroupPricingRule.find({
      scope: "sector",
    }).lean();
    existingRules.forEach((r) => sectorSet.add(r.key));

    res.status(200).json({
      success: true,
      data: {
        providers: KNOWN_PROVIDERS,
        sectors: Array.from(sectorSet).sort(),
      },
    });
  } catch (error) {
    console.error("getRulesMeta error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
