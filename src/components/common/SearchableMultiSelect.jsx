import React from "react";
import { Check, Loader2, Search, X, ListChecks, ListX } from "lucide-react";

const normaliseOption = (option, valueKey, labelKey) => {
  if (!option) {
    return null;
  }

  const rawValue =
    option?.[valueKey] ??
    option?.value ??
    option?.id ??
    option?._id ??
    option?.key ??
    null;

  if (rawValue === null || rawValue === undefined) {
    return null;
  }
 
  const label =
    option?.[labelKey] ??
    option?.label ??
    option?.name ??
    option?.title ??
    option?.text ??
    String(rawValue);

  return {
    value: String(rawValue),
    label: String(label),
  };
};

const SearchableMultiSelect = ({
  options = [],
  selectedValues = [],
  value = "",
  multiple = true,
  onChange,
  placeholder = "Search...",
  disabled = false,
  loading = false,
  emptyState = "No options found",
  valueKey = "value",
  labelKey = "label",
  alwaysVisibleValues = [],
}) => {
  const [query, setQuery] = React.useState("");
  const [isDropdownOpen, setDropdownOpen] = React.useState(false);
  const closeTimeoutRef = React.useRef(null);
  const containerRef = React.useRef(null);

  const normalisedOptions = React.useMemo(() => {
    return options
      .map((option) => normaliseOption(option, valueKey, labelKey))
      .filter(Boolean);
  }, [options, valueKey, labelKey]);

  const selectedList = React.useMemo(() => {
    if (multiple) {
      return (selectedValues ?? []).map((item) => String(item));
    }

    if (value !== null && value !== undefined && value !== "") {
      return [String(value)];
    }

    if (Array.isArray(selectedValues) && selectedValues.length) {
      const first = selectedValues[0];
      if (first !== null && first !== undefined && first !== "") {
        return [String(first)];
      }
    } else if (
      typeof selectedValues === "string" ||
      typeof selectedValues === "number"
    ) {
      const simple = selectedValues;
      if (simple !== "") {
        return [String(simple)];
      }
    }

    return [];
  }, [multiple, selectedValues, value]);

  const selectedSet = React.useMemo(() => {
    return new Set(selectedList);
  }, [selectedList]);

  const selectedItems = React.useMemo(() => {
    if (!selectedList.length) {
      return [];
    }

    return selectedList.map((selectedValue) => {
      const matchingOption = normalisedOptions.find(
        (option) => option.value === selectedValue,
      );

      if (matchingOption) {
        return matchingOption;
      }

      return {
        value: selectedValue,
        label: selectedValue,
      };
    });
  }, [normalisedOptions, selectedList]);

  const filteredOptions = React.useMemo(() => {
    const alwaysVisibleSet = new Set(
      (alwaysVisibleValues ?? []).map((item) => String(item)),
    );

    if (!query.trim()) {
      return normalisedOptions;
    }

    const lowerQuery = query.trim().toLowerCase();
    return normalisedOptions.filter((option) =>
      alwaysVisibleSet.has(option.value) ||
      option.label.toLowerCase().includes(lowerQuery),
    );
  }, [alwaysVisibleValues, normalisedOptions, query]);

  const emitChange = React.useCallback(
    (nextValues) => {
      if (multiple) {
        onChange?.(nextValues);
      } else {
        const nextValue = nextValues.length ? nextValues[0] : "";
        onChange?.(nextValue);
      }
    },
    [multiple, onChange],
  );

  const handleToggleValue = (value) => {
    if (disabled) {
      return;
    }

    const stringValue = String(value);

    if (multiple) {
      const nextValues = selectedSet.has(stringValue)
        ? selectedList.filter((item) => item !== stringValue)
        : [...selectedList, stringValue];
      emitChange(nextValues);
    } else {
      const isSameSelection = selectedList[0] === stringValue;
      emitChange(isSameSelection ? [] : [stringValue]);
      setDropdownOpen(false);
    }
  };

  const handleRemove = (value) => {
    if (disabled) {
      return;
    }

    const stringValue = String(value);
    const nextValues = selectedList.filter((item) => item !== stringValue);
    emitChange(nextValues);
  };

  const handleClear = () => {
    if (disabled) {
      return;
    }
    emitChange([]);
  };

  const handleSelectAll = () => {
    if (disabled || !multiple) {
      return;
    }
    const allValues = normalisedOptions.map((option) => option.value);
    onChange?.(allValues);
  };

  const handleUnselectAll = () => {
    if (disabled || !multiple) {
      return;
    }
    onChange?.([]);
  };

  const handleInputFocus = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setDropdownOpen(true);
  };

  const handleInputBlur = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 150);
  };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    setDropdownOpen(true);
  };

  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const handleOutsidePointerDown = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsidePointerDown);
    document.addEventListener("touchstart", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePointerDown);
      document.removeEventListener("touchstart", handleOutsidePointerDown);
    };
  }, []);

  const hasOptions = normalisedOptions.length > 0;
  const allSelected =
    multiple && hasOptions && selectedSet.size === normalisedOptions.length;

  return (
    <div
      ref={containerRef}
      className={`rounded-[5px] border-1 border-[#c7c7c7] bg-[#fff] mt-2.5${
        disabled ? "pointer-events-none !bg-[#f4f4f4] !text-[#6b7280]" : ""
      }`}
    >
      <div
        className="flex flex-wrap items-center gap-2 border-b-1 border-[#c7c7c7] px-3 py-2 max-h-[50vh] overflow-y-auto"
        onMouseDown={() => setDropdownOpen(true)}
      >
        {multiple ? (
          selectedItems.length ? (
            <>
              {selectedItems.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleRemove(item.value)}
                  className="flex items-center gap-1 rounded-full bg-[#FAFAFA] px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                >
                  <span>{item.label}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Clear all
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-500">No items selected</span>
          )
        ) : selectedItems.length ? (
          <div className="flex w-full items-center justify-between text-sm text-gray-700">
            <span>{selectedItems[0].label}</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Clear
            </button>
          </div>
        ) : (
          <span className="text-sm text-gray-500">No item selected</span>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder={placeholder}
          className="w-[100%] bg-transparent text-sm outline-none placeholder:text-gray-400"
          disabled={disabled}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        {multiple && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={allSelected ? handleUnselectAll : handleSelectAll}
            className="flex items-center gap-1 text-xs font-bold text-gray-700 hover:text-gray-700 disabled:text-gray-400"
            disabled={disabled || !hasOptions}
          >
            {allSelected ? (
              <>
                <ListX className="h-3 w-3" />
                <span className="whitespace-nowrap">Unselect all</span>
              </>
            ) : (
              <>
                <ListChecks className="h-3 w-3" />
                <span className="whitespace-nowrap">Select all</span>
              </>
            )}
          </button>
        )}
      </div>

      {isDropdownOpen && (
        <div className="max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : filteredOptions.length ? (
            filteredOptions.map((option) => {
              const isSelected = selectedSet.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleToggleValue(option.value)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                    isSelected ? "bg-gray-100" : ""
                  }`}
                >
                  <span className="pr-2 text-gray-700">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-green-600" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-sm text-gray-500">{emptyState}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableMultiSelect;
