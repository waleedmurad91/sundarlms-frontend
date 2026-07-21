import React from "react";
import ContestSessionDetailView from "@/components/admin/ContestSessionDetailView";
import {
  getRmcResultStatus,
  getRmcSessionDetail,
  getRmcSessionExport,
  getRmcScoresTemplate,
  publishRmcResults,
  uploadRmcScores,
} from "@/api/pmcRmcSessionsApi";

const RMCSessionDetail = () => {
  return (
    <ContestSessionDetailView
      contestKey="rmc"
      fetchDetail={getRmcSessionDetail}
      exportDetail={getRmcSessionExport}
      publishResults={publishRmcResults}
      fetchResultStatus={getRmcResultStatus}
      uploadDetail={uploadRmcScores}
      downloadTemplate={getRmcScoresTemplate}
      listPath="/admin/rmc-sessions-lists"
      editPathPrefix="/admin/rmc-session-form"
      showSessionType={false}
      showContestTime
      registrationClosingPattern="MMM dd, yyyy"
    />
  );
};

export default RMCSessionDetail;
