import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Calendar1,
  Clock3,
  IdCardLanyard,
  LaptopMinimalCheck,
  Loader2,
  Plus,
  Save,
  Text,
  X,
} from "lucide-react";
import {
  addPmcSession,
  getAllPaginatedPmcSessions,
  getPmcSessionById,
  updatePmcSessionById,
} from "@/api/pmcRmcSessionsApi";

const DEFAULT_FORM = {
  type: "",
  round: "",
  linked_round_1_session_id: "",
  title: "",
  contest_date: "",
  registration_closing_date: "",
  is_active: "",
  time_slots: [{ id: null, start_time: "", end_time: "" }],
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
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
  const match = normalized.match(/^(\d{2}:\d{2})/);
  if (match?.[1]) {
    return match[1];
  }
  return "";
};

const mapTimeSlotsToForm = (session = {}) => {
  const incomingSlots = Array.isArray(session?.time_slots)
    ? session.time_slots
    : [];

  const mappedSlots = incomingSlots
    .map((slot) => ({
      id: slot?.id ?? slot?._id ?? null,
      start_time: normalizeTimeForInput(
        slot?.start_time ?? slot?.start ?? slot?.startTime,
      ),
      end_time: normalizeTimeForInput(
        slot?.end_time ?? slot?.end ?? slot?.endTime,
      ),
    }))
    .filter((slot) => slot.start_time || slot.end_time || slot.id);

  if (mappedSlots.length > 0) {
    return mappedSlots;
  }

  const fallbackStart = normalizeTimeForInput(
    session?.start_time ?? session?.start ?? session?.startTime,
  );
  const fallbackEnd = normalizeTimeForInput(
    session?.end_time ?? session?.end ?? session?.endTime,
  );
  if (fallbackStart || fallbackEnd) {
    return [{ id: null, start_time: fallbackStart, end_time: fallbackEnd }];
  }

  return [{ id: null, start_time: "", end_time: "" }];
};

const resolveCollection = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) return data;

  const candidates = [data?.data, data?.items, data?.results, data?.sessions];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (data && typeof data === "object") {
    const firstArray = Object.values(data).find((value) =>
      Array.isArray(value),
    );
    if (Array.isArray(firstArray)) return firstArray;
  }

  return [];
};

const normalizePmcSessionOption = (session) => {
  if (!session) return null;

  const id = safeTrimString(
    session?.id ?? session?._id ?? session?.session_id ?? session?.value,
  );
  const name = safeTrimString(
    session?.title ?? session?.label ?? session?.name ?? session?.session_title,
  );

  if (!id || !name) return null;

  return {
    id,
    name,
    round: safeTrimString(session?.round),
    type: safeTrimString(session?.type),
  };
};

