import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useBeforeUnload,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import PracticeShell from "@/components/layout/PracticeShell";
import QuestionContent from "@/components/questions/QuestionContent";
import AnswerOptions from "@/components/questions/AnswerOptions";
import QuizSummary from "@/components/questions/QuizSummary";
import masteryAssignmentBG from "@/assets/book-icons.png";
import {
  assessmentResult,
  startAssessment,
  submitAssessmentAnswer,
} from "@/api/assessmentApi";
import { emitStudentStatsRefresh } from "@/utils/studentStatsEvents";
import {
  buildFillBlankAnswersFromState,
  buildFillBlankStateFromAnswers,
  hasFillBlankResponse,
} from "@/utils/fillBlankComponents";
import {
  buildDragDropSelectedAnswer,
  normalizeDragDropSubmittedAnswer,
  resolveDragDropTargets,
} from "@/utils/dragDropQuestion";
import { CheckCheck, Loader2 } from "lucide-react";




const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const normalizeResultPayload = (res) =>
  res?.data?.assessment_result ?? res?.data?.result ?? res?.data ?? res ?? null;

const normalizeBooleanLike = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return null;
};

const resolveShowAttemptsToStudents = (...sources) => {
  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    const candidates = [
      source?.show_attempts_to_students,
      source?.showAttemptsToStudents,
      source?.assessment?.show_attempts_to_students,
      source?.assessment?.showAttemptsToStudents,
      source?.attempt?.show_attempts_to_students,
      source?.attempt?.showAttemptsToStudents,
      source?.assessment_status?.show_attempts_to_students,
      source?.assessment_status?.showAttemptsToStudents,
      source?.assessment_result?.show_attempts_to_students,
      source?.assessment_result?.showAttemptsToStudents,
      source?.result?.show_attempts_to_students,
      source?.result?.showAttemptsToStudents,
      source?.data?.show_attempts_to_students,
      source?.data?.showAttemptsToStudents,
      source?.data?.assessment?.show_attempts_to_students,
      source?.data?.assessment?.showAttemptsToStudents,
      source?.data?.attempt?.show_attempts_to_students,
      source?.data?.attempt?.showAttemptsToStudents,
      source?.data?.assessment_status?.show_attempts_to_students,
      source?.data?.assessment_status?.showAttemptsToStudents,
      source?.data?.assessment_result?.show_attempts_to_students,
      source?.data?.assessment_result?.showAttemptsToStudents,
      source?.data?.result?.show_attempts_to_students,
      source?.data?.result?.showAttemptsToStudents,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeBooleanLike(candidate);
      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return null;
};

const toTimestamp = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const resolveSessionStartTimestamp = (payload) => {
  const startedAtCandidate =
    payload?.assessment_status?.started_at ??
    payload?.assessment_status?.startedAt ??
    payload?.assessment?.attempt?.started_at ??
    payload?.assessment?.attempt?.startedAt ??
    payload?.assessment?.started_at ??
    payload?.assessment?.startedAt ??
    payload?.started_at ??
    payload?.startedAt;

  return toTimestamp(startedAtCandidate) ?? Date.now();
};

const EXIT_CONFIRM_MESSAGE =
  "Are you sure you want to exit? If you leave now, all your progress will be lost and you wont be able to reattempt this assignment.";
const ASSESSMENT_SESSION_STORAGE_PREFIX = "assessment_player_session_v1_";

const getAssessmentSessionStorageKey = (assessmentId) => {
  const normalizedId = String(assessmentId ?? "").trim();
  if (!normalizedId) {
    return "";
  }
  return `${ASSESSMENT_SESSION_STORAGE_PREFIX}${normalizedId}`;
};

const parseAssessmentSession = (rawValue) => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const startedAt = Number(parsed?.started_at ?? parsed?.startedAt);
    const durationSeconds = Number(
      parsed?.duration_seconds ?? parsed?.durationSeconds ?? 0,
    );
    const endsAt = Number(parsed?.ends_at ?? parsed?.endsAt ?? 0);
    const status = String(parsed?.status ?? "").trim().toLowerCase();
    const updatedAt = Number(parsed?.updated_at ?? parsed?.updatedAt ?? Date.now());

    return {
      startedAt: Number.isFinite(startedAt) && startedAt > 0 ? startedAt : null,
      durationSeconds:
        Number.isFinite(durationSeconds) && durationSeconds > 0
          ? durationSeconds
          : 0,
      endsAt: Number.isFinite(endsAt) && endsAt > 0 ? endsAt : null,
      status: status || "in_progress",
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
};

const resolveDurationSecondsFromAssessmentPayload = (payload) => {
  const candidates = [
    payload?.assessment?.duration_minutes,
    payload?.assessment?.durationMinutes,
    payload?.data?.assessment?.duration_minutes,
    payload?.data?.assessment?.durationMinutes,
    payload?.duration_minutes,
    payload?.durationMinutes,
  ];

  for (const candidate of candidates) {
    const minutes = Number(candidate);
    if (Number.isFinite(minutes) && minutes > 0) {
      return Math.floor(minutes * 60);
    }
  }

  return 0;
};

const AssessmentPlayer = () => {
  const { id, topicId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [componentAnswers, setComponentAnswers] = useState({});
  const [algebraFormatByQuestion, setAlgebraFormatByQuestion] = useState({});
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [skippedQuestions, setSkippedQuestions] = useState({});
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState("intro"); // intro | play | done
  const [timeLeft, setTimeLeft] = useState(null);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [dotWindowStart, setDotWindowStart] = useState(0);
  const [dotSlideDirection, setDotSlideDirection] = useState(null);
  const handleSubmitRef = useRef(null);
  const exitSubmissionInFlightRef = useRef(false);
  const submitOnExitRef = useRef(async () => {});
  const shouldBlockExitRef = useRef(false);
  const popstateBypassRef = useRef(false);
  const hasPushedExitStateRef = useRef(false);
  const beforeUnloadPromptArmedRef = useRef(false);
  const beforeUnloadResetTimerRef = useRef(null);

  const resolvedId = id ?? topicId;
  const sessionStorageKey = useMemo(
    () => getAssessmentSessionStorageKey(resolvedId),
    [resolvedId],
  );

  const readSharedSession = useCallback(() => {
    if (!sessionStorageKey || typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(sessionStorageKey);
    return parseAssessmentSession(raw);
  }, [sessionStorageKey]);

  const writeSharedSession = useCallback(
    (session) => {
      if (!sessionStorageKey || typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
    },
    [sessionStorageKey],
  );

  const markSharedSessionSubmitted = useCallback(() => {
    if (!sessionStorageKey || typeof window === "undefined") {
      return;
    }

    const existing = readSharedSession();
    const next = {
      ...(existing || {}),
      status: "submitted",
      updated_at: Date.now(),
    };
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(next));
  }, [readSharedSession, sessionStorageKey]);

  const startAssessmentSession = useCallback(
    async ({ playAfterLoad = false } = {}) => {
      if (!resolvedId && resolvedId !== 0) {
        return false;
      }

      try {
        setLoading(true);
        setError("");
        const res = await startAssessment(resolvedId);
        const normalized = res?.data ?? res ?? null;
        const responseStartTs = resolveSessionStartTimestamp(normalized);
        const responseDurationSeconds =
          resolveDurationSecondsFromAssessmentPayload(normalized);
        const existingSession = readSharedSession();
        const routeStateAssessment =
          location?.state?.assessment ?? location?.state?.selectedAssessment;
        const routeDurationMinutes = Number(
          routeStateAssessment?.duration_minutes ??
            routeStateAssessment?.durationMinutes ??
            0,
        );
        const now = Date.now();
        const existingStartedAt =
          Number.isFinite(existingSession?.startedAt) &&
          existingSession.startedAt > 0
            ? existingSession.startedAt
            : null;
        const existingDurationSeconds =
          Number.isFinite(existingSession?.durationSeconds) &&
          existingSession.durationSeconds > 0
            ? existingSession.durationSeconds
            : 0;
        const existingEndsAt =
          Number.isFinite(existingSession?.endsAt) && existingSession.endsAt > 0
            ? existingSession.endsAt
            : null;
        const isExistingStillActive =
          existingSession?.status === "in_progress" &&
          !!existingStartedAt &&
          (!existingEndsAt || existingEndsAt > now);

        const startCandidates = [responseStartTs];
        if (isExistingStillActive && existingStartedAt) {
          startCandidates.push(existingStartedAt);
        }
        const sharedStartedAt = Math.min(...startCandidates);
        const sharedDurationSeconds =
          existingDurationSeconds ||
          responseDurationSeconds ||
          (Number.isFinite(routeDurationMinutes) && routeDurationMinutes > 0
            ? Math.floor(routeDurationMinutes * 60)
            : 0) ||
          0;
        const sharedEndsAt =
          Number.isFinite(sharedDurationSeconds) && sharedDurationSeconds > 0
            ? sharedStartedAt + sharedDurationSeconds * 1000
            : null;

        writeSharedSession({
          started_at: sharedStartedAt,
          duration_seconds: sharedDurationSeconds,
          ends_at: sharedEndsAt,
          status: "in_progress",
          updated_at: Date.now(),
        });

        setData(normalized);
        setSessionStartedAt(sharedStartedAt);
        if (playAfterLoad) {
          setPhase("play");
        }
        return true;
      } catch (err) {
        setError(err?.message || "Failed to load data");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [location, readSharedSession, resolvedId, writeSharedSession],
  );

  useEffect(() => {
    setData(null);
    setLoading(false);
    setError("");
    setActiveIndex(0);
    setAnswers({});
    setComponentAnswers({});
    setAlgebraFormatByQuestion({});
    setAnsweredQuestions({});
    setSkippedQuestions({});
    setSubmission(null);
    setPhase("intro");
    setTimeLeft(null);
    setSessionStartedAt(null);
    setDotWindowStart(0);
    setDotSlideDirection(null);
  }, [resolvedId]);

  useEffect(() => {
    if (!sessionStorageKey || typeof window === "undefined") {
      return;
    }

    const syncSessionAcrossTabs = (event) => {
      if (event.key !== sessionStorageKey) {
        return;
      }

      const nextSession = parseAssessmentSession(event.newValue);
      if (
        !nextSession ||
        nextSession.status !== "in_progress" ||
        !nextSession.startedAt
      ) {
        return;
      }

      setSessionStartedAt((previous) => {
        if (!previous) {
          return nextSession.startedAt;
        }
        return Math.abs(previous - nextSession.startedAt) > 1000
          ? nextSession.startedAt
          : previous;
      });
    };

    window.addEventListener("storage", syncSessionAcrossTabs);
    return () => {
      window.removeEventListener("storage", syncSessionAcrossTabs);
    };
  }, [sessionStorageKey]);

  const selectedFromRouteState = useMemo(() => {
    const stateAssessment =
      location?.state?.assessment ?? location?.state?.selectedAssessment ?? null;

    if (!stateAssessment || typeof stateAssessment !== "object") {
      return null;
    }

    return {
      assessment_id:
        stateAssessment.assessment_id ?? stateAssessment.id ?? resolvedId,
      title: stateAssessment.title ?? stateAssessment.name ?? "Assessment",
      duration_minutes:
        stateAssessment.duration_minutes ?? stateAssessment.durationMinutes,
      submission_mode:
        stateAssessment.submission_mode ?? stateAssessment.submissionMode,
      submit_by: stateAssessment.submit_by ?? stateAssessment.submitBy,
      questions_count:
        stateAssessment.questions_count ??
        stateAssessment.total_questions ??
        stateAssessment.totalQuestions,
      can_attempt: stateAssessment.can_attempt,
    };
  }, [location?.state, resolvedId]);

  const selected = useMemo(
    () => data?.assessment ?? data?.data?.assessment ?? selectedFromRouteState,
    [data, selectedFromRouteState],
  );
  const assessmentStatus = selected?.assessment_status ?? selected?.attempt;

  const items = useMemo(
    () => (selected?.questions ? selected.questions : []),
    [selected],
  );
  const totalQuestions =
    items.length ||
    Number(selected?.total_questions ?? selected?.questions_count ?? 0);
  const question = items[activeIndex];
  const showAttemptsToStudents = useMemo(() => {
    const resolved = resolveShowAttemptsToStudents(submission, selected);
    return resolved === null ? true : resolved;
  }, [selected, submission]);
  const shouldHideResultFromStudent = phase === "done" && !showAttemptsToStudents;
  const shouldBlockExit = phase === "play" && !submission && !submitting;
  const getQuestionKey = useCallback(
    (currentQuestion) =>
      currentQuestion?.assessment_question_id ??
      currentQuestion?.question_id ??
      currentQuestion?.id,
    [],
  );

  const durationMinutes = Number(selected?.duration_minutes ?? 0);
  const durationSeconds =
    Number.isFinite(durationMinutes) && durationMinutes > 0
      ? Math.floor(durationMinutes * 60)
      : 0;

  const durationDeadlineTs = useMemo(() => {
    if (!sessionStartedAt || durationSeconds <= 0) return null;
    return sessionStartedAt + durationSeconds * 1000;
  }, [durationSeconds, sessionStartedAt]);

  const submitByTs = useMemo(() => {
    if (selected?.submission_mode !== "submit_by" || !selected?.submit_by) {
      return null;
    }
    const ts = new Date(selected.submit_by).getTime();
    return Number.isNaN(ts) ? null : ts;
  }, [selected?.submission_mode, selected?.submit_by]);

  const countdownDeadlineTs = useMemo(() => {
    const candidates = [durationDeadlineTs, submitByTs].filter(
      (value) => typeof value === "number" && value > 0,
    );

    if (!candidates.length) return null;
    return Math.min(...candidates);
  }, [durationDeadlineTs, submitByTs]);

  const deadlinePassed =
    !!countdownDeadlineTs && Date.now() >= countdownDeadlineTs && !submission;

  useEffect(() => {
    if (!submission) {
      return;
    }
    markSharedSessionSubmitted();
  }, [markSharedSessionSubmitted, submission]);

  const buildFallbackSubmission = useCallback(
    (statusData = {}) => {
      const showAttemptsFlag = resolveShowAttemptsToStudents(statusData, selected);
      const totalFromStatus =
        statusData.total_questions ??
        statusData.total_marks ??
        selected?.total_questions ??
        totalQuestions;
      const correctFromStatus =
        statusData.correct_answers ??
        statusData.correct ??
        statusData.score ??
        0;
      const wrongFromStatus =
        statusData.wrong_answers ??
        (totalFromStatus
          ? Math.max(totalFromStatus - correctFromStatus, 0)
          : 0);
      const percentageFromStatus =
        statusData.percentage !== undefined && statusData.percentage !== null
          ? statusData.percentage
          : totalFromStatus
            ? (correctFromStatus / totalFromStatus) * 100
            : 0;

      return {
        assessment_id: selected?.assessment_id ?? resolvedId,
        attempt_id: statusData.attempt_id,
        correct: correctFromStatus,
        wrong_answers: wrongFromStatus,
        total_questions: totalFromStatus,
        total_marks: statusData.total_marks ?? totalFromStatus,
        percentage: percentageFromStatus,
        status: statusData.status ?? "Attempted",
        completed_at: statusData.completed_at,
        submitted_at: statusData.submitted_at,
        ...(showAttemptsFlag === null
          ? {}
          : { show_attempts_to_students: showAttemptsFlag }),
      };
    },
    [
      resolvedId,
      selected,
      totalQuestions,
    ],
  );

  // Attempted handling
  useEffect(() => {
    if (!selected || submission) return;

    const params = new URLSearchParams(window.location.search);
    const attemptedParam = params.get("attempted") === "true";
    const alreadyAttempted =
      assessmentStatus?.attempted === true ||
      selected?.can_attempt === false ||
      attemptedParam;

    if (!alreadyAttempted) return;

    let isActive = true;

    const loadResult = async () => {
      try {
        const resultRes = await assessmentResult(resolvedId);
        const normalized = normalizeResultPayload(resultRes);
        const showAttemptsFlag = resolveShowAttemptsToStudents(
          normalized,
          resultRes,
          selected,
        );
        if (!isActive) return;

        if (normalized && typeof normalized === "object") {
          setSubmission({
            ...normalized,
            assessment_id:
              normalized.assessment_id ?? selected?.assessment_id ?? resolvedId,
            ...(showAttemptsFlag === null
              ? {}
              : { show_attempts_to_students: showAttemptsFlag }),
          });
        } else {
          setSubmission(buildFallbackSubmission(assessmentStatus || {}));
        }
        setPhase("done");
        setTimeLeft(null);
      } catch {
        if (!isActive) return;
        setSubmission(buildFallbackSubmission(assessmentStatus || {}));
        setPhase("done");
        setTimeLeft(null);
      }
    };

    loadResult();

    return () => {
      isActive = false;
    };
  }, [
    assessmentStatus,
    buildFallbackSubmission,
    resolvedId,
    selected,
    submission,
  ]);

  // Timer init
  useEffect(() => {
    if (!countdownDeadlineTs) {
      setTimeLeft(null);
      return;
    }
    const remaining = Math.max(
      0,
      Math.floor((countdownDeadlineTs - Date.now()) / 1000),
    );
    setTimeLeft(remaining);
  }, [countdownDeadlineTs]);

  // Timer countdown
  useEffect(() => {
    if (phase !== "play" || submission || timeLeft === null) {
      return;
    }

    if (timeLeft <= 0) {
      handleSubmitRef.current?.({ force: true });
      return;
    }

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((countdownDeadlineTs - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, submission, timeLeft, deadlinePassed, countdownDeadlineTs]);

  const sidebarTopics = useMemo(() => {
    const raw = Array.isArray(data?.assessments)
      ? data.assessments
      : selected
        ? [selected]
        : [];

    return raw.map((entry) => ({
      ...entry,
      topic_id: entry.assessment_id ?? entry.id,
      topic_name: entry.title ?? entry.name ?? "Assessment",
      total_questions: entry.total_questions ?? entry.questions_count ?? 0,
    }));
  }, [data?.assessments, selected]);

  const sidebarData = {
    topics: sidebarTopics,
    selectedTopicId: selected?.assessment_id ?? resolvedId,
    topicCount: sidebarTopics.length,
    subjectId: data?.subject_id,
    unitId: data?.unit_id,
  };

  const sidebarMeta = {
    gradeName: data?.grade_name,
    subjectName: data?.subject_name,
    unitName: data?.unit_name,
    selectedTopicName: selected?.title ?? "Assessment",
    unitCount: data?.total_units_count,
    subjectId: data?.subject_id,
  };

  const DOT_WINDOW_SIZE = 10;
  const totalDots = items.length;

  useEffect(() => {
    if (!totalDots) return;
    setDotWindowStart((prev) => {
      if (totalDots <= DOT_WINDOW_SIZE) return 0;
      const windowEnd = prev + DOT_WINDOW_SIZE - 1;
      if (activeIndex < prev) return activeIndex;
      if (activeIndex > windowEnd) {
        return Math.max(0, activeIndex - DOT_WINDOW_SIZE + 1);
      }
      return prev;
    });
  }, [activeIndex, totalDots]);

  useEffect(() => {
    if (!dotSlideDirection) return;
    const timer = setTimeout(() => setDotSlideDirection(null), 200);
    return () => clearTimeout(timer);
  }, [dotSlideDirection]);

  const normalizeSubmittedAnswer = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed || parsed === 0) return [parsed];
      } catch {
        if (value.trim() !== "") return [value];
      }
      return [];
    }
    if (value || value === 0) return [value];
    return [];
  };

  useEffect(() => {
    if (!items.length) return;
    if (Object.keys(answers).length || Object.keys(componentAnswers).length) {
      return;
    }

    const answersFromServer = {};
    const componentAnswersFromServer = {};
    const algebraFormatsFromServer = {};
    const answeredFromServer = {};

    items.forEach((q) => {
      const key = getQuestionKey(q);
      if (!key) return;

      const submitted = normalizeSubmittedAnswer(q.submitted_answer);
      if (submitted.length) {
        if (q.question_type === "check_box") {
          answersFromServer[key] = submitted;
        } else if (
          q.question_type === "fill_blank" &&
          Array.isArray(q.components) &&
          q.components.length
        ) {
          componentAnswersFromServer[key] = buildFillBlankStateFromAnswers(
            q.components,
            submitted,
          );
        } else if (q.question_type === "mcq") {
          answersFromServer[key] = submitted[0] ?? null;
        } else if (q.question_type === "algebra") {
          answersFromServer[key] = submitted;
        } else if (q.question_type === "image_annotation") {
          const fields = Array.isArray(q.annotation_fields)
            ? q.annotation_fields
            : [];
          const compMap = {};
          fields.forEach((field, fieldIdx) => {
            const fieldId = field?.id ?? `annotation-${fieldIdx}`;
            compMap[fieldId] =
              submitted[fieldIdx] !== undefined && submitted[fieldIdx] !== null
                ? submitted[fieldIdx]
                : "";
          });
          componentAnswersFromServer[key] = compMap;
        } else if (q.question_type === "drag_drop") {
          componentAnswersFromServer[key] = normalizeDragDropSubmittedAnswer(
            q,
            submitted,
          );
        } else {
          answersFromServer[key] = submitted[0] ?? "";
        }
      }

      if (q.question_type === "algebra") {
        const rawFormat =
          q.submitted_format ??
          q.selected_format ??
          q.answer_format ??
          q.submittedFormat ??
          q.selectedFormat ??
          q.answerFormat ??
          "";

        if (rawFormat) {
          algebraFormatsFromServer[key] = String(rawFormat)
            .trim()
            .toLowerCase();
        }
      }

      if (q.is_answered) {
        answeredFromServer[key] = true;
      }
    });

    if (Object.keys(answersFromServer).length) {
      setAnswers(answersFromServer);
    }
    if (Object.keys(componentAnswersFromServer).length) {
      setComponentAnswers(componentAnswersFromServer);
    }
    if (Object.keys(algebraFormatsFromServer).length) {
      setAlgebraFormatByQuestion(algebraFormatsFromServer);
    }
    if (Object.keys(answeredFromServer).length) {
      setAnsweredQuestions(answeredFromServer);
    }
  }, [answers, componentAnswers, getQuestionKey, items]);

  const getAlgebraFormatForQuestion = useCallback(
    (currentQuestion) => {
      if (!currentQuestion || currentQuestion.question_type !== "algebra") {
        return "";
      }

      const key = getQuestionKey(currentQuestion);
      const rawFormat =
        (key ? algebraFormatByQuestion[key] : "") ??
        currentQuestion?.submitted_format ??
        currentQuestion?.selected_format ??
        currentQuestion?.answer_format ??
        currentQuestion?.submittedFormat ??
        currentQuestion?.selectedFormat ??
        currentQuestion?.answerFormat ??
        "";

      return String(rawFormat || "")
        .trim()
        .toLowerCase();
    },
    [algebraFormatByQuestion, getQuestionKey],
  );

  const hasUserResponse = (currentQuestion) => {
    if (!currentQuestion) return false;

    const key = getQuestionKey(currentQuestion);
    if (!key) return false;

    if (currentQuestion.question_type === "check_box") {
      const val = answers[key];
      return Array.isArray(val) && val.length > 0;
    }

    if (currentQuestion.question_type === "mcq") {
      return answers[key] !== undefined && answers[key] !== null;
    }

    if (currentQuestion.question_type === "fill_blank") {
      if (currentQuestion.components?.length) {
        return hasFillBlankResponse(
          currentQuestion.components,
          componentAnswers[key] || {},
        );
      }
      const val = answers[key];
      return val !== undefined && val !== null && String(val).trim() !== "";
    }

    if (currentQuestion.question_type === "algebra") {
      const val = answers[key];
      if (!Array.isArray(val) || !val.length) return false;
      if (val.some((entry) => !String(entry ?? "").trim())) return false;
      return true;
    }

    if (currentQuestion.question_type === "image_annotation") {
      const fields = Array.isArray(currentQuestion.annotation_fields)
        ? currentQuestion.annotation_fields
        : [];
      const compMap = componentAnswers[key] || {};
      return fields.some((field, idx) => {
        const fieldId = field?.id ?? `annotation-${idx}`;
        const val = compMap[fieldId];
        return val !== undefined && val !== null && String(val).trim() !== "";
      });
    }

    if (currentQuestion.question_type === "drag_drop") {
      const targets = resolveDragDropTargets(currentQuestion);
      const compMap = componentAnswers[key] || {};
      return targets.some((target) => {
        const val = compMap[target.id];
        return val !== undefined && val !== null && String(val).trim() !== "";
      });
    }

    if (currentQuestion.question_type === "text_input") {
      const val = answers[key];
      return val !== undefined && val !== null && String(val).trim() !== "";
    }

    return false;
  };

  const isQuestionAnswered = (currentQuestion) => {
    if (!currentQuestion) return false;
    const key = getQuestionKey(currentQuestion);
    return !!(key && answeredQuestions[key]);
  };

  const getQuestionStatus = (currentQuestion) => {
    if (!currentQuestion) return "pending";
    if (isQuestionAnswered(currentQuestion)) return "answered";
    const key = getQuestionKey(currentQuestion);
    if (key && skippedQuestions[key]) return "skipped";
    return "pending";
  };

  const markSkipped = (currentQuestion) => {
    if (!currentQuestion) return;

    const key = getQuestionKey(currentQuestion);
    if (!key) return;

    if (
      hasUserResponse(currentQuestion) ||
      isQuestionAnswered(currentQuestion)
    ) {
      return;
    }

    setSkippedQuestions((prev) => ({ ...prev, [key]: true }));
  };

  const clearSkipped = (currentQuestion) => {
    if (!currentQuestion) return;

    const key = getQuestionKey(currentQuestion);
    if (!key) return;

    setSkippedQuestions((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleChangeAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    const currentQuestion = items[activeIndex];
    if (currentQuestion) clearSkipped(currentQuestion);
  };

  const handleNext = () => {
    const currentQuestion = items[activeIndex];
    if (currentQuestion) {
      if (hasUserResponse(currentQuestion)) {
        const key = getQuestionKey(currentQuestion);
        if (key) {
          setAnsweredQuestions((prev) => ({ ...prev, [key]: true }));
        }
        clearSkipped(currentQuestion);
      } else if (!isQuestionAnswered(currentQuestion)) {
        markSkipped(currentQuestion);
      }
    }

    if (activeIndex < totalQuestions - 1) {
      setActiveIndex((index) => index + 1);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";

    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600)
        .toString()
        .padStart(2, "0");
      const mins = Math.floor((seconds % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
      return `${hours}:${mins}:${secs}`;
    }

    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const buildPayload = useCallback(
    () => ({
      answers: items.map((q) => {
        const key = getQuestionKey(q);
        let selected_answer = null;
        let selected_format = null;

        if (q.question_type === "check_box") {
          selected_answer = Array.isArray(answers[key]) ? answers[key] : [];
        } else if (q.question_type === "mcq") {
          const value = Array.isArray(answers[key])
            ? answers[key][answers[key].length - 1]
            : answers[key];
          selected_answer = value ?? null;
        } else if (q.question_type === "algebra") {
          selected_answer = Array.isArray(answers[key]) ? answers[key] : [];
          const format = getAlgebraFormatForQuestion(q);
          if (format) selected_format = format;
        } else if (q.question_type === "drag_drop") {
          const compMap = componentAnswers[key] || {};
          selected_answer = buildDragDropSelectedAnswer(q, compMap);
        } else if (q.question_type === "image_annotation") {
          const fields = Array.isArray(q.annotation_fields)
            ? q.annotation_fields
            : [];
          const compMap = componentAnswers[key] || {};
          selected_answer = fields.map((field, fieldIdx) => {
            const fieldId = field?.id ?? `annotation-${fieldIdx}`;
            return compMap[fieldId] !== undefined && compMap[fieldId] !== null
              ? compMap[fieldId]
              : "";
          });
        } else if (q.components?.length) {
          selected_answer = buildFillBlankAnswersFromState(
            q.components,
            componentAnswers[key] || {},
          );
        } else {
          const raw = answers[key];
          const value =
            Array.isArray(raw) && raw.length ? raw[raw.length - 1] : raw;
          selected_answer =
            value !== undefined && value !== null && String(value).trim() !== ""
              ? value
              : null;
        }

        return {
          assessment_question_id: q.assessment_question_id ?? key,
          selected_answer,
          selected_format,
        };
      }),
    }),
    [answers, componentAnswers, getAlgebraFormatForQuestion, getQuestionKey, items],
  );

  const submitOnExit = useCallback(
    async ({ keepalive = false } = {}) => {
      if ((!resolvedId && resolvedId !== 0) || exitSubmissionInFlightRef.current) {
        return;
      }

      exitSubmissionInFlightRef.current = true;
      try {
        const payload = buildPayload();

        if (keepalive && typeof window !== "undefined" && window.fetch) {
          const token = sessionStorage.getItem("auth_token");
          const apiRoot =
            import.meta.env.VITE_API_URL ||
            "https://phplaravel-1473159-6045375.cloudwaysapps.com";
          const base = String(apiRoot).replace(/\/+$/, "");
          const submitUrl = `${base}/api/assessment/${resolvedId}/submit`;

          await fetch(submitUrl, {
            method: "POST",
            keepalive: true,
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });
          markSharedSessionSubmitted();
          return;
        }

        await submitAssessmentAnswer(resolvedId, payload);
        markSharedSessionSubmitted();
      } catch {
        // Exit submit is best-effort and should not block navigation flow.
      } finally {
        exitSubmissionInFlightRef.current = false;
      }
    },
    [resolvedId, buildPayload, markSharedSessionSubmitted],
  );

  useEffect(() => {
    submitOnExitRef.current = submitOnExit;
    shouldBlockExitRef.current = shouldBlockExit;
    if (!shouldBlockExit) {
      beforeUnloadPromptArmedRef.current = false;
      if (beforeUnloadResetTimerRef.current) {
        window.clearTimeout(beforeUnloadResetTimerRef.current);
        beforeUnloadResetTimerRef.current = null;
      }
    }
  }, [shouldBlockExit, submitOnExit]);

  useBeforeUnload(
    (event) => {
      if (!shouldBlockExit) {
        return;
      }

      event.preventDefault();
      event.returnValue = EXIT_CONFIRM_MESSAGE;
      beforeUnloadPromptArmedRef.current = true;
      if (beforeUnloadResetTimerRef.current) {
        window.clearTimeout(beforeUnloadResetTimerRef.current);
      }
      beforeUnloadResetTimerRef.current = window.setTimeout(() => {
        beforeUnloadPromptArmedRef.current = false;
        beforeUnloadResetTimerRef.current = null;
      }, 200);
    },
    { capture: true },
  );

  useEffect(() => {
    const handlePageHide = () => {
      if (!shouldBlockExitRef.current || !beforeUnloadPromptArmedRef.current) {
        return;
      }

      beforeUnloadPromptArmedRef.current = false;
      if (beforeUnloadResetTimerRef.current) {
        window.clearTimeout(beforeUnloadResetTimerRef.current);
        beforeUnloadResetTimerRef.current = null;
      }
      void submitOnExitRef.current({ keepalive: true });
    };

    window.addEventListener("pagehide", handlePageHide, { capture: true });
    return () => {
      window.removeEventListener("pagehide", handlePageHide, { capture: true });
      if (beforeUnloadResetTimerRef.current) {
        window.clearTimeout(beforeUnloadResetTimerRef.current);
        beforeUnloadResetTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !shouldBlockExit) {
      hasPushedExitStateRef.current = false;
      return;
    }

    if (!hasPushedExitStateRef.current) {
      window.history.pushState(
        {
          ...(window.history.state || {}),
          __assessment_exit_guard__: true,
        },
        "",
        window.location.href,
      );
      hasPushedExitStateRef.current = true;
    }

    const handlePopState = async () => {
      if (!shouldBlockExitRef.current) {
        return;
      }

      if (popstateBypassRef.current) {
        popstateBypassRef.current = false;
        return;
      }

      const shouldExit = window.confirm(EXIT_CONFIRM_MESSAGE);
      if (!shouldExit) {
        window.history.pushState(
          {
            ...(window.history.state || {}),
            __assessment_exit_guard__: true,
          },
          "",
          window.location.href,
        );
        hasPushedExitStateRef.current = true;
        return;
      }

      await submitOnExitRef.current();
      popstateBypassRef.current = true;
      hasPushedExitStateRef.current = false;
      window.history.back();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [shouldBlockExit]);

  const confirmExitAndSubmit = useCallback(async () => {
    if (!shouldBlockExit) {
      return true;
    }

    const shouldExit = window.confirm(EXIT_CONFIRM_MESSAGE);
    if (!shouldExit) {
      return false;
    }

    await submitOnExit();
    return true;
  }, [shouldBlockExit, submitOnExit]);

  async function handleSubmit({ force = false } = {}) {
    if (submitting || (deadlinePassed && !force)) return;

    setSubmitting(true);

    try {
      const payload = buildPayload();
      const submitRes = await submitAssessmentAnswer(resolvedId, payload);

      let resultData = null;
      try {
        const resultRes = await assessmentResult(resolvedId);
        resultData = normalizeResultPayload(resultRes);
      } catch {
        resultData = normalizeResultPayload(submitRes);
      }

      const fallback = buildFallbackSubmission(assessmentStatus || {});
      const showAttemptsFlag = resolveShowAttemptsToStudents(
        resultData,
        submitRes,
        selected,
      );
      const normalizedResult =
        resultData && typeof resultData === "object"
          ? {
              ...resultData,
              assessment_id:
                resultData.assessment_id ??
                selected?.assessment_id ??
                resolvedId,
              ...(showAttemptsFlag === null
                ? {}
                : { show_attempts_to_students: showAttemptsFlag }),
            }
          : {
              ...fallback,
              ...(showAttemptsFlag === null
                ? {}
                : { show_attempts_to_students: showAttemptsFlag }),
            };

      setSubmission(normalizedResult);
      setPhase("done");
      setTimeLeft(null);
      emitStudentStatsRefresh();
    } catch (err) {
      setError(err?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  handleSubmitRef.current = handleSubmit;

  const isLast = activeIndex === totalQuestions - 1;
  const submitByLabel = formatDateTime(selected?.submit_by);

  return (
    <PracticeShell
      sidebarData={sidebarData}
      sidebarMeta={sidebarMeta}
      sidebarType="assessment"
      onSelectTopic={async (assessmentId) => {
        const canExit = await confirmExitAndSubmit();
        if (!canExit) {
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const attempted = params.get("attempted");
        const selectedSidebarAssessment = sidebarTopics.find(
          (entry) => String(entry?.topic_id ?? "") === String(assessmentId ?? ""),
        );
        navigate(
          `/student/challenge/assessment/${assessmentId}/starter${
            attempted ? "?attempted=true" : ""
          }`,
          {
            replace: true,
            state: {
              assessment: {
                assessment_id: assessmentId,
                title: selectedSidebarAssessment?.topic_name,
                questions_count: selectedSidebarAssessment?.total_questions,
                duration_minutes: selectedSidebarAssessment?.duration_minutes,
                submission_mode: selectedSidebarAssessment?.submission_mode,
                submit_by: selectedSidebarAssessment?.submit_by,
                can_attempt: selectedSidebarAssessment?.can_attempt,
              },
            },
          },
        );
      }}
    >
      <div className="question-page">
        <div className="question-area-wrap">
          <div
            className={`mx-auto w-[60%] py-5 px-8 text-center ${
              phase === "done" || phase === "intro"
                ? ""
                : "border-b border-gray-300"
            }`}
          >
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">
                  Assessment
                </p>
                <h1 className="text-3xl font-bold text-slate-900">
                  {selected?.title || "Assessment"}
                </h1>
                {/* <div className="mt-2 text-xs text-slate-600 flex items-center justify-center gap-4 flex-wrap">
                  {durationSeconds > 0 && (
                    <span>Duration: {durationMinutes} min</span>
                  )}
                  {submitByLabel && <span>Submit by: {submitByLabel}</span>}
                </div> */}
              </div>

              {phase === "play" && countdownDeadlineTs ? (
                <div className="ml-auto absolute right-[2em] rounded-md bg-slate-100 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
                  Time Left: {formatTime(timeLeft)}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={`question-area h-full ${
              phase === "done" || phase === "intro" ? "" : "mx-auto w-[60%]"
            }`}
          >
            {loading && (
              <p className="text-slate-500 flex justify-center text-center gap-5">
                <Loader2 className="animate-spin" /> Loading...
              </p>
            )}

            {error && (
              <p className="text-red-600 flex justify-center text-center">
                Failed to load: {error}
              </p>
            )}

            {phase === "intro" && !submission && !deadlinePassed && (
              <div
                className="start-screen"
                style={{ backgroundImage: `url(${masteryAssignmentBG})` }}
              >
                <h2 className="text-[36px] font-semibold text-white mb-3">
                  Ready to begin?
                </h2>
                <p className="text-white text-[20px] mb-7">
                  {totalQuestions} question{totalQuestions === 1 ? "" : "s"} in{" "}
                  {selected?.title || "Assessment"}
                </p>
              </div>
            )}

            {deadlinePassed && !submission && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center mx-auto max-w-2xl">
                <h2 className="text-2xl font-semibold text-amber-900 mb-2">
                  Submission closed
                </h2>
                <p className="text-amber-800">
                  This assessment is closed for submissions.
                  {submitByLabel ? ` Submit by time was ${submitByLabel}.` : ""}
                </p>
              </div>
            )}

            {phase === "play" && !submission && (
              <>
                {question ? (
                  <div className="space-y-6 question-body-main">
                    <QuestionContent question={question} showTranslateAction />
                    <AnswerOptions
                      question={question}
                      selectedFormat={(() => {
                        const key = getQuestionKey(question);
                        return key ? algebraFormatByQuestion[key] : undefined;
                      })()}
                      onFormatChange={(formatKey) => {
                        const key = getQuestionKey(question);
                        if (!key || !formatKey) return;
                        setAlgebraFormatByQuestion((prev) => ({
                          ...prev,
                          [key]: formatKey,
                        }));
                      }}
                      value={answers[getQuestionKey(question)] || ""}
                      onChange={(value) =>
                        handleChangeAnswer(getQuestionKey(question), value)
                      }
                      componentsState={
                        componentAnswers[getQuestionKey(question)] || {}
                      }
                      onChangeComponent={(componentId, value) =>
                        setComponentAnswers((prev) => {
                          const currentQuestion = items[activeIndex];
                          if (currentQuestion) clearSkipped(currentQuestion);
                          const key = getQuestionKey(currentQuestion);
                          if (!key) return prev;
                          const existing = prev[key] || {};
                          return {
                            ...prev,
                            [key]: { ...existing, [componentId]: value },
                          };
                        })
                      }
                      evaluationStatus={null}
                    />
                  </div>
                ) : (
                  <p className="text-slate-600">No questions available.</p>
                )}
              </>
            )}

            {phase === "done" && submission && (
              <div className="space-y-4 h-full">
                {shouldHideResultFromStudent ? (
                  <div className="rounded-md border flex items-center gap-3 border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 mx-auto max-w-3/4">
                    <CheckCheck size={18} />
                    Assessment submitted successfully. Your result will be
                    published shortly.
                  </div>
                ) : (
                  <>
                    {(assessmentStatus?.attempted ||
                      selected?.can_attempt === false) && (
                      <div className="rounded-md border flex items-center gap-3 border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 mx-auto max-w-3/4">
                        <CheckCheck size={18} /> You have already attempted this
                        assessment. Here are your stats.
                      </div>
                    )}
                    <QuizSummary result={submission} type="assessment" />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {!submission && (
          <div className="question-footer-bar">
            {phase === "intro" && !deadlinePassed && (
              <div className="flex items-center justify-end">
                <button
                  onClick={() => {
                    void startAssessmentSession({ playAfterLoad: true });
                  }}
                  className="px-5 py-2.5 bg-[#AB474B] hover:bg-[#c4474b] cursor-pointer text-white font-semibold rounded-md transition"
                  disabled={loading}
                >
                  {loading ? "Starting..." : "Let's go"}
                </button>
              </div>
            )}

            {phase === "play" && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 ml-auto question-progress-holder">
                  <div className="text-sm font-semibold text-slate-700">
                    {activeIndex + 1} of {totalQuestions}
                  </div>
                  <div className="question-progress-dots">
                    {totalDots > DOT_WINDOW_SIZE && (
                      <button
                        type="button"
                        onClick={() => {
                          setDotSlideDirection("left");
                          setDotWindowStart((prev) => Math.max(0, prev - 1));
                        }}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900"
                        aria-label="Previous questions"
                      >
                        ‹
                      </button>
                    )}
                    <div
                      className={`flex items-center gap-1 ${
                        dotSlideDirection === "left"
                          ? "dot-slide-left"
                          : dotSlideDirection === "right"
                            ? "dot-slide-right"
                            : ""
                      }`}
                    >
                      {items
                        .slice(dotWindowStart, dotWindowStart + DOT_WINDOW_SIZE)
                        .map((item, idx) => {
                          const realIdx = dotWindowStart + idx;
                          const status = getQuestionStatus(item);
                          return (
                            <span
                              key={getQuestionKey(item) ?? realIdx}
                              role="button"
                              tabIndex={0}
                              onClick={() => setActiveIndex(realIdx)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  setActiveIndex(realIdx);
                                }
                              }}
                              className={`dot ${status} ${
                                realIdx === activeIndex ? "active" : ""
                              } cursor-pointer`}
                            >
                              {realIdx + 1}
                            </span>
                          );
                        })}
                    </div>
                    {totalDots > DOT_WINDOW_SIZE && (
                      <button
                        type="button"
                        onClick={() => {
                          setDotSlideDirection("right");
                          setDotWindowStart((prev) =>
                            Math.min(totalDots - DOT_WINDOW_SIZE, prev + 1)
                          );
                        }}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900"
                        aria-label="Next questions"
                      >
                        ›
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    onClick={() => {
                      if (activeIndex > 0) {
                        setActiveIndex((index) => Math.max(0, index - 1));
                      }
                    }}
                    disabled={activeIndex === 0}
                    className="px-4 py-2 rounded-md border cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => {
                      if (isLast) {
                        const currentQuestion = items[activeIndex];
                        if (currentQuestion) {
                          if (hasUserResponse(currentQuestion)) {
                            const key = getQuestionKey(currentQuestion);
                            if (key) {
                              setAnsweredQuestions((prev) => ({
                                ...prev,
                                [key]: true,
                              }));
                            }
                            clearSkipped(currentQuestion);
                          } else if (!isQuestionAnswered(currentQuestion)) {
                            markSkipped(currentQuestion);
                          }
                        }
                        handleSubmit();
                      } else {
                        handleNext();
                      }
                    }}
                    className="px-4 py-2 rounded-md bg-[#AB474B] hover:bg-[#c4474b] cursor-pointer text-white font-semibold disabled:opacity-60"
                    disabled={submitting || deadlinePassed}
                  >
                    {isLast
                      ? submitting
                        ? "Submitting..."
                        : "Submit"
                      : "Next"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PracticeShell>
  );
};

export default AssessmentPlayer;
