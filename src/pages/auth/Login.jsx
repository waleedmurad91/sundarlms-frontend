import React from "react";
import {
  AlertCircleIcon,
  Eye,
  EyeClosed,
  Loader2,
  Lock,
  LogInIcon,
  MailIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import loginBanner from "@/assets/signin-image.png";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { useAuthStore } from "@/store/auth";
import ilmLogo from "@/assets/ilm-logo-red.png";
import { GoogleLogin } from "@react-oauth/google";

const MOBILE_BREAKPOINT = 768;

const Login = () => {
  const navigate = useNavigate();
  const { login, googleLogin, isAuthenticated, user, role } = useAuthStore();
  const hasRedirected = React.useRef(false);
  const navigateRef = React.useRef(navigate); // ✅ stable ref to avoid useEffect re-runs

  // keep navigateRef current without causing re-renders
  React.useLayoutEffect(() => {
    navigateRef.current = navigate;
  });

  const [formField, setFormField] = React.useState({
    identifier: "",
    password: "",
  });

  const [passwordType, setPasswordType] = React.useState("password");
  const handleShowPasswordToggle = () => {
    setPasswordType((prev) => (prev === "password" ? "text" : "password"));
  };

  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // ✅ New: mobile-only dynamic width for the Google button.
  // Desktop keeps the original behavior (no width prop passed to GoogleLogin).
  const googleWrapperRef = React.useRef(null);
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== "undefined"
      ? window.innerWidth <= MOBILE_BREAKPOINT
      : false,
  );
  const [googleBtnWidth, setGoogleBtnWidth] = React.useState(undefined);

  React.useEffect(() => {
    const updateGoogleBtnSizing = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);

      if (mobile && googleWrapperRef.current) {
        // Google caps its rendered width at 400px, so clamp to that.
        const measuredWidth = googleWrapperRef.current.offsetWidth;
        setGoogleBtnWidth(Math.min(measuredWidth, 400));
      } else {
        // Desktop: don't pass a width, preserving original default behavior.
        setGoogleBtnWidth(undefined);
      }
    };

    updateGoogleBtnSizing();
    window.addEventListener("resize", updateGoogleBtnSizing);
    return () => window.removeEventListener("resize", updateGoogleBtnSizing);
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && (user?.role ?? role) && !hasRedirected.current) {
      hasRedirected.current = true;
      navigateRef.current("/app", { replace: true });
    }
  }, [isAuthenticated, user, role]); // ✅ no navigate/redirectToRoleHome in deps

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormField({ ...formField, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const identifier = formField.identifier?.trim() ?? "";
    const password = formField.password ?? "";

    if (!identifier || !password) {
      setError("Please fill in all fields");
      toast.error("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const res = await login({ identifier, password });
      if (!res?.user) {
        setError("Invalid credentials. Please try again.");
        toast.error("Invalid credentials");
      } else {
        toast.success(`Welcome back, ${res.user.name}!`);
        // ✅ no redirectToRoleHome() here — useEffect handles it
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Please check your internet connection and try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async ({ credential }) => {
    setGoogleLoading(true);
    setError("");
    try {
      await googleLogin(credential);
      // isAuthenticated → true → useEffect above redirects to /app
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Google login failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    const msg = "Google sign-in was cancelled or failed.";
    setError(msg);
    toast.error(msg);
  };

  return (
    <div className="login-wrap">
      <div className="login-left relative">
        <img src={loginBanner} alt="Login Banner" />
      </div>
      <div className="login-right auth-pad !md:py-0 my-auto">
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
            <div className="heading_signIn mb-4">
              <h1 className="heading_signIn_h1 flex gap-2">
                <span>
                  <img
                    src={ilmLogo}
                    alt="ILM logo"
                    className="h-[40px] object-scale-down"
                  />
                </span>
                Get Started Now!
              </h1>
              <p className="heading_signIn_para">
                Please login to your account to continue.
              </p>
            </div>

            {googleLoading ? (
              <div className="flex items-center justify-center gap-2 py-2 text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in with Google...
              </div>
            ) : (
              <div className="google-login-custom mb-4">
                {/* Custom visual button — matches the login design */}
                <span
                  className="google-login-custom__visual"
                  aria-hidden="true"
                >
                  <svg
                    className="google-login-custom__logo"
                    viewBox="0 0 48 48"
                    width="20"
                    height="20"
                  >
                    <path
                      fill="#FFC107"
                      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                    />
                  </svg>
                  <span className="google-login-custom__text">
                    Sign in with Google
                  </span>
                </span>

                {/* Invisible official Google button — statically covers the ENTIRE
                    custom button so ANY click lands on it and yields the credential
                    JWT the backend expects. No cursor tracking needed.
                    On mobile only: width is measured dynamically and the wrapper is
                    centered so the invisible button lines up with the custom one
                    at any screen size. Desktop behavior is unchanged. */}
                <div
                  className="google-login-custom__ghost"
                  ref={googleWrapperRef}
                  style={
                    isMobile
                      ? {
                          display: "flex",
                          justifyContent: "center",
                          width: "100%",
                        }
                      : undefined
                  }
                >
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    shape="circle"
                    logo_alignment="center"
                    auto_select={false}
                    use_fedcm_for_prompt={false}
                    {...(isMobile ? { width: googleBtnWidth } : {})}
                  />
                </div>
              </div>
            )}
            <div className="my-3 flex items-center gap-2">
              <hr className="flex-1 border-gray-200" />
              <span className="text-sm text-gray-400">OR</span>
              <hr className="flex-1 border-gray-200" />
            </div>
            <div className="form-group mb-3">
              <label>
                <div>
                  <MailIcon size={17} />
                  Username / Form-B
                </div>
              </label>
              <input
                type="text"
                className="form-input"
                name="identifier"
                value={formField.identifier}
                onChange={handleChange}
                autoComplete="username"
              />
              <div className="reg-hint pl-2 mt-1 text-[12px] text-gray-500 italic">
                Please enter your Form-B without dashes.
              </div>
            </div>

            <div className="form-group relative mb-3">
              <label>
                <div>
                  <Lock size={17} />
                  Password
                </div>
              </label>
              <input
                type={passwordType}
                className="form-input"
                name="password"
                value={formField.password}
                onChange={handleChange}
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

            <button
              type="submit"
              className="btn-submit flex items-center justify-center gap-1 !p-[12px]"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <>
                  Please wait
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Sign In
                  <LogInIcon size={18} />
                </>
              )}
            </button>

            <Link
              to="/forgot-password"
              className="text-[16px] rounded-[6px] font-medium mb-4 cursor-pointer p-[12px] flex items-center justify-center bg-[#EFEFEF] text-gray-800 mt-2"
            >
              Forgot Password?
            </Link>

            <p className="text-sm text-gray-500 mt-3">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#AD474B] border-b border-[#AD474B]"
              >
                Create Account
              </Link>
            </p>
          </>
        </form>
      </div>
    </div>
  );
};

export default Login;
