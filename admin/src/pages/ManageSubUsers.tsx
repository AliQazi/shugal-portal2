import { Fragment, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../Api/axios";
import { toast } from "react-toastify";
import { FiChevronDown, FiChevronUp, FiCopy, FiEye, FiEyeOff, FiMail, FiEdit, FiTrash2, FiCheckCircle } from "react-icons/fi";
import { hasAnyPermission, hasPermission } from "../utils/permissions";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import NotFound from "./OtherPage/NotFound";

interface SubUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  plainPassword?: string;
  permissions?: string[];
  status: string;
  companyName: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  parentAdminId?: {
    _id: string;
    name: string;
    email: string;
  } | string | null;
}

const ManageSubUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canView = hasAnyPermission(user, [
    "view_sub_users",
    "create_sub_user",
    "edit_sub_user",
    "delete_sub_user",
    "activate_sub_user",
  ]);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [sendingCredentials, setSendingCredentials] = useState<string | null>(null);

  const activeCount = subUsers.filter((subUser) => subUser.status === "Active").length;
  const inactiveCount = subUsers.length - activeCount;

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyPassword = async (password?: string) => {
    if (!password) {
      toast.error("No password available to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied to clipboard");
    } catch (error) {
      console.error("Error copying password:", error);
      toast.error("Unable to copy password");
    }
  };

  const getCreatorLabel = (subUser: SubUser) => {
    if (subUser.createdBy?.name || subUser.createdBy?.email) {
      return {
        name: subUser.createdBy.name || subUser.createdBy.email,
        email: subUser.createdBy.email || "",
      };
    }

    if (subUser.parentAdminId && typeof subUser.parentAdminId === "object") {
      return {
        name: subUser.parentAdminId.name || "Main Admin",
        email: subUser.parentAdminId.email || "",
      };
    }

    return {
      name: "Main Admin",
      email: "",
    };
  };

  // Fetch sub-users
  const fetchSubUsers = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/sub-users");
      setSubUsers(res.data.data);
    } catch (error: unknown) {
      console.error("Error fetching sub-users:", error);
      const message = error instanceof Error ? error.message : "Failed to fetch sub-users";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubUsers();
  }, []);

  // Check if user has permission to view sub-users page
  if (!canView) {
    return <NotFound />;
  }

  const handleDelete = async (id: string) => {
    if (!hasPermission(user, "delete_sub_user")) {
      toast.error("You don't have permission to deactivate sub-users");
      return;
    }

    if (!window.confirm("Are you sure you want to deactivate this sub-user?")) {
      return;
    }

    try {
      const res = await axiosInstance.delete(`/sub-users/${id}`);
      toast.success(res.data.message);
      fetchSubUsers();
    } catch (error: unknown) {
      console.error("Error deleting sub-user:", error);
      const message = error instanceof Error ? error.message : "Failed to deactivate sub-user";
      toast.error(message);
    }
  };

  const handleActivate = async (id: string) => {
    if (!hasPermission(user, "activate_sub_user")) {
      toast.error("You don't have permission to activate sub-users");
      return;
    }

    try {
      const res = await axiosInstance.patch(`/sub-users/${id}/activate`);
      toast.success(res.data.message);
      fetchSubUsers();
    } catch (error: unknown) {
      console.error("Error activating sub-user:", error);
      const message = error instanceof Error ? error.message : "Failed to activate sub-user";
      toast.error(message);
    }
  };

  const handleSendCredentials = async (id: string) => {
    try {
      setSendingCredentials(id);
      const res = await axiosInstance.post(`/sub-users/${id}/send-credentials`);
      toast.success(res.data.message || "Credentials sent successfully");
    } catch (error: unknown) {
      console.error("Error sending sub-user credentials:", error);
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ||
        (axiosError?.response?.status === 500
          ? "Failed to send credentials email. Please check email configuration."
          : "Failed to send credentials email.");
      toast.error(message);
    } finally {
      setSendingCredentials(null);
    }
  };

  return (
    <>
      <PageBreadCrumb pageTitle="Manage Sub Users" />

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-4 py-6 dark:border-strokedark sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-title-md2 font-bold text-black dark:text-white">
                Sub-Users Management
              </h2>
              <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                Manage active and inactive sub-users, review permissions, and update access levels in one place.
              </p>
            </div>

            <button
              onClick={() => {
                if (hasPermission(user, "create_sub_user")) {
                  navigate("/create-sub-user");
                }
              }}
              disabled={!hasPermission(user, "create_sub_user")}
              className={`inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-medium transition ${hasPermission(user, "create_sub_user")
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400"
                }`}
              title={!hasPermission(user, "create_sub_user") ? "You don't have permission to create sub-users" : ""}
            >
              + Add Sub-User
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Total Sub-Users</p>
              <p className="mt-3 text-3xl font-semibold text-black dark:text-white">{subUsers.length}</p>
            </div>
            <div className="rounded-xl border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Active</p>
              <p className="mt-3 text-3xl font-semibold text-success dark:text-success">{activeCount}</p>
            </div>
            <div className="rounded-xl border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Inactive</p>
              <p className="mt-3 text-3xl font-semibold text-red-600 dark:text-red-400">{inactiveCount}</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-400">
            📝 <span className="font-medium">Note:</span> Sub-users can only access features based on their assigned permissions.
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">Loading sub-users...</p>
          </div>
        ) : subUsers.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No sub-users found. Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto px-4 pb-6 sm:px-6">
            <table className="w-full min-w-215 divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 text-left text-xs uppercase tracking-[0.12em] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-4">User</th>
                  <th className="px-4 py-4">Contact</th>
                  <th className="px-4 py-4">Created By</th>
                  <th className="px-4 py-4">Password</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {subUsers.map((subUser) => {
                  const showPassword = visiblePasswords[subUser._id];
                  const isExpanded = expandedRows[subUser._id];
                  const passwordValue = subUser.plainPassword ?? "Not set";
                  const maskedPassword = subUser.plainPassword ? "•".repeat(Math.min(subUser.plainPassword.length, 10)) : "Not set";
                  const creator = getCreatorLabel(subUser);
                  const statusClasses = subUser.status === "Active"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";

                  return (
                    <Fragment key={subUser._id}>
                      <tr className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900/50">
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleRowExpansion(subUser._id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
                              aria-label={isExpanded ? "Collapse permissions" : "Expand permissions"}
                            >
                              {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                            </button>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{subUser.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm text-gray-900 dark:text-white">{subUser.email}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{subUser.phone}</p>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{creator.name}</p>
                          {creator.email ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{creator.email}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex flex-col gap-2">
                            <div className="min-w-45 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                              {showPassword ? passwordValue : maskedPassword}
                            </div>
                            {subUser.plainPassword ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(subUser._id)}
                                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
                                >
                                  {showPassword ? <><FiEyeOff size={16} /> Hide</> : <><FiEye size={16} /> Show</>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyPassword(subUser.plainPassword)}
                                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:border-green-500 hover:text-green-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-green-500 dark:hover:text-green-400"
                                >
                                  <FiCopy size={16} /> Copy
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusClasses}`}>
                            {subUser.status === "Active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex flex-wrap justify-center items-center gap-2">
                            <button
                              onClick={() => {
                                if (hasPermission(user, "edit_sub_user")) {
                                  navigate(`/edit-sub-user/${subUser._id}`);
                                }
                              }}
                              disabled={!hasPermission(user, "edit_sub_user")}
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${hasPermission(user, "edit_sub_user")
                                ? "border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:text-white"
                                : "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                                }`}
                              title={hasPermission(user, "edit_sub_user") ? "Edit sub-user" : "You don't have permission to edit"}
                              aria-label="Edit sub-user"
                            >
                              <FiEdit size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendCredentials(subUser._id)}
                              disabled={sendingCredentials === subUser._id || !subUser.plainPassword}
                              className="inline-flex gap-1 h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-xs font-medium text-yellow-700 transition hover:border-yellow-500 hover:text-yellow-800 disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700 dark:text-yellow-400 dark:hover:border-yellow-500 dark:hover:text-yellow-300 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
                              title={subUser.plainPassword ? "Send credentials by email" : "No password available to send"}
                            >
                              {sendingCredentials === subUser._id ? "Sending..." : <><FiMail size={16} /> Send</>}
                            </button>

                            {subUser.status === "Active" ? (
                              <button
                                onClick={() => {
                                  if (hasPermission(user, "delete_sub_user")) {
                                    handleDelete(subUser._id);
                                  }
                                }}
                                disabled={!hasPermission(user, "delete_sub_user")}
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${hasPermission(user, "delete_sub_user")
                                  ? "border-gray-200 text-red-600 hover:border-red-500 hover:text-red-700 dark:border-gray-700 dark:text-red-400"
                                  : "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                                  }`}
                                title={hasPermission(user, "delete_sub_user") ? "Deactivate sub-user" : "You don't have permission to deactivate"}
                                aria-label="Deactivate sub-user"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (hasPermission(user, "activate_sub_user")) {
                                    handleActivate(subUser._id);
                                  }
                                }}
                                disabled={!hasPermission(user, "activate_sub_user")}
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${hasPermission(user, "activate_sub_user")
                                  ? "border-gray-200 text-green-600 hover:border-green-500 hover:text-green-700 dark:border-gray-700 dark:text-green-400"
                                  : "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                                  }`}
                                title={hasPermission(user, "activate_sub_user") ? "Activate sub-user" : "You don't have permission to activate"}
                                aria-label="Activate sub-user"
                              >
                                <FiCheckCircle size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Permissions</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {subUser.permissions && subUser.permissions.length > 0 ? (
                                    subUser.permissions.map((perm) => (
                                      <span
                                        key={perm}
                                        className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                      >
                                        {perm.replace(/_/g, " ")}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-gray-500">No permissions assigned</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Details</p>
                                <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                  <p><span className="font-medium">Created:</span> {new Date(subUser.createdAt).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                  })}</p>
                                  <p><span className="font-medium">Status:</span> {subUser.status}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default ManageSubUsers;