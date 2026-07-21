import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getAllPastAssessments,
  getStudentAssessmentResult,
} from "@/api/assessmentApi";
import { AlertCircleIcon, Loader2 } from "lucide-react";

const asArray = (value) => (Array.isArray(value) ? value : []);

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const createStudentAssessmentFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search assessment title...",
  },
  {
    key: "assessment_ids",
    type: "multiselect",
    label: "Assessment",
    options: asArray(options?.assessment ?? options?.assessment_ids),
    placeholder: "Select assessment",
  },
  {
    key: "result_status",
    type: "multiselect",
    label: "Result Status",
    options: asArray(options?.result_status),
    placeholder: "Select status",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

const toBool = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["true", "1", "yes"].includes(normalized);
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized =
    raw.includes("T") || raw.endsWith("Z") ? raw : raw.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value) => {
  const date = toDate(value);
  return date ? format(date, "MMM dd, yyyy - hh:mm a") : "-";
};

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${parsed.toFixed(parsed % 1 === 0 ? 0 : 2)}%`;
};

const formatResultStatus = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return "-";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const resolvePaginatedPayload = (response) => {
  const rootPayload = response ?? {};
  const rootData =
    rootPayload?.data && typeof rootPayload.data === "object"
      ? rootPayload.data
      : null;

  const isPageContainer = (value) =>
    value &&
    typeof value === "object" &&
    (value?.current_page !== undefined ||
      value?.last_page !== undefined ||
      Array.isArray(value?.data));

  let pageContainer = isPageContainer(rootData)
    ? rootData
    : isPageContainer(rootPayload)
      ? rootPayload
      : rootPayload;

  if (
    pageContainer?.data &&
    typeof pageContainer.data === "object" &&
    !Array.isArray(pageContainer.data) &&
    isPageContainer(pageContainer.data)
  ) {
    pageContainer = pageContainer.data;
  }

  const pageData = Array.isArray(pageContainer?.data)
    ? pageContainer.data
    : Array.isArray(pageContainer)
      ? pageContainer
      : [];

  const responseFilters =
    rootPayload?.filters ?? rootData?.filters ?? pageContainer?.filters;
  const responseFilterOptions =
    responseFilters?.options ??
    responseFilters?.filter_options ??
    rootPayload?.filter_options ??
    rootData?.filter_options ??
    pageContainer?.filter_options ??
    {};
  const responseAppliedFilters =
    responseFilters?.applied ??
    responseFilters?.applied_filters ??
    rootPayload?.applied_filters ??
    rootData?.applied_filters ??
    pageContainer?.applied_filters ??
    {};

  return {
    pageContainer,
    pageData,
    responseFilterOptions,
    responseAppliedFilters,
  };
};

const formatStartMode = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) return "-";
  if (normalized === "any_time") return "Any Time";
  if (normalized === "scheduled") return "Scheduled";
  return normalized
    .split("_")
    .filter(Boolean)
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(" ");
};

const buildAssessmentRouteState = (row) => ({
  assessment_id: row?.assessment_id ?? row?.id,
  title: row?.assessment_title ?? row?.title ?? row?.name ?? "Past Assessment",
  questions_count:
    row?.questions_count ?? row?.total_questions ?? row?.question_count,
  duration_minutes: row?.duration_minutes ?? row?.durationMinutes,
  submission_mode: row?.submission_mode ?? row?.submissionMode,
  submit_by: row?.submit_by ?? row?.submitBy,
  start_mode: row?.start_mode ?? row?.startMode,
  start_at: row?.start_at ?? row?.startAt,
  can_practice: row?.can_practice,
  has_submitted_main_attempt: row?.has_submitted_main_attempt,
  is_expired: row?.is_expired,
  can_attempt: row?.can_attempt,
});

const AssessmentTable = ({
  records,
  loading,
  error,
  hasActiveFilters,
  baseRowNumber,
  isPastView,
}) => {
  const columnCount = isPastView ? 8 : 8;

  return (
    <>
      {error && (
        <Alert variant="destructive" className="alert-custom mb-4">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      <Table className="global-table table-fixed table-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead className="!whitespace-normal">
              {isPastView ? "Title" : "Assessment"}
            </TableHead>
            {isPastView ? (
              <>
                <TableHead>Start Mode</TableHead>
                <TableHead className="!whitespace-normal">Submit By</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </>
            ) : (
              <>
                <TableHead>Score</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead>Wrong</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="!whitespace-normal">
                  Submitted At
                </TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="py-6 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading data, please wait...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="py-6 text-center">
                {hasActiveFilters
                  ? "No assessment results match your filters."
                  : isPastView
                    ? "No past assessments available."
                    : "No assessment results available."}
              </TableCell>
            </TableRow>
          ) : (
            records.map((row, index) => {
              if (isPastView) {
                const assessmentId = row?.assessment_id ?? row?.id;
                const canPractice = toBool(row?.can_practice);
                const mainAttemptSubmitted = toBool(
                  row?.has_submitted_main_attempt,
                );
                const isExpired = toBool(row?.is_expired);
                const submitBy = formatDateTime(
                  row?.submit_by ?? row?.submitBy,
                );
                const startMode = formatStartMode(
                  row?.start_mode ?? row?.startMode,
                );
                const statusLabel = !mainAttemptSubmitted
                  ? "Main Attempt Pending"
                  : isExpired
                    ? "Expired"
                    : canPractice
                      ? "Available"
                      : "Unavailable";
                const statusClass = !mainAttemptSubmitted
                  ? "bg-amber-100 text-amber-800"
                  : isExpired
                    ? "bg-slate-200 text-slate-700"
                    : canPractice
                      ? "bg-green-100 text-green-800"
                      : "bg-rose-100 text-rose-800";

                return (
                  <TableRow
                    key={row?.assessment_id ?? row?.id ?? `assessment-${index}`}
                  >
                    <TableCell className="font-medium">
                      {baseRowNumber + index}
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      {row?.title || row?.name || "Untitled Assessment"}
                    </TableCell>
                    <TableCell>{startMode}</TableCell>
                    <TableCell className="!whitespace-normal">
                      {submitBy}
                    </TableCell>
                    <TableCell>
                      {Number(
                        row?.duration_minutes ?? row?.durationMinutes ?? 0,
                      )}{" "}
                      min
                    </TableCell>
                    <TableCell>
                      {Number(
                        row?.questions_count ??
                          row?.total_questions ??
                          row?.question_count ??
                          0,
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      {canPractice &&
                      assessmentId !== undefined &&
                      assessmentId !== null ? (
                        <Link
                          to={`/student/challenge/assessment/${assessmentId}/starter/past`}
                          state={{ assessment: buildAssessmentRouteState(row) }}
                          className="text-[14px] text-blue-600 underline transition"
                        >
                          Start Assessment
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Not available
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              }

              const canShowMetrics = isPastView || toBool(row?.can_view_result);
              const percentage = Number(row?.percentage ?? 0);
              const resultStatus = formatResultStatus(row?.result_status);

              return (
                <TableRow
                  key={
                    row?.attempt_id ??
                    row?.practice_session_id ??
                    row?.assessment_id ??
                    row?.id ??
                    `assessment-${index}`
                  }
                >
                  <TableCell className="font-medium">
                    {baseRowNumber + index}
                  </TableCell>
                  <TableCell className="!whitespace-normal">
                    {row?.assessment_title ||
                      row?.title ||
                      row?.name ||
                      "Untitled Assessment"}
                  </TableCell>
                  <TableCell>
                    {canShowMetrics
                      ? `${Number(row?.score ?? 0)}/${Number(
                          row?.total_marks ??
                            row?.total_questions ??
                            row?.questions_count ??
                            0,
                        )}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {canShowMetrics
                      ? Number(row?.correct_answers ?? row?.correct ?? 0)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {canShowMetrics
                      ? Number(row?.wrong_answers ?? row?.wrong ?? 0)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {canShowMetrics ? formatPercent(percentage) : "-"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        resultStatus.toLowerCase() === "released" ||
                        resultStatus.toLowerCase() === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {resultStatus}
                    </span>
                  </TableCell>
                  <TableCell className="!whitespace-normal">
                    {formatDateTime(
                      row?.submitted_at ??
                        row?.completed_at ??
                        row?.attempted_at ??
                        row?.created_at,
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </>
  );
};

const AssessmentStudentResult = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPastView = location.pathname.toLowerCase().endsWith("/past");
  const initialFilterSchema = React.useMemo(
    () => createStudentAssessmentFilterSchema({}),
    [],
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
  const hasHydratedFiltersRef = React.useRef(false);

  const filterSchema = React.useMemo(
    () => createStudentAssessmentFilterSchema(filterOptions),
    [filterOptions],
  );

  React.useEffect(() => {
    hasHydratedFiltersRef.current = false;
    const defaults = buildFilterStateFromSchema(initialFilterSchema);
    setRecords([]);
    setPagination({ ...DEFAULT_PAGINATION });
    setLoading(false);
    setError("");
    setFilterOptions({});
    setFilterDraft(defaults);
    setAppliedFilters(defaults);
    setCurrentPage(1);
    setRowsPerPage(10);
  }, [initialFilterSchema, isPastView]);

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
    let isMounted = true;

    const fetchAssessmentResults = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {
          page: currentPage,
          per_page: rowsPerPage,
        };
        Object.assign(params, buildFilterParams(appliedFilters));

        const response = isPastView
          ? await getAllPastAssessments(params)
          : await getStudentAssessmentResult(params);

        if (!isMounted) {
          return;
        }

        const {
          pageContainer,
          pageData,
          responseFilterOptions,
          responseAppliedFilters,
        } = resolvePaginatedPayload(response);

        setRecords(pageData);
        setFilterOptions((prev) => {
          const previousSerialized = JSON.stringify(prev ?? {});
          const nextSerialized = JSON.stringify(responseFilterOptions ?? {});
          return previousSerialized === nextSerialized
            ? prev
            : responseFilterOptions;
        });

        if (!hasHydratedFiltersRef.current) {
          const schemaFromApi = createStudentAssessmentFilterSchema(
            responseFilterOptions,
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
          pageContainer?.current_page ?? params.page ?? 1,
        );
        const resolvedPerPage = Number(
          pageContainer?.per_page ?? params.per_page ?? 10,
        );
        const resolvedTotal = Number(pageContainer?.total ?? pageData.length);
        const resolvedLast = Number(pageContainer?.last_page ?? 1);
        const resolvedFrom =
          Number(pageContainer?.from) ||
          (pageData.length ? (resolvedCurrent - 1) * resolvedPerPage + 1 : 0);
        const resolvedTo =
          Number(pageContainer?.to) ||
          (pageData.length ? resolvedFrom + pageData.length - 1 : 0);

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
          err?.message ||
          `Failed to load ${
            isPastView ? "past assessments" : "assessment results"
          }. Please try again.`;
        setError(message);
        setRecords([]);
        setPagination({ ...DEFAULT_PAGINATION });
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAssessmentResults();

    return () => {
      isMounted = false;
    };
  }, [appliedFilters, currentPage, isPastView, rowsPerPage]);

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasActiveFilters = React.useMemo(
    () => Object.keys(buildFilterParams(appliedFilters)).length > 0,
    [appliedFilters],
  );
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;

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

  return (
    <div className="space-y-6 pl-7">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assessment
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Assessments</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isPastView
              ? "Review earlier assessments and launch a past assessment session."
              : "View your submitted assessment attempts and released results."}
          </p>
        </div>

        <Tabs
          value={isPastView ? "past" : "results"}
          onValueChange={(value) =>
            navigate(
              value === "past"
                ? "/student/assessmentResult/past"
                : "/student/assessmentResult",
            )
          }
          className="gap-4"
        >
          <TabsList>
            <TabsTrigger value="results">Current Assessments</TabsTrigger>
            <TabsTrigger value="past">Past Assessment</TabsTrigger>
          </TabsList>

          <TabsContent value={isPastView ? "past" : "results"} className="m-0">
            <FilterBar
              schema={filterSchema}
              filters={filterDraft}
              setFilters={setFilterDraft}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
              loading={loading}
            />

            <section className="dashboard-body-card mt-4">
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

              <AssessmentTable
                records={records}
                loading={loading}
                error={error}
                hasActiveFilters={hasActiveFilters}
                baseRowNumber={baseRowNumber}
                isPastView={isPastView}
              />
            </section>
          </TabsContent>
        </Tabs>
      </header>
    </div>
  );
};

export default AssessmentStudentResult;
