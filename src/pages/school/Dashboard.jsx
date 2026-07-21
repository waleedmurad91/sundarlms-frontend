import React from "react";
import toast from "react-hot-toast";
import {
  AlertCircleIcon,
  BarChart3,
  Clock3,
  Flame,
  Loader2,
  School,
  Target,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSchoolDashboardOverview } from "@/api/schoolApi";
import { Alert, AlertTitle } from "@/components/ui/alert";
import DemographicCard from "@/components/DemographicCard";
import ListToolbar from "@/components/ListToolbar";
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

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
  from: 0,
  to: 0,
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    return `${(hours / hoursPerMonth).toFixed(1)}m`;
  }
  if (hours >= 24) {
    return `${(hours / 24).toFixed(1)}d`;
  }
  if (hours >= 1) {
    return `${hours.toFixed(1)}h`;
  }
  return `${(hours * 60).toFixed(0)}min`;
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
  if (row?.last_active_human) {
    return row.last_active_human;
  }
  return "-";
};

const SchoolDashboard = () => {
  const [payload, setPayload] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [searchTerm, setSearchTerm] = React.useState("");

  const studentsData = payload?.students ?? {};
  const allStudents = asArray(studentsData?.data);

  const filteredStudents = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return allStudents;
    }
    const search = searchTerm.toLowerCase();
    return allStudents.filter(
      (student) =>
        student?.name?.toLowerCase().includes(search) ||
        student?.grade?.toLowerCase().includes(search) ||
        student?.city?.toLowerCase().includes(search),
    );
  }, [allStudents, searchTerm]);

  const pagination = React.useMemo(() => {
    const total = filteredStudents.length;
    const perPage = rowsPerPage;
    const lastPage = Math.ceil(total / perPage) || 1;
    const current = Math.min(currentPage, lastPage);
    const from = total > 0 ? (current - 1) * perPage + 1 : 0;
    const to = Math.min(current * perPage, total);
    return {
      current_page: current,
      last_page: lastPage,
      per_page: perPage,
      total,
      from,
      to,
    };
  }, [filteredStudents.length, rowsPerPage, currentPage]);

  const paginatedStudents = React.useMemo(() => {
    const start = (pagination.current_page - 1) * rowsPerPage;
    return filteredStudents.slice(start, start + rowsPerPage);
  }, [filteredStudents, pagination.current_page, rowsPerPage]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getSchoolDashboardOverview();
        if (isMounted) {
          setPayload(response?.data ?? null);
        }
      } catch (err) {
        const message = err?.message || "Failed to fetch dashboard data.";
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

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (currentPage > pagination.last_page && pagination.last_page > 0) {
      setCurrentPage(1);
    }
  }, [pagination.last_page, currentPage]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  const school = payload?.school ?? {};
  const summary = payload?.summary ?? {};

  const studentsScoreBySubject = React.useMemo(() => {
    const rows = asArray(payload?.charts?.students_score_by_subject);
    return rows.map((item, index) => ({
      subject_key: `${item?.subject_id ?? "subject"}-${index}`,
      subject: item?.subject ?? "Subject",
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
        students: toNumber(item?.students_count, 0),
        practice_attempted: toNumber(item?.practice_attempted, 0),
        challenge_attempted: toNumber(item?.challenge_attempted, 0),
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

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>School Dashboard</h4>
          <h1>School Overview</h1>
          <p className="text-slate-600 text-md">
            Performance trends, subject insights, and gender breakdown for your
            school.
          </p>
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
                    {school?.name?.charAt(0) || "S"}
                  </div>
                  <div className="school-detail">
                    <h1>{school?.name || "Unnamed School"}</h1>
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
                      <BarChart3 size={18} /> Practice vs Challenge
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
                  )}
                </article>
              </div>
            </section>

            <section className="dashboard-body dashboard-body-card mb-6">
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
                    <TableHead>Practice Attempted</TableHead>
                    <TableHead>Challenge Attempted</TableHead>
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
                        <TableCell className="overview-strong">
                          {formatNumber(row.practice_attempted)}
                        </TableCell>
                        <TableCell className="overview-strong">
                          {formatNumber(row.challenge_attempted)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>

            <div className="dashboard-body dashboard-body-card">
              <div className="analytics-section-header">
                <div>
                  <h2>Students</h2>
                  <p>List of all students in your school</p>
                </div>
              </div>
              <ListToolbar
                searchPlaceholder="Search students..."
                searchValue={searchTerm}
                onSearchChange={handleSearchChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                currentPage={pagination.current_page}
                totalPages={pagination.last_page}
                totalItems={pagination.total}
                from={pagination.from}
                to={pagination.to}
                onPageChange={setCurrentPage}
                disabled={loading}
                loading={loading}
              />
              <Table className="global-table analytics-overview-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Grade</TableHead>
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
                      <TableCell colSpan={12} className="text-center py-6">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin" />
                          <span>Loading data, please wait...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-6">
                        {searchTerm
                          ? "No students match your search."
                          : "No students available."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map((row, index) => (
                      <TableRow key={row.id ?? index}>
                        <TableCell className="font-medium text-slate-300">
                          {pagination.from + index}
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
                            className={`overview-chip overview-chip--info ${row?.gender === "male" ? "male-chip" : "female-chip"}`}
                          >
                            {row?.gender ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell className="overview-muted">
                          {row?.grade ?? "-"}
                        </TableCell>
                        <TableCell className="overview-muted">
                          {row?.city ?? "-"}
                        </TableCell>
                        <TableCell>
                          <span className="overview-chip">
                            {row?.subject ?? "-"}
                          </span>
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
        )}

        {!loading && !error && !payload && (
          <p className="text-slate-500">No dashboard data available.</p>
        )}
      </div>
    </>
  );
};

export default SchoolDashboard;
