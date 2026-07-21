import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Eye,
  EyeClosed,
  FileImage,
  FileSpreadsheet,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  School,
  X,
} from "lucide-react";
import {
  addStaff,
  getStaffById,
  updateStaffById,
  getAllSystemRoles,
} from "@/api/staffApi";

const DEFAULT_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "",
  address: "",
  profile_image: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_REGEX = /^[A-Za-z\s]+$/;
const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

// Utility: for showing image preview
const resolveImagePreview = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  if (
    value.startsWith("http") ||
    value.startsWith("/") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  return value;
};

// Main Component
const StaffForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateStaff = state?.staff;
  const staffId = paramsId || state?.staffId || fallbackStateStaff?.id;
  const isEditMode = Boolean(staffId);

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    ...(fallbackStateStaff || {}),
  }));
  const [displayPicturePreview, setDisplayPicturePreview] = React.useState(
    () =>
      typeof fallbackStateStaff?.profile_image === "string"
        ? resolveImagePreview(fallbackStateStaff.profile_image)
        : "",
  );
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [passwordType, setPasswordType] = React.useState("password");
  const [roles, setRoles] = React.useState([]);
  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password",
    );
  };

  // Fetch staff data when editing
  React.useEffect(() => {
    if (!isEditMode || !staffId) return;

    const fetchStaff = async () => {
      try {
        setFetching(true);
        const result = await getStaffById(staffId);
        const data = result?.data ?? result ?? {};

        // FIX: the API returns `role` as a human/slug string (e.g. "data_entry"),
        // but the <select> options are keyed by the numeric role id
        // (role.id from getAllSystemRoles()). The actual numeric id for the
        // staff member's role lives in `access_role.role_id`. Previously we
        // were setting `role: data.role ?? ""`, which never matched any
        // <option value="..."> and silently fell back to the empty
        // "Select Role" placeholder even though the staff member had a role.
        const resolvedRoleId =
          data.access_role?.role_id ??
          data.role_id ??
          data.role ??
          "";

        setFormField((prev) => ({
          ...prev,
          name: data.name ?? "",
          address: data.address ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          role: resolvedRoleId === "" ? "" : String(resolvedRoleId),
          password: "",
          profile_image:
            data.user?.profile_image ??
            data.profile_image ??
            data.profileImage ??
            data.display_picture ??
            data.display_picture_url ??
            prev.profile_image ??
            "",
        }));
      } catch (err) {
        const message =
          err?.message || "Unable to load staff details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchStaff();
  }, [isEditMode, staffId]);

  // Fetch roles on mount
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const result = await getAllSystemRoles();
        setRoles(result?.data ?? result ?? []);
      } catch (err) {
        console.error("Failed to fetch roles:", err);
        toast.error("Failed to load roles.");
      }
    };

    fetchRoles();
  }, []);

  // Handle input change
  const handleChange = (event) => {
    const { name, value, files } = event.target;
    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 12);
      setFormField((prev) => ({ ...prev, phone: numericValue }));
      return;
    }
    if (name === "name") {
      const cleanedValue = value.replace(/[^A-Za-z\s]/g, "");
      setFormField((prev) => ({ ...prev, name: cleanedValue }));
      return;
    }
    if (name === "profile_image") {
      // FIX: this previously called setFormField with an object-literal
      // assignment instead of an updater function (`prev = {...}` is invalid
      // syntax / always reassigns prev), which would break the file input
      // handler entirely. Use the same pattern as the other branches.
      setFormField((prev) => ({ ...prev, profile_image: files[0] }));
      return;
    }
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  // Handle image file change
  const handleDisplayPictureChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    setFormField((prev) => ({ ...prev, profile_image: file }));
  };

  // Image preview update
  React.useEffect(() => {
    const current = formField.profile_image;
    let objectUrl;

    if (!current) {
      setDisplayPicturePreview("");
    } else if (current instanceof File) {
      objectUrl = URL.createObjectURL(current);
      setDisplayPicturePreview(objectUrl);
    } else {
      setDisplayPicturePreview(resolveImagePreview(current));
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [formField.profile_image]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedName = safeTrimString(formField.name);
    const trimmedAddress = safeTrimString(formField.address);
    const trimmedEmail = safeTrimString(formField.email);
    const trimmedPhone = safeTrimString(formField.phone);
    const trimmedRole = safeTrimString(formField.role);
    const trimmedPassword = safeTrimString(formField.password);

    if (
      !trimmedName ||
      !trimmedAddress ||
      !trimmedEmail ||
      !trimmedPhone ||
      !trimmedRole
    ) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    if (!NAME_REGEX.test(trimmedName)) {
      const message =
        "School name cannot include numbers or special characters.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      const message = "Please provide a valid email address.";
      toast.error(message);
      setError(message);
      return;
    }

    if (!isEditMode && !trimmedPassword) {
      const message = "Password is required when creating a school.";
      toast.error(message);
      setError(message);
      return;
    }

    const formData = new FormData();
    formData.append("name", trimmedName);
    formData.append("address", trimmedAddress || "");
    formData.append("phone", trimmedPhone || "");
    formData.append("email", trimmedEmail || "");
    formData.append("role", trimmedRole || "");
    if (trimmedPassword) {
      formData.append("password", trimmedPassword);
      formData.append("password_confirmation", trimmedPassword);
    }
    if (formField.profile_image instanceof File) {
      formData.append("profile_image", formField.profile_image);
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateStaffById(staffId, formData);
        toast.success("Staff updated successfully.");
      } else {
        await addStaff(formData);
        toast.success("Staff added successfully.");
      }
      navigate("/admin/staff-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} staff. Please try again.`;
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
          <h1>{isEditMode ? "Update Staff" : "Add New Staff"}</h1>
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
                    <School size={16} /> Name <span>*</span>
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
                    <Phone size={16} />
                    Phone <span>*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-input"
                    name="phone"
                    value={formField.phone}
                    maxLength={12}
                    placeholder="+92 300 1234567"
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Mail size={16} />
                    Email <span>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    name="email"
                    placeholder="staff@example.com"
                    value={formField.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Lock size={16} />
                    {isEditMode ? "Password (optional)" : "Password"}
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
                    <FileSpreadsheet size={16} /> Role <span>*</span>
                  </label>
                  <select
                    name="role"
                    className="form-input"
                    value={String(formField.role ?? "")}
                    onChange={handleChange}
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={String(role.id)}>
                        {role.name}
                      </option>
                    ))}
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
                    placeholder="Enter complete address"
                    value={formField.address}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-full">
                  <label>
                    <FileImage size={16} />
                    Profile Picture
                  </label>
                  <input
                    type="file"
                    className="form-input"
                    name="profile_image"
                    accept="image/*"
                    onChange={handleDisplayPictureChange}
                    disabled={loading}
                  />
                </div>

                {displayPicturePreview && (
                  <div className="show-img mb-4">
                    <img
                      src={
                        formField.profile_image instanceof File
                          ? displayPicturePreview
                          : `${
                              import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? ""
                            }${displayPicturePreview}`
                      }
                      alt="School display preview"
                      className="h-24 w-24 rounded-md object-cover"
                    />
                  </div>
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
                      Update Staff
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Staff
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

export default StaffForm;