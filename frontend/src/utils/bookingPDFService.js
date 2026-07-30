// Shown on the ticket voucher when the issuing agency has no logo of its own
// (Register.logo is empty). Point this at the default agency logo image.
import defaultLogo from "../assets/images/logo.png";
export const DEFAULT_AGENCY_LOGO = defaultLogo;

export const printGDSBooking = (booking) => {
  // --- 1. Helper Functions ---
  const formatFullDate = (dateStr) => {
    if (!dateStr) return "";

    // Handle YYYY-MM-DD safely without timezone shifting
    if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // --- 2. Data Preparation (Preserving your logic + adding PDF specific helpers) ---
  const flight = booking.flights?.[0] || {};

  // Booking Status
  const bookingStatus = (
    booking.status ||
    booking.bookingStatus ||
    "N/A"
  ).toUpperCase();

  // Airline & Logos
  const airlineName = (
    booking.airline?.name ||
    flight.airlineName ||
    "AIRLINE"
  ).toUpperCase();
  // Note: Ensure this path is accessible from the browser window, or use a Base64 string if possible
  // const agencyLogo = "/src/assets/images/logo.webp";
  const airlineLogo = booking.airline?.logoUrl || flight.airlineLogo || "";
  const agencyLogo = getAgencyLogo(booking);

  // Booking Refs
  const pnr = booking.pnr || booking.bookingReference || "N/A";
  // const bookingRef = booking.bookingReference || pnr;

  // // Flight Details
  // const flightNum = booking.flightNumber || flight.flightNo || "XX000";
  // // Location Logic
  // const origin = (
  //     booking.origin ||
  //     booking.originCity ||
  //     flight.origin ||
  //     ""
  // ).toUpperCase();

  // Try multiple sources for IATA / airport codes (flight, booking, sector fields)
  let originCode = (
    booking.originCode ||
    flight.originCode ||
    booking.originIata ||
    flight.sectorFrom ||
    ""
  ).toUpperCase();

  // const dest = (
  //     booking.destination ||
  //     booking.destinationCity ||
  //     flight.destination ||
  //     ""
  // ).toUpperCase();

  let destCode = (
    booking.destinationCode ||
    flight.destinationCode ||
    booking.destinationIata ||
    flight.sectorTo ||
    ""
  ).toUpperCase();

  // If still missing, try parsing from booking.sector (e.g. "ISB-AUH")
  if (
    (!originCode || !originCode.trim() || originCode === "") &&
    booking.sector
  ) {
    const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
    if (sectorMatch) originCode = sectorMatch[1];
  }
  if ((!destCode || !destCode.trim() || destCode === "") && booking.sector) {
    const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
    if (sectorMatch) destCode = sectorMatch[2];
  }

  // Final fallback to show 'N/A' instead of a static hard-coded IATA
  originCode = originCode || "N/A";
  destCode = destCode || "N/A";

  // Time Logic
  // const depTime = flight.depTime || booking.depTime || "00:00";
  // const arrTime = flight.arrTime || booking.arrTime || "00:00";
  // const depDate = formatFullDate(booking.departureDate);
  // const arrDate = formatFullDate(booking.arrivalDate || booking.departureDate);

  // // Baggage & Sector
  // const baggage = booking.baggageWeight || flight.baggage || "20KG";
  // const sector = `${origin} (${originCode}) - ${dest} (${destCode})`;

  // // Plane Icon (Base64 from your PDF code)
  // const planeIconBase64 =
  //     "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwMCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBzdHlsZT0idHJhbnNmb3JtOiByb3RhdGUoOTBkZWcpOyI+PHBhdGggZD0iTTIxIDE2di0ybC04LTVWMy41YzAtLjgzLS42Ny0xLjUtMS41LTEuNVMxMCAyLjY3IDEwIDMuNVY5TDIgMTR2Mmw4LTIuNVYxOWwtMiAxLjVWMjJsMy41LTEgMy41IDF2LTEuNUwxMyAxOXYtNS41bDggMi41eiIvPjwvc3ZnPg==";

  // Passengers (Logic adapted to handle array like the PDF, defaulting to your single passenger extract if needed)
  const passengers =
    booking.passengers && booking.passengers.length > 0
      ? booking.passengers
      : [
          {
            title: booking.passengers?.[0]?.title || "",
            givenName: booking.passengers?.[0]?.givenName || "PASSENGER",
            surName: booking.passengers?.[0]?.surName || "NAME",
            passport: "N/A",
          },
        ];

  // Frontend user fallback (safe parse)
  // const storedFrontendUser = (() => {
  //     try {
  //         return JSON.parse(localStorage.getItem("frontend_user") || "{}");
  //     } catch (e) {
  //         return {};
  //     }
  // })();

  // Dynamic fields (never static)
  // const issuedBy =
  //     booking.issuedBy ||
  //     storedFrontendUser.companyName ||
  //     storedFrontendUser.name ||
  //     "N/A";

  // const agencyName =
  //     (booking.userId && booking.userId.companyName) ||
  //     booking.agencyName ||
  //     storedFrontendUser.companyName ||
  //     "N/A";

  // const phoneNumber =
  //     (booking.userId && booking.userId.phone) ||
  //     booking.phone ||
  //     storedFrontendUser.phone ||
  //     "N/A";

  // --- 3. Build per-flight sections & passenger rows ---
  const bookingId =
    booking.bookingReference ||
    booking.bookingId ||
    booking.counter ||
    booking._id ||
    "N/A";
  const flightsArr =
    booking.flights && booking.flights.length > 0 ? booking.flights : [flight];

  const flightSectionsHTML = flightsArr
    .map((f, index) => {
      const fNum = f.flightNo || booking.flightNumber || "XX000";
      const fAirline = (
        f.airlineName ||
        booking.airline?.name ||
        "AIRLINE"
      ).toUpperCase();
      const fBaggage = f.baggage || booking.baggageWeight || "20KG";
      const fDepTime = f.depTime || booking.depTime || "00:00";
      const fArrTime = f.arrTime || booking.arrTime || "00:00";

      let fOriginCode = (f.originCode || f.sectorFrom || "").toUpperCase();
      let fDestCode = (f.destinationCode || f.sectorTo || "").toUpperCase();
      const fOriginCity = (f.origin || f.originCity || "").toUpperCase();
      const fDestCity = (
        f.destination ||
        f.destinationCity ||
        ""
      ).toUpperCase();

      if (!fOriginCode && f.sector) {
        const m = f.sector.match(/([A-Z]{3})-([A-Z]{3})/);
        if (m) {
          fOriginCode = m[1];
          fDestCode = m[2];
        }
      }
      fOriginCode = fOriginCode || originCode;
      fDestCode = fDestCode || destCode;

      const fDepDate = formatFullDate(
        f.departureDate ||
          f.depDate ||
          f.date ||
          (index === 0
            ? booking.departureDate
            : booking.returnDate || booking.arrivalDate),
      );
      const fArrDate = formatFullDate(
        f.arrivalDate ||
          f.arrDate ||
          f.arrival_date ||
          f.departureDate ||
          f.depDate ||
          f.date ||
          (index === 0
            ? booking.departureDate
            : booking.returnDate || booking.arrivalDate),
      );

      const fHeaderOrigin = fOriginCity || fOriginCode;
      const fOriginLabel = fOriginCity
        ? `${fOriginCity} (${fOriginCode})`
        : fOriginCode;
      const fHeaderDest = fDestCity || fDestCode;
      const fDestLabel = fDestCity ? `${fDestCity} (${fDestCode})` : fDestCode;

      return `
        <div class="flight-section">
            <div class="flight-header">Flight ${index + 1} - ${fHeaderOrigin} (${fOriginCode}) to ${fHeaderDest} (${fDestCode})</div>
            <table class="flight-table">
                <thead>
                    <tr>
                        <th>AIRLINE NAME</th>
                        <th>Flight #</th>
                        <th>DEPARTURE</th>
                        <th></th>
                        <th>ARRIVAL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${fAirline}</td>
                        <td>${fNum}<br><span style="color:#999;font-size:10px;">Baggage</span><br>${fBaggage}</td>
                        <td><strong style="font-size:14px;">${fDepTime}</strong><br>${fOriginLabel}<br><span style="color:#555;">${fDepDate}</span></td>
                        <td style="text-align:center;font-size:22px;color:#333;">&#9992;</td>
                        <td><strong style="font-size:14px;">${fArrTime}</strong><br>${fDestLabel}<br><span style="color:#555;">${fArrDate}</span></td>
                    </tr>
                </tbody>
            </table>
        </div>`;
    })
    .join("");

  const passengersHTML = passengers
    .map(
      (p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${[p.title, p.givenName, p.surName].filter(Boolean).join(" ")}</td>
            <td>${p.passport || p.passportNumber || "N/A"}</td>
            <td>${p.meal ? "Yes" : "N/A"}</td>
            <td>${p.status || bookingStatus || "Confirmed"}</td>
        </tr>`,
    )
    .join("");

  // --- 4. Construct the HTML ---
  const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Electronic Ticket Voucher</title>
    <style>
        @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 0; padding: 30px; background: #fff; }

        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .agency-logo { min-width: 80px; display: flex; align-items: center; justify-content: flex-start; }
        .agency-logo img { max-height: 55px; max-width: 160px; object-fit: contain; }
        .page-title { font-size: 26px; font-weight: bold; color: #1a5276; }
        .airline-logo img { height: 55px; object-fit: contain; }

        .info-box { background: #1a5276; color: #fff; border-radius: 10px; padding: 15px 20px; margin-bottom: 20px; }
        .info-box .info-row { margin-bottom: 4px; font-size: 13px; }

        .flight-section { margin-bottom: 20px; border-radius: 4px; overflow: hidden; border: 1px solid #eee; }
        .flight-header { background: #d4ac0d; color: #fff; padding: 10px 15px; font-weight: bold; font-size: 14px; }
        .flight-table { width: 100%; border-collapse: collapse; }
        .flight-table th { text-align: left; padding: 10px 15px; font-size: 11px; color: #555; font-weight: bold; border-bottom: 1px solid #eee; background: #fff; }
        .flight-table td { padding: 10px 15px; font-size: 12px; vertical-align: top; }

        .pax-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .pax-table thead tr { background: #1a5276; color: #fff; }
        .pax-table th { padding: 10px 15px; text-align: left; font-size: 12px; }
        .pax-table td { padding: 10px 15px; border-bottom: 1px solid #eee; font-size: 12px; }

        .terms-title { font-weight: bold; color: #1a5276; font-size: 14px; margin: 20px 0 8px; }
        .terms-list { padding-left: 20px; margin: 0; }
        .terms-list li { margin-bottom: 5px; font-size: 12px; }
    </style>
</head>
<body>
    <div style="max-width: 800px; margin: 0 auto;">

        <!-- Header -->
        <div class="header">
            <div class="agency-logo">
                ${agencyLogo ? `<img src="${agencyLogo}" alt="${getAgencyName(booking)}" />` : ""}
            </div>
            <div class="page-title">Electronic Ticket Voucher</div>
            <div class="airline-logo">
                ${
                  airlineLogo
                    ? `<img src="${airlineLogo}" alt="${airlineName}" />`
                    : `<span style="font-size:20px;font-weight:bold;color:#1a5276;">${airlineName}</span>`
                }
            </div>
        </div>

        <!-- Booking Info Box -->
        <div class="info-box">
            <div class="info-row">Booking Reference Number (PNR) :  ${pnr}</div>
            <div class="info-row">Booking ID :  ${bookingId}</div>
            <div class="info-row">Issued By :  ${getAgencyName(booking)}</div>
            <div class="info-row">Agent Name :  ${getName(booking)}</div>
            <div class="info-row">Contact :  ${getAgencyPhone(booking)}</div>
        </div>

        <!-- Flight Sections -->
        ${flightSectionsHTML}

        <!-- Passengers -->
        <table class="pax-table">
            <thead>
                <tr>
                    <th>Sr#</th>
                    <th>Passenger Name</th>
                    <th>Passport#</th>
                    <th>Meal</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${passengersHTML}
            </tbody>
        </table>

        <!-- Terms & Conditions -->
        <div class="terms-title">Terms &amp; Conditions</div>
        <ul class="terms-list">
            <li>Please Report Airline Check-In Counter 4 Hours Before Flight Departure.</li>
            <li>All Visa and Travel Document are Traveler Own Responsibility.</li>
            <li>Tickets are non refundable</li>
        </ul>

    </div>
</body>
</html>
`;
  // --- 5. The Iframe Trick ---
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(ticketHTML);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error("Print failed", e);
    } finally {
      // Remove iframe after delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }
  };
};

const getAgencyLogo = (booking) => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.logo) {
    return booking.userId.logo;
  }
  if (booking.agencyLogo) {
    return booking.agencyLogo;
  }
  if (storedFrontendUser.logo) {
    return storedFrontendUser.logo;
  }
  return DEFAULT_AGENCY_LOGO;
};

