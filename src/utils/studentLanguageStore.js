const LANGUAGE_STORAGE_KEY = "student-portal-language";
const VALID_LANGUAGES = new Set(["en", "ur", "sd"]);
const LANGUAGE_CHANGE_EVENT = "student-portal-language-change";

export const readStoredLanguage = () => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (VALID_LANGUAGES.has(stored)) {
      return stored;
    }
  } catch {
    // ignore storage read errors
  }
  return "en";
};

export const persistLanguage = (nextLanguage) => {
  const resolved = VALID_LANGUAGES.has(nextLanguage) ? nextLanguage : "en";
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, resolved);
  } catch {
    // ignore storage write errors
  }
  window.dispatchEvent(
    new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: resolved }),
  );
  return resolved;
};

export const subscribeLanguageChange = (callback) => {
  const handleLanguageChange = (event) => {
    callback(event.detail ?? readStoredLanguage());
  };
  const handleStorageChange = (event) => {
    if (event.key === LANGUAGE_STORAGE_KEY) {
      callback(readStoredLanguage());
    }
  };

  window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    window.removeEventListener("storage", handleStorageChange);
  };
};
