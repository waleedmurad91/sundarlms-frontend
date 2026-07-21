import React from "react";
import {
  Loader2,
  BookOpen,
  Layers2,
  FileQuestionMark,
  Folder,
} from "lucide-react";
import { getAllCourseSelection, updateCourseSelection } from "@/api/studentApi";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COURSE_COLORS = [
  "#810100",
  "#2C6DB2",
  "#30835B",
  "#815CCF",
  "#D6A12F",
  "#C4332E",
];

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

const getAssignmentCoverSrc = (images) => {
  if (!images) return null;
  const path = Array.isArray(images) ? images[0] : images;
  return buildBackendFileUrl(path);
};

const CourseCard = ({ course, index, onToggle }) => {
  const accentColor = COURSE_COLORS[index % COURSE_COLORS.length] || "#810100";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-3.5 items-center flex-col mb-4">
        <div className="course-card-std-dashboard w-full">
          <div className="ccsd-bg" style={{ backgroundColor: accentColor }}>
            {course?.subject_image ? (
              <img
                src={getAssignmentCoverSrc(course.subject_image)}
                alt={course.subject_name || "Course"}
              />
            ) : (
              <BookOpen size={48} color="white" />
            )}
          </div>
        </div>

        <div className="course-card-content w-full mt-3">
          <div className="p-[15px]">
            <div className="space-y-1">
              <h3 className="text-[18px] font-semibold text-slate-900 mb-1 truncate">
                {course.subject_name || "Untitled course"}
              </h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                {course.subject_description || "No description available."}
              </p>

              <div className="flex gap-2">
                <div className="grow w-[50%]">
                  <p className="text-[12px] font-semibold text-gray-500 flex items-center gap-2">
                    <Layers2 size={14} />
                    <span>{course.total_units_count ?? 0} Units</span>
                  </p>
                </div>

                <div className="grow w-[50%]">
                  <p className="text-[12px] font-semibold text-gray-500 flex items-center gap-2">
                    <FileQuestionMark size={14} />
                    <span>{course.total_questions ?? 0} Questions</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 px-2">
        <label
          htmlFor={`course-toggle-${course.subject_id}`}
          className="text-sm font-medium text-slate-700 cursor-pointer"
        >
          {course.is_selected ? "Enrolled" : "Not enrolled"}
        </label>

        <button
          type="button"
          role="switch"
          aria-checked={course.is_selected}
          onClick={() => onToggle(course.subject_id)}
          className={`
            relative inline-flex h-6 w-11 shrink-0 cursor-pointer
            rounded-full border-2 border-transparent
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
            ${
              course.is_selected
                ? "bg-green-600 hover:bg-green-700"
                : "bg-slate-200 hover:bg-slate-300"
            }
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5
              transform rounded-full bg-white shadow-lg ring-0
              transition-transform duration-200 ease-in-out
              ${course.is_selected ? "translate-x-5" : "translate-x-0"}
            `}
          />
        </button>
      </div>
    </div>
  );
};

const CourseSelection = () => {
  const { refresh } = useStudentPortal();
  const [courses, setCourses] = React.useState([]);
  const [activeGrade, setActiveGrade] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const fetchCourses = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllCourseSelection();
      if (res?.status && res?.data) {
        // Map API response to component state
        const availableCourses = Array.isArray(res.data.available_courses)
          ? res.data.available_courses.map((course) => ({
              subject_id: course.id,
              subject_name: course.name,
              subject_description: course.description,
              subject_image: course.image_path,
              grade_id: course.grade_id,
              grade_name: course.grade_name,
              total_units_count: course.units_count || 0,
              total_questions: course.questions_count || 0,
              is_selected: course.selected ?? false,
            }))
          : [];

        // Ensure all courses reflect the selected state from API
        const selectedIds = new Set(
          Array.isArray(res.data.selected_subject_ids)
            ? res.data.selected_subject_ids
            : [],
        );

        const normalizedCourses = availableCourses.map((course) => ({
          ...course,
          is_selected: selectedIds.has(course.subject_id) || course.is_selected,
        }));

        setCourses(normalizedCourses);
      } else {
        setCourses([]);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleToggle = (courseId) => {
    setCourses((prev) =>
      prev.map((course) =>
        course.subject_id === courseId
          ? { ...course, is_selected: !course.is_selected }
          : course,
      ),
    );
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const selectedCourses = courses
        .filter((course) => course.is_selected)
        .map((course) => course.subject_id);

      const payload = {
        subject_ids: selectedCourses,
      };

      const res = await updateCourseSelection(payload);
      if (res?.status) {
        setSuccess("Course selection updated successfully!");
        // Refresh dashboard data so new active courses appear
        await refresh();
      } else {
        setError("Failed to update selection. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to update selection.");
    } finally {
      setSubmitting(false);
    }
  };

  const gradeTabs = React.useMemo(() => buildGradeTabs(courses), [courses]);
  const selectedGrade = activeGrade || gradeTabs[0]?.value || "";

  React.useEffect(() => {
    if (!gradeTabs.length) {
      setActiveGrade("");
      return;
    }

    if (!gradeTabs.some((tab) => tab.value === activeGrade)) {
      setActiveGrade(gradeTabs[0].value);
    }
  }, [gradeTabs, activeGrade]);

  const selectedCount = courses.filter((c) => c.is_selected).length;

  return (
    <div className="space-y-6 pl-7">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Course Selection
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose the courses you want to enroll in. You can change this later.
          </p>
        </div>
        {courses.length > 0 && (
          <div className="text-sm text-slate-600">
            <span className="font-semibold">{selectedCount}</span> of{" "}
            {courses.length} selected
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-500">Loading courses...</span>
        </div>
      ) : error && courses.length === 0 ? (
        <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-8 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={fetchCourses}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
          No courses available for selection.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Tabs
            value={selectedGrade}
            onValueChange={setActiveGrade}
            className="space-y-5"
          >
            <TabsList>
              {gradeTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex gap-2"
                >
                  <Folder size={17} /> <span>Grade {tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {gradeTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="m-0">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tab.courses.map((course, index) => (
                    <CourseCard
                      key={course.subject_id ?? index}
                      course={course}
                      index={index}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {error && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              {success}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Selection"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CourseSelection;
