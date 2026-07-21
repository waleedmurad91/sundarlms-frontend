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

export const addSchool = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/schools", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add school. Please try again.");
  }
};

export const getAllSchools = async () => {
  try {
    const response = await axiosInstance.get("/schools", {
      headers: getAuthHeaders(),
    });
    const payload = response.data?.data ?? response.data;
    const schools = Array.isArray(payload?.schools)
      ? payload.schools
      : Array.isArray(payload)
        ? payload
        : [];
    const grades = Array.isArray(payload?.grades) ? payload.grades : [];
    // Derive classes from grades so consumers can populate the class dropdown.
    // Each class mirrors its grade (incl. nested subjects) so subject lookups work.
    const classes = grades.map((grade) => {
      const normalizedGrade = { ...grade };
      return {
        id: grade?.id,
        name: grade?.name,
        grade: normalizedGrade,
      };
    });
    // Attach grades + classes to each school for downstream consumers (e.g. stdForm/tForm)
    return schools.map((school) => ({ ...school, grades, classes }));
  } catch (error) {
    handleApiError(error, "Failed to fetch schools. Please try again.");
  }
};

export const getAllPaginatedSchools = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/schools/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch schools. Please try again.");
  }
};

export const getSchoolById = async (id) => {
  try {
    const response = await axiosInstance.get(`/schools/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch school details.");
  }
};

export const getSpecificSchoolDetail = async (id) => {
  try {
    const response = await axiosInstance.get(`/schools/${id}/details`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch school details.");
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

export const getSchoolDashboardOverview = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/schools/analytics/detail", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch schools. Please try again.");
  }
};

export const exportSchoolLists = async () => {
  try {
    const response = await axiosInstance.get(`/schools/export`, {
      headers: getAuthHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export school data.");
  }
};