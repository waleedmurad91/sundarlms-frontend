import { normalizeRouteRole, rebasePathToRole } from "@/utils/roleRoutes";

export const roleLinks = {
  admin: [
    {
      section: "Dashboard",
      items: [
        { label: "Dashboard", path: "/admin/dashboard" },
        {
          label: "User Management",
          path: "/admin/user-lists",
        },
        {
          label: "Role Management",
          path: "/admin/role-lists",
        },
        {
          label: "School Management",
          path: "/admin/school-lists",
        },
        {
          label: "Teacher Management",
          path: "/admin/teacher-lists",
        },
        {
          label: "Student Management",
          path: "/admin/centralized-student-lists",
        },
        {
          label: "Class Management",
          path: "/admin/class-lists",
        },
        {
          label: "Subject Management",
          path: "/admin/subject-lists",
        },
        {
          label: "Staff Management",
          path: "/admin/staff-lists",
        },
        {
          label: "Certificate Management",
          path: "/admin/certificate-lists",
        },
        {
          label: "Location Management",
          children: [
            {
              label: "Province",
              path: "/admin/province-lists",
            },
            {
              label: "District",
              path: "/admin/district-lists",
            },
            {
              label: "Tehsil",
              path: "/admin/tehsil-lists",
            },
            {
              label: "City",
              path: "/admin/city-lists",
            },
            {
              label: "Cluster Area",
              path: "/admin/cluster-area-lists",
            },
          ],
        },
        // {
        //   label: "RMC Participants",
        //   path: "/admin/rmc-participation-lists",
        // },
      ],
    },
    {
      section: "Questions",
      items: [
        {
          label: "Unit Management",
          path: "/admin/unit-lists",
        },
        {
          label: "Topics Management",
          path: "/admin/topic-lists",
        },
        {
          label: "Questions Management",
          path: "/admin/question-lists",
        },
        {
          label: "Assessment Management",
          children: [
            {
              label: "Assessment Questions",
              path: "/admin/assessment-question-lists",
            },
            {
              label: "Assessment Lists",
              path: "/admin/assessment-lists",
            },
          ],
        },
        {
          label: "Quiz Management",
          path: "/admin/quiz-lists",
        },
        {
          label: "Unit Test Management",
          path: "/admin/unit-test-lists",
        },
      ],
    },
    {
      section: "Sessions",
      items: [
        // {
        //   label: "Student Registrations",
        //   children: [
        //     {
        //       label: "PMC-5 Registrations",
        //       path: "/admin/student-registrations-pmc",
        //     },
        //     {
        //       label: "VSS Registrations",
        //       path: "/admin/student-registrations-vss",
        //     },
        //     {
        //       label: "RMC Registrations",
        //       path: "/admin/student-registrations-rmc",
        //     },
        //   ],
        // },
        // {
        //   label: "Student Signups",
        //   path: "/admin/student-signup-lists",
        // },
        // {
        //   label: "School Registrations",
        //   path: "/admin/school-registrations-lists",
        // },
        {
          label: "PMC Sessions",
          path: "/admin/pmc-sessions-lists",
        },
        {
          label: "RMC Sessions",
          path: "/admin/rmc-sessions-lists",
        },
      ],
    },
    {
      section: "Website",
      items: [
        {
          label: "News & Updates",
          path: "/admin/news-story-lists",
        },
        {
          label: "Gallery",
          path: "/admin/gallery-lists",
        },
      ],
    },
    {
      section: "Analytics",
      items: [
        {
          label: "Overview",
          path: "/admin/analytics-overview",
        },
        {
          label: "Student Analytics",
          path: "/admin/student-analytics-overview",
        },
        {
          label: "School Analytics",
          path: "/admin/school-analytics-overview",
        },
        {
          label: "Subject / Units Analytics",
          path: "/admin/subject-units-analytics-overview",
        },
        {
          label: "City / School Analytics",
          path: "/admin/city-school-analytics-overview",
        },
        // {
        //   label: "Badges Management",
        //   path: "/admin/badges-lists",
        // },
      ],
    },
  ],
  teacher: [
    {
      section: "TOOLS",
      items: [
        { label: "Activity Overview", path: "/teacher/dashboard" },
        {
          label: "Mastery Goals",
          children: [
            { label: "Assign", path: "/teacher/assign-mastery" },
            { label: "Progress", path: "/teacher/mastery-progress" },
            {
              label: "Mastery Assignments",
              path: "/teacher/mastery-assignments-list",
            },
          ],
        },
        {
          label: "Assignments",
          children: [
            { label: "Assign", path: "/teacher/assign-assignment" },
            { label: "Scores", path: "/teacher/assignment-scores" },
            { label: "Manage Assignments", path: "/teacher/manage-assignment" },
          ],
        },
      ],
    },
  ],
  student: [
    {
      section: "Classes",
      items: [{ label: "My Dashboard", path: "/student/dashboard" }],
    },
  ],
  school: [
    {
      section: "Dashboard",
      items: [
        { label: "Dashboard", path: "/school/dashboard" },
        { label: "Teacher Management", path: "/school/teacher-lists" },
        { label: "Student Management", path: "/school/student-lists" },
      ],
    },
  ],
  data_entry: [
    {
      section: "Dashboard",
      items: [{ label: "Dashboard", path: "/data-entry/dashboard" }],
    },
    {
      section: "Questions",
      items: [
        {
          label: "Question Management",
          path: "/data-entry/question-lists",
        },
      ],
    },
  ],
  reviewer: [
    {
      section: "Dashboard",
      items: [{ label: "Dashboard", path: "/reviewer/dashboard" }],
    },
    {
      section: "Questions",
      items: [
        {
          label: "Question Management",
          path: "/reviewer/question-lists",
        },
      ],
    },
  ],
};

