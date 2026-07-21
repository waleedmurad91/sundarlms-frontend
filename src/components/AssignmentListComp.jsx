import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircleIcon, Edit, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import { useAuthStore } from "@/store/auth";
import { getAllAssignments } from "@/api/masteryAssignmentApi";

/**
 * Normalize API response:
 * API returns { status: true, data: [ ...assignments ] }
 */
const resolveAssignments = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const getAssignmentId = (row) =>
  row?.id ?? row?._id ?? row?.assignment_id ?? row?.assignmentId ?? null;

// Safe lowercase for search
const lc = (v) => (typeof v === "string" ? v.toLowerCase() : "");

// Join helpers
const joinUnitNames = (units = []) =>
  Array.isArray(units) && units.length
    ? units.map((u) => u?.unit_name || u?.name || "—").join(", ")
    : "—";

const joinTopicNames = (topics = []) =>
  Array.isArray(topics) && topics.length
    ? topics.map((t) => t?.topic_name || t?.name || "—").join(", ")
    : "—";

/**
 * Filter records by search term across:
 * - title
 * - status
 * - assignment_type
 * - unit names
 * - topic names
 */
const filterAssignments = (records, query) => {
  const term = query.trim().toLowerCase();
  if (!term) return records;
  return records.filter((item) => {
    const haystack = [
      lc(item?.title),
      lc(item?.status),
      lc(item?.assignment_type),
      lc(joinUnitNames(item?.units)),
      lc(joinTopicNames(item?.topics)),
    ];
    return haystack.some((v) => v.includes(term));
  });
};

const AssignmentListComp = ({ type = "assignment" }) => {
  const { user } = useAuthStore();
  const teacherId = user?.id;

  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Fetch assignments
  React.useEffect(() => {
    const fetchData = async () => {
      if (!teacherId) return;
      setLoading(true);
      setError("");
      try {
        // NOTE: if your getAllAssignments signature expects id, pass it:
        // const response = await getAllAssignments(teacherId);
        const response = await getAllAssignments(teacherId);
        const all = resolveAssignments(response);

        // Filter by assignment_type (mastery | assignment)
        const filteredByType = all.filter(
          (row) =>
            String(row?.assignment_type || "").toLowerCase() ===
            String(type).toLowerCase()
        );

        setData(filteredByType);
      } catch (err) {
        const message =
          err?.message || "Failed to load assignments. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teacherId, type]);

  const filtered = React.useMemo(
    () => filterAssignments(data, search),
    [data, search]
  );

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, rowsPerPage]);

  React.useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filtered.slice(start, end);
  }, [filtered, currentPage, rowsPerPage]);

  const pageTitle = type === "mastery" ? "Mastery Goals" : "Assignments";

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Teacher Dashboard</h4>
          <h1>{pageTitle} List</h1>
        </div>
        <div className="dh-right" />
      </div>

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder={`Search ${pageTitle.toLowerCase()} by title, status, unit or topic...`}
          searchValue={search}
          onSearchChange={setSearch}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={setRowsPerPage}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          disabled={loading}
        />

        {error && (
          <Alert variant="destructive" className="alert-custom mb-3">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <Table className="global-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Topics</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6">
                  No {pageTitle.toLowerCase()} found.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6">
                  No {pageTitle.toLowerCase()} match your search.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const id = getAssignmentId(row);
                const unitsLabel = joinUnitNames(row?.units);
                const topicsLabel = joinTopicNames(row?.topics);
                const due = row?.due_date
                  ? (() => {
                      try {
                        return format(new Date(row.due_date), "MMM dd, yyyy");
                      } catch {
                        return row.due_date;
                      }
                    })()
                  : "—";
                const created = row?.created_at
                  ? format(new Date(row.created_at), "MMM dd, yyyy - hh:mm a")
                  : "—";
                const status = row?.status ? String(row.status) : "—";
                const aType = row?.assignment_type
                  ? String(row.assignment_type)
                  : "—";

                return (
                  <TableRow key={id ?? index}>
                    <TableCell className="font-medium">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell>{row?.title || "—"}</TableCell>
                    <TableCell>{unitsLabel}</TableCell>
                    <TableCell>{topicsLabel}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-2xl text-xs ${
                          status === "published"
                            ? "bg-green-100 text-green-700 border border-green-200 capitalize"
                            : "bg-yellow-100 text-yellow-700 border border-yellow-200 capitalize"
                        }`}
                      >
                        {status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-2xl text-xs ${
                          aType === "mastery"
                            ? "bg-indigo-100 text-indigo-700 border border-indigo-200 capitalize"
                            : "bg-blue-100 text-blue-700 border border-blue-200 capitalize"
                        }`}
                      >
                        {aType}
                      </span>
                    </TableCell>
                    <TableCell>{due}</TableCell>
                    <TableCell>{created}</TableCell>
                    <TableCell className="text-right">
                      <div className="table-actions">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              className="edit-btn"
                              to={
                                aType === "mastery"
                                  ? "/teacher/assign-mastery"
                                  : "/teacher/assign-assignment"
                              }
                              state={{
                                assignmentId: id,
                                assignment: row,
                                type,
                              }}
                            >
                              <Edit size={15} />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit</p>
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

export default AssignmentListComp;
