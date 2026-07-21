import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import ProgressBar from "./ProgressBar";
import AssignmentSection from "./AssignmentSection";

const UnitSection = ({ unit }) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((p) => !p);

  const mastery = unit?.mastery || {};
  const assignments = unit?.assignments || [];

  return (
    <div className="activity-unit-content">
      <div className="w-[35%]">
        <div className="flex collapse-wrap-unit">
          {/* <button className="collapse-button-unit" onClick={toggle}>
              {expanded ? (
                <ChevronDown className="text-slate-400" />
              ) : (
                <ChevronRight className="text-slate-400" />
              )}
            </button> */}
          <h3>{unit.unit_name}</h3>
        </div>
      </div>

      <div className="w-[10%] text-right">
        <span>{mastery.familiar ?? 0}</span>
      </div>
      <div className="w-[10%] text-right">
        <span>{mastery.proficient ?? 0}</span>
      </div>
      <div className="w-[10%] text-right">
        <span>{mastery.mastered ?? 0}</span>
      </div>
      <div className="w-[35%]">
        <ProgressBar mastery={mastery} size="sm" />
      </div>

      {expanded && <AssignmentSection assignments={assignments} />}
    </div>
  );
};

export default UnitSection;
