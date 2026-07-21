// Color mapping for programs
export const programColors = {
  VSS: '#C90016',
  "PMC": '#01411C',
  RMC: '#000080',
  ILM: 'rgba(153,109,0,1)',
  home: '#FFD700'
};
export const readMoreColors ={
  VSS: '#C90016',
  "PMC": '#01411C',
  RMC: '#000080',
  ILM: 'rgba(153,109,0,1)',
  home: '#FFD700' 
}

export const newsbg = {
  VSS: 'rgb(255,240,242)',
  RMC: 'rgb(240,240,255)',
  "PMC": '#f1fff7',
  ILM:"#fff7e3"
}

  // Strip HTML tags from CKEditor content for short plain-text previews.
export  function stripHtml(html) {
    if (typeof html !== "string") return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

const FILE_BASE_PATH = import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? "";

export function buildMediaUrl(relativePath) {
  if (typeof relativePath !== "string" || !relativePath) return "";
  const base = FILE_BASE_PATH.endsWith("/")
    ? FILE_BASE_PATH
    : `${FILE_BASE_PATH}/`;
  const path = relativePath.startsWith("/")
    ? relativePath.slice(1)
    : relativePath;
  return `${base}${path}`;
}

export const mapNewsSidebarItem = (item = {}) => ({
  id: item.id,
  slug: item.slug ?? "",
  title: item.title ?? "",
  description: item.content ?? "",
  short_description: item.short_description ?? null,
  type: item.news_type ?? "",
  date: item.published_date ?? "",
  program: item.enrollment_category ?? "",
  media_urls: Array.isArray(item.media) ? item.media.map(buildMediaUrl) : [],
  announcement: item.announcement,
});