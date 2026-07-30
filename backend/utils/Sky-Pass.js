// skyPassService.js

import axios from "axios";
import FormData from "form-data";

// Read at call time (lazy) so .env is always loaded before first use
const getConfig = () => ({
  baseURL: process.env.SKYPASS_URL,
  token: process.env.SKT_PASS_ACCESS_TOKEN,
  agentId: process.env.SKYPASS_AGENT_ID,
  agentName: process.env.SKYPASS_AGENT_NAME || "SkyPass Agent",
  email: process.env.SKYPASS_EMAIL || "",
});

// Create axios instance — Authorization header set per-request via interceptor
const SkyPass = axios.create({
  timeout: 30000,
  headers: { Accept: "application/json" },
});

// Inject baseURL + Authorization lazily so env vars are always resolved
SkyPass.interceptors.request.use((config) => {
  const { baseURL, token } = getConfig();
  config.baseURL = baseURL;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add response interceptor for error handling
SkyPass.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("Sky Pass API Error:", error.response.data);
      const enhancedError = new Error(
        error.response.data?.message || "Sky Pass API request failed",
      );
      enhancedError.skypassResponseData = error.response.data;
      enhancedError.skypassStatusCode = error.response.status;
      throw enhancedError;
    } else if (error.request) {
      console.error("Sky Pass API No Response:", error.request);
      throw new Error("No response from Sky Pass API");
    } else {
      console.error("Sky Pass API Error:", error.message);
      throw new Error(error.message);
    }
  },
);

/**
 * Helper: Format date for SkyPass API (YYYY-MM-DD)
 */
const formatSkyPassDate = (dateValue) => {
  if (!dateValue) return "";
  if (typeof dateValue === "string") {
    // If already in YYYY-MM-DD format, return as is
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) return dateValue;
    // Otherwise take first 10 characters
    return dateValue.slice(0, 10);
  }
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

/**
 * Helper: Get SkyPass ticket ID from groupId
 */
const getSkyPassTicketId = (groupId) => {
  const value = String(groupId || "");
  // If groupId starts with "skypass-", extract the actual ID
  if (value.startsWith("skypass-")) {
    return value.replace("skypass-", "");
  }
  if (value.startsWith("skypass_")) {
    return value.replace("skypass_", "");
  }
  return value;
};

/**
 * Helper: Normalize nationality to full country name
 * SkyPass API expects full name like "Pakistan", not ISO codes like "PAK" or "PK"
 */
const NATIONALITY_MAP = {
  PAK: "Pakistan",
  PK: "Pakistan",
  ARE: "United Arab Emirates",
  AE: "United Arab Emirates",
  SAU: "Saudi Arabia",
  SA: "Saudi Arabia",
  GBR: "United Kingdom",
  GB: "United Kingdom",
  USA: "United States",
  US: "United States",
  IND: "India",
  IN: "India",
  BGD: "Bangladesh",
  BD: "Bangladesh",
  AFG: "Afghanistan",
  AF: "Afghanistan",
  IRN: "Iran",
  IR: "Iran",
  OMN: "Oman",
  OM: "Oman",
  KWT: "Kuwait",
  KW: "Kuwait",
  QAT: "Qatar",
  QA: "Qatar",
  BHR: "Bahrain",
  BH: "Bahrain",
};

const normalizeNationality = (nationality) => {
  if (!nationality) return "Pakistan";
  const upper = nationality.toUpperCase().trim();
  return NATIONALITY_MAP[upper] || nationality;
};

/**
 * Helper: Get title for SkyPass passenger
 */
const SKYPASS_TYPE_MAP = {
  Adult: "Adult",
  Child: "Child",
  Infant: "Infant",
};

const SKYPASS_TITLE_MAP = {
  MR: "Mr",
  MRS: "Mrs",
  MS: "Ms",
  CHD: "Mstr",
  INF: "Mr",
};
function getTitleForSkyPass(type, existingTitle) {
  if (type === "Child") return "Mstr";
  if (type === "Infant") return "Mr";

  if (existingTitle) {
    const normalized = SKYPASS_TITLE_MAP[existingTitle.toUpperCase().trim()];

    if (normalized) return normalized;
  }

  return "Mr";
}
/**
 * Submit booking to SkyPass API - CORRECTED VERSION
 * Matches the working implementation from your other project
 */
