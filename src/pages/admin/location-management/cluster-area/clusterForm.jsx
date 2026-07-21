import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, Loader2, Plus, Save, Text, X } from "lucide-react";
import {
  addCluster,
  getAllPaginatedCities,
  getClusterById,
  updateClusterById,
} from "@/api/locationApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";

const DEFAULT_FORM = {
  city_id: "",
  name: "",
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

const resolveCollection = (payload) => {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) return data;

  const candidates = [data?.data, data?.items, data?.results, data?.cities];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (data && typeof data === "object") {
    const firstArray = Object.values(data).find((value) =>
      Array.isArray(value),
    );
    if (Array.isArray(firstArray)) return firstArray;
  }

  return [];
};

const normalizeCityOptions = (payload) =>
  Array.from(
    new Map(
      resolveCollection(payload)
        .map((item) => {
          const id =
            item?.id ?? item?._id ?? item?.city_id ?? item?.value ?? "";
          const name =
            item?.name ?? item?.label ?? item?.city_name ?? item?.title ?? "";

          if (!id || !name) return null;
          return [String(id), { id: String(id), name: String(name) }];
        })
        .filter(Boolean),
    ).values(),
  );

const createInitialForm = (fallbackStateData) => ({
  city_id: safeTrimString(
    fallbackStateData?.city_id ?? fallbackStateData?.city?.id,
  ),
  name: safeTrimString(
    fallbackStateData?.name ??
      fallbackStateData?.cluster ??
      fallbackStateData?.cluster_area,
  ),
});

const ClusterForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateData = state?.data;
  const dataId = paramsId || state?.dataId || fallbackStateData?.id;
  const isEditMode = Boolean(dataId);

  const [formField, setFormField] = React.useState(() =>
    createInitialForm(fallbackStateData),
  );
  const [cityOptions, setCityOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [cityLoading, setCityLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    const fetchCities = async () => {
      try {
        setCityLoading(true);
        const result = await getAllPaginatedCities({
          page: 1,
          per_page: 1000,
        });
        if (!active) return;
        setCityOptions(normalizeCityOptions(result));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load cities.");
      } finally {
        if (active) {
          setCityLoading(false);
        }
      }
    };

    fetchCities();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !dataId) return;

    let active = true;

    const fetchCluster = async () => {
      try {
        setFetching(true);
        const result = await getClusterById(dataId);
        if (!active) return;

        const data = result?.data ?? result ?? {};
        const selectedCityId = safeTrimString(data?.city_id ?? data?.city?.id);
        const selectedCityName = safeTrimString(data?.city?.name);

        setFormField({
          city_id: selectedCityId,
          name: safeTrimString(
            data?.name ?? data?.cluster ?? data?.cluster_area,
          ),
        });

        if (selectedCityId && selectedCityName) {
          setCityOptions((prev) => {
            if (prev.some((item) => item.id === selectedCityId)) {
              return prev;
            }
            return [{ id: selectedCityId, name: selectedCityName }, ...prev];
          });
        }
      } catch (err) {
        if (!active) return;
        const message =
          err?.message || "Unable to load cluster detail. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) {
          setFetching(false);
        }
      }
    };

    fetchCluster();

    return () => {
      active = false;
    };
  }, [isEditMode, dataId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleCityChange = React.useCallback((value) => {
    setFormField((prev) => ({ ...prev, city_id: String(value ?? "") }));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedCityId = safeTrimString(formField.city_id);
    const trimmedClusterName = safeTrimString(formField.name);

    if (!trimmedCityId || !trimmedClusterName) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      city_id: trimmedCityId,
      name: trimmedClusterName,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateClusterById(dataId, payload);
        toast.success("Cluster area updated successfully.");
      } else {
        await addCluster(payload);
        toast.success("Cluster area added successfully.");
      }
      navigate("/admin/cluster-area-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} cluster area. Please try again.`;
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
          <h1>{isEditMode ? "Update Cluster Area" : "Add New Cluster Area"}</h1>
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
                    <Text size={16} /> City <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={cityOptions}
                    value={formField.city_id}
                    multiple={false}
                    onChange={handleCityChange}
                    placeholder="Search city..."
                    disabled={loading || cityLoading}
                    loading={cityLoading}
                    emptyState="No city found"
                    valueKey="id"
                    labelKey="name"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Text size={16} /> Cluster Area Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    value={formField.name}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Enter cluster area name"
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
                      Please wait
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : isEditMode ? (
                    <>
                      Update Cluster Area
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Cluster Area
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

export default ClusterForm;
