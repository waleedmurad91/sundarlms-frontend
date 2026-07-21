import axiosInstance from "@/api/axiosInstance";

/* ------------------------------------------------------------------ */
/* Mobile / device token API                                          */
/* ------------------------------------------------------------------ */


/**
 * Store or update the current device's FCM token.
 * Call this after login, and again whenever Firebase refreshes the token.
 *
 * @param {string} token - device FCM token from Firebase SDK
 * @param {number} [userId] - only relevant for admins updating another user's token
 */
export const storeOrUpdateUserToken = async (token, userId) => {
  const payload = { token };
  if (userId) payload.user_id = userId;

  const result = await axiosInstance.post("/user-token", payload);
  return result?.data ?? result;
};

/* ------------------------------------------------------------------ */
/* Admin: send push notifications                                     */
/* ------------------------------------------------------------------ */

/**
 * Send a push notification to a topic or a raw device token.
 *
 * @param {Object} params
 * @param {"topic"|"token"} params.mode
 * @param {string} params.target - topic name or device FCM token
 * @param {string} params.title
 * @param {string} params.body
 * @param {string} [params.imageUrl] - public image URL
 * @param {Object} [params.data] - key/value payload sent as FCM data
 */
export const sendPushToTopicOrToken = async ({
  mode,
  target,
  title,
  body,
  imageUrl,
  data,
}) => {
  const payload = { mode, target, title, body };
  if (imageUrl) payload.image_url = imageUrl;
  if (data) payload.data = data;

  const result = await axiosInstance.post(
    "/admin/push-notifications/send",
    payload,
  );
  return result?.data ?? result;
};

/**
 * Send a push notification to a specific application user by user_id.
 * Backend looks up their saved FCM token and can optionally save an
 * in-app notification record.
 *
 * @param {Object} params
 * @param {number} params.userId
 * @param {string} params.title
 * @param {string} params.body
 * @param {string} [params.imageUrl]
 * @param {string} [params.url] - saved on the in-app notification record
 * @param {string} [params.type] - defaults to "general" on the backend
 * @param {Object} [params.data]
 * @param {boolean} [params.saveNotification] - defaults to true on the backend
 */
export const sendPushToUser = async ({
  userId,
  title,
  body,
  imageUrl,
  url,
  type,
  data,
  saveNotification,
}) => {
  const payload = { user_id: userId, title, body };
  if (imageUrl) payload.image_url = imageUrl;
  if (url) payload.url = url;
  if (type) payload.type = type;
  if (data) payload.data = data;
  if (typeof saveNotification === "boolean") {
    payload.save_notification = saveNotification;
  }

  const result = await axiosInstance.post(
    "/admin/push-notifications/send-to-user",
    payload,
  );
  return result?.data ?? result;
};

/**
 * Send a push notification to a filtered audience (roles, grade, PMC status).
 * Resolves matching users and sends one push per matched FCM token.
 * Pass dryRun: true to preview match counts without sending anything.
 *
 * @param {Object} params
 * @param {string} params.title
 * @param {string} params.body
 * @param {Object} params.filters - e.g. { roles, grade_ids, grade_names, pmc }
 * @param {boolean} [params.dryRun]
 * @param {string} [params.imageUrl]
 * @param {string} [params.url]
 * @param {string} [params.type]
 * @param {Object} [params.data]
 * @param {boolean} [params.saveNotification]
 */
export const sendPushToAudience = async ({
  title,
  body,
  filters,
  dryRun,
  imageUrl,
  url,
  type,
  data,
  saveNotification,
}) => {
  const payload = { title, body, filters };
  if (typeof dryRun === "boolean") payload.dry_run = dryRun;
  if (imageUrl) payload.image_url = imageUrl;
  if (url) payload.url = url;
  if (type) payload.type = type;
  if (data) payload.data = data;
  if (typeof saveNotification === "boolean") {
    payload.save_notification = saveNotification;
  }

  const result = await axiosInstance.post(
    "/admin/push-notifications/send-to-audience",
    payload,
  );
  return result?.data ?? result;
};

/**
 * Get the currently active PMC sessions to populate session pickers for the
 * audience filters (instead of requiring an admin to type a raw session ID).
 *
 * @returns {Promise<{data: Array, meta: {total: number, requires_explicit_selection: boolean}}>}
 */
