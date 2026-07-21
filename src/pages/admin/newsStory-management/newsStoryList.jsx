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
  Archive,
  Check,
  Delete,
  Edit,
  Eye,
  GraduationCap,
  Info,
  Loader2,
  LockKeyhole,
  PlusCircleIcon,
  School,
  Shield,
  TriangleAlert,
  UserCog,
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
import { format } from "date-fns";
import { Alert, AlertTitle } from "@/components/ui/alert";
import ListToolbar from "@/components/ListToolbar";
import DemographicCard from "@/components/DemographicCard";
import TitleDescriptionForm from "@/components/TitleDescriptionForm";
import {
  deleteStaffById,
  getAllPaginatedStaff,
  getStatistics,
} from "@/api/staffApi";
import {
  deleteCertificateById,
  getAllPaginatedCertificates,
} from "@/api/certificateApi";
import { deleteNewsById, getAllPaginatedNews } from "@/api/newsApi";

const DEFAULT_PAGINATION = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
  from: 0,
  to: 0,
};

const NewsStoryList = () => {
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

        const response = await getAllPaginatedNews(params);
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
          err?.message || "Failed to load news. Please try again.";
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
      await deleteNewsById(id);
      setRefreshKey((prev) => prev + 1);
      toast.success("News deleted successfully.");
    } catch (error) {
      const message =
        error?.message || "Failed to delete news. Please try again.";
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
          <h1>News & Story Lists</h1>
          <p className="text-slate-600 text-md">
            Manage news and updates for website.
          </p>
        </div>
        <div className="dh-right">
          <AdminActionLink
            module="news_stories"
            action="create"
            to="/admin/add-new-news-story"
            className="global-btn"
          >
            Add News <PlusCircleIcon size={15} />
          </AdminActionLink>
        </div>
      </div>
      <div className="dashboard-body dashboard-body-card">
                <TitleDescriptionForm pageKey='NewsPopUp' formTitle={''} showPublishToggle />
         </div>
      <div className="dashboard-body dashboard-body-card">
        <ListToolbar
          searchPlaceholder="Search title, status, or category..."
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
              <TableHead className="w-[100px]">#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
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
                    ? "No news match your search."
                    : "No news available."}
                </TableCell>
              </TableRow>
            ) : (
              records.map((row, index) => (
                <TableRow key={row._id ?? row.id ?? index}>
                  <TableCell className="font-medium">
                    {baseRowNumber + index}
                  </TableCell>
                  <TableCell>{row?.title}</TableCell>
                  <TableCell>
                    <span className="capitalize">{row?.news_type}</span>
                  </TableCell>
                  <TableCell>{row?.enrollment_category}</TableCell>
                  <TableCell>
                    {row?.is_published == "Published" ? (
                      <span className="text-green-600 bg-green-100 rounded-2xl text-[11px] py-0.5 px-2 font-bold inline-flex gap-1">
                        <Check size={14} />
                        Published
                      </span>
                    ) : (
                      <span className="text-blue-600 rounded-2xl bg-blue-100 text-[11px] py-0.5 px-2 font-bold inline-flex gap-1">
                        <Archive size={13} />
                        Draft
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(row?.published_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="table-actions">
                      {/* <Tooltip>
                        <TooltipTrigger>
                          <AdminActionLink
                            className="view-btn"
                            to="/admin/view-staff-detail"
                            state={{
                              staffId: row?._id ?? row?.id,
                              staff: row,
                            }}
                          >
                            <Eye size={15} />
                          </AdminActionLink>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Detail</p>
                        </TooltipContent>
                      </Tooltip> */}
                      <Tooltip>
                        <TooltipTrigger>
                          <AdminActionLink
                            className="edit-btn"
                            to={`/admin/add-new-news-story/${
                              row?._id ?? row?.id ?? ""
                            }`}
                            state={{
                              newsId: row?._id ?? row?.id,
                              news: row,
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
                                onClick={() =>
                                  confirmDelete(row?._id ?? row?.id)
                                }
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default NewsStoryList;
