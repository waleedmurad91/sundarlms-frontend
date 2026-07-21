import React from "react";
import {
  AlertCircleIcon,
  Book,
  Calendar,
  ChevronLeft,
  Eye,
  EyeClosed,
  FileImage,
  IdCard,
  Loader2,
  Lock,
  Mail,
  Map as MapIcon,
  MapPin,
  MapPinCheck,
  Mars,
  Phone,
  Save,
  School,
  User,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  checkEmail,
  checkUsername,
  getLocationCities,
  getLocationCitiesByTehsil,
  getLocationClusterAreas,
  getLocationDistricts,
  getLocationProvinces,
  getLocationTehsils,
  getPMCActiveSession,
  getRMCActiveSession,
  getRMCVenues,
  getStudentGrades,
  getSchoolsAndData,
} from "@/api/authApi";
import {
  addCentralizedStudent,
  getCentralizedStudentById,
  getStudentProfile,
  updateCentralizedStudentById,
  updateStudentPortalProfileById,
} from "@/api/studentCentralizedApi";
import { useAuthStore } from "@/store/auth";

const DEFAULT_FORM = {
  source: "open",
  schoolId: "",
  school_name: "",
  other_school_name: "",
  classId: "",
  class_label: "",
  join_pmc: false,
  join_rmc: false,
  pmc_session_id: "",
  pmc_time_slot_id: "",
  rmc_session_id: "",
  rmc_venue_id: "",
  rmc_venue_label: "",
  name: "",
  email: "",
  username: "",
  password: "",
  confirm_password: "",
  dob: "",
  phone: "",
  address: "",
  gender: "",
  profile_image: "",
  father_name: "",
  father_phone: "",
  father_cnic: "",
  province: "",
  district: "",
  tehsil: "",
  city: "",
  cluster_area: "",
  formb_id: "",
  whatsapp_check: false,
  rmc_participation: false,
};

const SOURCE_OPTIONS = new Set(["open", "pmc", "rmc"]);
const SHOW_CONTEST_SECTION = false;
const PHONE_REGEX = /^\+92\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_CHECK_DEBOUNCE_MS = 500;
const DOB_MIN_AGE = 7;
const DOB_MAX_AGE = 13;

const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDobBoundaryDate = (years, month, day) => {
  const currentYear = new Date().getFullYear();
  return new Date(currentYear - years, month, day);
};

const DOB_MIN_DATE = formatDateInputValue(
  getDobBoundaryDate(DOB_MAX_AGE, 0, 1),
);
const DOB_MAX_DATE = formatDateInputValue(
  getDobBoundaryDate(DOB_MIN_AGE, 11, 31),
);

const isDobWithinAllowedRange = (value) => {
  const dob = String(value ?? "").trim();
  return Boolean(dob) && dob >= DOB_MIN_DATE && dob <= DOB_MAX_DATE;
};

const resolveContestSource = (joinPmc, joinRmc) => {
  if (joinPmc) return "pmc";
  if (joinRmc) return "rmc";
  return "open";
};

const resolveSchools = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) return data;

  const candidates = [data?.data, data?.items, data?.results, data?.schools];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const entries = Object.values(candidate).filter(
        (value) => value && typeof value === "object" && !Array.isArray(value),
      );
      if (entries.length) return entries;
    }
  }

  if (data && typeof data === "object") {
    const entries = Object.values(data).filter(
      (value) => value && typeof value === "object" && !Array.isArray(value),
    );
    if (entries.length) return entries;
  }

  return [];
};

const resolveCollection = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) return data;

  const candidates = [
    data?.data,
    data?.items,
    data?.results,
    data?.provinces,
    data?.districts,
    data?.tehsils,
    data?.cities,
    data?.cluster_areas,
    data?.clusterAreas,
    data?.["cluster-areas"],
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (data && typeof data === "object") {
    const firstArray = Object.values(data).find((value) =>
      Array.isArray(value),
    );
    if (Array.isArray(firstArray)) return firstArray;
  }

  return [];
};

const resolveOptionId = (option) =>
  option?.id ??
  option?._id ??
  option?.value ??
  option?.province_id ??
  option?.district_id ??
  option?.tehsil_id ??
  option?.city_id ??
  option?.cluster_area_id ??
  null;

const resolveOptionName = (option, fallback) =>
  option?.name ??
  option?.label ??
  option?.title ??
  option?.text ??
  option?.province_name ??
  option?.district_name ??
  option?.tehsil_name ??
  option?.city_name ??
  option?.cluster_area_name ??
  (fallback !== undefined && fallback !== null ? String(fallback) : "");

const normalizeLocationOptions = (payload) =>
  resolveCollection(payload)
    .map((option) => {
      const id = resolveOptionId(option);
      if (id === null || id === undefined || id === "") return null;
      const name = resolveOptionName(option, id);
      return { id: String(id), name: String(name) };
    })
    .filter(Boolean);

const normalizeGradeOptions = (payload) =>
  Array.from(
    new globalThis.Map(
      resolveCollection(payload)
        .map((grade) => {
          const value = normalizeGradeIdValue(getGradeId(grade));
          if (!value) return null;
          const label =
            grade?.name ??
            grade?.grade_name ??
            grade?.label ??
            grade?.title ??
            `Grade ${value}`;
          return { value, label: String(label) };
        })
        .filter(Boolean)
        .map((option) => [option.value, option]),
    ).values(),
  );

const getSchoolIdentifier = (school) =>
  school?.id ??
  school?._id ??
  school?.value ??
  school?.school_id ??
  school?.schoolId ??
  null;

const getSchoolLabel = (school) =>
  school?.display_name ??
  school?.name ??
  school?.label ??
  school?.school_name ??
  school?.title ??
  "Untitled School";

const normalizeGradeIdValue = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return raw;
  const match = raw.match(/\d+/);
  return match ? match[0] : "";
};

const getGradeId = (grade) =>
  grade?.id ??
  grade?._id ??
  grade?.grade_id ??
  grade?.gradeId ??
  grade?.pivot?.grade_id ??
  null;

const getSessionId = (session) =>
  session?.id ??
  session?._id ??
  session?.value ??
  session?.session_id ??
  session?.sessionId ??
  null;

const getVenueId = (venue) =>
  venue?.id ??
  venue?._id ??
  venue?.value ??
  venue?.venue_id ??
  venue?.venueId ??
  venue?.rmc_venue_id ??
  venue?.rmcVenueId ??
  null;

const getVenueLabel = (venue) =>
  venue?.name ??
  venue?.label ??
  venue?.title ??
  venue?.venue_name ??
  venue?.rmc_venue_name ??
  "RMC Venue";

const getSessionTimeSlots = (session) =>
  Array.isArray(session?.time_slots) ? session.time_slots : [];

const getTimeSlotId = (slot) =>
  slot?.id ??
  slot?._id ??
  slot?.time_slot_id ??
  slot?.timeSlotId ??
  slot?.value ??
  null;

const formatTimePart = (value) => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{2}:\d{2})/);
  return match?.[1] ?? raw;
};

const getTimeSlotLabel = (slot) => {
  const start = formatTimePart(slot?.start_time ?? slot?.startTime);
  const end = formatTimePart(slot?.end_time ?? slot?.endTime);
  if (start && end) return `${start} - ${end}`;
  return start || end || "Time Slot";
};

const extractGradeKey = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const match = raw.match(/\d+/);
  return match?.[0] ?? "";
};

const getSessionGradeIds = (session) =>
  (Array.isArray(session?.grades) ? session.grades : [])
    .map(
      (grade) =>
        grade?.id ??
        grade?._id ??
        grade?.grade_id ??
        grade?.gradeId ??
        grade?.pivot?.grade_id,
    )
    .map((value) => normalizeGradeIdValue(value))
    .filter(Boolean);

const getSessionGradeNames = (session) =>
  (Array.isArray(session?.grades) ? session.grades : [])
    .map((grade) => grade?.name ?? grade?.label ?? grade?.title ?? "")
    .map((value) => extractGradeKey(value))
    .filter(Boolean);

const doesSessionSupportClass = (session, classId, classGradeKey) => {
  const sessionGradeIds = new Set(getSessionGradeIds(session));
  const sessionGradeKeys = new Set(getSessionGradeNames(session));
  return (
    (classId && sessionGradeIds.has(classId)) ||
    (classGradeKey && sessionGradeKeys.has(classGradeKey))
  );
};

const isSessionActive = (session) =>
  Boolean(session?.is_active ?? session?.isActive);

const sanitizePhoneInput = (inputValue = "") => {
  const digitsOnly = String(inputValue ?? "").replace(/\D/g, "");
  if (!digitsOnly) return "";

  let normalized = digitsOnly;
  if (normalized.startsWith("0")) {
    normalized = `92${normalized.slice(1)}`;
  } else if (!normalized.startsWith("92")) {
    normalized = `92${normalized}`;
  }

  normalized = normalized.slice(0, 12);
  return `+${normalized}`;
};

const findOptionByName = (options, name) => {
  const normalizedName = String(name ?? "")
    .trim()
    .toLowerCase();
  if (!normalizedName) return null;
  return (
    options.find(
      (item) =>
        String(item?.name ?? "")
          .trim()
          .toLowerCase() === normalizedName,
    ) || null
  );
};

const normalizeLocationMatchText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\b(province|district|tehsil|city)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

const resolveSchoolLocationName = (school, key) => {
  const value =
    school?.[`${key}_name`] ??
    school?.[`${key}Name`] ??
    (typeof school?.[key] === "object" && school?.[key] !== null
      ? resolveOptionName(school[key])
      : school?.[key]);
  return String(value ?? "").trim();
};

const resolveSchoolLocationId = (school, key) => {
  const directId = school?.[`${key}_id`] ?? school?.[`${key}Id`];
  if (
    directId !== null &&
    directId !== undefined &&
    String(directId).trim() !== ""
  ) {
    return String(directId).trim();
  }

  if (typeof school?.[key] === "object" && school?.[key] !== null) {
    const nestedId = resolveOptionId(school[key]);
    if (
      nestedId !== null &&
      nestedId !== undefined &&
      String(nestedId).trim() !== ""
    ) {
      return String(nestedId).trim();
    }
  }

  return "";
};

const findOptionByIdOrName = (options, id, name) => {
  const normalizedId = String(id ?? "").trim();
  if (normalizedId) {
    const byId =
      options.find((item) => String(item?.id ?? "").trim() === normalizedId) ||
      null;
    if (byId) return byId;
  }

  const byName = findOptionByName(options, name);
  if (byName) return byName;

  const target = normalizeLocationMatchText(name);
  if (!target) return null;

  return (
    options.find((item) => {
      const candidate = normalizeLocationMatchText(item?.name);
      if (!candidate) return false;
      return (
        candidate === target ||
        candidate.includes(target) ||
        target.includes(candidate)
      );
    }) || null
  );
};

const createLocationAutoFillState = (overrides = {}) => ({
  province: false,
  district: false,
  tehsil: false,
  city: false,
  ...overrides,
});

const normalizeSource = (value) => {
  const source = String(value ?? "")
    .trim()
    .toLowerCase();
  return SOURCE_OPTIONS.has(source) ? source : "open";
};

const normalizeGender = (value) => {
  const gender = String(value ?? "")
    .trim()
    .toLowerCase();
  if (gender === "male") return "male";
  if (gender === "female") return "female";
  return "";
};

const parseBooleanFlag = (value) => {
  if (value === true || value === 1 || value === "1") return true;
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  return text === "true" || text === "yes" || text === "on";
};

const resolveStudentProfileEditingEnabled = (payload) => {
  if (!payload) return true;

  const container = payload ?? {};
  const root = container?.data ?? container;
  const candidates = [
    container?.student_email_login_enabled,
    root?.student_email_login_enabled,
    container?.settings?.student_email_login_enabled,
    root?.settings?.student_email_login_enabled,
    container?.registration?.student_email_login_enabled,
    root?.registration?.student_email_login_enabled,
    container?.registration_module_student?.student_email_login_enabled,
    root?.registration_module_student?.student_email_login_enabled,
    container?.student?.student_email_login_enabled,
    root?.student?.student_email_login_enabled,
    container?.user?.student_email_login_enabled,
    root?.user?.student_email_login_enabled,
  ];

  const configuredValue = candidates.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );

  if (configuredValue === undefined) {
    return true;
  }

  return parseBooleanFlag(configuredValue);
};

