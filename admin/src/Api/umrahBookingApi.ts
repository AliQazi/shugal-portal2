import axiosInstance from "./axios";
import type { BookingPackageDetails, UmrahVoucherData } from "../utils/umrahVoucherPrint";

// Get all Umrah bookings (Admin only)
export const getAllBookingsAdmin = async (params = {}) => {
  try {
    // Add timestamp to prevent caching
    const response = await axiosInstance.get("/umrah-bookings/admin/all", {
      params: {
        ...params,
        _t: Date.now(), // Cache buster
      },
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching all bookings (admin):", error);
    throw error;
  }
};

// Get Umrah booking by ID
export const getUmrahBookingById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/umrah-bookings/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Umrah booking:", error);
    throw error;
  }
};

// Review payment status (Admin only)
export const reviewPayment = async (
  paymentId: string,
  data: FormData | object,
) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/payment/${paymentId}/review`,
      data,
      {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : {},
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error reviewing payment:", error);
    throw error;
  }
};

// Update payment status with optional file upload (DEPRECATED - use reviewPayment instead)
export const updatePaymentStatus = async (
  id: string,
  data: FormData | object,
) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/payment-status`,
      data,
      {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : {},
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

// Update visa status with optional file upload
export const updateVisaStatus = async (id: string, data: FormData | object) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/visa-status`,
      data,
      {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : {},
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating visa status:", error);
    throw error;
  }
};

// Update hotel status with optional file upload
export const updateHotelStatus = async (
  id: string,
  data: FormData | object,
) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/hotel-status`,
      data,
      {
        headers:
          data instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : {},
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating hotel status:", error);
    throw error;
  }
};

// Update voucher status
export const updateVoucherStatus = async (id: string, data: object) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/voucher-status`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating voucher status:", error);
    throw error;
  }
};

// Update overall status
export const updateOverallStatus = async (id: string, data: object) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/overall-status`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating overall status:", error);
    throw error;
  }
};

// Save passenger discounts
export const savePassengerDiscounts = async (
  id: string,
  passengers: { passport: string; discount?: number }[],
) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/savePassengerDiscounts`,
      {
        bookingId: id,
        passengers,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error saving passenger discounts:", error);
    throw error;
  }
};

// Extend/reset Umrah booking hold duration
export const extendUmrahBookingHold = async (
  id: string,
  data: { holdMinutes: number },
) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/extend-hold`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Error extending Umrah booking hold:", error);
    throw error;
  }
};

// Lock/unlock agent-side passenger detail editing
export const updatePassengersLock = async (id: string, locked: boolean) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/passengers-lock`,
      { locked },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating passengers lock:", error);
    throw error;
  }
};

// Update this booking's own copy of Flights / Hotels / Transport details
// (admin edit, scoped to this booking only - does not touch the shared package)
export const updateBookingPackageDetails = async (
  id: string,
  data: { flights?: any[]; hotels?: any[]; transports?: any[] },
) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/package-details`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating booking package details:", error);
    throw error;
  }
};

// Create or edit this booking's Umrah hotel voucher (admin edit, booking-scoped).
// packageDetails is the group ticket / flights / hotels / transport the voucher now has;
// the server writes it onto the booking too. Pricing and the shared package are never touched.
export const saveBookingVoucher = async (
  id: string,
  voucher: UmrahVoucherData,
  packageDetails: BookingPackageDetails,
) => {
  try {
    const response = await axiosInstance.put(`/umrah-bookings/${id}/voucher`, {
      voucher,
      packageDetails,
    });
    return response.data;
  } catch (error) {
    console.error("Error saving booking voucher:", error);
    throw error;
  }
};

// Lock / unlock the voucher for the booking's agent (locked = the agent can't see or print it)
export const updateVoucherLock = async (id: string, locked: boolean) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/voucher-lock`,
      { locked },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating voucher lock:", error);
    throw error;
  }
};

export type ShiftRoomType = "double" | "triple" | "quad";

export interface RoomTypeChangePreview {
  bookingNumber: string;
  currentRoomType: string;
  newRoomType: ShiftRoomType;
  passengerCount: number;
  current: { pricePerPerson: number; totalPrice: number; finalTotal: number };
  updated: {
    pricePerPerson: number;
    lines: { label: string; count: number; unit: number; total: number }[];
    subtotal: number;
    incentivePerPassenger: number;
    incentiveEligibleCount: number;
    totalIncentive: number;
    totalDiscount: number;
    totalPrice: number;
    finalTotal: number;
  };
  difference: number;
  payment: {
    paidAmount: number;
    currentTotalAmount: number;
    newTotalAmount: number;
    newRemainingAmount: number;
  };
}

// Preview what shifting a Sharing booking to Double/Triple/Quad would change
// (re-priced breakdown). Read-only - nothing is saved.
export const previewRoomTypeChange = async (
  id: string,
  roomType: ShiftRoomType,
) => {
  const response = await axiosInstance.get(
    `/umrah-bookings/${id}/room-type-change`,
    { params: { roomType } },
  );
  return response.data as { success: boolean; data: RoomTypeChangePreview };
};

// Shift a Sharing booking to Double/Triple/Quad (admin only, On Hold only).
// Re-prices the booking and updates the payment total.
export const changeBookingRoomType = async (
  id: string,
  roomType: ShiftRoomType,
) => {
  const response = await axiosInstance.patch(`/umrah-bookings/${id}/room-type`, {
    roomType,
  });
  return response.data;
};
