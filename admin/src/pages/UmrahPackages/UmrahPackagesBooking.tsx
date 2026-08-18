import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { toast } from "react-toastify";
import {
    getAllBookingsAdmin,
    reviewPayment,
    updateVisaStatus,
    updateHotelStatus,
    updateOverallStatus,
    extendUmrahBookingHold,
    savePassengerDiscounts,
} from "../../Api/umrahBookingApi";
import axiosInstance from "../../Api/axios";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import { printGDSBooking } from "../../utils/bookingPDFService";
import NotFound from "../OtherPage/NotFound";
import {
    BuildingOffice2Icon, UserGroupIcon, CreditCardIcon, DocumentCheckIcon,
    ArrowPathIcon, XMarkIcon, CheckCircleIcon, PaperClipIcon,
    BanknotesIcon, ClockIcon, EyeIcon, UserIcon, HomeIcon,
    MagnifyingGlassIcon, ChartBarIcon, CurrencyDollarIcon,
    IdentificationIcon, BuildingLibraryIcon, PrinterIcon,
} from "@heroicons/react/24/outline";

interface Passenger {
    type: string; title: string; givenName: string; surName: string;
    passport: string; dateOfBirth: string; nationality: string;
    documentUrl?: string | null; discount?: number;
    // Only meaningful when type === "Child" - which pricing tier this child was booked under.
    childType?: "withBed" | "withoutBed";
}

interface UmrahPackageDetails {
    _id?: string;
    packageName?: string;
    flightLogo?: string;
    days?: number;
    availableRooms?: number;
    selectedGroupTicketId?: string;
    rooms?: Record<string, number>;
    packageTotals?: {
        childWithoutBed?: number; childWithBed?: number; infant?: number; double?: number;
        triple?: number; quad?: number; shared?: number; incentive?: number;
    };
    flights?: {
        airline?: string; flightNo?: string; depDate?: string; depTime?: string;
        arrDate?: string; arrTime?: string; sectorFrom?: string; sectorTo?: string;
        baggage?: string; meal?: string;
    }[];
    hotels?: {
        name?: string; location?: { city?: string; distance?: string };
        nights?: number; nightCount?: number; rating?: number;
    }[];
    transports?: { route?: string; transportType?: string }[];
    visa?: { visaType?: string; sellingPrice?: number; buyingPrice?: number };
}

interface PrintFlight {
    airline?: string;
    airlineName?: string;
    flightNo?: string;
    flightNumber?: string;
    depDate?: string;
    departureDate?: string;
    flightDate?: string;
    depTime?: string;
    departureTime?: string;
    arrDate?: string;
    arrivalDate?: string;
    arrTime?: string;
    arrivalTime?: string;
    sectorFrom?: string;
    sectorTo?: string;
    origin?: string;
    originCity?: string;
    destination?: string;
    destinationCity?: string;
    originCode?: string;
    destinationCode?: string;
    baggage?: string;
    meal?: string;
}

interface GroupTicketPrintData {
    _id?: string;
    groupBookingId?: string;
    voucher_id?: string;
    pnr?: string;
    sector?: string;
    airline?: string;
    flightLogo?: string;
    airlineLogo?: string;
    flights?: PrintFlight[];
    user?: { name?: string; _id?: string };
}

type PrintSource = UmrahPackageDetails & GroupTicketPrintData;

interface UmrahBooking {
    _id: string; bookingNumber: string; packageName: string; roomType?: string;
    user: { _id: string; name: string; email: string; phone: string; companyName?: string; agencyCode?: string; };
    passengers: Passenger[]; passengerCount: { adults: number; children: number; infants: number; total: number };
    pricing: { pricePerPerson: number; totalPrice: number; currency?: string };
    packageData?: UmrahPackageDetails;
    packageId?: string | UmrahPackageDetails;
    flightDetails?: {
        departure?: { date?: string; from?: string; to?: string; flightNumber?: string };
        return?: { date?: string; from?: string; to?: string; flightNumber?: string };
    };
    packageSource?: string;
    travelNetworkBookingId?: string;
    travelNetworkBookingRefNo?: string;
    travelNetworkBookingData?: any;
    zipBookingId?: string;
    zipBookingRefNo?: string;
    zipBookingData?: any;
    specialRequests?: string;
    paymentStatus: { status: string; totalAmount: number; paidAmount?: number; remainingAmount?: number; paymentHistory?: any[]; };
    visaStatus: { status: string; applicationNumber?: string; approvalDate?: string; approvalDocument?: string; notes?: string; };
    hotelStatus: { status: string; confirmationNumber?: string; bookingDate?: string; confirmationDocument?: string; notes?: string; };
    overallStatus: string; expiresAt?: string | null; createdAt: string; updatedAt?: string;
    supplierDiscount?: number;
}

interface Timer { hours: number; minutes: number; seconds: number; expired: boolean; }

const SUPPLIER_SOURCE_LABELS: Record<string, string> = {
    "travel-network": "Travel Network",
    upsky: "Up Sky",
};

const supplierSourceLabel = (packageSource?: string) =>
    (packageSource && SUPPLIER_SOURCE_LABELS[packageSource]) || "Local Package";

const statusColors: Record<string, string> = {
    "On Hold": "#F59E0B", Pending: "#F59E0B", Expired: "#EF4444", Approved: "#22C55E",
    "Not Applied": "#94A3B8", Applied: "#3B82F6", "In Process": "#F59E0B", Rejected: "#F43F5E",
    "Not Booked": "#94A3B8", Booked: "#3B82F6", Confirmed: "#22C55E", Cancelled: "#F43F5E",
};

const StatusBadge = ({ status }: { status: string }) => (
    <span style={{
        display: "inline-block", padding: "3px 10px", borderRadius: "20px",
        fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.3px",
        background: `${statusColors[status] || "#94A3B8"}18`,
        color: statusColors[status] || "#475569",
        border: `1px solid ${statusColors[status] || "#E2E8F0"}50`,
        whiteSpace: "nowrap",
    }}>{status}</span>
);

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const calculateTimer = (expiresAt?: string | null): Timer => {
    if (!expiresAt) return { hours: 0, minutes: 0, seconds: 0, expired: true };
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
    return { hours: Math.floor(diff / (1000 * 60 * 60)), minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)), seconds: Math.floor((diff % (1000 * 60)) / 1000), expired: false };
};

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid #E2E8F0",
    borderRadius: "8px", marginTop: "4px", fontSize: "0.8rem",
    outline: "none", background: "white", color: "#0F172A",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
    fontSize: "0.68rem", fontWeight: 700, color: "#64748B",
    textTransform: "uppercase", letterSpacing: "0.5px",
    display: "flex", alignItems: "center", gap: "5px",
};

