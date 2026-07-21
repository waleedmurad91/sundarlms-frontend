import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Image as ImageIcon,
  Pause,
  Play,
} from "lucide-react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { programColors, stripHtml } from "@/data/newsData";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import contestIcon from "@/assets/contest-icon.png";
import resourceIcon from "@/assets/resource-icon.png";
import resultsIcon from "@/assets/results-icon.png";
import eventIcon from "@/assets/event-icon.png";
import { renderMediaEmbeds } from "@/utils/renderMediaEmbeds";
import updateIcon from "@/assets/updates-icon.png";

const newsTypeIcons = {
  contest: contestIcon,
  results: resultsIcon,
  update: updateIcon,
  resource: resourceIcon,
  event: eventIcon,
};

function Badge({
  label,
  badgeStyle = "filled",
  img = false,
  colorTag = false,
}) {
  if (!label) return null;
  const bg = programColors[label] || "#ebe6e7";
  return (
    <span
      className="px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-1 capitalize"
      style={
        badgeStyle === "filled"
          ? {
              backgroundColor: bg,
              color: colorTag ? "#fff" : "#4a5565",
            }
          : {
              border: `1.5px solid ${bg}`,
              color: bg,
              backgroundColor: "transparent",
            }
      }
    >
      {img ? <img src={newsTypeIcons[label]} /> : ""}
      {label}
    </span>
  );
}

