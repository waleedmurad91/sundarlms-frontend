import React from "react";
import { getDashboardData } from "@/api/studentDashboardApi";
import { useAuthStore } from "@/store/auth";
import {
  persistLanguage,
  readStoredLanguage,
  subscribeLanguageChange,
} from "@/utils/studentLanguageStore";

const defaultState = {
  student: null,
  courseStructure: [],
  subjectAssignments: [],
  grade: "",
};

const normaliseArray = (value) => (Array.isArray(value) ? value : []);

const normaliseCourses = (payload) =>
  normaliseArray(payload).map((course) => ({
    subject_id: course?.subject_id ?? course?.subjectId ?? null,
    subject_name: course?.subject_name ?? course?.subjectName ?? "",
    subject_urdu: course?.subject_urdu ?? "",
    subject_sindhi: course?.subject_sindhi ?? "",
    subject_description: course?.subject_description ?? "",
    subject_description_urdu: course?.subject_description_urdu ?? "",
    subject_description_sindhi: course?.subject_description_sindhi ?? "",
    grade_id: course?.grade_id ?? course?.gradeId ?? null,
    grade_name: course?.grade_name ?? course?.gradeName ?? "",
    subject_image: course?.subject_image ?? "",
    total_units_count:
      course?.total_units_count ??
      course?.total_units ??
      course?.totalUnitsCount ??
      normaliseArray(course?.units).length,
    total_questions: course?.total_questions ?? course?.totalQuestions ?? null,
    course_mastery: course?.course_mastery ?? course?.courseMastery ?? null,
    units: normaliseArray(course?.units).map((unit) => ({
      unit_id: unit?.unit_id ?? unit?.id ?? null,
      unit_name: unit?.unit_name ?? unit?.title ?? "Untitled unit",
      progress: unit?.progress ?? 0,
      is_active: Boolean(unit?.is_active ?? unit?.isActive),
      images: Array.isArray(unit?.images)
        ? unit.images
        : unit?.images
          ? [unit.images]
          : [],
    })),
  }));

const normaliseSubjectAssignments = (payload) =>
  normaliseArray(payload).map((subject) => ({
    subject_id: subject?.subject_id ?? subject?.subjectId ?? null,
    subject_name: subject?.subject_name ?? subject?.subjectName ?? "",
    assignments: normaliseArray(subject?.assignments),
    mastery_assignments: normaliseArray(subject?.mastery_assignments),
  }));

const resolveFirstValue = (...values) =>
  values.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );

const formatGradeLabel = (value) => {
  const label = String(value ?? "").trim();
  if (!label) return "";
  return /^grade\b/i.test(label) ? label : `Grade ${label}`;
};

const normaliseStudent = (payload, courses) => {
  const student = payload?.student ?? {};
  const grade =
    student?.grade && typeof student.grade === "object" ? student.grade : {};
  const courseWithGrade =
    courses.find((course) => course.grade_name || course.grade_id) ?? {};
  const studentGradeName = resolveFirstValue(
    student.grade_name,
    student.gradeName,
    grade.name,
    grade.grade_name,
  );
  const studentGradeId = resolveFirstValue(
    student.grade_id,
    student.gradeId,
    grade.id,
    grade.grade_id,
    student.class_id,
    student.classId,
  );
  const gradeName = resolveFirstValue(
    studentGradeName,
    courseWithGrade.grade_name,
  );
  const gradeId = resolveFirstValue(studentGradeId, courseWithGrade.grade_id);
  const gradeLabel = resolveFirstValue(
    formatGradeLabel(studentGradeName),
    formatGradeLabel(studentGradeId),
    student.gradeLabel,
    student.grade_label,
    student.class_label,
    formatGradeLabel(courseWithGrade.grade_name),
    formatGradeLabel(courseWithGrade.grade_id),
  );

  return {
    ...student,
    grade_id: gradeId ?? null,
    grade_name: gradeName ?? "",
    gradeLabel: gradeLabel ?? "",
    class_topper_badge:
      payload?.class_topper_badge ?? student?.class_topper_badge ?? null,
  };
};

