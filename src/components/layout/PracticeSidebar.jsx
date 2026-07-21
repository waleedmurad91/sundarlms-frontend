import { useMemo } from "react";
import {
  Book,
  ChevronRight,
  ClipboardList,
  Dot,
  FileText,
  Home,
} from "lucide-react";
import { Link } from "react-router-dom";
import SpectrumInnerIcon from "@/components/SpectrumInnerIcon";

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
    iconClass: "practice-icon-spectrum",
    usePracticeImage: true,
    key: "practice",
  },
  quiz: { iconClass: "quiz-icon-spectrum", innerIconClass: "quiz-icon" },
  assignment: { iconClass: "assignment-icon-spectrum", innerIconClass: "" },
  assessment: {
    iconClass: "assignment-icon-spectrum",
    innerIconClass: "",
  },
  unit: {
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

const levelToVariant = (masteryLevel) =>
  LEVEL_VARIANTS[normalizeLevelKey(masteryLevel)] ?? LEVEL_VARIANTS.notstarted;

const getPracticeCount = (topic) => topic?.total_questions_practice ?? 0;
const getChallengeCount = (topic) => topic?.total_questions_challenge ?? 0;

const filterTopicsForPlayer = (topics, playerMode) =>
  topics.filter((topic) => {
    const practiceCount = getPracticeCount(topic);
    const challengeCount = getChallengeCount(topic);
    if (practiceCount === 0 && challengeCount === 0) return false;
    if (playerMode === "challenge" && challengeCount === 0) return false;
    if (playerMode === "practice" && practiceCount === 0) return false;
    return true;
  });

const PracticeSidebar = ({
  topics = [],
  selectedTopicId,
  onSelectTopic,
  gradeName,
  subjectName,
  subjectId,
  unitId,
  unitName,
  selectedTopicName,
  sidebarType,
  playerMode,
  basePath = "/student/challenge",
}) => {
  const isAssessmentSidebar = sidebarType === "assessment";
  const courseLabel = [gradeName ? `Grade ${gradeName}` : "", subjectName]
    .filter(Boolean)
    .join(" ");

  const visibleTopics = useMemo(() => {
    const isMasterySidebar =
      !sidebarType ||
      (sidebarType !== "quiz" &&
        sidebarType !== "assignment" &&
        sidebarType !== "assessment" &&
        sidebarType !== "unit");
    if (!isMasterySidebar || !playerMode) return topics;
    return filterTopicsForPlayer(topics, playerMode);
  }, [topics, playerMode, sidebarType]);

  return (
    <div className="">
      <div className="ps-top-header">
        <div className="flex items-center gap-3">
          {isAssessmentSidebar ? (
            <Link
              to="/student/dashboard"
              className="ps-top-book-icon inline-flex items-center justify-center"
              aria-label="Go to dashboard"
              title="Go to dashboard"
            >
              <Home size={16} />
            </Link>
          ) : (
            <span className="ps-top-book-icon">
              <Book size={16} />
            </span>
          )}
          <div className="ps-top-info">
            <Link
              to={`${basePath}/course-overview/${subjectId}`}
              className="player-breadcrumb-course"
              title={isAssessmentSidebar ? (selectedTopicName || "Assessment") : `${gradeName ? `Grade ${gradeName}` : ""}${subjectName ? ` ${subjectName}` : ""}`}
            >
              {isAssessmentSidebar
                ? selectedTopicName || "Assessment"
                : `${gradeName ? `Grade ${gradeName}` : ""}${subjectName ? ` ${subjectName}` : ""
                }`}
            </Link>
          </div>
        </div>
      </div>

      {!isAssessmentSidebar && (
        <div className="ps-top-unitInfo p-3">
          <div className="player-breadcrumbs">
            <Link
              to="/student/dashboard"
              className="player-breadcrumb-icon shrink-0"
              aria-label="Go to dashboard"
              title="Go to dashboard"
            >
              <Home size={16} />
            </Link>
            <ChevronRight size={11} className="player-breadcrumb-separator" />
            {subjectId ? (
              <Link
                to={`${basePath}/course-overview/${subjectId}`}
                className="player-breadcrumb-course"
                title={courseLabel}
              >
                {courseLabel}
              </Link>
            ) : (
              <span className="player-breadcrumb-course" title={courseLabel}>
                {courseLabel}
              </span>
            )}
            {unitName ? (
              <>
                <ChevronRight size={11} className="player-breadcrumb-separator" />
                {unitId ? (
                  <Link
                    to={`${basePath}/unit/${unitId}`}
                    className="player-breadcrumb-unit"
                    title={unitName}
                  >
                    {unitName}
                  </Link>
                ) : (
                  <span className="player-breadcrumb-unit" title={unitName}>
                    {unitName}
                  </span>
                )}
              </>
            ) : null}
          </div>

          <div className="player-topics-info">
            {selectedTopicName ? `${selectedTopicName}` : "Select a topic"}
          </div>
        </div>
      )}

      <div className="ps-sidebar-links">
        {visibleTopics.map((topic) => {
          const active = String(topic.topic_id) === String(selectedTopicId);
          const practiceCount = getPracticeCount(topic);
          const challengeCount = getChallengeCount(topic);
          const variant =
            sidebarType === "quiz"
              ? LEVEL_VARIANTS.quiz
              : sidebarType === "assignment"
                ? LEVEL_VARIANTS.assignment
                : sidebarType === "assessment"
                  ? LEVEL_VARIANTS.assessment
                  : sidebarType === "unit"
                    ? LEVEL_VARIANTS.unit
                    : practiceCount > 0 && challengeCount === 0
                      ? LEVEL_VARIANTS.practice
                      : levelToVariant(topic.mastery_level);

          return (
            <div key={topic.topic_id} className="space-y-1">
              <button
                onClick={() => onSelectTopic?.(topic.topic_id)}
                className={`ps-sidebar-button ${active ? "active" : ""}`}
              >
                <span
                  className={`spectrum-icon ${variant.iconClass} ${sidebarType === "assignment" || sidebarType === "assessment"
                      ? "flex items-center justify-center"
                      : ""
                    }`}
                >
                  {sidebarType === "assignment" ? (
                    <FileText size={16} />
                  ) : sidebarType === "assessment" ? (
                    <ClipboardList size={16} />
                  ) : variant.usePracticeImage ? (
                    <SpectrumInnerIcon variant={variant} />
                  ) : variant.innerIconClass ? (
                    <div className={variant.innerIconClass} />
                  ) : null}
                </span>
                <div className="text-left">
                  <div
                    className={`text-[18px]  ${active ? "text-[#AD474B]" : "text-slate-800"
                      }`}
                  >
                    {topic.topic_name}
                  </div>
                  <div className="text-[13px] text-slate-500">
                    {sidebarType === "quiz" ||
                      sidebarType === "assignment" ||
                      sidebarType === "assessment" ||
                      sidebarType === "unit" ? (
                      <>
                        <span className="flex items-center">
                          {topic.total_questions ?? 0} question
                          {topic.total_questions === 1 ? "" : "s"} <Dot />
                          <span>
                            {sidebarType === "quiz"
                              ? "Quiz"
                              : sidebarType === "assignment"
                                ? "Assignment"
                                : sidebarType === "assessment"
                                  ? "Assessment"
                                  : sidebarType === "unit"
                                    ? "Unit Test"
                                    : topic.mastery_level}
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        {practiceCount > 0 ? (
                          <span className="block">
                            {practiceCount} practice question
                            {practiceCount === 1 ? "" : "s"}{" "}
                          </span>
                        ) : null}
                        {challengeCount > 0 ? (
                          <span className="flex items-center">
                            {challengeCount} challenge question
                            {challengeCount === 1 ? "" : "s"}
                            <Dot />
                            <span>{topic.mastery_level}</span>
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PracticeSidebar;
