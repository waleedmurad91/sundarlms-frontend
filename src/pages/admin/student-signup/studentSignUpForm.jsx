import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Calendar,
  Flag,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  Mail,
  Map,
  Phone,
  Save,
  User,
  X,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { addStudentRegistrationForm } from "@/api/registrationsApi";
import { getAdminStudentById, updateAdminStudentById } from "@/api/studentApi";
import { useAuthStore } from "@/store/auth";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import DistrictCitySelector from "@/components/DistrictCitySelector";

const PROGRAM_OPTIONS = [
  { value: "pmc-5", label: "PMC-5 (Grade 5)" },
  { value: "vss", label: "VSS (Grades 6 & 7)" },
];

const GRADE_OPTIONS = [
  { label: "Grade 5 (PMC-5)", value: "Grade 5 (PMC-5)", typefor: "pmc-5" },
  { label: "Grade 6 (VSS)", value: "Grade 6 (VSS)", typefor: "vss" },
  { label: "Grade 7 (VSS)", value: "Grade 7 (VSS)", typefor: "vss" },
];

const DATE_LIMITS = {
  GLOBAL_MAX: "2019-01-01",
  PMC_MIN: "2014-01-01",
  VSS_MIN: "2012-01-01",
};

const DEFAULT_FORM = {
  id: "",
  student_name: "",
  gender: "",
  dob: "",
  grade: "",
  formType: "pmc-5",
  student_phone: "",
  email: "",
  father_name: "",
  father_cnic: "",
  father_phone: "",
  school: "",
  district: "",
  city: "",
  address: "",
  formb_id: "",
  agree: false,
  photo: "",
};

