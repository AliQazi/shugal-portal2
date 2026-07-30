import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../assets/images/logo.png";

// Function to format date
const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Premium Muted Tones for Room Cards
const getRoomColor = (roomType) => {
  const colors = {
    double: {
      bg: [255, 251, 235],
      text: [146, 64, 14],
      border: [254, 243, 199],
    },
    triple: {
      bg: [240, 253, 244],
      text: [22, 101, 52],
      border: [187, 247, 208],
    },
    quad: {
      bg: [250, 245, 255],
      text: [107, 33, 168],
      border: [233, 213, 255],
    },
    quint: {
      bg: [254, 242, 242],
      text: [153, 27, 27],
      border: [254, 226, 226],
    },
    sharing: {
      bg: [240, 249, 255],
      text: [7, 89, 133],
      border: [186, 230, 253],
    },
  };
  return (
    colors[roomType] || {
      bg: [249, 250, 251],
      text: [31, 41, 55],
      border: [229, 231, 255],
    }
  );
};

export const generateUmrahPackagesPDF = async (packages, userInfo = null) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Image verification to prevent crashes
      const img = new Image();
      img.src = logo;

      img.onload = () => {
        renderPDFContent(
          doc,
          packages,
          pageWidth,
          pageHeight,
          img,
          resolve,
          reject,
        );
      };

      img.onerror = () => {
        console.warn("Logo failed to load. Generating PDF without logo.");
        renderPDFContent(
          doc,
          packages,
          pageWidth,
          pageHeight,
          null,
          resolve,
          reject,
        );
      };
    } catch (error) {
      console.error("PDF Core Error:", error);
      reject(error);
    }
  });
};

// Internal function to draw content and save file securely
const renderPDFContent = (
  doc,
  packages,
  pageWidth,
  pageHeight,
  logoImg,
  resolve,
  reject,
) => {
  try {
    let yPosition = 15;

    const checkPageBreak = (neededSpace) => {
      if (yPosition + neededSpace > pageHeight - 15) {
        doc.addPage();
        yPosition = 15;
        return true;
      }
      return false;
    };

    // ========== BRAND HEADER ==========
    doc.setFillColor(22, 78, 99);
    doc.rect(0, 0, pageWidth, 12, "F");
    yPosition = 22;

    // Logo injection only if valid
    if (logoImg) {
      doc.addImage(logoImg, "PNG", 15, yPosition - 5, 12, 12);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(22, 78, 99);
    doc.text("Abid Air", 30, yPosition);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Special Umrah Offers", 30, yPosition + 4);

    // Top Stats
    doc.setFontSize(8);
    doc.text(`Total Packages: ${packages.length}`, pageWidth - 50, yPosition);
    doc.text(
      `Date: ${new Date().toLocaleDateString()}`,
      pageWidth - 50,
      yPosition + 4,
    );

    yPosition += 12;

    // ========== PACKAGES LOOP ==========
    packages.forEach((pkg, index) => {
      checkPageBreak(60);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      const boxStartY = yPosition;

      // Header Line Title
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(
        `${index + 1}. ${pkg.packageName || "Umrah Package"}`,
        17,
        yPosition + 5,
      );

      // --- AVAILABLE ROOMS DISPLAY ---
      const availRooms =
        pkg.availableRooms !== undefined ? pkg.availableRooms : 0;
      doc.setFontSize(7.5);
      if (availRooms > 2) {
        doc.setTextColor(22, 101, 52);
      } else {
        doc.setTextColor(153, 27, 27);
      }
      doc.setFont("helvetica", "bold");
      doc.text(`Available: ${availRooms}`, pageWidth - 60, yPosition + 5, {
        align: "right",
      });

      // Duration Info
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      const durationText = `${pkg.packageDuration || "21"} DAYS / ${parseInt(pkg.packageDuration) - 1 || "20"} NIGHTS`;
      doc.text(durationText, pageWidth - 17, yPosition + 5, { align: "right" });

      yPosition += 8;

      // Details Tables (Flight & Hotel Side-by-Side)
      const tableWidth = (pageWidth - 34) / 2;

      // FLIGHT TABLE (Left)
      autoTable(doc, {
        startY: yPosition,
        head: [["Flight", "Route", "Date"]],
        body: (pkg.flights || []).slice(0, 2).map((f) => [
          f.flightNo || "-",
          `${f.sectorFrom || ""} -------------------------------------------------------> ${f.sectorTo || ""}`, // Clean arrow injection
          formatDate(f.depDate),
        ]),
        margin: { left: 15 },
        tableWidth: tableWidth,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [51, 65, 85] },
      });

      // HOTEL TABLE (Right)
      autoTable(doc, {
        startY: yPosition,
        head: [["Hotel", "City", "Dist."]],
        body: (pkg.hotels || [])
          .slice(0, 2)
          .map((h) => [
            h.name || "Standard",
            h.city || "-",
            h.distance ? `${h.distance}m` : "-",
          ]),
        margin: { left: 15 + tableWidth + 4 },
        tableWidth: tableWidth,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [71, 85, 105] },
      });

      yPosition = doc.lastAutoTable.finalY + 4;

      // ========== ROOM PRICING DATA ==========
      const totals = pkg.packageTotals || {};
      const roomsFallback = pkg.rooms || {};

      const getRoomPrice = (type) => {
        if (type === "sharing") {
          return totals.shared || roomsFallback.sharing || 0;
        }
        return totals[type] || roomsFallback[type] || 0;
      };

      const targetRoomTypes = ["double", "triple", "quad", "quint", "sharing"];
      const activeRooms = targetRoomTypes.filter(
        (room) => getRoomPrice(room) > 0,
      );

      if (activeRooms.length > 0) {
        let xPos = 15;
        const cardWidth = (pageWidth - 30) / Math.max(activeRooms.length, 5);

        activeRooms.forEach((roomType) => {
          const price = getRoomPrice(roomType);
          const color = getRoomColor(roomType);

          doc.setFillColor(color.bg[0], color.bg[1], color.bg[2]);
          doc.roundedRect(xPos, yPosition, cardWidth - 2, 10, 1, 1, "F");

          doc.setDrawColor(color.border[0], color.border[1], color.border[2]);
          doc.roundedRect(xPos, yPosition, cardWidth - 2, 10, 1, 1, "S");

          doc.setFontSize(6);
          doc.setTextColor(color.text[0], color.text[1], color.text[2]);
          doc.setFont("helvetica", "bold");
          doc.text(roomType.toUpperCase(), xPos + 2, yPosition + 3.5);

          doc.setFontSize(7.5);
          doc.text(
            `${Number(price).toLocaleString()}`,
            xPos + 2,
            yPosition + 8,
          );

          xPos += cardWidth;
        });
        yPosition += 14;
      } else {
        yPosition += 4;
      }

      // Main Outer Border Layout
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, boxStartY, pageWidth - 30, yPosition - boxStartY);
      yPosition += 6;
    });

    // ========== GLOBAL FOOTER SYSTEM ==========
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12);
      doc.text(
        "Abid Air | Premium Service | All Rights Reserved",
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" },
      );
      doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, pageHeight - 8);
    }

    // --- CRITICAL FIX: FORCE DOWNLOAD NOW ---
    doc.save("Abid Air_Umrah_Offers.pdf");
    resolve(true);
  } catch (err) {
    console.error("Error drawing elements:", err);
    reject(err);
  }
};
