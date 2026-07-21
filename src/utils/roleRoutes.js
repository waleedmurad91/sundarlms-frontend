const normalizeText = (value) => String(value ?? "").trim();

export const normalizeRouteRole = (role) =>
  normalizeText(role)
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

const ROLE_ROUTE_SEGMENTS = {
  admin: "admin",
  staff: "staff",
  teacher: "teacher",
  school: "school",
  student: "student",
  data_entry: "data-entry",
  reviewer: "reviewer",
};

const ROUTE_SEGMENT_TO_ROLE = Object.entries(ROLE_ROUTE_SEGMENTS).reduce(
  (accumulator, [role, segment]) => ({
    ...accumulator,
    [segment]: role,
  }),
  {},
);

const RESERVED_ROUTE_SEGMENTS = new Set([
  "app",
  "login",
  "signup",
  "signup-student",
  "signup-school",
  "forgot-password",
  "auth",
  "rmc",
  "pmc",
  "prizes",
  "vss",
  "ilm",
  "about-us",
  "pkm-privacy-policy",
  "certificate",
  "test",
  "result",
]);

const getNormalizedPathname = (pathname) => {
  const normalizedPath = normalizeText(pathname);
  const [pathWithoutQuery = ""] = normalizedPath.split(/[?#]/);

  return pathWithoutQuery;
};

export const getRoleRouteSegment = (role) => {
  const normalizedRole = normalizeRouteRole(role);
  if (!normalizedRole) {
    return "";
  }

  return ROLE_ROUTE_SEGMENTS[normalizedRole] ?? normalizedRole;
};

export const getRoleBasePath = (role) => {
  const segment = getRoleRouteSegment(role);
  return segment ? `/${segment}` : "";
};

export const getRouteRoleFromSegment = (segment) => {
  const normalizedSegment = normalizeText(segment).toLowerCase();

  if (!normalizedSegment) {
    return null;
  }

  if (ROUTE_SEGMENT_TO_ROLE[normalizedSegment]) {
    return ROUTE_SEGMENT_TO_ROLE[normalizedSegment];
  }

  if (RESERVED_ROUTE_SEGMENTS.has(normalizedSegment)) {
    return null;
  }

  return normalizeRouteRole(normalizedSegment);
};

export const getRouteRoleFromPath = (pathname) => {
  const normalizedPath = getNormalizedPathname(pathname);
  const segment = normalizedPath.split("/").filter(Boolean)[0]?.toLowerCase();

  return getRouteRoleFromSegment(segment);
};

export const isRoleScopedPath = (pathname) =>
  Boolean(getRouteRoleFromPath(pathname));

export const stripRoleBasePath = (pathname) => {
  const normalizedPath = getNormalizedPathname(pathname);
  const pathSegments = normalizedPath.split("/").filter(Boolean);
  const firstSegment = pathSegments[0];

  if (!getRouteRoleFromSegment(firstSegment)) {
    return "";
  }

  const remainder = pathSegments.slice(1).join("/");
  return remainder ? `/${remainder}` : "/";
};

export const rebasePathToRole = (pathname, role) => {
  const normalizedPath = getNormalizedPathname(pathname);
  const targetBasePath = getRoleBasePath(role);

  if (!normalizedPath || !targetBasePath) {
    return normalizedPath;
  }

  const roleScopedSuffix = stripRoleBasePath(normalizedPath);
  if (roleScopedSuffix) {
    return roleScopedSuffix === "/"
      ? targetBasePath
      : `${targetBasePath}${roleScopedSuffix}`;
  }

  if (normalizedPath.startsWith("/")) {
    return `${targetBasePath}${normalizedPath}`;
  }

  return `${targetBasePath}/${normalizedPath.replace(/^\/+/, "")}`;
};
