import ActivityLog from "../models/activitylogs.js";
import Register from "../models/Register.js";

// GET ALL LOGS (Admin)
// Supports filters: type, userId, refId, dateFrom, dateTo, search, page, limit
export const getAllLogs = async (req, res) => {
  try {
    const {
      type,
      userId,
      userSearch,
      refId,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (refId) filter.refId = refId;

    // Filter by exact userId or by name/email search
    if (userId) {
      filter.user = userId;
    } else if (userSearch) {
      const matchedUsers = await Register.find({
        $or: [
          { name: { $regex: userSearch, $options: "i" } },
          { email: { $regex: userSearch, $options: "i" } },
          { companyName: { $regex: userSearch, $options: "i" } },
        ],
      }).select("_id");
      filter.user = { $in: matchedUsers.map((u) => u._id) };
    }

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }

    if (search) {
      filter.description = { $regex: search, $options: "i" };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("user", "name email role companyName")
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ActivityLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalLogs: total,
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET LOGS FOR A SPECIFIC USER
export const getLogsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      ActivityLog.find({ user: userId })
        .populate("user", "name email role companyName")
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ActivityLog.countDocuments({ user: userId }),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalLogs: total,
      },
    });
  } catch (error) {
    console.error("Error fetching user activity logs:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET LOG TYPES (for filter dropdown)
export const getLogTypes = async (req, res) => {
  try {
    const types = await ActivityLog.distinct("type");
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET DISTINCT USERS WHO HAVE LOGS (for user dropdown)
export const getLogUsers = async (req, res) => {
  try {
    const userIds = await ActivityLog.distinct("user");
    const users = await Register.find({ _id: { $in: userIds } })
      .select("name email role companyName")
      .sort({ name: 1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
