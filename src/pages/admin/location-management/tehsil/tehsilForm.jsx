import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, Loader2, Plus, Save, Text, X } from "lucide-react";
import {
  addTehsil,
  getAllPaginatedDistricts,
  getTehsilById,
  updateTehsilById,
} from "@/api/locationApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";

const DEFAULT_FORM = {
  district_id: "",
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

  const candidates = [data?.data, data?.items, data?.results, data?.districts];
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

const normalizeDistrictOptions = (payload) =>
  Array.from(
    new Map(
      resolveCollection(payload)
        .map((item) => {
          const id =
            item?.id ?? item?._id ?? item?.district_id ?? item?.value ?? "";
          const name =
            item?.name ??
            item?.label ??
            item?.district_name ??
            item?.title ??
            "";

          if (!id || !name) return null;
          return [String(id), { id: String(id), name: String(name) }];
        })
        .filter(Boolean),
    ).values(),
  );

const createInitialForm = (fallbackStateData) => ({
  district_id: safeTrimString(
    fallbackStateData?.district_id ?? fallbackStateData?.district?.id,
  ),
  name: safeTrimString(fallbackStateData?.name ?? fallbackStateData?.tehsil),
});

const TehsilForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateData = state?.data;
  const dataId = paramsId || state?.dataId || fallbackStateData?.id;
  const isEditMode = Boolean(dataId);

  const [formField, setFormField] = React.useState(() =>
    createInitialForm(fallbackStateData),
  );
  const [districtOptions, setDistrictOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [districtLoading, setDistrictLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    const fetchDistricts = async () => {
      try {
        setDistrictLoading(true);
        const result = await getAllPaginatedDistricts({
          page: 1,
          per_page: 500,
        });
        if (!active) return;
        setDistrictOptions(normalizeDistrictOptions(result));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load districts.");
      } finally {
        if (active) {
          setDistrictLoading(false);
        }
      }
    };

    fetchDistricts();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !dataId) return;

    let active = true;

    const fetchTehsil = async () => {
      try {
        setFetching(true);
        const result = await getTehsilById(dataId);
        if (!active) return;

        const data = result?.data ?? result ?? {};
        const selectedDistrictId = safeTrimString(
          data?.district_id ?? data?.district?.id,
        );
        const selectedDistrictName = safeTrimString(data?.district?.name);

        setFormField({
          district_id: selectedDistrictId,
          name: safeTrimString(data?.name ?? data?.tehsil),
        });

        if (selectedDistrictId && selectedDistrictName) {
          setDistrictOptions((prev) => {
            if (prev.some((item) => item.id === selectedDistrictId)) {
              return prev;
            }
            return [
              { id: selectedDistrictId, name: selectedDistrictName },
              ...prev,
            ];
          });
        }
      } catch (err) {
        if (!active) return;
        const message =
          err?.message || "Unable to load tehsil detail. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) {
          setFetching(false);
        }
      }
    };

    fetchTehsil();

    return () => {
      active = false;
    };
  }, [isEditMode, dataId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleDistrictChange = React.useCallback((value) => {
    setFormField((prev) => ({ ...prev, district_id: String(value ?? "") }));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedDistrictId = safeTrimString(formField.district_id);
    const trimmedTehsilName = safeTrimString(formField.name);

    if (!trimmedDistrictId || !trimmedTehsilName) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      district_id: trimmedDistrictId,
      name: trimmedTehsilName,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateTehsilById(dataId, payload);
        toast.success("Tehsil updated successfully.");
      } else {
        await addTehsil(payload);
        toast.success("Tehsil added successfully.");
      }
      navigate("/admin/tehsil-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} tehsil. Please try again.`;
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
          <h1>{isEditMode ? "Update Tehsil" : "Add New Tehsil"}</h1>
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
                    <Text size={16} /> District <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={districtOptions}
                    value={formField.district_id}
                    multiple={false}
                    onChange={handleDistrictChange}
                    placeholder="Search district..."
                    disabled={loading || districtLoading}
                    loading={districtLoading}
                    emptyState="No district found"
                    valueKey="id"
                    labelKey="name"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Text size={16} /> Tehsil Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    value={formField.name}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Enter tehsil name"
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
                      Update Tehsil
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Tehsil
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

export default TehsilForm;
