import React from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertCircleIcon,
  Calendar,
  ChevronDown,
  Clock3,
  Download,
  Edit,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  School,
  Users,
  X,
} from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import DemographicCard from "@/components/DemographicCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
  from: 0,
  to: 0,
};

const formatDateValue = (value, pattern = "MMM dd, yyyy") => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return format(date, pattern);
};

const formatTimeValue = (value, { showMeridiem = false } = {}) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "N/A";

  const meridiemMatch = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (showMeridiem && meridiemMatch) {
    const hours = Number(meridiemMatch[1]);
    const minutes = meridiemMatch[2];
    const suffix = meridiemMatch[3].toUpperCase();
    return Number.isNaN(hours) ? raw : `${hours}:${minutes} ${suffix}`;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;

  const hours = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours)) return raw;

  if (!showMeridiem) {
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
};

const formatTimeSlot = (slot) => {
  if (!slot) return "N/A";
  const start = formatTimeValue(slot?.start_time ?? slot?.startTime);
  const end = formatTimeValue(slot?.end_time ?? slot?.endTime);
  return start && end && start !== "N/A" && end !== "N/A"
    ? `${start} - ${end}`
    : start || end || "N/A";
};

const formatContestDateDisplay = ({
  dateValue,
  timeValue,
  datePattern = "MMM dd, yyyy",
}) => {
  const formattedDate = formatDateValue(dateValue, datePattern);
  if (formattedDate === "N/A") return formattedDate;

  const formattedTime = formatTimeValue(timeValue, { showMeridiem: true });
  return formattedTime !== "N/A"
    ? `${formattedDate} - ${formattedTime}`
    : formattedDate;
};

const toItems = (value) => (Array.isArray(value) ? value : []);

