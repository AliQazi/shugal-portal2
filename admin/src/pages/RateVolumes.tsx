import React, { useEffect, useMemo, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import axiosInstance from "../Api/axios";
import currency_list from "../data/currencies";
import {
    FiAlertCircle,
    FiCalendar,
    FiChevronDown,
    FiChevronRight,
    FiDollarSign,
    FiEdit2,
    FiHome,
    FiMapPin,
    FiPackage,
    FiPlus,
    FiRefreshCw,
    FiSave,
    FiTrash2,
    FiTrendingDown,
    FiTrendingUp,
    FiX,
} from "react-icons/fi";
import dayjs from "dayjs";

interface HotelRef {
    _id: string;
    hotelName: string;
    city: string;
}

interface HotelRateForm {
    _id?: string;
    hotel: string | HotelRef | null;
    city: string;
    // Legacy nested dates may still be present on transitional records.
    fromDate?: string;
    toDate?: string;
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
}

interface RateVolumeType extends Partial<HotelRateForm> {
    _id?: string;
    volumeName: string;
    hotelRates?: HotelRateForm[];
    isActive?: boolean;
    createdAt?: string;
}

interface RateVolumeForm {
    volumeName: string;
    isActive: boolean;
    fromDate: string;
    toDate: string;
    hotelRates: HotelRateForm[];
}

const emptyHotelRate = (): HotelRateForm => ({
    hotel: "",
    city: "",
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
});

const initialState = (): RateVolumeForm => ({
    volumeName: "",
    isActive: true,
    fromDate: "",
    toDate: "",
    hotelRates: [emptyHotelRate()],
});

const getHotelId = (hotel: HotelRateForm["hotel"]): string => {
    if (!hotel) return "";
    return typeof hotel === "string" ? hotel : hotel._id;
};

const getHotelName = (hotel: HotelRateForm["hotel"], hotels: HotelRef[]): string => {
    if (!hotel) return "-";
    if (typeof hotel === "string") {
        return hotels.find((item) => item._id === hotel)?.hotelName || "Unknown hotel";
    }
    return hotel.hotelName || "Unknown hotel";
};

const toDateInput = (value?: string) => (value ? value.slice(0, 10) : "");

const normalizeHotelRates = (volume: RateVolumeType): HotelRateForm[] => {
    const source = volume.hotelRates?.length ? volume.hotelRates : volume.hotel ? [volume as HotelRateForm] : [];
    return source.map((rate) => ({
        _id: rate._id,
        hotel: getHotelId(rate.hotel),
        city: rate.city || (typeof rate.hotel === "object" && rate.hotel ? rate.hotel.city : ""),
        buyingPrice: rate.buyingPrice ?? 0,
        buyingRoe: rate.buyingRoe ?? 1,
        buyingCurrency: rate.buyingCurrency || "PKR",
        sellingPrice: rate.sellingPrice ?? 0,
        sellingRoe: rate.sellingRoe ?? 1,
        sellingCurrency: rate.sellingCurrency || "PKR",
        sharedRoomBuyingPrice: rate.sharedRoomBuyingPrice ?? 0,
        sharedRoomBuyingRoe: rate.sharedRoomBuyingRoe ?? 1,
        sharedRoomBuyingCurrency: rate.sharedRoomBuyingCurrency || "PKR",
        sharedRoomSellingPrice: rate.sharedRoomSellingPrice ?? 0,
        sharedRoomSellingRoe: rate.sharedRoomSellingRoe ?? 1,
        sharedRoomSellingCurrency: rate.sharedRoomSellingCurrency || "PKR",
    }));
};

const getVolumeDateRange = (volume: RateVolumeType) => ({
    fromDate: toDateInput(volume.fromDate || volume.hotelRates?.[0]?.fromDate),
    toDate: toDateInput(volume.toDate || volume.hotelRates?.[0]?.toDate),
});

const currencyOptions = currency_list.map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
}));

type SelectOption = { value: string; label: string };

