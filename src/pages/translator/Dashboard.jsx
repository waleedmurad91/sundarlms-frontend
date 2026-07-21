import React from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Loader2,
  ClipboardList,
  CheckCircle2,
  Hourglass,
  Archive,
  XCircle,
} from "lucide-react";
import DemographicCard from "@/components/DemographicCard";
import { getStatistics } from "@/api/questionStatuses";
import toast from "react-hot-toast";

const DEFAULT_LANG_STATS = {
  total_questions: 0,
  pending_translation: 0,
  pending_review: 0,
  approved: 0,
  rejected: 0,
};

const DEFAULT_STATS = {
  urdu: { ...DEFAULT_LANG_STATS },
  sindhi: { ...DEFAULT_LANG_STATS },
};

const TranslatorDashboard = ({ roleLabel = "Translator" }) => {
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
        const byLang = data.by_language ?? {};

        const normalizeLang = (lang) => ({
          total_questions: Number(lang?.total_questions) || 0,
          pending_translation: Number(lang?.pending_translation) || 0,
          pending_review: Number(lang?.pending_review) || 0,
          approved: Number(lang?.approved) || 0,
          rejected: Number(lang?.rejected) || 0,
        });

        setStats({
          urdu: normalizeLang(byLang.urdu),
          sindhi: normalizeLang(byLang.sindhi),
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

  const renderLangSection = (langLabel, langStats) => (
    <section className="metrics-grid metrics-grid5 mb-6">
      <DemographicCard
        icon={<ClipboardList size={22} />}
        title={`Total ${langLabel} Questions`}
        classname="demoIndigo"
        count={langStats.total_questions}
        subheading={`All ${langLabel} questions`}
      />
      <DemographicCard
        icon={<Archive size={22} />}
        title={`Pending ${langLabel} Translation`}
        classname="demoPurple"
        count={langStats.pending_translation}
        subheading="Not yet translated"
      />
      <DemographicCard
        icon={<Hourglass size={22} />}
        title={`Pending ${langLabel} Review`}
        classname="demoRed"
        count={langStats.pending_review}
        subheading="Awaiting reviewer approval"
      />
      <DemographicCard
        icon={<XCircle size={22} />}
        title={`Rejected ${langLabel} Translation`}
        classname="demoOrange"
        count={langStats.rejected}
        subheading="Sent back by reviewer"
      />
      <DemographicCard
        icon={<CheckCircle2 size={22} />}
        title={`Approved ${langLabel} Translation`}
        classname="demoGreen"
        count={langStats.approved}
        subheading="Accepted by reviewers"
      />
    </section>
  );

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{roleLabel} Dashboard</h4>
          <h1>Question Status Overview</h1>
          <p className="text-slate-600 text-md">
            Track question statuses at a glance.
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
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-3">Urdu</h3>
            {renderLangSection("Urdu", stats.urdu)}

            <h3 className="text-lg font-semibold mb-3">Sindhi</h3>
            {renderLangSection("Sindhi", stats.sindhi)}
          </>
        )}
      </div>
    </>
  );
};

export default TranslatorDashboard;
