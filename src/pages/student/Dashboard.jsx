// import { useEffect, useMemo, useState } from "react";
// import {
//   ArrowRight,
//   BookOpen,
//   ChevronDown,
//   ChevronUp,
//   FileQuestionMark,
//   Folder,
//   Layers2,
//   Loader2,
// } from "lucide-react";
// import { Link, useNavigate } from "react-router-dom";
// import { useAuthStore } from "@/store/auth";
// import { useStudentPortal } from "@/context/StudentPortalContext";
// import { getActiveAssessments } from "@/api/assessmentApi";
// import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
// import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
// import FeedbackSurveyModal from "@/components/FeedbackSurveyModal";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// const COURSE_COLORS = [
//   "#810100",
//   "#2C6DB2",
//   "#30835B",
//   "#815CCF",
//   "#D6A12F",
//   "#C4332E",
// ];

// const isTruthyLike = (value) => {
//   if (value === true || value === 1) return true;
//   const normalized = String(value ?? "")
//     .trim()
//     .toLowerCase();
//   return ["true", "1", "yes"].includes(normalized);
// };

// const isAssessmentAttempted = (assessment) => {
//   const attemptedValue = assessment?.attempted;

//   if (
//     attemptedValue === null ||
//     attemptedValue === undefined ||
//     attemptedValue === ""
//   ) {
//     return false;
//   }

//   if (typeof attemptedValue === "object") {
//     return true;
//   }

//   return isTruthyLike(attemptedValue);
// };

// const getGradeLabel = (course) => {
//   const gradeName = String(course?.grade_name ?? "").trim();
//   if (gradeName) return gradeName;

//   const gradeId = String(course?.grade_id ?? "").trim();
//   return gradeId ? `Grade ${gradeId}` : "Other";
// };

// const GRADE_TAB_ORDER = [5, 4, 3];

// const getGradeOrderRank = (label) => {
//   const match = String(label ?? "").match(/\d+/);
//   const gradeNumber = match ? Number(match[0]) : null;
//   const orderIndex = GRADE_TAB_ORDER.indexOf(gradeNumber);

//   return orderIndex === -1 ? GRADE_TAB_ORDER.length : orderIndex;
// };

// const buildGradeTabs = (courses) => {
//   const gradeMap = new Map();

//   courses.forEach((course) => {
//     const label = getGradeLabel(course);
//     const value = label.toLowerCase();

//     if (!gradeMap.has(value)) {
//       gradeMap.set(value, { value, label, courses: [] });
//     }

//     gradeMap.get(value).courses.push(course);
//   });

//   return Array.from(gradeMap.values()).sort((a, b) => {
//     const rankDiff = getGradeOrderRank(a.label) - getGradeOrderRank(b.label);
//     if (rankDiff !== 0) return rankDiff;
//     return a.label.localeCompare(b.label);
//   });
// };

// const formatAssessmentDateTime = (value) => {
//   if (!value) return "";
//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return "";
//   return date.toLocaleString();
// };

// const StudentDashboard = () => {
//   const navigate = useNavigate();
//   const { user, school, updateUser, student } = useAuthStore();
//   const { courses, loading, hasDashboardData, language } = useStudentPortal();

//   const [activeAssessments, setActiveAssessments] = useState([]);
//   const [assessmentLoading, setAssessmentLoading] = useState(false);
//   const [assessmentError, setAssessmentError] = useState("");
//   const [showAllAssessments, setShowAllAssessments] = useState(false);
//   const [showFeedbackModal, setShowFeedbackModal] = useState(false);
//   const [activeGrade, setActiveGrade] = useState("");

//   const gradeTabs = useMemo(() => buildGradeTabs(courses), [courses]);
//   const selectedGrade = activeGrade || gradeTabs[0]?.value || "";

//   useEffect(() => {
//     if (!gradeTabs.length) {
//       setActiveGrade("");
//       return;
//     }

//     if (!gradeTabs.some((tab) => tab.value === activeGrade)) {
//       setActiveGrade(gradeTabs[0].value);
//     }
//   }, [gradeTabs, activeGrade]);

//   useEffect(() => {
//     let isActive = true;

//     const loadActiveAssessments = async () => {
//       try {
//         setAssessmentLoading(true);
//         setAssessmentError("");

//         const response = await getActiveAssessments();
//         const list = Array.isArray(response?.data)
//           ? response.data
//           : Array.isArray(response)
//             ? response
//             : [];

//         if (!isActive) return;
//         setActiveAssessments(list);
//       } catch (err) {
//         if (!isActive) return;
//         setAssessmentError(
//           err?.message || "Failed to load active assessments.",
//         );
//       } finally {
//         if (isActive) {
//           setAssessmentLoading(false);
//         }
//       }
//     };

