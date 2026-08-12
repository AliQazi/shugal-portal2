import React, { useEffect, useState } from "react";
import Select from "react-select";
import axiosInstance from "../Api/axios";
import currency_list from "../data/currencies";
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSave,
    FiX,
    FiDollarSign,
    FiTrendingUp,
    FiTrendingDown,
    FiPackage,
    FiActivity,
    FiRefreshCw,
    FiAlertCircle
} from "react-icons/fi";

interface RateVolumeType {
    _id?: string;
    volumeName: string;
    buyingPrice: number;
    buyingRoe: number;
    buyingCurrency: string;
    sellingPrice: number;
    sellingRoe: number;
    sellingCurrency: string;
    isActive?: boolean;
    createdAt?: string;
}

const initialState: RateVolumeType = {
    volumeName: "",
    buyingPrice: 0,
    buyingRoe: 1,
    buyingCurrency: "PKR",
    sellingPrice: 0,
    sellingRoe: 1,
    sellingCurrency: "PKR",
    isActive: true,
};

const currencyOptions = currency_list.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }));

// Custom styles for react-select
const customSelectStyles = {
    control: (base: any, state: any) => ({
        ...base,
        minHeight: "42px",
        borderRadius: "0.75rem",
        borderColor: state.isFocused ? "#3B82F6" : "#E5E7EB",
        boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.1)" : "none",
        "&:hover": {
            borderColor: state.isFocused ? "#3B82F6" : "#D1D5DB"
        }
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? "#3B82F6" : state.isFocused ? "#EFF6FF" : "white",
        color: state.isSelected ? "white" : "#1F2937",
        "&:active": {
            backgroundColor: "#2563EB"
        }
    }),
    menu: (base: any) => ({
        ...base,
        borderRadius: "0.75rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
    })
};

