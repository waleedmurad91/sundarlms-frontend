import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircleIcon,
  ArrowLeft,
  Edit,
  FolderLock,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import DemographicCard from "@/components/DemographicCard";
import { getRoleById, getRolePermissions } from "@/api/rolesApi";
import {
  enrichRoleRecordWithCatalog,
  formatDateTime,
  formatLabel,
  normalizePermissionCatalog,
  normalizeRoleRecord,
} from "./roleUtils";

const RoleDetail = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();
  const fallbackRole = normalizeRoleRecord(state?.role);
  const roleId = paramsId || state?.roleId || fallbackRole?.id;

  const [roleRecord, setRoleRecord] = React.useState(fallbackRole);
  const [catalogModules, setCatalogModules] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!roleId) {
      const message =
        "Role identifier is missing. Please open this screen from the roles list.";
      setError(message);
      toast.error(message);
      return;
    }

    let active = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError("");

        const [roleResult, catalogResult] = await Promise.all([
          getRoleById(roleId),
          getRolePermissions().catch(() => null),
        ]);

        if (!active) return;

        setRoleRecord(normalizeRoleRecord(roleResult));
        if (catalogResult) {
          setCatalogModules(normalizePermissionCatalog(catalogResult).modules);
        }
      } catch (err) {
        if (!active) return;
        const message =
          err?.message || "Unable to load role detail. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      active = false;
    };
  }, [roleId]);

  const resolvedRole = React.useMemo(
    () => enrichRoleRecordWithCatalog(roleRecord, catalogModules),
    [catalogModules, roleRecord],
  );

  const catalogPermissionCount = React.useMemo(
    () =>
      catalogModules.reduce(
        (total, module) => total + (module?.permissions?.length ?? 0),
        0,
      ),
    [catalogModules],
  );

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Role Detail</h1>
          <p className="text-slate-600 text-md">
            Review the assigned module access and permission mix for this role.
          </p>
        </div>
        <div className="dh-right flex flex-wrap gap-3">
          <button
            type="button"
            className="global-btn secondary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {resolvedRole?.id ? (
            <Link
              to={`/admin/add-new-role-form/${resolvedRole.id}`}
              state={{ roleId: resolvedRole.id, role: resolvedRole.raw }}
              className="global-btn"
            >
              Edit Role <Edit size={16} />
            </Link>
          ) : null}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="alert-custom mb-4 bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {loading ? (
        <div className="dashboard-body dashboard-body-card flex min-h-[280px] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading role detail...</span>
          </div>
        </div>
      ) : resolvedRole ? (
        <>
          <section className="metrics-grid metrics-grid3 mt-5 !mb-0">
            <DemographicCard
              icon={<FolderLock size={24} />}
              title="Modules"
              classname="demoIndigo card-sm"
              count={resolvedRole.moduleCount}
              subheading="Assigned modules to this role"
            />
            <DemographicCard
              icon={<KeyRound size={24} />}
              title="Permissions"
              classname="demoPurple card-sm"
              count={resolvedRole.permissionCount}
              subheading="Permission actions currently granted"
            />
            <DemographicCard
              icon={<ShieldCheck size={24} />}
              title="Coverage"
              classname="demoGreen card-sm"
              count={`${resolvedRole.permissionCount}/${catalogPermissionCount || resolvedRole.permissionCount}`}
              subheading="Permissions compared against the active catalog"
            />
          </section>

          <div className="grid gap-6">
            <section className="dashboard-body dashboard-body-card !mb-0">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  {resolvedRole.name || "Unnamed Role"}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {resolvedRole.slug || "no_slug"}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-sm text-slate-600">
                  {resolvedRole.description ||
                    "No description is available for this role."}
                </p>
              </div>

              <div className="mt-6">
                {(resolvedRole.modules ?? []).length ? (
                  <Accordion
                    type="multiple"
                    defaultValue={(resolvedRole.modules ?? []).map(
                      (module) => module.moduleId,
                    )}
                    className="space-y-4"
                  >
                    {resolvedRole.modules.map((module) => (
                      <AccordionItem
                        key={module.moduleId}
                        value={module.moduleId}
                        className="overflow-hidden rounded-[24px] border border-slate-200 bg-white px-5 shadow-sm"
                      >
                        <AccordionTrigger className="py-5 hover:no-underline">
                          <div className="flex w-full flex-wrap items-start justify-between gap-4 pr-4 text-left">
                            <div>
                              <p className="text-base font-semibold text-slate-900">
                                {module.name}
                              </p>
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                                {module.slug || "module"}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#FDF7EC] px-3 py-1 text-xs font-medium text-[#8D3035]">
                              {module.permissionIds.length} permissions
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-5">
                          <div className="flex flex-wrap gap-2">
                            {(module.permissions ?? []).length
                              ? module.permissions.map((permission) => (
                                  <span
                                    key={`${module.moduleId}-${permission.id}`}
                                    className="rounded-full border border-[#E6D4D5] bg-[#FFF6F6] px-3 py-2 text-xs font-medium text-[#8D3035]"
                                  >
                                    {formatLabel(
                                      permission.action ||
                                        permission.slug ||
                                        permission.name,
                                    )}
                                  </span>
                                ))
                              : module.permissionIds.map((permissionId) => (
                                  <span
                                    key={`${module.moduleId}-${permissionId}`}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
                                  >
                                    Permission {permissionId}
                                  </span>
                                ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                    <p className="text-base font-medium text-slate-700">
                      No module permissions are linked to this role.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="dashboard-body dashboard-body-card">
          <p className="text-slate-500">No role detail is available.</p>
        </div>
      )}
    </>
  );
};

export default RoleDetail;
