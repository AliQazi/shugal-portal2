import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../assets/images/logo.png";

// --- HELPERS ---
const fmt = (n) => (n ? Number(n).toLocaleString() : "-");

const formatScheduleDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}`;
};

const ROOM_ORDER = ["sharing", "quad", "triple", "double"];
const ROOM_TOTALS_KEY_MAP = {
  sharing: "shared", quad: "quad", triple: "triple", double: "double"
};

const getRoomPrice = (pkg, key) => {
  const totalsKey = ROOM_TOTALS_KEY_MAP[key] || key;
  const fromTotals = pkg.packageTotals?.[totalsKey];
  if (typeof fromTotals === "number" && fromTotals > 0) return fromTotals;
  const fromRooms = pkg.rooms?.[key];
  return typeof fromRooms === "number" && fromRooms > 0 ? fromRooms : null;
};

// --- LOGO HELPER ---
const addLogoToHeader = async (doc, x, y, logoWidth = 35) => { // Increased logo width
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const logoHeight = logoWidth / aspectRatio;
      doc.addImage(img, "PNG", x, y, logoWidth, logoHeight);
      resolve();
    };
    img.src = logo;
  });
};

const addBrandHeader = async (doc, startY = 15) => {
  await addLogoToHeader(doc, 15, startY, 35);

  // Adjusted text offset (55) to accommodate larger logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(22, 78, 99);
  doc.text("Abid Air Travel & Tours", 55, startY + 8);

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("Umrah Group Package Offer", 55, startY + 14);

  return startY + 20;
};

// --- CORE TABLE DRAWING LOGIC ---
const drawBatchTable = (doc, batch, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const packages = batch.packages;
  const headerPkg = packages[0];

  // 1. Header Blue Bar
  doc.setFillColor(22, 78, 99);
  doc.rect(15, startY, pageWidth - 30, 10, "F");

  // 2. Airline & Sector Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`${headerPkg.airlineName} - ${headerPkg.sector}`, 20, startY + 6.5);

  // 3. Duration Badge
  doc.text(`${headerPkg.packageDuration} Days`, pageWidth - 20, startY + 6.5, { align: "right" });

  let yPos = startY + 10;

  // 4. Transport Bar
  const transports = [];
  const seenT = new Set();
  packages.forEach(pkg => {
    (pkg.transport || []).forEach(t => {
      const key = `${t.route}-${t.transportType}`.toLowerCase();
      if (!seenT.has(key)) {
        transports.push(`${t.route} (${t.transportType})`);
        seenT.add(key);
      }
    });
  });

  if (transports.length > 0) {
    doc.setFillColor(240, 249, 255);
    doc.rect(15, yPos, pageWidth - 30, 7, "F");
    doc.setFontSize(8.5);
    doc.setTextColor(7, 89, 133);
    doc.text(`Transport: ${transports.join("  |  ")}`, 20, yPos + 4.5);
    yPos += 7;
  }

  // 5. Build Table Data
  const roomColumns = ROOM_ORDER.filter((key) =>
    packages.some((pkg) => getRoomPrice(pkg, key) !== null)
  );

  const head = [
    ["Hotels", "Schedule", "Luggage", ...roomColumns.map(c => c.charAt(0).toUpperCase() + c.slice(1))]
  ];

  const body = packages.map(pkg => {
    const makkah = (pkg.hotels || []).filter(h => ["makkah", "mecca"].includes(h.city?.toLowerCase()));
    const madina = (pkg.hotels || []).filter(h => ["madinah", "madina", "medina"].includes(h.city?.toLowerCase()));

    const hotelLine = [...makkah.map(h => `Makkah: ${h.name}`), ...madina.map(h => `Madina: ${h.name}`)].join("\n");

    const scheduleLine = (pkg.flights || []).map(f => {
      const code = pkg.airline?.airlineCode ? `${pkg.airline.airlineCode} ` : "";
      return `${code}${formatScheduleDate(f.depDate)} ${f.sectorFrom}-${f.sectorTo} ${f.depTime || ''} ${f.arrTime || ''}`;
    }).join("\n");

    const luggageLine = (pkg.flights || []).map(f => f.baggage || "-").join("\n");
    const prices = roomColumns.map(col => fmt(getRoomPrice(pkg, col)));

    return [hotelLine, scheduleLine, luggageLine, ...prices];
  });

  // 6. AutoTable
  autoTable(doc, {
    startY: yPos,
    head: head,
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5, // Reduced padding for compactness
      valign: "middle",
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { cellWidth: 65 }, // Hotel column
      1: { cellWidth: 60 }, // Schedule column
      2: { cellWidth: 22, halign: "center" }, // Luggage
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center" },
    },
    tableLineColor: [210, 210, 210],
    tableLineWidth: 0.2,
  });

  return doc.lastAutoTable.finalY + 10;
};

// --- EXPORTED FUNCTIONS ---

export const generateBatchPDF = async (batch) => {
  const doc = new jsPDF("l", "mm", "a4");
  const headerEndY = await addBrandHeader(doc, 15);
  drawBatchTable(doc, batch, headerEndY + 5);

  // Single page footer
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Abid Air Travel & Tours | Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 10, { align: "center" });

  doc.save(`${batch.packages[0].airlineName}_${batch.packages[0].sector}.pdf`);
};

export const generateUmrahPackagesPDF = async (packages) => {
  const doc = new jsPDF("l", "mm", "a4");
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  const batchMap = new Map();
  packages.forEach((group) => {
    const airlineKey = (group.airlineName || "").trim().toLowerCase();
    const sectorKey = (group.sector || "").trim().toUpperCase();
    const key = `route-${airlineKey}|${sectorKey}`;
    if (!batchMap.has(key)) batchMap.set(key, { key, packages: [] });
    batchMap.get(key).packages.push(group);
  });
  const batches = Array.from(batchMap.values());

  let yPos = await addBrandHeader(doc, 15);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Available Umrah Packages - ${new Date().toLocaleDateString()}`, 55, yPos);
  yPos += 8;

  for (const batch of batches) {
    // Check if next table fits (approximate 50mm height check)
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(22, 78, 99);
      doc.text("Abid Air Travel & Tours - Continued", 15, yPos);
      yPos += 10;
    }
    yPos = drawBatchTable(doc, batch, yPos);
  }

  // Footer - Placed at bottom of every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    // x = pageWidth/2 (Center), y = pageHeight - 10 (Bottom)
    doc.text(
      `Page ${i} of ${pageCount} | Abid Air Travel & Tours`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save("Abid_Air_Umrah_Packages.pdf");
};

// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
// import logo from "../assets/images/logo.png";

// // Helper: Format price
// const fmt = (n) => (n ? Number(n).toLocaleString() : "-");

// // Helper: Format Date for PDF
// const formatScheduleDate = (dateStr) => {
//   if (!dateStr) return "-";
//   const d = new Date(dateStr);
//   const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
//   return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}`;
// };

// // Helper: Get room columns dynamically (same logic as UI)
// const ROOM_ORDER = ["sharing", "quint", "quad", "triple", "double"];
// const ROOM_TOTALS_KEY_MAP = {
//   sharing: "shared", quint: "quint", quad: "quad", triple: "triple", double: "double"
// };

// const getRoomPrice = (pkg, key) => {
//   const totalsKey = ROOM_TOTALS_KEY_MAP[key] || key;
//   const fromTotals = pkg.packageTotals?.[totalsKey];
//   if (typeof fromTotals === "number" && fromTotals > 0) return fromTotals;
//   const fromRooms = pkg.rooms?.[key];
//   return typeof fromRooms === "number" && fromRooms > 0 ? fromRooms : null;
// };

// export const generateBatchPDF = async (batch) => {
//   const doc = new jsPDF("l", "mm", "a4"); // Landscape for the table
//   const pageWidth = doc.internal.pageSize.getWidth();
//   const packages = batch.packages;
//   const headerPkg = packages[0];

//   // 1. Header Blue Bar
//   doc.setFillColor(22, 78, 99); // theme.colors.primary
//   doc.rect(0, 0, pageWidth, 15, "F");

//   // 2. Airline & Sector Title
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(14);
//   doc.setTextColor(255, 255, 255);
//   doc.text(`${headerPkg.airlineName} - ${headerPkg.sector}`, 15, 10);

//   // 3. Badges (Duration)
//   doc.setFontSize(10);
//   doc.text(`${headerPkg.packageDuration} Days`, pageWidth - 15, 10, { align: "right" });

