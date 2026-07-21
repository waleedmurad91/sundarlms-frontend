import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  ALargeSmall,
  AlertCircleIcon,
  Book,
  BookA,
  Check,
  Clock3,
  Eye,
  Loader2,
  Plus,
  Save,
  SquareStack,
  Trash2,
  X,
} from "lucide-react";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import ListToolbar from "@/components/ListToolbar";
import FilterBar from "@/components/filter/FilterBar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildFilterParams,
  buildFilterStateFromSchema,
} from "@/lib/applyFilters";
import {
  addAssessment,
  getAssessmentById,
  getAssessmentCatalog,
  getAssessmentQuestions,
  updateAssessmentById,
} from "@/api/assessmentApi";

const DEFAULT_FORM = {
  title: "",
  startMode: "any_time",
  startAt: "",
  durationMinutes: "10",
  submissionMode: "no_deadline",
  submitBy: "",
  resultPublishMode: "immediate",
  resultPublishAt: "",
  showAttemptsToStudents: "false",
  classIds: [],
  subjectIds: [],
  unitIds: [],
  topicIds: [],
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const arraysEqual = (left = [], right = []) => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
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

const normalizeId = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
};

const normalizeIdArray = (value) =>
  asArray(value)
    .map((item) => {
      if (item && typeof item === "object") {
        return (
          item.id ??
          item._id ??
          item.value ??
          item.class_id ??
          item.classId ??
          item.subject_id ??
          item.subjectId ??
          item.unit_id ??
          item.unitId ??
          item.topic_id ??
          item.topicId ??
          null
        );
      }
      return item;
    })
    .map((item) => normalizeId(item))
    .filter(Boolean);

const toNumberArray = (values) =>
  asArray(values)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

const normalizeResultPublishMode = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "later" || normalized === "immediate") {
    return normalized;
  }
  return "immediate";
};

const toBooleanSelectValue = (value, fallback = "false") => {
  if (value === true || value === 1) {
    return "true";
  }
  if (value === false || value === 0) {
    return "false";
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return "true";
  }
  if (["false", "0", "no"].includes(normalized)) {
    return "false";
  }

  return fallback;
};

const toDateTimeLocalInput = (value) => {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();
  if (!raw) {
    return "";
  }

  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return normalized.slice(0, 16);
  }

  const pad = (num) => String(num).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
    parsed.getDate(),
  )}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const toApiDateTime = (value) => {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const [datePart, timePart] = raw.split("T");
  if (!datePart || !timePart) {
    return null;
  }

  if (timePart.length >= 8) {
    return `${datePart} ${timePart.slice(0, 8)}`;
  }

  if (timePart.length >= 5) {
    return `${datePart} ${timePart.slice(0, 5)}:00`;
  }

  return `${datePart} ${timePart}:00`;
};

const getTopicId = (topic) =>
  normalizeId(
    topic?._id ??
      topic?.id ??
      topic?.value ??
      topic?.topic_id ??
      topic?.topicId,
  );

const getTopicLabel = (topic) =>
  String(
    topic?.topic_name ??
      topic?.name ??
      topic?.title ??
      topic?.label ??
      "Untitled Topic",
  ).trim();

const getUnitId = (unit) =>
  normalizeId(
    unit?._id ?? unit?.id ?? unit?.value ?? unit?.unit_id ?? unit?.unitId,
  );

const getUnitLabel = (unit) =>
  String(
    unit?.name ??
      unit?.unit_name ??
      unit?.unitName ??
      unit?.title ??
      unit?.label ??
      "Untitled Unit",
  ).trim();

const getSubjectId = (subject) =>
  normalizeId(
    subject?._id ??
      subject?.id ??
      subject?.value ??
      subject?.subject_id ??
      subject?.subjectId,
  );

const getSubjectLabel = (subject) =>
  String(
    subject?.subject ??
      subject?.name ??
      subject?.title ??
      subject?.label ??
      "Untitled Subject",
  ).trim();

const getClassInfo = (unit, subject, topic, entry) => {
  const subjectGrade =
    subject?.grade ?? subject?.grade_data ?? subject?.gradeData ?? {};
  const classCandidate =
    unit?.class ??
    unit?.school_class ??
    unit?.schoolClass ??
    subject?.class ??
    subject?.school_class ??
    subject?.schoolClass ??
    topic?.class ??
    topic?.school_class ??
    topic?.schoolClass ??
    entry?.class ??
    entry?.school_class ??
    entry?.schoolClass ??
    subjectGrade ??
    {};

  const classId = normalizeId(
    classCandidate?.id ??
      classCandidate?._id ??
      classCandidate?.value ??
      classCandidate?.class_id ??
      classCandidate?.classId ??
      classCandidate?.grade_id ??
      classCandidate?.gradeId ??
      subject?.grade_id ??
      subject?.gradeId ??
      unit?.class_id ??
      unit?.classId,
  );

  if (!classId) {
    return null;
  }

  const classLabel = String(
    classCandidate?.name ??
      classCandidate?.title ??
      classCandidate?.label ??
      subjectGrade?.name ??
      subjectGrade?.title ??
      `Class ${classId}`,
  ).trim();

  return {
    id: classId,
    label: classLabel || `Class ${classId}`,
  };
};

const sortOptions = (items = []) =>
  [...items].sort((left, right) =>
    String(left?.label ?? "").localeCompare(
      String(right?.label ?? ""),
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      },
    ),
  );

