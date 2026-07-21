// import React from "react";
// import { Alert, AlertTitle } from "@/components/ui/alert";
// import {
//   AlertCircleIcon,
//   Loader2,
//   ClipboardList,
//   CheckCircle2,
//   XCircle,
//   Hourglass,
//   FileText,
//   Languages,
// } from "lucide-react";
// import DemographicCard from "@/components/DemographicCard";
// import { getStatistics } from "@/api/questionStatuses";
// import toast from "react-hot-toast";

// const DEFAULT_STATS = {
//   total_questions: 0,
//   total_reviews: 0,
//   question_reviews: 0,
//   translation_reviews: 0,
//   approved_questions: 0,
//   rejected_questions: 0,
//   approved_translations: 0,
//   rejected_translations: 0,
//   pending_review: 0,
//   pending_question_reviews: 0,
//   pending_translation_reviews: 0,
// };

// const ReviewerDashboard = ({ roleLabel = "Reviewer" }) => {
//   const [stats, setStats] = React.useState(DEFAULT_STATS);
//   const [loading, setLoading] = React.useState(false);
//   const [error, setError] = React.useState("");

//   React.useEffect(() => {
//     let isMounted = true;
//     const fetchStats = async () => {
//       try {
//         setLoading(true);
//         const response = await getStatistics();
//         if (!isMounted) return;
//         const data = response?.data ?? response ?? {};
//         setStats({
//           total_questions: Number(data.total_questions) || 0,
//           total_reviews: Number(data.total_reviews) || 0,
//           question_reviews: Number(data.question_reviews) || 0,
//           translation_reviews: Number(data.translation_reviews) || 0,
//           approved_questions: Number(data.approved_questions) || 0,
//           rejected_questions: Number(data.rejected_questions) || 0,
//           approved_translations: Number(data.approved_translations) || 0,
//           rejected_translations: Number(data.rejected_translations) || 0,
//           pending_review: Number(data.pending_review) || 0,
//           pending_question_reviews: Number(stats?.data?.overall?.question_statuses?.pending_question_reviews ?? 0) || 0,
//           pending_translation_reviews:
//             Number(data.pending_translation_reviews) || 0,
//         });
//       } catch (err) {
//         if (!isMounted) return;
//         const message =
//           err?.message || "Unable to load review statistics. Please try again.";
//         setError(message);
//         toast.error(message);
//       } finally {
//         if (isMounted) setLoading(false);
//       }
//     };
//     fetchStats();
//     return () => {
//       isMounted = false;
//     };
//   }, []);

//   return (
//     <>
//       <div className="dashboard-header">
//         <div className="dh-left">
//           <h4>{roleLabel} Dashboard</h4>
//           <h1>Review Status Overview</h1>
//           <p className="text-slate-600 text-md">
//             Track question and translation review activity at a glance.
//           </p>
//         </div>
//       </div>
//       <div className="dashboard-body">
//         {error && (
//           <Alert
//             variant="destructive"
//             className="alert-custom mb-4 bg-[#FDF7EC]"
//           >
//             <AlertCircleIcon size={18} />
//             <AlertTitle>{error}</AlertTitle>
//           </Alert>
//         )}
//         {loading ? (
//           <div className="flex h-32 items-center justify-center">
//             <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
//           </div>
//         ) : (
//           <>
//             <h3 className="text-lg font-semibold mb-3">Question Statuses</h3>
//             <section className="metrics-grid metrics-grid3 mb-6">
//               <DemographicCard
//                 icon={<ClipboardList size={22} />}
//                 title="Pending Questions"
//                 classname="demoIndigo"
//                 count={stats?.data?.overall?.question_statuses?.pending_question_reviews ?? 0}
//                 subheading="Questions assigned for review"
//               />
//               <DemographicCard
//                 icon={<FileText size={22} />}
//                 title="Approved Questions"
//                 classname="demoBlue"
//                 count={stats.total_reviews}
//                 subheading="All reviews (questions + translations)"
//               />
//               <DemographicCard
//                 icon={<Hourglass size={22} />}
//                 title="Rejected Questions"
//                 classname="demoRed"
//                 count={stats.pending_review}
//                 subheading="All items awaiting review"
//               />
//             </section>

