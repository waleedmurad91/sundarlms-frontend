import { matchPath } from "react-router-dom";
import {
  getFirstNavigationPath,
  hasNavigationPath,
  normalizeNavigationSections,
  resolveRoleNavigation,
} from "@/utils/roleLinks";
import {
  getRouteRoleFromPath,
  rebasePathToRole,
  stripRoleBasePath,
} from "@/utils/roleRoutes";

const normalizeText = (value) => String(value ?? "").trim();

export const normalizeRole = (role) =>
  normalizeText(role).toLowerCase().replace(/[^a-z0-9]+/g, "_");

const normalizeIdentifier = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

const ACTION_ALIASES = {
  read: ["read", "view", "list"],
  view: ["read", "view", "list"],
  create: ["create", "add"],
  add: ["create", "add"],
  update: ["update", "edit"],
  edit: ["update", "edit"],
  delete: ["delete", "remove"],
  manage: ["manage", "all"],
  all: ["all", "manage"],
};

const MODULE_ALIASES = {
  dashboard: ["dashboard"],
  users: ["users", "system_users"],
  roles: ["roles", "rbac_roles", "access_roles"],
  schools: ["schools", "school"],
  teachers: ["teachers", "teacher"],
  students: ["students", "student", "centralized_students"],
  classes: ["classes", "class"],
  subjects: ["subjects", "subject"],
  staff: ["staff"],
  certificates: ["certificates", "certificate"],
  provinces: ["provinces", "province", "locations"],
  districts: ["districts", "district", "locations"],
  tehsils: ["tehsils", "tehsil", "locations"],
  cities: ["cities", "city", "locations"],
  cluster_areas: ["cluster_areas", "cluster_area", "clusters", "locations"],
  units: ["units", "unit"],
  topics: ["topics", "topic"],
  questions: ["questions", "question"],
  assessment_questions: [
    "assessment_questions",
    "assessment_question",
    "assessment_questions_management",
  ],
  assessments: ["assessments", "assessment"],
  quizzes: ["quizzes", "quiz"],
  unit_tests: ["unit_tests", "unit_test", "unittests"],
  student_registrations: ["student_registrations", "student_registration"],
  student_signups: ["student_signups", "student_signup"],
  school_registrations: ["school_registrations", "school_registration"],
  pmc_sessions: ["pmc_sessions", "pmc_session"],
  rmc_sessions: ["rmc_sessions", "rmc_session"],
  news_stories: ["news_stories", "news_story", "news", "news_updates"],
  gallery: ["gallery", "galleries"],
  analytics: ["analytics", "reports"],
  badges: ["badges", "badge"],
  rmc_participants: [
    "rmc_participants",
    "rmc_participation",
    "rmc_joiners",
  ],
  profile: ["profile"],
};

