import PDFDocument from "pdfkit";
import fs from "fs";

const PAGE_WIDTH = 515; // usable width inside 40pt margins on A4
const LEFT = 40;
const RIGHT = LEFT + PAGE_WIDTH;

// Shown on the ticket voucher when the issuing agency has no logo of its own
// (Register.logo is empty). Point this at the default agency logo image
// (an absolute file path or a fully-qualified URL both work).
const DEFAULT_AGENCY_LOGO = "";

// Accepts either a remote URL (Register.logo is typically a Cloudinary URL)
// or a local file path (for DEFAULT_AGENCY_LOGO), and returns image bytes
// pdfkit can embed. Returns null if nothing could be loaded.
const loadLogoBuffer = async (logoSource) => {
  if (!logoSource) return null;

  try {
    if (/^https?:\/\//i.test(logoSource)) {
      const response = await fetch(logoSource);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    if (fs.existsSync(logoSource)) {
      return fs.readFileSync(logoSource);
    }
  } catch (error) {
    console.error("⚠️ Failed to load agency logo:", error.message);
  }

  return null;
};

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const parseSectorCodes = (sector = "") => {
  const match = String(sector).match(/([A-Z]{3})\s*-\s*([A-Z]{3})/i);
  if (!match) return { origin: "N/A", destination: "N/A" };
  return {
    origin: match[1].toUpperCase(),
    destination: match[2].toUpperCase(),
  };
};

const drawSectionHeader = (doc, text, y) => {
  doc.rect(LEFT, y, PAGE_WIDTH, 22).fill("#d4ac0d");
  doc
    .fillColor("#fff")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(text, LEFT + 8, y + 6);
  doc.fillColor("#000");
};

const ensureSpace = (doc, y, needed) => {
  if (y + needed > 780) {
    doc.addPage();
    return 40;
  }
  return y;
};

/**
 * Renders the electronic ticket voucher as a PDF buffer.
 * @param {object} booking - Booking mongoose document (or plain object).
 * @param {object} user - The agent who created the booking (req.user).
 * @param {object} options
 * @param {boolean} options.includePrice - Whether to render the fare breakdown section.
 * @param {object} [options.bankDetails] - Bank account details to render in a
 *   payment box at the bottom of the voucher. Only shown when includePrice is true.
 */
export const generateBookingTicketPDF = async (
  booking,
  user,
  { includePrice = false, bankDetails = null } = {},
) => {
  const logoBuffer = await loadLogoBuffer(user?.logo || DEFAULT_AGENCY_LOGO);
  const bankLogoBuffer = includePrice
    ? await loadLogoBuffer(bankDetails?.logo)
    : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pnr = booking.pnr || "N/A";
    const bookingReference = booking.bookingReference || "N/A";
    const airlineName = (booking.airline?.name || "AIRLINE").toUpperCase();
    const { origin: sectorOrigin, destination: sectorDest } =
      parseSectorCodes(booking.sector);
    const agencyName = user?.companyName || "Abid Air Travel & Tours";
    const agentName = user?.name || "N/A";
    const agentContact = user?.phone || user?.mobile || "N/A";

    // Header — agency logo (top-left), title, airline name (top-right)
    const titleX = logoBuffer ? LEFT + 90 : LEFT;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, LEFT, 36, { fit: [80, 40] });
      } catch (imageError) {
        console.error("⚠️ Failed to draw agency logo:", imageError.message);
      }
    }
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#1a5276")
      .text("Electronic Ticket Voucher", titleX, 40);
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#1a5276")
      .text(airlineName, LEFT, 44, { width: PAGE_WIDTH, align: "right" });

    // Info box
    let y = 80;
    doc.rect(LEFT, y, PAGE_WIDTH, 90).fill("#1a5276");
    doc.fillColor("#fff").font("Helvetica").fontSize(10);
    doc.text(`Booking Reference Number (PNR): ${pnr}`, LEFT + 12, y + 10);
    doc.text(`Booking ID: ${bookingReference}`, LEFT + 12, y + 27);
    doc.text(`Issued By: ${agencyName}`, LEFT + 12, y + 44);
    doc.text(`Agent Name: ${agentName}`, LEFT + 12, y + 61);
    doc.text(`Contact: ${agentContact}`, LEFT + 12, y + 78);
    doc.fillColor("#000");

    y += 105;

    // Flights
    const flights = booking.flights?.length ? booking.flights : [{}];
    flights.forEach((f, index) => {
      const fOrigin = (f.origin || sectorOrigin || "N/A").toUpperCase();
      const fDest = (f.destination || sectorDest || "N/A").toUpperCase();
      const fNum = f.flightNo || "XX000";
      const fDepDate = formatDate(
        f.depDate || f.flightDate || booking.departureDate,
      );
      const fArrDate = formatDate(
        f.arrDate || f.depDate || f.flightDate || booking.departureDate,
      );
      const fDepTime = f.depTime || "00:00";
      const fArrTime = f.arrTime || "00:00";
      const fBaggage = f.baggage || "20KG";

      y = ensureSpace(doc, y, 100);
      drawSectionHeader(
        doc,
        `Flight ${index + 1} - ${fOrigin} to ${fDest}`,
        y,
      );
      y += 30;

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#555");
      doc.text("AIRLINE", LEFT + 8, y);
      doc.text("FLIGHT #", LEFT + 130, y);
      doc.text("DEPARTURE", LEFT + 250, y);
      doc.text("ARRIVAL", LEFT + 390, y);
      y += 13;

      doc.font("Helvetica").fontSize(10).fillColor("#000");
      const rowTop = y;
      doc.text(airlineName, LEFT + 8, rowTop, { width: 115 });
      doc.text(`${fNum}\nBaggage: ${fBaggage}`, LEFT + 130, rowTop, {
        width: 110,
      });
      doc.text(`${fDepTime}\n${fOrigin}\n${fDepDate}`, LEFT + 250, rowTop, {
        width: 130,
      });
      doc.text(`${fArrTime}\n${fDest}\n${fArrDate}`, LEFT + 390, rowTop, {
        width: 120,
      });
      y += 55;
    });

    // Passengers
    y = ensureSpace(doc, y, 50);
    drawSectionHeader(doc, "Passengers", y);
    y += 30;

    doc.font("Helvetica-Bold").fontSize(8).fillColor("#555");
    doc.text("SR#", LEFT + 8, y);
    doc.text("NAME", LEFT + 50, y);
    doc.text("PASSPORT#", LEFT + 260, y);
    doc.text("TYPE", LEFT + 370, y);
    doc.text("STATUS", LEFT + 440, y);
    y += 14;
    doc
      .moveTo(LEFT, y)
      .lineTo(RIGHT, y)
      .strokeColor("#eeeeee")
      .stroke();
    y += 6;

    const passengers = booking.passengers?.length ? booking.passengers : [];
    const status = (booking.status || "Confirmed").toUpperCase();
    doc.font("Helvetica").fontSize(9).fillColor("#000");
    passengers.forEach((p, i) => {
      y = ensureSpace(doc, y, 18);
      const name = [p.title, p.givenName, p.surName].filter(Boolean).join(" ");
      doc.text(String(i + 1), LEFT + 8, y);
      doc.text(name, LEFT + 50, y, { width: 200 });
      doc.text(p.passport || "N/A", LEFT + 260, y, { width: 100 });
      doc.text(p.type || "N/A", LEFT + 370, y, { width: 60 });
      doc.text(status, LEFT + 440, y, { width: 75 });
      y += 16;
    });

    y += 10;

    if (includePrice) {
      y = ensureSpace(doc, y, 130);
      drawSectionHeader(doc, "Fare Details", y);
      y += 30;

      const pricing = booking.pricing || {};
      const rows = [
        [
          "Adult",
          booking.adultsCount || 0,
          pricing.adultPrice || 0,
          pricing.adultTotal || 0,
        ],
        [
          "Child",
          booking.childrenCount || 0,
          pricing.childPrice || 0,
          pricing.childTotal || 0,
        ],
        [
          "Infant",
          booking.infantsCount || 0,
          pricing.infantPrice || 0,
          pricing.infantTotal || 0,
        ],
      ].filter(([, count]) => count > 0);

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#555");
      doc.text("TYPE", LEFT + 8, y);
      doc.text("PAX", LEFT + 180, y);
      doc.text("PRICE / PAX", LEFT + 270, y);
      doc.text("TOTAL", LEFT + 420, y);
      y += 14;
      doc
        .moveTo(LEFT, y)
        .lineTo(RIGHT, y)
        .strokeColor("#eeeeee")
        .stroke();
      y += 6;

      doc.font("Helvetica").fontSize(10).fillColor("#000");
      rows.forEach(([label, count, price, total]) => {
        y = ensureSpace(doc, y, 18);
        doc.text(label, LEFT + 8, y);
        doc.text(String(count), LEFT + 180, y);
        doc.text(price.toLocaleString(), LEFT + 270, y);
        doc.text(total.toLocaleString(), LEFT + 420, y);
        y += 16;
      });

      y += 8;
      doc
        .moveTo(LEFT + 270, y)
        .lineTo(RIGHT, y)
        .strokeColor("#cccccc")
        .stroke();
      y += 8;
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#1a5276")
        .text(
          `Grand Total: ${(pricing.grandTotal || 0).toLocaleString()}`,
          LEFT + 270,
          y,
          { width: PAGE_WIDTH - 230, align: "right" },
        );
      doc.fillColor("#000");
      y += 26;
    }

    // Terms & Conditions
    y = ensureSpace(doc, y, 80);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#1a5276")
      .text("Terms & Conditions", LEFT, y);
    y += 16;
    doc.font("Helvetica").fontSize(9).fillColor("#000");
    const terms = [
      "Please Report Airline Check-In Counter 4 Hours Before Flight Departure.",
      "All Visa and Travel Documents are the Traveler's Own Responsibility.",
      "Tickets are non refundable.",
    ];
    terms.forEach((t) => {
      doc.text(`• ${t}`, LEFT + 8, y, { width: PAGE_WIDTH - 8 });
      y += 14;
    });

    // Payment / bank details box — only on the priced (invoice) voucher.
    if (includePrice && bankDetails) {
      y += 14;
      const boxHeight = 90;
      y = ensureSpace(doc, y, boxHeight + 30);

      drawSectionHeader(doc, "Payment / Bank Details", y);
      y += 30;

      const boxTop = y;
      doc.rect(LEFT, boxTop, PAGE_WIDTH, boxHeight).stroke("#cccccc");

      const textX = bankLogoBuffer ? LEFT + 75 : LEFT + 12;
      if (bankLogoBuffer) {
        try {
          doc.image(bankLogoBuffer, LEFT + 12, boxTop + 20, { fit: [55, 55] });
        } catch (imageError) {
          console.error("⚠️ Failed to draw bank logo:", imageError.message);
        }
      }

      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000");
      doc.text(bankDetails.bankName || "N/A", textX, boxTop + 12);

      doc.font("Helvetica").fontSize(9).fillColor("#333");
      doc.text(
        `Account Title: ${bankDetails.accountTitle || "N/A"}`,
        textX,
        boxTop + 28,
      );
      doc.text(
        `Account No: ${bankDetails.accountNo || "N/A"}`,
        textX,
        boxTop + 42,
      );
      doc.text(`IBAN: ${bankDetails.iban || "N/A"}`, textX, boxTop + 56);
      doc.text(
        `Branch: ${bankDetails.branch || "N/A"}`,
        textX,
        boxTop + 70,
      );
      doc.fillColor("#000");

      y = boxTop + boxHeight + 10;
    }

    doc.end();
  });
};

export default generateBookingTicketPDF;
