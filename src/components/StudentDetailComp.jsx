import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DemographicCard from "@/components/DemographicCard";
import { getSpecificStudentAnalytics } from "@/api/analyticsApi";
import {
  Activity,
  AlertCircleIcon,
  ArrowLeft,
  BarChart3,
  Book,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  Edit,
  Flame,
  Globe,
  GraduationCap,
  LineChart as LineChartIcon,
  Loader2,
  Mail,
  Phone,
  PieChart as PieChartIcon,
  School,
  Target,
  User,
} from "lucide-react";
import {
  Bar,
  BarChart as ReBarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

const OVERVIEW_FALLBACK = {
  avg_score: 0,
  practice_score: 0,
  challenge_score: 0,
  time_spent_minutes: 0,
  time_spent_label: "0m",
  problems: 0,
  streak: 0,
  performance_breakdown: [],
  monthly_problem_activity: [],
  time_spend_trend: [],
};
const PERFORMANCE_BREAKDOWN_COLORS = [
  "#38BDF8",
  "#818CF8",
  "#151D2E",
  "#FB923C",
  "#F4669F",
];

const toSentenceCase = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};
const asArray = (value) => (Array.isArray(value) ? value : []);
const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${parsed.toFixed(parsed % 1 === 0 ? 0 : 1)}%`;
};
const formatNumeric = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(1);
};
const formatSignedPoints = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  const formatted = parsed % 1 === 0 ? parsed.toFixed(0) : parsed.toFixed(1);
  return `${parsed > 0 ? "+" : ""}${formatted} pts`;
};
const toInitials = (name) => {
  if (!name || typeof name !== "string") return "NA";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return initials || "NA";
};
const resolveTimeLabel = (entry) => {
  if (!entry || typeof entry !== "object") return "-";
  if (entry.time_label) return entry.time_label;
  if (entry.avg_time_per_question_label)
    return entry.avg_time_per_question_label;
  if (entry.time_minutes !== null && entry.time_minutes !== undefined) {
    return `${formatNumeric(entry.time_minutes)}m`;
  }
  return "-";
};
const getVsClassTone = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0) return "neutral";
  return parsed > 0 ? "positive" : "negative";
};
const buildTimeAxisDomain = (data) => {
  const maxMinutes = data.reduce(
    (highest, item) => Math.max(highest, toNumber(item?.time_spent_minutes, 0)),
    0,
  );
  return [0, Math.max(10, Math.ceil(maxMinutes / 10) * 10)];
};
const renderProgressCell = (value, tone = "tone-avg") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  const clamped = Math.min(100, Math.max(0, Number(value)));
  return (
    <div className="overview-progress">
      <span className={`overview-progress__value text-${tone}`}>
        {formatPercent(clamped)}
      </span>
      <div className={`overview-progress__track ${tone}`}>
        <span
          className="overview-progress__fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
const resolveFirstNumeric = (...values) => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }
  return null;
};
const formatCompactCount = (value) =>
  value === null ? "-" : formatNumeric(value);
const getPracticeSummary = (entry) => {
  const attempted = resolveFirstNumeric(
    entry?.practice,
    entry?.practice_attempted,
  );
  const correct = resolveFirstNumeric(
    entry?.total_practice_correct,
    entry?.practice_correct,
  );
  const incorrect = resolveFirstNumeric(
    entry?.total_practice_incorrect,
    attempted !== null && correct !== null ? attempted - correct : null,
  );

  return { attempted, correct, incorrect };
};
const getChallengeSummary = (entry) => {
  const attempted = resolveFirstNumeric(
    entry?.challenge,
    entry?.challenge_attempted,
  );
  const correct = resolveFirstNumeric(
    entry?.total_challenge_correct,
    entry?.challenge_correct,
  );
  const incorrect = resolveFirstNumeric(
    entry?.total_challenge_incorrect,
    attempted !== null && correct !== null ? attempted - correct : null,
  );

  return { attempted, correct, incorrect };
};
const getTotalPracticeChallenge = (entry) => {
  const practice = resolveFirstNumeric(
    entry?.practice,
    entry?.practice_attempted,
  );
  const challenge = resolveFirstNumeric(
    entry?.challenge,
    entry?.challenge_attempted,
  );
  return resolveFirstNumeric(
    entry?.total_practice_challenge,
    (practice ?? 0) + (challenge ?? 0),
  );
};

const StudentDetailComp = ({ studentId: propStudentId, title, state }) => {
  const studentId = propStudentId || state?.studentId || state?.student?.id;

  const [payload, setPayload] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [expandedSubjects, setExpandedSubjects] = React.useState([]);
  const [expandedUnits, setExpandedUnits] = React.useState([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    setExpandedSubjects([]);
    setExpandedUnits([]);
  }, [studentId]);

  React.useEffect(() => {
    if (!studentId) {
      setError(
        "Student identifier is missing. Please open this page from analytics overview.",
      );
      setPayload(null);
      return;
    }

    let isMounted = true;
    const fetchStudentAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getSpecificStudentAnalytics(studentId);
        if (isMounted) setPayload(response?.data ?? null);
      } catch (err) {
        const message =
          err?.message ||
          "Unable to fetch analytics details for the selected student.";
        if (isMounted) {
          setError(message);
          setPayload(null);
        }
        toast.error(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStudentAnalytics();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  const student = payload?.student ?? {};
  const overview = React.useMemo(
    () => ({ ...OVERVIEW_FALLBACK, ...(payload?.overview ?? {}) }),
    [payload],
  );
  const subjectRows = asArray(payload?.subjects?.rows);
  const monthlyProblemActivity = asArray(overview.monthly_problem_activity).map(
    (entry) => ({
      label: entry?.label ?? entry?.key ?? "-",
      problems: toNumber(entry?.problems, 0),
      correct: toNumber(entry?.correct, 0),
      incorrect: toNumber(entry?.incorrect, 0),
    }),
  );
  const timeSpendTrend = asArray(overview.time_spend_trend).map((entry) => ({
    label: entry?.label ?? entry?.key ?? "-",
    time_spent_minutes: toNumber(entry?.time_spent_minutes, 0),
    time_spent_label:
      entry?.time_spent_label ??
      `${formatNumeric(toNumber(entry?.time_spent_minutes, 0))}m`,
  }));
  const performanceBreakdown = asArray(overview.performance_breakdown).map(
    (entry) => ({
      subject_name: entry?.subject_name ?? "Subject",
      completion_percent: Math.max(0, toNumber(entry?.completion_percent, 0)),
      attempted_questions: toNumber(entry?.attempted_questions, 0),
      total_questions: toNumber(entry?.total_questions, 0),
    }),
  );
  const timeAxisDomain = React.useMemo(
    () => buildTimeAxisDomain(timeSpendTrend),
    [timeSpendTrend],
  );

  const toggleSubject = (subjectKey) => {
    setExpandedSubjects((prev) =>
      prev.includes(subjectKey)
        ? prev.filter((entry) => entry !== subjectKey)
        : [...prev, subjectKey],
    );
    setExpandedUnits((prev) =>
      prev.filter((entry) => !entry.startsWith(`${subjectKey}::`)),
    );
  };
  const toggleUnit = (unitKey) => {
    setExpandedUnits((prev) =>
      prev.includes(unitKey)
        ? prev.filter((entry) => entry !== unitKey)
        : [...prev, unitKey],
    );
  };
  const handleToggleKeydown = (event, callback) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  };

  const getAssignmentCoverSrc = (images) => {
    const path = extractFirstImagePath(images);
    return buildBackendFileUrl(path);
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{title}</h1>
          <p className="text-slate-600 text-md">
            Detailed analytics for a selected student including overview charts
            and curriculum-level progress.
          </p>
        </div>
        <div className="dh-right">
          <button
            type="button"
            className="global-btn secondary"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <Link
            to={`/admin/centralized-student-form/${studentId}`}
            className="global-btn"
          >
           Edit Student <Edit size={16}/>
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
                  <div className="school-icon">
                    {student.profile_image ? (
                      <img
                        src={getAssignmentCoverSrc(student.profile_image)}
                        alt="Profile"
                      />
                    ) : (
                      toInitials(student?.name)
                    )}
                  </div>
                  <div className="school-detail">
                    <h1>{student.name || "Unnamed Student"}</h1>
                    <p>
                      <Book size={16} className="text-[#AD474B]" />{" "}
                      <span>
                        {student?.grade
                          ? `Grade ${student.grade}`
                          : "Grade N/A"}
                      </span>
                    </p>
                    <p>
                      <Mail size={16} className="text-[#AD474B]" />{" "}
                      <span>{student.email || "Not provided"}</span>
                    </p>
                    {student.school && (
                      <p>
                        <School size={16} className="text-[#AD474B]" />{" "}
                        <span>{student.school}</span>
                      </p>
                    )}
                    {student.gender && (
                      <p>
                        <User size={16} className="text-[#AD474B]" />{" "}
                        <span>{toSentenceCase(student.gender)}</span>
                      </p>
                    )}
                    {student.dob && (
                      <p>
                        <Calendar size={16} className="text-[#AD474B]" />
                        <span>
                          {`DOB: ${format(
                            new Date(student.dob),
                            "MMM dd, yyyy",
                          )}`}
                        </span>
                      </p>
                    )}
                    {student.phone && (
                      <p>
                        <Phone size={16} className="text-[#AD474B]" />{" "}
                        <span>{student.phone}</span>
                      </p>
                    )}
                    {student.createdAt && (
                      <p>
                        <Calendar size={16} className="text-[#AD474B]" />
                        <span>
                          {`Joined on ${format(
                            new Date(student.createdAt),
                            "MMM dd, yyyy",
                          )}`}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <section className="metrics-grid metrics-grid3 analytics-detail-metrics">
              <DemographicCard
                icon={<Target size={24} />}
                title="Avg Score"
                classname="demoGreen card-sm"
                count={formatPercent(overview.avg_score)}
                subheading="Overall performance average"
              />
              <DemographicCard
                icon={<Activity size={24} />}
                title="Practice Score"
                classname="demoSky card-sm"
                count={formatPercent(overview.practice_score)}
                subheading="Practice mode result"
              />
              <DemographicCard
                icon={<GraduationCap size={24} />}
                title="Challenge Score"
                classname="demoIndigo card-sm"
                count={formatPercent(overview.challenge_score)}
                subheading="Challenge mode result"
              />
              <DemographicCard
                icon={<Clock3 size={24} />}
                title="Time Spent"
                classname="demoPurple card-sm"
                count={
                  overview.time_spent_label ||
                  `${formatNumeric(overview.time_spent_minutes)}m`
                }
                subheading="Total learning time"
              />
              <DemographicCard
                icon={<BarChart3 size={24} />}
                title="Problems"
                classname="demoOrange card-sm"
                count={formatNumeric(overview.problems)}
                subheading="Solved problem count"
              />
              <DemographicCard
                icon={<Flame size={24} />}
                title="Streak"
                classname="demoRed card-sm"
                count={formatNumeric(overview.streak)}
                subheading="Current active streak"
              />
            </section>

            <section className="dashboard-body-card analytics-detail-tabs-wrap school-stats">
              <div className="flex gap-5 items-center school-stats-header">
                <div className="icon-world">
                  <Globe />
                </div>
                <div className="school-stats-heading">
                  <h2>Analytics</h2>
                  <p>Comprehensive overview of student performance</p>
                </div>
              </div>
              <div className="school-stats-body">
                <Tabs defaultValue="overview">
                  <TabsList className="ssb-tabs">
                    <TabsTrigger value="overview">
                      <PieChartIcon />{" "}
                      <span className="tab-text">Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="progress">
                      <LineChartIcon />{" "}
                      <span className="tab-text">Progress</span>
                    </TabsTrigger>
                    <TabsTrigger value="details">
                      <ClipboardList />{" "}
                      <span className="tab-text">Details</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="overview"
                    className="analytics-detail-tab-content"
                  >
                    <div className="analytics-detail-chart-grid">
                      <article className="analytics-detail-chart-card">
                        <header className="analytics-detail-chart-header">
                          <div>
                            <h2 className="analytics-detail-chart-title">
                              <BarChart3 size={18} /> Monthly Problem Activity
                            </h2>
                            <p className="analytics-detail-chart-subtitle">
                              Problems solved by month
                            </p>
                          </div>
                        </header>

                        {monthlyProblemActivity.length === 0 ? (
                          <div className="analytics-empty-state">
                            No monthly problem activity available.
                          </div>
                        ) : (
                          <div className="analytics-chart-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                              <ReBarChart
                                data={monthlyProblemActivity}
                                margin={{
                                  top: 8,
                                  right: 8,
                                  left: -20,
                                  bottom: 0,
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  vertical={false}
                                  stroke="#e2e8f0"
                                />
                                <XAxis
                                  dataKey="label"
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <YAxis
                                  allowDecimals={false}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <Tooltip
                                  formatter={(value, key) => {
                                    if (key === "correct") {
                                      return [
                                        `${formatNumeric(value)}`,
                                        "Correct",
                                      ];
                                    }
                                    if (key === "incorrect") {
                                      return [
                                        `${formatNumeric(value)}`,
                                        "Incorrect",
                                      ];
                                    }
                                    return [
                                      `${formatNumeric(value)}`,
                                      "Problems",
                                    ];
                                  }}
                                />
                                <Bar
                                  dataKey="correct"
                                  fill="#34D399"
                                  radius={[7, 7, 0, 0]}
                                  maxBarSize={20}
                                />
                                <Bar
                                  dataKey="incorrect"
                                  fill="#F4669F"
                                  radius={[7, 7, 0, 0]}
                                  maxBarSize={20}
                                />
                                <Bar
                                  dataKey="problems"
                                  fill="#38BDF8"
                                  radius={[7, 7, 0, 0]}
                                  maxBarSize={20}
                                />
                              </ReBarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </article>

                      <article className="analytics-detail-chart-card">
                        <header className="analytics-detail-chart-header">
                          <div>
                            <h2 className="analytics-detail-chart-title">
                              <LineChartIcon size={18} /> Time Spend Trend
                            </h2>
                            <p className="analytics-detail-chart-subtitle">
                              Monthly learning time movement
                            </p>
                          </div>
                        </header>

                        {timeSpendTrend.length === 0 ? (
                          <div className="analytics-empty-state">
                            No time trend data available.
                          </div>
                        ) : (
                          <div className="analytics-chart-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                              <ReLineChart
                                data={timeSpendTrend}
                                margin={{
                                  top: 8,
                                  right: 12,
                                  left: -20,
                                  bottom: 0,
                                }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  vertical={false}
                                  stroke="#e2e8f0"
                                />
                                <XAxis
                                  dataKey="label"
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <YAxis
                                  domain={timeAxisDomain}
                                  tickFormatter={(value) => `${value}m`}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <Tooltip
                                  formatter={(value, _name, payload) => {
                                    const row = payload?.payload ?? {};
                                    const minutes = Number(value);
                                    return [
                                      row?.time_spent_label ??
                                        `${formatNumeric(
                                          Number.isFinite(minutes)
                                            ? minutes
                                            : 0,
                                        )}m`,
                                      "Time Spent",
                                    ];
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="time_spent_minutes"
                                  stroke="#10b981"
                                  strokeWidth={2.5}
                                  dot={{ r: 4, fill: "#10b981" }}
                                  activeDot={{ r: 5 }}
                                />
                              </ReLineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </article>

                      <article className="analytics-detail-chart-card analytics-detail-chart-card--wide">
                        <header className="analytics-detail-chart-header">
                          <div>
                            <h2 className="analytics-detail-chart-title">
                              <Activity size={18} /> Performance Breakdown
                            </h2>
                            <p className="analytics-detail-chart-subtitle">
                              Completion percentage by subject
                            </p>
                          </div>
                        </header>

                        {performanceBreakdown.length === 0 ? (
                          <div className="analytics-empty-state">
                            No performance breakdown available.
                          </div>
                        ) : (
                          <>
                            <div className="analytics-chart-wrap">
                              <ResponsiveContainer width="100%" height="100%">
                                <ReBarChart
                                  layout="vertical"
                                  data={performanceBreakdown}
                                  margin={{
                                    top: 5,
                                    right: 12,
                                    left: 20,
                                    bottom: 5,
                                  }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    horizontal={false}
                                    stroke="#e2e8f0"
                                  />
                                  <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tickFormatter={(value) => `${value}%`}
                                    tickLine={false}
                                    axisLine={false}
                                  />
                                  <YAxis
                                    type="category"
                                    dataKey="subject_name"
                                    width={120}
                                    tickLine={false}
                                    axisLine={false}
                                  />
                                  <Tooltip
                                    formatter={(value) => [
                                      `${formatPercent(value)}`,
                                      "Completion",
                                    ]}
                                  />
                                  <Bar
                                    dataKey="completion_percent"
                                    radius={[0, 7, 7, 0]}
                                    maxBarSize={20}
                                  >
                                    {performanceBreakdown.map(
                                      (entry, index) => (
                                        <Cell
                                          key={`performance-cell-${entry.subject_name}-${index}`}
                                          fill={
                                            PERFORMANCE_BREAKDOWN_COLORS[
                                              index %
                                                PERFORMANCE_BREAKDOWN_COLORS.length
                                            ]
                                          }
                                        />
                                      ),
                                    )}
                                  </Bar>
                                </ReBarChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="analytics-performance-legend">
                              {performanceBreakdown.map((entry, index) => (
                                <div
                                  key={`${entry.subject_name}-${index}`}
                                  className="analytics-performance-pill"
                                >
                                  <span>{entry.subject_name}</span>
                                  <strong>
                                    {entry.attempted_questions}/
                                    {entry.total_questions}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </article>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="progress"
                    className="analytics-detail-tab-content"
                  >
                    <div className="analytics-detail-progress-header">
                      <div>
                        <h2>Subject Progress</h2>
                        <p>
                          Expand subjects to view units, then expand units to
                          inspect topic-level metrics.
                        </p>
                      </div>
                      {/* <span className="overview-chip">
                        {subjectRows.length} subjects
                      </span> */}
                    </div>

                    <Table className="global-table analytics-progress-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[34%]">Curriculum</TableHead>
                          <TableHead>My Score</TableHead>
                          <TableHead>Subject Avg</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Practice Correct</TableHead>
                          <TableHead>Practice Incorrect</TableHead>
                          <TableHead>Challenge Correct</TableHead>
                          <TableHead>Challenge Incorrect</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Vs Class</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjectRows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="text-center py-8 text-slate-500"
                            >
                              No progress data is available for this student
                              yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          subjectRows.map((subject, subjectIndex) => {
                            const subjectKey = String(
                              subject?.subject_id ?? subjectIndex,
                            );
                            const subjectTitle =
                              subject?.title ||
                              subject?.subject_name ||
                              "Unnamed Subject";
                            const units = asArray(subject?.units);
                            const isSubjectExpanded =
                              expandedSubjects.includes(subjectKey);
                            const canExpandSubject = units.length > 0;

                            return (
                              <React.Fragment key={`subject-${subjectKey}`}>
                                <TableRow
                                  className={`analytics-progress-row analytics-progress-row--subject ${canExpandSubject ? "is-clickable" : ""}`}
                                  role={canExpandSubject ? "button" : undefined}
                                  tabIndex={canExpandSubject ? 0 : undefined}
                                  onClick={
                                    canExpandSubject
                                      ? () => toggleSubject(subjectKey)
                                      : undefined
                                  }
                                  onKeyDown={
                                    canExpandSubject
                                      ? (event) =>
                                          handleToggleKeydown(event, () =>
                                            toggleSubject(subjectKey),
                                          )
                                      : undefined
                                  }
                                >
                                  {(() => {
                                    const practiceSummary =
                                      getPracticeSummary(subject);
                                    const challengeSummary =
                                      getChallengeSummary(subject);
                                    return (
                                      <>
                                        <TableCell className="analytics-progress-name-cell">
                                          <div className="analytics-progress-label">
                                            {canExpandSubject ? (
                                              <span className="analytics-progress-chevron">
                                                {isSubjectExpanded ? (
                                                  <ChevronDown size={16} />
                                                ) : (
                                                  <ChevronRight size={16} />
                                                )}
                                              </span>
                                            ) : (
                                              <span className="analytics-progress-chevron analytics-progress-chevron--empty" />
                                            )}
                                            <span className="analytics-level-badge level-subject">
                                              Subject
                                            </span>
                                            <span className="analytics-progress-title">
                                              {subjectTitle}
                                            </span>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {renderProgressCell(
                                            subject?.my_score ??
                                              subject?.percentage,
                                            "tone-avg",
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {renderProgressCell(
                                            subject?.subject_avg ??
                                              subject?.track_avg,
                                            "tone-practice",
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {resolveTimeLabel(subject)}
                                        </TableCell>
                                        <TableCell>
                                          {formatCompactCount(
                                            practiceSummary.correct,
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {formatCompactCount(
                                            practiceSummary.incorrect,
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {formatCompactCount(
                                            challengeSummary.correct,
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {formatCompactCount(
                                            challengeSummary.incorrect,
                                          )}
                                        </TableCell>
                                        <TableCell className="overview-strong">
                                          {formatCompactCount(
                                            getTotalPracticeChallenge(subject),
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <span
                                            className={`analytics-vs-class analytics-vs-class--${getVsClassTone(subject?.vs_class_points)}`}
                                          >
                                            {formatSignedPoints(
                                              subject?.vs_class_points,
                                            )}
                                          </span>
                                        </TableCell>
                                      </>
                                    );
                                  })()}
                                </TableRow>

                                {isSubjectExpanded &&
                                  units.map((unit, unitIndex) => {
                                    const unitKey = `${subjectKey}::${unit?.unit_id ?? unitIndex}`;
                                    const unitTitle =
                                      unit?.title ||
                                      unit?.unit_name ||
                                      "Unnamed Unit";
                                    const topics = asArray(unit?.topics);
                                    const isUnitExpanded =
                                      expandedUnits.includes(unitKey);
                                    const canExpandUnit = topics.length > 0;

                                    return (
                                      <React.Fragment key={`unit-${unitKey}`}>
                                        <TableRow
                                          className={`analytics-progress-row analytics-progress-row--unit ${canExpandUnit ? "is-clickable" : ""}`}
                                          role={
                                            canExpandUnit ? "button" : undefined
                                          }
                                          tabIndex={
                                            canExpandUnit ? 0 : undefined
                                          }
                                          onClick={
                                            canExpandUnit
                                              ? () => toggleUnit(unitKey)
                                              : undefined
                                          }
                                          onKeyDown={
                                            canExpandUnit
                                              ? (event) =>
                                                  handleToggleKeydown(
                                                    event,
                                                    () => toggleUnit(unitKey),
                                                  )
                                              : undefined
                                          }
                                        >
                                          {(() => {
                                            const practiceSummary =
                                              getPracticeSummary(unit);
                                            const challengeSummary =
                                              getChallengeSummary(unit);
                                            return (
                                              <>
                                                <TableCell className="analytics-progress-name-cell">
                                                  <div className="analytics-progress-label analytics-progress-label--unit">
                                                    {canExpandUnit ? (
                                                      <span className="analytics-progress-chevron">
                                                        {isUnitExpanded ? (
                                                          <ChevronDown
                                                            size={16}
                                                          />
                                                        ) : (
                                                          <ChevronRight
                                                            size={16}
                                                          />
                                                        )}
                                                      </span>
                                                    ) : (
                                                      <span className="analytics-progress-chevron analytics-progress-chevron--empty" />
                                                    )}
                                                    <span className="analytics-level-badge level-unit">
                                                      Unit
                                                    </span>
                                                    <span className="analytics-progress-title">
                                                      {unitTitle}
                                                    </span>
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  {renderProgressCell(
                                                    unit?.my_score ??
                                                      unit?.percentage,
                                                    "tone-avg",
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {renderProgressCell(
                                                    unit?.subject_avg ??
                                                      unit?.track_avg,
                                                    "tone-practice",
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {resolveTimeLabel(unit)}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCompactCount(
                                                    practiceSummary.correct,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCompactCount(
                                                    practiceSummary.incorrect,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCompactCount(
                                                    challengeSummary.correct,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCompactCount(
                                                    challengeSummary.incorrect,
                                                  )}
                                                </TableCell>
                                                <TableCell className="overview-strong">
                                                  {formatCompactCount(
                                                    getTotalPracticeChallenge(
                                                      unit,
                                                    ),
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  <span
                                                    className={`analytics-vs-class analytics-vs-class--${getVsClassTone(unit?.vs_class_points)}`}
                                                  >
                                                    {formatSignedPoints(
                                                      unit?.vs_class_points,
                                                    )}
                                                  </span>
                                                </TableCell>
                                              </>
                                            );
                                          })()}
                                        </TableRow>

                                        {isUnitExpanded &&
                                          topics.map((topic, topicIndex) => {
                                            const topicKey = `${unitKey}::${topic?.topic_id ?? topicIndex}`;
                                            const topicTitle =
                                              topic?.title ||
                                              topic?.topic_name ||
                                              "Unnamed Topic";

                                            return (
                                              <TableRow
                                                key={`topic-${topicKey}`}
                                                className="analytics-progress-row analytics-progress-row--topic"
                                              >
                                                {(() => {
                                                  const practiceSummary =
                                                    getPracticeSummary(topic);
                                                  const challengeSummary =
                                                    getChallengeSummary(topic);
                                                  return (
                                                    <>
                                                      <TableCell className="analytics-progress-name-cell">
                                                        <div className="analytics-progress-label analytics-progress-label--topic">
                                                          <span className="analytics-progress-chevron analytics-progress-chevron--empty" />
                                                          <span className="analytics-level-badge level-topic">
                                                            Topic
                                                          </span>
                                                          <span className="analytics-progress-title">
                                                            {topicTitle}
                                                          </span>
                                                        </div>
                                                      </TableCell>
                                                      <TableCell>
                                                        {renderProgressCell(
                                                          topic?.percentage,
                                                          "tone-avg",
                                                        )}
                                                      </TableCell>
                                                      <TableCell>-</TableCell>
                                                      <TableCell>
                                                        {resolveTimeLabel(
                                                          topic,
                                                        )}
                                                      </TableCell>
                                                      <TableCell>
                                                        {formatCompactCount(
                                                          practiceSummary.correct,
                                                        )}
                                                      </TableCell>
                                                      <TableCell>
                                                        {formatCompactCount(
                                                          practiceSummary.incorrect,
                                                        )}
                                                      </TableCell>
                                                      <TableCell>
                                                        {formatCompactCount(
                                                          challengeSummary.correct,
                                                        )}
                                                      </TableCell>
                                                      <TableCell>
                                                        {formatCompactCount(
                                                          challengeSummary.incorrect,
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="overview-strong">
                                                        {formatCompactCount(
                                                          getTotalPracticeChallenge(
                                                            topic,
                                                          ),
                                                        )}
                                                      </TableCell>
                                                      <TableCell>
                                                        <span
                                                          className={`analytics-vs-class analytics-vs-class--${getVsClassTone(topic?.vs_class_points)}`}
                                                        >
                                                          {formatSignedPoints(
                                                            topic?.vs_class_points,
                                                          )}
                                                        </span>
                                                      </TableCell>
                                                    </>
                                                  );
                                                })()}
                                              </TableRow>
                                            );
                                          })}
                                      </React.Fragment>
                                    );
                                  })}
                              </React.Fragment>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent
                    value="details"
                    className="analytics-detail-tab-content"
                  >
                    <div className="analytics-detail-progress-header">
                      <div>
                        <h2>Overview</h2>
                        <p>
                          Registration, guardian, location, and participation
                          details
                        </p>
                      </div>
                    </div>
                    <div className="table-wrapper">
                      <table className="analytics-table">
                        <tbody>
                          <tr>
                            <th>Name</th>
                            <td>{student.name || "Unnamed Student"}</td>
                          </tr>
                          <tr>
                            <th>Email</th>
                            <td>{student.email || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>Username</th>
                            <td>{student.formb_id || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>Smart ID / Form-B</th>
                            <td>{student.formb_id || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>School</th>
                            <td>{student.school || "Not assigned"}</td>
                          </tr>
                          <tr>
                            <th>Class</th>
                            <td>
                              {student?.grade
                                ? `Grade ${student.grade}`
                                : "Grade N/A"}
                            </td>
                          </tr>
                          {student.source === "pmc" && (
                            <tr>
                              <th>PMC Session</th>
                              <td>{student.pmc_session?.title || "NA"}</td>
                            </tr>
                          )}
                          {student.source === "pmc" && (
                            <tr>
                              <th>PMC Contest Date</th>
                              <td>
                                {student.pmc_session?.contest_date || "NA"}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <th>Gender</th>
                            <td>
                              {student.gender
                                ? toSentenceCase(student.gender)
                                : "Not provided"}
                            </td>
                          </tr>
                          <tr>
                            <th>Phone</th>
                            <td>{student.phone || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>Student Phone</th>
                            <td>{student.student_phone || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>Father Name</th>
                            <td>{student.father_name || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>Father CNIC</th>
                            <td>{student.father_cnic || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>Father Phone</th>
                            <td>{student.father_phone || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>Province</th>
                            <td>{student.province || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>District</th>
                            <td>{student.district || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>Tehsil</th>
                            <td>{student.tehsil || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>City</th>
                            <td>{student.city || "Not provided"}</td>
                          </tr>
                          <tr>
                            <th>RMC Participation</th>
                            <td>{student.rmcParticipation ? "Yes" : "No"}</td>
                          </tr>
                          {(student.source === "rmc" ||
                            student.rmcVenueName ||
                            student.rmcVenueId) && (
                            <tr>
                              <th>RMC Venue</th>
                              <td>
                                {student.rmcVenueName ||
                                  student.rmcVenueId ||
                                  "Not provided"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </section>
          </>
        )}

        {!loading && !error && !payload && (
          <p className="text-slate-500">
            No analytics data available for this student.
          </p>
        )}
      </div>
    </>
  );
};

export default StudentDetailComp;
