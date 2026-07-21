import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { File, Loader2 } from "lucide-react";
import {
  StudentPortalProvider,
  useStudentPortal,
} from "@/context/StudentPortalContext";
import { StudentStreakBar } from "@/components/StudentStreakBar";
import { StudentHeaderCard } from "@/components/StudentHeaderCard";
import { StudentSidebar } from "@/components/StudentSidebar";
import axiosInstance from "@/api/axiosInstance";
import { renderMediaEmbeds } from "@/utils/renderMediaEmbeds";

const SKILL_TARGET = 8;

const resolveLocalizedPageContent = (data, language) => {
  if (!data) {
    return { title: "", description: "", isLocalized: false };
  }

  if (language === "ur") {
    const title = data.title_urdu || "";
    const description = data.description_urdu || "";
    return {
      title: title || data.title || "",
      description: description || data.description || "",
      isLocalized: !!(title || description),
    };
  }

  if (language === "sd") {
    const title = data.title_sindhi || "";
    const description = data.description_sindhi || "";
    return {
      title: title || data.title || "",
      description: description || data.description || "",
      isLocalized: !!(title || description),
    };
  }

  return {
    title: data.title || "",
    description: data.description || "",
    isLocalized: false,
  };
};

const StudentPortalShell = () => {
  // for fetching the page title and description
  const fetchPageContent = async (pageKey) => {
    try {
      const res = await axiosInstance.get(`/page-content/${pageKey}`);
      return res.data.data; // { id, page_key, title, description }
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  };
  const [pageContentData, setPageContentData] = React.useState(null);

  React.useEffect(() => {
    fetchPageContent("courses").then((data) => {
      if (data) setPageContentData(data);
    });
  }, []);
  const { student, loading, error, refresh, hasDashboardData, language } =
    useStudentPortal();
  const pageContent = React.useMemo(
    () => resolveLocalizedPageContent(pageContentData, language),
    [pageContentData, language],
  );
  const isRtl =
    (language === "ur" || language === "sd") && pageContent.isLocalized;
  const location = useLocation();
  const bypassPortalLoader = location.pathname === "/student/contest";

  const resolvedPoints = student?.points ?? 0;
  const skillsCompleted = Math.min(
    Math.round(resolvedPoints / 50),
    SKILL_TARGET,
  );
  const skillPercent = Math.min((skillsCompleted / SKILL_TARGET) * 100, 100);

  return (
    <div className="pb-10">
      <StudentStreakBar
        student={student}
        skillPercent={skillPercent}
        skillsCompleted={skillsCompleted}
        skillTarget={SKILL_TARGET}
      />

      <div className="bg-white">
        <StudentHeaderCard student={student} />
        <div className="flex flex-col md:flex-row border-t border-slate-100 stdLayout">
          {/* <StudentSidebar /> */}
          <div className="space-y-6 p-6 !pt-0 !pl-0 !pr-0 sm:p-8 w-full">
            {location.pathname == "/student/dashboard" ? (
              <div
                className={`student-dashboard-hero w-full min-w-0 ${
                  isRtl ? "student-dashboard-hero--rtl" : ""
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1440 320"
                  preserveAspectRatio="none"
                  className="svg-wave"
                  aria-hidden="true"
                >
                  <path
                    fill="#e9e9eb33"
                    fillOpacity="1"
                    d="M0,288L48,288C96,288,192,288,288,256C384,224,480,160,576,165.3C672,171,768,245,864,266.7C960,288,1056,256,1152,224C1248,192,1344,160,1392,144L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
                  ></path>
                </svg>
                <div
                  className={`header-wave-content w-full max-w-full min-w-0 break-words ${
                    isRtl ? (language==="ur"? "font-nastaleeq text-right" : "font-lateefi text-right") : ""
                  }`}
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  <h1
                    className={`text-[25px] font-bold break-words ${
                      isRtl ? "mb-3" : ""
                    }`}
                  >
                    {pageContent.title}
                  </h1>
                  <div
                    className="student-dashboard-hero__description ck-editor-text text-gray-500 break-words"
                    dangerouslySetInnerHTML={{
                      __html: renderMediaEmbeds(pageContent.description),
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="pt-5"></div>
            )}
            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
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

            {loading && !hasDashboardData && !bypassPortalLoader ? (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentPortalLayout = () => (
  <StudentPortalProvider>
    <StudentPortalShell />
  </StudentPortalProvider>
);

export default StudentPortalLayout;
