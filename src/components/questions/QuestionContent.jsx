import { Info } from "lucide-react";
import { renderMathHtml } from "@/utils/renderMathHtml";
import { LANGUAGE_OPTIONS } from "@/utils/translate";
import { hasRealContent } from "@/utils/questionTranslation";

const BACKEND_FILE_BASE_PATH = import.meta.env.VITE_BACKEND_FILE_BASE_PATH;

const buildImageUrl = (src) => {
  if (!src) return "";
  if (
    src.startsWith("http") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  )
    return src;
  return `${BACKEND_FILE_BASE_PATH}/${src}`;
};

// Ensures plain text (no wrapping block tag) gets a <p> so prose spacing applies
const wrapIfPlainText = (html) => {
  if (!html) return html;
  const trimmed = html.trim();
  if (/^<(p|div|h[1-6]|ul|ol|table|blockquote)[\s>]/i.test(trimmed)) {
    return html;
  }
  return `<p>${html}</p>`;
};

// Does this question have a native question_text translation for the given
// language? This is also the flag AnswerOptions uses to decide whether it's
// allowed to machine-translate options / input labels for this question.
const getNativeFieldForLanguage = (question, langKey) => {
  if (!question) return "";
  if (langKey === "ur") {
    return question?.question_text_urdu ?? question?.questionTextUrdu ?? "";
  }
  if (langKey === "sd") {
    return question?.question_text_sindhi ?? question?.questionTextSindhi ?? "";
  }
  return "";
};

// Pure display component — receives the question text already resolved to
// the correct language by the caller (e.g. PracticeStarter or QuestionDetail).
// `selectedLanguage` is only used here for presentational concerns (RTL,
// font, dir/lang attributes), not for fetching or choosing translations.
const QuestionContent = ({ question, selectedLanguage = "en" }) => {
  if (!question) return null;

  const questionText = question?.question_text ?? "";
  const images = question?.images ?? [];

  const activeLanguage =
    LANGUAGE_OPTIONS.find((option) => option.code === selectedLanguage) ??
    LANGUAGE_OPTIONS[0];

  // ── Derive font class from selected language ──────────────────────────────
  // Translation for the question statement is only available when this
  // question has a native question_text translation for the selected
  // language. When it doesn't, we render plain English LTR — never RTL/Urdu
  // styling on untranslated (English) text.
  const isNonEnglish = selectedLanguage !== "en";
  const hasNativeTranslation = hasRealContent(
    getNativeFieldForLanguage(question, selectedLanguage),
  );
  const showUnavailableNotice = isNonEnglish && !hasNativeTranslation;

  const isRtl = hasNativeTranslation && activeLanguage.dir === "rtl";

  const langFontClass = hasNativeTranslation
    ? selectedLanguage === "ur"
      ? "font-nastaleeq"
      : selectedLanguage === "sd"
        ? "font-lateefi !text-2xl"
        : ""
    : "";

  return (
    <div className="space-y-3">
      {showUnavailableNotice && (
        <div
          className="mt-2 flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5"
          role="status"
        >
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
            <Info size={12} strokeWidth={2.5} />
          </span>
          <p className="text-sm font-semibold text-blue-800">
            This question is only available in English.
          </p>
        </div>
      )}
      {questionText && (
        <div className="flex items-start gap-3">
          <div
            className={`prose prose-sm min-w-0 flex-1 font-bold text-[17px] text-slate-900 ${
              isRtl ? "text-right leading-8 rtl-question" : ""
            } ${langFontClass}`}
            dir={isRtl ? "rtl" : "ltr"}
            lang={hasNativeTranslation ? activeLanguage.lang : "en"}
            dangerouslySetInnerHTML={{
              __html: renderMathHtml(wrapIfPlainText(questionText)),
            }}
          />
        </div>
      )}
      {images.length > 0 && (
        <div className="flex justify-center items-center question-images-wrap mb-4">
          {images.map((img, index) => (
            <div className="question-img-wrapper" key={index}>
              <img
                key={img}
                src={buildImageUrl(img)}
                alt=""
                className="rounded-md border border-slate-200 object-scale-down"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionContent;
