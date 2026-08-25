import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// @ts-ignore - Ignore error if your build system handles image imports naturally
import logo from "../assets/images/logo.png";

// ==========================================
// TYPE DEFINITIONS & INTERFACES
// ==========================================

export interface Flight {
  flightNo?: string;
  sectorFrom?: string;
  sectorTo?: string;
  depDate?: string | Date;
}

export interface Hotel {
  name?: string;
  city?: string;
}

export interface PackageTotals {
  shared?: number;
  double?: number;
  triple?: number;
  quad?: number;
  quint?: number;
  [key: string]: number | undefined; // Index signature for dynamic lookup
}

export interface RoomFallback {
  sharing?: number;
  double?: number;
  triple?: number;
  quad?: number;
  quint?: number;
  [key: string]: number | undefined; // Index signature for dynamic lookup
}

export interface UmrahPackage {
  packageName?: string;
  logo?: string;
  availableRooms?: number;
  seatSummary?: {
    total?: number;
    requested?: number;
    confirmed?: number;
    cancelled?: number;
    remaining?: number;
  };
  packageDuration?: string | number;
  flights?: Flight[];
  hotels?: Hotel[];
  packageTotals?: PackageTotals;
  rooms?: RoomFallback;
}

export interface UserInfo {
  name?: string;
  email?: string;
  [key: string]: any;
}

export type RoomType = "double" | "triple" | "quad" | "quint" | "sharing";

// Extend jsPDF instance type safely for autotable metadata
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Function to format date
const formatDate = (date: string | Date | undefined): string => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "N/A"; // Handle invalid dates safely
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// ==========================================
// CORE PDF GENERATION EXPORT
// ==========================================

// Helper to load an image from a URL (or import path) safely
const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

export const generateUmrahPackagesPDF = async (
  packages: UmrahPackage[],
): Promise<boolean> => {
  try {
    // Preload company logo and all package logos in parallel
    const [brandLogoImg, ...packageLogoImgs] = await Promise.all([
      loadImage(logo as string),
      ...packages.map((pkg) =>
        pkg.logo ? loadImage(pkg.logo) : Promise.resolve(null),
      ),
    ]);

    const doc = new jsPDF("p", "mm", "a4") as ExtendedJsPDF;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    renderPDFContent(
      doc,
      packages,
      pageWidth,
      pageHeight,
      brandLogoImg,
      packageLogoImgs,
    );
    return true;
  } catch (error) {
    console.error("PDF Core Error:", error);
    throw error;
  }
};