const ADMIN_RESOURCE_DEFINITIONS = [
  {
    module: "dashboard",
    listPaths: ["/admin/dashboard"],
    hideStandardDelete: false,
  },
  {
    module: "users",
    listPaths: ["/admin/user-lists"],
    hideStandardDelete: false,
  },
  {
    module: "roles",
    listPaths: ["/admin/role-lists"],
    formPath: "/admin/add-new-role-form/:id?",
    formHrefPrefixes: ["/admin/add-new-role-form"],
    detailPath: "/admin/view-role-detail/:id?",
    detailHrefPrefixes: ["/admin/view-role-detail"],
  },
  {
    module: "schools",
    listPaths: ["/admin/school-lists"],
    formPath: "/admin/add-new-school/:id?",
    formHrefPrefixes: ["/admin/add-new-school"],
    detailPath: "/admin/view-school-detail/:id?",
    detailHrefPrefixes: ["/admin/view-school-detail"],
  },
  {
    module: "classes",
    listPaths: ["/admin/class-lists"],
    formPath: "/admin/add-new-class/:id?",
    formHrefPrefixes: ["/admin/add-new-class"],
    detailPath: "/admin/view-class-detail/:id?",
    detailHrefPrefixes: ["/admin/view-class-detail"],
  },
  {
    module: "teachers",
    listPaths: ["/admin/teacher-lists"],
    formPath: "/admin/add-new-teacher/:id?",
    formHrefPrefixes: ["/admin/add-new-teacher"],
    detailPath: "/admin/view-teacher-detail/:id?",
    detailHrefPrefixes: ["/admin/view-teacher-detail"],
  },
  {
    module: "students",
    listPaths: ["/admin/student-lists"],
    formPath: "/admin/add-new-student/:id?",
    formHrefPrefixes: ["/admin/add-new-student"],
    detailPath: "/admin/view-student-detail/:id?",
    detailHrefPrefixes: ["/admin/view-student-detail"],
  },
  {
    module: "students",
    listPaths: ["/admin/centralized-student-lists"],
    formPath: "/admin/centralized-student-form/:id?",
    formHrefPrefixes: ["/admin/centralized-student-form"],
    detailPath: "/admin/view-centralized-student-detail/:id?",
    detailHrefPrefixes: ["/admin/view-centralized-student-detail"],
  },
  {
    module: "provinces",
    listPaths: ["/admin/province-lists"],
    formPath: "/admin/add-new-province/:id?",
    formHrefPrefixes: ["/admin/add-new-province"],
  },
  {
    module: "districts",
    listPaths: ["/admin/district-lists"],
    formPath: "/admin/add-new-district/:id?",
    formHrefPrefixes: ["/admin/add-new-district"],
  },
  {
    module: "tehsils",
    listPaths: ["/admin/tehsil-lists"],
    formPath: "/admin/add-new-tehsil/:id?",
    formHrefPrefixes: ["/admin/add-new-tehsil"],
  },
  {
    module: "cities",
    listPaths: ["/admin/city-lists"],
    formPath: "/admin/add-new-city/:id?",
    formHrefPrefixes: ["/admin/add-new-city"],
  },
  {
    module: "cluster_areas",
    listPaths: ["/admin/cluster-area-lists"],
    formPath: "/admin/add-new-cluster-area/:id?",
    formHrefPrefixes: ["/admin/add-new-cluster-area"],
  },
  {
    module: "subjects",
    listPaths: ["/admin/subject-lists"],
    formPath: "/admin/add-new-subject/:id?",
    formHrefPrefixes: ["/admin/add-new-subject"],
    detailPath: "/admin/view-subject-detail/:id?",
    detailHrefPrefixes: ["/admin/view-subject-detail"],
  },
  {
    module: "staff",
    listPaths: ["/admin/staff-lists"],
    formPath: "/admin/add-new-staff/:id?",
    formHrefPrefixes: ["/admin/add-new-staff"],
  },
  {
    module: "certificates",
    listPaths: ["/admin/certificate-lists"],
    formPath: "/admin/add-new-certificate/:id?",
    formHrefPrefixes: ["/admin/add-new-certificate"],
    detailPath: "/admin/view-certificate-detail/:id?",
    detailHrefPrefixes: ["/admin/view-certificate-detail"],
  },
  {
    module: "rmc_participants",
    listPaths: ["/admin/rmc-participation-lists"],
    detailPath: "/admin/view-rmc-detail/:id?",
    detailHrefPrefixes: ["/admin/view-rmc-detail"],
  },
  {
    module: "units",
    listPaths: ["/admin/unit-lists"],
    formPath: "/admin/add-new-unit/:id?",
    formHrefPrefixes: ["/admin/add-new-unit"],
    detailPath: "/admin/view-unit-detail/:id?",
    detailHrefPrefixes: ["/admin/view-unit-detail"],
  },
  {
    module: "topics",
    listPaths: ["/admin/topic-lists"],
    formPath: "/admin/add-new-topic/:id?",
    formHrefPrefixes: ["/admin/add-new-topic"],
    detailPath: "/admin/view-topic-detail/:id?",
    detailHrefPrefixes: ["/admin/view-topic-detail"],
  },
  {
    module: "questions",
    listPaths: ["/admin/question-lists"],
    formPath: "/admin/add-new-question/:id?",
    formHrefPrefixes: ["/admin/add-new-question"],
    detailPath: "/admin/view-question-detail/:id?",
    detailHrefPrefixes: ["/admin/view-question-detail"],
  },
  {
    module: "assessment_questions",
    listPaths: ["/admin/assessment-question-lists"],
    formPath: "/admin/add-new-assessment-question/:id?",
    formHrefPrefixes: ["/admin/add-new-assessment-question"],
    detailPath: "/admin/view-assessment-question-detail/:id?",
    detailHrefPrefixes: ["/admin/view-assessment-question-detail"],
  },
  {
    module: "assessments",
    listPaths: ["/admin/assessment-lists"],
    formPath: "/admin/add-new-assessment/:id?",
    formHrefPrefixes: ["/admin/add-new-assessment"],
    detailPath: "/admin/view-assessment-detail/:id?",
    detailHrefPrefixes: ["/admin/view-assessment-detail"],
  },
  {
    module: "quizzes",
    listPaths: ["/admin/quiz-lists"],
    formPath: "/admin/add-new-quiz/:id?",
    formHrefPrefixes: ["/admin/add-new-quiz"],
  },
  {
    module: "unit_tests",
    listPaths: ["/admin/unit-test-lists"],
    formPath: "/admin/add-new-unitTest/:id?",
    formHrefPrefixes: ["/admin/add-new-unitTest"],
  },
  {
    module: "student_registrations",
    listPaths: [
      "/admin/student-registrations-rmc",
      "/admin/student-registrations-vss",
      "/admin/student-registrations-pmc",
    ],
    formPath: "/admin/student-registration-form/:id?",
    formHrefPrefixes: ["/admin/student-registration-form"],
    detailPath: "/admin/student-registration-detail/:id?",
    detailHrefPrefixes: ["/admin/student-registration-detail"],
  },
  {
    module: "student_signups",
    listPaths: ["/admin/student-signup-lists"],
    formPath: "/admin/student-signup-form/:id?",
    formHrefPrefixes: ["/admin/student-signup-form"],
    detailPath: "/admin/student-signup-detail/:id?",
    detailHrefPrefixes: ["/admin/student-signup-detail"],
  },
  {
    module: "school_registrations",
    listPaths: ["/admin/school-registrations-lists"],
    formPath: "/admin/school-registration-form/:id?",
    formHrefPrefixes: ["/admin/school-registration-form"],
    detailPath: "/admin/school-registration-detail/:id?",
    detailHrefPrefixes: ["/admin/school-registration-detail"],
  },
  {
    module: "pmc_sessions",
    listPaths: ["/admin/pmc-sessions-lists"],
    formPath: "/admin/pmc-session-form/:id?",
    formHrefPrefixes: ["/admin/pmc-session-form"],
    detailPath: "/admin/view-pmc-session-detail/:id?",
    detailHrefPrefixes: ["/admin/view-pmc-session-detail"],
  },
  {
    module: "rmc_sessions",
    listPaths: ["/admin/rmc-sessions-lists"],
    formPath: "/admin/rmc-session-form/:id?",
    formHrefPrefixes: ["/admin/rmc-session-form"],
    detailPath: "/admin/view-rmc-session-detail/:id?",
    detailHrefPrefixes: ["/admin/view-rmc-session-detail"],
  },
  {
    module: "news_stories",
    listPaths: ["/admin/news-story-lists"],
    formPath: "/admin/add-new-news-story/:id?",
    formHrefPrefixes: ["/admin/add-new-news-story"],
  },
  {
    module: "gallery",
    listPaths: ["/admin/gallery-lists"],
    formPath: "/admin/add-new-gallery/:id?",
    formHrefPrefixes: ["/admin/add-new-gallery"],
  },
  {
    module: "analytics",
    listPaths: [
      "/admin/analytics-overview",
      "/admin/student-analytics-overview",
      "/admin/school-analytics-overview",
      "/admin/subject-units-analytics-overview",
      "/admin/city-school-analytics-overview",
    ],
    detailPaths: [
      "/admin/student-analytics-overview-detail/:id?",
      "/admin/school-analytics-overview-detail/:id?",
    ],
    hideStandardDelete: false,
  },
  {
    module: "badges",
    listPaths: ["/admin/badges-lists"],
    formPath: "/admin/badges-form/:id?",
    formHrefPrefixes: ["/admin/badges-form"],
    detailPath: "/admin/badges-detail/:id?",
    detailHrefPrefixes: ["/admin/badges-detail"],
  },
];

