import React from "react";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircleIcon,
  Delete,
  Edit,
  Eye,
  Info,
  Loader2,
  PlusCircleIcon,
} from "lucide-react";
import {
  AdminActionLink,
  AdminDeleteGuard,
} from "@/components/admin/AdminActionControls";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { ALGEBRA_FORMATS, serializeAlgebraValues } from "@/utils/algebraFormat";
import {
  deleteQuestionById,
  getAllPaginatedQuestions,
  getAllPaginatedQuestionsDataEntry,
  getAllPaginatedQuestionsReviewer,
  getAllPaginatedQuestionsTranslator,
  swapOrderingQuestionsById,
} from "@/api/questionApi";
import ListToolbar from "@/components/ListToolbar";
import FilterBar from "@/components/filter/FilterBar";
import { createQuestionFilterSchema } from "@/config/filterSchemas";
import {
  buildFilterParams,
  buildFilterStateFromSchema,
} from "@/lib/applyFilters";

/** Map UI translation filters to API language/status params. */
const buildQuestionTranslationFilterParams = (filters = {}) => {
  const params = buildFilterParams(filters);
  const selected = Array.isArray(params.translation_status)
    ? params.translation_status
    : params.translation_status
      ? [params.translation_status]
      : [];

  if (!selected.length) {
    return params;
  }

  const urduStatuses = new Set();
  const sindhiStatuses = new Set();
  const overallStatuses = [];

  selected.forEach((value) => {
    const normalized = String(value ?? "").toLowerCase();
    if (normalized === "pending_urdu_translation") {
      urduStatuses.add("pending_translation");
      return;
    }
    if (normalized === "pending_sindhi_translation") {
      sindhiStatuses.add("pending_translation");
      return;
    }
    if (normalized === "pending_urdu_review") {
      urduStatuses.add("pending_review");
      return;
    }
    if (normalized === "pending_sindhi_review") {
      sindhiStatuses.add("pending_review");
      return;
    }
    if (normalized === "urdu_approved") {
      urduStatuses.add("approved");
      return;
    }
    if (normalized === "sindhi_approved") {
      sindhiStatuses.add("approved");
      return;
    }
    if (normalized === "urdu_rejected") {
      urduStatuses.add("rejected");
      return;
    }
    if (normalized === "sindhi_rejected") {
      sindhiStatuses.add("rejected");
      return;
    }
    overallStatuses.push(value);
  });

  delete params.translation_status;

  if (overallStatuses.length) {
    params.translation_status = overallStatuses;
  }
  if (urduStatuses.size) {
    params.urdu_translation_status = Array.from(urduStatuses);
  }
  if (sindhiStatuses.size) {
    params.sindhi_translation_status = Array.from(sindhiStatuses);
  }

  return params;
};

const decodeHtml = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  if (typeof window === "undefined") {
    return value;
  }
  const textarea = window.document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const getQuestionId = (question) =>
  question?._id ??
  question?.id ??
  question?.question_id ??
  question?.question?.id ??
  question?.question?._id ??
  question?.user?.id ??
  null;

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
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
        !(typeof entry === "string" && String(entry).trim() === ""),
    );
    if (first !== undefined) {
      return first;
    }
  }
  return value;
};

const renderLatex = (input) => {
  if (!input) {
    return "";
  }
  return input.replace(
    /\$\$([^$]+?)\$\$|\$([^$]+?)\$/g,
    (match, blockExpr, inlineExpr) => {
      const expression = blockExpr ?? inlineExpr;
      const displayMode = Boolean(blockExpr);
      try {
        return katex.renderToString(expression, {
          throwOnError: false,
          displayMode,
          strict: "warn",
        });
      } catch (error) {
        console.warn("KaTeX render error:", error);
        return match;
      }
    },
  );
};

const resolveMediaUrl = (value) => {
  if (!value) {
    return "";
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }

  const base = import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? "";
  return `${base}${trimmed}`;
};

const getQuestionHtml = (html) => {
  const decoded = decodeHtml(html);
  const sanitized = DOMPurify.sanitize(decoded, {
    USE_PROFILES: { html: true },
  });
  return renderLatex(sanitized);
};

