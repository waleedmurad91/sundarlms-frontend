import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircleIcon,
  ArrowLeft,
  BarChart,
  Book,
  Calendar,
  Edit,
  Eye,
  GraduationCap,
  Layers,
  Loader2,
  Mail,
  Mars,
  MarsIcon,
  Phone,
  School,
  UniversityIcon,
  UserCog,
  Venus,
} from "lucide-react";
import { getSpecificTeacherDetail } from "@/api/teacherApi";
import TabSearch from "@/components/TabSearch";
import DemographicCard from "@/components/DemographicCard";
import { useAuthStore } from "@/store/auth";

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const resolveSubjectLabel = (subject) => {
  if (!subject) return "";
  if (typeof subject === "string") return subject;
  if (typeof subject === "number") return String(subject);
  return (
    subject?.subject ?? subject?.name ?? subject?.title ?? subject?.label ?? ""
  );
};

const normaliseTeacherDetail = (payload, options = {}) => {
  const { assumeFullDetail = false } = options;
  if (!payload) return null;

  const data = payload?.data ?? payload;
  if (!data) return null;

  const teacherId =
    data?.id ??
    data?._id ??
    data?.teacher_id ??
    data?.teacherId ??
    data?.user?.id ??
    data?.user_id;

  // ---------- SCHOOL ----------
  const resolvedSchool =
    data?.school ??
    data?.school_info ??
    data?.schoolData ??
    data?.school_detail ??
    null;

  const school =
    resolvedSchool && typeof resolvedSchool === "object"
      ? {
        id:
          resolvedSchool?.id ??
          resolvedSchool?._id ??
          resolvedSchool?.school_id ??
          resolvedSchool?.schoolId ??
          undefined,
        name:
          resolvedSchool?.name ??
          resolvedSchool?.label ??
          resolvedSchool?.school_name ??
          "Unnamed School",
        email: resolvedSchool?.email ?? "",
        address: resolvedSchool?.address ?? "",
        phone: resolvedSchool?.phone ?? "",
      }
      : null;

  // ---------- RAW CLASSES ----------
  const rawClasses = [
    ...toArray(data?.classes),
    ...toArray(data?.class),
    ...toArray(data?.assignedClasses),
  ];

  // ---------- HANDLE SINGLE GRADE ----------
  const gradeFromPayload =
    data?.grade ??
    data?.grade_info ??
    data?.gradeDetail ??
    data?.grade_data ??
    data?.school_class?.grade ??
    null;

  if (gradeFromPayload) {
    const gradeId =
      gradeFromPayload?.id ??
      gradeFromPayload?._id ??
      gradeFromPayload?.grade_id ??
      data?.school_class_id ??
      data?.class_id ??
      `grade-${teacherId ?? "unknown"}`;

    rawClasses.push({
      id: String(gradeId),
      grade:
        gradeFromPayload?.name ??
        gradeFromPayload?.label ??
        (gradeFromPayload?.grade_id
          ? `Grade ${gradeFromPayload.grade_id}`
          : "Unnamed Class"),
      section: gradeFromPayload?.section ?? "",
      subject: data?.subject ?? null, // ✅ attach subject
      school: school ?? null, // ✅ attach school
      createdAt: data?.created_at ?? null,
      updatedAt: data?.updated_at ?? null,
      students: Array.isArray(data?.students) ? data.students : [],
    });
  }

  // ---------- BUILD CLASS MAP ----------
  const classMap = new Map();

  rawClasses.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;

    const classId =
      entry?.id ??
      entry?._id ??
      entry?.class_id ??
      entry?.classId ??
      entry?.value ??
      `class-${index}`;
    const classKey = String(classId);

    if (!classMap.has(classKey)) {
      classMap.set(classKey, {
        id: classKey,
        grade: entry?.grade ?? entry?.name ?? entry?.title ?? "Unnamed Class",
        section: entry?.section ?? entry?.label ?? "",
        subject: entry?.subject ?? null,
        school: entry?.school ?? null,
        createdAt: entry?.created_at ?? entry?.createdAt ?? null,
        updatedAt: entry?.updatedAt ?? entry?.updated_at ?? null,
        students: [],
      });
    }

    const targetClass = classMap.get(classKey);
    const classStudents = Array.isArray(entry?.students) ? entry.students : [];

    classStudents.forEach((student, studentIndex) => {
      if (!student || typeof student !== "object") return;

      const studentId =
        student?.id ??
        student?._id ??
        student?.student_id ??
        student?.studentId ??
        student?.user_id ??
        student?.value ??
        `${classKey}-student-${studentIndex}`;

      targetClass.students.push({
        id: String(studentId),
        name:
          student?.name ??
          student?.user?.name ??
          student?.full_name ??
          "Unnamed Student",
        email: student?.email ?? student?.user?.email ?? "",
        gender:
          typeof student?.gender === "string"
            ? student.gender
            : (student?.user?.gender ?? ""),
        rollNumber: student?.roll_number ?? student?.rollNumber ?? "",
        classId: classKey,
        className:
          entry?.grade ?? entry?.name ?? entry?.title ?? "Unnamed Class",
        joinedAt: student?.created_at ?? student?.user?.created_at ?? null,
      });
    });
  });

  let classes = Array.from(classMap.values());

  // ---------- FALLBACK: SYNTHESIZE CLASS IF NONE FOUND ----------
  if (classes.length === 0 && data?.grade) {
    classes = [
      {
        id: String(data.grade.id || `grade-${teacherId}`),
        grade: data.grade.name || "Unnamed Class",
        subject: data.subject || null,
        school: data.school || null,
        createdAt: data.created_at || null,
        updatedAt: data.updated_at || null,
        students: Array.isArray(data.students) ? data.students : [],
      },
    ];
  }

  // ---------- BUILD STUDENT MAP ----------
  const studentMap = new Map();

  const collectStudent = (student, className) => {
    if (!student || typeof student !== "object") return;
    const studentId =
      student?.id ??
      student?._id ??
      student?.student_id ??
      student?.studentId ??
      student?.user_id ??
      student?.value;
    if (!studentId) return;
    const key = String(studentId);
    const baseStudent = {
      id: key,
      name:
        student?.name ??
        student?.user?.name ??
        student?.full_name ??
        "Unnamed Student",
      email: student?.email ?? student?.user?.email ?? "",
      gender:
        typeof student?.gender === "string"
          ? student.gender
          : (student?.user?.gender ?? ""),
      rollNumber: student?.roll_number ?? student?.rollNumber ?? "",
      classes: [],
    };

    if (!studentMap.has(key)) {
      baseStudent.classes = className ? [className] : [];
      studentMap.set(key, baseStudent);
    } else if (className) {
      const existing = studentMap.get(key);
      const nextClasses = new Set(existing.classes);
      nextClasses.add(className);
      existing.classes = Array.from(nextClasses);
    }
  };

  classes.forEach((cls) => {
    cls.students.forEach((student) => collectStudent(student, cls.grade));
  });

  toArray(data?.students).forEach((student) =>
    collectStudent(student, data?.grade?.name ?? school?.name ?? ""),
  );

  const students = Array.from(studentMap.values());

  // ---------- RETURN NORMALIZED TEACHER ----------
  return {
    id: teacherId ? String(teacherId) : undefined,
    name: data?.name ?? data?.user?.name ?? "",
    email: data?.email ?? data?.user?.email ?? "",
    phone: data?.phone ?? data?.user?.phone ?? "",
    address: data?.address ?? data?.user?.address ?? "",
    subject:
      resolveSubjectLabel(data?.subject) ||
      resolveSubjectLabel(data?.subject_name) ||
      resolveSubjectLabel(data?.subjects?.[0]) ||
      "",
    createdAt: data?.created_at ?? data?.user?.created_at ?? null,
    school,
    schools: school ? [school] : [],
    classes,
    students,
    hasFullDetail: assumeFullDetail,
  };
};

