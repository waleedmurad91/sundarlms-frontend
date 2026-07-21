/**
 * Reusable filter schemas for admin pages
 */
const asArray = (value) => (Array.isArray(value) ? value : []);

const dedupeOptions = (options = []) => {
  const seen = new Set();
  return asArray(options).filter((option) => {
    const value = option?.value;
    if (value === undefined || value === null) {
      return false;
    }
    const key = String(value);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const categorizeTranslationOption = (value) => {
  const v = String(value ?? "").toLowerCase();
  if (v.startsWith("pending_") && v.endsWith("_translation")) return "pending_translation";
  if (v.startsWith("pending_") && v.endsWith("_review")) return "pending_review";
  if (v.endsWith("_approved")) return "approved";
  if (v.endsWith("_rejected")) return "rejected";
  return "other";
};

const buildQuestionTranslationStatusOptions = (
  options = {},
  role = "admin",
) => {
  const apiOptions = dedupeOptions(options?.translation_status);

  const grouped = apiOptions.reduce((acc, option) => {
    const category = categorizeTranslationOption(option?.value);
    acc[category] = acc[category] ?? [];
    acc[category].push(option);
    return acc;
  }, {});

  const pendingTranslationOptions = grouped.pending_translation ?? [];
  const pendingReviewOptions = grouped.pending_review ?? [];
  const approvalOptions = grouped.approved ?? [];
  const rejectionOptions = grouped.rejected ?? [];
  const otherOptions = grouped.other ?? [];

  // Data entry only requests translations — hide review / approval / rejection.
  if (role === "data_entry") {
    return pendingTranslationOptions;
  }

  // if (role === "translator") {
  //   return [
  //     ...pendingTranslationOptions,
  //     ...approvalOptions,
  //     ...rejectionOptions,
  //   ];
  // }
  if (role === "translator") {
    return [
      ...pendingTranslationOptions,
      ...pendingReviewOptions,
      ...approvalOptions,
      ...rejectionOptions,
    ];
  }

  // if (role === "reviewer") {
  //   return [
  //     ...pendingReviewOptions,
  //     ...approvalOptions,
  //     ...rejectionOptions,
  //   ];
  // }
  if (role === "reviewer") {
    return [
      ...pendingTranslationOptions,
      ...pendingReviewOptions,
      ...approvalOptions,
      ...rejectionOptions,
    ];
  }

  return [
    ...pendingTranslationOptions,
    ...pendingReviewOptions,
    ...approvalOptions,
    ...rejectionOptions,
    ...otherOptions,
  ];
};

export const createAdminBaseFilterSchema = ({
  statusOptions = [],
  searchPlaceholder = "Search records...",
} = {}) => [
    {
      key: "search",
      type: "search",
      label: "Search",
      placeholder: searchPlaceholder,
    },
    {
      key: "status",
      type: "multiselect",
      label: "Status",
      options: dedupeOptions(statusOptions),
      placeholder: "Select status",
    },
    {
      key: "date_from",
      type: "date",
      label: "From Date",
    },
    {
      key: "date_to",
      type: "date",
      label: "To Date",
    },
  ];

export const createQuestionFilterSchema = (
  options = {},
  { role = "admin" } = {},
) => {
  const baseSchema = createAdminBaseFilterSchema({
    statusOptions: options?.status,
    searchPlaceholder: "Search question, type, topic...",
  });

  return [
    baseSchema[0],
    {
      key: "status",
      type: "multiselect",
      label: "Question Status",
      options: dedupeOptions(options?.status),
      placeholder: "Select status",
    },
    {
      key: "translation_status",
      type: "multiselect",
      label: "Translation Status",
      options: buildQuestionTranslationStatusOptions(options, role),
      placeholder: "Select translation status",
    },
    {
      key: "question_type",
      type: "multiselect",
      label: "Question Type",
      options: dedupeOptions(options?.question_type),
      placeholder: "Select type",
    },
    {
      key: "question_category",
      type: "multiselect",
      label: "Question Category",
      options: dedupeOptions(options?.question_category),
      placeholder: "Select category",
    },
    {
      key: "topic",
      type: "multiselect",
      label: "Topic",
      options: dedupeOptions(options?.topic),
      placeholder: "Select topic",
    },
    {
      key: "unit",
      type: "multiselect",
      label: "Unit",
      options: dedupeOptions(options?.unit),
      placeholder: "Select unit",
    },
    {
      key: "subject",
      type: "multiselect",
      label: "Subject",
      options: dedupeOptions(options?.subject),
      placeholder: "Select subject",
    },
    {
      key: "grade",
      type: "multiselect",
      label: "Grade",
      options: dedupeOptions(options?.grade),
      placeholder: "Select grade",
    },
    baseSchema[2],
    baseSchema[3],
  ];
};

export const createSchoolFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search school, email, phone...",
  },
  {
    key: "district",
    type: "multiselect",
    label: "District",
    options: dedupeOptions(options?.district),
    placeholder: "Select district",
  },
  {
    key: "city",
    type: "multiselect",
    label: "City",
    options: dedupeOptions(options?.city),
    placeholder: "Select city",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createSchoolRegistrationListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search school, city, or phone...",
  },
  {
    key: "status",
    type: "multiselect",
    label: "Status",
    options: dedupeOptions(options?.status),
    placeholder: "Select status",
  },
  {
    key: "city",
    type: "multiselect",
    label: "City",
    options: dedupeOptions(options?.city),
    placeholder: "Select city",
  },
  {
    key: "district",
    type: "multiselect",
    label: "District",
    options: dedupeOptions(options?.district),
    placeholder: "Select district",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createClassFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search class or grade...",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createSubjectListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search subject or grade...",
  },
  {
    key: "subject",
    type: "multiselect",
    label: "Subject",
    options: dedupeOptions(options?.subject),
    placeholder: "Select subject",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createTeacherListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search teacher, subject, or grade...",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "subject",
    type: "multiselect",
    label: "Subject",
    options: dedupeOptions(options?.subject),
    placeholder: "Select subject",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createStudentListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search student, email, roll number...",
  },
  {
    key: "status",
    type: "multiselect",
    label: "Status",
    options: dedupeOptions(options?.status),
    placeholder: "Select status",
  },
  {
    key: "school_link",
    type: "multiselect",
    label: "School Link",
    options: dedupeOptions(options?.school_link),
    placeholder: "Select school link",
  },
  {
    key: "school",
    type: "multiselect",
    label: "School",
    options: dedupeOptions(options?.school),
    placeholder: "Select school",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "gender",
    type: "multiselect",
    label: "Gender",
    options: dedupeOptions(options?.gender),
    placeholder: "Select gender",
  },
  {
    key: "formType",
    type: "multiselect",
    label: "Form Type",
    options: dedupeOptions(options?.formType),
    placeholder: "Select form type",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createCentralizedStudentListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search student, email, smart card ID...",
  },
  // {
  //   key: "source",
  //   type: "multiselect",
  //   label: "Source",
  //   options: dedupeOptions(options?.source),
  //   placeholder: "Select source",
  // },
  {
    key: "status",
    type: "multiselect",
    label: "Status",
    options: dedupeOptions(options?.status),
    placeholder: "Select status",
  },
  // {
  //   key: "rmc_participation",
  //   type: "select",
  //   label: "RMC Participation",
  //   options: dedupeOptions(options?.rmc_participation),
  //   placeholder: "Select participation",
  // },
  // {
  //   key: "has_rmc_record",
  //   type: "select",
  //   label: "Has RMC Record",
  //   options: dedupeOptions(options?.has_rmc_record),
  //   placeholder: "Select option",
  // },
  // {
  //   key: "has_pmc_record",
  //   type: "select",
  //   label: "Has PMC Record",
  //   options: dedupeOptions(options?.has_pmc_record),
  //   placeholder: "Select option",
  // },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createStudentSignupListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search student, email, school...",
  },
  {
    key: "status",
    type: "multiselect",
    label: "Status",
    options: dedupeOptions(options?.status),
    placeholder: "Select status",
  },
  {
    key: "school",
    type: "multiselect",
    label: "School",
    options: dedupeOptions(options?.school),
    placeholder: "Select school",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createStaffListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search staff name, email, phone...",
  },
  {
    key: "role",
    type: "multiselect",
    label: "Role",
    options: dedupeOptions(options?.role),
    placeholder: "Select role",
  },
  {
    key: "gender",
    type: "multiselect",
    label: "Gender",
    options: dedupeOptions(options?.gender),
    placeholder: "Select gender",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createSystemUserListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search user name, username, email...",
  },
  {
    key: "role",
    type: "multiselect",
    label: "Role",
    options: dedupeOptions(options?.role),
    placeholder: "Select role",
  },
  {
    key: "gender",
    type: "multiselect",
    label: "Gender",
    options: dedupeOptions(options?.gender),
    placeholder: "Select gender",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createRmcRegistrationListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search name, grade, city, phone...",
  },
  {
    key: "status",
    type: "multiselect",
    label: "Status",
    options: dedupeOptions(options?.status),
    placeholder: "Select status",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  // {
  //   key: "formType",
  //   type: "multiselect",
  //   label: "Form Type",
  //   options: dedupeOptions(options?.formType),
  //   placeholder: "Select form type",
  // },
  {
    key: "district",
    type: "multiselect",
    label: "District",
    options: dedupeOptions(options?.district),
    placeholder: "Select district",
  },
  {
    key: "city",
    type: "multiselect",
    label: "City",
    options: dedupeOptions(options?.city),
    placeholder: "Select city",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createRmcJoinersListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search name, email, school...",
  },
  {
    key: "join",
    type: "multiselect",
    label: "Join",
    options: dedupeOptions(options?.join),
    placeholder: "Select join status",
  },
  {
    key: "status",
    type: "multiselect",
    label: "Status",
    options: dedupeOptions(options?.status),
    placeholder: "Select status",
  },
  {
    key: "school",
    type: "multiselect",
    label: "School",
    options: dedupeOptions(options?.school),
    placeholder: "Select school",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createUnitListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search unit, code, or class...",
  },
  {
    key: "subject",
    type: "multiselect",
    label: "Subject",
    options: dedupeOptions(options?.subject),
    placeholder: "Select subject",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createTopicListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search unit or topic...",
  },
  {
    key: "unit",
    type: "multiselect",
    label: "Unit",
    options: dedupeOptions(options?.unit),
    placeholder: "Select unit",
  },
  {
    key: "subject",
    type: "multiselect",
    label: "Subject",
    options: dedupeOptions(options?.subject),
    placeholder: "Select subject",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createQuizListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search quiz, unit, or class...",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "unit",
    type: "multiselect",
    label: "Unit",
    options: dedupeOptions(options?.unit),
    placeholder: "Select unit",
  },
  {
    key: "subject",
    type: "multiselect",
    label: "Subject",
    options: dedupeOptions(options?.subject),
    placeholder: "Select subject",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createAssessmentListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search assessment title...",
  },
  {
    key: "class_ids",
    type: "multiselect",
    label: "Class",
    options: dedupeOptions(options?.class ?? options?.class_ids),
    placeholder: "Select class",
  },
  {
    key: "subject_ids",
    type: "multiselect",
    label: "Subject",
    options: dedupeOptions(options?.subject ?? options?.subject_ids),
    placeholder: "Select subject",
  },
  {
    key: "unit_ids",
    type: "multiselect",
    label: "Unit",
    options: dedupeOptions(options?.unit ?? options?.unit_ids),
    placeholder: "Select unit",
  },
  {
    key: "topic_ids",
    type: "multiselect",
    label: "Topic",
    options: dedupeOptions(options?.topic ?? options?.topic_ids),
    placeholder: "Select topic",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

export const createUnitTestListFilterSchema = (options = {}) => [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search unit test, unit, or class...",
  },
  {
    key: "grade",
    type: "multiselect",
    label: "Grade",
    options: dedupeOptions(options?.grade),
    placeholder: "Select grade",
  },
  {
    key: "unit",
    type: "multiselect",
    label: "Unit",
    options: dedupeOptions(options?.unit),
    placeholder: "Select unit",
  },
  {
    key: "subject",
    type: "multiselect",
    label: "Subject",
    options: dedupeOptions(options?.subject),
    placeholder: "Select subject",
  },
  {
    key: "date_from",
    type: "date",
    label: "From Date",
  },
  {
    key: "date_to",
    type: "date",
    label: "To Date",
  },
];

// Common status options
export const STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// Certificate status options
export const CERTIFICATE_STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "blocked", label: "Blocked" },
];

