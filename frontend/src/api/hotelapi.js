import axiosInstance from "./axios";

export const hotelApi = {
  // Get all hotels
  getHotels: async (params = {}) => {
    try {
      const response = await axiosInstance.get("/hotels/all", {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get single hotel by ID
  getHotelById: async (id) => {
    try {
      const response = await axiosInstance.get(`/hotels/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create hotel
  createHotel: async (data) => {
    try {
      const response = await axiosInstance.post("/hotels/create", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update hotel
  updateHotel: async (id, data) => {
    try {
      const response = await axiosInstance.put(`/hotels/update/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete hotel
  deleteHotel: async (id) => {
    try {
      const response = await axiosInstance.delete(`/hotels/delete/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default hotelApi;
