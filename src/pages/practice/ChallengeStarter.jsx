import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useTopicDetails from "@/hooks/useTopicDetails";
import PracticeShell from "@/components/layout/PracticeShell";
import QuestionContent from "@/components/questions/QuestionContent";
import AnswerOptions from "@/components/questions/AnswerOptions";
import SolutionSteps from "@/components/questions/SolutionSteps";
import PracticeSummary from "@/components/questions/PracticeSummary";
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
import {
  addPracticeResults,
  addSingleChallenge,
  getQuestionPlayerChallengeData,
  restartChallenge,
  startChallengeSession,
} from "@/api/questionPlayerApi";
import { emitStudentStatsRefresh } from "@/utils/studentStatsEvents";
import { hasRealContent } from "@/utils/questionTranslation";
import masteryAssignmentBG from "@/assets/book-icons.png";
import { CheckCheck, Loader2, List } from "lucide-react";
import { useStudentPortal } from "@/context/StudentPortalContext";

// ---------------------------------------------------------------------------
// Fix 1 & 2: No Google Translate fallback for the question statement.
// Use native Urdu/Sindhi fields verbatim when present; otherwise fall back to
// plain English — never machine-translate the question text itself.
// ---------------------------------------------------------------------------
const getNativeQuestionText = (question, langKey) => {
  if (!question) return "";
  if (langKey === "ur") {
    return question?.question_text_urdu ?? question?.questionTextUrdu ?? "";
  }
  if (langKey === "sd") {
    return question?.question_text_sindhi ?? question?.questionTextSindhi ?? "";
  }
  return "";
};

const TYPE_LABELS = {
  mastery: "Mastery Assignment",
  quiz: "Quiz",
  unit: "Unit Test",
};

const normalizeChallengeSessionPayload = (response) => {
  const root = response?.data ?? response ?? {};
  if (
    root?.data &&
    typeof root.data === "object" &&
    (root.data.topic_id != null ||
      Array.isArray(root.data.last_submitted_answers) ||
      root.data.current_index != null)
  ) {
    return root.data;
  }
  return root;
};

const applySubmittedAnswersToMaps = (
  q,
  submitted,
  { isCorrect, selectedFormat },
  maps,
) => {
  const key = q.question_id;
  if (!key || !submitted.length) return;

  const {
    answersFromServer,
    componentAnswersFromServer,
    firstAttempt,
    firstSubmittedFromServer,
    lockedFromServer,
    algebraFormatsFromServer,
  } = maps;

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
      const id = field?.id ?? `annotation-${fieldIdx}`;
      compMap[id] =
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

  if (q.question_type === "algebra" && selectedFormat) {
    algebraFormatsFromServer[key] = String(selectedFormat).trim().toLowerCase();
  }

  lockedFromServer[key] = true;
  if (isCorrect === true) firstAttempt[key] = true;
  else if (isCorrect === false) firstAttempt[key] = false;
  firstSubmittedFromServer[key] = {
    selected_answer: submitted,
    selected_format:
      q.question_type === "algebra"
        ? String(selectedFormat ?? algebraFormatsFromServer[key] ?? "")
            .trim()
            .toLowerCase() || null
        : null,
  };
};