const normalizeCentralizedStudent = (payload) => {
  if (!payload) {
    return {
      ...DEFAULT_FORM,
      id: "",
    };
  }

  const root = payload?.data ?? payload;
  const hasCentralizedShape = (value) =>
    Boolean(
      value &&
      typeof value === "object" &&
      (value?.school_id !== undefined ||
        value?.grade_id !== undefined ||
        value?.source !== undefined ||
        value?.father_name !== undefined ||
        value?.province !== undefined ||
        value?.district !== undefined ||
        value?.city !== undefined ||
        value?.formb_id !== undefined),
    );

  const data = hasCentralizedShape(root)
    ? root
    : hasCentralizedShape(root?.registration)
      ? root.registration
      : hasCentralizedShape(root?.registration_module_student)
        ? root.registration_module_student
        : (root?.registration ??
          root?.registration_module_student ??
          root?.student ??
          root ??
          {});
  const user = data?.user ?? {};
  const school = data?.school ?? {};
  const grade = data?.grade ?? {};
  const normalizedSource = normalizeSource(
    data?.source ?? data?.formType ?? data?.form_type,
  );
  const normalizedPmcSessionId = String(
    data?.pmc_session_id ??
      data?.pmcSessionId ??
      data?.pmc_participations?.[0]?.pmc_session_id ??
      data?.pmc_participations?.[0]?.session?.id ??
      "",
  );
  const normalizedPmcTimeSlotId = String(
    data?.pmc_time_slot_id ??
      data?.pmcTimeSlotId ??
      data?.time_slot_id ??
      data?.timeSlotId ??
      data?.time_slot?.id ??
      data?.pmc_participations?.[0]?.pmc_time_slot_id ??
      data?.pmc_participations?.[0]?.time_slot_id ??
      data?.pmc_participations?.[0]?.time_slot?.id ??
      "",
  );
  const normalizedRmcSessionId = String(
    data?.rmc_session_id ??
      data?.rmcSessionId ??
      data?.session_id ??
      data?.sessionId ??
      data?.rmc_participations?.[0]?.rmc_session_id ??
      data?.rmc_participations?.[0]?.session_id ??
      data?.rmc_participations?.[0]?.session?.id ??
      "",
  );
  const normalizedRmcVenueId = String(
    data?.rmc_venue_id ??
      data?.rmcVenueId ??
      data?.venue_id ??
      data?.venueId ??
      data?.rmc_venue?.id ??
      data?.venue?.id ??
      data?.rmc_participations?.[0]?.rmc_venue_id ??
      data?.rmc_participations?.[0]?.venue_id ??
      data?.rmc_participations?.[0]?.venue?.id ??
      data?.rmc_participations?.[0]?.rmc_venue?.id ??
      "",
  );
  const joinPmc = normalizedSource === "pmc" || Boolean(normalizedPmcSessionId);
  const joinRmc =
    normalizedSource === "rmc" ||
    Boolean(normalizedRmcSessionId || normalizedRmcVenueId);

  return {
    ...DEFAULT_FORM,
    id: String(
      data?.id ??
        data?._id ??
        data?.registration_id ??
        data?.registrationId ??
        "",
    ),
    source: normalizedSource,
    schoolId: String(
      data?.school_id ??
        data?.schoolId ??
        school?.id ??
        school?._id ??
        school?.value ??
        "",
    ),
    school_name: school?.display_name ?? school?.name ?? "",
    other_school_name: data?.other_school_name ?? data?.otherSchoolName ?? "",
    classId: normalizeGradeIdValue(
      data?.grade_id ??
        data?.gradeId ??
        grade?.id ??
        grade?._id ??
        grade?.grade_id ??
        data?.class_id ??
        data?.classId,
    ),
    class_label:
      grade?.name ??
      data?.grade_name ??
      (data?.grade_id ? `Grade ${data.grade_id}` : ""),
    join_pmc: joinPmc,
    join_rmc: joinRmc,
    pmc_session_id: normalizedPmcSessionId,
    pmc_time_slot_id: normalizedPmcTimeSlotId,
    rmc_session_id: normalizedRmcSessionId,
    rmc_venue_id: normalizedRmcVenueId,
    rmc_venue_label:
      data?.rmc_venue?.name ??
      data?.rmc_venue?.title ??
      data?.venue?.name ??
      data?.venue?.title ??
      data?.rmc_venue_name ??
      data?.venue_name ??
      data?.rmc_participations?.[0]?.venue?.name ??
      data?.rmc_participations?.[0]?.venue?.title ??
      data?.rmc_participations?.[0]?.rmc_venue?.name ??
      data?.rmc_participations?.[0]?.rmc_venue?.title ??
      "",
    name: data?.name ?? data?.student_name ?? user?.name ?? "",
    email: data?.email ?? user?.email ?? "",
    username: data?.username ?? user?.username ?? "",
    password: "",
    confirm_password: "",
    dob: data?.dob ? String(data.dob).slice(0, 10) : "",
    phone: sanitizePhoneInput(
      data?.phone ?? data?.student_phone ?? user?.phone,
    ),
    address: data?.address ?? user?.address ?? "",
    gender: normalizeGender(data?.gender ?? user?.gender),
    profile_image:
      data?.profile_image_path ??
      data?.profile_image ??
      data?.profileImage ??
      user?.profile_image ??
      "",
    father_name: data?.father_name ?? "",
    father_phone: sanitizePhoneInput(data?.father_phone ?? ""),
    father_cnic: String(data?.father_cnic ?? "")
      .replace(/\D/g, "")
      .slice(0, 13),
    province: data?.province ?? "",
    district: data?.district ?? "",
    tehsil: data?.tehsil ?? "",
    city: data?.city ?? "",
    cluster_area: data?.cluster_area ?? data?.clusterArea ?? "",
    formb_id: String(data?.formb_id ?? "")
      .replace(/\D/g, "")
      .slice(0, 13),
    whatsapp_check: false,
    rmc_participation: parseBooleanFlag(
      data?.rmc_participation ?? data?.rmcParticipation,
    ),
  };
};

