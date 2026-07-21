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

export const addQuiz = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/quiz/generate", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to generate quiz. Please try again.");
  }
};

export const getAllQuizes = async () => {
  try {
    const response = await axiosInstance.get("/quiz", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch quizes. Please try again.");
  }
};

export const getAllPaginatedQuizes = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/quiz/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch quizes. Please try again.");
  }
};

export const getQuizById = async (id) => {
  try {
    const response = await axiosInstance.get(`/quiz/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch quiz details.");
  }
};

export const updateQuizById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/quiz/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update quiz information.");
  }
};

export const deleteQuizById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/quiz/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete quiz.");
  }
};
