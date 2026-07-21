export const STUDENT_STATS_REFRESH_EVENT = "student:stats:refresh";

export const emitStudentStatsRefresh = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STUDENT_STATS_REFRESH_EVENT));
};