const getQuestionPreviewText = (html) => {
  const decoded = decodeHtml(html);
  const sanitized = DOMPurify.sanitize(decoded, {
    USE_PROFILES: { html: true },
  });
  return sanitized
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const TopicCell = ({ label }) => {
  const resolvedLabel = label || "Untitled Topic";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help min-w-0">
          <span className="truncate text-sm block max-w-[200px]">
            {resolvedLabel}
          </span>
          <Info size={14} className="text-gray-500 flex-shrink-0" />
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-pre-wrap break-words">
        {resolvedLabel}
      </TooltipContent>
    </Tooltip>
  );
};

const QuestionCell = ({ html }) => {
  const previewText = getQuestionPreviewText(html);
  const sanitizedHtml = getQuestionHtml(html);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help min-w-0">
          <span className="truncate text-sm block max-w-[360px]">
            {previewText || "Untitled Question"}
          </span>
          <Info size={14} className="text-gray-500 flex-shrink-0" />
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-lg whitespace-pre-wrap break-words">
        <div
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: sanitizedHtml || "Untitled Question",
          }}
        />
      </TooltipContent>
    </Tooltip>
  );
};

const renderCorrectAnswers = (row) => {
  const answersRaw = Array.isArray(row?.correct_answers)
    ? row.correct_answers
    : row?.correct_answers
      ? [row.correct_answers]
      : [];

  if (row?.question_type === "drag_drop") {
    const schema = row?.question_schema ?? row?.questionSchema ?? {};
    const rawLabels =
      row?.drag_drop_labels ??
      row?.dragDropLabels ??
      schema?.drag_drop_labels ??
      schema?.dragDropLabels ??
      [];
    const labels = Array.isArray(rawLabels) ? rawLabels : [];
    const labelMap = new Map(
      labels.map((label, index) => [
        String(
          label?.id ?? label?.label_id ?? label?.labelId ?? `label-${index}`,
        ),
        label?.text ?? label?.label ?? label?.name ?? "",
      ]),
    );
    const resolvedAnswers = answersRaw
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          const key = String(entry ?? "").trim();
          return labelMap.get(key) ?? key;
        }
        const labelId =
          entry?.label_id ??
          entry?.labelId ??
          entry?.value ??
          entry?.label?.id ??
          entry?.label?.label_id ??
          entry?.label?.labelId ??
          "";
        const key = String(labelId ?? "").trim();
        return labelMap.get(key) ?? key;
      })
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

    if (!resolvedAnswers.length) {
      return "-";
    }

    return (
      <div className="flex flex-wrap gap-1 text-sm">
        {resolvedAnswers.map((answer, index) => (
          <span
            key={`${answer}-${index}`}
            className="inline-flex items-center rounded bg-gray-100 px-2 py-1"
          >
            {answer}
          </span>
        ))}
      </div>
    );
  }

  const answers = answersRaw
    .map((entry) => normalizeCorrectAnswerValue(entry))
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);

  if (!answers.length) {
    return "-";
  }

  if (row?.question_type === "algebra") {
    const correctFormatKey =
      row?.correct_format ?? row?.correctFormat ?? row?.algebra_correct_format;
    const normalizedKey = String(correctFormatKey ?? "").toLowerCase();
    const formatLabel =
      ALGEBRA_FORMATS.find((format) => format.key === normalizedKey)?.label ??
      "Algebra";
    const displayValue = normalizedKey
      ? serializeAlgebraValues(normalizedKey, answers)
      : answers.join(", ");
    return (
      <div className="flex flex-wrap gap-1 text-sm">
        <span className="inline-flex items-center rounded bg-gray-100 px-2 py-1">
          {formatLabel}: {displayValue}
        </span>
      </div>
    );
  }

  const options = Array.isArray(row?.options) ? row.options : [];
  const optionMap = new Map();
  options.forEach((option) => {
    const identifiers = [
      option?.id,
      option?.option_id,
      option?.optionId,
      option?.value,
    ]
      .map((value) =>
        value !== undefined && value !== null ? String(value) : null,
      )
      .filter(Boolean);
    identifiers.forEach((identifier) => {
      if (!optionMap.has(identifier)) {
        optionMap.set(identifier, option);
      }
    });
  });

  const findOption = (value) => {
    const normalized = normalizeCorrectAnswerValue(value);
    const idKey = String(normalized ?? "").trim();
    if (optionMap.has(idKey)) {
      return optionMap.get(idKey);
    }

    const decodedValue = decodeHtml(idKey);
    if (!decodedValue) {
      return null;
    }

    return (
      options.find(
        (option) =>
          decodeHtml(String(option?.text ?? "")).trim() === decodedValue ||
          decodeHtml(
            String(option?.image ?? option?.image_url ?? ""),
          ).trim() === decodedValue,
      ) ?? null
    );
  };

  return (
    <div className="flex flex-wrap gap-1 text-sm">
      {answers.map((answer, index) => {
        const option = findOption(answer);
        const isImage =
          option?.is_image === true ||
          option?.is_image === "1" ||
          option?.is_image === 1 ||
          Boolean(option?.image) ||
          Boolean(option?.image_url);

        if (isImage) {
          const rawSrc =
            option?.image ??
            option?.image_url ??
            option?.imagePath ??
            decodeHtml(String(answer));
          const src = resolveMediaUrl(decodeHtml(String(rawSrc ?? "")));
          if (!src) {
            return null;
          }
          return (
            <img
              key={`${src}-${index}`}
              src={src}
              alt={`Correct option ${index + 1}`}
              className="h-10 w-10 rounded border object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          );
        }

        const rawText =
          option?.text ??
          option?.label ??
          option?.value ??
          decodeHtml(String(answer));
        const rendered = renderLatex(
          DOMPurify.sanitize(decodeHtml(String(rawText ?? ""))),
        );
        return (
          <span
            key={`${answer}-${index}`}
            className="inline-flex items-center rounded bg-gray-100 px-2 py-1"
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        );
      })}
    </div>
  );
};

