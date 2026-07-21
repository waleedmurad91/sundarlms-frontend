import React from "react";
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
  Loader2,
  PlusCircleIcon,
} from "lucide-react";
import { AdminActionLink, AdminDeleteGuard } from "@/components/admin/AdminActionControls";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import FilterBar from "@/components/filter/FilterBar";
import {
  deleteAssessmentById,
  getAllPaginatedAssessment,
} from "@/api/assessmentApi";
import { createAssessmentListFilterSchema } from "@/config/filterSchemas";
import {
  buildFilterParams,
  buildFilterStateFromSchema,
} from "@/lib/applyFilters";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const getAssessmentId = (assessment) =>
  assessment?._id ??
  assessment?.id ??
  assessment?.assessment_id ??
  assessment?.assessmentId ??
  assessment?.test_id ??
  assessment?.testId ??
  null;

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

const getQuestionCount = (row) => {
  const explicitCount = Number(
    row?.question_count ?? row?.questions_count ?? row?.total_questions,
  );
  if (Number.isFinite(explicitCount) && explicitCount >= 0) {
    return explicitCount;
  }

  const questionIds = Array.isArray(row?.question_ids)
    ? row.question_ids
    : Array.isArray(row?.questionIds)
      ? row.questionIds
      : [];
  if (questionIds.length) {
    return questionIds.length;
  }

  if (Array.isArray(row?.questions)) {
    return row.questions.length;
  }

  return 0;
};

const normalizeModeLabel = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return "-";
  }
  if (normalized === "no_deadline") {
    return "No deadline";
  }
  if (normalized === "submit_by") {
    return "Submit by";
  }
  if (normalized === "start_at_or_after") {
    return "Start at / after";
  }
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const renderStartInfo = (row) => {
  const mode = String(row?.start_mode ?? row?.startMode ?? "")
    .toLowerCase()
    .trim();
  const startAt = row?.start_at ?? row?.startAt;

  if (!mode && !startAt) {
    return "-";
  }

  if (mode === "start_at_or_after") {
    return (
      <div className="!whitespace-normal">
        <div className="font-medium text-sm">Start at / after</div>
        <div className="text-xs text-slate-500">{formatDateTime(startAt)}</div>
      </div>
    );
  }

  if (startAt) {
    return formatDateTime(startAt);
  }

  return normalizeModeLabel(mode);
};

const renderSubmissionInfo = (row) => {
  const mode = String(row?.submission_mode ?? row?.submissionMode ?? "")
    .toLowerCase()
    .trim();
  const submitBy = row?.submit_by ?? row?.submitBy;

  if (!mode) {
    return "-";
  }

  if (mode === "no_deadline") {
    return (
      <span className="inline-flex rounded-[25px] bg-slate-100 px-3 py-1 text-[11px] text-slate-700">
        No deadline
      </span>
    );
  }

  if (mode === "submit_by") {
    return (
      <div className="!whitespace-normal">
        <div className="font-medium text-sm">Submit by</div>
        <div className="text-xs text-slate-500">{formatDateTime(submitBy)}</div>
      </div>
    );
  }

  return normalizeModeLabel(mode);
};

