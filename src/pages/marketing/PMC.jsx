import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Calendar,
  Users,
  Award,
  CheckCircle,
  Target,
  ArrowRight,
  BookOpen,
  Laptop,
  Check,
  CalendarDays,
  Info,
  IdCard,
  GraduationCap,
  ArrowUp,
  ArrowUpRight,
} from "lucide-react";
import "../marketing/PMC5.css";
import NewsSidebar from "@/components/shared/NewsSidebar";
import PageHeroSlider from "@/components/marketing/PageHeroSlider";
import { getNewsByCategory } from "@/api/newsApi";
import { mapNewsSidebarItem } from "@/data/newsData";
import PhotoGallery from "@/components/shared/PhotoGallery";
import { getPMCActiveSession } from "@/api/authApi";
import toast from "react-hot-toast";
import contestIcon from "@/assets/contest-icon2.png";
import homeIcon from "@/assets/round1-icon1.png";
import brainIcon from "@/assets/round1-icon2.png";
import clockIcon from "@/assets/round1-icon3.png";
import schoolIcon from "@/assets/round2-icon1.png";
import laptopIcon from "@/assets/round2-icon2.png";
import pmcregisterIcon from "@/assets/PMC-Icon.png";
import downloadIcon from "@/assets/PMC-download-icon.png";
import sscard1Icon from "@/assets/school-icon.png";
import sscard2Icon from "@/assets/need-icon.png";
import sscard3Icon from "@/assets/vss-card-icon.png";
import sscard4Icon from "@/assets/academic-icon.png";
import impDates from "@/assets/imp-dates.png";

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

