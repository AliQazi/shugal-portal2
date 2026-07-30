import axios from "axios";
import { getValidToken, invalidateToken } from "./thirdPartyAuth.js";

const PROVIDER = "UPSKY_UMRAH";

const ENDPOINTS = {
  groups: "/groups",
  groupDetails: "/group-details",
  booking: "/booking",
  getBooking: "/get-booking",
};

const UpSkyUmrah = axios.create({
  timeout: 30000,
  headers: { Accept: "application/json" },
});

// Every endpoint (except login) needs the token as a query param; the
// booking POST additionally needs it inside the JSON body (per docs).
UpSkyUmrah.interceptors.request.use(async (config) => {
  const baseURL = (process.env.UPSKY_UMRAH_API_URL || "").replace(/\/$/, "");
  const token = await getValidToken(PROVIDER);

  config.baseURL = baseURL;
  config.params = { ...config.params, token };

  if (
    config.method === "post" &&
    config.data &&
    typeof config.data === "object"
  ) {
    config.data = { token, ...config.data };
  }

  return config;
});

UpSkyUmrah.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (
      error.response &&
      [401, 403].includes(error.response.status) &&
      config &&
      !config._retriedAfterTokenRefresh
    ) {
      config._retriedAfterTokenRefresh = true;
      await invalidateToken(PROVIDER);
      return UpSkyUmrah(config);
    }

    if (error.response) {
      console.error("Up Sky Umrah API Error:", error.response.data);
      const enhancedError = new Error(
        error.response.data?.message || "Up Sky Umrah API request failed",
      );
      enhancedError.upskyUmrahResponseData = error.response.data;
      enhancedError.upskyUmrahStatusCode = error.response.status;
      throw enhancedError;
    }

    if (error.request) {
      console.error("Up Sky Umrah API No Response:", error.request);
      throw new Error("No response from Up Sky Umrah API");
    }

    console.error("Up Sky Umrah API Error:", error.message);
    throw new Error(error.message);
  },
);

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toDateOrUndefined = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

// Up Sky returns HTTP 200 with `{ status: "error", ... }` when the token is
// stale/invalid — not a 401/403 — so the axios-level retry-on-401 logic
// never catches it. Treat a non-"success" body as a token problem too:
// drop the cached token and retry once before giving up.
const getWithTokenRetry = async (path, params) => {
  let response = await UpSkyUmrah.get(path, { params });
  if (response.data?.status !== "success") {
    await invalidateToken(PROVIDER);
    response = await UpSkyUmrah.get(path, { params });
  }
  return response.data;
};

export const getUpSkyUmrahGroups = async () => {
  const data = await getWithTokenRetry(ENDPOINTS.groups);
  if (data?.status !== "success") return [];
  return data?.data || [];
};

export const getUpSkyUmrahGroupDetails = async (groupId) => {
  const data = await getWithTokenRetry(ENDPOINTS.groupDetails, {
    group_id: groupId,
  });
  if (data?.status !== "success") return null;
  return data?.data || null;
};

// Room-type keys as used by the rest of this app's booking flow
// (GroupTicketingSchema.rooms / UmrahPackageBooking.roomType) vs. the keys
// Up Sky's umrah-packages API expects. Up Sky has no "quint" equivalent.
const ROOM_TYPE_TO_UPSKY = {
  sharing: "shared",
  shared: "shared",
  double: "double",
  triple: "triple",
  quad: "quad",
};

export const upskyRoomTypeKey = (roomType) =>
  ROOM_TYPE_TO_UPSKY[roomType] || "shared";

const FLIGHT_CLASS_LABEL = { economy: "Economy", business: "Business" };

const normalizeFlight = (detail, airline) => ({
  airline: airline || "",
  flightNo: detail.flight_no || "",
  depDate: toDateOrUndefined(detail.date),
  depTime: detail.departure_date_time || "",
  arrDate: toDateOrUndefined(detail.arrival_date || detail.date),
  arrTime: detail.arrival_date_time || "",
  sectorFrom: detail.sector_from || "",
  sectorTo: detail.sector_to || "",
  fromTerminal: detail.terminal || "",
  toTerminal: detail.to_terminal || "",
  flightClass:
    FLIGHT_CLASS_LABEL[String(detail.flight_class || "").toLowerCase()] ||
    detail.flight_class ||
    "",
  baggage: detail.baggage || "",
  meal: detail.meal || "",
});