//             <h3 className="text-lg font-semibold mb-3">Translation Statuses</h3>
//             <section className="metrics-grid metrics-grid4 mb-6">
//               <DemographicCard
//                 icon={<FileText size={22} />}
//                 title="Pending Translations"
//                 classname="demoBlue"
//                 count={stats.question_reviews}
//                 subheading="Total question reviews done"
//               />
//               <DemographicCard
//                 icon={<Hourglass size={22} />}
//                 title="Pending Trasnlation Reviews"
//                 classname="demoRed"
//                 count={stats.pending_question_reviews}
//                 subheading="Questions awaiting your review"
//               />
//               <DemographicCard
//                 icon={<CheckCircle2 size={22} />}
//                 title="Approved Translations"
//                 classname="demoGreen"
//                 count={stats.approved_questions}
//                 subheading="Questions you approved"
//               />
//               <DemographicCard
//                 icon={<XCircle size={22} />}
//                 title="Rejected Translations"
//                 classname="demoOrange"
//                 count={stats.rejected_questions}
//                 subheading="Questions you rejected"
//               />
//             </section>

//             <h3 className="text-lg font-semibold mb-3 text-gray-500">Urdu</h3>
//             <section className="metrics-grid metrics-grid4 mb-6">
//               <DemographicCard
//                 icon={<FileText size={22} />}
//                 title="Pending Urdu Translations"
//                 classname="demoBlue"
//                 count={stats.question_reviews}
//                 subheading="Total question reviews done"
//               />
//               <DemographicCard
//                 icon={<Hourglass size={22} />}
//                 title="Pending Urdu Reviews"
//                 classname="demoRed"
//                 count={stats.pending_question_reviews}
//                 subheading="Questions awaiting your review"
//               />
//               <DemographicCard
//                 icon={<CheckCircle2 size={22} />}
//                 title="Approved Urdu Translations"
//                 classname="demoGreen"
//                 count={stats.approved_questions}
//                 subheading="Questions you approved"
//               />
//               <DemographicCard
//                 icon={<XCircle size={22} />}
//                 title="Rejected Urdu Translations"
//                 classname="demoOrange"
//                 count={stats.rejected_questions}
//                 subheading="Questions you rejected"
//               />
//             </section>

//             <h3 className="text-lg font-semibold mb-3 text-gray-500">Sindhi</h3>
//             <section className="metrics-grid metrics-grid4 mb-6">
//               <DemographicCard
//                 icon={<Languages size={22} />}
//                 title="Pending Sindhi Translation"
//                 classname="demoBlue"
//                 count={stats.translation_reviews}
//                 subheading="Total translation reviews done"
//               />
//               <DemographicCard
//                 icon={<Hourglass size={22} />}
//                 title="Pending Sindhi Reviews"
//                 classname="demoRed"
//                 count={stats.pending_translation_reviews}
//                 subheading="Translations awaiting your review"
//               />
//               <DemographicCard
//                 icon={<CheckCircle2 size={22} />}
//                 title="Approved Sindhi Translations"
//                 classname="demoGreen"
//                 count={stats.approved_translations}
//                 subheading="Translations you approved"
//               />
//               <DemographicCard
//                 icon={<XCircle size={22} />}
//                 title="Rejected Sindhi Translations"
//                 classname="demoOrange"
//                 count={stats.rejected_translations}
//                 subheading="Rejected Sindhi Translations"
//               />
//             </section>
//           </>
//         )}
//       </div>
//     </>
//   );
// };

// export default ReviewerDashboard;






import React from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Loader2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Hourglass,
  FileText,
  Languages,
} from "lucide-react";
import DemographicCard from "@/components/DemographicCard";
import { getStatistics } from "@/api/questionStatuses";
import toast from "react-hot-toast";

const DEFAULT_STATS = {
  question: {
    pending: 0,
    approved: 0,
    rejected: 0,
  },
  translation: {
    pendingTranslations: 0,
    pendingReviews: 0,
    approved: 0,
    rejected: 0,
  },
  urdu: {
    pendingTranslation: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
  },
  sindhi: {
    pendingTranslation: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
  },
};

