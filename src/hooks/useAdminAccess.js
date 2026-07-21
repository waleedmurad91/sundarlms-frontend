import { useCallback, useMemo } from "react";
import { useAuthStore } from "@/store/auth";
import { useShallow } from "zustand/react/shallow";
import {
  getRoleHomePath,
  hasAnyAdminPermission,
  hasAdminPermission,
  hasAdminShellAccess,
} from "@/utils/adminRbac";

export const useAdminAccess = () => {
  const authSlice = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      role: state.role,
      accessRole: state.accessRole,
      permissions: state.permissions,
      permissionMatrix: state.permissionMatrix,
      navigation: state.navigation,
    })),
  );

  const authState = useMemo(() => authSlice, [authSlice]);

  const can = useCallback(
    (moduleKey, action = "read") =>
      hasAdminPermission(authState, moduleKey, action),
    [authState],
  );

  const canAny = useCallback(
    (moduleKeys, action = "read") =>
      hasAnyAdminPermission(authState, moduleKeys, action),
    [authState],
  );

  return {
    authState,
    can,
    canAny,
    hasAdminShellAccess: hasAdminShellAccess(authState),
    homePath: getRoleHomePath(authState),
  };
};
