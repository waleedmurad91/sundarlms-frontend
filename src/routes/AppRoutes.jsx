import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import Login from "../pages/auth/Login";
import ScrollToTop from "../components/common/ScrollToTop";
import AnnouncementModal from "../components/common/AnnouncementModal";
import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/admin/Dashboard";
import NotFound from "../pages/NotFound";
import SchoolList from "@/pages/admin/school-management/sList";
import SchoolForm from "@/pages/admin/school-management/sForm";
import ClassList from "@/pages/admin/class-management/cList";
import ClassForm from "@/pages/admin/class-management/cForm";
import TeacherList from "@/pages/admin/teacher-management/tList";
import TeacherForm from "@/pages/admin/teacher-management/tForm";
import StudentList from "@/pages/admin/student-management/stdList";
import StudentForm from "@/pages/admin/student-management/stdForm";
import SubjectList from "@/pages/admin/subject-management/subjectList";
import SubjectForm from "@/pages/admin/subject-management/subjectForm";
import UnitList from "@/pages/admin/unit-management/unitList";
import UnitForm from "@/pages/admin/unit-management/unitForm";
import TopicList from "@/pages/admin/topic-management/topicList";
import TopicForm from "@/pages/admin/topic-management/topicForm";
import QuestionList from "@/pages/admin/questions-management/questionList";
import QuestionForm from "@/pages/admin/questions-management/questionForm";
import QuestionDetail from "@/pages/admin/questions-management/questionDetail";
import DataEntryDashboard from "@/pages/data-entry/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import StudentContestGate from "./StudentContestGate";
import EditProfile from "@/pages/admin/profile/editProfile";
import SchoolDetail from "@/pages/admin/school-management/sDetail";
import TeacherDetail from "@/pages/admin/teacher-management/tDetail";
import StudentDetail from "@/pages/admin/student-management/stdDetail";
import QuizList from "@/pages/admin/quiz-management/quizList";
import QuizForm from "@/pages/admin/quiz-management/quizForm";
import TeacherDashboard from "@/pages/teacher/Dashboard";
import StudentDashboard from "@/pages/student/Dashboard";
import StudentContestPage from "@/pages/student/Contest";
import StudentProgress from "@/pages/student/Progress";
import StudentProfile from "@/pages/student/Profile";
import { useAuthStore } from "@/store/auth";
import AssignMastery from "@/pages/teacher/mastery-goals/assignMastery";
import MasteryProgress from "@/pages/teacher/mastery-goals/masteryProgress";
import AssignAssignment from "@/pages/teacher/assignments/assignAssignment";
import ManageAssignment from "@/pages/teacher/assignments/manageAssignment";
import AssignmentScore from "@/pages/teacher/assignments/assignmentScore";
import MasteryAssignmentLists from "@/pages/teacher/mastery-goals/masteryAssignmentLists";
import EditTeacherProfile from "@/pages/teacher/profile/editProfile";
import StudentPortalLayout from "@/layouts/StudentPortalLayout";
import StudentPractice from "@/pages/student/Practice";
import UnitTestList from "@/pages/admin/unitTest-management/unitTestList";
import UnitTestForm from "@/pages/admin/unitTest-management/unitTestForm";
import PracticeStarter from "@/pages/practice/PracticeStarter";
import ChallengeStarter from "@/pages/practice/ChallengeStarter";
import PracticeFlowLayout from "@/layouts/PracticeFlowLayout";
import QuizPlayer from "@/pages/practice/QuizPlayer";
import UnitTestPlayer from "@/pages/practice/UnitTestPlayer";
import AssignmentPlayer from "@/pages/practice/AssignmentPlayer";
import AssessmentPlayer from "@/pages/practice/AssessmentPlayer";
import PastAssessmentPlayer from "@/pages/practice/PastAssessmentPlayer";
import CourseOverview from "@/pages/student/CourseOverview";
import RmcStudentConsent from "@/pages/student/RmcStudentConsent";
import SubjectDetail from "@/pages/admin/subject-management/subjectDetail";
import UnitDetail from "@/pages/admin/unit-management/unitDetail";
import TopicDetail from "@/pages/admin/topic-management/topicDetail";
import { StudentTeachers } from "@/pages/student/Teachers";
import ClassDetail from "@/pages/admin/class-management/cDetail";
import EditSchoolProfile from "@/pages/school/profile/EditProfile";
import LandingPage from "@/pages/marketing/LandingPage";
import WebLayout from "@/layouts/WebLayout";
import RMC from "@/pages/marketing/RMC";
import VSS from "@/pages/marketing/VSS";
import ILM from "@/pages/marketing/ILM";
import StaffList from "@/pages/admin/staff-management/staffList";
import StaffForm from "@/pages/admin/staff-management/staffForm";
import SchoolRegistration from "@/pages/marketing/SchoolRegistration";
import StudentRegistrationDetail from "@/pages/admin/student-registrations/studentRegistrationDetail";
import SchoolRegistrationDetail from "@/pages/admin/school-registrations/schoolRegistrationDetail";
import SchoolRegistrationList from "@/pages/admin/school-registrations/schoolRegistrationList";
import CertificateVerification from "@/pages/marketing/CertificateVerfication";
import CertificateForm from "@/pages/admin/certificate-management/certificateForm";
import CertificateList from "@/pages/admin/certificate-management/certificateList";
import Signup from "@/pages/auth/Signup";
import VssRegistrations from "@/pages/marketing/VssRegistrations";
import PmcRegistrations from "@/pages/marketing/PmcRegistrations";
import StudentRegistrationForm from "@/pages/admin/student-registrations/studentRegistrationForm";
import StudentSignupList from "@/pages/admin/student-signup/studentSignUpList";
import StudentSignupDetail from "@/pages/admin/student-signup/studentSignUpDetail";
import StudentSignupForm from "@/pages/admin/student-signup/studentSignUpForm";
import AboutUs from "@/pages/marketing/AboutUs";
import PrivacyPolicy from "@/pages/marketing/PrivacyPolicy";
import AppPrivacyPolicy from "@/pages/marketing/AppPrivacyPolicy";
import NewsStoryForm from "@/pages/admin/newsStory-management/newsStoryForm";
import NewsStoryList from "@/pages/admin/newsStory-management/newsStoryList";
import GalleryList from "@/pages/admin/gallery-management/galleryList";
import GalleryForm from "@/pages/admin/gallery-management/galleryForm";
import RMCList from "@/pages/admin/rmc-joiners/rmcList";
import RMCForm from "@/pages/admin/rmc-joiners/rmcForm";
import SchoolRegistrationForm from "@/pages/admin/school-registrations/schoolRegistrationForm";
import CertificateDetail from "@/pages/admin/certificate-management/certificateDetail";
import RmcRegistrations from "@/pages/marketing/RmcRegistrations";
import RMCRegistrationList from "@/pages/admin/rmc-joiners/rmcRegistrationList";
import RMCRegistrationDetail from "@/pages/admin/rmc-joiners/rmcRegistrationDetail";
import TestPage from "@/pages/marketing/TestPage";
import StudentRegistrationListRMC from "@/pages/admin/student-registrations/studentRegistrationListRMC";
import StudentRegistrationListVSS from "@/pages/admin/student-registrations/studentRegistrationListVSS";
import StudentRegistrationListPMC from "@/pages/admin/student-registrations/studentRegistrationPMC";
import ResultPMC from "@/pages/marketing/Result";
import StudentAnalyticsOverview from "@/pages/admin/analytics-management/student-analytic-overview";
import StudentAnalyticsOverviewDetail from "../pages/admin/analytics-management/student-analytic-overview-detail";
import SchoolAnalyticsOverview from "@/pages/admin/analytics-management/school-analytic-overview";
import SchoolAnalyticsOverviewDetail from "@/pages/admin/analytics-management/school-analytic-overview-detail";
import AnalyticsOverview from "@/pages/admin/analytics-management/analytic-overview";
import SubjectUnitsAnalyticsOverview from "@/pages/admin/analytics-management/subject-unit-analytics";
import CitySchoolAnalyticsOverview from "@/pages/admin/analytics-management/city-school-analytics";
import BadgesList from "@/pages/admin/badges-management/badgesList";
import BadgesDetail from "@/pages/admin/badges-management/badgesDetail";
import BadgesForm from "@/pages/admin/badges-management/badgesForm";
import AssessmentQuestionList from "@/pages/admin/assessment-management/assessmentQuestionList";
import AssessmentQuestionForm from "@/pages/admin/assessment-management/assessmentQuestionForm";
import AssessmentQuestionDetail from "@/pages/admin/assessment-management/assessmentQuestionDetail";
import AssessmentList from "@/pages/admin/assessment-management/assessmentList";
import AssessmentForm from "@/pages/admin/assessment-management/assessmentForm";
import AssessmentDetail from "@/pages/admin/assessment-management/assessment-detail";
import AssessmentStudentResult from "@/pages/student/AssessmentResult";
import PMC from "@/pages/marketing/PMC";
import ForgotPassword from "@/pages/auth/Forgot-password";
import PmcSessionList from "@/pages/admin/pmc-sessions/pmcSessionList";
import PmcSessionForm from "@/pages/admin/pmc-sessions/pmcSessionForm";
import RmcSessionForm from "@/pages/admin/rmc-sessions/rmcSessionForm";
import RmcSessionList from "@/pages/admin/rmc-sessions/rmcSessionList";
import CreateAccountSchool from "@/pages/auth/Create-school-account";
import CentralizedStudentList from "@/pages/admin/student-centralized/centralizedStudentList";
import CentralizedStudentForm from "@/pages/admin/student-centralized/centralizedStudentForm";
import CentralizedStudentDetail from "@/pages/admin/student-centralized/centralizedStudentDetail";
import RMCSessionDetail from "@/pages/admin/rmc-sessions/rmcSessionDetail";
import PMCSessionDetail from "@/pages/admin/pmc-sessions/pmcSessionDetail";
import RoleSelection from "@/pages/auth/Role-selection";
import Prizes from "@/pages/marketing/Prizes";
import ProvinceList from "@/pages/admin/location-management/province/provinceList";
import ProvinceForm from "@/pages/admin/location-management/province/provinceForm";
import DistrictList from "@/pages/admin/location-management/district/districtList";
import DistrictForm from "@/pages/admin/location-management/district/districtForm";
import TehsilList from "@/pages/admin/location-management/tehsil/tehsilList";
import TehsilForm from "@/pages/admin/location-management/tehsil/tehsilForm";
import CityList from "@/pages/admin/location-management/city/cityList";
import CityForm from "@/pages/admin/location-management/city/cityForm";
import ClusterList from "@/pages/admin/location-management/cluster-area/clusterList";
import ClusterForm from "@/pages/admin/location-management/cluster-area/clusterForm";
import FacultyPage from "@/pages/marketing/FacultyPage";
import FacultyDetailPage from "@/pages/marketing/FacultyDetailPage";
import UserLists from "@/pages/admin/user-management/usersList";
import RoleList from "@/pages/admin/role-management/roleList";
import RoleForm from "@/pages/admin/role-management/roleForm";
import RoleDetail from "@/pages/admin/role-management/roleDetail";
import { getRoleHomePath, normalizeRole } from "@/utils/adminRbac";
import { getRouteRoleFromPath, rebasePathToRole } from "@/utils/roleRoutes";
import RequestLists from "@/pages/admin/student-requests/requestLists";
import RequestForm from "@/pages/admin/student-requests/requestForm";
import CourseSelection from "@/pages/student/CourseSelection";
import SchoolOverviewDashboard from "@/pages/school/Dashboard";
import OrganizationList from "@/pages/admin/organization-management/organizationList";
import OrganizationForm from "@/pages/admin/organization-management/organizationForm";
import FeedbackList from "@/pages/admin/feedback-management/feedbackList";
import FeedbackDetail from "@/pages/admin/feedback-management/feedbackDetail";
import AllNews from "@/pages/marketing/AllNews";
import NewsPage from "@/pages/marketing/NewsPage";
import FacultyList from "@/pages/admin/faculty-management/FacultyList";
import FacultyForm from "@/pages/admin/faculty-management/FacultyForm";
import VideoLibrary from "@/pages/student/VideoLibrary";
import SliderList from "@/pages/admin/slider-management/sliderList";
import SliderForm from "@/pages/admin/slider-management/sliderForm";
import TranslatorDashboard from "@/pages/translator/Dashboard";
import ReviewerDashboard from "@/pages/reviewer/Dashboard";
import AppNotifications from "@/pages/admin/app-notifications/AppNotifications";
import AppNotificationsList from "@/pages/admin/app-notifications/AppNotificationsList";
import AppNotificationBatchDetail from "@/pages/admin/app-notifications/AppNotificationBatchDetail";
import EventCalendarList from "@/pages/admin/calendar-event-management/EventCalendarList";
import CalendarEventForm from "@/pages/admin/calendar-event-management/CalendarEventForm";

