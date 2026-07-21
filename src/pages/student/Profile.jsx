import React from "react";
import StudentBadgeShowcase from "@/components/profile/StudentBadgeShowcase";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import CentralizedStudentForm from "@/pages/admin/student-centralized/centralizedStudentForm";
import { useAuthStore } from "@/store/auth";
import { useStudentPortal } from "@/context/StudentPortalContext";
import {
  getEditRequestStatus,
  createEditRequest,
} from "@/api/profileEditRequest";

const resolveStudentId = (student, user) =>
  String(
    student?.id ??
      student?._id ??
      student?.registration_id ??
      student?.registrationId ??
      student?.student_id ??
      student?.studentId ??
      user?.student_id ??
      user?.studentId ??
      "",
  ).trim();

const StudentProfile = () => {
  const [searchParams] = useSearchParams();
  const { student, user } = useAuthStore();
  const { refresh } = useStudentPortal();
  const showBadgesSection = searchParams.get("view") === "badges";
  const studentId = resolveStudentId(student, user);

  const [requestStatus, setRequestStatus] = React.useState(null);
  const [creating, setCreating] = React.useState(false);

  const fetchStatus = React.useCallback(async () => {
    try {
      const json = await getEditRequestStatus();
      // Response shape: { status: true, data: null } when no request
      //                  { status: true, data: { status: "pending|approved|rejected" } } when request exists
      const requestData = json?.data;
      if (requestData && requestData.status) {
        setRequestStatus(requestData.status);
      } else {
        setRequestStatus(null);
      }
    } catch (err) {
      console.error("Failed to fetch edit request status:", err);
      setRequestStatus(null);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleCreateRequest = async () => {
    setCreating(true);
    try {
      await createEditRequest({});
      toast.success("Edit request submitted successfully.");
      setRequestStatus("pending"); // optimistic update
      await fetchStatus(); // confirm from server
    } catch (err) {
      toast.error(err?.message || "Failed to create edit request.");
    } finally {
      setCreating(false);
    }
  };

  const isEditAllowed = requestStatus?.toLowerCase() === "approved";

  return (
    <div className="space-y-6 pl-7">
      {showBadgesSection ? (
        <StudentBadgeShowcase />
      ) : (
        <CentralizedStudentForm
          profileMode={true}
          forcedStudentId={studentId}
          dashboardTitle="My Account"
          pageTitle="Profile"
          isEditable={isEditAllowed}
          onCreateEditRequest={handleCreateRequest}
          isCreatingRequest={creating}
          editRequestStatus={requestStatus}
          onSuccess={refresh}
        />
      )}
    </div>
  );
};

export default StudentProfile;
