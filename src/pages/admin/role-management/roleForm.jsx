import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircleIcon,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Text,
  X,
} from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addRole,
  getRoleById,
  getRolePermissions,
  updateRoleById,
} from "@/api/rolesApi";
import {
  buildSelectedPermissionsMap,
  formatLabel,
  normalizePermissionCatalog,
  normalizeRoleRecord,
  safeTrimString,
  sortIds,
  toRequestId,
} from "./roleUtils";

const ACTION_ORDER = [
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

const sortActions = (actions = []) =>
  [...actions].sort((left, right) => {
    const leftPriority = ACTION_ORDER.indexOf(left);
    const rightPriority = ACTION_ORDER.indexOf(right);
    const resolvedLeft =
      leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority;
    const resolvedRight =
      rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority;

    if (resolvedLeft !== resolvedRight) {
      return resolvedLeft - resolvedRight;
    }

    return left.localeCompare(right);
  });

const createInitialForm = (roleRecord) => ({
  name: safeTrimString(roleRecord?.name),
  description: safeTrimString(roleRecord?.description),
});

const buildModuleSearchHaystack = (module) =>
  [
    module?.name,
    module?.slug,
    module?.description,
    ...(module?.permissions ?? []).flatMap((permission) => [
      permission?.name,
      permission?.slug,
      permission?.action,
      permission?.description,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const filterModuleTree = (module, query) => {
  if (!query) {
    return module;
  }

  const selfMatches = buildModuleSearchHaystack(module).includes(query);
  const children = (module?.children ?? [])
    .map((child) => filterModuleTree(child, query))
    .filter(Boolean);

  if (selfMatches) {
    return {
      ...module,
      children: module?.children ?? [],
    };
  }

  if (children.length) {
    return {
      ...module,
      children,
    };
  }

  return null;
};

const flattenSectionModules = (items = []) =>
  (items ?? []).flatMap((item) => [
    item,
    ...flattenSectionModules(item?.children ?? []),
  ]);

const flattenModuleTree = (module) =>
  module
    ? [module, ...(module?.children ?? []).flatMap((child) => flattenModuleTree(child))]
    : [];

const filterCatalogSections = (sections = [], searchValue = "") => {
  const query = safeTrimString(searchValue).toLowerCase();

  if (!query) {
    return sections;
  }

  return (sections ?? [])
    .map((section) => {
      const sectionMatches = safeTrimString(section?.section)
        .toLowerCase()
        .includes(query);

      if (sectionMatches) {
        return section;
      }

      const items = (section?.items ?? [])
        .map((item) => filterModuleTree(item, query))
        .filter(Boolean);

      if (!items.length) {
        return null;
      }

      return {
        ...section,
        items,
      };
    })
    .filter(Boolean);
};

const RoleForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();
  const fallbackRole = normalizeRoleRecord(state?.role);
  const roleId = paramsId || state?.roleId || fallbackRole?.id;
  const isEditMode = Boolean(roleId);

  const [formField, setFormField] = React.useState(() =>
    createInitialForm(fallbackRole),
  );
  const [catalogSections, setCatalogSections] = React.useState([]);
  const [catalogModules, setCatalogModules] = React.useState([]);
  const [selectedPermissionIdsByModule, setSelectedPermissionIdsByModule] =
    React.useState(() => buildSelectedPermissionsMap(fallbackRole));
  const [moduleSearch, setModuleSearch] = React.useState("");
  const [fetching, setFetching] = React.useState(false);
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    const fetchCatalog = async () => {
      try {
        setCatalogLoading(true);
        const result = await getRolePermissions();
        if (!active) return;
        const normalizedCatalog = normalizePermissionCatalog(result);
        setCatalogSections(normalizedCatalog.sections);
        setCatalogModules(normalizedCatalog.modules);
      } catch (err) {
        if (!active) return;
        const message =
          err?.message || "Unable to load role permissions. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) setCatalogLoading(false);
      }
    };

    fetchCatalog();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !roleId) return;

    let active = true;

    const fetchRole = async () => {
      try {
        setFetching(true);
        const result = await getRoleById(roleId);
        if (!active) return;
        const normalizedRole = normalizeRoleRecord(result);
        setFormField(createInitialForm(normalizedRole));
        setSelectedPermissionIdsByModule(
          buildSelectedPermissionsMap(normalizedRole),
        );
      } catch (err) {
        if (!active) return;
        const message =
          err?.message || "Unable to load role details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) setFetching(false);
      }
    };

    fetchRole();
    return () => {
      active = false;
    };
  }, [isEditMode, roleId]);

  const selectedPermissionCount = React.useMemo(
    () =>
      Object.values(selectedPermissionIdsByModule).reduce(
        (total, permissionIds) => total + (permissionIds?.length ?? 0),
        0,
      ),
    [selectedPermissionIdsByModule],
  );

  const filteredCatalogSections = React.useMemo(
    () => filterCatalogSections(catalogSections, moduleSearch),
    [catalogSections, moduleSearch],
  );

  const filteredModules = React.useMemo(
    () =>
      filteredCatalogSections.flatMap((section) =>
        flattenSectionModules(section?.items ?? []),
      ),
    [filteredCatalogSections],
  );

  const catalogModuleMap = React.useMemo(
    () =>
      new Map(
        (catalogModules ?? []).map((module) => [safeTrimString(module?.id), module]),
      ),
    [catalogModules],
  );

  const visibleActionColumns = React.useMemo(() => {
    const actions = new Set();

    filteredModules.forEach((module) => {
      (module?.permissions ?? []).forEach((permission) => {
        const action = safeTrimString(
          permission?.action ?? permission?.slug ?? permission?.name,
        ).toLowerCase();
        if (action) {
          actions.add(action);
        }
      });
    });

    return sortActions(Array.from(actions)).filter(
      (action) => action !== "all",
    );
  }, [filteredModules]);

  const resolveCatalogModule = React.useCallback(
    (module) => catalogModuleMap.get(safeTrimString(module?.id)) ?? module,
    [catalogModuleMap],
  );

  const getModuleTreeNodes = React.useCallback(
    (module) => flattenModuleTree(resolveCatalogModule(module)),
    [resolveCatalogModule],
  );

  const getModuleTreePermissionIds = React.useCallback(
    (module, action = "") => {
      const normalizedAction = safeTrimString(action).toLowerCase();

      return sortIds(
        getModuleTreeNodes(module).flatMap((entry) =>
          (entry?.permissions ?? [])
            .filter((permission) => {
              if (!normalizedAction) {
                return true;
              }

              const permissionAction = safeTrimString(
                permission?.action ?? permission?.slug ?? permission?.name,
              ).toLowerCase();

              return permissionAction === normalizedAction;
            })
            .map((permission) => permission.id),
        ),
      );
    },
    [getModuleTreeNodes],
  );

  const getModulePermissionForAction = React.useCallback((module, action) => {
    const normalizedAction = safeTrimString(action).toLowerCase();
    return (module?.permissions ?? []).find((permission) => {
      const permissionAction = safeTrimString(
        permission?.action ?? permission?.slug ?? permission?.name,
      ).toLowerCase();
      return permissionAction === normalizedAction;
    });
  }, []);

  const areAllActionPermissionsSelected = React.useCallback(
    (action) => {
      const matchedPermissions = filteredModules
        .map((module) => ({
          moduleId: module?.id,
          permission: getModulePermissionForAction(module, action),
        }))
        .filter((item) => item.permission?.id);

      if (!matchedPermissions.length) {
        return false;
      }

      return matchedPermissions.every((item) =>
        (selectedPermissionIdsByModule[item.moduleId] ?? []).includes(
          item.permission.id,
        ),
      );
    },
    [
      filteredModules,
      getModulePermissionForAction,
      selectedPermissionIdsByModule,
    ],
  );

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const toggleModuleAction = React.useCallback(
    (module, action) => {
      const targetPermissionIds = getModuleTreePermissionIds(module, action);
      if (!targetPermissionIds.length) {
        return;
      }

      const shouldClear = targetPermissionIds.every((permissionId) => {
        const permissionModule = catalogModules.find((entry) =>
          (entry?.permissions ?? []).some((permission) => permission.id === permissionId),
        );

        if (!permissionModule?.id) {
          return false;
        }

        return (selectedPermissionIdsByModule[permissionModule.id] ?? []).includes(
          permissionId,
        );
      });

      setSelectedPermissionIdsByModule((prev) => {
        const nextState = { ...prev };

        getModuleTreeNodes(module).forEach((entry) => {
          const currentIds = nextState[entry.id] ?? [];
          const actionPermissionIds = sortIds(
            (entry?.permissions ?? [])
              .filter((permission) => {
                const permissionAction = safeTrimString(
                  permission?.action ?? permission?.slug ?? permission?.name,
                ).toLowerCase();

                return permissionAction === safeTrimString(action).toLowerCase();
              })
              .map((permission) => permission.id),
          );

          const nextIds = shouldClear
            ? currentIds.filter((value) => !actionPermissionIds.includes(value))
            : sortIds([...currentIds, ...actionPermissionIds]);

          if (nextIds.length) {
            nextState[entry.id] = nextIds;
          } else {
            delete nextState[entry.id];
          }
        });

        return nextState;
      });
    },
    [
      catalogModules,
      getModuleTreeNodes,
      getModuleTreePermissionIds,
      selectedPermissionIdsByModule,
    ],
  );

  const toggleModule = React.useCallback(
    (module) => {
      const subtreePermissionIds = getModuleTreePermissionIds(module);
      if (!subtreePermissionIds.length) {
        return;
      }

      const shouldClear = getModuleTreeNodes(module).every((entry) => {
        const entryPermissionIds = sortIds(
          (entry?.permissions ?? []).map((permission) => permission.id),
        );
        const currentIds = selectedPermissionIdsByModule[entry.id] ?? [];

        return (
          entryPermissionIds.length > 0 &&
          entryPermissionIds.every((permissionId) => currentIds.includes(permissionId))
        );
      });

      setSelectedPermissionIdsByModule((prev) => {
        const nextState = { ...prev };

        getModuleTreeNodes(module).forEach((entry) => {
          const entryPermissionIds = sortIds(
            (entry?.permissions ?? []).map((permission) => permission.id),
          );

          if (!entryPermissionIds.length) {
            return;
          }

          if (shouldClear) {
            delete nextState[entry.id];
            return;
          }

          nextState[entry.id] = entryPermissionIds;
        });

        return nextState;
      });
    },
    [getModuleTreeNodes, getModuleTreePermissionIds, selectedPermissionIdsByModule],
  );

  const toggleActionColumn = React.useCallback(
    (action) => {
      const matchedPermissions = filteredModules
        .map((module) => ({
          moduleId: module?.id,
          permission: getModulePermissionForAction(module, action),
        }))
        .filter((item) => item.permission?.id);

      if (!matchedPermissions.length) {
        return;
      }

      const shouldClear = matchedPermissions.every((item) =>
        (selectedPermissionIdsByModule[item.moduleId] ?? []).includes(
          item.permission.id,
        ),
      );

      setSelectedPermissionIdsByModule((prev) => {
        const nextState = { ...prev };

        matchedPermissions.forEach((item) => {
          const currentIds = nextState[item.moduleId] ?? [];
          const nextIds = shouldClear
            ? currentIds.filter((value) => value !== item.permission.id)
            : sortIds([...currentIds, item.permission.id]);

          if (nextIds.length) {
            nextState[item.moduleId] = nextIds;
          } else {
            delete nextState[item.moduleId];
          }
        });

        return nextState;
      });
    },
    [
      filteredModules,
      getModulePermissionForAction,
      selectedPermissionIdsByModule,
    ],
  );

  const handleSelectAll = React.useCallback(() => {
    const nextState = catalogModules.reduce((accumulator, module) => {
      const permissionIds = sortIds(
        (module?.permissions ?? []).map((permission) => permission.id),
      );
      if (permissionIds.length) accumulator[module.id] = permissionIds;
      return accumulator;
    }, {});

    setSelectedPermissionIdsByModule(nextState);
  }, [catalogModules]);

  const handleClearAll = React.useCallback(() => {
    setSelectedPermissionIdsByModule({});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedName = safeTrimString(formField.name);
    const trimmedDescription = safeTrimString(formField.description);

    const modulesPayload = Object.entries(selectedPermissionIdsByModule)
      .filter(([, permissionIds]) => permissionIds?.length)
      .map(([moduleId, permissionIds]) => ({
        module_id: toRequestId(moduleId),
        permission_ids: permissionIds.map((permissionId) =>
          toRequestId(permissionId),
        ),
      }));

    if (!trimmedName) {
      const message = "Role name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!modulesPayload.length) {
      const message = "Select at least one permission before saving the role.";
      setError(message);
      toast.error(message);
      return;
    }

    const payload = {
      name: trimmedName,
      description: trimmedDescription,
      modules: modulesPayload,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateRoleById(roleId, payload);
        toast.success("Role updated successfully.");
      } else {
        await addRole(payload);
        toast.success("Role created successfully.");
      }
      navigate("/admin/role-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "create"} role. Please try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isBootstrapping =
    fetching || (catalogLoading && !catalogModules.length);

  const renderModuleRows = React.useCallback(
    (module, depth = 0) => {
      const resolvedModule = resolveCatalogModule(module);
      const modulePermissionIds = getModuleTreePermissionIds(resolvedModule);
      const ownPermissionIds = sortIds(
        (resolvedModule?.permissions ?? []).map((permission) => permission.id),
      );
      const allSelected =
        modulePermissionIds.length > 0 &&
        getModuleTreeNodes(resolvedModule).every((entry) => {
          const entryPermissionIds = sortIds(
            (entry?.permissions ?? []).map((permission) => permission.id),
          );
          const entrySelectedIds = selectedPermissionIdsByModule[entry.id] ?? [];

          return (
            !entryPermissionIds.length ||
            entryPermissionIds.every((permissionId) =>
              entrySelectedIds.includes(permissionId),
            )
          );
        });
      const childRows = (module?.children ?? []).flatMap((child) =>
        renderModuleRows(child, depth + 1),
      );

      return [
        <TableRow
          key={module.id}
          className={module?.children?.length ? "bg-slate-50/40" : undefined}
        >
          <TableCell className="px-4 py-3 align-top">
            <div
              className="flex flex-col gap-1"
              style={{ paddingLeft: `${depth * 24}px` }}
            >
              <div className="flex items-center gap-2">
                {depth > 0 ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                ) : null}
                <span className="font-semibold text-slate-900">
                  {resolvedModule.name}
                </span>
                {resolvedModule?.children?.length ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {resolvedModule.children.length} child
                    {resolvedModule.children.length === 1 ? "" : "ren"}
                  </span>
                ) : null}
              </div>
              <span className="text-xs uppercase tracking-[0.14em] text-slate-400">
                {resolvedModule.slug || "module"}
              </span>
              {resolvedModule.description ? (
                <span className="text-xs text-slate-500">
                  {resolvedModule.description}
                </span>
              ) : null}
            </div>
          </TableCell>
          <TableCell className="px-4 py-3 text-center align-top">
            <div className="flex flex-col items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-[#AD474B]"
                checked={allSelected}
                onChange={() => toggleModule(resolvedModule)}
                disabled={loading || !ownPermissionIds.length}
                aria-label={`Toggle all permissions for ${resolvedModule.name}`}
              />
              <button
                type="button"
                className="text-xs font-medium text-[#AD474B] transition hover:text-[#973B3F]"
                onClick={() => toggleModule(resolvedModule)}
                disabled={loading || !ownPermissionIds.length}
              >
                {allSelected ? "Clear" : "All"}
              </button>
            </div>
          </TableCell>
          {visibleActionColumns.map((action) => {
            const permission = getModulePermissionForAction(resolvedModule, action);
            const actionPermissionIds = getModuleTreePermissionIds(
              resolvedModule,
              action,
            );
            const isSelected =
              actionPermissionIds.length > 0 &&
              getModuleTreeNodes(resolvedModule).every((entry) => {
                const actionPermission = getModulePermissionForAction(entry, action);

                if (!actionPermission?.id) {
                  return true;
                }

                return (selectedPermissionIdsByModule[entry.id] ?? []).includes(
                  actionPermission.id,
                );
              });

            return (
              <TableCell
                key={`${resolvedModule.id}-${action}`}
                className="px-3 py-3 text-center align-top"
              >
                {permission ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-[#AD474B]"
                    checked={isSelected}
                    onChange={() => toggleModuleAction(resolvedModule, action)}
                    disabled={loading}
                    title={
                      permission.description ||
                      `${formatLabel(action)} permission for ${resolvedModule.name}`
                    }
                    aria-label={`${formatLabel(action)} permission for ${resolvedModule.name}`}
                  />
                ) : (
                  <span className="text-slate-300">-</span>
                )}
              </TableCell>
            );
          })}
        </TableRow>,
        ...childRows,
      ];
    },
    [
      getModulePermissionForAction,
      getModuleTreeNodes,
      getModuleTreePermissionIds,
      loading,
      resolveCatalogModule,
      selectedPermissionIdsByModule,
      toggleModule,
      toggleModuleAction,
      visibleActionColumns,
    ],
  );

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{isEditMode ? "Update Role" : "Create Role"}</h1>
        </div>
      </div>

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

        {isBootstrapping ? (
          <div className="dashboard-body dashboard-body-card">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading role builder...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-6">
              <div className="space-y-6">
                <section className="dashboard-body dashboard-body-card !mb-0">
                  <div className="form-admin">
                    <div className="form-group w-full">
                      <label>
                        <Text size={16} /> Role Name <span>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        name="name"
                        placeholder="District Viewer"
                        value={formField.name}
                        onChange={handleFieldChange}
                        disabled={loading}
                      />
                    </div>
                    <div className="form-group w-full">
                      <label>
                        <FileText size={16} /> Description
                      </label>
                      <textarea
                        className="form-input"
                        name="description"
                        rows={4}
                        placeholder="District analytics observer role"
                        value={formField.description}
                        onChange={handleFieldChange}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </section>

                <section className="dashboard-body dashboard-body-card !mb-0">
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Module Permissions
                      </h2>
                      <p className="text-sm text-slate-500">
                        Select the actions this role should access.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-[#AD474B] px-4 py-2 text-sm font-medium text-[#AD474B] transition hover:bg-[#AD474B] hover:text-white"
                        onClick={handleSelectAll}
                        disabled={loading || !catalogModules.length}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                        onClick={handleClearAll}
                        disabled={loading || !selectedPermissionCount}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:max-w-[420px]">
                      <Search size={18} className="text-slate-400" />
                      <input
                        type="search"
                        value={moduleSearch}
                        onChange={(event) =>
                          setModuleSearch(event.target.value)
                        }
                        placeholder="Search module or permission..."
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                        disabled={loading}
                      />
                    </label>
                    <p className="text-sm text-slate-500">
                      {filteredModules.length} module
                      {filteredModules.length === 1 ? "" : "s"} shown
                    </p>
                  </div>

                  {!filteredModules.length ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                      <p className="text-base font-medium text-slate-700">
                        No module permissions matched your search.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-3xl border border-slate-200">
                      <Table
                        className="global-table min-w-[980px]"
                        containerClassName="max-h-[70vh] overflow-auto"
                      >
                        <TableHeader className="bg-slate-50">
                          <TableRow className="hover:bg-slate-50">
                            <TableHead className="sticky top-0 z-20 min-w-[230px] bg-slate-50 px-4 py-3 shadow-[inset_0_-1px_0_0_rgb(226_232_240)]">
                              Module
                            </TableHead>
                            <TableHead className="sticky top-0 z-20 min-w-[120px] bg-slate-50 px-4 py-3 text-center shadow-[inset_0_-1px_0_0_rgb(226_232_240)]">
                              Row
                            </TableHead>
                            {visibleActionColumns.map((action) => {
                              const checked =
                                areAllActionPermissionsSelected(action);

                              return (
                                <TableHead
                                  key={action}
                                  className="sticky top-0 z-20 bg-slate-50 px-3 py-3 text-center shadow-[inset_0_-1px_0_0_rgb(226_232_240)]"
                                >
                                  <label className="flex flex-col items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                    <span>{formatLabel(action)}</span>
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 cursor-pointer accent-[#AD474B]"
                                      checked={checked}
                                      onChange={() =>
                                        toggleActionColumn(action)
                                      }
                                      disabled={loading}
                                      aria-label={`Toggle ${formatLabel(action)} for all visible modules`}
                                    />
                                  </label>
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCatalogSections.map((section) => (
                            <React.Fragment key={section.section}>
                              <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
                                <TableCell
                                  colSpan={visibleActionColumns.length + 2}
                                  className="px-4 py-3"
                                >
                                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {section.section}
                                  </div>
                                </TableCell>
                              </TableRow>
                              {section.items.flatMap((module) =>
                                renderModuleRows(module),
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>
              </div>
            </div>

            <div className="form-button-row">
              <button
                type="button"
                className="global-btn secondary flex items-center justify-center gap-1"
                onClick={() => navigate(-1)}
              >
                <X size={18} />
                Cancel
              </button>
              <button
                type="submit"
                className="global-btn flex items-center justify-center gap-1"
                disabled={loading || catalogLoading || !catalogModules.length}
              >
                {loading ? (
                  <>
                    Please wait
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  </>
                ) : isEditMode ? (
                  <>
                    Update Role
                    <Save size={18} />
                  </>
                ) : (
                  <>
                    Create Role
                    <Plus size={18} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </>
  );
};

export default RoleForm;
