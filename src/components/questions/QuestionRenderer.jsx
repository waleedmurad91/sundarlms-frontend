const BACKEND_FILE_BASE_PATH = import.meta.env.VITE_BACKEND_FILE_BASE_PATH;

const buildImageUrl = (src) => {
  if (!src) return "";
  if (
    src.startsWith("http") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  )
    return src;
  return `${BACKEND_FILE_BASE_PATH}/${src}`;
};

const clampPercent = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return Math.min(100, Math.max(0, fallback));
  return Math.min(100, Math.max(0, numeric));
};

const QuestionMedia = ({ images = [] }) => {
  if (!images.length) return null;
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {images.map((img) => (
        <img
          key={img}
          src={buildImageUrl(img)}
          alt=""
          className="w-full rounded-md border border-slate-200"
        />
      ))}
    </div>
  );
};

const OptionList = ({ options = [], multiple, value, onChange }) => {
  const activeValues = multiple
    ? Array.isArray(value)
      ? value
      : []
    : (value ?? null);

  const toggle = (id) => {
    if (!multiple) {
      onChange(id);
      return;
    }
    const exists = activeValues.includes(id);
    onChange(
      exists ? activeValues.filter((x) => x !== id) : [...activeValues, id],
    );
  };

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const isActive = multiple
          ? activeValues.includes(opt.id)
          : activeValues === opt.id;
        const hasImage = opt.is_image === true || opt.is_image === "1";
        return (
          <label
            key={opt.id}
            className={`flex items-start gap-3 border rounded-md p-3 cursor-pointer ${
              isActive
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name="option"
              checked={isActive}
              onChange={() => toggle(opt.id)}
              className="mt-1"
            />
            {hasImage ? (
              <img
                src={buildImageUrl(opt.image)}
                alt=""
                className="h-16 w-16 object-cover rounded"
              />
            ) : (
              <span className="text-slate-800">{opt.text}</span>
            )}
          </label>
        );
      })}
    </div>
  );
};

export const QuestionRenderer = ({ question, value, onChange }) => {
  if (!question) return null;

  const { question_type, question_text, images = [] } = question;

  const prompt = (
    <div
      className="prose prose-sm text-slate-900"
      dangerouslySetInnerHTML={{ __html: question_text || "" }}
    />
  );

  if (question_type === "text_input" || question_type === "fill_blank") {
    // Normalize value: extract first element if array, otherwise use as-is
    const normalizedValue = Array.isArray(value)
      ? (value[0] ?? "")
      : (value ?? "");
    return (
      <div className="space-y-4">
        {prompt}
        <QuestionMedia images={images} />
        <input
          className="w-full border border-slate-300 rounded-md px-3 py-2"
          value={normalizedValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer"
        />
      </div>
    );
  }

  if (question_type === "image_annotation") {
    const annotationImage =
      question.annotation_image ??
      question.annotationImage ??
      question.annotation?.image ??
      "";
    const rawFields = Array.isArray(question.annotation_fields)
      ? question.annotation_fields
      : Array.isArray(question.annotationFields)
        ? question.annotationFields
        : Array.isArray(question.annotation_inputs)
          ? question.annotation_inputs
          : Array.isArray(question.annotationInputs)
            ? question.annotationInputs
            : Array.isArray(question.annotation?.fields)
              ? question.annotation.fields
              : [];
    const fields = rawFields
      .map((field, index) => {
        if (!field) return null;
        const widthValue =
          field?.width ?? field?.inputWidth ?? field?.input_width ?? 160;
        return {
          id: field?.id ?? `annotation-${index}`,
          label: field?.label ?? "",
          labelPosition:
            field?.labelPosition === "right" ||
            field?.label_position === "right"
              ? "right"
              : "left",
          width:
            Number.isFinite(Number(widthValue)) && Number(widthValue) > 0
              ? Number(widthValue)
              : 160,
          x: clampPercent(field?.x ?? field?.position?.x ?? 0, 10),
          y: clampPercent(field?.y ?? field?.position?.y ?? 0, 10),
        };
      })
      .filter(Boolean);

    return (
      <div className="space-y-4">
        {prompt}
        <QuestionMedia images={images} />
        <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {annotationImage ? (
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="relative inline-block min-w-max">
                <img
                  src={buildImageUrl(annotationImage)}
                  alt=""
                  className="block max-h-[420px] w-auto max-w-none select-none pointer-events-none"
                />
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="absolute flex items-center gap-2 rounded-md bg-white/95 shadow-md border border-slate-200 px-2 py-1"
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                    }}
                  >
                    {field.label && field.labelPosition !== "right" ? (
                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                        {field.label}
                      </span>
                    ) : null}
                    <input
                      readOnly
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                      style={{ width: `${field.width}px` }}
                      value=""
                      placeholder={`Field ${index + 1}`}
                    />
                    {field.label && field.labelPosition === "right" ? (
                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                        {field.label}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-48 w-full items-center justify-center text-sm text-slate-500">
              Annotation image not available.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (question_type === "mcq") {
    return (
      <div className="space-y-4">
        {prompt}
        <QuestionMedia images={images} />
        <OptionList
          options={question.options || []}
          multiple={false}
          value={value}
          onChange={onChange}
        />
      </div>
    );
  }

  if (question_type === "check_box") {
    return (
      <div className="space-y-4">
        {prompt}
        <QuestionMedia images={images} />
        <OptionList
          options={question.options || []}
          multiple
          value={value}
          onChange={onChange}
        />
      </div>
    );
  }

  // Fallback rendering
  return (
    <div className="space-y-4">
      {prompt}
      <QuestionMedia images={images} />
    </div>
  );
};
