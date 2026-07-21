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

export const addTopic = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/topics", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add topic. Please try again.");
  }
};

export const getAllTopics = async () => {
  try {
    const response = await axiosInstance.get("/topics", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch topics. Please try again.");
  }
};

export const getAllPaginatedTopics = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/topics/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch topics. Please try again.");
  }
};

export const swapOrderingTopicsById = async (updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    
    const response = await axiosInstance.post(`/topics/swap-order`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update unit information.");
  }
};

export const getTopicById = async (id) => {
  try {
    const response = await axiosInstance.get(`/topics/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch topic details.");
  }
};

export const getTopicDetailById = async (id) => {
  try {
    const response = await axiosInstance.get(`/topics/${id}/details`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subject details.");
  }
};

export const updateTopicById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(`/topics/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update topic information.");
  }
};

export const deleteTopicById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/topics/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete topic.");
  }
};
