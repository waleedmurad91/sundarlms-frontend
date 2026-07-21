import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
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
import DemographicCard from "@/components/DemographicCard";
import {
  getAssessmentDetailById,
} from "@/api/assessmentApi";
import {
  AlertCircleIcon,
  CheckCircle,
  Globe,
  Loader2,
  User,
  Users,
  XCircle,
} from "lucide-react";

const asArray = (value) => (Array.isArray(value) ? value : []);
const normalizeId = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  if (["undefined", "null"].includes(normalized.toLowerCase())) {
    return "";
  }
  return normalized;
};
const DEFAULT_SUMMARY = {
  total_students: 0,
  attempted_students: 0,
  not_attempted_students: 0,
};
const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${parsed.toFixed(parsed % 1 === 0 ? 0 : 1)}%`;
};

const toBool = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes"].includes(normalized);
};

const createAssessmentResultFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search student, email, roll number...",
  },
  {
    key: "assessment_ids",
    type: "multiselect",
    label: "Assessment",
    options: asArray(options?.assessment ?? options?.assessment_ids),
    placeholder: "Select assessment",
  },
  {
    key: "school_ids",
    type: "multiselect",
    label: "School",
    options: asArray(options?.school ?? options?.school_ids),
    placeholder: "Select school",
  },
  {
    key: "grade_ids",
    type: "multiselect",
    label: "Grade",
    options: asArray(options?.grade ?? options?.grade_ids),
    placeholder: "Select grade",
  },
  {
    key: "student_ids",
    type: "multiselect",
    label: "Student",
    options: asArray(options?.student ?? options?.student_ids),
    placeholder: "Select student",
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

const renderProgressCell = (value, tone = "tone-avg") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  const clamped = Math.min(100, Math.max(0, Number(value)));
  return (
    <div className="overview-progress">
      <span className={`overview-progress__value text-${tone}`}>
        {formatPercent(clamped)}
      </span>
      <div className={`overview-progress__track ${tone}`}>
        <span
          className="overview-progress__fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

const AssessmentDetail = () => {
  const { id: paramsId } = useParams();
  const location = useLocation();

  const assessmentId = React.useMemo(() => {
    const idFromParams = normalizeId(paramsId);
    if (idFromParams) {
      return idFromParams;
    }

    return (
      normalizeId(location?.state?.assessmentId) ||
      normalizeId(location?.state?.assessment?.assessment_id) ||
      normalizeId(location?.state?.assessment?._id) ||
      normalizeId(location?.state?.assessment?.id) ||
      ""
    );
  }, [paramsId, location?.state]);

  const initialFilterSchema = React.useMemo(
    () => createAssessmentResultFilterSchema({}),
    [],
  );

  const [studentAttempts, setStudentAttempts] = React.useState([]);
  const [summary, setSummary] = React.useState(DEFAULT_SUMMARY);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [filterOptions, setFilterOptions] = React.useState({});
  const [filterDraft, setFilterDraft] = React.useState(() =>
    buildFilterStateFromSchema(initialFilterSchema),
  );
  const [appliedFilters, setAppliedFilters] = React.useState(() =>
    buildFilterStateFromSchema(initialFilterSchema),
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const hasHydratedFiltersRef = React.useRef(false);

  const filterSchema = React.useMemo(
    () => createAssessmentResultFilterSchema(filterOptions),
    [filterOptions],
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
  }, [assessmentId]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchAssessmentDetail = async () => {
      setLoading(true);
      setError("");

      try {
        if (!assessmentId) {
          throw new Error("Assessment id is missing.");
        }

        const params = {
          page: currentPage,
          per_page: rowsPerPage,
        };
        Object.assign(params, buildFilterParams(appliedFilters));

        // Always force URL/state resolved assessment id as the primary filter.
        params.assessment_ids = [String(assessmentId)];

        const response = await getAssessmentDetailById(assessmentId, params);
        if (!isMounted) {
          return;
        }

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

        const responseSummary =
          rootPayload?.summary ?? rootData?.summary ?? pageContainer?.summary;
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

        const normalizedSummary = {
          total_students: toNumber(responseSummary?.total_students, 0),
          attempted_students: toNumber(responseSummary?.attempted_students, 0),
          not_attempted_students: toNumber(
            responseSummary?.not_attempted_students,
            0,
          ),
        };

        setSummary(normalizedSummary);
        setStudentAttempts(pageData);

        setFilterOptions((prev) => {
          const previousSerialized = JSON.stringify(prev ?? {});
          const nextSerialized = JSON.stringify(responseFilterOptions ?? {});
          return previousSerialized === nextSerialized
            ? prev
            : responseFilterOptions;
        });

        if (!hasHydratedFiltersRef.current) {
          const schemaFromApi = createAssessmentResultFilterSchema(
            responseFilterOptions,
          );
          const initialFiltersFromApi = buildFilterStateFromSchema(
            schemaFromApi,
            responseAppliedFilters,
          );

          // Keep filters aligned with the active assessment id.
          initialFiltersFromApi.assessment_ids = [String(assessmentId)];

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
        const message = err?.message || "Unable to fetch assessment details.";
        if (isMounted) {
          setError(message);
          setStudentAttempts([]);
          setSummary(DEFAULT_SUMMARY);
          setPagination({ ...DEFAULT_PAGINATION });
        }
        toast.error(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAssessmentDetail();
    return () => {
      isMounted = false;
    };
  }, [currentPage, rowsPerPage, appliedFilters, assessmentId]);

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? studentAttempts.length;
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
    if (assessmentId) {
      resetState.assessment_ids = [String(assessmentId)];
    }
    setFilterDraft(resetState);
    setAppliedFilters(resetState);
    setCurrentPage(1);
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Assessment Detail</h1>
          <p className="text-slate-600 text-md">
            Comprehensive overview of assessment results and student
            performance.
          </p>
        </div>
        <div className="dh-right">
          <Link
            to="/admin/assessment-lists"
            className="global-btn secondary analytics-detail-back-link"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="dashboard-body">
        {error && (
          <Alert
            variant="destructive"
            className="alert-custom mb-4 bg-[#FDF7EC]"
          >
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {!error && (
          <>
            <section className="metrics-grid metrics-grid3 analytics-detail-metrics">
              <DemographicCard
                icon={<Users size={24} />}
                title="Total Students"
                classname="demoGreen card-sm"
                count={summary.total_students}
                subheading="Total enrolled students"
              />
              <DemographicCard
                icon={<CheckCircle size={24} />}
                title="Attempted"
                classname="demoSky card-sm"
                count={summary.attempted_students}
                subheading="Students who attempted"
              />
              <DemographicCard
                icon={<XCircle size={24} />}
                title="Not Attempted"
                classname="demoIndigo card-sm"
                count={summary.not_attempted_students}
                subheading="Students not attempted"
              />
            </section>

            <FilterBar
              schema={filterSchema}
              filters={filterDraft}
              setFilters={setFilterDraft}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
              loading={loading}
            />
            <section className="dashboard-body-card">
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
              <Table className="global-table analytics-progress-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead className="w-[20%]">Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Correct</TableHead>
                    <TableHead>Wrong</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-center py-8 text-slate-500"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading student results...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : studentAttempts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-center py-8 text-slate-500"
                      >
                        {hasActiveFilters
                          ? "No student results match your filters."
                          : "No student results available."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentAttempts.map((attempt, index) => (
                      <TableRow key={`attempt-${attempt.attempt_id || index}`}>
                        <TableCell className="font-medium">
                          {baseRowNumber + index}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User size={16} />
                            {attempt.student_name || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>{attempt.student_email || "-"}</TableCell>
                        <TableCell>{attempt.roll_number || "-"}</TableCell>
                        <TableCell>{attempt.grade_name || "-"}</TableCell>
                        <TableCell className="font-medium">
                          {attempt.score ?? 0}
                        </TableCell>
                        <TableCell>{attempt.total_marks ?? 0}</TableCell>
                        <TableCell>{attempt.correct_answers ?? 0}</TableCell>
                        <TableCell>{attempt.wrong_answers ?? 0}</TableCell>
                        <TableCell>
                          {renderProgressCell(
                            Number(attempt.percentage ?? 0),
                            Number(attempt.percentage ?? 0) >= 40
                              ? "tone-positive"
                              : "tone-negative",
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const percentage = Number(attempt.percentage ?? 0);
                            const isSubmitted = toBool(attempt.submitted);
                            const isPassed = percentage >= 40;
                            const statusClass = isSubmitted
                              ? isPassed
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800";
                            const statusLabel = isSubmitted
                              ? isPassed
                                ? "Passed"
                                : "Failed"
                              : "Not Submitted";

                            return (
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>
          </>
        )}
      </div>
    </>
  );
};

export default AssessmentDetail;
