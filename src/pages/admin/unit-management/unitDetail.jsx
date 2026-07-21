import React from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import DemographicCard from "@/components/DemographicCard";
import {
  AlertCircleIcon,
  BookA,
  BookCheck,
  Download,
  Edit,
  HelpCircle,
  Layers,
  ListChecks,
  Loader2,
  GripVertical,
  Regex,
  Sparkles,
  SquareStack,
  ArrowLeft,
} from "lucide-react";
import { getUnitDetailById } from "@/api/unitApi";
import { swapOrderingTopicsById } from "@/api/topicApi";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
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

const getTopicId = (topic) =>
  topic?.id ??
  topic?._id ??
  topic?.topic_id ??
  topic?.topicId ??
  topic?.topic?.id ??
  topic?.topic?._id ??
  null;

const normalizeUnitDetail = (payload) => {
  const data = payload?.data ?? payload;
  if (!data) return null;

  const topics = Array.isArray(data.topics)
    ? data.topics.map((topic) => ({
      id: topic?.id ?? topic?._id ?? topic?.topic_id,
      name: topic?.topic_name ?? topic?.name ?? "Untitled Topic",
      description: topic?.description ?? "",
      questionCount:
        topic?.questions_count ??
        topic?.questionsCount ??
        topic?.questions ??
        0,
    }))
    : [];

  const images = parseArrayValue(data.images);
  const learningMaterials = parseArrayValue(data.learning_materials);

  const subjectInfo = data.subject || {};
  const gradeInfo = subjectInfo.grade || {};

  const topicsCount = data?.topics_count ?? topics.length ?? topics.length;
  const questionsCount =
    data?.questions_count ??
    topics.reduce((total, topic) => total + (topic.questionCount || 0), 0);

  return {
    id: data?.id ?? data?._id ?? data?.unit_id,
    name: data?.unit_name ?? data?.name ?? "Untitled Unit",
    description: data?.description ?? "",
    images,
    learningMaterials,
    subject: {
      id: subjectInfo?.id ?? subjectInfo?.subject_id,
      name: subjectInfo?.subject ?? subjectInfo?.name ?? "",
      code: subjectInfo?.code ?? "",
      grade: {
        id: gradeInfo?.id ?? subjectInfo?.grade_id,
        name: gradeInfo?.name ?? gradeInfo?.title ?? "",
      },
    },
    topics,
    topicsCount,
    questionsCount,
    createdAt: data?.created_at ?? null,
    updatedAt: data?.updated_at ?? null,
  };
};

const summarizeUnit = (unit) => {
  if (!unit) {
    return { topics: 0, questions: 0, materials: 0, images: 0 };
  }
  const topics = Array.isArray(unit.topics) ? unit.topics : [];
  const questions = topics.reduce(
    (total, topic) => total + (topic.questionCount || 0),
    0
  );
  return {
    topics: unit.topicsCount ?? topics.length,
    questions: unit.questionsCount ?? questions,
    materials: Array.isArray(unit.learningMaterials)
      ? unit.learningMaterials.length
      : 0,
    images: Array.isArray(unit.images) ? unit.images.length : 0,
  };
};

const resolveMaterialLabel = (path = "") => {
  const cleaned = path.split("?")[0] || path;
  const ext = cleaned.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "A PDF file";
  const videoExts = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];
  if (ext && videoExts.includes(ext)) return "A Video File";
  return "A File";
};

// ---------- data hook ----------

const useUnitDetail = ({ paramsId, locationUnit, locationUnitId }) => {
  const fallbackUnit = React.useMemo(
    () => normalizeUnitDetail(locationUnit),
    [locationUnit]
  );

  const unitId = React.useMemo(
    () => paramsId || locationUnitId || fallbackUnit?.id,
    [paramsId, locationUnitId, fallbackUnit?.id]
  );

  const [unit, setUnit] = React.useState(fallbackUnit);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let isMounted = true;

    if (!unitId) {
      const message =
        "Unit identifier is missing. Please open this page from the unit list.";
      setError(message);
      toast.error(message);
      return undefined;
    }

    const fetchUnit = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getUnitDetailById(unitId);
        if (isMounted) {
          setUnit(normalizeUnitDetail(response));
        }
      } catch (err) {
        const message =
          err?.message ||
          "Unable to load unit details right now. Please try again.";
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

    fetchUnit();

    return () => {
      isMounted = false;
    };
  }, [unitId]);

  const totals = React.useMemo(() => summarizeUnit(unit), [unit]);

  return { unit, loading, error, totals };
};

// ---------- presentational pieces ----------

const UnitHeaderCard = ({ unit, totals }) => (
  <div className="inner-detail-card dashboard-body-card-dtl">
    <div className="idc-left">
      <div className="flex gap-4">
        <div className="school-icon bg-indigo-50 text-indigo-700">
          <SquareStack size={35} />
        </div>
        <div className="school-detail">
          <h1 className="flex flex-wrap items-center gap-3">{unit.name}</h1>
          <p className="text-slate-600">
            <BookA size={16} className="text-[#AD474B]" />
            Grade: {unit.subject?.grade?.name || "N/A"}
          </p>
          <p className="text-slate-600">
            <BookCheck size={16} className="text-[#AD474B]" />
            Subject: {unit.subject.name || "N/A"}
          </p>
          <p className="text-slate-600">
            <Regex size={16} className="text-[#AD474B]" />
            Code: {unit.subject.code || "N/A"}
          </p>
        </div>
      </div>
    </div>
  </div>
);

