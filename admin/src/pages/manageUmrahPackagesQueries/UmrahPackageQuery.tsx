import { useEffect, useState } from "react";
import axiosInstance from "../../Api/axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import ComponentCard from "../../components/common/ComponentCard";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface UmrahPackageQuery {
  voucher_id: string;
  _id: string;
  hotelRooms?: {
    city: string;
    hotel: string;
    type: string;
    rooms: number;
    pricePerRoom?: number;
    totalCost?: number;
    startDate: string;
    endDate: string;
  }[];
  transportList?: {
    route: string;
    selectTransport?: string;
    buyingRate?: number;
  }[];
  visaDetails?: {
    adults: number;
    children: number;
    infants: number;
    adultVisaSelling?: number;
    childVisaSelling?: number;
    infantVisaSelling?: number;
    totalVisaCost?: number;
  };
  user: {
    _id: string;
    fullName: string;
    email: string;
    countryCode?: string;
    phoneNumber?: string;
    isAgency?: boolean;
    agencyName?: string;
  };
  selectedGroup: {
    groupName?: string;
    groupCategory?: string;
    noOfDays: number;
    sector: string;
    airline?: string;
    flights?: {
      flightNo: string;
      sectorFrom: string;
      sectorTo: string;
      depDate: string;
      depTime: string;
      arrDate: string;
      arrTime: string;
      flightClass: string;
      baggage: string;
      meal: string;
    }[];
  };
  passengerCounts?: {
    adults: number;
    children: number;
    infants: number;
  };
  visaType?: string;
  roomType?: string;
  totalCost?: number;
  status: string;
  createdAt: string;
  passengerDetails?: {
    type: "Adult" | "Child" | "Infant";
    name: string;
    passport: string;
    passportExpiry: string;
  }[];
}

