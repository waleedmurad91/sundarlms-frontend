import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Paperclip,
  X,
  Image,
  BookOpen,
  Book,
  BookA,
  File as FileIcon,
  Link as LinkIcon,
  AlignVerticalDistributeCenter,
} from "lucide-react";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import { getAllSubjects } from "@/api/subjectApi";
import { getAllClasses } from "@/api/classApi";
import { addUnit, getUnitById, updateUnitById } from "@/api/unitApi";
import MathEditor from "@/components/MathEditor";

const MAX_MATERIAL_SIZE_MB = 50;
const MAX_MATERIAL_SIZE_BYTES = MAX_MATERIAL_SIZE_MB * 1024 * 1024;
const VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "ogg",
  "ogv",
  "mpeg",
  "mpg",
  "m4v",
  "3gp",
  "3g2",
];
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
const WORD_EXTENSIONS = ["doc", "docx"];
const DOCUMENT_EXTENSIONS = ["pdf", ...WORD_EXTENSIONS];

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
      } catch {
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

const isVideoFile = (file) => {
  if (!file) {
    return false;
  }
  if (typeof file?.type === "string" && file.type.startsWith("video/")) {
    return true;
  }
  return VIDEO_EXTENSIONS.includes(getExtension(file?.name));
};

const isDocumentFile = (file) => {
  if (!file) {
    return false;
  }

  if (file?.type === "application/pdf") {
    return true;
  }

  if (
    file?.type === "application/msword" ||
    file?.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }

  return DOCUMENT_EXTENSIONS.includes(getExtension(file?.name));
};

const isImageFile = (file) => {
  if (!file) {
    return false;
  }
  if (typeof file?.type === "string" && file.type.startsWith("image/")) {
    return true;
  }
  return IMAGE_EXTENSIONS.includes(getExtension(file?.name));
};

const isValidLearningMaterialFile = (file) =>
  isDocumentFile(file) || isImageFile(file) || isVideoFile(file);

const normaliseIconImage = (value) => {
  if (!value) {
    return "";
  }

  if (value instanceof File) {
    return "";
  }

  const candidate =
    value?.images ??
    value?.icon_image ??
    value?.iconImage ??
    value?.icon ??
    value?.value ??
    value;

  return extractMediaPath(candidate);
};

const getFileNameFromUrl = (url = "") => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.split("/").filter(Boolean).pop() || url;
  } catch {
    return url.split("/").filter(Boolean).pop() || url;
  }
};

const parseArrayValue = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }

  if (typeof value === "object") {
    return [value];
  }

  return [];
};

const normaliseLearningMaterials = (value) => {
  return parseArrayValue(value)
    .map((item) => {
      if (!item) {
        return null;
      }

      if (item instanceof File) {
        return item;
      }

      if (typeof item === "string") {
        return {
          name: getFileNameFromUrl(item),
          url: item,
        };
      }

      if (typeof item === "object") {
        const url =
          item?.url ??
          item?.path ??
          item?.file ??
          item?.link ??
          item?.location ??
          item?.src ??
          item?.value ??
          "";

        const name =
          item?.name ??
          item?.original_name ??
          item?.file_name ??
          getFileNameFromUrl(url) ??
          "Learning Material";

        return {
          ...item,
          name: name || "Learning Material",
          url,
        };
      }

      return null;
    })
    .filter(Boolean);
};

const getLearningMaterialUrlValue = (item) => {
  if (!item) {
    return "";
  }
  if (typeof item === "string") {
    return item.trim();
  }
  if (typeof item === "object") {
    return String(
      item?.url ??
        item?.link ??
        item?.href ??
        item?.value ??
        item?.path ??
        "",
    ).trim();
  }
  return String(item ?? "").trim();
};

const getLearningMaterialUrlLabel = (item) => {
  if (!item) {
    return "";
  }
  if (typeof item === "string") {
    return item.trim();
  }
  if (typeof item === "object") {
    const label = String(
      item?.label ?? item?.name ?? item?.title ?? item?.text ?? "",
    ).trim();
    if (label) {
      return label;
    }
  }
  return getLearningMaterialUrlValue(item);
};

