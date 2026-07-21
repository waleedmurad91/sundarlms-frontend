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
import {
  addStudent,
  getStudentById,
  approvedStudent,
  updateStudentById,
} from "@/api/studentApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { useAuthStore } from "@/store/auth";
import {
  getSchoolRegistrationById,
  updateSchoolRegistrationById,
} from "@/api/registrationsApi";
import DistrictCitySelector from "@/components/DistrictCitySelector";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+92\d{10}$/;

const DEFAULT_FORM = {
  school_name: "",
  email: "",
  district: "",
  city: "",
  address: "",
  principal_name: "",
  principal_phone: "",
  focal_person_name: "",
  focal_person_phone: "",
  profile_image: "",
  status: "pending",
  admin_notes: "",
};

const normaliseRegistration = (payload) => {
  if (!payload) {
    return { ...DEFAULT_FORM };
  }

  const data = payload?.data ?? payload;

  return {
    school_name: data?.school_name ?? data?.name ?? "",
    email: data?.email ?? "",
    district: data?.district ?? "",
    city: data?.city ?? "",
    address: data?.address ?? "",
    principal_name: data?.principal_name ?? "",
    principal_phone: data?.principal_phone ?? "",
    focal_person_name: data?.focal_person_name ?? "",
    focal_person_phone: data?.focal_person_phone ?? "",
    profile_image:
      data?.profile_image ??
      data?.user?.profile_image ??
      data?.display_picture ??
      "",
    status: data?.status ?? "pending",
    admin_notes: data?.admin_notes ?? "",
  };
};

const SchoolRegistrationForm = () => {
  const { role: storeRole, user } = useAuthStore();
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const resolvedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const isSchoolRole = resolvedRole === "school";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";
  const { state } = useLocation();

  const fallbackStateRegistration = state?.registration;
  const registrationId =
    paramsId ||
    state?.registrationId ||
    fallbackStateRegistration?.id ||
    fallbackStateRegistration?._id;
  const isEditMode = Boolean(registrationId);

  const [formField, setFormField] = React.useState(() => {
    const base = normaliseRegistration(fallbackStateRegistration);
    return base;
  });
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [data, setData] = React.useState([]);

  React.useEffect(() => {
    if (!isEditMode || fallbackStateRegistration) {
      return;
    }

    const fetchSchoolRegistration = async () => {
      try {
        setFetching(true);
        const result = await getSchoolRegistrationById(registrationId);
        const next = normaliseRegistration(result);
        setFormField((prev) => ({
          ...prev,
          ...next,
        }));
      } catch (err) {
        const message =
          err?.message || "Unable to load school details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchSchoolRegistration();
  }, [fallbackStateRegistration, isEditMode, registrationId]);

  // Phone sanitization matching sForm
  const sanitizePhoneInput = (inputValue = "") => {
    const hasPlus = inputValue.startsWith("+");
    const digits = inputValue.replace(/\D/g, "");
    const limited = digits.slice(0, 12);

    if (hasPlus) return `+${limited}`;
    if (limited.startsWith("92")) return `+${limited}`;
    if (limited.startsWith("0")) return `+92${limited.slice(1, 11)}`;
    return limited ? `+${limited}` : "";
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "principal_phone" || name === "focal_person_phone") {
      const sanitized = sanitizePhoneInput(value);
      setFormField((prev) => ({ ...prev, [name]: sanitized }));
      return;
    }

    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedSchoolName = (formField.school_name ?? "").trim();
    const trimmedEmail = (formField.email ?? "").trim();
    const trimmedDistrict = (formField.district ?? "").trim();
    const trimmedCity = (formField.city ?? "").trim();
    const trimmedAddress = (formField.address ?? "").trim();
    const trimmedPrincipalPhone = (formField.principal_phone ?? "").trim();
    const trimmedPrincipalName = (formField.principal_name ?? "").trim();
    const trimmedFocalPersonPhone = (formField.focal_person_phone ?? "").trim();
    const trimmedFocalPersonName = (formField.focal_person_name ?? "").trim();

    if (!trimmedSchoolName) {
      const message = "School name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      const message = "Active email is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!PHONE_REGEX.test(trimmedPrincipalPhone)) {
      const message = "Invalid Principal's WhatsApp. Use +92XXXXXXXXXX format.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!trimmedPrincipalName) {
      const message = "Principal's name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!trimmedFocalPersonName) {
      const message = "Focal Person's name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!PHONE_REGEX.test(trimmedFocalPersonPhone)) {
      const message =
        "Invalid Focal Person's WhatsApp. Use +92XXXXXXXXXX format.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!trimmedDistrict) {
      const message = "District is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!trimmedCity) {
      const message = "City is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!trimmedAddress) {
      const message = "Address is required.";
      setError(message);
      toast.error(message);
      return;
    }

    const payload = new FormData();

    payload.append("school_name", trimmedSchoolName);
    payload.append("email", trimmedEmail);
    payload.append("principal_name", trimmedPrincipalName);
    payload.append("principal_phone", trimmedPrincipalPhone);
    payload.append("focal_person_name", trimmedFocalPersonName);
    payload.append("focal_person_phone", trimmedFocalPersonPhone);
    payload.append("district", trimmedDistrict);
    payload.append("city", trimmedCity);
    payload.append("address", trimmedAddress || "");
    payload.append("status", formField.status || "pending");
    payload.append("admin_notes", formField.admin_notes?.trim() || "");

    try {
      setLoading(true);
      if (isEditMode) {
        await updateSchoolRegistrationById(registrationId, payload);
        toast.success("School updated successfully.");
      } else {
        // const created = await addStudent(payload);
        // const createdId = created?.data?.id ?? created?.id ?? studentId;
        // if (
        //   createdId &&
        //   (formField.status || "").toLowerCase() === "approved"
        // ) {
        //   const notes = formField.admin_notes?.trim();
        //   await approvedStudent(createdId, notes ? { admin_notes: notes } : {});
        //   toast.success("Student approved successfully.");
        // } else {
        //   toast.success("Student added successfully.");
        // }
      }
      navigate(`${basePath}/school-registrations-lists`);
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} school. Please try again.`;
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
          <h1>
            {isEditMode
              ? "Update School Registration"
              : "Add School Registration"}
          </h1>
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
                  <input
                    type="text"
                    className="form-input"
                    name="school_name"
                    placeholder="Enter School name"
                    value={formField.school_name}
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
                    placeholder="school@example.com"
                    value={formField.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <User size={16} /> Principal Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="principal_name"
                    placeholder="Enter full name"
                    value={formField.principal_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Principal Phone<span>*</span>
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="principal_phone"
                    type="tel"
                    maxLength={13}
                    placeholder="+92XXXXXXXXXX"
                    value={formField.principal_phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <User size={16} /> Focal Person Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="focal_person_name"
                    placeholder="Enter full name"
                    value={formField.focal_person_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Focal Person Phone<span>*</span>
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="focal_person_phone"
                    type="tel"
                    maxLength={13}
                    placeholder="+92XXXXXXXXXX"
                    value={formField.focal_person_phone}
                    onChange={handleChange}
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
                      {/* <p className="text-xs text-gray-500">
                        Approving will create the school account immediately.
                      </p> */}
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
                      Update School
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add School
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

export default SchoolRegistrationForm;
