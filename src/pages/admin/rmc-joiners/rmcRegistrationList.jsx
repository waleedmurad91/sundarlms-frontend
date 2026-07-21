import React from "react";
import { AdminActionLink } from "@/components/admin/AdminActionControls";
import { format } from "date-fns";
import {
  AlertCircleIcon,
  Eye,
  Loader2,
  Mail,
  User,
  FileSpreadsheet,
  Download,
  X,
  Delete,
  Edit,
} from "lucide-react";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ListToolbar from "@/components/ListToolbar";
import FilterBar from "@/components/filter/FilterBar";
import {
  deleteStudentRegistrationById,
  exportRMCRegistrations,
  exportStudentRegistrations,
  getRMCStudentRegistrations,
  importStudentRegistrations,
  studentRegistrationStatusGet,
  studentRegistrationStatusUpdate,
} from "@/api/registrationsApi";
import { useAuthStore } from "@/store/auth";
import { createRmcRegistrationListFilterSchema } from "@/config/filterSchemas";
import {
  buildFilterParams,
  buildFilterStateFromSchema,
} from "@/lib/applyFilters";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const normalizeRegistration = (payload) => {
  const data = payload?.data ?? payload ?? {};
  if (!data) return null;
  const createdAt =
    data?.created_at ?? data?.createdAt ?? data?.timestamp ?? "";
  return {
    id:
      data?.id ??
      data?._id ??
      data?.registration_id ??
      data?.registrationId ??
      null,
    student_name: data?.student_name ?? data?.name ?? "",
    grade: data?.grade ?? "",
    gender: data?.gender ?? "",
    city: data?.city ?? data?.district ?? "",
    school: data?.school ?? "",
    student_phone: data?.student_phone ?? "",
    email: data?.email ?? "",
    formType: data?.formType ?? "",
    created_at: createdAt,
    raw: data,
  };
};

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const RMCRegistrationList = () => {
  const templateFile = `${
    import.meta.env.VITE_BACKEND_FILE_BASE_PATH
  }student-registrations.csv`;
  const { role: storeRole, user } = useAuthStore();
  const resolvedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";
  const initialFilterSchema = React.useMemo(
    () => createRmcRegistrationListFilterSchema({}),
    [],
  );

  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [filterOptions, setFilterOptions] = React.useState({});
  const [filterDraft, setFilterDraft] = React.useState(() =>
    buildFilterStateFromSchema(initialFilterSchema),
  );
  const [appliedFilters, setAppliedFilters] = React.useState(() =>
    buildFilterStateFromSchema(initialFilterSchema),
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [importFile, setImportFile] = React.useState(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [registrationEnabled, setRegistrationEnabled] = React.useState(false);
  const [isLocking, setIsLocking] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const headerCheckboxRef = React.useRef(null);
  const hasHydratedFiltersRef = React.useRef(false);

  const [refreshKey, setRefreshKey] = React.useState(0);

  const filterSchema = React.useMemo(
    () => createRmcRegistrationListFilterSchema(filterOptions),
    [filterOptions],
  );

  React.useEffect(() => {
    const defaults = buildFilterStateFromSchema(filterSchema);
    const isSameValue = (left, right) => {
      if (Array.isArray(left) || Array.isArray(right)) {
        const leftArray = Array.isArray(left) ? left : [];
        const rightArray = Array.isArray(right) ? right : [];
        if (leftArray.length !== rightArray.length) {
          return false;
        }
        return leftArray.every((value, index) => value === rightArray[index]);
      }
      return (left ?? "") === (right ?? "");
    };

    const mergeBySchema = (previous) =>
      Object.keys(defaults).reduce((acc, key) => {
        acc[key] = previous?.[key] ?? defaults[key];
        return acc;
      }, {});

    setFilterDraft((prev) => {
      const next = mergeBySchema(prev);
      const unchanged = Object.keys(defaults).every((key) =>
        isSameValue(prev?.[key], next[key]),
      );
      return unchanged ? prev : next;
    });

    setAppliedFilters((prev) => {
      const next = mergeBySchema(prev);
      const unchanged = Object.keys(defaults).every((key) =>
        isSameValue(prev?.[key], next[key]),
      );
      return unchanged ? prev : next;
    });
  }, [filterSchema]);

  React.useEffect(() => {
    hasHydratedFiltersRef.current = false;
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const loadRegistrationStatus = async () => {
      try {
        const res = await studentRegistrationStatusGet();
        const enabled =
          res?.data?.enabled ?? res?.enabled ?? res?.data?.data?.enabled;
        if (!mounted) return;
        setRegistrationEnabled(
          enabled === 1 || enabled === true || enabled === "1",
        );
      } catch (err) {
        const message =
          err?.message || "Unable to load registration status. Using defaults.";
        toast.error(message);
      }
    };
    loadRegistrationStatus();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          page: currentPage,
          per_page: rowsPerPage,
        };
        Object.assign(params, buildFilterParams(appliedFilters));

        const response = await getRMCStudentRegistrations(params);
        if (!isMounted) return;

        const rootPayload = response ?? {};
        const rootData =
          rootPayload?.data && typeof rootPayload.data === "object"
            ? rootPayload.data
            : null;

        let container =
          rootData &&
          (rootData?.current_page !== undefined ||
            rootData?.last_page !== undefined ||
            Array.isArray(rootData?.data))
            ? rootData
            : rootPayload;

        if (
          container?.data &&
          typeof container.data === "object" &&
          !Array.isArray(container.data) &&
          (container.data?.current_page !== undefined ||
            container.data?.last_page !== undefined ||
            Array.isArray(container.data?.data))
        ) {
          container = container.data;
        }

        const list = Array.isArray(container?.data)
          ? container.data
          : Array.isArray(container)
            ? container
            : [];
        const normalized = list
          .map((item) => normalizeRegistration(item))
          .filter(Boolean);

        const responseFilters =
          container?.filters ?? rootPayload?.filters ?? rootData?.filters ?? {};
        const responseFilterOptions =
          responseFilters?.options ??
          responseFilters?.filter_options ??
          container?.filter_options ??
          rootPayload?.filter_options ??
          rootData?.filter_options ??
          (responseFilters?.status ||
          responseFilters?.grade ||
          responseFilters?.formType ||
          responseFilters?.district ||
          responseFilters?.city
            ? responseFilters
            : {});
        const responseAppliedFilters =
          responseFilters?.applied ??
          responseFilters?.applied_filters ??
          container?.applied_filters ??
          rootPayload?.applied_filters ??
          rootData?.applied_filters ??
          {};

        setFilterOptions((prev) => {
          const previousSerialized = JSON.stringify(prev ?? {});
          const nextSerialized = JSON.stringify(responseFilterOptions ?? {});
          return previousSerialized === nextSerialized
            ? prev
            : responseFilterOptions;
        });

        if (!hasHydratedFiltersRef.current) {
          const schemaFromApi =
            createRmcRegistrationListFilterSchema(responseFilterOptions);
          const initialFiltersFromApi = buildFilterStateFromSchema(
            schemaFromApi,
            responseAppliedFilters,
          );
          setFilterDraft(initialFiltersFromApi);
          setAppliedFilters(initialFiltersFromApi);
          hasHydratedFiltersRef.current = true;
        }

        const resolvedCurrent = Number(
          container?.current_page ?? params.page ?? 1,
        );
        const resolvedPerPage = Number(
          container?.per_page ?? params.per_page ?? rowsPerPage,
        );
        const resolvedTotal = Number(container?.total ?? normalized.length);
        const resolvedLast = Number(
          container?.last_page ??
            Math.max(1, Math.ceil(resolvedTotal / resolvedPerPage)),
        );
        const resolvedFrom =
          Number(container?.from) ||
          (normalized.length ? (resolvedCurrent - 1) * resolvedPerPage + 1 : 0);
        const resolvedTo =
          Number(container?.to) ||
          (normalized.length ? resolvedFrom + normalized.length - 1 : 0);

        setRecords(normalized);
        setPagination({
          current_page: resolvedCurrent,
          last_page: resolvedLast,
          per_page: resolvedPerPage,
          total: resolvedTotal,
          from: resolvedFrom,
          to: resolvedTo,
        });
        if (currentPage !== resolvedCurrent) setCurrentPage(resolvedCurrent);
        if (rowsPerPage !== resolvedPerPage) setRowsPerPage(resolvedPerPage);
      } catch (err) {
        if (!isMounted) return;
        const message =
          err?.message ||
          "Unable to load student registrations. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [currentPage, rowsPerPage, appliedFilters, refreshKey]);

  const selectableIds = React.useMemo(
    () => records.map((item) => item.id).filter(Boolean),
    [records],
  );
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));
  const someSelected =
    selectableIds.some((id) => selectedIds.has(id)) && !allSelected;

  React.useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  React.useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(
        Array.from(prev).filter((id) => selectableIds.includes(id)),
      );
      return next;
    });
  }, [selectableIds]);

  const totalItems = pagination.total ?? records.length;
  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const from = pagination.from ?? 0;
  const to = pagination.to ?? 0;
  const hasActiveFilters = React.useMemo(
    () => Object.keys(buildFilterParams(appliedFilters)).length > 0,
    [appliedFilters],
  );

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    if (
      filterDraft.date_from &&
      filterDraft.date_to &&
      new Date(filterDraft.date_from) > new Date(filterDraft.date_to)
    ) {
      toast.error("From Date cannot be later than To Date.");
      return;
    }

    setAppliedFilters({ ...filterDraft });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    const resetState = buildFilterStateFromSchema(filterSchema);
    setFilterDraft(resetState);
    setAppliedFilters(resetState);
    setCurrentPage(1);
  };

  const closeImportModal = () => {
    setIsImportOpen(false);
    setImportFile(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportRMCRegistrations();
      const payload = response?.data;
      if (!payload) {
        throw new Error("Export failed. No file received.");
      }

      // Handle either Blob (binary) or plain CSV text
      const csvBlob =
        payload instanceof Blob
          ? payload
          : new Blob([String(payload)], { type: "text/csv;charset=utf-8" });

      const disposition = response?.headers?.["content-disposition"] || "";
      const match = disposition.match(/filename=\"?([^\"]+)\"?/i);
      const fallbackName = `rmc_student_registration_${Date.now()}.csv`;
      const filename = match?.[1] || fallbackName;

      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export started. Your download should begin shortly.");
    } catch (err) {
      const message =
        err?.message || "Unable to export registrations right now.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleToggleRegistrationLock = async () => {
    setIsLocking(true);
    const nextEnabled = registrationEnabled ? 0 : 1;
    try {
      const payload = { enabled: nextEnabled };
      const res = await studentRegistrationStatusUpdate(payload);
      const message =
        res?.message ||
        `Registrations ${nextEnabled ? "unlocked" : "locked"} successfully.`;
      setRegistrationEnabled(nextEnabled);
      toast.success(message);
    } catch (err) {
      const message =
        err?.message || "Unable to update registration status right now.";
      toast.error(message);
    } finally {
      setIsLocking(false);
    }
  };

  const handleImportFileChange = (event) => {
    const file = event?.target?.files?.[0] ?? null;
    setImportFile(file);
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      toast.error("Please select an Excel file to import.");
      return;
    }
    setIsImporting(true);
    try {
      const payload = new FormData();
      payload.append("file", importFile);
      const res = await importStudentRegistrations(payload);
      const message =
        res?.message ||
        "Import started. Please check back for processed records.";
      toast.success(message);
      closeImportModal();
    } catch (err) {
      const message =
        err?.message || "Could not start import. Please try again.";
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const confirmDelete = async (id) => {
    try {
      await deleteStudentRegistrationById(id);
      setRefreshKey((prev) => prev + 1);
      toast.success("Registration deleted successfully.");
    } catch (error) {
      const message =
        error?.message || "Failed to delete registration. Please try again.";
      toast.error(message);
      console.error("Delete error:", error);
    }
  };

  const handleToggleSelectAll = (checked) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableIds));
  };

  const handleToggleRow = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one registration.");
      return;
    }
    const payload = {
      approved: true,
      ids: Array.from(selectedIds),
    };
    console.log("Bulk approve payload:", payload);
    toast.success("Bulk approve payload ready.");
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>
            {resolvedRole === "school" ? "School Dashboard" : "Admin Dashboard"}
          </h4>
          <h1>RMC Student Registrations</h1>
          <p className="text-slate-600 text-md">
            Review submissions from the RMC student admission form.
          </p>
        </div>
        <div className="dh-right flex-col items-end">
          {/* <div>
            <button
              type="button"
              className="global-btn flex items-center gap-2"
              onClick={handleToggleRegistrationLock}
              disabled={loading || isLocking}
            >
              {isLocking ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : registrationEnabled ? (
                "Lock Registrations"
              ) : (
                "Unlock Registrations"
              )}
            </button>
          </div> */}
          <div className="flex gap-2">
            {/* <button
              type="button"
              className="global-btn secondary flex items-center gap-2"
              onClick={() => setIsImportOpen(true)}
              disabled={loading}
            >
              <FileSpreadsheet size={16} />
              Excel Import
            </button> */}
            <button
              type="button"
              className="global-btn flex items-center gap-2"
              onClick={handleExport}
              disabled={loading || isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Import Student Registrations
                </h2>
                <p className="text-sm text-slate-500">
                  Upload an Excel file to add registrations. Backend wiring will
                  replace this soon.
                </p>
              </div>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-700"
                onClick={closeImportModal}
                disabled={isImporting}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Excel file
                </label>
                <input
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  onChange={handleImportFileChange}
                  disabled={isImporting}
                />
                {importFile && (
                  <p className="text-xs text-slate-500">
                    Selected: {importFile.name}
                  </p>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Template for Student Registration
                  </label>{" "}
                  <a
                    href={templateFile}
                    download
                    className="text-primary underline text-sm"
                  >
                    Download template file
                  </a>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeImportModal}
                  disabled={isImporting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="global-btn flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleImportSubmit}
                  disabled={isImporting}
                >
                  {isImporting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  Import File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FilterBar
        schema={filterSchema}
        filters={filterDraft}
        setFilters={setFilterDraft}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        loading={loading}
      />

      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          showSearch={false}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          from={from}
          to={to}
          onPageChange={setCurrentPage}
          disabled={loading}
          loading={loading}
        />

        {/* <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600 inline-block bg-[#FAFAFA] border border-[#F3F3F3] px-2 py-1 rounded-md">
            Selected: {selectedIds.size}
          </div>
          <button
            type="button"
            className="global-btn flex items-center gap-2"
            onClick={handleBulkApprove}
            disabled={loading}
          >
            Bulk Approve
          </button>
        </div> */}

        {error && (
          <Alert variant="destructive" className="alert-custom mb-4">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <Table className="global-table">
          <TableHeader>
            <TableRow>
              {/* <TableHead className="w-[60px]">
                <div className="flex items-center gap-2">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer"
                    checked={allSelected}
                    onChange={(event) =>
                      handleToggleSelectAll(event.target.checked)
                    }
                    disabled={selectableIds.length === 0}
                    aria-label="Select all registrations"
                  />
                  <span>#</span>
                </div>
              </TableHead> */}
              <TableHead className="w-[60px]">
                <div className="flex items-center gap-2">
                  <span>#</span>
                </div>
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading registrations...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">
                  {hasActiveFilters
                    ? "No registrations match your filters."
                    : "No registrations found."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((item, index) => (
                <TableRow key={item.id ?? index}>
                  {/* <TableCell>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer"
                        checked={item.id ? selectedIds.has(item.id) : false}
                        onChange={() => handleToggleRow(item.id)}
                        disabled={!item.id}
                        aria-label={`Select ${item.student_name || "student"}`}
                      />
                      <span>{(from || 0) + index}</span>
                    </div>
                  </TableCell> */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{(from || 0) + index}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                        <User size={16} className="text-slate-600" />
                      </div> */}
                      <div>
                        <div className="font-medium">
                          {item.student_name || "—"}
                        </div>
                        {item.gender && (
                          <div className="text-xs text-slate-500 capitalize">
                            {item.gender}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.grade || "—"}</TableCell>
                  <TableCell>{item.school || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-slate-700">
                      {item.email || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.formType == "" ? (
                      <span
                        className={`px-2 py-1 rounded-2xl text-xs bg-blue-100 text-blue-700 border border-blue-200 capitalize"
                      `}
                      >
                        N/A
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-1 rounded-2xl text-xs uppercase ${
                          item?.formType === "rmc"
                            ? "bg-blue-100 text-blue-700 border border-blue-200 capitalize"
                            : "bg-yellow-100 text-yellow-700 border border-yellow-200 capitalize"
                        }`}
                      >
                        {item?.formType}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.created_at
                      ? format(
                          new Date(item.created_at),
                          "MMM dd, yyyy - hh:mm a",
                        )
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="table-actions">
                      <Tooltip>
                        <TooltipTrigger>
                          <AdminActionLink
                            className="view-btn"
                            to={`${basePath}/view-rmc-detail/${item.id ?? ""}`}
                            state={{
                              registration: item.raw,
                              registrationId: item.id,
                            }}
                          >
                            <Eye size={15} />
                          </AdminActionLink>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Detail</p>
                        </TooltipContent>
                      </Tooltip>
                      {/* <Tooltip>
                        <TooltipTrigger>
                          <AdminActionLink
                            className="edit-btn"
                            to={`${basePath}/student-registration-form/${
                              item.id ?? ""
                            }`}
                            state={{
                              registration: item.raw,
                              registrationId: item.id,
                            }}
                          >
                            <Edit size={15} />
                          </AdminActionLink>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit</p>
                        </TooltipContent>
                      </Tooltip>
                      <AdminDeleteGuard>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <button type="button" className="delete-btn">
                                <Delete size={15} />
                              </button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete</p>
                          </TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete this record and remove your
                              data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => confirmDelete(item.id)}
                            >
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </AdminDeleteGuard> */}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default RMCRegistrationList;
