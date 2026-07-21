import React from "react";
import { AdminActionLink } from "@/components/admin/AdminActionControls";
import { format } from "date-fns";
import {
  AlertCircleIcon,
  Download,
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
import ListToolbar from "@/components/ListToolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getFeedbackSurveys } from "@/api/feedbackApi";
import { exportTableData } from "@/api/exportApi";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const normalizeFeedback = (payload) => {
  const data = payload?.data ?? payload ?? {};
  if (!data) return null;

  return {
    id: data?.id ?? data?._id ?? null,
    name: data?.student?.name ?? "",
    friendliness: data?.overall_user_friendliness ?? "",
    issue: data?.technical_issue_frequency ?? "",
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

const FeedbackList = () => {
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isExporting, setIsExporting] = React.useState(false);

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

        const response = await getFeedbackSurveys(params);
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
        const normalized = list.map(normalizeFeedback).filter(Boolean);

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
        console.log(normalized);
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

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const from = pagination.from ?? 0;
  const to = pagination.to ?? 0;
  const hasSearch = Boolean(searchQuery.trim());

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportTableData("ilm-feedback-surveys");
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
        : `feedback_${Date.now()}.${fallbackExtension}`;

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
        err?.message || "Unable to export feedback data right now.";
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
          <h1>Feedback Surveys List</h1>
          <p className="text-slate-600 text-md">
            Manage feedback survey rules, metadata, and icon assets.
          </p>
        </div>
        <div className="dh-right">
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
                Export Data
              </>
            )}
          </button>
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
              <TableHead>Name</TableHead>
              <TableHead>Friendliness?</TableHead>
              <TableHead>Issues?</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading feedback surveys...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  {hasSearch
                    ? "No feedback surveys match your search."
                    : "No feedback surveys found."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => {
                return (
                  <TableRow key={row.id ?? index}>
                    <TableCell className="font-medium">
                      {(from || 1) + index}
                    </TableCell>
                    <TableCell>{row?.name || "-"}</TableCell>
                    <TableCell>{row?.friendliness || "-"}</TableCell>
                    <TableCell>{row?.issue || "-"}</TableCell>
                    <TableCell>{formatDateSafe(row.created_at)}</TableCell>
                    <TableCell>
                      <div className="table-actions">
                        <Tooltip>
                          <TooltipTrigger>
                            <AdminActionLink
                              className="view-btn"
                              to={`/admin/view-feedback-detail/${
                                row?._id ?? row?.id ?? ""
                              }`}
                              state={{
                                feedbackId: row?._id ?? row?.id,
                                feedback: row,
                              }}
                            >
                              <Eye size={15} />
                            </AdminActionLink>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Detail</p>
                          </TooltipContent>
                        </Tooltip>
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

export default FeedbackList;
