import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import { extractFirstImagePath } from "@/utils/ExtractFirstImagePath";
import pdfIcon from "@/assets/pdfIcon.png";
import videoIcon from "@/assets/videoIcon.png";
import { FileText, Link as LinkIcon } from "lucide-react";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif",
]);
const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "ogg",
  "ogv",
  "mpeg",
  "mpg",
  "m4v",
  "3gp",
  "3g2",
]);
const DOCUMENT_EXTENSIONS = new Set([
  "txt",
  "rtf",
  "odt",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const WORD_EXTENSIONS = new Set(["doc", "docx"]);

const isAbsoluteUrl = (value = "") =>
  typeof value === "string" && /^(https?:)?\/\//i.test(value);

const getFileNameFromUrl = (url = "") => {
  if (!url || typeof url !== "string") {
    return "";
  }

  try {
    const parsed = new URL(url);
    const fileName = parsed.pathname.split("/").filter(Boolean).pop();
    return fileName || parsed.hostname || "";
  } catch {
    const cleanPath = url.split("?")[0].split("#")[0];
    return cleanPath.split("/").filter(Boolean).pop() || cleanPath;
  }
};

const getMaterialPath = (material) => {
  if (!material) {
    return "";
  }

  if (typeof material === "string") {
    return material;
  }

  if (typeof material === "object") {
    return (
      material?.url ??
      material?.path ??
      material?.file ??
      material?.link ??
      material?.href ??
      material?.location ??
      material?.src ??
      material?.value ??
      ""
    );
  }

  return "";
};

const getMaterialLabel = (material, url) => {
  if (material && typeof material === "object") {
    const namedLabel =
      material?.label ??
      material?.name ??
      material?.original_name ??
      material?.file_name ??
      "";
    if (namedLabel) {
      return namedLabel;
    }
  }

  return getFileNameFromUrl(url) || "Learning File";
};

const getMaterialExtension = (url = "") => {
  if (!url || typeof url !== "string") {
    return "";
  }

  const cleanPath = url.split("?")[0].split("#")[0];
  if (!cleanPath.includes(".")) {
    return "";
  }
  return cleanPath.substring(cleanPath.lastIndexOf(".") + 1).toLowerCase();
};

const resolveMaterialType = (url = "") => {
  const extension = getMaterialExtension(url);
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }
  if (PDF_EXTENSIONS.has(extension)) {
    return "pdf";
  }
  if (WORD_EXTENSIONS.has(extension)) {
    return "word";
  }
  if (DOCUMENT_EXTENSIONS.has(extension)) {
    return "document";
  }
  if (isAbsoluteUrl(url)) {
    return "url";
  }
  return "file";
};

const stripUniquenessPrefix = (value) => {
  if (typeof value !== "string") return value;
  // Remove leading 10-digit uniqueness prefixes like "1764743601_" or "1764743601-"
  return value.replace(/^\d{10}[ _-]?/, "");
};

export const LearningMaterials = ({ materials }) => {
  if (!materials || !materials.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {materials.map((material, idx) => {
        const key = material?.id ?? material?.url ?? material ?? idx;
        const rawPath = getMaterialPath(material);
        const resolvedUrl = rawPath
          ? buildBackendFileUrl(extractFirstImagePath(rawPath))
          : "";
        const type = resolveMaterialType(rawPath);
        const rawLabel = getMaterialLabel(material, rawPath);
        const label = stripUniquenessPrefix(rawLabel);
        const isImage = type === "image";
        const isLink = type === "url";
        const isWord = type === "word";
        const icon = type === "video" ? videoIcon : pdfIcon;

        const content = (
          <div className="flex items-center gap-3 ">
            {isImage && resolvedUrl ? (
              <div className="material-icon">
                <img
                  src={resolvedUrl}
                  alt={label}
                  className="h-4 w-4 object-cover rounded border border-slate-200"
                />
              </div>
            ) : isLink ? (
              <div className="material-icon">
                <LinkIcon size={14} />
              </div>
            ) : isWord ? (
              <div className="material-icon">
                <FileText size={14} className="text-blue-600" />
              </div>
            ) : (
              <div className="material-icon">
                <img src={icon} alt="" className="h-4 w-4 " />
              </div>
            )}
            <span className="material-text">{label}</span>
          </div>
        );

        if (!resolvedUrl) {
          return (
            <div key={key} className="flex items-center material-wrap">
              {content}
            </div>
          );
        }

        return (
          <a
            key={key}
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center material-wrap hover:underline"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
};