const CentralizedStudentForm = ({
  profileMode = false,
  forcedStudentId = "",
  dashboardTitle: dashboardTitleOverride,
  pageTitle,
  lockIdentityFields = false,
  onSuccess,
  isEditable,
  onCreateEditRequest,
  isCreatingRequest = false,
  editRequestStatus,
}) => {
  const { role: storeRole, user, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStudent = React.useMemo(
    () => normalizeCentralizedStudent(state?.student ?? state?.registration),
    [state?.student, state?.registration],
  );

  const studentId =
    String(forcedStudentId ?? "").trim() ||
    paramsId ||
    state?.studentId ||
    state?.registrationId ||
    fallbackStudent?.id ||
    "";
  const isEditMode = profileMode ? true : Boolean(studentId);
  const isIdentityLocked = Boolean(lockIdentityFields && !profileMode);

  const resolvedRoleValue = storeRole ?? user?.role;
  const resolvedRole =
    typeof resolvedRoleValue === "string"
      ? resolvedRoleValue.toLowerCase()
      : "admin";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";
  const defaultDashboardTitle =
    resolvedRole === "school" ? "School Dashboard" : "Admin Dashboard";
  const dashboardTitle = dashboardTitleOverride || defaultDashboardTitle;
  const resolvedPageTitle =
    pageTitle || (isEditMode ? "Update Student" : "Add New Student");

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    ...fallbackStudent,
  }));
  const wantsPmcContest = SHOW_CONTEST_SECTION && Boolean(formField.join_pmc);
  const wantsRmcContest = SHOW_CONTEST_SECTION && Boolean(formField.join_rmc);
  const source = SHOW_CONTEST_SECTION
    ? resolveContestSource(wantsPmcContest, wantsRmcContest)
    : normalizeSource(formField.source);
  const shouldSubmitPmcDetails = SHOW_CONTEST_SECTION
    ? wantsPmcContest
    : Boolean(String(formField.pmc_session_id ?? "").trim());
  const shouldSubmitRmcDetails = SHOW_CONTEST_SECTION
    ? wantsRmcContest
    : Boolean(
        String(formField.rmc_session_id ?? "").trim() ||
        String(formField.rmc_venue_id ?? "").trim() ||
        parseBooleanFlag(formField.rmc_participation),
      );

  const [schools, setSchools] = React.useState([]);
  const [schoolsLoading, setSchoolsLoading] = React.useState(false);
  const [gradeOptions, setGradeOptions] = React.useState([]);
  const [gradesLoading, setGradesLoading] = React.useState(false);
  const [profilePreview, setProfilePreview] = React.useState("");

  const [passwordType, setPasswordType] = React.useState("password");
  const formRef = React.useRef(null);
  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password",
    );
  };

  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [studentProfileEditingEnabled, setStudentProfileEditingEnabled] =
    React.useState(true);
  const [forceFetchKey, setForceFetchKey] = React.useState(0);
  const [initialUsername, setInitialUsername] = React.useState(() =>
    String(fallbackStudent?.username ?? "").trim(),
  );
  const [initialEmail, setInitialEmail] = React.useState(() =>
    String(fallbackStudent?.email ?? "").trim(),
  );
  const [usernameAvailability, setUsernameAvailability] = React.useState({
    status: "idle",
    message: "",
  });
  const usernameCheckTimeoutRef = React.useRef(null);
  const usernameCheckRequestRef = React.useRef(0);
  const [emailAvailability, setEmailAvailability] = React.useState({
    status: "idle",
    message: "",
  });
  const emailCheckTimeoutRef = React.useRef(null);
  const emailCheckRequestRef = React.useRef(0);
  const [pmcSessions, setPmcSessions] = React.useState([]);
  const [pmcSessionLoading, setPmcSessionLoading] = React.useState(false);
  const [pmcSessionError, setPmcSessionError] = React.useState("");
  const [rmcActiveSessions, setRmcActiveSessions] = React.useState([]);
  const [rmcSessionLoading, setRmcSessionLoading] = React.useState(false);
  const [rmcSessionError, setRmcSessionError] = React.useState("");
  const [rmcVenues, setRmcVenues] = React.useState([]);
  const [, setRmcVenuesLoading] = React.useState(false);

  const [provinceOptions, setProvinceOptions] = React.useState([]);
  const [districtOptions, setDistrictOptions] = React.useState([]);
  const [tehsilOptions, setTehsilOptions] = React.useState([]);
  const [cityOptions, setCityOptions] = React.useState([]);
  const [clusterOptions, setClusterOptions] = React.useState([]);

  const [provinceId, setProvinceId] = React.useState("");
  const [districtId, setDistrictId] = React.useState("");
  const [tehsilId, setTehsilId] = React.useState("");
  const [cityId, setCityId] = React.useState("");
  const [_clusterId, setClusterId] = React.useState("");
  const schoolSyncRequestRef = React.useRef(0);
  const pinnedSchoolIdRef = React.useRef("");
  const [locationAutoFilled, setLocationAutoFilled] = React.useState(() =>
    createLocationAutoFillState(),
  );
  const [selectedSchoolSnapshot, setSelectedSchoolSnapshot] =
    React.useState(null);

  const [provinceLoading, setProvinceLoading] = React.useState(false);
  const [districtLoading, setDistrictLoading] = React.useState(false);
  const [tehsilLoading, setTehsilLoading] = React.useState(false);
  const [cityLoading, setCityLoading] = React.useState(false);
  const [_clusterLoading, setClusterLoading] = React.useState(false);
  const hasHydratedLocationRef = React.useRef(false);
  const whatsappManualOverrideRef = React.useRef(false);
  const sessionLoading = pmcSessionLoading || rmcSessionLoading;
  const isStudentProfileReadOnly = Boolean(
    profileMode && !(isEditable ?? studentProfileEditingEnabled),
  );
  const isFormDisabled = loading || isStudentProfileReadOnly;

  React.useEffect(() => {
    let active = true;

    const fetchGrades = async () => {
      setGradesLoading(true);
      try {
        const response = await getStudentGrades();
        if (!active) return;
        setGradeOptions(normalizeGradeOptions(response));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load grades.");
      } finally {
        if (active) setGradesLoading(false);
      }
    };

    fetchGrades();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isEditMode) return;
    if (!profileMode && !studentId) return;

    let isMounted = true;
    const fetchStudent = async () => {
      setFetching(true);
      try {
        const response = profileMode
          ? await getStudentProfile()
          : await getCentralizedStudentById(studentId);
        const normalized = normalizeCentralizedStudent(response);
        if (!isMounted) return;
        setFormField((prev) => ({
          ...prev,
          ...normalized,
        }));
        setInitialUsername(String(normalized?.username ?? "").trim());
        setInitialEmail(String(normalized?.email ?? "").trim());
        setStudentProfileEditingEnabled(
          profileMode ? resolveStudentProfileEditingEnabled(response) : true,
        );
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message || "Unable to load student details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setFetching(false);
      }
    };

    fetchStudent();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, profileMode, studentId, forceFetchKey]);

  React.useEffect(() => {
    hasHydratedLocationRef.current = false;
  }, [studentId]);

  React.useEffect(() => {
    if (!profileMode) return;
    setError("");
  }, [profileMode]);

  const focusField = React.useCallback((fieldName) => {
    const form = formRef.current;
    if (!form || !fieldName) return;

    const selectorMap = {
      schoolId: 'input[placeholder="Search schools..."]',
      classId: 'select[name="classId"]',
      name: 'input[name="name"]',
      profile_image: 'input[name="profile_image"]',
      dob: 'input[name="dob"]',
      phone: 'input[name="phone"]',
      gender: "#teacher-gender-male",
      father_name: 'input[name="father_name"]',
      father_phone: 'input[name="father_phone"]',
      father_cnic: 'input[name="father_cnic"]',
      formb_id: "#formb_id",
      username: "#username",
      address: 'input[name="address"]',
      password: 'input[name="password"]',
      confirm_password: 'input[name="confirm_password"]',
      other_school_name: 'input[name="other_school_name"]',
      province: 'input[placeholder="Search province..."]',
      district: 'input[placeholder="Search district..."]',
      tehsil: 'input[placeholder="Search tehsil..."]',
      city: 'input[placeholder="Search city..."]',
      pmc_session_id: 'select[name="pmc_session_id"]',
      pmc_time_slot_id: 'select[name="pmc_time_slot_id"]',
      rmc_session_id: 'select[name="rmc_session_id"]',
      rmc_venue_id: 'select[name="rmc_venue_id"]',
    };

    const target = form.querySelector(selectorMap[fieldName]);
    if (target instanceof HTMLElement) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  React.useEffect(() => {
    const username = String(formField.username ?? "").trim();

    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
      usernameCheckTimeoutRef.current = null;
    }

    if (!username || username.length < 3) {
      setUsernameAvailability({ status: "idle", message: "" });
      return;
    }

    if (isStudentProfileReadOnly) {
      setUsernameAvailability({ status: "idle", message: "" });
      return;
    }

    if (isIdentityLocked && isEditMode) {
      setUsernameAvailability({
        status: "available",
        message: "Current username.",
      });
      return;
    }

    if (
      isEditMode &&
      initialUsername &&
      username.toLowerCase() === initialUsername.toLowerCase()
    ) {
      setUsernameAvailability({
        status: "available",
        message: "Current username.",
      });
      return;
    }

    setUsernameAvailability({
      status: "checking",
      message: "Checking username availability...",
    });

    const requestId = usernameCheckRequestRef.current + 1;
    usernameCheckRequestRef.current = requestId;

    usernameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await checkUsername(username);
        if (usernameCheckRequestRef.current !== requestId) return;
        const available = Boolean(response?.data?.available);
        setUsernameAvailability(
          available
            ? { status: "available", message: "Username is available." }
            : { status: "unavailable", message: "Username is already taken." },
        );
      } catch (err) {
        if (usernameCheckRequestRef.current !== requestId) return;
        setUsernameAvailability({
          status: "error",
          message: err?.message || "Unable to verify username right now.",
        });
      }
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
        usernameCheckTimeoutRef.current = null;
      }
    };
  }, [
    formField.username,
    initialUsername,
    isEditMode,
    isIdentityLocked,
    isStudentProfileReadOnly,
  ]);

  React.useEffect(() => {
    const email = String(formField.email ?? "")
      .trim()
      .toLowerCase();

    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
      emailCheckTimeoutRef.current = null;
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      setEmailAvailability({ status: "idle", message: "" });
      return;
    }

    if (isStudentProfileReadOnly) {
      setEmailAvailability({ status: "idle", message: "" });
      return;
    }

    if (isIdentityLocked && isEditMode) {
      setEmailAvailability({
        status: "available",
        message: "Current email.",
      });
      return;
    }

    if (
      isEditMode &&
      initialEmail &&
      email === initialEmail.trim().toLowerCase()
    ) {
      setEmailAvailability({
        status: "available",
        message: "Current email.",
      });
      return;
    }

    setEmailAvailability({
      status: "checking",
      message: "Checking email availability...",
    });

    const requestId = emailCheckRequestRef.current + 1;
    emailCheckRequestRef.current = requestId;

    emailCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await checkEmail(email);
        if (emailCheckRequestRef.current !== requestId) return;
        const available = Boolean(response?.data?.available);
        setEmailAvailability(
          available
            ? { status: "available", message: "Email is available." }
            : { status: "unavailable", message: "Email is already taken." },
        );
      } catch (err) {
        if (emailCheckRequestRef.current !== requestId) return;
        setEmailAvailability({
          status: "error",
          message: err?.message || "Unable to verify email right now.",
        });
      }
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
        emailCheckTimeoutRef.current = null;
      }
    };
  }, [
    formField.email,
    initialEmail,
    isEditMode,
    isIdentityLocked,
    isStudentProfileReadOnly,
  ]);

  React.useEffect(() => {
    let active = true;

    const fetchProvinces = async () => {
      setProvinceLoading(true);
      try {
        const response = await getLocationProvinces();
        if (!active) return;
        setProvinceOptions(normalizeLocationOptions(response));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load provinces.");
      } finally {
        if (active) setProvinceLoading(false);
      }
    };

    fetchProvinces();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isEditMode || hasHydratedLocationRef.current) return;
    if (!provinceOptions.length) return;

    const hasAnyLocation = Boolean(
      formField.province ||
      formField.district ||
      formField.tehsil ||
      formField.city ||
      formField.cluster_area,
    );
    if (!hasAnyLocation) return;

    let active = true;

    const hydrateLocationSelectors = async () => {
      const provinceMatch = findOptionByName(
        provinceOptions,
        formField.province,
      );
      if (!provinceMatch) return;

      hasHydratedLocationRef.current = true;
      setProvinceId(provinceMatch.id);

      try {
        const districtResponse = await getLocationDistricts(provinceMatch.id);
        if (!active) return;
        const nextDistrictOptions = normalizeLocationOptions(districtResponse);
        setDistrictOptions(nextDistrictOptions);

        const districtMatch = findOptionByName(
          nextDistrictOptions,
          formField.district,
        );
        const nextDistrictId = districtMatch?.id ?? "";
        setDistrictId(nextDistrictId);
        if (!nextDistrictId) return;

        const tehsilResponse = await getLocationTehsils(nextDistrictId);
        if (!active) return;
        const nextTehsilOptions = normalizeLocationOptions(tehsilResponse);
        setTehsilOptions(nextTehsilOptions);

        const tehsilMatch = findOptionByName(
          nextTehsilOptions,
          formField.tehsil,
        );
        const nextTehsilId = tehsilMatch?.id ?? "";
        setTehsilId(nextTehsilId);
        if (!nextTehsilId) return;

        let cityResponse;
        try {
          cityResponse = await getLocationCitiesByTehsil(nextTehsilId);
        } catch {
          cityResponse = await getLocationCities(nextDistrictId);
        }
        if (!active) return;
        const nextCityOptions = normalizeLocationOptions(cityResponse);
        setCityOptions(nextCityOptions);

        const cityMatch = findOptionByName(nextCityOptions, formField.city);
        const nextCityId = cityMatch?.id ?? "";
        setCityId(nextCityId);
        if (!nextCityId) return;

        const clusterResponse = await getLocationClusterAreas(nextCityId);
        if (!active) return;
        const nextClusterOptions = normalizeLocationOptions(clusterResponse);
        setClusterOptions(nextClusterOptions);

        const clusterMatch = findOptionByName(
          nextClusterOptions,
          formField.cluster_area,
        );
        setClusterId(clusterMatch?.id ?? "");
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to sync location options.");
      }
    };

    hydrateLocationSelectors();

    return () => {
      active = false;
    };
  }, [
    isEditMode,
    provinceOptions,
    formField.province,
    formField.district,
    formField.tehsil,
    formField.city,
    formField.cluster_area,
  ]);

  React.useEffect(() => {
    if (!provinceId) {
      setDistrictOptions([]);
      return;
    }

    let active = true;

    const fetchDistricts = async () => {
      setDistrictLoading(true);
      try {
        const response = await getLocationDistricts(provinceId);
        if (!active) return;
        setDistrictOptions(normalizeLocationOptions(response));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load districts.");
      } finally {
        if (active) setDistrictLoading(false);
      }
    };

    fetchDistricts();

    return () => {
      active = false;
    };
  }, [provinceId]);

  React.useEffect(() => {
    if (!districtId) {
      setTehsilOptions([]);
      return;
    }

    let active = true;

    const fetchTehsils = async () => {
      setTehsilLoading(true);
      try {
        const response = await getLocationTehsils(districtId);
        if (!active) return;
        setTehsilOptions(normalizeLocationOptions(response));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load tehsils.");
      } finally {
        if (active) setTehsilLoading(false);
      }
    };

    fetchTehsils();

    return () => {
      active = false;
    };
  }, [districtId]);

  React.useEffect(() => {
    if (!tehsilId) {
      setCityOptions([]);
      return;
    }

    let active = true;

    const fetchCities = async () => {
      setCityLoading(true);
      try {
        const response = await getLocationCitiesByTehsil(tehsilId);
        if (!active) return;
        setCityOptions(normalizeLocationOptions(response));
      } catch {
        if (!active) return;
        try {
          const fallbackResponse = await getLocationCities(districtId);
          if (!active) return;
          setCityOptions(normalizeLocationOptions(fallbackResponse));
        } catch (fallbackErr) {
          if (!active) return;
          toast.error(fallbackErr?.message || "Unable to load cities.");
        }
      } finally {
        if (active) setCityLoading(false);
      }
    };

    fetchCities();

    return () => {
      active = false;
    };
  }, [tehsilId, districtId]);

  React.useEffect(() => {
    if (!cityId) {
      setClusterOptions([]);
      return;
    }

    let active = true;

    const fetchClusters = async () => {
      setClusterLoading(true);
      try {
        const response = await getLocationClusterAreas(cityId);
        if (!active) return;
        setClusterOptions(normalizeLocationOptions(response));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load cluster areas.");
      } finally {
        if (active) setClusterLoading(false);
      }
    };

    fetchClusters();

    return () => {
      active = false;
    };
  }, [cityId]);

  const schoolOptions = React.useMemo(() => {
    const mapped = schools
      .map((school) => {
        const id = getSchoolIdentifier(school);
        if (!id && id !== 0) return null;
        return {
          value: String(id),
          label: getSchoolLabel(school),
        };
      })
      .filter(Boolean);

    const selectedId = String(formField.schoolId ?? "").trim();
    if (!selectedId || selectedId === "__other__") {
      return mapped;
    }

    const exists = mapped.some((option) => option.value === selectedId);
    if (exists) {
      return mapped;
    }

    const fallbackLabel =
      formField.school_name || formField.other_school_name || "Selected School";

    return [{ value: selectedId, label: fallbackLabel }, ...mapped];
  }, [
    schools,
    formField.schoolId,
    formField.school_name,
    formField.other_school_name,
  ]);

  const selectedSchool = React.useMemo(() => {
    if (!formField.schoolId) return null;
    return (
      schools.find(
        (school) =>
          String(getSchoolIdentifier(school)) === String(formField.schoolId),
      ) || null
    );
  }, [formField.schoolId, schools]);

  const isOtherSchoolMode = React.useMemo(() => {
    const schoolName =
      selectedSchool?.name ??
      selectedSchool?.display_name ??
      formField.school_name ??
      "";
    const isNamedOther = String(schoolName).trim().toLowerCase() === "other";
    return (
      formField.schoolId === "__other__" ||
      isNamedOther ||
      Boolean(String(formField.other_school_name ?? "").trim())
    );
  }, [
    formField.schoolId,
    formField.other_school_name,
    formField.school_name,
    selectedSchool,
  ]);

  const selectedSchoolClusterLabel = React.useMemo(() => {
    const clusterLabel = String(
      selectedSchool?.cluster_area ??
        selectedSchool?.clusterArea ??
        formField.cluster_area ??
        "",
    ).trim();
    return clusterLabel || "Not specified";
  }, [selectedSchool, formField.cluster_area]);

  const selectedSchoolLocationLines = React.useMemo(
    () => [
      { label: "City", value: String(formField.city ?? "").trim() },
      { label: "Tehsil", value: String(formField.tehsil ?? "").trim() },
      { label: "District", value: String(formField.district ?? "").trim() },
      { label: "Province", value: String(formField.province ?? "").trim() },
    ],
    [formField.city, formField.tehsil, formField.district, formField.province],
  );

  const showReadOnlySchoolLocation = Boolean(
    String(formField.schoolId ?? "").trim() && !isOtherSchoolMode,
  );

  const selectedSchoolHasInvalidLocation = React.useMemo(() => {
    if (!showReadOnlySchoolLocation) return false;
    if (!selectedSchool) {
      return selectedSchoolLocationLines.some((item) => !item.value);
    }

    return ["province", "district", "tehsil", "city"].some((key) => {
      const value = String(
        resolveSchoolLocationName(selectedSchool, key) ?? "",
      ).trim();
      return !value;
    });
  }, [selectedSchool, selectedSchoolLocationLines, showReadOnlySchoolLocation]);

  const classOptions = React.useMemo(() => {
    const selectedClassId = String(formField.classId ?? "").trim();
    if (!selectedClassId) return gradeOptions;
    const hasSelectedClass = gradeOptions.some(
      (option) => String(option.value) === selectedClassId,
    );
    if (hasSelectedClass) return gradeOptions;

    const fallbackLabel =
      String(formField.class_label ?? "").trim() || `Grade ${selectedClassId}`;
    return [{ value: selectedClassId, label: fallbackLabel }, ...gradeOptions];
  }, [gradeOptions, formField.classId, formField.class_label]);

  const selectedPmcSession = React.useMemo(() => {
    if (!formField.pmc_session_id) return null;
    return (
      pmcSessions.find(
        (session) =>
          String(getSessionId(session)) === String(formField.pmc_session_id),
      ) || null
    );
  }, [pmcSessions, formField.pmc_session_id]);

  const rmcSessions = React.useMemo(() => {
    const selectedClassId = normalizeGradeIdValue(formField.classId);
    if (!selectedClassId) return [];
    const selectedClassOption = classOptions.find(
      (option) => String(option?.value ?? "") === String(selectedClassId),
    );
    const selectedClassGradeKey = extractGradeKey(
      selectedClassOption?.label ?? selectedClassId,
    );
    return rmcActiveSessions.filter((session) =>
      doesSessionSupportClass(session, selectedClassId, selectedClassGradeKey),
    );
  }, [rmcActiveSessions, formField.classId, classOptions]);

  const selectedPmcTimeSlotOptions = React.useMemo(
    () =>
      getSessionTimeSlots(selectedPmcSession)
        .map((slot) => {
          const id = getTimeSlotId(slot);
          if (id === null || id === undefined || id === "") return null;
          return {
            value: String(id),
            label: getTimeSlotLabel(slot),
          };
        })
        .filter(Boolean),
    [selectedPmcSession],
  );

  const rmcVenueOptions = React.useMemo(() => {
    const normalized = rmcVenues
      .map((venue) => {
        const id = getVenueId(venue);
        if (id === null || id === undefined || id === "") return null;
        return {
          value: String(id),
          label: String(getVenueLabel(venue)),
        };
      })
      .filter(Boolean);

    const selectedVenueId = String(formField.rmc_venue_id ?? "").trim();
    if (!selectedVenueId) return normalized;

    const hasSelected = normalized.some(
      (option) => String(option.value) === selectedVenueId,
    );
    if (hasSelected) return normalized;

    const fallbackLabel =
      String(formField.rmc_venue_label ?? "").trim() ||
      `Venue ${selectedVenueId}`;
    return [{ value: selectedVenueId, label: fallbackLabel }, ...normalized];
  }, [rmcVenues, formField.rmc_venue_id, formField.rmc_venue_label]);

  const hasSelectedRegistrationClass = React.useMemo(
    () => Boolean(normalizeGradeIdValue(formField.classId)),
    [formField.classId],
  );

  const rmcContestAvailable = rmcActiveSessions.length > 0;

  const pmcSessionStatus = React.useMemo(() => {
    if (!wantsPmcContest) return { active: true, message: "" };
    if (!formField.dob) {
      return {
        active: false,
        message: "Select date of birth to check PMC sessions.",
      };
    }
    if (pmcSessionLoading) return { active: true, message: "" };
    if (pmcSessionError) {
      return { active: false, message: pmcSessionError };
    }
    if (!pmcSessions.length) {
      return {
        active: false,
        message: "PMC session is not active for the selected date of birth.",
      };
    }
    return { active: true, message: "" };
  }, [
    wantsPmcContest,
    formField.dob,
    pmcSessionLoading,
    pmcSessionError,
    pmcSessions,
  ]);

  const rmcSessionStatus = React.useMemo(() => {
    if (!wantsRmcContest) return { active: true, message: "" };
    if (rmcSessionLoading) return { active: true, message: "" };
    if (rmcSessionError) {
      return { active: false, message: rmcSessionError };
    }
    if (!rmcContestAvailable) {
      return { active: false, message: "RMC session is not active." };
    }
    if (!hasSelectedRegistrationClass) {
      return {
        active: false,
        message: "Select grade to check RMC sessions.",
      };
    }
    if (!rmcSessions.length) {
      return {
        active: false,
        message: "RMC session is not active for the selected grade.",
      };
    }
    return { active: true, message: "" };
  }, [
    wantsRmcContest,
    rmcSessionLoading,
    rmcSessionError,
    rmcContestAvailable,
    hasSelectedRegistrationClass,
    rmcSessions,
  ]);

  React.useEffect(() => {
    if (!SHOW_CONTEST_SECTION) return;

    if (!wantsRmcContest) {
      setRmcVenues([]);
      setRmcVenuesLoading(false);
      setFormField((prev) =>
        prev.rmc_venue_id || prev.rmc_venue_label
          ? { ...prev, rmc_venue_id: "", rmc_venue_label: "" }
          : prev,
      );
      return;
    }

    const cityName = String(formField.city ?? "").trim();
    if (!cityName) {
      setRmcVenues([]);
      setRmcVenuesLoading(false);
      setFormField((prev) =>
        prev.rmc_venue_id || prev.rmc_venue_label
          ? { ...prev, rmc_venue_id: "", rmc_venue_label: "" }
          : prev,
      );
      return;
    }

    let active = true;

    const fetchRmcVenues = async () => {
      setRmcVenuesLoading(true);
      try {
        const response = await getRMCVenues(cityName);
        if (!active) return;
        const venues = resolveSchools(response);
        setRmcVenues(venues);
        setFormField((prev) => {
          const previousVenueId = String(prev.rmc_venue_id ?? "");
          const previousVenueMatch = venues.find(
            (venue) => String(getVenueId(venue) ?? "") === previousVenueId,
          );
          if (previousVenueMatch) {
            return {
              ...prev,
              rmc_venue_label: String(getVenueLabel(previousVenueMatch)),
            };
          }
          const firstVenue = venues[0];
          const firstVenueIdRaw = getVenueId(firstVenue);
          if (
            firstVenueIdRaw === null ||
            firstVenueIdRaw === undefined ||
            firstVenueIdRaw === ""
          ) {
            return { ...prev, rmc_venue_id: "", rmc_venue_label: "" };
          }
          return {
            ...prev,
            rmc_venue_id: String(firstVenueIdRaw),
            rmc_venue_label: String(getVenueLabel(firstVenue)),
          };
        });
      } catch (err) {
        if (!active) return;
        setRmcVenues([]);
        setFormField((prev) => ({
          ...prev,
          rmc_venue_id: "",
          rmc_venue_label: "",
        }));
        toast.error(err?.message || "Unable to load RMC venues.");
      } finally {
        if (active) setRmcVenuesLoading(false);
      }
    };

    fetchRmcVenues();

    return () => {
      active = false;
    };
  }, [wantsRmcContest, formField.city]);

  React.useEffect(() => {
    if (!SHOW_CONTEST_SECTION) return;

    let active = true;

    const fetchPmcSessions = async () => {
      const dob = String(formField.dob ?? "").trim();
      if (!dob) {
        setPmcSessions([]);
        setPmcSessionError("");
        setPmcSessionLoading(false);
        return;
      }

      setPmcSessionLoading(true);
      setPmcSessionError("");
      try {
        const response = await getPMCActiveSession(dob);
        if (!active) return;
        const nextSessions = resolveSchools(response).filter((session) =>
          isSessionActive(session),
        );
        const responseMessage = String(response?.message ?? "").trim();
        const hasResponseError =
          response?.status === false || response?.status === "false";

        setPmcSessions(nextSessions);
        setPmcSessionError(
          hasResponseError
            ? responseMessage ||
                "No PMC session is available for the provided date of birth."
            : "",
        );
      } catch (err) {
        if (!active) return;
        setPmcSessions([]);
        setPmcSessionError(
          err?.message || "Unable to load PMC sessions right now.",
        );
      } finally {
        if (active) setPmcSessionLoading(false);
      }
    };

    fetchPmcSessions();

    return () => {
      active = false;
    };
  }, [formField.dob]);

  React.useEffect(() => {
    if (!SHOW_CONTEST_SECTION) return;

    setFormField((prev) =>
      prev.rmc_participation === wantsRmcContest
        ? prev
        : {
            ...prev,
            rmc_participation: wantsRmcContest,
          },
    );
  }, [wantsRmcContest]);

  React.useEffect(() => {
    if (!SHOW_CONTEST_SECTION) return;

    let active = true;

    const fetchRmcSessions = async () => {
      setRmcSessionLoading(true);
      setRmcSessionError("");
      try {
        const response = await getRMCActiveSession();
        if (!active) return;
        setRmcActiveSessions(
          resolveSchools(response).filter((session) =>
            isSessionActive(session),
          ),
        );
      } catch (err) {
        if (!active) return;
        setRmcActiveSessions([]);
        setRmcSessionError(
          err?.message || "Unable to load RMC sessions right now.",
        );
      } finally {
        if (active) setRmcSessionLoading(false);
      }
    };

    fetchRmcSessions();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const fetchSchools = async () => {
      setSchoolsLoading(true);
      try {
        const params = {};
        if (formField.province?.trim())
          params.province = formField.province.trim();
        if (formField.district?.trim())
          params.district = formField.district.trim();
        if (formField.tehsil?.trim()) params.tehsil = formField.tehsil.trim();
        if (formField.city?.trim()) params.city = formField.city.trim();
        if (formField.cluster_area?.trim()) {
          params.cluster_area = formField.cluster_area.trim();
        }

        const response = await getSchoolsAndData(params);
        const nextSchools = resolveSchools(response);
        const selectedSchoolId = String(formField.schoolId ?? "");
        const isPinnedSelection =
          Boolean(pinnedSchoolIdRef.current) &&
          selectedSchoolId &&
          String(pinnedSchoolIdRef.current) === selectedSchoolId;

        const existsInNextSchools = nextSchools.some(
          (school) =>
            String(getSchoolIdentifier(school)) === String(selectedSchoolId),
        );

        const shouldKeepPinnedSchool =
          isPinnedSelection &&
          !existsInNextSchools &&
          selectedSchoolSnapshot &&
          String(getSchoolIdentifier(selectedSchoolSnapshot)) ===
            selectedSchoolId;

        const mergedSchools = shouldKeepPinnedSchool
          ? [selectedSchoolSnapshot, ...nextSchools]
          : nextSchools;

        setSchools(mergedSchools);

        setFormField((prev) => {
          if (!prev.schoolId) return prev;
          if (prev.schoolId === "__other__") return prev;
          const exists = mergedSchools.some(
            (school) =>
              String(getSchoolIdentifier(school)) === String(prev.schoolId),
          );
          if (exists) return prev;
          if (isEditMode) return prev;
          const isPinned =
            Boolean(pinnedSchoolIdRef.current) &&
            String(pinnedSchoolIdRef.current) === String(prev.schoolId);
          if (isPinned) return prev;
          return { ...prev, schoolId: "", other_school_name: "" };
        });
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
    formField.schoolId,
    formField.province,
    formField.district,
    formField.tehsil,
    formField.city,
    formField.cluster_area,
    isEditMode,
    selectedSchoolSnapshot,
  ]);

  React.useEffect(() => {
    if (!SHOW_CONTEST_SECTION) return;

    if (!wantsPmcContest) {
      setFormField((prev) =>
        prev.pmc_session_id || prev.pmc_time_slot_id
          ? { ...prev, pmc_session_id: "", pmc_time_slot_id: "" }
          : prev,
      );
      return;
    }

    if (!pmcSessions.length) {
      setFormField((prev) =>
        prev.pmc_session_id || prev.pmc_time_slot_id
          ? { ...prev, pmc_session_id: "", pmc_time_slot_id: "" }
          : prev,
      );
      return;
    }

    setFormField((prev) => {
      const previousSessionId = String(prev.pmc_session_id ?? "");
      const preservedSession =
        pmcSessions.find(
          (session) => String(getSessionId(session)) === previousSessionId,
        ) || null;
      const nextSession = preservedSession || pmcSessions[0] || null;
      const nextSessionIdRaw = getSessionId(nextSession);
      const nextSessionId =
        nextSessionIdRaw === null ||
        nextSessionIdRaw === undefined ||
        nextSessionIdRaw === ""
          ? ""
          : String(nextSessionIdRaw);
      const nextSlots = getSessionTimeSlots(nextSession);
      const previousSlotId = String(prev.pmc_time_slot_id ?? "");
      const hasPreviousSlot = nextSlots.some(
        (slot) => String(getTimeSlotId(slot)) === previousSlotId,
      );
      const firstSlotIdRaw = getTimeSlotId(nextSlots[0]);
      const nextSlotId = hasPreviousSlot
        ? previousSlotId
        : firstSlotIdRaw === null ||
            firstSlotIdRaw === undefined ||
            firstSlotIdRaw === ""
          ? ""
          : String(firstSlotIdRaw);

      return {
        ...prev,
        pmc_session_id: nextSessionId,
        pmc_time_slot_id: nextSlotId,
      };
    });
  }, [wantsPmcContest, pmcSessions]);

  React.useEffect(() => {
    if (!SHOW_CONTEST_SECTION) return;

    if (!wantsRmcContest) {
      setFormField((prev) =>
        prev.rmc_session_id || prev.rmc_venue_id || prev.rmc_venue_label
          ? {
              ...prev,
              rmc_session_id: "",
              rmc_venue_id: "",
              rmc_venue_label: "",
            }
          : prev,
      );
      return;
    }

    if (!rmcSessions.length) {
      setFormField((prev) =>
        prev.rmc_session_id || prev.rmc_venue_id || prev.rmc_venue_label
          ? {
              ...prev,
              rmc_session_id: "",
              rmc_venue_id: "",
              rmc_venue_label: "",
            }
          : prev,
      );
      return;
    }

    setFormField((prev) => {
      const previousSessionId = String(prev.rmc_session_id ?? "");
      const hasPreviousSession = rmcSessions.some(
        (session) => String(getSessionId(session) ?? "") === previousSessionId,
      );
      if (hasPreviousSession) {
        return prev;
      }
      const firstSessionIdRaw = getSessionId(rmcSessions[0]);
      if (
        firstSessionIdRaw === null ||
        firstSessionIdRaw === undefined ||
        firstSessionIdRaw === ""
      ) {
        return {
          ...prev,
          rmc_session_id: "",
          rmc_venue_id: "",
          rmc_venue_label: "",
        };
      }
      return {
        ...prev,
        rmc_session_id: String(firstSessionIdRaw),
        rmc_venue_id: "",
        rmc_venue_label: "",
      };
    });
  }, [wantsRmcContest, rmcSessions]);

  React.useEffect(() => {
    const current = formField.profile_image;
    let objectUrl;

    if (!current) {
      setProfilePreview("");
    } else if (current instanceof File) {
      objectUrl = URL.createObjectURL(current);
      setProfilePreview(objectUrl);
    } else {
      setProfilePreview(
        typeof current === "string"
          ? `${import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? ""}${current}`
          : "",
      );
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [formField.profile_image]);

  React.useEffect(() => {
    if (whatsappManualOverrideRef.current) {
      return;
    }

    const normalizedStudentPhone = sanitizePhoneInput(formField.phone);
    const normalizedWhatsappPhone = sanitizePhoneInput(formField.father_phone);
    const shouldAutoCheck =
      Boolean(normalizedStudentPhone) &&
      normalizedStudentPhone === normalizedWhatsappPhone;

    setFormField((prev) =>
      prev.whatsapp_check === shouldAutoCheck
        ? prev
        : {
            ...prev,
            whatsapp_check: shouldAutoCheck,
          },
    );
  }, [formField.father_phone, formField.phone]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "schoolId") {
      setFormField((prev) => ({
        ...prev,
        schoolId: value,
      }));
      return;
    }
    if (name === "classId") {
      setFormField((prev) => ({
        ...prev,
        classId: normalizeGradeIdValue(value),
      }));
      return;
    }
    if (name === "pmc_session_id") {
      const nextSessionId = String(value ?? "");
      const nextSession =
        pmcSessions.find(
          (session) => String(getSessionId(session)) === nextSessionId,
        ) || null;
      const nextSlots = getSessionTimeSlots(nextSession);
      const firstSlotIdRaw = getTimeSlotId(nextSlots[0]);
      setFormField((prev) => ({
        ...prev,
        pmc_session_id: nextSessionId,
        pmc_time_slot_id:
          firstSlotIdRaw === null ||
          firstSlotIdRaw === undefined ||
          firstSlotIdRaw === ""
            ? ""
            : String(firstSlotIdRaw),
      }));
      return;
    }
    if (name === "rmc_session_id") {
      setFormField((prev) => ({
        ...prev,
        rmc_session_id: String(value ?? ""),
      }));
      return;
    }
    if (name === "rmc_venue_id") {
      const nextVenueId = String(value ?? "");
      const nextVenue =
        rmcVenueOptions.find(
          (option) => String(option.value) === nextVenueId,
        ) || null;
      setFormField((prev) => ({
        ...prev,
        rmc_venue_id: nextVenueId,
        rmc_venue_label: nextVenue?.label ?? prev.rmc_venue_label,
      }));
      return;
    }
    if (type === "checkbox" && name === "whatsapp_check") {
      whatsappManualOverrideRef.current = !checked;
      setFormField((prev) => ({
        ...prev,
        whatsapp_check: checked,
        father_phone: checked ? prev.phone : prev.father_phone,
      }));
      return;
    }
    if (type === "checkbox" && name === "join_pmc") {
      setFormField((prev) => ({ ...prev, join_pmc: checked }));
      return;
    }
    if (type === "checkbox" && name === "join_rmc") {
      setFormField((prev) => ({
        ...prev,
        join_rmc: checked,
        rmc_participation: checked,
      }));
      return;
    }
    if (name === "name") {
      const cleanedValue = value.replace(/[^A-Za-z\s]/g, "");
      setFormField((prev) => ({ ...prev, name: cleanedValue }));
      return;
    }
    if (name === "father_name") {
      const cleanedValue = value.replace(/[^A-Za-z\s]/g, "");
      setFormField((prev) => ({ ...prev, father_name: cleanedValue }));
      return;
    }
    if (name === "phone") {
      const normalizedPhone = sanitizePhoneInput(value);
      whatsappManualOverrideRef.current = false;
      setFormField((prev) => ({
        ...prev,
        phone: normalizedPhone,
        father_phone: prev.whatsapp_check ? normalizedPhone : prev.father_phone,
      }));
      return;
    }
    if (name === "father_phone") {
      const normalizedPhone = sanitizePhoneInput(value);
      whatsappManualOverrideRef.current = false;
      setFormField((prev) => ({ ...prev, father_phone: normalizedPhone }));
      return;
    }
    if (name === "father_cnic") {
      const numericValue = value.replace(/\D/g, "").slice(0, 13);
      setFormField((prev) => ({ ...prev, father_cnic: numericValue }));
      return;
    }
    if (name === "formb_id") {
      const numericValue = value.replace(/\D/g, "").slice(0, 13);
      setFormField((prev) => ({ ...prev, formb_id: numericValue }));
      return;
    }
    if (name === "dob") {
      setFormField((prev) => ({ ...prev, dob: value || "" }));
      return;
    }
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (value) => {
    setFormField((prev) => ({ ...prev, gender: value }));
  };

  const handleSchoolChange = async (nextValue) => {
    const syncRequestId = schoolSyncRequestRef.current + 1;
    schoolSyncRequestRef.current = syncRequestId;
    const isLatestSync = () => schoolSyncRequestRef.current === syncRequestId;

    const resolvedValue = nextValue || "";
    const isOtherSchool = resolvedValue === "__other__";
    const school =
      schools.find(
        (item) => String(getSchoolIdentifier(item)) === String(resolvedValue),
      ) || null;
    const isNamedOtherSchool =
      String(school?.name ?? school?.display_name ?? school?.label ?? "")
        .trim()
        .toLowerCase() === "other";
    const isOtherSchoolLike = isOtherSchool || isNamedOtherSchool;
    const selectedSchoolId = String(getSchoolIdentifier(school) ?? "").trim();
    if (
      school &&
      selectedSchoolId &&
      !isOtherSchoolLike &&
      resolvedValue &&
      resolvedValue !== "__other__"
    ) {
      pinnedSchoolIdRef.current = selectedSchoolId;
      setSelectedSchoolSnapshot(school);
    } else if (!resolvedValue || isOtherSchoolLike) {
      pinnedSchoolIdRef.current = "";
      setSelectedSchoolSnapshot(null);
    }

    const provinceName = resolveSchoolLocationName(school, "province");
    const districtName = resolveSchoolLocationName(school, "district");
    const tehsilName = resolveSchoolLocationName(school, "tehsil");
    const cityName = resolveSchoolLocationName(school, "city");
    const clusterName = school?.cluster_area ?? school?.clusterArea ?? "";
    const provinceRawId = resolveSchoolLocationId(school, "province");
    const districtRawId = resolveSchoolLocationId(school, "district");
    const tehsilRawId = resolveSchoolLocationId(school, "tehsil");
    const cityRawId = resolveSchoolLocationId(school, "city");

    setLocationAutoFilled(createLocationAutoFillState());

    setFormField((prev) => ({
      ...prev,
      schoolId: resolvedValue,
      school_name: school ? getSchoolLabel(school) : prev.school_name,
      other_school_name: isOtherSchoolLike ? prev.other_school_name : "",
      rmc_venue_id: "",
      rmc_venue_label: "",
      province: isOtherSchoolLike ? "" : String(provinceName || ""),
      district: isOtherSchoolLike ? "" : String(districtName || ""),
      tehsil: isOtherSchoolLike ? "" : String(tehsilName || ""),
      city: isOtherSchoolLike ? "" : String(cityName || ""),
      cluster_area: isOtherSchoolLike ? "" : String(clusterName || ""),
    }));

    if (isOtherSchoolLike) {
      setProvinceId("");
      setDistrictId("");
      setTehsilId("");
      setCityId("");
      setClusterId("");
      setDistrictOptions([]);
      setTehsilOptions([]);
      setCityOptions([]);
      setClusterOptions([]);
      return;
    }

    if (!isOtherSchoolLike) {
      setProvinceId("");
      setDistrictId("");
      setTehsilId("");
      setCityId("");
      setClusterId("");
      setDistrictOptions([]);
      setTehsilOptions([]);
      setCityOptions([]);
      setClusterOptions([]);
    }

    if (!school || !resolvedValue) return;

    const provinceMatch = findOptionByIdOrName(
      provinceOptions,
      provinceRawId,
      provinceName,
    );
    if (!provinceMatch) {
      setFormField((prev) => ({
        ...prev,
        province: "",
        district: "",
        tehsil: "",
        city: "",
        cluster_area: "",
      }));
      return;
    }

    if (!isLatestSync()) return;

    setProvinceId(provinceMatch.id);
    const nextAutoFilled = createLocationAutoFillState({ province: true });
    setFormField((prev) => ({
      ...prev,
      province: provinceMatch.name ?? "",
    }));

    try {
      const districtResponse = await getLocationDistricts(provinceMatch.id);
      if (!isLatestSync()) return;
      const nextDistrictOptions = normalizeLocationOptions(districtResponse);
      setDistrictOptions(nextDistrictOptions);

      let districtMatch = findOptionByIdOrName(
        nextDistrictOptions,
        districtRawId,
        districtName,
      );
      if (!districtMatch) {
        districtMatch =
          [tehsilName, cityName]
            .map((candidate) =>
              findOptionByIdOrName(nextDistrictOptions, "", candidate),
            )
            .find(Boolean) || null;
      }
      const nextDistrictId = districtMatch?.id ?? "";
      setDistrictId(nextDistrictId);

      if (!nextDistrictId) {
        setTehsilId("");
        setCityId("");
        setClusterId("");
        setTehsilOptions([]);
        setCityOptions([]);
        setClusterOptions([]);
        setLocationAutoFilled(nextAutoFilled);
        return;
      }
      nextAutoFilled.district = true;
      setFormField((prev) => ({
        ...prev,
        district: districtMatch?.name ?? prev.district,
      }));

      const tehsilResponse = await getLocationTehsils(nextDistrictId);
      if (!isLatestSync()) return;
      const nextTehsilOptions = normalizeLocationOptions(tehsilResponse);
      setTehsilOptions(nextTehsilOptions);

      let tehsilMatch = findOptionByIdOrName(
        nextTehsilOptions,
        tehsilRawId,
        tehsilName,
      );
      if (!tehsilMatch) {
        tehsilMatch = findOptionByIdOrName(nextTehsilOptions, "", cityName);
      }
      const nextTehsilId = tehsilMatch?.id ?? "";
      setTehsilId(nextTehsilId);

      if (!nextTehsilId) {
        setClusterId("");
        setClusterOptions([]);
        try {
          const districtCityResponse = await getLocationCities(nextDistrictId);
          if (!isLatestSync()) return;
          const districtCityOptions =
            normalizeLocationOptions(districtCityResponse);
          setCityOptions(districtCityOptions);
          const districtCityMatch = findOptionByIdOrName(
            districtCityOptions,
            cityRawId,
            cityName,
          );
          const districtCityId = districtCityMatch?.id ?? "";
          setCityId(districtCityId);

          if (!districtCityId) {
            setLocationAutoFilled(nextAutoFilled);
            return;
          }

          nextAutoFilled.city = true;
          setFormField((prev) => ({
            ...prev,
            city: districtCityMatch?.name ?? prev.city,
          }));

          const clusterResponse = await getLocationClusterAreas(districtCityId);
          if (!isLatestSync()) return;
          const nextClusterOptions = normalizeLocationOptions(clusterResponse);
          setClusterOptions(nextClusterOptions);
          const clusterMatch = findOptionByName(
            nextClusterOptions,
            clusterName,
          );
          setClusterId(clusterMatch?.id ?? "");
          setFormField((prev) => ({
            ...prev,
            cluster_area: clusterMatch?.name ?? prev.cluster_area,
          }));
        } catch {
          setCityId("");
          setClusterId("");
          setCityOptions([]);
          setClusterOptions([]);
        }
        setLocationAutoFilled(nextAutoFilled);
        return;
      }
      nextAutoFilled.tehsil = true;
      setFormField((prev) => ({
        ...prev,
        tehsil: tehsilMatch?.name ?? prev.tehsil,
      }));

      let cityResponse;
      try {
        cityResponse = await getLocationCitiesByTehsil(nextTehsilId);
      } catch {
        cityResponse = await getLocationCities(nextDistrictId);
      }
      if (!isLatestSync()) return;
      const nextCityOptions = normalizeLocationOptions(cityResponse);
      setCityOptions(nextCityOptions);

      let cityMatch = findOptionByIdOrName(
        nextCityOptions,
        cityRawId,
        cityName,
      );
      if (!cityMatch) {
        try {
          const districtCityResponse = await getLocationCities(nextDistrictId);
          if (!isLatestSync()) return;
          const districtCityOptions =
            normalizeLocationOptions(districtCityResponse);
          const districtCityMatch = findOptionByIdOrName(
            districtCityOptions,
            cityRawId,
            cityName,
          );
          if (districtCityMatch) {
            setCityOptions(districtCityOptions);
            cityMatch = districtCityMatch;
          }
        } catch {
          // Keep current city options if district fallback fails.
        }
      }
      const nextCityId = cityMatch?.id ?? "";
      setCityId(nextCityId);

      if (!nextCityId) {
        setClusterId("");
        setClusterOptions([]);
        setLocationAutoFilled(nextAutoFilled);
        return;
      }
      nextAutoFilled.city = true;
      setFormField((prev) => ({
        ...prev,
        city: cityMatch?.name ?? prev.city,
      }));

      const clusterResponse = await getLocationClusterAreas(nextCityId);
      if (!isLatestSync()) return;
      const nextClusterOptions = normalizeLocationOptions(clusterResponse);
      setClusterOptions(nextClusterOptions);

      const clusterMatch = findOptionByName(nextClusterOptions, clusterName);
      setClusterId(clusterMatch?.id ?? "");
      setFormField((prev) => ({
        ...prev,
        cluster_area: clusterMatch?.name ?? prev.cluster_area,
      }));
      setLocationAutoFilled(nextAutoFilled);
    } catch (err) {
      if (!isLatestSync()) return;
      setLocationAutoFilled(nextAutoFilled);
      toast.error(err?.message || "Unable to sync school location.");
    }
  };

  const handleProvinceChange = (nextProvinceId) => {
    schoolSyncRequestRef.current += 1;
    const selectedProvinceId = nextProvinceId || "";
    const selectedProvince = provinceOptions.find(
      (item) => item.id === selectedProvinceId,
    );

    setProvinceId(selectedProvinceId);
    setDistrictId("");
    setTehsilId("");
    setCityId("");
    setClusterId("");
    setDistrictOptions([]);
    setTehsilOptions([]);
    setCityOptions([]);
    setClusterOptions([]);
    setLocationAutoFilled(createLocationAutoFillState());

    setFormField((prev) => {
      const keepOtherSchool = prev.schoolId === "__other__";
      const keepSelectedSchool =
        Boolean(String(prev.schoolId ?? "").trim()) && !keepOtherSchool;
      return {
        ...prev,
        province: selectedProvince?.name ?? "",
        district: "",
        tehsil: "",
        city: "",
        cluster_area: "",
        rmc_venue_id: "",
        rmc_venue_label: "",
        schoolId: keepOtherSchool
          ? "__other__"
          : keepSelectedSchool
            ? prev.schoolId
            : "",
        other_school_name: keepOtherSchool ? prev.other_school_name : "",
      };
    });
  };

  const handleDistrictChange = (nextDistrictId) => {
    schoolSyncRequestRef.current += 1;
    const selectedDistrictId = nextDistrictId || "";
    const selectedDistrict = districtOptions.find(
      (item) => item.id === selectedDistrictId,
    );

    setDistrictId(selectedDistrictId);
    setTehsilId("");
    setCityId("");
    setClusterId("");
    setTehsilOptions([]);
    setCityOptions([]);
    setClusterOptions([]);
    setLocationAutoFilled(createLocationAutoFillState());

    setFormField((prev) => {
      const keepOtherSchool = prev.schoolId === "__other__";
      const keepSelectedSchool =
        Boolean(String(prev.schoolId ?? "").trim()) && !keepOtherSchool;
      return {
        ...prev,
        district: selectedDistrict?.name ?? "",
        tehsil: "",
        city: "",
        cluster_area: "",
        rmc_venue_id: "",
        rmc_venue_label: "",
        schoolId: keepOtherSchool
          ? "__other__"
          : keepSelectedSchool
            ? prev.schoolId
            : "",
        other_school_name: keepOtherSchool ? prev.other_school_name : "",
      };
    });
  };

  const handleTehsilChange = (nextTehsilId) => {
    schoolSyncRequestRef.current += 1;
    const selectedTehsilId = nextTehsilId || "";
    const selectedTehsil = tehsilOptions.find(
      (item) => item.id === selectedTehsilId,
    );

    setTehsilId(selectedTehsilId);
    setCityId("");
    setClusterId("");
    setCityOptions([]);
    setClusterOptions([]);
    setLocationAutoFilled(createLocationAutoFillState());

    setFormField((prev) => {
      const keepOtherSchool = prev.schoolId === "__other__";
      const keepSelectedSchool =
        Boolean(String(prev.schoolId ?? "").trim()) && !keepOtherSchool;
      return {
        ...prev,
        tehsil: selectedTehsil?.name ?? "",
        city: "",
        cluster_area: "",
        rmc_venue_id: "",
        rmc_venue_label: "",
        schoolId: keepOtherSchool
          ? "__other__"
          : keepSelectedSchool
            ? prev.schoolId
            : "",
        other_school_name: keepOtherSchool ? prev.other_school_name : "",
      };
    });
  };

  const handleCityChange = (nextCityId) => {
    schoolSyncRequestRef.current += 1;
    const selectedCityId = nextCityId || "";
    const selectedCity = cityOptions.find((item) => item.id === selectedCityId);

    setCityId(selectedCityId);
    setClusterId("");
    setClusterOptions([]);
    setLocationAutoFilled(createLocationAutoFillState());

    setFormField((prev) => {
      const keepOtherSchool = prev.schoolId === "__other__";
      const keepSelectedSchool =
        Boolean(String(prev.schoolId ?? "").trim()) && !keepOtherSchool;
      return {
        ...prev,
        city: selectedCity?.name ?? "",
        cluster_area: "",
        rmc_venue_id: "",
        rmc_venue_label: "",
        schoolId: keepOtherSchool
          ? "__other__"
          : keepSelectedSchool
            ? prev.schoolId
            : "",
        other_school_name: keepOtherSchool ? prev.other_school_name : "",
      };
    });
  };

  const _handleClusterChange = (nextClusterId) => {
    const selectedClusterId = nextClusterId || "";
    const selectedCluster = clusterOptions.find(
      (item) => item.id === selectedClusterId,
    );

    setClusterId(selectedClusterId);
    setFormField((prev) => {
      const keepOtherSchool =
        prev.schoolId === "__other__" ||
        Boolean(String(prev.other_school_name ?? "").trim()) ||
        String(prev.school_name ?? "")
          .trim()
          .toLowerCase() === "other";
      return {
        ...prev,
        cluster_area: selectedCluster?.name ?? "",
        schoolId: keepOtherSchool ? "__other__" : "",
        other_school_name: keepOtherSchool ? prev.other_school_name : "",
      };
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isStudentProfileReadOnly) {
      const message = "Profile editing is disabled for your account.";
      setError(message);
      toast.error(message);
      return;
    }

    if (SHOW_CONTEST_SECTION && sessionLoading) {
      const message = "Please wait while we verify active sessions.";
      setError(message);
      toast.error(message);
      return;
    }

    if (SHOW_CONTEST_SECTION && wantsPmcContest && !pmcSessionStatus.active) {
      const message = pmcSessionStatus.message || "PMC session is not active.";
      setError(message);
      toast.error(message);
      return;
    }

    if (SHOW_CONTEST_SECTION && wantsRmcContest && !rmcSessionStatus.active) {
      const message = rmcSessionStatus.message || "RMC session is not active.";
      setError(message);
      toast.error(message);
      return;
    }

    // ── Required fields (aligned with Signup): name + username ─────────────
    // On create: also password + confirm_password
    const requiredFields = ["name", "username"];
    if (!isEditMode) {
      requiredFields.push("password", "confirm_password");
    }

    if (SHOW_CONTEST_SECTION && wantsPmcContest) {
      requiredFields.push("pmc_session_id");
      if (selectedPmcTimeSlotOptions.length > 0) {
        requiredFields.push("pmc_time_slot_id");
      }
    }
    if (SHOW_CONTEST_SECTION && wantsRmcContest) {
      requiredFields.push("rmc_session_id");
      requiredFields.push("rmc_venue_id");
    }

    const missingRequiredFields = requiredFields.filter((field) => {
      return !String(formField[field] ?? "").trim();
    });

    const hasEmpty = missingRequiredFields.length > 0;
    const firstMissingField = missingRequiredFields[0];

    if (hasEmpty) {
      const message = "Please fill in all required fields.";
      setError(message);
      toast.error(message);
      focusField(firstMissingField);
      return;
    }

    // ── formb_id, if provided, must be exactly 13 digits ──────────────────────
    const normalizedFormBId = String(formField.formb_id ?? "")
      .replace(/\D/g, "")
      .slice(0, 13);

    if (normalizedFormBId && normalizedFormBId.length !== 13) {
      const message = "Form-B ID must be exactly 13 digits.";
      setError(message);
      toast.error(message);
      focusField("formb_id");
      return;
    }

    // ── username availability ────────────────────────────────────────────────
    const usernameText = String(formField.username ?? "").trim();
    const isSameAsInitialUsername =
      isEditMode &&
      initialUsername &&
      usernameText.toLowerCase() === initialUsername.toLowerCase();

    if (!isIdentityLocked && !isSameAsInitialUsername) {
      if (usernameAvailability.status === "checking") {
        const message = "Checking username availability. Please wait.";
        setError(message);
        toast.error(message);
        focusField("username");
        return;
      }
      if (usernameAvailability.status === "unavailable") {
        const message = "Username is already taken.";
        setError(message);
        toast.error(message);
        focusField("username");
        return;
      }
      if (usernameAvailability.status === "error") {
        const message = "Unable to verify username availability.";
        setError(message);
        toast.error(message);
        focusField("username");
        return;
      }
      if (
        usernameText.length >= 3 &&
        usernameAvailability.status !== "available"
      ) {
        const message = "Please wait for username availability check.";
        setError(message);
        toast.error(message);
        focusField("username");
        return;
      }
    }

    // ── password (required on create; optional on edit) ──────────────────────
    const passwordText = formField.password.trim();
    const confirmPasswordText = formField.confirm_password.trim();
    if (!isEditMode || passwordText || confirmPasswordText) {
      if (!passwordText || !confirmPasswordText) {
        const message = "Password and confirm password are required.";
        setError(message);
        toast.error(message);
        focusField(!passwordText ? "password" : "confirm_password");
        return;
      }
      if (passwordText !== confirmPasswordText) {
        const message = "Password and confirm password do not match.";
        setError(message);
        toast.error(message);
        focusField("confirm_password");
        return;
      }
    }

    // ── optional field validations (only when filled) ────────────────────────

    const normalizedStudentPhone = sanitizePhoneInput(formField.phone);
    const normalizedFatherPhone = sanitizePhoneInput(formField.father_phone);
    const normalizedEmail = String(formField.email ?? "")
      .trim()
      .toLowerCase();

    if (normalizedStudentPhone && !PHONE_REGEX.test(normalizedStudentPhone)) {
      const message = "Phone number must be in +92XXXXXXXXXX format.";
      setError(message);
      toast.error(message);
      focusField("phone");
      return;
    }

    if (normalizedFatherPhone && !PHONE_REGEX.test(normalizedFatherPhone)) {
      const message = "Father phone number must be in +92XXXXXXXXXX format.";
      setError(message);
      toast.error(message);
      focusField("father_phone");
      return;
    }

    if (
      formField.father_cnic &&
      formField.father_cnic.replace(/\D/g, "").length > 0 &&
      formField.father_cnic.replace(/\D/g, "").length !== 13
    ) {
      const message = "Father CNIC must be exactly 13 digits.";
      setError(message);
      toast.error(message);
      focusField("father_cnic");
      return;
    }

    if (formField.dob && !isDobWithinAllowedRange(formField.dob)) {
      const message = `Date of birth must be between ${DOB_MIN_DATE} and ${DOB_MAX_DATE}.`;
      setError(message);
      toast.error(message);
      focusField("dob");
      return;
    }

    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      const message = "Please provide a valid email address.";
      setError(message);
      toast.error(message);
      focusField("email");
      return;
    }

    // ── optional email availability check ────────────────────────────────────
    const isSameAsInitialEmail =
      isEditMode &&
      initialEmail &&
      normalizedEmail === initialEmail.toLowerCase();
    if (
      normalizedEmail &&
      !isIdentityLocked &&
      !isSameAsInitialEmail &&
      EMAIL_REGEX.test(normalizedEmail)
    ) {
      if (emailAvailability.status === "checking") {
        const message = "Checking email availability. Please wait.";
        setError(message);
        toast.error(message);
        return;
      }
      if (emailAvailability.status === "unavailable") {
        const message = "Email is already taken.";
        setError(message);
        toast.error(message);
        return;
      }
      if (emailAvailability.status === "error") {
        const message = "Unable to verify email availability.";
        setError(message);
        toast.error(message);
        return;
      }
      if (emailAvailability.status !== "available") {
        const message = "Please wait for email availability check.";
        setError(message);
        toast.error(message);
        return;
      }
    }

    // ── build payload ────────────────────────────────────────────────────────
    const payload = new FormData();
    payload.append("source", source);
    payload.append("name", formField.name.trim());
    if (normalizedFormBId) {
      payload.append("formb_id", normalizedFormBId);
    }
    // Mirror username/password (no confirm_ fields sent to API)
    payload.append("username", usernameText);
    payload.append("username_confirmation", usernameText);
    if (passwordText) {
      payload.append("password", passwordText);
      payload.append("password_confirmation", confirmPasswordText);
      payload.append("confirm_password", confirmPasswordText);
    }

    // Optional fields — only appended when they have a value
    if (formField.email.trim()) {
      payload.append("email", formField.email.trim());
    }
    if (normalizedStudentPhone) {
      payload.append("phone", normalizedStudentPhone);
      payload.append("student_phone", normalizedStudentPhone);
    }
    if (normalizedFatherPhone) {
      payload.append("father_phone", normalizedFatherPhone);
    }
    if (formField.dob) {
      payload.append("dob", formField.dob);
    }
    if (formField.gender) {
      payload.append("gender", formField.gender);
    }
    if (formField.address.trim()) {
      payload.append("address", formField.address.trim());
    }
    if (formField.father_name.trim()) {
      payload.append("father_name", formField.father_name.trim());
    }
    if (formField.father_cnic.trim()) {
      payload.append("father_cnic", formField.father_cnic.trim());
    }
    if (formField.schoolId) {
      payload.append("school_id", formField.schoolId);
    }
    if (normalizeGradeIdValue(formField.classId)) {
      payload.append("grade_id", normalizeGradeIdValue(formField.classId));
    }
    if (formField.province.trim()) {
      payload.append("province", formField.province.trim());
    }
    if (formField.district.trim()) {
      payload.append("district", formField.district.trim());
    }
    if (formField.tehsil.trim()) {
      payload.append("tehsil", formField.tehsil.trim());
    }
    if (formField.city.trim()) {
      payload.append("city", formField.city.trim());
    }
    if (formField.cluster_area.trim()) {
      payload.append("cluster_area", formField.cluster_area.trim());
    }
    if (isOtherSchoolMode && formField.other_school_name.trim()) {
      payload.append("other_school_name", formField.other_school_name.trim());
    }
    if (formField.profile_image instanceof File) {
      payload.append("profile_image", formField.profile_image);
    }

    if (shouldSubmitPmcDetails && formField.pmc_session_id) {
      payload.append("pmc_session_id", formField.pmc_session_id);
      if (formField.pmc_time_slot_id) {
        payload.append("pmc_time_slot_id", formField.pmc_time_slot_id);
        payload.append("time_slot_id", formField.pmc_time_slot_id);
      }
    }

    if (shouldSubmitRmcDetails && formField.rmc_session_id) {
      payload.append("rmc_session_id", formField.rmc_session_id);
    }
    if (shouldSubmitRmcDetails && formField.rmc_venue_id) {
      payload.append("rmc_venue_id", formField.rmc_venue_id);
    }

    payload.append(
      "rmc_participation",
      parseBooleanFlag(formField.rmc_participation) ? "1" : "0",
    );

    try {
      setLoading(true);
      if (isEditMode) {
        const res = profileMode
          ? await updateStudentPortalProfileById(studentId, payload)
          : await updateCentralizedStudentById(studentId, payload);
        toast.success(
          res?.message ||
            (profileMode
              ? "Profile updated successfully."
              : "Student updated successfully."),
        );
        if (profileMode) {
          await checkAuth();
          setForceFetchKey((prev) => prev + 1);
        }
      } else {
        const res = await addCentralizedStudent(payload);
        toast.success(res?.message || "Student added successfully.");
      }
      setError("");
      if (profileMode) {
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      } else {
        navigate(`${basePath}/centralized-student-lists`);
      }
    } catch (err) {
      const msg =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "create"} student record.`;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled =
    loading ||
    (SHOW_CONTEST_SECTION && sessionLoading) ||
    isStudentProfileReadOnly;

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          {/* <Link
            className="flex gap-2 items-center pb-4 text-[#939393] text-md bg-white"
            to={"/student/dashboard"}
          >
            <ChevronLeft size={16} /> Back to dashboard
          </Link> */}
          <h4>{dashboardTitle}</h4>
          <h1>{resolvedPageTitle}</h1>
        </div>
      </div>
      <div className="dashboard-body dashboard-body-card">
        <form ref={formRef} onSubmit={handleSubmit}>
          {error && (
            <Alert
              variant="destructive"
              className="alert-custom mb-4 bg-[#FDF7EC]"
            >
              <AlertCircleIcon size={18} />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}
          {profileMode && !isEditable && onCreateEditRequest && (
            <Alert className="alert-custom mb-4 bg-[#F5F7FA] !border-none">
              <Lock size={18} />
              <div className="flex-1">
                <AlertTitle>
                  {editRequestStatus?.toLowerCase() === "pending"
                    ? "Your edit request is in process. Please wait for approval."
                    : editRequestStatus?.toLowerCase() === "rejected"
                      ? "Your edit request was rejected. You can submit a new request."
                      : "Profile editing is locked. Generate a request to update."}
                </AlertTitle>
                {editRequestStatus?.toLowerCase() !== "pending" && (
                  <button
                    type="button"
                    className="mt-3 global-btn flex items-center justify-center gap-2 w-fit"
                    onClick={onCreateEditRequest}
                    disabled={isCreatingRequest}
                  >
                    {isCreatingRequest ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Generate Edit Request"
                    )}
                  </button>
                )}
              </div>
            </Alert>
          )}
          {wantsPmcContest &&
          pmcSessionStatus.message &&
          pmcSessionStatus.message !== pmcSessionError ? (
            <Alert
              variant="destructive"
              className="alert-custom mb-4 bg-[#FDF7EC]"
            >
              <AlertCircleIcon size={18} />
              <AlertTitle>{pmcSessionStatus.message}</AlertTitle>
            </Alert>
          ) : null}
          {wantsRmcContest && rmcSessionStatus.message && (
            <Alert
              variant="destructive"
              className="alert-custom mb-4 bg-[#FDF7EC]"
            >
              <AlertCircleIcon size={18} />
              <AlertTitle>{rmcSessionStatus.message}</AlertTitle>
            </Alert>
          )}
          {fetching ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          ) : (
            <>
              <div className="form-admin form-creation !pt-0">
                {/* ── Basic Information ──────────────────────────────────── */}
                <div className="form-group w-full">
                  <h2 className="form-heading">
                    <span>
                      <User />
                    </span>{" "}
                    Basic Information
                  </h2>
                </div>

                {/* Full Name — REQUIRED */}
                <div className="form-group w-half">
                  <label>
                    <User size={16} /> Full Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    value={formField.name}
                    onChange={handleChange}
                    disabled={isFormDisabled}
                    placeholder="Enter full student name"
                  />
                </div>

                {/* Student Photo — optional */}
                <div className="form-group w-half">
                  <label>
                    <FileImage size={16} /> Student Photo{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <input
                    type="file"
                    className="form-input"
                    name="profile_image"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    disabled={isFormDisabled}
                  />
                  {profilePreview ? (
                    <div className="show-img mt-2">
                      <img
                        src={profilePreview}
                        alt="Profile preview"
                        className="h-20 w-20 rounded-md object-cover"
                      />
                    </div>
                  ) : null}
                </div>

                {/* Username — REQUIRED */}
                <div className="form-group w-half">
                  <label>
                    <User size={16} /> Username<span>*</span>
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    className="form-input"
                    value={formField.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    disabled={isFormDisabled || isIdentityLocked}
                  />
                  {usernameAvailability.message ? (
                    <p
                      className={`mt-1 text-xs ${
                        usernameAvailability.status === "available"
                          ? "text-green-600"
                          : usernameAvailability.status === "checking"
                            ? "text-gray-500"
                            : "text-red-500"
                      }`}
                    >
                      {usernameAvailability.message}
                    </p>
                  ) : null}
                  <div className="reg-hint mt-1 text-[12px] text-gray-500">
                    This will be used as your login username.
                  </div>
                </div>

                {/* Smart Card ID / Form B — optional */}
                <div className="form-group w-half">
                  <label>
                    <IdCard size={16} /> Smart Card ID / Form B{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
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
                    pattern="[0-9]{13}"
                    disabled={isFormDisabled}
                  />
                </div>

                {/* Email — optional */}
                <div className="form-group w-half">
                  <label>
                    <Mail size={16} /> Email{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    name="email"
                    value={formField.email}
                    onChange={handleChange}
                    disabled={isFormDisabled || isIdentityLocked}
                    placeholder="example@student.com"
                  />
                  {emailAvailability.message ? (
                    <p
                      className={`mt-1 text-xs ${
                        emailAvailability.status === "available"
                          ? "text-green-600"
                          : emailAvailability.status === "checking"
                            ? "text-gray-500"
                            : "text-red-500"
                      }`}
                    >
                      {emailAvailability.message}
                    </p>
                  ) : null}
                </div>

                {/* Password — REQUIRED on create, optional on edit */}
                <div className="form-group w-half">
                  <label>
                    <Lock size={16} /> Password
                    {isEditMode ? (
                      // <small className="text-gray-500 font-light">
                      //   {" "}
                      //   (optional)
                      // </small>
                      ""
                    ) : (
                      <span>*</span>
                    )}
                  </label>
                  <input
                    type={passwordType}
                    className="form-input"
                    name="password"
                    value={formField.password}
                    onChange={handleChange}
                    disabled={isFormDisabled}
                    placeholder="*****"
                  />
                  <button
                    type="button"
                    className="text-slate-400 cursor-pointer password-eye"
                    onClick={handleShowPasswordToggle}
                    disabled={isFormDisabled}
                  >
                    {passwordType === "password" ? (
                      <EyeClosed size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                {/* Confirm Password — REQUIRED on create, optional on edit */}
                <div className="form-group w-half">
                  <label>
                    <Lock size={16} /> Confirm Password
                    {isEditMode ? (
                      // <small className="text-gray-500 font-light">
                      //   {" "}
                      //   (optional)
                      // </small>
                      ""
                    ) : (
                      <span>*</span>
                    )}
                  </label>
                  <input
                    type={passwordType}
                    className="form-input"
                    name="confirm_password"
                    value={formField.confirm_password}
                    onChange={handleChange}
                    disabled={isFormDisabled}
                    placeholder="*****"
                  />
                  <button
                    type="button"
                    className="text-slate-400 cursor-pointer password-eye"
                    onClick={handleShowPasswordToggle}
                    disabled={isFormDisabled}
                  >
                    {passwordType === "password" ? (
                      <EyeClosed size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                {/* Date of Birth — optional */}
                <div className="form-group w-half">
                  <label>
                    <Calendar size={16} /> Date of Birth{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    name="dob"
                    value={formField.dob}
                    min={DOB_MIN_DATE}
                    max={DOB_MAX_DATE}
                    onChange={handleChange}
                    disabled={isFormDisabled}
                  />
                </div>

                {/* Grade — optional */}
                <div className="form-group w-half">
                  <label>
                    <Book size={16} /> Grade{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <select
                    className="form-input"
                    name="classId"
                    value={formField.classId}
                    onChange={handleChange}
                    disabled={
                      isFormDisabled || gradesLoading || !classOptions.length
                    }
                  >
                    <option value="">
                      {gradesLoading
                        ? "Loading grades..."
                        : classOptions.length
                          ? "-- Select Grade --"
                          : "No grades available"}
                    </option>
                    {classOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gender — optional */}
                <div className="form-group w-half">
                  <label>
                    <Mars size={16} /> Gender{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <RadioGroup
                    value={formField.gender}
                    onValueChange={handleGenderChange}
                    className="flex gap-4 mt-3 mb-5 cursor-pointer"
                    disabled={isFormDisabled}
                  >
                    <div className="flex items-center space-x-2 radio-wrap grow cursor-pointer">
                      <RadioGroupItem
                        value="male"
                        id="teacher-gender-male"
                        className="radio-input-custom cursor-pointer"
                      />
                      <Label
                        htmlFor="teacher-gender-male"
                        className="radio-label-custom !w-full"
                      >
                        Male
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 radio-wrap grow cursor-pointer">
                      <RadioGroupItem
                        value="female"
                        id="teacher-gender-female"
                        className="radio-input-custom cursor-pointer"
                      />
                      <Label
                        htmlFor="teacher-gender-female"
                        className="radio-label-custom !w-full"
                      >
                        Female
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Address — optional */}
                <div className="form-group w-half">
                  <label>
                    <MapPinCheck size={16} /> Address{" "}
                    <small className="text-gray-500 font-light">
                      (optional)
                    </small>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="address"
                    value={formField.address}
                    onChange={handleChange}
                    disabled={isFormDisabled}
                    placeholder="Enter your complete home address"
                  />
                </div>

                {/* ── School Information ─────────────────────────────────── */}
                <div className="form-group w-full">
                  <h2 className="form-heading">
                    <span>
                      <School />
                    </span>{" "}
                    School Information
                  </h2>
                </div>

                {/* School — optional */}
                <div className="form-group w-half">
                  <label>
                    <School size={16} /> School{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <SearchableMultiSelect
                    options={schoolOptions}
                    multiple={false}
                    value={formField.schoolId}
                    onChange={handleSchoolChange}
                    placeholder="Search schools..."
                    loading={schoolsLoading}
                    disabled={isFormDisabled || schoolsLoading}
                    emptyState="No schools found"
                  />
                  <p className="text-gray-600 text-[10px] font-medium mt-1">
                    Cluster / Area:{" "}
                    <span className="text-black">
                      {selectedSchoolClusterLabel}
                    </span>
                  </p>

                  {showReadOnlySchoolLocation && (
                    <div className="mt-1 space-y-1">
                      {selectedSchoolLocationLines.map((item) => (
                        <p
                          key={item.label}
                          className="text-gray-600 text-[10px] font-medium"
                        >
                          {item.label}:{" "}
                          <span className="text-black">
                            {item.value || "Not specified"}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {isOtherSchoolMode && (
                  <div className="form-group w-half">
                    <label>
                      <School size={16} /> Other School Name{" "}
                      <small className="text-gray-500 font-light">
                        (optional)
                      </small>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      name="other_school_name"
                      value={formField.other_school_name}
                      onChange={handleChange}
                      disabled={isFormDisabled}
                    />
                  </div>
                )}

                {isOtherSchoolMode && (
                  <div className="form-group w-half">
                    <label>
                      <MapIcon size={18} /> Province{" "}
                      <small className="text-gray-500 font-light">
                        (optional)
                      </small>
                    </label>
                    <SearchableMultiSelect
                      options={provinceOptions}
                      value={provinceId}
                      multiple={false}
                      onChange={handleProvinceChange}
                      placeholder="Search province..."
                      disabled={
                        isFormDisabled ||
                        provinceLoading ||
                        (locationAutoFilled.province && Boolean(provinceId))
                      }
                      loading={provinceLoading}
                      emptyState="No province found"
                      valueKey="id"
                      labelKey="name"
                    />
                  </div>
                )}

                {isOtherSchoolMode && (
                  <div className="form-group w-half">
                    <label>
                      <MapPin size={18} /> District{" "}
                      <small className="text-gray-500 font-light">
                        (optional)
                      </small>
                    </label>
                    <SearchableMultiSelect
                      options={districtOptions}
                      value={districtId}
                      multiple={false}
                      onChange={handleDistrictChange}
                      placeholder="Search district..."
                      disabled={
                        isFormDisabled ||
                        !provinceId ||
                        districtLoading ||
                        (locationAutoFilled.district && Boolean(districtId))
                      }
                      loading={districtLoading}
                      emptyState={
                        provinceId
                          ? "No district found"
                          : "Select province first"
                      }
                      valueKey="id"
                      labelKey="name"
                    />
                  </div>
                )}

                {isOtherSchoolMode && (
                  <div className="form-group w-half">
                    <label>
                      <MapPin size={18} /> Tehsil{" "}
                      <small className="text-gray-500 font-light">
                        (optional)
                      </small>
                    </label>
                    <SearchableMultiSelect
                      options={tehsilOptions}
                      value={tehsilId}
                      multiple={false}
                      onChange={handleTehsilChange}
                      placeholder="Search tehsil..."
                      disabled={
                        isFormDisabled ||
                        !districtId ||
                        tehsilLoading ||
                        (locationAutoFilled.tehsil && Boolean(tehsilId))
                      }
                      loading={tehsilLoading}
                      emptyState={
                        districtId ? "No tehsil found" : "Select district first"
                      }
                      valueKey="id"
                      labelKey="name"
                    />
                  </div>
                )}

                {isOtherSchoolMode && (
                  <div className="form-group w-half">
                    <label>
                      <MapPin size={18} /> City{" "}
                      <small className="text-gray-500 font-light">
                        (optional)
                      </small>
                    </label>
                    <SearchableMultiSelect
                      options={cityOptions}
                      value={cityId}
                      multiple={false}
                      onChange={handleCityChange}
                      placeholder="Search city..."
                      disabled={
                        isFormDisabled ||
                        !tehsilId ||
                        cityLoading ||
                        (locationAutoFilled.city && Boolean(cityId))
                      }
                      loading={cityLoading}
                      emptyState={
                        tehsilId ? "No city found" : "Select tehsil first"
                      }
                      valueKey="id"
                      labelKey="name"
                    />
                  </div>
                )}

                {/* ── Parent / Guardian Information ──────────────────────── */}
                <div className="form-group w-full">
                  <h2 className="form-heading">
                    <span>
                      <User />
                    </span>{" "}
                    Parent / Guardian Information
                  </h2>
                </div>

                {/* Father Full Name — optional */}
                <div className="form-group w-half">
                  <label>
                    <User size={16} /> Full Name{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="father_name"
                    value={formField.father_name}
                    onChange={handleChange}
                    disabled={isFormDisabled}
                    placeholder="Full Name"
                  />
                </div>

                {/* Father CNIC — optional */}
                <div className="form-group w-half">
                  <label>
                    <IdCard size={16} /> CNIC{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <input
                    id="father_cnic"
                    name="father_cnic"
                    type="text"
                    className="form-input"
                    value={formField.father_cnic}
                    onChange={handleChange}
                    placeholder="XXXXX-XXXXXXXX-X"
                    maxLength="13"
                    inputMode="numeric"
                    pattern="[0-9]{13}"
                    disabled={isFormDisabled}
                  />
                </div>

                {/* Student Phone — optional */}
                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Phone{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="+92 XXX XXXXXXX"
                    value={formField.phone}
                    onChange={handleChange}
                    disabled={isFormDisabled}
                  />
                </div>

                {/* WhatsApp (Father Phone) — optional */}
                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> WhatsApp{" "}
                    {/* <small className="text-gray-500 font-light">
                      (optional)
                    </small> */}
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="father_phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="+92 XXX XXXXXXX"
                    value={formField.father_phone}
                    onChange={handleChange}
                    disabled={isFormDisabled || formField.whatsapp_check}
                  />
                  <div className="from-group w-full flex">
                    <input
                      id="whatsapp_check"
                      type="checkbox"
                      name="whatsapp_check"
                      checked={formField.whatsapp_check}
                      onChange={handleChange}
                      disabled={isFormDisabled}
                    />
                    <label htmlFor="whatsapp_check" className="pl-2">
                      Same as phone number
                    </label>
                  </div>
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
                {!(profileMode && !isEditable) && (
                  <button
                    type="submit"
                    className="global-btn flex items-center justify-center gap-1"
                    disabled={submitDisabled}
                  >
                    {loading || (SHOW_CONTEST_SECTION && sessionLoading) ? (
                      <>
                        {SHOW_CONTEST_SECTION && sessionLoading
                          ? "Checking session"
                          : "Please wait"}
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        {profileMode
                          ? "Update Profile"
                          : isEditMode
                            ? "Update Student"
                            : "Add Student"}
                        <Save size={18} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
};

export default CentralizedStudentForm;
