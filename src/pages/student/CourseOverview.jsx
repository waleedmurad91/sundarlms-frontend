import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Info, Loader2, SquareStack } from "lucide-react";
import PracticeSidebarLayout from "@/layouts/PracticeSidebarLayout";
import { getStudentUnitOverview } from "@/api/studentPracticeApi";
import { CourseOverviewHero } from "@/components/CourseOverviewHero";
import CustomPopover from "@/components/CustomPopover";
import SpectrumInnerIcon from "@/components/SpectrumInnerIcon";
import { isPracticeOnlyTopic } from "@/utils/topicQuestionCounts";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import unitPlaceholder from "@/assets/unit-placeholder.png";

const STATUS_VARIANTS = {
  mastery: {
    key: "mastery",
    label: "Mastery",
    matchers: ["mastery", "mastered"],
    iconClasses: "spectrum-icon mastery-icon-spectrum",
    innerIconClass: "mastery-icon",
    popoverTitle: "Mastered (100 pts)",
    popoverContent:
      "Earned by getting a Proficient skill correct on the unit test.",
  },
  proficient: {
    key: "proficient",
    label: "Proficient",
    matchers: ["proficient"],
    iconClasses: "spectrum-icon proficient-icon-spectrum",
    popoverTitle: "Proficient (80 pts)",
    popoverContent:
      "Answer 100% of the questions in a practice set correctly or get a Familiar skill correct during a quiz or unit test.",
  },
  familiar: {
    key: "familiar",
    label: "Familiar",
    matchers: ["familiar"],
    iconClasses: "spectrum-icon familiar-icon-spectrum",
    innerIconClass: "familiar-icon",
    popoverTitle: "Familiar (50 pts)",
    popoverContent:
      "Get 70% or more correct when practicing a skill or answer a related quiz/unit test question correctly.",
  },
  attempted: {
    key: "attempted",
    label: "Attempted",
    matchers: ["attempted"],
    iconClasses: "spectrum-icon attempted-icon-spectrum",
    innerIconClass: "attempted-icon",
    popoverTitle: "Attempted (0 pts)",
    popoverContent:
      "Less than 70% correct while practicing or incorrect answers during quiz and unit test attempts.",
  },
  notStarted: {
    key: "notStarted",
    label: "Not Started",
    matchers: ["notstarted"],
    iconClasses: "spectrum-icon notStarted-icon-spectrum",
    popoverTitle: "Not Started (0 pts)",
    popoverContent:
      "This is the starting point. Practice skills or jump into assessments when you feel confident.",
  },
  practice: {
    key: "practice",
    label: "Practice",
    iconClasses: "spectrum-icon practice-icon-spectrum",
    usePracticeImage: true,
    popoverTitle: "Practice",
    popoverContent:
      "Practice questions help you build familiarity with a skill before taking the challenge.",
  },
  quiz: {
    key: "quiz",
    label: "Quiz",
    iconClasses: "spectrum-icon quiz-icon-spectrum",
    innerIconClass: "quiz-icon",
    popoverTitle: "Quiz checkpoint",
    popoverContent:
      "Quick check-in that covers a handful of skills in the unit.",
  },
  unitTest: {
    key: "unitTest",
    label: "Unit Test",
    iconClasses: "spectrum-icon unitTest-icon-spectrum",
    innerIconClass: "unitTest-icon",
    popoverTitle: "Unit test",
    popoverContent: "Full assessment covering every skill inside the unit.",
  },
};

const STATUS_LABELS = {
  mastery: "Mastered",
  proficient: "Proficient",
  familiar: "Familiar",
  attempted: "Attempted",
  notstarted: "Not Started",
  quiz: "Quiz",
  unitTest: "Unit Test",
};

const normalizeFlow = (flow = []) =>
  flow
    .map((entry, idx) => {
      if (!entry || typeof entry !== "object") return null;
      const type = entry.type;
      const data = entry.data ?? entry.topic ?? {};
      if (type === "topic") {
        return {
          id: `topic-${data.topic_id ?? idx}`,
          type: "topic",
          label: data.topic_name ?? "Topic",
          mastery_level: data.mastery_level ?? "Not Started",
          total_questions: data.total_questions ?? 0,
          total_questions_practice: data.total_questions_practice ?? 0,
          total_questions_challenge: data.total_questions_challenge ?? 0,
          has_challenge: data.has_challenge ?? data.hasChallenge,
          practiceOnly: isPracticeOnlyTopic(data),
          link: data.topic_id
            ? `/student/practice/mastery/${data.topic_id}/starter`
            : null,
        };
      }
      if (type === "quiz") {
        return {
          id: `quiz-${data.quiz_id ?? idx}`,
          type: "quiz",
          label: data.title ?? "Quiz",
          mastery_level: data.attempted ? "Attempted" : "Not Started",
          total_questions: data.total_questions ?? 0,
          link: data.quiz_id
            ? `/student/challenge/quiz/${data.quiz_id}/starter${
                data.attempted ? "?attempted=true" : ""
              }`
            : null,
        };
      }
      if (type === "unit_test") {
        return {
          id: `unit-${data.unit_test_id ?? idx}`,
          type: "unitTest",
          label: data.title ?? "Unit Test",
          mastery_level: data.attempted ? "Attempted" : "Not Started",
          total_questions: data.total_questions ?? 0,
          link: data.unit_test_id
            ? `/student/challenge/unit/${data.unit_test_id}/starter${
                data.attempted ? "?attempted=true" : ""
              }`
            : null,
        };
      }
      return null;
    })
    .filter(Boolean);

