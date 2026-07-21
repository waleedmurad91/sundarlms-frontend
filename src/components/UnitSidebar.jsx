import { getBucketKey } from "@/utils/GetBucketKey";
import { ChevronRight, Menu, User2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const MOBILE_BREAKPOINT = 1023;

const getUnitProgress = (topics = []) => {
  if (!topics.length) return 0;
  const completed = topics.filter(
    (topic) => getBucketKey(topic.mastery_level) === "Mastered",
  );
  return Math.round((completed.length / topics.length) * 100);
};

const resolveGradeLabel = (gradeName, gradeId) => {
  if (gradeName && String(gradeName).trim().length > 0) {
    return String(gradeName).trim();
  }
  if (gradeId !== null && gradeId !== undefined) {
    return `Grade ${gradeId}`;
  }
  return null;
};

const countSkills = (units = []) =>
  units.reduce(
    (sum, unit) => sum + (Array.isArray(unit?.topics) ? unit.topics.length : 0),
    0,
  );

export const UnitSidebar = ({
  units = [],
  activeUnitKey,
  onSelectUnit,
  subjectName,
  subjectId,
  gradeName,
  gradeId,
  totalUnits,
  totalSkills,
  courseLink,
  onSelectCourse,
}) => {
  // Controls whether the mobile/tablet drawer is open
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Tracks whether current viewport width should use the mobile/tablet
  // hamburger layout (true) or the full desktop sidebar (false).
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined"
      ? window.innerWidth <= MOBILE_BREAKPOINT
      : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!units.length) {
    return (
      <aside className="border border-slate-100 bg-white p-6 text-sm text-slate-500">
        No units available for this subject yet.
      </aside>
    );
  }

  const resolvedUnitsCount =
    totalUnits ?? (Array.isArray(units) ? units.length : units);
  const resolvedSkillsCount =
    totalSkills ?? countSkills(Array.isArray(units) ? units : []);
  const unitLabel = `${resolvedUnitsCount} ${
    resolvedUnitsCount === 1 ? "Unit" : "Units"
  }`;
  const skillLabel = `${resolvedSkillsCount} ${
    resolvedSkillsCount === 1 ? "Skill" : "Skills"
  }`;
  const headerLabel = [resolveGradeLabel(`Grade ${gradeName}`), subjectName]
    .filter(Boolean)
    .join(" - ");

  const closeMobile = () => setIsMobileOpen(false);

  const sidebarBody = (
    <div className="unitsidebar-wrap">
      <Link
        className={`uss-content ${activeUnitKey ? "" : "active"}`}
        to={
          courseLink
            ? courseLink
            : subjectId
              ? `/student/practice/course-overview/${subjectId}`
              : "#"
        }
        onClick={() => {
          onSelectCourse?.();
          closeMobile();
        }}
      >
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {headerLabel || subjectName || "Subject"}
          </h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {unitLabel} - {skillLabel}
          </p>
        </div>
      </Link>

      <div className="divide-y divide-slate-100">
        {units.map((unit, index) => {
          const topics = Array.isArray(unit?.topics) ? unit.topics : [];
          const normalizedKey =
            unit.unit_id !== undefined && unit.unit_id !== null
              ? String(unit.unit_id)
              : unit.key !== undefined && unit.key !== null
                ? String(unit.key)
                : String(index);
          const isActive = String(activeUnitKey ?? "") === normalizedKey;
          const to = `/student/practice/unit/${normalizedKey}`;
          return (
            <Link
              key={normalizedKey}
              to={to}
              onClick={() => {
                onSelectUnit?.(normalizedKey);
                closeMobile();
              }}
              className={`text-left transition uss-sidebarLinks ${
                isActive ? "active" : ""
              }`}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Unit {index + 1}
                </p>
                <p className="text-[17px] font-semibold uss-unitname">
                  {unit.unit_name}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Top bar: shown only in mobile/tablet view */}
      {isMobileView && (
        <div className="flex items-center justify-between border border-slate-100 bg-white px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {headerLabel || subjectName || "Subject"}
            </h3>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {unitLabel} - {skillLabel}
            </p>
          </div>
          <button
            type="button"
            aria-label="Open unit list"
            onClick={() => setIsMobileOpen(true)}
            className="ml-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Desktop sidebar: shown only when NOT in mobile/tablet view */}
      {!isMobileView && (
        <aside className="unitsidebar-std">{sidebarBody}</aside>
      )}

      {/* Mobile/tablet overlay + drawer */}
      {isMobileView && (
        <div
          className={`fixed inset-0 z-40 ${
            isMobileOpen ? "" : "pointer-events-none"
          }`}
          aria-hidden={!isMobileOpen}
        >
          {/* Backdrop */}
          <div
            onClick={closeMobile}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              isMobileOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Drawer panel sliding from left to right */}
          <aside
            className={`unitsidebar-std absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-white shadow-xl transition-transform duration-300 ease-out ${
              isMobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">
                Units
              </span>
              <button
                type="button"
                aria-label="Close unit list"
                onClick={closeMobile}
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
};