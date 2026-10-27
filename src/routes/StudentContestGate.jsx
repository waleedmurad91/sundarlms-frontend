import React from "react";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAllContest } from "@/api/studentApi";
import {
  CONTEST_ROUTE,
  STUDENT_CONTEST_GATE_ENABLED,
  STUDENT_CONTEST_STATUS_UPDATED_EVENT,
  getContestPromptState,
  isContestGateExemptPath,
  isContestRegistrationRequired,
  readContestRegistrationRequired,
  writeContestRegistrationRequired,
} from "@/utils/studentContestAccess";

const ContestRequiredPrompt = ({ blockedPath, error, onClose, onRetry }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Join a contest to continue
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Please join a PMC or RMC session first. Contest registration is
              required before the rest of the student portal can be used.
            </p>
            {blockedPath ? (
              <p className="mt-2 text-sm text-slate-500">
                You tried to open{" "}
                <span className="font-medium text-slate-700">
                  {blockedPath}
                </span>
                .
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 transition hover:text-slate-600"
          aria-label="Close popup"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="border-slate-200 text-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh status
        </Button>
        <Button
          type="button"
          onClick={onClose}
          className="bg-[#AD474B] text-white hover:bg-[#96373A]"
        >
          Continue to contest
        </Button>
      </div>
    </div>
  </div>
);

const StudentContestGate = () =>
  STUDENT_CONTEST_GATE_ENABLED ? <ContestGate /> : <Outlet />;

const ContestGate = () => {
  const location = useLocation();
  const isContestRoute = location.pathname === CONTEST_ROUTE;
  const isExemptPath = isContestGateExemptPath(location.pathname);
  const promptState = location.state?.contestRequiredPrompt ?? null;
  const [registrationRequired, setRegistrationRequired] = React.useState(
    readContestRegistrationRequired(),
  );
  const [error, setError] = React.useState("");
  const [isPromptOpen, setIsPromptOpen] = React.useState(false);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadContestStatus = React.useCallback(async () => {
    if (mountedRef.current) {
      setError("");
    }

    try {
      const response = await getAllContest();
      const nextRegistrationRequired =
        isContestRegistrationRequired(response);

      if (!mountedRef.current) return;

      writeContestRegistrationRequired(nextRegistrationRequired);
      setRegistrationRequired(nextRegistrationRequired);
    } catch (err) {
      if (!mountedRef.current) return;

      setError(err?.message || "Unable to verify contest registration.");
    }
  }, []);

  React.useEffect(() => {
    loadContestStatus();
  }, [loadContestStatus]);

  React.useEffect(() => {
    const handleContestUpdate = (event) => {
      const nextRegistrationRequired =
        event?.detail?.registrationRequired;

      if (typeof nextRegistrationRequired === "boolean") {
        writeContestRegistrationRequired(nextRegistrationRequired);
        setRegistrationRequired(nextRegistrationRequired);
        setError("");
        return;
      }

      loadContestStatus();
    };

    window.addEventListener(STUDENT_CONTEST_STATUS_UPDATED_EVENT, handleContestUpdate);

    return () => {
      window.removeEventListener(
        STUDENT_CONTEST_STATUS_UPDATED_EVENT,
        handleContestUpdate,
      );
    };
  }, [loadContestStatus]);

  React.useEffect(() => {
    if (registrationRequired && isContestRoute) {
      setIsPromptOpen(true);
      return;
    }

    if (!registrationRequired) {
      setIsPromptOpen(false);
    }
  }, [isContestRoute, registrationRequired, promptState?.at]);

  if (registrationRequired && !isContestRoute && !isExemptPath) {
    return (
      <Navigate
        to={CONTEST_ROUTE}
        replace
        state={getContestPromptState(location.pathname)}
      />
    );
  }

  return (
    <>
      <Outlet />
      {registrationRequired && isContestRoute && isPromptOpen ? (
        <ContestRequiredPrompt
          blockedPath={promptState?.from ?? ""}
          error={error}
          onClose={() => setIsPromptOpen(false)}
          onRetry={loadContestStatus}
        />
      ) : null}
    </>
  );
};

export default StudentContestGate;
