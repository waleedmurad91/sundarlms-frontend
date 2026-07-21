import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import {
  AlertCircleIcon,
  Book,
  Calendar1,
  LaptopMinimalCheck,
  Loader2,
  Plus,
  Save,
  Text,
  X,
} from "lucide-react";
import {
  addRmcSession,
  getRmcSessionById,
  updateRmcSessionById,
} from "@/api/pmcRmcSessionsApi";
import { getRMCSessionGrades } from "@/api/authApi";

const DEFAULT_FORM = {
  title: "",
  contest_date: "",
  contest_time: "",
  registration_closing_date: "",
  is_active: "",
  grade_ids: [],
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

const normalizeGradeId = (value) => {
  const raw = safeTrimString(value);
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return raw;
  const match = raw.match(/\d+/);
  return match ? match[0] : "";
};

const normalizeGradeOption = (grade) => {
  if (!grade) return null;
  if (typeof grade === "string" || typeof grade === "number") {
    const normalizedId = normalizeGradeId(grade);
    if (!normalizedId) return null;
    return {
      value: normalizedId,
      label: `Grade ${normalizedId}`,
    };
  }

  const normalizedId = normalizeGradeId(
    grade?.id ??
      grade?._id ??
      grade?.grade_id ??
      grade?.gradeId ??
      grade?.value,
  );
  if (!normalizedId) return null;

  const resolvedName = safeTrimString(
    grade?.name ?? grade?.label ?? grade?.title,
  );

  return {
    value: normalizedId,
    label: resolvedName ? `Grade ${resolvedName}` : `Grade ${normalizedId}`,
  };
};

const dedupeGradeOptions = (options = []) => {
  const seen = new Set();
  return options.filter((option) => {
    const value = safeTrimString(option?.value);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

const mapRmcSessionGradesToIds = (session = {}) => {
  const ids = [];

  if (Array.isArray(session?.grades)) {
    session.grades.forEach((grade) => {
      const option = normalizeGradeOption(grade);
      if (option?.value) ids.push(option.value);
    });
  }

  if (Array.isArray(session?.grade_ids)) {
    session.grade_ids.forEach((gradeId) => {
      const normalized = normalizeGradeId(gradeId);
      if (normalized) ids.push(normalized);
    });
  }

  const singleGrade = normalizeGradeId(session?.grade_id ?? session?.gradeId);
  if (singleGrade) {
    ids.push(singleGrade);
  }

  return Array.from(new Set(ids));
};

const mapRmcSessionGradesToOptions = (session = {}) => {
  const gradeOptions = Array.isArray(session?.grades)
    ? session.grades.map(normalizeGradeOption).filter(Boolean)
    : [];

  return dedupeGradeOptions(gradeOptions);
};

const resolveGradesCollection = (payload) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.grades)) return data.grades;
  return [];
};

const normalizeDateForInput = (value) => {
  if (!value) return "";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toISOString().slice(0, 10);
  }

  const normalized = safeTrimString(value);
  if (!normalized) return "";

  const directDatePart = normalized.match(/^\d{4}-\d{2}-\d{2}/);
  if (directDatePart?.[0]) {
    return directDatePart[0];
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().slice(0, 10);
};

const normalizeTimeForInput = (value) => {
  if (!value) return "";

  const normalized = safeTrimString(value);
  if (!normalized) return "";

  const directMatch = normalized.match(/\b(\d{2}:\d{2})(?::\d{2})?\b/);
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";

  return `${String(parsed.getHours()).padStart(2, "0")}:${String(
    parsed.getMinutes(),
  ).padStart(2, "0")}`;
};

const mapRmcSessionToForm = (session = {}) => ({
  type: safeTrimString(session.type),
  title: safeTrimString(session.title),
  contest_date: normalizeDateForInput(session.contest_date),
  contest_time: normalizeTimeForInput(session.contest_time),
  registration_closing_date: normalizeDateForInput(
    session.registration_closing_date,
  ),
  is_active:
    session.is_active === true || session.is_active === false
      ? String(session.is_active)
      : safeTrimString(session.is_active),
  grade_ids: mapRmcSessionGradesToIds(session),
});

// Main Component
const RmcSessionForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateRmcSession = state?.rmcSession;
  const rmcSessionId =
    paramsId ||
    state?.rmcSessionId ||
    fallbackStateRmcSession?._id ||
    fallbackStateRmcSession?.id;
  const isEditMode = Boolean(rmcSessionId);

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    ...mapRmcSessionToForm(fallbackStateRmcSession || {}),
  }));
  const [gradeOptions, setGradeOptions] = React.useState(() =>
    mapRmcSessionGradesToOptions(fallbackStateRmcSession || {}),
  );
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;

    const fetchGradeOptions = async () => {
      try {
        const response = await getRMCSessionGrades();
        if (!isMounted) return;
        const gradeOptionsFromApi = resolveGradesCollection(response)
          .map(normalizeGradeOption)
          .filter(Boolean);
        setGradeOptions((prev) =>
          dedupeGradeOptions([...gradeOptionsFromApi, ...prev]),
        );
      } catch (err) {
        if (!isMounted) return;
        toast.error(err?.message || "Unable to load grade options.");
      }
    };

    fetchGradeOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch session data when editing
  React.useEffect(() => {
    if (!isEditMode || !rmcSessionId) return;

    const fetchSession = async () => {
      try {
        setFetching(true);
        const result = await getRmcSessionById(rmcSessionId);
        const data = result?.data ?? result ?? {};
        setFormField((prev) => ({
          ...prev,
          ...mapRmcSessionToForm(data),
        }));
        setGradeOptions((prev) =>
          dedupeGradeOptions([...prev, ...mapRmcSessionGradesToOptions(data)]),
        );
      } catch (err) {
        const message =
          err?.message ||
          "Unable to load RMC session details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchSession();
  }, [isEditMode, rmcSessionId]);

  // Handle input change
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleGradesChange = (nextValues) => {
    const resolvedValues = Array.isArray(nextValues) ? nextValues : [];
    setFormField((prev) => ({
      ...prev,
      grade_ids: resolvedValues
        .map((gradeId) => normalizeGradeId(gradeId))
        .filter(Boolean),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedTitle = safeTrimString(formField.title);
    const trimmedContestDate = normalizeDateForInput(formField.contest_date);
    const trimmedContestTime = normalizeTimeForInput(formField.contest_time);
    const trimmedRegistrationClosingDate = normalizeDateForInput(
      formField.registration_closing_date,
    );
    const isActiveRaw = safeTrimString(formField.is_active);
    const isActiveValue = isActiveRaw === "true";
    const selectedGradeIds = (
      Array.isArray(formField.grade_ids) ? formField.grade_ids : []
    )
      .map((gradeId) => normalizeGradeId(gradeId))
      .filter(Boolean);
    const numericGradeIds = selectedGradeIds
      .map((gradeId) => Number(gradeId))
      .filter((gradeId) => Number.isFinite(gradeId));
    const gradeIdsPayload =
      numericGradeIds.length === selectedGradeIds.length
        ? numericGradeIds
        : selectedGradeIds;

    if (
      !trimmedTitle ||
      !trimmedContestDate ||
      !trimmedRegistrationClosingDate ||
      !isActiveRaw ||
      selectedGradeIds.length === 0
    ) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      title: trimmedTitle,
      contest_date: trimmedContestDate,
      contest_time: trimmedContestTime || null,
      registration_closing_date: trimmedRegistrationClosingDate,
      is_active: isActiveValue,
      grade_ids: gradeIdsPayload,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateRmcSessionById(rmcSessionId, payload);
        toast.success("RMC session updated successfully.");
      } else {
        await addRmcSession(payload);
        toast.success("RMC session added successfully.");
      }
      navigate("/admin/rmc-sessions-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${
          isEditMode ? "update" : "add"
        } rmc session. Please try again.`;
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
          <h1>{isEditMode ? "Update RMC Session" : "Add New RMC Session"}</h1>
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

          {fetching ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          ) : (
            <>
              <div className="form-admin">
                <div className="form-group w-half">
                  <label>
                    <Book size={16} /> Grades <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={gradeOptions}
                    selectedValues={
                      Array.isArray(formField.grade_ids)
                        ? formField.grade_ids
                        : []
                    }
                    multiple={true}
                    onChange={handleGradesChange}
                    placeholder="Select one or more grades"
                    disabled={loading}
                    valueKey="value"
                    labelKey="label"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Text size={16} /> Title <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="title"
                    value={formField.title}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Calendar1 size={16} />
                    Contest Date <span>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    name="contest_date"
                    value={formField.contest_date}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Calendar1 size={16} />
                    Contest Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    name="contest_time"
                    value={formField.contest_time}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional. Leave blank if the session has no fixed time yet.
                  </p>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Calendar1 size={16} />
                    Registration Closing Date <span>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    name="registration_closing_date"
                    value={formField.registration_closing_date}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <LaptopMinimalCheck size={16} /> Is Active? <span>*</span>
                  </label>
                  <select
                    name="is_active"
                    className="form-input"
                    value={formField.is_active}
                    onChange={handleChange}
                  >
                    <option value="">Select Value</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div className="form-button-row">
                <button
                  type="button"
                  className="global-btn secondary flex items-center justify-center gap-1"
                  onClick={() => navigate(-1)}
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
                  ) : isEditMode ? (
                    <>
                      Update RMC Session
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add RMC Session
                      <Plus size={18} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
};

export default RmcSessionForm;
