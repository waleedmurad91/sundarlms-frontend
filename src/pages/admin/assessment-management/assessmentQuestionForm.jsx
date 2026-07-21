import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  ALargeSmall,
  AlertCircleIcon,
  ArrowBigUp,
  ArrowUp10,
  Book,
  BookA,
  Check,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Section,
  SquareStack,
  Trash2,
  Upload,
  View,
  X,
} from "lucide-react";
import { fabric } from "fabric";
import MathEditor from "@/components/MathEditor";
import SolutionStepsEditor from "@/components/SolutionStepsEditor";
import {
  addQuestion,
  getQuestionById,
  updateQuestionById,
} from "@/api/questionApi";
import { getAllTopics } from "@/api/topicApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import QuestionContent from "@/components/questions/QuestionContent";
import AnswerOptions from "@/components/questions/AnswerOptions";
import SolutionSteps from "@/components/questions/SolutionSteps";
import {
  FILL_BLANK_TYPES,
  buildFillBlankStateFromAnswers,
  getFillBlankComponentId,
  getFillBlankComponentType,
} from "@/utils/fillBlankComponents";
import {
  createDefaultAlgebraFormats,
  getAlgebraFormatDefinition,
  isAlgebraAnswerComplete,
  normalizeAlgebraFormats,
  serializeAlgebraValues,
} from "@/utils/algebraFormat";
import { resolveDragDropTargets } from "@/utils/dragDropQuestion";
import { useAuthStore } from "@/store/auth";
import {
  addAssessmentQuestion,
  updateAssessmentQuestionById,
} from "@/api/assessmentApi";

const QUESTION_TYPES = {
  MCQ: "mcq",
  CHECKBOX: "check_box",
  TEXT_INPUT: "text_input",
  IMAGE_ANNOTATION: "image_annotation",
  ALGEBRA: "algebra",
  DRAG_DROP: "drag_drop",
};

const ANSWER_TYPES = {
  TEXT: "text",
  IMAGE: "image",
};

const COMPONENT_TYPES = FILL_BLANK_TYPES;

const DEFAULT_FORM = {
  classId: "",
  subjectId: "",
  unitId: "",
  topicId: "",
  questionType: QUESTION_TYPES.MCQ,
  questionText: "",
  algebraStatement: "",
  difficultyLevel: "medium",
  marks: "1",
  status: "draft",
  questionCategory: "assessment",
};

const MIN_OPTIONS = 3;
const ANNOTATION_DEFAULT_WIDTH = 160;
const ANNOTATION_MIN_WIDTH = 30;
const DRAG_DROP_DEFAULT_LABELS = 4;
const DRAG_DROP_DEFAULT_ITEMS = 2;
const DRAG_DROP_BLANK_DEFAULT_WIDTH = 60;
const DRAG_DROP_BLANK_DEFAULT_HEIGHT = 33;

const DRAG_DROP_MODES = {
  ITEM_GRID: "item_grid",
  DIAGRAM_LABELS: "diagram_labels",
};

const IMAGE_ORIGIN = {
  NONE: "none",
  SERVER: "server",
  LOCAL: "local",
};

const clampPercent = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return Math.min(100, Math.max(0, fallback));
  }
  return Math.min(100, Math.max(0, numeric));
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

const isCorrectOption = (option, correctAnswers = []) => {
  const normalizedAnswers = correctAnswers.map((answer) =>
    String(answer ?? "").trim(),
  );
  const candidates = [option.id, option.text, option.image].map((value) =>
    String(value ?? "").trim(),
  );

  return candidates.some(
    (candidate) => candidate && normalizedAnswers.includes(candidate),
  );
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("Unable to read the selected image file."));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Unable to load the selected image for resizing."));
    image.src = src;
  });

const dataUrlToFile = async (dataUrl, fileName, mimeType) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const type = mimeType && mimeType.startsWith("image/") ? mimeType : blob.type;
  return new File([blob], fileName, { type });
};

const isBlobUrl = (value) =>
  typeof value === "string" && value.startsWith("blob:");

const createPreviewUrl = (file) => {
  if (
    !(file instanceof File) ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw new Error("Invalid file selected. Please try again.");
  }
  return URL.createObjectURL(file);
};

const revokePreviewUrl = (url) => {
  if (
    isBlobUrl(url) &&
    typeof URL !== "undefined" &&
    typeof URL.revokeObjectURL === "function"
  ) {
    URL.revokeObjectURL(url);
  }
};

const resolveMediaUrl = (value) => {
  if (!value) {
    return "";
  }

  if (
    isBlobUrl(value) ||
    value.startsWith("data:") ||
    /^https?:\/\//i.test(value)
  ) {
    return value;
  }

  const basePath = import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? "";
  return `${basePath}${value}`;
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const getOptionIdentifier = (option) => {
  if (!option) {
    return generateId();
  }

  const candidates = [
    option.id,
    option.option_id,
    option.optionId,
    option.value,
  ];

  for (const candidate of candidates) {
    if (
      candidate !== undefined &&
      candidate !== null &&
      String(candidate).trim() !== ""
    ) {
      return String(candidate);
    }
  }

  return generateId();
};

const createOption = (mode = ANSWER_TYPES.TEXT) => ({
  id: generateId(),
  text: "",
  imageUrl: "",
  file: null,
  imageOrigin: IMAGE_ORIGIN.NONE,
  isCorrect: false,
  mode,
});

const createAnnotationField = (overrides = {}) => ({
  id: generateId(),
  label: "",
  labelPosition: "left",
  answer: "",
  width: ANNOTATION_DEFAULT_WIDTH,
  x: 10,
  y: 10,
  ...overrides,
});

const normaliseAnnotationFields = (fields = []) =>
  fields
    .map((field, index) => {
      if (!field) return null;
      const widthValue =
        field?.width ?? field?.inputWidth ?? field?.input_width ?? null;
      return {
        id:
          field?.id ??
          field?.field_id ??
          field?.fieldId ??
          field?.value ??
          `annotation-${index}`,
        label: field?.label ?? field?.name ?? field?.title ?? "",
        labelPosition:
          field?.labelPosition === "right" || field?.label_position === "right"
            ? "right"
            : "left",
        answer:
          field?.answer ??
          field?.correct_answer ??
          field?.value ??
          field?.text ??
          "",
        width:
          Number.isFinite(Number(widthValue)) && Number(widthValue) > 0
            ? Number(widthValue)
            : ANNOTATION_DEFAULT_WIDTH,
        x: clampPercent(
          field?.x ??
            field?.left ??
            field?.position?.x ??
            field?.position_x ??
            field?.positionX ??
            field?.offset_x ??
            field?.offsetX,
          10,
        ),
        y: clampPercent(
          field?.y ??
            field?.top ??
            field?.position?.y ??
            field?.position_y ??
            field?.positionY ??
            field?.offset_y ??
            field?.offsetY,
          10,
        ),
      };
    })
    .filter(Boolean);

const createDragDropLabel = (overrides = {}) => ({
  id: generateId(),
  text: "",
  reusable: false,
  ...overrides,
});

const createDragDropItem = (overrides = {}) => ({
  id: generateId(),
  imageUrl: "",
  file: null,
  imageOrigin: IMAGE_ORIGIN.NONE,
  correctLabelId: "",
  ...overrides,
});

const createDragDropBlank = (overrides = {}) => ({
  id: generateId(),
  x: 10,
  y: 10,
  width: DRAG_DROP_BLANK_DEFAULT_WIDTH,
  height: DRAG_DROP_BLANK_DEFAULT_HEIGHT,
  correctLabelId: "",
  ...overrides,
});

const createDefaultDragDropState = (overrides = {}) => ({
  mode: DRAG_DROP_MODES.ITEM_GRID,
  labels: Array.from({ length: DRAG_DROP_DEFAULT_LABELS }, () =>
    createDragDropLabel(),
  ),
  items: Array.from({ length: DRAG_DROP_DEFAULT_ITEMS }, () =>
    createDragDropItem(),
  ),
  diagram: {
    image: null,
    blanks: [],
  },
  selectedBlankId: null,
  ...overrides,
});

const createStatementComponent = (text = "") => ({
  id: generateId(),
  type: COMPONENT_TYPES.STATEMENT,
  text,
});

const createBlankComponent = (answer = "") => ({
  id: generateId(),
  type: COMPONENT_TYPES.BLANK,
  answer,
});

const createPowerComponent = (base = "", exponent = "") => ({
  id: generateId(),
  type: COMPONENT_TYPES.POWER,
  base,
  exponent,
});

const createFractionComponent = (numerator = "", denominator = "") => ({
  id: generateId(),
  type: COMPONENT_TYPES.FRACTION,
  numerator,
  denominator,
});

const createMixedNumberComponent = (
  whole = "",
  numerator = "",
  denominator = "",
) => ({
  id: generateId(),
  type: COMPONENT_TYPES.MIXED_NUMBER,
  whole,
  numerator,
  denominator,
});

const createLineBreakComponent = () => ({
  id: generateId(),
  type: COMPONENT_TYPES.LINE_BREAK,
});

const createSolutionStep = (overrides = {}) => ({
  id: generateId(),
  explanation: "",
  images: [],
  ...overrides,
});

const getDefaultAnswerComponents = () => [];

const ensureOptionList = (questionType, answerType, existing = []) => {
  if (
    questionType === QUESTION_TYPES.TEXT_INPUT ||
    questionType === QUESTION_TYPES.IMAGE_ANNOTATION ||
    questionType === QUESTION_TYPES.ALGEBRA ||
    questionType === QUESTION_TYPES.DRAG_DROP
  ) {
    return [];
  }

  const normalized = existing.length
    ? existing.map((option) => {
        const resolvedImageUrl = option.imageUrl ?? option.image ?? "";
        const resolvedFile = option.file instanceof File ? option.file : null;
        const inferredOrigin =
          option.imageOrigin ??
          (resolvedFile
            ? IMAGE_ORIGIN.LOCAL
            : resolvedImageUrl
              ? IMAGE_ORIGIN.SERVER
              : IMAGE_ORIGIN.NONE);

        return {
          id: getOptionIdentifier(option),
          text: option.text ?? option.option_text ?? "",
          imageUrl: resolvedImageUrl,
          file: resolvedFile,
          imageOrigin: inferredOrigin,
          isCorrect: Boolean(option.isCorrect ?? option.is_correct),
          mode: option.mode ?? answerType,
        };
      })
    : [];

  while (normalized.length < MIN_OPTIONS) {
    normalized.push(createOption(answerType));
  }

  return normalized;
};

const resolveTopicsList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  return [];
};

const resolveUnits = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  return [];
};

const getSubjectId = (subject) => {
  const id =
    subject?._id ??
    subject?.id ??
    subject?.value ??
    subject?.subject_id ??
    subject?.subjectId;
  return id !== null && id !== undefined ? String(id) : "";
};

const getSubjectLabel = (subject) =>
  subject?.subject ??
  subject?.name ??
  subject?.title ??
  subject?.label ??
  "Untitled Subject";

const getUnitId = (unit) => {
  const id =
    unit?._id ?? unit?.id ?? unit?.value ?? unit?.unit_id ?? unit?.unitId;
  return id !== null && id !== undefined ? String(id) : "";
};

const getUnitLabel = (unit) =>
  unit?.name ??
  unit?.unit_name ??
  unit?.unitName ??
  unit?.title ??
  unit?.label ??
  "Untitled Unit";

const getUnitSubjectId = (unit) => {
  const subjectRef =
    unit?.subject_id ??
    unit?.subjectId ??
    unit?.subject?.id ??
    unit?.subject?._id ??
    unit?.subject?.value ??
    unit?.subject;

  if (subjectRef && typeof subjectRef === "object") {
    const resolved =
      subjectRef?.id ??
      subjectRef?._id ??
      subjectRef?.value ??
      subjectRef?.subject_id ??
      subjectRef?.subjectId ??
      null;
    return resolved !== null && resolved !== undefined ? String(resolved) : "";
  }

  return subjectRef !== null && subjectRef !== undefined
    ? String(subjectRef)
    : "";
};

const getTopicId = (topic) => {
  const id =
    topic?._id ??
    topic?.id ??
    topic?.value ??
    topic?.topic_id ??
    topic?.topicId;
  return id !== null && id !== undefined ? String(id) : "";
};

const getTopicLabel = (topic) =>
  topic?.topic_name ??
  topic?.name ??
  topic?.title ??
  topic?.label ??
  "Untitled Topic";

