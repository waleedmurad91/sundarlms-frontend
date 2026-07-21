import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import DemographicCard from "@/components/DemographicCard";
import {
  AlertCircleIcon,
  BookA,
  BookCheck,
  BookOpen,
  CheckCircle,
  Edit,
  HelpCircle,
  Layers,
  Loader2,
  GripVertical,
  Regex,
  School,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { getTopicDetailById } from "@/api/topicApi";
import { swapOrderingQuestionsById } from "@/api/questionApi";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

// ---------- helpers ----------

const parseArrayValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }
  return [];
};

const normalizeMathText = (value = "") => {
  if (!value) return "";
  let text = value;
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\$\$/g, " ");
  text = text.replace(/\\\(|\\\)/g, " ");
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1/$2)");
  text = text.replace(/\\times/g, "x");
  text = text.replace(/\\cdot/g, "*");
  text = text.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
  text = text.replace(/\\left|\\right/g, "");
  text = text.replace(/\\+/g, "\\");
  return text.replace(/\s+/g, " ").trim();
};

const getQuestionId = (question) =>
  question?.id ??
  question?._id ??
  question?.question_id ??
  question?.questionId ??
  question?.question?.id ??
  question?.question?._id ??
  null;

const normalizeTopicDetail = (payload) => {
  const data = payload?.data ?? payload;
  if (!data) return null;

  const classes = Array.isArray(data.classes)
    ? data.classes.map((cls) => ({
      id: cls?.class_id ?? cls?.id,
      school: cls?.school_name ?? "",
      grade: cls?.grade_name ?? "",
    }))
    : [];

  const questions = Array.isArray(data.questions)
    ? data.questions.map((q) => ({
      id: q?.question_id ?? q?.id,
      type: q?.type ?? "question",
      marks: q?.marks ?? 0,
      body: q?.question ?? "",
    }))
    : [];

  const learningMaterials = parseArrayValue(data.learning_materials);

  return {
    id: data?.topic_id ?? data?.id,
    name: data?.topic_name ?? "Untitled Topic",
    description: data?.description ?? "",
    image: data?.image ?? null,
    unit: {
      id: data?.unit?.unit_id ?? data?.unit_id,
      name: data?.unit?.unit_name ?? "",
    },
    subject: {
      id: data?.subject?.subject_id ?? data?.subject_id,
      name: data?.subject?.subject ?? "",
      code: data?.subject?.code ?? "",
    },
    classes,
    questions,
    learningMaterials,
    stats: {
      classes: classes.length,
      questions: questions.length,
      marks: questions.reduce((sum, q) => sum + (q.marks || 0), 0),
    },
  };
};

// ---------- data hook ----------

const useTopicDetail = ({ paramsId, locationTopic, locationTopicId }) => {
  const fallbackTopic = React.useMemo(
    () => normalizeTopicDetail(locationTopic),
    [locationTopic]
  );

  const topicId = React.useMemo(
    () => paramsId || locationTopicId || fallbackTopic?.id,
    [paramsId, locationTopicId, fallbackTopic?.id]
  );

  const [topic, setTopic] = React.useState(fallbackTopic);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;

    if (!topicId) {
      const message =
        "Topic identifier is missing. Please open this page from the topic list.";
      setError(message);
      toast.error(message);
      return undefined;
    }

    const fetchTopic = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getTopicDetailById(topicId);
        if (isMounted) {
          setTopic(normalizeTopicDetail(response));
        }
      } catch (err) {
        const message =
          err?.message ||
          "Unable to load topic details right now. Please try again.";
        if (isMounted) {
          setError(message);
        }
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTopic();

    return () => {
      isMounted = false;
    };
  }, [topicId]);

  return { topic, loading, error };
};

// ---------- presentational pieces ----------