const PMC_RESULT_STATUS_META = {
  qualified: {
    label: "Qualified",
    className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  not_qualified: {
    label: "Not Qualified",
    className: "border border-amber-200 bg-amber-50 text-amber-700",
  },
  not_qualified_due_to_integrity_breach: {
    label: "Integrity Breach",
    className: "border border-rose-200 bg-rose-50 text-rose-700",
  },
};

const toTitleLabel = (value) =>
  String(value ?? "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getPmcResultStatusMeta = (value) => {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!key) return null;

  return (
    PMC_RESULT_STATUS_META[key] ?? {
      label: toTitleLabel(key),
      className: "border border-slate-200 bg-slate-100 text-slate-700",
    }
  );
};

const getPmcRoundTwoScoreValue = (row) =>
  row?.result?.score ??
  row?.result?.obtained_marks ??
  row?.result?.marks ??
  row?.score ??
  "N/A";

const getPmcRoundTwoSsidValue = (row) =>
  row?.result?.ssid ?? row?.ssid ?? row?.student?.ssid ?? "N/A";

const ContestSessionDetailView = ({
  contestKey,
  fetchDetail,
  exportDetail,
  uploadDetail,
  downloadTemplate,
  downloadTemplateLabel = "Download Template",
  secondaryDownloadTemplate,
  secondaryDownloadLabel = "",
  secondaryDownloadSuccessMessage = "",
  secondaryDownloadErrorMessage = "",
  tertiaryDownloadTemplate,
  tertiaryDownloadLabel = "",
  tertiaryDownloadSuccessMessage = "",
  tertiaryDownloadErrorMessage = "",
  tertiaryDownloadVisible = true,
  listPath,
  editPathPrefix,
  publishResults,
  fetchResultStatus,
  secondaryUploadDetail,
  secondaryUploadDetailRound2,
  secondaryUploadLabel = "",
  secondaryUploadDescription = "",
  secondaryUploadSuccessMessage = "",
  secondaryUploadErrorMessage = "",
  showSessionType = true,
  contestDatePattern = "MMM dd, yyyy",
  showContestTime = false,
  registrationClosingPattern = "MMM dd, yyyy",
}) => {
  const { id } = useParams();
  const [records, setRecords] = React.useState([]);
  const [summary, setSummary] = React.useState({});
  const [session, setSession] = React.useState({});
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] =
    React.useState(false);
  const [isPublishingResults, setIsPublishingResults] = React.useState(false);
  const [resultsStatusLoading, setResultsStatusLoading] = React.useState(false);
  const [isResultsPublished, setIsResultsPublished] = React.useState(false);
  const [activeTemplateMode, setActiveTemplateMode] = React.useState("primary");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [activeUploadMode, setActiveUploadMode] = React.useState("primary");
  const [uploadFile, setUploadFile] = React.useState(null);
  const [error, setError] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const contestLabel = contestKey.toUpperCase();
  const uploadLabel =
    contestKey === "pmc" ? "Upload Quilgo Links" : "Upload Scores";
  const templateFallbackName =
    contestKey === "pmc"
      ? `${contestKey}_quilgo_template_${id}.csv`
      : `${contestKey}_scores_template_${id}.csv`;
  const exportFallbackName = `${contestKey}_session_participants_${id}.csv`;
  const hasSecondaryTemplate = typeof secondaryDownloadTemplate === "function";
  const hasTertiaryTemplate = typeof tertiaryDownloadTemplate === "function";
  const hasPublishResultsAction = typeof publishResults === "function";
  const hasFetchResultStatus = typeof fetchResultStatus === "function";
  const isPmcRoundTwo = contestKey === "pmc" && Number(session?.round) === 2;
  const resolvedSecondaryUploadDetail =
    isPmcRoundTwo && typeof secondaryUploadDetailRound2 === "function"
      ? secondaryUploadDetailRound2
      : secondaryUploadDetail;
  const hasSecondaryUpload =
    typeof resolvedSecondaryUploadDetail === "function";
  const showPrimaryUploadAction = !(contestKey === "pmc" && isPmcRoundTwo);
  const showPrimaryTemplateAction = !(contestKey === "pmc" && isPmcRoundTwo);
  const showSecondaryTemplateAction =
    hasSecondaryTemplate && !(contestKey === "pmc" && isPmcRoundTwo);
  const tableColSpan = contestKey === "pmc" ? (isPmcRoundTwo ? 9 : 10) : 8;
  const shouldShowTertiaryTemplate =
    hasTertiaryTemplate &&
    (typeof tertiaryDownloadVisible === "function"
      ? Boolean(tertiaryDownloadVisible(session))
      : Boolean(tertiaryDownloadVisible));
  const activeUploadConfig =
    activeUploadMode === "secondary" && hasSecondaryUpload
      ? {
          label: secondaryUploadLabel || "Upload File",
          description:
            secondaryUploadDescription ||
            "Upload excel file to update this session's participant data.",
          submitLabel: secondaryUploadLabel || "Upload File",
          handler: resolvedSecondaryUploadDetail,
          successMessage:
            secondaryUploadSuccessMessage || "File uploaded successfully.",
          errorMessage:
            secondaryUploadErrorMessage || "Unable to upload file right now.",
        }
      : {
          label: uploadLabel,
          description:
            "Upload excel file to update this session's participant data.",
          submitLabel: uploadLabel,
          handler: uploadDetail,
          successMessage:
            contestKey === "pmc"
              ? "Quilgo links uploaded successfully."
              : "Scores uploaded successfully.",
          errorMessage:
            contestKey === "pmc"
              ? "Unable to upload Quilgo links right now."
              : "Unable to upload scores right now.",
        };

  const resolveResultPublishedStatus = React.useCallback((payload) => {
    const directValue =
      payload?.is_published ??
      payload?.published ??
      payload?.data?.is_published ??
      payload?.data?.published;

    if (directValue === true || directValue === false) {
      return directValue;
    }

    const normalized = String(directValue ?? "")
      .trim()
      .toLowerCase();

    return ["1", "true", "yes", "published"].includes(normalized);
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    const loadDetails = async () => {
      if (!id) {
        setError("Session id is missing.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetchDetail(id, {
          page: currentPage,
          per_page: rowsPerPage,
        });

        if (!isMounted) return;

        const pageContainer = response?.data ?? {};
        const pageData = toItems(pageContainer?.data);
        const resolvedCurrent = Number(
          pageContainer?.current_page ?? currentPage,
        );
        const resolvedPerPage = Number(pageContainer?.per_page ?? rowsPerPage);
        const resolvedTotal = Number(pageContainer?.total ?? pageData.length);
        const resolvedLast = Number(pageContainer?.last_page ?? 1);
        const resolvedFrom =
          Number(pageContainer?.from) ||
          (pageData.length ? (resolvedCurrent - 1) * resolvedPerPage + 1 : 0);
        const resolvedTo =
          Number(pageContainer?.to) ||
          (pageData.length ? resolvedFrom + pageData.length - 1 : 0);

        setSummary(response?.summary ?? {});
        setSession(response?.session ?? {});
        setRecords(pageData);
        setPagination({
          current_page: resolvedCurrent,
          last_page: resolvedLast,
          per_page: resolvedPerPage,
          total: resolvedTotal,
          from: resolvedFrom,
          to: resolvedTo,
        });
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message || `Failed to load ${contestLabel} session details.`;
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [contestLabel, currentPage, fetchDetail, id, refreshKey, rowsPerPage]);

  React.useEffect(() => {
    if (!id || !hasFetchResultStatus) return;

    let isMounted = true;

    const loadResultStatus = async () => {
      try {
        setResultsStatusLoading(true);
        const response = await fetchResultStatus(id);
        if (!isMounted) return;
        setIsResultsPublished(resolveResultPublishedStatus(response));
      } catch (err) {
        if (!isMounted) return;
        toast.error(
          err?.message ||
            `Unable to load ${contestLabel} result publication status.`,
        );
      } finally {
        if (isMounted) {
          setResultsStatusLoading(false);
        }
      }
    };

    loadResultStatus();

    return () => {
      isMounted = false;
    };
  }, [
    contestLabel,
    fetchResultStatus,
    hasFetchResultStatus,
    id,
    refreshKey,
    resolveResultPublishedStatus,
  ]);

  const summaryItems =
    contestKey === "pmc"
      ? toItems(summary?.time_slot_totals).map((item) => ({
          id: item?.pmc_time_slot_id ?? item?.id,
          label: formatTimeSlot(item?.time_slot),
          total: item?.total_participants ?? 0,
        }))
      : toItems(summary?.venue_totals).map((item) => ({
          id: item?.rmc_venue_id ?? item?.id,
          label:
            item?.venue?.name ?? item?.venue?.title ?? item?.label ?? "Venue",
          total: item?.total_participants ?? 0,
        }));

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;

  const downloadFileResponse = (response, fallbackName) => {
    const payload = response?.data;

    if (!payload) {
      throw new Error("Download failed. No file received.");
    }

    const contentType =
      response?.headers?.["content-type"] || "application/octet-stream";
    const fileBlob =
      payload instanceof Blob
        ? payload
        : new Blob([payload], { type: contentType });

    const disposition = response?.headers?.["content-disposition"] || "";
    const matchedFilename =
      disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ??
      disposition.match(/filename="?([^"]+)"?/i)?.[1];
    const filename = matchedFilename
      ? decodeURIComponent(matchedFilename)
      : fallbackName;

    const url = window.URL.createObjectURL(fileBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const closeUploadModal = (force = false) => {
    if (isUploading && !force) return;
    setIsUploadOpen(false);
    setUploadFile(null);
    setActiveUploadMode("primary");
  };

  const handleExport = async () => {
    if (!id || typeof exportDetail !== "function") {
      toast.error("Export is not available for this session.");
      return;
    }

    setIsExporting(true);
    try {
      const response = await exportDetail(id);
      downloadFileResponse(response, exportFallbackName);
      toast.success("Export started. Your download should begin shortly.");
    } catch (err) {
      const message =
        err?.message || `Unable to export ${contestLabel} session data.`;
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateDownload = async (mode = "primary") => {
    const resolvedMode =
      mode === "tertiary"
        ? "tertiary"
        : mode === "secondary"
          ? "secondary"
          : "primary";
    setActiveTemplateMode(resolvedMode);

    const config =
      resolvedMode === "tertiary" && shouldShowTertiaryTemplate
        ? {
            label: tertiaryDownloadLabel || "Download Template",
            handler: tertiaryDownloadTemplate,
            fallbackName: `${contestKey}_tertiary_template_${id}.csv`,
            successMessage:
              tertiaryDownloadSuccessMessage || "Template download started.",
            errorMessage:
              tertiaryDownloadErrorMessage || "Unable to download template.",
          }
        : resolvedMode === "secondary" && hasSecondaryTemplate
          ? {
              label: secondaryDownloadLabel || "Download Template",
              handler: secondaryDownloadTemplate,
              fallbackName: `${contestKey}_secondary_template_${id}.csv`,
              successMessage:
                secondaryDownloadSuccessMessage || "Template download started.",
              errorMessage:
                secondaryDownloadErrorMessage || "Unable to download template.",
            }
          : {
              label: downloadTemplateLabel,
              handler: downloadTemplate,
              fallbackName: templateFallbackName,
              successMessage: "Template download started.",
              errorMessage: `Unable to download ${contestLabel} template.`,
            };

    if (!id || typeof config?.handler !== "function") {
      toast.error("Template download is not available for this session.");
      return;
    }

    setIsDownloadingTemplate(true);
    try {
      const response = await config.handler(id);
      downloadFileResponse(response, config.fallbackName);
      toast.success(config.successMessage);
    } catch (err) {
      const message = err?.message || config.errorMessage;
      toast.error(message);
    } finally {
      setIsDownloadingTemplate(false);
      setActiveTemplateMode("primary");
    }
  };

  const handleUploadSubmit = async () => {
    if (!id || typeof activeUploadConfig?.handler !== "function") {
      toast.error("Upload is not available for this session.");
      return;
    }

    if (!uploadFile) {
      toast.error("Please select an Excel file first.");
      return;
    }

    setIsUploading(true);
    try {
      const payload = new FormData();
      payload.append("file", uploadFile);
      const response = await activeUploadConfig.handler(id, payload);
      const message = response?.message || activeUploadConfig.successMessage;
      toast.success(message);
      closeUploadModal(true);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      const message = err?.message || activeUploadConfig.errorMessage;
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublishResultsToggle = async () => {
    if (!id || !hasPublishResultsAction) {
      toast.error("Result publication is not available for this session.");
      return;
    }

    const nextPublishedState = !isResultsPublished;

    try {
      setIsPublishingResults(true);
      const response = await publishResults(id, {
        is_published: nextPublishedState,
      });

      const resolvedPublishedState =
        response && typeof response === "object"
          ? resolveResultPublishedStatus(response)
          : nextPublishedState;

      setIsResultsPublished(resolvedPublishedState);
      toast.success(
        response?.message ||
          `Results ${
            resolvedPublishedState ? "published" : "unpublished"
          } successfully.`,
      );
    } catch (err) {
      toast.error(
        err?.message ||
          `Unable to ${
            nextPublishedState ? "publish" : "unpublish"
          } ${contestLabel} results.`,
      );
    } finally {
      setIsPublishingResults(false);
    }
  };

  const openPrimaryUpload = () => {
    setActiveUploadMode("primary");
    setIsUploadOpen(true);
  };

  const openSecondaryUpload = () => {
    setActiveUploadMode("secondary");
    setIsUploadOpen(true);
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{contestLabel} Session Detail</h1>
          <p className="text-slate-600 text-md">
            Review session information, participation summary, and the paginated
            list of registered students.
          </p>
        </div>
        <div className="dh-right flex gap-2">
          <Link to={listPath} className="global-btn !bg-white !text-[#912024]">
            Back
          </Link>
          {id ? (
            <Link to={`${editPathPrefix}/${id}`} className="global-btn">
              Edit Session <Edit size={15} />
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="alert-custom mb-4">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}

      {isUploadOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {activeUploadConfig.label}
                </h2>
                <p className="text-sm text-slate-500">
                  {activeUploadConfig.description}
                </p>
              </div>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-700"
                onClick={closeUploadModal}
                disabled={isUploading}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Excel file
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,text/csv"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  onChange={(event) =>
                    setUploadFile(event?.target?.files?.[0] ?? null)
                  }
                  disabled={isUploading}
                />
                {uploadFile ? (
                  <p className="text-xs text-slate-500">
                    Selected: {uploadFile.name}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeUploadModal}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="global-btn flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    activeUploadConfig.submitLabel
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {loading && !session?.id ? (
        <div className="dashboard-body dashboard-body-card flex min-h-[260px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <>
          <section className="metrics-grid metrics-grid3 mt-5 mb-6">
            <DemographicCard
              icon={<Users size={24} />}
              title="Participants"
              classname="demoGreen"
              count={summary?.total_participants ?? 0}
              subheading="Total registered students"
            />
            <DemographicCard
              icon={<Clock3 size={24} />}
              title={contestKey === "pmc" ? "Time Slots" : "Breakdown"}
              classname="demoBlue"
              count={summaryItems.length}
              subheading={
                contestKey === "pmc"
                  ? "Configured summary slots"
                  : "Venue participation groups"
              }
            />
            <DemographicCard
              icon={<Calendar size={24} />}
              classname="demoOrange"
              count={formatDateValue(session?.contest_date)}
              subheading="Scheduled contest day"
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="dashboard-body dashboard-body-card">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Session Information
                </h2>
                <p className="text-sm text-slate-500">
                  Key configuration and registration dates for this session.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Title
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {session?.title ?? "N/A"}
                  </p>
                </div>
                {showSessionType ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Type
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {session?.type ?? "N/A"}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Contest Date
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatContestDateDisplay({
                      dateValue: session?.contest_date,
                      timeValue: showContestTime ? session?.contest_time : null,
                      datePattern: contestDatePattern,
                    })}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Registration Closes
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDateValue(
                      session?.registration_closing_date,
                      registrationClosingPattern,
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {session?.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                {/* <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Updated At
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDateValue(session?.updated_at, "MMM dd, yyyy p")}
                  </p>
                </div> */}
              </div>

              {contestKey === "pmc" && toItems(session?.time_slots).length ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Session Time Slots
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {toItems(session?.time_slots).map((slot) => (
                      <span
                        key={slot?.id ?? formatTimeSlot(slot)}
                        className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                      >
                        {formatTimeSlot(slot)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="dashboard-body dashboard-body-card">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Summary
                </h2>
                <p className="text-sm text-slate-500">
                  Participant distribution for this session.
                </p>
              </div>

              {summaryItems.length ? (
                <div className="space-y-3">
                  {summaryItems.map((item) => (
                    <div
                      key={item.id ?? item.label}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700">
                          {item.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {item.total} participant
                          {Number(item.total) === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No summary breakdown available yet.
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-body dashboard-body-card mt-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Participants
                </h2>
                <p className="text-sm text-slate-500">
                  Paginated list of students registered in this session.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 self-start md:self-auto">
                {hasPublishResultsAction ? (
                  <button
                    type="button"
                    className="global-btn secondary flex items-center gap-2"
                    onClick={handlePublishResultsToggle}
                    disabled={
                      !id || isPublishingResults || resultsStatusLoading
                    }
                  >
                    {isPublishingResults || resultsStatusLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
                    {isResultsPublished ? "Unpublish Result" : "Publish Result"}
                  </button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="global-btn secondary flex items-center gap-2"
                      disabled={!id}
                    >
                      Actions
                      <ChevronDown size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {showPrimaryUploadAction ? (
                      <DropdownMenuItem
                        onSelect={openPrimaryUpload}
                        disabled={loading || isUploading || !id}
                      >
                        <FileSpreadsheet size={16} />
                        {uploadLabel}
                      </DropdownMenuItem>
                    ) : null}
                    {hasSecondaryUpload ? (
                      <DropdownMenuItem
                        onSelect={openSecondaryUpload}
                        disabled={loading || isUploading || !id}
                      >
                        <FileSpreadsheet size={16} />
                        {secondaryUploadLabel}
                      </DropdownMenuItem>
                    ) : null}
                    {showPrimaryTemplateAction ||
                    showSecondaryTemplateAction ||
                    shouldShowTertiaryTemplate ||
                    hasSecondaryUpload ? (
                      <DropdownMenuSeparator />
                    ) : null}
                    {showPrimaryTemplateAction ? (
                      <DropdownMenuItem
                        onSelect={() => handleTemplateDownload("primary")}
                        disabled={loading || isDownloadingTemplate || !id}
                      >
                        {isDownloadingTemplate &&
                        activeTemplateMode === "primary" ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        {isDownloadingTemplate &&
                        activeTemplateMode === "primary"
                          ? `${downloadTemplateLabel}...`
                          : downloadTemplateLabel}
                      </DropdownMenuItem>
                    ) : null}
                    {showSecondaryTemplateAction ? (
                      <DropdownMenuItem
                        onSelect={() => handleTemplateDownload("secondary")}
                        disabled={loading || isDownloadingTemplate || !id}
                      >
                        {isDownloadingTemplate &&
                        activeTemplateMode === "secondary" ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        {isDownloadingTemplate &&
                        activeTemplateMode === "secondary"
                          ? `${secondaryDownloadLabel || "Download Template"}...`
                          : secondaryDownloadLabel || "Download Template"}
                      </DropdownMenuItem>
                    ) : null}
                    {shouldShowTertiaryTemplate ? (
                      <DropdownMenuItem
                        onSelect={() => handleTemplateDownload("tertiary")}
                        disabled={loading || isDownloadingTemplate || !id}
                      >
                        {isDownloadingTemplate &&
                        activeTemplateMode === "tertiary" ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        {isDownloadingTemplate &&
                        activeTemplateMode === "tertiary"
                          ? `${tertiaryDownloadLabel || "Download Template"}...`
                          : tertiaryDownloadLabel || "Download Template"}
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem
                      onSelect={handleExport}
                      disabled={loading || isExporting || !id}
                    >
                      {isExporting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      {isExporting ? "Exporting..." : "Export Participants"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <ListToolbar
              showSearch={false}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(value) => {
                setRowsPerPage(value);
                setCurrentPage(1);
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={pagination.total}
              from={pagination.from}
              to={pagination.to}
              onPageChange={setCurrentPage}
              loading={loading}
            />

            <Table className="global-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>
                    {contestKey === "pmc" ? "Time Slot" : "Venue"}
                  </TableHead>
                  <TableHead>Registered At</TableHead>
                  {contestKey === "pmc" ? (
                    <>
                      <TableHead>
                        {isPmcRoundTwo ? "Score" : "Status"}
                      </TableHead>
                      <TableHead>{isPmcRoundTwo ? "SSID" : "Venue"}</TableHead>
                      <TableHead>Remarks</TableHead>
                      {!isPmcRoundTwo ? <TableHead>Link</TableHead> : null}
                    </>
                  ) : (
                    <>
                      <TableHead>Score</TableHead>
                      <TableHead>Remarks</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableColSpan}
                      className="py-8 text-center"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading participants...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableColSpan}
                      className="py-8 text-center"
                    >
                      No participants found for this session.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((row, index) => {
                    const pmcResultStatus = getPmcResultStatusMeta(
                      row?.result?.status,
                    );

                    return (
                      <TableRow key={row?.id ?? row?.student_id ?? index}>
                        <TableCell>{baseRowNumber + index}</TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900">
                            {row?.student?.name ??
                              row?.student?.student_name ??
                              "Student"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row?.student?.formb_id ?? "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="font-medium text-slate-900">
                                {row?.student?.school?.name ?? "N/A"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {row?.student?.school?.city ?? "N/A"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {row?.student?.school_class?.grade?.name ?? "N/A"}
                        </TableCell>
                        <TableCell>
                          {contestKey === "pmc"
                            ? formatTimeSlot(row?.time_slot)
                            : (row?.venue?.name ??
                              row?.rmc_venue?.name ??
                              row?.venue?.title ??
                              "N/A")}
                        </TableCell>
                        <TableCell>
                          {formatDateValue(row?.created_at, "MMM dd, yyyy p")}
                        </TableCell>
                        {contestKey === "pmc" ? (
                          <>
                            <TableCell>
                              {isPmcRoundTwo ? (
                                getPmcRoundTwoScoreValue(row)
                              ) : pmcResultStatus ? (
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${pmcResultStatus.className}`}
                                >
                                  {pmcResultStatus.label}
                                </span>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            <TableCell>
                              {isPmcRoundTwo
                                ? getPmcRoundTwoSsidValue(row)
                                : (row?.result?.venue ?? "N/A")}
                            </TableCell>
                            <TableCell>
                              {row?.result?.remarks ?? "N/A"}
                            </TableCell>
                            {!isPmcRoundTwo ? (
                              <TableCell>
                                {row?.quilgo_link ? (
                                  <a
                                    href={row.quilgo_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                    title="Start contest"
                                  >
                                    <ExternalLink size={16} />
                                    <span>Start Contest</span>
                                  </a>
                                ) : (
                                  <span className="text-sm text-slate-400">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <TableCell>
                              {row?.result?.obtained_marks ?? "N/A"}
                            </TableCell>
                            <TableCell>
                              {row?.result?.remarks ?? "N/A"}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </>
  );
};

export default ContestSessionDetailView;
