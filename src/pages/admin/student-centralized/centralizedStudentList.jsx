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
  GraduationCap,
  Layers,
  Loader2,
  PlusCircleIcon,
  School,
} from "lucide-react";
import { AdminActionLink, AdminDeleteGuard } from "@/components/admin/AdminActionControls";
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
import {
  deleteCentralizedStudentById,
  getAllCentralizedStudents,
} from "@/api/studentCentralizedApi";
import ListToolbar from "@/components/ListToolbar";
import { getAllSchools } from "@/api/schoolApi";
import { getAllClasses } from "@/api/classApi";
import DemographicCard from "@/components/DemographicCard";
import { useAuthStore } from "@/store/auth";
import FilterBar from "@/components/filter/FilterBar";
import { createCentralizedStudentListFilterSchema } from "@/config/filterSchemas";
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

const getStudentId = (student) =>
  student?.id ??
  student?._id ??
  student?.registration_id ??
  student?.registrationId ??
  student?.student_id ??
  student?.studentId ??
  student?.user?.id;

const getStudentName = (student) =>
  student?.name ?? student?.student_name ?? student?.user?.name ?? "-";

const getStudentUsername = (student) =>
  student?.username ??
  student?.user?.username ??
  student?.formb_id ??
  student?.email ??
  student?.user?.email ??
  "-";

const getSchoolName = (student) =>
  student?.school?.display_name ??
  student?.school?.name ??
  student?.school_name ??
  student?.school ??
  "-";

const getSourceLabel = (student) => {
  const raw =
    student?.source ??
    student?.formType ??
    student?.form_type ??
    student?.registration_source ??
    "";
  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return "-";
  if (normalized === "open") return "Open";
  if (normalized === "pmc") return "PMC";
  if (normalized === "rmc") return "RMC";
  return normalized.toUpperCase();
};

const formatClassLabel = (student) => {
  const grade =
    student?.grade?.name ??
    student?.grade_name ??
    student?.grade?.grade ??
    student?.grade ??
    "";
  const section =
    student?.school_class?.section ??
    student?.section ??
    student?.class_section ??
    "";
  const gradeId = student?.grade_id ?? student?.grade?.id ?? "";
  const fallbackGrade = grade || (gradeId ? `Grade ${gradeId}` : "");
  const label = [fallbackGrade, section].filter(Boolean).join(" - ");
  return label || "-";
};

