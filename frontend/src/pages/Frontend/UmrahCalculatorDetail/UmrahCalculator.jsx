import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";

export default function UmrahCalculatorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookingDetail();
  }, [id]);

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/umrah-calculator/${id}`);
      console.log(response);

      if (response.data.success) {
        setBooking(response.data.data);
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

  const formatTime = (timeStr) => {
    return timeStr || "N/A";
  };

  // Calculate total cost from all components
  const calculateTotalCost = () => {
    let total = 0;

    // Add flight cost - Use saved groupTicketPricing if available (includes margin)
    if (booking.groupTicketPricing?.totalPrice) {
      total += booking.groupTicketPricing.totalPrice;
    } else if (booking.selectedGroup?.price?.sellingAdultPriceB2B) {
      // Fallback: calculate from base prices if groupTicketPricing not available
      const adultCount = booking.passengerCounts?.adults || 0;
      const childCount = booking.passengerCounts?.children || 0;
      const infantCount = booking.passengerCounts?.infants || 0;

      const adultFlightCost =
        booking.selectedGroup.price.sellingAdultPriceB2B * adultCount || 0;
      const childFlightCost =
        booking.selectedGroup.price.sellingChildPriceB2B * childCount || 0;
      const infantFlightCost =
        booking.selectedGroup.price.sellingInfantPriceB2B * infantCount || 0;

      total += adultFlightCost + childFlightCost + infantFlightCost;
    }

    // Add visa cost - Use saved totalVisaCost (includes margin)
    if (booking.visaDetails?.totalVisaCost) {
      total += booking.visaDetails.totalVisaCost;
    }

    // Add hotel cost - Use saved totalCost per room (includes margin)
    if (booking.hotelRooms && booking.hotelRooms.length > 0) {
      total += booking.hotelRooms.reduce(
        (sum, room) => sum + (room.totalCost || 0),
        0,
      );
    }

    // Add transport cost - Use saved buyingRate (includes margin)
    if (booking.transportList && booking.transportList.length > 0) {
      total += booking.transportList.reduce(
        (sum, t) => sum + (t.buyingRate || 0),
        0,
      );
    }

    return total;
  };

  const getStatusColor = (status) => {
    const colors = {
      "on hold": "border border-yellow-200 bg-yellow-50 text-yellow-700",
      pending: "border border-yellow-200 bg-yellow-50 text-yellow-700",
      confirmed: "border border-green-200 bg-green-50 text-green-700",
      cancelled: "border border-red-200 bg-red-50 text-red-700",
    };
    return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const getFullName = (passenger) => {
    if (!passenger) return "N/A";
    return `${passenger.title || ""} ${passenger.givenName || ""} ${passenger.surName || ""}`.trim();
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

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Umrah Package Booking Details
            </h1>
            <p className="text-gray-600">
              Voucher ID:{" "}
              <span className="font-semibold">{booking.voucher_id}</span>
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Detailed Info */}
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
                  {booking.status?.charAt(0).toUpperCase() +
                    booking.status?.slice(1) || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-sm text-gray-600">Created At</label>
                  <p className="text-gray-900 font-medium">
                    {formatDate(booking.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Updated At</label>
                  <p className="text-gray-900 font-medium">
                    {formatDate(booking.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Visa Details */}
            {booking.visaDetails && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Visa Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Adults</label>
                    <p className="text-gray-900 font-medium">
                      {booking.visaDetails.adults}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Children</label>
                    <p className="text-gray-900 font-medium">
                      {booking.visaDetails.children}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Infants</label>
                    <p className="text-gray-900 font-medium">
                      {booking.visaDetails.infants}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">
                      Adult Visa Price
                    </label>
                    <p className="text-gray-900 font-medium">
                      PKR{" "}
                      {booking.visaDetails.adultVisaSelling?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">
                      Total Visa Cost
                    </label>
                    <p className="font-medium text-blue-600">
                      PKR {booking.visaDetails.totalVisaCost?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Group Ticket Information */}
            {booking.selectedGroup && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Flight Information
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">
                        Voucher ID
                      </label>
                      <p className="text-gray-900 font-medium">
                        {booking.selectedGroup.voucher_id}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">
                        Group Booking ID
                      </label>
                      <p className="text-gray-900 font-medium">
                        {booking.selectedGroup.groupBookingId}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Sector</label>
                      <p className="text-gray-900 font-medium">
                        {booking.selectedGroup.sector}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Airline</label>
                      <p className="text-gray-900 font-medium">
                        {booking.selectedGroup.airline}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">PNR</label>
                      <p className="text-gray-900 font-medium">
                        {booking.selectedGroup.pnr}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">
                        Group Name
                      </label>
                      <p className="text-gray-900 font-medium">
                        {booking.selectedGroup.groupName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">
                        Total Seats
                      </label>
                      <p className="text-gray-900 font-medium">
                        {booking.selectedGroup.totalSeats}
                      </p>
                    </div>
                  </div>

                  {/* Flight Details */}
                  {booking.selectedGroup.flights &&
                    booking.selectedGroup.flights.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Flight Segments
                        </h4>
                        {booking.selectedGroup.flights.map((flight, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-4 mb-3"
                          >
                            <p className="font-semibold text-blue-600 mb-2">
                              Flight {index + 1}: {flight.flightNo}
                            </p>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">
                                  From:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {flight.sectorFrom} ({flight.fromTerminal})
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  To:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {flight.sectorTo} ({flight.toTerminal})
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Departure:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {formatDate(flight.depDate)}{" "}
                                  {formatTime(flight.depTime)}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Arrival:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {formatDate(flight.arrDate)}{" "}
                                  {formatTime(flight.arrTime)}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Class:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {flight.flightClass}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Baggage:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {flight.baggage} kg
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">
                                  Meal:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {flight.meal}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Contact Information */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Contact Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600">
                          Contact Person
                        </label>
                        <p className="text-gray-900 font-medium">
                          {booking.selectedGroup.user}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Phone</label>
                        <p className="text-gray-900 font-medium">
                          {booking.selectedGroup.contactPersonPhone}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Email</label>
                        <p className="text-gray-900 font-medium">
                          {booking.selectedGroup.contactPersonEmail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hotel Information */}
            {booking.hotelRooms && booking.hotelRooms.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Hotel Accommodation
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Room Type:{" "}
                  <span className="font-medium">{booking.roomType}</span>
                </p>
                {booking.hotelRooms.map((room, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 mb-3"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600">City</label>
                        <p className="text-gray-900 font-medium">{room.city}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Hotel</label>
                        <p className="text-gray-900 font-medium">
                          {room.hotel}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">
                          Room Type
                        </label>
                        <p className="text-gray-900 font-medium">{room.type}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Rooms</label>
                        <p className="text-gray-900 font-medium">
                          {room.rooms}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">
                          Check In
                        </label>
                        <p className="text-gray-900 font-medium">
                          {formatDate(room.startDate)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">
                          Check Out
                        </label>
                        <p className="text-gray-900 font-medium">
                          {formatDate(room.endDate)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">
                          Price per Room
                        </label>
                        <p className="text-gray-900 font-medium">
                          PKR {room.pricePerRoom?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">
                          Total Cost
                        </label>
                        <p className="font-medium text-blue-600">
                          PKR {room.totalCost?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Transport Information */}
            {booking.transportList && booking.transportList.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Transport Details
                </h3>
                {booking.transportList.map((transport, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600">Route</label>
                        <p className="text-gray-900 font-medium">
                          {transport.route}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">
                          Transport Type
                        </label>
                        <p className="text-gray-900 font-medium">
                          {transport.selectTransport}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">
                          Buying Rate
                        </label>
                        <p className="text-gray-900 font-medium">
                          PKR {transport.buyingRate?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Passenger Information */}
            {booking.passengerDetails &&
              booking.passengerDetails.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Passenger Details
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            DOB
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Passport No.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Passport Expiry
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Nationality
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {booking.passengerDetails.map((passenger, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {getFullName(passenger)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                              {formatDate(passenger.dateOfBirth)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {passenger.passport || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(passenger.passportExpiry)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {passenger.nationality || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 sticky top-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Booking Summary
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Reference</label>
                  <p className="text-lg font-semibold text-blue-600">
                    {booking.voucher_id}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Status</label>
                  <p
                    className={`mt-1 px-3 py-1 rounded-full text-sm font-semibold w-fit ${getStatusColor(booking.status)}`}
                  >
                    {booking.status?.charAt(0).toUpperCase() +
                      booking.status?.slice(1) || "N/A"}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm text-gray-600">
                    Passenger Count
                  </label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Adults:</span>
                      <span className="font-semibold">
                        {booking.passengerCounts?.adults || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Children:</span>
                      <span className="font-semibold">
                        {booking.passengerCounts?.children || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Infants:</span>
                      <span className="font-semibold">
                        {booking.passengerCounts?.infants || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-100">
                      <span>Total Passengers:</span>
                      <span className="font-semibold">
                        {(booking.passengerCounts?.adults || 0) +
                          (booking.passengerCounts?.children || 0) +
                          (booking.passengerCounts?.infants || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm text-gray-600">
                    Price Breakdown
                  </label>
                  <div className="mt-2 space-y-2">
                    {(booking.groupTicketPricing?.totalPrice ||
                      booking.selectedGroup?.price) && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Flight Total:</span>
                          <span>
                            PKR{" "}
                            {(
                              booking.groupTicketPricing?.totalPrice ||
                              (booking.passengerCounts?.adults || 0) *
                                (booking.selectedGroup?.price
                                  ?.sellingAdultPriceB2B || 0) +
                                (booking.passengerCounts?.children || 0) *
                                  (booking.selectedGroup?.price
                                    ?.sellingChildPriceB2B || 0) +
                                (booking.passengerCounts?.infants || 0) *
                                  (booking.selectedGroup?.price
                                    ?.sellingInfantPriceB2B || 0)
                            ).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    {booking.visaDetails && (
                      <div className="flex justify-between text-sm">
                        <span>Visa:</span>
                        <span>
                          PKR{" "}
                          {booking.visaDetails.totalVisaCost?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {booking.hotelRooms && booking.hotelRooms.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Hotel:</span>
                        <span>
                          PKR{" "}
                          {booking.hotelRooms
                            .reduce(
                              (sum, room) => sum + (room.totalCost || 0),
                              0,
                            )
                            .toLocaleString()}
                        </span>
                      </div>
                    )}
                    {booking.transportList &&
                      booking.transportList.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Transport:</span>
                          <span>
                            PKR{" "}
                            {booking.transportList
                              .reduce((sum, t) => sum + (t.buyingRate || 0), 0)
                              .toLocaleString()}
                          </span>
                        </div>
                      )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="font-medium">Total Price:</span>
                      <span className="text-lg font-bold text-blue-600">
                        PKR {calculateTotalCost().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm text-gray-600">Booked By</label>
                  <p className="font-medium">{booking.user?.name || "N/A"}</p>
                  <p className="text-sm text-gray-600">{booking.user?.email}</p>
                  <p className="text-sm text-gray-600">{booking.user?.phone}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Agency: {booking.user?.companyName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Agency Code: {booking.user?.agencyCode}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm text-gray-600">Booking Date</label>
                  <p className="font-medium">{formatDate(booking.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
