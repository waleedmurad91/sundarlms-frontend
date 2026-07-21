import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, Loader2, Plus, Save, Text, X } from "lucide-react";
import {
  addCity,
  getAllPaginatedTehsils,
  getCityById,
  updateCityById,
} from "@/api/locationApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";

const DEFAULT_FORM = {
  tehsil_id: "",
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

  const candidates = [data?.data, data?.items, data?.results, data?.tehsils];
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

const normalizeTehsilOptions = (payload) =>
  Array.from(
    new Map(
      resolveCollection(payload)
        .map((item) => {
          const id =
            item?.id ?? item?._id ?? item?.tehsil_id ?? item?.value ?? "";
          const name =
            item?.name ?? item?.label ?? item?.tehsil_name ?? item?.title ?? "";

          if (!id || !name) return null;
          return [String(id), { id: String(id), name: String(name) }];
        })
        .filter(Boolean),
    ).values(),
  );

const createInitialForm = (fallbackStateData) => ({
  tehsil_id: safeTrimString(
    fallbackStateData?.tehsil_id ?? fallbackStateData?.tehsil?.id,
  ),
  name: safeTrimString(fallbackStateData?.name ?? fallbackStateData?.city),
});

const CityForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateData = state?.data;
  const dataId = paramsId || state?.dataId || fallbackStateData?.id;
  const isEditMode = Boolean(dataId);

  const [formField, setFormField] = React.useState(() =>
    createInitialForm(fallbackStateData),
  );
  const [tehsilOptions, setTehsilOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [tehsilLoading, setTehsilLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    const fetchTehsils = async () => {
      try {
        setTehsilLoading(true);
        const result = await getAllPaginatedTehsils({
          page: 1,
          per_page: 800,
        });
        if (!active) return;
        setTehsilOptions(normalizeTehsilOptions(result));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load tehsils.");
      } finally {
        if (active) {
          setTehsilLoading(false);
        }
      }
    };

    fetchTehsils();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !dataId) return;

    let active = true;

    const fetchCity = async () => {
      try {
        setFetching(true);
        const result = await getCityById(dataId);
        if (!active) return;

        const data = result?.data ?? result ?? {};
        const selectedTehsilId = safeTrimString(
          data?.tehsil_id ?? data?.tehsil?.id,
        );
        const selectedTehsilName = safeTrimString(data?.tehsil?.name);

        setFormField({
          tehsil_id: selectedTehsilId,
          name: safeTrimString(data?.name ?? data?.city),
        });

        if (selectedTehsilId && selectedTehsilName) {
          setTehsilOptions((prev) => {
            if (prev.some((item) => item.id === selectedTehsilId)) {
              return prev;
            }
            return [
              { id: selectedTehsilId, name: selectedTehsilName },
              ...prev,
            ];
          });
        }
      } catch (err) {
        if (!active) return;
        const message =
          err?.message || "Unable to load city detail. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) {
          setFetching(false);
        }
      }
    };

    fetchCity();

    return () => {
      active = false;
    };
  }, [isEditMode, dataId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleTehsilChange = React.useCallback((value) => {
    setFormField((prev) => ({ ...prev, tehsil_id: String(value ?? "") }));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedTehsilId = safeTrimString(formField.tehsil_id);
    const trimmedCityName = safeTrimString(formField.name);

    if (!trimmedTehsilId || !trimmedCityName) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      tehsil_id: trimmedTehsilId,
      name: trimmedCityName,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateCityById(dataId, payload);
        toast.success("City updated successfully.");
      } else {
        await addCity(payload);
        toast.success("City added successfully.");
      }
      navigate("/admin/city-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} city. Please try again.`;
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
          <h1>{isEditMode ? "Update City" : "Add New City"}</h1>
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
                    <Text size={16} /> Tehsil <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={tehsilOptions}
                    value={formField.tehsil_id}
                    multiple={false}
                    onChange={handleTehsilChange}
                    placeholder="Search tehsil..."
                    disabled={loading || tehsilLoading}
                    loading={tehsilLoading}
                    emptyState="No tehsil found"
                    valueKey="id"
                    labelKey="name"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Text size={16} /> City Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    value={formField.name}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Enter city name"
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
                      Update City
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add City
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

export default CityForm;
