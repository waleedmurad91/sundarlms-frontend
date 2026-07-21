import { Link } from "react-router-dom";
import SpectrumInnerIcon from "@/components/SpectrumInnerIcon";
import { isPracticeOnlyTopic } from "@/utils/topicQuestionCounts";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import DOMPurify from "dompurify";

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
  practice: {
    key: "practice",
    iconClass: "practice-icon-spectrum",
    usePracticeImage: true,
  },
  quiz: { iconClass: "quiz-icon-spectrum", innerIconClass: "quiz-icon" },
  unittest: {
    iconClass: "unitTest-icon-spectrum",
    innerIconClass: "unitTest-icon",
  },
};

const normalizeLevelKey = (value) => {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (normalized === "mastered" || normalized === "mastery") return "mastery";
  if (normalized.includes("proficient")) return "proficient";
  if (normalized.includes("familiar")) return "familiar";
  if (normalized.includes("attempt")) return "attempted";
  if (normalized.includes("started")) return "notstarted";

  return normalized;
};

const resolveLevelVariant = (masteryLevel) =>
  LEVEL_VARIANTS[normalizeLevelKey(masteryLevel)] ?? LEVEL_VARIANTS.notstarted;

export const TopicsTable = ({ topics = [], firstNotStartedId = null }) => {
  const localFirstNotStartedId =
    topics.find(
      (topic) => normalizeLevelKey(topic.mastery_level) === "notstarted",
    )?.topic_id ??
    topics.find(
      (topic) => normalizeLevelKey(topic.mastery_level) === "notstarted",
    )?.id ??
    null;
  const resolvedFirstNotStartedId =
    firstNotStartedId !== null ? firstNotStartedId : localFirstNotStartedId;

  if (!topics.length) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
        No topics available yet for this unit.
      </div>
    );
  }

  return (
    <div className="topic-table-wrap">
      {topics.map((topic) => {
        const practiceOnly = isPracticeOnlyTopic(topic);
        const variant = practiceOnly
          ? LEVEL_VARIANTS.practice
          : resolveLevelVariant(topic.mastery_level);
        const levelKey = normalizeLevelKey(topic.mastery_level);
        const isAttempted = levelKey === "attempted";
        const isNotStarted = levelKey === "notstarted";
        const isFirstNotStarted =
          isNotStarted &&
          (topic.topic_id ?? topic.id) === resolvedFirstNotStartedId;
        const imageSrc = topic.image ? buildBackendFileUrl(topic.image) : null;
        const topicId = topic.topic_id ?? topic.id;
        const challengePath = `/student/challenge/mastery/${topicId}/starter`;
        const practicePath = `/student/practice/mastery/${topicId}/starter`;
        return (
          <div
            key={topic.topic_id}
            className={`ttw-card ${
              isFirstNotStarted ? "border-t-4 border-[#AD474B]" : ""
            }`}
          >
            <div className="ttw-titles">
              {isFirstNotStarted ? (
                <span className="text-[#AD474B] block text-[14px]">
                  Up next for you:
                </span>
              ) : (
                ""
              )}
              <Link
                to={practicePath}
                className="font-semibold text-slate-900 text-[17px]"
              >
                {topic.topic_name}
              </Link>
              <div className="ttw-infor">
                {isAttempted || levelKey === "familiar" ? (
                  <>
                    {levelKey === "familiar" && !practiceOnly ? (
                      <span className="text-[14px] text-slate-500 inline-block pr-3">
                        {topic.mastery_level}
                      </span>
                    ) : null}
                    <Link
                      to={practicePath}
                      className="btn-tryagain btn-topictable"
                    >
                      Try Again
                    </Link>
                    {/* <Link
                      to={practicePath}
                      className="btn-practice btn-topictable ml-2"
                    >
                      Practice
                    </Link> */}
                  </>
                ) : topic.mastery_level === "Proficient" ? (
                  <>
                    <span className="text-[14px] text-slate-500 inline-block pr-3">
                      {topic.mastery_level}
                    </span>
                    <span className="font-semibold pt-3">
                      Nice! Ready to move on
                    </span>
                  </>
                ) : topic.mastery_level === "Mastered" ? (
                  <>
                    <span className="text-[13px] capitalize text-slate-500 inline-block pr-3">
                      Mastered
                    </span>
                  </>
                ) : isNotStarted ? (
                  <>
                    {isFirstNotStarted ? (
                      <Link
                        to={practicePath}
                        className="btn-practice btn-start-practice"
                      >
                        Start
                      </Link>
                    ) : (
                      // <Link
                      //   to={practicePath}
                      //   className="btn-practice btn-topictable"
                      // >
                      //   Challenge
                      // </Link>
                      <Link
                        to={practicePath}
                        className="btn-practice btn-topictable "
                      >
                        Practice
                      </Link>
                    )}
                    {/* <Link
                      to={practicePath}
                      className="btn-practice btn-topictable "
                    >
                      Practice
                    </Link> */}
                  </>
                ) : (
                  ""
                )}
              </div>
            </div>
            <div className="ttw-level flex flex-col items-center gap-1">
              {isNotStarted && !practiceOnly ? (
                <span className="text-[15px] text-center text-slate-500">
                  Not <br />
                  started
                </span>
              ) : (
                <div className={`spectrum-icon ${variant.iconClass}`}>
                  <SpectrumInnerIcon variant={variant} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
