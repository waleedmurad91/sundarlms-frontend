import { format } from "date-fns";

const PERMISSION_ACTION_ORDER = [
  "all",
  "read",
  "view",
  "add",
  "create",
  "edit",
  "update",
  "delete",
  "assign",
  "manage",
];

const ACTION_PRIORITY = new Map(
  PERMISSION_ACTION_ORDER.map((action, index) => [action, index]),
);

export const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

export const formatLabel = (value) => {
  const normalized = safeTrimString(value);
  if (!normalized) {
    return "-";
  }

  return normalized
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const createRoleSlug = (value) =>
  safeTrimString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

export const toRequestId = (value) => {
  const normalized = safeTrimString(value);
  if (!normalized) {
    return value;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  return normalized;
};

export const sortIds = (values = []) =>
  [...new Set((values ?? []).map((value) => safeTrimString(value)).filter(Boolean))]
    .sort((left, right) => {
      const leftIsNumeric = /^\d+$/.test(left);
      const rightIsNumeric = /^\d+$/.test(right);

      if (leftIsNumeric && rightIsNumeric) {
        return Number(left) - Number(right);
      }

      return left.localeCompare(right);
    });

const isArrayCandidate = (value) => Array.isArray(value) && value.length >= 0;

export const resolveCollection = (payload) => {
  if (Array.isArray(payload)) return payload;

  const root = payload?.data ?? payload;
  if (Array.isArray(root)) return root;

  const candidates = [
    root?.data,
    root?.items,
    root?.results,
    root?.roles,
    root?.permissions,
    root?.modules,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  if (root && typeof root === "object") {
    if (Array.isArray(root?.data?.data)) {
      return root.data.data;
    }

    const firstArray = Object.values(root).find(isArrayCandidate);
    if (Array.isArray(firstArray)) {
      return firstArray;
    }
  }

  return [];
};

const isPageContainer = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value?.current_page !== undefined ||
        value?.last_page !== undefined ||
        Array.isArray(value?.data)),
  );

export const resolvePageCollection = (payload) => {
  const rootPayload = payload ?? {};
  const rootData =
    rootPayload?.data && typeof rootPayload.data === "object"
      ? rootPayload.data
      : null;

  let container = isPageContainer(rootData)
    ? rootData
    : isPageContainer(rootPayload)
      ? rootPayload
      : rootData && isPageContainer(rootData?.data)
        ? rootData.data
        : rootPayload;

  if (
    container?.data &&
    typeof container.data === "object" &&
    !Array.isArray(container.data) &&
    isPageContainer(container.data)
  ) {
    container = container.data;
  }

  const list = Array.isArray(container?.data)
    ? container.data
    : Array.isArray(container)
      ? container
      : resolveCollection(container);

  return {
    container,
    list,
  };
};

const sortPermissions = (left, right) => {
  const leftAction = safeTrimString(left?.action).toLowerCase();
  const rightAction = safeTrimString(right?.action).toLowerCase();
  const leftPriority = ACTION_PRIORITY.get(leftAction) ?? Number.MAX_SAFE_INTEGER;
  const rightPriority =
    ACTION_PRIORITY.get(rightAction) ?? Number.MAX_SAFE_INTEGER;

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return formatLabel(left?.name ?? left?.slug ?? leftAction).localeCompare(
    formatLabel(right?.name ?? right?.slug ?? rightAction),
  );
};

const flattenCatalogNodes = (nodes = []) =>
  (nodes ?? []).flatMap((node) => [
    node,
    ...flattenCatalogNodes(node?.children ?? []),
  ]);

const normalizePermissionEntry = (item, moduleFallback = {}) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const permissionId = safeTrimString(
    item?.id ?? item?.permission_id ?? item?.permissionId,
  );
  if (!permissionId) {
    return null;
  }

  const moduleId = safeTrimString(
    item?.module_id ?? item?.module?.id ?? moduleFallback?.id,
  );
  if (!moduleId) {
    return null;
  }

  const slug = safeTrimString(item?.slug ?? item?.name);
  const inferredAction = slug.includes(".")
    ? slug.split(".").pop()
    : safeTrimString(item?.action);
  const action = safeTrimString(item?.action ?? inferredAction).toLowerCase();
  const moduleName = safeTrimString(
    item?.module?.name ?? moduleFallback?.name ?? moduleFallback?.moduleName,
  );
  const moduleSlug = safeTrimString(
    item?.module?.slug ?? moduleFallback?.slug ?? moduleFallback?.moduleSlug,
  );

  return {
    id: permissionId,
    numericId: toRequestId(permissionId),
    name: safeTrimString(item?.name ?? slug),
    slug,
    action,
    description: safeTrimString(item?.description),
    moduleId,
    moduleName,
    moduleSlug,
    raw: item,
  };
};

