import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { Modal } from "../components/ui/modal";
import { getAllBookings } from "../Api/bookingApi";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

const CATEGORY_TO_GROUP_TYPE: Record<string, string> = {
    uae: "UAE Groups",
    ksa: "KSA Groups",
    muscat: "Mascat Groups",
    umrah: "Umrah Groups",
    all: "All",
};

const CATEGORY_LABELS: Record<string, string> = {
    uae: "UAE",
    ksa: "KSA",
    muscat: "Muscat",
    umrah: "Umrah",
    all: "All Groups",
};

interface Flight {
    airline: string;
    flightNo: string;
    depDate: string;
    depTime: string;
    arrDate: string;
    arrTime: string;
    sectorFrom: string;
    sectorTo: string;
    fromTerminal?: string;
    toTerminal?: string;
    flightClass?: string;
    baggage?: string;
    meal?: string;
}

interface Passenger {
    adults: number;
    children: number;
    infants: number;
}

interface Price {
    buyingCurrency: string;
    buyingAdultPrice: number;
    buyingChildPrice: number;
    buyingInfantPrice: number;
    sellingCurrencyB2B: string;
    sellingAdultPriceB2B: number;
    sellingChildPriceB2B: number;
    sellingInfantPriceB2B: number;
    total: number;
}

interface Payment {
    amount: number;
    method: "Cash" | "Bank" | "Online";
    status: "Pending" | "Paid" | "Refunded";
    paymentDate?: string;
}

interface GroupTicketing {
    _id: string;
    voucher_id: string;
    groupBookingId: string;
    user: { name: string; _id: string };
    evoucherAccount?: string;
    sector?: string;
    type?: string;
    airline?: string;
    groupCategory?: string;
    groupName?: string;
    showSeat?: boolean;
    groupType: string;
    flights: Flight[];
    passengers: Passenger;
    price: Price;
    payments: Payment[];
    totalSeats: number;
    pnr?: string;
    contactPersonPhone?: string;
    contactPersonEmail?: string;
    internalStatus?: string;
    createdAt: string;
    updatedAt: string;
}

interface Booking {
    _id: string;
    bookingReference: string;
    contactPersonName: string;
    sector: string;
    status: string;
    adultsCount: number;
    childrenCount: number;
    infantsCount: number;
    confirmedAdults?: number;
    confirmedChildren?: number;
    confirmedInfants?: number;
    totalPassengers: number;
    pricing: {
        grandTotal: number;
    };
    departureDate: string;
    createdAt: string;
    pnr?: string;
    flights?: {
        flightNo: string;
        depDate: string;
        origin?: string;
        destination?: string;
    }[];
    userId?: {
        _id: string;
        name: string;
        companyName?: string;
        agencyCode?: string;
    } | string;
    airline?: {
        name?: string;
        airline_name?: string;
    };
}

