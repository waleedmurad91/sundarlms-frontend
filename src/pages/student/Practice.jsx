import React from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getStudentUnitPracticeData } from "@/api/studentPracticeApi";
import PracticeSidebarLayout from "@/layouts/PracticeSidebarLayout";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { UnitDetails } from "@/components/UnitDetail";
import { PracticeHero } from "@/components/PracticeHero";
import { getBucketKey } from "@/utils/GetBucketKey";
import { MASTERY_SPECTRUM } from "@/utils/MasterySpectrum";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const parseMediaList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      /* noop */
    }
    return [value];
  }

  if (typeof value === "object") {
    return [value];
  }

  return [];
};

const countUnitTopics = (units) =>
  safeArray(units).reduce(
    (sum, unit) => sum + safeArray(unit?.topics).length,
    0
  );

const formatGradeLabel = (gradeName, gradeId) => {
  if (gradeName && String(gradeName).trim().length > 0) {
    const label = String(gradeName).trim();
    return /grade/i.test(label) ? label : `Grade ${label}`;
  }
  if (gradeId !== null && gradeId !== undefined) {
    return `Grade ${gradeId}`;
  }
  return "";
};

const extractFileName = (path) => {
  if (!path) return "";
  const segments = path.split(/[\\/]/);
  return segments.pop() || path;
};

const buildLearningMaterials = (value) =>
  parseMediaList(value).map((entry, index) => {
    if (typeof entry === "string") {
      return {
        id: `material-${index}`,
        label: extractFileName(entry) || `Material ${index + 1}`,
        url: entry,
      };
    }

    if (entry && typeof entry === "object") {
      const url = entry.url ?? entry.path ?? "";
      return {
        id: entry.id ?? `material-${index}`,
        label: entry.label || extractFileName(url) || `Material ${index + 1}`,
        url,
      };
    }

    return {
      id: `material-${index}`,
      label: `Material ${index + 1}`,
      url: "",
    };
  });

const buildLearningMaterialUrls = (value) =>
  parseMediaList(value).map((entry, index) => {
    if (typeof entry === "string") {
      return {
        id: `material-url-${index}`,
        label: entry,
        url: entry,
      };
    }

    if (entry && typeof entry === "object") {
      const url = entry.url ?? entry.link ?? entry.href ?? entry.path ?? "";
      return {
        id: entry.id ?? `material-url-${index}`,
        label: entry.label ?? url ?? `URL ${index + 1}`,
        url,
      };
    }

    return {
      id: `material-url-${index}`,
      label: `URL ${index + 1}`,
      url: "",
    };
  });

const normalizeAssessment = (assessment, fallbackTitle) => {
  if (!assessment || typeof assessment !== "object") {
    return null;
  }

  return {
    id:
      assessment.unit_test_id ??
      assessment.quiz_id ??
      assessment.test_id ??
      assessment.id ??
      null,
    title: assessment.title ?? fallbackTitle,
    total_questions:
      assessment.total_questions ?? assessment.totalQuestions ?? 0,
    attempted:
      assessment.attempted ??
      assessment.attempt_status ??
      (assessment.status
        ? String(assessment.status).toLowerCase() !== "notstarted"
        : false),
    percentage: assessment.percentage ?? null,
    score: assessment.score ?? null,
    total_marks: assessment.total_marks ?? assessment.totalMarks ?? null,
    completed_at: assessment.completed_at ?? assessment.completedAt ?? null,
    quiz_status: assessment.quiz_status ?? null,
  };
};

