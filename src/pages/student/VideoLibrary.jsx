import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchLearningMaterials } from "@/api/videoLibraryApi";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { ChevronLeft, Video } from "lucide-react";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function getYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function formatLabel(label) {
  if (!label) return "Untitled";
  const withoutPrefix = label.replace(/^\d+_[a-f0-9]+_/i, "");
  return withoutPrefix
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]/g, " ")
    .trim();
}

// ✅ Resolves a clean, playable, absolute URL from a material object using
// the shared backend file URL builder (handles base path + normalization).
function resolveMaterialUrl(material) {
  if (!material) return "";
  const raw = material.url || material.path || "";
  if (typeof raw !== "string" || !raw) return "";
  return buildBackendFileUrl(raw).replace(/ /g, "%20");
}

const UNITS_PER_PAGE = 5;

/* ─────────────────────────────────────────────
   YouTube Player
───────────────────────────────────────────── */
function YouTubePlayer({ videoId, onClose }) {
  return (
    <div className="w-full bg-black rounded-lg overflow-hidden shadow-lg mb-4">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900">
        <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">
          Now Playing
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Close
        </button>
      </div>
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Native Video Player
───────────────────────────────────────────── */
function NativeVideoPlayer({ url, label, onClose }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setProgress(v.currentTime);
    setDuration(v.duration || 0);
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${sec}`;
  };

  const changeVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };

  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden shadow-lg mb-4">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900">
        <span className="text-xs text-gray-400 font-medium truncate max-w-xs">
          {formatLabel(label)}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1 ml-2 flex-shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Close
        </button>
      </div>

      {/* ✅ url is already a resolved string passed from the parent */}
      <video
        ref={videoRef}
        src={url}
        className="w-full max-h-80 bg-black"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onTimeUpdate}
        autoPlay
      />

      <div className="bg-gray-900 px-4 py-3 space-y-2">
        <div
          className="w-full h-1.5 bg-gray-700 rounded-full cursor-pointer group"
          onClick={seek}
        >
          <div
            className="h-full bg-[#A22038] rounded-full relative"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-full bg-[#A22038] flex items-center justify-center transition-colors"
            >
              {playing ? (
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              )}
            </button>
            <span className="text-xs text-gray-400 font-mono tabular-nums">
              {fmt(progress)} / {fmt(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {muted || volume === 0 ? (
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3.63 3.63a1 1 0 000 1.41L7.29 8.7 7 9H4a1 1 0 00-1 1v4a1 1 0 001 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91a1 1 0 00.68 1.87 8.82 8.82 0 002.58-1.59l1.42 1.42a1 1 0 001.41-1.41L5.05 3.63a1 1 0 00-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4a1 1 0 00-.67 1.88A7.003 7.003 0 0119 12zm-7-8l-1.88 1.88L12 7.76V4a1 1 0 00-1.71-.71L7.44 6.15 9 7.71V4.41l2 2V4z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={changeVolume}
              className="w-20 accent-red-600 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   VideoThumbnail
───────────────────────────────────────────── */
function VideoThumbnail({ material }) {
  const ytId = getYouTubeId(material.url);
  const videoRef = useRef(null);

  const handleVideoLoad = () => {
    if (videoRef.current) videoRef.current.currentTime = 1;
  };

  if (ytId) {
    return (
      <img
        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
        alt={formatLabel(material.label)}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    );
  }

  // ✅ resolveMaterialUrl now builds a full backend URL via buildBackendFileUrl
  return (
    <video
      ref={videoRef}
      src={resolveMaterialUrl(material)}
      className="w-full h-full object-contain"
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={handleVideoLoad}
    />
  );
}

//video Card
function VideoCard({ material, onPlay }) {
  return (
    <button
      onClick={() => onPlay(material)}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-[#A22038] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 group text-left w-full flex flex-col"
    >
      <div className="h-34 relative overflow-hidden bg-gray-900">
        <VideoThumbnail material={material} />
        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#A22038] group-hover:scale-110 transition-transform flex items-center justify-center shadow-lg">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="p-2 flex-1">
        <p className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">
          {formatLabel(material.label)}
        </p>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   VideosSection
───────────────────────────────────────────── */
function VideosSection({ title, icon, videos, onPlay }) {
  if (!videos || videos.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-gray-100">
        {icon}
        <span className="text-sm font-medium uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {videos.map((material, idx) => (
          <VideoCard key={idx} material={material} onPlay={onPlay} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Pagination
───────────────────────────────────────────── */
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 1;
  const left = currentPage - delta;
  const right = currentPage + delta;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i <= right)) pages.push(i);
  }

  const withEllipsis = [];
  let prev = null;
  for (const page of pages) {
    if (prev && page - prev > 1) withEllipsis.push("...");
    withEllipsis.push(page);
    prev = page;
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-4 pb-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-[#A22038] hover:text-[#A22038] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {withEllipsis.map((item, idx) =>
        item === "..." ? (
          <span
            key={`e-${idx}`}
            className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors border ${
              item === currentPage
                ? "bg-[#A22038] text-white border-[#A22038]"
                : "border-gray-200 text-gray-600 hover:border-[#A22038] hover:text-[#A22038]"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-[#A22038] hover:text-[#A22038] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FilterSelect
───────────────────────────────────────────── */
function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-sm bg-gray-50 border border-gray-200 rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:border-[#A22038] text-gray-700 cursor-pointer max-w-[160px]"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main VideoLibrary Component
───────────────────────────────────────────── */
export default function VideoLibrary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [unitId, setUnitId] = useState("");
  const [topicId, setTopicId] = useState("");
  // ✅ subjectId / gradeId still drive the backend query (via URL params),
  // but are no longer exposed as user-editable filters in the UI.
  const [subjectId, setSubjectId] = useState(
    () => searchParams.get("subject_id") || "",
  );
  const [gradeId, setGradeId] = useState(
    () => searchParams.get("grade_id") || "",
  );

  const [data, setData] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    unit: [],
    topic: [],
    subject: [],
    grade: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const playerRef = useRef(null);
  const topRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: units, filters } = await fetchLearningMaterials({
        unitId,
        topicId,
        subjectId,
        gradeId,
        search,
      });
      setData(units);
      setFilterOptions(filters);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [unitId, topicId, subjectId, gradeId, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, unitId, topicId, subjectId, gradeId]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    if (activeVideo && playerRef.current)
      playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeVideo]);

  const filteredData = data
    .map((unit) => ({
      ...unit,
      videos: unit.videos || [],
      topics: (unit.topics || []).map((topic) => ({
        ...topic,
        videos: topic.videos || [],
      })),
    }))
    .filter(
      (unit) =>
        unit.videos.length > 0 || unit.topics.some((t) => t.videos.length > 0),
    );

  const totalPages = Math.ceil(filteredData.length / UNITS_PER_PAGE);
  const pagedData = filteredData.slice(
    (currentPage - 1) * UNITS_PER_PAGE,
    currentPage * UNITS_PER_PAGE,
  );
  const totalVideos = filteredData.reduce(
    (acc, unit) =>
      acc +
      unit.videos.length +
      unit.topics.reduce((a, t) => a + t.videos.length, 0),
    0,
  );
  const hasResults = filteredData.length > 0;

  const handlePageChange = (page) => {
    setCurrentPage(page);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ✅ Clear all only resets the user-visible filters (search, unit, topic).
  // subjectId / gradeId stay applied since they're hidden, backend-only filters.
  const clearFilters = () => {
    setSearch("");
    setUnitId("");
    setTopicId("");
  };

  // ✅ Only the visible filters count toward showing the "Clear all" control.
  const hasActiveFilters = search || unitId || topicId;

  const unitIcon = (
    <div className="bg-[#A22038] w-4 h-4 flex justify-center items-center rounded">
    <Video color="white" size={10} strokeWidth={3} />
    </div>
  );
  const topicIcon = (
    <svg
      className="w-3.5 h-3.5 text-[#A22038] flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-4" ref={topRef}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-[#A22038] hover:text-[#A22038] transition-colors flex-shrink-0"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="w-10 h-10 rounded-md bg-[#A22038] flex items-center justify-center flex-shrink-0">
                <Video color="white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
                  Video Library
                </h1>
                {!loading && (
                  <p className="text-xs text-gray-500">
                    {totalPages > 1 && (
                      <span className="text-gray-400">
                        {" "}
                        · Page {currentPage} of {totalPages}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FilterSelect
                value={unitId}
                onChange={setUnitId}
                options={filterOptions.unit || []}
                placeholder="All units"
              />
              <FilterSelect
                value={topicId}
                onChange={setTopicId}
                options={filterOptions.topic || []}
                placeholder="All topics"
              />
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search videos…"
                  className="pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-[#A22038] w-48 text-gray-800 placeholder-gray-400"
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[#A22038] hover:underline font-medium flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className=" mx-auto py-6 space-y-6">
        {/* Inline Player */}
        {activeVideo && (
          <div ref={playerRef}>
            {getYouTubeId(activeVideo.material.url) ? (
              <YouTubePlayer
                videoId={getYouTubeId(activeVideo.material.url)}
                onClose={() => setActiveVideo(null)}
              />
            ) : (
              <NativeVideoPlayer
                url={resolveMaterialUrl(activeVideo.material)} // ✅ built via buildBackendFileUrl
                label={activeVideo.material.label}
                onClose={() => setActiveVideo(null)}
              />
            )}
            <div className="flex items-center gap-2 mb-4 -mt-2">
              <span className="w-2 h-2 rounded-full bg-[#A22038] animate-pulse" />
              <span className="text-xs text-gray-500">
                Now playing:{" "}
                <span className="text-gray-800 font-medium">
                  {formatLabel(activeVideo.material.label)}
                </span>
                {activeVideo.contextLabel && (
                  <span className="text-gray-400">
                    {" "}
                    · {activeVideo.contextLabel}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div
                      key={j}
                      className="bg-white rounded-lg overflow-hidden border border-gray-100"
                    >
                      <div className="h-20 bg-gray-200 animate-pulse" />
                      <div className="p-2 space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-[#A22038]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 text-sm text-[#A22038] hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && !hasResults && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              No videos match your filters.
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-[#A22038] hover:underline font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Units list */}
        {!loading &&
          !error &&
          pagedData.map((unit) => {
            const topicsWithVideos = unit.topics.filter(
              (t) => t.videos.length > 0,
            );
            if (!unit.videos.length && !topicsWithVideos.length) return null;

            return (
              <div key={unit.unit_id} className="space-y-5">
                <div className="flex items-center gap-2">
                  {unit.subject?.subject && (
                    <span className="text-[16px] font-semibold tracking-widest uppercase text-[#A22038] bg-red-50 px-2 py-0.5 rounded">
                      {unit.subject.subject}
                    </span>
                  )}
                </div>

                <VideosSection
                  title={`Unit: ${unit.unit_name}`}
                  icon={unitIcon}
                  videos={unit.videos}
                  onPlay={(m) =>
                    setActiveVideo({
                      material: m,
                      contextLabel: unit.unit_name,
                    })
                  }
                />

                {topicsWithVideos.map((topic) => (
                  <VideosSection
                    key={topic.topic_id}
                    title={`Topic: ${topic.topic_name}`}
                    icon={topicIcon}
                    videos={topic.videos}
                    onPlay={(m) =>
                      setActiveVideo({
                        material: m,
                        contextLabel: topic.topic_name,
                      })
                    }
                  />
                ))}
              </div>
            );
          })}

        {!loading && !error && hasResults && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
