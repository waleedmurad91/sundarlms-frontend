import React from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import {
  addAssignment,
  updateAssignmentById,
  getAssignmentById,
} from "@/api/masteryAssignmentApi"; // ✅ adjust path
import { getAssignmentData } from "@/api/masteryAssignmentApi";
import { useAuthStore } from "@/store/auth";
import { useLocation, useNavigate } from "react-router-dom";

const AssignmentForm = ({ assignmentType }) => {
  const { user } = useAuthStore();
  const teacherId = user?.id;
  const navigate = useNavigate();
  const location = useLocation();

  const { assignmentId, assignment, type } = location.state || {};
  const assignment_type = assignmentType || "assignment";

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [assignmentData, setAssignmentData] = React.useState(null);
  const [isEditMode, setIsEditMode] = React.useState(Boolean(assignmentId));

  const [selectedUnit, setSelectedUnit] = React.useState(null);
  const [selectedTopics, setSelectedTopics] = React.useState([]);
  const [topicsLoading, setTopicsLoading] = React.useState(false);

  const [form, setForm] = React.useState({
    title: "",
    instructions: "",
    status: "draft",
    deadline: "",
  });

  // 🧠 Fetch Teacher Assignment Data (Units + Topics)
  React.useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        const res = await getAssignmentData(teacherId);
        if (res?.status && res?.data) {
          setAssignmentData(res.data);
        } else {
          setError("Failed to load teacher assignment data.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to fetch assignment data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (teacherId) fetchTeacherData();
  }, [teacherId]);

  // 🧩 Fetch assignment for editing
  React.useEffect(() => {
    const fetchAssignment = async () => {
      if (!assignmentId) return;
      try {
        setLoading(true);
        const res = await getAssignmentById(assignmentId);
        const data = res?.data;
        if (data) {
          setIsEditMode(true);
          const selectedUnitId = data.units?.[0]?.id ?? null;
          const selectedTopicIds = data.topics?.map((t) => t.id) ?? [];

          setSelectedUnit(selectedUnitId);
          setSelectedTopics(selectedTopicIds);

          setForm({
            title: data.title || "",
            instructions: data.instructions || "",
            status: data.status || "draft",
            deadline: data.due_date
              ? (() => {
                  // API gives "2025-11-12" or "2025-11-12T15:20:00Z"
                  const iso = data.due_date.includes("T")
                    ? data.due_date
                    : `${data.due_date}T00:00`;
                  return iso.slice(0, 16);
                })()
              : "",
          });
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load assignment for editing.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId]);

  const units = assignmentData?.units ?? [];
  const topics =
    selectedUnit && units.find((u) => u.id === selectedUnit)?.topics
      ? units.find((u) => u.id === selectedUnit).topics
      : [];

  // 🔹 Select Unit
  const handleUnitSelect = (unitId) => {
    setSelectedUnit(unitId);
    setSelectedTopics([]);
    setTopicsLoading(true);
    setTimeout(() => setTopicsLoading(false), 1000);
  };

  // 🔹 Select Topic
  const handleTopicToggle = (topicId) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  // 🔹 Change Inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Submit Form (Add / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUnit) {
      toast.error("Please select a unit.");
      return;
    }
    if (selectedTopics.length === 0) {
      toast.error("Please select at least one topic.");
      return;
    }
    if (!form.title || !form.instructions || !form.deadline) {
      toast.error("Please fill all required fields.");
      return;
    }

    const payload = {
      unit_ids: [selectedUnit],
      topic_ids: selectedTopics,
      title: form.title,
      instructions: form.instructions,
      status: form.status,
      due_date: form.deadline,
      assignment_type, // ✅ assignment or mastery
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateAssignmentById(assignmentId, payload);
        toast.success(
          `${
            assignment_type === "mastery" ? "Mastery Goal" : "Assignment"
          } updated successfully!`
        );
        assignment_type === "mastery"
          ? navigate("/teacher/mastery-assignments-list")
          : navigate("/teacher/manage-assignment");
      } else {
        await addAssignment(payload, teacherId);
        toast.success(
          `${
            assignment_type === "mastery" ? "Mastery Goal" : "Assignment"
          } created successfully!`
        );
        navigate(
          assignment_type === "mastery"
            ? "/teacher/mastery-assignments-list"
            : "/teacher/manage-assignment"
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save assignment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Alert variant="destructive" className="alert-custom mb-4 bg-[#FDF7EC]">
          <AlertCircleIcon size={18} />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Teacher Portal</h4>
          <h1>
            {isEditMode
              ? `Edit ${
                  assignment_type === "mastery" ? "Mastery Goal" : "Assignment"
                }`
              : `Assign ${
                  assignment_type === "mastery" ? "Mastery Goal" : "Assignment"
                }`}
          </h1>
          <p className="text-slate-600 text-md">
            {assignment_type === "mastery"
              ? "Motivate students to master topics through structured mastery goals."
              : "Create assignments for students to work on and submit online."}
          </p>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mastery-wizard">
              {/* --- Step Headers --- */}
              <div className="step-header-wrap">
                <div className="step-header">
                  <div className="step-icon">1</div>
                  <div className="step-title">Select Unit</div>
                </div>
                <div className="step-header">
                  <div className="step-icon">2</div>
                  <div className="step-title">Select Topics</div>
                </div>
                <div className="step-header">
                  <div className="step-icon">3</div>
                  <div className="step-title">
                    Title / Instructions / Due Date
                  </div>
                </div>
              </div>

              {/* --- Step Body --- */}
              <div className="step-body-wrap">
                {/* UNITS */}
                <div className="step-body">
                  {units.length === 0 ? (
                    <p className="text-gray-500">No units available.</p>
                  ) : (
                    <ul>
                      {units.map((unit) => (
                        <li key={unit.id}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="unit"
                              value={unit.id}
                              checked={selectedUnit === unit.id}
                              onChange={() => handleUnitSelect(unit.id)}
                            />
                            <span>{unit.unit_name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* TOPICS */}
                <div className="step-body border-lr">
                  {topicsLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                    </div>
                  ) : !selectedUnit ? (
                    <p className="text-gray-500">Please select a unit first.</p>
                  ) : topics.length === 0 ? (
                    <p className="text-gray-500">
                      No topics found for this unit.
                    </p>
                  ) : (
                    <ul>
                      {topics.map((topic) => (
                        <li key={topic.id}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              name="topics"
                              value={topic.id}
                              checked={selectedTopics.includes(topic.id)}
                              onChange={() => handleTopicToggle(topic.id)}
                            />
                            <span>{topic.topic_name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ASSIGNMENT DETAILS */}
                <div className="step-body">
                  <div className="form-group">
                    <label>Title*</label>
                    <input
                      type="text"
                      className="form-input"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Instructions*</label>
                    <textarea
                      className="form-input"
                      name="instructions"
                      rows="4"
                      value={form.instructions}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status*</label>
                    <select
                      name="status"
                      className="form-input"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Due Date*</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      name="deadline"
                      value={form.deadline}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className="step-footer-wrap">
                This {assignment_type === "mastery" ? "goal" : "assignment"}{" "}
                will be assigned to all students in&nbsp;{" "}
                <b>
                  {assignmentData?.grade?.name || "N/A"}{" "}
                  {assignmentData?.subject?.subject || ""}
                </b>
                .
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="global-btn flex items-center justify-center gap-1 mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      Please wait{" "}
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      {isEditMode
                        ? `Update ${
                            assignment_type === "mastery"
                              ? "Goal"
                              : "Assignment"
                          }`
                        : `Create ${
                            assignment_type === "mastery"
                              ? "Goal"
                              : "Assignment"
                          }`}{" "}
                      <Save size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default AssignmentForm;
