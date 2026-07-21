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
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import calendarEventsApi from "@/api/calendarEventsApi";
import ListToolbar from "@/components/ListToolbar";
import FilterBar from "@/components/filter/FilterBar";
import { createCalendarEventListFilterSchema } from "@/config/filterSchemas";
import {
  buildFilterParams,
  buildFilterStateFromSchema,
} from "@/lib/applyFilters";
import { useAdminAccess } from "@/hooks/useAdminAccess";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const CATEGORY_COLORS = {
  pmc: "bg-green-100 text-green-700",
  rmc: "bg-indigo-100 text-indigo-700",
  holiday: "bg-amber-100 text-amber-700",
  class: "bg-blue-100 text-blue-700",
  practice: "bg-orange-100 text-orange-700",
  event: "bg-teal-100 text-teal-700",
};

const formatLabel = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "-";
  return normalized
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const CategoryBadge = ({ category }) => {
  if (!category) return "-";
  const colorClass = CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      {formatLabel(category)}
    </span>
  );
};

const StatusPill = ({ active, activeLabel, inactiveLabel }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
    }`}
  >
    {active ? activeLabel : inactiveLabel}
  </span>
);

const EventCalendarList = () => {
  const { can } = useAdminAccess();
  const initialFilterSchema = React.useMemo(
    () => createCalendarEventListFilterSchema({}),
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
  const [deletingId, setDeletingId] = React.useState(null);
  const hasHydratedFiltersRef = React.useRef(false);

  const filterSchema = React.useMemo(
    () => createCalendarEventListFilterSchema(filterOptions),
    [filterOptions],
  );

  React.useEffect(() => {
    const defaults = buildFilterStateFromSchema(filterSchema);
    const isSameValue = (left, right) => {
      if (Array.isArray(left) || Array.isArray(right)) {
        const leftArray = Array.isArray(left) ? left : [];
        const rightArray = Array.isArray(right) ? right : [];
        if (leftArray.length !== rightArray.length) return false;
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

        const response = await calendarEventsApi.listAdminEvents(params);
        if (!isMounted) return;

        const pageContainer = response?.data ?? {};
        const pageData = Array.isArray(pageContainer?.data)
          ? pageContainer.data
          : [];

        const responseFilterOptions = response?.filters?.options ?? {};
        const responseAppliedFilters = response?.filters?.applied ?? {};

        setFilterOptions((prev) => {
          const previousSerialized = JSON.stringify(prev ?? {});
          const nextSerialized = JSON.stringify(responseFilterOptions ?? {});
          return previousSerialized === nextSerialized
            ? prev
            : responseFilterOptions;
        });

        if (!hasHydratedFiltersRef.current) {
          const schemaFromApi = createCalendarEventListFilterSchema(
            responseFilterOptions,
          );
          // API's applied.is_active/is_public come back as null/booleans;
          // normalize to the "1"/"0" strings our select options use.
          const normalizedApplied = {
            ...responseAppliedFilters,
            is_active:
              responseAppliedFilters?.is_active === null ||
              responseAppliedFilters?.is_active === undefined
                ? ""
                : responseAppliedFilters.is_active
                  ? "1"
                  : "0",
            is_public:
              responseAppliedFilters?.is_public === null ||
              responseAppliedFilters?.is_public === undefined
                ? ""
                : responseAppliedFilters.is_public
                  ? "1"
                  : "0",
          };
          const initialFiltersFromApi = buildFilterStateFromSchema(
            schemaFromApi,
            normalizedApplied,
          );
          setFilterDraft(initialFiltersFromApi);
          setAppliedFilters(initialFiltersFromApi);
          hasHydratedFiltersRef.current = true;
        }

        const resolvedCurrent = Number(
          pageContainer?.current_page ?? params.page ?? 1,
        );
        const resolvedPerPage = Number(
          pageContainer?.per_page ?? params.per_page ?? 20,
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

        if (currentPage !== resolvedCurrent) setCurrentPage(resolvedCurrent);
        if (rowsPerPage !== resolvedPerPage) setRowsPerPage(resolvedPerPage);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message || "Failed to load calendar events. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setLoading(false);
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

  const handleDelete = async (event) => {
    const eventId = event?.id;
    if (!eventId) {
      toast.error("Delete is not available for this event.");
      return;
    }
    try {
      setDeletingId(eventId);
      await calendarEventsApi.deleteEvent(eventId);
      toast.success("Calendar event deleted successfully.");
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      const message =
        deleteError?.message ||
        "Failed to delete this event. Please try again.";
      toast.error(message);
      console.error("Delete error:", deleteError);
    } finally {
      setDeletingId((prev) => (prev === eventId ? null : prev));
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasActiveFilters = React.useMemo(
    () => Object.keys(buildFilterParams(appliedFilters)).length > 0,
    [appliedFilters],
  );
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;

  const canUpdate = can("calendar_events", "update");
  const canDelete = can("calendar_events", "delete");
  const canCreate = can("calendar_events", "create");

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Calendar Events</h1>
        </div>
        {canCreate && (
          <AdminActionLink className="global-btn" to="/admin/add-new-event">
            Add Event <PlusCircleIcon size={15} />
          </AdminActionLink>
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
        <Table className="global-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Starts At</TableHead>
              <TableHead>Ends At</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Status</TableHead>
              {(canUpdate || canDelete) && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  {hasActiveFilters
                    ? "No events match your filters."
                    : "No calendar events available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => {
                const isDeleting = deletingId === row.id;
                const hasActions = canUpdate || canDelete;
                return (
                  <TableRow key={row.id ?? index}>
                    <TableCell className="font-medium">
                      {baseRowNumber + index}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: row.color || "#94a3b8" }}
                        />
                        <span>{row.title}</span>
                        {row.is_all_day ? (
                          <span className="text-xs text-gray-400">
                            (All day)
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={row.category} />
                    </TableCell>
                    <TableCell>
                      {row?.starts_at
                        ? format(
                            new Date(row.starts_at.replace(" ", "T")),
                            "MMM dd, yyyy - hh:mm a",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {row?.ends_at
                        ? format(
                            new Date(row.ends_at.replace(" ", "T")),
                            "MMM dd, yyyy - hh:mm a",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        active={!!row.is_public}
                        activeLabel="Public"
                        inactiveLabel="Private"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        active={!!row.is_active}
                        activeLabel="Active"
                        inactiveLabel="Inactive"
                      />
                    </TableCell>
                    {hasActions && (
                      <TableCell>
                        <div className="table-actions">
                          {canUpdate ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AdminActionLink
                                  className="edit-btn"
                                  to={`/admin/add-new-event/${row.id}`}
                                  state={{ event: row }}
                                >
                                  <Edit size={15} />
                                </AdminActionLink>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                          {canDelete ? (
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="delete-btn"
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? (
                                        <Loader2
                                          size={15}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Delete size={15} />
                                      )}
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
                                    permanently delete "{row.title}" and remove
                                    it from the public calendar.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={isDeleting}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    disabled={isDeleting}
                                    onClick={() => handleDelete(row)}
                                  >
                                    {isDeleting ? "Deleting..." : "Continue"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : null}
                        </div>
                      </TableCell>
                    )}
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

export default EventCalendarList;