const normaliseLearningMaterialUrls = (value) =>
  parseArrayValue(value)
    .map((item) => {
      const url = getLearningMaterialUrlValue(item);
      if (!url) {
        return null;
      }
      const label = getLearningMaterialUrlLabel(item) || url;
      return { label, url };
    })
    .filter(Boolean);

const isValidHttpUrl = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const getMaterialLabel = (material) => {
  if (!material) {
    return "Attachment";
  }

  if (material instanceof File) {
    return material.name || "Attachment";
  }

  if (typeof material === "string") {
    return material;
  }

  if (typeof material === "object") {
    return material.name || getFileNameFromUrl(material.url) || "Attachment";
  }

  return "Attachment";
};

const getMaterialPath = (material) => {
  if (!material || material instanceof File) {
    return "";
  }

  if (typeof material === "string") {
    return material;
  }

  if (typeof material === "object") {
    return (
      material.url ??
      material.path ??
      material.link ??
      material.location ??
      material.src ??
      ""
    );
  }

  return "";
};

const getMaterialLink = (material) => {
  const path = getMaterialPath(material);
  return resolveBackendFileUrl(path);
};

const DEFAULT_FORM = {
  classId: "",
  subjectId: "",
  unit_name: "",
  learning_materials: [],
  learning_material_urls: [],
  images: "",
  description: "",
};

const normaliseUnit = (payload) => {
  if (!payload) {
    return { ...DEFAULT_FORM };
  }

  const dataCandidate =
    payload?.data?.data ??
    payload?.data?.unit ??
    payload?.data?.unitData ??
    payload?.data ??
    payload?.unit ??
    payload?.unitData ??
    payload;
  const data = dataCandidate?.data ?? dataCandidate;
  const subjectData = data?.subject ?? {};
  const subjectClassData =
    subjectData?.school_class ??
    subjectData?.schoolClass ??
    subjectData?.class ??
    subjectData?.class_data ??
    subjectData?.classData ??
    {};
  const subjectGradeData =
    subjectData?.grade ??
    subjectData?.grade_data ??
    subjectData?.gradeData ??
    {};
  let subjectRef =
    data?.subject_id ??
    data?.subjectId ??
    data?.subject?.id ??
    data?.subject?._id ??
    data?.subject?.value ??
    data?.subject;

  if (subjectRef && typeof subjectRef === "object") {
    subjectRef =
      subjectRef.id ??
      subjectRef._id ??
      subjectRef.value ??
      subjectRef.subjectId ??
      null;
  }

  const classRef =
    data?.class_id ??
    data?.classId ??
    data?.school_class_id ??
    data?.schoolClassId ??
    subjectData?.school_class_id ??
    subjectData?.schoolClassId ??
    data?.class?.id ??
    data?.class?._id ??
    data?.school_class?.id ??
    data?.school_class?._id ??
    data?.class ??
    subjectClassData?.id ??
    subjectClassData?._id ??
    subjectClassData?.value ??
    subjectClassData?.class_id ??
    subjectClassData?.classId ??
    subjectClassData?.grade_id ??
    subjectClassData?.gradeId ??
    subjectClassData ??
    subjectData?.grade_id ??
    subjectData?.gradeId ??
    subjectGradeData?.id ??
    subjectGradeData?._id ??
    subjectGradeData?.value ??
    subjectGradeData;

  const classData =
    data?.class ??
    data?.school_class ??
    data?.schoolClass ??
    subjectClassData ??
    subjectGradeData ??
    {};

  let resolvedClassId = classRef;
  if (resolvedClassId && typeof resolvedClassId === "object") {
    resolvedClassId =
      resolvedClassId.id ??
      resolvedClassId._id ??
      resolvedClassId.value ??
      resolvedClassId.classId ??
      resolvedClassId.class_id ??
      resolvedClassId.grade_id ??
      resolvedClassId.gradeId ??
      null;
  }

  if (!resolvedClassId) {
    resolvedClassId =
      classData?.id ??
      classData?._id ??
      classData?.value ??
      classData?.class_id ??
      classData?.classId ??
      classData?.grade_id ??
      classData?.gradeId ??
      subjectData?.grade_id ??
      subjectData?.gradeId ??
      null;
  }

  const materialsSource =
    data?.learning_materials ??
    data?.learningMaterials ??
    data?.materials ??
    data?.attachments ??
    data?.resources ??
    [];
  const learningMaterials = normaliseLearningMaterials(materialsSource);
  const urlsSource =
    data?.learning_material_urls ??
    data?.learningMaterialUrls ??
    data?.material_urls ??
    data?.materialUrls ??
    data?.urls ??
    [];
  const learningMaterialUrls = normaliseLearningMaterialUrls(urlsSource);
  const iconImage = normaliseIconImage(
    data?.images ?? data?.icon_image ?? data?.iconImage ?? data?.icon,
  );

  return {
    subjectId: subjectRef ? String(subjectRef) : "",
    classId: resolvedClassId ? String(resolvedClassId) : "",
    unit_name:
      data?.unit_name ??
      data?.title ??
      data?.unit ??
      data?.unit_name ??
      data?.unitName ??
      "",
    learning_materials: learningMaterials,
    learning_material_urls: learningMaterialUrls,
    images: iconImage,
    description: data?.description ?? data?.details ?? "",
  };
};