const RoleRedirect = () => {
  const {
    accessRole,
    isAuthenticated,
    navigation,
    permissionMatrix,
    permissions,
    role,
    user,
  } = useAuthStore();
  const resolvedRole = normalizeRole(role ?? user?.role);
  const authState = {
    accessRole,
    navigation,
    permissionMatrix,
    permissions,
    role: resolvedRole,
    user,
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHomePath(authState)} replace />;
};

const AdminIndexRedirect = () => {
  const { accessRole, navigation, permissionMatrix, permissions, role, user } =
    useAuthStore();

  return (
    <Navigate
      to={
        getRoleHomePath({
          accessRole,
          navigation,
          permissionMatrix,
          permissions,
          role: normalizeRole(role ?? user?.role),
          user,
        }) ||
        rebasePathToRole(
          "/admin/dashboard",
          normalizeRole(role ?? user?.role) || "admin",
        )
      }
      replace
    />
  );
};

const PracticeEntry = () => {
  const { type } = useParams();
  if (type === "assignment") return <AssignmentPlayer />;
  if (type === "quiz") return <QuizPlayer />;
  if (type === "unit") return <UnitTestPlayer />;
  if (type === "assessment") return <AssessmentPlayer />;
  return <PracticeStarter />;
};

const PracticePlayEntry = () => {
  const { type, topicId } = useParams();
  if (type === "assignment")
    return (
      <Navigate
        to={`/student/practice/assignment/${topicId}/starter`}
        replace
      />
    );
  if (type === "quiz")
    return (
      <Navigate to={`/student/practice/quiz/${topicId}/starter`} replace />
    );
  if (type === "unit")
    return (
      <Navigate to={`/student/practice/unit/${topicId}/starter`} replace />
    );
  if (type === "assessment")
    return (
      <Navigate
        to={`/student/practice/assessment/${topicId}/starter`}
        replace
      />
    );
  return <PracticeStarter />;
};