const getAgencyName = (booking) => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.companyName) {
    return booking.userId.companyName;
  }
  if (booking.agencyName) {
    return booking.agencyName;
  }
  if (storedFrontendUser.companyName) {
    return storedFrontendUser.companyName;
  }
  return "SUPRA TRAVEL & TOURS";
};

const getStoredFrontendUser = () => {
  try {
    return JSON.parse(localStorage.getItem("frontend_user") || "{}");
  } catch {
    return {};
  }
};

const getName = (booking) => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.name) {
    return booking.userId.name;
  }
  if (booking.contactPersonName) {
    return booking.contactPersonName;
  }
  if (booking.issuedBy) {
    return booking.issuedBy;
  }
  if (storedFrontendUser.name) {
    return storedFrontendUser.name;
  }
  if (storedFrontendUser.companyName) {
    return storedFrontendUser.companyName;
  }
  return "SUPRA TRAVEL & TOURS";
};

// const getAgencyEmail = (booking) => {
//     const storedFrontendUser = getStoredFrontendUser();

//     if (typeof booking.userId === "object" && booking.userId?.email) {
//         return booking.userId.email;
//     }
//     if (booking.email) {
//         return booking.email;
//     }
//     if (booking.contactEmail) {
//         return booking.contactEmail;
//     }
//     if (storedFrontendUser.email) {
//         return storedFrontendUser.email;
//     }
//     return "N/A";
// };

const getAgencyPhone = (booking) => {
  const storedFrontendUser = getStoredFrontendUser();

  if (typeof booking.userId === "object" && booking.userId?.phone) {
    return booking.userId.phone;
  }
  if (booking.phone) {
    return booking.phone;
  }
  if (booking.contactPhone) {
    return booking.contactPhone;
  }
  if (booking.contactNumber) {
    return booking.contactNumber;
  }
  if (storedFrontendUser.phone) {
    return storedFrontendUser.phone;
  }
  return "N/A";
};
