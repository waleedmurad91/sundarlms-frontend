export const extractFirstImagePath = (input) => {
  if (!input) {
    return "";
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const resolved = extractFirstImagePath(item);
      if (resolved) {
        return resolved;
      }
    }
    return "";
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      return "";
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractFirstImagePath(parsed);
      } catch (err) {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (typeof input === "object") {
    const candidate =
      input?.url ??
      input?.path ??
      input?.file ??
      input?.src ??
      input?.value ??
      input?.image ??
      null;
    return extractFirstImagePath(candidate);
  }

  return "";
};
