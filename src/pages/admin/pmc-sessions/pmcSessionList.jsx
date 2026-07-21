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
  Calendar,
  Delete,
  Download,
  Edit,
  Eye,
  Loader2,
  MapPin,
  PlusCircleIcon,
  Users,
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
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import DemographicCard from "@/components/DemographicCard";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import {
  deletePmcSessionById,
  getAllPaginatedPmcSessions,
  getActivePmcSessionExport,
  getPmcActiveAnalytics,
} from "@/api/pmcRmcSessionsApi";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const DEFAULT_ACTIVE_ANALYTICS = {
  filters: {
    applied: {
      city: "",
    },
    options: {
      cities: [],
    },
  },
  summary: {
    total_active_participants: 0,
    total_active_sessions: 0,
  },
  data: {},
};

const ANALYTICS_CARD_TONES = [
  "demoGreen",
  "demoBlue",
  "demoOrange",
  "demoPurple",
  "demoIndigo",
  "demoRed",
];

const toSafeCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeActiveAnalytics = (payload = {}) => {
  const rawCities = Array.isArray(payload?.filters?.options?.cities)
    ? payload.filters.options.cities
    : [];
  const normalizedData =
    payload?.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
      ? Object.entries(payload.data).reduce((accumulator, [key, value]) => {
          const label = String(key ?? "").trim();
          if (!label) {
            return accumulator;
          }

          accumulator[label] = toSafeCount(value);
          return accumulator;
        }, {})
      : {};

  return {
    filters: {
      applied: {
        city: String(payload?.filters?.applied?.city ?? "").trim(),
      },
      options: {
        cities: rawCities
          .map((city) => String(city ?? "").trim())
          .filter(Boolean),
      },
    },
    summary: {
      total_active_participants: toSafeCount(
        payload?.summary?.total_active_participants,
      ),
      total_active_sessions: toSafeCount(
        payload?.summary?.total_active_sessions,
      ),
    },
    data: normalizedData,
  };
};

