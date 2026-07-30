/**
 * ZIP Accounts Controller (Simplified)
 *
 * Controller for basic ZIP Accounts API operations
 * Uses helpers for complex queries that require filtering
 *
 * @module controllers/zipAccounts
 */

import zipAccountsService from "../services/zipAccounts.service.js";
import {
  findAccountById,
  findAccountByName,
  findSubhead1ById,
  findSubhead2ById,
  findSubhead1ByName,
  findSubhead2ByName,
  getAccountsBySubhead2Id as findAccountsBySubhead2,
  getSubhead2BySubhead1Id as findSubhead2BySubhead1,
} from "../utils/zipAccountHelper.js";

/**
 * Get all ZIP accounts
 */
export const getAllAccounts = async (req, res) => {
  try {
    const result = await zipAccountsService.getAllAccounts();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get All Accounts Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all subhead1 (chart of accounts level 1)
 */
export const getSubhead1 = async (req, res) => {
  try {
    const result = await zipAccountsService.getSubhead1();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead1 Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all subhead2 (chart of accounts level 2)
 */
export const getSubhead2 = async (req, res) => {
  try {
    const result = await zipAccountsService.getSubhead2();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead2 Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get account by ID
 */
export const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await findAccountById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Account By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get account by name
 */
export const getAccountByName = async (req, res) => {
  try {
    const { name } = req.params;
    const result = await findAccountByName(name);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Account By Name Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead1 by ID
 */
export const getSubhead1ById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await findSubhead1ById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Subhead1 not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead1 By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead2 by ID
 */
export const getSubhead2ById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await findSubhead2ById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Subhead2 not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead2 By ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead1 by name
 */
export const getSubhead1ByName = async (req, res) => {
  try {
    const { name } = req.params;
    const result = await findSubhead1ByName(name);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Subhead1 not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead1 By Name Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead2 by name
 */
export const getSubhead2ByName = async (req, res) => {
  try {
    const { name } = req.params;
    const result = await findSubhead2ByName(name);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Subhead2 not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get Subhead2 By Name Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get accounts by subhead2 ID
 */
export const getAccountsBySubhead2Id = async (req, res) => {
  try {
    const { subhead2Id } = req.params;
    const result = await findAccountsBySubhead2(subhead2Id);

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Get Accounts By Subhead2 ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subhead2 by subhead1 ID
 */
export const getSubhead2BySubhead1Id = async (req, res) => {
  try {
    const { subhead1Id } = req.params;
    const result = await findSubhead2BySubhead1(subhead1Id);

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Get Subhead2 By Subhead1 ID Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all chartheads
 */
export const getChartheads = async (req, res) => {
  try {
    const result = await zipAccountsService.getChartheads();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Get Chartheads Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get categorized accounts (customers, suppliers, vendors, income, expenses)
 */
export const getCategorizedAccounts = async (req, res) => {
  try {
    const [accounts, subheads, subhead1s, chartheads] = await Promise.all([
      zipAccountsService.getAllAccounts(),
      zipAccountsService.getSubhead2(),
      zipAccountsService.getSubhead1(),
      zipAccountsService.getChartheads(),
    ]);

    // Customer subhead2 IDs
    const customerSubhead2Ids = subheads
      .filter((s) => s.subhead2_name?.toLowerCase() === "customers")
      .map((s) => String(s._id));

    // Supplier: subhead2 with 'supplier' in name OR belongs to current assets/liabilities subhead1
    const currentAssetsLiabilitiesSubhead1Ids = subhead1s
      .filter((s1) =>
        ["current assets", "current liabilities"].includes(
          s1.subhead1_name?.toLowerCase(),
        ),
      )
      .map((s1) => String(s1._id));

    const supplierSubhead2Ids = subheads
      .filter(
        (s) =>
          s.subhead2_name?.toLowerCase().includes("supplier") ||
          currentAssetsLiabilitiesSubhead1Ids.includes(String(s.subhead1_id)),
      )
      .map((s) => String(s._id));

    // Income subhead2 IDs
    const incomeSubhead1Ids = subhead1s
      .filter((s1) => s1.subhead1_name?.toLowerCase() === "income")
      .map((s1) => String(s1._id));
    const incomeSubhead2Ids = subheads
      .filter((s) => incomeSubhead1Ids.includes(String(s.subhead1_id)))
      .map((s) => String(s._id));

    // Expense subhead2 IDs
    const expenseSubhead1Ids = subhead1s
      .filter((s1) => s1.subhead1_name?.toLowerCase() === "expenses")
      .map((s1) => String(s1._id));
    const expenseSubhead2Ids = subheads
      .filter((s) => expenseSubhead1Ids.includes(String(s.subhead1_id)))
      .map((s) => String(s._id));

    // Vendor: accounts under liabilities or assets chartheads
    const liabilitiesAssetsChartheadIds = chartheads
      .filter(
        (h) =>
          h.charthead_name?.toLowerCase().includes("liabilit") ||
          h.charthead_name?.toLowerCase().includes("asset"),
      )
      .map((h) => String(h._id));
    const vendorSubhead1Ids = subhead1s
      .filter((s1) =>
        liabilitiesAssetsChartheadIds.includes(String(s1.charthead_id)),
      )
      .map((s1) => String(s1._id));
    const vendorSubhead2Ids = subheads
      .filter((s) => vendorSubhead1Ids.includes(String(s.subhead1_id)))
      .map((s) => String(s._id));

    res.status(200).json({
      success: true,
      data: {
        all: accounts,
        customers: accounts.filter((a) =>
          customerSubhead2Ids.includes(String(a.subhead_id)),
        ),
        suppliers: accounts.filter((a) =>
          supplierSubhead2Ids.includes(String(a.subhead_id)),
        ),
        incomes: accounts.filter((a) =>
          incomeSubhead2Ids.includes(String(a.subhead_id)),
        ),
        expenses: accounts.filter((a) =>
          expenseSubhead2Ids.includes(String(a.subhead_id)),
        ),
        vendors: accounts.filter((a) =>
          vendorSubhead2Ids.includes(String(a.subhead_id)),
        ),
        subheads,
      },
    });
  } catch (error) {
    console.error("Get Categorized Accounts Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Consultants
 */
export const getConsultants = async (req, res) => {
  try {
    const result = await zipAccountsService.getConsultants();

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Get Consultant api error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/**
 * Get vouchers
 */
export const getVouchers = async (req, res) => {
  try {
    let id = req.query?.account || req.user?._id;
    let zipAccount = null;

    try {
      const user = await Register.findById(id);

      if (user) {
        zipAccount = await findAccountByName(user?.name);
      }
    } catch (error) {
      console.error("Error fetching ZIP account:", error.message);
    }

    // ✅ If no Zip Acc empty response
    if (!zipAccount?._id) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
      });
    }

    // ✅ call our good service
    const result = await zipAccountsService.fetchAllVouchers(
      String(zipAccount._id),
      req.query,
    );

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Get voucher api error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
