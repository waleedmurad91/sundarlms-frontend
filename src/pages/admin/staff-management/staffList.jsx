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
  Loader2,
  PlusCircleIcon,
  School,
  Shield,
  UserCog,
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
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import DemographicCard from "@/components/DemographicCard";
import FilterBar from "@/components/filter/FilterBar";
import {
  deleteStaffById,
  getAllPaginatedStaff,
  getStatistics,
} from "@/api/staffApi";
import { createStaffListFilterSchema } from "@/config/filterSchemas";
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

const StaffList = () => {
  const initialFilterSchema = React.useMemo(
    () => createStaffListFilterSchema({}),
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
  const [refreshKey, setRefreshKey] = React.useState(0);
  const hasHydratedFiltersRef = React.useRef(false);

  const [statistics, setStatistics] = React.useState({
    total_users: 0,
    admins: 0,
    teachers: 0,
    students: 0,
    data_entry: 0,
    reviewers: 0,
    recent_registrations: 0,
  });

  const filterSchema = React.useMemo(
    () => createStaffListFilterSchema(filterOptions),
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
    const fetchStats = async () => {
      try {
        const response = await getStatistics();
        if (!isMounted) return;
        const data = response?.data ?? response ?? {};
        setStatistics({
          total_users: Number(data.total_users) || 0,
          admins: Number(data.admins) || 0,
          teachers: Number(data.teachers) || 0,
          students: Number(data.students) || 0,
          data_entry: Number(data.data_entry) || 0,
          reviewers: Number(data.reviewers) || 0,
          recent_registrations: Number(data.recent_registrations) || 0,
        });
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message || "Failed to load staff statistics. Please try again.";
        toast.error(message);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
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

        const response = await getAllPaginatedStaff(params);
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
          (responseFilters?.role || responseFilters?.gender
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
          const schemaFromApi = createStaffListFilterSchema(
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
        if (!isMounted) {
          return;
        }
        const message =
          err?.message || "Failed to load staff. Please try again.";
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
  }, [currentPage, rowsPerPage, appliedFilters, refreshKey]);

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
      await deleteStaffById(id);
      setRefreshKey((prev) => prev + 1);
      toast.success("Staff deleted successfully.");
    } catch (error) {
      const message =
        error?.message || "Failed to delete staff. Please try again.";
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
          <h4>Admin Dashboard</h4>
          <h1>Staff Directory</h1>
          <p className="text-slate-600 text-md">
            Manage educational faculty and oversee their activities with
            comprehensive administrative tools.
          </p>
        </div>
        <div className="dh-right">
          <AdminActionLink
            module="staff"
            action="create"
            to="/admin/add-new-staff"
            className="global-btn"
          >
            Add New Staff <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div>
      </div>

      {/* <section className="metrics-grid metrics-grid3 mt-5 mb-6">
        <DemographicCard
          icon={<School size={24} />}
          title="Total Users"
          classname="demoIndigo"
          count={statistics.total_users}
          subheading="All roles combined"
        />
        <DemographicCard
          icon={<UserCog size={24} />}
          title="Data Entry"
          classname="demoPurple"
          count={statistics.data_entry}
          subheading="Active data entry staff"
        />
        <DemographicCard
          icon={<Shield size={24} />}
          title="Reviewers"
          classname="demoGreen"
          count={statistics.reviewers}
          subheading="Quality assurance staff"
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
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
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
                    ? "No staff match your filters."
                    : "No staff available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => (
                <TableRow key={row._id ?? row.id ?? index}>
                  <TableCell className="font-medium">
                    {baseRowNumber + index}
                  </TableCell>
                  <TableCell>{row?.name}</TableCell>
                  <TableCell>{row?.phone}</TableCell>
                  <TableCell>{row?.email}</TableCell>
                  <TableCell>{row?.access_role?.label}</TableCell>
                  <TableCell>
                    {format(
                      new Date(row?.created_at),
                      "MMM dd, yyyy • hh:mm a",
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="table-actions">
                      {/* <Tooltip>
                        <TooltipTrigger>
                          <AdminActionLink
                            className="view-btn"
                            to="/admin/view-staff-detail"
                            state={{
                              staffId: row?._id ?? row?.id,
                              staff: row,
                            }}
                          >
                            <Eye size={15} />
                          </AdminActionLink>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Detail</p>
                        </TooltipContent>
                      </Tooltip> */}
                      <Tooltip>
                        <TooltipTrigger>
                          <AdminActionLink
                            className="edit-btn"
                            to={`/admin/add-new-staff/${
                              row?._id ?? row?.id ?? ""
                            }`}
                            state={{
                              staffId: row?._id ?? row?.id,
                              staff: row,
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
                                onClick={() =>
                                  confirmDelete(row?._id ?? row?.id)
                                }
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

export default StaffList;
