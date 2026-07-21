import React, { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { getPMCGallery, getRMCGallery } from "@/api/galleryApi";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import gallerylogo from "@/assets/gallery-logo.png";

const PHOTOS_PER_PAGE_DESKTOP = 5;
const PHOTOS_PER_PAGE_MOBILE = 1;

const usePhotosPerPage = () => {
  const [perPage, setPerPage] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 1024
      ? PHOTOS_PER_PAGE_DESKTOP
      : PHOTOS_PER_PAGE_MOBILE
  );

  useEffect(() => {
    const update = () => {
      setPerPage(window.innerWidth >= 1024 ? PHOTOS_PER_PAGE_DESKTOP : PHOTOS_PER_PAGE_MOBILE);
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return perPage;
};

const PhotoGallery = ({ type, title = "Event Highlights" }) => {
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);
  const photosPerPage = usePhotosPerPage();

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        let data;
        if (type == "rmc") {
          data = await getRMCGallery();
        } else {
          data = await getPMCGallery();
        }
        const imageUrls = data.map((item) => item.image_url);
        setPhotos(imageUrls);
      } catch (error) {
        console.error("Failed to fetch gallery:", error);
      }
    };
    if (type) {
      fetchGallery();
    }
  }, [type]);

  const getGalleryImage = (image) => {
    const path = extractFirstImagePath(image);
    return buildBackendFileUrl(path);
  };

  const pages = [];
  for (let i = 0; i < photos.length; i += photosPerPage) {
    pages.push(photos.slice(i, i + photosPerPage));
  }
  const totalPages = pages.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [photosPerPage]);

  const currentPagePhotos = pages[activeIndex] || [];

  const goNext = () => setActiveIndex((prev) => (prev + 1) % totalPages);
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + totalPages) % totalPages);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 50;
    if (deltaX > SWIPE_THRESHOLD) goPrev();
    else if (deltaX < -SWIPE_THRESHOLD) goNext();
    touchStartX.current = null;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    if (selectedPhoto) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto]);

  useEffect(() => {
    if (selectedPhoto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedPhoto]);

  return (
    <section className="py-8 md:py-15 bg-white border-t border-gray-100">
      <div
        className={`container mx-auto px-0 sm:px-6 lg:px-8 ${
          selectedPhoto ? "blur-sm transition-all" : ""
        }`}
      >
        <h2 className="text-2xl sm:text-3xl md:text-[40px] font-bold text-center text-gray-900 mb-6 sm:mb-8 md:mb-10">
          {title}
        </h2>

        <div className="relative px-6 sm:px-10 lg:px-10">
          {/* Slider viewport */}
          <div
            className="overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 lg:gap-4">
              {currentPagePhotos.map((photo, index) => (
                <div
                  key={`${activeIndex}-${index}`}
                  className={`
                    group relative overflow-hidden rounded-xl shadow-md cursor-pointer bg-gray-100
                    ${
                      index === 0
                        ? "aspect-[4/3] sm:aspect-[16/9] lg:aspect-square lg:col-span-2 lg:row-span-2"
                        : "aspect-square"
                    }
                  `}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={getGalleryImage(photo) ?? "/placeholder.png"}
                    alt={`Gallery item ${activeIndex * photosPerPage + index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Gallery logo badge */}
                  <div className="rounded-full bg-white p-1.5 sm:p-2 flex justify-center items-center absolute bottom-2 right-2 sm:bottom-3 sm:right-4 w-10 h-10 sm:w-[60px] sm:h-[60px] shadow-sm">
                    <img src={gallerylogo} alt="" className="object-cover" />
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="text-white drop-shadow-md" size={32} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow buttons */}
          {totalPages > 1 && (
            <>
              <button
                onClick={goPrev}
                aria-label="Previous photos"
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-1.5 sm:p-2 hover:bg-gray-100 transition-colors z-10"
              >
                <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={goNext}
                aria-label="Next photos"
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-1.5 sm:p-2 hover:bg-gray-100 transition-colors z-10"
              >
                <ChevronRight size={20} className="sm:w-6 sm:h-6" />
              </button>
            </>
          )}

          {/* Dots indicator */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1 mt-4 sm:mt-6 flex-wrap max-w-[200px] mx-auto">
              {pages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Go to page ${i + 1}`}
                  className={`rounded-full transition-all ${
                    i === activeIndex ? "w-3 h-1.5 bg-gray-800" : "w-1.5 h-1.5 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-3 sm:p-4 md:p-6 transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPhoto(null);
          }}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-3 right-3 sm:top-6 sm:right-6 text-white hover:text-gray-300 z-50 bg-black/50 p-1.5 sm:p-2 rounded-full"
            aria-label="Close lightbox"
          >
            <X size={24} className="sm:w-8 sm:h-8" />
          </button>

          <div className="relative w-full max-w-xs sm:max-w-xl md:max-w-3xl lg:max-w-5xl flex items-center justify-center">
            <img
              src={getGalleryImage(selectedPhoto)}
              alt="Full view"
              className="max-w-full max-h-[80vh] sm:max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default PhotoGallery;