const buildHierarchy = (topicList = []) => {
  const classMap = new Map();
  const subjectMap = new Map();
  const unitMap = new Map();
  const topicMap = new Map();

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
    const subjectId = getSubjectId(subject);
    if (!subjectId) {
      return;
    }

    const classInfo = getClassInfo(unit, subject, topic, entry);

    if (classInfo) {
      classMap.set(classInfo.id, {
        value: classInfo.id,
        label: classInfo.label,
      });
    }

    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, {
        value: subjectId,
        label: getSubjectLabel(subject),
        classLinks: new Map(),
      });
    }
    const subjectItem = subjectMap.get(subjectId);
    if (classInfo) {
      subjectItem.classLinks.set(classInfo.id, classInfo.label);
    }

    if (!unitMap.has(unitId)) {
      unitMap.set(unitId, {
        value: unitId,
        label: getUnitLabel(unit),
        subjectLinks: new Map(),
      });
    }
    const unitItem = unitMap.get(unitId);
    unitItem.subjectLinks.set(subjectId, getSubjectLabel(subject));

    if (!topicMap.has(topicId)) {
      topicMap.set(topicId, {
        value: topicId,
        label: getTopicLabel(topic),
        unitLinks: new Map(),
      });
    }
    const topicItem = topicMap.get(topicId);
    topicItem.unitLinks.set(unitId, getUnitLabel(unit));
  });

  const classes = sortOptions(Array.from(classMap.values()));
  const subjects = sortOptions(
    Array.from(subjectMap.values()).map((item) => ({
      ...item,
      classLinks: Array.from(item.classLinks.entries()).map(([id, label]) => ({
        id,
        label,
      })),
    })),
  );
  const units = sortOptions(
    Array.from(unitMap.values()).map((item) => ({
      ...item,
      subjectLinks: Array.from(item.subjectLinks.entries()).map(
        ([id, label]) => ({
          id,
          label,
        }),
      ),
    })),
  );
  const topics = sortOptions(
    Array.from(topicMap.values()).map((item) => ({
      ...item,
      unitLinks: Array.from(item.unitLinks.entries()).map(([id, label]) => ({
        id,
        label,
      })),
    })),
  );

  return {
    classes,
    subjects,
    units,
    topics,
  };
};

const resolveAssessmentData = (payload) => {
  if (!payload) {
    return null;
  }

  const candidate =
    payload?.data?.data ??
    payload?.data?.assessment ??
    payload?.data ??
    payload?.assessment ??
    payload;

  return candidate?.data ?? candidate;
};

const getQuestionId = (question) =>
  normalizeId(
    question?._id ??
      question?.id ??
      question?.question_id ??
      question?.questionId ??
      question?.question?.id ??
      question?.question?._id,
  );

const getQuestionTypeLabel = (type) => {
  const normalized = String(type ?? "").toLowerCase();
  if (normalized === "mcq") return "MCQ (Single)";
  if (normalized === "check_box") return "MCQ (Multiple)";
  if (normalized === "fill_blank") return "Text Input";
  if (normalized === "image_annotation") return "Image Annotation";
  if (normalized === "drag_drop") return "Drag & Drop";
  if (normalized === "algebra") return "Algebra";
  return normalized || "Unknown";
};

const stripHtml = (value) =>
  String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeQuestionRow = (row) => {
  const id = getQuestionId(row);
  if (!id) {
    return null;
  }

  const rawQuestion =
    row?.question_text ?? row?.question?.question_text ?? row?.question ?? "";
  const unitLabel = String(
    row?.topic?.unit?.unit_name ??
      row?.topic?.unit?.name ??
      row?.unit?.unit_name ??
      row?.unit_name ??
      row?.unit?.name ??
      row?.topic?.unit_name ??
      "-",
  ).trim();
  const topicLabel = String(
    row?.topic?.topic_name ?? row?.topic_name ?? row?.topic?.name ?? "-",
  ).trim();

  return {
    id,
    questionText: stripHtml(rawQuestion) || `Question #${id}`,
    questionType: getQuestionTypeLabel(
      row?.question_type ?? row?.question?.question_type,
    ),
    unitLabel: unitLabel || "-",
    topicLabel: topicLabel || "-",
    raw: row,
  };
};

const resolveQuestionRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = payload ?? {};
  const candidates = [
    root?.data?.data,
    root?.data?.questions,
    root?.data,
    root?.questions,
    root,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const normalizeSelectedQuestions = (assessment) => {
  const questionObjects = asArray(
    assessment?.questions ??
      assessment?.question_list ??
      assessment?.questionList ??
      assessment?.assessment_questions,
  );

  const mappedObjects = questionObjects
    .map((question) => normalizeQuestionRow(question))
    .filter(Boolean);

  if (mappedObjects.length > 0) {
    return mappedObjects;
  }

  const questionIds = normalizeIdArray(
    assessment?.question_ids ?? assessment?.questionIds,
  );

  return questionIds.map((id) => ({
    id,
    questionText: `Question #${id}`,
    questionType: "-",
    unitLabel: "-",
    topicLabel: "-",
    raw: { id },
  }));
};

const createQuestionFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search question id, topic, type, or text...",
  },
  {
    key: "unit_labels",
    type: "multiselect",
    label: "Unit",
    options: asArray(options?.unit_labels),
    placeholder: "Select unit",
  },
  {
    key: "topic_labels",
    type: "multiselect",
    label: "Topic",
    options: asArray(options?.topic_labels),
    placeholder: "Select topic",
  },
  {
    key: "question_types",
    type: "multiselect",
    label: "Type",
    options: asArray(options?.question_types),
    placeholder: "Select type",
  },
];

