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


export const getFeedbackSurveys= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/ilm-feedback-surveys", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch feedback surveys. Please try again.");
  }
};

export const getFeedbackSurveyById = async (id) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(id));
    const response = await axiosInstance.get(`/admin/ilm-feedback-surveys/${id}`, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch feedback survey. Please try again.");
  }
};
