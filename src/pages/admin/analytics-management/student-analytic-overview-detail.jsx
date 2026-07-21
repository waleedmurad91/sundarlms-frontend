import React from "react";
import StudentDetailComp from "@/components/StudentDetailComp";
import { useLocation, useParams } from "react-router-dom";

const StudentAnalyticsOverviewDetail = () => {
  const { id: paramsId } = useParams();
  const { state } = useLocation();
  const [error, setError] = React.useState("");
  const studentId = paramsId || state?.studentId || state?.student?.id;

  React.useEffect(() => {
    if (!studentId) {
      const message =
        "Student identifier is missing. Please open this page from the students list.";
      setError(message);
      toast.error(message);
      return;
    }
  }, [studentId]);
  return (
    <StudentDetailComp
      studentId={studentId}
      state={state}
      title="Analytic Overview Detail"
    />
  );
};

export default StudentAnalyticsOverviewDetail;