// Laptop status options
export const LAPTOP_STATUS_OPTIONS = [
  { value: "true", label: "Returned" },
  { value: "false", label: "Not Returned" },
];

// Student filter schema
export const STUDENT_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search name, email, roll number...",
  },
  {
    key: "school_id",
    type: "text",
    label: "School",
    options: [], // Will be populated dynamically
  },
  {
    key: "grade_id",
    type: "text",
    label: "Class",
    options: [], // Will be populated dynamically
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Teacher filter schema
export const TEACHER_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search name, email, phone...",
  },
  {
    key: "school_id",
    type: "text",
    label: "School",
    options: [], // Will be populated dynamically
  },
  {
    key: "subject_id",
    type: "text",
    label: "Subject",
    options: [], // Will be populated dynamically
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Staff filter schema
export const STAFF_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search name, email, phone...",
  },
  {
    key: "role",
    type: "text",
    label: "Role",
    options: [
      { value: "admin", label: "Admin" },
      { value: "moderator", label: "Moderator" },
      { value: "editor", label: "Editor" },
    ],
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Certificate filter schema
export const CERTIFICATE_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search SSID, student name, batch...",
  },
  {
    key: "certificate_status",
    type: "text",
    label: "Certificate Status",
    options: CERTIFICATE_STATUS_OPTIONS,
  },
  {
    key: "laptop_returned",
    type: "text",
    label: "Laptop Status",
    options: LAPTOP_STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From Date",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To Date",
    inputType: "date",
  },
];

