import { useEffect, useState } from "react";
import { useParams } from "react-router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axiosInstance from "../../Api/axios";
import PageMeta from "../../components/common/PageMeta";
import { getAllBookings } from "../../Api/bookingApi";
import { getAllBookingsAdmin } from "../../Api/umrahBookingApi";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

// ==================== TYPES ====================
interface FlattenedPassenger {
  title: string;
  surName: string;
  givenName: string;
  type: string;
  pnr: string;
  passport: string;
  dob: string;
  expiry: string;
  agency: string;
}

interface Passenger {
  _id?: string;
  title?: string;
  surName?: string;
  givenName?: string;
  type?: string;
  passport?: string;
  dateOfBirth?: string;
  passportExpiry?: string;
}

interface Flight {
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
  sectorFrom: string;
  sectorTo: string;
  airline: string;
  flightNo: string;
}

interface Booking {
  _id: string;
  bookingReference: string;
  groupId?: string;
  departureDate: string;
  arrivalDate?: string;
  pnr?: string;
  status: string;
  contactAgency?: {
    name?: string;
    companyName?: string;
  };
  userId?:
    | string
    | {
        name?: string;
        companyName?: string;
      };
  passengers?: Passenger[];
  refundedPassengerIndices?: number[];
  flights?: Flight[];
  createdAt: string;
}

interface GroupResponse {
  _id: string;
  groupName: string;
  pnr?: string;
  flights: Flight[];
  groupType: string;
  totalSeats: number;
}

interface UmrahPackageBooking {
  _id: string;
  bookingNumber: string;
  packageName: string;
  packageId?: {
    selectedGroupTicketId?: string;
    flights?: Flight[];
  };
  passengers?: Passenger[];
  user?: {
    name?: string;
    companyName?: string;
  };
  overallStatus: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ==================== COMPONENT ====================
export default function GroupPassengerList() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const canView = hasPermission(user, "view_groups");