const CentralizedStudentList = () => {
  const initialFilterSchema = React.useMemo(
    () => createCentralizedStudentListFilterSchema({}),
    [],
  );
  const { role: storeRole, user } = useAuthStore();
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
  const hasHydratedFiltersRef = React.useRef(false);

  const [_totalSchools, setTotalSchools] = React.useState(0);
  const [_totalStudents, setTotalStudents] = React.useState(0);
  const [_totalClasses, setTotalClasses] = React.useState(0);
  const resolvedRoleValue = storeRole ?? user?.role;
  const normalizedRole =
    typeof resolvedRoleValue === "string"
      ? resolvedRoleValue.toLowerCase()
      : "admin";
  const isSchoolRole = normalizedRole === "school";
  const basePath = isSchoolRole ? "/school" : "/admin";
  const dashboardTitle = isSchoolRole ? "School Dashboard" : "Admin Dashboard";

  const filterSchema = React.useMemo(
    () => createCentralizedStudentListFilterSchema(filterOptions),
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
  }, []);

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

        const response = await getAllCentralizedStudents(params);
        if (!isMounted) {
          return;
        }

        const rootPayload = response ?? {};
        const rootData =
          rootPayload?.data && typeof rootPayload.data === "object"
            ? rootPayload.data
            : null;

        let pageContainer =
          rootData &&
          (rootData?.current_page !== undefined ||
            rootData?.last_page !== undefined ||
            Array.isArray(rootData?.data))
            ? rootData
            : rootPayload;

        if (
          pageContainer?.data &&
          typeof pageContainer.data === "object" &&
          !Array.isArray(pageContainer.data) &&
          (pageContainer.data?.current_page !== undefined ||
            pageContainer.data?.last_page !== undefined ||
            Array.isArray(pageContainer.data?.data))
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
          ([
            "source",
            "status",
            "rmc_participation",
            "has_rmc_record",
            "has_pmc_record",
          ].some((key) =>
            Object.prototype.hasOwnProperty.call(responseFilters ?? {}, key),
          )
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
          const schemaFromApi = createCentralizedStudentListFilterSchema(
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
        setTotalStudents(resolvedTotal);

        if (currentPage !== resolvedCurrent) {
          setCurrentPage(resolvedCurrent);
        }

        if (rowsPerPage !== resolvedPerPage) {
          setRowsPerPage(resolvedPerPage);
        }

        const summary =
          rootPayload?.summary ??
          rootData?.summary ??
          pageContainer?.summary ??
          null;
        if (summary) {
          const summarySchools = Number(
            summary?.total_schools ?? summary?.schools ?? 0,
          );
          const summaryClasses = Number(
            summary?.total_classes ?? summary?.classes ?? 0,
          );
          if (!Number.isNaN(summarySchools)) {
            setTotalSchools(summarySchools);
          }
          if (!Number.isNaN(summaryClasses)) {
            setTotalClasses(summaryClasses);
          }
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || "Failed to load students. Please try again.");
        toast.error(
          err?.message || "Failed to load students. Please try again.",
        );
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
  }, [currentPage, rowsPerPage, appliedFilters, refreshKey]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      // Keep the dashboard metrics populated if API summary is unavailable.
      try {
        const [schoolResponse, classResponse] = await Promise.all([
          getAllSchools(),
          getAllClasses(),
        ]);

        if (!isMounted) {
          return;
        }

        setTotalSchools((prev) =>
          prev > 0 ? prev : Number(schoolResponse?.length ?? 0),
        );
        setTotalClasses((prev) =>
          prev > 0
            ? prev
            : Number(
                classResponse?.data?.data?.total ??
                  classResponse?.data?.total ??
                  0,
              ),
        );
      } catch {
        // Keep silent; main list already reports errors.
      }
    };

    fetchCounts();

    return () => {
      isMounted = false;
    };
  }, []);

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
      await deleteCentralizedStudentById(id);
      setRefreshKey((prev) => prev + 1);
      toast.success("Student deleted successfully.");
    } catch (deleteError) {
      const message =
        deleteError?.message || "Failed to delete student. Please try again.";
      toast.error(message);
      console.error("Delete error:", deleteError);
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasActiveFilters = React.useMemo(
    () => Object.keys(buildFilterParams(appliedFilters)).length > 0,
    [appliedFilters],
  );
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{dashboardTitle}</h4>
          <h1>Student Lists</h1>
        </div>
        <div className="dh-right">
          <AdminActionLink
            module="students"
            action="create"
            to={`${basePath}/centralized-student-form`}
            className="global-btn"
          >
            Add New Student <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div>
      </div>
      {/* 
      <section className="metrics-grid metrics-grid3 mt-5 mb-6">
        <DemographicCard
          icon={<GraduationCap size={24} />}
          title="Students"
          classname="demoGreen"
          count={totalStudents}
          subheading="Future Innovators"
        />

        <DemographicCard
          icon={<School size={24} />}
          title="Schools"
          classname="demoIndigo"
          count={totalSchools}
          subheading="Partner Instituions"
        />

        <DemographicCard
          icon={<Layers size={24} />}
          title="Classes"
          classname="demoRed"
          count={totalClasses}
          subheading="Learning Environments"
        />
      </section> */}

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
        <Table className="global-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  {hasActiveFilters
                    ? "No students match your filters."
                    : "No students available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => {
                const rowId = getStudentId(row);
                const sourceLabel = getSourceLabel(row);
                return (
                  <TableRow key={rowId ?? index}>
                    <TableCell className="font-medium">
                      {baseRowNumber + index}
                    </TableCell>
                    <TableCell>{getStudentName(row)}</TableCell>
                    <TableCell>{getStudentUsername(row)}</TableCell>
                    <TableCell>{getSchoolName(row)}</TableCell>
                    <TableCell>{formatClassLabel(row)}</TableCell>
                    {/* <TableCell>
                      <span
                        className={`px-2 py-1 rounded-2xl text-xs ${sourceLabel == "open" ? "bg-blue-100 text-blue-700 border border-blue-200" : sourceLabel == "PMC" ? "bg-green-100 text-green-700 border border-green-200" : sourceLabel == "RMC" ? "bg-yellow-100 text-yellow-700 border border-yellow-200" : "bg-blue-100 text-blue-700 border border-blue-200"} capitalize`}
                      >
                        {sourceLabel}
                      </span>
                    </TableCell> */}
                    <TableCell>
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
                              to={`${basePath}/view-centralized-student-detail/${rowId ?? ""}`}
                              state={{
                                studentId: rowId,
                                student: row,
                              }}
                            >
                              <Eye size={15} />
                            </AdminActionLink>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Detail</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger>
                            <AdminActionLink
                              className="edit-btn"
                              to={`${basePath}/centralized-student-form/${rowId ?? ""}`}
                              state={{
                                studentId: rowId,
                                student: row,
                              }}
                            >
                              <Edit size={15} />
                            </AdminActionLink>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit</p>
                          </TooltipContent>
                        </Tooltip>
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
                                onClick={() => confirmDelete(rowId)}
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

export default CentralizedStudentList;