const PmcSessionList = () => {
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isExporting, setIsExporting] = React.useState(false);
  const [activeAnalytics, setActiveAnalytics] = React.useState(
    DEFAULT_ACTIVE_ANALYTICS,
  );
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);
  const [analyticsError, setAnalyticsError] = React.useState("");
  const [selectedAnalyticsCity, setSelectedAnalyticsCity] = React.useState("");
  const [hasLoadedAnalytics, setHasLoadedAnalytics] = React.useState(false);
  const hasHydratedAnalyticsFilterRef = React.useRef(false);

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
        const trimmedSearch = debouncedSearch.trim();
        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        const response = await getAllPaginatedPmcSessions(params);
        if (!isMounted) {
          return;
        }

        const payload = response ?? {};
        const pageContainer = payload?.data ?? payload;
        const pageData = Array.isArray(pageContainer?.data)
          ? pageContainer.data
          : Array.isArray(pageContainer)
            ? pageContainer
            : [];
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
          err?.message || "Failed to load PMC sessions. Please try again.";
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
  }, [currentPage, rowsPerPage, debouncedSearch, refreshKey]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(handle);
  }, [searchTerm]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchActiveAnalytics = async () => {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      try {
        const response = await getPmcActiveAnalytics(selectedAnalyticsCity);
        if (!isMounted) {
          return;
        }

        const normalizedAnalytics = normalizeActiveAnalytics(response ?? {});

        setActiveAnalytics(normalizedAnalytics);
        setHasLoadedAnalytics(true);

        if (!hasHydratedAnalyticsFilterRef.current) {
          hasHydratedAnalyticsFilterRef.current = true;
          setSelectedAnalyticsCity(
            normalizedAnalytics?.filters?.applied?.city ?? "",
          );
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setAnalyticsError(
          err?.message || "Failed to load active PMC analytics.",
        );
      } finally {
        if (isMounted) {
          setAnalyticsLoading(false);
        }
      }
    };

    fetchActiveAnalytics();
    return () => {
      isMounted = false;
    };
  }, [selectedAnalyticsCity]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await getActivePmcSessionExport();
      const payload = response?.data;

      if (!payload) {
        throw new Error("Export failed. No file received.");
      }

      const contentType =
        response?.headers?.["content-type"] ||
        payload?.type ||
        "application/octet-stream";
      const fileBlob =
        payload instanceof Blob
          ? payload
          : new Blob([payload], { type: contentType });

      const disposition = response?.headers?.["content-disposition"] || "";
      const matchedFilename =
        disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ??
        disposition.match(/filename="?([^"]+)"?/i)?.[1];
      const fallbackExtension = String(contentType)
        .toLowerCase()
        .includes("csv")
        ? "csv"
        : "xlsx";
      const filename = matchedFilename
        ? decodeURIComponent(matchedFilename)
        : `active_pmc_sessions_${Date.now()}.${fallbackExtension}`;

      const url = window.URL.createObjectURL(fileBlob);
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
        err?.message || "Unable to export PMC sessions right now.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDelete = async (id) => {
    try {
      await deletePmcSessionById(id);
      setRefreshKey((prev) => prev + 1);
      toast.success("PMC session deleted successfully.");
    } catch (error) {
      const message =
        error?.message || "Failed to delete PMC session. Please try again.";
      toast.error(message);
      console.error("Delete error:", error);
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasSearchQuery = Boolean(debouncedSearch.trim());
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;
  const availableAnalyticsCities = React.useMemo(
    () => activeAnalytics?.filters?.options?.cities ?? [],
    [activeAnalytics],
  );
  const availableAnalyticsCityCount = availableAnalyticsCities.length;
  const analyticsCityOptions = React.useMemo(
    () =>
      availableAnalyticsCities.map((city) => ({
        value: city,
        label: city,
      })),
    [availableAnalyticsCities],
  );
  const totalActiveParticipants = toSafeCount(
    activeAnalytics?.summary?.total_active_participants,
  );
  const totalActiveSessions = toSafeCount(
    activeAnalytics?.summary?.total_active_sessions,
  );
  const analyticsScopeLabel =
    String(activeAnalytics?.filters?.applied?.city ?? "").trim() ||
    "All Cities";
  const analyticsBreakdownCards = React.useMemo(
    () =>
      Object.entries(activeAnalytics?.data ?? {})
        .sort(([leftKey], [rightKey]) =>
          leftKey.localeCompare(rightKey, undefined, { numeric: true }),
        )
        .map(([label, value], index) => {
          const count = toSafeCount(value);
          const percentage =
            totalActiveParticipants > 0
              ? Math.round((count / totalActiveParticipants) * 100)
              : 0;

          return {
            label,
            count,
            classname:
              ANALYTICS_CARD_TONES[index % ANALYTICS_CARD_TONES.length],
            subheading:
              totalActiveParticipants > 0
                ? `${percentage}% of active participants`
                : "No active participants recorded",
          };
        }),
    [activeAnalytics?.data, totalActiveParticipants],
  );

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>PMC Session Lists</h1>
          <p className="text-slate-600 text-md">
            Manage PMC sessions for passed out students.
          </p>
        </div>
        <div className="dh-right flex flex-wrap gap-2">
          <button
            type="button"
            className="global-btn secondary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
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
                Export Sessions
              </>
            )}
          </button>
          <AdminActionLink
            module="pmc_sessions"
            action="create"
            to="/admin/pmc-session-form"
            className="global-btn"
          >
            Add New PMC Session <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Active PMC Analytics
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {analyticsScopeLabel}
              </span>
              {analyticsLoading && hasLoadedAnalytics ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  Refreshing...
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Review active participant totals, session coverage, and the live
              PMC type breakdown by city.
            </p>
          </div>

          <div className="w-full lg:max-w-sm">
            <label className="text-xs font-semibold text-slate-600">
              City Filter
            </label>
            <SearchableMultiSelect
              options={analyticsCityOptions}
              value={selectedAnalyticsCity}
              multiple={false}
              onChange={setSelectedAnalyticsCity}
              placeholder="Search city"
              disabled={analyticsLoading}
              emptyState="No cities found"
            />
          </div>
        </div>

        {analyticsError ? (
          <Alert variant="destructive" className="alert-custom mt-4">
            <AlertCircleIcon size={18} />
            <AlertTitle>{analyticsError}</AlertTitle>
          </Alert>
        ) : null}

        {!hasLoadedAnalytics && analyticsLoading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="animate-spin" />
              <span>Loading active analytics...</span>
            </div>
          </div>
        ) : hasLoadedAnalytics ? (
          <>
            <section className="metrics-grid metrics-grid3 mt-8">
              <DemographicCard
                icon={<Users size={24} />}
                title="Total"
                classname="demoYellow"
                count={totalActiveParticipants}
                subheading={
                  analyticsScopeLabel === "All Cities"
                    ? "Participants currently active across all cities"
                    : `Participants currently active in ${analyticsScopeLabel}`
                }
              />
              {analyticsBreakdownCards.length ? (
                <>
                  {analyticsBreakdownCards.map((item) => (
                    <DemographicCard
                      key={item.label}
                      icon={<Users size={24} />}
                      title={item.label}
                      classname={item.classname}
                      count={item.count}
                      subheading={item.subheading}
                    />
                  ))}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No active participant breakdown is available for the selected
                  city.
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder="Search type, title, or contest date..."
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
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
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Contest Date</TableHead>
              <TableHead>Registration Date</TableHead>
              <TableHead>Status</TableHead>
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
                  {hasSearchQuery
                    ? "No pmc session match your search."
                    : "No pmc session available."}
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
                      {row?.type} - round {row?.round}
                    </strong>
                  </TableCell>
                  <TableCell>{row?.title}</TableCell>
                  <TableCell>
                    {format(new Date(row?.contest_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(
                      new Date(row?.registration_closing_date),
                      "MMM dd, yyyy",
                    )}
                  </TableCell>
                  <TableCell>
                    {row?.is_active ? (
                      <span className="text-green-500">Active</span>
                    ) : (
                      <span className="text-red-500">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="table-actions">
                      <Tooltip>
                        <TooltipTrigger>
                          <AdminActionLink
                            className="view-btn"
                            to={`/admin/view-pmc-session-detail/${row.id}`}
                            state={{
                              pmcSessionId: row?._id ?? row?.id,
                              pmcSession: row,
                            }}
                          >
                            <Eye size={15} />
                          </AdminActionLink>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Detail</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger>
                          <AdminActionLink
                            className="edit-btn"
                            to={`/admin/pmc-session-form/${
                              row?._id ?? row?.id ?? ""
                            }`}
                            state={{
                              pmcSessionId: row?._id ?? row?.id,
                              pmcSession: row,
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

export default PmcSessionList;

