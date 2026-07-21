// src/api/authApi.js
import toast from "react-hot-toast";
import axiosInstance from "./axiosInstance";

const getAuthHeaders = (overrides = {}) => {
  const token =
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...overrides,
  };
};

const resolveContentHeaders = (payload) => {
  if (payload instanceof FormData) {
    return { "Content-Type": "multipart/form-data" };
  }
  return {};
};

const handleApiError = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || fallbackMessage;

  if (error instanceof Error) {
    error.message = message;
    throw error;
  }

  throw new Error(message);
};

export const loginApi = async (credentials) => {
  try {
    const response = await axiosInstance.post("/login", credentials);
    return response.data;
  } catch (error) {
    handleApiError(error, "Login failed. Please try again.");
  }
};

export const getDistricts = async () => {
  try {
    const response = await axiosInstance.get("/districts");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch districts. Please try again.");
  }
};

export const getCitiesByDistrict = async (districtId) => {
  try {
    const response = await axiosInstance.get(`/districts/${districtId}/cities`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch cities. Please try again.");
  }
};

export const getLocationProvinces = async () => {
  try {
    const response = await axiosInstance.get("/locations/provinces");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch provinces. Please try again.");
  }
};

export const getLocationDistricts = async (provinceId) => {
  try {
    const response = await axiosInstance.get("/locations/districts", {
      params: provinceId ? { province_id: provinceId } : {},
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch districts. Please try again.");
  }
};

export const getLocationTehsils = async (districtId) => {
  try {
    const response = await axiosInstance.get("/locations/tehsils", {
      params: districtId ? { district_id: districtId } : {},
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch tehsils. Please try again.");
  }
};

export const getLocationCities = async (districtId) => {
  try {
    const response = await axiosInstance.get("/locations/cities", {
      params: districtId ? { district_id: districtId } : {},
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch cities. Please try again.");
  }
};

export const getLocationCitiesByTehsil = async (tehsilId) => {
  try {
    const response = await axiosInstance.get("/locations/cities", {
      params: tehsilId ? { tehsil_id: tehsilId } : {},
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch cities. Please try again.");
  }
};

export const getLocationClusterAreas = async (cityId) => {
  try {
    const response = await axiosInstance.get("/locations/cluster-areas", {
      params: cityId ? { city_id: cityId } : {},
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch cluster areas. Please try again.");
  }
};


export const logoutApi = async (token) => {
  try {
    const response = await axiosInstance.post("/logout", null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    toast.success(response.data?.message || "Logged out successfully!");
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Something went wrong. Please try again.";
    toast.error(message);
    throw error;
  }
}

export const getRoleBasedNavigation = async () => {
  try {
    const response = await axiosInstance.get("/me/navigation", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch navigation. Please try again.");
  }
};

export const getAllNotifications = async () => {
  try {
    const response = await axiosInstance.get("/notifications", {
      headers: getAuthHeaders(),
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch notifications. Please try again.");
  }
};


export const readSingleNotification = async (id) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(id));
    const response = await axiosInstance.post(`/notifications/${id}/read`, null, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to mark notification as read. Please try again.");
  }
};

export const readAllNotifications = async () => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(null));
    const response = await axiosInstance.post(`/notifications/read-all`, null, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to mark all notifications as read. Please try again.");
  }
};

export const forgotPasswordCheckIdentity = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/forgot-password/identify`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to identify user. Please try again.");
  }
};

export const forgotPasswordReset = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/forgot-password/reset`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to reset password. Please try again.");
  }
};

export const forgotPasswordStudentVerification = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/forgot-password/student-verify`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to verify student identity. Please try again.");
  }
};

export const forgotPasswordSchoolVerification = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/forgot-password/school-verify`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to verify school identity. Please try again.");
  }
};

export const createSchoolAccountApi = async (credentials) => {
  try {
    const headers = resolveContentHeaders(credentials);
    const response = await axiosInstance.post(
      "/school-registration-module",
      credentials,
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Account creation failed. Please try again.");
  }
};

export const createStudentAccountApi = async (credentials) => {
  try {
    const response = await axiosInstance.post("/registration-module/students", credentials);
    return response.data;
  } catch (error) {
    handleApiError(error, "Account creation failed. Please try again.");
  }
};

export const getPMCActiveSession = async (dob) => {
  try {
    const response = await axiosInstance.get("/registration-module/pmc-sessions", {
      params: dob ? { dob } : {},
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch pmc active session. Please try again.");
  }
};

export const getRMCActiveSession = async () => {
  try {
    const response = await axiosInstance.get("/registration-module/rmc-sessions");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch rmc active session. Please try again.");
  }
};

export const getRMCVenues = async (city) => {
  try {
    const response = await axiosInstance.get("/registration-module/rmc-venues", {
      params: city ? { city } : {},
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch rmc venues. Please try again.");
  }
};


export const getRMCSessionGrades = async () => {
  try {
    const response = await axiosInstance.get("/admin/rmc-sessions/grades");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch rmc session grades. Please try again.");
  }
};

export const getSchoolsAndData = async (params) => {
  try {
    const response = await axiosInstance.get("/registration-module/schools", {
      params: params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Please check your internet connection and try again.");
  }
};

export const checkUsername = async (username) => {
  try {
    const response = await axiosInstance.get(`/public/usernames/check?username=${username}`)
    return response.data;
  } catch (error) {
    handleApiError(error, "Please check your internet connection and try again.");
  }
};

export const checkEmail = async (email) => {
  try {
    const response = await axiosInstance.get(`/public/emails/check?email=${email}`)
    return response.data;
  } catch (error) {
    handleApiError(error, "Please check your internet connection and try again.");
  }
};

export const getStudentGrades = async () => {
  try {
    const response = await axiosInstance.get("/registration-module/grades");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch grades. Please try again.");
  }
};

export const callAccessMode = async (mode) => {
  try {
    const response = await axiosInstance.post("/me/access-mode", { access_mode: mode });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to access mode. Please try again.");
  }
};
export const forgotPasswordStudentEmailVerification = (payload) =>
  axiosInstance.post("/forgot-password/student-email-verify", payload)
    .then((res) => res.data);