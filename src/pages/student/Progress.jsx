import React from "react";
import { useStudentPortal } from "@/context/StudentPortalContext";

const StudentProgress = () => {
  const { mastery_goals } = useStudentPortal();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Progress Overview
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Recent mastery goals
        </h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {mastery_goals.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            No mastery goals assigned yet.
          </div>
        )}
        {mastery_goals.map((goal) => (
          <div
            key={goal.id}
            className="rounded-2xl border border-slate-200 px-5 py-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-900">
              {goal.title}
            </p>
            <p className="text-xs text-slate-500">
              Due on {goal.due_date ?? "Not Announced Yet"}
            </p>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-[#A22038]"
                style={{ width: `${Math.min(goal.progress ?? 0, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-[#A22038]">
              {goal.progress ?? 0}% complete
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentProgress;
