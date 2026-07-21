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

export const addBadge = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/badges", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add badges. Please try again.");
  }
};

export const getAllPaginatedBadges = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/badges", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch badges. Please try again.");
  }
};

export const getBadgeById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/badges/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch badge details.");
  }
};


export const updateBadgeById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders();
    
    const response = await axiosInstance.post(`/admin/badges/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update information.");
  }
};

export const deleteBadgeById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/badges/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete badge.");
  }
};

export const getBadgeSummary = async () => {
  try {
    const response = await axiosInstance.get(`/student/badges/summary`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch badge summary.");
  }
};

export const getBadgesShowcase = async () => {
  try {
    const response = await axiosInstance.get(`/student/badges/showcase`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch badge showcase.");
  }
};