import zipAccountsService from "../services/zipAccounts.service.js";

// Simple in-memory cache for frequently accessed structure IDs (valid for 5 minutes)
const structureCache = {
  receivables: { data: null, timestamp: 0 },
  assets: { data: null, timestamp: 0 },
  agentPortal: { data: null, timestamp: 0 },
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const cached = structureCache[key];
  if (cached.data && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  structureCache[key] = { data, timestamp: Date.now() };
}

/**
 * Create a ZIP Accounts entry for a user
 *   Optimized process:
 * - Checks account existence first (early return)
 * - Uses cached structure IDs when available
 * - Finds or creates "Receivables" > "Agent Portal" hierarchy
 * - Falls back to "Assets" if needed
 * - Creates account with user's name
 *
 * @param {Object} userData - User data
 * @param {string} userData.name - User's name for the account
 * @param {string} userData.email - User's email (for logging)
 * @param {string} userData.accountType - Optional account type (default: "Agent Portal")
 * @returns {Promise<Object>} Result object with success status and data
 */
async function createZipAgentAccount(userData) {
  const { name, email, accountType = "Agent Portal" } = userData;

  try {
    // OPTIMIZATION 1: Check for existing account FIRST (early return)
    const existingAccount = await findAccountByName(name);
    if (existingAccount) {
      console.log(`ℹ️ ZIP account already exists for: ${name}`);
      return {
        success: true,
        message: "ZIP account already exists",
        data: existingAccount,
        alreadyExists: true,
      };
    }

    let subheadIdToSend = null;

    // OPTIMIZATION 2: Check cache for Receivables
    let receivables = getCached("receivables");
    if (!receivables) {
      receivables = await findSubhead1ByName("Receivables");
      if (receivables) {
        setCache("receivables", receivables);
      }
    }

    if (receivables) {
      // OPTIMIZATION 3: Use filtered query instead of fetching ALL subhead2
      const subhead2List = await getSubhead2BySubhead1Id(receivables._id);

      // Find or create "Agent Portal" subhead2 under Receivables
      let agentPortalSubhead2 = subhead2List.find(
        (item) =>
          item.subhead2_name?.toLowerCase() === accountType.toLowerCase(),
      );

      if (!agentPortalSubhead2) {
        console.log(
          `📝 Creating "${accountType}" subhead2 under Receivables...`,
        );
        const createSubhead2Response = await zipAccountsService.createSubhead2({
          subhead2_name: accountType,
          subhead1_id: receivables._id,
          subhead2_status: "active",
          createdBy: "system",
        });
        agentPortalSubhead2 =
          createSubhead2Response.data || createSubhead2Response;
        setCache("agentPortal", agentPortalSubhead2);
      }

      subheadIdToSend = agentPortalSubhead2._id;
    } else {
      // Fallback: Check cache for Assets, then fetch if needed
      console.log(`⚠️ "Receivables" not found, falling back to "Assets"...`);

      let assets = getCached("assets");
      if (!assets) {
        const chartHeadRes = await zipAccountsService.getChartheads();
        const chartheads = chartHeadRes.data || chartHeadRes;
        assets = chartheads.find(
          (item) => item.charthead_name?.toLowerCase() === "assets",
        );
        if (assets) {
          setCache("assets", assets);
        }
      }

      subheadIdToSend = assets?._id || null;
    }

    if (!subheadIdToSend) {
      throw new Error(
        "Unable to determine subhead ID: Neither Receivables nor Assets found",
      );
    }

    // Create the account
    const accountData = {
      account_name: name,
      subhead_id: subheadIdToSend,
    };

    const accountResponse = await zipAccountsService.createAccount(accountData);
    const createdAccount = accountResponse.data || accountResponse;

    console.log(`✅ Created ZIP account for: ${email} (${name})`);

    return {
      success: true,
      message: "ZIP account created successfully",
      data: createdAccount,
    };
  } catch (error) {
    console.error(
      `❌ Failed to create ZIP account for ${email}:`,
      error.message,
    );

    return {
      success: false,
      message: `Failed to create ZIP account: ${error.message}`,
      error: error,
    };
  }
}

/**
 * Check if a ZIP account exists for a user
 * @param {string} userName - User's name to search for
 * @returns {Promise<Object>} Result object with existence status and account data
 */
async function checkZipAccountExists(userName) {
  try {
    const account = await findAccountByName(userName);

    return {
      exists: !!account,
      account: account || null,
    };
  } catch (error) {
    console.error(`❌ Error checking ZIP account existence:`, error.message);
    return {
      exists: false,
      account: null,
      error: error.message,
    };
  }
}

/**
 * Ensure ZIP account structure exists and account can be created
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Result object
 */
async function ensureZipAccountExists(userData) {
  try {
    // Check if account already exists
    const { exists, account } = await checkZipAccountExists(userData.name);

    if (exists) {
      console.log(`ℹ️ ZIP account already exists for: ${userData.email}`);
      return {
        success: true,
        message: "ZIP account already exists",
        data: account,
        alreadyExists: true,
      };
    }

    // Verify structure and return readiness status
    const result = await createZipAgentAccount(userData);

    if (result.success && !result.alreadyExists) {
      console.log(`✅ ZIP account structure ready for: ${userData.email}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Error ensuring ZIP account exists:`, error.message);
    return {
      success: false,
      message: error.message,
      error: error,
    };
  }
}

/**
 * Find subhead1 by name
 * @param {string} name - Subhead1 name
 * @returns {Promise<Object>} Subhead1 data or null
 */
async function findSubhead1ByName(name) {
  try {
    const result = await zipAccountsService.getSubhead1();
    const subheads = result.data || result;

    const found = subheads.find(
      (item) => item.subhead1_name?.toLowerCase() === name.toLowerCase(),
    );

    return found || null;
  } catch (error) {
    console.error(`❌ Error finding subhead1 by name:`, error.message);
    return null;
  }
}

/**
 * Find subhead2 by name
 * @param {string} name - Subhead2 name
 * @returns {Promise<Object>} Subhead2 data or null
 */
async function findSubhead2ByName(name) {
  try {
    const result = await zipAccountsService.getSubhead2();
    const subheads = result.data || result;

    const found = subheads.find(
      (item) => item.subhead2_name?.toLowerCase() === name.toLowerCase(),
    );

    return found || null;
  } catch (error) {
    console.error(`❌ Error finding subhead2 by name:`, error.message);
    return null;
  }
}

/**
 * Find subhead1 by ID
 * @param {string} id - Subhead1 ID
 * @returns {Promise<Object>} Subhead1 data or null
 */
async function findSubhead1ById(id) {
  try {
    const result = await zipAccountsService.getSubhead1();
    const subheads = result.data || result;

    const found = subheads.find(
      (item) => item._id?.toString() === id.toString(),
    );

    return found || null;
  } catch (error) {
    console.error(`❌ Error finding subhead1 by ID:`, error.message);
    return null;
  }
}

/**
 * Find subhead2 by ID
 * @param {string} id - Subhead2 ID
 * @returns {Promise<Object>} Subhead2 data or null
 */
async function findSubhead2ById(id) {
  try {
    const result = await zipAccountsService.getSubhead2();
    const subheads = result.data || result;

    const found = subheads.find(
      (item) => item._id?.toString() === id.toString(),
    );

    return found || null;
  } catch (error) {
    console.error(`❌ Error finding subhead2 by ID:`, error.message);
    return null;
  }
}

/**
 * Find account by ID
 * @param {string} id - Account ID
 * @returns {Promise<Object>} Account data or null
 */
async function findAccountById(id) {
  try {
    const result = await zipAccountsService.getAllAccounts();
    const accounts = result.data || result;

    const found = accounts.find(
      (item) => item._id?.toString() === id.toString(),
    );

    return found || null;
  } catch (error) {
    console.error(`❌ Error finding account by ID:`, error.message);
    return null;
  }
}

/**
 * Find account by name
 * @param {string} name - Account name
 * @returns {Promise<Object>} Account data or null
 */
async function findAccountByName(name) {
  try {
    const result = await zipAccountsService.getAllAccounts();
    const accounts = result.data || result;

    const found = accounts.find(
      (item) => item.account_name?.toLowerCase() === name.toLowerCase(),
    );

    return found || null;
  } catch (error) {
    console.error(`❌ Error finding account by name:`, error.message);
    return null;
  }
}

/**
 * Get accounts under a specific subhead2
 * @param {string} subhead2Id - Subhead2 ID
 * @returns {Promise<Array>} Array of accounts
 */
async function getAccountsBySubhead2Id(subhead2Id) {
  try {
    const result = await zipAccountsService.getAllAccounts();
    const accounts = result.data || result;

    const filtered = accounts.filter(
      (item) => item.subhead_id?.toString() === subhead2Id.toString(),
    );

    return filtered;
  } catch (error) {
    console.error(`❌ Error getting accounts by subhead2 ID:`, error.message);
    return [];
  }
}

/**
 * Get subhead2 under a specific subhead1
 * @param {string} subhead1Id - Subhead1 ID
 * @returns {Promise<Array>} Array of subhead2
 */
async function getSubhead2BySubhead1Id(subhead1Id) {
  try {
    const result = await zipAccountsService.getSubhead2();
    const subheads = result.data || result;

    const filtered = subheads.filter(
      (item) => item.subhead1_id?.toString() === subhead1Id.toString(),
    );

    return filtered;
  } catch (error) {
    console.error(`❌ Error getting subhead2 by subhead1 ID:`, error.message);
    return [];
  }
}

/**
 * Get subhead2 under a specific subhead1
 * @param {string} data - Account Data
 * @returns {Promise<Object>} Response
 */
async function updateZipAcc(data) {
  try {
    const accRes = await findAccountByName(data.name);
    if (!accRes) {
      return "Account not in Zip accounts";
    }
    const id = accRes._id;
    const { name, ...restData } = data;
    const result = await zipAccountsService.updateAccount({
      id,
      ...restData,
    });
    return result;
  } catch (error) {
    console.error(`❌ Error updating profile:`, error.message);
    return [];
  }
}

export {
  createZipAgentAccount,
  checkZipAccountExists,
  ensureZipAccountExists,
  findSubhead1ByName,
  findSubhead2ByName,
  findSubhead1ById,
  findSubhead2ById,
  findAccountById,
  findAccountByName,
  getAccountsBySubhead2Id,
  getSubhead2BySubhead1Id,
  updateZipAcc,
};
