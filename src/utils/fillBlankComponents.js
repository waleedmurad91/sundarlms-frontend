export const FILL_BLANK_TYPES = {
  STATEMENT: "statement",
  BLANK: "blank",
  POWER: "power",
  FRACTION: "fraction",
  MIXED_NUMBER: "mixed_number",
  LINE_BREAK: "line_break",
};

const normalizeType = (rawType) => {
  const value = String(rawType ?? "").toLowerCase();
  if (value === "blank" || value === "fill" || value === "input") {
    return FILL_BLANK_TYPES.BLANK;
  }
  if (value === "power" || value === "exponent") {
    return FILL_BLANK_TYPES.POWER;
  }
  if (value === "fraction") {
    return FILL_BLANK_TYPES.FRACTION;
  }
  if (value === "mixed_number" || value === "mixednumber" || value === "mixed") {
    return FILL_BLANK_TYPES.MIXED_NUMBER;
  }
  if (value === "line_break" || value === "linebreak" || value === "br") {
    return FILL_BLANK_TYPES.LINE_BREAK;
  }
  return FILL_BLANK_TYPES.STATEMENT;
};

export const getFillBlankComponentType = (component) =>
  normalizeType(component?.type);

export const getFillBlankComponentId = (component, index) =>
  component?.id ?? `component-${index}`;

export const getFillBlankInputSlots = (components = []) => {
  const slots = [];
  components.forEach((component, index) => {
    const type = getFillBlankComponentType(component);
    const baseId = getFillBlankComponentId(component, index);
    if (type === FILL_BLANK_TYPES.BLANK) {
      slots.push({ id: baseId, type, part: "answer" });
    } else if (type === FILL_BLANK_TYPES.POWER) {
      slots.push({ id: `${baseId}-base`, type, part: "base" });
      slots.push({ id: `${baseId}-exp`, type, part: "exponent" });
    } else if (type === FILL_BLANK_TYPES.FRACTION) {
      slots.push({ id: `${baseId}-num`, type, part: "numerator" });
      slots.push({ id: `${baseId}-den`, type, part: "denominator" });
    } else if (type === FILL_BLANK_TYPES.MIXED_NUMBER) {
      slots.push({ id: `${baseId}-whole`, type, part: "whole" });
      slots.push({ id: `${baseId}-num`, type, part: "numerator" });
      slots.push({ id: `${baseId}-den`, type, part: "denominator" });
    }
  });
  return slots;
};

export const buildFillBlankStateFromAnswers = (
  components = [],
  answers = []
) => {
  const slots = getFillBlankInputSlots(components);
  const map = {};
  slots.forEach((slot, index) => {
    map[slot.id] = answers[index] ?? "";
  });
  return map;
};

export const buildFillBlankAnswersFromState = (
  components = [],
  state = {}
) => getFillBlankInputSlots(components).map((slot) => state[slot.id] ?? "");

export const hasFillBlankResponse = (components = [], state = {}) =>
  getFillBlankInputSlots(components).some((slot) => {
    const value = state[slot.id];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
