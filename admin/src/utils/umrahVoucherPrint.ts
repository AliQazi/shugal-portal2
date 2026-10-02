import qrcode from "qrcode-generator";

interface VoucherPassenger {
  type?: string; childType?: string; title?: string; givenName?: string; surName?: string;
  passport?: string; gender?: string; visaNumber?: string; groupNo?: string; pnr?: string;
}

interface VoucherFlight {
  airline?: string; flightNo?: string; flightNumber?: string; sectorFrom?: string; sectorTo?: string;
  originCode?: string; destinationCode?: string; origin?: string; destination?: string;
  depDate?: string; departureDate?: string; depTime?: string; departureTime?: string;
  arrDate?: string; arrivalDate?: string; arrTime?: string; arrivalTime?: string;
}

interface VoucherHotel {
  name?: string; hotelName?: string; city?: string; location?: { city?: string };
  originalHotel?: { name?: string; location?: { city?: string } };
  view?: string; meal?: string; mealPlan?: string; roomType?: string;
  confirmationNumber?: string; checkIn?: string; checkOut?: string;
  checkInDate?: string; checkOutDate?: string; nights?: number; nightCount?: number;
}

interface VoucherTransport {
  route?: string; transportType?: string; startDate?: string; travelDate?: string;
  transporter?: string; supplier?: { name?: string }; description?: string;
}

export interface VoucherPackage {
  packageName?: string; days?: number; flights?: VoucherFlight[]; hotels?: VoucherHotel[];
  transport?: VoucherTransport[]; transports?: VoucherTransport[];
}

export interface VoucherGroupTicket {
  _id?: string; flights?: VoucherFlight[]; groupNo?: string; pnr?: string;
}

// The voucher as saved on the booking. Every table row is stored exactly as it prints,
// so editing the voucher never touches the booking's pricing, passengers or package.
// Dates are "YYYY-MM-DD" strings (what <input type="date"> reads and writes).
export interface VoucherPassengerRow {
  passport: string; name: string; gender: string; type: string; bed: boolean;
  groupNo: string; visaNumber: string; pnr: string;
}

// `extra` is the original package record the row came from (baggage, meal, hotel id, rating, ...).
// The printed voucher ignores it; it lets saving write the row back onto the booking without
// dropping fields the voucher doesn't show.
type SourceRecord = Record<string, unknown>;

export interface VoucherHotelRow {
  city: string; name: string; view: string; meal: string; confirmationNumber: string;
  roomType: string; checkIn: string; checkOut: string; nights: number | null; extra?: SourceRecord;
}

export interface VoucherTransportRow {
  travelDate: string; transporter: string; transportType: string; description: string; extra?: SourceRecord;
}

export interface VoucherFlightRow {
  airline: string; flightNo: string; sectorFrom: string; sectorTo: string;
  depDate: string; depTime: string; arrDate: string; arrTime: string; extra?: SourceRecord;
}

export interface UmrahVoucherData {
  voucherNo: string; voucherDate: string; packageName: string; days: number | null;
  familyHead: string; manualNumber: string; specialInstructions: string; groupTicketId: string;
  passengers: VoucherPassengerRow[]; hotels: VoucherHotelRow[];
  transports: VoucherTransportRow[]; flights: VoucherFlightRow[];
  createdAt?: string; updatedAt?: string;
}

export interface UmrahVoucherBooking {
  _id: string; bookingNumber: string; packageName?: string; roomType?: string;
  createdAt?: string; overallStatus?: string; specialRequests?: string;
  familyHead?: string; manualNumber?: string;
  user?: { name?: string; companyName?: string; agencyCode?: string };
  passengers?: VoucherPassenger[];
  visaStatus?: { applicationNumber?: string };
  hotelStatus?: { confirmationNumber?: string };
  voucherStatus?: { voucherNumber?: string; generatedDate?: string };
  flightDetails?: {
    departure?: { date?: string; from?: string; to?: string; flightNumber?: string };
    return?: { date?: string; from?: string; to?: string; flightNumber?: string };
  };
  voucherData?: UmrahVoucherData | null;
  // The public page this voucher's QR code opens (set once the voucher is saved).
  voucherPublicUrl?: string | null;
}

