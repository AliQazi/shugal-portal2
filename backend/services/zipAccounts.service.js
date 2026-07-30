import axios from "axios";

// Load environment variables
const ZIP_ACCOUNTS_API_URL = process.env.ZIP_ACCOUNTS_API_URL;
const ZIP_ACCOUNTS_DB_PREFIX = process.env.ZIP_ACCOUNTS_DB_PREFIX;
const ZIP_ACCOUNTS_API_KEY = process.env.ZIP_ACCOUNTS_API_KEY;
const CRM_API_BASE_URL = "https://crm.zipaccounts.com/app2/api";

// Create axios instance with default config
// Note: dbprefix is passed as a header, not query param or body
const zipAccountsAPI = axios.create({
  baseURL: ZIP_ACCOUNTS_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ZIP_ACCOUNTS_API_KEY}`,
    dbprefix: ZIP_ACCOUNTS_DB_PREFIX,
  },
  timeout: 30000, // Reduced from 30s to 10s
});

// Add response interceptor for error handling
zipAccountsAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("ZIP Accounts API Error:", error.response.data);
      throw new Error(
        error.response.data.message || "ZIP Accounts API request failed",
      );
    } else if (error.request) {
      console.error("ZIP Accounts API No Response:", error.request);
      throw new Error("No response from ZIP Accounts API");
    } else {
      console.error("ZIP Accounts API Error:", error.message);
      throw new Error(error.message);
    }
  },
);

/**
 * ZIP Accounts Service - Simplified
 * Provides access to chart of accounts and account listings
 */
class ZipAccountsService {
  /**
   * Get all accounts
   * @returns {Promise<Object>} List of accounts
   */
  async getAllAccounts() {
    try {
      const response = await zipAccountsAPI.get("/accounts/");
      return response.data;
    } catch (error) {
      console.error("❌ ZIP Accounts API Error:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }
  }

  /**
   * Get all subhead1 (chart of accounts level 1)
   * @returns {Promise<Object>} List of subhead1
   */
  async getSubhead1() {
    try {
      const response = await zipAccountsAPI.get("/subhead1/");
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch subhead1: ${error.message}`);
    }
  }

  /**
   * Get all subhead2 (chart of accounts level 2)
   * @returns {Promise<Object>} List of subhead2
   */
  async getSubhead2() {
    try {
      const response = await zipAccountsAPI.get("/subhead2/");
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch subhead2: ${error.message}`);
    }
  }

  /**
   * Get all chartheads
   * @returns {Promise<Object>} List of chartheads
   */
  async getChartheads() {
    try {
      const response = await zipAccountsAPI.get("/chartheads/");
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch chartheads: ${error.message}`);
    }
  }

  /**
   * Create new subhead2
   * @param {Object} data - Subhead2 data
   * @returns {Promise<Object>} Created subhead2
   */
  async createSubhead2(data) {
    try {
      const response = await zipAccountsAPI.post("/subhead2/", data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create subhead2: ${error.message}`);
    }
  }

  /**
   * Create new account
   * @param {Object} data - Account data
   * @returns {Promise<Object>} Created account
   */
  async createAccount(data) {
    try {
      const response = await zipAccountsAPI.post("/accounts/", data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create account: ${error.message}`);
    }
  }

  /**
   * Update Account
   * @param {Object} data - Account data
   * @returns {Promise<Object>} Created account
   */
  async updateAccount(data) {
    try {
      const response = await zipAccountsAPI.put(`accounts/${data.id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update account: ${error.message}`);
    }
  }
  /**
   * Get Consultants
   */
  async getConsultants() {
    try {
      const response = await zipAccountsAPI.get(`consultant`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get consultants: ${error.message}`);
    }
  }
  /**
   * Create Voucher (journal / visa / hotel / payment)
   */
  async createVoucher(data) {
    try {
      const response = await zipAccountsAPI.post(`voucher`, data);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create voucher: ${error.message}`);
    }
  }
  /**
   * Zip Account Umrah Packages
   */
  async fetchUmrahPackages(id) {
    try {
      const response = await axios.get(CRM_API_BASE_URL + "/umrah-packages", {
        headers: {
          Authorization: `Bearer ${ZIP_ACCOUNTS_API_KEY}`,
          dbprefix: ZIP_ACCOUNTS_DB_PREFIX,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch umrah pkgs: ${error.message}`);
    }
  }
  /**
   * Zip Account Vouchers
   */
  async fetchAllVouchers(id, query) {
    try {
      const response = await zipAccountsAPI.get(`umrah-packages`, {
        params: {
          accountid: id || null,
          startDate: query?.startDate,
          endDate: query?.endDate,
          limit: query?.limit,
          page: query?.page,
          type: query?.type || "umrah",
          is_void: query?.isVoid,
          is_posted: query?.isPosted,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch ${query?.type} vouchers: ${error.message}`,
      );
    }
  }
  /**
   * Zip Account Voucher POST/UNPOST
   */
  async postUnpostVoucher(id, action) {
    try {
      const response = await zipAccountsAPI.patch(`voucher/${id}/posted`, {
        is_posted: action === "post" ? true : false,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to ${action} voucher: ${error.message}`);
    }
  }
  /**
   * Zip Account Voucher VOID/UNVOID
   */
  async voidUnvoidVoucher(id, action) {
    try {
      const response = await zipAccountsAPI.patch(`voucher/${id}/void`, {
        is_void: action === "void" ? true : false,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to ${action} voucher: ${error.message}`);
    }
  }
  /**
   * Zip Account Voucher Void and Unpost
   */
  async voidAndUnpostVoucher(id) {
    try {
      const [puvRes, vuvRes] = await Promise.all([
        this.voidUnvoidVoucher(id, "void"),
        this.postUnpostVoucher(id, "unpost"),
      ]);
      return { puvRes, vuvRes };
    } catch (error) {
      throw new Error(`Failed to void and unpost voucher: ${error.message}`);
    }
  }

  /**
   * Fetch vouchers with their entries for a given account and date range.
   * @param {string} accountId - ZIP Accounts account ID
   * @param {string|null} dateFrom - ISO date string (inclusive start)
   * @param {string|null} dateTo   - ISO date string (inclusive end)
   * @returns {Promise<Object>} { items: ActualVoucher[] }
   */
  async fetchVouchersWithEntries(accountId, dateFrom, dateTo) {
    try {
      const params = {
        accountid: accountId,
        entries: "true",
        is_void: "false",
      };
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        params.endDate = to.toISOString();
      }

      const response = await zipAccountsAPI.get("/voucher", { params });
      return response.data; // { items: ActualVoucher[] }
    } catch (error) {
      throw new Error(
        `Failed to fetch vouchers with entries: ${error.message}`,
      );
    }
  }

  async createJournalVoucher({ date, transactions }) {
    try {
      const formData = new FormData();

      formData.append("type", "journalPortal");
      formData.append("date", date);

      transactions.forEach((txn, index) => {
        formData.append(
          `transactions[${index}][metadata]`,
          JSON.stringify({ id: index }),
        );

        formData.append(`transactions[${index}][account]`, txn.account);
        formData.append(`transactions[${index}][description]`, txn.description);
        formData.append(
          `transactions[${index}][credit]`,
          String(txn.credit || 0),
        );
        formData.append(
          `transactions[${index}][debit]`,
          String(txn.debit || 0),
        );
      });

      const response = await zipAccountsAPI.post("/voucher/", formData, {
        headers: {
          ...formData.getHeaders?.(),
          Authorization: `b ${ZIP_ACCOUNTS_API_KEY}`,
          dbprefix: ZIP_ACCOUNTS_DB_PREFIX,
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        "❌ ZIP journal voucher error:",
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to create ZIP journal voucher",
      );
    }
  }
}

export default new ZipAccountsService();
