import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import "../marketing/PMC5.css";
import prize1lg from "@/assets/1st.png";
import prize2lg from "@/assets/2nd.png";
import prize3lg from "@/assets/3rd.png";
import prize1sm from "@/assets/1st-small.png";
import prize2sm from "@/assets/2nd-small.png";
import prize3sm from "@/assets/3rd-small.png";
import prize4sm from "@/assets/4th-small.png";
import lahore from "@/assets/lahore.png";
import karachi from "@/assets/karachi.png";
import sahiwal from "@/assets/sahiwal.png";
import multan from "@/assets/multan.png";
import peshawar from "@/assets/peshawar.png";
import contestIcon from "@/assets/contest-icon2.png";
import homeIcon from "@/assets/round1-icon1.png";
import brainIcon from "@/assets/round1-icon2.png";
import clockIcon from "@/assets/round1-icon3.png";
import schoolIcon from "@/assets/round2-icon1.png";
import laptopIcon from "@/assets/round2-icon2.png";
import pmcregisterIcon from "@/assets/PMC-Icon.png";
import downloadIcon from "@/assets/PMC-download-icon.png";
import { InfoIcon } from "lucide-react";

const Prizes = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with News Sidebar */}
      <section className="pmc-prizes-hero py-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className={`hero-with-news-layout no-news`}>
            <div className="hero-content-main">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-[#01411C] text-white px-4 py-2 mb-6 rounded-3xl">
                  <span className="font-semibold">
                    National Math Competition
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  PMC Prizes
                </h1>
                <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                  Nuturing Pakistan's Brightest Minds
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-16 bg-white">
        <div className="max-w-[1000px] mx-auto px-4 md:px-8">
          <h2 className="text-[33px] font-bold text-black mb-4">
            PMC Prizes for Competition Date 23rd May 2026
          </h2>
          <p className="text-[20px] mb-4">
            Applicable for following competitions:
          </p>
          <div>
            <div className="bg-[#F2FFF6] py-4 px-6 mb-4 inline-block">
              <span className="font-bold text-black text-[21px] inline-block mr-2">
                PMC-4:
              </span>
              <span className="text-black text-[21px]">
                For boys and girls in 4th Grade
              </span>
            </div>
          </div>
          <div>
            <div className="bg-[#F2FFF6] py-4 px-6 mb-4 inline-block">
              <span className="font-bold text-black text-[21px] inline-block mr-2">
                PMC-5:
              </span>
              <span className="text-black text-[21px]">
                For boys and girls in 5th Grade
              </span>
            </div>
          </div>

          <div>
            <div className="bg-[#F2FFF6] py-4 px-6 mb-4 inline-block">
              <span className="font-bold text-black text-[21px] inline-block mr-2">
                PMC-7:
              </span>
              <span className="text-black text-[21px]">
                For boys and girls in 6th & 7th Grades
              </span>
            </div>
          </div>

          <h1 className="text-[33px] font-bold mb-4 mt-8 text-[#A51C2F]">
            Notes
          </h1>
          <div className="flex gap-3">
            <div>
              <div className="bg-[#F2FFF6] text-black text-[18px] font-bold p-2 h-[40px] w-[45px] inline-flex items-center justify-center">
                01
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[21px] text-black tracking-wide mb-5">
                All PMC competitions are held in <strong>two stages.</strong>
              </p>
              <p className="text-[21px] text-black tracking-wide mb-5">
                <strong>Stage 1</strong> is online on{" "}
                <strong>23rd May 2026.</strong>
              </p>
              <p className="text-[21px] text-black tracking-wide mb-5">
                <strong>Stage 2</strong> is a physical based on shortlisted
                students from <strong>Stage 1</strong>. Students who qualify for{" "}
                <strong>Stage 2</strong> will be notified of the location and
                date of the <strong>Stage 2</strong> competition.{" "}
                <strong>Stage 2</strong> winners will be invited to Sundar STEM
                School Lahore to receive{" "}
                <strong>prizes and certificates</strong>.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mb-3">
            <div>
              <div className="bg-[#F2FFF6] text-black text-[18px] font-bold p-2 h-[40px] w-[45px] inline-flex items-center justify-center">
                02
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[21px] text-black tracking-wide mb-5">
                <strong>Each student</strong> can <strong>only register</strong>{" "}
                in only one of the following <strong>categories</strong>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div>
              <div className="bg-[#F2FFF6] text-black text-[18px] font-bold p-2 h-[40px] w-[45px] inline-flex items-center justify-center">
                03
              </div>
            </div>
            <div className="mt-1">
              <p className="text-[21px] text-black tracking-wide mb-5">
                <strong>Registered students</strong> will automatically fall in{" "}
                <strong>Category A</strong> (Open Pakistan) unless their school
                is <strong>registered</strong> with a{" "}
                <strong>Regional Sundar Micro-Campus</strong>
              </p>
            </div>
          </div>

          <p className="text-[21px] text-black mb-5 mt-8">
            <strong>
              A - Open Pakistan Wide Category Sponsored by Sundar STEM School
              Main Campus:
            </strong>
          </p>
          <p className="text-[21px] text-black mb-5">
            Open Pakistan wide competition for PMC-4, PMC-5, and PMC-7 for boys
            and girls based in locations not included in "Regional Category".
          </p>

          <div className="flex gap-7 flex-col md:flex-row mt-[3rem]">
            <div className="flex-[33.33%] bg-[#F2FFF6] rounded-[25px] p-6">
              <p className="text-[20px] text-black mb-3 text-center">
                1st, 2nd, and 3rd positions
              </p>
              <div className="flex items-center justify-center">
                <img src={prize1lg} alt="1st" />
              </div>
              <div className="bg-white rounded-[25px] pt-[2rem] px-[25px] pb-[10px] mt-[-3rem]">
                <p className="text-[18px] text-gray-700">Rs.</p>
                <h1 className="text-[#025020] font-bold text-[20px] md:text-[40px] leading-5 text-center">
                  50, 000
                </h1>
                <p className="text-[18px] text-right text-gray-700">each</p>
              </div>
            </div>

            <div className="flex-[33.33%] bg-[#F2FFF6] rounded-[25px] p-6">
              <p className="text-[20px] text-black mb-3 text-center">
                4th to 10th positions
              </p>
              <div className="flex items-center justify-center">
                <img src={prize2lg} alt="1st" />
              </div>
              <div className="bg-white rounded-[25px] pt-[2rem] px-[25px] pb-[10px] mt-[-3rem]">
                <p className="text-[18px] text-gray-700">Rs.</p>
                <h1 className="text-[#025020] font-bold text-[20px] md:text-[40px] leading-5 text-center">
                  15, 000
                </h1>
                <p className="text-[18px] text-right text-gray-700">each</p>
              </div>
            </div>

            <div className="flex-[33.33%] bg-[#F2FFF6] rounded-[25px] p-6">
              <p className="text-[20px] text-black mb-3 text-center">
                11th to 15th positions
              </p>
              <div className="flex items-center justify-center">
                <img src={prize3lg} alt="1st" />
              </div>
              <div className="bg-white rounded-[25px] pt-[2rem] px-[25px] pb-[10px] mt-[-3rem]">
                <p className="text-[18px] text-gray-700">Rs.</p>
                <h1 className="text-[#025020] font-bold text-[20px] md:text-[40px] leading-5 text-center">
                  10, 000
                </h1>
                <p className="text-[18px] text-right text-gray-700">each</p>
              </div>
            </div>
          </div>

          <p className="text-[21px] text-black mb-5 mt-8">
            <strong>
              B- Regional Categories sponsored by Sundar STEM Micro-Campus:
            </strong>
          </p>
          <div className="max-w-5xl mx-auto mb-5">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Round 1 */}
              <div className=" p-8 shadow-lg border border-gray-100 rounded-2xl">
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={schoolIcon}
                      alt="home icon"
                      className="object-cover w-[20px] h-[20px]"
                    />
                    <span className="text-lg">Designated Test Centers</span>
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
            </div>
          </div>
          <p className="text-[21px] text-black mb-4">
            PMC-4, PMC-5, and PMC-7 for boys and girls based in the following
            locations:
          </p>
          <p className="text-[21px] text-black mb-2 flex gap-3 items-center">
            <img
              src={peshawar}
              alt="Peshawar"
              className="h-[45px] w-[45px] object-sacle-down"
            />
            Peshawar{" "}
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon size={16} className="text-gray-600 mt-2" />
              </TooltipTrigger>
              <TooltipContent>
                applicable to students from schools registered from Peshawar
                Areas
              </TooltipContent>
            </Tooltip>
          </p>
          <p className="text-[21px] text-black mb-2 flex gap-3 items-center">
            <img
              src={lahore}
              alt="Lahore"
              className="h-[45px] w-[45px] object-sacle-down"
            />
            Lahore South
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon size={16} className="text-gray-600 mt-2" />
              </TooltipTrigger>
              <TooltipContent>
                applicable to students from schools registered from Lahore South
                Areas
              </TooltipContent>
            </Tooltip>
          </p>
          <p className="text-[21px] text-black mb-2 flex gap-3 items-center">
            <img
              src={sahiwal}
              alt="Sahiwal"
              className="h-[45px] w-[45px] object-sacle-down"
            />
            Sahiwal
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon size={16} className="text-gray-600 mt-2" />
              </TooltipTrigger>
              <TooltipContent>
                applicable to students from schools registered from Sahiwal
                Areas
              </TooltipContent>
            </Tooltip>
          </p>
          <p className="text-[21px] text-black mb-2 flex gap-3 items-center">
            <img
              src={multan}
              alt="Multan"
              className="h-[45px] w-[45px] object-sacle-down"
            />
            Multan
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon size={16} className="text-gray-600 mt-2" />
              </TooltipTrigger>
              <TooltipContent>
                applicable to students from schools registered from Multan Areas
              </TooltipContent>
            </Tooltip>
          </p>
          <p className="text-[21px] text-black mb-2 flex gap-3 items-center">
            <img
              src={karachi}
              alt="Karachi"
              className="h-[45px] w-[45px] object-sacle-down"
            />
            Karachi
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon size={16} className="text-gray-600 mt-2" />
              </TooltipTrigger>
              <TooltipContent>
                applicable to students from schools registered from Karachi
                North Nazimabad Areas
              </TooltipContent>
            </Tooltip>
          </p>

          <div className="flex gap-7 flex-col md:flex-row mt-[3rem]">
            <div className="flex-[25%] bg-[#F2FFF6] rounded-[25px] p-6">
              <p className="text-[18px] text-black mb-3 text-center">
                1st position
              </p>
              <div className="flex items-center justify-center">
                <img src={prize1sm} alt="1st" />
              </div>
              <div className="bg-white rounded-[25px] pt-[2rem] px-[15px] pb-[10px] mt-[-2.4rem]">
                <p className="text-[18px] text-gray-700">Rs.</p>
                <h1 className="text-[#025020] font-bold text-[20px] md:text-[40px] leading-6 text-center">
                  50, 000
                </h1>
                <p className="text-[18px] text-right text-gray-700">each</p>
              </div>
            </div>

            <div className="flex-[25%] bg-[#F2FFF6] rounded-[25px] p-6">
              <p className="text-[18px] text-black mb-3 text-center">
                2nd position
              </p>
              <div className="flex items-center justify-center">
                <img src={prize2sm} alt="1st" />
              </div>
              <div className="bg-white rounded-[25px] pt-[2rem] px-[15px] pb-[10px] mt-[-2.4rem]">
                <p className="text-[18px] text-gray-700">Rs.</p>
                <h1 className="text-[#025020] font-bold text-[20px] md:text-[40px] leading-6 text-center">
                  15, 000
                </h1>
                <p className="text-[18px] text-right text-gray-700">each</p>
              </div>
            </div>

            <div className="flex-[25%] bg-[#F2FFF6] rounded-[25px] p-6">
              <p className="text-[18px] text-black mb-3 text-center">
                3rd position
              </p>
              <div className="flex items-center justify-center">
                <img src={prize3sm} alt="1st" />
              </div>
              <div className="bg-white rounded-[25px] pt-[2rem] px-[15px] pb-[10px] mt-[-2.4rem]">
                <p className="text-[18px] text-gray-700">Rs.</p>
                <h1 className="text-[#025020] font-bold text-[20px] md:text-[40px] leading-6 text-center">
                  10, 000
                </h1>
                <p className="text-[18px] text-right text-gray-700">each</p>
              </div>
            </div>

            <div className="flex-[25%] bg-[#F2FFF6] rounded-[25px] p-6">
              <p className="text-[18px] text-black mb-3 text-center">
                4th to 5th positions
              </p>
              <div className="flex items-center justify-center">
                <img src={prize4sm} alt="1st" />
              </div>
              <div className="bg-white rounded-[25px] pt-[2rem] px-[15px] pb-[10px] mt-[-2.4rem]">
                <p className="text-[18px] text-gray-700">Rs.</p>
                <h1 className="text-[#025020] font-bold text-[20px] md:text-[40px] leading-6 text-center">
                  5, 000
                </h1>
                <p className="text-[18px] text-right text-gray-700">each</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Prizes;
