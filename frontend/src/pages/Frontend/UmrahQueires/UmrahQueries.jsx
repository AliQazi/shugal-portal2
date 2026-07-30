import { useEffect, useState } from "react";
import axiosInstance from "../../../api/axios";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ["All", "Pending", "On Process", "Cancel", "Confirm"];

const STATUS_CONFIG = {
  Confirm: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  "On Process": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  Cancel: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  Pending: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPKR = (amount) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const parseDate = (value) => {
  const dateOnlyMatch =
    typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3]),
    );
  }

  return new Date(value);
};

const parseHotelDate = (room, value) => {
  const date = parseDate(value);

  if (!room?.dateFormatVersion && Number.isFinite(date.getTime())) {
    date.setDate(date.getDate() + 1);
  }

  return date;
};

const formatHotelDate = (room, value) => {
  if (value == null || value === "") return "-";

  return parseHotelDate(room, value).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return parseDate(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getPassengerCount = (record) => {
  const counts = record?.passengerCounts || {};
  const adults = Number(counts.adults || 0);
  const children = Number(counts.children || 0);
  const infants = Number(counts.infants || 0);
  return adults + children + infants;
};

const getRoomPaxBasis = (room, record) => {
  const occupancy = Number(room?.occupancy);

  if (occupancy > 0) {
    return occupancy;
  }

  return Math.max(1, getPassengerCount(record));
};

const getHotelNights = (room) => {
  const savedNights = Number(room?.nights);
  if (savedNights > 0) return savedNights;

  if (!room?.startDate || !room?.endDate) return 0;

  const start = parseHotelDate(room, room.startDate);
  const end = parseHotelDate(room, room.endDate);
  const diff = end.getTime() - start.getTime();

  if (!Number.isFinite(diff) || diff <= 0) return 0;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getHotelDisplayTotal = (room) => {
  const pricePerRoom = Number(room?.pricePerRoom);
  const rooms = Math.max(1, Number(room?.rooms) || 1);
  const pax = Math.max(1, Number(room?.occupancy) || 1);
  const nights = getHotelNights(room);

  if (pricePerRoom > 0 && nights > 0) {
    return pricePerRoom * nights * rooms * pax;
  }

  return Number(room?.totalCost) || 0;
};

const getHotelsTotal = (hotelRooms = []) =>
  hotelRooms.reduce((sum, room) => sum + getHotelDisplayTotal(room), 0);

const computePackageCost = (rec) => {
  const flightTotal = rec.groupTicketPricing?.totalPrice || 0;
  const visaTotal = rec.visaDetails?.totalVisaCost || 0;
  const transportTotal =
    rec.transportList?.reduce((s, t) => s + (t.buyingRate || 0), 0) ?? 0;
  const hotelTotal = getHotelsTotal(rec.hotelRooms || []);
  return flightTotal + visaTotal + transportTotal + hotelTotal;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className={`text-xs font-medium ${config.text}`}>
        {status || "Pending"}
      </span>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex py-1">
    <span className="w-28 text-sm text-slate-500">{label}</span>
    <span className="flex-1 text-sm text-slate-900 dark:text-slate-100 font-medium">
      {value ?? "—"}
    </span>
  </div>
);

const SectionCard = ({ title, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {title}
      </h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

function RecordModal({ record, onClose }) {
  console.log(record);
  const packageCost = computePackageCost(record);
  const flight = record.selectedGroup?.flights?.[0];

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-60 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-70 flex items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Booking Details
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Voucher: {record.voucher_id || "—"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-500 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              <SectionCard title="Customer Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Name" value={record.user?.name} />
                  <InfoRow label="Email" value={record.user?.email} />
                  <InfoRow label="Phone" value={record.user?.phone} />
                  {record.user?.companyName && (
                    <InfoRow label="Company" value={record.user.companyName} />
                  )}
                </div>
              </SectionCard>

              {flight && (
                <SectionCard title="Flight Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <InfoRow
                      label="Sector"
                      value={record.selectedGroup?.sector}
                    />
                    <InfoRow
                      label="Airline"
                      value={record.selectedGroup?.airline}
                    />
                    <InfoRow label="Flight No" value={flight.flightNo} />
                    <InfoRow label="Class" value={flight.flightClass} />
                    <InfoRow
                      label="Departure"
                      value={`${formatDate(flight.depDate)} ${flight.depTime || ""}`}
                    />
                    <InfoRow
                      label="Arrival"
                      value={`${formatDate(flight.arrDate)} ${flight.arrTime || ""}`}
                    />
                    <InfoRow label="From" value={flight.sectorFrom} />
                    <InfoRow label="To" value={flight.sectorTo} />
                    <InfoRow
                      label="Baggage"
                      value={flight.baggage ? `${flight.baggage}kg` : undefined}
                    />
                    <InfoRow label="Meal" value={flight.meal} />
                  </div>
                </SectionCard>
              )}

              <SectionCard title="Passenger Summary">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    ["Adults", record.passengerCounts?.adults],
                    ["Children", record.passengerCounts?.children],
                    ["Infants", record.passengerCounts?.infants],
                  ].map(([label, count]) => (
                    <div
                      key={label}
                      className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800"
                    >
                      <div className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
                        {count ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {record.passengerDetails &&
                record.passengerDetails.length > 0 && (
                  <SectionCard title="Passenger Details">
                    <div className="space-y-3">
                      {record.passengerDetails.map((p, i) => (
                        <div
                          key={p._id ?? i}
                          className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                            <InfoRow
                              label="Name"
                              value={`${p.title} ${p.givenName} ${p.surName}`}
                            />
                            <InfoRow label="Type" value={p.type} />
                            <InfoRow label="Passport" value={p.passport} />
                            <InfoRow
                              label="Nationality"
                              value={p.nationality}
                            />
                            <InfoRow
                              label="DOB"
                              value={formatDate(p.dateOfBirth)}
                            />
                            <InfoRow
                              label="Expiry"
                              value={formatDate(p.passportExpiry)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

              {record.hotelRooms && record.hotelRooms.length > 0 && (
                <SectionCard title="Hotel Information">
                  <div className="space-y-3">
                    {record.hotelRooms.map((h, i) => {
                      const hotelTotal = getHotelDisplayTotal(h);
                      const nights = getHotelNights(h);

                      return (
                        <div
                          key={h._id ?? i}
                          className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                            <InfoRow label="Hotel" value={h.hotel} />
                            <InfoRow label="City" value={h.city} />
                            <InfoRow label="Room Type" value={h.type} />
                            <InfoRow label="Rooms" value={h.rooms} />
                            <InfoRow
                              label="Pax"
                              value={getRoomPaxBasis(h, record)}
                            />
                            <InfoRow label="Nights" value={nights || undefined} />
                            <InfoRow
                              label="Check-in"
                              value={formatHotelDate(h, h.startDate)}
                            />
                            <InfoRow
                              label="Check-out"
                              value={formatHotelDate(h, h.endDate)}
                            />
                            <InfoRow
                              label="Price/Room"
                              value={
                                h.pricePerRoom
                                  ? formatPKR(h.pricePerRoom)
                                  : undefined
                              }
                            />
                            <InfoRow
                              label="Total"
                              value={formatPKR(hotelTotal)}
                            />
                            <InfoRow
                              label="Per Pax"
                              value={formatPKR(
                                hotelTotal /
                                  Math.max(1, getRoomPaxBasis(h, record)),
                              )}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}

              <SectionCard title="Visa Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Visa Type" value={record.visaType} />
                  <InfoRow label="Room Type" value={record.roomType} />
                  <InfoRow
                    label="Adult Visa"
                    value={formatPKR(record.visaDetails?.adultVisaSelling ?? 0)}
                  />
                  <InfoRow
                    label="Child Visa"
                    value={formatPKR(record.visaDetails?.childVisaSelling ?? 0)}
                  />
                  <InfoRow
                    label="Infant Visa"
                    value={formatPKR(
                      record.visaDetails?.infantVisaSelling ?? 0,
                    )}
                  />
                  <InfoRow
                    label="Total Visa"
                    value={formatPKR(record.visaDetails?.totalVisaCost ?? 0)}
                  />
                </div>
              </SectionCard>

              {/* Cost Summary */}
              <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm opacity-90">
                    <span>Flight Total</span>
                    <span className="font-medium">
                      {formatPKR(record.groupTicketPricing?.totalPrice || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm opacity-90">
                    <span>Visa Total</span>
                    <span className="font-medium">
                      {formatPKR(record.visaDetails?.totalVisaCost || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm opacity-90">
                    <span>Hotels Total</span>
                    <span className="font-medium">
                      {formatPKR(
                        getHotelsTotal(record.hotelRooms || []),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm opacity-90">
                    <span>Transport Total</span>
                    <span className="font-medium">
                      {formatPKR(
                        record.transportList?.reduce(
                          (s, t) => s + t.buyingRate,
                          0,
                        ) ?? 0,
                      )}
                    </span>
                  </div>
                  <div className="border-t border-white/20 my-4 pt-4 flex justify-between items-center">
                    <span className="text-lg font-medium">Total Package</span>
                    <span className="text-3xl font-bold">
                      {formatPKR(packageCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UmrahRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAllRecords = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/umrah-calculator/user");
      const raw = res.data?.data?.data ?? res.data?.data ?? [];
      const processed = raw.map((rec) => ({
        ...rec,
        totalPackageCost: computePackageCost(rec),
      }));
      setRecords(processed);
    } catch (err) {
      console.error("Error fetching records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRecords();
  }, []);

  const tabFiltered =
    activeTab === "All"
      ? records
      : records.filter((r) => (r.status || "Pending") === activeTab);

  const displayed = tabFiltered.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.voucher_id?.toLowerCase().includes(q)
    );
  });

  const tabCount = (tab) =>
    tab === "All"
      ? records.length
      : records.filter((r) => (r.status || "Pending") === tab).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Umrah Calculator Records
        </h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === tab
                ? "text-indigo-600 dark:text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 dark:after:bg-indigo-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {tab}
            <span
              className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {tabCount(tab)}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-sm text-slate-500 font-medium">
              Loading records...
            </span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-24">
            <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {[
                    "Voucher",
                    "Agent",
                    "Type",
                    "Passengers",
                    "Total",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((rec) => (
                  <tr
                    key={rec._id}
                    onClick={() => setSelectedRecord(rec)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {rec.voucher_id || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {rec.user?.name || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {rec.user?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                          rec.user?.companyName
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {rec.user?.companyName ? "Agency" : "Direct"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      A:{rec.passengerCounts?.adults} C:
                      {rec.passengerCounts?.children} I:
                      {rec.passengerCounts?.infants}
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">
                      {formatPKR(rec.totalPackageCost || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={rec.status || "Pending"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRecord && (
        <RecordModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
