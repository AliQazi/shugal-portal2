import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { toast } from "react-toastify";
import TopBar from "../components/ui/Header/TopBar";
import {
  Search,
  FileText,
  FileSpreadsheet,
  Users,
  UserCheck,
  UserX,
  Clock,
  Eye,
  RefreshCw,
  Copy,
  Mail,
  LogIn,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building,
  MapPin,
  ToggleLeft,
  ToggleRight,
  MoreVertical
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  agencyCode?: string;
  role: string;
  status: "Active" | "Inactive" | "Pending";
  isDeleted?: boolean;
  deletedAt?: string;
  priceOnCall?: boolean;
  showHideButton?: boolean;
  plainPassword?: string;
  city?: string;
  accountId?: string;
  accountName?: string;
  consultant?: string;
  country?: string;
  marginType?: "Percentage" | "Amount";
  flightMarginPercent?: number;
  flightMarginAmount?: number;
  registeredFrom?: {
    ipAddress?: string;
    userAgent?: string;
  };
  margin?: string;
  activatedBy?: string;
  deactivatedBy?: string;
  deactivatedAt?: string;
  createdAt: string;
}

const RegisteredAgencies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const canViewPage = hasPermission(user, "view_register_agencies");
  const canUseTopActions = hasPermission(user, "agencies_top_action_buttons");
  const canUseAgentActions = hasPermission(user, "agent_action_buttons");

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);
  const [sendingCredentials, setSendingCredentials] = useState<string | null>(null);
  const [selectedCredentials, setSelectedCredentials] = useState<User | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [priceLoading, setPriceLoading] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
  const [recoveringAgent, setRecoveringAgent] = useState<string | null>(null);

  const frontendUrl =
    import.meta.env.VITE_FRONTEND_URL || "https://flyingzone.nexagensolution.com/auth/login";

  const MAX_ACTIVE_AGENTS = 3500;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");

      const [activeRes, deletedRes] = await Promise.all([
        axiosInstance.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } }),
        axiosInstance.get("/auth/users/deleted", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (activeRes.data.success) setUsers(activeRes.data.data);
      if (deletedRes.data.success) setDeletedUsers(deletedRes.data.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterUsers = useCallback(() => {
    if (statusFilter === "Deleted") {
      let filtered = deletedUsers.filter((u) => u.role === "Agency");
      if (searchTerm) {
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.agencyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.city?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      setFilteredUsers(filtered);
      return;
    }

    let filtered = users.filter((user) => user.role === "Agency");

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

    if (cityFilter !== "All") {
      filtered = filtered.filter((user) => user.city === cityFilter);
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, deletedUsers, searchTerm, cityFilter, statusFilter]);

  useEffect(() => {
    if (canViewPage) fetchUsers();
  }, [canViewPage, fetchUsers]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  // Only reset to page 1 when the filters/search/page-size actually change,
  // not when the underlying user data is updated (e.g. activating an agent).
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cityFilter, statusFilter, entriesPerPage]);

  if (!canViewPage) {
    return (
      <>
        <PageMeta title="Registered Agencies" description="Access denied" />
        <PageBreadCrumb pageTitle="All Agents" />
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          You do not have permission to view Registered Agencies.
        </div>
      </>
    );
  }

  const agencyUsers = users.filter((u) => u.role === "Agency");

  const allBookingOn =
    agencyUsers.length > 0 &&
    agencyUsers.every((u) => u.showHideButton === true);

  const allPriceOnCallOn =
    agencyUsers.length > 0 &&
    agencyUsers.every((u) => u.priceOnCall === true);

  const activeCount = users.filter(
    (u) => u.role === "Agency" && u.status === "Active"
  ).length;

  const pendingCount = users.filter(
    (u) => u.role === "Agency" && u.status === "Pending"
  ).length;

  const inactiveCount = users.filter(
    (u) => u.role === "Agency" && u.status === "Inactive"
  ).length;

  const reachedActiveLimit = activeCount >= MAX_ACTIVE_AGENTS;

  const uniqueCities = Array.from(
    new Set(users.filter((u) => u.city).map((u) => u.city))
  );

  const totalPages = Math.ceil(filteredUsers.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/20";
      case "Pending":
        return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/20";
      case "Inactive":
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/20";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="w-4 h-4" />;
      case "Pending":
        return <Clock className="w-4 h-4" />;
      case "Inactive":
        return <UserX className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatMargin = (user: User) => {
    if (user.marginType === "Amount") return `${user.flightMarginAmount ?? 0} PKR`;
    if (user.marginType === "Percentage") return `${user.flightMarginPercent ?? 0}%`;
    return user.margin || "0";
  };

  const updateUserStatus = async (
    userId: string,
    newStatus: "Active" | "Inactive" | "Pending"
  ) => {
    const userToUpdate = users.find((user) => user._id === userId);

    if (
      newStatus === "Active" &&
      userToUpdate?.status !== "Active" &&
      activeCount >= MAX_ACTIVE_AGENTS
    ) {
      toast.error(
        `Cannot activate more than ${MAX_ACTIVE_AGENTS} active agents. Deactivate another agent before activating this one.`
      );
      return;
    }

    try {
      setApprovalLoading(userId);
      const token = localStorage.getItem("admin_token");

      const response = await axiosInstance.patch(
        `/auth/users/${userId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        const updated = response.data.data as User;

        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? {
                ...u,
                status: newStatus,
                activatedBy: updated.activatedBy,
                deactivatedBy: updated.deactivatedBy,
                deactivatedAt: updated.deactivatedAt,
              }
              : u
          )
        );
        toast.success(`Agent status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update status");
    } finally {
      setApprovalLoading(null);
    }
  };

  const handleAgentLogin = (agent: User) => {
    if (!agent.agencyCode || !agent.email || !agent.plainPassword) {
      toast.error(
        "Missing agent credentials for auto login. Ensure email, code, and password are set."
      );
      return;
    }

    const params = new URLSearchParams({
      agentCode: agent.agencyCode,
      email: agent.email,
      password: agent.plainPassword,
      auto: "true",
    });

    const target = `${frontendUrl.replace(/\/$/, "")}/?${params.toString()}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const handleSendCredentials = async (userId: string) => {
    try {
      setSendingCredentials(userId);
      const token = localStorage.getItem("admin_token");

      const response = await axiosInstance.post(
        `/auth/users/${userId}/send-credentials`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Credentials sent successfully!");
      }
    } catch (error: unknown) {
      console.error("Error sending credentials:", error);

      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
      };

      let errorMessage = "Failed to send credentials email.";

      if (axiosError?.response?.status === 500) {
        errorMessage += " Email service is not configured properly.";
      } else {
        errorMessage +=
          axiosError?.response?.data?.message ||
          " An unexpected error occurred.";
      }

      toast.error(errorMessage);
    } finally {
      setSendingCredentials(null);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const token = localStorage.getItem("admin_token");

      const params = new URLSearchParams({
        searchTerm,
        city: cityFilter,
        status: statusFilter,
      });

      const response = await axiosInstance.get(
        `/export/users/pdf?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `agencies-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      const token = localStorage.getItem("admin_token");

      const params = new URLSearchParams({
        searchTerm,
        city: cityFilter,
        status: statusFilter,
      });

      const response = await axiosInstance.get(
        `/export/users/excel?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `agencies-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel downloaded successfully");
    } catch (error) {
      console.error("Error downloading Excel:", error);
      toast.error("Failed to download Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const togglePriceOnCall = async (userId: string, currentValue?: boolean) => {
    try {
      setPriceLoading(userId);
      const token = localStorage.getItem("admin_token");

      const response = await axiosInstance.patch(
        `/auth/users/${userId}/price-on-call`,
        { priceOnCall: !currentValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, priceOnCall: response.data.data.priceOnCall }
              : u
          )
        );
        toast.success(`Price on Call ${!currentValue ? "Enabled" : "Disabled"}`);
      }
    } catch (error) {
      console.error("Error updating Price on Call:", error);
      toast.error("Failed to update Price on Call");
    } finally {
      setPriceLoading(null);
    }
  };

  const toggleShowButton = async (userId: string, currentValue?: boolean) => {
    const newValue = !currentValue;

    setUsers((prev) =>
      prev.map((u) =>
        u._id === userId ? { ...u, showHideButton: newValue } : u
      )
    );

    try {
      setShowLoading(userId);
      const token = localStorage.getItem("admin_token");

      await axiosInstance.patch(
        `/auth/users/${userId}/show-booking-now`,
        { showHideButton: newValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success(`Booking Now ${newValue ? "Enabled" : "Disabled"}`);
    } catch (error) {
      console.error("Error updating Booking now:", error);
      toast.error("Failed to update Booking now");
    } finally {
      setShowLoading(null);
    }
  };

  const handleBulkBookingNowToggle = async () => {
    try {
      setBulkLoading(true);
      const token = localStorage.getItem("admin_token");
      const newValue = !allBookingOn;

      await axiosInstance.patch(
        "/auth/users/bulk-show-booking-now",
        { showHideButton: newValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u.role === "Agency" ? { ...u, showHideButton: newValue } : u
        )
      );

      toast.success(`Booking Now turned ${newValue ? "ON" : "OFF"} for all agencies`);
    } catch (error) {
      console.error("Bulk Booking update failed:", error);
      toast.error("Failed to update Booking Now");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPriceOnCallToggle = async () => {
    try {
      setBulkLoading(true);
      const token = localStorage.getItem("admin_token");
      const newValue = !allPriceOnCallOn;

      await axiosInstance.patch(
        "/bookings/bulkTogglePriceOnCall",
        { value: newValue },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u.role === "Agency" ? { ...u, priceOnCall: newValue } : u
        )
      );

      toast.success(`Price On Call turned ${newValue ? "ON" : "OFF"} for all agencies`);
    } catch (error) {
      console.error("Bulk Price on Call update failed:", error);
      toast.error("Failed to update Bulk Price On Call");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRecoverAgent = async (agent: User) => {
    if (!window.confirm(`Recover "${agent.name}" and restore their account?`)) return;

    try {
      setRecoveringAgent(agent._id);
      const token = localStorage.getItem("admin_token");

      const response = await axiosInstance.patch(`/auth/users/${agent._id}/recover`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setDeletedUsers((prev) => prev.filter((u) => u._id !== agent._id));
        setUsers((prev) => [...prev, response.data.data]);
        toast.success(`Agent "${agent.name}" recovered successfully`);
      }
    } catch (error) {
      console.error("Error recovering agent:", error);
      toast.error("Failed to recover agent");
    } finally {
      setRecoveringAgent(null);
    }
  };

  const copyCredentials = async () => {
    if (!selectedCredentials) return;

    const text = `Agent Code: ${selectedCredentials.agencyCode || "N/A"}
Email: ${selectedCredentials.email || "N/A"}
Password: ${selectedCredentials.plainPassword || "N/A"}
URL : ${frontendUrl}
`;

    await navigator.clipboard.writeText(text);
    toast.success("Credentials copied");
  };

  return (
    <>
      <PageMeta title="All Agents" description="Manage all registered agents" />
      <TopBar title={"Registered Agencies"} description="Manage your Registered Agents" />

      {reachedActiveLimit && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 shadow-sm dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Active agent limit reached: {MAX_ACTIVE_AGENTS}. New agent activation is blocked until at least one active agent is deactivated.</span>
        </div>
      )}

      {/* Compact Stats Cards */}
      <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-3">
        {/* Active Agents Card */}
        <div className="group relative overflow-hidden rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
            <UserCheck className="w-20 h-20" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-xs font-medium tracking-wide">Active</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-white tracking-tight">
                {activeCount}
                <span className="text-sm font-normal text-white/70 ml-1">/ {MAX_ACTIVE_AGENTS}</span>
              </div>
              <div className="text-xs text-white/80 font-medium bg-white/20 px-2 py-0.5 rounded-full">
                {Math.round((activeCount / MAX_ACTIVE_AGENTS) * 100)}%
              </div>
            </div>
            <div className="mt-2 w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(activeCount / MAX_ACTIVE_AGENTS) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Pending Agents Card */}
        <div className="group relative overflow-hidden rounded-xl bg-linear-to-br from-blue-500 to-blue-600 p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
            <Clock className="w-20 h-20" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-xs font-medium tracking-wide">Pending</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-white tracking-tight">
                {pendingCount}
              </div>
              <div className="text-xs text-white/80 font-medium bg-white/20 px-2 py-0.5 rounded-full">
                Waiting
              </div>
            </div>
            <div className="mt-2 w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pendingCount > 0 ? Math.min((pendingCount / 50) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Inactive Agents Card */}
        <div className="group relative overflow-hidden rounded-xl bg-linear-to-br from-rose-500 to-rose-600 p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
            <UserX className="w-20 h-20" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <UserX className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-xs font-medium tracking-wide">Inactive</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-white tracking-tight">
                {inactiveCount}
              </div>
              <div className="text-xs text-white/80 font-medium bg-white/20 px-2 py-0.5 rounded-full">
                Blocked
              </div>
            </div>
            <div className="mt-2 w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${inactiveCount > 0 ? Math.min((inactiveCount / 50) * 100, 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="px-4 py-6 md:px-6 xl:px-7.5">

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="All">All Cities</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-11 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
                <option value="Deleted">Deleted</option>
              </select>
            </div>

            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400">entries</span>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {canUseTopActions && (
                <>
                  <button
                    onClick={handleBulkPriceOnCallToggle}
                    disabled={bulkLoading || agencyUsers.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {bulkLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ToggleRight className="w-4 h-4" />
                    )}
                    {bulkLoading ? "Updating..." : `Price On Call: ${allPriceOnCallOn ? "ALL OFF" : "ALL ON"}`}
                  </button>

                  <button
                    onClick={handleBulkBookingNowToggle}
                    disabled={bulkLoading || agencyUsers.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {bulkLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ToggleRight className="w-4 h-4" />
                    )}
                    {bulkLoading ? "Updating..." : `Booking Now: ${allBookingOn ? "ALL OFF" : "ALL ON"}`}
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={downloadingPDF}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {downloadingPDF ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {downloadingPDF ? "Downloading..." : "PDF"}
                  </button>

                  <button
                    onClick={handleDownloadExcel}
                    disabled={downloadingExcel}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {downloadingExcel ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                    {downloadingExcel ? "Downloading..." : "Excel"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <div className="text-gray-500 dark:text-gray-400">Loading agents...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <div className="text-gray-500 dark:text-gray-400">No agents found</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">#</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Agency</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">City</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Margin</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Register Date</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Price on Call</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Booking Now</th>
                      <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedUsers.map((agent, index) => (
                      <tr
                        key={agent._id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors duration-150"
                      >
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {startIndex + index + 1}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Code: {agent.agencyCode || "N/A"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                              {agent.name?.charAt(0).toUpperCase() || "A"}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {agent.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {agent.phone || "No phone"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {agent.companyName || "N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {agent.city || "N/A"}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">

                            {formatMargin(agent)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                            {getStatusIcon(agent.status)}
                            {agent.status}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            By: {agent.activatedBy || "N/A"}
                          </div>
                          {agent.status === "Inactive" && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Deactivated by: {agent.deactivatedBy || "N/A"}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatDate(agent.createdAt)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            onClick={() => togglePriceOnCall(agent._id, agent.priceOnCall)}
                            disabled={priceLoading === agent._id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${agent.priceOnCall
                              ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {priceLoading === agent._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : agent.priceOnCall ? (
                              <ToggleRight className="w-3 h-3" />
                            ) : (
                              <ToggleLeft className="w-3 h-3" />
                            )}
                            {priceLoading === agent._id ? "..." : agent.priceOnCall ? "ON" : "OFF"}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            onClick={() => toggleShowButton(agent._id, agent.showHideButton)}
                            disabled={showLoading === agent._id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${agent.showHideButton
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {showLoading === agent._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : agent.showHideButton ? (
                              <ToggleRight className="w-3 h-3" />
                            ) : (
                              <ToggleLeft className="w-3 h-3" />
                            )}
                            {showLoading === agent._id ? "..." : agent.showHideButton ? "ON" : "OFF"}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          {canUseAgentActions ? (
                            <div className="flex flex-wrap gap-1.5">
                              {agent.status === "Active" ? (
                                <button
                                  onClick={() => updateUserStatus(agent._id, "Inactive")}
                                  disabled={approvalLoading === agent._id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-300 disabled:opacity-50 transition-colors duration-200"
                                >
                                  {approvalLoading === agent._id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UserX className="w-3 h-3" />
                                  )}
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateUserStatus(agent._id, "Active")}
                                  disabled={approvalLoading === agent._id || reachedActiveLimit}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 disabled:opacity-50 transition-colors duration-200"
                                >
                                  {approvalLoading === agent._id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UserCheck className="w-3 h-3" />
                                  )}
                                  Activate
                                </button>
                              )}

                              <button
                                onClick={() => handleSendCredentials(agent._id)}
                                disabled={sendingCredentials === agent._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300 disabled:opacity-50 transition-colors duration-200"
                              >
                                {sendingCredentials === agent._id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Mail className="w-3 h-3" />
                                )}
                                Send
                              </button>

                              <button
                                onClick={() => setSelectedCredentials(agent)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 transition-colors duration-200"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </button>

                              {agent.status === "Active" && (
                                <button
                                  onClick={() => handleAgentLogin(agent)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/20 dark:text-violet-300 transition-colors duration-200"
                                >
                                  <LogIn className="w-3 h-3" />
                                  Login
                                </button>
                              )}

                              <button
                                onClick={() => navigate(`/registered-agencies/${agent._id}`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 transition-colors duration-200"
                              >
                                <MoreVertical className="w-3 h-3" />
                                Detail
                              </button>

                              {agent.isDeleted && (
                                <button
                                  onClick={() => handleRecoverAgent(agent)}
                                  disabled={recoveringAgent === agent._id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/20 dark:text-teal-300 disabled:opacity-50 transition-colors duration-200"
                                >
                                  {recoveringAgent === agent._id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  Recover
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No actions</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredUsers.length === 0 ? 0 : startIndex + 1} to{" "}
                  {Math.min(endIndex, filteredUsers.length)} of{" "}
                  {filteredUsers.length} results
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-white/90">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Credentials Modal */}
      {selectedCredentials && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 transform transition-all animate-slideUp">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" />
                Agent Credentials
              </h2>

              <button
                onClick={() => setSelectedCredentials(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 hover:text-gray-800 dark:hover:text-white" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="font-medium text-gray-600 dark:text-gray-400">Login Link</span>
                <span className="text-gray-900 dark:text-white font-medium">{frontendUrl}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="font-medium text-gray-600 dark:text-gray-400">Name</span>
                <span className="text-gray-900 dark:text-white font-medium">{selectedCredentials.name || "N/A"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="font-medium text-gray-600 dark:text-gray-400">Company</span>
                <span className="text-gray-900 dark:text-white">{selectedCredentials.companyName || "N/A"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="font-medium text-gray-600 dark:text-gray-400">Agent Code</span>
                <span className="text-gray-900 dark:text-white font-mono">{selectedCredentials.agencyCode || "N/A"}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="font-medium text-gray-600 dark:text-gray-400">Email</span>
                <span className="text-gray-900 dark:text-white">{selectedCredentials.email || "N/A"}</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="font-medium text-gray-600 dark:text-gray-400">Password</span>
                <span className="text-gray-900 dark:text-white font-mono">{selectedCredentials.plainPassword || "N/A"}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={copyCredentials}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 transition-colors duration-200"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>

              <button
                onClick={() => setSelectedCredentials(null)}
                className="px-4 py-2 rounded-xl bg-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-white/90 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RegisteredAgencies;