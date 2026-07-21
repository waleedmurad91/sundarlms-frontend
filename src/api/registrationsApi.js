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

export const addStudentRegistrationForm = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/student-registrations", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add student form. Please try again.");
  }
};

export const getVSSStudentRegistrations = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/student-registrations/vss", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student registrations. Please try again.");
  }
};

export const getPMC5StudentRegistrations = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/student-registrations/pmc-5", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student registrations. Please try again.");
  }
};

export const getRMCStudentRegistrations = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/student-registrations/rmc", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student registrations. Please try again.");
  }
};

export const exportRMCParticipants = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/student-registrations/export/rmc-participants", {
      headers: getAuthHeaders(),
      params,
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export rmc student registrations. Please try again.");
  }
};

export const exportRMCRegistrations = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/student-registrations/export/rmc", {
      headers: getAuthHeaders(),
      params,
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export rmc student registrations. Please try again.");
  }
};

export const getStudentRegistrationById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/student-registrations/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student registration.");
  }
};

export const updateStudentRegistrationById = async (id, data) => {
  try {
    // Adjust the method/path here if the backend expects a different update endpoint.
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/admin/student-registrations/${id}`,
      data,
      {
        headers,
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update student registration.");
  }
};

export const addSchoolRegistrationForm = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/school-registrations", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add school. Please try again.");
  }
};

export const getSchoolRegistrations = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/school-registrations", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch school registrations. Please try again.");
  }
};

export const getSchoolRegistrationById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/school-registrations/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch school registration.");
  }
};

export const updateSchoolRegistrationById = async (id, data) => {
  try {
    // Adjust the method/path here if the backend expects a different update endpoint.
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/admin/school-registrations/${id}`,
      data,
      {
        headers,
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update student registration.");
  }
};

export const importSchoolRegistrations = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/school-registrations/import", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to import schools. Please try again.");
  }
};

export const importRMCScores = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/leaderboard/import-csv", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to import rmc results. Please try again.");
  }
};

export const importStudentRegistrations = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/student-registrations/import", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to import student registrations. Please try again.");
  }
};

export const exportStudentRegistrations = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/student-registrations/export", {
      headers: getAuthHeaders(),
      params,
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export student registrations. Please try again.");
  }
};

export const schoolRegistrationStatusUpdate = async (data,type="school") => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/admin/registration-settings/${type}`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update registration status. Please try again.");
  }
};

export const schoolRegistrationStatusGet = async (type="school") => {
  try {
    const response = await axiosInstance.get(`/registration-settings/${type}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch registration status. Please try again");
  }
};

export const deleteSchoolRegistrationById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/school-registrations/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete registration.");
  }
};

export const studentRegistrationStatusUpdate = async (data,type="student") => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/admin/registration-settings/vss/${type}`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update registration status. Please try again.");
  }
};

export const studentRegistrationPMCStatusUpdate = async (data,type="student") => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/admin/registration-settings/pmc-5/${type}`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update registration status. Please try again.");
  }
};
export const studentRegistrationRMCStatusUpdate = async (data,type="student") => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/admin/registration-settings/rmc/${type}`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update registration status. Please try again.");
  }
};
export const studentRegistrationVSSStatusUpdate = async (data,type="student") => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(`/admin/registration-settings/vss/${type}`, data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update registration status. Please try again.");
  }
};

export const studentRegistrationStatusGet = async (type="student") => {
  try {
    const response = await axiosInstance.get(`/admin/registration-settings/${type}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch registration status. Please try again");
  }
};

export const studentRegistrationPMCStatusGet = async (type="student") => {
  try {
    const response = await axiosInstance.get(`/admin/registration-settings/pmc-5/${type}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch registration status. Please try again");
  }
};
export const studentRegistrationRMCStatusGet = async (type="student") => {
  try {
    const response = await axiosInstance.get(`/admin/registration-settings/rmc/${type}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch registration status. Please try again");
  }
};
export const studentRegistrationVSSStatusGet = async (type="student") => {
  try {
    const response = await axiosInstance.get(`/admin/registration-settings/vss/${type}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch registration status. Please try again");
  }
};

export const deleteStudentRegistrationById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/student-registrations/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete registration.");
  }
};

export const exportSchoolRegistrations = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/school-registrations/export", {
      headers: getAuthHeaders(),
      params,
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export school registrations. Please try again.");
  }
};

export const approveStudentsInBulk = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/student-registrations/bulk-approve", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to approve students. Please try again.");
  }
};

export const rejectStudentsInBulk = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/student-registrations/bulk-reject", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to reject students. Please try again.");
  }
};

export const approveOpenSignupsInBulk = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/students/open-signups/bulk-approve", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to approve students. Please try again.");
  }
};

export const rejectOpenSignupsInBulk = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/students/open-signups/bulk-reject", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to reject students. Please try again.");
  }
};

export const getOpenSignupsPending = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/students/open-signups", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch open signups. Please try again.");
  }
};

export const getStudentSignUpById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/student-signups/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student signup details.");
  }
};

export const approveSchoolsInBulk = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/school-registrations/bulk-approve", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to approve schools. Please try again.");
  }
};