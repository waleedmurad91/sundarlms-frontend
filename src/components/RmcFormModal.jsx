import React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  FileImage,
  IdCard,
  Map,
  MapPin,
  MapPinCheck,
  Phone,
  Text,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import DistrictCitySelector from "./DistrictCitySelector";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_REGEX = /^[A-Za-z\s]+$/;

const RmcFormModal = ({
  open,
  onClose,
  missingFields,
  onSubmit,
  onGoBack,
  formData,
  setFormData,
}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateField = (field, value) => {
    switch (field) {
      case "name":
      case "father_name":
        if (!value || !NAME_REGEX.test(value)) {
          return "Please enter a valid name (letters and spaces only).";
        }
        break;
      case "dob":
        if (!value) return "Date of birth is required.";
        const dob = new Date(value);
        const min = new Date("2014-01-01");
        const max = new Date("2019-01-01");
        if (dob < min || dob > max) {
          return "Date of birth must be between 2014 and 2019.";
        }
        break;
      case "father_phone":
        if (!value || value.replace(/\D/g, "").length !== 12) {
          return "Father's phone must be 12 digits.";
        }
        break;
      case "father_cnic":
        if (!value || value.replace(/\D/g, "").length !== 13) {
          return "Father's CNIC must be 13 digits.";
        }
        break;
      case "formb_id":
        if (!value || value.replace(/\D/g, "").length !== 13) {
          return "Form B ID must be 13 digits.";
        }
        break;
      case "district":
      case "city":
        if (!value || value.trim().length < 2) {
          return `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
        }
        break;
      case "photo":
        if (!value) return "Photo is required.";
        break;
      default:
        if (!value || value.trim() === "") {
          return `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
        }
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const newErrors = {};

    missingFields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      // Show errors in toast
      const errorMessages = Object.values(newErrors).join(". ");
      toast.error(`Please correct the following errors: ${errorMessages}`);
      // Focus the first error field
      const firstErrorField = Object.keys(newErrors)[0];
      const inputElement = document.getElementById(firstErrorField);
      if (inputElement) {
        inputElement.focus();
      }
      return;
    }

    try {
      await onSubmit({ ...formData, join: true });
      onClose();
    } catch (error) {
      toast.error("Failed to submit RMC information.");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field] || "";
    const error = errors[field];

    const commonProps = {
      id: field,
      value,
      onChange: (e) => handleChange(field, e.target.value),
      className: `form-input ${error ? "border-red-500" : ""}`,
      disabled: loading,
    };

    switch (field) {
      case "name":
        return (
          <div key={field} className="form-group">
            <Label htmlFor={field}>
              <User size={16} className="inline mr-2" />
              Full Name*
            </Label>
            <input
              {...commonProps}
              type="text"
              placeholder="Enter full name"
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^A-Za-z\s]/g, "");
                handleChange(field, cleaned);
              }}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
      case "dob":
        return (
          <div key={field} className="form-group">
            <Label htmlFor={field}>
              <Calendar size={16} className="inline mr-2" />
              Date of Birth*
            </Label>
            <input
              {...commonProps}
              type="date"
              min="2014-01-01"
              max="2019-01-01"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
      case "father_name":
        return (
          <div key={field} className="form-group">
            <Label htmlFor={field}>
              <User size={16} className="inline mr-2" />
              Father's Name*
            </Label>
            <input
              {...commonProps}
              type="text"
              placeholder="Enter father's name"
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^A-Za-z\s]/g, "");
                handleChange(field, cleaned);
              }}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
      case "father_phone":
        return (
          <div key={field} className="form-group">
            <Label htmlFor={field}>
              <Phone size={16} className="inline mr-2" />
              Father's Phone*
            </Label>
            <input
              {...commonProps}
              type="text"
              placeholder="Enter father's phone (12 digits)"
              onChange={(e) => {
                const numeric = e.target.value.replace(/\D/g, "").slice(0, 12);
                handleChange(field, numeric);
              }}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
      case "father_cnic":
        return (
          <div key={field} className="form-group">
            <Label htmlFor={field}>
              <IdCard size={16} className="inline mr-2" />
              Father's CNIC*
            </Label>
            <input
              {...commonProps}
              type="text"
              placeholder="Enter father's CNIC (13 digits)"
              onChange={(e) => {
                const numeric = e.target.value.replace(/\D/g, "").slice(0, 13);
                handleChange(field, numeric);
              }}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
      case "district":
        return (
          <DistrictCitySelector
            key="district-city"
            district={formData.district}
            city={formData.city}
            onDistrictChange={(value) => handleChange("district", value)}
            onCityChange={(value) => handleChange("city", value)}
            disabled={loading}
            icon={<Map size={16} />}
          />
        );
      case "city":
        return null; // Handled in district case
      case "formb_id":
        return (
          <div key={field} className="form-group">
            <Label htmlFor={field}>
              <IdCard size={16} className="inline mr-2" />
              Form B ID*
            </Label>
            <input
              {...commonProps}
              type="text"
              placeholder="Enter Form B ID (13 digits)"
              onChange={(e) => {
                const numeric = e.target.value.replace(/\D/g, "").slice(0, 13);
                handleChange(field, numeric);
              }}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
      case "photo":
        return (
          <div key={field} className="form-group">
            <Label htmlFor={field}>
              <FileImage size={16} className="inline mr-2" />
              Photo*
            </Label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleChange(field, e.target.files[0])}
              className="form-input"
              disabled={loading}
            />
            {formData.photo && (
              <p className="text-sm text-gray-600">
                Selected: {formData.photo.name}
              </p>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md backdrop-blur-sm z-[1000]">
        <DialogHeader>
          <DialogTitle>Complete Your RMC Registration</DialogTitle>
          <DialogDescription>
            Please fill in the missing information to participate in the RMC
            contest.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4">
            {missingFields.map(renderField)}
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onGoBack}
              disabled={loading}
            >
              Go Back
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RmcFormModal;
