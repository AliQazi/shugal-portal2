import UmmrahVisa from "../models/UmmrahVisa.js";

export const createUmmrahVisa = async (req, res) => {
  try {
    const newUmmrahVisa = new UmmrahVisa({
      ...req.body,
      createdBy: req.user?._id,
    });
    await newUmmrahVisa.save();
    res.status(201).json({
      success: true,
      message: "UmmrahVisa created successfully",
      data: newUmmrahVisa,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllUmmrahVisas = async (req, res) => {
  try {
    const ummrahVisas = await UmmrahVisa.find({}).sort({ createdAt: -1 });
    res.status(200).json(ummrahVisas);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUmmrahVisaById = async (req, res) => {
  try {
    const ummrahVisa = await UmmrahVisa.findById(req.params.id);
    if (!ummrahVisa) {
      return res.status(404).json({
        success: false,
        message: "UmmrahVisa not found",
      });
    }
    res.status(200).json({
      success: true,
      data: ummrahVisa,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUmmrahVisa = async (req, res) => {
  try {
    const updatedUmmrahVisa = await UmmrahVisa.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true },
    );
    if (!updatedUmmrahVisa) {
      return res.status(404).json({
        success: false,
        message: "UmmrahVisa not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "UmmrahVisa updated successfully",
      data: updatedUmmrahVisa,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteUmmrahVisa = async (req, res) => {
  try {
    const deletedUmmrahVisa = await UmmrahVisa.findByIdAndDelete(req.params.id);
    if (!deletedUmmrahVisa) {
      return res.status(404).json({
        success: false,
        message: "UmmrahVisa not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "UmmrahVisa deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
