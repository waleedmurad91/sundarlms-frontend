import React from "react";
import ProgressBar from "./ProgressBar";

const AssignmentSection = ({ assignments }) => {
  if (!assignments?.length) return null;

  const uniqueAssignments = Array.from(
    new Map(assignments.map((a) => [a.assignment_id, a])).values()
  );

  return (
    <div className="activity-assignment-body">
      {/* Header Row */}
      <div className="activity-assignment-header">
        <div className="w-[35%]">
          <span className="activity-body-assignment-title">Assignment</span>
        </div>
        <div className="w-[10%] text-right">
          <span>Time</span>
        </div>
        <div className="w-[10%] text-right">
          <span>Points</span>
        </div>
        <div className="w-[10%] text-right">
          <span>Level</span>
        </div>
        <div className="w-[35%]">
          <span>Proficiency</span>
        </div>
      </div>

      {/* Assignment Rows */}
      {uniqueAssignments.map((a) => {
        const level = a?.level?.toLowerCase?.() || "";

        const mastery = {
          attempted: a?.percentages?.attempted ? 1 : 0,
          familiar: a?.percentages?.familiar ? 1 : 0,
          proficient: a?.percentages?.proficient ? 1 : 0,
          mastered: a?.percentages?.mastered ? 1 : 0,
          percentages: a?.percentages || {},
        };

        const showProgress =
          level !== "not_attempted" && level !== "not attempted";

        return (
          <div className="activity-assignment-content" key={a.assignment_id}>
            <div className="w-[35%]">
              <div className="flex collapse-wrap-assignment">
                <h3>{a.title}</h3>
              </div>
            </div>

            <div className="w-[10%] text-right">
              <span>{a.time_spent ?? 0} mins</span>
            </div>

            <div className="w-[10%] text-right">
              <span>{a.points ?? 0}</span>
            </div>

            <div className="w-[10%] text-right">
              <span>
                {level === "not_attempted" || level === "not attempted"
                  ? "Not Attempted"
                  : a.level ?? "-"}
              </span>
            </div>

            <div className="w-[35%]">
              {showProgress ? (
                <ProgressBar mastery={mastery} size="sm" />
              ) : (
                <span className="text-gray-400 italic">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AssignmentSection;