const dedupePmcSessionOptions = (options = []) => {
  const seen = new Set();

  return options.filter((option) => {
    const id = safeTrimString(option?.id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const mapLinkedRoundOneOption = (session = {}) => {
  const linkedSession =
    session?.linked_round_1_session ??
    session?.linkedRoundOneSession ??
    session?.round_1_session;

  if (linkedSession) {
    return normalizePmcSessionOption(linkedSession);
  }

  const id = safeTrimString(
    session?.linked_round_1_session_id ??
      session?.linkedRoundOneSessionId ??
      session?.round_1_session_id,
  );
  if (!id) return null;

  const name = safeTrimString(
    session?.linked_round_1_session_title ??
      session?.linkedRoundOneSessionTitle ??
      session?.round_1_session_title,
  );

  return {
    id,
    name: name || `Session ${id}`,
    round: "1",
    type: safeTrimString(session?.type),
  };
};

const mapPmcSessionToForm = (session = {}) => ({
  type: safeTrimString(session.type),
  round: safeTrimString(session.round),
  linked_round_1_session_id: safeTrimString(
    session?.linked_round_1_session_id ??
      session?.linked_round_1_session?.id ??
      session?.linked_round_1_session?._id ??
      session?.linkedRoundOneSessionId ??
      session?.round_1_session_id,
  ),
  title: safeTrimString(session.title),
  contest_date: normalizeDateForInput(session.contest_date),
  registration_closing_date: normalizeDateForInput(
    session.registration_closing_date,
  ),
  is_active:
    session.is_active === true || session.is_active === false
      ? String(session.is_active)
      : safeTrimString(session.is_active),
  time_slots: mapTimeSlotsToForm(session),
});

const PmcSessionForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStatePmcSession = state?.pmcSession;
  const pmcSessionId =
    paramsId ||
    state?.pmcSessionId ||
    fallbackStatePmcSession?._id ||
    fallbackStatePmcSession?.id;
  const isEditMode = Boolean(pmcSessionId);

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    ...mapPmcSessionToForm(fallbackStatePmcSession || {}),
  }));
  const [linkedRoundOneOptions, setLinkedRoundOneOptions] = React.useState(
    () => {
      const selectedOption = mapLinkedRoundOneOption(
        fallbackStatePmcSession || {},
      );
      return selectedOption ? [selectedOption] : [];
    },
  );
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [linkedRoundOneLoading, setLinkedRoundOneLoading] =
    React.useState(false);
  const [error, setError] = React.useState("");
  const linkedRoundOneSelectionRef = React.useRef("");

  React.useEffect(() => {
    if (!isEditMode || !pmcSessionId) return;

    const fetchSession = async () => {
      try {
        setFetching(true);
        const result = await getPmcSessionById(pmcSessionId);
        const data = result?.data ?? result ?? {};
        setFormField((prev) => ({
          ...prev,
          ...mapPmcSessionToForm(data),
        }));
        const linkedOption = mapLinkedRoundOneOption(data);
        if (linkedOption) {
          setLinkedRoundOneOptions((prev) =>
            dedupePmcSessionOptions([linkedOption, ...prev]),
          );
        }
      } catch (err) {
        const message =
          err?.message ||
          "Unable to load PMC session details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchSession();
  }, [isEditMode, pmcSessionId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => {
      if (name === "round") {
        return {
          ...prev,
          round: value,
          linked_round_1_session_id:
            value === "2" ? prev.linked_round_1_session_id : "",
        };
      }

      if (name === "type") {
        const nextType = safeTrimString(value);
        const previousType = safeTrimString(prev.type);

        return {
          ...prev,
          type: value,
          linked_round_1_session_id:
            prev.round === "2" && previousType !== nextType
              ? ""
              : prev.linked_round_1_session_id,
        };
      }

      return { ...prev, [name]: value };
    });
  };

  React.useEffect(() => {
    linkedRoundOneSelectionRef.current = safeTrimString(
      formField.linked_round_1_session_id,
    );
  }, [formField.linked_round_1_session_id]);

  React.useEffect(() => {
    const selectedRound = safeTrimString(formField.round);
    const selectedType = safeTrimString(formField.type);
    const selectedLinkedRoundOneSessionId = linkedRoundOneSelectionRef.current;
    const currentSessionId = safeTrimString(pmcSessionId);

    if (selectedRound !== "2") {
      setLinkedRoundOneOptions([]);
      setLinkedRoundOneLoading(false);
      return;
    }

    if (!selectedType) {
      setLinkedRoundOneOptions((prev) => {
        const preserved = selectedLinkedRoundOneSessionId
          ? prev.filter(
              (option) => option.id === selectedLinkedRoundOneSessionId,
            )
          : [];
        return dedupePmcSessionOptions(preserved);
      });
      setLinkedRoundOneLoading(false);
      return;
    }

    let active = true;

    const filterRoundOneOptions = (payload) =>
      dedupePmcSessionOptions(
        resolveCollection(payload)
          .map(normalizePmcSessionOption)
          .filter(Boolean)
          .filter(
            (option) =>
              option.id !== currentSessionId &&
              option.round === "1" &&
              (!selectedType || option.type === selectedType),
          ),
      );

    const fetchRoundOneSessions = async () => {
      try {
        setLinkedRoundOneLoading(true);

        const requestedResponse = await getAllPaginatedPmcSessions({
          page: 1,
          per_page: 800,
          round: 2,
          type: selectedType,
          is_active: true,
        });
        if (!active) return;

        let options = filterRoundOneOptions(requestedResponse);

        if (options.length === 0) {
          const fallbackResponse = await getAllPaginatedPmcSessions({
            page: 1,
            per_page: 800,
            round: 1,
            type: selectedType,
            is_active: true,
          });
          if (!active) return;
          options = filterRoundOneOptions(fallbackResponse);
        }

        setLinkedRoundOneOptions((prev) => {
          const preserved = selectedLinkedRoundOneSessionId
            ? prev.filter(
                (option) => option.id === selectedLinkedRoundOneSessionId,
              )
            : [];
          return dedupePmcSessionOptions([...options, ...preserved]);
        });
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load round 1 PMC sessions.");
      } finally {
        if (active) {
          setLinkedRoundOneLoading(false);
        }
      }
    };

    fetchRoundOneSessions();

    return () => {
      active = false;
    };
  }, [formField.round, formField.type, pmcSessionId]);

  const handleTimeSlotChange = (index, key, value) => {
    setFormField((prev) => {
      const slots = Array.isArray(prev.time_slots)
        ? [...prev.time_slots]
        : [{ id: null, start_time: "", end_time: "" }];
      const current = slots[index] ?? {
        id: null,
        start_time: "",
        end_time: "",
      };
      slots[index] = { ...current, [key]: value };
      return { ...prev, time_slots: slots };
    });
  };

  const handleAddTimeSlot = () => {
    setFormField((prev) => ({
      ...prev,
      time_slots: [
        ...(Array.isArray(prev.time_slots)
          ? prev.time_slots
          : [{ id: null, start_time: "", end_time: "" }]),
        { id: null, start_time: "", end_time: "" },
      ],
    }));
  };

  const handleRemoveTimeSlot = (index) => {
    setFormField((prev) => {
      const currentSlots = Array.isArray(prev.time_slots)
        ? prev.time_slots
        : [{ id: null, start_time: "", end_time: "" }];
      if (currentSlots.length <= 1) {
        return {
          ...prev,
          time_slots: [{ id: null, start_time: "", end_time: "" }],
        };
      }
      return {
        ...prev,
        time_slots: currentSlots.filter((_, slotIndex) => slotIndex !== index),
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedType = safeTrimString(formField.type);
    const trimmedRound = safeTrimString(formField.round);
    const trimmedLinkedRoundOneSessionId = safeTrimString(
      formField.linked_round_1_session_id,
    );
    const trimmedTitle = safeTrimString(formField.title);
    const trimmedContestDate = normalizeDateForInput(formField.contest_date);
    const trimmedRegistrationClosingDate = normalizeDateForInput(
      formField.registration_closing_date,
    );
    const isActiveRaw = safeTrimString(formField.is_active);
    const isActiveValue = isActiveRaw === "true";
    const normalizedTimeSlots = (
      Array.isArray(formField.time_slots) ? formField.time_slots : []
    ).map((slot) => ({
      id: slot?.id ?? null,
      start_time: normalizeTimeForInput(slot?.start_time),
      end_time: normalizeTimeForInput(slot?.end_time),
    }));

    if (
      !trimmedType ||
      !trimmedRound ||
      !trimmedTitle ||
      !trimmedContestDate ||
      !trimmedRegistrationClosingDate ||
      !isActiveRaw
    ) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    if (trimmedRound === "2" && !trimmedLinkedRoundOneSessionId) {
      const message =
        "Please link this round 2 session with a round 1 session.";
      toast.error(message);
      setError(message);
      return;
    }

    if (normalizedTimeSlots.length === 0) {
      const message = "Please add at least one time slot.";
      toast.error(message);
      setError(message);
      return;
    }

    const incompleteSlotIndex = normalizedTimeSlots.findIndex(
      (slot) => !slot.start_time || !slot.end_time,
    );
    if (incompleteSlotIndex !== -1) {
      const message = `Time slot #${
        incompleteSlotIndex + 1
      } must have both start and end time.`;
      toast.error(message);
      setError(message);
      return;
    }

    const invalidRangeIndex = normalizedTimeSlots.findIndex(
      (slot) => slot.start_time >= slot.end_time,
    );
    if (invalidRangeIndex !== -1) {
      const message = `Time slot #${
        invalidRangeIndex + 1
      } must have end time later than start time.`;
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      type: trimmedType,
      round: Number(trimmedRound),
      title: trimmedTitle,
      contest_date: trimmedContestDate,
      registration_closing_date: trimmedRegistrationClosingDate,
      is_active: isActiveValue,
      time_slots: normalizedTimeSlots.map((slot) => {
        if (slot.id) {
          return {
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
          };
        }
        return {
          start_time: slot.start_time,
          end_time: slot.end_time,
        };
      }),
    };

    if (trimmedRound === "2") {
      payload.linked_round_1_session_id = trimmedLinkedRoundOneSessionId;
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updatePmcSessionById(pmcSessionId, payload);
        toast.success("PMC session updated successfully.");
      } else {
        await addPmcSession(payload);
        toast.success("PMC session added successfully.");
      }
      navigate("/admin/pmc-sessions-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${
          isEditMode ? "update" : "add"
        } pmc session. Please try again.`;
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
          <h1>{isEditMode ? "Update PMC Session" : "Add New PMC Session"}</h1>
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
                    <IdCardLanyard size={16} /> Type <span>*</span>
                  </label>
                  <select
                    name="type"
                    className="form-input"
                    value={formField.type}
                    onChange={handleChange}
                  >
                    <option value="">Select Type</option>
                    <option value="PMC-4">PMC-4</option>
                    <option value="PMC-5">PMC-5</option>
                    <option value="PMC-7">PMC-7</option>
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <IdCardLanyard size={16} /> Round <span>*</span>
                  </label>
                  <select
                    name="round"
                    className="form-input"
                    value={formField.round}
                    onChange={handleChange}
                  >
                    <option value="">Select Round</option>
                    <option value="1">Round 1</option>
                    <option value="2">Round 2</option>
                  </select>
                </div>

                {formField.round === "2" && (
                  <div className="form-group w-half">
                    <label>
                      <Text size={16} /> Link with round 1 <span>*</span>
                    </label>
                    <select
                      name="linked_round_1_session_id"
                      className="form-input"
                      value={formField.linked_round_1_session_id}
                      onChange={handleChange}
                      disabled={
                        loading ||
                        linkedRoundOneLoading ||
                        !safeTrimString(formField.type)
                      }
                    >
                      <option value="">
                        {linkedRoundOneLoading
                          ? "Loading round 1 sessions..."
                          : safeTrimString(formField.type)
                            ? "Select round 1 session"
                            : "Select type first"}
                      </option>
                      {!linkedRoundOneLoading &&
                        linkedRoundOneOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

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

                <div className="form-group w-full">
                  <div className="flex items-center justify-between">
                    <label>
                      <Clock3 size={16} /> Time Slots <span>*</span>
                    </label>
                    <button
                      type="button"
                      className="global-btn secondary flex items-center gap-1 !py-1.5 !px-3"
                      onClick={handleAddTimeSlot}
                      disabled={loading}
                    >
                      <Plus size={14} />
                      Add Slot
                    </button>
                  </div>

                  <div className="mt-2 space-y-3">
                    {(Array.isArray(formField.time_slots)
                      ? formField.time_slots
                      : []
                    ).map((slot, index) => (
                      <div
                        key={slot?.id ?? `slot-${index}`}
                        className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                      >
                        <input
                          type="time"
                          className="form-input"
                          value={slot?.start_time ?? ""}
                          onChange={(event) =>
                            handleTimeSlotChange(
                              index,
                              "start_time",
                              event.target.value,
                            )
                          }
                          disabled={loading}
                        />
                        <input
                          type="time"
                          className="form-input"
                          value={slot?.end_time ?? ""}
                          onChange={(event) =>
                            handleTimeSlotChange(
                              index,
                              "end_time",
                              event.target.value,
                            )
                          }
                          disabled={loading}
                        />
                        <button
                          type="button"
                          className="global-btn secondary !py-1.5 !px-3 mt-2.5 mb-1"
                          onClick={() => handleRemoveTimeSlot(index)}
                          disabled={
                            loading ||
                            (Array.isArray(formField.time_slots)
                              ? formField.time_slots.length <= 1
                              : true)
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
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
                      Update PMC Session
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add PMC Session
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

export default PmcSessionForm;
