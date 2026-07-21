import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Text,
  X,
} from "lucide-react";
import {
  addGallery,
  getGalleryById,
  updateGalleryById,
} from "@/api/galleryApi";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

const DEFAULT_FORM = {
  image_path: "",
  event_type: "",
  is_featured: "",
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

const normalizeFeaturedStatus = (value) => {
  if (value === true) return "published";
  if (value === false) return "draft";
  const normalized = safeTrimString(value);
  return normalized ? normalized.toLowerCase() : "";
};

// Main Component
const GalleryForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateGallery = state?.gallery;
  const galleryId = paramsId || state?.galleryId || fallbackStateGallery?.id;
  const isEditMode = Boolean(galleryId);

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    ...(fallbackStateGallery || {}),
    title: fallbackStateGallery?.title ?? DEFAULT_FORM.title,
    image_path:
      fallbackStateGallery?.image_path ??
      fallbackStateGallery?.image_url ??
      DEFAULT_FORM.image_path,
    is_featured: normalizeFeaturedStatus(
      fallbackStateGallery?.is_featured ?? DEFAULT_FORM.is_featured,
    ),
  }));
  const [imageFile, setImageFile] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState(() =>
    buildBackendFileUrl(
      fallbackStateGallery?.image_path ?? fallbackStateGallery?.image_url ?? "",
    ),
  );
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");

  // Fetch gallery data when editing
  React.useEffect(() => {
    if (!isEditMode || !galleryId) return;

    const fetchStaff = async () => {
      try {
        setFetching(true);
        const result = await getGalleryById(galleryId);
        const data = result?.data ?? result ?? {};
        setFormField((prev) => ({
          ...prev,
          event_type: data.event_type ?? "",
          image_path: data.image_path ?? data.image_url ?? "",
          is_featured: normalizeFeaturedStatus(data.is_featured),
        }));
      } catch (err) {
        const message =
          err?.message || "Unable to load gallery details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchStaff();
  }, [isEditMode, galleryId]);

  React.useEffect(() => {
    if (!imageFile) return undefined;
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  React.useEffect(() => {
    if (imageFile) return;
    setImagePreview(buildBackendFileUrl(formField.image_path ?? ""));
  }, [formField.image_path, imageFile]);

  // Handle input change
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setImageFile(file ?? null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedStatus = safeTrimString(formField.is_featured).toLowerCase();

    if (!trimmedStatus) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    if (!isEditMode && !imageFile) {
      const message = "Please upload an image.";
      toast.error(message);
      setError(message);
      return;
    }

    const isFeatured = trimmedStatus === "published";
    let payload;

    if (imageFile) {
      const formData = new FormData();
      formData.append("event_type", formField.event_type);
      formData.append("is_featured", isFeatured ? 1 : 0);
      formData.append("image", imageFile);
      payload = formData;
    } else {
      payload = {
        is_featured: isFeatured,
        event_type: formField.event_type,
      };
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateGalleryById(galleryId, payload);
        toast.success("Gallery updated successfully.");
      } else {
        await addGallery(payload);
        toast.success("Gallery added successfully.");
      }
      navigate("/admin/gallery-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} gallery. Please try again.`;
      setError(message);
      console.log(err);
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
          <h1>{isEditMode ? "Update Image" : "Add New Image"}</h1>
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
                <div className="form-group w-half">
                  <label>
                    <ShieldCheck size={16} /> Type <span>*</span>
                  </label>
                  <select
                    name="event_type"
                    className="form-input"
                    value={formField.event_type}
                    onChange={handleChange}
                  >
                    <option value="">Select Type</option>
                    <option value="rmc">RMC</option>
                    <option value="pmc">PMC-5</option>
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <ShieldCheck size={16} /> Status <span>*</span>
                  </label>
                  <select
                    name="is_featured"
                    className="form-input"
                    value={formField.is_featured}
                    onChange={handleChange}
                  >
                    <option value="">Select Status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div className="form-group w-full">
                  <label>
                    <ImageIcon size={16} /> Image
                    <span>*</span>
                  </label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading}
                  />
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Gallery preview"
                      className="mt-2 h-24 w-32 rounded-md object-cover"
                    />
                  ) : null}
                </div>
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
                      Update Image
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Image
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

export default GalleryForm;