const SPECIAL_ALLOWED_ADMIN_PATHS = new Set(["/admin/edit-profile"]);
const NATIVE_ROLE_ROUTE_PREFIXES = {
  teacher: [
    "/",
    "/dashboard",
    "/edit-profile",
    "/assign-mastery",
    "/mastery-progress",
    "/mastery-assignments-list",
    "/assign-assignment",
    "/manage-assignment",
    "/assignment-scores",
  ],
  school: [
    "/",
    "/dashboard",
    "/edit-profile",
    "/class-lists",
    "/add-new-class",
    "/view-class-detail",
    "/teacher-lists",
    "/add-new-teacher",
    "/view-teacher-detail",
    "/student-lists",
    "/add-new-student",
    "/view-student-detail",
  ],
  data_entry: [
    "/",
    "/dashboard",
    "/question-lists",
    "/add-new-question",
    "/view-question-detail",
  ],
  reviewer: ["/", "/dashboard", "/question-lists", "/view-question-detail"],
  student: [
    "/",
    "/dashboard",
    "/contest",
    "/progress",
    "/edit-profile",
    "/profile",
    "/teachers",
    "/rmc-student-consent",
    "/assessment-student-results",
    "/assessmentresult",
    "/practice",
    "/challenge",
  ],
};

const USER_LIST_PERMISSION_MAP = {
  student: "students",
  teacher: "teachers",
  school: "schools",
  organization: "organizations",
  data_entry: "staff",
  reviewer: "staff",
  staff: "staff",
};

