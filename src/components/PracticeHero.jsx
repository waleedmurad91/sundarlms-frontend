import { Dot, Home, Info } from "lucide-react";
import { Link } from "react-router-dom";
import CustomPopover from "./CustomPopover";
import SpectrumInnerIcon from "./SpectrumInnerIcon";
import { isPracticeOnlyTopic } from "@/utils/topicQuestionCounts";

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

const SPECTRUM_SEQUENCE = [
  "mastery",
  "proficient",
  "familiar",
  "attempted",
  "notStarted",
  "practice",
  "quiz",
  "unitTest",
];

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeStatusKey = (value) => {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  const match = Object.values(STATUS_VARIANTS).find((variant) =>
    variant.matchers?.some((matcher) => matcher === normalized),
  );
  return match?.key ?? "notStarted";
};

export const PracticeHero = ({
  subtitle,
  subjects = [],
  activeSubjectKey,
  onSubjectChange,
  unit,
  gainedMasteryPoints = 0,
  totalMasteryPoints = 0,
}) => {
  const showSubjectPicker = subjects.length > 1;
  const resolvedValue =
    activeSubjectKey ?? (subjects[0] ? subjects[0].key : "");
  const activeSubject =
    subjects.find((subject) => subject.key === resolvedValue) ??
    subjects[0] ??
    null;
  const courseOverviewPath = activeSubject?.subject_id
    ? `/student/practice/course-overview/${activeSubject.subject_id}`
    : null;
  const unitName = unit?.unit_name ?? "Unit Name";
  const unitIndex =
    safeArray(activeSubject?.units).findIndex(
      (entry) =>
        String(entry?.unit_id ?? entry?.key ?? "") ===
        String(unit?.unit_id ?? unit?.key ?? ""),
    ) ?? -1;
  const unitDisplayName =
    unitIndex >= 0 ? `Unit ${unitIndex + 1}: ${unitName}` : unitName;
  const gainedPoints = Number(gainedMasteryPoints) || 0;
  const totalPoints = Number(totalMasteryPoints) || 0;
  const masteryPercent =
    totalPoints > 0 ? Math.round((gainedPoints / totalPoints) * 100) : 0;

  const flowStatusEntries = safeArray(unit?.flow)
    .map((entry, index) => {
      if (entry.type === "topic") {
        const topic = entry.topic ?? entry.data ?? {};
        return {
          id: entry.id ?? `flow-topic-${index}`,
          label: topic.topic_name ?? "Topic",
          entityLabel: "Topic",
          variantKey: isPracticeOnlyTopic(topic)
            ? "practice"
            : normalizeStatusKey(topic.mastery_level),
          mastery_level: topic.mastery_level,
          total_questions: topic.total_questions ?? topic.questions_count ?? 0,
          linkTo: topic.topic_id
            ? `/student/practice/mastery/${topic.topic_id}/starter`
            : null,
        };
      }
      if (entry.type === "quiz") {
        const quiz = entry.quiz ?? entry.data ?? {};
        return {
          id:
            entry.id ??
            `flow-quiz-${quiz.quiz_id ?? quiz.id ?? quiz.title ?? index}`,
          label: quiz.title ?? "Quiz",
          entityLabel: "Quiz",
          variantKey: "quiz",
          total_questions: quiz.total_questions ?? quiz.questions_count ?? 0,
          linkTo:
            quiz.quiz_id || quiz.id
              ? `/student/challenge/quiz/${quiz.quiz_id ?? quiz.id}/starter${
                  quiz.attempted ? "?attempted=true" : ""
                }`
              : null,
          attempted: quiz.attempted,
        };
      }
      if (entry.type === "unitTest" || entry.type === "unit_test") {
        const unitTest = entry.unitTest ?? entry.data ?? {};
        return {
          id:
            entry.id ??
            `flow-unit-test-${
              unitTest.unit_test_id ??
              unitTest.test_id ??
              unitTest.id ??
              unitTest.title ??
              index
            }`,
          label: unitTest.title ?? "Unit Test",
          entityLabel: "Unit Test",
          variantKey: "unitTest",
          total_questions:
            unitTest.total_questions ?? unitTest.questions_count ?? 0,
          linkTo:
            unitTest.unit_test_id || unitTest.test_id || unitTest.id
              ? `/student/challenge/unit/${
                  unitTest.unit_test_id ?? unitTest.test_id ?? unitTest.id
                }/starter${unitTest.attempted ? "?attempted=true" : ""}`
              : null,
          attempted: unitTest.attempted,
        };
      }
      return null;
    })
    .filter(Boolean);

  const fallbackStatusEntries = [];
  if (!flowStatusEntries.length) {
    safeArray(unit?.topics).forEach((topic) => {
      fallbackStatusEntries.push({
        id: `topic-${topic.topic_id ?? topic.topic_name}`,
        label: topic.topic_name ?? "Topic",
        entityLabel: "Topic",
        variantKey: isPracticeOnlyTopic(topic)
          ? "practice"
          : normalizeStatusKey(topic.mastery_level),
        mastery_level: topic.mastery_level,
        total_questions: topic.total_questions ?? topic.questions_count ?? 0,
      });
    });

    if (unit?.quiz) {
      fallbackStatusEntries.push({
        id: `quiz-${unit.quiz.id ?? unit.quiz.quiz_id ?? unit.quiz.title}`,
        label: unit.quiz.title ?? "Quiz",
        entityLabel: "Quiz",
        variantKey: "quiz",
        total_questions:
          unit.quiz.total_questions ?? unit.quiz.questions_count ?? 0,
        linkTo:
          unit.quiz.quiz_id || unit.quiz.id
            ? `/student/challenge/quiz/${
                unit.quiz.quiz_id ?? unit.quiz.id
              }/starter${unit.quiz.attempted ? "?attempted=true" : ""}`
            : null,
        attempted: unit.quiz.attempted,
      });
    }

    if (unit?.unit_test) {
      fallbackStatusEntries.push({
        id: `unit-test-${
          unit.unit_test.unit_test_id ??
          unit.unit_test.id ??
          unit.unit_test.test_id ??
          unit.unit_test.title
        }`,
        label: unit.unit_test.title ?? "Unit Test",
        entityLabel: "Unit Test",
        variantKey: "unitTest",
        total_questions:
          unit.unit_test.total_questions ?? unit.unit_test.questions_count ?? 0,
        linkTo:
          unit.unit_test.unit_test_id ||
          unit.unit_test.test_id ||
          unit.unit_test.id
            ? `/student/challenge/unit/${
                unit.unit_test.unit_test_id ??
                unit.unit_test.test_id ??
                unit.unit_test.id
              }/starter${unit.unit_test.attempted ? "?attempted=true" : ""}`
            : null,
        attempted: unit.unit_test.attempted,
      });
    }
  }

  const statusEntries = flowStatusEntries.length
    ? flowStatusEntries
    : fallbackStatusEntries;

  return (
    <div className="practice-hero-section">
      <div className="practice-breadcrumbs">
        <Link to="/student/dashboard">
          <Home className="text-[#A22038]" size={18} />
        </Link>
        <span>
          <Dot />
        </span>
        {courseOverviewPath ? (
          <Link to={courseOverviewPath}>
            <p>{subtitle}</p>
          </Link>
        ) : (
          <p>{subtitle}</p>
        )}
      </div>
      <div className="practice-hero-title">
        <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl mb-2">
          {unitDisplayName}
        </h1>
        <p className="text-base text-slate-800 font-bold flex gap-2 items-center">
          Unit Mastery: {masteryPercent}%
          <CustomPopover
            trigger={<Info size={16} className="text-slate-500" />}
            title={`Unit Mastery Point: ${gainedPoints} / ${totalPoints}`}
            content="Your total points represent the progress you've made on this unit. Master every skill to collect all the available Mastery points."
            side="top"
            align="center"
          />
        </p>
      </div>
      <div className="practice-spectrum">
        {SPECTRUM_SEQUENCE.map((key) => {
          const variant = STATUS_VARIANTS[key];
          if (!variant) return null;

          return (
            <CustomPopover
              key={variant.key}
              trigger={
                <div className={`spectrum spectrum-${variant.key}`}>
                  <div className={variant.iconClasses}>
                    <SpectrumInnerIcon variant={variant} />
                  </div>
                  <div className="spectrum-title">{variant.label}</div>
                </div>
              }
              title={variant.popoverTitle}
              content={variant.popoverContent}
              side="top"
              align="center"
            />
          );
        })}
      </div>
      {statusEntries.length > 0 && (
        <div className="mt-4">
          <div className="mt-3 flex flex-wrap gap-1">
            {(() => {
              let quizCounter = 0;
              let unitCounter = 0;
              return statusEntries.map((entry) => {
                const variant =
                  STATUS_VARIANTS[entry.variantKey] ??
                  STATUS_VARIANTS.notStarted;
                let titleText = `${entry.entityLabel}: ${entry.label}`;
                if (entry.entityLabel === "Quiz") {
                  quizCounter += 1;
                  titleText = `Quiz ${quizCounter}: ${
                    entry.total_questions ?? entry.totalQuestions ?? 0
                  } questions`;
                } else if (entry.entityLabel === "Unit Test") {
                  unitCounter += 1;
                  titleText = `Unit Test ${unitCounter}: ${
                    entry.total_questions ?? entry.totalQuestions ?? 0
                  } questions`;
                } else if (entry.entityLabel === "Topic") {
                  titleText = `Topic: ${entry.label}`;
                }

                const statusLabel =
                  entry.mastery_level ||
                  entry.status ||
                  variant.label ||
                  "Not started";

                return (
                  <CustomPopover
                    key={entry.id}
                    trigger={
                      entry.linkTo ? (
                        <Link to={entry.linkTo}>
                          <div
                            className={`${variant.iconClasses} hover:scale-105 transition`}
                          >
                            <SpectrumInnerIcon variant={variant} />
                          </div>
                        </Link>
                      ) : (
                        <div className={variant.iconClasses}>
                          <SpectrumInnerIcon variant={variant} />
                        </div>
                      )
                    }
                    title={titleText}
                    content={`${statusLabel}${
                      entry.entityLabel !== "Topic" && entry.attempted
                        ? " · Already submitted"
                        : ""
                    }`}
                    side="top"
                    align="center"
                  />
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
