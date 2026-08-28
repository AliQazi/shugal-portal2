import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import axiosInstance from "../../api/axios";
import { toast } from "react-toastify";
// import { generateBookingPDF } from "../../utils";
import { format } from "date-fns";
import MaskedDatePicker from "../../components/MaskedDatePicker";
import { printGDSBooking } from "../../utils/bookingPDFService";
import { Check } from "lucide-react";
// import { generateClientPDF } from "../../utils/genrateclientpdf";
import TopBar from "../../components/TopBar/TopBar";
import FlipClockCountdown from "@leenguyen/react-flip-clock-countdown";
import "@leenguyen/react-flip-clock-countdown/dist/index.css";
import { theme } from "../../theme/theme";
import UmrahPackageBookings from "../Frontend/UmrahPackagebooking/UmrahPackageBooking";

export default function MyBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "umrah" ? "umrah" : "group";
  const [bookings, setBookings] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    sector: "",
    airline: "",
    fromDate: null,
  });

  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueAirlines, setUniqueAirlines] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  // --- MODAL STATE ---
  const [successModalData, setSuccessModalData] = useState(null);

  // Get status from URL params
  const activeStatus = searchParams.get("status") || "";

  const statusOptions = [
    {
      value: "on hold",
      label: "On Hold",
      color: "bg-amber-50 text-amber-800 border border-amber-300",
    },
    {
      value: "pending",
      label: "On Hold",
      color: "bg-amber-50 text-amber-800 border border-amber-300",
    },
    {
      value: "confirmed",
      label: "Confirmed",
      color: "bg-emerald-50 text-emerald-800 border border-emerald-300",
    },
    {
      value: "partially confirmed",
      label: "Partially Confirmed",
      color: "bg-indigo-50 text-indigo-800 border border-indigo-300",
    },
    {
      value: "cancelled",
      label: "Cancelled",
      color: "bg-rose-50 text-rose-800 border border-rose-300",
    },
  ];

  useEffect(() => {
    if (location.state?.bookingSuccess) {
      setSuccessModalData({
        ref: location.state.bookingReference,
        deadline: new Date(location.state.expiresAt), // use backend expiry
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // --- 12-HOUR FORMAT ---
  const formatDeadline = (date) => {
    if (!date) return "";
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const dateStr = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return `${timeStr}, ${dateStr}`;
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, activeStatus, searchQuery]);

  useEffect(() => {
    // Extract unique sectors and airlines from bookings
    const sectors = [...new Set(bookings.map((b) => b.sector).filter(Boolean))];
    const airlines = [
      ...new Set(bookings.map((b) => b.airline?.name).filter(Boolean)),
    ];
    setUniqueSectors(sectors.sort());
    setUniqueAirlines(airlines.sort());
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      setFetching(true);

      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(activeStatus && { status: activeStatus }),
        ...(filters.sector && { sector: filters.sector }),
        ...(filters.airline && { airline: filters.airline }),
        ...(filters.fromDate && {
          fromDate: format(filters.fromDate, "yyyy-MM-dd"),
        }),
      });

      const response = await axiosInstance.get(`/bookings?${params}`);

      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      toast.error("Failed to load bookings");
    } finally {
      setInitialLoading(false);
      setFetching(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleStatusFilterChange = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set("status", value);
      } else {
        next.delete("status");
      }
      return next;
    });
  };

  const handleTabChange = (tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "umrah") {
        next.set("tab", "umrah");
      } else {
        next.delete("tab");
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilters({
      sector: "",
      airline: "",
      fromDate: null,
    });
    navigate(activeTab === "umrah" ? "/dashboard/my-bookings?tab=umrah" : "/dashboard/my-bookings");
  };

  const getStatusBadge = (status) => {
    return (
      statusOptions.find((opt) => opt.value === status) || statusOptions[0]
    );
  };

  const getSourceBadge = (source) => {
    if (source === "travel-network") {
      return {
        label: "Travel Network",
        className: "bg-orange-50 text-slate-600 border border-slate-300",
      };
    }
    if (source === "al-haider") {
      return {
        label: "Al-Haider",
        className: "bg-orange-50 text-slate-600 border border-slate-300",
      };
    }
    if (source === "skypass") {
      return {
        label: "Skypass",
        className: "bg-orange-50 text-slate-600 border border-slate-300",
      };
    }
    return {
      label: "Own",
      className: "bg-orange-50 text-slate-600 border border-slate-300",
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDiscountedGrandTotal = (booking) => {
    const totalDiscount =
      booking.passengers?.reduce(
        (sum, passenger) => sum + (Number(passenger.discount) || 0),
        0,
      ) || 0;

    return (booking.pricing?.grandTotal || 0) - totalDiscount;
  };

  if (initialLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-orange-50">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-2 border-slate-300 border-t-slate-700 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-500 tracking-wide">
            LOADING BOOKINGS
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <TopBar title={" My Bookings"} />

      {/* Tabs */}
      <div className="mb-2 bg-white border border-slate-200">
        <div className="flex items-center gap-1 p-2">
          {[
            { key: "group", label: "Group Ticket" },
            { key: "umrah", label: "Umrah Package" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-3 py-2.5! text-sm text-neutral-500 rounded font-semibold tracking-wide transition-colors hover:bg-neutral-100`}
              style={
                activeTab === tab.key
                  ? { color: '#ffffff', background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.primaryDark})` }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "group" && (
        <>
          {/* Search and Filters */}
          <div className="mb-2.5 bg-white border border-slate-200">
            <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
              {/* Search Input */}
              <div className="flex-1 min-w-50">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by reference, PNR, or contact name..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-500"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-auto min-w-37.5">
                <select
                  value={activeStatus}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-sm text-slate-700 focus:outline-none focus:border-slate-500"
                >
                  <option value="">All Bookings</option>
                  <option value="on hold">On Hold</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Sector Filter */}
              <div className="w-full sm:w-auto min-w-37.5">
                <select
                  value={filters.sector}
                  onChange={(e) => handleFilterChange("sector", e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-sm text-slate-700 focus:outline-none focus:border-slate-500"
                >
                  <option value="">All Sectors</option>
                  {uniqueSectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>

              {/* Airline Filter */}
              <div className="w-full sm:w-auto min-w-37.5">
                <select
                  value={filters.airline}
                  onChange={(e) => handleFilterChange("airline", e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-sm text-slate-700 focus:outline-none focus:border-slate-500"
                >
                  <option value="">All Airlines</option>
                  {uniqueAirlines.map((airline) => (
                    <option key={airline} value={airline}>
                      {airline}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div className="w-full sm:w-auto min-w-37.5">
                <MaskedDatePicker
                  value={filters.fromDate}
                  onChange={(date) => handleFilterChange("fromDate", date)}
                  placeholderText="Dept Date"
                  minDate={new Date()}
                />
              </div>

              {/* Reset Button */}
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-slate-600 font-medium border border-slate-300 hover:transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="bg-white border border-slate-200 overflow-hidden relative">
            {fetching && (
              <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
                <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-700"></div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead style={{ background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.primaryDark})` }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-100 tracking-wide uppercase">
                      Booking Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-100 tracking-wide uppercase">
                      Group
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-100 tracking-wide uppercase">
                      Passengers
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-100 tracking-wide uppercase">
                      Price (PKR)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-100 tracking-wide uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-100 tracking-wide uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {bookings.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-8 text-center text-slate-400 text-sm border"
                      >
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => {
                      const statusBadge = getStatusBadge(booking.status);
                      const firstPassenger = booking.passengers?.[0];
                      const sourceBadge = getSourceBadge(booking.source);
                      return (
                        <tr
                          key={booking._id}
                          className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          {/* Booking Details */}
                          <td className="px-4 py-4 align-middle border-r border-slate-200">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="inline-block text-white px-3 py-1.5 text-xs font-semibold"
                                  style={{ background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.primaryDark})`, borderRadius: "4px" }}
                                >
                                  Airline PNR #: {booking.pnr || "N/A"}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-700">
                                  Agency:
                                </span>{" "}
                                {booking.userId?.companyName || "N/A"}
                              </div>
                              <div className="text-xs text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-700">
                                  BK#: {booking.bookingReference}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 pt-0.5">
                                Created: {formatDate(booking.createdAt)}
                              </div>
                            </div>
                          </td>

                          {/* Group */}
                          <td className="px-4 py-4 align-middle border-r border-slate-200">
                            <div className="space-y-1.5">
                              <div className="font-semibold text-sm text-slate-800">
                                {booking.airline?.name || "Air Sial"}
                              </div>
                              <div className="text-xs text-slate-600 font-medium">
                                {booking.sector || "ISB-DXB"}
                              </div>
                              <div className="text-xs text-slate-600">
                                {formatDate(booking.departureDate)}
                              </div>
                              <div className="text-xs text-slate-500 font-medium pt-0.5">
                                {firstPassenger
                                  ? `${firstPassenger.givenName} ${firstPassenger.surName}`
                                  : "N/A"}{" "}
                                X {booking.totalPassengers || 0}
                              </div>
                            </div>
                          </td>

                          {/* Passengers */}
                          <td className="px-4 py-4 align-middle border-r border-slate-200">
                            <div className="inline-block w-full">
                              <table className="w-full text-xs border border-slate-300">
                                <thead className="bg-slate-100 text-slate-600">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold border-r border-slate-300">
                                      Status
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold border-r border-slate-300">
                                      Adults
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold border-r border-slate-300">
                                      Child
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold border-r border-slate-300">
                                      Infants
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold">
                                      Seats
                                    </th>
                                  </tr>
                                </thead>

                                <tbody className="bg-white divide-y divide-slate-200">
                                  {[
                                    {
                                      key: "on hold",
                                      label: "Requested",
                                      match: [
                                        "on hold",
                                        "pending",
                                        "partially confirmed",
                                        "cancelled",
                                      ],
                                    },
                                    {
                                      key: "confirmed",
                                      label: "Confirmed",
                                      match: ["confirmed"],
                                    },
                                  ].map(({ key, label, match }) => {
                                    const active = match.includes(booking.status);

                                    const adults = active
                                      ? booking.adultsCount || 0
                                      : 0;
                                    const children = active
                                      ? booking.childrenCount || 0
                                      : 0;
                                    const infants = active
                                      ? booking.infantsCount || 0
                                      : 0;
                                    const seats = adults + children + infants;

                                    return (
                                      <tr key={key}>
                                        <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50 border-r border-slate-200">
                                          {label}
                                        </td>
                                        <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-200">
                                          {adults}
                                        </td>
                                        <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-200">
                                          {children}
                                        </td>
                                        <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-200">
                                          {infants}
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold text-slate-800">
                                          {seats}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>

                          {/* Price */}
                          <td
                            className={`px-4 py-4 ${booking.status === "on hold" || booking.status === "pending" ? "align-bottom" : "align-middle"} text-center border-r border-slate-200`}
                          >
                            <div className="font-semibold text-base text-slate-800">
                              {booking.status === "on hold" ||
                                booking.status === "pending" ? (
                                <div className="text-xs text-amber-800 font-semibold bg-amber-50 px-2.5 py-1.5 border border-amber-300">
                                  Admin Review
                                  <br />
                                  Required
                                </div>
                              ) : (
                                `PKR ${getDiscountedGrandTotal(booking).toLocaleString()}`
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 align-middle text-center border-r border-slate-200">
                            <div className="space-y-2">
                              <span
                                className={`inline-block px-3 py-1.5 text-xs font-medium ${statusBadge.color}`}
                              >
                                {statusBadge.label}
                              </span>
                              {(booking.status === "on hold" ||
                                booking.status === "pending" ||
                                booking.status === "partially confirmed") && (
                                  <div className="pt-1.5 flex flex-col items-center gap-1">
                                    <div className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">
                                      Booking Expiry
                                    </div>
                                    <FlipClockCountdown
                                      to={
                                        booking.expiresAt
                                          ? new Date(booking.expiresAt).getTime()
                                          : 0
                                      }
                                      hideOnComplete={false}
                                      labels={["DAYS", "HRS", "MIN", "SEC"]}
                                      renderMap={[false, true, true, true]}
                                      labelStyle={{
                                        fontSize: 9,
                                        fontWeight: 600,
                                        color: "#64748b",
                                        textTransform: "uppercase",
                                      }}
                                      digitBlockStyle={{
                                        width: 22,
                                        height: 30,
                                        fontSize: 15,
                                        color: "#e2e8f0",
                                        background: "#334155",
                                      }}
                                      dividerStyle={{ color: "#1e293b", height: 1 }}
                                      separatorStyle={{
                                        color: "#94a3b8",
                                        size: "4px",
                                      }}
                                      duration={0.4}
                                    >
                                      <span className="text-xs font-semibold text-rose-700">
                                        EXPIRED
                                      </span>
                                    </FlipClockCountdown>
                                  </div>
                                )}
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-4 align-middle text-center">
                            <div className="flex flex-col items-center gap-2">
                              {/* First row: 3 buttons */}
                              <div className="flex flex-row justify-center items-center gap-2 w-full">
                                {/* View Details - Available for all bookings */}
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/dashboard/booking-detail/${booking._id}`,
                                    )
                                  }
                                  className="p-2.5 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors"
                                  title="View Details"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                </button>
                                {/* Edit and Delete only for on hold/pending */}
                                {(booking.status === "on hold" ||
                                  booking.status === "pending") && (
                                    <>
                                      <button
                                        onClick={() =>
                                          navigate(
                                            `/dashboard/edit-booking/${booking._id}`,
                                          )
                                        }
                                        className="p-2.5 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors"
                                        title="Edit Booking"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                          />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={async () => {
                                          const confirmDelete = window.confirm(
                                            "Are you sure you want to delete this booking? This action cannot be undone.",
                                          );
                                          if (!confirmDelete) return;

                                          try {
                                            setDeletingId(booking._id);

                                            await axiosInstance.delete(
                                              `/bookings/${booking._id}`,
                                            );

                                            toast.success(
                                              "Booking deleted successfully",
                                            );
                                            setBookings((prev) =>
                                              prev.filter(
                                                (b) => b._id !== booking._id,
                                              ),
                                            );
                                          } catch (err) {
                                            toast.error(
                                              err.response?.data?.message ||
                                              "Failed to delete booking",
                                            );
                                          } finally {
                                            setDeletingId(null);
                                          }
                                        }}
                                        disabled={deletingId === booking._id}
                                        className="p-2.5 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors disabled:opacity-50"
                                        title="Delete Booking"
                                      >
                                        <svg
                                          className="w-4 h-4"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                          />
                                        </svg>
                                      </button>
                                    </>
                                  )}
                              </div>
                              {/* Second row: Print */}
                              {(booking.status === "on hold" ||
                                booking.status === "pending" ||
                                booking.status === "partially confirmed" ||
                                booking.status === "confirmed") && (
                                  <div className="flex flex-row justify-center items-center gap-2 w-full mt-2">
                                    <button
                                      onClick={() => printGDSBooking(booking)}
                                      className="p-2.5 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                                      title="Print Ticket"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "umrah" && <UmrahPackageBookings />}

      {/* --- BOOKING SUCCESS MODAL --- */}
      {successModalData && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white border border-slate-200 w-full max-w-lg p-8 flex flex-col items-center text-center relative">
            {/* Icon */}
            <div className="w-16 h-16 bg-orange-50 border border-slate-200 flex items-center justify-center mb-6">
              <Check size={32} className="text-emerald-700 stroke-2" />
            </div>

            <h2 className="text-xl font-semibold text-slate-800 mb-2 tracking-wide">
              Booking Confirmed — On Hold
            </h2>

            <div className="text-slate-600 space-y-4 mb-8 text-sm">
              <p>
                Your ticket reservation has been successfully placed{" "}
                <span className="font-semibold text-slate-800">ON HOLD</span>.
              </p>
              <div className="bg-orange-50 border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed">
                We request you to make the payment by <br />
                <span className="font-semibold text-base block mt-1 text-slate-800">
                  {formatDeadline(successModalData.deadline)}
                </span>
                <span className="block mt-1 text-slate-500">
                  to guarantee your booking on the requested flight.
                </span>
              </div>
            </div>

            <button
              onClick={() => setSuccessModalData(null)}
              className="px-10 py-2 text-white text-sm font-medium tracking-wide transition-colors w-full sm:w-auto"
              style={{ backgroundColor: theme.colors.primary }}
            >
              OK
            </button>
          </div>
        </div>
      )
      }
    </div >
  );
}
