import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import { format } from "date-fns";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { Check } from "lucide-react";

export default function MyUmrahCalculator({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
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

  // Get status from URL params - decode it properly
  const activeStatus = searchParams.get("status")
    ? decodeURIComponent(searchParams.get("status")).toLowerCase().trim()
    : "";

  console.log("Active status from URL:", activeStatus); // Debug log

  const statusOptions = [
    {
      value: "pending",
      label: "Pending",
      color: "bg-yellow-50 text-yellow-700 border border-yellow-300",
    },
    {
      value: "confirm",
      label: "Confirmed",
      color: "bg-green-50 text-green-700 border border-green-300",
    },
    {
      value: "cancel",
      label: "Cancelled",
      color: "bg-red-50 text-red-700 border border-red-300",
    },
  ];

  useEffect(() => {
    if (location.state?.bookingSuccess) {
      setSuccessModalData({
        ref: location.state.bookingReference,
        deadline: new Date(location.state.expiresAt),
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Fetch bookings on component mount
  useEffect(() => {
    fetchBookings();
  }, []);

  // Apply filters whenever bookings, filters, searchQuery, or activeStatus change
  useEffect(() => {
    applyFilters();
  }, [bookings, filters, searchQuery, activeStatus]);

  // Update unique sectors and airlines when bookings change
  useEffect(() => {
    const sectors = [
      ...new Set(bookings.map((b) => b.selectedGroup?.sector).filter(Boolean)),
    ];
    const airlines = [
      ...new Set(bookings.map((b) => b.selectedGroup?.airline).filter(Boolean)),
    ];
    setUniqueSectors(sectors.sort());
    setUniqueAirlines(airlines.sort());
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      setFetching(true);

      const response = await axiosInstance.get("/umrah-calculator/user");

      if (response.data) {
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

  // Apply all filters to bookings
  const applyFilters = () => {
    let filtered = [...bookings];

    console.log("Applying filters - Current state:", {
      activeStatus,
      searchQuery,
      filters,
      totalBookings: bookings.length,
    });

    // Log all booking statuses for debugging
    console.log(
      "All booking statuses:",
      bookings.map((b) => ({
        id: b._id,
        status: b.status,
        statusLower: b.status?.toLowerCase(),
      })),
    );

    // Apply status filter from URL
    if (activeStatus) {
      console.log("Filtering by status:", activeStatus);

      filtered = filtered.filter((booking) => {
        const bookingStatus = booking.status?.toLowerCase().trim() || "";
        const filterStatus = activeStatus.toLowerCase().trim();

        // Handle different status variations
        const matches =
          bookingStatus === filterStatus ||
          bookingStatus.includes(filterStatus.replace(" ", ""));

        console.log("Status check:", {
          bookingId: booking._id,
          bookingStatus,
          filterStatus,
          matches,
        });

        return matches;
      });

      console.log("Filtered by status count:", filtered.length);
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((booking) => {
        const bookingRef = booking.bookingRef?.toLowerCase() || "";
        const contactName = booking.user?.name?.toLowerCase() || "";
        const firstName =
          booking.passengerDetails?.[0]?.givenName?.toLowerCase() || "";
        const lastName =
          booking.passengerDetails?.[0]?.surName?.toLowerCase() || "";

        return (
          bookingRef.includes(query) ||
          contactName.includes(query) ||
          firstName.includes(query) ||
          lastName.includes(query)
        );
      });
    }

    // Apply sector filter
    if (filters.sector) {
      filtered = filtered.filter(
        (booking) => booking.selectedGroup?.sector === filters.sector,
      );
    }

    // Apply airline filter
    if (filters.airline) {
      filtered = filtered.filter(
        (booking) => booking.selectedGroup?.airline === filters.airline,
      );
    }

    // Apply from date filter
    if (filters.fromDate) {
      const filterDate = new Date(filters.fromDate);
      filterDate.setHours(0, 0, 0, 0);

      filtered = filtered.filter((booking) => {
        const firstFlight = booking.selectedGroup?.flights?.[0];
        if (!firstFlight?.depDate) return false;
        const bookingDate = new Date(firstFlight.depDate);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate >= filterDate;
      });
    }

    console.log("Final filtered bookings:", filtered.length);
    setFilteredBookings(filtered);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilters({
      sector: "",
      airline: "",
      fromDate: null,
    });
    navigate("/dashboard/my-umrah-calculator");
  };

  const getStatusBadge = (status) => {
    return (
      statusOptions.find(
        (opt) => opt.value.toLowerCase() === status?.toLowerCase(),
      ) || statusOptions[0]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return `PKR ${amount.toLocaleString()}`;
  };

  // Get visa type display name
  const getVisaTypeDisplay = (visaType) => {
    switch (visaType) {
      case "umrahWithTransport":
        return "Umrah with Transport";
      case "umrahWithoutTransport":
        return "Umrah without Transport";
      default:
        return visaType || "N/A";
    }
  };

  // Sab se pehle, ek calculation function add karein component ke andar
  const calculateTotalCost = (booking) => {
    let total = 0;

    // 1. Flight Cost - Use saved groupTicketPricing if available (includes margin)
    if (booking.groupTicketPricing?.totalPrice) {
      total += booking.groupTicketPricing.totalPrice;
    } else if (booking.selectedGroup?.price) {
      // Fallback: calculate from base prices if groupTicketPricing not available
      const adultCount = booking.passengerCounts?.adults || 0;
      const childCount = booking.passengerCounts?.children || 0;
      const infantCount = booking.passengerCounts?.infants || 0;

      const adultFlightCost =
        booking.selectedGroup.price.sellingAdultPriceB2B * adultCount || 0;
      const childFlightCost =
        booking.selectedGroup.price.sellingChildPriceB2B * childCount || 0;
      const infantFlightCost =
        booking.selectedGroup.price.sellingInfantPriceB2B * infantCount || 0;

      total += adultFlightCost + childFlightCost + infantFlightCost;
    }

    // 2. Visa Cost - Use saved totalVisaCost (includes margin)
    if (booking.visaDetails?.totalVisaCost) {
      total += booking.visaDetails.totalVisaCost;
    }

    // 3. Hotel Cost - Use saved totalCost per room (includes margin)
    if (booking.hotelRooms && booking.hotelRooms.length > 0) {
      total += booking.hotelRooms.reduce(
        (sum, room) => sum + (room.totalCost || 0),
        0,
      );
    }

    // 4. Transport Cost - Use saved buyingRate (includes margin)
    if (booking.transportList && booking.transportList.length > 0) {
      total += booking.transportList.reduce(
        (sum, t) => sum + (t.buyingRate || 0),
        0,
      );
    }

    return total;
  };

  // Get departure date from flights
  const getDepartureDate = (booking) => {
    const firstFlight = booking.selectedGroup?.flights?.[0];
    return firstFlight?.depDate || null;
  };

  if (initialLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen mx-auto px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          My Umrah Calculator Bookings
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          View and manage your umrah calculator bookings
        </p>
        {activeStatus && (
          <div className="mt-2 inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            Filtering by: {activeStatus} bookings ({filteredBookings.length}{" "}
            found)
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-4 bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-50">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reference or passenger name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sector Filter */}
          <div className="w-full sm:w-auto min-w-37.5">
            <select
              value={filters.sector}
              onChange={(e) => handleFilterChange("sector", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-medium border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Results count */}
        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden relative">
        {fetching && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  Booking Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  <div className="flex items-center gap-1">
                    <span>Package / Visa</span>
                    <span>✈</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  <div className="flex items-center gap-1">
                    <span>Passengers</span>
                    <span>👥</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  Price (PKR)
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white border-r border-[#3d6fa8]">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-8 text-center text-gray-500 text-sm border"
                  >
                    {bookings.length === 0
                      ? "No bookings found"
                      : `No bookings found matching your filters (showing 0 of ${bookings.length})`}
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const statusBadge = getStatusBadge(booking.status);
                  const firstPassenger = booking.passengerDetails?.[0];

                  const airlineName = booking.selectedGroup?.airline || "N/A";
                  const sectorName = booking.selectedGroup?.sector || "N/A";
                  const groupName = booking.selectedGroup?.groupName || "N/A";
                  const visaType = getVisaTypeDisplay(booking.visaType);
                  const totalCost = booking.totalCost || 0;
                  const contactName = booking.user?.name || "N/A";
                  const userEmail = booking.user?.email || "N/A";
                  const userPhone = booking.user?.phone || "N/A";
                  const companyName = booking.user?.companyName || "N/A";

                  const adultsCount = booking.passengerCounts?.adults || 0;
                  const childrenCount = booking.passengerCounts?.children || 0;
                  const infantsCount = booking.passengerCounts?.infants || 0;
                  const totalPassengers =
                    adultsCount + childrenCount + infantsCount;

                  const departureDate = getDepartureDate(booking);

                  return (
                    <tr
                      key={booking._id}
                      className="border-b border-gray-300 hover:bg-blue-50/20 transition-colors"
                    >
                      {/* Booking Details */}
                      <td className="px-4 py-4 align-middle border-r border-gray-300">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-block bg-linear-to-r from-amber-600 to-amber-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-md">
                              Voucher #: {booking.voucher_id || "N/A"}
                            </span>
                          </div>
                          {/* <div className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-semibold text-gray-800">
                              Ref #:
                            </span>{" "}
                            {booking.bookingRef || "N/A"}
                          </div> */}
                          <div className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-semibold text-gray-800">
                              Contact:
                            </span>{" "}
                            {contactName}
                          </div>
                          <div className="text-xs text-gray-600 leading-relaxed">
                            <span className="font-semibold text-gray-800">
                              Email:
                            </span>{" "}
                            {userEmail}
                          </div>
                          <div className="text-xs text-gray-600 leading-relaxed">
                            <span className="font-semibold text-gray-800">
                              Phone:
                            </span>{" "}
                            {userPhone}
                          </div>
                          {companyName && (
                            <div className="text-xs text-gray-600 leading-relaxed">
                              <span className="font-semibold text-gray-800">
                                Company:
                              </span>{" "}
                              {companyName}
                            </div>
                          )}
                          <div className="text-xs text-gray-600 pt-0.5">
                            Created: {formatDate(booking.createdAt)}
                          </div>
                        </div>
                      </td>

                      {/* Package / Visa */}
                      <td className="px-4 py-4 align-middle border-r border-gray-300">
                        <div className="space-y-1.5">
                          <div className="font-bold text-sm text-gray-900">
                            {groupName}
                          </div>
                          <div className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded inline-block">
                            {visaType}
                          </div>
                          <div className="text-xs text-gray-700 font-medium">
                            {airlineName} — {sectorName}
                          </div>
                          {departureDate && (
                            <div className="text-xs text-gray-600">
                              Dept: {formatDate(departureDate)}
                            </div>
                          )}
                          <div className="text-xs text-gray-700">
                            Room Type:{" "}
                            <span className="font-semibold">
                              {booking.roomType || "N/A"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 font-medium pt-0.5">
                            {firstPassenger
                              ? `${firstPassenger.title || ""} ${firstPassenger.givenName || ""} ${firstPassenger.surName || ""}`
                              : "N/A"}{" "}
                            X {totalPassengers}
                          </div>
                        </div>
                      </td>

                      {/* Passengers */}
                      <td className="px-4 py-4 align-middle border-r border-gray-300">
                        <div className="inline-block w-full">
                          <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
                            <thead className="bg-[#2d5a8f] text-white">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold border-r border-slate-600">
                                  Type
                                </th>
                                <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">
                                  Adults
                                </th>
                                <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">
                                  Child
                                </th>
                                <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">
                                  Infants
                                </th>
                                <th className="px-3 py-2 text-center font-semibold">
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                              <tr className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 font-medium text-slate-700 bg-slate-50 border-r border-slate-200">
                                  Passengers
                                </td>
                                <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">
                                  {adultsCount}
                                </td>
                                <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">
                                  {childrenCount}
                                </td>
                                <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">
                                  {infantsCount}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-slate-900">
                                  {totalPassengers}
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Hotel Rooms Summary */}
                          {booking.hotelRooms &&
                            booking.hotelRooms.length > 0 && (
                              <div className="mt-2 text-xs">
                                <div className="font-semibold text-gray-700 mb-1">
                                  Hotels:
                                </div>
                                {booking.hotelRooms.map((room, idx) => (
                                  <div key={idx} className="text-gray-600">
                                    {room.city}: {room.hotel} - {room.rooms}{" "}
                                    {room.type} room(s)
                                  </div>
                                ))}
                              </div>
                            )}

                          {/* Transport Summary */}
                          {booking.transportList &&
                            booking.transportList.length > 0 && (
                              <div className="mt-2 text-xs">
                                <div className="font-semibold text-gray-700 mb-1">
                                  Transport:
                                </div>
                                {booking.transportList.map((transport, idx) => (
                                  <div key={idx} className="text-gray-600">
                                    {transport.route}:{" "}
                                    {transport.selectTransport}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </td>

                      {/* Price column with complete breakdown */}
                      <td className="px-4 py-4 align-middle text-center border-r border-gray-300">
                        <div className="space-y-2">
                          {/* Grand Total */}
                          <div className="font-bold text-base text-gray-900">
                            {formatCurrency(calculateTotalCost(booking))}
                          </div>

                          {/* Complete Price Breakdown */}
                          <div className="text-xs text-gray-600 border-t border-gray-200 pt-2 mt-1">
                            {/* Flight Cost */}
                            {booking.selectedGroup?.price && (
                              <>
                                <div className="font-semibold">
                                  Flight Cost:
                                </div>
                                {booking.passengerCounts?.adults > 0 && (
                                  <div className="flex justify-between">
                                    <span>
                                      Adults ({booking.passengerCounts.adults}):
                                    </span>
                                    <span>
                                      {formatCurrency(
                                        booking.selectedGroup.price
                                          .sellingAdultPriceB2B *
                                          booking.passengerCounts.adults,
                                      )}
                                    </span>
                                  </div>
                                )}
                                {booking.passengerCounts?.children > 0 && (
                                  <div className="flex justify-between">
                                    <span>
                                      Children (
                                      {booking.passengerCounts.children}):
                                    </span>
                                    <span>
                                      {formatCurrency(
                                        booking.selectedGroup.price
                                          .sellingChildPriceB2B *
                                          booking.passengerCounts.children,
                                      )}
                                    </span>
                                  </div>
                                )}
                                {booking.passengerCounts?.infants > 0 && (
                                  <div className="flex justify-between">
                                    <span>
                                      Infants ({booking.passengerCounts.infants}
                                      ):
                                    </span>
                                    <span>
                                      {formatCurrency(
                                        booking.selectedGroup.price
                                          .sellingInfantPriceB2B *
                                          booking.passengerCounts.infants,
                                      )}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Visa Cost */}
                            {booking.visaDetails && (
                              <>
                                <div className="font-semibold mt-1">
                                  Visa Cost:
                                </div>
                                <div className="flex justify-between">
                                  <span>Total Visa:</span>
                                  <span>
                                    {formatCurrency(
                                      booking.visaDetails.totalVisaCost,
                                    )}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* Hotel Cost */}
                            {booking.hotelRooms &&
                              booking.hotelRooms.length > 0 && (
                                <>
                                  <div className="font-semibold mt-1">
                                    Hotel Cost:
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Hotel:</span>
                                    <span>
                                      {formatCurrency(
                                        booking.hotelRooms.reduce(
                                          (sum, room) =>
                                            sum + (room.totalCost || 0),
                                          0,
                                        ),
                                      )}
                                    </span>
                                  </div>
                                </>
                              )}

                            {/* Transport Cost */}
                            {booking.transportList &&
                              booking.transportList.length > 0 && (
                                <>
                                  <div className="font-semibold mt-1">
                                    Transport Cost:
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Transport:</span>
                                    <span>
                                      {formatCurrency(
                                        booking.transportList.reduce(
                                          (sum, t) => sum + (t.buyingRate || 0),
                                          0,
                                        ),
                                      )}
                                    </span>
                                  </div>
                                </>
                              )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 align-middle text-center border-r border-gray-300">
                        <span
                          className={`inline-block px-3 py-1.5 rounded-md text-xs shadow-sm ${statusBadge.color}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 align-middle text-center">
                        <div className="flex flex-row justify-center items-center gap-2 px-4">
                          {/* View Details - always visible */}
                          <button
                            onClick={() =>
                              navigate(
                                `/dashboard/my-umrah-calculator-detail/${booking._id}`,
                              )
                            }
                            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200"
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

                          {/* Edit & Delete only for pending */}
                          {booking.status?.toLowerCase() === "pending" && (
                            <>
                              <button
                                onClick={async () => {
                                  const confirmDelete = window.confirm(
                                    "Are you sure you want to delete this booking? This action cannot be undone.",
                                  );
                                  if (!confirmDelete) return;

                                  try {
                                    setDeletingId(booking._id);
                                    await axiosInstance.delete(
                                      `/umrah-calculator/${booking._id}`,
                                    );
                                    toast.success(
                                      "Booking deleted successfully",
                                    );
                                    setBookings((prev) =>
                                      prev.filter((b) => b._id !== booking._id),
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
                                className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200 disabled:opacity-50"
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- BOOKING SUCCESS MODAL --- */}
      {successModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-24 bg-linear-to-b from-green-50 to-white -z-10"></div>

            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg border-4 border-green-50">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={40} className="text-green-600 stroke-3" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Booking Success
            </h2>

            <div className="text-gray-600 space-y-4 mb-8">
              <p>
                Your umrah calculator booking has been successfully placed with{" "}
                <span className="font-bold text-gray-800">
                  {statusOptions.find(
                    (opt) => opt.value.toLowerCase() === "pending",
                  )?.label || "Pending"}
                </span>{" "}
                status.
              </p>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900 leading-relaxed">
                Booking Reference:{" "}
                <span className="font-bold">{successModalData.ref}</span>
              </div>
            </div>

            <button
              onClick={() => setSuccessModalData(null)}
              className="px-10 py-3 bg-[#6C63FF] hover:bg-[#5a52d5] text-white text-sm font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
