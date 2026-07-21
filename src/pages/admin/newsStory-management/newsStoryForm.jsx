import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import {
  AlertCircleIcon,
  FileText,
  FileType2,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Text,
  X,
} from "lucide-react";
import { addNews, getNewsById, updateNewsById } from "@/api/newsApi";
import ImageUpload from "@/components/ImageUpload";
import axiosInstance from "@/api/axiosInstance";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

const DEFAULT_FORM = {
  title: "",
  content: "",
  news_type: "",
  enrollment_category: "",
  short_description: "",
  is_published: "",
  is_announcement: false,
  is_featured: false,
  media: [],
};

// ---------------------------------------------------------------------------
// CKEditor upload adapter
// ---------------------------------------------------------------------------
// CKEditor's image/upload buttons exist in the toolbar by default, but they
// don't actually send the file anywhere unless an upload adapter is wired up.
// This adapter sends the picked file to axiosInstance's "/upload-image"
// route (axiosInstance's baseURL already includes "/api") and expects the
// backend to respond with JSON shaped like: { "url": "https://..." }
//
// Adjust these two spots to match your backend's real contract:
//   1. The FormData field name ("upload") — change if your API reads a
//      different field name (e.g. "image", "file").
//   2. The response field read below (data.url) — change if your API
//      returns the URL under a different key (e.g. data.data.path).
const UPLOAD_PATH = "/upload-image"; // axiosInstance baseURL already has /api, so final URL = {VITE_API_URL}/api/upload-image
const AUTH_TOKEN_KEY = "token"; // <- change this if your app stores the JWT under a different localStorage key

class CKEditorUploadAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then(
      (file) =>
        new Promise((resolve, reject) => {
          const formData = new FormData();
          formData.append("upload", file);

          const token = localStorage.getItem(AUTH_TOKEN_KEY);

          axiosInstance
            .post(UPLOAD_PATH, formData, {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                // Do NOT set Content-Type manually — axios/the browser sets
                // the correct multipart/form-data boundary for FormData itself.
              },
            })
            .then((response) => {
              const data = response.data;
              const rawUrl = data?.url ?? data?.data?.url ?? data?.path;
              if (!rawUrl) {
                throw new Error(
                  "Upload succeeded but response did not contain a 'url' field.",
                );
              }
              // Backend sometimes returns a malformed/relative path —
              // normalize it to a real, loadable URL before handing it to
              // CKEditor, otherwise the inserted <img> shows broken.
              const url = buildBackendFileUrl(rawUrl);
              resolve({ default: url });
            })
            .catch((err) => {
              const message =
                err?.response?.data?.message ||
                err?.response?.data?.error?.message ||
                err?.message ||
                "Upload failed. Please try again.";
              reject(message);
            });
        }),
    );
  }

  abort() {
    // Implement if your backend supports cancelling an in-flight upload.
  }
}

function CKEditorUploadAdapterPlugin(editor) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
    return new CKEditorUploadAdapter(loader);
  };
}

const editorConfig = {
  extraPlugins: [CKEditorUploadAdapterPlugin],
};

// ---------------------------------------------------------------------------

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

const normalizeMediaFromApi = (data = {}) => {
  const raw =
    (Array.isArray(data.media_urls) && data.media_urls.length > 0
      ? data.media_urls
      : data.media) ?? [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return (
          item.url ??
          item.path ??
          item.media_url ??
          item.image ??
          ""
        ).trim();
      }
      return "";
    })
    .filter(Boolean);
};

