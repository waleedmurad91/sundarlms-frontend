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
  addSinglePractice,
  restartPractice,
  startPracticeSession,
} from "@/api/questionPlayerApi";
import { emitStudentStatsRefresh } from "@/utils/studentStatsEvents";
import { hasRealContent } from "@/utils/questionTranslation";
import { useStudentPortal } from "@/context/StudentPortalContext";
import masteryAssignmentBG from "@/assets/book-icons.png";
import { List, Loader2, X } from "lucide-react";

const TYPE_LABELS = {
  mastery: "Mastery Assignment",
  quiz: "Quiz",
  unit: "Unit Test",
};

// There is no native per-option/per-label translation from the backend.
// question_text_urdu / question_text_sindhi act as the *only* source of
// truth for "this question has a native translation" — when present, we
// show that native text verbatim (no Google Translate call); when absent,
// we show the original English text and do NOT fall back to machine
// translation for the question statement.
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

const PracticeStarter = () => {
  const navigate = useNavigate();
  const { topicId, type } = useParams();
  const { language } = useStudentPortal();
const {
  data,
  topics,
  selectedTopic,
  loading,
  error,
  refetch,
  practiceAttempt,
} = useTopicDetails(topicId, { language });
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  // Per-question component answers so blanks don't leak between questions
  const [componentAnswers, setComponentAnswers] = useState({});
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState({});
  const [skippedQuestions, setSkippedQuestions] = useState({});
  const [algebraFormatByQuestion, setAlgebraFormatByQuestion] = useState({});
  // const [phase, setPhase] = useState("intro"); // intro | play | done
  const [phase, setPhase] = useState("play"); // start directly in play
  const [showSolution, setShowSolution] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // {status: 'correct'|'wrong'}
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const feedbackPopupRef = useRef(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pendingNextIndex, setPendingNextIndex] = useState(null);
  const [serverCompleted, setServerCompleted] = useState(false);
  const [lockedQuestions, setLockedQuestions] = useState({});
  const prevTopicIdRef = useRef(null);
  const sessionRequestRef = useRef(0);
  const [sessionStartIndex, setSessionStartIndex] = useState(null);

  const totalQuestions = useMemo(
    () =>
      selectedTopic?.questions?.length || selectedTopic?.total_questions || 0,
    [selectedTopic],
  );

  const currentQuestionRaw = selectedTopic?.questions?.[activeIndex] || null;

  // The question object passed down to QuestionContent/AnswerOptions, with
  // question_text resolved to the selected language. No Google Translate
  // fallback here: if a native question_text_urdu/sindhi value exists, use
  // it verbatim; otherwise leave question_text as the original English so we
  // never machine-translate the question statement itself.
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
    // Find next topic that has practice questions
    for (let i = currentIndex + 1; i < topics.length; i++) {
      const topic = topics[i];
      if ((topic.total_questions_practice ?? 0) > 0) {
        return topic;
      }
    }
    return null;
  }, [topics, selectedTopic?.topic_id]);

  // First topic of the unit that has practice questions — used to loop back to
  // the start once the last topic of the unit is completed.
  const firstTopic = useMemo(() => {
    if (!topics?.length) return null;
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      if ((topic.total_questions_practice ?? 0) > 0) return topic;
    }
    return null;
  }, [topics]);

  // Where "Next Practice" should go: the next topic, or back to the first
  // topic of the unit when we're already on the last one.
  const nextPracticeTopic = nextTopic ?? firstTopic;

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
        const res = await startPracticeSession(topicId);
        if (!isMounted || requestId !== sessionRequestRef.current) return;
        const indexFromServer =
          res?.data?.current_index ??
          res?.current_index ??
          res?.data?.data?.current_index ??
          null;
        if (typeof indexFromServer === "number") {
          setSessionStartIndex(indexFromServer);
        }
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
    setSessionStartIndex(null);
    setPhase("play");
    setSubmission(null);
    setFeedback(null);
    setShowFeedbackPopup(false);
    setShowSolution(false);
    setServerCompleted(false);
    setChecking(false);
    setPendingNextIndex(null);
  }, [topicId]);

  // Clear feedback/solution when moving between questions
  useEffect(() => {
    setFeedback(null);
    setShowFeedbackPopup(false);
    setShowSolution(false);
    setPendingNextIndex(null);
    setServerCompleted(false);
  }, [activeIndex]);

  // Close feedback popup when clicking outside
  useEffect(() => {
    if (!showFeedbackPopup) return;
    const handleClickOutside = (e) => {
      if (
        feedbackPopupRef.current &&
        !feedbackPopupRef.current.contains(e.target)
      ) {
        setShowFeedbackPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFeedbackPopup]);

  useEffect(() => {
    if (!selectedTopic?.topic_id) return;
    if (String(selectedTopic.topic_id) !== String(topicId)) return;

    const questions = selectedTopic?.questions || [];
    if (!questions.length) return;
    const answersFromServer = {};
    const componentAnswersFromServer = {};
    const firstAttempt = {};
    const lockedFromServer = {};
    const algebraFormatsFromServer = {};

    questions.forEach((q) => {
      const key = q.question_id;
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
            const id = field?.id ?? `annotation-${fieldIdx}`;
            const value =
              submitted[fieldIdx] !== undefined && submitted[fieldIdx] !== null
                ? submitted[fieldIdx]
                : "";
            compMap[id] = value;
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
        lockedFromServer[key] = true;
        if (q.is_correct === true) firstAttempt[key] = true;
        else if (q.is_correct === false) firstAttempt[key] = false;
      }
    });

    const startIndexRaw = Number(
      sessionStartIndex ?? practiceAttempt?.current_index,
    );
    const startIndex = Number.isFinite(startIndexRaw) ? startIndexRaw : 0;
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

    setActiveIndex(clampedIndex);
    setAnswers(answersFromServer);
    setComponentAnswers(componentAnswersFromServer);
    if (isTopicSwitch) {
      setPhase("play");
      setSubmission(null);
    }
    setShowSolution(false);
    setFirstAttemptCorrect(firstAttempt);
    setSkippedQuestions({});
    setFeedback(null);
    setShowFeedbackPopup(false);
    if (!isTopicSwitch) {
      setSubmission(null);
    }
    setShowSkipConfirm(false);
    setChecking(false);
    setPendingNextIndex(null);
    setServerCompleted(false);
    setLockedQuestions(lockedFromServer);
    setAlgebraFormatByQuestion(algebraFormatsFromServer);
    prevTopicIdRef.current = currentTopicId;
  }, [
    practiceAttempt?.current_index,
    sessionStartIndex,
    selectedTopic?.questions,
    selectedTopic?.topic_id,
    topicId,
  ]);

  const getQuestionKey = (question) => question?.question_id;

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

  const isQuestionLocked = () => false;

  const hasAttemptedQuestion = (question) => {
    if (!question) return false;
    const key = getQuestionKey(question);
    if (!key) return false;
    if (lockedQuestions[key]) return true;
    return firstAttemptCorrect[key] !== undefined;
  };

  const handleCheck = async () => {
    const question = selectedTopic?.questions?.[activeIndex];
    if (!question || checking || submitting) return;
    const payload = buildSingleAnswerPayload(question);
    if (!payload) return;

    setChecking(true);
    try {
      const res = await addSinglePractice(topicId, payload);
      const result = res?.data ?? res ?? {};
      const isCorrect = !!result?.is_correct;
      const completed = !!result?.completed;
      const nextIndexFromServer = result?.next_index;
      const key = getQuestionKey(question);

      if (key && firstAttemptCorrect[key] === undefined) {
        setFirstAttemptCorrect((prev) => ({ ...prev, [key]: isCorrect }));
      }
      clearSkipped(question);
      setFeedback({ status: isCorrect ? "correct" : "wrong" });
      setShowFeedbackPopup(true);
      // Auto-reveal the solution as soon as the answer is correct.
      setShowSolution(isCorrect);
      // Only treat the session as completed when the last answer was correct,
      // otherwise the user gets locked out of re-checking a wrong answer.
      setServerCompleted(isCorrect && completed);
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
    setChecking(true);
    try {
      const payload =
        question.question_type === "algebra" && hasUserResponse(question)
          ? buildSingleAnswerPayload(question)
          : {
              question_id: question.question_id,
              selected_answer: [],
            };
      const res = await addSinglePractice(topicId, payload);
      const result = res?.data ?? res ?? {};
      const completed = !!result?.completed;
      const nextIndexFromServer =
        typeof result?.next_index === "number" ? result.next_index : null;
      setServerCompleted(completed);
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
    if (selectedTopic?.questions && nextIdx < selectedTopic.questions.length) {
      // The API still has a next/remaining question — go to it.
      setActiveIndex(nextIdx);
      setFeedback(null);
      setShowFeedbackPopup(false);
      setShowSolution(false);
      setPendingNextIndex(null);
    } else {
      // No questions left in this topic — move on to the next practice topic,
      // looping back to the unit's first topic when we're on the last one.
      setPendingNextIndex(null);
      goToNextAssignment();
    }
  };

  const submitLockedLastQuestion = async () => {
    const question = selectedTopic?.questions?.[activeIndex];
    if (!question || checking || submitting) return;
    const payload = buildSingleAnswerPayload(question);
    if (!payload) return;
    setChecking(true);
    try {
      const res = await addSinglePractice(topicId, payload);
      const result = res?.data ?? res ?? {};
      setServerCompleted(!!result?.completed);
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

  const buildSingleAnswerPayload = (question) => {
    if (!question?.question_id) return null;
    const payload = {
      question_id: question.question_id,
      selected_answer: getSelectedAnswerForQuestion(question),
    };
    if (question.question_type === "algebra") {
      const formatKey = getAlgebraFormatForQuestion(question);
      if (formatKey) {
        payload.selected_format = formatKey;
      }
    }
    return payload;
  };

  const buildPayload = () => {
    const answersPayload = (selectedTopic?.questions || []).map((q) => {
      const entry = {
        question_id: q.question_id,
        selected_answer: getSelectedAnswerForQuestion(q),
      };
      if (
        q.question_type === "algebra" &&
        Array.isArray(entry.selected_answer) &&
        entry.selected_answer.length
      ) {
        const formatKey = getAlgebraFormatForQuestion(q);
        if (formatKey) {
          entry.selected_format = formatKey;
        }
      }
      return entry;
    });
    return { answers: answersPayload };
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      setSubmission(buildPayload());
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
    // setPhase("intro");
    setPhase("play");
    setActiveIndex(startIndex);
    setAnswers({});
    setComponentAnswers({});
    setSkippedQuestions({});
    setFeedback(null);
    setShowFeedbackPopup(false);
    setShowSolution(false);
    setSubmission(null);
    setFirstAttemptCorrect({});
    setShowSkipConfirm(false);
    setChecking(false);
    setPendingNextIndex(null);
    setServerCompleted(false);
    setLockedQuestions({});
    setAlgebraFormatByQuestion({});
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const handleRestartPractice = async () => {
    if (!topicId || submitting) return;
    setSubmitting(true);
    try {
      await restartPractice(topicId);
      const res = await startPracticeSession(topicId);
      const indexFromServer =
        res?.data?.current_index ??
        res?.current_index ??
        res?.data?.data?.current_index ??
        0;
      setSessionStartIndex(
        typeof indexFromServer === "number" ? indexFromServer : 0,
      );
      resetSession(typeof indexFromServer === "number" ? indexFromServer : 0);
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const goToNextAssignment = () => {
    const target = nextPracticeTopic;
    if (!target) return;
    navigate(`/student/practice/${type}/${target.topic_id}/starter`, {
      replace: true,
    });
  };

  const currentQuestion = selectedTopic?.questions?.[activeIndex] || null;

  const primaryButtonLabel = (() => {
    if (checking) return "Checking...";
    if (submitting && serverCompleted) return "Submitting...";
    if (serverCompleted) return "Submit";
    if (currentQuestion && isQuestionLocked(currentQuestion)) return "Next";
    if (feedback?.status === "correct") {
      return activeIndex < (selectedTopic?.questions?.length || 0) - 1
        ? "Next"
        : "Next";
    }
    return "Check";
  })();

  const DOT_WINDOW_SIZE = 10;
  const totalDots = selectedTopic?.questions?.length || 0;
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
        navigate(`/student/practice/${type}/${id}/starter`, { replace: true });
      }}
      sidebarMeta={sidebarMeta}
      basePath="/student/practice"
      playerMode="practice"
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
            {!loading && !error && !selectedTopic?.questions?.length && (
              <p className="text-slate-500 flex justify-center text-center gap-5">
                <Loader2 className="animate-spin" /> Loading questions...
              </p>
            )}
            {!loading && !error && selectedTopic?.questions?.length > 0 && (
              <>
                {type === "mastery" ? (
                  <>
                    {/* Intro screen removed; start directly in play */}
                    {phase === "play" && (
                      <>
                        <div className="question-body-main">
                          <div className="">
                            <QuestionContent
                              question={displayQuestion}
                              selectedLanguage={language}
                            />

                            {(() => {
                              const q =
                                selectedTopic?.questions?.[activeIndex] || null;
                              if (
                                !q ||
                                q.question_type === "fill_blank" ||
                                q.question_type === "image_annotation" ||
                                q.question_type === "drag_drop"
                              ) {
                                return null;
                              }
                              const label =
                                q.question_type === "check_box"
                                  ? "Choose multiple answers:"
                                  : q.question_type === "algebra"
                                    ? "Choose answer format:"
                                    : "Choose single answer:";
                              return (
                                // <h1 className="text-[17px] font-bold pb-3 mt-[1rem] border-b border-gray-300">
                                //   {label}
                                // </h1>
                                <></>
                              );
                            })()}
                            <AnswerOptions
                              question={selectedTopic?.questions?.[activeIndex]}
                              disableInputs={(() => {
                                const q =
                                  selectedTopic?.questions?.[activeIndex] ||
                                  null;
                                return isQuestionAnswered(q);
                              })()}
                              selectedFormat={(() => {
                                const q =
                                  selectedTopic?.questions?.[activeIndex] ||
                                  null;
                                const key = getQuestionKey(q);
                                return key
                                  ? algebraFormatByQuestion[key]
                                  : undefined;
                              })()}
                              onFormatChange={(formatKey) => {
                                const q =
                                  selectedTopic?.questions?.[activeIndex] ||
                                  null;
                                const key = getQuestionKey(q);
                                if (!key) return;
                                if (!formatKey) return;
                                setAlgebraFormatByQuestion((prev) => ({
                                  ...prev,
                                  [key]: formatKey,
                                }));
                              }}
                              value={
                                selectedTopic?.questions?.[activeIndex]
                                  ? answers[
                                      selectedTopic.questions[activeIndex]
                                        .question_id
                                    ]
                                  : ""
                              }
                              onChange={(val) => {
                                setFeedback(null);
                                setShowFeedbackPopup(false);
                                setShowSolution(false);
                                setAnswers((prev) => {
                                  const question =
                                    selectedTopic?.questions?.[activeIndex] ||
                                    null;
                                  if (question) clearSkipped(question);
                                  return {
                                    ...prev,
                                    [selectedTopic.questions[activeIndex]
                                      .question_id]: val,
                                  };
                                });
                              }}
                              componentsState={
                                componentAnswers[
                                  selectedTopic?.questions?.[activeIndex]
                                    ?.question_id
                                ] || {}
                              }
                              onChangeComponent={(id, val) =>
                                setComponentAnswers((prev) => {
                                  const question =
                                    selectedTopic?.questions?.[activeIndex] ||
                                    null;
                                  if (question) clearSkipped(question);
                                  setFeedback(null);
                                  setShowFeedbackPopup(false);
                                  setShowSolution(false);
                                  const qid =
                                    selectedTopic?.questions?.[activeIndex]
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
                                      selectedTopic?.questions?.[activeIndex] ||
                                      null;
                                    return isQuestionAnswered(q);
                                  })()) &&
                                selectedTopic?.questions?.[activeIndex]
                                  ?.question_type === "mcq"
                              }
                              selectedLanguage={language}
                            />
                            <SolutionSteps
                              steps={
                                selectedTopic?.questions?.[activeIndex]
                                  ?.solution_steps || []
                              }
                              stepsUrdu={
                                selectedTopic?.questions?.[activeIndex]
                                  ?.solution_steps_urdu || []
                              }
                              stepsSindhi={
                                selectedTopic?.questions?.[activeIndex]
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
                {(selectedTopic?.total_questions_challenge ?? 0) > 0 && (
                  <button
                    type="button"
                    className="px-4 py-[6px] text-sm font-bold rounded-md border-[#000] bg-[#000] border-2 text-white cursor-pointer hover:bg-white hover:text-[#000]"
                    onClick={() =>
                      navigate(`/student/challenge/${type}/${topicId}/starter`)
                    }
                    disabled={!topicId}
                  >
                    Take Challenge
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 ml-auto question-progress-holder">
                <div className="text-sm font-semibold text-slate-700">
                  {activeIndex + 1} of{" "}
                  {selectedTopic?.questions?.length || 0}{" "}
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
                    {selectedTopic?.questions
                      ?.slice(dotWindowStart, dotWindowStart + DOT_WINDOW_SIZE)
                      .map((question, idx) => {
                        const realIdx = dotWindowStart + idx;
                        const status = getQuestionStatus(question);
                        const canJump = true;
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
                  onClick={() => setShowSkipConfirm(true)}
                  className="px-4 py-2 rounded-md cursor-pointer border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  Restart
                </button>
                <div className="relative">
                  <button
                    onClick={() => {
                      if (serverCompleted) {
                        goToNextAssignment();
                        return;
                      }
                      if (
                        currentQuestion &&
                        isQuestionLocked(currentQuestion) &&
                        activeIndex ===
                          (selectedTopic?.questions?.length || 1) - 1
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
                    className="px-4 py-2 rounded-md cursor-pointer bg-[#AB474B] hover:bg-[#c4474b] text-white font-semibold  disabled:opacity-60"
                    disabled={
                      serverCompleted
                        ? !nextPracticeTopic
                        : checking ||
                          submitting ||
                          (() => {
                            if (!currentQuestion) return true;
                            if (isQuestionLocked(currentQuestion)) return false;
                            if (currentQuestion.question_type === "fill_blank")
                              return false;
                            return !hasUserResponse(currentQuestion);
                          })()
                    }
                  >
                    {serverCompleted ? "Next Practice" : primaryButtonLabel}
                  </button>
                  {showFeedbackPopup &&
                    feedback?.status &&
                    selectedTopic?.questions?.[activeIndex] && (
                      <div
                        ref={feedbackPopupRef}
                        className="absolute bottom-full mb-2 right-0 z-20 w-72 rounded-md border border-slate-200 bg-white shadow-lg py-3 px-5 text-sm"
                      >
                        <button
                          type="button"
                          aria-label="Close feedback"
                          className="absolute top-2 right-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                          onClick={() => {
                            setShowFeedbackPopup(false);
                          }}
                        >
                          <X size={16} />
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
                              {/* {selectedTopic?.questions?.[activeIndex]
                                ?.solution_steps?.length ? (
                                <button
                                  className="mt-1 text-[16px] text-gray-600 rounded-sm font-semibold cursor-pointer flex gap-3 hover:underline"
                                  onClick={() => setShowSolution(true)}
                                >
                                  See the solution
                                </button>
                              ) : null} */}
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
                              {selectedTopic?.questions?.[activeIndex]
                                ?.solution_steps?.length ? (
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
              </div>
            </div>
          )}
          {phase === "done" && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div />
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-md border cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Restart
                </button>
                <button
                  onClick={goToNextAssignment}
                  className="px-4 py-2 rounded-md cursor-pointer bg-[#AB474B] hover:bg-[#c4474b] text-white font-semibold  disabled:opacity-60"
                  disabled={!nextPracticeTopic}
                >
                  Go To Next
                </button>
              </div>
            </div>
          )}
        </div>

        {showSkipConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Restart practice?
              </h3>
              <p className="text-sm text-slate-700 mb-4">
                Are you sure you want to restart the practice?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowSkipConfirm(false)}
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-[#AB474B] text-white hover:bg-[#c4474b]"
                  onClick={async () => {
                    setShowSkipConfirm(false);
                    await handleRestartPractice();
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

export default PracticeStarter;
