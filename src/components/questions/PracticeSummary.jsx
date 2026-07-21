import { Link } from "react-router-dom";

const LEVEL_VARIANTS = {
  mastery: {
    iconClass: "mastery-icon-spectrum",
    innerIconClass: "mastery-icon",
  },
  proficient: { iconClass: "proficient-icon-spectrum" },
  familiar: {
    iconClass: "familiar-icon-spectrum",
    innerIconClass: "familiar-icon",
  },
  attempted: {
    iconClass: "attempted-icon-spectrum",
    innerIconClass: "attempted-icon",
  },
  notstarted: { iconClass: "notStarted-icon-spectrum" },
  quiz: { iconClass: "quiz-icon-spectrum", innerIconClass: "quiz-icon" },
  unittest: {
    iconClass: "unitTest-icon-spectrum",
    innerIconClass: "unitTest-icon",
  },
};

const normalizeMasteryLevel = (val) => {
  const normalized = String(val || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  if (normalized === "mastered" || normalized === "mastery") return "mastery";
  if (normalized.includes("proficient")) return "proficient";
  if (normalized.includes("familiar")) return "familiar";
  if (normalized.includes("attempt")) return "attempted";
  if (normalized.includes("started")) return "notstarted";
  return normalized;
};

const resolveVariant = (entry) => {
  if (entry.type === "quiz") return LEVEL_VARIANTS.quiz;
  if (entry.type === "unit_test") return LEVEL_VARIANTS.unittest;
  return (
    LEVEL_VARIANTS[normalizeMasteryLevel(entry?.data?.mastery_level)] ||
    LEVEL_VARIANTS.notstarted
  );
};

const PracticeSummary = ({ result, successMessage, hideUnitFlow = false }) => {
  if (!result) return null;
  const flow = result.flow || [];
  const topicFlow = flow.find(
    (entry) =>
      entry.type === "topic" &&
      String(entry?.data?.topic_id) === String(result.topic_id)
  );
  const totalQuestions =
    result.total_questions ??
    topicFlow?.data?.total_questions ??
    result.attempted ??
    0;

  const headingText =
    successMessage ||
    (result.mastery_level === "Attempted" ||
    result.mastery_level === "Familiar" ||
    result.mastery_level === "Not Started"
      ? "Keep on practicing!"
      : "Awesome! You mastered this skill.");

  return (
    <div className="h-full">
      {!hideUnitFlow ? (
        <div className="border-t border-slate-200 bg-[#FBFBFB] py-6 px-[5rem]">
          <div className="flex flex-wrap gap-2">
            <span className="font-bold text-slate-600">Unit: </span>
            {flow.map((entry, idx) => {
              const variant = resolveVariant(entry);
              const linkTo =
                entry.type === "topic"
                  ? `/student/challenge/mastery/${entry.data?.topic_id}/starter`
                  : entry.type === "quiz"
                  ? `/student/challenge/quiz/${entry.data?.quiz_id}/starter`
                  : entry.type === "unit_test"
                  ? `/student/challenge/unit/${
                      entry.data?.unit_test_id ?? entry.data?.test_id
                    }/starter`
                  : null;
              return (
                <span key={idx}>
                  {linkTo ? (
                    <Link
                      to={linkTo}
                      className={`spectrum-icon ${variant.iconClass} inline-block`}
                      title="Open practice"
                    >
                      {variant.innerIconClass ? (
                        <div className={variant.innerIconClass} />
                      ) : null}
                    </Link>
                  ) : (
                    <span className={`spectrum-icon ${variant.iconClass}`}>
                      {variant.innerIconClass ? (
                        <div className={variant.innerIconClass} />
                      ) : null}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="bg-[#0A224A] text-center py-[5rem] px-[4rem] final-blue-screen">
        <h3 className="text-[35px] font-semibold text-white mb-3">
          {headingText}
        </h3>
        <p className="text-[20px] text-white">
          {result.correct} / {totalQuestions} Correct
        </p>
      </div>
    </div>
  );
};

export default PracticeSummary;
