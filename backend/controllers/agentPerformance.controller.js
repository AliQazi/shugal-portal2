import Booking from "../models/Booking.js";
import UmrahPackageBooking from "../models/UmrahPackageBooking.js";
import Register from "../models/Register.js";

// A booking counts as a "sale" once it is past hold/pending and not cancelled.
const GROUP_SOLD_STATUSES = ["confirmed", "partially confirmed"];
const UMRAH_SOLD_STATUSES = ["Confirmed", "In Progress", "Completed"];

const RANGE_DAYS = { "30d": 30, "90d": 90 };

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
};

// Explicit fromDate/toDate win over the preset range.
const getDateFilter = ({ range, fromDate, toDate }) => {
  const from = parseDate(fromDate);
  const to = parseDate(toDate, true);
  if (from || to) {
    const filter = {};
    if (from) filter.$gte = from;
    if (to) filter.$lte = to;
    return filter;
  }

  if (range === "month") {
    const now = new Date();
    return { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }
  const days = RANGE_DAYS[range];
  if (!days) return null; // "all"
  return { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
};

const canViewReport = (user) =>
  user.role === "Super Admin" ||
  user.role === "Admin" ||
  (Array.isArray(user.permissions) &&
    user.permissions.includes("dashboard_top_agents_report"));

/**
 * GET /api/bookings/reports/top-agents?range=all|30d|90d|month&fromDate=&toDate=&limit=10
 * (fromDate/toDate are inclusive, on booking creation date, and override range)
 * Ranks agents by revenue across sold Group Ticket + Umrah Package bookings.
 */
export const getTopAgentsReport = async (req, res) => {
  try {
    if (!canViewReport(req.user)) {
      return res
        .status(403)
        .json({ success: false, message: "Not allowed to view this report" });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const dateFilter = getDateFilter(req.query);

    const groupMatch = { status: { $in: GROUP_SOLD_STATUSES } };
    const umrahMatch = { overallStatus: { $in: UMRAH_SOLD_STATUSES } };
    if (dateFilter) {
      groupMatch.createdAt = dateFilter;
      umrahMatch.createdAt = dateFilter;
    }

    const [groupRows, umrahRows] = await Promise.all([
      Booking.aggregate([
        { $match: groupMatch },
        {
          $group: {
            _id: { $toString: "$userId" },
            bookings: { $sum: 1 },
            pax: { $sum: "$totalPassengers" },
            revenue: { $sum: "$pricing.grandTotal" },
          },
        },
      ]),
      UmrahPackageBooking.aggregate([
        { $match: umrahMatch },
        {
          $group: {
            _id: "$user",
            bookings: { $sum: 1 },
            pax: { $sum: "$passengerCount.total" },
            revenue: { $sum: "$pricing.totalPrice" },
          },
        },
      ]),
    ]);

    const empty = () => ({ bookings: 0, pax: 0, revenue: 0 });
    const byAgent = new Map();
    const entryFor = (id) => {
      if (!byAgent.has(id)) {
        byAgent.set(id, { group: empty(), umrah: empty() });
      }
      return byAgent.get(id);
    };

    groupRows.forEach((r) => {
      entryFor(r._id).group = {
        bookings: r.bookings,
        pax: r.pax || 0,
        revenue: r.revenue || 0,
      };
    });
    umrahRows.forEach((r) => {
      entryFor(String(r._id)).umrah = {
        bookings: r.bookings,
        pax: r.pax || 0,
        revenue: r.revenue || 0,
      };
    });

    // Only real agents belong in this report (not admin/staff accounts).
    const validIds = [...byAgent.keys()].filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
    const agents = await Register.find({
      _id: { $in: validIds },
      role: { $in: ["Agency", "SubAgent"] },
      isDeleted: { $ne: true },
    }).select("name companyName agencyCode status");

    const data = agents
      .map((agent) => {
        const { group, umrah } = byAgent.get(String(agent._id));
        return {
          agentId: String(agent._id),
          companyName: (agent.companyName || "").trim(),
          name: (agent.companyName || "").trim() || agent.name,
          contactName: agent.name,
          agencyCode: agent.agencyCode || "",
          status: agent.status,
          group,
          umrah,
          total: {
            bookings: group.bookings + umrah.bookings,
            pax: group.pax + umrah.pax,
            revenue: group.revenue + umrah.revenue,
          },
        };
      })
      .sort(
        (a, b) =>
          b.total.revenue - a.total.revenue || b.total.bookings - a.total.bookings,
      )
      .slice(0, limit);

    res.json({ success: true, data });
  } catch (error) {
    console.error("Top agents report error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch top agents report" });
  }
};
