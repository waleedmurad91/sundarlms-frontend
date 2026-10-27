export const CONTEST_ROUTE = "/student/contest";
// Set to true to re-enable the post-login "Join a contest" popup and redirect.
export const STUDENT_CONTEST_GATE_ENABLED = false;
export const STUDENT_CONTEST_STATUS_STORAGE_KEY =
  "student_contest_registration_required";
export const STUDENT_CONTEST_STATUS_UPDATED_EVENT =
  "student-contest-registration-updated";
export const STUDENT_CONTEST_GATE_EXEMPT_PATHS = [
  "/student/edit-profile",
  "/student/profile",
  "/student/profile/edit"
];

export const isTruthyLike = (value) => {
  if (value === true || value === 1) return true;

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return ["true", "1", "yes"].includes(normalized);
};

export const toItems = (value) => {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    if (Array.isArray(value.data)) return value.data;

    return Object.values(value).filter(
      (item) => item && typeof item === "object",
    );
  }

  return [];
};

const hasContestRegistration = (contest, { isPmc = false } = {}) => {
  if (isTruthyLike(contest?.registered)) return true;
  if (contest?.round_1_participation) return true;

  if (
    toItems(contest?.participations).some((item) =>
      isTruthyLike(item?.is_participating ?? true),
    )
  ) {
    return true;
  }

  if (isPmc) {
    return false;
  }

  return toItems(contest?.sessions).some((item) =>
    isTruthyLike(item?.already_registered),
  );
};

export const isContestRegistrationRequired = (response) => {
  if (!STUDENT_CONTEST_GATE_ENABLED) return false;

  const payload = response?.data ?? response ?? {};
  const pmc = payload?.pmc ?? {};
  const rmc = payload?.rmc ?? {};
  const hasPmcRegistration = hasContestRegistration(pmc, { isPmc: true });
  const hasRmcRegistration = hasContestRegistration(rmc);

  if (hasPmcRegistration || hasRmcRegistration) {
    return false;
  }

  const hasAvailablePmcSessions = toItems(pmc?.sessions).length > 0;
  const hasAvailableRmcSessions =
    isTruthyLike(rmc?.eligible) &&
    toItems(rmc?.sessions).length > 0 &&
    toItems(rmc?.venues).length > 0;

  return hasAvailablePmcSessions || hasAvailableRmcSessions;
};

export const isContestGateExemptPath = (pathname = "") =>
  STUDENT_CONTEST_GATE_EXEMPT_PATHS.includes(pathname);

export const readContestRegistrationRequired = () => {
  if (!STUDENT_CONTEST_GATE_ENABLED) return false;

  const rawValue = sessionStorage.getItem(STUDENT_CONTEST_STATUS_STORAGE_KEY);

  if (rawValue === "true") return true;
  if (rawValue === "false") return false;

  return null;
};

export const writeContestRegistrationRequired = (required) => {
  sessionStorage.setItem(
    STUDENT_CONTEST_STATUS_STORAGE_KEY,
    String(Boolean(required)),
  );
};

export const emitContestRegistrationStatusUpdated = (detail = {}) => {
  window.dispatchEvent(
    new CustomEvent(STUDENT_CONTEST_STATUS_UPDATED_EVENT, { detail }),
  );
};

export const getContestPromptState = (from = "") => ({
  contestRequiredPrompt: {
    from,
    at: Date.now(),
  },
});