const normalizeText = (value) => String(value ?? "").trim();

const rebaseNavigationItemsToRole = (items = [], role) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    ...(item?.path ? { path: rebasePathToRole(item.path, role) } : {}),
    ...(Array.isArray(item?.children)
      ? { children: rebaseNavigationItemsToRole(item.children, role) }
      : {}),
  }));

const rebaseNavigationSectionsToRole = (sections = [], role) =>
  (Array.isArray(sections) ? sections : []).map((section) => ({
    ...section,
    items: rebaseNavigationItemsToRole(section?.items, role),
  }));

const normalizeNavigationItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      const label = normalizeText(item?.label);
      const path = normalizeText(item?.path);
      const children = normalizeNavigationItems(item?.children);

      if (!label && !path && !children.length) {
        return null;
      }

      return {
        ...(label ? { label } : {}),
        ...(path ? { path } : {}),
        ...(children.length ? { children } : {}),
      };
    })
    .filter(Boolean);

export const normalizeNavigationSections = (payload) => {
  const sections =
    payload?.data?.navigation ??
    payload?.navigation ??
    payload?.data ??
    payload;

  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .map((section, index) => {
      const sectionLabel =
        normalizeText(section?.section) ||
        normalizeText(section?.label) ||
        `Section ${index + 1}`;
      const items = normalizeNavigationItems(section?.items);

      if (!items.length) {
        return null;
      }

      return {
        section: sectionLabel,
        items,
      };
    })
    .filter(Boolean);
};

export const resolveRoleNavigation = ({ role, navigation } = {}) => {
  const normalizedRole = normalizeRouteRole(role);
  const normalizedNavigation = normalizeNavigationSections(navigation);

  if (normalizedNavigation.length) {
    return rebaseNavigationSectionsToRole(normalizedNavigation, normalizedRole);
  }

  if (roleLinks[normalizedRole]) {
    return rebaseNavigationSectionsToRole(
      roleLinks[normalizedRole],
      normalizedRole,
    );
  }

  return [];
};

export const getFirstNavigationPath = (sections = []) => {
  for (const section of sections) {
    for (const item of section?.items ?? []) {
      if (item?.path) {
        return item.path;
      }

      if (Array.isArray(item?.children) && item.children.length) {
        const childPath = item.children.find((child) => child?.path)?.path;
        if (childPath) {
          return childPath;
        }
      }
    }
  }

  return "";
};

export const hasNavigationPath = (sections = [], pathname = "") => {
  const normalizedPath = normalizeText(pathname).toLowerCase();
  if (!normalizedPath) {
    return false;
  }

  return sections.some((section) =>
    (section?.items ?? []).some((item) => {
      const itemPath = normalizeText(item?.path).toLowerCase();
      if (itemPath && itemPath === normalizedPath) {
        return true;
      }

      return (item?.children ?? []).some((child) => {
        const childPath = normalizeText(child?.path).toLowerCase();
        return childPath === normalizedPath;
      });
    }),
  );
};
