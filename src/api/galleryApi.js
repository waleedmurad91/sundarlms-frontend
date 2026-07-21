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

export const addGallery = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/gallery", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add gallery. Please try again.");
  }
};


export const getAllPaginatedGallery= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/gallery", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch gallery. Please try again.");
  }
};

export const getGalleryById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/gallery/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch gallery details.");
  }
};

export const updateGalleryById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/gallery/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update information.");
  }
};

export const deleteGalleryById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/gallery/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete gallery.");
  }
};

// public

export const getRMCGallery = async () => {
  try {
    const response = await axiosInstance.get("/gallery/rmc");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch RMC gallery");
  }
};

export const getPMCGallery = async () => {
  try {
    const response = await axiosInstance.get("/gallery/pmc");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch PMC gallery");
  }
};