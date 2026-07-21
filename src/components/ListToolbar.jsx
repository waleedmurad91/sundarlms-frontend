import React from "react";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const noop = () => {};

/**
 * Lightweight, reusable toolbar for list/table views.
 * Drop it above any table and provide the pagination/search props below.
 *
 * Example:
 * <ListToolbar
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   rowsPerPage={rowsPerPage}
 *   onRowsPerPageChange={setRowsPerPage}
 *   currentPage={currentPage}
 *   totalPages={totalPages}
 *   totalItems={filteredItems.length}
 *   onPageChange={setCurrentPage}
 * />
 */
const ListToolbar = ({
  searchPlaceholder = "Search records...",
  searchValue = "",
  onSearchChange = noop,
  showSearch = true,
  rowsPerPage = 10,
  rowsPerPageOptions = [10, 25, 50, 100],
  onRowsPerPageChange = noop,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  from = 0,
  to = 0,
  onPageChange = noop,
  disabled = false,
  disableSearchWhileLoading = false,
  loading = false,
}) => {
  const handleRowsChange = (event) => {
    const value = Number(event.target.value);
    onRowsPerPageChange(value);
  };

  const handleSearchInput = (event) => {
    onSearchChange(event.target.value);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="list-toolbar">
      <div className="list-toolbar__left">
        {showSearch && (
          <label className="list-toolbar__search">
            <Search size={16} className="list-toolbar__search-icon" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={handleSearchInput}
              disabled={disableSearchWhileLoading && (disabled || loading)}
            />
            {loading && (
              <Loader2
                size={16}
                className="ml-2 animate-spin text-gray-500 flex-shrink-0"
              />
            )}
          </label>
        )}
        <span className="list-toolbar__count">
          Showing{" "}
          {totalItems
            ? `${Math.max(1, from || 1)}–${Math.max(to || 0, from || 0)} of ${totalItems.toLocaleString()}`
            : "0 results"}
        </span>
      </div>
      <div className="list-toolbar__right">
        <label className="list-toolbar__rows">
          Rows per page
          <select
            value={rowsPerPage}
            onChange={handleRowsChange}
            disabled={disabled}
          >
            {rowsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="list-toolbar__pagination">
          <button
            type="button"
            onClick={goToPreviousPage}
            disabled={disabled || currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {Math.min(currentPage, totalPages)} of{" "}
            {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            onClick={goToNextPage}
            disabled={disabled || currentPage >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListToolbar;
