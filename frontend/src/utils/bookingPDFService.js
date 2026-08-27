import axiosInstance from "../api/axios";

// Colors used across the printed Travel Itinerary template.
const NAVY = "#163a63";
const NAVY_SOFT = "#4b6584";
const LIGHT_BLUE = "#eef4fb";
const BORDER_BLUE = "#cddcee";
const MUTED = "#8a94a3";
const BODY_TEXT = "#1f2937";

const ICON_MEAL = (color) =>
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2v7a2 2 0 0 0 2 2v11"/><path d="M7 2v4M11 2v4"/><path d="M17 2c-1.7 0-3 2-3 5s1.3 5 3 5v10"/></svg>`;

const ICON_BAGGAGE = (color) =>
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`;

const ICON_CLOCK = (color) =>
  `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>`;

const ICON_PHONE = (color) =>
  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

const ICON_MAIL = (color) =>
  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>`;

const ICON_PLANE = (color) =>
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="${color}"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`;

const ICON_KAABA = (color) =>
  `<svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 20h44v34H10V20Z" fill="${color}"/><path d="M10 20h44v9H10V20Z" fill="#111827"/><path d="M15 24h34" stroke="#D4AF37" stroke-width="3" stroke-linecap="round"/><path d="M22 35h20M22 42h20" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/></svg>`;

const ICON_MOSQUE = (color) =>
  `<svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 30c0-8.8 7.2-16 16-16s16 7.2 16 16v17H15V30Z" fill="${color}"/><path d="M31 9c4 0 7.5 2.4 9 5.8A15.9 15.9 0 0 0 31 12a15.9 15.9 0 0 0-9 2.8C23.5 11.4 27 9 31 9Z" fill="${color}"/><path d="M47 19h6v28h-6V19Z" fill="${color}"/><path d="M50 11l5 8H45l5-8Z" fill="${color}"/><path d="M11 24h5v23h-5V24Z" fill="${color}"/><path d="M13.5 17l4.5 7H9l4.5-7Z" fill="${color}"/><path d="M26 47V36a5 5 0 0 1 10 0v11" fill="#ffffff" opacity=".92"/></svg>`;

const ICON_BUS = (color) =>
  `<svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="14" width="46" height="33" rx="5" fill="${color}"/><path d="M15 21h34v12H15V21Z" fill="#ffffff" opacity=".9"/><path d="M15 38h7M42 38h7" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="50" r="5" fill="${color}"/><circle cx="44" cy="50" r="5" fill="${color}"/><circle cx="20" cy="50" r="2" fill="#ffffff"/><circle cx="44" cy="50" r="2" fill="#ffffff"/></svg>`;

const ICON_BED = (color) =>
  `<svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 18h8v26h36v8H10V18Z" fill="${color}"/><path d="M22 30h12a5 5 0 0 1 5 5v9H22V30Z" fill="${color}"/><path d="M39 28h8a7 7 0 0 1 7 7v9H39V28Z" fill="${color}"/><circle cx="27" cy="25" r="5" fill="${color}"/></svg>`;

// Booking objects often carry an embedded airline snapshot whose logoUrl was
// blank at the time the booking was made. Look the airline up fresh so a
// logo added/updated afterwards is still picked up; falls back to "" so the
// caller can show the airline name instead.
const fetchAirlineLogo = async (airlineId) => {
  if (!airlineId) return "";
  try {
    const res = await axiosInstance.get(`/airline/${airlineId}`);
    return res?.data?.data?.logo || "";
  } catch {
    return "";
  }
};

// Umrah package/group-ticket bookings don't reference the master Airline
// collection by id - they only carry a free-text airline name (from the
// package's own "flightLogo" upload, which is often left blank). Fall back
// to matching that name against the master Airline list so the same logo
// used on GDS bookings shows up here too.
const fetchAirlineLogoByName = async (airlineName) => {
  const name = (airlineName || "").trim().toLowerCase();
  if (!name || name === "airline") return "";
  try {
    const res = await axiosInstance.get(`/airline`);
    const airlines = res?.data?.data || [];
    const match = airlines.find(
      (a) =>
        (a.airlineName || "").trim().toLowerCase() === name ||
        (a.shortCode || "").trim().toLowerCase() === name,
    );
    return match?.logo || "";
  } catch {
    return "";
  }
};

