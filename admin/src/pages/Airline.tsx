import { useState, useEffect } from "react";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

interface Airline {
  _id: string;
  airlineCode: string;
  airlineName: string;
  shortCode: string;
  logo: string;
  status: "Active" | "De-Active";
  createdAt: string;
}

const Airline = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, "view_airlines");
  const canAdd = hasPermission(user, "add_airline");
  const canManage = hasPermission(user, "manage_airlines");
  const [formData, setFormData] = useState({
    airlineCode: "",
    airlineName: "",
    shortCode: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingAirline, setEditingAirline] = useState<Airline | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch all airlines
  const fetchAirlines = async () => {
    try {
      setFetchLoading(true);
      const response = await axiosInstance.get("/airline");
      if (response.data.success) {
        setAirlines(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching airlines:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to fetch airlines",
      });
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchAirlines();
    }
  }, [canView]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
    }
  };

  const handleEdit = (airline: Airline) => {
    if (!canManage) {
      setMessage({ type: "error", text: "You don't have permission to manage airlines" });
      return;
    }

    setIsEditing(true);
    setEditingAirline(airline);
    setFormData({
      airlineCode: airline.airlineCode,
      airlineName: airline.airlineName,
      shortCode: airline.shortCode,
    });
    setLogo(null);
    setMessage({ type: "", text: "" });
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingAirline(null);
    setFormData({
      airlineCode: "",
      airlineName: "",
      shortCode: "",
    });
    setLogo(null);
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
        text: isEditing ? "You don't have permission to update airlines" : "You don't have permission to add airlines",
      });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const submitData = new FormData();
      submitData.append("airlineCode", formData.airlineCode);
      submitData.append("airlineName", formData.airlineName);
      submitData.append("shortCode", formData.shortCode);

      if (logo) {
        submitData.append("logo", logo);
      }

      let response;
      if (isEditing && editingAirline) {
        // Update existing airline
        response = await axiosInstance.put(`/airline/${editingAirline._id}`, submitData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        // Add new airline
        response = await axiosInstance.post("/airline/add", submitData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      if (response.data.success) {
        setMessage({
          type: "success",
          text: response.data.message || `Airline ${isEditing ? "updated" : "added"} successfully!`,
        });

        // Reset form
        setFormData({
          airlineCode: "",
          airlineName: "",
          shortCode: "",
        });
        setLogo(null);
        setIsEditing(false);
        setEditingAirline(null);

        // Reset file input
        const fileInput = document.getElementById("logo") as HTMLInputElement;
        if (fileInput) fileInput.value = "";

        // Refresh airlines list
        fetchAirlines();
      }
    } catch (error: any) {
      console.error(`Error ${isEditing ? "updating" : "adding"} airline:`, error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || `Failed to ${isEditing ? "update" : "add"} airline`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return (
      <>
        <PageMeta title="Airlines - Access denied" description="Access denied" />
        <PageBreadCrumb pageTitle="Add New Airline" />
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
          You do not have permission to view Airlines.
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Add New Airline - Abid Air Travel & Tours" description="Manage and add airlines for Abid Air Travel & Tours" />

      <div className="mb-6">
        <PageBreadCrumb pageTitle="Add New Airline" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6 mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
          {isEditing ? "Edit Airline" : "Add New Airline"}
        </h2>

        {message.text && (
          <div
            className={`mb-4 p-3 sm:p-4 rounded-lg text-sm ${message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
            <div>
              <label
                htmlFor="airlineCode"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2"
              >
                Airline Code
              </label>
              <input
                type="text"
                id="airlineCode"
                name="airlineCode"
                value={formData.airlineCode}
                onChange={handleInputChange}
                placeholder="Enter Code"
                className="w-full px-2 sm:px-3 md:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="airlineName"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2"
              >
                Airline Name
              </label>
              <input
                type="text"
                id="airlineName"
                name="airlineName"
                value={formData.airlineName}
                onChange={handleInputChange}
                placeholder="Airline Name"
                className="w-full px-2 sm:px-3 md:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="shortCode"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2"
              >
                ShortCode
              </label>
              <input
                type="text"
                id="shortCode"
                name="shortCode"
                value={formData.shortCode}
                onChange={handleInputChange}
                placeholder="Enter ShortCode"
                className="w-full px-2 sm:px-3 md:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label
                htmlFor="logo"
                className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2"
              >
                Image
              </label>
              <input
                type="file"
                id="logo"
                name="logo"
                onChange={handleFileChange}
                accept="image/*"
                className="w-full px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition duration-200 text-sm sm:text-base"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || (isEditing ? !canManage : !canAdd)}
              className="w-full sm:w-auto bg-[#000] hover:bg-blue-700 text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              title={isEditing ? (!canManage ? "You don't have permission to update airlines" : "") : (!canAdd ? "You don't have permission to add airlines" : "")}
            >
              {loading ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Airline" : "Add Airline")}
            </button>
          </div>
        </form>
      </div>

      {/* All Airlines Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            All Airline
          </h2>
        </div>

        {fetchLoading ? (
          <div className="p-6 text-center">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading airlines...</p>
          </div>
        ) : airlines.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">No airlines found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-900 dark:bg-black">
                <tr>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Airline ID
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Airline Code
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Airline Name
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Code
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Logo
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {airlines.map((airline, index) => (
                  <tr key={airline._id} className={index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"}>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      {airline.airlineCode}
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      {airline.airlineName}
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      {airline.shortCode}
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                      {airline.logo ? (
                        <img
                          src={airline.logo}
                          alt={airline.airlineName}
                          className="h-8 sm:h-10 w-auto object-contain"
                        />
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          No logo
                        </span>
                      )}
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                      <button
                        disabled={!canManage}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2 sm:px-4 rounded transition duration-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleEdit(airline)}
                        title={!canManage ? "You don't have permission to manage airlines" : ""}
                      >
                        Edit
                      </button>
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

export default Airline;
