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

// export const addCertificate = async (data) => {
//   try {
//     const headers = getAuthHeaders(resolveContentHeaders(data));
//     const response = await axiosInstance.post("/admin/certificates", data, {
//       headers,
//     });
//     return response.data;
//   } catch (error) {
//     handleApiError(error, "Failed to add certificate. Please try again.");
//   }
// };


export const getAllPaginatedRMCJoiners= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/students/rmc-join", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch RMC joiners. Please try again.");
  }
};

export const rmcJoinStatusUpdate = async (data,type="rmc_join") => {
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

export const rmcJoinStatusGet = async (type="rmc_join") => {
  try {
    const response = await axiosInstance.get(`/registration-settings/${type}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch registration status. Please try again");
  }
};


export const rmcJoinCounter = async () => {
  try {
    const response = await axiosInstance.get(`/students/rmc-join/counters`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch counts. Please try again");
  }
};

// export const deleteCertificateById = async (id) => {
//   try {
//     const response = await axiosInstance.delete(`/admin/certificates/${id}`, {
//       headers: getAuthHeaders(),
//     });
//     return response.data;
//   } catch (error) {
//     handleApiError(error, "Failed to delete certificate.");
//   }
// };
