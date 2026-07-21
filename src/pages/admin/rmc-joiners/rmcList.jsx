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
  Check,
  CircleEllipsis,
  Delete,
  Download,
  Edit,
  Eye,
  GraduationCap,
  Info,
  Loader2,
  LockKeyhole,
  PlusCircleIcon,
  School,
  Shield,
  TriangleAlert,
  UserCog,
} from "lucide-react";
import { AdminActionLink } from "@/components/admin/AdminActionControls";
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
import FilterBar from "@/components/filter/FilterBar";
import {
  getAllPaginatedRMCJoiners,
  rmcJoinCounter,
  rmcJoinStatusGet,
  rmcJoinStatusUpdate,
} from "@/api/rmcContestApi";
import DemographicCard from "@/components/DemographicCard";
import { createRmcJoinersListFilterSchema } from "@/config/filterSchemas";
import {
  buildFilterParams,
  buildFilterStateFromSchema,
} from "@/lib/applyFilters";
import {
  exportRMCParticipants,
  exportRMCRegistrations,
} from "@/api/registrationsApi";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const RMCList = () => {
  const initialFilterSchema = React.useMemo(
    () => createRmcJoinersListFilterSchema({}),
    [],
  );
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [isExporting, setIsExporting] = React.useState(false);
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
  const [registrationEnabled, setRegistrationEnabled] = React.useState(false);
  const [isLocking, setIsLocking] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const hasHydratedFiltersRef = React.useRef(false);

  const filterSchema = React.useMemo(
    () => createRmcJoinersListFilterSchema(filterOptions),
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

        const response = await getAllPaginatedRMCJoiners(params);
        const countResponse = await rmcJoinCounter();

        if (!isMounted) {
          return;
        }
        setCount(countResponse?.data || 0);
        const payload = response ?? {};
        const payloadData =
          payload?.data && typeof payload.data === "object"
            ? payload.data
            : null;

        const isPageContainer = (value) =>
          value &&
          typeof value === "object" &&
          (value?.current_page !== undefined ||
            value?.last_page !== undefined ||
            Array.isArray(value?.data));

        let pageContainer = isPageContainer(payloadData)
          ? payloadData
          : isPageContainer(payload)
            ? payload
            : payload;

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
          payload?.filters ??
          payloadData?.filters ??
          {};
        const responseFilterOptions =
          responseFilters?.options ??
          responseFilters?.filter_options ??
          pageContainer?.filter_options ??
          payload?.filter_options ??
          payloadData?.filter_options ??
          (responseFilters?.join ||
          responseFilters?.status ||
          responseFilters?.school ||
          responseFilters?.grade
            ? responseFilters
            : {});
        const responseAppliedFilters =
          responseFilters?.applied ??
          responseFilters?.applied_filters ??
          pageContainer?.applied_filters ??
          payload?.applied_filters ??
          payloadData?.applied_filters ??
          {};

        setFilterOptions((prev) => {
          const previousSerialized = JSON.stringify(prev ?? {});
          const nextSerialized = JSON.stringify(responseFilterOptions ?? {});
          return previousSerialized === nextSerialized
            ? prev
            : responseFilterOptions;
        });

        if (!hasHydratedFiltersRef.current) {
          const schemaFromApi = createRmcJoinersListFilterSchema(
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
          err?.message || "Failed to load rmc joiners. Please try again.";
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

  // const confirmDelete = async (id) => {
  //   try {
  //     await deleteCertificateById(id);
  //     setRefreshKey((prev) => prev + 1);
  //     toast.success("RMC joiner deleted successfully.");
  //   } catch (error) {
  //     const message =
  //       error?.message || "Failed to delete rmc joiner. Please try again.";
  //     toast.error(message);
  //     console.error("Delete error:", error);
  //   }
  // };

  React.useEffect(() => {
    let mounted = true;
    const loadRegistrationStatus = async () => {
      try {
        const res = await rmcJoinStatusGet();
        const enabled =
          res?.data?.enabled ?? res?.enabled ?? res?.data?.data?.enabled;
        if (!mounted) return;
        setRegistrationEnabled(
          enabled === 1 || enabled === true || enabled === "1",
        );
      } catch (err) {
        const message =
          err?.message || "Unable to load rmc joiners registration status.";
        toast.error(message);
      }
    };
    loadRegistrationStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleRegistrationLock = async () => {
    setIsLocking(true);
    const nextEnabled = registrationEnabled ? 0 : 1;
    try {
      const payload = { enabled: nextEnabled };
      const res = await rmcJoinStatusUpdate(payload);
      const message =
        res?.message ||
        `Registrations ${nextEnabled ? "unlocked" : "locked"} successfully.`;
      setRegistrationEnabled(nextEnabled);
      toast.success(message);
    } catch (err) {
      const message =
        err?.message || "Unable to update registration status right now.";
      toast.error(message);
    } finally {
      setIsLocking(false);
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasActiveFilters = React.useMemo(
    () => Object.keys(buildFilterParams(appliedFilters)).length > 0,
    [appliedFilters],
  );
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportRMCParticipants();
      const payload = response?.data;
      if (!payload) {
        throw new Error("Export failed. No file received.");
      }

      // Handle either Blob (binary) or plain CSV text
      const csvBlob =
        payload instanceof Blob
          ? payload
          : new Blob([String(payload)], { type: "text/csv;charset=utf-8" });

      const disposition = response?.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename=\"?([^\"]+)\"?/i);
      const fallbackName = `rmc_student_participants_${Date.now()}.csv`;
      const filename = match?.[1] || fallbackName;

      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export started. Your download should begin shortly.");
    } catch (err) {
      const message =
        err?.message || "Unable to export registrations right now.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>RMC Participation</h1>
          <p className="text-slate-600 text-md">
            Manage and view student participation in RMCs.
          </p>
        </div>
        <div className="dh-right flex-col items-end">
          <div className="flex gap-2">
            <button
              type="button"
              className="global-btn flex items-center gap-2"
              onClick={handleToggleRegistrationLock}
              disabled={loading || isLocking}
            >
              {isLocking ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : registrationEnabled ? (
                "Lock Participations"
              ) : (
                "Unlock Participations"
              )}
            </button>

            <button
              type="button"
              className="global-btn secondary flex items-center gap-2"
              onClick={handleExport}
              disabled={loading || isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <section class="metrics-grid metrics-grid3 mt-5 mb-6">
        <DemographicCard
          icon={<TriangleAlert size={24} />}
          title="Pending"
          classname="demoRed"
          count={count.total_missing_info ?? 0}
          subheading="Pending"
        />

        <DemographicCard
          icon={<Check size={24} />}
          title="Participating"
          classname="demoGreen"
          count={count.total_join_yes ?? 0}
          subheading="Participating"
        />

        <DemographicCard
          icon={<CircleEllipsis size={24} />}
          title="Non-participating"
          classname="demoOrange"
          count={count.total_join_no ?? 0}
          subheading="Non-participating"
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
              <TableHead>Father Phone</TableHead>
              <TableHead>Join?</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  {hasActiveFilters
                    ? "No data match your filters."
                    : "No data available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => (
                <TableRow key={row._id ?? row.id ?? index}>
                  <TableCell className="font-medium">
                    {baseRowNumber + index}
                  </TableCell>
                  <TableCell>
                    <strong>
                      {row?.name ??
                        row?.student_name ??
                        row?.user?.name ??
                        "N/A"}
                    </strong>
                  </TableCell>
                  <TableCell>
                    {row?.email ?? row?.user?.email ?? "N/A"}
                  </TableCell>
                  <TableCell>{row?.father_phone || "N/A"}</TableCell>
                  <TableCell>
                    {row?.rmc_join_opt_in == true ? (
                      <span className="text-green-600 bg-green-100 text-[11px] px-2 py-1 rounded-2xl font-bold inline-flex gap-1">
                        <Check size={14} />
                        Participating
                      </span>
                    ) : row?.rmc_join_opt_in == false ? (
                      <span className="text-red-600 bg-red-100 text-[11px] px-2 py-1 rounded-2xl font-bold inline-flex gap-1">
                        <TriangleAlert size={13} />
                        Non-participating
                      </span>
                    ) : (
                      <span className="text-yellow-600 bg-yellow-100 text-[11px] px-2 py-1 rounded-2xl font-bold inline-flex gap-1">
                        <CircleEllipsis size={13} />
                        Pending
                      </span>
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
                            to={`/admin/add-new-student/${
                              row?._id ?? row?.id ?? ""
                            }`}
                            state={{
                              studentId: row?._id ?? row?.id,
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
                      {/* <AdminDeleteGuard>
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
                    </AdminDeleteGuard> */}
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

export default RMCList;

