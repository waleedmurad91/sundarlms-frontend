import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  CalendarDays,
  Clock,
  Link as LinkIcon,
  Loader2,
  Repeat,
  Save,
  Tag,
  Text,
  TextInitial,
  X,
} from "lucide-react";
import calendarEventsApi from "@/api/calendarEventsApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";

const formatCategoryLabel = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "-";
  return normalized
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const CATEGORY_OPTIONS = [
  { value: "", label: "No category" },
  ...[
    "event",
    "class",
    "practice",
    "holiday",
    "PMC",
    "RMC",
    "VSS",
    "ILM",
    "deadline",
    "announcement",
  ].map((cat) => ({ value: cat, label: formatCategoryLabel(cat) })),
];

// Full weekday names are shown on the frontend (label); the short value
// (sun, mon, ...) is what's sent to the API in recurrence_weekdays.
const WEEKDAY_OPTIONS = [
  { value: "sun", label: "Sunday" },
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
];

const RECURRENCE_UNIT_OPTIONS = [
  { value: "days", label: "Day(s)" },
  { value: "weeks", label: "Week(s)" },
  { value: "months", label: "Month(s)" },
  { value: "years", label: "Year(s)" },
];

const DEFAULT_FORM = {
  title: "",
  description: "",
  category: "",
  is_all_day: false,
  starts_at: "", // datetime-local value: YYYY-MM-DDTHH:mm (or YYYY-MM-DD when all-day)
  ends_at: "",
  recurrence_enabled: false,
  recurrence_interval: 1,
  recurrence_unit: "weeks",
  recurrence_weekdays: [],
  recurrence_ends: "never",
  recurrence_until: "",
  meeting_url: "",
  is_public: true,
  is_active: true,
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

// "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD HH:mm:00"
// "YYYY-MM-DD" (all-day) -> "YYYY-MM-DD 00:00:00" / "YYYY-MM-DD 23:59:00"
const toApiDateTime = (value, isAllDay, boundary) => {
  const trimmed = safeTrimString(value);
  if (!trimmed) return null;

  if (isAllDay) {
    const datePart = trimmed.split("T")[0];
    return `${datePart} ${boundary === "end" ? "23:59:00" : "00:00:00"}`;
  }

  const [datePart, timePart = "00:00"] = trimmed.split("T");
  return `${datePart} ${timePart}:00`;
};

// "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm" (or "YYYY-MM-DD" for all-day inputs)
const fromApiDateTime = (value, isAllDay) => {
  const trimmed = safeTrimString(value);
  if (!trimmed) return "";
  const [datePart, timePart = "00:00:00"] = trimmed.split(" ");
  if (isAllDay) return datePart;
  return `${datePart}T${timePart.slice(0, 5)}`;
};

const CalendarEventForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [formField, setFormField] = React.useState({ ...DEFAULT_FORM });
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(isEditMode);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isEditMode) return;

    let isMounted = true;
    const fetchEvent = async () => {
      setFetching(true);
      setError("");
      try {
        const response = await calendarEventsApi.getAdminEvent(id);
        const event = response?.data;
        if (!isMounted || !event) return;

        setFormField({
          title: event.title ?? "",
          description: event.description ?? "",
          category: event.category ?? "",
          is_all_day: Boolean(event.is_all_day),
          starts_at: fromApiDateTime(
            event.starts_at,
            Boolean(event.is_all_day),
          ),
          ends_at: fromApiDateTime(event.ends_at, Boolean(event.is_all_day)),
          recurrence_enabled: Boolean(event.recurrence_enabled),
          recurrence_interval: event.recurrence_interval ?? 1,
          recurrence_unit: event.recurrence_unit ?? "weeks",
          recurrence_weekdays: Array.isArray(event.recurrence_weekdays)
            ? event.recurrence_weekdays
            : [],
          recurrence_ends: event.recurrence_ends ?? "never",
          recurrence_until: event.recurrence_until ?? "",
          meeting_url: event.meeting_url ?? "",
          is_public: event.is_public ?? true,
          is_active: event.is_active ?? true,
        });
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load calendar event.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setFetching(false);
      }
    };

    fetchEvent();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    if (name === "is_all_day") {
      // Re-derive starts_at/ends_at values to match the new input type
      // (datetime-local <-> date) instead of leaving stale values behind.
      setFormField((prev) => ({
        ...prev,
        is_all_day: checked,
        starts_at: prev.starts_at ? prev.starts_at.split("T")[0] : "",
        ends_at: prev.ends_at ? prev.ends_at.split("T")[0] : "",
      }));
      return;
    }

    setFormField((prev) => ({ ...prev, [name]: nextValue }));
  };

  // recurrence_interval is a text input (not type="number") so we control
  // exactly what characters are allowed — digits only, nothing else.
  const handleRecurrenceIntervalChange = (event) => {
    const digitsOnly = event.target.value.replace(/[^0-9]/g, "");
    setFormField((prev) => ({ ...prev, recurrence_interval: digitsOnly }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedTitle = safeTrimString(formField.title);
    const trimmedStartsAt = safeTrimString(formField.starts_at);

    if (!trimmedTitle) {
      const message = "Title is required.";
      toast.error(message);
      setError(message);
      return;
    }

    if (!trimmedStartsAt) {
      const message = "Start date is required.";
      toast.error(message);
      setError(message);
      return;
    }

    if (
      formField.recurrence_enabled &&
      (!formField.recurrence_interval ||
        Number(formField.recurrence_interval) < 1)
    ) {
      const message = "Repeat every must be at least 1.";
      toast.error(message);
      setError(message);
      return;
    }

    const startsAtApi = toApiDateTime(
      formField.starts_at,
      formField.is_all_day,
      "start",
    );
    const endsAtApi = formField.ends_at
      ? toApiDateTime(formField.ends_at, formField.is_all_day, "end")
      : null;

    if (
      endsAtApi &&
      startsAtApi &&
      new Date(endsAtApi) < new Date(startsAtApi)
    ) {
      const message = "End date/time cannot be before the start date/time.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: safeTrimString(formField.description) || null,
      category: safeTrimString(formField.category) || null,
      starts_at: startsAtApi,
      ends_at: endsAtApi,
      is_all_day: formField.is_all_day,
      recurrence_enabled: formField.recurrence_enabled,
      recurrence_interval: formField.recurrence_enabled
        ? Number(formField.recurrence_interval)
        : null,
      recurrence_unit: formField.recurrence_enabled
        ? formField.recurrence_unit
        : null,
      recurrence_weekdays:
        formField.recurrence_enabled &&
        formField.recurrence_unit === "weeks" &&
        formField.recurrence_weekdays.length > 0
          ? formField.recurrence_weekdays
          : null,
      recurrence_ends: formField.recurrence_enabled
        ? formField.recurrence_ends
        : null,
      recurrence_until:
        formField.recurrence_enabled &&
        formField.recurrence_ends === "on" &&
        formField.recurrence_until
          ? formField.recurrence_until
          : null,
      meeting_url: safeTrimString(formField.meeting_url) || null,
      is_public: formField.is_public,
      is_active: formField.is_active,
    };

    try {
      setLoading(true);

      if (isEditMode) {
        await calendarEventsApi.updateEvent(id, payload);
        toast.success("Calendar event updated successfully.");
      } else {
        await calendarEventsApi.createEvent(payload);
        toast.success("Calendar event created successfully.");
        setFormField({ ...DEFAULT_FORM });
      }

      navigate("/admin/calendar");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save calendar event. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <>
        <div className="dashboard-header">
          <div className="dh-left">
            <h4>Admin Dashboard</h4>
            <h1>{isEditMode ? "Edit Calendar Event" : "Add Calendar Event"}</h1>
          </div>
        </div>
        <div className="dashboard-body dashboard-body-card">
          <div className="flex items-center justify-center gap-2 py-10">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading event, please wait...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{isEditMode ? "Edit Calendar Event" : "Add Calendar Event"}</h1>
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
                placeholder="Live Math Class"
                maxLength={255}
              />
            </div>

            <div className="form-group w-full">
              <label>
                <Text size={16} /> Description
              </label>
              <textarea
                className="form-input"
                name="description"
                rows={3}
                value={formField.description}
                onChange={handleChange}
                disabled={loading}
                placeholder="Chapter revision session."
              />
            </div>

            <div className="form-group w-full">
              <label>
                <Tag size={16} /> Category
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

            <div className="form-group w-full">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="is_all_day"
                  checked={formField.is_all_day}
                  onChange={handleChange}
                  disabled={loading}
                />
                All-day event
              </label>
            </div>

            <div className="form-group w-half">
              <label>
                <Clock size={16} /> Starts At <span>*</span>
              </label>
              <input
                type={formField.is_all_day ? "date" : "datetime-local"}
                className="form-input"
                name="starts_at"
                value={formField.starts_at}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group w-half">
              <label>
                <Clock size={16} /> Ends At
              </label>
              <input
                type={formField.is_all_day ? "date" : "datetime-local"}
                className="form-input"
                name="ends_at"
                value={formField.ends_at}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            {/* Recurrence */}
            <div className="form-group w-full">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="recurrence_enabled"
                  checked={formField.recurrence_enabled}
                  onChange={handleChange}
                  disabled={loading}
                />{" "}
                Repeat this event
              </label>
            </div>

            {formField.recurrence_enabled && (
              <>
                <div className="form-group w-half">
                  <label>
                    <Repeat size={16} /> Repeat every
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    className="form-input"
                    name="recurrence_interval"
                    value={formField.recurrence_interval}
                    onChange={handleRecurrenceIntervalChange}
                    disabled={loading}
                    placeholder="1"
                    maxLength={3}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Repeat size={16} /> Repeat unit
                  </label>
                  <select
                    className="form-input"
                    name="recurrence_unit"
                    value={formField.recurrence_unit}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {RECURRENCE_UNIT_OPTIONS.map((option) => {
                      const count = Number(formField.recurrence_interval) || 1;
                      const label =
                        count > 1
                          ? option.label
                          : option.label.replace("(s)", "");
                      return (
                        <option key={option.value} value={option.value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {formField.recurrence_unit === "weeks" && (
                  <div className="form-group w-full">
                    <label>
                      <CalendarDays size={16} /> Repeat on
                    </label>
                    <SearchableMultiSelect
                      options={WEEKDAY_OPTIONS}
                      selectedValues={formField.recurrence_weekdays}
                      onChange={(values) =>
                        setFormField((prev) => ({
                          ...prev,
                          recurrence_weekdays: values,
                        }))
                      }
                      placeholder="Search days..."
                      disabled={loading}
                      emptyState="No days found"
                    />
                  </div>
                )}

                <div className="form-group w-half">
                  <label>
                    <Clock size={16} /> Ends
                  </label>
                  <select
                    className="form-input"
                    name="recurrence_ends"
                    value={formField.recurrence_ends}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="never">Never</option>
                    <option value="on">On a date</option>
                  </select>
                </div>

                {formField.recurrence_ends === "on" && (
                  <div className="form-group w-half">
                    <label>
                      <CalendarDays size={16} /> Repeat until
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      name="recurrence_until"
                      value={formField.recurrence_until}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                )}
              </>
            )}

            <div className="form-group w-full">
              <label>
                <LinkIcon size={16} /> Meeting URL
              </label>
              <input
                type="url"
                className="form-input"
                name="meeting_url"
                value={formField.meeting_url}
                onChange={handleChange}
                disabled={loading}
                placeholder="https://meet.google.com/example"
                maxLength={2048}
              />
            </div>

            <div className="form-group w-half">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={formField.is_public}
                  onChange={handleChange}
                  disabled={loading}
                />
                Public
              </label>
            </div>

            <div className="form-group w-half">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formField.is_active}
                  onChange={handleChange}
                  disabled={loading}
                />
                Active
              </label>
            </div>
          </div>

          <div className="form-button-row">
            <button
              type="button"
              className="global-btn secondary flex items-center justify-center gap-1"
              onClick={() => navigate("/admin/calendar")}
              disabled={loading}
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
              ) : (
                <>
                  {isEditMode ? "Update Event" : "Create Event"}
                  <Save size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CalendarEventForm;
