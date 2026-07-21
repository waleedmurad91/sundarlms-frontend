import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { renderMathHtml } from "@/utils/renderMathHtml";
import {
  FILL_BLANK_TYPES,
  getFillBlankComponentId,
  getFillBlankComponentType,
} from "@/utils/fillBlankComponents";
import {
  isAlgebraAnswerComplete,
  normalizeAlgebraFormats,
} from "@/utils/algebraFormat";
import {
  resolveDragDropMode,
  resolveDragDropLabels,
  resolveDragDropItems,
  resolveDragDropBlanks,
} from "@/utils/dragDropQuestion";
import { extractPlainText, translateText } from "@/utils/translate";
import { hasRealContent } from "@/utils/questionTranslation";

const ANNOTATION_MIN_WIDTH = 30;
const DRAG_DROP_DEFAULT_WIDTH = 140;
const DRAG_DROP_DEFAULT_HEIGHT = 48;
const BACKEND_FILE_BASE_PATH = import.meta.env.VITE_BACKEND_FILE_BASE_PATH;

const buildImageUrl = (src) => {
  if (!src) return "";
  if (
    src.startsWith("http") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  )
    return src;
  return `${BACKEND_FILE_BASE_PATH}/${src}`;
};

const normalizeCorrectAnswerValue = (value) => {
  if (value && typeof value === "object") {
    const candidates = [
      value.value,
      value.correct_answer,
      value.answer,
      value.text,
      value.id,
      value.option_id,
      value.optionId,
    ];
    const first = candidates.find(
      (entry) =>
        entry !== undefined &&
        entry !== null &&
        !(typeof entry === "string" && entry.trim() === ""),
    );
    if (first !== undefined) {
      return first;
    }
  }
  return value;
};

const clampPercent = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Math.min(100, Math.max(0, fallback));
  return Math.min(100, Math.max(0, numeric));
};

const normalizeAnnotationFields = (fields = []) =>
  fields
    .map((field, index) => {
      if (!field) return null;
      const widthValue =
        field?.width ?? field?.inputWidth ?? field?.input_width ?? null;
      return {
        id: field?.id ?? field?.field_id ?? `annotation-${index}`,
        label: field?.label ?? field?.name ?? "",
        labelPosition:
          field?.labelPosition === "right" || field?.label_position === "right"
            ? "right"
            : "left",
        width:
          Number.isFinite(Number(widthValue)) && Number(widthValue) > 0
            ? Number(widthValue)
            : 160,
        x: clampPercent(
          field?.x ??
            field?.left ??
            field?.position?.x ??
            field?.position_x ??
            field?.positionX,
          10,
        ),
        y: clampPercent(
          field?.y ??
            field?.top ??
            field?.position?.y ??
            field?.position_y ??
            field?.positionY,
          10,
        ),
      };
    })
    .filter(Boolean);

// ─── Gate: does this question have a native Urdu/Sindhi question_text? ───────
// There is no native per-option / per-label translation available from the
// backend. Instead, `question_text_urdu` / `question_text_sindhi` act as a
// flag: if the question has been translated at all (i.e. that field is
// populated), we're allowed to machine-translate the *options* and *input
// labels* for that question via translateText. If it's empty, we leave
// options/labels in English entirely instead of silently falling back to a
// translation the question wasn't actually marked as supporting.
const getNativeFieldForLanguage = (question, langKey) => {
  if (!question) return "";
  if (langKey === "ur") {
    return question?.question_text_urdu ?? question?.questionTextUrdu ?? "";
  }
  if (langKey === "sd") {
    return question?.question_text_sindhi ?? question?.questionTextSindhi ?? "";
  }
  return "";
};

const canTranslateOptions = (question, langKey) => {
  if (!question || langKey === "en") return false;
  return hasRealContent(getNativeFieldForLanguage(question, langKey));
};

