import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  FileType2,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";
import {
  addSlider,
  getSliderByPageType,
  updateSliderByPageType,
} from "@/api/sliderApi";
import ImageUpload from "@/components/ImageUpload";

const PAGE_TYPE_OPTIONS = [
  { value: "vss", label: "VSS" },
  { value: "rmc", label: "RMC" },
  { value: "pmc", label: "PMC" },
  { value: "ilm", label: "ILM" },
];

const DEFAULT_FORM = {
  page_type: "",
  images: [],
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

const normalizeImagesFromApi = (data = {}) => {
  const raw =
    (Array.isArray(data.images) && data.images.length > 0
      ? data.images
      : data.image_urls) ?? [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return (item.url ?? item.path ?? item.image ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
};

const SliderForm = () => {
  const navigate = useNavigate();
  const { pageType: paramsPageType } = useParams();
  const { state } = useLocation();

  const fallbackStateSlider = state?.slider;
  const pageType =
    paramsPageType ||
    state?.pageType ||
    fallbackStateSlider?.page_type ||
    fallbackStateSlider?.pageType;
  const isEditMode = Boolean(pageType);

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    page_type: pageType ?? "",
    ...(fallbackStateSlider || {}),
  }));
  const [initialImages, setInitialImages] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!isEditMode || !pageType) return;

    const fetchSlider = async () => {
      try {
        setFetching(true);
        const result = await getSliderByPageType(pageType);
        const data = result?.data ?? result ?? {};
        const images = normalizeImagesFromApi(data);

        setInitialImages(images);
        setFormField({
          page_type: data.page_type ?? pageType,
          images,
        });
      } catch (err) {
        const message =
          err?.message || "Unable to load slider details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchSlider();
  }, [isEditMode, pageType]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const existingUrls = React.useMemo(
    () => (formField.images ?? []).filter((item) => typeof item === "string"),
    [formField.images],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedPageType = safeTrimString(formField.page_type).toLowerCase();
    const imageItems = formField.images ?? [];
    const remainingPaths = imageItems.filter((item) => typeof item === "string");
    const newFiles = imageItems.filter((item) => item instanceof File);

    if (!trimmedPageType) {
      const message = "Please select a page type.";
      toast.error(message);
      setError(message);
      return;
    }

    if (!isEditMode && newFiles.length === 0) {
      const message = "Please upload at least one image.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = new FormData();

    if (isEditMode) {
      const removedImages = initialImages.filter(
        (imagePath) => !remainingPaths.includes(imagePath),
      );

      removedImages.forEach((imagePath) =>
        payload.append("remove_images[]", imagePath),
      );
      newFiles.forEach((file) => payload.append("images[]", file));

      if (remainingPaths.length === 0 && newFiles.length === 0) {
        payload.append("replace_images", 1);
      }
    } else {
      payload.append("page_type", trimmedPageType);
      newFiles.forEach((file) => payload.append("images[]", file));
    }

    try {
      setLoading(true);

      if (isEditMode) {
        await updateSliderByPageType(pageType, payload);
        toast.success("Slider updated successfully.");
      } else {
        await addSlider(payload);
        toast.success("Slider added successfully.");
      }

      navigate("/admin/sliders");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} slider. Please try again.`;
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
          <h1>{isEditMode ? "Update Slider" : "Add New Slider"}</h1>
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
                    <FileType2 size={16} /> Page Type <span>*</span>
                  </label>
                  <select
                    name="page_type"
                    className="form-input"
                    value={formField.page_type}
                    onChange={handleChange}
                    disabled={loading || isEditMode}
                  >
                    <option value="">Select Page Type</option>
                    {PAGE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group w-full">
                  <label>Slider Images {isEditMode ? "" : <span>*</span>}</label>
                  <ImageUpload
                    accept={["image"]}
                    value={existingUrls}
                    multiple
                    maxSizeMb={20}
                    onChange={(files) =>
                      setFormField((prev) => ({
                        ...prev,
                        images: Array.isArray(files)
                          ? files
                          : files
                            ? [files]
                            : [],
                      }))
                    }
                  />
                </div>
              </div>

              <div className="form-button-row">
                <button
                  type="button"
                  className="global-btn secondary flex items-center justify-center gap-1"
                  onClick={() => navigate(-1)}
                >
                  <X size={18} />
                  Cancel
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
                      Update Slider
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Slider
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

export default SliderForm;
