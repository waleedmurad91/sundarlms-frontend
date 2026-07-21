import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Book,
  BookA,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";
import { getAllClasses } from "@/api/classApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import {
  addSubject,
  getSubjectById,
  updateSubjectById,
} from "@/api/subjectApi";

const DEFAULT_FORM = {
  grade_id: "",
  subject: "",
  code: "",
  grade_label: "",
  image: "",
  description: "",
  subject_name_urdu: "",
  subject_name_sindhi: "",
  subject_description_urdu: "",
  subject_description_sindhi: "",
};

const IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "bmp",
  "avif",
];

const BACKEND_FILE_BASE_PATH =
  import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? "";

const isAbsoluteAssetUrl = (value = "") => {
  if (!value || typeof value !== "string") {
    return false;
  }
  return (
    value.startsWith("blob:") ||
    value.startsWith("data:") ||
    /^https?:\/\//i.test(value)
  );
};

const resolveBackendFileUrl = (value = "") => {
  if (!value || typeof value !== "string") {
    return "";
  }
  if (isAbsoluteAssetUrl(value)) {
    return value;
  }
  if (!BACKEND_FILE_BASE_PATH) {
    return value;
  }
  const baseEndsWithSlash = BACKEND_FILE_BASE_PATH.endsWith("/");
  const valueStartsWithSlash = value.startsWith("/");
  if (baseEndsWithSlash && valueStartsWithSlash) {
    return `${BACKEND_FILE_BASE_PATH}${value.slice(1)}`;
  }
  if (!baseEndsWithSlash && !valueStartsWithSlash) {
    return `${BACKEND_FILE_BASE_PATH}/${value}`;
  }
  return `${BACKEND_FILE_BASE_PATH}${value}`;
};

const extractMediaPath = (input) => {
  if (!input) {
    return "";
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const resolved = extractMediaPath(item);
      if (resolved) {
        return resolved;
      }
    }
    return "";
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      return "";
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractMediaPath(parsed);
      } catch (err) {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (input instanceof File) {
    return "";
  }

  if (typeof input === "object") {
    const candidate =
      input?.url ??
      input?.path ??
      input?.file ??
      input?.link ??
      input?.location ??
      input?.src ??
      input?.value ??
      input?.image ??
      input?.images ??
      input?.icon ??
      input?.icon_image ??
      input?.iconImage ??
      null;
    return extractMediaPath(candidate);
  }

  return "";
};

const getExtension = (name = "") => {
  const segments = name.split(".");
  if (segments.length <= 1) {
    return "";
  }
  return segments.pop().toLowerCase();
};

const getFileNameFromUrl = (url = "") => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.split("/").filter(Boolean).pop() || url;
  } catch (err) {
    return url.split("/").filter(Boolean).pop() || url;
  }
};

