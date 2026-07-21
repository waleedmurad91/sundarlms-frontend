import React from "react";
import {
  AlertCircleIcon,
  ChevronLeft,
  Eye,
  EyeClosed,
  Loader2,
  Lock,
  MailIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import loginBanner from "@/assets/signin-image.png";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useAuthStore } from "@/store/auth";
import {
  forgotPasswordCheckIdentity,
  forgotPasswordReset,
  forgotPasswordSchoolVerification,
  forgotPasswordStudentVerification,
  forgotPasswordStudentEmailVerification, // NEW: add this to your authApi
} from "@/api/authApi";

const DEFAULT_REQUIRED_FIELDS = {
  verify_student_identity: ["father_cnic", "dob"],
  verify_student_email: ["code"],
  verify_school_email: ["code"],
  reset_password: ["password", "password_confirmation"],
};

const FIELD_LABELS = {
  identifier: "Username",
  father_cnic: "Parent's / Guardian's CNIC",
  dob: "Date of Birth",
  code: "Verification Code",
  password: "New Password",
  password_confirmation: "Confirm Password",
};

const STEP_TITLE = {
  identify: "Reset Password",
  verify_student_identity: "Verify Student Identity",
  verify_student_email: "Verify Student Email",
  verify_school_email: "Verify School Email",
  reset_password: "Create New Password",
};

const STEP_DESCRIPTION = {
  identify:
    "Enter your username to reset your password. For students, this is your Form-B / Smart Card ID or username. For schools, it can be your email or account username.",
  verify_student_identity:
    "Please verify student identity by completing the required fields.",
  verify_student_email:
    "Enter the verification code sent to your student email address to continue.",
  verify_school_email:
    "Enter the verification code sent to the school email address to continue.",
  reset_password: "Set your new password to complete the reset process.",
};

const STEP_BUTTON_LABEL = {
  identify: "Continue",
  verify_student_identity: "Verify",
  verify_student_email: "Verify Code",
  verify_school_email: "Verify Code",
  reset_password: "Reset Password",
};