const LocalGroupsByCategory = () => {
    const { user } = useAuth();
    const canView = hasPermission(user, "view_groups");
    const canCreate = hasPermission(user, "create_group");
    const canUseActions = hasPermission(user, "group_ticketing_action_buttons");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const category = searchParams.get("category") || "all";

    const [bookings, setBookings] = useState<GroupTicketing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [entriesPerPage, setEntriesPerPage] = useState(50);

    // Modal state for viewing bookings
    const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
    const [filteredGroupBookings, setFilteredGroupBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<GroupTicketing | null>(null);

    const categoryTitle = CATEGORY_LABELS[category] || "Groups";
    const groupTypeFilter = CATEGORY_TO_GROUP_TYPE[category] || "All";

    useEffect(() => {
        if (canView) {
            fetchBookings();
        } else {
            setLoading(false);
        }
    }, [canView]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("admin_token");
            const response = await axiosInstance.get("/group-ticketing", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.data.success) {
                setBookings(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (bookingId: string) => {
        if (!canUseActions) {
            window.alert("You don't have permission to manage groups");
            return;
        }
        navigate(`/group-ticketing/edit/${bookingId}`);
    };

    const handleDelete = async (bookingId: string) => {
        if (!canUseActions) {
            window.alert("You don't have permission to manage groups");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this group?")) {
            return;
        }

        try {
            const token = localStorage.getItem("admin_token");
            const response = await axiosInstance.delete(`/group-ticketing/${bookingId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success) {
                window.alert("✅ Group deleted successfully!");
                fetchBookings();
            }
        } catch (error: any) {
            console.error("Error deleting group:", error);
            window.alert("❌ " + (error.response?.data?.message || "Failed to delete group"));
        }
    };

    const handleToggleInternalStatus = async (bookingId: string, currentValue: string) => {
        if (!canUseActions) {
            window.alert("You don't have permission to manage groups");
            return;
        }

        const newStatus = currentValue === "Public" ? "Private" : "Public";

        try {
            const token = localStorage.getItem("admin_token");

            const response = await axiosInstance.put(
                `/group-ticketing/${bookingId}`,
                { internalStatus: newStatus },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data.success) {
                setBookings((prev) =>
                    prev.map((group) =>
                        group._id === bookingId ? response.data.data : group
                    )
                );
            }
        } catch (error: any) {
            console.error("Error updating internal status:", error);
            window.alert("❌ " + (error.response?.data?.message || "Failed to update internal status"));
        }
    };

    const handleViewBookings = async (group: GroupTicketing) => {
        setSelectedGroup(group);
        setIsBookingsModalOpen(true);
        setLoadingBookings(true);

        try {
            // Fetch all bookings
            const response = await getAllBookings({ limit: 1000 });

            if (response.success && Array.isArray(response.data)) {
                const groupDepDate = new Date(group.flights[0]?.depDate);
                groupDepDate.setHours(0, 0, 0, 0);

                // Filter bookings by departure date
                const filtered = response.data.filter((booking: Booking) => {
                    const bookingDepDate = new Date(booking.departureDate);
                    bookingDepDate.setHours(0, 0, 0, 0);
                    return bookingDepDate.getTime() === groupDepDate.getTime();
                });

                setFilteredGroupBookings(filtered);
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
            window.alert("Failed to fetch bookings");
        } finally {
            setLoadingBookings(false);
        }
    };

    if (!canView) {
        return (
            <>
                <PageMeta title={`${categoryTitle} Local Groups - Access denied`} description="Access denied" />
                <PageBreadCrumb pageTitle={`${categoryTitle} Local Groups`} />
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
                    You do not have permission to view Groups.
                </div>
            </>
        );
    }

    const filteredBookings = bookings.filter(booking => {
        const matchesSearch =
            booking.voucher_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.groupBookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (booking.user?.name && booking.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (booking.groupName && booking.groupName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (booking.airline && booking.airline.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesGroupType = groupTypeFilter === "All" || booking.groupType === groupTypeFilter;

        return matchesSearch && matchesGroupType;
    });

    return (
        <>
            <PageMeta title={`${categoryTitle} Local Groups`} description={`View and manage ${categoryTitle.toLowerCase()} local groups`} />
            <PageBreadCrumb pageTitle={`${categoryTitle} Local Groups`} />

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
                <div className="px-4 py-6 md:px-6 xl:px-7.5">
                    {/* Header */}
                    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{categoryTitle} Local Groups</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Showing locally added groups for {categoryTitle}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate("/group-ticketing")}
                                className="rounded-lg bg-gray-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-600 transition"
                            >
                                View All Groups
                            </button>
                            <button
                                onClick={() => canCreate && navigate("/group-ticketing/create")}
                                disabled={!canCreate}
                                className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!canCreate ? "You don't have permission to create groups" : ""}
                            >
                                + Create New Group
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Search
                        </label>
                        <input
                            type="text"
                            placeholder="Search by voucher ID, group name, airline..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                    </div>

                    {/* Entries */}
                    <div className="mb-4 flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
                        <select
                            value={entriesPerPage}
                            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                            className="h-9 rounded border border-gray-300 bg-white px-3 text-sm outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-600 dark:text-gray-400">entries</span>
                    </div>

                    {/* Results count */}
                    <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                        Showing {filteredBookings.length} group(s)
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="text-gray-500 dark:text-gray-400">Loading groups...</div>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="text-gray-500 dark:text-gray-400 text-center">
                                <p className="font-medium mb-1">No groups found for {categoryTitle}</p>
                                <p className="text-sm">Try creating a new group or adjust your search</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead className="bg-gray-800 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">#</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Group & Voucher</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Sector (Route)</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Airline & PNR</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Available Seats</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Public</th>
                                        <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">B2B Price (Adult)</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800/50 dark:divide-gray-700">
                                    {filteredBookings.slice(0, entriesPerPage).map((booking, index) => (
                                        <tr key={booking._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            {/* Index */}
                                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                {index + 1}
                                            </td>

                                            {/* Group & Voucher Info */}
                                            <td className="px-4 py-4">
                                                <div className="text-sm font-bold text-gray-800 dark:text-white">
                                                    {booking.groupName || "Unnamed Group"}
                                                </div>
                                                <div className="text-[11px] text-gray-500 font-mono">{booking.voucher_id}</div>
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                        {booking.groupType}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Sector / Route */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                                                    <span>{booking.flights[0]?.sectorFrom || "N/A"}</span>
                                                    <span className="text-blue-500">➔</span>
                                                    <span>{booking.flights[booking.flights.length - 1]?.sectorTo || "N/A"}</span>
                                                </div>
                                                <div className="text-[11px] text-gray-500 mt-0.5">
                                                    {booking.flights[0]?.depTime} | {new Date(booking.flights[0]?.depDate).toLocaleDateString('en-GB')}
                                                </div>
                                            </td>

                                            {/* Airline & PNR */}
                                            <td className="px-4 py-4 text-sm">
                                                <div className="font-medium text-gray-700 dark:text-gray-300">
                                                    {booking.airline || "Multiple"}
                                                </div>
                                                {booking.pnr ? (
                                                    <div className="mt-1 inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800 rounded text-[11px] font-mono font-bold">
                                                        PNR: {booking.pnr}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No PNR</span>
                                                )}
                                            </td>

                                            {/* Seats */}
                                            <td className="px-4 py-4 text-sm text-center md:text-left">
                                                <div className="text-gray-800 dark:text-white font-bold text-base">
                                                    {booking.totalSeats}
                                                </div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Total Capacity</div>
                                            </td>

                                            <td className="px-4 py-4 text-sm">
                                                <div className="flex justify-center items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleInternalStatus(booking._id, booking.internalStatus || "Private")}
                                                        disabled={!canUseActions}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${booking.internalStatus === "Public"
                                                            ? "bg-emerald-500"
                                                            : "bg-gray-300 dark:bg-gray-700"
                                                            } ${!canUseActions
                                                                ? "opacity-50 cursor-not-allowed"
                                                                : "hover:bg-emerald-400"
                                                            }`}
                                                        title={
                                                            !canUseActions
                                                                ? "You don't have permission to manage groups"
                                                                : booking.internalStatus === "Public"
                                                                    ? "Set Private"
                                                                    : "Set Public"
                                                        }
                                                    >
                                                        <span
                                                            className={`inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${booking.internalStatus === "Public" ? "translate-x-5.5" : ""
                                                                }`}
                                                        />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Pricing */}
                                            <td className="px-4 py-4 text-sm">
                                                <div className="text-green-600 dark:text-green-400 font-bold">
                                                    PKR {booking.price.sellingAdultPriceB2B?.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Per Adult</div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-4 text-sm">
                                                <div className="flex justify-center items-center gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => handleViewBookings(booking)}
                                                        className="rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 transition-colors shadow-sm"
                                                        title="View bookings for this group's departure date"
                                                    >
                                                        View Bookings
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(booking._id)}
                                                        disabled={!canUseActions}
                                                        className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={!canUseActions ? "You don't have permission to manage groups" : ""}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(booking._id)}
                                                        disabled={!canUseActions}
                                                        className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={!canUseActions ? "You don't have permission to manage groups" : ""}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Bookings Modal */}
            <Modal
                isOpen={isBookingsModalOpen}
                onClose={() => {
                    setIsBookingsModalOpen(false);
                    setSelectedGroup(null);
                    setFilteredGroupBookings([]);
                }}
            // className="max-w-5xl"
            >
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                        Bookings for {selectedGroup?.groupName || "Group"}
                    </h2>

                    {selectedGroup && (
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Departure Date:</span>
                                    <span className="ml-2 text-gray-900 dark:text-white">
                                        {new Date(selectedGroup.flights[0]?.depDate).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Sector:</span>
                                    <span className="ml-2 text-gray-900 dark:text-white">
                                        {selectedGroup.flights[0]?.sectorFrom} → {selectedGroup.flights[selectedGroup.flights.length - 1]?.sectorTo}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {loadingBookings ? (
                        <div className="flex justify-center py-10">
                            <div className="text-gray-500 dark:text-gray-400">Loading bookings...</div>
                        </div>
                    ) : filteredGroupBookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400">No bookings found for this date</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-800 dark:bg-gray-900">
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase border border-gray-700">Sr #</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase border border-gray-700">BK #</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase border border-gray-700">BK Date</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase border border-gray-700">Agency</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase border border-gray-700">Group Detail</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase border border-gray-700">Price</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase border border-gray-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800/50">
                                    {filteredGroupBookings.map((booking, index) => {
                                        const userId = typeof booking.userId === 'object' ? booking.userId : null;
                                        const bkDate = new Date(booking.createdAt);
                                        const bkDateStr = bkDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
                                        const bkTimeStr = bkDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                                        const reqAdults = booking.adultsCount ?? 0;
                                        const reqChildren = booking.childrenCount ?? 0;
                                        const reqInfants = booking.infantsCount ?? 0;
                                        const reqTotal = reqAdults + reqChildren + reqInfants;
                                        const isConfirmed = booking.status === 'confirmed';
                                        const cnfAdults = booking.confirmedAdults ?? (isConfirmed ? reqAdults : 0);
                                        const cnfChildren = booking.confirmedChildren ?? (isConfirmed ? reqChildren : 0);
                                        const cnfInfants = booking.confirmedInfants ?? (isConfirmed ? reqInfants : 0);
                                        const cnfTotal = cnfAdults + cnfChildren + cnfInfants;

                                        const statusColors: Record<string, string> = {
                                            "on hold": "bg-yellow-500",
                                            "confirmed": "bg-green-600",
                                            "cancelled": "bg-red-600",
                                        };
                                        const statusBg = statusColors[booking.status] ?? "bg-gray-500";

                                        return (
                                            <tr key={booking._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 align-top">
                                                {/* Sr # */}
                                                <td className="px-3 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium">{index + 1}</td>

                                                {/* BK # */}
                                                <td className="px-3 py-3 border border-gray-200 dark:border-gray-700">
                                                    <div className="font-bold text-gray-800 dark:text-white">{booking.bookingReference}</div>
                                                </td>

                                                {/* BK Date */}
                                                <td className="px-3 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    <div>{bkDateStr}</div>
                                                    <div className="text-xs text-gray-500">Date: {bkDateStr} {bkTimeStr}</div>
                                                </td>

                                                {/* Agency */}
                                                <td className="px-3 py-3 border border-gray-200 dark:border-gray-700 min-w-45">
                                                    <div className="font-semibold text-gray-800 dark:text-white text-xs">
                                                        {userId?.companyName || booking.contactPersonName}
                                                    </div>
                                                    {userId?.agencyCode && (
                                                        <div className="text-xs text-gray-500">| {userId.agencyCode}</div>
                                                    )}
                                                    <div className="text-xs text-red-500 mt-0.5">
                                                        Added By User - {userId?.name || booking.contactPersonName}
                                                    </div>
                                                </td>

                                                {/* Group Detail */}
                                                <td className="px-3 py-3 border border-gray-200 dark:border-gray-700 min-w-105">
                                                    <table className="w-full text-xs border-collapse">
                                                        <thead>
                                                            <tr className="bg-gray-100 dark:bg-gray-700">
                                                                <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Flight #</th>
                                                                <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Dep Date</th>
                                                                <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Status</th>
                                                                <th className="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Adults</th>
                                                                <th className="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Child</th>
                                                                <th className="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Infant</th>
                                                                <th className="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {/* Req Row */}
                                                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 font-mono font-bold text-gray-800 dark:text-white">{booking.flights?.[0]?.flightNo || booking.sector}</td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                    {new Date(booking.flights?.[0]?.depDate || booking.departureDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">
                                                                    <span className="inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold bg-orange-500">Req</span>
                                                                </td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center text-gray-800 dark:text-white">{reqAdults}</td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center text-gray-800 dark:text-white">{reqChildren}</td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center text-gray-800 dark:text-white">{reqInfants}</td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center font-semibold text-gray-800 dark:text-white">{reqTotal}</td>
                                                            </tr>
                                                            {/* Cnf Row */}
                                                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 font-mono font-bold text-gray-800 dark:text-white">{booking.flights?.[0]?.flightNo || booking.sector}</td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                    {new Date(booking.flights?.[0]?.depDate || booking.departureDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600">
                                                                    <span className="inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold bg-green-600">Cnf</span>
                                                                </td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center text-gray-800 dark:text-white">{cnfAdults}</td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center text-gray-800 dark:text-white">{cnfChildren}</td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center text-gray-800 dark:text-white">{cnfInfants}</td>
                                                                <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center font-semibold text-gray-800 dark:text-white">{cnfTotal}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>

                                                {/* Price */}
                                                <td className="px-3 py-3 border border-gray-200 dark:border-gray-700 whitespace-nowrap font-semibold text-gray-800 dark:text-white">
                                                    PKR {booking.pricing.grandTotal.toLocaleString()} \-
                                                </td>

                                                {/* Status + Details */}
                                                <td className="px-3 py-3 border border-gray-200 dark:border-gray-700">
                                                    <div className="flex flex-col gap-2 items-start">
                                                        <span className={`inline-block px-3 py-1 rounded text-white text-xs font-semibold capitalize ${statusBg}`}>
                                                            {booking.status === 'on hold' ? 'On Hold' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                navigate(`/booking-detail/${booking._id}`);
                                                                setIsBookingsModalOpen(false);
                                                            }}
                                                            className="inline-block px-3 py-1 rounded bg-gray-700 hover:bg-gray-900 text-white text-xs font-semibold transition-colors"
                                                        >
                                                            Details
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                                Total: {filteredGroupBookings.length} booking(s) found
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default LocalGroupsByCategory;