const normaliseSubject = (payload) => {
  if (!payload) {
    return { ...DEFAULT_FORM };
  }

  // API returns { status: true, data: { ... } }
  const data = payload?.data ?? payload;
  const user = data?.user ?? {};

  const gradeCandidates = [];
  let detectedGradeLabel =
    data?.grade?.name ??
    data?.grade_name ??
    data?.gradeName ??
    data?.class_name ??
    data?.className ??
    "";

  const pushCandidate = (candidate) => {
    if (candidate === null || candidate === undefined) {
      return;
    }

    if (typeof candidate === "string" || typeof candidate === "number") {
      const trimmed = String(candidate).trim();
      if (trimmed) {
        gradeCandidates.push(trimmed);
      }
      return;
    }

    if (!detectedGradeLabel) {
      detectedGradeLabel =
        candidate?.name ??
        candidate?.grade_name ??
        candidate?.gradeName ??
        candidate?.class_name ??
        candidate?.className ??
        detectedGradeLabel;
    }

    const resolved =
      candidate?.id ??
      candidate?._id ??
      candidate?.value ??
      candidate?.grade_id ??
      candidate?.gradeId ??
      candidate?.class_id ??
      candidate?.classId ??
      null;

    if (resolved === null || resolved === undefined) {
      return;
    }

    const trimmed = String(resolved).trim();
    if (trimmed) {
      gradeCandidates.push(trimmed);
    }
  };

  pushCandidate(data?.grade_id);
  pushCandidate(data?.gradeId);
  pushCandidate(data?.grade_ids?.[0]);
  pushCandidate(data?.gradeIds?.[0]);
  pushCandidate(data?.class_id);
  pushCandidate(data?.classId);
  pushCandidate(data?.class);
  pushCandidate(data?.school_class);
  pushCandidate(data?.school_class_id);
  pushCandidate(data?.schoolClassId);

  if (Array.isArray(data?.grade_ids)) {
    data.grade_ids.forEach(pushCandidate);
  }
  if (Array.isArray(data?.gradeIds)) {
    data.gradeIds.forEach(pushCandidate);
  }
  if (Array.isArray(data?.class_ids)) {
    data.class_ids.forEach(pushCandidate);
  }
  if (Array.isArray(data?.classIds)) {
    data.classIds.forEach(pushCandidate);
  }
  if (Array.isArray(data?.classes)) {
    data.classes.forEach(pushCandidate);
  }

  pushCandidate(data?.grade);
  pushCandidate(data?.class);
  pushCandidate(data?.school_class);

  const resolvedGradeId = gradeCandidates.find(Boolean) ?? "";

  const imagePath = extractMediaPath(
    data?.image ??
      data?.image_path ??
      data?.image_url ??
      data?.imageUrl ??
      data?.subject_image ??
      data?.subjectImage ??
      data?.icon ??
      data?.icon_image ??
      data?.iconImage ??
      data?.images ??
      data?.thumbnail ??
      user?.image ??
      user?.images,
  );

  return {
    grade_id: resolvedGradeId,
    subject: data?.subject ?? data?.name ?? user?.subject ?? user?.name ?? "",
    code:
      data?.code ??
      data?.subject_code ??
      data?.subjectCode ??
      user?.code ??
      user?.subject_code ??
      "",
    grade_label:
      detectedGradeLabel || (resolvedGradeId ? `Class ${resolvedGradeId}` : ""),
    image: imagePath,
    description:
      data?.description ??
      data?.details ??
      data?.about ??
      user?.description ??
      "",
    // API fields: title_urdu, title_sindhi, description_urdu, description_sindhi
    subject_name_urdu: data?.subject_urdu ?? data?.subject_name_urdu ?? "",
    subject_name_sindhi: data?.subject_sindhi ?? data?.subject_name_sindhi ?? "",
    subject_description_urdu:
      data?.description_urdu ?? data?.subject_description_urdu ?? "",
    subject_description_sindhi:
      data?.description_sindhi ?? data?.subject_description_sindhi ?? "",
  };
};

const resolveClasses = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  return [];
};

const getClassLabel = (cls) => {
  const grade = cls?.grade ?? cls?.name ?? "";
  const label = [grade].filter(Boolean).join(" - ");
  return label || cls?.label || "Untitled Class";
};

const SubjectForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateSubject = state?.subject;
  const subjectId =
    paramsId ||
    state?.subjectId ||
    fallbackStateSubject?.id ||
    fallbackStateSubject?._id;
  const isEditMode = Boolean(subjectId);

  const [formField, setFormField] = React.useState(() =>
    normaliseSubject(fallbackStateSubject),
  );
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [classes, setClasses] = React.useState([]);
  const [classesLoading, setClassesLoading] = React.useState(false);
  const [schools, setSchools] = React.useState([]);
  const [schoolsLoading, setSchoolsLoading] = React.useState(false);
  const imageInputRef = React.useRef(null);
  const [imageFile, setImageFile] = React.useState(null);
  const [removeImage, setRemoveImage] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState("");

  React.useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile);
      setImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    const previewSrc =
      typeof formField.image === "string"
        ? resolveBackendFileUrl(formField.image)
        : "";
    setImagePreview(previewSrc);
    return undefined;
  }, [imageFile, formField.image]);

  React.useEffect(() => {
    const fetchClasses = async () => {
      setClassesLoading(true);
      try {
        const response = await getAllClasses();
        setClasses(resolveClasses(response));
      } catch (err) {
        const message =
          err?.message || "Unable to load classes. Please try again.";
        toast.error(message);
      } finally {
        setClassesLoading(false);
      }
    };

    fetchClasses();
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !subjectId) {
      return;
    }

    let isCancelled = false;

    const fetchSubject = async () => {
      try {
        setFetching(true);
        const result = await getSubjectById(subjectId);
        if (!isCancelled) {
          setFormField(normaliseSubject(result));
          setImageFile(null);
          if (imageInputRef.current) {
            imageInputRef.current.value = "";
          }
        }
      } catch (err) {
        if (isCancelled) {
          return;
        }
        const message =
          err?.message || "Unable to load subject details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (!isCancelled) {
          setFetching(false);
        }
      }
    };

    fetchSubject();

    return () => {
      isCancelled = true;
    };
  }, [isEditMode, subjectId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const isImageFile =
      (typeof file.type === "string" && file.type.startsWith("image/")) ||
      IMAGE_EXTENSIONS.includes(getExtension(file.name));

    if (!isImageFile) {
      toast.error("Please upload a valid image (PNG, JPG, SVG, or WEBP).");
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleClearImage = () => {
    if (imageFile) {
      setImageFile(null);
    } else {
      setFormField((prev) => ({ ...prev, image: "" }));
       setRemoveImage(true);
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleClassChange = (value) => {
    const stringValue = value || "";
    setFormField((prev) => {
      if (!stringValue) {
        return { ...prev, grade_id: "", grade_label: "" };
      }
      const selectedOption = classOptions.find(
        (option) => option.value === stringValue,
      );
      return {
        ...prev,
        grade_id: stringValue,
        grade_label: selectedOption?.label ?? `Class ${stringValue}`,
      };
    });
  };

  const schoolNameMap = React.useMemo(() => {
    const map = new Map();
    schools.forEach((school) => {
      const id =
        school?._id ??
        school?.id ??
        school?.value ??
        school?.school_id ??
        school?.schoolId;
      if (!id) {
        return;
      }
      const label =
        school?.name ??
        school?.label ??
        school?.school_name ??
        school?.title ??
        String(id);
      map.set(String(id), label);
    });
    return map;
  }, [schools]);

  const classOptions = React.useMemo(() => {
    const options = [];

    classes.forEach((cls) => {
      const id =
        cls?._id ?? cls?.id ?? cls?.value ?? cls?.class_id ?? cls?.classId;
      if (!id) {
        return;
      }

      const schoolRef =
        cls?.school_id ??
        cls?.schoolId ??
        cls?.school?.id ??
        cls?.school?._id ??
        cls?.school?.value ??
        cls?.school;

      const schoolName =
        cls?.school?.name ??
        cls?.school_name ??
        cls?.schoolName ??
        (schoolRef ? schoolNameMap.get(String(schoolRef)) : "") ??
        "";

      const classLabel = getClassLabel(cls);
      const detailParts = [classLabel].filter(Boolean).join(" - ");
      const labelParts = [schoolName, detailParts || classLabel]
        .filter(Boolean)
        .map((part) => part.trim());
      const label = labelParts.join(" - ") || classLabel || `Class ${id}`;
      const value = String(id);
      options.push({ value, label });
    });

    if (
      formField.grade_id &&
      !options.some((option) => option.value === formField.grade_id)
    ) {
      options.push({
        value: formField.grade_id,
        label: formField.grade_label || `Class ${formField.grade_id}`,
      });
    }

    return options;
  }, [classes, schoolNameMap, formField.grade_id, formField.grade_label]);

  const hasImageSelection = React.useMemo(
    () => Boolean(imageFile || formField.image),
    [imageFile, formField.image],
  );

  const imageLabel = React.useMemo(() => {
    if (imageFile?.name) {
      return imageFile.name;
    }
    if (typeof formField.image === "string" && formField.image) {
      return getFileNameFromUrl(formField.image) || formField.image || "";
    }
    return "";
  }, [imageFile, formField.image]);

  const canPreviewImage = React.useMemo(() => {
    if (!imagePreview) {
      return false;
    }
    return /^(blob:|data:|https?:\/\/|\/)/i.test(imagePreview);
  }, [imagePreview]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formField.grade_id) {
      const message = "Please select a class.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.subject.trim()) {
      const message = "Subject name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    const payload = new FormData();
    payload.append("subject", formField.subject.trim());
    payload.append("code", formField.code.trim());
    payload.append("description", formField.description.trim());
    // API expects: title_urdu, title_sindhi, description_urdu, description_sindhi
    payload.append("subject_urdu", formField.subject_name_urdu.trim());
    payload.append("subject_sindhi", formField.subject_name_sindhi.trim());
    payload.append(
      "description_urdu",
      formField.subject_description_urdu.trim(),
    );
    payload.append(
      "description_sindhi",
      formField.subject_description_sindhi.trim(),
    );

    if (formField.grade_id) {
      const numericId = Number(formField.grade_id);
      const resolvedId = Number.isNaN(numericId)
        ? formField.grade_id
        : numericId;
      payload.append("grade_ids[]", resolvedId);
    }

    if (imageFile instanceof File) {
      payload.append("image", imageFile);
    } else if (removeImage) {
      payload.append("remove_image", "1")
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateSubjectById(subjectId, payload);
        toast.success("Subject updated successfully.");
      } else {
        await addSubject(payload);
        toast.success("Subject added successfully.");
      }
      navigate("/admin/subject-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} subject. Please try again.`;
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
          <h1>{isEditMode ? "Update Subject" : "Add New Subject"}</h1>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <form onSubmit={handleSubmit} encType="multipart/form-data">
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
                {/* ── Class & Subject Name (English) ── */}
                <div className="form-group w-half">
                  <label>
                    <Book size={16} /> Classes<span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={classOptions}
                    multiple={false}
                    value={formField.grade_id}
                    onChange={handleClassChange}
                    placeholder="Search classes..."
                    loading={classesLoading || schoolsLoading}
                    disabled={loading || classesLoading || schoolsLoading}
                    emptyState="No classes available"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <BookA size={16} /> Subject Name<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="subject"
                    placeholder="Enter subject name"
                    value={formField.subject}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                {/* ── Subject Name Urdu & Sindhi ── */}
                <div className="form-group w-half">
                  <label>
                    <BookA size={16} /> Subject Name{" "}
                    <span className="font-nastaleeq !text-xs">(اردو)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input font-nastaleeq text-right h-15"
                    name="subject_name_urdu"
                    placeholder="مضمون کا نام"
                    value={formField.subject_name_urdu}
                    onChange={handleChange}
                    disabled={loading}
                    dir="rtl"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <BookA size={16} /> Subject Name{" "}
                    <span className="font-lateefi !text-xs">(سنڌي)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input font-lateefi text-right h-15"
                    name="subject_name_sindhi"
                    placeholder="مضمون جو نالو"
                    value={formField.subject_name_sindhi}
                    onChange={handleChange}
                    disabled={loading}
                    dir="rtl"
                  />
                </div>

                {/* ── Subject Image ── */}
                <div className="form-group w-half">
                  <label>
                    <ImageIcon size={16} /> Subject Image
                  </label>
                  <div className="upload-box">
                    <input
                      type="file"
                      className="form-input"
                      accept="image/*"
                      onChange={handleImageUpload}
                      name="image"
                      disabled={loading}
                      ref={imageInputRef}
                    />
                    <p
                      className="form-hint text-[0.85rem] text-gray-500"
                      style={{ marginTop: ".5rem" }}
                    >
                      Upload PNG, JPG, SVG, or WEBP files.
                    </p>
                  </div>
                  {hasImageSelection ? (
                    <div className="mt-4 flex items-center gap-4">
                      {canPreviewImage && (
                        <img
                          src={imagePreview}
                          alt="Subject preview"
                          className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {imageLabel || "Image attached"}
                        </p>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#A22038]"
                          onClick={handleClearImage}
                          disabled={loading}
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* ── Descriptions ── */}
                <div className="form-group w-full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    className="form-input"
                    placeholder="Add a short description"
                    value={formField.description}
                    onChange={handleChange}
                    rows={4}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-full">
                  <label>
                    Description <span className="font-nastaleeq">(اردو)</span>
                  </label>
                  <textarea
                    name="subject_description_urdu"
                    className="form-input font-nastaleeq text-right"
                    placeholder="مختصر تفصیل درج کریں"
                    value={formField.subject_description_urdu}
                    onChange={handleChange}
                    rows={4}
                    disabled={loading}
                    dir="rtl"
                  />
                </div>

                <div className="form-group w-full">
                  <label>
                    Description <span className="font-lateefi">(سنڌي)</span>
                  </label>
                  <textarea
                    name="subject_description_sindhi"
                    className="form-input font-lateefi text-right"
                    placeholder="مختصر تفصيل داخل ڪريو"
                    value={formField.subject_description_sindhi}
                    onChange={handleChange}
                    rows={4}
                    disabled={loading}
                    dir="rtl"
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
                      Update Subject
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Subject
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

export default SubjectForm;
