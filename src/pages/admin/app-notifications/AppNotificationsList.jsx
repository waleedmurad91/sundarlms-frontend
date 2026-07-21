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
  Clock,
  Eye,
  Loader2,
  PlusCircleIcon,
  TriangleAlert,
  Users,
} from "lucide-react";
import { AdminActionLink } from "@/components/admin/AdminActionControls";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import { listPushNotificationBatches } from "@/api/appNotificationsApi";

const TARGET_TYPE_LABELS = {
  topic: "All Users",
  token: "Device token",
  user: "Application user",
  audience: "Filtered audience",
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM dd, yyyy h:mm a");
  } catch {
    return value;
  }
};

const StatusBadge = ({ total, sent, failed, pending }) => {
  if (pending > 0) {
    return (
      <span className="text-amber-600 bg-amber-100 rounded-2xl text-[11px] py-0.5 px-2 font-bold inline-flex gap-1 items-center">
        <Clock size={13} />
        Pending
      </span>
    );
  }
  if (failed > 0) {
    return (
      <span className="text-rose-600 bg-rose-100 rounded-2xl text-[11px] py-0.5 px-2 font-bold inline-flex gap-1 items-center">
        <TriangleAlert size={13} />
        {sent}/{total} sent
      </span>
    );
  }
  return (
    <span className="text-green-600 bg-green-100 rounded-2xl text-[11px] py-0.5 px-2 font-bold inline-flex gap-1 items-center">
      <Check size={14} />
      Sent
    </span>
  );
};

const AppNotificationsList = () => {
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await listPushNotificationBatches({
          perPage: rowsPerPage,
        });
        if (!isMounted) return;

        const data = Array.isArray(response?.data) ? response.data : [];
        setRecords(data);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load notification history. Please try again.";
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
  }, [rowsPerPage]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const filteredRecords = React.useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return records;
    return records.filter(
      (row) =>
        row?.title?.toLowerCase().includes(query) ||
        row?.body?.toLowerCase().includes(query),
    );
  }, [records, debouncedSearch]);

  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const from = totalItems ? (currentPage - 1) * rowsPerPage + 1 : 0;
  const to = Math.min(currentPage * rowsPerPage, totalItems);
  const pagedRecords = filteredRecords.slice(from - 1, to);
  const hasSearchQuery = Boolean(debouncedSearch.trim());

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Sent Push Notifications</h1>
          <p className="text-slate-600 text-md">
            History of push notifications sent to users.
          </p>
        </div>
        <div className="dh-right">
          <AdminActionLink
            module="push_notifications"
            action="create"
            to="/admin/send-app-notifications"
            className="global-btn"
          >
            Send Notification <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder="Search title or message..."
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
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
              <TableHead>Message</TableHead>
              <TableHead>Sent to</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent at</TableHead>
              <TableHead>Action</TableHead>
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
            ) : pagedRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  {hasSearchQuery
                    ? "No notifications match your search."
                    : "No notifications have been sent yet."}
                </TableCell>
              </TableRow>
            ) : (
              pagedRecords.map((row, index) => (
                <TableRow key={row.batch_id ?? index}>
                  <TableCell className="font-medium">{from + index}</TableCell>
                  <TableCell>{row?.title}</TableCell>
                  <TableCell className="max-w-[280px] truncate">
                    {row?.body}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      {row?.target_type === "audience" && <Users size={13} />}
                      {TARGET_TYPE_LABELS[row?.target_type] ??
                        row?.target_type ??
                        "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row?.sent ?? 0}/{row?.total ?? 0}
                    {row?.failed ? (
                      <span className="text-rose-500">
                        {" "}
                        ({row.failed} failed)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      total={row?.total ?? 0}
                      sent={row?.sent ?? 0}
                      failed={row?.failed ?? 0}
                      pending={row?.pending ?? 0}
                    />
                  </TableCell>
                  <TableCell>
                    {formatDate(row?.last_sent_at ?? row?.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="table-actions">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AdminActionLink
                            className="view-btn"
                            to={`/admin/app-notifications/batches/${row?.batch_id}`}
                            state={{ batchId: row?.batch_id, batch: row }}
                          >
                            <Eye size={15} />
                          </AdminActionLink>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View delivery details</p>
                        </TooltipContent>
                      </Tooltip>
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

export default AppNotificationsList;