export const resolveUserListPermissionModule = (role) =>
  USER_LIST_PERMISSION_MAP[normalizeRole(role)] ?? "users";

const getExplicitResolvedNavigation = (authState, role) => {
  const explicitNavigation = normalizeNavigationSections(authState?.navigation);

  if (!explicitNavigation.length) {
    return [];
  }

  return resolveRoleNavigation({
    role,
    navigation: explicitNavigation,
  });
};

const normalizeRoleScopedAdminPath = (pathname) => {
  const normalizedPath = normalizeText(pathname);
  const routeRole = getRouteRoleFromPath(normalizedPath);
  const routeSuffix = stripRoleBasePath(normalizedPath);
  const normalizedRouteSuffix = routeSuffix.toLowerCase();

  if (!routeRole || !routeSuffix) {
    return normalizedPath;
  }

  const nativeRoutePrefixes = NATIVE_ROLE_ROUTE_PREFIXES[routeRole] ?? [];
  if (
    routeRole !== "admin" &&
    routeRole !== "staff" &&
    nativeRoutePrefixes.some(
      (prefix) =>
        normalizedRouteSuffix === prefix ||
        normalizedRouteSuffix.startsWith(`${prefix}/`),
    )
  ) {
    return normalizedPath;
  }

  return routeSuffix === "/" ? "/admin" : `/admin${routeSuffix}`;
};

export const isRoleScopedAdminPath = (pathname) =>
  normalizeRoleScopedAdminPath(pathname).startsWith("/admin");

const buildRouteRules = () => {
  const rules = [];

  ADMIN_RESOURCE_DEFINITIONS.forEach((resource) => {
    (resource.listPaths ?? []).forEach((pattern) => {
      rules.push({
        pattern,
        module: resource.module,
        resolveAction: () => "read",
      });
    });

    (resource.detailPaths ?? [])
      .concat(resource.detailPath ? [resource.detailPath] : [])
      .forEach((pattern) => {
        rules.push({
          pattern,
          module: resource.module,
          resolveAction: () => "read",
        });
      });

    (resource.formPaths ?? [])
      .concat(resource.formPath ? [resource.formPath] : [])
      .forEach((pattern) => {
        rules.push({
          pattern,
          module: resource.module,
          resolveAction: (params = {}) => (params?.id ? "update" : "create"),
        });
      });
  });

  return rules;
};

