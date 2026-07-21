import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircleIcon,
  BarChart,
  Book,
  Calendar,
  ClipboardList,
  Edit,
  Layers,
  Loader2,
  Mail,
  Phone,
  School,
  User,
} from "lucide-react";
import { getStudentById } from "@/api/studentApi";
import TabSearch from "@/components/TabSearch";
import DemographicCard from "@/components/DemographicCard";
import { useAuthStore } from "@/store/auth";

const toArray = (value) => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const toSentenceCase = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};
const normaliseStudentDetail = (payload, options = {}) => {
  const { assumeFullDetail = false } = options;

  if (!payload) {
    return null;
  }

  const data = payload?.data ?? payload;
  if (!data) {
    return null;
  }

  const studentId =
    data?.id ??
    data?._id ??
    data?.student_id ??
    data?.studentId ??
    data?.user?.id ??
    data?.user_id;

  const school =
    data?.school && typeof data.school === "object"
      ? {
          id:
            data.school.id ??
            data.school._id ??
            data.school.school_id ??
            data.school.value ??
            undefined,
          name:
            data.school.name ??
            data.school.label ??
            data.school.school_name ??
            "Unnamed School",
          email: data.school.email ?? "",
          address: data.school.address ?? "",
          phone: data.school.phone ?? "",
          createdAt: data.school.created_at ?? data.school.createdAt ?? null,
        }
      : null;

  const grade =
    data?.grade && typeof data.grade === "object"
      ? {
          id:
            data.grade.id ??
            data.grade._id ??
            data.grade.grade_id ??
            data.grade.value ??
            undefined,
          name:
            data.grade.name ??
            data.grade.label ??
            data.grade.title ??
            "Unnamed Grade",
          createdAt: data.grade.created_at ?? data.grade.createdAt ?? null,
        }
      : null;

  const coreClass =
    data?.school_class && typeof data.school_class === "object"
      ? {
          id:
            data.school_class.id ??
            data.school_class._id ??
            data.school_class.class_id ??
            data.school_class.value ??
            grade?.id ??
            data?.school_class_id ??
            undefined,
          grade:
            (typeof data.school_class.grade === "string"
              ? data.school_class.grade
              : data.school_class.grade?.name) ??
            grade?.name ??
            data.school_class.name ??
            data.school_class.title ??
            "Unnamed Class",
          section: data.school_class.section ?? "",
          createdAt:
            data.school_class.created_at ?? data.school_class.createdAt ?? null,
          students: Array.isArray(data.school_class.students)
            ? data.school_class.students
            : [],
        }
      : grade
      ? {
          id: grade.id ?? data?.school_class_id ?? `grade-${studentId ?? "na"}`,
          grade: grade.name ?? "Unnamed Class",
          section: "",
          createdAt: grade.createdAt ?? null,
          students: Array.isArray(data.grade?.students)
            ? data.grade.students
            : [],
        }
      : data?.school_class_id
      ? {
          id: data.school_class_id,
          grade: "Assigned Class",
          section: "",
          createdAt: null,
          students: [],
        }
      : null;

  const additionalClasses = [
    ...toArray(data?.classes),
    ...toArray(data?.enrolledClasses),
  ]
    .filter((entry) => entry && typeof entry === "object")
    .map((entry, index) => ({
      id:
        entry?.id ??
        entry?._id ??
        entry?.class_id ??
        entry?.classId ??
        entry?.value ??
        `class-${index}`,
      grade:
        entry?.grade?.name ??
        entry?.grade_name ??
        entry?.grade ??
        entry?.name ??
        entry?.title ??
        "Unnamed Class",
      section: entry?.section ?? entry?.label ?? "",
      createdAt: entry?.created_at ?? entry?.createdAt ?? null,
      students: Array.isArray(entry?.students) ? entry.students : [],
    }));

  const classMap = new Map();
  [coreClass, ...additionalClasses].forEach((cls) => {
    if (!cls) {
      return;
    }
    const key = cls.id ?? `${cls.grade}-${cls.section}`;
    if (!classMap.has(key)) {
      classMap.set(key, cls);
    }
  });

  const classes = Array.from(classMap.values()).map((cls) => ({
    ...cls,
    id: cls?.id !== null && cls?.id !== undefined ? String(cls.id) : undefined,
    students: Array.isArray(cls?.students) ? cls.students : [],
  }));

  const phoneValue =
    data?.phone ??
    data?.user?.phone ??
    (typeof data?.user?.phone === "number"
      ? String(data.user.phone)
      : undefined) ??
    "";

  const genderText =
    typeof data?.gender === "string"
      ? data.gender
      : typeof data?.user?.gender === "string"
      ? data.user.gender
      : "";

  return {
    id: studentId ? String(studentId) : undefined,
    name: data?.user?.name ?? data?.name ?? "",
    email: data?.user?.email ?? data?.email ?? "",
    phone: phoneValue,
    address: data?.address ?? data?.user?.address ?? "",
    gender: genderText ? genderText.toLowerCase() : "",
    rollNumber: data?.roll_number ?? data?.rollNumber ?? "",
    createdAt: data?.created_at ?? data?.user?.created_at ?? null,
    school,
    grade,
    classes,
    progress: data?.progress ?? 0,
    exercisesDone: data?.exercises_done ?? 0,
    hasFullDetail: assumeFullDetail,
  };
};

