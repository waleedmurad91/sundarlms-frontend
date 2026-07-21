import React from "react";
import { AdminActionLink, AdminDeleteGuard } from "@/components/admin/AdminActionControls";
import toast from "react-hot-toast";
import {
  AlertCircleIcon,
  Delete,
  Edit,
  Eye,
  KeyRound,
  Loader2,
  PlusCircleIcon,
  Shield,
  ShieldCheck,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ListToolbar from "@/components/ListToolbar";
import DemographicCard from "@/components/DemographicCard";
import {
  deleteRoleById,
  getAllPaginatedRoles,
  getRolePermissions,
} from "@/api/rolesApi";
import {
  enrichRoleRecordWithCatalog,
  formatDateTime,
  normalizePermissionCatalog,
  normalizeRoleRecord,
  resolvePageCollection,
} from "./roleUtils";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const RoleList = () => {
  const [records, setRecords] = React.useState([]);
  const [catalogModules, setCatalogModules] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [catalogLoading, setCatalogLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [deletingRoleId, setDeletingRoleId] = React.useState("");

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  React.useEffect(() => {
    let active = true;

    const fetchPermissionCatalog = async () => {
      try {
        setCatalogLoading(true);
        const result = await getRolePermissions();
        if (!active) {
          return;
        }
        setCatalogModules(normalizePermissionCatalog(result).modules);
      } catch (err) {
        if (!active) {
          return;
        }
        toast.error(
          err?.message || "Unable to load the role permission catalog.",
        );
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }
    };

    fetchPermissionCatalog();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    let active = true;

    const fetchRoles = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {
          page: currentPage,
          per_page: rowsPerPage,
        };
        const trimmedSearch = debouncedSearch.trim();
        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        const response = await getAllPaginatedRoles(params);
        if (!active) {
          return;
        }

        const { container, list } = resolvePageCollection(response);
        const normalizedRecords = list
          .map((item) => normalizeRoleRecord(item))
          .filter(Boolean);

        const resolvedCurrent = Number(
          container?.current_page ?? params.page ?? 1,
        );
        const resolvedPerPage = Number(
          container?.per_page ?? params.per_page ?? 10,
        );
        const resolvedTotal = Number(
          container?.total ?? normalizedRecords.length,
        );
        const resolvedLast = Number(
          container?.last_page ??
            Math.max(
              1,
              Math.ceil(resolvedTotal / Math.max(1, resolvedPerPage)),
            ),
        );
        const resolvedFrom =
          Number(container?.from) ||
          (normalizedRecords.length
            ? (resolvedCurrent - 1) * resolvedPerPage + 1
            : 0);
        const resolvedTo =
          Number(container?.to) ||
          (normalizedRecords.length
            ? resolvedFrom + normalizedRecords.length - 1
            : 0);

        setRecords(normalizedRecords);
        setPagination({
          current_page: resolvedCurrent,
          last_page: resolvedLast,
          per_page: resolvedPerPage,
          total: resolvedTotal,
          from: resolvedFrom,
          to: resolvedTo,
        });

        if (resolvedCurrent !== currentPage) {
          setCurrentPage(resolvedCurrent);
        }
        if (resolvedPerPage !== rowsPerPage) {
          setRowsPerPage(resolvedPerPage);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        const message =
          err?.message || "Failed to load roles. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchRoles();
    return () => {
      active = false;
    };
  }, [currentPage, rowsPerPage, debouncedSearch, refreshKey]);

  const enrichedRecords = React.useMemo(
    () =>
      records
        .map((record) => enrichRoleRecordWithCatalog(record, catalogModules))
        .filter(Boolean),
    [records, catalogModules],
  );

  const catalogPermissionCount = React.useMemo(
    () =>
      catalogModules.reduce(
        (total, module) => total + (module?.permissions?.length ?? 0),
        0,
      ),
    [catalogModules],
  );

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const confirmDelete = async (id) => {
    const roleId = String(id ?? "");
    if (!roleId) {
      return;
    }

    try {
      setDeletingRoleId(roleId);
      await deleteRoleById(roleId);
      setRefreshKey((prev) => prev + 1);
      toast.success("Role deleted successfully.");
    } catch (err) {
      toast.error(err?.message || "Failed to delete role. Please try again.");
    } finally {
      setDeletingRoleId((prev) => (prev === roleId ? "" : prev));
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Role Management</h1>
          <p className="text-slate-600 text-md">
            Create access roles, map module permissions, and maintain your RBAC
            structure from one place.
          </p>
        </div>
        <div className="dh-right">
          <AdminActionLink
            module="roles"
            action="create"
            to="/admin/add-new-role-form"
            className="global-btn"
          >
            Add New Role <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder="Search role name, slug, or description..."
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          from={pagination.from}
          to={pagination.to}
          onPageChange={setCurrentPage}
          disabled={loading}
          loading={loading || catalogLoading}
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
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading roles, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : enrichedRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  {debouncedSearch.trim()
                    ? "No roles match your search."
                    : "No roles available."}
                </TableCell>
              </TableRow>
            ) : (
              enrichedRecords.map((row, index) => (
                <TableRow key={row.id ?? index}>
                  <TableCell className="font-medium">
                    {baseRowNumber + index}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-900">
                        {row?.name || "-"}
                      </span>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {row?.slug || "NO SLUG"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[280px] text-sm text-slate-600">
                      {row?.description ||
                        "No description provided for this role."}
                    </p>
                  </TableCell>
                  <TableCell>
                    {row?.moduleCount ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(row.modules ?? []).slice(0, 2).map((module) => (
                          <span
                            key={`${row.id}-${module.moduleId}`}
                            className="rounded-full border border-[#E6D4D5] bg-[#FDF7EC] px-2.5 py-1 text-xs font-medium text-[#8D3035]"
                          >
                            {module.name}
                          </span>
                        ))}
                        {row.moduleCount > 2 ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                            +{row.moduleCount - 2} more
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-400">
                        No modules assigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="table-actions">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AdminActionLink
                            className="view-btn"
                            to={`/admin/view-role-detail/${row?.id ?? ""}`}
                            state={{ roleId: row?.id, role: row?.raw }}
                          >
                            <Eye size={15} />
                          </AdminActionLink>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Detail</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AdminActionLink
                            className="edit-btn"
                            to={`/admin/add-new-role-form/${row?.id ?? ""}`}
                            state={{ roleId: row?.id, role: row?.raw }}
                          >
                            <Edit size={15} />
                          </AdminActionLink>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit</p>
                        </TooltipContent>
                      </Tooltip>

                      <AdminDeleteGuard>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                className="delete-btn"
                                disabled={deletingRoleId === row?.id}
                              >
                                {deletingRoleId === row?.id ? (
                                  <Loader2 size={15} className="animate-spin" />
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
                              permanently delete the role{" "}
                              <strong>{row?.name || "selected role"}</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              disabled={deletingRoleId === row?.id}
                            >
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={deletingRoleId === row?.id}
                              onClick={() => confirmDelete(row?.id)}
                            >
                              {deletingRoleId === row?.id
                                ? "Deleting..."
                                : "Continue"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </AdminDeleteGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default RoleList;

