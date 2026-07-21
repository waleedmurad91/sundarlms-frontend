import React from "react";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { subjectUnitsAnalyticsOverview } from "@/api/analyticsApi";
import {
  AlertCircleIcon,
  BarChart3,
  Clock3,
  Loader2,
  PercentCircle,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CHART_COLORS = ["#38BDF8", "#818CF8", "#151D2E", "#FB923C", "#F4669F"];
const CHART_GRID_COLOR = "#e2e8f0";
const CHART_TICK_COLOR = "#64748b";

const DEFAULT_FILTER_META = {
  grades: [],
  subjects: [],
  units: [],
  selected_grade_id: null,
  selected_grade_name: null,
  selected_subject_id: null,
  selected_subject_name: null,
  selected_unit_id: null,
  selected_unit_name: null,
  date_from: null,
  date_to: null,
};

const DEFAULT_FILTERS = {
  grade_id: null,
  subject_id: null,
  unit_id: null,
  date_from: null,
  date_to: null,
};

const pickFilterValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") {
      continue;
    }

    if (Array.isArray(candidate)) {
      const first = candidate.find(
        (item) => item !== null && item !== undefined && item !== "",
      );
      if (first === undefined) continue;
      if (typeof first === "object") {
        const nested =
          first?.id ?? first?.value ?? first?.key ?? first?._id ?? null;
        if (nested !== null && nested !== undefined && nested !== "") {
          return String(nested);
        }
        continue;
      }
      return String(first);
    }

    if (typeof candidate === "object") {
      const nested =
        candidate?.id ??
        candidate?.value ??
        candidate?.key ??
        candidate?._id ??
        null;
      if (nested !== null && nested !== undefined && nested !== "") {
        return String(nested);
      }
      continue;
    }

    return String(candidate);
  }
  return null;
};

const buildHydratedSubjectUnitFilters = (
  payloadFilters = {},
  appliedFilters = {},
) => ({
  grade_id: pickFilterValue(
    appliedFilters?.grade_id,
    appliedFilters?.grade,
    appliedFilters?.selected_grade_id,
    payloadFilters?.selected_grade_id,
    payloadFilters?.grade_id,
  ),
  subject_id: pickFilterValue(
    appliedFilters?.subject_id,
    appliedFilters?.subject,
    appliedFilters?.selected_subject_id,
    payloadFilters?.selected_subject_id,
    payloadFilters?.subject_id,
  ),
  unit_id: pickFilterValue(
    appliedFilters?.unit_id,
    appliedFilters?.unit,
    appliedFilters?.selected_unit_id,
    payloadFilters?.selected_unit_id,
    payloadFilters?.unit_id,
  ),
  date_from: pickFilterValue(
    appliedFilters?.date_from,
    payloadFilters?.date_from,
    payloadFilters?.selected_date_from,
  ),
  date_to: pickFilterValue(
    appliedFilters?.date_to,
    payloadFilters?.date_to,
    payloadFilters?.selected_date_to,
  ),
});

const areSubjectUnitFiltersEqual = (left, right) =>
  left.grade_id === right.grade_id &&
  left.subject_id === right.subject_id &&
  left.unit_id === right.unit_id &&
  left.date_from === right.date_from &&
  left.date_to === right.date_to;

const DEFAULT_TABLE = {
  level: "grade",
  row_level: "subject",
  rows: [],
};

const DEFAULT_CHARTS = {
  practice_vs_challenge: [],
  subject_completion_rate: [],
  topic_success_rate: [],
  avg_time_per_question: [],
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionLabel = (value) =>
  String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }
  return parsed.toLocaleString();
};

const formatPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "-";
  }
  return `${parsed.toFixed(1)}%`;
};

