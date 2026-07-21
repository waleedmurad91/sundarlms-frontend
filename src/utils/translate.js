const GOOGLE_TRANSLATE_API_URL =
  "https://translate.googleapis.com/translate_a/single";

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English", target: "en", dir: "ltr", lang: "en" },
  { code: "ur", label: "Urdu", target: "ur", dir: "rtl", lang: "ur" },
  { code: "sd", label: "Sindhi", target: "sd", dir: "rtl", lang: "sd" },
];

export const extractPlainText = (html = "") => {
  const fallbackText = html.replace(/<[^>]+>/g, " ");
  if (typeof DOMParser === "undefined") {
    return fallbackText.replace(/\s+/g, " ").trim();
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || fallbackText).replace(/\s+/g, " ").trim();
};

export const escapeHtml = (text = "") =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const preserveMathTokens = (text = "") => {
  const tokens = [];
  const normalizedText = text.replace(/\$(.+?)\$/g, (match) => {
    const token = `__MATH_TOKEN_${tokens.length}__`;
    tokens.push({ token, value: match });
    return token;
  });

  return { normalizedText, tokens };
};

const restoreMathTokens = (text = "", tokens = []) =>
  tokens.reduce(
    (restoredText, { token, value }) => restoredText.replaceAll(token, value),
    text,
  );

const parseGoogleTranslatePayload = (payload) => {
  if (payload?.sentences?.length) {
    return payload.sentences.map((entry) => entry?.trans ?? "").join("");
  }

  if (Array.isArray(payload?.[0])) {
    return payload[0]
      .map((entry) => (Array.isArray(entry) ? (entry[0] ?? "") : ""))
      .join("");
  }

  return "";
};

export const translateText = async (text, targetLanguage, signal) => {
  const { normalizedText, tokens } = preserveMathTokens(text);
  const params = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: targetLanguage,
    dt: "t",
    dj: "1",
    q: normalizedText,
  });
  const response = await fetch(`${GOOGLE_TRANSLATE_API_URL}?${params}`, {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error("Translation request failed.");
  }

  const payloadText = await response.text();
  const payload = JSON.parse(payloadText);
  const translatedText = parseGoogleTranslatePayload(payload);

  if (!translatedText) {
    throw new Error("Translated text was empty.");
  }

  return restoreMathTokens(translatedText, tokens);
};