//   let yPos = 22;

//   // 4. Transport Bar
//   const transports = [];
//   const seenT = new Set();
//   packages.forEach(pkg => {
//     (pkg.transport || []).forEach(t => {
//       const key = `${t.route}-${t.transportType}`;
//       if (!seenT.has(key)) {
//         transports.push(`${t.route} (${t.transportType})`);
//         seenT.add(key);
//       }
//     });
//   });

//   if (transports.length > 0) {
//     doc.setFillColor(240, 249, 255);
//     doc.rect(15, yPos, pageWidth - 30, 8, "F");
//     doc.setFontSize(8);
//     doc.setTextColor(7, 89, 133);
//     doc.text(`Transport: ${transports.join("  |  ")}`, 20, yPos + 5);
//     yPos += 12;
//   }

//   // 5. Build Table Data
//   const roomColumns = ROOM_ORDER.filter((key) =>
//     packages.some((pkg) => getRoomPrice(pkg, key) !== null)
//   );

//   const head = [
//     ["Hotels", "Schedule", "Luggage", ...roomColumns.map(c => c.charAt(0).toUpperCase() + c.slice(1))]
//   ];

//   const body = packages.map(pkg => {
//     // Hotel Text
//     const makkah = (pkg.hotels || []).filter(h => ["makkah", "mecca"].includes(h.city?.toLowerCase()));
//     const madina = (pkg.hotels || []).filter(h => ["madinah", "madina", "medina"].includes(h.city?.toLowerCase()));

//     const hotelLine = [
//       ...makkah.map(h => `Makkah: ${h.name}`),
//       ...madina.map(h => `Madina: ${h.name}`)
//     ].join("\n");

//     // Schedule Text
//     const scheduleLine = (pkg.flights || []).map(f => {
//       const code = pkg.airline?.airlineCode ? `${pkg.airline.airlineCode} ` : "";
//       return `${code}${formatScheduleDate(f.depDate)} ${f.sectorFrom}-${f.sectorTo} ${f.depTime || ''} ${f.arrTime || ''}`;
//     }).join("\n");

//     // Luggage Text
//     const luggageLine = (pkg.flights || []).map(f => f.baggage || "-").join("\n");

//     // Prices
//     const prices = roomColumns.map(col => fmt(getRoomPrice(pkg, col)));

//     return [hotelLine, scheduleLine, luggageLine, ...prices];
//   });

//   autoTable(doc, {
//     startY: yPos,
//     head: head,
//     body: body,
//     theme: "grid",
//     headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99], fontStyle: "bold" },
//     styles: { fontSize: 8, cellPadding: 3, valign: "top" },
//     columnStyles: {
//       0: { cellWidth: 60 },
//       1: { cellWidth: 60 },
//       2: { cellWidth: 25 },
//     }
//   });

//   // Footer
//   const pageCount = doc.internal.getNumberOfPages();
//   for (let i = 1; i <= pageCount; i++) {
//     doc.setPage(i);
//     doc.setFontSize(8);
//     doc.setTextColor(150);
//     doc.text(`Generated on ${new Date().toLocaleDateString()} - Abid Air Travel & Tours`, 15, doc.internal.pageSize.getHeight() - 10);
//   }

//   doc.save(`${headerPkg.airlineName}_${headerPkg.sector}_Packages.pdf`);
// };

// // Function to format date
// const formatDate = (date) => {
//   if (!date) return "N/A";
//   const d = new Date(date);
//   return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
// };

// // Premium Muted Tones for Room Cards
// const getRoomColor = (roomType) => {
//   const colors = {
//     double: {
//       bg: [255, 251, 235],
//       text: [146, 64, 14],
//       border: [254, 243, 199],
//     },
//     triple: {
//       bg: [240, 253, 244],
//       text: [22, 101, 52],
//       border: [187, 247, 208],
//     },
//     quad: {
//       bg: [250, 245, 255],
//       text: [107, 33, 168],
//       border: [233, 213, 255],
//     },
//     quint: {
//       bg: [254, 242, 242],
//       text: [153, 27, 27],
//       border: [254, 226, 226],
//     },
//     sharing: {
//       bg: [240, 249, 255],
//       text: [7, 89, 133],
//       border: [186, 230, 253],
//     },
//   };
//   return (
//     colors[roomType] || {
//       bg: [249, 250, 251],
//       text: [31, 41, 55],
//       border: [229, 231, 255],
//     }
//   );
// };