export default function ManageUmrahQueries() {
  const [queries, setQueries] = useState<UmrahPackageQuery[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<UmrahPackageQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<UmrahPackageQuery | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const tabs = ["All", "Pending", "On Process", "Cancel", "Confirm"];

  const handleView = (query: UmrahPackageQuery) => {
    setSelectedQuery(query);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedQuery(null);
  };

  useEffect(() => {
    setLoading(true);
    axiosInstance
      .get("/umrah-calculator/")
      .then((res) => {
        const data = res.data?.data || [];
        setQueries(data);
        setFilteredQueries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching queries:", err);
        setLoading(false);
      });
  }, []);

  // Apply both tab and search filters
  useEffect(() => {
    let filtered = [...queries];

    // Apply tab filter
    if (activeTab !== "All") {
      filtered = filtered.filter(query => query.status === activeTab);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((query) => {
        return (
          query.user?.fullName?.toLowerCase().includes(searchLower) ||
          query.user?.email?.toLowerCase().includes(searchLower) ||
          query.status?.toLowerCase().includes(searchLower) ||
          query.voucher_id?.toLowerCase().includes(searchLower) ||
          query.selectedGroup?.sector?.toLowerCase().includes(searchLower) ||
          query.visaType?.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredQueries(filtered);
  }, [searchTerm, activeTab, queries]);

  const updateUmrahQueryStatus = async (id: string, status: string) => {
    try {
      await axiosInstance.put(
        `/umrah-calculator/${id}/status`,
        { status }
      );

      setQueries((prev) =>
        prev.map((q) => (q._id === id ? { ...q, status } : q))
      );

      setSelectedQuery((prev) => (prev ? { ...prev, status } : prev));

      console.log("Status updated:", status);
      toast.success("Status updated successfully!");
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Status update failed!");
    }
  };

  return (
    <ComponentCard
      title="Umrah Calculator Queries"
    >
      <div className="relative w-64">
        <input
          type="text"
          placeholder="Search queries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition 
              ${activeTab === tab
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading umrah package queries...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  {[
                    "Sr No.",
                    "Voucher No.",
                    "User Name",
                    "User Email",
                    "Type",
                    "Package Info",
                    "Status",
                    "Date",
                    "Actions",
                  ].map((header, idx) => (
                    <TableCell
                      key={idx}
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filteredQueries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center py-6 text-gray-500 dark:text-gray-400"
                      colSpan={9}
                    >
                      {searchTerm
                        ? "No matching queries found"
                        : activeTab === "All"
                          ? "No umrah package queries found"
                          : `No ${activeTab.toLowerCase()} queries found`
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQueries.map((q, index) => (
                    <TableRow
                      key={q._id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      {/* Sr. No */}
                      <TableCell className="px-5 py-4 text-start text-gray-900 dark:text-gray-100">
                        {index + 1}
                      </TableCell>
                      {/* Voucher No */}
                      <TableCell className="px-5 py-4 text-start text-gray-900 dark:text-gray-100">
                        {q.voucher_id || "-"}
                      </TableCell>

                      {/* User Name */}
                      <TableCell className="px-5 py-4 text-start text-gray-900 dark:text-gray-100">
                        {q.user?.isAgency ? (
                          <>
                            {q.user?.fullName}{" "}
                            <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                              {q.user.agencyName}
                            </span>
                          </>
                        ) : (
                          q.user?.fullName || "-"
                        )}
                      </TableCell>

                      {/* User Email */}
                      <TableCell className="px-5 py-4 text-start text-gray-900 dark:text-gray-100">
                        {q.user?.email || "-"}
                      </TableCell>

                      {/* Type: B2B or B2C */}
                      <TableCell className="px-5 py-4 text-start text-gray-900 dark:text-gray-100">
                        {q.user?.isAgency ? "B2B" : "B2C"}
                      </TableCell>

                      {/* Package Info */}
                      <TableCell className="px-5 py-4 text-start text-gray-900 dark:text-gray-100 space-y-1">
                        {q.selectedGroup?.noOfDays && (
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full mr-1">
                            Duration: {q.selectedGroup.noOfDays} days
                          </span>
                        )}
                        {q.selectedGroup?.sector && (
                          <span className="inline-block bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full mr-1">
                            Sector: {q.selectedGroup.sector}
                          </span>
                        )}
                        {q.selectedGroup?.airline && (
                          <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                            Airline: {q.selectedGroup.airline}
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-5 py-4 text-start text-gray-900 dark:text-gray-100">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${q.status === "Confirm"
                              ? "bg-green-100 text-green-800"
                              : q.status === "Pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : q.status === "Cancel"
                                  ? "bg-red-100 text-red-800"
                                  : q.status === "On Process"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-200 text-gray-700"
                            }`}
                        >
                          {q.status || "Pending"}
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-5 py-4 text-start text-gray-900 dark:text-gray-100">
                        {q.createdAt
                          ? new Date(q.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                          : "—"}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-5 py-4 text-start">
                        <button
                          onClick={() => handleView(q)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                        >
                          View
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedQuery && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          ></div>

          {/* Modal container */}
          <div className="relative w-full max-w-3xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn scale-95">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500">
              <h2 className="text-lg font-semibold text-white">🕋 Umrah Booking Details</h2>
              <button
                onClick={handleClose}
                className="text-white text-xl hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6 text-sm text-gray-800 dark:text-gray-200">
              {/* User Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">👤 User Information</h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                  <p><span className="font-medium">Name:</span> {selectedQuery.user?.fullName || "-"}</p>
                  <p><span className="font-medium">Email:</span> {selectedQuery.user?.email || "-"}</p>
                  <p><span className="font-medium">Phone:</span> {`${selectedQuery.user?.countryCode || ""} ${selectedQuery.user?.phoneNumber || "-"}`}</p>
                </div>
              </div>

              {/* Package Info */}
              {selectedQuery.selectedGroup && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">📦 Package Information</h3>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                    <p><span className="font-medium">Voucher ID:</span> {selectedQuery.voucher_id}</p>
                    <p><span className="font-medium">Days:</span> {selectedQuery.selectedGroup.noOfDays}</p>
                    <p><span className="font-medium">Sector:</span> {selectedQuery.selectedGroup.sector}</p>
                    <p><span className="font-medium">Airline:</span> {selectedQuery.selectedGroup.airline || "-"}</p>
                    {selectedQuery.visaType && (
                      <p><span className="font-medium">Visa Type:</span> {selectedQuery.visaType}</p>
                    )}
                    {selectedQuery.roomType && (
                      <p><span className="font-medium">Room Type:</span> {selectedQuery.roomType}</p>
                    )}
                    {selectedQuery.totalCost && (
                      <p><span className="font-medium">Total Cost:</span> Rs {selectedQuery.totalCost.toLocaleString()}</p>
                    )}
                  </div>

                  {/* Flight Info */}
                  {(selectedQuery.selectedGroup.flights?.length ?? 0) > 0 && (
                    <div className="mt-4 border-t pt-3">
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">✈️ Flight Details</h4>
                      {selectedQuery.selectedGroup.flights?.map((flight, i) => (
                        <div key={i} className="grid grid-cols-2 gap-y-2 gap-x-6 border-b last:border-none border-gray-200 dark:border-gray-700 py-2">
                          <p><span className="font-medium">Flight No:</span> {flight.flightNo}</p>
                          <p><span className="font-medium">Sector:</span> {flight.sectorFrom} → {flight.sectorTo}</p>
                          <p><span className="font-medium">Departure:</span> {flight.depDate} {flight.depTime}</p>
                          <p><span className="font-medium">Arrival:</span> {flight.arrDate} {flight.arrTime}</p>
                          <p><span className="font-medium">Class:</span> {flight.flightClass}</p>
                          <p><span className="font-medium">Baggage:</span> {flight.baggage}</p>
                          <p><span className="font-medium">Meal:</span> {flight.meal}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hotel Info */}
              {selectedQuery?.hotelRooms?.length! > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">🏨 Hotel Information</h3>
                  {selectedQuery?.hotelRooms?.map((hotel, index) => (
                    <div key={index} className="grid grid-cols-2 gap-y-2 gap-x-6 border-b last:border-none border-gray-200 dark:border-gray-700 py-2">
                      <p><span className="font-medium">City:</span> {hotel.city}</p>
                      <p><span className="font-medium">Hotel:</span> {hotel.hotel}</p>
                      <p><span className="font-medium">Room Type:</span> {hotel.type}</p>
                      <p><span className="font-medium">Rooms:</span> {hotel.rooms}</p>
                      <p><span className="font-medium">Price/Room:</span> {hotel.pricePerRoom?.toLocaleString()} PKR</p>
                      <p><span className="font-medium">Total:</span> {hotel.totalCost?.toLocaleString()} PKR</p>
                      <p><span className="font-medium">Check-in:</span> {new Date(hotel.startDate).toLocaleDateString()}</p>
                      <p><span className="font-medium">Check-out:</span> {new Date(hotel.endDate).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Transport Info */}
              {selectedQuery?.transportList?.length! > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">🚌 Transport</h3>
                  {selectedQuery?.transportList?.map((t, i) => (
                    <div key={i} className="grid grid-cols-2 gap-y-2 gap-x-6 border-b last:border-none border-gray-200 dark:border-gray-700 py-2">
                      <p><span className="font-medium">Route:</span> {t.route}</p>
                      {t.selectTransport && (
                        <p><span className="font-medium">Transport Type:</span> {t.selectTransport}</p>
                      )}
                      {t.buyingRate && (
                        <p><span className="font-medium">Cost:</span> Rs {t.buyingRate.toLocaleString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Visa Details */}
              {selectedQuery.visaDetails && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">🛂 Visa Information</h3>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                    <p><span className="font-medium">Adults:</span> {selectedQuery.visaDetails.adults}</p>
                    <p><span className="font-medium">Children:</span> {selectedQuery.visaDetails.children}</p>
                    <p><span className="font-medium">Infants:</span> {selectedQuery.visaDetails.infants}</p>
                    {selectedQuery.visaDetails.adultVisaSelling && (
                      <p><span className="font-medium">Adult Visa Cost:</span> Rs {selectedQuery.visaDetails.adultVisaSelling.toLocaleString()}</p>
                    )}
                    {selectedQuery.visaDetails.childVisaSelling && (
                      <p><span className="font-medium">Child Visa Cost:</span> Rs {selectedQuery.visaDetails.childVisaSelling.toLocaleString()}</p>
                    )}
                    {selectedQuery.visaDetails.infantVisaSelling && (
                      <p><span className="font-medium">Infant Visa Cost:</span> Rs {selectedQuery.visaDetails.infantVisaSelling.toLocaleString()}</p>
                    )}
                    {selectedQuery.visaDetails.totalVisaCost && (
                      <p><span className="font-medium">Total Visa Cost:</span> Rs {selectedQuery.visaDetails.totalVisaCost.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Passenger Counts */}
              {selectedQuery.passengerCounts && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">👥 Passenger Counts</h3>
                  <div className="grid grid-cols-3 gap-y-2 gap-x-6">
                    <p><span className="font-medium">Adults:</span> {selectedQuery.passengerCounts.adults}</p>
                    <p><span className="font-medium">Children:</span> {selectedQuery.passengerCounts.children}</p>
                    <p><span className="font-medium">Infants:</span> {selectedQuery.passengerCounts.infants}</p>
                  </div>
                </div>
              )}

              {/* Passenger Details */}
              {selectedQuery.passengerDetails && selectedQuery.passengerDetails.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">🧑‍🤝‍🧑 Passenger Details</h3>
                  <div className="space-y-3">
                    {selectedQuery.passengerDetails.map((p, idx) => (
                      <div key={idx} className="border-b last:border-none border-gray-200 dark:border-gray-700 pb-2 mb-2 last:mb-0 last:pb-0">
                        <div className="font-medium mb-1">Pax {idx + 1} — {p.type}</div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          <p><span className="font-medium">Name:</span> {p.name}</p>
                          <p><span className="font-medium">Passport #:</span> {p.passport}</p>
                          <p><span className="font-medium">Passport Expiry:</span> {p.passportExpiry ? new Date(p.passportExpiry).toLocaleDateString() : "-"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">📌 Status</h3>
                <select
                  value={selectedQuery?.status || "Pending"}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setSelectedQuery((prev) => prev ? { ...prev, status: newStatus } : prev);
                    updateUmrahQueryStatus(selectedQuery._id, newStatus);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="On Process">On Process</option>
                  <option value="Cancel">Cancel</option>
                  <option value="Confirm">Confirm</option>
                </select>
              </div>

              {/* Date */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">📅 Booking Date</h3>
                <p>{new Date(selectedQuery.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-gray-200 px-6 py-3 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={handleClose}
                className="px-5 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 100000000 }} />
    </ComponentCard>
  );
}