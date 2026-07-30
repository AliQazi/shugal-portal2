import { useEffect, useState, useCallback } from "react";
import { fetchLogs, fetchLogTypes, fetchLogUsers, type ActivityLog, type LogFilters, type LogUser } from "../Api/activityLogApi";

const TYPE_COLORS: Record<string, string> = {
  "Ticket Booking": "bg-blue-100 text-blue-700",
  UmrahBooking: "bg-purple-100 text-purple-700",
  UmrahPackage: "bg-indigo-100 text-indigo-700",
  GroupTicketing: "bg-cyan-100 text-cyan-700",
  Hotel: "bg-amber-100 text-amber-700",
  Visa: "bg-green-100 text-green-700",
  Transport: "bg-orange-100 text-orange-700",
  Payment: "bg-emerald-100 text-emerald-700",
  Auth: "bg-red-100 text-red-700",
  Airline: "bg-sky-100 text-sky-700",
  Bank: "bg-yellow-100 text-yellow-700",
  Sector: "bg-teal-100 text-teal-700",
  Global: "bg-slate-100 text-slate-700",
  "Special Offer": "bg-pink-100 text-pink-700",
  "Sub User": "bg-violet-100 text-violet-700",
  "Team Contact": "bg-lime-100 text-lime-700",
  Other: "bg-gray-100 text-gray-600",
};

const PAGE_LIMIT = 20;

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<LogUser[]>([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });

  const [filters, setFilters] = useState<LogFilters>({
    type: "",
    search: "",
    userId: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
    limit: PAGE_LIMIT,
  });

  const loadLogs = useCallback(async (f: LogFilters) => {
    setLoading(true);
    try {
      const res = await fetchLogs(f);
      setLogs(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error("Failed to load activity logs", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogTypes().then(setTypes).catch(() => {});
    fetchLogUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    loadLogs(filters);
  }, [filters, loadLogs]);

  const handleFilterChange = (key: keyof LogFilters, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Activity Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track all admin and user actions across the system
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search description..."
            value={filters.search ?? ""}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* User dropdown */}
          <select
            value={filters.userId ?? ""}
            onChange={(e) => handleFilterChange("userId", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} — {u.email}
              </option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={filters.type ?? ""}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Date From */}
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Date To */}
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span>
            Total:{" "}
            <span className="font-semibold text-gray-700">
              {pagination.totalLogs}
            </span>{" "}
            logs
          </span>
          {(filters.type || filters.search || filters.userId || filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() =>
                setFilters({ type: "", search: "", userId: "", dateFrom: "", dateTo: "", page: 1, limit: PAGE_LIMIT })
              }
              className="ml-auto text-red-500 hover:text-red-700 underline text-xs"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr
                    key={log._id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {(filters.page! - 1) * PAGE_LIMIT + index + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {formatDate(log.date)}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-gray-800 text-xs">
                            {log.user.name}
                          </p>
                          <p className="text-gray-400 text-xs">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          TYPE_COLORS[log.type] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-xs">
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
