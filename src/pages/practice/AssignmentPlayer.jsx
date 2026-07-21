import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PracticeShell from "@/components/layout/PracticeShell";
import QuestionContent from "@/components/questions/QuestionContent";
import AnswerOptions from "@/components/questions/AnswerOptions";
import QuizSummary from "@/components/questions/QuizSummary";
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
import masteryAssignmentBG from "@/assets/book-icons.png";
import {
  getQuestionPlayerDataAssignmentData,
  addAssignmentResults,
} from "@/api/questionPlayerApi";
import { emitStudentStatsRefresh } from "@/utils/studentStatsEvents";
import { Check, CheckCheck, Loader2 } from "lucide-react";

const AssignmentPlayer = () => {
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
  const [timeSpent, setTimeSpent] = useState(0);

  const resolvedId = id ?? topicId;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getQuestionPlayerDataAssignmentData(resolvedId);
        setData(res?.data ?? res ?? null);
      } catch (err) {
        setError(err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resolvedId]);

  // reset local state when switching assignment
  useEffect(() => {
    setData(null);
    setActiveIndex(0);
    setAnswers({});
    setComponentAnswers({});
    setAlgebraFormatByQuestion({});
    setAnsweredQuestions({});
    setSkippedQuestions({});
    setPhase("intro");
    setSubmission(null);
    setError("");
    setTimeSpent(0);
  }, [resolvedId]);

  const selected = useMemo(() => data?.selected_assignment ?? null, [data]);

  const items = useMemo(
    () => (selected?.questions ? selected.questions : []),
    [selected]
  );

  const totalQuestions = items.length;
  const question = items[activeIndex];

  const assignmentStatus = selected?.assignment_status;

  // Attempted handling
  useEffect(() => {
    if (!selected) return;
    if (String(selected?.assignment_id ?? "") !== String(resolvedId ?? "")) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const attemptedParam = params.get("attempted") === "true";
    const alreadyAttempted =
      assignmentStatus?.attempted === true ||
      selected?.can_attempt === false ||
      (attemptedParam && assignmentStatus?.attempted === true);

    if (!alreadyAttempted || submission) return;

    const statusData = assignmentStatus || {};
    const totalFromStatus =
      statusData.total_questions ?? selected?.total_questions ?? totalQuestions;
    const correctFromStatus =
      statusData.correct_answers ?? statusData.score ?? 0;
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
      assignment_id: selected?.assignment_id,
      submission_id: statusData.submission_id,
      correct: correctFromStatus,
      wrong_answers: wrongFromStatus,
      total_questions: totalFromStatus,
      total_marks: statusData.total_marks ?? totalFromStatus,
      percentage: percentageFromStatus,
      status: statusData.status ?? "Attempted",
      completed_at: statusData.submitted_at,
    });
    setPhase("done");
  }, [assignmentStatus, selected, submission, totalQuestions]);

  // track time spent in play phase
  useEffect(() => {
    if (phase !== "play" || submission) return;
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, submission]);

  const sidebarTopics = useMemo(() => {
    const raw = data?.assignments || [];
    return raw.map((entry) => ({
      ...entry,
      topic_id: entry.assignment_id ?? entry.id,
      topic_name: entry.title ?? entry.name ?? "Assignment",
      mastery_level: entry.type ?? "assignment",
      total_questions: entry.total_questions ?? entry.questions_count ?? 0,
    }));
  }, [data]);

  const sidebarData = {
    topics: sidebarTopics,
    selectedTopicId: selected?.assignment_id,
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
      setSubmission(null);
    }
  };

  const buildPayload = () => ({
    time_spent: timeSpent,
    answers: items.map((q) => {
      const key = q.assignment_question_id ?? q.question_id ?? q.id;
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
        question_id: q.assignment_question_id ?? key,
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
    question?.assignment_question_id ?? question?.question_id ?? question?.id;

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
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const res = await addAssignmentResults(resolvedId, payload);
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
      sidebarType="assignment"
      onSelectTopic={(tid) => {
        navigate(`/student/challenge/assignment/${tid}/starter`, {
          replace: true,
        });
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
                  {selected?.title || data?.unit_name || "Assignment"}
                </h1>
              </div>
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
            {!loading && !error && (
              <>
                {phase === "intro" && !submission && (
                  <div
                    className="start-screen"
                    style={{ backgroundImage: `url(${masteryAssignmentBG})` }}
                  >
                    <h2 className="text-[36px] font-semibold text-white mb-3">
                      Ready to begin?
                    </h2>
                    <p className="text-white text-[20px] mb-7">
                      {totalQuestions} question{totalQuestions === 1 ? "" : "s"}{" "}
                      in {selected?.title || "Assignment"}
                    </p>
                  </div>
                )}

                {phase === "play" && !submission && (
                  <>
                    {question ? (
                      <div className="question-body-main">
                        <QuestionContent
                          question={question}
                          showTranslateAction
                        />
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
                            // <h1 className="text-[17px] font-bold pb-3 mt-[1rem] border-b border-gray-300">
                            //   {label}
                            // </h1>
                            <></>
                          );
                        })()}
                        <AnswerOptions
                          question={question}
                          selectedFormat={(() => {
                            const key = getQuestionKey(question);
                            return key
                              ? algebraFormatByQuestion[key]
                              : undefined;
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
                              question.assignment_question_id ??
                                question.question_id
                            ] || ""
                          }
                          onChange={(val) =>
                            handleChangeAnswer(
                              question.assignment_question_id ??
                                question.question_id,
                              val
                            )
                          }
                          componentsState={
                            componentAnswers[
                              question.assignment_question_id ??
                                question.question_id
                            ] || {}
                          }
                          onChangeComponent={(id, val) =>
                            setComponentAnswers((prev) => {
                              const q = items[activeIndex];
                              if (q) clearSkipped(q);
                              const qKey =
                                q?.assignment_question_id ?? q?.question_id;
                              if (!qKey) return prev;
                              const existing = prev[qKey] || {};
                              return {
                                ...prev,
                                [qKey]: {
                                  ...existing,
                                  [id]: val,
                                },
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
                    {assignmentStatus?.attempted && (
                      <div className="rounded-md border flex items-center gap-3 border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 mx-auto max-w-3/4">
                        <CheckCheck size={18} /> You have already attempted this
                        assignment. Here are your stats.
                      </div>
                    )}
                    <QuizSummary result={submission} type="assignment" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!submission && (
          <div className="question-footer-bar">
            {phase === "intro" && (
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
                <div className="flex items-center gap-2" />

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
                    disabled={submitting}
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

export default AssignmentPlayer;

