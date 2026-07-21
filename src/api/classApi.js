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

export const addClass = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/classes", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add class. Please try again.");
  }
};

export const getAllClasses = async () => {
  try {
    const response = await axiosInstance.get("/classes", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch classes. Please try again.");
  }
};

export const getAllPaginatedClasses = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/classes/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch classes. Please try again.");
  }
};

export const getAllPaginatedSchoolsClasses = async (params = {}, id) => {
  try {
    const response = await axiosInstance.get(`/classes/user/${id}`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch classes. Please try again.");
  }
};

export const getClassById = async (id) => {
  try {
    const response = await axiosInstance.get(`/classes/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch class details.");
  }
};

export const getSpecificClassDetail = async (id) => {
  try {
    const response = await axiosInstance.get(`/classes/${id}/details`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch class details.");
  }
};

export const updateClassById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/classes/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update class information.");
  }
};

export const deleteClassById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/classes/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete class.");
  }
};


export const getSpecificSchoolsClassDetail = async (schoolId, classId) => {
  try {
    const response = await axiosInstance.get(
      `/schools/user/${schoolId}/classes/${classId}/teachers-students`,
      {
        headers: getAuthHeaders(),
      }
    );
    return response.data?.data ?? response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch class details.");
  }
};
