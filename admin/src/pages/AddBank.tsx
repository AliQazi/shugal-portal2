import { useState, useEffect } from "react";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import TopBar from "../components/ui/Header/TopBar";
import {
  Building,
  User,
  CreditCard,
  Hash,
  MapPin,
  Image,
  Upload,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Banknote,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  X
} from "lucide-react";

interface Bank {
  _id: string;
  bankName: string;
  accountTitle: string;
  accountNo: string;
  ibn: string;
  bankAddress: string;
  logo: string;
  status: "Active" | "De-Active";
  createdAt: string;
}

const AddBank = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, "view_banks");
  const canAdd = hasPermission(user, "add_bank");
  const canManage = hasPermission(user, "manage_banks");

  const [formData, setFormData] = useState({
    bankName: "",
    accountTitle: "",
    accountNo: "",
    ibn: "",
    bankAddress: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  // Fetch all banks
  const fetchBanks = async () => {
    try {
      setFetchLoading(true);
      const response = await axiosInstance.get("/bank");
      if (response.data.success) {
        setBanks(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching banks:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to fetch banks",
      });
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchBanks();
    }
  }, [canView]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (bank: Bank) => {
    if (!canManage) {
      setMessage({ type: "error", text: "You don't have permission to manage banks" });
      return;
    }

    setIsEditing(true);
    setEditingBank(bank);
    setFormData({
      bankName: bank.bankName,
      accountTitle: bank.accountTitle,
      accountNo: bank.accountNo,
      ibn: bank.ibn,
      bankAddress: bank.bankAddress,
    });
    setLogo(null);
    setLogoPreview(bank.logo || null);
    setMessage({ type: "", text: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingBank(null);
    setFormData({
      bankName: "",
      accountTitle: "",
      accountNo: "",
      ibn: "",
      bankAddress: "",
    });
    setLogo(null);
    setLogoPreview(null);
    setMessage({ type: "", text: "" });
    const fileInput = document.getElementById("logo") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const canSave = isEditing ? canManage : canAdd;
    if (!canSave) {
      setMessage({
        type: "error",
        text: isEditing ? "You don't have permission to update banks" : "You don't have permission to add banks",
      });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const submitData = new FormData();
      submitData.append("bankName", formData.bankName);
      submitData.append("accountTitle", formData.accountTitle);
      submitData.append("accountNo", formData.accountNo);
      submitData.append("ibn", formData.ibn);
      submitData.append("bankAddress", formData.bankAddress);

      if (logo) {
        submitData.append("logo", logo);
      }

      let response;
      if (isEditing && editingBank) {
        response = await axiosInstance.put(`/bank/${editingBank._id}`, submitData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        response = await axiosInstance.post("/bank/add", submitData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      if (response.data.success) {
        setMessage({
          type: "success",
          text: response.data.message || `Bank ${isEditing ? "updated" : "added"} successfully!`,
        });

        setFormData({
          bankName: "",
          accountTitle: "",
          accountNo: "",
          ibn: "",
          bankAddress: "",
        });
        setLogo(null);
        setLogoPreview(null);
        setIsEditing(false);
        setEditingBank(null);

        const fileInput = document.getElementById("logo") as HTMLInputElement;
        if (fileInput) fileInput.value = "";

        fetchBanks();

        // Auto dismiss success message after 5 seconds
        setTimeout(() => {
          setMessage({ type: "", text: "" });
        }, 5000);
      }
    } catch (error: any) {
      console.error(`Error ${isEditing ? "updating" : "adding"} bank:`, error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || `Failed to ${isEditing ? "update" : "add"} bank`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      setMessage({ type: "error", text: "You don't have permission to delete banks" });
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this bank?"
    );

    if (!confirmDelete) return;

    try {
      setDeleteLoading(id);
      const response = await axiosInstance.delete(`/bank/${id}`);

      if (response.data.success) {
        setMessage({
          type: "success",
          text: response.data.message || "Bank deleted successfully",
        });

        fetchBanks();

        // Auto dismiss success message after 5 seconds
        setTimeout(() => {
          setMessage({ type: "", text: "" });
        }, 5000);
      }
    } catch (error: any) {
      console.error("Error deleting bank:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to delete bank",
      });
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (!canManage) {
      setMessage({ type: "error", text: "You don't have permission to update bank status" });
      return;
    }

    try {
      setStatusLoading(id);
      const response = await axiosInstance.patch(
        `/bank/toggleStatus/${id}`
      );

      if (response.data.success) {
        setMessage({
          type: "success",
          text: response.data.message || "Status updated successfully",
        });

        fetchBanks();

        // Auto dismiss success message after 5 seconds
        setTimeout(() => {
          setMessage({ type: "", text: "" });
        }, 5000);
      }
    } catch (error: any) {
      console.error("Error updating bank status:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update status",
      });
    } finally {
      setStatusLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Active") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
          <CheckCircle className="w-3.5 h-3.5" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
        <XCircle className="w-3.5 h-3.5" />
        De-Active
      </span>
    );
  };

  const filteredBanks = banks.filter((bank) => {
    const matchesSearch = bank.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.accountTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.accountNo.includes(searchTerm);
    const matchesStatus = statusFilter === "All" || bank.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!canView) {
    return (
      <>
        <PageMeta title="Banks - Access denied" description="Access denied" />
        <PageBreadCrumb pageTitle="Add New Bank" />
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          You do not have permission to view Banks.
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Add New Bank" description="Manage and add bank accounts" />
      <TopBar title="Add Banks" description="Add and Manage your bank accounts here for accepting payments." />

      {/* Form Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden mb-8 transition-all">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? "Edit Bank" : "Add New Bank"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isEditing ? "Update bank information" : "Fill in the details to add a new bank"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
              : "bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"
              }`}>
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <Building className="w-4 h-4" />
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="Enter Bank Name"
                  className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm text-gray-900 dark:text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <User className="w-4 h-4" />
                  Account Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="accountTitle"
                  name="accountTitle"
                  value={formData.accountTitle}
                  onChange={handleInputChange}
                  placeholder="Enter Account Title"
                  className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm text-gray-900 dark:text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Account No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="accountNo"
                  name="accountNo"
                  value={formData.accountNo}
                  onChange={handleInputChange}
                  placeholder="Enter Account No"
                  className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm text-gray-900 dark:text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <Hash className="w-4 h-4" />
                  IBN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="ibn"
                  name="ibn"
                  value={formData.ibn}
                  onChange={handleInputChange}
                  placeholder="IBN Number"
                  className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm text-gray-900 dark:text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Bank Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="bankAddress"
                  name="bankAddress"
                  value={formData.bankAddress}
                  onChange={handleInputChange}
                  placeholder="Enter Bank Address"
                  className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm text-gray-900 dark:text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <Image className="w-4 h-4" />
                  Upload Logo
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="logo"
                    name="logo"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full h-11 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center gap-2 transition-all hover:border-blue-500 dark:hover:border-blue-400">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {logo ? logo.name : "Choose logo"}
                    </span>
                  </div>
                </div>
                {logoPreview && (
                  <div className="mt-2">
                    <img src={logoPreview} alt="Logo preview" className="h-12 w-auto rounded-lg border border-gray-200 dark:border-gray-700" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-all duration-200 dark:bg-gray-800 dark:text-white/90 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading || (isEditing ? !canManage : !canAdd)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg shadow-blue-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEditing ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>
                    {isEditing ? <RefreshCw className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isEditing ? "Update Bank" : "Add Bank"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Banks List Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700 rounded-xl">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  All Banks
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {banks.length} banks available
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search banks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-48 h-10 pl-9 pr-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-400"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:border-blue-400"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="De-Active">De-Active</option>
              </select>
            </div>
          </div>
        </div>

        {fetchLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading banks...</p>
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              {banks.length === 0 ? "No banks found" : "No banks match your filters"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">IBN</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Logo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredBanks.map((bank, index) => (
                  <tr key={bank._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {bank.bankName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {bank.bankAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {bank.accountTitle}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {bank.accountNo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                        {bank.ibn}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {bank.logo ? (
                        <img
                          src={bank.logo}
                          alt={bank.bankName}
                          className="h-10 w-auto object-contain rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-white dark:bg-gray-800"
                        />
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          No logo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(bank._id)}
                        disabled={!canManage || statusLoading === bank._id}
                        className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!canManage ? "You don't have permission to update status" : ""}
                      >
                        {statusLoading === bank._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : (
                          getStatusBadge(bank.status)
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(bank)}
                          disabled={!canManage}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!canManage ? "You don't have permission to manage banks" : ""}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(bank._id)}
                          disabled={!canManage || deleteLoading === bank._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/30 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!canManage ? "You don't have permission to delete banks" : ""}
                        >
                          {deleteLoading === bank._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
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
    </>
  );
};

export default AddBank;