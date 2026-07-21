const getFeedback = (percentage) => {
  if (percentage >= 80) {
    return "Awesome! You aced this one.";
  }
  if (percentage >= 60) {
    return "Good job! A bit more practice to level up.";
  }
  if (percentage >= 40) {
    return "Not bad. Keep practicing.";
  }
  return "Keep at it. Practice will make this easier.";
};

const formatDueDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const QuizSummary = ({ result, type = "quiz" }) => {
  if (!result) return null;

  const answersArray = Array.isArray(result.answers) ? result.answers : [];
  const derivedCorrectFromAnswers = answersArray.filter(
    (entry) => entry?.is_correct === true
  ).length;

  const total =
    result.total_questions ?? result.total_marks ?? answersArray.length ?? 0;
  const correct =
    result.correct ?? result.correct_answers ?? derivedCorrectFromAnswers ?? 0;
  const percentage = Math.round(
    result.percentage !== null && result.percentage !== undefined
      ? result.percentage
      : total
      ? (correct / total) * 100
      : 0
  );

  const isAssignment = type === "assignment";
  const showScoreCard = isAssignment;

  const heading = isAssignment
    ? "Assignment submitted"
    : getFeedback(percentage);

  return (
    <div className="space-y-6 h-full">
      <div className="bg-[#0A224A] text-center py-[4rem] px-[3rem] rounded-lg text-white final-blue-screen">
        <h3 className="text-[32px] font-semibold mb-3">{heading}</h3>

        {!showScoreCard && (
          <p className="text-[20px]">
            Correct: {correct} / {total} ({percentage}%)
          </p>
        )}

        {showScoreCard && (
          <>
            <p className="text-md">
              Score: {correct} / {total}
            </p>

            <p className="text-md">
              Submitted at:{" "}
              {formatDueDateTime(result.submitted_at) ||
                formatDueDateTime(result.completed_at) ||
                "-"}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default QuizSummary;
