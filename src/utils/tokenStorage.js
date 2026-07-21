const TOKEN_COOKIE = "auth_token";
const isBrowser = typeof window !== "undefined";
const isSecureContext = isBrowser && window.location.protocol === "https:";

export const setTokenCookie = (token) => {
  if (!isBrowser || !token) return;
  const secureFlag = isSecureContext ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(
    token
  )}; Path=/; SameSite=None${secureFlag}; Max-Age=${60 * 60 * 24 * 7}`;
};

export const getTokenFromCookie = () => {
  if (!isBrowser) return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
};

export const clearTokenCookie = () => {
  if (!isBrowser) return;
  const secureFlag = isSecureContext ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE}=; Path=/; SameSite=None${secureFlag}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};