const formatDateValue = (value) => {
  if (!value) return "";
  // Normalize to YYYY-MM-DD for <input type="date">
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const normalizeRegistration = (payload) => {
  if (!payload) return { ...DEFAULT_FORM };

  const data = payload?.data ?? payload ?? {};

  // Handle nested school and grade objects
  const schoolName = data?.school?.name ?? data?.school ?? "";
  const gradeName = data?.grade?.name ?? data?.grade ?? "";
  const cityName =
    typeof data?.city === "object" ? data?.city?.name : data?.city;
  const districtName =
    typeof data?.district === "object" ? data?.district?.name : data?.district;

  const photoSource =
    data?.profile_image_path ??
    data?.photo_path ??
    data?.photo ??
    data?.photoUrl ??
    data?.photo_url ??
    data?.images ??
    data?.image ??
    "";

  const rawId =
    data?.id ??
    data?._id ??
    data?.registration_id ??
    data?.registrationId ??
    data?.student_registration_id ??
    "";

  const rawAgree =
    data?.agree ?? data?.agreed ?? data?.accept_terms ?? data?.acceptTerms;

  const genderText =
    typeof data?.gender === "string" ? data.gender.toLowerCase() : "";
  const resolvedGender =
    genderText === "male"
      ? "Male"
      : genderText === "female"
        ? "Female"
        : (data?.gender ?? "");

  const resolvedPhoto =
    extractFirstImagePath(photoSource) ||
    (typeof photoSource === "string" ? photoSource : "");

  return {
    ...DEFAULT_FORM,
    id: rawId ? String(rawId) : "",
    student_name: data?.student_name ?? data?.name ?? "",
    gender: resolvedGender,
    dob: formatDateValue(
      data?.dob ?? data?.date_of_birth ?? data?.dateOfBirth ?? "",
    ),
    grade: gradeName,
    formType: data?.formType ?? data?.type ?? DEFAULT_FORM.formType,
    student_phone:
      data?.student_phone ?? data?.phone ?? data?.studentPhone ?? "",
    email: data?.email ?? "",
    father_name: data?.father_name ?? "",
    father_cnic: data?.father_cnic ?? "",
    father_phone: data?.father_phone ?? "",
    school: schoolName,
    district: districtName ?? "",
    city: cityName ?? "",
    address: data?.address ?? "",
    formb_id: data?.formb_id ?? data?.form_b ?? "",
    agree:
      rawAgree === true ||
      rawAgree === 1 ||
      rawAgree === "1" ||
      rawAgree === "on",
    photo: resolvedPhoto,
    raw: data,
  };
};

const sanitizePhoneInput = (inputValue = "") => {
  const hasPlus = inputValue.startsWith("+");
  const digits = inputValue.replace(/\D/g, "");
  const limited = digits.slice(0, 12);

  if (hasPlus) return `+${limited}`;
  if (limited.startsWith("92")) return `+${limited}`;
  if (limited.startsWith("0")) return `+92${limited.slice(1, 11)}`;
  return limited ? `+${limited}` : "";
};

const sanitizeCnicInput = (inputValue = "") =>
  inputValue.replace(/\D/g, "").slice(0, 13);

const StudentSignUpForm = () => {
  const { role: storeRole, user } = useAuthStore();
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const resolvedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";

  const fallbackRegistration = React.useMemo(
    () => normalizeRegistration(state?.registration),
    [state?.registration],
  );
  const registrationId =
    paramsId || state?.registrationId || fallbackRegistration?.id;
  const isEditMode = Boolean(registrationId);

  const [formData, setFormData] = React.useState(() => {
    const base = fallbackRegistration ?? DEFAULT_FORM;
    return { ...DEFAULT_FORM, ...base };
  });
  const [photoFile, setPhotoFile] = React.useState(null);
  const [photoPreview, setPhotoPreview] = React.useState(() =>
    buildBackendFileUrl((fallbackRegistration ?? {}).photo),
  );
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isEditMode) return;

    // If we have fallback data with sufficient information, use it and skip API call
    const hasSufficientFallback =
      fallbackRegistration?.id &&
      fallbackRegistration.id === registrationId &&
      (fallbackRegistration.student_name || fallbackRegistration.name);

    if (hasSufficientFallback) {
      setFormData((prev) => ({ ...prev, ...fallbackRegistration }));
      if (fallbackRegistration.photo) {
        setPhotoPreview(buildBackendFileUrl(fallbackRegistration.photo));
      }
      return;
    }

    // No ID means we're creating a new registration
    if (!registrationId) {
      return;
    }

    // Fetch student data from API
    const fetchStudentData = async () => {
      setFetching(true);
      try {
        const response = await getAdminStudentById(registrationId);
        if (response?.data) {
          const normalized = normalizeRegistration(response.data);
          setFormData((prev) => ({ ...prev, ...normalized }));
          if (normalized.photo) {
            setPhotoPreview(buildBackendFileUrl(normalized.photo));
          }
        }
      } catch (err) {
        console.error("Failed to fetch student:", err);
        // Don't show error toast, form can still be used with available data
      } finally {
        setFetching(false);
      }
    };

    fetchStudentData();
  }, [isEditMode, registrationId, fallbackRegistration]);

  React.useEffect(() => {
    if (!photoFile) return undefined;
    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile]);

  React.useEffect(() => {
    if (photoFile) return;
    setPhotoPreview(buildBackendFileUrl(formData.photo));
  }, [formData.photo, photoFile]);

  const filteredGradeOptions = React.useMemo(
    () =>
      GRADE_OPTIONS.filter((option) => option.typefor === formData.formType),
    [formData.formType],
  );

  const minDate = React.useMemo(() => {
    if (formData.grade.startsWith("Grade 5")) return DATE_LIMITS.PMC_MIN;
    return DATE_LIMITS.VSS_MIN;
  }, [formData.grade]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => {
      if (type === "checkbox") {
        return { ...prev, [name]: checked };
      }
      if (name === "student_phone" || name === "father_phone") {
        return { ...prev, [name]: sanitizePhoneInput(value) };
      }
      if (name === "father_cnic" || name === "formb_id") {
        return { ...prev, [name]: sanitizeCnicInput(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleGenderChange = (value) => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };

  const handleProgramChange = (value) => {
    setFormData((prev) => {
      const gradeIsCompatible = GRADE_OPTIONS.some(
        (option) => option.typefor === value && option.value === prev.grade,
      );
      return {
        ...prev,
        formType: value,
        grade: gradeIsCompatible ? prev.grade : "",
      };
    });
  };

  const handleFileChange = (event) => {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Photo must be JPG or PNG.");
      event.target.value = "";
      return;
    }
    if (file.size > maxSize) {
      toast.error("Photo too large. Max size is 2 MB.");
      event.target.value = "";
      return;
    }

    setPhotoFile(file);
  };

  const validateForm = () => {
    const phoneRegex = /^\+92\d{10}$/;
    const cnicRegex = /^\d{13}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.student_name.trim())
      return { field: "student_name", message: "Student name is required." };
    if (!formData.gender)
      return { field: "gender", message: "Gender is required." };
    if (!formData.dob)
      return { field: "dob", message: "Date of Birth is required." };

    if (formData.dob < minDate) {
      return {
        field: "dob",
        message: `Date of Birth cannot be before ${minDate} for the selected grade.`,
      };
    }
    if (formData.dob > DATE_LIMITS.GLOBAL_MAX) {
      return {
        field: "dob",
        message: `Date of Birth cannot be after ${DATE_LIMITS.GLOBAL_MAX}.`,
      };
    }

    if (!formData.grade)
      return { field: "grade", message: "Grade is required." };

    if (!phoneRegex.test(formData.student_phone.trim()))
      return {
        field: "student_phone",
        message: "Invalid Student WhatsApp. Use +92XXXXXXXXXX format.",
      };
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim()))
      return { field: "email", message: "Active email is required." };
    if (!formData.father_name.trim())
      return { field: "father_name", message: "Father's name is required." };
    if (!cnicRegex.test(formData.father_cnic.trim()))
      return {
        field: "father_cnic",
        message: "Father's CNIC must be 13 digits (no dashes).",
      };
    if (!phoneRegex.test(formData.father_phone.trim()))
      return {
        field: "father_phone",
        message: "Invalid Father's WhatsApp. Use +92XXXXXXXXXX format.",
      };
    if (!formData.school.trim())
      return { field: "school", message: "School name is required." };
    if (!formData.district.trim())
      return { field: "district", message: "District is required." };
    if (!formData.city.trim())
      return { field: "city", message: "City is required." };
    if (!formData.address.trim())
      return { field: "address", message: "Address is required." };
    if (!cnicRegex.test(formData.formb_id.trim()))
      return {
        field: "formb_id",
        message: "Student Form-B/Smart Card ID must be 13 digits.",
      };
    if (!isEditMode && !photoFile && !formData.photo)
      return { field: "photo", message: "Student photo is required." };
    if (!formData.agree)
      return {
        field: "agree",
        message: "Please confirm the declaration.",
      };

    return null;
  };

  const buildPayload = () => {
    const payload = new FormData();
    payload.append("student_name", formData.student_name.trim());
    payload.append("gender", formData.gender);
    payload.append("dob", formData.dob);
    payload.append("grade", formData.grade);
    payload.append("student_phone", formData.student_phone.trim());
    payload.append("email", formData.email.trim());
    payload.append("father_name", formData.father_name.trim());
    payload.append("father_cnic", formData.father_cnic.trim());
    payload.append("father_phone", formData.father_phone.trim());
    payload.append("school", formData.school.trim());
    payload.append("district", formData.district.trim());
    payload.append("city", formData.city.trim());
    payload.append("address", formData.address.trim());
    payload.append("formb_id", formData.formb_id.trim());
    payload.append("agree", formData.agree ? "on" : "");
    payload.append("formType", formData.formType);
    if (photoFile) {
      payload.append("photo", photoFile);
    }
    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      const message =
        typeof validationError === "string"
          ? validationError
          : validationError?.message;
      setError(message);
      toast.error(message);
      return;
    }

    const payload = buildPayload();

    try {
      setLoading(true);
      if (isEditMode) {
        await updateAdminStudentById(registrationId, payload);
        toast.success("Registration updated successfully.");
      } else {
        await addStudentRegistrationForm(payload);
        toast.success("Registration added successfully.");
      }
      navigate(`${basePath}/student-signup-lists`);
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${
          isEditMode ? "update" : "add"
        } registration. Please try again.`;
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
          <h4>
            {resolvedRole === "school" ? "School Dashboard" : "Admin Dashboard"}
          </h4>
          <h1>
            {isEditMode ? "Update Registration" : "Add Student Registration"}
          </h1>
          <p className="text-slate-600 text-md">
            Keep the fields aligned with the public admission form.
          </p>
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
                  <label>Admission Program</label>
                  <div className="flex gap-3 mt-2">
                    {PROGRAM_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="radio"
                          name="formType"
                          value={option.value}
                          checked={formData.formType === option.value}
                          onChange={(e) => handleProgramChange(e.target.value)}
                          disabled={loading}
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group w-half">
                  <label>
                    <GraduationCap size={16} /> Grade<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="" disabled>
                      -- select grade --
                    </option>
                    {filteredGradeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group w-full">
                  <label>
                    <User size={16} /> Student Full Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="student_name"
                    value={formData.student_name}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="As per Form-B"
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
                    value={formData.dob}
                    onChange={handleInputChange}
                    min={minDate}
                    max={DATE_LIMITS.GLOBAL_MAX}
                    disabled={loading}
                  />
                  {/* <p className="text-xs text-gray-500 mt-1">
                    Allowed: {minDate} to {DATE_LIMITS.GLOBAL_MAX}
                  </p> */}
                </div>

                <div className="form-group w-half">
                  <label>
                    <Flag size={16} /> Student Form-B / Smart Card ID
                    <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="formb_id"
                    value={formData.formb_id}
                    onChange={handleInputChange}
                    placeholder="13 digits (no dashes)"
                    maxLength={13}
                    inputMode="numeric"
                    title="Enter exactly 13 digits"
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Student WhatsApp<span>*</span>
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="student_phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={13}
                    placeholder="+923001234567"
                    value={formData.student_phone}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Mail size={16} /> Active Email<span>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <User size={16} /> Father's Full Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="father_name"
                    value={formData.father_name}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Flag size={16} /> Father's CNIC<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="father_cnic"
                    value={formData.father_cnic}
                    onChange={handleInputChange}
                    placeholder="13 digits (no dashes)"
                    maxLength={13}
                    inputMode="numeric"
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Father's WhatsApp<span>*</span>
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="father_phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={13}
                    placeholder="+923001234567"
                    value={formData.father_phone}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-full">
                  <label>
                    <GraduationCap size={16} /> School Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="school"
                    value={formData.school}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-full">
                  <DistrictCitySelector
                    district={formData.district}
                    city={formData.city}
                    onDistrictChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        district: value,
                        city: "",
                      }))
                    }
                    onCityChange={(value) =>
                      setFormData((prev) => ({ ...prev, city: value }))
                    }
                    disabled={loading}
                    icon={<Map size={16} />}
                  />
                </div>

                <div className="form-group w-full">
                  <label>
                    Residential Address<span>*</span>
                  </label>
                  <textarea
                    className="form-input"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>Gender*</label>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={handleGenderChange}
                    className="flex gap-4 mt-3 mb-3"
                  >
                    <div className="flex items-center space-x-2 radio-wrap">
                      <RadioGroupItem
                        value="Male"
                        id="registration-gender-male"
                        className="radio-input-custom"
                      />
                      <Label
                        htmlFor="registration-gender-male"
                        className="radio-label-custom"
                      >
                        Male
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 radio-wrap">
                      <RadioGroupItem
                        value="Female"
                        id="registration-gender-female"
                        className="radio-input-custom"
                      />
                      <Label
                        htmlFor="registration-gender-female"
                        className="radio-label-custom"
                      >
                        Female
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="form-group w-half">
                  <label>
                    <ImageIcon size={16} /> Student Photo
                    {!isEditMode && <span>*</span>}
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-50 transition-colors">
                      <span>Choose File</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={loading}
                      />
                    </label>
                    {photoPreview ? (
                      <div className="show-img">
                        <img
                          src={photoPreview}
                          alt="Student"
                          className="h-20 w-20 rounded-md object-cover border"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No photo selected</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG or PNG, max 2 MB. If missing, add/update once available.
                  </p>
                </div>

                <div className="form-group w-full">
                  <label>
                    Declaration<span>*</span>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      name="agree"
                      checked={formData.agree}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">
                      I confirm the information is correct and can be used for
                      admissions and verification.
                    </span>
                  </label>
                </div>
              </div>
              <div className="form-button-row">
                <button
                  type="button"
                  className="global-btn secondary flex items-center justify-center gap-1"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  <X size={18} />
                  Cancel
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
                  ) : (
                    <>
                      {isEditMode ? "Update Registration" : "Add Registration"}
                      <Save size={18} />
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

export default StudentSignUpForm;