const QuestionList = ({ variant = "admin" }) => {
  const filterRole =
    variant === "reviewer"
      ? "reviewer"
      : variant === "translator"
        ? "translator"
        : variant === "data_entry"
          ? "data_entry"
          : "admin";

  const initialFilterSchema = React.useMemo(
    () => createQuestionFilterSchema({}, { role: filterRole }),
    [filterRole],
  );
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [filterOptions, setFilterOptions] = React.useState({});
  const [filterDraft, setFilterDraft] = React.useState(() =>
    buildFilterStateFromSchema(initialFilterSchema),
  );
  const [appliedFilters, setAppliedFilters] = React.useState(() =>
    buildFilterStateFromSchema(initialFilterSchema),
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [dragSourceIndex, setDragSourceIndex] = React.useState(null);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);
  const hasHydratedFiltersRef = React.useRef(false);

  const filterSchema = React.useMemo(
    () => createQuestionFilterSchema(filterOptions, { role: filterRole }),
    [filterOptions, filterRole],
  );

  React.useEffect(() => {
    const defaults = buildFilterStateFromSchema(filterSchema);
    const isSameValue = (left, right) => {
      if (Array.isArray(left) || Array.isArray(right)) {
        const leftArray = Array.isArray(left) ? left : [];
        const rightArray = Array.isArray(right) ? right : [];
        if (leftArray.length !== rightArray.length) {
          return false;
        }
        return leftArray.every((value, index) => value === rightArray[index]);
      }
      return (left ?? "") === (right ?? "");
    };

    const mergeBySchema = (previous) =>
      Object.keys(defaults).reduce((acc, key) => {
        acc[key] = previous?.[key] ?? defaults[key];
        return acc;
      }, {});

    setFilterDraft((prev) => {
      const next = mergeBySchema(prev);
      const unchanged = Object.keys(defaults).every((key) =>
        isSameValue(prev?.[key], next[key]),
      );
      return unchanged ? prev : next;
    });
    setAppliedFilters((prev) => {
      const next = mergeBySchema(prev);
      const unchanged = Object.keys(defaults).every((key) =>
        isSameValue(prev?.[key], next[key]),
      );
      return unchanged ? prev : next;
    });
  }, [filterSchema]);

  React.useEffect(() => {
    hasHydratedFiltersRef.current = false;
  }, [variant]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          page: currentPage,
          per_page: rowsPerPage,
        };
        Object.assign(
          params,
          buildQuestionTranslationFilterParams(appliedFilters),
        );

        const fetcher =
          variant === "data_entry"
            ? getAllPaginatedQuestionsDataEntry
            : variant === "reviewer"
              ? getAllPaginatedQuestionsReviewer
              : variant === "translator"
                ? getAllPaginatedQuestionsTranslator
                : getAllPaginatedQuestions;
        const response = await fetcher(params);
        if (!isMounted) {
          return;
        }

        const rootPayload = response ?? {};
        const rootData =
          rootPayload?.data && typeof rootPayload.data === "object"
            ? rootPayload.data
            : null;

        let payload =
          rootData &&
          (rootData?.current_page !== undefined ||
            rootData?.last_page !== undefined ||
            Array.isArray(rootData?.data))
            ? rootData
            : rootPayload;

        if (
          payload?.data &&
          typeof payload.data === "object" &&
          !Array.isArray(payload.data) &&
          (payload.data?.current_page !== undefined ||
            payload.data?.last_page !== undefined ||
            Array.isArray(payload.data?.data))
        ) {
          payload = payload.data;
        }

        const pageData = Array.isArray(payload?.data) ? payload.data : [];
        const responseFilters =
          payload?.filters ?? rootPayload?.filters ?? rootData?.filters ?? {};
        const responseFilterOptions =
          responseFilters?.options ??
          responseFilters?.filter_options ??
          (responseFilters?.status ||
          responseFilters?.translation_status ||
          responseFilters?.urdu_translation_status ||
          responseFilters?.sindhi_translation_status ||
          responseFilters?.question_type ||
          responseFilters?.question_category ||
          responseFilters?.topic ||
          responseFilters?.unit ||
          responseFilters?.subject ||
          responseFilters?.grade
            ? responseFilters
            : {});
        const responseAppliedFilters =
          responseFilters?.applied ??
          responseFilters?.applied_filters ??
          payload?.applied_filters ??
          {};

        setFilterOptions((prev) => {
          const previousSerialized = JSON.stringify(prev ?? {});
          const nextSerialized = JSON.stringify(responseFilterOptions ?? {});
          return previousSerialized === nextSerialized
            ? prev
            : responseFilterOptions;
        });
        if (!hasHydratedFiltersRef.current) {
          const schemaFromApi = createQuestionFilterSchema(
            responseFilterOptions,
            { role: filterRole },
          );
          const initialFiltersFromApi = buildFilterStateFromSchema(
            schemaFromApi,
            responseAppliedFilters,
          );
          setFilterDraft(initialFiltersFromApi);
          setAppliedFilters(initialFiltersFromApi);
          hasHydratedFiltersRef.current = true;
        }

        const resolvedCurrent = Number(
          payload?.current_page ?? params.page ?? 1,
        );
        const resolvedPerPage = Number(
          payload?.per_page ?? params.per_page ?? 10,
        );
        const resolvedTotal = Number(payload?.total ?? pageData.length);
        const resolvedLast = Number(
          payload?.last_page ??
            Math.max(1, Math.ceil(resolvedTotal / resolvedPerPage)),
        );
        const resolvedFrom =
          Number(payload?.from) ||
          (pageData.length ? (resolvedCurrent - 1) * resolvedPerPage + 1 : 0);
        const resolvedTo =
          Number(payload?.to) ||
          (pageData.length ? resolvedFrom + pageData.length - 1 : 0);

        setRecords(pageData);
        setPagination({
          current_page: resolvedCurrent,
          last_page: resolvedLast,
          per_page: resolvedPerPage,
          total: resolvedTotal,
          from: resolvedFrom,
          to: resolvedTo,
        });

        if (currentPage !== resolvedCurrent) {
          setCurrentPage(resolvedCurrent);
        }

        if (rowsPerPage !== resolvedPerPage) {
          setRowsPerPage(resolvedPerPage);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err?.message || "Failed to load questions. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentPage, rowsPerPage, appliedFilters, refreshKey, variant]);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    if (
      filterDraft.date_from &&
      filterDraft.date_to &&
      new Date(filterDraft.date_from) > new Date(filterDraft.date_to)
    ) {
      toast.error("From Date cannot be later than To Date.");
      return;
    }

    setAppliedFilters({ ...filterDraft });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    const resetState = buildFilterStateFromSchema(filterSchema);
    setFilterDraft(resetState);
    setAppliedFilters(resetState);
    setCurrentPage(1);
  };

  const confirmDelete = async (id) => {
    try {
      await deleteQuestionById(id);
      toast.success("Question deleted successfully.");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      const message =
        error?.message || "Failed to delete question. Please try again.";
      toast.error(message);
      console.error("Delete error:", error);
    }
  };

  const handleDragStart = (index) => (event) => {
    setDragSourceIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (targetIndex) => {
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) {
      setDragSourceIndex(null);
      setDragOverIndex(null);
      return;
    }
    const sourceQuestion = records[dragSourceIndex];
    const targetQuestion = records[targetIndex];
    const firstQuestionId = getQuestionId(sourceQuestion);
    const secondQuestionId = getQuestionId(targetQuestion);
    if (!firstQuestionId || !secondQuestionId) {
      setDragSourceIndex(null);
      setDragOverIndex(null);
      return;
    }

    const previousRecords = records;
    const nextRecords = [...previousRecords];
    [nextRecords[dragSourceIndex], nextRecords[targetIndex]] = [
      nextRecords[targetIndex],
      nextRecords[dragSourceIndex],
    ];
    setRecords(nextRecords);
    setDragSourceIndex(null);
    setDragOverIndex(null);

    try {
      await swapOrderingQuestionsById({
        first_question_id: firstQuestionId,
        second_question_id: secondQuestionId,
      });
      toast.success("Question order updated.");
    } catch (error) {
      const message =
        error?.message || "Failed to update question order. Please try again.";
      setRecords(previousRecords);
      toast.error(message);
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasActiveFilters = React.useMemo(
    () =>
      Object.keys(buildQuestionTranslationFilterParams(appliedFilters)).length >
      0,
    [appliedFilters],
  );
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;
  const isDataEntry = variant === "data_entry";
  const isReviewer = variant === "reviewer";
  const isTranslator = variant === "translator";
  const isViewOnly = isReviewer;
  const canEdit = !isReviewer;
  const canDelete = !isReviewer && !isTranslator;
  const canAddNew = !isReviewer && !isTranslator;
  const basePath = isDataEntry
    ? "/data-entry"
    : isReviewer
      ? "/reviewer"
      : isTranslator
        ? "/translator"
        : "/admin";
  const dashboardTitle = isDataEntry
    ? "Data Entry Dashboard"
    : isReviewer
      ? "Reviewer Dashboard"
      : isTranslator
        ? "Translator Dashboard"
        : "Admin Dashboard";
  const renderStatus = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "draft") {
      return (
        <span className="bg-[#F3E8FF] rounded-[25px] text-[11px] text-[#BB7DF9] py-1 px-3">
          Draft
        </span>
      );
    }
    if (normalized === "pending_translation") {
      return (
        <span className="bg-sky-100 rounded-[25px] text-[11px] text-sky-700 py-1 px-3 capitalize">
          Pending Translation
        </span>
      );
    }
    if (normalized === "pending_review") {
      return (
        <span className="bg-[#FDF9C2] rounded-[25px] text-[11px] text-[#DBB256] py-1 px-3 capitalize">
          Pending Review
        </span>
      );
    }
    if (normalized === "rejected") {
      return (
        <span className="bg-rose-100 rounded-[25px] text-[11px] text-rose-700 py-1 px-3 capitalize">
          Rejected
        </span>
      );
    }
    if (normalized === "approved" || normalized === "published") {
      return (
        <span className="bg-[#DCFCE6] rounded-[25px] text-[11px] text-[#1FC55C] py-1 px-3 capitalize">
          {normalized === "approved" ? "Approved" : "Published"}
        </span>
      );
    }
    return (
      <span className="bg-slate-200 rounded-[25px] text-[11px] text-slate-700 py-1 px-3 capitalize">
        {status || "—"}
      </span>
    );
  };

  const getRowTranslationStatuses = (row) => {
    const urdu =
      row?.urdu_translation_status ??
      row?.translation_statuses?.urdu ??
      row?.translationStatuses?.urdu ??
      null;
    const sindhi =
      row?.sindhi_translation_status ??
      row?.translation_statuses?.sindhi ??
      row?.translationStatuses?.sindhi ??
      null;
    const overall = row?.translation_status ?? row?.translationStatus ?? null;

    return { urdu, sindhi, overall };
  };

  const renderTranslationBadge = (language, status) => {
    const normalized = String(status || "").toLowerCase();
    if (!normalized) return null;

    const languageLabel =
      language === "urdu" ? "Urdu" : language === "sindhi" ? "Sindhi" : "";

    let label = status;
    let className =
      "bg-slate-200 rounded-[25px] text-[11px] text-slate-700 py-1 px-3";

    if (normalized === "pending_translation") {
      label = languageLabel
        ? `Pending for ${languageLabel} Translation`
        : "Pending Translation";
      className =
        "bg-sky-100 rounded-[25px] text-[11px] text-sky-700 py-1 px-3";
    } else if (normalized === "pending_review") {
      label = languageLabel
        ? `Pending for ${languageLabel} Review`
        : "Pending Review";
      className =
        "bg-[#FDF9C2] rounded-[25px] text-[11px] text-[#DBB256] py-1 px-3";
    } else if (normalized === "rejected") {
      label = languageLabel ? `${languageLabel} Rejected` : "Rejected";
      className =
        "bg-rose-100 rounded-[25px] text-[11px] text-rose-700 py-1 px-3";
    } else if (normalized === "approved") {
      label = languageLabel ? `${languageLabel} Approved` : "Approved";
      className =
        "bg-[#DCFCE6] rounded-[25px] text-[11px] text-[#1FC55C] py-1 px-3";
    }

    return <span className={className}>{label}</span>;
  };

  const renderTranslationStatus = (row) => {
    const { urdu, sindhi, overall } = getRowTranslationStatuses(row);

    const badges = [];

    if (urdu) {
      badges.push(
        <React.Fragment key="urdu">
          {renderTranslationBadge("urdu", urdu)}
        </React.Fragment>,
      );
    }

    if (sindhi) {
      badges.push(
        <React.Fragment key="sindhi">
          {renderTranslationBadge("sindhi", sindhi)}
        </React.Fragment>,
      );
    }

    if (!badges.length && overall) {
      badges.push(
        <React.Fragment key="overall">
          {renderTranslationBadge(null, overall)}
        </React.Fragment>,
      );
    }

    if (!badges.length) {
      return <span className="text-xs text-slate-400">—</span>;
    }

    return <div className="flex flex-col gap-1.5 items-start">{badges}</div>;
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{dashboardTitle}</h4>
          <h1>Question Lists</h1>
        </div>
        {canAddNew && (
          <div className="dh-right">
            <AdminActionLink
              module="questions"
              action="create"
              to={`${basePath}/add-new-question`}
              className="global-btn"
            >
              Add New Question <PlusCircleIcon size={15} />
            </AdminActionLink>
          </div>
        )}
      </div>

      <FilterBar
        schema={filterSchema}
        filters={filterDraft}
        setFilters={setFilterDraft}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        loading={loading}
      />

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          showSearch={false}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          from={pagination.from}
          to={pagination.to}
          onPageChange={setCurrentPage}
          disabled={loading}
          loading={loading}
        />
        {error && (
          <Alert variant="destructive" className="alert-custom">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
        <div className="overflow-x-auto">
          <Table className="global-table w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="min-w-[120px]">QID</TableHead>
                <TableHead className="min-w-[150px] !whitespace-normal">
                  Topic
                </TableHead>
                <TableHead className="min-w-[150px] !whitespace-normal">
                  Question Type
                </TableHead>
                <TableHead className="min-w-[200px] !whitespace-normal">
                  Question?
                </TableHead>
                <TableHead className="min-w-[200px] !whitespace-normal">
                  Answer
                </TableHead>
                <TableHead className="min-w-[120px] !whitespace-normal">
                  Question Status
                </TableHead>
                <TableHead className="min-w-[150px] !whitespace-normal">
                  Translation Status
                </TableHead>
                <TableHead className="min-w-[150px] !whitespace-normal">
                  Created At
                </TableHead>
                <TableHead className="min-w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-6">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" />
                      <span>Loading data, please wait...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-6">
                    {hasActiveFilters
                      ? "No questions match your filters."
                      : "No questions available."}
                  </TableCell>
                </TableRow>
              ) : (
                records.map((row, index) => (
                  <TableRow
                    key={getQuestionId(row) ?? index}
                    onDragOver={(event) => {
                      handleDragOver(event);
                      setDragOverIndex(index);
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={() => handleDrop(index)}
                    className={
                      dragOverIndex === index
                        ? "bg-slate-50 ring-1 ring-slate-200"
                        : undefined
                    }
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{baseRowNumber + index}</span>
                      </div>
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      {`${row?.topic?.unit?.subject?.grade?.id}-${row?.topic?.unit?.subject?.id}-${row?.topic?.unit?.id}-${row?.topic?.id}-${row?.id}`}
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      <TopicCell
                        label={
                          row?.topic?.topic_name ??
                          row?.topic_name ??
                          "Untitled Topic"
                        }
                      />
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      {row?.question_type === "mcq"
                        ? "Multiple Choice (Single Answer)"
                        : row?.question_type === "check_box"
                          ? "Multiple Choice (Multiple Answers)"
                          : row?.question_type === "fill_blank"
                            ? "Text Input"
                            : row?.question_type === "image_annotation"
                              ? "Image Annotation"
                              : row?.question_type === "algebra"
                                ? "Answer Format Selection"
                                : row?.question_type === "drag_drop"
                                  ? "Drag and Drop"
                                  : "Unknown"}
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      <QuestionCell html={row?.question_text} />
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      {renderCorrectAnswers(row)}
                    </TableCell>
                    <TableCell>{renderStatus(row?.status)}</TableCell>
                    <TableCell className="!whitespace-normal">
                      {renderTranslationStatus(row)}
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      {row?.created_at
                        ? format(
                            new Date(row.created_at),
                            "MMM dd, yyyy - hh:mm a",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="table-actions">
                        <Tooltip>
                          <TooltipTrigger>
                            <AdminActionLink
                              className="view-btn"
                              to={`${basePath}/view-question-detail/${
                                getQuestionId(row) ?? ""
                              }`}
                              state={{
                                questionId: getQuestionId(row),
                                question: row,
                              }}
                            >
                              <Eye size={15} />
                            </AdminActionLink>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isViewOnly ? "Review" : "View"}</p>
                          </TooltipContent>
                        </Tooltip>
                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AdminActionLink
                                className="edit-btn"
                                to={`${basePath}/add-new-question/${
                                  getQuestionId(row) ?? ""
                                }`}
                                state={{
                                  questionId: getQuestionId(row),
                                  question: row,
                                }}
                              >
                                <Edit size={15} />
                              </AdminActionLink>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <AdminDeleteGuard>
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="delete-btn"
                                    >
                                      <Delete size={15} />
                                    </button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete</p>
                                </TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you absolutely sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete this record and remove
                                    your data from our servers.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      confirmDelete(getQuestionId(row))
                                    }
                                  >
                                    Continue
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </AdminDeleteGuard>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default QuestionList;