const TopicHeaderCard = ({ topic }) => (
  <div className="inner-detail-card dashboard-body-card-dtl">
    <div className="idc-left">
      <div className="flex gap-4">
        <div className="school-icon bg-indigo-50 text-indigo-700">
          <BookOpen size={32} />
        </div>
        <div className="school-detail">
          <h1 className="flex flex-wrap items-center gap-3">{topic.name}</h1>
          <p className="text-slate-600">
            <Layers size={16} className=" text-[#AD474B]" />
            Unit: {topic.unit?.name || "N/A"}
          </p>
          <p className="text-slate-600">
            <BookA size={16} className=" text-[#AD474B]" />
            Grade: {topic.classes?.[0]?.grade || "N/A"}
          </p>

          <p className="text-slate-600">
            <BookCheck size={16} className=" text-[#AD474B]" />
            Subject: {topic.subject.name || "N/A"}
          </p>

          <p className="text-slate-600">
            <Regex size={16} className=" text-[#AD474B]" />
            Code: {topic.subject.code || "N/A"}
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ClassesList = ({ classes }) => {
  if (!classes || classes.length === 0) {
    return <p className="text-sm text-slate-600">No classes assigned.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {classes.map((cls) => (
        <div
          key={cls.id ?? cls.school}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 shadow-sm"
        >
          <div className="flex gap-3">
            <div className=" ">
              <div className="h-8 w-8 flex items-center justify-center rounded-md bg-blue-100 text-blue-700">
                <School size={18} />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Grade {cls.grade || "N/A"}
              </p>
              <p className="text-xs text-slate-500">
                {cls.school || "Unknown"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const QuestionsList = ({
  questions,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  setDragOverIndex,
  draggingDisabled,
}) => {
  if (!questions || questions.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No questions linked to this topic yet.
      </p>
    );
  }

  const typeLabel = (type) => {
    if (!type) return "Question";
    return type.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className="grid gap-3">
      {questions.map((q, index) => (
        <div
          key={getQuestionId(q) ?? q.body}
          className={`flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm ${dragOverIndex === index ? "ring-1 ring-slate-200" : ""
            }`}
          onDragOver={(event) => {
            onDragOver(event);
            setDragOverIndex(index);
          }}
          onDragLeave={() => setDragOverIndex(null)}
          onDrop={() => onDrop(index)}
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              className="mt-1 text-slate-500 hover:text-slate-700 cursor-grab active:cursor-grabbing"
              draggable={!draggingDisabled}
              onDragStart={onDragStart(index)}
              onDragEnd={() => setDragOverIndex(null)}
              aria-label="Reorder question"
            >
              <GripVertical size={16} />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle size={18} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-900">
                {q.type === "algebra"
                  ? `${typeLabel("Answer Format Selection")}`
                  : typeLabel(q.type)}
              </span>
              <span className="text-xs text-slate-500">
                {normalizeMathText(q.body)}
              </span>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-3 whitespace-nowrap py-1 text-xs font-semibold text-amber-700">
            {q.marks || 0} mark{q.marks === 1 ? "" : "s"}
          </span>
        </div>
      ))}
    </div>
  );
};

const DescriptionCard = ({ description }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">Description</h2>
    <div className="mt-2 prose prose-sm max-w-none text-slate-700">
      {description ? (
        <p>{normalizeMathText(description)}</p>
      ) : (
        <p className="text-sm text-slate-600">
          No description provided for this topic yet.
        </p>
      )}
    </div>
  </div>
);

const LearningMaterialsCard = ({ banner }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Learning Materials
        </h2>
        <p className="text-sm text-slate-500">
          Visual reference for this topic.
        </p>
      </div>
      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
        {banner ? "1 image" : "No images"}
      </span>
    </div>
    {banner ? (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <img
          src={banner}
          alt="Topic visual"
          className="h-48 w-full object-cover"
        />
      </div>
    ) : (
      <p className="text-sm text-slate-600">No image uploaded yet.</p>
    )}
  </div>
);

// ---------- main component ----------

const TopicDetail = () => {
  const Navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const { topic, loading, error } = useTopicDetail({
    paramsId,
    locationTopic: state?.topic,
    locationTopicId: state?.topicId,
  });
  const [questions, setQuestions] = React.useState([]);
  const [dragSourceIndex, setDragSourceIndex] = React.useState(null);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);

  React.useEffect(() => {
    setQuestions(topic?.questions ?? []);
  }, [topic?.questions]);

  const handleDragStart = (index) => (event) => {
    setDragSourceIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (targetIndex) => {
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) {
      setDragSourceIndex(null);
      setDragOverIndex(null);
      return;
    }

    const sourceQuestion = questions[dragSourceIndex];
    const targetQuestion = questions[targetIndex];
    const firstQuestionId = getQuestionId(sourceQuestion);
    const secondQuestionId = getQuestionId(targetQuestion);
    if (!firstQuestionId || !secondQuestionId) {
      setDragSourceIndex(null);
      setDragOverIndex(null);
      return;
    }

    const previousQuestions = questions;
    const nextQuestions = [...previousQuestions];
    [nextQuestions[dragSourceIndex], nextQuestions[targetIndex]] = [
      nextQuestions[targetIndex],
      nextQuestions[dragSourceIndex],
    ];
    setQuestions(nextQuestions);
    setDragSourceIndex(null);
    setDragOverIndex(null);

    try {
      await swapOrderingQuestionsById({
        first_question_id: firstQuestionId,
        second_question_id: secondQuestionId,
      });
      toast.success("Question order updated.");
    } catch (error) {
      const message =
        error?.message || "Failed to update question order. Please try again.";
      setQuestions(previousQuestions);
      toast.error(message);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-52 items-center justify-center">
          <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
          Loading topic insights...
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="alert-custom bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      );
    }

    if (!topic) {
      return <p className="text-gray-500">No topic data available.</p>;
    }

    const banner = topic.image ? buildBackendFileUrl(topic.image) : null;

    return (
      <>
        <TopicHeaderCard topic={topic} />

        <section className="metrics-grid metrics-grid3 mt-5 mb-6">
          <DemographicCard
            icon={<HelpCircle size={24} />}
            title="Questions"
            classname="demoOrange"
            count={topic.stats.questions}
            subheading="Questions in this topic"
          />
          <DemographicCard
            icon={<Sparkles size={24} />}
            title="Total Marks"
            classname="demoGreen"
            count={topic.stats.marks}
            subheading="Assessment weight"
          />
          <DemographicCard
            icon={<Layers size={24} />}
            title="Classes"
            classname="demoRed"
            count={topic.stats.classes}
            subheading="Assigned classrooms"
          />
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <DescriptionCard description={topic.description} />

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm max-h-[350px] overflow-y-auto">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Questions
                  </h2>
                  <p className="text-sm text-slate-500">
                    Review linked questions and marks.
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {topic.stats.questions} total
                </span>
              </div>
              <QuestionsList
                questions={questions}
                dragOverIndex={dragOverIndex}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                setDragOverIndex={setDragOverIndex}
                draggingDisabled={loading}
              />
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm max-h-[350px] overflow-y-auto">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Classes
                </h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {topic.stats.classes} classes
                </span>
              </div>
              <ClassesList classes={topic.classes} />
            </div>

            <LearningMaterialsCard banner={banner} />
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Topic Detail</h1>
          <p className="text-slate-600 text-md">
            Explore this topic, linked questions, and assigned classes.
          </p>
        </div>
        <div className="dh-right flex gap-3">
          <button
            type="button"
            className="global-btn secondary"
            onClick={() => Navigate(-1)}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {topic?.id && (
            <Link
              to={`/admin/add-new-topic/${topic.id}`}
              state={{ topicId: topic.id, topic }}
              className="global-btn"
            >
              Edit Topic <Edit size={16} className="ml-2" />
            </Link>
          )}
        </div>
      </div>

      <div className="dashboard-body">{renderContent()}</div>
    </>
  );
};

export default TopicDetail;
