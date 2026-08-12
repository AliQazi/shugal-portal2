import React, { useEffect, useState } from "react";
import axiosInstance from "../Api/axios";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import TopBar from "../components/ui/Header/TopBar";
import {
    FiTruck,
    FiMapPin,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSave,
    FiX,
    FiRefreshCw,
    FiAlertCircle,
    FiNavigation,
    FiPackage
} from "react-icons/fi";

interface TransportType {
    _id?: string;
    route: string;
    transportType: string;
}

const initialState: TransportType = {
    route: "",
    transportType: "",
};

// Transport type colors
const transportColors: Record<string, string> = {
    bus: "bg-blue-100 text-blue-700 border-blue-200",
    gmc: "bg-purple-100 text-purple-700 border-purple-200",
    car: "bg-green-100 text-green-700 border-green-200",
    van: "bg-indigo-100 text-indigo-700 border-indigo-200",
    suv: "bg-orange-100 text-orange-700 border-orange-200",
    default: "bg-gray-100 text-gray-700 border-gray-200"
};

const getTransportColor = (type: string) => {
    const lowerType = type.toLowerCase();
    return transportColors[lowerType] || transportColors.default;
};

export default function Transport() {
    const { user } = useAuth();
    const canView = hasPermission(user, "view_transports");
    const canAdd = hasPermission(user, "add_transport");
    const canManage = hasPermission(user, "manage_transports");
    const [transports, setTransports] = useState<TransportType[]>([]);
    const [formData, setFormData] = useState<TransportType>(initialState);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // ================= FETCH TRANSPORTS =================
    const fetchTransports = async () => {
        try {
            const res = await axiosInstance.get("/transports/all");
            setTransports(res.data.data || []);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (canView) {
            fetchTransports();
        }
    }, [canView]);

    // ================= HANDLE CHANGE =================
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // ================= CREATE / UPDATE =================
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const canSave = editId ? canManage : canAdd;
        if (!canSave) {
            alert(editId ? "You don't have permission to update transports" : "You don't have permission to add transports");
            return;
        }

        try {
            setLoading(true);

            if (editId) {
                await axiosInstance.put(`/transports/update/${editId}`, formData);
                alert("Transport updated successfully");
            } else {
                await axiosInstance.post("/transports/create", formData);
                alert("Transport created successfully");
            }

            setFormData(initialState);
            setEditId(null);
            setShowForm(false);
            fetchTransports();
        } catch (error) {
            console.log(error);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // ================= EDIT =================
    const handleEdit = (transport: TransportType) => {
        if (!canManage) {
            alert("You don't have permission to manage transports");
            return;
        }

        setFormData({
            route: transport.route,
            transportType: transport.transportType,
        });
        setEditId(transport._id || null);
        setShowForm(true);
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    // ================= DELETE =================
    const handleDelete = async (id?: string) => {
        if (!id) return;

        if (!canManage) {
            alert("You don't have permission to manage transports");
            return;
        }

        const confirmDelete = window.confirm(
            "Are you sure you want to delete this transport?"
        );
        if (!confirmDelete) return;

        try {
            await axiosInstance.delete(`/transports/delete/${id}`);
            alert("Transport deleted successfully");
            fetchTransports();
        } catch (error) {
            console.log(error);
            alert("Delete failed");
        }
    };

    const handleCancel = () => {
        setEditId(null);
        setFormData(initialState);
        setShowForm(false);
    };

    if (!canView) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiAlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-600">
                        You do not have permission to view Transports.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* ================= HEADER ================= */}
                <div className="mb-8">
                    <TopBar title="Transport Management" description="Add and manage transport routes for Umrah packages" />

                    <div className="flex justify-end mt-4">
                        {(canAdd || canManage) && (
                            <button
                                onClick={() => {
                                    handleCancel();
                                    setShowForm(!showForm);
                                }}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                            >
                                {showForm ? (
                                    <>
                                        <FiX className="w-5 h-5" />
                                        Close Form
                                    </>
                                ) : (
                                    <>
                                        <FiPlus className="w-5 h-5" />
                                        Add New Transport
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* ================= FORM ================= */}
                {showForm && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100 animate-fadeIn">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2 rounded-lg ${editId ? 'bg-yellow-100' : 'bg-green-100'}`}>
                                {editId ? (
                                    <FiEdit2 className={`w-5 h-5 ${editId ? 'text-yellow-600' : 'text-green-600'}`} />
                                ) : (
                                    <FiPlus className="w-5 h-5 text-green-600" />
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">
                                {editId ? "Update Transport" : "Add New Transport"}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* ROUTE */}
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                                        Route <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="route"
                                            value={formData.route}
                                            onChange={handleChange}
                                            placeholder="e.g. Makkah → Madinah"
                                            required
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                {/* TRANSPORT TYPE */}
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                                        Transport Type <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <FiTruck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="transportType"
                                            value={formData.transportType}
                                            onChange={handleChange}
                                            placeholder="e.g. Bus / GMC / Car"
                                            required
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* BUTTONS */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="submit"
                                    disabled={loading || (editId ? !canManage : !canAdd)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:shadow-none"
                                    title={editId ? (!canManage ? "You don't have permission to update transports" : "") : (!canAdd ? "You don't have permission to add transports" : "")}
                                >
                                    {loading ? (
                                        <>
                                            <FiRefreshCw className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FiSave className="w-5 h-5" />
                                            {editId ? "Update Transport" : "Add Transport"}
                                        </>
                                    )}
                                </button>

                                {editId && (
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-all duration-200"
                                    >
                                        <FiX className="w-5 h-5" />
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {/* ================= TABLE ================= */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FiNavigation className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">All Transports</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {transports.length} {transports.length === 1 ? 'transport' : 'transports'} total
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-linear-to-r from-gray-50 to-gray-100">
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm w-1/3">
                                        <div className="flex items-center gap-2">
                                            <FiMapPin className="w-4 h-4" />
                                            Route
                                        </div>
                                    </th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm w-1/3">
                                        <div className="flex items-center gap-2">
                                            <FiTruck className="w-4 h-4" />
                                            Transport Type
                                        </div>
                                    </th>
                                    <th className="text-center p-4 font-semibold text-gray-700 text-sm w-1/3">
                                        <div className="flex items-center justify-center gap-2">
                                            <FiPackage className="w-4 h-4" />
                                            Actions
                                        </div>
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {transports.length > 0 ? (
                                    transports.map((transport, index) => (
                                        <tr
                                            key={transport._id}
                                            className={`border-b border-gray-50 hover:bg-blue-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                                }`}
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-lg">
                                                        🗺️
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-800">
                                                            {transport.route}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-0.5">Route</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${getTransportColor(transport.transportType)}`}>
                                                    {transport.transportType}
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(transport)}
                                                        disabled={!canManage}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium transition-all duration-200 border border-yellow-200 hover:border-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={!canManage ? "You don't have permission to manage transports" : "Edit transport"}
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                        Edit
                                                    </button>

                                                    <button
                                                        onClick={() => handleDelete(transport._id)}
                                                        disabled={!canManage}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-all duration-200 border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={!canManage ? "You don't have permission to manage transports" : "Delete transport"}
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3}>
                                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                                <FiTruck className="w-16 h-16 mb-4 text-gray-300" />
                                                <p className="text-lg font-medium text-gray-500">No transports found</p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    {canAdd
                                                        ? "Click 'Add New Transport' to create your first transport route"
                                                        : "No transport routes have been added yet"
                                                    }
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Stats Footer */}
                    {transports.length > 0 && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Total Routes: {transports.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>
                                        Transport Types: {new Set(transports.map(t => t.transportType)).size}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}