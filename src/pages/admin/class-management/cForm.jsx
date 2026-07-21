import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { addClass, getClassById, updateClassById } from "@/api/classApi";
import { deleteSubjectById, swapOrderingSubjectsById } from "@/api/subjectApi";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  AlertCircleIcon,
  Book,
  Delete,
  Edit,
  Eye,
  GripVertical,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";
import {
  AdminActionLink,
  AdminDeleteGuard,
} from "@/components/admin/AdminActionControls";
import { useAuthStore } from "@/store/auth";

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const DEFAULT_FORM = { schoolIds: [], name: "", section: "A" };

const resolveGradeLabel = (classItem = {}) => {
  const gradeSource =
    classItem?.grade ??
    classItem?.grade_info ??
    classItem?.gradeInfo ??
    classItem?.grade_data ??
    classItem?.gradeData;

  if (typeof gradeSource === "string") {
    const trimmed = gradeSource.trim();
    if (trimmed) return trimmed;
  } else if (
    gradeSource &&
    typeof gradeSource === "object" &&
    !Array.isArray(gradeSource)
  ) {
    const name =
      gradeSource?.name ??
      gradeSource?.title ??
      gradeSource?.label ??
      gradeSource?.grade_name ??
      gradeSource?.gradeName ??
      "";
    if (typeof name === "string" && name.trim()) return name.trim();
    if (gradeSource?.id != null && gradeSource?.id !== "")
      return `Grade ${gradeSource.id}`;
  }

  const fallbackName =
    classItem?.grade_name ??
    classItem?.gradeName ??
    classItem?.grade_label ??
    classItem?.gradeLabel ??
    classItem?.grade_level ??
    classItem?.gradeLevel ??
    "";
  if (typeof fallbackName === "string" && fallbackName.trim())
    return fallbackName.trim();
  if (classItem?.grade_id != null && classItem?.grade_id !== "")
    return `Grade ${classItem.grade_id}`;
  if (typeof classItem?.grade === "number") return `Grade ${classItem.grade}`;
  if (!gradeSource && typeof classItem?.grade === "string") {
    const value = classItem.grade.trim();
    if (value) return value.startsWith("Grade") ? value : `Grade ${value}`;
  }
  return "";
};

const normaliseClass = (payload) => {
  if (!payload) return { ...DEFAULT_FORM };
  const data = payload?.data ?? payload;
  const schoolCandidates = [];
  const add = (c) => {
    if (c != null) schoolCandidates.push(c);
  };

  if (Array.isArray(data?.school_ids)) data.school_ids.forEach(add);
  if (Array.isArray(data?.schoolIds)) data.schoolIds.forEach(add);
  if (Array.isArray(data?.schools)) {
    data.schools.forEach((s) => {
      if (typeof s === "string" || typeof s === "number") add(s);
      else add(s?.id ?? s?._id ?? s?.value ?? s?.school_id ?? s?.schoolId);
    });
  }
  add(
    data?.schoolId ??
      data?.school_id ??
      data?.school?.id ??
      data?.school?._id ??
      data?.school,
  );

  const resolvedNameCandidate =
    data?.name ??
    data?.class_name ??
    data?.className ??
    data?.title ??
    data?.label;
  const resolvedName =
    typeof resolvedNameCandidate === "string" && resolvedNameCandidate.trim()
      ? resolvedNameCandidate.trim()
      : resolveGradeLabel(data);

  return {
    schoolIds: Array.from(
      new Set(schoolCandidates.filter(Boolean).map((c) => String(c))),
    ),
    name: resolvedName ?? "",
    section: data?.section ?? DEFAULT_FORM.section,
  };
};

const getSubjectId = (subject) => subject?._id ?? subject?.id;

// ---------------------------------------------------------------------------
// DragGhost — fixed-position floating clone that follows the cursor
// ---------------------------------------------------------------------------

