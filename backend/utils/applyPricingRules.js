import GroupPricingRule from "../models/GroupPricingRule.js";

export const applyPricingRules = async (combinedData) => {
  const rules = await GroupPricingRule.find().lean();

  const providerRules = {};
  const sectorRules = {};
  const groupRules = {};

  for (const r of rules) {
    if (r.scope === "provider") providerRules[r.key] = r;
    else if (r.scope === "sector") sectorRules[r.key] = r;
    else if (r.scope === "group") groupRules[r.key] = r;
  }

  const result = [];

  for (const g of combinedData) {
    const providerRule = providerRules[g.source];
    const sectorRule = sectorRules[g.sector];
    const groupKey = `${g.source}:${g.id}`;
    const groupRule = groupRules[groupKey];

    // Hidden at ANY level wins
    const isHidden =
      !!providerRule?.isHidden ||
      !!sectorRule?.isHidden ||
      !!groupRule?.isHidden;

    if (isHidden) continue; // drop it from the response entirely

    // Margins STACK — provider markup + sector markup + this specific group's markup
    const totalMargin =
      (providerRule?.margin || 0) +
      (sectorRule?.margin || 0) +
      (groupRule?.margin || 0);

    if (totalMargin !== 0) {
      result.push({
        ...g,
        price: (g.price || 0) + totalMargin,
        childPrice:
          g.childPrice != null ? g.childPrice + totalMargin : g.childPrice,
        infantPrice:
          g.infantPrice != null ? g.infantPrice + totalMargin : g.infantPrice,
        _appliedMargin: totalMargin,
        // Preserve original supplier prices so booking form can store them as basePrice
        _supplierPrice: g.price || 0,
        _supplierChildPrice: g.childPrice ?? null,
        _supplierInfantPrice: g.infantPrice ?? null,
      });
    } else {
      result.push(g);
    }
  }

  return result;
};
