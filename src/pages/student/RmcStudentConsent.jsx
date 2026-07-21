import React from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileImage,
  IdCard,
  Loader2,
  Map,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import DistrictCitySelector from "@/components/DistrictCitySelector";
import { updateRmcInfo } from "@/api/studentApi";
import { useAuthStore } from "@/store/auth";

const NAME_REGEX = /^[A-Za-z\s]+$/;
const DOB_MIN_AGE = 7;
const DOB_MAX_AGE = 13;

const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDobBoundaryDate = (years, month, day) => {
  const currentYear = new Date().getFullYear();
  return new Date(currentYear - years, month, day);
};

const DOB_MIN_DATE = formatDateInputValue(getDobBoundaryDate(DOB_MAX_AGE, 0, 1));
const DOB_MAX_DATE = formatDateInputValue(
  getDobBoundaryDate(DOB_MIN_AGE, 11, 31),
);

const FIELD_LABELS = {
  name: "Full Name",
  dob: "Date of Birth",
  father_name: "Father's Name",
  father_phone: "Father's Phone",
  father_cnic: "Father's CNIC",
  district: "Province",
  city: "City",
  formb_id: "Form B ID",
  photo: "Photo",
};

const normaliseDateValue = (value) => {
  if (!value) return "";
  const valueString = String(value);
  if (valueString.includes("T")) {
    return valueString.split("T")[0];
  }
  return valueString.slice(0, 10);
};

const getLocationValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return String(value.id ?? value.value ?? value.name ?? "");
  }
  return String(value);
};

const buildInitialFormData = (student) => ({
  name: student?.name ?? "",
  dob: normaliseDateValue(student?.dob),
  father_name: student?.father_name ?? "",
  father_phone: student?.father_phone ?? "",
  father_cnic: student?.father_cnic ?? "",
  district: getLocationValue(student?.district_id ?? student?.district),
  city: getLocationValue(student?.city_id ?? student?.city),
  formb_id: student?.formb_id ?? "",
  photo: null,
});

const getFieldLabel = (field) =>
  FIELD_LABELS[field] ??
  field
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const validateField = (field, value) => {
  switch (field) {
    case "name":
    case "father_name":
      if (!value || !NAME_REGEX.test(String(value).trim())) {
        return "Please enter a valid name (letters and spaces only).";
      }
      return "";
    case "dob": {
      if (!value) return "Date of birth is required.";
      const dob = String(value).trim();
      if (!dob || dob < DOB_MIN_DATE || dob > DOB_MAX_DATE) {
        return `Date of birth must be between ${DOB_MIN_DATE} and ${DOB_MAX_DATE}.`;
      }
      return "";
    }
    case "father_phone": {
      const digits = String(value ?? "").replace(/\D/g, "");
      if (digits.length !== 12) {
        return "Father's phone must be 12 digits.";
      }
      return "";
    }
    case "father_cnic": {
      const digits = String(value ?? "").replace(/\D/g, "");
      if (digits.length !== 13) {
        return "Father's CNIC must be 13 digits.";
      }
      return "";
    }
    case "formb_id": {
      const digits = String(value ?? "").replace(/\D/g, "");
      if (digits.length !== 13) {
        return "Form B ID must be 13 digits.";
      }
      return "";
    }
    case "district":
    case "city":
      if (!value || String(value).trim().length < 1) {
        return `${getFieldLabel(field)} is required.`;
      }
      return "";
    case "photo":
      if (!value) return "Photo is required.";
      return "";
    default:
      if (!value || String(value).trim() === "") {
        return `${getFieldLabel(field)} is required.`;
      }
      return "";
  }
};

