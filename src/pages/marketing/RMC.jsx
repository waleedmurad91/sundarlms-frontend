import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Calendar,
  MapPin,
  BookOpen,
  Target,
  ArrowRight,
  CheckCircle,
  Trophy,
  Medal,
  Award,
  School,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import "../marketing/RMC.css";
import NewsSidebar from "@/components/shared/NewsSidebar";
import PageHeroSlider from "@/components/marketing/PageHeroSlider";
import { getNewsByCategory } from "@/api/newsApi";
import { mapNewsSidebarItem } from "@/data/newsData";
import PhotoGallery from "@/components/shared/PhotoGallery";
import { getRMCScoreOverview } from "@/api/leaderboardApi";
import { getRMCActiveSession } from "@/api/authApi";
import toast from "react-hot-toast";
import downloadIcon from "@/assets/downloadiconRMC.png";
import target from "@/assets/target.png";
import mapicon from "@/assets/map-icon-rmc.png";
import formatIcon from "@/assets/format-icon.png";
import userIcon from "@/assets/user-icon.png";
import schoolIcon from "@/assets/school-icon-gray.png";
import scheduleIcon from "@/assets/schedule-icon.png";
import hostingIcon from "@/assets/hosting-icon.png";
import targetIcon from "@/assets/target-icon.png";
import reviewIcon from "@/assets/reviewIcon.png";

