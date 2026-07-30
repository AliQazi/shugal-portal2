import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../Api/axios";
import { toast } from "react-toastify";
import { hasPermission } from "../utils/permissions";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { Modal } from "../components/ui/modal";
import NotFound from "./OtherPage/NotFound";

// interface SubUser {
//   _id: string;
//   name: string;
//   email: string;
//   phone: string;
//   permissions?: string[];
//   companyName: string;
// }

type PermissionItem = {
  key: string;
  label: string;
};

const AVAILABLE_PERMISSIONS: PermissionItem[] = [
  { key: "view_dashboard", label: "View Dashboard" },
  { key: "dashboard_shortcuts", label: "Dashboard Shortcuts" },
  { key: "dashboard_group_category", label: "Dashboard Group Category" },
  { key: "dashboard_recent_bookings", label: "Dashboard Recent Bookings" },
  { key: "dashboard_agent_status_graph", label: "Dashboard Agent Status Graph" },
  { key: "dashboard_apply_margin", label: "Dashboard Apply Margin" },
  { key: "dashboard_copy_sector_data", label: "Dashboard Copy Sector Data" },

  { key: "view_register_agencies", label: "View Registered Agencies" },
  { key: "agencies_top_action_buttons", label: "Agencies Top Action Buttons" },
  { key: "agent_action_buttons", label: "Agent Action Buttons" },

  { key: "view_banks", label: "View Banks" },
  { key: "add_bank", label: "Add Bank" },
  { key: "manage_banks", label: "Manage Banks" },

  { key: "view_umrah_package_bookings", label: "View Umrah Package Bookings" },
  { key: "view_umrah_package_booking_details", label: "View Umrah Package Booking Details" },
  { key: "manage_umrah_package_booking", label: "Manage Umrah Package Booking" },

  { key: "view_sectors", label: "View Sectors" },
  { key: "add_sector", label: "Add Sector" },
  { key: "manage_sectors", label: "Manage Sectors" },
  { key: "manage_sectors_sorting", label: "Manage Sectors Sorting" },

  { key: "view_airlines", label: "View Airlines" },
  { key: "add_airline", label: "Add Airline" },
  { key: "manage_airlines", label: "Manage Airlines" },

  { key: "view_bookings", label: "View Bookings" },
  { key: "bookings_action_buttons", label: "Bookings Action Buttons" },
  { key: "update_bookings_status", label: "Update Bookings Status" },
  { key: "update_bookings_discount", label: "Update Bookings Discount" },

  { key: "view_special_offers", label: "View Special Offers" },
  { key: "add_special_offers", label: "Add Special Offers" },
  { key: "manage_special_offers", label: "Manage Special Offers" },

  { key: "api_groups", label: "API Groups" },

  { key: "view_team_contacts", label: "View Team Contacts" },
  { key: "add_team_contacts", label: "Add Team Contacts" },
  { key: "manage_team_contacts", label: "Manage Team Contacts" },

  { key: "view_sub_users", label: "View Sub-Users" },
  { key: "create_sub_user", label: "Create Sub-User" },
  { key: "edit_sub_user", label: "Edit Sub-User" },
  { key: "delete_sub_user", label: "Delete Sub-User" },
  { key: "activate_sub_user", label: "Activate Sub-User" },

  { key: "view_hotels", label: "View Hotels" },
  { key: "add_hotel", label: "Add Hotel" },
  { key: "manage_hotels", label: "Manage Hotels" },

  { key: "view_transports", label: "View Transports" },
  { key: "add_transport", label: "Add Transport" },
  { key: "manage_transports", label: "Manage Transports" },

  { key: "view_visas", label: "View Visas" },
  { key: "add_visa", label: "Add Visa" },
  { key: "manage_visas", label: "Manage Visas" },

  { key: "create_umrah_package", label: "Create Umrah Package" },
  { key: "view_umrah_packages", label: "View Umrah Packages" },
  { key: "umrah_packages_action_buttons", label: "Umrah Packages Action Buttons" },

  { key: "create_group", label: "Create Group" },
  { key: "view_groups", label: "View Groups" },
  { key: "group_ticketing_action_buttons", label: "Group Ticketing Action Buttons" },

  { key: "view_ledger", label: "View Ledger" },
  { key: "ledger_action_buttons", label: "Ledger Action Buttons" },
  { key: "view_payment_vouchers", label: "View Payment Vouchers" },

  { key: "global_settings", label: "Global Settings" },
  { key: "view_activity_logs", label: "View Activity Logs" },
];

