import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axios";
import { toast } from "react-toastify";
import TopBar from "../../components/TopBar/TopBar";

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookingDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/bookings/${id}`);
      console.log(response);

      if (response.data.success) {
        // Handle both array and object responses
        const data = response.data.data;
        if (Array.isArray(data) && data.length > 0) {
          // If it's an array, take the first element
          setBooking(data[0]);
        } else if (Array.isArray(data) && data.length === 0) {
          setError("Booking not found");
        } else {
          // It's a single object
          setBooking(data);
        }
      } else {
        setError("Failed to load booking details");
      }
    } catch (err) {
      console.error("Error fetching booking:", err);
      setError("Failed to load booking details");
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      "on hold": "border border-yellow-200 bg-yellow-50 text-yellow-700",
      pending: "border border-yellow-200 bg-yellow-50 text-yellow-700",
      confirmed: "border border-green-200 bg-green-50 text-green-700",
      cancelled: "border border-red-200 bg-red-50 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getSourceBadge = (source) => {
    if (source === "travel-network") {
      return {
        label: "Travel Network",
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    }
    if (source === "al-haider") {
      return {
        label: "Al-Haider",
        className: "border-violet-200 bg-violet-50 text-violet-700",
      };
    }
    if (source === "skypass") {
      return {
        label: "SkyPass",
        className: "border-violet-200 bg-violet-50 text-violet-700",
      };
    }
    return {
      label: "Own",
      className: "border-slate-200 bg-slate-50 text-slate-600",
    };
  };

  const handleCancelBooking = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      const response = await axiosInstance.patch(`/bookings/${id}/cancel`);
      if (response.data.success) {
        toast.success("Booking cancelled successfully");
        setBooking({ ...booking, status: "cancelled" });
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error(error.response?.data?.message || "Failed to cancel booking");
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">
            {error || "Booking not found"}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getPassengerPrice = (type) => {
    if (type === "Adult") return booking.pricing?.adultPrice || 0;
    if (type === "Child") return booking.pricing?.childPrice || 0;
    if (type === "Infant") return booking.pricing?.infantPrice || 0;
    return 0;
  };

  const passengers = booking.passengers || [];
  const sourceBadge = getSourceBadge(booking.source);
  const adultDiscountSum = passengers
    .filter((p) => p.type === "Adult")
    .reduce((s, p) => s + (p.discount || 0), 0);
  const childDiscountSum = passengers
    .filter((p) => p.type === "Child")
    .reduce((s, p) => s + (p.discount || 0), 0);
  const infantDiscountSum = passengers
    .filter((p) => p.type === "Infant")
    .reduce((s, p) => s + (p.discount || 0), 0);
  const adjustedAdultTotal =
    (booking.pricing?.adultTotal || 0) - adultDiscountSum;
  const adjustedChildTotal =
    (booking.pricing?.childTotal || 0) - childDiscountSum;
  const adjustedInfantTotal =
    (booking.pricing?.infantTotal || 0) - infantDiscountSum;
  const adjustedGrandTotal =
    adjustedAdultTotal + adjustedChildTotal + adjustedInfantTotal;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar title={`Booking Details: ${booking.bookingReference}`} />
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        {/* <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Booking Details
            </h1>
            <p className="text-gray-600 mt-1">
              Reference:{" "}
              <span className="font-semibold text-blue-600">
                {booking.bookingReference}
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back
          </button>
        </div> */}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Booking Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Booking Status
                </h2>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}
                >
                  {booking?.status?.charAt(0)?.toUpperCase() +
                    booking?.status?.slice(1)}
                </span>
              </div>
              <p className="text-gray-600 mt-2 text-sm">
                Created: {formatDate(booking.createdAt)}
              </p>
            </div>

            {/* Booking Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Booking Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">
                    Contact Person
                  </label>
                  <p className="text-gray-900 font-medium">
                    {booking?.passengers?.[0]?.givenName +
                      " " +
                      booking?.passengers?.[0]?.surName || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Sector</label>
                  <p className="text-gray-900 font-medium">{booking.sector}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Airline</label>
                  <p className="text-gray-900 font-medium">
                    {booking.airline?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">PNR</label>
                  <p className="text-gray-900 font-medium">
                    {booking.pnr || "N/A"}
                  </p>
                </div>
                {/* <div>
                  <label className="text-sm text-gray-600">Source</label>
                  <p>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${sourceBadge.className}`}
                    >
                      {sourceBadge.label}
                    </span>
                  </p>
                </div> */}
                <div>
                  <label className="text-sm text-gray-600">
                    Departure Date
                  </label>
                  <p className="text-gray-900 font-medium">
                    {formatDate(booking.departureDate)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Arrival Date</label>
                  <p className="text-gray-900 font-medium">
                    {formatDate(booking.arrivalDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Passenger Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Passenger Breakdown
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {booking.adultsCount || "0"}
                  </p>
                  <p className="text-sm text-gray-600">Adults</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {booking.childrenCount || "0"}
                  </p>
                  <p className="text-sm text-gray-600">Children</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {booking.infantsCount || "0"}
                  </p>
                  <p className="text-sm text-gray-600">Infants</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-gray-700">
                  <span className="font-semibold">Total Passengers:</span>{" "}
                  {booking.totalPassengers}
                </p>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pricing Breakdown
              </h3>
              <div className="space-y-3">
                {["Adult", "Child", "Infant"].map((type) => {
                  const typePassengers = passengers.filter(
                    (p) => p.type === type,
                  );
                  if (typePassengers.length === 0) return null;
                  const colorClass =
                    type === "Adult"
                      ? "text-blue-600"
                      : type === "Child"
                        ? "text-green-600"
                        : "text-purple-600";
                  // Group passengers by their effective price
                  const groups = {};
                  typePassengers.forEach((p) => {
                    const ep = getPassengerPrice(type) - (p.discount || 0);
                    groups[ep] = (groups[ep] || 0) + 1;
                  });
                  return Object.entries(groups).map(([price, count], i) => (
                    <div
                      key={`${type}-${price}-${i}`}
                      className="flex justify-between items-center"
                    >
                      <span className="text-gray-700">
                        {type} Price (x{count})
                      </span>
                      <span className={`font-medium ${colorClass}`}>
                        PKR {(Number(price) * count).toLocaleString()}
                      </span>
                    </div>
                  ));
                })}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      Grand Total
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      PKR {adjustedGrandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Passenger List */}
            {booking.passengers && booking.passengers.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Passenger List
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Passport
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Passport Expiry
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          DOB
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Price (PKR)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                          Document
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {booking.passengers.map((passenger, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {`${passenger.title}.`} {passenger.givenName}{" "}
                            {passenger.surName}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                passenger.type === "Adult"
                                  ? "bg-blue-100 text-blue-800"
                                  : passenger.type === "Child"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {passenger.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {passenger.passport || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {passenger.passportExpiry
                              ? new Date(
                                  passenger.passportExpiry,
                                ).toLocaleDateString("en-GB")
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {passenger.dateOfBirth
                              ? new Date(
                                  passenger.dateOfBirth,
                                ).toLocaleDateString("en-GB")
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                            {(
                              getPassengerPrice(passenger.type) -
                              (passenger.discount || 0)
                            ).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {passenger.documentUrl ? (
                              passenger.documentUrl.match(
                                /\.(jpg|jpeg|png|webp)/i,
                              ) ? (
                                <a
                                  href={passenger.documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={passenger.documentUrl}
                                    alt="document"
                                    className="h-10 w-16 object-cover rounded border border-gray-300 hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={passenger.documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                  </svg>
                                  PDF
                                </a>
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Flight Details */}
            {booking.flights && booking.flights.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Flight Details
                </h3>
                <div className="space-y-4">
                  {booking.flights.map((flight, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <p className="font-semibold text-gray-900">
                        Flight {index + 1}: {flight.flightNo}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Origin:</span>{" "}
                          {flight.origin}
                        </div>
                        <div>
                          <span className="font-medium">Destination:</span>{" "}
                          {flight.destination}
                        </div>
                        <div>
                          <span className="font-medium">Departure:</span>{" "}
                          {formatDate(booking.departureDate)} {flight.depTime}
                        </div>
                        <div>
                          <span className="font-medium">Arrival:</span>{" "}
                          {formatDate(booking.arrivalDate)} {flight.arrTime}
                        </div>
                        <div>
                          <span className="font-medium">Baggage:</span>{" "}
                          {flight.baggage || "N/A"}
                        </div>
                        <div>
                          <span className="font-medium">Meal:</span>{" "}
                          {flight.meal || "N/A"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 sticky top-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Booking Summary
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="text-gray-600">Reference</label>
                  <p className="text-gray-900 font-medium">
                    {booking.bookingReference}
                  </p>
                </div>
                <div>
                  <label className="text-gray-600">Status</label>
                  <p
                    className={`font-medium px-3 py-1 rounded w-fit text-xs mt-1 ${getStatusColor(booking.status)}`}
                  >
                    {booking?.status?.charAt(0)?.toUpperCase() +
                      booking?.status?.slice(1)}
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-gray-600">Total Passengers</label>
                  <p className="text-2xl font-bold text-gray-900">
                    {booking.totalPassengers}
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-gray-600">Grand Total</label>
                  <p className="text-2xl font-bold text-blue-600">
                    PKR {adjustedGrandTotal.toLocaleString()}
                  </p>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-gray-600">Booked on</label>
                  <p className="text-gray-900">
                    {formatDate(booking.createdAt)}
                  </p>
                </div>
                {booking.sabaoonTransactionId && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="text-gray-600">Sabaoon Txn ID</label>
                    <p className="text-gray-900 font-medium text-sm">
                      {booking.sabaoonTransactionId}
                    </p>
                  </div>
                )}
                {booking.sabaoonBookingStatus &&
                  booking.sabaoonBookingStatus !== "not_applicable" && (
                    <div className="border-t border-gray-200 pt-4">
                      <label className="text-gray-600">Sabaoon Status</label>
                      <p
                        className={`mt-1 inline-block px-2 py-1 rounded text-xs font-semibold ${
                          booking.sabaoonBookingStatus === "success"
                            ? "bg-green-100 text-green-700"
                            : booking.sabaoonBookingStatus === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {booking.sabaoonBookingStatus.charAt(0).toUpperCase() +
                          booking.sabaoonBookingStatus.slice(1)}
                      </p>
                    </div>
                  )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-2">
              {(booking.status === "pending" ||
                booking.status === "on hold") && (
                <>
                  <button
                    onClick={() => navigate(`/dashboard/edit-booking/${id}`)}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Booking
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cancel Booking
                  </button>
                </>
              )}
              {booking.status === "cancelled" && (
                <div className="w-full text-center py-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium">
                    This booking has been cancelled
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