// Main Component
const NewsStoryForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateNews = state?.news;
  const newsId = paramsId || state?.newsId || fallbackStateNews?.id;
  const isEditMode = Boolean(newsId);

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    ...(fallbackStateNews || {}),
  }));
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [editorKey, setEditorKey] = React.useState(0);

  // Fetch news data when editing
  React.useEffect(() => {
    if (!isEditMode || !newsId) return;

    const fetchNews = async () => {
      try {
        setFetching(true);
        const result = await getNewsById(newsId);
        const data = result?.data ?? result ?? {};
        setFormField((prev) => ({
          ...prev,
          title: data.title ?? "",
          content: data.content ?? "",
          short_description: data.short_description ?? "",
          news_type: data.news_type ?? "",
          enrollment_category: data.enrollment_category ?? "",
          is_published: data.is_published ?? "",
          is_featured: data.is_featured ?? false,
          is_announcement: data.is_announcement ?? false,
          // seed with existing server URLs (strings)
          media: normalizeMediaFromApi(data),
        }));
        // Remount the editor so it picks up the freshly loaded content.
        setEditorKey((key) => key + 1);
      } catch (err) {
        const message =
          err?.message || "Unable to load news details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchNews();
  }, [isEditMode, newsId]);

  // Handle input change
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  // existingUrls: string URLs kept from the server
  // newFiles: newly picked File objects
  const existingUrls = React.useMemo(
    () => (formField.media ?? []).filter((item) => typeof item === "string"),
    [formField.media],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedTitle = safeTrimString(formField.title);
    const trimmedContent = safeTrimString(formField.content);
    const trimmedShortDescription = safeTrimString(formField.short_description);
    const trimmedNewsType = safeTrimString(formField.news_type);
    const trimmedEnrollmentCategory = safeTrimString(
      formField.enrollment_category,
    );
    const trimmedStatus = safeTrimString(formField.is_published);

    if (formField.is_announcement) {
      if (!trimmedTitle || !trimmedStatus) {
        const message = "Please fill in all required fields.";
        toast.error(message);
        setError(message);
        return;
      }
    } else {
      if (
        !trimmedTitle ||
        !trimmedContent ||
        !trimmedNewsType ||
        !trimmedEnrollmentCategory ||
        !trimmedStatus
      ) {
        const message = "Please fill in all required fields.";
        toast.error(message);
        setError(message);
        return;
      }
    }

    const payload = new FormData();
    payload.append("title", trimmedTitle);
    payload.append("content", trimmedContent);
    payload.append("short_description", trimmedShortDescription);
    payload.append("news_type", trimmedNewsType);
    payload.append("enrollment_category", trimmedEnrollmentCategory);
    payload.append("is_published", trimmedStatus);
    payload.append("is_featured", formField.is_featured ? 1 : 0);
    payload.append("is_announcement", formField.is_announcement ? 1 : 0);

    const mediaItems = formField.media ?? [];
    const remainingUrls = mediaItems.filter((item) => typeof item === "string");
    const newFiles = mediaItems.filter((item) => item instanceof File);

    if (isEditMode) {
      if (remainingUrls.length > 0) {
        // Tell backend which existing URLs to keep — it deletes the rest
        remainingUrls.forEach((url) => payload.append("media_urls[]", url));
      } else if (newFiles.length === 0) {
        // User cleared everything intentionally
        payload.append("replace_media", 1);
      }
      // Append newly added files
      newFiles.forEach((file) => payload.append("media[]", file));
    } else {
      // Create mode — only new files
      newFiles.forEach((file) => payload.append("media[]", file));
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateNewsById(newsId, payload);
        toast.success("News updated successfully.");
      } else {
        await addNews(payload);
        toast.success("News added successfully.");
      }
      navigate("/admin/news-story-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} news. Please try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{isEditMode ? "Update News" : "Add New News"}</h1>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert
              variant="destructive"
              className="alert-custom mb-4 bg-[#FDF7EC]"
            >
              <AlertCircleIcon size={18} />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          {fetching ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            </div>
          ) : (
            <>
              <div className="form-admin">
                <div className="form-group w-full">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_announcement"
                      checked={formField.is_announcement}
                      onChange={(e) =>
                        setFormField((prev) => ({
                          ...prev,
                          is_announcement: e.target.checked,
                          is_featured: e.target.checked,
                        }))
                      }
                    />
                    Is announcement ?
                  </label>
                </div>
                <div className="form-group w-half">
                  <label>
                    <Text size={16} /> Title <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="title"
                    value={formField.title}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                {formField.is_announcement ? (
                  ""
                ) : (
                  <div className="form-group w-half">
                    <label>
                      <FileText size={16} /> News Type
                      <span>*</span>
                    </label>
                    <select
                      name="news_type"
                      className="form-input"
                      value={formField.news_type}
                      onChange={handleChange}
                    >
                      <option value="">Select News Type</option>
                      <option value="contest">Contest</option>
                      <option value="update">Update</option>
                      <option value="results">Results</option>
                      <option value="event">Event</option>
                      <option value="resource">Resource</option>
                    </select>
                  </div>
                )}
                {formField.is_announcement ? (
                  ""
                ) : (
                  <div className="form-group w-half">
                    <label>
                      <FileType2 size={16} /> Category
                      <span>*</span>
                    </label>
                    <select
                      name="enrollment_category"
                      className="form-input"
                      value={formField.enrollment_category}
                      onChange={handleChange}
                    >
                      <option value="">Select Category</option>
                      <option value="RMC">RMC</option>
                      <option value="VSS">VSS</option>
                      <option value="PMC">PMC</option>
                      <option value="ILM">ILM</option>
                    </select>
                  </div>
                )}

                <div className="form-group w-half">
                  <label>
                    <ShieldCheck size={16} /> Status <span>*</span>
                  </label>
                  <select
                    name="is_published"
                    className="form-input"
                    value={formField.is_published}
                    onChange={handleChange}
                  >
                    <option value="">Select Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                  </select>
                </div>
                {formField.is_announcement ? (
                  ""
                ) : (
                  <div className="form-group w-half">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_featured"
                        checked={formField.is_featured}
                        onChange={(e) =>
                          setFormField((prev) => ({
                            ...prev,
                            is_featured: e.target.checked,
                          }))
                        }
                      />
                      Is featured ?
                    </label>
                  </div>
                )}

                <div className="form-group w-full">
                  <label>
                    <Text size={16} /> Short Description (optional)
                  </label>

                  <CKEditor
                    key={`short-description-${editorKey}`}
                    className="form-input"
                    editor={ClassicEditor}
                    data={formField.short_description}
                    config={{
                      toolbar: {
                        removeItems: ["uploadImage", "mediaEmbed"],
                      },
                      // ...rest of your config
                    }}
                    onChange={(event, editor) => {
                      handleChange({
                        target: {
                          name: "short_description",
                          value: editor.getData(),
                        },
                      });
                    }}
                  />
                </div>
                {formField.is_announcement ? (
                  ""
                ) : (
                  <div className="form-group w-full">
                    <label>
                      <Text size={16} /> Content <span>*</span>
                    </label>

                    <CKEditor
                      key={`content-${editorKey}`}
                      className="form-input"
                      editor={ClassicEditor}
                      data={formField.content}
                      config={editorConfig}
                      onChange={(event, editor) => {
                        handleChange({
                          target: {
                            name: "content",
                            value: editor.getData(),
                          },
                        });
                      }}
                    />
                  </div>
                )}
                {formField.is_announcement ? (
                  ""
                ) : (
                  <div className="form-group w-full">
                    <ImageUpload
                      accept={["image", "video"]}
                      value={existingUrls}
                      multiple
                      onChange={(files) =>
                        setFormField((prev) => ({
                          ...prev,
                          // files is already the mixed array [url, url, File, File]
                          // from ImageUpload's buildMixed()
                          media: Array.isArray(files)
                            ? files
                            : files
                              ? [files]
                              : [],
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="form-button-row">
                <button
                  type="button"
                  className="global-btn secondary flex items-center justify-center gap-1"
                  onClick={() => navigate(-1)}
                >
                  <>
                    <X size={18} />
                    Cancel
                  </>
                </button>
                <button
                  type="submit"
                  className="global-btn flex items-center justify-center gap-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      Please wait
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : isEditMode ? (
                    <>
                      Update News
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add News
                      <Plus size={18} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
};

export default NewsStoryForm;
