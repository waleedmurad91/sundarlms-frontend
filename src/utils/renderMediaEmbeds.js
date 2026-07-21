/**
 * renderMediaEmbeds.js
 *
 * CKEditor 5's MediaEmbed plugin (in the prebuilt ckeditor5-build-classic
 * bundle) saves embedded videos as a semantic placeholder instead of a real
 * iframe:
 *
 *   <figure class="media"><oembed url="https://youtu.be/xxxx"></oembed></figure>
 *
 * Browsers don't know what <oembed> is, so nothing renders. This helper
 * walks the saved HTML string and replaces every <oembed> tag with a real,
 * working <iframe> for known providers (YouTube, Vimeo), before you hand
 * the HTML to dangerouslySetInnerHTML (or similar).
 *
 * Usage:
 *   import { renderMediaEmbeds } from "@/utils/renderMediaEmbeds";
 *   const safeHtml = renderMediaEmbeds(news.content);
 *   <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
 */

// Extracts a YouTube video ID from any common YouTube URL format.
const extractYouTubeId = (url) => {
  const patterns = [
    /youtu\.be\/([\w-]{6,})/i,
    /youtube\.com\/watch\?v=([\w-]{6,})/i,
    /youtube\.com\/embed\/([\w-]{6,})/i,
    /youtube\.com\/v\/([\w-]{6,})/i,
    /youtube\.com\/shorts\/([\w-]{6,})/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Extracts a Vimeo video ID from common Vimeo URL formats.
const extractVimeoId = (url) => {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? match[1] : null;
};

// Builds a responsive 16:9 iframe wrapper for a given embed src.
const buildIframeHtml = (src, title = "Embedded video") => {
  return (
    '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;">' +
    `<iframe src="${src}" title="${title}" ` +
    'style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" ' +
    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
    'allowfullscreen loading="lazy"></iframe>' +
    "</div>"
  );
};

// Converts a single raw video URL into embeddable iframe HTML.
// Returns null if the URL doesn't match a known provider.
const buildEmbedFromUrl = (rawUrl) => {
  if (!rawUrl) return null;

  const youTubeId = extractYouTubeId(rawUrl);
  if (youTubeId) {
    return buildIframeHtml(
      `https://www.youtube.com/embed/${youTubeId}`,
      "YouTube video",
    );
  }

  const vimeoId = extractVimeoId(rawUrl);
  if (vimeoId) {
    return buildIframeHtml(`https://player.vimeo.com/video/${vimeoId}`, "Vimeo video");
  }

  // Unknown provider — fall back to a plain link so content isn't silently
  // dropped; better to show something clickable than nothing at all.
  return `<p><a href="${rawUrl}" target="_blank" rel="noopener noreferrer">${rawUrl}</a></p>`;
};

/**
 * Replaces every CKEditor <oembed url="..."> placeholder (optionally
 * wrapped in <figure class="media">...</figure>) found in an HTML string
 * with a real, renderable iframe (or a fallback link for unknown providers).
 *
 * @param {string} html - Raw HTML string from editor.getData() / your API.
 * @returns {string} HTML string safe to pass to dangerouslySetInnerHTML.
 */
export const renderMediaEmbeds = (html) => {
  if (typeof html !== "string" || !html) return html ?? "";

  // Matches the whole <figure class="media">...<oembed url="...">...</oembed>...</figure>
  // block when present, so we replace the figure too (not just the oembed tag),
  // avoiding a leftover empty <figure> wrapper around our iframe.
  const figureWithOembedPattern =
    /<figure[^>]*class=["'][^"']*media[^"']*["'][^>]*>\s*<oembed[^>]*url=["']([^"']+)["'][^>]*>[\s\S]*?<\/oembed>\s*<\/figure>/gi;

  // Fallback: a bare <oembed> not wrapped in a <figure> (rare, but possible
  // depending on how content was authored/pasted).
  const bareOembedPattern = /<oembed[^>]*url=["']([^"']+)["'][^>]*>[\s\S]*?<\/oembed>/gi;

  let result = html.replace(figureWithOembedPattern, (_match, url) => {
    return buildEmbedFromUrl(url) ?? _match;
  });

  result = result.replace(bareOembedPattern, (_match, url) => {
    return buildEmbedFromUrl(url) ?? _match;
  });

  return result;
};
