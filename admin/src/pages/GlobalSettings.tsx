
import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
// import Select from "../components/form/Select";

type Period = "AM" | "PM";
type SlabStatus = "Active" | "Inactive";
type ApiKey =
    | "admin"
    | "al-haider"
    | "travel-network"
    | "skypass"
    | "mct"
    | "upsky"
    | "ALSABOOR";

interface TimeSlab {
    _id: string;
    timeFrom: string;
    timeTo: string;
    timeFromPeriod: Period;
    timeToPeriod: Period;
    fromMinutes: number;
    toMinutes: number;
    holdDurationHours: number;
    status: SlabStatus;
    apiKey?: string; // Added for aggregated view
}

interface GlobalSettingsResponse {
    _id: string;
    type: "booking_hold_duration";
    api_key?: ApiKey;
    timeSlabs: TimeSlab[];
}

interface FormState {
    timeFrom: string;
    timeTo: string;
    timeFromPeriod: Period;
    timeToPeriod: Period;
    holdDurationHours: string;
    status: SlabStatus;
    apiKey: ApiKey; // Added API Provider to form state
}

const initialFormState: FormState = {
    timeFrom: "",
    timeTo: "",
    timeFromPeriod: "AM",
    timeToPeriod: "AM",
    holdDurationHours: "",
    status: "Active",
    apiKey: "admin", // Default API Provider
};

const generateTimeOptions = () => {
    const options: string[] = [];

    for (let hour = 1; hour <= 12; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const formattedHour = String(hour).padStart(2, "0");
            const formattedMinute = String(minute).padStart(2, "0");
            options.push(`${formattedHour}:${formattedMinute}`);
        }
    }

    return options;
};

const TIME_OPTIONS = generateTimeOptions();

