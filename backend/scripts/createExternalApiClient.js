import crypto from "crypto";
import dotenv from "dotenv";
import mongoose from "mongoose";
import ExternalApiClient from "../models/ExternalApiClient.js";
import Register from "../models/Register.js";

dotenv.config();

const [name, ownerEmail, scopesArg] = process.argv.slice(2);
if (!name || !ownerEmail) {
  console.error('Usage: npm run api-client:create -- "Partner name" owner@example.com [comma-separated-scopes]');
  process.exit(1);
}

const allowedScopes = ["inventory:read", "bookings:read", "bookings:write"];
const scopes = scopesArg ? scopesArg.split(",").map((scope) => scope.trim()) : allowedScopes;
if (scopes.some((scope) => !allowedScopes.includes(scope))) {
  console.error(`Scopes must be one or more of: ${allowedScopes.join(", ")}`);
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);
  const owner = await Register.findOne({ email: ownerEmail.toLowerCase(), status: "Active" });
  if (!owner) throw new Error("An active owner user with that email was not found.");
  const apiKey = `aa_live_${crypto.randomBytes(32).toString("base64url")}`;
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const client = await ExternalApiClient.create({
    name,
    ownerUserId: owner._id,
    keyHash,
    keyPrefix: apiKey.slice(0, 16),
    scopes,
  });
  console.log(`Client: ${client.name}`);
  console.log(`API key: ${apiKey}`);
  console.log("Save this key securely. It cannot be displayed again.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
