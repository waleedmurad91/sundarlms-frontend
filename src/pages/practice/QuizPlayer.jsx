import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PracticeShell from "@/components/layout/PracticeShell";
import QuestionContent from "@/components/questions/QuestionContent";
import AnswerOptions from "@/components/questions/AnswerOptions";
import QuizSummary from "@/components/questions/QuizSummary";
import masteryAssignmentBG from "@/assets/book-icons.png";
import {
  getQuestionPlayerDataQuizData,
  addQuizResults,
} from "@/api/questionPlayerApi";
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
import { Check, CheckCheck, Loader2 } from "lucide-react";

const QuizPlayer = () => {
  const { id, type, topicId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const resolvedId = id ?? topicId;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getQuestionPlayerDataQuizData(resolvedId);
        setData(res?.data ?? res ?? null);
      } catch (err) {
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resolvedId]);

  useEffect(() => {
    setActiveIndex(0);
    setAnswers({});
    setComponentAnswers({});
    setAlgebraFormatByQuestion({});
    setAnsweredQuestions({});
    setSkippedQuestions({});
    setSubmission(null);
    setPhase("intro");
  }, [resolvedId]);

  const selected = useMemo(() => data?.selected_quiz ?? null, [data]);
  const items = useMemo(
    () => (selected?.questions ? selected.questions : []),
    [selected]
  );
  const totalQuestions = items.length;
  const question = items[activeIndex];
  const totalSeconds =
    (selected?.timer_per_question ? Number(selected.timer_per_question) : 0) *
    (totalQuestions || 0);
  const quizStatus = selected?.quiz_status;
  const deadlineInfo = useMemo(() => {
    if (!selected?.deadline) return { passed: false, label: "" };
    const dt = new Date(selected.deadline);
    if (Number.isNaN(dt.getTime())) return { passed: false, label: "" };
    return {
      passed: dt.getTime() < Date.now(),
      label: dt.toLocaleString(),
    };
  }, [selected?.deadline]);
  const deadlinePassed = deadlineInfo.passed && !submission;

  // Attempted handling
  useEffect(() => {
    if (!selected) return;
    const params = new URLSearchParams(window.location.search);
    const attemptedParam = params.get("attempted") === "true";
    const alreadyAttempted =
      quizStatus?.attempted ||
      selected?.can_attempt === false ||
      attemptedParam;

    // If flagged attempted but status not loaded yet, wait for status to arrive.
    if (!quizStatus && alreadyAttempted) return;
    if (!alreadyAttempted || submission) return;

    const statusData = quizStatus || {};
    const totalFromStatus =
      statusData.total_questions ??
      statusData.total_marks ??
      selected?.total_questions ??
      totalQuestions;
    const correctFromStatus =
      statusData.correct_answers ?? statusData.correct ?? statusData.score ?? 0;
    const wrongFromStatus =
      statusData.wrong_answers ??
      (totalFromStatus ? Math.max(totalFromStatus - correctFromStatus, 0) : 0);
    const percentageFromStatus =
      statusData.percentage !== undefined && statusData.percentage !== null
        ? statusData.percentage
        : totalFromStatus
        ? (correctFromStatus / totalFromStatus) * 100
        : 0;

    setSubmission({
      quiz_id: selected?.quiz_id,
      attempt_id: statusData.attempt_id,
      correct: correctFromStatus,
      wrong_answers: wrongFromStatus,
      total_questions: totalFromStatus,
      total_marks: statusData.total_marks ?? totalFromStatus,
      percentage: percentageFromStatus,
      status: statusData.status ?? "Attempted",
      completed_at: statusData.completed_at,
    });
    setPhase("done");
    setTimeLeft(null);
  }, [quizStatus, selected, submission, totalQuestions]);

  // Timer init
  useEffect(() => {
    if (totalSeconds > 0) setTimeLeft(totalSeconds);
    else setTimeLeft(null);
  }, [totalSeconds]);

  // Timer countdown
  useEffect(() => {
    if (phase !== "play" || submission || timeLeft === null || deadlinePassed)
      return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, submission, timeLeft, deadlinePassed]);

  const sidebarTopics = useMemo(() => {
    const raw = data?.quizzes || [];
    return raw.map((entry) => ({
      ...entry,
      topic_id: entry.quiz_id ?? entry.id,
      topic_name: entry.title ?? entry.name ?? "Assessment",
      total_questions: entry.total_questions ?? entry.questions_count ?? 0,
    }));
  }, [data]);

  const sidebarData = {
    topics: sidebarTopics,
    selectedTopicId: selected?.quiz_id,
    topicCount: sidebarTopics.length,
    subjectId: data?.subject_id,
    unitId: data?.unit_id,
  };

  const sidebarMeta = {
    gradeName: data?.grade_name,
    subjectName: data?.subject_name,
    unitName: data?.unit_name,
    selectedTopicName: selected?.title,
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
  }, [items]);

  const handleChangeAnswer = (qid, val) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
    const question = items[activeIndex];
    if (question) clearSkipped(question);
  };

  const handleNext = () => {
    const question = items[activeIndex];
    if (question) {
      if (hasUserResponse(question)) {
        const key = getQuestionKey(question);
        if (key) setAnsweredQuestions((prev) => ({ ...prev, [key]: true }));
        clearSkipped(question);
      } else if (!isQuestionAnswered(question)) {
        markSkipped(question);
      }
    }
    if (activeIndex < totalQuestions - 1) {
      setActiveIndex((i) => i + 1);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const buildPayload = () => ({
    answers: items.map((q) => {
      const key = q.quiz_question_id ?? q.question_id ?? q.id;
      let selected_answer = [];
      let selected_format = "";
      if (q.question_type === "check_box") {
        selected_answer = Array.isArray(answers[key]) ? answers[key] : [];
      } else if (q.question_type === "mcq") {
        const mcqValue = Array.isArray(answers[key])
          ? answers[key][answers[key].length - 1]
          : answers[key];
        selected_answer = mcqValue ? [mcqValue] : [];
      } else if (q.question_type === "algebra") {
        selected_answer = Array.isArray(answers[key]) ? answers[key] : [];
        selected_format = getAlgebraFormatForQuestion(q);
      } else if (q.question_type === "drag_drop") {
        const compMap = componentAnswers[key] || {};
        selected_answer = buildDragDropSelectedAnswer(q, compMap);
      } else if (q.question_type === "image_annotation") {
        const fields = Array.isArray(q.annotation_fields)
          ? q.annotation_fields
          : [];
        const compMap = componentAnswers[key] || {};
        selected_answer = fields.map((field, fieldIdx) => {
          const id = field?.id ?? `annotation-${fieldIdx}`;
          return compMap[id] !== undefined && compMap[id] !== null
            ? compMap[id]
            : "";
        });
      } else {
        if (q.components?.length) {
          selected_answer = buildFillBlankAnswersFromState(
            q.components,
            componentAnswers[key] || {}
          );
        } else {
          const raw = answers[key];
          const resolved =
            Array.isArray(raw) && raw.length ? raw[raw.length - 1] : raw ?? "";
          selected_answer = resolved ? [resolved] : [];
        }
      }
      const entry = {
        quiz_question_id: q.quiz_question_id,
        selected_answer,
      };
      if (
        q.question_type === "algebra" &&
        selected_format &&
        Array.isArray(selected_answer) &&
        selected_answer.length
      ) {
        entry.selected_format = selected_format;
      }
      return entry;
    }),
  });

  const getQuestionKey = (question) =>
    question?.quiz_question_id ?? question?.question_id ?? question?.id;

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
          componentAnswers[key] || {}
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

  const isQuestionAnswered = (question) => {
    if (!question) return false;
    const key = getQuestionKey(question);
    return !!(key && answeredQuestions[key]);
  };

  const markSkipped = (question) => {
    if (!question) return;
    const key = getQuestionKey(question);
    if (!key) return;
    if (hasUserResponse(question) || isQuestionAnswered(question)) return;
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
    if (isQuestionAnswered(question)) return "answered";
    const key = getQuestionKey(question);
    if (key && skippedQuestions[key]) return "skipped";
    return "pending";
  };

  const handleSubmit = async () => {
    if (submitting || deadlinePassed) return;
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const res = await addQuizResults(resolvedId, payload);
      setSubmission(res?.data ?? res ?? null);
      setPhase("done");
      emitStudentStatsRefresh();
    } catch (err) {
      setError(err?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const progressLabel = `${activeIndex + 1}/${totalQuestions}`;
  const isLast = activeIndex === totalQuestions - 1;

  return (
    <PracticeShell
      sidebarData={sidebarData}
      sidebarMeta={sidebarMeta}
      sidebarType="quiz"
      onSelectTopic={(tid) => {
        const params = new URLSearchParams(window.location.search);
        const attempted = params.get("attempted");
        navigate(
          `/student/challenge/quiz/${tid}/starter${
            attempted ? "?attempted=true" : ""
          }`,
          { replace: true }
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
                <h1 className="text-3xl font-bold text-slate-900">
                  {selected?.title || data?.unit_name || "Assessment"}
                </h1>
              </div>
              {totalSeconds > 0 && (
                <div className="ml-auto rounded-md bg-slate-100 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800">
                  Time Left: {formatTime(timeLeft)}
                </div>
              )}
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
                  {selected?.title || "Quiz"}
                </p>
              </div>
            )}
            {deadlinePassed && !submission && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center mx-auto max-w-2xl">
                <h2 className="text-2xl font-semibold text-amber-900 mb-2">
                  Deadline passed
                </h2>
                <p className="text-amber-800">
                  This quiz is closed for submissions.{" "}
                  {deadlineInfo.label
                    ? `Deadline was ${deadlineInfo.label}.`
                    : ""}
                </p>
              </div>
            )}

            {phase === "play" && !submission && (
              <>
                {question ? (
                  <div className="space-y-6 question-body-main">
                    <QuestionContent question={question} showTranslateAction />
                    {(() => {
                      if (
                        !question ||
                        question.question_type === "fill_blank" ||
                        question.question_type === "image_annotation" ||
                        question.question_type === "drag_drop"
                      ) {
                        return null;
                      }
                      const label =
                        question.question_type === "check_box"
                          ? "Choose multiple answers:"
                          : question.question_type === "algebra"
                          ? "Choose answer format:"
                          : "Choose single answer:";
                      return (
                        // <h1 className="text-[17px] font-bold pb-3 mt-[4rem] border-b border-gray-300">
                        //   {label}
                        // </h1>
                        <></>
                      );
                    })()}
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
                      value={
                        answers[
                          question.quiz_question_id ?? question.question_id
                        ] || ""
                      }
                      onChange={(val) =>
                        handleChangeAnswer(
                          question.quiz_question_id ?? question.question_id,
                          val
                        )
                      }
                      componentsState={
                        componentAnswers[
                          question.quiz_question_id ?? question.question_id
                        ] || {}
                      }
                      onChangeComponent={(id, val) =>
                        setComponentAnswers((prev) => {
                          const q = items[activeIndex];
                          if (q) clearSkipped(q);
                          const qKey =
                            q?.quiz_question_id ?? q?.question_id ?? q?.id;
                          if (!qKey) return prev;
                          const existing = prev[qKey] || {};
                          return {
                            ...prev,
                            [qKey]: { ...existing, [id]: val },
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
                {selected?.quiz_status?.attempted && (
                  <div className="rounded-md border flex items-center gap-3 border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 mx-auto max-w-3/4">
                    <CheckCheck size={18} /> You have already attempted this
                    quiz. Here are your stats.
                  </div>
                )}
                <QuizSummary result={submission} type="quiz" />
              </div>
            )}
          </div>
        </div>

        {!submission && (
          <div className="question-footer-bar">
            {phase === "intro" && !deadlinePassed && (
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setPhase("play")}
                  className="px-5 py-2.5 bg-[#AB474B] hover:bg-[#c4474b] cursor-pointer text-white font-semibold rounded-md  transition"
                >
                  Let&apos;s go
                </button>
              </div>
            )}
            {phase === "play" && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col items-center gap-2 mx-auto">
                  <div className="text-sm font-semibold text-slate-700">
                    {progressLabel}
                  </div>
                  {/* <div className="question-progress-dots">
                    {items.map((question, idx) => {
                      const status = getQuestionStatus(question);
                      return (
                        <span
                          key={idx}
                          className={`dot ${status} ${
                            idx === activeIndex ? "active" : ""
                          }`}
                        >
                          {status === "answered" ? (
                            <Check size={12} />
                          ) : (
                            <span
                              className={`dot-indicator ${
                                status === "skipped" ? "skipped" : "pending"
                              }`}
                            />
                          )}
                        </span>
                      );
                    })}
                  </div> */}
                </div>

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    onClick={() => {
                      if (activeIndex > 0) {
                        setActiveIndex((i) => Math.max(0, i - 1));
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
                        const question = items[activeIndex];
                        if (question) {
                          if (hasUserResponse(question)) {
                            const key = getQuestionKey(question);
                            if (key)
                              setAnsweredQuestions((prev) => ({
                                ...prev,
                                [key]: true,
                              }));
                            clearSkipped(question);
                          } else if (!isQuestionAnswered(question)) {
                            markSkipped(question);
                          }
                        }
                        handleSubmit();
                      } else {
                        handleNext();
                      }
                    }}
                    className="px-4 py-2 rounded-md bg-[#AB474B] hover:bg-[#c4474b] cursor-pointer text-white font-semibold  disabled:opacity-60"
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

export default QuizPlayer;

