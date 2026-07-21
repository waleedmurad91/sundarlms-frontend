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

export const getDashboardData = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.get("/student/dashboard", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add student. Please try again.");
  }
};

export const getStudentStatsData = async (id) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(id));
    const response = await axiosInstance.get(`/student/${id}/stats`, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add student. Please try again.");
  }
};

export const getStudentTeacherData = async (id) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(id));
    const response = await axiosInstance.get(`/student/${id}/teachers`, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load teacher. Please try again.");
  }
};

export const ilmFeedbackSurvey = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/ilm-feedback-surveys", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to submit feedback. Please try again.");
  }
};