const buildListActionConfig = () =>
  ADMIN_RESOURCE_DEFINITIONS.reduce((accumulator, resource) => {
    (resource.listPaths ?? []).forEach((listPath) => {
      const createPrefixes = uniqueValues(resource.formHrefPrefixes ?? []);
      const editPrefixes = uniqueValues(resource.formHrefPrefixes ?? []);
      const viewPrefixes = uniqueValues(
        (resource.detailHrefPrefixes ?? []).concat(resource.viewHrefPrefixes ?? []),
      );

      accumulator.push({
        listPath,
        module: resource.module,
        createPrefixes,
        editPrefixes,
        viewPrefixes,
        hideStandardDelete: resource.hideStandardDelete !== false,
      });
    });

    return accumulator;
  }, []);

const ADMIN_ROUTE_RULES = buildRouteRules();
const ADMIN_LIST_ACTION_CONFIG = buildListActionConfig();

const resolveActionCandidates = (action) => {
  const normalizedAction = normalizeIdentifier(action);
  const aliases = ACTION_ALIASES[normalizedAction] ?? [normalizedAction];

  return uniqueValues([
    ...aliases.map(normalizeIdentifier),
    "all",
    "manage",
  ]);
};

const resolveModuleAliases = (moduleKey) => {
  if (Array.isArray(moduleKey)) {
    return uniqueValues(moduleKey.map(normalizeIdentifier));
  }

  const normalizedKey = normalizeIdentifier(moduleKey);
  const aliases = MODULE_ALIASES[normalizedKey] ?? [moduleKey];

  return uniqueValues(aliases.map(normalizeIdentifier));
};

const resolvePermissionTokens = (moduleKey, action) => {
  const actionCandidates = resolveActionCandidates(action);

  return resolveModuleAliases(moduleKey).flatMap((moduleAlias) =>
    actionCandidates.map((actionAlias) => `${moduleAlias}.${actionAlias}`),
  );
};

const resolveMatrixActions = (permissionMatrix, moduleKey) => {
  if (!permissionMatrix || typeof permissionMatrix !== "object") {
    return [];
  }

  const aliases = resolveModuleAliases(moduleKey);
  const normalizedMatrixEntries = Object.entries(permissionMatrix).map(
    ([matrixModule, actions]) => ({
      module: normalizeIdentifier(matrixModule),
      actions: Array.isArray(actions)
        ? actions.map(normalizeIdentifier)
        : [normalizeIdentifier(actions)],
    }),
  );

  const matchedEntry = normalizedMatrixEntries.find((entry) =>
    aliases.includes(entry.module),
  );

  return matchedEntry?.actions ?? [];
};

export const isAdminScopedUser = (role, accessRole) => {
  const normalizedRole = normalizeRole(role);
  const internalRole = normalizeRole(
    accessRole?.internal_role ?? accessRole?.internalRole,
  );

  return (
    normalizedRole === "admin" ||
    normalizedRole === "staff" ||
    internalRole === "admin" ||
    internalRole === "staff"
  );
};

export const hasAdminPermission = (authState, moduleKey, action = "read") => {
  const normalizedRole = normalizeRole(authState?.role ?? authState?.user?.role);
  if (normalizedRole === "admin") {
    return true;
  }

  const normalizedPermissions = uniqueValues(
    (authState?.permissions ?? []).map((permission) => {
      const [moduleName = "", actionName = ""] = normalizeText(permission)
        .toLowerCase()
        .split(".");

      return `${normalizeIdentifier(moduleName)}.${normalizeIdentifier(actionName)}`;
    }),
  );
  const permissionTokens = resolvePermissionTokens(moduleKey, action);
  const matrixActions = resolveMatrixActions(authState?.permissionMatrix, moduleKey);
  const actionCandidates = resolveActionCandidates(action);

  if (
    matrixActions.length &&
    matrixActions.some((matrixAction) => actionCandidates.includes(matrixAction))
  ) {
    return true;
  }

  return permissionTokens.some((token) => normalizedPermissions.includes(token));
};

export const hasAnyAdminPermission = (authState, moduleKeys = [], action = "read") =>
  (Array.isArray(moduleKeys) ? moduleKeys : [moduleKeys]).some((moduleKey) =>
    hasAdminPermission(authState, moduleKey, action),
  );

