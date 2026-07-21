import React from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  BookText,
  Eye,
  EyeClosed,
  Image,
  Loader2,
  Mail,
  Lock,
  Phone,
  Save,
  User,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuthStore } from "@/store/auth";
import { updateProfileById } from "@/api/profileApi";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_REGEX = /^[A-Za-z\s]+$/;

const DEFAULT_FORM = {
  name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  gender: "",
};

const resolveUserField = (user, path, fallback = "") =>
  user?.[path] ?? user?.profile?.[path] ?? user?.user?.[path] ?? fallback;

const BACKEND_FILE_BASE_PATH =
  import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? "";

const isAbsoluteAssetUrl = (value = "") =>
  /^https?:\/\//i.test(value) ||
  value.startsWith("blob:") ||
  value.startsWith("data:");

const resolveImageSrc = (value = "") => {
  if (!value) return "";
  if (isAbsoluteAssetUrl(value)) {
    return value;
  }
  if (!BACKEND_FILE_BASE_PATH) {
    return value;
  }
  const baseEndsWithSlash = BACKEND_FILE_BASE_PATH.endsWith("/");
  const valueStartsWithSlash = value.startsWith("/");
  if (baseEndsWithSlash && valueStartsWithSlash) {
    return `${BACKEND_FILE_BASE_PATH}${value.slice(1)}`;
  }
  if (!baseEndsWithSlash && !valueStartsWithSlash) {
    return `${BACKEND_FILE_BASE_PATH}/${value}`;
  }
  return `${BACKEND_FILE_BASE_PATH}${value}`;
};

const resolveUserImage = (user) =>
  resolveUserField(user, "image") ||
  resolveUserField(user, "avatar") ||
  resolveUserField(user, "profile_image") ||
  resolveUserField(user, "profile_photo") ||
  "";

const ProfileEditor = ({
  dashboardTitle = "",
  pageTitle = "Update Profile",
  onSuccess,
  isStudent = false,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, updateUser } = useAuthStore();

  const [formField, setFormField] = React.useState({ ...DEFAULT_FORM });
  const [imagePreview, setImagePreview] = React.useState("");
  const [imageFile, setImageFile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [passwordType, setPasswordType] = React.useState("password");
  const fileInputRef = React.useRef(null);
  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password"
    );
  };

  React.useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user) {
      const nextForm = {
        name: resolveUserField(user, "name"),
        email: resolveUserField(user, "email"),
        password: "",
        phone: resolveUserField(user, "phone"),
        address: resolveUserField(user, "address"),
        gender: resolveUserField(user, "gender"),
      };
      setFormField(nextForm);

      const existingImage = resolveUserImage(user);

      setImagePreview(existingImage || "");
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => {
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

  const handleGenderChange = (value) => {
    setFormField((prev) => ({ ...prev, gender: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(previewUrl);
    setImageFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedName = (formField.name ?? "").toString().trim();
    const trimmedEmail = (formField.email ?? "").toString().trim();
    const trimmedPhone = (formField.phone ?? "").toString().trim();
    const trimmedAddress = (formField.address ?? "").toString().trim();
    const trimmedPassword = (formField.password ?? "").toString().trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedAddress) {
      const message = "Please fill in all required fields.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!NAME_REGEX.test(trimmedName)) {
      const message = "Full name cannot include numbers or special characters.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      const message = "Please provide a valid email address.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!/^\d{12}$/.test(trimmedPhone)) {
      const message = "Phone number must be exactly 12 digits.";
      setError(message);
      toast.error(message);
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", trimmedName);
      formData.append("email", trimmedEmail);
      formData.append("phone", trimmedPhone);
      formData.append("address", trimmedAddress);

      if (formField.gender) {
        formData.append("gender", formField.gender);
      }

      if (trimmedPassword) {
        formData.append("password", trimmedPassword);
      }

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await updateProfileById(formData);

      const updatedUserFromApi =
        response?.data?.user ??
        response?.user ??
        response?.data?.data ??
        response?.data ??
        null;

      const mergedUser = updatedUserFromApi
        ? { ...user, ...updatedUserFromApi }
        : {
            ...user,
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
            address: trimmedAddress,
            gender: formField.gender || user?.gender,
          };

      if (mergedUser) {
        updateUser(mergedUser);
      }

      // Update preview with latest image path from API response if provided
      const updatedImage = resolveUserImage(updatedUserFromApi);
      if (updatedImage) {
        setImagePreview(updatedImage);
        setImageFile(null);
      }

      toast.success("Profile updated successfully.");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const message =
        err?.message || "Failed to update profile. Please try again.";
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
          {dashboardTitle ? <h4>{dashboardTitle}</h4> : null}
          <h1>{pageTitle}</h1>
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

          {!user ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          ) : (
            <>
              <div
                className={`form-admin ${
                  isStudent ? "form-student-compress" : ""
                }`}
              >
                <div className="form-group w-half">
                  <label>
                    <User size={16} />
                    Name <span>*</span>
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
                    <Mail size={16} />
                    Email <span>*</span>
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

                <div className="form-group w-full">
                  <label>
                    <Image size={16} />
                    Profile Image <span>*</span>
                  </label>
                  <input
                    type="file"
                    className="form-input"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading}
                    ref={fileInputRef}
                  />
                </div>

                {imagePreview && (
                  <div className="show-img mb-4 w-full">
                    <img
                      src={resolveImageSrc(imagePreview)}
                      alt="Profile preview"
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  </div>
                )}

                <div className="form-group w-half">
                  <label>
                    <Lock size={16} /> Password (leave blank to keep current)
                  </label>
                  <input
                    type={passwordType}
                    className="form-input"
                    name="password"
                    value={formField.password}
                    onChange={handleChange}
                    disabled={loading}
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
                    <Phone size={16} />
                    Phone<span>*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input no-spinner"
                    name="phone"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    placeholder="E.g: 923001234567"
                    value={formField.phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <BookText size={16} />
                    Address<span>*</span>
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

                <div className="form-group w-half">
                  <label>Gender</label>
                  <RadioGroup
                    value={formField.gender}
                    onValueChange={handleGenderChange}
                    className="mt-3 flex gap-4 flex-col md:flex-row"
                    disabled={loading}
                  >
                    <div className="flex items-center space-x-2 radio-wrap">
                      <RadioGroupItem
                        value="male"
                        id="profile-gender-male"
                        className="radio-input-custom"
                      />
                      <Label
                        htmlFor="profile-gender-male"
                        className="radio-label-custom"
                      >
                        Male
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 radio-wrap">
                      <RadioGroupItem
                        value="female"
                        id="profile-gender-female"
                        className="radio-input-custom"
                      />
                      <Label
                        htmlFor="profile-gender-female"
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
                  ) : (
                    <>
                      Update Profile
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

export default ProfileEditor;
