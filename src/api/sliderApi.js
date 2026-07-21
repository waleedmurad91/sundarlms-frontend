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

export const addSlider = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/admin/sliders", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add slider. Please try again.");
  }
};

export const getAllPaginatedSliders = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/admin/sliders", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch sliders. Please try again.");
  }
};

export const getSliderByPageType = async (pageType) => {
  try {
    const response = await axiosInstance.get(`/admin/sliders/${pageType}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch slider details.");
  }
};

export const updateSliderByPageType = async (pageType, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));

    if (updatedData instanceof FormData) {
      updatedData.append("_method", "PUT");
      const response = await axiosInstance.post(
        `/admin/sliders/${pageType}`,
        updatedData,
        { headers },
      );
      return response.data;
    }

    const response = await axiosInstance.post(
      `/admin/sliders/${pageType}`,
      updatedData,
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update slider.");
  }
};

export const deleteSliderByPageType = async (pageType) => {
  try {
    const response = await axiosInstance.delete(`/admin/sliders/${pageType}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete slider.");
  }
};

export const getPublicSliderByPageType = async (pageType) => {
  try {
    const response = await axiosInstance.get(`/public/sliders/${pageType}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch page slider.");
  }
};