const toFieldLabel = (fieldName) =>
  FIELD_LABELS[fieldName] ?? fieldName.replace(/_/g, " ");

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, role, checkAuth } = useAuthStore();

  const [formField, setFormField] = React.useState({
    identifier: "",
    father_cnic: "",
    dob: "",
    code: "",
    password: "",
    password_confirmation: "",
  });
  const [step, setStep] = React.useState("identify");
  const [requiredFields, setRequiredFields] = React.useState([]);
  const [challengeToken, setChallengeToken] = React.useState("");
  const [resetToken, setResetToken] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState("");

  const [passwordType, setPasswordType] = React.useState("password");
  const [passwordConfirmationType, setPasswordConfirmationType] =
    React.useState("password");

  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password",
    );
  };
  const handleShowPasswordConfirmationToggle = () => {
    setPasswordConfirmationType((prevType) =>
      prevType === "password" ? "text" : "password",
    );
  };

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [noRecoveryEmail, setNoRecoveryEmail] = React.useState(false);

  React.useEffect(() => {
    const token = sessionStorage.getItem("auth_token");
    if (token && !isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated, checkAuth]);

  const redirectToRoleHome = React.useCallback(
    (role) => {
      const normalizedRole =
        typeof role === "string" ? role.toLowerCase() : "admin";
      if (normalizedRole === "student") {
        navigate("/student/contest", { replace: true });
        return;
      }
      if (normalizedRole === "teacher") {
        navigate("/teacher/dashboard", { replace: true });
        return;
      }
      if (normalizedRole === "school") {
        navigate("/school/dashboard", { replace: true });
        return;
      }
      navigate("/admin/dashboard", { replace: true });
    },
    [navigate],
  );

  React.useEffect(() => {
    if (isAuthenticated) {
      const targetRole = user?.role ?? role;
      if (targetRole) {
        redirectToRoleHome(targetRole);
      }
    }
  }, [isAuthenticated, user, role, redirectToRoleHome]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const stepRequiredFields = React.useMemo(() => {
    if (Array.isArray(requiredFields) && requiredFields.length > 0) {
      return requiredFields;
    }

    if (step === "verify_student_identity") {
      return DEFAULT_REQUIRED_FIELDS.verify_student_identity;
    }

    if (step === "verify_student_email") {
      return DEFAULT_REQUIRED_FIELDS.verify_student_email;
    }

    if (step === "verify_school_email") {
      return DEFAULT_REQUIRED_FIELDS.verify_school_email;
    }

    if (step === "reset_password") {
      return DEFAULT_REQUIRED_FIELDS.reset_password;
    }

    return ["identifier"];
  }, [requiredFields, step]);

  const resetStepFields = React.useCallback(() => {
    setRequiredFields([]);
    setChallengeToken("");
    setResetToken("");
    setStatusMessage("");
    setPasswordType("password");
    setPasswordConfirmationType("password");
    setFormField((prev) => ({
      ...prev,
      father_cnic: "",
      dob: "",
      code: "",
      password: "",
      password_confirmation: "",
    }));
  }, []);

  const moveToIdentifyStep = React.useCallback(() => {
    setStep("identify");
    setError("");
    setNoRecoveryEmail(false);
    resetStepFields();
  }, [resetStepFields]);

  const applyStepFromResponse = React.useCallback((response) => {
    const data = response?.data ?? {};
    const nextStep = data?.next_step;
    const nextRequiredFields = Array.isArray(data?.required_fields)
      ? data.required_fields
      : [];

    setStatusMessage(response?.message ?? "");
    setRequiredFields(nextRequiredFields);

    if (nextStep === "verify_student_identity") {
      const nextChallengeToken = data?.challenge_token ?? "";
      if (!nextChallengeToken) {
        throw new Error("Challenge token is missing in response.");
      }

      setChallengeToken(nextChallengeToken);
      setResetToken("");
      setStep("verify_student_identity");
      setFormField((prev) => ({
        ...prev,
        father_cnic: "",
        dob: "",
        code: "",
        password: "",
        password_confirmation: "",
      }));
      return;
    }

    // NEW: handle verify_student_email step
    if (nextStep === "verify_student_email") {
      const nextChallengeToken = data?.challenge_token ?? "";
      if (!nextChallengeToken) {
        throw new Error("Challenge token is missing in response.");
      }

      setChallengeToken(nextChallengeToken);
      setResetToken("");
      setStep("verify_student_email");
      setFormField((prev) => ({
        ...prev,
        father_cnic: "",
        dob: "",
        code: "",
        password: "",
        password_confirmation: "",
      }));
      return;
    }

    if (nextStep === "verify_school_email") {
      const nextChallengeToken = data?.challenge_token ?? "";
      if (!nextChallengeToken) {
        throw new Error("Challenge token is missing in response.");
      }

      setChallengeToken(nextChallengeToken);
      setResetToken("");
      setStep("verify_school_email");
      setFormField((prev) => ({
        ...prev,
        father_cnic: "",
        dob: "",
        code: "",
        password: "",
        password_confirmation: "",
      }));
      return;
    }

    if (nextStep === "reset_password") {
      const nextResetToken = data?.reset_token ?? "";
      if (!nextResetToken) {
        throw new Error("Reset token is missing in response.");
      }

      setResetToken(nextResetToken);
      setChallengeToken("");
      setStep("reset_password");
      setFormField((prev) => ({
        ...prev,
        code: "",
        password: "",
        password_confirmation: "",
      }));
      return;
    }

    throw new Error("Unexpected server response. Please try again.");
  }, []);

  const handleIdentifySubmit = async () => {
    const identifier = formField.identifier?.trim() ?? "";

    if (!identifier) {
      throw new Error("Please enter your identifier.");
    }

    const response = await forgotPasswordCheckIdentity({ identifier });
    applyStepFromResponse(response);
    toast.success(response?.message || "Identity verified successfully.");
  };

  const handleStudentVerificationSubmit = async () => {
    if (!challengeToken) {
      throw new Error("Challenge token is missing. Please start again.");
    }

    const fieldsToSubmit =
      stepRequiredFields.length > 0
        ? stepRequiredFields
        : DEFAULT_REQUIRED_FIELDS.verify_student_identity;
    const payload = { challenge_token: challengeToken };

    fieldsToSubmit.forEach((fieldName) => {
      const value = (formField[fieldName] ?? "").toString().trim();
      if (!value) {
        throw new Error(`${toFieldLabel(fieldName)} is required.`);
      }
      payload[fieldName] = value;
    });

    const response = await forgotPasswordStudentVerification(payload);
    applyStepFromResponse(response);
    toast.success(response?.message || "Student identity verified.");
  };

  // NEW: handler for verify_student_email step
  const handleStudentEmailVerificationSubmit = async () => {
    if (!challengeToken) {
      throw new Error("Challenge token is missing. Please start again.");
    }

    const code = formField.code?.trim() ?? "";
    if (!code) {
      throw new Error("Verification code is required.");
    }

    const payload = {
      challenge_token: challengeToken,
      code,
    };

    const response = await forgotPasswordStudentEmailVerification(payload);
    applyStepFromResponse(response);
    toast.success(response?.message || "Email verified successfully.");
  };

  const handleSchoolVerificationSubmit = async () => {
    if (!challengeToken) {
      throw new Error("Challenge token is missing. Please start again.");
    }

    const fieldsToSubmit =
      stepRequiredFields.length > 0
        ? stepRequiredFields
        : DEFAULT_REQUIRED_FIELDS.verify_school_email;
    const payload = { challenge_token: challengeToken };

    fieldsToSubmit.forEach((fieldName) => {
      const value = (formField[fieldName] ?? "").toString().trim();
      if (!value) {
        throw new Error(`${toFieldLabel(fieldName)} is required.`);
      }
      payload[fieldName] = value;
    });

    const response = await forgotPasswordSchoolVerification(payload);
    applyStepFromResponse(response);
    toast.success(response?.message || "School email verified.");
  };

  const handleResetPasswordSubmit = async () => {
    if (!resetToken) {
      throw new Error("Reset token is missing. Please start again.");
    }

    const fieldsToSubmit =
      stepRequiredFields.length > 0
        ? stepRequiredFields
        : DEFAULT_REQUIRED_FIELDS.reset_password;
    const payload = { reset_token: resetToken };

    fieldsToSubmit.forEach((fieldName) => {
      const value = (formField[fieldName] ?? "").toString().trim();
      if (!value) {
        throw new Error(`${toFieldLabel(fieldName)} is required.`);
      }
      payload[fieldName] = value;
    });

    if (
      payload.password !== undefined &&
      payload.password_confirmation !== undefined &&
      payload.password !== payload.password_confirmation
    ) {
      throw new Error("Password and confirm password must match.");
    }

    const response = await forgotPasswordReset(payload);
    toast.success(response?.message || "Password reset successful.");
    navigate("/login", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatusMessage("");

    try {
      if (step === "identify") {
        await handleIdentifySubmit();
      } else if (step === "verify_student_identity") {
        await handleStudentVerificationSubmit();
      } else if (step === "verify_student_email") {
        await handleStudentEmailVerificationSubmit();
      } else if (step === "verify_school_email") {
        await handleSchoolVerificationSubmit();
      } else if (step === "reset_password") {
        await handleResetPasswordSubmit();
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to process your request.";

      const isNoRecoveryEmail =
        err?.response?.data?.status === false &&
        typeof err?.response?.data?.message === "string" &&
        err.response.data.message
          .toLowerCase()
          .includes("recovery email is not available");

      if (isNoRecoveryEmail) {
        setNoRecoveryEmail(true);
        return;
      }

      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderRegularField = (fieldName) => {
    const isIdentifier = fieldName === "identifier";
    const isDateField = fieldName === "dob";
    const isCodeField = fieldName === "code";
    const fieldType = isDateField ? "date" : "text";

    return (
      <div className="form-group mb-3" key={fieldName}>
        <label>
          <div>
            {isIdentifier ? <MailIcon size={17} /> : null}
            {toFieldLabel(fieldName)}
          </div>
        </label>
        <input
          type={fieldType}
          className="form-input"
          name={fieldName}
          value={formField[fieldName] ?? ""}
          onChange={handleChange}
          placeholder={
            isIdentifier
              ? "Enter username"
              : isCodeField
                ? "Enter OTP"
                : undefined
          }
          autoComplete={
            isIdentifier ? "username" : isCodeField ? "one-time-code" : "off"
          }
          inputMode={isCodeField ? "numeric" : undefined}
          maxLength={isCodeField ? 6 : undefined}
        />
      </div>
    );
  };

  const renderPasswordField = (fieldName) => {
    const isConfirmation = fieldName === "password_confirmation";
    const currentType = isConfirmation
      ? passwordConfirmationType
      : passwordType;
    const toggleType = isConfirmation
      ? handleShowPasswordConfirmationToggle
      : handleShowPasswordToggle;

    return (
      <div className="form-group relative mb-3" key={fieldName}>
        <label>
          <div>
            <Lock size={17} />
            {toFieldLabel(fieldName)}
          </div>
        </label>
        <input
          type={currentType}
          className="form-input"
          name={fieldName}
          value={formField[fieldName] ?? ""}
          onChange={handleChange}
          autoComplete={isConfirmation ? "new-password" : "off"}
        />
        <button
          type="button"
          className="text-slate-400 cursor-pointer password-eye"
          onClick={toggleType}
        >
          {currentType === "password" ? (
            <EyeClosed size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>
      </div>
    );
  };

  const renderField = (fieldName) => {
    if (fieldName === "password" || fieldName === "password_confirmation") {
      return renderPasswordField(fieldName);
    }

    return renderRegularField(fieldName);
  };

  return (
    <div className="login-wrap">
      <div className="login-left relative">
        <img src={loginBanner} alt="Sketch" />
      </div>
      <div className="login-right">
        {noRecoveryEmail ? (
          <div className="flex flex-col">
            <div className="heading_signIn mb-6">
              <h1 className="heading_signIn_h1">Contact Us</h1>
              <p className="text-sm text-slate-500 mt-2">
                We couldn't find an email linked to this account. To reset your
                password, please contact us on WhatsApp or SMS at{" "}
                <a
                  href="https://wa.me/923217276806"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#AD474B] font-medium hover:underline"
                >
                  +92 321 7276806
                </a>
                , and our team will help you get back in quickly.
              </p>
            </div>
            <Link
              to="/login"
              className="btn-submit flex items-center justify-center gap-1 !p-[12px] !no-underline"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="heading_signIn mb-8">
              <Link
                to="/login"
                className="flex items-center gap-1 text-sm mb-2 text-[#AD474B]"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </Link>
              <h1 className="heading_signIn_h1">{STEP_TITLE[step]}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {STEP_DESCRIPTION[step]}
              </p>
            </div>

            {error && (
              <Alert
                variant="destructive"
                className="alert-custom mb-4 bg-[#FDF7EC]"
              >
                <AlertCircleIcon size={18} />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            {statusMessage && !error ? (
              <div className="mb-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {statusMessage}
              </div>
            ) : null}

            {step === "identify" ? renderField("identifier") : null}
            {step !== "identify"
              ? stepRequiredFields.map((fieldName) => renderField(fieldName))
              : null}

            <button
              type="submit"
              className="btn-submit flex items-center justify-center gap-1 !p-[12px]"
              disabled={loading}
            >
              {loading ? (
                <>
                  Please wait
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>{STEP_BUTTON_LABEL[step]}</>
              )}
            </button>

            {step !== "identify" ? (
              <button
                type="button"
                onClick={moveToIdentifyStep}
                className="mt-3 w-full text-sm text-[#AD474B] hover:underline"
                disabled={loading}
              >
                Change identifier
              </button>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
