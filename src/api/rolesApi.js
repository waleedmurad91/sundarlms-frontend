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

export const addRole = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/rbac/roles", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add role. Please try again.");
  }
};

export const getAllPaginatedRoles = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/rbac/roles", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch roles. Please try again.");
  }
};

export const getRoleById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/rbac/roles/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch role details.");
  }
};

export const updateRoleById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(
      `/admin/rbac/roles/${id}`,
      updatedData,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update information.");
  }
};

export const deleteRoleById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/rbac/roles/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete role.");
  }
};

export const getRolePermissions = async () => {
  try {
    const response = await axiosInstance.get(`/admin/rbac/permissions`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch role permissions.");
  }
};
