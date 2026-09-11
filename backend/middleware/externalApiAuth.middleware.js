import crypto from "crypto";
import ExternalApiClient from "../models/ExternalApiClient.js";
import Register from "../models/Register.js";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = Number(process.env.EXTERNAL_API_RATE_LIMIT || 120);
const counters = new Map();

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const requireExternalApiKey = (...requiredScopes) => async (req, res, next) => {
  try {
    const authorization = req.get("authorization") || "";
    const apiKey = req.get("x-api-key") ||
      (authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "");

    if (!apiKey || !apiKey.startsWith("aa_live_")) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "A valid API key is required." },
      });
    }

    const client = await ExternalApiClient.findOne({
      keyHash: sha256(apiKey),
      status: "active",
    }).select("+keyHash");

    if (!client) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "The API key is invalid or revoked." },
      });
    }

    const missingScope = requiredScopes.find((scope) => !client.scopes.includes(scope));
    if (missingScope) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: `API key requires the ${missingScope} scope.` },
      });
    }

    const now = Date.now();
    const current = counters.get(client.id);
    const bucket = !current || now >= current.resetAt
      ? { count: 1, resetAt: now + WINDOW_MS }
      : { ...current, count: current.count + 1 };
    counters.set(client.id, bucket);
    res.set("X-RateLimit-Limit", String(MAX_REQUESTS));
    res.set("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - bucket.count)));
    if (bucket.count > MAX_REQUESTS) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests. Try again shortly." },
      });
    }

    const user = await Register.findById(client.ownerUserId);
    if (!user || user.status !== "Active") {
      return res.status(403).json({
        success: false,
        error: { code: "CLIENT_INACTIVE", message: "The API client owner is not active." },
      });
    }

    req.apiClient = client;
    req.user = user;
    ExternalApiClient.updateOne({ _id: client._id }, { lastUsedAt: new Date() }).catch(() => {});
    next();
  } catch (error) {
    next(error);
  }
};
