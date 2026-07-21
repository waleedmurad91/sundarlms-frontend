import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Loader2,
  Plus,
  Save,
  Text,
  X,
} from "lucide-react";
import {
  addDistrict,
  getAllPaginatedProvinces,
  getDistrictById,
  updateDistrictById,
} from "@/api/locationApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";

const DEFAULT_FORM = {
  province_id: "",
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

  const candidates = [data?.data, data?.items, data?.results, data?.provinces];
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

const normalizeProvinceOptions = (payload) =>
  Array.from(
    new Map(
      resolveCollection(payload)
        .map((item) => {
          const id =
            item?.id ?? item?._id ?? item?.province_id ?? item?.value ?? "";
          const name =
            item?.name ??
            item?.label ??
            item?.province_name ??
            item?.title ??
            "";

          if (!id || !name) return null;
          return [String(id), { id: String(id), name: String(name) }];
        })
        .filter(Boolean),
    ).values(),
  );

const createInitialForm = (fallbackStateData) => ({
  province_id: safeTrimString(
    fallbackStateData?.province_id ?? fallbackStateData?.province?.id,
  ),
  name: safeTrimString(fallbackStateData?.name ?? fallbackStateData?.district),
});

const DistrictForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateData = state?.data;
  const dataId = paramsId || state?.dataId || fallbackStateData?.id;
  const isEditMode = Boolean(dataId);

  const [formField, setFormField] = React.useState(() =>
    createInitialForm(fallbackStateData),
  );
  const [provinceOptions, setProvinceOptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [provinceLoading, setProvinceLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    const fetchProvinces = async () => {
      try {
        setProvinceLoading(true);
        const result = await getAllPaginatedProvinces({ page: 1, per_page: 500 });
        if (!active) return;
        setProvinceOptions(normalizeProvinceOptions(result));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load provinces.");
      } finally {
        if (active) {
          setProvinceLoading(false);
        }
      }
    };

    fetchProvinces();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isEditMode || !dataId) return;

    let active = true;

    const fetchDistrict = async () => {
      try {
        setFetching(true);
        const result = await getDistrictById(dataId);
        if (!active) return;

        const data = result?.data ?? result ?? {};
        const selectedProvinceId = safeTrimString(
          data?.province_id ?? data?.province?.id,
        );
        const selectedProvinceName = safeTrimString(data?.province?.name);

        setFormField({
          province_id: selectedProvinceId,
          name: safeTrimString(data?.name ?? data?.district),
        });

        if (selectedProvinceId && selectedProvinceName) {
          setProvinceOptions((prev) => {
            if (prev.some((item) => item.id === selectedProvinceId)) {
              return prev;
            }
            return [
              { id: selectedProvinceId, name: selectedProvinceName },
              ...prev,
            ];
          });
        }
      } catch (err) {
        if (!active) return;
        const message =
          err?.message || "Unable to load district detail. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        if (active) {
          setFetching(false);
        }
      }
    };

    fetchDistrict();

    return () => {
      active = false;
    };
  }, [isEditMode, dataId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleProvinceChange = React.useCallback((value) => {
    setFormField((prev) => ({ ...prev, province_id: String(value ?? "") }));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedProvinceId = safeTrimString(formField.province_id);
    const trimmedDistrictName = safeTrimString(formField.name);

    if (!trimmedProvinceId || !trimmedDistrictName) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      province_id: trimmedProvinceId,
      name: trimmedDistrictName,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateDistrictById(dataId, payload);
        toast.success("District updated successfully.");
      } else {
        await addDistrict(payload);
        toast.success("District added successfully.");
      }
      navigate("/admin/district-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} district. Please try again.`;
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
          <h1>{isEditMode ? "Update District" : "Add New District"}</h1>
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
                  <SearchableMultiSelect
                    options={provinceOptions}
                    value={formField.province_id}
                    multiple={false}
                    onChange={handleProvinceChange}
                    placeholder="Search province..."
                    disabled={loading || provinceLoading}
                    loading={provinceLoading}
                    emptyState="No province found"
                    valueKey="id"
                    labelKey="name"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Text size={16} /> District <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    value={formField.name}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Enter district name"
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
                      Update District
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add District
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

export default DistrictForm;