//     loadActiveAssessments();

//     return () => {
//       isActive = false;
//     };
//   }, []);

//   const showInlineLoader = loading && hasDashboardData;

//   const availableAssessments = useMemo(
//     () =>
//       activeAssessments.filter(
//         (assessment) =>
//           isTruthyLike(assessment?.can_attempt) &&
//           !isAssessmentAttempted(assessment),
//       ),
//     [activeAssessments],
//   );

//   const nextAssessment = availableAssessments[0] ?? null;
//   const showStartAssessment = availableAssessments.length > 0;

//   useEffect(() => {
//     if (availableAssessments.length <= 1) {
//       setShowAllAssessments(false);
//     }
//   }, [availableAssessments.length]);

//   const handleStartAssessment = (assessment) => {
//     const assessmentId = assessment?.assessment_id;
//     if (assessmentId === undefined || assessmentId === null) {
//       return;
//     }

//     navigate(`/student/challenge/assessment/${assessmentId}/starter`, {
//       state: { assessment },
//     });
//   };

//   const masteryPercent = (value) => {
//     const numeric = Number(value);
//     if (Number.isNaN(numeric)) return 0;
//     const percent = Math.round(numeric);
//     if (percent < 0) return 0;
//     if (percent > 100) return 100;
//     return percent;
//   };

//   return (
//     <>
//       <div
//         className={
//           showStartAssessment
//             ? showAllAssessments
//               ? "space-y-10 pb-72"
//               : "space-y-10 pb-28"
//             : "space-y-10 "
//         }
//       >
//         {showInlineLoader && (
//           <div className="flex items-center gap-2 text-sm text-slate-500">
//             <Loader2 className="h-4 w-4 animate-spin" />
//             Updating your dashboard...
//           </div>
//         )}

//         {assessmentLoading && (
//           <div className="flex items-center gap-2 text-sm text-slate-500">
//             <Loader2 className="h-4 w-4 animate-spin" />
//             Checking active assessments...
//           </div>
//         )}

//         {assessmentError && (
//           <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
//             {assessmentError}
//           </div>
//         )}

//         <section className="space-y-4 mt-[8rem]">
//           {courses.length === 0 ? (
//             <EmptyMessage message="No courses assigned yet." />
//           ) : gradeTabs.length <= 1 ? (
//             <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
//               {(gradeTabs[0]?.courses ?? courses).map((course, index) => (
//                 <Link
//                   key={course.subject_id ?? course.subject_name ?? index}
//                   to={
//                     course?.subject_id
//                       ? `/student/challenge/course-overview/${course.subject_id}`
//                       : "#"
//                   }
//                   className="block h-full"
//                 >
//                   <CourseCard
//                     course={course}
//                     accentColor={COURSE_COLORS[index % COURSE_COLORS.length]}
//                     mastery={masteryPercent(course.course_mastery)}
//                     language={language}
//                   />
//                 </Link>
//               ))}
//             </div>
//           ) : (
//             <Tabs
//               value={selectedGrade}
//               onValueChange={setActiveGrade}
//               className="space-y-5 "
//             >
//               <TabsList className="ml-[3rem] tablist-grades-dashboard">
//                 {gradeTabs.map((tab) => (
//                   <TabsTrigger
//                     key={tab.value}
//                     value={tab.value}
//                     className="flex gap-2"
//                   >
//                     <Folder size={17} />
//                     <span>Grade {tab.label}</span>
//                   </TabsTrigger>
//                 ))}
//               </TabsList>

//               {gradeTabs.map((tab) => (
//                 <TabsContent key={tab.value} value={tab.value} className="m-0">
//                   <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
//                     {tab.courses.map((course, index) => (
//                       <Link
//                         key={course.subject_id ?? course.subject_name ?? index}
//                         to={
//                           course?.subject_id
//                             ? `/student/challenge/course-overview/${course.subject_id}`
//                             : "#"
//                         }
//                         className="block h-full"
//                       >
//                         <CourseCard
//                           course={course}
//                           accentColor={
//                             COURSE_COLORS[index % COURSE_COLORS.length]
//                           }
//                           mastery={masteryPercent(course.course_mastery)}
//                           language={language}
//                         />
//                       </Link>
//                     ))}
//                   </div>
//                 </TabsContent>
//               ))}
//             </Tabs>
//           )}
//         </section>
//       </div>

