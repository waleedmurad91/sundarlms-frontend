import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RmcModal = ({
  open,
  onClose,
  onYes,
  onNo,
  isOptOut = false,
  loading = false,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isOptOut ? "Opt out of RMC" : "RMC Participation"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isOptOut
              ? "Are you sure you want to opt out of the RMC?"
              : "Are you participating in the upcoming RMC?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onNo} disabled={loading}>
            {isOptOut ? "Cancel" : "No"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onYes} disabled={loading}>
            {loading ? "Processing..." : isOptOut ? "Yes, opt out" : "Yes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RmcModal;