const normalizeTopicEntry = (topic, index) => ({
  topic_id: topic?.topic_id ?? topic?.id ?? index,
  topic_name: topic?.topic_name ?? topic?.title ?? `Topic ${index + 1}`,
  mastery_level: topic?.mastery_level ?? topic?.masteryLevel ?? "Not Started",
  score: topic?.score ?? topic?.points ?? 0,
  total_questions: topic?.total_questions ?? topic?.totalQuestions ?? 0,
  total_questions_practice:
    topic?.total_questions_practice ??
    topic?.totalQuestionsPractice ??
    topic?.practice_questions_count ??
    topic?.practice_questions ??
    0,
  total_questions_challenge:
    topic?.total_questions_challenge ??
    topic?.totalQuestionsChallenge ??
    topic?.challenge_questions_count ??
    topic?.challenge_questions ??
    0,
  has_challenge: topic?.has_challenge ?? topic?.hasChallenge,
  correct: topic?.correct ?? topic?.correct_answers ?? 0,
  attempted: topic?.attempted ?? topic?.questions_attempted ?? 0,
  points: topic?.points ?? topic?.score ?? 0,
  description: topic?.description ?? topic?.topic_description ?? "",
  image: topic?.image ?? topic?.topic_image ?? null,
  learning_materials: buildLearningMaterials(
    topic?.learning_materials ??
      topic?.learning_material ??
      topic?.learing_materials
  ),
  learning_material_urls: buildLearningMaterialUrls(
    topic?.learning_material_urls ??
      topic?.learningMaterialUrls ??
      topic?.material_urls ??
      topic?.materialUrls
  ),
});

const normalizeTopics = (topics) =>
  safeArray(topics).map((topic, index) => normalizeTopicEntry(topic, index));

const normalizeFlowEntry = (entry, index) => {
  const type = String(entry?.type ?? "topic").toLowerCase();
  const payload = entry?.data ?? {};

  if (type === "topic") {
    return {
      id: entry?.id ?? `flow-topic-${index}`,
      type: "topic",
      topic: normalizeTopicEntry(payload, index),
    };
  }

  if (type === "quiz") {
    return {
      id: entry?.id ?? `flow-quiz-${index}`,
      type: "quiz",
      quiz: normalizeAssessment(payload, `Quiz ${index + 1}`),
    };
  }

  if (type === "unit_test" || type === "unittest" || type === "unit test") {
    return {
      id: entry?.id ?? `flow-unit-test-${index}`,
      type: "unitTest",
      unitTest: normalizeAssessment(payload, `Unit test ${index + 1}`),
    };
  }

  return null;
};

const buildUnitKey = (unit, index) => {
  if (unit?.unit_id !== undefined && unit?.unit_id !== null) {
    return String(unit.unit_id);
  }
  if (unit?.unit_name) {
    return unit.unit_name.toLowerCase().replace(/\s+/g, "-");
  }
  return `unit-${index}`;
};

const normalizeUnits = (units) =>
  safeArray(units).map((unit, index) => {
    const normalizedFlow = safeArray(unit?.flow)
      .map((entry, flowIndex) => normalizeFlowEntry(entry, flowIndex))
      .filter(Boolean);

    const normalizedTopics = safeArray(unit?.topics).length
      ? normalizeTopics(unit?.topics)
      : normalizedFlow
          .filter((entry) => entry.type === "topic")
          .map((entry) => entry.topic);

    const fallbackQuiz =
      normalizedFlow.find((entry) => entry.type === "quiz")?.quiz ?? null;
    const fallbackUnitTest =
      normalizedFlow.find((entry) => entry.type === "unitTest")?.unitTest ??
      null;

    return {
      key: buildUnitKey(unit, index),
      unit_id: unit?.unit_id ?? unit?.id ?? null,
      unit_name: unit?.unit_name ?? unit?.title ?? `Unit ${index + 1}`,
      description: unit?.description ?? "",
      code: unit?.code ?? null,
      images: parseMediaList(unit?.images),
      learning_materials: buildLearningMaterials(unit?.learning_materials),
      learning_material_urls: buildLearningMaterialUrls(
        unit?.learning_material_urls ??
          unit?.learningMaterialUrls ??
          unit?.material_urls ??
          unit?.materialUrls
      ),
      flow: normalizedFlow,
      topics: normalizedTopics,
      quiz: normalizeAssessment(unit?.quiz, "Quiz") ?? fallbackQuiz,
      unit_test:
        normalizeAssessment(unit?.unit_test, "Unit test") ?? fallbackUnitTest,
      total_mastery_points: Number(unit?.total_mastery_points ?? 0),
      gained_mastery_points: Number(unit?.gained_mastery_points ?? 0),
    };
  });

const buildSubjectKey = (subject, index) => {
  if (subject?.subject_id !== undefined && subject?.subject_id !== null) {
    return String(subject.subject_id);
  }
  if (subject?.subject_name) {
    return subject.subject_name.toLowerCase().replace(/\s+/g, "-");
  }
  return `subject-${index}`;
};

