import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
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
import { formatDeadlineForInput } from "@/utils/FormatDeadlineDate";
import {
  addUnitTest,
  getUnitTestById,
  updateUnitTestById,
} from "@/api/unitTestApi";
import { getAllTopics } from "@/api/topicApi";

const DEFAULT_FORM = {
  school_class_id: "",
  subject_id: "",
  unit_id: "",
  total_questions: "",
  title: "",
  deadline: "",
  per_question_timer: "",
};

const resolveTopics = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  return [];
};

const resolveStringValue = (...candidates) => {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const value = String(candidate).trim();
    if (value) {
      return value;
    }
  }

  return "";
};

const UnitTestForm = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id: paramsId } = useParams();

  const unitTestId = state?.unitTestId || paramsId || null;
  const isEditMode = Boolean(unitTestId);

  const [formField, setFormField] = useState({ ...DEFAULT_FORM });
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ?? Fetch topics (always) + unit test data (if edit mode)
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setTopicsLoading(true);
      try {
        const [topicsRes, unitTestRes] = await Promise.all([
          getAllTopics(),
          isEditMode ? getUnitTestById(unitTestId) : Promise.resolve(null),
        ]);

        if (!isMounted) {
          return;
        }

        setTopics(resolveTopics(topicsRes));

        if (isEditMode && unitTestRes) {
          const unitTest = unitTestRes?.data ?? unitTestRes;

          if (unitTest) {
            setFormField({
              school_class_id: resolveStringValue(
                unitTest.grade?.id,
                unitTest.grade_id,
                unitTest.gradeId,
                unitTest.school_class_id,
                unitTest.schoolClassId
              ),
              subject_id: resolveStringValue(
                unitTest.unit?.subject?.id,
                unitTest.subject?.id,
                unitTest.subject_id,
                unitTest.subjectId
              ),
              unit_id: resolveStringValue(
                unitTest.unit?.id,
                unitTest.unit_id,
                unitTest.unitId
              ),
              total_questions: resolveStringValue(
                unitTest.total_questions,
                unitTest.totalQuestions,
                unitTest.questions_count,
                unitTest.questionsCount
              ),
              title: unitTest.title || "",
              deadline: formatDeadlineForInput(unitTest.deadline) || "",
              per_question_timer: resolveStringValue(
                unitTest.per_question_timer,
                unitTest.perQuestionTimer,
                unitTest.question_timer
              ),
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          toast.error("Failed to load data.");
        }
      } finally {
        if (isMounted) {
          setTopicsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [unitTestId, isEditMode]);

  // 🧮 Build dependent dropdowns
  const classOptions = useMemo(() => {
    const unique = new Map();
    topics.forEach((t) => {
      const grade = t.unit?.subject?.grade;
      if (grade && !unique.has(grade.id)) {
        unique.set(grade.id, { value: String(grade.id), label: grade.name });
      }
    });
    return Array.from(unique.values());
  }, [topics]);

  const subjectOptions = useMemo(() => {
    if (!formField.school_class_id) return [];
    const unique = new Map();
    topics.forEach((t) => {
      const subj = t.unit?.subject;
      if (subj?.grade_id == formField.school_class_id && !unique.has(subj.id)) {
        unique.set(subj.id, { value: String(subj.id), label: subj.subject });
      }
    });
    return Array.from(unique.values());
  }, [topics, formField.school_class_id]);

  const unitOptions = useMemo(() => {
    if (!formField.subject_id) return [];
    const unique = new Map();
    topics.forEach((t) => {
      const u = t.unit;
      if (u?.subject_id == formField.subject_id && !unique.has(u.id)) {
        unique.set(u.id, { value: String(u.id), label: u.unit_name });
      }
    });
    return Array.from(unique.values());
  }, [topics, formField.subject_id]);

  // 🧾 Handlers
  const handleChange = (name, value) => {
    setFormField((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "school_class_id" && {
        subject_id: "",
        unit_id: "",
      }),
      ...(name === "subject_id" && { unit_id: "" }),
    }));
  };

  // ✅ Submit (Add or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { school_class_id, subject_id, unit_id, total_questions, title } =
      formField;

    if (!school_class_id || !subject_id || !unit_id) {
      toast.error("Please select class, subject, and unit.");
      return;
    }

    if (!total_questions.trim()) {
      toast.error("Enter total questions.");
      return;
    }

    if (!title.trim()) {
      toast.error("Enter unit test title.");
      return;
    }

    const payload = {
      grade_id: Number(school_class_id),
      unit_id: Number(unit_id),
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
        await updateUnitTestById(unitTestId, payload);
        toast.success("Unit Test updated successfully.");
      } else {
        await addUnitTest(payload);
        toast.success("Unit Test created successfully.");
      }
      navigate("/admin/unit-test-lists");
    } catch (err) {
      setError("Failed to save unit test. Please try again.");
      toast.error(err.message || "Failed to save unit test.");
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
          <h1>{isEditMode ? "Edit Unit Test" : "Generate Unit Test"}</h1>
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
                disabled={
                  !formField.school_class_id ||
                  loading ||
                  topicsLoading ||
                  isEditMode
                }
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
                disabled={
                  !formField.subject_id ||
                  loading ||
                  topicsLoading ||
                  isEditMode
                }
                placeholder="Select unit"
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
                <Captions size={16} /> Unit Test Title<span>*</span>
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
                min={0}
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
                  {isEditMode ? "Update Unit Test" : "Create Unit Test"}
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

export default UnitTestForm;
