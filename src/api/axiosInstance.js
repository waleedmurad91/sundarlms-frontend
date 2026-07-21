// src/api/axiosInstance.js
import axios from "axios";

const API_ROOT = import.meta.env.VITE_API_URL || "https://phplaravel-1473159-6045375.cloudwaysapps.com";

const axiosInstance = axios.create({
  baseURL: `${API_ROOT}/api`,
  timeout: 30000,
  headers: {
    "X-Requested-With": "XMLHttpRequest"
  }
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized! Redirecting to login...");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
