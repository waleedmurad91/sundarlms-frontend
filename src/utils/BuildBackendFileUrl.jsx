const BACKEND_FILE_BASE_PATH =
  import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? "";

const isAbsoluteMediaUrl = (value = "") => {
  if (typeof value !== "string" || !value) {
    return false;
  }
  return (
    value.startsWith("blob:") ||
    value.startsWith("data:") ||
    /^https?:\/\//i.test(value)
  );
};

// Laravel sometimes returns public asset URLs like
// .../example-app/public//storage/uploads/... while files are served from
// .../example-app/storage/app/public/uploads/...
const normalizeStorageUrl = (value = "") => {
  if (typeof value !== "string" || !value) {
    return "";
  }

  return value.replace(
    /(https?:\/\/[^/]+\/[^/]+\/)public\/\/storage\//i,
    "$1storage/app/public/",
  );
};

export const buildBackendFileUrl = (value = "") => {
  if (!value) {
    return "";
  }

  const normalizedValue = normalizeStorageUrl(value);

  if (isAbsoluteMediaUrl(normalizedValue) || !BACKEND_FILE_BASE_PATH) {
    return normalizedValue;
  }

  const baseEndsWithSlash = BACKEND_FILE_BASE_PATH.endsWith("/");
  const valueStartsWithSlash = normalizedValue.startsWith("/");
  if (baseEndsWithSlash && valueStartsWithSlash) {
    return `${BACKEND_FILE_BASE_PATH}${normalizedValue.slice(1)}`;
  }
  if (!baseEndsWithSlash && !valueStartsWithSlash) {
    return `${BACKEND_FILE_BASE_PATH}/${normalizedValue}`;
  }
  return `${BACKEND_FILE_BASE_PATH}${normalizedValue}`;
};
