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

export const addNews = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/news", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add news. Please try again.");
  }
};


export const getAllPaginatedNews= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/news", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch news. Please try again.");
  }
};

export const getNewsById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/news/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch news details.");
  }
};

export const updateNewsById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));

    // PHP/Laravel does not parse multipart/form-data on PUT requests, so when
    // sending FormData we POST with method spoofing (_method=PUT) instead.
    if (updatedData instanceof FormData) {
      updatedData.append("_method", "POST");
      const response = await axiosInstance.post(
        `/admin/news/${id}`,
        updatedData,
        { headers },
      );
      return response.data;
    }

    const response = await axiosInstance.post(`/admin/news/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update information.");
  }
};

export const deleteNewsById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/news/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete news.");
  }
};


// public
export const getNewsByCategory = async (category) => {
  try {
    const response = await axiosInstance.get("/public/news", { params: { category } });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch news by category");
  }
};
export const getHomepageNews = async (category) => {
  try {
    const response = await axiosInstance.get("/public/news-highlights");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch news");
  }
};