//       {showStartAssessment && (
//         <div className="fixed inset-x-0 right-0 bottom-4 z-50 px-4">
//           <div className="max-w-[30rem] rounded-2xl border border-white/20 bg-gradient-to-r from-[#0A224A] via-[#163c75] to-[#AB474B] text-white shadow-[0_16px_40px_rgba(10,34,74,0.35)]">
//             <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
//               <div className="min-w-0 text-left">
//                 <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/80">
//                   Active Assessments
//                 </p>

//                 <p className="text-lg font-semibold leading-tight truncate">
//                   {nextAssessment?.title || "Start Assessment"}
//                 </p>

//                 <p className="mt-1 text-xs text-white/85">
//                   {availableAssessments.length} available
//                   {" • "}
//                   {nextAssessment?.questions_count ?? 0} question
//                   {(nextAssessment?.questions_count ?? 0) === 1 ? "" : "s"}
//                 </p>
//               </div>

//               <div className="flex items-center gap-2 sm:justify-end">
//                 <button
//                   type="button"
//                   onClick={() => handleStartAssessment(nextAssessment)}
//                   className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-white/25 transition"
//                 >
//                   Start Next
//                   <ArrowRight size={16} />
//                 </button>

//                 {availableAssessments.length > 1 && (
//                   <button
//                     type="button"
//                     onClick={() => setShowAllAssessments((prev) => !prev)}
//                     className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-white/10 transition"
//                   >
//                     {showAllAssessments ? "Hide All" : "View All"}

//                     {showAllAssessments ? (
//                       <ChevronUp size={16} />
//                     ) : (
//                       <ChevronDown size={16} />
//                     )}
//                   </button>
//                 )}
//               </div>
//             </div>

//             {showAllAssessments && availableAssessments.length > 1 && (
//               <div className="max-h-52 overflow-y-auto border-t border-white/20 bg-black/10 px-4 py-3 space-y-2">
//                 {availableAssessments.map((assessment, index) => {
//                   const submitBy =
//                     assessment?.submission_mode === "submit_by"
//                       ? formatAssessmentDateTime(assessment?.submit_by)
//                       : "";

//                   return (
//                     <div
//                       key={assessment?.assessment_id ?? `assessment-${index}`}
//                       className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2"
//                     >
//                       <div className="min-w-0">
//                         <p className="truncate text-sm font-semibold text-white">
//                           {index + 1}. {assessment?.title || "Assessment"}
//                         </p>

//                         <p className="text-[11px] text-white/80">
//                           {assessment?.questions_count ?? 0} question
//                           {(assessment?.questions_count ?? 0) === 1 ? "" : "s"}
//                           {" • "}
//                           {assessment?.duration_minutes ?? 0} min
//                           {submitBy ? ` • Submit by ${submitBy}` : ""}
//                         </p>
//                       </div>

