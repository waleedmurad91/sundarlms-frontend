import React from "react";
import {
  AlertCircleIcon,
  Check,
  ChevronLeft,
  Eye,
  EyeClosed,
  Loader2,
  Lock,
  LogInIcon,
  Mail,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import loginBanner from "@/assets/signin-image.png";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  checkEmail,
  checkUsername,
  createStudentAccountApi,
} from "@/api/authApi";

const DEFAULT_FORM = {
  name: "",
  email: "",
  password: "",
  confirm_password: "",
  username: "", // the actual username sent to the API
  confirm_username: "", // frontend-only confirmation – never sent to API
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_CHECK_DEBOUNCE_MS = 500;

const Signup = () => {
  const [formField, setFormField] = React.useState(DEFAULT_FORM);

  const [passwordType, setPasswordType] = React.useState("password");
  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password",
    );
  };

  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [accountCreated, setAccountCreated] = React.useState(false);
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

  // ─── derived inline-validation booleans ──────────────────────────────────────
  // Password mismatch: show only once both fields have content
  const passwordMismatch =
    Boolean(formField.password.trim()) &&
    Boolean(formField.confirm_password.trim()) &&
    formField.password.trim() !== formField.confirm_password.trim();

  // Username mismatch: show only once both fields have content
  const usernameValue = formField.username.trim();
  const confirmUsernameValue = formField.confirm_username.trim();
  const usernameMismatch =
    Boolean(usernameValue) &&
    Boolean(confirmUsernameValue) &&
    usernameValue !== confirmUsernameValue;
  // ─────────────────────────────────────────────────────────────────────────────

  // ── username availability check ───────────────────────────────────────────
  React.useEffect(() => {
    const username = formField.username.trim();

    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
      usernameCheckTimeoutRef.current = null;
    }

    if (!username || username.length < 3) {
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

  // ── email availability check ─────────────────────────────────────────────────
  // React.useEffect(() => {
  //   const email = String(formField.email ?? "")
  //     .trim()
  //     .toLowerCase();

  //   if (emailCheckTimeoutRef.current) {
  //     clearTimeout(emailCheckTimeoutRef.current);
  //     emailCheckTimeoutRef.current = null;
  //   }

  //   if (!email || !EMAIL_REGEX.test(email)) {
  //     setEmailAvailability({ status: "idle", message: "" });
  //     return;
  //   }

  //   setEmailAvailability({
  //     status: "checking",
  //     message: "Checking email availability...",
  //   });

  //   const requestId = emailCheckRequestRef.current + 1;
  //   emailCheckRequestRef.current = requestId;

  //   emailCheckTimeoutRef.current = setTimeout(async () => {
  //     try {
  //       const response = await checkEmail(email);
  //       if (emailCheckRequestRef.current !== requestId) return;
  //       const available = Boolean(response?.data?.available);
  //       setEmailAvailability(
  //         available
  //           ? { status: "available", message: "Email is available." }
  //           : { status: "unavailable", message: "Email is already taken." },
  //       );
  //     } catch (err) {
  //       if (emailCheckRequestRef.current !== requestId) return;
  //       setEmailAvailability({
  //         status: "error",
  //         message: err?.message || "Unable to verify email right now.",
  //       });
  //     }
  //   }, USERNAME_CHECK_DEBOUNCE_MS);

  //   return () => {
  //     if (emailCheckTimeoutRef.current) {
  //       clearTimeout(emailCheckTimeoutRef.current);
  //       emailCheckTimeoutRef.current = null;
  //     }
  //   };
  // }, [formField.email]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      const cleanedValue = value.replace(/[^A-Za-z\s]/g, "");
      setFormField((prev) => ({ ...prev, name: cleanedValue }));
      return;
    }
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // ── required field list ───────────────────────────────────────────────────
    // (email intentionally excluded – it is optional)
    const requiredFields = [
      "name",
      "password",
      "confirm_password",
      "username",
      "confirm_username", // required on frontend for validation only
    ];

    const hasEmpty = requiredFields.some(
      (field) => !String(formField[field] ?? "").trim(),
    );

    const usernameToSubmit = formField.username.trim();
    const confirmUsernameToSubmit = formField.confirm_username.trim();

    if (hasEmpty) {
      const message = "Please fill in all required fields.";
      setError(message);
      toast.error(message);
      return;
    }

    // ── password confirmation ────────────────────────────────────────────────
    if (formField.password.trim() !== formField.confirm_password.trim()) {
      const message = "Password and confirm password do not match.";
      setError(message);
      toast.error(message);
      return;
    }

    // ── username confirmation ────────────────────────────────────────────────
    if (usernameToSubmit !== confirmUsernameToSubmit) {
      const message = "Username and confirm username do not match.";
      setError(message);
      toast.error(message);
      return;
    }

    // ── username availability ────────────────────────────────────────────────
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
      const message = "Unable to verify username availability.";
      setError(message);
      toast.error(message);
      return;
    }

    if (usernameAvailability.status !== "available") {
      const message = "Please wait for username availability check.";
      setError(message);
      toast.error(message);
      return;
    }

    // ── optional email validation ────────────────────────────────────────────
    const normalizedEmail = String(formField.email ?? "")
      .trim()
      .toLowerCase();
    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      const message = "A valid email is required.";
      setError(message);
      toast.error(message);
      return;
    }
    if (normalizedEmail) {
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
      // if (emailAvailability.status !== "available") {
      //   const message = "Please wait for email availability check.";
      //   setError(message);
      //   toast.error(message);
      //   return;
      // }
    }

    // ── build payload – confirm_password and confirm_username are NOT sent ───
    const payload = new FormData();
    payload.append("name", formField.name.trim());
    payload.append("email", normalizedEmail); // empty string if not provided
    payload.append("password", formField.password.trim());
    payload.append("password_confirmation", formField.password.trim()); // mirror of password
    payload.append("username", usernameToSubmit);
    payload.append("username_confirmation", usernameToSubmit);
    payload.append("form_category", "registration-module");
    // NOTE: confirm_password and confirm_username are intentionally omitted ──

    try {
      setLoading(true);
      const res = await createStudentAccountApi(payload);
      const successMessage =
        res?.message ||
        "Signup submitted successfully! Please wait for admin approval.";
      toast.success(successMessage);
      setError("");

      // Auto-login after successful registration using username and password
      try {
        await login({
          identifier: usernameToSubmit,
          password: formField.password.trim(),
        });
        toast.success("Welcome! You are now logged in.");
        navigate("/student/dashboard", { replace: true });
        return;
      } catch (loginErr) {
        console.warn("Auto-login failed after registration:", loginErr);
      }

      setAccountCreated(true);

      setFormField(DEFAULT_FORM);
      setUsernameAvailability({ status: "idle", message: "" });
      setEmailAvailability({ status: "idle", message: "" });
    } catch (err) {
      const msg = err?.message || "Account creation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = loading;

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
              Account Created Successfully!
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
            <>
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
                <h1 className="heading_signIn_h1">
                  Create Your Student Account
                </h1>
                <p className="heading_signIn_para">
                  Fill in your details to get started
                </p>
              </div>
              <div className="form-admin form-creation !md:pt-0">
                <div className="form-group w-full">
                  <h2 className="form-heading">
                    <span>
                      <User />
                    </span>{" "}
                    Basic Information
                  </h2>
                </div>

                {/* Full Name */}
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
                    disabled={loading}
                    placeholder="Full Name"
                  />
                </div>

                {/* Email (optional) */}
                <div className="form-group w-half">
                  <label>
                    <Mail size={16} /> Email{" "}
                    <small className="text-gray-500 font-light">
                      (optional)
                    </small>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    name="email"
                    value={formField.email}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="student@example.com"
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

                {/* ── Username ─────────────────────────────────────────────── */}
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
                    onKeyDown={(e) => {
                      const allowed = /^[a-zA-Z0-9_\-.]$/;
                      if (!allowed.test(e.key) && e.key.length === 1) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Enter your username"
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
                  <div className="reg-hint mt-1 text-[12px] text-gray-500">
                    This will be your username for login.
                  </div>
                </div>

                {/* ── Confirm Username ──────────────────────────────────────── */}
                <div className="form-group w-half">
                  <label>
                    <User size={16} /> Confirm Username<span>*</span>
                  </label>
                  <input
                    id="confirm_username"
                    name="confirm_username"
                    type="text"
                    className="form-input"
                    value={formField.confirm_username}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      const allowed = /^[a-zA-Z0-9_\-.]$/;
                      if (!allowed.test(e.key) && e.key.length === 1) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Re-enter your username"
                    disabled={loading}
                  />
                  {usernameMismatch ? (
                    <p className="mt-1 text-xs text-red-500">
                      Usernames do not match.
                    </p>
                  ) : null}
                </div>

                {/* Password */}
                <div className="form-group w-half">
                  <label>
                    <Lock size={16} /> Password<span>*</span>
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
                  {formField.password && formField.password.length < 8 ? (
                    <p className="mt-1 text-xs text-red-500">
                      Password must be at least 8 characters.
                    </p>
                  ) : null}
                </div>

                {/* Confirm Password */}
                <div className="form-group w-half">
                  <label>
                    <Lock size={16} /> Confirm Password<span>*</span>
                  </label>
                  <input
                    type={passwordType}
                    className="form-input"
                    name="confirm_password"
                    value={formField.confirm_password}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Confirm Password"
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
              </div>

              <button
                type="submit"
                className="btn-submit flex items-center justify-center gap-1 mt-4 md:mt-0"
                disabled={submitDisabled}
              >
                {loading ? (
                  <>
                    Please wait
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  </>
                ) : (
                  <>
                    Register
                    <LogInIcon size={18} />
                  </>
                )}
              </button>
            </>
          </form>
        )}
      </div>
    </div>
  );
};

export default Signup;
