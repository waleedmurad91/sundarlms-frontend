import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import { Link } from "react-router-dom";
import unitPlaceholder from "@/assets/unit-placeholder.png";

const formatDueDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(date);
};

const getAssignmentCoverSrc = (images) => {
  const path = extractFirstImagePath(images);
  return buildBackendFileUrl(path);
};

export const MasteryCard = ({ goal, disableLink = false }) => (
  <div className="rounded-sm shadow-sm border border-slate-200 p-6">
    <div className="flex items-center justify-between gap-3 mastery-card-wrap">
      <div className="mastery-unit-image">
        <div className="h-11 w-11">
          <img
            src={getAssignmentCoverSrc(goal.images) || unitPlaceholder}
            className="h-11 w-11 object-cover rounded-full"
          />
        </div>
      </div>
      <div className="mastery-title-std">
        {disableLink ? (
          <span className="text-[17px] font-semibold text-slate-700 capitalize">
            {goal.title}
          </span>
        ) : (
          <Link
            to={`/student/challenge/assignment/${
              goal.goal_id ?? goal.id
            }/starter${goal.attempted ? "?attempted=true" : ""}`}
            className="text-[17px] font-semibold text-slate-900 capitalize hover:underline"
          >
            {goal.title}
          </Link>
        )}
      </div>

      <div className="mastery-title-wrap">
        <p className="text-[14px] text-slate-700">
          Due on {formatDueDate(goal.due_date) ?? "Not Announced Yet"}
        </p>
        <div className="mt-3 h-5 w-full rounded-sm bg-slate-100">
          <div
            className="h-5 rounded-sm bg-[#A22038]"
            style={{ width: `${Math.min(goal.progress ?? 0, 100)}%` }}
          />
        </div>
        <p className="text-lg font-semibold text-[#A22038]">
          {goal.progress ?? 0}%
        </p>
      </div>
    </div>
  </div>
);

