import React from "react";
import "./AboutUs.css";
import { BookOpen, Check, CheckCircle, Code, FileText } from "lucide-react";
import rmcIcon from "../../assets/read.png";
import pmcIcon from "../../assets/PMC-Icon.png";
import vssIcon from "../../assets/VSS-Icon.png";
import ilmIcon from "../../assets/ILM-Icon.png";

const AboutUs = () => {
  return (
    <div className="parent">
      <div className="aboutUs_headings aboutus-hero text-center p-[80px] bg-[#f9f9f9]">
        {/* <div className="inline-block bg-[#000080] text-white px-4 py-2 text-sm font-semibold mb-4 rounded-4xl justify-center">
          WHO WE ARE
        </div> */}
        <h1 className="text-3xl md:text-4xl lg:text-[64px] font-bold text-rmc-800 mb-6 !text-black">
          About Us
        </h1>
        <p className="text-[21px] text-black mb-4 ">
          Nurturing Pakistan's Brightest Minds
        </p>
      </div>
      <div className="ourMission py-8 md:py-15">
        <div className="container">
          <div className="section_mission !m-0 !mb-2  md:!mb-5  ">
            <span className="font-bold text-2xl text-[#a51c30] text-center">
              OUR MISSION
            </span>
          </div>
          <div className="ourMission_para text-lg md:text-xl text-black leading-relaxed  text-center max-w-5xl mx-auto">
            <p className="pompara ">
              SundarSTEM is a school focused on math and sciences, and its
              mission is to identify exceptionally talented students in the
              country and bring them at par with their peers worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* VSS */}
      <div className="our-initiative bg-[#fff0f2]">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-15">
          <div className=" science-of-learning !m-0 !mb-2  md:!mb-5">
            <span className=" px-4 text-2xl font-bold text-[#a51c30] text-center">
              Virtual SundarSTEM (VSS)
            </span>
          </div>

          <p className="text-center text-lg md:text-xl pompara">
            VSS is a rigorous, free online evening program that exposes students
            to a comprehensive one-year curriculum in competitive mathematics,
            competitive programming, and analytical English. Functioning as a
            supplementary course alongside regular schooling, this year-long
            program is specifically designed to boost critical thinking, logical
            reasoning, and advanced problem-solving capabilities.
          </p>
        </div>
      </div>

      {/* Our Initiative */}
      <div className="our-initiative bg-[#f9fafb]">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-15">
          <div className=" science-of-learning !m-0 !mb-2  md:!mb-5">
            <span className=" px-4 text-2xl font-bold text-[#a51c30] text-center">
              CONCURRENT INITIATIVES
            </span>
          </div>

          <p className="text-center text-lg md:text-xl mb-10 pompara">
            With this goal in view, SundarSTEM has launched the following
            initiatives, all of which are free of cost:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* //Card 1 */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-8 py-6">
                <div className="initiative-card-header flex gap-4 items-center mb-3">
                  <div className="flex justify-center items-center p-2 rounded-xl bg-[#000073] ">
                    <img
                      src={rmcIcon}
                      alt="RMC Icon"
                      className="w-7 h-7 object-contain brightness-0 invert"
                    />
                  </div>

                  <h3 className="text-[21px] font-serif font-bold ">
                    Regional Math Clubs (RMC)
                  </h3>
                </div>
                <p className="text-[16px] leading-relaxed text-justify">
                  RMC operates with the motive of turning mathematics into an
                  engaging club activity through monthly competitions for Grade
                  5 students across a network of member schools. This initiative
                  culminates in the pinnacle National Math Contest, where the
                  top four members from each club advance to compete for
                  exciting prizes, awards, and official certificates.
                </p>
              </div>
            </div>

            {/* //Card 2  */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-8 py-6">
                <div className="initiative-card-header flex gap-4 items-center mb-3">
                  <div className="flex justify-center items-center  p-2 rounded-xl bg-[#055e26]">
                    <img
                      src={pmcIcon}
                      alt="PMC Icon"
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  <h3 className="text-[21px] font-serif font-bold ">
                    Pakistan Math Contest (PMC)
                  </h3>
                </div>
                <p className="text-[16px] leading-relaxed text-justify">
                  The PMC is a nationwide competition where students in Grades 4
                  through 7 can showcase their mathematical skills and IQ
                  potential. This is a two-round contest, featuring an online
                  first round followed by a physical second round. Top
                  performers are eligible for significant incentives, including
                  cash prizes, a free online course at Virtual SundarSTEM,
                  direct admission opportunities to SundarSTEM, and the chance
                  to receive fully sponsored participation in international
                  mathematics contests.
                </p>
              </div>
            </div>

            {/* //Card 3  */}
            {/* <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-8 py-6">
                <div className="initiative-card-header flex gap-4 items-center mb-3">
                  <div className="flex justify-center items-center p-2  rounded-xl bg-[#a10415]">
                    <img
                      src={vssIcon}
                      alt="VSS Icon"
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  <h3 className="text-[21px] font-serif font-bold ">
                    Virtual SundarSTEM (VSS)
                  </h3>
                </div>
                <p className="text-[16px] leading-relaxed text-justify">
                  Virtual Stem School Students in Grades 5, 6 & 7 study Math, CS
                  & English in the evening though online sessions. Students are
                  selected through Math tests.
                </p>
              </div>
            </div> */}

            {/* //Card 4 */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden md:col-span-2 md:w-1/2 md:mx-auto">
              <div className="px-8 py-6">
                <div className="initiative-card-header flex gap-4 items-center mb-3">
                  <div className="flex justify-center items-center p-2 rounded-xl bg-[#b18413]">
                    <img
                      src={ilmIcon}
                      alt="ILM Icon"
                      className="w-7 h-7 object-contain"
                    />
                  </div>
                  <h3 className="text-[21px] font-serif font-bold">
                    I Love Math (ILM) Platform
                  </h3>
                </div>
                <p className="text-[16px] leading-relaxed text-justify">
                  The ILM platform is a free digital practice tool designed to
                  help elementary students perform outstandingly in mathematics
                  contests. Hosting over 7,000 Olympiad-style problems, the
                  platform is now supported by daily live instruction from 4:00
                  PM to 6:00 PM, allowing students to join live classes and
                  receive direct assistance while practicing on the platform.
                </p>
              </div>
            </div>
          </div>
          {/* <p className="text-center text-lg md:text-xl mt-12 mb-8 pompara">
            With this goal in view, SundarSTEM has launched the following
            initiatives, all of which are free of cost:
          </p> */}
        </div>
      </div>

      <div className="ourMission py-8 md:py-15 bg-white">
        <div className="container">
          <div className=" science-of-learning !m-0 !mb-2  md:!mb-5">
            <span className=" px-4 text-2xl font-bold text-[#a51c30] text-center">
              SCIENCE OF LEARNING
            </span>
          </div>
          <h2 className="!text-3xl !md:text-[40px] font-bold text-center mb-3 customHeadings">
            The Power of Mathematics
          </h2>
          <div className="ourMission_para text-lg text-[#0a0a0a] leading-relaxed text-center max-w-5xl mx-auto">
            <div className="">
              <p className="text-lg md:text-xl text-[#0a0a0a] text-justify my-6 pompara">
                Using brain scans such as MRI, scientists have discovered that
                learning to read and write, and doing math changes the brain in
                lasting ways.
              </p>
              <p className="text-lg md:text-xl text-[#0a0a0a] text-justify my-6 pompara">
                Learning to read and write are like building a super-fast train
                between the part that sees words and the part that understands
                language. Before learning to read, the brain had only small dirt
                paths.
              </p>
              <p className="text-lg md:text-xl text-[#0a0a0a] text-justify my-6 pompara">
                Mathematics works in a different way. It is like improving a big
                highway system that already exists in the brain by adding new
                roads, bridges, and connections. One of the greatest gifts of
                math is that it teaches the brain how to think. Math helps
                students learn how to reason, spot patterns, think logically,
                and solve hard problems. These skills are very important in
                science, technology, and everyday life.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Philosophy */}
      <section className="philosophy-section py-8 md:py-15 bg-[#f9fafb]">
        <div className="container">
          <div className="section_mission !m-0 !mb-2  md:!mb-5  ">
            <span className="font-bold text-2xl text-[#a51c30] text-center uppercase ">
              Learning Philosophy
            </span>
          </div>
          <p className="text-lg md:text-xl text-black text-center">
            Focus on
            <span className="font-semibold">
              &nbsp;conceptual understanding
            </span>{" "}
            and logical reasoning rather than rote memorization.
          </p>
        </div>
      </section>

      {/* Delivery and support */}
      {/* <div className="bg-white py-8 md:py-15">
        <div className="container">
          <div className="section_mission !m-0 !mb-2  md:!mb-5  ">
            <span className="font-bold mx-2 text-2xl text-[#a51c30] text-center">
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
      </div> */}

      {/* Curriculum & Delivery */}
      {/* <section className="py-16 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            Curriculum
          </h2>
          <p className="text-lg text-center text-gray-600 mb-12">
            A comprehensive 16-month journey
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-[#000080] p-6 border-l-4 border-l-[#000080] rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="text-[#000080]" size={24} />
                <h3 className="font-bold text-xl">Mathematics (AoPS)</h3>
              </div>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>
                  <span className="font-semibold">Semester 1:</span> Prealgebra
                </li>
                <li>
                  <span className="font-semibold">Semester 2:</span> Intro to
                  Algebra A; Counting & Probability
                </li>
                <li>
                  <span className="font-semibold">Semester 3:</span> Intro to
                  Algebra B; Number Theory
                </li>
                <li>
                  <span className="font-semibold">Semester 4:</span> Intro to
                  Geometry
                </li>
              </ul>
            </div>
            <div className="border border-[#000080] p-6 border-l-4 border-l-[#000080] rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Code className="text-[#000080]" size={24} />
                <h3 className="font-bold text-xl">Computer Science</h3>
              </div>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>
                  <span className="font-semibold">Semester 1:</span> Scratch +
                  Intro to Programming (Python)
                </li>
                <li>
                  <span className="font-semibold">Semester 2:</span>{" "}
                  Intermediate Programming (Python)
                </li>
                <li>
                  <span className="font-semibold">Semester 3:</span> Intro to
                  Competitive Programming (C++)
                </li>
                <li>
                  <span className="font-semibold">Semester 4:</span>{" "}
                  Intermediate Competitive Programming (C++)
                </li>
              </ul>
            </div>
            <div className="border border-[#000080] p-6 border-l-4 border-l-[#000080] rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="text-[#000080]" size={24} />
                <h3 className="font-bold text-xl">English</h3>
              </div>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>
                  <span className="font-semibold">Semester 1:</span> Basic
                  communication, vocabulary, everyday scenarios
                </li>
                <li>
                  <span className="font-semibold">Semester 2:</span> Opinions,
                  discussions, analyzing texts, critical thinking
                </li>
                <li>
                  <span className="font-semibold">Semester 3:</span> Advanced
                  discussions, debates, persuasive writing
                </li>
                <li>
                  <span className="font-semibold">Semester 4:</span> Research,
                  professional communication, TED Talks
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section> */}

      {/* Brighter Future */}
      <div className="px-4 mb-15 mt-4 md:mt-15">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-5 max-w-5xl mx-auto py-[50px] brighterFuture bg-gradient-to-bl from-[#980212] to-[#c00c20] rounded-4xl">
          <h2 className="text-3xl font-bold text-center customHeadings text-white">
            Brighter Future
          </h2>
          <div className="px-15  brighterFuture_box">
            <p className="text-lg md:text-xl text-white text-center  pompara">
              Learning strong math skills at a young age is a gift that lasts a
              lifetime. Participating diligently in the above mentioned
              platforms has the power to change a student’s future. We encourage
              every student to work hard and make the most of it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
