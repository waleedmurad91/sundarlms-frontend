import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Languages,
  Edit,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  getQuestionById,
  getQuestionHistory,
  updateQuestionStatus,
  reviewQuestionTranslation,
} from "@/api/questionApi";
import { useAuthStore } from "@/store/auth";
import QuestionContent from "@/components/questions/QuestionContent";
import AnswerOptions from "@/components/questions/AnswerOptions";
import SolutionSteps from "@/components/questions/SolutionSteps";
import {
  FILL_BLANK_TYPES,
  buildFillBlankStateFromAnswers,
  getFillBlankComponentId,
  getFillBlankComponentType,
} from "@/utils/fillBlankComponents";
import { normalizeAlgebraFormats } from "@/utils/algebraFormat";
import {
  normalizeDragDropSubmittedAnswer,
  resolveDragDropLabelId,
  resolveDragDropTargets,
} from "@/utils/dragDropQuestion";
import { hasRealContent } from "@/utils/questionTranslation";

// ─── helpers ────────────────────────────────────────────────────────────────

const normalizeRole = (role) =>
  typeof role === "string" ? role.toLowerCase() : "";

const normalizeCorrectAnswerValue = (value) => {
  if (value && typeof value === "object") {
    const candidates = [
      value.value,
      value.correct_answer,
      value.answer,
      value.text,
      value.id,
      value.option_id,
      value.optionId,
    ];
    const first = candidates.find(
      (entry) =>
        entry !== undefined &&
        entry !== null &&
        !(typeof entry === "string" && entry.trim() === ""),
    );
    if (first !== undefined) return first;
  }
  return value;
};

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return format(new Date(value), "MMM dd, yyyy - hh:mm a");
  } catch {
    return String(value);
  }
};

const HISTORY_EMPTY_DISPLAY = "-|-";

const HistoryEmptyValue = ({ className = "" }) => (
  <span className={`text-slate-400 tracking-wider ${className}`.trim()}>
    {HISTORY_EMPTY_DISPLAY}
  </span>
);

const renderHistoryText = (value, className = "") => {
  const text = String(value ?? "").trim();
  if (text) return <span className={className}>{text}</span>;
  return <HistoryEmptyValue className={className} />;
};
const renderLanguageHistoryText = (value, statusLabel = "", className = "") => {
  const text = String(value ?? "").trim();
  if (text && statusLabel !== "pending translation") {
    return <span className={className}>{text}</span>;
  } else {
    return <HistoryEmptyValue className={className} />;
  }
};

// Formats a person object (or plain string) into "Name (email)".
// Tries a wide range of common field names so it works regardless of
// exactly how the backend names things on a given timeline event.
const getPersonLabel = (person) => {
  if (!person) return "";
  if (typeof person === "string") return person;
  if (typeof person === "number") return String(person);
  const name =
    person?.name ??
    person?.full_name ??
    person?.fullName ??
    person?.first_name ??
    person?.firstName ??
    person?.username ??
    person?.user_name ??
    "";
  const email =
    person?.email ?? person?.email_address ?? person?.emailAddress ?? "";
  if (!name && !email) return "";
  if (name && email) return `${name} (${email})`;
  return name || email;
};

// Like getPersonLabel, but returns the name only — never appends the email
// in parentheses. Used anywhere the email is already displayed separately
// (e.g. the History cards), so it isn't duplicated inside the name text.
const getPersonNameOnly = (person) => {
  if (!person) return "";
  if (typeof person === "string") return person;
  if (typeof person === "number") return String(person);
  return (
    person?.name ??
    person?.full_name ??
    person?.fullName ??
    person?.first_name ??
    person?.firstName ??
    person?.username ??
    person?.user_name ??
    ""
  );
};

// Formats a readable status label, e.g. "pending_review" -> "pending review".
const formatStatusLabel = (status) => {
  if (!status) return "";
  return String(status).replace(/_/g, " ");
};

