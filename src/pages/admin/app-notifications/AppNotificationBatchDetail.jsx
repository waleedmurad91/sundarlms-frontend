import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, ArrowLeft, Loader2 } from "lucide-react";
import { getPushNotificationBatchDetails } from "@/api/appNotificationsApi";

const TARGET_TYPE_LABELS = {
  topic: "All Users",
  token: "Device token",
  user: "Application user",
  audience: "Filtered audience",
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM dd, yyyy h:mm a");
  } catch {
    return value;
  }
};

const SummaryStat = ({ label, value, tone = "default" }) => {
  const toneClasses = {
    default: "bg-slate-50 text-slate-700",
    green: "bg-green-50 text-green-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <div className={`rounded-lg px-4 py-3 ${toneClasses[tone]}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
};

const AppNotificationBatchDetail = () => {
  const navigate = useNavigate();
  const { batchId: paramsBatchId } = useParams();
  const { state } = useLocation();

  const batchId = paramsBatchId || state?.batchId;
  const batchSummaryFromState = state?.batch;

  const [summary, setSummary] = React.useState(null);
  const [batchInfo, setBatchInfo] = React.useState(batchSummaryFromState ?? null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!batchId) {
      setError("No notification batch was specified.");
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getPushNotificationBatchDetails(batchId, {
          perPage: 200,
        });
        if (!isMounted) return;

        setSummary(response?.summary ?? null);

        // Fall back to the first row's fields when no batch was passed via
        // router state (e.g. on a direct page load / refresh).
        if (!batchSummaryFromState) {
          const first = Array.isArray(response?.data) ? response.data[0] : null;
          if (first) {
            setBatchInfo({
              title: first.title,
              body: first.body,
              target_type: first.target_type,
              last_sent_at: first.sent_at,
            });
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load notification details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [batchId]);

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Notification Details</h1>
        </div>
        <div className="dh-right">
          <button
            type="button"
            className="global-btn secondary flex items-center justify-center gap-1"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back to list
          </button>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        {error && (
          <Alert variant="destructive" className="alert-custom mb-4">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {batchInfo && (
          <div className="mb-5 space-y-1">
            {batchInfo.title && (
              <h2 className="text-lg font-semibold text-slate-800">
                {batchInfo.title}
              </h2>
            )}
            <p className="text-sm text-slate-500">
              Sent to{" "}
              <span className="font-medium text-slate-700">
                {TARGET_TYPE_LABELS[batchInfo.target_type] ??
                  batchInfo.target_type}
              </span>{" "}
              &middot; {formatDate(batchInfo.last_sent_at)}
            </p>
            {batchInfo.body && (
              <p className="text-sm text-slate-600">{batchInfo.body}</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="animate-spin" />
            <span>Loading data, please wait...</span>
          </div>
        ) : (
          summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <SummaryStat label="Total" value={summary.total ?? 0} />
              <SummaryStat label="Sent" value={summary.sent ?? 0} tone="green" />
              <SummaryStat label="Failed" value={summary.failed ?? 0} tone="rose" />
              <SummaryStat label="Pending" value={summary.pending ?? 0} tone="amber" />
              <SummaryStat label="Received" value={summary.received ?? 0} tone="indigo" />
              <SummaryStat label="Opened" value={summary.opened ?? 0} tone="blue" />
            </div>
          )
        )}
      </div>
    </>
  );
};

export default AppNotificationBatchDetail;