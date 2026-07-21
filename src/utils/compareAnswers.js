// Utility to compare user answers against expected, with normalization.
// Handles plain text, numbers (with tolerance), simple fractions, and basic LaTeX cleanup.

const stripHtml = (value = "") =>
  String(value || "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/gi, " ");

const normalizeLatex = (value = "") =>
  value
    .replace(/^\$+|\$+$/g, "")
    .replace(/\\times/g, "*")
    .replace(/\\cdot/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\frac{([^}]+)}{([^}]+)}/g, "($1)/($2)");

const normalizeString = (value = "") =>
  normalizeLatex(stripHtml(value))
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const parseFraction = (str) => {
  const match = String(str).trim().match(/^([-+]?\d+(?:\.\d+)?)\s*\/\s*([-+]?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const den = parseFloat(match[2]);
  if (!isFinite(num) || !isFinite(den) || den === 0) return null;
  return num / den;
};

const toNumber = (value) => {
  const frac = parseFraction(value);
  if (frac !== null) return frac;
  const n = Number(String(value).trim());
  return isFinite(n) ? n : null;
};

export const compareAnswers = (expected, user) => {
  const normExpected = normalizeString(expected);
  const normUser = normalizeString(user);

  // Try numeric comparison
  const numExpected = toNumber(normExpected);
  const numUser = toNumber(normUser);
  if (numExpected !== null && numUser !== null) {
    const tolerance = 1e-6;
    return Math.abs(numExpected - numUser) < tolerance;
  }

  // Fallback to normalized string comparison
  return normExpected === normUser;
};

export default compareAnswers;
