import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircleIcon,
  Delete,
  Edit,
  Loader2,
  PlusCircleIcon,
} from "lucide-react";
import {
  AdminActionLink,
  AdminDeleteGuard,
} from "@/components/admin/AdminActionControls";
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
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";
import {
  deleteFacultyById,
  getAllPaginatedFaculty,
} from "@/api/facultyApi";
import TitleDescriptionForm from "@/components/TitleDescriptionForm";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

// Strip HTML tags from CKEditor description for plain-text table display.
const stripHtml = (html) => {
  if (typeof html !== "string") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};

const FacultyList = () => {
  const [records, setRecords] = React.useState([]);
  const [pagination, setPagination] = React.useState({ ...DEFAULT_PAGINATION });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [refreshKey, setRefreshKey] = React.useState(0);

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
        const trimmedSearch = debouncedSearch.trim();
        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        const response = await getAllPaginatedFaculty(params);
        if (!isMounted) {
          return;
        }

        const payload = response ?? {};
        const pageContainer = payload?.data ?? payload;
        const pageData = Array.isArray(pageContainer?.data)
          ? pageContainer.data
          : Array.isArray(pageContainer)
            ? pageContainer
            : [];
        const resolvedCurrent = Number(
          pageContainer?.current_page ?? params.page ?? 1,
        );
        const resolvedPerPage = Number(
          pageContainer?.per_page ?? params.per_page ?? 10,
        );
        const resolvedTotal = Number(pageContainer?.total ?? pageData.length);
        const resolvedLast = Number(pageContainer?.last_page ?? 1);
        const resolvedFrom =
          Number(pageContainer?.from) ||
          (pageData.length ? (resolvedCurrent - 1) * resolvedPerPage + 1 : 0);
        const resolvedTo =
          Number(pageContainer?.to) ||
          (pageData.length ? resolvedFrom + pageData.length - 1 : 0);

        setRecords(pageData);
        setPagination({
          current_page: resolvedCurrent,
          last_page: resolvedLast,
          per_page: resolvedPerPage,
          total: resolvedTotal,
          from: resolvedFrom,
          to: resolvedTo,
        });

        if (currentPage !== resolvedCurrent) {
          setCurrentPage(resolvedCurrent);
        }

        if (rowsPerPage !== resolvedPerPage) {
          setRowsPerPage(resolvedPerPage);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err?.message || "Failed to load faculty. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [currentPage, rowsPerPage, debouncedSearch, refreshKey]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(handle);
  }, [searchTerm]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const confirmDelete = async (id) => {
    try {
      await deleteFacultyById(id);
      setRefreshKey((prev) => prev + 1);
      toast.success("Faculty deleted successfully.");
    } catch (error) {
      const message =
        error?.message || "Failed to delete faculty. Please try again.";
      toast.error(message);
      console.error("Delete error:", error);
    }
  };

  const totalPages = Math.max(1, pagination.last_page ?? 1);
  const totalItems = pagination.total ?? records.length;
  const hasSearchQuery = Boolean(debouncedSearch.trim());
  const baseRowNumber = pagination.from ?? (currentPage - 1) * rowsPerPage + 1;
  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>Faculty Lists</h1>
          <p className="text-slate-600 text-md">
            Manage faculty members shown on the website.
          </p>
        </div>
        <div className="dh-right">
          <AdminActionLink
            to="/admin/add-new-faclty"
            className="global-btn"
          >
            Add New Faculty <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div>
      </div>
      <div className="dashboard-body dashboard-body-card">
        <TitleDescriptionForm pageKey='faculty' formTitle={'Faculty Page'} />
      </div>
      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder="Search name, title, or email..."
          searchValue={searchTerm}
          onSearchChange={handleSearchChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          from={pagination.from}
          to={pagination.to}
          onPageChange={setCurrentPage}
          loading={loading}
        />
        {error && (
          <Alert variant="destructive" className="alert-custom">
            <AlertCircleIcon size={18} />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}
        <Table className="global-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" />
                    <span>Loading data, please wait...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  {hasSearchQuery
                    ? "No faculty match your search."
                    : "No faculty available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => {
                const facultyId = row?._id ?? row?.id;
                const imageUrl =  buildBackendFileUrl(row?.image_url ?? row?.image ?? "");
                // const imageUrl = convertStorageUrl(
                //   buildBackendFileUrl(row?.image_url ?? row?.image ?? ""),
                // );
                return (
                  <TableRow key={facultyId ?? index}>
                    <TableCell className="font-medium">
                      {baseRowNumber + index}
                    </TableCell>
                    <TableCell>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={row?.name ?? "Faculty"}
                          className="h-10 w-10 rounded-full object-contain"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200" />
                      )}
                    </TableCell>
                    <TableCell>{row?.name}</TableCell>
                    <TableCell>{row?.title}</TableCell>
                    <TableCell>{row?.email}</TableCell>
                    <TableCell className="max-w-[260px] truncate">
                      {stripHtml(row?.description)}
                    </TableCell>
                    <TableCell>
                      <div className="table-actions">
                        <Tooltip>
                          <TooltipTrigger>
                            <AdminActionLink
                              className="edit-btn"
                              to={`/admin/add-new-faclty/${facultyId ?? ""}`}
                              state={{
                                facultyId,
                                faculty: row,
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
                                  permanently delete this faculty record and
                                  remove the data from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => confirmDelete(facultyId)}
                                >
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
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default FacultyList;
