import React from "react";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { useAuthStore } from "@/store/auth";
import {
  getTeachersOfStudent,
  linkStudentToTeacher,
  unlinkStudentFromTeacher,
} from "@/api/studentApi";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, Link2, Loader2, Unlink } from "lucide-react";

const resolveTeachers = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.teachers)) return response.teachers;
  if (Array.isArray(response?.data?.teachers)) return response.data.teachers;
  return [];
};

const getTeacherId = (teacher) =>
  teacher?.id ??
  teacher?.teacher_id ??
  teacher?.user_id ??
  teacher?.pivot?.teacher_id ??
  null;

export const StudentTeachers = () => {
  const { student } = useStudentPortal();
  const { user, updateUser } = useAuthStore();
  const [teachers, setTeachers] = React.useState([]);
  const [teacherCode, setTeacherCode] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [linking, setLinking] = React.useState(false);
  const [unlinkingTeacherId, setUnlinkingTeacherId] = React.useState(null);
  const [error, setError] = React.useState("");

  const studentId = student?.id ?? student?.student_id ?? user?.id ?? null;

  const fetchTeachers = React.useCallback(async () => {
    if (!studentId) {
      setTeachers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getTeachersOfStudent(studentId);
      setTeachers(resolveTeachers(response));
    } catch (err) {
      setTeachers([]);
      setError(err?.message || "Unable to load your teachers right now.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  React.useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleLinkTeacher = async (event) => {
    event.preventDefault();

    const normalizedCode = String(teacherCode ?? "").trim();
    if (!normalizedCode) return;

    setLinking(true);
    setError("");

    try {
      const response = await linkStudentToTeacher({
        teacher_code: normalizedCode,
      });
      if (!response?.status) {
        throw new Error(response?.message || "Failed to link teacher.");
      }

      if (response?.school) {
        updateUser({ ...user, school: response.school });
      }

      setTeacherCode("");
      await fetchTeachers();
    } catch (err) {
      setError(err?.message || "Unable to link teacher right now.");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkTeacher = async (teacher) => {
    const teacherId = getTeacherId(teacher);
    if (!teacherId) {
      setError("Unable to identify this teacher for removal.");
      return;
    }

    setUnlinkingTeacherId(teacherId);
    setError("");

    try {
      const response = await unlinkStudentFromTeacher({
        teacher_id: teacherId,
      });
      if (!response?.status) {
        throw new Error(response?.message || "Failed to unlink teacher.");
      }

      if (response?.school === null) {
        updateUser({ ...user, school: null });
      }

      await fetchTeachers();
    } catch (err) {
      setError(err?.message || "Unable to remove teacher right now.");
    } finally {
      setUnlinkingTeacherId(null);
    }
  };

  return (
    <div className="space-y-6 pl-7">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Teachers</h1>
      </header>

      {error ? (
        <Alert variant="destructive" className="alert-custom mb-4 bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}

      <div className="grid gap-[4rem] sm:grid-cols-1 lg:grid-cols-2">
        <div className="">
          <form onSubmit={handleLinkTeacher} className="space-y-4">
            <div className="form-group mb-0">
              <Label htmlFor="teacher_code" className="font-regular">
                <Link2 size={16} className="mr-2 inline" />
                Teacher Code *
              </Label>
              <input
                id="teacher_code"
                name="teacher_code"
                type="text"
                placeholder="Enter teacher code"
                value={teacherCode}
                onChange={(event) => setTeacherCode(event.target.value)}
                className="form-input"
                disabled={loading || linking}
                autoFocus
              />
              <p className="mt-1 text-xs text-slate-500">
                Contact your school administrator to get the teacher code.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || linking || !teacherCode.trim()}
              className="inline-flex items-center rounded-md bg-[#AB474B] px-2 py-2 mt-2 font-regular text-sm text-white hover:bg-[#c4474b] disabled:opacity-60"
            >
              {linking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Add a teacher
                </>
              )}
            </button>
          </form>
        </div>

        <div className="">
          <h2
            htmlFor="teacher_code"
            className="font-bold text-black text-[16px] mb-4"
          >
            Teachers
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading teachers...
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-[12px] text-slate-500">
              No teachers assigned yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {teachers.map((teacher, index) => {
                const teacherId = getTeacherId(teacher) ?? `teacher-${index}`;
                const teacherName =
                  teacher?.name ??
                  teacher?.teacher_name ??
                  teacher?.full_name ??
                  "Teacher";
                const teacherEmail =
                  teacher?.email ?? teacher?.teacher_email ?? "";
                const isUnlinking =
                  unlinkingTeacherId === getTeacherId(teacher);

                return (
                  <div
                    className="flex items-center justify-between gap-4 py-4"
                    key={teacherId}
                  >
                    <div className="min-w-0">
                      <h2 className="truncate text-[16px] font-bold text-slate-900">
                        {teacherName}
                      </h2>
                      {teacherEmail ? (
                        <p className="truncate text-sm text-slate-500">
                          {teacherEmail}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnlinkTeacher(teacher)}
                      disabled={isUnlinking}
                      className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {isUnlinking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Unlink className="mr-2 h-4 w-4" />
                          Remove
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentTeachers;
