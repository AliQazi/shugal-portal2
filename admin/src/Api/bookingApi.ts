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

export type TopAgentsRange = "all" | "month" | "30d" | "90d";

export interface AgentSalesBucket {
  bookings: number;
  pax: number;
  revenue: number;
}

export interface TopAgentRow {
  agentId: string;
  companyName: string;
  name: string;
  contactName: string;
  agencyCode: string;
  status: string;
  group: AgentSalesBucket;
  umrah: AgentSalesBucket;
  total: AgentSalesBucket;
}

// Top performing agents across Group Ticket + Umrah Package bookings
export const getTopAgentsReport = async (
  params: {
    range?: TopAgentsRange;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  } = {},
): Promise<{ success: boolean; data: TopAgentRow[] }> => {
  try {
    const response = await axiosInstance.get("/bookings/reports/top-agents", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching top agents report:", error);
    throw error;
  }
};

// Get XO Report data (confirmed Group Ticket bookings)
export const getXOReport = async (
  params: {
    fromDate?: string;
    toDate?: string;
    sector?: string;
    airline?: string;
    supplier?: string;
    search?: string;
  } = {},
) => {
  try {
    const response = await axiosInstance.get("/bookings/reports/xo", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching XO report:", error);
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
