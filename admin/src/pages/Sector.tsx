import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

interface Sector {
    _id: string;
    groupType: "UAE One Way" | "KSA One Way" | "Umrah Group";
    sectorTitle: string;
    fullSector: string;
    createdAt: string;
}

const Sector = () => {
    const { user } = useAuth();
    const canView = hasPermission(user, "view_sectors");
    const canAdd = hasPermission(user, "add_sector");
    const canManage = hasPermission(user, "manage_sectors");
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        groupType: searchParams.get("groupType") || "",
        sectorTitle: "",
        fullSector: "",
    });
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [editingId, setEditingId] = useState<string | null>(null);

    const groupTypes = ["UAE Groups", "KSA Groups", "Bahrain Groups", "Mascat Groups", "Qatar Groups", "UK Groups", "Umrah Groups"];

    // Fetch all sectors
    const fetchSectors = async () => {
        try {
            setFetchLoading(true);
            const response = await axiosInstance.get("/sector");
            if (response.data.success) {
                setSectors(response.data.data);
            }
        } catch (error: any) {
            console.error("Error fetching sectors:", error);
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to fetch sectors",
            });
        } finally {
            setFetchLoading(false);
        }
    };

    useEffect(() => {
        if (canView) {
            fetchSectors();
        }
    }, [canView]);

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const canSave = editingId ? canManage : canAdd;
        if (!canSave) {
            setMessage({
                type: "error",
                text: editingId ? "You don't have permission to update sectors" : "You don't have permission to add sectors",
            });
            return;
        }

        if (!formData.groupType || !formData.sectorTitle) {
            setMessage({
                type: "error",
                text: "All fields are required",
            });
            return;
        }

        try {
            setLoading(true);
            setMessage({ type: "", text: "" });

            let response;
            if (editingId) {
                // Update existing sector
                response = await axiosInstance.put(`/sector/${editingId}`, formData);
            } else {
                // Add new sector
                response = await axiosInstance.post("/sector/add", formData);
            }

            if (response.data.success) {
                setMessage({
                    type: "success",
                    text: editingId ? "Sector updated successfully" : "Sector added successfully",
                });

                // Reset form
                setFormData({
                    groupType: "",
                    sectorTitle: "",
                    fullSector: "",
                });
                setEditingId(null);

                // Refresh sectors list
                fetchSectors();
            }
        } catch (error: any) {
            console.error("Error saving sector:", error);
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to save sector",
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle edit
    const handleEdit = (sector: Sector) => {
        if (!canManage) {
            setMessage({ type: "error", text: "You don't have permission to manage sectors" });
            return;
        }

        setFormData({
            groupType: sector.groupType,
            sectorTitle: sector.sectorTitle,
            fullSector: sector.fullSector,
        });
        setEditingId(sector._id);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!canManage) {
            setMessage({ type: "error", text: "You don't have permission to manage sectors" });
            return;
        }

        if (!window.confirm("Are you sure you want to delete this sector?")) {
            return;
        }

        try {
            const response = await axiosInstance.delete(`/sector/${id}`);
            if (response.data.success) {
                setMessage({
                    type: "success",
                    text: "Sector deleted successfully",
                });
                fetchSectors();
            }
        } catch (error: any) {
            console.error("Error deleting sector:", error);
            setMessage({
                type: "error",
                text: error.response?.data?.message || "Failed to delete sector",
            });
        }
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setFormData({
            groupType: "",
            sectorTitle: "",
            fullSector: "",
        });
        setEditingId(null);
    };

    // Group sectors by group type
    const groupedSectors = groupTypes.reduce((acc, groupType) => {
        acc[groupType] = sectors.filter((s) => s.groupType === groupType);
        return acc;
    }, {} as Record<string, Sector[]>);

    if (!canView) {
        return (
            <>
                <PageMeta title="Sectors - Access denied" description="Access denied" />
                <PageBreadCrumb pageTitle="Sector" />
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
                    You do not have permission to view Sectors.
                </div>
            </>
        );
    }

    return (
        <>
            <PageMeta title="Sector Management - Abid Air Travel & Tours" description="Manage and add sectors for different group types" />

            <div className="mb-6">
                <PageBreadCrumb pageTitle="Sector" />
            </div>

            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">
                        {editingId ? "Edit Sector" : "Add New Sector"}
                    </h3>
                </div>

                {/* Success/Error Message */}
                {message.text && (
                    <div className={`mx-6 mt-4 rounded-md p-4 ${message.type === "success"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Add/Edit Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Group Type */}
                        <div>
                            <label className="mb-2.5 block text-black dark:text-white">
                                Group Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.groupType}
                                onChange={(e) => setFormData({ ...formData, groupType: e.target.value })}
                                className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                required
                            >
                                <option value="">Select Group Type</option>
                                {groupTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sector Title */}
                        <div>
                            <label className="mb-2.5 block text-black dark:text-white">
                                Sector Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., DBX-JDH"
                                value={formData.sectorTitle}
                                onChange={(e) => {
                                    const input = e.target.value.replace(/-/g, '').toUpperCase();
                                    const chunks = input.match(/.{1,3}/g) || [];
                                    const formatted = chunks.join('-');
                                    setFormData({ ...formData, sectorTitle: formatted });
                                }}
                                className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                                required
                            />
                        </div>

                        {/* Full Sector */}
                        <div>
                            <label className="mb-2.5 block text-black dark:text-white">
                                Full Sector
                                {/* <span className="text-red-500">*</span> */}
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Lahore-Dubai"
                                value={formData.fullSector}
                                onChange={(e) => setFormData({ ...formData, fullSector: e.target.value })}
                                className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                            // required
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="mt-6 flex gap-3">
                        <button
                            type="submit"
                            disabled={loading || (editingId ? !canManage : !canAdd)}
                            className="inline-flex items-center justify-center rounded-md bg-[#000] px-6 py-3 text-center font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={editingId ? (!canManage ? "You don't have permission to update sectors" : "") : (!canAdd ? "You don't have permission to add sectors" : "")}
                        >
                            {loading ? "Saving..." : editingId ? "Update Sector" : "Add Sector"}
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="inline-flex items-center justify-center rounded-md border border-stroke px-6 py-3 text-center font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* All Sectors Section */}
            <div className="mt-6 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">
                        All Sectors
                    </h3>
                </div>

                <div className="p-6">
                    {fetchLoading ? (
                        <div className="text-center py-8">
                            <p className="text-black dark:text-white">Loading sectors...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {groupTypes.map((groupType) => {
                                const groupSectors = groupedSectors[groupType] || [];

                                return (
                                    <div key={groupType}>
                                        {/* Group Header */}
                                        <div className="mb-4 bg-black text-white px-6 py-3 rounded">
                                            <h4 className="font-medium">{groupType}</h4>
                                        </div>

                                        {/* Sectors Table */}
                                        {groupSectors.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full table-auto">
                                                    <thead>
                                                        <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                                            <th className="px-4 py-4 font-medium text-black dark:text-white">
                                                                Id
                                                            </th>
                                                            <th className="px-4 py-4 font-medium text-black dark:text-white">
                                                                Sector
                                                            </th>
                                                            <th className="px-4 py-4 font-medium text-black dark:text-white">
                                                                Full Name
                                                            </th>
                                                            <th className="px-4 py-4 font-medium text-black dark:text-white">
                                                                Action
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {groupSectors.map((sector, index) => (
                                                            <tr key={sector._id} className="border-b border-stroke dark:border-strokedark">
                                                                <td className="px-4 py-4 text-black dark:text-white">
                                                                    {index + 1}
                                                                </td>
                                                                <td className="px-4 py-4 text-black dark:text-white">
                                                                    {sector.sectorTitle}
                                                                </td>
                                                                <td className="px-4 py-4 text-black dark:text-white">
                                                                    {sector.fullSector}
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleEdit(sector)}
                                                                            disabled={!canManage}
                                                                            className="inline-flex items-center justify-center rounded-md bg-[blue] px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            title={!canManage ? "You don't have permission to manage sectors" : ""}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete(sector._id)}
                                                                            disabled={!canManage}
                                                                            className="inline-flex items-center justify-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            title={!canManage ? "You don't have permission to manage sectors" : ""}
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-black dark:text-white">
                                                No sectors found for this group
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Sector;
