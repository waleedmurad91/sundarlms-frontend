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
  CheckCircle,
  Loader2,
  Eye,
  XCircle,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import { useAuthStore } from "@/store/auth";
import { useNavigate } from "react-router-dom";
import {
  getAllEditRequests,
  approveEditRequest,
  rejectEditRequest,
} from "@/api/profileEditRequest";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const RequestLists = () => {
  const { role: storeRole, user } = useAuthStore();
  const navigate = useNavigate();
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const resolvedRoleValue = storeRole ?? user?.role;
  const normalizedRole =
    typeof resolvedRoleValue === "string"
      ? resolvedRoleValue.toLowerCase()
      : "admin";
  const isSchoolRole = normalizedRole === "school";
  const basePath = isSchoolRole ? "/school" : "/admin";
  const dashboardTitle = isSchoolRole ? "School Dashboard" : "Admin Dashboard";

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

        const response = await getAllEditRequests(params);
        if (!isMounted) return;

        const payload = response ?? {};
        const data = payload?.data ?? payload;

        let pageData = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

        const currentPageNum = Number(data?.current_page ?? params.page ?? 1);
        const perPageNum = Number(data?.per_page ?? params.per_page ?? 10);
        const totalNum = Number(data?.total ?? pageData.length);
        const lastPageNum = Number(data?.last_page ?? 1);
        const fromNum = Number(data?.from) || (pageData.length ? (currentPageNum - 1) * perPageNum + 1 : 0);
        const toNum = Number(data?.to) || (pageData.length ? fromNum + pageData.length - 1 : 0);

        setRecords(pageData);
        setPagination({
          current_page: currentPageNum,
          last_page: lastPageNum,
          per_page: perPageNum,
          total: totalNum,
          from: fromNum,
          to: toNum,
        });

        if (currentPage !== currentPageNum) {
          setCurrentPage(currentPageNum);
        }
        if (rowsPerPage !== perPageNum) {
          setRowsPerPage(perPageNum);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "Failed to load requests. Please try again.");
        toast.error(err?.message || "Failed to load requests. Please try again.");
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
  }, [currentPage, rowsPerPage, refreshKey]);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleApprove = async (requestId) => {
    try {
      await approveEditRequest(requestId, "approved");
      toast.success("Request approved successfully");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      toast.error(err?.message || "Failed to approve request");
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectEditRequest(requestId, "rejected");
      toast.success("Request rejected successfully");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      toast.error(err?.message || "Failed to reject request");
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;

  const getStatusBadge = (status) => {
    const statusLower = String(status || "").toLowerCase();
    switch (statusLower) {
      case "approved":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 border border-green-200">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 border border-red-200">
            Rejected
          </span>
        );
      case "pending":
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700 border border-yellow-200">
            Pending
          </span>
        );
    }
  };

  const getStudentName = (request) => {
    return (
      request?.student?.name ??
      request?.student?.user?.name ??
      request?.student?.student_name ??
      request?.student?.username ??
      "-"
    );
  };

  const getStudentEmail = (request) => {
    return request?.student?.email ?? request?.student?.user?.email ?? "-";
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{dashboardTitle}</h4>
          <h1>Profile Edit Requests</h1>
        </div>
      </div>

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
              <TableHead>Student Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Actions</TableHead>
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
                  No profile edit requests available.
                </TableCell>
              </TableRow>
            ) : (
              records.map((request, index) => {
                const requestId = request?.id ?? request?._id ?? index;
                const status = request?.status;
                return (
                  <TableRow key={requestId ?? index}>
                    <TableCell className="font-medium">
                      {baseRowNumber + index}
                    </TableCell>
                    <TableCell>{getStudentName(request)}</TableCell>
                    <TableCell>{getStudentEmail(request)}</TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell>
                      {request?.created_at
                        ? format(new Date(request.created_at), "MMM dd, yyyy - hh:mm a")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="table-actions">
                        <Tooltip>
                          <TooltipTrigger>
                            <button
                              className="view-btn"
                              onClick={() => navigate(`${basePath}/student-requests/${requestId}`)}
                            >
                              <Eye size={15} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Detail</p>
                          </TooltipContent>
                        </Tooltip>
                        {status?.toLowerCase() === "pending" && (
                          <>
                            <Tooltip>
                              <TooltipTrigger>
                                <button
                                  className="edit-btn"
                                  onClick={() => handleApprove(requestId)}
                                >
                                  <CheckCircle size={15} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Approve</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger>
                                <button
                                  className="delete-btn"
                                  onClick={() => handleReject(requestId)}
                                >
                                  <XCircle size={15} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reject</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
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

export default RequestLists;
