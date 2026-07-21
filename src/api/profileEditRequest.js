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

export const getAllEditRequests = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/registration-module/profile-update-requests", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch requests. Please try again.");
  }
};

export const getEditRequestById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/registration-module/profile-update-requests/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch edit request details.");
  }
};

export const approveEditRequest = async (id, status) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders({ status }));
    const response = await axiosInstance.post(`/admin/registration-module/profile-update-requests/${id}/approve`, { status }, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update edit request.");
  }
};

export const rejectEditRequest = async (id, status) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders({ status }));
    const response = await axiosInstance.post(`/admin/registration-module/profile-update-requests/${id}/reject`, { status }, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update edit request.");
  }
};

export const createEditRequest = async (payload) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(payload));
    const response = await axiosInstance.post("/student/registration-module/profile-update-requests", payload, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to create edit request.");
  }
};

export const getEditRequestStatus = async () => {
  try {
    const response = await axiosInstance.get(`/student/registration-module/profile-update-requests`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch edit request status.");
  }
};