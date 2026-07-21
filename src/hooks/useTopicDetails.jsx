import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getQuestionPlayerData } from "@/api/questionPlayerApi";

const resolveSelectedTopic = (entry, topicKey) => {
  if (!entry || !topicKey) return null;

  const fromSelected =
    entry.selected_topic && String(entry.selected_topic.topic_id) === topicKey
      ? entry.selected_topic
      : null;

  if (fromSelected?.questions?.length) return fromSelected;

  const fromList = entry.topics?.find((t) => String(t.topic_id) === topicKey);
  if (fromList?.questions?.length) return fromList;

  return fromSelected || fromList || null;
};

const buildCacheKey = (id, language) => `${id}::${language || "en"}`;

export default function useTopicDetails(
  topicId,
  { language = "en", fetcher = getQuestionPlayerData } = {},
) {
  const cacheRef = useRef({});
  const [cacheVersion, setCacheVersion] = useState(0);
  const [loadingTopicId, setLoadingTopicId] = useState(null);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const activeKey = topicId != null && topicId !== "" ? String(topicId) : "";
  const activeCacheKey = activeKey ? buildCacheKey(activeKey, language) : "";

  const data = activeCacheKey
    ? (cacheRef.current[activeCacheKey] ?? null)
    : null;

  const bumpCache = () => setCacheVersion((v) => v + 1);

  const load = useCallback(
    async (id, lang) => {
      const key = String(id);
      const cacheKey = buildCacheKey(key, lang);
      const requestId = ++requestRef.current;

      setLoadingTopicId(cacheKey);
      setError("");

      try {
        const res = await fetcher(id, lang);
        if (requestId !== requestRef.current) return;

        const payload = res?.data ?? res ?? null;
        const existing = cacheRef.current[cacheKey];
        const nextTopic = resolveSelectedTopic(payload, key);
        const existingTopic = resolveSelectedTopic(existing, key);

        if (nextTopic?.questions?.length || !existingTopic?.questions?.length) {
          cacheRef.current[cacheKey] = payload;
        } else if (existing) {
          cacheRef.current[cacheKey] = {
            ...payload,
            selected_topic: existing.selected_topic,
          };
        } else {
          cacheRef.current[cacheKey] = payload;
        }
        bumpCache();
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setError(err.message || "Error");
      } finally {
        if (requestId === requestRef.current) {
          setLoadingTopicId(null);
        }
      }
    },
    [fetcher],
  );

  useEffect(() => {
    if (!topicId) return;
    load(topicId, language);
  }, [topicId, language, load]);

  const selectedTopic = useMemo(() => {
    if (!activeKey) return null;
    return resolveSelectedTopic(data, activeKey);
    // cacheVersion ensures recomputation when cache updates
  }, [activeKey, data, cacheVersion]);

  const practiceAttempt = data?.practice_attempt;

  const topics = useMemo(() => {
    if (data?.topics?.length) return data.topics;

    const cachedEntries = Object.values(cacheRef.current);
    const withTopics = cachedEntries.find((entry) => entry?.topics?.length);
    return withTopics?.topics ?? [];
  }, [data, cacheVersion]);

  const orderedQuestions = useMemo(() => {
    if (!selectedTopic?.questions) return [];
    const ids = practiceAttempt?.selected_question_ids;
    if (Array.isArray(ids) && ids.length) {
      const map = new Map(
        selectedTopic.questions.map((q) => [q.question_id, q]),
      );
      return ids.map((id) => map.get(id)).filter(Boolean);
    }
    return selectedTopic.questions;
  }, [practiceAttempt?.selected_question_ids, selectedTopic?.questions]);

  const selectedTopicWithOrdering = useMemo(() => {
    if (!selectedTopic) return null;
    if (!orderedQuestions.length) return selectedTopic;
    return { ...selectedTopic, questions: orderedQuestions };
  }, [orderedQuestions, selectedTopic]);

  const isFetching = loadingTopicId === activeCacheKey;
  const hasDisplayableTopic = Boolean(
    selectedTopicWithOrdering?.questions?.length,
  );
  const loading = isFetching && !hasDisplayableTopic;

  return {
    data,
    topics,
    selectedTopic: selectedTopicWithOrdering,
    selectedTopicId: activeKey || null,
    setSelectedTopicId: () => {},
    loading,
    isFetching,
    error,
    refetch: () => (topicId ? load(topicId, language) : Promise.resolve()),
    practiceAttempt,
  };
}
