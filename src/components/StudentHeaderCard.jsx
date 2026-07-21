// import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
// import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
// import { getBadgesShowcase } from "@/api/badgesApi";
// import {
//   BADGE_SUMMARY_ORDER,
//   resolveBadgeCount,
//   resolveBadgeIcon,
//   resolveBadgeLabel,
// } from "@/utils/studentBadgeConfig";
// import React from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { useStudentPortal } from "@/context/StudentPortalContext";
// import AccessModeSwitcher from "./common/AccessModeSwitcher";
// import { FilePenLine, Pencil, Play, SquarePlay } from "lucide-react";

// const getAssignmentCoverSrc = (images) => {
//   const path = extractFirstImagePath(images);
//   return buildBackendFileUrl(path);
// };

// const DEFAULT_TOP_STRIP = {
//   total_points: 0,
//   badge_counts: {},
// };

// const resolvePointValue = (value, fallback = 0) => {
//   const parsedValue = Number(value ?? fallback);
//   return Number.isFinite(parsedValue) ? parsedValue : 0;
// };

// export const StudentHeaderCard = ({ student }) => {
//   const { courses, grade } = useStudentPortal();
//   const navigate = useNavigate();
//   const [topStrip, setTopStrip] = React.useState({
//     total_points: resolvePointValue(student?.points),
//     badge_counts: {},
//   });

//   React.useEffect(() => {
//     let isMounted = true;

//     const loadBadgeTopStrip = async () => {
//       try {
//         const response = await getBadgesShowcase();
//         const payload = response?.data ?? response ?? {};
//         const nextTopStrip = payload?.top_strip ?? DEFAULT_TOP_STRIP;

//         if (!isMounted) return;

//         setTopStrip({
//           total_points: resolvePointValue(
//             nextTopStrip?.total_points,
//             student?.points,
//           ),
//           badge_counts: nextTopStrip?.badge_counts ?? {},
//         });
//       } catch {
//         if (!isMounted) return;
//         setTopStrip((previous) => ({
//           ...previous,
//           total_points: resolvePointValue(
//             student?.points,
//             previous.total_points,
//           ),
//         }));
//       }
//     };

//     loadBadgeTopStrip();

//     return () => {
//       isMounted = false;
//     };
//   }, [student?.points]);

//   const gradeLabel = React.useMemo(() => {
//     if (grade) {
//       return /^grade\b/i.test(String(grade)) ? grade : `Grade ${grade}`;
//     }
//     if (student?.gradeLabel) return student.gradeLabel;
//     const entryWithGrade =
//       courses.find((course) => course.grade_name || course.grade_id) || null;
//     if (!entryWithGrade) return "Courses";
//     if (entryWithGrade.grade_name) return `Grade ${entryWithGrade.grade_name}`;
//     if (entryWithGrade.grade_id) return `Grade ${entryWithGrade.grade_id}`;
//     return "Courses";
//   }, [courses, grade, student?.gradeLabel]);

//   const summaryBadges = React.useMemo(
//     () =>
//       BADGE_SUMMARY_ORDER.map((badgeKey) => ({
//         key: badgeKey,
//         label: resolveBadgeLabel(badgeKey),
//         icon: resolveBadgeIcon(badgeKey),
//         count: resolveBadgeCount(topStrip?.badge_counts, badgeKey),
//       })),
//     [topStrip?.badge_counts],
//   );

//   const totalPoints = resolvePointValue(
//     topStrip?.total_points,
//     student?.points,
//   );
//   const studentName = student?.name ?? student?.student_name ?? "Student";
//   const topperBadgeName =
//     student?.class_topper_badge?.badge?.name ?? "Class topper badge";
//   const topperBadgeIconSrc = buildBackendFileUrl(
//     student?.class_topper_badge?.badge?.icon_path ?? "",
//   );

