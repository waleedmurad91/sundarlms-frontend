import { Link } from "react-router-dom";

const formatDueDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const AssignmentsTable = ({ assignments, disableLinks = false }) => (
  <div className="mt-8 overflow-x-auto">
    <table className="min-w-full text-sm assignment-std-table">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="pb-2 font-semibold">Assignment</th>
          <th className="pb-2 font-semibold">Due date & time</th>
          <th className="pb-2 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {assignments.length === 0 && (
          <tr>
            <td className="py-4 text-center text-slate-500" colSpan={3}>
              No assignments found.
            </td>
          </tr>
        )}
        {assignments.map((assignment) => (
          <tr
            key={assignment.id ?? assignment.assignment_id}
            className="border-b border-slate-100 text-slate-700 last:border-0 hover:bg-slate-50"
          >
            <td className="py-3 font-semibold text-[#A22038]">
              <div className="flex items-center gap-2 pl-4">
                {disableLinks ? (
                  <span className="flex gap-3 items-center text-[16px] text-slate-700">
                    {assignment.title}
                  </span>
                ) : (
                  <Link
                    to={`/student/challenge/assignment/${
                      assignment.assignment_id ?? assignment.id
                    }/starter${assignment.attempted ? "?attempted=true" : ""}`}
                    className="hover:underline flex gap-3 items-center"
                  >
                    <span className="text-[16px]">{assignment.title}</span>
                  </Link>
                )}
              </div>
            </td>
            <td className="py-3 text-[15px]">
              {formatDueDateTime(assignment.due_date) ?? ""}
            </td>
            <td className="py-3 capitalize text-[15px]">
              {assignment.status ?? "Assigned"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

