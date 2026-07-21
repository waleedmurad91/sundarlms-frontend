import { Dot, Home, Info, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import CustomPopover from "./CustomPopover";
import SpectrumInnerIcon from "./SpectrumInnerIcon";
import { useEffect, useState } from "react";
import { hasVideosForGradeAndSubject } from "@/api/videoLibraryApi";

const STATUS_VARIANTS = {
  mastery: {
    key: "mastery",
    label: "Mastery",
    iconClasses: "spectrum-icon mastery-icon-spectrum",
    innerIconClass: "mastery-icon",
    popoverTitle: "Mastered (100 pts)",
    popoverContent:
      "Earned by getting a Proficient skill correct on the unit test.",
  },
  proficient: {
    key: "proficient",
    label: "Proficient",
    iconClasses: "spectrum-icon proficient-icon-spectrum",
    popoverTitle: "Proficient (80 pts)",
    popoverContent:
      "Answer 100% of the questions in a practice set correctly or get a Familiar skill correct during a quiz or unit test.",
  },
  familiar: {
    key: "familiar",
    label: "Familiar",
    iconClasses: "spectrum-icon familiar-icon-spectrum",
    innerIconClass: "familiar-icon",
    popoverTitle: "Familiar (50 pts)",
    popoverContent:
      "Get 70% or more correct when practicing a skill or answer a related quiz/unit test question correctly.",
  },
  attempted: {
    key: "attempted",
    label: "Attempted",
    iconClasses: "spectrum-icon attempted-icon-spectrum",
    innerIconClass: "attempted-icon",
    popoverTitle: "Attempted (0 pts)",
    popoverContent:
      "Less than 70% correct while practicing or incorrect answers during quiz and unit test attempts.",
  },
  notStarted: {
    key: "notStarted",
    label: "Not Started",
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

export const CourseOverviewHero = ({
  subjectName,
  subjectId,
  gradeId,
  gradeName,
  courseMastery = 0,
  courseMasteryGained,
  courseMasteryTotal,
}) => {
  const masteryPercent = Number(courseMastery) || 0;
  const [showVideoBtn, setShowVideoBtn] = useState(false);

  useEffect(() => {
    if (!subjectId && !gradeId) return;
    hasVideosForGradeAndSubject({ subjectId, gradeId }).then(setShowVideoBtn);
  }, [subjectId, gradeId]);

  const videoLibraryUrl =
    `/student/learning-materials` +
    (subjectId || gradeId
      ? `?${new URLSearchParams({
          ...(subjectId && { subject_id: subjectId }),
          ...(gradeId && { grade_id: gradeId }),
        }).toString()}`
      : "");

  return (
    <div className="courseOverview-hero-section">
      <div className="flex justify-between items-center">
        <div className="practice-breadcrumbs">
          <Link to="/student/dashboard">
            <Home className="text-[#A22038]" size={20} />
          </Link>
          <span>
            <Dot />
          </span>
          <p>{subjectName || "Course"}</p>
        </div>
        {showVideoBtn && (
          <Link
            to={videoLibraryUrl}
            className="rounded-sm bg-transparent transition-all text-[#AD474B] px-3 sm:px-6 py-2 text-xs sm:text-sm font-semibold hover:outline-2 flex gap-1 items-center whitespace-nowrap"
          >
            <PlayCircle size={16} />
            <span>Video Library</span>
          </Link>
        )}
      </div>

      <div className="practice-hero-title">
        <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl mb-2">
          {gradeName ? `Grade ${gradeName} ` : ""}
          {subjectName || "your course"}
        </h1>
        <p className="text-base text-slate-900 font-bold flex items-center gap-2">
          Course mastery: {masteryPercent}%
          <span>
            <CustomPopover
              trigger={
                <div className="text-gray-500">
                  <Info size={16} />
                </div>
              }
              title={`${courseMasteryGained} / ${courseMasteryTotal}`}
              content="Your total points represent the progress you've made on this course. Master every skill to collect all the available Mastery points."
              side="top"
              align="center"
            />
          </span>
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
    </div>
  );
};
