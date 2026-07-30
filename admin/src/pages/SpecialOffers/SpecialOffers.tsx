import React, { useEffect, useState } from "react";
import axiosInstance from "../../Api/axios";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

interface Offer {
    _id: string;
    title: string;
    image: string;
    createdAt: string;
}

interface FormData {
    title: string;
    image: File | null;
}

interface SnackbarState {
    open: boolean;
    message: string;
    severity: "success" | "error";
}

export default function SpecialOffers() {
    const { user } = useAuth();
    const canView = hasPermission(user, "view_special_offers");
    const canAdd = hasPermission(user, "add_special_offers");
    const canManage = hasPermission(user, "manage_special_offers");
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showForm, setShowForm] = useState<boolean>(false); // Changed from openDialog
    const [editMode, setEditMode] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [currentOffer, setCurrentOffer] = useState<Offer | null>(null);
    const [formData, setFormData] = useState<FormData>({
        title: "",
        image: null,
    });
    const [imagePreview, setImagePreview] = useState<string>("");
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: "",
        severity: "success",
    });

    useEffect(() => {
        if (canView) {
            fetchOffers();
        } else {
            setLoading(false);
        }
    }, [canView]);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get("/specialOffer/getSpecialOffers");
            if (response.data.success) {
                setOffers(response.data.data);
            }
        } catch (error) {
            showSnackbar("Failed to fetch offers", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenForm = (offer: Offer | null = null) => {
        if (offer && !canManage) {
            showSnackbar("You don't have permission to manage special offers", "error");
            return;
        }

        if (!offer && !canAdd) {
            showSnackbar("You don't have permission to add special offers", "error");
            return;
        }

        if (offer) {
            setEditMode(true);
            setCurrentOffer(offer);
            setFormData({ title: offer.title, image: null });
            setImagePreview(offer.image);
        } else {
            setEditMode(false);
            setCurrentOffer(null);
            setFormData({ title: "", image: null });
            setImagePreview("");
        }
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to see the form
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditMode(false);
        setCurrentOffer(null);
        setFormData({ title: "", image: null });
        setImagePreview("");
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, image: file });
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        const canSave = editMode ? canManage : canAdd;
        if (!canSave) {
            showSnackbar(editMode ? "You don't have permission to update special offers" : "You don't have permission to add special offers", "error");
            return;
        }

        try {
            setSubmitting(true);
            const data = new FormData();
            data.append("title", formData.title);
            if (formData.image) {
                data.append("image", formData.image);
            }

            if (editMode && currentOffer) {
                data.append("id", currentOffer._id);
                const response = await axiosInstance.put("/specialOffer/updateSpecialOffer", data, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                if (response.data.success) {
                    showSnackbar("Offer updated successfully", "success");
                    fetchOffers();
                    handleCloseForm();
                }
            } else {
                const response = await axiosInstance.post("/specialOffer/createSpecialOffer", data, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                if (response.data.success) {
                    showSnackbar("Offer created successfully", "success");
                    fetchOffers();
                    handleCloseForm();
                }
            }
        } catch (error: any) {
            showSnackbar(error.response?.data?.message || "Operation failed", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!canManage) {
            showSnackbar("You don't have permission to manage special offers", "error");
            return;
        }

        if (!window.confirm("Are you sure you want to delete this offer?")) return;
        try {
            const response = await axiosInstance.delete("/specialOffer/deleteSpecialOffer", { data: { id } });
            if (response.data.success) {
                showSnackbar("Offer deleted successfully", "success");
                fetchOffers();
            }
        } catch (error) {
            showSnackbar("Failed to delete offer", "error");
        }
    };

    const showSnackbar = (message: string, severity: "success" | "error") => {
        setSnackbar({ open: true, message, severity });
        setTimeout(() => handleCloseSnackbar(), 3000);
    };

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
                You do not have permission to view Special Offers.
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Index Cards</h1>
                    <p className="text-gray-500">Manage your promotional content</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => handleOpenForm()}
                        disabled={!canAdd}
                        className="flex items-center gap-2 px-6 py-3 bg-[#1e4a76] text-white rounded-xl hover:bg-[#153659] shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!canAdd ? "You don't have permission to add special offers" : ""}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Offer
                    </button>
                )}
            </div>

            {/* Inline Form Section (Replaces the Modal) */}
            {showForm && (
                <div className="mb-10 bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-700">
                            {editMode ? "Edit Offer Details" : "Create New Offer"}
                        </h2>
                        <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                            Cancel
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Offer Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Summer Sale 2026"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Offer Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !formData.title || (!formData.image && !editMode) || (editMode ? !canManage : !canAdd)}
                                    className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[140px]"
                                    title={editMode ? (!canManage ? "You don't have permission to update special offers" : "") : (!canAdd ? "You don't have permission to add special offers" : "")}
                                >
                                    {submitting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        editMode ? "Save Changes" : "Create Offer"
                                    )}
                                </button>
                                <button
                                    onClick={handleCloseForm}
                                    className="px-6 py-2 border border-gray-200 text-gray-600 rounded-lg"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center p-4 min-h-[200px]">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="max-h-48 rounded shadow-sm" />
                            ) : (
                                <span className="text-gray-400 text-sm">Image preview will appear here</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Offers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {offers.map((offer) => (
                    <div key={offer._id} className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <img src={offer.image} alt={offer.title} className="w-full h-40 object-cover rounded-t-xl" />
                        <div className="p-4">
                            <h3 className="font-bold text-gray-800 truncate">{offer.title}</h3>
                            <div className="mt-4 flex justify-between items-center">
                                <span className="text-xs text-gray-400">{new Date(offer.createdAt).toLocaleDateString()}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenForm(offer)}
                                        disabled={!canManage}
                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={!canManage ? "You don't have permission to manage special offers" : ""}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(offer._id)}
                                        disabled={!canManage}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={!canManage ? "You don't have permission to manage special offers" : ""}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Custom Snackbar (unchanged logic, improved positioning) */}
            {snackbar.open && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-slide-up">
                    <div className={`w-2 h-2 rounded-full ${snackbar.severity === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                    {snackbar.message}
                </div>
            )}

            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                @keyframes slide-up { from { bottom: -50px; opacity: 0; } to { bottom: 40px; opacity: 1; } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            `}</style>
        </div>
    );
}
