import React from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Bell,
  Filter,
  Info,
  Loader2,
  Send,
  Tag,
  Text,
  TextInitial,
  X,
} from "lucide-react";
import {
  sendPushToTopicOrToken,
  sendPushToAudience,
  getPmcActiveSessions,
  getPushNotificationGrades,
} from "@/api/appNotificationsApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "school", label: "School" },
  { value: "teacher", label: "Teacher" },
];

const SEND_MODE_OPTIONS = [
  { value: "topic", label: "All Users" },
  { value: "audience", label: "Filtered audience" },
];

const CATEGORY_OPTIONS = [
  { value: "roles", label: "By Role" },
  { value: "grade_names", label: "By Grade" },
  { value: "pmc", label: "By PMC status" },
];

const PMC_STATUS_OPTIONS = [
  { value: "", label: "No PMC filter" },
  { value: "participants", label: "PMC participants" },
  { value: "non_participants", label: "PMC non-participants" },
  { value: "round2_participants", label: "PMC round 2 participants" },
  { value: "round2_non_participants", label: "PMC round 2 non-participants" },
];

const DEFAULT_FORM = {
  sendMode: "topic", // "topic" | "audience"
  target: "all_users",
  title: "",
  body: "",
  category: "roles", // "roles" | "grade_names" | "pmc"
  audienceRoles: [],
  gradeNames: [],
  pmcStatus: "",
  pmcSessionId: "",
  pmcRound1SessionId: "",
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

const buildAudienceFilters = (formField) => {
  if (formField.category === "roles") {
    return { roles: formField.audienceRoles };
  }

  if (formField.category === "grade_names") {
    return { grade_names: formField.gradeNames.map((name) => String(name)) };
  }

  if (formField.category === "pmc") {
    const pmc = { status: formField.pmcStatus };
    if (formField.pmcSessionId) {
      pmc.session_id = Number(formField.pmcSessionId);
    }
    if (formField.pmcRound1SessionId) {
      pmc.round1_session_id = Number(formField.pmcRound1SessionId);
    }
    // PMC filters only ever apply to students, so scope the audience to
    // students under the hood without showing a redundant roles picker.
    return { roles: ["student"], pmc };
  }

  return {};
};

const hasActiveSelection = (formField) => {
  if (formField.category === "roles") {
    return formField.audienceRoles.length > 0;
  }
  if (formField.category === "grade_names") {
    return formField.gradeNames.length > 0;
  }
  if (formField.category === "pmc") {
    return Boolean(formField.pmcStatus);
  }
  return false;
};

const AppNotifications = () => {
  const navigate = useNavigate();

  const [formField, setFormField] = React.useState({ ...DEFAULT_FORM });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [audiencePreview, setAudiencePreview] = React.useState(null);

  const [pmcSessions, setPmcSessions] = React.useState([]);
  const [pmcSessionsMeta, setPmcSessionsMeta] = React.useState(null);
  const [pmcSessionsLoading, setPmcSessionsLoading] = React.useState(false);
  const [pmcSessionsError, setPmcSessionsError] = React.useState("");
  const [pmcSessionsFetchKey, setPmcSessionsFetchKey] = React.useState(0);
  const hasFetchedPmcSessions = React.useRef(false);

  const [grades, setGrades] = React.useState([]);
  const [gradesLoading, setGradesLoading] = React.useState(false);
  const [gradesError, setGradesError] = React.useState("");
  const [gradesFetchKey, setGradesFetchKey] = React.useState(0);
  const hasFetchedGrades = React.useRef(false);

  const previewTimeoutRef = React.useRef(null);
  const previewRequestIdRef = React.useRef(0);

  const isAudienceMode = formField.sendMode === "audience";
  const isPmcCategory = formField.category === "pmc";
  const isRound2Status = formField.pmcStatus.startsWith("round2");

  // round-1 sessions back a "PMC session ID" pick for participants/non_participants,
  // and back "Round 1 session ID" for round-2 statuses.
  const round1Sessions = React.useMemo(
    () => pmcSessions.filter((session) => session.round === 1),
    [pmcSessions],
  );
  // round-2 sessions back "PMC session ID" for round-2 statuses.
  const round2Sessions = React.useMemo(
    () => pmcSessions.filter((session) => session.round === 2),
    [pmcSessions],
  );
  const sessionIdOptions = isRound2Status ? round2Sessions : round1Sessions;

  // Lazy-load PMC sessions the first time the PMC category is selected.
  React.useEffect(() => {
    if (!isPmcCategory || hasFetchedPmcSessions.current) {
      return;
    }
    hasFetchedPmcSessions.current = true;

    let isMounted = true;
    const fetchSessions = async () => {
      setPmcSessionsLoading(true);
      setPmcSessionsError("");
      try {
        const response = await getPmcActiveSessions();
        if (!isMounted) return;
        setPmcSessions(Array.isArray(response?.data) ? response.data : []);
        setPmcSessionsMeta(response?.meta ?? null);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load PMC sessions.";
        setPmcSessionsError(message);
        toast.error(message);
      } finally {
        if (isMounted) setPmcSessionsLoading(false);
      }
    };

    fetchSessions();
    return () => {
      isMounted = false;
    };
  }, [isPmcCategory, pmcSessionsFetchKey]);

  const retryPmcSessions = () => {
    hasFetchedPmcSessions.current = false;
    setPmcSessionsFetchKey((key) => key + 1);
  };

  // Lazy-load grades the first time the "grade_names" category is selected.
  React.useEffect(() => {
    if (formField.category !== "grade_names" || hasFetchedGrades.current) {
      return;
    }
    hasFetchedGrades.current = true;

    let isMounted = true;
    const fetchGrades = async () => {
      setGradesLoading(true);
      setGradesError("");
      try {
        const response = await getPushNotificationGrades();
        if (!isMounted) return;
        setGrades(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load grades.";
        setGradesError(message);
        toast.error(message);
      } finally {
        if (isMounted) setGradesLoading(false);
      }
    };

    fetchGrades();
    return () => {
      isMounted = false;
    };
  }, [formField.category, gradesFetchKey]);

  const retryGrades = () => {
    hasFetchedGrades.current = false;
    setGradesFetchKey((key) => key + 1);
  };

  // Auto-preview the matched audience whenever the active category's
  // selection changes - replaces the old manual "Preview audience" button.
  React.useEffect(() => {
    if (!isAudienceMode) {
      setAudiencePreview(null);
      return;
    }

    if (!hasActiveSelection(formField)) {
      setAudiencePreview(null);
      return;
    }

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    const requestId = ++previewRequestIdRef.current;

    previewTimeoutRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const response = await sendPushToAudience({
          title: safeTrimString(formField.title) || "Preview",
          body: safeTrimString(formField.body) || "Preview",
          filters: buildAudienceFilters(formField),
          dryRun: true,
        });
        if (previewRequestIdRef.current !== requestId) return;
        setAudiencePreview(response?.data ?? null);
      } catch (err) {
        if (previewRequestIdRef.current !== requestId) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to preview audience.";
        toast.error(message);
        setAudiencePreview(null);
      } finally {
        if (previewRequestIdRef.current === requestId) {
          setPreviewLoading(false);
        }
      }
    }, 500);

    return () => clearTimeout(previewTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAudienceMode,
    formField.category,
    formField.audienceRoles,
    formField.gradeNames,
    formField.pmcStatus,
    formField.pmcSessionId,
    formField.pmcRound1SessionId,
  ]);

  const handleSendModeChange = (value) => {
    if (value === formField.sendMode) {
      return;
    }

    setFormField((prev) => ({
      ...prev,
      sendMode: value,
      category: "roles",
      audienceRoles: [],
      gradeNames: [],
      pmcStatus: "",
      pmcSessionId: "",
      pmcRound1SessionId: "",
    }));
    setAudiencePreview(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "category") {
      setFormField((prev) => ({
        ...prev,
        category: value,
        audienceRoles: [],
        gradeNames: [],
        pmcStatus: "",
        pmcSessionId: "",
        pmcRound1SessionId: "",
      }));
      setAudiencePreview(null);
      return;
    }

    if (name === "pmcStatus") {
      setFormField((prev) => ({
        ...prev,
        pmcStatus: value,
        pmcSessionId: "",
        pmcRound1SessionId: "",
      }));
      return;
    }

    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedTitle = safeTrimString(formField.title);
    const trimmedBody = safeTrimString(formField.body);
    const trimmedTarget = safeTrimString(formField.target);

    if (!trimmedTitle || !trimmedBody) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    if (formField.sendMode === "topic" && !trimmedTarget) {
      const message = "Audience is required.";
      toast.error(message);
      setError(message);
      return;
    }

    if (isAudienceMode) {
      if (
        formField.category === "roles" &&
        formField.audienceRoles.length === 0
      ) {
        const message = "Select at least one role for the audience.";
        toast.error(message);
        setError(message);
        return;
      }

      if (
        formField.category === "grade_names" &&
        formField.gradeNames.length === 0
      ) {
        const message = "Select at least one grade for the audience.";
        toast.error(message);
        setError(message);
        return;
      }

      if (formField.category === "pmc" && !formField.pmcStatus) {
        const message = "Select a PMC status for the audience.";
        toast.error(message);
        setError(message);
        return;
      }
    }

    try {
      setLoading(true);

      if (isAudienceMode) {
        await sendPushToAudience({
          title: trimmedTitle,
          body: trimmedBody,
          filters: buildAudienceFilters(formField),
        });
      } else {
        await sendPushToTopicOrToken({
          mode: "topic",
          target: trimmedTarget,
          title: trimmedTitle,
          body: trimmedBody,
        });
      }

      toast.success("Push notification sent successfully.");
      setFormField({ ...DEFAULT_FORM });
      setAudiencePreview(null);
      navigate("/admin/app-notifications");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send push notification. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Send Push Notification</h1>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert
              variant="destructive"
              className="alert-custom mb-4 bg-[#FDF7EC]"
            >
              <AlertCircleIcon size={18} />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <div className="form-admin">
            <div className="form-group w-full">
              <label className="mb-2">
                <Bell size={16} /> Send to <span>*</span>
              </label>
              <div className="flex gap-2">
                {SEND_MODE_OPTIONS.map((option) => {
                  const isActive = formField.sendMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSendModeChange(option.value)}
                      disabled={loading}
                      className={`flex-1 cursor-pointer rounded-[5px] border-1 px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-[#AD474B] bg-[#AD474B] text-white"
                          : "border-[#c7c7c7] bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isAudienceMode && (
              <>
                <div className="form-group w-half">
                  <label>
                    <Filter size={16} /> Filter by <span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="category"
                    value={formField.category}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formField.category === "roles" && (
                  <div className="form-group w-half">
                    <label>
                      <Bell size={16} /> Roles <span>*</span>
                    </label>
                    <SearchableMultiSelect
                      options={ROLE_OPTIONS}
                      selectedValues={formField.audienceRoles}
                      onChange={(values) =>
                        setFormField((prev) => ({
                          ...prev,
                          audienceRoles: values,
                        }))
                      }
                      placeholder="Search roles..."
                      disabled={loading}
                    />
                  </div>
                )}

                {formField.category === "grade_names" && (
                  <div className="form-group w-half">
                    <label>
                      <TextInitial size={16} /> Grades <span>*</span>
                    </label>
                    <SearchableMultiSelect
                      options={grades}
                      selectedValues={formField.gradeNames}
                      onChange={(values) =>
                        setFormField((prev) => ({
                          ...prev,
                          gradeNames: values,
                        }))
                      }
                      valueKey="name"
                      labelKey="name"
                      placeholder="Search grades..."
                      loading={gradesLoading}
                      disabled={loading}
                      emptyState={gradesError || "No grades found"}
                    />
                    {gradesError && (
                      <p className="text-xs text-rose-600 mt-1">
                        {gradesError}{" "}
                        <button
                          type="button"
                          className="underline"
                          onClick={retryGrades}
                        >
                          Retry
                        </button>
                      </p>
                    )}
                  </div>
                )}

                {formField.category === "pmc" && (
                  <>
                    <div className="form-group w-half">
                      <label>
                        <Tag size={16} /> PMC status <span>*</span>
                      </label>
                      <select
                        className="form-input"
                        name="pmcStatus"
                        value={formField.pmcStatus}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        {PMC_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formField.pmcStatus && (
                      <>
                        <div className="form-group w-half">
                          <label>
                            <Tag size={16} /> PMC session (optional)
                          </label>
                          <select
                            className="form-input"
                            name="pmcSessionId"
                            value={formField.pmcSessionId}
                            onChange={handleChange}
                            disabled={loading || pmcSessionsLoading}
                          >
                            <option value="">
                              {pmcSessionsLoading
                                ? "Loading sessions..."
                                : "Auto (use active session)"}
                            </option>
                            {sessionIdOptions.map((session) => (
                              <option key={session.id} value={session.id}>
                                {session.label}
                              </option>
                            ))}
                          </select>
                          {pmcSessionsMeta?.requires_explicit_selection && (
                            <p className="text-xs text-amber-600 mt-1">
                              Multiple active sessions found — please select one
                              explicitly.
                            </p>
                          )}
                          {pmcSessionsError && (
                            <p className="text-xs text-rose-600 mt-1">
                              {pmcSessionsError}{" "}
                              <button
                                type="button"
                                className="underline"
                                onClick={retryPmcSessions}
                              >
                                Retry
                              </button>
                            </p>
                          )}
                          {!pmcSessionsLoading &&
                            !pmcSessionsError &&
                            sessionIdOptions.length === 0 && (
                              <p className="text-xs text-slate-500 mt-1">
                                No active{" "}
                                {isRound2Status ? "round 2" : "round 1"} PMC
                                sessions found.
                              </p>
                            )}
                        </div>

                        {isRound2Status && (
                          <div className="form-group w-half">
                            <label>
                              <Tag size={16} /> Round 1 session (optional)
                            </label>
                            <select
                              className="form-input"
                              name="pmcRound1SessionId"
                              value={formField.pmcRound1SessionId}
                              onChange={handleChange}
                              disabled={loading || pmcSessionsLoading}
                            >
                              <option value="">
                                {pmcSessionsLoading
                                  ? "Loading sessions..."
                                  : "Not linked to a round 1 session"}
                              </option>
                              {round1Sessions.map((session) => (
                                <option key={session.id} value={session.id}>
                                  {session.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {previewLoading && (
                  <div className="form-group w-full">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking audience size...
                    </div>
                  </div>
                )}

                {!previewLoading && audiencePreview && (
                  <div className="form-group w-full">
                    <Alert className="alert-custom bg-blue-50 border-blue-200">
                      <Info size={18} />
                      <AlertTitle>
                        Matched {audiencePreview.matched_users ?? 0} users
                        &middot; {audiencePreview.with_fcm_token ?? 0} with a
                        saved device token
                        {typeof audiencePreview.without_fcm_token ===
                          "number" &&
                          ` \u00b7 ${audiencePreview.without_fcm_token} without one`}
                      </AlertTitle>
                    </Alert>
                  </div>
                )}
              </>
            )}

            <div className="form-group w-full">
              <label>
                <TextInitial size={16} /> Title <span>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                name="title"
                value={formField.title}
                onChange={handleChange}
                disabled={loading}
                placeholder="New announcement"
              />
            </div>

            <div className="form-group w-full">
              <label>
                <Text size={16} /> Body <span>*</span>
              </label>
              <textarea
                className="form-input"
                name="body"
                rows={5}
                value={formField.body}
                onChange={handleChange}
                disabled={loading}
                placeholder="A new update is available."
              />
            </div>
          </div>

          <div className="form-button-row">
            <button
              type="button"
              className="global-btn secondary flex items-center justify-center gap-1"
              onClick={() => navigate("/admin/app-notifications")}
            >
              <>
                <X size={18} />
                Cancel
              </>
            </button>
            <button
              type="submit"
              className="global-btn flex items-center justify-center gap-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  Please wait
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Send Notification
                  <Send size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AppNotifications;
