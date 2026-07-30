import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const api = axios.create({
  baseURL: process.env.ZIP_ACCOUNTS_API_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = process.env.ZIP_ACCOUNTS_API_KEY;

    config.headers.Authorization = `Bearer ${token}`;
    config.headers.dbPrefix = process.env.dbPrefix;
    config.headers["Content-Type"] = "application/json";

    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
