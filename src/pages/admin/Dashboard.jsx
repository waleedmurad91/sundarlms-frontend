import React from "react";
import toast from "react-hot-toast";
import {
  GraduationCap,
  HelpCircle,
  Layers,
  Library,
  School,
  CircleUser,
  SquareStack,
  UsersRound,
} from "lucide-react";
import { getDashboardStats, getSchoolDashboardStats } from "@/api/dashboardApi";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import DemographicCard from "@/components/DemographicCard";
import {
  getAdminActivityData,
  getSchoolActivityData,
} from "@/api/adminActivityApi";
import { format } from "date-fns";
import { useAuthStore } from "@/store/auth";

const DEFAULT_STATS = {
  schools: 0,
  teachers: 0,
  students: 0,
  classes: 0,
  subjects: 0,
  units: 0,
  questions: 0,
  active_users_yesterday: 0,
  new_student_accounts_yesterday: 0,
  new_school_accounts_yesterday: 0,
};

const normaliseStats = (payload) => {
  if (!payload) {
    return { ...DEFAULT_STATS };
  }

  const data = payload?.data ?? payload;
  if (!data || Array.isArray(data)) {
    return { ...DEFAULT_STATS };
  }

  return {
    schools: Number(data?.schools) || 0,
    teachers: Number(data?.teachers) || 0,
    students: Number(data?.students) || 0,
    classes: Number(data?.classes) || 0,
    subjects: Number(data?.subjects) || 0,
    units: Number(data?.units) || 0,
    questions: Number(data?.questions) || 0,
    active_users_yesterday: Number(data?.active_users_yesterday) || 0,
    new_student_accounts_yesterday:
      Number(data?.new_student_accounts_yesterday) || 0,
    new_school_accounts_yesterday:
      Number(data?.new_school_accounts_yesterday) || 0,
  };
};

const formatNumber = (value) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  );

const normalizeRole = (role) =>
  typeof role === "string" ? role.toLowerCase() : null;

const Dashboard = ({ roleLabel = "Admin" }) => {
  const { role: storeRole, user } = useAuthStore();
  const resolvedRole = normalizeRole(storeRole ?? user?.role ?? "admin");
  const isSchoolRole = resolvedRole === "school";
  const schoolId =
    user?.school_id ??
    user?.schoolId ??
    user?.school?._id ??
    user?.school?.id ??
    user?.id ??
    user?._id ??
    null;
  const [stats, setStats] = React.useState(DEFAULT_STATS);
  const [activity, setActivity] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const dashboardTitle = `${roleLabel} Dashboard`;

  const metricCards = React.useMemo(() => {
    if (isSchoolRole) {
      return [
        {
          key: "teachers",
          icon: <UsersRound size={24} />,
          title: "Teachers",
          classname: "demoPurple",
          count: formatNumber(stats.teachers),
          subheading: "Faculty",
        },
        {
          key: "students",
          icon: <GraduationCap size={24} />,
          title: "Students",
          classname: "demoGreen",
          count: formatNumber(stats.students),
          subheading: "Enrolled",
        },
        // {
        //   key: "classes",
        //   icon: <Layers size={24} />,
        //   title: "Classes",
        //   classname: "demoRed",
        //   count: formatNumber(stats.classes),
        //   subheading: "Learning Environments",
        // },
      ];
    }

    return [
      {
        key: "schools",
        icon: <School size={24} />,
        title: "Schools",
        classname: "demoIndigo",
        count: formatNumber(stats.schools),
        subheading: "Partner Instituions",
      },
      {
        key: "teachers",
        icon: <UsersRound size={24} />,
        title: "Teachers",
        classname: "demoPurple",
        count: formatNumber(stats.teachers),
        subheading: "Expert Educators",
      },
      {
        key: "students",
        icon: <GraduationCap size={24} />,
        title: "Students",
        classname: "demoGreen",
        count: formatNumber(stats.students),
        subheading: "Future Innovators",
      },
      {
        key: "classes",
        icon: <Layers size={24} />,
        title: "Classes",
        classname: "demoRed",
        count: formatNumber(stats.classes),
        subheading: "Learning Environments",
      },
      {
        key: "subjects",
        icon: <Library size={24} />,
        title: "Subjects",
        classname: "demoSky",
        count: formatNumber(stats.subjects),
        subheading: "Total Subjects",
      },
      {
        key: "units",
        icon: <SquareStack size={24} />,
        title: "Units",
        classname: "demoBlue",
        count: formatNumber(stats.units),
        subheading: "Total Chapters",
      },
      {
        key: "questions",
        icon: <HelpCircle size={24} />,
        title: "Questions",
        classname: "demoOrange",
        count: formatNumber(stats.questions),
        subheading: "Total Problems",
      },
      {
        key: "active-users-yesterday",
        icon: <CircleUser size={24} />,
        title: "Active Users",
        classname: "demoPurple",
        count: formatNumber(stats.active_users_yesterday),
        subheading: "Total Active Users (yesterday)",
      },
      {
        key: "new-student-accounts-yesterday",
        icon: <GraduationCap size={24} />,
        title: "New Students",
        classname: "demoGreen",
        count: formatNumber(stats.new_student_accounts_yesterday),
        subheading: "Total New Student Accounts (yesterday)",
      },
      {
        key: "new-school-accounts-yesterday",
        icon: <School size={24} />,
        title: "New Schools",
        classname: "demoIndigo",
        count: formatNumber(stats.new_school_accounts_yesterday),
        subheading: "Total School Accounts (yesterday)",
      },
    ];
  }, [isSchoolRole, stats]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        if (isSchoolRole && !schoolId) {
          setStats(DEFAULT_STATS);
          setActivity([]);
          setError(
            "School identifier is missing. Please re-login or contact support.",
          );
          return;
        }

        const response = isSchoolRole
          ? await getSchoolDashboardStats(schoolId)
          : await getDashboardStats();
        const activities = isSchoolRole
          ? await getSchoolActivityData(schoolId)
          : await getAdminActivityData();
        setStats(normaliseStats(response));
        setActivity(activities?.data || []);
      } catch (err) {
        setError(err?.message || "Failed to fetch stats. Please try again.");
        toast.error(err?.message || "Failed to fetch stats. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSchoolRole, schoolId]);

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{dashboardTitle}</h4>
          <h1>Dashboard</h1>
        </div>
      </div>

      <div className="dashboard-body">
        {error && (
          <Alert variant="destructive" className="alert-custom">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
        <section className="metrics-grid">
          {metricCards.map((card) => (
            <DemographicCard
              key={card.key}
              icon={card.icon}
              title={card.title}
              classname={card.classname}
              count={card.count}
              subheading={card.subheading}
            />
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card activity-card">
            <header className="dashboard-card-header">
              <div>
                <h2 className="!text-black">Recent Activity</h2>
                <p>Latest updates from schools and instructors</p>
              </div>
            </header>
            <ul className="activity-list">
              {activity.length === 0 ? (
                <p className="text-center py-6">No recent activity.</p>
              ) : (
                activity.map((item, index) => (
                  <li key={index}>
                    <div className="activity-dot" />
                    <div>
                      <h3>{item.description}</h3>
                      <span>
                        {item?.created_at
                          ? format(
                              new Date(item.created_at),
                              "MMM dd, yyyy - hh:mm a",
                            )
                          : "-"}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </article>
        </section>
      </div>
    </>
  );
};

export default Dashboard;
