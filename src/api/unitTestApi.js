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

export const addUnitTest = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/unit-test", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to create unit test. Please try again.");
  }
};

export const getAllUnitTests = async () => {
  try {
    const response = await axiosInstance.get("/unit-test", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch unit test. Please try again.");
  }
};

export const getAllPaginatedUnitTests = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/unit-test/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch unit test. Please try again.");
  }
};

export const getUnitTestById = async (id) => {
  try {
    const response = await axiosInstance.get(`/unit-test/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch unit test details.");
  }
};

export const updateUnitTestById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/unit-test/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update unit test information.");
  }
};

export const deleteUnitTestById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/unit-test/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete unit test.");
  }
};
