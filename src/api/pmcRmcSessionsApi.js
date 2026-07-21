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

export const addPmcSession = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/pmc-sessions", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add PMC session. Please try again.");
  }
};

export const addRmcSession = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/rmc-sessions", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add RMC session. Please try again.");
  }
};


export const getAllPaginatedPmcSessions= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/pmc-sessions", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch PMC sessions. Please try again.");
  }
};

export const getAllPaginatedRmcSessions= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/rmc-sessions", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch RMC sessions. Please try again.");
  }
};

export const getPmcSessionById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/pmc-sessions/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch PMC session details.");
  }
};

export const getRmcSessionById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/rmc-sessions/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch RMC session details.");
  }
};

export const updatePmcSessionById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/pmc-sessions/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update information.");
  }
};

export const updateRmcSessionById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/rmc-sessions/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update information.");
  }
};

export const deletePmcSessionById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/pmc-sessions/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete PMC session.");
  }
};

export const deleteRmcSessionById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/rmc-sessions/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete RMC session.");
  }
};


export const getPmcSessionDetail = async (id, params = {}) => {
  try {
    const response = await axiosInstance.get(`/admin/pmc-sessions/${id}/participants`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch PMC session details.");
  }
};

export const getRmcSessionDetail = async (id, params = {}) => {
  try {
    const response = await axiosInstance.get(`/admin/rmc-sessions/${id}/participants`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch RMC session details.");
  }
};

export const getPmcSessionExport = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/pmc-sessions/${id}/participants/export`, {
      headers: getAuthHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export PMC session details.");
  }
};

export const getRmcSessionExport = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/rmc-sessions/${id}/participants/export`, {
      headers: getAuthHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export RMC session details.");
  }
};

export const uploadPmcQuilgoLink = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/admin/pmc-sessions/${id}/quilgo-links/import`,
      data,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to import PMC quilgo links.");
  }
};

export const getPmcQuilgoLinkTemplate = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/pmc-sessions/${id}/quilgo-links/template`, {
      headers: getAuthHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export PMC quilgo links template.");
  }
};

export const getPmcScoresTemplate = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/pmc-sessions/${id}/results/template-round-1`, {
      headers: getAuthHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export PMC scores template.");
  }
};

export const getPmcScoresTemplateRound2 = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/pmc-sessions/${id}/results/template-round-2`, {
      headers: getAuthHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export PMC scores template.");
  }
};

export const uploadRmcScores = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/admin/rmc-sessions/${id}/results/import`,
      data,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to import RMC scores.");
  }
};

export const getRmcScoresTemplate = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/rmc-sessions/${id}/results/template`, {
      headers: getAuthHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export RMC scores template.");
  }
};

export const uploadPmcResults = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/admin/pmc-sessions/${id}/results/import-round-1`,
      data,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to import PMC results.");
  }
};

export const uploadPmcResultsRound2 = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/admin/pmc-sessions/${id}/results/import-round-2`,
      data,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to import PMC results.");
  }
};

export const publishPmcResults = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/admin/pmc-sessions/${id}/results/publication`,
      data,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to publish PMC results.");
  }
};

export const getPmcResultStatus = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/pmc-sessions/${id}/results/publication`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch PMC session results details.");
  }
};

export const publishRmcResults = async (id, data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      `/admin/rmc-sessions/${id}/results/publication`,
      data,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to publish RMC results.");
  }
};

export const getRmcResultStatus = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/rmc-sessions/${id}/results/publication`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch RMC session results details.");
  }
};

export const getActivePmcSessionExport = async () => {
  try {
    const response = await axiosInstance.get(`/admin/pmc-sessions/participants/export-active`, {
      headers: getAuthHeaders(),
      responseType: "blob",
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to export PMC session.");
  }
};

export const getPmcActiveAnalytics = async (city = "") => {
  try {
    const params = {};
    const trimmedCity = String(city ?? "").trim();
    if (trimmedCity) {
      params.city = trimmedCity;
    }

    const response = await axiosInstance.get(`/admin/pmc-sessions/participants/analytics-active`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch PMC active analytics.");
  }
};
