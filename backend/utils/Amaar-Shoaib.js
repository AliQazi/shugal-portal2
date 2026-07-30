import axios from "axios";
import { getValidToken, invalidateToken } from "./thirdPartyAuth.js";

const AMAARSHOAIB_PROVIDER = "AMAARSHOAIB";

const AMAARSHOAIB_ENDPOINTS = {
  groups: "/admins/api/groups",
  groupDetails: "/admins/api/group-details",
  createBooking: "/admins/api/booking",
  getBooking: "/admins/api/get-booking",
};

// Only these two group types are supported by the Amaar Shoaib API today.
export const AMAARSHOAIB_GROUP_TYPES = ["ONE WAY GROUP", "UMRAH GROUP"];

const getAmaarShoaibConfig = () => ({
  baseURL: process.env.AMAARSHOAIB_URL,
  agentId: process.env.AMAARSHOAIB_AGENT_CODE || "687",
});

const AmaarShoaib = axios.create({
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Amaar Shoaib accepts the token both as an `Authorization: Token <key>` header
// and as a `token` query param (per their docs) — send both so either scheme
// works. The token is fetched fresh on every request; getValidToken() only
// hits the login API when the cached token is missing/expired, otherwise it's
// a DB read.
AmaarShoaib.interceptors.request.use(async (config) => {
  const { baseURL } = getAmaarShoaibConfig();
  const token = await getValidToken(AMAARSHOAIB_PROVIDER);

  config.baseURL = baseURL?.replace(/\/$/, "");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
    config.params = { ...config.params, token };
  }

  return config;
});

AmaarShoaib.interceptors.response.use(
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
      await invalidateToken(AMAARSHOAIB_PROVIDER);
      return AmaarShoaib(config);
    }

    if (error.response) {
      console.error("Amaar Shoaib API Error:", error.response.data);

      const enhancedError = new Error(
        error.response.data?.message || "Amaar Shoaib API request failed",
      );
      enhancedError.amaarShoaibResponseData = error.response.data;
      enhancedError.amaarShoaibStatusCode = error.response.status;
      throw enhancedError;
    }

    if (error.request) {
      console.error("Amaar Shoaib API No Response:", error.request);
      throw new Error("No response from Amaar Shoaib API");
    }

    console.error("Amaar Shoaib API Error:", error.message);
    throw new Error(error.message);
  },
);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatAmaarShoaibDate = (dateValue) => {
  if (!dateValue) return "";
  if (typeof dateValue === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    return dateValue.slice(0, 10);
  }
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

// Same white-label platform as Up Sky / Al Saboor — their labels are
// 1-indexed (Adult=1, Child=2, Infant=3), so send the numeric PTC code
// instead of the plain-text type to avoid it being misread as index 0.
const AMAARSHOAIB_HUMAN_TYPE_CODE = { Adult: 1, Child: 2, Infant: 3 };

const getAmaarShoaibPassengerTitle = (type, title) => {
  const normalizedTitle = String(title || "")
    .toUpperCase()
    .trim();
  const validTitles = ["MR", "MRS", "MS", "CHD", "INF"];

  if (validTitles.includes(normalizedTitle)) return normalizedTitle;
  if (type === "Child") return "CHD";
  if (type === "Infant") return "INF";

  return "MR";
};

// Amaar Shoaib's group-details API gives each leg a dept_time/arv_time but no
// per-leg arrival date — only the overall journey's dept_date/arv_date on the
// group itself. Assume each leg lands the same day it departs, unless its
// arrival time is earlier than its departure time (arrival past midnight),
// in which case it lands the next day.
const deriveAmaarShoaibLegArrivalDate = (depDate, deptTime, arvTime) => {
  if (!depDate) return null;
  if (deptTime && arvTime && arvTime < deptTime) {
    const date = new Date(`${depDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().split("T")[0];
  }
  return depDate;
};

const normalizeAmaarShoaibDetails = (group, airlineShortName) =>
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
        deriveAmaarShoaibLegArrivalDate(
          depDate,
          detail.dept_time,
          detail.arv_time,
        ) ||
        group.arv_date ||
        null,
      arv_time: detail.arv_time || "",
      baggage: detail.baggage || group.baggage || "",
      meal: group.meal || "",
      bookedSeats: 0,
    };
  });

// Amaar Shoaib's `sector` field may be an internal ID rather than a route
// string — derive a route like "LHE-JED" from the flight details instead, so
// it sorts/groups consistently with the other sources.
const deriveAmaarShoaibSector = (group) => {
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

const resolveAmaarShoaibLogoUrl = (logoUrl) => {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `https://amaarshoaibtoursportal.com/${String(logoUrl).replace(/^\//, "")}`;
};

// Amaar Shoaib returns `airline` as an array (not an object) on group payloads.
export const normalizeAmaarShoaibGroup = (group = {}, index = 0) => {
  const airline = Array.isArray(group.airline)
    ? group.airline[0]
    : group.airline;
  const airlineName = airline?.airline_name || "";
  const airlineShortName = airline?.short_name || airlineName.substring(0, 2);
  const availableSeats = toNumber(group.available_no_of_pax);
  const sector = deriveAmaarShoaibSector(group);

  return {
    id: group.id || `amaarshoaib_${Date.now()}_${index}`,
    source: "amaar-shoaib",
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

    details: normalizeAmaarShoaibDetails(group, airlineShortName),

    airline: {
      id: airline?.id || group.airline_id || null,
      airline_name: airlineName,
      short_name: airlineShortName,
      logo_url: resolveAmaarShoaibLogoUrl(airline?.logo_url),
    },

    user: null,
    bookedSeats: 0,
  };
};

export const getAmaarShoaibGroups = async (type) => {
  try {
    const response = await AmaarShoaib.get(AMAARSHOAIB_ENDPOINTS.groups, {
      params: { type },
    });
    console.log(response)
    return response.data?.groups || [];
  } catch (error) {
    console.log(`Error fetching "${type}" groups from Amaar Shoaib`, error.message);
    return [];
  }
};

export const fetchNormalisedAmaarShoaibGroups = async (
  types = AMAARSHOAIB_GROUP_TYPES,
) => {
  const groupsByType = await Promise.all(
    types.map((type) => getAmaarShoaibGroups(type)),
  );
  return groupsByType
    .flat()
    .map((group, index) => normalizeAmaarShoaibGroup(group, index));
};

export const getAmaarShoaibGroupDetails = async (groupId) => {
  try {
    const response = await AmaarShoaib.get(AMAARSHOAIB_ENDPOINTS.groupDetails, {
      params: { group_id: groupId },
    });

    return response.data?.groups?.[0] || null;
  } catch (error) {
    console.log("Error fetching Amaar Shoaib group details", error.message);
    throw error;
  }
};

// Builds the parallel-array booking body the Amaar Shoaib "create booking"
// endpoint expects — one entry per passenger in pax_title/human_type/sur_name/
// etc., and one entry per passenger *of that type* in adult_price/child_price/
// infant_price.
export const formatBookingForAmaarShoaib = ({
  groupId,
  roe = "",
  pnr1 = "",
  pnr2 = "",
  agentName = "",
  passengers = [],
  pricing = {},
}) => {
  const priceFor = (type) =>
    String(pricing[`${type.toLowerCase()}Price`] ?? "");

  return {
    roe: String(roe),
    no_of_seat: String(passengers.length),
    group_id: String(groupId),
    agent_name: String(agentName || ""),
    pnr_1: pnr1 || "",
    pnr_2: pnr2 || "",
    pax_title: passengers.map((p) => getAmaarShoaibPassengerTitle(p.type, p.title)),
    human_type: passengers.map(
      (p) => String(AMAARSHOAIB_HUMAN_TYPE_CODE[p.type] ?? 0),
    ),
    sur_name: passengers.map((p) => p.surname || ""),
    given_name: passengers.map((p) => p.givenName || ""),
    pass_no: passengers.map((p) => p.passport || ""),
    dob: passengers.map((p) => formatAmaarShoaibDate(p.dateOfBirth)),
    doi: passengers.map((p) => formatAmaarShoaibDate(p.passportIssue)),
    doe: passengers.map((p) => formatAmaarShoaibDate(p.passportExpiry)),
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

// Amaar Shoaib's backend reads a classic PHP $_POST body, not a JSON payload —
// array fields (pax_title, sur_name, ...) must be sent with `[]` suffixed
// keys repeated once per value, the way an HTML form would submit them.
const toAmaarShoaibFormBody = (data) => {
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

export const createAmaarShoaibBooking = async (bookingData) => {
  try {
    const { agentId } = getAmaarShoaibConfig();
    const token = await getValidToken(AMAARSHOAIB_PROVIDER);
    const body = toAmaarShoaibFormBody({
      token,
      ...bookingData,
      agent_id: agentId,
    });

    const response = await AmaarShoaib.post(
      AMAARSHOAIB_ENDPOINTS.createBooking,
      body,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    return response.data;
  } catch (error) {
    console.log("Amaar Shoaib create booking error", error.message);
    throw error;
  }
};

export const getAmaarShoaibBooking = async (bookingId) => {
  try {
    const response = await AmaarShoaib.get(AMAARSHOAIB_ENDPOINTS.getBooking, {
      params: { booking_id: bookingId },
    });
    return response.data;
  } catch (error) {
    console.log("Amaar Shoaib get booking error", error.message);
    throw error;
  }
};

export default AmaarShoaib;
