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
  Layers,
  Loader2,
  PlusCircleIcon,
  School,
  UsersRound,
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
  deleteTeacherById,
  getAllPaginatedTeachers,
  getAllSchoolsTeachers,
} from "@/api/teacherApi";
import { getAllClasses } from "@/api/classApi";
import { getAllSchools } from "@/api/schoolApi";
import ListToolbar from "@/components/ListToolbar";
import DemographicCard from "@/components/DemographicCard";
import { useAuthStore } from "@/store/auth";
import FilterBar from "@/components/filter/FilterBar";
import { createTeacherListFilterSchema } from "@/config/filterSchemas";
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

const TeacherList = () => {
  const initialFilterSchema = React.useMemo(
    () => createTeacherListFilterSchema({}),
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
  const [totalTeachers, setTotalTeachers] = React.useState(0);
  const [totalClasses, setTotalClasses] = React.useState(0);
  const normalizedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const isSchoolRole = normalizedRole === "school";
  const schoolId =
    user?.school_id ??
    user?.schoolId ??
    user?.school?.id ??
    user?.school?._id ??
    null;
  const schoolFetchId = schoolId ?? user?._id ?? user?.id ?? null;
  const basePath = isSchoolRole ? "/school" : "/admin";
  const dashboardTitle = isSchoolRole ? "School Dashboard" : "Admin Dashboard";

  const filterSchema = React.useMemo(
    () => createTeacherListFilterSchema(filterOptions),
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
  }, [isSchoolRole, schoolId, schoolFetchId]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        if (isSchoolRole && !schoolFetchId) {
          setRecords([]);
          setPagination({ ...DEFAULT_PAGINATION });
          setError("School identifier is missing. Please re-login.");
          return;
        }
        const params = {
          page: currentPage,
          per_page: rowsPerPage,
        };
        Object.assign(params, buildFilterParams(appliedFilters));

        const response = isSchoolRole
          ? await getAllSchoolsTeachers(params, schoolFetchId)
          : await getAllPaginatedTeachers(params);
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
          pageContainer?.filters ?? rootPayload?.filters ?? rootData?.filters ?? {};
        const responseFilterOptions =
          responseFilters?.options ??
          responseFilters?.filter_options ??
          pageContainer?.filter_options ??
          rootPayload?.filter_options ??
          rootData?.filter_options ??
          (responseFilters?.grade || responseFilters?.subject
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
          const schemaFromApi = createTeacherListFilterSchema(responseFilterOptions);
          const initialFiltersFromApi = buildFilterStateFromSchema(
            schemaFromApi,
            responseAppliedFilters,
          );
          setFilterDraft(initialFiltersFromApi);
          setAppliedFilters(initialFiltersFromApi);
          hasHydratedFiltersRef.current = true;
        }

        const resolvedCurrent = Number(
          pageContainer?.current_page ?? params.page ?? 1
        );
        const resolvedPerPage = Number(
          pageContainer?.per_page ?? params.per_page ?? 10
        );
        const resolvedTotal = Number(pageContainer?.total ?? pageData.length);
        const resolvedLast = Number(pageContainer?.last_page ?? 1);
        const resolvedFrom =
          Number(pageContainer?.from) ||
          (pageData.length ? (resolvedCurrent - 1) * resolvedPerPage + 1 : 0);
        const resolvedTo =
          Number(pageContainer?.to) ||
          (pageData.length ? resolvedFrom + pageData.length - 1 : 0);

        const filteredData =
          isSchoolRole && schoolId
            ? pageData.filter(
                (item) =>
                  String(
                    item?.school_id ??
                      item?.schoolId ??
                      item?.school?._id ??
                      item?.school?.id
                  ) === String(schoolId)
              )
            : pageData;

        setRecords(filteredData);
        setPagination({
          current_page: resolvedCurrent,
          last_page: resolvedLast,
          per_page: resolvedPerPage,
          total: isSchoolRole && schoolId ? filteredData.length : resolvedTotal,
          from: resolvedFrom,
          to:
            isSchoolRole && schoolId
              ? Math.min(resolvedTo, resolvedFrom + filteredData.length - 1)
              : resolvedTo,
        });
        setTotalTeachers(
          isSchoolRole && schoolId ? filteredData.length : resolvedTotal
        );

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
        setError(err?.message || "Failed to load teachers. Please try again.");
        toast.error(
          err?.message || "Failed to load teachers. Please try again."
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
    schoolFetchId,
  ]);

  React.useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      if (isSchoolRole) {
        setTotalSchools(schoolId ? 1 : 0);
        const classCount = records.length
          ? new Set(
              records
                .map((row) => row?.grade?.id ?? row?.grade?.grade_id)
                .filter(Boolean)
            ).size
          : 0;
        setTotalClasses(classCount);
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
        // Silent failure; main list handles user feedback.
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
      await deleteTeacherById(id);
      setRefreshKey((prev) => prev + 1);
      toast.success("Teacher deleted successfully.");
    } catch (error) {
      const message =
        error?.message || "Failed to delete teacher. Please try again.";
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
          <h1>Teacher Directory</h1>
          <p className="text-slate-600 text-md">
            Manage educational faculty and oversee their teaching activities
            with comprehensive administrative tools.
          </p>
        </div>
        <div className="dh-right">
          <AdminActionLink
            module="teachers"
            action="create"
            to={`${basePath}/add-new-teacher`}
            className="global-btn"
          >
            Add New Teacher <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div>
      </div>
      <section className="metrics-grid metrics-grid3 mt-5 mb-6">
        <DemographicCard
          icon={<UsersRound size={24} />}
          title="Teachers"
          classname="demoPurple"
          count={totalTeachers}
          subheading="Expert Educators"
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
              <TableHead>Phone</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
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
                    ? "No teachers match your filters."
                    : "No teachers available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => (
                <TableRow key={row._id ?? row.id ?? index}>
                  <TableCell className="font-medium">
                    {baseRowNumber + index}
                  </TableCell>
                  <TableCell>{row?.name}</TableCell>
                  <TableCell>{row?.email}</TableCell>
                  <TableCell>{row?.phone}</TableCell>
                  <TableCell>{row?.school?.name}</TableCell>
                  <TableCell>{row?.grade?.name}</TableCell>
                  <TableCell>{row?.subject?.name}</TableCell>
                  <TableCell>
                    {format(
                      new Date(row?.created_at),
                      "MMM dd, yyyy • hh:mm a"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="table-actions">
                      <Tooltip>
                        <TooltipTrigger>
                          <AdminActionLink
                            className="view-btn"
                            to={`${basePath}/view-teacher-detail/${
                              row?._id ?? row?.id ?? ""
                            }`}
                            state={{
                              teacherId: row?._id ?? row?.id,
                              teacher: row,
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
                            to={`${basePath}/add-new-teacher/${
                              row?._id ?? row?.id ?? ""
                            }`}
                            state={{
                              teacherId: row?._id ?? row?.id,
                              class: row,
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
                              onClick={() => confirmDelete(row?._id ?? row?.id)}
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

export default TeacherList;

