import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  AlertCircleIcon,
  Calendar,
  Flag,
  GraduationCap,
  Home,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { getStudentRegistrationById } from "@/api/registrationsApi";
import { useAuthStore } from "@/store/auth";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import { getCertificateById } from "@/api/certificateApi";
import Certificate from "@/components/Certificate";

const formatDate = (value) => {
  if (!value) return "";
  try {
    return format(new Date(value), "MMM dd, yyyy - hh:mm a");
  } catch {
    return String(value);
  }
};

const normalizeCertification = (payload) => {
  const data = payload?.data ?? payload ?? {};
  if (!data) return null;
  return {
    id:
      data?.id ??
      data?._id ??
      data?.registration_id ??
      data?.registrationId ??
      null,
    student_name: data?.student_name ?? data?.name ?? "",
    batch: data?.batch ?? "",
    certificate_status: data?.certificate_status ?? "",
    laptop_returned: data?.laptop_returned ?? false,
    issue_date: data?.issue_date ?? "",
    completion_date: data?.completion_date ?? "",
    ssid: data?.ssid ?? "",
  };
};

const OrganizationDetail = () => {
  const { role: storeRole, user } = useAuthStore();
  const resolvedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallback = React.useMemo(
    () => normalizeCertification(state?.certificate),
    [state?.certificate],
  );
  const certificateId = paramsId || state?.certificateId || fallback?.id;

  const [certificate, setCertificate] = React.useState(fallback);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (fallback && fallback.id === certificateId && fallback.raw) {
      return;
    }
    if (!certificateId) {
      const message =
        "Certificate identifier is missing. Please open this page from the certificate list.";
      setError(message);
      toast.error(message);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getCertificateById(certificateId);
        console.log(response);
        if (!isMounted) return;
        setCertificate(normalizeCertification(response));
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message || "Unable to load certificate. Please try again.";
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
  }, [certificateId, fallback]);

  if (!certificate && loading) {
    return (
      <div className="dashboard-body dashboard-body-card">
        <div className="flex h-40 items-center justify-center">
          <Calendar className="animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>
            {resolvedRole === "school" ? "School Dashboard" : "Admin Dashboard"}
          </h4>
          <h1>Certificate Detail</h1>
          <p className="text-slate-600 text-md">
            View certificate details and preview.
          </p>
        </div>
        <div className="dh-right">
          <Link
            to={`${basePath}/certificate-lists`}
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

        {certificate &&
          (() => {
            const isBlocked = certificate.certificate_status === "blocked";

            return (
              <div className="space-y-6">
                {/* Laptop Return Warning - Only show if laptop not returned */}
                {isBlocked && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-6 max-w-2xl mx-auto">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg
                          className="w-8 h-8 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-red-900 mb-3 text-xl">
                          ⚠️ Laptop Return Required
                        </h4>
                        <p className="text-base text-red-800 mb-4 font-semibold">
                          This certificate has been blocked because the issued
                          laptop has not been returned.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Certificate Blocked Message - Show if laptop not returned */}
                {isBlocked && (
                  <div className="bg-red-100 border-2 border-red-500 p-12 text-center max-w-2xl mx-auto">
                    <div className="mb-4">
                      <svg
                        className="w-20 h-20 text-red-600 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold text-red-800 mb-4">
                      Certificate Not Available
                    </h3>
                    <p className="text-lg text-red-700 mb-2">
                      This certificate has been blocked due to unreturned
                      laptop.
                    </p>
                  </div>
                )}

                {/* Certificate Preview - Only show if no unreturned laptop */}
                {!isBlocked && (
                  <>
                    <Certificate
                      studentName={certificate.student_name}
                      batch={certificate.batch}
                      completionDate={certificate.completion_date}
                      issueDate={certificate.issue_date}
                    />
                  </>
                )}
              </div>
            );
          })()}

        {!certificate && !loading && !error && (
          <p className="text-slate-500">No certificate data available.</p>
        )}
      </div>
    </>
  );
};

export default OrganizationDetail;
