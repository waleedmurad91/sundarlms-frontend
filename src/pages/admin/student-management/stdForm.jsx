import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Book,
  Calendar,
  Eye,
  EyeClosed,
  FileImage,
  IdCard,
  List,
  Loader2,
  Lock,
  Mail,
  Map,
  MapPin,
  MapPinCheck,
  Mars,
  Phone,
  Plus,
  Save,
  School,
  Text,
  TextAlignCenter,
  User,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getAllSchools } from "@/api/schoolApi";
import {
  addStudent,
  getStudentById,
  approvedStudent,
  updateStudentById,
} from "@/api/studentApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import DistrictCitySelector from "@/components/DistrictCitySelector";
import { useAuthStore } from "@/store/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_REGEX = /^[A-Za-z\s]+$/;

const DEFAULT_FORM = {
  schoolId: "",
  classId: "",
  name: "",
  email: "",
  password: "",
  dob: "",
  phone: "",
  address: "",
  gender: "",
  father_name: "",
  father_phone: "",
  father_cnic: "",
  district: "",
  city: "",
  formb_id: "",
  status: "pending",
  admin_notes: "",
  profile_image: "",
};

const normaliseStudent = (payload) => {
  if (!payload) {
    return { ...DEFAULT_FORM };
  }

  const data = payload?.data ?? payload;
  const classData =
    data?.class ??
    data?.school_class ??
    data?.schoolClass ??
    data?.class_data ??
    data?.classData ??
    {};
  const classRef =
    data?.school_class_id ??
    data?.class_id ??
    data?.classId ??
    data?.class?.id ??
    data?.class?._id ??
    data?.class ??
    classData?.id ??
    classData?._id ??
    classData?.value ??
    classData;

  const user = data?.user ?? {};

  let schoolRef =
    data?.school_id ??
    data?.schoolId ??
    data?.school?.id ??
    data?.school?._id ??
    data?.school?.value ??
    data?.school;
  if (!schoolRef) {
    schoolRef =
      classData?.school_id ??
      classData?.schoolId ??
      classData?.school?.id ??
      classData?.school?._id ??
      classData?.school?.value ??
      classData?.school;
  }

  const genderText = (() => {
    if (typeof user?.gender === "string") return user.gender.toLowerCase();
    if (typeof data?.gender === "string") return data.gender.toLowerCase();
    return "";
  })();
  let resolvedGender = "";
  if (genderText === "male") {
    resolvedGender = "male";
  } else if (genderText === "female") {
    resolvedGender = "female";
  }

  return {
    schoolId: schoolRef ? String(schoolRef) : "",
    classId: classRef ? String(classRef) : "",
    name: user?.name ?? data?.name ?? "",
    email: user?.email ?? data?.email ?? "",
    password: "",
    dob: data?.dob ? data.dob.split("T")[0] : "",
    phone: data?.phone ?? user?.phone ?? "",
    address: data?.address ?? "",
    gender: resolvedGender,
    father_name: data?.father_name ?? "",
    father_phone: data?.father_phone ?? "",
    father_cnic: data?.father_cnic ?? "",
    district: data?.district ?? "",
    city: data?.city ?? "",
    formb_id: data?.formb_id ?? "",
    status: data?.status ?? "pending",
    admin_notes: data?.admin_notes ?? "",
    profile_image:
      data?.profile_image_path ??
      data?.profile_image ??
      data?.profileImage ??
      data?.display_picture ??
      data?.display_picture_url ??
      user?.profile_image ??
      "",
  };
};

const resolveSchools = (payload) => (Array.isArray(payload) ? payload : []);

const getSchoolIdentifier = (school) => {
  return (
    school?.id ??
    school?._id ??
    school?.value ??
    school?.school_id ??
    school?.schoolId ??
    null
  );
};

const getClassId = (cls) => {
  return (
    cls?.id ?? cls?._id ?? cls?.class_id ?? cls?.classId ?? cls?.value ?? null
  );
};

const normalizeLabelPart = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";

  const lowered = text.toLowerCase();
  if (
    lowered === "null" ||
    lowered === "undefined" ||
    lowered === "n/a" ||
    lowered === "na" ||
    lowered === "-" ||
    lowered === "--"
  ) {
    return "";
  }

  return text;
};

const pickFirstMeaningfulLabel = (...values) => {
  for (const value of values) {
    const normalized = normalizeLabelPart(value);
    if (normalized) {
      return normalized;
    }
  }
  return "";
};

