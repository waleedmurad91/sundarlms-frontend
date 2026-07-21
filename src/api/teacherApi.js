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

export const addTeacher = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/teachers", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add teacher. Please try again.");
  }
};

export const getAllTeachers = async () => {
  try {
    const response = await axiosInstance.get("/teachers", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch teachers. Please try again.");
  }
};

export const getAllPaginatedTeachers = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/teachers/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch teachers. Please try again.");
  }
};

export const getAllSchoolsTeachers = async (params = {}, id) => {
  try {
    const response = await axiosInstance.get(`/schools/user/${id}/teachers`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch teachers. Please try again.");
  }
};

export const getTeacherById = async (id) => {
  try {
    const response = await axiosInstance.get(`/teachers/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch teacher details.");
  }
};

export const getSpecificTeacherDetail = async (id) => {
  try {
    const response = await axiosInstance.get(`/teachers/${id}/details`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch school details.");
  }
};

export const updateTeacherById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/teachers/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update teacher information.");
  }
};

export const deleteTeacherById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/teachers/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete teachers.");
  }
};

export const linkTeacherToSchool = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/teacher/school/link-by-code", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to link teacher to school. Please try again.");
  }
};

export const unlinkTeacherFromSchool = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/teacher/school/unlink", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to unlink teacher from school. Please try again.");
  }
};