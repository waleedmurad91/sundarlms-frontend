import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { useAuthStore } from "@/store/auth";
import { resolveRoleNavigation } from "@/utils/roleLinks";
import {
  CONTEST_ROUTE,
  getContestPromptState,
  isContestGateExemptPath,
  readContestRegistrationRequired,
} from "@/utils/studentContestAccess";

const ACCOUNT_LINKS = []; // Deprecated - using dynamic navigation from backend

const formatSubjectLabel = (subject) => {
  if (!subject) {
    return "Subject";
  }

  const gradeLabel = subject.grade_name
    ? `${subject.grade_name} Grade`
    : subject.grade_id
      ? `${subject.grade_id} Grade`
      : "";
  const subjectName = subject.subject_name ?? "";
  const labelParts = [gradeLabel, subjectName].filter(Boolean);

  return labelParts.join(" ").trim() || "Subject";
};

export const StudentSidebar = () => {
  const {
    subjects,
    activeSubjectKey,
    setActiveSubjectKey,
    student: portalStudent,
  } = useStudentPortal();
  const { student: authStudent, navigation } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve dynamic navigation from backend
  const accountSections = resolveRoleNavigation({
    role: "student",
    navigation,
  });

  // Prefer student-portal payload, then fall back to auth payload.
  const rawConsentOptIn =
    portalStudent?.rmc_join_opt_in ?? authStudent?.rmc_join_opt_in;
  const consentOptIn = rawConsentOptIn === "null" ? null : rawConsentOptIn;
  const showConsentPendingDot = consentOptIn === null;

  const handleSubjectClick = (subject) => {
    setActiveSubjectKey(subject.key);
    if (location.pathname !== "/student/dashboard") {
      if (readContestRegistrationRequired() === true) {
        navigate(CONTEST_ROUTE, {
          state: getContestPromptState("/student/dashboard"),
        });
        return;
      }

      navigate("/student/dashboard");
    }
  };

  const handleAccountLinkClick = (event, item) => {
    const linkPath = item.path || item.to || "#";
    if (linkPath === CONTEST_ROUTE || isContestGateExemptPath(linkPath)) return;

    if (readContestRegistrationRequired() === true) {
      event.preventDefault();
      navigate(CONTEST_ROUTE, {
        state: getContestPromptState(linkPath),
      });
    }
  };

  return (
    <aside className="border-b border-slate-100 p-5 pr-0 text-sm lg:border-b-0 lg:border-r mt-2 w-full md:w-[28em]">
      <div className="mb-6 hidden">
        <p className="text-[12px] ml-4 font-semibold uppercase tracking-wide text-slate-500">
          My Classes
        </p>
        <div className="mt-3 space-y-1">
          {subjects.length === 0 ? (
            <div className="px-5 py-3 text-sm text-slate-500">
              No subjects assigned yet.
            </div>
          ) : (
            subjects.map((subject) => {
              const isActive = subject.key === activeSubjectKey;
              return (
                <button
                  key={subject.key}
                  type="button"
                  onClick={() => handleSubjectClick(subject)}
                  className={`flex w-full items-center justify-between border-l-4 border-transparent px-5 py-3 text-left transition ${
                    isActive
                      ? "bg-[#f8f8f8] font-semibold text-[#ad474b] border-[#ad474b]"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{formatSubjectLabel(subject)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div>
        {accountSections.map((section) => (
          <div key={section.section} className="mb-6">
            <p className="text-[12px] ml-4 font-semibold uppercase tracking-wide text-slate-500">
              {section.section}
            </p>
            <div className="mt-3 space-y-1">
              {section.items.map((item) => {
                const linkPath = item.path || item.to || "#";
                const isActive = location.pathname === linkPath;
                // Check if this is the consent/rmc link to show pending dot
                const isConsentLink =
                  item.key === "consent" ||
                  linkPath.includes("rmc") ||
                  item.label?.toLowerCase().includes("rmc") ||
                  item.label?.toLowerCase().includes("consent") ||
                  item.path?.includes("consent");
                return (
                  <Link
                    key={item.key || item.path || item.label}
                    to={linkPath}
                    onClick={(event) => handleAccountLinkClick(event, item)}
                    className={`flex w-full items-center justify-between px-5 py-3 text-[15px] border-l-4 border-transparent text-left transition ${
                      isActive
                        ? "bg-[#f8f8f8] font-semibold text-[#ad474b] border-l-[#ad474b]"
                        : "text-slate-600 hover:text-[#ad474b] hover:bg-[#f8f8f8]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {isConsentLink && showConsentPendingDot ? (
                      <span className="relative ml-2 inline-flex h-3 w-3 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              {/* <a
                href="https://drive.google.com/drive/folders/1yUCPiFhFYiIYwfDEUvhOWdpG7HYbBDjY?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-full items-center justify-between px-5 py-3 text-[15px] border-l-4 border-transparent text-left transition text-slate-600 hover:text-[#ad474b] hover:bg-[#f8f8f8]`}
              >
                Practice Resources
              </a> */}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
