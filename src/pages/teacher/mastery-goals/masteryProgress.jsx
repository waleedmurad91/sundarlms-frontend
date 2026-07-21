import React from "react";
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
import { AlertCircleIcon, Loader2 } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import { useAuthStore } from "@/store/auth";
import { getMasteryProgress } from "@/api/masteryAssignmentApi";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

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

const getSearchableValue = (value) =>
  typeof value === "string" ? value.toLowerCase() : "";

const filterMasteryProgress = (records, query) => {
  const term = query.trim().toLowerCase();
  if (!term) {
    return records;
  }

  return records.filter((item) => {
    const haystack = [
      getSearchableValue(item?.title),
      getSearchableValue(item?.unit),
      getSearchableValue(item?.due_date),
      getSearchableValue(item?.goal_progress),
    ];

    return haystack.some((value) => value.includes(term));
  });
};

const getAssignmentCoverSrc = (images) => {
  const path = extractFirstImagePath(images);
  return buildBackendFileUrl(path);
};

const MasteryProgress = () => {
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
        const response = await getMasteryProgress(teacherId);
        const all = resolveAssignments(response);
        setData(all);
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
  }, [teacherId]);

  const filtered = React.useMemo(
    () => filterMasteryProgress(data, search),
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

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Teacher Dasboard</h4>
          <h1>Mastery Goal Progress</h1>
          <p className="text-slate-600 text-md">
            Here are the unit mastery goals your students are currently working
            on.
          </p>
        </div>
        <div className="dh-right" />
      </div>

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder={`Search by title, status, unit or topic...`}
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
              <TableHead>Mastery Goals</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Goal Progress</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  No data found.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  No result match your search.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const coverSrc = getAssignmentCoverSrc(row?.images);
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex gap-2">
                        <div className="mp-image">
                          {coverSrc ? (
                            <img
                              src={coverSrc}
                              alt={row?.title ?? "Unit"}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-full bg-slate-200" />
                          )}
                        </div>
                        <div className="mp-content">
                          <h2 className="font-bold">{row?.title || "--"}</h2>
                          <h5 className="text-slate-500">
                            Unit: {row?.unit || "--"}
                          </h5>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{row?.assigned_to}</TableCell>
                    <TableCell>
                      {row?.due_date
                        ? format(new Date(row?.due_date), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-[#A22038] font-bold">
                        {row?.goal_progress}
                      </span>
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

export default MasteryProgress;