const buildSubjectsList = (courses, subjectAssignments) => {
  const subjectMap = new Map();

  const getSubjectKey = (subjectId, subjectName) => {
    if (subjectId !== null && subjectId !== undefined) {
      return `subject-${subjectId}`;
    }
    const fallback = subjectName
      ? subjectName.toLowerCase().replace(/\s+/g, "-")
      : "subject";
    return `subject-${fallback}`;
  };

  const registerSubject = (candidate) => {
    const subjectId =
      candidate?.subject_id ?? candidate?.subjectId ?? candidate?.id ?? null;
    const subjectName =
      candidate?.subject_name ??
      candidate?.subjectName ??
      candidate?.name ??
      "";
    const gradeId = candidate?.grade_id ?? candidate?.gradeId ?? null;
    const gradeName = candidate?.grade_name ?? candidate?.gradeName ?? "";
    const courseCount =
      candidate?.total_units_count ??
      candidate?.totalUnitsCount ??
      candidate?.course_count ??
      null;

    if (!subjectName && subjectId === null && !gradeName) {
      return;
    }

    const key = getSubjectKey(subjectId, subjectName);
    const existing = subjectMap.get(key);
    if (existing) {
      subjectMap.set(key, {
        ...existing,
        grade_id: existing.grade_id ?? gradeId,
        grade_name: existing.grade_name || gradeName,
        course_count: existing.total_units_count,
        subject_name: existing.subject_name || subjectName || "Subject",
      });
      return;
    }

    subjectMap.set(key, {
      key,
      subject_id: subjectId,
      subject_name: subjectName || "Subject",
      grade_id: gradeId,
      grade_name: gradeName,
      course_count: courseCount,
    });
  };

  courses.forEach(registerSubject);
  subjectAssignments.forEach(registerSubject);

  return Array.from(subjectMap.values());
};

const buildUnitsBySubject = (courses) => {
  const map = new Map();
  courses.forEach((course) => {
    const subjectId =
      course.subject_id !== undefined && course.subject_id !== null
        ? String(course.subject_id)
        : null;
    if (!subjectId) {
      return;
    }
    if (!map.has(subjectId)) {
      map.set(subjectId, []);
    }
    const units = map.get(subjectId);
    course.units.forEach((unit) => {
      units.push({
        ...unit,
        subject_id: course.subject_id,
        subject_name: course.subject_name,
        grade_id: course.grade_id,
        grade_name: course.grade_name,
        total_units_count: course.total_units_count,
      });
    });
  });
  return map;
};

const buildCourseMetaMap = (courses) => {
  const map = new Map();
  courses.forEach((course) => {
    const subjectId =
      course.subject_id !== undefined && course.subject_id !== null
        ? String(course.subject_id)
        : null;
    if (!subjectId) return;
    map.set(subjectId, {
      subject_id: course.subject_id,
      subject_name: course.subject_name,
      grade_id: course.grade_id,
      grade_name: course.grade_name,
      total_units_count: course.total_units_count,
      units_count: course.units?.length ?? 0,
    });
  });
  return map;
};

const buildAssignmentsMap = (subjectAssignments) => {
  const map = new Map();
  subjectAssignments.forEach((entry) => {
    const subjectId =
      entry.subject_id !== undefined && entry.subject_id !== null
        ? String(entry.subject_id)
        : null;
    if (!subjectId) {
      return;
    }
    map.set(subjectId, {
      assignments: entry.assignments,
      mastery_goals: entry.mastery_assignments,
    });
  });
  return map;
};

const StudentPortalContext = React.createContext(null);

