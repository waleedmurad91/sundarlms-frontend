const normalizeId = (value, fallback) => {
  const resolved = value ?? fallback;
  return resolved !== undefined && resolved !== null ? String(resolved) : "";
};

export const resolveDragDropMode = (question) => {
  const raw =
    question?.drag_drop_mode ??
    question?.dragDropMode ??
    question?.drag_drop?.mode ??
    "item_grid";
  return String(raw).toLowerCase() === "diagram_labels"
    ? "diagram_labels"
    : "item_grid";
};

export const resolveDragDropLabels = (question) => {
  const labels =
    question?.drag_drop_labels ??
    question?.dragDropLabels ??
    question?.drag_drop?.labels ??
    [];
  if (!Array.isArray(labels)) return [];
  return labels.map((label, index) => ({
    id: normalizeId(
      label?.id ?? label?.label_id ?? label?.labelId,
      `label-${index}`,
    ),
    text: String(label?.text ?? label?.label ?? label?.name ?? ""),
    reusable: Boolean(label?.reusable ?? label?.is_reusable ?? label?.isReusable),
  }));
};

export const resolveDragDropLabelId = (question, value, labelCache) => {
  const resolved = value ?? "";
  const raw = String(resolved).trim();
  if (!raw) return "";
  const labels = labelCache ?? resolveDragDropLabels(question);
  const idLookup = new Map(labels.map((label) => [String(label.id), label.id]));
  if (idLookup.has(raw)) {
    return idLookup.get(raw);
  }
  const textLookup = new Map(
    labels.map((label) => [
      String(label.text ?? "").trim().toLowerCase(),
      label.id,
    ]),
  );
  const byText = textLookup.get(raw.toLowerCase());
  return byText ?? raw;
};

export const resolveDragDropItems = (question) => {
  const items =
    question?.drag_drop_items ??
    question?.dragDropItems ??
    question?.drag_drop?.items ??
    [];
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    id: normalizeId(
      item?.id ?? item?.item_id ?? item?.itemId,
      `item-${index}`,
    ),
    image:
      item?.image?.url ??
      item?.image ??
      item?.image_url ??
      item?.url ??
      "",
    correctLabelId:
      item?.correct_label_id ??
      item?.correctLabelId ??
      item?.correct_label ??
      item?.correctLabel ??
      item?.correct_label_text ??
      item?.correctLabelText ??
      item?.correct_label_name ??
      item?.correctLabelName ??
      item?.label_id ??
      "",
  }));
};

export const resolveDragDropBlanks = (question) => {
  const diagram =
    question?.drag_drop_diagram ??
    question?.dragDropDiagram ??
    question?.drag_drop?.diagram ??
    {};
  const blanks =
    diagram?.blanks ??
    diagram?.positions ??
    question?.drag_drop_blanks ??
    question?.dragDropBlanks ??
    [];
  if (!Array.isArray(blanks)) return [];
  return blanks.map((blank, index) => ({
    id: normalizeId(
      blank?.id ?? blank?.blank_id ?? blank?.blankId,
      `blank-${index}`,
    ),
    x: Number(blank?.x ?? blank?.left ?? 0),
    y: Number(blank?.y ?? blank?.top ?? 0),
    width: Number(blank?.width ?? blank?.blank_width ?? 140),
    height: Number(blank?.height ?? blank?.blank_height ?? 48),
    correctLabelId:
      blank?.correct_label_id ??
      blank?.correctLabelId ??
      blank?.correct_label ??
      blank?.correctLabel ??
      blank?.correct_label_text ??
      blank?.correctLabelText ??
      blank?.correct_label_name ??
      blank?.correctLabelName ??
      blank?.label_id ??
      "",
  }));
};

export const resolveDragDropTargets = (question) => {
  const mode = resolveDragDropMode(question);
  if (mode === "diagram_labels") {
    return resolveDragDropBlanks(question);
  }
  return resolveDragDropItems(question);
};

export const normalizeDragDropSubmittedAnswer = (question, submitted) => {
  const targets = resolveDragDropTargets(question);
  const map = {};
  if (!targets.length) return map;
  const labels = resolveDragDropLabels(question);
  const normalizeLabelId = (value) =>
    resolveDragDropLabelId(question, value, labels);
  if (Array.isArray(submitted)) {
    if (
      submitted.length &&
      typeof submitted[0] === "object" &&
      submitted[0] !== null
    ) {
      submitted.forEach((entry) => {
        const targetId = normalizeId(
          entry?.item_id ??
            entry?.blank_id ??
            entry?.target_id ??
            entry?.targetId,
          "",
        );
        const labelId = normalizeLabelId(
          normalizeId(
            entry?.label_id ??
              entry?.labelId ??
              entry?.label?.id ??
              entry?.label?.label_id ??
              entry?.label?.labelId ??
              entry?.label?.text ??
              entry?.label?.label ??
              entry?.value,
            "",
          ),
        );
        if (targetId) {
          map[targetId] = labelId;
        }
      });
      return map;
    }
    targets.forEach((target, index) => {
      map[target.id] =
        submitted[index] !== undefined && submitted[index] !== null
          ? normalizeLabelId(submitted[index])
          : "";
    });
    return map;
  }
  if (submitted && typeof submitted === "object") {
    Object.entries(submitted).forEach(([key, value]) => {
      map[String(key)] =
        value !== undefined && value !== null ? normalizeLabelId(value) : "";
    });
  }
  return map;
};

export const buildDragDropSelectedAnswer = (question, assignmentMap = {}) => {
  const targets = resolveDragDropTargets(question);
  if (!targets.length) return [];
  return targets.map((target) =>
    assignmentMap[target.id] !== undefined && assignmentMap[target.id] !== null
      ? assignmentMap[target.id]
      : "",
  );
};

export const buildDragDropAnswerPairs = (question, assignmentMap = {}) => {
  const targets = resolveDragDropTargets(question);
  if (!targets.length) return [];
  return targets.map((target) => ({
    target_id: target.id,
    label_id:
      assignmentMap[target.id] !== undefined && assignmentMap[target.id] !== null
        ? assignmentMap[target.id]
        : "",
  }));
};
