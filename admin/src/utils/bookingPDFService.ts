// Shown on the ticket voucher when the issuing agency has no logo of its own
// (Register.logo is empty). Point this at the default agency logo image.
import defaultLogo from "../assets/images/logo.png";
export const DEFAULT_AGENCY_LOGO = defaultLogo;

export const printGDSBooking = (booking: any): void => {
  const formatFullDate = (dateStr: Date | string) => {
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
  const airlineLogo =
    booking.airline?.logoUrl || flight.airlineLogo || booking.flightLogo || "";

  const agencyLogo = getAgencyLogo(booking);

  const pnr = booking.pnr || booking.bookingReference || "N/A";

  let originCode = (
    booking.originCode ||
    flight.originCode ||
    booking.originIata ||
    flight.sectorFrom ||
    ""
  ).toUpperCase();

  let destCode = (
    booking.destinationCode ||
    flight.destinationCode ||
    booking.destinationIata ||
    flight.sectorTo ||
    ""
  ).toUpperCase();

  if ((!originCode || originCode.trim() === "") && booking.sector) {
    const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
    if (sectorMatch) originCode = sectorMatch[1];
  }
  if ((!destCode || destCode.trim() === "") && booking.sector) {
    const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
    if (sectorMatch) destCode = sectorMatch[2];
  }

  originCode = originCode || "N/A";
  destCode = destCode || "N/A";

  const passengers: any[] =
    booking.passengers && booking.passengers.length > 0
      ? booking.passengers
      : [
          {
            title: "",
            givenName: "PASSENGER",
            surName: "NAME",
            passport: "N/A",
          },
        ];

  const bookingId =
    booking.bookingReference ||
    booking.bookingId ||
    booking.counter ||
    booking._id ||
    "N/A";
  const flightsArr =
    booking.flights && booking.flights.length > 0 ? booking.flights : [flight];

  const flightSectionsHTML = flightsArr
    .map((f: any, index: number) => {
      const fNum = f.flightNo || booking.flightNumber || "XX000";
      const fAirline = (
        f.airlineName ||
        f.airline ||
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

      // const fDepDate = formatFullDate(
      //   f.departureDate ||
      //   f.depDate ||
      //   (index === 0
      //     ? booking.departureDate
      //     : booking.returnDate || booking.arrivalDate),
      // );
      // const fArrDate = formatFullDate(
      //   f.arrivalDate ||
      //   f.arrDate ||
      //   f.departureDate ||
      //   f.depDate ||
      //   (index === 0
      //     ? booking.departureDate
      //     : booking.returnDate || booking.arrivalDate),
      // );

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
      (p: any, i: number) => `
        <tr>
            <td>${i + 1}</td>
            <td>${[p.title, p.givenName, p.surName].filter(Boolean).join(" ")}</td>
            <td>${p.passport || p.passportNumber || "N/A"}</td>
            <td>${p.meal ? "Yes" : "N/A"}</td>
            <td>${p.status || bookingStatus || "Confirmed"}</td>
        </tr>`,
    )
    .join("");

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

        .header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 20px; }
        .agency-logo { min-width: 80px; min-height: 58px; display: flex; align-items: center; justify-content: flex-start; }
        .agency-logo img { max-height: 55px; max-width: 160px; width: auto; object-fit: contain; display: block; }
        .page-title { font-size: 26px; font-weight: bold; color: #1a5276; }
        .airline-logo { min-width: 150px; min-height: 58px; display: flex; align-items: center; justify-content: flex-end; }
        .airline-logo img { max-height: 55px; max-width: 180px; width: auto; object-fit: contain; display: block; }
        .airline-fallback { font-size: 20px; font-weight: bold; color: #1a5276; text-align: right; }

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
        <div class="header">
            <div class="agency-logo">
                ${agencyLogo ? `<img src="${agencyLogo}" alt="${getAgencyName(booking)}" />` : ""}
            </div>
            <div class="page-title">Electronic Ticket Voucher</div>
            <div class="airline-logo">
                ${
                  airlineLogo
                    ? `<img src="${airlineLogo}" alt="${airlineName}" onerror="this.outerHTML='<span class=&quot;airline-fallback&quot;>${airlineName}</span>'" />`
                    : `<span class="airline-fallback">${airlineName}</span>`
                }
            </div>
        </div>

        <div class="info-box">
            <div class="info-row">Booking Reference Number (PNR) :  ${pnr}</div>
            <div class="info-row">Booking ID :  ${bookingId}</div>
            <div class="info-row">Issued By :  ${getAgencyName(booking)}</div>
            <div class="info-row">Agent Name :  ${getName(booking)}</div>
            <div class="info-row">Contact :  ${getAgencyPhone(booking)}</div>
        </div>

        ${flightSectionsHTML}

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
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });

    Promise.all(imageLoads).finally(() => {
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

const getStoredFrontendUser = (): Record<string, string> => {
  try {
    return JSON.parse(
      localStorage.getItem("frontend_user") ||
        localStorage.getItem("admin_user") ||
        "{}",
    );
  } catch {
    return {};
  }
};

const getAgencyLogo = (booking: any): string => {
  console.log(booking);
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

const getAgencyName = (booking: any): string => {
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

const getName = (booking: any): string => {
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

const getAgencyPhone = (booking: any): string => {
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
