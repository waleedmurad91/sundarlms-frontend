import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { School, MapPin, User, Phone, CheckCircle, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { addSchoolRegistrationForm } from "@/api/registrationsApi";

const CHECK_REGISTRATION_STATUS = `${
  import.meta.env.VITE_API_URL ?? "http://154.57.211.187:81/example-app/public"
}/api/registration-settings/school`;

const SchoolRegistration = () => {
  const [formData, setFormData] = useState({
    school_name: "",
    city: "",
    address: "",
    principal_name: "",
    principal_phone: "",
    focal_person_name: "",
    focal_person_phone: "",
    agree: false,
  });

  const [status, setStatus] = useState({ type: "", msg: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

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
    if (name === "principal_phone" || name === "focal_person_phone") {
      const sanitized = sanitizePhoneInput(value);
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }

    if (status.type === "err") setStatus({ type: "", msg: "" });
  };

  const validateForm = () => {
    const phoneRegex = /^\+92\d{10}$/;

    const trimmedSchool = formData.school_name.trim();
    const trimmedCity = formData.city.trim();
    const trimmedAddress = formData.address.trim();
    const trimmedPrincipal = formData.principal_name.trim();
    const trimmedPrincipalPhone = formData.principal_phone.trim();
    const trimmedFocal = formData.focal_person_name.trim();
    const trimmedFocalPhone = formData.focal_person_phone.trim();

    if (!trimmedSchool)
      return { field: "school_name", message: "School name is required." };
    if (!trimmedCity) return { field: "city", message: "City is required." };
    if (!trimmedAddress)
      return { field: "address", message: "Address is required." };
    if (!trimmedPrincipal)
      return {
        field: "principal_name",
        message: "Principal name is required.",
      };
    if (!phoneRegex.test(trimmedPrincipalPhone))
      return {
        field: "principal_phone",
        message: "Principal phone must be in +92XXXXXXXXXX format.",
      };
    if (!trimmedFocal)
      return {
        field: "focal_person_name",
        message: "Focal person name is required.",
      };
    if (!phoneRegex.test(trimmedFocalPhone))
      return {
        field: "focal_person_phone",
        message: "Focal person phone must be in +92XXXXXXXXXX format.",
      };
    if (!formData.agree)
      return {
        field: "agree",
        message: "You must confirm the declaration.",
      };

    return null;
  };

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
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", msg: "" });

    try {
      const payload = new FormData();
      payload.append("school_name", formData.school_name.trim());
      payload.append("city", formData.city.trim());
      payload.append("address", formData.address.trim());
      payload.append("principal_name", formData.principal_name.trim());
      payload.append("principal_phone", formData.principal_phone.trim());
      payload.append("focal_person_name", formData.focal_person_name.trim());
      payload.append("focal_person_phone", formData.focal_person_phone.trim());
      payload.append("agree", formData.agree ? "on" : "");

      await addSchoolRegistrationForm(payload);
      setStatus({
        type: "ok",
        msg: "Your school membership request has been submitted successfully.",
      });
      toast.success("School registration submitted.");

      setFormData({
        school_name: "",
        city: "",
        address: "",
        principal_name: "",
        principal_phone: "",
        focal_person_name: "",
        focal_person_phone: "",
        agree: false,
      });
      window.scrollTo(0, 0);
    } catch (err) {
      const message =
        err?.message || "Submission failed. Please try again later.";
      setStatus({ type: "err", msg: message });
      toast.error(message);
      focusField("school_name");
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className=" bg-gray-50">
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

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Form */}
          <form
            className="bg-white shadow-xl rounded-xl p-8 border border-gray-100"
            onSubmit={handleSubmit}
          >
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Membership Registration Form
              </h2>
              <p className="text-gray-600">
                Please provide your school's official details.
              </p>
            </div>

            {status.type === "ok" && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-green-700 font-medium">
                      {status.msg}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {status.type === "err" && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">
                      {status.msg}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* School Details */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <School size={20} className="text-rmc-600" /> School Details
                </h3>
                <div className="grid gap-4">
                  <div>
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="city"
                        type="text"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#000080] focus:border-[#000080] outline-none transition-all text-sm"
                        placeholder="e.g. Lahore"
                      />
                    </div>
                    <div>
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
              </div>

              {/* Principal Details */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
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
                    />
                  </div>
                </div>
              </div>

              {/* Focal Person Details */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
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
                    />
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div>
                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ">
                  <input
                    name="agree"
                    type="checkbox"
                    checked={formData.agree}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-5 h-5 text-rmc-600 focus:ring-rmc-500 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    I confirm that the provided information is correct and I am
                    authorized to register this school for RMC membership.
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

export default SchoolRegistration;
