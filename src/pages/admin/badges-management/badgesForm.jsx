import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  AlignVerticalDistributeCenter,
  Backpack,
  Badge,
  Bolt,
  Calendar1,
  FileImage,
  ListCheck,
  ListTree,
  Loader2,
  Palette,
  Plus,
  Repeat2,
  Save,
  SortAsc,
  Text,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { addBadge, getBadgeById, updateBadgeById } from "@/api/badgesApi";

const BACKEND_FILE_BASE_PATH =
  import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? "";

const TYPE_OPTIONS = [
  { value: "level", label: "Level" },
  { value: "skills", label: "Skills" },
  { value: "mastery", label: "Mastery" },
  { value: "course_completion", label: "Course Completion" },
  { value: "course_mastery", label: "Course Mastery" },
  { value: "practice", label: "Practice" },
  { value: "class_topper", label: "Class Topper" },
];

const SCOPE_OPTIONS = [
  { value: "course", label: "Course" },
  { value: "global", label: "Global" },
  { value: "class", label: "Class" },
];

const METRIC_OPTIONS = [
  { value: "skills_percent", label: "Skills Percent" },
  { value: "proficient_skills_percent", label: "Proficient Skills Percent" },
  { value: "topic_mastery_percent", label: "Topic Mastery Percent" },
  { value: "course_completion_percent", label: "Course Completion Percent" },
  { value: "course_mastery_percent", label: "Course Mastery Percent" },
  { value: "practice_percent", label: "Practice Percent" },
  { value: "class_rank", label: "Class Rank" },
  { value: "class_rank_percentile", label: "Class Rank Percentile" },
];

const OPERATOR_OPTIONS = [
  { value: ">", label: "Greater Than" },
  { value: ">=", label: "Greater Than or Equal" },
  { value: "<", label: "Less Than" },
  { value: "<=", label: "Less Than or Equal" },
  { value: "=", label: "Equal To" },
  { value: "==", label: "Equal To (Double Equals)" },
  { value: "!=", label: "Not Equal To" },
];

const PERIOD_OPTIONS = [
  { value: "", label: "No Period (Null)" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "term", label: "Term" },
];

const COLOR_OPTIONS = [
  { value: "", label: "Select Color" },
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

const DEFAULT_FORM = {
  code: "",
  name: "",
  type: "",
  scope: "",
  metric: "",
  operator: "",
  threshold: "",
  is_repeatable: false,
  period: "",
  sort_order: 10,
  active: true,
  meta_color: "",
  meta_description: "",
  photo_icon: "",
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "active"].includes(normalized)) return true;
    if (["0", "false", "no", "inactive"].includes(normalized)) return false;
  }
  return fallback;
};

const normalizeNumberValue = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeBadge = (payload) => {
  if (!payload) {
    return { ...DEFAULT_FORM };
  }

  const data = payload?.data ?? payload;
  const meta = data?.meta ?? {};

  return {
    code: data?.code ?? "",
    name: data?.name ?? "",
    type: data?.type ?? "",
    scope: data?.scope ?? "",
    metric: data?.metric ?? "",
    operator: data?.operator ?? "",
    threshold: normalizeNumberValue(data?.threshold, ""),
    is_repeatable: toBoolean(data?.is_repeatable, false),
    period: data?.period ?? "",
    sort_order: normalizeNumberValue(data?.sort_order ?? data?.sort, 10),
    active: toBoolean(data?.active, true),
    meta_color: meta?.color ?? "",
    meta_description: meta?.description ?? "",
    photo_icon:
      data?.photo_icon ??
      data?.icon_path ??
      data?.icon ??
      data?.icon_url ??
      data?.image ??
      "",
  };
};

const resolvePreviewUrl = (value) => {
  if (!value) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (/^(blob:|data:|https?:\/\/|\/)/i.test(text)) {
    return text;
  }
  return `${BACKEND_FILE_BASE_PATH}${text}`;
};

