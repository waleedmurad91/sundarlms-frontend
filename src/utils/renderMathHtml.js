import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

// Replace inline LaTeX ($...$) with rendered KaTeX HTML, then sanitize.
export const renderMathHtml = (html = "") => {
  const text = html || "";
  const withMath = text.replace(/\$(.+?)\$/g, (match, expr) => {
    try {
      return katex.renderToString(expr, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return match;
    }
  });
  return DOMPurify.sanitize(withMath);
};
