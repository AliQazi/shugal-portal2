import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { Modal } from "../components/ui/modal";
import { getAllBookings } from "../Api/bookingApi";
import { getAllBookingsAdmin } from "../Api/umrahBookingApi";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import dayjs from 'dayjs'
import { Pencil, Copy, Trash2, Save, Loader2, ListChecks } from "lucide-react";
import { toast } from "react-toastify";

const GROUP_TYPE_OPTIONS = [
  "UAE Groups",
  "KSA Groups",
  "Bahrain Groups",
  "Mascat Groups",
  "Qatar Groups",
  "UK Groups",
  "Umrah Groups",
];

const STATUS_TABS = ["All", "Draft", "Private", "Public", "Sold", "Closed"];

interface Airline {
  _id: string;
  airlineCode: string;
  airlineName: string;
  shortCode: string;
}

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
  groupNo: string;
  user: { name: string; _id: string };
  postedBy?: { name?: string; email?: string; _id?: string };
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
  groupId?: string;
  bookingReference: string;
  contactPersonName: string;
  sector: string;
  status: string;
  ticketNumber?: string;
  ticketNo?: string;
  adultsCount?: number;
  childrenCount?: number;
  infantsCount?: number;
  totalPassengers: number;
  pricing: {
    adultPrice: number;
    childPrice?: number;
    infantPrice?: number;
    adultBasePrice?: number;
    childBasePrice?: number;
    infantBasePrice?: number;
    grandTotal: number;
  };
  departureDate: string;
  arrivalDate?: string;
  createdAt: string;
  flights?: {
    depDate?: string;
    depTime?: string;
    arrDate?: string;
    arrTime?: string;
  }[];
  airline?: {
    name?: string;
    airline_name?: string;
  };
  source?: "admin" | "al-haider" | "travel-network" | string;
}

interface UmrahPackageDetails {
  _id?: string;
  packageName?: string;
  selectedGroupTicketId?: string;
  packageTotals?: {
    double?: number;
    triple?: number;
    quad?: number;
    shared?: number;
    childWithoutBed?: number;
    infant?: number;
  };
  flights?: Flight[];
}

interface UmrahPackageBooking {
  _id: string;
  bookingNumber: string;
  packageName: string;
  roomType?: string;
  packageId?: string | UmrahPackageDetails;
  passengerCount?: {
    adults?: number;
    children?: number;
    infants?: number;
    total?: number;
  };
  pricing?: {
    pricePerPerson?: number;
    adultTotal?: number;
    childTotal?: number;
    infantTotal?: number;
    totalPrice?: number;
    currency?: string;
  };
  overallStatus: string;
  packageSource?: "local-db" | "travel-network" | string;
  createdAt: string;
  flightDetails?: {
    departure?: { date?: string; from?: string; to?: string; flightNumber?: string };
    return?: { date?: string; from?: string; to?: string; flightNumber?: string };
  };
  user?: {
    name?: string;
    companyName?: string;
  };
}

interface BookedSeatsData {
  groupId: string;
  groupType: string;
  totalSeats: number;
  totalAdults: number;
  totalChildren: number;
  totalInfants: number;
  totalBookings: number;
}

const formatCurrency = (amount?: number, currency = "PKR") => {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return "-";
  return `${currency} ${Number(amount).toLocaleString()}`;
};

interface PriceEditValues {
  sellingAdultPriceB2B: number;
  sellingChildPriceB2B: number;
  sellingInfantPriceB2B: number;
}