//   return (
//     <>
//     <div className="student-header-card">
//       <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-8 stdLayout">
//         <div className="flex items-center gap-4">
//           {student?.profile_image ? (
//             <img
//               src={getAssignmentCoverSrc(student.profile_image)}
//               alt={studentName}
//               className="h-16 w-16 rounded-full object-cover"
//             />
//           ) : (
//             <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFFFFF] text-2xl font-semibold text-[#66686D]">
//               {studentName.charAt(0)}
//             </div>
//           )}
//           <div>
//             <h1 className="flex items-center gap-2 text-3xl font-semibold text-black">
//               <span>{studentName}</span>
//               {topperBadgeIconSrc ? (
//                 <img
//                   src={topperBadgeIconSrc}
//                   alt={topperBadgeName}
//                   title={topperBadgeName}
//                   className="h-[35px] w-[35px] rounded-full shrink-0 object-contain"
//                 />
//               ) : null}
//             </h1>
//             <p className="text-md font-semibold uppercase tracking-wide text-slate-500">
//               Grade {grade}
//             </p>
//           </div>
//         </div>
//         <div className="flex items-center justify-center gap-2 flex-wrap">
//             <span
//               className="bg-[#00B0DE] px-3 py-1 rounded-sm text-xs font-semibold text-white"
//               title="Total Points"
//             >
//               {totalPoints}
//             </span>

//             <button
//               type="button"
//               onClick={() => navigate("/student/edit-profile?view=badges")}
//               className="badges-summary flex flex-wrap items-center gap-1.5 py-[5px] px-[10px] rounded-sm hover:bg-gray-500/10 transition-colors cursor-pointer"
//             >
//               {summaryBadges.map((badge) => (
//                 <span
//                   key={badge.key}
//                   className="inline-flex items-center leading-[13px]"
//                   title={`${badge.label}: ${badge.count}`}
//                 >
//                   <img
//                     src={badge.icon}
//                     alt={badge.label}
//                     className="inline-block h-[16px] w-[16px] mr-0.5"
//                   />
//                   <span className="text-[13px] font-medium text-gray-900">
//                     {badge.count}
//                   </span>
//                 </span>
//               ))}
//             </button>
//           </div>
//         <div className="flex flex-wrap flex-col items-end gap-3">
//           <AccessModeSwitcher />
//           <div className="flex flex-wrap gap-3">
//           <Link
//             to="/student/learning-materials"
//             className="rounded-sm bg-transparent transition-all text-[#AD474B] px-6 py-2 text-sm font-semibold hover:outline-2 flex gap-1 items-center"
//           >
//             <Play size={15}/> <span>Video Library</span>
//           </Link>
//           <span className="flex items-center justify-center text-[#AD474B]">|</span>
//           <Link
//             to="https://drive.google.com/drive/folders/1yUCPiFhFYiIYwfDEUvhOWdpG7HYbBDjY?usp=drive_link"
//               rel="noopener noreferrer"
//                target="_blank"
//             className="rounded-sm bg-transparent border-r-2-[#ababab] transition-all text-[#AD474B] px-6 py-2 text-sm font-semibold hover:outline-2 flex gap-2 items-center"
//           >
//            <FilePenLine size={15}/> <span>Practice Resources</span>
//           </Link>
//           <span className="flex items-center justify-center text-[#AD474B]">|</span>
//           <Link
//             to="/student/edit-profile"
//             className="rounded-sm bg-transparent transition-all text-[#AD474B] px-6 py-2 text-sm font-semibold hover:outline-2 flex gap-2 items-center"
//           >
//             <Pencil size={15}/><span>Edit Profile</span>
//           </Link>
//           </div>

//         </div>
//       </div>
//     </div>
//     </>
//   );
// };

import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import { getBadgesShowcase } from "@/api/badgesApi";
import {
  BADGE_SUMMARY_ORDER,
  resolveBadgeCount,
  resolveBadgeIcon,
  resolveBadgeLabel,
} from "@/utils/studentBadgeConfig";
import React from "react";
import {useNavigate } from "react-router-dom";
import { useStudentPortal } from "@/context/StudentPortalContext";
import AccessModeSwitcher from "./common/AccessModeSwitcher";

const getAssignmentCoverSrc = (images) => {
  const path = extractFirstImagePath(images);
  return buildBackendFileUrl(path);
};

const DEFAULT_TOP_STRIP = {
  total_points: 0,
  badge_counts: {},
};