const ReviewerDashboard = ({ roleLabel = "Reviewer" }) => {
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
        const overall = data.overall || {};
        const questionStatuses = overall.question_statuses || {};
        const translationStatuses = overall.translation_statuses || {};
        const urdu = data.urdu || {};
        const sindhi = data.sindhi || {};

        setStats({
          question: {
            pending: Number(questionStatuses.pending_question_reviews) || 0,
            approved: Number(questionStatuses.approved_questions) || 0,
            rejected: Number(questionStatuses.rejected_questions) || 0,
          },
          translation: {
            pendingTranslations:
              Number(translationStatuses.pending_translations) || 0,
            pendingReviews:
              Number(translationStatuses.pending_translation_reviews) || 0,
            approved: Number(translationStatuses.approved_translations) || 0,
            rejected: Number(translationStatuses.rejected_translations) || 0,
          },
          urdu: {
            pendingTranslation: Number(urdu.pending_urdu_translation) || 0,
            pendingReview: Number(urdu.pending_urdu_review) || 0,
            approved: Number(urdu.approved_urdu_translation) || 0,
            rejected: Number(urdu.rejected_urdu_translation) || 0,
          },
          sindhi: {
            pendingTranslation: Number(sindhi.pending_sindhi_translation) || 0,
            pendingReview: Number(sindhi.pending_sindhi_review) || 0,
            approved: Number(sindhi.approved_sindhi_translation) || 0,
            rejected: Number(sindhi.rejected_sindhi_translation) || 0,
          },
        });
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message || "Unable to load review statistics. Please try again.";
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
          <h1>Review Status Overview</h1>
          <p className="text-slate-600 text-md">
            Track question and translation review activity at a glance.
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
            <h3 className="text-lg font-semibold mb-3">Question Statuses</h3>
            <section className="metrics-grid metrics-grid3 mb-6">
              <DemographicCard
                icon={<ClipboardList size={22} />}
                title="Pending Questions"
                classname="demoRed"
                count={stats.question.pending}
                subheading="Questions assigned for review"
              />
              <DemographicCard
                icon={<CheckCircle2 size={22} />}
                title="Approved Questions"
                classname="demoGreen"
                count={stats.question.approved}
                subheading="Questions you approved"
              />
              <DemographicCard
                icon={<XCircle size={22} />}
                title="Rejected Questions"
                classname="demoOrange"
                count={stats.question.rejected}
                subheading="Questions you rejected"
              />
            </section>

            <h3 className="text-lg font-semibold mb-3">Translation Statuses</h3>
            <section className="metrics-grid metrics-grid4 mb-6">
              <DemographicCard
                icon={<FileText size={22} />}
                title="Pending Translations"
                classname="demoBlue"
                count={stats.translation.pendingTranslations}
                subheading="Translations awaiting submission"
              />
              <DemographicCard
                icon={<Hourglass size={22} />}
                title="Pending Translation Reviews"
                classname="demoRed"
                count={stats.translation.pendingReviews}
                subheading="Translations awaiting your review"
              />
              <DemographicCard
                icon={<CheckCircle2 size={22} />}
                title="Approved Translations"
                classname="demoGreen"
                count={stats.translation.approved}
                subheading="Translations you approved"
              />
              <DemographicCard
                icon={<XCircle size={22} />}
                title="Rejected Translations"
                classname="demoOrange"
                count={stats.translation.rejected}
                subheading="Translations you rejected"
              />
            </section>

            <h3 className="text-lg font-semibold mb-3 text-gray-500">Urdu</h3>
            <section className="metrics-grid metrics-grid4 mb-6">
              <DemographicCard
                icon={<FileText size={22} />}
                title="Pending Urdu Translations"
                classname="demoBlue"
                count={stats.urdu.pendingTranslation}
                subheading="Urdu translations pending"
              />
              <DemographicCard
                icon={<Hourglass size={22} />}
                title="Pending Urdu Reviews"
                classname="demoRed"
                count={stats.urdu.pendingReview}
                subheading="Urdu translations awaiting review"
              />
              <DemographicCard
                icon={<CheckCircle2 size={22} />}
                title="Approved Urdu Translations"
                classname="demoGreen"
                count={stats.urdu.approved}
                subheading="Urdu translations approved"
              />
              <DemographicCard
                icon={<XCircle size={22} />}
                title="Rejected Urdu Translations"
                classname="demoOrange"
                count={stats.urdu.rejected}
                subheading="Urdu translations rejected"
              />
            </section>

            <h3 className="text-lg font-semibold mb-3 text-gray-500">Sindhi</h3>
            <section className="metrics-grid metrics-grid4 mb-6">
              <DemographicCard
                icon={<Languages size={22} />}
                title="Pending Sindhi Translation"
                classname="demoBlue"
                count={stats.sindhi.pendingTranslation}
                subheading="Sindhi translations pending"
              />
              <DemographicCard
                icon={<Hourglass size={22} />}
                title="Pending Sindhi Reviews"
                classname="demoRed"
                count={stats.sindhi.pendingReview}
                subheading="Sindhi translations awaiting review"
              />
              <DemographicCard
                icon={<CheckCircle2 size={22} />}
                title="Approved Sindhi Translations"
                classname="demoGreen"
                count={stats.sindhi.approved}
                subheading="Sindhi translations approved"
              />
              <DemographicCard
                icon={<XCircle size={22} />}
                title="Rejected Sindhi Translations"
                classname="demoOrange"
                count={stats.sindhi.rejected}
                subheading="Sindhi translations rejected"
              />
            </section>
          </>
        )}
      </div>
    </>
  );
};

export default ReviewerDashboard;