// School filter schema
export const SCHOOL_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search school name, email...",
  },
  {
    key: "city",
    type: "text",
    label: "City",
    placeholder: "Enter city...",
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Class filter schema
export const CLASS_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search class name...",
  },
  {
    key: "school_id",
    type: "text",
    label: "School",
    options: [], // Will be populated dynamically
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Subject filter schema
export const SUBJECT_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search subject name, code...",
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Quiz filter schema
export const QUIZ_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search quiz title...",
  },
  {
    key: "subject_id",
    type: "text",
    label: "Subject",
    options: [], // Will be populated dynamically
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Unit test filter schema
export const UNIT_TEST_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search unit test title...",
  },
  {
    key: "subject_id",
    type: "text",
    label: "Subject",
    options: [], // Will be populated dynamically
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Question filter schema
export const QUESTION_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search question...",
  },
  {
    key: "subject_id",
    type: "text",
    label: "Subject",
    options: [], // Will be populated dynamically
  },
  {
    key: "topic_id",
    type: "text",
    label: "Topic",
    options: [], // Will be populated dynamically
  },
  {
    key: "difficulty",
    type: "text",
    label: "Difficulty",
    options: [
      { value: "easy", label: "Easy" },
      { value: "medium", label: "Medium" },
      { value: "hard", label: "Hard" },
    ],
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Topic filter schema
export const TOPIC_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search topic name...",
  },
  {
    key: "subject_id",
    type: "text",
    label: "Subject",
    options: [], // Will be populated dynamically
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Unit filter schema
export const UNIT_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search unit name...",
  },
  {
    key: "subject_id",
    type: "text",
    label: "Subject",
    options: [], // Will be populated dynamically
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To",
    inputType: "date",
  },
];

