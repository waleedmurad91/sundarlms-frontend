import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  ALargeSmall,
  AlertCircleIcon,
  AlignVerticalDistributeCenter,
  Book,
  File as FileIcon,
  Image,
  Link as LinkIcon,
  Library,
  Loader2,
  Paperclip,
  Plus,
  Save,
  SquareStack,
  Trash2,
  X,
} from "lucide-react";
import { getAllUnits } from "@/api/unitApi";
import { addTopic, getTopicById, updateTopicById } from "@/api/topicApi";
import MathEditor from "@/components/MathEditor";

const BACKEND_FILE_BASE_PATH =
  import.meta.env.VITE_BACKEND_FILE_BASE_PATH ?? "";
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

const isAbsoluteAssetUrl = (value = "") =>
  typeof value === "string" &&
  (value.startsWith("blob:") ||
    value.startsWith("data:") ||
    /^https?:\/\//i.test(value));

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

const getExtension = (name = "") => {
  const segments = name.split(".");
  if (segments.length <= 1) return "";
  return segments.pop().toLowerCase();
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

const normaliseLearningMaterials = (value) =>
  parseArrayValue(value)
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

const getMaterialPath = (material) => {
  if (!material || material instanceof File) {
    return "";
  }

  if (typeof material === "string") {
    return material;
  }

  if (typeof material === "object") {
    return (
      material?.url ??
      material?.path ??
      material?.file ??
      material?.link ??
      material?.location ??
      material?.src ??
      ""
    );
  }

  return "";
};

const getMaterialLabel = (material) => {
  if (!material) {
    return "Attachment";
  }

  if (material instanceof File) {
    return material.name || "Attachment";
  }

  if (typeof material === "string") {
    return getFileNameFromUrl(material) || material;
  }

  if (typeof material === "object") {
    return (
      material?.name ??
      material?.label ??
      material?.original_name ??
      getFileNameFromUrl(getMaterialPath(material)) ??
      "Attachment"
    );
  }

  return "Attachment";
};

const getMaterialLink = (material) => {
  const path = getMaterialPath(material);
  return resolveBackendFileUrl(path);
};

const isVideoFile = (file) => {
  if (!file) {
    return false;
  }
  if (typeof file.type === "string" && file.type.startsWith("video/")) {
    return true;
  }
  return VIDEO_EXTENSIONS.includes(getExtension(file.name));
};

const isImageFile = (file) => {
  if (!file) {
    return false;
  }
  if (typeof file.type === "string" && file.type.startsWith("image/")) {
    return true;
  }
  return IMAGE_EXTENSIONS.includes(getExtension(file.name));
};

const isDocumentFile = (file) => {
  if (!file) {
    return false;
  }

  if (file.type === "application/pdf") {
    return true;
  }

  if (
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }

  return DOCUMENT_EXTENSIONS.includes(getExtension(file.name));
};

const isValidLearningMaterialFile = (file) =>
  isDocumentFile(file) || isImageFile(file) || isVideoFile(file);

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

const DEFAULT_FORM = {
  classId: "",
  subjectId: "",
  unitId: "",
  name: "",
  description: "",
  images: "",
  learning_materials: [],
  learning_material_urls: [],
};

const normaliseTopic = (payload) => {
  if (!payload) {
    return { ...DEFAULT_FORM };
  }

  const dataCandidate =
    payload?.data?.data ??
    payload?.data?.topic ??
    payload?.data?.topicData ??
    payload?.data ??
    payload?.topic ??
    payload?.topicData ??
    payload;
  const data = dataCandidate?.data ?? dataCandidate;
  const unitData =
    data?.unit ?? data?.unit_data ?? data?.unitData ?? data?.unit_info ?? {};
  const subjectData =
    data?.subject ??
    unitData?.subject ??
    unitData?.subject_data ??
    unitData?.subjectData ??
    {};
  const gradeData =
    subjectData?.grade ??
    subjectData?.grade_data ??
    subjectData?.gradeData ??
    {};
  const classData =
    data?.class ??
    data?.school_class ??
    data?.schoolClass ??
    unitData?.class ??
    unitData?.school_class ??
    unitData?.schoolClass ??
    subjectData?.school_class ??
    subjectData?.schoolClass ??
    gradeData ??
    {};

  let unitRef =
    data?.unit_id ??
    data?.unitId ??
    data?.unit?.id ??
    data?.unit?._id ??
    data?.unit?.value ??
    data?.unit;

  if (unitRef && typeof unitRef === "object") {
    unitRef =
      unitRef.id ??
      unitRef._id ??
      unitRef.value ??
      unitRef.unit_id ??
      unitRef.unitId ??
      null;
  }

  let subjectRef =
    data?.subject_id ??
    data?.subjectId ??
    subjectData?.id ??
    subjectData?._id ??
    subjectData?.value ??
    subjectData?.subject_id ??
    subjectData?.subjectId ??
    null;

  if (subjectRef && typeof subjectRef === "object") {
    subjectRef =
      subjectRef.id ??
      subjectRef._id ??
      subjectRef.value ??
      subjectRef.subject_id ??
      subjectRef.subjectId ??
      null;
  }

  const classRefCandidate =
    data?.class_id ??
    data?.classId ??
    data?.school_class_id ??
    data?.schoolClassId ??
    unitData?.class_id ??
    unitData?.classId ??
    unitData?.school_class_id ??
    unitData?.schoolClassId ??
    subjectData?.grade_id ??
    subjectData?.gradeId ??
    gradeData?.id ??
    gradeData?._id ??
    gradeData?.value ??
    classData?.id ??
    classData?._id ??
    classData?.value ??
    classData?.class_id ??
    classData?.classId ??
    classData?.grade_id ??
    classData?.gradeId ??
    null;

  let classRef = classRefCandidate;
  if (classRef && typeof classRef === "object") {
    classRef =
      classRef.id ??
      classRef._id ??
      classRef.value ??
      classRef.class_id ??
      classRef.classId ??
      classRef.grade_id ??
      classRef.gradeId ??
      null;
  }

  const materialsSource =
    data?.learning_materials ??
    data?.learningMaterials ??
    data?.materials ??
    data?.attachments ??
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

  return {
    classId: classRef ? String(classRef) : "",
    subjectId: subjectRef ? String(subjectRef) : "",
    unitId: unitRef ? String(unitRef) : "",
    name:
      data?.name ?? data?.topic_name ?? data?.topicName ?? data?.title ?? "",
    description: data?.description ?? data?.details ?? "",
    images:
      data?.images ??
      data?.image ??
      data?.icon ??
      data?.icon_image ??
      data?.topic_image ??
      "",
    learning_materials: learningMaterials,
    learning_material_urls: learningMaterialUrls,
  };
};

const resolveUnits = (payload) => {
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

const getSubjectId = (subject) => {
  const id =
    subject?._id ??
    subject?.id ??
    subject?.value ??
    subject?.subject_id ??
    subject?.subjectId;
  return id !== null && id !== undefined ? String(id) : "";
};

const getSubjectLabel = (subject) =>
  subject?.subject ??
  subject?.name ??
  subject?.title ??
  subject?.label ??
  "Untitled Subject";

const getUnitId = (unit) => {
  const id =
    unit?._id ?? unit?.id ?? unit?.value ?? unit?.unit_id ?? unit?.unitId;
  return id !== null && id !== undefined ? String(id) : "";
};

const getUnitLabel = (unit) =>
  unit?.name ??
  unit?.unit_name ??
  unit?.unitName ??
  unit?.title ??
  unit?.label ??
  "Untitled Unit";

const getUnitSubjectId = (unit) => {
  const subjectRef =
    unit?.subject_id ??
    unit?.subjectId ??
    unit?.subject?.id ??
    unit?.subject?._id ??
    unit?.subject?.value ??
    unit?.subject;
  if (
    subjectRef &&
    typeof subjectRef === "object" &&
    !(subjectRef instanceof String)
  ) {
    const resolved =
      subjectRef?.id ??
      subjectRef?._id ??
      subjectRef?.value ??
      subjectRef?.subject_id ??
      subjectRef?.subjectId ??
      null;
    return resolved !== null && resolved !== undefined ? String(resolved) : "";
  }
  return subjectRef !== null && subjectRef !== undefined
    ? String(subjectRef)
    : "";
};

const getUnitClassInfo = (unit) => {
  const subject = unit?.subject ?? {};
  const grade =
    subject?.grade ?? subject?.grade_data ?? subject?.gradeData ?? {};
  const classCandidate =
    unit?.class ?? unit?.school_class ?? unit?.schoolClass ?? grade ?? {};

  const id =
    grade?.id ??
    grade?._id ??
    grade?.value ??
    subject?.grade_id ??
    subject?.gradeId ??
    classCandidate?.id ??
    classCandidate?._id ??
    classCandidate?.value ??
    classCandidate?.class_id ??
    classCandidate?.classId ??
    classCandidate?.grade_id ??
    classCandidate?.gradeId ??
    null;

  if (id === null || id === undefined || id === "") {
    return null;
  }

  const label =
    classCandidate?.name ??
    classCandidate?.title ??
    classCandidate?.label ??
    grade?.name ??
    grade?.title ??
    (subject?.grade_id ? `Grade ${subject.grade_id}` : "") ??
    `Class ${id}`;

  return {
    id: String(id),
    label: String(label).trim() || `Class ${id}`,
  };
};

const buildUnitHierarchy = (unitList) => {
  const classMap = new Map();
  const subjectsByClass = new Map();
  const unitsBySubject = new Map();

  unitList.forEach((unit) => {
    const unitId = getUnitId(unit);
    if (!unitId) {
      return;
    }

    const subject = unit?.subject ?? {};
    const subjectId = getSubjectId(subject) || getUnitSubjectId(unit);
    if (!subjectId) {
      return;
    }

    const classInfo = getUnitClassInfo(unit);
    if (!classInfo) {
      return;
    }

    if (!classMap.has(classInfo.id)) {
      classMap.set(classInfo.id, {
        value: classInfo.id,
        label: classInfo.label || `Class ${classInfo.id}`,
      });
    }

    if (!subjectsByClass.has(classInfo.id)) {
      subjectsByClass.set(classInfo.id, new Map());
    }
    const subjectMap = subjectsByClass.get(classInfo.id);
    if (!subjectMap.has(subjectId)) {
      subjectMap.set(subjectId, {
        value: subjectId,
        label: getSubjectLabel(subject),
      });
    }

    if (!unitsBySubject.has(subjectId)) {
      unitsBySubject.set(subjectId, []);
    }

    unitsBySubject.get(subjectId).push({
      value: unitId,
      label: getUnitLabel(unit),
    });
  });

  return {
    classOptions: Array.from(classMap.values()),
    subjectsByClass: new Map(
      Array.from(subjectsByClass.entries()).map(([classId, subjectMap]) => [
        classId,
        Array.from(subjectMap.values()),
      ]),
    ),
    unitsBySubject,
  };
};

const findClassOption = (unitList, classId) => {
  if (!classId) {
    return null;
  }
  for (const unit of unitList) {
    const classInfo = getUnitClassInfo(unit);
    if (classInfo && classInfo.id === classId) {
      return {
        value: classInfo.id,
        label: classInfo.label || `Class ${classInfo.id}`,
      };
    }
  }
  return null;
};

const findSubjectOption = (unitList, subjectId) => {
  if (!subjectId) {
    return null;
  }
  for (const unit of unitList) {
    const subject = unit?.subject ?? {};
    const resolvedId = getSubjectId(subject) || getUnitSubjectId(unit);
    if (resolvedId && resolvedId === subjectId) {
      return {
        value: subjectId,
        label: getSubjectLabel(subject),
      };
    }
  }
  return null;
};

const findUnitOption = (unitList, unitId) => {
  if (!unitId) {
    return null;
  }
  const unit = unitList.find((item) => getUnitId(item) === unitId);
  if (!unit) {
    return null;
  }
  return {
    value: unitId,
    label: getUnitLabel(unit),
  };
};

const TopicForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateTopic = state?.topic ?? null;
  const topicId =
    paramsId ||
    state?.topicId ||
    fallbackStateTopic?._id ||
    fallbackStateTopic?.id;
  const isEditMode = Boolean(topicId);

  const [formField, setFormField] = React.useState(() =>
    normaliseTopic(fallbackStateTopic),
  );
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [units, setUnits] = React.useState([]);
  const [unitsLoading, setUnitsLoading] = React.useState(false);
  const iconInputRef = React.useRef(null);
  const [iconFile, setIconFile] = React.useState(null);
  const [iconPreview, setIconPreview] = React.useState("");
  const [removedMaterials, setRemovedMaterials] = React.useState([]);
  const [materialUrlLabelInput, setMaterialUrlLabelInput] = React.useState("");
  const [materialUrlInput, setMaterialUrlInput] = React.useState("");
  const [initialMaterialUrlEntries, setInitialMaterialUrlEntries] =
    React.useState(
      () => normaliseTopic(fallbackStateTopic).learning_material_urls,
    );
  const initialMaterialUrlSet = React.useMemo(
    () =>
      new Set(
        initialMaterialUrlEntries
          .map((entry) => getLearningMaterialUrlValue(entry).toLowerCase())
          .filter(Boolean),
      ),
    [initialMaterialUrlEntries],
  );
  const initialMaterialUrlLabelByUrl = React.useMemo(
    () =>
      initialMaterialUrlEntries.reduce((map, entry) => {
        const url = getLearningMaterialUrlValue(entry);
        if (!url) {
          return map;
        }
        map.set(url.toLowerCase(), getLearningMaterialUrlLabel(entry) || url);
        return map;
      }, new Map()),
    [initialMaterialUrlEntries],
  );
  const [removedMaterialUrls, setRemovedMaterialUrls] = React.useState([]);

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

  const hierarchy = React.useMemo(() => buildUnitHierarchy(units), [units]);
  const {
    classOptions: derivedClassOptions,
    subjectsByClass,
    unitsBySubject,
  } = hierarchy;

  const classOptions = React.useMemo(() => {
    if (!formField.classId) {
      return derivedClassOptions;
    }

    if (
      derivedClassOptions.some((option) => option.value === formField.classId)
    ) {
      return derivedClassOptions;
    }

    const fallback = findClassOption(units, formField.classId);
    return fallback ? [...derivedClassOptions, fallback] : derivedClassOptions;
  }, [derivedClassOptions, formField.classId, units]);

  const subjectOptions = React.useMemo(() => {
    if (!formField.classId) {
      return [];
    }

    const options = subjectsByClass.get(formField.classId) ?? [];

    if (!formField.subjectId) {
      return options;
    }

    const hasSelected = options.some(
      (option) => option.value === formField.subjectId,
    );

    if (hasSelected) {
      return options;
    }

    const fallback = findSubjectOption(units, formField.subjectId);
    return fallback ? [...options, fallback] : options;
  }, [formField.classId, formField.subjectId, subjectsByClass, units]);

  const unitOptions = React.useMemo(() => {
    if (!formField.subjectId) {
      return [];
    }

    const options = unitsBySubject.get(formField.subjectId) ?? [];

    if (!formField.unitId) {
      return options;
    }

    const hasSelected = options.some(
      (option) => option.value === formField.unitId,
    );

    if (hasSelected) {
      return options;
    }

    const fallback = findUnitOption(units, formField.unitId);
    return fallback ? [...options, fallback] : options;
  }, [formField.subjectId, formField.unitId, unitsBySubject, units]);

  React.useEffect(() => {
    const fetchUnits = async () => {
      setUnitsLoading(true);
      try {
        const response = await getAllUnits();
        setUnits(resolveUnits(response));
      } catch (err) {
        const message =
          err?.message || "Unable to load units. Please try again.";
        toast.error(message);
      } finally {
        setUnitsLoading(false);
      }
    };

    fetchUnits();
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !topicId) {
      return;
    }

    let isCancelled = false;

    const fetchTopic = async () => {
      try {
        setFetching(true);
        const result = await getTopicById(topicId);
        if (!isCancelled) {
          const normalizedTopic = normaliseTopic(result);
          setFormField(normalizedTopic);
          setInitialMaterialUrlEntries(normalizedTopic.learning_material_urls);
          setRemovedMaterials([]);
          setRemovedMaterialUrls([]);
          setMaterialUrlLabelInput("");
          setMaterialUrlInput("");
        }
      } catch (err) {
        if (isCancelled) {
          return;
        }
        const message =
          err?.message || "Unable to load topic details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (!isCancelled) {
          setFetching(false);
        }
      }
    };

    fetchTopic();

    return () => {
      isCancelled = true;
    };
  }, [isEditMode, topicId]);

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
          unitId: shouldResetSubject ? "" : prev.unitId,
        };
      }
      if (name === "subjectId") {
        if (isEditMode) {
          return prev;
        }

        const shouldResetUnit = value !== prev.subjectId;
        return {
          ...prev,
          subjectId: value,
          unitId: shouldResetUnit ? "" : prev.unitId,
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleDescriptionChange = (value) => {
    setFormField((prev) => ({ ...prev, description: value }));
  };

  const handleIconUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!isImageFile(file)) {
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
    }
    setFormField((prev) => ({ ...prev, images: "" }));
    if (iconInputRef.current) {
      iconInputRef.current.value = "";
    }
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
      const isSupported = isValidLearningMaterialFile(file);
      const hasValidSize = file.size <= MAX_MATERIAL_SIZE_BYTES;

      if (!isSupported) {
        rejectedByType.push(file.name);
        return;
      }

      if (!hasValidSize) {
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

  const handleRemoveMaterial = (index) => {
    setFormField((prev) => {
      const material = prev.learning_materials[index];
      if (material && !(material instanceof File)) {
        const path = getMaterialPath(material);
        if (path) {
          setRemovedMaterials((previousRemoved) => {
            if (previousRemoved.includes(path)) {
              return previousRemoved;
            }
            return [...previousRemoved, path];
          });
        }
      }

      return {
        ...prev,
        learning_materials: prev.learning_materials.filter(
          (_, idx) => idx !== index,
        ),
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

    if (!nextLabel) {
      toast.error("Please enter a label for this URL.");
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
          label: nextLabel,
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

      if (url && initialMaterialUrlSet.has(url.toLowerCase())) {
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

    if (!formField.unitId) {
      const message = "Please select a unit.";
      setError(message);
      toast.error(message);
      return;
    }

    if (!formField.name.trim()) {
      const message = "Topic name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    const payload = new FormData();
    const newMaterialFiles = formField.learning_materials.filter(
      (material) => material instanceof File,
    );
    const shouldClearMaterials = formField.learning_materials.length === 0;
    const materialUrls = Array.from(
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
    const newMaterialUrls = materialUrls.filter(
      (entry) => {
        const normalizedUrl = entry.url.toLowerCase();
        if (!initialMaterialUrlSet.has(normalizedUrl)) {
          return true;
        }
        const initialLabel = initialMaterialUrlLabelByUrl.get(normalizedUrl) || "";
        return initialLabel !== entry.label;
      },
    );
    const changedLabelUrls = materialUrls
      .filter((entry) => {
        const normalizedUrl = entry.url.toLowerCase();
        if (!initialMaterialUrlSet.has(normalizedUrl)) {
          return false;
        }
        const initialLabel = initialMaterialUrlLabelByUrl.get(normalizedUrl) || "";
        return initialLabel !== entry.label;
      })
      .map((entry) => entry.url);
    const urlsToRemove = Array.from(
      new Set([...removedMaterialUrls, ...changedLabelUrls]),
    );
    const shouldClearMaterialUrls = materialUrls.length === 0;

    payload.append("unit_id", formField.unitId);
    payload.append("topic_name", formField.name.trim());
    payload.append("description", formField.description);

    if (iconFile instanceof File) {
      payload.append("image", iconFile);
    } else if (!isEditMode && formField.images) {
      payload.append("image", formField.images);
    } else if (isEditMode && !formField.images) {
      // Explicitly clear existing image when removed during edit
      payload.append("image", "");
    }

    newMaterialFiles.forEach((file) => {
      payload.append("learning_materials[]", file);
    });

    Array.from(new Set(removedMaterials)).forEach((path) => {
      payload.append("remove_learning_materials[]", path);
    });

    if (isEditMode && !newMaterialFiles.length && shouldClearMaterials) {
      payload.append("clear_learning_materials", "1");
    }

    newMaterialUrls.forEach((entry, index) => {
      payload.append(`learning_material_urls[${index}][label]`, entry.label);
      payload.append(`learning_material_urls[${index}][url]`, entry.url);
    });

    urlsToRemove.forEach((url) => {
      payload.append("remove_learning_material_urls[]", url);
    });

    if (isEditMode && !newMaterialUrls.length && shouldClearMaterialUrls) {
      payload.append("clear_learning_material_urls", "1");
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateTopicById(topicId, payload);
        toast.success("Topic updated successfully.");
      } else {
        await addTopic(payload);
        toast.success("Topic added successfully.");
      }
      navigate("/admin/topic-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} topic. Please try again.`;
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
          <h1>{isEditMode ? "Update Topic" : "Add New Topic"}</h1>
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
                <div className="form-group w-half">
                  <label>
                    <Book size={16} /> Class<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="classId"
                    value={formField.classId}
                    onChange={handleChange}
                    disabled={loading || unitsLoading || isEditMode}
                  >
                    <option value="" disabled>
                      {unitsLoading
                        ? "Loading classes..."
                        : isEditMode
                          ? "Class locked for existing topic"
                          : classOptions.length
                            ? "-- select class --"
                            : "No classes available"}
                    </option>
                    {!unitsLoading &&
                      classOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Library size={16} /> Subject<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="subjectId"
                    value={formField.subjectId}
                    onChange={handleChange}
                    disabled={
                      loading ||
                      unitsLoading ||
                      !formField.classId ||
                      isEditMode
                    }
                  >
                    <option value="" disabled>
                      {unitsLoading
                        ? "Loading subjects..."
                        : isEditMode
                          ? "Subject locked for existing topic"
                          : !formField.classId
                            ? "Select a class first"
                            : subjectOptions.length
                              ? "-- select subject --"
                              : "No subjects available"}
                    </option>
                    {!unitsLoading &&
                      subjectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <SquareStack size={16} /> Unit<span>*</span>
                  </label>
                  <select
                    className="form-input"
                    name="unitId"
                    value={formField.unitId}
                    onChange={handleChange}
                    disabled={loading || unitsLoading || !formField.subjectId}
                  >
                    <option value="" disabled>
                      {unitsLoading
                        ? "Loading units..."
                        : !formField.subjectId
                          ? "Select a subject first"
                          : unitOptions.length
                            ? "-- select unit --"
                            : "No units available"}
                    </option>
                    {!unitsLoading &&
                      unitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group w-half">
                  <label>
                    <ALargeSmall size={16} /> Topic Name<span>*</span>
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
                <div className="form-group w-full">
                  <label>
                    <Image size={16} />
                    Topic Image
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
                          alt="Topic image preview"
                          className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {iconLabel || "Image attached"}
                        </p>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#A22038]"
                          onClick={handleClearIcon}
                          disabled={loading}
                        >
                          Remove Image
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

                  {formField.learning_materials.length > 0 ? (
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
                  ) : (
                    ""
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
                      placeholder="Label (e.g., PDF Notes)"
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
                      disabled={
                        loading ||
                        !materialUrlInput.trim() ||
                        !materialUrlLabelInput.trim()
                      }
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
                      Update Topic
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Topic
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

export default TopicForm;