const getPlainText = (html = "") =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normaliseQuestion = (payload) => {
  if (!payload) {
    return {
      form: { ...DEFAULT_FORM },
      options: [],
      answerComponents: getDefaultAnswerComponents(),
      answerType: ANSWER_TYPES.TEXT,
      questionImages: [],
      dragDrop: createDefaultDragDropState(),
      solutionSteps: [createSolutionStep()],
    };
  }

  const dataCandidate =
    payload?.data?.data ??
    payload?.data?.question ??
    payload?.data?.questionData ??
    payload?.data ??
    payload?.question ??
    payload?.questionData ??
    payload;
  const data = dataCandidate?.data ?? dataCandidate;
  const topicData =
    data?.topic ??
    data?.topic_data ??
    data?.topicData ??
    data?.topic_info ??
    {};
  const unitData =
    data?.unit ??
    data?.unit_data ??
    data?.unitData ??
    data?.unit_info ??
    topicData?.unit ??
    topicData?.unit_data ??
    topicData?.unitData ??
    {};
  const subjectData =
    data?.subject ??
    data?.subject_data ??
    data?.subjectData ??
    unitData?.subject ??
    unitData?.subject_data ??
    unitData?.subjectData ??
    {};
  const gradeData =
    subjectData?.grade ??
    subjectData?.grade_data ??
    subjectData?.gradeData ??
    unitData?.grade ??
    {};
  const classData =
    data?.class ??
    data?.school_class ??
    data?.schoolClass ??
    unitData?.class ??
    unitData?.school_class ??
    unitData?.schoolClass ??
    subjectData?.class ??
    subjectData?.school_class ??
    subjectData?.schoolClass ??
    gradeData ??
    {};
  const rawType = (
    data?.question_type ?? DEFAULT_FORM.questionType
  ).toLowerCase();
  const rawAnswerType = String(
    data?.answer_type ?? data?.answerType ?? "",
  ).toLowerCase();

  let questionType = rawType;
  if (rawType === "fill_blank") {
    questionType = QUESTION_TYPES.TEXT_INPUT;
  } else if (rawType === "image_annotation") {
    questionType = QUESTION_TYPES.IMAGE_ANNOTATION;
  } else if (rawType === "image_based") {
    questionType = QUESTION_TYPES.MCQ;
  } else if (
    ![
      QUESTION_TYPES.MCQ,
      QUESTION_TYPES.CHECKBOX,
      QUESTION_TYPES.TEXT_INPUT,
      QUESTION_TYPES.IMAGE_ANNOTATION,
      QUESTION_TYPES.ALGEBRA,
      QUESTION_TYPES.DRAG_DROP,
    ].includes(rawType)
  ) {
    questionType = QUESTION_TYPES.MCQ;
  }

  const rawCorrectAnswers = Array.isArray(data?.correct_answers)
    ? data.correct_answers
    : [];
  const dragDropCorrectMap = new Map(
    rawCorrectAnswers
      .map((entry) => ({
        targetId:
          entry?.item_id ??
          entry?.blank_id ??
          entry?.target_id ??
          entry?.targetId ??
          "",
        labelId:
          entry?.label_id ??
          entry?.labelId ??
          entry?.correct_label_id ??
          entry?.correctLabelId ??
          "",
      }))
      .filter((entry) => entry.targetId)
      .map((entry) => [String(entry.targetId), String(entry.labelId ?? "")]),
  );
  const correctAnswerStrings = new Set(
    rawCorrectAnswers.map((answer) =>
      String(normalizeCorrectAnswerValue(answer) ?? ""),
    ),
  );

  const options = Array.isArray(data?.options)
    ? data.options.map((option) => {
        const optionId = getOptionIdentifier(option);
        const textValue = option?.text ?? option?.option_text ?? "";
        const imageValue = option?.image ?? option?.image_url ?? "";
        const declaredMode =
          rawAnswerType === ANSWER_TYPES.IMAGE
            ? ANSWER_TYPES.IMAGE
            : rawAnswerType === ANSWER_TYPES.TEXT
              ? ANSWER_TYPES.TEXT
              : null;
        const hasImageValue = Boolean(imageValue);
        const modeFromFlags =
          option?.mode === ANSWER_TYPES.IMAGE ||
          option?.mode === true ||
          option?.is_image === true ||
          option?.is_image === 1 ||
          option?.is_image === "1"
            ? ANSWER_TYPES.IMAGE
            : option?.mode === ANSWER_TYPES.TEXT ||
                option?.is_image === false ||
                option?.is_image === 0 ||
                option?.is_image === "0"
              ? ANSWER_TYPES.TEXT
              : null;
        const mode = hasImageValue
          ? ANSWER_TYPES.IMAGE
          : declaredMode === ANSWER_TYPES.TEXT
            ? ANSWER_TYPES.TEXT
            : (modeFromFlags ?? declaredMode ?? ANSWER_TYPES.TEXT);

        const isCorrect =
          Boolean(option?.isCorrect ?? option?.is_correct) ||
          correctAnswerStrings.has(String(optionId)) ||
          correctAnswerStrings.has(
            mode === ANSWER_TYPES.IMAGE ? imageValue : textValue,
          );

        return {
          id: optionId,
          text: textValue,
          imageUrl: imageValue,
          imageOrigin: imageValue ? IMAGE_ORIGIN.SERVER : IMAGE_ORIGIN.NONE,
          isCorrect,
          mode,
        };
      })
    : [];

  const inferredAnswerType =
    options.some((option) => option.mode === ANSWER_TYPES.IMAGE) &&
    questionType !== QUESTION_TYPES.TEXT_INPUT &&
    questionType !== QUESTION_TYPES.IMAGE_ANNOTATION &&
    questionType !== QUESTION_TYPES.ALGEBRA &&
    questionType !== QUESTION_TYPES.DRAG_DROP
      ? ANSWER_TYPES.IMAGE
      : ANSWER_TYPES.TEXT;

  const answerType =
    questionType === QUESTION_TYPES.TEXT_INPUT ||
    questionType === QUESTION_TYPES.IMAGE_ANNOTATION ||
    questionType === QUESTION_TYPES.ALGEBRA ||
    questionType === QUESTION_TYPES.DRAG_DROP
      ? ANSWER_TYPES.TEXT
      : rawAnswerType === ANSWER_TYPES.IMAGE ||
          rawAnswerType === ANSWER_TYPES.TEXT
        ? rawAnswerType
        : inferredAnswerType;

  const fillAnswers =
    questionType === QUESTION_TYPES.TEXT_INPUT &&
    Array.isArray(data?.correct_answers)
      ? data.correct_answers
      : [];

  const rawComponents = Array.isArray(data?.components) ? data.components : [];

  let answerComponents =
    questionType === QUESTION_TYPES.TEXT_INPUT
      ? rawComponents
          .map((component) => {
            if (!component) {
              return null;
            }
            const type = getFillBlankComponentType(component);

            if (type === COMPONENT_TYPES.BLANK) {
              const answerValue =
                component?.answer ?? component?.value ?? component?.text ?? "";
              return {
                id: component?.id ?? generateId(),
                type,
                answer: String(answerValue ?? ""),
              };
            }
            if (type === COMPONENT_TYPES.POWER) {
              return {
                id: component?.id ?? generateId(),
                type,
                base: String(component?.base ?? component?.value?.base ?? ""),
                exponent: String(
                  component?.exponent ?? component?.value?.exponent ?? "",
                ),
              };
            }
            if (type === COMPONENT_TYPES.FRACTION) {
              return {
                id: component?.id ?? generateId(),
                type,
                numerator: String(
                  component?.numerator ?? component?.value?.numerator ?? "",
                ),
                denominator: String(
                  component?.denominator ?? component?.value?.denominator ?? "",
                ),
              };
            }
            if (type === COMPONENT_TYPES.MIXED_NUMBER) {
              return {
                id: component?.id ?? generateId(),
                type,
                whole: String(
                  component?.whole ?? component?.value?.whole ?? "",
                ),
                numerator: String(
                  component?.numerator ?? component?.value?.numerator ?? "",
                ),
                denominator: String(
                  component?.denominator ?? component?.value?.denominator ?? "",
                ),
              };
            }
            if (type === COMPONENT_TYPES.LINE_BREAK) {
              return {
                id: component?.id ?? generateId(),
                type,
              };
            }

            const textValue =
              component?.text ?? component?.statement ?? component?.value ?? "";
            return {
              id: component?.id ?? generateId(),
              type: COMPONENT_TYPES.STATEMENT,
              text: String(textValue ?? ""),
            };
          })
          .filter(Boolean)
      : [];

  if (
    questionType === QUESTION_TYPES.TEXT_INPUT &&
    !answerComponents.length &&
    fillAnswers.length
  ) {
    answerComponents = fillAnswers.map((answer) =>
      createBlankComponent(String(answer ?? "")),
    );
  }

  const annotationImageValue =
    data?.annotation_image ??
    data?.annotationImage ??
    data?.annotation?.image ??
    data?.annotationImageUrl ??
    "";

  const rawAlgebraFormats =
    data?.algebra_formats ??
    data?.answer_formats ??
    data?.algebraFormats ??
    data?.answerFormats ??
    data?.formats ??
    [];
  const rawCorrectFormat =
    data?.correct_format ?? data?.correctFormat ?? data?.algebra_correct_format;
  const algebraFormats = normalizeAlgebraFormats({
    rawFormats: rawAlgebraFormats,
    correctFormatKey: rawCorrectFormat,
    correctAnswerValues: rawCorrectAnswers.map((answer) =>
      String(normalizeCorrectAnswerValue(answer) ?? ""),
    ),
  });

  const annotationImage = annotationImageValue
    ? {
        id: generateId(),
        file: null,
        url: annotationImageValue,
        imageOrigin: IMAGE_ORIGIN.SERVER,
      }
    : null;

  const annotationFields = normaliseAnnotationFields(
    Array.isArray(data?.annotation_fields)
      ? data.annotation_fields
      : Array.isArray(data?.annotationFields)
        ? data.annotationFields
        : Array.isArray(data?.annotation_inputs)
          ? data.annotation_inputs
          : Array.isArray(data?.annotationInputs)
            ? data.annotationInputs
            : Array.isArray(data?.annotation?.fields)
              ? data.annotation.fields
              : [],
  );

  const rawDragDrop =
    data?.question_schema ??
    data?.questionSchema ??
    data?.drag_drop ??
    data?.dragDrop ??
    {};
  const dragDropModeCandidate = String(
    data?.drag_drop_mode ??
      data?.dragDropMode ??
      rawDragDrop?.drag_drop_mode ??
      rawDragDrop?.dragDropMode ??
      rawDragDrop?.mode ??
      DRAG_DROP_MODES.ITEM_GRID,
  ).toLowerCase();
  const dragDropMode =
    dragDropModeCandidate === DRAG_DROP_MODES.DIAGRAM_LABELS
      ? DRAG_DROP_MODES.DIAGRAM_LABELS
      : DRAG_DROP_MODES.ITEM_GRID;
  const rawDragDropLabels =
    data?.drag_drop_labels ??
    data?.dragDropLabels ??
    rawDragDrop?.drag_drop_labels ??
    rawDragDrop?.dragDropLabels ??
    rawDragDrop?.labels ??
    [];
  const normalizedDragDropLabels = Array.isArray(rawDragDropLabels)
    ? rawDragDropLabels.map((label, index) =>
        createDragDropLabel({
          id:
            label?.id ??
            label?.label_id ??
            label?.labelId ??
            label?.value ??
            `label-${index}`,
          text: label?.text ?? label?.label ?? label?.name ?? "",
          reusable: Boolean(
            label?.reusable ?? label?.is_reusable ?? label?.isReusable,
          ),
        }),
      )
    : [];
  const rawDragDropItems =
    data?.drag_drop_items ??
    data?.dragDropItems ??
    rawDragDrop?.drag_drop_items ??
    rawDragDrop?.dragDropItems ??
    rawDragDrop?.items ??
    [];
  const normalizedDragDropItems = Array.isArray(rawDragDropItems)
    ? rawDragDropItems.map((item, index) => {
        const imageValue =
          item?.image?.url ?? item?.image ?? item?.image_url ?? item?.url ?? "";
        return createDragDropItem({
          id:
            item?.id ??
            item?.item_id ??
            item?.itemId ??
            item?.value ??
            `item-${index}`,
          imageUrl: imageValue,
          imageOrigin: imageValue ? IMAGE_ORIGIN.SERVER : IMAGE_ORIGIN.NONE,
          correctLabelId:
            item?.correct_label_id ??
            item?.correctLabelId ??
            item?.label_id ??
            item?.labelId ??
            dragDropCorrectMap.get(
              item?.id ??
                item?.item_id ??
                item?.itemId ??
                item?.value ??
                `item-${index}`,
            ) ??
            "",
        });
      })
    : [];
  const rawDragDropDiagram =
    data?.drag_drop_diagram ??
    data?.dragDropDiagram ??
    rawDragDrop?.drag_drop_diagram ??
    rawDragDrop?.dragDropDiagram ??
    rawDragDrop?.diagram ??
    {};
  const dragDropDiagramImageValue =
    rawDragDropDiagram?.image?.url ??
    rawDragDropDiagram?.image ??
    data?.drag_drop_diagram_image ??
    data?.dragDropDiagramImage ??
    "";
  const dragDropDiagramImage = dragDropDiagramImageValue
    ? {
        id: generateId(),
        file: null,
        url: dragDropDiagramImageValue,
        imageOrigin: IMAGE_ORIGIN.SERVER,
      }
    : null;
  const rawDragDropBlanks =
    rawDragDropDiagram?.blanks ??
    rawDragDropDiagram?.positions ??
    data?.drag_drop_blanks ??
    data?.dragDropBlanks ??
    rawDragDrop?.drag_drop_blanks ??
    rawDragDrop?.dragDropBlanks ??
    [];
  const normalizedDragDropBlanks = Array.isArray(rawDragDropBlanks)
    ? rawDragDropBlanks.map((blank, index) =>
        createDragDropBlank({
          id:
            blank?.id ??
            blank?.blank_id ??
            blank?.blankId ??
            blank?.value ??
            `blank-${index}`,
          x: clampPercent(
            blank?.x ??
              blank?.left ??
              blank?.position?.x ??
              blank?.position_x ??
              blank?.positionX,
            10,
          ),
          y: clampPercent(
            blank?.y ??
              blank?.top ??
              blank?.position?.y ??
              blank?.position_y ??
              blank?.positionY,
            10,
          ),
          width:
            Number(blank?.width ?? blank?.blank_width) ||
            DRAG_DROP_BLANK_DEFAULT_WIDTH,
          height:
            Number(blank?.height ?? blank?.blank_height) ||
            DRAG_DROP_BLANK_DEFAULT_HEIGHT,
          correctLabelId:
            blank?.correct_label_id ??
            blank?.correctLabelId ??
            blank?.label_id ??
            blank?.labelId ??
            dragDropCorrectMap.get(
              blank?.id ??
                blank?.blank_id ??
                blank?.blankId ??
                blank?.value ??
                `blank-${index}`,
            ) ??
            "",
        }),
      )
    : [];
  const defaultDragDrop = createDefaultDragDropState();
  const resolvedDragDropLabels = normalizedDragDropLabels.length
    ? normalizedDragDropLabels
    : defaultDragDrop.labels;
  const resolvedDragDropItems = normalizedDragDropItems.length
    ? normalizedDragDropItems
    : dragDropMode === DRAG_DROP_MODES.ITEM_GRID
      ? defaultDragDrop.items
      : [];
  const dragDropState = {
    mode: dragDropMode,
    labels: resolvedDragDropLabels,
    items: resolvedDragDropItems,
    diagram: {
      image: dragDropDiagramImage,
      blanks: normalizedDragDropBlanks,
    },
    selectedBlankId: normalizedDragDropBlanks[0]?.id ?? null,
  };

  const questionImages = Array.isArray(data?.question_image)
    ? data.question_image.filter(Boolean).map((image) => ({
        id: generateId(),
        file: null,
        url: image,
      }))
    : [];

  const solutionStepsRaw = Array.isArray(data?.solution_steps)
    ? data.solution_steps
    : data?.solution_steps
      ? [data.solution_steps]
      : [];
  const solutionSteps = solutionStepsRaw.length
    ? solutionStepsRaw.map((step, idx) => ({
        id: step?.id ?? `solution-${idx}`,
        explanation: step?.explanation ?? "",
        images: Array.isArray(step?.images)
          ? step.images.filter(Boolean).map((image) => ({
              id: generateId(),
              file: null,
              url: image,
            }))
          : [],
      }))
    : [createSolutionStep()];

  const topicRefCandidate =
    data?.topic_id ??
    data?.topicId ??
    topicData?.id ??
    topicData?._id ??
    topicData?.value ??
    topicData?.topic_id ??
    topicData?.topicId ??
    null;

  let topicRef = topicRefCandidate;
  if (topicRef && typeof topicRef === "object") {
    topicRef =
      topicRef.id ??
      topicRef._id ??
      topicRef.value ??
      topicRef.topic_id ??
      topicRef.topicId ??
      null;
  }

  const unitRefCandidate =
    data?.unit_id ??
    data?.unitId ??
    topicData?.unit_id ??
    topicData?.unitId ??
    unitData?.id ??
    unitData?._id ??
    unitData?.value ??
    unitData?.unit_id ??
    unitData?.unitId ??
    null;

  let unitRef = unitRefCandidate;
  if (unitRef && typeof unitRef === "object") {
    unitRef =
      unitRef.id ??
      unitRef._id ??
      unitRef.value ??
      unitRef.unit_id ??
      unitRef.unitId ??
      null;
  }

  const subjectRefCandidate =
    data?.subject_id ??
    data?.subjectId ??
    unitData?.subject_id ??
    unitData?.subjectId ??
    subjectData?.id ??
    subjectData?._id ??
    subjectData?.value ??
    subjectData?.subject_id ??
    subjectData?.subjectId ??
    null;

  let subjectRef = subjectRefCandidate;
  if (subjectRef && typeof subjectRef === "object") {
    subjectRef =
      subjectRef.id ??
      subjectRef._id ??
      subjectRef.value ??
      subjectRef.subject_id ??
      subjectRef.subjectId ??
      null;
  }

  const classRefCandidate =
    data?.class_id ??
    data?.classId ??
    data?.school_class_id ??
    data?.schoolClassId ??
    unitData?.class_id ??
    unitData?.classId ??
    unitData?.school_class_id ??
    unitData?.schoolClassId ??
    subjectData?.class_id ??
    subjectData?.classId ??
    subjectData?.school_class_id ??
    subjectData?.schoolClassId ??
    subjectData?.grade_id ??
    subjectData?.gradeId ??
    gradeData?.id ??
    gradeData?._id ??
    gradeData?.value ??
    classData?.id ??
    classData?._id ??
    classData?.value ??
    classData?.class_id ??
    classData?.classId ??
    classData?.grade_id ??
    classData?.gradeId ??
    null;

  let classRef = classRefCandidate;
  if (classRef && typeof classRef === "object") {
    classRef =
      classRef.id ??
      classRef._id ??
      classRef.value ??
      classRef.class_id ??
      classRef.classId ??
      classRef.grade_id ??
      classRef.gradeId ??
      null;
  }

  const normalizedQuestionCategory = String(
    data?.question_category ?? data?.questionCategory ?? "",
  ).trim();

  return {
    form: {
      classId: classRef ? String(classRef) : "",
      subjectId: subjectRef ? String(subjectRef) : "",
      unitId: unitRef ? String(unitRef) : "",
      topicId: topicRef ? String(topicRef) : "",
      questionType,
      questionText: data?.question_text ?? "",
      algebraStatement:
        data?.algebra_statement ??
        data?.algebraStatement ??
        (questionType === QUESTION_TYPES.ALGEBRA
          ? getPlainText(data?.question_text ?? "")
          : ""),
      difficultyLevel: data?.difficulty_level ?? DEFAULT_FORM.difficultyLevel,
      marks:
        data?.marks !== undefined && data?.marks !== null
          ? String(data.marks)
          : DEFAULT_FORM.marks,
      status: data?.status ?? DEFAULT_FORM.status,
      questionCategory:
        normalizedQuestionCategory || DEFAULT_FORM.questionCategory,
    },
    options,
    answerComponents,
    answerType,
    questionImages,
    algebraFormats,
    imageAnnotation: {
      image: annotationImage,
      fields: annotationFields,
      selectedFieldId: annotationFields[0]?.id ?? null,
    },
    dragDrop: dragDropState,
    solutionSteps,
  };
};

const getUnitClassInfo = (unit) => {
  const subject = unit?.subject ?? {};
  const grade =
    subject?.grade ?? subject?.grade_data ?? subject?.gradeData ?? {};
  const classCandidate =
    unit?.class ?? unit?.school_class ?? unit?.schoolClass ?? grade ?? {};

  const idCandidate =
    grade?.id ??
    grade?._id ??
    grade?.value ??
    subject?.grade_id ??
    subject?.gradeId ??
    classCandidate?.id ??
    classCandidate?._id ??
    classCandidate?.value ??
    classCandidate?.class_id ??
    classCandidate?.classId ??
    classCandidate?.grade_id ??
    classCandidate?.gradeId ??
    null;

  if (idCandidate === null || idCandidate === undefined || idCandidate === "") {
    return null;
  }

  const labelCandidate =
    classCandidate?.name ??
    classCandidate?.title ??
    classCandidate?.label ??
    grade?.name ??
    grade?.title ??
    (subject?.grade_id ? `Grade ${subject.grade_id}` : "") ??
    `Class ${idCandidate}`;

  const label = String(labelCandidate || `Class ${idCandidate}`).trim();

  return {
    id: String(idCandidate),
    label: label || `Class ${idCandidate}`,
  };
};

const buildQuestionHierarchy = (topicList) => {
  const classMap = new Map();
  const subjectsByClass = new Map();
  const unitsBySubject = new Map();
  const topicsByUnit = new Map();

  topicList.forEach((entry) => {
    const topic = entry?.topic ?? entry;
    const topicId = getTopicId(topic);
    if (!topicId) {
      return;
    }

    const unit = topic?.unit ?? entry?.unit ?? {};
    const unitId = getUnitId(unit);
    if (!unitId) {
      return;
    }

    const subject = unit?.subject ?? topic?.subject ?? entry?.subject ?? {};
    const subjectId = getSubjectId(subject) || getUnitSubjectId(unit);
    if (!subjectId) {
      return;
    }

    const classInfo = getUnitClassInfo(unit);
    if (!classInfo) {
      return;
    }

    if (!classMap.has(classInfo.id)) {
      classMap.set(classInfo.id, {
        value: classInfo.id,
        label: classInfo.label || `Class ${classInfo.id}`,
      });
    }

    if (!subjectsByClass.has(classInfo.id)) {
      subjectsByClass.set(classInfo.id, new Map());
    }
    const subjectMap = subjectsByClass.get(classInfo.id);
    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, {
        value: subjectId,
        label: getSubjectLabel(subject),
      });
    }

    if (!unitsBySubject.has(subjectId)) {
      unitsBySubject.set(subjectId, []);
    }
    const unitCollection = unitsBySubject.get(subjectId);
    if (!unitCollection.some((option) => option.value === unitId)) {
      unitCollection.push({
        value: unitId,
        label: getUnitLabel(unit),
        classId: classInfo.id,
      });
    }

    if (!topicsByUnit.has(unitId)) {
      topicsByUnit.set(unitId, []);
    }
    const topicCollection = topicsByUnit.get(unitId);
    if (!topicCollection.some((option) => option.value === topicId)) {
      topicCollection.push({
        value: topicId,
        label: getTopicLabel(topic),
      });
    }
  });

  return {
    classOptions: Array.from(classMap.values()),
    subjectsByClass: new Map(
      Array.from(subjectsByClass.entries()).map(([classId, subjectMap]) => [
        classId,
        Array.from(subjectMap.values()),
      ]),
    ),
    unitsBySubject,
    topicsByUnit,
  };
};

const findClassOption = (topicList, classId) => {
  if (!classId) {
    return null;
  }

  for (const entry of topicList) {
    const topic = entry?.topic ?? entry;
    const unit = topic?.unit ?? entry?.unit ?? {};
    const classInfo = getUnitClassInfo(unit);
    if (classInfo && classInfo.id === classId) {
      return {
        value: classInfo.id,
        label: classInfo.label || `Class ${classInfo.id}`,
      };
    }
  }

  return null;
};

const findSubjectOption = (topicList, subjectId) => {
  if (!subjectId) {
    return null;
  }

  for (const entry of topicList) {
    const topic = entry?.topic ?? entry;
    const unit = topic?.unit ?? entry?.unit ?? {};
    const subject = unit?.subject ?? topic?.subject ?? entry?.subject ?? {};
    const resolvedId = getSubjectId(subject) || getUnitSubjectId(unit);
    if (resolvedId && resolvedId === subjectId) {
      return {
        value: subjectId,
        label: getSubjectLabel(subject),
      };
    }
  }

  return null;
};

const findUnitOption = (topicList, unitId) => {
  if (!unitId) {
    return null;
  }

  for (const entry of topicList) {
    const topic = entry?.topic ?? entry;
    const unit = topic?.unit ?? entry?.unit ?? {};
    if (getUnitId(unit) === unitId) {
      const classInfo = getUnitClassInfo(unit);
      return {
        value: unitId,
        label: getUnitLabel(unit),
        classId: classInfo ? classInfo.id : "",
      };
    }
  }

  return null;
};

const findTopicOption = (topicList, topicId) => {
  if (!topicId) {
    return null;
  }

  for (const entry of topicList) {
    const topic = entry?.topic ?? entry;
    if (getTopicId(topic) === topicId) {
      return {
        value: topicId,
        label: getTopicLabel(topic),
      };
    }
  }

  return null;
};

const AssessmentQuestionForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const { state } = location;
  const fallbackStateQuestion = state?.question ?? null;
  const questionId =
    paramsId ||
    state?.questionId ||
    fallbackStateQuestion?._id ||
    fallbackStateQuestion?.id;
  const isEditMode = Boolean(questionId);

  const initialNormalised = React.useMemo(
    () => normaliseQuestion(fallbackStateQuestion),
    [fallbackStateQuestion],
  );

  const [formField, setFormField] = React.useState(initialNormalised.form);
  const basePath = location.pathname.startsWith("/data-entry")
    ? "/data-entry"
    : "/admin";
  const headerTitle =
    basePath === "/data-entry" ? "Data Entry Dashboard" : "Admin Dashboard";
  const statusValue = (formField.status || DEFAULT_FORM.status).toLowerCase();
  const isApprovedStatus = statusValue === "approved";
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";

  const [answerType, setAnswerType] = React.useState(
    initialNormalised.answerType ?? ANSWER_TYPES.TEXT,
  );
  const [options, setOptions] = React.useState(() =>
    ensureOptionList(
      initialNormalised.form.questionType,
      initialNormalised.answerType ?? ANSWER_TYPES.TEXT,
      initialNormalised.options,
    ),
  );
  const [answerComponents, setAnswerComponents] = React.useState(
    () => initialNormalised.answerComponents ?? [],
  );
  const [algebraFormats, setAlgebraFormats] = React.useState(
    () => initialNormalised.algebraFormats ?? createDefaultAlgebraFormats(true),
  );
  const [algebraStatement, setAlgebraStatement] = React.useState(
    () => initialNormalised.form.algebraStatement ?? "",
  );
  const [showComponentsPreview, setShowComponentsPreview] =
    React.useState(true);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showPreviewSolution, setShowPreviewSolution] = React.useState(false);
  const [draggingComponentId, setDraggingComponentId] = React.useState(null);
  const [questionImages, setQuestionImages] = React.useState(
    initialNormalised.questionImages ?? [],
  );
  const [imageAnnotation, setImageAnnotation] = React.useState(
    initialNormalised.imageAnnotation ?? {
      image: null,
      fields: [],
      selectedFieldId: null,
    },
  );
  const [dragDrop, setDragDrop] = React.useState(
    initialNormalised.dragDrop ?? createDefaultDragDropState(),
  );
  const [questionImageLoading, setQuestionImageLoading] = React.useState(false);
  const [optionImageLoadingMap, setOptionImageLoadingMap] = React.useState({});
  const [dragDropItemLoadingMap, setDragDropItemLoadingMap] = React.useState(
    {},
  );
  const [dragDropDiagramLoading, setDragDropDiagramLoading] =
    React.useState(false);
  const [dragDropLabelWidth, setDragDropLabelWidth] = React.useState(0);
  const [solutionSteps, setSolutionSteps] = React.useState(
    initialNormalised.solutionSteps ?? [createSolutionStep()],
  );
  const [solutionImageLoadingMap, setSolutionImageLoadingMap] = React.useState(
    {},
  );
  const [cropQueue, setCropQueue] = React.useState([]);
  const [activeCrop, setActiveCrop] = React.useState(null);
  const [processingCrop, setProcessingCrop] = React.useState(false);
  const [sourceDimensions, setSourceDimensions] = React.useState({
    width: 0,
    height: 0,
  });
  const [resizeCanvasSize, setResizeCanvasSize] = React.useState({
    width: 0,
    height: 0,
  });
  const annotationCanvasRef = React.useRef(null);
  const [annotationCanvasSize, setAnnotationCanvasSize] = React.useState({
    width: 0,
    height: 0,
  });
  const [draggingField, setDraggingField] = React.useState({
    id: null,
    offsetX: 0,
    offsetY: 0,
  });
  const dragDropCanvasRef = React.useRef(null);
  const dragDropLabelMeasureRef = React.useRef(null);
  const [dragDropCanvasSize, setDragDropCanvasSize] = React.useState({
    width: 0,
    height: 0,
  });
  const [draggingBlank, setDraggingBlank] = React.useState({
    id: null,
    offsetX: 0,
    offsetY: 0,
  });
  const [topics, setTopics] = React.useState([]);
  const [topicsLoading, setTopicsLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const questionImagesRef = React.useRef(questionImages);
  const solutionStepsRef = React.useRef(solutionSteps);
  const optionImagesRef = React.useRef(options);
  const annotationImageRef = React.useRef(imageAnnotation?.image ?? null);
  const dragDropItemsRef = React.useRef(dragDrop.items);
  const dragDropDiagramImageRef = React.useRef(dragDrop.diagram?.image ?? null);
  const resizeCanvasWrapperRef = React.useRef(null);
  const fabricCanvasRef = React.useRef(null);
  const fabricRef = React.useRef(null);
  const fabricImageRef = React.useRef(null);
  const fabricSourceRef = React.useRef(null);

  const updateResizeCanvasSize = React.useCallback(() => {
    if (!resizeCanvasWrapperRef.current) return;
    const rect = resizeCanvasWrapperRef.current.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(rect.width));
    const nextHeight = Math.max(1, Math.floor(rect.height));
    setResizeCanvasSize((prev) => {
      if (prev.width === nextWidth && prev.height === nextHeight) {
        return prev;
      }
      return { width: nextWidth, height: nextHeight };
    });
  }, []);

  React.useEffect(() => {
    if (!activeCrop) return;
    const frame = requestAnimationFrame(updateResizeCanvasSize);
    const handleResize = () => updateResizeCanvasSize();
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeCrop, updateResizeCanvasSize]);

  React.useEffect(() => {
    if (
      !activeCrop ||
      !fabricCanvasRef.current ||
      !resizeCanvasSize.width ||
      !resizeCanvasSize.height
    ) {
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }
      fabricRef.current = null;
      fabricImageRef.current = null;
      fabricSourceRef.current = null;
      return;
    }

    const fitImageToCanvas = (canvas, img) => {
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const imgWidth = img.width || 1;
      const imgHeight = img.height || 1;
      const scale = Math.min(
        canvasWidth / imgWidth,
        canvasHeight / imgHeight,
        1,
      );
      img.scale(scale);
      img.set({
        originX: "center",
        originY: "center",
        left: canvasWidth / 2,
        top: canvasHeight / 2,
      });
      img.setCoords();
    };

    const ensureCanvasSize = (canvas) => {
      if (
        canvas.getWidth() !== resizeCanvasSize.width ||
        canvas.getHeight() !== resizeCanvasSize.height
      ) {
        canvas.setWidth(resizeCanvasSize.width);
        canvas.setHeight(resizeCanvasSize.height);
      }
    };

    if (
      fabricSourceRef.current === activeCrop.src &&
      fabricRef.current &&
      fabricImageRef.current
    ) {
      const canvas = fabricRef.current;
      ensureCanvasSize(canvas);
      const img = fabricImageRef.current;
      img.set({
        originX: "center",
        originY: "center",
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
      });
      img.setCoords();
      canvas.requestRenderAll();
      return;
    }

    if (fabricRef.current) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }

    const canvas = new fabric.Canvas(fabricCanvasRef.current, {
      selection: false,
      preserveObjectStacking: true,
    });
    ensureCanvasSize(canvas);
    fabricRef.current = canvas;
    fabricSourceRef.current = activeCrop.src;

    fabric.Image.fromURL(
      activeCrop.src,
      (img) => {
        if (!img || !fabricRef.current) return;
        img.set({
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          lockUniScaling: true,
          lockScalingFlip: true,
          lockRotation: true,
          borderColor: "#111827",
          cornerColor: "#ffffff",
          cornerStrokeColor: "#111827",
          cornerSize: 12,
          transparentCorners: false,
          padding: 8,
        });
        img.setControlsVisibility({ mtr: false });
        fitImageToCanvas(canvas, img);
        fabricImageRef.current = img;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      },
      { crossOrigin: "anonymous" },
    );
  }, [activeCrop, resizeCanvasSize.height, resizeCanvasSize.width]);

  React.useEffect(() => {
    questionImagesRef.current = questionImages;
  }, [questionImages]);

  React.useEffect(() => {
    solutionStepsRef.current = solutionSteps;
  }, [solutionSteps]);

  React.useEffect(() => {
    optionImagesRef.current = options;
  }, [options]);

  React.useEffect(() => {
    annotationImageRef.current = imageAnnotation?.image ?? null;
  }, [imageAnnotation?.image]);

  React.useEffect(() => {
    dragDropItemsRef.current = dragDrop.items;
  }, [dragDrop.items]);

  React.useEffect(() => {
    dragDropDiagramImageRef.current = dragDrop.diagram?.image ?? null;
  }, [dragDrop.diagram?.image]);

  React.useLayoutEffect(() => {
    const measureEl = dragDropLabelMeasureRef.current;
    if (!measureEl) return;
    const labels = (dragDrop.labels ?? [])
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
  }, [dragDrop.labels, dragDropLabelWidth]);

  React.useEffect(() => {
    if (imageAnnotation.fields.length && !imageAnnotation.selectedFieldId) {
      setImageAnnotation((prev) => ({
        ...prev,
        selectedFieldId: prev.fields[0]?.id ?? null,
      }));
    }
  }, [imageAnnotation.fields, imageAnnotation.selectedFieldId]);

  React.useEffect(() => {
    if ((dragDrop.diagram?.blanks ?? []).length && !dragDrop.selectedBlankId) {
      setDragDrop((prev) => ({
        ...prev,
        selectedBlankId: prev.diagram?.blanks?.[0]?.id ?? null,
      }));
    }
  }, [dragDrop.diagram?.blanks, dragDrop.selectedBlankId]);

  React.useEffect(() => {
    return () => {
      questionImagesRef.current.forEach((image) => revokePreviewUrl(image.url));
      solutionStepsRef.current.forEach((step) => {
        (step.images ?? []).forEach((image) => revokePreviewUrl(image.url));
      });
      optionImagesRef.current.forEach((option) =>
        revokePreviewUrl(option.imageUrl),
      );
      if (
        annotationImageRef.current?.url &&
        annotationImageRef.current?.imageOrigin === IMAGE_ORIGIN.LOCAL
      ) {
        revokePreviewUrl(annotationImageRef.current.url);
      }
      dragDropItemsRef.current.forEach((item) => {
        if (item?.imageOrigin === IMAGE_ORIGIN.LOCAL) {
          revokePreviewUrl(item.imageUrl);
        }
      });
      if (
        dragDropDiagramImageRef.current?.url &&
        dragDropDiagramImageRef.current?.imageOrigin === IMAGE_ORIGIN.LOCAL
      ) {
        revokePreviewUrl(dragDropDiagramImageRef.current.url);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!activeCrop && cropQueue.length) {
      setActiveCrop(cropQueue[0]);
      setSourceDimensions({ width: 0, height: 0 });
      return;
    }
  }, [activeCrop, cropQueue]);

  React.useEffect(() => {
    if (activeCrop) {
      loadImage(activeCrop.src)
        .then((img) => {
          setSourceDimensions({
            width: img.naturalWidth || img.width || 0,
            height: img.naturalHeight || img.height || 0,
          });
        })
        .catch(() => {
          setSourceDimensions({ width: 0, height: 0 });
        });
      return;
    }
    const hasQuestion = cropQueue.some((task) => task.target === "question");
    if (!hasQuestion) {
      setQuestionImageLoading(false);
    }
    const hasDragDropDiagram = cropQueue.some(
      (task) => task.target === "drag_diagram",
    );
    if (!hasDragDropDiagram) {
      setDragDropDiagramLoading(false);
    }
    const queuedSolutionIds = new Set(
      cropQueue
        .filter((task) => task.target === "solution" && task.stepId)
        .map((task) => task.stepId),
    );
    const activeSolutionId =
      activeCrop?.target === "solution" ? activeCrop.stepId : null;
    setSolutionImageLoadingMap((prev) => {
      const keys = Object.keys(prev);
      if (!keys.length) {
        return prev;
      }
      let changed = false;
      const next = { ...prev };
      keys.forEach((key) => {
        if (!queuedSolutionIds.has(key) && key !== activeSolutionId) {
          if (next[key]) {
            next[key] = false;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
    const queuedDragDropItemIds = new Set(
      cropQueue
        .filter((task) => task.target === "drag_item" && task.itemId)
        .map((task) => task.itemId),
    );
    const activeDragDropItemId =
      activeCrop?.target === "drag_item" ? activeCrop.itemId : null;
    setDragDropItemLoadingMap((prev) => {
      const keys = Object.keys(prev);
      if (!keys.length) {
        return prev;
      }
      let changed = false;
      const next = { ...prev };
      keys.forEach((key) => {
        if (!queuedDragDropItemIds.has(key) && key !== activeDragDropItemId) {
          if (next[key]) {
            next[key] = false;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [activeCrop, cropQueue]);

  const hierarchy = React.useMemo(
    () => buildQuestionHierarchy(topics),
    [topics],
  );
  const {
    classOptions: derivedClassOptions,
    subjectsByClass,
    unitsBySubject,
    topicsByUnit,
  } = hierarchy;

  const classOptions = React.useMemo(() => {
    if (!formField.classId) {
      return derivedClassOptions;
    }

    if (
      derivedClassOptions.some((option) => option.value === formField.classId)
    ) {
      return derivedClassOptions;
    }

    const fallback = findClassOption(topics, formField.classId);
    return fallback ? [...derivedClassOptions, fallback] : derivedClassOptions;
  }, [derivedClassOptions, formField.classId, topics]);

  const subjectOptions = React.useMemo(() => {
    if (!formField.classId) {
      return [];
    }

    const options = subjectsByClass.get(formField.classId) ?? [];

    if (!formField.subjectId) {
      return options;
    }

    const hasSelected = options.some(
      (option) => option.value === formField.subjectId,
    );
    if (hasSelected) {
      return options;
    }

    const fallback = findSubjectOption(topics, formField.subjectId);
    return fallback ? [...options, fallback] : options;
  }, [formField.classId, formField.subjectId, subjectsByClass, topics]);

  const unitOptions = React.useMemo(() => {
    if (!formField.subjectId) {
      return [];
    }

    const source = unitsBySubject.get(formField.subjectId) ?? [];
    const options = source.filter((option) =>
      formField.classId ? option.classId === formField.classId : true,
    );

    if (!formField.unitId) {
      return options;
    }

    const hasSelected = options.some(
      (option) => option.value === formField.unitId,
    );
    if (hasSelected) {
      return options;
    }

    const fallback = findUnitOption(topics, formField.unitId);
    return fallback ? [...options, fallback] : options;
  }, [
    formField.classId,
    formField.subjectId,
    formField.unitId,
    unitsBySubject,
    topics,
  ]);

  const topicOptions = React.useMemo(() => {
    if (!formField.unitId) {
      return [];
    }

    const options = topicsByUnit.get(formField.unitId) ?? [];

    if (!formField.topicId) {
      return options;
    }

    const hasSelected = options.some(
      (option) => option.value === formField.topicId,
    );
    if (hasSelected) {
      return options;
    }

    const fallback = findTopicOption(topics, formField.topicId);
    return fallback ? [...options, fallback] : options;
  }, [formField.unitId, formField.topicId, topicsByUnit, topics]);

  const previewQuestion = React.useMemo(() => {
    const resolvedType =
      formField.questionType === QUESTION_TYPES.TEXT_INPUT &&
      answerComponents.length
        ? "fill_blank"
        : formField.questionType;

    const normalizedOptions = options.map((option, index) => ({
      id: option?.id ?? `opt-${index}`,
      text: option?.text ?? "",
      image: option?.imageUrl ?? option?.image ?? "",
      is_image:
        option?.mode === ANSWER_TYPES.IMAGE ||
        option?.is_image === true ||
        option?.isImage === true,
      isCorrect: Boolean(option?.isCorrect),
    }));

    const answerTypeValue =
      normalizedOptions.some((opt) => opt.is_image) &&
      resolvedType !== "text_input"
        ? "image"
        : "text";

    const components = (answerComponents || [])
      .map((component, idx) => {
        if (!component) return null;
        const type = getFillBlankComponentType(component);
        const id = getFillBlankComponentId(component, idx);
        if (type === FILL_BLANK_TYPES.STATEMENT) {
          return {
            id,
            type,
            text: component?.text ?? component?.statement ?? "",
          };
        }
        if (type === FILL_BLANK_TYPES.BLANK) {
          return {
            id,
            type,
            answer: component?.answer ?? component?.value ?? "",
          };
        }
        if (type === FILL_BLANK_TYPES.POWER) {
          return {
            id,
            type,
            base: component?.base ?? "",
            exponent: component?.exponent ?? "",
          };
        }
        if (type === FILL_BLANK_TYPES.FRACTION) {
          return {
            id,
            type,
            numerator: component?.numerator ?? "",
            denominator: component?.denominator ?? "",
          };
        }
        if (type === FILL_BLANK_TYPES.MIXED_NUMBER) {
          return {
            id,
            type,
            whole: component?.whole ?? "",
            numerator: component?.numerator ?? "",
            denominator: component?.denominator ?? "",
          };
        }
        return { id, type };
      })
      .filter(Boolean);

    const normalizedQuestionImages = (questionImages || [])
      .map((image) => image?.url ?? image?.image ?? image)
      .filter(Boolean);

    const annotationImage =
      imageAnnotation?.image?.url ?? imageAnnotation?.image ?? "";
    const annotationFields = (imageAnnotation?.fields ?? []).map(
      (field, idx) => ({
        id: field?.id ?? `annotation-${idx}`,
        label: field?.label ?? "",
        label_position:
          field?.labelPosition === "right" || field?.label_position === "right"
            ? "right"
            : "left",
        width: field?.width ?? field?.inputWidth ?? field?.input_width,
        x: field?.x ?? 10,
        y: field?.y ?? 10,
        answer: field?.answer ?? field?.correct_answer ?? "",
        correct_answer: field?.answer ?? field?.correct_answer ?? "",
      }),
    );

    const dragDropLabels = (dragDrop?.labels ?? []).map((label, index) => ({
      id: label?.id ?? `label-${index}`,
      text: label?.text ?? "",
      reusable: Boolean(label?.reusable),
    }));
    const dragDropItems = (dragDrop?.items ?? []).map((item, index) => ({
      id: item?.id ?? `item-${index}`,
      image: item?.imageUrl ?? "",
      correct_label_id: item?.correctLabelId ?? "",
    }));
    const dragDropDiagramImage =
      dragDrop?.diagram?.image?.url ?? dragDrop?.diagram?.image ?? "";
    const dragDropDiagramBlanks = (dragDrop?.diagram?.blanks ?? []).map(
      (blank, index) => ({
        id: blank?.id ?? `blank-${index}`,
        x: blank?.x ?? 0,
        y: blank?.y ?? 0,
        width: blank?.width ?? DRAG_DROP_BLANK_DEFAULT_WIDTH,
        height: blank?.height ?? DRAG_DROP_BLANK_DEFAULT_HEIGHT,
        correct_label_id: blank?.correctLabelId ?? "",
      }),
    );

    const algebraFormatsPayload = Array.isArray(algebraFormats)
      ? algebraFormats
      : [];
    const correctFormat =
      algebraFormatsPayload.find((format) => format.isCorrect) ?? null;
    const correctFormatKey = correctFormat?.key ?? "";
    const correctFormatValues = Array.isArray(correctFormat?.values)
      ? correctFormat.values
      : [];

    let correctAnswers = [];
    if (resolvedType === "mcq" || resolvedType === "check_box") {
      correctAnswers = normalizedOptions
        .filter((option) => option.isCorrect)
        .map((option) => String(option.id));
    } else if (resolvedType === "fill_blank" || resolvedType === "text_input") {
      correctAnswers = components
        .map((component) => {
          if (component.type === FILL_BLANK_TYPES.BLANK) {
            return component.answer ?? "";
          }
          if (component.type === FILL_BLANK_TYPES.POWER) {
            return [component.base ?? "", component.exponent ?? ""];
          }
          if (component.type === FILL_BLANK_TYPES.FRACTION) {
            return [component.numerator ?? "", component.denominator ?? ""];
          }
          if (component.type === FILL_BLANK_TYPES.MIXED_NUMBER) {
            return [
              component.whole ?? "",
              component.numerator ?? "",
              component.denominator ?? "",
            ];
          }
          return null;
        })
        .flat()
        .filter((value) => value !== null && value !== undefined);
    } else if (resolvedType === "image_annotation") {
      correctAnswers = annotationFields
        .map((field) => field.correct_answer ?? field.answer ?? "")
        .filter(Boolean);
    } else if (resolvedType === "drag_drop") {
      const isDiagram = dragDrop?.mode === DRAG_DROP_MODES.DIAGRAM_LABELS;
      correctAnswers = (isDiagram ? dragDropDiagramBlanks : dragDropItems)
        .map((entry) => entry.correct_label_id ?? entry.correctLabelId ?? "")
        .filter(Boolean);
    } else if (resolvedType === "algebra") {
      correctAnswers = correctFormatValues
        .map((value) => (value === null || value === undefined ? "" : value))
        .filter(Boolean);
    }

    return {
      question_id: questionId ?? "question-preview",
      question_type: resolvedType,
      question_text: formField.questionText ?? "",
      algebra_statement:
        algebraStatement ??
        formField.algebraStatement ??
        formField.answer_statement ??
        "",
      options: normalizedOptions,
      answer_type: answerTypeValue,
      components,
      correct_answers: correctAnswers,
      algebra_formats: algebraFormatsPayload,
      correct_format: correctFormatKey,
      images: normalizedQuestionImages,
      solution_steps: solutionSteps ?? [],
      annotation_image: annotationImage,
      annotation_fields: annotationFields,
      drag_drop_mode: dragDrop?.mode ?? DRAG_DROP_MODES.ITEM_GRID,
      drag_drop_labels: dragDropLabels,
      drag_drop_items: dragDropItems,
      drag_drop_diagram: {
        image: dragDropDiagramImage,
        blanks: dragDropDiagramBlanks,
      },
    };
  }, [
    formField.questionType,
    formField.questionText,
    formField.algebraStatement,
    formField.answer_statement,
    answerComponents,
    options,
    questionImages,
    algebraFormats,
    algebraStatement,
    imageAnnotation,
    dragDrop,
    solutionSteps,
    questionId,
  ]);

  const previewSelection = React.useMemo(() => {
    if (!previewQuestion) {
      return { value: null, list: [], components: {} };
    }

    const {
      question_type,
      correct_answers = [],
      components = [],
      options: previewOptions = [],
    } = previewQuestion;

    const normalizedCorrect = correct_answers.map((answer) =>
      answer === null || answer === undefined
        ? ""
        : String(normalizeCorrectAnswerValue(answer)),
    );

    const matchedOptionIds = previewOptions
      .filter((option) => isCorrectOption(option, normalizedCorrect))
      .map((option) => option.id);

    if (question_type === "check_box") {
      return {
        value: null,
        list: matchedOptionIds.length ? matchedOptionIds : normalizedCorrect,
        components: {},
      };
    }

    if (question_type === "mcq") {
      const matchedId =
        matchedOptionIds[0] ??
        previewOptions.find((opt) =>
          normalizedCorrect.includes(
            String(opt.text ?? opt.image ?? opt.id ?? ""),
          ),
        )?.id ??
        null;

      return {
        value: matchedId ?? normalizedCorrect[0] ?? null,
        list: [],
        components: {},
      };
    }

    if (question_type === "fill_blank") {
      const componentAnswers = components
        .map((component) => {
          if (!component) return null;
          if (component.type === FILL_BLANK_TYPES.BLANK) {
            return component.answer ?? "";
          }
          if (component.type === FILL_BLANK_TYPES.POWER) {
            return [component.base ?? "", component.exponent ?? ""];
          }
          if (component.type === FILL_BLANK_TYPES.FRACTION) {
            return [component.numerator ?? "", component.denominator ?? ""];
          }
          if (component.type === FILL_BLANK_TYPES.MIXED_NUMBER) {
            return [
              component.whole ?? "",
              component.numerator ?? "",
              component.denominator ?? "",
            ];
          }
          return null;
        })
        .flat()
        .filter((value) => value !== null && value !== undefined);
      const answersSource = normalizedCorrect.length
        ? normalizedCorrect
        : componentAnswers;
      const map = buildFillBlankStateFromAnswers(components, answersSource);
      const hasBlank = components.some(
        (component) =>
          component &&
          (component.type === FILL_BLANK_TYPES.BLANK ||
            component.type === FILL_BLANK_TYPES.POWER ||
            component.type === FILL_BLANK_TYPES.FRACTION ||
            component.type === FILL_BLANK_TYPES.MIXED_NUMBER),
      );
      return {
        value: hasBlank ? "" : (normalizedCorrect[0] ?? ""),
        list: [],
        components: map,
      };
    }

    if (question_type === "image_annotation") {
      const fields = Array.isArray(previewQuestion.annotation_fields)
        ? previewQuestion.annotation_fields
        : [];
      const map = {};
      fields.forEach((field, idx) => {
        const id = field?.id ?? `annotation-${idx}`;
        const answerValue =
          field?.correct_answer ??
          field?.answer ??
          normalizedCorrect[idx] ??
          "";
        map[id] = answerValue;
      });
      return { value: "", list: [], components: map };
    }

    if (question_type === "algebra") {
      return {
        value: normalizedCorrect,
        list: [],
        components: {},
      };
    }

    if (question_type === "drag_drop") {
      const targets = resolveDragDropTargets(previewQuestion);
      const map = {};
      targets.forEach((target) => {
        const labelId =
          target?.correctLabelId ??
          target?.correct_label_id ??
          target?.label_id ??
          target?.labelId ??
          "";
        if (
          labelId !== undefined &&
          labelId !== null &&
          String(labelId).trim()
        ) {
          map[target.id] = String(labelId);
        }
      });
      return { value: null, list: [], components: map };
    }

    if (question_type === "text_input") {
      return {
        value: normalizedCorrect[0] ?? "",
        list: [],
        components: {},
      };
    }

    return { value: null, list: [], components: {} };
  }, [previewQuestion]);
  const previewSolutionSteps = React.useMemo(() => {
    if (!previewQuestion?.solution_steps?.length) return [];
    return previewQuestion.solution_steps.filter((step) => {
      if (!step) return false;
      const rawText = String(step.explanation ?? step.text ?? "");
      const hasText = getPlainText(rawText) !== "";
      const images = Array.isArray(step.images) ? step.images : [];
      const hasImages = images.some((image) => {
        const value = image?.url ?? image?.image ?? image;
        return typeof value === "string" ? value.trim() !== "" : Boolean(value);
      });
      return hasText || hasImages;
    });
  }, [previewQuestion]);
  const hasPreviewSolution = previewSolutionSteps.length > 0;

  const selectionLabel = React.useMemo(() => {
    if (!previewQuestion) return "";
    if (previewQuestion.question_type === "check_box") {
      return "Choose multiple answers:";
    }
    if (previewQuestion.question_type === "mcq") {
      return "Choose single answer:";
    }
    if (previewQuestion.question_type === "algebra") {
      return "Choose answer format:";
    }
    if (previewQuestion.question_type === "image_annotation") {
      return "Fill the input fields on the image:";
    }
    if (
      (previewQuestion.question_type === "text_input" ||
        previewQuestion.question_type === "fill_blank") &&
      !(previewQuestion.components || []).length
    ) {
      return "Type the correct answer:";
    }
    return "";
  }, [previewQuestion]);

  React.useEffect(() => {
    if (!showPreview) {
      setShowPreviewSolution(false);
    }
  }, [showPreview]);

  const setOptionImageLoadingState = React.useCallback((id, isLoading) => {
    if (!id) {
      return;
    }
    setOptionImageLoadingMap((prev) => {
      const currentlyLoading = Boolean(prev[id]);
      if (isLoading) {
        if (currentlyLoading) {
          return prev;
        }
        return { ...prev, [id]: true };
      }
      if (!currentlyLoading) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setSolutionImageLoadingState = React.useCallback((id, isLoading) => {
    if (!id) {
      return;
    }
    setSolutionImageLoadingMap((prev) => {
      const currentlyLoading = Boolean(prev[id]);
      if (isLoading) {
        if (currentlyLoading) {
          return prev;
        }
        return { ...prev, [id]: true };
      }
      if (!currentlyLoading) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setDragDropItemLoadingState = React.useCallback((id, isLoading) => {
    if (!id) {
      return;
    }
    setDragDropItemLoadingMap((prev) => {
      const currentlyLoading = Boolean(prev[id]);
      if (isLoading) {
        if (currentlyLoading) {
          return prev;
        }
        return { ...prev, [id]: true };
      }
      if (!currentlyLoading) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  React.useEffect(() => {
    const fetchTopics = async () => {
      setTopicsLoading(true);
      try {
        const response = await getAllTopics();
        setTopics(resolveTopicsList(response));
      } catch (err) {
        const message =
          err?.message || "Unable to load topics. Please try again.";
        toast.error(message);
      } finally {
        setTopicsLoading(false);
      }
    };

    fetchTopics();
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !questionId) {
      return;
    }

    let isCancelled = false;

    const fetchQuestion = async () => {
      try {
        setFetching(true);
        const response = await getQuestionById(questionId);
        if (isCancelled) {
          return;
        }
        const hydrated = normaliseQuestion(response);
        setFormField((prev) => ({
          ...prev,
          ...hydrated.form,
        }));
        setAnswerType(hydrated.answerType ?? ANSWER_TYPES.TEXT);
        setOptions(
          ensureOptionList(
            hydrated.form.questionType,
            hydrated.answerType ?? ANSWER_TYPES.TEXT,
            hydrated.options,
          ),
        );
        setAnswerComponents(hydrated.answerComponents ?? []);
        setQuestionImages(hydrated.questionImages ?? []);
        setImageAnnotation(
          hydrated.imageAnnotation ?? {
            image: null,
            fields: [],
            selectedFieldId: null,
          },
        );
        setDragDrop(hydrated.dragDrop ?? createDefaultDragDropState());
        setSolutionSteps(hydrated.solutionSteps ?? [createSolutionStep({})]);
      } catch (err) {
        if (isCancelled) {
          return;
        }
        const message =
          err?.message || "Unable to load question details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (!isCancelled) {
          setFetching(false);
        }
      }
    };

    fetchQuestion();

    return () => {
      isCancelled = true;
    };
  }, [isEditMode, questionId]);

  const handleClassSelect = React.useCallback(
    (nextValue) => {
      if (isEditMode) {
        return;
      }
      const value = nextValue || "";
      setFormField((prev) => {
        if (value === prev.classId) {
          return prev;
        }
        return {
          ...prev,
          classId: value,
          subjectId: "",
          unitId: "",
          topicId: "",
        };
      });
    },
    [isEditMode],
  );

  const handleSubjectSelect = React.useCallback(
    (nextValue) => {
      if (isEditMode) {
        return;
      }
      const value = nextValue || "";
      setFormField((prev) => {
        if (value === prev.subjectId) {
          return prev;
        }
        return {
          ...prev,
          subjectId: value,
          unitId: "",
          topicId: "",
        };
      });
    },
    [isEditMode],
  );

  const handleUnitSelect = React.useCallback(
    (nextValue) => {
      if (isEditMode) {
        return;
      }
      const value = nextValue || "";
      setFormField((prev) => {
        if (value === prev.unitId) {
          return prev;
        }
        return {
          ...prev,
          unitId: value,
          topicId: "",
        };
      });
    },
    [isEditMode],
  );

  const handleTopicSelect = React.useCallback((nextValue) => {
    const value = nextValue || "";
    setFormField((prev) => ({
      ...prev,
      topicId: value,
    }));
  }, []);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionTypeChange = (event) => {
    const { value } = event.target;
    if (
      formField.questionType === QUESTION_TYPES.DRAG_DROP &&
      value !== QUESTION_TYPES.DRAG_DROP
    ) {
      dragDrop.items.forEach((item) => {
        if (item?.imageOrigin === IMAGE_ORIGIN.LOCAL) {
          revokePreviewUrl(item.imageUrl);
        }
      });
      if (
        dragDrop.diagram?.image?.imageOrigin === IMAGE_ORIGIN.LOCAL &&
        dragDrop.diagram?.image?.url
      ) {
        revokePreviewUrl(dragDrop.diagram.image.url);
      }
    }
    setFormField((prev) => ({ ...prev, questionType: value }));
    setShowComponentsPreview(true);

    if (value === QUESTION_TYPES.TEXT_INPUT) {
      setAnswerComponents((prev) =>
        prev.length ? prev : getDefaultAnswerComponents(),
      );
      setOptions((prev) => {
        prev.forEach((option) => revokePreviewUrl(option.imageUrl));
        return [];
      });
      setAnswerType(ANSWER_TYPES.TEXT);
    } else if (value === QUESTION_TYPES.ALGEBRA) {
      setAnswerComponents(getDefaultAnswerComponents());
      setOptions((prev) => {
        prev.forEach((option) => revokePreviewUrl(option.imageUrl));
        return [];
      });
      setAnswerType(ANSWER_TYPES.TEXT);
      setAlgebraFormats((prev) =>
        prev && prev.length ? prev : createDefaultAlgebraFormats(true),
      );
      setAlgebraStatement((prev) => prev || "");
    } else if (value === QUESTION_TYPES.DRAG_DROP) {
      setAnswerComponents(getDefaultAnswerComponents());
      setOptions((prev) => {
        prev.forEach((option) => revokePreviewUrl(option.imageUrl));
        return [];
      });
      setAnswerType(ANSWER_TYPES.TEXT);
      setDragDrop(createDefaultDragDropState());
    } else if (value === QUESTION_TYPES.IMAGE_ANNOTATION) {
      setAnswerComponents(getDefaultAnswerComponents());
      setOptions((prev) => {
        prev.forEach((option) => revokePreviewUrl(option.imageUrl));
        return [];
      });
      setAnswerType(ANSWER_TYPES.TEXT);
      setImageAnnotation((prev) => {
        const nextFields =
          prev?.fields && prev.fields.length
            ? prev.fields
            : [createAnnotationField()];
        return {
          image: prev?.image ?? null,
          fields: nextFields,
          selectedFieldId: nextFields[0]?.id ?? null,
        };
      });
    } else {
      setAnswerComponents(getDefaultAnswerComponents());
      setOptions((prev) => ensureOptionList(value, answerType, prev));
    }
  };

  const handleQuestionTextChange = (value) => {
    setFormField((prev) => ({ ...prev, questionText: value }));
  };

  const toggleAlgebraFormatEnabled = (formatKey) => {
    setAlgebraFormats((prev) =>
      prev.map((format) => {
        if (format.key !== formatKey) {
          return format;
        }
        const nextEnabled = !format.enabled;
        return {
          ...format,
          enabled: nextEnabled,
          isCorrect: nextEnabled ? format.isCorrect : false,
        };
      }),
    );
  };

  const markAlgebraFormatCorrect = (formatKey) => {
    setAlgebraFormats((prev) =>
      prev.map((format) => ({
        ...format,
        enabled: format.key === formatKey ? true : format.enabled,
        isCorrect: format.key === formatKey,
      })),
    );
  };

  const updateAlgebraFormatValue = (formatKey, index, nextValue) => {
    setAlgebraFormats((prev) =>
      prev.map((format) => {
        if (format.key !== formatKey) {
          return format;
        }
        const nextValues = Array.isArray(format.values)
          ? [...format.values]
          : [];
        nextValues[index] = nextValue;
        return { ...format, values: nextValues };
      }),
    );
  };

  const renderAlgebraInputs = (format, disabled) => {
    const values = Array.isArray(format.values) ? format.values : [];
    const updateValue = (index) => (event) =>
      updateAlgebraFormatValue(format.key, index, event.target.value);

    if (format.key === "whole_number") {
      return (
        <input
          type="text"
          className="form-input !w-28"
          value={values[0] ?? ""}
          onChange={updateValue(0)}
          placeholder="e.g., 11"
          disabled={disabled}
        />
      );
    }

    if (format.key === "fraction") {
      return (
        <div className="flex flex-col items-center gap-1">
          <input
            type="text"
            className="form-input !w-24 !text-center !bg-white !rounded-none"
            value={values[0] ?? ""}
            onChange={updateValue(0)}
            placeholder=""
            disabled={disabled}
          />
          <span className="block h-px w-full bg-slate-300" />
          <input
            type="text"
            className="form-input !w-24 !text-center !bg-white !rounded-none"
            value={values[1] ?? ""}
            onChange={updateValue(1)}
            placeholder=""
            disabled={disabled}
          />
        </div>
      );
    }

    if (format.key === "mixed_number") {
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="form-input !w-20 !text-center !bg-white !rounded-none"
            value={values[0] ?? ""}
            onChange={updateValue(0)}
            placeholder=""
            disabled={disabled}
          />
          <div className="flex flex-col items-center gap-1">
            <input
              type="text"
              className="form-input !w-20 !text-center !bg-white !rounded-none"
              value={values[1] ?? ""}
              onChange={updateValue(1)}
              placeholder=""
              disabled={disabled}
            />
            <span className="block h-px w-full bg-slate-300" />
            <input
              type="text"
              className="form-input !w-20 !text-center !bg-white !rounded-none"
              value={values[2] ?? ""}
              onChange={updateValue(2)}
              placeholder=""
              disabled={disabled}
            />
          </div>
        </div>
      );
    }

    if (format.key === "base_exponent") {
      return (
        <div className="flex items-start gap-2">
          <input
            type="text"
            className="form-input !w-24 !text-center !bg-white !rounded-none"
            value={values[0] ?? ""}
            onChange={updateValue(0)}
            placeholder="base"
            disabled={disabled}
          />
          <input
            type="text"
            className="form-input !w-16 !h-[13px] !text-center text-xs !bg-white !rounded-none"
            value={values[1] ?? ""}
            onChange={updateValue(1)}
            placeholder="exp"
            disabled={disabled}
          />
        </div>
      );
    }

    if (format.key === "decimal") {
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="form-input !w-20 !text-center !bg-white !rounded-none"
            value={values[0] ?? ""}
            onChange={updateValue(0)}
            placeholder="whole"
            disabled={disabled}
          />
          <span className="text-slate-500">.</span>
          <input
            type="text"
            className="form-input !w-20 !text-center !bg-white !rounded-none"
            value={values[1] ?? ""}
            onChange={updateValue(1)}
            placeholder="fractional"
            disabled={disabled}
          />
        </div>
      );
    }

    return null;
  };

  const clearLoadingForTarget = (meta) => {
    if (!meta) return;
    if (meta.target === "option" && meta.optionId) {
      setOptionImageLoadingState(meta.optionId, false);
    }
    if (meta.target === "drag_item" && meta.itemId) {
      setDragDropItemLoadingState(meta.itemId, false);
    }
    if (meta.target === "question") {
      setQuestionImageLoading(false);
    }
    if (meta.target === "solution" && meta.stepId) {
      setSolutionImageLoadingState(meta.stepId, false);
    }
    if (meta.target === "drag_diagram") {
      setDragDropDiagramLoading(false);
    }
  };

  const queueCropTask = async (file, meta) => {
    if (!file) return;
    try {
      const src = await readFileAsDataUrl(file);
      setCropQueue((prev) => [
        ...prev,
        {
          ...meta,
          src,
          fileName: file.name || "image.jpg",
          fileType: file.type || "image/jpeg",
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to open the selected image for resizing.";
      toast.error(message);
      clearLoadingForTarget(meta);
    }
  };

  const applyCroppedResult = (file, meta) => {
    const preview = createPreviewUrl(file);
    if (meta.target === "option" && meta.optionId) {
      setAnswerType(ANSWER_TYPES.IMAGE);
      setOptions((prev) =>
        prev.map((option) =>
          option.id === meta.optionId
            ? (() => {
                revokePreviewUrl(option.imageUrl);
                return {
                  ...option,
                  imageUrl: preview,
                  file,
                  imageOrigin: IMAGE_ORIGIN.LOCAL,
                  mode: ANSWER_TYPES.IMAGE,
                };
              })()
            : option,
        ),
      );
      setOptionImageLoadingState(meta.optionId, false);
      return;
    }

    if (meta.target === "question") {
      setQuestionImages((prev) => [
        ...prev,
        { id: generateId(), file, url: preview },
      ]);
      setQuestionImageLoading(false);
      return;
    }

    if (meta.target === "solution" && meta.stepId) {
      setSolutionSteps((prev) =>
        prev.map((step) =>
          step.id === meta.stepId
            ? {
                ...step,
                images: [
                  ...(step.images ?? []),
                  { id: generateId(), file, url: preview },
                ],
              }
            : step,
        ),
      );
      setSolutionImageLoadingState(meta.stepId, false);
      return;
    }

    if (meta.target === "drag_item" && meta.itemId) {
      setDragDrop((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === meta.itemId
            ? (() => {
                revokePreviewUrl(item.imageUrl);
                return {
                  ...item,
                  imageUrl: preview,
                  file,
                  imageOrigin: IMAGE_ORIGIN.LOCAL,
                };
              })()
            : item,
        ),
      }));
      setDragDropItemLoadingState(meta.itemId, false);
      return;
    }

    if (meta.target === "drag_diagram") {
      setDragDrop((prev) => {
        if (
          prev?.diagram?.image?.imageOrigin === IMAGE_ORIGIN.LOCAL &&
          prev?.diagram?.image?.url
        ) {
          revokePreviewUrl(prev.diagram.image.url);
        }
        return {
          ...prev,
          diagram: {
            ...prev.diagram,
            image: {
              id: generateId(),
              file,
              url: preview,
              imageOrigin: IMAGE_ORIGIN.LOCAL,
            },
          },
        };
      });
      setDragDropDiagramLoading(false);
      return;
    }

    if (meta.target === "annotation") {
      setImageAnnotation((prev) => {
        if (
          prev?.image?.imageOrigin === IMAGE_ORIGIN.LOCAL &&
          prev?.image?.url
        ) {
          revokePreviewUrl(prev.image.url);
        }
        const nextFields =
          prev?.fields && prev.fields.length
            ? prev.fields
            : [createAnnotationField()];
        const selectedId =
          prev?.selectedFieldId ??
          prev?.fields?.[0]?.id ??
          nextFields[0]?.id ??
          null;
        return {
          image: {
            id: generateId(),
            file,
            url: preview,
            imageOrigin: IMAGE_ORIGIN.LOCAL,
          },
          fields: nextFields,
          selectedFieldId: selectedId,
        };
      });
      refreshAnnotationCanvasSize();
    }
  };

  const completeCropAndAdvance = () => {
    setCropQueue((prev) => prev.slice(1));
    setActiveCrop(null);
    setZoom(1);
  };

  const handleCropSave = async () => {
    if (!activeCrop) {
      toast.error("Please resize the image before saving.");
      return;
    }
    try {
      setProcessingCrop(true);
      const image = fabricImageRef.current;
      if (!image) {
        toast.error("Please resize the image before saving.");
        return;
      }
      const element = image.getElement();
      if (!element) {
        toast.error("Please resize the image before saving.");
        return;
      }
      const scaledWidth = Math.max(1, Math.round(image.getScaledWidth()));
      const scaledHeight = Math.max(1, Math.round(image.getScaledHeight()));
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = scaledWidth;
      exportCanvas.height = scaledHeight;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) {
        toast.error("Unable to process the resized image.");
        return;
      }
      ctx.drawImage(element, 0, 0, scaledWidth, scaledHeight);
      const dataUrl = exportCanvas.toDataURL("image/png", 1);
      const croppedFile = await dataUrlToFile(
        dataUrl,
        activeCrop.fileName,
        "image/png",
      );
      applyCroppedResult(croppedFile, activeCrop);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to process the resized image.";
      toast.error(message);
      clearLoadingForTarget(activeCrop);
    } finally {
      setProcessingCrop(false);
      completeCropAndAdvance();
    }
  };

  const handleCropCancel = () => {
    if (activeCrop) {
      clearLoadingForTarget(activeCrop);
    }
    completeCropAndAdvance();
  };

  const handleOptionValueChange = (id, value) => {
    setOptions((prev) =>
      prev.map((option) =>
        option.id === id
          ? {
              ...option,
              text: answerType === ANSWER_TYPES.TEXT ? value : option.text,
              imageUrl:
                answerType === ANSWER_TYPES.IMAGE ? value : option.imageUrl,
              mode: answerType,
            }
          : option,
      ),
    );
  };

  const handleOptionFileChange = (id, file) => {
    if (!file) {
      return;
    }

    setAnswerType(ANSWER_TYPES.IMAGE);
    setOptionImageLoadingState(id, true);
    queueCropTask(file, { target: "option", optionId: id });
  };

  const toggleCorrectAnswer = (id) => {
    if (formField.questionType === QUESTION_TYPES.MCQ) {
      setOptions((prev) =>
        prev.map((option) =>
          option.id === id
            ? { ...option, isCorrect: !option.isCorrect }
            : { ...option, isCorrect: false },
        ),
      );
      return;
    }

    setOptions((prev) =>
      prev.map((option) =>
        option.id === id ? { ...option, isCorrect: !option.isCorrect } : option,
      ),
    );
  };

  const addOption = () => {
    setOptions((prev) => [...prev, createOption(answerType)]);
  };

  const removeOption = (id) => {
    setOptions((prev) => {
      if (prev.length <= 2) {
        toast.error("At least two options are required.");
        return prev;
      }
      const target = prev.find((option) => option.id === id);
      if (target) {
        revokePreviewUrl(target.imageUrl);
      }
      return prev.filter((option) => option.id !== id);
    });
  };

  const handleComponentValueChange = (id, field, value) => {
    setAnswerComponents((prev) =>
      prev.map((component) => {
        if (component.id !== id) {
          return component;
        }
        if (component.type === COMPONENT_TYPES.STATEMENT) {
          return { ...component, text: value };
        }
        if (component.type === COMPONENT_TYPES.BLANK) {
          return { ...component, answer: value };
        }
        if (component.type === COMPONENT_TYPES.POWER) {
          return {
            ...component,
            base: field === "base" ? value : component.base,
            exponent: field === "exponent" ? value : component.exponent,
          };
        }
        if (component.type === COMPONENT_TYPES.FRACTION) {
          return {
            ...component,
            numerator: field === "numerator" ? value : component.numerator,
            denominator:
              field === "denominator" ? value : component.denominator,
          };
        }
        if (component.type === COMPONENT_TYPES.MIXED_NUMBER) {
          return {
            ...component,
            whole: field === "whole" ? value : component.whole,
            numerator: field === "numerator" ? value : component.numerator,
            denominator:
              field === "denominator" ? value : component.denominator,
          };
        }
        return component;
      }),
    );
  };

  const addStatementComponent = () => {
    setAnswerComponents((prev) => [...prev, createStatementComponent("")]);
  };

  const addInputComponent = () => {
    setAnswerComponents((prev) => [...prev, createBlankComponent("")]);
  };

  const addLineBreakComponent = () => {
    setAnswerComponents((prev) => [...prev, createLineBreakComponent()]);
  };

  const handleComponentDragStart = (id) => {
    setDraggingComponentId(id);
  };

  const handleComponentDragEnd = () => {
    setDraggingComponentId(null);
  };

  const handleComponentDrop = (targetId) => {
    if (!draggingComponentId || draggingComponentId === targetId) {
      return;
    }
    setAnswerComponents((prev) => {
      const fromIndex = prev.findIndex(
        (item) => item.id === draggingComponentId,
      );
      const toIndex = prev.findIndex((item) => item.id === targetId);
      if (fromIndex === -1 || toIndex === -1) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const updateComponentType = (id, nextType) => {
    setAnswerComponents((prev) =>
      prev.map((component) => {
        if (component.id !== id) {
          return component;
        }
        if (nextType === COMPONENT_TYPES.BLANK) {
          return {
            id,
            type: COMPONENT_TYPES.BLANK,
            answer:
              component.answer ??
              component.base ??
              component.numerator ??
              component.text ??
              "",
          };
        }
        if (nextType === COMPONENT_TYPES.POWER) {
          return {
            id,
            type: COMPONENT_TYPES.POWER,
            base:
              component.base ??
              component.answer ??
              component.numerator ??
              component.text ??
              "",
            exponent: component.exponent ?? component.denominator ?? "",
          };
        }
        if (nextType === COMPONENT_TYPES.FRACTION) {
          return {
            id,
            type: COMPONENT_TYPES.FRACTION,
            numerator:
              component.numerator ??
              component.answer ??
              component.base ??
              component.text ??
              "",
            denominator: component.denominator ?? component.exponent ?? "",
          };
        }
        if (nextType === COMPONENT_TYPES.MIXED_NUMBER) {
          return {
            id,
            type: COMPONENT_TYPES.MIXED_NUMBER,
            whole:
              component.whole ??
              component.answer ??
              component.base ??
              component.text ??
              "",
            numerator:
              component.numerator ??
              component.exponent ??
              component.answer ??
              "",
            denominator: component.denominator ?? "",
          };
        }
        return component;
      }),
    );
  };

  const removeComponent = (id) => {
    setAnswerComponents((prev) => {
      const target = prev.find((component) => component.id === id);
      if (!target) {
        return prev;
      }
      const next = prev.filter((component) => component.id !== id);
      return next;
    });
  };

  const handleAnswerTypeChange = (event) => {
    const { value } = event.target;
    const nextType =
      value === ANSWER_TYPES.IMAGE ? ANSWER_TYPES.IMAGE : ANSWER_TYPES.TEXT;
    setAnswerType(nextType);
    setOptions((prev) => {
      return ensureOptionList(formField.questionType, nextType, prev).map(
        (option) => ({
          ...option,
          mode: nextType,
        }),
      );
    });
  };

  const handleQuestionImageUpload = async (event) => {
    const target = event.target;
    const files = target?.files;
    if (!files || !files.length) {
      return;
    }

    setQuestionImageLoading(true);
    try {
      const fileList = Array.from(files);
      for (const file of fileList) {
        // revoke possible previous previews is not needed because crop creates new ones
        // Queue each file for resizing
        // eslint-disable-next-line no-await-in-loop
        await queueCropTask(file, { target: "question" });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to process the selected image. Please try again.";
      toast.error(message);
    } finally {
      if (target) {
        target.value = "";
      }
    }
  };

  const removeQuestionImage = (id) => {
    setQuestionImages((prev) => {
      const targetImage = prev.find((image) => image.id === id);
      if (targetImage) {
        revokePreviewUrl(targetImage.url);
      }
      return prev.filter((image) => image.id !== id);
    });
  };

  const refreshAnnotationCanvasSize = React.useCallback(() => {
    if (!annotationCanvasRef.current) return;
    const rect = annotationCanvasRef.current.getBoundingClientRect();
    setAnnotationCanvasSize((prev) => {
      if (prev.width === rect.width && prev.height === rect.height) {
        return prev;
      }
      return { width: rect.width, height: rect.height };
    });
  }, []);

  React.useEffect(() => {
    const handleResize = () => refreshAnnotationCanvasSize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [refreshAnnotationCanvasSize]);

  const handleAnnotationImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await queueCropTask(file, { target: "annotation" });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to process the selected image. Please try again.";
      toast.error(message);
    } finally {
      if (event?.target) {
        event.target.value = "";
      }
    }
  };

  const removeAnnotationImage = () => {
    setImageAnnotation((prev) => {
      if (prev?.image?.url) {
        revokePreviewUrl(prev.image.url);
      }
      return { image: null, fields: [], selectedFieldId: null };
    });
    setAnnotationCanvasSize({ width: 0, height: 0 });
  };

  const addAnnotationField = () => {
    if (!imageAnnotation?.image) {
      toast.error("Upload an image before adding input fields.");
      return;
    }
    setImageAnnotation((prev) => {
      const nextField = createAnnotationField({
        x: clampPercent(8 * prev.fields.length + 10, 10),
        y: clampPercent(6 * prev.fields.length + 10, 10),
      });
      return {
        ...prev,
        fields: [...prev.fields, nextField],
        selectedFieldId: nextField.id,
      };
    });
  };

  const selectAnnotationField = (id) => {
    setImageAnnotation((prev) => ({
      ...prev,
      selectedFieldId: id,
    }));
  };

  const updateAnnotationField = (id, updates) => {
    setImageAnnotation((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === id ? { ...field, ...updates } : field,
      ),
    }));
  };

  const removeAnnotationField = (id) => {
    setImageAnnotation((prev) => {
      const nextFields = prev.fields.filter((field) => field.id !== id);
      const nextSelected =
        prev.selectedFieldId === id
          ? (nextFields[0]?.id ?? null)
          : prev.selectedFieldId;
      return {
        ...prev,
        fields: nextFields,
        selectedFieldId: nextSelected,
      };
    });
  };

  const handleDragDropModeChange = (mode) => {
    const nextMode =
      mode === DRAG_DROP_MODES.DIAGRAM_LABELS
        ? DRAG_DROP_MODES.DIAGRAM_LABELS
        : DRAG_DROP_MODES.ITEM_GRID;
    setDragDrop((prev) => ({
      ...prev,
      mode: nextMode,
    }));
  };

  const handleDragDropLabelChange = (id, value) => {
    setDragDrop((prev) => ({
      ...prev,
      labels: prev.labels.map((label) =>
        label.id === id ? { ...label, text: value } : label,
      ),
    }));
  };

  const toggleDragDropLabelReusable = (id) => {
    setDragDrop((prev) => ({
      ...prev,
      labels: prev.labels.map((label) =>
        label.id === id ? { ...label, reusable: !label.reusable } : label,
      ),
    }));
  };

  const addDragDropLabel = () => {
    setDragDrop((prev) => ({
      ...prev,
      labels: [...prev.labels, createDragDropLabel()],
    }));
  };

  const removeDragDropLabel = (id) => {
    setDragDrop((prev) => {
      if (prev.labels.length <= 1) {
        toast.error("At least one label is required.");
        return prev;
      }
      return {
        ...prev,
        labels: prev.labels.filter((label) => label.id !== id),
        items: prev.items.map((item) =>
          item.correctLabelId === id ? { ...item, correctLabelId: "" } : item,
        ),
        diagram: {
          ...prev.diagram,
          blanks: (prev.diagram?.blanks ?? []).map((blank) =>
            blank.correctLabelId === id
              ? { ...blank, correctLabelId: "" }
              : blank,
          ),
        },
      };
    });
  };

  const handleDragDropItemCorrectLabelChange = (id, value) => {
    setDragDrop((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, correctLabelId: value } : item,
      ),
    }));
  };

  const handleDragDropItemFileChange = (id, file) => {
    if (!file) {
      return;
    }
    setDragDropItemLoadingState(id, true);
    queueCropTask(file, { target: "drag_item", itemId: id });
  };

  const clearDragDropItemImage = (id) => {
    setDragDropItemLoadingState(id, false);
    setDragDrop((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id
          ? (() => {
              if (item.imageOrigin === IMAGE_ORIGIN.LOCAL) {
                revokePreviewUrl(item.imageUrl);
              }
              return {
                ...item,
                imageUrl: "",
                file: null,
                imageOrigin: IMAGE_ORIGIN.NONE,
              };
            })()
          : item,
      ),
    }));
  };

  const addDragDropItem = () => {
    setDragDrop((prev) => ({
      ...prev,
      items: [...prev.items, createDragDropItem()],
    }));
  };

  const removeDragDropItem = (id) => {
    setDragDrop((prev) => {
      if (prev.items.length <= 1) {
        toast.error("At least one item is required.");
        return prev;
      }
      const target = prev.items.find((item) => item.id === id);
      if (target?.imageOrigin === IMAGE_ORIGIN.LOCAL) {
        revokePreviewUrl(target.imageUrl);
      }
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      };
    });
  };

  const handleDragDropDiagramImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setDragDropDiagramLoading(true);
      await queueCropTask(file, { target: "drag_diagram" });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to process the selected image. Please try again.";
      toast.error(message);
    } finally {
      if (event?.target) {
        event.target.value = "";
      }
    }
  };

  const removeDragDropDiagramImage = () => {
    setDragDrop((prev) => {
      if (prev?.diagram?.image?.imageOrigin === IMAGE_ORIGIN.LOCAL) {
        revokePreviewUrl(prev.diagram.image.url);
      }
      return {
        ...prev,
        diagram: {
          image: null,
          blanks: [],
        },
        selectedBlankId: null,
      };
    });
    setDragDropCanvasSize({ width: 0, height: 0 });
  };

  const addDragDropBlank = () => {
    if (!dragDrop.diagram?.image) {
      toast.error("Upload a diagram image before adding blanks.");
      return;
    }
    setDragDrop((prev) => {
      const offset = prev.diagram?.blanks?.length ?? 0;
      const nextBlank = createDragDropBlank({
        x: clampPercent(8 * offset + 10, 10),
        y: clampPercent(6 * offset + 10, 10),
      });
      return {
        ...prev,
        diagram: {
          ...prev.diagram,
          blanks: [...(prev.diagram?.blanks ?? []), nextBlank],
        },
        selectedBlankId: nextBlank.id,
      };
    });
  };

  const removeDragDropBlank = (id) => {
    setDragDrop((prev) => {
      const nextBlanks = (prev.diagram?.blanks ?? []).filter(
        (blank) => blank.id !== id,
      );
      const nextSelected =
        prev.selectedBlankId === id
          ? (nextBlanks[0]?.id ?? null)
          : prev.selectedBlankId;
      return {
        ...prev,
        diagram: {
          ...prev.diagram,
          blanks: nextBlanks,
        },
        selectedBlankId: nextSelected,
      };
    });
  };

  const selectDragDropBlank = (id) => {
    setDragDrop((prev) => ({
      ...prev,
      selectedBlankId: id,
    }));
  };

  const handleDragDropBlankCorrectLabelChange = (id, value) => {
    setDragDrop((prev) => ({
      ...prev,
      diagram: {
        ...prev.diagram,
        blanks: (prev.diagram?.blanks ?? []).map((blank) =>
          blank.id === id ? { ...blank, correctLabelId: value } : blank,
        ),
      },
    }));
  };

  const setAnnotationFieldPosition = React.useCallback(
    (id, xPx, yPx, rectOverride = null) => {
      const rect = rectOverride ??
        annotationCanvasRef.current?.getBoundingClientRect() ?? {
          width: annotationCanvasSize.width,
          height: annotationCanvasSize.height,
        };
      const containerWidth = rect?.width || annotationCanvasSize.width || 0;
      const containerHeight = rect?.height || annotationCanvasSize.height || 0;
      if (!containerWidth || !containerHeight) return;

      setImageAnnotation((prev) => {
        const field = prev.fields.find((item) => item.id === id);
        const fieldWidthValue = Number(
          field?.width ?? ANNOTATION_DEFAULT_WIDTH,
        );
        const fieldWidth =
          Number.isFinite(fieldWidthValue) && fieldWidthValue > 0
            ? fieldWidthValue
            : ANNOTATION_DEFAULT_WIDTH;
        const maxX = Math.max(0, containerWidth - fieldWidth);
        const clampedX = Math.min(Math.max(0, xPx), maxX);
        const maxY = Math.max(0, containerHeight - 48);
        const clampedY = Math.min(Math.max(0, yPx), maxY);
        const xPercent = clampPercent((clampedX / containerWidth) * 100, 0);
        const yPercent = clampPercent((clampedY / containerHeight) * 100, 0);
        return {
          ...prev,
          fields: prev.fields.map((fieldItem) =>
            fieldItem.id === id
              ? { ...fieldItem, x: xPercent, y: yPercent }
              : fieldItem,
          ),
        };
      });
    },
    [annotationCanvasSize.height, annotationCanvasSize.width],
  );

  const beginDragField = (event, fieldId) => {
    event.preventDefault();
    const point = event.touches?.[0] ?? event;
    const targetRect = event.currentTarget.getBoundingClientRect();
    setDraggingField({
      id: fieldId,
      offsetX: point.clientX - targetRect.left,
      offsetY: point.clientY - targetRect.top,
    });
  };

  React.useEffect(() => {
    const handleMove = (event) => {
      if (!draggingField.id) return;
      const point = event.touches?.[0] ?? event;
      if (!annotationCanvasRef.current || !point) return;
      const rect = annotationCanvasRef.current.getBoundingClientRect();
      const nextX = point.clientX - rect.left - draggingField.offsetX;
      const nextY = point.clientY - rect.top - draggingField.offsetY;
      setAnnotationFieldPosition(draggingField.id, nextX, nextY, rect);
    };

    const handleUp = () => {
      setDraggingField({ id: null, offsetX: 0, offsetY: 0 });
    };

    if (draggingField.id) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleUp);
      window.addEventListener("touchcancel", handleUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [draggingField, setAnnotationFieldPosition]);

  const refreshDragDropCanvasSize = React.useCallback(() => {
    if (!dragDropCanvasRef.current) return;
    const rect = dragDropCanvasRef.current.getBoundingClientRect();
    setDragDropCanvasSize((prev) => {
      if (prev.width === rect.width && prev.height === rect.height) {
        return prev;
      }
      return { width: rect.width, height: rect.height };
    });
  }, []);

  React.useEffect(() => {
    const handleResize = () => refreshDragDropCanvasSize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [refreshDragDropCanvasSize]);

  React.useEffect(() => {
    if (!dragDrop.diagram?.image) return;
    const frame = requestAnimationFrame(() => refreshDragDropCanvasSize());
    return () => cancelAnimationFrame(frame);
  }, [dragDrop.diagram?.image, refreshDragDropCanvasSize]);

  const setDragDropBlankPosition = React.useCallback(
    (id, xPx, yPx, rectOverride = null) => {
      const rect = rectOverride ??
        dragDropCanvasRef.current?.getBoundingClientRect() ?? {
          width: dragDropCanvasSize.width,
          height: dragDropCanvasSize.height,
        };
      const containerWidth = rect?.width || dragDropCanvasSize.width || 0;
      const containerHeight = rect?.height || dragDropCanvasSize.height || 0;
      if (!containerWidth || !containerHeight) return;

      setDragDrop((prev) => {
        const blank = prev.diagram?.blanks?.find((item) => item.id === id);
        const blankWidthValue = Number(
          blank?.width ?? DRAG_DROP_BLANK_DEFAULT_WIDTH,
        );
        const blankHeightValue = Number(
          blank?.height ?? DRAG_DROP_BLANK_DEFAULT_HEIGHT,
        );
        const blankWidth =
          Number.isFinite(blankWidthValue) && blankWidthValue > 0
            ? blankWidthValue
            : DRAG_DROP_BLANK_DEFAULT_WIDTH;
        const blankHeight =
          Number.isFinite(blankHeightValue) && blankHeightValue > 0
            ? blankHeightValue
            : DRAG_DROP_BLANK_DEFAULT_HEIGHT;
        const maxX = Math.max(0, containerWidth - blankWidth);
        const maxY = Math.max(0, containerHeight - blankHeight);
        const clampedX = Math.min(Math.max(0, xPx), maxX);
        const clampedY = Math.min(Math.max(0, yPx), maxY);
        const xPercent = clampPercent((clampedX / containerWidth) * 100, 0);
        const yPercent = clampPercent((clampedY / containerHeight) * 100, 0);
        return {
          ...prev,
          diagram: {
            ...prev.diagram,
            blanks: (prev.diagram?.blanks ?? []).map((blankItem) =>
              blankItem.id === id
                ? { ...blankItem, x: xPercent, y: yPercent }
                : blankItem,
            ),
          },
        };
      });
    },
    [dragDropCanvasSize.height, dragDropCanvasSize.width],
  );

  const beginDragBlank = (event, blankId) => {
    event.preventDefault();
    const point = event.touches?.[0] ?? event;
    const targetRect = event.currentTarget.getBoundingClientRect();
    setDraggingBlank({
      id: blankId,
      offsetX: point.clientX - targetRect.left,
      offsetY: point.clientY - targetRect.top,
    });
  };

  React.useEffect(() => {
    const handleMove = (event) => {
      if (!draggingBlank.id) return;
      const point = event.touches?.[0] ?? event;
      if (!dragDropCanvasRef.current || !point) return;
      const rect = dragDropCanvasRef.current.getBoundingClientRect();
      const nextX = point.clientX - rect.left - draggingBlank.offsetX;
      const nextY = point.clientY - rect.top - draggingBlank.offsetY;
      setDragDropBlankPosition(draggingBlank.id, nextX, nextY, rect);
    };

    const handleUp = () => {
      setDraggingBlank({ id: null, offsetX: 0, offsetY: 0 });
    };

    if (draggingBlank.id) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleUp);
      window.addEventListener("touchcancel", handleUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [draggingBlank, setDragDropBlankPosition]);

  const handleSolutionStepChange = (stepId, value) => {
    setSolutionSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, explanation: value } : step,
      ),
    );
  };

  const handleSolutionStepImageUpload = async (stepId, event) => {
    const target = event.target;
    const files = target?.files;
    if (!files || !files.length) {
      return;
    }

    setSolutionImageLoadingState(stepId, true);
    try {
      const fileList = Array.from(files);
      for (const file of fileList) {
        // eslint-disable-next-line no-await-in-loop
        await queueCropTask(file, { target: "solution", stepId });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to process the selected image. Please try again.";
      toast.error(message);
    } finally {
      if (target) {
        target.value = "";
      }
    }
  };

  const removeSolutionStepImage = (stepId, imageId) => {
    setSolutionSteps((prev) =>
      prev.map((step) => {
        if (step.id !== stepId) {
          return step;
        }
        const targetImage = step.images.find((image) => image.id === imageId);
        if (targetImage) {
          revokePreviewUrl(targetImage.url);
        }
        return {
          ...step,
          images: step.images.filter((image) => image.id !== imageId),
        };
      }),
    );
  };

  const addSolutionStep = () => {
    setSolutionSteps((prev) => [...prev, createSolutionStep()]);
  };

  const removeSolutionStep = (stepId) => {
    setSolutionSteps((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      const target = prev.find((step) => step.id === stepId);
      if (target) {
        (target.images ?? []).forEach((image) => revokePreviewUrl(image.url));
      }
      return prev.filter((step) => step.id !== stepId);
    });
  };

  const clearOptionImage = (id) => {
    setOptionImageLoadingState(id, false);
    setOptions((prev) =>
      prev.map((option) =>
        option.id === id
          ? (() => {
              revokePreviewUrl(option.imageUrl);
              return {
                ...option,
                imageUrl: "",
                file: null,
                imageOrigin: IMAGE_ORIGIN.NONE,
              };
            })()
          : option,
      ),
    );
  };

  const buildPayload = () => {
    const questionText = formField.questionText;
    const plainQuestion = getPlainText(questionText);
    const normalizedStatus = String(formField.status || DEFAULT_FORM.status)
      .toLowerCase()
      .trim();
    const allowedStatuses = ["draft", "pending_review", "approved"];
    const status = allowedStatuses.includes(normalizedStatus)
      ? normalizedStatus
      : DEFAULT_FORM.status;

    if (!formField.classId) {
      throw new Error("Please select a class.");
    }

    if (!formField.subjectId) {
      throw new Error("Please select a subject.");
    }

    if (!formField.unitId) {
      throw new Error("Please select a unit.");
    }

    if (!formField.topicId) {
      throw new Error("Please select a topic.");
    }
    if (!formField.questionType) {
      throw new Error("Please select a question type.");
    }
    if (isEditMode && !formField.questionCategory) {
      throw new Error("Please select a question category.");
    }
    if (!plainQuestion) {
      throw new Error("Question prompt cannot be empty.");
    }
    // if (
    //   formField.questionType === QUESTION_TYPES.ALGEBRA &&
    //   !getPlainText(algebraStatement)
    // ) {
    //   throw new Error("Question statement cannot be empty.");
    // }
    if (!formField.difficultyLevel) {
      throw new Error("Please select a difficulty level.");
    }
    if (!formField.marks || Number(formField.marks) <= 0) {
      throw new Error("Marks must be a positive number.");
    }

    let preparedOptions = [];
    let correctAnswers = [];
    let componentPayload = [];
    let annotationPayload = null;
    let algebraPayload = null;
    let dragDropPayload = null;

    if (formField.questionType === QUESTION_TYPES.TEXT_INPUT) {
      const inputComponents = answerComponents.filter((component) =>
        [
          COMPONENT_TYPES.BLANK,
          COMPONENT_TYPES.POWER,
          COMPONENT_TYPES.FRACTION,
          COMPONENT_TYPES.MIXED_NUMBER,
        ].includes(component.type),
      );

      if (!inputComponents.length) {
        throw new Error("Please add at least one answer field.");
      }

      componentPayload = answerComponents.map((component) => {
        if (component.type === COMPONENT_TYPES.STATEMENT) {
          return {
            type: COMPONENT_TYPES.STATEMENT,
            text: (component.text ?? "").trim(),
          };
        }
        if (component.type === COMPONENT_TYPES.LINE_BREAK) {
          return { type: COMPONENT_TYPES.LINE_BREAK };
        }
        if (component.type === COMPONENT_TYPES.POWER) {
          return {
            type: COMPONENT_TYPES.POWER,
            base: (component.base ?? "").trim(),
            exponent: (component.exponent ?? "").trim(),
          };
        }
        if (component.type === COMPONENT_TYPES.FRACTION) {
          return {
            type: COMPONENT_TYPES.FRACTION,
            numerator: (component.numerator ?? "").trim(),
            denominator: (component.denominator ?? "").trim(),
          };
        }
        if (component.type === COMPONENT_TYPES.MIXED_NUMBER) {
          return {
            type: COMPONENT_TYPES.MIXED_NUMBER,
            whole: (component.whole ?? "").trim(),
            numerator: (component.numerator ?? "").trim(),
            denominator: (component.denominator ?? "").trim(),
          };
        }
        return {
          type: COMPONENT_TYPES.BLANK,
          answer: (component.answer ?? "").trim(),
        };
      });

      const componentAnswers = componentPayload
        .map((component) => {
          if (component.type === COMPONENT_TYPES.BLANK) {
            return component.answer;
          }
          if (component.type === COMPONENT_TYPES.POWER) {
            return [component.base, component.exponent];
          }
          if (component.type === COMPONENT_TYPES.FRACTION) {
            return [component.numerator, component.denominator];
          }
          if (component.type === COMPONENT_TYPES.MIXED_NUMBER) {
            return [
              component.whole,
              component.numerator,
              component.denominator,
            ];
          }
          return null;
        })
        .flat()
        .filter((value) => value !== null && value !== undefined);

      if (componentAnswers.some((answer) => !String(answer ?? "").trim())) {
        throw new Error("Answer fields cannot be empty.");
      }

      correctAnswers = componentAnswers.map((answer) =>
        String(answer ?? "").trim(),
      );
    } else if (formField.questionType === QUESTION_TYPES.IMAGE_ANNOTATION) {
      const normalizedFields = (imageAnnotation?.fields ?? []).map(
        (field, index) => {
          const widthValue =
            Number(field?.width ?? field?.inputWidth ?? field?.input_width) ||
            ANNOTATION_DEFAULT_WIDTH;
          return {
            id: field?.id ?? `annotation-${index}`,
            label: String(field?.label ?? "").trim(),
            labelPosition:
              field?.labelPosition === "right" ||
              field?.label_position === "right"
                ? "right"
                : "left",
            answer: String(field?.answer ?? field?.correct_answer ?? "").trim(),
            width: Math.max(
              ANNOTATION_MIN_WIDTH,
              Number(widthValue) || ANNOTATION_DEFAULT_WIDTH,
            ),
            x: clampPercent(field?.x ?? 0),
            y: clampPercent(field?.y ?? 0),
          };
        },
      );

      if (!imageAnnotation?.image) {
        throw new Error("Upload an annotation image to continue.");
      }

      if (!normalizedFields.length) {
        throw new Error("Add at least one input field on the image.");
      }

      if (normalizedFields.some((field) => !field.answer)) {
        throw new Error("Please provide a correct answer for every field.");
      }

      annotationPayload = {
        image: imageAnnotation.image,
        fields: normalizedFields,
      };
      correctAnswers = normalizedFields.map((field) => field.answer);
    } else if (formField.questionType === QUESTION_TYPES.DRAG_DROP) {
      const normalizedLabels = (dragDrop?.labels ?? []).map((label, index) => ({
        id: label?.id ?? `label-${index}`,
        text: String(label?.text ?? "").trim(),
        reusable: Boolean(label?.reusable),
      }));

      if (!normalizedLabels.length) {
        throw new Error("Please add at least one label.");
      }

      if (normalizedLabels.some((label) => !label.text)) {
        throw new Error("Label text cannot be empty.");
      }

      const lowercased = normalizedLabels.map((label) =>
        label.text.trim().toLowerCase(),
      );
      const uniqueCount = new Set(lowercased).size;
      if (uniqueCount !== lowercased.length) {
        throw new Error("Label text must be unique.");
      }

      const labelIdSet = new Set(normalizedLabels.map((label) => label.id));

      if (dragDrop?.mode === DRAG_DROP_MODES.DIAGRAM_LABELS) {
        if (!dragDrop?.diagram?.image) {
          throw new Error("Upload a diagram image to continue.");
        }

        const normalizedBlanks = (dragDrop?.diagram?.blanks ?? []).map(
          (blank, index) => ({
            id: blank?.id ?? `blank-${index}`,
            x: clampPercent(blank?.x ?? 0),
            y: clampPercent(blank?.y ?? 0),
            width: Math.max(
              40,
              Number(blank?.width ?? DRAG_DROP_BLANK_DEFAULT_WIDTH) ||
                DRAG_DROP_BLANK_DEFAULT_WIDTH,
            ),
            height: Math.max(
              24,
              Number(blank?.height ?? DRAG_DROP_BLANK_DEFAULT_HEIGHT) ||
                DRAG_DROP_BLANK_DEFAULT_HEIGHT,
            ),
            correctLabelId: String(blank?.correctLabelId ?? "").trim(),
          }),
        );

        if (!normalizedBlanks.length) {
          throw new Error("Add at least one blank position on the diagram.");
        }

        if (
          normalizedBlanks.some(
            (blank) =>
              !blank.correctLabelId || !labelIdSet.has(blank.correctLabelId),
          )
        ) {
          throw new Error("Select a correct label for every blank position.");
        }

        dragDropPayload = {
          mode: DRAG_DROP_MODES.DIAGRAM_LABELS,
          labels: normalizedLabels,
          diagram: {
            image: dragDrop.diagram.image,
            blanks: normalizedBlanks,
          },
        };
        correctAnswers = normalizedBlanks.map((blank) => blank.correctLabelId);
      } else {
        const normalizedItems = (dragDrop?.items ?? []).map((item, index) => {
          const imageValue = String(item?.imageUrl ?? "").trim();
          return {
            id: item?.id ?? `item-${index}`,
            imageUrl: imageValue,
            file: item?.file instanceof File ? item.file : null,
            imageOrigin:
              item?.imageOrigin ??
              (item?.file instanceof File
                ? IMAGE_ORIGIN.LOCAL
                : imageValue
                  ? IMAGE_ORIGIN.SERVER
                  : IMAGE_ORIGIN.NONE),
            correctLabelId: String(item?.correctLabelId ?? "").trim(),
          };
        });

        if (!normalizedItems.length) {
          throw new Error("Please add at least one item to label.");
        }

        if (normalizedItems.some((item) => !item.imageUrl && !item.file)) {
          throw new Error("Upload an image for every item.");
        }

        if (
          normalizedItems.some(
            (item) =>
              !item.correctLabelId || !labelIdSet.has(item.correctLabelId),
          )
        ) {
          throw new Error("Select a correct label for every item.");
        }

        dragDropPayload = {
          mode: DRAG_DROP_MODES.ITEM_GRID,
          labels: normalizedLabels,
          items: normalizedItems,
        };
        correctAnswers = normalizedItems.map((item) => item.correctLabelId);
      }
    } else if (formField.questionType === QUESTION_TYPES.ALGEBRA) {
      const normalizedFormats = algebraFormats.map((format) => {
        const definition = getAlgebraFormatDefinition(format.key);
        const targetLength = definition?.inputs?.length ?? 0;
        const values = Array.isArray(format.values)
          ? format.values.map((value) => String(value ?? ""))
          : [];
        const normalizedValues =
          targetLength > 0
            ? [...values, ...Array(targetLength).fill("")].slice(
                0,
                targetLength,
              )
            : values;
        return {
          key: format.key,
          label: format.label,
          enabled: Boolean(format.enabled),
          isCorrect: Boolean(format.isCorrect),
          values: normalizedValues,
          value: serializeAlgebraValues(format.key, normalizedValues),
        };
      });

      const enabledFormats = normalizedFormats.filter(
        (format) => format.enabled,
      );
      if (!enabledFormats.length) {
        throw new Error("Enable at least one answer format.");
      }

      const correctFormat =
        normalizedFormats.find((format) => format.isCorrect) ?? null;
      if (!correctFormat) {
        throw new Error("Mark one answer format as correct.");
      }

      if (!correctFormat.enabled) {
        throw new Error("Correct format must be enabled.");
      }

      if (!isAlgebraAnswerComplete(correctFormat.key, correctFormat.values)) {
        throw new Error(
          "Enter a complete correct answer for the marked format.",
        );
      }

      algebraPayload = normalizedFormats;
      correctAnswers = (correctFormat.values || []).map((value) =>
        String(value ?? "").trim(),
      );
    } else {
      const sanitizedOptions = options
        .map((option) => {
          const normalizedId = getOptionIdentifier(option);
          const trimmedText = (option.text ?? "").trim();
          const trimmedImage = (option.imageUrl ?? "").trim();
          const normalizedImageOrigin =
            option.imageOrigin ??
            (option.file instanceof File
              ? IMAGE_ORIGIN.LOCAL
              : trimmedImage
                ? IMAGE_ORIGIN.SERVER
                : IMAGE_ORIGIN.NONE);
          const hasValue =
            answerType === ANSWER_TYPES.TEXT
              ? Boolean(trimmedText)
              : Boolean(trimmedImage);

          return {
            ...option,
            id: normalizedId,
            text: trimmedText,
            imageUrl: trimmedImage,
            imageOrigin: normalizedImageOrigin,
            hasValue,
          };
        })
        .filter((option) => option.hasValue);

      if (sanitizedOptions.length < 2) {
        throw new Error("Please provide at least two valid options.");
      }

      const selected = sanitizedOptions.filter((option) => option.isCorrect);

      if (formField.questionType === QUESTION_TYPES.MCQ) {
        if (selected.length !== 1) {
          throw new Error("MCQs require exactly one correct answer.");
        }
      } else if (!selected.length) {
        throw new Error("Please mark at least one correct answer.");
      }

      preparedOptions = sanitizedOptions.map((option) => {
        const normalizedId = getOptionIdentifier(option);
        const resolvedOrigin =
          answerType === ANSWER_TYPES.IMAGE
            ? (option.imageOrigin ??
              (option.file instanceof File
                ? IMAGE_ORIGIN.LOCAL
                : option.imageUrl
                  ? IMAGE_ORIGIN.SERVER
                  : IMAGE_ORIGIN.NONE))
            : IMAGE_ORIGIN.NONE;
        const hasLocalFile =
          answerType === ANSWER_TYPES.IMAGE &&
          option.file instanceof File &&
          resolvedOrigin === IMAGE_ORIGIN.LOCAL;
        const imageReference =
          answerType === ANSWER_TYPES.IMAGE &&
          resolvedOrigin === IMAGE_ORIGIN.SERVER &&
          option.imageUrl
            ? option.imageUrl
            : "";

        return {
          id: normalizedId,
          text: answerType === ANSWER_TYPES.TEXT ? option.text : undefined,
          image: imageReference,
          file: hasLocalFile ? option.file : null,
          is_image: answerType === ANSWER_TYPES.IMAGE,
          imageOrigin: resolvedOrigin,
        };
      });

      correctAnswers = selected.map((option) => getOptionIdentifier(option));
    }

    // Only send freshly uploaded question images
    const questionMediaEntries = questionImages.filter(
      (image) => image.file instanceof File,
    );

    const normalizedSolutionSteps = (solutionSteps ?? [])
      .map((step) => ({
        ...step,
        explanation: step?.explanation ?? "",
        images: step?.images ?? [],
      }))
      .filter(
        (step) =>
          Boolean(getPlainText(step.explanation)) || step.images.length > 0,
      );
    const shouldIncludeSolution = normalizedSolutionSteps.length > 0;

    const formData = new FormData();
    const payloadQuestionType =
      formField.questionType === QUESTION_TYPES.TEXT_INPUT
        ? "fill_blank"
        : formField.questionType;

    formData.append("topic_id", formField.topicId);
    formData.append("question_type", payloadQuestionType);
    formData.append("question_text", questionText);
    formData.append("difficulty_level", formField.difficultyLevel);
    formData.append("marks", String(Number(formField.marks)));
    formData.append("status", status);
    if (formField.questionCategory) {
      formData.append("question_category", formField.questionCategory);
    }
    const resolvedAnswerType =
      formField.questionType === QUESTION_TYPES.TEXT_INPUT ||
      formField.questionType === QUESTION_TYPES.IMAGE_ANNOTATION ||
      formField.questionType === QUESTION_TYPES.ALGEBRA ||
      formField.questionType === QUESTION_TYPES.DRAG_DROP
        ? ANSWER_TYPES.TEXT
        : answerType;
    formData.append("answer_type", resolvedAnswerType);

    questionMediaEntries.forEach((entry) => {
      if (entry.file instanceof File) {
        formData.append("question_image[]", entry.file);
      }
    });
    if (isEditMode && questionImages.length === 0) {
      // Explicitly clear existing question images on edit when all removed
      formData.append("question_image", "");
    }

    if (formField.questionType === QUESTION_TYPES.TEXT_INPUT) {
      componentPayload.forEach((component, index) => {
        formData.append(`components[${index}][type]`, component.type);
        if (component.type === COMPONENT_TYPES.BLANK) {
          formData.append(`components[${index}][answer]`, component.answer);
        } else if (component.type === COMPONENT_TYPES.STATEMENT) {
          formData.append(`components[${index}][text]`, component.text);
        } else if (component.type === COMPONENT_TYPES.POWER) {
          formData.append(`components[${index}][base]`, component.base);
          formData.append(`components[${index}][exponent]`, component.exponent);
        } else if (component.type === COMPONENT_TYPES.FRACTION) {
          formData.append(
            `components[${index}][numerator]`,
            component.numerator,
          );
          formData.append(
            `components[${index}][denominator]`,
            component.denominator,
          );
        } else if (component.type === COMPONENT_TYPES.MIXED_NUMBER) {
          formData.append(`components[${index}][whole]`, component.whole);
          formData.append(
            `components[${index}][numerator]`,
            component.numerator,
          );
          formData.append(
            `components[${index}][denominator]`,
            component.denominator,
          );
        }
      });
    } else if (formField.questionType === QUESTION_TYPES.IMAGE_ANNOTATION) {
      if (annotationPayload?.image?.file instanceof File) {
        formData.append("annotation_image", annotationPayload.image.file);
      }

      (annotationPayload?.fields ?? []).forEach((field, index) => {
        formData.append(`annotation_fields[${index}][id]`, field.id);
        formData.append(`annotation_fields[${index}][label]`, field.label);
        formData.append(
          `annotation_fields[${index}][label_position]`,
          field.labelPosition,
        );
        formData.append(
          `annotation_fields[${index}][correct_answer]`,
          field.answer,
        );
        formData.append(`annotation_fields[${index}][width]`, field.width);
        formData.append(`annotation_fields[${index}][x]`, field.x);
        formData.append(`annotation_fields[${index}][y]`, field.y);
      });
    } else if (formField.questionType === QUESTION_TYPES.DRAG_DROP) {
      const payload = dragDropPayload ?? {};
      const labelsPayload = Array.isArray(payload.labels) ? payload.labels : [];
      formData.append(
        "drag_drop_mode",
        payload.mode ?? DRAG_DROP_MODES.ITEM_GRID,
      );
      formData.append("drag_drop_labels", JSON.stringify(labelsPayload));

      if (payload.mode === DRAG_DROP_MODES.DIAGRAM_LABELS) {
        const diagram = payload.diagram ?? {};
        const diagramImageValue =
          diagram?.image?.imageOrigin === IMAGE_ORIGIN.SERVER
            ? (diagram?.image?.url ?? "")
            : "";
        const diagramPayload = {
          image: diagramImageValue,
          blanks: (diagram?.blanks ?? []).map((blank) => ({
            id: blank.id,
            x: blank.x,
            y: blank.y,
            width: blank.width,
            height: blank.height,
            correct_label_id: blank.correctLabelId,
          })),
        };
        formData.append("drag_drop_diagram", JSON.stringify(diagramPayload));
        if (diagram?.image?.file instanceof File) {
          formData.append("drag_drop_diagram_image", diagram.image.file);
        }
        (diagram?.blanks ?? []).forEach((blank, index) => {
          formData.append(`drag_drop_blanks[${index}][id]`, blank.id);
          formData.append(`drag_drop_blanks[${index}][x]`, blank.x);
          formData.append(`drag_drop_blanks[${index}][y]`, blank.y);
          formData.append(`drag_drop_blanks[${index}][width]`, blank.width);
          formData.append(`drag_drop_blanks[${index}][height]`, blank.height);
          formData.append(
            `drag_drop_blanks[${index}][correct_label_id]`,
            blank.correctLabelId,
          );
        });
      } else {
        const items = Array.isArray(payload.items) ? payload.items : [];
        const serializedItems = items.map((item) => {
          const serialized = {
            id: item.id,
            correct_label_id: item.correctLabelId,
          };
          const hasServerImage =
            item.imageOrigin === IMAGE_ORIGIN.SERVER && item.imageUrl;
          if (hasServerImage && !isEditMode) {
            serialized.image = item.imageUrl;
          }
          return serialized;
        });
        formData.append("drag_drop_items", JSON.stringify(serializedItems));
        items.forEach((item, index) => {
          formData.append(`drag_drop_items[${index}][id]`, item.id);
          formData.append(
            `drag_drop_items[${index}][correct_label_id]`,
            item.correctLabelId,
          );
          if (item.file instanceof File) {
            formData.append(`drag_drop_items[${index}][image]`, item.file);
          }
        });
      }
    } else if (formField.questionType === QUESTION_TYPES.ALGEBRA) {
      const payload = Array.isArray(algebraPayload) ? algebraPayload : [];
      formData.append("algebra_formats", JSON.stringify(payload));
      formData.append("answer_formats", JSON.stringify(payload));
      formData.append("algebra_statement", algebraStatement);
      const correctFormatKey =
        payload.find((format) => format.isCorrect)?.key ?? "";
      if (correctFormatKey) {
        formData.append("correct_format", correctFormatKey);
      }
    } else {
      const serializedOptions = preparedOptions.map((option) => {
        const serialized = {
          id: option.id,
          text: option.text ?? "",
          is_image: option.is_image,
        };

        if (
          option.imageOrigin === IMAGE_ORIGIN.LOCAL &&
          option.file instanceof File
        ) {
          serialized.image = "";
        } else if (
          option.imageOrigin === IMAGE_ORIGIN.SERVER &&
          !isEditMode &&
          option.image
        ) {
          serialized.image = option.image;
        }

        return serialized;
      });
      formData.append("options", JSON.stringify(serializedOptions));

      preparedOptions.forEach((option, index) => {
        const optionId = option.id ?? getOptionIdentifier(option);
        const optionIdString = String(optionId);
        formData.append(`options[${index}][id]`, optionIdString);
        formData.append(`options[${index}][option_id]`, optionIdString);
        formData.append(`options[${index}][client_id]`, optionIdString);
        if (option.text !== undefined) {
          formData.append(`options[${index}][text]`, option.text);
        }
        formData.append(
          `options[${index}][is_image]`,
          option.is_image ? "1" : "0",
        );

        if (option.file instanceof File) {
          formData.append(`options[${index}][image]`, option.file);
        }
      });
    }

    correctAnswers.forEach((answer, index) => {
      formData.append(`correct_answers[${index}]`, answer);
    });

    if (shouldIncludeSolution) {
      normalizedSolutionSteps.forEach((step, index) => {
        formData.append(
          `solution_steps[${index}][explanation]`,
          step.explanation ?? "",
        );
        step.images.forEach((entry) => {
          if (entry.file instanceof File) {
            formData.append(`solution_steps[${index}][images][]`, entry.file);
          }
        });
      });
    }

    return formData;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    let payload;
    try {
      payload = buildPayload();
    } catch (validationError) {
      const message =
        validationError instanceof Error
          ? validationError.message
          : "Unable to prepare question payload.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateAssessmentQuestionById(questionId, payload);
        toast.success("Assessment question updated successfully.");
      } else {
        await addAssessmentQuestion(payload);
        toast.success("Assessment question added successfully.");
      }
      navigate(`${basePath}/assessment-question-lists`);
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${
          isEditMode ? "update" : "add"
        } assessment question. Please try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isImageType =
    (formField.questionType === QUESTION_TYPES.MCQ ||
      formField.questionType === QUESTION_TYPES.CHECKBOX) &&
    answerType === ANSWER_TYPES.IMAGE;

  const dragDropLabelOptions = React.useMemo(
    () =>
      (dragDrop.labels ?? [])
        .map((label) => ({
          id: label.id,
          text: String(label.text ?? "").trim(),
        }))
        .filter((label) => label.text),
    [dragDrop.labels],
  );
  const dragDropLabelLookup = React.useMemo(
    () => new Map(dragDropLabelOptions.map((label) => [label.id, label.text])),
    [dragDropLabelOptions],
  );

  return (
    <>
      <span ref={dragDropLabelMeasureRef} className="drag-drop-label-measure" />
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{headerTitle}</h4>
          <h1>
            {isEditMode
              ? "Update Assessment Question"
              : "Add New Assessment Question"}
          </h1>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          {error && (
            <Alert
              variant="destructive"
              className="alert-custom mb-4 bg-[#FDF7EC]"
            >
              <AlertCircleIcon size={18} />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          {fetching ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          ) : (
            <>
              <div className="form-admin">
                <div className="form-group w-half">
                  <label>
                    <Book size={16} />
                    Class <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={classOptions}
                    multiple={false}
                    value={formField.classId}
                    onChange={handleClassSelect}
                    placeholder={
                      isEditMode
                        ? "Class locked for existing question"
                        : classOptions.length
                          ? "Search classes..."
                          : "No classes available"
                    }
                    loading={topicsLoading}
                    disabled={loading || topicsLoading || isEditMode}
                    emptyState={
                      topicsLoading
                        ? "Loading classes..."
                        : "No classes available"
                    }
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <BookA size={16} />
                    Subject <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={subjectOptions}
                    multiple={false}
                    value={formField.subjectId}
                    onChange={handleSubjectSelect}
                    placeholder={
                      isEditMode
                        ? "Subject locked for existing question"
                        : !formField.classId
                          ? "Select a class first"
                          : subjectOptions.length
                            ? "Search subjects..."
                            : "No subjects available"
                    }
                    loading={topicsLoading}
                    disabled={
                      loading ||
                      topicsLoading ||
                      !formField.classId ||
                      isEditMode
                    }
                    emptyState={
                      topicsLoading
                        ? "Loading subjects..."
                        : "No subjects available"
                    }
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <SquareStack size={16} />
                    Unit <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={unitOptions}
                    multiple={false}
                    value={formField.unitId}
                    onChange={handleUnitSelect}
                    placeholder={
                      isEditMode
                        ? "Unit locked for existing question"
                        : !formField.subjectId
                          ? "Select a subject first"
                          : unitOptions.length
                            ? "Search units..."
                            : "No units available"
                    }
                    loading={topicsLoading}
                    disabled={
                      loading ||
                      topicsLoading ||
                      !formField.subjectId ||
                      isEditMode
                    }
                    emptyState={
                      topicsLoading ? "Loading units..." : "No units available"
                    }
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <ALargeSmall size={16} />
                    Topics <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={topicOptions}
                    multiple={false}
                    value={formField.topicId}
                    onChange={handleTopicSelect}
                    placeholder={
                      !formField.unitId
                        ? "Select a unit first"
                        : topicOptions.length
                          ? "Search topics..."
                          : "No topics available"
                    }
                    loading={topicsLoading}
                    disabled={loading || topicsLoading || !formField.unitId}
                    emptyState={
                      topicsLoading
                        ? "Loading topics..."
                        : "No topics available"
                    }
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Section size={16} />
                    Question Type <span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="questionType"
                    value={formField.questionType}
                    onChange={handleQuestionTypeChange}
                    disabled={loading}
                  >
                    <option value={QUESTION_TYPES.MCQ}>
                      Multiple Choice (Single Answer)
                    </option>
                    <option value={QUESTION_TYPES.CHECKBOX}>
                      Multiple Choice (Multiple Answers)
                    </option>
                    <option value={QUESTION_TYPES.TEXT_INPUT}>
                      Text Input
                    </option>
                    <option value={QUESTION_TYPES.IMAGE_ANNOTATION}>
                      Image Annotation
                    </option>
                    <option value={QUESTION_TYPES.DRAG_DROP}>
                      Drag &amp; Drop
                    </option>
                    <option value={QUESTION_TYPES.ALGEBRA}>
                      Answer Format Selection
                    </option>
                  </select>
                </div>
                {isEditMode && (
                  <div className="form-group w-half">
                    <label>
                      <Book size={16} />
                      Question Category <span>*</span>
                    </label>
                    <select
                      className="form-input"
                      name="questionCategory"
                      value={formField.questionCategory}
                      onChange={handleFieldChange}
                      disabled={loading}
                    >
                      <option value="">Select category</option>
                      <option value="practice">Practice</option>
                      <option value="challenge">Challenge</option>
                      <option value="assessment">Assessment</option>
                    </select>
                  </div>
                )}

                <div className="form-group w-half">
                  <label>
                    <ArrowBigUp size={16} />
                    Difficulty <span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="difficultyLevel"
                    value={formField.difficultyLevel}
                    onChange={handleFieldChange}
                    disabled={loading}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="form-group w-half">
                  <label>
                    <ArrowUp10 size={16} />
                    Marks <span>*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    name="marks"
                    value={formField.marks}
                    onChange={handleFieldChange}
                    disabled={loading}
                  />
                </div>

                <section className="question-section w-full">
                  <header className="question-section-header">
                    <h3>Question Prompt*</h3>
                    <p>
                      Use the editor below to add formatted text, code, or math
                      expressions.
                    </p>
                  </header>
                  <MathEditor
                    value={formField.questionText}
                    onChange={handleQuestionTextChange}
                    disabled={loading}
                  />

                  <div className="media-upload-grid">
                    <label className="media-upload-tile">
                      {questionImageLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Upload size={18} />
                          <span>Upload Images</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleQuestionImageUpload}
                        disabled={loading || questionImageLoading}
                      />
                    </label>
                    {questionImages.map((image) => (
                      <div key={image.id} className="media-upload-preview">
                        <img
                          src={resolveMediaUrl(image.url)}
                          alt="Question visual"
                          className="preview-img"
                        />
                        <button
                          type="button"
                          className="media-remove-btn"
                          onClick={() => removeQuestionImage(image.id)}
                          disabled={loading || questionImageLoading}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {formField.questionType === QUESTION_TYPES.TEXT_INPUT ? (
                  <section className="question-section w-full">
                    <header className="question-section-header">
                      <h3 className="!mb-0">Answer Components*</h3>
                      <p className="mb-2">
                        Combine text, inputs, and line breaks to craft
                        fill-in-the-blank style questions.
                      </p>
                    </header>
                    <div className="answer-components-wrapper">
                      <div className="answer-elements-actions">
                        <div className="answer-elements-buttons">
                          <button
                            type="button"
                            className="answer-element-btn text"
                            onClick={addStatementComponent}
                            disabled={loading}
                          >
                            <span className="answer-element-icon">T</span>
                            Add Text
                          </button>
                          <button
                            type="button"
                            className="answer-element-btn input"
                            onClick={addInputComponent}
                            disabled={loading}
                          >
                            <SquareStack size={16} />
                            Add Input Field
                          </button>
                          <button
                            type="button"
                            className="answer-element-btn break"
                            onClick={addLineBreakComponent}
                            disabled={loading}
                          >
                            <Section size={16} />
                            Add Line Break
                          </button>
                        </div>
                        {/* <button
                          type="button"
                          className="answer-preview-toggle"
                          onClick={() =>
                            setShowComponentsPreview((prev) => !prev)
                          }
                          disabled={loading}
                        >
                          {showComponentsPreview
                            ? "Hide Preview"
                            : "Show Preview"}
                        </button> */}
                      </div>
                      {/* {showComponentsPreview ? (
                        <div className="answer-components-preview">
                          <span>Preview:</span>
                          <div className="answer-preview-line">
                            {answerComponents.length ? (
                              answerComponents.map((component) =>
                                component.type ===
                                COMPONENT_TYPES.LINE_BREAK ? (
                                  <span
                                    key={component.id}
                                    className="answer-preview-break"
                                  />
                                ) : component.type === COMPONENT_TYPES.BLANK ? (
                                  <span
                                    key={component.id}
                                    className="answer-preview-blank"
                                  >
                                    {component.answer.trim().length
                                      ? "_".repeat(
                                          Math.min(
                                            Math.max(
                                              component.answer.trim().length +
                                                1,
                                              4
                                            ),
                                            10
                                          )
                                        )
                                      : "_____"}
                                  </span>
                                ) : component.type === COMPONENT_TYPES.POWER ? (
                                  <span
                                    key={component.id}
                                    className="answer-preview-power"
                                  >
                                    {component.base.trim() || "x"}^
                                    {component.exponent.trim() || "y"}
                                  </span>
                                ) : component.type ===
                                  COMPONENT_TYPES.FRACTION ? (
                                  <span
                                    key={component.id}
                                    className="answer-preview-fraction"
                                  >
                                    {component.numerator.trim() || "a"}/
                                    {component.denominator.trim() || "b"}
                                  </span>
                                ) : (
                                  <span
                                    key={component.id}
                                    className="answer-preview-text"
                                  >
                                    {component.text.trim() || "(statement)"}
                                  </span>
                                )
                              )
                            ) : (
                              <span className="answer-preview-empty">
                                Start by adding text or an input field.
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null} */}

                      <div className="answer-component-list space-y-3">
                        <div className="answer-component-list-header">
                          Question Elements (Drag to reorder)
                        </div>
                        {answerComponents.map((component) => {
                          const isBlank =
                            component.type === COMPONENT_TYPES.BLANK;
                          const isPower =
                            component.type === COMPONENT_TYPES.POWER;
                          const isFraction =
                            component.type === COMPONENT_TYPES.FRACTION;
                          const isMixedNumber =
                            component.type === COMPONENT_TYPES.MIXED_NUMBER;
                          const isLineBreak =
                            component.type === COMPONENT_TYPES.LINE_BREAK;
                          const isStatement =
                            component.type === COMPONENT_TYPES.STATEMENT;
                          const disableRemoval = loading;

                          return (
                            <div
                              key={component.id}
                              className={`answer-component-card${
                                draggingComponentId === component.id
                                  ? " is-dragging"
                                  : ""
                              }`}
                              draggable
                              onDragStart={() =>
                                handleComponentDragStart(component.id)
                              }
                              onDragEnd={handleComponentDragEnd}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => handleComponentDrop(component.id)}
                            >
                              <div className="answer-component-card-header">
                                <div className="answer-component-title">
                                  <span
                                    className="component-handle"
                                    aria-hidden="true"
                                  >
                                    <GripVertical size={16} />
                                  </span>
                                  <span className="answer-component-label">
                                    {isStatement
                                      ? "Text"
                                      : isLineBreak
                                        ? "Line Break"
                                        : "Input Field"}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="component-remove-btn"
                                  onClick={() => removeComponent(component.id)}
                                  disabled={disableRemoval}
                                  aria-label="Remove component"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <div className="answer-component-card-body">
                                {isStatement ? (
                                  <div className="component-field">
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={component.text}
                                      onChange={(event) =>
                                        handleComponentValueChange(
                                          component.id,
                                          "text",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Enter text"
                                      disabled={loading}
                                    />
                                  </div>
                                ) : isLineBreak ? (
                                  <p className="text-sm text-slate-500 italic">
                                    Creates a new line in the question.
                                  </p>
                                ) : (
                                  <>
                                    <div className="component-field">
                                      <label>Input Type</label>
                                      <select
                                        className="form-input !mt-0"
                                        value={component.type}
                                        onChange={(event) =>
                                          updateComponentType(
                                            component.id,
                                            event.target.value,
                                          )
                                        }
                                        disabled={loading}
                                      >
                                        <option value={COMPONENT_TYPES.BLANK}>
                                          Plain
                                        </option>
                                        <option value={COMPONENT_TYPES.POWER}>
                                          Base with Exponent (e.g., 2³)
                                        </option>
                                        <option
                                          value={COMPONENT_TYPES.FRACTION}
                                        >
                                          Fraction (numerator/denominator)
                                        </option>
                                        <option
                                          value={COMPONENT_TYPES.MIXED_NUMBER}
                                        >
                                          Mixed number (whole + fraction)
                                        </option>
                                      </select>
                                    </div>
                                    {isBlank ? (
                                      <div className="component-field">
                                        <label>Correct Answer</label>
                                        <input
                                          type="text"
                                          className="form-input !mt-0"
                                          value={component.answer}
                                          onChange={(event) =>
                                            handleComponentValueChange(
                                              component.id,
                                              "answer",
                                              event.target.value,
                                            )
                                          }
                                          placeholder="Answer"
                                          disabled={loading}
                                        />
                                      </div>
                                    ) : null}
                                    {isPower ? (
                                      <div className="component-field-grid">
                                        <div className="component-field">
                                          <label>Correct Base</label>
                                          <input
                                            type="text"
                                            className="form-input !mt-0"
                                            value={component.base}
                                            onChange={(event) =>
                                              handleComponentValueChange(
                                                component.id,
                                                "base",
                                                event.target.value,
                                              )
                                            }
                                            placeholder="e.g., 2, x, 10"
                                            disabled={loading}
                                          />
                                        </div>
                                        <div className="component-field">
                                          <label>Correct Exponent</label>
                                          <input
                                            type="text"
                                            className="form-input !mt-0"
                                            value={component.exponent}
                                            onChange={(event) =>
                                              handleComponentValueChange(
                                                component.id,
                                                "exponent",
                                                event.target.value,
                                              )
                                            }
                                            placeholder="e.g., 3, 2, n"
                                            disabled={loading}
                                          />
                                        </div>
                                      </div>
                                    ) : null}
                                    {isFraction ? (
                                      <div className="component-field-grid">
                                        <div className="component-field">
                                          <label>Correct Numerator</label>
                                          <input
                                            type="text"
                                            className="form-input !mt-0"
                                            value={component.numerator}
                                            onChange={(event) =>
                                              handleComponentValueChange(
                                                component.id,
                                                "numerator",
                                                event.target.value,
                                              )
                                            }
                                            placeholder="Top Number"
                                            disabled={loading}
                                          />
                                        </div>
                                        <div className="component-field">
                                          <label>Correct Denominator</label>
                                          <input
                                            type="text"
                                            className="form-input !mt-0"
                                            value={component.denominator}
                                            onChange={(event) =>
                                              handleComponentValueChange(
                                                component.id,
                                                "denominator",
                                                event.target.value,
                                              )
                                            }
                                            placeholder="Bottom Number"
                                            disabled={loading}
                                          />
                                        </div>
                                      </div>
                                    ) : null}
                                    {isMixedNumber ? (
                                      <div className="component-field-grid component-field-3fr">
                                        <div className="component-field">
                                          <label>Correct Whole</label>
                                          <input
                                            type="text"
                                            className="form-input !mt-0"
                                            value={component.whole}
                                            onChange={(event) =>
                                              handleComponentValueChange(
                                                component.id,
                                                "whole",
                                                event.target.value,
                                              )
                                            }
                                            placeholder="Whole number"
                                            disabled={loading}
                                          />
                                        </div>
                                        <div className="component-field">
                                          <label>Correct Numerator</label>
                                          <input
                                            type="text"
                                            className="form-input !mt-0"
                                            value={component.numerator}
                                            onChange={(event) =>
                                              handleComponentValueChange(
                                                component.id,
                                                "numerator",
                                                event.target.value,
                                              )
                                            }
                                            placeholder="Top Number"
                                            disabled={loading}
                                          />
                                        </div>
                                        <div className="component-field">
                                          <label>Correct Denominator</label>
                                          <input
                                            type="text"
                                            className="form-input !mt-0"
                                            value={component.denominator}
                                            onChange={(event) =>
                                              handleComponentValueChange(
                                                component.id,
                                                "denominator",
                                                event.target.value,
                                              )
                                            }
                                            placeholder="Bottom Number"
                                            disabled={loading}
                                          />
                                        </div>
                                      </div>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                ) : formField.questionType === QUESTION_TYPES.ALGEBRA ? (
                  <section className="question-section w-full">
                    <header className="question-section-header">
                      <h3 className="!mb-0">Configure Answer Formats*</h3>
                      <p className="mb-2">
                        Choose which formats students can answer with and mark
                        the single correct format.
                      </p>
                    </header>
                    <div className="space-y-4">
                      {/* <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <label className="text-sm font-semibold text-slate-800">
                          Question Statement
                        </label>
                        <textarea
                          className="form-input mt-2 min-h-[90px]"
                          value={algebraStatement}
                          onChange={(event) =>
                            setAlgebraStatement(event.target.value)
                          }
                          placeholder="Enter statement"
                          disabled={loading}
                        />
                      </div> */}
                      {algebraFormats.map((format) => {
                        const isCorrect = Boolean(format.isCorrect);
                        const isEnabled = Boolean(format.enabled);
                        const cardClasses = isCorrect
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white";

                        return (
                          <div
                            key={format.key}
                            className={`rounded-lg border p-4 ${cardClasses}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() =>
                                    toggleAlgebraFormatEnabled(format.key)
                                  }
                                  disabled={loading}
                                />
                                {format.label}
                              </label>
                              <button
                                type="button"
                                className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                                onClick={() =>
                                  markAlgebraFormatCorrect(format.key)
                                }
                                disabled={loading || !isEnabled}
                              >
                                {isCorrect
                                  ? "Correct Answer"
                                  : "Mark as Correct"}
                              </button>
                            </div>
                            {isEnabled && isCorrect ? (
                              <>
                                <div className="mt-3 text-xs text-slate-500">
                                  Answer value{" "}
                                  {isCorrect ? "(required)" : "(optional)"}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-3">
                                  {renderAlgebraInputs(format, loading)}
                                </div>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      <div className=" text-slate-700">
                        <span className="font-semibold">Enabled formats:</span>{" "}
                        {algebraFormats
                          .filter((format) => format.enabled)
                          .map((format) => format.label)
                          .join(", ") || "None"}
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold">Correct format:</span>{" "}
                        {algebraFormats.find((format) => format.isCorrect)
                          ?.label ?? "None"}
                      </div>
                    </div>
                  </section>
                ) : formField.questionType === QUESTION_TYPES.DRAG_DROP ? (
                  <section className="question-section w-full">
                    <header className="question-section-header">
                      <h3>Drag &amp; Drop</h3>
                      <p>
                        Configure labels and drop zones for item grid or diagram
                        labeling.
                      </p>
                    </header>
                    <div className="space-y-4">
                      <div className="drag-drop-mode-group">
                        <label className="text-sm font-semibold text-slate-800">
                          Mode
                        </label>
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              checked={
                                dragDrop.mode === DRAG_DROP_MODES.ITEM_GRID
                              }
                              onChange={() =>
                                handleDragDropModeChange(
                                  DRAG_DROP_MODES.ITEM_GRID,
                                )
                              }
                              disabled={loading}
                            />
                            Item Grid
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              checked={
                                dragDrop.mode === DRAG_DROP_MODES.DIAGRAM_LABELS
                              }
                              onChange={() =>
                                handleDragDropModeChange(
                                  DRAG_DROP_MODES.DIAGRAM_LABELS,
                                )
                              }
                              disabled={loading}
                            />
                            Diagram Labels
                          </label>
                        </div>
                      </div>

                      <div className="drag-drop-card">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">
                              Label Section
                            </h4>
                            <p className="text-xs text-slate-500">
                              Labels must be unique. Mark reusable to keep them
                              in the tray after drop.
                            </p>
                          </div>
                        </div>
                        <div className="drag-drop-list mt-3 space-y-3">
                          {dragDrop.labels.map((label, index) => (
                            <div key={label.id} className="drag-drop-label-row">
                              <input
                                type="text"
                                className="form-input"
                                value={label.text}
                                onChange={(event) =>
                                  handleDragDropLabelChange(
                                    label.id,
                                    event.target.value,
                                  )
                                }
                                placeholder={`Label ${index + 1}`}
                                disabled={loading}
                              />
                              <label className="correct-toggle">
                                <input
                                  type="checkbox"
                                  checked={label.reusable}
                                  onChange={() =>
                                    toggleDragDropLabelReusable(label.id)
                                  }
                                  disabled={loading}
                                />
                                <span>Reusable</span>
                              </label>
                              <button
                                type="button"
                                className="component-remove-btn"
                                onClick={() => removeDragDropLabel(label.id)}
                                disabled={loading}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="global-btn secondary mt-3"
                          onClick={addDragDropLabel}
                          disabled={loading}
                        >
                          <Plus size={16} />
                          Add Label
                        </button>
                      </div>

                      {dragDrop.mode === DRAG_DROP_MODES.ITEM_GRID ? (
                        <div className="drag-drop-card">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">
                                Items To Label
                              </h4>
                              <p className="text-xs text-slate-500">
                                Upload an image for each item and select the
                                correct label.
                              </p>
                            </div>
                          </div>
                          <div className="drag-drop-item-grid mt-3">
                            {dragDrop.items.map((item, index) => {
                              const isUploading = Boolean(
                                dragDropItemLoadingMap[item.id],
                              );
                              return (
                                <div key={item.id} className="option-item">
                                  <div className="option-item-header">
                                    <span>Item {index + 1}</span>
                                    {dragDrop.items.length > 1 && (
                                      <button
                                        type="button"
                                        className="delete-btn-append px-2 py-1 text-xs"
                                        onClick={() =>
                                          removeDragDropItem(item.id)
                                        }
                                        disabled={loading}
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-3">
                                    <label className="media-upload-tile">
                                      {isUploading ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span>Processing image...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload size={16} />
                                          <span>
                                            {item.imageUrl
                                              ? "Replace image"
                                              : "Upload image"}
                                          </span>
                                        </>
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => {
                                          const file = event.target.files?.[0];
                                          handleDragDropItemFileChange(
                                            item.id,
                                            file,
                                          );
                                          event.target.value = "";
                                        }}
                                        disabled={loading || isUploading}
                                      />
                                    </label>
                                    {item.imageUrl && (
                                      <div className="media-upload-preview">
                                        <img
                                          src={resolveMediaUrl(item.imageUrl)}
                                          alt={`Item ${index + 1}`}
                                          className="preview-img"
                                        />
                                        <button
                                          type="button"
                                          className="media-remove-btn"
                                          onClick={() =>
                                            clearDragDropItemImage(item.id)
                                          }
                                          disabled={loading || isUploading}
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    )}
                                    <div className="component-field">
                                      <label>Correct Label</label>
                                      <select
                                        className="form-input !mt-0"
                                        value={item.correctLabelId || ""}
                                        onChange={(event) =>
                                          handleDragDropItemCorrectLabelChange(
                                            item.id,
                                            event.target.value,
                                          )
                                        }
                                        disabled={loading}
                                      >
                                        <option value="">
                                          Select correct label
                                        </option>
                                        {dragDropLabelOptions.map((label) => (
                                          <option
                                            key={label.id}
                                            value={label.id}
                                          >
                                            {label.text}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            className="global-btn secondary mt-4"
                            onClick={addDragDropItem}
                            disabled={loading}
                          >
                            <Plus size={16} />
                            Add Item
                          </button>
                        </div>
                      ) : (
                        <div className="drag-drop-card">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">
                                Diagram &amp; Blank Positions
                              </h4>
                              <p className="text-xs text-slate-500">
                                Upload a diagram and drag blanks to the desired
                                positions.
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-3">
                            <label className="media-upload-tile">
                              {dragDropDiagramLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <>
                                  <Upload size={18} />
                                  <span>
                                    {dragDrop.diagram?.image
                                      ? "Replace Diagram Image"
                                      : "Upload Diagram Image"}
                                  </span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleDragDropDiagramImageUpload}
                                disabled={loading || dragDropDiagramLoading}
                              />
                            </label>
                            {dragDrop.diagram?.image ? (
                              <div className="media-upload-preview">
                                <img
                                  src={resolveMediaUrl(
                                    dragDrop.diagram.image.url,
                                  )}
                                  alt="Diagram visual"
                                  className="preview-img"
                                />
                                <button
                                  type="button"
                                  className="media-remove-btn"
                                  onClick={removeDragDropDiagramImage}
                                  disabled={loading || dragDropDiagramLoading}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="drag-drop-diagram-stage mt-4">
                            {dragDrop.diagram?.image ? (
                              <div
                                className="drag-drop-diagram-canvas"
                                ref={dragDropCanvasRef}
                                style={{
                                  "--drag-drop-label-width": dragDropLabelWidth
                                    ? `${dragDropLabelWidth}px`
                                    : undefined,
                                }}
                              >
                                <img
                                  src={resolveMediaUrl(
                                    dragDrop.diagram.image.url,
                                  )}
                                  alt="Diagram base"
                                  className="block max-h-[420px] w-auto max-w-full select-none pointer-events-none"
                                  onLoad={refreshDragDropCanvasSize}
                                />
                                {(dragDrop.diagram?.blanks ?? []).map(
                                  (blank, index) => {
                                    const isSelected =
                                      dragDrop.selectedBlankId === blank.id;
                                    const labelText =
                                      dragDropLabelLookup.get(
                                        blank.correctLabelId,
                                      ) ?? "";
                                    return (
                                      <div
                                        key={blank.id}
                                        className={`drag-drop-blank${
                                          isSelected ? " is-selected" : ""
                                        }`}
                                        style={{
                                          left: `${blank.x}%`,
                                          top: `${blank.y}%`,
                                          width: dragDropLabelWidth
                                            ? `${dragDropLabelWidth}px`
                                            : `${blank.width}px`,
                                          height: `${blank.height}px`,
                                        }}
                                        onMouseDown={(event) => {
                                          selectDragDropBlank(blank.id);
                                          beginDragBlank(event, blank.id);
                                        }}
                                        onTouchStart={(event) => {
                                          selectDragDropBlank(blank.id);
                                          beginDragBlank(event, blank.id);
                                        }}
                                        onClick={() =>
                                          selectDragDropBlank(blank.id)
                                        }
                                      >
                                        {labelText ? (
                                          <span>{labelText}</span>
                                        ) : null}
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            ) : (
                              <div className="drag-drop-placeholder">
                                Upload a diagram to place blanks.
                              </div>
                            )}
                          </div>

                          <div className="drag-drop-blank-list mt-4 space-y-3">
                            {(dragDrop.diagram?.blanks ?? []).length ? (
                              dragDrop.diagram.blanks.map((blank, index) => (
                                <div
                                  key={blank.id}
                                  className="drag-drop-blank-row"
                                >
                                  <div className="text-sm font-medium text-slate-700">
                                    Blank {index + 1}
                                  </div>
                                  <select
                                    className="form-input !mt-0"
                                    value={blank.correctLabelId || ""}
                                    onChange={(event) =>
                                      handleDragDropBlankCorrectLabelChange(
                                        blank.id,
                                        event.target.value,
                                      )
                                    }
                                    disabled={loading}
                                  >
                                    <option value="">
                                      Select correct label
                                    </option>
                                    {dragDropLabelOptions.map((label) => (
                                      <option key={label.id} value={label.id}>
                                        {label.text}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="delete-btn-append px-2 py-1 text-xs !mt-0"
                                    onClick={() =>
                                      removeDragDropBlank(blank.id)
                                    }
                                    disabled={loading}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500">
                                No blanks added yet.
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="global-btn secondary mt-4"
                            onClick={addDragDropBlank}
                            disabled={loading}
                          >
                            <Plus size={16} />
                            Add Blank
                          </button>
                        </div>
                      )}
                    </div>
                  </section>
                ) : formField.questionType ===
                  QUESTION_TYPES.IMAGE_ANNOTATION ? (
                  <section className="question-section w-full">
                    <header className="question-section-header">
                      <h3>Image Annotation</h3>
                      <p>
                        Upload an image, add input fields on top, then configure
                        their labels, positions, and correct answers.
                      </p>
                    </header>
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="media-upload-tile">
                          <Upload size={18} />
                          <span>
                            {imageAnnotation.image
                              ? "Replace Annotation Image"
                              : "Upload Annotation Image"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAnnotationImageUpload}
                            disabled={loading}
                          />
                        </label>
                        {imageAnnotation.image ? (
                          <div className="media-upload-preview">
                            <img
                              src={resolveMediaUrl(imageAnnotation.image.url)}
                              alt="Annotation visual"
                              className="preview-img"
                            />
                            <button
                              type="button"
                              className="media-remove-btn"
                              onClick={removeAnnotationImage}
                              disabled={loading}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="relative w-full md:w-[75%] ml-auto mr-auto overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                        {imageAnnotation.image ? (
                          <div className="flex justify-center">
                            <div
                              className="relative inline-block max-w-full"
                              ref={annotationCanvasRef}
                            >
                              <img
                                src={resolveMediaUrl(imageAnnotation.image.url)}
                                alt="Annotation base"
                                className="block max-h-[420px] w-auto max-w-full select-none pointer-events-none"
                                onLoad={refreshAnnotationCanvasSize}
                              />
                              {imageAnnotation.fields.map((field, index) => {
                                const isSelected =
                                  imageAnnotation.selectedFieldId === field.id;
                                const fieldWidthValue = Number(
                                  field.width ?? ANNOTATION_DEFAULT_WIDTH,
                                );
                                const fieldWidth =
                                  Number.isFinite(fieldWidthValue) &&
                                  fieldWidthValue > 0
                                    ? fieldWidthValue
                                    : ANNOTATION_DEFAULT_WIDTH;
                                return (
                                  <div
                                    key={field.id}
                                    className={`absolute flex items-center gap-2 cursor-move`}
                                    style={{
                                      left: `${field.x}%`,
                                      top: `${field.y}%`,
                                    }}
                                    onMouseDown={(event) => {
                                      selectAnnotationField(field.id);
                                      beginDragField(event, field.id);
                                    }}
                                    onTouchStart={(event) => {
                                      selectAnnotationField(field.id);
                                      beginDragField(event, field.id);
                                    }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      selectAnnotationField(field.id);
                                    }}
                                  >
                                    {field.label &&
                                    field.labelPosition !== "right" ? (
                                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                                        {field.label}
                                      </span>
                                    ) : null}
                                    <input
                                      readOnly
                                      tabIndex={-1}
                                      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm shadow-inner"
                                      style={{ width: `${fieldWidth}px` }}
                                      value=""
                                      placeholder={`Field ${index + 1}`}
                                    />
                                    {field.label &&
                                    field.labelPosition === "right" ? (
                                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                                        {field.label}
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-red-600 hover:text-red-600 cursor-pointer"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        removeAnnotationField(field.id);
                                      }}
                                      disabled={loading}
                                      title="Delete field"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-64 w-full items-center justify-center text-sm text-slate-500">
                            Upload an image to start placing input fields.
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          className="global-btn secondary"
                          onClick={addAnnotationField}
                          disabled={loading || !imageAnnotation.image}
                        >
                          <Plus size={16} />
                          Add input field
                        </button>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-800">
                              Input Field Configuration
                            </h4>
                            <p className="text-sm text-slate-500">
                              Click a field on the image to edit its details.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-3">
                          {imageAnnotation.fields.length ? (
                            imageAnnotation.fields.map((field, index) => {
                              const isSelected =
                                imageAnnotation.selectedFieldId === field.id;
                              return (
                                <div
                                  key={field.id}
                                  className={`rounded-md border p-3 ${
                                    isSelected
                                      ? "border-slate-600 bg-indigo-50/40"
                                      : "border-slate-200 bg-slate-50"
                                  }`}
                                  onClick={() =>
                                    selectAnnotationField(field.id)
                                  }
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-slate-800">
                                      Field {index + 1}
                                    </span>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                    <div className="form-group">
                                      <label>Label (optional)</label>
                                      <input
                                        type="text"
                                        className="form-input !p-2 !bg-white"
                                        value={field.label}
                                        onChange={(event) =>
                                          updateAnnotationField(field.id, {
                                            label: event.target.value,
                                          })
                                        }
                                        placeholder="e.g. Name"
                                        disabled={loading}
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Label Position</label>
                                      <select
                                        className="form-input !p-2 !bg-white"
                                        value={
                                          field.labelPosition === "right"
                                            ? "right"
                                            : "left"
                                        }
                                        onChange={(event) =>
                                          updateAnnotationField(field.id, {
                                            labelPosition:
                                              event.target.value === "right"
                                                ? "right"
                                                : "left",
                                          })
                                        }
                                        disabled={loading}
                                      >
                                        <option value="left">Left</option>
                                        <option value="right">Right</option>
                                      </select>
                                    </div>
                                    <div className="form-group">
                                      <label>Correct Answer</label>
                                      <input
                                        type="text"
                                        className="form-input !p-2 !bg-white"
                                        value={field.answer}
                                        onChange={(event) =>
                                          updateAnnotationField(field.id, {
                                            answer: event.target.value,
                                          })
                                        }
                                        placeholder="Enter correct value"
                                        disabled={loading}
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Input width (px)</label>
                                      <input
                                        type="number"
                                        min={ANNOTATION_MIN_WIDTH}
                                        className="form-input !p-2 !bg-white"
                                        value={field.width ?? ""}
                                        onChange={(event) =>
                                          updateAnnotationField(field.id, {
                                            width:
                                              event.target.value === ""
                                                ? ""
                                                : Number(event.target.value),
                                          })
                                        }
                                        disabled={loading}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-slate-500">
                              Add at least one input field to configure the
                              annotation.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="question-section w-full">
                    <header className="question-section-header option-header">
                      <div>
                        <h3>
                          {isImageType ? "Image Options" : "Answer Options"}
                        </h3>
                        <p>
                          {formField.questionType === QUESTION_TYPES.CHECKBOX
                            ? "Add options and mark every correct answer."
                            : "Add options and select the single correct answer."}
                        </p>
                      </div>
                      <div className="form-group answer-type-group">
                        <label>Answer Type</label>
                        <select
                          className="form-input"
                          value={answerType}
                          onChange={handleAnswerTypeChange}
                          disabled={loading}
                        >
                          <option value={ANSWER_TYPES.TEXT}>
                            Text Options
                          </option>
                          <option value={ANSWER_TYPES.IMAGE}>
                            Image Options
                          </option>
                        </select>
                      </div>
                    </header>
                    <div className="option-grid">
                      {options.map((option, index) => {
                        const isUploading = Boolean(
                          optionImageLoadingMap[option.id],
                        );

                        return (
                          <div key={option.id} className="option-item">
                            <div className="option-item-header">
                              <span>Option {index + 1}</span>
                              {options.length > 2 && (
                                <button
                                  type="button"
                                  className="delete-btn-append px-2 py-1 text-xs"
                                  onClick={() => removeOption(option.id)}
                                  disabled={loading}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            {answerType === ANSWER_TYPES.IMAGE ? (
                              <div className="flex flex-col gap-3">
                                <label className="media-upload-tile">
                                  {isUploading ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>Processing image...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload size={16} />
                                      <span>
                                        {option.imageUrl
                                          ? "Replace image"
                                          : "Upload image"}
                                      </span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      handleOptionFileChange(option.id, file);
                                      event.target.value = "";
                                    }}
                                    disabled={loading || isUploading}
                                  />
                                </label>
                                <input
                                  type="text"
                                  className="form-input read-only:cursor-not-allowed read-only:bg-[#f5f5f5]"
                                  value={option.imageUrl}
                                  onChange={(event) =>
                                    handleOptionValueChange(
                                      option.id,
                                      event.target.value,
                                    )
                                  }
                                  placeholder=""
                                  disabled={loading || isUploading}
                                  readOnly
                                />
                                {option.imageUrl && (
                                  <div className="media-upload-preview mt-4">
                                    <img
                                      src={resolveMediaUrl(option.imageUrl)}
                                      alt={`Option ${index + 1}`}
                                      className="preview-img"
                                    />
                                    <button
                                      type="button"
                                      className="media-remove-btn"
                                      onClick={() =>
                                        clearOptionImage(option.id)
                                      }
                                      disabled={loading || isUploading}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                className="form-input"
                                value={option.text}
                                onChange={(event) =>
                                  handleOptionValueChange(
                                    option.id,
                                    event.target.value,
                                  )
                                }
                                placeholder={`Enter option ${index + 1}`}
                                disabled={loading}
                              />
                            )}
                            <label className="correct-toggle mt-2">
                              <input
                                type="checkbox"
                                checked={option.isCorrect}
                                onChange={() => toggleCorrectAnswer(option.id)}
                                disabled={loading}
                              />
                              <span>
                                {formField.questionType ===
                                QUESTION_TYPES.CHECKBOX
                                  ? "Mark as correct answer"
                                  : "Set as correct answer"}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="global-btn secondary mt-4"
                      onClick={addOption}
                      disabled={loading}
                    >
                      <Plus size={16} />
                      Add Option
                    </button>
                  </section>
                )}

                <section className="question-section w-full">
                  <header className="question-section-header">
                    <h3>Solution Steps</h3>
                    <p>
                      Provide a step-by-step explanation with supporting images.
                    </p>
                  </header>
                  <SolutionStepsEditor
                    steps={solutionSteps}
                    onStepChange={handleSolutionStepChange}
                    onAddStep={addSolutionStep}
                    onRemoveStep={removeSolutionStep}
                    onUploadStepImages={handleSolutionStepImageUpload}
                    onRemoveStepImage={removeSolutionStepImage}
                    resolveMediaUrl={resolveMediaUrl}
                    disabled={loading}
                    loadingMap={solutionImageLoadingMap}
                  />
                </section>

                <section className="question-section w-full">
                  <header className="question-section-header">
                    <h3>Question Status</h3>
                    <p>Choose whether to save as draft or send for review.</p>
                  </header>
                  {!isAdmin && isApprovedStatus && (
                    <p className="text-green-600 text-sm flex gap-2 mt-3">
                      <Check size={18} className="pr-2" />
                      This question is already approved. You can still move it
                      back to draft or pending review if needed.
                    </p>
                  )}
                  <div className="flex flex-col gap-3 mt-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="status"
                        value="draft"
                        checked={
                          (formField.status || DEFAULT_FORM.status) === "draft"
                        }
                        onChange={handleFieldChange}
                        disabled={loading}
                      />
                      <div>
                        <div className="font-medium text-sm">Draft</div>
                        <div className="text-xs text-slate-500">
                          Save and continue editing; not visible to reviewers
                          yet.
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="status"
                        value="pending_review"
                        checked={
                          (formField.status || DEFAULT_FORM.status) ===
                          "pending_review"
                        }
                        onChange={handleFieldChange}
                        disabled={loading}
                      />
                      <div>
                        <div className="font-medium text-sm">
                          Pending for review
                        </div>
                        <div className="text-xs text-slate-500">
                          Submit to reviewers for approval.
                        </div>
                      </div>
                    </label>
                    {isAdmin && (
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="status"
                          value="approved"
                          checked={
                            (formField.status || DEFAULT_FORM.status) ===
                            "approved"
                          }
                          onChange={handleFieldChange}
                          disabled={loading}
                        />
                        <div>
                          <div className="font-medium text-sm">Approve</div>
                          <div className="text-xs text-slate-500">
                            Approved question will directly published to the
                            students.
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </section>
              </div>
              <div className="form-button-row">
                <button
                  type="button"
                  className="global-btn secondary flex items-center justify-center gap-1"
                  onClick={() => navigate(-1)}
                >
                  <>
                    <X size={18} />
                    Cancel
                  </>
                </button>
                <button
                  type="button"
                  className="global-btn secondary flex items-center justify-center gap-1"
                  onClick={() => setShowPreview(true)}
                >
                  <View size={18} />
                  Preview
                </button>
                <button
                  type="submit"
                  className="global-btn flex items-center justify-center gap-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      Please wait
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : isEditMode ? (
                    <>
                      Update Question
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Question
                      <Plus size={18} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {showPreview ? (
        <div className="fixed inset-0 z-50 bg-black/70">
          <div className="h-full w-full overflow-y-auto">
            <div className="min-h-full bg-white px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  Question Preview
                </h2>
                <button
                  type="button"
                  className="global-btn secondary flex items-center gap-1"
                  onClick={() => setShowPreview(false)}
                >
                  <X size={18} />
                  Close
                </button>
              </div>
              {!previewQuestion ? (
                <p className="mt-6 text-sm text-slate-500">
                  No question data available.
                </p>
              ) : (
                <div className="mt-6 question-area admin-question-preview">
                  <div className="question-body-main mx-auto w-full md:w-[46%] space-y-4">
                    <QuestionContent question={previewQuestion} />

                    {/* {selectionLabel ? (
                      <h1 className="text-[17px] font-bold pb-3 border-b border-gray-300">
                        {selectionLabel}
                      </h1>
                    ) : null} */}

                    <AnswerOptions
                      question={previewQuestion}
                      value={
                        previewQuestion.question_type === "check_box"
                          ? previewSelection.list
                          : previewSelection.value
                      }
                      onChange={() => {}}
                      componentsState={previewSelection.components}
                      onChangeComponent={() => {}}
                      evaluationStatus="correct"
                      disableSelection
                      disableInputs
                    />

                    {previewQuestion.question_type === "fill_blank" &&
                      (previewQuestion.components || []).length > 0 && (
                        <p className="text-sm text-slate-600">
                          Correct answers are filled into the blanks.
                        </p>
                      )}
                    {previewQuestion.question_type === "fill_blank" &&
                      !(previewQuestion.components || []).length &&
                      previewSelection.value && (
                        <p className="text-sm text-slate-600">
                          Correct answer:{" "}
                          <span className="font-semibold">
                            {previewSelection.value}
                          </span>
                        </p>
                      )}
                    {previewQuestion.question_type === "text_input" &&
                      previewSelection.value && (
                        <p className="text-sm text-slate-600">
                          Correct answer:{" "}
                          <span className="font-semibold">
                            {previewSelection.value}
                          </span>
                        </p>
                      )}
                    {(previewQuestion.question_type === "mcq" ||
                      previewQuestion.question_type === "check_box") &&
                      !previewQuestion.options?.length && (
                        <p className="text-sm text-slate-500">
                          No options provided.
                        </p>
                      )}
                    {previewQuestion.question_type === "check_box" &&
                      previewSelection.list?.length > 1 && (
                        <p className="text-sm text-slate-600">
                          All correct options are preselected.
                        </p>
                      )}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-md cursor-pointer text-indigo-500 underline"
                          onClick={() =>
                            setShowPreviewSolution((prev) => !prev)
                          }
                        >
                          {showPreviewSolution
                            ? "Hide Solution"
                            : "Show Solution"}
                        </button>
                      </div>
                      <SolutionSteps
                        steps={previewSolutionSteps}
                        show={showPreviewSolution}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeCrop ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-4xl rounded-lg bg-white shadow-2xl overflow-hidden">
            <div className="h-[65vh] overflow-auto bg-slate-100">
              <div
                ref={resizeCanvasWrapperRef}
                className="min-h-full min-w-full flex items-center justify-center p-4"
              >
                <canvas
                  ref={fabricCanvasRef}
                  className="max-h-full max-w-full"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 p-4 border-t border-slate-200">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">
                  Drag the corners to resize
                </span>
                <span className="text-sm text-slate-600">
                  Original: {sourceDimensions.width || "--"} x{" "}
                  {sourceDimensions.height || "--"} px
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={handleCropCancel}
                  disabled={processingCrop}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md bg-[#AB474B] text-white hover:bg-[#c4474b] disabled:opacity-60"
                  onClick={handleCropSave}
                  disabled={processingCrop}
                >
                  {processingCrop ? "Processing..." : "Save Resize"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default AssessmentQuestionForm;
