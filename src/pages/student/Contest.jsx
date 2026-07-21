import React from "react";
import axiosInstance from "@/api/axiosInstance";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  getAllContest,
  getAllCurrentContestRegistrations,
  getAllPastContestRegistrations,
  updateRegistrationInfo,
} from "@/api/studentApi";
import {
  emitContestRegistrationStatusUpdated,
  isContestRegistrationRequired,
  writeContestRegistrationRequired,
} from "@/utils/studentContestAccess";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CITIES = ["Lahore", "Karachi", "Peshawar", "Multan", "Sahiwal"];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function CheckBadge() {
  return (
    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center bg-[#ad474b] rounded-full w-5 h-5">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path
          d="M2 5.5L4.5 8L9 3"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function FaceToFaceCardHeader() {
  return (
    <div className="text-white px-6 py-6 bg-gradient-to-br from-[#ad474b] to-[#8b2b2f]">
      <h1 className="text-white text-[22px] font-bold">
        Face-to-Face PMC Registration
      </h1>
      <p className="text-[15px] text-red-100 mt-1 opacity-90">
        Special Opportunity for Select Cities
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// ContestRegistration — Face-to-Face PMC widget
// ─────────────────────────────────────────────

function ContestRegistration({ pmcData, currentRegistrations, onRegistered }) {
  const existingReg = React.useMemo(
    () =>
      toItems(currentRegistrations).find(
        (r) =>
          String(r?.contest ?? "")
            .trim()
            .toUpperCase() === "PMC" && r?.face_to_face_city,
      ) ?? null,
    [currentRegistrations],
  );

  const isLocked = isTruthyLike(pmcData?.available_contests_locked);

  const flatSessions = React.useMemo(
    () =>
      toItems(pmcData?.sessions).flatMap((s) =>
        toItems(s?.session_dates).map((sd) => ({
          type: s.type,
          round: s.round,
          minimum_age: s.minimum_age,
          upper_age_limit: s.upper_age_limit,
          session_date: sd,
        })),
      ),
    [pmcData],
  );

  const defaultCity = existingReg?.face_to_face_city ?? null;
  const defaultSession = React.useMemo(() => {
    if (!existingReg) return null;
    const sid = String(
      existingReg?.pmc_session_id ?? existingReg?.session_id ?? "",
    );
    return (
      flatSessions.find(
        (fs) => String(fs.session_date?.pmc_session_id) === sid,
      ) ?? null
    );
  }, [existingReg, flatSessions]);

  const [isEditing, setIsEditing] = React.useState(!existingReg);
  const [selectedCity, setSelectedCity] = React.useState(
    existingReg ? defaultCity : null,
  );
  const [selectedSession, setSelectedSession] = React.useState(
    existingReg ? defaultSession : null,
  );
  const [confirmed, setConfirmed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (existingReg) {
      setIsEditing(false);
      setSelectedCity(defaultCity);
      setSelectedSession(defaultSession);
      setConfirmed(false);
    } else {
      setIsEditing(true);
    }
  }, [existingReg, defaultCity, defaultSession]);

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setSelectedSession(null);
    setConfirmed(false);
  };

  const handleSessionSelect = (type, session_date) => {
    setSelectedSession({ type, session_date });
    setConfirmed(false);
  };

  const handleSubmit = async () => {
    if (!selectedCity || !selectedSession || !confirmed) return;
    const payload = {
      pmc: {
        is_participating: 1,
        pmc_session_id: selectedSession.session_date.pmc_session_id,
        face_to_face_city: selectedCity,
      },
    };
    try {
      setSubmitting(true);
      setError(null);
      await axiosInstance.post(
        `/student/registration-module/update-registrations`,
        payload,
      );
      setConfirmed(false);
      setIsEditing(false);
      if (onRegistered) onRegistered();
    } catch (err) {
      setError("Submission failed. Please try again.");
      console.log(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = () => {
    setSelectedCity(defaultCity);
    setSelectedSession(defaultSession);
    setConfirmed(false);
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setSelectedCity(defaultCity);
    setSelectedSession(defaultSession);
    setConfirmed(false);
    setError(null);
    setIsEditing(false);
  };

  const isReady = selectedCity && selectedSession && confirmed;

  // ── Locked (and not already registered) ───────────────────────
  if (isLocked && !existingReg) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <FaceToFaceCardHeader />
        <div className="p-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3 items-start">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ea580c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="font-bold text-red-800 text-sm mb-1">
                Registration Locked
              </p>
              <p className="text-orange-700 text-[13px] leading-relaxed">
                {pmcData?.locked_reason ??
                  "You are already registered for an active PMC session."}
              </p>
              {pmcData?.last_join_pmc && (
                <p className="mt-1.5 text-[13px] text-red-800">
                  Currently enrolled in:{" "}
                  <strong>{pmcData.last_join_pmc}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Registered — confirmation screen ─────────────────────────
  if (existingReg && !isEditing) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <FaceToFaceCardHeader />
        <div className="px-6 py-10 flex flex-col items-center text-center">
          {/* Checkmark circle */}
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-5">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-900 mb-3">
            Registration Confirmed!
          </h2>

          {/* Body */}
          <p className="text-[15px] text-slate-500 leading-7 max-w-[460px] mb-1.5">
            You have successfully registered for the face-to-face Pakistan Math
            Contest (PMC) in{" "}
            <strong className="text-[#ad474b] font-bold">
              {existingReg.face_to_face_city}
            </strong>{" "}
            on Sunday, <strong>June 21st, 2026</strong>.
          </p>
          <p className="text-[13px] text-slate-400 mb-7">
            Test time and location venue details will be shared with you soon
            via SMS.
          </p>

          {/* Change link */}
          <button
            type="button"
            onClick={handleEditClick}
            className="bg-transparent border-none text-[#ad474b] font-bold text-sm underline cursor-pointer p-0"
          >
            Change City / Registration
          </button>
        </div>
      </div>
    );
  }

  // ── Main form (new registration OR edit mode) ──────────────────
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <FaceToFaceCardHeader />
      <div className="p-6">
        {/* Edit mode banner */}
        {existingReg && isEditing && (
          <div className="bg-amber-50 border border-amber-200 rounded-[10px] px-3.5 py-2.5 mb-5 flex items-center justify-between gap-3">
            <p className="text-[13px] text-amber-800 font-semibold">
              Editing your existing registration — changes will overwrite the
              current one.
            </p>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-transparent border-none text-amber-800 font-bold text-[13px] cursor-pointer underline whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        )}

        <p className="text-[15px] text-gray-700 leading-relaxed mb-5">
          If you are a student from one of the following 5 cities and have not
          yet attempted the Pakistan Math Contest (PMC), you have a unique
          opportunity to take the PMC{" "}
          <strong>
            face-to-face (in-person) on Sunday, 21st of June, 2026
          </strong>
          .
        </p>

        {/* ── Cities ── */}
        <p className="text-[14px] text-gray-500 font-bold uppercase tracking-wider mb-3">
          Please select your city:
        </p>
        <div className="mb-8 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
          {CITIES.map((city) => {
            const active = selectedCity === city;
            return (
              <button
                key={city}
                type="button"
                onClick={() => handleCitySelect(city)}
                className={`relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 p-4 text-center font-semibold text-base cursor-pointer
                  ${active
                    ? "bg-[rgba(173,71,75,0.05)] border-2 border-[#ad474b] text-[#ad474b]"
                    : "bg-white border border-slate-200 text-slate-500"
                  }`}
              >
                {city}
                {active && <CheckBadge />}
              </button>
            );
          })}
        </div>

        {/* ── Sessions — only after city is chosen ── */}
        {selectedCity && (
          <>
            <p className="text-[14px] text-gray-500 font-bold uppercase tracking-wider mb-3">
              Select a contest session:
            </p>

            {flatSessions.length === 0 ? (
              <div className="mb-6 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
                No contest sessions are currently open for registration. Check
                back soon!
              </div>
            ) : (
              <div className="mb-6 flex flex-col gap-2.5">
                {flatSessions.map((item) => {
                  const {
                    type,
                    round,
                    minimum_age,
                    upper_age_limit,
                    session_date,
                  } = item;
                  const isActive =
                    selectedSession?.session_date?.pmc_session_id ===
                    session_date.pmc_session_id;

                  return (
                    <button
                      key={session_date.pmc_session_id}
                      type="button"
                      onClick={() => handleSessionSelect(type, session_date)}
                      className={`relative w-full text-left transition-all duration-200 rounded-xl px-4 py-3.5 cursor-pointer
                        ${isActive
                          ? "bg-[rgba(173,71,75,0.04)] border-2 border-[#ad474b]"
                          : "bg-white border border-slate-200"
                        }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {/* <span
                              className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full tracking-[0.05em] transition-colors duration-200
                                ${isActive
                                  ? "bg-[#ad474b] text-white"
                                  : "bg-slate-200 text-slate-500"
                                }`}
                            >
                              {type}
                            </span> */}
                          </div>

                          <div
                            className={`font-bold text-[15px] ${isActive ? "text-[#ad474b]" : "text-slate-900"}`}
                          >
                            {session_date.title}
                          </div>
                        </div>

                        {isActive && (
                          <span className="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-[#ad474b] ml-3">
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 13 13"
                              fill="none"
                            >
                              <path
                                d="M2.5 6.5L5.5 9.5L10.5 3.5"
                                stroke="#fff"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Confirm checkbox ── */}
        {selectedCity && selectedSession && (
          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="cursor-pointer flex items-start gap-3 text-slate-700 text-sm leading-relaxed">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 w-[18px] h-[18px] accent-[#ad474b] cursor-pointer shrink-0"
              />
              <span>
                I confirm that I will attend &nbsp;
                <strong className="text-[#ad474b]">
                  {selectedSession.session_date.title}&nbsp;
                </strong>
                <strong>in-person</strong> in&nbsp;
                <strong className="text-[#ad474b]">{selectedCity}</strong> on
                Sunday, <strong>June 21st, 2026</strong>. (Test time and
                location venue details will be shared to you later via SMS.)
              </span>
            </label>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 text-sm bg-rose-50 border border-rose-200 rounded-[10px] px-3.5 py-3 text-red-700">
            {error}
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="button"
          disabled={!isReady || submitting}
          onClick={handleSubmit}
          className={`block w-full text-base font-bold py-3 px-6 border-none rounded-xl text-center text-white transition-colors duration-200
            ${isReady && !submitting
              ? "bg-[#ad474b] cursor-pointer"
              : "bg-slate-300 cursor-not-allowed"
            }`}
        >
          {submitting
            ? "Submitting…"
            : existingReg
              ? "Update Registration"
              : "Confirm Face-to-Face Registration"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

const isTruthyLike = (value) => {
  if (value === true || value === 1) return true;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["true", "1", "yes"].includes(normalized);
};

const toItems = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (Array.isArray(value.data)) return value.data;
    return Object.values(value).filter(
      (item) => item && typeof item === "object",
    );
  }
  return [];
};

const toId = (value) =>
  value === null || value === undefined || value === "" ? "" : String(value);

const getSessionId = (item) =>
  item?.id ?? item?._id ?? item?.session_id ?? item?.value ?? null;
const getVenueId = (item) =>
  item?.id ?? item?._id ?? item?.venue_id ?? item?.value ?? null;
const getTimeSlotId = (item) =>
  item?.id ?? item?._id ?? item?.time_slot_id ?? item?.value ?? null;

const getPmcParticipationSessionId = (item) =>
  item?.pmc_session_id ??
  item?.session_id ??
  item?.session?.id ??
  getSessionId(item);

const getPmcParticipationTimeSlotId = (item) =>
  item?.pmc_time_slot_id ??
  item?.time_slot_id ??
  item?.time_slot?.id ??
  item?.pmc_time_slot?.id ??
  getTimeSlotId(item?.time_slot) ??
  getTimeSlotId(item?.pmc_time_slot) ??
  getTimeSlotId(item);

const getPmcParticipationVenueId = (item) =>
  item?.pmc_venue_id ??
  item?.venue_id ??
  item?.venue?.id ??
  item?.pmc_venue?.id ??
  item?.selected_venue_id ??
  getVenueId(item?.venue) ??
  getVenueId(item?.pmc_venue) ??
  getVenueId(item);

const isPmcRoundTwoSession = (session) => toId(session?.round) === "2";
const getPmcRoundTwoVenueType = (session) =>
  String(session?.allowed_round_2_venue_type ?? "")
    .trim()
    .toLowerCase();
const getPmcRoundTwoVenueOptions = (session) => {
  const venueConfig = session?.assigned_round_2_venue;
  return Array.isArray(venueConfig?.venues) ? venueConfig.venues : [];
};
const getPmcRoundTwoClusterVenueLabel = (session) => {
  const venueConfig = session?.assigned_round_2_venue;
  if (typeof venueConfig === "string") return venueConfig.trim();
  if (venueConfig && typeof venueConfig === "object") {
    if (typeof venueConfig.assigned_venue === "string")
      return venueConfig.assigned_venue.trim();
    if (
      venueConfig.assigned_venue &&
      typeof venueConfig.assigned_venue === "object"
    ) {
      return String(
        venueConfig.assigned_venue?.name ??
          venueConfig.assigned_venue?.title ??
          venueConfig.assigned_venue?.label ??
          "",
      ).trim();
    }
  }
  return "";
};

const formatDate = (value) => {
  if (!value) return "TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTime = (value, { showMeridiem = false } = {}) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "TBA";
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
  if (!showMeridiem) return `${String(hours).padStart(2, "0")}:${minutes}`;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
};

const formatTimeSlot = (slot, options) => {
  const start = formatTime(slot?.start_time ?? slot?.startTime, options);
  const end = formatTime(slot?.end_time ?? slot?.endTime, options);
  return start && end && start !== "TBA" && end !== "TBA"
    ? `${start} - ${end}`
    : start || end || "TBA";
};

const getRegistrationTime = (registration, options) =>
  registration?.time_slot
    ? formatTimeSlot(registration.time_slot, options)
    : formatTime(registration?.time, options);

const getContestCode = (registration) =>
  String(registration?.contest ?? "")
    .trim()
    .toUpperCase();

const getCurrentRegistrationColumnLabel = (registrations) => {
  const contestCodes = Array.from(
    new Set(registrations.map((r) => getContestCode(r)).filter(Boolean)),
  );
  if (contestCodes.length === 1) {
    if (contestCodes[0] === "PMC") return "Link / Venue";
    if (contestCodes[0] === "RMC") return "Venue";
  }
  return "Link / Venue";
};

const getRegistrationVenueLabel = (registration) =>
  registration?.venue?.name ??
  registration?.venue?.title ??
  registration?.rmc_venue?.name ??
  registration?.rmc_venue?.title ??
  registration?.venue_name ??
  registration?.rmc_venue_name ??
  registration?.venue ??
  "N/A";

const PMC_RESULT_STATUS_LABELS = {
  qualified: "Qualified",
  not_qualified: "Not Qualified",
  not_qualified_due_to_integrity_breach: "Integrity Breach",
};

const getRegistrationResultData = (registration) =>
  registration?.result?.data ?? registration?.result ?? null;
const getPmcResultStatusLabel = (status) =>
  PMC_RESULT_STATUS_LABELS[
    String(status ?? "")
      .trim()
      .toLowerCase()
  ] ?? "N/A";

const getPastRegistrationScore = (registration) => {
  const contestCode = getContestCode(registration);
  const resultData = getRegistrationResultData(registration);
  if (contestCode === "RMC") {
    const obtainedMarks = resultData?.obtained_marks;
    const totalMarks = resultData?.total_marks;
    return obtainedMarks !== null &&
      obtainedMarks !== undefined &&
      totalMarks !== null &&
      totalMarks !== undefined
      ? `${obtainedMarks}/${totalMarks}`
      : "N/A";
  }
  if (contestCode === "PMC") {
    return toId(registration?.session_round) === "2"
      ? (resultData?.score ?? "N/A")
      : getPmcResultStatusLabel(resultData?.status);
  }
  return "N/A";
};

const getPastRegistrationRemarks = (registration) =>
  getRegistrationResultData(registration)?.remarks ?? "N/A";

const getRmcParticipationSessionId = (item) =>
  item?.rmc_session_id ??
  item?.session_id ??
  item?.session?.id ??
  getSessionId(item);

const getRmcParticipationVenueId = (item) =>
  item?.rmc_venue_id ??
  item?.venue_id ??
  item?.venue?.id ??
  item?.rmc_venue?.id ??
  item?.selected_venue_id ??
  getVenueId(item?.venue) ??
  getVenueId(item?.rmc_venue) ??
  getVenueId(item);

const buildRmcSelectionMap = ({
  sessions,
  participations,
  selectedSessionId = "",
  selectedVenueId = "",
  registered = false,
}) => {
  const nextSelections = {};
  toItems(sessions).forEach((session) => {
    const sessionId = toId(getSessionId(session));
    if (!sessionId) return;
    nextSelections[sessionId] = { checked: false, venueId: "" };
  });
  toItems(participations).forEach((participation) => {
    const sessionId = toId(getRmcParticipationSessionId(participation));
    if (!sessionId) return;
    const checked = isTruthyLike(participation?.is_participating ?? true);
    nextSelections[sessionId] = {
      checked,
      venueId: checked ? toId(getRmcParticipationVenueId(participation)) : "",
    };
  });
  toItems(sessions).forEach((session) => {
    const sessionId = toId(getSessionId(session));
    if (!sessionId) return;
    if (isTruthyLike(session?.already_registered)) {
      nextSelections[sessionId] = {
        checked: true,
        venueId:
          nextSelections[sessionId]?.venueId ||
          toId(session?.selected_venue_id) ||
          "",
      };
    }
  });
  if (selectedSessionId) {
    nextSelections[selectedSessionId] = {
      checked:
        registered ||
        isTruthyLike(nextSelections[selectedSessionId]?.checked) ||
        Boolean(selectedVenueId),
      venueId:
        nextSelections[selectedSessionId]?.venueId || selectedVenueId || "",
    };
  }
  return nextSelections;
};

const serializeRmcSelections = (sessions, selections) =>
  toItems(sessions)
    .map((session) => {
      const sessionId = toId(getSessionId(session));
      if (!sessionId) return "";
      const selection = selections?.[sessionId] ?? {};
      const checked = isTruthyLike(selection?.checked);
      return `${sessionId}:${checked ? 1 : 0}:${checked ? toId(selection?.venueId) : ""}`;
    })
    .filter(Boolean)
    .join("|");

const sanitizePmcPhoneInput = (value = "") =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 11);
const formatPmcPhoneMaskedInput = (value = "") => {
  const digits = sanitizePmcPhoneInput(value);
  if (!digits) return "";
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
};
const isValidPmcPhone = (value = "") =>
  /^03\d{9}$/.test(sanitizePmcPhoneInput(value));
const normalizePmcPhonePayload = (value = "") => sanitizePmcPhoneInput(value);

const hasActivePmcRegistration = (pmcData) =>
  isTruthyLike(pmcData?.registered) ||
  Boolean(
    toId(getPmcParticipationSessionId(pmcData?.round_1_participation)) ||
    toId(pmcData?.selected_session_id),
  );

const getPmcRegistrationGuideStep = ({
  pmcRegistered,
  pmcTypeKey,
  pmcSessionId,
  pmcTimeSlotId,
  pmcPhone,
  showPmcVenueField,
  pmcVenueId,
}) => {
  if (pmcRegistered) return null;
  if (!pmcTypeKey) return "session";
  if (!pmcSessionId) return "date";
  if (!pmcTimeSlotId) return "slot";
  if (!isValidPmcPhone(pmcPhone)) return "phone";
  if (showPmcVenueField && !pmcVenueId) return "venue";
  return "submit";
};

const getPmcFieldGuideClass = (isActive) =>
  isActive ? "pmc-guide-field-blink" : "";
const getPmcSubmitGuideClass = (isActive) =>
  isActive ? "pmc-guide-submit-blink" : "";
const normalizePmcType = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const resolveLastJoinPmcTypeKey = (pmcData) => {
  const lastJoinPmc = String(
    pmcData?.last_join_pmc ?? pmcData?.locked_type ?? "",
  ).trim();
  if (!lastJoinPmc) return "";
  const target = normalizePmcType(lastJoinPmc);
  const matchedSession = toItems(pmcData?.sessions).find(
    (sess) => normalizePmcType(sess?.type) === target,
  );
  return matchedSession?.type ?? lastJoinPmc;
};

const hasFaceToFaceMode = (pmcSessions) =>
  toItems(pmcSessions).some((sess) =>
    toItems(sess?.session_dates).some(
      (sd) =>
        String(sd?.mode ?? "")
          .trim()
          .toLowerCase() === "face_to_face",
    ),
  );

// ─────────────────────────────────────────────
// StudentContestPage
// ─────────────────────────────────────────────

const StudentContestPage = () => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [availableContests, setAvailableContests] = React.useState({
    pmc: { sessions: [] },
    rmc: { sessions: [], venues: [] },
  });
  const [currentRegistrations, setCurrentRegistrations] = React.useState([]);
  const [pastRegistrations, setPastRegistrations] = React.useState([]);
  const [activeRemarksRegistration, setActiveRemarksRegistration] =
    React.useState(null);
  const [pmcTypeKey, setPmcTypeKey] = React.useState("");
  const [pmcSessionId, setPmcSessionId] = React.useState("");
  const [pmcTimeSlotId, setPmcTimeSlotId] = React.useState("");
  const [pmcPhone, setPmcPhone] = React.useState("");
  const [pmcVenueId, setPmcVenueId] = React.useState("");
  const [rmcSelections, setRmcSelections] = React.useState({});
  const [initialSelection, setInitialSelection] = React.useState({
    pmc: {
      checked: false,
      sessionId: "",
      timeSlotId: "",
      phone: "",
      venueId: "",
    },
    rmc: {},
  });

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [availableResponse, currentResponse, pastResponse] =
        await Promise.all([
          getAllContest(),
          getAllCurrentContestRegistrations(),
          getAllPastContestRegistrations(),
        ]);

      const rawData = availableResponse?.data ?? {};
      const nextPmc = {
        ...(rawData?.pmc ?? {}),
        last_join_pmc:
          rawData?.pmc?.last_join_pmc ??
          rawData?.last_join_pmc ??
          rawData?.pmc?.locked_type,
        sessions: toItems(rawData?.pmc?.sessions),
        participations: toItems(rawData?.pmc?.participations ?? []),
      };
      const nextRmc = {
        ...(rawData?.rmc ?? {}),
        sessions: toItems(rawData?.rmc?.sessions),
        venues: toItems(rawData?.rmc?.venues),
        participations: toItems(rawData?.rmc?.participations),
      };

      const allPmcSessionDates = nextPmc.sessions.flatMap((sess) =>
        toItems(sess?.session_dates),
      );
      let nextPmcTypeKey = resolveLastJoinPmcTypeKey(nextPmc);
      let nextPmcSessionId = "";
      let nextPmcTimeSlotId = "";
      let nextPmcPhone = "";
      let nextPmcVenueId = "";
      const nextPmcChecked = hasActivePmcRegistration(nextPmc);

      if (nextPmcChecked) {
        nextPmcSessionId =
          toId(nextPmc?.selected_session_id) ||
          toId(getPmcParticipationSessionId(nextPmc?.round_1_participation)) ||
          "";
        nextPmcTimeSlotId =
          toId(nextPmc?.selected_time_slot_id) ||
          toId(getPmcParticipationTimeSlotId(nextPmc?.round_1_participation)) ||
          "";
        if (!nextPmcTypeKey && nextPmcSessionId) {
          for (const sess of nextPmc.sessions) {
            const matchedDate = toItems(sess?.session_dates).find(
              (d) => toId(d?.pmc_session_id) === nextPmcSessionId,
            );
            if (matchedDate) {
              nextPmcTypeKey = sess?.type ?? "";
              break;
            }
          }
        }
        if (!nextPmcTypeKey)
          nextPmcTypeKey = resolveLastJoinPmcTypeKey(nextPmc);
        const currentPmcSessionDate = nextPmcSessionId
          ? allPmcSessionDates.find(
              (d) => toId(d?.pmc_session_id) === nextPmcSessionId,
            ) || null
          : null;
        nextPmcVenueId =
          toId(nextPmc?.selected_venue_id) ||
          toId(getPmcParticipationVenueId(nextPmc?.round_1_participation)) ||
          toId(currentPmcSessionDate?.selected_venue_id) ||
          toId(getPmcParticipationVenueId(currentPmcSessionDate));
        nextPmcPhone = formatPmcPhoneMaskedInput(
          nextPmc?.phone ??
            nextPmc?.selected_phone ??
            nextPmc?.round_1_participation?.phone ??
            "",
        );
      }

      const nextRmcSessionId =
        toId(nextRmc?.selected_session_id) ||
        toId(
          getRmcParticipationSessionId(
            nextRmc.participations.find((item) =>
              isTruthyLike(item?.is_participating ?? true),
            ),
          ),
        );
      const nextRmcVenueId =
        toId(nextRmc?.selected_venue_id) ||
        toId(
          getRmcParticipationVenueId(
            nextRmc.participations.find((item) =>
              isTruthyLike(item?.is_participating ?? true),
            ),
          ),
        );
      const nextRmcChecked =
        isTruthyLike(nextRmc?.registered) ||
        nextRmc.participations.some((item) =>
          isTruthyLike(item?.is_participating ?? true),
        ) ||
        nextRmc.sessions.some((item) => isTruthyLike(item?.already_registered));
      const nextRmcSelections = buildRmcSelectionMap({
        sessions: nextRmc.sessions,
        participations: nextRmc.participations,
        selectedSessionId: nextRmcSessionId,
        selectedVenueId: nextRmcVenueId,
        registered: nextRmcChecked,
      });
      const nextRegistrationRequired =
        isContestRegistrationRequired(availableResponse);

      writeContestRegistrationRequired(nextRegistrationRequired);
      emitContestRegistrationStatusUpdated({
        registrationRequired: nextRegistrationRequired,
      });

      setAvailableContests({ pmc: nextPmc, rmc: nextRmc });
      setPmcTypeKey(nextPmcTypeKey);
      setPmcSessionId(nextPmcSessionId);
      setPmcTimeSlotId(nextPmcTimeSlotId);
      setPmcPhone(nextPmcChecked ? nextPmcPhone : "");
      setPmcVenueId(nextPmcChecked ? nextPmcVenueId : "");
      setRmcSelections(nextRmcSelections);
      setInitialSelection({
        pmc: {
          checked: nextPmcChecked,
          sessionId: nextPmcChecked ? nextPmcSessionId : "",
          timeSlotId: nextPmcChecked ? nextPmcTimeSlotId : "",
          phone: nextPmcChecked ? normalizePmcPhonePayload(nextPmcPhone) : "",
          venueId: nextPmcChecked ? nextPmcVenueId : "",
        },
        rmc: nextRmcSelections,
      });
      setCurrentRegistrations(toItems(currentResponse?.data?.registrations));
      setPastRegistrations(toItems(pastResponse?.data?.registrations));
    } catch (err) {
      setError(err?.message || "Unable to load contest registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const pmc = availableContests.pmc ?? { sessions: [] };
  const rmc = availableContests.rmc ?? { sessions: [], venues: [] };
  const pmcSessions = pmc.sessions ?? [];
  const rmcSessions = rmc.sessions ?? [];
  const rmcVenues = rmc.venues ?? [];

  const isFaceToFace = hasFaceToFaceMode(pmcSessions);

  const allPmcSessionDates = pmcSessions.flatMap((s) =>
    toItems(s?.session_dates),
  );
  const pmcRegistered = hasActivePmcRegistration(pmc);
  const rmcRegistered =
    isTruthyLike(rmc?.registered) ||
    toItems(rmc?.participations).some((item) =>
      isTruthyLike(item?.is_participating ?? true),
    ) ||
    rmcSessions.some((item) => isTruthyLike(item?.already_registered));
  const rmcEligible = isTruthyLike(rmc?.eligible);
  const showRmcContestSection =
    rmcSessions.length > 0 && (rmcRegistered || rmcVenues.length > 0);

  const activePmcTypeSession =
    pmcSessions.find(
      (s) => normalizePmcType(s.type) === normalizePmcType(pmcTypeKey),
    ) || null;
  const activePmcDates = toItems(activePmcTypeSession?.session_dates);
  const activePmcSessionDate =
    activePmcDates.find((d) => toId(d?.pmc_session_id) === pmcSessionId) ||
    null;
  const activePmcTimeSlots = toItems(activePmcSessionDate?.slots);
  const activePmcIsRoundTwo = isPmcRoundTwoSession(activePmcSessionDate);
  const activePmcVenueType = getPmcRoundTwoVenueType(activePmcSessionDate);
  const activePmcVenueOptions =
    getPmcRoundTwoVenueOptions(activePmcSessionDate);
  const activePmcClusterVenueLabel =
    getPmcRoundTwoClusterVenueLabel(activePmcSessionDate);
  const showPmcVenueField =
    Boolean(activePmcSessionDate) &&
    activePmcIsRoundTwo &&
    ["vu_venue", "cluster_venue"].includes(activePmcVenueType);

  const pmcGuideStep = getPmcRegistrationGuideStep({
    pmcRegistered,
    pmcTypeKey,
    pmcSessionId,
    pmcTimeSlotId,
    pmcPhone,
    showPmcVenueField,
    pmcVenueId,
  });
  const pmcParticipating = Boolean(
    pmcTypeKey &&
    pmcSessionId &&
    pmcTimeSlotId &&
    isValidPmcPhone(pmcPhone) &&
    (!showPmcVenueField || pmcVenueId),
  );
  const savedPmcPhone = normalizePmcPhonePayload(initialSelection.pmc.phone);
  const hasSavedValidPmcPhone = isValidPmcPhone(savedPmcPhone);
  const canEditPmcPhone = !saving && (!pmcRegistered || !hasSavedValidPmcPhone);
  const canSubmitPmc = pmcSessions.length > 0 || pmcRegistered;
  const canSubmitRmc = showRmcContestSection && (rmcEligible || rmcRegistered);
  const currentRegistrationColumnLabel =
    getCurrentRegistrationColumnLabel(currentRegistrations);

  const selectedRmcParticipations = rmcSessions
    .map((session) => {
      const sessionId = toId(getSessionId(session));
      if (!sessionId) return null;
      const selection = rmcSelections?.[sessionId] ?? {};
      if (!isTruthyLike(selection?.checked)) return null;
      return {
        sessionId,
        venueId: toId(selection?.venueId),
        title: session?.title ?? session?.type ?? "RMC Session",
      };
    })
    .filter(Boolean);
  const rmcChecked = selectedRmcParticipations.length > 0;

  React.useEffect(() => {
    if (!pmcSessionId) {
      setPmcTimeSlotId("");
      return;
    }
    const stillExists = activePmcTimeSlots.some(
      (item) => toId(getTimeSlotId(item)) === pmcTimeSlotId,
    );
    if (!stillExists) setPmcTimeSlotId("");
  }, [activePmcTimeSlots, pmcSessionId, pmcTimeSlotId]);

  React.useEffect(() => {
    if (!pmcSessionId || !activePmcSessionDate || !activePmcIsRoundTwo) {
      setPmcVenueId("");
      return;
    }
    if (activePmcVenueType !== "vu_venue") {
      setPmcVenueId("");
      return;
    }
    if (!activePmcVenueOptions.length) {
      setPmcVenueId("");
      return;
    }
    const stillExists = activePmcVenueOptions.some(
      (item) => toId(getVenueId(item)) === pmcVenueId,
    );
    if (stillExists) return;
    const existingVenueId =
      toId(activePmcSessionDate?.selected_venue_id) ||
      toId(getPmcParticipationVenueId(activePmcSessionDate));
    if (
      existingVenueId &&
      activePmcVenueOptions.some(
        (item) => toId(getVenueId(item)) === existingVenueId,
      )
    ) {
      setPmcVenueId(existingVenueId);
      return;
    }
    if (pmcVenueId) setPmcVenueId("");
  }, [
    activePmcIsRoundTwo,
    activePmcSessionDate,
    activePmcVenueOptions,
    activePmcVenueType,
    pmcSessionId,
    pmcVenueId,
  ]);

  const handleSubmit = async () => {
    try {
      setError("");
      if (pmcSessions.length > 0 && !pmcRegistered) {
        if (!pmcTypeKey) throw new Error("Please select a PMC session type.");
        if (activePmcDates.length > 0 && !pmcSessionId)
          throw new Error("Please select a contest date.");
        if (activePmcTimeSlots.length > 0 && !pmcTimeSlotId)
          throw new Error("Please select a PMC time slot.");
        if (!isValidPmcPhone(pmcPhone))
          throw new Error(
            "Please enter a valid mobile number starting with 03 (11 digits).",
          );
      }
      if (
        pmcParticipating &&
        activePmcIsRoundTwo &&
        activePmcVenueType === "vu_venue" &&
        !activePmcVenueOptions.length
      )
        throw new Error(
          "No PMC venues are available for this round 2 session.",
        );
      if (
        pmcParticipating &&
        activePmcIsRoundTwo &&
        activePmcVenueType === "vu_venue" &&
        !pmcVenueId
      )
        throw new Error("Please select a PMC venue.");
      if (rmcChecked && rmcVenues.length > 0) {
        const missingVenueSelection = selectedRmcParticipations.find(
          (selection) => !selection?.venueId,
        );
        if (missingVenueSelection)
          throw new Error(
            `Please select an RMC venue for ${missingVenueSelection.title}.`,
          );
      }

      const nextPmcSelection = {
        checked:
          pmcRegistered || Boolean(pmcTypeKey && pmcSessionId && pmcTimeSlotId),
        sessionId: toId(pmcSessionId),
        timeSlotId: toId(pmcTimeSlotId),
        phone: normalizePmcPhonePayload(pmcPhone),
        venueId:
          activePmcIsRoundTwo && activePmcVenueType === "vu_venue"
            ? toId(pmcVenueId)
            : "",
      };

      if (
        nextPmcSelection.checked &&
        (!nextPmcSelection.sessionId ||
          !nextPmcSelection.timeSlotId ||
          !isValidPmcPhone(pmcPhone))
      )
        throw new Error(
          "Please select PMC grade, date, time slot, and enter a valid mobile number starting with 03 (11 digits).",
        );

      const nextRmcSelection = rmcSessions.reduce((acc, session) => {
        const sessionId = toId(getSessionId(session));
        if (!sessionId) return acc;
        const selection = rmcSelections?.[sessionId] ?? {};
        const checked = isTruthyLike(selection?.checked);
        acc[sessionId] = {
          checked,
          venueId: checked ? toId(selection?.venueId) : "",
        };
        return acc;
      }, {});

      const hasPmcChanged =
        canSubmitPmc &&
        (initialSelection.pmc.checked !== nextPmcSelection.checked ||
          initialSelection.pmc.sessionId !== nextPmcSelection.sessionId ||
          initialSelection.pmc.timeSlotId !== nextPmcSelection.timeSlotId ||
          initialSelection.pmc.phone !== nextPmcSelection.phone ||
          initialSelection.pmc.venueId !== nextPmcSelection.venueId);
      const hasRmcChanged =
        canSubmitRmc &&
        serializeRmcSelections(rmcSessions, initialSelection.rmc) !==
          serializeRmcSelections(rmcSessions, nextRmcSelection);

      const payload = {};
      if (hasPmcChanged) {
        payload.pmc = nextPmcSelection.checked
          ? {
              is_participating: true,
              pmc_session_id: Number(nextPmcSelection.sessionId),
              pmc_time_slot_id: Number(nextPmcSelection.timeSlotId),
              phone: nextPmcSelection.phone,
              ...(nextPmcSelection.venueId
                ? { pmc_venue_id: Number(nextPmcSelection.venueId) }
                : {}),
            }
          : { is_participating: false };
      }
      if (hasRmcChanged) {
        payload.rmc = rmcSessions
          .map((session) => {
            const sessionId = toId(getSessionId(session));
            if (!sessionId) return null;
            const selection = nextRmcSelection[sessionId] ?? {};
            const checked = isTruthyLike(selection?.checked);
            return {
              rmc_session_id: Number(sessionId),
              is_participating: checked,
              ...(checked && selection?.venueId
                ? { rmc_venue_id: Number(selection.venueId) }
                : {}),
            };
          })
          .filter(Boolean)
          .filter((item) => isTruthyLike(item?.is_participating));
      }

      if (!Object.keys(payload).length) {
        toast("No registration changes to update.");
        return;
      }

      setSaving(true);
      const response = await updateRegistrationInfo(payload);
      toast.success(response?.message || "Contest registrations updated.");
      await loadData();
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to update contest registrations.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pl-0 pr-0 sm:pl-7 sm:pr-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[18rem] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <>
          {/* ── Face-to-face OR standard PMC ── */}
          {isFaceToFace ? (
            <ContestRegistration
              pmcData={pmc}
              currentRegistrations={currentRegistrations}
              onRegistered={loadData}
            />
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="contest-header p-6 border-slate-100 border-b">
                <h1 className="text-black text-[22px] font-bold">
                  Mark Your PMC Participation
                </h1>
                <p className="text-[15px] text-gray-400 mt-1">
                  Interested in participating in upcoming contest sessions?
                </p>
                <p className="text-[15px] text-gray-400 mt-1">
                  Watch this video to learn how to register and select your slot
                  for PMC &nbsp;
                  <a
                    href="https://www.youtube.com/watch?v=YXLUZWRnIJY&feature=youtu.be"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#A51C30] font-semibold"
                  >
                    https://youtu.be/YXLUZWRnIJY
                  </a>
                </p>
              </div>

              {pmcSessions.length > 0 && (
                <div className="contest-body p-6">
                  <div className="contest-card p-6 border relative rounded-2xl transition-all hover:shadow-xl group bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 border-white/10 overflow-hidden">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-[17px] font-bold text-white">
                          PMC - Pakistan Math Contest
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-200">
                          A prestigious national level competition for
                          mathematical excellence. Open to all students
                          currently enrolled in secondary and higher.
                        </p>
                      </div>
                      {pmcRegistered && (
                        <span className="inline-flex rounded-[5px] px-3 py-2 md:top-[1.5em] md:absolute md:right-[3em] text-xs font-semibold bg-[#0F7657] text-slate-200 uppercase border-1 border-[#1A926B]">
                          Already registered
                        </span>
                      )}
                    </div>

                    <div
                      className={`mt-5 grid gap-4 border-t border-[#1A926B] pt-5 ${showPmcVenueField ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-emerald-300 mb-2 inline-block">
                          PMC Grade
                        </label>
                        <div
                          className={getPmcFieldGuideClass(
                            pmcGuideStep === "session",
                          )}
                        >
                          <select
                            className="form-input !mt-0 !mb-0"
                            value={pmcTypeKey}
                            onChange={(e) => {
                              setPmcTypeKey(e.target.value);
                              setPmcSessionId("");
                              setPmcTimeSlotId("");
                              setPmcVenueId("");
                            }}
                            disabled={saving}
                          >
                            {!pmcTypeKey ? (
                              <option value="">Select PMC Grade</option>
                            ) : null}
                            {pmcTypeKey &&
                            !pmcSessions.some(
                              (sess) =>
                                normalizePmcType(sess?.type) ===
                                normalizePmcType(pmcTypeKey),
                            ) ? (
                              <option value={pmcTypeKey}>{pmcTypeKey}</option>
                            ) : null}
                            {pmcSessions.map((sess) =>
                              sess?.type ? (
                                <option key={sess.type} value={sess.type}>
                                  {sess.type}
                                </option>
                              ) : null,
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-emerald-300 mb-2 inline-block">
                          Contest Date
                        </label>
                        <div
                          className={getPmcFieldGuideClass(
                            pmcGuideStep === "date",
                          )}
                        >
                          <select
                            className="form-input !mt-0 !mb-0"
                            value={pmcSessionId}
                            onChange={(e) => {
                              setPmcSessionId(e.target.value);
                              setPmcTimeSlotId("");
                              setPmcVenueId("");
                            }}
                            disabled={saving || !pmcTypeKey}
                          >
                            <option value="">
                              {pmcTypeKey
                                ? "Select contest date"
                                : "Select session first"}
                            </option>
                            {activePmcDates.map((d) => {
                              const sid = toId(d?.pmc_session_id);
                              return sid ? (
                                <option key={sid} value={sid}>
                                  {formatDate(d?.contest_date)}
                                </option>
                              ) : null;
                            })}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-emerald-300 mb-2 inline-block">
                          PMC Time Slot
                        </label>
                        <div
                          className={getPmcFieldGuideClass(
                            pmcGuideStep === "slot",
                          )}
                        >
                          <select
                            className="form-input !mt-0 !mb-0"
                            value={pmcTimeSlotId}
                            onChange={(e) => setPmcTimeSlotId(e.target.value)}
                            disabled={
                              saving ||
                              !pmcSessionId ||
                              !activePmcTimeSlots.length
                            }
                          >
                            <option value="">
                              {pmcSessionId
                                ? "Select time slot"
                                : "Select date first"}
                            </option>
                            {activePmcTimeSlots.map((slot) => {
                              const slotId = toId(getTimeSlotId(slot));
                              return slotId ? (
                                <option key={slotId} value={slotId}>
                                  {formatTimeSlot(slot, { showMeridiem: true })}
                                </option>
                              ) : null;
                            })}
                          </select>
                        </div>
                      </div>

                      {showPmcVenueField && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-emerald-300">
                            PMC Venue
                          </label>
                          <div
                            className={getPmcFieldGuideClass(
                              pmcGuideStep === "venue",
                            )}
                          >
                            {activePmcVenueType === "vu_venue" ? (
                              <select
                                className="form-input"
                                value={pmcVenueId}
                                onChange={(e) => setPmcVenueId(e.target.value)}
                                disabled={
                                  saving ||
                                  !pmcSessionId ||
                                  !activePmcVenueOptions.length
                                }
                              >
                                <option value="">
                                  {activePmcVenueOptions.length
                                    ? "Select PMC venue"
                                    : "No venues available"}
                                </option>
                                {activePmcVenueOptions.map((venue) => {
                                  const venueId = toId(getVenueId(venue));
                                  const venueName = String(
                                    venue?.name ??
                                      venue?.title ??
                                      venue?.label ??
                                      "PMC Venue",
                                  ).trim();
                                  const venueCity = String(
                                    venue?.city ?? venue?.city_name ?? "",
                                  ).trim();
                                  return venueId ? (
                                    <option key={venueId} value={venueId}>
                                      {venueCity &&
                                      !venueName
                                        .toLowerCase()
                                        .includes(venueCity.toLowerCase())
                                        ? `${venueName} - ${venueCity}`
                                        : venueName}
                                    </option>
                                  ) : null;
                                })}
                              </select>
                            ) : (
                              <input
                                type="text"
                                className="form-input disabled:!bg-white"
                                value={
                                  activePmcClusterVenueLabel ||
                                  "Venue not assigned"
                                }
                                disabled
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 space-y-3 border-t border-[#1A926B] pt-5">
                      <p className="text-sm leading-6 text-slate-200">
                        The test link will be sent via SMS. Please confirm the
                        mobile number on which you want to receive the SMS.
                      </p>
                      <p
                        className="text-sm leading-7 text-slate-200"
                        dir="rtl"
                        lang="ur"
                      >
                        ٹیسٹ لنک آپ کو ایس ایم ایس کے ذریعے بھیجا جائے گا۔ براہِ
                        کرم اپنا وہ موبائل نمبر درج کریں جس پر آپ ٹیسٹ لنک
                        بذریعہ ایس ایم ایس موصول کرنا چاہتے ہیں۔
                      </p>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <label className="text-sm font-medium text-emerald-300 mb-2 inline-block">
                            Mobile Number{" "}
                            <span className="text-amber-200">*</span>
                          </label>
                          <div
                            className={getPmcFieldGuideClass(
                              pmcGuideStep === "phone",
                            )}
                          >
                            <input
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel"
                              className="form-input !mt-0 !mb-0"
                              placeholder="03XX-XXXXXXX"
                              value={pmcPhone}
                              required={!pmcRegistered}
                              onChange={(e) =>
                                setPmcPhone(
                                  formatPmcPhoneMaskedInput(e.target.value),
                                )
                              }
                              disabled={!canEditPmcPhone || !pmcSessionId}
                              maxLength={12}
                            />
                          </div>
                          {pmcPhone && !isValidPmcPhone(pmcPhone) ? (
                            <p className="text-xs text-amber-200">
                              Enter an 11-digit number starting with 03 (e.g.
                              0300-1234567).
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showRmcContestSection && (
                <div className="contest-body p-6">
                  {!rmcEligible && !rmcRegistered ? (
                    <div className="mb-5 rounded-[15px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                      RMC is currently unavailable for this student
                    </div>
                  ) : null}
                  <div className="space-y-6">
                    {rmcSessions.map((session) => {
                      const sessionId = toId(getSessionId(session));
                      const sessionSelection = rmcSelections?.[sessionId] ?? {
                        checked: false,
                        venueId: "",
                      };
                      const isSelectedSession = isTruthyLike(
                        sessionSelection?.checked,
                      );
                      const isSessionRegistered = isTruthyLike(
                        session?.already_registered,
                      );
                      return (
                        <div
                          key={sessionId || session?.title || "rmc-session"}
                          className="contest-card p-6 border relative rounded-2xl transition-all hover:shadow-xl group bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 border-white/10 overflow-hidden"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <label className="flex cursor-pointer items-start gap-4">
                              <span className="flex flex-col items-center">
                                <input
                                  type="checkbox"
                                  checked={isSelectedSession}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    if (!sessionId) return;
                                    setRmcSelections((prev) => {
                                      const currentSelection = prev?.[
                                        sessionId
                                      ] ?? { checked: false, venueId: "" };
                                      return {
                                        ...prev,
                                        [sessionId]: {
                                          checked,
                                          venueId: checked
                                            ? currentSelection.venueId ||
                                              toId(
                                                session?.selected_venue_id,
                                              ) ||
                                              toId(getVenueId(rmcVenues[0]))
                                            : currentSelection.venueId,
                                        },
                                      };
                                    });
                                  }}
                                  disabled={
                                    saving ||
                                    (!rmcEligible && !isSessionRegistered)
                                  }
                                  className={`mt-1 h-7 w-7 accent-[#2563EB] ${!isSelectedSession && !isSessionRegistered ? "animate-pulse" : ""}`}
                                />
                                {!isSelectedSession && !isSessionRegistered && (
                                  <span className="text-xs text-white/80 mt-1 whitespace-nowrap">
                                    Check this box to register
                                  </span>
                                )}
                              </span>
                              <div>
                                <h3 className="text-[17px] font-bold text-white">
                                  RMC - Regional Math Contest —{" "}
                                  {formatDate(session?.contest_date)}
                                </h3>
                                <p className="mt-1 text-sm font-semibold text-blue-200">
                                  {session?.title ??
                                    session?.type ??
                                    "RMC Session"}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-200">
                                  Regional level challenges for math enthusiasts
                                  in the district. This contest focuses on
                                  collaborative problem solving and fast-paced
                                  mental math rounds.
                                </p>
                              </div>
                            </label>
                            {isSessionRegistered && (
                              <span className="inline-flex rounded-[5px] px-3 py-2 md:top-[1.5em] md:absolute md:right-[3em] text-xs font-semibold border !border-white/20 !bg-white/10 text-blue-300 uppercase">
                                Already registered
                              </span>
                            )}
                          </div>
                          <div className="mt-5 grid gap-4 border-t border-white/20 pt-5 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-blue-300">
                                RMC Session
                              </label>
                              <select
                                className="form-input disabled:!bg-white"
                                value={sessionId}
                                disabled
                              >
                                <option value={sessionId}>
                                  {session?.title ??
                                    session?.type ??
                                    "RMC Session"}
                                </option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-blue-300">
                                RMC Venue
                              </label>
                              <select
                                className="form-input disabled:!bg-white"
                                value={
                                  isSelectedSession
                                    ? sessionSelection.venueId
                                    : ""
                                }
                                onChange={(e) =>
                                  setRmcSelections((prev) => ({
                                    ...prev,
                                    [sessionId]: {
                                      checked: true,
                                      venueId: e.target.value,
                                    },
                                  }))
                                }
                                disabled={
                                  !isSelectedSession ||
                                  saving ||
                                  !rmcVenues.length
                                }
                              >
                                <option value="">
                                  {rmcVenues.length
                                    ? "Select RMC venue"
                                    : "No venues available"}
                                </option>
                                {rmcVenues.map((venue) => {
                                  const venueId = toId(getVenueId(venue));
                                  return venueId ? (
                                    <option key={venueId} value={venueId}>
                                      {venue?.name ??
                                        venue?.title ??
                                        "RMC Venue"}
                                    </option>
                                  ) : null;
                                })}
                              </select>
                            </div>
                          </div>
                          {isSessionRegistered && (
                            <p className="text-blue-300 text-[12px] mt-2 flex gap-2">
                              <Info size={15} className="text-blue-300 ml-2" />{" "}
                              Note: To unregister from this session, uncheck the
                              box and click on 'Update Registrations'.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pmcSessions.length > 0 ? (
                <div className="p-6 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || saving}
                    className={`bg-[#AD474B] text-white hover:bg-[#96373A] !h-[42px] !px-7 font-bold cursor-pointer ${getPmcSubmitGuideClass(pmcGuideStep === "submit")}`}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirm Registrations
                  </Button>
                </div>
              ) : (
                <p className="px-6 py-4 text-sm font-medium text-slate-900 mt-2 flex gap-2">
                  No contests are currently open for registration. Check back
                  soon!
                </p>
              )}
            </div>
          )}

          {/* ── Current Registrations ── */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="contest-header px-6 py-4 border-slate-100 border-b bg-white">
              <h1 className="text-black text-[20px] font-bold">
                Current Registrations
              </h1>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Contest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {currentRegistrationColumnLabel}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {currentRegistrations.length ? (
                    currentRegistrations.map((registration, index) => {
                      const contestCode = getContestCode(registration);
                      const extraRegistrationDetail =
                        contestCode === "PMC" &&
                        toId(registration?.session_round) === "2" ? (
                          getRegistrationVenueLabel(registration)
                        ) : contestCode === "PMC" ? (
                          registration?.quilgo_link ? (
                            <a
                              href={registration.quilgo_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-md border border-slate-200 py-1 px-2 gap-1 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                              title="Start contest"
                            >
                              <ExternalLink size={16} />
                              <span>Start contest</span>
                            </a>
                          ) : (
                            "N/A"
                          )
                        ) : contestCode === "RMC" ? (
                          getRegistrationVenueLabel(registration)
                        ) : (
                          "N/A"
                        );
                      return (
                        <tr
                          key={
                            registration?.participation_id ??
                            `${contestCode || "contest"}-${index}`
                          }
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            <span className="font-bold text-[15px]">
                              {registration?.contest_label ??
                                registration?.contest ??
                                "Contest"}
                            </span>
                            <span className="text-gray-400 block">
                              {registration?.session_title ?? "Session"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {formatDate(registration?.date)} —{" "}
                            {getRegistrationTime(registration, {
                              showMeridiem: true,
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {extraRegistrationDetail}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-4 text-sm font-medium text-slate-900"
                      >
                        Contest registrations not found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-[#FBFCFD] text-center text-[12px] italic text-gray-500">
              To unregister, uncheck the contest in the registration form and
              click 'Update Registrations'.
            </div>
          </div>

          {/* ── Past Registrations ── */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="contest-header px-6 py-4 border-slate-100 border-b bg-white">
              <h1 className="text-black text-[20px] font-bold">
                Past Registrations
              </h1>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Contest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {pastRegistrations.length ? (
                    pastRegistrations.map((registration, index) => {
                      const remarks = getPastRegistrationRemarks(registration);
                      return (
                        <tr
                          key={
                            registration?.participation_id ??
                            `${getContestCode(registration) || "contest"}-past-${index}`
                          }
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            <span className="font-bold text-[15px]">
                              {registration?.contest_label ??
                                registration?.contest ??
                                "Contest"}
                            </span>
                            <span className="text-gray-400 block">
                              {registration?.session_title ?? "Session"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {formatDate(registration?.date)} —{" "}
                            {getRegistrationTime(registration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {getRegistrationVenueLabel(registration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {getPastRegistrationScore(registration)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {remarks !== "N/A" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveRemarksRegistration(registration)
                                }
                                className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                title="View remarks"
                              >
                                <MessageCircle size={16} />
                              </button>
                            ) : (
                              "N/A"
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-sm font-medium text-slate-900"
                      >
                        No past contest registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-[#FBFCFD] text-center text-[12px] italic text-gray-500">
              To unregister, uncheck the contest in the registration form and
              click 'Update Registrations'.
            </div>
          </div>

          {!currentRegistrations.length && !pastRegistrations.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#AD474B]" />
                Start by selecting a contest above and saving your registration.
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* ── Remarks modal ── */}
      {activeRemarksRegistration ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Result Remarks
                </h2>
                <p className="text-sm text-slate-500">
                  {activeRemarksRegistration?.contest_label ??
                    activeRemarksRegistration?.contest ??
                    "Contest"}{" "}
                  — {activeRemarksRegistration?.session_title ?? "Session"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveRemarksRegistration(null)}
                className="text-slate-500 transition hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {getPastRegistrationRemarks(activeRemarksRegistration)}
              </p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setActiveRemarksRegistration(null)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StudentContestPage;