export default function RateVolumes() {
    const [volumes, setVolumes] = useState<RateVolumeType[]>([]);
    const [formData, setFormData] = useState<RateVolumeType>(initialState);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // ================= FETCH VOLUMES =================
    const fetchVolumes = async () => {
        try {
            const res = await axiosInstance.get("/rate-volumes/all");
            setVolumes(res.data.data || []);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchVolumes();
    }, []);

    // ================= HANDLE CHANGE =================
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                name === "buyingPrice" || name === "buyingRoe" || name === "sellingPrice" || name === "sellingRoe"
                    ? Number(value)
                    : value,
        }));
    };

    // ================= CREATE / UPDATE =================
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.volumeName.trim()) {
            alert("Please enter a volume name");
            return;
        }

        try {
            setLoading(true);

            if (editId) {
                await axiosInstance.put(`/rate-volumes/update/${editId}`, formData);
                alert("Volume updated successfully");
            } else {
                await axiosInstance.post("/rate-volumes/create", formData);
                alert("Volume created successfully");
            }

            setFormData(initialState);
            setEditId(null);
            setShowForm(false);
            fetchVolumes();
        } catch (error) {
            console.log(error);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // ================= EDIT =================
    const handleEdit = (volume: RateVolumeType) => {
        setFormData({
            volumeName: volume.volumeName,
            buyingPrice: volume.buyingPrice,
            buyingRoe: volume.buyingRoe,
            buyingCurrency: volume.buyingCurrency,
            sellingPrice: volume.sellingPrice,
            sellingRoe: volume.sellingRoe,
            sellingCurrency: volume.sellingCurrency,
            isActive: volume.isActive !== undefined ? volume.isActive : true,
        });
        setEditId(volume._id || null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // ================= DELETE =================
    const handleDelete = async (id?: string) => {
        if (!id) return;
        const confirmDelete = window.confirm("Are you sure you want to delete this volume?");
        if (!confirmDelete) return;

        try {
            await axiosInstance.delete(`/rate-volumes/delete/${id}`);
            alert("Volume deleted successfully");
            fetchVolumes();
        } catch (error) {
            console.log(error);
            alert("Delete failed");
        }
    };

    // ================= CANCEL =================
    const handleCancel = () => {
        setEditId(null);
        setFormData(initialState);
        setShowForm(false);
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* ================= HEADER ================= */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FiDollarSign className="w-6 h-6 text-blue-600" />
                                </div>
                                <h1 className="text-3xl font-bold text-gray-900">Rate Volumes</h1>
                            </div>
                            <p className="text-gray-600 ml-12">
                                Manage reusable pricing volumes for Umrah Packages with buying/selling rates
                            </p>
                        </div>
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
                                    Add New Volume
                                </>
                            )}
                        </button>
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
                                {editId ? "Update Volume" : "Create New Volume"}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* VOLUME NAME & STATUS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                                        Volume Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <FiPackage className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="volumeName"
                                            value={formData.volumeName}
                                            onChange={handleChange}
                                            placeholder="e.g. Standard Volume A"
                                            required
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Status</label>
                                    <div className="relative">
                                        <FiActivity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <select
                                            name="isActive"
                                            value={formData.isActive ? "true" : "false"}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                                        >
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ================= PRICING SECTION ================= */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* BUYING */}
                                <div className="border-2 border-red-200 rounded-xl p-5 bg-linear-to-br from-red-50 to-red-50/50 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 bg-red-100 rounded-lg">
                                            <FiTrendingDown className="w-4 h-4 text-red-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-red-700">Buying Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                                                Price/Room <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                name="buyingPrice"
                                                value={formData.buyingPrice || ""}
                                                onChange={handleChange}
                                                placeholder="0"
                                                required
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">ROE</label>
                                            <input
                                                type="number"
                                                name="buyingRoe"
                                                value={formData.buyingRoe}
                                                onChange={handleChange}
                                                placeholder="1"
                                                step="0.01"
                                                min={0}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">Currency</label>
                                            <Select
                                                options={currencyOptions}
                                                value={
                                                    formData.buyingCurrency
                                                        ? { value: formData.buyingCurrency, label: `${formData.buyingCurrency} - ${currency_list.find(c => c.code === formData.buyingCurrency)?.name || ''}` }
                                                        : null
                                                }
                                                onChange={(opt) => setFormData({ ...formData, buyingCurrency: opt?.value || "PKR" })}
                                                placeholder="Select currency"
                                                isSearchable
                                                styles={customSelectStyles}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SELLING */}
                                <div className="border-2 border-green-200 rounded-xl p-5 bg-linear-to-br from-green-50 to-green-50/50 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 bg-green-100 rounded-lg">
                                            <FiTrendingUp className="w-4 h-4 text-green-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-green-700">Selling Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                                                Price/Room <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                name="sellingPrice"
                                                value={formData.sellingPrice || ""}
                                                onChange={handleChange}
                                                placeholder="0"
                                                required
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">ROE</label>
                                            <input
                                                type="number"
                                                name="sellingRoe"
                                                value={formData.sellingRoe}
                                                onChange={handleChange}
                                                placeholder="1"
                                                step="0.01"
                                                min={0}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">Currency</label>
                                            <Select
                                                options={currencyOptions}
                                                value={
                                                    formData.sellingCurrency
                                                        ? { value: formData.sellingCurrency, label: `${formData.sellingCurrency} - ${currency_list.find(c => c.code === formData.sellingCurrency)?.name || ''}` }
                                                        : null
                                                }
                                                onChange={(opt) => setFormData({ ...formData, sellingCurrency: opt?.value || "PKR" })}
                                                placeholder="Select currency"
                                                isSearchable
                                                styles={customSelectStyles}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BUTTONS */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                                >
                                    {loading ? (
                                        <>
                                            <FiRefreshCw className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FiSave className="w-5 h-5" />
                                            {editId ? "Update Volume" : "Save Volume"}
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
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <FiPackage className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">All Volumes</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {volumes.length} {volumes.length === 1 ? 'volume' : 'volumes'} total
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-linear-to-r from-gray-50 to-gray-100">
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Volume Name</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Buying Price</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Buying ROE</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Buying Currency</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Selling Price</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Selling ROE</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Selling Currency</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                                    <th className="text-left p-4 font-semibold text-gray-700 text-sm">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {volumes.length > 0 ? (
                                    volumes.map((volume, index) => (
                                        <tr
                                            key={volume._id}
                                            className={`border-b border-gray-50 hover:bg-blue-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                                }`}
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <FiPackage className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <span className="font-semibold text-gray-800">{volume.volumeName}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-medium text-red-600">
                                                    {volume.buyingPrice?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-700">{volume.buyingRoe}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
                                                    {volume.buyingCurrency}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-medium text-green-600">
                                                    {volume.sellingPrice?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-700">{volume.sellingRoe}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
                                                    {volume.sellingCurrency}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${volume.isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-200 text-gray-600"
                                                        }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${volume.isActive ? "bg-green-500" : "bg-gray-400"
                                                        }`}></span>
                                                    {volume.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(volume)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium transition-all duration-200 border border-yellow-200 hover:border-yellow-300"
                                                    >
                                                        <FiEdit2 className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(volume._id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-all duration-200 border border-red-200 hover:border-red-300"
                                                    >
                                                        <FiTrash2 className="w-3.5 h-3.5" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9}>
                                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                                <FiAlertCircle className="w-12 h-12 mb-4 text-gray-300" />
                                                <p className="text-lg font-medium text-gray-500">No volumes found</p>
                                                <p className="text-sm text-gray-400 mt-1">Click "Add New Volume" to create your first volume</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
        </div>
    );
}