//                       <button
//                         type="button"
//                         onClick={() => handleStartAssessment(assessment)}
//                         className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0A224A] cursor-pointer hover:bg-slate-100 transition"
//                       >
//                         Start
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {student?.ilm_feedback_submitted === false && (
//         <button
//           type="button"
//           onClick={() => setShowFeedbackModal(true)}
//           className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 transition cursor-pointer"
//         >
//           <span>Feedback</span>
//           <span className="relative flex h-3 w-3">
//             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
//             <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
//           </span>
//         </button>
//       )}

//       <FeedbackSurveyModal
//         open={showFeedbackModal}
//         onClose={() => setShowFeedbackModal(false)}
//       />
//     </>
//   );
// };

// const EmptyMessage = ({ message }) => (
//   <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
//     {message}
//   </div>
// );

// const CourseCard = ({ course, accentColor, mastery, language }) => {
//   const subjectName = (() => {
//     if (language === "ur")
//       return course?.subject_urdu?.trim() || course?.subject_name;
//     if (language === "sd")
//       return course?.subject_sindhi?.trim() || course?.subject_name;
//     return course?.subject_name;
//   })();

//   const subjectDescription = (() => {
//     if (language === "ur")
//       return (
//         course?.subject_description_urdu?.trim() || course?.subject_description
//       );
//     if (language === "sd")
//       return (
//         course?.subject_description_sindhi?.trim() ||
//         course?.subject_description
//       );
//     return course?.subject_description;
//   })();
//   const getAssignmentCoverSrc = (images) => {
//     const path = extractFirstImagePath(images);
//     return buildBackendFileUrl(path);
//   };

//   return (
//     <div
//       className={`flex gap-3.5 items-center pl-1 sm:pl-8 flex-col  ${
//         (language === "ur" &&
//           (course.subject_urdu || course.subject_description_urdu)) ||
//         (language === "sd" &&
//           (course.subject_sindhi || course.subject_description_sindhi))
//           ? "md:flex-row-reverse"
//           : "md:flex-row"
//       }`}
//     >
//       <div className="course-card-std-dashboard w-full md:w-[30%]">
//         <div
//           className="ccsd-bg"
//           style={{ backgroundColor: accentColor || "#810100" }}
//         >
//           {course?.subject_image ? (
//             <img
//               src={getAssignmentCoverSrc(course.subject_image)}
//               alt="course cover"
//             />
//           ) : (
//             <BookOpen size={48} color="white" />
//           )}
//         </div>
//       </div>

//       <div className="course-card-content w-full md:w-[70%] mt-3">
//         <div className="p-[15px]">
//           <div className="space-y-1">
//             <h3
//               className={`text-[18px] font-semibold text-slate-900 mb-1  ${
//                 (language === "ur" && course.subject_urdu) ||
//                 (language === "sd" && course.subject_sindhi)
//                   ? `text-right ${
//                       language === "ur" ? "font-nastaleeq" : "font-lateefi"
//                     }`
//                   : ""
//               }`}
//             >
//               {subjectName ?? "Untitled course"}
//             </h3>
//             <p
//               className={`text-gray-500 text-sm text-justify mb-4 ${
//                 (language === "ur" && course.subject_description_urdu) ||
//                 (language === "sd" && course.subject_description_sindhi)
//                   ? `text-right ${
//                       language === "ur" ? "font-nastaleeq" : "font-lateefi"
//                     }`
//                   : ""
//               }`}
//             >
//               {subjectDescription ?? "No description available."}
//             </p>

//             <div className="flex gap-2">
//               <div className="grow w-[50%] ">
//                 <p className="text-[12px] font-semibold text-gray-500 flex items-center gap-2">
//                   <span>
//                     <Layers2 size={14} />
//                   </span>
//                   <span>{course.total_units_count ?? 0} Units </span>
//                 </p>
//               </div>

//               <div className="grow w-[50%] ">
//                 <p className="text-[12px] font-semibold text-gray-500 flex items-center gap-2">
//                   <span>
//                     <FileQuestionMark size={14} />
//                   </span>
//                   <span>{course.total_questions ?? 0} Questions</span>
//                 </p>
//               </div>
//             </div>
//           </div>
//           <div className="mt-5 space-y-1">
//             <div className="flex items-center justify-between text-[12px] font-semibold">
//               <span className="text-gray-500">Progress</span>
//               <span
//                 className="text-[14px]"
//                 style={{ color: accentColor || "#810100" }}
//               >
//                 {mastery}%
//               </span>
//             </div>
//             <div className="h-[8px] rounded-full bg-[#E5E6E9]">
//               <div
//                 className="h-full rounded-full transition-all relative"
//                 style={{
//                   width: `${mastery}%`,
//                   backgroundColor: accentColor || "#810100",
//                 }}
//               ></div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default StudentDashboard;


import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileQuestionMark,
  Filter,
  Folder,
  Layers2,
  Loader2,
  Search,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { getActiveAssessments } from "@/api/assessmentApi";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import FeedbackSurveyModal from "@/components/FeedbackSurveyModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COURSE_COLORS = [
  "#C4332E",
  "#2C6DB2",
  "#30835B",
  "#815CCF",
  "#D6A12F",
  "#1D8A82",
];

const COURSES_PER_PAGE = 10;

const isTruthyLike = (value) => {
  if (value === true || value === 1) return true;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["true", "1", "yes"].includes(normalized);
};

const isAssessmentAttempted = (assessment) => {
  const attemptedValue = assessment?.attempted;

  if (
    attemptedValue === null ||
    attemptedValue === undefined ||
    attemptedValue === ""
  ) {
    return false;
  }

  if (typeof attemptedValue === "object") {
    return true;
  }

  return isTruthyLike(attemptedValue);
};

const getGradeLabel = (course) => {
  const gradeName = String(course?.grade_name ?? "").trim();
  if (gradeName) return gradeName;

  const gradeId = String(course?.grade_id ?? "").trim();
  return gradeId ? `Grade ${gradeId}` : "Other";
};

const GRADE_TAB_ORDER = [5, 4, 3];

const getGradeOrderRank = (label) => {
  const match = String(label ?? "").match(/\d+/);
  const gradeNumber = match ? Number(match[0]) : null;
  const orderIndex = GRADE_TAB_ORDER.indexOf(gradeNumber);

  return orderIndex === -1 ? GRADE_TAB_ORDER.length : orderIndex;
};

const buildGradeTabs = (courses) => {
  const gradeMap = new Map();

  courses.forEach((course) => {
    const label = getGradeLabel(course);
    const value = label.toLowerCase();

    if (!gradeMap.has(value)) {
      gradeMap.set(value, { value, label, courses: [] });
    }

    gradeMap.get(value).courses.push(course);
  });

  return Array.from(gradeMap.values()).sort((a, b) => {
    const rankDiff = getGradeOrderRank(a.label) - getGradeOrderRank(b.label);
    if (rankDiff !== 0) return rankDiff;
    return a.label.localeCompare(b.label);
  });
};

const formatAssessmentDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, school, updateUser, student } = useAuthStore();
  const { courses, loading, hasDashboardData, language } = useStudentPortal();

  const [activeAssessments, setActiveAssessments] = useState([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");
  const [showAllAssessments, setShowAllAssessments] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeGrade, setActiveGrade] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const gradeTabs = useMemo(() => buildGradeTabs(courses), [courses]);
  const selectedGrade = activeGrade || gradeTabs[0]?.value || "";
  const selectedGradeLabel =
    gradeTabs.find((tab) => tab.value === selectedGrade)?.label;

  const handleSelectGradeFilter = (value) => {
    setActiveGrade(value);
    setFilterOpen(false);
  };

  useEffect(() => {
    if (!gradeTabs.length) {
      setActiveGrade("");
      return;
    }

    if (!gradeTabs.some((tab) => tab.value === activeGrade)) {
      setActiveGrade(gradeTabs[0].value);
    }
  }, [gradeTabs, activeGrade]);


  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGrade, searchTerm]);

  useEffect(() => {
    let isActive = true;

    const loadActiveAssessments = async () => {
      try {
        setAssessmentLoading(true);
        setAssessmentError("");

        const response = await getActiveAssessments();
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        if (!isActive) return;
        setActiveAssessments(list);
      } catch (err) {
        if (!isActive) return;
        setAssessmentError(
          err?.message || "Failed to load active assessments.",
        );
      } finally {
        if (isActive) {
          setAssessmentLoading(false);
        }
      }
    };

    loadActiveAssessments();

    return () => {
      isActive = false;
    };
  }, []);

  const showInlineLoader = loading && hasDashboardData;

  const availableAssessments = useMemo(
    () =>
      activeAssessments.filter(
        (assessment) =>
          isTruthyLike(assessment?.can_attempt) &&
          !isAssessmentAttempted(assessment),
      ),
    [activeAssessments],
  );

  const nextAssessment = availableAssessments[0] ?? null;
  const showStartAssessment = availableAssessments.length > 0;

  useEffect(() => {
    if (availableAssessments.length <= 1) {
      setShowAllAssessments(false);
    }
  }, [availableAssessments.length]);

  const handleStartAssessment = (assessment) => {
    const assessmentId = assessment?.assessment_id;
    if (assessmentId === undefined || assessmentId === null) {
      return;
    }

    navigate(`/student/challenge/assessment/${assessmentId}/starter`, {
      state: { assessment },
    });
  };

  const masteryPercent = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return 0;
    const percent = Math.round(numeric);
    if (percent < 0) return 0;
    if (percent > 100) return 100;
    return percent;
  };

  const matchesSearch = (course) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const name = String(course?.subject_name ?? "").toLowerCase();
    return name.includes(term);
  };

  const renderCourseList = (courseList) => {
    const filtered = courseList.filter(matchesSearch);

    if (filtered.length === 0) {
      return <EmptyMessage message="No courses match your search." />;
    }

    const totalPages = Math.max(
      1,
      Math.ceil(filtered.length / COURSES_PER_PAGE),
    );
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * COURSES_PER_PAGE;
    const paginated = filtered.slice(startIndex, startIndex + COURSES_PER_PAGE);

    return (
      <div className="flex flex-col gap-3 min-[1025px]:gap-4">
        {paginated.map((course, index) => {
          const courseId =
            course.subject_id ?? course.subject_name ?? startIndex + index;

          return (
            <Link
              key={courseId}
              to={
                course?.subject_id
                  ? `/student/challenge/course-overview/${course.subject_id}`
                  : "#"
              }
              className="block"
            >
              <CourseCard
                course={course}
                accentColor={
                  COURSE_COLORS[(startIndex + index) % COURSE_COLORS.length]
                }
                mastery={masteryPercent(course.course_mastery)}
                language={language}
                isDescExpanded={expandedCourseId === courseId}
                onToggleDescription={() =>
                  setExpandedCourseId((prev) =>
                    prev === courseId ? null : courseId,
                  )
                }
              />
            </Link>
          );
        })}

        {filtered.length > COURSES_PER_PAGE && (
          <PaginationControls
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className={
          showStartAssessment
            ? showAllAssessments
              ? "space-y-6 min-[1025px]:space-y-8 pb-72 mt-[5rem] px-3 min-[1025px]:px-0"
              : "space-y-6 min-[1025px]:space-y-8 pb-28 mt-[5rem] px-3 min-[1025px]:px-0"
            : "space-y-6 min-[1025px]:space-y-8 mt-[5rem] px-3 min-[1025px]:px-0"
        }
      >
        {showInlineLoader && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Updating your dashboard...
          </div>
        )}

        {assessmentLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Checking active assessments...
          </div>
        )}

        {assessmentError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {assessmentError}
          </div>
        )}

        {/* Header: title + search + filter, matches target layout */}
        <div className="flex flex-col gap-4 min-[1025px]:flex-row min-[1025px]:items-center min-[1025px]:justify-between">
          <div>
            <h1 className="text-xl min-[1025px]:text-2xl font-bold text-slate-900">
              My Courses
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Continue learning and track your progress.
            </p>
          </div>

          <div className="flex flex-col gap-3 xs:flex-row min-[1025px]:flex-row min-[1025px]:items-center">
            <div className="relative w-full min-[1025px]:w-56">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search courses..."
                className="h-10 w-full min-[1025px]:w-56 rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="relative w-full min-[1025px]:w-auto">
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className="flex h-10 w-full min-[1025px]:w-auto items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer whitespace-nowrap"
              >
                <Folder size={15} />
                {selectedGradeLabel ? `Grade ${selectedGradeLabel}` : "Courses"}
                <ChevronDown size={15} />
              </button>

              {filterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setFilterOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-full min-w-[10rem] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg min-[1025px]:w-48">
                    {/* {gradeTabs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleSelectGradeFilter(gradeTabs[0]?.value ?? "")}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Folder size={14} />
                        Courses
                      </button>
                    )} */}

                    {gradeTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => handleSelectGradeFilter(tab.value)}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition cursor-pointer hover:bg-slate-50 ${
                          selectedGrade === tab.value
                            ? "font-semibold text-slate-900"
                            : "text-slate-600"
                        }`}
                      >
                        <Folder size={14} />
                        Grade {tab.label}
                      </button>
                    ))}

                    {gradeTabs.length === 0 && (
                      <p className="px-4 py-2 text-sm text-slate-400">
                        No grades available.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <section className="space-y-4">
          {courses.length === 0 ? (
            <EmptyMessage message="No courses assigned yet." />
          ) : gradeTabs.length <= 1 ? (
            renderCourseList(gradeTabs[0]?.courses ?? courses)
          ) : (
            <Tabs
              value={selectedGrade}
              onValueChange={setActiveGrade}
              className="space-y-5"
            >
              <div className="hidden">
                <TabsList className="tablist-grades-dashboard w-max min-[1025px]:w-auto">
                  {gradeTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex shrink-0 gap-2 whitespace-nowrap"
                    >
                      <Folder size={17} />
                      <span>Grade {tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {gradeTabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="m-0">
                  {renderCourseList(tab.courses)}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </section>
      </div>

      {showStartAssessment && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-3 min-[1025px]:justify-end min-[1025px]:px-4">
          <div className="w-full max-w-[30rem] rounded-2xl border border-white/20 bg-gradient-to-r from-[#0A224A] via-[#163c75] to-[#AB474B] text-white shadow-[0_16px_40px_rgba(10,34,74,0.35)]">
            <div className="flex flex-col gap-3 px-4 py-4 min-[1025px]:px-5 min-[1025px]:flex-row min-[1025px]:items-center min-[1025px]:justify-between">
              <div className="min-w-0 text-left">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  Active Assessments
                </p>

                <p className="text-base min-[1025px]:text-lg font-semibold leading-tight truncate">
                  {nextAssessment?.title || "Start Assessment"}
                </p>

                <p className="mt-1 text-xs text-white/85">
                  {availableAssessments.length} available
                  {" • "}
                  {nextAssessment?.questions_count ?? 0} question
                  {(nextAssessment?.questions_count ?? 0) === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center gap-2 min-[1025px]:justify-end">
                <button
                  type="button"
                  onClick={() => handleStartAssessment(nextAssessment)}
                  className="inline-flex flex-1 min-[1025px]:flex-none items-center justify-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-white/25 transition whitespace-nowrap"
                >
                  Start Next
                  <ArrowRight size={16} />
                </button>

                {availableAssessments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowAllAssessments((prev) => !prev)}
                    className="inline-flex flex-1 min-[1025px]:flex-none items-center justify-center gap-2 rounded-full border border-white/30 px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-white/10 transition whitespace-nowrap"
                  >
                    {showAllAssessments ? "Hide All" : "View All"}

                    {showAllAssessments ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                )}
              </div>
            </div>

            {showAllAssessments && availableAssessments.length > 1 && (
              <div className="max-h-52 overflow-y-auto border-t border-white/20 bg-black/10 px-3 py-3 min-[1025px]:px-4 space-y-2">
                {availableAssessments.map((assessment, index) => {
                  const submitBy =
                    assessment?.submission_mode === "submit_by"
                      ? formatAssessmentDateTime(assessment?.submit_by)
                      : "";

                  return (
                    <div
                      key={assessment?.assessment_id ?? `assessment-${index}`}
                      className="flex flex-col gap-2 rounded-xl bg-white/10 px-3 py-2 min-[1025px]:flex-row min-[1025px]:items-center min-[1025px]:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {index + 1}. {assessment?.title || "Assessment"}
                        </p>

                        <p className="text-[11px] text-white/80">
                          {assessment?.questions_count ?? 0} question
                          {(assessment?.questions_count ?? 0) === 1 ? "" : "s"}
                          {" • "}
                          {assessment?.duration_minutes ?? 0} min
                          {submitBy ? ` • Submit by ${submitBy}` : ""}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartAssessment(assessment)}
                        className="shrink-0 self-start rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0A224A] cursor-pointer hover:bg-slate-100 transition min-[1025px]:self-auto"
                      >
                        Start
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {student?.ilm_feedback_submitted === false && (
        <button
          type="button"
          onClick={() => setShowFeedbackModal(true)}
          className="fixed bottom-6 right-4 min-[1025px]:right-6 z-50 flex items-center gap-2 rounded-full bg-slate-900 px-3 min-[1025px]:px-4 py-2.5 min-[1025px]:py-3 text-xs min-[1025px]:text-sm font-semibold text-white shadow-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <span>Feedback</span>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </button>
      )}

      <FeedbackSurveyModal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </>
  );
};

const EmptyMessage = ({ message }) => (
  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
    {message}
  </div>
);

// Build a compact list of page numbers with ellipsis for large page counts
// (same logic/style as StudentBadgeShowcase's pagination).
const getPageNumbers = (totalPages, currentPage) => {
  const pages = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    return pages;
  }

  pages.push(1);
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis-start");
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push("ellipsis-end");
  pages.push(totalPages);

  return pages;
};

// Prev/Next buttons + numbered pages (sm+) / compact "Page X / Y" (mobile),
// matching the pagination style used in StudentBadgeShowcase.
const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
  const goToPage = (page) => {
    onPageChange(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm"
      >
        Prev
      </button>

      {/* Compact page indicator for small screens */}
      <span className="text-xs font-medium text-slate-600 sm:hidden">
        Page {currentPage} / {totalPages}
      </span>

      {/* Full numbered pagination from sm breakpoint up */}
      <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex">
        {getPageNumbers(totalPages, currentPage).map((page, idx) =>
          typeof page === "number" ? (
            <button
              key={page}
              type="button"
              onClick={() => goToPage(page)}
              className={`min-w-[2.25rem] rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                page === currentPage
                  ? "border-[#AD474B] bg-[#AD474B] text-white"
                  : "border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {page}
            </button>
          ) : (
            <span key={`${page}-${idx}`} className="px-1 text-sm text-slate-400">
              …
            </span>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:text-sm"
      >
        Next
      </button>
    </div>
  );
};

