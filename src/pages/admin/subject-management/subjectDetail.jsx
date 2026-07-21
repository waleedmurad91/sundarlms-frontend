import React from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertTitle } from "@/components/ui/alert";
import DemographicCard from "@/components/DemographicCard";
import {
  AlertCircleIcon,
  Book,
  BookA,
  Edit,
  HelpCircle,
  Layers,
  ListChecks,
  Loader2,
  Sparkles,
  SquareStack,
  GripVertical,
  ArrowLeft,
} from "lucide-react";
import { getSubjectDetailById } from "@/api/subjectApi";
import { swapOrderingUnitsById } from "@/api/unitApi";
import { swapOrderingTopicsById } from "@/api/topicApi";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

const normalizeSubjectDetail = (payload, options = {}) => {
  const { assumeFullDetail = false } = options;
  const data = payload?.data ?? payload;

  if (!data) {
    return null;
  }

  const mapTopics = (topics) =>
    Array.isArray(topics)
      ? topics.map((topic) => ({
        id: topic?.topic_id ?? topic?._id ?? topic?.id ?? topic?.topicId,
        name: topic?.topic_name ?? topic?.name ?? "Untitled Topic",
        questionCount:
          topic?.questions_count ??
          topic?.questionsCount ??
          topic?.questions ??
          0,
      }))
      : [];

  const units = Array.isArray(data.units)
    ? data.units.map((unit) => ({
      id: unit?.unit_id ?? unit?._id ?? unit?.id ?? unit?.unitId,
      name: unit?.unit_name ?? unit?.name ?? "Untitled Unit",
      topics: mapTopics(unit?.topics),
    }))
    : [];

  const topicsCount =
    data?.topics_count ??
    units.reduce((total, unit) => total + unit.topics.length, 0);

  const questionsCount =
    data?.questions_count ??
    units.reduce(
      (total, unit) =>
        total +
        unit.topics.reduce(
          (topicTotal, topic) => topicTotal + (topic.questionCount || 0),
          0,
        ),
      0,
    );

  return {
    id:
      data?.subject_id ??
      data?._id ??
      data?.id ??
      data?.subjectId ??
      data?.subject_id,
    name: data?.subject ?? data?.name ?? "Untitled Subject",
    code: data?.code ?? data?.subject_code ?? data?.subjectCode ?? "",
    gradeId: data?.grade_id ?? data?.grade?.grade_id ?? data?.grade?.id,
    gradeName:
      data?.grade_name ??
      data?.grade?.name ??
      data?.grade?.grade ??
      data?.grade ??
      "",
    units,
    unitsCount: data?.units_count ?? units.length,
    topicsCount,
    questionsCount,
    hasFullDetail: assumeFullDetail,
    image_path: data?.image_path ?? data?.imagePath ?? null,
  };
};

const buildUnitStats = (unit) => {
  const topics = Array.isArray(unit?.topics) ? unit.topics : [];
  const questions = topics.reduce(
    (total, topic) => total + (topic.questionCount || 0),
    0,
  );

  return { topicsCount: topics.length, questions };
};

const getUnitId = (unit) =>
  unit?.id ?? unit?._id ?? unit?.unit_id ?? unit?.unitId ?? null;

const getTopicId = (topic) =>
  topic?.id ??
  topic?._id ??
  topic?.topic_id ??
  topic?.topicId ??
  topic?.topic?.id ??
  topic?.topic?._id ??
  null;

