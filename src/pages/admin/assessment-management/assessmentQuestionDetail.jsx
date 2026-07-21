import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  getQuestionById,
  getQuestionHistory,
  updateQuestionStatus,
} from "@/api/questionApi";
import { useAuthStore } from "@/store/auth";
import QuestionContent from "@/components/questions/QuestionContent";
import AnswerOptions from "@/components/questions/AnswerOptions";
import SolutionSteps from "@/components/questions/SolutionSteps";
import {
  FILL_BLANK_TYPES,
  buildFillBlankStateFromAnswers,
  getFillBlankComponentId,
  getFillBlankComponentType,
} from "@/utils/fillBlankComponents";
import { normalizeAlgebraFormats } from "@/utils/algebraFormat";
import {
  normalizeDragDropSubmittedAnswer,
  resolveDragDropLabelId,
  resolveDragDropTargets,
} from "@/utils/dragDropQuestion";

const normalizeRole = (role) =>
  typeof role === "string" ? role.toLowerCase() : "";

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

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return format(new Date(value), "MMM dd, yyyy - hh:mm a");
  } catch (error) {
    return String(value);
  }
};

const normalizeQuestionDetail = (payload) => {
  const dataRoot = payload?.data ?? payload ?? {};
  const data = dataRoot?.question ?? dataRoot ?? {};
  const options = Array.isArray(data.options) ? data.options : [];
  const components = Array.isArray(data.components) ? data.components : [];
  const rawType = String(
    data?.question_type ?? data?.questionType ?? "",
  ).toLowerCase();
  const questionType =
    rawType === "fill_blank"
      ? "text_input"
      : rawType === "check_box" || rawType === "checkbox"
        ? "check_box"
        : rawType === "mcq" || rawType === "multiple_choice"
          ? "mcq"
          : rawType || "mcq";

  const normalizedComponents = components
    .map((component, index) => {
      if (!component) return null;
      const type = getFillBlankComponentType(component);
      const id = getFillBlankComponentId(component, index);
      if (type === FILL_BLANK_TYPES.STATEMENT) {
        const rawText =
          component?.text ?? component?.statement ?? component?.value ?? "";
        return { id, type, text: String(rawText ?? "").trim() };
      }
      if (type === FILL_BLANK_TYPES.BLANK) {
        const rawAnswer =
          component?.answer ?? component?.value ?? component?.text ?? "";
        return { id, type, answer: String(rawAnswer ?? "").trim() };
      }
      if (type === FILL_BLANK_TYPES.POWER) {
        return {
          id: component?.id ?? `cmp-${index}`,
          type,
          base: String(component?.base ?? component?.value?.base ?? "").trim(),
          exponent: String(
            component?.exponent ?? component?.value?.exponent ?? "",
          ).trim(),
        };
      }
      if (type === FILL_BLANK_TYPES.FRACTION) {
        return {
          id,
          type,
          numerator: String(
            component?.numerator ?? component?.value?.numerator ?? "",
          ).trim(),
          denominator: String(
            component?.denominator ?? component?.value?.denominator ?? "",
          ).trim(),
        };
      }
      if (type === FILL_BLANK_TYPES.MIXED_NUMBER) {
        return {
          id,
          type,
          whole: String(
            component?.whole ?? component?.value?.whole ?? "",
          ).trim(),
          numerator: String(
            component?.numerator ?? component?.value?.numerator ?? "",
          ).trim(),
          denominator: String(
            component?.denominator ?? component?.value?.denominator ?? "",
          ).trim(),
        };
      }
      return { id, type };
    })
    .filter(Boolean);

  const rawCorrect =
    data?.correct_answers && Array.isArray(data.correct_answers)
      ? data.correct_answers
      : data?.correct_answers
        ? [data.correct_answers]
        : [];

  const normalizedCorrectAnswers = rawCorrect
    .map((entry) => normalizeCorrectAnswerValue(entry))
    .map((answer) => String(answer ?? "").trim())
    .filter(Boolean);

  const blanksFromComponents = normalizedComponents
    .map((component) => {
      if (component.type === FILL_BLANK_TYPES.BLANK) {
        return component.answer;
      }
      if (component.type === FILL_BLANK_TYPES.POWER) {
        return [component.base, component.exponent];
      }
      if (component.type === FILL_BLANK_TYPES.FRACTION) {
        return [component.numerator, component.denominator];
      }
      if (component.type === FILL_BLANK_TYPES.MIXED_NUMBER) {
        return [component.whole, component.numerator, component.denominator];
      }
      return null;
    })
    .flat()
    .filter(Boolean);

  const correctAnswers = (
    normalizedCorrectAnswers.length
      ? normalizedCorrectAnswers
      : blanksFromComponents
  )
    .map((answer) => String(answer ?? "").trim())
    .filter(Boolean);

  let resolvedComponents = normalizedComponents;
  if (
    questionType === "text_input" &&
    !resolvedComponents.length &&
    correctAnswers.length
  ) {
    resolvedComponents = correctAnswers.map((answer, index) => ({
      id: `auto-blank-${index}`,
      type: "blank",
      value: answer,
    }));
  }

  const questionImages = Array.isArray(data?.question_image)
    ? data.question_image.filter(Boolean)
    : Array.isArray(data?.question_images)
      ? data.question_images.filter(Boolean)
      : data?.question_image
        ? [data.question_image]
        : data?.questionImage
          ? [data.questionImage]
          : [];
  const solutionStepsRaw = Array.isArray(data?.solution_steps)
    ? data.solution_steps
    : data?.solution_steps
      ? [data.solution_steps]
      : [];

  const annotationImage =
    data?.annotation_image ??
    data?.annotationImage ??
    data?.annotation?.image ??
    "";
  const annotationFields = Array.isArray(data?.annotation_fields)
    ? data.annotation_fields
    : Array.isArray(data?.annotationFields)
      ? data.annotationFields
      : Array.isArray(data?.annotation_inputs)
        ? data.annotation_inputs
        : Array.isArray(data?.annotationInputs)
          ? data.annotationInputs
          : Array.isArray(data?.annotation?.fields)
            ? data.annotation.fields
            : [];
  const rawAlgebraFormats =
    data?.algebra_formats ??
    data?.answer_formats ??
    data?.algebraFormats ??
    data?.answerFormats ??
    data?.formats ??
    [];
  const algebraFormats = normalizeAlgebraFormats({
    rawFormats: rawAlgebraFormats,
    correctFormatKey:
      data?.correct_format ??
      data?.correctFormat ??
      data?.algebra_correct_format,
    correctAnswerValues: normalizedCorrectAnswers,
  });
  const questionSchema = data?.question_schema ?? data?.questionSchema ?? {};
  const rawDragDrop = data?.drag_drop ?? data?.dragDrop ?? questionSchema ?? {};
  const dragDropModeCandidate = String(
    data?.drag_drop_mode ??
      data?.dragDropMode ??
      questionSchema?.drag_drop_mode ??
      questionSchema?.dragDropMode ??
      rawDragDrop?.mode ??
      "",
  ).toLowerCase();
  const dragDropMode =
    dragDropModeCandidate === "diagram_labels" ? "diagram_labels" : "item_grid";
  const rawDragDropLabels =
    data?.drag_drop_labels ??
    data?.dragDropLabels ??
    questionSchema?.drag_drop_labels ??
    questionSchema?.dragDropLabels ??
    rawDragDrop?.labels ??
    [];
  const dragDropLabels = Array.isArray(rawDragDropLabels)
    ? rawDragDropLabels.map((label, index) => ({
        id: label?.id ?? label?.label_id ?? label?.labelId ?? `label-${index}`,
        text: label?.text ?? label?.label ?? label?.name ?? "",
        reusable: Boolean(
          label?.reusable ?? label?.is_reusable ?? label?.isReusable,
        ),
      }))
    : [];
  const rawDragDropItems =
    data?.drag_drop_items ??
    data?.dragDropItems ??
    questionSchema?.drag_drop_items ??
    questionSchema?.dragDropItems ??
    rawDragDrop?.items ??
    [];
  const dragDropItems = Array.isArray(rawDragDropItems)
    ? rawDragDropItems.map((item, index) => ({
        id: item?.id ?? item?.item_id ?? item?.itemId ?? `item-${index}`,
        image:
          item?.image?.url ?? item?.image ?? item?.image_url ?? item?.url ?? "",
        correct_label_id:
          item?.correct_label_id ??
          item?.correctLabelId ??
          item?.correct_label ??
          item?.correctLabel ??
          item?.correct_label_text ??
          item?.correctLabelText ??
          item?.correct_label_name ??
          item?.correctLabelName ??
          item?.label_id ??
          "",
      }))
    : [];
  const rawDragDropDiagram =
    data?.drag_drop_diagram ??
    data?.dragDropDiagram ??
    questionSchema?.drag_drop_diagram ??
    questionSchema?.dragDropDiagram ??
    rawDragDrop?.diagram ??
    {};
  const dragDropDiagramImage =
    rawDragDropDiagram?.image?.url ??
    rawDragDropDiagram?.image ??
    data?.drag_drop_diagram_image ??
    data?.dragDropDiagramImage ??
    questionSchema?.drag_drop_diagram_image ??
    questionSchema?.dragDropDiagramImage ??
    "";
  const rawDragDropBlanks =
    rawDragDropDiagram?.blanks ??
    rawDragDropDiagram?.positions ??
    data?.drag_drop_blanks ??
    data?.dragDropBlanks ??
    questionSchema?.drag_drop_blanks ??
    questionSchema?.dragDropBlanks ??
    rawDragDrop?.blanks ??
    [];
  const dragDropDiagramBlanks = Array.isArray(rawDragDropBlanks)
    ? rawDragDropBlanks.map((blank, index) => ({
        id: blank?.id ?? blank?.blank_id ?? blank?.blankId ?? `blank-${index}`,
        x: Number(blank?.x ?? blank?.left ?? 0),
        y: Number(blank?.y ?? blank?.top ?? 0),
        width: Number(blank?.width ?? blank?.blank_width ?? 140),
        height: Number(blank?.height ?? blank?.blank_height ?? 48),
        correct_label_id:
          blank?.correct_label_id ??
          blank?.correctLabelId ??
          blank?.correct_label ??
          blank?.correctLabel ??
          blank?.correct_label_text ??
          blank?.correctLabelText ??
          blank?.correct_label_name ??
          blank?.correctLabelName ??
          blank?.label_id ??
          "",
      }))
    : [];

  return {
    id:
      data?._id ??
      data?.id ??
      data?.question_id ??
      data?.question?.id ??
      data?.question?._id ??
      null,
    topic:
      data?.topic?.topic_name ??
      data?.topic_name ??
      data?.topic ??
      data?.topic?.name ??
      "Untitled Topic",
    questionType,
    questionText: data?.question_text ?? data?.questionText ?? "",
    difficulty: data?.difficulty_level ?? data?.difficultyLevel ?? "",
    marks: data?.marks ?? "",
    createdAt: data?.created_at ?? data?.createdAt ?? "",
    correctAnswers,
    dragDropCorrectAnswers: rawCorrect,
    options: options.map((option, index) => ({
      id:
        option?.id ??
        option?.option_id ??
        option?.optionId ??
        option?.value ??
        `opt-${index}`,
      text: option?.text ?? option?.label ?? option?.value ?? "",
      isImage:
        option?.is_image === true ||
        option?.is_image === "1" ||
        option?.is_image === 1 ||
        Boolean(option?.image) ||
        Boolean(option?.image_url),
      image: option?.image ?? option?.image_url ?? option?.imagePath ?? "",
    })),
    questionImages,
    blanks: resolvedComponents
      .filter((component) => component.type === "blank")
      .map((component) => component.value)
      .filter(Boolean),
    components: resolvedComponents,
    solutionSteps: solutionStepsRaw.map((step, idx) => ({
      id: step?.id ?? `solution-${idx}`,
      explanation: step?.explanation ?? step?.text ?? "",
      images: Array.isArray(step?.images)
        ? step.images.filter(Boolean)
        : step?.images
          ? [step.images]
          : [],
    })),
    status: data?.status ?? "",
    rejectionReason: data?.rejection_reason ?? "",
    rejection_reason: data?.rejection_reason ?? "",
    reviewNote:
      data?.rejection_reason ??
      data?.review_reason ??
      data?.review_notes ??
      data?.reviewer_comment ??
      data?.reviewer_note ??
      "",
    annotationImage,
    annotationFields,
    algebraFormats,
    correctFormat:
      data?.correct_format ??
      data?.correctFormat ??
      data?.algebra_correct_format,
    algebraStatement:
      data?.algebra_statement ??
      data?.algebraStatement ??
      data?.answer_statement ??
      "",
    dragDropMode,
    dragDropLabels,
    dragDropItems,
    dragDropDiagram: {
      image: dragDropDiagramImage,
      blanks: dragDropDiagramBlanks,
    },
  };
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

const AssessmentQuestionDetail = () => {
  const { id: paramsId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { role: authRole, user } = useAuthStore();
  const { state } = location;

  const fallbackStateQuestion = state?.question ?? null;
  const questionId = paramsId || state?.questionId || fallbackStateQuestion?.id;

  const [question, setQuestion] = React.useState(
    fallbackStateQuestion
      ? normalizeQuestionDetail(fallbackStateQuestion)
      : null,
  );
  const [history, setHistory] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [actionError, setActionError] = React.useState("");
  const [reviewStatus, setReviewStatus] = React.useState("");
  const [reviewNote, setReviewNote] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [showSolution, setShowSolution] = React.useState(false);

  // Fetch question detail if not provided via state
  React.useEffect(() => {
    if (!questionId || question) return;

    let isMounted = true;
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        const response = await getQuestionById(questionId);
        if (!isMounted) return;
        setQuestion(normalizeQuestionDetail(response));
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message || "Unable to load question details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchQuestion();
    return () => {
      isMounted = false;
    };
  }, [questionId, question]);

  // Always fetch history when an id is present
  React.useEffect(() => {
    if (!questionId) return;
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        const historyResponse = await getQuestionHistory(questionId);
        if (!isMounted) return;
        setHistory(historyResponse?.data ?? historyResponse ?? null);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message || "Unable to load question history. Please try again.";
        toast.error(message);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [questionId]);

  React.useEffect(() => {
    if (!question) return;
    const normalizedStatus = String(question.status || "").toLowerCase();
    if (["approved", "rejected"].includes(normalizedStatus)) {
      setReviewStatus((prev) => prev || normalizedStatus);
    }
    if (question.reviewNote) {
      setReviewNote((prev) => prev || question.rejection_reason);
    }
  }, [question]);

  React.useEffect(() => {
    setShowSolution(false);
  }, [question?.id]);

  const previewQuestion = React.useMemo(() => {
    if (!question) return null;

    const resolvedType =
      question.questionType === "text_input" && question.components?.length
        ? "fill_blank"
        : question.questionType;

    const options =
      Array.isArray(question.options) && question.options.length
        ? question.options.map((option, index) => ({
            id: option?.id ?? `opt-${index}`,
            text: option?.text ?? "",
            image: option?.image ?? "",
            is_image:
              option?.isImage === true ||
              option?.isImage === 1 ||
              option?.isImage === "1" ||
              option?.is_image === true,
          }))
        : [];

    const answer_type =
      options.some((opt) => opt.is_image) && resolvedType !== "text_input"
        ? "image"
        : "text";

    const components = (question.components || []).map((component, idx) => {
      const type = getFillBlankComponentType(component);
      const id = getFillBlankComponentId(component, idx);
      if (type === FILL_BLANK_TYPES.STATEMENT) {
        return {
          id,
          type,
          text: component?.text ?? component?.value ?? "",
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
    });

    const algebraFormats = question.algebraFormats ?? [];

    const initialCorrect = question.correctAnswers?.length
      ? question.correctAnswers
      : (question.blanks ?? []);

    const normalizedCorrect = initialCorrect
      .map((answer) =>
        answer === null || answer === undefined ? "" : String(answer),
      )
      .filter(Boolean);

    const matchedOptionIds = options
      .filter((option) => isCorrectOption(option, normalizedCorrect))
      .map((option) => String(option.id));

    const correct_answers =
      resolvedType === "drag_drop"
        ? (question.dragDropCorrectAnswers ?? [])
        : resolvedType === "fill_blank" || resolvedType === "algebra"
          ? normalizedCorrect
          : Array.from(new Set([...normalizedCorrect, ...matchedOptionIds]));

    return {
      question_id: question.id ?? "question-preview",
      question_type: resolvedType,
      question_text: question.questionText ?? "",
      algebra_statement:
        question.algebraStatement ??
        question.algebra_statement ??
        question.answer_statement ??
        "",
      options,
      answer_type,
      components,
      correct_answers,
      algebra_formats: algebraFormats,
      correct_format: question.correctFormat ?? null,
      images: question.questionImages ?? [],
      solution_steps: question.solutionSteps ?? [],
      annotation_image: question.annotationImage ?? question.annotation_image,
      annotation_fields:
        question.annotationFields ?? question.annotation_fields,
      drag_drop_mode: question.dragDropMode,
      drag_drop_labels: question.dragDropLabels,
      drag_drop_items: question.dragDropItems,
      drag_drop_diagram: question.dragDropDiagram,
    };
  }, [question]);

  const previewSelection = React.useMemo(() => {
    if (!previewQuestion) {
      return { value: null, list: [], components: {} };
    }

    const {
      question_type,
      correct_answers = [],
      components = [],
      options = [],
    } = previewQuestion;

    const normalizedCorrect = correct_answers.map((answer) =>
      answer === null || answer === undefined
        ? ""
        : String(normalizeCorrectAnswerValue(answer)),
    );

    const matchedOptionIds = options
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
        options.find((opt) =>
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
        const labelId = resolveDragDropLabelId(
          previewQuestion,
          target?.correctLabelId ??
            target?.correct_label_id ??
            target?.label_id ??
            target?.labelId ??
            "",
        );
        if (labelId) {
          map[target.id] = labelId;
        }
      });
      const normalizedFromCorrect = normalizeDragDropSubmittedAnswer(
        previewQuestion,
        previewQuestion.correct_answers,
      );
      const hasNormalizedFromCorrect = Object.values(
        normalizedFromCorrect,
      ).some((value) => value);
      return {
        value: null,
        list: [],
        components: hasNormalizedFromCorrect
          ? { ...map, ...normalizedFromCorrect }
          : map,
      };
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

  const normalizedRole = normalizeRole(authRole ?? user?.role);
  const pathLower = location.pathname.toLowerCase();
  const isDataEntry =
    normalizedRole === "data_entry" || pathLower.startsWith("/data-entry");
  const isReviewer =
    normalizedRole === "reviewer" || pathLower.startsWith("/reviewer");
  const basePath = isDataEntry
    ? "/data-entry"
    : isReviewer
      ? "/reviewer"
      : "/admin";
  const timelineEvents = Array.isArray(history?.timeline)
    ? history.timeline
    : [];
  const entryInfo = history?.entry_info;
  const reviewInfo = history?.review_info;
  const rejectionReason =
    reviewInfo?.rejection_reason ??
    question?.rejectionReason ??
    question?.rejection_reason ??
    question?.reviewNote ??
    "";

  const handleSubmitReview = async () => {
    if (!questionId) {
      toast.error("Question id is missing.");
      return;
    }

    const normalizedStatus =
      reviewStatus === "rejected"
        ? "rejected"
        : reviewStatus === "approved"
          ? "approved"
          : "";

    if (!normalizedStatus) {
      const message = "Select approve or reject before submitting.";
      setActionError(message);
      toast.error(message);
      return;
    }

    if (normalizedStatus === "rejected" && !reviewNote.trim()) {
      const message = "Please add a short reason before rejecting.";
      setActionError(message);
      toast.error(message);
      return;
    }

    try {
      setActionError("");
      setActionLoading(true);
      const payload = { status: normalizedStatus };
      const trimmedNote = reviewNote.trim();
      if (trimmedNote) {
        payload.rejection_reason = trimmedNote;
      }

      await updateQuestionStatus(questionId, payload);
      toast.success(
        normalizedStatus === "approved"
          ? "Question approved successfully."
          : "Question rejected successfully.",
      );
      setQuestion((prev) =>
        prev
          ? {
              ...prev,
              status: normalizedStatus,
              reviewNote: trimmedNote,
              rejectionReason:
                normalizedStatus === "rejected"
                  ? trimmedNote
                  : (prev?.rejectionReason ?? prev?.rejection_reason ?? ""),
              rejection_reason:
                normalizedStatus === "rejected"
                  ? trimmedNote
                  : (prev?.rejection_reason ?? prev?.rejectionReason ?? ""),
            }
          : prev,
      );
      navigate("/reviewer/question-lists");
    } catch (err) {
      const message =
        err?.message || "Unable to update review status. Please try again.";
      setActionError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>
            {isDataEntry
              ? "Data Entry Dashboard"
              : isReviewer
                ? "Reviewer Dashboard"
                : "Admin Dashboard"}
          </h4>
          <h1>Question Preview</h1>
        </div>
        <div className="dh-right">
          <Link
            to={`${basePath}/assessment-question-lists`}
            className="global-btn secondary flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="alert-custom bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}
      {loading || !question ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
        </div>
      ) : (
        <>
          <div className="dashboard-body dashboard-body-card">
            <>
              <div className="flex flex-wrap gap-2 text-sm mb-6">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                  Type:{" "}
                  {question.questionType === "mcq"
                    ? "Multiple Choice (Single Answer)"
                    : question.questionType === "check_box"
                      ? "Multiple Choice (Multiple Answers)"
                      : question.questionType === "image_annotation"
                        ? "Image Annotation"
                        : question.questionType === "algebra"
                          ? "Algebra"
                          : "Text Input"}
                </span>
                {question.status ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 capitalize">
                    Status: {question.status.replace(/_/g, " ")}
                  </span>
                ) : null}
                {question.difficulty ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                    Difficulty: {question.difficulty}
                  </span>
                ) : null}
                {question.marks ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-green-700">
                    Marks: {question.marks}
                  </span>
                ) : null}
                {question.topic ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    Topic: {question.topic}
                  </span>
                ) : null}
              </div>

              <section className="w-full">
                {!previewQuestion ? (
                  <p className="text-sm text-slate-500">
                    No question data available.
                  </p>
                ) : (
                  <div className="question-area admin-question-preview">
                    <div className="question-body-main mx-auto w-full md:w-[60%] space-y-4">
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
                      {previewQuestion.solution_steps?.length ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              className="px-4 py-2 rounded-md cursor-pointer text-indigo-500 underline"
                              onClick={() => setShowSolution((prev) => !prev)}
                            >
                              {showSolution ? "Hide Solution" : "Show Solution"}
                            </button>
                          </div>
                          <SolutionSteps
                            steps={previewQuestion.solution_steps}
                            show={showSolution}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </section>
            </>
          </div>

          <div className="dashboard-body dashboard-body-card">
            {isReviewer && (
              <section className="question-section w-full">
                <header className="question-section-header">
                  <h3>Review Decision</h3>
                  <p className="text-sm text-slate-500 mb-3">
                    Approve or reject this question. Rejection requires a short
                    reason.
                  </p>
                </header>
                {actionError && (
                  <Alert
                    variant="destructive"
                    className="alert-custom mb-3 bg-[#FDF7EC]"
                  >
                    <AlertCircleIcon size={18} />
                    <AlertTitle>{actionError}</AlertTitle>
                  </Alert>
                )}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewStatus"
                        value="approved"
                        checked={reviewStatus === "approved"}
                        onChange={() => {
                          setReviewStatus("approved");
                          setActionError("");
                        }}
                        disabled={actionLoading}
                      />
                      <span className="text-sm font-medium">Approve</span>
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewStatus"
                        value="rejected"
                        checked={reviewStatus === "rejected"}
                        onChange={() => {
                          setReviewStatus("rejected");
                          setActionError("");
                        }}
                        disabled={actionLoading}
                      />
                      <span className="text-sm font-medium">Reject</span>
                    </label>
                  </div>
                  {reviewStatus === "rejected" && (
                    <div className="form-group">
                      <label>
                        Rejection Reason <span>*</span>
                      </label>
                      <textarea
                        className="form-input min-h-[120px]"
                        value={reviewNote}
                        onChange={(event) => {
                          setReviewNote(event.target.value);
                          setActionError("");
                        }}
                        placeholder="Share a brief reason to help the author address the issue."
                        disabled={actionLoading}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="global-btn flex items-center gap-2"
                      onClick={handleSubmitReview}
                      disabled={
                        actionLoading ||
                        !["approved", "rejected"].includes(reviewStatus)
                      }
                    >
                      {actionLoading ? (
                        <>
                          Processing
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        <>Submit Review Decision</>
                      )}
                    </button>
                  </div>
                  {question.status ? (
                    <span className="text-sm text-slate-600 ">
                      Current status:{" "}
                      <span className="font-semibold capitalize">
                        {question.status.replace(/_/g, " ")}
                      </span>
                    </span>
                  ) : null}
                </div>
              </section>
            )}

            {history && (
              <section className="question-section w-full">
                <header className="question-section-header">
                  <h3>History</h3>
                  <p className="text-sm text-slate-500 mb-3">
                    Created and review activity for this question.
                  </p>
                </header>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[15px] border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase text-slate-500 mb-1">
                      Created By
                    </div>
                    <div className="text-sm font-medium">
                      {entryInfo?.created_by?.name ?? "--"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {entryInfo?.created_by?.email ?? ""}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                      {formatDateTime(entryInfo?.created_at) || "--"}
                    </div>
                  </div>
                  <div className="rounded-[15px] border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase text-slate-500 mb-1">
                      Reviewed By
                    </div>
                    <div className="text-sm font-medium">
                      {reviewInfo?.reviewed_by?.name ?? "--"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {reviewInfo?.reviewed_by?.email ?? ""}
                    </div>
                    <div className="text-sm text-slate-500">
                      Reason: <strong>{reviewNote || "--"}</strong>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                        {formatDateTime(reviewInfo?.reviewed_at) || "--"}
                      </span>
                      {reviewInfo?.status ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-[11px] text-emerald-700 capitalize">
                          {reviewInfo.status.replace(/_/g, " ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Timeline</h4>
                  {timelineEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No timeline available.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {timelineEvents.map((item, idx) => (
                        <li
                          key={`${item.event}-${idx}`}
                          className="rounded-[15px] border border-gray-200 bg-white p-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-indigo-500" />
                              <span className="text-sm font-medium">
                                {item.event ?? "Event"}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">
                              {formatDateTime(item.timestamp)}
                            </span>
                          </div>
                          {item.details ? (
                            <div className="text-xs text-slate-600 mt-1">
                              {item.details}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default AssessmentQuestionDetail;
