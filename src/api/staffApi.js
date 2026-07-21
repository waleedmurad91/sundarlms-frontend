import axiosInstance from "./axiosInstance";

const getAuthHeaders = (overrides = {}) => {
  const token = sessionStorage.getItem("auth_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...overrides,
  };
};

const resolveContentHeaders = (payload) => {
  if (payload instanceof FormData) {
    return {};
  }

  return { "Content-Type": "multipart/form-data" };
};

const handleApiError = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || fallbackMessage;

  if (error instanceof Error) {
    error.message = message;
    throw error;
  }

  throw new Error(message);
};

export const addStaff = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/users", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add staff. Please try again.");
  }
};

export const getStatistics = async () => {
  try {
    const response = await axiosInstance.get("/admin/users/statistics", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch statistics. Please try again.");
  }
};

export const getAllPaginatedStaff = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/users/question-staff", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch staff. Please try again.");
  }
};

export const getStaffById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/users/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch staff details.");
  }
};

export const getSpecificSchoolDetail = async (id) => {
  try {
    const response = await axiosInstance.get(`/schools/${id}/details`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch school details.");
  }
};

export const updateStaffById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders();
    
    const response = await axiosInstance.post(`/admin/users/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update information.");
  }
};

export const deleteStaffById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/users/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete staff.");
  }
};

export const getAllSystemRoles = async () => {
  try {
    const response = await axiosInstance.get("/admin/rbac/roles-dropdown", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch roles. Please try again.");
  }
};