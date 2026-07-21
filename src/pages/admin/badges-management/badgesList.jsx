import React from "react";
import { AdminActionLink, AdminDeleteGuard } from "@/components/admin/AdminActionControls";
import { format } from "date-fns";
import {
  AlertCircleIcon,
  Delete,
  Edit,
  Eye,
  Loader2,
  PlusCircleIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import ListToolbar from "@/components/ListToolbar";
import { deleteBadgeById, getAllPaginatedBadges } from "@/api/badgesApi";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BACKEND_FILE_BASE_PATH =
  import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? "";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "active"].includes(normalized)) return true;
    if (["0", "false", "no", "inactive"].includes(normalized)) return false;
  }
  return fallback;
};

const resolveIconUrl = (value) => {
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (/^(blob:|data:|https?:\/\/|\/)/i.test(text)) {
    return text;
  }
  return `${BACKEND_FILE_BASE_PATH}${text}`;
};

const normalizeBadge = (payload) => {
  const data = payload?.data ?? payload ?? {};
  if (!data) return null;

  return {
    id: data?.id ?? data?._id ?? null,
    code: data?.code ?? "",
    name: data?.name ?? "",
    type: data?.type ?? "",
    scope: data?.scope ?? "",
    metric: data?.metric ?? "",
    operator: data?.operator ?? "",
    threshold: data?.threshold ?? "",
    sort_order: data?.sort_order ?? data?.sort ?? "",
    active: toBoolean(data?.active, true),
    is_repeatable: toBoolean(data?.is_repeatable, false),
    photo_icon:
      data?.photo_icon ??
      data?.icon_path ??
      data?.icon ??
      data?.icon_url ??
      data?.image ??
      "",
    created_at: data?.created_at ?? data?.createdAt ?? data?.timestamp ?? "",
    raw: data,
  };
};

const formatDateSafe = (value) => {
  if (!value) return "-";
  try {
    return format(new Date(value), "MMM dd, yyyy - hh:mm a");
  } catch {
    return "-";
  }
};

const BadgesList = () => {
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [refreshKey, setRefreshKey] = React.useState(0);

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
        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const response = await getAllPaginatedBadges(params);
        if (!isMounted) return;

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

        let container = isPageContainer(rootData)
          ? rootData
          : isPageContainer(rootPayload)
            ? rootPayload
            : rootPayload;

        if (
          container?.data &&
          typeof container.data === "object" &&
          !Array.isArray(container.data) &&
          isPageContainer(container.data)
        ) {
          container = container.data;
        }

        const list = Array.isArray(container?.data)
          ? container.data
          : Array.isArray(container)
            ? container
            : [];
        const normalized = list.map(normalizeBadge).filter(Boolean);

        const resolvedCurrent = Number(container?.current_page ?? currentPage);
        const resolvedPerPage = Number(container?.per_page ?? rowsPerPage);
        const resolvedTotal = Number(container?.total ?? normalized.length);
        const resolvedLast = Number(
          container?.last_page ??
            Math.max(
              1,
              Math.ceil(resolvedTotal / Math.max(1, resolvedPerPage)),
            ),
        );
        const resolvedFrom =
          Number(container?.from) ||
          (normalized.length ? (resolvedCurrent - 1) * resolvedPerPage + 1 : 0);
        const resolvedTo =
          Number(container?.to) ||
          (normalized.length ? resolvedFrom + normalized.length - 1 : 0);

        setRecords(normalized);
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
          err?.message || "Failed to load badges. Please try again.";
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
  }, [currentPage, rowsPerPage, searchQuery, refreshKey]);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const confirmDelete = async (id) => {
    try {
      await deleteBadgeById(id);
      toast.success("Badge deleted successfully.");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const message =
        err?.message || "Failed to delete badge. Please try again.";
      toast.error(message);
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const from = pagination.from ?? 0;
  const to = pagination.to ?? 0;
  const hasSearch = Boolean(searchQuery.trim());

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Badges List</h1>
          <p className="text-slate-600 text-md">
            Manage badge rules, metadata, and icon assets.
          </p>
        </div>
        <div className="dh-right">
          <AdminActionLink
            module="badges"
            action="create"
            to="/admin/badges-form"
            className="global-btn"
          >
            Add New Badge <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder="Search by code, name, metric, scope..."
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          showSearch
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          from={from}
          to={to}
          onPageChange={setCurrentPage}
          loading={loading}
        />

        {error && (
          <Alert variant="destructive" className="alert-custom mb-4">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <Table className="global-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading badges...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-6">
                  {hasSearch
                    ? "No badges match your search."
                    : "No badges found."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => {
                const iconUrl = resolveIconUrl(row.photo_icon);
                return (
                  <TableRow key={row.id ?? index}>
                    <TableCell className="font-medium">
                      {(from || 1) + index}
                    </TableCell>
                    <TableCell>
                      {iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={row.name || "Badge icon"}
                          className="h-10 w-10 rounded-md object-cover border border-slate-200"
                        />
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{row.code || "-"}</TableCell>
                    <TableCell>{row.name || "-"}</TableCell>
                    <TableCell>{row.type || "-"}</TableCell>
                    <TableCell>{row.scope || "-"}</TableCell>
                    <TableCell>{row.metric || "-"}</TableCell>
                    <TableCell>
                      {`${row.operator || ""} ${row.threshold ?? ""}`.trim() ||
                        "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-2xl text-xs border capitalize ${
                            row.active
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {row.active ? "active" : "inactive"}
                        </span>
                        {row.is_repeatable ? (
                          <span className="px-2 py-1 rounded-2xl text-xs border bg-blue-100 text-blue-700 border-blue-200">
                            repeatable
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{formatDateSafe(row.created_at)}</TableCell>
                    <TableCell>
                      <div className="table-actions">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AdminActionLink
                              className="edit-btn"
                              to={`/admin/badges-form/${row.id ?? ""}`}
                              state={{ badge: row.raw, badgeId: row.id }}
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
                                permanently delete this badge.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => confirmDelete(row.id)}
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

export default BadgesList;

