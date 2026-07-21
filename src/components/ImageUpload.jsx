import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { CloudUpload } from "lucide-react";
import { useState, useEffect, useRef } from "react";

function VideoPreview({ src }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
  };

  return (
    <div
      className="relative w-[120px] h-[90px] rounded-md overflow-hidden bg-gray-900"
      onClick={(e) => e.stopPropagation()}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute inset-0 flex items-center justify-center bg-transparent"
      >
        <div
          className={`w-8 h-8 bg-white/80 rounded-full flex items-center justify-center transition-opacity ${
            playing ? "opacity-0 hover:opacity-100" : "opacity-100"
          }`}
        >
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#a51c30">
              <rect x="2" y="1" width="3" height="10" />
              <rect x="7" y="1" width="3" height="10" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 10 10" fill="#a51c30">
              <polygon points="2,1 9,5 2,9" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}

const TYPE_CONFIG = {
  image: {
    types: ["image/png", "image/jpeg", "image/webp", "image/jpg"],
    accept: ".png,.jpg,.jpeg,.webp",
    label: "PNG, JPG, WEBP",
  },
  pdf: {
    types: ["application/pdf"],
    accept: ".pdf",
    label: "PDF",
  },
  video: {
    types: ["video/mp4", "video/webm", "video/ogg"],
    accept: ".mp4,.webm,.ogg",
    label: "MP4, WEBM, OGG",
  },
};

