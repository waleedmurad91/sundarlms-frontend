import { LearningMaterials } from "./LearningMaterial";
import { TopicsTable } from "./TopicsTable";
import { PracticeActions } from "./PracticeActions";
import { ClipboardX } from "lucide-react";
import DOMPurify from "dompurify";

export const UnitDetails = ({ unit }) => {
  if (!unit) {
    return (
      <section className="rounded-sm border border-gray-200 bg-white p-10 text-center text-slate-500">
        Select a unit from the left to see its practice plan.
      </section>
    );
  }

  const normalizeType = (value) =>
    String(value ?? "")
      .toLowerCase()
      .replace(/\s+/g, "");

  const flowEntries = Array.isArray(unit.flow) ? unit.flow.filter(Boolean) : [];
  const unitDescription = unit.description;
  const sanitizedDescription = DOMPurify.sanitize(unitDescription ?? "");
  const hasDescription =
    typeof unitDescription === "string" &&
    sanitizedDescription
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length > 0;
  const unitMaterialsToRender = [
    ...(Array.isArray(unit.learning_materials) ? unit.learning_materials : []),
    ...(Array.isArray(unit.learning_material_urls)
      ? unit.learning_material_urls
      : []),
  ].filter(Boolean);
  const normalizeLevelKey = (value) =>
    String(value ?? "")
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
  const buildFlowBlocks = () => {
    if (!flowEntries.length) {
      const blocks = [];
      if (unit.topics?.length) {
        unit.topics.forEach((topic, index) => {
          blocks.push({
            key: `topics-default-${index}`,
            type: "topics",
            topics: [topic],
          });
        });
      }
      if (unit.quiz) {
        blocks.push({ key: "quiz-default", type: "quiz", quiz: unit.quiz });
      }
      if (unit.unit_test) {
        blocks.push({
          key: "unit-test-default",
          type: "unitTest",
          unitTest: unit.unit_test,
        });
      }
      return blocks;
    }

    const blocks = [];
    let hasQuizBlock = false;
    let hasUnitTestBlock = false;

    flowEntries.forEach((entry, index) => {
      const type = normalizeType(entry.type);

      if (type === "topic") {
        const topicData = entry.topic ?? entry.data ?? entry;
        blocks.push({
          key: `topic-${topicData?.topic_id ?? index}`,
          type: "topics",
          topics: [topicData],
        });
        return;
      }

      if (type === "quiz") {
        hasQuizBlock = true;
        const quizData = entry.quiz ?? entry.data ?? entry;
        if (quizData) {
          blocks.push({
            key: `quiz-${index}`,
            type: "quiz",
            quiz: quizData,
          });
        }
        return;
      }

      if (type === "unittest" || type === "unit_test") {
        hasUnitTestBlock = true;
        const unitTestData = entry.unitTest ?? entry.data ?? entry;
        if (unitTestData) {
          blocks.push({
            key: `unit-test-${index}`,
            type: "unitTest",
            unitTest: unitTestData,
          });
        }
      }
    });

    if (!hasQuizBlock && unit.quiz) {
      blocks.push({ key: "quiz-fallback", type: "quiz", quiz: unit.quiz });
    }

    if (!hasUnitTestBlock && unit.unit_test) {
      blocks.push({
        key: "unit-test-fallback",
        type: "unitTest",
        unitTest: unit.unit_test,
      });
    }

    return blocks;
  };

  const flowBlocks = buildFlowBlocks();
  const firstNotStartedTopicId = (() => {
    for (const block of flowBlocks) {
      if (block.type !== "topics") continue;
      const topic = block.topics?.[0];
      if (
        topic &&
        normalizeLevelKey(topic.mastery_level) === "notstarted" &&
        (topic.topic_id !== undefined || topic.id !== undefined)
      ) {
        return topic.topic_id ?? topic.id;
      }
    }
    return null;
  })();

  let practiceSectionIndex = 0;

  return (
    <section className="space-y-8">
      <div className="udtl-card">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              About this unit
            </h2>
            {hasDescription ? (
              <div
                className="mt-2 text-base text-slate-600 space-y-3"
                dangerouslySetInnerHTML={{
                  __html: sanitizedDescription,
                }}
              />
            ) : (
              <p className="mt-2 text-base text-slate-600">
                Work through the lessons and practice checks below. Finish the
                quiz and the optional unit test to lock in your mastery.
              </p>
            )}

            {unitMaterialsToRender.length ? (
              <div className="mt-4">
                <h3 className="text-gray-500 text-[14px] mb-4">Learn</h3>
                <LearningMaterials materials={unitMaterialsToRender} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {flowBlocks.map((block) => {
        if (block.type === "topics") {
          practiceSectionIndex += 1;
          const topicTitle = block.topics?.[0]?.topic_name;
          const hasMultipleTopicBlocks =
            flowBlocks.filter((b) => b.type === "topics").length > 1;
          const practiceTitle =
            topicTitle ||
            (hasMultipleTopicBlocks
              ? `Practice block ${practiceSectionIndex}`
              : "Getting started with practice");
          const firstTopic = block.topics?.[0] ?? null;
          const topicDescription = firstTopic?.description;
          const sanitizedDescription = DOMPurify.sanitize(
            topicDescription ?? ""
          );
          const hasDescription =
            typeof topicDescription === "string" &&
            sanitizedDescription
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/g, " ")
              .trim().length > 0;
          const topicLearningMaterials = Array.isArray(
            firstTopic?.learning_materials
          )
            ? firstTopic.learning_materials
            : [];
          const topicMaterialUrls = Array.isArray(
            firstTopic?.learning_material_urls
          )
            ? firstTopic.learning_material_urls
            : [];
          const fallbackMaterials = firstTopic?.image
            ? [
                {
                  id: `topic-image-${firstTopic?.topic_id ?? firstTopic?.id ?? "fallback"}`,
                  url: firstTopic.image,
                  label: firstTopic.topic_name || "Topic image",
                },
              ]
            : [];
          const materialsToRender = [
            ...topicLearningMaterials,
            ...topicMaterialUrls,
            ...fallbackMaterials,
          ].filter(Boolean);
          return (
            <div key={block.key} className="udtl-card">
              <div className="flex items-center justify-between border-b border-gray-200 pb-5 mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {practiceTitle}
                  </h3>
                </div>
              </div>
              <div className="udtl-body-wrap">
                <div className="udtl-body-left">
                  <h3 className="text-gray-500 text-[14px] mb-4">Learn</h3>

                  {hasDescription ? (
                    <div
                      className="text-[16px] text-slate-700 mb-3 space-y-2"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(sanitizedDescription),
                      }}
                    />
                  ) : (
                    <p className="text-[16px] text-slate-700 mb-3 space-y-2">
                      Level up on the above skills and collect mastery points!
                    </p>
                  )}

                  {materialsToRender.length > 0 ? (
                    <LearningMaterials materials={materialsToRender} />
                  ) : (
                    ""
                  )}

                  {/* {!topicDescription && materialsToRender.length === 0 ? (
                    <p className="text-[16px] text-slate-700 mb-3">
                      Level up on the skills and collect mastery points!
                    </p>
                  ) : (
                    ""
                  )} */}
                </div>

                <div className="udtl-body-right">
                  <h3 className="text-gray-500 text-[14px] mb-4">Practice</h3>

                  {block.topics.length === 0 ? (
                    <p className="text-gray-500 text-sm flex items-center">
                      <ClipboardX size={14} className="mr-2" />
                      No data found.
                    </p>
                  ) : (
                    <TopicsTable
                      topics={block.topics}
                      firstNotStartedId={firstNotStartedTopicId}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        }

        if (block.type === "quiz") {
          return (
            <div key={block.key}>
              <PracticeActions quiz={block.quiz} />
            </div>
          );
        }

        if (block.type === "unitTest") {
          return (
            <div key={block.key}>
              <PracticeActions unitTest={block.unitTest} />
            </div>
          );
        }

        return null;
      })}

      {!flowBlocks.length && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
          No practice items are available for this unit yet.
        </div>
      )}
    </section>
  );
};