const GroupPricingMiniTable = ({
  booking,
  canEdit,
  onSave,
}: {
  booking: GroupTicketing;
  canEdit: boolean;
  onSave: (bookingId: string, price: PriceEditValues) => Promise<boolean>;
}) => {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<PriceEditValues>({
    sellingAdultPriceB2B: booking.price.sellingAdultPriceB2B || 0,
    sellingChildPriceB2B: booking.price.sellingChildPriceB2B || 0,
    sellingInfantPriceB2B: booking.price.sellingInfantPriceB2B || 0,
  });

  useEffect(() => {
    setDraft({
      sellingAdultPriceB2B: booking.price.sellingAdultPriceB2B || 0,
      sellingChildPriceB2B: booking.price.sellingChildPriceB2B || 0,
      sellingInfantPriceB2B: booking.price.sellingInfantPriceB2B || 0,
    });
  }, [
    booking.price.sellingAdultPriceB2B,
    booking.price.sellingChildPriceB2B,
    booking.price.sellingInfantPriceB2B,
  ]);

  const updateDraft = (field: keyof PriceEditValues, value: string) => {
    const numeric = Number(value.replace(/[^0-9]/g, "")) || 0;
    setDraft((prev) => ({ ...prev, [field]: numeric }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(booking._id, draft);
    setSaving(false);
  };

  const inputClass =
    "w-20 rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-800 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

  const rows: { label: string; field: keyof PriceEditValues; value: number }[] = [
    { label: "Adult", field: "sellingAdultPriceB2B", value: draft.sellingAdultPriceB2B },
    { label: "Child", field: "sellingChildPriceB2B", value: draft.sellingChildPriceB2B },
    { label: "Infant", field: "sellingInfantPriceB2B", value: draft.sellingInfantPriceB2B },
  ];

  return (
    <div className="flex items-center justify-center">
      <div className="mt-3 w-fit">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white text-xs dark:border-gray-700 dark:bg-gray-900/40">
          <table className="border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <th className="px-2 py-1.5 text-left font-bold">Type</th>
                <th className="px-2 py-1.5 text-left font-bold">Selling</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.field}
                  className="border-t border-gray-100 text-green-600 dark:border-gray-800 dark:text-green-300"
                >
                  <td className="px-2 py-1.5 font-bold">{row.label}</td>
                  <td className="px-2 py-1.5">
                    {canEdit ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.value ? row.value.toLocaleString() : ""}
                        onChange={(e) => updateDraft(row.field, e.target.value)}
                        className={inputClass}
                        placeholder="0"
                      />
                    ) : (
                      <span className="font-semibold">
                        {formatCurrency(row.value, booking.price.sellingCurrencyB2B)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-2 flex justify-center items-center w-full gap-1.5 rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </div>
  );
};

const GroupTicketing = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, "view_groups");
  const canCreate = hasPermission(user, "create_group");
  const canUseActions = hasPermission(user, "group_ticketing_action_buttons");
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState<GroupTicketing[]>([]);
  const [loading, setLoading] = useState(true);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [bookedSeatsData, setBookedSeatsData] = useState<Map<string, BookedSeatsData>>(new Map());

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("All");
  const [groupTypeFilter, setGroupTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [entriesPerPage, setEntriesPerPage] = useState(50);

  // Modal state for viewing bookings
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState(false);
  const [filteredGroupBookings, setFilteredGroupBookings] = useState<Booking[]>([]);
  const [filteredUmrahBookings, setFilteredUmrahBookings] = useState<UmrahPackageBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupTicketing | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicketBooking, setSelectedTicketBooking] = useState<Booking | null>(null);
  const [ticketNumber, setTicketNumber] = useState("");
  const [isSavingTicket, setIsSavingTicket] = useState(false);

  useEffect(() => {
    if (canView) {
      fetchBookings();
      fetchBookedSeats();
      fetchAirlines();
    } else {
      setLoading(false);
    }
  }, [canView]);

  const fetchAirlines = async () => {
    try {
      const response = await axiosInstance.get("/airline");
      setAirlines(response.data?.data || response.data || []);
    } catch (error) {
      console.error("Error fetching airlines:", error);
    }
  };

  const getAirlineShortCode = (airlineName?: string) => {
    if (!airlineName) return undefined;
    const match = airlines.find(
      (a) => a.airlineName?.toLowerCase() === airlineName.toLowerCase()
    );
    return match?.shortCode;
  };

  useEffect(() => {
    const queryGroupType = new URLSearchParams(location.search).get("groupType");
    setGroupTypeFilter(queryGroupType || "All");
  }, [location.search]);

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

  const fetchBookedSeats = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axiosInstance.get("/bookings/getBookedSeats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success && response.data.data.breakdown?.byGroup) {
        const seatsMap = new Map<string, BookedSeatsData>();
        response.data.data.breakdown.byGroup.forEach((item: BookedSeatsData) => {
          if (item.groupId) {
            seatsMap.set(item.groupId, item);
          }
        });
        setBookedSeatsData(seatsMap);
      }
    } catch (error) {
      console.error("Error fetching booked seats:", error);
    }
  };

  const handleEdit = (bookingId: string) => {
    if (!canUseActions) {
      window.alert("You don't have permission to manage groups");
      return;
    }
    navigate(`/group-ticketing/edit/${bookingId}`);
  };

  const handleCopy = (bookingId: string) => {
    if (!canCreate) {
      window.alert("You don't have permission to create groups");
      return;
    }
    window.open(`/admin-portal/group-ticketing/create/${bookingId}`, "_blank", "noopener,noreferrer");
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
        fetchBookedSeats();
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
    setFilteredGroupBookings([]);
    setFilteredUmrahBookings([]);

    try {
      const [groupBookingResponse, umrahBookingResponse] = await Promise.all([
        getAllBookings({ limit: 1000 }),
        getAllBookingsAdmin(),
      ]);

      if (groupBookingResponse.success && Array.isArray(groupBookingResponse.data)) {
        const groupDepDate = new Date(group.flights[0]?.depDate);
        groupDepDate.setHours(0, 0, 0, 0);

        const filtered = groupBookingResponse.data.filter((booking: Booking) => {
          if (booking.groupId) return booking.groupId === group._id;

          const bookingDepDate = new Date(booking.departureDate);
          bookingDepDate.setHours(0, 0, 0, 0);
          return bookingDepDate.getTime() === groupDepDate.getTime();
        });

        setFilteredGroupBookings(filtered);
      }

      if (umrahBookingResponse.success && Array.isArray(umrahBookingResponse.data)) {
        const filtered = umrahBookingResponse.data.filter((booking: UmrahPackageBooking) => {
          if (!booking.packageId || typeof booking.packageId === "string") return false;
          return booking.packageId.selectedGroupTicketId === group._id;
        });

        setFilteredUmrahBookings(filtered);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      window.alert("Failed to fetch bookings");
    } finally {
      setLoadingBookings(false);
    }
  };


  const getBookingTicketNumber = (booking?: Booking | null) => {
    return booking?.ticketNumber || booking?.ticketNo || "";
  };

  const isConfirmedStatus = (status?: string) => {
    return (status || "").toLowerCase() === "confirmed";
  };

  const closeTicketModal = () => {
    setIsTicketModalOpen(false);
    setSelectedTicketBooking(null);
    setTicketNumber("");
  };

  const openTicketModal = (booking: Booking) => {
    setSelectedTicketBooking(booking);
    setTicketNumber(getBookingTicketNumber(booking));
    setIsTicketModalOpen(true);
  };

  const handleSaveTicketNumber = async () => {
    if (!canUseActions) {
      window.alert("You don't have permission to manage bookings");
      return;
    }

    if (!selectedTicketBooking?._id) return;

    const cleanTicketNumber = ticketNumber.trim();

    if (!cleanTicketNumber) {
      window.alert("Ticket number is required");
      return;
    }

    if (!isConfirmedStatus(selectedTicketBooking.status)) {
      window.alert("Ticket number can be added only for confirmed bookings");
      return;
    }

    try {
      setIsSavingTicket(true);
      const token = localStorage.getItem("admin_token");

      const response = await axiosInstance.patch(
        `/bookings/${selectedTicketBooking._id}/ticket-number`,
        { ticketNumber: cleanTicketNumber },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setFilteredGroupBookings((prev) =>
          prev.map((booking) =>
            booking._id === selectedTicketBooking._id
              ? {
                ...booking,
                ticketNumber:
                  response.data.data?.ticketNumber ||
                  response.data.data?.ticketNo ||
                  cleanTicketNumber,
                ticketNo:
                  response.data.data?.ticketNo ||
                  response.data.data?.ticketNumber ||
                  cleanTicketNumber,
              }
              : booking
          )
        );

        window.alert("✅ Ticket number saved successfully!");
        closeTicketModal();
      }
    } catch (error: any) {
      console.error("Error saving ticket number:", error);
      window.alert("❌ " + (error.response?.data?.message || "Failed to save ticket number"));
    } finally {
      setIsSavingTicket(false);
    }
  };

  const sectorOptions = useMemo(() => {
    const sectors = new Set<string>();
    bookings.forEach((booking) => {
      if (booking.sector) sectors.add(booking.sector);
    });
    return Array.from(sectors).sort((a, b) => a.localeCompare(b));
  }, [bookings]);

  const filteredBookings = bookings
    .filter(booking => {
      const matchesSearch =
        booking.voucher_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.groupBookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.user?.name && booking.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (booking.postedBy?.name && booking.postedBy.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (booking.postedBy?.email && booking.postedBy.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (booking.groupName && booking.groupName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (booking.airline && booking.airline.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSector = sectorFilter === "All" || booking.sector === sectorFilter;

      const matchesGroupType = groupTypeFilter === "All" || booking.groupType === groupTypeFilter;

      const matchesStatus = statusFilter === "All" || booking.internalStatus === statusFilter;

      return matchesSearch && matchesSector && matchesGroupType && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = a.flights?.[0]?.depDate ? new Date(a.flights[0].depDate).getTime() : Number.MAX_SAFE_INTEGER;
      const dateB = b.flights?.[0]?.depDate ? new Date(b.flights[0].depDate).getTime() : Number.MAX_SAFE_INTEGER;

      return dateA - dateB;
    });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: bookings.length };
    STATUS_TABS.forEach((status) => {
      if (status !== "All") counts[status] = 0;
    });
    bookings.forEach((booking) => {
      const status = booking.internalStatus;
      if (status && counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [bookings]);

  const handleSavePricing = async (bookingId: string, priceUpdates: PriceEditValues): Promise<boolean> => {
    if (!canUseActions) {
      window.alert("You don't have permission to manage groups");
      return false;
    }

    const target = bookings.find((group) => group._id === bookingId);
    if (!target) return false;

    try {
      const token = localStorage.getItem("admin_token");
      const response = await axiosInstance.put(
        `/group-ticketing/${bookingId}`,
        {
          price: { ...target.price, ...priceUpdates },
          // Sent alongside price so the backend's partial-update route doesn't
          // reset totalSeatsAfterPartial (it recomputes from these two fields
          // on every PUT, defaulting missing ones to 0).
          totalSeats: target.totalSeats,
          partialSeats: (target as unknown as { partialSeats?: number }).partialSeats || 0,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setBookings((prev) =>
          prev.map((group) => (group._id === bookingId ? response.data.data : group))
        );
        toast.success("Pricing updated successfully!");
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Error updating pricing:", error);
      toast.error(error.response?.data?.message || "Failed to update pricing");
      return false;
    }
  };

  const statusBadgeClass = (status?: string) => {
    const normalized = (status || "").toLowerCase();
    if (["confirmed", "completed", "paid", "approved"].includes(normalized)) {
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    }
    if (["cancelled", "rejected"].includes(normalized)) {
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
    }
    if (["pending", "on hold", "processing", "in progress"].includes(normalized)) {
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
    }
    return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700";
  };

  const sourceBadge = (source?: string) => {
    if (source === "travel-network") {
      return { label: "Travel Network", className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800" };
    }
    if (source === "al-haider") {
      return { label: "Al-Haider", className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800" };
    }
    return { label: "Own", className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700" };
  };

  const formatDateTime = (date?: string, time?: string) => {
    const formattedDate = date ? dayjs(date).format("ddd, DD MMM YYYY") : "N/A";
    return time ? `${formattedDate} | ${time}` : formattedDate;
  };

  const PassengerSummary = ({
    adults = 0,
    children = 0,
    infants = 0,
    bookings,
  }: {
    adults?: number;
    children?: number;
    infants?: number;
    bookings?: number;
  }) => {
    // const total = adults + children + infants;

    return (
      <div className="min-w-34 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/40">
        {/* <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Passengers</span>
          <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-gray-900">{total}</span>
        </div> */}
        <div className="grid grid-cols-3 gap-1 text-center">
          {[
            ["Adult", adults],
            ["Child", children],
            ["Infant", infants],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-white px-1.5 py-1 shadow-sm dark:bg-gray-800">
              <div className="text-[9px] font-semibold uppercase text-gray-400">{label}</div>
              <div className="text-sm font-bold text-gray-800 dark:text-white">{value}</div>
            </div>
          ))}
        </div>
        {bookings !== undefined && (
          <div className="mt-2 text-center text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {bookings} booking{bookings === 1 ? "" : "s"}
          </div>
        )}
      </div>
    );
  };

  if (!canView) {
    return (
      <>
        <PageMeta title="Group Ticketing - Access denied" description="Access denied" />
        <PageBreadCrumb pageTitle="Group Ticketing" />
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
          You do not have permission to view Groups.
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Group Ticketing" description="Manage group ticketing groups" />
      <PageBreadCrumb pageTitle="Group Ticketing" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="px-4 py-6 md:px-6 xl:px-7.5">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Group Tickets</h2>
            <button
              onClick={() => canCreate && navigate("/group-ticketing/create")}
              disabled={!canCreate}
              className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canCreate ? "You don't have permission to create groups" : ""}
            >
              + Create New Group
            </button>
          </div>

          {/* Status Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${statusFilter === status
                  ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
              >
                {status}
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${statusFilter === status
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                >
                  {statusCounts[status] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Sector
              </label>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="All">All Sectors</option>
                {sectorOptions.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Group Type
              </label>
              <select
                value={groupTypeFilter}
                onChange={(e) => setGroupTypeFilter(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="All">All Types</option>
                {GROUP_TYPE_OPTIONS.map((groupType) => (
                  <option key={groupType} value={groupType}>
                    {groupType}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Search
              </label>
              <input
                type="text"
                placeholder="Search ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
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

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">Loading groups...</div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">No groups found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-800 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">#</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Group & Voucher</th>
                    {/* <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Sector (Route)</th> */}
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Airline & PNR</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Passengers (A/C/I)</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Pricing</th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800/50 dark:divide-gray-700">
                  {filteredBookings.slice(0, entriesPerPage).map((booking, index) => {
                    const bookedInfo = bookedSeatsData.get(booking._id);
                    const bookedSeats = bookedInfo?.totalSeats || 0;
                    const totalSeats = booking.totalSeats || 0;
                    const remainingSeats = totalSeats - bookedSeats;
                    const bookedPercentage = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;
                    const postedBy = booking.postedBy;

                    return (
                      <tr key={booking._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        {/* Index */}
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {index + 1}
                        </td>

                        {/* Group & Voucher Info */}
                        <td className="px-4 py-4">
                          {booking.groupNo &&
                            <p className="text-xs font-semibold dark:text-white mb-1">
                              ({booking.groupNo || "-"})
                            </p>
                          }
                          {/* <div className="text-sm font-bold text-gray-800 dark:text-white">
                            {booking.groupName || "Unnamed Group"}
                          </div> */}
                          <div className="text-sm text-gray-800 font-semibold dark:text-white">
                            Sector: {booking.sector || "Unnamed Group"}
                          </div>
                          {/* <div className="text-[11px] text-gray-500 font-mono">{booking.voucher_id}</div> */}
                          <div className="mt-1">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              {booking.groupType}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 text-[11px] font-semibold">
                            <div className="text-green-600 dark:text-green-400">
                              Dep: {formatDateTime(
                                booking.flights?.[0]?.depDate,
                                booking.flights?.[0]?.depTime,
                              )}
                            </div>
                            <div className="text-red-500 dark:text-red-300">
                              Arr: {formatDateTime(
                                booking.flights?.[booking.flights.length - 1]?.depDate ||
                                booking.flights?.[booking.flights.length - 1]?.arrDate,
                                booking.flights?.[booking.flights.length - 1]?.arrTime,
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Airline & PNR */}
                        <td className="px-4 py-4 text-sm">
                          <div className="font-medium text-gray-700 dark:text-gray-300">
                            {getAirlineShortCode(booking.airline) || booking.airline || "Multiple"}
                          </div>
                          {booking.pnr ? (
                            <div className="flex items-center gap-1">
                              <div className="mt-1.5 inline-block px-1.5 py-0.5 bg-linear-to-r from-blue-500 to-blue-600 text-white border-2 border-blue-400 rounded-md text-sm font-mono font-bold shadow-md">
                                PNR: {booking.pnr}
                              </div>

                              {booking.flights[0]?.flightClass && (
                                <div className="mt-1.5">
                                  <span className={`inline-block px-1.5 py-0.5 text-[11px] font-semibold rounded-md ${booking.flights[0].flightClass.toLowerCase().includes('business')
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400'
                                    : booking.flights[0].flightClass.toLowerCase().includes('first')
                                      ? 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-400'
                                      : 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-900/30 dark:text-gray-400'
                                    }`}>
                                    {booking.flights[0].flightClass}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No PNR</span>
                          )}

                          <div className="mt-2">
                            <p className="text-xs mb-1 font-semibold">Posted By:</p>
                            <div className="text-sm text-gray-800 dark:text-white">
                              {postedBy?.name || "-"}
                            </div>
                            {/* <div className="mt-0.5 break-all text-xs text-gray-500 dark:text-gray-400">
                              {postedBy?.email || "-"}
                            </div> */}
                          </div>
                        </td>

                        {/* Passenger Breakdown */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800 dark:text-white">
                                {bookedSeats} / {totalSeats}
                              </span>
                              <span className="text-xs text-gray-500">booked</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${bookedPercentage >= 90 ? 'bg-red-500' :
                                  bookedPercentage >= 70 ? 'bg-yellow-500' :
                                    bookedPercentage >= 50 ? 'bg-blue-500' :
                                      bookedPercentage > 0 ? 'bg-green-500' : 'bg-gray-400'
                                  }`}
                                style={{ width: `${bookedPercentage}%` }}
                              />
                            </div>
                            {remainingSeats > 0 && (
                              <div className="text-[10px] text-green-600 dark:text-green-400">
                                {remainingSeats} seats available
                              </div>
                            )}
                            {remainingSeats === 0 && totalSeats > 0 && (
                              <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                                FULLY BOOKED
                              </div>
                            )}
                          </div>

                          <PassengerSummary
                            adults={bookedInfo?.totalAdults || 0}
                            children={bookedInfo?.totalChildren || 0}
                            infants={bookedInfo?.totalInfants || 0}
                            bookings={bookedInfo?.totalBookings || 0}
                          />
                        </td>

                        {/* Pricing */}
                        <td className="px-4 py-4 text-sm">
                          <GroupPricingMiniTable
                            booking={booking}
                            canEdit={canUseActions}
                            onSave={handleSavePricing}
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-sm">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleEdit(booking._id)}
                                disabled={!canUseActions}
                                className="rounded-md bg-blue-500 p-1.5 text-white hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!canUseActions ? "You don't have permission to manage groups" : "Edit"}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleCopy(booking._id)}
                                disabled={!canCreate}
                                className="rounded-md bg-purple-600 p-1.5 text-white hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!canCreate ? "You don't have permission to create groups" : "Open the create form pre-filled with this group's data"}
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(booking._id)}
                                disabled={!canUseActions}
                                className="rounded-md bg-red-500 p-1.5 text-white hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!canUseActions ? "You don't have permission to manage groups" : "Delete"}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <button
                              onClick={() => handleViewBookings(booking)}
                              className="rounded-md bg-green-500 px-2.5 py-1.5 text-xs whitespace-nowrap font-semibold text-white hover:bg-green-600 transition-colors shadow-sm"
                              title="View bookings for this group's departure date"
                            >
                              View Bookings
                            </button>

                            <div className="flex justify-center items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleInternalStatus(booking._id, booking.internalStatus || "Private")}
                                disabled={!canUseActions}
                                className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ${booking.internalStatus === 'Public' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'} ${!canUseActions ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-400'}`}
                                title={!canUseActions ? "You don't have permission to manage groups" : booking.internalStatus === 'Public' ? "Set Private" : "Set Public"}
                              >
                                <span className={`inline-block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${booking.internalStatus === 'Public' ? 'translate-x-5.5' : ''}`} />
                              </button>
                              <span className={`text-xs font-semibold ${booking.internalStatus === 'Public' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {booking.internalStatus || "Private"}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          setFilteredUmrahBookings([]);
          closeTicketModal();
        }}
        className="max-w-7xl"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-4 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Bookings for {selectedGroup?.groupName || "Group"}
            </h2>

            {selectedGroup && (
              <button
                onClick={() =>
                  window.open(`/admin-portal/group-passenger-list/${selectedGroup._id}`, "_blank", "noopener,noreferrer")
                }
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold text-white shadow-sm transition-all bg-[linear-gradient(to_top,#06911b,#11bd2b)] hover:bg-[linear-gradient(to_top,#057a16,#0ea324)] active:scale-95"
              >
                <ListChecks size={16} />
                Passenger List Report
              </button>
            )}
          </div>

          {selectedGroup && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Departure Date:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {formatDateTime(
                      selectedGroup.flights[0]?.depDate,
                      selectedGroup.flights[0]?.depTime,
                    )}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Sector:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {selectedGroup.flights && selectedGroup.flights.length > 0
                        ? selectedGroup.flights
                          .map((flight) => `${flight.sectorFrom} → ${flight.sectorTo}`)
                          .join(" | ")
                        : "N/A"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {loadingBookings ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">Loading bookings...</div>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-1 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white">Group Ticket Bookings</h3>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {filteredGroupBookings.length} booking{filteredGroupBookings.length === 1 ? "" : "s"}
                  </span>
                </div>

                {filteredGroupBookings.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No group ticket bookings found for this group.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead className="bg-gray-800 dark:bg-gray-950">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Booking</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Dep/Arr Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Passengers</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800/50">
                        {filteredGroupBookings.map((booking) => {
                          const departureFlight =
                            booking.flights?.[0] || selectedGroup?.flights?.[0];
                          const arrivalFlight =
                            booking.flights?.[booking.flights.length - 1] ||
                            selectedGroup?.flights?.[selectedGroup.flights.length - 1];
                          const bookingSource = sourceBadge(booking.source);

                          return (
                            <tr key={booking._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                              <td className="px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {dayjs(booking.createdAt).format("ddd, DD MMM YYYY")}
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm font-bold text-gray-800 dark:text-white">{booking.bookingReference}</div>
                                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{booking.contactPersonName}</div>
                                <div className="mt-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{booking.sector}</div>
                                <div className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${bookingSource.className}`}>
                                  {bookingSource.label}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <div className="font-semibold text-green-600 dark:text-green-400">
                                  Dep: {formatDateTime(
                                    departureFlight?.depDate || booking.departureDate,
                                    departureFlight?.depTime,
                                  )}
                                </div>
                                <div className="mt-1 font-semibold text-red-500 dark:text-red-300">
                                  Arr: {formatDateTime(
                                    arrivalFlight?.depDate || arrivalFlight?.arrDate || booking.arrivalDate,
                                    arrivalFlight?.arrTime,
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <PassengerSummary
                                  adults={booking.adultsCount || 0}
                                  children={booking.childrenCount || 0}
                                  infants={booking.infantsCount || 0}
                                />
                              </td>
                              <td className="px-4 py-4">
                                <div className="min-w-60 overflow-hidden rounded-lg border border-gray-200 text-xs dark:border-gray-700">
                                  <table className="w-full">
                                    <tbody>
                                      <tr className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                        <td className="px-2 py-1.5 font-bold">Base</td>
                                        <td className="px-2 py-1.5">A {formatCurrency(booking.pricing.adultBasePrice || booking.pricing.adultPrice)}</td>
                                        <td className="px-2 py-1.5">C {formatCurrency(booking.pricing.childBasePrice || booking.pricing.childPrice)}</td>
                                        <td className="px-2 py-1.5">I {formatCurrency(booking.pricing.infantBasePrice || booking.pricing.infantPrice)}</td>
                                      </tr>
                                      <tr className="text-green-700 dark:text-green-300">
                                        <td className="px-2 py-1.5 font-bold">Selling</td>
                                        <td className="px-2 py-1.5">A {formatCurrency(booking.pricing.adultPrice)}</td>
                                        <td className="px-2 py-1.5">C {formatCurrency(booking.pricing.childPrice)}</td>
                                        <td className="px-2 py-1.5">I {formatCurrency(booking.pricing.infantPrice)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <div className="mt-1 text-xs font-bold text-gray-800 dark:text-white">
                                  Total: {formatCurrency(booking.pricing.grandTotal)}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusBadgeClass(booking.status)}`}>
                                  {booking.status}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col items-start gap-2">
                                  <button
                                    onClick={() => {
                                      navigate(`/booking-detail/${booking._id}`);
                                      setIsBookingsModalOpen(false);
                                    }}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    View Details
                                  </button>

                                  {isConfirmedStatus(booking.status) && canUseActions && (
                                    <button
                                      type="button"
                                      onClick={() => openTicketModal(booking)}
                                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                                    >
                                      {getBookingTicketNumber(booking) ? "Update Ticket No" : "Add Ticket No"}
                                    </button>
                                  )}

                                  {getBookingTicketNumber(booking) && (
                                    <div className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                      Ticket: {getBookingTicketNumber(booking)}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-1 border-b border-gray-200 bg-emerald-50 px-4 py-3 dark:border-gray-700 dark:bg-emerald-900/20 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white">Umrah Package Bookings</h3>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {filteredUmrahBookings.length} booking{filteredUmrahBookings.length === 1 ? "" : "s"}
                  </span>
                </div>

                {filteredUmrahBookings.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No Umrah package bookings linked with this group.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead className="bg-gray-800 dark:bg-gray-950">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Package / Booking</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Dep/Arr Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Passengers</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800/50">
                        {filteredUmrahBookings.map((booking) => {
                          const pkg = typeof booking.packageId === "object" ? booking.packageId : null;
                          const depFlight = pkg?.flights?.[0] || selectedGroup?.flights?.[0];
                          const arrFlight =
                            pkg?.flights?.[pkg.flights.length - 1] ||
                            selectedGroup?.flights?.[selectedGroup.flights.length - 1];
                          const packageSource = sourceBadge(
                            booking.packageSource === "travel-network" ? "travel-network" : "admin",
                          );

                          return (
                            <tr key={booking._id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                              <td className="px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {dayjs(booking.createdAt).format("ddd, DD MMM YYYY")}
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm font-bold text-gray-800 dark:text-white">{booking.packageName}</div>
                                <div className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{booking.bookingNumber}</div>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                    {booking.roomType || "Package"}
                                  </span>
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${packageSource.className}`}>
                                    {packageSource.label}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <div className="font-semibold text-green-600 dark:text-green-400">
                                  Dep: {formatDateTime(
                                    booking.flightDetails?.departure?.date || depFlight?.depDate,
                                    depFlight?.depTime,
                                  )}
                                </div>
                                <div className="mt-1 font-semibold text-red-500 dark:text-red-300">
                                  Arr: {formatDateTime(
                                    booking.flightDetails?.return?.date ||
                                    arrFlight?.depDate ||
                                    arrFlight?.arrDate,
                                    arrFlight?.arrTime,
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <PassengerSummary
                                  adults={booking.passengerCount?.adults || 0}
                                  children={booking.passengerCount?.children || 0}
                                  infants={booking.passengerCount?.infants || 0}
                                />
                              </td>
                              <td className="px-4 py-4">
                                <div className="min-w-56 overflow-hidden rounded-lg border border-gray-200 text-xs dark:border-gray-700">
                                  <table className="w-full">
                                    <tbody>
                                      <tr className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                        <td className="px-2 py-1.5 font-bold">Package</td>
                                        <td className="px-2 py-1.5">{formatCurrency(booking.pricing?.pricePerPerson, booking.pricing?.currency)}</td>
                                      </tr>
                                      <tr className="text-gray-700 dark:text-gray-300">
                                        <td className="px-2 py-1.5 font-bold">Total</td>
                                        <td className="px-2 py-1.5 font-semibold">{formatCurrency(booking.pricing?.totalPrice, booking.pricing?.currency)}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(booking.overallStatus)}`}>
                                  {booking.overallStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </Modal>

      {/* Ticket Number Modal */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={closeTicketModal}
        className="max-w-md"
      >
        <div className="p-6">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              {getBookingTicketNumber(selectedTicketBooking) ? "Update Ticket Number" : "Add Ticket Number"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Booking:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {selectedTicketBooking?.bookingReference || "N/A"}
              </span>
            </p>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Ticket Number
            </label>
            <input
              type="text"
              value={ticketNumber}
              onChange={(event) => setTicketNumber(event.target.value)}
              placeholder="Enter ticket number"
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeTicketModal}
              disabled={isSavingTicket}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTicketNumber}
              disabled={isSavingTicket || !ticketNumber.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingTicket ? "Saving..." : "Save Ticket No"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default GroupTicketing;