// Internal function to draw content and save file securely
const renderPDFContent = (
  doc: ExtendedJsPDF,
  packages: UmrahPackage[],
  pageWidth: number,
  pageHeight: number,
  logoImg: HTMLImageElement | null,
  packageLogoImgs: (HTMLImageElement | null)[],
): void => {
  try {
    let yPosition = 15;

    const checkPageBreak = (neededSpace: number): boolean => {
      if (yPosition + neededSpace > pageHeight - 15) {
        doc.addPage();
        yPosition = 15;
        return true;
      }
      return false;
    };

    // ========== BRAND HEADER ==========
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 22, "F");
    yPosition = 14;

    // Logo injection only if valid
    if (logoImg) {
      doc.addImage(logoImg, "PNG", 15, 5, 12, 12);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("Abid Air Travel & Tours", 30, 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text("Special Umrah Offers", 30, 17);

    // Top Stats
    doc.setFontSize(8);
    doc.text(`Total Packages: ${packages.length}`, pageWidth - 15, 10, {
      align: "right",
    });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, 15, {
      align: "right",
    });

    yPosition = 30;

    // ========== PACKAGES LOOP ==========
    packages.forEach((pkg, index) => {
      checkPageBreak(80);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      const boxStartY = yPosition;

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, yPosition, pageWidth - 30, 15, 1.5, 1.5, "F");

      // Package logo (airline logo) — draw inside header box
      const pkgLogo = packageLogoImgs[index];
      let headerTextX = 17;
      if (pkgLogo) {
        try {
          doc.addImage(pkgLogo, "PNG", 17, yPosition + 2.5, 10, 10);
          headerTextX = 30;
        } catch (_) {
          // ignore draw errors, fall back to text-only
        }
      }

      // Header Line Title
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(
        `${index + 1}. ${pkg.packageName || "Umrah Package"}`,
        headerTextX,
        yPosition + 9,
      );

      const seatSummary = {
        total: Number(pkg.seatSummary?.total ?? pkg.availableRooms ?? 0),
        requested: Number(pkg.seatSummary?.requested ?? 0),
        confirmed: Number(pkg.seatSummary?.confirmed ?? 0),
        cancelled: Number(pkg.seatSummary?.cancelled ?? 0),
        remaining: Number(
          pkg.seatSummary?.remaining ?? pkg.availableRooms ?? 0,
        ),
      };
      doc.setFontSize(7.5);
      if (seatSummary.remaining > 2) {
        doc.setTextColor(22, 101, 52);
      } else {
        doc.setTextColor(153, 27, 27);
      }
      doc.setFont("helvetica", "bold");
      doc.text(
        `Remaining: ${seatSummary.remaining}`,
        pageWidth - 60,
        yPosition + 9,
        {
          align: "right",
        },
      );

      // Duration Info
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");

      const durationDays = parseInt(String(pkg.packageDuration)) || 21;
      const durationText = `${durationDays} DAYS / ${durationDays - 1} NIGHTS`;
      doc.text(durationText, pageWidth - 17, yPosition + 9, { align: "right" });

      yPosition += 18;

      // Details Tables (Flight & Hotel Side-by-Side)
      const tableWidth = (pageWidth - 34) / 2;
      const flightRows =
        pkg.flights && pkg.flights.length > 0
          ? pkg.flights.map((f) => [
              f.flightNo || "-",
              `${f.sectorFrom || "-"} to ${f.sectorTo || "-"}`,
              formatDate(f.depDate),
            ])
          : [["-", "-", "-"]];

      const hotelRows =
        pkg.hotels && pkg.hotels.length > 0
          ? pkg.hotels.map((h) => [
              h.name || "Standard",
              h.city || "-",
            ])
          : [["Standard", "-"]];

      // FLIGHT TABLE (Left)
      autoTable(doc, {
        startY: yPosition,
        head: [["Flight", "Route", "Date"]],
        body: flightRows,
        margin: { left: 15 },
        tableWidth: tableWidth,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { fillColor: [51, 65, 85], fontStyle: "bold" },
      });

      // HOTEL TABLE (Right)
      autoTable(doc, {
        startY: yPosition,
        head: [["Hotel", "City"]],
        body: hotelRows,
        margin: { left: 15 + tableWidth + 4 },
        tableWidth: tableWidth,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { fillColor: [71, 85, 105], fontStyle: "bold" },
      });

      yPosition = doc.lastAutoTable.finalY + 4;

      // ========== ROOM PRICING DATA ==========
      const totals = pkg.packageTotals || {};
      const roomsFallback = pkg.rooms || {};

      const getRoomPrice = (type: string): number => {
        if (type === "sharing") {
          return totals.shared || roomsFallback.sharing || 0;
        }
        return totals[type] || roomsFallback[type] || 0;
      };

      const targetRoomTypes: RoomType[] = [
        "double",
        "triple",
        "quad",
        "quint",
        "sharing",
      ];
      const activeRooms = targetRoomTypes.filter(
        (room) => getRoomPrice(room) > 0,
      );

      if (activeRooms.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [activeRooms.map((roomType) => roomType.toUpperCase())],
          body: [
            activeRooms.map((roomType) =>
              Number(getRoomPrice(roomType)).toLocaleString("en-PK"),
            ),
          ],
          margin: { left: 15 },
          tableWidth: pageWidth - 30,
          theme: "grid",
          styles: {
            fontSize: 8,
            cellPadding: 2,
            halign: "center",
            fontStyle: "bold",
          },
          headStyles: {
            fillColor: [240, 249, 255],
            textColor: [7, 89, 133],
            fontStyle: "bold",
          },
          bodyStyles: {
            textColor: [22, 101, 52],
          },
        });
        yPosition = doc.lastAutoTable.finalY + 6;
      } else {
        yPosition += 4;
      }

      // Main Outer Border Layout
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(
        15,
        boxStartY,
        pageWidth - 30,
        yPosition - boxStartY,
        1.5,
        1.5,
      );
      yPosition += 6;
    });

    // ========== GLOBAL FOOTER SYSTEM ==========
    const pageCount = doc.getNumberOfPages(); // <-- FIX: Removed .internal
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12);
      doc.text(
        "Abid Air Travel & Tours | Premium Service | All Rights Reserved",
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" },
      );
      doc.text(`Page ${i} / ${pageCount}`, pageWidth - 20, pageHeight - 8);
    }

    doc.save("Abid Air Travel & Tours_Umrah_Offers.pdf");
  } catch (err) {
    console.error("Error drawing elements:", err);
    throw err;
  }
};
