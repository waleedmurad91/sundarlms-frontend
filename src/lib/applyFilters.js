const isBlankValue = (value) =>
  value === null || value === undefined || String(value).trim() === "";

const normalizeArrayValue = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item ?? "").trim())
        .filter((item) => item.length > 0)
    : [];

export const buildFilterStateFromSchema = (schema = [], applied = {}) =>
  schema.reduce((acc, field) => {
    const key = field?.key;
    if (!key) {
      return acc;
    }

    const incomingValue = applied?.[key];
    if (field.type === "multiselect") {
      acc[key] = normalizeArrayValue(incomingValue);
      return acc;
    }

    acc[key] = isBlankValue(incomingValue) ? "" : String(incomingValue);
    return acc;
  }, {});

export const buildFilterParams = (filters = {}) => {
  const params = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const normalizedArray = normalizeArrayValue(value);
      if (normalizedArray.length > 0) {
        params[key] = normalizedArray;
      }
      return;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        params[key] = trimmed;
      }
      return;
    }

    if (value !== null && value !== undefined && value !== "") {
      params[key] = value;
    }
  });

  return params;
};

/**
 * Optional client-side fallback utility for pages that filter already-fetched rows.
 */
export const applyCommonFilters = (items, filters, config = {}) => {
  const query = String(filters?.search ?? "")
    .trim()
    .toLowerCase();
  const statuses = normalizeArrayValue(filters?.status).map((item) =>
    item.toLowerCase(),
  );
  const fromDate = filters?.date_from ? new Date(filters.date_from) : null;
  const toDate = filters?.date_to ? new Date(filters.date_to) : null;

  const searchFields = Array.isArray(config.searchFields)
    ? config.searchFields
    : [];
  const dateField = config.dateField || null;

  return (Array.isArray(items) ? items : []).filter((item) => {
    if (query && searchFields.length > 0) {
      const haystack = searchFields
        .map((field) => String(item?.[field] ?? ""))
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (statuses.length > 0) {
      const itemStatus = String(item?.status ?? "").toLowerCase();
      if (!statuses.includes(itemStatus)) {
        return false;
      }
    }

    if (dateField && (fromDate || toDate)) {
      const rawDate = item?.[dateField];
      if (!rawDate) {
        return false;
      }
      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return false;
      }
      if (fromDate && parsedDate < fromDate) {
        return false;
      }
      if (toDate && parsedDate > toDate) {
        return false;
      }
    }

    return true;
  });
};
