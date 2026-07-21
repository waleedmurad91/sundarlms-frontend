import { useEffect, useState } from "react";
import { getPublicSliderByPageType } from "@/api/sliderApi";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

const SLIDE_INTERVAL_MS = 5000;

const normalizeSliderImages = (data = {}) => {
  const imageUrls = Array.isArray(data.image_urls) ? data.image_urls : [];
  const images = Array.isArray(data.images) ? data.images : [];
  const source = imageUrls.length > 0 ? imageUrls : images;

  return source.map((item) => buildBackendFileUrl(item)).filter(Boolean);
};

const PageHeroSlider = ({
  pageType,
  className = "",
  as: Component = "section",
  children,
}) => {
  const [slides, setSlides] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadSlides = async () => {
      try {
        const response = await getPublicSliderByPageType(pageType);
        const data = response?.data ?? response ?? {};
        const urls = normalizeSliderImages(data);
        if (mounted) {
          setSlides(urls);
          setActiveIndex(0);
        }
      } catch {
        if (mounted) {
          setSlides([]);
          setActiveIndex(0);
        }
      }
    };

    loadSlides();

    return () => {
      mounted = false;
    };
  }, [pageType]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [slides.length]);

  const hasSlides = slides.length > 0;

  return (
    <Component
      className={`relative overflow-hidden ${className}`.trim()}
      style={hasSlides ? { backgroundImage: "none" } : undefined}
    >
      {hasSlides && (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          {slides.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out"
              style={{
                backgroundImage: `url("${src}")`,
                opacity: index === activeIndex ? 1 : 0,
              }}
            />
          ))}
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-white/60"
        aria-hidden="true"
      />

      <div className="relative z-10">{children}</div>
    </Component>
  );
};

export default PageHeroSlider;