const getPermissionsByKeys = (keys: string[]) =>
  keys
    .map((key) => AVAILABLE_PERMISSIONS.find((permission) => permission.key === key))
    .filter((permission): permission is PermissionItem => Boolean(permission));

const PERMISSION_GROUPS = [
  {
    title: "Dashboard",
    permissions: getPermissionsByKeys([
      "view_dashboard",
      "dashboard_shortcuts",
      "dashboard_group_category",
      "dashboard_recent_bookings",
      "dashboard_agent_status_graph",
      "dashboard_apply_margin",
      "dashboard_copy_sector_data",
      "global_settings",
    ]),
  },
  {
    title: "Registered Agencies",
    permissions: getPermissionsByKeys([
      "view_register_agencies",
      "agencies_top_action_buttons",
      "agent_action_buttons",
    ]),
  },
  {
    title: "Banks",
    permissions: getPermissionsByKeys(["view_banks", "add_bank", "manage_banks"]),
  },
  {
    title: "Umrah Package Bookings",
    permissions: getPermissionsByKeys([
      "view_umrah_package_bookings",
      "view_umrah_package_booking_details",
      "manage_umrah_package_booking",
    ]),
  },
  {
    title: "Sectors",
    permissions: getPermissionsByKeys([
      "view_sectors",
      "add_sector",
      "manage_sectors",
      "manage_sectors_sorting",
    ]),
  },
  {
    title: "Airlines",
    permissions: getPermissionsByKeys(["view_airlines", "add_airline", "manage_airlines"]),
  },
  {
    title: "Bookings",
    permissions: getPermissionsByKeys([
      "view_bookings",
      "bookings_action_buttons",
      "update_bookings_status",
      "update_bookings_discount",
    ]),
  },
  {
    title: "Special Offers",
    permissions: getPermissionsByKeys([
      "view_special_offers",
      "add_special_offers",
      "manage_special_offers",
    ]),
  },
  {
    title: "API Groups",
    permissions: getPermissionsByKeys(["api_groups"]),
  },
  {
    title: "Team Contacts",
    permissions: getPermissionsByKeys([
      "view_team_contacts",
      "add_team_contacts",
      "manage_team_contacts",
    ]),
  },
  {
    title: "Sub-Users",
    permissions: getPermissionsByKeys([
      "view_sub_users",
      "create_sub_user",
      "edit_sub_user",
      "delete_sub_user",
      "activate_sub_user",
    ]),
  },
  {
    title: "Hotels",
    permissions: getPermissionsByKeys(["view_hotels", "add_hotel", "manage_hotels"]),
  },
  {
    title: "Transports",
    permissions: getPermissionsByKeys([
      "view_transports",
      "add_transport",
      "manage_transports",
    ]),
  },
  {
    title: "Visas",
    permissions: getPermissionsByKeys(["view_visas", "add_visa", "manage_visas"]),
  },
  {
    title: "Umrah Packages",
    permissions: getPermissionsByKeys([
      "create_umrah_package",
      "view_umrah_packages",
      "umrah_packages_action_buttons",
    ]),
  },
  {
    title: "Group Ticketing",
    permissions: getPermissionsByKeys([
      "create_group",
      "view_groups",
      "group_ticketing_action_buttons",
    ]),
  },
  {
    title: "Ledger",
    permissions: getPermissionsByKeys([
      "view_ledger",
      "ledger_action_buttons",
      "view_payment_vouchers",
    ]),
  },
  {
    title: "Activity Logs",
    permissions: getPermissionsByKeys([
      "view_activity_logs",
    ]),
  },
];