const renderComponentSequence = (
  components = [],
  values = {},
  onChange,
  disableInputs = false,
  translatedStatements = {},
  langFontClass = "",
  isRtl = false,
) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${isRtl ? "justify-start" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {components.map((comp, idx) => {
        const type = getFillBlankComponentType(comp);
        const baseId = getFillBlankComponentId(comp, idx);
        if (type === FILL_BLANK_TYPES.STATEMENT) {
          const rawText = comp.text ?? comp.statement ?? "";
          const displayText = translatedStatements[idx] ?? rawText;
          return (
            <span
              key={`${baseId}-statement`}
              className={`text-slate-800 ${isRtl ? "leading-8" : ""} ${langFontClass}`}
              dir={isRtl ? "rtl" : "ltr"}
              dangerouslySetInnerHTML={{
                __html: renderMathHtml(displayText),
              }}
            />
          );
        }
        if (type === FILL_BLANK_TYPES.LINE_BREAK) {
          return <span key={`${baseId}-break`} className="basis-full h-0" />;
        }
        if (type === FILL_BLANK_TYPES.BLANK) {
          const id = baseId;
          return (
            <input
              key={id}
              value={values[id] || ""}
              disabled={disableInputs}
              onChange={(e) => onChange(id, e.target.value)}
              className={`[field-sizing:content] min-w-[10ch] max-w-full border border-slate-300 rounded px-2 py-1 `}
              style={{ direction: "ltr" }}
            />
          );
        }
        if (type === FILL_BLANK_TYPES.POWER) {
          const baseKey = `${baseId}-base`;
          const expKey = `${baseId}-exp`;
          return (
            <span
              key={`${baseId}-power`}
              className="inline-flex items-start gap-1"
            >
              <input
                value={values[baseKey] || ""}
                disabled={disableInputs}
                onChange={(e) => onChange(baseKey, e.target.value)}
                className="w-16 border border-slate-300 rounded px-2 py-1"
              />
              <input
                value={values[expKey] || ""}
                disabled={disableInputs}
                onChange={(e) => onChange(expKey, e.target.value)}
                className="w-10 border border-slate-300 rounded px-2 py-1 text-xs"
              />
            </span>
          );
        }
        if (type === FILL_BLANK_TYPES.FRACTION) {
          const numKey = `${baseId}-num`;
          const denKey = `${baseId}-den`;
          return (
            <span
              key={`${baseId}-fraction`}
              className="inline-flex flex-col items-center"
            >
              <input
                value={values[numKey] || ""}
                disabled={disableInputs}
                onChange={(e) => onChange(numKey, e.target.value)}
                className="w-16 border border-slate-300 rounded-t px-2 py-1 text-center"
              />
              <span className="block h-px w-full bg-slate-300" />
              <input
                value={values[denKey] || ""}
                disabled={disableInputs}
                onChange={(e) => onChange(denKey, e.target.value)}
                className="w-16 border border-slate-300 rounded-b px-2 py-1 text-center"
              />
            </span>
          );
        }
        if (type === FILL_BLANK_TYPES.MIXED_NUMBER) {
          const wholeKey = `${baseId}-whole`;
          const numKey = `${baseId}-num`;
          const denKey = `${baseId}-den`;
          return (
            <span
              key={`${baseId}-mixed-number`}
              className="inline-flex items-center gap-2"
            >
              <input
                value={values[wholeKey] || ""}
                disabled={disableInputs}
                onChange={(e) => onChange(wholeKey, e.target.value)}
                className="w-12 border border-slate-300 rounded px-2 py-1 text-center"
              />
              <span className="inline-flex flex-col items-center">
                <input
                  value={values[numKey] || ""}
                  disabled={disableInputs}
                  onChange={(e) => onChange(numKey, e.target.value)}
                  className="w-12 border border-slate-300 rounded-t px-2 py-1 text-center"
                />
                <span className="block h-px w-full bg-slate-300" />
                <input
                  value={values[denKey] || ""}
                  disabled={disableInputs}
                  onChange={(e) => onChange(denKey, e.target.value)}
                  className="w-12 border border-slate-300 rounded-b px-2 py-1 text-center"
                />
              </span>
            </span>
          );
        }
        return null;
      })}
    </div>
  );
};

