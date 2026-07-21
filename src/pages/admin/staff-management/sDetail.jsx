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
  Edit,
  Eye,
  Globe,
  GraduationCap,
  List,
  Loader2,
  Mail,
  School,
  University,
  UniversityIcon,
  UserCog,
} from "lucide-react";
import { getSpecificSchoolDetail } from "@/api/schoolApi";
import TabSearch from "@/components/TabSearch";
import DemographicCard from "@/components/DemographicCard";
import { useAuthStore } from "@/store/auth";

const toSearchText = (value) =>
  value === null || value === undefined
    ? ""
    : JSON.stringify(value, null, 0).toLowerCase();

const normaliseSchool = (payload) => {
  if (!payload) return null;
  if (payload?.data?.data) return payload.data.data;
  if (payload?.data) return payload.data;
  return payload;
};

const getClassGradeName = (classItem) => {
  if (!classItem) {
    return "Unnamed Grade";
  }

  const gradeSource =
    classItem?.grade ??
    classItem?.grade_info ??
    classItem?.gradeInfo ??
    classItem?.grade_data ??
    classItem?.gradeData;

  if (typeof gradeSource === "string") {
    const trimmed = gradeSource.trim();
    if (trimmed) {
      return trimmed;
    }
  } else if (
    gradeSource &&
    typeof gradeSource === "object" &&
    !Array.isArray(gradeSource)
  ) {
    const name =
      gradeSource?.name ??
      gradeSource?.title ??
      gradeSource?.label ??
      gradeSource?.grade_name ??
      gradeSource?.gradeName ??
      "";
    if (name) {
      return String(name);
    }

    if (
      gradeSource?.id !== null &&
      gradeSource?.id !== undefined &&
      gradeSource?.id !== ""
    ) {
      return `Grade ${gradeSource.id}`;
    }
  }

  const fallbackName =
    classItem?.grade_name ??
    classItem?.gradeName ??
    classItem?.grade_label ??
    classItem?.gradeLabel ??
    classItem?.grade_level ??
    classItem?.gradeLevel ??
    "";

  if (typeof fallbackName === "string" && fallbackName.trim().length > 0) {
    return fallbackName.trim();
  }

  if (
    classItem?.grade_id !== null &&
    classItem?.grade_id !== undefined &&
    classItem?.grade_id !== ""
  ) {
    return `Grade ${classItem.grade_id}`;
  }

  if (
    typeof classItem?.grade === "number" ||
    (!gradeSource && typeof classItem?.grade === "string")
  ) {
    const value = String(classItem?.grade ?? "").trim();
    if (value) {
      return value.startsWith("Grade") ? value : `Grade ${value}`;
    }
  }

  return "Unnamed Grade";
};

