import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PracticeShell from "@/components/layout/PracticeShell";
import QuestionContent from "@/components/questions/QuestionContent";
import AnswerOptions from "@/components/questions/AnswerOptions";
import PracticeSummary from "@/components/questions/PracticeSummary";
import SolutionSteps from "@/components/questions/SolutionSteps";
import {
  evaluatePastAssessmentAnswer,
  startPastAssessment,
  submitPastAssessmentAnswer,
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






const normalizePastAssessmentPayload = (response) =>
  response?.data ?? response ?? null;

const resolvePracticeSessionId = (payload) => {
  const candidates = [
    payload?.practice_session_id,
    payload?.practiceSessionId,
    payload?.session?.practice_session_id,
    payload?.session?.practiceSessionId,
    payload?.practice_session?.id,
    payload?.practiceSession?.id,
    payload?.assessment_status?.practice_session_id,
    payload?.assessment_status?.practiceSessionId,
    payload?.attempt?.practice_session_id,
    payload?.attempt?.practiceSessionId,
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      return candidate;
    }
  }

  return null;
};

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

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const buildRouteAssessmentState = (routeStateAssessment, resolvedId) => {
  if (!routeStateAssessment || typeof routeStateAssessment !== "object") {
    return null;
  }

  return {
    assessment_id:
      routeStateAssessment.assessment_id ??
      routeStateAssessment.id ??
      resolvedId,
    title:
      routeStateAssessment.title ??
      routeStateAssessment.name ??
      "Past Assessment",
    duration_minutes:
      routeStateAssessment.duration_minutes ??
      routeStateAssessment.durationMinutes,
    submission_mode:
      routeStateAssessment.submission_mode ??
      routeStateAssessment.submissionMode,
    submit_by: routeStateAssessment.submit_by ?? routeStateAssessment.submitBy,
    questions_count:
      routeStateAssessment.questions_count ??
      routeStateAssessment.total_questions ??
      routeStateAssessment.totalQuestions,
  };
};

const resolveAssessmentEntity = (payload, fallbackAssessment, resolvedId) => {
  const base =
    payload?.assessment ??
    payload?.practice_assessment ??
    payload?.data?.assessment ??
    fallbackAssessment ??
    null;

  if (!base || typeof base !== "object") {
    return fallbackAssessment
      ? fallbackAssessment
      : {
          assessment_id: resolvedId,
          title: "Past Assessment",
          questions: [],
        };
  }

  return {
    ...base,
    assessment_id: base.assessment_id ?? base.id ?? resolvedId,
    title:
      base.title ?? base.name ?? fallbackAssessment?.title ?? "Past Assessment",
    questions:
      base.questions ??
      payload?.questions ??
      payload?.data?.questions ??
      fallbackAssessment?.questions ??
      [],
  };
};

const normalizeSubmitResult = (response) =>
  response?.data?.assessment_result ??
  response?.data?.result ??
  response?.data?.summary ??
  response?.data ??
  response ??
  null;

