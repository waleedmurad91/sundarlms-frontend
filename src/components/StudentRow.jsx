import React, { useState } from "react";
import { ChevronDown, ChevronRight, CircleUserRound } from "lucide-react";
import ProgressBar from "./ProgressBar";
import SubjectSection from "./SubjectSection";

const StudentRow = ({ studentData }) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((p) => !p);

  const student = studentData?.student || {};
  const subject = studentData?.subject || {};
  const mastery = studentData?.mastery || {};

  return (
    <div className="activity-main-row">
      <div className="activity-main-header-row">
        <div className="w-[35%]">
          <div className="flex collapse-wrap">
            <button className="collapse-button" onClick={toggle}>
              {expanded ? (
                <ChevronDown className="text-slate-400" />
              ) : (
                <ChevronRight className="text-slate-400" />
              )}
            </button>
            <h1>{student.name}</h1>
            <CircleUserRound className="text-[#A22038]" />
          </div>
        </div>

        {/* Numeric values from API */}
        <div className="w-[10%] text-right">
          <span>{student.learning_minutes ?? "-"}</span>
        </div>
        <div className="w-[10%] text-right">
          <span>{student.skills_worked_on ?? 0}</span>
        </div>
        <div className="w-[10%] text-right">
          <span>{student.skills_leveled_up ?? 0}</span>
        </div>
        <div className="w-[35%]">
          <ProgressBar mastery={mastery} size="lg" />
        </div>
      </div>

      {/* Expand subjects */}
      {expanded && <SubjectSection subject={subject} />}
    </div>
  );
};

export default StudentRow;
