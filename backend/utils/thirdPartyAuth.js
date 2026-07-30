import axios from "axios";
import ThirdPartyToken from "../models/ThirdPartyToken.js";

// Refresh this many ms before the stored expiry, so a request never goes out
// with a token that's about to die mid-flight.
const EXPIRY_BUFFER_MS = 60 * 1000;

const PROVIDER_CONFIG = {
  ALSABOOR: {
    baseURLEnv: "ALSABOOR_URL",
    emailEnv: "ALSABOOR_EMAIL",
    passwordEnv: "ALSABOOR_PASSWORD",
    agentCodeEnv: "ALSABOOR_AGENT_CODE",
    loginPath: "/admins/api/login",
  },
  UPSKY: {
    baseURLEnv: "UPSKY_URL",
    emailEnv: "UPSKY_EMAIL",
    passwordEnv: "UPSKY_PASSWORD",
    agentCodeEnv: "UPSKY_AGENT_CODE",
    loginPath: "/admins/api/login",
  },
  // Up Sky's Umrah Packages sub-API lives on a separate base URL/login
  // endpoint from the flight groups API above, but shares the same agent
  // credentials.
  UPSKY_UMRAH: {
    baseURLEnv: "UPSKY_UMRAH_API_URL",
    emailEnv: "UPSKY_EMAIL",
    passwordEnv: "UPSKY_PASSWORD",
    agentCodeEnv: "UPSKY_AGENT_CODE",
    loginPath: "/login",
  },
  AMAARSHOAIB: {
    baseURLEnv: "AMAARSHOAIB_URL",
    emailEnv: "AMAARSHOAIB_EMAIL",
    passwordEnv: "AMAARSHOAIB_PASSWORD",
    agentCodeEnv: "AMAARSHOAIB_AGENT_CODE",
    loginPath: "/admins/api/login",
  },
};

const getProviderCreds = (provider) => {
  const config = PROVIDER_CONFIG[provider];
  if (!config) throw new Error(`Unknown third-party provider: ${provider}`);

  return {
    baseURL: (process.env[config.baseURLEnv] || "").replace(/\/$/, ""),
    email: process.env[config.emailEnv],
    password: process.env[config.passwordEnv],
    agentCode: process.env[config.agentCodeEnv],
    loginPath: config.loginPath,
  };
};

// The login response's `expiry` field format isn't documented — handle it
// whether it comes back as an ISO date, an epoch (s or ms), or a
// seconds-until-expiry duration.
const parseExpiry = (expiry) => {
  if (!expiry) return null;

  if (/^\d+$/.test(String(expiry).trim())) {
    const num = Number(expiry);
    if (num > 1e11) return new Date(num);
    if (num > 1e9) return new Date(num * 1000);
    return new Date(Date.now() + num * 1000);
  }

  const date = new Date(expiry);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isExpired = (expiry) => {
  if (!expiry) return true;
  return new Date(expiry).getTime() - EXPIRY_BUFFER_MS <= Date.now();
};

// Dedupe concurrent logins for the same provider so a burst of requests
// arriving after expiry doesn't fire off N parallel login calls.
const pendingLogins = {};

const performLogin = async (provider) => {
  const { baseURL, email, password, agentCode, loginPath } = getProviderCreds(provider);

  if (!baseURL || !email || !password || !agentCode) {
    throw new Error(`Missing ${provider} login credentials in environment config`);
  }

  const form = new URLSearchParams();
  form.append("email", email);
  form.append("password", password);
  form.append("agent_code", agentCode);

  const response = await axios.post(`${baseURL}${loginPath}`, form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 30000,
  });

  const { token, expiry, message } = response.data || {};
  if (!token) {
    throw new Error(`${provider} login failed: ${message || "no token returned"}`);
  }

  const parsedExpiry = parseExpiry(expiry);

  await ThirdPartyToken.findOneAndUpdate(
    { provider },
    { token, expiry: parsedExpiry },
    { upsert: true, returnDocument: "after" },
  );

  console.log(`${provider} token refreshed, expiry: ${parsedExpiry || "unknown"}`);

  return { token, expiry: parsedExpiry };
};

const login = (provider) => {
  if (!pendingLogins[provider]) {
    pendingLogins[provider] = performLogin(provider).finally(() => {
      delete pendingLogins[provider];
    });
  }
  return pendingLogins[provider];
};

// Returns a token guaranteed valid (not expired) for the given provider,
// regenerating and persisting a fresh one if needed.
export const getValidToken = async (provider) => {
  const record = await ThirdPartyToken.findOne({ provider });
  if (record?.token && !isExpired(record.expiry)) {
    return record.token;
  }

  const { token } = await login(provider);
  return token;
};

// Drops the cached token so the next getValidToken() call is forced to log
// in again — used when the provider rejects a token as invalid/expired even
// though our stored expiry hadn't passed yet.
export const invalidateToken = async (provider) => {
  await ThirdPartyToken.deleteOne({ provider });
};
