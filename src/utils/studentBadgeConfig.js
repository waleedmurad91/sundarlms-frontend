import levelBadge from "@/assets/level_badge.png";
import skillBadge from "@/assets/skill_badge.png";
import masteryBadge from "@/assets/mastery_badge.png";
import coursemasteryBadge from "@/assets/course_mastery.png";
import practiceBadge from "@/assets/practice_badge.png";
import topperBadge from "@/assets/topper_badge.png";
import courseCompletionBadge from "@/assets/course_completion_badge.png";

export const BADGE_SUMMARY_ORDER = [
  "level_badges",
  "skills_badges",
  "mastery_badges",
  "course_completion_badge",
  "course_mastery_badges",
  "practice_badges",
  "class_topper_badges",
];

export const BADGE_LABELS = {
  level_badges: "Level Badges",
  skills_badges: "Skills Badges",
  mastery_badges: "Mastery Badges",
  course_completion_badge: "Course Completion Badge",
  course_mastery_badges: "Course Mastery Badges",
  practice_badges: "Practice Badges",
  class_topper_badges: "Class Topper Badges",
};

const BADGE_ICON_MAP = {
  level_badges: levelBadge,
  skills_badges: skillBadge,
  mastery_badges: masteryBadge,
  course_completion_badge: courseCompletionBadge,
  course_mastery_badges: coursemasteryBadge,
  practice_badges: practiceBadge,
  class_topper_badges: topperBadge,
};

export const resolveBadgeIcon = (badgeKey) =>
  BADGE_ICON_MAP[badgeKey] ?? levelBadge;

export const resolveBadgeLabel = (badgeKey, fallback = "Badges") =>
  BADGE_LABELS[badgeKey] ?? fallback;

export const resolveBadgeCount = (counts, badgeKey) => {
  const parsedValue = Number(counts?.[badgeKey] ?? 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};
