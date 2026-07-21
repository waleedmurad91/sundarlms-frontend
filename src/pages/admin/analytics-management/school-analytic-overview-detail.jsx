import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DemographicCard from "@/components/DemographicCard";
import { getSpecificSchoolAnalytics } from "@/api/analyticsApi";
import {
  AlertCircleIcon,
  BarChart3,
  Building2,
  Clock3,
  Loader2,
  School,
  Target,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = ["#38BDF8", "#818CF8", "#151D2E", "#FB923C", "#F4669F"];

const asArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toInitials = (name) => {
  if (!name || typeof name !== "string") {
    return "NA";
  }
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "NA";
};

const toLabel = (value) =>
  String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatPercentage = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(1)}%`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toLocaleString();
};

const formatDurationValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return numeric % 1 === 0
    ? String(numeric)
    : numeric.toFixed(1).replace(/\.0$/, "");
};

const formatHoursLabel = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  const hours = Number(value);
  if (hours <= 0) {
    return "0min";
  }

  const hoursPerMonth = 24 * 30;
  if (hours >= hoursPerMonth) {
    return `${formatDurationValue(hours / hoursPerMonth)}m`;
  }
  if (hours >= 24) {
    return `${formatDurationValue(hours / 24)}d`;
  }
  if (hours >= 1) {
    return `${formatDurationValue(hours)}h`;
  }
  return `${formatDurationValue(hours * 60)}min`;
};

const buildDomain = (rows, keys) => {
  const maxValue = rows.reduce((highest, row) => {
    const rowHighest = keys.reduce(
      (keyHighest, key) => Math.max(keyHighest, toNumber(row?.[key], 0)),
      0,
    );
    return Math.max(highest, rowHighest);
  }, 0);

  return [0, Math.max(10, Math.ceil(maxValue / 10) * 10)];
};

const SchoolAnalyticsOverviewDetail = () => {
  const { id: paramsId } = useParams();
  const { state } = useLocation();
  const schoolId = paramsId || state?.schoolId || state?.school?.school_id;

  const [payload, setPayload] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!schoolId) {
      setError(
        "School identifier is missing. Please open this page from school analytics overview.",
      );
      setPayload(null);
      return;
    }

    let isMounted = true;

    const fetchSchoolAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getSpecificSchoolAnalytics(schoolId);
        if (isMounted) {
          setPayload(response?.data ?? null);
        }
      } catch (err) {
        const message =
          err?.message ||
          "Unable to fetch analytics details for the selected school.";
        if (isMounted) {
          setError(message);
          setPayload(null);
        }
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSchoolAnalytics();
    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  const school = payload?.school ?? {};
  const summary = payload?.summary ?? {};

  const studentsScoreBySubject = React.useMemo(() => {
    const subjectRows = asArray(payload?.charts?.students_score_by_subject);
    const legacyTrackRows = asArray(payload?.charts?.students_score_by_track);
    const sourceRows = subjectRows.length > 0 ? subjectRows : legacyTrackRows;

    return sourceRows.map((item, index) => ({
      subject_key: `${item?.subject_id ?? item?.track_id ?? item?.subject ?? item?.track ?? "subject"}-${index}`,
      subject: item?.subject ?? item?.track ?? "Subject",
      practice_attempted: toNumber(item?.practice_attempted, 0),
      challenge_attempted: toNumber(item?.challenge_attempted, 0),
      avg_score: toNumber(item?.avg_score, 0),
    }));
  }, [payload]);
  const subjectLabelMap = React.useMemo(
    () =>
      studentsScoreBySubject.reduce((acc, row) => {
        acc[String(row.subject_key)] = row.subject;
        return acc;
      }, {}),
    [studentsScoreBySubject],
  );

  const practiceVsChallenge = React.useMemo(
    () =>
      asArray(payload?.charts?.practice_vs_challenge).map((item) => ({
        type: toLabel(item?.type || "type"),
        problems: toNumber(item?.problems, 0),
        correct: toNumber(item?.correct, 0),
        avg_score: toNumber(item?.avg_score, 0),
        total_hours: toNumber(item?.total_hours, 0),
      })),
    [payload],
  );

  const genderBreakdown = React.useMemo(
    () =>
      asArray(payload?.gender_breakdown).map((item) => ({
        gender: String(item?.gender ?? "unknown").toLowerCase(),
        students: toNumber(item?.students, 0),
        avg_score: toNumber(item?.avg_score, 0),
        avg_time_hours: toNumber(item?.avg_time_hours, 0),
      })),
    [payload],
  );

  const subjectChartDomain = React.useMemo(
    () =>
      buildDomain(studentsScoreBySubject, [
        "practice_attempted",
        "challenge_attempted",
        "avg_score",
      ]),
    [studentsScoreBySubject],
  );

  const practiceChartDomain = React.useMemo(
    () =>
      buildDomain(practiceVsChallenge, ["problems", "correct", "avg_score"]),
    [practiceVsChallenge],
  );

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>School Analytics Detail</h1>
          <p className="text-slate-600 text-md">
            School-level performance trends, track insights, and gender
            breakdown.
          </p>
        </div>
        <div className="dh-right">
          <Link
            to="/admin/school-analytics-overview"
            className="global-btn secondary analytics-detail-back-link"
          >
            Back to Overview
          </Link>
        </div>
      </div>

      <div className="dashboard-body">
        {error && (
          <Alert
            variant="destructive"
            className="alert-custom mb-4 bg-[#FDF7EC]"
          >
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {loading && (
          <div className="flex h-52 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        )}

        {!loading && !error && payload && (
          <>
            <div className="inner-detail-card dashboard-body-card-dtl">
              <div className="idc-left">
                <div className="flex gap-3">
                  <div className="school-icon">{toInitials(school?.name)}</div>
                  <div className="school-detail">
                    <h1>{school.name || "Unnamed School"}</h1>
                    <p>
                      <School size={16} className="text-[#AD474B]" />{" "}
                      <span>{school?.city || "City N/A"}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="metrics-grid mt-5 mb-6">
              <DemographicCard
                icon={<Users size={24} />}
                title="Students"
                classname="demoGreen card-sm"
                count={formatNumber(summary?.students)}
                subheading="Total active students"
              />
              <DemographicCard
                icon={<Target size={24} />}
                title="Avg Score"
                classname="demoSky card-sm"
                count={formatPercentage(summary?.avg_score)}
                subheading="Overall school average"
              />
              <DemographicCard
                icon={<BarChart3 size={24} />}
                title="Practice Score"
                classname="demoIndigo card-sm"
                count={formatPercentage(summary?.practice_score)}
                subheading="Practice performance"
              />
              <DemographicCard
                icon={<School size={24} />}
                title="Challenge Score"
                classname="demoOrange card-sm"
                count={formatPercentage(summary?.challenge_score)}
                subheading="Challenge performance"
              />
              <DemographicCard
                icon={<Clock3 size={24} />}
                title="Total Hours"
                classname="demoPurple card-sm"
                count={formatHoursLabel(summary?.total_hours)}
                subheading="Study time"
              />
            </section>

            <section className="dashboard-body dashboard-body-card mb-6">
              <div className="analytics-detail-chart-grid">
                <article className="analytics-detail-chart-card">
                  <header className="analytics-detail-chart-header">
                    <h2 className="analytics-detail-chart-title">
                      <BarChart3 size={18} /> Student Score By Subject
                    </h2>
                    <p className="analytics-detail-chart-subtitle">
                      Practice attempted, challenge attempted, and average score
                      by subject
                    </p>
                  </header>

                  {studentsScoreBySubject.length === 0 ? (
                    <div className="analytics-empty-state">
                      No subject chart data available.
                    </div>
                  ) : (
                    <div className="analytics-chart-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart
                          layout="vertical"
                          data={studentsScoreBySubject}
                          margin={{ top: 8, right: 16, left: 28, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            type="number"
                            domain={subjectChartDomain}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="subject_key"
                            width={170}
                            interval={0}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                              subjectLabelMap[String(value)] ?? String(value)
                            }
                          />
                          <Tooltip
                            labelFormatter={(value) =>
                              subjectLabelMap[String(value)] ?? String(value)
                            }
                            formatter={(value, key, payload) => {
                              const dataKey = payload?.dataKey ?? key;
                              if (dataKey === "practice_attempted") {
                                return [formatNumber(value), "Practice"];
                              }
                              if (dataKey === "challenge_attempted") {
                                return [formatNumber(value), "Challenge"];
                              }
                              if (dataKey === "avg_score") {
                                return [formatPercentage(value), "Avg Score"];
                              }
                              return [formatNumber(value), toLabel(key)];
                            }}
                          />
                          <Bar
                            dataKey="practice_attempted"
                            name="Practice Attempted"
                            fill={CHART_COLORS[0]}
                            radius={[0, 6, 6, 0]}
                            maxBarSize={18}
                          />
                          <Bar
                            dataKey="challenge_attempted"
                            name="Challenge Attempted"
                            fill={CHART_COLORS[1]}
                            radius={[0, 6, 6, 0]}
                            maxBarSize={18}
                          />
                          <Bar
                            dataKey="avg_score"
                            name="Avg Score"
                            fill={CHART_COLORS[3]}
                            radius={[0, 6, 6, 0]}
                            maxBarSize={18}
                          />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </article>

                <article className="analytics-detail-chart-card">
                  <header className="analytics-detail-chart-header">
                    <h2 className="analytics-detail-chart-title">
                      <Building2 size={18} /> Practice vs Challenge
                    </h2>
                    <p className="analytics-detail-chart-subtitle">
                      Problems, correct answers, and score by type
                    </p>
                  </header>

                  {practiceVsChallenge.length === 0 ? (
                    <div className="analytics-empty-state">
                      No practice/challenge chart data available.
                    </div>
                  ) : (
                    <>
                      <div className="analytics-chart-wrap">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart
                            layout="vertical"
                            data={practiceVsChallenge}
                            margin={{ top: 8, right: 16, left: 28, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                              stroke="#e2e8f0"
                            />
                            <XAxis
                              type="number"
                              domain={practiceChartDomain}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="type"
                              width={120}
                              interval={0}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              formatter={(value, key) => {
                                if (key === "avg_score") {
                                  return [formatPercentage(value), "Avg Score"];
                                }
                                if (key === "correct") {
                                  return [formatNumber(value), "Correct"];
                                }
                                return [formatNumber(value), "Problems"];
                              }}
                            />
                            <Bar
                              dataKey="problems"
                              fill={CHART_COLORS[0]}
                              radius={[0, 6, 6, 0]}
                              maxBarSize={18}
                            />
                            <Bar
                              dataKey="correct"
                              fill={CHART_COLORS[3]}
                              radius={[0, 6, 6, 0]}
                              maxBarSize={18}
                            />
                            <Bar
                              dataKey="avg_score"
                              fill={CHART_COLORS[4]}
                              radius={[0, 6, 6, 0]}
                              maxBarSize={18}
                            />
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="analytics-performance-legend">
                        {practiceVsChallenge.map((row, index) => (
                          <div
                            key={`${row.type}-${index}`}
                            className="analytics-performance-pill"
                          >
                            <span>{row.type} Hours</span>
                            <strong>{formatHoursLabel(row.total_hours)}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </article>
              </div>
            </section>

            <section className="dashboard-body dashboard-body-card">
              <div className="analytics-section-header">
                <div>
                  <h2>Gender Breakdown</h2>
                  <p>Student distribution and averages by gender</p>
                </div>
              </div>
              <Table className="global-table analytics-overview-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Gender</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {genderBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6">
                        No gender breakdown available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    genderBreakdown.map((row, index) => (
                      <TableRow key={`${row.gender}-${index}`}>
                        <TableCell>
                          <span
                            className={`overview-chip ${row.gender === "male" ? "male-chip" : row.gender === "female" ? "female-chip" : ""}`}
                          >
                            {toLabel(row.gender)}
                          </span>
                        </TableCell>
                        <TableCell className="overview-strong">
                          {formatNumber(row.students)}
                        </TableCell>
                        <TableCell>{formatPercentage(row.avg_score)}</TableCell>
                        <TableCell>
                          {formatHoursLabel(row.avg_time_hours)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>
          </>
        )}

        {!loading && !error && !payload && (
          <p className="text-slate-500">
            No analytics data available for this school.
          </p>
        )}
      </div>
    </>
  );
};

export default SchoolAnalyticsOverviewDetail;
