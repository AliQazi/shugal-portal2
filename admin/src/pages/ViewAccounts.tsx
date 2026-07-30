import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  agencyCode?: string;
  role: string;
  status: "Active" | "Inactive" | "Pending";
  city?: string;
  address?: string;
  createdAt: string;
}

const ViewAccounts = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, "view_ledger");
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("All");
  const [entriesPerPage, setEntriesPerPage] = useState(50);

  useEffect(() => {
    if (canView) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, cityFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const response = await axiosInstance.get("/auth/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by role - only show agencies
    filtered = filtered.filter((user) => user.role === "Agency");

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.agencyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by city
    if (cityFilter !== "All") {
      filtered = filtered.filter((user) => user.city === cityFilter);
    }

    setFilteredUsers(filtered);
  };

  const uniqueCities = Array.from(new Set(users.filter(u => u.city).map(u => u.city)));

  if (!canView) {
    return (
      <>
        <PageMeta title="All Accounts - Access denied" description="Access denied" />
        <PageBreadCrumb pageTitle="All Accounts" />
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
          You do not have permission to view Ledger.
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="All Accounts" description="View all registered agencies" />
      <PageBreadCrumb pageTitle="All Accounts" />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-4 py-6 md:px-6 xl:px-7.5">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">All Accounts</h2>

          {/* Filters */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by City
            </label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full md:w-80 h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="All">All Cities</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Entries and Search */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
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
            <div>
              <input
                type="text"
                placeholder="Filter Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded border border-gray-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 sm:w-64"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">Loading accounts...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex justify-center py-10">
              <div className="text-gray-500 dark:text-gray-400">No accounts found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-800 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">#</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">User</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Cell</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Agency</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">City</th>
                    <th className="px-4 py-4 text-left text-sm font-medium text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-50 dark:bg-gray-800/50">
                  {filteredUsers.slice(0, entriesPerPage).map((user, index) => (
                    <tr
                      key={user._id}
                      className="border-b border-gray-200 dark:border-gray-700"
                    >
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        {index + 1}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Agent Code: {user.agencyCode || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        {user.phone}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {user.companyName || "N/A"}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {user.address || ""}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-800 dark:text-white/90">
                        {user.city || "N/A"}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => navigate(`/ledger/${user._id}`, {
                            state: { userName: user.name, agencyCode: user.agencyCode, companyname: user.companyName }
                          })}
                          className="rounded bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 transition-colors"
                        >
                          👁 Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ViewAccounts;
