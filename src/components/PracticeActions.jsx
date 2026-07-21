import { Link } from "react-router-dom";
import quizNotAttempted from "@/assets/quiz-before.png";
import quizAttempted from "@/assets/quiz-after.png";
import unitTestNotAttempted from "@/assets/unittest-before.png";
import unitTestAttempted from "@/assets/unittest-after.png";

// Renders action cards for quiz and unit test (mastery handled in TopicsTable).
export const PracticeActions = ({ quiz, unitTest }) => {
  if (!quiz && !unitTest) {
    return null;
  }

  const quizId = quiz?.id ?? quiz?.quiz_id ?? quiz?.topic_id ?? quiz?.test_id;
  const unitTestId =
    unitTest?.unit_test_id ??
    unitTest?.id ??
    unitTest?.test_id ??
    unitTest?.quiz_id ??
    unitTest?.topic_id;

  return (
    <>
      {quiz && quizId && (
        <div className="udtl-card relative">
          <div className="quiz-img-box">
            <img
              src={quiz.attempted ? quizAttempted : quizNotAttempted}
              alt=""
            />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quiz
              </p>
              <h4 className="text-2xl mb-2 font-semibold text-slate-900">
                {quiz.title}
              </h4>
              <p className="text-sm text-slate-500">
                Practice what you&apos;ve learned and level up your skills!
                <br />
                {quiz.total_questions} question
                {quiz.total_questions === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Link
            to={`/student/challenge/quiz/${quizId}/starter${
              quiz.attempted ? "?attempted=true" : ""
            }`}
            className="mt-6 inline-flex items-center justify-center rounded-sm bg-[#A22038] px-4 w-[170px] py-3 text-md font-semibold text-white transition hover:bg-[#86142B] capitalize"
          >
            {quiz.attempted ? "View results" : "Start quiz"}
          </Link>
        </div>
      )}

      {unitTest && unitTestId && (
        <div className="udtl-card relative">
          <div className="quiz-img-box">
            <img
              src={
                unitTest.attempted ? unitTestAttempted : unitTestNotAttempted
              }
              alt=""
            />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Unit test
              </p>
              <h4 className="text-2xl mb-2 font-semibold text-slate-900">
                {unitTest.title || "Unit test"}
              </h4>
              <p className="text-sm text-slate-500">
                {unitTest.total_questions} question
                {unitTest.total_questions === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Link
            to={`/student/challenge/unit/${unitTestId}/starter${
              unitTest.attempted ? "?attempted=true" : ""
            }`}
            className="mt-6 inline-flex items-center justify-center rounded-sm bg-[#0F7B52] px-4 w-[170px] py-3 text-md font-semibold text-white transition hover:bg-[#0F7B52] capitalize"
          >
            {unitTest.attempted ? "View results" : "Start unit test"}
          </Link>
        </div>
      )}
    </>
  );
};

