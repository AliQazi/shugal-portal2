import axios from "axios";

const axiosInstance = axios.create({
  // baseURL: "http://localhost:8016/api", // backend ka port
  baseURL: "https://groups.tfctours.com/api", // backend ka port
  withCredentials: true,
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("frontend_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default axiosInstance;

// import axios from "axios";

// const getCookieValue = (name) => {
//   if (typeof document === "undefined") {
//     return null;
//   }

//   return (
//     document.cookie
//       .split("; ")
//       .find((row) => row.startsWith(`${name}=`))
//       ?.split("=")
//       .slice(1)
//       .join("=") || null
//   );
// };

// const axiosInstance = axios.create({
//   baseURL: "/api",
//   withCredentials: true,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// axiosInstance.interceptors.request.use(
//   (config) => {
//     const token =
//       localStorage.getItem("frontend_token") || getCookieValue("frontend_token");

//     if (token) {
//       config.headers.Authorization = `Bearer ${decodeURIComponent(token)}`;
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// axiosInstance.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const status = error.response?.status;

//     if (status === 401) {
//       const currentHost = window.location.hostname;

//       const isDashboardDomain =
//         currentHost === "Abid Airtravel.com" || currentHost === "www.Abid Airtravel.com";

//       if (isDashboardDomain && !window.location.pathname.startsWith("/")) {
//         window.location.href = "https://groups.tfctours.com/login";
//       }
//     }
//     return Promise.reject(error);
//   }
// );

// export default axiosInstance;
