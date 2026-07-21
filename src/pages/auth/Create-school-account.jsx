import React from "react";
import {
  AlertCircleIcon,
  Check,
  Eye,
  EyeClosed,
  FileImage,
  Loader2,
  Lock,
  LogInIcon,
  Mail,
  Map,
  MapPin,
  MapPinCheck,
  Phone,
  School,
  User,
  IdCardLanyard,
  ChevronLeft,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import loginBanner from "@/assets/signin-image.png";
import createdBanner from "@/assets/created.png";
import { Alert, AlertTitle } from "@/components/ui/alert";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import {
  checkEmail,
  checkUsername,
  createSchoolAccountApi,
  getLocationCities,
  getLocationCitiesByTehsil,
  getLocationClusterAreas,
  getLocationDistricts,
  getLocationProvinces,
  getLocationTehsils,
} from "@/api/authApi";

const PHONE_REGEX = /^\+92\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_CHECK_DEBOUNCE_MS = 500;

const DEFAULT_FORM = {
  school_name: "",
  email: "",
  username: "",
  password: "",
  confirm_password: "",
  province: "",
  district: "",
  tehsil: "",
  city: "",
  cluster_area: "",
  address: "",
  principal_name: "",
  principal_phone: "",
  focal_person_name: "",
  focal_person_phone: "",
  rmc_member: false,
  agree: false,
  profile_image: "",
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
  option?.provinceId ??
  option?.districtId ??
  option?.tehsilId ??
  option?.cityId ??
  option?.clusterAreaId ??
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
  (fallback ? String(fallback) : "");

const normalizeLocationOptions = (payload) =>
  resolveCollection(payload)
    .map((option) => {
      const id = resolveOptionId(option);
      if (id === null || id === undefined || id === "") return null;
      const name = resolveOptionName(option, id);
      return {
        id: String(id),
        name: String(name),
      };
    })
    .filter(Boolean);

const sanitizePhoneInput = (inputValue = "") => {
  const digitsOnly = String(inputValue ?? "").replace(/\D/g, "");
  if (!digitsOnly) return "";

  let normalizedDigits = digitsOnly;
  if (normalizedDigits.startsWith("0")) {
    normalizedDigits = `92${normalizedDigits.slice(1)}`;
  } else if (!normalizedDigits.startsWith("92")) {
    normalizedDigits = `92${normalizedDigits}`;
  }

  normalizedDigits = normalizedDigits.slice(0, 12);
  return `+${normalizedDigits}`;
};

const formatPhoneMaskedInput = (inputValue = "") => {
  const normalizedPhone = sanitizePhoneInput(inputValue);
  if (!normalizedPhone) return "";

  const localNumber = normalizedPhone.slice(3);
  const firstPart = localNumber.slice(0, 3);
  const secondPart = localNumber.slice(3, 10);

  if (!firstPart) return "+92";
  if (!secondPart) return `+92-${firstPart}`;
  return `+92-${firstPart}-${secondPart}`;
};

const CreateAccountSchool = () => {
  const [formField, setFormField] = React.useState(DEFAULT_FORM);
  const [passwordType, setPasswordType] = React.useState("password");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [accountCreated, setAccountCreated] = React.useState(false);
  const [createdMessage, setCreatedMessage] = React.useState("");
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

  const [provinceOptions, setProvinceOptions] = React.useState([]);
  const [districtOptions, setDistrictOptions] = React.useState([]);
  const [tehsilOptions, setTehsilOptions] = React.useState([]);
  const [cityOptions, setCityOptions] = React.useState([]);
  const [clusterOptions, setClusterOptions] = React.useState([]);

  const [provinceId, setProvinceId] = React.useState("");
  const [districtId, setDistrictId] = React.useState("");
  const [tehsilId, setTehsilId] = React.useState("");
  const [cityId, setCityId] = React.useState("");
  const [clusterId, setClusterId] = React.useState("");

  const [provinceLoading, setProvinceLoading] = React.useState(false);
  const [districtLoading, setDistrictLoading] = React.useState(false);
  const [tehsilLoading, setTehsilLoading] = React.useState(false);
  const [cityLoading, setCityLoading] = React.useState(false);
  const [clusterLoading, setClusterLoading] = React.useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password",
    );
  };

  const focusField = (field) => {
    if (!field) return;
    requestAnimationFrame(() => {
      const element =
        document.getElementById(field) ||
        document.querySelector(`[name="${field}"]`);
      if (element?.focus) {
        element.focus();
        if (element.select) element.select();
      }
    });
  };

  React.useEffect(() => {
    const username = String(formField.username ?? "").trim();

    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
      usernameCheckTimeoutRef.current = null;
    }

    if (!username) {
      setUsernameAvailability({ status: "idle", message: "" });
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
  }, [formField.username]);

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
  }, [formField.email]);

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
          // Fallback for servers that still filter cities by district only.
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
    const fetchClusterAreas = async () => {
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

    fetchClusterAreas();
    return () => {
      active = false;
    };
  }, [cityId]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === "principal_name" || name === "focal_person_name") {
      const cleanedValue = value.replace(/[^A-Za-z\s]/g, "");
      setFormField((prev) => ({ ...prev, [name]: cleanedValue }));
      return;
    }

    if (name === "principal_phone" || name === "focal_person_phone") {
      setFormField((prev) => ({
        ...prev,
        [name]: formatPhoneMaskedInput(value),
      }));
      return;
    }

    if (type === "checkbox" && (name === "agree" || name === "rmc_member")) {
      setFormField((prev) => ({
        ...prev,
        agree: checked,
        rmc_member: checked,
      }));
      return;
    }

    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFormField((prev) => ({ ...prev, profile_image: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      event.target.value = "";
      return;
    }
    setFormField((prev) => ({ ...prev, profile_image: file }));
  };

  const handleProvinceChange = (nextProvinceId) => {
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

    setFormField((prev) => ({
      ...prev,
      province: selectedProvince?.name ?? "",
      district: "",
      tehsil: "",
      city: "",
      cluster_area: "",
    }));
  };

  const handleDistrictChange = (nextDistrictId) => {
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

    setFormField((prev) => ({
      ...prev,
      district: selectedDistrict?.name ?? "",
      tehsil: "",
      city: "",
      cluster_area: "",
    }));
  };

  const handleTehsilChange = (nextTehsilId) => {
    const selectedTehsilId = nextTehsilId || "";
    const selectedTehsil = tehsilOptions.find(
      (item) => item.id === selectedTehsilId,
    );

    setTehsilId(selectedTehsilId);
    setCityId("");
    setClusterId("");
    setCityOptions([]);
    setClusterOptions([]);

    setFormField((prev) => ({
      ...prev,
      tehsil: selectedTehsil?.name ?? "",
      city: "",
      cluster_area: "",
    }));
  };

  const handleCityChange = (nextCityId) => {
    const selectedCityId = nextCityId || "";
    const selectedCity = cityOptions.find((item) => item.id === selectedCityId);

    setCityId(selectedCityId);
    setClusterId("");
    setClusterOptions([]);

    setFormField((prev) => ({
      ...prev,
      city: selectedCity?.name ?? "",
      cluster_area: "",
    }));
  };

  const handleClusterChange = (nextClusterId) => {
    const selectedClusterId = nextClusterId || "";
    const selectedCluster = clusterOptions.find(
      (item) => item.id === selectedClusterId,
    );

    setClusterId(selectedClusterId);
    setFormField((prev) => ({
      ...prev,
      cluster_area: selectedCluster?.name ?? "",
    }));
  };

  const validateForm = () => {
    const trimmedSchoolName = formField.school_name.trim();
    const trimmedEmail = formField.email.trim().toLowerCase();
    const trimmedUsername = formField.username.trim();
    const trimmedPassword = formField.password.trim();
    const trimmedConfirmPassword = formField.confirm_password.trim();
    const trimmedAddress = formField.address.trim();
    const trimmedPrincipalName = formField.principal_name.trim();
    const trimmedFocalPersonName = formField.focal_person_name.trim();
    const normalizedPrincipalPhone = sanitizePhoneInput(
      formField.principal_phone,
    );
    const normalizedFocalPersonPhone = sanitizePhoneInput(
      formField.focal_person_phone,
    );

    if (!trimmedSchoolName)
      return { field: "school_name", message: "School name is required." };
    if (!trimmedUsername)
      return { field: "username", message: "Username is required." };
    if (usernameAvailability.status === "checking")
      return {
        field: "username",
        message: "Checking username availability. Please wait.",
      };
    if (usernameAvailability.status === "unavailable")
      return { field: "username", message: "Username is already taken." };
    if (usernameAvailability.status === "error")
      return {
        field: "username",
        message: "Unable to verify username availability.",
      };
    if (usernameAvailability.status !== "available")
      return {
        field: "username",
        message: "Please wait for username availability check.",
      };
    if (!trimmedEmail) return { field: "email", message: "Email is required." };
    if (!EMAIL_REGEX.test(trimmedEmail))
      return { field: "email", message: "A valid email is required." };
    if (trimmedEmail && emailAvailability.status === "checking")
      return {
        field: "email",
        message: "Checking email availability. Please wait.",
      };
    if (trimmedEmail && emailAvailability.status === "unavailable")
      return { field: "email", message: "Email is already taken." };
    if (trimmedEmail && emailAvailability.status === "error")
      return {
        field: "email",
        message: "Unable to verify email availability.",
      };
    if (trimmedEmail && emailAvailability.status !== "available")
      return {
        field: "email",
        message: "Please wait for email availability check.",
      };
    if (!trimmedPassword)
      return { field: "password", message: "Password is required." };
    if (!trimmedConfirmPassword)
      return {
        field: "confirm_password",
        message: "Confirm password is required.",
      };
    if (trimmedPassword !== trimmedConfirmPassword)
      return {
        field: "confirm_password",
        message: "Password and confirm password must match.",
      };

    if (!provinceId || !formField.province.trim()) {
      return { field: "province", message: "Province is required." };
    }
    if (!districtId || !formField.district.trim()) {
      return { field: "district", message: "District is required." };
    }
    if (!tehsilId || !formField.tehsil.trim()) {
      return { field: "tehsil", message: "Tehsil is required." };
    }
    if (!cityId || !formField.city.trim()) {
      return { field: "city", message: "City is required." };
    }
    if (!trimmedAddress)
      return { field: "address", message: "Address is required." };
    if (!trimmedPrincipalName)
      return {
        field: "principal_name",
        message: "Principal name is required.",
      };
    if (!PHONE_REGEX.test(normalizedPrincipalPhone))
      return {
        field: "principal_phone",
        message: "Principal phone must be in +92-XXX-XXXXXXX format.",
      };
    if (!trimmedFocalPersonName)
      return {
        field: "focal_person_name",
        message: "Focal person name is required.",
      };
    if (!PHONE_REGEX.test(normalizedFocalPersonPhone))
      return {
        field: "focal_person_phone",
        message: "Focal person phone must be in +92-XXX-XXXXXXX format.",
      };
    if (!formField.agree)
      return {
        field: "agree",
        message: "You must confirm the declaration before submitting.",
      };

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError.message);
      toast.error(validationError.message);
      focusField(validationError.field);
      setLoading(false);
      return;
    }

    const consent = Boolean(formField.agree || formField.rmc_member);
    const trimmedConfirmPassword = formField.confirm_password.trim();
    const normalizedPrincipalPhone = sanitizePhoneInput(
      formField.principal_phone,
    );
    const normalizedFocalPersonPhone = sanitizePhoneInput(
      formField.focal_person_phone,
    );

    const payload = new FormData();
    payload.append("school_name", formField.school_name.trim());
    payload.append("email", formField.email.trim());
    payload.append("username", formField.username.trim());
    payload.append("password", formField.password.trim());
    payload.append("password_confirmation", trimmedConfirmPassword);
    payload.append("confirm_password", trimmedConfirmPassword);
    payload.append("province", formField.province.trim());
    payload.append("district", formField.district.trim());
    payload.append("tehsil", formField.tehsil.trim());
    payload.append("city", formField.city.trim());
    if (formField.cluster_area.trim()) {
      payload.append("cluster_area", formField.cluster_area.trim());
    }
    payload.append("address", formField.address.trim());
    payload.append("principal_name", formField.principal_name.trim());
    payload.append("principal_phone", normalizedPrincipalPhone);
    payload.append("focal_person_name", formField.focal_person_name.trim());
    payload.append("focal_person_phone", normalizedFocalPersonPhone);
    payload.append("rmc_member", consent ? "1" : "0");
    payload.append("agree", consent ? "1" : "0");
    if (formField.profile_image instanceof File) {
      payload.append("profile_image", formField.profile_image);
    }

    try {
      const response = await createSchoolAccountApi(payload);
      const successMessage =
        response?.message ||
        "School account created successfully. Please wait for approval.";
      toast.success(successMessage);

      // Auto-login after successful registration using email and password
      try {
        await login({
          identifier: formField.email.trim(),
          password: formField.password.trim(),
        });
        toast.success("Welcome! You are now logged in.");
        navigate("/school/dashboard", { replace: true });
        return;
      } catch (loginErr) {
        // If auto-login fails, show the success message and account created screen
        console.warn("Auto-login failed after registration:", loginErr);
      }

      setCreatedMessage(successMessage);
      setAccountCreated(true);

      setFormField(DEFAULT_FORM);
      setUsernameAvailability({ status: "idle", message: "" });
      setEmailAvailability({ status: "idle", message: "" });
      setProvinceId("");
      setDistrictId("");
      setTehsilId("");
      setCityId("");
      setClusterId("");
      setDistrictOptions([]);
      setTehsilOptions([]);
      setCityOptions([]);
      setClusterOptions([]);
    } catch (err) {
      const message = err?.message || "Account creation failed.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const passwordMismatch =
    Boolean(formField.password.trim()) &&
    Boolean(formField.confirm_password.trim()) &&
    formField.password.trim() !== formField.confirm_password.trim();

  return (
    <div className="login-wrap">
      <div className="login-left relative">
        <img src={loginBanner} alt="Sketch" />
      </div>
      <div className="login-right">
        {accountCreated ? (
          <div className="h-full flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="w-18 h-18 mb-4 flex items-center justify-center rounded-full bg-[#59B465]">
              <Check size={36} className="text-white" />
            </div>
            <h1 className="heading_signIn_h1 text-[#A1484C] !mb-2">
              Account created successfully!
            </h1>
            <p className="heading_signIn_para !text-black font-[500] !text-[16px] max-w-md">
              Your account for ILM is now active. Please sign in to access your
              dashboard.
            </p>
            <Link
              to="/login"
              className="btn-submit flex items-center justify-center gap-1 mt-6 w-full max-w-md"
            >
              Sign In
              <LogInIcon size={18} />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error ? (
              <Alert
                variant="destructive"
                className="alert-custom mb-4 bg-[#FDF7EC]"
              >
                <AlertCircleIcon size={18} />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            ) : null}

            <Link
              to="/signup"
              className="flex items-center gap-1 text-[16px] mb-4 text-[#AD474B]"
            >
              <ChevronLeft size={16} />
              <span>Choose a different role</span>
            </Link>
            <div className="already-account-tag">
              <span>
                <Check size={15} />
              </span>
              <p className="text-[15px] text-black font-medium">
                If you are already registered, please{" "}
                <Link
                  to="/login"
                  className="text-[#AD474B] border-b border-[#AD474B]"
                >
                  login
                </Link>
              </p>
            </div>

            <div className="heading_signIn">
              <h1 className="heading_signIn_h1">Create Your School Account</h1>
              <p className="heading_signIn_para">
                Please fill all fields marked with * correctly.
              </p>
            </div>

            <div className="form-admin form-creation !pt-0">
              <div className="form-group w-full">
                <h2 className="form-heading">
                  <span>
                    <School />
                  </span>{" "}
                  School Details
                </h2>
              </div>

              <div className="form-group w-half">
                <label>
                  <School size={18} /> School Name<span>*</span>
                </label>
                <input
                  id="school_name"
                  type="text"
                  className="form-input"
                  name="school_name"
                  value={formField.school_name}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Enter full school name"
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <FileImage size={18} /> School Logo
                </label>
                <input
                  id="profile_image"
                  type="file"
                  className="form-input"
                  name="profile_image"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <IdCardLanyard size={18} /> Username<span>*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  name="username"
                  value={formField.username}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Choose a unique username"
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
              </div>

              <div className="form-group w-half">
                <label>
                  <Mail size={18} /> Email<span>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  name="email"
                  value={formField.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="example@school.com"
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

              <div className="form-group w-half">
                <label>
                  <Lock size={18} /> Password<span>*</span>
                </label>
                <input
                  id="password"
                  type={passwordType}
                  className="form-input"
                  name="password"
                  value={formField.password}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="text-slate-400 cursor-pointer password-eye"
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
                  <Lock size={18} /> Confirm Password<span>*</span>
                </label>
                <input
                  id="confirm_password"
                  type={passwordType}
                  className="form-input"
                  name="confirm_password"
                  value={formField.confirm_password}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="text-slate-400 cursor-pointer password-eye"
                  onClick={handleShowPasswordToggle}
                >
                  {passwordType === "password" ? (
                    <EyeClosed size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
                {passwordMismatch ? (
                  <p className="mt-1 text-xs text-red-500">
                    Passwords do not match.
                  </p>
                ) : null}
              </div>

              <div className="form-group w-full">
                <h2 className="form-heading">
                  <span>
                    <Map />
                  </span>{" "}
                  Location
                </h2>
              </div>
              <div className="form-group w-half">
                <label>
                  <Map size={18} /> Province<span>*</span>
                </label>
                <SearchableMultiSelect
                  options={provinceOptions}
                  value={provinceId}
                  multiple={false}
                  onChange={handleProvinceChange}
                  placeholder="Search province..."
                  disabled={loading || provinceLoading}
                  loading={provinceLoading}
                  emptyState="No province found"
                  valueKey="id"
                  labelKey="name"
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <MapPin size={18} /> District<span>*</span>
                </label>
                <SearchableMultiSelect
                  options={districtOptions}
                  value={districtId}
                  multiple={false}
                  onChange={handleDistrictChange}
                  placeholder="Search district..."
                  disabled={loading || !provinceId || districtLoading}
                  loading={districtLoading}
                  emptyState={
                    provinceId ? "No district found" : "Select province first"
                  }
                  valueKey="id"
                  labelKey="name"
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <MapPin size={18} /> Tehsil<span>*</span>
                </label>
                <SearchableMultiSelect
                  options={tehsilOptions}
                  value={tehsilId}
                  multiple={false}
                  onChange={handleTehsilChange}
                  placeholder="Search tehsil..."
                  disabled={loading || !districtId || tehsilLoading}
                  loading={tehsilLoading}
                  emptyState={
                    districtId ? "No tehsil found" : "Select district first"
                  }
                  valueKey="id"
                  labelKey="name"
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <MapPin size={18} /> City<span>*</span>
                </label>
                <SearchableMultiSelect
                  options={cityOptions}
                  value={cityId}
                  multiple={false}
                  onChange={handleCityChange}
                  placeholder="Search city..."
                  disabled={loading || !tehsilId || cityLoading}
                  loading={cityLoading}
                  emptyState={
                    tehsilId ? "No city found" : "Select tehsil first"
                  }
                  valueKey="id"
                  labelKey="name"
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <MapPin size={18} /> Cluster / Area
                </label>
                <SearchableMultiSelect
                  options={clusterOptions}
                  value={clusterId}
                  multiple={false}
                  onChange={handleClusterChange}
                  placeholder="Search cluster area..."
                  disabled={loading || !cityId || clusterLoading}
                  loading={clusterLoading}
                  emptyState={
                    cityId ? "No cluster area found" : "Select city first"
                  }
                  valueKey="id"
                  labelKey="name"
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <MapPinCheck size={18} />
                  Street Address<span>*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  className="form-input"
                  name="address"
                  value={formField.address}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Full physical address"
                />
              </div>

              <div className="form-group w-full">
                <h2 className="form-heading">
                  <span>
                    <User />
                  </span>{" "}
                  Contacts
                </h2>
              </div>

              <div className="form-group w-half">
                <label>
                  <User size={18} /> Principal Name<span>*</span>
                </label>
                <input
                  id="principal_name"
                  type="text"
                  className="form-input"
                  name="principal_name"
                  value={formField.principal_name}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Full Name"
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <Phone size={18} /> Principal Phone<span>*</span>
                </label>
                <input
                  id="principal_phone"
                  className="form-input no-spinner"
                  name="principal_phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="+92-XXX-XXXXXXX"
                  value={formField.principal_phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <User size={18} /> Focal Person Name<span>*</span>
                </label>
                <input
                  id="focal_person_name"
                  type="text"
                  className="form-input"
                  name="focal_person_name"
                  value={formField.focal_person_name}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Full Name"
                />
              </div>

              <div className="form-group w-half">
                <label>
                  <Phone size={18} /> Focal Person Phone<span>*</span>
                </label>
                <input
                  id="focal_person_phone"
                  className="form-input no-spinner"
                  name="focal_person_phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="+92-XXX-XXXXXXX"
                  value={formField.focal_person_phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="from-group w-full">
                <input
                  id="agree"
                  type="checkbox"
                  name="agree"
                  checked={formField.agree}
                  onChange={handleChange}
                  disabled={loading}
                />
                <label htmlFor="agree" className="pl-2">
                  I confirm that the provided information is correct and I am
                  authorized to register this school for RMC membership.
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="btn-submit flex items-center justify-center gap-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  Please wait
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Register School
                  <LogInIcon size={18} />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateAccountSchool;
