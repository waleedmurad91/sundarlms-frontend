import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import ProgressBar from "./ProgressBar";
import UnitSection from "./UnitSection";

const SubjectSection = ({ subject }) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((p) => !p);

  const mastery = subject?.mastery || {};

  return (
    <div className="activity-subject-body">
      <div className="activity-subject-header">
        <div className="w-[35%]">
          <span>Subject</span>
        </div>
        <div className="w-[10%] text-right">
          <span>Familiar</span>
        </div>
        <div className="w-[10%] text-right">
          <span>Proficient</span>
        </div>
        <div className="w-[10%] text-right">
          <span>Mastered</span>
        </div>
        <div className="w-[35%]">
          <span>Proficiency</span>
        </div>
      </div>

      <div className="activity-subject-content">
        <div className="w-[35%]">
          <div className="flex collapse-wrap-subject">
            <button className="collapse-button-subject" onClick={toggle}>
              {expanded ? (
                <ChevronDown className="text-slate-400" />
              ) : (
                <ChevronRight className="text-slate-400" />
              )}
            </button>
            <h3>
              {subject.subject} - {`${subject.mastery.overall_progress} %`}
            </h3>
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
      </div>

      {expanded && (
        <div className="activity-unit-body">
          <div className="activity-unit-header">
            <div className="w-[35%]">
              <span className="activity-body-unit-title">Unit</span>
            </div>
            <div className="w-[10%] text-right">
              <span>Familiar</span>
            </div>
            <div className="w-[10%] text-right">
              <span>Proficient</span>
            </div>
            <div className="w-[10%] text-right">
              <span>Mastered</span>
            </div>
            <div className="w-[35%]">
              <span>Proficiency</span>
            </div>
          </div>
          <div>
            {(subject.units || []).map((unit) => (
              <UnitSection key={unit.unit_id} unit={unit} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectSection;
