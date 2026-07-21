import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import StudentDetailComp from "@/components/StudentDetailComp";

const CentralizedStudentDetail = () => {
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
      title="Student Detail"
    />
  );
};

export default CentralizedStudentDetail;
