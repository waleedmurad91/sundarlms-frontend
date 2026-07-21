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
    id:
      data?.id ??
      data?._id ??
      data?.registration_id ??
      data?.registrationId ??
      null,
    student_name: data?.student_name ?? data?.name ?? "",
    gender: data?.gender ?? "",
    grade: data?.grade ?? "",
    dob: data?.dob ?? data?.date_of_birth ?? "",
    student_phone: data?.student_phone ?? "",
    email: data?.email ?? "",
    father_name: data?.father_name ?? "",
    father_cnic: data?.father_cnic ?? "",
    father_phone: data?.father_phone ?? "",
    school: data?.school ?? "",
    district: data?.district ?? "",
    city: data?.city ?? "",
    address: data?.address ?? "",
    formb_id: data?.formb_id ?? data?.form_b ?? "",
    photo: data?.photo_path ?? "",
    agree: data?.agree ?? data?.agreed ?? false,
    created_at: data?.created_at ?? data?.createdAt ?? data?.timestamp ?? "",
    raw: data,
  };
};

const StudentRegistrationDetail = () => {
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
  const [isPhotoOpen, setIsPhotoOpen] = React.useState(false);

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
        const response = await getStudentRegistrationById(registrationId);
        if (!isMounted) return;
        setRegistration(normalizeRegistration(response));
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message ||
          "Unable to load student registration. Please try again.";
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

  const getAssignmentCoverSrc = (images) => {
    const path = extractFirstImagePath(images);
    return buildBackendFileUrl(path);
  };

  const photoSrc = registration?.photo
    ? getAssignmentCoverSrc(registration.photo)
    : null;

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

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>
            {resolvedRole === "school" ? "School Dashboard" : "Admin Dashboard"}
          </h4>
          <h1>Student Registration Detail</h1>
          <p className="text-slate-600 text-md">
            Review the submitted information for this applicant.
          </p>
        </div>
        {/* <div className="dh-right">
          <Link
            to={`${basePath}/student-registrations-lists`}
            className="global-btn secondary"
          >
            Back
          </Link>
        </div> */}
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
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={registration.student_name || "Student"}
                        className="cursor-pointer"
                        onClick={() => setIsPhotoOpen(true)}
                      />
                    ) : null}
                  </div>
                  <div className="school-detail">
                    <h1>{registration.student_name || "Unnamed Student"}</h1>
                    <p>
                      <GraduationCap size={16} className="text-[#AD474B]" />{" "}
                      <span>{registration.grade || "Grade not specified"}</span>
                    </p>
                    {registration.email && (
                      <p>
                        <Mail size={16} className="text-[#AD474B]" />{" "}
                        <span>{registration.email}</span>
                      </p>
                    )}
                    {registration.student_phone && (
                      <p>
                        <Phone size={16} className="text-[#AD474B]" />{" "}
                        <span>{registration.student_phone}</span>
                      </p>
                    )}
                    {registration.student_phone && (
                      <p>
                        <Calendar size={16} className="text-[#AD474B]" />{" "}
                        <span>
                          {registration.created_at
                            ? formatDate(registration.created_at)
                            : "—"}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Student Information
                </h3>
                <InfoRow
                  label="Name"
                  value={registration.student_name}
                  icon={<User size={16} />}
                />
                <InfoRow
                  label="Gender"
                  value={registration.gender}
                  icon={<Flag size={16} />}
                />
                <InfoRow
                  label="Grade"
                  value={registration.grade}
                  icon={<GraduationCap size={16} />}
                />
                <InfoRow
                  label="Date of Birth"
                  value={format(registration.dob, "dd-MMMM-y")}
                  icon={<Calendar size={16} />}
                />
                <InfoRow
                  label="Form-B / Smart Card ID"
                  value={registration.formb_id}
                  icon={<Flag size={16} />}
                />
              </div>

              <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Contact
                </h3>
                <InfoRow
                  label="Student Phone"
                  value={registration.student_phone}
                  icon={<Phone size={16} />}
                />
                <InfoRow
                  label="Email"
                  value={registration.email}
                  icon={<Mail size={16} />}
                />
                <InfoRow
                  label="Address"
                  value={registration.address}
                  icon={<Home size={16} />}
                />
                <InfoRow
                  label="Province / City"
                  value={
                    [registration.district, registration.city]
                      .filter(Boolean)
                      .join(", ") || ""
                  }
                  icon={<Flag size={16} />}
                />
              </div>

              <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Parent / Guardian
                </h3>
                <InfoRow
                  label="Father Name"
                  value={registration.father_name}
                  icon={<User size={16} />}
                />
                <InfoRow
                  label="Father CNIC"
                  value={registration.father_cnic}
                  icon={<Flag size={16} />}
                />
                <InfoRow
                  label="Father Phone"
                  value={registration.father_phone}
                  icon={<Phone size={16} />}
                />
              </div>

              <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  School & IDs
                </h3>
                <InfoRow
                  label="School"
                  value={registration.school}
                  icon={<GraduationCap size={16} />}
                />
              </div>
            </section>
          </div>
        )}

        {!registration && !loading && !error && (
          <p className="text-slate-500">No registration data available.</p>
        )}
      </div>

      {isPhotoOpen && photoSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-4xl rounded-lg bg-white p-4 shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-md cursor-pointer border border-[#AD474B] bg-[#AD474B] px-2 py-1 text-sm text-white "
              onClick={() => setIsPhotoOpen(false)}
              aria-label="Close photo"
            >
              Close
            </button>
            <div className="flex items-center justify-center">
              <img
                src={photoSrc}
                alt={registration.student_name || "Student"}
                className="max-h-[80vh] w-auto rounded-md object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default StudentRegistrationDetail;