const normalizePracticeData = (response) => {
  const payload = response?.data ?? response ?? {};
  const subjectsArray = safeArray(payload?.subjects);
  const subjects = safeArray(payload?.subjects).map((subject, index) => ({
    key: buildSubjectKey(subject, index),
    subject_id: subject?.subject_id ?? subject?.id ?? null,
    subject_name:
      subject?.subject_name ?? subject?.name ?? `Subject ${index + 1}`,
    grade_id: subject?.grade_id ?? payload?.grade_id ?? null,
    grade_name: subject?.grade_name ?? payload?.grade_name ?? "",
    units_count: subject?.units_count ?? safeArray(subject?.units).length,
    skills_count: subject?.skills_count ?? countUnitTopics(subject?.units),
    units: normalizeUnits(subject?.units),
  }));

  const sumUnits = (field) =>
    subjectsArray
      .flatMap((subject) => safeArray(subject?.units))
      .reduce((sum, unit) => sum + Number(unit?.[field] ?? 0), 0);

  const totalMasteryPoints =
    payload?.total_mastery_points ??
    payload?.totalMasteryPoints ??
    sumUnits("total_mastery_points");
  const gainedMasteryPoints =
    payload?.gained_mastery_points ??
    payload?.gainedMasteryPoints ??
    sumUnits("gained_mastery_points");

  return {
    student_id: payload?.student_id ?? null,
    student_name: payload?.student_name ?? "Student",
    grade_id: payload?.grade_id ?? null,
    grade_name: payload?.grade_name ?? "",
    total_mastery_points: Number(totalMasteryPoints ?? 0),
    gained_mastery_points: Number(gainedMasteryPoints ?? 0),
    subjects,
  };
};

const SKILL_TARGET = 8;

const buildMasteryBuckets = (topics = []) => {
  const base = MASTERY_SPECTRUM.reduce(
    (acc, entry) => ({ ...acc, [entry.label]: 0 }),
    {}
  );

  topics.forEach((topic) => {
    const key = getBucketKey(topic.mastery_level);
    base[key] += 1;
  });

  return base;
};

const findNextTopic = (topics = []) => {
  if (!topics.length) return null;
  const unfinished = topics.find(
    (topic) => getBucketKey(topic.mastery_level) === "Not Started"
  );
  return unfinished ?? topics[0];
};