const badgeClass = (type) => {
  if (type === "quiz") return "quiz-icon-spectrum";
  if (type === "unitTest") return "unitTest-icon-spectrum";
  return `spectrum-icon ${type.toLowerCase()}-icon-spectrum`;
};

const normalizeMasteryLevel = (value) => {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  if (normalized.includes("mastery") || normalized === "mastered")
    return "mastery";
  if (normalized.includes("proficient")) return "proficient";
  if (normalized.includes("familiar")) return "familiar";
  if (normalized.includes("attempt")) return "attempted";
  return "notStarted";
};

const CourseOverview = () => {
  const { subjectId, unitId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [activeUnitId, setActiveUnitId] = React.useState(null);

  const getAssignmentCoverSrc = (images) => {
    const path = extractFirstImagePath(images);
    return buildBackendFileUrl(path);
  };

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const courseId = subjectId || unitId;
        const res = await getStudentUnitOverview(courseId);
        const payload = res?.data ?? res ?? null;
        setData(payload);
        const firstUnit = payload?.units?.[0];
        if (firstUnit) setActiveUnitId(unitId ? String(unitId) : null);
      } catch (err) {
        setError(err?.message || "Failed to load course overview.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subjectId, unitId]);

  const units = data?.units ?? [];
  const activeUnit =
    units.find(
      (u) => String(u.unit_id ?? u.key ?? "") === String(activeUnitId ?? ""),
    ) || units[0];
  const flow = normalizeFlow(activeUnit?.flow || []);

  const sidebarProps = React.useMemo(
    () => ({
      units: units.map((u, idx) => ({
        ...u,
        key: u.unit_id ?? idx,
      })),
      activeUnitKey: activeUnitId,
      onSelectUnit: (key) => {
        setActiveUnitId(key);
        navigate(`/student/practice/unit/${key}`);
      },
      subjectName: data?.subject_name,
      subjectId: data?.subject_id,
      gradeName: data?.grade_name,
      gradeId: data?.grade_id,
      totalUnits: units.length,
      totalSkills: units.reduce((sum, u) => sum + (u.flow?.length ?? 0), 0),
      onSelectCourse: () => {
        setActiveUnitId(null);
        if (data?.subject_id) {
          navigate(`/student/practice/course-overview/${data.subject_id}`);
        }
      },
    }),
    [
      units,
      activeUnitId,
      data?.subject_name,
      data?.subject_id,
      data?.grade_name,
      data?.grade_id,
      navigate,
    ],
  );

  return (
    <PracticeSidebarLayout sidebarProps={sidebarProps}>
      {loading && (
        <div className="min-h-[70vh] flex items-center justify-center text-slate-500">
          <Loader2 className="animate-spin mr-2" /> Loading...
        </div>
      )}
      {error && <div className="text-red-600 text-center">Error: {error}</div>}
      {!loading && !error && data && (
        <div className="space-y-4">
          <CourseOverviewHero
            subjectName={data?.subject_name}
            subjectId={data?.subject_id}
            gradeName={data?.grade_name}
            gradeId={data?.grade_id}
            courseMastery={data?.course_mastery}
            courseMasteryGained={data?.course_mastery_points_gained}
            courseMasteryTotal={data?.course_mastery_points_total}
            unit={activeUnit}
          />

          <div className="course-overview">
            {(() => {
              const unitsWithIndex = units.map((u, idx) => ({
                ...u,
                _idx: idx,
              }));
              const splitIndex = Math.ceil(unitsWithIndex.length / 2);
              const leftUnits = unitsWithIndex.slice(0, splitIndex);
              const rightUnits = unitsWithIndex.slice(splitIndex);

              const renderUnitFlow = (unit) => {
                const unitFlow = normalizeFlow(unit.flow || []);
                return (
                  <div key={unit._idx} className="unit-course-flow">
                    <div className="ucf-title">Unit {unit._idx + 1}</div>
                    <div className="flex flex-wrap gap-2 ucf-flow">
                      {(() => {
                        if (!unitFlow.length) {
                          return (
                            <span className="text-xs text-slate-500">
                              No items
                            </span>
                          );
                        }
                        let quizCounter = 0;
                        let unitCounter = 0;
                        return unitFlow.map((item) => {
                          const resolvedVariant =
                            item.type === "topic"
                              ? item.practiceOnly
                                ? STATUS_VARIANTS.practice
                                : STATUS_VARIANTS[
                                    normalizeMasteryLevel(item.mastery_level)
                                  ] || STATUS_VARIANTS.notStarted
                              : item.type === "quiz"
                                ? STATUS_VARIANTS.quiz
                                : item.type === "unitTest"
                                  ? STATUS_VARIANTS.unitTest
                                  : STATUS_VARIANTS.notStarted;

                          let titleText = `${
                            item.type === "topic"
                              ? "Topic"
                              : item.type === "quiz"
                                ? "Quiz"
                                : "Unit Test"
                          }: ${item.label}`;
                          if (item.type === "quiz") {
                            quizCounter += 1;
                            titleText = `Quiz ${quizCounter}: ${
                              item.total_questions ?? 0
                            } questions`;
                          } else if (item.type === "unitTest") {
                            unitCounter += 1;
                            titleText = `Unit Test ${unitCounter}: ${
                              item.total_questions ?? 0
                            } questions`;
                          } else if (item.type === "topic") {
                            titleText = `Topic: ${item.label}`;
                          }

                          const statusLabel =
                            item.mastery_level ||
                            resolvedVariant?.label ||
                            "Not started";
                          const attemptedFlag =
                            item.type !== "topic" &&
                            (item.attempted ||
                              /attempted/i.test(item.mastery_level || ""));

                          return (
                            <CustomPopover
                              key={item.id}
                              trigger={
                                item.link ? (
                                  <Link to={item.link}>
                                    <div
                                      className={`${resolvedVariant?.iconClasses} hover:scale-105 transition`}
                                    >
                                      <SpectrumInnerIcon
                                        variant={resolvedVariant}
                                      />
                                    </div>
                                  </Link>
                                ) : (
                                  <div className={resolvedVariant?.iconClasses}>
                                    <SpectrumInnerIcon
                                      variant={resolvedVariant}
                                    />
                                  </div>
                                )
                              }
                              title={titleText}
                              content={`${statusLabel}${
                                attemptedFlag ? " · Already submitted" : ""
                              }`}
                              side="top"
                              align="center"
                            />
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              };

              return (
                <>
                  <div className="course-overview-left">
                    {leftUnits.map(renderUnitFlow)}
                  </div>
                  <div className="course-overview-right">
                    {rightUnits.map(renderUnitFlow)}
                  </div>
                </>
              );
            })()}
          </div>

          <div className="unit-content-info">
            {units.map((unit, idx) => {
              const unitFlow = normalizeFlow(unit.flow || []);
              return (
                <div key={unit.unit_id ?? idx} className="uci-card">
                  <div className="uci-header">
                    <div className="ucih-left flex gap-3 items-center">
                      <div className="ucihimage-wrap">
                        {getAssignmentCoverSrc(
                          unit.image || unit.images || "",
                        ) ? (
                          <img
                            src={
                              getAssignmentCoverSrc(
                                unit.image || unit.images || "",
                              ) || unitPlaceholder
                            }
                            className="ucih-image"
                            alt={unit.unit_name}
                          />
                        ) : (
                          <div className="ucih-image placeholder flex items-center justify-center text-slate-400">
                            <SquareStack size={20} />
                          </div>
                        )}
                      </div>
                      <Link to={`/student/practice/unit/${unit.unit_id}`}>
                        <span className="font-semibold text-slate-900 hover:underline">
                          Unit {idx + 1}: {unit.unit_name}
                        </span>
                      </Link>
                    </div>
                    <div className="ucih-right text-sm text-slate-600 flex gap-2 items-center">
                      <span>Unit Mastery: {unit?.unit_mastery ?? 0}%</span>
                      <CustomPopover
                        trigger={
                          <div className="text-gray-500">
                            <Info size={16} />
                          </div>
                        }
                        title={`${unit.unit_mastery_points_gained ?? 0} / ${
                          unit.unit_mastery_points_total ?? 0
                        }`}
                        content="Your total points represent the progress you've made on this unit. Master every skill to collect all the available Mastery points."
                        side="top"
                        align="center"
                      />
                    </div>
                  </div>
                  <div className="ucih-body">
                    {unitFlow.filter((f) => f.type === "topic").length ? (
                      unitFlow
                        .filter((f) => f.type === "topic")
                        .map((item) => (
                          <div key={item.id} className="ucih-topic">
                            {item.link ? (
                              <Link className="text-gray-700" to={item.link}>
                                {item.label}
                              </Link>
                            ) : (
                              <span className="text-gray-700">
                                {item.label}
                              </span>
                            )}
                          </div>
                        ))
                    ) : (
                      <div className="text-sm text-slate-500">No items</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PracticeSidebarLayout>
  );
};

export default CourseOverview;
