export const ALGEBRA_FORMATS = [
  {
    key: "whole_number",
    label: "Whole Number",
    inputs: [{ key: "whole", placeholder: "e.g., 11" }],
  },
  {
    key: "fraction",
    label: "Fraction",
    inputs: [
      { key: "numerator", placeholder: "" },
      { key: "denominator", placeholder: "" },
    ],
  },
  {
    key: "mixed_number",
    label: "Mixed Number",
    inputs: [
      { key: "whole", placeholder: "" },
      { key: "numerator", placeholder: "" },
      { key: "denominator", placeholder: "" },
    ],
  },
  {
    key: "base_exponent",
    label: "Base & Exponent",
    inputs: [
      { key: "base", placeholder: "base" },
      { key: "exponent", placeholder: "exp" },
    ],
  },
  {
    key: "decimal",
    label: "Decimal",
    inputs: [
      { key: "whole", placeholder: "whole" },
      { key: "fractional", placeholder: "fractional" },
    ],
  },
];

const getFormatKey = (value) => String(value ?? "").trim().toLowerCase();

export const getAlgebraFormatDefinition = (key) =>
  ALGEBRA_FORMATS.find((format) => format.key === key);

export const createDefaultAlgebraFormats = (enabled = true) =>
  ALGEBRA_FORMATS.map((format) => ({
    key: format.key,
    label: format.label,
    enabled,
    isCorrect: false,
    values: Array(format.inputs.length).fill(""),
  }));

export const parseAlgebraValues = (formatKey, valueString) => {
  const trimmed = String(valueString ?? "").trim();
  if (!formatKey) return [];
  if (formatKey === "whole_number") {
    return [trimmed];
  }
  if (formatKey === "fraction") {
    const [num = "", den = ""] = trimmed.split("/");
    return [num.trim(), den.trim()];
  }
  if (formatKey === "mixed_number") {
    const parts = trimmed.split(" ").filter(Boolean);
    if (parts.length === 1 && parts[0].includes("/")) {
      const [num = "", den = ""] = parts[0].split("/");
      return ["", num.trim(), den.trim()];
    }
    if (parts.length >= 2 && parts[1].includes("/")) {
      const [num = "", den = ""] = parts[1].split("/");
      return [parts[0].trim(), num.trim(), den.trim()];
    }
    return [
      parts[0] ? parts[0].trim() : "",
      parts[1] ? parts[1].trim() : "",
      parts[2] ? parts[2].trim() : "",
    ];
  }
  if (formatKey === "base_exponent") {
    const [base = "", exp = ""] = trimmed.split("^");
    if (exp !== "") return [base.trim(), exp.trim()];
    const parts = trimmed.split(" ").filter(Boolean);
    return [
      parts[0] ? parts[0].trim() : "",
      parts[1] ? parts[1].trim() : "",
    ];
  }
  if (formatKey === "decimal") {
    const [whole = "", fractional = ""] = trimmed.split(".");
    return [whole.trim(), fractional.trim()];
  }
  return trimmed ? [trimmed] : [];
};

export const serializeAlgebraValues = (formatKey, values = []) => {
  const trimmed = values.map((value) => String(value ?? "").trim());
  if (formatKey === "whole_number") {
    return trimmed[0] ?? "";
  }
  if (formatKey === "fraction") {
    return `${trimmed[0] ?? ""}/${trimmed[1] ?? ""}`.trim();
  }
  if (formatKey === "mixed_number") {
    const whole = trimmed[0] ?? "";
    const num = trimmed[1] ?? "";
    const den = trimmed[2] ?? "";
    return `${whole} ${num}/${den}`.trim();
  }
  if (formatKey === "base_exponent") {
    return `${trimmed[0] ?? ""}^${trimmed[1] ?? ""}`.trim();
  }
  if (formatKey === "decimal") {
    const whole = trimmed[0] ?? "";
    const frac = trimmed[1] ?? "";
    return `${whole}.${frac}`.trim();
  }
  return trimmed.join(" ").trim();
};

export const buildAlgebraAnswer = (formatKey, values = []) => {
  const key = getFormatKey(formatKey);
  if (!key) return "";
  return `${key}|${serializeAlgebraValues(key, values)}`;
};

export const isAlgebraAnswerComplete = (formatKey, values = []) => {
  const key = getFormatKey(formatKey);
  const def = getAlgebraFormatDefinition(key);
  if (!def) return false;
  const trimmed = values.map((value) => String(value ?? "").trim());
  if (trimmed.length < def.inputs.length) return false;
  return def.inputs.every((_, idx) => Boolean(trimmed[idx]));
};

export const normalizeAlgebraFormats = ({
  rawFormats,
  correctFormatKey,
  correctAnswerString,
  correctAnswerValues,
}) => {
  let list = Array.isArray(rawFormats) ? rawFormats : [];
  if (typeof rawFormats === "string") {
    try {
      const parsed = JSON.parse(rawFormats);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } catch (error) {
      list = [];
    }
  }

  const preferredCorrect = getFormatKey(correctFormatKey);

  return ALGEBRA_FORMATS.map((format) => {
    const match =
      list.find(
        (entry) =>
          getFormatKey(entry?.key) === format.key ||
          getFormatKey(entry?.format) === format.key ||
          getFormatKey(entry?.type) === format.key
      ) ?? null;

    const valuesFromEntry = Array.isArray(match?.values)
      ? match.values
      : Array.isArray(match?.answer)
      ? match.answer
      : Array.isArray(match?.correct_answer)
      ? match.correct_answer
      : [];
    const valueString =
      typeof match?.value === "string"
        ? match.value
        : typeof match?.answer === "string"
        ? match.answer
        : "";
    const normalizedValues =
      valuesFromEntry.length > 0
        ? valuesFromEntry.map((value) => String(value ?? ""))
        : valueString
        ? parseAlgebraValues(format.key, valueString)
        : format.key === preferredCorrect && Array.isArray(correctAnswerValues)
        ? correctAnswerValues.map((value) => String(value ?? ""))
        : Array(format.inputs.length).fill("");

    return {
      key: format.key,
      label: format.label,
      enabled:
        match?.enabled ??
        match?.is_enabled ??
        match?.isEnabled ??
        match?.selected ??
        true,
      isCorrect:
        match?.isCorrect ??
        match?.is_correct ??
        match?.correct ??
        format.key === preferredCorrect,
      values: normalizedValues,
    };
  });
};
