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
  FileQuestionMark,
  Flame,
  GraduationCap,
  ListOrdered,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { differenceInDays, differenceInHours } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import DemographicCard from "@/components/DemographicCard";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import {
  studentAnalyticsOverview,
  getStudentAnalyticsCounter,
} from "@/api/analyticsApi";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const pickFilterValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && candidate !== "") {
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
  }
  return "";
};

const buildHydratedStudentFilters = (
  responseFilters = {},
  appliedFilters = {},
) => ({
  city: pickFilterValue(
    appliedFilters?.city,
    responseFilters?.selected_city_id,
    responseFilters?.selected_city,
    responseFilters?.city_id,
    responseFilters?.city,
  ),
  school_id: pickFilterValue(
    appliedFilters?.school,
    appliedFilters?.school_id,
    responseFilters?.selected_school_id,
    responseFilters?.school_id,
  ),
  subject_id: pickFilterValue(
    appliedFilters?.subject,
    appliedFilters?.subject_id,
    responseFilters?.selected_subject_id,
    responseFilters?.subject_id,
  ),
  gender: pickFilterValue(
    appliedFilters?.gender,
    responseFilters?.selected_gender,
    responseFilters?.gender,
  ),
  time_range: pickFilterValue(
    appliedFilters?.time_range,
    responseFilters?.selected_time_range,
    responseFilters?.time_range,
  ),
  sort_by: pickFilterValue(
    appliedFilters?.sort_by,
    responseFilters?.selected_sort_by,
    responseFilters?.sort_by,
  ),
  sort_dir:
    pickFilterValue(
      appliedFilters?.sort_dir,
      responseFilters?.selected_sort_dir,
      responseFilters?.sort_dir,
    ) || "desc",
});

const areStudentFiltersEqual = (left, right) =>
  left.city === right.city &&
  left.school_id === right.school_id &&
  left.subject_id === right.subject_id &&
  left.gender === right.gender &&
  left.time_range === right.time_range &&
  left.sort_by === right.sort_by &&
  left.sort_dir === right.sort_dir;

