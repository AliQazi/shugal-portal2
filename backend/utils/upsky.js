import axios from "axios";
import { getValidToken, invalidateToken } from "./thirdPartyAuth.js";

const UPSKY_PROVIDER = "UPSKY";

const UPSKY_ENDPOINTS = {
  login: "/admins/api/login",
  groups: "/admins/api/groups",
  groupDetails: "/admins/api/groupdetails",
  createBooking: "/admins/api/booking",
  getBooking: "/admins/api/getbooking",
  getBookingPrintDetails: "/admins/api/get-bookingdetails",
  getBookingStatus: "/admins/api/get-bookingstatus",
};

// Only these two group types are supported by the Up Sky API today.
export const UPSKY_GROUP_TYPES = ["ONE WAY GROUP", "UMRAH GROUP"];

const getUpSkyConfig = () => ({
  baseURL: process.env.UPSKY_URL,
  agentId: process.env.UPSKY_AGENT_CODE || "173",
});

const UpSky = axios.create({
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Up Sky accepts the token both as an `Authorization: Token <key>` header and
// as a `token` query param (per their docs) — send both so either scheme works.
// The token is fetched fresh on every request; getValidToken() only hits the
// login API when the cached token is missing/expired, otherwise it's a DB read.
UpSky.interceptors.request.use(async (config) => {
  const { baseURL } = getUpSkyConfig();
  const token = await getValidToken(UPSKY_PROVIDER);

  config.baseURL = baseURL?.replace(/\/$/, "");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
    config.params = { ...config.params, token };
  }

  return config;
});

UpSky.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // The provider can reject a token as invalid/expired even though our
    // stored expiry hadn't passed yet — drop it and retry once with a fresh one.
    if (
      error.response &&
      [401, 403].includes(error.response.status) &&
      config &&
      !config._retriedAfterTokenRefresh
    ) {
      config._retriedAfterTokenRefresh = true;
      await invalidateToken(UPSKY_PROVIDER);
      return UpSky(config);
    }

    if (error.response) {
      console.error("Up Sky API Error:", error.response.data);

      const enhancedError = new Error(
        error.response.data?.message || "Up Sky API request failed",
      );
      enhancedError.upskyResponseData = error.response.data;
      enhancedError.upskyStatusCode = error.response.status;
      throw enhancedError;
    }

    if (error.request) {
      console.error("Up Sky API No Response:", error.request);
      throw new Error("No response from Up Sky API");
    }

    console.error("Up Sky API Error:", error.message);
    throw new Error(error.message);
  },
);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatUpSkyDate = (dateValue) => {
  if (!dateValue) return "";
  if (typeof dateValue === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    return dateValue.slice(0, 10);
  }
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

// Up Sky's own labels appear to be 1-indexed (Adult=1, Child=2, Infant=3) —
// sending 0-indexed codes (0/1/2) made every passenger's displayed type
// shift down by one (child showed as "Adult", infant showed as "Child").
const UPSKY_HUMAN_TYPE_CODE = { Adult: 1, Child: 2, Infant: 3 };

const getUpSkyPassengerTitle = (type, title) => {
  const normalizedTitle = String(title || "")
    .toUpperCase()
    .trim();
  const validTitles = ["MR", "MRS", "MS", "CHD", "INF"];

  if (validTitles.includes(normalizedTitle)) return normalizedTitle;
  if (type === "Child") return "CHD";
  if (type === "Infant") return "INF";

  return "MR";
};

// Up Sky's group-details API gives each leg a dept_time/arv_time but no
// per-leg arrival date — only the overall journey's dept_date/arv_date on the
// group itself. Assume each leg lands the same day it departs, unless its
// arrival time is earlier than its departure time (arrival past midnight),
// in which case it lands the next day.
const deriveUpSkyLegArrivalDate = (depDate, deptTime, arvTime) => {
  if (!depDate) return null;
  if (deptTime && arvTime && arvTime < deptTime) {
    const date = new Date(`${depDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().split("T")[0];
  }
  return depDate;
};

const normalizeUpSkyDetails = (group) =>
  (group.details || []).map((detail, index) => {
    const depDate = detail.flight_date || group.dept_date || "";

    return {
      id: detail.id || null,
      group_id: detail.group_id || group.id || null,
      sr: toNumber(detail.sr, index + 1),
      flight_no: detail.flight_no || "",
      dep_date: depDate,
      flight_date: depDate,
      dept_time: detail.dept_time || "",
      origin: detail.origin || "",
      destination: detail.destination || "",
      arv_date:
        deriveUpSkyLegArrivalDate(depDate, detail.dept_time, detail.arv_time) ||
        group.arv_date ||
        null,
      arv_time: detail.arv_time || "",
      baggage: detail.baggage || group.baggage || "",
      meal: group.meal || "",
      bookedSeats: 0,
    };
  });

// Up Sky's `sector` field is an internal numeric ID (e.g. "11"), not a route
// string — derive a route like "LHE-JED" from the flight details instead, so
// it sorts/groups consistently with the other sources.
const deriveUpSkySector = (group) => {
  const details = group.details || [];
  if (!details.length) return group.sector ? String(group.sector) : "";

  const origin = details[0]?.origin;
  const lastDestination = details[details.length - 1]?.destination;

  // Round-trip legs land back at the origin airport — use the outbound
  // leg's destination as the route's endpoint instead of the origin.
  const destination =
    lastDestination === origin ? details[0]?.destination : lastDestination;

  if (origin && destination) return `${origin}-${destination}`;
  return group.sector ? String(group.sector) : "";
};

// Up Sky returns `airline` as an array (not an object) on group payloads.
export const normalizeUpSkyGroup = (group = {}, index = 0) => {
  const airline = Array.isArray(group.airline)
    ? group.airline[0]
    : group.airline;
  const airlineName = airline?.airline_name || "";
  const availableSeats = toNumber(group.available_no_of_pax);
  const sector = deriveUpSkySector(group);

  return {
    id: group.id || `upsky_${Date.now()}_${index}`,
    source: "upsky",
    isOwnGroup: false,

    sector,
    sectorKey: sector,
    type: group.type || "",

    available_no_of_pax: availableSeats,
    showSeat: true,
    _totalOriginalSeats: availableSeats,
    _onHoldSeats: 0,
    _activeBookings: 0,

    price: toNumber(group.price),
    childPrice: 0,
    infantPrice: 0,

    groupPriceDetailId: group.group_price_detail_id || null,

    baggage: group.baggage || "",
    meal: group.meal || "",
    pnr: group.pnr || "",

    dept_date: group.dept_date || null,
    arv_date: group.arv_date || null,

    details: normalizeUpSkyDetails(group),

    airline: {
      id: airline?.id || group.airline_id || null,
      airline_name: airlineName,
      short_name: airline?.short_name || airlineName.substring(0, 2),
      logo_url:
        "https://upsky.pk/assets/img/airline-logo/" + airline?.logo_url || null,
    },

    user: null,
    bookedSeats: 0,
  };
};

export const getUpSkyGroups = async (type) => {
  try {
    const response = await UpSky.get(UPSKY_ENDPOINTS.groups, {
      params: { type },
    });

    return response.data?.groups || [];
  } catch (error) {
    console.log(`Error fetching "${type}" groups from Up Sky`, error.message);
    return [];
  }
};

export const fetchNormalisedUpSkyGroups = async (types = UPSKY_GROUP_TYPES) => {
  const groupsByType = await Promise.all(
    types.map((type) => getUpSkyGroups(type)),
  );
  return groupsByType
    .flat()
    .map((group, index) => normalizeUpSkyGroup(group, index));
};

export const getUpSkyGroupDetails = async (groupId) => {
  try {
    const response = await UpSky.get(UPSKY_ENDPOINTS.groupDetails, {
      params: { group_id: groupId },
    });

    return response.data?.groups?.[0] || null;
  } catch (error) {
    console.log("Error fetching Up Sky group details", error.message);
    throw error;
  }
};

// Builds the parallel-array booking body the Up Sky "create booking" endpoint
// expects — one entry per passenger in pax_title/human_type/sur_name/etc.,
// and one entry per passenger *of that type* in adult_price/child_price/infant_price.
export const formatBookingForUpSky = ({
  groupId,
  roe = "",
  pnr1 = "",
  pnr2 = "",
  passengers = [],
  pricing = {},
}) => {
  const priceFor = (type) =>
    String(pricing[`${type.toLowerCase()}Price`] ?? "");

  return {
    roe: String(roe),
    no_of_seat: String(passengers.length),
    group_id: String(groupId),
    pnr_1: pnr1 || "",
    pnr_2: pnr2 || "",
    pax_title: passengers.map((p) => getUpSkyPassengerTitle(p.type, p.title)),
    // Up Sky's backend appears to read this as an int (parseInt("adult") === 0
    // in PHP, which is exactly the "0" we got back for every passenger type
    // including children/infants) — send the numeric PTC code instead.
    human_type: passengers.map((p) => String(UPSKY_HUMAN_TYPE_CODE[p.type] ?? 0)),
    sur_name: passengers.map((p) => p.surname || ""),
    given_name: passengers.map((p) => p.givenName || ""),
    pass_no: passengers.map((p) => p.passport || ""),
    dob: passengers.map((p) => formatUpSkyDate(p.dateOfBirth)),
    doi: passengers.map((p) => formatUpSkyDate(p.passportIssue)),
    doe: passengers.map((p) => formatUpSkyDate(p.passportExpiry)),
    adult_price: passengers
      .filter((p) => p.type === "Adult")
      .map(() => priceFor("Adult")),
    child_price: passengers
      .filter((p) => p.type === "Child")
      .map(() => priceFor("Child")),
    infant_price: passengers
      .filter((p) => p.type === "Infant")
      .map(() => priceFor("Infant")),
  };
};

// Up Sky's backend reads a classic PHP $_POST body, not a JSON payload —
// array fields (pax_title, sur_name, ...) must be sent with `[]` suffixed
// keys repeated once per value, the way an HTML form would submit them.
const toUpSkyFormBody = (data) => {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(`${key}[]`, item ?? ""));
    } else if (value !== undefined && value !== null) {
      params.append(key, value);
    }
  });
  return params;
};

export const createUpSkyBooking = async (bookingData) => {
  try {
    const { agentId } = getUpSkyConfig();
    const token = await getValidToken(UPSKY_PROVIDER);
    const body = toUpSkyFormBody({ token, ...bookingData, agent_id: agentId });

    const response = await UpSky.post(UPSKY_ENDPOINTS.createBooking, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  } catch (error) {
    console.log("Up Sky create booking error", error.message);
    throw error;
  }
};

export const getUpSkyBooking = async (bookingId) => {
  try {
    const response = await UpSky.get(UPSKY_ENDPOINTS.getBooking, {
      params: { booking_id: bookingId },
    });
    return response.data;
  } catch (error) {
    console.log("Up Sky get booking error", error.message);
    throw error;
  }
};

export const getUpSkyBookingPrintDetails = async (bookingId) => {
  try {
    const response = await UpSky.get(UPSKY_ENDPOINTS.getBookingPrintDetails, {
      params: { booking_id: bookingId },
    });
    return response.data;
  } catch (error) {
    console.log("Up Sky get booking print details error", error.message);
    throw error;
  }
};

export const getUpSkyBookingStatus = async (bookingId) => {
  try {
    const response = await UpSky.get(UPSKY_ENDPOINTS.getBookingStatus, {
      params: { booking_id: bookingId },
    });
    return response.data;
  } catch (error) {
    console.log("Up Sky get booking status error", error.message);
    throw error;
  }
};

export default UpSky;
