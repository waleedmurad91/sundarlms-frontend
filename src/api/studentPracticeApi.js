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

export const getStudentUnitPracticeData = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.get("/student/practice", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to get data. Please try again.");
  }
};

export const getStudentUnitOverview = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.get(`/student/course-mastery/${id}`, data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to get data. Please try again.");
  }
};


