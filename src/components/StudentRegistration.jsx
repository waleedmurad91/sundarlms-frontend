import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { addStudentRegistrationForm } from "@/api/registrationsApi";
import DistrictCitySelector from "./DistrictCitySelector";

const gradeOptions = [
  { label: "Grade 5 (PMC-5)", value: "Grade 5 (PMC-5)", typefor: "pmc-5" },
  { label: "Grade 6 (VSS)", value: "Grade 6 (VSS)", typefor: "vss" },
  { label: "Grade 7 (VSS)", value: "Grade 7 (VSS)", typefor: "vss" },
  { label: "Grade 5 (RMC)", value: "Grade 5 (RMC)", typefor: "rmc" },
];

const StudentRegistration = ({ classfor, type }) => {
  const CHECK_REGISTRATION_STATUS = `${
    import.meta.env.VITE_API_URL ??
    "http://154.57.211.187:81/example-app/public"
  }/api/registration-settings/student?module=${type}`;

  const filteredGradeOptions = gradeOptions.filter(
    (option) => option.typefor === type,
  );

  const [formData, setFormData] = useState({
    student_name: "",
    gender: "",
    dob: "",
    yob: "",
    grade: "",
    student_phone: "",
    email: "",
    father_name: "",
    father_cnic: "",
    father_phone: "",
    school: "",
    district: "",
    city: "",
    address: "",
    formb_id: "",
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

  // Date constraints
  const GLOBAL_MAX_DATE = "2019-01-01"; // No one born after this
  const VSS_MIN_DATE = "2012-01-01"; // Grade 6/7: born on/after this
  const PMC_MIN_DATE = "2014-01-01"; // Grade 5: born on/after this

  const [minDate, setMinDate] = useState(VSS_MIN_DATE); // Default to widest range initially, or dynamic

  useEffect(() => {
    // Adjust min date based on selected grade
    if (formData.grade.startsWith("Grade 5")) {
      setMinDate(PMC_MIN_DATE);
    } else {
      // Grade 6 or 7, or not selected (default to strictly VSS range or allow user to pick)
      // User requested: "for VSS 01-01-2012 ... no one can enter less then this"
      setMinDate(VSS_MIN_DATE);
    }
  }, [formData.grade]);

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
              msg: "Student registrations are currently closed.",
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
  }, [type]);

  const sanitizePhoneInput = (inputValue = "") => {
    const hasPlus = inputValue.startsWith("+");
    const digits = inputValue.replace(/\D/g, "");
    const limited = digits.slice(0, 12); // +92 plus 10 digits = 12 digits

    if (hasPlus) return `+${limited}`;
    if (limited.startsWith("92")) return `+${limited}`;
    if (limited.startsWith("0")) return `+92${limited.slice(1, 11)}`;
    return limited ? `+${limited}` : "";
  };

  const sanitizeCnicInput = (inputValue = "") =>
    inputValue.replace(/\D/g, "").slice(0, 13);

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
          msg: "Student registrations are currently closed.",
        });
        toast.error("Student registrations are currently closed.");
      }
      return;
    }

    if (name === "student_phone" || name === "father_phone") {
      const sanitized = sanitizePhoneInput(value);
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
    } else if (name === "father_cnic" || name === "formb_id") {
      const sanitized = sanitizeCnicInput(value);
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
    } else if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "radio") {
      setFormData((prev) => ({ ...prev, [name]: value }));
      // For grade change, we effect minDate in useEffect
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
          msg: "Student registrations are currently closed.",
        });
        toast.error("Student registrations are currently closed.");
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
    const cnicRegex = /^\d{13}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const trimmedStudentName = formData.student_name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedFatherName = formData.father_name.trim();
    const trimmedSchool = formData.school.trim();
    const trimmedDistrict = formData.district.trim();
    const trimmedCity = formData.city.trim();
    const trimmedAddress = formData.address.trim();
    const trimmedFormB = formData.formb_id.trim();
    const trimmedStudentPhone = formData.student_phone.trim();
    const trimmedFatherPhone = formData.father_phone.trim();
    const trimmedFatherCnic = formData.father_cnic.trim();

    const isGrade5 = formData.grade.startsWith("Grade 5");
    const isGrade6or7 =
      formData.grade.startsWith("Grade 6") ||
      formData.grade.startsWith("Grade 7");

    if (!trimmedStudentName)
      return { field: "student_name", message: "Student name is required." };
    if (!formData.gender)
      return { field: "gender", message: "Gender is required." };
    if (!formData.dob)
      return { field: "dob", message: "Date of Birth is required." };

    // Date Logic Check
    if (formData.dob < minDate) {
      return {
        field: "dob",
        message: `Date of Birth cannot be before ${minDate} for the selected grade.`,
      };
    }
    if (formData.dob > GLOBAL_MAX_DATE) {
      return {
        field: "dob",
        message: `Date of Birth cannot be after ${GLOBAL_MAX_DATE}.`,
      };
    }

    if (!formData.grade)
      return { field: "grade", message: "Grade is required." };

    // Check Grade vs DOB Logic again to be safe
    if (isGrade5 && formData.dob < PMC_MIN_DATE) {
      return {
        field: "dob",
        message:
          "For Grade 5 (PMC-5), Student must be born on or after 01-01-2014.",
      };
    }
    if (isGrade6or7 && formData.dob < VSS_MIN_DATE) {
      return {
        field: "dob",
        message:
          "For VSS (Grade 6/7), Student must be born on or after 01-01-2012.",
      };
    }

    if (!phoneRegex.test(trimmedStudentPhone))
      return {
        field: "student_phone",
        message: "Invalid Student WhatsApp. Use +92XXXXXXXXXX format.",
      };
    if (!trimmedEmail || !emailRegex.test(trimmedEmail))
      return { field: "email", message: "Active email is required." };
    if (!trimmedFatherName)
      return { field: "father_name", message: "Father's name is required." };
    if (!cnicRegex.test(trimmedFatherCnic))
      return {
        field: "father_cnic",
        message: "Father's CNIC must be 13 digits (no dashes).",
      };
    if (!phoneRegex.test(trimmedFatherPhone))
      return {
        field: "father_phone",
        message: "Invalid Father's WhatsApp. Use +92XXXXXXXXXX format.",
      };
    if (!trimmedSchool)
      return { field: "school", message: "School name is required." };
    if (!trimmedDistrict)
      return { field: "district", message: "District is required." };
    if (!trimmedCity) return { field: "city", message: "City is required." };
    if (!trimmedAddress)
      return { field: "address", message: "Address is required." };
    if (!cnicRegex.test(trimmedFormB))
      return {
        field: "formb_id",
        message: "Student Form-B/Smart Card ID must be 13 digits.",
      };

    if (!files.photo)
      return { field: "photo", message: "Student photo is required." };

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
        student_name: formData.student_name.trim(),
        gender: formData.gender,
        grade: formData.grade,
        dob: formData.dob,
        student_phone: formData.student_phone.trim(),
        email: formData.email.trim(),
        father_name: formData.father_name.trim(),
        father_cnic: formData.father_cnic.trim(),
        father_phone: formData.father_phone.trim(),
        school: formData.school.trim(),
        district: formData.district.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        formb_id: formData.formb_id.trim(),
        agree: formData.agree ? "on" : "",
        formType: type,
      };

      Object.entries(normalizedFields).forEach(([key, value]) => {
        payload.append(key, value);
      });

      if (files.photo) {
        payload.append("photo", files.photo);
      }

      await addStudentRegistrationForm(payload);
      setStatus({
        type: "ok",
        msg: "Your registration has been submitted successfully.",
      });
      toast.success("Registration submitted successfully.");

      // Reset form
      setFormData({
        student_name: "",
        gender: "",
        dob: "",
        yob: "",
        grade: "",
        student_phone: "",
        email: "",
        father_name: "",
        father_cnic: "",
        father_phone: "",
        school: "",
        district: "",
        city: "",
        address: "",
        formb_id: "",
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
      <div
        className={`${
          type == "vss"
            ? "bg-red-50"
            : type == "rmc"
              ? "bg-gradient-to-br from-[#E7E9F5] to-[#D0D4ED]"
              : "bg-gradient-to-br from-[#F0FDF4] to-[#E2FCEB]"
        } py-12 mb-8 border-b border-red-100`}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 font-serif text-sundar-red">
              {type == "vss"
                ? "VSS Admission"
                : type == "rmc"
                  ? "RMC Registrations"
                  : "PMC-5 Registrations"}
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              {type == "vss"
                ? `VSS Admission Test (Grades 6 & 7) . Organized by
              SundarSTEM School`
                : type == "rmc"
                  ? `RMC Registrations . Organized by
              SundarSTEM School`
                  : `PMC-5 (Grade 5) . Organized by
              SundarSTEM School`}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <div
                className={`bg-white border ${
                  type == "vss"
                    ? "border-red-100"
                    : type == "rmc"
                      ? "border-[#E8EAF6]"
                      : "border-[#BBF7D0]"
                }  shadow-sm px-6 py-3 rounded-lg`}
              >
                <p
                  className={`text-sm ${
                    type == "vss"
                      ? "text-red-600"
                      : type == "rmc"
                        ? "text-[#000071]"
                        : "text-[#16a34a]"
                  }  uppercase tracking-wider font-bold mb-1`}
                >
                  Admission Test
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {type == "rmc" ? "28 Feb 2026" : "23 May 2026"}
                </p>
              </div>
              {type == "rmc" ? (
                ""
              ) : (
                <div
                  className={`bg-white border ${
                    type == "vss"
                      ? "border-red-100"
                      : type == "rmc"
                        ? "border-[#E8EAF6]"
                        : "border-[#BBF7D0]"
                  }  shadow-sm px-6 py-3 rounded-lg`}
                >
                  <p
                    className={`text-sm ${
                      type == "vss"
                        ? "text-red-600"
                        : type == "rmc"
                          ? "text-[#000071]"
                          : "text-[#16a34a]"
                    }  uppercase tracking-wider font-bold mb-1`}
                  >
                    Register By
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {type == "rmc" ? "-" : "20 May 2026"}
                  </p>
                </div>
              )}

              <div
                className={`bg-white border ${
                  type == "vss"
                    ? "border-red-100"
                    : type == "rmc"
                      ? "border-[#E8EAF6]"
                      : "border-[#BBF7D0]"
                }  shadow-sm px-6 py-3 rounded-lg`}
              >
                <p
                  className={`text-sm ${
                    type == "vss"
                      ? "text-red-600"
                      : type == "rmc"
                        ? "text-[#000071]"
                        : "text-[#16a34a]"
                  }  uppercase tracking-wider font-bold mb-1`}
                >
                  Grades
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {type == "vss" ? "6 & 7" : "5"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 mb-20">
        <div className="max-w-4xl mx-auto">
          {/* Eligibility */}
          <section className="bg-white p-8 border-l-4 border-sundar-red shadow-md mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              Eligibility Criteria
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-sundar-red mt-1">•</span>
                  <span className="text-sm">
                    Currently enrolled in{" "}
                    <strong>Grade {type == "vss" ? "6 or 7" : "5"}</strong>.
                  </span>
                </li>
                {type == "vss" ? (
                  <li className="flex items-center gap-2">
                    <span className="text-sundar-red mt-1">•</span>
                    <span className="text-sm">
                      <strong>Grade 6/7 (VSS):</strong> Born on or after{" "}
                      <strong>01 Jan 2012</strong>.
                    </span>
                  </li>
                ) : (
                  <li className="flex items-center gap-2">
                    <span className="text-sundar-red mt-1">•</span>
                    <span className="text-sm">
                      <strong>
                        Grade 5 {type == "rmc" ? "(RMC)" : "(PMC-5)"} :
                      </strong>{" "}
                      Born on or after <strong>01 Jan 2014</strong>.
                    </span>
                  </li>
                )}
              </ul>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-sundar-red mt-1">•</span>
                  <span className="text-sm">
                    Open to <strong>boys and girls</strong> across Pakistan.
                  </span>
                </li>
                {type == "rmc" ? (
                  <li className="flex items-center gap-2">
                    <span className="text-sundar-red mt-1">•</span>
                    <span className="text-sm">
                      <strong>Test Format:</strong> In Person.
                    </span>
                  </li>
                ) : (
                  <li className="flex items-center gap-2">
                    <span className="text-sundar-red mt-1">•</span>
                    <span className="text-sm">
                      <strong>Test Format:</strong> Online from home under AI
                      invigilation.
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </section>

          {!registrationOpen ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    Student registrations are currently closed.
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

              <div className="grid md:grid-cols-2 gap-6">
                {/* Student Name */}
                <div>
                  <label className="reg-label" htmlFor="student_name">
                    Student Full Name <span className="reg-req">*</span>
                  </label>
                  <input
                    id="student_name"
                    name="student_name"
                    type="text"
                    className="reg-input"
                    value={formData.student_name}
                    onChange={handleInputChange}
                    required
                    placeholder="As per Form‑B"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="reg-label">
                    Gender <span className="reg-req">*</span>
                  </label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="Male"
                        checked={formData.gender === "Male"}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-sundar-red focus:ring-sundar-red"
                      />
                      <span>Male</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="Female"
                        checked={formData.gender === "Female"}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-sundar-red focus:ring-sundar-red"
                      />
                      <span>Female</span>
                    </label>
                  </div>
                </div>

                {/* Grade */}
                <div className="md:col-span-2">
                  <label className="reg-label" htmlFor="grade">
                    Current Class/Grade <span className="reg-req">*</span>
                  </label>
                  <div className="grid sm:grid-cols-3 gap-4 mt-2">
                    {filteredGradeOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all
                                  ${
                                    formData.grade === option.value
                                      ? "border-gray-200 bg-red-50 text-sundar-red font-bold"
                                      : "border-gray-200 hover:border-gray-300"
                                  }
                              `}
                      >
                        <input
                          type="radio"
                          name="grade"
                          value={option.value}
                          checked={formData.grade === option.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* DOB */}
                <div>
                  <label className="reg-label" htmlFor="dob">
                    Date of Birth <span className="reg-req">*</span>
                  </label>
                  <input
                    id="dob"
                    name="dob"
                    type="date"
                    className="reg-input"
                    value={formData.dob}
                    onChange={handleInputChange}
                    min={minDate}
                    max={GLOBAL_MAX_DATE}
                    required
                  />
                  <div className="reg-hint mt-1 text-[12px] text-gray-400">
                    Allowed: {minDate} to {GLOBAL_MAX_DATE}
                  </div>
                </div>

                {/* Student WhatsApp */}
                <div>
                  <label className="reg-label" htmlFor="student_phone">
                    Student WhatsApp <span className="reg-req">*</span>
                  </label>
                  <input
                    id="student_phone"
                    name="student_phone"
                    type="tel"
                    className="reg-input"
                    value={formData.student_phone}
                    onChange={handleInputChange}
                    placeholder="+923001234567"
                    inputMode="tel"
                    pattern="\\+92\\d{10}"
                    maxLength="13"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="reg-label" htmlFor="email">
                    Active Email <span className="reg-req">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="reg-input"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Father's Name */}
                <div>
                  <label className="reg-label" htmlFor="father_name">
                    Father's Full Name <span className="reg-req">*</span>
                  </label>
                  <input
                    id="father_name"
                    name="father_name"
                    type="text"
                    className="reg-input"
                    value={formData.father_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* Father's CNIC */}
                <div>
                  <label className="reg-label" htmlFor="father_cnic">
                    Father's CNIC <span className="reg-req">*</span>
                  </label>
                  <input
                    id="father_cnic"
                    name="father_cnic"
                    type="text"
                    className="reg-input"
                    value={formData.father_cnic}
                    onChange={handleInputChange}
                    placeholder="13 digits (no dashes)"
                    maxLength="13"
                    inputMode="numeric"
                    pattern="\\d{13}"
                    required
                  />
                </div>

                {/* Father's WhatsApp */}
                <div>
                  <label className="reg-label" htmlFor="father_phone">
                    Father's WhatsApp <span className="reg-req">*</span>
                  </label>
                  <input
                    id="father_phone"
                    name="father_phone"
                    type="tel"
                    className="reg-input"
                    value={formData.father_phone}
                    onChange={handleInputChange}
                    placeholder="+923001234567"
                    inputMode="tel"
                    pattern="\\+92\\d{10}"
                    maxLength="13"
                    required
                  />
                </div>

                {/* School */}
                <div className="md:col-span-2">
                  <label className="reg-label" htmlFor="school">
                    School Name <span className="reg-req">*</span>
                  </label>
                  <input
                    id="school"
                    name="school"
                    type="text"
                    className="reg-input"
                    value={formData.school}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {/* District and City */}
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

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="reg-label" htmlFor="address">
                    Complete Residential Address{" "}
                    <span className="reg-req">*</span>
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    className="reg-textarea"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows={3}
                  ></textarea>
                </div>

                {/* Form-B */}
                <div className="md:col-span-2">
                  <label className="reg-label" htmlFor="formb_id">
                    Student Form‑B / Smart Card ID{" "}
                    <span className="reg-req">*</span>
                  </label>
                  <input
                    id="formb_id"
                    name="formb_id"
                    type="text"
                    className="reg-input"
                    value={formData.formb_id}
                    onChange={handleInputChange}
                    placeholder="13 digits (no dashes)"
                    maxLength="13"
                    inputMode="numeric"
                    pattern="\\d{13}"
                    required
                  />
                </div>

                {/* Photo Upload */}
                <div className="md:col-span-2">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 text-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      Student Photo Upload
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
                  <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      id="agree"
                      name="agree"
                      type="checkbox"
                      checked={formData.agree}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-5 h-5 text-sundar-red focus:ring-sundar-red rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      I confirm that all information and documents provided are
                      true and I consent to their use for RMC admissions and
                      verification. I understand that incorrect information may
                      lead to disqualification.
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex w-full">
                <button
                  className={`cursor-pointer w-full px-8 py-4 ${
                    type == "vss"
                      ? "bg-[#991B1B] hover:bg-red-800"
                      : type == "rmc"
                        ? "bg-[#000080] hover:bg-[#000070]"
                        : "bg-[#01411C] hover:bg-[#16A34A]"
                  }  text-white text-lg font-bold rounded-lg shadow-lg  transition-all transform hover:-translate-y-1
                    ${
                      isSubmitting || checkingStatus || !registrationOpen
                        ? "opacity-70 !cursor-not-allowed"
                        : ""
                    }
                `}
                  type="submit"
                  disabled={isSubmitting || checkingStatus || !registrationOpen}
                >
                  {checkingStatus
                    ? "Checking status..."
                    : isSubmitting
                      ? "Submitting Registration..."
                      : "Submit Registration"}
                </button>
              </div>
            </form>
          )}

          <div className="text-center mt-12 text-gray-500 text-sm pb-10">
            <p>Need help? Contact Admissions Office</p>
            <p className="mt-1">
              <a
                href="mailto:admissions@virtual.sundarstem.edu.pk"
                className="text-sundar-red hover:underline"
              >
                admissions@virtual.sundarstem.edu.pk
              </a>
              <span className="mx-2">·</span>
              <a
                href="tel:+923217276806"
                className="text-sundar-red hover:underline"
              >
                +92-321-7276806
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentRegistration;
