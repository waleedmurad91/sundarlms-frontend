import React from "react";
import { Outlet } from "react-router-dom";
import {
  StudentPortalProvider,
  useStudentPortal,
} from "@/context/StudentPortalContext";
import { StudentStreakBar } from "@/components/StudentStreakBar";
import { Loader2 } from "lucide-react";
const SKILL_TARGET = 8;

const PracticeFlowShell = () => {
  const { student, loading, error, refresh, hasDashboardData } =
    useStudentPortal();

  const resolvedPoints = student?.points ?? 0;
  const skillsCompleted = Math.min(
    Math.round(resolvedPoints / 50),
    SKILL_TARGET
  );
  const skillPercent = Math.min((skillsCompleted / SKILL_TARGET) * 100, 100);

  return (
    <div className="">
      <StudentStreakBar
        student={student}
        skillPercent={skillPercent}
        skillsCompleted={skillsCompleted}
        skillTarget={SKILL_TARGET}
      />
      {error && (
        <div className="m-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button
            type="button"
            onClick={refresh}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}
      {loading && !hasDashboardData ? (
        <div className="m-6 flex h-48 items-center justify-center rounded-2xl border border-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  );
};

const PracticeFlowLayout = () => (
  <StudentPortalProvider>
    <PracticeFlowShell />
  </StudentPortalProvider>
);

export default PracticeFlowLayout;
