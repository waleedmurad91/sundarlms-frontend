import React from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Loader2,
  ClipboardList,
  CheckCircle2,
  Hourglass,
  Archive,
} from "lucide-react";
import DemographicCard from "@/components/DemographicCard";
import { getStatistics } from "@/api/questionStatuses";
import toast from "react-hot-toast";

const DEFAULT_STATS = {
  total_questions: 0,
  draft_questions: 0,
  pending_review: 0,
  approved_questions: 0,
};

const DataEntryDashboard = ({ roleLabel = "Data Entry" }) => {
  const [stats, setStats] = React.useState(DEFAULT_STATS);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await getStatistics();
        if (!isMounted) return;
        const data = response?.data ?? response ?? {};
        setStats({
          total_questions: Number(data.total_questions) || 0,
          draft_questions: Number(data.draft_questions) || 0,
          pending_review: Number(data.pending_review) || 0,
          approved_questions: Number(data.approved_questions) || 0,
        });
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message ||
          "Unable to load question statistics. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{roleLabel} Dashboard</h4>
          <h1>Question Status Overview</h1>
          <p className="text-slate-600 text-md">Track question statuses at a glance.</p>
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

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        ) : (
          <section className="metrics-grid metrics-grid4">
            <DemographicCard
              icon={<ClipboardList size={22} />}
              title="Total Questions"
              classname="demoIndigo"
              count={stats.total_questions}
              subheading="All questions you created"
            />
            <DemographicCard
              icon={<Archive size={22} />}
              title="Drafts"
              classname="demoPurple"
              count={stats.draft_questions}
              subheading="Saved but not submitted"
            />
            <DemographicCard
              icon={<Hourglass size={22} />}
              title="Pending Review"
              classname="demoRed"
              count={stats.pending_review}
              subheading="Awaiting reviewer approval"
            />
            <DemographicCard
              icon={<CheckCircle2 size={22} />}
              title="Approved"
              classname="demoGreen"
              count={stats.approved_questions}
              subheading="Accepted by reviewers"
            />
          </section>
        )}
      </div>
    </>
  );
};

export default DataEntryDashboard;
