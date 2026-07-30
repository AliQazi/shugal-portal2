import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const generateBookingPDF = async (booking) => {
  // Debug: Log the complete booking object structure
  console.log("=== BOOKING DATA STRUCTURE ===");
  console.log("Full booking object:", JSON.stringify(booking, null, 2));
  console.log("booking.flights:", booking.flights);
  console.log("booking.sector:", booking.sector);
  console.log("booking.airline:", booking.airline);
  console.log("=== END BOOKING DATA ===");

  // Create a temporary div to hold the HTML content
  const element = document.createElement("div");
  element.style.width = "850px";
  element.style.padding = "40px";
  element.style.backgroundColor = "#ffffff";
  element.style.fontFamily = "Helvetica, Arial, sans-serif";
  element.style.color = "#000000";
  element.style.boxSizing = "border-box";
  element.style.position = "absolute";
  element.style.left = "-9999px";

  // Colors
  const colors = {
    bluePrimary: "#177cb0",
    orange: "#ff9f00",
    tableHeader: "#0e7eac",
    textGray: "#333",
  };

  const planeIconBase64 =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzY2NiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBzdHlsZT0idHJhbnNmb3JtOiByb3RhdGUoOTBkZWcpOyI+PHBhdGggZD0iTTIxIDE2di0ybC04LTVWMy41YzAtLjgzLS42Ny0xLjUtMS41LTEuNVMxMCAyLjY3IDEwIDMuNVY5TDIgMTR2Mmw4LTIuNVYxOWwtMiAxLjVWMjJsMy41LTEgMy41IDF2LTEuNUwxMyAxOXYtNS41bDggMi41eiIvPjwvc3ZnPg==";

  // Fully dynamic mapping for PDF fields
  const flight = booking.flights?.[0] || {};
  const airlineName =
    (booking.airline?.name || flight.airlineName || "").toUpperCase() ||
    "AIRLINE";
  const airlineLogo = booking.airline?.logoUrl || flight.airlineLogo || "";
  const flightNo =
    booking.flightNumber || flight.flightNo || flight.flightNumber || "XX000";
  const depTime =
    flight.depTime || booking.depTime || booking.departureTime || "00:00";
  const arrTime =
    flight.arrTime || booking.arrTime || booking.arrivalTime || "00:00";

  // Extract origin and destination cities
  const originCity =
    (
      flight.origin ||
      booking.origin ||
      booking.originCity ||
      ""
    ).toUpperCase() || "ISLAMABAD";
  const destinationCity =
    (
      flight.destination ||
      booking.destination ||
      booking.destinationCity ||
      ""
    ).toUpperCase() || "UAE";

  // Try to extract airport codes from multiple sources
  let originCode =
    flight.originCode ||
    booking.originCode ||
    booking.originIata ||
    flight.sectorFrom ||
    "ISB";
  let destinationCode =
    flight.destinationCode ||
    booking.destinationCode ||
    booking.destinationIata ||
    flight.sectorTo ||
    "AUH";

  // If codes are not available, try to parse from the sector string
  if (
    booking.sector &&
    (!originCode || originCode === "ISB") &&
    (!destinationCode || destinationCode === "AUH")
  ) {
    const sectorMatch = booking.sector.match(/([A-Z]{3})-([A-Z]{3})/);
    if (sectorMatch) {
      originCode = sectorMatch[1];
      destinationCode = sectorMatch[2];
    }
  }

  console.log(
    "Extracted codes - Origin:",
    originCode,
    "Destination:",
    destinationCode,
  );

  const originCountry = booking.originCountry || flight.originCountry || "";
  const destinationCountry =
    booking.destinationCountry || flight.destinationCountry || "";
  const baggage = booking.baggageWeight || flight.baggage || "20+07 KG";
  const meal = flight.meal || booking.meal || "MEAL";
  const equipment = flight.equipment || booking.equipment || "UNKNOWN";
  const sector = `${originCity} (${originCode}) - ${destinationCity} (${destinationCode})`;
  const route = `${originCity} TO ${destinationCity}`;

  element.innerHTML = `
    <div>
        
        <!-- 1. Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
                 <img src="/src/assets/images/logo.webp" alt="Agency Logo" style="width: 140px; object-fit: contain;" />
            </div>
            <div>
                <img src="${airlineLogo}" alt="Airline Logo" style="height: 70px; object-fit: contain;" />
            </div>
        </div>

        <h2 style="color: ${colors.bluePrimary}; font-size: 24px; font-weight: 400; margin: 0 0 20px 0;">
            Electronic Ticket Reservation
        </h2>

        <!-- 2. Blue Booking Info Box -->
            <div style="background-color: ${colors.bluePrimary}; color: white; padding: 15px 20px; border-radius: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between;">
            <div style="flex: 1;">
            <div style="font-size: 13px; margin-bottom: 6px; opacity: 0.9;">Booking Reference (PNR)</div>
            <div style="font-size: 13px; margin-bottom: 6px; opacity: 0.9;">Booking ID</div>
            <div style="font-size: 13px; margin-bottom: 6px; opacity: 0.9;">Issued By</div>
            <div style="font-size: 13px; margin-bottom: 6px; opacity: 0.9;">Agent Name</div>
            <div style="font-size: 13px; opacity: 0.9;">Phone Number</div>
            </div>
            
            <div style="flex: 1; text-align: left; padding-right: 20px;">
            <div style="font-size: 13px;  margin-bottom: 6px; letter-spacing: 1px;">${booking.pnr || "N/A"}</div>
            <div style="font-size: 13px; letter-spacing: 1px;">${booking.bookingReference}</div>
            <div style="font-size: 13px;  margin-bottom: 6px; letter-spacing: 1px;">${getAgencyName(booking)}</div>
            <div style="font-size: 13px;  margin-bottom: 6px; letter-spacing: 1px;">${getName(booking)}</div>
            <div style="font-size: 13px; margin-bottom: 6px;">${getPhone(booking)}</div>
            </div>
        </div>
        </div>

        <!-- 3. Orange Flight Strip -->
        <div style="background-color: ${colors.orange}; color: white; padding: 10px 20px; font-weight: bold; font-size: 20px; border-radius: 4px 4px 0 0;">
            Flight 1 - ${sector}
        </div>

        <!-- 4. Flight Details Section (Replicated from Image) -->
        <div style="margin-bottom: 30px; padding: 20px 0; border-bottom: 1px solid #ddd;">
            
            <!-- HEADERS -->
            <div style="display: flex; font-weight: bold; font-size: 15px; margin-bottom: 15px; color: #000;">
                <div style="width: 18%;">AIRLINE</div>
                <div style="width: 20%;">FLIGHT #</div>
                <div style="width: 31%;">DEPARTURE</div>
                <div style="width: 31%;">ARRIVAL</div> 
            </div>

            <!-- DATA ROW (Flex Container for columns) -->
            <div style="display: flex; align-items: flex-start; position: relative; color: #000;">
                
                <!-- Col 1: Airline Name -->
                <div style="width: 18%; font-size: 16px;">
                    <div>${airlineName}</div>
                </div>

                <!-- Col 2: Flight # AND Baggage -->
                <div style="width: 20%;">
                    <!-- Flight Number -->
                    <div style="font-size: 16px; margin-bottom: 25px;">${flightNo}</div>
                    
                    <!-- Baggage Label & Value (Moved here to match image) -->
                    <div style="font-weight: bold; font-size: 15px; margin-bottom: 5px;">Baggage</div>
                    <div style="font-size: 16px;">${baggage}</div>
                </div>

                <!-- Col 3: Departure Time & City -->
                <div style="width: 31%;">
                    <!-- Time -->
                    <div style="font-size: 16px; margin-bottom: 25px;">${depTime}</div>
                    
                    <!-- City & Date -->
                    <div style="font-size: 16px;">
                        <div style="text-transform: uppercase; margin-bottom: 5px;">${originCity}</div>
                        <div>${formatDate(booking.departureDate)}</div>
                    </div>
                </div>

                <!-- PLANE ICON (Absolute Center between Dep/Arr) -->
                 <div style="position: absolute; left: 58%; top: -5px; z-index: 10;">
                    <img src="${planeIconBase64}" width="40" height="40" style="opacity: 0.7;" />
                </div>

                <!-- Col 4: Arrival Time & City -->
                <div style="width: 31%;">
                    <!-- Time -->
                    <div style="font-size: 16px; margin-bottom: 25px;">${arrTime}</div>
                    
                    <!-- City & Date -->
                    <div style="font-size: 16px;">
                        <div style="text-transform: uppercase; margin-bottom: 5px;">${destinationCity}</div>
                        <div>${formatDate(booking.arrivalDate || booking.departureDate)}</div>
                    </div>
                </div>

            </div>
        </div>

        <!-- 5. Passenger Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: ${colors.tableHeader}; color: white;">
                    <th style="padding: 10px; text-align: left; font-size: 14px; font-weight: bold; width: 50px;">Sr #</th>
                    <th style="padding: 10px; text-align: left; font-size: 14px; font-weight: bold;">Passenger Name</th>
                    <th style="padding: 10px; text-align: left; font-size: 14px; font-weight: bold;">Passport #</th>
                    <th style="padding: 10px; text-align: left; font-size: 14px; font-weight: bold;">Meal</th>
                </tr>
            </thead>
            <tbody>
                ${booking.passengers && booking.passengers.length > 0
      ? booking.passengers
        .map(
          (p, idx) => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px; font-size: 13px;">${idx + 1}</td>
                        <td style="padding: 10px; font-size: 13px; text-transform: uppercase;">
                            ${p.title || ""} ${p.givenName || ""} ${p.surName || ""}
                        </td>
                        <td style="padding: 10px; font-size: 13px;">${p.passport || "N/A"}</td>
                        <td style="padding: 10px; font-size: 13px;">Yes</td>
                    </tr>
                `,
        )
        .join("")
      : `
                    <tr><td colspan="4" style="padding: 10px; text-align: center;">No passengers found</td></tr>
                `
    }
            </tbody>
        </table>

        <!-- 6. Terms & Footer -->
        <div style="margin-top: 10px;">
            <div 
  style="line-height: 2; font-family: Arial, sans-serif; font-size: 13px;" 
  class="terms"
