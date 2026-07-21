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

export const addSubject = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/subjects", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add subject. Please try again.");
  }
};

export const getAllSubjects = async () => {
  try {
    const response = await axiosInstance.get("/subjects", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subjects. Please try again.");
  }
};

export const getAllPaginatedSubjects = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/subjects/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subjects. Please try again.");
  }
};

export const getSubjectById = async (id) => {
  try {
    const response = await axiosInstance.get(`/subjects/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subject details.");
  }
};

export const getSubjectDetailById = async (id) => {
  try {
    const response = await axiosInstance.get(`/subjects/${id}/overview`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subject details.");
  }
};

export const updateSubjectById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(`/subjects/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update subject information.");
  }
};

export const deleteSubjectById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/subjects/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete subject.");
  }
};

export const swapOrderingSubjectsById = async ({ first_subject_id, second_subject_id }) => {
  try {
    const response = await axiosInstance.post(
      "/subjects/swap-order",
      { first_subject_id, second_subject_id },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update subject order. Please try again.");
  }
};

export const getSubjectsByGradeId = async (gradeId) => {
  try {
    const response = await axiosInstance.get("/subjects/paginated", {
      headers: getAuthHeaders(),
      params: { grade_id: gradeId },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subjects for this grade.");
  }
};