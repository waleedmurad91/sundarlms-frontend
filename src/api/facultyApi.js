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

export const getAllPaginatedFaculty = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/faculty", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch faculty. Please try again.");
  }
};

export const getFacultyById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/faculty/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch faculty details.");
  }
};

export const addFaculty = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/faculty", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add faculty. Please try again.");
  }
};

export const updateFacultyById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));

    // PHP/Laravel does not parse multipart/form-data on PUT requests, so when
    // sending FormData we POST with method spoofing (_method=PUT) instead.
    if (updatedData instanceof FormData) {
      updatedData.append("_method", "PUT");
      const response = await axiosInstance.post(
        `/admin/faculty/${id}`,
        updatedData,
        { headers },
      );
      return response.data;
    }

    const response = await axiosInstance.put(
      `/admin/faculty/${id}`,
      updatedData,
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update faculty information.");
  }
};

export const deleteFacultyById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/faculty/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete faculty.");
  }
};
