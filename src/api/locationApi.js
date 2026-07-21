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

export const addProvince = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/locations/provinces", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add province. Please try again.");
  }
};


export const getAllPaginatedProvinces= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/locations/provinces", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch provinces. Please try again.");
  }
};

export const getProvinceById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/locations/provinces/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch province details.");
  }
};

export const updateProvinceById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/locations/provinces/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update province information.");
  }
};

export const deleteProvinceById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/locations/provinces/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete province.");
  }
};


// district APIs
export const addDistrict = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/locations/districts", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add district. Please try again.");
  }
};


export const getAllPaginatedDistricts= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/locations/districts", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch districts. Please try again.");
  }
};

export const getDistrictById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/locations/districts/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch district details.");
  }
};

export const updateDistrictById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/locations/districts/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update district information.");
  }
};

export const deleteDistrictById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/locations/districts/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete district.");
  }
};


// tehsil APIs
export const addTehsil = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/locations/tehsils", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add tehsil. Please try again.");
  }
};


export const getAllPaginatedTehsils= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/locations/tehsils", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch tehsils. Please try again.");
  }
};

export const getTehsilById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/locations/tehsils/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch tehsil details.");
  }
};

export const updateTehsilById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/locations/tehsils/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update tehsil information.");
  }
};

export const deleteTehsilById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/locations/tehsils/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete tehsil.");
  }
};

// city APIs
export const addCity = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/locations/cities", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add city. Please try again.");
  }
};


export const getAllPaginatedCities= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/locations/cities", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch cities. Please try again.");
  }
};

export const getCityById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/locations/cities/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch city details.");
  }
};

export const updateCityById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/locations/cities/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update city information.");
  }
};

export const deleteCityById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/locations/cities/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete city.");
  }
};

// Cluster APIs
export const addCluster = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/locations/cluster-areas", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add cluster. Please try again.");
  }
};


export const getAllPaginatedClusters= async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/locations/cluster-areas", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch clusters. Please try again.");
  }
};

export const getClusterById = async (id) => {
  try {
    const response = await axiosInstance.get(`/admin/locations/cluster-areas/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch cluster details.");
  }
};

export const updateClusterById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.put(`/admin/locations/cluster-areas/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update cluster information.");
  }
};

export const deleteClusterById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/admin/locations/cluster-areas/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete cluster.");
  }
};