// Formats a translation's language into a readable label, e.g. "urdu" -> "Urdu".
const getLanguageLabel = (item) => {
  const language =
    item?.language ?? item?.lang ?? item?.translation_language ?? "";
  if (!language) return "";
  const str = String(language);
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Given a translation record, resolves the "translator" person, trying every
// field name the backend might plausibly use across different endpoints
// (the history/timeline API and the question-detail API don't always name
// this the same way). Returns the raw object/string (or null), so callers
// can pass it straight into getPersonLabel or read individual fields off it.
const getTranslatorSource = (translation) => {
  if (!translation) return null;
  return (
    translation?.translator ??
    translation?.translator_user ??
    translation?.translatorUser ??
    translation?.reviewer ??
    translation?.reviewed_by ??
    translation?.reviewedBy ??
    translation?.translated_by ??
    translation?.translatedBy ??
    translation?.submitted_by ??
    translation?.submittedBy ??
    translation?.user ??
    translation?.author ??
    translation?.created_by ??
    translation?.createdBy ??
    null
  );
};

// Resolves a display name for a translator, falling back to flat
// translator_name / translator_email style fields on the translation
// record itself when there's no nested translator object at all.
const getTranslatorName = (translation) => {
  const translator = getTranslatorSource(translation);
  if (translator) {
    const label = getPersonLabel(translator);
    if (label && !/^\d+$/.test(label)) return label;
  }
  const flatName =
    translation?.translator_name ??
    translation?.translatorName ??
    translation?.translated_by_name ??
    translation?.reviewer_name ??
    "";
  return flatName || "";
};

const hasPersonContent = (person) =>
  Boolean(
    String(person?.name ?? "").trim() || String(person?.email ?? "").trim(),
  );

const getTranslatorEmail = (translation) => {
  const translator = getTranslatorSource(translation);
  const nestedEmail =
    typeof translator === "object" && translator
      ? (translator?.email ??
        translator?.email_address ??
        translator?.emailAddress ??
        "")
      : "";
  if (nestedEmail) return nestedEmail;
  return (
    translation?.translator_email ??
    translation?.translatorEmail ??
    translation?.translated_by_email ??
    translation?.reviewer_email ??
    ""
  );
};

// Resolves the "submitted at" timestamp for a translation, trying every
// plausible field name.
const getTranslationSubmittedAt = (translation) =>
  translation?.submitted_at ??
  translation?.submittedAt ??
  translation?.translated_at ??
  translation?.translatedAt ??
  translation?.updated_at ??
  translation?.updatedAt ??
  translation?.created_at ??
  translation?.createdAt ??
  translation?.date ??
  "";

// Builds the timeline card title. For translation events this prefixes the
// language, e.g. "Urdu translation rejected" / "Sindhi translation approved".
// For every other event it falls back to the raw event label.
const getTimelineTitle = (item) => {
  if (!item) return "Event";

  const rawEvent = item?.event ?? item?.type ?? "";
  const eventKey = String(rawEvent).toLowerCase().replace(/\s+/g, "_");
  const isTranslationEvent = eventKey.includes("translation");

  if (isTranslationEvent) {
    const language = getLanguageLabel(item);
    let action = "Translation Event";
    if (eventKey.includes("requested")) action = "Translation Requested";
    else if (eventKey.includes("submitted")) action = "Translation Submitted";
    else if (eventKey.includes("approved")) action = "Translation Approved";
    else if (eventKey.includes("rejected")) action = "Translation Rejected";
    else if (eventKey.includes("published")) action = "Translation Published";
    else if (eventKey.includes("removed")) action = "Translation Removed";

    if (language) return `${language} ${action}`;
  }

  if (rawEvent) {
    return String(rawEvent)
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  return "Event";
};

// Given a single timeline event item, works out which additional
// structured fields (if any) should be shown underneath it, based on the
// event type. Returns an array of { label, value, isReason } entries.
//
// `translations` is the full list of translation records for this question
// (question.translations). It's used as a fallback source for the rejection
// reason on translation-rejected events: some timeline payloads only carry
// the event/type/timestamp and don't inline the reason on the event itself,
// so if the event doesn't have it we look it up on the matching translation
// record by language.
const getTimelineExtraFields = (item, translations = [], question = null) => {
  if (!item) return [];

  const eventKey = String(item?.event ?? item?.type ?? item?.action ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  const actor = item?.actor ?? item?.user ?? item?.actor_user ?? null;

  const isTranslationEvent = eventKey.includes("translation");
  const fields = [];

  // ─── Question created ───────────────────────────────────────────────
  if (eventKey.includes("created") && !isTranslationEvent) {
    const creator = getPersonLabel(
      item?.created_by ?? item?.creator ?? actor ?? item?.author,
    );
    const newStatus =
      item?.new_status ?? item?.status ?? item?.current_status ?? "";

    if (creator) fields.push({ label: "Created by", value: creator });
    if (newStatus)
      fields.push({
        label: "Current status",
        value: formatStatusLabel(newStatus),
        capitalize: true,
      });
    return fields;
  }

  // ─── Question updated ─────────────────────────────────────────────────
  if (eventKey.includes("updated") && !isTranslationEvent) {
    const updatedBy = getPersonLabel(item?.updated_by ?? actor ?? item?.user);
    if (updatedBy) fields.push({ label: "Updated by", value: updatedBy });
    return fields;
  }

  // ─── Question status changed (generic) ──────────────────────────────
  if (eventKey.includes("status_changed") && !isTranslationEvent) {
    const previousStatus = item?.previous_status ?? item?.old_status ?? "";
    const newStatus = item?.new_status ?? item?.status ?? "";
    const changedBy = getPersonLabel(item?.changed_by ?? actor ?? item?.user);

    if (previousStatus || newStatus) {
      fields.push({
        label: "Status changed",
        value: (
          <span className="inline-flex items-center gap-1.5 capitalize">
            {formatStatusLabel(previousStatus) || "--"}
            <ArrowRight size={12} className="text-slate-400" />
            {formatStatusLabel(newStatus) || "--"}
          </span>
        ),
      });
    }
    if (changedBy) fields.push({ label: "Changed by", value: changedBy });
    return fields;
  }

  // ─── Question approved ───────────────────────────────────────────────
  if (eventKey.includes("approved") && !isTranslationEvent) {
    const approvedBy = getPersonLabel(
      item?.approved_by ?? item?.reviewer ?? item?.reviewed_by ?? actor,
    );
    if (approvedBy) fields.push({ label: "Approved by", value: approvedBy });
    return fields;
  }

  // ─── Question rejected ────────────────────────────────────────────────
  if (eventKey.includes("rejected") && !isTranslationEvent) {
    let reason =
      item?.reason ?? item?.rejection_reason ?? item?.rejection_comment ?? "";

    // Fallback: some timeline payloads don't inline the reason on the
    // event itself — only the question record carries it (question.status
    // === "rejected" cases where the rejection_reason lives on the
    // question, not on this particular timeline entry).
    if (!reason) {
      reason =
        question?.rejectionReason ??
        question?.rejection_reason ??
        question?.reviewNote ??
        "";
    }

    const rejectedBy = getPersonLabel(
      item?.rejected_by ?? item?.reviewer ?? item?.reviewed_by ?? actor,
    );
    if (reason) fields.push({ label: "Reason", value: reason, isReason: true });
    if (rejectedBy) fields.push({ label: "Rejected by", value: rejectedBy });
    return fields;
  }

  // ─── Translation requested ───────────────────────────────────────────
  if (isTranslationEvent && eventKey.includes("requested")) {
    const requestedBy = getPersonLabel(
      item?.requested_by ?? actor ?? item?.user,
    );
    if (requestedBy) fields.push({ label: "Requested by", value: requestedBy });
    return fields;
  }

  // ─── Translation approved ────────────────────────────────────────────
  if (isTranslationEvent && eventKey.includes("approved")) {
    const approvedBy = getPersonLabel(
      item?.approved_by ?? item?.reviewer ?? item?.reviewed_by ?? actor,
    );
    if (approvedBy) fields.push({ label: "Approved by", value: approvedBy });
    return fields;
  }

  // ─── Translation submitted ───────────────────────────────────────────
  if (isTranslationEvent && eventKey.includes("submitted")) {
    const submittedBy = getPersonLabel(
      item?.submitted_by ?? item?.translator ?? actor,
    );
    if (submittedBy) fields.push({ label: "Submitted by", value: submittedBy });
    return fields;
  }

  // ─── Translation rejected ────────────────────────────────────────────
  if (isTranslationEvent && eventKey.includes("rejected")) {
    const language = getLanguageLabel(item);

    let reason =
      item?.reason ??
      item?.rejection_reason ??
      item?.rejection_comment ??
      item?.rejectionReason ??
      item?.rejectionComment ??
      item?.comment ??
      item?.notes ??
      "";

    // Fallback: some timeline payloads don't inline the reason on the
    // event itself — only the translation record carries it. Look it up
    // by matching language + rejected status.
    if (!reason && language && Array.isArray(translations)) {
      const matchingTranslation = translations.find(
        (t) =>
          String(t?.language ?? "").toLowerCase() === language.toLowerCase() &&
          String(t?.status ?? "").toLowerCase() === "rejected",
      );
      reason =
        matchingTranslation?.rejection_comment ??
        matchingTranslation?.rejection_reason ??
        "";
    }

    const rejectedBy = getPersonLabel(
      item?.rejected_by ?? item?.reviewer ?? item?.reviewed_by ?? actor,
    );
    if (reason) fields.push({ label: "Reason", value: reason, isReason: true });
    if (rejectedBy) fields.push({ label: "Rejected by", value: rejectedBy });
    return fields;
  }

  // ─── Translation published ────────────────────────────────────────────
  if (isTranslationEvent && eventKey.includes("published")) {
    const publishedBy = getPersonLabel(
      item?.published_by ?? actor ?? item?.user,
    );
    if (publishedBy) fields.push({ label: "Published by", value: publishedBy });
    return fields;
  }
  if (isTranslationEvent && eventKey.includes("removed")) {
    const removedBy = getPersonLabel(item?.removed_by ?? actor ?? item?.user);
    if (removedBy) fields.push({ label: "Removed by", value: removedBy });
    return fields;
  }

  return fields;
};

const eventKeyOf = (item) =>
  String(item?.event ?? item?.type ?? item?.action ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_");

const actorOf = (item) => item?.actor ?? item?.user ?? item?.actor_user ?? null;

const isTranslationTimelineEvent = (item) =>
  eventKeyOf(item).includes("translation");

// Resolves a comparable timestamp for a timeline event. Falls back to
// -Infinity for missing/unparseable timestamps so such events never win
// against ones that do have a real timestamp.
const getTimelineEventTimestamp = (item) => {
  const raw =
    item?.timestamp ??
    item?.date ??
    item?.created_at ??
    item?.createdAt ??
    null;
  if (!raw) return -Infinity;
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? -Infinity : parsed;
};

// Finds the chronologically latest event matching `predicate`. Previously
// this just walked the array backwards and returned the last matching item
// in array order — which silently returned a stale/older event whenever
// timelineEvents wasn't guaranteed to already be sorted oldest-first (e.g.
// after merging question + translation events, or if the API order ever
// changes). Comparing actual timestamps makes this correct regardless of
// how the array is ordered. Ties (or events with no timestamp at all) break
// toward the later array position, matching prior behavior.
const findLatestTimelineEvent = (timelineEvents, predicate) => {
  if (!Array.isArray(timelineEvents)) return undefined;
  let latest;
  let latestTs = -Infinity;
  for (let index = 0; index < timelineEvents.length; index += 1) {
    const item = timelineEvents[index];
    if (!predicate(item, eventKeyOf(item))) continue;
    const ts = getTimelineEventTimestamp(item);
    if (!latest || ts >= latestTs) {
      latest = item;
      latestTs = ts;
    }
  }
  return latest;
};

const resolvePersonDetails = (
  person,
  fallbackEmail = "",
  { emptyWhenMissing = false } = {},
) => {
  const name =
    getPersonLabel(person) || (emptyWhenMissing ? "" : "Not Assigned");
  const email =
    (typeof person === "object" && person
      ? (person?.email ?? person?.email_address ?? person?.emailAddress ?? "")
      : "") ||
    fallbackEmail ||
    "";
  return { name, email };
};

// Same idea as resolvePersonDetails, but used only for the "Reviewed By"
// card: emptyWhenMissing forces true emptiness even if a person object was
// found (e.g. a reviewer from a stale prior review cycle while the
// question currently sits in draft/pending_review), and the name never has
// the email appended in parentheses since it's already shown separately.
const resolveReviewerDetails = (
  person,
  fallbackEmail = "",
  { emptyWhenMissing = false } = {},
) => {
  if (emptyWhenMissing) {
    return { name: "", email: "" };
  }
  const name = getPersonNameOnly(person) || "Not Assigned";
  const email =
    (typeof person === "object" && person
      ? (person?.email ?? person?.email_address ?? person?.emailAddress ?? "")
      : "") ||
    fallbackEmail ||
    "";
  return { name, email };
};

const hasTranslationHistoryContent = (translation, cardInfo) =>
  Boolean(cardInfo?.status);

// Mirrors getTimelineExtraFields for the "Created by" question event.
const getQuestionCreatedInfo = (
  timelineEvents = [],
  entryInfo = {},
  { emptyWhenMissing = false } = {},
) => {
  const createdEvent = findLatestTimelineEvent(
    timelineEvents,
    (item, key) => key.includes("created") && !isTranslationTimelineEvent(item),
  );
  const creator =
    createdEvent?.created_by ??
    createdEvent?.creator ??
    createdEvent?.author ??
    actorOf(createdEvent) ??
    entryInfo?.created_by;
  const details = resolvePersonDetails(creator, "", { emptyWhenMissing });
  return {
    ...details,
    date:
      createdEvent?.timestamp ??
      entryInfo?.created_at ??
      entryInfo?.createdAt ??
      "",
  };
};

// Mirrors getTimelineExtraFields for question approved/rejected events.
const getQuestionReviewedInfo = (
  timelineEvents = [],
  reviewInfo = {},
  question = {},
  { emptyWhenMissing = false } = {},
) => {
  const currentStatusForReview = String(
    question?.status ?? reviewInfo?.status ?? "",
  ).toLowerCase();
  const isPendingReview = ["draft", "pending_review"].includes(
    currentStatusForReview,
  );

  const reviewedEvent =
    findLatestTimelineEvent(
      timelineEvents,
      (item, key) =>
        !isTranslationTimelineEvent(item) &&
        (key.includes("approved") || key.includes("rejected")),
    ) ??
    (!isPendingReview
      ? findLatestTimelineEvent(
          timelineEvents,
          (item, key) =>
            !isTranslationTimelineEvent(item) && key.includes("status_changed"),
        )
      : undefined);

  const reviewer = reviewedEvent
    ? (reviewedEvent?.approved_by ??
      reviewedEvent?.rejected_by ??
      reviewedEvent?.reviewer ??
      reviewedEvent?.reviewed_by ??
      reviewedEvent?.changed_by ??
      actorOf(reviewedEvent))
    : isPendingReview
      ? null
      : (reviewInfo?.reviewed_by ?? question?.reviewed_by);

  const details = resolveReviewerDetails(reviewer, "", {
    emptyWhenMissing: emptyWhenMissing || isPendingReview,
  });

  // Trust question.status whenever it's already a terminal value
  // (approved/rejected). The timeline's "latest approved/rejected event"
  // can point at a stale or out-of-order entry — e.g. an older approval
  // sitting after a later rejection, or a leftover event from before a
  // resubmission/edit cycle — which previously let the status badge
  // disagree with question.status (and therefore with the reason
  // visibility guard in the render, which reads question.status directly).
  const currentQuestionStatus = String(question?.status ?? "").toLowerCase();
  const isQuestionTerminal = ["approved", "rejected"].includes(
    currentQuestionStatus,
  );

  const reason = isPendingReview
    ? ""
    : isQuestionTerminal && currentQuestionStatus === "approved"
      ? "" // approved questions never show a (possibly stale) rejection reason
      : (reviewedEvent?.reason ??
        reviewedEvent?.rejection_reason ??
        reviewedEvent?.rejection_comment ??
        reviewInfo?.rejection_reason ??
        question?.rejectionReason ??
        question?.rejection_reason ??
        question?.reviewNote ??
        "");

  return {
    ...details,
    // While the question sits in draft/pending_review, any approved/rejected
    // event found above belongs to a *previous* review cycle (e.g. it was
    // rejected once, sent back to draft, edited, and resubmitted). That old
    // event is history, not the current review outcome, so date stays blank
    // here rather than surfacing a stale timestamp.
    date: isPendingReview
      ? ""
      : (reviewedEvent?.timestamp ??
        reviewInfo?.reviewed_at ??
        reviewInfo?.updated_at ??
        question?.reviewed_at ??
        ""),
    // Status badge always reflects the question's actual current status —
    // for draft/pending_review this is just question.status itself (not
    // derived from any stale reviewedEvent), so the badge still shows
    // e.g. "pending review" even though there's no reviewer info yet.
    status: isQuestionTerminal
      ? question.status
      : isPendingReview
        ? question?.status || currentStatusForReview || ""
        : (reviewedEvent?.new_status ??
          reviewedEvent?.status ??
          reviewInfo?.status ??
          question?.status ??
          ""),
    reason,
  };
};

// Resolves submitted-by and reviewed-by for a translation history card,
// using the same event-based logic as the Timeline (getTimelineExtraFields).
const getTranslationCardInfo = (language, translation, timelineEvents = []) => {
  const normalizedLanguage = String(language ?? "").toLowerCase();

  const matchesTranslation = (item) => {
    if (
      translation?.id &&
      (item?.question_translation_id === translation.id ||
        item?.entity_id === translation.id)
    ) {
      return true;
    }
    const itemLanguage = String(
      item?.language ?? item?.lang ?? item?.translation_language ?? "",
    ).toLowerCase();
    return Boolean(itemLanguage) && itemLanguage === normalizedLanguage;
  };

  const findLatestTranslationEvent = (predicate) =>
    findLatestTimelineEvent(
      timelineEvents,
      (item, key) =>
        matchesTranslation(item) &&
        isTranslationTimelineEvent(item) &&
        predicate(key),
    );

  const submittedEvent = findLatestTranslationEvent((key) =>
    key.includes("submitted"),
  );
  const reviewedEvent = findLatestTranslationEvent(
    (key) => key.includes("approved") || key.includes("rejected"),
  );

  const submittedBySource =
    submittedEvent?.submitted_by ??
    submittedEvent?.translator ??
    actorOf(submittedEvent) ??
    translation?.translator ??
    translation?.submitted_by ??
    translation?.translated_by;

  const reviewedBySource =
    reviewedEvent?.approved_by ??
    reviewedEvent?.rejected_by ??
    reviewedEvent?.reviewer ??
    reviewedEvent?.reviewed_by ??
    actorOf(reviewedEvent) ??
    translation?.reviewer ??
    translation?.reviewed_by;

  const submittedBy = resolvePersonDetails(
    submittedBySource,
    getTranslatorEmail(translation),
    { emptyWhenMissing: true },
  );
  const isTranslationPendingReview =
    String(translation?.status ?? "").toLowerCase() === "pending_review";

  const reviewedBy = resolvePersonDetails(
    // While this translation is sitting in pending_review, nobody has
    // reviewed the current submission yet — any reviewedBySource found
    // above would belong to a prior review cycle (e.g. it was rejected
    // once, retranslated, and resubmitted). Treat it as if no reviewer
    // was found so the card reads empty instead of showing stale data.
    isTranslationPendingReview ? null : reviewedBySource,
    getTranslatorEmail(reviewedBySource),
    { emptyWhenMissing: true },
  );

  if (!submittedBy.name && translation) {
    const translatorName = getTranslatorName(translation);
    if (translatorName) {
      submittedBy.name = translatorName;
      if (!submittedBy.email)
        submittedBy.email = getTranslatorEmail(translation);
    }
  }

  const reason = isTranslationPendingReview
    ? ""
    : (reviewedEvent?.reason ??
      reviewedEvent?.rejection_reason ??
      reviewedEvent?.rejection_comment ??
      translation?.rejection_comment ??
      translation?.rejection_reason ??
      "");

  const status = translation?.status ? String(translation.status) : "";
  const latestDate =
    reviewedEvent?.timestamp ??
    submittedEvent?.timestamp ??
    translation?.reviewed_at ??
    getTranslationSubmittedAt(translation) ??
    "";

  return {
    submittedBy: {
      ...submittedBy,
      date: submittedEvent?.timestamp ?? getTranslationSubmittedAt(translation),
    },
    reviewedBy: {
      ...reviewedBy,
      date: isTranslationPendingReview
        ? ""
        : (reviewedEvent?.timestamp ??
          translation?.reviewed_at ??
          translation?.updated_at ??
          ""),
    },
    status,
    reason,
    date: latestDate,
  };
};

const getNativeQuestionText = (question, langKey) => {
  if (!question) return "";
  if (langKey === "ur") {
    return question?.questionTextUrdu ?? question?.question_text_urdu ?? "";
  }
  if (langKey === "sd") {
    return question?.questionTextSindhi ?? question?.question_text_sindhi ?? "";
  }
  return "";
};

const normalizeQuestionDetail = (payload) => {
  const dataRoot = payload?.data ?? payload ?? {};
  const data = dataRoot?.question ?? dataRoot ?? {};
  const options = Array.isArray(data.options) ? data.options : [];
  const components = Array.isArray(data.components) ? data.components : [];
  const rawType = String(
    data?.question_type ?? data?.questionType ?? "",
  ).toLowerCase();
  const questionType =
    rawType === "fill_blank"
      ? "text_input"
      : rawType === "check_box" || rawType === "checkbox"
        ? "check_box"
        : rawType === "mcq" || rawType === "multiple_choice"
          ? "mcq"
          : rawType === "image_annotation"
            ? "image_annotation"
            : rawType || "mcq";

  const normalizedComponents = components
    .map((component, index) => {
      if (!component) return null;
      const type = getFillBlankComponentType(component);
      const id = getFillBlankComponentId(component, index);
      if (type === FILL_BLANK_TYPES.STATEMENT) {
        const rawText =
          component?.text ?? component?.statement ?? component?.value ?? "";
        return { id, type, text: String(rawText ?? "").trim() };
      }
      if (type === FILL_BLANK_TYPES.BLANK) {
        const rawAnswer =
          component?.answer ?? component?.value ?? component?.text ?? "";
        return { id, type, answer: String(rawAnswer ?? "").trim() };
      }
      if (type === FILL_BLANK_TYPES.POWER) {
        return {
          id: component?.id ?? `cmp-${index}`,
          type,
          base: String(component?.base ?? component?.value?.base ?? "").trim(),
          exponent: String(
            component?.exponent ?? component?.value?.exponent ?? "",
          ).trim(),
        };
      }
      if (type === FILL_BLANK_TYPES.FRACTION) {
        return {
          id,
          type,
          numerator: String(
            component?.numerator ?? component?.value?.numerator ?? "",
          ).trim(),
          denominator: String(
            component?.denominator ?? component?.value?.denominator ?? "",
          ).trim(),
        };
      }
      if (type === FILL_BLANK_TYPES.MIXED_NUMBER) {
        return {
          id,
          type,
          whole: String(
            component?.whole ?? component?.value?.whole ?? "",
          ).trim(),
          numerator: String(
            component?.numerator ?? component?.value?.numerator ?? "",
          ).trim(),
          denominator: String(
            component?.denominator ?? component?.value?.denominator ?? "",
          ).trim(),
        };
      }
      return { id, type };
    })
    .filter(Boolean);

  const rawCorrect =
    data?.correct_answers && Array.isArray(data.correct_answers)
      ? data.correct_answers
      : data?.correct_answers
        ? [data.correct_answers]
        : [];

  const normalizedCorrectAnswers = rawCorrect
    .map((entry) => normalizeCorrectAnswerValue(entry))
    .map((answer) => String(answer ?? "").trim())
    .filter(Boolean);

  const blanksFromComponents = normalizedComponents
    .map((component) => {
      if (component.type === FILL_BLANK_TYPES.BLANK) return component.answer;
      if (component.type === FILL_BLANK_TYPES.POWER)
        return [component.base, component.exponent];
      if (component.type === FILL_BLANK_TYPES.FRACTION)
        return [component.numerator, component.denominator];
      if (component.type === FILL_BLANK_TYPES.MIXED_NUMBER)
        return [component.whole, component.numerator, component.denominator];
      return null;
    })
    .flat()
    .filter(Boolean);

  const correctAnswers = (
    normalizedCorrectAnswers.length
      ? normalizedCorrectAnswers
      : blanksFromComponents
  )
    .map((answer) => String(answer ?? "").trim())
    .filter(Boolean);

  let resolvedComponents = normalizedComponents;
  if (
    questionType === "text_input" &&
    !resolvedComponents.length &&
    correctAnswers.length
  ) {
    resolvedComponents = correctAnswers.map((answer, index) => ({
      id: `auto-blank-${index}`,
      type: "blank",
      value: answer,
    }));
  }

  const questionImages = Array.isArray(data?.question_image)
    ? data.question_image.filter(Boolean)
    : Array.isArray(data?.question_images)
      ? data.question_images.filter(Boolean)
      : data?.question_image
        ? [data.question_image]
        : data?.questionImage
          ? [data.questionImage]
          : [];

  const solutionStepsRaw = Array.isArray(data?.solution_steps)
    ? data.solution_steps
    : data?.solution_steps
      ? [data.solution_steps]
      : [];

  const solutionStepsUrduRaw = Array.isArray(data?.solution_steps_urdu)
    ? data.solution_steps_urdu
    : [];
  const solutionStepsSindhiRaw = Array.isArray(data?.solution_steps_sindhi)
    ? data.solution_steps_sindhi
    : [];

  const annotationImage =
    data?.annotation_image ??
    data?.annotationImage ??
    data?.annotation?.image ??
    "";
  const annotationFields = Array.isArray(data?.annotation_fields)
    ? data.annotation_fields
    : Array.isArray(data?.annotationFields)
      ? data.annotationFields
      : Array.isArray(data?.annotation_inputs)
        ? data.annotation_inputs
        : Array.isArray(data?.annotationInputs)
          ? data.annotationInputs
          : Array.isArray(data?.annotation?.fields)
            ? data.annotation.fields
            : [];

  const rawAlgebraFormats =
    data?.algebra_formats ??
    data?.answer_formats ??
    data?.algebraFormats ??
    data?.answerFormats ??
    data?.formats ??
    [];
  const algebraFormats = normalizeAlgebraFormats({
    rawFormats: rawAlgebraFormats,
    correctFormatKey:
      data?.correct_format ??
      data?.correctFormat ??
      data?.algebra_correct_format,
    correctAnswerValues: normalizedCorrectAnswers,
  });

  const questionSchema = data?.question_schema ?? data?.questionSchema ?? {};
  const rawDragDrop = data?.drag_drop ?? data?.dragDrop ?? questionSchema ?? {};
  const dragDropModeCandidate = String(
    data?.drag_drop_mode ??
      data?.dragDropMode ??
      questionSchema?.drag_drop_mode ??
      questionSchema?.dragDropMode ??
      rawDragDrop?.mode ??
      "",
  ).toLowerCase();
  const dragDropMode =
    dragDropModeCandidate === "diagram_labels" ? "diagram_labels" : "item_grid";

  const rawDragDropLabels =
    data?.drag_drop_labels ??
    data?.dragDropLabels ??
    questionSchema?.drag_drop_labels ??
    questionSchema?.dragDropLabels ??
    rawDragDrop?.labels ??
    [];
  const dragDropLabels = Array.isArray(rawDragDropLabels)
    ? rawDragDropLabels.map((label, index) => ({
        id: label?.id ?? label?.label_id ?? label?.labelId ?? `label-${index}`,
        text: label?.text ?? label?.label ?? label?.name ?? "",
        reusable: Boolean(
          label?.reusable ?? label?.is_reusable ?? label?.isReusable,
        ),
      }))
    : [];

  const rawDragDropItems =
    data?.drag_drop_items ??
    data?.dragDropItems ??
    questionSchema?.drag_drop_items ??
    questionSchema?.dragDropItems ??
    rawDragDrop?.items ??
    [];
  const dragDropItems = Array.isArray(rawDragDropItems)
    ? rawDragDropItems.map((item, index) => ({
        id: item?.id ?? item?.item_id ?? item?.itemId ?? `item-${index}`,
        image:
          item?.image?.url ?? item?.image ?? item?.image_url ?? item?.url ?? "",
        correct_label_id:
          item?.correct_label_id ??
          item?.correctLabelId ??
          item?.correct_label ??
          item?.correctLabel ??
          item?.correct_label_text ??
          item?.correctLabelText ??
          item?.correct_label_name ??
          item?.correctLabelName ??
          item?.label_id ??
          "",
      }))
    : [];

  const rawDragDropDiagram =
    data?.drag_drop_diagram ??
    data?.dragDropDiagram ??
    questionSchema?.drag_drop_diagram ??
    questionSchema?.dragDropDiagram ??
    rawDragDrop?.diagram ??
    {};
  const dragDropDiagramImage =
    rawDragDropDiagram?.image?.url ??
    rawDragDropDiagram?.image ??
    data?.drag_drop_diagram_image ??
    data?.dragDropDiagramImage ??
    questionSchema?.drag_drop_diagram_image ??
    questionSchema?.dragDropDiagramImage ??
    "";
  const rawDragDropBlanks =
    rawDragDropDiagram?.blanks ??
    rawDragDropDiagram?.positions ??
    data?.drag_drop_blanks ??
    data?.dragDropBlanks ??
    questionSchema?.drag_drop_blanks ??
    questionSchema?.dragDropBlanks ??
    rawDragDrop?.blanks ??
    [];
  const dragDropDiagramBlanks = Array.isArray(rawDragDropBlanks)
    ? rawDragDropBlanks.map((blank, index) => ({
        id: blank?.id ?? blank?.blank_id ?? blank?.blankId ?? `blank-${index}`,
        x: Number(blank?.x ?? blank?.left ?? 0),
        y: Number(blank?.y ?? blank?.top ?? 0),
        width: Number(blank?.width ?? blank?.blank_width ?? 140),
        height: Number(blank?.height ?? blank?.blank_height ?? 48),
        correct_label_id:
          blank?.correct_label_id ??
          blank?.correctLabelId ??
          blank?.correct_label ??
          blank?.correctLabel ??
          blank?.correct_label_text ??
          blank?.correctLabelText ??
          blank?.correct_label_name ??
          blank?.correctLabelName ??
          blank?.label_id ??
          "",
      }))
    : [];

  // Extract translations (both pending_review and approved)
  const translations = Array.isArray(data?.translations)
    ? data.translations
    : [];
  const reviewableTranslations = translations.filter(
    (t) => t?.status === "pending_review" || t?.status === "approved",
  );

  return {
    id:
      data?._id ??
      data?.id ??
      data?.question_id ??
      data?.question?.id ??
      data?.question?._id ??
      null,
    topic:
      data?.topic?.topic_name ??
      data?.topic_name ??
      data?.topic ??
      data?.topic?.name ??
      "Untitled Topic",
    grade_name: data?.topic?.unit?.subject?.grade?.name ?? "Untitled Grade",
    subject_name: data?.topic?.unit?.subject?.subject ?? "Untitled subject",
    unit_name: data?.topic?.unit?.unit_name ?? "Untitled Unit",
    questionType,
    questionText: data?.question_text ?? data?.questionText ?? "",
    questionTextUrdu: data?.question_text_urdu ?? data?.questionTextUrdu ?? "",
    questionTextSindhi:
      data?.question_text_sindhi ?? data?.questionTextSindhi ?? "",
    difficulty: data?.difficulty_level ?? data?.difficultyLevel ?? "",
    marks: data?.marks ?? "",
    createdAt: data?.created_at ?? data?.createdAt ?? "",
    correctAnswers,
    dragDropCorrectAnswers: rawCorrect,
    options: options.map((option, index) => ({
      id:
        option?.id ??
        option?.option_id ??
        option?.optionId ??
        option?.value ??
        `opt-${index}`,
      text: option?.text ?? option?.label ?? option?.value ?? "",
      textUrdu: option?.text_urdu ?? option?.textUrdu ?? "",
      textSindhi: option?.text_sindhi ?? option?.textSindhi ?? "",
      isImage:
        option?.is_image === true ||
        option?.is_image === "1" ||
        option?.is_image === 1 ||
        Boolean(option?.image) ||
        Boolean(option?.image_url),
      image: option?.image ?? option?.image_url ?? option?.imagePath ?? "",
    })),
    questionImages,
    blanks: resolvedComponents
      .filter((c) => c.type === "blank")
      .map((c) => c.value)
      .filter(Boolean),
    components: resolvedComponents,
    solutionSteps: solutionStepsRaw.map((step, idx) => ({
      id: step?.id ?? `solution-${idx}`,
      explanation: step?.explanation ?? step?.text ?? "",
      explanationUrdu: step?.explanation_urdu ?? step?.explanationUrdu ?? "",
      explanationSindhi:
        step?.explanation_sindhi ?? step?.explanationSindhi ?? "",
      images: Array.isArray(step?.images)
        ? step.images.filter(Boolean)
        : step?.images
          ? [step.images]
          : [],
    })),
    solutionStepsUrdu: solutionStepsUrduRaw.map((step, idx) => ({
      id: step?.id ?? `solution-ur-${idx}`,
      explanation: step?.explanation ?? step?.text ?? "",
      images: Array.isArray(step?.images)
        ? step.images.filter(Boolean)
        : step?.images
          ? [step.images]
          : [],
    })),
    solutionStepsSindhi: solutionStepsSindhiRaw.map((step, idx) => ({
      id: step?.id ?? `solution-sd-${idx}`,
      explanation: step?.explanation ?? step?.text ?? "",
      images: Array.isArray(step?.images)
        ? step.images.filter(Boolean)
        : step?.images
          ? [step.images]
          : [],
    })),
    status: data?.status ?? "",
    rejectionReason: data?.rejection_reason ?? "",
    rejection_reason: data?.rejection_reason ?? "",
    reviewNote:
      data?.rejection_reason ??
      data?.review_reason ??
      data?.review_notes ??
      data?.reviewer_comment ??
      data?.reviewer_note ??
      "",
    can_edit: data?.can_edit ?? data?.canEdit ?? false,
    pending_translations: reviewableTranslations,
    translations,
    annotationImage,
    annotationFields,
    algebraFormats,
    dragDropMode,
    dragDropLabels,
    dragDropItems,
    dragDropDiagram: {
      image: dragDropDiagramImage,
      blanks: dragDropDiagramBlanks,
    },
    created_by: data?.creator ?? data?.created_by,
    reviewed_by: data?.reviewer ?? data?.reviewed_by,
    reviewed_at: data?.reviewed_at,
  };
};

const isCorrectOption = (option, correctAnswers = []) => {
  const normalizedAnswers = correctAnswers.map((a) => String(a ?? "").trim());
  return [option.id, option.text, option.image]
    .map((v) => String(v ?? "").trim())
    .some((c) => c && normalizedAnswers.includes(c));
};

const LANGS = [
  { key: "en", label: "EN", full: "English", dir: "ltr" },
  { key: "ur", label: "اردو", full: "Urdu", dir: "rtl" },
  { key: "sd", label: "سنڌي", full: "Sindhi", dir: "rtl" },
];

const LanguageToggle = ({ activeLang, onChange }) => (
  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
    <Languages size={15} className="text-slate-400 ml-1 shrink-0" />
    {LANGS.map((lang) => (
      <button
        key={lang.key}
        onClick={() => onChange(lang.key)}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer ${
          activeLang === lang.key
            ? "bg-[#a51c30] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100"
        }`}
        title={lang.full}
      >
        {lang.label}
      </button>
    ))}
  </div>
);

// Shows the current review status as a top-right badge. Renders "Approved"
// (green) for approved items and "Pending" (amber) for anything still
// sitting in pending_review. Renders nothing for other statuses.
const ReviewStatusBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "approved") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
        <CheckCircle2 size={13} />
        Approved
      </span>
    );
  }

  if (normalized === "pending_review") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
        <Clock size={13} />
        Pending Review
      </span>
    );
  }

  return null;
};

// ─── Independent Translation Review Form Component ─────────────────────────

const TranslationReviewForm = ({
  translation,
  status,
  rejectionReason,
  isLoading,
  error,
  onStatusChange,
  onReasonChange,
  onSubmit,
}) => {
  const languageName =
    translation?.language?.charAt(0).toUpperCase() +
    translation?.language?.slice(1);

  const isActuallyApproved =
    String(translation?.status || "").toLowerCase() === "approved";

  return (
    <section
      className="question-section w-full relative overflow-hidden"
      style={
        isActuallyApproved
          ? {
              background: "#DCFCE6",
            }
          : undefined
      }
    >
      <header className="question-section-header">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 break-words">
            {languageName} Translation Review
          </h3>
          <ReviewStatusBadge status={translation?.status} />
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Approve or reject this translation. Rejection requires a short reason.
          {translation?.translator?.name
            ? ` Translator: ${translation.translator.name}.`
            : ""}
        </p>
      </header>

      {error && (
        <Alert variant="destructive" className="alert-custom mb-3 bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 cursor-pointer">
            <input
              type="radio"
              name={`translation-${translation.id}`}
              value="approved"
              checked={status === "approved"}
              onChange={() => onStatusChange("approved")}
              disabled={isLoading}
            />
            <span className="text-sm font-medium">Approve</span>
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 cursor-pointer">
            <input
              type="radio"
              name={`translation-${translation.id}`}
              value="rejected"
              checked={status === "rejected"}
              onChange={() => onStatusChange("rejected")}
              disabled={isLoading}
            />
            <span className="text-sm font-medium">Reject</span>
          </label>
        </div>

        {status === "rejected" && (
          <div className="form-group">
            <label>
              Rejection Reason <span>*</span>
            </label>
            <textarea
              className="form-input min-h-[120px]"
              value={rejectionReason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Share a brief reason to help the translator address the issue."
              disabled={isLoading}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="global-btn flex items-center gap-2"
            onClick={onSubmit}
            disabled={isLoading || !["approved", "rejected"].includes(status)}
          >
            {isLoading ? (
              <>
                Processing <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>Submit {languageName} Review</>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

// ─── QuestionDetail ──────────────────────────────────────────────────────────

const QuestionDetail = () => {
  const { id: paramsId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { role: authRole, user } = useAuthStore();
  const { state } = location;

  const fallbackStateQuestion = state?.question ?? null;
  const questionId = paramsId || state?.questionId || fallbackStateQuestion?.id;

  const [question, setQuestion] = React.useState(
    fallbackStateQuestion
      ? normalizeQuestionDetail(fallbackStateQuestion)
      : null,
  );
  const [history, setHistory] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [actionError, setActionError] = React.useState("");
  const [reviewStatus, setReviewStatus] = React.useState("");
  const [reviewNote, setReviewNote] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [showSolution, setShowSolution] = React.useState(false);

  // Request-translation checkboxes shown alongside the review decision
  const [requestUrduTranslation, setRequestUrduTranslation] =
    React.useState(false);
  const [requestSindhiTranslation, setRequestSindhiTranslation] =
    React.useState(false);

  // Independent translation review state
  const [urduStatus, setUrduStatus] = React.useState("");
  const [urduReason, setUrduReason] = React.useState("");
  const [urduLoading, setUrduLoading] = React.useState(false);
  const [urduError, setUrduError] = React.useState("");

  const [sindhiStatus, setSindhiStatus] = React.useState("");
  const [sindhiReason, setSindhiReason] = React.useState("");
  const [sindhiLoading, setSindhiLoading] = React.useState(false);
  const [sindhiError, setSindhiError] = React.useState("");

  const [activeLang, setActiveLang] = React.useState("en");

  const refreshQuestionData = React.useCallback(
    async ({ showLoader = false, silent = false } = {}) => {
      if (!questionId) return null;

      try {
        if (showLoader) setLoading(true);

        const [response, historyResponse] = await Promise.all([
          getQuestionById(questionId),
          getQuestionHistory(questionId),
        ]);

        const normalized = normalizeQuestionDetail(response);
        setQuestion(normalized);
        setHistory(historyResponse?.data ?? historyResponse ?? null);
        setError("");
        return normalized;
      } catch (err) {
        const message =
          err?.message || "Unable to load question details. Please try again.";
        setError(message);
        if (!silent) toast.error(message);
        return null;
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [questionId],
  );

  // Always fetch fresh data when opening/revisiting the detail page.
  // List navigation passes stale row data in location state, so we must
  // not skip the API call just because question is already populated.
  React.useEffect(() => {
    if (!questionId) return;
    refreshQuestionData({ showLoader: !fallbackStateQuestion, silent: true });
  }, [questionId, location.key, refreshQuestionData, fallbackStateQuestion]);

  const awaitingTranslationSubmission = React.useMemo(() => {
    const translations = Array.isArray(question?.translations)
      ? question.translations
      : [];

    return translations.some(
      (translation) =>
        String(translation?.status ?? "").toLowerCase() ===
        "pending_translation",
    );
  }, [question?.translations]);

  // Poll while a translator has not yet submitted their work.
  React.useEffect(() => {
    if (!questionId || !awaitingTranslationSubmission) return undefined;

    const pollForSubmittedTranslations = () => {
      refreshQuestionData({ silent: true });
    };

    const intervalId = window.setInterval(pollForSubmittedTranslations, 15000);
    return () => window.clearInterval(intervalId);
  }, [questionId, awaitingTranslationSubmission, refreshQuestionData]);

  // Refresh when the tab becomes visible again.
  React.useEffect(() => {
    if (!questionId) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshQuestionData({ silent: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [questionId, refreshQuestionData]);

  React.useEffect(() => {
    if (!question) return;
    const normalizedStatus = String(question.status || "").toLowerCase();
    if (["approved", "rejected"].includes(normalizedStatus)) {
      setReviewStatus((prev) => prev || normalizedStatus);
    }
    if (question.reviewNote) {
      if (["approved", "pending_review"].includes(normalizedStatus)) {
        setReviewNote("");
      } else {
        setReviewNote((prev) => prev || question.rejection_reason);
      }
    }
  }, [question]);

  // Initialize translation statuses.
  // The review radio only has "approved"/"rejected" values, so we can't
  // just copy the raw translation status (which may be "pending_review",
  // "pending_translation", etc.) straight into state — that would leave
  // neither radio checked. Instead we look at each language's *current*
  // status across ALL translations (not just the pending_review/approved
  // subset in pending_translations) and map it onto the two radio values:
  // "rejected" or "pending_translation" -> pre-check Reject, "approved" ->
  // pre-check Approve, anything else (fresh pending_review) -> leave unset.
  React.useEffect(() => {
    if (!question) return;

    const urduTranslation = question?.pending_translations?.find(
      (t) => t?.language?.toLowerCase() === "urdu",
    );
    const sindhiTranslation = question?.pending_translations?.find(
      (t) => t?.language?.toLowerCase() === "sindhi",
    );

    const allTranslations = Array.isArray(question?.translations)
      ? question.translations
      : [];

    const getCurrentStatus = (lang) => {
      const t = allTranslations.find(
        (tr) => tr?.language?.toLowerCase() === lang,
      );
      return t?.status ? String(t.status).toLowerCase() : "";
    };

    const resolveInitialStatus = (currentStatus) => {
      if (
        currentStatus === "rejected" ||
        currentStatus === "pending_translation"
      ) {
        return "rejected";
      }
      if (currentStatus === "approved") {
        return "approved";
      }
      return "";
    };

    if (urduTranslation) {
      setUrduStatus(resolveInitialStatus(getCurrentStatus("urdu")));
    }
    if (sindhiTranslation) {
      setSindhiStatus(resolveInitialStatus(getCurrentStatus("sindhi")));
    }
  }, [question?.pending_translations, question?.translations]);

  // Pre-check the "request translation" boxes when a translation is
  // already sitting in pending_translation OR rejected status for that
  // language. A rejected translation still needs to be re-requested, so
  // it should count as "pending" for the purposes of this checkbox too —
  // previously only pending_translation was checked here, so a rejected
  // translation left the box unchecked even though a re-request was
  // effectively still outstanding.
  React.useEffect(() => {
    if (!question) return;

    const allTranslations = Array.isArray(question?.translations)
      ? question.translations
      : Array.isArray(question?.pending_translations)
        ? question.pending_translations
        : [];

    const urduPending = allTranslations.some(
      (t) =>
        t?.language?.toLowerCase() === "urdu" &&
        ["pending_translation", "rejected"].includes(t?.status),
    );
    const sindhiPending = allTranslations.some(
      (t) =>
        t?.language?.toLowerCase() === "sindhi" &&
        ["pending_translation", "rejected"].includes(t?.status),
    );

    if (urduPending) setRequestUrduTranslation(true);
    if (sindhiPending) setRequestSindhiTranslation(true);
  }, [question?.translations, question?.pending_translations]);
  React.useEffect(() => {
    setShowSolution(false);
    setActiveLang("en");
  }, [question?.id]);

  const handleLangChange = React.useCallback(
    (langKey) => {
      if (!question || langKey === activeLang) return;
      setActiveLang(langKey);
    },
    [question, activeLang],
  );

  const displayedQuestion = React.useMemo(() => {
    if (!question) return null;
    if (activeLang === "en") return question;

    const nativeText = getNativeQuestionText(question, activeLang);
    const hasNative = hasRealContent(nativeText);

    if (!hasNative) return question;

    const langDir = LANGS.find((l) => l.key === activeLang)?.dir ?? "ltr";
    return {
      ...question,
      questionText: nativeText,
      _dir: langDir,
      _hasNative: true,
    };
  }, [question, activeLang]);

  const previewQuestion = React.useMemo(() => {
    if (!displayedQuestion) return null;

    const resolvedType =
      displayedQuestion.questionType === "text_input" &&
      displayedQuestion.components?.length
        ? "fill_blank"
        : displayedQuestion.questionType;

    const hasNative = displayedQuestion._hasNative === true;

    const options =
      Array.isArray(displayedQuestion.options) &&
      displayedQuestion.options.length
        ? displayedQuestion.options.map((option, index) => {
            let displayText = option?.text || "";
            if (hasNative && activeLang !== "en") {
              const nativeOptionText =
                activeLang === "ur"
                  ? (option?.textUrdu ?? "")
                  : activeLang === "sd"
                    ? (option?.textSindhi ?? "")
                    : "";
              if (hasRealContent(nativeOptionText)) {
                displayText = nativeOptionText;
              }
            }
            return {
              id: option?.id ?? `opt-${index}`,
              text: displayText,
              image: option?.image ?? "",
              is_image:
                option?.isImage === true ||
                option?.isImage === 1 ||
                option?.isImage === "1" ||
                option?.is_image === true,
            };
          })
        : [];

    const answer_type =
      options.some((opt) => opt.is_image) && resolvedType !== "text_input"
        ? "image"
        : "text";

    const components = (displayedQuestion.components || []).map(
      (component, idx) => {
        const type = getFillBlankComponentType(component);
        const id = getFillBlankComponentId(component, idx);
        if (type === FILL_BLANK_TYPES.STATEMENT)
          return { id, type, text: component?.text ?? component?.value ?? "" };
        if (type === FILL_BLANK_TYPES.BLANK)
          return {
            id,
            type,
            answer: component?.answer ?? component?.value ?? "",
          };
        if (type === FILL_BLANK_TYPES.POWER)
          return {
            id,
            type,
            base: component?.base ?? "",
            exponent: component?.exponent ?? "",
          };
        if (type === FILL_BLANK_TYPES.FRACTION)
          return {
            id,
            type,
            numerator: component?.numerator ?? "",
            denominator: component?.denominator ?? "",
          };
        if (type === FILL_BLANK_TYPES.MIXED_NUMBER)
          return {
            id,
            type,
            whole: component?.whole ?? "",
            numerator: component?.numerator ?? "",
            denominator: component?.denominator ?? "",
          };
        return { id, type };
      },
    );

    const algebraFormats = displayedQuestion.algebraFormats ?? [];
    const initialCorrect = displayedQuestion.correctAnswers?.length
      ? displayedQuestion.correctAnswers
      : (displayedQuestion.blanks ?? []);
    const normalizedCorrect = initialCorrect
      .map((a) => (a === null || a === undefined ? "" : String(a)))
      .filter(Boolean);
    const matchedOptionIds = options
      .filter((option) => isCorrectOption(option, normalizedCorrect))
      .map((option) => String(option.id));
    const correct_answers =
      resolvedType === "drag_drop"
        ? (displayedQuestion.dragDropCorrectAnswers ?? [])
        : resolvedType === "fill_blank" || resolvedType === "algebra"
          ? normalizedCorrect
          : Array.from(new Set([...normalizedCorrect, ...matchedOptionIds]));

    return {
      question_id: displayedQuestion.id ?? "question-preview",
      question_type: resolvedType,
      question_text: displayedQuestion.questionText ?? "",
      question_text_urdu: question?.questionTextUrdu ?? "",
      question_text_sindhi: question?.questionTextSindhi ?? "",
      _dir: displayedQuestion._dir ?? "ltr",
      algebra_statement:
        displayedQuestion.algebraStatement ??
        displayedQuestion.algebra_statement ??
        displayedQuestion.answer_statement ??
        "",
      options,
      answer_type,
      components,
      correct_answers,
      algebra_formats: algebraFormats,
      correct_format: displayedQuestion.correctFormat ?? null,
      images: displayedQuestion.questionImages ?? [],
      solution_steps: displayedQuestion.solutionSteps ?? [],
      annotation_image:
        displayedQuestion.annotationImage ?? displayedQuestion.annotation_image,
      annotation_fields:
        displayedQuestion.annotationFields ??
        displayedQuestion.annotation_fields,
      drag_drop_mode: displayedQuestion.dragDropMode,
      drag_drop_labels: displayedQuestion.dragDropLabels,
      drag_drop_items: displayedQuestion.dragDropItems,
      drag_drop_diagram: displayedQuestion.dragDropDiagram,
    };
  }, [displayedQuestion, activeLang]);

  const previewSelection = React.useMemo(() => {
    if (!previewQuestion) return { value: null, list: [], components: {} };

    const {
      question_type,
      correct_answers = [],
      components = [],
      options = [],
    } = previewQuestion;
    const normalizedCorrect = correct_answers.map((answer) =>
      answer === null || answer === undefined
        ? ""
        : String(normalizeCorrectAnswerValue(answer)),
    );
    const matchedOptionIds = options
      .filter((option) => isCorrectOption(option, normalizedCorrect))
      .map((option) => option.id);

    if (question_type === "check_box")
      return {
        value: null,
        list: matchedOptionIds.length ? matchedOptionIds : normalizedCorrect,
        components: {},
      };
    if (question_type === "mcq") {
      const matchedId =
        matchedOptionIds[0] ??
        options.find((opt) =>
          normalizedCorrect.includes(
            String(opt.text ?? opt.image ?? opt.id ?? ""),
          ),
        )?.id ??
        null;
      return {
        value: matchedId ?? normalizedCorrect[0] ?? null,
        list: [],
        components: {},
      };
    }
    if (question_type === "fill_blank") {
      const componentAnswers = components
        .map((component) => {
          if (!component) return null;
          if (component.type === FILL_BLANK_TYPES.BLANK)
            return component.answer ?? "";
          if (component.type === FILL_BLANK_TYPES.POWER)
            return [component.base ?? "", component.exponent ?? ""];
          if (component.type === FILL_BLANK_TYPES.FRACTION)
            return [component.numerator ?? "", component.denominator ?? ""];
          if (component.type === FILL_BLANK_TYPES.MIXED_NUMBER)
            return [
              component.whole ?? "",
              component.numerator ?? "",
              component.denominator ?? "",
            ];
          return null;
        })
        .flat()
        .filter((v) => v !== null && v !== undefined);
      const answersSource = normalizedCorrect.length
        ? normalizedCorrect
        : componentAnswers;
      const map = buildFillBlankStateFromAnswers(components, answersSource);
      const hasBlank = components.some(
        (c) =>
          c &&
          [
            FILL_BLANK_TYPES.BLANK,
            FILL_BLANK_TYPES.POWER,
            FILL_BLANK_TYPES.FRACTION,
            FILL_BLANK_TYPES.MIXED_NUMBER,
          ].includes(c.type),
      );
      return {
        value: hasBlank ? "" : (normalizedCorrect[0] ?? ""),
        list: [],
        components: map,
      };
    }
    if (question_type === "image_annotation") {
      const fields = Array.isArray(previewQuestion.annotation_fields)
        ? previewQuestion.annotation_fields
        : [];
      const map = {};
      fields.forEach((field, idx) => {
        map[field?.id ?? `annotation-${idx}`] =
          field?.correct_answer ??
          field?.answer ??
          normalizedCorrect[idx] ??
          "";
      });
      return { value: "", list: [], components: map };
    }
    if (question_type === "algebra")
      return { value: normalizedCorrect, list: [], components: {} };
    if (question_type === "drag_drop") {
      const targets = resolveDragDropTargets(previewQuestion);
      const map = {};
      targets.forEach((target) => {
        const targetId = target?.id ?? target?.target_id ?? target?.targetId;
        const correctLabel = target?.correct_label_id ??
          target?.correctLabelId ??
          target?.correct_label ??
          target?.correctLabel ?? [normalizedCorrect[0]];
        map[targetId] = Array.isArray(correctLabel)
          ? correctLabel
          : [correctLabel];
      });
      return { value: "", list: [], components: map };
    }
    return { value: null, list: [], components: {} };
  }, [previewQuestion]);

  const normalizedRole = normalizeRole(authRole ?? user?.role);
  const pathLower = location.pathname.toLowerCase();
  const isDataEntry =
    normalizedRole === "data_entry" || pathLower.startsWith("/data-entry");
  const isReviewer =
    normalizedRole === "reviewer" || pathLower.startsWith("/reviewer");
  const basePath = isDataEntry
    ? "/data-entry"
    : isReviewer
      ? "/reviewer"
      : "/admin";
  const timelineEvents = Array.isArray(history?.timeline)
    ? history.timeline
    : Array.isArray(history?.workflow_history)
      ? history.workflow_history
      : Array.isArray(question?.workflow_history)
        ? question.workflow_history
        : [];
  const entryInfo = history?.entry_info ?? {
    created_by: question?.created_by,
    created_at: question?.createdAt,
  };
  const reviewInfo = history?.review_info ?? {
    reviewed_by: question?.reviewed_by,
    reviewed_at: question?.reviewed_at,
    status: question?.status,
  };
  // When the question's current status is "approved", the rejection reason
  // (if any exists from an earlier rejection) is stale/irrelevant for the
  // history cards. It should still appear in the Timeline below, just not
  // on these summary cards.
  const isQuestionApproved =
    String(question?.status ?? "").toLowerCase() === "approved";
  const isQuestionPendingReview =
    String(question?.status ?? "").toLowerCase() === "pending_review";
  // Reviewed By should read empty for both draft and pending_review — the
  // question hasn't been reviewed yet in either state.
  const isQuestionDraftOrPendingReview = ["draft", "pending_review"].includes(
    String(question?.status ?? "").toLowerCase(),
  );

  const hasNativeForLang =
    activeLang !== "en" && displayedQuestion?._hasNative === true;
  const isRtlLang =
    hasNativeForLang && (activeLang === "ur" || activeLang === "sd");

  const hasSolutionContent = React.useMemo(() => {
    const steps = previewQuestion?.solution_steps ?? [];
    return steps.some((step) => {
      if (!step) return false;
      if (hasRealContent(step.explanation ?? step.text ?? "")) return true;
      if (!Array.isArray(step.images)) return false;
      return step.images.some((image) => {
        const value = image?.url ?? image?.image ?? image;
        return typeof value === "string" ? value.trim() !== "" : Boolean(value);
      });
    });
  }, [previewQuestion?.solution_steps]);

  const canReviewerEdit = isReviewer && question?.can_edit === true;
  const shouldShowEditButton = canReviewerEdit || !isReviewer;

  // Get translations
  const urduTranslation = question?.pending_translations?.find(
    (t) => t?.language?.toLowerCase() === "urdu",
  );
  const sindhiTranslation = question?.pending_translations?.find(
    (t) => t?.language?.toLowerCase() === "sindhi",
  );

  // Get the raw, current status for each language from *all* translations
  // (not just the pending_review/approved subset), so we can also detect
  // "pending_translation" and "rejected" states for the review payload logic.
  const getTranslationStatus = React.useCallback(
    (lang) => {
      const all = Array.isArray(question?.translations)
        ? question.translations
        : [];
      const t = all.find((tr) => tr?.language?.toLowerCase() === lang);
      return t?.status ? String(t.status).toLowerCase() : "";
    },
    [question?.translations],
  );

  const urduTranslationCurrentStatus = getTranslationStatus("urdu");
  const sindhiTranslationCurrentStatus = getTranslationStatus("sindhi");
  const isUrduTranslationApproved = urduTranslationCurrentStatus === "approved";
  const isSindhiTranslationApproved =
    sindhiTranslationCurrentStatus === "approved";
  const isUrduTranslationPendingReview =
    urduTranslationCurrentStatus === "pending_review";
  const isSindhiTranslationPendingReview =
    sindhiTranslationCurrentStatus === "pending_review";
  // Hide the "request translation" checkbox whenever that language's
  // translation is already approved OR sitting in pending_review — in both
  // cases there's nothing more to "request".
  const hideUrduRequestCheckbox =
    isUrduTranslationApproved || isUrduTranslationPendingReview;
  const hideSindhiRequestCheckbox =
    isSindhiTranslationApproved || isSindhiTranslationPendingReview;

  const translationHistoryEntries = React.useMemo(() => {
    const allTranslations = Array.isArray(question?.translations)
      ? question.translations
      : Array.isArray(question?.pending_translations)
        ? question.pending_translations
        : [];

    return ["urdu", "sindhi"].map((language) => {
      const translation = allTranslations.find(
        (entry) => String(entry?.language ?? "").toLowerCase() === language,
      );
      return { language, translation: translation ?? null };
    });
  }, [question?.translations, question?.pending_translations]);

  const questionCreatedInfo = React.useMemo(
    () =>
      getQuestionCreatedInfo(timelineEvents, entryInfo, {
        emptyWhenMissing: isQuestionPendingReview,
      }),
    [timelineEvents, entryInfo, isQuestionPendingReview],
  );

  const questionReviewedInfo = React.useMemo(
    () =>
      getQuestionReviewedInfo(timelineEvents, reviewInfo, question, {
        emptyWhenMissing: isQuestionDraftOrPendingReview,
      }),
    [timelineEvents, reviewInfo, question, isQuestionDraftOrPendingReview],
  );

  const handleSubmitReview = async () => {
    if (!questionId) {
      toast.error("Question id is missing.");
      return;
    }
    const normalizedStatus =
      reviewStatus === "rejected"
        ? "rejected"
        : reviewStatus === "approved"
          ? "approved"
          : "";
    if (!normalizedStatus) {
      const m = "Select approve or reject before submitting.";
      setActionError(m);
      toast.error(m);
      return;
    }
    if (normalizedStatus === "rejected" && !reviewNote.trim()) {
      const m = "Please add a short reason before rejecting.";
      setActionError(m);
      toast.error(m);
      return;
    }
    try {
      setActionError("");
      setActionLoading(true);
      const payload = { status: normalizedStatus };
      const trimmedNote = reviewNote.trim();
      if (trimmedNote) payload.rejection_reason = trimmedNote;

      // ─── Urdu translation flag ─────────────────────────────────────
      // If the Urdu translation is already approved, or is currently
      // pending_review, never send this flag at all (neither true nor
      // false) — there's no checkbox for the user to have set in that case.
      if (isUrduTranslationApproved || isUrduTranslationPendingReview) {
        // no-op: omit the field entirely
      } else if (normalizedStatus === "rejected") {
        // Question is being rejected: if there's a translation sitting in
        // pending_translation or rejected, explicitly reset the flag to false.
        if (
          ["pending_translation", "rejected"].includes(
            urduTranslationCurrentStatus,
          )
        ) {
          payload.pending_for_urdu_translation = false;
        }
      } else {
        // Question is being approved: reflect the checkbox exactly as it is,
        // so unchecking a previously-checked box sends false (not omitted).
        payload.pending_for_urdu_translation = requestUrduTranslation;
      }

      // ─── Sindhi translation flag ────────────────────────────────────
      // Same rule: omit entirely if already approved or pending_review.
      if (isSindhiTranslationApproved || isSindhiTranslationPendingReview) {
        // no-op: omit the field entirely
      } else if (normalizedStatus === "rejected") {
        if (
          ["pending_translation", "rejected"].includes(
            sindhiTranslationCurrentStatus,
          )
        ) {
          payload.pending_for_sindhi_translation = false;
        }
      } else {
        payload.pending_for_sindhi_translation = requestSindhiTranslation;
      }

      await updateQuestionStatus(questionId, payload);
      toast.success(
        normalizedStatus === "approved"
          ? "Question approved successfully."
          : "Question rejected successfully.",
      );
      setQuestion(
        (prev) =>
          prev && {
            ...prev,
            status: normalizedStatus,
            reviewNote: trimmedNote,
            rejectionReason:
              normalizedStatus === "rejected"
                ? trimmedNote
                : (prev?.rejectionReason ?? prev?.rejection_reason ?? ""),
            rejection_reason:
              normalizedStatus === "rejected"
                ? trimmedNote
                : (prev?.rejection_reason ?? prev?.rejectionReason ?? ""),
          },
      );
      setRequestUrduTranslation(false);
      setRequestSindhiTranslation(false);
      navigate("/reviewer/question-lists");
    } catch (err) {
      const message =
        err?.message || "Unable to update review status. Please try again.";
      setActionError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Urdu translation review
  const handleSubmitUrduReview = async () => {
    if (!urduTranslation?.id) {
      toast.error("Urdu translation ID is missing.");
      return;
    }

    if (!urduStatus) {
      setUrduError("Please select approve or reject.");
      toast.error("Please select approve or reject.");
      return;
    }

    if (urduStatus === "rejected" && !urduReason.trim()) {
      setUrduError("Rejection reason is required.");
      toast.error("Rejection reason is required.");
      return;
    }

    try {
      setUrduError("");
      setUrduLoading(true);
      const payload = { status: urduStatus };
      if (urduStatus === "rejected" && urduReason.trim()) {
        payload.rejection_comment = urduReason;
      }

      await reviewQuestionTranslation(urduTranslation.id, payload);
      toast.success("Urdu translation review submitted successfully.");

      await refreshQuestionData({ silent: true });

      // Reset state
      setUrduStatus("");
      setUrduReason("");
    } catch (err) {
      const message =
        err?.message || "Unable to submit Urdu translation review.";
      setUrduError(message);
      toast.error(message);
    } finally {
      setUrduLoading(false);
    }
  };

  // Handle Sindhi translation review
  const handleSubmitSindhiReview = async () => {
    if (!sindhiTranslation?.id) {
      toast.error("Sindhi translation ID is missing.");
      return;
    }

    if (!sindhiStatus) {
      setSindhiError("Please select approve or reject.");
      toast.error("Please select approve or reject.");
      return;
    }

    if (sindhiStatus === "rejected" && !sindhiReason.trim()) {
      setSindhiError("Rejection reason is required.");
      toast.error("Rejection reason is required.");
      return;
    }

    try {
      setSindhiError("");
      setSindhiLoading(true);
      const payload = { status: sindhiStatus };
      if (sindhiStatus === "rejected" && sindhiReason.trim()) {
        payload.rejection_comment = sindhiReason;
      }

      await reviewQuestionTranslation(sindhiTranslation.id, payload);
      toast.success("Sindhi translation review submitted successfully.");

      await refreshQuestionData({ silent: true });

      // Reset state
      setSindhiStatus("");
      setSindhiReason("");
    } catch (err) {
      const message =
        err?.message || "Unable to submit Sindhi translation review.";
      setSindhiError(message);
      toast.error(message);
    } finally {
      setSindhiLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>
            {isDataEntry
              ? "Data Entry Dashboard"
              : isReviewer
                ? "Reviewer Dashboard"
                : "Admin Dashboard"}
          </h4>
          <h1>Question Preview</h1>
        </div>
        <div className="dh-right flex items-center gap-3">
          <Link
            to={`${basePath}/question-lists`}
            className="global-btn secondary flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          {shouldShowEditButton && (
            <Link
              to={`/admin/add-new-question/${questionId}`}
              className="global-btn"
            >
              Edit Question <Edit size={16} />
            </Link>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="alert-custom bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {loading || !question ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
        </div>
      ) : (
        <>
          <div className="dashboard-body dashboard-body-card">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <LanguageToggle
                activeLang={activeLang}
                onChange={handleLangChange}
              />
            </div>

            <div className="flex flex-wrap gap-2 text-sm mb-6">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                Grade: {question?.grade_name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                Subject: {question?.subject_name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                Unit: {question?.unit_name}
              </span>
              {question.topic ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  Topic: {question.topic}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                Type:{" "}
                {question.questionType === "mcq"
                  ? "Multiple Choice (Single Answer)"
                  : question.questionType === "check_box"
                    ? "Multiple Choice (Multiple Answers)"
                    : question.questionType === "image_annotation"
                      ? "Image Annotation"
                      : question.questionType === "algebra"
                        ? "Algebra"
                        : "Text Input"}
              </span>
              {question.status ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 capitalize">
                  Status: {question.status.replace(/_/g, " ")}
                </span>
              ) : null}
              {question.difficulty ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                  Difficulty: {question.difficulty}
                </span>
              ) : null}
              {question.marks ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-green-700">
                  Marks: {question.marks}
                </span>
              ) : null}
            </div>

            <section className="w-full">
              {!previewQuestion ? (
                <p className="text-sm text-slate-500">
                  No question data available.
                </p>
              ) : (
                <div
                  className={`question-area admin-question-preview ${
                    isRtlLang
                      ? activeLang === "ur"
                        ? "font-nastaleeq"
                        : "font-lateefi"
                      : ""
                  }`}
                  dir={previewQuestion._dir ?? "ltr"}
                >
                  <div className="question-body-main mx-auto w-full md:w-[60%] space-y-4">
                    <QuestionContent
                      question={previewQuestion}
                      selectedLanguage={activeLang}
                    />

                    <AnswerOptions
                      question={previewQuestion}
                      value={
                        previewQuestion.question_type === "check_box"
                          ? previewSelection.list
                          : previewSelection.value
                      }
                      onChange={() => {}}
                      componentsState={previewSelection.components}
                      onChangeComponent={() => {}}
                      evaluationStatus="correct"
                      disableSelection
                      disableInputs
                      selectedLanguage={activeLang}
                    />

                    {previewQuestion.question_type === "fill_blank" &&
                      (previewQuestion.components || []).length > 0 && (
                        <p
                          className="text-sm text-slate-600"
                          style={{ direction: "ltr" }}
                        >
                          Correct answers are filled into the blanks.
                        </p>
                      )}
                    {previewQuestion.question_type === "fill_blank" &&
                      !(previewQuestion.components || []).length &&
                      previewSelection.value && (
                        <p className="text-sm text-slate-600">
                          Correct answer:{" "}
                          <span className="font-semibold">
                            {previewSelection.value}
                          </span>
                        </p>
                      )}
                    {previewQuestion.question_type === "text_input" &&
                      previewSelection.value && (
                        <p className="text-sm text-slate-600">
                          Correct answer:
                          <span className="font-semibold">
                            {previewSelection.value}
                          </span>
                        </p>
                      )}
                    {(previewQuestion.question_type === "mcq" ||
                      previewQuestion.question_type === "check_box") &&
                      !previewQuestion.options?.length && (
                        <p className="text-sm text-slate-500">
                          No options provided.
                        </p>
                      )}
                    {previewQuestion.question_type === "check_box" &&
                      previewSelection.list?.length > 1 && (
                        <p className="text-sm text-slate-600">
                          All correct options are preselected.
                        </p>
                      )}
                    <div className="flex flex-col gap-3">
                      <div
                        className={`flex ${isRtlLang ? "justify-start" : "justify-end"} `}
                      >
                        <button
                          type="button"
                          className="px-4 py-2 rounded-md cursor-pointer !font-sans text-indigo-500 underline"
                          onClick={() => setShowSolution((prev) => !prev)}
                        >
                          {showSolution ? "Hide Solution" : "Show Solution"}
                        </button>
                      </div>
                      <SolutionSteps
                        steps={previewQuestion.solution_steps}
                        stepsUrdu={displayedQuestion?.solutionStepsUrdu ?? []}
                        stepsSindhi={
                          displayedQuestion?.solutionStepsSindhi ?? []
                        }
                        show={showSolution}
                        selectedLanguage={activeLang}
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Main Question Review Section */}
          {isReviewer && (
            <div className="dashboard-body dashboard-body-card dashboard-body-card-reviewer">
              <section
                className="question-section w-full relative overflow-hidden"
                style={
                  isQuestionApproved
                    ? {
                        background: "#DCFCE6",
                      }
                    : undefined
                }
              >
                <header className="question-section-header">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words">Review Decision</h3>
                    <ReviewStatusBadge status={question?.status} />
                  </div>
                  <p className="text-sm text-slate-500 mb-3">
                    Approve or reject this question. Rejection requires a short
                    reason.
                  </p>
                </header>
                {actionError && (
                  <Alert
                    variant="destructive"
                    className="alert-custom mb-3 bg-[#FDF7EC]"
                  >
                    <AlertCircleIcon size={18} />
                    <AlertTitle>{actionError}</AlertTitle>
                  </Alert>
                )}
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewStatus"
                        value="approved"
                        checked={reviewStatus === "approved"}
                        onChange={() => {
                          setReviewStatus("approved");
                          setActionError("");
                        }}
                        disabled={actionLoading}
                      />
                      <span className="text-sm font-medium">Approve</span>
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewStatus"
                        value="rejected"
                        checked={reviewStatus === "rejected"}
                        onChange={() => {
                          setReviewStatus("rejected");
                          setActionError("");
                        }}
                        disabled={actionLoading}
                      />
                      <span className="text-sm font-medium">Reject</span>
                    </label>
                  </div>
                  {reviewStatus === "rejected" && (
                    <div className="form-group">
                      <label>
                        Rejection Reason <span>*</span>
                      </label>
                      <textarea
                        className="form-input min-h-[120px]"
                        value={reviewNote}
                        onChange={(event) => {
                          setReviewNote(event.target.value);
                          setActionError("");
                        }}
                        placeholder="Share a brief reason to help the author address the issue."
                        disabled={actionLoading}
                      />
                    </div>
                  )}

                  {/* Request translations — shown when approving,
                      and hidden per-language once that language's
                      translation has already been approved or is sitting
                      in pending_review (nothing left to "request" then). */}
                  {reviewStatus === "approved" &&
                    !(hideUrduRequestCheckbox && hideSindhiRequestCheckbox) && (
                      <div className="pt-1">
                        <label className="text-sm font-medium text-slate-700 block mb-2">
                          Request Translations
                        </label>
                        <div className="flex flex-wrap gap-4">
                          {!hideUrduRequestCheckbox && (
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={requestUrduTranslation}
                                onChange={(e) =>
                                  setRequestUrduTranslation(e.target.checked)
                                }
                                disabled={actionLoading}
                              />
                              <span className="text-sm font-medium">
                                Request Urdu Translation
                              </span>
                            </label>
                          )}
                          {!hideSindhiRequestCheckbox && (
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={requestSindhiTranslation}
                                onChange={(e) =>
                                  setRequestSindhiTranslation(e.target.checked)
                                }
                                disabled={actionLoading}
                              />
                              <span className="text-sm font-medium">
                                Request Sindhi Translation
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="global-btn flex items-center gap-2"
                      onClick={handleSubmitReview}
                      disabled={
                        actionLoading ||
                        !["approved", "rejected"].includes(reviewStatus)
                      }
                    >
                      {actionLoading ? (
                        <>
                          Processing{" "}
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        <>Submit Review Decision</>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Independent Translation Review Forms */}
          {isReviewer && (urduTranslation || sindhiTranslation) && (
            <>
              {urduTranslation && (
                <div className="dashboard-body dashboard-body-card dashboard-body-card-reviewer">
                  <TranslationReviewForm
                    translation={urduTranslation}
                    status={urduStatus}
                    rejectionReason={urduReason}
                    isLoading={urduLoading}
                    error={urduError}
                    onStatusChange={setUrduStatus}
                    onReasonChange={setUrduReason}
                    onSubmit={handleSubmitUrduReview}
                  />
                </div>
              )}

              {sindhiTranslation && (
                <div className="dashboard-body dashboard-body-card dashboard-body-card-reviewer">
                  <TranslationReviewForm
                    translation={sindhiTranslation}
                    status={sindhiStatus}
                    rejectionReason={sindhiReason}
                    isLoading={sindhiLoading}
                    error={sindhiError}
                    onStatusChange={setSindhiStatus}
                    onReasonChange={setSindhiReason}
                    onSubmit={handleSubmitSindhiReview}
                  />
                </div>
              )}
            </>
          )}

          {history && (
            <div className="dashboard-body dashboard-body-card dashboard-body-card-reviewer">
              <section className="question-section w-full">
                <header className="question-section-header">
                  <h3>History</h3>
                  <p className="text-sm text-slate-500 mb-3">
                    Created and review activity for this question.
                  </p>
                </header>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                  <div className="rounded-[15px] border border-gray-200 bg-white p-3 sm:p-4 shadow-sm min-w-0">
                    <div className="text-xs uppercase text-slate-500 mb-1">
                      Created By
                    </div>
                    <div className="text-sm font-medium break-words">
                      {renderHistoryText(questionCreatedInfo.name)}
                    </div>
                    {questionCreatedInfo.email ? (
                      <div className="text-xs text-slate-500 break-words">
                        {questionCreatedInfo.email}
                      </div>
                    ) : null}
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                      {questionCreatedInfo.date ? (
                        formatDateTime(questionCreatedInfo.date)
                      ) : (
                        <HistoryEmptyValue />
                      )}
                    </div>
                  </div>
                  <div className="rounded-[15px] border border-gray-200 bg-white p-3 sm:p-4 shadow-sm min-w-0">
                    <div className="text-xs uppercase text-slate-500 mb-1">
                      Reviewed By
                    </div>
                    <div className="text-sm font-medium break-words">
                      {renderHistoryText(questionReviewedInfo.name)}
                    </div>
                    {questionReviewedInfo.email ? (
                      <div className="text-xs text-slate-500 break-words">
                        {questionReviewedInfo.email}
                      </div>
                    ) : null}
                    {!isQuestionApproved && questionReviewedInfo.reason ? (
                      <div className="text-sm text-slate-500 mt-2 break-words">
                        Reason: <strong>{questionReviewedInfo.reason}</strong>
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                        {questionReviewedInfo.date ? (
                          formatDateTime(questionReviewedInfo.date)
                        ) : (
                          <HistoryEmptyValue />
                        )}
                      </span>
                      {questionReviewedInfo.status ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] capitalize ${
                            String(
                              questionReviewedInfo.status,
                            ).toLowerCase() === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : String(
                                    questionReviewedInfo.status,
                                  ).toLowerCase() === "rejected"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {String(questionReviewedInfo.status).replace(
                            /_/g,
                            " ",
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {translationHistoryEntries.map(
                    ({ language, translation }) => {
                      const languageName =
                        language.charAt(0).toUpperCase() + language.slice(1);
                      const cardInfo = getTranslationCardInfo(
                        language,
                        translation,
                        timelineEvents,
                      );

                      if (
                        !hasTranslationHistoryContent(translation, cardInfo)
                      ) {
                        return null;
                      }

                      const statusLabel = cardInfo.status
                        ? cardInfo.status.replace(/_/g, " ")
                        : "";

                      return (
                        <div
                          key={language}
                          className="rounded-[15px] border border-gray-200 bg-white p-3 sm:p-4 shadow-sm min-w-0"
                        >
                          <div className="text-xs uppercase text-slate-500 mb-1">
                            {languageName} Translation
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <div className="text-xs font-medium text-slate-600">
                                Submitted by
                              </div>
                              <div className="font-medium break-words">
                                {renderLanguageHistoryText(
                                  cardInfo.submittedBy.name,
                                  statusLabel,
                                )}
                              </div>
                              {cardInfo.submittedBy.email &&
                              statusLabel !== "pending translation" ? (
                                <div className="text-xs text-slate-500 break-words">
                                  {cardInfo.submittedBy.email}
                                </div>
                              ) : null}
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-600">
                                Reviewed by
                              </div>
                              <div className="font-medium break-words">
                                {renderLanguageHistoryText(
                                  cardInfo.reviewedBy.name,
                                  statusLabel,
                                )}
                              </div>
                              {cardInfo.reviewedBy.email &&
                              statusLabel !== "pending translation" ? (
                                <div className="text-xs text-slate-500 break-words">
                                  {cardInfo.reviewedBy.email}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          {cardInfo.reason &&
                          statusLabel !== "pending translation" ? (
                            <div className="text-sm text-slate-500 mt-2 break-words">
                              Reason: <strong>{cardInfo.reason}</strong>
                            </div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                              {cardInfo.date &&
                              statusLabel !== "pending translation" ? (
                                formatDateTime(cardInfo.date)
                              ) : (
                                <HistoryEmptyValue />
                              )}
                            </span>
                            {statusLabel ? (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] capitalize ${
                                  statusLabel === "approved"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : statusLabel === "rejected"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {statusLabel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
                <div className="mt-4 !max-h-[400px] overflow-y-auto">
                  <h4 className="text-sm font-semibold mb-2">Timeline</h4>
                  {timelineEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No timeline available.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {timelineEvents.map((item, idx) => {
                        const extraFields = getTimelineExtraFields(
                          item,
                          question?.translations,
                          question,
                        );
                        return (
                          <li
                            key={`${item.event}-${idx}`}
                            className="rounded-[15px] border border-gray-200 bg-white p-3 shadow-sm min-w-0"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                                <span className="text-sm font-medium capitalize break-words">
                                  {getTimelineTitle(item)}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 shrink-0 whitespace-nowrap">
                                {formatDateTime(item.timestamp)}
                              </span>
                            </div>
                            {item.details ? (
                              <div className="text-xs text-slate-600 mt-1 break-words">
                                {item.details}
                              </div>
                            ) : null}
                            {extraFields.length > 0 ? (
                              <div className="mt-2 space-y-1 border-t border-dashed border-slate-200 pt-2">
                                {extraFields.map((field, fieldIdx) => (
                                  <div
                                    key={`${field.label}-${fieldIdx}`}
                                    className="text-xs text-slate-600 break-words"
                                  >
                                    <span className="font-medium text-slate-700">
                                      {field.label}:
                                    </span>{" "}
                                    <span
                                      className={
                                        field.isReason
                                          ? "text-rose-600 font-medium"
                                          : field.capitalize
                                            ? "capitalize"
                                            : ""
                                      }
                                    >
                                      {field.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default QuestionDetail;
