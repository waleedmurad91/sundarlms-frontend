import axiosInstance from "@/api/axiosInstance";

/**
 * Fetch learning materials with optional filters.
 * Always requests type=video so the backend pre-filters.
 */
export async function fetchLearningMaterials({
    unitId,
    topicId,
    subjectId,
    gradeId,
    search,
} = {}) {
    const params = { type: "video" };
    if (unitId) params.unit_id = unitId;
    if (topicId) params.topic_id = topicId;
    if (subjectId) params.subject_id = subjectId;
    if (gradeId) params.grade_id = gradeId;
    if (search) params.search = search;

    const res = await axiosInstance.get("/learning-materials", { params });

    if (!res.data.success) throw new Error("Failed to load materials.");

    return {
        data: res.data.data || [],
        filters: res.data.filters?.options || {},
    };
}

/**
 * Returns true if any video exists for the given subjectId and/or gradeId.
 */
export async function hasVideosForGradeAndSubject({ subjectId, gradeId } = {}) {
    try {
        const { data } = await fetchLearningMaterials({ subjectId, gradeId });
        return data.some((unit) => {
            const hasUnitVideos = (unit.videos || []).length > 0;
            const hasTopicVideos = (unit.topics || []).some(
                (t) => (t.videos || []).length > 0,
            );
            return hasUnitVideos || hasTopicVideos;
        });
    } catch {
        return false;
    }
}