const CreateEditSubUser = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    name: string;
    email: string;
    password: string;
    message: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    permissions: [] as string[],
    address: "",
    city: "",
    country: "",
  });

  const visiblePermissionGroups = PERMISSION_GROUPS
    .map((group) => ({
      ...group,
      permissions: user?.isSubUser
        ? group.permissions.filter((permission) => hasPermission(user, permission.key))
        : group.permissions,
    }))
    .filter((group) => group.permissions.length > 0);

  if (isEditMode && !hasPermission(user, "edit_sub_user")) {
    return <NotFound />;
  }

  if (!isEditMode && !hasPermission(user, "create_sub_user")) {
    return <NotFound />;
  }

  // Fetch sub-user data if editing
  useEffect(() => {
    if (isEditMode) {
      const fetchSubUser = async () => {
        try {
          setLoading(true);
          const res = await axiosInstance.get(`/sub-users/${id}`);
          const subUser = res.data.data;
          setFormData({
            name: subUser.name,
            email: subUser.email,
            phone: subUser.phone,
            permissions: subUser.permissions || [],
            address: subUser.address || "",
            city: subUser.city || "",
            country: subUser.country || "",
          });
        } catch (error) {
          console.error("Error fetching sub-user:", error);
          toast.error("Failed to fetch sub-user details");
          navigate("/manage-sub-users");
        } finally {
          setLoading(false);
        }
      };

      fetchSubUser();
    }
  }, [isEditMode, id, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        permissions: checked
          ? [...prev.permissions, value]
          : prev.permissions.filter((p) => p !== value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.permissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    try {
      setSubmitting(true);

      if (isEditMode) {
        // Update existing sub-user
        const res = await axiosInstance.put(`/sub-users/${id}`, formData);
        toast.success(res.data.message);
        navigate("/manage-sub-users");
      } else {
        // Create new sub-user
        const res = await axiosInstance.post("/sub-users", formData);
        const tempPassword = res.data.data?.tempPassword || "";

        setSuccessModalData({
          name: formData.name,
          email: formData.email,
          password: tempPassword,
          message: res.data.message || "Sub-user created successfully!",
        });
      }
    } catch (error: any) {
      console.error("Error saving sub-user:", error);
      toast.error(error.response?.data?.message || "Failed to save sub-user");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageBreadCrumb pageTitle={isEditMode ? "Edit Sub-User" : "Create Sub-User"} />
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle={isEditMode ? "Edit Sub-User" : "Create Sub-User"} />

      <div className="grid grid-cols-1 gap-9">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h2 className="text-title-sm font-bold text-black dark:text-white">
                {isEditMode ? "Edit Sub-User Details" : "Create New Sub-User"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email"
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  disabled={isEditMode}
                  required
                />
              </div>

              <div className="mb-6">
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone"
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                  className="w-full rounded border border-stroke bg-transparent px-4 py-2 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2.5 block font-medium text-black dark:text-white">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                    className="w-full rounded border border-stroke bg-transparent px-4 py-2 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-2.5 block font-medium text-black dark:text-white">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Enter country"
                    className="w-full rounded border border-stroke bg-transparent px-4 py-2 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Permissions <span className="text-red-600">*</span>
                </label>
                <div className="rounded border border-stroke bg-gray-1 p-4 dark:border-strokedark dark:bg-meta-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visiblePermissionGroups.map((group) => (
                      <div
                        key={group.title}
                        className="rounded border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark"
                      >
                        <h3 className="mb-3 border-b border-stroke pb-2 text-sm font-semibold text-black dark:border-strokedark dark:text-white">
                          {group.title}
                        </h3>
                        <div className="space-y-3">
                          {group.permissions.map((perm) => (
                            <label key={perm.key} className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                name={perm.key}
                                value={perm.key}
                                checked={formData.permissions.includes(perm.key)}
                                onChange={handleInputChange}
                                className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-strokedark"
                              />
                              <span className="ml-3 text-sm text-black dark:text-white">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-8 py-3 text-center font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Saving..." : isEditMode ? "Update Sub-User" : "Create Sub-User"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/manage-sub-users")}
                  className="inline-flex items-center justify-center rounded-md border border-stroke px-8 py-3 text-center font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(successModalData)}
        onClose={() => {
          setSuccessModalData(null);
          navigate("/manage-sub-users");
        }}
        className="mx-4 max-w-xl p-6 sm:mx-0"
      >
        {successModalData && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 12.5L11.5 15L15 10.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-black dark:text-white">Sub-user created successfully</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Share this temporary password securely. The user will be prompted to update it on first login.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-stroke bg-gray-50 p-5 dark:border-strokedark dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Name</p>
                  <p className="text-base font-medium text-black dark:text-white">{successModalData.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-base font-medium text-black dark:text-white">{successModalData.email}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Temporary Password</p>
                      <p className="mt-1 font-mono text-lg font-semibold text-black dark:text-white">
                        {successModalData.password || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!successModalData?.password) return;
                        try {
                          await navigator.clipboard.writeText(successModalData.password);
                          toast.success("Password copied to clipboard");
                        } catch (copyError) {
                          console.error(copyError);
                          toast.error("Unable to copy password. Please copy manually.");
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-stroke bg-white px-4 py-2 text-sm font-medium text-black transition hover:border-primary hover:text-primary hover:bg-neutral-100 dark:border-strokedark dark:bg-gray-900 dark:text-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setSuccessModalData(null);
                  navigate("/manage-sub-users");
                }}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default CreateEditSubUser;
