import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Calendar,
  BookOpen,
  Code,
  FileText,
  CheckCircle,
  Target,
  ArrowRight,
  Users,
  Award,
  Download,
  Check,
} from "lucide-react";
import "../marketing/VSS.css";
import NewsSidebar from "@/components/shared/NewsSidebar";
import PageHeroSlider from "@/components/marketing/PageHeroSlider";
import { getNewsByCategory } from "@/api/newsApi";
import { mapNewsSidebarItem } from "@/data/newsData";
import axios from "axios";
import toast from "react-hot-toast";
import downloadIcon from "@/assets/download-resource-book.png";
import certificateBadge from "@/assets/certificate-badge.png";
import certificatedownloadIcon from "@/assets/certificate-download-icon.png";
import laptop from "@/assets/laptop.png";
import calculator from "@/assets/Calculator.png";
import eng from "@/assets/ENG.png";
import pythonIcon from "@/assets/vss-python-icon.png";

const VSS = ({ type = "vss" }) => {
  const [news, setNews] = useState([]);

  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await getNewsByCategory("VSS");
        const mappedNews = response.data.data.map(mapNewsSidebarItem);
        setNews(mappedNews);
      } catch (error) {
        console.error("Failed to fetch VSS news:", error);
        setNews([]);
      }
    };
    fetchNews();
  }, []);

  const moduleType = typeof type === "string" ? type : "vss";

  const CHECK_REGISTRATION_STATUS = `${
    import.meta.env.VITE_API_URL ??
    "http://154.57.211.187:81/example-app/public"
  }/api/registration-settings/student?module=${encodeURIComponent(moduleType)}`;

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
        }
      } catch (err) {
        if (!mounted) return;
        const message =
          err?.message ||
          "Unable to check registration status. Please try again later.";
        toast.error(message);
      } finally {
        if (mounted) setCheckingStatus(false);
      }
    };
    checkStatus();
    return () => {
      mounted = false;
    };
  }, [CHECK_REGISTRATION_STATUS]);

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
    <div className="min-h-screen ">
      {/* Hero Section with News Sidebar */}
      <PageHeroSlider pageType="vss" className="vss-hero py-12 md:py-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div
            className={`hero-with-news-layout ${news.length === 0 ? "no-news" : ""}`}
          >
            <div className="hero-content-main">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-[linear-gradient(43deg,#b4091c,#980212)] text-white px-8 py-2 mb-6 rounded-3xl">
                  {/* <GraduationCap size={20} /> */}
                  <span className="text-sm">Free online STEM School</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-[64px]  font-bold text-gray-900 mb-6">
                  Virtual STEM School (VSS)
                </h1>
                <p className="text-[21px] mb-8 max-w-3xl mx-auto">
                  Intensive online program for Math, CS, and English.
                </p>
              </div>

              <div className="bg-white shadow-xl p-8 mb-8 border-2 border-[#FEE2E2] rounded-xl">
                <div className="grid md:grid-cols-2 gap-6 mb-6 items-center max-w-xl mx-auto">
                  <div className="text-center md:border-r-1 border-[#d0d0d0]">
                    <div className="text-lg mb-2">Duration</div>
                    <p className="text-[#a51c30] font-bold text-[21px]">
                      1 Year / 3 Semesters
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg mb-2">Grade Level</div>
                    <p className="text-[#a51c30] font-bold text-[21px]">
                      Grade 5, 6 & 7
                    </p>
                  </div>
                </div>
              </div>

              {/* <div className="bg-white shadow-xl p-8 mb-8 border-2 border-[#FEE2E2] rounded-xl">
                <div className="grid md:grid-cols-3 gap-6 mb-6 items-center">
                  <div className="text-center md:border-r-1 border-[#d0d0d0]">
                    <div className="text-lg mb-2">Duration</div>
                    <p className="text-[#a51c30] font-bold text-[21px]">
                      1 Year / 3 Semesters
                    </p>
                  </div>
                  <div className="text-center md:border-r-1 border-[#d0d0d0]">
                    <div className="text-lg mb-2">Grade Level</div>
                    <p className="text-[#a51c30] font-bold text-[21px]">
                      Grade 5, 6 & 7
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg mb-2">Next Admission</div>
                    <div className="flex items-center justify-center gap-2 text-[#a51c30] font-bold">
                      <span className="text-[21px]">Not Announced Yet</span>
                    </div>
                  </div>
                </div>
              </div> */}

              {/* <div className="text-center flex md:flex-row flex-col items-stretch gap-3">
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
                  ""
                )}
                <Link
                  to="/create-account?vss"
                  className={`bg- text-white px-8 py-2 text-lg font-bold rounded bg-[linear-gradient(43deg,#b4091c,#980212)] flex  md:w-[35%] justify-center ${
                    isRegistrationDisabled ? registrationDisabledClassName : ""
                  }`}
                  onClick={handleRegistrationClick}
                  aria-disabled={isRegistrationDisabled}
                  tabIndex={isRegistrationDisabled ? -1 : 0}
                >
                  Register for PMC
                </Link>
                <div className="mt-0 w-full">
                  <a
                    href="https://drive.google.com/drive/folders/1yUCPiFhFYiIYwfDEUvhOWdpG7HYbBDjY?usp=drive_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#980212] bg-transparent px-4  py-2 text-lg font-bold border border-[#980212] rounded flex items-center justify-center gap-2"
                  >
                    <img
                      src={downloadIcon}
                      alt="download icon"
                      className="object-cover"
                    />
                    Download Resource Book for VSS 6 & 7 Admission
                  </a>
                </div>
              </div> */}
            </div>

            {/* News Sidebar */}
            <NewsSidebar news={news} title="VSS News" />
          </div>
        </div>
      </PageHeroSlider>

      {/* Overview */}
      <section className="py-8 md:py-15 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <h2 className=" text-3xl md:text-[40px] font-bold text-center  mb-8">
            Overview
          </h2>
          <div className="max-w-4xl mx-auto">
            <p className="text-lg md:text-xl leading-relaxed mb-6 text-center">
              The Virtual SundarSTEM (VSS) is an exclusive, supplementary online
              programme designed to identify and nurture Pakistan's top
              mathematical and scientific talent. Exceptional performing
              talented students in the PMC are invited to join an exclusive,
              free one-year online course.
            </p>
            <p className="text-lg md:text-xl leading-relaxed mb-6 text-center">
              This program offers world-class instruction in Olympiad-standard
              Mathematics, Competitive Programming, and English. To ensure
              equitable access, we provide merit base laptops for use to
              deserving students, ensuring that financial barriers do not hinder
              intellectual growth.
            </p>
            {/* <div className="bg-[#FEE2E2] p-6 text-center border-2 border-[#CC8181] rounded-xl">
              <h3 className="font-bold text-xl mb-4 text-[#6B1B1B]">
                Primary Goal
              </h3>
              <p className="text-lg text-gray-700">
                Provide the <strong>top 1%</strong> of talented students with
                rigorous training, preparing them for global competitions and
                leading universities.
              </p>
            </div> */}
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className="curriculum-section py-8 md:py-15 ">
        <div className="container">
          <div className="pb-10">
            <h2 className="text-3xl md:text-[40px] font-bold text-center  mb-2">
              Curriculum
            </h2>
            <p className="text-center text-lg md:text-xl">
              A comprehensive 1 year journey
            </p>
          </div>
          <div className="flex gap-10 flex-wrap lg:flex-nowrap items-center lg:items-stretch justify-between">
            <div className="flex flex-col gap-5 lg:w-1/4 w-full bg-[#fff0f2] py-4 px-6 rounded-xl">
              <h3 className="text-2xl text-center font-semibold text-[#9D191A]">
                Grade 5
              </h3>
              <div className="py-10 px-3 rounded-3xl bg-[#f9f9f9] flex flex-col justify-start items-center w-full h-full  lg:">
                <div className="p-4 bg-gradient-to-br from-[#C90016] to-[#9D191A] flex justify-center items-center rounded-xl mb-5">
                  <img
                    src={pythonIcon}
                    alt="ENG icon"
                    className=" w-[50px] h-[50px] object-cover "
                  />
                </div>
                <h1 className="text-2xl mb-4 text-center font-bold">
                  Math (AoPS) - Book 5{" "}
                </h1>
                <h1 className="text-2xl mb-2 text-center font-bold">
                  Computer Science{" "}
                </h1>
                <p className="text-lg mb-4 max-w-8/10 text-center text-gray-600">
                  Scratch + Basic Python
                </p>
                <h1 className="text-2xl mb-2 text-center font-bold">English</h1>
                <p className="text-lg mb-1 max-w-8/10 text-center text-gray-600">
                  Basic communication, vocabulary, everyday scenarios
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5 w-full lg:w-3/4 bg-[#fff0f2] py-4 px-6 rounded-xl">
              <h3 className="text-center text-2xl font-semibold text-[#9D191A]">
                Grades 6 & 7
              </h3>
              <div className="flex justify-between gap-10 lg:flex-nowrap flex-wrap items-stretch w-full">
                <div className="py-10 px-3 rounded-3xl bg-[#f9f9f9] flex flex-col justify-start items-center w-full  lg:w-1/3">
                  <div className="p-4 bg-gradient-to-br from-[#C90016] to-[#9D191A] flex justify-center items-center rounded-xl mb-5">
                    <img
                      src={calculator}
                      alt="calculator"
                      className="w-[50px] h-[50px] object-cover"
                    />
                  </div>
                  <h1 className="text-2xl mb-3 text-center font-bold">
                    Math (AoPS)
                  </h1>
                  <h4 className="text-lg mb-1 font-semibold ">Semester 1</h4>
                  <p className="text-lg mb-1 max-w-8/10 text-center  text-gray-600">
                    Prealgebra
                  </p>
                  <h4 className="text-lg  mb-1  font-semibold">Semester 2</h4>
                  <p className="text-lg  mb-1  max-w-8/10 text-center  text-gray-600">
                    Intro to Algebra, Counting & Probability
                  </p>
                  <h4 className="text-lg  mb-1  font-semibold ">Semester 3</h4>
                  <p className="text-lg  mb-1  max-w-8/10 text-center  text-gray-600">
                    Intro to Number Theory, Intro to Geometry
                  </p>
                </div>
                <div className="py-10 px-3 rounded-3xl bg-[#f9f9f9] flex flex-col justify-start items-center w-full  lg:w-1/3">
                  <div className="p-4 bg-gradient-to-br from-[#C90016] to-[#9D191A] flex justify-center items-center rounded-xl mb-5">
                    <img
                      src={laptop}
                      alt="laptop"
                      className="w-[50px] h-[50px] object-cover"
                    />
                  </div>
                  <h1 className="text-2xl mb-3 text-center font-bold">
                    Computer Science
                  </h1>
                  <h4 className="text-lg mb-1  font-semibold">Semester 1</h4>
                  <p className="text-lg mb-1  max-w-8/10 text-center  text-gray-600">
                    {" "}
                    Scratch + Intro to Programming (Python)
                  </p>
                  <h4 className="text-lg mb-1 font-semibold">Semester 2</h4>
                  <p className="text-lg mb-1  max-w-8/10 text-center text-gray-600">
                    {" "}
                    Intermediate Programming (Python)
                  </p>
                  <h4 className="text-lg mb-1  font-semibold ">Semester 3</h4>
                  <p className="text-lg mb-1  max-w-8/10 text-center text-gray-600">
                    {" "}
                    Intro to Competitive Programming (C++)
                  </p>
                </div>
                <div className="py-10 px-3 rounded-3xl bg-[#f9f9f9] flex flex-col justify-start items-center w-full  lg:w-1/3">
                  <div className="p-4 bg-gradient-to-br from-[#C90016] to-[#9D191A] flex justify-center items-center rounded-xl mb-5">
                    <img
                      src={eng}
                      alt="ENG icon"
                      className=" w-[50px] h-[50px] object-cover "
                    />
                  </div>
                  <h1 className="text-2xl mb-3 text-center font-bold">
                    English
                  </h1>
                  <h4 className="text-lg mb-1 font-semibold">Semester 1</h4>
                  <p className="text-lg mb-1 max-w-8/10 text-center text-gray-600">
                    Basic communication, vocabulary, everyday scenarios
                  </p>
                  <h4 className="text-lg mb-1 font-semibold ">Semester 2</h4>
                  <p className="text-lg mb-1 max-w-8/10 text-center text-gray-600">
                    Opinions, discussions, analyzing texts, critical thinking
                  </p>
                  <h4 className="text-lg mb-1 font-semibold ">Semester 3</h4>
                  <p className="text-lg mb-1 max-w-8/10 text-center text-gray-600">
                    Advanced discussions, debates, persuasive writing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery and support */}
      <div className="bg-[#fff0f2] py-8 md:py-15">
        <div className="container">
          <div className="section_mission !m-0 !mb-2  md:!mb-5  ">
            <span className="font-bold mx-2 text-2xl text-[#a51c30] text-center uppercase">
              Delivery and Support
            </span>
          </div>
          <div className="px-8 max-w-5xl mx-auto ">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check
                      className="text-[#980212] mt-1 stroke-[4px] "
                      size={20}
                    />
                    <span className="text-lg md:text-xl max-w-[90%]">
                      Learning managed via <strong>Google Meet</strong> (live
                      classes) and <strong>Google Classroom</strong>{" "}
                      (coursework).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check
                      className="text-[#980212] mt-1 stroke-[4px]"
                      size={20}
                    />
                    <span className="text-lg md:text-xl max-w-[90%]">
                      Program access is <strong>free</strong>.
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check
                      className="text-[#980212] mt-1 stroke-[4px]"
                      size={20}
                    />
                    <span className="text-lg md:text-xl max-w-[90%]">
                      Live evening classes approximately 2–3 hours on weekdays.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check
                      className="text-[#980212] mt-1 stroke-[4px]"
                      size={20}
                    />
                    <span className="text-lg md:text-xl max-w-[90%]">
                      <strong>Chromebooks provided</strong> to deserving
                      students to support equitable participation.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Participants */}
      {/* <section className="py-16 bg-[#F9FAFB]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Target Participants
            </h2>
            <ul className="text-lg text-gray-700 space-y-4">
              <li className="flex items-center justify-center gap-2">
                <CheckCircle className="text-[#C90016]" size={24} />
                Motivated students in <strong>Grades 6 and 7</strong>
              </li>
              <li className="flex items-center justify-center gap-2">
                <CheckCircle className="text-[#C90016]" size={24} />
                Preparatory course for top <strong>Grade 5</strong> PMC-5
                performers
              </li>
            </ul>
          </div>
        </div>
      </section> */}

      {/* Certificate Section for Completers */}
      <section className="py-8 md:py-15 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex text-sm items-center gap-2 bg-gradient-to-r from-[#b4091c] to-[#980212] text-white px-6 py-2 mb-4 rounded-3xl">
              {/* <Award size={20} /> */}
              <span className="font-semibold">For VSS Graduates</span>
            </div>
            <h2 className="text-[28px] md:text-[40px] font-bold mb-4">
              Get Your Completion Certificate
            </h2>
            <p className="text-lg md:text-xl text-gray-600 md:max-w-4xl mx-auto">
              Congratulations on completing the 3-semester VSS program! Download
              your official certificate to celebrate your achievement.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Certificate Info */}
              <div className="bg-white p-8  shadow-xl rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12  flex items-center justify-center rounded-xl">
                    {/* <Award className="text-white" size={24} /> */}
                    <img src={certificateBadge} alt="certificate badge" />
                  </div>
                  <h3 className="text-[21px] font-bold text-gray-900">
                    Official Certificate
                  </h3>
                </div>
                <p className="text-[16px] mb-6">
                  Students who have successfully completed all 3 semesters of
                  the VSS program are eligible to receive an official completion
                  certificate.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check
                      className="text-[#a51c30] stroke-3 flex-shrink-0 mt-1"
                      size={18}
                    />
                    <span className="text-[16px]">
                      Digitally verifiable certificate
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check
                      className="text-[#a51c30] stroke-3 flex-shrink-0 mt-1"
                      size={18}
                    />
                    <span className="text-[16px]">
                      Official SundarSTEM School seal
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check
                      className="text-[#a51c30] stroke-3 flex-shrink-0 mt-1"
                      size={18}
                    />
                    <span className="text-[16px]">
                      Download as PDF for printing
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check
                      className="text-[#a51c30] stroke-3 flex-shrink-0 mt-1"
                      size={18}
                    />
                    <span className="text-[16px]">
                      Includes all 3 semesters completed
                    </span>
                  </div>
                </div>
              </div>

              {/* How to Get Certificate */}
              <div className="bg-white p-8  shadow-xl rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12  flex items-center justify-center rounded-xl">
                    {/* <Award className="text-white" size={24} /> */}
                    <img src={certificateBadge} alt="certificate badge" />
                  </div>
                  <h3 className="text-[21px] font-bold">
                    How to Get Your Certificate
                  </h3>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-[#fff0f2] text-[#a51c30] flex items-center justify-center font-bold flex-shrink-0 rounded-md">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-[18px] mb-1">
                        Get Your SSID
                      </h4>
                      <p className=" text-[16px]">
                        Your SSID (SundarSTEM ID) was provided when you enrolled
                        in VSS. Check your enrollment email or contact us if you
                        don't have it.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-[#fff0f2] text-[#a51c30] flex items-center justify-center font-bold flex-shrink-0 rounded-md">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-[18px] mb-1">
                        Verify Your Certificate
                      </h4>
                      <p className=" text-[16px]">
                        Go to the certificate verification page and enter your
                        SSID to view your certificate.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-[#fff0f2] text-[#a51c30] flex items-center justify-center font-bold flex-shrink-0 rounded-md">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-[18px] mb-1">
                        Download & Print
                      </h4>
                      <p className=" text-[16px]">
                        Download your certificate as a PDF file and print it for
                        your records or to share with others.
                      </p>
                    </div>
                  </div>

                  <div className="py-2 bg-gradient-to-br from-[#C90016] to-[#9D191A] flex items-center justify-center rounded-lg">
                    <Link
                      to="/certificate"
                      className="w-full flex items-center justify-center gap-2 text-white font-bold text-sm  rounded-xl"
                    >
                      {/* <Download size={20} /> */}
                      <img src={certificatedownloadIcon} alt="download icon" />
                      Get Your Certificate Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Note */}
            <div className="mt-8 bg-white shadow-xl  p-6 rounded-xl">
              <div className="flex items-start gap-3">
                {/* <FileText
                  className="text-blue-600 flex-shrink-0 mt-1"
                  size={24}
                /> */}
                <div className="flex flex-wrap md:flex-nowrap  gap-2">
                  <h4 className="font-bold text-[16px] mb-2 min-w-max block">
                    Need Help?
                  </h4>
                  <div>
                    <p className="text-[16px]  mb-2">
                      If you have completed the 3-semester program but don't
                      have your SSID, or if you're having trouble accessing your
                      certificate, please contact us:
                    </p>
                    <a
                      href="mailto:info@virtual.sundarstem.edu.pk"
                      className="text-[16px] underline"
                    >
                      info@virtual.sundarstem.edu.pk
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-8 md:py-15 container text-white">
        <div className="my-10 max-w-5xl  mx-auto rounded-4xl  py-[50px] text-center bg-gradient-to-bl from-[#9D191A] to-[#C90016]">
          <h2 className="text-3xl font-bold mb-3">
            Ready to Begin Your STEM Journey?
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-4xl mx-auto">
            Admission to VSS is based on merit. Students who excel in the Pakistan Mathematics
            Contest (PMC) will be invited to join VSS and embark on a 12-month
            journey in Mathematics, Computer Science, and English.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center sm:items-stretch items-center">
            {/* <Link
              to="/create-account?vss"
              className={`bg-white text-[#9D191A] px-8 py-4 text-lg font-bold hover:bg-gray-100 transition-colors shadow-lg  rounded-xl ${
                isRegistrationDisabled ? registrationDisabledClassName : ""
              }`}
              onClick={handleRegistrationClick}
              aria-disabled={isRegistrationDisabled}
              tabIndex={isRegistrationDisabled ? -1 : 0}
            >
              Participate in PMC
            </Link> */}
            <Link
              to="/pmc"
              className="bg-white text-[#9D191A] px-8 py-4 text-lg font-bold hover:bg-gray-100 transition-colors shadow-lg  rounded-xl"
            >
              Participate in PMC
            </Link>
            <a
              href="mailto:info@virtual.sundarstem.edu.pk"
              className="text-white px-8 py-4 text-lg font-bold hover:bg-vss-800 transition-colors shadow-lg border-2 border-white rounded-xl"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VSS;
