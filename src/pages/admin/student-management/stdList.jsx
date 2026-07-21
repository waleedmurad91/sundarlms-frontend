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
  deleteStudentById,
  getAllPaginatedStudents,
  getAllSchoolStudents,
} from "@/api/studentApi";
import ListToolbar from "@/components/ListToolbar";
import { getAllSchools } from "@/api/schoolApi";
import { getAllClasses } from "@/api/classApi";
import DemographicCard from "@/components/DemographicCard";
import { useAuthStore } from "@/store/auth";
import FilterBar from "@/components/filter/FilterBar";
import { createStudentListFilterSchema } from "@/config/filterSchemas";
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
  student?._id ?? student?.id ?? student?.user?.id;

const formatClassLabel = (student) => {
  const cls = student.grade;
  if (!cls) {
    return "-";
  }

  const grade = cls?.grade ?? cls?.name ?? "";
  const label = [grade].filter(Boolean).join(" - ");
  return label || "-";
};

const StudentList = () => {
  const initialFilterSchema = React.useMemo(
    () => createStudentListFilterSchema({}),
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

  const [totalSchools, setTotalSchools] = React.useState(0);
  const [totalStudents, setTotalStudents] = React.useState(0);
  const [totalClasses, setTotalClasses] = React.useState(0);
  const normalizedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const isSchoolRole = normalizedRole === "school";
  const schoolUserId =
    user?.id ?? user?._id ?? user?.user_id ?? user?.userId ?? null;
  const schoolId =
    user?.school_id ??
    user?.schoolId ??
    user?.school?.id ??
    user?.school?._id ??
    null;
  const basePath = isSchoolRole ? "/school" : "/admin";
  const dashboardTitle = isSchoolRole ? "School Dashboard" : "Admin Dashboard";

  const filterSchema = React.useMemo(
    () => createStudentListFilterSchema(filterOptions),
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
  }, [isSchoolRole, schoolId, schoolUserId]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (isSchoolRole && !schoolUserId) {
        setError(
          "School identifier is missing. Please re-login or contact support.",
        );
        setRecords([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const params = {
          page: currentPage,
          per_page: rowsPerPage,
        };
        Object.assign(params, buildFilterParams(appliedFilters));
        if (isSchoolRole && schoolId) {
          params.school_id = schoolId;
        }

        const response = isSchoolRole
          ? await getAllSchoolStudents(params, schoolUserId)
          : await getAllPaginatedStudents(params);
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
          (responseFilters?.status ||
          responseFilters?.school_link ||
          responseFilters?.school ||
          responseFilters?.grade ||
          responseFilters?.gender ||
          responseFilters?.formType
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
          const schemaFromApi = createStudentListFilterSchema(
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
  }, [
    currentPage,
    rowsPerPage,
    appliedFilters,
    refreshKey,
    isSchoolRole,
    schoolId,
    schoolUserId,
  ]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      if (isSchoolRole) {
        setTotalSchools(schoolId ? 1 : 0);
        setTotalClasses(
          records.length
            ? new Set(
                records
                  .map((row) => row?.grade?.id ?? row?.grade?.grade_id)
                  .filter(Boolean),
              ).size
            : 0,
        );
        return;
      }

      try {
        const [schoolResponse, classResponse] = await Promise.all([
          getAllSchools(),
          getAllClasses(),
        ]);

        if (!isMounted) {
          return;
        }

        setTotalSchools(schoolResponse?.length ?? 0);
        setTotalClasses(
          classResponse?.data?.data?.total ??
            classResponse?.data?.total ??
            0,
        );
      } catch (err) {
        // Keep silent; main list already reports errors.
      }
    };

    fetchCounts();

    return () => {
      isMounted = false;
    };
  }, [isSchoolRole, schoolId, records]);

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
      await deleteStudentById(id);
      setRefreshKey((prev) => prev + 1);
      toast.success("Student deleted successfully.");
    } catch (error) {
      const message =
        error?.message || "Failed to delete student. Please try again.";
      toast.error(message);
      console.error("Delete error:", error);
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
        {/* <div className="dh-right">
          <AdminActionLink
            module="students"
            action="create"
            to={`${basePath}/add-new-student`}
            className="global-btn"
          >
            Add New Student <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div> */}
      </div>
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

        {/* <DemographicCard
          icon={<Layers size={24} />}
          title="Classes"
          classname="demoRed"
          count={totalClasses}
          subheading="Learning Environments"
        /> */}
      </section>

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
              <TableHead>Email</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6">
                  {hasActiveFilters
                    ? "No students match your filters."
                    : "No students available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => (
                <TableRow key={getStudentId(row) ?? index}>
                  <TableCell className="font-medium">
                    {baseRowNumber + index}
                  </TableCell>
                  <TableCell>{row?.user?.name ?? row?.name ?? "-"}</TableCell>
                  <TableCell>{row?.user?.email ?? row?.email ?? "-"}</TableCell>
                  <TableCell>{row?.roll_number ?? "-"}</TableCell>
                  <TableCell>{row?.school?.name ?? "-"}</TableCell>
                  <TableCell>{formatClassLabel(row)}</TableCell>
                  <TableCell>
                    {
                      <span
                        className={`px-2 py-1 rounded-2xl text-xs ${
                          row?.status === "approved"
                            ? "bg-green-100 text-green-700 border border-green-200 capitalize"
                            : "bg-yellow-100 text-yellow-700 border border-yellow-200 capitalize"
                        }`}
                      >
                        {row?.status}
                      </span>
                    }
                  </TableCell>
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
                            to={`${basePath}/view-student-detail/${
                              row?._id ?? row?.id ?? ""
                            }`}
                            state={{
                              studentId: row?._id ?? row?.id,
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
                            to={`${basePath}/add-new-student/${
                              getStudentId(row) ?? ""
                            }`}
                            state={{
                              studentId: getStudentId(row),
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
                              onClick={() => confirmDelete(getStudentId(row))}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default StudentList;

