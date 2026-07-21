import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircleIcon,
  BarChart3,
  Building2,
  Loader2,
  School,
  Trophy,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import DemographicCard from "@/components/DemographicCard";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { schoolAnalyticsOverview } from "@/api/analyticsApi";
import {
  Area,
  AreaChart,
  Bar,
  BarChart as ReBarChart,
  Cell,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_CARDS = {
  total_schools: 0,
  cities: 0,
  total_students: 0,
  best_school: {
    school_id: null,
    name: "",
    avg_score: 0,
  },
};

const DEFAULT_CHARTS = {
  avg_score_by_school: [],
  students_per_school: [],
  active_students_by_day: [],
  active_students_by_hour: [],
};

const DEFAULT_FILTER_OPTIONS = {
  grades: [],
  time_ranges: [],
  sort_options: [],
  date_from: null,
  date_to: null,
};

const STATIC_TIME_RANGES = [
  "all_time",
  "last_30_days",
  "last_7_days",
  "this_month",
];

const STATIC_SORT_FIELDS = ["avg_score", "students", "problems", "rank"];
const CHART_BAR_COLORS = [
  "#38BDF8",
  "#818CF8",
  "#151D2E",
  "#FB923C",
  "#F4669F",
];
const CHART_GRID_COLOR = "#e2e8f0";
const CHART_TICK_COLOR = "#64748b";

const asArray = (value) => (Array.isArray(value) ? value : []);

const toOptionLabel = (value) =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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
const truncateAxisLabel = (value, maxLength = 12) => {
  const label = String(value ?? "");
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}...`;
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
const formatTotalHoursLabel = (value, fallbackLabel = "") => {
  if (fallbackLabel && typeof fallbackLabel === "string") {
    return fallbackLabel;
  }
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

const renderProgressCell = (value, tone) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const clamped = Math.min(100, Math.max(0, numeric));
  return (
    <div className="overview-progress">
      <span className={`overview-progress__value text-${tone}`}>
        {formatPercentage(clamped)}
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

const buildHydratedSchoolFilters = (
  responseFilters = {},
  appliedFilters = {},
) => ({
  grade_id: pickFilterValue(
    appliedFilters?.grade_id,
    appliedFilters?.grade,
    appliedFilters?.selected_grade_id,
    responseFilters?.selected_grade_id,
    responseFilters?.grade_id,
  ),
  time_range: pickFilterValue(
    appliedFilters?.time_range,
    appliedFilters?.selected_time_range,
    responseFilters?.selected_time_range,
    responseFilters?.time_range,
  ),
  date_from: pickFilterValue(
    appliedFilters?.date_from,
    responseFilters?.date_from,
    responseFilters?.selected_date_from,
  ),
  date_to: pickFilterValue(
    appliedFilters?.date_to,
    responseFilters?.date_to,
    responseFilters?.selected_date_to,
  ),
  sort_by: pickFilterValue(
    appliedFilters?.sort_by,
    appliedFilters?.selected_sort_by,
    responseFilters?.selected_sort_by,
    responseFilters?.sort_by,
  ),
  sort_dir: pickFilterValue(
    appliedFilters?.sort_dir,
    appliedFilters?.selected_sort_dir,
    responseFilters?.selected_sort_dir,
    responseFilters?.sort_dir,
  ),
});

const areSchoolFiltersEqual = (left, right) =>
  left.grade_id === right.grade_id &&
  left.time_range === right.time_range &&
  left.date_from === right.date_from &&
  left.date_to === right.date_to &&
  left.sort_by === right.sort_by &&
  left.sort_dir === right.sort_dir;

const buildTimeRangeOptions = (ranges, selected) => {
  const optionMap = new Map();

  [...asArray(ranges), ...STATIC_TIME_RANGES].forEach((item) => {
    if (item && typeof item === "object") {
      const value = String(item?.value ?? item?.id ?? item?.key ?? "");
      if (!value) return;
      optionMap.set(value, {
        value,
        label: String(item?.label ?? item?.name ?? toOptionLabel(value)),
      });
      return;
    }

    const value = String(item ?? "");
    if (!value) return;
    optionMap.set(value, {
      value,
      label: toOptionLabel(value),
    });
  });

  if (selected && !optionMap.has(String(selected))) {
    optionMap.set(String(selected), {
      value: String(selected),
      label: toOptionLabel(selected),
    });
  }

  return Array.from(optionMap.values());
};

const buildSortOptions = (options, selected) => {
  const optionMap = new Map();

  [...asArray(options), ...STATIC_SORT_FIELDS].forEach((item) => {
    if (item && typeof item === "object") {
      const value = String(item?.value ?? item?.id ?? item?.key ?? "");
      if (!value) return;
      optionMap.set(value, {
        value,
        label: String(item?.label ?? item?.name ?? toOptionLabel(value)),
      });
      return;
    }

    const value = String(item ?? "");
    if (!value) return;
    optionMap.set(value, {
      value,
      label: toOptionLabel(value),
    });
  });

  if (selected && !optionMap.has(String(selected))) {
    optionMap.set(String(selected), {
      value: String(selected),
      label: toOptionLabel(selected),
    });
  }

  return Array.from(optionMap.values());
};

const SchoolAnalyticsOverview = () => {
  const navigate = useNavigate();
  const [records, setRecords] = React.useState([]);
  const [cards, setCards] = React.useState(DEFAULT_CARDS);
  const [charts, setCharts] = React.useState(DEFAULT_CHARTS);
  const [filterOptions, setFilterOptions] = React.useState(
    DEFAULT_FILTER_OPTIONS,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [filters, setFilters] = React.useState({
    grade_id: null,
    time_range: null,
    date_from: null,
    date_to: null,
    sort_by: null,
    sort_dir: null,
  });
  const hasHydratedRef = React.useRef(false);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(handle);
  }, [searchTerm]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        const trimmedSearch = debouncedSearch.trim();
        if (trimmedSearch) {
          params.search = trimmedSearch;
        }
        if (filters.grade_id) {
          params.grade_id = filters.grade_id;
        }
        if (filters.time_range) {
          params.time_range = filters.time_range;
        }
        if (filters.date_from) {
          params.date_from = filters.date_from;
        }
        if (filters.date_to) {
          params.date_to = filters.date_to;
        }
        if (filters.sort_by) {
          params.sort_by = filters.sort_by;
        }
        if (filters.sort_dir) {
          params.sort_dir = filters.sort_dir;
        }

        const response = await schoolAnalyticsOverview(params);
        if (!isMounted) {
          return;
        }

        const container = response?.data ?? {};
        const rows = asArray(container?.schools?.rows);
        const responseCards = container?.cards ?? {};
        const responseBestSchool = responseCards?.best_school ?? {};
        const responseCharts = container?.charts ?? {};
        const responseFilters = container?.filters ?? {};
        const appliedFilters =
          container?.applied_filters ??
          responseFilters?.applied_filters ??
          {};
        const responseMeta = container?.meta ?? {};

        setRecords(rows);
        setCards({
          total_schools: toNumber(responseCards?.total_schools, 0),
          cities: toNumber(responseCards?.cities, 0),
          total_students: toNumber(responseCards?.total_students, 0),
          best_school: {
            school_id: responseBestSchool?.school_id ?? null,
            name: responseBestSchool?.name ?? "",
            avg_score: toNumber(responseBestSchool?.avg_score, 0),
          },
        });
        setCharts({
          avg_score_by_school: asArray(responseCharts?.avg_score_by_school).map(
            (item) => ({
              school: item?.school ?? "-",
              avg_score: toNumber(item?.avg_score, 0),
            }),
          ),
          students_per_school: asArray(responseCharts?.students_per_school).map(
            (item) => ({
              school: item?.school ?? "-",
              students: toNumber(item?.students, 0),
            }),
          ),
          active_students_by_day: asArray(
            responseCharts?.active_students_by_day,
          ).map((item) => ({
            date: item?.date ?? "-",
            active_students: toNumber(item?.active_students, 0),
          })),
          active_students_by_hour: asArray(
            responseCharts?.active_students_by_hour,
          ).map((item) => ({
            hour: item?.hour ?? "-",
            active_students: toNumber(item?.active_students, 0),
          })),
        });
        setFilterOptions({
          grades: asArray(responseFilters?.grades),
          time_ranges: asArray(responseFilters?.time_ranges),
          sort_options: asArray(responseFilters?.sort_options),
          date_from: responseFilters?.date_from ?? null,
          date_to: responseFilters?.date_to ?? null,
        });

        if (!hasHydratedRef.current) {
          hasHydratedRef.current = true;
          const hydratedFilters = buildHydratedSchoolFilters(
            responseFilters,
            appliedFilters,
          );

          setFilters((prev) =>
            areSchoolFiltersEqual(prev, hydratedFilters)
              ? prev
              : hydratedFilters,
          );
        }

        void responseMeta;
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err?.message || "Failed to load school analytics. Please try again.";
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
  }, [debouncedSearch, filters]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const updateFilter = (key, value) => {
    const normalizedValue = value === "" ? null : value;
    setFilters((prev) => {
      if (prev[key] === normalizedValue) {
        return prev;
      }
      return { ...prev, [key]: normalizedValue };
    });
    setCurrentPage(1);
  };

  const filteredRecords = React.useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) {
      return records;
    }

    return records.filter((row) => {
      const haystack = [
        row?.school,
        row?.city,
        row?.rank,
        row?.students,
        row?.active_students,
        row?.avg_score,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [records, debouncedSearch]);

  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const from = totalItems === 0 ? 0 : (activePage - 1) * rowsPerPage + 1;
  const to =
    totalItems === 0 ? 0 : Math.min(totalItems, from + rowsPerPage - 1);
  const paginatedRows = React.useMemo(
    () => filteredRecords.slice(Math.max(0, from - 1), to),
    [filteredRecords, from, to],
  );
  const hasSearchQuery = Boolean(debouncedSearch.trim());

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const timeRangeOptions = React.useMemo(
    () => buildTimeRangeOptions(filterOptions.time_ranges, filters.time_range),
    [filterOptions.time_ranges, filters.time_range],
  );

  const sortOptions = React.useMemo(
    () => buildSortOptions(filterOptions.sort_options, filters.sort_by),
    [filterOptions.sort_options, filters.sort_by],
  );

  const openSchoolAnalyticsDetail = (row) => {
    const id = row?.school_id;
    if (!id) {
      return;
    }

    navigate(`/admin/school-analytics-overview-detail/${id}`, {
      state: {
        schoolId: id,
        school: row,
      },
    });
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>School Analytics</h1>
          <p className="text-slate-600 text-md">
            Compare school performance, student volumes, and engagement trends.
          </p>
        </div>
      </div>

      <section className="metrics-grid mt-5 mb-6">
        <DemographicCard
          icon={<School size={24} />}
          title="Schools"
          classname="demoGreen"
          count={formatNumber(cards.total_schools)}
          subheading="Total registered schools"
        />
        <DemographicCard
          icon={<Users size={24} />}
          title="Students"
          classname="demoSky"
          count={formatNumber(cards.total_students)}
          subheading="Learners across schools"
        />
        <DemographicCard
          icon={<Building2 size={24} />}
          title="Cities"
          classname="demoPurple"
          count={formatNumber(cards.cities)}
          subheading="Cities represented"
        />
        <DemographicCard
          icon={<Trophy size={24} />}
          title={cards?.best_school?.name || "No best school available"}
          classname="demoOrange"
          //count={formatPercentage(cards?.best_school?.avg_score)}
          subheading="Best school"
        />
      </section>

      <div className="dashboard-body dashboard-body-card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Filters</h3>
            <p className="text-xs text-slate-500">
              Filter school analytics by grade, date range, and sort preference.
            </p>
          </div>
          <button
            type="button"
            className="global-btn secondary"
            onClick={() => {
              hasHydratedRef.current = false;
              setFilters({
                grade_id: null,
                time_range: null,
                date_from: null,
                date_to: null,
                sort_by: null,
                sort_dir: null,
              });
              setSearchTerm("");
              setDebouncedSearch("");
              setCurrentPage(1);
            }}
            disabled={loading}
          >
            Reset Filters
          </button>
        </div>

        <div className="grid gap-4 mt-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Grade
            </label>
            <SearchableMultiSelect
              options={filterOptions.grades}
              value={filters.grade_id ?? ""}
              multiple={false}
              onChange={(value) => updateFilter("grade_id", value)}
              placeholder="Search grade"
              valueKey="id"
              labelKey="name"
              alwaysVisibleValues={
                filters.grade_id ? [filters.grade_id] : []
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Time Range
            </label>
            <SearchableMultiSelect
              options={timeRangeOptions}
              value={filters.time_range ?? ""}
              multiple={false}
              onChange={(value) => updateFilter("time_range", value)}
              placeholder="Search time range"
              alwaysVisibleValues={
                filters.time_range ? [filters.time_range] : []
              }
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
              onChange={(event) => updateFilter("date_to", event.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Sort By
            </label>
            <SearchableMultiSelect
              options={sortOptions}
              value={filters.sort_by ?? ""}
              multiple={false}
              onChange={(value) => updateFilter("sort_by", value)}
              placeholder="Search sort field"
              alwaysVisibleValues={filters.sort_by ? [filters.sort_by] : []}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Sort Direction
            </label>
            <select
              className="form-input mt-2.5"
              value={filters.sort_dir ?? ""}
              onChange={(event) =>
                updateFilter("sort_dir", event.target.value || null)
              }
              disabled={loading}
            >
              <option value="">All</option>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card mb-6">
        <div className="analytics-detail-chart-grid">
          <article className="analytics-detail-chart-card">
            <header className="analytics-detail-chart-header">
              <h2 className="analytics-detail-chart-title">
                <BarChart3 size={18} /> Avg Score By School
              </h2>
              <p className="analytics-detail-chart-subtitle">
                Comparison of average score across schools
              </p>
            </header>

            {charts.avg_score_by_school.length === 0 ? (
              <div className="analytics-empty-state">
                No score chart data available.
              </div>
            ) : (
              <div className="analytics-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart
                    layout="vertical"
                    data={charts.avg_score_by_school}
                    margin={{ top: 8, right: 18, left: 30, bottom: 5 }}
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
                      dataKey="school"
                      width={180}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => truncateAxisLabel(value, 16)}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatPercentage(value),
                        "Avg Score",
                      ]}
                    />
                    <Bar
                      dataKey="avg_score"
                      radius={[0, 7, 7, 0]}
                      maxBarSize={20}
                    >
                      {charts.avg_score_by_school.map((item, index) => (
                        <Cell
                          key={`avg-score-bar-${item.school}-${index}`}
                          fill={
                            CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]
                          }
                        />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>

          <article className="analytics-detail-chart-card">
            <header className="analytics-detail-chart-header">
              <h2 className="analytics-detail-chart-title">
                <Users size={18} /> Students Per School
              </h2>
              <p className="analytics-detail-chart-subtitle">
                Student distribution across schools
              </p>
            </header>

            {charts.students_per_school.length === 0 ? (
              <div className="analytics-empty-state">
                No student distribution data available.
              </div>
            ) : (
              <div className="analytics-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart
                    layout="vertical"
                    data={charts.students_per_school}
                    margin={{ top: 8, right: 18, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="school"
                      width={180}
                      interval={0}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => truncateAxisLabel(value, 16)}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${formatNumber(value)}`,
                        "Students",
                      ]}
                    />
                    <Bar
                      dataKey="students"
                      radius={[0, 7, 7, 0]}
                      maxBarSize={20}
                    >
                      {charts.students_per_school.map((item, index) => (
                        <Cell
                          key={`students-bar-${item.school}-${index}`}
                          fill={
                            CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]
                          }
                        />
                      ))}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>

          <article className="analytics-detail-chart-card">
            <header className="analytics-detail-chart-header">
              <h2 className="analytics-detail-chart-title">
                <BarChart3 size={18} /> Active Students By Day
              </h2>
              <p className="analytics-detail-chart-subtitle">
                Daily active student trend over the selected date range
              </p>
            </header>

            {charts.active_students_by_day.length === 0 ? (
              <div className="analytics-empty-state">
                No daily active student data available.
              </div>
            ) : (
              <div className="analytics-chart-wrap">
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
                          stopColor={CHART_BAR_COLORS[1]}
                          stopOpacity={0.45}
                        />
                        <stop
                          offset="100%"
                          stopColor={CHART_BAR_COLORS[1]}
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
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="active_students"
                      name="Active Students"
                      stroke={CHART_BAR_COLORS[1]}
                      fill="url(#activeStudentsByDayGradient)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: CHART_BAR_COLORS[1] }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>

          <article className="analytics-detail-chart-card">
            <header className="analytics-detail-chart-header">
              <h2 className="analytics-detail-chart-title">
                <BarChart3 size={18} /> Active Students By Hour
              </h2>
              <p className="analytics-detail-chart-subtitle">
                Hourly active student distribution
              </p>
            </header>

            {charts.active_students_by_hour.length === 0 ? (
              <div className="analytics-empty-state">
                No hourly active student data available.
              </div>
            ) : (
              <div className="analytics-chart-wrap">
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
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
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
            )}
          </article>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        {error && (
          <Alert variant="destructive" className="alert-custom mb-4">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <ListToolbar
          searchPlaceholder="Search schools..."
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          currentPage={activePage}
          totalPages={totalPages}
          totalItems={totalItems}
          from={from}
          to={to}
          onPageChange={setCurrentPage}
          disabled={loading}
          loading={loading}
        />

        <Table className="global-table analytics-overview-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>School</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Active Students</TableHead>
              <TableHead>Avg Score</TableHead>
              <TableHead>Practice</TableHead>
              <TableHead>Challenge</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Rank</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-6">
                  {hasSearchQuery
                    ? "No schools match your search."
                    : "No schools available."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, index) => (
                <TableRow
                  key={row?.school_id ?? index}
                  className={
                    row?.school_id ? "analytics-overview-row-clickable" : ""
                  }
                  role={row?.school_id ? "button" : undefined}
                  tabIndex={row?.school_id ? 0 : undefined}
                  onClick={
                    row?.school_id
                      ? () => openSchoolAnalyticsDetail(row)
                      : undefined
                  }
                  onKeyDown={
                    row?.school_id
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openSchoolAnalyticsDetail(row);
                          }
                        }
                      : undefined
                  }
                >
                  <TableCell className="font-medium text-slate-300">
                    {from + index}
                  </TableCell>
                  <TableCell>
                    <div className="overview-title">
                      <span className="overview-title__name">
                        {row?.school ?? "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="overview-muted">
                    {row?.city ?? "-"}
                  </TableCell>
                  <TableCell className="overview-strong">
                    {formatNumber(row?.students)}
                  </TableCell>
                  <TableCell className="overview-strong">
                    {formatNumber(row?.active_students)}
                  </TableCell>
                  <TableCell>
                    {renderProgressCell(row?.avg_score, "tone-avg")}
                  </TableCell>
                  <TableCell>
                    {renderProgressCell(row?.practice_score, "tone-practice")}
                  </TableCell>
                  <TableCell>
                    {renderProgressCell(row?.challenge_score, "tone-challenge")}
                  </TableCell>
                  <TableCell className="overview-muted">
                    {formatTotalHoursLabel(
                      row?.total_hours,
                      row?.total_hours_label ?? row?.hours_label ?? "",
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="overview-chip">
                      {formatNumber(row?.rank)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default SchoolAnalyticsOverview;