export const getPmcActiveSessions = async () => {
  const result = await axiosInstance.get(
    "/admin/push-notifications/pmc-active-sessions",
  );
  // Be defensive about how axiosInstance shapes its return value: some
  // instances return the full axios response ({ data: { status, data, meta } }),
  // others have an interceptor that already unwraps to the body
  // ({ status, data, meta }), and in rare setups it could already be the
  // plain sessions array. Handle all three so this never silently returns
  // nothing.
  const body = result?.data ?? result;

  if (Array.isArray(body)) {
    return { data: body, meta: null };
  }

  if (Array.isArray(body?.data)) {
    return { data: body.data, meta: body.meta ?? null };
  }

  console.error(
    "getPmcActiveSessions: unexpected response shape",
    result,
  );
  return { data: [], meta: null };
};

/* ------------------------------------------------------------------ */
/* Admin: batches, logs, stats                                        */
/* ------------------------------------------------------------------ */

/**
 * List sent notification batches (grouped sends, one row per batch/target).
 * @param {Object} [params]
 * @param {"topic"|"token"|"user"|"audience"} [params.targetType]
 * @param {number} [params.perPage]
 */
export const listPushNotificationBatches = async ({
  targetType,
  perPage,
} = {}) => {
  const params = {};
  if (targetType) params.target_type = targetType;
  if (perPage) params.per_page = perPage;

  const result = await axiosInstance.get("/admin/push-notifications/batches", {
    params,
  });
  return result?.data ?? result;
};

/**
 * Get per-user delivery rows for a single notification batch.
 * @param {string} batchId
 * @param {Object} [params]
 * @param {"pending"|"sent"|"failed"} [params.status]
 * @param {"pending"|"received"|"opened"} [params.deliveryStatus]
 * @param {number} [params.perPage]
 */
export const getPushNotificationBatchDetails = async (
  batchId,
  { status, deliveryStatus, perPage } = {},
) => {
  const params = {};
  if (status) params.status = status;
  if (deliveryStatus) params.delivery_status = deliveryStatus;
  if (perPage) params.per_page = perPage;

  const result = await axiosInstance.get(
    `/admin/push-notifications/batches/${batchId}`,
    { params },
  );
  return result?.data ?? result;
};

/**
 * List individual push notification log rows.
 * @param {Object} [params]
 * @param {"pending"|"sent"|"failed"} [params.status]
 * @param {"pending"|"received"|"opened"} [params.deliveryStatus]
 * @param {"topic"|"token"|"user"|"audience"} [params.targetType]
 * @param {number} [params.userId]
 * @param {number} [params.perPage]
 */
export const listPushNotificationLogs = async ({
  status,
  deliveryStatus,
  targetType,
  userId,
  perPage,
} = {}) => {
  const params = {};
  if (status) params.status = status;
  if (deliveryStatus) params.delivery_status = deliveryStatus;
  if (targetType) params.target_type = targetType;
  if (userId) params.user_id = userId;
  if (perPage) params.per_page = perPage;

  const result = await axiosInstance.get("/admin/push-notifications", {
    params,
  });
  return result?.data ?? result;
};

/**
 * Get aggregate push notification stats (sent/failed/received/opened, etc).
 */
export const getPushNotificationStats = async () => {
  const result = await axiosInstance.get("/admin/push-notifications/stats");
  return result?.data ?? result;
};

/* ------------------------------------------------------------------ */
/* Existing in-app notification APIs                                  */
/* ------------------------------------------------------------------ */

/**
 * List the current user's in-app notifications.
 * @param {number} [perPage]
 */
export const listNotifications = async (perPage) => {
  const result = await axiosInstance.get("/notifications", {
    params: perPage ? { per_page: perPage } : undefined,
  });
  return result?.data ?? result;
};

/**
 * Mark a single notification as read.
 * @param {number|string} notificationId
 */
export const markNotificationAsRead = async (notificationId) => {
  const result = await axiosInstance.post(
    `/notifications/${notificationId}/read`,
  );
  return result?.data ?? result;
};

/**
 * Mark all of the current user's notifications as read.
 */
export const markAllNotificationsAsRead = async () => {
  const result = await axiosInstance.post("/notifications/read-all");
  return result?.data ?? result;
};


/**
 * Get the list of grades to populate the "Grade names" audience filter
 * (instead of requiring an admin to type comma-separated grade names).
 *
 * @returns {Promise<{data: Array, meta: Object|null}>}
 */
export const getPushNotificationGrades = async () => {
  const result = await axiosInstance.get("/admin/push-notifications/grades");
  // Same defensive unwrapping as getPmcActiveSessions - handle full axios
  // response, already-unwrapped body, or a raw array.
  const body = result?.data ?? result;

  if (Array.isArray(body)) {
    return { data: body, meta: null };
  }

  if (Array.isArray(body?.data)) {
    return { data: body.data, meta: body.meta ?? null };
  }

  console.error("getPushNotificationGrades: unexpected response shape", result);
  return { data: [], meta: null };
};