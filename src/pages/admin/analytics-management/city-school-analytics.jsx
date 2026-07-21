import React from "react";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import DemographicCard from "@/components/DemographicCard";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { citySchoolAnalyticsOverview } from "@/api/analyticsApi";
import {
  AlertCircleIcon,
  BarChart3,
  Building2,
  Clock3,
  Loader2,
  MapPinned,
  Trophy,
} from "lucide-react";
import {
  Area,
  AreaChart,
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

const DEFAULT_CARDS = {
  cities: 0,
  schools: 0,
  best_city: {
    name: "",
    avg_score: 0,
  },
  most_active: {
    name: "",
    total_hours: 0,
  },
};

const DEFAULT_CHARTS = {
  avg_score_by_city: [],
  male_vs_female_score_by_city: [],
  active_students_by_day: [],
  active_students_by_hour: [],
};

const DEFAULT_FILTER_OPTIONS = {
  grades: [],
  districts: [],
  selected_grade_id: null,
  selected_grade_name: null,
  selected_district: "all",
  time_range: null,
  date_from: null,
  date_to: null,
};

const STATIC_TIME_RANGES = [
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

const toOptionLabel = (value) =>
  String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toLocaleString();
};

const formatPercentage = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(1)}%`;
};

const truncateAxisLabel = (value, maxLength = 18) => {
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

const buildTimeRangeOptions = (selected) => {
  const values = Array.from(
    new Set([...STATIC_TIME_RANGES, ...(selected ? [String(selected)] : [])]),
  );

  return values.map((value) => ({
    value,
    label: toOptionLabel(value),
  }));
};

const CitySchoolAnalyticsOverview = () => {
  const [records, setRecords] = React.useState([]);
  const [cards, setCards] = React.useState(DEFAULT_CARDS);
  const [charts, setCharts] = React.useState(DEFAULT_CHARTS);
  const [filterOptions, setFilterOptions] = React.useState(
    DEFAULT_FILTER_OPTIONS,
  );
  const [filters, setFilters] = React.useState({
    grade_id: null,
    district: "all",
    time_range: null,
    date_from: null,
    date_to: null,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
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
        if (filters.district) {
          params.district = filters.district;
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

        const response = await citySchoolAnalyticsOverview(params);
        if (!isMounted) {
          return;
        }

        const container = response?.data ?? {};
        const responseFilters = container?.filters ?? {};
        const responseCards = container?.cards ?? {};
        const responseCharts = container?.charts ?? {};
        const responseCities = container?.cities ?? {};

        setFilterOptions({
          grades: asArray(responseFilters?.grades),
          districts: asArray(responseFilters?.districts),
          selected_grade_id: responseFilters?.selected_grade_id ?? null,
          selected_grade_name: responseFilters?.selected_grade_name ?? null,
          selected_district: responseFilters?.selected_district ?? "all",
          time_range: responseFilters?.time_range ?? null,
          date_from: responseFilters?.date_from ?? null,
          date_to: responseFilters?.date_to ?? null,
        });

        if (!hasHydratedRef.current) {
          hasHydratedRef.current = true;
          const hydratedFilters = {
            grade_id:
              responseFilters?.selected_grade_id !== null &&
              responseFilters?.selected_grade_id !== undefined
                ? String(responseFilters.selected_grade_id)
                : null,
            district: responseFilters?.selected_district ?? "all",
            time_range: responseFilters?.time_range ?? null,
            date_from: responseFilters?.date_from ?? null,
            date_to: responseFilters?.date_to ?? null,
          };
          setFilters((prev) => {
            if (
              prev.grade_id === hydratedFilters.grade_id &&
              prev.district === hydratedFilters.district &&
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
          cities: toNumber(responseCards?.cities, 0),
          schools: toNumber(responseCards?.schools, 0),
          best_city: {
            name: responseCards?.best_city?.name ?? "",
            avg_score: toNumber(responseCards?.best_city?.avg_score, 0),
          },
          most_active: {
            name: responseCards?.most_active?.name ?? "",
            total_hours: toNumber(responseCards?.most_active?.total_hours, 0),
          },
        });

        setCharts({
          avg_score_by_city: asArray(responseCharts?.avg_score_by_city).map(
            (row) => ({
              city: row?.city ?? "Unknown",
              avg_score: toNumber(row?.avg_score, 0),
            }),
          ),
          male_vs_female_score_by_city: asArray(
            responseCharts?.male_vs_female_score_by_city,
          ).map((row) => ({
            city: row?.city ?? "Unknown",
            male_score: toNumber(row?.male_score, 0),
            female_score: toNumber(row?.female_score, 0),
          })),
          active_students_by_day: asArray(
            responseCharts?.active_students_by_day,
          ).map((row) => ({
            date: row?.date ?? "-",
            active_students: toNumber(row?.active_students, 0),
          })),
          active_students_by_hour: asArray(
            responseCharts?.active_students_by_hour,
          ).map((row) => ({
            hour: row?.hour ?? "-",
            active_students: toNumber(row?.active_students, 0),
          })),
        });

        setRecords(
          asArray(responseCities?.rows).map((row) => ({
            city: row?.city ?? "Unknown",
            students: toNumber(row?.students, 0),
            schools: toNumber(row?.schools, 0),
            avg_score: toNumber(row?.avg_score, 0),
            male_score: toNumber(row?.male_score, 0),
            female_score: toNumber(row?.female_score, 0),
            total_hours: toNumber(row?.total_hours, 0),
            problems: toNumber(row?.problems, 0),
          })),
        );
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err?.message ||
          "Failed to load city-school analytics. Please try again.";
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
        row?.city,
        row?.students,
        row?.schools,
        row?.avg_score,
        row?.problems,
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
    () => buildTimeRangeOptions(filterOptions.time_range),
    [filterOptions.time_range],
  );

  const gradeOptions = React.useMemo(
    () =>
      asArray(filterOptions.grades).map((grade) => ({
        ...grade,
        label: `Grade ${grade?.name ?? ""}`.trim(),
      })),
    [filterOptions.grades],
  );

  const districtOptions = React.useMemo(() => {
    const options = asArray(filterOptions.districts);
    if (options.length > 0) {
      return options;
    }
    return [{ id: "all", name: "All" }];
  }, [filterOptions.districts]);

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>City / School Analytics</h1>
          <p className="text-slate-600 text-md">
            Analyze city-level performance, school presence, and gender-based
            score trends.
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

        <section className="metrics-grid mt-5 mb-6">
          <DemographicCard
            icon={<MapPinned size={24} />}
            title="Cities"
            classname="demoGreen"
            count={formatNumber(cards.cities)}
            subheading="Cities represented"
          />
          <DemographicCard
            icon={<Building2 size={24} />}
            title="Schools"
            classname="demoSky"
            count={formatNumber(cards.schools)}
            subheading="Schools across selected filters"
          />
          <DemographicCard
            icon={<Trophy size={24} />}
            title="Best City"
            classname="demoOrange"
            count={formatPercentage(cards.best_city.avg_score)}
            subheading={cards.best_city.name || "N/A"}
          />
          <DemographicCard
            icon={<Clock3 size={24} />}
            title={cards.most_active.name || "N/A"}
            classname="demoPurple"
            count={formatHoursLabel(cards.most_active.total_hours)}
            subheading="Most active city"
          />
        </section>

        <div className="dashboard-body-card mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Filters
              </h3>
              <p className="text-xs text-slate-500">
                Refine by grade, district, and date range.
              </p>
            </div>
            <button
              type="button"
              className="global-btn secondary"
              onClick={() => {
                setFilters({
                  grade_id: null,
                  district: "all",
                  time_range: null,
                  date_from: null,
                  date_to: null,
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
                options={gradeOptions}
                value={filters.grade_id ?? ""}
                multiple={false}
                onChange={(value) => updateFilter("grade_id", value)}
                placeholder="Search grade"
                valueKey="id"
                labelKey="label"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                District
              </label>
              <SearchableMultiSelect
                options={districtOptions}
                value={filters.district ?? "all"}
                multiple={false}
                onChange={(value) => updateFilter("district", value || "all")}
                placeholder="Search district"
                valueKey="id"
                labelKey="name"
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

        <div className="dashboard-body-card mb-6">
          <div className="analytics-detail-chart-grid">
            <article className="analytics-detail-chart-card">
              <header className="analytics-detail-chart-header">
                <h2 className="analytics-detail-chart-title">
                  <BarChart3 size={18} /> Avg Score By City
                </h2>
                <p className="analytics-detail-chart-subtitle">
                  City-level average score comparison
                </p>
              </header>

              {charts.avg_score_by_city.length === 0 ? (
                <div className="analytics-empty-state">
                  No average score chart data available.
                </div>
              ) : (
                <div className="analytics-chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart
                      layout="vertical"
                      data={charts.avg_score_by_city}
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
                        dataKey="city"
                        width={140}
                        interval={0}
                        tickFormatter={(value) => truncateAxisLabel(value, 16)}
                        tickLine={false}
                        axisLine={false}
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
                        {charts.avg_score_by_city.map((row, index) => (
                          <Cell
                            key={`city-avg-${row.city}-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
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
                  <BarChart3 size={18} /> Male vs Female Score By City
                </h2>
                <p className="analytics-detail-chart-subtitle">
                  Gender-based average score comparison per city
                </p>
              </header>

              {charts.male_vs_female_score_by_city.length === 0 ? (
                <div className="analytics-empty-state">
                  No male/female score data available.
                </div>
              ) : (
                <div className="analytics-chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart
                      data={charts.male_vs_female_score_by_city}
                      margin={{ top: 8, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="city"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={20}
                        height={42}
                        tickFormatter={(value) => truncateAxisLabel(value)}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatPercentage(value),
                          name,
                        ]}
                      />
                      <Legend />
                      <Bar
                        dataKey="male_score"
                        name="Male Score"
                        fill={CHART_COLORS[0]}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="female_score"
                        name="Female Score"
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
                          id="cityActiveStudentsByDayGradient"
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
                        stroke={CHART_COLORS[1]}
                        fill="url(#cityActiveStudentsByDayGradient)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: CHART_COLORS[1] }}
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

        <div className="dashboard-body-card">
          <ListToolbar
            searchPlaceholder="Search cities..."
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
                <TableHead>City</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Schools</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Male Score</TableHead>
                <TableHead>Female Score</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Problems</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" />
                      <span>Loading data, please wait...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6">
                    {hasSearchQuery
                      ? "No cities match your search."
                      : "No city analytics available."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row, index) => (
                  <TableRow key={`${row.city}-${index}`}>
                    <TableCell className="font-medium text-slate-300">
                      {from + index}
                    </TableCell>
                    <TableCell>
                      <span className="overview-title__name">{row.city}</span>
                    </TableCell>
                    <TableCell className="overview-strong">
                      {formatNumber(row.students)}
                    </TableCell>
                    <TableCell>{formatNumber(row.schools)}</TableCell>
                    <TableCell>
                      {renderProgressCell(row.avg_score, "tone-avg")}
                    </TableCell>
                    <TableCell>
                      {renderProgressCell(row.male_score, "tone-practice")}
                    </TableCell>
                    <TableCell>
                      {renderProgressCell(row.female_score, "tone-challenge")}
                    </TableCell>
                    <TableCell>{formatHoursLabel(row.total_hours)}</TableCell>
                    <TableCell>{formatNumber(row.problems)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default CitySchoolAnalyticsOverview;
