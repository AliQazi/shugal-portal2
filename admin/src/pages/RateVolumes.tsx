import React, { useEffect, useMemo, useRef, useState } from "react";
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
    FiAlertCircle,
    FiHome,
    FiMapPin,
    FiCalendar
} from "react-icons/fi";
import dayjs from "dayjs";

interface HotelRef {
    _id: string;
    hotelName: string;
    city: string;
}

interface RateVolumeType {
    _id?: string;
    volumeName: string;
    hotel: string | HotelRef | null;
    city: string;
    fromDate: string;
    toDate: string;
    buyingPrice: number;
    buyingRoe: number;
    buyingCurrency: string;
    sellingPrice: number;
    sellingRoe: number;
    sellingCurrency: string;
    sharedRoomBuyingPrice: number;
    sharedRoomBuyingRoe: number;
    sharedRoomBuyingCurrency: string;
    sharedRoomSellingPrice: number;
    sharedRoomSellingRoe: number;
    sharedRoomSellingCurrency: string;
    isActive?: boolean;
    createdAt?: string;
}

const initialState: RateVolumeType = {
    volumeName: "",
    hotel: "",
    city: "",
    fromDate: "",
    toDate: "",
    buyingPrice: 0,
    buyingRoe: 1,
    buyingCurrency: "PKR",
    sellingPrice: 0,
    sellingRoe: 1,
    sellingCurrency: "PKR",
    sharedRoomBuyingPrice: 0,
    sharedRoomBuyingRoe: 1,
    sharedRoomBuyingCurrency: "PKR",
    sharedRoomSellingPrice: 0,
    sharedRoomSellingRoe: 1,
    sharedRoomSellingCurrency: "PKR",
    isActive: true,
};

// Extract the hotel id whether `hotel` is a populated object or a plain id string
const getHotelId = (hotel: RateVolumeType["hotel"]): string => {
    if (!hotel) return "";
    return typeof hotel === "string" ? hotel : hotel._id;
};

