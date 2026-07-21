import React from "react";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import DemographicCard from "@/components/DemographicCard";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { analyticsOverview } from "@/api/analyticsApi";
import {
  AlertCircleIcon,
  Clock3,
  Cpu,
  FlaskConical,
  Loader2,
  Target,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = ["#38BDF8", "#818CF8", "#151D2E", "#FB923C", "#F4669F"];
const CHART_GRID_COLOR = "#e2e8f0";
const CHART_TICK_COLOR = "#64748b";

const DEFAULT_CARDS = {
  total_students: 0,
  time_spent_hours: 0,
  problems_solved: 0,
  practice: { solved: 0, correct: 0, incorrect: 0 },
  challenge: { solved: 0, correct: 0, incorrect: 0 },
};

const DEFAULT_CHARTS = {
  monthly_problem_volume: [],
  active_students_by_day: [],
  active_students_by_hour: [],
  avg_score_by_subject: [],
  practice_vs_challenge: [],
  gender_split: [],
  gender_performance: [],
};

const DEFAULT_FILTERS = {
  grades: [],
  subjects: [],
  selected_grade_id: null,
  selected_subject_id: null,
  time_range: null,
  date_from: null,
  date_to: null,
};

const DEFAULT_TIME_RANGE_OPTIONS = [
  "all_time",
  "last_30_days",
  "last_7_days",
  "this_month",
];

const asArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toLocaleString();
};

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(1)}%`;
};

const formatHours = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${Number(value).toLocaleString()}h`;
};

