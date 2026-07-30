import Bank from "../models/Bank.js";
import { cloudinary } from "../config/cloudinary.js";
import ActivityLog from "../models/activitylogs.js";

// Add new bank
export const addBank = async (req, res) => {
  try {
    const { bankName, accountTitle, accountNo, ibn, bankAddress } = req.body;

    // Validate required fields
    if (!bankName || !accountTitle || !accountNo || !ibn || !bankAddress) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Prepare bank data
    const bankData = {
      bankName,
      accountTitle,
      accountNo,
      ibn,
      bankAddress,
      status: "Active",
    };

    // Add logo if uploaded
    if (req.file) {
      bankData.logo = req.file.path;
      bankData.logoPublicId = req.file.filename;
    }

    // Create new bank
    const newBank = await Bank.create(bankData);

    await ActivityLog.create({
      user: req.user._id,
      type: "Bank",
      refId: newBank._id,
      description: `Bank "${newBank.bankName}" added`,
    });

    res.status(201).json({
      success: true,
      message: "Bank added successfully",
      data: newBank,
    });
  } catch (error) {
    console.error("Error adding bank:", error);
    res.status(500).json({
      success: false,
      message: "Error adding bank",
      error: error.message,
    });
  }
};

// Get all banks
export const getBanks = async (req, res) => {
  try {
    const banks = await Bank.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: banks.length,
      data: banks,
    });
  } catch (error) {
    console.error("Error fetching banks:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching banks",
      error: error.message,
    });
  }
};

// Get single bank by ID
export const getBankById = async (req, res) => {
  try {
    const { id } = req.params;
    const bank = await Bank.findById(id);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    res.status(200).json({
      success: true,
      data: bank,
    });
  } catch (error) {
    console.error("Error fetching bank:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bank",
      error: error.message,
    });
  }
};

// Update bank
export const updateBank = async (req, res) => {
  try {
    const { id } = req.params;
    const { bankName, accountTitle, accountNo, ibn, bankAddress, status } =
      req.body;

    const bank = await Bank.findById(id);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    // Update fields
    if (bankName) bank.bankName = bankName;
    if (accountTitle) bank.accountTitle = accountTitle;
    if (accountNo) bank.accountNo = accountNo;
    if (ibn) bank.ibn = ibn;
    if (bankAddress) bank.bankAddress = bankAddress;
    if (status) bank.status = status;

    // Update logo if new file uploaded
    if (req.file) {
      // Delete old logo from cloudinary if exists
      if (bank.logoPublicId) {
        await cloudinary.uploader.destroy(bank.logoPublicId);
      }
      bank.logo = req.file.path;
      bank.logoPublicId = req.file.filename;
    }

    await bank.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "Bank",
      refId: bank._id,
      description: `Bank "${bank.bankName}" updated`,
    });

    res.status(200).json({
      success: true,
      message: "Bank updated successfully",
      data: bank,
    });
  } catch (error) {
    console.error("Error updating bank:", error);
    res.status(500).json({
      success: false,
      message: "Error updating bank",
      error: error.message,
    });
  }
};

// Delete bank
export const deleteBank = async (req, res) => {
  try {
    const { id } = req.params;

    const bank = await Bank.findById(id);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    // Delete logo from cloudinary if exists
    if (bank.logoPublicId) {
      await cloudinary.uploader.destroy(bank.logoPublicId);
    }

    await Bank.findByIdAndDelete(id);

    await ActivityLog.create({
      user: req.user._id,
      type: "Bank",
      description: `Bank "${bank.bankName}" deleted`,
    });

    res.status(200).json({
      success: true,
      message: "Bank deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bank:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting bank",
      error: error.message,
    });
  }
};

export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const bank = await Bank.findById(id);

    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    bank.status = bank.status === "Active" ? "De-Active" : "Active";

    await bank.save();

    res.status(200).json({
      success: true,
      message: `Bank ${
        bank.status === "Active" ? "activated" : "deactivated"
      } successfully`,
      data: bank,
    });
  } catch (error) {
    console.error("Error toggling bank status:", error);

    res.status(500).json({
      success: false,
      message: "Error toggling bank status",
      error: error.message,
    });
  }
};
