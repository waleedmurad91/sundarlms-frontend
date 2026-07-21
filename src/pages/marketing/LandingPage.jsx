import { Link } from "react-router-dom";
import {
  Award,
  MapPin,
  BookOpen,
  Laptop,
  CheckCircle,
  Calendar,
  ArrowRight,
  Diff,
} from "lucide-react";
import "./LandingPage.css";
import NewsSidebar from "@/components/shared/NewsSidebar";
import { getHomepageNews, getNewsByCategory } from "@/api/newsApi";
import { buildMediaUrl } from "@/data/newsData";
import { useEffect, useState } from "react";
import read from "../../assets/read.png";
import PMCIcon from "../../assets/PMC-Icon.png";
import VssIcon from "../../assets/VSS-Icon.png";
import IlmIcon from "../../assets/ILM-Icon.png";
import feature1 from "@/assets/feature-1.png";
import feature2 from "../../assets/feature-2.png";
import feature7 from "../../assets/feature-7.png";
import feature8 from "../../assets/feature-8.png";
import feature10 from "../../assets/feature--10.png";
import animatedgif from "@/assets/Animated-Cover.gif";
import animatedgifmobile from "@/assets/Animated-Cover-mobile.gif";

const Home = () => {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await getHomepageNews();
        // const filteredNews = response.data.filter(
        //   (item) => item.is_featured === true,
        // );
        const filteredNews = response.data.filter(
          (item) => item.is_featured === true || item.is_featured === 1,
        );
        if (filteredNews.length > 0) {
          const mappedNews = filteredNews.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.short_description || item.content,
            type: item.news_type,
            date: item.published_date,
            program: item.enrollment_category,
            announcement: item.highlight_type,
            slug: item.slug,
            media_urls: Array.isArray(item.media)
              ? item.media.map(buildMediaUrl)
              : [],
          }));
          if (mappedNews.length > 3) {
            setNews(mappedNews.slice(0, 3));
          } else {
            setNews(mappedNews);
          }
        } else {
          setNews([]);
        }

      } catch (error) {
        console.error("Failed to fetch PMC news:", error);
        setNews([]);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="home-container">
      {/* Hero Banner section with image */}
      {/* <section className="hero-banner relative  pb-10 md:pt-10 md:p-0 md:h-130  flex-col flex justify-start items-center">
        <img src={animatedgifmobile} alt="" className="md:hidden mb-10" />
        <img
          src={animatedgif}
          alt=""
          className="hidden md:block md:absolute md:top-0 md:bottom-0 md:left-0 md:right-0 h-full w-full md:z-10 object-cover  "
        />
        <div className="container ">
          <div className="hero-banner-content md:absolute top-1/2 md:-translate-y-1/2 flex flex-col items-start max-w-2xl md:z-20">
            <div className="caption bg-[#ffeaec] border-l-4 text-left border-[#911325] md:w-max">
              <h3 className="text-[#990033] sm:text-xl text-lg font-bold px-4 py-1">
                Talent Deserves Opportunity. It's all free!
              </h3>
            </div>
            <div className="mt-4 hero-heading flex flex-col">
              <h1 className="md:text-[46px] sm:text-3xl text-xl text-left font-bold">
                Build Future Innovators with
              </h1>
              <span className="md:text-[66px] sm:text-[40px] text-2xl font-bold text-left">
                Virtual SundarSTEM
              </span>
            </div>
            <div className="hero-desc">
              <p className="m-0 md:text-2xl text-lg text-left">
                A nationwide online program in Mathematics, Computer Science,
                and English for Grades 5, 6 and 7.
              </p>
            </div>
            <div className="hero-btns mt-3 flex gap-3">
              <Link
                className="bg-gradient-to-tr from-[#b4091c] to-[#980212] sm:text-lg text-sm  text-white py-2 px-5 rounded font-semibold"
                to="/signup"
              >
                Apply Now
              </Link>
              <Link
                className="border-[#962232] border text-[#962232] py-2 sm:text-lg text-sm px-5 rounded font-semibold"
                to="/vss"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section> */}
      {/* Hero Section with News */}
      <section className="home-hero">
        <div className="container">
          <div className={news.length > 0 ? 'hero-with-news' : 'hero-without-news'}>
            <section id="programs" className="programs-section py-16">
              <h2 className="font-bold text-left md:text-[40px] text-3xl mb-6 md:mb-12 ml-1.5 ourProgram_txt">
                Our Programs
              </h2>

              <div className="programs-grid">
                {/* RMC */}
                <Link
                  to="/rmc"
                  className="program-card card-rmc bg-gradient-to-bl from-[#000074] to-[#0d0d8e]"
                >
                  <div className="cardICon_Details flex w-full justify-between">
                    <div className="rmc_details">
                      <h3 className="text-white font-light text-2xl">RMC</h3>
                      <p className="program-name text-[16px]">
                        (Regional Math Clubs)
                      </p>
                    </div>
                    <div className="card-icon">
                      <img
                        src={read}
                        alt=""
                        className="brightness-0 invert opacity-85 w-[60px] h-[60px] "
                      />
                      {/* <MapPin size={32} /> */}
                    </div>
                  </div>
                  <p className="program-desc text-lg">
                    Monthly school contests to build habits.
                  </p>
                  <br />
                  <span className="card-link text-sm">
                    Explore RMC <ArrowRight size={16} />
                  </span>
                </Link>

                {/* PMC */}
                <Link
                  to="/pmc"
                  className="program-card card-rmc bg-gradient-to-bl from-[#025020] via-[#066b2d] to-[#0c8137]"
                >
                  <div className="cardICon_Details flex w-full justify-between">
                    <div className="pmc-5">
                      <h3 className="text-white font-light text-2xl">PMC</h3>
                      <p className="program-name text-[16px]">
                        (Pakistan Math Contest)
                      </p>
                    </div>
                    <div className="card-icon">
                      <img
                        src={PMCIcon}
                        alt=""
                        className="w-[60px] h-[60px] "
                      />
                      {/* <Award size={32} /> */}
                    </div>
                  </div>
                  <p className="program-desc text-lg">
                    National contest for Grades 4 to 7 only.
                  </p>
                  <br />
                  <span className="card-link text-sm">
                    Explore PMC <ArrowRight size={16} />
                  </span>
                </Link>

                {/* VSS */}
                <Link
                  to="/vss"
                  className="program-card card-rmc bg-gradient-to-bl from-[#990213] to-[#ba0a1e]"
                >
                  <div className="cardICon_Details flex w-full justify-between">
                    <div className="vss_details">
                      <h3 className="text-white font-light text-2xl">VSS</h3>
                      <p className="program-name text-[16px]">
                        (Virtual SundarSTEM)
                      </p>
                    </div>
                    <div className="card-icon">
                      <img
                        src={VssIcon}
                        alt=""
                        className="w-[60px] h-[60px] object-contain "
                      />
                    </div>
                  </div>
                  <p className="program-desc text-lg">
                    Rigorous online program for top performers.
                  </p>
                  <span className="card-link text-sm">
                    Explore VSS <ArrowRight size={16} />
                  </span>
                </Link>
                {/* ILM (Highlighted) */}
                <Link
                  to="/ilm"
                  className="program-card card-rmc bg-gradient-to-bl from-[#996d00] to-[#c79826]"
                >
                  <div className="cardICon_Details flex w-full justify-between">
                    {/* <div className="featured-badge">
                        <CheckCircle size={14} />
                        <span>Free Access</span>
                      </div> */}

                    <div className="ilm_details">
                      <h3 className="text-white font-light text-2xl">ILM</h3>
                      <p className="program-name text-[16px]">(I Love Math)</p>
                    </div>
                    <div className="card-icon">
                      <img
                        src={IlmIcon}
                        alt=""
                        className="w-[60px] h-[60px] "
                      />
                      {/* <BookOpen size={32} /> */}
                    </div>
                  </div>
                  <p className="program-desc text-lg">
                    Interactive online practice designed for students with
                    instant feedback.
                  </p>
                  <span className="card-link text-sm">
                    Explore ILM <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
            </section>
            {news.length > 0 ? (<NewsSidebar news={news} title="Featured" />) : ('')}

          </div>
        </div>
      </section>

      {/* Learning Philosophy */}
      {/* <section className="py-16 bg-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-6">Learning Philosophy</h2>
          <p className="text-lg text-gray-700 max-w-4xl mx-auto">
            Focus on <strong>conceptual understanding</strong> and logical
            reasoning rather than rote memorization.
          </p>
        </div>
      </section> */}

      {/* Pathways to SundarSTEM School */}
      {/* <section className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-4">
            Pathways to SundarSTEM School
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
            SundarSTEM School offers two routes for talented students to join
            our rigorous Mathematics, Computer Science, and Robotics programs.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            // Route 1: VSS
            <div className="bg-white p-8 shadow-lg border-t-4 border-red-600 rounded-[25px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 flex items-center justify-center rounded-lg">
                  <Laptop className="text-red-600" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Route 1: VSS
                </h3>
              </div>
              <h4 className="text-lg font-semibold text-red-600 mb-3">
                Admission through Virtual STEM School
              </h4>
              <p className="text-gray-700 mb-4">
                Free online program for Grade 6 & 7 students. High-level
                training in Math, Computer Science, and English.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Three intakes per year:</strong> Spring, Summer, and
                Fall semesters.
              </p>

              // Intake Schedule
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-blue-50 p-3 text-center border border-blue-200">
                  <Calendar className="mx-auto mb-1 text-blue-600" size={16} />
                  <p className="text-sm font-semibold text-gray-900">Spring</p>
                  <p className="text-xs text-gray-600">January</p>
                </div>
                <div className="bg-orange-50 p-3 text-center border border-orange-200">
                  <Calendar
                    className="mx-auto mb-1 text-orange-600"
                    size={16}
                  />
                  <p className="text-sm font-semibold text-gray-900">Summer</p>
                  <p className="text-xs text-gray-600">May</p>
                </div>
                <div className="bg-green-50 p-3 text-center border border-green-200">
                  <Calendar className="mx-auto mb-1 text-green-600" size={16} />
                  <p className="text-sm font-semibold text-gray-900">Fall</p>
                  <p className="text-xs text-gray-600">September</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 border-l-4 border-blue-500 mb-3">
                <p className="text-sm text-gray-700">
                  <strong>Top-performing boys</strong> from VSS are offered
                  admission into <strong>SundarSTEM Middle School</strong> at
                  the end of each semester.
                </p>
              </div>
              <div className="bg-purple-50 p-4 border-l-4 border-purple-500">
                <p className="text-sm text-gray-700">
                  Best pathway for young students to join SundarSTEM School's
                  advanced track for middle school, leading to high school
                  Olympiad training.
                </p>
              </div>
            </div>

            // Route 2: PMC-5
            <div className="bg-white p-8 shadow-lg border-t-4 border-green-700 rounded-[25px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 flex items-center justify-center rounded-lg">
                  <Award className="text-green-700" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Route 2: PMC-5
                </h3>
              </div>
              <h4 className="text-lg font-semibold text-green-700 mb-3">
                Admission through Pakistan Math Contest 5
              </h4>
              <p className="text-gray-700 mb-4">
                Direct admission to <strong>top performers</strong> of PMC-5,
                Pakistan's prestigious nationwide mathematics competition.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Three PMC-5 contests per year:</strong> at the end of
                each semester.
              </p>

              // Contest Schedule
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-blue-50 p-3 text-center border border-blue-200">
                  <Calendar className="mx-auto mb-1 text-blue-600" size={16} />
                  <p className="text-sm font-semibold text-gray-900">Spring</p>
                  <p className="text-xs text-gray-600">January</p>
                </div>
                <div className="bg-orange-50 p-3 text-center border border-orange-200">
                  <Calendar
                    className="mx-auto mb-1 text-orange-600"
                    size={16}
                  />
                  <p className="text-sm font-semibold text-gray-900">Summer</p>
                  <p className="text-xs text-gray-600">May</p>
                </div>
                <div className="bg-green-50 p-3 text-center border border-green-200">
                  <Calendar className="mx-auto mb-1 text-green-600" size={16} />
                  <p className="text-sm font-semibold text-gray-900">Fall</p>
                  <p className="text-xs text-gray-600">September</p>
                </div>
              </div>

              <div className="bg-green-50 p-4 border-l-4 border-green-600">
                <p className="text-sm text-gray-700">
                  Identifies and celebrates outstanding young mathematical
                  talent across Pakistan, offering direct entry to SundarSTEM
                  School.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* <section className="why-virtualstem md:p-10 py-20 bg-white">
        <div className="container">
          <h1 className="section-heading text-center md:text-[40px] text-3xl font-bold">
            Why Virtual SundarSTEM ?
          </h1>
          <div className="features-columns flex flex-wrap gap-5 md:max-w-3xl pt-10 mx-auto justify-center">
            <div className="feature flex gap-5 bg-[rgb(249,249,249)] rounded-xl p-4 items-center md:max-w-[calc(50%-20px)] w-full">
              <div className="feature-icon p-[10px] bg-gradient-to-bl from-[#990213] to-[#ba0a1e] min-w-[60px] min-h-[50px] rounded-xl flex justify-center items-center">
                <img
                  src={feature1}
                  alt=""
                  className=" w-full h-full object-cover max-w-[30px] max-h-[30px]"
                />
              </div>
              <div className="feature-content">
                <h3 className="sm:text-[21px] text-lg font-medium">
                  Competitive Math
                </h3>
              </div>
            </div>
            <div className="feature flex gap-5 bg-[rgb(249,249,249)] rounded-xl p-4 items-center md:max-w-[calc(50%-20px)] w-full">
              <div className="feature-icon p-[10px] bg-gradient-to-bl from-[#990213] to-[#ba0a1e] min-w-[60px] min-h-[50px] rounded-xl flex justify-center items-center">
                <img
                  src={feature2}
                  alt=""
                  className="brightness-0 invert w-full h-full object-cover max-w-[30px] max-h-[30px]"
                />
              </div>
              <div className="feature-content">
                <h3 className="sm:text-[21px] text-lg font-medium ">
                  Learn Python, Scratch & problem-solving
                </h3>
              </div>
            </div>

            <div className="feature flex gap-5 bg-[rgb(249,249,249)] rounded-xl p-4 items-center md:max-w-[calc(50%-20px)] w-full">
              <div className="feature-icon p-[10px] bg-gradient-to-bl from-[#990213] to-[#ba0a1e] min-w-[60px] min-h-[50px] rounded-xl flex justify-center items-center">
                <img
                  src={feature7}
                  alt=""
                  className="brightness-0 invert w-full h-full object-cover max-w-[30px] max-h-[30px]"
                />
              </div>
              <div className="feature-content">
                <h3 className="sm:text-[21px] text-lg font-medium ">
                  Pathway to SundarSTEM Admission
                </h3>
              </div>
            </div>
            <div className="feature flex gap-5 bg-[rgb(249,249,249)] rounded-xl p-4 items-center md:max-w-[calc(50%-20px)] w-full">
              <div className="feature-icon p-[10px] bg-gradient-to-bl from-[#990213] to-[#ba0a1e] min-w-[60px] min-h-[50px] rounded-xl flex justify-center items-center">
                <img
                  src={feature8}
                  alt=""
                  className="brightness-0 invert w-full h-full object-cover max-w-[30px] max-h-[30px]"
                />
              </div>
              <div className="feature-content">
                <h3 className="sm:text-[21px] text-lg font-medium ">
                  STEM-Integrated English Learning
                </h3>
              </div>
            </div>

            <div className="feature flex gap-5 bg-[rgb(249,249,249)] rounded-xl p-4 items-center md:max-w-[calc(50%-20px)] w-full">
              <div className="feature-icon p-[10px] bg-gradient-to-bl from-[#990213] to-[#ba0a1e] min-w-[60px] min-h-[50px] rounded-xl flex justify-center items-center">
                <img
                  src={feature10}
                  alt=""
                  className="brightness-0 invert w-full h-full object-cover max-w-[30px] max-h-[30px]"
                />
              </div>
              <div className="feature-content">
                <h3 className="sm:text-[21px] text-lg font-medium ">
                  Rigorous Olympiad Preparation
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section> */}
    </div>
  );
};

export default Home;