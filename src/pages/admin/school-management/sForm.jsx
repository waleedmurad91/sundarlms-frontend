import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Check,
  Eye,
  EyeClosed,
  FileImage,
  IdCardLanyard,
  Loader2,
  Lock,
  Mail,
  Map,
  MapPin,
  MapPinCheck,
  Phone,
  Plus,
  Save,
  School,
  User,
  X,
} from "lucide-react";
import { addSchool, getSchoolById, updateSchoolById } from "@/api/schoolApi";
import SearchableMultiSelect from "@/components/common/SearchableMultiSelect";
import {
  checkEmail,
  checkUsername,
  getLocationCities,
  getLocationCitiesByTehsil,
  getLocationClusterAreas,
  getLocationDistricts,
  getLocationProvinces,
  getLocationTehsils,
} from "@/api/authApi";
import { useAuthStore } from "@/store/auth";

const DEFAULT_FORM = {
  school_name: "",
  email: "",
  username: "",
  password: "",
  confirm_password: "",
  province: "",
  district: "",
  tehsil: "",
  city: "",
  cluster_area: "",
  address: "",
  principal_name: "",
  principal_phone: "",
  focal_person_name: "",
  focal_person_phone: "",
  rmc_member: false,
  is_rmc_venue: false,
  agree: false,
  profile_image: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+92\d{10}$/;
const EXISTING_OPTION_PREFIX = "__existing__:";
const USERNAME_CHECK_DEBOUNCE_MS = 500;

const buildExistingOptionId = (type, name) =>
  `${EXISTING_OPTION_PREFIX}${type}:${String(name)}`;

const isExistingOptionId = (value) =>
  typeof value === "string" && value.startsWith(EXISTING_OPTION_PREFIX);

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  value === "true" ||
  value === "on";

const toArray = (payload) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;

  const candidates = [
    data?.data,
    data?.items,
    data?.results,
    data?.provinces,
    data?.districts,
    data?.tehsils,
    data?.cities,
    data?.cluster_areas,
    data?.clusterAreas,
    data?.["cluster-areas"],
  ];

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

const normalizeOptions = (payload) =>
  toArray(payload)
    .map((item) => {
      const id =
        item?.id ??
        item?._id ??
        item?.value ??
        item?.province_id ??
        item?.district_id ??
        item?.tehsil_id ??
        item?.city_id ??
        item?.cluster_area_id;
      if (id === null || id === undefined || id === "") return null;
      const name =
        item?.name ??
        item?.label ??
        item?.title ??
        item?.text ??
        item?.province_name ??
        item?.district_name ??
        item?.tehsil_name ??
        item?.city_name ??
        item?.cluster_area_name ??
        String(id);
      return { id: String(id), name: String(name) };
    })
    .filter(Boolean);

const mergeUniqueOptions = (primary = [], secondary = []) => {
  const seen = new Set();
  const merged = [];
  [...primary, ...secondary].forEach((item) => {
    const id = String(item?.id ?? "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push({ id, name: String(item?.name ?? id) });
  });
  return merged;
};

const pickName = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return (
      value?.name ??
      value?.label ??
      value?.title ??
      value?.province_name ??
      value?.district_name ??
      value?.tehsil_name ??
      value?.city_name ??
      value?.cluster_area_name ??
      ""
    );
  }
  return String(value);
};

const pickId = (value) => {
  if (!value || typeof value !== "object") return "";
  return String(
    value?.id ??
      value?._id ??
      value?.value ??
      value?.province_id ??
      value?.district_id ??
      value?.tehsil_id ??
      value?.city_id ??
      value?.cluster_area_id ??
      "",
  );
};

const sanitizePhoneInput = (inputValue = "") => {
  const digits = String(inputValue ?? "").replace(/\D/g, "");
  if (!digits) return "";
  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = `92${normalized.slice(1)}`;
  } else if (!normalized.startsWith("92")) {
    normalized = `92${normalized}`;
  }
  return `+${normalized.slice(0, 12)}`;
};

const formatPhoneMaskedInput = (inputValue = "") => {
  const normalizedPhone = sanitizePhoneInput(inputValue);
  if (!normalizedPhone) return "";

  const localNumber = normalizedPhone.slice(3);
  const firstPart = localNumber.slice(0, 3);
  const secondPart = localNumber.slice(3, 10);

  if (!firstPart) return "+92";
  if (!secondPart) return `+92-${firstPart}`;
  return `+92-${firstPart}-${secondPart}`;
};