// Gallery filter schema
export const GALLERY_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search gallery title...",
  },
  {
    key: "from",
    type: "from",
    label: "From Date",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To Date",
    inputType: "date",
  },
];

// News story filter schema
export const NEWS_STORY_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search news title...",
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: [
      { value: "published", label: "Published" },
      { value: "draft", label: "Draft" },
      { value: "archived", label: "Archived" },
    ],
  },
  {
    key: "from",
    type: "from",
    label: "From Date",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To Date",
    inputType: "date",
  },
];

// RMC joiners filter schema
export const RMC_JOINERS_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search name, email, phone...",
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From Date",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To Date",
    inputType: "date",
  },
];

// Student registrations filter schema
export const STUDENT_REGISTRATIONS_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search name, email, phone...",
  },
  {
    key: "school_id",
    type: "text",
    label: "School",
    options: [], // Will be populated dynamically
  },
  {
    key: "grade_id",
    type: "text",
    label: "Class",
    options: [], // Will be populated dynamically
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From Date",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To Date",
    inputType: "date",
  },
];

// School registrations filter schema
export const SCHOOL_REGISTRATIONS_FILTER_SCHEMA = [
  {
    key: "search",
    type: "text",
    label: "Search",
    placeholder: "Search school name, email...",
  },
  {
    key: "city",
    type: "text",
    label: "City",
    placeholder: "Enter city...",
  },
  {
    key: "status",
    type: "text",
    label: "Status",
    options: STATUS_OPTIONS,
  },
  {
    key: "from",
    type: "from",
    label: "From Date",
    inputType: "date",
  },
  {
    key: "to",
    type: "to",
    label: "To Date",
    inputType: "date",
  },
];



const formatCalendarFilterLabel = (value) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "-";
  return normalized
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const createCalendarEventListFilterSchema = (options = {}) => {
  const baseSchema = createAdminBaseFilterSchema({
    searchPlaceholder: "Search title, description...",
  });

  const categoryOptions = dedupeOptions(
    asArray(options?.suggested_categories).map((cat) => ({
      value: cat,
      label: formatCalendarFilterLabel(cat),
    })),
  );

  const statusOptions = dedupeOptions(
    asArray(options?.statuses).map((status) => ({
      value: status === "active" ? "1" : "0",
      label: formatCalendarFilterLabel(status),
    })),
  );

  const visibilityOptions = dedupeOptions(
    asArray(options?.visibility).map((vis) => ({
      value: vis === "public" ? "1" : "0",
      label: formatCalendarFilterLabel(vis),
    })),
  );

  return [
    baseSchema[0], // search
    {
      key: "category",
      type: "multiselect",
      label: "Category",
      options: categoryOptions,
      placeholder: "Select category",
    },
    {
      key: "is_active",
      type: "multiselect",
      label: "Status",
      options: statusOptions,
      placeholder: "Select status",
    },
    {
      key: "is_public",
      type: "multiselect",
      label: "Visibility",
      options: visibilityOptions,
      placeholder: "Select visibility",
    },
    baseSchema[2], // date_from
    baseSchema[3], // date_to
  ];
};