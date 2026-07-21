import React from "react";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import MathEditor from "@/components/MathEditor";

const SolutionStepsEditor = ({
  fontFamily = "",
  steps = [],
  onStepChange = () => {},
  onAddStep = () => {},
  onRemoveStep = () => {},
  onUploadStepImages = () => {},
  onRemoveStepImage = () => {},
  resolveMediaUrl = (value) => value,
  disabled = false,
  loadingMap = {},
  placeholder="Start typing the topic description...",
  rtl=false
}) => {
  const hasMultipleSteps = steps.length > 1;

  return (
    <div className="space-y-5">
      {steps.map((step, index) => {
        const stepLoading = Boolean(loadingMap[step.id]);
        return (
          <div key={step.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-700">
                  Step {index + 1}
                </h4>
                <p className="text-xs text-slate-500">
                  Add text, equations, and related images for this step.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 cursor-pointer hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => onRemoveStep(step.id)}
                disabled={disabled || !hasMultipleSteps}
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>

            <div className="space-y-4">
              <MathEditor
                fontFamily={fontFamily}
                value={step.explanation}
                onChange={(value) => onStepChange(step.id, value)}
                disabled={disabled}
                rtl={rtl}
                placeholder={placeholder}
              />

              <div className="form-group">
                <div className="media-upload-grid">
                  <label className="media-upload-tile">
                    {stepLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Upload size={18} />
                        <span>Upload Images</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => onUploadStepImages(step.id, event)}
                      disabled={disabled || stepLoading}
                    />
                  </label>
                  {(step.images ?? []).map((image) => (
                    <div key={image.id} className="media-upload-preview">
                      <img
                        src={resolveMediaUrl(image.url)}
                        alt="Solution visual"
                        className="preview-img"
                      />
                      <button
                        type="button"
                        className="media-remove-btn"
                        onClick={() => onRemoveStepImage(step.id, image.id)}
                        disabled={disabled || stepLoading}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className="global-btn secondary flex items-center gap-2"
        onClick={onAddStep}
        disabled={disabled}
      >
        <Plus size={16} />
        Add Step
      </button>
    </div>
  );
};

export default SolutionStepsEditor;