const STATUS_LABELS = {
  "on hold": "On Hold",
  pending: "On Hold",
  confirmed: "Confirmed",
  "partially confirmed": "Partially Confirmed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
};

const formatStatusLabel = (status) => {
  if (!status) return "N/A";
  const key = status.toLowerCase().trim();
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const printGDSBooking = async (booking) => {
  // "17-Aug-2026" style, timezone-safe for plain YYYY-MM-DD strings.
  const formatDateOnly = (dateStr) => {
    if (!dateStr) return "";
    let d;
    if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("en-GB", { month: "short" });
    return `${day}-${month}-${d.getFullYear()}`;
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const flight = booking.flights?.[0] || {};
  const bookingStatus = (
    booking.status ||
    booking.bookingStatus ||
    "N/A"
  ).toUpperCase();

  const airlineName = (
    booking.airline?.name ||
    flight.airlineName ||
    flight.airline ||
    "AIRLINE"
  ).toUpperCase();
  let airlineLogo =
    booking.airline?.logoUrl ||
    booking.airline?.logo ||
    flight.airlineLogo ||
    booking.flightLogo ||
    "";
  const airlineId = booking.airline?.id || booking.airline?._id || "";
  if (!airlineLogo && airlineId) {
    airlineLogo = await fetchAirlineLogo(airlineId);
  }
  if (!airlineLogo && !airlineId) {
    airlineLogo = await fetchAirlineLogoByName(airlineName);
  }

  const pnr = booking.pnr || booking.bookingReference || "N/A";
  const bookingId =
    booking.bookingReference ||
    booking.bookingId ||
    booking.counter ||
    booking._id ||
    "N/A";

  const passengers =
    booking.passengers && booking.passengers.length > 0
      ? booking.passengers
      : [{ type: "Adult", title: "", givenName: "PASSENGER", surName: "NAME" }];

  const escapeHTML = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const titleCase = (value) =>
    value
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const packageSource =
    booking.packageData ||
    booking.package ||
    booking.umrahPackage ||
    (booking.packageId && typeof booking.packageId === "object"
      ? booking.packageId
      : {}) ||
    {};

  const packageHotels =
    booking.hotels ||
    packageSource.hotels ||
    packageSource.metadata?.hotels ||
    [];

  const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value) return [value];
    return [];
  };

  const firstNonEmptyArray = (...values) =>
    values.map(toArray).find((items) => items.length > 0) || [];

  const packageTransports = firstNonEmptyArray(
    booking.transport,
    booking.transports,
    packageSource.transport,
    packageSource.transports,
    packageSource.metadata?.transport,
    packageSource.metadata?.transports,
  );

  const getHotelCity = (hotel) =>
    (
      hotel?.city ||
      hotel?.location?.city ||
      hotel?.originalHotel?.city ||
      hotel?.originalHotel?.location?.city ||
      hotel?.hotel?.city ||
      hotel?.hotel?.location?.city ||
      ""
    ).toString();

  const getHotelName = (hotel) =>
    (
      hotel?.name ||
      hotel?.hotelName ||
      hotel?.originalHotel?.name ||
      hotel?.hotel?.name ||
      ""
    ).toString();

  const joinUnique = (values, fallback = "N/A") => {
    const cleaned = values
      .map((value) => value?.toString().trim())
      .filter(Boolean);
    const unique = Array.from(new Set(cleaned));
    return unique.length ? unique.join(", ") : fallback;
  };

  // Same de-dupe as joinUnique, but renders each entry on its own line
  // (via <br/>) instead of a single comma-separated paragraph. Escapes each
  // entry itself, so the caller must NOT run the result through escapeHTML again.
  const joinUniqueLines = (values, fallback = "N/A") => {
    const cleaned = values
      .map((value) => value?.toString().trim())
      .filter(Boolean);
    const unique = Array.from(new Set(cleaned));
    return unique.length ? unique.map((v) => escapeHTML(v)).join("<br/>") : fallback;
  };

  const getRoomTypeFromRooms = (rooms) => {
    if (!rooms || typeof rooms !== "object") return "";
    return Object.entries(rooms)
      .filter(([, count]) => Number(count) > 0)
      .map(([type, count]) => {
        const label = titleCase(type);
        return Number(count) > 1 ? `${count} ${label}` : label;
      })
      .join(", ");
  };

  const makkahHotels = packageHotels.filter((hotel) =>
    /makkah|mecca/i.test(getHotelCity(hotel)),
  );
  const madinahHotels = packageHotels.filter((hotel) =>
    /madinah|madina|medina/i.test(getHotelCity(hotel)),
  );

  const makkahHotelText = joinUnique(makkahHotels.map(getHotelName));
  const madinahHotelText = joinUnique(madinahHotels.map(getHotelName));
  const transportText = joinUniqueLines(
    packageTransports.map((transport) => {
      const route = (
        transport?.route ||
        transport?.travelRoute ||
        transport?.name ||
        ""
      ).toString();
      const type = (
        transport?.transportType ||
        transport?.vehicleType ||
        transport?.type ||
        ""
      ).toString();
      if (route && type) return `${type} (${route})`;
      return route || type;
    }),
  );
  const roomTypeText =
    titleCase(
      (
        booking.roomType ||
        booking.selectedRoomType ||
        packageSource.roomType ||
        packageSource.selectedRoomType ||
        ""
      ).toString(),
    ) ||
    getRoomTypeFromRooms(booking.rooms || packageSource.rooms) ||
    "N/A";

  const packageDetailsHTML = `
    <div class="package-details">
        <div class="package-title">Package Details</div>
        <div class="package-grid">
            <div class="package-item">
                <div class="package-icon">${ICON_KAABA(NAVY)}</div>
                <div>
                    <div class="package-label">Makkah Hotel</div>
                    <div class="package-value">${escapeHTML(makkahHotelText)}</div>
                </div>
            </div>
            <div class="package-item">
                <div class="package-icon">${ICON_MOSQUE("#098642")}</div>
                <div>
                    <div class="package-label">Madinah Hotel</div>
                    <div class="package-value">${escapeHTML(madinahHotelText)}</div>
                </div>
            </div>
            <div class="package-item">
                <div class="package-icon">${ICON_BUS(NAVY)}</div>
                <div>
                    <div class="package-label">Transport</div>
                    <div class="package-value">${transportText}</div>
                </div>
            </div>
            <div class="package-item">
                <div class="package-icon">${ICON_BED(NAVY)}</div>
                <div>
                    <div class="package-label">Room Type</div>
                    <div class="package-value">${escapeHTML(roomTypeText)}</div>
                </div>
            </div>
        </div>
    </div>`;

  const travelType =
    booking.groupType ||
    booking.travelType ||
    (booking.packageName
      ? "Umrah Group"
      : booking.groupTicketData || passengers.length > 1
        ? "Group Booking"
        : "Individual Booking");

  const flightsArr =
    booking.flights && booking.flights.length > 0 ? booking.flights : [flight];

  // Fallback leg codes parsed from the booking-level sector string, e.g.
  // "LYP-JED-LYP" -> leg 0 is LYP->JED, leg 1 is JED->LYP.
  const sectorLegCodes = (booking.sector || "")
    .split("-")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const originCode = (
    booking.originCode ||
    booking.originIata ||
    sectorLegCodes[0] ||
    ""
  ).toUpperCase();
  const destCode = (
    booking.destinationCode ||
    booking.destinationIata ||
    sectorLegCodes[sectorLegCodes.length - 1] ||
    ""
  ).toUpperCase();

  // Pulls a 3-letter airport code out of either a dedicated code field or a
  // "City (CODE)" string like "Faisalabad (LYP)".
  const extractCode = (codeField, labelField) => {
    if (codeField) return codeField.toUpperCase();
    if (labelField) {
      const m = labelField.match(/\(([A-Za-z]{3})\)/);
      if (m) return m[1].toUpperCase();
    }
    return "";
  };

  const itineraryRowsHTML = flightsArr
    .map((f, index) => {
      const fNum = f.flightNo || booking.flightNumber || "XX000";
      const fAirline = (
        f.airlineName ||
        f.airline ||
        booking.airline?.name ||
        "AIRLINE"
      ).toUpperCase();

      let fOriginCode =
        extractCode(f.originCode || f.sectorFrom, f.origin) ||
        sectorLegCodes[index] ||
        originCode;
      let fDestCode =
        extractCode(f.destinationCode || f.sectorTo, f.destination) ||
        sectorLegCodes[index + 1] ||
        destCode;
      fOriginCode = fOriginCode || "N/A";
      fDestCode = fDestCode || "N/A";

      const fDepTime = f.depTime || booking.depTime || "--:--";
      const fArrTime = f.arrTime || booking.arrTime || "--:--";

      const fDepDate = formatDateOnly(
        f.departureDate ||
        f.depDate ||
        f.date ||
        (index === 0
          ? booking.departureDate
          : booking.returnDate || booking.arrivalDate),
      );

      const baggageRaw = (f.baggage || booking.baggageWeight || "20KG")
        .toString()
        .toUpperCase();
      const baggageMatch = baggageRaw.match(/(\d+)\s*KG/);
      const baggageLine1 = baggageMatch ? `${baggageMatch[1]} KG` : baggageRaw;

      const mealRaw = f.meal ?? (f.mealIncluded === false ? "No" : "Yes");
      const mealIncluded = !/^(no|false|0)$/i.test(String(mealRaw).trim());

      return `
        <tr>
            <td>${fDepDate}</td>
            <td>${fAirline} / ${fNum}</td>
            <td>${fOriginCode}</td>
            <td>${fDepTime}</td>
            <td>${fDestCode}</td>
            <td>${fArrTime}</td>
            <td>
                <div class="cell-icon-row">
                    ${ICON_MEAL(NAVY_SOFT)}
                    <div class="cell-text"><div class="l1">Meal</div><div class="l2">${mealIncluded ? "Included" : "Not Included"}</div></div>
                </div>
            </td>
            <td>
                <div class="cell-icon-row">
                    ${ICON_BAGGAGE(NAVY_SOFT)}
                    <div class="cell-text"><div class="l1">${baggageLine1}</div><div class="l2">Checked</div></div>
                </div>
            </td>
        </tr>`;
    })
    .join("");

  const refundedIndices = booking.refundedPassengerIndices || [];

  const passengersHTML = passengers
    .map((p, i) => {
      const name = [p.title, p.givenName, p.surName].filter(Boolean).join(" ") || "PASSENGER NAME";
      const type = (p.type || "Adult").toUpperCase();
      const status = refundedIndices.includes(i)
        ? "Cancelled"
        : formatStatusLabel(p.status || booking.status || booking.bookingStatus);
      return `
        <tr>
            <td>${String(i + 1).padStart(2, "0")}</td>
            <td>${name}</td>
            <td>${type}</td>
            <td>${p.passport || p.passportNumber || "–"}</td>
            <td>${status}</td>
        </tr>`;
    })
    .join("");

  const expiresAt = booking.expiresAt;
  const isTicketed =
    bookingStatus === "CONFIRMED" ||
    bookingStatus === "ISSUED" ||
    bookingStatus === "TICKETED";

  const reservationBoxHTML =
    expiresAt && !isTicketed
      ? `
        <div class="reservation-box">
            <div class="clock-icon">${ICON_CLOCK(NAVY)}</div>
            <div>
                <div class="res-title">RESERVATION TIME LIMIT</div>
                <div class="res-row">Date&nbsp;&nbsp;:&nbsp;&nbsp;${formatDateOnly(expiresAt)}</div>
                <div class="res-row">Time&nbsp;&nbsp;:&nbsp;&nbsp;${formatTimeOnly(expiresAt)} (Local Time)</div>
            </div>
        </div>
        <div class="note-text">Seats reserved until the above date &amp; time.</div>`
      : `
        <div class="reservation-box">
            <div class="clock-icon">${ICON_CLOCK(NAVY)}</div>
            <div>
                <div class="res-title">RESERVATION TIME LIMIT</div>
                <div class="res-row">Status&nbsp;&nbsp;:&nbsp;&nbsp;Ticket Issued / Confirmed</div>
            </div>
        </div>
        <div class="note-text">This itinerary has been ticketed and confirmed.</div>`;

  const shouldShowPackageDetails =
    booking.printType === "umrah-package" || booking.showPackageDetails === true;

  const shouldHideTravelItineraryTitle =
    booking.printType === "umrah-package" ||
    booking.hideTravelItineraryTitle === true;

  const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Travel Itinerary</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
        @media print {
            @page { margin: 1mm; size: A4 portrait; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; }
        body { font-family: 'Roboto', Arial, Helvetica, sans-serif; font-size: 12px; color: ${BODY_TEXT}; margin: 0; padding: 28px; background: #fff; }
        .doc { max-width: 800px; margin: 0 auto; }

        .top-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid ${NAVY}; margin-bottom: 8px; }
        .brand-left img { max-height: 40px; max-width: 150px; width: auto; object-fit: contain; display: block; margin-bottom: 4px; }
        .brand-left .airline-fallback { font-size: 20px; font-weight: 800; color: ${NAVY}; }
        .brand-left .airline-name { font-size: 11px; color: ${NAVY_SOFT}; font-weight: 700; letter-spacing: 0.4px; }
        .brand-right { text-align: right; }
        .brand-right .agency-name { font-size: 15px; font-weight: 800; color: ${NAVY}; letter-spacing: 0.3px; }
        .brand-right .agency-tag { font-size: 11px; color: ${NAVY}; margin-top: 2px; }

        .doc-title { text-align: center; font-size: 30px; font-weight: 800; color: ${NAVY}; letter-spacing: 1px; margin: 0px 0 4px; }
        .doc-subtitle { font-size: 11px; color: ${MUTED}; margin-bottom: 20px; }

        .info-box { display: flex; background: ${LIGHT_BLUE}; border: 1px solid ${BORDER_BLUE}; margin-bottom: 22px; overflow: hidden; }
        .info-box .info-col { flex: 1; padding: 12px 20px; }
        .info-box .info-col + .info-col { border-left: 1px solid ${BORDER_BLUE}; }
        .info-box .info-label { font-size: 11px; font-weight: 700; color: ${NAVY}; margin-bottom: 4px; }
        .info-box .info-value { font-size: 13px; color: ${BODY_TEXT}; font-weight: 600; }

        .package-details { border: 1px solid ${BORDER_BLUE}; margin: 12px 0 16px; padding: 9px 10px 10px; }
        .package-title { font-size: 12px; font-weight: 800; color: ${NAVY}; text-transform: uppercase; margin-bottom: 8px; }
        .package-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
        .package-item { min-width: 0; display: flex; align-items: center; gap: 8px; padding: 3px 10px; border-right: 1px solid ${BORDER_BLUE}; }
        .package-item:last-child { border-right: 0; }
        .package-icon { flex: 0 0 34px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; }
        .package-label { font-size: 10.5px; font-weight: 800; color: ${NAVY}; margin-bottom: 2px; }
        .package-value { font-size: 9.2px; color: ${BODY_TEXT}; font-weight: 600; line-height: 1.25; word-break: break-word; }

        .section-title { font-size: 15px; font-weight: 800; color: ${NAVY}; letter-spacing: 0.5px; margin: 16px 0 10px; text-transform: uppercase; }

        table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        table.data-table thead tr { background: ${NAVY}; color: #fff; }
        table.data-table th { padding: 9px 12px; text-align: left; font-size: 11.5px; font-weight: 700; }
        table.data-table.itinerary-table th { text-transform: uppercase; letter-spacing: 0.3px; }
        table.data-table td { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
        table.data-table tbody tr:nth-child(even) { background: #f8fafc; }

        .cell-icon-row { display: flex; align-items: center; gap: 8px; }
        .cell-icon-row .cell-text { line-height: 1.3; }
        .cell-icon-row .cell-text .l1 { font-weight: 600; }
        .cell-icon-row .cell-text .l2 { color: ${MUTED}; font-size: 10.5px; }

        .note-text { font-size: 11px; color: ${NAVY}; font-style: italic; margin: 8px 0 4px; }

        .reservation-box { display: flex; align-items: center; gap: 16px; background: #f7fafc; border: 1px solid ${BORDER_BLUE}; padding: 16px 20px; }
        .reservation-box .res-title { font-size: 13px; font-weight: 800; color: ${NAVY}; margin-bottom: 6px; letter-spacing: 0.3px; }
        .reservation-box .res-row { font-size: 12px; color: ${BODY_TEXT}; margin-bottom: 2px; }

        .terms-list { margin: 0; padding-left: 18px; }
        .terms-list li { font-size: 12px; color: ${BODY_TEXT}; margin-bottom: 6px; line-height: 1.4; }

        .issued-by .company-name { font-size: 13px; font-weight: 800; color: ${NAVY}; margin-bottom: 4px; }
        .issued-by .addr-line { font-size: 12px; color: #374151; margin-bottom: 2px; }
        .issued-by .contact-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #374151; margin-top: 6px; }
        .issued-by .contact-row + .contact-row { margin-top: 4px; }

        .footer { margin-top: 26px; padding-top: 14px; border-top: 2px solid ${NAVY}; text-align: center; }
        .footer .thanks { font-size: 12px; color: ${NAVY}; font-weight: 600; font-style: italic; display: flex; align-items: center; justify-content: center; gap: 8px; }
    </style>
</head>
<body>
    <div class="doc">
        <div class="top-header">
            <div class="brand-left">
                ${airlineLogo
      ? `<img src="${airlineLogo}" alt="${airlineName}" onerror="this.outerHTML='<span class=&quot;airline-fallback&quot;>${airlineName}</span>'" />`
      : `<span class="airline-fallback">${airlineName}</span>`
    }
                <!-- <div class="airline-name">${airlineName}</div> -->
            </div>
            <div class="brand-right">
                <div class="agency-name">ABID AIR INTERNATIONAL (PVT) LTD</div>
                <div class="agency-tag">IATA Accredited Travel Agency</div>
            </div>
        </div>

        ${shouldHideTravelItineraryTitle ? "" : `<div class="doc-title">TRAVEL ITINERARY</div>`}

        <div class="info-box">
            <div class="info-col">
                <div class="info-label">Booking Reference</div>
                <div class="info-value">${bookingId}</div>
            </div>
            <div class="info-col">
                <div class="info-label">Airline PNR</div>
                <div class="info-value">${pnr}</div>
            </div>
            <div class="info-col">
                <div class="info-label">Travel Type</div>
                <div class="info-value">${travelType}</div>
            </div>
        </div>

        <div class="section-title">Passengers</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Passport Number</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${passengersHTML}
            </tbody>
        </table>

        ${shouldShowPackageDetails ? packageDetailsHTML : ""}

        <div class="section-title">Itinerary</div>
        <table class="data-table itinerary-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Airline / Flight</th>
                    <th>From</th>
                    <th>Depart</th>
                    <th>To</th>
                    <th>Arrive</th>
                    <th>Meal</th>
                    <th>Baggage</th>
                </tr>
            </thead>
            <tbody>
                ${itineraryRowsHTML}
            </tbody>
        </table>
        <div class="note-text">Note: Meal and baggage allowance are as per airline policy and subject to change.</div>

        <div class="section-title">Reserved &amp; Issued / Cancel Time</div>
        ${reservationBoxHTML}

        <div class="section-title">Travel Notes</div>
        <ul class="terms-list">
            <li>Check-in and airport reporting requirements are determined by the operating airline.</li>
            <li>Travel documents must be valid and available at check-in.</li>
            <li>Flight times may change due to operational requirements.</li>
            <li>Baggage allowance should be verified against the issued fare/ticket.</li>
            <li>Itinerary is not valid for travel unless ticket is issued.</li>
        </ul>

        <div class="section-title">Issued By</div>
        <div class="issued-by">
            <div class="company-name">ABID AIR INTERNATIONAL (PVT) LTD</div>
            <div class="addr-line">G2, Ch Arcade, Regency Road, Faisalabad</div>
            <div class="addr-line">Opp. TMA Office, Faisalabad Road, Samundri</div>
            <div class="contact-row">${ICON_PHONE(NAVY_SOFT)}<span>0300-7277854&nbsp;&nbsp;•&nbsp;&nbsp;0300-7298467&nbsp;&nbsp;•&nbsp;&nbsp;0349-4900118</span></div>
            <div class="contact-row">${ICON_MAIL(NAVY_SOFT)}<span>abid_intl@msn.com&nbsp;&nbsp;•&nbsp;&nbsp;abidairtravels.com</span></div>
        </div>

        <div class="footer">
            <div class="thanks">${ICON_PLANE(NAVY)}<span>Thank you for choosing Abid Air International.</span></div>
        </div>
    </div>
</body>
</html>
`;

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(ticketHTML);
  doc.close();

  iframe.onload = () => {
    const iframeDoc = iframe.contentWindow?.document;
    const images = Array.from(iframeDoc?.images || []);
    const imageLoads = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });
    // Give the Roboto webfont a chance to finish loading so it doesn't
    // silently fall back to Arial on print.
    const fontsReady = iframeDoc?.fonts?.ready
      ? iframeDoc.fonts.ready.catch(() => undefined)
      : Promise.resolve();

    Promise.all([...imageLoads, fontsReady]).finally(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Print failed", e);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    });
  };
};
