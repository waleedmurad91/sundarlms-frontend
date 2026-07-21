const readCount = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return 0;
};

export const getPracticeCount = (topic) =>
  readCount(
    topic?.total_questions_practice,
    topic?.totalQuestionsPractice,
    topic?.practice_questions_count,
    topic?.practice_questions,
    topic?.practice_question_count,
    topic?.questions?.practice,
  );

export const getChallengeCount = (topic) =>
  readCount(
    topic?.total_questions_challenge,
    topic?.totalQuestionsChallenge,
    topic?.challenge_questions_count,
    topic?.challenge_questions,
    topic?.challenge_question_count,
    topic?.questions?.challenge,
  );

export const isPracticeOnlyTopic = (topic) => {
  const practice = getPracticeCount(topic);
  const challenge = getChallengeCount(topic);

  if (challenge > 0) return false;
  if (practice > 0) return true;

  if (
    topic?.has_challenge === false ||
    topic?.has_challenge_questions === false ||
    topic?.hasChallenge === false
  ) {
    return true;
  }

  return false;
};