const customSelectStyles: StylesConfig<SelectOption, false> = {
    control: (base, state) => ({
        ...base,
        minHeight: "42px",
        borderRadius: "0.75rem",
        borderColor: state.isFocused ? "#3B82F6" : "#E5E7EB",
        boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.1)" : "none",
        "&:hover": { borderColor: state.isFocused ? "#3B82F6" : "#D1D5DB" },
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected ? "#3B82F6" : state.isFocused ? "#EFF6FF" : "white",
        color: state.isSelected ? "white" : "#1F2937",
        "&:active": { backgroundColor: "#2563EB" },
    }),
    menu: (base) => ({
        ...base,
        zIndex: 20,
        borderRadius: "0.75rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    }),
};

interface PricingFieldsProps {
    title: string;
    priceLabel: string;
    icon: React.ReactNode;
    classes: string;
    price: number;
    roe: number;
    currency: string;
    onPriceChange: (value: number) => void;
    onRoeChange: (value: number) => void;
    onCurrencyChange: (value: string) => void;
}

function PricingFields({
    title,
    priceLabel,
    icon,
    classes,
    price,
    roe,
    currency,
    onPriceChange,
    onRoeChange,
    onCurrencyChange,
}: PricingFieldsProps) {
    return (
        <div className={`rounded-xl border p-4 ${classes}`}>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                {icon}
                {title}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">{priceLabel}</label>
                    <input
                        type="number"
                        min={0}
                        value={price || ""}
                        onChange={(event) => onPriceChange(Number(event.target.value))}
                        placeholder="0"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">ROE</label>
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={roe}
                        onChange={(event) => onRoeChange(Number(event.target.value))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">Currency</label>
                    <Select
                        options={currencyOptions}
                        value={currencyOptions.find((option) => option.value === currency) || null}
                        onChange={(option) => onCurrencyChange(option?.value || "PKR")}
                        isSearchable
                        styles={customSelectStyles}
                    />
                </div>
            </div>
        </div>
    );
}

export default function RateVolumes() {
    const [volumes, setVolumes] = useState<RateVolumeType[]>([]);
    const [hotels, setHotels] = useState<HotelRef[]>([]);
    const [formData, setFormData] = useState<RateVolumeForm>(initialState);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [expandedVolumeIds, setExpandedVolumeIds] = useState<Set<string>>(new Set());

    const fetchVolumes = async () => {
        try {
            const response = await axiosInstance.get("/rate-volumes/all");
            setVolumes(response.data.data || []);
        } catch (error) {
            console.error("Unable to fetch rate volumes", error);
        }
    };

    const fetchHotels = async () => {
        try {
            const response = await axiosInstance.get("/hotels/all");
            setHotels(response.data.data || []);
        } catch (error) {
            console.error("Unable to fetch hotels", error);
        }
    };

    useEffect(() => {
        void fetchVolumes();
        void fetchHotels();
    }, []);

    const cityOptions = useMemo(
        () => Array.from(new Set(hotels.map((hotel) => hotel.city).filter(Boolean))).sort().map((city) => ({ value: city, label: city })),
        [hotels],
    );

    const updateHotelRate = <K extends keyof HotelRateForm>(index: number, field: K, value: HotelRateForm[K]) => {
        setFormData((current) => ({
            ...current,
            hotelRates: current.hotelRates.map((rate, rateIndex) =>
                rateIndex === index ? { ...rate, [field]: value } : rate,
            ),
        }));
    };

    const handleHotelChange = (index: number, hotelId: string) => {
        const selectedHotel = hotels.find((hotel) => hotel._id === hotelId);
        setFormData((current) => ({
            ...current,
            hotelRates: current.hotelRates.map((rate, rateIndex) =>
                rateIndex === index
                    ? { ...rate, hotel: hotelId, city: selectedHotel?.city || rate.city }
                    : rate,
            ),
        }));
    };

    const handleCityChange = (index: number, city: string) => {
        setFormData((current) => ({
            ...current,
            hotelRates: current.hotelRates.map((rate, rateIndex) => {
                if (rateIndex !== index) return rate;
                const selectedHotel = hotels.find((hotel) => hotel._id === getHotelId(rate.hotel));
                return {
                    ...rate,
                    city,
                    hotel: selectedHotel?.city === city ? rate.hotel : "",
                };
            }),
        }));
    };

    const addHotelRate = () => {
        setFormData((current) => ({ ...current, hotelRates: [...current.hotelRates, emptyHotelRate()] }));
    };

    const removeHotelRate = (index: number) => {
        setFormData((current) => ({
            ...current,
            hotelRates: current.hotelRates.filter((_, rateIndex) => rateIndex !== index),
        }));
    };

    const resetForm = () => {
        setEditId(null);
        setFormData(initialState());
        setShowForm(false);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!formData.volumeName.trim()) {
            alert("Please enter a volume name");
            return;
        }

        if (!formData.fromDate || !formData.toDate) {
            alert("Please select the volume date range");
            return;
        }
        if (new Date(formData.fromDate) > new Date(formData.toDate)) {
            alert("From date cannot be after to date");
            return;
        }

        for (let index = 0; index < formData.hotelRates.length; index += 1) {
            const rate = formData.hotelRates[index];
            if (!getHotelId(rate.hotel)) {
                alert(`Please select a hotel in Hotel Rate ${index + 1}`);
                return;
            }
            if (!rate.city) {
                alert(`Please select a city in Hotel Rate ${index + 1}`);
                return;
            }
        }

        try {
            setLoading(true);
            const payload = {
                volumeName: formData.volumeName.trim(),
                isActive: formData.isActive,
                fromDate: formData.fromDate,
                toDate: formData.toDate,
                hotelRates: formData.hotelRates.map((rate) => ({
                    hotel: getHotelId(rate.hotel),
                    city: rate.city,
                    buyingPrice: rate.buyingPrice,
                    buyingRoe: rate.buyingRoe,
                    buyingCurrency: rate.buyingCurrency,
                    sellingPrice: rate.sellingPrice,
                    sellingRoe: rate.sellingRoe,
                    sellingCurrency: rate.sellingCurrency,
                    sharedRoomBuyingPrice: rate.sharedRoomBuyingPrice,
                    sharedRoomBuyingRoe: rate.sharedRoomBuyingRoe,
                    sharedRoomBuyingCurrency: rate.sharedRoomBuyingCurrency,
                    sharedRoomSellingPrice: rate.sharedRoomSellingPrice,
                    sharedRoomSellingRoe: rate.sharedRoomSellingRoe,
                    sharedRoomSellingCurrency: rate.sharedRoomSellingCurrency,
                })),
            };

            if (editId) {
                await axiosInstance.put(`/rate-volumes/update/${editId}`, payload);
                alert("Volume updated successfully");
            } else {
                await axiosInstance.post("/rate-volumes/create", payload);
                alert("Volume created successfully");
            }

            resetForm();
            await fetchVolumes();
        } catch (error: unknown) {
            console.error(error);
            const responseError = error as { response?: { data?: { message?: string } } };
            alert(responseError.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (volume: RateVolumeType) => {
        const hotelRates = normalizeHotelRates(volume);
        const dateRange = getVolumeDateRange(volume);
        setFormData({
            volumeName: volume.volumeName,
            isActive: volume.isActive !== false,
            ...dateRange,
            hotelRates: hotelRates.length ? hotelRates : [emptyHotelRate()],
        });
        setEditId(volume._id || null);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id?: string) => {
        if (!id || !window.confirm("Are you sure you want to delete this volume?")) return;
        try {
            await axiosInstance.delete(`/rate-volumes/delete/${id}`);
            setExpandedVolumeIds((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
            });
            alert("Volume deleted successfully");
            await fetchVolumes();
        } catch (error) {
            console.error(error);
            alert("Delete failed");
        }
    };

    const toggleVolumeDetails = (id?: string) => {
        if (!id) return;
        setExpandedVolumeIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2"><FiDollarSign className="h-6 w-6 text-blue-600" /></div>
                            <h1 className="text-3xl font-bold text-gray-900">Rate Volumes</h1>
                        </div>
                        <p className="ml-12 text-gray-600">Group multiple hotel rates under one reusable volume</p>
                    </div>
                    <button
                        onClick={() => {
                            if (showForm) resetForm();
                            else {
                                setFormData(initialState());
                                setEditId(null);
                                setShowForm(true);
                            }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-lg transition hover:bg-blue-700"
                    >
                        {showForm ? <><FiX className="h-5 w-5" />Close Form</> : <><FiPlus className="h-5 w-5" />Add New Volume</>}
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="mb-8 space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${editId ? "bg-yellow-100" : "bg-green-100"}`}>
                                {editId ? <FiEdit2 className="h-5 w-5 text-yellow-600" /> : <FiPlus className="h-5 w-5 text-green-600" />}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">{editId ? "Update Volume" : "Create New Volume"}</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(300px,2fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(140px,auto)] xl:items-end">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Volume Name <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <FiPackage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input value={formData.volumeName} onChange={(event) => setFormData((current) => ({ ...current, volumeName: event.target.value }))} placeholder="e.g. Ramadan Volume 2027" required className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700">From Date <span className="text-red-500">*</span></label>
                                <div className="relative"><FiCalendar className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" /><input type="date" value={formData.fromDate} onChange={(event) => setFormData((current) => ({ ...current, fromDate: event.target.value }))} onClick={(event) => event.currentTarget.showPicker?.()} required className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700">To Date <span className="text-red-500">*</span></label>
                                <div className="relative"><FiCalendar className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" /><input type="date" value={formData.toDate} min={formData.fromDate || undefined} onChange={(event) => setFormData((current) => ({ ...current, toDate: event.target.value }))} onClick={(event) => event.currentTarget.showPicker?.()} required className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Status</label>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={formData.isActive}
                                    onClick={() => setFormData((current) => ({ ...current, isActive: !current.isActive }))}
                                    className="flex h-10.5 w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 xl:min-w-35"
                                >
                                    <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${formData.isActive ? "bg-green-500" : "bg-gray-300"}`}>
                                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${formData.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                                    </span>
                                    <span className={`text-sm font-semibold ${formData.isActive ? "text-green-700" : "text-gray-500"}`}>{formData.isActive ? "Active" : "Inactive"}</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {formData.hotelRates.map((rate, index) => {
                                const filteredHotels = rate.city ? hotels.filter((hotel) => hotel.city === rate.city) : hotels;
                                const hotelOptions = filteredHotels.map((hotel) => ({ value: hotel._id, label: hotel.hotelName }));
                                const hotelId = getHotelId(rate.hotel);

                                return (
                                    <section key={rate._id || index} className="overflow-visible rounded-2xl border-2 border-blue-200 bg-blue-50/40">
                                        <div className="flex items-center justify-between border-b border-blue-200 px-5 py-3">
                                            <div className="flex items-center gap-2"><div className="rounded-lg bg-blue-100 p-1.5"><FiHome className="h-4 w-4 text-blue-600" /></div><h3 className="font-bold text-blue-800">Hotel Rate {index + 1}</h3></div>
                                            {formData.hotelRates.length > 1 && <button type="button" onClick={() => removeHotelRate(index)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"><FiTrash2 /> Remove</button>}
                                        </div>

                                        <div className="space-y-4 p-5">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">City <span className="text-red-500">*</span></label>
                                                    <Select options={cityOptions} value={rate.city ? { value: rate.city, label: rate.city } : null} onChange={(option) => handleCityChange(index, option?.value || "")} placeholder="Select city" isClearable isSearchable styles={customSelectStyles} />
                                                </div>
                                                <div>
                                                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">Hotel <span className="text-red-500">*</span></label>
                                                    <Select options={hotelOptions} value={hotelId ? hotelOptions.find((option) => option.value === hotelId) || null : null} onChange={(option) => handleHotelChange(index, option?.value || "")} placeholder="Select hotel" isClearable isSearchable styles={customSelectStyles} />
                                                </div>
                                            </div>

                                            {rate.city && hotelOptions.length === 0 && <p className="flex items-center gap-1 text-xs text-amber-600"><FiAlertCircle />No hotels found in {rate.city}.</p>}

                                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                                <PricingFields title="Buying Details" priceLabel="Price/Room" icon={<FiTrendingDown />} classes="border-red-200 bg-red-50/60 text-red-700" price={rate.buyingPrice} roe={rate.buyingRoe} currency={rate.buyingCurrency} onPriceChange={(value) => updateHotelRate(index, "buyingPrice", value)} onRoeChange={(value) => updateHotelRate(index, "buyingRoe", value)} onCurrencyChange={(value) => updateHotelRate(index, "buyingCurrency", value)} />
                                                <PricingFields title="Selling Details" priceLabel="Price/Room" icon={<FiTrendingUp />} classes="border-green-200 bg-green-50/60 text-green-700" price={rate.sellingPrice} roe={rate.sellingRoe} currency={rate.sellingCurrency} onPriceChange={(value) => updateHotelRate(index, "sellingPrice", value)} onRoeChange={(value) => updateHotelRate(index, "sellingRoe", value)} onCurrencyChange={(value) => updateHotelRate(index, "sellingCurrency", value)} />
                                                <PricingFields title="Shared Room Buying" priceLabel="Buying Price" icon={<FiPackage />} classes="border-yellow-200 bg-yellow-50/60 text-yellow-700" price={rate.sharedRoomBuyingPrice} roe={rate.sharedRoomBuyingRoe} currency={rate.sharedRoomBuyingCurrency} onPriceChange={(value) => updateHotelRate(index, "sharedRoomBuyingPrice", value)} onRoeChange={(value) => updateHotelRate(index, "sharedRoomBuyingRoe", value)} onCurrencyChange={(value) => updateHotelRate(index, "sharedRoomBuyingCurrency", value)} />
                                                <PricingFields title="Shared Room Selling" priceLabel="Selling Price" icon={<FiPackage />} classes="border-yellow-200 bg-yellow-50/60 text-yellow-700" price={rate.sharedRoomSellingPrice} roe={rate.sharedRoomSellingRoe} currency={rate.sharedRoomSellingCurrency} onPriceChange={(value) => updateHotelRate(index, "sharedRoomSellingPrice", value)} onRoeChange={(value) => updateHotelRate(index, "sharedRoomSellingRoe", value)} onCurrencyChange={(value) => updateHotelRate(index, "sharedRoomSellingCurrency", value)} />
                                            </div>
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        <button type="button" onClick={addHotelRate} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"><FiPlus className="h-5 w-5" />Add More Hotel</button>

                        <div className="flex gap-3 border-t pt-4">
                            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white shadow-lg transition hover:bg-blue-700 disabled:bg-blue-400">{loading ? <><FiRefreshCw className="h-5 w-5 animate-spin" />Processing...</> : <><FiSave className="h-5 w-5" />{editId ? "Update Volume" : "Save Volume"}</>}</button>
                            <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-xl bg-gray-200 px-6 py-3 font-medium text-gray-700 hover:bg-gray-300"><FiX />Cancel</button>
                        </div>
                    </form>
                )}

                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                    <div className="border-b border-gray-100 p-6"><div className="flex items-center gap-3"><div className="rounded-lg bg-purple-100 p-2"><FiPackage className="h-5 w-5 text-purple-600" /></div><div><h2 className="text-2xl font-bold text-gray-800">All Volumes</h2><p className="mt-0.5 text-sm text-gray-500">{volumes.length} {volumes.length === 1 ? "volume" : "volumes"} total</p></div></div></div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="bg-gray-50"><th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Volume Name</th><th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Hotels Included</th><th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th><th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th></tr></thead>
                            <tbody>
                                {volumes.length ? volumes.map((volume, index) => {
                                    const rates = normalizeHotelRates(volume);
                                    const dateRange = getVolumeDateRange(volume);
                                    const isExpanded = volume._id ? expandedVolumeIds.has(volume._id) : false;
                                    return (
                                        <React.Fragment key={volume._id || index}>
                                            <tr className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${index % 2 ? "bg-gray-50/30" : "bg-white"}`}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleVolumeDetails(volume._id)}
                                                            aria-expanded={isExpanded}
                                                            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${volume.volumeName}`}
                                                            title={isExpanded ? "Hide hotel details" : "Show hotel details"}
                                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                                                        >
                                                            {isExpanded ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
                                                        </button>
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100"><FiPackage className="text-blue-600" /></div>
                                                        <div>
                                                            <div className="font-semibold text-gray-800">{volume.volumeName}</div>
                                                            <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500"><FiCalendar />{dayjs(dateRange.fromDate).format("DD MMM YYYY")} - {dayjs(dateRange.toDate).format("DD MMM YYYY")}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <button type="button" onClick={() => toggleVolumeDetails(volume._id)} className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-100">
                                                        <FiHome className="h-4 w-4" />
                                                        {rates.length} {rates.length === 1 ? "hotel" : "hotels"}
                                                    </button>
                                                </td>
                                                <td className="p-4"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${volume.isActive !== false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}><span className={`h-1.5 w-1.5 rounded-full ${volume.isActive !== false ? "bg-green-500" : "bg-gray-400"}`} />{volume.isActive !== false ? "Active" : "Inactive"}</span></td>
                                                <td className="p-4"><div className="flex gap-2"><button onClick={() => handleEdit(volume)} title="Edit" className="rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-yellow-700 hover:bg-yellow-100"><FiEdit2 /></button><button onClick={() => handleDelete(volume._id)} title="Delete" className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"><FiTrash2 /></button></div></td>
                                            </tr>

                                            {isExpanded && (
                                                <tr className="border-b border-blue-100 bg-blue-50/40">
                                                    <td colSpan={4} className="px-5 py-4">
                                                        <div className="overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
                                                            <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/60 px-4 py-3">
                                                                <div>
                                                                    <h3 className="text-sm font-bold text-gray-800">Hotels in {volume.volumeName}</h3>
                                                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500"><FiCalendar />{dayjs(dateRange.fromDate).format("DD MMM YYYY")} - {dayjs(dateRange.toDate).format("DD MMM YYYY")} applies to every hotel</p>
                                                                </div>
                                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">{rates.length} total</span>
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full min-w-205">
                                                                    <thead>
                                                                        <tr className="border-b border-gray-100 bg-gray-50/70 text-xs uppercase tracking-wide text-gray-500">
                                                                            <th className="px-4 py-3 text-left font-semibold">Hotel</th>
                                                                            <th className="px-4 py-3 text-left font-semibold">Buying</th>
                                                                            <th className="px-4 py-3 text-left font-semibold">Selling</th>
                                                                            <th className="px-4 py-3 text-left font-semibold">Shared Buying</th>
                                                                            <th className="px-4 py-3 text-left font-semibold">Shared Selling</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {rates.map((rate, rateIndex) => (
                                                                            <tr key={rate._id || rateIndex} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                                                                                <td className="px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><FiHome className="shrink-0 text-blue-500" />{getHotelName(rate.hotel, hotels)}</div><div className="mt-1 flex items-center gap-1 pl-6 text-xs text-gray-500"><FiMapPin />{rate.city || "-"}</div></td>
                                                                                <td className="px-4 py-3"><div className="whitespace-nowrap text-sm font-semibold text-red-600">{rate.buyingPrice.toLocaleString()} <span className="text-xs font-medium">{rate.buyingCurrency}</span></div><div className="mt-0.5 text-xs text-gray-400">ROE {rate.buyingRoe}</div></td>
                                                                                <td className="px-4 py-3"><div className="whitespace-nowrap text-sm font-semibold text-green-600">{rate.sellingPrice.toLocaleString()} <span className="text-xs font-medium">{rate.sellingCurrency}</span></div><div className="mt-0.5 text-xs text-gray-400">ROE {rate.sellingRoe}</div></td>
                                                                                <td className="px-4 py-3"><div className="whitespace-nowrap text-sm font-semibold text-amber-600">{rate.sharedRoomBuyingPrice.toLocaleString()} <span className="text-xs font-medium">{rate.sharedRoomBuyingCurrency}</span></div><div className="mt-0.5 text-xs text-gray-400">ROE {rate.sharedRoomBuyingRoe}</div></td>
                                                                                <td className="px-4 py-3"><div className="whitespace-nowrap text-sm font-semibold text-amber-700">{rate.sharedRoomSellingPrice.toLocaleString()} <span className="text-xs font-medium">{rate.sharedRoomSellingCurrency}</span></div><div className="mt-0.5 text-xs text-gray-400">ROE {rate.sharedRoomSellingRoe}</div></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                }) : <tr><td colSpan={4}><div className="flex flex-col items-center py-16 text-gray-400"><FiAlertCircle className="mb-4 h-12 w-12 text-gray-300" /><p className="text-lg font-medium text-gray-500">No volumes found</p><p className="mt-1 text-sm">Click Add New Volume to create your first volume</p></div></td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
