import React from "react";
import ContestSessionDetailView from "@/components/admin/ContestSessionDetailView";
import {
  getPmcSessionDetail,
  getPmcSessionExport,
  getPmcQuilgoLinkTemplate,
  getPmcResultStatus,
  getPmcScoresTemplate,
  getPmcScoresTemplateRound2,
  publishPmcResults,
  uploadPmcResults,
  uploadPmcResultsRound2,
  uploadPmcQuilgoLink,
} from "@/api/pmcRmcSessionsApi";

const PMCSessionDetail = () => {
  return (
    <ContestSessionDetailView
      contestKey="pmc"
      fetchDetail={getPmcSessionDetail}
      exportDetail={getPmcSessionExport}
      publishResults={publishPmcResults}
      fetchResultStatus={getPmcResultStatus}
      uploadDetail={uploadPmcQuilgoLink}
      downloadTemplate={getPmcQuilgoLinkTemplate}
      downloadTemplateLabel="Download Quilgo Template"
      secondaryDownloadTemplate={getPmcScoresTemplate}
      secondaryDownloadLabel="Round 1 PMC Results Template"
      secondaryDownloadErrorMessage="Unable to download PMC scores template."
      tertiaryDownloadTemplate={getPmcScoresTemplateRound2}
      tertiaryDownloadLabel="Round 2 PMC Results Template"
      tertiaryDownloadErrorMessage="Unable to download PMC round 2 scores template."
      tertiaryDownloadVisible={(session) => Number(session?.round) === 2}
      secondaryUploadDetail={uploadPmcResults}
      secondaryUploadDetailRound2={uploadPmcResultsRound2}
      secondaryUploadLabel="Upload PMC Results"
      secondaryUploadDescription="Upload excel file to import PMC results for this session."
      secondaryUploadSuccessMessage="PMC results uploaded successfully."
      secondaryUploadErrorMessage="Unable to upload PMC results right now."
      listPath="/admin/pmc-sessions-lists"
      editPathPrefix="/admin/pmc-session-form"
    />
  );
};

export default PMCSessionDetail;
