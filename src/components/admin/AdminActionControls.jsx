import React from "react";
import {
  Link as RouterLink,
  useLocation,
  useResolvedPath,
} from "react-router-dom";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  canAccessAdminPath,
  getAdminListActionConfig,
} from "@/utils/adminRbac";
import { getRouteRoleFromPath, rebasePathToRole } from "@/utils/roleRoutes";

const buildPathWithQuery = ({ pathname = "", search = "", hash = "" }) =>
  `${pathname}${search}${hash}`;

const resolveScopedPathname = (pathname, currentPathname) => {
  const currentRouteRole = getRouteRoleFromPath(currentPathname);

  if (
    currentRouteRole &&
    currentRouteRole !== "admin" &&
    String(pathname ?? "").startsWith("/admin")
  ) {
    return rebasePathToRole(pathname, currentRouteRole);
  }

  return pathname;
};

export const AdminActionLink = React.forwardRef(
  ({ action = "read", fallback = null, module = null, to, ...props }, ref) => {
    const location = useLocation();
    const resolvedPath = useResolvedPath(to);
    const { authState, can } = useAdminAccess();

    const resolvedPathname = resolveScopedPathname(
      resolvedPath.pathname,
      location.pathname,
    );
    const resolvedTo = buildPathWithQuery({
      pathname: resolvedPathname,
      search: resolvedPath.search,
      hash: resolvedPath.hash,
    });

    if (module && !can(module, action)) {
      return fallback;
    }

    if (!canAccessAdminPath(authState, resolvedPathname)) {
      return fallback;
    }

    return <RouterLink ref={ref} to={resolvedTo} {...props} />;
  },
);

AdminActionLink.displayName = "AdminActionLink";

export const AdminDeleteGuard = ({
  action = "delete",
  children,
  fallback = null,
  module,
}) => {
  const location = useLocation();
  const { can } = useAdminAccess();

  const resolvedModule =
    module ?? getAdminListActionConfig(location.pathname)?.module ?? null;

  if (!resolvedModule) {
    return children;
  }

  return can(resolvedModule, action) ? children : fallback;
};
