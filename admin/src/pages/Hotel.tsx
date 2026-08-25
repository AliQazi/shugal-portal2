import React, { useEffect, useState } from "react";
import axiosInstance from "../Api/axios";

interface RoomOption {
    name: string;
    sellingPricePerNight: number;
    buyingPricePerNight: number;
    capacity: number;
    amenities: string[];
}

interface HotelType {
    _id?: string;
    hotelName: string;
    name?: string;
    city: string;
    rating: number;
    mapUrl: string;
    roomOptions: RoomOption[];
    location?: {
        city: string;
        address: string;
        latitude?: number;
        longitude?: number;
    };
    contactNumber?: string;
    email?: string;
    description?: string;
    isActive?: boolean;
}

const initialState: HotelType = {
    hotelName: "",
    city: "",
    rating: 0,
    mapUrl: "",
    roomOptions: [
        {
            name: "Standard Room",
            sellingPricePerNight: 10000,
            buyingPricePerNight: 8000,
            capacity: 2,
            amenities: ["WiFi", "TV", "AC"]
        }
    ],
    isActive: true
};

export default function Hotel() {
    const [hotels, setHotels] = useState<HotelType[]>([]);
    const [formData, setFormData] = useState<HotelType>(initialState);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

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
        fetchHotels();
    }, []);

    // ================= HANDLE CHANGE =================
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: name === "rating" ? Number(value) : value,
        }));
    };

    // ================= ROOM OPTIONS HANDLERS =================
    const handleRoomOptionChange = (index: number, field: keyof RoomOption, value: any) => {
        const updatedRoomOptions = [...formData.roomOptions];
        updatedRoomOptions[index] = {
            ...updatedRoomOptions[index],
            [field]: field === "sellingPricePerNight" || field === "buyingPricePerNight" || field === "capacity"
                ? Number(value)
                : value,
        };
        setFormData({ ...formData, roomOptions: updatedRoomOptions });
    };

    const addRoomOption = () => {
        setFormData({
            ...formData,
            roomOptions: [
                ...formData.roomOptions,
                {
                    name: "New Room Type",
                    sellingPricePerNight: 0,
                    buyingPricePerNight: 0,
                    capacity: 2,
                    amenities: []
                }
            ]
        });
    };

    const removeRoomOption = (index: number) => {
        const updatedRoomOptions = formData.roomOptions.filter((_, i) => i !== index);
        setFormData({ ...formData, roomOptions: updatedRoomOptions });
    };

    // ================= CREATE / UPDATE =================
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validation: Check if at least one room option exists
        if (formData.roomOptions.length === 0) {
            alert("Please add at least one room option");
            return;
        }

        // Validate room options
        for (const room of formData.roomOptions) {
            if (!room.name || room.sellingPricePerNight <= 0) {
                alert(`Please fill complete details for room: ${room.name}`);
                return;
            }
        }

        try {
            setLoading(true);

            // Prepare data with name field for compatibility
            const submitData = {
                ...formData,
                name: formData.hotelName, // Sync name with hotelName
                location: {
                    city: formData.city,
                    address: formData.location?.address || "",
                    ...formData.location
                }
            };

            if (editId) {
                await axiosInstance.put(`/hotels/update/${editId}`, submitData);
                alert("Hotel updated successfully");
            } else {
                await axiosInstance.post("/hotels/create", submitData);
                alert("Hotel created successfully");
            }

            setFormData(initialState);
            setEditId(null);
            fetchHotels();
        } catch (error) {
            console.log(error);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // ================= EDIT =================
    const handleEdit = (hotel: HotelType) => {
        setFormData({
            hotelName: hotel.hotelName,
            city: hotel.city,
            rating: hotel.rating,
            mapUrl: hotel.mapUrl,
            roomOptions: hotel.roomOptions || initialState.roomOptions,
            location: hotel.location,
            contactNumber: hotel.contactNumber || "",
            email: hotel.email || "",
            description: hotel.description || "",
            isActive: hotel.isActive !== undefined ? hotel.isActive : true,
        });
        setEditId(hotel._id || null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // ================= DELETE =================
    const handleDelete = async (id?: string) => {
        if (!id) return;
        const confirmDelete = window.confirm("Are you sure you want to delete this hotel?");
        if (!confirmDelete) return;

        try {
            await axiosInstance.delete(`/hotels/delete/${id}`);
            alert("Hotel deleted successfully");
            fetchHotels();
        } catch (error) {
            console.log(error);
            alert("Delete failed");
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* ================= HEADER ================= */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Hotel Management (Umrah Packages and Calculator)</h1>
                    <p className="text-gray-500 mt-1">Create, update and manage hotels with room options</p>
                </div>

                {/* ================= FORM ================= */}
                <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
                    <h2 className="text-2xl font-semibold mb-5">
                        {editId ? "Update Hotel" : "Add Hotel"}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* HOTEL NAME */}
                            <div>
                                <label className="block mb-2 font-medium">Hotel Name *</label>
                                <input
                                    type="text"
                                    name="hotelName"
                                    value={formData.hotelName}
                                    onChange={handleChange}
                                    placeholder="Type hotel..."
                                    required
                                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* CITY */}
                            <div>
                                <label className="block mb-2 font-medium">City *</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="Makkah / Madinah"
                                    required
                                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* RATING */}
                            <div>
                                <label className="block mb-2 font-medium">Rating (0-5)</label>
                                <input
                                    type="number"
                                    name="rating"
                                    value={formData.rating}
                                    onChange={handleChange}
                                    placeholder="5"
                                    min={0}
                                    max={5}
                                    step="0.1"
                                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* CONTACT NUMBER */}
                            <div>
                                <label className="block mb-2 font-medium">Contact Number</label>
                                <input
                                    type="text"
                                    name="contactNumber"
                                    value={formData.contactNumber || ""}
                                    onChange={handleChange}
                                    placeholder="+966XXXXXXXXX"
                                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* EMAIL */}
                            <div>
                                <label className="block mb-2 font-medium">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email || ""}
                                    onChange={handleChange}
                                    placeholder="hotel@example.com"
                                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* MAP URL */}
                            <div className="md:col-span-2">
                                <label className="block mb-2 font-medium">Map URL</label>
                                <input
                                    type="text"
                                    name="mapUrl"
                                    value={formData.mapUrl}
                                    onChange={handleChange}
                                    placeholder="https://maps.google.com/..."
                                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* DESCRIPTION */}
                            <div className="md:col-span-3">
                                <label className="block mb-2 font-medium">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description || ""}
                                    onChange={handleChange}
                                    placeholder="Hotel description, amenities, nearby attractions..."
                                    rows={3}
                                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* ACTIVE STATUS */}
                            <div>
                                <label className="block mb-2 font-medium">Status</label>
                                <select
                                    name="isActive"
                                    value={formData.isActive ? "true" : "false"}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "true" })}
                                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </div>

                        {/* ================= ROOM OPTIONS SECTION ================= */}
                        <div className="border-t pt-6 mt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold">Room Options</h3>
                                <button
                                    type="button"
                                    onClick={addRoomOption}
                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                    + Add Room Type
                                </button>
                            </div>

                            <div className="space-y-4">
                                {formData.roomOptions.map((room, index) => (
                                    <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-semibold text-lg">Room {index + 1}</h4>
                                            {formData.roomOptions.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeRoomOption(index)}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Room Name */}
                                            <div>
                                                <label className="block mb-1 text-sm font-medium">Room Type *</label>
                                                <input
                                                    type="text"
                                                    value={room.name}
                                                    onChange={(e) => handleRoomOptionChange(index, "name", e.target.value)}
                                                    placeholder="Standard / Deluxe / Suite"
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Selling Price */}
                                            <div>
                                                <label className="block mb-1 text-sm font-medium">Selling Price (PKR) *</label>
                                                <input
                                                    type="number"
                                                    value={room.sellingPricePerNight}
                                                    onChange={(e) => handleRoomOptionChange(index, "sellingPricePerNight", e.target.value)}
                                                    placeholder="15000"
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Buying Price */}
                                            <div>
                                                <label className="block mb-1 text-sm font-medium">Buying Price (PKR)</label>
                                                <input
                                                    type="number"
                                                    value={room.buyingPricePerNight}
                                                    onChange={(e) => handleRoomOptionChange(index, "buyingPricePerNight", e.target.value)}
                                                    placeholder="12000"
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Capacity */}
                                            <div>
                                                <label className="block mb-1 text-sm font-medium">Capacity (persons)</label>
                                                <input
                                                    type="number"
                                                    value={room.capacity}
                                                    onChange={(e) => handleRoomOptionChange(index, "capacity", e.target.value)}
                                                    placeholder="2"
                                                    min={1}
                                                    max={10}
                                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {formData.roomOptions.length === 0 && (
                                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-xl">
                                    No room options added. Click "Add Room Type" to continue.
                                </div>
                            )}
                        </div>

                        {/* BUTTONS */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition"
                            >
                                {loading ? "Please wait..." : (editId ? "Update Hotel" : "Add Hotel")}
                            </button>

                            {editId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditId(null);
                                        setFormData(initialState);
                                    }}
                                    className="bg-gray-300 hover:bg-gray-400 text-black px-6 py-3 rounded-xl font-medium transition"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* ================= TABLE ================= */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                    <div className="p-5 border-b">
                        <h2 className="text-2xl font-semibold">All Hotels</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="text-left p-4">Hotel</th>
                                    <th className="text-left p-4">City</th>
                                    <th className="text-left p-4">Rating</th>
                                    <th className="text-left p-4">Room Types</th>
                                    <th className="text-left p-4">Map</th>
                                    <th className="text-left p-4">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {hotels.length > 0 ? (
                                    hotels.map((hotel) => (
                                        <tr key={hotel._id} className="border-b hover:bg-gray-50">
                                            <td className="p-4 font-medium">{hotel.hotelName}</td>
                                            <td className="p-4">{hotel.city}</td>
                                            <td className="p-4">⭐ {hotel.rating}</td>
                                            <td className="p-4">
                                                {hotel.roomOptions && hotel.roomOptions.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {hotel.roomOptions.map((room, idx) => (
                                                            <div key={idx} className="text-sm">
                                                                <span className="font-medium">{room.name}</span>
                                                                <span className="text-gray-500 ml-2">
                                                                    {room.sellingPricePerNight?.toLocaleString()} PKR
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">No rooms</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {hotel.mapUrl ? (
                                                    <a href={hotel.mapUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                                                        Open Map
                                                    </a>
                                                ) : "-"}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleEdit(hotel)}
                                                        className="bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded-lg text-sm font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(hotel._id)}
                                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center p-10 text-gray-500">
                                            No hotels found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}