const StudentAnalyticsOverview = () => {
  const navigate = useNavigate();
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const refreshKey = 0;
  const [counter, setCounter] = React.useState({
    total_students: 0,
    avg_score: 0,
    problems_filtered: 0,
  });
  const [filters, setFilters] = React.useState({
    city: "",
    school_id: "",
    subject_id: "",
    gender: "",
    time_range: "",
    sort_by: "",
    sort_dir: "desc",
  });
  const [filterOptions, setFilterOptions] = React.useState({
    cities: [],
    schools: [],
    subjects: [],
    genders: [],
    sort_options: [],
    time_ranges: [],
  });
  const hasHydratedRef = React.useRef(false);

  React.useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          page: currentPage,
          per_page: rowsPerPage,
        };
        const trimmedSearch = debouncedSearch.trim();
        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        if (filters.city) params.city = filters.city;
        if (filters.school_id) params.school_id = filters.school_id;
        if (filters.subject_id) params.subject_id = filters.subject_id;
        if (filters.gender) params.gender = filters.gender;
        if (filters.time_range) params.time_range = filters.time_range;
        if (filters.sort_by) params.sort_by = filters.sort_by;
        if (filters.sort_dir) params.sort_dir = filters.sort_dir;

        const response = await studentAnalyticsOverview(params);
        const counterResponse = await getStudentAnalyticsCounter();
        if (!isMounted) {
          return;
        }

        setCounter(counterResponse?.data ?? {});

        const payload = response ?? {};
        const container = payload?.data ?? payload;
        const responseFilters = container?.filters ?? {};
        const appliedFilters =
          container?.applied_filters ??
          responseFilters?.applied_filters ??
          {};
        const studentContainer = container?.students ?? {};
        const pageData = Array.isArray(studentContainer?.data)
          ? studentContainer.data
          : Array.isArray(studentContainer)
            ? studentContainer
            : [];
        const resolvedCurrent = Number(
          studentContainer?.current_page ?? params.page ?? 1,
        );
        const resolvedPerPage = Number(
          studentContainer?.per_page ?? params.per_page ?? 10,
        );
        const resolvedTotal = Number(
          studentContainer?.total ?? pageData.length,
        );
        const resolvedLast = Number(studentContainer?.last_page ?? 1);
        const resolvedFrom =
          Number(studentContainer?.from) ||
          (pageData.length ? (resolvedCurrent - 1) * resolvedPerPage + 1 : 0);
        const resolvedTo =
          Number(studentContainer?.to) ||
          (pageData.length ? resolvedFrom + pageData.length - 1 : 0);

        setRecords(pageData);
        setPagination({
          current_page: resolvedCurrent,
          last_page: resolvedLast,
          per_page: resolvedPerPage,
          total: resolvedTotal,
          from: resolvedFrom,
          to: resolvedTo,
        });
        setFilterOptions({
          cities: Array.isArray(responseFilters?.cities)
            ? responseFilters.cities
            : [],
          schools: Array.isArray(responseFilters?.schools)
            ? responseFilters.schools
            : [],
          subjects: Array.isArray(responseFilters?.subjects)
            ? responseFilters.subjects
            : [],
          genders: Array.isArray(responseFilters?.genders)
            ? responseFilters.genders
            : [],
          sort_options: Array.isArray(responseFilters?.sort_options)
            ? responseFilters.sort_options
            : [],
          time_ranges: Array.isArray(responseFilters?.time_ranges)
            ? responseFilters.time_ranges
            : [],
        });

        if (!hasHydratedRef.current) {
          hasHydratedRef.current = true;
          const hydratedFilters = buildHydratedStudentFilters(
            responseFilters,
            appliedFilters,
          );

          setFilters((prev) =>
            areStudentFiltersEqual(prev, hydratedFilters)
              ? prev
              : hydratedFilters,
          );
        }

        if (currentPage !== resolvedCurrent) {
          setCurrentPage(resolvedCurrent);
        }

        if (rowsPerPage !== resolvedPerPage) {
          setRowsPerPage(resolvedPerPage);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err?.message || "Failed to load analytics. Please try again.";
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
  }, [currentPage, rowsPerPage, debouncedSearch, refreshKey, filters]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(handle);
  }, [searchTerm]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };
  const updateFilter = (key, value) => {
    setFilters((prev) => {
      if (prev[key] === value) {
        return prev;
      }
      return { ...prev, [key]: value };
    });
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasSearchQuery = Boolean(debouncedSearch.trim());
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;
  const genderOptions = React.useMemo(() => {
    const values = Array.from(
      new Set(
        [
          ...(filterOptions.genders ?? []).map((item) =>
            typeof item === "object"
              ? String(item?.value ?? item?.id ?? item?.key ?? "")
              : String(item ?? ""),
          ),
          filters.gender,
        ].filter(Boolean),
      ),
    );

    return values.map((gender) => ({
      value: String(gender),
      label: String(gender)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    }));
  }, [filterOptions.genders, filters.gender]);

  const timeRangeOptions = React.useMemo(() => {
    const optionMap = new Map();

    (filterOptions.time_ranges ?? []).forEach((item) => {
      if (item && typeof item === "object") {
        const value = String(item?.value ?? item?.id ?? item?.key ?? "");
        if (!value) return;
        optionMap.set(value, {
          value,
          label: String(
            item?.label ?? item?.name ?? value.replace(/_/g, " ").toUpperCase(),
          ),
        });
        return;
      }

      const value = String(item ?? "");
      if (!value) return;
      optionMap.set(value, {
        value,
        label: value.replace(/_/g, " ").toUpperCase(),
      });
    });

    if (filters.time_range && !optionMap.has(String(filters.time_range))) {
      optionMap.set(String(filters.time_range), {
        value: String(filters.time_range),
        label: String(filters.time_range).replace(/_/g, " ").toUpperCase(),
      });
    }

    return Array.from(optionMap.values());
  }, [filterOptions.time_ranges, filters.time_range]);

  const sortOptions = React.useMemo(() => {
    const optionMap = new Map();

    (filterOptions.sort_options ?? []).forEach((item) => {
      if (item && typeof item === "object") {
        const value = String(item?.value ?? item?.id ?? item?.key ?? "");
        if (!value) return;
        optionMap.set(value, {
          value,
          label: String(
            item?.label ??
              item?.name ??
              value
                .replace(/_/g, " ")
                .replace(/\b\w/g, (char) => char.toUpperCase()),
          ),
        });
        return;
      }

      const value = String(item ?? "");
      if (!value) return;
      optionMap.set(value, {
        value,
        label: value
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
      });
    });

    if (filters.sort_by && !optionMap.has(String(filters.sort_by))) {
      optionMap.set(String(filters.sort_by), {
        value: String(filters.sort_by),
        label: String(filters.sort_by)
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
      });
    }

    return Array.from(optionMap.values());
  }, [filterOptions.sort_options, filters.sort_by]);

  const formatPercentage = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "-";
    }
    return `${Number(value).toFixed(1)}%`;
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

  const formatLastActive = (row) => {
    if (row?.last_active_at) {
      const lastActiveDate = new Date(row.last_active_at);
      if (!Number.isNaN(lastActiveDate.getTime())) {
        const hours = Math.max(
          1,
          differenceInHours(new Date(), lastActiveDate),
        );
        if (hours < 24) {
          return `${hours}h ago`;
        }
        const days = Math.max(1, differenceInDays(new Date(), lastActiveDate));
        return `${days}d ago`;
      }
    }
    if (row?.last_active_human) {
      return row.last_active_human;
    }
    return "-";
  };

  const openStudentAnalyticsDetail = (row) => {
    const id = row?.id;
    if (!id) {
      return;
    }

    navigate(`/admin/student-analytics-overview-detail/${id}`, {
      state: {
        studentId: id,
        student: row,
      },
    });
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Student Analytics</h1>
          <p className="text-slate-600 text-md">
            Analytics overview of all registered schools, teachers, and students
            in the platform.
          </p>
        </div>
      </div>

      <section className="metrics-grid metrics-grid3 mt-5 mb-6">
        <DemographicCard
          icon={<GraduationCap size={24} />}
          title="Students"
          classname="demoGreen"
          count={counter.total_students}
          subheading="Future Innovators"
        />
        <DemographicCard
          icon={<ListOrdered size={24} />}
          title="Avg Score"
          classname="demoRed"
          count={counter.avg_score ? formatPercentage(counter.avg_score) : "-"}
          subheading="Average Score"
        />
        <DemographicCard
          icon={<FileQuestionMark size={24} />}
          title="Problems"
          classname="demoOrange"
          count={counter.problems_filtered ?? "-"}
          subheading="Overall Solved Problems"
        />
      </section>

      <div className="dashboard-body dashboard-body-card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Filters</h3>
            <p className="text-xs text-slate-500">
              Refine student analytics by location, school, track, and more.
            </p>
          </div>
          <button
            type="button"
            className="global-btn secondary"
            onClick={() => {
              hasHydratedRef.current = false;
              setFilters({
                city: "",
                school_id: "",
                subject_id: "",
                gender: "",
                time_range: "",
                sort_by: "",
                sort_dir: "desc",
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
            <label className="text-xs font-semibold text-slate-600">City</label>
            <SearchableMultiSelect
              options={filterOptions.cities}
              value={filters.city ?? ""}
              multiple={false}
              onChange={(value) => updateFilter("city", value)}
              placeholder="Search city"
              valueKey="id"
              labelKey="name"
              alwaysVisibleValues={filters.city ? [filters.city] : []}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              School
            </label>
            <SearchableMultiSelect
              options={filterOptions.schools}
              value={filters.school_id ?? ""}
              multiple={false}
              onChange={(value) => updateFilter("school_id", value)}
              placeholder="Search school"
              valueKey="id"
              labelKey="name"
              alwaysVisibleValues={
                filters.school_id ? [filters.school_id] : []
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Subject
            </label>
            <SearchableMultiSelect
              options={filterOptions.subjects}
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
              Gender
            </label>
            <SearchableMultiSelect
              options={genderOptions}
              value={filters.gender ?? ""}
              multiple={false}
              onChange={(value) => updateFilter("gender", value)}
              placeholder="Search gender"
              alwaysVisibleValues={filters.gender ? [filters.gender] : []}
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
              value={filters.sort_dir}
              onChange={(event) => updateFilter("sort_dir", event.target.value)}
              disabled={loading}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>
      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder="Search students..."
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          from={pagination.from}
          to={pagination.to}
          onPageChange={setCurrentPage}
          disabled={loading}
          loading={loading}
        />
        {error && (
          <Alert variant="destructive" className="alert-custom">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
        <Table className="global-table analytics-overview-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>School</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Avg Score</TableHead>
              <TableHead>Practice</TableHead>
              <TableHead>Challenge</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Problems</TableHead>
              <TableHead>Streak</TableHead>
              <TableHead>Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-6">
                  {hasSearchQuery
                    ? "No students match your search."
                    : "No students available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => (
                <TableRow
                  key={row.id ?? index}
                  className={row?.id ? "analytics-overview-row-clickable" : ""}
                  role={row?.id ? "button" : undefined}
                  tabIndex={row?.id ? 0 : undefined}
                  onClick={
                    row?.id ? () => openStudentAnalyticsDetail(row) : undefined
                  }
                  onKeyDown={
                    row?.id
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openStudentAnalyticsDetail(row);
                          }
                        }
                      : undefined
                  }
                >
                  <TableCell className="font-medium text-slate-300">
                    {baseRowNumber + index}
                  </TableCell>
                  <TableCell>
                    <div className="overview-title">
                      <span className="overview-title__name">
                        {row?.name ?? "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`overview-chip overview-chip--info ${row?.gender == "male" ? "male-chip" : "female-chip"}`}
                    >
                      {row?.gender ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell className="overview-muted">
                    {row?.grade ?? "-"}
                  </TableCell>
                  <TableCell className="overview-strong">
                    {row?.school ?? "-"}
                  </TableCell>
                  <TableCell className="overview-muted">
                    {row?.city ?? "-"}
                  </TableCell>
                  <TableCell>
                    <span className="overview-chip">{row?.subject ?? "-"}</span>
                  </TableCell>
                  <TableCell>
                    {renderProgressCell(row?.avg_score, "tone-avg")}
                  </TableCell>
                  <TableCell>
                    {renderProgressCell(row?.practice, "tone-practice")}
                  </TableCell>
                  <TableCell>
                    {renderProgressCell(row?.challenge, "tone-challenge")}
                  </TableCell>
                  <TableCell className="overview-muted">
                    {row?.time_spent_label ?? "-"}
                  </TableCell>
                  <TableCell className="overview-strong">
                    {row?.problems ?? "-"}
                  </TableCell>
                  <TableCell>
                    <div className="overview-streak">
                      <Flame size={14} />
                      <span>{row?.streak ?? "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="overview-last">
                    {formatLastActive(row)}
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

export default StudentAnalyticsOverview;
