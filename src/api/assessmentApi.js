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

export const addAssessmentQuestion = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/questions/assessment", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add assessment question. Please try again.");
  }
};

export const getAllAssessmentQuestions = async () => {
  try {
    const response = await axiosInstance.get("/questions/assessment", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessment questions. Please try again.");
  }
};

export const getAllPaginatedAssessmentQuestions = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/questions/assessment/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessment questions. Please try again.");
  }
};

export const getAssessmentQuestionById = async (id) => {
  try {
    const response = await axiosInstance.get(`/questions/assessment/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessment question details.");
  }
};

export const updateAssessmentQuestionById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(`/questions/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update assessment question information.");
  }
};

export const deleteAssessmentQuestionById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/questions/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete assessment question.");
  }
};

export const getAllPaginatedAssessment = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/assessment/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessments. Please try again.");
  }
};

export const addAssessment = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/assessment", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add assessment. Please try again.");
  }
};

export const getAssessmentDetailById = async (id, params = {}) => {
  try {
    const normalizedId = String(id ?? "").trim();
    if (!normalizedId) {
      throw new Error("Assessment id is required.");
    }

    const queryParams =
      params && typeof params === "object" && !Array.isArray(params)
        ? params
        : params === null || params === undefined || params === ""
          ? {}
          : { id: params };

    const response = await axiosInstance.get(`/assessment/${normalizedId}/results`, {
      headers: getAuthHeaders(),
      params: queryParams,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessment details.");
  }
};

export const getAssessmentById = async (id) => {
  try {
    const response = await axiosInstance.get(`/assessment/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessment details.");
  }
};


export const getAssessmentQuestions = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/assessment/questions", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessment questions. Please try again.");
  }
};

export const updateAssessmentById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(`/assessment/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update assessment information.");
  }
};

export const getAssessmentCatalog = async (params = {}) => {
  try {
    const response = await axiosInstance.get(`/assessment/catalog`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch details.");
  }
};

// student end
export const getActiveAssessments = async () => {
  try {
    const headers = getAuthHeaders();
    const response = await axiosInstance.get("/assessment/active", { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch active assessment. Please try again.");
  }
};

export const startAssessment = async (id) => {
  try {
    if (!id && id !== 0) throw new Error("Missing assessment id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(`/assessment/${id}/start`, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch active assessment. Please try again.");
  }
};

export const submitAssessmentAnswer = async (id, data) => {
  try {
    if (!id && id !== 0) throw new Error("Missing assessment id");
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/assessment/${id}/submit`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to submit assessment answers. Please try again.");
  }
};

export const assessmentResult = async (id) => {
  try {
    if (!id && id !== 0) throw new Error("Missing assessment id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(`/assessment/${id}/result`, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessment result. Please try again.");
  }
};

export const getStudentAssessmentResult = async (params = {}) => {
  try {
    const queryParams =
      params && typeof params === "object" && !Array.isArray(params)
        ? params
        : params === null || params === undefined || params === ""
          ? {}
          : { id: params };

    const headers = getAuthHeaders();
    const response = await axiosInstance.get(`/assessment/submitted`, {
      headers,
      params: queryParams,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessment result. Please try again.");
  }
};

export const deleteAssessmentById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/assessment/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete assessment.");
  }
};

export const getAllPastAssessments = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/assessment/past", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assessment questions. Please try again.");
  }
};

export const startPastAssessment = async (id) => {
  try {
    if (!id && id !== 0) throw new Error("Missing assessment id");
    const headers = getAuthHeaders();
    const response = await axiosInstance.get(`/assessment/${id}/practice/start`, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch past assessment. Please try again.");
  }
};

export const evaluatePastAssessmentAnswer = async (id, data) => {
  try {
    if (!id && id !== 0) throw new Error("Missing assessment id");
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/assessment/${id}/practice/evaluate`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to evaluate past assessment answer. Please try again.");
  }
};

export const submitPastAssessmentAnswer = async (id, data) => {
  try {
    if (!id && id !== 0) throw new Error("Missing assessment id");
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/assessment/${id}/practice/submit`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to submit assessment answers. Please try again.");
  }
};