export const hasAdminShellAccess = (authState) => {
  const resolvedRole = normalizeRole(authState?.role ?? authState?.user?.role);
  if (resolvedRole === "admin") {
    return true;
  }

  const explicitNavigation = getExplicitResolvedNavigation(authState, resolvedRole);
  const firstNavigationPath = getFirstNavigationPath(explicitNavigation);

  if (firstNavigationPath) {
    return true;
  }

  return Boolean(getFirstPermittedAdminPath(authState));
};

const getFirstPermittedAdminPath = (authState) => {
  const resolvedRole = normalizeRole(authState?.role ?? authState?.user?.role);

  for (const resource of ADMIN_RESOURCE_DEFINITIONS) {
    const firstReadablePath = (resource.listPaths ?? []).find(() =>
      hasAdminPermission(authState, resource.module, "read"),
    );

    if (firstReadablePath) {
      return rebasePathToRole(firstReadablePath, resolvedRole || "admin");
    }
  }

  return "";
};

export const getRoleHomePath = (authState) => {
  const resolvedRole = normalizeRole(authState?.role ?? authState?.user?.role);

  if (hasAdminShellAccess(authState)) {
    const navigation = getExplicitResolvedNavigation(authState, resolvedRole);

    return (
      getFirstNavigationPath(navigation) ||
      getFirstPermittedAdminPath(authState) ||
      (resolvedRole === "admin" ? "/admin/dashboard" : "/login")
    );
  }

  if (resolvedRole === "teacher") {
    return "/teacher/dashboard";
  }

  if (resolvedRole === "student") {
    return "/student/contest";
  }

  if (resolvedRole === "school") {
    return "/school/dashboard";
  }

  if (resolvedRole === "data_entry") {
    return "/data-entry/dashboard";
  }

  if (resolvedRole === "reviewer") {
    return "/reviewer/dashboard";
  }

  return "/login";
};

const resolveAdminRouteRule = (pathname) => {
  const normalizedPath = normalizeRoleScopedAdminPath(pathname);

  for (const rule of ADMIN_ROUTE_RULES) {
    const match = matchPath(
      { path: rule.pattern, end: true, caseSensitive: false },
      normalizedPath,
    );

    if (match) {
      return {
        module: rule.module,
        action: rule.resolveAction?.(match.params ?? {}) ?? "read",
      };
    }
  }

  return null;
};

export const canAccessAdminPath = (authState, pathname) => {
  const normalizedPath = normalizeText(pathname);
  const normalizedAdminPath = normalizeRoleScopedAdminPath(normalizedPath);
  const routeRole = getRouteRoleFromPath(normalizedPath);
  const resolvedRole = normalizeRole(authState?.role ?? authState?.user?.role);

  if (!normalizedAdminPath.startsWith("/admin")) {
    return true;
  }

  if (!hasAdminShellAccess(authState)) {
    return false;
  }

  if (routeRole && routeRole !== "admin" && routeRole !== resolvedRole) {
    return false;
  }

  if (resolvedRole === "admin" && (!routeRole || routeRole === "admin")) {
    return true;
  }

  if (
    normalizedAdminPath === "/admin" ||
    SPECIAL_ALLOWED_ADMIN_PATHS.has(normalizedAdminPath)
  ) {
    return true;
  }

  const resolvedNavigation = getExplicitResolvedNavigation(authState, resolvedRole);
  const preferredPath =
    routeRole === "admin"
      ? rebasePathToRole(normalizedAdminPath, resolvedRole || "admin")
      : normalizedPath;

  if (hasNavigationPath(resolvedNavigation, preferredPath)) {
    return true;
  }

  const matchedRule = resolveAdminRouteRule(normalizedAdminPath);
  if (!matchedRule) {
    return false;
  }

  return hasAdminPermission(authState, matchedRule.module, matchedRule.action);
};

export const getAdminListActionConfig = (pathname) => {
  const normalizedPath = normalizeRoleScopedAdminPath(pathname);

  return (
    ADMIN_LIST_ACTION_CONFIG.find((config) =>
      matchPath(
        { path: config.listPath, end: true, caseSensitive: false },
        normalizedPath,
      ),
    ) ?? null
  );
};
