import React from "react";
import { useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircleIcon,
  Book,
  Globe,
  GraduationCap,
  Layers,
  List,
  Loader2,
  Mail,
  UserCog,
} from "lucide-react";
import {
  getSpecificClassDetail,
  getSpecificSchoolsClassDetail,
} from "@/api/classApi";
import { useAuthStore } from "@/store/auth";
import DemographicCard from "@/components/DemographicCard";
import TabSearch from "@/components/TabSearch";

const toSearchText = (value) =>
  value === null || value === undefined
    ? ""
    : JSON.stringify(value, null, 0).toLowerCase();

const normalizeRole = (role) =>
  typeof role === "string" ? role.toLowerCase() : null;

const normalizeClassDetail = (payload) => {
  if (!payload) return null;
  const data = payload?.data ?? payload;
  if (!data || Array.isArray(data)) return null;

  const grade = data?.grade ?? data?.class ?? null;
  const teachers = Array.isArray(data?.teachers) ? data.teachers : [];
  const students = Array.isArray(data?.students) ? data.students : [];

  const teacherCount =
    Number(data?.teachers_count) ||
    Number(data?.teacher_count) ||
    Number(data?.teachersCount) ||
    teachers.length ||
    0;
  const studentCount =
    Number(data?.students_count) ||
    Number(data?.student_count) ||
    Number(data?.studentsCount) ||
    students.length ||
    0;

  return {
    grade,
    teachers,
    students,
    teacherCount,
    studentCount,
  };
};

const ClassDetail = () => {
  const { id: paramsId } = useParams();
  const { state } = useLocation();
  const { role, user } = useAuthStore();
  const [teacherSearch, setTeacherSearch] = React.useState("");
  const [studentSearch, setStudentSearch] = React.useState("");

  const resolvedRole = normalizeRole(role ?? user?.role ?? "admin");
  const isSchoolRole = resolvedRole === "school";
  const schoolId =
    user?.school_id ??
    user?.schoolId ??
    user?.school?._id ??
    user?.school?.id ??
    user?.id ??
    user?._id ??
    null;

  const classId =
    paramsId || state?.classId || state?.class?._id || state?.class?.id || null;

  const [detail, setDetail] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        if (!classId) {
          throw new Error(
            "Class identifier is missing. Please open this page from the class list."
          );
        }
        if (isSchoolRole && !schoolId) {
          throw new Error("School identifier is missing. Please re-login.");
        }

        const response = isSchoolRole
          ? await getSpecificSchoolsClassDetail(schoolId, classId)
          : await getSpecificClassDetail(classId);

        if (active) {
          setDetail(normalizeClassDetail(response));
        }
      } catch (err) {
        const message =
          err?.message || "Unable to load class details. Please try again.";
        if (active) setError(message);
        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      active = false;
    };
  }, [classId, isSchoolRole, schoolId]);

  const filteredTeachers = React.useMemo(() => {
    if (!detail) return [];
    const term = teacherSearch.trim().toLowerCase();
    if (!term) return detail.teachers || [];
    return (detail.teachers || []).filter((t) =>
      toSearchText(t).includes(term)
    );
  }, [detail, teacherSearch]);

  const filteredStudents = React.useMemo(() => {
    if (!detail) return [];
    const term = studentSearch.trim().toLowerCase();
    if (!term) return detail.students || [];
    return (detail.students || []).filter((s) =>
      toSearchText(s).includes(term)
    );
  }, [detail, studentSearch]);

  const gradeLabel =
    detail?.grade?.name ??
    detail?.grade?.title ??
    (detail?.grade?.id ? `Grade ${detail.grade.id}` : "Class Detail");

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{isSchoolRole ? "School Dashboard" : "Admin Dashboard"}</h4>
          <h1>Overview of this class</h1>
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

        {loading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        )}

        {!loading && !error && detail && (
          <>
            <div className="inner-detail-card dashboard-body-card-dtl">
              <div className="idc-left">
                <div className="flex gap-5">
                  <div className="school-icon">
                    <Layers size={35} />
                  </div>
                  <div className="school-detail">
                    <h1>{`Grade ${gradeLabel}` ?? "Unnamed Grade"}</h1>
                    <p>
                      <UserCog size={16} className="text-[#AD474B]" />
                      <span>Teachers: {detail.teacherCount}</span>
                    </p>
                    <p>
                      <GraduationCap size={16} className="text-[#AD474B]" />
                      <span>Students: {detail.studentCount}</span>
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
                count={detail.teacherCount}
                subheading="Active educators across all classes"
              />
              <DemographicCard
                icon={<GraduationCap size={24} />}
                title="Students"
                classname="demoGreen"
                count={detail.studentCount}
                subheading="Enrolled Students"
              />
            </section>

            <div className="school-stats">
              <div className="flex gap-5 items-center school-stats-header">
                <div className="icon-world">
                  <Globe />
                </div>
                <div className="school-stats-heading">
                  <h2>Class Management</h2>
                  <p>Comprehensive overview of institutional data</p>
                </div>
              </div>

              <div className="school-stats-body">
                <Tabs defaultValue="teachers">
                  <TabsList className="ssb-tabs">
                    <TabsTrigger value="teachers">
                      <UserCog /> <span className="tab-text">Teachers</span>{" "}
                      <span>({detail.teacherCount})</span>
                    </TabsTrigger>
                    <TabsTrigger value="students">
                      <GraduationCap />{" "}
                      <span className="tab-text">Students</span>{" "}
                      <span>({detail.studentCount})</span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="teachers" className="ssb-tabs-content">
                    <div className="ssb-tab-header">
                      <div className="ssb-tab-header-left">
                        <h1>Class Teachers</h1>
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
                      {detail.teachers.length === 0 ? (
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
                                      {teacher.name ?? "Unnamed Teacher"}
                                    </span>
                                    <span className="list-card-subtitle">
                                      <Mail size={15} />{" "}
                                      {teacher.email ?? "N/A"}
                                    </span>
                                  </div>
                                </div>
                                <div className="list-card-chip-wrap">
                                  <span className="list-card-chip">
                                    <Book size={15} className="mr-2" />
                                    Grade {teacher.class?.grade?.name || ""}
                                  </span>
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
                        <h1>Class Students</h1>
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
                      {detail.students.length === 0 ? (
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
                                      {student?.name ?? "Unnamed Student"}
                                    </span>
                                    <span className="list-card-subtitle">
                                      <Mail size={15} />{" "}
                                      {student?.email ?? "N/A"}
                                    </span>
                                  </div>
                                </div>

                                <div className="list-card-chip-wrap">
                                  <span className="list-card-chip chip-student">
                                    <Book size={15} className="mr-1" />
                                    Class: &nbsp;
                                    <b>{student?.class?.grade?.name || ""}</b>
                                  </span>
                                  <span className="list-card-chip chip-student">
                                    <List size={15} className="mr-1" />

                                    {student.roll_number ?? "N/A"}
                                  </span>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ClassDetail;
