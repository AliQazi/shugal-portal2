import SpecialOffer from "../models/SpecialOffer.js";
import { cloudinary } from "../config/cloudinary.js";
import ActivityLog from "../models/activitylogs.js";

export const getSpecialOffers = async (req, res) => {
  try {
    const offers = await SpecialOffer.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSpecialOffer = async (req, res) => {
  try {
    const { title } = req.body;
    let imageUrl = "";

    if (req.file) {
      imageUrl = req.file.path;
    }

    const newOffer = await SpecialOffer.create({ title, image: imageUrl });

    await ActivityLog.create({
      user: req.user._id,
      type: "Special Offer",
      refId: newOffer._id,
      description: `Special offer "${newOffer.title}" created`,
    });

    res.status(201).json({ success: true, data: newOffer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateSpecialOffer = async (req, res) => {
  try {
    const { id } = req.body;
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = req.file.path;
    }

    const updatedOffer = await SpecialOffer.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedOffer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Special Offer",
      refId: updatedOffer._id,
      description: `Special offer "${updatedOffer.title}" updated`,
    });

    res.status(200).json({ success: true, data: updatedOffer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteSpecialOffer = async (req, res) => {
  try {
    const { id } = req.body;
    const deletedOffer = await SpecialOffer.findByIdAndDelete(id);

    if (!deletedOffer) {
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }

    await ActivityLog.create({
      user: req.user._id,
      type: "Special Offer",
      description: `Special offer "${deletedOffer.title}" deleted`,
    });

    res
      .status(200)
      .json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