const ChallengeStarter = () => {
  const navigate = useNavigate();
  const { language } = useStudentPortal();
  const { topicId, type } = useParams();
  const {
  data,
  topics,
  selectedTopic,
  loading,
  error,
  refetch,
  practiceAttempt,
} = useTopicDetails(topicId, { language, fetcher: getQuestionPlayerChallengeData });
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  // Per-question component answers so blanks don't leak between questions
  const [componentAnswers, setComponentAnswers] = useState({});
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState({});
  const [firstSubmittedByQuestion, setFirstSubmittedByQuestion] = useState({});
  const [skippedQuestions, setSkippedQuestions] = useState({});
  const [algebraFormatByQuestion, setAlgebraFormatByQuestion] = useState({});
  // const [phase, setPhase] = useState("intro"); // intro | play | done
  const [phase, setPhase] = useState("play"); // start directly in play
  const [showSolution, setShowSolution] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // {status: 'correct'|'wrong'}
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pendingNextIndex, setPendingNextIndex] = useState(null);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [lockedQuestions, setLockedQuestions] = useState({});
  const [challengeSession, setChallengeSession] = useState(null);
  const consecutiveWrongRef = useRef(0);
  const prevTopicIdRef = useRef(null);
  const sessionRequestRef = useRef(0);
  const phaseRef = useRef(phase);
  const lastHydratedSessionRef = useRef(null);
  const feedbackPopupRef = useRef(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Fix 2: Removed resolveCachedQuestionText / Google Translate effect entirely.
  // displayQuestion now mirrors PracticeStarter: native field or plain English.
  // ---------------------------------------------------------------------------

  const challengeQuestions = useMemo(() => {
    const questions = selectedTopic?.questions || [];
    if (!questions.length) return [];
    const ids =
      challengeSession?.selected_question_ids ??
      practiceAttempt?.selected_question_ids;
    if (!Array.isArray(ids) || !ids.length) return questions;
    const map = new Map(questions.map((q) => [String(q.question_id), q]));
    return ids.map((id) => map.get(String(id))).filter(Boolean);
  }, [
    selectedTopic?.questions,
    challengeSession?.selected_question_ids,
    practiceAttempt?.selected_question_ids,
  ]);

  const totalQuestions = useMemo(
    () => challengeQuestions.length || selectedTopic?.total_questions || 0,
    [challengeQuestions.length, selectedTopic?.total_questions],
  );

  const currentQuestionRaw = challengeQuestions[activeIndex] || null;

  // Fix 2: Native-only resolution — no Google Translate fallback.
  // If a native Urdu/Sindhi field exists, use it verbatim; otherwise show
  // the original English text. This mirrors PracticeStarter.jsx exactly.
  const displayQuestion = useMemo(() => {
    if (!currentQuestionRaw) return null;
    if (language === "en") return currentQuestionRaw;
    const nativeText = getNativeQuestionText(currentQuestionRaw, language);
    if (!hasRealContent(nativeText)) return currentQuestionRaw;
    return {
      ...currentQuestionRaw,
      question_text: nativeText,
    };
  }, [currentQuestionRaw, language]);

  const nextTopic = useMemo(() => {
    if (!topics?.length || !selectedTopic?.topic_id) return null;
    const currentIndex = topics.findIndex(
      (t) => String(t.topic_id) === String(selectedTopic.topic_id),
    );
    if (currentIndex === -1) return null;
    for (let i = currentIndex + 1; i < topics.length; i++) {
      const topic = topics[i];
      if ((topic.total_questions_challenge ?? 0) > 0) {
        return topic;
      }
    }
    return null;
  }, [topics, selectedTopic?.topic_id]);

  const sidebarData = {
    topics,
    selectedTopicId: topicId ?? selectedTopic?.topic_id,
    topicCount: topics.length,
    subjectId: data?.subject_id,
    unitId: data?.unit_id,
  };
  const sidebarMeta = {
    gradeName: data?.grade_name,
    subjectName: data?.subject_name,
    unitName: data?.unit_name,
    selectedTopicName: selectedTopic?.topic_name,
    unitCount: data?.total_units_count,
    subjectId: data?.subject_id,
  };

  const normalizeSubmittedAnswer = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
        if (parsed || parsed === 0) return [parsed];
      } catch (err) {
        if (value.trim() !== "") return [value];
      }
      return [];
    }
    if (value || value === 0) return [value];
    return [];
  };

  useEffect(() => {
    if (!topicId) return;
    const requestId = ++sessionRequestRef.current;
    let isMounted = true;
    (async () => {
      try {
        const res = await startChallengeSession(topicId);
        if (!isMounted || requestId !== sessionRequestRef.current) return;
        setChallengeSession(normalizeChallengeSessionPayload(res));
      } catch (err) {
        if (isMounted) console.error(err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [topicId]);

  useEffect(() => {
    if (!topicId) return;
    prevTopicIdRef.current = null;
    lastHydratedSessionRef.current = null;
    setChallengeSession(null);
    setPhase("play");
    setSubmission(null);
    setFeedback(null);
    setShowSolution(false);
    setShowRestartConfirm(false);
    setReadyToSubmit(false);
    setChecking(false);
    setPendingNextIndex(null);
    setFirstSubmittedByQuestion({});
  }, [topicId]);

  // Clear feedback/solution when moving between questions
  // Clear feedback/solution when moving between questions
  useEffect(() => {
    setFeedback(null);
    setShowSolution(false);
    setPendingNextIndex(null);
    consecutiveWrongRef.current = 0;
  }, [activeIndex]);

  // Close feedback popup on outside click (does not touch showSolution)
  useEffect(() => {
    if (!feedback?.status) return undefined;

    const handleClickOutside = (e) => {
      if (
        feedbackPopupRef.current &&
        !feedbackPopupRef.current.contains(e.target)
      ) {
        setFeedback(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [feedback]);

  useEffect(() => {
    if (!selectedTopic?.topic_id) return;
    if (String(selectedTopic.topic_id) !== String(topicId)) return;
    if (phaseRef.current === "done") return;
    if (!challengeSession) return;

    const questions = challengeQuestions;
    if (!questions.length) return;

    const maps = {
      answersFromServer: {},
      componentAnswersFromServer: {},
      firstAttempt: {},
      firstSubmittedFromServer: {},
      lockedFromServer: {},
      algebraFormatsFromServer: {},
    };

    const sessionAnswersByQuestionId = new Map(
      (challengeSession.last_submitted_answers ?? []).map((entry) => [
        String(entry?.question_id),
        entry,
      ]),
    );

    questions.forEach((q) => {
      const key = q.question_id;
      if (!key) return;

      const sessionEntry = sessionAnswersByQuestionId.get(String(key));
      const submitted = sessionEntry
        ? normalizeSubmittedAnswer(sessionEntry.submitted_answer)
        : normalizeSubmittedAnswer(q.submitted_answer);

      const isAnswered = sessionEntry ? true : Boolean(q.is_answered);
      const isCorrect = sessionEntry ? sessionEntry.is_correct : q.is_correct;
      const selectedFormat =
        sessionEntry?.selected_format ??
        q.submitted_format ??
        q.selected_format ??
        q.answer_format ??
        null;

      if (submitted.length) {
        applySubmittedAnswersToMaps(
          q,
          submitted,
          { isCorrect, selectedFormat },
          maps,
        );
      } else if (isAnswered) {
        maps.lockedFromServer[key] = true;
        if (isCorrect === true) maps.firstAttempt[key] = true;
        else if (isCorrect === false) maps.firstAttempt[key] = false;
      }

      if (
        q.question_type === "algebra" &&
        !maps.algebraFormatsFromServer[key]
      ) {
        const rawFormat =
          q.submitted_format ??
          q.selected_format ??
          q.answer_format ??
          q.submittedFormat ??
          q.selectedFormat ??
          q.answerFormat ??
          "";
        if (rawFormat) {
          maps.algebraFormatsFromServer[key] = String(rawFormat)
            .trim()
            .toLowerCase();
        }
      }
    });

    const sessionIndexRaw = Number(challengeSession.current_index);
    const fallbackIndex = questions.findIndex(
      (q) => !maps.lockedFromServer[q.question_id],
    );
    let startIndex = 0;
    if (Number.isFinite(sessionIndexRaw)) {
      const clampedSessionIndex = Math.min(
        Math.max(sessionIndexRaw, 0),
        Math.max(questions.length - 1, 0),
      );
      const sessionQuestion = questions[clampedSessionIndex];
      const sessionQuestionOpen =
        sessionQuestion && !maps.lockedFromServer[sessionQuestion.question_id];
      startIndex = sessionQuestionOpen
        ? clampedSessionIndex
        : fallbackIndex === -1
          ? clampedSessionIndex
          : fallbackIndex;
    } else {
      startIndex = fallbackIndex === -1 ? 0 : fallbackIndex;
    }
    const clampedIndex = Math.min(
      Math.max(startIndex, 0),
      Math.max(questions.length - 1, 0),
    );

    const currentTopicId = selectedTopic?.topic_id ?? null;
    const prevTopicId = prevTopicIdRef.current;
    const isTopicSwitch =
      prevTopicId !== null &&
      currentTopicId !== null &&
      String(prevTopicId) !== String(currentTopicId);

    const allSubmitted = questions.every(
      (q) => maps.lockedFromServer[q.question_id],
    );
    const allCorrect = questions.every(
      (q) => maps.firstAttempt[q.question_id] === true,
    );

    const sessionKey = `${topicId}-${challengeSession.id ?? challengeSession.updated_at ?? "session"}`;
    const shouldApplyResumeIndex =
      isTopicSwitch || lastHydratedSessionRef.current !== sessionKey;

    if (shouldApplyResumeIndex) {
      setActiveIndex(clampedIndex);
      lastHydratedSessionRef.current = sessionKey;
    }

    setAnswers(maps.answersFromServer);
    setComponentAnswers(maps.componentAnswersFromServer);
    if (isTopicSwitch) {
      setPhase("play");
      setSubmission(null);
    } else {
      setPhase((prev) => (prev === "done" ? prev : "play"));
    }
    setShowSolution(false);
    setFirstAttemptCorrect(maps.firstAttempt);
    setFirstSubmittedByQuestion(maps.firstSubmittedFromServer);
    setSkippedQuestions({});
    setFeedback(null);
    if (!isTopicSwitch && phaseRef.current !== "done") {
      setSubmission(null);
    }
    setShowSkipConfirm(false);
    setChecking(false);
    setPendingNextIndex(null);
    setReadyToSubmit(
      Boolean(
        challengeSession.ready_to_submit ??
        (challengeSession.status === "completed" && allSubmitted),
      ),
    );
    setLockedQuestions(maps.lockedFromServer);
    setAlgebraFormatByQuestion(maps.algebraFormatsFromServer);
    prevTopicIdRef.current = currentTopicId;
  }, [challengeQuestions, challengeSession, selectedTopic?.topic_id, topicId]);

  const getQuestionKey = (question) => question?.question_id;

  const recordFirstSubmission = (question, payload) => {
    const key = getQuestionKey(question);
    if (!key || !payload) return;
    setFirstSubmittedByQuestion((prev) => {
      if (prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          selected_answer: Array.isArray(payload.selected_answer)
            ? payload.selected_answer
            : [],
          selected_format: payload.selected_format ?? null,
        },
      };
    });
  };

  const parseAnswerApiCompleted = (result) =>
    !!(result?.completed ?? result?.is_completed ?? result?.isCompleted);

  const parseReadyToSubmit = (result) => {
    const completed = parseAnswerApiCompleted(result);
    const ready = !!(result?.ready_to_submit ?? result?.readyToSubmit);
    const isCorrect = !!(result?.is_correct ?? result?.isCorrect);
    return completed && ready && isCorrect;
  };

  const syncReadyToSubmit = (result) => {
    if (parseReadyToSubmit(result)) {
      setReadyToSubmit(true);
    }
  };

  const getAlgebraFormatForQuestion = (question) => {
    if (!question || question.question_type !== "algebra") return "";
    const key = getQuestionKey(question);
    const rawFormat =
      (key ? algebraFormatByQuestion[key] : "") ??
      question?.submitted_format ??
      question?.selected_format ??
      question?.answer_format ??
      question?.submittedFormat ??
      question?.selectedFormat ??
      question?.answerFormat ??
      "";
    return String(rawFormat || "")
      .trim()
      .toLowerCase();
  };

  const getResolvedAnswerState = (question) => {
    if (!question) return null;
    const key = getQuestionKey(question);
    if (!key) return null;
    if (firstAttemptCorrect[key] === true) return true;
    if (firstAttemptCorrect[key] === false) return false;
    if (lockedQuestions[key]) {
      if (question.is_correct === true) return true;
      if (question.is_correct === false) return false;
    }
    return null;
  };

  const isQuestionLocked = (question) => {
    if (!question) return false;
    const key = getQuestionKey(question);
    if (!key) return false;
    if (lockedQuestions[key]) return true;
    return firstAttemptCorrect[key] === true;
  };

  const hasAttemptedQuestion = (question) => {
    if (!question) return false;
    const key = getQuestionKey(question);
    if (!key) return false;
    if (lockedQuestions[key]) return true;
    if (firstSubmittedByQuestion[key]) return true;
    return firstAttemptCorrect[key] !== undefined;
  };

  const handleCheck = async () => {
    const question = challengeQuestions[activeIndex];
    if (!question || checking || submitting || isQuestionLocked(question))
      return;

    const payload = buildCurrentAnswerPayload(question);
    if (!payload) return;

    const key = getQuestionKey(question);
    const isFirstAttempt = !key || !firstSubmittedByQuestion[key];

    setChecking(true);
    try {
      const res = await addSingleChallenge(topicId, payload);
      const result = res?.data ?? res ?? {};
      const isCorrect = !!result?.is_correct;
      const nextIndexFromServer = result?.next_index;

      if (isFirstAttempt) {
        recordFirstSubmission(question, payload);
        if (key && firstAttemptCorrect[key] === undefined) {
          setFirstAttemptCorrect((prev) => ({ ...prev, [key]: isCorrect }));
        }
      }

      clearSkipped(question);

      if (isCorrect) {
        consecutiveWrongRef.current = 0;
      } else {
        consecutiveWrongRef.current += 1;
      }

      setFeedback({ status: isCorrect ? "correct" : "wrong" });
      // Auto-reveal the solution as soon as the answer is correct.
      setShowSolution(isCorrect);
      syncReadyToSubmit(result);
      setPendingNextIndex(
        isCorrect && typeof nextIndexFromServer === "number"
          ? nextIndexFromServer
          : null,
      );
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const submitSkippedQuestion = async (question) => {
    if (!question || checking || submitting) return { nextIndex: null };
    const key = getQuestionKey(question);
    setChecking(true);
    try {
      const payload =
        question.question_type === "algebra" && hasUserResponse(question)
          ? buildCurrentAnswerPayload(question)
          : {
              question_id: question.question_id,
              selected_answer: [],
            };

      const res = await addSingleChallenge(topicId, payload);
      const result = res?.data ?? res ?? {};
      const nextIndexFromServer =
        typeof result?.next_index === "number" ? result.next_index : null;

      if (key && !firstSubmittedByQuestion[key]) {
        recordFirstSubmission(question, payload);
        setFirstAttemptCorrect((prev) =>
          prev[key] === undefined ? { ...prev, [key]: false } : prev,
        );
      }

      syncReadyToSubmit(result);
      return { nextIndex: nextIndexFromServer };
    } catch (err) {
      console.error(err);
      return { nextIndex: null };
    } finally {
      setChecking(false);
    }
  };

  const handleNext = () => {
    const nextIdx =
      typeof pendingNextIndex === "number" ? pendingNextIndex : activeIndex + 1;
    if (challengeQuestions.length && nextIdx < challengeQuestions.length) {
      setActiveIndex(nextIdx);
      setFeedback(null);
      setShowSolution(false);
      setPendingNextIndex(null);
    } else {
      setPendingNextIndex(null);
    }
  };

  const submitLockedLastQuestion = async () => {
    const question = challengeQuestions[activeIndex];
    if (!question || checking || submitting) return;
    const payload = buildCurrentAnswerPayload(question);
    if (!payload) return;
    const key = getQuestionKey(question);
    const isFirstAttempt = !key || !firstSubmittedByQuestion[key];
    setChecking(true);
    try {
      const res = await addSingleChallenge(topicId, payload);
      const result = res?.data ?? res ?? {};
      if (isFirstAttempt) {
        recordFirstSubmission(question, payload);
      }
      syncReadyToSubmit(result);
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const isQuestionAnswered = (question) => isQuestionLocked(question);

  const markSkipped = (question) => {
    if (!question) return;
    const key = getQuestionKey(question);
    if (!key) return;
    if (isQuestionAnswered(question)) return;
    setSkippedQuestions((prev) => ({ ...prev, [key]: true }));
  };

  const clearSkipped = (question) => {
    if (!question) return;
    const key = getQuestionKey(question);
    if (!key) return;
    setSkippedQuestions((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const getQuestionStatus = (question) => {
    if (!question) return "pending";
    const key = getQuestionKey(question);
    const correctness = getResolvedAnswerState(question);
    if (correctness === true) return "answered";
    if (correctness === false) return "first-wrong";
    if (key && skippedQuestions[key]) return "skipped";
    return "pending";
  };

  const hasUserResponse = (question) => {
    if (!question) return false;
    const key = getQuestionKey(question);
    if (!key) return false;
    if (question.question_type === "check_box") {
      const val = answers[key];
      return Array.isArray(val) && val.length > 0;
    }
    if (question.question_type === "mcq") {
      return answers[key] !== undefined && answers[key] !== null;
    }
    if (question.question_type === "fill_blank") {
      if (question.components?.length) {
        return hasFillBlankResponse(
          question.components,
          componentAnswers[key] || {},
        );
      }
      const val = answers[key];
      return val !== undefined && val !== null && String(val).trim() !== "";
    }
    if (question.question_type === "algebra") {
      const val = answers[key];
      if (!Array.isArray(val) || !val.length) return false;
      if (val.some((entry) => !String(entry ?? "").trim())) return false;
      return true;
    }
    if (question.question_type === "image_annotation") {
      const fields = Array.isArray(question.annotation_fields)
        ? question.annotation_fields
        : [];
      const compMap = componentAnswers[key] || {};
      return fields.some((field, idx) => {
        const id = field?.id ?? `annotation-${idx}`;
        const val = compMap[id];
        return val !== undefined && val !== null && String(val).trim() !== "";
      });
    }
    if (question.question_type === "drag_drop") {
      const targets = resolveDragDropTargets(question);
      const compMap = componentAnswers[key] || {};
      return targets.some((target) => {
        const val = compMap[target.id];
        return val !== undefined && val !== null && String(val).trim() !== "";
      });
    }
    if (question.question_type === "text_input") {
      const val = answers[key];
      return val !== undefined && val !== null && String(val).trim() !== "";
    }
    return false;
  };

  const getSelectedAnswerForQuestion = (q) => {
    if (!q) return [];
    let selected_answer = [];
    if (q.question_type === "check_box") {
      const currentVal = answers[q.question_id];
      selected_answer = Array.isArray(currentVal) ? currentVal : [];
    } else if (q.question_type === "mcq") {
      const val = answers[q.question_id];
      selected_answer = val ? [val] : [];
    } else if (q.question_type === "algebra") {
      selected_answer = Array.isArray(answers[q.question_id])
        ? answers[q.question_id]
        : [];
    } else if (q.question_type === "fill_blank") {
      if (q.components?.length) {
        selected_answer = buildFillBlankAnswersFromState(
          q.components,
          componentAnswers[q.question_id] || {},
        );
      } else {
        const val = answers[q.question_id];
        selected_answer = val ? [val] : [];
      }
    } else if (q.question_type === "image_annotation") {
      const fields = Array.isArray(q.annotation_fields)
        ? q.annotation_fields
        : [];
      const compMap = componentAnswers[q.question_id] || {};
      selected_answer = fields.map((field, fieldIdx) => {
        const id = field?.id ?? `annotation-${fieldIdx}`;
        return compMap[id] !== undefined && compMap[id] !== null
          ? compMap[id]
          : "";
      });
    } else if (q.question_type === "drag_drop") {
      const compMap = componentAnswers[q.question_id] || {};
      selected_answer = buildDragDropSelectedAnswer(q, compMap);
    } else if (q.question_type === "text_input") {
      const val = answers[q.question_id];
      selected_answer = val ? [val] : [];
    }
    return selected_answer;
  };

  const getScoredAnswerForQuestion = (question) => {
    const key = getQuestionKey(question);
    const firstSubmission = key ? firstSubmittedByQuestion[key] : null;
    if (firstSubmission) {
      return {
        selected_answer: Array.isArray(firstSubmission.selected_answer)
          ? firstSubmission.selected_answer
          : [],
        selected_format: firstSubmission.selected_format ?? null,
      };
    }
    const selected_answer = getSelectedAnswerForQuestion(question);
    const scored = { selected_answer };
    if (question?.question_type === "algebra") {
      const formatKey = getAlgebraFormatForQuestion(question);
      if (formatKey) {
        scored.selected_format = formatKey;
      }
    }
    return scored;
  };

  const buildPayload = () => {
    const answersPayload = challengeQuestions.map((q) => {
      const scored = getScoredAnswerForQuestion(q);
      const entry = {
        question_id: q.question_id,
        selected_answer: scored.selected_answer,
      };
      if (q.question_type === "algebra" && scored.selected_format) {
        entry.selected_format = scored.selected_format;
      }
      return entry;
    });
    return { answers: answersPayload };
  };

  const buildCurrentAnswerPayload = (question) => {
    if (!question?.question_id) return null;
    const selected_answer = getSelectedAnswerForQuestion(question);
    const payload = {
      question_id: question.question_id,
      selected_answer,
    };
    if (question.question_type === "algebra") {
      const formatKey = getAlgebraFormatForQuestion(question);
      if (formatKey) {
        payload.selected_format = formatKey;
      }
    }
    return payload;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const res = await addPracticeResults(topicId, payload);
      setSubmission(res?.data ?? res ?? null);
      setPhase("done");
      emitStudentStatsRefresh();
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetSession = (startIndex = 0) => {
    setPhase("play");
    setActiveIndex(startIndex);
    setAnswers({});
    setComponentAnswers({});
    setSkippedQuestions({});
    setFeedback(null);
    setShowSolution(false);
    setSubmission(null);
    setFirstAttemptCorrect({});
    setFirstSubmittedByQuestion({});
    setShowSkipConfirm(false);
    setShowRestartConfirm(false);
    setChecking(false);
    setPendingNextIndex(null);
    setReadyToSubmit(false);
    setLockedQuestions({});
    setAlgebraFormatByQuestion({});
  };

  const handleRestartChallenge = async () => {
    if (!topicId || submitting) return;
    setSubmitting(true);
    try {
      await restartChallenge(topicId);
      const res = await startChallengeSession(topicId);
      const session = normalizeChallengeSessionPayload(res);
      setChallengeSession(session);
      const indexFromServer = Number(session?.current_index);
      resetSession(Number.isFinite(indexFromServer) ? indexFromServer : 0);
      lastHydratedSessionRef.current = null;
      await refetch();
      emitStudentStatsRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const goToNextAssignment = () => {
    if (!nextTopic) return;
    navigate(`/student/challenge/${type}/${nextTopic.topic_id}/starter`, {
      replace: true,
    });
  };

  const currentQuestion = challengeQuestions[activeIndex] || null;

  const primaryButtonLabel = (() => {
    if (checking) return "Checking...";
    if (readyToSubmit) return "Check";
    if (currentQuestion && isQuestionLocked(currentQuestion)) return "Next";
    if (feedback?.status === "correct") return "Next";
    return "Check";
  })();

  const DOT_WINDOW_SIZE = 10;
  const totalDots = challengeQuestions.length || 0;
  const [dotWindowStart, setDotWindowStart] = useState(0);
  const [dotSlideDirection, setDotSlideDirection] = useState(null);

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

  return (
    <PracticeShell
      sidebarData={sidebarData}
      onSelectTopic={(id) => {
        if (String(id) === String(topicId)) return;
        navigate(`/student/challenge/${type}/${id}/starter`, { replace: true });
      }}
      sidebarMeta={sidebarMeta}
      basePath="/student/challenge"
      playerMode="challenge"
    >
      <div className="question-page">
        <div className="question-area-wrap">
          <div
            className={`mx-auto w-[60%] py-5 px-8 text-center  ${
              phase === "done" || phase === "intro"
                ? ""
                : "border-b border-gray-300"
            }`}
          >
            <h1 className="text-2xl font-bold text-slate-900">
              {selectedTopic?.topic_name || data?.unit_name || "Practice"}
            </h1>
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
            {!loading &&
              !error &&
              (!challengeSession || !challengeQuestions.length) && (
                <p className="text-slate-500 flex justify-center text-center gap-5">
                  <Loader2 className="animate-spin" /> Loading questions...
                </p>
              )}
            {!loading && !error && challengeQuestions.length > 0 && (
              <>
                {type === "mastery" ? (
                  <>
                    {/* Intro screen removed; start directly in play */}
                    {phase === "play" && (
                      <>
                        <div className="question-body-main">
                          <div className="">
                            {/* Fix 1 & 3: Pass displayQuestion (native text or English).
                                QuestionContent will gate RTL/font styling on whether a
                                native translation actually exists — no bleeding. */}
                            <QuestionContent
                              question={displayQuestion}
                              selectedLanguage={language}
                            />

                            {(() => {
                              const q = challengeQuestions[activeIndex] || null;
                              if (
                                !q ||
                                q.question_type === "fill_blank" ||
                                q.question_type === "image_annotation" ||
                                q.question_type === "drag_drop"
                              ) {
                                return null;
                              }
                              return <></>;
                            })()}

                            {/* Fix 1 & 3: Pass the raw question (not displayQuestion) so
                                AnswerOptions can check native field presence itself and
                                gate option translation + RTL accordingly. */}
                            <AnswerOptions
                              question={challengeQuestions[activeIndex]}
                              disableInputs={(() => {
                                const q =
                                  challengeQuestions[activeIndex] || null;
                                return isQuestionAnswered(q);
                              })()}
                              selectedFormat={(() => {
                                const q =
                                  challengeQuestions[activeIndex] || null;
                                const key = getQuestionKey(q);
                                return key
                                  ? algebraFormatByQuestion[key]
                                  : undefined;
                              })()}
                              onFormatChange={(formatKey) => {
                                const q =
                                  challengeQuestions[activeIndex] || null;
                                const key = getQuestionKey(q);
                                if (!key) return;
                                if (!formatKey) return;
                                setAlgebraFormatByQuestion((prev) => ({
                                  ...prev,
                                  [key]: formatKey,
                                }));
                              }}
                              value={
                                challengeQuestions[activeIndex]
                                  ? answers[
                                      challengeQuestions[activeIndex]
                                        .question_id
                                    ]
                                  : ""
                              }
                              onChange={(val) => {
                                setFeedback(null);
                                setShowSolution(false);
                                setAnswers((prev) => {
                                  const question =
                                    challengeQuestions[activeIndex] || null;
                                  if (question) clearSkipped(question);
                                  return {
                                    ...prev,
                                    [challengeQuestions[activeIndex]
                                      .question_id]: val,
                                  };
                                });
                              }}
                              componentsState={
                                componentAnswers[
                                  challengeQuestions[activeIndex]?.question_id
                                ] || {}
                              }
                              onChangeComponent={(id, val) =>
                                setComponentAnswers((prev) => {
                                  const question =
                                    challengeQuestions[activeIndex] || null;
                                  if (question) clearSkipped(question);
                                  setFeedback(null);
                                  setShowSolution(false);
                                  const qid =
                                    challengeQuestions[activeIndex]
                                      ?.question_id;
                                  if (!qid) return prev;
                                  const existing = prev[qid] || {};
                                  return {
                                    ...prev,
                                    [qid]: {
                                      ...existing,
                                      [id]: val,
                                    },
                                  };
                                })
                              }
                              evaluationStatus={feedback?.status || null}
                              disableSelection={
                                (feedback?.status === "correct" ||
                                  (() => {
                                    const q =
                                      challengeQuestions[activeIndex] || null;
                                    return isQuestionAnswered(q);
                                  })()) &&
                                challengeQuestions[activeIndex]
                                  ?.question_type === "mcq"
                              }
                              selectedLanguage={language}
                            />

                            {/* Fix 4: Pass all three parallel step arrays so SolutionSteps
                                can pick the correct native step object (text + images) by
                                index, rather than only switching the explanation text. */}
                            <SolutionSteps
                              steps={
                                challengeQuestions[activeIndex]
                                  ?.solution_steps || []
                              }
                              stepsUrdu={
                                challengeQuestions[activeIndex]
                                  ?.solution_steps_urdu || []
                              }
                              stepsSindhi={
                                challengeQuestions[activeIndex]
                                  ?.solution_steps_sindhi || []
                              }
                              show={showSolution}
                              selectedLanguage={language}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {phase === "done" && (
                      <div className="space-y-4 h-full">
                        <PracticeSummary result={submission} />
                      </div>
                    )}
                  </>
                ) : (
                  <></>
                )}
              </>
            )}
          </div>
        </div>

        <div className="question-footer-bar">
          {phase === "play" && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                {(selectedTopic?.total_questions_practice ?? 0) > 0 && (
                  <button
                    type="button"
                    className="px-4 py-[6px] text-sm font-bold rounded-md border-[#000] bg-[#000] border-2 text-white cursor-pointer hover:bg-white hover:text-[#000]"
                    onClick={() =>
                      navigate(`/student/practice/${type}/${topicId}/starter`)
                    }
                    disabled={!topicId}
                  >
                    Take Practice
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 ml-auto question-progress-holder">
                <div className="text-sm font-semibold text-slate-700">
                  {activeIndex + 1} of {challengeQuestions.length || 0}{" "}
                </div>
                <div className="question-progress-dots flex items-center gap-2">
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
                    {challengeQuestions
                      .slice(dotWindowStart, dotWindowStart + DOT_WINDOW_SIZE)
                      .map((question, idx) => {
                        const realIdx = dotWindowStart + idx;
                        const status = getQuestionStatus(question);
                        return (
                          <span
                            key={question.question_id ?? realIdx}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setActiveIndex(realIdx);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
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
                          Math.min(totalDots - DOT_WINDOW_SIZE, prev + 1),
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
                  onClick={() => setShowRestartConfirm(true)}
                  className="px-4 py-2 rounded-md cursor-pointer border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  Restart
                </button>
                <div className="relative">
                  <button
                    onClick={() => {
                      if (
                        currentQuestion &&
                        isQuestionLocked(currentQuestion) &&
                        activeIndex === (challengeQuestions.length || 1) - 1
                      ) {
                        submitLockedLastQuestion();
                      } else if (
                        currentQuestion &&
                        isQuestionLocked(currentQuestion)
                      ) {
                        handleNext();
                      } else if (feedback?.status === "correct") {
                        handleNext();
                      } else {
                        handleCheck();
                      }
                    }}
                    className={`px-4 py-2 rounded-md cursor-pointer font-semibold disabled:opacity-60 ${
                      readyToSubmit
                        ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
                        : "bg-[#AB474B] hover:bg-[#c4474b] text-white"
                    }`}
                    disabled={
                      checking ||
                      submitting ||
                      readyToSubmit ||
                      (() => {
                        if (!currentQuestion) return true;
                        if (isQuestionLocked(currentQuestion)) return false;
                        if (currentQuestion.question_type === "fill_blank")
                          return false;
                        return !hasUserResponse(currentQuestion);
                      })()
                    }
                  >
                    {primaryButtonLabel}
                  </button>
                  {feedback?.status && challengeQuestions[activeIndex] && (
                    <div
                      ref={feedbackPopupRef}
                      className="absolute bottom-full mb-2 right-0 z-20 w-72 rounded-md border border-slate-200 bg-white shadow-lg py-3 px-5 text-sm"
                    >
                      <button
                        type="button"
                        aria-label="Close feedback"
                        className="absolute top-2 right-2 text-slate-500 hover:text-slate-700"
                        onClick={() => {
                          setFeedback(null);
                        }}
                      >
                        X
                      </button>
                      {feedback.status === "correct" ? (
                        <div className={`flex gap-4 items-center`}>
                          <span
                            className={`h-[70px] w-[70px] rounded-full text-white inline-flex items-center justify-center text-[30px] bg-green-600`}
                          >
                            ✓
                          </span>
                          <div className="">
                            <h1 className="text-[17px] font-semibold">
                              Great work!
                            </h1>
                            <span className="text-[16px] text-slate-600">
                              You got it. Onward!{" "}
                            </span>
                            {challengeQuestions[activeIndex]?.solution_steps
                              ?.length ? (
                              <button
                                className="mt-1 text-[16px] text-gray-600 rounded-sm font-semibold cursor-pointer flex gap-3 hover:underline"
                                onClick={() => setShowSolution(true)}
                              >
                                See the solution
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className={`flex gap-4`}>
                          <div className="w-full">
                            <h1 className="text-[17px] font-semibold">
                              Not quite yet...
                            </h1>
                            <span className="text-[16px] text-slate-600">
                              Give it another try
                            </span>
                            {challengeQuestions[activeIndex]?.solution_steps
                              ?.length && consecutiveWrongRef.current >= 2 ? (
                              <div className="flex justify-end w-full">
                                <button
                                  className="mt-3 text-[13px] text-white rounded-sm font-semibold cursor-pointer bg-gray-600 px-3 py-2 flex gap-3"
                                  onClick={() => setShowSolution(true)}
                                >
                                  <List size={16} />
                                  Show Solution
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {readyToSubmit && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-4 py-2 rounded-md cursor-pointer bg-[#AB474B] hover:bg-[#c4474b] text-white font-semibold disabled:opacity-60"
                    disabled={submitting || checking}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                )}
              </div>
            </div>
          )}
          {phase === "done" && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div />
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={() => setShowRestartConfirm(true)}
                  className="px-4 py-2 rounded-md border cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Restart
                </button>
                <button
                  onClick={goToNextAssignment}
                  className="px-4 py-2 rounded-md cursor-pointer bg-[#AB474B] hover:bg-[#c4474b] text-white font-semibold  disabled:opacity-60"
                  disabled={!nextTopic}
                >
                  Go To Next
                </button>
              </div>
            </div>
          )}
        </div>

        {showRestartConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Restart challenge?
              </h3>
              <p className="text-sm text-slate-700 mb-4">
                If you restart the challenge, your progress will reset.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowRestartConfirm(false)}
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-[#AB474B] text-white hover:bg-[#c4474b]"
                  onClick={async () => {
                    setShowRestartConfirm(false);
                    await handleRestartChallenge();
                  }}
                >
                  Yes, sure
                </button>
              </div>
            </div>
          </div>
        )}

        {showSkipConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Confirm skip
              </h3>
              <p className="text-sm text-slate-700 mb-4">
                Are you sure you want to skip this question? Skipped questions
                will be marked as incorrect.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowSkipConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-[#AB474B] text-white hover:bg-[#c4474b]"
                  onClick={async () => {
                    const question = challengeQuestions[activeIndex] || null;
                    const { nextIndex } = await submitSkippedQuestion(question);
                    markSkipped(question);
                    setShowSkipConfirm(false);
                    const targetIndex =
                      typeof nextIndex === "number"
                        ? nextIndex
                        : activeIndex + 1;
                    if (
                      challengeQuestions.length &&
                      targetIndex < challengeQuestions.length
                    ) {
                      setActiveIndex(targetIndex);
                      setFeedback(null);
                      setShowSolution(false);
                      setPendingNextIndex(null);
                    } else {
                      setPendingNextIndex(null);
                      handleSubmit();
                    }
                  }}
                >
                  Yes, sure
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PracticeShell>
  );
};

export default ChallengeStarter;
