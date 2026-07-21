import React, { useState, useEffect } from "react";
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
import { Loader2, Link2, Unlink, School } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";

const SchoolLinkModal = ({
  open,
  onClose,
  onLink,
  onUnlink,
  isLinked,
  currentSchool,
  role, // "teacher" or "student"
}) => {
  const { user } = useAuthStore();
  const [schoolCode, setSchoolCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const handleLink = async (e) => {
    e.preventDefault();
    if (!schoolCode.trim()) {
      toast.error("Please enter a school code");
      return;
    }

    setLoading(true);
    try {
      await onLink({ school_code: schoolCode.trim() });
      toast.success(`Successfully linked to school!`);
      setSchoolCode("");
      onClose();
    } catch (error) {
      toast.error(
        error?.message || "Failed to link to school. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinkLoading(true);
    try {
      await onUnlink({});
      toast.success("Successfully unlinked from school");
      onClose();
    } catch (error) {
      toast.error(
        error?.message || "Failed to unlink from school. Please try again.",
      );
    } finally {
      setUnlinkLoading(false);
    }
  };

  const resetForm = () => {
    setSchoolCode("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md backdrop-blur-sm z-[1000]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School size={20} />
            Link with School
          </DialogTitle>
          <DialogDescription>
            {currentSchool ? (
              <span className="text-gray-600">
                You are currently linked with{" "}
                <strong className="text-black">{currentSchool}</strong>
              </span>
            ) : (
              "Enter your school code to link your account."
            )}
          </DialogDescription>
        </DialogHeader>

        {isLinked && currentSchool ? (
          // Show current school and unlink option
          <div className="space-y-4 py-4">
            <div className="p-4 border rounded-lg bg-slate-50">
              <p className="text-sm text-slate-600 mb-1">Linked School</p>
              <p className="font-semibold text-slate-900">{currentSchool}</p>
              {currentSchool.code && (
                <p className="text-xs text-slate-500 mt-1">
                  Code: {currentSchool.code}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={handleUnlink}
              disabled={unlinkLoading}
              className="w-full"
            >
              {unlinkLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unlinking...
                </>
              ) : (
                <>
                  <Unlink className="mr-2 h-4 w-4" />
                  Unlink from School
                </>
              )}
            </Button>
          </div>
        ) : (
          // Show form to link with new school
          <form onSubmit={handleLink}>
            <div className="space-y-4 py-4">
              <div className="form-group">
                <Label htmlFor="school_code">
                  <Link2 size={16} className="inline mr-2" />
                  School Code *
                </Label>
                <input
                  id="school_code"
                  name="school_code"
                  type="text"
                  placeholder="Enter school code"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  className="form-input"
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">
                  Contact your school administrator to get the school code.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !schoolCode.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Link School
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SchoolLinkModal;
