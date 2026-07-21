import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircleIcon, Delete, Edit, Eye, Loader2 } from "lucide-react";
import { AdminActionLink } from "@/components/admin/AdminActionControls";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  deleteCentralizedStudentById,
  getAllSystemUsers,
} from "@/api/studentCentralizedApi";
import { deleteTeacherById } from "@/api/teacherApi";
import { deleteSchoolById } from "@/api/schoolApi";
import { deleteOrganizationById } from "@/api/organizationApi";
import { deleteStaffById } from "@/api/staffApi";
import ListToolbar from "@/components/ListToolbar";
import FilterBar from "@/components/filter/FilterBar";
import { createSystemUserListFilterSchema } from "@/config/filterSchemas";
import {
  buildFilterParams,
  buildFilterStateFromSchema,
} from "@/lib/applyFilters";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { resolveUserListPermissionModule } from "@/utils/adminRbac";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const normalizeRole = (role) =>
  String(role ?? "")
    .trim()
    .toLowerCase();

const getUserId = (user) => user?.id ?? user?._id ?? user?.user?.id;

const getRoleEntityId = (user) =>
  user?.role_entity_id ?? user?.roleEntityId ?? getUserId(user);

const getUserName = (user) => user?.name ?? user?.user?.name ?? "-";

const getUserUsername = (user) =>
  user?.username ?? user?.user?.username ?? user?.email ?? "-";

const getUserEmail = (user) => user?.email ?? user?.user?.email ?? "-";

const formatLabel = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "-";
  }

  return normalized
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const resolveUserRoutes = (role, id) => {
  const normalizedRole = normalizeRole(role);
  const resolvedId = id ?? "";

  switch (normalizedRole) {
    case "student":
      return {
        detailPath: `/admin/view-centralized-student-detail/${resolvedId}`,
        editPath: `/admin/centralized-student-form/${resolvedId}`,
      };
    case "teacher":
      return {
        detailPath: `/admin/view-teacher-detail/${resolvedId}`,
        editPath: `/admin/add-new-teacher/${resolvedId}`,
      };
    case "school":
      return {
        detailPath: `/admin/view-school-detail/${resolvedId}`,
        editPath: `/admin/add-new-school/${resolvedId}`,
      };
    case "organization":
      return {
        editPath: `/admin/add-new-organization/${resolvedId}`,
      };
    case "data_entry":
    case "reviewer":
    case "translator":
      return {
        detailPath: null,
        editPath: `/admin/add-new-staff/${resolvedId}`,
      };
    default:
      return {
        detailPath: null,
        editPath: null,
      };
  }
};

const resolveDeleteAction = (user) => {
  const role = normalizeRole(user?.role);
  const userId = getUserId(user);
  const roleEntityId = getRoleEntityId(user);

  switch (role) {
    case "student":
      return roleEntityId
        ? {
            targetId: roleEntityId,
            deleteFn: deleteCentralizedStudentById,
          }
        : null;
    case "teacher":
      return roleEntityId
        ? {
            targetId: roleEntityId,
            deleteFn: deleteTeacherById,
          }
        : null;
    case "school":
      return roleEntityId
        ? {
            targetId: roleEntityId,
            deleteFn: deleteSchoolById,
          }
        : null;
    case "organization":
      return roleEntityId
        ? {
            targetId: roleEntityId,
            deleteFn: deleteOrganizationById,
          }
        : null;
    case "data_entry":
    case "reviewer":
    case "translator":
      return userId
        ? {
            targetId: userId,
            deleteFn: deleteStaffById,
          }
        : null;
    default:
      return null;
  }
};

const getDeleteActionKey = (user, deleteAction) =>
  `${normalizeRole(user?.role)}:${deleteAction?.targetId ?? getUserId(user) ?? "unknown"}`;

