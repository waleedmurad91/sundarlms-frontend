/**
 * Shared question / solution translation helpers.
 * Native Urdu/Sindhi fields are preferred per field; Google Translate is used
 * only for fields that do not have native content.
 */

import { extractPlainText, translateText } from "@/utils/translate";

export const hasRealContent = (html) => {
  if (!html) return false;
  const text = String(html)
    .replace(/<[^>]*>/g, "")
    .trim();
  return text.length > 0;
};

export const googleTranslateHtml = async (text, targetLang, signal) => {
  if (!text?.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, signal ? { signal } : undefined);
    const json = await res.json();
    return json[0]?.map((chunk) => chunk[0]).join("") ?? text;
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    return text;
  }
};

/** Plain-text translation for solution steps (handles math tokens, shorter URLs). */
export const translateSolutionHtml = async (text, targetLang, signal) => {
  if (!text?.trim()) return text;
  const plain = extractPlainText(text);
  if (!plain) return text;
  try {
    const translated = await translateText(plain, targetLang, signal);
    return translated.replace(/\n/g, "<br />");
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    return text;
  }
};

export const getNativeQuestionText = (source, langKey) => {
  if (langKey === "ur") {
    return (
      source?.question_text_urdu ??
      source?.questionTextUrdu ??
      source?.question_text_Urdu ??
      ""
    );
  }
  if (langKey === "sd") {
    return (
      source?.question_text_sindhi ??
      source?.questionTextSindhi ??
      source?.question_text_Sindhi ??
      ""
    );
  }
  return "";
};

export const getNativeSolutionExplanation = (step, langKey) => {
  if (!step) return "";
  if (langKey === "ur") {
    return step.explanation_urdu ?? step.explanationUrdu ?? "";
  }
  if (langKey === "sd") {
    return step.explanation_sindhi ?? step.explanationSindhi ?? "";
  }
  return "";
};

export const getNativeOptionText = (option, langKey) => {
  if (!option) return "";
  if (langKey === "ur") {
    return option.text_urdu ?? option.textUrdu ?? "";
  }
  if (langKey === "sd") {
    return option.text_sindhi ?? option.textSindhi ?? "";
  }
  return "";
};

export const resolveQuestionText = async ({
  langKey,
  originalText = "",
  nativeText = "",
  translate = googleTranslateHtml,
  signal,
}) => {
  if (langKey === "en") return originalText ?? "";
  if (hasRealContent(nativeText)) return nativeText;
  if (!hasRealContent(originalText)) return originalText ?? "";
  return translate(originalText, langKey, signal);
};

export const resolveSolutionExplanation = async ({
  langKey,
  step,
  nativeStep,
  translate = googleTranslateHtml,
  signal,
}) => {
  const original = step?.explanation ?? step?.text ?? "";
  if (langKey === "en") return original;

  const nativeExplanation =
    getNativeSolutionExplanation(nativeStep, langKey) ||
    getNativeSolutionExplanation(step, langKey);

  if (hasRealContent(nativeExplanation)) return nativeExplanation;
  if (!hasRealContent(original)) return original;
  return translate(original, langKey, signal);
};

export const resolveSolutionSteps = async ({
  langKey,
  steps = [],
  nativeSteps = [],
  translate = googleTranslateHtml,
  signal,
}) =>
  Promise.all(
    (steps ?? []).map(async (step, index) => {
      const explanation = await resolveSolutionExplanation({
        langKey,
        step,
        nativeStep: nativeSteps[index],
        translate,
        signal,
      });
      return {
        ...step,
        explanation,
        translatedExplanation: langKey === "en" ? undefined : explanation,
      };
    }),
  );

export const resolveOptions = async ({
  langKey,
  options = [],
  translate = googleTranslateHtml,
  signal,
}) =>
  Promise.all(
    (options ?? []).map(async (option) => {
      const text = option?.text ?? "";
      if (langKey === "en") {
        return { ...option, translatedText: text };
      }
      const nativeText = getNativeOptionText(option, langKey);
      const translatedText = hasRealContent(nativeText)
        ? nativeText
        : hasRealContent(text)
          ? await translate(text, langKey, signal)
          : text;
      return { ...option, translatedText };
    }),
  );

/**
 * Build a full translation bundle for admin preview / detail views.
 */