const HOTEL_ROOM_KEY_MAP = {
  shared: "sharedRoom",
  double: "doubleRoom",
  triple: "tripleRoom",
  quad: "quadRoom",
};

const normalizeRoomPricing = (detail) => ({
  buyingPrice: toNumber(detail?.buying_pkr),
  buyingRoe: 1,
  sellingPrice: toNumber(detail?.selling_pkr),
  sellingRoe: 1,
});

const normalizeHotel = (hotel) => {
  const detailsByRoomType = {};
  (hotel.details || []).forEach((detail) => {
    detailsByRoomType[detail.room_type] = detail;
  });

  const hotelEntry = {
    name: hotel.hotel_name || "",
    supplier: {
      name: hotel.supplier_acc_name || "",
      _id: hotel.supplier_acc_id != null ? String(hotel.supplier_acc_id) : "",
    },
    location: {
      city: hotel.city_name || "",
      distance:
        hotel.hotel_distance != null ? String(hotel.hotel_distance) : "",
    },
    rating: 0,
    checkIn: toDateOrUndefined(hotel.checkin),
    checkOut: toDateOrUndefined(hotel.checkout),
    nights: toNumber(hotel.nights),
    nightCount: toNumber(hotel.nights),
  };

  Object.entries(HOTEL_ROOM_KEY_MAP).forEach(([upskyKey, schemaKey]) => {
    hotelEntry[schemaKey] = normalizeRoomPricing(detailsByRoomType[upskyKey]);
  });

  return hotelEntry;
};

const normalizeTransport = (transport) => ({
  route: transport.route || "",
  supplier: {
    name: transport.supplier_acc_name || "",
    _id:
      transport.supplier_acc_id != null
        ? String(transport.supplier_acc_id)
        : "",
  },
  transportType: transport.transport_type || "",
  startDate: toDateOrUndefined(transport.date),
  endDate: undefined,
});

const normalizeVisa = (visaRows) => {
  const visa = Array.isArray(visaRows) ? visaRows[0] : visaRows;
  if (!visa) return null;

  return {
    visaId: visa.id != null ? String(visa.id) : "",
    visaType: visa.visa_type || "",
    supplier: {
      name: visa.supplier_acc_name || "",
      _id: visa.supplier_acc_id != null ? String(visa.supplier_acc_id) : "",
    },
    withTransport: visa.visa_type === "transport",
    buyingPrice: toNumber(visa.buying_pkr),
    buyingRoe: 1,
    sellingPrice: toNumber(visa.selling_pkr),
    sellingRoe: 1,
    currency: "PKR",
  };
};