export default function NewsPage() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const { slug } = useParams();
  const [news, setNews] = useState(null);
  const [moreNews, setMoreNews] = useState([]);
  const [activeThumb, setActiveThumb] = useState(0);
  const thumbRailRef = useRef(null);
  const [railScroll, setRailScroll] = useState({ up: false, down: false });
  const videoRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Track whether the thumbnail rail has hidden items above/below so the
  // up/down arrows only show when there is actually somewhere to scroll.
  const updateRailScroll = () => {
    const el = thumbRailRef.current;
    if (!el) return;
    setRailScroll({
      up: el.scrollTop > 4,
      down: el.scrollTop + el.clientHeight < el.scrollHeight - 4,
    });
  };

  useEffect(() => {
    updateRailScroll();
    window.addEventListener("resize", updateRailScroll);
    return () => window.removeEventListener("resize", updateRailScroll);
  }, [news]);

  // Keep the active thumbnail visible in the rail when navigating with the
  // main carousel arrows (or clicking a partially hidden thumb).
  useEffect(() => {
    thumbRailRef.current?.children[activeThumb]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
    setIsVideoPlaying(false);
  }, [activeThumb]);

  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  useEffect(() => {
    axios
      .get(`${apiUrl}/api/news-detail/${slug}`)
      .then((res) => {
        setNews(res.data.data.news);
        setActiveThumb(0);
      })
      .catch(console.error);
  }, [slug]);

  useEffect(() => {
    axios
      .get(`${apiUrl}/api/news`)
      .then((res) => {
        const all = res.data?.data?.data || [];
        setMoreNews(all.filter((n) => n.slug !== slug));
      })
      .catch(console.error);
  }, [slug]);

  if (!news) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div
          className="w-8 h-8 rounded-full border-4 animate-spin"
          style={{ borderColor: "#a51c30 transparent #a51c30 #a51c30" }}
        />
      </div>
    );
  }

  const getMediaUrls = (item) => {
    const raw =
      (Array.isArray(item?.media_urls) && item.media_urls.length > 0
        ? item.media_urls
        : item?.media) ?? [];
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  };

  const resolveMediaUrl = (url) => buildBackendFileUrl(url);

  const isImageUrl = (url) => {
    if (typeof url !== "string") return false;
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(url);
  };

  const getFirstImageUrl = (item) => {
    const url = getMediaUrls(item).find((mediaUrl) => isImageUrl(mediaUrl));
    return url ? resolveMediaUrl(url) : "";
  };

  const formattedDate = new Date(news.published_date).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
  const formatTime = (value) => {
    const date = parseDate(value);
    if (!date) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };
  const parseDate = (value) => {
    if (!value) return null;
    // trim fractional seconds to 3 digits so Date can parse it everywhere
    const normalized = value.replace(/(\.\d{3})\d+/, "$1");
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
  };
  const images = getMediaUrls(news);
  const hasMultipleImages = images.length > 1;

  const goPrev = () =>
    setActiveThumb((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveThumb((i) => (i + 1) % images.length);

  const scrollThumbRail = (direction) =>
    thumbRailRef.current?.scrollBy({
      top: direction === "up" ? -120 : 120,
      behavior: "smooth",
    });

  const visibleNews = moreNews.slice(0, 2);

  return (
    <div className="min-h-screen">
      <div className="container">
        <Link
          to={"/all-news"}
          className=" max-w-5xl flex gap-1 text-gray-500  mx-auto  pt-6 items-center"
        >
          {" "}
          <ArrowLeft /> Back to All News{" "}
        </Link>
        <div className="mx-auto py-6 max-w-5xl">
          {/* Date + time */}
          <div className="mb-2 flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={15} />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={15} />
              {formatTime(news.created_at)}
            </span>
          </div>

          {/* Title + badges — title left, badges right. On desktop the row is
              capped to the main image width (rail 180px + 16px gap reserved) */}
          <div
            className={[
              "mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:mb-6",
              hasMultipleImages ? "md:mr-[196px]" : "",
            ].join(" ")}
          >
            <div>
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
                {news.title}
              </h2>
              {/* Underline bar in the badge color */}
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="h-1 w-24 rounded-full"
                  style={{
                    backgroundColor:
                      programColors[news.enrollment_category] || "#a51c30",
                  }}
                />
                <span
                  className="h-1 w-6 rounded-full"
                  style={{
                    backgroundColor:
                      programColors[news.enrollment_category] || "#a51c30",
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                label={news.enrollment_category}
                badgeStyle="filled"
                colorTag={true}
              />
              <Badge label={news.news_type} badgeStyle="filled" img={true} />
            </div>
          </div>

          {/* Media carousel — main preview + numbered thumbnail rail */}
          {images.length > 0 && (
            <div className="mb-8 flex flex-col gap-4 md:flex-row">
              {/* Main preview */}
              <div className="relative flex-1 overflow-hidden rounded-xl bg-gray-200 shadow-sm md:aspect-[16/10]">
                {/* Counter badge */}
                {hasMultipleImages && (
                  <span className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-md bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    <ImageIcon size={13} />
                    {activeThumb + 1} / {images.length}
                  </span>
                )}

                {isImageUrl(images[activeThumb]) ? (
                  <img
                    src={resolveMediaUrl(images[activeThumb])}
                    alt={news.title}
                    className="h-full w-[100%] object-contain transition-all duration-300"
                  />
                ) : (
                  <div className="group/video relative h-full w-[100%]">
                    <video
                      ref={videoRef}
                      key={images[activeThumb]}
                      src={resolveMediaUrl(images[activeThumb])}
                      onPlay={() => setIsVideoPlaying(true)}
                      onPause={() => setIsVideoPlaying(false)}
                      onEnded={() => setIsVideoPlaying(false)}
                      onClick={toggleVideoPlayback}
                      className="h-full w-[100%] cursor-pointer object-contain transition-all duration-300"
                    />
                    {/* Centered play/pause overlay — always visible while
                        paused, shows on hover while playing */}
                    <button
                      type="button"
                      onClick={toggleVideoPlayback}
                      aria-label={isVideoPlaying ? "Pause video" : "Play video"}
                      className={[
                        "absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-black/70",
                        isVideoPlaying
                          ? "opacity-0 group-hover/video:opacity-100"
                          : "opacity-100",
                      ].join(" ")}
                    >
                      {isVideoPlaying ? (
                        <Pause size={28} fill="currentColor" />
                      ) : (
                        <Play size={28} fill="currentColor" className="ml-1" />
                      )}
                    </button>
                  </div>
                )}

                {/* Prev / Next arrows */}
                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-[#a51c30] shadow-md transition-colors hover:bg-[#a51c30] hover:text-white"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-[#a51c30] shadow-md transition-colors hover:bg-[#a51c30] hover:text-white"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail rail — vertical on desktop (stretches to match the
                  main image height), horizontal strip on mobile */}
              {hasMultipleImages && (
                <div className="flex flex-col md:w-[180px] md:self-stretch">
                  {/* Scroll-up hint — only when items are hidden above */}
                  {railScroll.up && (
                    <button
                      type="button"
                      onClick={() => scrollThumbRail("up")}
                      aria-label="Scroll thumbnails up"
                      className="mb-2 hidden cursor-pointer justify-center rounded-md py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 md:flex"
                    >
                      <ChevronUp size={20} />
                    </button>
                  )}
                  <div className="md:relative md:flex-1 md:min-h-0">
                    <div
                      ref={thumbRailRef}
                      onScroll={updateRailScroll}
                      className="flex gap-3 overflow-x-auto md:absolute md:inset-0 md:flex-col md:overflow-y-auto md:overflow-x-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {images.map((image, index) => (
                        <button
                          type="button"
                          key={index}
                          onClick={() => setActiveThumb(index)}
                          className={[
                            "relative h-[70px] w-[100px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-gray-200 shadow-sm transition-all md:h-[100px] md:w-[100%]",
                            activeThumb === index
                              ? "ring-2 ring-[#a51c30]"
                              : "opacity-80 hover:opacity-100",
                          ].join(" ")}
                        >
                          {/* Number badge */}
                          <span className="absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-[11px] font-bold text-white">
                            {index + 1}
                          </span>
                          {isImageUrl(image) ? (
                            <img
                              src={resolveMediaUrl(image)}
                              alt=""
                              className="h-full w-[100%] object-cover"
                            />
                          ) : (
                            <video
                              src={resolveMediaUrl(image)}
                              muted
                              preload="metadata"
                              className="pointer-events-none h-full w-[100%] object-cover"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scroll-down hint — only when items are hidden below */}
                  {railScroll.down && (
                    <button
                      type="button"
                      onClick={() => scrollThumbRail("down")}
                      aria-label="Scroll thumbnails down"
                      className="mt-2 hidden cursor-pointer justify-center rounded-md py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 md:flex"
                    >
                      <ChevronDown size={20} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Article content — rendered as HTML from the CKEditor */}
          {news.content ? (
            <div
              className="news-content ck-editor-text leading-relaxed space-y-4  text-[16px]"
              dangerouslySetInnerHTML={{
                __html: renderMediaEmbeds(news.content),
              }}
            />
          ) : (
            <div className="text-[16px] leading-relaxed mb-10 sm:mb-14">
              <p>No content available.</p>
            </div>
          )}

          {/* More News */}
          {moreNews.length > 0 && (
            <section className="pb-8 pt-3 md:pb-15 md:pt-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 uppercase tracking-wide">
                  MORE NEWS
                </h3>
                <Link
                  to="/all-news"
                  className="text-sm font-semibold"
                  style={{ color: "#a51c30", textDecoration: "none" }}
                >
                  Show all
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {visibleNews.length > 0 ? (
                  visibleNews.map((newsItem) => {
                    const previewImage = getFirstImageUrl(newsItem);
                    return (
                      <Link
                        key={newsItem.id}
                        to={`/newspage/${newsItem.slug}`}
                        className="h-full"
                      >
                        <div className="flex flex-col md:flex-row items-stretch group border border-gray-300 rounded-xl h-full">
                          {previewImage && (
                            <div className="md:w-[35%] overflow-hidden">
                              <img
                                src={previewImage}
                                alt={`${newsItem.news_type} image`}
                                className="w-[100%] h-full object-contain group-hover:scale-105 transition-all duration-250 ease-in"
                              />
                            </div>
                          )}
                          <div className="flex flex-col py-5 px-5 md:px-10 w-[100%] h-full">
                            <div className="flex justify-center md:justify-between items-start md:items-end w-[100%] mb-5 flex-col md:flex-row gap-3 md:gap-0 group-hover:scale-105 transition-all duration-250 ease-in">
                              <div className="flex gap-1 items-stretch">
                                <div
                                  className="flex justify-center items-center px-4 font-semibold py-1 text-white text-sm rounded-full"
                                  style={{
                                    backgroundColor:
                                      programColors[
                                        newsItem.enrollment_category
                                      ] || "gray",
                                  }}
                                >
                                  {newsItem.enrollment_category}
                                </div>
                                <div className="flex gap-1 justify-center items-center text-gray-600 bg-gray-200 px-4 font-semibold py-1 text-sm rounded-full capitalize">
                                  <img
                                    src={newsTypeIcons[newsItem.news_type]}
                                    alt=""
                                  />
                                  {newsItem.news_type}
                                </div>
                              </div>
                              <div className="md:ml-auto text-sm flex gap-1 items-center">
                                <Calendar size={14} />
                                {new Date(
                                  newsItem.published_date,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                            </div>
                            <h3 className="text-xl font-bold mb-2 group-hover:scale-105 transition-all duration-250 ease-in">
                              {newsItem.title}
                            </h3>
                            <p className="text-[16px] mb-2 line-clamp-3 group-hover:scale-105 transition-all duration-250 ease-in">
                              {stripHtml(newsItem.content)}
                            </p>

                            {/* ✅ span — outer Link already handles navigation */}
                            <span className="text-[16px] gap-[5px] mt-auto flex items-center leading-none text-[#a51c30] justify-end w-[100%]">
                              Read More
                              <ArrowRight
                                size={18}
                                strokeWidth={3}
                                className="text-[#a51c30]"
                              />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="text-xl py-15 md:py-0">No news found</div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