const AssessmentList = ({ variant = "admin" }) => {
  const initialFilterSchema = React.useMemo(
    () => createAssessmentListFilterSchema({}),
    [],
  );
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [filterOptions, setFilterOptions] = React.useState({});

  const [refreshKey, setRefreshKey] = React.useState(0);
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
    () => createAssessmentListFilterSchema(filterOptions),
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
        Object.assign(params, buildFilterParams(appliedFilters));

        const response = await getAllPaginatedAssessment(params);
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

        const responseFilters =
          pageContainer?.filters ??
          rootPayload?.filters ??
          rootData?.filters ??
          {};
        const responseFilterOptions =
          responseFilters?.options ??
          responseFilters?.filter_options ??
          pageContainer?.filter_options ??
          rootPayload?.filter_options ??
          rootData?.filter_options ??
          (responseFilters?.class ||
          responseFilters?.subject ||
          responseFilters?.unit ||
          responseFilters?.topic
            ? responseFilters
            : {});
        const responseAppliedFilters =
          responseFilters?.applied ??
          responseFilters?.applied_filters ??
          pageContainer?.applied_filters ??
          rootPayload?.applied_filters ??
          rootData?.applied_filters ??
          {};

        setFilterOptions((prev) => {
          const previousSerialized = JSON.stringify(prev ?? {});
          const nextSerialized = JSON.stringify(responseFilterOptions ?? {});
          return previousSerialized === nextSerialized
            ? prev
            : responseFilterOptions;
        });

        if (!hasHydratedFiltersRef.current) {
          const schemaFromApi = createAssessmentListFilterSchema(
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
        if (!isMounted) return;
        const message =
          err?.message || "Failed to load assessments. Please try again.";
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
  }, [currentPage, rowsPerPage, appliedFilters, variant]);

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

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasActiveFilters = React.useMemo(
    () => Object.keys(buildFilterParams(appliedFilters)).length > 0,
    [appliedFilters],
  );
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;

  const isDataEntry = variant === "data_entry";
  const isReviewer = variant === "reviewer";
  const basePath = isDataEntry
    ? "/data-entry"
    : isReviewer
      ? "/reviewer"
      : "/admin";
  const dashboardTitle = isDataEntry
    ? "Data Entry Dashboard"
    : isReviewer
      ? "Reviewer Dashboard"
      : "Admin Dashboard";

  const confirmDelete = async (id) => {
    try {
      await deleteAssessmentById(id);
      toast.success("Assessment deleted successfully.");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      const message =
        error?.message || "Failed to delete assessment. Please try again.";
      toast.error(message);
      console.error("Delete error:", error);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{dashboardTitle}</h4>
          <h1>Assessment Lists</h1>
        </div>
        {!isReviewer && (
          <div className="dh-right">
            <AdminActionLink
              module="assessments"
              action="create"
              to={`${basePath}/add-new-assessment`}
              className="global-btn"
            >
              Create New Assessment <PlusCircleIcon size={15} />
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

        <Table className="global-table table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead className="!whitespace-normal">Title</TableHead>
              <TableHead className="!whitespace-normal">Questions</TableHead>
              <TableHead className="!whitespace-normal">Start</TableHead>
              <TableHead className="!whitespace-normal">Duration</TableHead>
              <TableHead className="!whitespace-normal">Submission</TableHead>
              <TableHead className="!whitespace-normal">Created At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center">
                  {hasActiveFilters
                    ? "No assessments match your filters."
                    : "No assessments available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => {
                const assessmentId = getAssessmentId(row);
                const duration = Number(
                  row?.duration_minutes ?? row?.durationMinutes,
                );
                const hasDuration = Number.isFinite(duration) && duration >= 0;

                return (
                  <TableRow key={assessmentId ?? index}>
                    <TableCell className="font-medium">
                      {baseRowNumber + index}
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      {row?.title || "Untitled Assessment"}
                    </TableCell>
                    <TableCell>{getQuestionCount(row)}</TableCell>
                    <TableCell className="!whitespace-normal">
                      {renderStartInfo(row)}
                    </TableCell>
                    <TableCell>
                      {hasDuration ? `${duration} min` : "-"}
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      {renderSubmissionInfo(row)}
                    </TableCell>
                    <TableCell className="!whitespace-normal">
                      {formatDateTime(row?.created_at ?? row?.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="table-actions">
                        <Tooltip>
                          <TooltipTrigger>
                            <AdminActionLink
                              className="view-btn"
                              to={`${basePath}/view-assessment-detail/${assessmentId}`}
                              state={{
                                assessmentId,
                                assessment: row,
                              }}
                            >
                              <Eye size={15} />
                            </AdminActionLink>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isReviewer ? "Review" : "View"}</p>
                          </TooltipContent>
                        </Tooltip>
                        {!isReviewer && assessmentId ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AdminActionLink
                                className="edit-btn"
                                to={`${basePath}/add-new-assessment/${assessmentId}`}
                                state={{
                                  assessmentId,
                                  assessment: row,
                                }}
                              >
                                <Edit size={15} />
                              </AdminActionLink>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                        <AdminDeleteGuard>
                      <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <button type="button" className="delete-btn">
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
                                permanently delete this record and remove your
                                data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => confirmDelete(assessmentId)}
                              >
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </AdminDeleteGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default AssessmentList;