// Kept as supplied in the reference voucher, independent of booking/supplier data.
const CONTACTS_DIRECTORY = [
  [
    { title: "MAKKAH MANAGEMENT", contacts: [
      ["Team Head", "Ch Zahid Jameel +966 597445773 WhatsApp"],
      ["Accommodation", "Mr Inayat +966 581269852"],
      ["Transport Day", "Yasir Rao +966 545832537"],
      ["Transport Night", "Ch Tahir Jameel +966 576305731"],
      ["Emergency", "+966 597445773"],
    ] },
    { title: "MAKKAH & TAIF ZIYARAAT", contacts: [
      ["", "Mr Azhar - +966 545621345"],
    ] },
  ],
  [
    { title: "MAKKAH HOTELS", contacts: [
      ["Mira Shaib", "Abdul Ahad - +966 568401680"],
      ["Mather Al Jiwar", "Rehman - +966 591160590"],
      ["Makaram Hijra", "Mr Inayat - +966 581269852"],
      ["Zad Al Bat", "Mr Azeem - +966 562706978"],
      ["Haris Hotel", "Mr Azeem - +966 562706978"],
      ["Land Premium", "Mr Azeem - +966 562706978"],
      ["Number One", "Dr Shahid - +966 534669821"],
      ["Night Duty", "Ali - +966 531952890"],
    ] },
  ],
  [
    { title: "MADINA TEAM & HOTELS", contacts: [
      ["Team Head", "Ch Waseem Ajmal - +966 510142264"],
      ["Transport", "Mirza Yasir - +966 580504305"],
      ["Markazia", "Mirza Yasir - +966 580504305"],
      ["Zafran", "Mr Zeeshan - +966 511514683"],
      ["Shaza Al Munawara", "Mr Usman - +966 580247558"],
      ["Diyar Al Awas", "Faisal - +966 575849313"],
      ["Mahad Al Madina 2", "Abrar - +966 566282795"],
      ["Shaza Barka", "Waseem - +966 594873552"],
      ["Shaza Al Aman", "Asghar - +966 583240012"],
      ["Shaza Al Hijra", "Asghar - +966 583240012"],
      ["Taj Al Medina", "Rehan - +966 550361674"],
      ["All Other Hotels", "Waseem Ajmal - +966 510142264"],
    ] },
    { title: "MADINA ZIYARAAT", contacts: [
      ["", "Waseem Ajmal - +966 510142264"],
    ] },
  ],
];

const escapeHTML = (value: unknown): string => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const display = (value: unknown) => escapeHTML(value === "" || value == null ? "—" : value);
const fullName = (p: VoucherPassenger) => [p.givenName, p.surName].filter(Boolean).join(" ");
const titleCase = (value?: string) => (value || "").replace(/\b\w/g, c => c.toUpperCase());

// Reduces a supplier date/timestamp to the calendar day ("YYYY-MM-DD") without local timezone shifts.
export const isoDay = (value?: string | null): string => {
  if (!value) return "";
  const day = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (day) return day[1];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
};

