import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  AlertCircleIcon,
  Calendar,
  Flag,
  Home,
  Phone,
  School,
  User,
} from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { getSchoolRegistrationById } from "@/api/registrationsApi";
import { useAuthStore } from "@/store/auth";

const formatDate = (value) => {
  if (!value) return "";
  try {
    return format(new Date(value), "MMM dd, yyyy - hh:mm a");
  } catch {
    return String(value);
  }
};

const normalizeRegistration = (payload) => {
  const data = payload?.data ?? payload ?? {};
  if (!data) return null;
  return {
    id: data?.id ?? data?._id ?? null,
    school_name: data?.school_name ?? data?.name ?? "",
    city: data?.city ?? "",
    address: data?.address ?? "",
    principal_name: data?.principal_name ?? "",
    principal_phone: data?.principal_phone ?? "",
    focal_person_name: data?.focal_person_name ?? "",
    focal_person_phone: data?.focal_person_phone ?? "",
    status: data?.status ?? "",
    admin_notes: data?.admin_notes ?? "",
    reviewed_by: data?.reviewed_by ?? data?.reviewer ?? null,
    reviewed_at: data?.reviewed_at ?? "",
    created_at: data?.created_at ?? data?.createdAt ?? data?.timestamp ?? "",
    raw: data,
  };
};

const SchoolRegistrationDetail = () => {
  const { role: storeRole, user } = useAuthStore();
  const resolvedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallback = React.useMemo(
    () => normalizeRegistration(state?.registration),
    [state?.registration],
  );
  const registrationId = paramsId || state?.registrationId || fallback?.id;

  const [registration, setRegistration] = React.useState(fallback);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (fallback && fallback.id === registrationId && fallback.raw) {
      return;
    }
    if (!registrationId) {
      const message =
        "Registration identifier is missing. Please open this page from the registrations list.";
      setError(message);
      toast.error(message);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getSchoolRegistrationById(registrationId);
        if (!isMounted) return;
        setRegistration(normalizeRegistration(response));
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message ||
          "Unable to load school registration. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [registrationId, fallback]);

  if (!registration && loading) {
    return (
      <div className="dashboard-body dashboard-body-card">
        <div className="flex h-40 items-center justify-center">
          <Calendar className="animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  const InfoRow = ({ label, value, icon }) => (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 text-slate-500">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="text-sm font-medium text-slate-800">{value || "—"}</div>
      </div>
    </div>
  );

  const InfoWrap = ({ label, value, icon }) => (
    <div className="flex items-start gap-3 py-2 grow flex-[45%]">
      <div className="mt-0.5 text-slate-500">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="text-sm font-medium text-slate-800">{value || "—"}</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>
            {resolvedRole === "school" ? "School Dashboard" : "Admin Dashboard"}
          </h4>
          <h1>School Registration Detail</h1>
          <p className="text-slate-600 text-md">
            Review the submitted information for this school.
          </p>
        </div>
        <div className="dh-right">
          <Link
            to={`${basePath}/school-registrations-lists`}
            className="global-btn secondary"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="dashboard-body">
        {error && (
          <Alert variant="destructive" className="alert-custom mb-4">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {registration && (
          <div className="space-y-6">
            <section className="inner-detail-card dashboard-body-card-dtl">
              <div className="idc-left">
                <div className="flex gap-3">
                  <div className="school-icon">
                    <School size={28} />
                  </div>
                  <div className="school-detail">
                    <h1>{registration?.school_name || "Unnamed School"}</h1>
                    {registration?.city && (
                      <p>
                        <Flag size={16} className="text-[#AD474B]" />{" "}
                        <span>{registration?.city}</span>
                      </p>
                    )}
                    {registration?.created_at && (
                      <p>
                        <Calendar size={16} className="text-[#AD474B]" />
                        Registered at:{" "}
                        <span>{formatDate(registration?.created_at)}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  School
                </h3>
                <InfoRow
                  label="School Name"
                  value={registration?.school_name}
                  icon={<School size={16} />}
                />
                <InfoRow
                  label="City"
                  value={registration?.city}
                  icon={<Flag size={16} />}
                />
                <InfoRow
                  label="Address"
                  value={registration?.address}
                  icon={<Home size={16} />}
                />
                {/* <InfoRow
                  label="Status"
                  value={registration.status || "pending"}
                  icon={<Flag size={16} />}
                /> */}
              </div>

              <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Contact Info
                </h3>
                <div className="flex border-b border-slate-100">
                  <InfoWrap
                    label="Principal Name"
                    value={registration?.principal_name}
                    icon={<User size={16} />}
                  />
                  <InfoWrap
                    label="Principal Phone"
                    value={registration?.principal_phone}
                    icon={<Phone size={16} />}
                  />
                </div>
                <div className="flex border-b border-slate-100 last:border-0">
                  <InfoWrap
                    label="Focal Person Name"
                    value={registration?.focal_person_name}
                    icon={<User size={16} />}
                  />
                  <InfoWrap
                    label="Focal Person Phone"
                    value={registration?.focal_person_phone}
                    icon={<Phone size={16} />}
                  />
                </div>
              </div>

              {/* <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Review
                </h3>
                <InfoRow
                  label="Status"
                  value={registration.status || "pending"}
                  icon={<Flag size={16} />}
                />
                <InfoRow
                  label="Reviewed By"
                  value={registration.reviewed_by || "Not reviewed"}
                  icon={<User size={16} />}
                />
                <InfoRow
                  label="Reviewed At"
                  value={
                    registration.reviewed_at
                      ? formatDate(registration.reviewed_at)
                      : "—"
                  }
                  icon={<Calendar size={16} />}
                />
                <InfoRow
                  label="Admin Notes"
                  value={registration.admin_notes}
                  icon={<Flag size={16} />}
                />
              </div> */}
            </section>
          </div>
        )}

        {!registration && !loading && !error && (
          <p className="text-slate-500">No registration data available.</p>
        )}
      </div>
    </>
  );
};

export default SchoolRegistrationDetail;