// export const generateUmrahPackagesPDF = async (packages, userInfo = null) => {
//   return new Promise((resolve, reject) => {
//     try {
//       const doc = new jsPDF("p", "mm", "a4");
//       const pageWidth = doc.internal.pageSize.getWidth();
//       const pageHeight = doc.internal.pageSize.getHeight();

//       // Image verification to prevent crashes
//       const img = new Image();
//       img.src = logo;

//       img.onload = () => {
//         renderPDFContent(
//           doc,
//           packages,
//           pageWidth,
//           pageHeight,
//           img,
//           resolve,
//           reject,
//         );
//       };

//       img.onerror = () => {
//         console.warn("Logo failed to load. Generating PDF without logo.");
//         renderPDFContent(
//           doc,
//           packages,
//           pageWidth,
//           pageHeight,
//           null,
//           resolve,
//           reject,
//         );
//       };
//     } catch (error) {
//       console.error("PDF Core Error:", error);
//       reject(error);
//     }
//   });
// };

// // Internal function to draw content and save file securely
// const renderPDFContent = (
//   doc,
//   packages,
//   pageWidth,
//   pageHeight,
//   logoImg,
//   resolve,
//   reject,
// ) => {
//   try {
//     let yPosition = 15;

//     const checkPageBreak = (neededSpace) => {
//       if (yPosition + neededSpace > pageHeight - 15) {
//         doc.addPage();
//         yPosition = 15;
//         return true;
//       }
//       return false;
//     };

//     // ========== BRAND HEADER ==========
//     doc.setFillColor(22, 78, 99);
//     doc.rect(0, 0, pageWidth, 12, "F");
//     yPosition = 22;

//     // Logo injection only if valid
//     if (logoImg) {
//       doc.addImage(logoImg, "PNG", 15, yPosition - 5, 12, 12);
//     }

//     doc.setFont("helvetica", "bold");
//     doc.setFontSize(16);
//     doc.setTextColor(22, 78, 99);
//     doc.text("Abid Air Travel & Tours", 30, yPosition);

//     doc.setFontSize(9);
//     doc.setFont("helvetica", "normal");
//     doc.setTextColor(100, 116, 139);
//     doc.text("Special Umrah Offers", 30, yPosition + 4);

//     // Top Stats
//     doc.setFontSize(8);
//     doc.text(`Total Packages: ${packages.length}`, pageWidth - 50, yPosition);
//     doc.text(
//       `Date: ${new Date().toLocaleDateString()}`,
//       pageWidth - 50,
//       yPosition + 4,
//     );

//     yPosition += 12;

//     // ========== PACKAGES LOOP ==========
//     packages.forEach((pkg, index) => {
//       checkPageBreak(60);

//       doc.setDrawColor(226, 232, 240);
//       doc.setLineWidth(0.2);
//       const boxStartY = yPosition;

//       // Header Line Title
//       doc.setFontSize(10);
//       doc.setFont("helvetica", "bold");
//       doc.setTextColor(15, 23, 42);
//       doc.text(
//         `${index + 1}. ${pkg.packageName || "Umrah Package"}`,
//         17,
//         yPosition + 5,
//       );

//       // --- AVAILABLE ROOMS DISPLAY ---
//       const availRooms =
//         pkg.availableRooms !== undefined ? pkg.availableRooms : 0;
//       doc.setFontSize(7.5);
//       if (availRooms > 2) {
//         doc.setTextColor(22, 101, 52);
//       } else {
//         doc.setTextColor(153, 27, 27);
//       }
//       doc.setFont("helvetica", "bold");
//       doc.text(`Available: ${availRooms}`, pageWidth - 60, yPosition + 5, {
//         align: "right",
//       });

//       // Duration Info
//       doc.setFontSize(7.5);
//       doc.setTextColor(100, 116, 139);
//       doc.setFont("helvetica", "normal");
//       const durationText = `${pkg.packageDuration || "21"} DAYS / ${parseInt(pkg.packageDuration) - 1 || "20"} NIGHTS`;
//       doc.text(durationText, pageWidth - 17, yPosition + 5, { align: "right" });

//       yPosition += 8;