  const [passengers, setPassengers] = useState<FlattenedPassenger[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const formatDate = (val?: string): string => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPassengerDate = (val?: string): string => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isBookingCancelled = (status?: string): boolean => {
    if (!status) return false;
    const normalized = status.toLowerCase();
    return normalized === "cancelled" || normalized === "canceled";
  };

  const isBookingOnHold = (status?: string): boolean => {
    if (!status) return false;
    return status.toLowerCase() === "on hold";
  };

  const isPassengerRefunded = (index: number, refundedIndices: number[]): boolean => {
    return new Set(refundedIndices.map(Number)).has(index);
  };

  const getAgencyName = (booking: Booking): string => {
    const contactAgency = booking.contactAgency?.companyName || booking.contactAgency?.name;
    const populatedUser = typeof booking.userId === "object" ? booking.userId : null;

    return contactAgency || populatedUser?.companyName || populatedUser?.name || "N/A";
  };

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      if (!groupId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const groupRes = await axiosInstance.get<ApiResponse<GroupResponse>>(`/group-ticketing/${groupId}`);
        const group = groupRes.data.data;
        setGroupInfo(group);

        const groupDepDate = new Date(group.flights[0]?.depDate);
        groupDepDate.setHours(0, 0, 0, 0);

        const [groupBookingRes, umrahBookingRes] = await Promise.all([
          getAllBookings({ limit: 2000 }),
          getAllBookingsAdmin(),
        ]);

        const masterList: FlattenedPassenger[] = [];

        if (groupBookingRes.success && Array.isArray(groupBookingRes.data)) {
          const filtered = (groupBookingRes.data as Booking[]).filter((booking) => {
            if (isBookingCancelled(booking.status) || isBookingOnHold(booking.status)) return false;
            if (booking.groupId) return booking.groupId === group._id;
            const bDate = new Date(booking.departureDate);
            bDate.setHours(0, 0, 0, 0);
            return bDate.getTime() === groupDepDate.getTime();
          });

          filtered.forEach((booking) => {
            const agency = getAgencyName(booking);
            const refundedIndices = booking.refundedPassengerIndices || [];
            const isConfirmed = (booking.status || "").toLowerCase() === "confirmed";

            (booking.passengers || []).forEach((passenger, idx) => {
              // Preserve the refund record, but include passengers
              // reactivated by the booking's latest Confirmed status.
              if (!isConfirmed && isPassengerRefunded(idx, refundedIndices)) return;

              masterList.push({
                title: passenger.title || "",
                surName: passenger.surName || "",
                givenName: passenger.givenName || "",
                type: passenger.type || "",
                pnr: booking.pnr || group.pnr || "N/A",
                passport: passenger.passport || "N/A",
                dob: formatPassengerDate(passenger.dateOfBirth),
                expiry: formatPassengerDate(passenger.passportExpiry),
                agency,
              });
            });
          });
        }

        if (umrahBookingRes.success && Array.isArray(umrahBookingRes.data)) {
          const filteredUmrah = (umrahBookingRes.data as UmrahPackageBooking[]).filter((booking) => {
            if (isBookingCancelled(booking.overallStatus) || isBookingOnHold(booking.overallStatus)) return false;
            return booking.packageId?.selectedGroupTicketId === group._id;
          });

          filteredUmrah.forEach((booking) => {
            const agency = booking.user?.companyName || booking.user?.name || "N/A";

            (booking.passengers || []).forEach((passenger) => {
              masterList.push({
                title: passenger.title || "",
                surName: passenger.surName || "",
                givenName: passenger.givenName || "",
                type: passenger.type || "",
                pnr: group.pnr || "N/A",
                passport: passenger.passport || "N/A",
                dob: formatPassengerDate(passenger.dateOfBirth),
                expiry: formatPassengerDate(passenger.passportExpiry),
                agency,
              });
            });
          });
        }

        setPassengers(masterList);
      } catch (err) {
        console.error("Error fetching group data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId, canView]);

  const filteredData = passengers.filter(
    (p) => !search || JSON.stringify(p).toLowerCase().includes(search.toLowerCase()),
  );

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text(`Passenger List - ${groupInfo?.groupName || "Group"}`, 40, 35);
    doc.setFontSize(10);
    doc.text(`Departure: ${formatDate(groupInfo?.flights[0]?.depDate)}`, 40, 50);

    autoTable(doc, {
      startY: 65,
      head: [["SR #", "TITLE", "SNAME", "GNAME", "TYPE", "PNR", "PASSPORT", "DOB", "EXPIRY DATE", "AGENCY"]],
      body: filteredData.map((p, i) => [
        String(i + 1),
        p.title,
        p.surName.toUpperCase(),
        p.givenName.toUpperCase(),
        p.type,
        p.pnr,
        p.passport,
        p.dob,
        p.expiry,
        p.agency,
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    });
    doc.save(`PassengerList_${groupInfo?.groupName || "Group"}.pdf`);
  };

  const handleExportExcel = () => {
    const escapeXml = (value: string | number): string =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const headers = ["SR #", "TITLE", "SNAME", "GNAME", "TYPE", "PNR", "PASSPORT", "DOB", "EXPIRY DATE", "AGENCY"];
    const rows = filteredData.map((passenger, index) => [
      index + 1,
      passenger.title,
      passenger.surName.toUpperCase(),
      passenger.givenName.toUpperCase(),
      passenger.type,
      passenger.pnr,
      passenger.passport,
      passenger.dob,
      passenger.expiry,
      passenger.agency,
    ]);
    const createRow = (values: (string | number)[], styleId?: string) =>
      `<Row>${values
        .map(
          (value) =>
            `<Cell${styleId ? ` ss:StyleID="${styleId}"` : ""}><Data ss:Type="${
              typeof value === "number" ? "Number" : "String"
            }">${escapeXml(value)}</Data></Cell>`,
        )
        .join("")}</Row>`;
    const worksheetName = (groupInfo?.groupName || "Passengers").replace(/[\\/:*?[\]]/g, " ").slice(0, 31);
    const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#F0F0F0" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14"/></Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(worksheetName)}">
  <Table>
   <Row><Cell ss:StyleID="Title" ss:MergeAcross="9"><Data ss:Type="String">${escapeXml(
     `Passenger List - ${groupInfo?.groupName || "Group"}`,
   )}</Data></Cell></Row>
   <Row><Cell ss:MergeAcross="9"><Data ss:Type="String">${escapeXml(
     `Departure: ${formatDate(groupInfo?.flights[0]?.depDate)}`,
   )}</Data></Cell></Row>
   <Row/>
   ${createRow(headers, "Header")}
   ${rows.map((row) => createRow(row)).join("\n   ")}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeGroupName = (groupInfo?.groupName || "Group").replace(/[^a-z0-9_-]+/gi, "_");
    link.href = url;
    link.download = `PassengerList_${safeGroupName}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!canView) {
    return (
      <>
        <PageMeta title="Passenger List - Access denied" description="Access denied" />
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
          You do not have permission to view Groups.
        </div>
      </>
    );
  }

  if (loading) {
    return <div className="p-10 text-center font-bold">Loading List...</div>;
  }

  return (
    <div className="min-h-screen text-black">
      <PageMeta title="Group Passenger List" description="Passenger list for a group's bookings" />

      <style>{`
                @media print {
                    /* 1. Hide global layout elements like header, navbar, sidebar, and footer */
                    header, nav, footer, .navbar, .sidebar, .header {
                        display: none !important;
                    }

                    /* 2. Reset layout restrictions to stop empty overflow trailing pages */
                    html, body, .min-h-screen {
                        background-color: white !important;
                        height: auto !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* 3. Strip styles off the print container so it adopts clean margins */
                    .print-container {
                        border: none !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }

                    /* 4. Hide interactive tools like the buttons and search bar */
                    .no-print {
                        display: none !important;
                    }

                    /* 5. Set precise data structure properties across multi-page breaks */
                    table {
                        width: 100% !important;
                        font-size: 10px !important;
                        border-collapse: collapse !important;
                        page-break-inside: auto;
                    }
                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    th, td {
                        border: 1px solid #000 !important;
                        padding: 6px !important;
                    }
                    th {
                        background-color: #f3f4f6 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    @page {
                        size: landscape;
                        margin: 10mm;
                    }
                }
            `}</style>

      <div className="print-container bg-white rounded border border-gray-300 shadow-sm p-6">
        {/* TOP BAR */}
        <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex bg-gray-600 rounded overflow-hidden">
            <button onClick={handleExportPdf} className="px-4 py-2 text-white hover:bg-gray-700 text-sm border-r border-gray-500">
              PDF
            </button>
            <button onClick={handleExportExcel} className="px-4 py-2 text-white hover:bg-gray-700 text-sm border-r border-gray-500">
              Excel
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 text-white hover:bg-gray-700 text-sm">
              Print
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Search:</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-400 rounded h-9 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <h1 className="text-lg font-bold">Passenger List: {groupInfo?.groupName}</h1>
          <h1>
            <strong>Departure:</strong> {formatDate(groupInfo?.flights[0]?.depDate)}
          </h1>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-[11px] font-bold uppercase">
                <th className="border border-gray-300 p-2">Sr #</th>
                <th className="border border-gray-300 p-2">Title</th>
                <th className="border border-gray-300 p-2">Sname</th>
                <th className="border border-gray-300 p-2">Gname</th>
                <th className="border border-gray-300 p-2">Type</th>
                <th className="border border-gray-300 p-2">PNR</th>
                <th className="border border-gray-300 p-2">Passport</th>
                <th className="border border-gray-300 p-2">DOB</th>
                <th className="border border-gray-300 p-2">Expiry Date</th>
                <th className="border border-gray-300 p-2">Agency</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="border border-gray-300 p-4 text-center text-gray-500">
                    No passengers found
                  </td>
                </tr>
              ) : (
                filteredData.map((p, i) => (
                  <tr key={i} className="text-[11px] hover:bg-gray-50">
                    <td className="border border-gray-300 p-2">{i + 1}</td>
                    <td className="border border-gray-300 p-2">{p.title}</td>
                    <td className="border border-gray-300 p-2 uppercase font-semibold">{p.surName}</td>
                    <td className="border border-gray-300 p-2 uppercase font-semibold">{p.givenName}</td>
                    <td className="border border-gray-300 p-2">{p.type}</td>
                    <td className="border border-gray-300 p-2 font-mono">{p.pnr}</td>
                    <td className="border border-gray-300 p-2 font-mono">{p.passport}</td>
                    <td className="border border-gray-300 p-2 whitespace-nowrap">{p.dob}</td>
                    <td className="border border-gray-300 p-2 whitespace-nowrap">{p.expiry}</td>
                    <td className="border border-gray-300 p-2 text-gray-700">{p.agency}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
