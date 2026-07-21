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

export const getQuestionPlayerData = async (id, language = "en") => {
  try {
    if (!id && id !== 0) throw new Error("Missing practice id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(`/topic/${id}/details/practice`, {
      headers,
      params: { language },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load practice data. Please try again.");
  }
};

export const getQuestionPlayerChallengeData = async (id, language = "en") => {
  try {
    if (!id && id !== 0) throw new Error("Missing practice id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(`/topic/${id}/details/challenge`, {
      headers,
      params: { language },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load challenge data. Please try again.");
  }
};

export const addPracticeResults = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/challenge/${id}/submit`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load practice data. Please try again.");
  }
};

export const restartPractice = async (topicId) => {
  try {
    const headers = getAuthHeaders();
    const response = await axiosInstance.post(
      `/student/practice/${topicId}/restart`,
      {},
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to restart practice. Please try again.");
  }
};

export const addSinglePractice = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/student/practice/${id}/answer`,
      data,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load practice data. Please try again.");
  }
};

export const addSingleChallenge = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/student/challenge/${id}/answer`,
      data,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load challenge data. Please try again.");
  }
};

export const startPracticeSession = async (id) => {
  try {
    if (!id && id !== 0) throw new Error("Missing practice id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(
      `/student/practice/${id}/start`,
      {},
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(
      error,
      "Failed to start practice session. Please try again.",
    );
  }
};

export const startChallengeSession = async (id) => {
  try {
    if (!id && id !== 0) throw new Error("Missing practice id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(
      `/student/challenge/${id}/start`,
      {},
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(
      error,
      "Failed to start practice session. Please try again.",
    );
  }
};

export const restartChallenge = async (topicId) => {
  try {
    const headers = getAuthHeaders();
    const response = await axiosInstance.post(
      `/student/challenge/${topicId}/restart`,
      {},
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to restart challenge. Please try again.");
  }
};

export const getQuestionPlayerDataQuizData = async (id) => {
  try {
    if (!id && id !== 0) throw new Error("Missing quiz id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(`/quiz/${id}/start`, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load quiz data. Please try again.");
  }
};

export const addQuizResults = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/quiz/${id}/submit`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load quiz data. Please try again.");
  }
};

export const getQuestionPlayerDataUnitTestData = async (id) => {
  try {
    if (!id && id !== 0) throw new Error("Missing unit test id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(`/unit-test/${id}/start`, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load unit test. Please try again.");
  }
};

export const addUnitTestResults = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/unit-test/${id}/submit`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to submit unit test. Please try again.");
  }
};

export const getQuestionPlayerDataAssignmentData = async (id) => {
  try {
    if (!id && id !== 0) throw new Error("Missing assignment id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(
      `/student/assignment/${id}/start`,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load assignment. Please try again.");
  }
};

export const addAssignmentResults = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/student/assignment/${id}/submit`,
      data,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to submit assignment. Please try again.");
  }
};
