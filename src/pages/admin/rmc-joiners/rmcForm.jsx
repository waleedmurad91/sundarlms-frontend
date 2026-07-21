import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircleIcon,
  Calendar1,
  FileText,
  IdCardLanyard,
  LaptopMinimalCheck,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  TextInitial,
  X,
} from "lucide-react";
import {
  addCertificate,
  getCertificateById,
  updateCertificateById,
} from "@/api/certificateApi";

const DEFAULT_FORM = {
  student_name: "",
  batch: "",
  completion_date: "",
  issue_date: "",
  signature_name: "Muhammad Ishaq",
  laptop_returned: "",
};

const safeTrimString = (value) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
};

// Main Component
const RMCForm = () => {
  const navigate = useNavigate();
  const { id: paramsId } = useParams();
  const { state } = useLocation();

  const fallbackStateCertificate = state?.certificate;
  const certificateId =
    paramsId || state?.certificateId || fallbackStateCertificate?.id;
  const isEditMode = Boolean(certificateId);

  const [formField, setFormField] = React.useState(() => ({
    ...DEFAULT_FORM,
    ...(fallbackStateCertificate || {}),
  }));
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState("");

  // Fetch staff data when editing
  React.useEffect(() => {
    if (!isEditMode || !certificateId) return;

    const fetchStaff = async () => {
      try {
        setFetching(true);
        const result = await getCertificateById(certificateId);
        const data = result?.data ?? result ?? {};
        setFormField((prev) => ({
          ...prev,
          student_name: data.student_name ?? "",
          batch: data.batch ?? "",
          completion_date: data.completion_date ?? "",
          issue_date: data.issue_date ?? "",
          laptop_returned:
            data.laptop_returned === true || data.laptop_returned === false
              ? String(data.laptop_returned)
              : "",
        }));
      } catch (err) {
        const message =
          err?.message ||
          "Unable to load certificate details. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        setFetching(false);
      }
    };

    fetchStaff();
  }, [isEditMode, certificateId]);

  // Handle input change
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormField((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const trimmedStudentName = safeTrimString(formField.student_name);
    const trimmedBatch = safeTrimString(formField.batch);
    const trimmedCompletionDate = safeTrimString(formField.completion_date);
    const trimmedIssueDate = safeTrimString(formField.issue_date);
    const laptopReturnedRaw = safeTrimString(formField.laptop_returned);
    const laptopReturnedValue = laptopReturnedRaw === "true";

    if (
      !trimmedStudentName ||
      !trimmedBatch ||
      !trimmedCompletionDate ||
      !trimmedIssueDate ||
      laptopReturnedRaw === ""
    ) {
      const message = "Please fill in all required fields.";
      toast.error(message);
      setError(message);
      return;
    }

    const payload = {
      student_name: trimmedStudentName,
      batch: trimmedBatch,
      completion_date: trimmedCompletionDate,
      issue_date: trimmedIssueDate,
      signature_name: DEFAULT_FORM.signature_name,
      laptop_returned: laptopReturnedValue,
    };

    try {
      setLoading(true);
      if (isEditMode) {
        await updateCertificateById(certificateId, payload);
        toast.success("Certificate updated successfully.");
      } else {
        await addCertificate(payload);
        toast.success("Certificate added successfully.");
      }
      navigate("/admin/certificate-lists");
    } catch (err) {
      const message =
        err?.message ||
        `Failed to ${
          isEditMode ? "update" : "add"
        } certificate. Please try again.`;
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
          <h1>{isEditMode ? "Update Certificate" : "Add New Certificate"}</h1>
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
                {isEditMode ? (
                  <>
                    <div className="form-group w-half">
                      <label>
                        <IdCardLanyard size={16} /> SSID <span>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        name="ssid"
                        value={formField.ssid}
                        onChange={handleChange}
                        disabled={loading}
                        readOnly
                      />
                    </div>

                    <div className="form-group w-half">
                      <label>
                        <ShieldCheck size={16} /> verification Code{" "}
                        <span>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        name="verification_code"
                        value={formField.verification_code}
                        onChange={handleChange}
                        disabled={loading}
                        readOnly
                      />
                    </div>
                  </>
                ) : (
                  <></>
                )}
                <div className="form-group w-half">
                  <label>
                    <TextInitial size={16} /> Student Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="student_name"
                    value={formField.student_name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <FileText size={16} />
                    Batch <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    name="batch"
                    value={formField.batch}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Calendar1 size={16} />
                    Completion Date <span>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    name="completion_date"
                    value={formField.completion_date}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <Calendar1 size={16} />
                    Issue Date <span>*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    name="issue_date"
                    value={formField.issue_date}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group w-half">
                  <label>
                    <LaptopMinimalCheck size={16} /> Return Laptop?{" "}
                    <span>*</span>
                  </label>
                  <select
                    name="laptop_returned"
                    className="form-input"
                    value={formField.laptop_returned}
                    onChange={handleChange}
                  >
                    <option value="">Select Status</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
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
                      Update Certificate
                      <Save size={18} />
                    </>
                  ) : (
                    <>
                      Add Certificate
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

export default RMCForm;