// Circular ring progress indicator, like the one in the reference screenshot:
// a small ring icon sits beside the percentage + "Progress" label (not inside it).
const CircularProgress = ({ percent, color }) => {
  const size = 30;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex items-center gap-2">
      <svg
        width={size}
        height={size}
        className="-rotate-90 shrink-0"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E9EAEC"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="leading-tight">
        <p className="text-[15px] font-bold" style={{ color }}>
          {percent}%
        </p>
        <p className="text-[11px] text-slate-400">Progress</p>
      </div>
    </div>
  );
};

const CourseCard = ({
  course,
  accentColor,
  mastery,
  language,
  isDescExpanded,
  onToggleDescription,
}) => {
  const subjectName = (() => {
    if (language === "ur")
      return course?.subject_urdu?.trim() || course?.subject_name;
    if (language === "sd")
      return course?.subject_sindhi?.trim() || course?.subject_name;
    return course?.subject_name;
  })();

  const subjectDescription = (() => {
    if (language === "ur")
      return (
        course?.subject_description_urdu?.trim() || course?.subject_description
      );
    if (language === "sd")
      return (
        course?.subject_description_sindhi?.trim() ||
        course?.subject_description
      );
    return course?.subject_description;
  })();

  const hasDescription = Boolean(String(subjectDescription ?? "").trim());

  const getAssignmentCoverSrc = (images) => {
    const path = extractFirstImagePath(images);
    return buildBackendFileUrl(path);
  };

  const isRtl =
    (language === "ur" &&
      (course.subject_urdu || course.subject_description_urdu)) ||
    (language === "sd" &&
      (course.subject_sindhi || course.subject_description_sindhi));

  const handleToggleDescription = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleDescription?.();
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-3 min-[1025px]:flex-nowrap min-[1025px]:gap-6 rounded-2xl border border-slate-100 bg-white p-3 min-[1025px]:p-4 min-[1025px]:pr-6 shadow-sm transition hover:shadow-md ${
        isRtl ? "min-[1025px]:flex-row-reverse text-right" : ""
      }`}
    >
      {/* Row 1 on mobile: thumbnail + title/description. Becomes two
          separate flex items at 1025px+ via `contents` (original layout).
          items-start (not items-center) keeps the thumbnail pinned to the
          top even when the description expands and grows taller. When there
          is no description at all, we switch to items-center so the title
          sits vertically centered next to the thumbnail instead of stuck
          to the top. */}
      <div
        className={`flex w-full gap-4 min-[1025px]:contents ${
          hasDescription ? "items-start" : "items-center"
        }`}
      >
        {/* Thumbnail */}
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl min-[1025px]:h-24 min-[1025px]:w-24"
          style={{ backgroundColor: accentColor || "#810100" }}
        >
          {course?.subject_image ? (
            <img
              src={getAssignmentCoverSrc(course.subject_image)}
              alt="course cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <BookOpen size={28} color="white" />
          )}
        </div>

        {/* Title + description */}
        <div className="min-w-0 flex-1">
          <div
            className={`flex gap-2 ${
              hasDescription
                ? "items-start justify-between"
                : "items-center justify-start"
            }`}
          >
            <h3
              className={`!text-[17px] min-[1025px]:text-[16px] font-semibold text-slate-900 ${
                isRtl
                  ? language === "ur"
                    ? "font-nastaleeq"
                    : "font-lateefi"
                  : ""
              }`}
            >
              {subjectName ?? "Untitled course"}
            </h3>

            {hasDescription && (
              <button
                type="button"
                onClick={handleToggleDescription}
                aria-expanded={isDescExpanded}
                aria-label={isDescExpanded ? "Collapse description" : "Expand description"}
                className="shrink-0 text-slate-400 transition-transform duration-200 min-[1025px]:hidden"
              >
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-200 ${
                    isDescExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>

          {hasDescription && (
            <p
              className={`mt-1 text-[12px] min-[1025px]:text-[13px] leading-snug text-slate-500 min-[1025px]:text-justify ${
                isDescExpanded ? "text-justify" : "text-left line-clamp-2"
              } min-[1025px]:line-clamp-none ${
                isRtl
                  ? language === "ur"
                    ? "font-nastaleeq"
                    : "font-lateefi"
                  : ""
              }`}
            >
              {subjectDescription}
            </p>
          )}
        </div>
      </div>

      {/* Row 2 on mobile: stats + progress, separated with a subtle divider.
          Becomes two individual desktop items via `contents` (original layout).
          On mobile this is centered with equal spacing (justify-center +
          matching gap) instead of justify-between, so Units / Questions /
          Progress sit together as one centered group. Desktop keeps the
          original justify-between + gap-4 via the min-[1025px] overrides. */}
      <div className="flex w-full items-center justify-between gap-2 border-t border-slate-100 pt-3 min-[1025px]:w-auto min-[1025px]:border-0 min-[1025px]:pt-0 min-[1025px]:contents">
        <div className="contents min-[1025px]:flex min-[1025px]:shrink-0 min-[1025px]:items-center min-[1025px]:gap-10">
          <div className="flex items-center gap-2 text-slate-500">
            <Layers2 size={16} className="shrink-0" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-700">
                {course.total_units_count ?? 0}
              </p>
              <p className="text-[11px]">Units</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <FileQuestionMark size={16} className="shrink-0" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-700">
                {course.total_questions ?? 0}
              </p>
              <p className="text-[11px]">Questions</p>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <CircularProgress percent={mastery} color={accentColor || "#810100"} />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;