const GlobalSettings: React.FC = () => {
    const { user } = useAuth();
    const canView = hasPermission(user, "global_settings");

    const [settings, setSettings] = useState<GlobalSettingsResponse | null>(null);
    const [form, setForm] = useState<FormState>(initialFormState);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [editingSlabId, setEditingSlabId] = useState<string | null>(null);

    const timeSlabs = useMemo(() => {
        return settings?.timeSlabs || [];
    }, [settings]);

    const handleEdit = (slab: TimeSlab) => {
        setEditingSlabId(slab._id);

        setForm({
            timeFrom: slab.timeFrom,
            timeTo: slab.timeTo,
            timeFromPeriod: slab.timeFromPeriod,
            timeToPeriod: slab.timeToPeriod,
            holdDurationHours: String(slab.holdDurationHours),
            status: slab.status,
            apiKey: (slab.apiKey === 'default' ? 'admin' : slab.apiKey) as ApiKey || "admin",
        });
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);

            const url = `/global-settings?getAll=true`;

            const res = await axiosInstance.get(url);

            if (res.data?.success) {
                // Assume we always get an array of settings
                if (Array.isArray(res.data.data)) {
                    // Create a unified view of all time slabs from all API keys
                    const allTimeSlabs: TimeSlab[] = [];

                    res.data.data.forEach((setting: any) => {
                        if (Array.isArray(setting.timeSlabs)) {
                            setting.timeSlabs.forEach((slab: TimeSlab) => {
                                // Add the api_key info to each slab for display purposes
                                allTimeSlabs.push({
                                    ...slab,
                                    apiKey: setting.api_key
                                });
                            });
                        }
                    });

                    setSettings({
                        _id: "combined",
                        type: "booking_hold_duration",
                        api_key: undefined,
                        timeSlabs: allTimeSlabs,
                    });
                } else {
                    // If it's a single object, use it directly
                    setSettings(res.data.data);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load global settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canView) {
            fetchSettings();
        } else {
            setLoading(false);
        }
    }, [canView]);

    const resetForm = () => {
        setEditingSlabId(null);
        setForm(initialFormState);
    };

    const handleChange = (field: keyof FormState, value: string) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const validateForm = () => {
        if (!form.timeFrom) {
            toast.warning("Please select Time From");
            return false;
        }

        if (!form.timeTo) {
            toast.warning("Please select Time To");
            return false;
        }

        if (!form.holdDurationHours) {
            toast.warning("Please enter Hold Duration in Hours");
            return false;
        }

        const duration = Number(form.holdDurationHours);

        if (Number.isNaN(duration) || duration <= 0) {
            toast.warning("Hold Duration must be greater than 0");
            return false;
        }

        return true;
    };

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (
            typeof error === "object" &&
            error !== null &&
            "response" in error
        ) {
            const err = error as {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            };

            if (typeof err.response?.data?.message === "string") {
                return err.response.data.message;
            }
        }

        return fallback;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);

            const payload = {
                timeFrom: form.timeFrom,
                timeTo: form.timeTo,
                timeFromPeriod: form.timeFromPeriod,
                timeToPeriod: form.timeToPeriod,
                holdDurationHours: Number(form.holdDurationHours),
                status: form.status,
            };

            const apiKeyForRequest = form.apiKey;
            const url = `/global-settings/booking-hold/time-slabs?api_key=${apiKeyForRequest}`;

            if (editingSlabId) {
                const res = await axiosInstance.put(
                    `/global-settings/booking-hold/time-slabs/${editingSlabId}?api_key=${apiKeyForRequest}`,
                    payload
                );

                if (res.data?.success) {
                    // Refresh the entire settings list to ensure consistency
                    await fetchSettings();
                    toast.success("Time slab updated successfully");
                    resetForm();
                }
            } else {
                const res = await axiosInstance.post(url, payload);

                if (res.data?.success) {
                    // Refresh the entire settings list to ensure consistency
                    await fetchSettings();
                    toast.success("Time slab added successfully");
                    resetForm();
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Failed to save time slab"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (slabId: string) => {
        const confirmed = window.confirm("Are you sure you want to delete this time slab?");

        if (!confirmed) return;

        try {
            const slabToDelete = settings?.timeSlabs.find(s => s._id === slabId);
            const apiKeyForRequest = (slabToDelete?.apiKey === 'default' ? 'admin' : slabToDelete?.apiKey) || 'admin';

            const res = await axiosInstance.delete(
                `/global-settings/booking-hold/time-slabs/${slabId}?api_key=${apiKeyForRequest}`
            );

            if (res.data?.success) {
                // Refresh the entire settings list to ensure consistency
                await fetchSettings();
                toast.success("Time slab deleted successfully");

                if (editingSlabId === slabId) {
                    resetForm();
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Failed to delete time slab"));
        }
    };

    const handleStatusToggle = async (slab: TimeSlab) => {
        try {
            const nextStatus: SlabStatus =
                slab.status === "Active" ? "Inactive" : "Active";

            let apiKeyForRequest = "admin"; // default
            if (settings) {
                if ((slab as any).apiKey) {
                    apiKeyForRequest = (slab as any).apiKey === 'default' ? 'admin' : (slab as any).apiKey;
                }
            }

            const res = await axiosInstance.put(
                `/global-settings/booking-hold/time-slabs/${slab._id}?api_key=${apiKeyForRequest}`,
                {
                    timeFrom: slab.timeFrom,
                    timeTo: slab.timeTo,
                    timeFromPeriod: slab.timeFromPeriod,
                    timeToPeriod: slab.timeToPeriod,
                    holdDurationHours: slab.holdDurationHours,
                    status: nextStatus
                }
            );

            if (res.data?.success) {
                // Refresh the entire settings list to ensure consistency
                await fetchSettings();
                toast.success(`Time slab marked as ${nextStatus}`);
            }
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Failed to update status"));
        }
    };

    if (!canView) {
        return (
            <>
                <PageMeta
                    title="Global Settings - Access denied"
                    description="Access denied"
                />

                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
                    You do not have permission to view Global Settings.
                </div>
            </>
        );
    }

    return (
        <>
            <PageMeta
                title="Global Settings | Admin"
                description="Manage global settings"
            />

            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                        Global Settings
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Manage booking hold duration time slabs.
                    </p>
                </div>

                <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
                        {editingSlabId ? "Update Time Slab" : "Add Time Slab"}
                    </h2>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                API Provider
                            </label>

                            <select
                                value={form.apiKey}
                                onChange={(e) => handleChange("apiKey", e.target.value as ApiKey)}
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="admin">Admin</option>
                                <option value="al-haider">Al-Haider</option>
                                <option value="travel-network">Travel Network</option>
                                <option value="skypass">SkyPass</option>
                                <option value="mct">MCT</option>
                                <option value="upsky">Up Sky</option>
                                <option value="ALSABOOR">Al Saboor</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Time From
                            </label>

                            <select
                                value={form.timeFrom}
                                onChange={(e) => handleChange("timeFrom", e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="">Select Time</option>
                                {TIME_OPTIONS.map((time) => (
                                    <option key={`from-${time}`} value={time}>
                                        {time}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                From AM/PM
                            </label>

                            <select
                                value={form.timeFromPeriod}
                                onChange={(e) =>
                                    handleChange("timeFromPeriod", e.target.value)
                                }
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Time To
                            </label>

                            <select
                                value={form.timeTo}
                                onChange={(e) => handleChange("timeTo", e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="">Select Time</option>
                                {TIME_OPTIONS.map((time) => (
                                    <option key={`to-${time}`} value={time}>
                                        {time}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                To AM/PM
                            </label>

                            <select
                                value={form.timeToPeriod}
                                onChange={(e) => handleChange("timeToPeriod", e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Hold Duration Hours
                            </label>

                            <input
                                type="number"
                                min={1}
                                value={form.holdDurationHours}
                                onChange={(e) =>
                                    handleChange("holdDurationHours", e.target.value)
                                }
                                placeholder="Example: 2"
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                    </div>

                    {editingSlabId && (
                        <div className="mt-4 max-w-xs">
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Status
                            </label>

                            <select
                                value={form.status}
                                onChange={(e) => handleChange("status", e.target.value)}
                                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                            {submitting
                                ? "Saving..."
                                : editingSlabId
                                    ? "Update Time Slab"
                                    : "Add Time Slab"}
                        </button>

                        {editingSlabId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                        <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                            Booking Hold Duration Time Slabs (All APIs Combined)
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-6 text-sm text-gray-500">
                            Loading settings...
                        </div>
                    ) : timeSlabs.length === 0 ? (
                        <div className="p-6 text-sm text-gray-400">
                            No time slabs added yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-left text-xs font-bold uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                        <th className="px-4 py-3">API Provider</th>
                                        <th className="px-4 py-3">Time From</th>
                                        <th className="px-4 py-3">Time To</th>
                                        <th className="px-4 py-3">Hold Duration</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {timeSlabs.map((slab) => (
                                        <tr
                                            key={slab._id}
                                            className="border-t border-gray-100 text-sm dark:border-gray-800"
                                        >
                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                {slab.apiKey || 'default'}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                                                {slab.timeFrom} {slab.timeFromPeriod}
                                            </td>

                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                                                {slab.timeTo} {slab.timeToPeriod}
                                            </td>

                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                {slab.holdDurationHours} {slab.holdDurationHours === 1 ? "hour" : "hours"}
                                            </td>

                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusToggle(slab)}
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${slab.status === "Active"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-gray-100 text-gray-500"
                                                        }`}
                                                >
                                                    {slab.status}
                                                </button>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(slab)}
                                                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(slab._id)}
                                                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
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
                    )}
                </div>
            </div>
        </>
    );
};

export default GlobalSettings;