const PastAssessmentPlayer = () => {
  const { topicId, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedId = topicId ?? id;

  const routeAssessment = useMemo(
    () =>
      buildRouteAssessmentState(
        location?.state?.assessment ?? location?.state?.selectedAssessment,
        resolvedId,
      ),
    [location?.state, resolvedId],
  );

  const [data, setData] = useState(null);
  const [practiceSessionId, setPracticeSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [componentAnswers, setComponentAnswers] = useState({});
  const [algebraFormatByQuestion, setAlgebraFormatByQuestion] = useState({});
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [evaluationByQuestion, setEvaluationByQuestion] = useState({});
  const [firstSubmittedByQuestion, setFirstSubmittedByQuestion] = useState({});
  const [
    lastEvaluatedSignatureByQuestion,
    setLastEvaluatedSignatureByQuestion,
  ] = useState({});
  const [feedbackPopup, setFeedbackPopup] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionLanguage, setSolutionLanguage] = useState("en");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [serverCompleted, setServerCompleted] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [phase, setPhase] = useState("play"); // play | done
  const [dotWindowStart, setDotWindowStart] = useState(0);
  const [dotSlideDirection, setDotSlideDirection] = useState(null);

  const selected = useMemo(
    () => resolveAssessmentEntity(data, routeAssessment, resolvedId),
    [data, routeAssessment, resolvedId],
  );

  const items = useMemo(
    () =>
      Array.isArray(selected?.questions)
        ? selected.questions
        : Array.isArray(data?.questions)
          ? data.questions
          : [],
    [data?.questions, selected?.questions],
  );

  const totalQuestions =
    items.length ||
    Number(selected?.total_questions ?? selected?.questions_count ?? 0);
  const question = items[activeIndex] ?? null;

  const sidebarTopics = useMemo(() => {
    const source = Array.isArray(data?.assessments)
      ? data.assessments
      : selected
        ? [selected]
        : [];

    return source.map((entry) => ({
      ...entry,
      topic_id: entry.assessment_id ?? entry.id,
      topic_name: entry.title ?? entry.name ?? "Past Assessment",
      total_questions:
        entry.total_questions ??
        entry.questions_count ??
        (Array.isArray(entry.questions) ? entry.questions.length : 0),
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
    selectedTopicName: selected?.title ?? "Past Assessment",
    unitCount: data?.total_units_count,
    subjectId: data?.subject_id,
  };

  const getQuestionKey = useCallback(
    (currentQuestion) =>
      currentQuestion?.assessment_question_id ??
      currentQuestion?.question_id ??
      currentQuestion?.id,
    [],
  );

  const loadPastAssessment = useCallback(async () => {
    if (!resolvedId && resolvedId !== 0) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await startPastAssessment(resolvedId);
      const normalized = normalizePastAssessmentPayload(response);
      setData(normalized);
      setPracticeSessionId(resolvePracticeSessionId(normalized));
    } catch (err) {
      setError(err?.message || "Failed to load past assessment.");
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    setData(null);
    setPracticeSessionId(null);
    setError("");
    setActiveIndex(0);
    setAnswers({});
    setComponentAnswers({});
    setAlgebraFormatByQuestion({});
    setAnsweredQuestions({});
    setEvaluationByQuestion({});
    setFirstSubmittedByQuestion({});
    setLastEvaluatedSignatureByQuestion({});
    setFeedbackPopup(null);
    setShowSolution(false);
    setSubmittingAnswer(false);
    setSubmittingFinal(false);
    setShowRestartConfirm(false);
    setServerCompleted(false);
    setSubmission(null);
    setPhase("play");
    setDotWindowStart(0);
    setDotSlideDirection(null);
    void loadPastAssessment();
  }, [loadPastAssessment]);

  useEffect(() => {
    if (!items.length) {
      return;
    }

    const nextAnswers = {};
    const nextComponentAnswers = {};
    const nextFormats = {};
    const nextAnswered = {};
    const nextEvaluations = {};
    const nextFirstSubmitted = {};

    items.forEach((item) => {
      const key = getQuestionKey(item);
      if (!key) return;

      const submitted = normalizeSubmittedAnswer(item.submitted_answer);
      if (submitted.length) {
        const selectedFormat =
          item.submitted_format ??
          item.selected_format ??
          item.answer_format ??
          item.submittedFormat ??
          item.selectedFormat ??
          item.answerFormat ??
          null;
        nextFirstSubmitted[key] = {
          selected_answer: submitted,
          selected_format:
            item.question_type === "algebra"
              ? String(selectedFormat || "")
                  .trim()
                  .toLowerCase() || null
              : null,
        };

        if (item.question_type === "check_box") {
          nextAnswers[key] = submitted;
        } else if (
          item.question_type === "fill_blank" &&
          Array.isArray(item.components) &&
          item.components.length
        ) {
          nextComponentAnswers[key] = buildFillBlankStateFromAnswers(
            item.components,
            submitted,
          );
        } else if (item.question_type === "mcq") {
          nextAnswers[key] = submitted[0] ?? null;
        } else if (item.question_type === "algebra") {
          nextAnswers[key] = submitted;
        } else if (item.question_type === "image_annotation") {
          const fields = Array.isArray(item.annotation_fields)
            ? item.annotation_fields
            : [];
          const values = {};
          fields.forEach((field, index) => {
            const fieldId = field?.id ?? `annotation-${index}`;
            values[fieldId] =
              submitted[index] !== undefined && submitted[index] !== null
                ? submitted[index]
                : "";
          });
          nextComponentAnswers[key] = values;
        } else if (item.question_type === "drag_drop") {
          nextComponentAnswers[key] = normalizeDragDropSubmittedAnswer(
            item,
            submitted,
          );
        } else {
          nextAnswers[key] = submitted[0] ?? "";
        }
      }

      if (item.question_type === "algebra") {
        const rawFormat =
          item.submitted_format ??
          item.selected_format ??
          item.answer_format ??
          item.submittedFormat ??
          item.selectedFormat ??
          item.answerFormat ??
          "";
        if (rawFormat) {
          nextFormats[key] = String(rawFormat).trim().toLowerCase();
        }
      }

      if (item.is_answered) {
        nextAnswered[key] = true;
      }

      if (item.is_answered && typeof item.is_correct === "boolean") {
        nextEvaluations[key] = {
          status: item.is_correct ? "correct" : "wrong",
          isCorrect: item.is_correct,
          attemptNo: Number(item.attempt_no ?? item.attemptNo ?? 1),
        };
      }
    });

    setAnswers(nextAnswers);
    setComponentAnswers(nextComponentAnswers);
    setAlgebraFormatByQuestion(nextFormats);
    setAnsweredQuestions(nextAnswered);
    setEvaluationByQuestion(nextEvaluations);
    setFirstSubmittedByQuestion(nextFirstSubmitted);
    if (
      items.length &&
      items.every((item) => nextAnswered[getQuestionKey(item)])
    ) {
      setServerCompleted(true);
    }
  }, [getQuestionKey, items]);

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
    const timer = window.setTimeout(() => setDotSlideDirection(null), 200);
    return () => window.clearTimeout(timer);
  }, [dotSlideDirection]);

  useEffect(() => {
    if (!feedbackPopup) return;
    const timer = window.setTimeout(() => {
      setFeedbackPopup(null);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [feedbackPopup]);

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

  const hasUserResponse = useCallback(
    (currentQuestion) => {
      if (!currentQuestion) return false;

      const key = getQuestionKey(currentQuestion);
      if (!key) return false;

      if (currentQuestion.question_type === "check_box") {
        const value = answers[key];
        return Array.isArray(value) && value.length > 0;
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
        const value = answers[key];
        return (
          value !== undefined && value !== null && String(value).trim() !== ""
        );
      }

      if (currentQuestion.question_type === "algebra") {
        const value = answers[key];
        if (!Array.isArray(value) || !value.length) return false;
        if (value.some((entry) => !String(entry ?? "").trim())) return false;
        return true;
      }

      if (currentQuestion.question_type === "image_annotation") {
        const fields = Array.isArray(currentQuestion.annotation_fields)
          ? currentQuestion.annotation_fields
          : [];
        const values = componentAnswers[key] || {};
        return fields.some((field, index) => {
          const fieldId = field?.id ?? `annotation-${index}`;
          const value = values[fieldId];
          return (
            value !== undefined && value !== null && String(value).trim() !== ""
          );
        });
      }

      if (currentQuestion.question_type === "drag_drop") {
        const targets = resolveDragDropTargets(currentQuestion);
        const values = componentAnswers[key] || {};
        return targets.some((target) => {
          const value = values[target.id];
          return (
            value !== undefined && value !== null && String(value).trim() !== ""
          );
        });
      }

      if (currentQuestion.question_type === "text_input") {
        const value = answers[key];
        return (
          value !== undefined && value !== null && String(value).trim() !== ""
        );
      }

      return false;
    },
    [answers, componentAnswers, getQuestionKey],
  );

  const getSelectedAnswerForQuestion = useCallback(
    (currentQuestion) => {
      if (!currentQuestion) return [];
      const key = getQuestionKey(currentQuestion);
      if (!key) return [];

      if (currentQuestion.question_type === "check_box") {
        return Array.isArray(answers[key]) ? answers[key] : [];
      }

      if (currentQuestion.question_type === "mcq") {
        const value = answers[key];
        return value !== undefined && value !== null ? [value] : [];
      }

      if (currentQuestion.question_type === "algebra") {
        return Array.isArray(answers[key]) ? answers[key] : [];
      }

      if (currentQuestion.question_type === "fill_blank") {
        if (currentQuestion.components?.length) {
          return buildFillBlankAnswersFromState(
            currentQuestion.components,
            componentAnswers[key] || {},
          );
        }
        const value = answers[key];
        return value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
          ? [value]
          : [];
      }

      if (currentQuestion.question_type === "image_annotation") {
        const fields = Array.isArray(currentQuestion.annotation_fields)
          ? currentQuestion.annotation_fields
          : [];
        const values = componentAnswers[key] || {};
        return fields.map((field, index) => {
          const fieldId = field?.id ?? `annotation-${index}`;
          return values[fieldId] !== undefined && values[fieldId] !== null
            ? values[fieldId]
            : "";
        });
      }

      if (currentQuestion.question_type === "drag_drop") {
        const values = componentAnswers[key] || {};
        return buildDragDropSelectedAnswer(currentQuestion, values);
      }

      const value = answers[key];
      return value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
        ? [value]
        : [];
    },
    [answers, componentAnswers, getQuestionKey],
  );

  const buildEvaluationPayload = useCallback(
    (currentQuestion) => {
      const questionKey = getQuestionKey(currentQuestion);
      if (!questionKey || !practiceSessionId) {
        return null;
      }

      const selectedFormat =
        currentQuestion?.question_type === "algebra"
          ? getAlgebraFormatForQuestion(currentQuestion) || null
          : null;

      return {
        practice_session_id: practiceSessionId,
        assessment_question_id:
          currentQuestion?.assessment_question_id ?? questionKey,
        selected_answer: getSelectedAnswerForQuestion(currentQuestion),
        selected_format: selectedFormat,
      };
    },
    [
      getAlgebraFormatForQuestion,
      getQuestionKey,
      getSelectedAnswerForQuestion,
      practiceSessionId,
    ],
  );

  const buildSubmitPayload = useCallback(() => {
    const answersPayload = items.map((item) => {
      const questionKey = getQuestionKey(item);
      const firstSubmission = questionKey
        ? firstSubmittedByQuestion[questionKey]
        : null;

      const selectedAnswer = firstSubmission?.selected_answer ?? getSelectedAnswerForQuestion(item);
      const selectedFormat =
        item?.question_type === "algebra"
          ? (firstSubmission?.selected_format ?? getAlgebraFormatForQuestion(item) ?? null)
          : null;

      return {
        assessment_question_id: item?.assessment_question_id ?? questionKey,
        selected_answer: selectedAnswer,
        selected_format: selectedFormat,
      };
    });

    return {
      practice_session_id: practiceSessionId,
      answers: answersPayload,
    };
  }, [
    firstSubmittedByQuestion,
    getAlgebraFormatForQuestion,
    getQuestionKey,
    getSelectedAnswerForQuestion,
    items,
    practiceSessionId,
  ]);

  const buildFallbackSubmission = useCallback(() => {
    const correct = Object.values(evaluationByQuestion).filter(
      (entry) => entry?.isCorrect === true,
    ).length;
    const total = totalQuestions;
    return {
      assessment_id: selected?.assessment_id ?? resolvedId,
      correct,
      correct_answers: correct,
      total_questions: total,
      total_marks: total,
      percentage: total ? (correct / total) * 100 : 0,
      submitted_at: new Date().toISOString(),
      answers: items.map((item) => {
        const key = getQuestionKey(item);
        return {
          assessment_question_id: item?.assessment_question_id ?? key,
          selected_answer: getSelectedAnswerForQuestion(item),
          is_correct: evaluationByQuestion[key]?.isCorrect,
        };
      }),
    };
  }, [
    evaluationByQuestion,
    getQuestionKey,
    getSelectedAnswerForQuestion,
    items,
    resolvedId,
    selected?.assessment_id,
    totalQuestions,
  ]);

  const readyToSubmit =
    totalQuestions > 0 &&
    (serverCompleted ||
      items.every((item) => {
        const key = getQuestionKey(item);
        return !!(key && answeredQuestions[key]);
      }));

  const buildQuestionAnswerSignature = useCallback(
    (currentQuestion) => {
      if (!currentQuestion) return "";
      const selectedAnswer = getSelectedAnswerForQuestion(currentQuestion);
      const selectedFormat =
        currentQuestion?.question_type === "algebra"
          ? getAlgebraFormatForQuestion(currentQuestion) || null
          : null;

      return JSON.stringify({
        assessment_question_id:
          currentQuestion?.assessment_question_id ??
          getQuestionKey(currentQuestion),
        selected_answer: selectedAnswer,
        selected_format: selectedFormat,
      });
    },
    [getAlgebraFormatForQuestion, getQuestionKey, getSelectedAnswerForQuestion],
  );

  const moveToNextQuestion = useCallback(
    (answeredMap = answeredQuestions) => {
      if (!items.length) {
        return;
      }

      const nextPendingIndex = items.findIndex((item, index) => {
        if (index <= activeIndex) {
          return false;
        }
        const key = getQuestionKey(item);
        return !(key && answeredMap[key]);
      });

      if (nextPendingIndex >= 0) {
        setActiveIndex(nextPendingIndex);
        return;
      }

      const firstPendingIndex = items.findIndex((item) => {
        const key = getQuestionKey(item);
        return !(key && answeredMap[key]);
      });

      if (firstPendingIndex >= 0) {
        setActiveIndex(firstPendingIndex);
        return;
      }

      if (activeIndex < items.length - 1) {
        setActiveIndex((index) => Math.min(items.length - 1, index + 1));
      }
    },
    [activeIndex, answeredQuestions, getQuestionKey, items],
  );

  const handleEvaluateAnswer = async () => {
    if (
      !question ||
      !practiceSessionId ||
      submittingAnswer ||
      submittingFinal
    ) {
      return;
    }

    const questionKey = getQuestionKey(question);
    if (!questionKey || !hasUserResponse(question)) {
      return;
    }

    const payload = buildEvaluationPayload(question);
    if (!payload) {
      setError("Practice session is missing. Please reload and try again.");
      return;
    }

    setSubmittingAnswer(true);
    setError("");

    try {
      const response = await evaluatePastAssessmentAnswer(resolvedId, payload);
      const result = response?.data ?? response ?? {};
      const isCorrect = !!result?.is_correct;
      const nextAnswered = { ...answeredQuestions, [questionKey]: true };
      const nextAllAnswered = items.every((item) => {
        const key = getQuestionKey(item);
        return !!(key && nextAnswered[key]);
      });

      setAnsweredQuestions(nextAnswered);
      setEvaluationByQuestion((prev) => ({
        ...prev,
        [questionKey]: {
          status: isCorrect ? "correct" : "wrong",
          isCorrect,
          attemptNo: Number(result?.attempt_no ?? result?.attemptNo ?? 1),
          selectedFormat: result?.selected_format ?? payload.selected_format,
        },
      }));
      setLastEvaluatedSignatureByQuestion((prev) => ({
        ...prev,
        [questionKey]: buildQuestionAnswerSignature(question),
      }));
      setFirstSubmittedByQuestion((prev) => {
        if (prev[questionKey]) return prev;
        return {
          ...prev,
          [questionKey]: {
            selected_answer: payload.selected_answer ?? [],
            selected_format: payload.selected_format ?? null,
          },
        };
      });
      setFeedbackPopup({
        status: isCorrect ? "correct" : "wrong",
        attemptNo: Number(result?.attempt_no ?? result?.attemptNo ?? 1),
      });
      const hasCompleted = Boolean(result?.completed) || nextAllAnswered;
      setServerCompleted(hasCompleted);
    } catch (err) {
      setError(err?.message || "Failed to submit answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!practiceSessionId || submittingFinal || !readyToSubmit) {
      return;
    }

    setSubmittingFinal(true);
    setError("");

    try {
      const response = await submitPastAssessmentAnswer(
        resolvedId,
        buildSubmitPayload(),
      );
      const result = normalizeSubmitResult(response);
      const fallback = buildFallbackSubmission();
      const normalizedResult =
        result && typeof result === "object"
          ? {
              ...fallback,
              ...result,
              assessment_id:
                result?.assessment_id ?? selected?.assessment_id ?? resolvedId,
            }
          : fallback;

      setSubmission(normalizedResult);
      setPhase("done");
      emitStudentStatsRefresh();
    } catch (err) {
      setError(err?.message || "Failed to submit past assessment.");
    } finally {
      setSubmittingFinal(false);
    }
  };

  const handleChangeAnswer = (questionKey, value) => {
    setFeedbackPopup(null);
    setShowSolution(false);
    setAnswers((prev) => ({ ...prev, [questionKey]: value }));
  };

  const handleCheckAnswer = async () => {
    if (!question || !hasUserResponse(question)) {
      return;
    }
    await handleEvaluateAnswer();
  };

  const handleNextQuestion = () => {
    setFeedbackPopup(null);
    setShowSolution(false);
    moveToNextQuestion();
  };

  const feedback = question
    ? evaluationByQuestion[getQuestionKey(question)]
    : null;
  const currentQuestionKey = question ? getQuestionKey(question) : null;
  const currentAnswerSignature = question
    ? buildQuestionAnswerSignature(question)
    : "";
  const lastEvaluatedSignature = currentQuestionKey
    ? lastEvaluatedSignatureByQuestion[currentQuestionKey]
    : "";
  const isCurrentAnswerEvaluated =
    !!currentQuestionKey && currentAnswerSignature === lastEvaluatedSignature;
  const isCurrentAnswerCorrect =
    !!feedback?.isCorrect && isCurrentAnswerEvaluated;
  const handleRestart = () => {
    setData(null);
    setPracticeSessionId(null);
    setError("");
    setActiveIndex(0);
    setAnswers({});
    setComponentAnswers({});
    setAlgebraFormatByQuestion({});
    setAnsweredQuestions({});
    setEvaluationByQuestion({});
    setFirstSubmittedByQuestion({});
    setLastEvaluatedSignatureByQuestion({});
    setFeedbackPopup(null);
    setSubmittingAnswer(false);
    setSubmittingFinal(false);
    setServerCompleted(false);
    setSubmission(null);
    setPhase("play");
    setDotWindowStart(0);
    setDotSlideDirection(null);
    void loadPastAssessment();
  };

  return (
    <PracticeShell
      sidebarData={sidebarData}
      sidebarMeta={sidebarMeta}
      sidebarType="assessment"
      onSelectTopic={(assessmentId) => {
        const selectedSidebarAssessment = sidebarTopics.find(
          (entry) =>
            String(entry?.topic_id ?? "") === String(assessmentId ?? ""),
        );
        navigate(`/student/challenge/assessment/${assessmentId}/starter/past`, {
          replace: true,
          state: {
            assessment: {
              assessment_id: assessmentId,
              title: selectedSidebarAssessment?.topic_name,
              questions_count: selectedSidebarAssessment?.total_questions,
              duration_minutes: selectedSidebarAssessment?.duration_minutes,
              submission_mode: selectedSidebarAssessment?.submission_mode,
              submit_by: selectedSidebarAssessment?.submit_by,
            },
          },
        });
      }}
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
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Past Assessment
                </p>
                <h1 className="text-3xl font-bold text-slate-900">
                  {selected?.title || "Past Assessment"}
                </h1>
                {selected?.submit_by ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Submit by: {formatDateTime(selected.submit_by)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className={`question-area h-full ${
              phase === "done" || phase === "intro" ? "" : "mx-auto w-[60%]"
            }`}
          >
            {loading ? (
              <p className="flex justify-center gap-3 py-10 text-slate-500">
                <Loader2 className="animate-spin" />
                Loading past assessment...
              </p>
            ) : null}

            {error ? (
              <p className="flex justify-center py-4 text-center text-red-600">
                {error}
              </p>
            ) : null}

            {!loading && phase === "play" && !submission ? (
              <>
                <div className="space-y-6 py-6 question-body-main">
                  {question ? (
                    <>
                      <QuestionContent
                        question={question}
                        showTranslateAction
                        selectedLanguage={solutionLanguage}
                        onLanguageChange={setSolutionLanguage}
                      />
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
                            const key = getQuestionKey(question);
                            if (!key) return prev;
                            const existing = prev[key] || {};
                            return {
                              ...prev,
                              [key]: { ...existing, [componentId]: value },
                            };
                          })
                        }
                        evaluationStatus={feedback?.status || null}
                      />
                      <SolutionSteps
                        steps={question?.solution_steps || []}
                        show={showSolution}
                        selectedLanguage={solutionLanguage}
                      />
                    </>
                  ) : (
                    <p className="py-10 text-center text-slate-600">
                      No questions available.
                    </p>
                  )}
                </div>
              </>
            ) : null}

            {!loading && phase === "done" && submission ? (
              <div className="space-y-4 h-full">
                <PracticeSummary
                  result={submission}
                  successMessage="Past Assessment submit successfully"
                  hideUnitFlow
                />
              </div>
            ) : null}
          </div>
        </div>

        {phase === "play" && !submission ? (
          <div className="question-footer-bar">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 ml-auto question-progress-holder">
                <div className="text-sm font-semibold text-slate-700">
                  {totalQuestions === 0 ? 0 : activeIndex + 1} of{" "}
                  {totalQuestions}
                </div>
                <div className="question-progress-dots">
                  {totalDots > DOT_WINDOW_SIZE ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDotSlideDirection("left");
                        setDotWindowStart((prev) => Math.max(0, prev - 1));
                      }}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900"
                      aria-label="Previous questions"
                    >
                      {"<"}
                    </button>
                  ) : null}
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
                      .map((item, index) => {
                        const realIndex = dotWindowStart + index;
                        const key = getQuestionKey(item);
                        const status =
                          evaluationByQuestion[key]?.status === "wrong"
                            ? "first-wrong"
                            : answeredQuestions[key]
                              ? "answered"
                              : "pending";

                        return (
                          <span
                            key={key ?? realIndex}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setFeedbackPopup(null);
                              setActiveIndex(realIndex);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setFeedbackPopup(null);
                                setActiveIndex(realIndex);
                              }
                            }}
                            className={`dot ${status} ${
                              realIndex === activeIndex ? "active" : ""
                            } cursor-pointer`}
                          >
                            {realIndex + 1}
                          </span>
                        );
                      })}
                  </div>
                  {totalDots > DOT_WINDOW_SIZE ? (
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
                      {">"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowRestartConfirm(true)}
                  disabled={submittingAnswer || submittingFinal}
                  className="px-4 py-2 rounded-md border cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Restart
                </button>
                <div className="relative flex items-center gap-3">
                  {readyToSubmit ? (
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      disabled={!question || submittingAnswer || submittingFinal}
                      className="px-4 py-2 rounded-md cursor-pointer bg-[#AB474B] hover:bg-[#c4474b] text-white font-semibold disabled:opacity-60"
                    >
                      {submittingFinal ? "Submitting..." : "Submit"}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={isCurrentAnswerCorrect ? handleNextQuestion : handleCheckAnswer}
                        disabled={
                          !question ||
                          submittingAnswer ||
                          submittingFinal ||
                          (!isCurrentAnswerCorrect && !hasUserResponse(question))
                        }
                        className={
                          isCurrentAnswerCorrect
                            ? "px-4 py-2 rounded-md cursor-pointer bg-[#AB474B] hover:bg-[#c4474b] text-white font-semibold disabled:opacity-60"
                            : "px-4 py-2 rounded-md cursor-pointer bg-[#AB474B] hover:bg-[#c4474b] text-white font-semibold disabled:opacity-60"
                        }
                      >
                        {submittingAnswer
                          ? "Checking..."
                          : isCurrentAnswerCorrect
                            ? "Next"
                            : "Check"}
                      </button>
                    </>
                  )}

                  {feedbackPopup ? (
                    <div className="absolute bottom-full right-0 z-20 mb-2 w-72 rounded-md border border-slate-200 bg-white px-5 py-3 text-sm shadow-lg">
                      <button
                        type="button"
                        aria-label="Close feedback"
                        className="absolute top-2 right-2 text-slate-500 hover:text-slate-700"
                        onClick={() => setFeedbackPopup(null)}
                      >
                        X
                      </button>
                      {feedbackPopup.status === "correct" ? (
                        <div className="flex gap-4 items-center">
                          <span className="inline-flex h-[70px] w-[70px] items-center justify-center rounded-full bg-green-600 text-white">
                            <Check size={28} />
                          </span>
                          <div>
                            <h1 className="text-[17px] font-semibold">
                              Great work!
                            </h1>
                            <span className="text-[16px] text-slate-600">
                              You got it. Onward!
                            </span>
                            {question?.solution_steps?.length ? (
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
                        <div className="flex gap-4">
                          <div className="w-full">
                            <h1 className="text-[17px] font-semibold">
                              Not quite yet...
                            </h1>
                            <span className="text-[16px] text-slate-600">
                              Give it another try
                            </span>
                            {question?.solution_steps?.length ? (
                              <button
                                className="mt-1 text-[16px] text-gray-600 rounded-sm font-semibold cursor-pointer flex gap-3 hover:underline"
                                onClick={() => setShowSolution(true)}
                              >
                                See the solution
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {phase === "done" && submission ? (
          <div className="question-footer-bar">
            <div className="flex items-center justify-end gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowRestartConfirm(true)}
                  className="px-4 py-2 rounded-md border cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Restart
              </button>
            </div>
          </div>
        ) : null}

        {showRestartConfirm ? (
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
                  onClick={() => setShowRestartConfirm(false)}
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-[#AB474B] text-white hover:bg-[#c4474b]"
                  onClick={() => {
                    setShowRestartConfirm(false);
                    handleRestart();
                  }}
                >
                  Yes, sure
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PracticeShell>
  );
};

export default PastAssessmentPlayer;