const UserLists = () => {
  const { can } = useAdminAccess();
  const initialFilterSchema = React.useMemo(
    () => createSystemUserListFilterSchema({}),
    [],
  );
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [filterOptions, setFilterOptions] = React.useState({});
  const [filterDraft, setFilterDraft] = React.useState(() =>
    buildFilterStateFromSchema(initialFilterSchema),
  );
  const [appliedFilters, setAppliedFilters] = React.useState(() =>
    buildFilterStateFromSchema(initialFilterSchema),
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [deletingActionKey, setDeletingActionKey] = React.useState(null);
  const hasHydratedFiltersRef = React.useRef(false);

  const filterSchema = React.useMemo(
    () => createSystemUserListFilterSchema(filterOptions),
    [filterOptions],
  );

  React.useEffect(() => {
    const defaults = buildFilterStateFromSchema(filterSchema);
    const isSameValue = (left, right) => {
      if (Array.isArray(left) || Array.isArray(right)) {
        const leftArray = Array.isArray(left) ? left : [];
        const rightArray = Array.isArray(right) ? right : [];
        if (leftArray.length !== rightArray.length) {
          return false;
        }
        return leftArray.every((value, index) => value === rightArray[index]);
      }
      return (left ?? "") === (right ?? "");
    };

    const mergeBySchema = (previous) =>
      Object.keys(defaults).reduce((acc, key) => {
        acc[key] = previous?.[key] ?? defaults[key];
        return acc;
      }, {});

    setFilterDraft((prev) => {
      const next = mergeBySchema(prev);
      const unchanged = Object.keys(defaults).every((key) =>
        isSameValue(prev?.[key], next[key]),
      );
      return unchanged ? prev : next;
    });

    setAppliedFilters((prev) => {
      const next = mergeBySchema(prev);
      const unchanged = Object.keys(defaults).every((key) =>
        isSameValue(prev?.[key], next[key]),
      );
      return unchanged ? prev : next;
    });
  }, [filterSchema]);

  React.useEffect(() => {
    hasHydratedFiltersRef.current = false;
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          page: currentPage,
          per_page: rowsPerPage,
        };
        Object.assign(params, buildFilterParams(appliedFilters));

        const response = await getAllSystemUsers(params);
        if (!isMounted) {
          return;
        }

        const rootPayload = response ?? {};
        const rootData =
          rootPayload?.data && typeof rootPayload.data === "object"
            ? rootPayload.data
            : null;

        let pageContainer =
          rootData &&
          (rootData?.current_page !== undefined ||
            rootData?.last_page !== undefined ||
            Array.isArray(rootData?.data))
            ? rootData
            : rootPayload;

        if (
          pageContainer?.data &&
          typeof pageContainer.data === "object" &&
          !Array.isArray(pageContainer.data) &&
          (pageContainer.data?.current_page !== undefined ||
            pageContainer.data?.last_page !== undefined ||
            Array.isArray(pageContainer.data?.data))
        ) {
          pageContainer = pageContainer.data;
        }

        const pageData = Array.isArray(pageContainer?.data)
          ? pageContainer.data
          : Array.isArray(pageContainer)
            ? pageContainer
            : [];

        const responseFilters =
          rootPayload?.filters ??
          rootData?.filters ??
          pageContainer?.filters ??
          {};
        const responseFilterOptions =
          responseFilters?.options ??
          responseFilters?.filter_options ??
          pageContainer?.filter_options ??
          rootPayload?.filter_options ??
          rootData?.filter_options ??
          {};
        const responseAppliedFilters =
          responseFilters?.applied ??
          responseFilters?.applied_filters ??
          pageContainer?.applied_filters ??
          rootPayload?.applied_filters ??
          rootData?.applied_filters ??
          {};

        setFilterOptions((prev) => {
          const previousSerialized = JSON.stringify(prev ?? {});
          const nextSerialized = JSON.stringify(responseFilterOptions ?? {});
          return previousSerialized === nextSerialized
            ? prev
            : responseFilterOptions;
        });

        if (!hasHydratedFiltersRef.current) {
          const schemaFromApi = createSystemUserListFilterSchema(
            responseFilterOptions,
          );
          const initialFiltersFromApi = buildFilterStateFromSchema(
            schemaFromApi,
            responseAppliedFilters,
          );
          setFilterDraft(initialFiltersFromApi);
          setAppliedFilters(initialFiltersFromApi);
          hasHydratedFiltersRef.current = true;
        }

        const resolvedCurrent = Number(
          pageContainer?.current_page ?? params.page ?? 1,
        );
        const resolvedPerPage = Number(
          pageContainer?.per_page ?? params.per_page ?? 10,
        );
        const resolvedTotal = Number(pageContainer?.total ?? pageData.length);
        const resolvedLast = Number(pageContainer?.last_page ?? 1);
        const resolvedFrom =
          Number(pageContainer?.from) ||
          (pageData.length ? (resolvedCurrent - 1) * resolvedPerPage + 1 : 0);
        const resolvedTo =
          Number(pageContainer?.to) ||
          (pageData.length ? resolvedFrom + pageData.length - 1 : 0);

        setRecords(pageData);
        setPagination({
          current_page: resolvedCurrent,
          last_page: resolvedLast,
          per_page: resolvedPerPage,
          total: resolvedTotal,
          from: resolvedFrom,
          to: resolvedTo,
        });

        if (currentPage !== resolvedCurrent) {
          setCurrentPage(resolvedCurrent);
        }

        if (rowsPerPage !== resolvedPerPage) {
          setRowsPerPage(resolvedPerPage);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err?.message || "Failed to load system users. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [currentPage, rowsPerPage, appliedFilters, refreshKey]);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    if (
      filterDraft.date_from &&
      filterDraft.date_to &&
      new Date(filterDraft.date_from) > new Date(filterDraft.date_to)
    ) {
      toast.error("From Date cannot be later than To Date.");
      return;
    }

    setAppliedFilters({ ...filterDraft });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    const resetState = buildFilterStateFromSchema(filterSchema);
    setFilterDraft(resetState);
    setAppliedFilters(resetState);
    setCurrentPage(1);
  };

  const handleDelete = async (user) => {
    const deleteAction = resolveDeleteAction(user);
    const actionKey = getDeleteActionKey(user, deleteAction);
    const roleLabel = formatLabel(user?.role).toLowerCase();

    if (
      !deleteAction?.targetId ||
      typeof deleteAction.deleteFn !== "function"
    ) {
      toast.error(`Delete is not available for this ${roleLabel || "user"}.`);
      return;
    }

    try {
      setDeletingActionKey(actionKey);
      await deleteAction.deleteFn(deleteAction.targetId);
      toast.success(`${formatLabel(user?.role)} deleted successfully.`);
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      const message =
        deleteError?.message ||
        `Failed to delete this ${roleLabel || "user"}. Please try again.`;
      toast.error(message);
      console.error("Delete error:", deleteError);
    } finally {
      setDeletingActionKey((prev) => (prev === actionKey ? null : prev));
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasActiveFilters = React.useMemo(
    () => Object.keys(buildFilterParams(appliedFilters)).length > 0,
    [appliedFilters],
  );
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>System Users</h1>
        </div>
      </div>

      <FilterBar
        schema={filterSchema}
        filters={filterDraft}
        setFilters={setFilterDraft}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        loading={loading}
      />

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          showSearch={false}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          from={pagination.from}
          to={pagination.to}
          onPageChange={setCurrentPage}
          disabled={loading}
          loading={loading}
        />
        {error && (
          <Alert variant="destructive" className="alert-custom">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
        <Table className="global-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  {hasActiveFilters
                    ? "No users match your filters."
                    : "No users available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => {
                const rowId = getUserId(row);
                const roleEntityId = getRoleEntityId(row);
                const actionRoutes = resolveUserRoutes(row?.role, roleEntityId);
                const deleteAction = resolveDeleteAction(row);
                const actionKey = getDeleteActionKey(row, deleteAction);
                const isDeleting = deletingActionKey === actionKey;
                const permissionModule = resolveUserListPermissionModule(
                  row?.role,
                );
                const canUserModuleRead = can("users", "read");
                const canUserModuleUpdate = can("users", "update");
                const canUserModuleDelete = can("users", "delete");
                const canViewAction =
                  Boolean(actionRoutes.detailPath) &&
                  canUserModuleRead &&
                  can(permissionModule, "read");
                const canEditAction =
                  Boolean(actionRoutes.editPath) &&
                  canUserModuleUpdate &&
                  can(permissionModule, "update");
                const canDeleteAction =
                  Boolean(deleteAction) &&
                  canUserModuleDelete &&
                  can(permissionModule, "delete");
                const hasActions =
                  canViewAction || canEditAction || canDeleteAction;
                return (
                  <TableRow key={rowId ?? index}>
                    <TableCell className="font-medium">
                      {baseRowNumber + index}
                    </TableCell>
                    <TableCell>{getUserName(row)}</TableCell>
                    <TableCell>{getUserUsername(row)}</TableCell>
                    <TableCell>{getUserEmail(row)}</TableCell>
                    <TableCell>{formatLabel(row?.role)}</TableCell>
                    <TableCell>{formatLabel(row?.gender)}</TableCell>
                    <TableCell>
                      {row?.created_at
                        ? format(
                            new Date(row.created_at),
                            "MMM dd, yyyy - hh:mm a",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {hasActions ? (
                        <div className="table-actions">
                          {canViewAction ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AdminActionLink
                                  className="view-btn"
                                  to={actionRoutes.detailPath}
                                  state={{
                                    userId: rowId,
                                    entityId: roleEntityId,
                                    user: row,
                                  }}
                                >
                                  <Eye size={15} />
                                </AdminActionLink>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Detail</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                          {canEditAction ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AdminActionLink
                                  className="edit-btn"
                                  to={actionRoutes.editPath}
                                  state={{
                                    userId: rowId,
                                    entityId: roleEntityId,
                                    user: row,
                                  }}
                                >
                                  <Edit size={15} />
                                </AdminActionLink>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                          {canDeleteAction ? (
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="delete-btn"
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? (
                                        <Loader2
                                          size={15}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Delete size={15} />
                                      )}
                                    </button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete</p>
                                </TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you absolutely sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete this{" "}
                                    {formatLabel(row?.role).toLowerCase()} and
                                    remove the related data from our servers.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={isDeleting}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    disabled={isDeleting}
                                    onClick={() => handleDelete(row)}
                                  >
                                    {isDeleting ? "Deleting..." : "Continue"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : null}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default UserLists;
