import axiosInstance from "./axios";

// Create a new booking
export const createBooking = async (bookingData) => {
  try {
    const response = await axiosInstance.post("/booking/create", bookingData);
    return response.data;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

// Get all bookings
export const getAllBookings = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/booking/all", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }
};

// Get booking by ID
export const getBookingById = async (id) => {
  try {
    const response = await axiosInstance.get(`/booking/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching booking:", error);
    throw error;
  }
};

// Get user bookings
export const getUserBookings = async (userId) => {
  try {
    const response = await axiosInstance.get(`/booking/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    throw error;
  }
};

// Update booking status
export const updateBookingStatus = async (id, statusData) => {
  try {
    const response = await axiosInstance.put(
      `/booking/status/${id}`,
      statusData,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

// Delete booking
export const deleteBooking = async (id) => {
  try {
    const response = await axiosInstance.delete(`/booking/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting booking:", error);
    throw error;
  }
};

// Get booking statistics
export const getBookingStatistics = async (userId = null) => {
  try {
    const params = userId ? { userId } : {};
    const response = await axiosInstance.get("/booking/statistics", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching booking statistics:", error);
    throw error;
  }
};