const ChallengeEntry = () => {
  const { type } = useParams();
  if (type === "assignment") return <AssignmentPlayer />;
  if (type === "quiz") return <QuizPlayer />;
  if (type === "unit") return <UnitTestPlayer />;
  if (type === "assessment") return <AssessmentPlayer />;
  return <ChallengeStarter />;
};

const ChallengePlayEntry = () => {
  const { type, topicId } = useParams();
  if (type === "assignment")
    return (
      <Navigate
        to={`/student/challenge/assignment/${topicId}/starter`}
        replace
      />
    );
  if (type === "quiz")
    return (
      <Navigate to={`/student/challenge/quiz/${topicId}/starter`} replace />
    );
  if (type === "unit")
    return (
      <Navigate to={`/student/challenge/unit/${topicId}/starter`} replace />
    );
  if (type === "assessment")
    return (
      <Navigate
        to={`/student/challenge/assessment/${topicId}/starter`}
        replace
      />
    );
  return <ChallengeStarter />;
};

const PastAssessmentPlayEntry = () => {
  const { topicId, id } = useParams();
  const resolvedId = topicId ?? id;
  return (
    <Navigate to={`/student/assessment/past/${resolvedId}/starter`} replace />
  );
};

const RedirectToAddNewStudent = () => {
  const { id } = useParams();
  const location = useLocation();
  const routeRole = getRouteRoleFromPath(location.pathname) ?? "admin";

  return (
    <Navigate
      to={rebasePathToRole(`/admin/add-new-student/${id}`, routeRole)}
      replace
    />
  );
};

const CustomRoleDashboard = () => {
  const { accessRole, user } = useAuthStore();
  const roleLabel =
    accessRole?.label ?? user?.access_role?.label ?? user?.role ?? "Staff";

  return <Dashboard roleLabel={roleLabel} />;
};