const normalizeCatalogModuleNode = (
  item,
  sectionName = "",
  parentModule = null,
) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const moduleId = safeTrimString(item?.id ?? item?.module_id ?? item?.module?.id);
  if (!moduleId) {
    return null;
  }

  const name =
    safeTrimString(item?.label ?? item?.nav_label ?? item?.name) ||
    formatLabel(item?.slug || `module_${moduleId}`);
  const slug = safeTrimString(item?.slug ?? item?.module?.slug);
  const description = safeTrimString(item?.description);
  const permissions = resolveCollection(item?.permissions)
    .map((permission) =>
      normalizePermissionEntry(permission, {
        id: moduleId,
        name: safeTrimString(item?.name ?? name),
        slug,
      }),
    )
    .filter(Boolean)
    .sort(sortPermissions);
  const children = resolveCollection(item?.children)
    .map((child) =>
      normalizeCatalogModuleNode(child, sectionName, {
        id: moduleId,
        name,
        slug,
      }),
    )
    .filter(Boolean);

  return {
    id: moduleId,
    numericId: toRequestId(moduleId),
    name,
    slug,
    description,
    section: safeTrimString(item?.section ?? sectionName),
    path: safeTrimString(item?.path ?? item?.nav_path),
    parentId: safeTrimString(item?.parent_id ?? parentModule?.id),
    parentName: safeTrimString(parentModule?.name),
    isChild:
      Boolean(item?.is_child) || Boolean(item?.parent_id) || Boolean(parentModule),
    hasDropdown: Boolean(item?.has_dropdown) || children.length > 0,
    permissions,
    children,
    raw: item,
  };
};

const normalizeStructuredPermissionCatalog = (payload) => {
  const sectionsSource = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  const sections = sectionsSource
    .map((section, index) => {
      const sectionLabel =
        safeTrimString(section?.section ?? section?.label) ||
        `Section ${index + 1}`;
      const items = resolveCollection(section?.items)
        .map((item) => normalizeCatalogModuleNode(item, sectionLabel))
        .filter(Boolean);

      if (!items.length) {
        return null;
      }

      return {
        section: sectionLabel,
        items,
      };
    })
    .filter(Boolean);

  const modules = sections.flatMap((section) => flattenCatalogNodes(section.items));

  return {
    sections,
    modules,
    moduleCount: modules.length,
    permissionCount: modules.reduce(
      (total, module) => total + (module?.permissions?.length ?? 0),
      0,
    ),
  };
};

const normalizeLegacyPermissionCatalog = (payload) => {
  const catalogMap = new Map();

  resolveCollection(payload).forEach((item) => {
    const permission = normalizePermissionEntry(item);
    if (!permission) {
      return;
    }

    const existingModule = catalogMap.get(permission.moduleId) ?? {
      id: permission.moduleId,
      numericId: toRequestId(permission.moduleId),
      name:
        permission.moduleName ||
        formatLabel(permission.moduleSlug || `module_${permission.moduleId}`),
      slug: permission.moduleSlug,
      permissions: [],
      children: [],
      section: "",
      isChild: false,
      hasDropdown: false,
      parentId: "",
      parentName: "",
      path: "",
    };

    if (!existingModule.permissions.some((entry) => entry.id === permission.id)) {
      existingModule.permissions.push(permission);
    }

    catalogMap.set(permission.moduleId, existingModule);
  });

  const modules = Array.from(catalogMap.values())
    .map((module) => ({
      ...module,
      permissions: [...module.permissions].sort(sortPermissions),
    }))
    .sort((left, right) =>
      safeTrimString(left?.name).localeCompare(safeTrimString(right?.name)),
    );

  return {
    sections: [
      {
        section: "Modules",
        items: modules,
      },
    ],
    modules,
    moduleCount: modules.length,
    permissionCount: modules.reduce(
      (total, module) => total + module.permissions.length,
      0,
    ),
  };
};