// Preserve the calendar day in supplier date strings without local timezone shifts.
const dateOnly = (value?: string): string => {
  if (!value) return "—";
  const day = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (day) return `${day[3]}-${day[2]}-${day[1].slice(-2)}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" }).replace(/\//g, "-");
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const flightDate = (value?: string): string => {
  const [day, month] = dateOnly(value).split("-");
  const monthName = MONTH_NAMES[Number(month) - 1]?.toUpperCase();
  return monthName ? `${day}-${monthName}` : "—";
};

const hotelDate = (value?: string): string => {
  const [day, month, year] = dateOnly(value).split("-");
  const monthName = MONTH_NAMES[Number(month) - 1];
  return monthName && year ? `${day}-${monthName}-${year.slice(-2)}` : "—";
};

export const nightsBetween = (start?: string, end?: string): number | null => {
  if (!start || !end) return null;
  const nights = (Date.parse(end.slice(0, 10)) - Date.parse(start.slice(0, 10))) / 86400000;
  return Number.isFinite(nights) && nights >= 0 ? Math.round(nights) : null;
};

const sourceNights = (hotel: VoucherHotel): number | null => {
  const stored = hotel.nightCount || hotel.nights;
  if (stored != null && Number.isFinite(Number(stored)) && Number(stored) > 0) return Number(stored);
  return nightsBetween(hotel.checkIn || hotel.checkInDate, hotel.checkOut || hotel.checkOutDate);
};

// A saved night count wins; otherwise it follows the dates.
export const hotelRowNights = (hotel: VoucherHotelRow): number | null =>
  hotel.nights != null && hotel.nights > 0 ? hotel.nights : nightsBetween(hotel.checkIn, hotel.checkOut);

const hotelCity = (hotel: VoucherHotel) => hotel.location?.city || hotel.city || hotel.originalHotel?.location?.city;

// Reduces hotel cities and transport route names ("Madina", "MED (HOTEL)", "JED (APT)") to one comparable key.
const placeKey = (value?: string): string => {
  const text = (value || "").toLowerCase();
  // Checked first so "MED(APT)" is the Madinah airport, not the Madinah hotel.
  if (/jed|apt|airport/.test(text)) return "airport";
  if (/mad|med/.test(text)) return "madinah";
  if (/mak|mecca/.test(text)) return "makkah";
  return text.trim();
};

// Packages store transport routes without dates, so the dates come from the hotel stays:
// airport -> first hotel on check-in, hotel -> next hotel on checkout, last hotel -> airport on final checkout.
const hotelTravelLegs = (hotels: VoucherHotelRow[]) => {
  const stays = hotels.map(h => ({ city: placeKey(h.city), checkIn: h.checkIn, checkOut: h.checkOut }));
  if (!stays.length) return [];
  const legs: { from: string; to: string; date?: string }[] = [{ from: "airport", to: stays[0].city, date: stays[0].checkIn }];
  stays.slice(1).forEach((stay, i) => legs.push({ from: stays[i].city, to: stay.city, date: stays[i].checkOut || stay.checkIn }));
  const last = stays[stays.length - 1];
  legs.push({ from: last.city, to: "airport", date: last.checkOut });
  return legs;
};

// Clients save a whole itinerary as one route, e.g. "JED-MAK-MED-MAK-JED"; stray separators ("MED--MAK") are ignored.
const routeStops = (route?: string): string[] =>
  (route || "").split(/\s+to\s+|\s*[-–—>→]+\s*/i).map(stop => stop.trim()).filter(Boolean);

const packageTransports = (packageData: VoucherPackage | null): VoucherTransport[] =>
  (packageData?.transports?.length ? packageData.transports : packageData?.transport) ?? [];

// One row per leg of each saved route, each dated from the matching hotel move, in route order.
const transportRowsFromRoutes = (transports: VoucherTransport[], hotels: VoucherHotelRow[]): VoucherTransportRow[] => {
  const travelLegs = hotelTravelLegs(hotels);
  const usedLegs = new Set<number>();
  return transports.flatMap((t): VoucherTransportRow[] => {
    const own = isoDay(t.travelDate || t.startDate);
    const transporter = t.transporter || t.supplier?.name || "";
    const transportType = t.transportType || "";
    const extra = { ...t } as SourceRecord;
    const stops = routeStops(t.route);
    if (stops.length < 2) return [{ travelDate: own, transporter, transportType, description: t.description || t.route || "", extra }];
    let next = 0;
    return stops.slice(1).map((stop, i) => {
      const from = placeKey(stops[i]);
      const to = placeKey(stop);
      const index = travelLegs.findIndex((leg, j) => j >= next && !usedLegs.has(j) && leg.date && leg.from === from && leg.to === to);
      if (index >= 0) { usedLegs.add(index); next = index + 1; }
      const date = index >= 0 ? travelLegs[index].date : i === 0 ? own : "";
      return { travelDate: isoDay(date), transporter, transportType, description: `${stops[i]} - ${stop}`, extra };
    });
  });
};

// Re-derives the transport legs (and their dates) from the package routes and the voucher's current hotels.
export const rebuildVoucherTransports = (packageData: VoucherPackage | null, hotels: VoucherHotelRow[]) =>
  transportRowsFromRoutes(packageTransports(packageData), hotels);

const hasBed = (p: { type?: string; childType?: string }) => p.type === "Adult" || (p.type === "Child" && p.childType === "withBed");

// "1:05 pm" / "01:05PM" -> "13:05"; anything already 24-hour (or unrecognised) is returned as is.
export const to24Hour = (value?: string): string => {
  const match = (value || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?m\.?$/i);
  if (!match) return (value || "").trim();
  const hour = (Number(match[1]) % 12) + (match[3].toLowerCase() === "p" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
};

// Group-ticket / package flights, normalised to the voucher's flight rows.
export const toVoucherFlightRows = (flights: VoucherFlight[]): VoucherFlightRow[] => flights.map(f => ({
  airline: f.airline || "",
  flightNo: f.flightNo || f.flightNumber || "",
  sectorFrom: f.sectorFrom || f.originCode || f.origin || "",
  sectorTo: f.sectorTo || f.destinationCode || f.destination || "",
  depDate: isoDay(f.depDate || f.departureDate),
  depTime: to24Hour(f.depTime || f.departureTime),
  arrDate: isoDay(f.arrDate || f.arrivalDate),
  arrTime: to24Hour(f.arrTime || f.arrivalTime),
  extra: { ...f } as SourceRecord,
}));

export const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

// First-time voucher contents, pre-filled from the booking, its (already override-merged) package
// details and the linked group ticket. The admin then edits this before saving.
export const buildVoucherDraft = (
  booking: UmrahVoucherBooking,
  packageData: VoucherPackage | null,
  groupTicket: VoucherGroupTicket | null = null,
): UmrahVoucherData => {
  const passengers = booking.passengers || [];
  const pnr = groupTicket?.pnr || "";
  // The group ticket's own Group No, not its internal booking id.
  const groupNo = groupTicket?.groupNo || "";

  const hotels: VoucherHotelRow[] = (packageData?.hotels || []).map(h => ({
    city: hotelCity(h) || "",
    name: h.name || h.hotelName || h.originalHotel?.name || "",
    view: h.view || "",
    meal: h.meal || h.mealPlan || "",
    confirmationNumber: h.confirmationNumber || booking.hotelStatus?.confirmationNumber || "",
    roomType: h.roomType || titleCase(booking.roomType),
    checkIn: isoDay(h.checkIn || h.checkInDate),
    checkOut: isoDay(h.checkOut || h.checkOutDate),
    nights: sourceNights(h),
    extra: { ...h } as SourceRecord,
  }));

  const sourceFlights: VoucherFlight[] = [...(packageData?.flights ?? [])];
  // Older bookings may only carry the departure/return snapshot.
  if (!sourceFlights.length) {
    [booking.flightDetails?.departure, booking.flightDetails?.return].forEach(leg => {
      if (leg && (leg.flightNumber || leg.date || leg.from || leg.to)) sourceFlights.push({
        flightNo: leg.flightNumber, depDate: leg.date, sectorFrom: leg.from, sectorTo: leg.to,
      });
    });
  }
  const flights = toVoucherFlightRows(sourceFlights);

  const firstAdult = passengers.find(p => p.type === "Adult") || passengers[0];
  return {
    voucherNo: booking.voucherStatus?.voucherNumber || booking.bookingNumber,
    voucherDate: todayISO(),
    packageName: booking.packageName || packageData?.packageName || "",
    days: packageData?.days ?? null,
    familyHead: booking.familyHead || (firstAdult ? fullName(firstAdult) : ""),
    manualNumber: booking.manualNumber || "",
    specialInstructions: booking.specialRequests || "",
    groupTicketId: groupTicket?._id || "",
    passengers: passengers.map(p => ({
      passport: p.passport || "",
      name: fullName(p),
      gender: p.gender || (/^(mr|master)$/i.test(p.title || "") ? "M" : /^(mrs|ms|miss)$/i.test(p.title || "") ? "F" : ""),
      type: p.type || "",
      bed: hasBed(p),
      groupNo: p.groupNo || groupNo,
      visaNumber: p.visaNumber || booking.visaStatus?.applicationNumber || "",
      pnr: p.pnr || pnr,
    })),
    hotels,
    transports: transportRowsFromRoutes(packageTransports(packageData), hotels),
    flights,
  };
};

const addDays = (day: string, days: number): string => {
  const date = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const dayDiff = (start: string, end: string): number =>
  Math.round((Date.parse(end.slice(0, 10)) - Date.parse(start.slice(0, 10))) / 86400000);

export type StayEdit =
  | { field: "checkIn" | "checkOut"; value: string }
  | { field: "nights"; value: number };

// Hotels are consecutive stays, so editing one re-flows its neighbours (only those that were
// back-to-back before the edit; a deliberate gap between two hotels is left alone):
//  - nights / check-out of a hotel move the next hotel's check-in; the next hotel keeps its own
//    check-out, so it absorbs the difference (10 -> 9 nights here gives the next hotel +1).
//  - check-in of a hotel moves the previous hotel's check-out the same way.
//  - a neighbour is never squeezed below 1 night: it is kept at 1 and the change carries on
//    to the hotel after it (forward) / before it (backward).
const reflowStays = (hotels: VoucherHotelRow[], index: number, edit: StayEdit): VoucherHotelRow[] => {
  const rows = hotels.map(h => ({ ...h }));
  const row = rows[index];
  if (!row) return hotels;
  const syncNights = (h: VoucherHotelRow) => { if (h.checkIn && h.checkOut) h.nights = dayDiff(h.checkIn, h.checkOut); };

  if (edit.field === "nights") {
    const start = row.checkIn || rows[index - 1]?.checkOut || (row.checkOut ? addDays(row.checkOut, -edit.value) : "");
    row.nights = edit.value;
    if (!start) return rows;
    row.checkIn = start;
    row.checkOut = addDays(start, edit.value);
  } else {
    row[edit.field] = edit.value;
    if (!edit.value) return rows;
    // A stay can't end before it starts: keep a minimum of one night.
    if (row.checkIn && row.checkOut && dayDiff(row.checkIn, row.checkOut) < 1) row.checkOut = addDays(row.checkIn, 1);
    syncNights(row);
  }

  for (let j = index + 1; j < rows.length; j++) {
    const previousOut = rows[j - 1].checkOut;
    if (!previousOut || hotels[j - 1].checkOut !== hotels[j].checkIn || rows[j].checkIn === previousOut) break;
    rows[j].checkIn = previousOut;
    if (rows[j].checkOut && dayDiff(previousOut, rows[j].checkOut) < 1) rows[j].checkOut = addDays(previousOut, 1);
    syncNights(rows[j]);
  }

  if (edit.field === "checkIn") {
    for (let j = index - 1; j >= 0; j--) {
      const nextIn = rows[j + 1].checkIn;
      if (!nextIn || hotels[j].checkOut !== hotels[j + 1].checkIn || rows[j].checkOut === nextIn) break;
      rows[j].checkOut = nextIn;
      if (rows[j].checkIn && dayDiff(rows[j].checkIn, nextIn) < 1) rows[j].checkIn = addDays(nextIn, -1);
      syncNights(rows[j]);
    }
  }
  return rows;
};

// Applies a hotel stay edit to the voucher. Transport rows dated on a hotel date that moved
// (arrival, hotel-to-hotel, departure) move with it; every other transport row is left as typed.
export const reflowVoucherStays = (voucher: UmrahVoucherData, index: number, edit: StayEdit): UmrahVoucherData => {
  const hotels = reflowStays(voucher.hotels, index, edit);
  const moves = new Map<string, string | null>();
  voucher.hotels.forEach((before, i) => {
    (["checkIn", "checkOut"] as const).forEach(key => {
      const from = before[key];
      const to = hotels[i][key];
      if (!from || !to || from === to) return;
      // The same old date heading to two different new dates is ambiguous, so it is skipped.
      moves.set(from, moves.has(from) && moves.get(from) !== to ? null : to);
    });
  });
  const transports = voucher.transports.map(t => {
    const moved = moves.get(t.travelDate);
    return moved ? { ...t, travelDate: moved } : t;
  });
  return { ...voucher, hotels, transports };
};

// Header figures that always follow the rows below them.
export const voucherSummary = (voucher: UmrahVoucherData) => {
  const count = (type: string) => voucher.passengers.filter(p => p.type === type).length;
  const nights = voucher.hotels.map(hotelRowNights);
  return {
    total: voucher.passengers.length,
    adults: count("Adult"), children: count("Child"), infants: count("Infant"),
    beds: voucher.passengers.filter(p => p.bed).length,
    totalNights: nights.length && nights.every(n => n != null) ? nights.reduce<number>((sum, n) => sum + (n || 0), 0) : null,
  };
};

// The booking's own package details (group ticket, flights, hotels, transport) as the voucher now
// has them. Saving the voucher writes these onto the booking; pricing is never part of this.
export interface BookingPackageDetails {
  selectedGroupTicketId: string;
  flights: SourceRecord[]; hotels: SourceRecord[]; transports: SourceRecord[];
}

export const voucherToPackageDetails = (voucher: UmrahVoucherData): BookingPackageDetails => ({
  selectedGroupTicketId: voucher.groupTicketId,
  flights: voucher.flights.map(f => ({
    ...f.extra, airline: f.airline, flightNo: f.flightNo, sectorFrom: f.sectorFrom, sectorTo: f.sectorTo,
    depDate: f.depDate, depTime: f.depTime, arrDate: f.arrDate, arrTime: f.arrTime,
  })),
  hotels: voucher.hotels.map(h => {
    const nights = hotelRowNights(h);
    return {
      ...h.extra, name: h.name, city: h.city, location: { ...(h.extra?.location as SourceRecord | undefined), city: h.city },
      view: h.view, meal: h.meal, roomType: h.roomType, confirmationNumber: h.confirmationNumber,
      checkIn: h.checkIn, checkOut: h.checkOut, nights, nightCount: nights,
    };
  }),
  transports: voucher.transports.map(t => {
    const supplier = (t.extra?.supplier ?? {}) as { name?: string };
    return {
      ...t.extra, route: t.description, description: t.description, transportType: t.transportType,
      transporter: t.transporter, supplier: supplier.name === t.transporter ? supplier : { name: t.transporter },
      travelDate: t.travelDate, startDate: t.travelDate, endDate: t.travelDate,
    };
  }),
});

const table = (title: string, columns: string[], rows: unknown[][], widths?: number[]) => `
  <table class="voucher-table">
    ${widths ? `<colgroup>${widths.map(width => `<col style="width:${width}%">`).join("")}</colgroup>` : ""}
    <thead><tr><th class="section-bar" colspan="${columns.length}">${escapeHTML(title)}</th></tr>
    <tr>${columns.map(c => `<th scope="col">${escapeHTML(c)}</th>`).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map(row => `<tr>${row.map(cell => `<td>${display(cell)}</td>`).join("")}</tr>`).join("")
      : `<tr><td class="empty" colspan="${columns.length}">No ${escapeHTML(title.toLowerCase())} details available</td></tr>`}</tbody>
  </table>`;

export const createUmrahVoucherHTML = (booking: UmrahVoucherBooking, voucher: UmrahVoucherData): string => {
  const { total, adults, children, infants, beds, totalNights } = voucherSummary(voucher);
  const reference = voucher.voucherNo || booking.bookingNumber;
  const status = booking.overallStatus === "Confirmed" ? "Approved" : booking.overallStatus || "Pending";
  const statusClass = ["Confirmed", "Completed"].includes(booking.overallStatus || "") ? "approved" : "pending";
  const qr = qrcode(0, "M");
  // Scanning opens the voucher's public page; an unsaved voucher (print preview) has none yet.
  qr.addData(booking.voucherPublicUrl || `UMRAH VOUCHER | ${booking.bookingNumber || booking._id}`);
  qr.make();
  const contacts = CONTACTS_DIRECTORY.map(column => `<div class="contact-column">${column.map(section => `
    <h3>${escapeHTML(section.title)}</h3>${section.contacts.map(([label, value]) =>
      `<div>${label ? `<b>${escapeHTML(label)}:</b> ` : ""}${escapeHTML(value)}</div>`).join("")}`).join("")}</div>`).join("");
  const passengerRows = voucher.passengers.map((p, i) => [i + 1, p.passport, p.name, p.gender, p.type,
    p.bed ? "Yes" : "No", p.groupNo, p.visaNumber, p.pnr]);
  const hotelRows = voucher.hotels.map(h => [h.city, h.name, h.view, h.meal, h.confirmationNumber, h.roomType,
    hotelDate(h.checkIn), hotelDate(h.checkOut), hotelRowNights(h)]);
  const transportRows = voucher.transports.map(t => [hotelDate(t.travelDate), t.transporter, t.transportType, t.description]);
  const flightSector = (f: VoucherFlightRow) => [f.sectorFrom, f.sectorTo].filter(Boolean).join("-");
  const flightRows = (legs: VoucherFlightRow[]) => legs.map(f => [f.flightNo, flightSector(f),
    [flightDate(f.depDate), f.depTime].filter(Boolean).join(" "),
    [flightDate(f.arrDate), f.arrTime].filter(Boolean).join(" ")]);
  const saudiAirport = /\b(JED|MED|RUH|DMM|YNB|KSA|JEDDAH|MADINAH|MEDINA)\b/i;
  const outbound: VoucherFlightRow[] = [];
  const inbound: VoucherFlightRow[] = [];
  let returning = false;
  voucher.flights.forEach((f, index) => {
    if (saudiAirport.test(f.sectorFrom) && !saudiAirport.test(f.sectorTo)) returning = true;
    (returning || (!f.sectorFrom && !f.sectorTo && index > 0) ? inbound : outbound).push(f);
  });

  const flightSectionTitle = (label: string, legs: VoucherFlightRow[]) => {
    const sectors = legs.map(flightSector).filter(Boolean).join(" / ");
    return sectors ? `${label} (${sectors})` : label;
  };
  const departureTitle = flightSectionTitle("Departure", outbound);
  const arrivalTitle = flightSectionTitle("Arrival", inbound);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <title>Umrah Voucher - ${escapeHTML(reference)}</title>
    <style>
      @page { size: A4 portrait; margin: 10mm; }
      * { box-sizing: border-box; }
      body { margin: 0; background: white; color: #172b43; font: 10px Arial, sans-serif; }
      .voucher { max-width: 190mm; margin: 0 auto; }
      .header { display: grid; grid-template-columns: 1.15fr 1fr; gap: 24px; padding: 10px 12px 12px; border-top: 4px solid #153e68; background: #f3f7fb; }
      .brand { font-size: 16px; font-weight: 800; color: #153e68; margin-bottom: 5px; }
      .header p { margin: 3px 0; line-height: 1.4; }
      .agency { text-align: right; }
      .status { font-size: 32px; margin-top: 8px; font-weight: 500; }
      .approved { color: #299368; } .pending { color: #b87920; }
      h1 { text-align: center; font-size: 14px; color: #153e68; margin: 12px 0 7px; letter-spacing: 1px; }
      .reference-strip { display: grid; grid-template-columns: 1.8fr 1fr 1fr; border: 1px solid #b9c9d9; background: #eef4fa; }
      .reference-strip div { padding: 6px; border-right: 1px solid #b9c9d9; overflow-wrap: anywhere; }
      .reference-strip div:last-child { border: 0; } .ref { text-align: center; font-weight: bold; }
      .voucher-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 8px; font-size: 9px; }
      th { background: #edf3f9; color: #153e68; padding: 4px 3px; border: 1px solid #b9c9d9; text-align: center; }
      th.section-bar { background: #dce8f3; font-size: 11px; padding: 5px; letter-spacing: .3px; }
      td { padding: 4px 3px; border-bottom: 1px dotted #b9c9d9; vertical-align: top; text-align: center; overflow-wrap: anywhere; }
      tbody tr:nth-child(even) { background: #f8fafc; }
      .passengers td:nth-child(3), .accommodation td:nth-child(2), .services td:last-child { text-align: left; }
      .empty { color: #64748b; padding: 9px; }
      .nights { text-align: right; padding: 0 6px 8px; font-weight: bold; color: #153e68; }
      .travel { display: grid; grid-template-columns: 1fr 1fr 82px; gap: 7px; align-items: start; }
      .travel .voucher-table { font-size: 8px; }
      .qr { text-align: center; font-size: 8px; color: #64748b; }
      .qr svg { width: 82px; height: 82px; display: block; shape-rendering: crispEdges; }
      .instructions { padding: 4px 0 9px; line-height: 1.5; border-bottom: 1px solid #dce8f3; overflow-wrap: anywhere; }
      .instructions b { color: #153e68; }
      .directory { margin-top: 26px; break-inside: avoid; }
      .directory h2 { text-align: center; font-size: 12px; color: #153e68; margin: 0 0 8px; }
      .contacts { display: grid; grid-template-columns: .9fr 1.05fr 1.3fr; gap: 8px; font-size: 9px; color: #101c2b; }
      .contact-column { padding-right: 5px; border-right: 1px solid #cbd5e1; }
      .contact-column:last-child { border: 0; padding-right: 0; }
      .contact-column h3 { font-size: 9px; text-align: center; background: #dce8f3; color: #153e68; padding: 3px 2px; margin: 0 0 3px; }
      .contact-column div { line-height: 1.22; overflow-wrap: anywhere; }
      .contact-column h3:not(:first-child) { margin-top: 5px; }
      .footer { margin-top: 16px; padding-top: 6px; border-top: 1px solid #dce8f3; font-size: 8px; color: #64748b; display: flex; justify-content: space-between; }
      thead { display: table-header-group; } tr { break-inside: avoid; }
      @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style></head><body><main class="voucher">
    <header class="header"><div><div class="brand">${display(booking.user?.companyName || booking.user?.name)}</div>
      <p>Voucher Date: <b>${dateOnly(voucher.voucherDate)}</b></p>
      <p>Package: <b>${display(voucher.packageName)}</b>${voucher.days ? ` · ${display(voucher.days)} Days` : ""}</p>
      <p>PAX: <b>${total}</b> (A:${adults}, C:${children}, I:${infants}), Beds=${beds}</p>
    </div><div class="agency"><div class="status ${statusClass}">${escapeHTML(status)}</div></div></header>
    <h1>HOTEL VOUCHER</h1>
    <div class="reference-strip"><div>Family Head: <b>${display(voucher.familyHead)}</b></div>
      <div class="ref">${display(reference)}</div><div>Manual No: ${display(voucher.manualNumber)}</div></div>
    <section class="passengers">${table("Mutamers", ["SNO", "Passport", "Mutamer Name", "G", "PAX", "Bed", "Group No", "Visa #", "PNR"], passengerRows, [4, 12, 27, 4, 8, 5, 14, 14, 12])}</section>
    <section class="accommodation">${table("Accommodation", ["City", "Hotel Name", "View", "Meal", "Conf #", "Room Type", "Checkin", "Checkout", "Night"], hotelRows, [9, 29, 8, 6, 9, 12, 11, 11, 5])}
      <div class="nights">Total Nights: ${display(totalNights)}</div></section>
    <section class="services">${table("Transport / Services", ["Travel Date", "Transporter", "Type", "Description"], transportRows, [14, 24, 22, 40])}</section>
    <div class="travel"><section>${table(departureTitle, ["Flight", "Sector", "Departure", "Arrival"], flightRows(outbound), [17, 23, 30, 30])}</section>
      <section>${table(arrivalTitle, ["Flight", "Sector", "Departure", "Arrival"], flightRows(inbound), [17, 23, 30, 30])}</section>
      <div class="qr">${qr.createSvgTag({ cellSize: 2, margin: 8, scalable: true })}</div></div>
    <div class="instructions"><b>Special Instructions:</b> ${display(voucher.specialInstructions)}</div>
    <section class="directory"><h2>CONTACTS DIRECTORY</h2><div class="contacts">${contacts}</div></section>
    </main></body></html>`;
};

export const printUmrahVoucher = (booking: UmrahVoucherBooking, voucher: UmrahVoucherData): Promise<void> => {
  const html = createUmrahVoucherHTML(booking, voucher);
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.title = "Umrah voucher print";
    Object.assign(iframe.style, { position: "fixed", width: "0", height: "0", border: "0", bottom: "0", right: "0" });
    const cleanup = () => iframe.remove();
    iframe.onload = async () => {
      const printWindow = iframe.contentWindow;
      if (!printWindow) { cleanup(); reject(new Error("Could not open the voucher print window")); return; }
      try {
        await printWindow.document.fonts.ready;
        printWindow.addEventListener("afterprint", cleanup, { once: true });
        printWindow.focus();
        printWindow.print();
        // Fallback for browsers that don't dispatch afterprint on an iframe.
        window.setTimeout(cleanup, 120000);
        resolve();
      } catch (error) { cleanup(); reject(error); }
    };
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
};
