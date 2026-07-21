import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ilmFeedbackSurvey } from "@/api/studentDashboardApi";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

const questions = [
  {
    id: "q1",
    section: "Part 1: Multiple Choice Questions (User Experience)",
    type: "multiple_choice",
    question:
      "How would you rate the overall user-friendliness of the ILM Portal?",
    options: [
      "Very Easy to use",
      "Easy",
      "Neutral",
      "Difficult",
      "Very Difficult",
    ],
    payloadKey: "overall_user_friendliness",
  },
  {
    id: "q2",
    section: "Part 1: Multiple Choice Questions (User Experience)",
    type: "multiple_choice",
    question:
      "How frequently do you face technical issues (lags, login errors, or page loading) while using the Question Bank?",
    options: ["Never", "Rarely", "Sometimes", "Frequently", "Constantly"],
    payloadKey: "technical_issue_frequency",
  },
  {
    id: "q3",
    section: "Part 1: Multiple Choice Questions (User Experience)",
    type: "multiple_choice",
    question:
      "How easy is it to find the specific topics or questions you want to practice?",
    options: [
      "Very Easy",
      "Somewhat Easy",
      "Somewhat Difficult",
      "Very Difficult",
    ],
    payloadKey: "topic_discovery_ease",
  },
  {
    id: "q4",
    section: "Part 1: Multiple Choice Questions (User Experience)",
    type: "multiple_choice",
    question:
      "How would you rate the clarity of the diagrams and math equations displayed on the screen?",
    options: [
      "Excellent (Very clear)",
      "Good",
      "Average (Some are blurry)",
      "Poor (Hard to read)",
    ],
    payloadKey: "diagram_equation_clarity",
  },
  {
    id: "q5",
    section: "Part 2: Short Answer Questions (Technical & Content)",
    type: "textbox",
    question:
      "Please describe any specific technical glitch you have encountered recently (e.g., Submit button not working, Images not loading).",
    payloadKey: "recent_technical_glitch",
  },
  {
    id: "q6",
    section: "Part 2: Short Answer Questions (Technical & Content)",
    type: "textbox",
    question:
      "Which feature of the ILM portal do you find most helpful for your studies?",
    payloadKey: "most_helpful_feature",
  },
  {
    id: "q7",
    section: "Part 2: Short Answer Questions (Technical & Content)",
    type: "textbox",
    question:
      "If you could add one new feature to the portal to make learning easier, what would it be?",
    payloadKey: "requested_new_feature",
  },
  {
    id: "q8",
    section: "Part 3: Difficulty, Scoring & Suggestions",
    type: "textbox",
    question:
      "In your opinion, is the difficulty level of the questions in the bank appropriate for your current grade/level?",
    payloadKey: "difficulty_level_feedback",
  },
  {
    id: "q9",
    section: "Part 3: Difficulty, Scoring & Suggestions",
    type: "textbox",
    question:
      "Are the solutions provided after the test clear enough to help you understand your mistakes?",
    payloadKey: "solution_clarity_feedback",
  },
  {
    id: "q10",
    section: "Part 3: Difficulty, Scoring & Suggestions",
    type: "textbox",
    question:
      "What motivates you most to complete a practice set? (Points, Leaderboards, Badges, or Personal Progress?)",
    payloadKey: "practice_motivation",
  },
  {
    id: "q11",
    section: "Part 3: Difficulty, Scoring & Suggestions",
    type: "textbox",
    question:
      "Any other suggestions or comments to help us improve the ILM platform for you?",
    payloadKey: "other_suggestions",
  },
];

const sections = [
  {
    title: "Part 1: Multiple Choice Questions (User Experience)",
    questions: ["q1", "q2", "q3", "q4"],
  },
  {
    title: "Part 2: Short Answer Questions (Technical & Content)",
    questions: ["q5", "q6", "q7"],
  },
  {
    title: "Part 3: Difficulty, Scoring & Suggestions",
    questions: ["q8", "q9", "q10", "q11"],
  },
];

const FeedbackSurveyModal = ({ open, onClose }) => {
  const { checkAuth } = useAuthStore();
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors((prev) => ({ ...prev, [questionId]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    questions.forEach((q) => {
      if (!answers[q.id] || answers[q.id].trim() === "") {
        newErrors[q.id] = "This field is required";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const payload = {};
    questions.forEach((q) => {
      if (q.payloadKey) {
        payload[q.payloadKey] = answers[q.id];
      }
    });

    try {
      await ilmFeedbackSurvey(payload);
      await checkAuth({ silent: true });
      toast.success("Feedback submitted successfully!");
      onClose();
      setAnswers({});
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>ILM Portal User Feedback Survey</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve the learning experience for everyone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  {section.title}
                </h3>
                <div className="space-y-6">
                  {questions
                    .filter((q) => section.questions.includes(q.id))
                    .map((q) => (
                      <div key={q.id} className="space-y-3">
                        <Label className="text-sm font-bold items-baseline ">
                          <span className="uppercase">{q.id}: </span>
                          {q.question}
                        </Label>
                        {q.type === "multiple_choice" ? (
                          <RadioGroup
                            value={answers[q.id] || ""}
                            onValueChange={(value) =>
                              handleAnswerChange(q.id, value)
                            }
                          >
                            {q.options.map((option) => (
                              <div
                                key={option}
                                className="flex items-center space-x-2"
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`${q.id}-${option}`}
                                />
                                <Label
                                  htmlFor={`${q.id}-${option}`}
                                  className="text-sm font-normal"
                                >
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        ) : (
                          <textarea
                            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={answers[q.id] || ""}
                            onChange={(e) =>
                              handleAnswerChange(q.id, e.target.value)
                            }
                            placeholder="Type your answer here..."
                            rows={3}
                          />
                        )}
                        {errors[q.id] && (
                          <p className="text-xs text-red-500">{errors[q.id]}</p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackSurveyModal;
