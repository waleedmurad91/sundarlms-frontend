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
    // Let the browser/axios set the boundary; forcing this header breaks parsing
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

export const addQuestion = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/questions", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add question. Please try again.");
  }
};

export const getAllQuestions = async () => {
  try {
    const response = await axiosInstance.get("/questions", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch questions. Please try again.");
  }
};

export const getAllPaginatedQuestions = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/questions/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch questions. Please try again.");
  }
};

export const swapOrderingQuestionsById = async (updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));

    const response = await axiosInstance.post(`/questions/swap-order`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update unit information.");
  }
};

export const getAllPaginatedQuestionsDataEntry = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/questions/data-entry", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch questions. Please try again.");
  }
};

export const getAllPaginatedQuestionsReviewer = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/question-review/pending", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch questions. Please try again.");
  }
};
export const getAllPaginatedQuestionsTranslator = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/translator/questions", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch questions. Please try again.");
  }
};
export const getQuestionHistory = async (id) => {
  try {
    const headers = getAuthHeaders();
    try {
      const response = await axiosInstance.get(`/admin/questions/history/${id}`, {
        headers,
      });
      return response.data;
    } catch (primaryError) {
      // Fallback for roles/endpoints that don't use the admin prefix
      const response = await axiosInstance.get(`/questions/history/${id}`, {
        headers,
      });
      return response.data;
    }
  } catch (error) {
    handleApiError(error, "Failed to fetch history. Please try again.");
  }
};

export const updateQuestionStatus = async (id, status) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(status));
    const response = await axiosInstance.post(`/question-review/${id}/update-status`, status, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update question status.");
  }
};

export const getQuestionById = async (id) => {
  try {
    const response = await axiosInstance.get(`/questions/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch question details.");
  }
};

export const updateQuestionById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(`/questions/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update question information.");
  }
};

export const deleteQuestionById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/questions/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete question.");
  }
};

export const submitTranslatorQuestion = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/translator/questions/${id}/submit`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Please check your internet connection and try again.");
  }
};

// NEW: Review translation submission
export const reviewQuestionTranslation = async (translationId, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/question-translations/${translationId}/review`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to review translation.");
  }
};