const TeacherDetail = () => {
   const Navigate = useNavigate();
  const { role: storeRole, user } = useAuthStore();
  const resolvedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";
  const dashboardTitle =
    resolvedRole === "school" ? "School Dashboard" : "Admin Dashboard";
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const locationTeacher = state?.teacher;
  const locationTeacherId = state?.teacherId;

  const fallbackTeacher = React.useMemo(
    () => normaliseTeacherDetail(locationTeacher, { assumeFullDetail: false }),
    [locationTeacher],
  );

  const teacherId = React.useMemo(
    () => paramsId || locationTeacherId || fallbackTeacher?.id,
    [paramsId, locationTeacherId, fallbackTeacher?.id],
  );

  const [teacher, setTeacher] = React.useState(fallbackTeacher);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const hasFetchedRef = React.useRef(false);
  const [studentSearch, setStudentSearch] = React.useState("");
  const [classSearch, setClassSearch] = React.useState("");

  React.useEffect(() => {
    hasFetchedRef.current = false;
  }, [teacherId]);

  React.useEffect(() => {
    if (fallbackTeacher) {
      setTeacher((prev) => prev ?? fallbackTeacher);
      if (fallbackTeacher.hasFullDetail) return;
    }

    if (!teacherId) {
      const message =
        "Teacher identifier is missing. Please open this page from the teachers list.";
      setError(message);
      toast.error(message);
      return;
    }

    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    let isMounted = true;

    const fetchTeacher = async () => {
      setFetching(true);
      setError("");
      try {
        const response = await getSpecificTeacherDetail(teacherId);
        if (isMounted) {
          setTeacher(
            normaliseTeacherDetail(response, { assumeFullDetail: true }),
          );
        }
      } catch (err) {
        const message =
          err?.message || "Unable to load teacher details. Please try again.";
        if (isMounted) setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setFetching(false);
      }
    };

    fetchTeacher();
    return () => {
      isMounted = false;
    };
  }, [fallbackTeacher, teacherId]);

  const summary = React.useMemo(() => {
    if (!teacher) {
      return {
        totalClasses: 0,
        totalStudents: 0,
        totalSchools: 0,
        classes: [],
        students: [],
        schools: [],
        classBreakdown: [],
        genderBreakdown: [],
      };
    }

    const classes = Array.isArray(teacher.classes) ? teacher.classes : [];
    const students = Array.isArray(teacher.students) ? teacher.students : [];

    const schoolMap = new Map();
    (teacher.schools || []).forEach((item) => {
      if (!item) return;
      const key =
        item?.id ??
        item?._id ??
        item?.school_id ??
        item?.schoolId ??
        item?.name;
      if (!schoolMap.has(key)) schoolMap.set(key, item);
    });

    if (teacher.school) {
      const key =
        teacher.school.id ??
        teacher.school._id ??
        teacher.school.school_id ??
        teacher.school.schoolId ??
        teacher.school.name;
      if (!schoolMap.has(key)) schoolMap.set(key, teacher.school);
    }

    const classBreakdown = classes.map((cls) => ({
      id: cls.id,
      grade: cls.grade,
      section: cls.section,
      studentCount: Array.isArray(cls.students) ? cls.students.length : 0,
    }));

    const genderCounter = students.reduce(
      (acc, student) => {
        const key =
          typeof student.gender === "string"
            ? student.gender.toLowerCase()
            : "unknown";
        if (key === "male") acc.male += 1;
        else if (key === "female") acc.female += 1;
        else acc.other += 1;
        return acc;
      },
      { male: 0, female: 0, other: 0 },
    );

    const genderBreakdown = [
      { label: "Female", value: genderCounter.female },
      { label: "Male", value: genderCounter.male },
    ];

    return {
      totalClasses: classes.length,
      totalStudents: students.length,
      totalSchools: schoolMap.size,
      classes,
      students,
      schools: Array.from(schoolMap.values()),
      classBreakdown,
      genderBreakdown,
    };
  }, [teacher]);

  const filteredStudents = React.useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) return summary.students || [];
    return (summary.students || []).filter((s) => {
      const haystack = [
        s.name,
        s.email,
        s.gender,
        Array.isArray(s.classes) ? s.classes.join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [summary.students, studentSearch]);

  const filteredClasses = React.useMemo(() => {
    const term = classSearch.trim().toLowerCase();
    if (!term) return summary.classes || [];
    return (summary.classes || []).filter((c) => {
      const haystack = [
        c.grade,
        c.section,
        c.subject?.subject || c.subject?.name || "",
        c.school?.name || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [summary.classes, classSearch]);
  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{dashboardTitle}</h4>
          <h1>Teacher Detail</h1>
          <p className="text-slate-600 text-md">
            Review the teaching footprint, assigned classes, and enrolled
            students for this educator.
          </p>
        </div>
        <div className="dh-right">
          <button
            type="button"
            className="global-btn secondary"
            onClick={() => Navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {teacher?.id && (
            <Link
              to={`${basePath}/add-new-teacher/${teacher.id}`}
              className="global-btn"
              state={{ teacherId: teacher.id, teacher }}
            >
              Edit Teacher <Edit size={16} className="ml-2" />
            </Link>
          )}
        </div>
      </div>

      <div className="dashboard-body">
        {error && (
          <Alert
            variant="destructive"
            className="alert-custom mb-4 bg-[#FDF7EC]"
          >
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {fetching && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        )}

        {!fetching && !error && teacher && (
          <>
            <div className="inner-detail-card dashboard-body-card-dtl">
              <div className="idc-left">
                <div className="flex gap-3">
                  <div className="school-icon">
                    <UserCog size={35} />
                  </div>
                  <div className="school-detail">
                    <h1>{teacher.name || "Unnamed Teacher"}</h1>
                    {teacher.subject && (
                      <p>
                        <Book size={16} className="text-[#AD474B]" />{" "}
                        <span>{teacher.subject}</span>
                      </p>
                    )}
                    <p>
                      <Mail size={16} className="text-[#AD474B]" />{" "}
                      <span>{teacher.email || "Not provided"}</span>
                    </p>
                    {teacher.phone && (
                      <p>
                        <Phone size={16} className="text-[#AD474B]" />{" "}
                        <span>{teacher.phone}</span>
                      </p>
                    )}
                    {teacher.school?.name && (
                      <p>
                        <School size={16} className="text-[#AD474B]" />{" "}
                        <span>{teacher.school.name}</span>
                      </p>
                    )}
                    {teacher.createdAt && (
                      <p>
                        <Calendar size={16} className="text-[#AD474B]" />
                        <span>
                          {`Teaching since ${format(
                            new Date(teacher.createdAt),
                            "MMM dd, yyyy",
                          )}`}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <section className="metrics-grid metrics-grid3 mt-5 mb-6">
              <DemographicCard
                icon={<Layers size={24} />}
                title="Classes Taught"
                classname="demoRed"
                count={summary.totalClasses}
                subheading="Active classroom assignments"
              />

              <DemographicCard
                icon={<GraduationCap size={24} />}
                title="Students"
                classname="demoGreen"
                count={summary.totalStudents}
                subheading="Students linked to this teacher"
              />

              <DemographicCard
                icon={<School size={24} />}
                title="Schools"
                classname="demoIndigo"
                count={summary.totalSchools}
                subheading="Institutions associated with this teacher"
              />
            </section>

            <div className="school-stats">
              <div className="flex gap-3 items-center school-stats-header">
                <div className="icon-world">
                  <BarChart />
                </div>
                <div className="school-stats-heading">
                  <h2>Teacher Insights</h2>
                  <p>Explore classes, students, and teaching analytics</p>
                </div>
              </div>

              <div className="school-stats-body">
                <Tabs defaultValue="students">
                  <TabsList className="ssb-tabs">
                    <TabsTrigger value="students">
                      <GraduationCap />{" "}
                      <span className="tab-text">Students</span>{" "}
                      <span>({summary.totalStudents})</span>
                    </TabsTrigger>
                    <TabsTrigger value="classes">
                      <Book /> <span className="tab-text">Classes</span>{" "}
                      <span>({summary.totalClasses})</span>
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                      <BarChart /> <span className="tab-text">Analytics</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="students" className="ssb-tabs-content">
                    <div className="ssb-tab-header">
                      <div className="ssb-tab-header-left">
                        <h1>Teacher&apos;s Students</h1>
                        <p>Students enrolled in this teacher&apos;s classes</p>
                      </div>
                      <div className="ssb-tab-header-right">
                        <TabSearch
                          value={studentSearch}
                          onChange={setStudentSearch}
                          placeholder="Search students"
                        />
                      </div>
                    </div>
                    <div className="ssb-tab-body">
                      {filteredStudents.length === 0 ? (
                        <p className="empty-state mt-3 text-gray-600">
                          No students assigned yet.
                        </p>
                      ) : (
                        <div className="list-card">
                          {filteredStudents.map((student) => (
                            <article
                              key={student.id}
                              className="list-card-item student-item"
                            >
                              <div className="list-card-header">
                                <div className="list-card-title">
                                  <div className="list-card-icon bg-purple-200 border border-purple-300 text-purple-800">
                                    <GraduationCap />
                                  </div>
                                  <div>
                                    <span className="list-card-label">
                                      {student.name}
                                    </span>
                                    {student.email && (
                                      <span className="list-card-subtitle">
                                        <span>
                                          <Mail size={15} />
                                        </span>
                                        <span className="control-email-overflow">
                                          {student.email}
                                        </span>
                                      </span>
                                    )}
                                    {student.gender && (
                                      <span className="list-card-subtitle capitalize">
                                        <span>
                                          <MarsIcon size={15} />
                                        </span>
                                        <span className="control-email-overflow">
                                          {student.gender}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="list-card-chip-wrap">
                                  <span className="list-card-chip chip-student bg-purple-200 border border-purple-300 text-purple-800">
                                    <span>
                                      <Book size={16} className="mr-2" />
                                    </span>
                                    Classes:{" "}
                                    <b>
                                      {student.classes?.length
                                        ? student.classes.join(", ")
                                        : "N/A"}
                                    </b>
                                  </span>
                                  {student.rollNumber && (
                                    <span className="list-card-chip chip-student bg-amber-200 border border-amber-300 text-amber-800">
                                      Roll: <b>{student.rollNumber}</b>
                                    </span>
                                  )}
                                </div>

                                <div className="list-card-action">
                                  <Link
                                    to={`${basePath}/view-centralized-student-detail/${student.id ?? ""}`}
                                    state={{
                                      studentId: student.id,
                                    }}
                                    className="view-link"
                                  >
                                    <Eye size={14} className="mr-2" /> View
                                    Detail
                                  </Link>

                                  <Link
                                    to={`${basePath}/centralized-student-form`}
                                    state={{
                                      studentId: student.id,
                                    }}
                                    className="edit-link"
                                  >
                                    <Edit size={14} className="mr-2" /> Edit
                                  </Link>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="classes" className="ssb-tabs-content">
                    <div className="ssb-tab-header">
                      <div className="ssb-tab-header-left">
                        <h1>Assigned Classes</h1>
                        <p>
                          Classrooms where this teacher is actively teaching
                        </p>
                      </div>
                      <div className="ssb-tab-header-right">
                        <TabSearch
                          value={classSearch}
                          onChange={setClassSearch}
                          placeholder="Search Classes"
                        />
                      </div>
                    </div>
                    <div className="ssb-tab-body">
                      {filteredClasses.length === 0 ? (
                        <p className="empty-state mt-3 text-gray-600">
                          No classes assigned yet.
                        </p>
                      ) : (
                        <div className="list-card">
                          {filteredClasses.map((cls) => (
                            <article
                              key={cls.id}
                              className="list-card-item class-item"
                            >
                              <div className="list-card-header">
                                <div className="list-card-title">
                                  <div className="list-card-icon bg-blue-200 border border-blue-300 text-blue-800">
                                    <UniversityIcon />
                                  </div>
                                  <div>
                                    <span className="list-card-label">
                                      {cls.grade}
                                    </span>
                                    {cls.subject && (
                                      <span className="list-card-subtitle">
                                        <Book size={15} />{" "}
                                        {cls.subject.subject ||
                                          cls.subject.name}
                                      </span>
                                    )}

                                    {cls.school && (
                                      <span className="list-card-subtitle">
                                        <School size={15} /> {cls.school.name}
                                      </span>
                                    )}

                                    {cls.updatedAt && (
                                      <span className="list-card-subtitle">
                                        <Calendar size={15} />{" "}
                                        {`Updated ${format(
                                          new Date(cls.updatedAt),
                                          "MMM dd, yyyy",
                                        )}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="list-card-chip-wrap">
                                  <span className="list-card-chip bg-blue-200 border border-blue-300 text-blue-800">
                                    <UserCog size={15} className="mr-2" />
                                    {teacher.name || "Teacher"}
                                  </span>
                                  <span className="list-card-chip bg-green-200 border border-green-300 text-green-800">
                                    <GraduationCap size={15} className="mr-2" />
                                    {cls.students.length} student
                                    {cls.students.length === 1 ? "" : "s"}
                                  </span>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="ssb-tabs-content">
                    <div className="analytics-grid">
                      <section className="analytics-section">
                        <header className="analytics-section-header">
                          <div>
                            <h2>Class Breakdown</h2>
                            <p>Distribution of students across classes</p>
                          </div>
                        </header>
                        {summary.classBreakdown.length === 0 ? (
                          <p className="empty-state mt-3 text-gray-600">
                            No class analytics available yet.
                          </p>
                        ) : (
                          <div className="table-wrapper">
                            <table className="analytics-table">
                              <thead>
                                <tr>
                                  <th>Class</th>
                                  <th>Students</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summary.classBreakdown.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.grade}</td>
                                    <td>{item.studentCount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>

                      <section className="analytics-section">
                        <header className="analytics-section-header">
                          <div>
                            <h2>Student Demographics</h2>
                            <p>Gender-wise split of enrolled students</p>
                          </div>
                        </header>
                        {summary.totalStudents === 0 ? (
                          <p className="empty-state mt-3 text-gray-600">
                            Gender information is not available.
                          </p>
                        ) : (
                          <>
                            {summary.genderBreakdown.map((item) => {
                              const percent =
                                summary.totalStudents > 0
                                  ? Math.round(
                                    (item.value / summary.totalStudents) *
                                    100,
                                  )
                                  : 0;
                              const barColor = item.label
                                .toLowerCase()
                                .includes("female")
                                ? "bg-green-500"
                                : item.label.toLowerCase().includes("male")
                                  ? "bg-blue-500"
                                  : "bg-slate-400";
                              return (
                                <div
                                  className={`gender-progress ${item.label.toLowerCase() === "female"
                                      ? "female-progress"
                                      : "male-progress"
                                    }`}
                                  key={item.label}
                                >
                                  <div className="gp-header">
                                    <div className="gp-left">
                                      <div className="gp-icon">
                                        <Venus size={17} />
                                      </div>
                                      <span>{item.label}</span>
                                    </div>
                                    <div className="gp-right">
                                      Students: {item.value}
                                    </div>
                                  </div>
                                  <div className="gp-progress-bar">
                                    <div
                                      className={`h-[27px] ${barColor} rounded-[6px] transition-all`}
                                      style={{ width: `${percent}%` }}
                                    />
                                    <span
                                      style={{
                                        left: `${percent - 8}%`,
                                        transform: `translate(${percent}%, -50%)`,
                                      }}
                                    >
                                      {percent}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </section>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        )}

        {!fetching && !error && !teacher && (
          <p className="text-gray-500">No teacher data available.</p>
        )}
      </div>
    </>
  );
};

export default TeacherDetail;