const RmcStudentConsent = () => {
  const { role, student, checkAuth } = useAuthStore();

  const [missingFields, setMissingFields] = React.useState([]);
  const [showMissingForm, setShowMissingForm] = React.useState(false);
  const [formData, setFormData] = React.useState(() => buildInitialFormData());
  const [errors, setErrors] = React.useState({});
  const [actionLoading, setActionLoading] = React.useState(false);
  const [formLoading, setFormLoading] = React.useState(false);

  const isStudent = role === "student";
  const isConsentEnabled = isStudent && Boolean(student?.rmc_join_enabled);
  const consentStatus = student?.rmc_join_opt_in;
  const isPending = isConsentEnabled && consentStatus === null;
  const isOptedIn = isConsentEnabled && consentStatus === true;
  const isOptedOut = isConsentEnabled && consentStatus === false;

  React.useEffect(() => {
    const nextMissingFields = Array.isArray(student?.missing_fields)
      ? student.missing_fields
      : [];
    setMissingFields(nextMissingFields);
    setFormData(buildInitialFormData(student));
    setErrors({});
    if (consentStatus !== null) {
      setShowMissingForm(false);
    }
  }, [student, consentStatus]);

  const fieldsToRender = React.useMemo(() => {
    const unique = Array.from(new Set(missingFields));
    if (unique.includes("city") && !unique.includes("district")) {
      unique.unshift("district");
    }
    return unique.filter(
      (field) => !(field === "city" && unique.includes("district")),
    );
  }, [missingFields]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleConsentYes = async () => {
    setActionLoading(true);
    try {
      const missing = Array.isArray(student?.missing_fields)
        ? student.missing_fields
        : [];
      setMissingFields(missing);

      if (missing.length === 0) {
        await updateRmcInfo({ join: true });
        await checkAuth();
        toast.success("RMC information updated successfully.");
        return;
      }

      setErrors({});
      setShowMissingForm(true);
    } catch (error) {
      toast.error(error?.message || "Failed to update RMC information.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConsentNo = async () => {
    setActionLoading(true);
    try {
      await updateRmcInfo({ join: false });
      await checkAuth();
      setShowMissingForm(false);
      setErrors({});
      toast.success("Preference updated.");
    } catch (error) {
      toast.error(error?.message || "Failed to update preference.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setFormLoading(true);

    const nextErrors = {};
    missingFields.forEach((field) => {
      const fieldError = validateField(field, formData[field]);
      if (fieldError) {
        nextErrors[field] = fieldError;
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstErrorField = Object.keys(nextErrors)[0];
      const firstInput = document.getElementById(firstErrorField);
      firstInput?.focus();
      toast.error("Please complete the highlighted fields.");
      setFormLoading(false);
      return;
    }

    try {
      const payload = new FormData();
      payload.append("join", true);

      Object.entries(formData).forEach(([key, value]) => {
        if (
          value === undefined ||
          value === null ||
          value === "" ||
          key === "join"
        ) {
          return;
        }
        payload.append(key, value);
      });

      await updateRmcInfo(payload);
      await checkAuth();
      setShowMissingForm(false);
      toast.success("RMC information updated successfully.");
    } catch (error) {
      toast.error(error?.message || "Failed to submit RMC information.");
    } finally {
      setFormLoading(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field] ?? "";
    const error = errors[field];

    const commonInputClasses = `form-input ${error ? "border-red-500" : ""}`;

    if (field === "district") {
      return (
        <div key="district-city" className="md:col-span-2">
          <DistrictCitySelector
            district={formData.district}
            city={formData.city}
            onDistrictChange={(nextDistrict) => {
              handleChange("district", nextDistrict);
              handleChange("city", "");
            }}
            onCityChange={(nextCity) => handleChange("city", nextCity)}
            disabled={formLoading}
            icon={<Map size={16} className="inline mr-1" />}
          />
          {(errors.district || errors.city) && (
            <p className="text-xs text-red-600 mt-2">
              {errors.district || errors.city}
            </p>
          )}
        </div>
      );
    }

    if (field === "photo") {
      return (
        <div key={field} className="space-y-1">
          <label htmlFor={field} className="font-medium text-sm text-slate-700">
            <FileImage size={15} className="inline mr-2 text-[#AD474B]" />
            {getFieldLabel(field)}*
          </label>
          <input
            id={field}
            type="file"
            accept="image/*"
            onChange={(event) =>
              handleChange(field, event.target.files?.[0] || null)
            }
            disabled={formLoading}
            className={commonInputClasses}
          />
          {formData.photo && (
            <p className="text-xs text-slate-500">
              Selected: {formData.photo.name}
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      );
    }

    const fieldIcon =
      field === "name" || field === "father_name" ? (
        <User size={15} className="inline mr-2 text-[#AD474B]" />
      ) : field === "dob" ? (
        <Calendar size={15} className="inline mr-2 text-[#AD474B]" />
      ) : field === "father_phone" ? (
        <Phone size={15} className="inline mr-2 text-[#AD474B]" />
      ) : field === "father_cnic" || field === "formb_id" ? (
        <IdCard size={15} className="inline mr-2 text-[#AD474B]" />
      ) : null;

    const inputType = field === "dob" ? "date" : "text";

    return (
      <div key={field} className="space-y-1">
        <label htmlFor={field} className="font-medium text-sm text-slate-700">
          {fieldIcon}
          {getFieldLabel(field)}*
        </label>
        <input
          id={field}
          type={inputType}
          value={value}
          min={field === "dob" ? DOB_MIN_DATE : undefined}
          max={field === "dob" ? DOB_MAX_DATE : undefined}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (field === "name" || field === "father_name") {
              handleChange(field, nextValue.replace(/[^A-Za-z\s]/g, ""));
              return;
            }
            if (field === "father_phone") {
              handleChange(field, nextValue.replace(/\D/g, "").slice(0, 12));
              return;
            }
            if (field === "father_cnic" || field === "formb_id") {
              handleChange(field, nextValue.replace(/\D/g, "").slice(0, 13));
              return;
            }
            handleChange(field, nextValue);
          }}
          disabled={formLoading}
          className={commonInputClasses}
          placeholder={`Enter ${getFieldLabel(field).toLowerCase()}`}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  };

  if (!isStudent) {
    return null;
  }

  return (
    <div className="space-y-6 pl-7">
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">RMC Consent</h1>
        <p className="mt-2 text-sm text-slate-600">
          Confirm whether you want to participate in the upcoming RMC contest.
        </p>

        {isConsentEnabled && isOptedIn && !showMissingForm && (
          <section className="py-6 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-700 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-green-900">
                  You are participating in RMC
                </h2>
                <p className="text-sm text-green-800">
                  Your consent is saved. You can still opt out if needed.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleConsentNo}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                "Opt out from RMC"
              )}
            </Button>
          </section>
        )}

        {isConsentEnabled && isOptedOut && !showMissingForm && (
          <section className="py-6 space-y-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-slate-600 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  You have opted out of RMC
                </h2>
                <p className="text-sm text-slate-600">
                  You can still join later by confirming your consent below.
                </p>
              </div>
            </div>
            <Button
              onClick={handleConsentYes}
              disabled={actionLoading}
              className="bg-[#AD474B] hover:bg-[#963b40] text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                "Yes, I want to participate"
              )}
            </Button>
          </section>
        )}
      </section>

      {!isConsentEnabled && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            RMC consent is currently not enabled for your account.
          </p>
        </section>
      )}

      {isConsentEnabled && isPending && !showMissingForm && (
        <section className="rounded-2xl border border-[#FAD4D3] bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Are you participating in the upcoming RMC?
          </h2>
          <p className="text-sm text-slate-600">
            Select your preference to continue. You can change it later from
            this page.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleConsentYes}
              disabled={actionLoading}
              className="bg-[#AD474B] hover:bg-[#963b40] text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                "Yes, I want to participate"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleConsentNo}
              disabled={actionLoading}
            >
              No
            </Button>
          </div>
          {missingFields.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">
                Missing profile fields:
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {missingFields.map(getFieldLabel).join(", ")}
              </p>
            </div>
          )}
        </section>
      )}

      {isConsentEnabled && showMissingForm && (
        <section className="rounded-2xl border border-[#FAD4D3] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-5">
            <AlertCircle className="h-5 w-5 text-[#AD474B] mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Complete Your RMC Registration
              </h2>
              <p className="text-sm text-slate-600">
                Fill in the missing fields below to confirm your participation.
              </p>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {fieldsToRender.map(renderField)}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMissingForm(false);
                  setErrors({});
                }}
                disabled={formLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="bg-[#AD474B] hover:bg-[#963b40] text-white"
              >
                {formLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit and Join RMC"
                )}
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};

export default RmcStudentConsent;