const QUESTION_FILTER_DEFAULTS = buildFilterStateFromSchema(
  createQuestionFilterSchema({}),
);

const normalizeFilterValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const buildQuestionFilterOptions = (questions, key) => {
  const optionsMap = new Map();

  asArray(questions).forEach((question) => {
    const rawValue = String(question?.[key] ?? "").trim();
    if (!rawValue || rawValue === "-") {
      return;
    }
    const normalized = normalizeFilterValue(rawValue);
    if (!optionsMap.has(normalized)) {
      optionsMap.set(normalized, rawValue);
    }
  });

  return sortOptions(
    Array.from(optionsMap.values()).map((value) => ({
      value,
      label: value,
    })),
  );
};

const areFilterStatesEqual = (left = {}, right = {}) => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    const leftValue = left?.[key];
    const rightValue = right?.[key];

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      if (!arraysEqual(asArray(leftValue), asArray(rightValue))) {
        return false;
      }
      continue;
    }

    if (String(leftValue ?? "") !== String(rightValue ?? "")) {
      return false;
    }
  }

  return true;
};

const sanitizeQuestionFilterState = (state, schema) => {
  const normalized = buildFilterStateFromSchema(schema, state);

  schema.forEach((field) => {
    if (field?.type !== "multiselect") {
      return;
    }

    const allowedValues = new Set(
      asArray(field?.options).map((option) => normalizeId(option?.value)),
    );

    normalized[field.key] = asArray(normalized[field.key]).filter((value) =>
      allowedValues.has(normalizeId(value)),
    );
  });

  return normalized;
};

const applyQuestionFilters = (questions = [], filters = {}) => {
  const search = normalizeFilterValue(filters?.search);
  const selectedUnits = new Set(
    asArray(filters?.unit_labels)
      .map((value) => normalizeFilterValue(value))
      .filter(Boolean),
  );
  const selectedTopics = new Set(
    asArray(filters?.topic_labels)
      .map((value) => normalizeFilterValue(value))
      .filter(Boolean),
  );
  const selectedTypes = new Set(
    asArray(filters?.question_types)
      .map((value) => normalizeFilterValue(value))
      .filter(Boolean),
  );

  return asArray(questions).filter((question) => {
    const unitLabel = String(question?.unitLabel ?? "").trim();
    const topicLabel = String(question?.topicLabel ?? "").trim();
    const questionType = String(question?.questionType ?? "").trim();
    const questionText = String(question?.questionText ?? "").trim();
    const questionId = String(question?.id ?? "").trim();

    if (search) {
      const haystack =
        `${questionId} ${unitLabel} ${topicLabel} ${questionType} ${questionText}`
          .toLowerCase()
          .trim();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (
      selectedUnits.size &&
      !selectedUnits.has(normalizeFilterValue(unitLabel))
    ) {
      return false;
    }

    if (
      selectedTopics.size &&
      !selectedTopics.has(normalizeFilterValue(topicLabel))
    ) {
      return false;
    }

    if (
      selectedTypes.size &&
      !selectedTypes.has(normalizeFilterValue(questionType))
    ) {
      return false;
    }

    return true;
  });
};

const paginateRows = (rows = [], page = 1, perPage = 10) => {
  const list = asArray(rows);
  const safePerPage = Math.max(1, Number(perPage) || 10);
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePerPage));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const from = totalItems === 0 ? 0 : (safePage - 1) * safePerPage + 1;
  const to =
    totalItems === 0 ? 0 : Math.min(totalItems, from + safePerPage - 1);

  return {
    data: list.slice(from > 0 ? from - 1 : 0, to),
    currentPage: safePage,
    totalPages,
    totalItems,
    from,
    to,
  };
};

const buildFormFromAssessment = (assessment) => ({
  title: String(assessment?.title ?? "").trim(),
  startMode: String(
    assessment?.start_mode ?? assessment?.startMode ?? "any_time",
  ).trim(),
  startAt: toDateTimeLocalInput(assessment?.start_at ?? assessment?.startAt),
  durationMinutes:
    assessment?.duration_minutes !== undefined &&
    assessment?.duration_minutes !== null
      ? String(assessment.duration_minutes)
      : "10",
  submissionMode: String(
    assessment?.submission_mode ?? assessment?.submissionMode ?? "no_deadline",
  ).trim(),
  submitBy: toDateTimeLocalInput(assessment?.submit_by ?? assessment?.submitBy),
  resultPublishMode: normalizeResultPublishMode(
    assessment?.result_publish_mode ?? assessment?.resultPublishMode,
  ),
  resultPublishAt: toDateTimeLocalInput(
    assessment?.result_publish_at ?? assessment?.resultPublishAt,
  ),
  showAttemptsToStudents: toBooleanSelectValue(
    assessment?.show_attempts_to_students ?? assessment?.showAttemptsToStudents,
    "false",
  ),
  classIds: normalizeIdArray(
    assessment?.class_ids ??
      assessment?.classIds ??
      assessment?.grade_ids ??
      assessment?.gradeIds ??
      assessment?.classes,
  ),
  subjectIds: normalizeIdArray(
    assessment?.subject_ids ?? assessment?.subjectIds ?? assessment?.subjects,
  ),
  unitIds: normalizeIdArray(
    assessment?.unit_ids ?? assessment?.unitIds ?? assessment?.units,
  ),
  topicIds: normalizeIdArray(
    assessment?.topic_ids ?? assessment?.topicIds ?? assessment?.topics,
  ),
});

const AssessmentForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const location = useLocation();
  const { state } = location;

  const fallbackStateAssessment = state?.assessment ?? null;
  const assessmentId =
    paramsId ||
    state?.assessmentId ||
    fallbackStateAssessment?._id ||
    fallbackStateAssessment?.id;
  const isEditMode = Boolean(assessmentId);

  const basePath = location.pathname.startsWith("/data-entry")
    ? "/data-entry"
    : location.pathname.startsWith("/reviewer")
      ? "/reviewer"
      : "/admin";
  const headerTitle =
    basePath === "/data-entry"
      ? "Data Entry Dashboard"
      : basePath === "/reviewer"
        ? "Reviewer Dashboard"
        : "Admin Dashboard";

  const [formField, setFormField] = React.useState(DEFAULT_FORM);
  const [topicSource, setTopicSource] = React.useState([]);
  const [availableQuestions, setAvailableQuestions] = React.useState([]);
  const [selectedQuestions, setSelectedQuestions] = React.useState([]);
  const [topicsLoading, setTopicsLoading] = React.useState(false);
  const [questionLoading, setQuestionLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [availableFilterDraft, setAvailableFilterDraft] = React.useState(
    () => ({
      ...QUESTION_FILTER_DEFAULTS,
    }),
  );
  const [appliedAvailableFilters, setAppliedAvailableFilters] = React.useState(
    () => ({
      ...QUESTION_FILTER_DEFAULTS,
    }),
  );
  const [availableCurrentPage, setAvailableCurrentPage] = React.useState(1);
  const [availableRowsPerPage, setAvailableRowsPerPage] = React.useState(10);
  const [selectedCurrentPage, setSelectedCurrentPage] = React.useState(1);
  const [selectedRowsPerPage, setSelectedRowsPerPage] = React.useState(10);

  const hierarchy = React.useMemo(
    () => buildHierarchy(topicSource),
    [topicSource],
  );

  const classOptions = hierarchy.classes;

  const subjectOptions = React.useMemo(() => {
    if (!formField.classIds.length) {
      return [];
    }

    return hierarchy.subjects
      .filter((subject) =>
        subject.classLinks.some((link) => formField.classIds.includes(link.id)),
      )
      .map((subject) => {
        const selectedClassLabels = subject.classLinks
          .filter((link) => formField.classIds.includes(link.id))
          .map((link) => link.label);

        return {
          value: subject.value,
          label: selectedClassLabels.length
            ? `${subject.label} (${selectedClassLabels.join(", ")})`
            : subject.label,
        };
      });
  }, [formField.classIds, hierarchy.subjects]);

  const unitOptions = React.useMemo(() => {
    if (!formField.subjectIds.length) {
      return [];
    }

    return hierarchy.units
      .filter((unit) =>
        unit.subjectLinks.some((link) =>
          formField.subjectIds.includes(link.id),
        ),
      )
      .map((unit) => {
        const selectedSubjectLabels = unit.subjectLinks
          .filter((link) => formField.subjectIds.includes(link.id))
          .map((link) => link.label);

        return {
          value: unit.value,
          label: selectedSubjectLabels.length
            ? `${unit.label} (${selectedSubjectLabels.join(", ")})`
            : unit.label,
        };
      });
  }, [formField.subjectIds, hierarchy.units]);

  const topicOptions = React.useMemo(() => {
    if (!formField.unitIds.length) {
      return [];
    }

    return hierarchy.topics
      .filter((topic) =>
        topic.unitLinks.some((link) => formField.unitIds.includes(link.id)),
      )
      .map((topic) => ({
        value: topic.value,
        label: topic.label,
      }));
  }, [formField.unitIds, hierarchy.topics]);

  React.useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      setFetching(true);
      setTopicsLoading(true);
      setError("");

      try {
        const topicsResponse = await getAssessmentCatalog();
        if (!isMounted) {
          return;
        }
        setTopicSource(resolveTopicsList(topicsResponse));
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message = err?.message || "Failed to load hierarchy options.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setTopicsLoading(false);
        }
      }

      if (!isEditMode) {
        if (isMounted && fallbackStateAssessment) {
          const fallbackData = resolveAssessmentData(fallbackStateAssessment);
          if (fallbackData) {
            setFormField((prev) => ({
              ...prev,
              ...buildFormFromAssessment(fallbackData),
            }));
            setSelectedQuestions(normalizeSelectedQuestions(fallbackData));
          }
        }
        if (isMounted) {
          setFetching(false);
        }
        return;
      }

      try {
        const response = await getAssessmentById(assessmentId);
        if (!isMounted) {
          return;
        }

        const data = resolveAssessmentData(response);
        if (!data) {
          throw new Error("Assessment data is empty.");
        }

        setFormField((prev) => ({ ...prev, ...buildFormFromAssessment(data) }));
        setSelectedQuestions(normalizeSelectedQuestions(data));
      } catch (err) {
        if (!isMounted) {
          return;
        }

        if (fallbackStateAssessment) {
          const fallbackData = resolveAssessmentData(fallbackStateAssessment);
          if (fallbackData) {
            setFormField((prev) => ({
              ...prev,
              ...buildFormFromAssessment(fallbackData),
            }));
            setSelectedQuestions(normalizeSelectedQuestions(fallbackData));
          }
        } else {
          const message =
            err?.message || "Failed to load assessment for editing.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (isMounted) {
          setFetching(false);
        }
      }
    };

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, [assessmentId, fallbackStateAssessment, isEditMode]);

  React.useEffect(() => {
    setFormField((prev) => {
      if (!prev.classIds.length) {
        if (
          !prev.subjectIds.length &&
          !prev.unitIds.length &&
          !prev.topicIds.length
        ) {
          return prev;
        }
        return {
          ...prev,
          subjectIds: [],
          unitIds: [],
          topicIds: [],
        };
      }

      const nextSubjectIds = prev.subjectIds.filter((subjectId) =>
        hierarchy.subjects.some(
          (subject) =>
            subject.value === subjectId &&
            subject.classLinks.some((link) => prev.classIds.includes(link.id)),
        ),
      );

      if (arraysEqual(nextSubjectIds, prev.subjectIds)) {
        return prev;
      }

      return {
        ...prev,
        subjectIds: nextSubjectIds,
      };
    });
  }, [formField.classIds, hierarchy.subjects]);

  React.useEffect(() => {
    setFormField((prev) => {
      if (!prev.subjectIds.length) {
        if (!prev.unitIds.length && !prev.topicIds.length) {
          return prev;
        }
        return {
          ...prev,
          unitIds: [],
          topicIds: [],
        };
      }

      const nextUnitIds = prev.unitIds.filter((unitId) =>
        hierarchy.units.some(
          (unit) =>
            unit.value === unitId &&
            unit.subjectLinks.some((link) => prev.subjectIds.includes(link.id)),
        ),
      );

      if (arraysEqual(nextUnitIds, prev.unitIds)) {
        return prev;
      }

      return {
        ...prev,
        unitIds: nextUnitIds,
      };
    });
  }, [formField.subjectIds, hierarchy.units]);

  React.useEffect(() => {
    setFormField((prev) => {
      if (!prev.unitIds.length) {
        if (!prev.topicIds.length) {
          return prev;
        }
        return {
          ...prev,
          topicIds: [],
        };
      }

      const nextTopicIds = prev.topicIds.filter((topicId) =>
        hierarchy.topics.some(
          (topic) =>
            topic.value === topicId &&
            topic.unitLinks.some((link) => prev.unitIds.includes(link.id)),
        ),
      );

      if (arraysEqual(nextTopicIds, prev.topicIds)) {
        return prev;
      }

      return {
        ...prev,
        topicIds: nextTopicIds,
      };
    });
  }, [formField.unitIds, hierarchy.topics]);

  React.useEffect(() => {
    if (!formField.topicIds.length) {
      setAvailableQuestions([]);
      return;
    }

    let isMounted = true;

    const fetchQuestions = async () => {
      setQuestionLoading(true);
      try {
        const response = await getAssessmentQuestions({
          class_ids: toNumberArray(formField.classIds),
          subject_ids: toNumberArray(formField.subjectIds),
          unit_ids: toNumberArray(formField.unitIds),
          topic_ids: toNumberArray(formField.topicIds),
          per_page: 500,
        });

        if (!isMounted) {
          return;
        }

        const rows = resolveQuestionRows(response)
          .map((row) => normalizeQuestionRow(row))
          .filter(Boolean);

        setAvailableQuestions(rows);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        const message = err?.message || "Failed to load assessment questions.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setQuestionLoading(false);
        }
      }
    };

    fetchQuestions();

    return () => {
      isMounted = false;
    };
  }, [
    formField.classIds,
    formField.subjectIds,
    formField.unitIds,
    formField.topicIds,
  ]);

  React.useEffect(() => {
    if (!availableQuestions.length) {
      return;
    }

    setSelectedQuestions((prev) =>
      prev.map((selected) => {
        const matched = availableQuestions.find(
          (question) => question.id === selected.id,
        );
        return matched ? matched : selected;
      }),
    );
  }, [availableQuestions]);

  const selectedQuestionIds = React.useMemo(
    () => selectedQuestions.map((question) => question.id),
    [selectedQuestions],
  );
  const selectedQuestionSet = React.useMemo(
    () => new Set(selectedQuestionIds),
    [selectedQuestionIds],
  );

  const availableQuestionFilterOptions = React.useMemo(
    () => ({
      unit_labels: buildQuestionFilterOptions(availableQuestions, "unitLabel"),
      topic_labels: buildQuestionFilterOptions(
        availableQuestions,
        "topicLabel",
      ),
      question_types: buildQuestionFilterOptions(
        availableQuestions,
        "questionType",
      ),
    }),
    [availableQuestions],
  );

  const availableFilterSchema = React.useMemo(
    () => createQuestionFilterSchema(availableQuestionFilterOptions),
    [availableQuestionFilterOptions],
  );

  React.useEffect(() => {
    setAvailableFilterDraft((prev) => {
      const next = sanitizeQuestionFilterState(prev, availableFilterSchema);
      return areFilterStatesEqual(prev, next) ? prev : next;
    });

    setAppliedAvailableFilters((prev) => {
      const next = sanitizeQuestionFilterState(prev, availableFilterSchema);
      return areFilterStatesEqual(prev, next) ? prev : next;
    });
  }, [availableFilterSchema]);

  const filteredAvailableQuestions = React.useMemo(
    () => applyQuestionFilters(availableQuestions, appliedAvailableFilters),
    [availableQuestions, appliedAvailableFilters],
  );

  const availablePagination = React.useMemo(
    () =>
      paginateRows(
        filteredAvailableQuestions,
        availableCurrentPage,
        availableRowsPerPage,
      ),
    [filteredAvailableQuestions, availableCurrentPage, availableRowsPerPage],
  );
  const selectedPagination = React.useMemo(
    () =>
      paginateRows(
        selectedQuestions,
        selectedCurrentPage,
        selectedRowsPerPage,
      ),
    [selectedQuestions, selectedCurrentPage, selectedRowsPerPage],
  );

  React.useEffect(() => {
    if (availableCurrentPage !== availablePagination.currentPage) {
      setAvailableCurrentPage(availablePagination.currentPage);
    }
  }, [availableCurrentPage, availablePagination.currentPage]);

  React.useEffect(() => {
    if (selectedCurrentPage !== selectedPagination.currentPage) {
      setSelectedCurrentPage(selectedPagination.currentPage);
    }
  }, [selectedCurrentPage, selectedPagination.currentPage]);

  const hasActiveAvailableFilters = React.useMemo(
    () => Object.keys(buildFilterParams(appliedAvailableFilters)).length > 0,
    [appliedAvailableFilters],
  );

  const handleAvailableRowsPerPageChange = (value) => {
    setAvailableRowsPerPage(value);
    setAvailableCurrentPage(1);
  };

  const handleSelectedRowsPerPageChange = (value) => {
    setSelectedRowsPerPage(value);
    setSelectedCurrentPage(1);
  };

  const handleApplyAvailableFilters = () => {
    setAppliedAvailableFilters({ ...availableFilterDraft });
    setAvailableCurrentPage(1);
  };

  const handleResetAvailableFilters = () => {
    const resetState = buildFilterStateFromSchema(availableFilterSchema);
    setAvailableFilterDraft(resetState);
    setAppliedAvailableFilters(resetState);
    setAvailableCurrentPage(1);
  };

  const handleTextFieldChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddQuestion = (question) => {
    setSelectedQuestions((prev) => {
      if (prev.some((item) => item.id === question.id)) {
        return prev;
      }
      return [...prev, question];
    });
  };

  const handleRemoveQuestion = (questionId) => {
    setSelectedQuestions((prev) =>
      prev.filter((question) => question.id !== questionId),
    );
  };

  const buildPayload = () => {
    const title = formField.title.trim();
    if (!title) {
      throw new Error("Assessment title is required.");
    }

    const durationMinutes = Number(formField.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new Error("Duration must be a positive number.");
    }

    if (!formField.startMode) {
      throw new Error("Please select a start mode.");
    }

    if (
      formField.startMode === "start_at_or_after" &&
      !String(formField.startAt).trim()
    ) {
      throw new Error("Start date/time is required for selected start mode.");
    }

    if (!formField.submissionMode) {
      throw new Error("Please select a submission mode.");
    }

    if (
      formField.submissionMode === "submit_by" &&
      !String(formField.submitBy).trim()
    ) {
      throw new Error(
        "Submit by date/time is required for selected submission mode.",
      );
    }

    if (!["immediate", "later"].includes(formField.resultPublishMode)) {
      throw new Error("Please select a valid result publish mode.");
    }

    const resultPublishAt =
      formField.resultPublishMode === "later"
        ? toApiDateTime(formField.resultPublishAt)
        : null;
    if (formField.resultPublishMode === "later" && !resultPublishAt) {
      throw new Error(
        "Result publish date/time is required when publish mode is later.",
      );
    }

    if (
      !["true", "false"].includes(
        String(formField.showAttemptsToStudents).toLowerCase(),
      )
    ) {
      throw new Error("Please select whether attempts should be shown.");
    }

    if (!formField.classIds.length) {
      throw new Error("Please select at least one class.");
    }

    if (!formField.subjectIds.length) {
      throw new Error("Please select at least one subject.");
    }

    if (!formField.unitIds.length) {
      throw new Error("Please select at least one unit.");
    }

    if (!formField.topicIds.length) {
      throw new Error("Please select at least one topic.");
    }

    if (!selectedQuestionIds.length) {
      throw new Error("Please add at least one question to the assessment.");
    }

    return {
      title,
      start_mode: formField.startMode,
      start_at:
        formField.startMode === "start_at_or_after"
          ? toApiDateTime(formField.startAt)
          : null,
      duration_minutes: durationMinutes,
      submission_mode: formField.submissionMode,
      submit_by:
        formField.submissionMode === "submit_by"
          ? toApiDateTime(formField.submitBy)
          : null,
      result_publish_mode: formField.resultPublishMode,
      ...(formField.resultPublishMode === "later"
        ? { result_publish_at: resultPublishAt }
        : {}),
      show_attempts_to_students:
        String(formField.showAttemptsToStudents).toLowerCase() === "true",
      class_ids: toNumberArray(formField.classIds),
      subject_ids: toNumberArray(formField.subjectIds),
      unit_ids: toNumberArray(formField.unitIds),
      topic_ids: toNumberArray(formField.topicIds),
      question_ids: toNumberArray(selectedQuestionIds),
    };
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
          : "Unable to prepare assessment payload.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setLoading(true);

      if (isEditMode) {
        await updateAssessmentById(assessmentId, payload);
        toast.success("Assessment updated successfully.");
      } else {
        await addAssessment(payload);
        toast.success("Assessment created successfully.");
      }

      navigate(`${basePath}/assessment-lists`);
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${
          isEditMode ? "update" : "create"
        } assessment. Please try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{headerTitle}</h4>
          <h1>{isEditMode ? "Update Assessment" : "Create Assessment"}</h1>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <form onSubmit={handleSubmit}>
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
                    Assessment Title <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="title"
                    value={formField.title}
                    onChange={handleTextFieldChange}
                    placeholder="Enter assessment title"
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Clock3 size={16} />
                    Duration (Minutes) <span>*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    name="durationMinutes"
                    value={formField.durationMinutes}
                    onChange={handleTextFieldChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Clock3 size={16} />
                    Start Mode <span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="startMode"
                    value={formField.startMode}
                    onChange={handleTextFieldChange}
                    disabled={loading}
                  >
                    <option value="any_time">Any Time</option>
                    <option value="start_at_or_after">Start At Or After</option>
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Clock3 size={16} />
                    Start At
                    {formField.startMode === "start_at_or_after" && (
                      <span>*</span>
                    )}
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    name="startAt"
                    value={formField.startAt}
                    onChange={handleTextFieldChange}
                    disabled={
                      loading || formField.startMode !== "start_at_or_after"
                    }
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Clock3 size={16} />
                    Submission Mode <span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="submissionMode"
                    value={formField.submissionMode}
                    onChange={handleTextFieldChange}
                    disabled={loading}
                  >
                    <option value="no_deadline">No Deadline</option>
                    <option value="submit_by">Submit By</option>
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Clock3 size={16} />
                    Submit By
                    {formField.submissionMode === "submit_by" && <span>*</span>}
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    name="submitBy"
                    value={formField.submitBy}
                    onChange={handleTextFieldChange}
                    disabled={
                      loading || formField.submissionMode !== "submit_by"
                    }
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Clock3 size={16} />
                    Result Publish Mode <span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="resultPublishMode"
                    value={formField.resultPublishMode}
                    onChange={handleTextFieldChange}
                    disabled={loading}
                  >
                    <option value="immediate">Immediate</option>
                    <option value="later">Later</option>
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Clock3 size={16} />
                    Result Publish At
                    {formField.resultPublishMode === "later" && <span>*</span>}
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    name="resultPublishAt"
                    value={formField.resultPublishAt}
                    onChange={handleTextFieldChange}
                    disabled={loading || formField.resultPublishMode !== "later"}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Eye size={16} />
                    Show Attempts To Students <span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="showAttemptsToStudents"
                    value={formField.showAttemptsToStudents}
                    onChange={handleTextFieldChange}
                    disabled={loading}
                  >
                    <option value="true">Show</option>
                    <option value="false">Hide</option>
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Book size={16} />
                    Classes <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={classOptions}
                    selectedValues={formField.classIds}
                    multiple={true}
                    onChange={(value) =>
                      setFormField((prev) => ({ ...prev, classIds: value }))
                    }
                    placeholder={
                      classOptions.length
                        ? "Search classes..."
                        : "No classes available"
                    }
                    loading={topicsLoading}
                    disabled={loading || topicsLoading}
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
                    Subjects <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={subjectOptions}
                    selectedValues={formField.subjectIds}
                    multiple={true}
                    onChange={(value) =>
                      setFormField((prev) => ({ ...prev, subjectIds: value }))
                    }
                    placeholder={
                      !formField.classIds.length
                        ? "Select classes first"
                        : subjectOptions.length
                          ? "Search subjects..."
                          : "No subjects available"
                    }
                    loading={topicsLoading}
                    disabled={
                      loading || topicsLoading || !formField.classIds.length
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
                    Units <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={unitOptions}
                    selectedValues={formField.unitIds}
                    multiple={true}
                    onChange={(value) =>
                      setFormField((prev) => ({ ...prev, unitIds: value }))
                    }
                    placeholder={
                      !formField.subjectIds.length
                        ? "Select subjects first"
                        : unitOptions.length
                          ? "Search units..."
                          : "No units available"
                    }
                    loading={topicsLoading}
                    disabled={
                      loading || topicsLoading || !formField.subjectIds.length
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
                    selectedValues={formField.topicIds}
                    multiple={true}
                    onChange={(value) =>
                      setFormField((prev) => ({ ...prev, topicIds: value }))
                    }
                    placeholder={
                      !formField.unitIds.length
                        ? "Select units first"
                        : topicOptions.length
                          ? "Search topics..."
                          : "No topics available"
                    }
                    loading={topicsLoading}
                    disabled={
                      loading || topicsLoading || !formField.unitIds.length
                    }
                    emptyState={
                      topicsLoading
                        ? "Loading topics..."
                        : "No topics available"
                    }
                  />
                </div>

                <section className="question-section w-full">
                  <header className="question-section-header">
                    <h3 className="!mb-0">Available Questions</h3>
                    <p className="mb-2">
                      Questions are fetched automatically after selecting
                      topics.
                    </p>
                  </header>

                  {!formField.topicIds.length ? (
                    <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500 bg-white">
                      Select one or more topics to load assessment questions.
                    </div>
                  ) : (
                    <>
                      <FilterBar
                        schema={availableFilterSchema}
                        filters={availableFilterDraft}
                        setFilters={setAvailableFilterDraft}
                        onApply={handleApplyAvailableFilters}
                        onReset={handleResetAvailableFilters}
                        loading={questionLoading}
                        disabled={loading}
                      />

                      <div className="rounded-md border border-slate-200">
                        <ListToolbar
                          showSearch={false}
                          rowsPerPage={availableRowsPerPage}
                          onRowsPerPageChange={handleAvailableRowsPerPageChange}
                          currentPage={availablePagination.currentPage}
                          totalPages={availablePagination.totalPages}
                          totalItems={availablePagination.totalItems}
                          from={availablePagination.from}
                          to={availablePagination.to}
                          onPageChange={setAvailableCurrentPage}
                          disabled={loading || questionLoading}
                          loading={questionLoading}
                        />

                        <div className="max-h-[340px] overflow-y-auto">
                          <Table className="global-table table-fixed">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead className="!whitespace-normal">
                                  Unit
                                </TableHead>
                                <TableHead className="!whitespace-normal">
                                  Topic
                                </TableHead>
                                <TableHead className="!whitespace-normal">
                                  Type
                                </TableHead>
                                <TableHead className="!whitespace-normal">
                                  Question
                                </TableHead>
                                <TableHead className="w-[90px]">
                                  Detail
                                </TableHead>
                                <TableHead className="w-[80px]">
                                  Action
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="bg-white">
                              {questionLoading ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={7}
                                    className="py-6 text-center"
                                  >
                                    <div className="flex items-center justify-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span>Loading questions...</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : availablePagination.data.length === 0 ? (
                                <TableRow>
                                  <TableCell
                                    colSpan={7}
                                    className="py-6 text-center"
                                  >
                                    {hasActiveAvailableFilters
                                      ? "No questions match your filters."
                                      : "No questions found for selected topics."}
                                  </TableCell>
                                </TableRow>
                              ) : (
                                availablePagination.data.map(
                                  (question, index) => (
                                    <TableRow key={question.id}>
                                      <TableCell>
                                        {availablePagination.from + index}
                                      </TableCell>
                                      <TableCell className="!whitespace-normal">
                                        {question.unitLabel}
                                      </TableCell>
                                      <TableCell className="!whitespace-normal">
                                        {question.topicLabel}
                                      </TableCell>
                                      <TableCell className="!whitespace-normal">
                                        {question.questionType}
                                      </TableCell>
                                      <TableCell className="!whitespace-normal">
                                        {question.questionText}
                                      </TableCell>
                                      <TableCell>
                                        <Link
                                          className="view-btn inline-flex !w-[38px]"
                                          to={`${basePath}/view-assessment-question-detail/${question.id}`}
                                          state={{
                                            questionId: question.id,
                                            question: question.raw,
                                          }}
                                        >
                                          <Eye size={15} />
                                        </Link>
                                      </TableCell>
                                      <TableCell>
                                        <button
                                          type="button"
                                          className="global-btn secondary !px-2 !py-1"
                                          onClick={() =>
                                            handleAddQuestion(question)
                                          }
                                          disabled={
                                            loading ||
                                            selectedQuestionSet.has(question.id)
                                          }
                                          title={
                                            selectedQuestionSet.has(question.id)
                                              ? "Already selected"
                                              : "Add question"
                                          }
                                        >
                                          {selectedQuestionSet.has(
                                            question.id,
                                          ) ? (
                                            <Check size={14} />
                                          ) : (
                                            <Plus size={14} />
                                          )}
                                        </button>
                                      </TableCell>
                                    </TableRow>
                                  ),
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </>
                  )}
                </section>

                <section className="question-section w-full">
                  <header className="question-section-header">
                    <h3 className="!mb-0">
                      Selected Questions ({selectedQuestionIds.length})
                    </h3>
                    <p className="mb-2">
                      Click remove to exclude a question from this assessment.
                    </p>
                  </header>

                  <div className="rounded-md border border-slate-200">
                    <ListToolbar
                      showSearch={false}
                      rowsPerPage={selectedRowsPerPage}
                      onRowsPerPageChange={handleSelectedRowsPerPageChange}
                      currentPage={selectedPagination.currentPage}
                      totalPages={selectedPagination.totalPages}
                      totalItems={selectedPagination.totalItems}
                      from={selectedPagination.from}
                      to={selectedPagination.to}
                      onPageChange={setSelectedCurrentPage}
                      disabled={loading}
                      loading={loading}
                    />

                    <div className="max-h-[340px] overflow-y-auto">
                      <Table className="global-table table-fixed">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead className="!whitespace-normal">
                              Unit
                            </TableHead>
                            <TableHead className="!whitespace-normal">
                              Topic
                            </TableHead>
                            <TableHead className="!whitespace-normal">
                              Type
                            </TableHead>
                            <TableHead className="!whitespace-normal">
                              Question
                            </TableHead>
                            <TableHead className="w-[90px]">Detail</TableHead>
                            <TableHead className="w-[80px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                          {selectedPagination.data.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="py-6 text-center"
                              >
                                No questions selected yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedPagination.data.map((question, index) => (
                              <TableRow key={question.id}>
                                <TableCell>
                                  {selectedPagination.from + index}
                                </TableCell>

                                <TableCell className="!whitespace-normal">
                                  {question.unitLabel}
                                </TableCell>
                                <TableCell className="!whitespace-normal">
                                  {question.topicLabel}
                                </TableCell>
                                <TableCell className="!whitespace-normal">
                                  {question.questionType}
                                </TableCell>
                                <TableCell className="!whitespace-normal">
                                  {question.questionText}
                                </TableCell>
                                <TableCell>
                                  <Link
                                    className="view-btn inline-flex !w-[38px]"
                                    to={`${basePath}/view-assessment-question-detail/${question.id}`}
                                    state={{
                                      questionId: question.id,
                                      question: question.raw,
                                    }}
                                  >
                                    <Eye size={15} />
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <button
                                    type="button"
                                    className="delete-btn-append !mt-0 !h-[30px]"
                                    onClick={() =>
                                      handleRemoveQuestion(question.id)
                                    }
                                    disabled={loading}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </section>
              </div>

              <div className="form-button-row">
                <button
                  type="button"
                  className="global-btn secondary flex items-center justify-center gap-1"
                  onClick={() => navigate(-1)}
                >
                  <X size={18} />
                  Cancel
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
                      Update Assessment
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Create Assessment
                      <Save size={18} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
};

export default AssessmentForm;
