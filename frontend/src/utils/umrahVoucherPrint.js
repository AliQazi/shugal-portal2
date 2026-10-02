import qrcode from "qrcode-generator";

// Prints the Umrah hotel voucher an admin created for a booking (booking.voucherData).
// The agent only receives voucherData once admin has unlocked the voucher, so there is
// nothing to build or edit here - this only renders and prints the saved voucher.
// Keep the layout in step with admin/src/utils/umrahVoucherPrint.ts.

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

const escapeHTML = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const display = (value) => escapeHTML(value === "" || value == null ? "—" : value);

// Voucher dates are saved as "YYYY-MM-DD"; read them without any timezone shift.
const dateOnly = (value) => {
  if (!value) return "—";
  const day = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (day) return `${day[3]}-${day[2]}-${day[1].slice(-2)}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" }).replace(/\//g, "-");
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const flightDate = (value) => {
  const [day, month] = dateOnly(value).split("-");
  const monthName = MONTH_NAMES[Number(month) - 1]?.toUpperCase();
  return monthName ? `${day}-${monthName}` : "—";
};

const hotelDate = (value) => {
  const [day, month, year] = dateOnly(value).split("-");
  const monthName = MONTH_NAMES[Number(month) - 1];
  return monthName && year ? `${day}-${monthName}-${year.slice(-2)}` : "—";
};

const nightsBetween = (start, end) => {
  if (!start || !end) return null;
  const nights = (Date.parse(String(end).slice(0, 10)) - Date.parse(String(start).slice(0, 10))) / 86400000;
  return Number.isFinite(nights) && nights >= 0 ? Math.round(nights) : null;
};

// A saved night count wins; otherwise it follows the dates.
const hotelRowNights = (hotel) =>
  hotel.nights != null && hotel.nights > 0 ? hotel.nights : nightsBetween(hotel.checkIn, hotel.checkOut);

const voucherSummary = (voucher) => {
  const passengers = voucher.passengers || [];
  const count = (type) => passengers.filter((p) => p.type === type).length;
  const nights = (voucher.hotels || []).map(hotelRowNights);
  return {
    total: passengers.length,
    adults: count("Adult"),
    children: count("Child"),
    infants: count("Infant"),
    beds: passengers.filter((p) => p.bed).length,
    totalNights: nights.length && nights.every((n) => n != null) ? nights.reduce((sum, n) => sum + (n || 0), 0) : null,
  };
};

const table = (title, columns, rows, widths) => `
  <table class="voucher-table">
    ${widths ? `<colgroup>${widths.map((width) => `<col style="width:${width}%">`).join("")}</colgroup>` : ""}
    <thead><tr><th class="section-bar" colspan="${columns.length}">${escapeHTML(title)}</th></tr>
    <tr>${columns.map((c) => `<th scope="col">${escapeHTML(c)}</th>`).join("")}</tr></thead>
    <tbody>${rows.length ? rows.map((row) => `<tr>${row.map((cell) => `<td>${display(cell)}</td>`).join("")}</tr>`).join("")
      : `<tr><td class="empty" colspan="${columns.length}">No ${escapeHTML(title.toLowerCase())} details available</td></tr>`}</tbody>
  </table>`;

export const createUmrahVoucherHTML = (booking, voucher) => {
  const { total, adults, children, infants, beds, totalNights } = voucherSummary(voucher);
  const reference = voucher.voucherNo || booking.bookingNumber;
  const status = booking.overallStatus === "Confirmed" ? "Approved" : booking.overallStatus || "Pending";
  const statusClass = ["Confirmed", "Completed"].includes(booking.overallStatus || "") ? "approved" : "pending";
  const qr = qrcode(0, "M");
  // Scanning opens the voucher's public page.
  qr.addData(booking.voucherPublicUrl || `UMRAH VOUCHER | ${booking.bookingNumber || booking._id}`);
  qr.make();
  const contacts = CONTACTS_DIRECTORY.map((column) => `<div class="contact-column">${column.map((section) => `
    <h3>${escapeHTML(section.title)}</h3>${section.contacts.map(([label, value]) =>
      `<div>${label ? `<b>${escapeHTML(label)}:</b> ` : ""}${escapeHTML(value)}</div>`).join("")}`).join("")}</div>`).join("");
  const passengerRows = (voucher.passengers || []).map((p, i) => [i + 1, p.passport, p.name, p.gender, p.type,
    p.bed ? "Yes" : "No", p.groupNo, p.visaNumber, p.pnr]);
  const hotelRows = (voucher.hotels || []).map((h) => [h.city, h.name, h.view, h.meal, h.confirmationNumber, h.roomType,
    hotelDate(h.checkIn), hotelDate(h.checkOut), hotelRowNights(h)]);
  const transportRows = (voucher.transports || []).map((t) => [hotelDate(t.travelDate), t.transporter, t.transportType, t.description]);
  const flightSector = (f) => [f.sectorFrom, f.sectorTo].filter(Boolean).join("-");
  const flightRows = (legs) => legs.map((f) => [f.flightNo, flightSector(f),
    [flightDate(f.depDate), f.depTime].filter(Boolean).join(" "),
    [flightDate(f.arrDate), f.arrTime].filter(Boolean).join(" ")]);
  const saudiAirport = /\b(JED|MED|RUH|DMM|YNB|KSA|JEDDAH|MADINAH|MEDINA)\b/i;
  const outbound = [];
  const inbound = [];
  let returning = false;
  (voucher.flights || []).forEach((f, index) => {
    if (saudiAirport.test(f.sectorFrom || "") && !saudiAirport.test(f.sectorTo || "")) returning = true;
    (returning || (!f.sectorFrom && !f.sectorTo && index > 0) ? inbound : outbound).push(f);
  });

  const flightSectionTitle = (label, legs) => {
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

export const printUmrahVoucher = (booking, voucher) => {
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
