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

  return { "Content-Type": "application/json" };
};

const handleApiError = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || fallbackMessage;

  if (error instanceof Error) {
    error.message = message;
    throw error;
  }

  throw new Error(message);
};

export const addOrganization = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/organizations", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add organization. Please try again.");
  }
};


export const getAllPaginatedOrganizations= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/organizations", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch organizations. Please try again.");
  }
};

export const getOrganizationById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/organizations/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch organization details.");
  }
};

export const updateOrganizationById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/organizations/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update organization information.");
  }
};

export const deleteOrganizationById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/organizations/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete organization.");
  }
};

export const getAllOrganizationSchools = async () => {
  try {
    const response = await axiosInstance.get("/organization/schools", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch schools. Please try again.");
  }
};