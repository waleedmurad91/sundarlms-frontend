import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import { Link } from "react-router-dom";
import unitPlaceholder from "@/assets/unit-placeholder.png";

const getCourseSubtitle = (course) => {
  const gradeLabel = course.grade_name
    ? `Grade ${course.grade_name}`
    : course.grade_id
    ? `Grade ${course.grade_id}`
    : "";
  const subjectLabel = course.subject_name ?? "";
  const mastered = `${Math.round(course.progress ?? 0)}% mastered`;
  return [gradeLabel, subjectLabel, mastered].filter(Boolean).join(" · ");
};

const getAssignmentCoverSrc = (images) => {
  const path = extractFirstImagePath(images);
  return buildBackendFileUrl(path);
};

export const CourseRow = ({ course, accentClass }) => (
  <div className="flex flex-wrap items-center justify-between py-3">
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${accentClass}`}
      >
        <img
          src={getAssignmentCoverSrc(course.images) || unitPlaceholder}
          className="h-11 w-11 object-cover rounded-full"
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {course.unit_name ?? "Untitled unit"}
        </p>
        <p className="text-xs text-slate-500">{getCourseSubtitle(course)}</p>
      </div>
    </div>
    <Link
      to={
        course.unit_id || course.id
          ? `/student/challenge/unit/${course.unit_id ?? course.id}`
          : "/student/challenge"
      }
      className="rounded-sm border border-[#A22038] bg-[#A22038] px-4 py-1 text-[13px] font-semibold text-white hover:bg-[#A22038] mt-2 md:mt-0"
    >
      Resume
    </Link>
  </div>
);