const StudentDetail = () => {
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

  const locationStudent = state?.student;
  const locationStudentId = state?.studentId;

  const fallbackStudent = React.useMemo(
    () => normaliseStudentDetail(locationStudent, { assumeFullDetail: false }),
    [locationStudent]
  );

  const studentId = React.useMemo(
    () => paramsId || locationStudentId || fallbackStudent?.id,
    [paramsId, locationStudentId, fallbackStudent?.id]
  );

  const [student, setStudent] = React.useState(fallbackStudent);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [classSearch, setClassSearch] = React.useState("");
  const hasFetchedRef = React.useRef(false);

  React.useEffect(() => {
    hasFetchedRef.current = false;
  }, [studentId]);

  React.useEffect(() => {
    if (fallbackStudent) {
      setStudent((prev) => prev ?? fallbackStudent);
      if (fallbackStudent.hasFullDetail) {
        return;
      }
    }

    if (!studentId) {
      const message =
        "Student identifier is missing. Please open this page from the students list.";
      setError(message);
      toast.error(message);
      return;
    }

    if (hasFetchedRef.current) {
      return;
    }

    hasFetchedRef.current = true;

    let isMounted = true;

    const fetchStudent = async () => {
      setFetching(true);
      setError("");
      try {
        const response = await getStudentById(studentId);
        if (isMounted) {
          setStudent(
            normaliseStudentDetail(response, { assumeFullDetail: true })
          );
        }
      } catch (err) {
        const message =
          err?.message || "Unable to load student details. Please try again.";
        if (isMounted) {
          setError(message);
        }
        toast.error(message);
      } finally {
        if (isMounted) {
          setFetching(false);
        }
      }
    };

    fetchStudent();

    return () => {
      isMounted = false;
    };
  }, [fallbackStudent, studentId]);

  const summary = React.useMemo(() => {
    if (!student) {
      return {
        totalClasses: 0,
        progress: 0,
        exercisesDone: 0,
        classes: [],
        school: null,
        primaryClassLabel: "",
      };
    }

    const classes = Array.isArray(student.classes) ? student.classes : [];
    const primaryClass = classes[0] ?? null;

    const primaryClassLabel =
      (primaryClass && primaryClass.grade ? String(primaryClass.grade) : "") ||
      student.grade?.name ||
      "";

    return {
      totalClasses: classes.length,
      progress:
        typeof student.progress === "number" && !Number.isNaN(student.progress)
          ? student.progress
          : 0,
      exercisesDone:
        typeof student.exercisesDone === "number" &&
        !Number.isNaN(student.exercisesDone)
          ? student.exercisesDone
          : 0,
      classes,
      school: student.school ?? null,
      primaryClassLabel,
    };
  }, [student]);

  const filteredClasses = React.useMemo(() => {
    const term = classSearch.trim().toLowerCase();
    if (!term) return summary.classes || [];
    return (summary.classes || []).filter((cls) => {
      const haystack = [cls.className, cls.grade, cls.section, cls.schoolName]
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
          <h1>Student Detail</h1>
          <p className="text-slate-600 text-md">
            Review this learner&apos;s enrollment, progress, and classroom
            insights.
          </p>
        </div>
        <div className="dh-right">
        {student?.id && (
          <Link
            to={`${basePath}/add-new-student/${student.id}`}
            className="global-btn"
            state={{ studentId: student.id, student }}
          >
              Edit Student <Edit size={16} className="ml-2" />
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

        {!fetching && !error && student && (
          <>
            <div className="inner-detail-card dashboard-body-card-dtl">
              <div className="idc-left">
                <div className="flex gap-3">
                  <div className="school-icon">
                    <User size={35} />
                  </div>
                  <div className="school-detail">
                    <h1>{student.name || "Unnamed Student"}</h1>
                    {student.rollNumber && (
                      <p>
                        <ClipboardList size={16} className="text-[#AD474B]" />{" "}
                        <span>Roll #: {student.rollNumber}</span>
                      </p>
                    )}
                    <p>
                      <Mail size={16} className="text-[#AD474B]" />{" "}
                      <span>{student.email || "Not provided"}</span>
                    </p>
                    {student.school?.name && (
                      <p>
                        <School size={16} className="text-[#AD474B]" />{" "}
                        <span>{student.school.name}</span>
                      </p>
                    )}
                    {summary.primaryClassLabel && (
                      <p>
                        <Book size={16} className="text-[#AD474B]" />{" "}
                        <span>Class: {summary.primaryClassLabel}</span>
                      </p>
                    )}
                    {student.gender && (
                      <p>
                        <User size={16} className="text-[#AD474B]" />{" "}
                        <span>{toSentenceCase(student.gender)}</span>
                      </p>
                    )}
                    {student.phone && (
                      <p>
                        <Phone size={16} className="text-[#AD474B]" />{" "}
                        <span>{student.phone}</span>
                      </p>
                    )}
                    {student.createdAt && (
                      <p>
                        <Calendar size={16} className="text-[#AD474B]" />
                        <span>
                          {`Joined on ${format(
                            new Date(student.createdAt),
                            "MMM dd, yyyy"
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
                title="Classes"
                classname="demoRed"
                count={summary.totalClasses}
                subheading="Learning Environments"
              />

              <DemographicCard
                icon={<BarChart size={24} />}
                title="Progress"
                classname="demoGreen"
                count={summary.progress}
                subheading="Student progress"
              />

              <DemographicCard
                icon={<ClipboardList size={24} />}
                title="Exercises Done"
                classname="demoBlue"
                count={summary.exercisesDone}
                subheading="Completed practice activities"
              />
            </section>

            <div className="school-stats">
              <div className="flex gap-3 items-center school-stats-header">
                <div className="icon-world">
                  <BarChart />
                </div>
                <div className="school-stats-heading">
                  <h2>Student Insights</h2>
                  <p>Explore classes and progress for this learner</p>
                </div>
              </div>

              <div className="school-stats-body">
                <Tabs defaultValue="classes">
                  <TabsList className="ssb-tabs">
                    <TabsTrigger value="classes">
                      <Book /> <span className="tab-text">Classes</span>{" "}
                      <span>({summary.totalClasses})</span>
                    </TabsTrigger>
                    <TabsTrigger value="progress">
                      <BarChart /> <span className="tab-text">Progress</span>
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                      <ClipboardList />{" "}
                      <span className="tab-text">Analytics</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="classes" className="ssb-tabs-content">
                    <div className="ssb-tab-header">
                      <div className="ssb-tab-header-left">
                        <h1>Enrolled Classes</h1>
                        <p>Courses and sections assigned to this student</p>
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
                              key={cls.id ?? cls.grade}
                              className="list-card-item class-item"
                            >
                              <div className="list-card-header">
                                <div className="list-card-title">
                                  <div className="list-card-icon bg-blue-200 border border-blue-300 text-blue-800">
                                    <Book />
                                  </div>
                                  <div>
                                    <span className="list-card-label">
                                      {cls.grade}
                                    </span>
                                    {cls.createdAt && (
                                      <span className="list-card-subtitle">
                                        <Calendar size={15} />{" "}
                                        {`Created ${format(
                                          new Date(cls.createdAt),
                                          "MMM dd, yyyy"
                                        )}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="list-card-chip-wrap">
                                  {student.school?.name && (
                                    <span className="list-card-chip bg-blue-200 border border-blue-300 text-blue-800">
                                      <School size={15} className="mr-2" />
                                      {student.school.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="progress" className="ssb-tabs-content">
                    <div className="ssb-tab-header">
                      <div className="ssb-tab-header-left">
                        <h1>Learning Progress</h1>
                        <p>Track current completion status and milestones</p>
                      </div>
                    </div>
                    <div className="ssb-tab-body">
                      <div className="list-card progress-card">
                        <article className="list-card-item">
                          <div className="list-card-header">
                            <div className="list-card-title">
                              <div className="list-card-icon bg-green-200 border border-green-300 text-green-800">
                                <BarChart />
                              </div>
                              <div>
                                <span className="list-card-label">
                                  Overall Progress
                                </span>
                                <span className="list-card-subtitle">
                                  This feature will display real-time completion
                                  metrics.
                                </span>
                              </div>
                            </div>
                            <div className="list-card-chip-wrap">
                              <span className="list-card-chip bg-green-200 border border-green-300 text-green-800">
                                {summary.progress}% complete
                              </span>
                              <span className="list-card-chip bg-amber-200 border border-amber-300 text-amber-800">
                                Exercises: {summary.exercisesDone}
                              </span>
                            </div>
                          </div>
                          <div className="list-card-body">
                            <p className="empty-state mb-0 mt-3 text-gray-600">
                              Progress analytics are coming soon. Keep an eye on
                              this section for detailed reports.
                            </p>
                          </div>
                        </article>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="analytics" className="ssb-tabs-content">
                    <div className="analytics-grid">
                      <section className="analytics-section">
                        <header className="analytics-section-header">
                          <div>
                            <h2>Student Overview</h2>
                            <p>Key information and enrollment metadata</p>
                          </div>
                        </header>
                        <div className="table-wrapper">
                          <table className="analytics-table">
                            <tbody>
                              <tr>
                                <th>Name</th>
                                <td>{student.name || "Unnamed Student"}</td>
                              </tr>
                              <tr>
                                <th>Email</th>
                                <td>{student.email || "Not provided"}</td>
                              </tr>
                              <tr>
                                <th>Roll Number</th>
                                <td>{student.rollNumber || "Not assigned"}</td>
                              </tr>
                              <tr>
                                <th>School</th>
                                <td>
                                  {student.school?.name || "Not assigned"}
                                </td>
                              </tr>
                              <tr>
                                <th>Class</th>
                                <td>
                                  {summary.primaryClassLabel || "Not assigned"}
                                </td>
                              </tr>
                              <tr>
                                <th>Gender</th>
                                <td>
                                  {student.gender
                                    ? toSentenceCase(student.gender)
                                    : "Not provided"}
                                </td>
                              </tr>
                              <tr>
                                <th>Phone</th>
                                <td>{student.phone || "Not provided"}</td>
                              </tr>
                              <tr>
                                <th>Address</th>
                                <td>{student.address || "Not provided"}</td>
                              </tr>
                              <tr>
                                <th>Joined</th>
                                <td>
                                  {student.createdAt
                                    ? format(
                                        new Date(student.createdAt),
                                        "MMM dd, yyyy"
                                      )
                                    : "N/A"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        )}

        {!fetching && !error && !student && (
          <p className="text-gray-500">No student data available.</p>
        )}
      </div>
    </>
  );
};

export default StudentDetail;