const SchoolDetail = () => {
  const { role: storeRole, user } = useAuthStore();
  const resolvedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const isSchoolRole = resolvedRole === "school";
  const userSchoolId =
    user?.school_id ??
    user?.schoolId ??
    user?.school?.id ??
    user?.school?._id ??
    null;
  const basePath = isSchoolRole ? "/school" : "/admin";
  const dashboardTitle = isSchoolRole ? "School Dashboard" : "Admin Dashboard";
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateSchool = normaliseSchool(state?.school);
  const schoolId =
    paramsId ||
    state?.schoolId ||
    fallbackStateSchool?._id ||
    fallbackStateSchool?.id ||
    userSchoolId;

  const [school, setSchool] = React.useState(fallbackStateSchool);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [teacherSearch, setTeacherSearch] = React.useState("");
  const [studentSearch, setStudentSearch] = React.useState("");
  const [classSearch, setClassSearch] = React.useState("");

  React.useEffect(() => {
    if (fallbackStateSchool) {
      setSchool(fallbackStateSchool);
      if (fallbackStateSchool.hasFullDetail) return;
    }

    if (!schoolId) {
      const message =
        "School identifier is missing. Please open this page from the schools list.";
      setError(message);
      toast.error(message);
      return;
    }

    let isActive = true;

    const fetchSchool = async () => {
      setFetching(true);
      setError("");

      try {
        const result = await getSpecificSchoolDetail(schoolId);
        if (isActive) {
          setSchool(normaliseSchool(result));
        }
      } catch (err) {
        const message =
          err?.message || "Unable to load school details. Please try again.";
        if (isActive) {
          setError(message);
        }
        toast.error(message);
      } finally {
        if (isActive) {
          setFetching(false);
        }
      }
    };

    fetchSchool();

    return () => {
      isActive = false;
    };
  }, [fallbackStateSchool, schoolId]);

  const classes = React.useMemo(
    () => (Array.isArray(school?.classes) ? school.classes : []),
    [school]
  );

  const summary = React.useMemo(() => {
    const base = {
      totalTeachers: 0,
      totalStudents: 0,
      totalClasses: classes.length,
      teachers: [],
      students: [],
      teacherStats: [],
    };

    const aggregate = classes.reduce((acc, currentClass) => {
      const classTeachers = Array.isArray(currentClass?.teachers)
        ? currentClass.teachers
        : [];
      const classStudents = Array.isArray(currentClass?.students)
        ? currentClass.students
        : [];
      const gradeName = getClassGradeName(currentClass);

      acc.totalTeachers += classTeachers.length;
      acc.totalStudents += classStudents.length;

      classTeachers.forEach((teacher) => {
        const teacherKey =
          teacher?.user?.id ??
          teacher?.user_id ??
          teacher?.id ??
          `${teacher?.user?.email}-${currentClass?.id}`;

        acc.teachers.push({
          ...teacher,
          classMeta: {
            grade: gradeName,
          },
        });

        const statIndex = acc.teacherStats.findIndex(
          (entry) => entry.key === teacherKey
        );

        if (statIndex === -1) {
          acc.teacherStats.push({
            key: teacherKey,
            teacher,
            classCount: 1,
            studentCount: classStudents.length,
          });
        } else {
          const current = acc.teacherStats[statIndex];
          acc.teacherStats.splice(statIndex, 1, {
            ...current,
            classCount: current.classCount + 1,
            studentCount: current.studentCount + classStudents.length,
          });
        }
      });

      classStudents.forEach((student) => {
        acc.students.push({
          ...student,
          classMeta: {
            grade: gradeName,
            section: currentClass?.section,
          },
        });
      });

      return acc;
    }, base);

    aggregate.teacherStats.sort((a, b) => {
      const left = a.teacher?.user?.name ?? "";
      const right = b.teacher?.user?.name ?? "";
      return left.localeCompare(right);
    });

    return aggregate;
  }, [classes]);

  const filteredTeachers = React.useMemo(() => {
    const term = teacherSearch.trim().toLowerCase();
    if (!term) return summary.teachers || [];
    return (summary.teachers || []).filter((t) =>
      toSearchText(t).includes(term)
    );
  }, [summary.teachers, teacherSearch]);

  const filteredStudents = React.useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) return summary.students || [];
    return (summary.students || []).filter((s) =>
      toSearchText(s).includes(term)
    );
  }, [summary.students, studentSearch]);

  const filteredClasses = React.useMemo(() => {
    const term = classSearch.trim().toLowerCase();
    if (!term) return classes || [];
    return (classes || []).filter((c) =>
      toSearchText({
        grade: getClassGradeName(c),
        section: c.section,
        teachers: c.teachers,
        students: c.students,
      }).includes(term)
    );
  }, [classes, classSearch]);

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{dashboardTitle}</h4>
          <h1>Educational Institution Profile</h1>
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

        {!fetching && !error && school && (
          <>
            <div className="inner-detail-card dashboard-body-card-dtl">
              <div className="idc-left">
                <div className="flex gap-5">
                  <div className="school-icon">
                    <School size={35} />
                  </div>
                  <div className="school-detail">
                    <h1>{school.name ?? "Unnamed School"}</h1>
                    <p>
                      <Mail size={16} className="text-[#AD474B]" />{" "}
                      <span>{school.email || "—"}</span>
                    </p>
                    <p>
                      <Calendar size={16} className="text-[#AD474B]" />
                      <span>
                        {`Member since ${
                          school.created_at
                            ? format(
                                new Date(school.created_at),
                                "MMM dd, yyyy • hh:mm a"
                              )
                            : ""
                        }`}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="metrics-grid metrics-grid3 mt-5 mb-6">
              <DemographicCard
                icon={<UserCog size={24} />}
                title="Teachers"
                classname="demoPurple"
                count={summary.totalTeachers}
                subheading="Active educators across all classes"
              />
              <DemographicCard
                icon={<GraduationCap size={24} />}
                title="Students"
                classname="demoGreen"
                count={summary.totalStudents}
                subheading="Enrolled Students"
              />
              <DemographicCard
                icon={<Book size={24} />}
                title="Classes"
                classname="demoRed"
                count={summary.totalClasses}
                subheading="Active classes"
              />
            </section>

            <div className="school-stats">
              <div className="flex gap-5 items-center school-stats-header">
                <div className="icon-world">
                  <Globe />
                </div>
                <div className="school-stats-heading">
                  <h2>School Management</h2>
                  <p>Comprehensive overview of institutional data</p>
                </div>
              </div>

              <div className="school-stats-body">
                <Tabs defaultValue="teachers">
                  <TabsList className="ssb-tabs">
                    <TabsTrigger value="teachers">
                      <UserCog /> <span className="tab-text">Teachers</span>{" "}
                      <span>({summary.totalTeachers})</span>
                    </TabsTrigger>
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
                  <TabsContent value="teachers" className="ssb-tabs-content">
                    <div className="ssb-tab-header">
                      <div className="ssb-tab-header-left">
                        <h1>School Teachers</h1>
                        <p>Manage and monitor faculty members</p>
                      </div>
                      <div className="ssb-tab-header-right">
                        <TabSearch
                          value={teacherSearch}
                          onChange={setTeacherSearch}
                          placeholder="Search Teachers"
                        />
                      </div>
                    </div>
                    <div className="ssb-tab-body">
                      {filteredTeachers.length === 0 ? (
                        <p className="empty-state mt-3 text-gray-600">
                          No teachers assigned yet.
                        </p>
                      ) : (
                        <div className="list-card">
                          {filteredTeachers.map((teacher) => (
                            <article
                              key={teacher.id}
                              className="list-card-item teacher-item"
                            >
                              <div className="list-card-header">
                                <div className="list-card-title">
                                  <div className="list-card-icon">
                                    <UserCog />
                                  </div>
                                  <div>
                                    <span className="list-card-label">
                                      {teacher.user?.name ?? "Unnamed Teacher"}
                                    </span>
                                    <span className="list-card-subtitle">
                                      <Mail size={15} />{" "}
                                      {teacher.user?.email ?? "N/A"}
                                    </span>

                                    <span className="list-card-subtitle">
                                      <Calendar size={15} />
                                      {`Joined ${
                                        teacher?.user.created_at
                                          ? format(
                                              new Date(
                                                teacher.user?.created_at
                                              ),
                                              "MMM dd, yyyy"
                                            )
                                          : ""
                                      }`}
                                    </span>
                                  </div>
                                </div>
                                <div className="list-card-chip-wrap">
                                  <span className="list-card-chip">
                                    <Book size={15} className="mr-2" />
                                    {`${teacher.classMeta.grade} - ${
                                      teacher.subject?.subject ?? "Not set"
                                    }`}
                                  </span>
                                </div>

                                <div className="list-card-action">
                                  <Link
                                    to={`${basePath}/view-teacher-detail/${
                                      teacher?._id ?? teacher?.id ?? ""
                                    }`}
                                    state={{
                                      teacherId: teacher?._id ?? teacher?.id,
                                      teacher: teacher,
                                    }}
                                    className="view-link"
                                  >
                                    <Eye size={14} className="mr-2" /> View
                                    Detail
                                  </Link>

                                  <Link
                                    to={`${basePath}/add-new-teacher/${
                                      teacher?._id ?? teacher?.id ?? ""
                                    }`}
                                    state={{
                                      teacherId: teacher?._id ?? teacher?.id,
                                      teacher: teacher,
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
                  <TabsContent value="students" className="ssb-tabs-content">
                    <div className="ssb-tab-header">
                      <div className="ssb-tab-header-left">
                        <h1>School Students</h1>
                        <p>Monitor student enrollment and progress</p>
                      </div>
                      <div className="ssb-tab-header-right">
                        <TabSearch
                          value={studentSearch}
                          onChange={setStudentSearch}
                          placeholder="Search Students"
                        />
                      </div>
                    </div>
                    <div className="ssb-tab-body">
                      {filteredStudents.length === 0 ? (
                        <p className="empty-state mt-3 text-gray-600">
                          No students enrolled yet.
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
                                      {student.user?.name ?? "Unnamed Student"}
                                    </span>
                                    <span className="list-card-subtitle">
                                      <Mail size={15} />{" "}
                                      {student.user?.email ?? "N/A"}
                                    </span>

                                    <span className="list-card-subtitle">
                                      <Calendar size={15} />
                                      {`Joined ${
                                        student?.user.created_at
                                          ? format(
                                              new Date(
                                                student.user?.created_at
                                              ),
                                              "MMM dd, yyyy"
                                            )
                                          : ""
                                      }`}
                                    </span>
                                  </div>
                                </div>

                                <div className="list-card-chip-wrap">
                                  <span className="list-card-chip chip-student">
                                    <Book size={15} className="mr-1" />
                                    Class: &nbsp;
                                    <b>{student.classMeta.grade}</b>
                                  </span>
                                  <span className="list-card-chip chip-student">
                                    <List size={15} className="mr-1" />

                                    {student.roll_number ?? "N/A"}
                                  </span>
                                </div>

                                <div className="list-card-action">
                                  <Link
                                    to={`${basePath}/view-student-detail/${
                                      student?._id ?? student?.id ?? ""
                                    }`}
                                    state={{
                                      studentId: student?._id ?? student?.id,
                                      student: student,
                                    }}
                                    className="view-link"
                                  >
                                    <Eye size={14} className="mr-2" /> View
                                    Detail
                                  </Link>

                                  <Link
                                    to={`${basePath}/add-new-student`}
                                    state={{
                                      studentId: student?._id ?? student?.id,
                                      student: student,
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
                        <h1>School Classes</h1>
                        <p>Monitor classroom activities and performance</p>
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
                          No classes created yet.
                        </p>
                      ) : (
                        <div className="list-card">
                          {filteredClasses.map((item) => {
                            const teachers = Array.isArray(item?.teachers)
                              ? item.teachers
                              : [];
                            const students = Array.isArray(item?.students)
                              ? item.students
                              : [];
                            const classTeacher = teachers[0];
                            const gradeLabel = getClassGradeName(item);

                            return (
                              <article
                                key={item.id}
                                className="list-card-item class-item"
                              >
                                <div className="list-card-header">
                                  <div className="list-card-title">
                                    <div className="list-card-icon">
                                      <UniversityIcon />
                                    </div>
                                    <div>
                                      <span className="list-card-label">
                                        Class: {gradeLabel}
                                      </span>

                                      <span className="list-card-subtitle">
                                        <UserCog size={15} />
                                        Class Teacher:{" "}
                                        <b>
                                          {classTeacher
                                            ? classTeacher.user?.name ??
                                              classTeacher.user?.email ??
                                              "Unnamed Teacher"
                                            : "Not assigned"}
                                        </b>
                                      </span>
                                      <span className="list-card-subtitle">
                                        <Calendar size={15} />
                                        {`Joined ${
                                          item?.created_at
                                            ? format(
                                                new Date(item?.created_at),
                                                "MMM dd, yyyy"
                                              )
                                            : ""
                                        }`}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="list-card-chip-wrap">
                                    <span className="list-card-chip ">
                                      <UserCog size={15} className="mr-2" />
                                      {classTeacher
                                        ? classTeacher.user?.name ??
                                          classTeacher.user?.email ??
                                          "Unnamed Teacher"
                                        : "Not assigned"}
                                    </span>
                                    <span className="list-card-chip">
                                      <GraduationCap
                                        size={15}
                                        className="mr-2"
                                      />
                                      {students.length} student
                                      {students.length === 1 ? "" : "s"}
                                    </span>
                                  </div>
                                  <div className="list-card-action">
                                    <Link
                                      to={`${basePath}/add-new-class/${
                                        item?._id ?? item?.id ?? ""
                                      }`}
                                      state={{
                                        studentId: item?._id ?? item?.id,
                                        class: item,
                                      }}
                                      className="edit-link"
                                    >
                                      <Edit size={14} className="mr-2" /> Edit
                                    </Link>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="analytics" className="ssb-tabs-content">
                    <div className="analytics-grid">
                      <section className="analytics-section">
                        <header className="analytics-section-header">
                          <div>
                            <h2>Teacher Overview</h2>
                            <p>
                              Teaching assignments with associated student load
                            </p>
                          </div>
                        </header>
                        {summary.teacherStats.length === 0 ? (
                          <p className="empty-state mt-3 text-gray-600">
                            No teacher data available yet.
                          </p>
                        ) : (
                          <div className="table-wrapper">
                            <table className="analytics-table">
                              <thead>
                                <tr>
                                  <th>Teacher</th>
                                  <th>Classes</th>
                                  <th>Students</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summary.teacherStats.map((item) => (
                                  <tr key={item.key}>
                                    <td>
                                      <div className="table-cell-title">
                                        <span className="name">
                                          {item?.teacher?.user?.name ??
                                            item?.teacher?.user?.email ??
                                            "Unnamed Teacher"}
                                        </span>
                                      </div>
                                    </td>
                                    <td>{item?.classCount}</td>
                                    <td>{item?.studentCount}</td>
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
                            <h2>Class Overview</h2>
                            <p>Snapshot of current classroom composition</p>
                          </div>
                        </header>
                        {classes.length === 0 ? (
                          <p className="empty-state mt-3 text-gray-600">
                            No classes created yet.
                          </p>
                        ) : (
                          <div className="list-card analytics-classes">
                            {classes.map((item) => {
                              const teachers = Array.isArray(item?.teachers)
                                ? item.teachers
                                : [];
                              const students = Array.isArray(item?.students)
                                ? item.students
                                : [];
                              const classTeacher = teachers[0];
                              const gradeLabel = getClassGradeName(item);

                              return (
                                <article
                                  key={`analytics-${item.id}`}
                                  className="list-card-item class-item"
                                >
                                  <div className="list-card-header">
                                    <div className="list-card-title">
                                      <div className="list-card-icon bg-blue-200 border border-blue-300 text-blue-800">
                                        <UniversityIcon />
                                      </div>
                                      <div>
                                        <span className="list-card-label">
                                          {gradeLabel}
                                        </span>

                                        <span className="list-card-subtitle">
                                          <UserCog size={15} />
                                          Class Teacher:{" "}
                                          <b>
                                            {classTeacher
                                              ? classTeacher.user?.name ??
                                                classTeacher.user?.email ??
                                                "Unnamed Teacher"
                                              : "Not assigned"}
                                          </b>
                                        </span>
                                        <span className="list-card-subtitle">
                                          <Calendar size={15} />
                                          {`Joined ${
                                            item?.created_at
                                              ? format(
                                                  new Date(item?.created_at),
                                                  "MMM dd, yyyy"
                                                )
                                              : ""
                                          }`}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="list-card-chip-wrap">
                                      <span className="list-card-chip bg-blue-200 border border-blue-300 text-blue-800">
                                        <UserCog size={15} className="mr-2" />
                                        {classTeacher
                                          ? classTeacher.user?.name ??
                                            classTeacher.user?.email ??
                                            "Unnamed Teacher"
                                          : "Not assigned"}
                                      </span>
                                      <span className="list-card-chip bg-green-200 border border-green-300 text-green-800">
                                        <GraduationCap
                                          size={15}
                                          className="mr-2"
                                        />
                                        {students.length} student
                                        {students.length === 1 ? "" : "s"}
                                      </span>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        )}

        {!fetching && !error && !school && (
          <p className="text-gray-500">No school data available.</p>
        )}
      </div>
    </>
  );
};

export default SchoolDetail;