const SHARED_ROLE_ROUTE_DEFINITIONS = [
  { path: "school-lists", element: <SchoolList /> },
  { path: "add-new-school/:id?", element: <SchoolForm /> },
  { path: "view-school-detail/:id?", element: <SchoolDetail /> },
  { path: "class-lists", element: <ClassList /> },
  { path: "add-new-class/:id?", element: <ClassForm /> },
  { path: "view-class-detail/:id?", element: <ClassDetail /> },
  { path: "teacher-lists", element: <TeacherList /> },
  { path: "add-new-teacher/:id?", element: <TeacherForm /> },
  { path: "view-teacher-detail/:id?", element: <TeacherDetail /> },
  { path: "student-lists", element: <StudentList /> },
  { path: "add-new-student/:id?", element: <StudentForm /> },
  { path: "view-student-detail/:id?", element: <StudentDetail /> },
  {
    path: "centralized-student-lists",
    element: <CentralizedStudentList />,
  },
  {
    path: "centralized-student-form/:id?",
    element: <CentralizedStudentForm />,
  },
  {
    path: "view-centralized-student-detail/:id?",
    element: <CentralizedStudentDetail />,
  },
  { path: "user-lists", element: <UserLists /> },
  { path: "role-lists", element: <RoleList /> },
  { path: "add-new-role-form/:id?", element: <RoleForm /> },
  { path: "view-role-detail/:id?", element: <RoleDetail /> },
  { path: "province-lists", element: <ProvinceList /> },
  { path: "add-new-province/:id?", element: <ProvinceForm /> },
  { path: "district-lists", element: <DistrictList /> },
  { path: "add-new-district/:id?", element: <DistrictForm /> },
  { path: "tehsil-lists", element: <TehsilList /> },
  { path: "add-new-tehsil/:id?", element: <TehsilForm /> },
  { path: "city-lists", element: <CityList /> },
  { path: "add-new-city/:id?", element: <CityForm /> },
  { path: "cluster-area-lists", element: <ClusterList /> },
  { path: "add-new-cluster-area/:id?", element: <ClusterForm /> },
  { path: "subject-lists", element: <SubjectList /> },
  { path: "add-new-subject/:id?", element: <SubjectForm /> },
  { path: "view-subject-detail/:id?", element: <SubjectDetail /> },
  { path: "staff-lists", element: <StaffList /> },
  { path: "add-new-staff/:id?", element: <StaffForm /> },
  { path: "certificate-lists", element: <CertificateList /> },
  { path: "add-new-certificate/:id?", element: <CertificateForm /> },
  { path: "view-certificate-detail/:id?", element: <CertificateDetail /> },
  { path: "rmc-participation-lists", element: <RMCList /> },
  { path: "view-rmc-detail/:id?", element: <RMCRegistrationDetail /> },
  { path: "unit-lists", element: <UnitList /> },
  { path: "add-new-unit/:id?", element: <UnitForm /> },
  { path: "view-unit-detail/:id?", element: <UnitDetail /> },
  { path: "topic-lists", element: <TopicList /> },
  { path: "add-new-topic/:id?", element: <TopicForm /> },
  { path: "view-topic-detail/:id?", element: <TopicDetail /> },
  { path: "question-lists", element: <QuestionList /> },
  { path: "add-new-question/:id?", element: <QuestionForm /> },
  { path: "view-question-detail/:id?", element: <QuestionDetail /> },
  {
    path: "assessment-question-lists",
    element: <AssessmentQuestionList />,
  },
  {
    path: "add-new-assessment-question/:id?",
    element: <AssessmentQuestionForm />,
  },
  {
    path: "view-assessment-question-detail/:id?",
    element: <AssessmentQuestionDetail />,
  },
  { path: "assessment-lists", element: <AssessmentList /> },
  { path: "add-new-assessment/:id?", element: <AssessmentForm /> },
  { path: "view-assessment-detail/:id?", element: <AssessmentDetail /> },
  { path: "quiz-lists", element: <QuizList /> },
  { path: "add-new-quiz/:id?", element: <QuizForm /> },
  { path: "unit-test-lists", element: <UnitTestList /> },
  { path: "add-new-unitTest/:id?", element: <UnitTestForm /> },
  {
    path: "student-registrations-rmc",
    element: <StudentRegistrationListRMC />,
  },
  {
    path: "student-registrations-vss",
    element: <StudentRegistrationListVSS />,
  },
  {
    path: "student-registrations-pmc",
    element: <StudentRegistrationListPMC />,
  },
  {
    path: "student-registration-detail/:id?",
    element: <StudentRegistrationDetail />,
  },
  {
    path: "student-registration-form/:id?",
    element: <StudentRegistrationForm />,
  },
  { path: "student-signup-lists", element: <StudentSignupList /> },
  { path: "student-signup-detail/:id?", element: <StudentSignupDetail /> },
  { path: "student-signup-form/:id", element: <RedirectToAddNewStudent /> },
  { path: "student-signup-form/", element: <StudentSignupForm /> },
  {
    path: "school-registrations-lists",
    element: <SchoolRegistrationList />,
  },
  {
    path: "school-registration-detail/:id?",
    element: <SchoolRegistrationDetail />,
  },
  {
    path: "school-registration-form/:id?",
    element: <SchoolRegistrationForm />,
  },
  { path: "pmc-sessions-lists", element: <PmcSessionList /> },
  { path: "pmc-session-form/:id?", element: <PmcSessionForm /> },
  {
    path: "view-pmc-session-detail/:id?",
    element: <PMCSessionDetail />,
  },
  { path: "rmc-sessions-lists", element: <RmcSessionList /> },
  { path: "rmc-session-form/:id?", element: <RmcSessionForm /> },
  {
    path: "view-rmc-session-detail/:id?",
    element: <RMCSessionDetail />,
  },
  { path: "news-story-lists", element: <NewsStoryList /> },
  { path: "add-new-news-story/:id?", element: <NewsStoryForm /> },
  { path: "gallery-lists", element: <GalleryList /> },
  { path: "add-new-gallery/:id?", element: <GalleryForm /> },
  { path: "faculty-lists", element: <FacultyList /> },
  { path: "add-new-faclty/:id?", element: <FacultyForm /> },
  { path: "analytics-overview", element: <AnalyticsOverview /> },
  {
    path: "student-analytics-overview",
    element: <StudentAnalyticsOverview />,
  },
  {
    path: "student-analytics-overview-detail/:id?",
    element: <StudentAnalyticsOverviewDetail />,
  },
  {
    path: "school-analytics-overview",
    element: <SchoolAnalyticsOverview />,
  },
  {
    path: "school-analytics-overview-detail/:id?",
    element: <SchoolAnalyticsOverviewDetail />,
  },
  {
    path: "subject-units-analytics-overview",
    element: <SubjectUnitsAnalyticsOverview />,
  },
  {
    path: "city-school-analytics-overview",
    element: <CitySchoolAnalyticsOverview />,
  },
  { path: "badges-lists", element: <BadgesList /> },
  { path: "badges-detail/:id?", element: <BadgesDetail /> },
  { path: "badges-form/:id?", element: <BadgesForm /> },
  { path: "student-requests", element: <RequestLists /> },
  { path: "student-requests/:id?", element: <RequestForm /> },
  { path: "organizations-lists", element: <OrganizationList /> },
  { path: "add-new-organization/:id?", element: <OrganizationForm /> },
];

