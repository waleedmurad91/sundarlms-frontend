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
    return {};
  }

  return { "Content-Type": "multipart/form-data" };
};

const handleApiError = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || fallbackMessage;

  if (error instanceof Error) {
    error.message = message;
    throw error;
  }

  throw new Error(message);
};

export const studentAnalyticsOverview = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/students/analytics", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch analytics. Please try again.");
  }
};
export const getStudentAnalyticsCounter = async () => {
  try {
    const response = await axiosInstance.get(`/students/analytics/indicators`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch analytics counter.");
  }
};

export const getSpecificStudentAnalytics = async (id) => {
  try {
    const response = await axiosInstance.get(`/students/analytics/${id}/profile`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student analytics details.");
  }
};

export const schoolAnalyticsOverview = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/schools/analytics/overview", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch analytics. Please try again.");
  }
};

export const getSpecificSchoolAnalytics = async (id) => {
  try {
    const response = await axiosInstance.get(`/schools/analytics/${id}/detail`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch school analytics details.");
  }
};


export const updateSchoolById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders();
    
    const response = await axiosInstance.post(`/schools/${id}/update`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update information.");
  }
};

export const analyticsOverview = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/analytics/platform-overview", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch analytics. Please try again.");
  }
};

export const subjectUnitsAnalyticsOverview = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/subjects-units/analytics/overview", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch analytics. Please try again.");
  }
};

export const citySchoolAnalyticsOverview = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/cities-schools/analytics/city-school", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch analytics. Please try again.");
  }
};

export const deleteSchoolById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/schools/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete school.");
  }
};
