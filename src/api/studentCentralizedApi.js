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

export const getAllCentralizedStudents = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/registration-module/students", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch students. Please try again.");
  }
};

export const getCentralizedStudentById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/registration-module/students/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student details.");
  }
};

export const addCentralizedStudent = async (payload) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(payload));
    const response = await axiosInstance.post("/admin/registration-module/students", payload, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to create student.");
  }
};

export const updateCentralizedStudentById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(`/admin/registration-module/students/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update student information.");
  }
};


export const deleteCentralizedStudentById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/registration-module/students/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete students.");
  }
};

export const getStudentProfile = async () => {
  try {
    const response = await axiosInstance.get(`/student/registration-module/profile`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student profile details.");
  }
};
 
export const updateStudentPortalProfileById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(`/student/registration-module/profile`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update student information.");
  }
};

export const getAllSystemUsers = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/users", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch system users. Please try again.");
  }
};