export default function UmrahPackagesBooking() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const canView = hasPermission(user, "view_umrah_package_bookings");
    const canManage = hasPermission(user, "manage_umrah_package_booking");
    const [bookings, setBookings] = useState<UmrahBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("");
    const [visaFilter, setVisaFilter] = useState("");
    const [hotelFilter, setHotelFilter] = useState("");
    const [modalData, setModalData] = useState<any>(null);
    const [detailsModal, setDetailsModal] = useState<UmrahBooking | null>(null);
    const [paymentHistoryBooking, setPaymentHistoryBooking] = useState<UmrahBooking | null>(null);
    const [timers, setTimers] = useState<Record<string, Timer>>({});
    const [extendingHoldId, setExtendingHoldId] = useState<string | null>(null);
    const [printingTicketId, setPrintingTicketId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [openedBookingId, setOpenedBookingId] = useState<string | null>(null);
    const itemsPerPage = 10;

    useEffect(() => { if (canView) fetchBookings(); }, [canView]);

    useEffect(() => {
        const bookingId = searchParams.get("bookingId");
        if (!bookingId) {
            if (openedBookingId) setOpenedBookingId(null);
            return;
        }
        if (bookingId === openedBookingId || bookings.length === 0) return;

        const bookingToOpen = bookings.find((booking) => booking._id === bookingId);
        if (bookingToOpen) {
            setDetailsModal(bookingToOpen);
            setOpenedBookingId(bookingId);
        }
    }, [bookings, openedBookingId, searchParams]);

    useEffect(() => {
        const interval = setInterval(() => {
            const newTimers: Record<string, Timer> = {};
            bookings.filter(b => ["On Hold", "Pending"].includes(b.overallStatus) && b.expiresAt).forEach(b => { newTimers[b._id] = calculateTimer(b.expiresAt); });
            setTimers(newTimers);
        }, 1000);
        return () => clearInterval(interval);
    }, [bookings]);

    if (!canView) return <NotFound />;

    const fetchBookings = async () => {
        try { setLoading(true); const res = await getAllBookingsAdmin({}); setBookings(res.data || []); }
        catch (error: any) { toast.error(error.response?.data?.message || "Failed"); }
        finally { setLoading(false); }
    };

    const filtered = bookings.filter(b => {
        const s = searchTerm.toLowerCase();
        const matchSearch = b.bookingNumber.toLowerCase().includes(s) || b.packageName.toLowerCase().includes(s) || b.user?.name?.toLowerCase().includes(s) || b.user?.email?.toLowerCase().includes(s) || b.user?.companyName?.toLowerCase().includes(s);
        return matchSearch && (statusFilter ? b.overallStatus === statusFilter : true) && (paymentFilter ? b.paymentStatus.status === paymentFilter : true) && (visaFilter ? b.visaStatus.status === visaFilter : true) && (hotelFilter ? b.hotelStatus.status === hotelFilter : true);
    });

    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const handleExtendHold = async (bookingId: string, holdMinutes: number) => {
        if (!canManage) { toast.error("No permission"); return; }
        try { setExtendingHoldId(bookingId); const res = await extendUmrahBookingHold(bookingId, { holdMinutes }); setBookings(prev => prev.map(b => b._id === bookingId ? res.data : b)); toast.success("Hold extended"); }
        catch (error: any) { toast.error(error.response?.data?.message); }
        finally { setExtendingHoldId(null); }
    };

    const handleSaveDiscounts = async (bookingId: string, passengers: { passport: string; discount: number }[]) => {
        if (!canManage) { toast.error("No permission"); return; }
        try { const res = await savePassengerDiscounts(bookingId, passengers); setBookings(prev => prev.map(b => { if (b._id !== bookingId) return b; return { ...b, passengers: b.passengers.map(p => { const match = res.data.find((up: any) => up.passport === p.passport); return match ? { ...p, discount: match.discount } : p; }) }; })); toast.success("Discounts saved"); }
        catch (error: any) { toast.error(error.response?.data?.message); throw error; }
    };

    const getId = (value: unknown): string => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (typeof value === "object" && value !== null) {
            const record = value as { _id?: string; id?: string };
            return record._id || record.id || "";
        }
        return "";
    };

    const normalizePrintFlight = (flight: PrintFlight = {}): PrintFlight => ({
        ...flight,
        airlineName: flight.airlineName || flight.airline || "",
        flightNo: flight.flightNo || flight.flightNumber || "",
        departureDate: flight.departureDate || flight.depDate || flight.flightDate,
        depTime: flight.depTime || flight.departureTime || "",
        arrTime: flight.arrTime || flight.arrivalTime || "",
        origin: flight.origin || flight.originCity || flight.sectorFrom || "",
        destination: flight.destination || flight.destinationCity || flight.sectorTo || "",
        originCode: flight.originCode || flight.sectorFrom || "",
        destinationCode: flight.destinationCode || flight.sectorTo || "",
    });

    const buildUmrahTicketPrintBooking = (
        booking: UmrahBooking,
        packageData: UmrahPackageDetails | null,
        groupTicket: GroupTicketPrintData | null,
    ) => {
        const source = (groupTicket || packageData || {}) as PrintSource;
        const rawFlights = source.flights || packageData?.flights || [];
        const flights = rawFlights.map(normalizePrintFlight);
        const firstFlight = flights[0] || {};
        const airlineName =
            source.airline ||
            firstFlight.airlineName ||
            firstFlight.airline ||
            "AIRLINE";

        return {
            ...source,
            _id: booking._id,
            travelType: "Umrah Group",
            bookingReference:
                booking.bookingNumber ||
                groupTicket?.groupBookingId ||
                groupTicket?.voucher_id ||
                source._id,
            bookingId: booking.bookingNumber,
            pnr: groupTicket?.pnr || booking.bookingNumber,
            status: booking.overallStatus === "Confirmed" ? "confirmed" : "on hold",
            bookingStatus: booking.overallStatus,
            passengers: booking.passengers || [],
            totalPassengers: booking.passengerCount?.total || booking.passengers?.length || 0,
            adultsCount: booking.passengerCount?.adults || 0,
            childrenCount: booking.passengerCount?.children || 0,
            infantsCount: booking.passengerCount?.infants || 0,
            airline: {
                name: airlineName,
                logoUrl: source.flightLogo || source.airlineLogo || packageData?.flightLogo || "",
            },
            sector:
                source.sector ||
                (flights.length
                    ? [
                        firstFlight.sectorFrom || firstFlight.originCode,
                        ...flights.map((flight) => flight.sectorTo || flight.destinationCode),
                    ]
                        .filter(Boolean)
                        .join("-")
                    : ""),
            flights,
            departureDate: firstFlight.departureDate || booking.flightDetails?.departure?.date,
            arrivalDate: booking.flightDetails?.return?.date || booking.flightDetails?.departure?.date,
            pricing: {
                ...booking.pricing,
                grandTotal: booking.pricing?.totalPrice || 0,
            },
            userId: booking.user,
            contactPersonName: booking.user?.name,
            phone: booking.user?.phone,
        };
    };

    const normalizeTNTFlights = (tntData: any): PrintFlight[] => {
        const details = tntData?.group?.details || tntData?.data?.group?.details || [];
        const airlineName = tntData?.group?.airline?.short_name || tntData?.data?.group?.airline?.short_name || "";
        return details.map((d: any) => ({
            airline: airlineName,
            flightNo: d.flight_no || "",
            depDate: d.flight_date,
            depTime: d.dept_time || "",
            arrDate: d.flight_date,
            arrTime: d.arv_time || "",
            sectorFrom: d.origin || "",
            sectorTo: d.destination || "",
            baggage: d.baggage || "",
        }));
    };

    const handlePrintTicket = async (booking: UmrahBooking) => {
        try {
            setPrintingTicketId(booking._id);

            let packageData: UmrahPackageDetails | null =
                booking.packageId && typeof booking.packageId === "object"
                    ? booking.packageId
                    : booking.packageData || null;

            // Travel Network booking: TNT stored/live data se flights lo
            if (booking.packageSource === "travel-network") {
                const tntBookingId = booking.travelNetworkBookingId || booking.travelNetworkBookingData?.data?.id;
                console.log(tntBookingId)
                let tntFlights = normalizeTNTFlights(booking.travelNetworkBookingData?.data || booking.travelNetworkBookingData);

                // Note: fallback to packageData.flights if stored tnt data has no group.details

                if (!tntFlights.length && packageData?.flights?.length) {
                    tntFlights = packageData.flights as PrintFlight[];
                }

                const tntSource = {
                    ...(packageData || {}),
                    flights: tntFlights,
                    sector: packageData?.packageName || "",
                    airline: (packageData as any)?.airlineName || "",
                    airlineLogo: (packageData as any)?.airline?.logo_url || (packageData as any)?.logo || "",
                    pnr: booking.travelNetworkBookingData?.data?.group?.pnr || "",
                } as PrintSource;

                const printBooking = buildUmrahTicketPrintBooking(booking, packageData, tntSource as GroupTicketPrintData);

                if (!printBooking.flights?.length) {
                    toast.error("No flight data found for this Travel Network booking");
                    return;
                }

                printGDSBooking(printBooking);
                return;
            }

            if (packageData?._id && !packageData.flightLogo) {
                try {
                    const packageRes = await axiosInstance.get(`/umrahpackages/${packageData._id}`);
                    packageData = packageRes.data?.package || packageData;
                } catch (error) {
                    console.warn("Umrah package fetch failed, using populated package data", error);
                }
            }

            const groupTicketId = getId(packageData?.selectedGroupTicketId);
            let groupTicket: GroupTicketPrintData | null = null;

            if (groupTicketId) {
                const groupRes = await axiosInstance.get(`/group-ticketing/${groupTicketId}`);
                groupTicket = groupRes.data?.data || null;
            }

            const printBooking = buildUmrahTicketPrintBooking(booking, packageData, groupTicket);

            if (!printBooking.flights?.length) {
                toast.error("No group ticket flight data found for this Umrah booking");
                return;
            }

            printGDSBooking(printBooking);
        } catch (error: any) {
            console.error("Error printing Umrah package ticket:", error);
            toast.error(error.response?.data?.message || "Failed to print ticket");
        } finally {
            setPrintingTicketId(null);
        }
    };

    const closeDetailsModal = () => {
        setOpenedBookingId(detailsModal?._id || null);
        setDetailsModal(null);
        const nextParams = new URLSearchParams(searchParams);
        if (nextParams.has("bookingId")) {
            nextParams.delete("bookingId");
            setSearchParams(nextParams, { replace: true });
        }
    };

    return (
        <div style={{ padding: "24px", fontFamily: "'Inter', sans-serif", background: "#F8FAFC", minHeight: "100vh" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.3px" }}>Umrah Bookings</h1>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748B" }}>{bookings.length} total bookings</p>
                </div>
                <button
                    onClick={fetchBookings}
                    style={{
                        padding: "8px 16px", background: "white", border: "1px solid #E2E8F0",
                        borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center",
                        gap: "6px", fontSize: "0.8rem", fontWeight: 600, color: "#475569",
                        transition: "all 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                >
                    <ArrowPathIcon style={{ width: 14, height: 14 }} /> Refresh
                </button>
            </div>

            {/* Filters */}
            <div style={{ background: "white", borderRadius: "12px", padding: "16px", marginBottom: "20px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                    <div>
                        <label style={labelStyle}><MagnifyingGlassIcon style={{ width: 12, height: 12 }} /> Search</label>
                        <input type="text" placeholder="Booking #, agent, company..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}><ChartBarIcon style={{ width: 12, height: 12 }} /> Overall</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
                            <option value="">All Statuses</option>
                            <option value="On Hold">On Hold</option><option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option><option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}><CurrencyDollarIcon style={{ width: 12, height: 12 }} /> Payment</label>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={inputStyle}>
                            <option value="">All</option>
                            <option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}><IdentificationIcon style={{ width: 12, height: 12 }} /> Visa</label>
                        <select value={visaFilter} onChange={e => setVisaFilter(e.target.value)} style={inputStyle}>
                            <option value="">All</option>
                            <option value="Not Applied">Not Applied</option><option value="Applied">Applied</option>
                            <option value="Approved">Approved</option><option value="Rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}><BuildingLibraryIcon style={{ width: 12, height: 12 }} /> Hotel</label>
                        <select value={hotelFilter} onChange={e => setHotelFilter(e.target.value)} style={inputStyle}>
                            <option value="">All</option>
                            <option value="Not Booked">Not Booked</option><option value="Booked">Booked</option><option value="Confirmed">Confirmed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", color: "#64748B", fontSize: "0.9rem" }}>
                    <ArrowPathIcon style={{ width: 20, height: 20, margin: "0 auto 10px", display: "block", color: "#94A3B8", animation: "spin 1s linear infinite" }} />
                    Loading bookings...
                </div>
            ) : paginated.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", color: "#64748B", fontSize: "0.9rem" }}>
                    No bookings found
                </div>
            ) : (
                <>
                    <div style={{ background: "white", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
                            <thead>
                                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                                    {["Booking & Created", "Agent Details", "Payment", "Visa", "Hotel", "Overall", "Actions"].map((h, i) => (
                                        <th key={i} style={{ padding: "11px 14px", textAlign: i >= 2 && i <= 5 ? "center" : i === 6 ? "center" : "left", fontSize: "0.68rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((b, i) => {
                                    const timer = timers[b._id] || calculateTimer(b.expiresAt);
                                    const isOnHold = ["On Hold", "Pending"].includes(b.overallStatus);
                                    return (
                                        <tr
                                            key={b._id}
                                            style={{
                                                borderBottom: "1px solid #F1F5F9",
                                                background: i % 2 ? "#FAFAFA" : "white",
                                                transition: "background 0.1s",
                                            }}
                                        >
                                            <td style={{ padding: "13px 14px" }}>
                                                <div style={{ fontSize: "0.72rem", color: "#000", marginBottom: "3px" }}><b>BK# {b.bookingNumber}</b></div>
                                                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#2563EB", marginBottom: "3px" }}>{b.packageName?.slice(0, 35)}</div>
                                                {/* <div style={{ fontSize: "0.72rem", color: "#475569", marginBottom: "3px" }}>{}</div> */}
                                                <div style={{ fontSize: "0.65rem", color: "#000", marginBottom: "3px" }}><b>{formatDate(b.createdAt)}</b></div>
                                                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#059669" }}>{b.pricing?.currency || "PKR"} {b.pricing?.totalPrice?.toLocaleString()}</div>
                                            </td>
                                            <td style={{ padding: "13px 14px" }}>
                                                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#0F172A", marginBottom: "2px" }}>{b.user?.name || "N/A"}</div>
                                                <div style={{ fontSize: "0.72rem", color: "#64748B", marginBottom: "2px" }}>{b.user?.email || ""}</div>
                                                <div style={{ fontSize: "0.72rem", color: "#64748B", marginBottom: "2px" }}>{b.user?.companyName || ""}</div>
                                                {b.user?.agencyCode && <div style={{ fontSize: "0.65rem", color: "#94A3B8" }}>Code: {b.user.agencyCode}</div>}
                                            </td>
                                            <td style={{ padding: "13px 14px", textAlign: "center" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                                    <StatusBadge status={b.paymentStatus.status} />
                                                    <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700 }}>
                                                        PKR {((b.paymentStatus.paidAmount || 0)).toLocaleString()} / PKR {((b.paymentStatus.totalAmount || b.paymentStatus.totalAmount === 0) ? b.paymentStatus.totalAmount : b.pricing?.totalPrice || 0).toLocaleString()}
                                                    </div>
                                                    <div style={{ display: "flex", gap: "6px" }}>
                                                        <button
                                                            onClick={() => setPaymentHistoryBooking(b)}
                                                            style={{ padding: "6px 8px", background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#475569" }}
                                                        >History</button>
                                                        {canManage && (
                                                            <button
                                                                onClick={() => setModalData({ bookingId: b._id, type: "payment", booking: b })}
                                                                style={{ padding: "6px 8px", background: "#2563EB", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "white" }}
                                                            >Update</button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: "13px 14px", textAlign: "center" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                                    <StatusBadge status={b.visaStatus.status} />
                                                    {canManage && (
                                                        <button
                                                            onClick={() => setModalData({ bookingId: b._id, type: "visa", booking: b })}
                                                            style={{ padding: "6px 8px", background: "#7C3AED", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "white" }}
                                                        >Update</button>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: "13px 14px", textAlign: "center" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                                                    <StatusBadge status={b.hotelStatus.status} />
                                                    {canManage && (
                                                        <button
                                                            onClick={() => setModalData({ bookingId: b._id, type: "hotel", booking: b })}
                                                            style={{ padding: "6px 8px", background: "#059669", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "white" }}
                                                        >Update</button>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: "13px 14px", textAlign: "center" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                                    <StatusBadge status={b.overallStatus} />
                                                    {isOnHold && !timer.expired && (
                                                        <div style={{ marginTop: "6px", fontSize: "0.72rem", fontWeight: 700, color: "#D97706", fontVariantNumeric: "tabular-nums" }}>
                                                            {String(timer.hours).padStart(2, "0")}:{String(timer.minutes).padStart(2, "0")}:{String(timer.seconds).padStart(2, "0")}
                                                        </div>
                                                    )}
                                                    {isOnHold && timer.expired && <div style={{ marginTop: "6px", fontSize: "0.7rem", fontWeight: 700, color: "#EF4444" }}>Expired</div>}
                                                    {canManage && (
                                                        <button
                                                            onClick={() => setModalData({ bookingId: b._id, type: "overall", booking: b })}
                                                            style={{ padding: "6px 8px", background: "#0F766E", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "white" }}
                                                        >Update</button>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: "13px 14px" }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                                                        <button
                                                            onClick={() => handlePrintTicket(b)}
                                                            disabled={printingTicketId === b._id}
                                                            style={{
                                                                padding: "5px 11px", background: "#F8FAFC", border: "1px solid #CBD5E1",
                                                                borderRadius: "7px", cursor: printingTicketId === b._id ? "not-allowed" : "pointer",
                                                                fontSize: "0.72rem", fontWeight: 600, color: "#475569",
                                                                display: "flex", alignItems: "center", gap: "4px",
                                                                opacity: printingTicketId === b._id ? 0.6 : 1,
                                                                transition: "all 0.15s",
                                                            }}
                                                            title="Print Ticket"
                                                        >
                                                            <PrinterIcon style={{ width: 12, height: 12 }} />
                                                            {printingTicketId === b._id ? "Printing..." : "Print Ticket"}
                                                        </button>
                                                        <button
                                                            onClick={() => setDetailsModal(b)}
                                                            style={{
                                                                padding: "5px 11px", background: "#EFF6FF", border: "1px solid #BFDBFE",
                                                                borderRadius: "7px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600,
                                                                color: "#2563EB", display: "flex", alignItems: "center", gap: "4px",
                                                                transition: "all 0.15s",
                                                            }}
                                                        >
                                                            <EyeIcon style={{ width: 12, height: 12 }} /> Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px", alignItems: "center" }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: "6px 14px", borderRadius: "8px", border: "1px solid #E2E8F0",
                                    background: "white", cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                    fontSize: "0.8rem", fontWeight: 600, color: currentPage === 1 ? "#CBD5E1" : "#475569",
                                    transition: "all 0.15s",
                                }}
                            >Prev</button>
                            <span style={{ padding: "6px 12px", fontSize: "0.8rem", color: "#64748B", fontWeight: 600 }}>{currentPage} / {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: "6px 14px", borderRadius: "8px", border: "1px solid #E2E8F0",
                                    background: "white", cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                                    fontSize: "0.8rem", fontWeight: 600, color: currentPage === totalPages ? "#CBD5E1" : "#475569",
                                    transition: "all 0.15s",
                                }}
                            >Next</button>
                        </div>
                    )}
                </>
            )}

            {detailsModal && <DetailsModal booking={detailsModal} onClose={closeDetailsModal} canManage={canManage} onExtendHold={handleExtendHold} onSaveDiscounts={handleSaveDiscounts} extendingHoldId={extendingHoldId} timers={timers} onUpdate={(type: string) => { setModalData({ bookingId: detailsModal._id, type, booking: detailsModal }); closeDetailsModal(); }} />}
            {paymentHistoryBooking && <PaymentHistoryModal booking={paymentHistoryBooking} onClose={() => setPaymentHistoryBooking(null)} />}
            {modalData && <StatusModal modalData={modalData} onClose={() => setModalData(null)} onSuccess={() => { fetchBookings(); setModalData(null); }} />}
        </div>
    );
}

// Details Modal with ALL functionality
function DetailsModal({ booking, onClose, canManage, onExtendHold, onSaveDiscounts, extendingHoldId, timers, onUpdate }: any) {
    const [discounts, setDiscounts] = useState<number[]>(booking.passengers.map((p: any) => p.discount ?? 0));
    const [savingDiscounts, setSavingDiscounts] = useState(false);
    const timer = timers[booking._id] || calculateTimer(booking.expiresAt);
    const packageDetails: UmrahPackageDetails | null =
        booking.packageId && typeof booking.packageId === "object" ? booking.packageId : booking.packageData || null;
    const packageTotals = packageDetails?.packageTotals || booking.packageData?.packageTotals;
    const packageFlights = packageDetails?.flights || booking.packageData?.flights || [];
    const packageHotels = packageDetails?.hotels || booking.packageData?.hotels || [];
    const isExternalSource = booking.packageSource && booking.packageSource !== "local-db";
    const sourceLabel = supplierSourceLabel(booking.packageSource);
    const sourceBadgeStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        padding: "4px 9px",
        borderRadius: "999px",
        fontSize: "0.68rem",
        fontWeight: 800,
        color: isExternalSource ? "#0369A1" : "#166534",
        background: isExternalSource ? "#E0F2FE" : "#DCFCE7",
        border: `1px solid ${isExternalSource ? "#BAE6FD" : "#BBF7D0"}`,
    };
    const travelNetworkBookingId =
        booking.travelNetworkBookingId || booking.travelNetworkBookingData?.data?.id || booking.zipBookingId || booking.zipBookingData?.data?.id;
    const upskyBookingId =
        booking.upskyBookingId || booking.upskyBookingData?.data?.booking_id || booking.upskyBookingData?.data?.id;
    // const packageTransports = packageDetails?.transports || [];
    // const packageVisa = packageDetails?.visa;
    const adultPrice = booking.pricing?.pricePerPerson || 0;
    const childPrice = packageTotals?.childWithoutBed || 0;
    const childWithBedPrice = packageTotals?.childWithBed || 0;
    const infantPrice = packageTotals?.infant || 0;
    const getChildPrice = (p: any) => (p.childType === "withBed" ? childWithBedPrice : childPrice);
    const adultTotal = (booking.passengerCount?.adults || booking.passengers.filter((p: any) => p.type === "Adult").length) * adultPrice;
    const childTotal = booking.passengers
        .filter((p: any) => p.type === "Child")
        .reduce((sum: number, p: any) => sum + getChildPrice(p), 0);
    const infantTotal = (booking.passengerCount?.infants || booking.passengers.filter((p: any) => p.type === "Infant").length) * infantPrice;
    const totalPassengers = booking.passengerCount?.total || booking.passengers.length;
    const incentivePerPassenger = Number(packageTotals?.incentive) || 0;
    const totalIncentive = incentivePerPassenger * totalPassengers;
    const totalDiscount = discounts.reduce((a, b) => a + b, 0);
    const finalTotal = Math.max(0, (booking.pricing?.totalPrice || 0) - totalDiscount);

    const handleSave = async () => {
        setSavingDiscounts(true);
        try { await onSaveDiscounts(booking._id, booking.passengers.map((p: any, i: number) => ({ passport: p.passport, discount: discounts[i] }))); }
        catch (e) { }
        finally { setSavingDiscounts(false); }
    };

    const sectionCard: React.CSSProperties = {
        border: "1px solid #E2E8F0", borderRadius: "12px", padding: "16px", marginBottom: "14px",
    };

    const sectionTitle = (icon: React.ReactNode, label: string, color = "#0F172A"): React.ReactNode => (
        <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "0.83rem", display: "flex", alignItems: "center", gap: "8px", color }}>{icon}{label}</div>
    );

    const detailItem = (label: string, value: React.ReactNode) => (
        <div style={{ display: "grid", gap: "5px" }}>
            <div style={{ fontSize: "0.68rem", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
            <div style={{ fontSize: "0.84rem", color: "#0F172A", fontWeight: 700 }}>{value || "N/A"}</div>
        </div>
    );

    // const money = (value?: number) =>
    //     typeof value === "number" && value > 0 ? `PKR ${value.toLocaleString()}` : "N/A";

    // const roomPriceRows = [
    //     ["Sharing", packageTotals?.shared],
    //     ["Double", packageTotals?.double],
    //     ["Triple", packageTotals?.triple],
    //     ["Quad", packageTotals?.quad],
    //     ["Child", packageTotals?.childWithoutBed],
    //     ["Infant", packageTotals?.infant],
    // ].filter(([, value]) => typeof value === "number" && value > 0);

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 99999, backdropFilter: "blur(2px)" }} />
            <div style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                width: "90%", maxWidth: "800px", maxHeight: "80vh", background: "white",
                borderRadius: "16px", zIndex: 999999, overflow: "hidden",
                boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
            }}>
                {/* Header */}
                <div style={{
                    padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.15)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
                }}>
                    <div>
                        <h3 style={{ margin: 0, color: "white", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.2px" }}>#{booking.bookingNumber}</h3>
                        <p style={{ margin: "5px 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.75)" }}>{booking.packageName} • Created: {formatDate(booking.createdAt)}</p>
                    </div>
                    <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,0.15)", borderRadius: "8px", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
                        <XMarkIcon style={{ width: 18, height: 18, color: "white" }} />
                    </button>
                </div>

                <div style={{ padding: "20px 22px", overflowY: "auto", maxHeight: "calc(88vh - 80px)" }}>
                    {/* Agent Info */}
                    <div style={{ ...sectionCard, background: "#F0FDF4", border: "1px solid #DCFCE7" }}>
                        {sectionTitle(<UserIcon style={{ width: 15, height: 15 }} />, "Agent Information", "#166534")}
                        <div style={{ fontSize: "0.82rem", color: "#1f2937", marginBottom: "4px" }}><strong>{booking.user?.name}</strong> • {booking.user?.email}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748B" }}>{booking.user?.companyName} {booking.user?.agencyCode && `(Code: ${booking.user.agencyCode})`}</div>
                    </div>



                    {/* <div style={{ ...sectionCard, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                        {sectionTitle(<BuildingOffice2Icon style={{ width: 15, height: 15, color: "#2563EB" }} />, "Booking Information", "#1D4ED8")}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Room Type</div>
                                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0F172A" }}>{booking.roomType || "N/A"}</div>
                            </div>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Package Source</div>
                                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0F172A" }}>{booking.packageSource || "N/A"}</div>
                            </div>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Created</div>
                                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0F172A" }}>{formatDate(booking.createdAt)}</div>
                            </div>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <div style={{ fontSize: "0.75rem", color: "#64748B" }}>Updated</div>
                                <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0F172A" }}>{formatDate(booking.updatedAt)}</div>
                            </div>
                        </div>
                        {booking.specialRequests && (
                            <div style={{ marginTop: "12px", fontSize: "0.82rem", color: "#475569" }}><strong>Special Requests:</strong> {booking.specialRequests}</div>
                        )}
                    </div> */}

                    {/* Timer for Hold */}
                    {["On Hold", "Pending"].includes(booking.overallStatus) && (
                        <div style={{ ...sectionCard, background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                            {sectionTitle(<ClockIcon style={{ width: 15, height: 15 }} />, "Hold Timer", "#92400E")}
                            {timer.expired ? (
                                <div style={{ color: "#EF4444", fontWeight: 700, fontSize: "0.9rem" }}>EXPIRED</div>
                            ) : (
                                <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                                    {[{ val: timer.hours, label: "HRS" }, { val: timer.minutes, label: "MIN" }, { val: timer.seconds, label: "SEC" }].map(({ val, label }) => (
                                        <div key={label} style={{ background: "white", padding: "12px 16px", borderRadius: "10px", textAlign: "center", minWidth: "58px", border: "1px solid #FCD34D", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                                            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0F172A", fontVariantNumeric: "tabular-nums" }}>{String(val).padStart(2, "0")}</div>
                                            <div style={{ fontSize: "0.6rem", color: "#92400E", fontWeight: 700, marginTop: "4px", letterSpacing: "0.5px" }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {canManage && !timer.expired && (
                                <select
                                    onChange={(e) => { const mins = Number(e.target.value); if (mins) onExtendHold(booking._id, mins); }}
                                    disabled={extendingHoldId === booking._id}
                                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #FCD34D", width: "100%", fontSize: "0.8rem", background: "white", color: "#78350F", fontWeight: 600, cursor: "pointer", outline: "none" }}
                                >
                                    <option value="">Extend hold time</option>
                                    <option value="30">+30 minutes</option><option value="60">+1 hour</option>
                                    <option value="120">+2 hours</option><option value="180">+3 hours</option>
                                </select>
                            )}
                        </div>
                    )}

                    {/* Passengers */}
                    <div style={{ ...sectionCard, background: "#F8FAFC" }}>
                        {sectionTitle(
                            <UserGroupIcon style={{ width: 15, height: 15, color: "#2563EB" }} />,
                            `Passengers (${booking.passengers.length}) • A:${booking.passengerCount?.adults} C:${booking.passengerCount?.children} I:${booking.passengerCount?.infants}`
                        )}
                        <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
                                {booking.passengers.map((p: any, i: number) => {
                                    let price = 0;
                                    if (p.type === "Adult") price = adultPrice;
                                    else if (p.type === "Child") price = getChildPrice(p);
                                    else if (p.type === "Infant") price = infantPrice;
                                    const typeLabel =
                                        p.type === "Child"
                                            ? `Child (${p.childType === "withBed" ? "w/ Bed" : "w/o Bed"})`
                                            : p.type;
                                    return (
                                        <div key={i} style={{ padding: "12px", background: "white", borderRadius: "9px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", marginBottom: "6px" }}>{p.title} {p.givenName} {p.surName}</div>
                                            <div style={{ display: "flex", gap: "10px", fontSize: "0.72rem", color: "#64748B", marginBottom: "10px", flexWrap: "wrap" }}>
                                                <span style={{ background: "#EFF6FF", padding: "2px 7px", borderRadius: "5px", fontWeight: 700, color: "#2563EB" }}>{typeLabel}</span>
                                                <span>{p.passport}</span>
                                                <span>{p.nationality}</span>
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "flex-end" }}>
                                                <div>
                                                    <div style={{ ...labelStyle, marginBottom: "5px" }}>Discount (PKR)</div>
                                                    <input
                                                        type="number" min="0" value={discounts[i] ?? 0}
                                                        onChange={(e) => { const next = [...discounts]; next[i] = Number(e.target.value) || 0; setDiscounts(next); }}
                                                        disabled={!canManage}
                                                        style={{ ...inputStyle, marginTop: 0 }}
                                                    />
                                                </div>
                                                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#2563EB", whiteSpace: "nowrap" }}>PKR {price.toLocaleString()}</div>
                                            </div>
                                            {p.documentUrl && (
                                                <a href={p.documentUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.72rem", color: "#2563EB", fontWeight: 600, textDecoration: "none", marginTop: "9px" }}>
                                                    <PaperClipIcon style={{ width: 12, height: 12 }} /> View Passport
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {canManage && (
                            <button
                                onClick={handleSave}
                                disabled={savingDiscounts}
                                style={{
                                    marginTop: "12px", padding: "9px 16px", background: "#2563EB", color: "white",
                                    border: "none", borderRadius: "9px", cursor: savingDiscounts ? "not-allowed" : "pointer",
                                    fontSize: "0.82rem", fontWeight: 700, width: "100%", opacity: savingDiscounts ? 0.7 : 1,
                                    transition: "opacity 0.15s",
                                }}
                            >{savingDiscounts ? "Saving..." : "Save Discounts"}</button>
                        )}
                    </div>

                    {/* Pricing Summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                        <div style={sectionCard}>
                            {sectionTitle(<BanknotesIcon style={{ width: 15, height: 15, color: "#059669" }} />, "Pricing Breakdown")}
                            {[["Adult Total", adultTotal], ["Child Total", childTotal], ["Infant Total", infantTotal]].map(([label, val]) => (
                                <div key={label as string} style={{ fontSize: "0.8rem", display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "#4a5568" }}>
                                    <span>{label}</span><strong>PKR {(val as number).toLocaleString()}</strong>
                                </div>
                            ))}
                            <div style={{ fontSize: "0.8rem", display: "flex", justifyContent: "space-between", paddingTop: "9px", borderTop: "1px solid #E2E8F0", marginTop: "6px", fontWeight: 700, color: "#0F172A" }}>
                                <span>Subtotal</span><strong>PKR {(adultTotal + childTotal + infantTotal).toLocaleString()}</strong>
                            </div>
                            {totalIncentive > 0 && (
                                <div style={{ fontSize: "0.8rem", display: "flex", justifyContent: "space-between", marginTop: "6px", color: "#059669", fontWeight: 600 }}>
                                    <span>Incentive</span><strong>-PKR {totalIncentive.toLocaleString()}</strong>
                                </div>
                            )}
                            {totalDiscount > 0 && (
                                <div style={{ fontSize: "0.8rem", display: "flex", justifyContent: "space-between", marginTop: "6px", color: "#059669", fontWeight: 600 }}>
                                    <span>Discount</span><strong>-PKR {totalDiscount.toLocaleString()}</strong>
                                </div>
                            )}
                            {isExternalSource && (booking.supplierDiscount ?? 0) > 0 && (
                                <div style={{ fontSize: "0.8rem", display: "flex", justifyContent: "space-between", marginTop: "6px", color: "#0369A1", fontWeight: 600 }}>
                                    <span>Supplier Discount ({sourceLabel})</span><strong>PKR {(booking.supplierDiscount as number).toLocaleString()}</strong>
                                </div>
                            )}
                            <div style={{ fontSize: "0.9rem", display: "flex", justifyContent: "space-between", paddingTop: "9px", borderTop: "1px solid #E2E8F0", marginTop: "8px", fontWeight: 800, color: "#0F172A" }}>
                                <span>Final Total</span><strong>PKR {finalTotal.toLocaleString()}</strong>
                            </div>
                        </div>

                        <div style={sectionCard}>
                            {sectionTitle(<CheckCircleIcon style={{ width: 15, height: 15, color: "#2563EB" }} />, "Status Summary")}
                            {[
                                { icon: <CreditCardIcon style={{ width: 14, height: 14, color: "#2563EB" }} />, status: booking.paymentStatus.status },
                                { icon: <DocumentCheckIcon style={{ width: 14, height: 14, color: "#7C3AED" }} />, status: booking.visaStatus.status },
                                { icon: <HomeIcon style={{ width: 14, height: 14, color: "#059669" }} />, status: booking.hotelStatus.status },
                                { icon: <BuildingOffice2Icon style={{ width: 14, height: 14, color: "#0F766E" }} />, status: booking.overallStatus },
                            ].map(({ icon, status }, i) => (
                                <div key={i} style={{ fontSize: "0.8rem", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    {icon}<StatusBadge status={status} />
                                </div>
                            ))}
                            {booking.visaStatus.applicationNumber && (
                                <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #E2E8F0" }}>
                                    Visa: {booking.visaStatus.applicationNumber}
                                </div>
                            )}
                            {booking.hotelStatus.confirmationNumber && (
                                <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: "4px" }}>
                                    Hotel: {booking.hotelStatus.confirmationNumber}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ ...sectionCard, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                        {sectionTitle(<BuildingOffice2Icon style={{ width: 15, height: 15, color: "#2563EB" }} />, "Package Details", "#1D4ED8")}

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "14px" }}>
                            {/* {detailItem("Package", packageDetails?.packageName || booking.packageName)} */}
                            {detailItem("Source", <span style={sourceBadgeStyle}>{sourceLabel}</span>)}
                            {detailItem("Room Type", booking.roomType || "N/A")}
                            {detailItem("Duration", packageDetails?.days ? `${packageDetails.days} days` : "N/A")}
                            {booking.packageSource === "travel-network" && detailItem("TNT Booking", travelNetworkBookingId || "Pending / N/A")}
                            {booking.packageSource === "upsky" && detailItem("Up Sky Booking", upskyBookingId || "Pending / N/A")}
                            {/* {detailItem("Available Rooms", packageDetails?.availableRooms ?? "N/A")} */}
                            {/* {detailItem("Package Source", booking.packageSource || "N/A")} */}
                            {/* {detailItem("Group Ticket", packageDetails?.selectedGroupTicketId || "N/A")} */}
                        </div>

                        {isExternalSource && (!packageDetails || (!packageFlights.length && !packageHotels.length)) && (
                            <div style={{ padding: "10px", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: "9px", color: "#0369A1", fontSize: "0.78rem", fontWeight: 700, marginBottom: "12px" }}>
                                {sourceLabel} package. Some local package details are not available.
                            </div>
                        )}

                        {packageFlights.length > 0 && (
                            <div style={{ marginBottom: "14px" }}>
                                <div style={{ fontSize: "0.72rem", color: "#1D4ED8", fontWeight: 800, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Flights</div>
                                <div style={{ display: "grid", gap: "8px" }}>
                                    {packageFlights.map((flight: any, index: any) => (
                                        <div key={index} style={{ padding: "10px", background: "white", border: "1px solid #DBEAFE", borderRadius: "9px", display: "grid", gap: "4px" }}>
                                            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0F172A" }}>
                                                {flight.flightNo || "Flight N/A"} {flight.airline ? `- ${flight.airline}` : ""}
                                            </div>
                                            <div style={{ fontSize: "0.74rem", color: "#475569", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                <span>{flight.sectorFrom || "N/A"} to {flight.sectorTo || "N/A"}</span>
                                                <span>{formatDate(flight.depDate)} {flight.depTime || ""}</span>
                                                {flight.arrDate && <span>Arr: {formatDate(flight.arrDate)} {flight.arrTime || ""}</span>}
                                                {flight.baggage && <span>Bag: {flight.baggage}</span>}
                                                {flight.meal && <span>Meal: {flight.meal}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {packageHotels.length > 0 && (
                            <div style={{ marginBottom: "14px" }}>
                                <div style={{ fontSize: "0.72rem", color: "#1D4ED8", fontWeight: 800, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Hotels</div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                                    {packageHotels.map((hotel: any, index: any) => (
                                        <div key={index} style={{ padding: "10px", background: "white", border: "1px solid #DBEAFE", borderRadius: "9px" }}>
                                            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0F172A", marginBottom: "3px" }}>{hotel.name || "Hotel N/A"}</div>
                                            <div style={{ fontSize: "0.73rem", color: "#64748B" }}>
                                                {[hotel.location?.city, hotel.location?.distance ? `${hotel.location.distance} from Haram` : "", `${hotel.nightCount || hotel.nights || 0} nights`].filter(Boolean).join(" - ")}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}


                    </div>

                    {canManage && (
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap", borderTop: "1px solid #E2E8F0", paddingTop: "16px" }}>
                            {[
                                { type: "payment", label: "Payment", color: "#2563EB", icon: <CreditCardIcon style={{ width: 14, height: 14 }} /> },
                                { type: "visa", label: "Visa", color: "#7C3AED", icon: <DocumentCheckIcon style={{ width: 14, height: 14 }} /> },
                                { type: "hotel", label: "Hotel", color: "#059669", icon: <HomeIcon style={{ width: 14, height: 14 }} /> },
                                { type: "overall", label: "Overall", color: "#0F766E", icon: <BuildingOffice2Icon style={{ width: 14, height: 14 }} /> },
                            ].map(({ type, label, color, icon }) => (
                                <button
                                    key={type}
                                    onClick={() => onUpdate(type)}
                                    style={{
                                        padding: "9px 16px", background: color, color: "white", border: "none",
                                        borderRadius: "9px", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem",
                                        display: "flex", alignItems: "center", gap: "6px", transition: "opacity 0.15s",
                                    }}
                                >{icon}{label}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// Status Modal
function StatusModal({ modalData, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState<any>({});
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const config: any = {
        payment: { label: "Payment", color: "#2563EB" },
        visa: { label: "Visa", color: "#7C3AED" },
        hotel: { label: "Hotel", color: "#059669" },
        overall: { label: "Overall", color: "#0F766E" },
    };
    const cfg = config[modalData.type];
    const currentStatus =
        modalData.type === "hotel"
            ? modalData.booking?.hotelStatus?.status
            : modalData.type === "overall"
                ? modalData.booking?.overallStatus
                : "";
    const isAlreadyConfirmed = currentStatus === "Confirmed";

    const fieldStyle: React.CSSProperties = {
        width: "100%", padding: "9px 11px", marginBottom: "12px",
        borderRadius: "9px", border: "1px solid #E2E8F0", fontSize: "0.82rem",
        outline: "none", color: "#0F172A", boxSizing: "border-box",
        transition: "border-color 0.15s",
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((modalData.type === "hotel" || modalData.type === "overall") && isAlreadyConfirmed && formData.status === "Confirmed") {
            toast.error(`${cfg.label} is already confirmed`);
            return;
        }
        setLoading(true);
        try {
            const data = new FormData();
            if (modalData.type === "payment") {
                data.append("paymentStatus", formData.paymentStatus);
                if (formData.paymentStatus === "Rejected") data.append("rejectionReason", formData.rejectionReason || "");
                if (file && formData.paymentStatus === "Approved") data.append("approvalProofFile", file);
                await reviewPayment(modalData.bookingId, data);
            } else if (modalData.type === "visa") {
                data.append("status", formData.status);
                if (formData.applicationNumber) data.append("applicationNumber", formData.applicationNumber);
                if (formData.approvalDate) data.append("approvalDate", formData.approvalDate);
                if (file) data.append("approvalDocument", file);
                if (formData.notes) data.append("notes", formData.notes);
                await updateVisaStatus(modalData.bookingId, data);
            } else if (modalData.type === "hotel") {
                data.append("status", formData.status);
                if (formData.confirmationNumber) data.append("confirmationNumber", formData.confirmationNumber);
                if (formData.bookingDate) data.append("bookingDate", formData.bookingDate);
                if (file) data.append("confirmationDocument", file);
                if (formData.notes) data.append("notes", formData.notes);
                await updateHotelStatus(modalData.bookingId, data);
            } else if (modalData.type === "overall") {
                const overallPayload: any = { status: formData.status };
                if (modalData.booking?.packageSource && modalData.booking.packageSource !== "local-db" && formData.status === "Confirmed") {
                    overallPayload.supplierDiscount = formData.supplierDiscount ?? 0;
                }
                await updateOverallStatus(modalData.bookingId, overallPayload);
            }
            toast.success(`${cfg.label} updated!`); onSuccess();
        } catch (error: any) { toast.error(error.response?.data?.message || "Failed"); }
        finally { setLoading(false); }
    };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99999, backdropFilter: "blur(2px)" }} />
            <div style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                width: "420px", background: "white", borderRadius: "16px", zIndex: 999999,
                padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>Update {cfg.label}</h3>
                    <button onClick={onClose} style={{ border: "none", background: "#F1F5F9", borderRadius: "7px", padding: "6px", cursor: "pointer", display: "flex" }}>
                        <XMarkIcon style={{ width: 16, height: 16, color: "#64748B" }} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    {modalData.type === "payment" && (
                        <>
                            <select value={formData.paymentStatus || ""} onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })} required style={fieldStyle}>
                                <option value="">Select status</option>
                                <option value="Approved">Approve</option>
                                <option value="Rejected">Reject</option>
                            </select>
                            {formData.paymentStatus === "Rejected" && (
                                <textarea placeholder="Rejection reason" value={formData.rejectionReason || ""} onChange={e => setFormData({ ...formData, rejectionReason: e.target.value })} style={{ ...fieldStyle, resize: "vertical" }} rows={3} required />
                            )}
                            {formData.paymentStatus === "Approved" && (
                                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ marginBottom: "12px", fontSize: "0.8rem" }} />
                            )}
                        </>
                    )}
                    {modalData.type === "visa" && (
                        <>
                            <select value={formData.status || ""} onChange={e => setFormData({ ...formData, status: e.target.value })} required style={fieldStyle}>
                                <option value="">Select status</option>
                                <option value="Not Applied">Not Applied</option><option value="Applied">Applied</option>
                                <option value="In Process">In Process</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>
                            </select>
                            {formData.status === "Approved" && (
                                <>
                                    <input type="text" placeholder="Application Number" value={formData.applicationNumber || ""} onChange={e => setFormData({ ...formData, applicationNumber: e.target.value })} style={fieldStyle} />
                                    <input type="date" value={formData.approvalDate || ""} onChange={e => setFormData({ ...formData, approvalDate: e.target.value })} style={fieldStyle} />
                                    <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ marginBottom: "12px", fontSize: "0.8rem" }} />
                                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ ...fieldStyle, resize: "vertical" }} rows={2} />
                                </>
                            )}
                        </>
                    )}
                    {modalData.type === "hotel" && (
                        <>
                            <select value={formData.status || ""} onChange={e => setFormData({ ...formData, status: e.target.value })} required style={fieldStyle}>
                                <option value="">Select status</option>
                                <option value="Not Booked">Not Booked</option><option value="Booked">Booked</option>
                                <option value="Confirmed" disabled={isAlreadyConfirmed}>Confirmed{isAlreadyConfirmed ? " (already confirmed)" : ""}</option><option value="Cancelled">Cancelled</option>
                            </select>
                            {formData.status === "Confirmed" && (
                                <>
                                    <input type="text" placeholder="Confirmation Number" value={formData.confirmationNumber || ""} onChange={e => setFormData({ ...formData, confirmationNumber: e.target.value })} style={fieldStyle} />
                                    <input type="date" value={formData.bookingDate || ""} onChange={e => setFormData({ ...formData, bookingDate: e.target.value })} style={fieldStyle} />
                                    <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ marginBottom: "12px", fontSize: "0.8rem" }} />
                                    <textarea placeholder="Notes" value={formData.notes || ""} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ ...fieldStyle, resize: "vertical" }} rows={2} />
                                </>
                            )}
                        </>
                    )}
                    {modalData.type === "overall" && (
                        <>
                            <select value={formData.status || ""} onChange={e => setFormData({ ...formData, status: e.target.value })} required style={fieldStyle}>
                                <option value="">Select status</option>
                                <option value="Pending">Pending</option><option value="Confirmed" disabled={isAlreadyConfirmed}>Confirmed{isAlreadyConfirmed ? " (already confirmed)" : ""}</option>
                                <option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>
                            </select>
                            {modalData.booking?.packageSource && modalData.booking.packageSource !== "local-db" && formData.status === "Confirmed" && (
                                <div>
                                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>
                                        Supplier Discount ({supplierSourceLabel(modalData.booking.packageSource)})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Enter supplier discount amount"
                                        value={formData.supplierDiscount ?? ""}
                                        onChange={e => setFormData({ ...formData, supplierDiscount: Number(e.target.value) || 0 })}
                                        style={{ ...fieldStyle }}
                                    />
                                    <div style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: "-8px", marginBottom: "12px" }}>
                                        {supplierSourceLabel(modalData.booking.packageSource)} will be credited: Selling Price − Supplier Discount
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                        <button
                            type="button" onClick={onClose}
                            style={{ flex: 1, padding: "10px", borderRadius: "9px", border: "1px solid #E2E8F0", background: "white", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}
                        >Cancel</button>
                        <button
                            type="submit" disabled={loading}
                            style={{ flex: 2, padding: "10px", borderRadius: "9px", border: "none", background: cfg.color, color: "white", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.82rem", fontWeight: 700, opacity: loading ? 0.75 : 1, transition: "opacity 0.15s" }}
                        >{loading ? "Updating..." : `Update ${cfg.label}`}</button>
                    </div>
                </form>
            </div>
        </>
    );
}

// Payment History Modal
function PaymentHistoryModal({ booking, onClose }: any) {
    const history = booking?.paymentStatus?.paymentHistory || [];
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 99999, backdropFilter: "blur(2px)" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "520px", maxHeight: "70vh", overflowY: "auto", background: "white", borderRadius: "12px", zIndex: 999999, padding: "18px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Payment History • #{booking.bookingNumber}</h3>
                    <button onClick={onClose} style={{ border: "none", background: "#F1F5F9", borderRadius: "7px", padding: "6px", cursor: "pointer", display: "flex" }}>
                        <XMarkIcon style={{ width: 16, height: 16, color: "#64748B" }} />
                    </button>
                </div>
                {history.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#64748B" }}>No payment records found.</div>
                ) : (
                    <div style={{ display: "grid", gap: "10px" }}>
                        {history.map((h: any, idx: number) => (
                            <div key={idx} style={{ border: "1px solid #E2E8F0", padding: "12px", borderRadius: "9px", background: "white" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
                                    <div style={{ fontWeight: 700 }}>{h.amount ? `PKR ${Number(h.amount).toLocaleString()}` : h.receiptNumber ? `Receipt ${h.receiptNumber}` : "Amount N/A"}</div>
                                    <div style={{ color: "#64748B", fontSize: "0.82rem" }}>{h.paymentDate ? new Date(h.paymentDate).toLocaleString() : h.createdAt ? new Date(h.createdAt).toLocaleString() : "-"}</div>
                                </div>
                                <div style={{ color: "#475569", fontSize: "0.85rem" }}>
                                    {h.method || h.paymentMethod || h.bank || "Method N/A"}
                                </div>
                                {h.paymentStatus && (
                                    <div style={{ marginTop: "6px", color: "#0F766E", fontSize: "0.82rem", fontWeight: 700 }}>
                                        Status: {h.paymentStatus}
                                    </div>
                                )}
                                {h.notes && <div style={{ marginTop: "6px", color: "#64748B", fontSize: "0.8rem" }}>{h.notes}</div>}
                                {h.receiptFile && (
                                    <a href={h.receiptFile} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", marginTop: "8px", fontSize: "0.8rem", color: "#2563EB", textDecoration: "none" }}>
                                        View Receipt
                                    </a>
                                )}
                                {!h.amount && !h.paymentDate && !h.receiptNumber && !h.notes && !h.receiptFile && (
                                    <pre style={{ marginTop: "8px", background: "#F8FAFC", padding: "8px", borderRadius: "6px", fontSize: "0.72rem", overflowX: "auto" }}>{JSON.stringify(h, null, 2)}</pre>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
