import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { School, MapPin, User, Phone, CheckCircle, Mail } from "lucide-react";
import { addSchoolRegistrationForm } from "@/api/registrationsApi";
import DistrictCitySelector from "@/components/DistrictCitySelector";

const RmcRegistration = () => {
  const CHECK_REGISTRATION_STATUS = `${
    import.meta.env.VITE_API_URL ??
    "http://154.57.211.187:81/example-app/public"
  }/api/registration-settings/school`;
  const [formData, setFormData] = useState({
    school_name: "",
    email: "",
    district: "",
    city: "",
    address: "",
    principal_name: "",
    principal_phone: "",
    focal_person_name: "",
    focal_person_phone: "",
    agree: false,
  });

  const [files, setFiles] = useState({
    photo: null,
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      setCheckingStatus(true);
      try {
        const res = await axios.get(CHECK_REGISTRATION_STATUS);
        const enabled =
          res?.data?.enabled ??
          res?.enabled ??
          res?.data?.data?.enabled ??
          res?.data?.data?.[0]?.enabled;
        const isOpen = enabled === true || enabled === 1 || enabled === "1";
        if (mounted) {
          setRegistrationOpen(isOpen);
          if (!isOpen) {
            setStatus({
              type: "err",
              msg: "School registrations are currently closed.",
            });
          }
        }
      } catch (err) {
        if (!mounted) return;
        const message =
          err?.message ||
          "Unable to check registration status. Please try again later.";
        setStatus({ type: "err", msg: message });
        toast.error(message);
      } finally {
        if (mounted) setCheckingStatus(false);
      }
    };
    checkStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const sanitizePhoneInput = (inputValue = "") => {
    const hasPlus = inputValue.startsWith("+");
    const digits = inputValue.replace(/\D/g, "");
    const limited = digits.slice(0, 12); // +92 plus 10 digits = 12 digits

    if (hasPlus) return `+${limited}`;
    if (limited.startsWith("92")) return `+${limited}`;
    if (limited.startsWith("0")) return `+92${limited.slice(1, 11)}`;
    return limited ? `+${limited}` : "";
  };

  const focusField = (field) => {
    if (!field) return;
    requestAnimationFrame(() => {
      if (field === "photo") {
        const photoLabel = document.getElementById("photo_trigger");
        if (photoLabel?.focus) {
          photoLabel.focus();
          return;
        }
      }
      const el =
        document.getElementById(field) ||
        document.querySelector(`[name="${field}"]`);
      if (el?.focus) {
        el.focus();
        if (el.select) el.select();
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (!registrationOpen || checkingStatus) {
      if (status.type !== "err") {
        setStatus({
          type: "err",
          msg: "School registrations are currently closed.",
        });
        toast.error("School registrations are currently closed.");
      }
      return;
    }

    if (name === "principal_phone" || name === "focal_person_phone") {
      const sanitized = sanitizePhoneInput(value);
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear status on input
    if (status.type === "err") setStatus({ type: "", msg: "" });
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (!registrationOpen || checkingStatus) {
      if (status.type !== "err") {
        setStatus({
          type: "err",
          msg: "School registrations are currently closed.",
        });
        toast.error("School registrations are currently closed.");
      }
      return;
    }
    const file = selectedFiles[0];
    if (!file) return;

    // Validation: JPG/PNG, size limit 10MB
    const maxSize = 10 * 1024 * 1024;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Photo must be JPG or PNG.");
      e.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      alert(`Photo too large. Max size is 10 MB.`);
      e.target.value = "";
      return;
    }

    setFiles((prev) => ({ ...prev, [name]: file }));

    if (name === "photo") {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const validateForm = () => {
    // Regex patterns
    const phoneRegex = /^\+92\d{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const trimmedSchoolName = formData.school_name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedDistrict = formData.district.trim();
    const trimmedCity = formData.city.trim();
    const trimmedAddress = formData.address.trim();
    const trimmedPrincipalPhone = formData.principal_phone.trim();
    const trimmedPrincipalName = formData.principal_name.trim();
    const trimmedFocalPersonPhone = formData.focal_person_phone.trim();
    const trimmedFocalPersonName = formData.focal_person_name.trim();

    if (!trimmedSchoolName)
      return { field: "school_name", message: "School name is required." };

    if (!trimmedEmail || !emailRegex.test(trimmedEmail))
      return { field: "email", message: "Active email is required." };
    if (!phoneRegex.test(trimmedPrincipalPhone))
      return {
        field: "principal_phone",
        message: "Invalid Principal's WhatsApp. Use +92XXXXXXXXXX format.",
      };
    if (!trimmedPrincipalName)
      return {
        field: "principal_name",
        message: "Principal's name is required.",
      };
    if (!trimmedFocalPersonName)
      return {
        field: "focal_person_name",
        message: "Focal Person's name is required.",
      };
    if (!phoneRegex.test(trimmedFocalPersonPhone))
      return {
        field: "focal_person_phone",
        message: "Invalid Focal Person's WhatsApp. Use +92XXXXXXXXXX format.",
      };

    if (!trimmedDistrict)
      return { field: "district", message: "District is required." };
    if (!trimmedCity) return { field: "city", message: "City is required." };
    if (!trimmedAddress)
      return { field: "address", message: "Address is required." };

    if (!formData.agree)
      return {
        field: "agree",
        message: "You must agree to the declaration.",
      };

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!registrationOpen) {
      const message = "Registrations are currently closed.";
      setStatus({ type: "err", msg: message });
      toast.error(message);
      return;
    }

    const error = validateForm();
    if (error) {
      const message = typeof error === "string" ? error : error?.message;
      const field = typeof error === "string" ? "" : error?.field;
      setStatus({ type: "err", msg: message });
      toast.error(message);
      focusField(field);
      // Scroll to top or show error visible
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", msg: "" });

    try {
      const payload = new FormData();
      const normalizedFields = {
        school_name: formData.school_name.trim(),
        email: formData.email.trim(),
        principal_name: formData.principal_name.trim(),
        principal_phone: formData.principal_phone.trim(),
        focal_person_name: formData.focal_person_name.trim(),
        focal_person_phone: formData.focal_person_phone.trim(),
        district: formData.district.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        agree: formData.agree ? "on" : "",
      };

      Object.entries(normalizedFields).forEach(([key, value]) => {
        payload.append(key, value);
      });

      if (files.photo) {
        payload.append("profile_image", files.photo);
      }

      await addSchoolRegistrationForm(payload);
      setStatus({
        type: "ok",
        msg: "Your registration has been submitted successfully.",
      });
      toast.success("Registration submitted successfully.");

      // Reset form
      setFormData({
        school_name: "",
        email: "",
        district: "",
        city: "",
        address: "",
        principal_name: "",
        principal_phone: "",
        focal_person_name: "",
        focal_person_phone: "",
        agree: false,
      });
      setFiles({ photo: null });
      setPhotoPreview(null);
      window.scrollTo(0, 0);
    } catch (err) {
      const message =
        err?.message || "Submission failed. Please try again later.";
      setStatus({ type: "err", msg: message });
      toast.error(message);
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registration-page">
      {/* Hero Section */}
      <div className="bg-rmc-50 border-b border-rmc-100 py-12 mb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white rounded-full shadow-md">
                <School className="text-rmc-600" size={32} />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-serif text-rmc-800">
              RMC School Membership
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Join the Regional Math Clubs network to empower your Grade 5
              students with regular mathematics practice and contests.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-white border border-rmc-100 shadow-sm px-6 py-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="text-green-600" size={18} />
                <span className="font-semibold text-gray-800">
                  Free Membership
                </span>
              </div>
              <div className="bg-white border border-rmc-100 shadow-sm px-6 py-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="text-green-600" size={18} />
                <span className="font-semibold text-gray-800">
                  Monthly Contests
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 mb-20">
        <div className="max-w-4xl mx-auto">
          {!registrationOpen ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    School registrations are currently closed.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form
              className="reg-form shadow-xl"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Registration Form
                </h2>
                <p className="text-gray-600">
                  Please fill all fields marked with{" "}
                  <span className="text-red-500">*</span> correctly.
                </p>
              </div>

              {status.type === "err" && status.msg ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{status.msg}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {status.type === "ok" && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-green-700">{status.msg}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* School Details */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <School size={20} className="text-rmc-600" /> School Details
                </h3>
                <div className="grid gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      School Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="school_name"
                      type="text"
                      required
                      value={formData.school_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#000080] focus:border-[#000080] outline-none transition-all text-sm"
                      placeholder="e.g. Iqra Public School"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <DistrictCitySelector
                      district={formData.district}
                      city={formData.city}
                      onDistrictChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          district: value,
                          city: "",
                        }))
                      }
                      onCityChange={(value) =>
                        setFormData((prev) => ({ ...prev, city: value }))
                      }
                      disabled={isSubmitting || !registrationOpen}
                      labelClass="reg-label"
                      asterikColor="text-red-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#000080] focus:border-[#000080] outline-none transition-all text-sm"
                      placeholder="School's active email address"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#000080] focus:border-[#000080] outline-none transition-all text-sm"
                      placeholder="Street Address, Area"
                    />
                  </div>
                </div>
              </div>

              {/* Principal Details */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 mt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User size={20} className="text-rmc-600" /> Principal Details
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Principal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="principal_name"
                      type="text"
                      required
                      value={formData.principal_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#000080] focus:border-[#000080] outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Principal Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="principal_phone"
                      type="tel"
                      required
                      value={formData.principal_phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#000080] focus:border-[#000080] outline-none transition-all text-sm"
                      placeholder="+92..."
                      inputMode="tel"
                      maxLength="13"
                      pattern="\\+92\\d{10}"
                    />
                  </div>
                </div>
              </div>

              {/* Focal Person Details */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 mt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Phone size={20} className="text-rmc-600" /> Focal Person
                  Details
                </h3>
                <p className="text-sm text-gray-500 mb-4 -mt-2">
                  This person will coordinate with RMC team for contest
                  materials and results.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Focal Person Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="focal_person_name"
                      type="text"
                      required
                      value={formData.focal_person_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#000080] focus:border-[#000080] outline-none transition-all  text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Focal Person Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="focal_person_phone"
                      type="tel"
                      required
                      value={formData.focal_person_phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#000080] focus:border-[#000080] outline-none transition-all text-sm"
                      placeholder="+92..."
                      inputMode="tel"
                      maxLength="13"
                      pattern="\\+92\\d{10}"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                {/* Photo Upload */}
                <div className="md:col-span-2">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      School Photo Upload
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Upload a clear photo from your device. JPG/PNG only, max
                      10MB.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-4">
                      {photoPreview ? (
                        <div className="relative">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-full border-4 border-white shadow-lg"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFiles({ ...files, photo: null });
                              setPhotoPreview(null);
                            }}
                            className="absolute bottom-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                            title="Remove photo"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <label
                          id="photo_trigger"
                          className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-semibold hover:bg-gray-50 transition-colors"
                          role="button"
                          tabIndex={0}
                        >
                          <span>Choose File</span>
                          <input
                            id="photo"
                            name="photo"
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleFileChange}
                            required
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Consent */}
                <div className="md:col-span-2">
                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      id="agree"
                      name="agree"
                      type="checkbox"
                      checked={formData.agree}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-5 h-5 text-rmc-600 focus:ring-rmc-500 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      I confirm that the provided information is correct and I
                      am authorized to register this school for RMC membership.
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={isSubmitting || checkingStatus || !registrationOpen}
                  className={`w-full py-4 cursor-pointer bg-[#000070] text-white text-lg font-bold rounded-lg shadow-lg hover:bg-[#000060] transition-all transform hover:-translate-y-1
                                    ${
                                      isSubmitting ||
                                      checkingStatus ||
                                      !registrationOpen
                                        ? "opacity-70 !cursor-not-allowed"
                                        : ""
                                    }
                                `}
                >
                  {checkingStatus
                    ? "Checking status..."
                    : isSubmitting
                      ? "Submitting..."
                      : "Register School for RMC"}
                </button>
              </div>
            </form>
          )}

          <div className="text-center mt-12 text-gray-500 text-sm">
            <p>Need help? Contact RMC Coordinator</p>
            <p className="mt-1 flex justify-center items-center gap-4">
              <span className="flex items-center gap-1">
                <Mail size={14} /> info@rmc.sundarstem.edu.pk
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RmcRegistration;
