import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import {
  AlertCircleIcon,
  Loader2,
  Mail,
  Plus,
  Save,
  Text,
  TextInitial,
  X,
} from "lucide-react";
import {
  addFaculty,
  getFacultyById,
  updateFacultyById,
} from "@/api/facultyApi";
import ImageUpload from "@/components/ImageUpload";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

const DEFAULT_FORM = {
  name: "",
  title: "",
  email: "",
  description: "",
  image: null,
  image_url: "",
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

const FacultyForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateFaculty = state?.faculty;
  const facultyId = paramsId || state?.facultyId || fallbackStateFaculty?.id;
  const isEditMode = Boolean(facultyId);

  const mapFacultyToForm = (data = {}) => ({
    name: data.name ?? "",
    title: data.title ?? "",
    email: data.email ?? "",
    description: data.description ?? "",
    image: null,
    image_url: data.image_url ?? data.image ?? "",
  });

  const [formField, setFormField] = React.useState(() =>
    fallbackStateFaculty
      ? { ...DEFAULT_FORM, ...mapFacultyToForm(fallbackStateFaculty) }
      : { ...DEFAULT_FORM },
  );
  // NEW: track whether the user explicitly removed the existing image
  const [imageRemoved, setImageRemoved] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [editorKey, setEditorKey] = React.useState(0);

  React.useEffect(() => {
    if (!isEditMode || !facultyId) return;

    const fetchFaculty = async () => {
      try {
        setFetching(true);
        const result = await getFacultyById(facultyId);
        const data = result?.data ?? result ?? {};
        setFormField((prev) => ({ ...prev, ...mapFacultyToForm(data) }));
        setImageRemoved(false); // reset on fresh load
        setEditorKey((key) => key + 1);
      } catch (err) {
        const message =
          err?.message || "Unable to load faculty details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchFaculty();
  }, [isEditMode, facultyId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  // NEW: handles both new-file selection AND removal
  const handleImageChange = (file) => {
    if (file) {
      // user picked a new file
      setFormField((prev) => ({ ...prev, image: file, image_url: "" }));
      setImageRemoved(false);
    } else {
      // user removed the image
      setFormField((prev) => ({ ...prev, image: null, image_url: "" }));
      setImageRemoved(true);
    }
  };

  const previewUrl = React.useMemo(
    () =>
      formField.image_url && !imageRemoved
        ? buildBackendFileUrl(formField.image_url)
        : "",
    [formField.image_url, imageRemoved],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedName = safeTrimString(formField.name);
    const trimmedTitle = safeTrimString(formField.title);
    const trimmedEmail = safeTrimString(formField.email);
    const trimmedDescription = safeTrimString(formField.description);

    if (!trimmedName || !trimmedTitle || !trimmedEmail || !trimmedDescription) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = new FormData();
    payload.append("name", trimmedName);
    payload.append("title", trimmedTitle);
    payload.append("email", trimmedEmail);
    payload.append("description", trimmedDescription);

    if (formField.image instanceof File) {
      payload.append("image", formField.image);
    } else if (imageRemoved) {
      // NEW: explicitly tell the backend to clear the existing image
      payload.append("remove_image", "1");
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateFacultyById(facultyId, payload);
        toast.success("Faculty updated successfully.");
      } else {
        await addFaculty(payload);
        toast.success("Faculty added successfully.");
      }
      navigate("/admin/faculty-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} faculty. Please try again.`;
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
          <h1>{isEditMode ? "Update Faculty" : "Add New Faculty"}</h1>
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
                  <label>
                    <TextInitial size={16} /> Image
                  </label>
                  <ImageUpload
                    accept={["image"]}
                    value={previewUrl || null}
                    maxSizeMb={5}
                    onChange={handleImageChange}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Text size={16} /> Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    value={formField.name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <TextInitial size={16} /> Title <span>*</span>
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

                <div className="form-group w-half">
                  <label>
                    <Mail size={16} /> Email <span>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    name="email"
                    value={formField.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-full">
                  <label>
                    <Text size={16} /> Description <span>*</span>
                  </label>
                  <CKEditor
                    key={editorKey}
                    config={{
                      toolbar: {
                        removeItems: ["uploadImage", "mediaEmbed"],
                      },
                    }}
                    className="form-input"
                    editor={ClassicEditor}
                    data={formField.description}
                    onChange={(event, editor) => {
                      handleChange({
                        target: {
                          name: "description",
                          value: editor.getData(),
                        },
                      });
                    }}
                  />
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
                      Update Faculty
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Faculty
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

export default FacultyForm;