// Converts one Up Sky umrah package (groups summary + group-details) into
// the same shape local-db/Travel-Network packages use, so the rest of the
// app (listing, booking form, print tickets) doesn't need Up Sky-specific
// branches. The raw group-details payload is preserved under `upskyRaw` so
// the booking API call can be built with full fidelity later.
export const normalizeUpSkyUmrahPackage = (summary, details) => {
  const pkg = details?.package || summary;
  const groupDetails = details?.group_details || [];
  const hotels = details?.hotels || [];
  const transport = details?.transport || [];
  const visa = details?.visa || [];

  const id = String(pkg.id ?? pkg.group_id ?? summary.id);
  const airline = pkg.airline || summary.airline || "";
  const logoFile = pkg.logo || summary.logo || "";

  return {
    id: `upsky_${id}`,
    _id: `upsky_${id}`,
    packageName:
      [airline, pkg.package_name || summary.package_name]
        .filter(Boolean)
        .join(" ") || `Umrah Package ${id}`,
    logo: logoFile
      ? `https://upsky.pk/assets/img/airline-logo/${logoFile}`
      : "",
    flightLogo: logoFile
      ? `https://upsky.pk/assets/img/airline-logo/${logoFile}`
      : "",
    days: toNumber(pkg.no_days ?? summary.no_days),
    availableRooms: toNumber(pkg.rem_seats ?? summary.rem_seats),
    internalStatus: "Public",
    packageSource: "upsky",

    flights: groupDetails.map((detail) => normalizeFlight(detail, airline)),
    hotels: hotels.map(normalizeHotel),
    transports: transport.map(normalizeTransport),
    visa: normalizeVisa(visa),

    packageTotals: {
      double: toNumber(pkg.double_price ?? summary.double_price),
      triple: toNumber(pkg.triple_price ?? summary.triple_price),
      quad: toNumber(pkg.quad_price ?? summary.quad_price),
      shared: toNumber(pkg.shared_price ?? summary.shared_price),
      childWithoutBed: toNumber(pkg.s_child_pkr ?? pkg.child_pkr),
      infant: toNumber(pkg.s_infant_pkr ?? pkg.infant_pkr),
      incentive: 0,
    },

    upsky_group_id: id,
    upsky_package_id: id,
    // Raw group-details payload — the booking API needs field-for-field
    // fidelity that a normalized shape would lose.
    upskyRaw: details
      ? { package: pkg, group_details: groupDetails, hotels, transport, visa }
      : null,

    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const fetchNormalisedUpSkyUmrahPackages = async () => {
  try {
    const groups = await getUpSkyUmrahGroups();
    if (!groups.length) return [];

    const results = await Promise.allSettled(
      groups.map(async (summary) => {
        const details = await getUpSkyUmrahGroupDetails(
          summary.id ?? summary.group_id,
        );
        return normalizeUpSkyUmrahPackage(summary, details);
      }),
    );

    return results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value);
  } catch (error) {
    console.log("Error fetching umrah packages from Up Sky", error.message);
    return [];
  }
};

const formatUpSkyDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

const PASSENGER_TITLE_MAP = {
  Adult: "adult",
  Child: "child",
  Infant: "infant",
};

// Builds the Up Sky umrah-packages "create booking" payload from the raw
// group-details snapshot captured at listing time plus the passenger/room
// selection made on our booking form. Field names mirror the docs example
// and the raw `package` object 1:1 wherever possible.
export const buildUpSkyUmrahBookingPayload = ({
  upskyRaw,
  passengers = [],
  roomType,
  agentCode,
  agentName = "",
  contactPhone = "",
  holdMinutes = 120,
}) => {
  if (!upskyRaw?.package) {
    throw new Error("Missing Up Sky package snapshot for booking");
  }

  const pkg = upskyRaw.package;
  const upskyRoomKey = upskyRoomTypeKey(roomType);
  const roomSellingPrice = toNumber(pkg[`${upskyRoomKey}_price`]);
  const leadPax = passengers[0] || {};
  const totalPax = passengers.length;

  const priceForType = (type) => {
    if (type === "Adult") return String(roomSellingPrice);
    if (type === "Child")
      return String(toNumber(pkg.s_child_pkr ?? pkg.child_pkr));
    return String(toNumber(pkg.s_infant_pkr ?? pkg.infant_pkr));
  };

  const bookingLimit = new Date(Date.now() + holdMinutes * 60 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");

  const basic_info = {
    ...pkg,
    package_id: String(pkg.id),
    group_id: String(pkg.id),
    room_type: upskyRoomKey,
    final_price: String(roomSellingPrice),
    group_price: String(roomSellingPrice),
    groups_count: "1",
    no_pax: String(totalPax),
    seats: String(totalPax),
    df_roe: String(pkg.roe || "1"),
    agent_id: String(agentCode || ""),
    agent_name: agentName || pkg.agent_name || "",
    group_cat: pkg.group_cat || "Umrah Package",
    group_name: pkg.group_name || "",
    airline: pkg.airline || "",
    created_date: "",
    int_status: "",
    no_days: String(pkg.no_days || ""),
    seat_check: "",
    currency: "",
    s_currency: "",
    reo: "",
    s_reo: "",
    pnr: pkg.pnr_1 || "",
    package_name: pkg.package_name || "",
    booking_limit: bookingLimit,
    slab: `slab1_${totalPax}`,
    first_name: `${leadPax.givenName || ""} ${leadPax.surName || ""}`.trim(),
    pass_no: leadPax.passport || "",
    last_name: contactPhone || "",
    dob: formatUpSkyDate(leadPax.dateOfBirth),
    expiry_date: formatUpSkyDate(leadPax.passportExpiry),
  };

  const bookingPassengers = passengers.map((p) => ({
    title: PASSENGER_TITLE_MAP[p.type] || "adult",
    first_name: `${p.givenName || ""} ${p.surName || ""}`.trim(),
    pass_no: p.passport || "",
    price: priceForType(p.type),
  }));

  const flights = (upskyRaw.group_details || []).map((gd) => ({
    flight_no: gd.flight_no || "",
    flight_date: gd.date || "",
    sector_to: gd.sector_to || "",
    sector_from: gd.sector_from || "",
    flight_class: gd.flight_class || "",
    departure_date_time:
      `${gd.date || ""} ${gd.departure_date_time || ""}`.trim(),
    arrival_date_time:
      `${gd.arrival_date || gd.date || ""} ${gd.arrival_date_time || ""}`.trim(),
    meal: gd.meal || "",
    baggage: gd.baggage || "",
    terminal: gd.terminal || "",
    to_terminal: gd.to_terminal || "",
    arrival_date: gd.arrival_date || "",
  }));

  const hotels = (upskyRaw.hotels || []).map((hotel) => {
    const matchedDetail = (hotel.details || []).find(
      (d) => d.room_type === upskyRoomKey,
    );

    return {
      hotel_name: hotel.hotel_name || "",
      city: hotel.city_name || "",
      distance:
        hotel.hotel_distance != null ? String(hotel.hotel_distance) : "",
      buying_price: matchedDetail?.buying_pkr ?? "0",
      selling_price: matchedDetail?.selling_pkr ?? "0",
      checkin: hotel.checkin || "",
      checkout: hotel.checkout || "",
      nights: hotel.nights != null ? String(hotel.nights) : "",
      supplier_acc_id:
        hotel.supplier_acc_id != null ? String(hotel.supplier_acc_id) : "",
      supplier_acc_name: hotel.supplier_acc_name || "",
    };
  });

  const visaRow = Array.isArray(upskyRaw.visa)
    ? upskyRaw.visa[0]
    : upskyRaw.visa;
  const visaPayload = visaRow
    ? {
        type: visaRow.visa_type || "",
        buying_price: visaRow.buying_price ?? "0",
        buying_roe: visaRow.buying_roe ?? "1",
        buying_pkr: visaRow.buying_pkr ?? "0",
        selling_price: visaRow.selling_price ?? "0",
        selling_roe: visaRow.selling_roe ?? "1",
        selling_pkr: visaRow.selling_pkr ?? "0",
        supplier_acc_id:
          visaRow.supplier_acc_id != null
            ? String(visaRow.supplier_acc_id)
            : "",
        supplier_acc_name: visaRow.supplier_acc_name || "",
        route: visaRow.route || "",
        inf_buying_price: visaRow.inf_buying_price ?? "0",
        inf_buying_roe: visaRow.inf_buying_roe ?? "1",
        inf_buying_pkr: visaRow.inf_buying_pkr ?? "0",
        inf_selling_price: visaRow.inf_selling_price ?? "0",
        inf_selling_roe: visaRow.inf_selling_roe ?? visaRow.selling_roe ?? "1",
        inf_selling_pkr: visaRow.inf_selling_pkr ?? "0",
      }
    : undefined;

  const transport = (upskyRaw.transport || []).map((t) => ({
    type: t.transport_type || "",
    route: t.route || "",
    car_type: t.car_type || "",
    car_capacity: t.car_capacity || "",
    buying_price: t.buying_price ?? "0",
    buying_roe: t.buying_roe ?? "1",
    buying_pkr: t.buying_pkr ?? "0",
    selling_price: t.selling_price ?? "0",
    selling_roe: t.selling_roe ?? "1",
    selling_pkr: t.selling_pkr ?? "0",
    supplier_acc_id: t.supplier_acc_id != null ? String(t.supplier_acc_id) : "",
    supplier_acc_name: t.supplier_acc_name || "",
  }));

  return {
    basic_info,
    passengers: bookingPassengers,
    flights,
    hotels,
    ...(visaPayload ? { visa: visaPayload } : {}),
    transport,
  };
};

export const createUpSkyUmrahBooking = async (payload) => {
  const response = await UpSkyUmrah.post(ENDPOINTS.booking, payload);
  return response.data;
};

export const getUpSkyUmrahBooking = async (bookingId) => {
  const response = await UpSkyUmrah.get(ENDPOINTS.getBooking, {
    params: { booking_id: bookingId },
  });
  return response.data;
};

export default UpSkyUmrah;
