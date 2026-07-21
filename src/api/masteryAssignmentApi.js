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

export const getAssignmentData = async (id) => {
  try {
    const response = await axiosInstance.get(`/teacher/user/${id}/teaching-data`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch assignment data. Please try again.");
  }
};

export const addAssignment = async (data,id) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/teacher/${id}/assignments`, data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add subject. Please try again.");
  }
};

export const getAllAssignments = async (id) => {
  try {
    const response = await axiosInstance.get(`/teacher/${id}/assignments`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subjects. Please try again.");
  }
};

export const getAssignmentById = async (assignmentid) => {
  try {
    const response = await axiosInstance.get(`/teacher/assignment/${assignmentid}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subject details.");
  }
};

export const updateAssignmentById = async (assignmentid, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/teacher/assignment/${assignmentid}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update subject information.");
  }
};

export const getAssignmentScore = async (id) => {
  try {
    const response = await axiosInstance.get(`/teacher/user/${id}/assignment-scores`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subject details.");
  }
};


export const getMasteryProgress = async (id) => {
  try {
    const response = await axiosInstance.get(`/teacher/user/${id}/mastery-progress`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch subject details.");
  }
};

export const getActivityOverview = async (id) => {
  try {
    const response = await axiosInstance.get(`/teacher/user/${id}/activity-overview`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch activity overview.");
  }
};