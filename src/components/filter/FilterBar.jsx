import React from "react";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";

const asArray = (value) => (Array.isArray(value) ? value : []);

const FilterBar = ({
  schema = [],
  filters = {},
  setFilters,
  onFiltersChange,
  onApply,
  onReset,
  loading = false,
  disabled = false,
}) => {
  const update = React.useCallback(
    (key, value) => {
      if (typeof setFilters === "function") {
        setFilters((prev) => ({ ...prev, [key]: value }));
      }
      if (typeof onFiltersChange === "function") {
        onFiltersChange(key, value);
      }
    },
    [setFilters, onFiltersChange],
  );

  const handleSubmit = React.useCallback(
    (event) => {
      event.preventDefault();
      if (typeof onApply === "function") {
        onApply();
      }
    },
    [onApply],
  );

  const renderField = (field) => {
    if (!field?.key) {
      return null;
    }

    const commonLabel = (
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {field.label}
      </label>
    );

    if (field.type === "search" || field.type === "text") {
      return (
        <div key={field.key}>
          {commonLabel}
          <input
            type={field.type === "search" ? "search" : "text"}
            value={filters[field.key] ?? ""}
            onChange={(event) => update(field.key, event.target.value)}
            placeholder={field.placeholder ?? ""}
            disabled={disabled || loading}
            className="form-input mt-0"
          />
        </div>
      );
    }

    if (field.type === "date") {
      return (
        <div key={field.key}>
          {commonLabel}
          <input
            type="date"
            value={filters[field.key] ?? ""}
            onChange={(event) => update(field.key, event.target.value)}
            disabled={disabled || loading}
            className="form-input mt-0"
          />
        </div>
      );
    }

    if (field.type === "multiselect") {
      return (
        <div key={field.key}>
          {commonLabel}
          <SearchableMultiSelect
            options={asArray(field.options)}
            selectedValues={asArray(filters[field.key])}
            multiple={true}
            onChange={(value) => update(field.key, asArray(value))}
            placeholder={field.placeholder ?? "Search..."}
            disabled={disabled || loading}
            valueKey={field.valueKey ?? "value"}
            labelKey={field.labelKey ?? "label"}
          />
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div key={field.key}>
          {commonLabel}
          <SearchableMultiSelect
            options={asArray(field.options)}
            value={filters[field.key] ?? ""}
            multiple={false}
            onChange={(value) => update(field.key, value || "")}
            placeholder={field.placeholder ?? "Select option"}
            disabled={disabled || loading}
            valueKey={field.valueKey ?? "value"}
            labelKey={field.labelKey ?? "label"}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="dashboard-body dashboard-body-card mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2>Filters</h2>
          <p className="text-xs text-slate-500">
            Use filters to refine listing results.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {schema.map(renderField)}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="global-btn secondary"
            onClick={onReset}
            disabled={disabled || loading}
          >
            Reset
          </button>
          <button
            type="submit"
            className="global-btn"
            disabled={disabled || loading}
          >
            {loading ? "Applying..." : "Apply"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FilterBar;
