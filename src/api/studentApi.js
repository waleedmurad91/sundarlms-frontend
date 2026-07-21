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

export const addStudent = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/students", data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add student. Please try again.");
  }
};

export const getAllStudents = async () => {
  try {
    const response = await axiosInstance.get("/students", {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch students. Please try again.");
  }
};

export const getAllPaginatedStudents = async (params = {}) => {
  try {
    const response = await axiosInstance.get("/students/paginated", {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch students. Please try again.");
  }
};

export const getAllSchoolStudents = async (params = {}, id) => {
  try {
    const response = await axiosInstance.get(`/schools/user/${id}/students`, {
      headers: getAuthHeaders(),
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch students. Please try again.");
  }
};

export const getStudentById = async (id) => {
  try {
    const response = await axiosInstance.get(`/students/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student details.");
  }
};

export const updateStudentById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(`/students/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update student information.");
  }
};

// Admin-specific functions for student registrations
export const getAdminStudentById = async (id) => {
  try {
    const response = await axiosInstance.get(`/students/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch student details.");
  }
};

export const updateAdminStudentById = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(`/students/${id}`, updatedData, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update student information.");
  }
};

export const approvedStudent = async (id, updatedData) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(updatedData));
    const response = await axiosInstance.post(
      `/students/${id}/approve`,
      updatedData,
      {
        headers,
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to approve student.");
  }
};

export const deleteStudentById = async (id) => {
  try {
    const response = await axiosInstance.delete(`/students/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete students.");
  }
};

export const updateRmcInfo = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post("/student/rmc-join", data, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update RMC information.");
  }
};

// export const getAllContest = async () => {
//   try {
//     const response = await axiosInstance.get("/student/registration-module/available-contests", {
//       headers: getAuthHeaders(),
//     });
//     return response.data;
//   } catch (error) {
//     handleApiError(error, "Failed to fetch contest. Please try again.");
//   }
// };

export const getAllContest = async () => {
  try {
    const response = await axiosInstance.get(
      "/student/registration-module/available-contests",
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch contest. Please try again.");
  }
};

export const getAllCurrentContestRegistrations = async () => {
  try {
    const response = await axiosInstance.get(
      "/student/registration-module/current-registrations",
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(
      error,
      "Failed to fetch current contest registrations. Please try again.",
    );
  }
};

export const getAllPastContestRegistrations = async () => {
  try {
    const response = await axiosInstance.get(
      "/student/registration-module/past-registrations",
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(
      error,
      "Failed to fetch past contest registrations. Please try again.",
    );
  }
};

export const updateRegistrationInfo = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      "/student/registration-module/update-registrations",
      data,
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update registration information.");
  }
};

export const getAllCourseSelection = async () => {
  try {
    const response = await axiosInstance.get(
      "/student/registration-module/courses",
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    handleApiError(
      error,
      "Failed to fetch course selection. Please try again.",
    );
  }
};

export const updateCourseSelection = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      "/student/registration-module/courses",
      data,
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update course selection.");
  }
};

export const getTeachersOfStudent = async (id) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(id));
    const response = await axiosInstance.get(`/student/${id}/teachers`, {
      headers,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load teacher. Please try again.");
  }
};

export const linkStudentToTeacher = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      "/student/teachers/link-by-code",
      data,
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(
      error,
      "Failed to link student to teacher. Please try again.",
    );
  }
};

export const unlinkStudentFromTeacher = async (data) => {
  try {
    const headers = getAuthHeaders(resolveContentHeaders(data));
    const response = await axiosInstance.post(
      "/student/teachers/unlink",
      data,
      { headers },
    );
    return response.data;
  } catch (error) {
    handleApiError(
      error,
      "Failed to unlink student from teacher. Please try again.",
    );
  }
};
