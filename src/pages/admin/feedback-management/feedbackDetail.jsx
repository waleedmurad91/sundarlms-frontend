import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { AlertCircleIcon, Calendar } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { getFeedbackSurveyById } from "@/api/feedbackApi";

const formatDate = (value) => {
  if (!value) return "";
  try {
    return format(new Date(value), "MMM dd, yyyy - hh:mm a");
  } catch {
    return String(value);
  }
};

const normalizeFeedback = (payload) => {
  const data = payload?.data ?? payload ?? {};
  if (!data) return null;
  return {
    id: data?.id ?? data?._id ?? null,
    name: data?.student?.name ?? data?.name ?? "",
    overall_user_friendliness: data?.overall_user_friendliness ?? "",
    technical_issue_frequency: data?.technical_issue_frequency ?? "",
    topic_discovery_ease: data?.topic_discovery_ease ?? "",
    diagram_equation_clarity: data?.diagram_equation_clarity ?? "",
    recent_technical_glitch: data?.recent_technical_glitch ?? "",
    most_helpful_feature: data?.most_helpful_feature ?? "",
    requested_new_feature: data?.requested_new_feature ?? "",
    difficulty_level_feedback: data?.difficulty_level_feedback ?? "",
    solution_clarity_feedback: data?.solution_clarity_feedback ?? "",
    practice_motivation: data?.practice_motivation ?? "",
    other_suggestions: data?.other_suggestions ?? "",
    created_at: data?.created_at ?? data?.createdAt ?? data?.timestamp ?? "",
    raw: data,
  };
};

const FeedbackDetail = () => {
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallback = React.useMemo(
    () => normalizeFeedback(state?.feedback),
    [state?.feedback],
  );
  const feedbackId = paramsId || state?.feedbackId || fallback?.id;

  const [feedback, setFeedback] = React.useState(fallback);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (fallback && fallback.id === feedbackId && fallback.raw) {
      return;
    }
    if (!feedbackId) {
      const message =
        "Feedback identifier is missing. Please open this page from the feedback list.";
      setError(message);
      toast.error(message);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getFeedbackSurveyById(feedbackId);
        if (!isMounted) return;
        setFeedback(normalizeFeedback(response));
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message || "Unable to load feedback. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [feedbackId, fallback]);

  if (!feedback && loading) {
    return (
      <div className="dashboard-body dashboard-body-card">
        <div className="flex h-40 items-center justify-center">
          <Calendar className="animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Feedback Detail</h1>
          <p className="text-slate-600 text-md">
            Review the submitted information for this feedback.
          </p>
        </div>
        <div className="dh-right"></div>
      </div>

      <div className="dashboard-body">
        {error && (
          <Alert variant="destructive" className="alert-custom mb-4">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
        <div className="inner-detail-card dashboard-body-card-dtl">
          {feedback && (
            <div className="space-y-6">
              <div className="table-wrapper">
                <table className="analytics-table">
                  <tbody>
                    <tr>
                      <th>Name</th>
                      <td>{feedback.name || "Unnamed Student"}</td>
                    </tr>
                    <tr>
                      <th>User friendly</th>
                      <td>
                        {feedback.overall_user_friendliness || "Not provided"}
                      </td>
                    </tr>
                    <tr>
                      <th>Technical issues</th>
                      <td>
                        {feedback.technical_issue_frequency || "Not provided"}
                      </td>
                    </tr>
                    <tr>
                      <th>Topic Discovery</th>
                      <td>{feedback.topic_discovery_ease || "Not provided"}</td>
                    </tr>
                    <tr>
                      <th>Diagram equation clarity</th>
                      <td>
                        {feedback.diagram_equation_clarity || "Not provided"}
                      </td>
                    </tr>
                    <tr>
                      <th>Technical glitch</th>
                      <td>
                        {feedback.recent_technical_glitch || "Not provided"}
                      </td>
                    </tr>
                    <tr>
                      <th>Helpful feature</th>
                      <td>{feedback.most_helpful_feature || "Not provided"}</td>
                    </tr>
                    <tr>
                      <th>Requested new feature</th>
                      <td>
                        {feedback.requested_new_feature || "Not provided"}
                      </td>
                    </tr>
                    <tr>
                      <th>Difficulty level</th>
                      <td>
                        {feedback.difficulty_level_feedback || "Not provided"}
                      </td>
                    </tr>
                    <tr>
                      <th>Solution clarity</th>
                      <td>
                        {feedback.solution_clarity_feedback || "Not provided"}
                      </td>
                    </tr>
                    <tr>
                      <th>Practice motivation</th>
                      <td>{feedback.practice_motivation || "Not provided"}</td>
                    </tr>
                    <tr>
                      <th>Other suggestions</th>
                      <td>{feedback.other_suggestions || "Not provided"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!feedback && !loading && !error && (
            <p className="text-slate-500">No survey data available.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default FeedbackDetail;