const DragGhost = ({ subject, cursorY, cursorX, tableRef }) => {
  if (!subject) return null;

  // Align ghost left edge to the table's left edge, full table width
  const tableRect = tableRef?.current?.getBoundingClientRect?.();
  const left = tableRect ? tableRect.left : cursorX - 20;
  const width = tableRect ? tableRect.width : 400;

  return (
    <div
      style={{
        position: "fixed",
        top: cursorY - 22, // vertically centred on cursor
        left,
        width,
        pointerEvents: "none",
        zIndex: 9999,
        background: "#fff",
        boxShadow:
          "0 8px 24px rgba(99,102,241,0.18), 0 2px 8px rgba(0,0,0,0.10)",
        border: "1.5px solid #6366f1",
        borderRadius: 8,
        opacity: 0.97,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        height: 44,
        gap: 10,
      }}
    >
      <GripVertical size={16} style={{ color: "#6366f1", flexShrink: 0 }} />
      <span style={{ fontWeight: 500, color: "#1f2937", fontSize: 14 }}>
        {subject?.subject ?? "—"}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PlaceholderRow — single clean drop indicator line
// ---------------------------------------------------------------------------

const PlaceholderRow = ({ height }) => (
  <TableRow
    style={{
      height,
      background: "rgba(99,102,241,0.06)",
      borderTop: "2.5px solid #6366f1",
      borderBottom: "2.5px solid #6366f1",
      pointerEvents: "none",
    }}
  >
    <TableCell colSpan={4} style={{ padding: 0 }} />
  </TableRow>
);

// ---------------------------------------------------------------------------
// SubjectRow — drag only via grip handle
// ---------------------------------------------------------------------------

const SubjectRow = ({
  row,
  index,
  baseRowNumber,
  isDragging,
  onGripMouseDown,
  onDelete,
  basePath,
  rowRef,
}) => {
  const subjectId = getSubjectId(row);

  return (
    <TableRow
      ref={rowRef}
      data-subject-row="true"
      style={{
        // Row becomes invisible (slot is kept so table doesn't jump) while dragging
        opacity: isDragging ? 0 : 1,
        transition: "opacity 0.1s",
        userSelect: "none",
        cursor: "default",
      }}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <GripVertical
            size={16}
            className="text-gray-400 shrink-0"
            style={{ cursor: "grab" }}
            onMouseDown={(e) => onGripMouseDown(e, index)}
          />
          <span>{baseRowNumber + index}</span>
        </div>
      </TableCell>
      <TableCell>{row?.subject ?? "-"}</TableCell>
      <TableCell>
        {row?.created_at
          ? format(new Date(row.created_at), "MMM dd, yyyy - hh:mm a")
          : "-"}
      </TableCell>
      <TableCell>
        <div className="table-actions">
          <Tooltip>
            <TooltipTrigger>
              <AdminActionLink
                className="view-btn"
                to={`${basePath}/view-subject-detail/${subjectId ?? ""}`}
                state={{ subjectId, subject: row }}
              >
                <Eye size={15} />
              </AdminActionLink>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Detail</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <AdminActionLink
                className="edit-btn"
                to={`${basePath}/add-new-subject/${subjectId ?? ""}`}
                state={{ subjectId, subject: row }}
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
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    this subject.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(subjectId)}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </AdminDeleteGuard>
        </div>
      </TableCell>
    </TableRow>
  );
};

// ---------------------------------------------------------------------------
// ClassForm
// ---------------------------------------------------------------------------

const ClassForm = () => {
  const { role: storeRole, user } = useAuthStore();
  const navigate = useNavigate();
  const { id: paramsId } = useParams();

  const resolvedRole =
    typeof (storeRole ?? user?.role) === "string"
      ? (storeRole ?? user?.role).toLowerCase()
      : "admin";
  const basePath = resolvedRole === "school" ? "/school" : "/admin";

  const { state } = useLocation();
  const fallbackStateClass = state?.class;
  const classId =
    paramsId ||
    state?.classId ||
    fallbackStateClass?.id ||
    fallbackStateClass?._id;
  const isEditMode = Boolean(classId);

  const [formField, setFormField] = React.useState(() =>
    normaliseClass(fallbackStateClass),
  );
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");

  const [subjects, setSubjects] = React.useState([]);
  const subjectsRef = React.useRef([]);
  const [swappingIds, setSwappingIds] = React.useState(new Set());

  // Drag refs — no React state so handlers are never stale
  const dragFromRef = React.useRef(null);
  const insertAtRef = React.useRef(null);
  const rowHeightRef = React.useRef(44);
  const firstRowRef = React.useRef(null);
  const tableRef = React.useRef(null); // ref on the <table> wrapper div

  // Visual state (drives re-renders)
  const [dragIndex, setDragIndex] = React.useState(null);
  const [insertIndex, setInsertIndex] = React.useState(null);
  // Ghost cursor position
  const [ghostPos, setGhostPos] = React.useState({ x: 0, y: 0 });

  // ---------------------------------------------------------------------------
  // Fetch class
  // ---------------------------------------------------------------------------

  React.useEffect(() => {
    if (!isEditMode) return;
    const fetchClass = async () => {
      try {
        setFetching(true);
        const result = await getClassById(classId);
        const data = result?.data ?? result;
        setFormField(normaliseClass(result));
        const rawSubjects = Array.isArray(data?.subjects) ? data.subjects : [];
        setSubjects(
          [...rawSubjects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        );
      } catch (err) {
        const message =
          err?.message || "Unable to load class details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };
    fetchClass();
  }, [classId, isEditMode]);

  // ---------------------------------------------------------------------------
  // Pointer-based drag
  // ---------------------------------------------------------------------------

  const pointerCleanup = React.useRef(null);

  const handleGripMouseDown = React.useCallback((e, index) => {
    if (e.button !== 0) return;
    e.preventDefault();

    dragFromRef.current = index;
    insertAtRef.current = index;
    setDragIndex(index);
    setInsertIndex(index);
    setGhostPos({ x: e.clientX, y: e.clientY });

    const tbody = e.currentTarget.closest("tbody");

    const onMove = (moveEvt) => {
      // Update ghost position every move
      setGhostPos({ x: moveEvt.clientX, y: moveEvt.clientY });

      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll("tr[data-subject-row]"));
      let newInsert = rows.length;

      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (moveEvt.clientY < mid) {
          newInsert = i;
          break;
        }
      }

      if (newInsert !== insertAtRef.current) {
        insertAtRef.current = newInsert;
        setInsertIndex(newInsert);
      }
    };

    const onUp = async () => {
      cleanup();

      const fromIndex = dragFromRef.current;
      const toInsert = insertAtRef.current;

      setDragIndex(null);
      setInsertIndex(null);
      dragFromRef.current = null;
      insertAtRef.current = null;

      if (fromIndex === null || toInsert === null) return;

      // Convert insert-before index → target swap index
      let targetIndex = toInsert > fromIndex ? toInsert - 1 : toInsert;
      if (targetIndex === fromIndex) return;

      const originalSubjects = [...subjectsRef.current];
      const moved = originalSubjects[fromIndex];
      const displaced = originalSubjects[targetIndex];
      const movedId = getSubjectId(moved);
      const displaceId = getSubjectId(displaced);

      // Optimistic swap
      const reordered = [...originalSubjects];
      reordered[fromIndex] = displaced;
      reordered[targetIndex] = moved;
      setSubjects(reordered);

      if (movedId && displaceId && movedId !== displaceId) {
        setSwappingIds(new Set([movedId, displaceId]));
        swapOrderingSubjectsById({
          first_subject_id: movedId,
          second_subject_id: displaceId,
        })
          .catch((err) => {
            toast.error(
              err?.message || "Failed to reorder subjects. Please try again.",
            );
            setSubjects(originalSubjects);
          })
          .finally(() => {
            setSwappingIds(new Set());
          });
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", cleanup);
      pointerCleanup.current = null;
    };

    pointerCleanup.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", cleanup);
  }, []);

  // Keep subjectsRef in sync
  React.useEffect(() => {
    subjectsRef.current = subjects;
  }, [subjects]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pointerCleanup.current) pointerCleanup.current();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Build visible rows with placeholder
  //
  // Key fix: we skip inserting the placeholder at the dragged row's own index
  // (or the index right after it) — those positions produce no visual change,
  // and inserting there caused the "shadow appears both above and below" bug.
  // ---------------------------------------------------------------------------

  const buildRows = () => {
    if (dragIndex === null || insertIndex === null) {
      return subjects.map((s, i) => ({ type: "row", subject: s, index: i }));
    }

    const rows = [];
    let placeholderInserted = false;

    subjects.forEach((s, i) => {
      // Insert placeholder BEFORE this row if insertIndex === i,
      // but skip if it would land on the dragged row itself or
      // immediately after it (which looks the same as "no move").
      if (
        !placeholderInserted &&
        insertIndex === i &&
        insertIndex !== dragIndex && // not the dragged row's own slot
        insertIndex !== dragIndex + 1 // not immediately after (same visual)
      ) {
        rows.push({ type: "placeholder" });
        placeholderInserted = true;
      }
      rows.push({ type: "row", subject: s, index: i });
    });

    // Append placeholder at the end if needed
    if (
      !placeholderInserted &&
      insertIndex >= subjects.length &&
      dragIndex !== subjects.length - 1 // skip if dragged row is already last
    ) {
      rows.push({ type: "placeholder" });
    }

    return rows;
  };

  const visibleRows = buildRows();

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDeleteSubject = async (id) => {
    try {
      await deleteSubjectById(id);
      setSubjects((prev) => prev.filter((s) => getSubjectId(s) !== id));
      toast.success("Subject deleted successfully.");
    } catch (err) {
      toast.error(
        err?.message || "Failed to delete subject. Please try again.",
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!formField.name.trim()) {
      const message = "Please fill in all required fields.";
      setError(message);
      toast.error(message);
      return;
    }
    const payload = {
      name: formField.name.trim(),
      section: formField.section.trim(),
      ...(formField.schoolIds.length && {
        school_ids: formField.schoolIds,
        school_id: formField.schoolIds[0],
      }),
    };
    try {
      setLoading(true);
      if (isEditMode) {
        await updateClassById(classId, payload);
        toast.success("Class updated successfully.");
      } else {
        await addClass(payload);
        toast.success("Class added successfully.");
      }
      navigate(`${basePath}/class-lists`);
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} class. Please try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Subject being dragged (for ghost label)
  const draggedSubject =
    dragIndex !== null ? subjectsRef.current[dragIndex] : null;

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{isEditMode ? "Update Class" : "Add New Class"}</h1>
        </div>
      </div>

      <div className="dashboard-body dashboard-body-card">
        <form onSubmit={handleSubmit}>
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
                <div className="form-group max-w-1/2 w-half">
                  <label>
                    <Book size={16} />
                    Grade<span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    placeholder="Enter grade number"
                    value={formField.name}
                    onChange={handleChange}
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
                      <span>Please wait</span>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : isEditMode ? (
                    <>
                      <span>Update Class</span>
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      <span>Add Class</span>
                      <Plus size={18} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {isEditMode && !fetching && (
        <div className="dashboard-body dashboard-body-card mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Subjects</h2>
          </div>

          {/* Floating ghost that follows the cursor during drag */}
          <DragGhost
            subject={draggedSubject}
            cursorY={ghostPos.y}
            cursorX={ghostPos.x}
            tableRef={tableRef}
          />

          <div ref={tableRef}>
            <Table className="global-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">#</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      No subjects found for this class.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((item, vi) => {
                    if (item.type === "placeholder") {
                      return (
                        <PlaceholderRow
                          key={`ph-${vi}`}
                          height={rowHeightRef.current}
                        />
                      );
                    }
                    const { subject: row, index } = item;
                    return (
                      <SubjectRow
                        key={getSubjectId(row) ?? index}
                        row={row}
                        index={index}
                        baseRowNumber={1}
                        swappingIds={swappingIds}
                        isDragging={dragIndex === index}
                        onGripMouseDown={handleGripMouseDown}
                        onDelete={handleDeleteSubject}
                        basePath={basePath}
                        rowRef={index === 0 ? firstRowRef : null}
                        rowHeightRef={rowHeightRef}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {subjects.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <GripVertical size={12} />
              Drag rows to reorder subjects.
            </p>
          )}
        </div>
      )}
    </>
  );
};

export default ClassForm;
