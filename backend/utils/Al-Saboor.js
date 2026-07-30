import axios from "axios";
import { getValidToken, invalidateToken } from "./thirdPartyAuth.js";

const ALSABOOR_PROVIDER = "ALSABOOR";

const ALSABOOR_ENDPOINTS = {
  groups: "/admins/api/groups",
  groupDetails: "/admins/api/groupdetails",
  createBooking: "/admins/api/booking",
  getBooking: "/admins/api/getbooking",
  getBookingPrintDetails: "/admins/api/get-bookingdetails",
  getBookingStatus: "/admins/api/get-bookingstatus",
};

// Only these two group types are supported by the AL SABOOR API today.
export const ALSABOOR_GROUP_TYPES = ["ONE WAY GROUP", "UMRAH GROUP"];

const getALSABOORConfig = () => ({
  baseURL: process.env.ALSABOOR_URL,
  agentId:
    process.env.ALSABOOR_AGENT_CODE || process.env.ALSABOOR_AGENT_ID || "173",
});

const ALSABOOR = axios.create({
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// AL SABOOR accepts the token both as an `Authorization: Token <key>` header and
// as a `token` query param (per their docs) — send both so either scheme works.
// The token is fetched fresh on every request; getValidToken() only hits the
// login API when the cached token is missing/expired, otherwise it's a DB read.
ALSABOOR.interceptors.request.use(async (config) => {
  const { baseURL } = getALSABOORConfig();
  const token = await getValidToken(ALSABOOR_PROVIDER);

  config.baseURL = baseURL?.replace(/\/$/, "");
  if (token) {
    config.headers.Authorization = `Token ${token}`;
    config.params = { ...config.params, token };
  }

  return config;
});

ALSABOOR.interceptors.response.use(
  async (response) => {
    // AL SABOOR responds with HTTP 200 even for its own error conditions
    // (e.g. `{ status: 'error', message: 'Token not found' }` for an
    // expired/unrecognized token), so the 401/403 branch below never fires.
    // Detect that shape here and retry once with a freshly issued token.
    if (response.data?.status === "error") {
      const config = response.config;

      if (
        /token/i.test(response.data?.message || "") &&
        config &&
        !config._retriedAfterTokenRefresh
      ) {
        config._retriedAfterTokenRefresh = true;
        await invalidateToken(ALSABOOR_PROVIDER);
        return ALSABOOR(config);
      }

      const enhancedError = new Error(
        response.data?.message || "AL SABOOR API request failed",
      );
      enhancedError.ALSABOORResponseData = response.data;
      throw enhancedError;
    }

    return response;
  },
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
      await invalidateToken(ALSABOOR_PROVIDER);
      return ALSABOOR(config);
    }

    if (error.response) {
      console.error("AL SABOOR API Error:", error.response.data);

      const enhancedError = new Error(
        error.response.data?.message || "AL SABOOR API request failed",
      );
      enhancedError.ALSABOORResponseData = error.response.data;
      enhancedError.ALSABOORStatusCode = error.response.status;
      throw enhancedError;
    }

    if (error.request) {
      console.error("AL SABOOR API No Response:", error.request);
      throw new Error("No response from AL SABOOR API");
    }

    console.error("AL SABOOR API Error:", error.message);
    throw new Error(error.message);
  },
);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatALSABOORDate = (dateValue) => {
  if (!dateValue) return "";
  if (typeof dateValue === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    return dateValue.slice(0, 10);
  }
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

// AL SABOOR's own labels appear to be 1-indexed (Adult=1, Child=2, Infant=3) —
// sending 0-indexed codes (0/1/2) made every passenger's displayed type
// shift down by one (child showed as "Adult", infant showed as "Child").
const ALSABOOR_HUMAN_TYPE_CODE = { Adult: 1, Child: 2, Infant: 3 };

const getALSABOORPassengerTitle = (type, title) => {
  const normalizedTitle = String(title || "")
    .toUpperCase()
    .trim();
  const validTitles = ["MR", "MRS", "MS", "CHD", "INF"];

  if (validTitles.includes(normalizedTitle)) return normalizedTitle;
  if (type === "Child") return "CHD";
  if (type === "Infant") return "INF";

  return "MR";
};

// AL SABOOR's `flight_no` now comes back as a bare number (e.g. "739")
// instead of the airline-prefixed form ("SV 739") — reconstruct it by
// prefixing the airline's short code, unless it's already got a code baked in.
const buildALSABOORFlightNo = (flightNo, shortName) => {
  const raw = String(flightNo || "").trim();
  if (!raw) return "";
  if (/[A-Za-z]/.test(raw)) return raw;
  return shortName ? `${shortName} ${raw}` : raw;
};

// AL SABOOR's group-details API gives each leg a dept_time/arv_time but no
// per-leg arrival date — only the overall journey's dept_date/arv_date on the
// group itself. Assume each leg lands the same day it departs, unless its
// arrival time is earlier than its departure time (arrival past midnight),
// in which case it lands the next day.
const deriveALSABOORLegArrivalDate = (depDate, deptTime, arvTime) => {
  if (!depDate) return null;
  if (deptTime && arvTime && arvTime < deptTime) {
    const date = new Date(`${depDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().split("T")[0];
  }
  return depDate;
};

const normalizeALSABOORDetails = (group, airlineShortName) =>
  (group.details || []).map((detail, index) => {
    const depDate = detail.flight_date || group.dept_date || "";

    return {
      id: detail.id || null,
      group_id: detail.group_id || group.id || null,
      sr: toNumber(detail.sr, index + 1),
      flight_no: buildALSABOORFlightNo(detail.flight_no, airlineShortName),
      dep_date: depDate,
      flight_date: depDate,
      dept_time: detail.dept_time || "",
      origin: detail.origin || "",
      destination: detail.destination || "",
      arv_date:
        deriveALSABOORLegArrivalDate(depDate, detail.dept_time, detail.arv_time) ||
        group.arv_date ||
        null,
      arv_time: detail.arv_time || "",
      baggage: detail.baggage || group.baggage || "",
      meal: group.meal || "",
      bookedSeats: 0,
    };
  });

// AL SABOOR's `sector` field is an internal numeric ID (e.g. "11"), not a route
// string — derive a route like "LHE-JED" from the flight details instead, so
// it sorts/groups consistently with the other sources.
const deriveALSABOORSector = (group) => {
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

// AL SABOOR returns `airline` as an array (not an object) on group payloads.
export const normalizeALSABOORGroup = (group = {}, index = 0) => {
  const airline = Array.isArray(group.airline)
    ? group.airline[0]
    : group.airline;
  const airlineName = airline?.airline_name || "";
  const airlineShortName = airline?.short_name || airlineName.substring(0, 2);
  const availableSeats = toNumber(group.available_no_of_pax);
  const sector = deriveALSABOORSector(group);

  return {
    id: group.id || `ALSABOOR_${Date.now()}_${index}`,
    source: "ALSABOOR",
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

    details: normalizeALSABOORDetails(group, airlineShortName),

    airline: {
      id: airline?.id || group.airline_id || null,
      airline_name: airlineName,
      short_name: airlineShortName,
      logo_url:
        "https://alsaboor.pk/assets/img/airline-logo/" + airline?.logo_url ||
        null,
    },

    user: null,
    bookedSeats: 0,
  };
};

export const getALSABOORGroups = async (type) => {
  try {
    const response = await ALSABOOR.get(ALSABOOR_ENDPOINTS.groups, {});
    return response.data?.groups || [];
  } catch (error) {
    console.log(
      `Error fetching "${type}" groups from AL SABOOR`,
      error.message,
    );
    return [];
  }
};

export const fetchNormalisedALSABOORGroups = async (
  types = ALSABOOR_GROUP_TYPES,
) => {
  const groupsByType = await Promise.all(
    types.map((type) => getALSABOORGroups(type)),
  );
  return groupsByType
    .flat()
    .map((group, index) => normalizeALSABOORGroup(group, index));
};

export const getALSABOORGroupDetails = async (groupId) => {
  try {
    const response = await ALSABOOR.get(ALSABOOR_ENDPOINTS.groupDetails, {
      params: { group_id: groupId },
    });

    return response.data?.groups?.[0] || null;
  } catch (error) {
    console.log("Error fetching AL SABOOR group details", error.message);
    throw error;
  }
};

// Builds the parallel-array booking body the AL SABOOR "create booking" endpoint
// expects — one entry per passenger in pax_title/human_type/sur_name/etc.,
// and one entry per passenger *of that type* in adult_price/child_price/infant_price.
export const formatBookingForALSABOOR = ({
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
    pax_title: passengers.map((p) =>
      getALSABOORPassengerTitle(p.type, p.title),
    ),
    // AL SABOOR's backend appears to read this as an int (parseInt("adult") === 0
    // in PHP, which is exactly the "0" we got back for every passenger type
    // including children/infants) — send the numeric PTC code instead.
    human_type: passengers.map((p) =>
      String(ALSABOOR_HUMAN_TYPE_CODE[p.type] ?? 0),
    ),
    sur_name: passengers.map((p) => p.surname || ""),
    given_name: passengers.map((p) => p.givenName || ""),
    pass_no: passengers.map((p) => p.passport || ""),
    dob: passengers.map((p) => formatALSABOORDate(p.dateOfBirth)),
    doi: passengers.map((p) => formatALSABOORDate(p.passportIssue)),
    doe: passengers.map((p) => formatALSABOORDate(p.passportExpiry)),
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

// AL SABOOR's backend reads a classic PHP $_POST body, not a JSON payload —
// array fields (pax_title, sur_name, ...) must be sent with `[]` suffixed
// keys repeated once per value, the way an HTML form would submit them.
const toALSABOORFormBody = (data) => {
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

export const createALSABOORBooking = async (bookingData) => {
  try {
    const { agentId } = getALSABOORConfig();
    const token = await getValidToken(ALSABOOR_PROVIDER);
    const body = toALSABOORFormBody({
      token,
      ...bookingData,
      agent_id: agentId,
    });

    const response = await ALSABOOR.post(
      ALSABOOR_ENDPOINTS.createBooking,
      body,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    return response.data;
  } catch (error) {
    console.log("AL SABOOR create booking error", error.message);
    throw error;
  }
};

export const getALSABOORBooking = async (bookingId) => {
  try {
    const response = await ALSABOOR.get(ALSABOOR_ENDPOINTS.getBooking, {
      params: { booking_id: bookingId },
    });
    return response.data;
  } catch (error) {
    console.log("AL SABOOR get booking error", error.message);
    throw error;
  }
};

export const getALSABOORBookingPrintDetails = async (bookingId) => {
  try {
    const response = await ALSABOOR.get(
      ALSABOOR_ENDPOINTS.getBookingPrintDetails,
      {
        params: { booking_id: bookingId },
      },
    );
    return response.data;
  } catch (error) {
    console.log("AL SABOOR get booking print details error", error.message);
    throw error;
  }
};

export const getALSABOORBookingStatus = async (bookingId) => {
  try {
    const response = await ALSABOOR.get(ALSABOOR_ENDPOINTS.getBookingStatus, {
      params: { booking_id: bookingId },
    });
    return response.data;
  } catch (error) {
    console.log("AL SABOOR get booking status error", error.message);
    throw error;
  }
};

export default ALSABOOR;