>
  <div style="font-weight:bold;> class="mb-10">TERMS & CONDITIONS</div>

  <div style="font-weight:bold; font-size: 12px;"><span style="margin-right:8px;">1-</span>PLEASE CROSS CHECK NAME AND FLIGHT DETAILS.</div>
  <div style="font-weight:bold;  font-size: 12px"><span style="margin-right:8px;">2-</span>PLEASE REPORT AIRLINE CHECK-IN COUNTER 4 HOURS BEFORE FLIGHT DEPARTURE.</div>
  <div style="font-weight:bold;  font-size: 12px"><span style="margin-right:8px;">3-</span>PLEASE RECONFIRM THE TICKET BEFORE 48 HOURS OF FLIGHT DEPARTURE.</div>
  <div style="font-weight:bold;  font-size: 12px"><span style="margin-right:8px;">4-</span>ALL VISA AND TRAVEL DOCUMENT ARE TRAVELER OWN RESPONSIBILITY.</div>
  <div style="font-weight:bold;  font-size: 12px"><span style="margin-right:8px;">5-</span>TICKETS ARE NON-REFUNDABLE AND NON-CHANGEABLE ANY TIME.</div>
</div>
        </div>

        <div style="margin-top: 25px; border-top: 1px solid #ccc; padding-top: 10px; text-align: center; color: #555; font-size: 10px;">
            Issued By: ${getAgencyName(booking)} | Generated on: ${new Date().toLocaleString("en-GB")}
        </div>

    </div>
    `;

  document.body.appendChild(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 297;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    // ============================================
    // UPDATED FILENAME LOGIC STARTS HERE
    // - Filename format: <PNR>_<ORIG>-<DEST>.pdf (filesystem-safe)
    // - Delivery: download (user requested)
    // ============================================

    // Ensure we have a safe reference and sector codes
    const reference = (booking.pnr || booking.bookingReference || "REF").toString().trim();
    const oCode = (originCode || "UNK").toString().toUpperCase();
    const dCode = (destinationCode || "UNK").toString().toUpperCase();
    const sectorCodes = `${oCode}-${dCode}`;

    // Final filename: <PNR>_<ORIG>-<DEST>.pdf (sanitized)
    const finalFileName = `${sanitizeFilename(reference)}_${sanitizeFilename(sectorCodes)}.pdf`;

    // Trigger file download with the chosen filename
    pdf.save(finalFileName);

    // ============================================
    // UPDATED FILENAME LOGIC ENDS HERE
    // ============================================
  } finally {
    document.body.removeChild(element);
  }
};

// --- Helper Functions ---
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getAgencyName = (booking) => {
  if (typeof booking.userId === "object" && booking.userId?.companyName) {
    return booking.userId.companyName;
  }
  return "SUPRA TRAVEL & TOURS";
};


const getName = (booking) => {
  if (typeof booking.userId === "object" && booking.userId?.name) {
    return booking.userId.name;
  }
  return "SUPRA TRAVEL & TOURS";
};

const getPhone = (booking) => {
  if (typeof booking.userId === "object" && booking.userId?.phone) {
    return booking.userId.phone;
  }
  return "SUPRA TRAVEL & TOURS";
};
// Make filenames filesystem-safe
const sanitizeFilename = (str) => {
  if (!str) return "file";
  return String(str).replace(/[^a-zA-Z0-9-_\.]/g, "_");
};