export const normalizePermissionCatalog = (payload) => {
  const structuredData = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  if (structuredData.some((item) => Array.isArray(item?.items))) {
    return normalizeStructuredPermissionCatalog(payload);
  }

  return normalizeLegacyPermissionCatalog(payload);
};

const resolveEntityPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return payload ?? {};
  }

  const candidates = [payload?.data?.data, payload?.data, payload];
  const resolved = candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate),
  );

  return resolved ?? payload;
};

const appendPermissionId = (moduleEntry, value) => {
  const permissionId = safeTrimString(value);
  if (!permissionId) {
    return;
  }

  moduleEntry.permissionIds = sortIds([
    ...(moduleEntry.permissionIds ?? []),
    permissionId,
  ]);
};

const appendPermissionEntry = (moduleEntry, permission) => {
  if (!permission) {
    return;
  }

  if (!moduleEntry.permissions.some((item) => item.id === permission.id)) {
    moduleEntry.permissions.push(permission);
  }

  appendPermissionId(moduleEntry, permission.id);
};

export const normalizeRoleRecord = (payload) => {
  const role = resolveEntityPayload(payload);

  if (!role || typeof role !== "object" || Array.isArray(role)) {
    return null;
  }

  const moduleMap = new Map();

  const ensureModule = (moduleId, metadata = {}) => {
    const normalizedId = safeTrimString(moduleId);
    if (!normalizedId) {
      return null;
    }

    const current = moduleMap.get(normalizedId) ?? {
      moduleId: normalizedId,
      name: "",
      slug: "",
      permissionIds: [],
      permissions: [],
    };

    const next = {
      ...current,
      name: safeTrimString(
        metadata?.name ?? metadata?.moduleName ?? current.name,
      ),
      slug: safeTrimString(
        metadata?.slug ?? metadata?.moduleSlug ?? current.slug,
      ),
    };

    moduleMap.set(normalizedId, next);
    return next;
  };

  const moduleEntries = [
    ...resolveCollection(role?.modules),
    ...resolveCollection(role?.module_permissions),
    ...resolveCollection(role?.modulePermissions),
  ];

  moduleEntries.forEach((item) => {
    const moduleId = safeTrimString(
      item?.module_id ?? item?.module?.id ?? item?.id,
    );
    const moduleEntry = ensureModule(moduleId, {
      name: item?.module?.name ?? item?.name,
      slug: item?.module?.slug ?? item?.slug,
    });

    if (!moduleEntry) {
      return;
    }

    const rawPermissionIds = [
      ...resolveCollection(item?.permission_ids),
      ...resolveCollection(item?.permissionIds),
    ];
    rawPermissionIds.forEach((permissionId) =>
      appendPermissionId(moduleEntry, permissionId),
    );

    resolveCollection(item?.permissions).forEach((permissionItem) => {
      const permission = normalizePermissionEntry(permissionItem, {
        id: moduleId,
        name: moduleEntry.name,
        slug: moduleEntry.slug,
      });
      appendPermissionEntry(moduleEntry, permission);
    });
  });

  const permissionEntries = [
    ...resolveCollection(role?.permissions),
    ...resolveCollection(role?.role_permissions),
    ...resolveCollection(role?.rolePermissions),
    ...resolveCollection(role?.permission_details),
    ...resolveCollection(role?.permissionDetails),
  ];

  permissionEntries.forEach((permissionItem) => {
    const permission = normalizePermissionEntry(permissionItem);
    if (!permission) {
      return;
    }

    const moduleEntry = ensureModule(permission.moduleId, {
      name: permission.moduleName,
      slug: permission.moduleSlug,
    });

    appendPermissionEntry(moduleEntry, permission);
  });

  const modules = Array.from(moduleMap.values())
    .map((module) => ({
      ...module,
      name:
        module.name || formatLabel(module.slug || `module_${module.moduleId}`),
      permissions: [...module.permissions].sort(sortPermissions),
      permissionIds: sortIds(
        module.permissions.length
          ? [
              ...module.permissionIds,
              ...module.permissions.map((permission) => permission.id),
            ]
          : module.permissionIds,
      ),
    }))
    .sort((left, right) =>
      safeTrimString(left?.name).localeCompare(safeTrimString(right?.name)),
    );

  const derivedPermissionCount = modules.reduce(
    (total, module) => total + module.permissionIds.length,
    0,
  );

  const roleId = safeTrimString(role?.id ?? role?._id ?? role?.role_id);
  const moduleCount =
    Number(role?.modules_count ?? role?.module_count ?? role?.moduleCount) ||
    modules.length;
  const permissionCount =
    Number(
      role?.permissions_count ??
        role?.permission_count ??
        role?.permissionCount ??
        role?.total_permissions,
    ) || derivedPermissionCount;

  return {
    id: roleId,
    name: safeTrimString(role?.name ?? role?.title ?? role?.role_name),
    slug: safeTrimString(role?.slug ?? role?.code),
    description: safeTrimString(role?.description ?? role?.details ?? role?.note),
    created_at: role?.created_at ?? role?.createdAt ?? "",
    updated_at: role?.updated_at ?? role?.updatedAt ?? "",
    modules,
    moduleCount,
    permissionCount,
    raw: role,
  };
};