export const submitSkyPassBooking = async ({
  ticketId,
  passengers = [],
  agent = {},
}) => {
  try {
    const { agentId, agentName, email } = getConfig();
    const formData = new FormData();

    // Extract numeric ticket ID only
    const cleanTicketId = getSkyPassTicketId(ticketId).split("_")[0];
    formData.append("ticket_id", cleanTicketId);

    console.log(`[SKYPASS] Submitting for ticket_id: ${cleanTicketId}`);
    console.log("[SKYPASS SUBMIT] Payload summary:", {
      ticket_id: cleanTicketId,
      passengerCount: passengers.length,
      agent_id: String(agentId || agent.id || ""),
      agent_email: email || agent.email || "",
      passengerTypes: passengers.map((p) => p.type),
      passengerNames: passengers.map((p) =>
        `${p.givenName || ""} ${p.surName || ""}`.trim(),
      ),
    });

    // Add passengers
    passengers.forEach((passenger, index) => {
      const paxDob = formatSkyPassDate(passenger.dateOfBirth);
      const paxExpiry = formatSkyPassDate(passenger.passportExpiry);
      const paxNationality = normalizeNationality(passenger.nationality);
      const paxPassport = passenger.passport || "";
      const paxSurName = passenger.surName || passenger.surname || "";
      const paxGivenName = passenger.givenName || "";
      const paxTitle = getTitleForSkyPass(passenger.type, passenger.title);

      console.log(`[SKYPASS PAX ${index}]`, {
        type: passenger.type,
        title: paxTitle,
        surName: paxSurName,
        givenName: paxGivenName,
        passport: paxPassport,
        dob: paxDob,
        expiry: paxExpiry,
        nationality: paxNationality,
      });

      formData.append(
        `passengers[passengers_type][${index}]`,
        SKYPASS_TYPE_MAP[passenger.type] || passenger.type,
      );
      formData.append(`passengers[title][${index}]`, paxTitle);
      formData.append(`passengers[sur_name][${index}]`, paxSurName);
      formData.append(`passengers[given_name][${index}]`, paxGivenName);
      formData.append(`passengers[passport_number][${index}]`, paxPassport);
      formData.append(`passengers[dob][${index}]`, paxDob);
      formData.append(`passengers[passport_expiry][${index}]`, paxExpiry);
      formData.append(`passengers[nationality][${index}]`, paxNationality);
    });

    // Add agent details — prefer env values over request values
    formData.append("agent_details[id]", String(agentId || agent.id || ""));
    formData.append("agent_details[name]", agentName || agent.name || "");
    formData.append("agent_details[email]", email || agent.email || "");

    const response = await SkyPass.post("/submit-booking", formData, {
      headers: { ...formData.getHeaders(), Accept: "application/json" },
    });

    console.log("[SKYPASS] Response received:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ SkyPass booking submission failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
};

/**
 * Hold available seats on SkyPass
 */
export const holdSkyPassAvailableSeats = async ({
  ticketId,
  quantity,
  openSeatsSlot,
}) => {
  try {
    const formData = new FormData();

    const cleanTicketId = getSkyPassTicketId(ticketId).split("_")[0];
    formData.append("ticket_id", cleanTicketId);
    formData.append("quantity", String(Number(quantity) || 0));
    formData.append("open_seats_slot", String(Number(openSeatsSlot) || 0));

    const response = await SkyPass.post("/hold-available-seats", formData, {
      headers: { ...formData.getHeaders(), Accept: "application/json" },
      validateStatus: () => true,
    });

    return response.data;
  } catch (error) {
    console.error("❌ SkyPass hold seats failed:", error.message);
    throw error;
  }
};

/**
 * Fetch all SkyPass tickets and return normalized groups
 */
export const fetchAndNormalizeSkyPassTickets = async (airlines = []) => {
  try {
    const response = await SkyPass.get("/tickets");

    if (!response.data || !response.data.tickets) {
      console.warn(
        "⚠️ SkyPass API returned unexpected structure:",
        response.data,
      );
      return [];
    }

    const tickets = response.data.tickets;

    const airlineShortMap = {};
    if (airlines && airlines.length > 0) {
      airlines.forEach((a) => {
        if (a.airlineName) {
          airlineShortMap[a.airlineName.trim()] = a.shortCode || null;
        }
      });
    }

    const normalizedGroups = tickets.map((ticket, index) => {
      const sectors = ticket.sectors || [];
      const firstSector = sectors[0] || {};
      const lastSector = sectors[sectors.length - 1] || {};

      const details = sectors.map((sector, idx) => ({
        sr: idx + 1,
        flight_no: sector.flight_code || "",
        flight_num: sector.flight_num || "",
        dep_date: sector.departure_date || ticket.min_departure_date || "",
        dept_time: sector.departure_time || "",
        origin: sector.departure || "",
        destination: sector.destination || "",
        arv_date: sector.arrival_date || "",
        arv_time: sector.arrival_time || "",
        baggage: sector.baggage || "",
        meal: sector.meal || ticket.meal || "",
        sector_type: sector.sector_type || "",
        departure_region: sector.departure_region || "",
        destination_region: sector.destination_region || "",
        bookedSeats: 0,
        flight_code: sector.flight_code,
        arrival_time_raw: sector.arrival_time,
        departure_time_raw: sector.departure_time,
      }));

      const availableSeats = parseInt(ticket.open_seats_slot) || 0;
      const airlineName = ticket.name || "";
      const airlineLogo = ticket.image || null;

      const sectorStr =
        sectors.length > 0
          ? sectors.map((s) => `${s.departure}-${s.destination}`).join("-")
          : "";

      const adultPrice = parseFloat(ticket.adult_price) || 0;
      const childPrice =
        ticket.child_price === "Price on call"
          ? 0
          : parseFloat(ticket.child_price) || 0;
      const infantPrice =
        ticket.infants_price === "Price on call"
          ? 0
          : parseFloat(ticket.infants_price) || 0;

      return {
        id: `skypass_${ticket.id || Date.now()}_${index}`,
        source: "skypass",
        isOwnGroup: false,
        sector: sectorStr,
        sectorKey: sectorStr,
        type: ticket.service_type || "One Way",
        available_no_of_pax: availableSeats,
        showSeat: true,
        _totalOriginalSeats: availableSeats,
        _onHoldSeats: 0,
        _activeBookings: 0,
        price: adultPrice,
        childPrice: childPrice,
        infantPrice: infantPrice,
        pnr: ticket.airline_pnr || "",
        dept_date:
          firstSector.departure_date || ticket.min_departure_date || null,
        arv_date: lastSector.arrival_date || null,
        details: details,
        airline: {
          id: ticket.airline_id || null,
          airline_name: airlineName,
          short_name: airlineShortMap[airlineName] || null,
          logo_url: airlineLogo
            ? `${process.env.SKYPASS_URL}/uploads/airline_images/${airlineLogo}`
            : null,
        },
        _skypass: {
          ticket_id: ticket.id,
          meal: ticket.meal,
          on_hold_rule: ticket.on_hold_rule,
          airline_pnr: ticket.airline_pnr,
          seats_policy: ticket.seats_policy,
          note: ticket.note,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          open_seats_slot: ticket.open_seats_slot,
          service_type: ticket.service_type,
          min_departure_date: ticket.min_departure_date,
        },
        user: null,
        bookedSeats: 0,
      };
    });

    return normalizedGroups;
  } catch (error) {
    console.error("❌ SkyPass fetch and normalize error:", error.message);
    if (error.skypassResponseData) {
      console.error("SkyPass API response:", error.skypassResponseData);
    }
    return [];
  }
};

export default SkyPass;
