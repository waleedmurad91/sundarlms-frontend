import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { renderMathHtml } from "@/utils/renderMathHtml";
import { LANGUAGE_OPTIONS } from "@/utils/translate";
import { hasRealContent } from "@/utils/questionTranslation";

const BACKEND_FILE_BASE_PATH = import.meta.env.VITE_BACKEND_FILE_BASE_PATH;

const extractMediaPath = (input) => {
  if (!input) return "";

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return "";

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractMediaPath(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (typeof input !== "object") return "";

  return extractMediaPath(
    input.url ??
      input.image_url ??
      input.imageUrl ??
      input.path ??
      input.src ??
      input.image ??
      input.file_path ??
      input.filePath ??
      "",
  );
};

const buildImageUrl = (src) => {
  const value = extractMediaPath(src);
  if (!value) return "";
  if (
    value.startsWith("http") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  )
    return value;

  const basePath = BACKEND_FILE_BASE_PATH ?? "";
  if (!basePath) return value;
  if (basePath.endsWith("/") || value.startsWith("/")) {
    return `${basePath}${value}`;
  }
  return `${basePath}/${value}`;
};

const getStepOriginalExplanation = (step) =>
  step?.explanation ?? step?.text ?? "";

const stepHasRealContent = (step) => {
  if (!step) return false;
  if (hasRealContent(getStepOriginalExplanation(step))) return true;
  if (Array.isArray(step.images) && step.images.length > 0) return true;
  return false;
};

const SolutionSteps = ({
  steps = [],
  stepsUrdu = [],
  stepsSindhi = [],
  show,
  selectedLanguage = "en",
}) => {
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  const activeLanguage =
    LANGUAGE_OPTIONS.find((option) => option.code === selectedLanguage) ??
    LANGUAGE_OPTIONS[0];

  const nativeStepsForLanguage = useMemo(() => {
    if (selectedLanguage === "ur") return stepsUrdu;
    if (selectedLanguage === "sd") return stepsSindhi;
    return [];
  }, [selectedLanguage, stepsUrdu, stepsSindhi]);

  const hasNativeArray =
    selectedLanguage !== "en" &&
    Array.isArray(nativeStepsForLanguage) &&
    nativeStepsForLanguage.length > 0;

  const displaySteps = useMemo(() => {
    if (selectedLanguage === "en" || !hasNativeArray) {
      return steps;
    }
    return steps.map((englishStep, idx) => {
      const nativeStep = nativeStepsForLanguage[idx];
      if (stepHasRealContent(nativeStep)) {
        return nativeStep;
      }
      return englishStep;
    });
  }, [steps, nativeStepsForLanguage, hasNativeArray, selectedLanguage]);

  const isStepNative = (idx) => {
    if (selectedLanguage === "en" || !hasNativeArray) return false;
    return stepHasRealContent(nativeStepsForLanguage[idx]);
  };

  const hasAnyContent =
    Array.isArray(displaySteps) &&
    displaySteps.length > 0 &&
    displaySteps.some((step) => stepHasRealContent(step));

  if (!show) return null;

  return (
    <>
      <h4
        style={{ direction: "ltr" }}
        className="text-md !font-sans text-left direction-normal border-b-2 border-gray-300 mt-[2rem] pt-3 mb-5 pb-3 font-semibold text-slate-800"
      >
        Solution:
      </h4>
      {!hasAnyContent ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm italic text-slate-500">
          No solution provided.
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
          {displaySteps.map((step, idx) => {
            const explanationHtml = getStepOriginalExplanation(step);
            const stepIsRtl = isStepNative(idx) && activeLanguage.dir === "rtl";
            const stepLangFontClass = isStepNative(idx)
              ? selectedLanguage === "ur"
                ? "font-nastaleeq"
                : selectedLanguage === "sd"
                  ? "font-lateefi !text-xl"
                  : ""
              : "";

            return (
              <div key={idx} className="space-y-2">
                {hasRealContent(explanationHtml) && (
                  <div
                    className={`prose prose-sm text-slate-800 ${
                      stepIsRtl ? "text-right leading-8" : ""
                    } ${stepLangFontClass}`}
                    dir={stepIsRtl ? "rtl" : "ltr"}
                    lang={isStepNative(idx) ? activeLanguage.lang : "en"}
                    dangerouslySetInnerHTML={{
                      __html: renderMathHtml(explanationHtml),
                    }}
                  />
                )}
                {Array.isArray(step.images) && step.images.length ? (
                  <div className="flex flex-wrap gap-4 flex-col">
                    {step.images.map((img, imgIdx) => (
                      <div
                        key={img?.id ?? img?.url ?? imgIdx}
                        className="solution-image-body"
                      >
                        <img src={buildImageUrl(img)} alt="" className="" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {showHelpPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="presentation"
          onClick={() => setShowHelpPopup(false)}
        >
          <div
            className="relative w-full max-w-md rounded-lg bg-white p-6 text-slate-700 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="solution-help-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close help"
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-700"
              onClick={() => setShowHelpPopup(false)}
            >
              <X size={18} />
            </button>
            <h3
              id="solution-help-title"
              className="pr-8 text-lg font-semibold text-slate-900"
            >
              Need Extra Help?
            </h3>
            <p className="mt-4 text-sm leading-6">
              Dear Student, if you want help with any question, you can join our
              Live Class Session through the link below.
            </p>
            <div className="mt-4 space-y-2 text-sm leading-6">
              <p>
                <span className="font-semibold text-slate-900">Time:</span> 4:00
                PM to 6:00 PM (6 days a week)
              </p>
              <p>
                <span className="font-semibold text-slate-900">
                  Live Session:
                </span>{" "}
                <a
                  href="https://meet.google.com/ymn-seaj-vky"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-gray-600 underline underline-offset-2 hover:text-gray-800"
                >
                  meet.google.com/ymn-seaj-vky
                </a>
              </p>
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4 text-sm leading-6">
              <p className="font-semibold text-slate-900">Contact Support:</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:ilmhelp@virtual.sundarstem.edu.pk"
                  className="text-gray-600 underline underline-offset-2 hover:text-gray-800"
                >
                  ilmhelp@virtual.sundarstem.edu.pk
                </a>
              </p>
              <p>
                Phone:{" "}
                <a
                  href="tel:+923491172049"
                  className="text-gray-600 underline underline-offset-2 hover:text-gray-800"
                >
                  +92 349 1172049
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SolutionSteps;