const PMC = () => {
  const [news, setNews] = useState([]);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState("");

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await getNewsByCategory("PMC");
        const mappedNews = response.data.data.map(mapNewsSidebarItem);
        setNews(mappedNews);
      } catch (error) {
        console.error("Failed to fetch PMC news:", error);
        setNews([]);
      }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      setCheckingStatus(true);
      setRegistrationMessage("");
      try {
        const res = await getPMCActiveSession();
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
                ? "No active PMC session is available right now."
                : "PMC registration is currently closed for available sessions.",
          );
        }
      } catch (err) {
        if (!mounted) return;
        const message = err?.message || "Unable to check active PMC sessions.";
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with News Sidebar */}
      <PageHeroSlider pageType="pmc" className="pmc-hero py-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div
            className={`hero-with-news-layout ${news.length === 0 ? "no-news" : ""}`}
          >
            <div className="hero-content-main">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-gradient-to-bl from-[#02501f] to-[#0a7532] text-white px-6 py-1 text-[16px] mb-6 rounded-3xl">
                  <span className="text-sm">National Math Competition</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-[64px] font-bold  mb-3">
                  Pakistan Math Contest
                </h1>
                {/* <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#035622]">
                  Summer 2026 Registration
                </h1> */}
                <p className="text-[21px]   mb-8 max-w-3xl mx-auto">
                  National contest to identify and reward top mathematics
                  talent.
                </p>
              </div>

              <div className="bg-white shadow-xl p-8 mb-8 border-1 border-gray-100 rounded-xl">
                <div className="grid md:grid-cols-2 gap-6 text-center">
                  <div className="md:border-r border-gray-300">
                    <div className="text-[21px] font-bold text-[#02501f] mb-2">
                      Next Contest
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      Contest Date:
                      <span className=" font-bold text-lg">
                        {/* Not Announced Yet */}
                        1-November-2026
                      </span>
                    </div>
                    {/* <div className="flex items-center justify-center gap-2 text-xs">
                      Registration closes:
                      <span className="text-[#a51c30]">
                        2 days before the contest date.
                      </span>
                    </div> */}
                  </div>
                  <div>
                    <div className="text-[21px] font-bold text-[#02501f] mb-2">
                      Grade Level
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className=" font-bold text-lg">Grades 4 - 7</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* <div className="text-center">
                {!registrationOpen ? (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-lg text-red-700">
                          {registrationMessage ||
                            "Student registrations are currently closed."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  ""
                )}
                <Link
                  to="/signup-student"
                  className={`inline-flex items-center gap-2 bg-gradient-to-bl from-[#02501f] to-[#0b7833] text-white px-10 py-4 text-lg font-semibold rounded-lg ${
                    isRegistrationDisabled ? registrationDisabledClassName : ""
                  }`}
                  onClick={handleRegistrationClick}
                  aria-disabled={isRegistrationDisabled}
                  tabIndex={isRegistrationDisabled ? -1 : 0}
                >
                  Register for PMC
                </Link>
              </div> */}

              <div className="text-center">
                <Link
                  to="/signup-student"
                  className={`inline-flex items-center gap-2 bg-gradient-to-bl from-[#02501f] to-[#0b7833] text-white px-10 py-4 text-lg font-semibold rounded-lg ${isRegistrationDisabled ? registrationDisabledClassName : ""
                    }`}
                  onClick={handleRegistrationClick}
                  aria-disabled={isRegistrationDisabled}
                  tabIndex={isRegistrationDisabled ? -1 : 0}
                >
                  Register for PMC
                </Link>
              </div>
            </div>

            {/* News Sidebar */}
            <NewsSidebar news={news} title="PMC News" />
          </div>
        </div>
      </PageHeroSlider>
      {/* Contest Format Section */}
      <section className="py-8 md:py-15 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-[40px] font-bold mb-4">
              Contest Format
            </h2>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Round 1 */}
              <div className=" p-8 shadow-lg border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className=" h-full  flex items-center justify-center rounded-xl">
                    <img
                      src={contestIcon}
                      alt="certificate badge"
                      className="h-full"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-bold leading-none">Round 1</h3>
                    <h3 className="text-xl font-bold leading-none">
                      Home-Based Assessment
                    </h3>
                  </div>
                </div>
                <p className="text-lg  mb-6">
                  A 60-minute online test conducted from the comfort of your
                  home.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={homeIcon}
                      alt="home icon"
                      className="object-cover w-[20px] h-[20px]"
                    />
                    <span className="text-lg">Al-Proctored Test</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={brainIcon}
                      alt="home icon"
                      className="object-cover w-[20px] h-[20px]"
                    />
                    <span className="text-lg">30 MCQ Thinking Problems</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={clockIcon}
                      alt="home icon"
                      className="object-cover w-[20px] h-[20px]"
                    />
                    <span className="text-lg">60 Minutes Duration</span>
                  </div>
                </div>
              </div>
              {/* Round 2 */}
              <div className=" p-8 shadow-lg border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className=" flex items-center justify-center rounded-xl">
                    <img
                      src={contestIcon}
                      alt="certificate badge"
                      className="h-full"
                    />
                  </div>
                  <div className="flex flex-col gap-2 ">
                    <h3 className="text-2xl font-bold leading-none">Round 2</h3>
                    <h3 className="text-xl font-bold leading-none">
                      Center-Based Final
                    </h3>
                  </div>
                </div>
                <p className="text-lg mb-6">
                  Round 1 qualifiers are invited to a physical test center in
                  selected major cities.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={schoolIcon}
                      alt="home icon"
                      className="object-cover w-[20px] h-[20px]"
                    />
                    <span className="text-lg">Designated Test Centers</span>
                  </div>
                  {/* <div className="flex items-center gap-2">
                    <img
                      src={laptopIcon}
                      alt="home icon"
                      className="object-cover w-[20px] h-[20px]"
                    />
                    <span className="text-lg">Computer based test CBT</span>
                  </div> */}
                  <div className="flex items-center gap-2">
                    <img
                      src={brainIcon}
                      alt="home icon"
                      className="object-cover w-[20px] h-[20px]"
                    />
                    <span className="text-lg">30 MCQ Thinking Problems</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img
                      src={clockIcon}
                      alt="home icon"
                      className="object-cover w-[20px] h-[20px]"
                    />
                    <span className="text-lg">60 Minutes Duration</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Incentives and Recognition Section */}
      <section className="py-8 md:py-15 bg-[#f1fff7]">
        <div className="container">
          <h2 className="text-3xl md:text-[40px] font-bold text-center mb-4">
            Incentives and Recognition
          </h2>
          <p className=" text-xl md:text-[28px] text-center font-light mb-12 max-w-3xl mx-auto">
            Top performers receive substantial incentives
          </p>

          <div className="grid md:grid-cols-5 gap-4">
            <div className=" p-6  text-center rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#0b7a34] to-[#02501f] flex items-center justify-center mx-auto mb-4 rounded-xl">
                <IdCard className="text-white" size={32} />
              </div>
              <h3 className="text-[24px] font-bold  mb-2">Participation</h3>
              <p className="text-[17px] text-[#6c6c6c]">
                Participation in international competition sponsor by
                SundarSTEM.
              </p>
            </div>
            <Link to="/prizes" className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#0b7a34] to-[#02501f] flex items-center justify-center mx-auto mb-4  rounded-xl">
                <Award className="text-white" size={32} />
              </div>
              {/* <h3 className="text-[24px]  font-bold  mb-2">Cash Awards</h3> */}
              <h3 className="text-[24px] font-bold mb-2 flex items-center justify-center gap-1">
                Cash Awards
                <ArrowUpRight size={20} className="text-[#0b7a34]" />
              </h3>
              <p className="text-[#6c6c6c] text-[17px]">
                <span className="block">
                  1st, 2nd & 3rd Position <strong className="whitespace-nowrap">Rs 50,000</strong>
                </span>
                <span className="block">
                  4th to 10th Position <strong className="whitespace-nowrap">Rs 15,000</strong>
                </span>
                <span className="block">
                  11th to 15th Position <strong className="whitespace-nowrap">Rs 10,000</strong>
                </span>
              </p>
            </Link>

            <div className=" p-6  text-center rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#0b7a34] to-[#02501f] flex items-center justify-center mx-auto mb-4 rounded-xl">
                <Laptop className="text-white" size={32} />
              </div>
              <h3 className="text-[24px] font-bold  mb-2">Laptops</h3>
              <p className="text-[17px] text-[#6c6c6c]">Laptops for study.</p>
            </div>

            <div className="p-6  text-center rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#0b7a34] to-[#02501f] flex items-center justify-center mx-auto mb-4 rounded-xl">
                <Target className="text-white" size={32} />
              </div>
              <h3 className="text-[24px] font-bold  mb-2">Courses</h3>
              <p className="text-[17px] text-[#6c6c6c]">
                Free enrollment in online “Math Crash Courses” from Virtual
                SundarSTEM.
              </p>
            </div>
            <div className=" p-6  text-center rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#0b7a34] to-[#02501f] flex items-center justify-center mx-auto mb-4 rounded-xl">
                <GraduationCap className="text-white" size={32} />
              </div>
              <h3 className="text-[24px] font-bold  mb-2">Scholarship</h3>
              <p className="text-[17px] text-[#6c6c6c]">
                Scholarship based admission to SundarSTEM.
              </p>
            </div>
          </div>

          {/* <div className="mt-12 bg-blue-50 p-8 text-center max-w-3xl mx-auto border-2 border-blue-100 rounded-xl">
            <h3 className="text-[32px] font-bold text-gray-900 mb-4">
              Pathway to VSS
            </h3>
            <p className="text-lg text-gray-700">
              Highest-performing PMC students may be offered entry into the{" "}
              <strong>Virtual STEM School (VSS)</strong> for advanced long-term
              training.
            </p>
          </div> */}
        </div>
      </section>
      {/* Registration Section */}
      <section className="py-8 md:py-15 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="mb-8">
            <div className="grid min-[991px]:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 md:p-8">
                <div className="flex gap-4 items-center mb-4">
                  <div className="flex justify-center items-center p-2 rounded-xl bg-gradient-to-bl from-[#097230] to-[#02511f]">
                    <img
                      src={pmcregisterIcon}
                      alt=""
                      className="w-[30px] h-[30px] object-cover"
                    />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold ">
                    Who Can Register?
                  </h3>
                </div>
                <h3 className="text-xl md:text-2xl text-[#035521] font-semibold mb-3">
                  Grade 4 - 7 Students
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check
                      className="text-[#01411C] flex-shrink-0 mt-1 stroke-3"
                      size={16}
                    />
                    <span className="flex flex-col gap-1 text-lg md:text-xl">
                      Age Criteria:
                      <span> PMC-4: Born on/after 1 Jan 2016</span>
                      <span>PMC-5: Born on/after 1 Jan 2015</span>
                      <span> PMC-7: Born on/after 1 Jan 2013</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check
                      className="text-[#01411C] flex-shrink-0 mt-1 stroke-3"
                      size={16}
                    />
                    <span className="flex flex-col gap-1 text-xl">
                      Open to: Boys and Girls across Pakistan
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 md:p-8">
                <div className="flex gap-4 items-center mb-4">
                  <div className="flex justify-center items-center p-2 rounded-xl bg-gradient-to-tr from-[#097230] to-[#02511f]">
                    <img
                      src={impDates}
                      alt=""
                      className="w-[30px] h-[30px] object-cover"
                    />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold ">
                    Important Dates
                  </h3>
                </div>
                <h3 className="text-xl md:text-2xl mb-3 flex items-center gap-4">
                  Next PMC :
                  <p className="text-xl md:text-2xl font-bold text-[#035521]">
                    1-November-2026
                  </p>
                </h3>
                <div className="space-y-3">
                  {/* <div className="px-3 py-2 rounded-lg flex items-center gap-2 bg-[#fff0f2] sm:w-max">
                    <div className="p-2 bg-[#980212] rounded-xl flex justify-center items-center">
                      <CalendarDays size={14} className="text-white" />
                    </div>
                    <p className="text-sm md:text-lg font-light ">
                      Registration closes: 20 May 2026
                    </p>
                  </div> */}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center flex flex-col md:flex-row gap-5 md:gap-10 justify-center items-stretch">
            <Link
              to="/signup-student"
              className={`inline-flex items-center gap-2 bg-gradient-to-bl from-[#02501f] to-[#0a7431]  text-white px-8 py-4 text-lg justify-center font-semibold  rounded-lg ${isRegistrationDisabled ? registrationDisabledClassName : ""
                }`}
              onClick={handleRegistrationClick}
              aria-disabled={isRegistrationDisabled}
              tabIndex={isRegistrationDisabled ? -1 : 0}
            >
              Register Now
            </Link>
            <div className="mt-0">
              <a
                href="https://drive.google.com/drive/folders/1yUCPiFhFYiIYwfDEUvhOWdpG7HYbBDjY"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#035521] bg-transparent px-4 py-2 text-lg font-bold border border-[#035521] rounded-lg flex items-center gap-2 justify-center md:px-20 h-full"
              >
                <img
                  src={downloadIcon}
                  alt="download icon"
                  className="object-cover"
                />
                Download Resource Book for PMC
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Admission to SundarSTEM section */}
      <section className="bg-[#a0102c] py-8 md:py-15">
        <div className="container">
          <h1 className="text-center text-3xl md:text-[40px] mb-3 text-white font-bold">
            Admission to
            <span className="text-[#e1d96e]">&nbsp;SundarSTEM School</span>
          </h1>
          <div className="section_mission !m-0 !mb-2  md:!mb-5  ">
            <span className="text-2xl text-white uppercase font-bold   text-center">
              Residential
            </span>
          </div>
          <p className="text-center text-xl text-white mb-8">
            The Pakistan Math Contest (PMC) serves as the primary identification
            mechanism for admission to SundarSTEM school.
          </p>

          <div className="grid min-[991px]:grid-cols-2 justify-items-center  gap-8">
            {/* Card 1 */}
            <div className="bg-[#95122f] shadow-lg rounded-xl p-6 md:ml-auto   border border-white/20 text-white md:max-w-[600px]">
              <div className="flex gap-6 items-center">
                <div className="p-2 rounded-lg flex justify-center items-center bg-[#e1d96e]">
                  <img
                    src={sscard1Icon}
                    alt=""
                    className="w-[40px] h-[40px] object-contain"
                  />
                </div>
                <h3 className="text-xl md:text-2xl text-[#e1d96e] uppercase font-bold">
                  Middle School Scholarships
                </h3>
              </div>
              <p className="mt-3 text-lg md:text-xl">
                Students demonstrating exceptional performance in the PMC from
                Grades 5, 6, and 7 may be considered for admission to the
                SundarSTEM Middle School boarding program.
              </p>
            </div>
            {/* Card 2 */}
            <div className=" bg-[#95122f] shadow-lg rounded-xl p-6  md:mr-auto border border-white/20 text-white md:max-w-[600px]">
              <div className="flex gap-6 items-center">
                <div className="p-2 rounded-lg flex justify-center items-center bg-[#e1d96e]">
                  <img
                    src={sscard2Icon}
                    alt=""
                    className="w-[40px] h-[40px] object-contain"
                  />
                </div>
                <h3 className="text-xl md:text-2xl text-[#e1d96e] uppercase font-bold">
                  NEED-BLIND MERIT AWARDS
                </h3>
              </div>
              <p className="mt-3 text-lg md:text-xl">
                Selected candidates are offered need-blind scholarships. The
                academic structure Integrates standard grade-level studies with
                advanced Olympiad tracks in Mathematics and Computer Science.
              </p>
            </div>
            {/* Card 3 */}
            <div className=" bg-[#95122f] shadow-lg rounded-xl p-6 md:ml-auto border border-white/20 text-white md:max-w-[600px]">
              <div className="flex gap-6 items-center">
                <div className="p-2 rounded-lg flex justify-center items-center bg-[#e1d96e]">
                  <img
                    src={sscard3Icon}
                    alt=""
                    className="w-[40px] h-[40px] object-contain"
                  />
                </div>
                <h3 className="text-xl md:text-2xl text-[#e1d96e] uppercase font-bold">
                  VSS TRANSITION
                </h3>
              </div>
              <p className="mt-3 text-lg md:text-xl">
                Students enrolled in Virtual SundarSTEM may earn a transition to
                the physical campus by demonstrating superior performance in
                online assessments and end-semester examinations.
              </p>
            </div>
            {/* Card 4 */}
            <div className=" bg-[#95122f] shadow-lg rounded-xl p-6 md:mr-auto border border-white/20 text-white md:max-w-[600px]">
              <div className="flex gap-6 items-center">
                <div className="p-2 rounded-lg flex justify-center items-center bg-[#e1d96e]">
                  <img
                    src={sscard4Icon}
                    alt=""
                    className="w-[40px] h-[40px] object-contain"
                  />
                </div>
                <h3 className="text-xl md:text-2xl text-[#e1d96e] uppercase font-bold">
                  ACADEMIC PROGRESSION
                </h3>
              </div>
              <p className="mt-3 text-lg md:text-xl">
                Admission initially facilitates entry into the Middle School.
                Final placement into specialized Advanced Olympiad O/A-Level
                tracks is determined after a 1-2 semester performance
                assessment.
              </p>
            </div>
          </div>
          <div className=" bg-[#95122f] shadow-lg rounded-xl p-6 border border-white/20 text-white mt-8 flex items-start gap-3 flex-col md:flex-row">
            <p className="text-[21px] italic font-semibold w-max flex gap-1 items-center">
              <Info size={20} />
              <span>Note:</span>
            </p>
            <p className="text-lg italic">
              Continued enrollment and advancement are contingent upon sustained
              academic excellence. Students who do not qualify for advanced
              tracks after the assessment period will exit the program with a
              certificate confirming their completed coursework.
            </p>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <PhotoGallery type="pmc" title="PMC 2025 Highlights" />

      {/* Call to Action Section */}
      <section className="py-8 md:py-15 bg-white  text-white">
        <div className="container">
          <div className="max-w-5xl mx-auto py-[50px] text-center bg-gradient-to-tr from-[#0e873b] to-[#02501f] rounded-4xl">
            <h2 className="text-3xl font-bold mb-6">Ready to Compete?</h2>
            <p className="text-2xl mb-8 px-4">
              Join thousands of students in this exciting challenge.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link
                to="/pmc5-student-registration"
                className={`bg-white text-[#02501f] px-8 py-4 flex justify-center items-center text-lg font-bold  rounded-lg  ${isRegistrationDisabled ? registrationDisabledClassName : ""
                  }`}
                onClick={handleRegistrationClick}
                aria-disabled={isRegistrationDisabled}
                tabIndex={isRegistrationDisabled ? -1 : 0}
              >
                Register Now
              </Link>
              <a
                href="mailto:info@virtual.sundarstem.edu.pk"
                className="bg-transparent text-white px-8 py-4 text-lg  font-bold border border-pmc-900 rounded-lg"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PMC;