//       // Details Tables (Flight & Hotel Side-by-Side)
//       const tableWidth = (pageWidth - 34) / 2;

//       // FLIGHT TABLE (Left)
//       autoTable(doc, {
//         startY: yPosition,
//         head: [["Flight", "Route", "Date"]],
//         body: (pkg.flights || []).slice(0, 2).map((f) => [
//           f.flightNo || "-",
//           `${f.sectorFrom || ""} -------------------------------------------------------> ${f.sectorTo || ""}`, // Clean arrow injection
//           formatDate(f.depDate),
//         ]),
//         margin: { left: 15 },
//         tableWidth: tableWidth,
//         theme: "grid",
//         styles: { fontSize: 7, cellPadding: 1.5 },
//         headStyles: { fillColor: [51, 65, 85] },
//       });

//       // HOTEL TABLE (Right)
//       autoTable(doc, {
//         startY: yPosition,
//         head: [["Hotel", "City"]],
//         body: (pkg.hotels || [])
//           .slice(0, 2)
//           .map((h) => [
//             h.name || "Standard",
//             h.city || "-",
//           ]),
//         margin: { left: 15 + tableWidth + 4 },
//         tableWidth: tableWidth,
//         theme: "grid",
//         styles: { fontSize: 7, cellPadding: 1.5 },
//         headStyles: { fillColor: [71, 85, 105] },
//       });

//       yPosition = doc.lastAutoTable.finalY + 4;

//       // ========== ROOM PRICING DATA ==========
//       const totals = pkg.packageTotals || {};
//       const roomsFallback = pkg.rooms || {};

//       const getRoomPrice = (type) => {
//         if (type === "sharing") {
//           return totals.shared || roomsFallback.sharing || 0;
//         }
//         return totals[type] || roomsFallback[type] || 0;
//       };

//       const targetRoomTypes = ["double", "triple", "quad", "quint", "sharing"];
//       const activeRooms = targetRoomTypes.filter(
//         (room) => getRoomPrice(room) > 0,
//       );

//       if (activeRooms.length > 0) {
//         let xPos = 15;
//         const cardWidth = (pageWidth - 30) / Math.max(activeRooms.length, 5);

//         activeRooms.forEach((roomType) => {
//           const price = getRoomPrice(roomType);
//           const color = getRoomColor(roomType);

//           doc.setFillColor(color.bg[0], color.bg[1], color.bg[2]);
//           doc.roundedRect(xPos, yPosition, cardWidth - 2, 10, 1, 1, "F");

//           doc.setDrawColor(color.border[0], color.border[1], color.border[2]);
//           doc.roundedRect(xPos, yPosition, cardWidth - 2, 10, 1, 1, "S");

//           doc.setFontSize(6);
//           doc.setTextColor(color.text[0], color.text[1], color.text[2]);
//           doc.setFont("helvetica", "bold");
//           doc.text(roomType.toUpperCase(), xPos + 2, yPosition + 3.5);

//           doc.setFontSize(7.5);
//           doc.text(
//             `${Number(price).toLocaleString()}`,
//             xPos + 2,
//             yPosition + 8,
//           );

//           xPos += cardWidth;
//         });
//         yPosition += 14;
//       } else {
//         yPosition += 4;
//       }

//       // Main Outer Border Layout
//       doc.setDrawColor(226, 232, 240);
//       doc.rect(15, boxStartY, pageWidth - 30, yPosition - boxStartY);
//       yPosition += 6;
//     });

//     // ========== GLOBAL FOOTER SYSTEM ==========
//     const pageCount = doc.internal.getNumberOfPages();
//     for (let i = 1; i <= pageCount; i++) {
//       doc.setPage(i);
//       doc.setFontSize(7);
//       doc.setTextColor(148, 163, 184);
//       doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12);
//       doc.text(
//         "Abid Air Travel & Tours | Premium Service | All Rights Reserved",
//         pageWidth / 2,
//         pageHeight - 8,
//         { align: "center" },
//       );
//       doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, pageHeight - 8);
//     }

//     // --- CRITICAL FIX: FORCE DOWNLOAD NOW ---
//     doc.save("Abid Air Travel & Tours_Umrah_Offers.pdf");
//     resolve(true);
//   } catch (err) {
//     console.error("Error drawing elements:", err);
//     reject(err);
//   }
// };