const parseSessionDate = (value, endOfDay = false) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T${endOfDay ? "23:59:59" : "00:00:00"}`
    : raw;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const isSessionRegisterable = (session, nowTimestamp = Date.now()) => {
  const isActive = Boolean(session?.is_active ?? session?.isActive);
  if (!isActive) return false;

  const registrationClosingTimestamp = parseSessionDate(
    session?.registration_closing_date ?? session?.registrationClosingDate,
    true,
  );
  const contestTimestamp = parseSessionDate(
    session?.contest_date ?? session?.contestDate,
    true,
  );

  const registrationNotFinished =
    registrationClosingTimestamp !== null &&
    registrationClosingTimestamp >= nowTimestamp;
  const contestNotPassed =
    contestTimestamp !== null && contestTimestamp >= nowTimestamp;

  if (registrationClosingTimestamp === null && contestTimestamp === null) {
    return true;
  }

  return registrationNotFinished || contestNotPassed;
};

const RMC = () => {
  const [news, setNews] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [expandedVenues, setExpandedVenues] = useState({});
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState("");

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await getNewsByCategory("RMC");
        const mappedNews = response.data.data.map(mapNewsSidebarItem);
        setNews(mappedNews);
      } catch (error) {
        console.error("Failed to fetch RMC news:", error);
        setNews([]);
      }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      try {
        const response = await getRMCScoreOverview();
        const resolved =
          response?.data ?? response?.data?.data ?? response ?? null;
        if (isMounted) {
          setLeaderboardData(resolved);
        }
      } catch (error) {
        console.error("Failed to fetch RMC leaderboard:", error);
        if (isMounted) {
          setLeaderboardData(null);
        }
      } finally {
        if (isMounted) {
          setLeaderboardLoading(false);
        }
      }
    };

    fetchLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      setCheckingStatus(true);
      setRegistrationMessage("");
      try {
        const res = await getRMCActiveSession();
        const sessions = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        const hasRegisterableSession = sessions.some((session) =>
          isSessionRegisterable(session),
        );

        if (mounted) {
          setRegistrationOpen(hasRegisterableSession);
          setRegistrationMessage(
            hasRegisterableSession
              ? ""
              : sessions.length === 0
                ? "No active RMC session is available right now."
                : "RMC registration is currently closed for available sessions.",
          );
        }
      } catch (err) {
        if (!mounted) return;
        const message = err?.message || "Unable to check active RMC sessions.";
        setRegistrationOpen(false);
        setRegistrationMessage(message);
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

  const isRegistrationDisabled = checkingStatus || !registrationOpen;
  const registrationDisabledClassName =
    "cursor-not-allowed opacity-60 pointer-events-none";
  const handleRegistrationClick = (event) => {
    if (!isRegistrationDisabled) {
      return;
    }

    event.preventDefault();
    if (!checkingStatus) {
      toast.error("Student registrations are currently closed.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const testDate = leaderboardData?.test_date;
  const threshold = leaderboardData?.threshold ?? {};
  const minScore = threshold?.min_score;
  const totalMarks = threshold?.total_marks;
  const minPercentage = threshold?.min_percentage;
  const minScoreDisplay =
    minScore !== undefined && minScore !== null
      ? totalMarks !== undefined && totalMarks !== null
        ? `${minScore}/${totalMarks}`
        : String(minScore)
      : null;
  const minPercentageDisplay =
    minPercentage !== undefined && minPercentage !== null
      ? `${minPercentage}%`
      : null;
  const scoreHighlightText =
    minPercentageDisplay && minScoreDisplay
      ? `${minPercentageDisplay}+ (${minScoreDisplay} or higher)`
      : "60%+ (9/15 or higher)";

  const topPositions = React.useMemo(() => {
    const topPositionsRaw = Array.isArray(
      leaderboardData?.top_positions_from_each_venue,
    )
      ? leaderboardData.top_positions_from_each_venue
      : [];
    const normalized = topPositionsRaw.map((venue) => ({
      venue,
      count: Array.isArray(venue?.toppers) ? venue.toppers.length : 0,
    }));
    const singles = normalized.filter((entry) => entry.count <= 1);
    const multiples = normalized.filter((entry) => entry.count > 1);
    return [...singles, ...multiples].map((entry) => entry.venue);
  }, [leaderboardData?.top_positions_from_each_venue]);
  const topSchoolsByVenue = Array.isArray(leaderboardData?.top_schools_by_venue)
    ? leaderboardData.top_schools_by_venue
    : [];
  const thankYouSection = leaderboardData?.thank_you_section ?? {};
  const hostSchools = Array.isArray(thankYouSection?.host_schools)
    ? thankYouSection.host_schools
    : [];
  const outstandingByVenue = Array.isArray(
    leaderboardData?.outstanding_students_by_venue,
  )
    ? leaderboardData.outstanding_students_by_venue
    : [];

  const formatScoreDisplay = (entry) => {
    const display =
      entry?.score_display ??
      (entry?.score !== undefined && entry?.score !== null && totalMarks
        ? `${entry.score}/${totalMarks}`
        : entry?.score);
    return display ? String(display) : "-";
  };

  const toggleVenueExpanded = (venueKey) => {
    setExpandedVenues((prev) => ({
      ...prev,
      [venueKey]: !prev[venueKey],
    }));
  };

  const formatPercentDisplay = (entry) => {
    if (entry?.percentage === undefined || entry?.percentage === null) {
      return "";
    }
    return `${entry.percentage}%`;
  };

  const renderStudentRow = (student, index) => {
    // const highlight = student?.is_blue === true;
    // const borderClass = highlight ? "border-rmc-300" : "border-gray-300";
    // const isOutstanding = student?.percentage >= 90;
    // const scoreClass = highlight
    //   ? "text-[#000071]"
    //   : isOutstanding
    //     ? "text-[#000080]"
    //     : "text-gray-600";
    const score = formatScoreDisplay(student);
    const percent = formatPercentDisplay(student);
    const scoreText = percent ? `${score} (${percent})` : score;

    return (
      <div
        key={student?.id ?? `${student?.name ?? "student"}-${index}`}
        className={`text-sm pl-2 last:border-b-0 border-b-1 border-gray-300 py-2`}
      >
        <div className="flex gap-3 items-center">
          <img
            src={userIcon}
            alt="student image"
            className="w-[50px] h-[50px] rounded object-cover"
          />
          <div className="flex flex-col">
            <p className="font-semibold text-xl">{student?.name ?? "-"}</p>
            <p className="text-xs text-gray-600">{student?.school ?? "-"}</p>
            <p className={`text-[16px] text-[#03047c]`}>{scoreText}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with News Sidebar */}
      <PageHeroSlider pageType="rmc" className="rmc-hero py-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div
            className={`hero-with-news-layout ${news.length === 0 ? "no-news" : ""}`}
          >
            <div className="hero-content-main text-center">
              <div className="inline-block bg-gradient-to-br from-[#0f0f92] to-[#000073] text-white px-6 py-2 text-sm font-semibold mb-4 rounded-4xl">
                Regional Math Clubs
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-[64px] font-bold mb-6">
                RMC – Regional Math Clubs
              </h1>
              <p className="text-[21px]  mb-2 ">
                Monthly inter-school competitions for grade 5 students.
              </p>
              <p className="text-[21px] text-gray-600 mb-8 max-w-3xl mx-auto">
                Turning mathematics into a collaborative yet competitive sport.
              </p>

              <div className="bg-white p-6 rounded-2xl">
                <div className="flex flex-col md:flex-row justify-around items-stretch gap-3">
                  {/* <div className="flex md:flex-row flex-col gap-5 justify-around ">
                    <h1 className="text-[21px] font-bold text-[#000050]">
                      How to join
                    </h1>
                    <p className=" text-center md:text-left text-lg">
                      Register online <br />
                      Take the admission test <br />
                      Selected students receive admission offer <br />
                      Join live evening classes
                    </p>
                  </div> */}
                  <div>
                    <p className="flex flex-col">
                      <span className="text-lg">
                        Next NMC (National Math Contest)
                      </span>
                      <span className="text-[21px] text-[#000080] font-bold">
                        17-October-2026
                      </span>
                    </p>
                  </div>
                  <div className=" w-full md:w-[1px] h-[10px] md:h-auto md:border-none border border-[#d0d0d0]  bg-[#d0d0d0]"></div>
                  <div className="flex flex-col gap-4 ">
                    <p className="flex flex-col">
                      <span className="text-lg">Next RMC Monthly Contest</span>
                      <span className="text-[21px] text-[#000080] font-bold">
                        25-July-2026
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              {/* <div className="bg-white shadow-lg p-6 inline-block mb-8 border-2 border-[#E8EAF6] rounded-xl">
                <div className="flex items-center gap-2 text-[#000071]">
                  <Calendar size={24} />
                  <div className="text-left">
                    <p className="text-sm text-gray-600">
                      Next RMC Monthly Contest
                    </p>
                    <p className="text-2xl font-bold">25th April 2026</p>
                  </div>
                </div>
              </div> */}

              {/* <div className="flex flex-wrap md:flex-nowrap gap-5 justify-center">
                <div className="rmc-register-card">
                  <span className="text-[11px] font-bold bg-white border-2 border-[#000060] text-[#000060] py-[2px] px-3 !rounded-full !capitalize mb-3 inline-block">
                    For Schools
                  </span>
                  <h2 className="">
                    Register your institution as an RMC member.
                  </h2>
                  <Link
                    to="/signup-school"
                    className="inline-flex items-center gap-2  px-6 py-2 text-md font-semibold bg-[#000080] text-white transition-colors shadow-lg border-2 border-[#000060] rounded-xl hover:text-white rmcButton"
                  >
                    School Registration
                  </Link>
                </div>

                <div className="rmc-register-card">
                  <span className="text-[11px] font-bold bg-white border-2 border-[#000060] text-[#000060] py-[2px] px-3 !rounded-full !capitalize mb-3 inline-block">
                    For Students
                  </span>
                  <h2 className="">
                    Register yourself to participate in the contest.
                  </h2>
                  <Link
                    to="/signup-student"
                    className={`inline-flex items-center gap-2  px-6 py-2 text-md font-semibold bg-[#000080] text-white transition-colors shadow-lg border-2 border-[#000060] rounded-xl hover:text-white rmcButton ${
                      isRegistrationDisabled
                        ? registrationDisabledClassName
                        : ""
                    }`}
                    onClick={handleRegistrationClick}
                    aria-disabled={isRegistrationDisabled}
                    tabIndex={isRegistrationDisabled ? -1 : 0}
                  >
                    Student Registration
                  </Link>
                </div>
              </div> */}
              {/* <div>
                {!registrationOpen ? (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 mt-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          {registrationMessage ||
                            "Student registrations are currently closed."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  ""
                )}
              </div> */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-center items-center mt-4">
                <div className="px-4 py-6 bg-white rounded flex flex-col justify-center items-center gap-3">
                  <p className="px-3 w-max py-1 rounded-full border border-[#000080] text-[#000080] font-semibold text-xs">
                    For Schools
                  </p>
                  <p className="text-sm text-center text-[#000080] font-semibold">
                    Register your institution as an RMC member.
                  </p>
                  <Link
                    to="/create-account?rmc"
                    className={`bg- text-white px-8 py-2 text-lg font-bold rounded-lg bg-gradient-to-bl from-[#0f0f92] to-[#000073] flex justify-center items-center ${
                      isRegistrationDisabled
                        ? registrationDisabledClassName
                        : ""
                    }`}
                    onClick={handleRegistrationClick}
                    aria-disabled={isRegistrationDisabled}
                    tabIndex={isRegistrationDisabled ? -1 : 0}
                  >
                    School Registration
                  </Link>
                </div>
                <div className="px-4 py-6 bg-white rounded flex flex-col justify-center items-center gap-3">
                  <p className="px-3 w-max py-1 rounded-full border border-[#000080] text-[#000080] font-semibold text-xs">
                    For Students
                  </p>
                  <p className="text-sm text-center text-[#000080] font-semibold">
                    Register yourself to participate in the contest.
                  </p>
                  <Link
                    to="/create-account?rmc"
                    className={`bg- text-white px-8 py-2 text-lg font-bold rounded-lg bg-gradient-to-bl from-[#0f0f92] to-[#000073] flex justify-center items-center ${
                      isRegistrationDisabled
                        ? registrationDisabledClassName
                        : ""
                    }`}
                    onClick={handleRegistrationClick}
                    aria-disabled={isRegistrationDisabled}
                    tabIndex={isRegistrationDisabled ? -1 : 0}
                  >
                    Student Registration
                  </Link>
                </div>
              </div>
              <div className="mt-6 flex flex-col lg:flex-row gap-4 items-stretch">
                {/* <a
                  href="https://drive.google.com/drive/folders/1DB84iCng8g9lzS5JF9HZ4vhVD_TTqRNe?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#9FA8DA] font-semibold underline bg-[#000070]/50 px-4 py-2 inline-block backdrop-blur-sm border border-[#5C6BC0] download_content_rmc rounded-xl"
                >
                  Download Content for Next RMC
                </a> */}
                {/* <Link
                  to="/create-account?rmc"
                  className={`bg- text-white px-8 py-2 text-lg font-bold rounded-lg bg-[linear-gradient(43deg,#0f0f92,#000073)] flex justify-center items-center lg:w-[calc(40%-0px)] ${
                    isRegistrationDisabled ? registrationDisabledClassName : ""
                  }`}
                  onClick={handleRegistrationClick}
                  aria-disabled={isRegistrationDisabled}
                  tabIndex={isRegistrationDisabled ? -1 : 0}
                >
                  Register for RMC
                </Link> */}
                <div className="mt-0 mx-auto">
                  <a
                    href="https://drive.google.com/drive/folders/1DB84iCng8g9lzS5JF9HZ4vhVD_TTqRNe?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#000080] bg-transparent  px-4 py-2 text-lg font-bold border border-[#000080] rounded-lg flex items-center gap-2 justify-center md:px-20"
                  >
                    <img
                      src={downloadIcon}
                      alt="download icon"
                      className="object-cover"
                    />
                    Download Content for Next RMC
                  </a>
                </div>
              </div>
            </div>

            {/* News Sidebar */}
            <NewsSidebar news={news} title="RMC News" />
          </div>
        </div>
      </PageHeroSlider>

      {/* Overview */}
      <section className="py-8 md:py-15  bg-white">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-3xl md:text-[40px] font-bold text-center text-gray-900 mb-4">
            Overview
          </h2>
          <p className="text-lg md:text-xl  leading-relaxed  text-justify max-w-4xl  mx-auto">
            SundarSTEM with a mission to fosters a sustainable culture of
            mathematics that thrives beyond individual contests.
          </p>
          <p className="text-lg md:text-xl  leading-relaxed  text-justify max-w-4xl  mx-auto">
            This member schools club network facilitates monthly inter-school
            competitions turning mathematics into a collaborative yet
            competitive sport.These local competitions build consistent
            problem-solving habits and serve as a qualifying tier, where the top
            four members from each club advance to the National Math Contest.
          </p>
        </div>
      </section>

      {/* Target Participants & Active Cities */}
      <section className="pb-8 md:pb-15 bg-white">
        <div className="container">
          <div className="grid gap-12">
            {/* <div className="flex flex-col items-center">
              <h2 className="text-2xl md:text-3xl font-bold  mb-6">
                Target Participants
              </h2>
              <img src={target} alt="target icon" className="mb-5" />
              <ul className="space-y-3 text-lg md:text-xl ">
                <li className="text-center">
                  <CheckCircle
                    className="text-[#000080] flex-shrink-0 mt-1"
                    size={20}
                  />
                  <span>
                    <strong>Grade 5 students</strong>
                  </span>
                </li>
                <li className="text-center">
                  <CheckCircle
                    className="text-[#000080] flex-shrink-0 mt-1"
                    size={20}
                  />
                  <span>
                    Member schools are encouraged to nominate
                    <strong>&nbsp;top 5 students</strong> for monthly
                    participation.
                  </span>
                </li>
              </ul>
            </div> */}
            <div className="flex items-center flex-col">
              <h2 className="text-2xl md:text-3xl font-bold  mb-6">
                RMC is Expanding Nationwide
              </h2>
              <img src={mapicon} alt="target icon" className="mb-5" />
              <p className="text-lg md:text-xl text-center  mb-4 max-w-3/5">
                RMC is currently active with member schools across:
              </p>
              <div className="flex flex-wrap gap-4 justify-center items-center max-w-3xl">
                <div className="bg-[#f0f2ff] px-6 py-2  shadow-md flex items-center gap-2 border-2 border-gray-100 rounded-3xl">
                  {/* <MapPin className="text-[#000080]" size={20} /> */}
                  <span className="font-semibold text-[#000080] leading-none text-lg">
                    Lahore
                  </span>
                </div>
                <div className="bg-[#f0f2ff] px-6 py-2  shadow-md flex items-center gap-2 border-2 border-gray-100 rounded-3xl">
                  {/* <MapPin className="text-[#000080]" size={20} /> */}
                  <span className="font-semibold text-[#000080] leading-none text-lg">
                    Abbottabad
                  </span>
                </div>
                <div className="bg-[#f0f2ff] px-6 py-2 shadow-md flex items-center gap-2 border-2 border-gray-100 rounded-3xl">
                  {/* <MapPin className="text-[#000080]" size={20} /> */}
                  <span className="font-semibold text-[#000080] leading-none text-lg">
                    Karachi
                  </span>
                </div>

                <div className="bg-[#f0f2ff] px-6 py-2 shadow-md flex items-center gap-2 border-2 border-gray-100 rounded-3xl">
                  {/* <MapPin className="text-[#000080]" size={20} /> */}
                  <span className="font-semibold text-[#000080] leading-none text-lg">
                    Islamabad
                  </span>
                </div>
                <div className="bg-[#f0f2ff] px-6 py-2 shadow-md flex items-center gap-2 border-2 border-gray-100 rounded-3xl">
                  {/* <MapPin className="text-[#000080]" size={20} /> */}
                  <span className="font-semibold text-[#000080] leading-none text-lg">
                    Layyah
                  </span>
                </div>
                <div className="bg-[#f0f2ff] px-6 py-2 shadow-md flex items-center gap-2 border-2 border-gray-100 rounded-3xl">
                  {/* <MapPin className="text-[#000080]" size={20} /> */}
                  <span className="font-semibold text-[#000080] leading-none text-lg">
                    Mianwali
                  </span>
                </div>
                <div className="bg-[#f0f2ff] px-6 py-2 shadow-md flex items-center gap-2 border-2 border-gray-100 rounded-3xl">
                  {/* <MapPin className="text-[#000080]" size={20} /> */}
                  <span className="font-semibold text-[#000080] leading-none text-lg">
                    Hyderabad
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contest Format and Schedule */}
      <section className="py-8 md:py-15 bg-[#f0f2ff]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <h2 className="text-3xl md:text-[40px] font-bold text-center mb-12">
            Contest Format and Schedule
          </h2>

          <div className="grid lg:grid-cols-3 gap-10">
            <div className="bg-white border border-gray-50 px-6 py-10 shadow flex flex-col items-center rounded-4xl">
              <img src={formatIcon} alt="Fromat Icon" className="mb-5" />
              <h3 className="font-bold text-3xl mb-4 flex items-center gap-2">
                {/* <Target size={24} className="text-[#000071]" />  */}
                Format
              </h3>
              <p className="text-[#6c6c6c] text-lg md:text-xl text-center max-w-7/10">
                Monthly contest format: <strong>multiple-choice</strong>,
                approximately <strong>15 questions</strong>.
              </p>
            </div>
            <div className="bg-white border border-gray-50 px-6 py-10 shadow flex flex-col items-center rounded-4xl">
              <img src={scheduleIcon} alt="Fromat Icon" className="mb-5" />
              <h3 className="font-bold text-3xl mb-4 flex items-center gap-2">
                {/* <Calendar size={24} className="text-[#000071]" /> */}
                Schedule
              </h3>
              <p className="text-[#6c6c6c] text-lg md:text-xl text-center max-w-7/10">
                Typical schedule: held <strong>monthly</strong>, typically on
                the <strong>last Saturday</strong>.
              </p>
            </div>
            <div className="bg-white border border-gray-50 px-6 py-10 shadow flex flex-col items-center rounded-4xl">
              <img src={hostingIcon} alt="Fromat Icon" className="mb-5" />
              <h3 className="font-bold text-3xl mb-4 flex items-center gap-2">
                {/* <Users size={24} className="text-[#000071]" /> */}
                Hosting
              </h3>
              <p className="text-[#6c6c6c] text-lg md:text-xl text-center max-w-7/10">
                Hosting model: hosted by member schools on a{" "}
                <strong>rotational basis</strong>.
              </p>
            </div>
          </div>

          {/* <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-100 shadow py-10  px-6  rounded-xl">
              <div className="flex gap-3 items-center mb-6">
                <img src={targetIcon} alt="icon" />
                <h3 className="font-bold text-2xl md:text-3xl">
                  Curriculum Focus
                </h3>
              </div>
              <p className="text-gray-700 text-lg md:text-xl">
                Each contest systematically follows the
                <strong>&nbsp;Beast Academy Grade 5 curriculum</strong>,
                focusing on specific chapters each month.
              </p>
            </div>
            <div className="bg-white border border-gray-100 shadow py-10  px-6  rounded-xl">
              <div className="flex gap-3 items-center mb-6">
                <img src={reviewIcon} alt="icon" />
                <h3 className="font-bold text-2xl md:text-3xl">
                  Materials, Results, and Feedback
                </h3>
              </div>
              <ul className="space-y-2 text-lg md:text-xl">
                <li>
                  Contest materials (question papers, answer keys) are provided
                  <strong>free of charge</strong>.
                </li>
                <li>
                  Performance tracking through a
                  <strong>city-wide leaderboard</strong>.
                </li>
              </ul>
            </div>
          </div> */}

          {/* <div className="bg-white mt-8 text-center  p-6 border border-gray-100 shadow-lg rounded-xl">
            <h3 className="font-bold text-xl mb-2">
              Relationship to ILM and PMC-5
            </h3>
            <p className="text-lg max-w-2xl mx-auto">
              RMC supports regular practice and contest readiness and connects
              naturally into ILM practice and PMC participation within the
              broader pathway.
            </p>
          </div> */}
        </div>
      </section>

      {/* Leaderboard Section */}
      <section id="leaderboard" className="py-8 md:py-15 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-tr from-[#0f0f92] to-[#000073] text-white px-7 py-2 mb-4 rounded-3xl">
              {/* <Trophy size={20} /> */}
              <span className=" text-sm font-semibold">
                RMC 1st Monthly Contest
              </span>
            </div>
            <h2 className="text-3xl md:text-[40px] font-bold text-gray-900 mb-4">
              Shining Stars & Top Schools
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Held on <strong>{testDate ? formatDate(testDate) : ""}</strong>{" "}
              across Lahore, Abbottabad and Karachi. Students who scored{" "}
              <strong>{scoreHighlightText}</strong> are highlighted below.
            </p>
          </div>

          {/* Two Column Layout: Main Content + Outstanding Students Sidebar */}
          <div className="grid lg:grid-cols-[1fr_350px] gap-8">
            {/* Main Content Column */}
            <div>
              {/* Top Positions by Venue */}
              <div className="mb-12">
                <h3 className="text-3xl md:text-[40px] font-bold text-left text-gray-900 mb-8 ">
                  Top Positions from Each Venue
                </h3>

                <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {topPositions.length === 0 ? (
                    <div className="col-span-full text-center text-gray-600">
                      {leaderboardLoading
                        ? "Loading leaderboard..."
                        : "Leaderboard data will appear here soon."}
                    </div>
                  ) : (
                    topPositions.map((venue, index) => {
                      const toppers = Array.isArray(venue?.toppers)
                        ? venue.toppers
                        : [];
                      const title = venue?.venue_title;

                      if (toppers.length <= 1) {
                        const topper = toppers[0] ?? {};
                        const venueKey = `${title}-${index}`;
                        const isExpanded = expandedVenues[venueKey] || false;
                        return (
                          <div
                            key={venueKey}
                            className="p-6 shadow-lg  rounded-xl bg-gradient-to-bl from-[#000073] to-[#15159d] text-white relative"
                            onClick={() => {
                              toggleVenueExpanded(venueKey);
                            }}
                          >
                            <ChevronDown
                              className={`transition-rotate duration-200 absolute top-4 right-5 ${isExpanded ? "rotate-180" : "rotate-0"}`}
                            />
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-xl">{title}</h4>
                            </div>
                            <p className="text-sm md:text-lg mb-2">
                              {topper?.school ?? "-"}
                            </p>
                            <div className="flex gap-3 items-center">
                              <img
                                src={userIcon}
                                alt="student image"
                                className="w-[50px] h-[50px]  border border-white rounded object-cover"
                              />
                              <div className="flex flex-col">
                                <p className="text-lg md:text-xl ">
                                  {topper?.name ?? "-"}
                                </p>
                                <div
                                  className={`w-max bg-[#E8EAF6] text-rmc-800 px-2 rounded-3xl text-xs md:text-sm ${isExpanded ? "flex" : "hidden"}`}
                                >
                                  {formatScoreDisplay(topper)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const isWide = toppers.length >= 2;
                      const venueKey = `${title}-${index}`;
                      const isExpanded = expandedVenues[venueKey] || false;
                      return (
                        <div
                          key={venueKey}
                          className={` relative p-6 shadow-lg  rounded-xl bg-gradient-to-tr from-[#15159d] to-[#000073] text-white ${
                            isWide ? "md:col-span-2" : ""
                          }
                          `}
                          onClick={() => {
                            toggleVenueExpanded(venueKey);
                          }}
                        >
                          <ChevronDown
                            className={`transition-rotate duration-200 absolute top-4 right-5 ${isExpanded ? "rotate-180" : "rotate-0"}`}
                          />
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-lg md:text-xl">
                                {title} (Co-toppers)
                              </h4>
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {toppers.map((topper, topperIndex) => (
                              <div key={topper?.id ?? topperIndex}>
                                <div className="flex gap-3 items-stretch">
                                  <img
                                    src={userIcon}
                                    alt="student image"
                                    className="w-[50px] h-[50px]  border border-white rounded object-cover"
                                  />
                                  <div className="flex flex-col gap-1">
                                    <p className="text-lg md:text-xl">
                                      {topper?.name ?? "-"}
                                    </p>
                                    <div
                                      className={`w-max bg-[#E8EAF6] text-rmc-800 px-2 rounded-3xl text-xs md:text-sm ${isExpanded ? "flex" : "hidden"} `}
                                    >
                                      {formatScoreDisplay(topper)}
                                    </div>
                                    <p className="text-[16px] mb-2">
                                      {topper?.school ?? "-"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Top Schools by Venue */}
              <div className="mb-12">
                <h3 className="text-3xl md:text-[40px] font-bold text-left  mb-8 ">
                  Top Schools by Venue
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  {topSchoolsByVenue.length === 0 ? (
                    <div className="col-span-full text-center text-gray-600">
                      {leaderboardLoading
                        ? "Loading top schools..."
                        : "Top schools will appear here soon."}
                    </div>
                  ) : (
                    topSchoolsByVenue.map((venue, index) => {
                      const topSchools = Array.isArray(venue?.top_schools)
                        ? venue.top_schools
                        : [];
                      const primarySchool = topSchools[0]?.school ?? "-";
                      const extraCount =
                        topSchools.length > 1 ? topSchools.length - 1 : 0;
                      const title =
                        venue?.venue_title ??
                        (venue?.city
                          ? venue?.center
                            ? `${venue.city} - ${venue.center}`
                            : venue.city
                          : `Venue ${index + 1}`);

                      return (
                        <div
                          key={`${title}-${index}`}
                          className="border border-gray-100 p-6 shadow rounded-xl"
                        >
                          <div className="flex gap-3 items-start mb-2">
                            <img
                              src={schoolIcon}
                              alt="school image"
                              className="w-[50px] h-[50px]  shrink-0 object-cover"
                            />
                            <div className="flex flex-col gap-1 ">
                              <p className="text-lg md:text-xl font-bold leading-none ">
                                {primarySchool}
                              </p>
                              <p className="font-light text-sm md:text-lg text-[#000074]">
                                {title}
                              </p>
                            </div>
                          </div>
                          {extraCount > 0 && (
                            <p className="text-xs text-[#E8EAF6] mt-1">
                              +{extraCount} more top school
                              {extraCount > 1 ? "s" : ""}
                            </p>
                          )}
                          <p className="text-sm md:text-lg text-[#757575] ">
                            Hosted at: {venue?.hosted_at ?? "-"}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            {/* End Main Content Column */}

            {/* Outstanding Students Sidebar */}
            {/* <div className="lg:sticky lg:top-4 lg:self-start">
              <div className="bg-white shadow-xl border-2 border-rmc-300 overflow-hidden rounded-xl">
                <div className="bg-gradient-to-r from-[#000080] to-[#000071] text-white p-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Award size={24} />
                    Outstanding Students by Venue
                  </h3>
                  <p className="text-xs text-[#E8EAF6] mt-1">
                    {scoreHighlightText} Scorers
                  </p>
                </div>

                <div className="max-h-[800px] overflow-y-auto">
                  {outstandingByVenue.length === 0 ? (
                    <div className="p-4 text-center text-gray-600">
                      {leaderboardLoading
                        ? "Loading outstanding students..."
                        : "Outstanding students will appear here soon."}
                    </div>
                  ) : (
                    outstandingByVenue.map((venue, index) => {
                      const title = venue?.center;
                      const preview = Array.isArray(venue?.students_preview)
                        ? venue.students_preview
                        : [];
                      const students = Array.isArray(venue?.students)
                        ? venue.students
                        : [];
                      const visibleStudents =
                        preview.length > 0 ? preview : students;
                      const remainingStudents =
                        students.length > visibleStudents.length
                          ? students.slice(visibleStudents.length)
                          : [];
                      const remainingCount =
                        venue?.remaining_count ?? remainingStudents.length;

                      return (
                        <div
                          key={`${title}-${index}`}
                          className="border-b-2 border-[#E8EAF6]"
                        >
                          <div className="bg-rmc-50 px-4 py-3 sticky top-0 z-10">
                            <h4 className="font-bold text-rmc-800 flex items-center gap-2">
                              <MapPin size={16} />
                              {title}
                            </h4>
                          </div>
                          <div className="px-4 py-3 space-y-2">
                            {visibleStudents.map(renderStudentRow)}
                            {remainingStudents.length > 0 && (
                              <details className="text-sm">
                                <summary className="cursor-pointer text-[#000071] hover:text-[#000061] font-semibold">
                                  Show {remainingCount} more students (
                                  {minPercentageDisplay ?? "60%"})
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {remainingStudents.map(renderStudentRow)}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div> */}
            <div className="lg:sticky lg:top-15 lg:self-start">
              <div className="bg-white shadow-xl border border-gray-100 overflow-hidden rounded-xl">
                <div className="bg-gradient-to-tr from-[#1717a1] to-[#000071] text-white p-4">
                  <p className="text-sm text-[#E8EAF6] mt-1">
                    {scoreHighlightText} Scorers
                  </p>
                  <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                    Outstanding Students by Venue
                  </h3>
                </div>

                {/* Custom wrapper for auto scroll */}
                <div className="outstanding-scroll-wrapper">
                  <div className="outstanding-scroll-container">
                    {outstandingByVenue.length === 0 ? (
                      <div className="p-4 text-center text-gray-600">
                        {leaderboardLoading
                          ? "Loading outstanding students..."
                          : "Outstanding students will appear here soon."}
                      </div>
                    ) : (
                      // Duplicate content for smooth infinite scroll
                      [...outstandingByVenue, ...outstandingByVenue].map(
                        (venue, index) => {
                          const title = venue?.center;
                          const preview = Array.isArray(venue?.students_preview)
                            ? venue.students_preview
                            : [];
                          const students = Array.isArray(venue?.students)
                            ? venue.students
                            : [];
                          const visibleStudents =
                            preview.length > 0 ? preview : students;
                          const remainingStudents =
                            students.length > visibleStudents.length
                              ? students.slice(visibleStudents.length)
                              : [];
                          const remainingCount =
                            venue?.remaining_count ?? remainingStudents.length;

                          return (
                            <div
                              key={`${title}-${index}`}
                              // className="border-b-2 border-[#E8EAF6]"
                            >
                              <div className=" bg-[#f0f2ff] px-4 py-3 sticky top-0 z-10">
                                <h4 className="font-bold text-xl">{title}</h4>
                              </div>
                              <div className="px-4 py-3 space-y-2">
                                {visibleStudents.map(renderStudentRow)}
                                {remainingStudents.length > 0 && (
                                  <details className="text-sm">
                                    <summary className="cursor-pointer  font-semibold">
                                      Show {remainingCount} more students (
                                      {minPercentageDisplay ?? "60%"})
                                    </summary>
                                    <div className="mt-2 space-y-2">
                                      {remainingStudents.map(renderStudentRow)}
                                    </div>
                                  </details>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* End Outstanding Students Sidebar */}
          </div>
          {/* End Two Column Layout */}
        </div>
      </section>
      {/* Thank You to Host Schools */}
      <section className="py-8 md:py-15 bg-[#f0f2ff]">
        <div className="container">
          <div className="bg-white p-4 md:p-10 shadow border border-gray-100 rounded-xl">
            <h3 className="text-[28px] md:text-[40px] font-bold text-center mb-3">
              Thank You to Our Club Member & Host Schools
            </h3>
            <p className="text-[#2b3240] text-lg  text-center mb-8 max-w-2xl mx-auto">
              A heartfelt thank you to all RMC club member schools for sending
              their students and supporting this initiative.
            </p>
            <p className="font-semibold text-xl text-center mb-6">
              Special appreciation to our host schools:
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {hostSchools.length === 0 ? (
                <div className="col-span-full text-center text-gray-600">
                  Host schools will appear here soon.
                </div>
              ) : (
                hostSchools.map((school, index) => (
                  <div
                    key={`${school}-${index}`}
                    className="flex flex-col items-center gap-3 p-3"
                  >
                    <img
                      src={schoolIcon}
                      alt=""
                      className="h-[50px] w-[50px]"
                    />
                    <span className="text-lg text-[#2b3240] text-center md:max-w-[150px] mx-auto">
                      {school}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="text-center text-lg text-[#2b3240] mt-8 max-w-xl mx-auto mb-4">
              Your support and your students' hard work made the RMC 1st Monthly
              Contest a memorable and confident start.
            </p>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <PhotoGallery type="rmc" title="RMC Events Gallery" />

      {/* Join RMC */}
      <section id="join" className="py-8 md:py-15 bg-white  text-white">
        <div className="container">
          <div className=" mx-auto rounded-4xl  px-4 py-[50px] md:px-8 text-center max-w-5xl bg-gradient-to-bl from-[#000073] to-[#1717a1]">
            <h2 className="text-3xl  font-bold mb-3">Join RMC</h2>
            <p className="text-lg md:text-xl mb-8 text-rmc-50 max-w-3xl mx-auto">
              Nominate a mathematics coordinator. Receive monthly materials via
              email/WhatsApp.
            </p>
            <div className="flex flex-wrap md:flex-nowrap justify-center items-center gap-6 md:gap-12">
              <div className="">
                <Link
                  to="/create-account?rmc"
                  className={`inline-flex items-center gap-2 bg-white text-[#000071] px-8 py-3 text-lg hover:bg-gray-100 font-bold transition-colors shadow-lg rounded ${
                    isRegistrationDisabled ? registrationDisabledClassName : ""
                  }`}
                  onClick={handleRegistrationClick}
                  aria-disabled={isRegistrationDisabled}
                  tabIndex={isRegistrationDisabled ? -1 : 0}
                >
                  Register for RMC
                  {/* <ArrowRight size={20} /> */}
                </Link>
              </div>
              <div className="">
                <div className="flex items-center gap-2 text-white">
                  {/* <Calendar size={24} /> */}
                  <div className="text-left">
                    <p className="text-sm text-white">
                      Next RMC Monthly Contest Date
                    </p>
                    <p className="text-[21px] font-semibold">25-July-2026</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Home */}
      {/* <section className="py-12 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[#000071] hover:text-[#000061] font-semibold text-lg"
          >
            ← Back to Home
          </Link>
        </div>
      </section> */}
    </div>
  );
};

export default RMC;
