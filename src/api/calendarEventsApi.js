import axiosInstance from "@/api/axiosInstance";

const ADMIN_BASE = "/admin/calendar-events";
const PUBLIC_BASE = "/public/calendar/events";

const calendarEventsApi = {
  listAdminEvents: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== "" && value !== undefined && value !== null
      )
    );
    const response = await axiosInstance.get(ADMIN_BASE, { params: cleanParams });
    return response.data;
  },

  getAdminEvent: async (id) => {
    const response = await axiosInstance.get(`${ADMIN_BASE}/${id}`);
    return response.data;
  },

  createEvent: async (payload) => {
    const response = await axiosInstance.post(ADMIN_BASE, payload);
    return response.data;
  },

  updateEvent: async (id, payload) => {
    const response = await axiosInstance.put(`${ADMIN_BASE}/${id}`, payload);
    return response.data;
  },

  deleteEvent: async (id) => {
    const response = await axiosInstance.delete(`${ADMIN_BASE}/${id}`);
    return response.data;
  },

  getPublicEvents: async (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== "" && value !== undefined && value !== null
      )
    );
    const response = await axiosInstance.get(PUBLIC_BASE, { params: cleanParams });
    return response.data;
  },
};

export default calendarEventsApi;