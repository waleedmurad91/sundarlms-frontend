import React, { useState, useEffect, useRef } from "react";
import { Calendar, Megaphone } from "lucide-react";
import { programColors, newsbg, stripHtml, readMoreColors } from "../../data/newsData";
import "./NewsSidebar.css";
import { Link } from "react-router-dom";

const themeConfig = {
  rmc: {
    cardBg: "#eef0ff",
    badge: { backgroundImage: "linear-gradient(to right, #0d0d8e, #000074)" }
  },
  pmc: {
    cardBg: "#e8f5ee",
    badge: { backgroundImage: "linear-gradient(to right, #0c8137, #025020)" }
  },
  vss: {
    cardBg: "#fdecea",
    badge: { backgroundImage: "linear-gradient(to right, #ba0a1e, #990213)" }
  },
  ilm: {
    cardBg: "#fef1d0",
    badge: { backgroundImage: "linear-gradient(to right, #be901d, #996d00)" }
  },
};

const themeToProgram = {
  rmc: "RMC",
  pmc: "PMC",
  vss: "VSS",
  ilm: "ILM",
};

const NewsImageSlider = ({ images = [], interval = 3000 }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (images.length <= 1) return undefined;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timerRef.current);
  }, [images.length, interval]);

  if (!images.length) return null;

  return (
    <div className="news-slider">
      <div
        className="news-slider-track"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {images.map((src, idx) => (
          <div className="news-slider-slide" key={`${src}-${idx}`}>
            <img src={src} alt="" loading="lazy" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="news-slider-dots">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`news-slider-dot ${idx === activeIndex ? "active" : ""}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const NewsSidebar = ({ news = [], title = "Latest News & Updates", theme = null }) => {
  return (
    <div className={`news-sidebar ${news.length > 0 ? "" : "hidden"}`} style={{direction:"ltr"}}>
      <h3 className="news-sidebar-title flex justify-between items-center">
        {title}
        <Link className="text-lg font-light capitalize text-gray-500" to="/all-news">
          View All
        </Link>
      </h3>

      <div className="news-box-sidebar-auto">
        <div className="news-scroll-container">
          {news.map((item, index) => {
            const detailPath =
              item.announcement === "announcement"
                ? null
                : `/newspage/${item.slug}`;

            const images = Array.isArray(item.media_urls) ? item.media_urls : [];

            const cardBg = theme && themeConfig[theme]
              ? themeConfig[theme].cardBg
              : (newsbg[item.program] || "#F8FAFC");

            const badgeStyle = theme && themeConfig[theme]
              ? themeConfig[theme].badge
              : { backgroundColor: programColors[item.program] || "black" };

            const readMoreColor = theme && themeToProgram[theme]
              ? readMoreColors[themeToProgram[theme]]
              : (readMoreColors[item.program] || "#000");

            const cardContent = (
              <div
                className="news-item-sidebar"
                style={{ backgroundColor: cardBg }}
              >
                <div className="flex justify-between items-center">
                  <div
                    className={`news-type-badge ${item.announcement === "announcement" ? "gap-1 !flex items-center" : ""}`}
                    style={badgeStyle}
                  >
                    {item.announcement === "announcement" ? <Megaphone size={16} /> : ""}
                    {item.announcement === "announcement" ? item.announcement : item.type}
                  </div>
                  <div className="news-date">
                    <Calendar size={14} />
                    <span>
                      {new Date(item.date).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <h4 className="news-title">{item.title}</h4>
                {images.length > 0 && <NewsImageSlider images={images} />}
                <p className="news-description news-description-clamp text-start">
                  {stripHtml(item.short_description || item.description)}
                </p>

                {item.announcement !== "announcement" && (
                  <span
                    className="news-read-more"
                    style={{ color: readMoreColor }}
                  >
                    Read More <span aria-hidden="true">→</span>
                  </span>
                )}
              </div>
            );

            return (
              <div key={item.id ?? `${item?.title ?? "news"}-${index}`}>
                {detailPath ? (
                  <Link
                    to={detailPath}
                    style={{ display: "block", textDecoration: "none", color: "inherit" }}
                  >
                    {cardContent}
                  </Link>
                ) : (
                  cardContent
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NewsSidebar;