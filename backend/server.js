import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import dbConnection from "./config/db.js";

import groupTicketingRoutes from "./routes/groupTicketing.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bankRoutes from "./routes/bank.routes.js";
import sectorRoutes from "./routes/sector.routes.js";
import airlineRoutes from "./routes/airline.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import alHaiderAPIRoutes from "./routes/alHaiderAPI.routes.js";
import sabaoonAPIRoutes from "./routes/sabaoonAPI.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import exportRoutes from "./routes/export.routes.js";
import specialOffer from "./routes/specialOffer.route.js";
import zipRoutes from "./routes/zipAccounts.routes.js";
import umrahBookingRoutes from "./routes/umrahBooking.routes.js";
import umrahPackages from "./routes/umrahPackages.routes.js";
import teamContactRoutes from "./routes/teamContact.routes.js";
import hotelCityRoutes from "./routes/hotelCity.routes.js";
import testEmail from "./utils/testEmail.js";
import { startBookingExpiryJob } from "./utils/bookingExpiryJob.js";
import hotelRoutes from "./routes/hotel.routes.js";
import transportRoutes from "./routes/transport.routes.js";
import visaRoutes from "./routes/visa.routes.js";
import subUserRoutes from "./routes/subUser.routes.js";
import globalSettingsRoutes from "./routes/globalSettings.routes.js";
import emmarRoutes from "./routes/emmar.routes.js";
import activityLogRoutes from "./routes/activitylog.routes.js";
import groupPricingRuleRoutes from "./routes/groupPricingRule.routes.js";
import umrahCalculatorRoutes from "./routes/umrahCalculator.routes.js";
import ummrahVisaRoutes from "./routes/ummrahVisa.routes.js";
import transportRouteRatesRoutes from "./routes/transportRouteRates.routes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, "../frontend/dist");
const adminDistPath = path.join(__dirname, "../admin/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const adminIndexPath = path.join(adminDistPath, "index.html");

dotenv.config();
dbConnection();
testEmail();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://groups.tfctours.com",
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

app.use("/api/group-ticketing", groupTicketingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bank", bankRoutes);
app.use("/api/sector", sectorRoutes);
app.use("/api/airline", airlineRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/al-haider", alHaiderAPIRoutes);
app.use("/api/sabaoon", sabaoonAPIRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/specialOffer", specialOffer);
app.use("/api/team-contacts", teamContactRoutes);
app.use("/api/zip-accounts", zipRoutes);
app.use("/api/umrah-bookings", umrahBookingRoutes);
app.use("/api/umrahpackages", umrahPackages);
app.use("/api", hotelCityRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/transports", transportRoutes);
app.use("/api/visas", visaRoutes);
app.use("/api/sub-users", subUserRoutes);
app.use("/api/global-settings", globalSettingsRoutes);
app.use("/api/emmar", emmarRoutes);
app.use("/api/pricing-rules", groupPricingRuleRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/umrah-calculator", umrahCalculatorRoutes);
app.use("/api/ummrah-visa", ummrahVisaRoutes);
app.use("/api/transport-route-rates", transportRouteRatesRoutes);
// Sabaoon integration removed. Only Al-Haider API is used for group data.

/* 🔥 Start Expiry Cron Job */
startBookingExpiryJob();

// Serve static files from React apps
app.use(express.static(frontendDistPath));
app.use("/admin-portal", express.static(adminDistPath));

// Canonical admin root URL with trailing slash
app.get("/admin-portal", (req, res) => {
  res.redirect(301, "/admin-portal/");
});

// Ensure admin SPA deep links work on page refresh
app.get(/^\/admin-portal\/(?:.*)?$/, (req, res) => {
  res.sendFile(adminIndexPath);
});

// Catch-all handler: serve React app's index.html for any non-API routes
// This must come AFTER all API routes
app.use((req, res, next) => {
  // Skip API routes - they should have been handled above
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API endpoint not found" });
  }

  // Keep admin root URL canonical
  if (req.path === "/admin-portal") {
    return res.redirect(301, "/admin-portal/");
  }

  // Allow all client routes under /admin-portal/
  const isAdminPortalRoute =
    req.path === "/admin-portal/" || req.path.startsWith("/admin-portal/");

  if (isAdminPortalRoute) {
    res.sendFile(adminIndexPath);
  } else {
    res.sendFile(frontendIndexPath);
  }
});

app.get("/", (req, res) => {
  res.send("Abid Air API is running");
});

const PORT = process.env.PORT || 8016;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