// ─── Option translation hook ──────────────────────────────────────────────────
// Only fetches/returns translations when `enabled` is true (i.e. the question
// has a native question_text translation for this language). Otherwise it's a
// no-op and the caller renders the original English option text.
const useTranslatedOptions = (
  options = [],
  selectedLanguage = "en",
  enabled = false,
) => {
  const optionsKey = options.map((o) => `${o.id}:${o.text ?? ""}`).join("|");

  const cacheRef = useRef({});
  const abortRef = useRef(null);
  const [translatedMap, setTranslatedMap] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);

  const prevOptionsKeyRef = useRef(optionsKey);
  if (prevOptionsKeyRef.current !== optionsKey) {
    prevOptionsKeyRef.current = optionsKey;
    cacheRef.current = {};
  }

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (
      !enabled ||
      selectedLanguage === "en" ||
      !options.length ||
      options.every((opt) => opt.is_image === true || opt.is_image === "1")
    ) {
      setTranslatedMap({});
      setIsTranslating(false);
      return undefined;
    }

    if (cacheRef.current[selectedLanguage]) {
      setTranslatedMap(cacheRef.current[selectedLanguage]);
      return undefined;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsTranslating(true);

    const textOptions = options.filter(
      (opt) =>
        opt.is_image !== true && opt.is_image !== "1" && opt.text?.trim(),
    );

    Promise.all(
      textOptions.map((opt) =>
        translateText(
          extractPlainText(opt.text),
          selectedLanguage,
          controller.signal,
        )
          .then((translated) => ({ id: opt.id, translated }))
          .catch(() => ({ id: opt.id, translated: null })),
      ),
    ).then((results) => {
      if (abortRef.current !== controller) return;
      const map = {};
      results.forEach(({ id, translated }) => {
        if (translated) map[id] = translated;
      });
      cacheRef.current[selectedLanguage] = map;
      setTranslatedMap(map);
      setIsTranslating(false);
      abortRef.current = null;
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey, selectedLanguage, enabled]);

  return { translatedMap, isTranslating };
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Fill-blank statement translation hook ────────────────────────────────────
// Statements are the label text inside a fill-in-the-blank question (e.g.
// "The capital of France is ___"). Same gating as options: only translate
// when the question has a native translation flag for this language.
const useTranslatedStatements = (
  components = [],
  selectedLanguage = "en",
  enabled = false,
) => {
  const statementsKey = components
    .filter((c) => getFillBlankComponentType(c) === FILL_BLANK_TYPES.STATEMENT)
    .map((c) => c.text ?? c.statement ?? "")
    .join("|");

  const cacheRef = useRef({});
  const abortRef = useRef(null);
  const [translatedStatements, setTranslatedStatements] = useState({});

  const prevKeyRef = useRef(statementsKey);
  if (prevKeyRef.current !== statementsKey) {
    prevKeyRef.current = statementsKey;
    cacheRef.current = {};
  }

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (!enabled || selectedLanguage === "en" || !components.length) {
      setTranslatedStatements({});
      return undefined;
    }

    if (cacheRef.current[selectedLanguage]) {
      setTranslatedStatements(cacheRef.current[selectedLanguage]);
      return undefined;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const statementComponents = components
      .map((c, idx) => ({ c, idx }))
      .filter(
        ({ c }) =>
          getFillBlankComponentType(c) === FILL_BLANK_TYPES.STATEMENT &&
          (c.text ?? c.statement ?? "").trim(),
      );

    Promise.all(
      statementComponents.map(({ c, idx }) =>
        translateText(
          extractPlainText(c.text ?? c.statement ?? ""),
          selectedLanguage,
          controller.signal,
        )
          .then((translated) => ({ idx, translated }))
          .catch(() => ({ idx, translated: null })),
      ),
    ).then((results) => {
      if (abortRef.current !== controller) return;
      const map = {};
      results.forEach(({ idx, translated }) => {
        if (translated) map[idx] = translated;
      });
      cacheRef.current[selectedLanguage] = map;
      setTranslatedStatements(map);
      abortRef.current = null;
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statementsKey, selectedLanguage, enabled]);

  return translatedStatements;
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Annotation field label translation hook ──────────────────────────────────
// Translates the small text labels next to image-annotation input fields
// (e.g. "Length:", "Angle:"). Same gating as everything else above.
const useTranslatedLabels = (
  fields = [],
  selectedLanguage = "en",
  enabled = false,
) => {
  const labelsKey = fields.map((f) => `${f.id}:${f.label ?? ""}`).join("|");

  const cacheRef = useRef({});
  const abortRef = useRef(null);
  const [translatedMap, setTranslatedMap] = useState({});

  const prevKeyRef = useRef(labelsKey);
  if (prevKeyRef.current !== labelsKey) {
    prevKeyRef.current = labelsKey;
    cacheRef.current = {};
  }

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (!enabled || selectedLanguage === "en" || !fields.length) {
      setTranslatedMap({});
      return undefined;
    }

    if (cacheRef.current[selectedLanguage]) {
      setTranslatedMap(cacheRef.current[selectedLanguage]);
      return undefined;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const labelFields = fields.filter((f) => (f.label ?? "").trim());

    Promise.all(
      labelFields.map((f) =>
        translateText(
          extractPlainText(f.label),
          selectedLanguage,
          controller.signal,
        )
          .then((translated) => ({ id: f.id, translated }))
          .catch(() => ({ id: f.id, translated: null })),
      ),
    ).then((results) => {
      if (abortRef.current !== controller) return;
      const map = {};
      results.forEach(({ id, translated }) => {
        if (translated) map[id] = translated;
      });
      cacheRef.current[selectedLanguage] = map;
      setTranslatedMap(map);
      abortRef.current = null;
    });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelsKey, selectedLanguage, enabled]);

  return translatedMap;
};
// ─────────────────────────────────────────────────────────────────────────────

const AnswerOptions = ({
  question,
  value,
  onChange,
  multiple = false,
  componentsState = {},
  onChangeComponent,
  selectedFormat,
  onFormatChange,
  evaluationStatus,
  disableSelection = false,
  disableInputs = false,
  selectedLanguage = "en",
}) => {
  if (!question) return null;
  const {
    question_type,
    options = [],
    answer_type,
    components = [],
  } = question;

  // Gate: this question only gets its options/labels translated if it has a
  // native question_text_urdu / question_text_sindhi value for the selected
  // language. Otherwise everything below renders in English, LTR.
  const translationEnabled = canTranslateOptions(question, selectedLanguage);

  // ── Derive font/RTL from selected language (needed before early returns) ──
  // Only apply RTL/native-font styling when translation is actually enabled
  // for this question — untranslated (English) content always stays LTR.
  const langFontClass = translationEnabled
    ? selectedLanguage === "ur"
      ? "font-nastaleeq"
      : selectedLanguage === "sd"
        ? "font-lateefi"
        : ""
    : "";
  const isRtl =
    translationEnabled &&
    (selectedLanguage === "ur" || selectedLanguage === "sd");

  const { translatedMap, isTranslating: isTranslatingOptions } =
    useTranslatedOptions(
      question_type === "mcq" || question_type === "check_box" ? options : [],
      selectedLanguage,
      translationEnabled,
    );

  const translatedStatements = useTranslatedStatements(
    question_type === "fill_blank" ? components : [],
    selectedLanguage,
    translationEnabled,
  );

  // Pre-compute annotation fields and drag-drop labels up front (not inside
  // the per-type `if` blocks below) so their translation hooks can be called
  // unconditionally on every render, regardless of question_type.
  const annotationFieldsForTranslation = useMemo(() => {
    if (question_type !== "image_annotation") return [];
    const rawAnnotationFields = Array.isArray(question.annotation_fields)
      ? question.annotation_fields
      : Array.isArray(question.annotationFields)
        ? question.annotationFields
        : Array.isArray(question.annotation_inputs)
          ? question.annotation_inputs
          : Array.isArray(question.annotationInputs)
            ? question.annotationInputs
            : Array.isArray(question.annotation?.fields)
              ? question.annotation.fields
              : [];
    return normalizeAnnotationFields(rawAnnotationFields);
  }, [question, question_type]);

  const translatedAnnotationLabels = useTranslatedLabels(
    annotationFieldsForTranslation,
    selectedLanguage,
    translationEnabled,
  );

  const dragDropRawLabelsForTranslation = useMemo(() => {
    if (question_type !== "drag_drop") return [];
    return resolveDragDropLabels(question);
  }, [question, question_type]);

  const dragDropLabelInputsForTranslation = useMemo(
    () =>
      dragDropRawLabelsForTranslation.map((l) => ({
        id: l.id,
        label: l.text,
      })),
    [dragDropRawLabelsForTranslation],
  );

  const translatedDragDropLabels = useTranslatedLabels(
    dragDropLabelInputsForTranslation,
    selectedLanguage,
    translationEnabled,
  );

  const questionKey =
    question?.quiz_question_id ??
    question?.assignment_question_id ??
    question?.unit_test_question_id ??
    question?.question_id ??
    question?.questionId ??
    question?.id ??
    question?.uuid ??
    "";
  const stableQuestionKey = questionKey ? String(questionKey) : "";
  const algebraFormats = useMemo(() => {
    if (question_type !== "algebra") return [];
    const rawFormats =
      question.algebra_formats ??
      question.answer_formats ??
      question.algebraFormats ??
      question.answerFormats ??
      question.formats ??
      [];
    return normalizeAlgebraFormats({
      rawFormats,
      correctFormatKey:
        question.correct_format ??
        question.correctFormat ??
        question.correct_format_key,
      correctAnswerValues: Array.isArray(question.correct_answers)
        ? question.correct_answers.map((entry) =>
            entry !== undefined && entry !== null ? String(entry) : "",
          )
        : [],
    });
  }, [question, question_type]);

  const dragDropLabelMeasureRef = useRef(null);
  const [dragDropLabelWidth, setDragDropLabelWidth] = useState(0);

  useLayoutEffect(() => {
    if (question_type !== "drag_drop") return;
    const measureEl = dragDropLabelMeasureRef.current;
    if (!measureEl) return;
    const labels = resolveDragDropLabels(question)
      .map((label) => String(label?.text ?? "").trim())
      .filter(Boolean);
    if (!labels.length) {
      if (dragDropLabelWidth !== 0) setDragDropLabelWidth(0);
      return;
    }
    let maxWidth = 0;
    labels.forEach((text) => {
      measureEl.textContent = text;
      maxWidth = Math.max(maxWidth, measureEl.offsetWidth);
    });
    if (maxWidth !== dragDropLabelWidth) {
      setDragDropLabelWidth(maxWidth);
    }
  }, [question, question_type, dragDropLabelWidth]);

  const enabledAlgebraFormats = algebraFormats.filter(
    (format) => format.enabled,
  );
  const correctFormatKey = String(
    question?.correct_format ?? question?.correctFormat ?? "",
  )
    .trim()
    .toLowerCase();
  const activeDefaultFormat =
    enabledAlgebraFormats.find((format) => format.key === correctFormatKey)
      ?.key ??
    enabledAlgebraFormats[0]?.key ??
    "";
  const isFormatControlled = selectedFormat !== undefined;
  const [activeAlgebraFormat, setActiveAlgebraFormat] =
    useState(activeDefaultFormat);
  const [algebraFormatByQuestion, setAlgebraFormatByQuestion] = useState({});
  const lastQuestionKeyRef = useRef("");
  const [algebraValuesMap, setAlgebraValuesMap] = useState(() => {
    if (Array.isArray(value) && activeDefaultFormat) {
      return { [activeDefaultFormat]: value };
    }
    return {};
  });

  useEffect(() => {
    if (question_type !== "algebra") return;
    const resolvedKey = stableQuestionKey || String(questionKey || "");
    const storedFormat = resolvedKey
      ? algebraFormatByQuestion[resolvedKey]
      : "";
    const nextFormat = selectedFormat || storedFormat || activeDefaultFormat;
    const isNewQuestion =
      resolvedKey && lastQuestionKeyRef.current !== resolvedKey;

    if (isNewQuestion) {
      lastQuestionKeyRef.current = resolvedKey;
    }

    setActiveAlgebraFormat(nextFormat);
    setAlgebraValuesMap((prev) => {
      if (isNewQuestion) {
        if (Array.isArray(value) && nextFormat) {
          return { [nextFormat]: value };
        }
        return {};
      }
      if (Array.isArray(value) && nextFormat) {
        return { ...prev, [nextFormat]: value };
      }
      return prev;
    });
    if (resolvedKey && nextFormat && !storedFormat) {
      setAlgebraFormatByQuestion((prev) => ({
        ...prev,
        [resolvedKey]: nextFormat,
      }));
    }
    if (!isFormatControlled && typeof onFormatChange === "function") {
      onFormatChange(nextFormat);
    }
  }, [
    questionKey,
    question_type,
    activeDefaultFormat,
    stableQuestionKey,
    algebraFormatByQuestion,
    selectedFormat,
    value,
    isFormatControlled,
    onFormatChange,
  ]);

  useEffect(() => {
    if (question_type !== "algebra") return;
    if (!activeAlgebraFormat && activeDefaultFormat) {
      setActiveAlgebraFormat(activeDefaultFormat);
    }
  }, [question_type, activeDefaultFormat, activeAlgebraFormat, value]);

  const handleAlgebraValueChange = (formatKey, index, nextValue) => {
    setAlgebraValuesMap((prev) => {
      const existing = Array.isArray(prev[formatKey]) ? prev[formatKey] : [];
      const nextValues = [...existing];
      nextValues[index] = nextValue;
      const nextMap = { ...prev, [formatKey]: nextValues };
      if (typeof onChange === "function") {
        onChange(nextValues);
      }
      return nextMap;
    });
  };

  const renderAlgebraButtonPreview = (formatKey) => {
    if (formatKey === "whole_number") {
      return (
        <span className="h-4 w-6 rounded border border-slate-300 bg-[#D5D8DE]" />
      );
    }
    if (formatKey === "fraction") {
      return (
        <span className="flex flex-col items-center gap-0.5">
          <span className="h-2 w-5 rounded border border-slate-300 bg-[#D5D8DE]" />
          <span className="h-px w-8 bg-slate-300" />
          <span className="h-2 w-5 rounded border border-slate-300 bg-[#D5D8DE]" />
        </span>
      );
    }
    if (formatKey === "mixed_number") {
      return (
        <span className="flex items-center gap-1">
          <span className="h-4 w-2 rounded border border-slate-300 bg-[#D5D8DE]" />
          <span className="flex flex-col items-center gap-0.5">
            <span className="h-2 w-4 rounded border border-slate-300 bg-[#D5D8DE]" />
            <span className="h-px w-6 bg-slate-300" />
            <span className="h-2 w-4 rounded border border-slate-300 bg-[#D5D8DE]" />
          </span>
        </span>
      );
    }
    if (formatKey === "base_exponent") {
      return (
        <span className="flex items-start gap-1">
          <span className="h-3 w-4 rounded border border-slate-300 bg-[#D5D8DE]" />
          <span className="h-2 w-2 rounded border border-slate-300 bg-[#D5D8DE]" />
        </span>
      );
    }
    if (formatKey === "decimal") {
      return (
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded border border-slate-300 bg-[#D5D8DE]" />
          <span className="text-slate-400">.</span>
          <span className="h-3 w-3 rounded border border-slate-300 bg-[#D5D8DE]" />
        </span>
      );
    }
    return null;
  };

  const renderSelectedAlgebraInputs = (formatKey, values = []) => {
    const updateValue = (index) => (event) =>
      handleAlgebraValueChange(formatKey, index, event.target.value);

    if (formatKey === "fraction") {
      return (
        <div className="flex flex-col items-center gap-1">
          <input
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center"
            value={values[0] ?? ""}
            onChange={updateValue(0)}
            disabled={disableInputs}
          />
          <span className="block h-px w-full bg-slate-300" />
          <input
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center"
            value={values[1] ?? ""}
            onChange={updateValue(1)}
            disabled={disableInputs}
          />
        </div>
      );
    }

    if (formatKey === "mixed_number") {
      return (
        <div className="flex items-center gap-2">
          <input
            className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center"
            value={values[0] ?? ""}
            onChange={updateValue(0)}
            disabled={disableInputs}
          />
          <div className="flex flex-col items-center gap-1">
            <input
              className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center"
              value={values[1] ?? ""}
              onChange={updateValue(1)}
              disabled={disableInputs}
            />
            <span className="block h-px w-full bg-slate-300" />
            <input
              className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-center"
              value={values[2] ?? ""}
              onChange={updateValue(2)}
              disabled={disableInputs}
            />
          </div>
        </div>
      );
    }

    if (formatKey === "base_exponent") {
      return (
        <div className="flex items-start gap-2">
          <input
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center"
            value={values[0] ?? ""}
            onChange={updateValue(0)}
            disabled={disableInputs}
          />
          <input
            className="w-12 rounded border border-slate-300 bg-white px-2 py-1 text-center text-xs"
            value={values[1] ?? ""}
            onChange={updateValue(1)}
            disabled={disableInputs}
          />
        </div>
      );
    }

    if (formatKey === "decimal") {
      return (
        <div className="flex items-center gap-2">
          <input
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center"
            value={values[0] ?? ""}
            onChange={updateValue(0)}
            disabled={disableInputs}
          />
          <span className="text-slate-400">.</span>
          <input
            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center"
            value={values[1] ?? ""}
            onChange={updateValue(1)}
            disabled={disableInputs}
          />
        </div>
      );
    }

    return (
      <input
        className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-center"
        value={values[0] ?? ""}
        onChange={updateValue(0)}
        disabled={disableInputs}
      />
    );
  };

  const correctAnswers = Array.isArray(question.correct_answers)
    ? question.correct_answers
    : [];
  const normalizedCorrectAnswers = correctAnswers
    .map((entry) => normalizeCorrectAnswerValue(entry))
    .map((val) => String(val ?? ""))
    .filter((val) => val !== "");

  if (question_type === "fill_blank" && components?.length) {
    return renderComponentSequence(
      components,
      componentsState,
      onChangeComponent,
      disableInputs,
      translatedStatements,
      langFontClass,
      isRtl,
    );
  }

  if (question_type === "algebra") {
    const selectedFormatEntry =
      enabledAlgebraFormats.find((format) => {
        const key = isFormatControlled ? selectedFormat : activeAlgebraFormat;
        return format.key === key;
      }) ??
      enabledAlgebraFormats[0] ??
      null;
    const selectedValues = selectedFormatEntry
      ? (algebraValuesMap[selectedFormatEntry.key] ?? [])
      : [];
    const selectedComplete = selectedFormatEntry
      ? isAlgebraAnswerComplete(selectedFormatEntry.key, selectedValues)
      : false;

    return (
      <div className="space-y-4 flex items-center justify-center">
        <div className="flex flex-wrap flex-col gap-3 mt-3 mr-3">
          {enabledAlgebraFormats.map((format) => {
            const isActive = format.key === selectedFormatEntry?.key;
            const selectionDisabled = disableSelection || disableInputs;
            return (
              <button
                key={format.key}
                type="button"
                className={`border p-3 h-[50px] w-[50px] rounded-full text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                onClick={() => {
                  if (selectionDisabled) return;
                  if (!isFormatControlled) {
                    setActiveAlgebraFormat(format.key);
                  }
                  if (stableQuestionKey) {
                    setAlgebraFormatByQuestion((prev) => ({
                      ...prev,
                      [stableQuestionKey]: format.key,
                    }));
                  }
                  if (typeof onFormatChange === "function") {
                    onFormatChange(format.key);
                  }
                  if (!algebraValuesMap[format.key]) {
                    setAlgebraValuesMap((prev) => ({
                      ...prev,
                      [format.key]: [],
                    }));
                  }
                  if (typeof onChange === "function") {
                    const nextValues = algebraValuesMap[format.key] ?? [];
                    onChange(nextValues);
                  }
                }}
                disabled={selectionDisabled}
              >
                <span className="flex flex-col items-center gap-2">
                  {renderAlgebraButtonPreview(format.key)}
                </span>
              </button>
            );
          })}
        </div>

        {selectedFormatEntry ? (
          <div className="rounded-lg p-4 md:w-[26%]">
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {renderSelectedAlgebraInputs(
                selectedFormatEntry.key,
                selectedValues,
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No answer formats are available for this question.
          </p>
        )}
      </div>
    );
  }

  if (question_type === "image_annotation") {
    const annotationImage =
      question.annotation_image ??
      question.annotationImage ??
      question.annotation?.image ??
      "";
    const fields = annotationFieldsForTranslation;
    const translatedLabels = translatedAnnotationLabels;
    const fieldValues = componentsState || {};
    const handleFieldChange = (id, val) => {
      if (typeof onChangeComponent === "function") {
        onChangeComponent(id, val);
      }
    };

    return (
      <div className="space-y-3">
        <div className="relative w-full overflow-hidden rounded-lg">
          {annotationImage ? (
            <div className="overflow-x-auto overflow-y-hidden text-center">
              <div className="relative inline-block min-w-max">
                <img
                  src={buildImageUrl(annotationImage)}
                  alt=""
                  className="block max-h-[420px] w-auto max-w-none select-none pointer-events-none"
                />
                {fields.map((field, index) => {
                  const displayLabel =
                    translationEnabled && translatedLabels[field.id]
                      ? translatedLabels[field.id]
                      : field.label;
                  return (
                    <div
                      key={field.id}
                      className="absolute flex items-center gap-2"
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                      }}
                    >
                      {field.label && field.labelPosition !== "right" ? (
                        <span
                          dir={isRtl ? "rtl" : "ltr"}
                          className={`text-xs font-medium text-slate-700 whitespace-nowrap ${langFontClass}`}
                        >
                          {displayLabel}
                        </span>
                      ) : null}
                      <input
                        className="rounded border bg-white border-slate-300 px-2 py-1 text-sm"
                        style={{
                          width: `${Math.max(
                            ANNOTATION_MIN_WIDTH,
                            Number(field.width) || 160,
                          )}px`,
                        }}
                        value={fieldValues[field.id] ?? ""}
                        onChange={(e) =>
                          handleFieldChange(field.id, e.target.value)
                        }
                        disabled={disableInputs}
                        placeholder={`Field ${index + 1}`}
                      />
                      {field.label && field.labelPosition === "right" ? (
                        <span
                          dir={isRtl ? "rtl" : "ltr"}
                          className={`text-xs font-medium text-slate-700 whitespace-nowrap ${langFontClass}`}
                        >
                          {displayLabel}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-48 w-full items-center justify-center text-sm text-slate-500">
              Annotation image not available.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (question_type === "drag_drop") {
    const mode = resolveDragDropMode(question);
    const rawLabels = dragDropRawLabelsForTranslation;
    const items = resolveDragDropItems(question);
    const blanks = resolveDragDropBlanks(question);
    const translatedDragLabels = translatedDragDropLabels;
    const labels = rawLabels.map((label) => ({
      ...label,
      text:
        translationEnabled && translatedDragLabels[label.id]
          ? translatedDragLabels[label.id]
          : label.text,
    }));
    const diagram =
      question?.drag_drop_diagram ??
      question?.dragDropDiagram ??
      question?.drag_drop?.diagram ??
      {};
    const diagramImage =
      diagram?.image ??
      question?.drag_drop_diagram_image ??
      question?.dragDropDiagramImage ??
      "";
    const assignments = componentsState || {};
    const labelLookup = new Map(labels.map((label) => [label.id, label]));
    const targetList = mode === "diagram_labels" ? blanks : items;
    const assignedLabelIds = new Set(
      Object.values(assignments).filter((val) => val),
    );

    const applyAssignments = (nextMap) => {
      if (typeof onChangeComponent !== "function") {
        return;
      }
      Object.entries(nextMap).forEach(([id, val]) => {
        if (assignments[id] !== val) {
          onChangeComponent(id, val);
        }
      });
    };

    const assignLabelToTarget = (targetId, labelId) => {
      if (disableInputs || disableSelection) return;
      if (!targetId || !labelId) return;
      const label = labelLookup.get(labelId);
      const nextMap = { ...assignments, [targetId]: labelId };
      if (label && !label.reusable) {
        Object.entries(nextMap).forEach(([key, value]) => {
          if (key !== targetId && value === labelId) {
            nextMap[key] = "";
          }
        });
      }
      applyAssignments(nextMap);
    };

    const handleRemoveAssignment = (targetId) => {
      if (disableInputs || disableSelection) return;
      if (typeof onChangeComponent !== "function") return;
      onChangeComponent(targetId, "");
    };

    const handleDrop = (event, targetId) => {
      event.preventDefault();
      const labelId = event.dataTransfer.getData("text/plain");
      assignLabelToTarget(targetId, labelId);
    };

    const handleDragStart = (event, labelId) => {
      if (disableInputs || disableSelection) return;
      event.dataTransfer.setData("text/plain", labelId);
      event.dataTransfer.effectAllowed = "move";
    };

    return (
      <div
        className="drag-drop-student space-y-4"
        style={{
          "--drag-drop-label-width": dragDropLabelWidth
            ? `${dragDropLabelWidth}px`
            : undefined,
        }}
      >
        <span
          ref={dragDropLabelMeasureRef}
          className="drag-drop-student-label-measure"
        />
        <div
          className={`drag-drop-student-labels${
            mode === "item_grid" ? " is-item-grid" : ""
          }`}
        >
          {labels.map((label, index) => {
            const isUsed = assignedLabelIds.has(label.id);
            const shouldShow =
              label.reusable || !isUsed || disableInputs || disableSelection;
            if (!shouldShow) return null;
            return (
              <div
                key={label.id}
                className="drag-drop-student-label"
                draggable={!disableInputs && !disableSelection}
                onDragStart={(event) => handleDragStart(event, label.id)}
              >
                {label.text || `Label ${index + 1}`}
              </div>
            );
          })}
        </div>

        {mode === "item_grid" ? (
          <div className="drag-drop-student-grid">
            {items.map((item, index) => {
              const assignedLabelId = assignments[item.id] ?? "";
              const assignedLabel = labelLookup.get(assignedLabelId);
              return (
                <div key={item.id} className="drag-drop-student-item">
                  <div className="drag-drop-student-image">
                    {item.image ? (
                      <img
                        src={buildImageUrl(item.image)}
                        alt={`Item ${index + 1}`}
                      />
                    ) : (
                      <div className="drag-drop-student-image-placeholder">
                        Image not available
                      </div>
                    )}
                  </div>
                  <div
                    className="drag-drop-student-dropzone"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, item.id)}
                  >
                    {assignedLabel ? (
                      <div className="drag-drop-student-assigned">
                        <span
                          draggable={!disableInputs && !disableSelection}
                          onDragStart={(event) =>
                            handleDragStart(event, assignedLabel.id)
                          }
                        >
                          {assignedLabel.text}
                        </span>
                        {!disableInputs && !disableSelection && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignment(item.id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="drag-drop-student-hint">
                        Drop label here
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="drag-drop-student-diagram">
            {diagramImage ? (
              <div className="drag-drop-student-diagram-canvas">
                <img
                  src={buildImageUrl(diagramImage)}
                  alt="Diagram"
                  className="drag-drop-student-diagram-image"
                />
                {blanks.map((blank, index) => {
                  const assignedLabelId = assignments[blank.id] ?? "";
                  const assignedLabel = labelLookup.get(assignedLabelId);
                  return (
                    <div
                      key={blank.id}
                      className="drag-drop-student-blank"
                      style={{
                        left: `${blank.x ?? 0}%`,
                        top: `${blank.y ?? 0}%`,
                        width: dragDropLabelWidth
                          ? `${dragDropLabelWidth}px`
                          : `${Math.max(
                              Number(blank.width) || DRAG_DROP_DEFAULT_WIDTH,
                              40,
                            )}px`,
                        height: `${Math.max(
                          Number(blank.height) || DRAG_DROP_DEFAULT_HEIGHT,
                          24,
                        )}px`,
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDrop(event, blank.id)}
                    >
                      {assignedLabel ? (
                        <div className="drag-drop-student-assigned">
                          <span
                            draggable={!disableInputs && !disableSelection}
                            onDragStart={(event) =>
                              handleDragStart(event, assignedLabel.id)
                            }
                          >
                            {assignedLabel.text}
                          </span>
                          {!disableInputs && !disableSelection && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignment(blank.id)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="drag-drop-student-hint">
                          Blank {index + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-48 w-full items-center justify-center text-sm text-slate-500">
                Diagram image not available.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (
    question_type === "text_input" ||
    (question_type === "fill_blank" && !components?.length)
  ) {
    const normalizedValue = Array.isArray(value)
      ? (value[0] ?? "")
      : (value ?? "");
    return (
      <input
        className="w-full border border-slate-300 rounded-md px-3 py-2"
        value={normalizedValue}
        disabled={disableInputs}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer"
      />
    );
  }

  // MCQ / Checkbox
  const isCheckbox = question_type === "check_box";
  const current = isCheckbox
    ? Array.isArray(value)
      ? value
      : []
    : (value ?? null);
  const toggle = (id, checked) => {
    if (disableSelection && !isCheckbox) return;
    if (!isCheckbox) {
      onChange(id);
      return;
    }
    const exists = current.includes(id);
    const next = checked
      ? exists
        ? current
        : [...current, id]
      : current.filter((x) => x !== id);
    onChange(next);
  };

  return (
    <div className="">
      {options.map((opt, idx) => {
        const isActive = isCheckbox
          ? current.includes(opt.id)
          : current === opt.id;
        const isImg =
          opt.is_image === true ||
          opt.is_image === "1" ||
          answer_type === "image";
        const isCorrectSelection =
          evaluationStatus &&
          isActive &&
          normalizedCorrectAnswers.includes(String(opt.id));
        const isWrongSelection =
          evaluationStatus === "wrong" &&
          isActive &&
          !normalizedCorrectAnswers.includes(String(opt.id));

        let state = "idle";
        if (isActive) state = "active";
        if (evaluationStatus) {
          if (isCorrectSelection) state = "correct";
          else if (isWrongSelection) state = "wrong";
        }

        const containerClass =
          "border-b border-gray-300 bg-white text-slate-800";

        const badgeClass = {
          idle: "border-gray-800 text-slate-600 bg-white group-hover:bg-[#000] group-hover:border-[#000] group-hover:text-[#fff]",
          active: "border-[#000] bg-[#000] text-white",
          correct: "border-green-600 bg-green-600 text-white",
          wrong: "border-[#000] bg-[#000] text-white",
        }[state];

        // Only show translated text when this question is flagged as
        // translatable (native question_text_urdu/sindhi present). Otherwise
        // always show the original English option text.
        const displayText =
          !isImg &&
          translationEnabled &&
          selectedLanguage !== "en" &&
          translatedMap[opt.id]
            ? translatedMap[opt.id]
            : opt.text || "";

        const badge = (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[14px] font-bold transition-colors ${badgeClass}`}
          >
            {String.fromCharCode(65 + idx)}
          </span>
        );

        const optionContent = isImg ? (
          <img
            src={buildImageUrl(opt.image)}
            alt={opt.text || ""}
            className="h-16 w-16 object-contain rounded"
          />
        ) : (
          <span
            className={`text-slate-800 font-bold text-[18px] transition-opacity flex-1 ${
              isTranslatingOptions && translationEnabled
                ? "opacity-40"
                : "opacity-100"
            } ${isRtl ? "text-right leading-8" : ""} ${langFontClass}`}
            dangerouslySetInnerHTML={{
              __html: renderMathHtml(displayText),
            }}
          />
        );

        return (
          <label
            key={opt.id}
            dir={isRtl ? "rtl" : "ltr"}
            className={`group flex items-center gap-3 px-3 py-4 cursor-pointer transition ${containerClass} ${
              isRtl ? "flex-row-reverse justify-end" : ""
            }`}
          >
            <input
              type={isCheckbox ? "checkbox" : "radio"}
              className="sr-only"
              checked={isActive}
              disabled={disableSelection && !isCheckbox}
              onChange={(e) => toggle(opt.id, e.target.checked)}
            />
            {isRtl ? (
              <>
                {optionContent}
                {badge}
              </>
            ) : (
              <>
                {badge}
                {optionContent}
              </>
            )}
          </label>
        );
      })}
    </div>
  );
};

export default AnswerOptions;
