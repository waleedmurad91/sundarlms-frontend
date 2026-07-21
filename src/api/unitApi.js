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

export const addUnit = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/units", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add unit. Please try again.");
  }
};

export const getAllUnits = async () => {
  try {
    const response = await axiosInstance.get("/units", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch units. Please try again.");
  }
};

export const getAllPaginatedUnits = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/units/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch units. Please try again.");
  }
};

export const getUnitById = async (id) => {
  try {
    const response = await axiosInstance.get(`/units/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch unit details.");
  }
};

export const getUnitDetailById = async (id) => {
  try {
    const response = await axiosInstance.get(`/units/${id}/details`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch unit details.");
  }
};


export const updateUnitById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    
    const response = await axiosInstance.post(`/units/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update unit information.");
  }
};

export const swapOrderingUnitsById = async (updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    
    const response = await axiosInstance.post(`/units/swap-order`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update unit information.");
  }
};

export const deleteUnitById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/units/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete unit.");
  }
};
