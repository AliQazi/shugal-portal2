import GroupTicketing from "../models/GroupTicketing.js";
import ActivityLog from "../models/activitylogs.js";

/* ===========================
   CREATE GROUP TICKETING
=========================== */
export const createGroupTicketing = async (req, res) => {
  try {
    // Generate unique IDs
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();

    const voucher_id = `VCH-${timestamp}-${randomSuffix}`;
    const groupBookingId = `GRP-${timestamp}-${randomSuffix}`;

    // Add airline to each flight if not present
    const flights = req.body.flights?.map(flight => ({
      ...flight,
      airline: flight.airline || req.body.airline
    })) || [];
    const totalSeatsAfterPartial = req.body.totalSeats - req.body.partialSeats;

    const groupData = {
      ...req.body,
      voucher_id,
      groupBookingId,
      flights,
      totalSeatsAfterPartial,
    };

    const group = await GroupTicketing.create(groupData);

    await ActivityLog.create({
      user: req.user._id,
      type: "GroupTicketing",
      refModel: "GroupTicketing",
      refId: group._id,
      description: `Group ticketing "${group.groupBookingId}" created`,
    });

    res.status(201).json({
      success: true,
      message: "Group ticketing created successfully",
      data: group
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* ===========================
   GET ALL GROUP BOOKINGS
=========================== */
export const getAllGroupTicketings = async (req, res) => {
  try {
    const groups = await GroupTicketing.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===========================
   GET SINGLE GROUP BOOKING
=========================== */
export const getGroupTicketingById = async (req, res) => {
  try {
    const group = await GroupTicketing.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group ticketing not found"
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===========================
   UPDATE GROUP BOOKING
=========================== */
export const updateGroupTicketing = async (req, res) => {
  try {
    const totalSeats = Number(req.body.totalSeats || 0);
    const partialSeats = Number(req.body.partialSeats || 0);

    if (partialSeats > totalSeats) {
      return res.status(400).json({
        success: false,
        message: "Partial seats can't be greater than total seats",
      });
    }

    const group = await GroupTicketing.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        totalSeatsAfterPartial: totalSeats - partialSeats,
      },
      { new: true, runValidators: true }
    );


    await ActivityLog.create({
      user: req.user._id,
      type: "GroupTicketing",
      refModel: "GroupTicketing",
      refId: group._id,
      description: `Group ticketing "${group.groupBookingId}" updated`,
    });

    res.status(200).json({
      success: true,
      message: "Group ticketing updated",
      data: group
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/* ===========================
   GET PUBLIC GROUP TICKETINGS (for frontend display)
=========================== */
export const getPublicGroupTicketings = async (req, res) => {
  try {
    const { groupType } = req.query;
    const query = { internalStatus: "Public", totalSeats: { $gt: 0 } };
    if (groupType) query.groupType = groupType;

    const groups = await GroupTicketing.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ===========================
   DELETE GROUP BOOKING
=========================== */
export const deleteGroupTicketing = async (req, res) => {
  try {
    const group = await GroupTicketing.findByIdAndDelete(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group ticketing not found"
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "GroupTicketing",
      description: `Group ticketing "${group.groupBookingId}" deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Group ticketing deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
