import { useAuthStore } from "@/store/auth";
import { callAccessMode } from "@/api/authApi";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const AccessModeSwitcher = () => {
  const { user, role, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Determine if the user is a teacher: check rbac_roles (case-insensitive) or current active role
  const rbacRoles = (user?.rbac_roles || []).map(r => String(r).toLowerCase());
  const isTeacher = rbacRoles.includes("teacher") || role === "teacher";
  if (!isTeacher) {
    return null;
  }

  // Determine current access mode (teacher or learner). Fallback to role if access_mode not set.
  const currentAccessMode = user?.access_mode || role || "teacher";
  const isTeacherMode = currentAccessMode === "teacher";

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      // Determine the target mode we want to switch to
      const targetMode = isTeacherMode ? "learner" : "teacher";
      await callAccessMode(targetMode);
      // Refresh user data from server to get updated role/access_mode
      await checkAuth({ silent: true });
      toast.success(`Switched to ${targetMode} mode`);
      // Redirect to the appropriate dashboard based on new mode
      if (targetMode === "learner") {
        navigate("/student/dashboard");
      } else {
        navigate("/teacher/dashboard");
      }
    } catch (error) {
      console.error("Failed to toggle access mode:", error);
      toast.error("Failed to switch mode. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Teacher</span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        aria-pressed={isTeacherMode}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isTeacherMode ? "bg-gray-200" : "bg-blue-600"
        }`}
      >
        <span className="sr-only">Toggle between teacher and learner mode</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isTeacherMode ? "translate-x-0" : "translate-x-5"
          }`}
        />
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          </span>
        )}
      </button>
      <span className="text-sm font-medium text-gray-700">Student</span>
    </div>
  );
};

export default AccessModeSwitcher;
