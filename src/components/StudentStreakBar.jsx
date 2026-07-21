import React, { useCallback, useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentStatsData } from "@/api/studentDashboardApi";
import { useAuthStore } from "@/store/auth";
import { STUDENT_STATS_REFRESH_EVENT } from "@/utils/studentStatsEvents";
import flame from "@/assets/flame.png";
import greyflame from "@/assets/grayflame.png";
import { Link } from "react-router-dom";

export const StudentStreakBar = ({
  student,
  skillPercent,
  skillsCompleted,
  skillTarget = 5,
}) => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const resolvedTarget = Math.max(skillTarget, 1);

  const loadStats = useCallback(async () => {
    const studentId = user?.id ?? student?.id;
    if (!studentId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await getStudentStatsData(studentId);
      if (response?.status && response?.data) {
        setStats(response.data);
      } else {
        setError("Unable to load streak right now.");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to load streak right now.");
    } finally {
      setLoading(false);
    }
  }, [student?.id, user?.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const handleRefresh = () => loadStats();
    window.addEventListener(STUDENT_STATS_REFRESH_EVENT, handleRefresh);
    return () =>
      window.removeEventListener(STUDENT_STATS_REFRESH_EVENT, handleRefresh);
  }, [loadStats]);

  const resolvedStreak = stats?.current_streak ?? student?.streak ?? 0;
  const resolvedMaxStreak =
    stats?.current_streak ?? student?.current_streak ?? 0;
  const resolvedOverallStreak = stats?.max_streak ?? student?.max_streak ?? 0;
  const resolvedLevel = stats?.skill_level ?? student?.level ?? 1;
  const resolvedPractices =
    stats?.total_successful_practices ?? skillsCompleted ?? 0;

  const weeks = Math.floor(resolvedStreak / 7);
  const streakLabel =
    weeks > 0
      ? `${weeks} week${weeks > 1 ? "s" : ""} streak`
      : `${resolvedStreak} day${resolvedStreak === 1 ? "" : "s"} streak`;
  const helperText = stats?.last_practice_date
    ? `Last practiced on ${new Date(
        stats.last_practice_date,
      ).toLocaleDateString()}`
    : "Your last streak ended, so let's start building a new one today.";

  const progressCount = stats ? resolvedPractices : (skillsCompleted ?? 0);
  const levelProgressLabel =
    stats?.level_progress || `${progressCount}/${resolvedTarget}`;

  const progressPercent = React.useMemo(() => {
    if (stats?.level_progress) {
      const [num, denom] = stats.level_progress.split("/").map(Number);
      if (!Number.isNaN(num) && !Number.isNaN(denom) && denom > 0) {
        return Math.min((num / denom) * 100, 100);
      }
    }
    return stats
      ? Math.min((progressCount / resolvedTarget) * 100, 100)
      : Math.min(skillPercent ?? 0, 100);
  }, [stats, progressCount, resolvedTarget, skillPercent]);

  if (loading) {
    return (
      <div className="steakbar">
        <div className="steakbar-wrapper stdLayout">
          <div className="steak-text-wrap space-y-3">
            <Skeleton className="h-4 w-[260px]" />
            <Skeleton className="h-5 w-[140px]" />
          </div>
          <div className="progress-text-steak w-full max-w-[360px] space-y-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="steakbar">
      <div className="steakbar-wrapper stdLayout">
        <div className="steak-text-wrap">
          <div className="steak-text">
            {/* {error ? "Unable to update your streak right now." : helperText} */}
            {/* {resolvedMaxStreak === 0
              ? "Start leveling up and building your daily streak!"
              : `What a hot streak, a ${resolvedMaxStreak} ${
                  resolvedMaxStreak === 1 ? "day" : "days"
                } streak and counting!`} */}
             <Link to='/student/dashboard'> Student Portal</Link>
          </div>
          <div className="flex items-center gap-2 steak-label">
            <img
              src={`${resolvedMaxStreak == 0 ? greyflame : flame}`}
              className="h-[34px]"
            />
            <div className="leading-tight">
              <div className="font-semibold">{streakLabel}</div>
              {resolvedOverallStreak ? (
                <div className="text-xs text-slate-500">
                  Best: {resolvedOverallStreak} day
                  {resolvedOverallStreak === 1 ? "" : "s"}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="progress-text-steak">
          <span className="text-xs tracking-wide ">Level {resolvedLevel}</span>
          <div className="skill-progress-wrap">
            <div className="w-[80%]">
              <div className="h-2 rounded-full bg-slate-100 w-full">
                <div
                  className="h-2 rounded-full bg-[#A22038] transition-[width] duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <span className="text-skills w-[20%] text-right">
              <b>{levelProgressLabel}</b> <span>Skills</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
