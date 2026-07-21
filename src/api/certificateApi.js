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

  return { "Content-Type": "application/json" };
};

const handleApiError = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || fallbackMessage;

  if (error instanceof Error) {
    error.message = message;
    throw error;
  }

  throw new Error(message);
};

export const addCertificate = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/certificates", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add certificate. Please try again.");
  }
};


export const getAllPaginatedCertificates= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/certificates", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch certificates. Please try again.");
  }
};

export const getCertificateById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/certificates/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch certificate details.");
  }
};

export const updateCertificateById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/certificates/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update information.");
  }
};

export const deleteCertificateById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/certificates/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete certificate.");
  }
};