function ImageUpload({
  multiple = false,
  onChange,
  accept = ["image"],
  value = null,
  maxSizeMb = 10,
}) {
  const maxBytes = maxSizeMb * 1024 * 1024;

  const acceptedTypes = accept.flatMap((key) => TYPE_CONFIG[key]?.types ?? []);
  const acceptString = accept
    .map((key) => TYPE_CONFIG[key]?.accept ?? "")
    .join(",");
  const acceptLabel = accept
    .map((key) => TYPE_CONFIG[key]?.label ?? "")
    .join(", ");

  // Each preview: { url, type, isExternalUrl?, file? }
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState("");

  const getUrlType = (url) => {
    if (!url) return "image";
    const lower = url.toLowerCase().split("?")[0];
    if (/\.(mp4|webm|ogg|mov|avi|mkv)$/.test(lower)) return "video";
    if (
      lower.includes("youtube.com") ||
      lower.includes("youtu.be") ||
      lower.includes("vimeo.com")
    )
      return "video";
    if (/\.pdf$/.test(lower)) return "pdf";
    return "image";
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/,
    );
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  const valueUrls = Array.isArray(value)
    ? value.filter(Boolean)
    : value
      ? [value]
      : [];
  const valueSignature = valueUrls.join("\0");

  // Seed existing URL previews when value prop changes (edit mode)
  useEffect(() => {
    setPreviews((prev) => {
      const filePreviews = prev.filter((p) => !p.isExternalUrl);

      if (valueUrls.length === 0) {
        return filePreviews;
      }

      const urlPreviews = valueUrls.map((url) => ({
        url,
        type: getUrlType(url),
        isExternalUrl: true,
      }));

      return [...urlPreviews, ...filePreviews];
    });
  }, [valueSignature]);

  const getFileType = (file) => {
    if (file.type === "application/pdf") return "pdf";
    if (file.type.startsWith("video/")) return "video";
    return "image";
  };

  const validateFiles = (selected) => {
    for (const file of selected) {
      if (!acceptedTypes.includes(file.type)) {
        return `"${file.name}" is not allowed. Accepted: ${acceptLabel}.`;
      }
      if (file.size > maxBytes) {
        return `"${file.name}" exceeds the ${maxSizeMb}MB size limit.`;
      }
    }
    return null;
  };

  // Returns mixed array: existing string URLs first, then File objects
  const buildMixed = (previewList) => [
    ...previewList.filter((p) => p.isExternalUrl).map((p) => p.url),
    ...previewList.filter((p) => p.file).map((p) => p.file),
  ];

  const handleImageChange = (e) => {
    const selected = Array.from(e.target.files);
    const validationError = validateFiles(selected);
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      return;
    }
    setError("");

    const newPreviews = selected.map((file) => ({
      url: file.type === "application/pdf" ? null : URL.createObjectURL(file),
      type: getFileType(file),
      file,
    }));

    if (multiple) {
      const updatedPreviews = [...previews, ...newPreviews];
      setPreviews(updatedPreviews);
      onChange && onChange(buildMixed(updatedPreviews));
    } else {
      setPreviews(newPreviews);
      onChange && onChange(selected[0]);
    }

    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    const validationError = validateFiles(dropped);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    const newPreviews = dropped.map((file) => ({
      url: file.type === "application/pdf" ? null : URL.createObjectURL(file),
      type: getFileType(file),
      file,
    }));

    if (multiple) {
      const updatedPreviews = [...previews, ...newPreviews];
      setPreviews(updatedPreviews);
      onChange && onChange(buildMixed(updatedPreviews));
    } else {
      setPreviews(newPreviews);
      onChange && onChange(dropped[0]);
    }
  };

  const removeItem = (index) => {
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPreviews(updatedPreviews);
    setError("");
    if (multiple) {
      onChange && onChange(buildMixed(updatedPreviews));
    } else {
      onChange && onChange(updatedPreviews[0]?.file ?? null);
    }
  };

  const renderPreview = (preview, i) => {
    if (preview.type === "video") {
      const embedUrl = preview.isExternalUrl ? getEmbedUrl(preview.url) : null;
      if (embedUrl) {
        return (
          <div
            className="relative w-[120px] h-[90px] rounded-md overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={embedUrl}
              title={`video preview ${i}`}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      return <VideoPreview src={buildBackendFileUrl(preview.url)} />;
    }

    if (preview.type === "pdf") {
      return (
        <div className="w-[120px] h-[90px] bg-red-50 border border-red-200 rounded-md flex flex-col items-center justify-center gap-1">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#a51c30"
            strokeWidth="1.5"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          {preview.isExternalUrl ? (
            <a
              href={buildBackendFileUrl(preview.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#a51c30] font-semibold underline"
              onClick={(e) => e.stopPropagation()}
            >
              PDF
            </a>
          ) : (
            <span className="text-[11px] text-[#a51c30] font-semibold">
              PDF
            </span>
          )}
        </div>
      );
    }

    // image
    return (
      <img
        src={buildBackendFileUrl(preview.url)}
        alt={`preview ${i}`}
        className="w-[120px] h-[90px] object-contain border border-gray-400 rounded-md"
      />
    );
  };

  return (
    <div className="mb-5">
      <input
        type="file"
        id="imageUpload"
        accept={acceptString}
        multiple={multiple}
        className="hidden"
        onChange={handleImageChange}
      />

      <label
        htmlFor="imageUpload"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="cursor-pointer border-2 border-dashed border-[#a51c30] rounded-lg p-6 flex flex-col items-center justify-center hover:bg-gray-50 min-h-[120px] transition-colors"
      >
        {previews.length === 0 ? (
          <>
            <CloudUpload color="#a51c30" />
            <div className="text-center mt-2">
              <p className="text-sm font-semibold text-gray-700">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {acceptLabel} up to {maxSizeMb}MB
              </p>
            </div>
          </>
        ) : (
          <div
            className="flex gap-3 flex-wrap justify-center"
            onClick={(e) => e.preventDefault()}
          >
            {previews.map((preview, i) => (
              <div key={i} className="relative">
                {renderPreview(preview, i)}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    removeItem(i);
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center cursor-pointer hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Add more button — only for multiple */}
            {multiple && (
              <label
                htmlFor="imageUpload"
                className="w-[120px] h-[90px] border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 text-gray-400 text-xl"
                onClick={(e) => e.stopPropagation()}
              >
                +
              </label>
            )}
          </div>
        )}
      </label>

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}

export default ImageUpload;
