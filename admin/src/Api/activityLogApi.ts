import axiosInstance from "./axios";

export interface ActivityLog {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    companyName?: string;
  } | null;
  date: string;
  type: string;
  refModel?: string;
  refId?: string;
  description: string;
  createdAt: string;
}

export interface LogsResponse {
  success: boolean;
  data: ActivityLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalLogs: number;
  };
}

export interface LogFilters {
  type?: string;
  userId?: string;
  userSearch?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const fetchLogs = async (filters: LogFilters = {}): Promise<LogsResponse> => {
  const params = new URLSearchParams();
  if (filters.type) params.append("type", filters.type);
  if (filters.userId) params.append("userId", filters.userId);
  if (filters.userSearch) params.append("userSearch", filters.userSearch);
  if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.append("dateTo", filters.dateTo);
  if (filters.search) params.append("search", filters.search);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));

  const res = await axiosInstance.get(`/activity-logs?${params.toString()}`);
  return res.data;
};

export const fetchLogTypes = async (): Promise<string[]> => {
  const res = await axiosInstance.get("/activity-logs/types");
  return res.data.data;
};

export const fetchLogsByUser = async (userId: string, page = 1, limit = 20): Promise<LogsResponse> => {
  const res = await axiosInstance.get(`/activity-logs/user/${userId}?page=${page}&limit=${limit}`);
  return res.data;
};

export interface LogUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  companyName?: string;
}

export const fetchLogUsers = async (): Promise<LogUser[]> => {
  const res = await axiosInstance.get("/activity-logs/users");
  return res.data.data;
};
