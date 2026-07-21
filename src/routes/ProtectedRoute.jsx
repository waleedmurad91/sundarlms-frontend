import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import {
  canAccessAdminPath,
  getRoleHomePath,
  hasAdminShellAccess,
  isRoleScopedAdminPath,
  normalizeRole,
} from "@/utils/adminRbac";
import { rebasePathToRole } from "@/utils/roleRoutes";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const {
    accessRole,
    checkAuth,
    isAuthenticated,
    // justLoggedIn, // ✅ removed — no longer needed, was causing double refresh
    loading,
    navigation,
    permissionMatrix,
    permissions,
    role,
    user,
  } = useAuthStore();
  const [hasChecked, setHasChecked] = useState(false);

  // useEffect(() => {
  //   const initCheck = async () => {
  //     // Skip check if the user just logged in because the token is fresh
  //     if (justLoggedIn) {
  //       setHasChecked(true);
  //       return;
  //     }
  //
  //     await checkAuth(); // Validate token on reloads
  //     setHasChecked(true);
  //   };
  //
  //   initCheck();
  // }, [checkAuth, justLoggedIn]);
  // ❌ Problem: justLoggedIn in deps caused this to re-run after the 2s timeout
  //    in the store (setTimeout(() => set({ justLoggedIn: false }), 2000))
  //    which triggered a second checkAuth() call → double refresh

  // ✅ Fixed: run only once on mount with empty deps
  // If already authenticated (just logged in) → skip checkAuth
  // If page was refreshed → isAuthenticated is false → run checkAuth to validate token
  useEffect(() => {
    const initCheck = async () => {
      if (isAuthenticated) {
        // Already authenticated (fresh login) — no need to re-validate
        setHasChecked(true);
        return;
      }

      await checkAuth(); // Validate token on page refresh/reload
      setHasChecked(true);
    };

    initCheck();
  }, []); // ✅ empty deps — only runs once on mount, never on justLoggedIn change

  // Only show loader while authentication status is being confirmed
  // if (!hasChecked || (loading && !justLoggedIn)) { // ✅ removed justLoggedIn condition
  if (!hasChecked || loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-white">
        <Loader2 size={28} className="animate-spin text-gray-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = normalizeRole(role ?? user?.role);
  // Determine effective role based on access_mode for routing
  let effectiveRole = userRole;
  if (user?.access_mode === "teacher") {
    effectiveRole = "teacher";
  } else if (user?.access_mode === "learner") {
    effectiveRole = "student";
  }
  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map(normalizeRole).filter(Boolean)
    : [];
  const authState = {
    accessRole,
    navigation,
    permissionMatrix,
    permissions,
    role: effectiveRole,
    user,
  };
  const isAdminArea = location.pathname.startsWith("/admin");
  const isRoleScopedArea = isRoleScopedAdminPath(location.pathname);
  const hasCustomAdminAccess =
    (isAdminArea || isRoleScopedArea) &&
    normalizedAllowedRoles.includes("admin") &&
    hasAdminShellAccess(authState);

  if (
    normalizedAllowedRoles.length > 0 &&
    (!effectiveRole ||
      (!normalizedAllowedRoles.includes(effectiveRole) &&
        !hasCustomAdminAccess))
  ) {
    return <Navigate to={getRoleHomePath(authState)} replace />;
  }

  if (isAdminArea && userRole && userRole !== "admin") {
    if (location.pathname === "/admin") {
      return <Navigate to={getRoleHomePath(authState)} replace />;
    }

    const preferredPath = rebasePathToRole(location.pathname, userRole);
    if (
      preferredPath &&
      preferredPath !== location.pathname &&
      canAccessAdminPath(authState, location.pathname)
    ) {
      return <Navigate to={preferredPath} replace />;
    }
  }

  if (isRoleScopedArea && !canAccessAdminPath(authState, location.pathname)) {
    return <Navigate to={getRoleHomePath(authState)} replace />;
  }

  return children;
};

export default ProtectedRoute;
