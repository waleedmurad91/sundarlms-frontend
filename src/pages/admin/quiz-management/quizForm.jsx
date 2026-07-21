import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  ALargeSmall,
  AlertCircleIcon,
  Book,
  BookA,
  CalendarClock,
  Captions,
  CircleQuestionMark,
  Clock1,
  Loader2,
  Plus,
  SquareStack,
  X,
} from "lucide-react";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { getAllTopics } from "@/api/topicApi";
import { addQuiz, getQuizById, updateQuizById } from "@/api/quizApi";
import { formatDeadlineForInput } from "@/utils/FormatDeadlineDate";

const DEFAULT_FORM = {
  school_class_id: "",
  subject_id: "",
  unit_id: "",
  topic_ids: [],
  total_questions: "",
  title: "",
  deadline: "",
  per_question_timer: "",
};

const QuizForm = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id: paramsId } = useParams();

  const quizId = state?.quizId || paramsId || null;
  const isEditMode = Boolean(quizId);

  const [formField, setFormField] = useState({ ...DEFAULT_FORM });
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [error, setError] = useState("");

  // 🧩 Fetch topics (always) + quiz data (if edit mode)
  useEffect(() => {
    const fetchData = async () => {
      setTopicsLoading(true);
      try {
        const topicRes = await getAllTopics();
        const topicPayload = topicRes?.data ?? topicRes;
        const topicList = Array.isArray(topicPayload?.data)
          ? topicPayload.data
          : Array.isArray(topicPayload)
          ? topicPayload
          : [];
        setTopics(topicList);

        if (isEditMode) {
          const quizRes = await getQuizById(quizId);
          const quiz = quizRes?.data;
          console.log("Quiz Data:", quiz);

          if (quiz) {
            setFormField({
              school_class_id: String(quiz.grade?.id || ""),
              subject_id: String(quiz.unit?.subject?.id || ""),
              unit_id: String(quiz.unit?.id || ""),
              topic_ids: quiz.topics?.map((t) => String(t.id)) || [],
              total_questions:
                quiz.topics
                  ?.reduce((sum, t) => sum + (t.questions?.length || 0), 0)
                  .toString() || "",
              title: quiz.title || "",
              deadline: formatDeadlineForInput(quiz.deadline) || "",
              per_question_timer: quiz.per_question_timer || "",
            });
          }
        }
      } catch (err) {
        toast.error("Failed to load data.");
      } finally {
        setTopicsLoading(false);
      }
    };
    fetchData();
  }, [quizId, isEditMode]);

  // 🧮 Build dependent dropdowns
  const safeTopics = Array.isArray(topics) ? topics : [];

  const classOptions = useMemo(() => {
    const unique = new Map();
    safeTopics.forEach((t) => {
      const grade = t.unit?.subject?.grade;
      if (grade && !unique.has(grade.id)) {
        unique.set(grade.id, { value: String(grade.id), label: grade.name });
      }
    });
    return Array.from(unique.values());
  }, [safeTopics]);

  const subjectOptions = useMemo(() => {
    if (!formField.school_class_id) return [];
    const unique = new Map();
    safeTopics.forEach((t) => {
      const subj = t.unit?.subject;
      if (subj?.grade_id == formField.school_class_id && !unique.has(subj.id)) {
        unique.set(subj.id, { value: String(subj.id), label: subj.subject });
      }
    });
    return Array.from(unique.values());
  }, [safeTopics, formField.school_class_id]);

  const unitOptions = useMemo(() => {
    if (!formField.subject_id) return [];
    const unique = new Map();
    safeTopics.forEach((t) => {
      const u = t.unit;
      if (u?.subject_id == formField.subject_id && !unique.has(u.id)) {
        unique.set(u.id, { value: String(u.id), label: u.unit_name });
      }
    });
    return Array.from(unique.values());
  }, [safeTopics, formField.subject_id]);

  const topicOptions = useMemo(() => {
    if (!formField.unit_id) return [];
    return safeTopics
      .filter((t) => t.unit?.id == formField.unit_id)
      .map((t) => ({ value: String(t.id), label: t.topic_name }));
  }, [safeTopics, formField.unit_id]);

  // 🧾 Handlers
  const handleChange = (name, value) => {
    setFormField((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "school_class_id" && {
        subject_id: "",
        unit_id: "",
        topic_ids: [],
      }),
      ...(name === "subject_id" && { unit_id: "", topic_ids: [] }),
      ...(name === "unit_id" && { topic_ids: [] }),
    }));
  };

  // ✅ Submit (Add or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const {
      school_class_id,
      subject_id,
      unit_id,
      topic_ids,
      total_questions,
      title,
    } = formField;

    if (!school_class_id || !subject_id || !unit_id) {
      toast.error("Please select class, subject, and unit.");
      return;
    }

    if (!topic_ids.length) {
      toast.error("Please select at least one topic.");
      return;
    }

    if (!total_questions.trim()) {
      toast.error("Enter total questions.");
      return;
    }

    if (!title.trim()) {
      toast.error("Enter quiz title.");
      return;
    }

    const payload = {
      grade_id: Number(school_class_id),
      unit_id: Number(unit_id),
      topic_ids: topic_ids.map(Number),
      total_questions: Number(total_questions),
      title: title.trim(),
      deadline: formField.deadline || null,
      per_question_timer: formField.per_question_timer
        ? Number(formField.per_question_timer)
        : null,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateQuizById(quizId, payload);
        toast.success("Quiz updated successfully.");
      } else {
        await addQuiz(payload);
        toast.success("Quiz created successfully.");
      }
      navigate("/admin/quiz-lists");
    } catch (err) {
      setError("Failed to save quiz. Please try again.");
      toast.error(err?.message || "Failed to save quiz.");
    } finally {
      setLoading(false);
    }
  };

  // 🧩 UI
  return (
    <div>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{isEditMode ? "Edit Quiz" : "Generate Quiz"}</h1>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert
              variant="destructive"
              className="alert-custom mb-4 bg-[#FDF7EC]"
            >
              <AlertCircleIcon size={18} />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}
          <div className="form-admin">
            <div className="form-group w-half">
              <label>
                <Book size={16} />
                Class <span>*</span>
              </label>
              <SearchableMultiSelect
                options={classOptions}
                multiple={false}
                value={formField.school_class_id}
                onChange={(val) => handleChange("school_class_id", val)}
                disabled={loading || topicsLoading || isEditMode}
                placeholder={
                  topicsLoading ? "Loading classes..." : "Select class"
                }
              />
            </div>

            <div className="form-group w-half">
              <label>
                <BookA size={16} />
                Subject <span>*</span>
              </label>
              <SearchableMultiSelect
                options={subjectOptions}
                multiple={false}
                value={formField.subject_id}
                onChange={(val) => handleChange("subject_id", val)}
                disabled={!formField.school_class_id || loading || isEditMode}
                placeholder="Select subject"
              />
            </div>

            <div className="form-group w-half">
              <label>
                <SquareStack size={16} />
                Unit <span>*</span>
              </label>
              <SearchableMultiSelect
                options={unitOptions}
                multiple={false}
                value={formField.unit_id}
                onChange={(val) => handleChange("unit_id", val)}
                disabled={!formField.subject_id || loading || isEditMode}
                placeholder="Select unit"
              />
            </div>

            <div className="form-group w-half">
              <label>
                <ALargeSmall size={16} />
                Topics <span>*</span>
              </label>
              <SearchableMultiSelect
                options={topicOptions}
                multiple
                selectedValues={formField.topic_ids}
                onChange={(val) => handleChange("topic_ids", val)}
                disabled={!formField.unit_id || loading}
                placeholder="Select topics"
              />
            </div>

            <div className="form-group w-half">
              <label>
                <CircleQuestionMark size={16} /> Total Questions<span>*</span>
              </label>
              <input
                type="number"
                className="form-input"
                name="total_questions"
                value={formField.total_questions}
                onChange={(e) =>
                  handleChange("total_questions", e.target.value)
                }
                disabled={loading}
              />
            </div>

            <div className="form-group w-half">
              <label>
                <Captions size={16} /> Quiz Title<span>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                name="title"
                value={formField.title}
                onChange={(e) => handleChange("title", e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group w-half">
              <label>
                <CalendarClock size={16} /> Deadline
              </label>
              <input
                type="datetime-local"
                className="form-input"
                name="deadline"
                value={formField.deadline}
                onChange={(e) => handleChange("deadline", e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group w-half">
              <label>
                <Clock1 size={16} />
                Per Question Timer (seconds)
              </label>
              <input
                type="number"
                className="form-input no-spinner"
                name="per_question_timer"
                value={formField.per_question_timer}
                onChange={(e) =>
                  handleChange("per_question_timer", e.target.value)
                }
                disabled={loading}
              />
            </div>
          </div>
          <div className="form-button-row">
            <button
              type="button"
              className="global-btn secondary flex items-center justify-center gap-1"
              onClick={() => navigate(-1)}
            >
              <>
                <X size={18} />
                Cancel
              </>
            </button>
            <button
              type="submit"
              className="global-btn flex items-center justify-center gap-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  {isEditMode ? "Updating" : "Generating"}
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  {isEditMode ? "Update Quiz" : "Generate Quiz"}
                  <Plus size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuizForm;