const resolvePointValue = (value, fallback = 0) => {
  const parsedValue = Number(value ?? fallback);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const StudentHeaderCard = ({ student }) => {
  const { courses, grade } = useStudentPortal();
  const navigate = useNavigate();
  const [topStrip, setTopStrip] = React.useState({
    total_points: resolvePointValue(student?.points),
    badge_counts: {},
  });

  React.useEffect(() => {
    let isMounted = true;

    const loadBadgeTopStrip = async () => {
      try {
        const response = await getBadgesShowcase();
        const payload = response?.data ?? response ?? {};
        const nextTopStrip = payload?.top_strip ?? DEFAULT_TOP_STRIP;

        if (!isMounted) return;

        setTopStrip({
          total_points: resolvePointValue(
            nextTopStrip?.total_points,
            student?.points,
          ),
          badge_counts: nextTopStrip?.badge_counts ?? {},
        });
      } catch {
        if (!isMounted) return;
        setTopStrip((previous) => ({
          ...previous,
          total_points: resolvePointValue(
            student?.points,
            previous.total_points,
          ),
        }));
      }
    };

    loadBadgeTopStrip();

    return () => {
      isMounted = false;
    };
  }, [student?.points]);

  const gradeLabel = React.useMemo(() => {
    if (grade) {
      return /^grade\b/i.test(String(grade)) ? grade : `Grade ${grade}`;
    }
    if (student?.gradeLabel) return student.gradeLabel;
    const entryWithGrade =
      courses.find((course) => course.grade_name || course.grade_id) || null;
    if (!entryWithGrade) return "Courses";
    if (entryWithGrade.grade_name) return `Grade ${entryWithGrade.grade_name}`;
    if (entryWithGrade.grade_id) return `Grade ${entryWithGrade.grade_id}`;
    return "Courses";
  }, [courses, grade, student?.gradeLabel]);

  const summaryBadges = React.useMemo(
    () =>
      BADGE_SUMMARY_ORDER.map((badgeKey) => ({
        key: badgeKey,
        label: resolveBadgeLabel(badgeKey),
        icon: resolveBadgeIcon(badgeKey),
        count: resolveBadgeCount(topStrip?.badge_counts, badgeKey),
      })),
    [topStrip?.badge_counts],
  );

  const totalPoints = resolvePointValue(
    topStrip?.total_points,
    student?.points,
  );
  const studentName = student?.name ?? student?.student_name ?? "Student";
  const topperBadgeName =
    student?.class_topper_badge?.badge?.name ?? "Class topper badge";
  const topperBadgeIconSrc = buildBackendFileUrl(
    student?.class_topper_badge?.badge?.icon_path ?? "",
  );

  return (
    <>
      <div className="student-header-card">
        <div className="flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 stdLayout">
          {/* Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            {student?.profile_image ? (
              <img
                src={getAssignmentCoverSrc(student.profile_image)}
                alt={studentName}
                className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#FFFFFF] text-xl sm:text-2xl font-semibold text-[#66686D] shrink-0">
                {studentName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-xl sm:text-2xl lg:text-3xl font-semibold text-black truncate">
                <span className="truncate">{studentName}</span>
                {topperBadgeIconSrc ? (
                  <img
                    src={topperBadgeIconSrc}
                    alt={topperBadgeName}
                    title={topperBadgeName}
                    className="h-[28px] w-[28px] sm:h-[35px] sm:w-[35px] rounded-full shrink-0 object-contain"
                  />
                ) : null}
              </h1>
              {grade ? (
                <p className="text-sm sm:text-md font-semibold uppercase tracking-wide text-slate-500">
                  Grade {grade}
                </p>
              ) : (
                <></>
              )}
            </div>
          </div>

          {/* Points & Badges */}
          <div className="flex items-center justify-start lg:justify-center gap-2 flex-wrap">
            <span
              className="bg-[#00B0DE] px-3 py-1 rounded-sm text-xs font-semibold text-white shrink-0"
              title="Total Points"
            >
              {totalPoints}
            </span>

            <button
              type="button"
              onClick={() => navigate("/student/edit-profile?view=badges")}
              className="badges-summary flex flex-wrap items-center gap-1.5 py-[5px] px-[10px] rounded-sm hover:bg-gray-500/10 transition-colors cursor-pointer"
            >
              {summaryBadges.map((badge) => (
                <span
                  key={badge.key}
                  className="inline-flex items-center leading-[13px]"
                  title={`${badge.label}: ${badge.count}`}
                >
                  <img
                    src={badge.icon}
                    alt={badge.label}
                    className="inline-block h-[16px] w-[16px] mr-0.5"
                  />
                  <span className="text-[13px] font-medium text-gray-900">
                    {badge.count}
                  </span>
                </span>
              ))}
            </button>
          </div>

          {/* Actions */}
          <AccessModeSwitcher />
        </div>
      </div>
    </>
  );
};