export const buildQuestionLanguageBundle = async ({
  langKey,
  questionText = "",
  nativeQuestionText = "",
  options = [],
  solutionSteps = [],
  nativeSolutionSteps = [],
  translate = googleTranslateHtml,
  signal,
}) => {
  if (langKey === "en") {
    return {
      questionText,
      options: (options ?? []).map((opt) => ({
        ...opt,
        translatedText: opt?.text ?? "",
      })),
      solutionSteps: solutionSteps ?? [],
      source: "api",
    };
  }

  const resolvedQuestionText = await resolveQuestionText({
    langKey,
    originalText: questionText,
    nativeText: nativeQuestionText,
    translate,
    signal,
  });

  const resolvedOptions = await resolveOptions({
    langKey,
    options,
    translate,
    signal,
  });

  const resolvedSolutionSteps = await resolveSolutionSteps({
    langKey,
    steps: solutionSteps,
    nativeSteps: nativeSolutionSteps,
    translate,
    signal,
  });

  const questionFromApi = hasRealContent(nativeQuestionText);
  const solutionsFromApi = (solutionSteps ?? []).every((step, index) => {
    const native =
      getNativeSolutionExplanation(nativeSolutionSteps[index], langKey) ||
      getNativeSolutionExplanation(step, langKey);
    return !hasRealContent(step?.explanation ?? "") || hasRealContent(native);
  });

  return {
    questionText: resolvedQuestionText,
    options: resolvedOptions,
    solutionSteps: resolvedSolutionSteps,
    source: questionFromApi && solutionsFromApi ? "api" : "google",
  };
};

/**
 * Map solution steps for preview when a translation cache may contain
 * Google-translated explanations (string[]) or fully resolved step objects.
 */
export const mapSolutionStepsForDisplay = (
  steps = [],
  langKey,
  {
    nativeSteps = [],
    cachedSolutionSteps = [],
    cachedSource = null,
  } = {},
) =>
  (steps ?? []).map((step, index) => {
    let explanation = step?.explanation ?? step?.text ?? "";

    if (langKey !== "en") {
      const nativeStep = nativeSteps[index] ?? {};
      const nativeExplanation =
        getNativeSolutionExplanation(nativeStep, langKey) ||
        getNativeSolutionExplanation(step, langKey);

      if (hasRealContent(nativeExplanation)) {
        explanation = nativeExplanation;
      } else if (Array.isArray(cachedSolutionSteps)) {
        const cachedEntry = cachedSolutionSteps[index];
        if (typeof cachedEntry === "string" && hasRealContent(cachedEntry)) {
          explanation = cachedEntry;
        } else if (
          cachedEntry &&
          typeof cachedEntry === "object" &&
          hasRealContent(
            cachedEntry.translatedExplanation ?? cachedEntry.explanation,
          )
        ) {
          explanation =
            cachedEntry.translatedExplanation ?? cachedEntry.explanation;
        } else if (cachedSource === "google" && hasRealContent(explanation)) {
          // explanation stays English until cache fills; caller should use bundle
        }
      }
    }

    return { ...step, explanation };
  });

/**
 * Resolve player question text with an in-memory cache.
 */
export const resolveCachedQuestionText = async ({
  question,
  langKey,
  cacheRef,
  translate = googleTranslateHtml,
  onTranslatingChange,
  signal,
}) => {
  if (!question) return "";
  const questionKey = question.question_id ?? question.id;
  const originalText = question.question_text ?? "";

  if (langKey === "en" || !questionKey) return originalText;

  const cacheForQuestion = cacheRef.current[questionKey];
  if (cacheForQuestion?.[langKey] !== undefined) {
    return cacheForQuestion[langKey];
  }

  const nativeText = getNativeQuestionText(question, langKey);
  if (hasRealContent(nativeText)) {
    cacheRef.current[questionKey] = {
      ...(cacheRef.current[questionKey] || {}),
      [langKey]: nativeText,
    };
    return nativeText;
  }

  if (!hasRealContent(originalText)) return originalText;

  onTranslatingChange?.(true);
  try {
    const translated = await resolveQuestionText({
      langKey,
      originalText,
      nativeText,
      translate,
      signal,
    });
    cacheRef.current[questionKey] = {
      ...(cacheRef.current[questionKey] || {}),
      [langKey]: translated,
    };
    return translated;
  } finally {
    onTranslatingChange?.(false);
  }
};