const resolveImagePreview = (value) => {
  if (!value || typeof value !== "string") return "";
  if (
    value.startsWith("http") ||
    value.startsWith("/") ||
    value.startsWith("data:")
  ) {
    return value;
  }
  return value;
};

const SchoolForm = ({
  dashboardTitle = "Admin Dashboard",
  pageTitle,
  profileMode = false,
  forcedSchoolId = "",
  lockIdentityFields = false,
  onSuccess,
}) => {
  const { role: storeRole, user } = useAuthStore();
  const normalizedRole = String(storeRole ?? user?.role ?? "").toLowerCase();
  const isSchoolRole = normalizedRole === "school";
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateSchool = state?.school;
  const schoolId =
    String(forcedSchoolId ?? "").trim() ||
    paramsId ||
    state?.schoolId ||
    fallbackStateSchool?.id;
  const isEditMode = profileMode ? true : Boolean(schoolId);
  const isIdentityLocked = Boolean(profileMode || lockIdentityFields);
  const resolvedPageTitle =
    pageTitle || (isEditMode ? "Update School" : "Add New School");

  const [formField, setFormField] = React.useState(DEFAULT_FORM);
  const [displayPicturePreview, setDisplayPicturePreview] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");
  const [passwordType, setPasswordType] = React.useState("password");
  const [initialUsername, setInitialUsername] = React.useState("");
  const [initialEmail, setInitialEmail] = React.useState("");
  const [usernameAvailability, setUsernameAvailability] = React.useState({
    status: "idle",
    message: "",
  });
  const usernameCheckTimeoutRef = React.useRef(null);
  const usernameCheckRequestRef = React.useRef(0);
  const [emailAvailability, setEmailAvailability] = React.useState({
    status: "idle",
    message: "",
  });
  const emailCheckTimeoutRef = React.useRef(null);
  const emailCheckRequestRef = React.useRef(0);

  const [provinceOptions, setProvinceOptions] = React.useState([]);
  const [districtOptions, setDistrictOptions] = React.useState([]);
  const [tehsilOptions, setTehsilOptions] = React.useState([]);
  const [cityOptions, setCityOptions] = React.useState([]);
  const [clusterOptions, setClusterOptions] = React.useState([]);

  const [provinceId, setProvinceId] = React.useState("");
  const [districtId, setDistrictId] = React.useState("");
  const [tehsilId, setTehsilId] = React.useState("");
  const [cityId, setCityId] = React.useState("");
  const [clusterId, setClusterId] = React.useState("");

  const [provinceLoading, setProvinceLoading] = React.useState(false);
  const [districtLoading, setDistrictLoading] = React.useState(false);
  const [tehsilLoading, setTehsilLoading] = React.useState(false);
  const [cityLoading, setCityLoading] = React.useState(false);
  const [clusterLoading, setClusterLoading] = React.useState(false);

  const handleShowPasswordToggle = () => {
    setPasswordType((prevType) =>
      prevType === "password" ? "text" : "password",
    );
  };

  const upsertOption = React.useCallback((setter, id, name) => {
    if (!id || !name) return;
    setter((prev) => {
      const exists = prev.some((item) => item.id === String(id));
      if (exists) return prev;
      return [{ id: String(id), name: String(name) }, ...prev];
    });
  }, []);

  const hydrateSchool = React.useCallback(
    (source) => {
      const data = source ?? {};
      const provinceName = pickName(data?.province ?? data?.province_name);
      const districtName = pickName(data?.district ?? data?.district_name);
      const tehsilName = pickName(data?.tehsil ?? data?.tehsil_name);
      const cityName = pickName(data?.city ?? data?.city_name);
      const clusterName = pickName(
        data?.cluster_area ?? data?.clusterArea ?? data?.cluster_area_name,
      );

      const next = {
        school_name: data?.school_name ?? data?.name ?? "",
        email: data?.email ?? "",
        username:
          data?.username ??
          data?.user?.username ??
          data?.user_name ??
          data?.user?.name ??
          "",
        password: "",
        confirm_password: "",
        province: provinceName,
        district: districtName,
        tehsil: tehsilName,
        city: cityName,
        cluster_area: clusterName,
        address: data?.address ?? "",
        principal_name: data?.principal_name ?? data?.principalName ?? "",
        principal_phone: formatPhoneMaskedInput(
          data?.principal_phone ?? data?.principalPhone ?? data?.phone ?? "",
        ),
        focal_person_name:
          data?.focal_person_name ?? data?.focalPersonName ?? "",
        focal_person_phone: formatPhoneMaskedInput(
          data?.focal_person_phone ?? data?.focalPersonPhone ?? "",
        ),
        rmc_member: toBoolean(data?.rmc_member ?? data?.agree),
        is_rmc_venue: toBoolean(data?.is_rmc_venue ?? data?.isRmcVenue),
        agree: toBoolean(data?.agree ?? data?.rmc_member),
        profile_image:
          data?.user?.profile_image ??
          data?.profile_image ??
          data?.profileImage ??
          data?.display_picture ??
          data?.display_picture_url ??
          "",
      };
      setFormField(next);
      setInitialUsername(String(next.username ?? "").trim());
      setInitialEmail(String(next.email ?? "").trim());
      const provinceSelection =
        String(
          data?.province_id ?? data?.provinceId ?? pickId(data?.province) ?? "",
        ) ||
        (provinceName ? buildExistingOptionId("province", provinceName) : "");
      const districtSelection =
        String(
          data?.district_id ?? data?.districtId ?? pickId(data?.district) ?? "",
        ) ||
        (districtName ? buildExistingOptionId("district", districtName) : "");
      const tehsilSelection =
        String(
          data?.tehsil_id ?? data?.tehsilId ?? pickId(data?.tehsil) ?? "",
        ) || (tehsilName ? buildExistingOptionId("tehsil", tehsilName) : "");
      const citySelection =
        String(data?.city_id ?? data?.cityId ?? pickId(data?.city) ?? "") ||
        (cityName ? buildExistingOptionId("city", cityName) : "");
      const clusterSelection =
        String(
          data?.cluster_area_id ??
            data?.clusterAreaId ??
            pickId(data?.cluster_area) ??
            pickId(data?.clusterArea) ??
            "",
        ) || (clusterName ? buildExistingOptionId("cluster", clusterName) : "");

      if (provinceSelection && provinceName) {
        upsertOption(setProvinceOptions, provinceSelection, provinceName);
      }
      if (districtSelection && districtName) {
        upsertOption(setDistrictOptions, districtSelection, districtName);
      }
      if (tehsilSelection && tehsilName) {
        upsertOption(setTehsilOptions, tehsilSelection, tehsilName);
      }
      if (citySelection && cityName) {
        upsertOption(setCityOptions, citySelection, cityName);
      }
      if (clusterSelection && clusterName) {
        upsertOption(setClusterOptions, clusterSelection, clusterName);
      }

      setProvinceId(provinceSelection);
      setDistrictId(districtSelection);
      setTehsilId(tehsilSelection);
      setCityId(citySelection);
      setClusterId(clusterSelection);
    },
    [upsertOption],
  );

  React.useEffect(() => {
    if (fallbackStateSchool) hydrateSchool(fallbackStateSchool);
  }, [fallbackStateSchool, hydrateSchool]);

  React.useEffect(() => {
    if (!profileMode) return;
    if (!schoolId) {
      setError("Unable to load school profile details.");
      return;
    }
    setError("");
  }, [profileMode, schoolId]);

  React.useEffect(() => {
    const username = String(formField.username ?? "").trim();

    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
      usernameCheckTimeoutRef.current = null;
    }

    if (!username) {
      setUsernameAvailability({ status: "idle", message: "" });
      return;
    }

    if (
      isEditMode &&
      initialUsername &&
      username.toLowerCase() === initialUsername.toLowerCase()
    ) {
      setUsernameAvailability({
        status: "available",
        message: "Current username.",
      });
      return;
    }

    setUsernameAvailability({
      status: "checking",
      message: "Checking username availability...",
    });

    const requestId = usernameCheckRequestRef.current + 1;
    usernameCheckRequestRef.current = requestId;

    usernameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await checkUsername(username);
        if (usernameCheckRequestRef.current !== requestId) return;
        const available = Boolean(response?.data?.available);
        setUsernameAvailability(
          available
            ? { status: "available", message: "Username is available." }
            : { status: "unavailable", message: "Username is already taken." },
        );
      } catch (err) {
        if (usernameCheckRequestRef.current !== requestId) return;
        setUsernameAvailability({
          status: "error",
          message: err?.message || "Unable to verify username right now.",
        });
      }
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
        usernameCheckTimeoutRef.current = null;
      }
    };
  }, [formField.username, initialUsername, isEditMode]);

  React.useEffect(() => {
    const email = String(formField.email ?? "")
      .trim()
      .toLowerCase();

    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
      emailCheckTimeoutRef.current = null;
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      setEmailAvailability({ status: "idle", message: "" });
      return;
    }

    if (
      isEditMode &&
      initialEmail &&
      email === initialEmail.trim().toLowerCase()
    ) {
      setEmailAvailability({
        status: "available",
        message: "Current email.",
      });
      return;
    }

    setEmailAvailability({
      status: "checking",
      message: "Checking email availability...",
    });

    const requestId = emailCheckRequestRef.current + 1;
    emailCheckRequestRef.current = requestId;

    emailCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await checkEmail(email);
        if (emailCheckRequestRef.current !== requestId) return;
        const available = Boolean(response?.data?.available);
        setEmailAvailability(
          available
            ? { status: "available", message: "Email is available." }
            : { status: "unavailable", message: "Email is already taken." },
        );
      } catch (err) {
        if (emailCheckRequestRef.current !== requestId) return;
        setEmailAvailability({
          status: "error",
          message: err?.message || "Unable to verify email right now.",
        });
      }
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
        emailCheckTimeoutRef.current = null;
      }
    };
  }, [formField.email, initialEmail, isEditMode]);

  React.useEffect(() => {
    let active = true;
    const fetchProvinces = async () => {
      setProvinceLoading(true);
      try {
        const response = await getLocationProvinces();
        if (!active) return;
        const nextOptions = normalizeOptions(response);
        setProvinceOptions((prev) => mergeUniqueOptions(prev, nextOptions));
      } catch (err) {
        if (!active) return;
        toast.error(err?.message || "Unable to load provinces.");
      } finally {
        if (active) setProvinceLoading(false);
      }
    };
    fetchProvinces();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!provinceId) {
      setDistrictOptions([]);
      return;
    }
    let active = true;
    const fetchDistricts = async () => {
      setDistrictLoading(true);
      try {
        const districtFilter = isExistingOptionId(provinceId)
          ? undefined
          : provinceId;
        const response = await getLocationDistricts(districtFilter);
        if (!active) return;
        const nextOptions = normalizeOptions(response);
        setDistrictOptions((prev) => mergeUniqueOptions(prev, nextOptions));
      } catch {
        if (!active) return;
      } finally {
        if (active) setDistrictLoading(false);
      }
    };
    fetchDistricts();
    return () => {
      active = false;
    };
  }, [provinceId]);

  React.useEffect(() => {
    if (!districtId) {
      setTehsilOptions([]);
      return;
    }
    let active = true;
    const fetchTehsils = async () => {
      setTehsilLoading(true);
      try {
        const tehsilFilter = isExistingOptionId(districtId)
          ? undefined
          : districtId;
        const response = await getLocationTehsils(tehsilFilter);
        if (!active) return;
        const nextOptions = normalizeOptions(response);
        setTehsilOptions((prev) => mergeUniqueOptions(prev, nextOptions));
      } catch {
        if (!active) return;
      } finally {
        if (active) setTehsilLoading(false);
      }
    };
    fetchTehsils();
    return () => {
      active = false;
    };
  }, [districtId]);

  React.useEffect(() => {
    if (!tehsilId) {
      setCityOptions([]);
      return;
    }
    let active = true;
    const fetchCities = async () => {
      setCityLoading(true);
      try {
        const tehsilFilter = isExistingOptionId(tehsilId)
          ? undefined
          : tehsilId;
        const response = await getLocationCitiesByTehsil(tehsilFilter);
        if (!active) return;
        const nextOptions = normalizeOptions(response);
        setCityOptions((prev) => mergeUniqueOptions(prev, nextOptions));
      } catch {
        try {
          const cityFallbackFilter = isExistingOptionId(districtId)
            ? undefined
            : districtId;
          const fallbackResponse = await getLocationCities(cityFallbackFilter);
          if (!active) return;
          const fallbackOptions = normalizeOptions(fallbackResponse);
          setCityOptions((prev) => mergeUniqueOptions(prev, fallbackOptions));
        } catch {
          if (!active) return;
        }
      } finally {
        if (active) setCityLoading(false);
      }
    };
    fetchCities();
    return () => {
      active = false;
    };
  }, [tehsilId, districtId]);

  React.useEffect(() => {
    if (!cityId) {
      setClusterOptions([]);
      return;
    }
    let active = true;
    const fetchClusters = async () => {
      setClusterLoading(true);
      try {
        const clusterFilter = isExistingOptionId(cityId) ? undefined : cityId;
        const response = await getLocationClusterAreas(clusterFilter);
        if (!active) return;
        const nextOptions = normalizeOptions(response);
        setClusterOptions((prev) => mergeUniqueOptions(prev, nextOptions));
      } catch {
        if (!active) return;
      } finally {
        if (active) setClusterLoading(false);
      }
    };
    fetchClusters();
    return () => {
      active = false;
    };
  }, [cityId]);

  React.useEffect(() => {
    if (!isEditMode || !schoolId) return;
    const fetchSchool = async () => {
      try {
        setFetching(true);
        const result = await getSchoolById(schoolId);
        hydrateSchool(result?.data ?? result ?? {});
      } catch (err) {
        const message =
          err?.message || "Unable to load school details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };
    fetchSchool();
  }, [isEditMode, schoolId, hydrateSchool]);

  React.useEffect(() => {
    const current = formField.profile_image;
    let objectUrl;
    if (!current) {
      setDisplayPicturePreview("");
    } else if (current instanceof File) {
      objectUrl = URL.createObjectURL(current);
      setDisplayPicturePreview(objectUrl);
    } else {
      setDisplayPicturePreview(resolveImagePreview(current));
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [formField.profile_image]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === "principal_phone" || name === "focal_person_phone") {
      setFormField((prev) => ({
        ...prev,
        [name]: formatPhoneMaskedInput(value),
      }));
      return;
    }
    if (type === "checkbox" && (name === "agree" || name === "rmc_member")) {
      setFormField((prev) => ({
        ...prev,
        agree: checked,
        rmc_member: checked,
      }));
      return;
    }
    if (type === "checkbox" && name === "is_rmc_venue") {
      setFormField((prev) => ({ ...prev, is_rmc_venue: checked }));
      return;
    }
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleDisplayPictureChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    setFormField((prev) => ({ ...prev, profile_image: file }));
  };

  const onProvinceChange = (value) => {
    const next = value || "";
    const selected = provinceOptions.find((item) => item.id === next);
    setProvinceId(next);
    setDistrictId("");
    setTehsilId("");
    setCityId("");
    setClusterId("");
    setDistrictOptions([]);
    setTehsilOptions([]);
    setCityOptions([]);
    setClusterOptions([]);
    setFormField((prev) => ({
      ...prev,
      province: selected?.name ?? "",
      district: "",
      tehsil: "",
      city: "",
      cluster_area: "",
    }));
  };

  const onDistrictChange = (value) => {
    const next = value || "";
    const selected = districtOptions.find((item) => item.id === next);
    setDistrictId(next);
    setTehsilId("");
    setCityId("");
    setClusterId("");
    setTehsilOptions([]);
    setCityOptions([]);
    setClusterOptions([]);
    setFormField((prev) => ({
      ...prev,
      district: selected?.name ?? "",
      tehsil: "",
      city: "",
      cluster_area: "",
    }));
  };

  const onTehsilChange = (value) => {
    const next = value || "";
    const selected = tehsilOptions.find((item) => item.id === next);
    setTehsilId(next);
    setCityId("");
    setClusterId("");
    setCityOptions([]);
    setClusterOptions([]);
    setFormField((prev) => ({
      ...prev,
      tehsil: selected?.name ?? "",
      city: "",
      cluster_area: "",
    }));
  };

  const onCityChange = (value) => {
    const next = value || "";
    const selected = cityOptions.find((item) => item.id === next);
    setCityId(next);
    setClusterId("");
    setClusterOptions([]);
    setFormField((prev) => ({
      ...prev,
      city: selected?.name ?? "",
      cluster_area: "",
    }));
  };

  const onClusterChange = (value) => {
    const next = value || "";
    const selected = clusterOptions.find((item) => item.id === next);
    setClusterId(next);
    setFormField((prev) => ({ ...prev, cluster_area: selected?.name ?? "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const school_name = formField.school_name.trim();
    const email = formField.email.trim();
    const username = formField.username.trim();
    const password = formField.password.trim();
    const confirm_password = formField.confirm_password.trim();
    const province = formField.province.trim();
    const district = formField.district.trim();
    const tehsil = formField.tehsil.trim();
    const city = formField.city.trim();
    const cluster_area = formField.cluster_area.trim();
    const address = formField.address.trim();
    const principal_name = formField.principal_name.trim();
    const principal_phone = sanitizePhoneInput(formField.principal_phone);
    const focal_person_name = formField.focal_person_name.trim();
    const focal_person_phone = sanitizePhoneInput(formField.focal_person_phone);

    const fail = (message) => {
      setError(message);
      toast.error(message);
    };

    if (profileMode && !schoolId) {
      return fail("Unable to load school profile details.");
    }
    if (!school_name) return fail("School name is required.");
    if (!email || !EMAIL_REGEX.test(email))
      return fail("Active email is required.");
    if (!isIdentityLocked) {
      const isSameAsInitialEmail =
        isEditMode &&
        initialEmail &&
        email.toLowerCase() === initialEmail.toLowerCase();
      if (!isSameAsInitialEmail) {
        if (emailAvailability.status === "checking") {
          return fail("Checking email availability. Please wait.");
        }
        if (emailAvailability.status === "unavailable") {
          return fail("Email is already taken.");
        }
        if (emailAvailability.status === "error") {
          return fail("Unable to verify email availability.");
        }
        if (emailAvailability.status !== "available") {
          return fail("Please wait for email availability check.");
        }
      }
    }
    if (!username) return fail("Username is required.");
    if (!isIdentityLocked) {
      const isSameAsInitialUsername =
        isEditMode &&
        initialUsername &&
        username.toLowerCase() === initialUsername.toLowerCase();
      if (!isSameAsInitialUsername) {
        if (usernameAvailability.status === "checking") {
          return fail("Checking username availability. Please wait.");
        }
        if (usernameAvailability.status === "unavailable") {
          return fail("Username is already taken.");
        }
        if (usernameAvailability.status === "error") {
          return fail("Unable to verify username availability.");
        }
        if (usernameAvailability.status !== "available") {
          return fail("Please wait for username availability check.");
        }
      }
    }
    if (!province) return fail("Province is required.");
    if (!district) return fail("District is required.");
    if (!tehsil) return fail("Tehsil is required.");
    if (!city) return fail("City is required.");
    if (!address) return fail("Address is required.");
    if (!principal_name) return fail("Principal's name is required.");
    if (!PHONE_REGEX.test(principal_phone)) {
      return fail("Invalid Principal's WhatsApp. Use +92XXXXXXXXXX format.");
    }
    if (!focal_person_name) return fail("Focal Person's name is required.");
    if (!PHONE_REGEX.test(focal_person_phone)) {
      return fail("Invalid Focal Person's WhatsApp. Use +92XXXXXXXXXX format.");
    }
    if (!isEditMode && !password) return fail("Password is required.");
    if (!isEditMode && !confirm_password)
      return fail("Confirm password is required.");
    if ((password && !confirm_password) || (!password && confirm_password)) {
      return fail("Password and confirm password are both required.");
    }
    if (password && confirm_password && password !== confirm_password) {
      return fail("Password and confirm password must match.");
    }

    const consent = Boolean(formField.agree || formField.rmc_member);
    const payload = new FormData();
    payload.append("school_name", school_name);
    payload.append("email", email);
    payload.append("username", username);
    payload.append("province", province);
    payload.append("district", district);
    payload.append("tehsil", tehsil);
    payload.append("city", city);
    payload.append("cluster_area", cluster_area);
    payload.append("address", address);
    payload.append("principal_name", principal_name);
    payload.append("principal_phone", principal_phone);
    payload.append("focal_person_name", focal_person_name);
    payload.append("focal_person_phone", focal_person_phone);
    payload.append("rmc_member", consent ? "1" : "0");
    payload.append("agree", consent ? "1" : "0");
    if (!isSchoolRole) {
      payload.append("is_rmc_venue", formField.is_rmc_venue ? "1" : "0");
    }
    if (password) {
      payload.append("password", password);
      payload.append("password_confirmation", confirm_password);
      payload.append("confirm_password", confirm_password);
    }
    if (formField.profile_image instanceof File) {
      payload.append("profile_image", formField.profile_image);
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await updateSchoolById(schoolId, payload);
        toast.success(
          profileMode
            ? "Profile updated successfully."
            : "School updated successfully.",
        );
      } else {
        await addSchool(payload);
        toast.success("School added successfully.");
      }
      if (profileMode) {
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      } else {
        navigate("/admin/school-lists");
      }
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${isEditMode ? "update" : "add"} school. Please try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const passwordMismatch =
    Boolean(formField.password.trim()) &&
    Boolean(formField.confirm_password.trim()) &&
    formField.password.trim() !== formField.confirm_password.trim();

  return (
    <>
      <div className="dashboard-header">
        <div className="dh-left">
          <h4>{dashboardTitle}</h4>
          <h1>{resolvedPageTitle}</h1>
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
                <div className="form-group w-full">
                  <h2 className="form-heading">
                    <span>
                      <School />
                    </span>{" "}
                    Basic Information
                  </h2>
                </div>
                <div className="form-group w-half">
                  <label>
                    <School size={16} /> School Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter full school name"
                    name="school_name"
                    value={formField.school_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <FileImage size={16} />
                    School Logo
                  </label>
                  <input
                    type="file"
                    className="form-input"
                    name="profile_image"
                    accept="image/*"
                    onChange={handleDisplayPictureChange}
                    required={!formField.profile_image}
                    disabled={loading}
                  />
                  {displayPicturePreview && (
                    <div className="show-img mb-4">
                      <img
                        src={
                          formField.profile_image instanceof File
                            ? displayPicturePreview
                            : `${
                                import.meta.env.VITE_BACKEND_FILE_BASE_PATH ??
                                ""
                              }${displayPicturePreview}`
                        }
                        alt="School display preview"
                        className="h-18 w-18 rounded-md object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="form-group w-half">
                  <label>
                    <IdCardLanyard size={16} /> Username <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="username"
                    placeholder="Choose a unique username"
                    value={formField.username}
                    onChange={handleChange}
                    disabled={loading || isIdentityLocked}
                  />
                  {usernameAvailability.message ? (
                    <p
                      className={`mt-1 text-xs ${
                        usernameAvailability.status === "available"
                          ? "text-green-600"
                          : usernameAvailability.status === "checking"
                            ? "text-gray-500"
                            : "text-red-500"
                      }`}
                    >
                      {usernameAvailability.message}
                    </p>
                  ) : null}
                </div>

                <div className="form-group w-half">
                  <label>
                    <Mail size={16} /> School Email <span>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    name="email"
                    placeholder="example@school.com"
                    value={formField.email}
                    onChange={handleChange}
                    disabled={loading || isIdentityLocked}
                  />
                  {emailAvailability.message ? (
                    <p
                      className={`mt-1 text-xs ${
                        emailAvailability.status === "available"
                          ? "text-green-600"
                          : emailAvailability.status === "checking"
                            ? "text-gray-500"
                            : "text-red-500"
                      }`}
                    >
                      {emailAvailability.message}
                    </p>
                  ) : null}
                </div>

                <div className="form-group w-half">
                  <label>
                    <Lock size={16} /> Password{" "}
                    {!isEditMode ? <span>*</span> : null}
                  </label>
                  <input
                    type={passwordType}
                    className="form-input"
                    name="password"
                    placeholder={
                      isEditMode
                        ? "Leave blank to keep existing password"
                        : "Create a strong password"
                    }
                    value={formField.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="text-slate-400 cursor-pointer password-eye"
                    onClick={handleShowPasswordToggle}
                  >
                    {passwordType === "password" ? (
                      <EyeClosed size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Lock size={16} /> Confirm Password{" "}
                    {!isEditMode ? <span>*</span> : null}
                  </label>
                  <input
                    type={passwordType}
                    className="form-input"
                    name="confirm_password"
                    placeholder={
                      isEditMode
                        ? "Enter only when changing password"
                        : "Confirm password"
                    }
                    value={formField.confirm_password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="text-slate-400 cursor-pointer password-eye"
                    onClick={handleShowPasswordToggle}
                  >
                    {passwordType === "password" ? (
                      <EyeClosed size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                  {passwordMismatch ? (
                    <p className="mt-1 text-xs text-red-500">
                      Passwords do not match.
                    </p>
                  ) : null}
                </div>

                {!isSchoolRole ? (
                  <div className="form-group w-full">
                    <label className="!inline-flex !items-center !gap-2 !mt-2 cursor-pointer !font-[600]">
                      <input
                        id="is_rmc_venue"
                        type="checkbox"
                        name="is_rmc_venue"
                        checked={Boolean(formField.is_rmc_venue)}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      <span className="!text-[15px] !text-gray-900 leading-5">
                        Register as an RMC (Regional Math Contest) Venue{" "}
                      </span>
                    </label>
                  </div>
                ) : null}

                <div className="form-group w-full">
                  <h2 className="form-heading">
                    <span>
                      <Map />
                    </span>{" "}
                    Location
                  </h2>
                </div>

                <div className="form-group w-half">
                  <label>
                    <Map size={16} /> Province <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={provinceOptions}
                    value={provinceId}
                    multiple={false}
                    onChange={onProvinceChange}
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
                    <MapPin size={16} /> District <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={districtOptions}
                    value={districtId}
                    multiple={false}
                    onChange={onDistrictChange}
                    placeholder="Search district..."
                    disabled={loading || !provinceId || districtLoading}
                    loading={districtLoading}
                    emptyState={
                      provinceId ? "No district found" : "Select province first"
                    }
                    valueKey="id"
                    labelKey="name"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <MapPin size={16} /> Tehsil <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={tehsilOptions}
                    value={tehsilId}
                    multiple={false}
                    onChange={onTehsilChange}
                    placeholder="Search tehsil..."
                    disabled={loading || !districtId || tehsilLoading}
                    loading={tehsilLoading}
                    emptyState={
                      districtId ? "No tehsil found" : "Select district first"
                    }
                    valueKey="id"
                    labelKey="name"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <MapPin size={16} /> City <span>*</span>
                  </label>
                  <SearchableMultiSelect
                    options={cityOptions}
                    value={cityId}
                    multiple={false}
                    onChange={onCityChange}
                    placeholder="Search city..."
                    disabled={loading || !tehsilId || cityLoading}
                    loading={cityLoading}
                    emptyState={
                      tehsilId ? "No city found" : "Select tehsil first"
                    }
                    valueKey="id"
                    labelKey="name"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <MapPin size={16} /> Cluster / Area
                  </label>
                  <SearchableMultiSelect
                    options={clusterOptions}
                    value={clusterId}
                    multiple={false}
                    onChange={onClusterChange}
                    placeholder="Search cluster area..."
                    disabled={loading || !cityId || clusterLoading}
                    loading={clusterLoading}
                    emptyState={
                      cityId ? "No cluster area found" : "Select city first"
                    }
                    valueKey="id"
                    labelKey="name"
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <MapPinCheck size={16} /> School Address <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="address"
                    placeholder="Enter complete address"
                    value={formField.address}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-full">
                  <h2 className="form-heading">
                    <span>
                      <Phone />
                    </span>{" "}
                    Contacts
                  </h2>
                </div>

                <div className="form-group w-half">
                  <label>
                    <User size={16} /> Principal Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="principal_name"
                    placeholder="Enter principal name"
                    value={formField.principal_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Principal Phone <span>*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input no-spinner"
                    name="principal_phone"
                    value={formField.principal_phone}
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="+92-XXX-XXXXXXX"
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <User size={16} /> Focal Person Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="focal_person_name"
                    placeholder="Enter focal person name"
                    value={formField.focal_person_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Phone size={16} /> Focal Person Phone <span>*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input no-spinner"
                    name="focal_person_phone"
                    value={formField.focal_person_phone}
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="+92-XXX-XXXXXXX"
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
                      Please wait
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </>
                  ) : profileMode ? (
                    <>
                      Update Profile
                      <Save size={18} />
                    </>
                  ) : isEditMode ? (
                    <>
                      Update School
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add School
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

export default SchoolForm;
