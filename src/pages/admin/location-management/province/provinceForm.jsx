import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Calendar1,
  FileText,
  FileType2,
  IdCardLanyard,
  LaptopMinimalCheck,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Text,
  TextInitial,
  X,
} from "lucide-react";
import { addNews, getNewsById, updateNewsById } from "@/api/newsApi";
import {
  addProvince,
  getProvinceById,
  updateProvinceById,
} from "@/api/locationApi";

const DEFAULT_FORM = {
  province: "",
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

// Main Component
const ProvinceForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateData = state?.data;
  const dataId = paramsId || state?.dataId || fallbackStateData?.id;
  const isEditMode = Boolean(dataId);

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    ...(fallbackStateData || {}),
  }));
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");

  // Fetch news data when editing
  React.useEffect(() => {
    if (!isEditMode || !dataId) return;

    const fetchStaff = async () => {
      try {
        setFetching(true);
        const result = await getProvinceById(dataId);
        const data = result?.data ?? result ?? {};
        setFormField((prev) => ({
          ...prev,
          province: data.province ?? "",
        }));
      } catch (err) {
        const message =
          err?.message || "Unable to load province detail. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchStaff();
  }, [isEditMode, dataId]);

  // Handle input change
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedProvince = safeTrimString(formField.province);
    if (!trimmedProvince) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      province: trimmedProvince,
    };
    try {
      setLoading(true);
      if (isEditMode) {
        await updateProvinceById(dataId, payload);
        toast.success("Province updated successfully.");
      } else {
        await addProvince(payload);
        toast.success("Province added successfully.");
      }
      navigate("/admin/province-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} province. Please try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>Admin Dashboard</h4>
          <h1>{isEditMode ? "Update Province" : "Add New Province"}</h1>
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
                <div className="form-group w-half">
                  <label>
                    <Text size={16} /> Province <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="province"
                    value={formField.province}
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
                  <>
                    <X size={18} />
                    Cancel
                  </>
                </button>
                <button
                  type="submit"
                  className="global-btn flex items-center justify-center gap-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      Please wait
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : isEditMode ? (
                    <>
                      Update Province
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Province
                      <Plus size={18} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
};

export default ProvinceForm;
