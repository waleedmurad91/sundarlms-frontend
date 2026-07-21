import { getAssignmentScore } from "@/api/masteryAssignmentApi";
import ListToolbar from "@/components/ListToolbar";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useAuthStore } from "@/store/auth";
import { AlertCircleIcon, Check, Loader2, X } from "lucide-react";
import React from "react";

const AssignmentScore = () => {
  const { user } = useAuthStore();
  const teacherId = user?.id;
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [assignmentData, setAssignmentData] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  React.useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        const res = await getAssignmentScore(teacherId);
        if (res?.status && Array.isArray(res?.data)) {
          setAssignmentData(res.data);
        } else {
          setError("Failed to load assignment scores.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to fetch assignment scores. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (teacherId) fetchTeacherData();
  }, [teacherId]);

  // ✅ Unique assignments for header (no duplicates)
  const allAssignments = Array.from(
    new Map(
      assignmentData.flatMap((s) => s.assignments || []).map((a) => [a.id, a])
    ).values()
  );

  const filterScores = React.useCallback((records, query) => {
    const term = query.trim().toLowerCase();
    if (!term) return records;

    return records.filter((item) =>
      item?.student?.name?.toLowerCase().includes(term)
    );
  }, []);

  const filteredScores = React.useMemo(
    () => filterScores(assignmentData, search),
    [assignmentData, search, filterScores]
  );

  const totalItems = filteredScores.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  React.useEffect(() => setCurrentPage(1), [search, rowsPerPage]);
  React.useEffect(
    () => setCurrentPage((prev) => Math.min(prev, totalPages)),
    [totalPages]
  );

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredScores.slice(start, end);
  }, [filteredScores, currentPage, rowsPerPage]);

  return (
    <>
      {error && (
        <Alert variant="destructive" className="alert-custom mb-4 bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Teacher Dashboard</h4>
          <h1>Assignment Scores</h1>
          <p className="text-slate-600 text-md">
            Here you will find how many students attempted each assignment.
          </p>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder="Search grade, section, or school..."
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
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        ) : (
          <div className="score-wrap">
            {/* Left Column - Students */}
            <div className="score-left">
              <div className="score-left-header">
                <h1>Students</h1>
              </div>
              <div className="score-left-body">
                {paginatedData.length > 0 ? (
                  paginatedData.map((data, index) => (
                    <h2 key={index}>{data?.student?.name}</h2>
                  ))
                ) : (
                  <p className="p-3 text-gray-500 text-sm">No students found</p>
                )}
              </div>
            </div>

            {/* Right Column - Assignments + Status */}
            <div className="score-right">
              {/* Header - Assignment titles (unique only) */}
              <div className="score-right-header">
                {allAssignments.length > 0 ? (
                  allAssignments.map((a) => (
                    <div key={a.id} className="assignment-title">
                      <p>{a.title}</p>
                      {a.due_date && (
                        <small>
                          {new Date(a.due_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </small>
                      )}
                    </div>
                  ))
                ) : (
                  <p>No Assignments</p>
                )}
              </div>

              {/* Body - Check/Close icons per student/assignment */}
              <div className="score-right-body">
                {paginatedData.length > 0 ? (
                  paginatedData.map((record, index) => (
                    <div key={index} className="score-row">
                      {allAssignments.map((a) => {
                        const studentAssignment = record.assignments?.find(
                          (sa) => sa.id === a.id
                        );
                        const status = studentAssignment?.status;
                        return (
                          <div
                            key={a.id}
                            className={`checker ${
                              status === "assigned"
                                ? "notAttempted"
                                : "attempted"
                            }`}
                          >
                            {status === "assigned" ? <X /> : <Check />}
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <p className="p-3 text-gray-500 text-sm">
                    No assignment data found
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AssignmentScore;
