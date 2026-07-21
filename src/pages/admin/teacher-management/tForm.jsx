import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Book,
  BookA,
  Eye,
  EyeClosed,
  Loader2,
  Lock,
  Mail,
  Mars,
  Phone,
  Plus,
  Save,
  School,
  User,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  addTeacher,
  getTeacherById,
  updateTeacherById,
} from "@/api/teacherApi";
import { getAllSchools } from "@/api/schoolApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { useAuthStore } from "@/store/auth";

const DEFAULT_FORM = {
  schoolId: "",
  classId: "",
  subjectId: "",
  name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  gender: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_REGEX = /^[A-Za-z\s]+$/;

const normaliseTeacher = (payload) => {
  if (!payload) {
    return { ...DEFAULT_FORM };
  }

  const data = payload?.data ?? payload;
  const user = data?.user ?? {};

  const classRef =
    data?.school_class_id ??
    data?.class_id ??
    data?.classId ??
    data?.class?.id ??
    data?.class?._id ??
    data?.school_class?.id ??
    data?.school_class?._id ??
    null;

  const resolvedSchool =
    data?.school_id ??
    data?.schoolId ??
    data?.school?.id ??
    data?.school?._id ??
    data?.school_class?.school_id ??
    data?.class?.school_id ??
    data?.class?.schoolId ??
    null;

  const rawSubjectRef =
    data?.subject_id ??
    data?.subjectId ??
    data?.subject?.id ??
    data?.subject?._id ??
    data?.subject ??
    null;
  const subjectRef =
    rawSubjectRef !== null &&
    rawSubjectRef !== undefined &&
    rawSubjectRef !== ""
      ? rawSubjectRef
      : null;

  const genderValue = (user?.gender ?? data?.gender ?? "")
    .toString()
    .toLowerCase();
  const gender =
    genderValue === "male" ? "male" : genderValue === "female" ? "female" : "";

  return {
    schoolId:
      resolvedSchool !== null && resolvedSchool !== undefined
        ? String(resolvedSchool)
        : "",
    classId:
      classRef !== null && classRef !== undefined ? String(classRef) : "",
    subjectId:
      subjectRef !== null && subjectRef !== undefined ? String(subjectRef) : "",
    name: user?.name ?? data?.name ?? "",
    email: user?.email ?? data?.email ?? "",
    password: "",
    phone: data?.phone ?? user?.phone ?? "",
    address: data?.address ?? "",
    gender,
  };
};

// Utility functions
const getClassId = (cls) => {
  const value =
    cls?.id ?? cls?._id ?? cls?.value ?? cls?.class_id ?? cls?.classId;
  return value !== null && value !== undefined ? String(value) : "";
};

const getSchoolIdentifier = (school) => {
  const value =
    school?.id ??
    school?._id ??
    school?.value ??
    school?.school_id ??
    school?.schoolId;
  return value !== null && value !== undefined ? String(value) : "";
};

const getClassLabel = (cls) => {
  const grade =
    cls?.grade?.name ??
    cls?.grade_name ??
    (cls?.grade_id ? `Grade ${cls.grade_id}` : "");
  const section = cls?.section ?? "";
  return [grade, section].filter(Boolean).join(" - ") || "Untitled Class";
};

const getSubjectLabel = (subject) =>
  subject?.subject ?? subject?.name ?? "Untitled Subject";

const getGradeId = (grade) =>
  grade?.id ?? grade?._id ?? grade?.grade_id ?? grade?.pivot?.grade_id ?? null;

const getGradeIdFromClass = (cls) =>
  cls?.grade_id ??
  cls?.gradeId ??
  cls?.grade?.id ??
  cls?.grade?._id ??
  cls?.grade?.grade_id ??
  cls?.pivot?.grade_id ??
  null;

const getSubjectId = (subject) => {
  const value =
    subject?.id ??
    subject?._id ??
    subject?.subject_id ??
    subject?.subjectId ??
    subject?.value;
  return value !== null && value !== undefined ? String(value) : "";
};

const resolveSchools = (res) => (Array.isArray(res) ? res : []);

const TeacherForm = () => {
  const { role: storeRole, user } = useAuthStore();
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const lockedSchoolId =
    user?.school_id ??
    user?.schoolId ??
    user?.school?._id ??
    user?.school?.id ??
    null;
  const resolvedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const isSchoolRole = resolvedRole === "school";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";
  const { state } = useLocation();

  const fallbackStateTeacher = state?.teacher;
  const teacherId =
    paramsId ||
    state?.teacherId ||
    fallbackStateTeacher?.id ||
    fallbackStateTeacher?._id;
  const isEditMode = Boolean(teacherId);

  const [formField, setFormField] = React.useState(() => {
    const base = normaliseTeacher(fallbackStateTeacher);
    if (isSchoolRole && lockedSchoolId) {
      return { ...base, schoolId: String(lockedSchoolId) };
    }
    return base;
  });
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [schools, setSchools] = React.useState([]);
  const [schoolsLoading, setSchoolsLoading] = React.useState(false);
  const [passwordType, setPasswordType] = React.useState("password");
  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password"
    );
  };

  // Fetch Schools once
  React.useEffect(() => {
    const fetchSchools = async () => {
      setSchoolsLoading(true);
      try {
        const response = await getAllSchools();
        const resolved = resolveSchools(response);

        if (isSchoolRole && lockedSchoolId) {
          const matched =
            resolved.find(
              (item) =>
                String(getSchoolIdentifier(item)) === String(lockedSchoolId)
            ) ?? null;
          if (matched) {
            setSchools([matched]);
            return;
          }
          const fallback = {
            id: lockedSchoolId,
            name: user?.school?.name ?? user?.name ?? "Current School",
            classes: user?.school?.classes ?? [],
          };
          setSchools([fallback]);
          return;
        }

        setSchools(resolved);
      } catch (err) {
        toast.error("Unable to load schools. Please try again.");
      } finally {
        setSchoolsLoading(false);
      }
    };
    fetchSchools();
  }, [isSchoolRole, lockedSchoolId, user?.name, user?.school?.name, user?.school?.classes]);

  React.useEffect(() => {
    if (!isSchoolRole) return;
    const desiredId = lockedSchoolId;
    if (!desiredId) return;
    if (formField.schoolId !== String(desiredId)) {
      setFormField((prev) => ({ ...prev, schoolId: String(desiredId) }));
    }
  }, [isSchoolRole, lockedSchoolId, formField.schoolId]);

  // If we are a school user but the auth payload lacks a school_id, try matching by user.id against school.user_id
  React.useEffect(() => {
    if (!isSchoolRole || lockedSchoolId || formField.schoolId) return;
    if (!user?.id || !Array.isArray(schools) || !schools.length) return;
    const matchByUser = schools.find(
      (s) => String(s?.user_id ?? s?.userId ?? s?.user?._id ?? s?.user?.id) === String(user.id)
    );
    if (matchByUser) {
      setFormField((prev) => ({
        ...prev,
        schoolId: String(getSchoolIdentifier(matchByUser)),
      }));
    }
  }, [isSchoolRole, lockedSchoolId, formField.schoolId, schools, user?.id]);

  React.useEffect(() => {
    if (!isEditMode || !teacherId) {
      return;
    }

    const fetchTeacher = async () => {
      setFetching(true);
      try {
        const response = await getTeacherById(teacherId);
        const next = normaliseTeacher(response);
        setFormField((prev) => ({
          ...prev,
          ...next,
          ...(isSchoolRole && lockedSchoolId
            ? { schoolId: String(lockedSchoolId) }
            : {}),
        }));
      } catch (err) {
        const message =
          err?.message || "Unable to load teacher details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchTeacher();
  }, [isEditMode, teacherId]);

  // Selected School
  const selectedSchool = React.useMemo(() => {
    const targetId = formField.schoolId || (isSchoolRole ? lockedSchoolId : "");
    if (targetId) {
      const matched = schools.find(
        (s) => String(getSchoolIdentifier(s)) === String(targetId)
      );
      if (matched) return matched;
    }

    const byFormField = schools.find(
      (s) => String(getSchoolIdentifier(s)) === String(formField.schoolId)
    );
    if (byFormField) return byFormField;

    if (isSchoolRole) {
      const matchByUser = schools.find(
        (s) =>
          String(s?.user_id ?? s?.userId ?? s?.user?._id ?? s?.user?.id) ===
          String(user?.id)
      );
      if (matchByUser) return matchByUser;
      if (user?.school) return user.school;
    }
    return null;
  }, [isSchoolRole, lockedSchoolId, schools, formField.schoolId, user?.school, user?.id]);

  const schoolDisplayName =
    selectedSchool?.name ??
    user?.school?.name ??
    (isSchoolRole ? user?.name : "") ??
    (isSchoolRole ? "Current School" : "");

  // Selected Class
  const selectedClass = React.useMemo(() => {
    if (!selectedSchool || !formField.classId) return null;
    return (
      selectedSchool.classes?.find(
        (cls) => String(getClassId(cls)) === String(formField.classId)
      ) ?? null
    );
  }, [selectedSchool, formField.classId]);

  // Grades map (for subjects)
  const gradeMap = React.useMemo(() => {
    const map = new Map();

    selectedSchool?.grades?.forEach((grade) => {
      const id = getGradeId(grade);
      if (id !== null && id !== undefined && id !== "") {
        map.set(String(id), grade);
      }
    });

    // Some APIs only expose grade details under each class, so mirror them here.
    selectedSchool?.classes?.forEach((cls) => {
      const grade = cls?.grade;
      if (!grade) return;
      const directId = getGradeId(grade);
      const fallbackId = getGradeIdFromClass(cls);
      const resolvedId =
        directId !== null && directId !== undefined && directId !== ""
          ? directId
          : fallbackId;

      if (
        resolvedId !== null &&
        resolvedId !== undefined &&
        resolvedId !== ""
      ) {
        map.set(String(resolvedId), grade);
      }
    });

    return map;
  }, [selectedSchool]);

  // Class Options
  const classOptions = React.useMemo(() => {
    const sourceClasses =
      (isSchoolRole && (selectedSchool?.classes || user?.school?.classes)) ||
      selectedSchool?.classes ||
      [];

    if (!sourceClasses.length) return [];

    return (
      sourceClasses
        ?.map((cls) => {
          const value = getClassId(cls);
          if (!value) return null;
          return { value, label: getClassLabel(cls) };
        })
        .filter(Boolean) ?? []
    );
  }, [isSchoolRole, selectedSchool, user?.school?.classes]);

  // Subject Options based on selected class
  const subjectOptions = React.useMemo(() => {
    if (!selectedClass) return [];
    const gradeRef = getGradeIdFromClass(selectedClass);
    const grade =
      gradeRef !== null && gradeRef !== undefined && gradeRef !== ""
        ? gradeMap.get(String(gradeRef)) ??
          (Array.isArray(selectedClass.grade?.subjects)
            ? selectedClass.grade
            : null)
        : selectedClass.grade;

    const subjects = Array.isArray(grade?.subjects)
      ? grade.subjects
      : Array.isArray(selectedClass.grade?.subjects)
      ? selectedClass.grade.subjects
      : [];

    return subjects
      .map((subj) => {
        const value = getSubjectId(subj);
        if (!value) {
          return null;
        }
        return {
          value,
          label: getSubjectLabel(subj),
        };
      })
      .filter(Boolean);
  }, [selectedClass, gradeMap]);

  const handleSchoolChange = (nextValue) => {
    const resolvedValue =
      nextValue !== null && nextValue !== undefined ? String(nextValue) : "";
    setFormField((prev) => ({
      ...prev,
      schoolId: resolvedValue,
      classId: "",
      subjectId: "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormField((prev) => {
      if (name === "classId") {
        return { ...prev, classId: value, subjectId: "" };
      }
      if (name === "name") {
        const cleanedValue = value.replace(/[^A-Za-z\s]/g, "");
        return { ...prev, name: cleanedValue };
      }
      if (name === "phone") {
        const numericValue = value.replace(/\D/g, "").slice(0, 12);
        return { ...prev, phone: numericValue };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleGenderChange = (value) =>
    setFormField((prev) => ({ ...prev, gender: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formField.schoolId || !formField.classId || !formField.subjectId) {
      toast.error("Please select school, class, and subject");
      return;
    }

    if (!formField.name.trim()) {
      const message = "Please provide full name.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!NAME_REGEX.test(formField.name.trim())) {
      const message = "Full name cannot include numbers or special characters.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!EMAIL_REGEX.test(formField.email.trim())) {
      const message = "Please provide a valid email address.";
      setError(message);
      toast.error(message);
      return;
    }

    if (formField.phone.trim().length > 12) {
      const message = "Phone number must be at most 12 digits.";
      setError(message);
      toast.error(message);
      return;
    }

    const resolvedSchoolId =
      formField.schoolId || (lockedSchoolId ? String(lockedSchoolId) : "");

    const payload = {
      school_id: resolvedSchoolId,
      school_class_id: formField.classId,
      subject: formField.subjectId,
      name: formField.name.trim(),
      email: formField.email.trim(),
      phone: formField.phone.trim(),
      address: formField.address.trim(),
      gender: formField.gender,
      ...(formField.password.trim() && { password: formField.password.trim() }),
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateTeacherById(teacherId, payload);
        toast.success("Teacher updated successfully.");
      } else {
        await addTeacher(payload);
        toast.success("Teacher added successfully.");
      }
      navigate(`${basePath}/teacher-lists`);
    } catch (err) {
      toast.error(err?.message || "Failed to save teacher. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const schoolOptions = React.useMemo(() => {
    if (isSchoolRole && lockedSchoolId) {
      return [
        {
          value: String(lockedSchoolId),
          label: user?.school?.name ?? "Current School",
        },
      ];
    }

    return (
      schools
        ?.map((school) => {
          const value = getSchoolIdentifier(school);
          if (!value) {
            return null;
          }
          const label = school?.name ?? school?.label ?? "Untitled School";
          return { value: String(value), label: String(label) };
        })
        .filter(Boolean) ?? []
    );
  }, [schools, isSchoolRole, lockedSchoolId, user?.school?.name]);

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{isEditMode ? "Update Teacher" : "Add New Teacher"}</h1>
        </div>
      </div>
      <div className="dashboard-body dashboard-body-card">
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive" className="mb-4 bg-[#FDF7EC]">
              <AlertCircleIcon size={18} />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          {fetching ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          ) : (
            <>
              <div className="form-admin">
                <div className="form-group w-full">
                  <label>
                    <School size={16} /> School<span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={schoolOptions}
                    multiple={false}
                    value={formField.schoolId}
                    onChange={handleSchoolChange}
                    placeholder="Search schools..."
                    disabled={isSchoolRole || schoolsLoading || loading}
                    loading={schoolsLoading}
                    emptyState="No schools found"
                  />
                </div>

                {/* Class */}
                <div className="form-group w-half">
                  <label>
                    <Book size={16} /> Class<span>*</span>
                  </label>
                  <select
                    name="classId"
                    className="form-input"
                    value={formField.classId}
                    onChange={handleChange}
                    disabled={!selectedSchool}
                  >
                    <option value="">Select Class</option>
                    {classOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="form-group w-half">
                  <label>
                    <BookA size={16} /> Subject<span>*</span>
                  </label>
                  <select
                    name="subjectId"
                    className="form-input"
                    value={formField.subjectId}
                    onChange={handleChange}
                    disabled={!formField.classId}
                  >
                    <option value="">Select Subject</option>
                    {subjectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Other fields */}
                <div className="form-group w-full">
                  <label>
                    <User size={16} /> Full Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    placeholder="Enter full name"
                    value={formField.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Mail size={16} /> Email<span>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    name="email"
                    placeholder="teacher@example.com"
                    value={formField.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Lock size={16} /> Password
                    {isEditMode ? " (optional)" : <span>*</span>}
                  </label>
                  <input
                    type={passwordType}
                    className="form-input"
                    name="password"
                    placeholder="Create a strong password"
                    value={formField.password}
                    onChange={handleChange}
                  />
                  <small className="text-gray-400">Minimum 6 characters</small>
                  <button
                    type="button"
                    className="text-slate-400 cursor-pointer password-eye !top-[43%]"
                    onClick={handleShowPasswordToggle}
                  >
                    {passwordType === "password" ? (
                      <EyeClosed size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Phone<span>*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    name="phone"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    placeholder="+92 300 1234567"
                    value={formField.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group w-half">
                  <label><Mars />Gender <span>*</span></label>
                  <RadioGroup
                    value={formField.gender}
                    onValueChange={handleGenderChange}
                    className="flex gap-4 mt-3 mb-5"
                  >
                    <div className="flex items-center space-x-2 radio-wrap">
                      <RadioGroupItem
                        value="male"
                        id="teacher-gender-male"
                        className="radio-input-custom"
                      />
                      <Label
                        htmlFor="teacher-gender-male"
                        className="radio-label-custom"
                      >
                        Male
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 radio-wrap">
                      <RadioGroupItem
                        value="female"
                        id="teacher-gender-female"
                        className="radio-input-custom"
                      />
                      <Label
                        htmlFor="teacher-gender-female"
                        className="radio-label-custom"
                      >
                        Female
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <div className="form-button-row">
                <button
                  type="button"
                  className="global-btn secondary flex items-center justify-center gap-1"
                  onClick={() => navigate(-1)}
                >
                  <>
                    <X size={18} />
                    Cancel
                  </>
                </button>
                <button
                  type="submit"
                  className="global-btn flex items-center justify-center gap-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      Please wait
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : isEditMode ? (
                    <>
                      Update Teacher
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Teacher
                      <Plus size={18} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
};

export default TeacherForm;
