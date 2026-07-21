import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Eye,
  EyeClosed,
  FileText,
  IdCardLanyard,
  Loader2,
  Lock,
  LockKeyhole,
  MapPin,
  Phone,
  Plus,
  Save,
  School,
  Shield,
  ShieldCheck,
  TextInitial,
  UserCog,
  X,
} from "lucide-react";
import {
  addOrganization,
  getOrganizationById,
  updateOrganizationById,
  getAllOrganizationSchools,
} from "@/api/organizationApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { getAllSchools } from "@/api/schoolApi";
import { checkUsername } from "@/api/authApi";

const DEFAULT_FORM = {
  name: "",
  email: "",
  username: "",
  password: "",
  phone: "",
  address: "",
  status: "active",
  school_ids: [],
};

const PHONE_REGEX = /^\+92\d{10}$/;
const USERNAME_CHECK_DEBOUNCE_MS = 500;

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
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

// Main Component
const OrganizationForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateOrganization = state?.organization;
  const organizationId =
    paramsId || state?.organizationId || fallbackStateOrganization?.id;
  const isEditMode = Boolean(organizationId);

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    ...(fallbackStateOrganization || {}),
  }));
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [schools, setSchools] = React.useState([]);
  const [loadingSchools, setLoadingSchools] = React.useState(false);
  const [passwordType, setPasswordType] = React.useState("password");
  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password",
    );
  };

  const [usernameAvailability, setUsernameAvailability] = React.useState({
    status: "idle",
    message: "",
  });
  const [initialUsername, setInitialUsername] = React.useState(() =>
    String(fallbackStateOrganization?.username ?? ""),
  );
  const usernameCheckTimeoutRef = React.useRef(null);
  const usernameCheckRequestRef = React.useRef(0);

  React.useEffect(() => {
    const username = safeTrimString(formField.username);

    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
      usernameCheckTimeoutRef.current = null;
    }

    if (!username) {
      setUsernameAvailability({ status: "idle", message: "" });
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
  }, [formField.username, initialUsername, isEditMode]);

  // Fetch schools list
  React.useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoadingSchools(true);
        const result = await getAllSchools();
        setSchools(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Failed to load schools:", err);
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchools();
  }, []);

  // Fetch organization data when editing
  React.useEffect(() => {
    if (!isEditMode || !organizationId) return;

    const fetchOrganization = async () => {
      try {
        setFetching(true);
        const result = await getOrganizationById(organizationId);
        const data = result?.data ?? result ?? {};

        const schoolIds = (data.schools ?? []).map((school) =>
          String(school.id),
        );

        setFormField((prev) => ({
          ...prev,
          name: data.name ?? "",
          email: data.email ?? "",
          username: data.username ?? "",
          password: "",
          phone: formatPhoneMaskedInput(data.phone ?? ""),
          address: data.address ?? "",
          status: data.status ?? "active",
          school_ids: schoolIds,
        }));
        setInitialUsername(String(data.username ?? "").trim());
      } catch (err) {
        const message =
          err?.message ||
          "Unable to load organization details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchOrganization();
  }, [isEditMode, organizationId]);

  // Handle input change
  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "phone") {
      const maskedPhone = formatPhoneMaskedInput(value);
      setFormField((prev) => ({ ...prev, phone: maskedPhone }));
      return;
    }
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  // Handle schools multiselect change
  const handleSchoolsChange = (selectedValues) => {
    setFormField((prev) => ({ ...prev, school_ids: selectedValues }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedName = safeTrimString(formField.name);
    const trimmedEmail = safeTrimString(formField.email);
    const trimmedUsername = safeTrimString(formField.username);
    const trimmedPassword = safeTrimString(formField.password);
    const trimmedAddress = safeTrimString(formField.address);
    const normalizedOrganizationPhone = sanitizePhoneInput(formField.phone);

    if (
      !trimmedName ||
      !trimmedEmail ||
      !trimmedUsername ||
      !normalizedOrganizationPhone ||
      !trimmedAddress
    ) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }
    if (!PHONE_REGEX.test(normalizedOrganizationPhone)) {
      const message = "Phone number must be in +92-XXX-XXXXXXX format.";
      setError(message);
      toast.error(message);
      return;
    }

    const isCurrentUsername =
      isEditMode &&
      initialUsername &&
      trimmedUsername.toLowerCase() === initialUsername.toLowerCase();

    if (!isCurrentUsername) {
      if (usernameAvailability.status === "checking") {
        const message = "Checking username availability. Please wait.";
        setError(message);
        toast.error(message);
        return;
      }

      if (usernameAvailability.status === "unavailable") {
        const message = "Username is already taken.";
        setError(message);
        toast.error(message);
        return;
      }

      if (usernameAvailability.status === "error") {
        const message =
          usernameAvailability.message ||
          "Unable to verify username right now.";
        setError(message);
        toast.error(message);
        return;
      }

      if (
        trimmedUsername &&
        usernameAvailability.status !== "available"
      ) {
        const message = "Username availability is not confirmed yet.";
        setError(message);
        toast.error(message);
        return;
      }
    }

    if (!isEditMode && !trimmedPassword) {
      const message = "Password is required for new organizations.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      username: trimmedUsername,
      phone: normalizedOrganizationPhone,
      address: trimmedAddress,
      status: formField.status,
      school_ids: formField.school_ids,
    };

    if (trimmedPassword) {
      payload.password = trimmedPassword;
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateOrganizationById(organizationId, payload);
        toast.success("Organization updated successfully.");
      } else {
        await addOrganization(payload);
        toast.success("Organization added successfully.");
      }
      navigate("/admin/organizations-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${
          isEditMode ? "update" : "add"
        } organization. Please try again.`;
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
          <h1>{isEditMode ? "Update Organization" : "Add New Organization"}</h1>
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
                <div className="form-group w-full">
                  <label>
                    <School size={16} /> Schools <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={schools}
                    selectedValues={formField.school_ids}
                    onChange={handleSchoolsChange}
                    placeholder="Search and select schools..."
                    disabled={loading}
                    loading={loadingSchools}
                    valueKey="id"
                    labelKey="name"
                  />
                </div>
                <div className="form-group w-half">
                  <label>
                    <TextInitial size={16} /> Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    value={formField.name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <ShieldCheck size={16} /> Email <span>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    name="email"
                    value={formField.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <UserCog size={16} /> Username <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="username"
                    value={formField.username}
                    onChange={handleChange}
                    disabled={loading}
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
                    <Lock size={16} /> Password
                    {isEditMode ? " (optional)" : <span>*</span>}
                  </label>
                  <input
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
                    <Phone size={16} /> Phone <span>*</span>
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="+92 XXX XXXXXXX"
                    value={formField.phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Shield size={16} /> Status <span>*</span>
                  </label>
                  <select
                    name="status"
                    className="form-input"
                    value={formField.status}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <MapPin size={16} /> Address <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="address"
                    value={formField.address}
                    onChange={handleChange}
                    disabled={loading}
                  />
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
                      Update Organization
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Organization
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

export default OrganizationForm;