export const buildSelectedPermissionsMap = (roleRecord) =>
  (roleRecord?.modules ?? []).reduce((accumulator, module) => {
    if (module?.permissionIds?.length) {
      accumulator[module.moduleId] = sortIds(module.permissionIds);
    }
    return accumulator;
  }, {});

export const enrichRoleRecordWithCatalog = (roleRecord, catalogModules = []) => {
  if (!roleRecord) {
    return null;
  }

  const catalogMap = new Map(
    (catalogModules ?? []).map((module) => [safeTrimString(module?.id), module]),
  );

  const modules = (roleRecord.modules ?? []).map((module) => {
    const moduleId = safeTrimString(module?.moduleId);
    const catalogModule = catalogMap.get(moduleId);
    const permissionIdSet = new Set(sortIds(module?.permissionIds));
    const permissionMap = new Map();

    (module?.permissions ?? []).forEach((permission) => {
      if (permission?.id) {
        permissionMap.set(permission.id, permission);
      }
    });

    (catalogModule?.permissions ?? []).forEach((permission) => {
      if (permissionIdSet.has(permission.id)) {
        permissionMap.set(permission.id, permission);
      }
    });

    if (!permissionMap.size && permissionIdSet.size) {
      permissionIdSet.forEach((permissionId) => {
        permissionMap.set(permissionId, {
          id: permissionId,
          numericId: toRequestId(permissionId),
          name: `Permission ${permissionId}`,
          slug: "",
          action: "",
          description: "",
          moduleId,
          moduleName: module?.name ?? catalogModule?.name ?? "",
          moduleSlug: module?.slug ?? catalogModule?.slug ?? "",
          raw: null,
        });
      });
    }

    const permissions = Array.from(permissionMap.values()).sort(sortPermissions);
    const permissionIds = sortIds(
      permissionIdSet.size
        ? Array.from(permissionIdSet)
        : permissions.map((permission) => permission.id),
    );

    return {
      ...module,
      moduleId,
      name:
        module?.name ??
        catalogModule?.name ??
        formatLabel(module?.slug || `module_${moduleId}`),
      slug: module?.slug ?? catalogModule?.slug ?? "",
      permissions,
      permissionIds,
    };
  });

  const derivedPermissionCount = modules.reduce(
    (total, module) => total + module.permissionIds.length,
    0,
  );

  return {
    ...roleRecord,
    modules,
    moduleCount: roleRecord.moduleCount || modules.length,
    permissionCount: roleRecord.permissionCount || derivedPermissionCount,
  };
};

export const formatDateTime = (value, fallback = "-") => {
  if (!value) {
    return fallback;
  }

  try {
    return format(new Date(value), "MMM dd, yyyy - hh:mm a");
  } catch {
    return fallback;
  }
};