const BadgesForm = () => {
  const { role: storeRole, user } = useAuthStore();
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();
  const roleCandidate = storeRole ?? user?.role;
  const resolvedRole =
    typeof roleCandidate === "string" ? roleCandidate.toLowerCase() : "admin";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";

  const fallbackStateBadge = state?.badge ?? state?.registration ?? null;
  const badgeId =
    paramsId ||
    state?.badgeId ||
    fallbackStateBadge?.id ||
    fallbackStateBadge?._id;
  const isEditMode = Boolean(badgeId);

  const [formField, setFormField] = React.useState(() =>
    normalizeBadge(fallbackStateBadge),
  );
  const [displayPicturePreview, setDisplayPicturePreview] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isEditMode || fallbackStateBadge) {
      return;
    }

    const fetchBadge = async () => {
      try {
        setFetching(true);
        const result = await getBadgeById(badgeId);
        const next = normalizeBadge(result);
        setFormField(next);
      } catch (err) {
        const message = err?.message || "Unable to load badge details.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchBadge();
  }, [badgeId, fallbackStateBadge, isEditMode]);

  React.useEffect(() => {
    const current = formField.photo_icon;
    let objectUrl;

    if (!current) {
      setDisplayPicturePreview("");
    } else if (current instanceof File) {
      objectUrl = URL.createObjectURL(current);
      setDisplayPicturePreview(objectUrl);
    } else {
      setDisplayPicturePreview(resolvePreviewUrl(current));
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [formField.photo_icon]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === "checkbox") {
      setFormField((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoIconChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    setFormField((prev) => ({ ...prev, photo_icon: file }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedCode = String(formField.code ?? "").trim();
    const trimmedName = String(formField.name ?? "").trim();
    const trimmedType = String(formField.type ?? "").trim();
    const trimmedScope = String(formField.scope ?? "").trim();
    const trimmedMetric = String(formField.metric ?? "").trim();
    const trimmedOperator = String(formField.operator ?? "").trim();
    const trimmedPeriod = String(formField.period ?? "").trim();
    const trimmedMetaColor = String(formField.meta_color ?? "").trim();
    const trimmedMetaDescription = String(
      formField.meta_description ?? "",
    ).trim();
    const thresholdNumber = Number(formField.threshold);
    const sortOrderNumber = Number(formField.sort_order);

    if (!trimmedCode) {
      const message = "Code is required.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!trimmedName) {
      const message = "Name is required.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!trimmedType) {
      const message = "Type is required.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!trimmedScope) {
      const message = "Scope is required.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!trimmedMetric) {
      const message = "Metric is required.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!trimmedOperator) {
      const message = "Operator is required.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!Number.isFinite(thresholdNumber)) {
      const message = "Threshold must be a valid number.";
      setError(message);
      toast.error(message);
      return;
    }
    if (!Number.isFinite(sortOrderNumber)) {
      const message = "Sort order must be a valid number.";
      setError(message);
      toast.error(message);
      return;
    }

    const payload = new FormData();
    payload.append("code", trimmedCode);
    payload.append("name", trimmedName);
    payload.append("type", trimmedType);
    payload.append("scope", trimmedScope);
    payload.append("metric", trimmedMetric);
    payload.append("operator", trimmedOperator);
    payload.append("threshold", String(thresholdNumber));
    payload.append("is_repeatable", formField.is_repeatable ? "1" : "0");
    payload.append("period", trimmedPeriod);
    payload.append("sort_order", String(sortOrderNumber));
    payload.append("active", formField.active ? "1" : "0");
    payload.append("meta[color]", trimmedMetaColor);
    payload.append("meta[description]", trimmedMetaDescription);

    if (formField.photo_icon instanceof File) {
      payload.append("photo_icon", formField.photo_icon);
      // Keep backward compatibility if backend is still reading this key.
      payload.append("icon_path", formField.photo_icon);
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateBadgeById(badgeId, payload);
        toast.success("Badge updated successfully.");
      } else {
        await addBadge(payload);
        toast.success("Badge created successfully.");
      }
      navigate(`${basePath}/badges-lists`);
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} badge. Please try again.`;
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
          <h1>{isEditMode ? "Update Badge" : "Add Badge"}</h1>
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
                    <Text size={16} /> Code<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="code"
                    placeholder="e.g. LEVEL_01"
                    value={formField.code}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Badge size={16} /> Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    placeholder="e.g. First Step"
                    value={formField.name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <ListCheck size={16} /> Type<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="type"
                    value={formField.type}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select type</option>
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Bolt size={16} /> Scope<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="scope"
                    value={formField.scope}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select scope</option>
                    {SCOPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Backpack size={16} /> Metric<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="metric"
                    value={formField.metric}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select metric</option>
                    {METRIC_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <ListTree size={16} /> Operator<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="operator"
                    value={formField.operator}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select operator</option>
                    {OPERATOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <AlignVerticalDistributeCenter size={16} /> Threshold
                    <span>*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input no-spinner"
                    name="threshold"
                    placeholder="Enter threshold value"
                    value={formField.threshold}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Calendar1 size={16} /> Period
                  </label>
                  <select
                    className="form-input"
                    name="period"
                    value={formField.period}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value || "null"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <SortAsc size={16} /> Sort Order<span>*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input no-spinner"
                    name="sort_order"
                    placeholder="Enter sort order"
                    value={formField.sort_order}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Palette size={16} /> Meta Color
                  </label>
                  <select
                    className="form-input"
                    name="meta_color"
                    value={formField.meta_color}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {COLOR_OPTIONS.map((option) => (
                      <option key={option.value || "none"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group w-full">
                  <label>
                    <Text size={16} /> Meta Description
                  </label>
                  <textarea
                    className="form-input"
                    name="meta_description"
                    rows={3}
                    placeholder="e.g. Awarded at 5% skills completion"
                    value={formField.meta_description}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-full">
                  <label>
                    <FileImage size={16} />
                    Photo Icon
                  </label>
                  <input
                    type="file"
                    className="form-input"
                    name="photo_icon"
                    accept="image/*"
                    onChange={handlePhotoIconChange}
                    disabled={loading}
                  />
                </div>

                {displayPicturePreview ? (
                  <div className="show-img mb-4">
                    <img
                      src={displayPicturePreview}
                      alt="Badge icon preview"
                      className="h-24 w-24 rounded-md object-cover"
                    />
                  </div>
                ) : null}

                <div className="form-group w-half">
                  <label>
                    <Repeat2 size={16} /> Is Repeatable
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="is_repeatable"
                    type="checkbox"
                    checked={Boolean(formField.is_repeatable)}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Repeat2 size={16} /> Active
                  </label>
                  <input
                    className="form-input no-spinner"
                    name="active"
                    type="checkbox"
                    checked={Boolean(formField.active)}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-button-row">
                <button
                  type="button"
                  className="global-btn secondary flex items-center justify-center gap-1"
                  onClick={() => navigate(-1)}
                >
                  <X size={18} />
                  Cancel
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
                      Update Badge
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Badge
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

export default BadgesForm;