const TopicsGrid = ({
  topics,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  setDragOverIndex,
  draggingDisabled,
}) => {
  if (!topics || topics.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No topics added to this unit yet.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {topics.map((topic, index) => (
        <div
          key={getTopicId(topic) ?? topic.name}
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
              aria-label="Reorder topic"
            >
              <GripVertical size={16} />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
              <Layers size={18} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-900">
                {topic.name}
              </span>
              <span className="text-xs text-slate-500">
                {topic.questionCount} questions
              </span>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {topic.questionCount} Qs
          </span>
        </div>
      ))}
    </div>
  );
};

const MaterialsList = ({ materials }) => {
  if (!materials || materials.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No learning materials uploaded for this unit yet.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {materials.map((file, index) => (
        <a
          key={`${file}-${index}`}
          href={file}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <Download size={16} />
            </div>
            <div className="flex flex-col">
              <span className="truncate">{resolveMaterialLabel(file)}</span>
              <span className="text-xs text-emerald-700">Download</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

const ImagesGrid = ({ images }) => {
  if (!images || images.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No images uploaded for this unit yet.
      </p>
    );
  }
  const getAssignmentCoverSrc = (images) => {
    const path = extractFirstImagePath(images);
    return buildBackendFileUrl(path);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {images.map((src, index) => (
        <div key={`${src}-${index}`} className="overflow-hidden">
          <img
            src={getAssignmentCoverSrc(src)}
            alt={`Unit visual ${index + 1}`}
            className="h-16 w-16 object-cover  rounded-lg border border-slate-200 bg-white shadow-sm"
          />
        </div>
      ))}
    </div>
  );
};

// ---------- main component ----------

const UnitDetail = () => {
  const Navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const { unit, loading, error, totals } = useUnitDetail({
    paramsId,
    locationUnit: state?.unit,
    locationUnitId: state?.unitId,
  });
  const [topics, setTopics] = React.useState([]);
  const [dragSourceIndex, setDragSourceIndex] = React.useState(null);
  const [dragOverIndex, setDragOverIndex] = React.useState(null);

  React.useEffect(() => {
    setTopics(unit?.topics ?? []);
  }, [unit?.topics]);

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

    const sourceTopic = topics[dragSourceIndex];
    const targetTopic = topics[targetIndex];
    const firstTopicId = getTopicId(sourceTopic);
    const secondTopicId = getTopicId(targetTopic);
    if (!firstTopicId || !secondTopicId) {
      setDragSourceIndex(null);
      setDragOverIndex(null);
      return;
    }

    const previousTopics = topics;
    const nextTopics = [...previousTopics];
    [nextTopics[dragSourceIndex], nextTopics[targetIndex]] = [
      nextTopics[targetIndex],
      nextTopics[dragSourceIndex],
    ];
    setTopics(nextTopics);
    setDragSourceIndex(null);
    setDragOverIndex(null);

    try {
      await swapOrderingTopicsById({
        first_topic_id: firstTopicId,
        second_topic_id: secondTopicId,
      });
      toast.success("Topic order updated.");
    } catch (error) {
      const message =
        error?.message || "Failed to update topic order. Please try again.";
      setTopics(previousTopics);
      toast.error(message);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-52 items-center justify-center">
          <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
          Loading unit insights...
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

    if (!unit) {
      return <p className="text-gray-500">No unit data available.</p>;
    }

    return (
      <>
        <UnitHeaderCard unit={unit} totals={totals} />

        <section className="metrics-grid metrics-grid3 mt-5 mb-6">
          <DemographicCard
            icon={<ListChecks size={24} />}
            title="Topics"
            classname="demoGreen"
            count={totals.topics}
            subheading="Concept groups"
          />

          <DemographicCard
            icon={<HelpCircle size={24} />}
            title="Questions"
            classname="demoBlue"
            count={totals.questions}
            subheading="Total problems"
          />

          <DemographicCard
            icon={<Sparkles size={24} />}
            title="Assets"
            classname="demoOrange"
            count={totals.materials + totals.images}
            subheading="Images and files"
          />
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Topics</h2>
                <p className="text-sm text-slate-500">
                  Topic names and question coverage.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {totals.topics} total
              </span>
            </div>
            <TopicsGrid
              topics={topics}
              dragOverIndex={dragOverIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              setDragOverIndex={setDragOverIndex}
              draggingDisabled={loading}
            />
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Learning Materials
                </h2>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {totals.materials} files
                </span>
              </div>
              <MaterialsList materials={unit.learningMaterials} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Images</h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {totals.images} visuals
                </span>
              </div>
              <ImagesGrid images={unit.images} />
            </div>
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
          <h1>Unit Detail</h1>
          <p className="text-slate-600 text-md">
            Explore this unit, its topics, and related learning assets.
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
          {unit?.id && (
            <Link
              to={`/admin/add-new-unit/${unit.id}`}
              state={{ unitId: unit.id, unit }}
              className="global-btn"
            >
              Edit Unit <Edit size={16} className="ml-2" />
            </Link>
          )}
        </div>
      </div>

      <div className="dashboard-body">{renderContent()}</div>
    </>
  );
};

export default UnitDetail;