const StudentPractice = () => {
  const { unitId: routeUnitId } = useParams();
  const { student: _student } = useStudentPortal();
  const [practice, setPractice] = React.useState({
    subjects: [],
    student_name: "",
    grade_id: null,
    grade_name: "",
    total_mastery_points: 0,
    gained_mastery_points: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [activeSubjectKey, setActiveSubjectKey] = React.useState(null);
  const [activeUnitKey, setActiveUnitKey] = React.useState(null);
  const loadPracticeData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getStudentUnitPracticeData();
      const normalized = normalizePracticeData(response);
      setPractice(normalized);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to load practice data right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPracticeData();
  }, [loadPracticeData]);

  React.useEffect(() => {
    if (!practice.subjects.length) {
      setActiveSubjectKey(null);
      return;
    }
    if (!activeSubjectKey) {
      setActiveSubjectKey(practice.subjects[0].key);
      return;
    }
    const exists = practice.subjects.some(
      (subject) => subject.key === activeSubjectKey
    );
    if (!exists) {
      setActiveSubjectKey(practice.subjects[0].key);
    }
  }, [practice.subjects, activeSubjectKey]);

  const activeSubject = React.useMemo(
    () =>
      practice.subjects.find((subject) => subject.key === activeSubjectKey) ??
      practice.subjects[0] ??
      null,
    [practice.subjects, activeSubjectKey]
  );

  React.useEffect(() => {
    const units = activeSubject?.units ?? [];
    if (!units.length) {
      setActiveUnitKey(null);
      return;
    }
    if (!activeUnitKey) {
      setActiveUnitKey(String(units[0].unit_id ?? units[0].key));
      return;
    }
    const exists = units.some(
      (unit) =>
        String(unit.unit_id ?? unit.key ?? "") === String(activeUnitKey ?? "")
    );
    if (!exists) {
      setActiveUnitKey(String(units[0].unit_id ?? units[0].key));
    }
  }, [activeSubject, activeUnitKey]);

  const activeUnit = React.useMemo(() => {
    const units = activeSubject?.units ?? [];
    if (!units.length) return null;
    const byKey = units.find(
      (unit) =>
        String(unit.unit_id ?? unit.key ?? "") === String(activeUnitKey ?? "")
    );
    if (byKey) return byKey;
    const byId = units.find(
      (unit) =>
        unit.unit_id !== null &&
        String(unit.unit_id) === String(activeUnitKey ?? "")
    );
    return byId ?? units[0];
  }, [activeSubject, activeUnitKey]);

  React.useEffect(() => {
    if (!routeUnitId || !practice.subjects.length) {
      return;
    }
    const normalizedId = String(routeUnitId);
    for (const subject of practice.subjects) {
      const match = subject.units.find(
        (unit) =>
          unit.unit_id !== null &&
          String(unit.unit_id ?? unit.key ?? "") === normalizedId
      );
      if (match) {
        if (activeSubjectKey !== subject.key) {
          setActiveSubjectKey(subject.key);
        }
        const matchKey = String(match.unit_id ?? match.key ?? "");
        if (String(activeUnitKey ?? "") !== matchKey) {
          setActiveUnitKey(matchKey);
        }
        break;
      }
    }
  }, [
    routeUnitId,
    practice.subjects,
    activeSubjectKey,
    activeUnitKey,
    setActiveSubjectKey,
  ]);

  const nextTopic = React.useMemo(
    () => findNextTopic(activeUnit?.topics),
    [activeUnit?.topics]
  );

  const masteryBuckets = React.useMemo(
    () => buildMasteryBuckets(activeUnit?.topics),
    [activeUnit?.topics]
  );

  const heroSubtitle = React.useMemo(() => {
    const subjectName = activeSubject?.subject_name;
    const gradeLabel = formatGradeLabel(
      activeSubject?.grade_name ?? practice.grade_name,
      activeSubject?.grade_id ?? practice.grade_id
    );
    if (!subjectName && !gradeLabel) {
      return "Track your mastery progress across every unit.";
    }
    if (!subjectName) {
      return gradeLabel;
    }
    return gradeLabel ? `${gradeLabel} - ${subjectName}` : subjectName;
  }, [
    activeSubject?.subject_name,
    activeSubject?.grade_name,
    activeSubject?.grade_id,
    practice.grade_name,
    practice.grade_id,
  ]);

  const handleSubjectChange = (event) => {
    setActiveSubjectKey(event.target.value);
  };

  const handleRetry = () => {
    loadPracticeData();
  };

  const sidebarProps = React.useMemo(
    () => ({
      units: activeSubject?.units ?? [],
      activeUnitKey,
      onSelectUnit: setActiveUnitKey,
      subjectName: activeSubject?.subject_name,
      subjectId: activeSubject?.subject_id,
      gradeName: activeSubject?.grade_name ?? practice.grade_name,
      gradeId: activeSubject?.grade_id ?? practice.grade_id,
      totalUnits: activeSubject?.units_count,
      totalSkills: activeSubject?.skills_count,
    }),
    [
      activeSubject?.units,
      activeUnitKey,
      activeSubject?.subject_name,
      activeSubject?.subject_id,
      activeSubject?.grade_name,
      activeSubject?.grade_id,
      practice.grade_name,
      practice.grade_id,
      activeSubject?.units_count,
      activeSubject?.skills_count,
    ]
  );

  return (
    <PracticeSidebarLayout sidebarProps={sidebarProps}>
      <PracticeHero
        subtitle={heroSubtitle}
        subjects={practice.subjects}
        activeSubjectKey={activeSubjectKey}
        onSubjectChange={handleSubjectChange}
        unit={activeUnit}
        gainedMasteryPoints={
          activeUnit?.gained_mastery_points ?? practice.gained_mastery_points
        }
        totalMasteryPoints={
          activeUnit?.total_mastery_points ?? practice.total_mastery_points
        }
      />

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={handleRetry}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="min-h-[70vh] flex items-center justify-center text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading practice...
        </div>
      ) : (
        <UnitDetails
          unit={activeUnit}
          subjectName={activeSubject?.subject_name}
          nextTopic={nextTopic}
          masteryBuckets={masteryBuckets}
        />
      )}
    </PracticeSidebarLayout>
  );
};

export default StudentPractice;