const truncateAxisLabel = (value, maxLength = 12) => {
  const label = String(value ?? "");
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}...`;
};

const toOptionLabel = (value) =>
  String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildTimeRangeOptions = (selectedValue) => {
  const values = Array.from(
    new Set([
      ...DEFAULT_TIME_RANGE_OPTIONS,
      ...(selectedValue ? [String(selectedValue)] : []),
    ]),
  );

  return values.map((value) => ({
    value,
    label: toOptionLabel(value),
  }));
};

const AnalyticsOverview = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [cards, setCards] = React.useState(DEFAULT_CARDS);
  const [charts, setCharts] = React.useState(DEFAULT_CHARTS);
  const [filtersMeta, setFiltersMeta] = React.useState(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState({
    grade_id: null,
    subject_id: null,
    time_range: null,
    date_from: null,
    date_to: null,
  });
  const hasHydratedRef = React.useRef(false);

  React.useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (filters.grade_id) params.grade_id = filters.grade_id;
        if (filters.subject_id) params.subject_id = filters.subject_id;
        if (filters.time_range) params.time_range = filters.time_range;
        if (filters.date_from) params.date_from = filters.date_from;
        if (filters.date_to) params.date_to = filters.date_to;

        const response = await analyticsOverview(params);
        if (!isMounted) {
          return;
        }

        const payload = response?.data ?? {};
        const payloadFilters = payload?.filters ?? {};
        const payloadCards = payload?.cards ?? {};
        const payloadCharts = payload?.charts ?? {};

        setFiltersMeta({
          grades: asArray(payloadFilters?.grades),
          subjects: asArray(payloadFilters?.subjects),
          selected_grade_id: payloadFilters?.selected_grade_id ?? null,
          selected_subject_id: payloadFilters?.selected_subject_id ?? null,
          time_range: payloadFilters?.time_range ?? null,
          date_from: payloadFilters?.date_from ?? null,
          date_to: payloadFilters?.date_to ?? null,
        });

        if (!hasHydratedRef.current) {
          hasHydratedRef.current = true;
          const hydratedFilters = {
            grade_id:
              payloadFilters?.selected_grade_id !== null &&
              payloadFilters?.selected_grade_id !== undefined
                ? String(payloadFilters.selected_grade_id)
                : null,
            subject_id:
              payloadFilters?.selected_subject_id !== null &&
              payloadFilters?.selected_subject_id !== undefined
                ? String(payloadFilters.selected_subject_id)
                : null,
            time_range: payloadFilters?.time_range ?? null,
            date_from: payloadFilters?.date_from ?? null,
            date_to: payloadFilters?.date_to ?? null,
          };

          setFilters((prev) => {
            if (
              prev.grade_id === hydratedFilters.grade_id &&
              prev.subject_id === hydratedFilters.subject_id &&
              prev.time_range === hydratedFilters.time_range &&
              prev.date_from === hydratedFilters.date_from &&
              prev.date_to === hydratedFilters.date_to
            ) {
              return prev;
            }
            return hydratedFilters;
          });
        }

        setCards({
          total_students: toNumber(payloadCards?.total_students, 0),
          time_spent_hours: toNumber(payloadCards?.time_spent_hours, 0),
          problems_solved: toNumber(payloadCards?.problems_solved, 0),
          practice: {
            solved: toNumber(payloadCards?.practice?.solved, 0),
            correct: toNumber(payloadCards?.practice?.correct, 0),
            incorrect: toNumber(payloadCards?.practice?.incorrect, 0),
          },
          challenge: {
            solved: toNumber(payloadCards?.challenge?.solved, 0),
            correct: toNumber(payloadCards?.challenge?.correct, 0),
            incorrect: toNumber(payloadCards?.challenge?.incorrect, 0),
          },
        });

        setCharts({
          monthly_problem_volume: asArray(
            payloadCharts?.monthly_problem_volume,
          ).map((row) => ({
            month: row?.month ?? row?.month_key ?? "-",
            practice: toNumber(row?.practice, 0),
            challenge: toNumber(row?.challenge, 0),
            aggregate: toNumber(row?.aggregate, 0),
          })),
          active_students_by_day: asArray(
            payloadCharts?.active_students_by_day,
          ).map((row) => ({
            date: row?.date ?? "-",
            active_students: toNumber(row?.active_students, 0),
          })),
          active_students_by_hour: asArray(
            payloadCharts?.active_students_by_hour,
          ).map((row) => ({
            hour: row?.hour ?? "-",
            active_students: toNumber(row?.active_students, 0),
          })),
          avg_score_by_subject: asArray(
            payloadCharts?.avg_score_by_subject,
          ).map((row, index) => ({
            subject_key: `${row?.subject_id ?? row?.subject ?? "subject"}-${index}`,
            subject: row?.subject ?? "Subject",
            avg_score: toNumber(row?.avg_score, 0),
            students: toNumber(row?.students, 0),
            practice_attempted: toNumber(row?.practice_attempted, 0),
            challenge_attempted: toNumber(row?.challenge_attempted, 0),
          })),
          practice_vs_challenge: asArray(
            payloadCharts?.practice_vs_challenge,
          ).map((row, index) => ({
            subject_key: `${row?.subject_id ?? row?.subject ?? "subject"}-${index}`,
            subject: row?.subject ?? "Subject",
            practice: toNumber(row?.practice, 0),
            challenge: toNumber(row?.challenge, 0),
            aggregate: toNumber(row?.aggregate, 0),
          })),
          gender_split: asArray(payloadCharts?.gender_split).map((row) => ({
            gender: toOptionLabel(row?.gender ?? "unknown"),
            students: toNumber(row?.students, 0),
          })),
          gender_performance: asArray(payloadCharts?.gender_performance).map(
            (row) => ({
              gender: toOptionLabel(row?.gender ?? "unknown"),
              overall: toNumber(row?.overall, 0),
              practice: toNumber(row?.practice, 0),
              challenge: toNumber(row?.challenge, 0),
            }),
          ),
        });
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err?.message || "Failed to load platform overview analytics.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [filters]);

  const timeRangeOptions = React.useMemo(
    () => buildTimeRangeOptions(filtersMeta.time_range),
    [filtersMeta.time_range],
  );

  const updateFilter = (key, value) => {
    const normalizedValue = value === "" ? null : value;
    setFilters((prev) => {
      if (prev[key] === normalizedValue) {
        return prev;
      }
      return { ...prev, [key]: normalizedValue };
    });
  };

  const hasMonthlyVolume = charts.monthly_problem_volume.length > 0;
  const hasActiveStudentsByDay = charts.active_students_by_day.length > 0;
  const hasActiveStudentsByHour = charts.active_students_by_hour.length > 0;
  const hasAvgScoreBySubject = charts.avg_score_by_subject.length > 0;
  const hasPracticeVsChallenge = charts.practice_vs_challenge.length > 0;
  const hasGenderSplit = charts.gender_split.length > 0;
  const hasGenderPerformance = charts.gender_performance.length > 0;
  const avgScoreLabelMap = React.useMemo(
    () =>
      charts.avg_score_by_subject.reduce((acc, row) => {
        acc[String(row.subject_key)] = row.subject;
        return acc;
      }, {}),
    [charts.avg_score_by_subject],
  );
  const practiceVsChallengeLabelMap = React.useMemo(
    () =>
      charts.practice_vs_challenge.reduce((acc, row) => {
        acc[String(row.subject_key)] = row.subject;
        return acc;
      }, {}),
    [charts.practice_vs_challenge],
  );

  const renderEmptyChart = (label) => (
    <div className="analytics-empty-state platform-overview-empty">{label}</div>
  );

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Analytics Overview</h1>
          <p className="text-slate-600 text-md">
            Platform-level student performance and engagement insights.
          </p>
        </div>
      </div>

      <div className="dashboard-body">
        {error && (
          <Alert variant="destructive" className="alert-custom mb-4">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <div className="dashboard-body-card mb-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Grade
              </label>
              <SearchableMultiSelect
                options={filtersMeta.grades}
                value={filters.grade_id ?? ""}
                multiple={false}
                onChange={(value) => updateFilter("grade_id", value)}
                placeholder="Search grade"
                valueKey="id"
                labelKey="name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Subject
              </label>
              <SearchableMultiSelect
                options={filtersMeta.subjects}
                value={filters.subject_id ?? ""}
                multiple={false}
                onChange={(value) => updateFilter("subject_id", value)}
                placeholder="Search subject"
                valueKey="id"
                labelKey="name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Date From
              </label>
              <input
                type="date"
                className="form-input mt-1"
                value={filters.date_from ?? ""}
                onChange={(event) =>
                  updateFilter("date_from", event.target.value)
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Date To
              </label>
              <input
                type="date"
                className="form-input mt-1"
                value={filters.date_to ?? ""}
                onChange={(event) =>
                  updateFilter("date_to", event.target.value)
                }
              />
            </div>
            {/* <div>
              <label className="text-xs font-semibold text-slate-600">
                Time Range
              </label>
              <SearchableMultiSelect
                options={timeRangeOptions}
                value={filters.time_range ?? ""}
                multiple={false}
                onChange={(value) => updateFilter("time_range", value)}
                placeholder="Search time range"
              />
            </div> */}
          </div>
        </div>

        {loading ? (
          <div className="flex h-52 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        ) : (
          <>
            <section className="platform-overview-metrics mb-6">
              <div className="platform-overview-metrics-row platform-overview-metrics-row--three">
                <DemographicCard
                  icon={<Users size={24} />}
                  title="Total Students"
                  classname="demoGreen platform-overview-metric-card"
                  count={formatNumber(cards.total_students)}
                  subheading="Across all schools"
                />
                <DemographicCard
                  icon={<Clock3 size={24} />}
                  title="Time Spent"
                  classname="demoSky platform-overview-metric-card"
                  count={formatHours(cards.time_spent_hours)}
                  subheading="Cumulative"
                />
                <DemographicCard
                  icon={<Target size={24} />}
                  title="Problems Solved"
                  classname="demoOrange platform-overview-metric-card"
                  count={formatNumber(cards.problems_solved)}
                  subheading="Practice + Challenge"
                />
              </div>
              <div className="platform-overview-metrics-row platform-overview-metrics-row--three">
                <DemographicCard
                  icon={<FlaskConical size={24} />}
                  title="Practice Solved"
                  classname="demoIndigo platform-overview-metric-card"
                  count={formatNumber(cards.practice.solved)}
                  subheading="Solved practice questions"
                />
                <DemographicCard
                  icon={<FlaskConical size={24} />}
                  title="Practice Correct"
                  classname="demoGreen platform-overview-metric-card"
                  count={formatNumber(cards.practice.correct)}
                  subheading="Correct practice answers"
                />
                <DemographicCard
                  icon={<FlaskConical size={24} />}
                  title="Practice Incorrect"
                  classname="demoOrange platform-overview-metric-card"
                  count={formatNumber(cards.practice.incorrect)}
                  subheading="Incorrect practice answers"
                />
              </div>
              <div className="platform-overview-metrics-row platform-overview-metrics-row--three">
                <DemographicCard
                  icon={<Cpu size={24} />}
                  title="Challenge Solved"
                  classname="demoPurple platform-overview-metric-card"
                  count={formatNumber(cards.challenge.solved)}
                  subheading="Solved challenge questions"
                />
                <DemographicCard
                  icon={<Cpu size={24} />}
                  title="Challenge Correct"
                  classname="demoBlue platform-overview-metric-card"
                  count={formatNumber(cards.challenge.correct)}
                  subheading="Correct challenge answers"
                />
                <DemographicCard
                  icon={<Cpu size={24} />}
                  title="Challenge Incorrect"
                  classname="demoRed platform-overview-metric-card"
                  count={formatNumber(cards.challenge.incorrect)}
                  subheading="Incorrect challenge answers"
                />
              </div>
            </section>

            <section className="platform-overview-charts mb-6">
              <article className="platform-overview-chart platform-overview-chart--full">
                <header className="platform-overview-chart-header">
                  <h2>Monthly Problem Volume</h2>
                  <p>Practice, challenge, and aggregate volume by month</p>
                </header>
                {hasMonthlyVolume ? (
                  <div className="platform-overview-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={charts.monthly_problem_volume}
                        margin={{ top: 8, right: 16, left: -10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id="monthlyAggregateGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={CHART_COLORS[0]}
                              stopOpacity={0.45}
                            />
                            <stop
                              offset="100%"
                              stopColor={CHART_COLORS[0]}
                              stopOpacity={0.04}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_GRID_COLOR}
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="aggregate"
                          stroke={CHART_COLORS[0]}
                          fill="url(#monthlyAggregateGradient)"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: CHART_COLORS[0] }}
                        />
                        <Area
                          type="monotone"
                          dataKey="practice"
                          stroke={CHART_COLORS[3]}
                          fillOpacity={0}
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="challenge"
                          stroke={CHART_COLORS[1]}
                          fillOpacity={0}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderEmptyChart("No monthly problem volume data available.")
                )}
              </article>

              <article className="platform-overview-chart">
                <header className="platform-overview-chart-header">
                  <h2>Active Students By Day</h2>
                  <p>Daily active student trend over the selected date range</p>
                </header>
                {hasActiveStudentsByDay ? (
                  <div className="platform-overview-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={charts.active_students_by_day}
                        margin={{ top: 8, right: 16, left: -10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id="activeStudentsByDayGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={CHART_COLORS[1]}
                              stopOpacity={0.45}
                            />
                            <stop
                              offset="100%"
                              stopColor={CHART_COLORS[1]}
                              stopOpacity={0.04}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_GRID_COLOR}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="active_students"
                          name="Active Students"
                          stroke={CHART_COLORS[1]}
                          fill="url(#activeStudentsByDayGradient)"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: CHART_COLORS[1] }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderEmptyChart("No active students-by-day data available.")
                )}
              </article>

              <article className="platform-overview-chart">
                <header className="platform-overview-chart-header">
                  <h2>Active Students By Hour</h2>
                  <p>Hourly active student distribution</p>
                </header>
                {hasActiveStudentsByHour ? (
                  <div className="platform-overview-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart
                        data={charts.active_students_by_hour}
                        margin={{ top: 8, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_GRID_COLOR}
                        />
                        <XAxis
                          dataKey="hour"
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="active_students"
                          name="Active Students"
                          fill="#38BDF8"
                          radius={[4, 4, 0, 0]}
                        />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderEmptyChart("No active students-by-hour data available.")
                )}
              </article>

              <article className="platform-overview-chart">
                <header className="platform-overview-chart-header">
                  <h2>Avg Score By Subject</h2>
                  <p>Average performance distribution across subjects</p>
                </header>
                {hasAvgScoreBySubject ? (
                  <div className="platform-overview-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart
                        data={charts.avg_score_by_subject}
                        margin={{ top: 8, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_GRID_COLOR}
                        />
                        <XAxis
                          dataKey="subject_key"
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          height={42}
                          tickFormatter={(value) =>
                            truncateAxisLabel(
                              avgScoreLabelMap[String(value)] ?? String(value),
                              9,
                            )
                          }
                        />
                        <YAxis
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          labelFormatter={(value) =>
                            avgScoreLabelMap[String(value)] ?? String(value)
                          }
                          formatter={(value, key) => {
                            if (key === "avg_score") {
                              return [formatPercent(value), "Avg Score"];
                            }
                            return [formatNumber(value), key];
                          }}
                        />
                        <Bar dataKey="avg_score" radius={[6, 6, 0, 0]}>
                          {charts.avg_score_by_subject.map((row, index) => (
                            <Cell
                              key={`avg-score-subject-${row.subject_key}-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderEmptyChart(
                    "No average score-by-subject data available.",
                  )
                )}
              </article>

              <article className="platform-overview-chart">
                <header className="platform-overview-chart-header">
                  <h2>Practice vs Challenge</h2>
                  <p>Subject-wise practice and challenge attempts</p>
                </header>
                {hasPracticeVsChallenge ? (
                  <div className="platform-overview-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart
                        data={charts.practice_vs_challenge}
                        margin={{ top: 8, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_GRID_COLOR}
                        />
                        <XAxis
                          dataKey="subject_key"
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          height={42}
                          tickFormatter={(value) =>
                            truncateAxisLabel(
                              practiceVsChallengeLabelMap[String(value)] ??
                                String(value),
                              9,
                            )
                          }
                        />
                        <YAxis
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          labelFormatter={(value) =>
                            practiceVsChallengeLabelMap[String(value)] ??
                            String(value)
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="practice"
                          fill={CHART_COLORS[0]}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="challenge"
                          fill={CHART_COLORS[1]}
                          radius={[4, 4, 0, 0]}
                        />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderEmptyChart("No practice vs challenge data available.")
                )}
              </article>

              <article className="platform-overview-chart">
                <header className="platform-overview-chart-header">
                  <h2>Gender Split</h2>
                  <p>Student ratio by gender</p>
                </header>
                {hasGenderSplit ? (
                  <div className="platform-overview-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Legend />
                        <Pie
                          data={charts.gender_split}
                          dataKey="students"
                          nameKey="gender"
                          innerRadius={55}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          {charts.gender_split.map((row, index) => (
                            <Cell
                              key={`gender-split-${row.gender}-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderEmptyChart("No gender split data available.")
                )}
              </article>

              <article className="platform-overview-chart">
                <header className="platform-overview-chart-header">
                  <h2>Gender Performance</h2>
                  <p>Overall, practice, and challenge score by gender</p>
                </header>
                {hasGenderPerformance ? (
                  <div className="platform-overview-chart-body">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart
                        data={charts.gender_performance}
                        margin={{ top: 8, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={CHART_GRID_COLOR}
                        />
                        <XAxis
                          dataKey="gender"
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value, key) => [
                            formatPercent(value),
                            toOptionLabel(key),
                          ]}
                        />
                        <Legend />
                        <Bar
                          dataKey="overall"
                          fill={CHART_COLORS[0]}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="practice"
                          fill={CHART_COLORS[1]}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="challenge"
                          fill={CHART_COLORS[3]}
                          radius={[4, 4, 0, 0]}
                        />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderEmptyChart("No gender performance data available.")
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </>
  );
};

export default AnalyticsOverview;