const resolveSubjects = (payload) => {
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

const getSubjectLabel = (subject) => {
  return (
    subject?.subject ??
    subject?.name ??
    subject?.title ??
    subject?.label ??
    "Untitled Subject"
  );
};

const getSubjectId = (subject) => {
  const id =
    subject?._id ??
    subject?.id ??
    subject?.value ??
    subject?.subject_id ??
    subject?.subjectId;
  return id !== null && id !== undefined ? String(id) : "";
};

const getSubjectClassIds = (subject) => {
  if (!subject) {
    return [];
  }

  const ids = new Set();
  const addCandidate = (candidate) => {
    if (candidate === null || candidate === undefined) {
      return;
    }

    if (typeof candidate === "string" || typeof candidate === "number") {
      const value = String(candidate).trim();
      if (value) {
        ids.add(value);
      }
      return;
    }

    const resolved =
      candidate?.id ??
      candidate?._id ??
      candidate?.value ??
      candidate?.class_id ??
      candidate?.classId ??
      candidate?.school_class_id ??
      candidate?.schoolClassId;

    if (resolved === null || resolved === undefined) {
      return;
    }

    const value = String(resolved).trim();
    if (value) {
      ids.add(value);
    }
  };

  [
    subject?.school_class_id,
    subject?.school_classId,
    subject?.class_id,
    subject?.classId,
    subject?.schoolClassId,
    subject?.class,
    subject?.school_class,
    subject?.grade_id,
    subject?.gradeId,
    subject?.grade?.id,
    subject?.grade?._id,
    subject?.grade?.value,
  ].forEach(addCandidate);

  [
    subject?.school_class_ids,
    subject?.class_ids,
    subject?.classIds,
    subject?.schoolClassIds,
    subject?.classes,
    subject?.school_classes,
    subject?.grade?.classes,
    subject?.grade?.school_classes,
  ].forEach((collection) => {
    if (Array.isArray(collection)) {
      collection.forEach(addCandidate);
    }
  });

  return Array.from(ids);
};

const getClassLabel = (cls) => {
  const gradeName =
    cls?.grade?.name ??
    cls?.name ??
    cls?.title ??
    cls?.grade ??
    (cls?.grade_id ? `Grade ${cls.grade_id}` : "");
  const section = cls?.section ?? cls?.class_section ?? cls?.section_name ?? "";
  const label = [gradeName, section].filter(Boolean).join(" - ");
  return label || cls?.label || "Untitled Class";
};

const getClassId = (cls) => {
  const id =
    cls?._id ??
    cls?.id ??
    cls?.value ??
    cls?.class_id ??
    cls?.classId ??
    cls?.school_class_id;
  return id !== null && id !== undefined ? String(id) : "";
};

const UnitForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateUnit = state?.unit ?? state?.subject ?? null;
  const unitId =
    paramsId ||
    state?.unitId ||
    state?.subjectId ||
    fallbackStateUnit?.id ||
    fallbackStateUnit?._id;
  const isEditMode = Boolean(unitId);

  const [formField, setFormField] = React.useState(() =>
    normaliseUnit(fallbackStateUnit),
  );
  const [removedMaterials, setRemovedMaterials] = React.useState([]);
  const [materialUrlLabelInput, setMaterialUrlLabelInput] = React.useState("");
  const [materialUrlInput, setMaterialUrlInput] = React.useState("");
  const [initialMaterialUrls, setInitialMaterialUrls] = React.useState(
    () =>
      normaliseUnit(fallbackStateUnit).learning_material_urls
        .map((entry) => getLearningMaterialUrlValue(entry))
        .filter(Boolean),
  );
  const [removedMaterialUrls, setRemovedMaterialUrls] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [subjects, setSubjects] = React.useState([]);
  const [subjectsLoading, setSubjectsLoading] = React.useState(false);
  const [classes, setClasses] = React.useState([]);
  const [classesLoading, setClassesLoading] = React.useState(false);
  const iconInputRef = React.useRef(null);
  const [iconFile, setIconFile] = React.useState(null);
  const [iconPreview, setIconPreview] = React.useState("");

  React.useEffect(() => {
    if (iconFile) {
      const objectUrl = URL.createObjectURL(iconFile);
      setIconPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    const previewSrc =
      typeof formField.images === "string"
        ? resolveBackendFileUrl(formField.images)
        : "";
    setIconPreview(previewSrc);
    return undefined;
  }, [iconFile, formField.images]);

  const classSubjectMap = React.useMemo(() => {
    const map = new Map();
    subjects.forEach((subject) => {
      const subjectId = getSubjectId(subject);
      const subjectLabel = getSubjectLabel(subject);
      const classIds = getSubjectClassIds(subject);
      if (!subjectId || !subjectLabel || !classIds.length) {
        return;
      }
      classIds.forEach((classId) => {
        const key = String(classId);
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push({ id: subjectId, label: subjectLabel });
      });
    });
    return map;
  }, [subjects]);

  const classOptions = React.useMemo(() => {
    const options = classes
      .map((cls) => {
        const value = getClassId(cls);
        if (!value) {
          return null;
        }
        const label = getClassLabel(cls) || `Class ${value}`;
        return { value, label };
      })
      .filter(Boolean);

    if (
      formField.classId &&
      !options.some((option) => option.value === formField.classId)
    ) {
      const existingClass = classes.find(
        (cls) => getClassId(cls) === formField.classId,
      );
      const fallbackLabel = existingClass
        ? getClassLabel(existingClass)
        : `Class ${formField.classId}`;
      options.push({
        value: formField.classId,
        label: fallbackLabel || `Class ${formField.classId}`,
      });
    }

    return options;
  }, [classes, formField.classId]);

  const filteredSubjects = React.useMemo(() => {
    if (!formField.classId) {
      return [];
    }

    const matchingSubjects = subjects.filter((subject) => {
      const classIds = getSubjectClassIds(subject);
      if (!classIds.length) {
        return false;
      }
      return classIds.some((classId) => classId === formField.classId);
    });

    if (!formField.subjectId) {
      return matchingSubjects;
    }

    const hasSelectedSubject = matchingSubjects.some((subject) => {
      const id = getSubjectId(subject);
      return id && id === formField.subjectId;
    });

    if (hasSelectedSubject) {
      return matchingSubjects;
    }

    const fallbackSubject = subjects.find((subject) => {
      const id = getSubjectId(subject);
      return id && id === formField.subjectId;
    });

    if (fallbackSubject) {
      return [...matchingSubjects, fallbackSubject];
    }

    return matchingSubjects;
  }, [formField.classId, formField.subjectId, subjects]);

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

    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        const response = await getAllSubjects();
        setSubjects(resolveSubjects(response));
      } catch (err) {
        const message =
          err?.message || "Unable to load subjects. Please try again.";
        toast.error(message);
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchClasses();
    fetchSubjects();
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !unitId) {
      return;
    }

    let isCancelled = false;

    const fetchUnit = async () => {
      try {
        setFetching(true);
        const result = await getUnitById(unitId);
        if (!isCancelled) {
          const normalizedUnit = normaliseUnit(result);
          setFormField(normalizedUnit);
          setInitialMaterialUrls(
            normalizedUnit.learning_material_urls
              .map((entry) => getLearningMaterialUrlValue(entry))
              .filter(Boolean),
          );
          setIconFile(null);
          setRemovedMaterials([]);
          setRemovedMaterialUrls([]);
          setMaterialUrlLabelInput("");
          setMaterialUrlInput("");
          if (iconInputRef.current) {
            iconInputRef.current.value = "";
          }
        }
      } catch (err) {
        if (isCancelled) {
          return;
        }
        const message =
          err?.message || "Unable to load unit details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (!isCancelled) {
          setFetching(false);
        }
      }
    };

    fetchUnit();

    return () => {
      isCancelled = true;
    };
  }, [isEditMode, unitId]);

  const handleClassSelect = React.useCallback(
    (nextValue) => {
      if (isEditMode) {
        return;
      }
      setFormField((prev) => {
        const newClassId = nextValue || "";
        if (newClassId === prev.classId) {
          return prev;
        }
        return {
          ...prev,
          classId: newClassId,
          subjectId: "",
        };
      });
    },
    [isEditMode],
  );

  const _selectedClassSubjects = React.useMemo(() => {
    if (!formField.classId) {
      return [];
    }
    return classSubjectMap.get(formField.classId) ?? [];
  }, [classSubjectMap, formField.classId]);

  const hasIconSelection = React.useMemo(
    () => Boolean(iconFile || formField.images),
    [iconFile, formField.images],
  );

  const iconLabel = React.useMemo(() => {
    if (iconFile?.name) {
      return iconFile.name;
    }
    if (typeof formField.images === "string" && formField.images) {
      return getFileNameFromUrl(formField.images) || formField.images || "";
    }
    return "";
  }, [iconFile, formField.images]);

  const canPreviewIcon = React.useMemo(() => {
    if (!iconPreview) {
      return false;
    }
    return /^(blob:|data:|https?:\/\/|\/)/i.test(iconPreview);
  }, [iconPreview]);

  const handleDescriptionChange = (value) => {
    setFormField((prev) => ({ ...prev, description: value }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => {
      if (name === "classId") {
        if (isEditMode) {
          return prev;
        }

        const shouldResetSubject = value !== prev.classId;
        return {
          ...prev,
          classId: value,
          subjectId: shouldResetSubject ? "" : prev.subjectId,
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleMaterialsUpload = (event) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    const acceptedFiles = [];
    const rejectedByType = [];
    const rejectedBySize = [];

    files.forEach((file) => {
      const isValidType = isValidLearningMaterialFile(file);
      const isValidSize = file.size <= MAX_MATERIAL_SIZE_BYTES;

      if (!isValidType) {
        rejectedByType.push(file.name);
        return;
      }

      if (!isValidSize) {
        rejectedBySize.push(file.name);
        return;
      }

      acceptedFiles.push(file);
    });

    if (rejectedByType.length) {
      toast.error(
        `Unsupported file type: ${rejectedByType.join(
          ", ",
        )}. Please upload PDF, Word, image, or video files.`,
      );
    }

    if (rejectedBySize.length) {
      toast.error(
        `File size exceeds ${MAX_MATERIAL_SIZE_MB}MB: ${rejectedBySize.join(
          ", ",
        )}`,
      );
    }

    if (!acceptedFiles.length) {
      event.target.value = "";
      return;
    }

    setFormField((prev) => ({
      ...prev,
      learning_materials: [...prev.learning_materials, ...acceptedFiles],
    }));

    event.target.value = "";
  };

  const handleIconUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const isValidImageType = isImageFile(file);

    if (!isValidImageType) {
      toast.error("Please upload a valid image (PNG, JPG, SVG, or WEBP).");
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    setIconFile(file);
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleClearIcon = () => {
    if (iconFile) {
      setIconFile(null);
    } else {
      setFormField((prev) => ({
        ...prev,
        images: "",
      }));
    }
    if (iconInputRef.current) {
      iconInputRef.current.value = "";
    }
  };

  const handleRemoveMaterial = (index) => {
    setFormField((prev) => {
      const material = prev.learning_materials[index];
      if (material && !(material instanceof File)) {
        const path = getMaterialPath(material);
        if (path) {
          setRemovedMaterials((prevRemoved) => {
            if (prevRemoved.includes(path)) {
              return prevRemoved;
            }
            return [...prevRemoved, path];
          });
        }
      }
      const nextMaterials = prev.learning_materials.filter(
        (_, idx) => idx !== index,
      );
      return {
        ...prev,
        learning_materials: nextMaterials,
      };
    });
  };

  const handleMaterialUrlInputChange = (event) => {
    setMaterialUrlInput(event.target.value);
  };

  const handleMaterialUrlLabelInputChange = (event) => {
    setMaterialUrlLabelInput(event.target.value);
  };

  const handleAddMaterialUrl = () => {
    const nextUrl = materialUrlInput.trim();
    const nextLabel = materialUrlLabelInput.trim();
    if (!nextUrl) {
      return;
    }

    if (!isValidHttpUrl(nextUrl)) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    const hasDuplicate = formField.learning_material_urls.some(
      (entry) =>
        getLearningMaterialUrlValue(entry).toLowerCase() ===
        nextUrl.toLowerCase(),
    );
    if (hasDuplicate) {
      toast.error("This URL is already added.");
      return;
    }

    setFormField((prev) => ({
      ...prev,
      learning_material_urls: [
        ...prev.learning_material_urls,
        {
          label: nextLabel || nextUrl,
          url: nextUrl,
        },
      ],
    }));
    setRemovedMaterialUrls((prev) =>
      prev.filter((url) => String(url).toLowerCase() !== nextUrl.toLowerCase()),
    );
    setMaterialUrlLabelInput("");
    setMaterialUrlInput("");
  };

  const handleMaterialUrlKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddMaterialUrl();
    }
  };

  const handleRemoveMaterialUrl = (index) => {
    setFormField((prev) => {
      const entry = prev.learning_material_urls[index];
      const url = getLearningMaterialUrlValue(entry);
      if (url && initialMaterialUrls.includes(url)) {
        setRemovedMaterialUrls((previousRemoved) => {
          if (previousRemoved.includes(url)) {
            return previousRemoved;
          }
          return [...previousRemoved, url];
        });
      }
      return {
        ...prev,
        learning_material_urls: prev.learning_material_urls.filter(
          (_, idx) => idx !== index,
        ),
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formField.classId) {
      const message = "Please select a class.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.subjectId) {
      const message = "Please select a subject.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.unit_name.trim()) {
      const message = "Unit name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    const newMaterialFiles = formField.learning_materials.filter(
      (material) =>
        material instanceof File &&
        isValidLearningMaterialFile(material) &&
        material.size <= MAX_MATERIAL_SIZE_BYTES,
    );
    const shouldClearMaterials = formField.learning_materials.length === 0;
    const materialUrlEntries = Array.from(
      formField.learning_material_urls.reduce((map, entry) => {
        const url = getLearningMaterialUrlValue(entry);
        if (!url) {
          return map;
        }
        const label = getLearningMaterialUrlLabel(entry) || url;
        const key = url.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { label, url });
        }
        return map;
      }, new Map()).values(),
    );
    const shouldClearMaterialUrls = materialUrlEntries.length === 0;
    const hasIconFile = iconFile instanceof File;
    const payload = new FormData();
    payload.append("subject_id", formField.subjectId);
    payload.append("class_id", formField.classId);
    payload.append("unit_name", formField.unit_name.trim());
    payload.append("description", formField.description.trim());

    if (hasIconFile) {
      payload.append("images", iconFile);
    } else if (!isEditMode && formField.images) {
      payload.append("images", formField.images);
    } else if (isEditMode && !formField.images) {
      // Explicitly clear icon/image when removed during edit
      payload.append("images", "");
    }

    newMaterialFiles.forEach((file) => {
      payload.append("learning_materials[]", file);
    });

    if (removedMaterials.length) {
      Array.from(new Set(removedMaterials)).forEach((path) => {
        payload.append("remove_learning_materials[]", path);
      });
    }

    if (isEditMode && !newMaterialFiles.length && shouldClearMaterials) {
      payload.append("clear_learning_materials", "1");
    }

    materialUrlEntries.forEach((entry, index) => {
      payload.append(`learning_material_urls[${index}][label]`, entry.label);
      payload.append(`learning_material_urls[${index}][url]`, entry.url);
    });

    if (removedMaterialUrls.length) {
      Array.from(new Set(removedMaterialUrls)).forEach((url) => {
        payload.append("remove_learning_material_urls[]", url);
      });
    }

    if (isEditMode && shouldClearMaterialUrls) {
      payload.append("clear_learning_material_urls", "1");
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateUnitById(unitId, payload);
        toast.success("Unit updated successfully.");
      } else {
        await addUnit(payload);
        toast.success("Unit added successfully.");
      }
      navigate("/admin/unit-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} unit. Please try again.`;
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
          <h1>{isEditMode ? "Update Unit" : "Add New Unit"}</h1>
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
                <div className="form-group w-full">
                  <label>
                    <Book size={16} /> Class<span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={classOptions}
                    value={formField.classId}
                    multiple={false}
                    onChange={handleClassSelect}
                    placeholder={
                      classesLoading
                        ? "Loading classes..."
                        : classOptions.length
                          ? "Search classes..."
                          : "No classes available"
                    }
                    loading={classesLoading}
                    disabled={loading || classesLoading || isEditMode}
                    emptyState={
                      classesLoading ? "Loading classes..." : "No classes found"
                    }
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <BookA size={16} /> Subject<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="subjectId"
                    value={formField.subjectId}
                    onChange={handleChange}
                    disabled={loading || subjectsLoading || !formField.classId}
                  >
                    <option value="" disabled>
                      {subjectsLoading
                        ? "Loading subjects..."
                        : !formField.classId
                          ? "Select a class first"
                          : filteredSubjects.length
                            ? "-- select subject --"
                            : "No subjects available"}
                    </option>
                    {!subjectsLoading &&
                      filteredSubjects.map((subject) => {
                        const id = getSubjectId(subject);
                        if (!id) {
                          return null;
                        }
                        return (
                          <option key={id} value={id}>
                            {getSubjectLabel(subject)}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <BookOpen size={16} /> Unit Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="unit_name"
                    value={formField.unit_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-full">
                  <label>
                    <Image size={16} />
                    Unit Icon
                  </label>
                  <div className="upload-box">
                    <input
                      type="file"
                      className="form-input"
                      accept="image/*"
                      onChange={handleIconUpload}
                      name="images"
                      disabled={loading}
                      ref={iconInputRef}
                    />
                    <p className="form-hint text-[0.85rem] text-gray-500 !mt-1">
                      Upload PNG, JPG, SVG, or WEBP files.
                    </p>
                  </div>
                  {hasIconSelection ? (
                    <div className="mt-4 flex items-center gap-4">
                      {canPreviewIcon && (
                        <img
                          src={iconPreview}
                          alt="Unit icon preview"
                          className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {iconLabel || "Icon attached"}
                        </p>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#A22038]"
                          onClick={handleClearIcon}
                          disabled={loading}
                        >
                          Remove icon
                        </button>
                      </div>
                    </div>
                  ) : (
                    ""
                  )}
                </div>

                <div className="form-group w-full">
                  <label>
                    <FileIcon size={16} />
                    Learning Materials
                  </label>
                  <div className="upload-box">
                    <input
                      type="file"
                      className="form-input mb-0"
                      accept=".pdf,.doc,.docx,image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      onChange={handleMaterialsUpload}
                      disabled={loading}
                    />
                    <p className="form-hint text-[0.85rem] text-gray-500 !mt-1">
                      Upload PDF, Word, image, or video files. Max file size:
                      50MB.
                    </p>
                  </div>

                  {formField.learning_materials.length > 0 && (
                    <ul className="material-list mt-1">
                      {formField.learning_materials.map((material, index) => {
                        const label = getMaterialLabel(material);
                        const link = getMaterialLink(material);

                        return (
                          <li
                            key={`${label}-${index}`}
                            className="material-item"
                          >
                            <div
                              className="material-content"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <Paperclip size={16} className="material-icon" />
                              {link ? (
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {label}
                                </a>
                              ) : (
                                <span>{label}</span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="remove-material-btn"
                              onClick={() => handleRemoveMaterial(index)}
                              disabled={loading}
                              aria-label={`Remove ${label}`}
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                color: "#dc2626",
                                display: "inline-flex",
                                alignItems: "center",
                                padding: 0,
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="form-group w-full">
                  <label>
                    <LinkIcon size={16} />
                    Learning Material URLs
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Label (e.g., YouTube Intro)"
                      value={materialUrlLabelInput}
                      onChange={handleMaterialUrlLabelInputChange}
                      onKeyDown={handleMaterialUrlKeyDown}
                      disabled={loading}
                    />
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://example.com/resource"
                      value={materialUrlInput}
                      onChange={handleMaterialUrlInputChange}
                      onKeyDown={handleMaterialUrlKeyDown}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="global-btn whitespace-nowrap"
                      onClick={handleAddMaterialUrl}
                      disabled={loading || !materialUrlInput.trim()}
                    >
                      Add URL
                    </button>
                  </div>
                  <p className="form-hint text-[0.85rem] text-gray-500 !mt-1">
                    Add one or more external URLs for students.
                  </p>

                  {formField.learning_material_urls.length > 0 ? (
                    <ul className="material-list mt-1">
                      {formField.learning_material_urls.map((entry, index) => {
                        const url = getLearningMaterialUrlValue(entry);
                        const label = getLearningMaterialUrlLabel(entry) || url;
                        return (
                          <li
                            key={`${url}-${label}-${index}`}
                            className="material-item"
                          >
                          <div
                            className="material-content"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <LinkIcon size={16} className="material-icon" />
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {label}
                            </a>
                            {label !== url ? (
                              <span className="text-xs text-slate-500 break-all">
                                ({url})
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="remove-material-btn"
                            onClick={() => handleRemoveMaterialUrl(index)}
                            disabled={loading}
                            aria-label={`Remove URL ${label}`}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              color: "#dc2626",
                              display: "inline-flex",
                              alignItems: "center",
                              padding: 0,
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                        );
                      })}
                    </ul>
                  ) : (
                    ""
                  )}
                </div>

                <div className="form-group w-full">
                  <label>
                    <AlignVerticalDistributeCenter size={16} /> Description
                  </label>
                  <MathEditor
                    value={formField.description}
                    onChange={handleDescriptionChange}
                    disabled={loading}
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
                  className="global-btn flex items-center justify-center gap-1 "
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      Please wait
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : isEditMode ? (
                    <>
                      Update Unit
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Unit
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

export default UnitForm;
