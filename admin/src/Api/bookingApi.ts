import axiosInstance from "./axios";

// Get all bookings with filters
export const getAllBookings = async (
  params: {
    page?: number;
    limit?: number;
    status?: string;
    sector?: string;
    airline?: string;
    fromDate?: string;
    search?: string;
  } = {},
) => {
  try {
    const response = await axiosInstance.get("/bookings", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }
};

// Get recent bookings for dashboard
export const getRecentBookings = async (limit: number = 5) => {
  try {
    const response = await axiosInstance.get("/bookings", {
      params: { limit, page: 1 },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching recent bookings:", error);
    throw error;
  }
};

// Get booking by ID
export const getBookingById = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/bookings/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching booking:", error);
    throw error;
  }
};

// Get booking by reference
export const getBookingByReference = async (reference: string) => {
  try {
    const response = await axiosInstance.get(
      `/bookings/reference/${reference}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching booking by reference:", error);
    throw error;
  }
};