const truncateAxisLabel = (value, maxLength = 12) => {
  const label = String(value ?? "");
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}...`;
};

const renderProgressCell = (value, tone) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const clamped = Math.min(100, Math.max(0, numeric));
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

const getRowId = (row) =>
  row?.id ??
  row?.subject_id ??
  row?.unit_id ??
  row?.topic_id ??
  row?.name ??
  "row";

const getRowName = (row) =>
  row?.name ?? row?.subject ?? row?.unit ?? row?.topic ?? "N/A";

const inferRowLevel = (tableLevel) => {
  if (tableLevel === "grade") {
    return "subject";
  }
  if (tableLevel === "subject") {
    return "unit";
  }
  if (tableLevel === "unit") {
    return "topic";
  }
  return "subject";
};

const SubjectUnitsAnalyticsOverview = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [filtersMeta, setFiltersMeta] = React.useState(DEFAULT_FILTER_META);
  const [filters, setFilters] = React.useState(DEFAULT_FILTERS);
  const [tableData, setTableData] = React.useState(DEFAULT_TABLE);
  const [charts, setCharts] = React.useState(DEFAULT_CHARTS);
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
        if (filters.unit_id) params.unit_id = filters.unit_id;
        if (filters.date_from) params.date_from = filters.date_from;
        if (filters.date_to) params.date_to = filters.date_to;

        const response = await subjectUnitsAnalyticsOverview(params);
        if (!isMounted) {
          return;
        }

        const payload = response?.data ?? {};
        const payloadFilters = payload?.filters ?? {};
        const appliedFilters =
          payload?.applied_filters ?? payloadFilters?.applied_filters ?? {};
        const payloadTable = payload?.table ?? {};
        const payloadCharts = payload?.charts ?? {};

        setFiltersMeta({
          grades: asArray(payloadFilters?.grades),
          subjects: asArray(payloadFilters?.subjects),
          units: asArray(payloadFilters?.units),
          selected_grade_id: payloadFilters?.selected_grade_id ?? null,
          selected_grade_name: payloadFilters?.selected_grade_name ?? null,
          selected_subject_id: payloadFilters?.selected_subject_id ?? null,
          selected_subject_name: payloadFilters?.selected_subject_name ?? null,
          selected_unit_id: payloadFilters?.selected_unit_id ?? null,
          selected_unit_name: payloadFilters?.selected_unit_name ?? null,
          date_from:
            appliedFilters?.date_from ?? payloadFilters?.date_from ?? null,
          date_to: appliedFilters?.date_to ?? payloadFilters?.date_to ?? null,
        });

        if (!hasHydratedRef.current) {
          hasHydratedRef.current = true;
          const hydratedFilters = buildHydratedSubjectUnitFilters(
            payloadFilters,
            appliedFilters,
          );

          setFilters((prev) =>
            areSubjectUnitFiltersEqual(prev, hydratedFilters)
              ? prev
              : hydratedFilters,
          );
        }

        const resolvedLevel = payloadTable?.level ?? "grade";
        const resolvedRowLevel =
          payloadTable?.row_level ?? inferRowLevel(resolvedLevel);

        setTableData({
          level: resolvedLevel,
          row_level: resolvedRowLevel,
          rows: asArray(payloadTable?.rows).map((row) => ({
            id: getRowId(row),
            name: getRowName(row),
            practice_attempted: toNumber(row?.practice_attempted, 0),
            practice_correct: toNumber(row?.practice_correct, 0),
            practice_percent: toNumber(row?.practice_percent, 0),
            practice_score: toNumber(row?.practice_score, 0),
            challenge_attempted: toNumber(row?.challenge_attempted, 0),
            challenge_correct: toNumber(row?.challenge_correct, 0),
            challenge_percent: toNumber(row?.challenge_percent, 0),
            challenge_score: toNumber(row?.challenge_score, 0),
            overall_score: toNumber(row?.overall_score, 0),
            resets: toNumber(row?.resets, 0),
            avg_time_per_question_seconds: toNumber(
              row?.avg_time_per_question_seconds,
              0,
            ),
            avg_time_per_question_label:
              row?.avg_time_per_question_label ??
              `${toNumber(row?.avg_time_per_question_seconds, 0)}s`,
          })),
        });

        setCharts({
          practice_vs_challenge: asArray(
            payloadCharts?.practice_vs_challenge,
          ).map((row) => ({
            id: getRowId(row),
            name: getRowName(row),
            practice_score: toNumber(row?.practice_score, 0),
            challenge_score: toNumber(row?.challenge_score, 0),
            practice_attempted: toNumber(row?.practice_attempted, 0),
            challenge_attempted: toNumber(row?.challenge_attempted, 0),
          })),
          subject_completion_rate: asArray(
            payloadCharts?.subject_completion_rate,
          ).map((row) => ({
            id: getRowId(row),
            name: getRowName(row),
            completion_rate: toNumber(row?.completion_rate, 0),
            attempted_questions: toNumber(row?.attempted_questions, 0),
            total_questions: toNumber(row?.total_questions, 0),
          })),
          topic_success_rate: asArray(payloadCharts?.topic_success_rate).map(
            (row) => ({
              id: getRowId(row),
              name: getRowName(row),
              practice_percent: toNumber(row?.practice_percent, 0),
              challenge_percent: toNumber(row?.challenge_percent, 0),
            }),
          ),
          avg_time_per_question: asArray(
            payloadCharts?.avg_time_per_question,
          ).map((row) => ({
            id: getRowId(row),
            name: getRowName(row),
            avg_time_per_question_seconds: toNumber(
              row?.avg_time_per_question_seconds,
              0,
            ),
            avg_time_per_question_label:
              row?.avg_time_per_question_label ??
              `${toNumber(row?.avg_time_per_question_seconds, 0)}s`,
          })),
        });
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err?.message || "Failed to load subject/units analytics overview.";
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

  const updateFilter = (key, value) => {
    const normalizedValue = value === "" ? null : value;
    setFilters((prev) => {
      let nextFilters = prev;
      if (key === "grade_id") {
        nextFilters = {
          ...prev,
          grade_id: normalizedValue,
          subject_id: null,
          unit_id: null,
        };
      } else if (key === "subject_id") {
        nextFilters = {
          ...prev,
          subject_id: normalizedValue,
          unit_id: null,
        };
      } else {
        nextFilters = {
          ...prev,
          [key]: normalizedValue,
        };
      }

      if (areSubjectUnitFiltersEqual(nextFilters, prev)) {
        return prev;
      }
      return nextFilters;
    });
  };

  const resetFilters = () => {
    hasHydratedRef.current = false;
    setFilters({ ...DEFAULT_FILTERS });
  };

  const rowLevelLabel = toOptionLabel(tableData.row_level);
  const currentLevelLabel = toOptionLabel(tableData.level);
  const gradeOptions = React.useMemo(
    () =>
      asArray(filtersMeta.grades).map((grade) => ({
        ...grade,
        label: `Grade ${grade?.name ?? ""}`.trim(),
      })),
    [filtersMeta.grades],
  );
  const selectedGradeLabel = React.useMemo(() => {
    if (filtersMeta.selected_grade_name) {
      return `Grade ${filtersMeta.selected_grade_name}`;
    }
    if (!filters.grade_id) {
      return "All Grades";
    }
    const matched = gradeOptions.find(
      (grade) => String(grade?.id) === String(filters.grade_id),
    );
    return matched?.label ?? `Grade ${filters.grade_id}`;
  }, [filtersMeta.selected_grade_name, filters.grade_id, gradeOptions]);
  const selectedSubjectLabel = React.useMemo(() => {
    if (filtersMeta.selected_subject_name) {
      return filtersMeta.selected_subject_name;
    }
    if (!filters.subject_id) {
      return "All Subjects";
    }
    const matched = asArray(filtersMeta.subjects).find(
      (subject) => String(subject?.id) === String(filters.subject_id),
    );
    return matched?.name ?? String(filters.subject_id);
  }, [
    filtersMeta.selected_subject_name,
    filtersMeta.subjects,
    filters.subject_id,
  ]);
  const selectedUnitLabel = React.useMemo(() => {
    if (filtersMeta.selected_unit_name) {
      return filtersMeta.selected_unit_name;
    }
    if (!filters.unit_id) {
      return "All Units";
    }
    const matched = asArray(filtersMeta.units).find(
      (unit) => String(unit?.id) === String(filters.unit_id),
    );
    return matched?.name ?? String(filters.unit_id);
  }, [filtersMeta.selected_unit_name, filtersMeta.units, filters.unit_id]);

  const selectedDateFromLabel = filters.date_from || "Any";
  const selectedDateToLabel = filters.date_to || "Any";
  const practiceChallengeLabelMap = React.useMemo(() => {
    return charts.practice_vs_challenge.reduce((acc, row) => {
      acc[String(row.id)] = row.name;
      return acc;
    }, {});
  }, [charts.practice_vs_challenge]);
  const completionLabelMap = React.useMemo(() => {
    return charts.subject_completion_rate.reduce((acc, row) => {
      acc[String(row.id)] = row.name;
      return acc;
    }, {});
  }, [charts.subject_completion_rate]);
  const topicSuccessLabelMap = React.useMemo(() => {
    return charts.topic_success_rate.reduce((acc, row) => {
      acc[String(row.id)] = row.name;
      return acc;
    }, {});
  }, [charts.topic_success_rate]);
  const avgTimeLabelMap = React.useMemo(() => {
    return charts.avg_time_per_question.reduce((acc, row) => {
      acc[String(row.id)] = row.name;
      return acc;
    }, {});
  }, [charts.avg_time_per_question]);

  const renderEmptyChart = (label) => (
    <div className="analytics-empty-state">{label}</div>
  );

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Subject / Units Analytics</h1>
          <p className="text-slate-600 text-md">
            Filter by grade, subject, unit, and date range to track performance
            progression from subjects to units to topics.
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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Filters</h3>
              <p className="text-xs text-slate-500">
                Filter by grade, subject, unit, and date range.
              </p>
            </div>
            <button
              type="button"
              className="global-btn secondary"
              onClick={resetFilters}
              disabled={loading}
            >
              Reset Filters
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Grade
              </label>
              <SearchableMultiSelect
                options={gradeOptions}
                value={filters.grade_id ?? ""}
                multiple={false}
                onChange={(value) => updateFilter("grade_id", value)}
                placeholder="Search grade"
                valueKey="id"
                labelKey="label"
                alwaysVisibleValues={
                  filters.grade_id ? [filters.grade_id] : []
                }
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
                alwaysVisibleValues={
                  filters.subject_id ? [filters.subject_id] : []
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Unit
              </label>
              <SearchableMultiSelect
                options={filtersMeta.units}
                value={filters.unit_id ?? ""}
                multiple={false}
                onChange={(value) => updateFilter("unit_id", value)}
                placeholder={
                  filters.subject_id ? "Search unit" : "Select subject first"
                }
                valueKey="id"
                labelKey="name"
                disabled={!filters.subject_id}
                alwaysVisibleValues={filters.unit_id ? [filters.unit_id] : []}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Date From
              </label>
              <input
                type="date"
                className="form-input mt-2.5"
                value={filters.date_from ?? ""}
                onChange={(event) =>
                  updateFilter("date_from", event.target.value)
                }
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Date To
              </label>
              <input
                type="date"
                className="form-input mt-2.5"
                value={filters.date_to ?? ""}
                onChange={(event) =>
                  updateFilter("date_to", event.target.value)
                }
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-52 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        ) : (
          <>
            <div className="dashboard-body-card mb-6">
              <div className="analytics-detail-chart-grid">
                <article className="analytics-detail-chart-card">
                  <header className="analytics-detail-chart-header">
                    <h2 className="analytics-detail-chart-title">
                      <BarChart3 size={18} /> Practice vs Challenge Score
                    </h2>
                    <p className="analytics-detail-chart-subtitle">
                      Comparison of practice and challenge scores
                    </p>
                  </header>

                  {charts.practice_vs_challenge.length === 0 ? (
                    renderEmptyChart("No practice vs challenge chart data.")
                  ) : (
                    <div className="analytics-chart-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart
                          data={charts.practice_vs_challenge}
                          margin={{ top: 8, right: 10, left: -18, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={CHART_GRID_COLOR}
                          />
                          <XAxis
                            dataKey="id"
                            tick={{ fill: CHART_TICK_COLOR, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) =>
                              truncateAxisLabel(
                                practiceChallengeLabelMap[String(value)] ??
                                  String(value),
                                9,
                              )
                            }
                            interval={0}
                            height={42}
                          />
                          <YAxis
                            tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            labelFormatter={(value) =>
                              practiceChallengeLabelMap[String(value)] ??
                              String(value)
                            }
                            formatter={(value, _key, payload) => {
                              const dataKey = payload?.dataKey;
                              if (dataKey === "practice_score") {
                                return [
                                  formatPercent(value),
                                  `Practice Score (${formatNumber(payload?.payload?.practice_attempted)})`,
                                ];
                              }
                              return [
                                formatPercent(value),
                                `Challenge Score (${formatNumber(payload?.payload?.challenge_attempted)})`,
                              ];
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="practice_score"
                            name="Practice Score"
                            fill={CHART_COLORS[0]}
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="challenge_score"
                            name="Challenge Score"
                            fill={CHART_COLORS[1]}
                            radius={[4, 4, 0, 0]}
                          />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </article>

                <article className="analytics-detail-chart-card">
                  <header className="analytics-detail-chart-header">
                    <h2 className="analytics-detail-chart-title">
                      <Target size={18} /> Completion Rate
                    </h2>
                    <p className="analytics-detail-chart-subtitle">
                      Completion percentage by current level selection
                    </p>
                  </header>

                  {charts.subject_completion_rate.length === 0 ? (
                    renderEmptyChart("No completion rate chart data.")
                  ) : (
                    <div className="analytics-chart-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart
                          layout="vertical"
                          data={charts.subject_completion_rate}
                          margin={{ top: 8, right: 18, left: 24, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke={CHART_GRID_COLOR}
                          />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="id"
                            width={120}
                            interval={0}
                            tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) =>
                              truncateAxisLabel(
                                completionLabelMap[String(value)] ??
                                  String(value),
                                16,
                              )
                            }
                          />
                          <Tooltip
                            labelFormatter={(value) =>
                              completionLabelMap[String(value)] ?? String(value)
                            }
                            formatter={(value, _key, payload) => [
                              formatPercent(value),
                              `Attempted ${formatNumber(payload?.payload?.attempted_questions)} / ${formatNumber(payload?.payload?.total_questions)}`,
                            ]}
                          />
                          <Bar
                            dataKey="completion_rate"
                            radius={[0, 6, 6, 0]}
                            maxBarSize={20}
                          >
                            {charts.subject_completion_rate.map(
                              (row, index) => (
                                <Cell
                                  key={`completion-rate-${row.id}-${index}`}
                                  fill={
                                    CHART_COLORS[index % CHART_COLORS.length]
                                  }
                                />
                              ),
                            )}
                          </Bar>
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </article>

                <article className="analytics-detail-chart-card">
                  <header className="analytics-detail-chart-header">
                    <h2 className="analytics-detail-chart-title">
                      <PercentCircle size={18} /> Topic Success Rate
                    </h2>
                    <p className="analytics-detail-chart-subtitle">
                      Practice and challenge success percentages
                    </p>
                  </header>

                  {charts.topic_success_rate.length === 0 ? (
                    renderEmptyChart("No topic success rate chart data.")
                  ) : (
                    <div className="analytics-chart-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart
                          data={charts.topic_success_rate}
                          margin={{ top: 8, right: 10, left: -18, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={CHART_GRID_COLOR}
                          />
                          <XAxis
                            dataKey="id"
                            tick={{ fill: CHART_TICK_COLOR, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) =>
                              truncateAxisLabel(
                                topicSuccessLabelMap[String(value)] ??
                                  String(value),
                                9,
                              )
                            }
                            interval={0}
                            height={42}
                          />
                          <YAxis
                            tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            labelFormatter={(value) =>
                              topicSuccessLabelMap[String(value)] ??
                              String(value)
                            }
                            formatter={(_value, _key, payload) => {
                              const row = payload?.payload ?? {};
                              const dataKey = payload?.dataKey;
                              const resolvedValue =
                                dataKey === "practice_percent"
                                  ? row.practice_percent
                                  : row.challenge_percent;
                              return [
                                formatPercent(resolvedValue),
                                dataKey === "practice_percent"
                                  ? "Practice Success"
                                  : "Challenge Success",
                              ];
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="practice_percent"
                            name="Practice Score"
                            fill={CHART_COLORS[3]}
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="challenge_percent"
                            name="Challenge Score"
                            fill={CHART_COLORS[4]}
                            radius={[4, 4, 0, 0]}
                          />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </article>

                <article className="analytics-detail-chart-card">
                  <header className="analytics-detail-chart-header">
                    <h2 className="analytics-detail-chart-title">
                      <Clock3 size={18} /> Avg Time Per Question
                    </h2>
                    <p className="analytics-detail-chart-subtitle">
                      Average solving time per question
                    </p>
                  </header>

                  {charts.avg_time_per_question.length === 0 ? (
                    renderEmptyChart("No average time chart data.")
                  ) : (
                    <div className="analytics-chart-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart
                          data={charts.avg_time_per_question}
                          margin={{ top: 8, right: 10, left: -18, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={CHART_GRID_COLOR}
                          />
                          <XAxis
                            dataKey="id"
                            tick={{ fill: CHART_TICK_COLOR, fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) =>
                              truncateAxisLabel(
                                avgTimeLabelMap[String(value)] ?? String(value),
                                9,
                              )
                            }
                            interval={0}
                            height={42}
                          />
                          <YAxis
                            tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            labelFormatter={(value) =>
                              avgTimeLabelMap[String(value)] ?? String(value)
                            }
                            formatter={(_value, _key, payload) => [
                              payload?.payload?.avg_time_per_question_label ??
                                "-",
                              "Avg Time / Question",
                            ]}
                          />
                          <Bar
                            dataKey="avg_time_per_question_seconds"
                            radius={[4, 4, 0, 0]}
                          >
                            {charts.avg_time_per_question.map((row, index) => (
                              <Cell
                                key={`avg-time-${row.id}-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </article>
              </div>
            </div>

            <div className="dashboard-body-card">
              <div className="analytics-section-header">
                <div>
                  <h2>{rowLevelLabel} Performance Table</h2>
                  <p>
                    Current level: <strong>{currentLevelLabel}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="overview-chip">{rowLevelLabel}</span>
                  <span className="overview-chip">
                    Grade: {selectedGradeLabel}
                  </span>
                  <span className="overview-chip">
                    Subject: {selectedSubjectLabel}
                  </span>
                  <span className="overview-chip">
                    Unit: {selectedUnitLabel}
                  </span>
                  <span className="overview-chip">
                    From: {selectedDateFromLabel}
                  </span>
                  <span className="overview-chip">
                    To: {selectedDateToLabel}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="global-table analytics-overview-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{rowLevelLabel}</TableHead>
                      <TableHead>Practice Att</TableHead>
                      <TableHead>Practice Correct</TableHead>
                      <TableHead>Practice %</TableHead>
                      <TableHead>Challenge Att</TableHead>
                      <TableHead>Challenge Correct</TableHead>
                      <TableHead>Challenge %</TableHead>
                      <TableHead>Overall</TableHead>
                      <TableHead>Resets</TableHead>
                      <TableHead>Avg Time/Q</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-6">
                          No {rowLevelLabel.toLowerCase()} data available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableData.rows.map((row, index) => (
                        <TableRow key={`${row.id}-${index}`}>
                          <TableCell className="overview-title__name">
                            {row.name}
                          </TableCell>
                          <TableCell>
                            {formatNumber(row.practice_attempted)}
                          </TableCell>
                          <TableCell>
                            {formatNumber(row.practice_correct)}
                          </TableCell>
                          <TableCell>
                            {renderProgressCell(
                              row.practice_percent,
                              "tone-practice",
                            )}
                          </TableCell>
                          <TableCell>
                            {formatNumber(row.challenge_attempted)}
                          </TableCell>
                          <TableCell>
                            {formatNumber(row.challenge_correct)}
                          </TableCell>
                          <TableCell>
                            {renderProgressCell(
                              row.challenge_percent,
                              "tone-challenge",
                            )}
                          </TableCell>
                          <TableCell>
                            {renderProgressCell(row.overall_score, "tone-avg")}
                          </TableCell>
                          <TableCell>{formatNumber(row.resets)}</TableCell>
                          <TableCell>
                            {row.avg_time_per_question_label}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default SubjectUnitsAnalyticsOverview;