const getClassLabel = (cls) => {
  const className = pickFirstMeaningfulLabel(
    cls?.name,
    cls?.class_name,
    cls?.className,
  );
  const gradeName = pickFirstMeaningfulLabel(
    cls?.grade?.name,
    cls?.grade_name,
    typeof cls?.grade === "string" ? cls.grade : "",
    cls?.grade_id,
  );
  const section = normalizeLabelPart(
    cls?.section ?? cls?.class_section ?? cls?.section_name,
  );
  const fallbackLabel = pickFirstMeaningfulLabel(cls?.label, cls?.title);
  const label = className || gradeName || fallbackLabel || "Untitled Class";

  if (section && label.endsWith(` - ${section}`)) {
    return label.slice(0, -(` - ${section}`).length) || "Untitled Class";
  }

  return label;
};

const StudentForm = () => {
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
  const studentId =
    paramsId ||
    state?.studentId ||
    fallbackStateTeacher?.id ||
    fallbackStateTeacher?._id;
  const isEditMode = Boolean(studentId);

  const [formField, setFormField] = React.useState(() => {
    const base = normaliseStudent(fallbackStateTeacher);
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
  const [displayPicturePreview, setDisplayPicturePreview] = React.useState("");
  const [passwordType, setPasswordType] = React.useState("password");
  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password",
    );
  };

  React.useEffect(() => {
    let objectUrl;
    if (!formField.profile_image) {
      setDisplayPicturePreview("");
    } else if (formField.profile_image instanceof File) {
      objectUrl = URL.createObjectURL(formField.profile_image);
      setDisplayPicturePreview(objectUrl);
    } else {
      setDisplayPicturePreview(
        typeof formField.profile_image === "string"
          ? `${import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? ""}${formField.profile_image}`
          : "",
      );
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [formField.profile_image]);

  const schoolOptions = React.useMemo(() => {
    if (isSchoolRole && lockedSchoolId) {
      return [
        {
          value: String(lockedSchoolId),
          label: user?.school?.name ?? user?.name ?? "Current School",
        },
      ];
    }

    return schools
      .map((school) => {
        const id =
          school?._id ??
          school?.id ??
          school?.value ??
          school?.school_id ??
          school?.schoolId;
        if (!id) {
          return null;
        }
        const label =
          school?.name ??
          school?.label ??
          school?.school_name ??
          school?.title ??
          "Untitled School";
        return { value: String(id), label: String(label) };
      })
      .filter(Boolean);
  }, [schools, isSchoolRole, lockedSchoolId, user?.school?.name, user?.name]);

  React.useEffect(() => {
    const fetchSchools = async () => {
      setSchoolsLoading(true);
      try {
        const response = await getAllSchools();
        const resolved = resolveSchools(response);
        if (isSchoolRole && lockedSchoolId) {
          const scoped = resolved.filter(
            (school) =>
              String(getSchoolIdentifier(school)) === String(lockedSchoolId),
          );
          if (scoped.length > 0) {
            setSchools(scoped);
            return;
          }
          if (user?.school) {
            setSchools([user.school]);
            return;
          }
          setSchools([
            {
              id: lockedSchoolId,
              name: user?.name ?? "Current School",
              classes: user?.school?.classes ?? [],
            },
          ]);
          return;
        }
        setSchools(resolved);
      } catch (err) {
        const message =
          err?.message || "Unable to load schools. Please try again.";
        toast.error(message);
      } finally {
        setSchoolsLoading(false);
      }
    };

    fetchSchools();
  }, [
    isSchoolRole,
    lockedSchoolId,
    user?.school,
    user?.name,
    user?.school?.classes,
  ]);

  React.useEffect(() => {
    if (!isSchoolRole) return;
    const desiredId = lockedSchoolId;
    if (!desiredId) return;
    if (formField.schoolId !== String(desiredId)) {
      setFormField((prev) => ({
        ...prev,
        schoolId: String(desiredId),
        classId: "",
      }));
    }
  }, [isSchoolRole, lockedSchoolId, formField.schoolId]);

  // If school user lacks a school_id in auth, try matching school by user.id
  React.useEffect(() => {
    if (!isSchoolRole || lockedSchoolId || formField.schoolId) return;
    if (!user?.id || !Array.isArray(schools) || !schools.length) return;
    const matchByUser = schools.find(
      (s) =>
        String(s?.user_id ?? s?.userId ?? s?.user?._id ?? s?.user?.id) ===
        String(user.id),
    );
    if (matchByUser) {
      setFormField((prev) => ({
        ...prev,
        schoolId: String(getSchoolIdentifier(matchByUser)),
        classId: "",
      }));
    }
  }, [isSchoolRole, lockedSchoolId, formField.schoolId, schools, user?.id]);

  React.useEffect(() => {
    if (!isEditMode || fallbackStateTeacher) {
      return;
    }

    const fetchStudent = async () => {
      try {
        setFetching(true);
        const result = await getStudentById(studentId);
        const next = normaliseStudent(result);
        setFormField((prev) => ({
          ...prev,
          ...next,
          ...(isSchoolRole && lockedSchoolId
            ? { schoolId: String(lockedSchoolId) }
            : {}),
        }));
        const preview =
          next.profile_image && typeof next.profile_image === "string"
            ? `${import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? ""}${
                next.profile_image
              }`
            : "";
        setDisplayPicturePreview(preview);
      } catch (err) {
        const message =
          err?.message || "Unable to load student details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchStudent();
  }, [fallbackStateTeacher, isEditMode, studentId]);

  const handleSchoolChange = (nextValue) => {
    const resolvedValue = nextValue || "";
    setFormField((prev) => {
      const shouldResetClass = resolvedValue !== prev.schoolId;
      return {
        ...prev,
        schoolId: resolvedValue,
        classId: shouldResetClass ? "" : prev.classId,
      };
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => {
      if (name === "schoolId") {
        return { ...prev, schoolId: value, classId: "" };
      }
      if (name === "name") {
        const cleanedValue = value.replace(/[^A-Za-z\s]/g, "");
        return { ...prev, name: cleanedValue };
      }
      if (name === "father_name") {
        const cleanedValue = value.replace(/[^A-Za-z\s]/g, "");
        return { ...prev, father_name: cleanedValue };
      }
      if (name === "phone") {
        const numericValue = value.replace(/\D/g, "").slice(0, 12);
        return { ...prev, phone: numericValue };
      }
      if (name === "father_phone") {
        const numericValue = value.replace(/\D/g, "").slice(0, 12);
        return { ...prev, father_phone: numericValue };
      }
      if (name === "father_cnic") {
        const numericValue = value.replace(/\D/g, "").slice(0, 13);
        return { ...prev, father_cnic: numericValue };
      }
      if (name === "formb_id") {
        const numericValue = value.replace(/\D/g, "").slice(0, 13);
        return { ...prev, formb_id: numericValue };
      }
      if (name === "dob") {
        const next = value || "";
        const min = "2014-01-01";
        const max = "2019-01-01";
        let resolved = next;
        if (min && next < min) resolved = min;
        if (max && next > max) resolved = max;
        return { ...prev, dob: resolved };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleGenderChange = (value) => {
    setFormField((prev) => ({ ...prev, gender: value }));
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    setFormField((prev) => ({ ...prev, profile_image: file }));
  };

  const selectedSchool = React.useMemo(() => {
    const targetId = formField.schoolId || (isSchoolRole ? lockedSchoolId : "");
    if (targetId) {
      const matched = schools.find(
        (school) => String(getSchoolIdentifier(school)) === String(targetId),
      );
      if (matched) return matched;
    }

    const byFormField = schools.find(
      (school) =>
        String(getSchoolIdentifier(school)) === String(formField.schoolId),
    );
    if (byFormField) return byFormField;

    if (isSchoolRole) {
      const matchByUser = schools.find(
        (s) =>
          String(s?.user_id ?? s?.userId ?? s?.user?._id ?? s?.user?.id) ===
          String(user?.id),
      );
      if (matchByUser) return matchByUser;
      if (user?.school) return user.school;
    }

    return null;
  }, [
    schools,
    formField.schoolId,
    isSchoolRole,
    lockedSchoolId,
    user?.school,
    user?.id,
  ]);

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
          if (
            value === null ||
            value === undefined ||
            value === "" ||
            value === false
          ) {
            return null;
          }
          return {
            value: String(value),
            label: getClassLabel(cls),
          };
        })
        .filter(Boolean) ?? []
    );
  }, [selectedSchool, isSchoolRole, user?.school?.classes]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formField.schoolId && !lockedSchoolId) {
      const message = "Please select a school.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.classId) {
      const message = "Please select a class.";
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

    if (!formField.email.trim()) {
      const message = "Email is required.";
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

    if (!formField.gender) {
      const message = "Please select a gender.";
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

    if (!formField.dob.trim()) {
      const message = "Date of birth is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.father_name.trim()) {
      const message = "Father name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.father_phone.trim()) {
      const message = "Father phone is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.father_cnic.trim()) {
      const message = "Father CNIC is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.district.trim()) {
      const message = "District is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.city.trim()) {
      const message = "City is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.formb_id.trim()) {
      const message = "Form-B ID is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.address.trim()) {
      const message = "Address is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (formField.father_cnic.length !== 13) {
      const message = "Father CNIC must be exactly 13 digits.";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    if (formField.formb_id.length !== 13) {
      const message = "Form-B ID must be exactly 13 digits.";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    if (formField.phone.trim().length < 10) {
      const message = "Phone number must be at least 10 digits.";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    if (formField.father_phone.trim().length < 10) {
      const message = "Father phone number must be at least 10 digits.";
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    if (!isEditMode && !formField.password.trim()) {
      const message = "Password is required when creating a student.";
      setError(message);
      toast.error(message);
      return;
    }

    const payload = new FormData();
    payload.append(
      "school_id",
      formField.schoolId || (lockedSchoolId ? String(lockedSchoolId) : ""),
    );
    payload.append("school_class_id", formField.classId);
    payload.append("name", formField.name.trim());
    payload.append("email", formField.email.trim());
    payload.append("dob", formField.dob);
    payload.append("phone", formField.phone.trim());
    payload.append("address", formField.address.trim());
    payload.append("gender", formField.gender);
    payload.append("father_name", formField.father_name.trim());
    payload.append("father_phone", formField.father_phone.trim());
    payload.append("father_cnic", formField.father_cnic.trim());
    payload.append("district", formField.district.trim());
    payload.append("city", formField.city.trim());
    payload.append("formb_id", formField.formb_id.trim());
    payload.append("status", formField.status || "pending");
    payload.append("admin_notes", formField.admin_notes?.trim() || "");
    if (formField.profile_image instanceof File) {
      payload.append("profile_image", formField.profile_image);
    }

    if (!isEditMode || formField.password.trim()) {
      payload.append("password", formField.password.trim());
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateStudentById(studentId, payload);
        if ((formField.status || "").toLowerCase() === "approved") {
          const notes = formField.admin_notes?.trim();
          await approvedStudent(studentId, notes ? { admin_notes: notes } : {});
          toast.success("Student approved successfully.");
        } else {
          toast.success("Student updated successfully.");
        }
      } else {
        const created = await addStudent(payload);
        const createdId = created?.data?.id ?? created?.id ?? studentId;
        if (
          createdId &&
          (formField.status || "").toLowerCase() === "approved"
        ) {
          const notes = formField.admin_notes?.trim();
          await approvedStudent(createdId, notes ? { admin_notes: notes } : {});
          toast.success("Student approved successfully.");
        } else {
          toast.success("Student added successfully.");
        }
      }
      navigate(`${basePath}/student-lists`);
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} student. Please try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{isEditMode ? "Update Student" : "Add New Student"}</h1>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert
              variant="destructive"
              className="alert-custom mb-4 bg-[#FDF7EC]"
            >
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
                <div className="form-group w-half">
                  <label>
                    <School size={16} /> School<span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={schoolOptions}
                    multiple={false}
                    value={formField.schoolId}
                    onChange={handleSchoolChange}
                    placeholder="Search schools..."
                    loading={schoolsLoading}
                    disabled={isSchoolRole || loading || schoolsLoading}
                    emptyState="No schools found"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Book size={16} /> Class<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="classId"
                    value={formField.classId}
                    onChange={handleChange}
                    disabled={loading || schoolsLoading || !selectedSchool}
                  >
                    <option value="" disabled>
                      {schoolsLoading
                        ? "Loading schools..."
                        : selectedSchool
                          ? classOptions.length
                            ? "-- select class --"
                            : "No classes available"
                          : "Select a school first"}
                    </option>
                    {classOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

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
                    disabled={loading}
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
                    placeholder="student@example.com"
                    value={formField.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Calendar size={16} /> Date of Birth<span>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    name="dob"
                    value={formField.dob}
                    onChange={handleChange}
                    min="2014-01-01"
                    max="2019-01-01"
                    disabled={loading}
                  />
                  <div className="reg-hint mt-1 text-[12px] text-gray-400">
                    Allowed: 2014-01-01 to 2019-01-01
                  </div>
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
                    disabled={loading}
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
                    <User size={16} /> Father Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="father_name"
                    value={formField.father_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Father Phone<span>*</span>
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="father_phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    placeholder="E.g: 923001234567"
                    value={formField.father_phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <IdCard size={16} /> Father CNIC<span>*</span>
                  </label>
                  <input
                    id="father_cnic"
                    name="father_cnic"
                    type="text"
                    className="form-input"
                    value={formField.father_cnic}
                    onChange={handleChange}
                    placeholder="13 digits (no dashes)"
                    maxLength="13"
                    inputMode="numeric"
                    pattern="^\d{13}$"
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-full">
                  <DistrictCitySelector
                    district={formField.district}
                    city={formField.city}
                    onDistrictChange={(value) =>
                      setFormField((prev) => ({
                        ...prev,
                        district: value,
                        city: "",
                      }))
                    }
                    onCityChange={(value) =>
                      setFormField((prev) => ({ ...prev, city: value }))
                    }
                    disabled={loading}
                    icon={<Map size={16} />}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Phone<span>*</span>
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    placeholder="+92 300 1234567"
                    value={formField.phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <MapPinCheck size={16} />
                    Address<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="address"
                    placeholder="Enter complete address"
                    value={formField.address}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <IdCard size={16} />
                    Student Form‑B / Smart Card ID
                    <span>*</span>
                  </label>
                  <input
                    id="formb_id"
                    name="formb_id"
                    type="text"
                    className="form-input"
                    value={formField.formb_id}
                    onChange={handleChange}
                    placeholder="13 digits (no dashes)"
                    maxLength="13"
                    inputMode="numeric"
                    pattern="^\d{13}$"
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <FileImage size={16} /> Profile Image
                  </label>
                  <input
                    type="file"
                    className="form-input"
                    name="profile_image"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    disabled={loading}
                  />
                  {displayPicturePreview ? (
                    <div className="show-img mt-2">
                      <img
                        src={displayPicturePreview}
                        alt="Profile preview"
                        className="h-20 w-20 rounded-md object-cover"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="form-group w-half">
                  <label>
                    <Mars size={16} />
                    Gender <span>*</span>
                  </label>
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
                {isEditMode ? (
                  <>
                    <div className="form-group w-half">
                      <label>
                        <TextAlignCenter size={16} /> Status
                      </label>
                      <RadioGroup
                        value={formField.status}
                        onValueChange={(val) =>
                          setFormField((prev) => ({ ...prev, status: val }))
                        }
                        className="flex gap-4 mt-3 mb-3"
                      >
                        <div className="flex items-center space-x-2 radio-wrap">
                          <RadioGroupItem
                            value="pending"
                            id="student-status-pending"
                            className="radio-input-custom"
                          />
                          <Label
                            htmlFor="student-status-pending"
                            className="radio-label-custom"
                          >
                            Pending
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 radio-wrap">
                          <RadioGroupItem
                            value="approved"
                            id="student-status-approved"
                            className="radio-input-custom"
                          />
                          <Label
                            htmlFor="student-status-approved"
                            className="radio-label-custom"
                          >
                            Approve
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 radio-wrap">
                          <RadioGroupItem
                            value="disapproved"
                            id="student-status-disapproved"
                            className="radio-input-custom"
                          />
                          <Label
                            htmlFor="student-status-disapproved"
                            className="radio-label-custom"
                          >
                            Disapprove
                          </Label>
                        </div>
                      </RadioGroup>
                      <p className="text-xs text-gray-500">
                        Approving will create the student account immediately.
                      </p>
                    </div>

                    <div className="form-group w-full">
                      <label>
                        <Text size={16} />
                        Admin Notes
                      </label>
                      <textarea
                        className="form-input"
                        name="admin_notes"
                        value={formField.admin_notes}
                        onChange={handleChange}
                        placeholder="Optional notes for approval or disapproval"
                        rows={3}
                        disabled={loading}
                      />
                    </div>
                  </>
                ) : (
                  <></>
                )}
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
                      Update Student
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Student
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

export default StudentForm;