const SubjectDetail = () => {
   const Navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const locationSubject = state?.subject;
  const locationSubjectId = state?.subjectId;

  const fallbackSubject = React.useMemo(
    () => normalizeSubjectDetail(locationSubject, { assumeFullDetail: false }),
    [locationSubject],
  );

  const subjectId = React.useMemo(
    () => paramsId || locationSubjectId || fallbackSubject?.id,
    [paramsId, locationSubjectId, fallbackSubject?.id],
  );

  const [subject, setSubject] = React.useState(fallbackSubject);
  const [units, setUnits] = React.useState(fallbackSubject?.units ?? []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [unitDragSourceIndex, setUnitDragSourceIndex] = React.useState(null);
  const [unitDragOverIndex, setUnitDragOverIndex] = React.useState(null);
  const [topicDragSource, setTopicDragSource] = React.useState(null);
  const [topicDragOver, setTopicDragOver] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;

    if (!subjectId) {
      const message =
        "Subject identifier is missing. Please open this page from the subject list.";
      setError(message);
      toast.error(message);
      return undefined;
    }

    const fetchSubject = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getSubjectDetailById(subjectId);
        if (isMounted) {
          const normalized = normalizeSubjectDetail(response, {
            assumeFullDetail: true,
          });
          setSubject(normalized);
          setUnits(normalized?.units ?? []);
        }
      } catch (err) {
        const message =
          err?.message ||
          "Unable to load subject details right now. Please try again.";
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

    fetchSubject();

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  React.useEffect(() => {
    setUnits(subject?.units ?? []);
  }, [subject?.units]);

  const totals = React.useMemo(() => {
    const units = subject?.units || [];
    const topicsCount =
      subject?.topicsCount ??
      units.reduce((total, unit) => total + (unit?.topics?.length || 0), 0);
    const questionsCount =
      subject?.questionsCount ??
      units.reduce(
        (total, unit) =>
          total +
          (unit?.topics || []).reduce(
            (unitTotal, topic) => unitTotal + (topic?.questionCount || 0),
            0,
          ),
        0,
      );

    return {
      units: subject?.unitsCount ?? units.length,
      topics: topicsCount,
      questions: questionsCount,
    };
  }, [subject]);

  const handleUnitDragStart = (index) => (event) => {
    setUnitDragSourceIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleUnitDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleUnitDrop = async (targetIndex) => {
    if (unitDragSourceIndex === null || unitDragSourceIndex === targetIndex) {
      setUnitDragSourceIndex(null);
      setUnitDragOverIndex(null);
      return;
    }

    const sourceUnit = units[unitDragSourceIndex];
    const targetUnit = units[targetIndex];
    const firstUnitId = getUnitId(sourceUnit);
    const secondUnitId = getUnitId(targetUnit);
    if (!firstUnitId || !secondUnitId) {
      setUnitDragSourceIndex(null);
      setUnitDragOverIndex(null);
      return;
    }

    const previousUnits = units;
    const nextUnits = [...previousUnits];
    [nextUnits[unitDragSourceIndex], nextUnits[targetIndex]] = [
      nextUnits[targetIndex],
      nextUnits[unitDragSourceIndex],
    ];
    setUnits(nextUnits);
    setUnitDragSourceIndex(null);
    setUnitDragOverIndex(null);

    try {
      await swapOrderingUnitsById({
        first_unit_id: firstUnitId,
        second_unit_id: secondUnitId,
      });
      toast.success("Unit order updated.");
    } catch (error) {
      const message =
        error?.message || "Failed to update unit order. Please try again.";
      setUnits(previousUnits);
      toast.error(message);
    }
  };

  const handleTopicDragStart = (unitIndex, topicIndex) => (event) => {
    setTopicDragSource({ unitIndex, topicIndex });
    event.dataTransfer.effectAllowed = "move";
  };

  const handleTopicDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleTopicDrop = async (unitIndex, targetIndex) => {
    if (
      !topicDragSource ||
      topicDragSource.unitIndex !== unitIndex ||
      topicDragSource.topicIndex === targetIndex
    ) {
      setTopicDragSource(null);
      setTopicDragOver(null);
      return;
    }

    const unit = units[unitIndex];
    const topics = unit?.topics ?? [];
    const sourceTopic = topics[topicDragSource.topicIndex];
    const targetTopic = topics[targetIndex];
    const firstTopicId = getTopicId(sourceTopic);
    const secondTopicId = getTopicId(targetTopic);
    if (!firstTopicId || !secondTopicId) {
      setTopicDragSource(null);
      setTopicDragOver(null);
      return;
    }

    const previousUnits = units;
    const nextUnits = [...previousUnits];
    const nextTopics = [...topics];
    [nextTopics[topicDragSource.topicIndex], nextTopics[targetIndex]] = [
      nextTopics[targetIndex],
      nextTopics[topicDragSource.topicIndex],
    ];
    nextUnits[unitIndex] = { ...unit, topics: nextTopics };
    setUnits(nextUnits);
    setTopicDragSource(null);
    setTopicDragOver(null);

    try {
      await swapOrderingTopicsById({
        first_topic_id: firstTopicId,
        second_topic_id: secondTopicId,
      });
      toast.success("Topic order updated.");
    } catch (error) {
      const message =
        error?.message || "Failed to update topic order. Please try again.";
      setUnits(previousUnits);
      toast.error(message);
    }
  };

  const getAssignmentCoverSrc = (images) => {
    const path = extractFirstImagePath(images);
    return buildBackendFileUrl(path);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-52 items-center justify-center">
          <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
          Loading subject insights...
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

    if (!subject) {
      return <p className="text-gray-500">No subject data available.</p>;
    }

    return (
      <>
        <div className="inner-detail-card dashboard-body-card-dtl">
          <div className="idc-left">
            <div className="flex gap-4">
              <div className="school-icon bg-indigo-50 text-indigo-700">
                {subject?.image_path == "" || subject?.image_path == null ? (
                  <Book size={35} />
                ) : (
                  <img src={getAssignmentCoverSrc(subject?.image_path)} />
                )}
              </div>
              <div className="school-detail">
                <h1 className="flex items-center gap-3">
                  {subject.name}
                  {subject.code ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Code: {subject.code}
                    </span>
                  ) : null}
                </h1>
                <p>
                  <BookA size={16} className="text-[#AD474B]" />{" "}
                  <span>Grade {subject.gradeName || "N/A"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="metrics-grid metrics-grid3 mt-5 mb-6">
          <DemographicCard
            icon={<SquareStack size={24} />}
            title="Units"
            classname="demoBlue"
            count={totals.units}
            subheading="Curriculum blocks"
          />

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
            classname="demoOrange"
            count={totals.questions}
            subheading="Total Problems in this subjects"
          />
        </section>

        <div className="school-stats">
          <div className="flex items-center gap-3 school-stats-header">
            <div className="icon-world">
              <Sparkles />
            </div>
            <div className="school-stats-heading">
              <h2>Curriculum Outline</h2>
              <p>Expand a unit to view its topics and question counts.</p>
            </div>
          </div>

          <div className="school-stats-body">
            {units && units.length > 0 ? (
              <Accordion type="multiple" className="space-y-5 p-[30px]">
                {units.map((unit, unitIndex) => {
                  const unitStats = buildUnitStats(unit);
                  return (
                    <AccordionItem
                      key={getUnitId(unit) ?? unit.name}
                      value={`unit-${getUnitId(unit) ?? unit.name}`}
                      className={`overflow-hidden rounded-xl border border-slate-100 bg-slate-50 ${unitDragOverIndex === unitIndex
                          ? "ring-1 ring-slate-200"
                          : ""
                        }`}
                      onDragOver={(event) => {
                        handleUnitDragOver(event);
                        setUnitDragOverIndex(unitIndex);
                      }}
                      onDragLeave={() => setUnitDragOverIndex(null)}
                      onDrop={() => handleUnitDrop(unitIndex)}
                    >
                      <AccordionTrigger className="px-4 py-3 text-base font-semibold text-slate-900 hover:no-underline">
                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-3">
                            <span
                              role="button"
                              tabIndex={0}
                              className="text-slate-500 hover:text-slate-700 cursor-grab active:cursor-grabbing"
                              draggable={!loading}
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                              onDragStart={handleUnitDragStart(unitIndex)}
                              onDragEnd={() => setUnitDragOverIndex(null)}
                              onDragOver={(event) => {
                                handleUnitDragOver(event);
                                setUnitDragOverIndex(unitIndex);
                              }}
                              aria-label="Reorder unit"
                            >
                              <GripVertical size={16} />
                            </span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                              <Layers size={18} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold">
                                {unit.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {unitStats.topicsCount} topics |{" "}
                                {unitStats.questions} questions
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                              {unitStats.topicsCount} Topics
                            </span>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              {unitStats.questions} Questions
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="bg-white p-[20px]">
                        {unit.topics && unit.topics.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {unit.topics.map((topic, topicIndex) => (
                              <div
                                key={getTopicId(topic) ?? topic.name}
                                className={`flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm ${topicDragOver &&
                                    topicDragOver.unitIndex === unitIndex &&
                                    topicDragOver.topicIndex === topicIndex
                                    ? "ring-1 ring-slate-200"
                                    : ""
                                  }`}
                                onDragOver={(event) => {
                                  handleTopicDragOver(event);
                                  setTopicDragOver({
                                    unitIndex,
                                    topicIndex,
                                  });
                                }}
                                onDragLeave={() => setTopicDragOver(null)}
                                onDrop={() =>
                                  handleTopicDrop(unitIndex, topicIndex)
                                }
                              >
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    className="text-slate-500 hover:text-slate-700 cursor-grab active:cursor-grabbing"
                                    draggable={!loading}
                                    onDragStart={handleTopicDragStart(
                                      unitIndex,
                                      topicIndex,
                                    )}
                                    onDragEnd={() => setTopicDragOver(null)}
                                    aria-label="Reorder topic"
                                  >
                                    <GripVertical size={16} />
                                  </button>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {topic.name}
                                  </p>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  {topic.questionCount} Qs
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600">
                            No topics added to this unit yet.
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <p className="text-slate-600 p-[30px]">
                No units found for this subject yet.
              </p>
            )}
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
          <h1>Subject Detail</h1>
          <p className="text-slate-600 text-md">
            Explore the curriculum structure and question coverage by unit.
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
          {subject?.id && (
            <Link
              to={`/admin/add-new-subject/${subject.id}`}
              state={{ subjectId: subject.id, subject }}
              className="global-btn"
            >
              Edit Subject <Edit size={16} className="ml-2" />
            </Link>
          )}
        </div>
      </div>

      <div className="dashboard-body">{renderContent()}</div>
    </>
  );
};

export default SubjectDetail;