const renderSharedRoleRoutes = (excludePaths = []) => {
  const excludedPaths = new Set(excludePaths);
  return SHARED_ROLE_ROUTE_DEFINITIONS.filter(
    ({ path }) => !excludedPaths.has(path),
  ).map(({ path, element }) => (
    <Route key={path} path={path} element={element} />
  ));
};

const AppRoutes = () => {
  return (
    <BrowserRouter basename={`${import.meta.env.VITE_BASE_NAME}`}>
      <ScrollToTop />
      <AnnouncementModal />
      <Routes>
        <Route path="/" element={<WebLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="/rmc" element={<RMC />} />
          <Route
            path="/rmc-school-registration"
            element={<SchoolRegistration />}
          />
          {/* <Route
            path="/rmc-student-registration"
            element={<RmcRegistrations />}
          />
          <Route
            path="/vss-student-registration"
            element={<VssRegistrations />}
          />
          <Route
            path="/pmc5-student-registration"
            element={<PmcRegistrations />}
          /> */}
          <Route path="/pmc" element={<PMC />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/faculty/:id" element={<FacultyDetailPage />} />
          <Route path="/newspage/:slug" element={<NewsPage />} />
          <Route path="/all-news" element={<AllNews />} />
          <Route path="/prizes" element={<Prizes />} />
          <Route path="/vss" element={<VSS />} />
          <Route path="/ilm" element={<ILM />} />
          <Route path="about-us" element={<AboutUs />} />
          <Route path="/pkm-privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/ilm-privacy-policy" element={<AppPrivacyPolicy />} />
          <Route path="/certificate" element={<CertificateVerification />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/pmc-results" element={<ResultPMC />} />
        </Route>

        <Route
          path="/data-entry"
          element={
            <ProtectedRoute allowedRoles={["data_entry"]}>
              <MainLayout role="data_entry" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndexRedirect />} />
          <Route path="dashboard" element={<DataEntryDashboard />} />
          <Route
            path="question-lists"
            element={<QuestionList variant="data_entry" />}
          />
          <Route path="add-new-question/:id?" element={<QuestionForm />} />
          <Route
            path="view-question-detail/:id?"
            element={<QuestionDetail />}
          />
          {renderSharedRoleRoutes([
            "question-lists",
            "add-new-question/:id?",
            "view-question-detail/:id?",
          ])}
        </Route>

        <Route
          path="/reviewer"
          element={
            <ProtectedRoute allowedRoles={["reviewer"]}>
              <MainLayout role="reviewer" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndexRedirect />} />
          <Route
            path="dashboard"
            element={<ReviewerDashboard roleLabel="Reviewer" />}
          />
          <Route
            path="question-lists"
            element={<QuestionList variant="reviewer" />}
          />
          <Route
            path="view-question-detail/:id?"
            element={<QuestionDetail />}
          />
          {renderSharedRoleRoutes([
            "question-lists",
            "view-question-detail/:id?",
          ])}
        </Route>
        <Route
          path="/translator"
          element={
            <ProtectedRoute allowedRoles={["translator"]}>
              <MainLayout role="translator" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndexRedirect />} />
          <Route
            path="dashboard"
            element={<TranslatorDashboard roleLabel="Translator" />}
          />
          <Route
            path="question-lists"
            element={<QuestionList variant="translator" />}
          />
          <Route
            path="view-question-detail/:id?"
            element={<QuestionDetail />}
          />
          {renderSharedRoleRoutes([
            "question-lists",
            "view-question-detail/:id?",
          ])}
        </Route>
        <Route path="/app" element={<RoleRedirect />} />

        <Route
          path="/login"
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          }
        ></Route>
        <Route
          path="/signup-student"
          element={
            <AuthLayout>
              <Signup />
            </AuthLayout>
          }
        ></Route>
        <Route
          path="/signup"
          element={
            <AuthLayout>
              <RoleSelection />
            </AuthLayout>
          }
        ></Route>
        <Route
          path="/forgot-password"
          element={
            <AuthLayout>
              <ForgotPassword />
            </AuthLayout>
          }
        ></Route>
        <Route
          path="/signup-school"
          element={
            <AuthLayout>
              <CreateAccountSchool />
            </AuthLayout>
          }
        ></Route>
        <Route
          path="/auth/create-school-account"
          element={
            <AuthLayout>
              <CreateAccountSchool />
            </AuthLayout>
          }
        ></Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MainLayout role="admin" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndexRedirect />} />
          <Route path="dashboard" element={<Dashboard />}></Route>

          {/* school management routes */}
          <Route path="school-lists" element={<SchoolList />}></Route>
          <Route path="add-new-school/:id?" element={<SchoolForm />}></Route>
          <Route
            path="view-school-detail/:id?"
            element={<SchoolDetail />}
          ></Route>

          {/* class Management routes */}
          <Route path="class-lists" element={<ClassList />}></Route>
          <Route path="add-new-class/:id?" element={<ClassForm />}></Route>

          {/* teacher Management routes */}
          <Route path="teacher-lists" element={<TeacherList />}></Route>
          <Route path="add-new-teacher/:id?" element={<TeacherForm />}></Route>
          <Route
            path="view-teacher-detail/:id?"
            element={<TeacherDetail />}
          ></Route>

          {/* student Management routes */}
          <Route path="student-lists" element={<StudentList />}></Route>
          <Route path="add-new-student/:id?" element={<StudentForm />}></Route>
          <Route
            path="view-student-detail/:id?"
            element={<StudentDetail />}
          ></Route>

          {/* centralized student Management routes */}
          <Route
            path="centralized-student-lists"
            element={<CentralizedStudentList />}
          ></Route>
          <Route
            path="centralized-student-form/:id?"
            element={<CentralizedStudentForm />}
          ></Route>
          <Route
            path="view-centralized-student-detail/:id?"
            element={<CentralizedStudentDetail />}
          ></Route>

          {/* user Management routes */}
          <Route path="user-lists" element={<UserLists />}></Route>

          {/* role Management routes */}
          <Route path="role-lists" element={<RoleList />}></Route>
          <Route path="add-new-role-form/:id?" element={<RoleForm />}></Route>
          <Route path="view-role-detail/:id?" element={<RoleDetail />}></Route>

          {/* Location Management routes */}
          {/* province */}
          <Route path="province-lists" element={<ProvinceList />}></Route>
          <Route
            path="add-new-province/:id?"
            element={<ProvinceForm />}
          ></Route>
          {/* district */}
          <Route path="district-lists" element={<DistrictList />}></Route>
          <Route
            path="add-new-district/:id?"
            element={<DistrictForm />}
          ></Route>
          {/* tehsil */}
          <Route path="tehsil-lists" element={<TehsilList />}></Route>
          <Route path="add-new-tehsil/:id?" element={<TehsilForm />}></Route>
          {/* city */}
          <Route path="city-lists" element={<CityList />}></Route>
          <Route path="add-new-city/:id?" element={<CityForm />}></Route>
          {/* cluster area */}
          <Route path="cluster-area-lists" element={<ClusterList />}></Route>
          <Route
            path="add-new-cluster-area/:id?"
            element={<ClusterForm />}
          ></Route>

          {/* subject Management routes */}
          <Route path="subject-lists" element={<SubjectList />}></Route>
          <Route path="add-new-subject/:id?" element={<SubjectForm />}></Route>
          <Route
            path="view-subject-detail/:id?"
            element={<SubjectDetail />}
          ></Route>

          {/* staff Management routes */}
          <Route path="staff-lists" element={<StaffList />}></Route>
          <Route path="add-new-staff/:id?" element={<StaffForm />}></Route>

          {/* certificate management routes */}
          <Route path="certificate-lists" element={<CertificateList />}></Route>
          <Route
            path="add-new-certificate/:id?"
            element={<CertificateForm />}
          ></Route>
          <Route
            path="view-certificate-detail/:id?"
            element={<CertificateDetail />}
          ></Route>

          {/* feedback management routes */}
          <Route
            path="feedback-survey-lists"
            element={<FeedbackList />}
          ></Route>
          <Route
            path="view-feedback-detail/:id?"
            element={<FeedbackDetail />}
          ></Route>

          {/* rmc contest management routes */}
          <Route path="rmc-participation-lists" element={<RMCList />}></Route>
          <Route
            path="view-rmc-detail/:id?"
            element={<RMCRegistrationDetail />}
          ></Route>

          {/* unit Management routes */}
          <Route path="unit-lists" element={<UnitList />}></Route>
          <Route path="add-new-unit/:id?" element={<UnitForm />}></Route>
          <Route path="view-unit-detail/:id?" element={<UnitDetail />}></Route>

          {/* topic Management routes */}
          <Route path="topic-lists" element={<TopicList />}></Route>
          <Route path="add-new-topic/:id?" element={<TopicForm />}></Route>
          <Route
            path="view-topic-detail/:id?"
            element={<TopicDetail />}
          ></Route>

          {/* question Management routes */}
          <Route path="question-lists" element={<QuestionList />}></Route>
          <Route
            path="add-new-question/:id?"
            element={<QuestionForm />}
          ></Route>
          <Route
            path="view-question-detail/:id?"
            element={<QuestionDetail />}
          />

          {/* assessment Management routes */}
          <Route
            path="assessment-question-lists"
            element={<AssessmentQuestionList />}
          ></Route>
          <Route
            path="add-new-assessment-question/:id?"
            element={<AssessmentQuestionForm />}
          ></Route>
          <Route
            path="view-assessment-question-detail/:id?"
            element={<AssessmentQuestionDetail />}
          />
          <Route path="assessment-lists" element={<AssessmentList />}></Route>
          <Route
            path="add-new-assessment/:id?"
            element={<AssessmentForm />}
          ></Route>
          <Route
            path="view-assessment-detail/:id?"
            element={<AssessmentDetail />}
          />

          {/* quiz Management routes */}
          <Route path="quiz-lists" element={<QuizList />}></Route>
          <Route path="add-new-quiz/:id?" element={<QuizForm />}></Route>

          {/* student Management routes */}
          <Route path="unit-test-lists" element={<UnitTestList />}></Route>
          <Route
            path="add-new-unitTest/:id?"
            element={<UnitTestForm />}
          ></Route>

          {/* profile routes */}
          <Route path="edit-profile" element={<EditProfile />}></Route>

          {/* student registration routes */}
          <Route
            path="student-registrations-rmc"
            element={<StudentRegistrationListRMC />}
          ></Route>
          <Route
            path="student-registrations-vss"
            element={<StudentRegistrationListVSS />}
          ></Route>
          <Route
            path="student-registrations-pmc"
            element={<StudentRegistrationListPMC />}
          ></Route>
          <Route
            path="student-registration-detail/:id?"
            element={<StudentRegistrationDetail />}
          ></Route>
          <Route
            path="student-registration-form/:id?"
            element={<StudentRegistrationForm />}
          ></Route>

          {/* student signup routes */}
          <Route
            path="student-signup-lists"
            element={<StudentSignupList />}
          ></Route>
          <Route
            path="student-signup-detail/:id?"
            element={<StudentSignupDetail />}
          ></Route>

          {/* Redirect student-signup-form/:id to add-new-student for editing */}
          <Route
            path="student-signup-form/:id"
            element={<RedirectToAddNewStudent />}
          ></Route>

          {/* New student signup form (without ID) */}
          <Route
            path="student-signup-form/"
            element={<StudentSignupForm />}
          ></Route>

          {/* school registration routes */}
          <Route
            path="school-registrations-lists"
            element={<SchoolRegistrationList />}
          ></Route>
          <Route
            path="school-registration-detail/:id?"
            element={<SchoolRegistrationDetail />}
          ></Route>
          <Route
            path="school-registration-form/:id?"
            element={<SchoolRegistrationForm />}
          ></Route>

          {/* pmc sessions routes */}
          <Route path="pmc-sessions-lists" element={<PmcSessionList />}></Route>
          <Route
            path="pmc-session-form/:id?"
            element={<PmcSessionForm />}
          ></Route>
          <Route
            path="view-pmc-session-detail/:id?"
            element={<PMCSessionDetail />}
          ></Route>

          {/* rmc sessions routes */}
          <Route path="rmc-sessions-lists" element={<RmcSessionList />}></Route>
          <Route
            path="rmc-session-form/:id?"
            element={<RmcSessionForm />}
          ></Route>
          <Route
            path="view-rmc-session-detail/:id?"
            element={<RMCSessionDetail />}
          ></Route>

          {/* News & Story Management routes */}
          <Route path="news-story-lists" element={<NewsStoryList />}></Route>
          <Route
            path="add-new-news-story/:id?"
            element={<NewsStoryForm />}
          ></Route>

          {/* slider Management routes */}
          <Route path="sliders" element={<SliderList />}></Route>
          <Route
            path="add-new-slider/:pageType?"
            element={<SliderForm />}
          ></Route>

          {/* Gallery Management routes */}
          <Route path="gallery-lists" element={<GalleryList />}></Route>
          <Route path="add-new-gallery/:id?" element={<GalleryForm />}></Route>

          {/* Analytics routes */}
          <Route
            path="analytics-overview"
            element={<AnalyticsOverview />}
          ></Route>
          <Route
            path="student-analytics-overview"
            element={<StudentAnalyticsOverview />}
          ></Route>
          <Route
            path="student-analytics-overview-detail/:id?"
            element={<StudentAnalyticsOverviewDetail />}
          ></Route>
          <Route
            path="school-analytics-overview"
            element={<SchoolAnalyticsOverview />}
          ></Route>
          <Route
            path="school-analytics-overview-detail/:id?"
            element={<SchoolAnalyticsOverviewDetail />}
          ></Route>
          <Route
            path="subject-units-analytics-overview"
            element={<SubjectUnitsAnalyticsOverview />}
          ></Route>
          <Route
            path="city-school-analytics-overview"
            element={<CitySchoolAnalyticsOverview />}
          ></Route>

          {/* badges routes */}
          <Route path="badges-lists" element={<BadgesList />}></Route>
          <Route path="badges-detail/:id?" element={<BadgesDetail />}></Route>
          <Route path="badges-form/:id?" element={<BadgesForm />}></Route>

          {/* App Notifications Routes */}
          <Route path="app-notifications" element={<AppNotificationsList />} />
          <Route path="send-app-notifications" element={<AppNotifications />} />
          <Route
            path="/admin/app-notifications/batches/:batchId"
            element={<AppNotificationBatchDetail />}
          />

          {/* Calendar Events Management Routes */}
          <Route path="calendar" element={<EventCalendarList />} />
          <Route path="add-new-event" element={<CalendarEventForm />} />
          <Route path="add-new-event/:id" element={<CalendarEventForm />} />
        </Route>

        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={["staff"]}>
              <MainLayout role="staff" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndexRedirect />} />
          <Route path="dashboard" element={<Dashboard roleLabel="Staff" />} />
          <Route path="edit-profile" element={<EditProfile />} />
          {renderSharedRoleRoutes()}
        </Route>

        <Route
          path="/school"
          element={
            <ProtectedRoute allowedRoles={["school"]}>
              <MainLayout role="school" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndexRedirect />} />
          <Route path="dashboard" element={<SchoolOverviewDashboard />} />
          <Route path="class-lists" element={<ClassList />} />
          <Route path="add-new-class/:id?" element={<ClassForm />} />
          <Route path="view-class-detail/:id?" element={<ClassDetail />} />
          <Route path="teacher-lists" element={<TeacherList />} />
          <Route path="add-new-teacher/:id?" element={<TeacherForm />} />
          <Route path="view-teacher-detail/:id?" element={<TeacherDetail />} />
          <Route path="student-lists" element={<StudentList />} />
          <Route path="add-new-student/:id?" element={<StudentForm />} />
          <Route path="view-student-detail/:id?" element={<StudentDetail />} />
          <Route path="edit-profile" element={<EditSchoolProfile />} />
          {renderSharedRoleRoutes([
            "class-lists",
            "add-new-class/:id?",
            "view-class-detail/:id?",
            "teacher-lists",
            "add-new-teacher/:id?",
            "view-teacher-detail/:id?",
            "student-lists",
            "add-new-student/:id?",
            "view-student-detail/:id?",
          ])}
        </Route>

        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <MainLayout role="teacher" />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndexRedirect />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="edit-profile" element={<EditTeacherProfile />} />
          {/* Mastery Goals routes */}
          <Route path="assign-mastery" element={<AssignMastery />} />
          <Route path="mastery-progress" element={<MasteryProgress />} />
          <Route
            path="mastery-assignments-list"
            element={<MasteryAssignmentLists />}
          />

          {/* Assignments routes */}
          <Route path="assign-assignment" element={<AssignAssignment />} />
          <Route path="manage-assignment" element={<ManageAssignment />} />
          <Route path="assignment-scores" element={<AssignmentScore />} />
          {renderSharedRoleRoutes()}
        </Route>

        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <MainLayout role="student" />
            </ProtectedRoute>
          }
        >
          <Route element={<StudentContestGate />}>
            <Route index element={<Navigate to="contest" replace />} />
            <Route element={<StudentPortalLayout />}>
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="contest" element={<StudentContestPage />} />
              <Route path="progress" element={<StudentProgress />} />
              <Route path="edit-profile" element={<StudentProfile />} />
              <Route path="learning-materials" element={<VideoLibrary />} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="profile/edit" element={<StudentProfile />} />
              <Route path="teachers" element={<StudentTeachers />} />
              <Route path="course-selection" element={<CourseSelection />} />
              <Route
                path="rmc-student-consent"
                element={<RmcStudentConsent />}
              />
              <Route
                path="assessment-student-results"
                element={<AssessmentStudentResult />}
              />
              <Route
                path="assessment-student-results/past"
                element={<AssessmentStudentResult />}
              />
              <Route
                path="assessmentResult"
                element={<AssessmentStudentResult />}
              />
              <Route
                path="assessmentResult/past"
                element={<AssessmentStudentResult />}
              />
              <Route
                path="AssessmentResult"
                element={<AssessmentStudentResult />}
              />
              <Route
                path="AssessmentResult/past"
                element={<AssessmentStudentResult />}
              />
              <Route
                path="assessment"
                element={<Navigate to="/student/assessmentResult" replace />}
              />
              <Route
                path="assessment/past"
                element={
                  <Navigate to="/student/assessmentResult/past" replace />
                }
              />
            </Route>
            <Route element={<PracticeFlowLayout />}>
              <Route
                path="assessment/past/:topicId/starter"
                element={<PastAssessmentPlayer />}
              />
              <Route
                path="assessment/past/:topicId/play"
                element={<PastAssessmentPlayEntry />}
              />
              <Route
                path="practice/:type/:topicId/starter"
                element={<PracticeEntry />}
              />
              <Route
                path="practice/:type/:topicId/play"
                element={<PracticePlayEntry />}
              />
              <Route
                path="practice/unit/:unitId"
                element={<StudentPractice />}
              />
              <Route
                path="practice/course-overview/:subjectId"
                element={<CourseOverview />}
              />
              <Route path="practice" element={<StudentPractice />} />

              <Route
                path="challenge/:type/:topicId/starter"
                element={<ChallengeEntry />}
              />
              <Route
                path="challenge/assessment/:topicId/starter/past"
                element={<PastAssessmentPlayer />}
              />
              <Route
                path="challenge/:type/:topicId/play"
                element={<ChallengePlayEntry />}
              />
              <Route
                path="challenge/assessment/:topicId/play/past"
                element={<PastAssessmentPlayEntry />}
              />
              <Route
                path="challenge/unit/:unitId"
                element={<StudentPractice />}
              />
              <Route
                path="challenge/course-overview/:subjectId"
                element={<CourseOverview />}
              />
              <Route path="challenge" element={<StudentPractice />} />
            </Route>
          </Route>
        </Route>

        <Route
          path="/:roleSlug"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndexRedirect />} />
          <Route path="dashboard" element={<CustomRoleDashboard />} />
          <Route path="edit-profile" element={<EditProfile />} />
          {renderSharedRoleRoutes()}
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
