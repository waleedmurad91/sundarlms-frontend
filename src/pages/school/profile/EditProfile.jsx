import React from "react";
import SchoolForm from "@/pages/admin/school-management/sForm";
import { useAuthStore } from "@/store/auth";

const resolveSchoolId = (user) => String(user?.role_entity_id ?? "").trim();

const EditSchoolProfile = () => {
  const { user } = useAuthStore();
  const schoolId = resolveSchoolId(user);

  return (
    <SchoolForm
      profileMode={true}
      forcedSchoolId={schoolId}
      dashboardTitle="School Dashboard"
      pageTitle="Update Profile"
      lockIdentityFields={true}
    />
  );
};

export default EditSchoolProfile;