const getHotelName = (hotel: RateVolumeType["hotel"], hotels: HotelRef[]): string => {
    if (!hotel) return "-";
    if (typeof hotel === "string") {
        return hotels.find((h) => h._id === hotel)?.hotelName || "-";
    }
    return hotel.hotelName || "-";
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
    const [hotels, setHotels] = useState<HotelRef[]>([]);
    const [formData, setFormData] = useState<RateVolumeType>(initialState);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const fromDateRef = useRef<HTMLInputElement>(null);
    const toDateRef = useRef<HTMLInputElement>(null);

    // The site-wide stylesheet hides the native calendar icon on date inputs,
    // so open the picker explicitly via the input's showPicker() API instead.
    const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
        ref.current?.showPicker?.();
    };

    // ================= FETCH VOLUMES =================
    const fetchVolumes = async () => {
        try {
            const res = await axiosInstance.get("/rate-volumes/all");
            setVolumes(res.data.data || []);
        } catch (error) {
            console.log(error);
        }
    };

    // ================= FETCH HOTELS =================
    const fetchHotels = async () => {
        try {
            const res = await axiosInstance.get("/hotels/all");
            setHotels(res.data.data || []);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchVolumes();
        fetchHotels();
    }, []);

    // Cities derived purely from the hotels that exist
    const cityOptions = useMemo(() => {
        const cities = Array.from(new Set(hotels.map((h) => h.city).filter(Boolean)));
        return cities.sort().map((c) => ({ value: c, label: c }));
    }, [hotels]);

    // Hotels narrowed down to the currently selected city (all hotels if no city chosen yet)
    const hotelOptions = useMemo(() => {
        const filtered = formData.city
            ? hotels.filter((h) => h.city === formData.city)
            : hotels;
        return filtered.map((h) => ({ value: h._id, label: h.hotelName }));
    }, [hotels, formData.city]);

    // ================= HANDLE CHANGE =================
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        const numericFields = [
            "buyingPrice",
            "buyingRoe",
            "sellingPrice",
            "sellingRoe",
            "sharedRoomBuyingPrice",
            "sharedRoomBuyingRoe",
            "sharedRoomSellingPrice",
            "sharedRoomSellingRoe",
        ];
        setFormData((prev) => ({
            ...prev,
            [name]: numericFields.includes(name) ? Number(value) : value,
        }));
    };

    // ================= HOTEL / CITY HANDLERS =================
    // Selecting a hotel autofills its city
    const handleHotelChange = (opt: { value: string; label: string } | null) => {
        const hotelId = opt?.value || "";
        const selectedHotel = hotels.find((h) => h._id === hotelId);
        setFormData((prev) => ({
            ...prev,
            hotel: hotelId,
            city: selectedHotel ? selectedHotel.city : prev.city,
        }));
    };

    // Changing the city re-filters the hotel dropdown; clear the hotel if it no longer matches
    const handleCityChange = (opt: { value: string; label: string } | null) => {
        const newCity = opt?.value || "";
        setFormData((prev) => {
            const currentHotelId = getHotelId(prev.hotel);
            const stillValid = currentHotelId
                ? hotels.find((h) => h._id === currentHotelId)?.city === newCity
                : false;
            return {
                ...prev,
                city: newCity,
                hotel: stillValid ? prev.hotel : "",
            };
        });
    };

    // ================= CREATE / UPDATE =================
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.volumeName.trim()) {
            alert("Please enter a volume name");
            return;
        }

        if (!getHotelId(formData.hotel)) {
            alert("Please select a hotel");
            return;
        }

        if (!formData.fromDate || !formData.toDate) {
            alert("Please select a from date and to date");
            return;
        }

        if (new Date(formData.fromDate) > new Date(formData.toDate)) {
            alert("From date cannot be after to date");
            return;
        }

        try {
            setLoading(true);

            const payload = { ...formData, hotel: getHotelId(formData.hotel) };

            if (editId) {
                await axiosInstance.put(`/rate-volumes/update/${editId}`, payload);
                alert("Volume updated successfully");
            } else {
                await axiosInstance.post("/rate-volumes/create", payload);
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
            hotel: getHotelId(volume.hotel),
            city: volume.city || "",
            fromDate: volume.fromDate ? volume.fromDate.slice(0, 10) : "",
            toDate: volume.toDate ? volume.toDate.slice(0, 10) : "",
            buyingPrice: volume.buyingPrice,
            buyingRoe: volume.buyingRoe,
            buyingCurrency: volume.buyingCurrency,
            sellingPrice: volume.sellingPrice,
            sellingRoe: volume.sellingRoe,
            sellingCurrency: volume.sellingCurrency,
            sharedRoomBuyingPrice: volume.sharedRoomBuyingPrice || 0,
            sharedRoomBuyingRoe: volume.sharedRoomBuyingRoe || 1,
            sharedRoomBuyingCurrency: volume.sharedRoomBuyingCurrency || "PKR",
            sharedRoomSellingPrice: volume.sharedRoomSellingPrice || 0,
            sharedRoomSellingRoe: volume.sharedRoomSellingRoe || 1,
            sharedRoomSellingCurrency: volume.sharedRoomSellingCurrency || "PKR",
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

                        <form onSubmit={handleSubmit} className="space-y-4">
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

                            {/* ================= HOTEL / CITY / DATE RANGE ================= */}
                            <div className="border-2 border-blue-200 rounded-xl p-5 bg-linear-to-br from-blue-50 to-blue-50/50">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-blue-100 rounded-lg">
                                        <FiHome className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-blue-700">Hotel & Date Range</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                                            Hotel <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            options={hotelOptions}
                                            value={
                                                getHotelId(formData.hotel)
                                                    ? hotelOptions.find((o) => o.value === getHotelId(formData.hotel)) || null
                                                    : null
                                            }
                                            onChange={handleHotelChange}
                                            placeholder="Select hotel"
                                            isSearchable
                                            isClearable
                                            styles={customSelectStyles}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                                            City <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            options={cityOptions}
                                            value={formData.city ? { value: formData.city, label: formData.city } : null}
                                            onChange={handleCityChange}
                                            placeholder="Select city"
                                            isSearchable
                                            isClearable
                                            styles={customSelectStyles}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                                            From Date <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => openDatePicker(fromDateRef)}
                                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                                                tabIndex={-1}
                                            >
                                                <FiCalendar />
                                            </button>
                                            <input
                                                ref={fromDateRef}
                                                type="date"
                                                name="fromDate"
                                                value={formData.fromDate}
                                                onChange={handleChange}
                                                onClick={() => openDatePicker(fromDateRef)}
                                                required
                                                className="w-full bg-white pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mb-1.5 text-xs font-semibold text-gray-600">
                                            To Date <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => openDatePicker(toDateRef)}
                                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                                                tabIndex={-1}
                                            >
                                                <FiCalendar />
                                            </button>
                                            <input
                                                ref={toDateRef}
                                                type="date"
                                                name="toDate"
                                                value={formData.toDate}
                                                onChange={handleChange}
                                                onClick={() => openDatePicker(toDateRef)}
                                                min={formData.fromDate || undefined}
                                                required
                                                className="w-full bg-white pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {formData.city && hotelOptions.length === 0 && (
                                    <p className="mt-3 text-xs text-amber-600 flex items-center gap-1">
                                        <FiAlertCircle className="w-3.5 h-3.5" />
                                        No hotels found in {formData.city}. Add one on the Hotels page first.
                                    </p>
                                )}
                            </div>

                            {/* ================= PRICING SECTION ================= */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* BUYING */}
                                <div className="border-2 border-red-200 rounded-xl p-5 bg-linear-to-br from-red-50 to-red-50/50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 bg-red-100 rounded-lg">
                                            <FiTrendingDown className="w-4 h-4 text-red-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-red-700">Buying Details</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 -mt-2 mb-4">Applied to Double, Triple &amp; Quad pricing</p>
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
                                <div className="border-2 border-green-200 rounded-xl p-5 bg-linear-to-br from-green-50 to-green-50/50">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 bg-green-100 rounded-lg">
                                            <FiTrendingUp className="w-4 h-4 text-green-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-green-700">Selling Details</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 -mt-2 mb-4">Applied to Double, Triple &amp; Quad pricing</p>
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

                            {/* ================= SHARED ROOM PRICING ================= */}
                            <div className="border-2 border-yellow-200 rounded-xl p-5 bg-linear-to-br from-yellow-50 to-yellow-50/50">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-yellow-100 rounded-lg">
                                        <FiPackage className="w-4 h-4 text-yellow-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-yellow-700">Shared Room Pricing</h3>
                                </div>
                                <p className="text-xs text-gray-500 mb-4 ml-9">
                                    Saved separately and applied only to Shared Room pricing - Double/Triple/Quad use the Buying/Selling Details above.
                                </p>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* SHARED - BUYING */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">Buying Price</label>
                                            <input
                                                type="number"
                                                name="sharedRoomBuyingPrice"
                                                value={formData.sharedRoomBuyingPrice || ""}
                                                onChange={handleChange}
                                                placeholder="0"
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">ROE</label>
                                            <input
                                                type="number"
                                                name="sharedRoomBuyingRoe"
                                                value={formData.sharedRoomBuyingRoe}
                                                onChange={handleChange}
                                                placeholder="1"
                                                step="0.01"
                                                min={0}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">Currency</label>
                                            <Select
                                                options={currencyOptions}
                                                value={
                                                    formData.sharedRoomBuyingCurrency
                                                        ? { value: formData.sharedRoomBuyingCurrency, label: `${formData.sharedRoomBuyingCurrency} - ${currency_list.find(c => c.code === formData.sharedRoomBuyingCurrency)?.name || ''}` }
                                                        : null
                                                }
                                                onChange={(opt) => setFormData({ ...formData, sharedRoomBuyingCurrency: opt?.value || "PKR" })}
                                                placeholder="Select currency"
                                                isSearchable
                                                styles={customSelectStyles}
                                            />
                                        </div>
                                    </div>

                                    {/* SHARED - SELLING */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">Selling Price</label>
                                            <input
                                                type="number"
                                                name="sharedRoomSellingPrice"
                                                value={formData.sharedRoomSellingPrice || ""}
                                                onChange={handleChange}
                                                placeholder="0"
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">ROE</label>
                                            <input
                                                type="number"
                                                name="sharedRoomSellingRoe"
                                                value={formData.sharedRoomSellingRoe}
                                                onChange={handleChange}
                                                placeholder="1"
                                                step="0.01"
                                                min={0}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block mb-1.5 text-xs font-semibold text-gray-600">Currency</label>
                                            <Select
                                                options={currencyOptions}
                                                value={
                                                    formData.sharedRoomSellingCurrency
                                                        ? { value: formData.sharedRoomSellingCurrency, label: `${formData.sharedRoomSellingCurrency} - ${currency_list.find(c => c.code === formData.sharedRoomSellingCurrency)?.name || ''}` }
                                                        : null
                                                }
                                                onChange={(opt) => setFormData({ ...formData, sharedRoomSellingCurrency: opt?.value || "PKR" })}
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
                                    <th className="text-left p-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Volume Name</th>
                                    <th className="text-left p-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Hotel</th>
                                    <th className="text-left p-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">City</th>
                                    <th className="text-left p-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Date Range</th>
                                    <th className="text-left p-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Buying</th>
                                    <th className="text-left p-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Selling</th>
                                    <th className="text-left p-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Shared Room</th>
                                    <th className="text-left p-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                                    <th className="text-left p-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
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
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 shrink-0 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <FiPackage className="w-3.5 h-3.5 text-blue-600" />
                                                    </div>
                                                    <span className="font-semibold text-gray-800 text-sm">{volume.volumeName}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5 text-gray-700 text-sm whitespace-nowrap">
                                                    <FiHome className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    {getHotelName(volume.hotel, hotels)}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {volume.city ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium whitespace-nowrap">
                                                        <FiMapPin className="w-3 h-3" />
                                                        {volume.city}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5 text-gray-700 text-xs whitespace-nowrap">
                                                    <FiCalendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                    {dayjs(volume.fromDate).format("DD MMM YYYY")} - {dayjs(volume.toDate).format("DD MMM YYYY")}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                                                    <span className="font-semibold text-red-600">
                                                        {volume.buyingPrice?.toLocaleString()}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 bg-red-50 rounded text-[11px] font-medium text-red-700">
                                                        {volume.buyingCurrency}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">ROE {volume.buyingRoe}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                                                    <span className="font-semibold text-green-600">
                                                        {volume.sellingPrice?.toLocaleString()}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 bg-green-50 rounded text-[11px] font-medium text-green-700">
                                                        {volume.sellingCurrency}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">ROE {volume.sellingRoe}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                                                    <span className="font-semibold text-red-600">
                                                        {volume.sharedRoomBuyingPrice?.toLocaleString()}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 bg-red-50 rounded text-[11px] font-medium text-red-700">
                                                        {volume.sharedRoomBuyingCurrency}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1.5 whitespace-nowrap mt-0.5">
                                                    <span className="font-semibold text-green-600">
                                                        {volume.sharedRoomSellingPrice?.toLocaleString()}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 bg-green-50 rounded text-[11px] font-medium text-green-700">
                                                        {volume.sharedRoomSellingCurrency}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${volume.isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-200 text-gray-600"
                                                        }`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${volume.isActive ? "bg-green-500" : "bg-gray-400"
                                                        }`}></span>
                                                    {volume.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-1.5">
                                                    <button
                                                        onClick={() => handleEdit(volume)}
                                                        title="Edit"
                                                        className="inline-flex items-center justify-center p-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition-all duration-200 border border-yellow-200 hover:border-yellow-300"
                                                    >
                                                        <FiEdit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(volume._id)}
                                                        title="Delete"
                                                        className="inline-flex items-center justify-center p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all duration-200 border border-red-200 hover:border-red-300"
                                                    >
                                                        <FiTrash2 className="w-3.5 h-3.5" />
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