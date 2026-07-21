import React from "react";
import { UnitSidebar } from "@/components/UnitSidebar";

const PracticeTwoPane = ({
  units = [],
  activeUnitKey,
  onSelectUnit,
  subjectName,
  subjectId,
  gradeName,
  gradeId,
  totalUnits,
  totalSkills,
  children,
}) => {
  return (
    <div className="bg-[#FBFBFB]">
      <div className="grid lg:grid-cols-[380px_1fr]">
        <UnitSidebar
          units={units}
          activeUnitKey={activeUnitKey}
          onSelectUnit={onSelectUnit}
          subjectName={subjectName}
          subjectId={subjectId}
          gradeName={gradeName}
          gradeId={gradeId}
          totalUnits={totalUnits}
          totalSkills={totalSkills}
        />
        <div className="space-y-6 pl-8 pr-14 pb-[4rem] bg-[#FBFBFB]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PracticeTwoPane;
