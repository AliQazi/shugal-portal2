import axiosInstance from "./axios";

// Create a new Umrah booking
export const createUmrahBooking = async (bookingData) => {
  try {
    const response = await axiosInstance.post("/umrah-bookings", bookingData);
    return response.data;
  } catch (error) {
    console.error("Error creating Umrah booking:", error);
    throw error;
  }
};

// Get all Umrah bookings
export const getAllUmrahBookings = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/umrah-bookings", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching Umrah bookings:", error);
    throw error;
  }
};

// Get my bookings (logged in user)
export const getMyBookings = async () => {
  try {
    const response = await axiosInstance.get("/umrah-bookings/my-bookings");
    return response.data;
  } catch (error) {
    console.error("Error fetching my bookings:", error);
    throw error;
  }
};

// Get all bookings (admin only)
export const getAllBookingsAdmin = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/umrah-bookings/admin/all", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching all bookings (admin):", error);
    throw error;
  }
};

// Get Umrah booking by ID
export const getUmrahBookingById = async (id) => {
  try {
    const response = await axiosInstance.get(`/umrah-bookings/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching Umrah booking:", error);
    throw error;
  }
};

// Update Umrah booking
export const updateUmrahBooking = async (id, bookingData) => {
  try {
    const response = await axiosInstance.put(
      `/umrah-bookings/${id}`,
      bookingData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating Umrah booking:", error);
    throw error;
  }
};

// Delete Umrah booking
export const deleteUmrahBooking = async (id) => {
  try {
    const response = await axiosInstance.delete(`/umrah-bookings/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting Umrah booking:", error);
    throw error;
  }
};

// Submit payment (User/Agent)
export const submitPayment = async (id, paymentData) => {
  try {
    const response = await axiosInstance.post(
      `/umrah-bookings/${id}/submit-payment`,
      paymentData,
      {
        headers:
          paymentData instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : {},
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error submitting payment:", error);
    throw error;
  }
};

// Update payment status
export const updatePaymentStatus = async (id, paymentData) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/payment-status`,
      paymentData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

// Update visa status
export const updateVisaStatus = async (id, visaData) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/visa-status`,
      visaData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating visa status:", error);
    throw error;
  }
};

// Update hotel status
export const updateHotelStatus = async (id, hotelData) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/hotel-status`,
      hotelData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating hotel status:", error);
    throw error;
  }
};

// Update voucher status
export const updateVoucherStatus = async (id, voucherData) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/voucher-status`,
      voucherData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating voucher status:", error);
    throw error;
  }
};

// Update overall status
export const updateOverallStatus = async (id, statusData) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/overall-status`,
      statusData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating overall status:", error);
    throw error;
  }
};

// Extend/reset Umrah booking hold duration
export const extendUmrahBookingHold = async (id, holdData) => {
  try {
    const response = await axiosInstance.patch(
      `/umrah-bookings/${id}/extend-hold`,
      holdData,
    );
    return response.data;
  } catch (error) {
    console.error("Error extending Umrah booking hold:", error);
    throw error;
  }
};