export const StudentPortalProvider = ({ children }) => {
  const { user } = useAuthStore();
  const [data, setData] = React.useState(defaultState);
  const [activeSubjectKey, setActiveSubjectKey] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [language, setLanguageState] = React.useState(readStoredLanguage);

  React.useEffect(() => subscribeLanguageChange(setLanguageState), []);

  const setLanguage = React.useCallback((nextLanguage) => {
    setLanguageState(persistLanguage(nextLanguage));
  }, []);

  const loadDashboard = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getDashboardData({});
      if (res?.status && res?.data) {
        const normalizedCourses = normaliseCourses(res.data.courses);
        const grade =
          res.data.grade?.name ??
          res.data.grade_name ??
          res.data.student?.grade_name ??
          "";
        const normalizedSubjectAssignments = normaliseSubjectAssignments(
          res.data.subject_assignments,
        );
        const normalizedStudent = normaliseStudent(res.data, normalizedCourses);
        setData({
          student: normalizedStudent,
          courseStructure: normalizedCourses,
          subjectAssignments: normalizedSubjectAssignments,
          grade,
        });
      } else {
        setError("Unable to load your student dashboard right now.");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to load your student dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const fallbackStudent = React.useMemo(() => {
    if (data.student) return data.student;
    return {
      name: user?.name ?? "Student",
      streak: 0,
      points: 0,
      level: 1,
      profile_image: null,
    };
  }, [data.student, user?.name]);

  const subjects = React.useMemo(
    () =>
      buildSubjectsList(data.courseStructure, data.subjectAssignments).sort(
        (a, b) => a.subject_name.localeCompare(b.subject_name),
      ),
    [data.courseStructure, data.subjectAssignments],
  );

  React.useEffect(() => {
    if (!subjects.length) {
      setActiveSubjectKey(null);
      return;
    }
    if (!activeSubjectKey) {
      setActiveSubjectKey(subjects[0].key);
      return;
    }
    const exists = subjects.some((subject) => subject.key === activeSubjectKey);
    if (!exists) {
      setActiveSubjectKey(subjects[0].key);
    }
  }, [subjects, activeSubjectKey]);

  const activeSubject =
    subjects.find((subject) => subject.key === activeSubjectKey) ??
    subjects[0] ??
    null;

  const subjectIdKey =
    activeSubject && activeSubject.subject_id !== undefined
      ? String(activeSubject.subject_id)
      : null;

  const unitsBySubject = React.useMemo(
    () => buildUnitsBySubject(data.courseStructure),
    [data.courseStructure],
  );

  const courseMetaBySubject = React.useMemo(
    () => buildCourseMetaMap(data.courseStructure),
    [data.courseStructure],
  );

  const assignmentsBySubject = React.useMemo(
    () => buildAssignmentsMap(data.subjectAssignments),
    [data.subjectAssignments],
  );

  const activeAssignments =
    (subjectIdKey && assignmentsBySubject.get(subjectIdKey)) || {};

  const activeCourseMeta =
    (subjectIdKey && courseMetaBySubject.get(subjectIdKey)) || null;

  const courses = data.courseStructure;
  const grade = data.grade;

  const value = React.useMemo(
    () => ({
      student: fallbackStudent,
      assignments: activeAssignments.assignments ?? [],
      mastery_goals: activeAssignments.mastery_goals ?? [],
      courses,
      grade,
      activeCourseMeta,
      subjects,
      activeSubject,
      activeSubjectKey,
      setActiveSubjectKey,
      language,
      setLanguage,
      loading,
      error,
      refresh: loadDashboard,
      hasDashboardData: Boolean(data.student || subjects.length),
    }),
    [
      fallbackStudent,
      activeAssignments.assignments,
      activeAssignments.mastery_goals,
      courses,
      grade,
      activeCourseMeta,
      subjects,
      activeSubject,
      activeSubjectKey,
      language,
      loading,
      error,
      loadDashboard,
      data.student,
    ],
  );

  return (
    <StudentPortalContext.Provider value={value}>
      {children}
    </StudentPortalContext.Provider>
  );
};

export const useStudentPortal = () => {
  const context = React.useContext(StudentPortalContext);
  if (!context) {
    throw new Error(
      "useStudentPortal must be used within a StudentPortalProvider",
    );
  }
  return context;
};
