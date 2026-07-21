// import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
// import { ArrowRight, GraduationCap } from "lucide-react";
// import "../marketing/ILM.css";
// import PageHeroSlider from "@/components/marketing/PageHeroSlider";
// import NewsSidebar from "@/components/shared/NewsSidebar";
// import { getNewsByCategory } from "@/api/newsApi";
// import { mapNewsSidebarItem } from "@/data/newsData";

// const ILM = () => {
//   const [isEnglish, setIsEnglish] = useState(true);
//   const [news, setNews] = useState([]);

//   useEffect(() => {
//     const fetchNews = async () => {
//       try {
//         const response = await getNewsByCategory("ILM");
//         const mappedNews = response.data.data.map(mapNewsSidebarItem);
//         setNews(mappedNews);
//       } catch (error) {
//         console.error("Failed to fetch ILM news:", error);
//         setNews([]);
//       }
//     };
//     fetchNews();
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* English Content Section */}
//       <div
//         className="english-content"
//         style={{ display: isEnglish ? "block" : "none" }}
//       >
//         <PageHeroSlider
//           pageType="ilm"
//           as="div"
//           className="aboutUs_headings ilm-hero ilm-heading text-center py-20"
//         >
//           <div className="max-w-[1400px] mx-auto px-4 md:px-8">
//           <div className={`hero-with-news-layout hero-with-news-layout-urdu ${news.length === 0 ? "no-news" : ""}`}>
//             <div className="hero-content-main ilm-content">
//               {/* Badge */}
//               <div className="flex justify-center mb-6">
//                 <div className="inline-flex items-center gap-2 bg-[linear-gradient(to_right,#be901d,#996d00)] text-white px-4 py-2 md:px-6 rounded-3xl">
//                   <span className="text-xs md:text-sm">Online Math Practice Platform</span>
//                 </div>
//               </div>
//               <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[64px] font-bold text-rmc-800 mb-6 !text-black">
//                 ILM - I Love Math
//               </h1>
//               <div className="mb-3">
//                 <button
//                   onClick={() => setIsEnglish(!isEnglish)}
//                   className="inline-flex items-center gap-2 bg-[#f3dfaf] text-sm text-[#845e00] px-3 py-1 rounded-3xl"
//                 >
//                   {isEnglish ? "Switch to Urdu" : "Switch to English"}
//                   <span className="p-1 bg-white rounded-full">
//                     <ArrowRight size={14} color="black" />
//                   </span>
//                 </button>
//               </div>
//               <div className="max-w-[1400px] mx-auto px-4 md:px-8">
//                 <div className="hero-content-main ilm-content mt-5">
//                   <div className="mb-8">
//                     <div className="text-justify">
//                       <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
//                         ILM is an abbreviation for "I Love Math," and in Urdu, ilm
//                         also means knowledge. The purpose of ILM is to create a
//                         platform where Pakistani elementary school children can
//                         practice mathematics at the highest contest level and
//                         compete on par with the best of their peers worldwide.
//                       </p>
//                       <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
//                         This software is available free of cost; all a student needs
//                         is a Chromebook, a tablet, or even a phone, along with a
//                         reasonable internet connection. The other essential
//                         ingredients are a love for mathematics and a passion to
//                         learn and excel.
//                       </p>
//                       <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
//                         It is our hope that somewhere across the country—in a small
//                         remote village or a little-known town—a ten-year-old child
//                         (boy or girl) will come across ILM and become deeply engaged
//                         with it. A few years later, what may emerge is another
//                         Khwarizmi, Maryam Mirzakhani, Ramanujan, or Newton. If that
//                         happens, all this effort will have been worth it.
//                       </p>
//                     </div>
//                   </div>

//                   <div className="text-center">
//                     <Link
//                       to="/login"
//                       className="inline-block bg-gradient-to-bl from-[#996d00] to-[#be901d] px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-bold text-white rounded-xl"
//                     >
//                       Start Practice Now
//                     </Link>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <NewsSidebar news={news} title="ILM News" theme="ilm" />
//           </div>
//           </div>
//         </PageHeroSlider>

//         {/* A Final Note for Students */}
//         <section className="py-8 md:py-15 bg-[#FBF6E6]">
//           <div className="container px-4">
//             <div className="section_mission !m-0 !mb-2 md:!mb-5">
//               <span className="font-bold text-xl md:text-2xl text-[#996d00] uppercase block text-center">
//                 Note for Students
//               </span>
//             </div>
//             <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
//               <div>
//                 <p className="text-base md:text-[21px] text-center">
//                   If you can't solve a problem right away, don't rush to look at
//                   the answer. Mark the problem and come back to it again later.
//                   Try thinking about it over several days. Only after you have
//                   truly tried your best should you check the solution.
//                   Struggling with a problem helps your brain grow stronger —
//                   just like exercise strengthens muscles.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Call to Action Section (English) */}
//         <section className="py-8 md:py-15 text-center bg-white">
//           <div className="container px-4">
//             <div className="text-white max-w-5xl mx-auto py-10 md:py-[50px] px-6 text-center rounded-4xl bg-gradient-to-bl from-[#996d00] to-[#be901d]">
//               <h2 className="text-xl md:text-3xl font-bold mb-6">
//                 Ready to Begin Your Mathematical Journey?
//               </h2>
//               <div className="flex flex-col sm:flex-row gap-4 justify-center">
//                 <Link
//                   to="/login"
//                   className="bg-white w-max mx-auto md:w-auto text-[#996d00] px-7 py-3 text-base md:text-lg font-bold rounded-xl"
//                 >
//                   Start Practice Now
//                 </Link>
//               </div>
//             </div>
//           </div>
//         </section>
//       </div>
//       {/* English Content Section End */}

//       {/* Urdu Content Section */}
//       <div
//         className="urdu-content"
//         style={{
//           display: isEnglish ? "none" : "block",
//           direction: isEnglish ? "ltr" : "rtl",
//         }}
//       >
//         <PageHeroSlider
//           pageType="ilm"
//           as="div"
//           className="aboutUs_headings ilm-hero ilm-heading text-center px-4 py-20"
//         >
//           {/*
//             NOTE: Added "hero-with-news-layout-fixed" class below.
//             This forces the grid to keep the SAME column order as English
//             (content = 1fr on the left, news sidebar = 400px on the right),
//             while the text inside each column still reads RTL.
//             See ILM.css additions below.
//           */}
//           <div className="max-w-[1400px] mx-auto px-4 md:px-8">
//           <div className={`hero-with-news-layout hero-with-news-layout-fixed ${news.length === 0 ? "no-news" : ""}`}>
//             <div className="hero-content-main ilm-content">
//               {/* Badge */}
//               <div className="flex justify-center mb-6">
//                 <div className="inline-flex items-center gap-2 bg-[linear-gradient(to_right,#be901d,#996d00)] text-white px-4 py-2 md:px-6 rounded-3xl">
//                   <span className="text-xs md:text-sm">Online Math Practice Platform</span>
//                 </div>
//               </div>
//               <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[64px] font-bold text-rmc-800 mb-6 !text-black text-center">
//                 ILM - I Love Math
//               </h1>
//               <div className="flex justify-center mb-3 [@media(min-width:769px)]:mb-0">
//                 <button
//                   onClick={() => setIsEnglish(!isEnglish)}
//                   className="inline-flex items-center gap-2 bg-[#f3dfaf] text-sm text-[#845e00] px-3 py-1 rounded-3xl"
//                 >
//                   {isEnglish ? "Switch to Urdu" : "Switch to English"}
//                   <span className="p-1 bg-white rounded-full">
//                     <ArrowRight size={14} color="black" />
//                   </span>
//                 </button>
//               </div>
//               <div className="max-w-[1400px] mx-auto px-4 md:px-8">
//                 <div className="hero-content-main ilm-content mt-5">
//                   <div className="mb-8">
//                     <div className="text-justify">
//                       <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
//                         ILM دراصل "I Love Math" (مجھے ریاضی سے محبت ہے) کا مخفف
//                         ہے—اور دلچسپ بات یہ ہے کہ اردو میں "علم" کا مطلب بھی دانش و
//                         آگہی ہے۔ ILM کا مقصد ایک ایسا پلیٹ فارم مہیا کرنا ہے جہاں
//                         پاکستان کے پرائمری سکول کے طلبہ ریاضی کی اعلیٰ ترین مقابلہ
//                         جاتی سطح پر مشق کر سکیں، اور دنیا بھر کے بہترین اپنے ہم عمر
//                         طلبہ کے شانہ بشانہ مقابلہ کرنے کے قابل ہوں۔
//                       </p>
//                       <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
//                         یہ سافٹ ویئر بالکل مفت دستیاب ہے۔ طالبِ علم کے لیے صرف ایک
//                         کروم بُک، ٹیبلیٹ یا عام موبائل فون اور مناسب ا انٹرنیٹ
//                         کنیکشن کافی ہے۔ اس کے علاوہ دو چیزیں اور بھی ضروری ہیں:
//                         ریاضی سے محبت اور سیکھنے، محنت کرنے اور آگے بڑھنے کا جذبہ۔
//                       </p>
//                       <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
//                         ہمیں امید ہے کہ ملک کے کسی کونے میں—کسی دور افتادہ گاؤں یا
//                         کم معروف قصبے میں—کوئی دس سالہ بچہ یا بچی ILM تک پہنچے، اس
//                         میں دلچسپی لے، اور اس پر باقاعدگی سےمشق کرے۔ پھر چند برسوں
//                         بعد ممکن ہے کہ ہمیں ایک اور الخوارزمی، مریم مرزاخانی،
//                         رامانوجن یا نیوٹن ابھرتا دکھائی دے۔ اگر ایسا ہو گیا تو یہ
//                         ساری کوشش یقیناً بھرپور معنی رکھتی ہوگی۔
//                       </p>
//                     </div>
//                   </div>

//                   <div className="text-center">
//                     <Link
//                       to="/login"
//                       className="inline-block bg-gradient-to-bl from-[#996d00] to-[#be901d] px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-bold text-white rounded-xl"
//                     >
//                       ابھی سیکھنا شروع کریں
//                     </Link>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <div className="ilm-news-sidebar">
//               <NewsSidebar news={news} title="ILM خبریں" theme="ilm" />
//             </div>
//           </div>
//           </div>
//         </PageHeroSlider>

//         {/* A Final Note for Students - Urdu */}
//         <section className="py-8 md:py-15 bg-[#FBF6E6]">
//           <div className="container px-4">
//             <div className="section_mission !m-0 !mb-2 md:!mb-5">
//               <span className="font-bold text-xl md:text-2xl text-[#be901d] block text-center">
//                 طلبہ کے لیے نوٹ
//               </span>
//             </div>
//             <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
//               <div className="pb-6">
//                 <p className="text-base md:text-[21px] text-center">
//                   اگر کوئی سوال فوراً حل نہ ہو تو جواب دیکھنے کی جلدی نہ
//                   کریں۔اگر کوئی سوال فوراً حل نہ ہو تو جواب دیکھنے کی جلدی نہ
//                   کریں۔ سوال پر نشان لگائیں اور کچھ دیر بعد دوبارہ واپس آئیں۔
//                   ممکن ہو تو اسے ایک نہیں، کئی دن ذہن میں رکھ کر مختلف زاویوں سے
//                   سوچیں۔ جب آپ واقعی اپنی پوری کوشش کر چکیں تب ہی حل دیکھیں۔ کسی
//                   مسئلے کے ساتھ جدوجہد کرنا دماغ کو مضبوط کرتا ہے—بالکل ویسے ہی
//                   جیسے ورزش پٹھوں کو مضبوط کرتی ہے۔
//                 </p>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Call to Action Section (Urdu) */}
//         <section className="py-8 md:py-16 p-4 md:p-6 text-center bg-white">
//           <div className="container px-4">
//             <div className="text-white max-w-5xl mx-auto py-10 md:py-[50px] px-6 text-center rounded-4xl bg-gradient-to-bl from-[#996d00] to-[#be901d]">
//               <h2 className="text-xl md:text-3xl font-bold mb-6">
//                 کیا آپ اپنے ریاضی کے سفر کا آغاز کرنے کے لیے تیار ہیں؟
//               </h2>
//               <div className="flex flex-col sm:flex-row gap-4 justify-center">
//                 <Link
//                   to="/login"
//                   className="bg-white w-max mx-auto md:w-auto text-[#996d00] px-7 py-3 text-base md:text-lg font-bold rounded-xl"
//                 >
//                   ابھی سیکھنا شروع کریں
//                 </Link>
//               </div>
//             </div>
//           </div>
//         </section>
//       </div>
//       {/* Urdu Content Section End */}
//     </div>
//   );
// };

// export default ILM;
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import "../marketing/ILM.css";
import PageHeroSlider from "@/components/marketing/PageHeroSlider";
import NewsSidebar from "@/components/shared/NewsSidebar";
import { getNewsByCategory } from "@/api/newsApi";
import { mapNewsSidebarItem } from "@/data/newsData";

const ILM = () => {
  const [isEnglish, setIsEnglish] = useState(true);
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await getNewsByCategory("ILM");
        const mappedNews = response.data.data.map(mapNewsSidebarItem);
        setNews(mappedNews);
      } catch (error) {
        console.error("Failed to fetch ILM news:", error);
        setNews([]);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* English Content Section */}
      <div
        className="english-content"
        style={{ display: isEnglish ? "block" : "none" }}
      >
        <PageHeroSlider
          pageType="ilm"
          as="div"
          className="aboutUs_headings ilm-hero ilm-heading text-center py-20"
        >
          <div className="max-w-[1400px] mx-auto px-4 md:px-8">
            <div
              className={`hero-with-news-layout hero-with-news-layout-urdu ${news.length === 0 ? "no-news" : ""}`}
            >
              <div className="hero-content-main ilm-content">
                {/* Badge */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-[linear-gradient(to_right,#be901d,#996d00)] text-white px-4 py-2 md:px-6 rounded-3xl">
                    <span className="text-xs md:text-sm">
                      Online Math Practice Platform
                    </span>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[64px] font-bold text-rmc-800 mb-6 !text-black">
                  ILM - I Love Math
                </h1>
                <div className="mb-3">
                  <button
                    onClick={() => setIsEnglish(!isEnglish)}
                    className="inline-flex items-center gap-2 bg-[#f3dfaf] text-sm text-[#845e00] px-3 py-1 rounded-3xl"
                  >
                    {isEnglish ? "Switch to Urdu" : "Switch to English"}
                    <span className="p-1 bg-white rounded-full">
                      <ArrowRight size={14} color="black" />
                    </span>
                  </button>
                </div>
                <div className="max-w-[1400px] mx-auto px-4 md:px-8">
                  <div className="hero-content-main ilm-content mt-5">
                    <div className="mb-8">
                      <div className="text-justify">
                        <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
                          ILM is an abbreviation for "I Love Math," and in Urdu,
                          ilm also means knowledge. The purpose of ILM is to
                          create a platform where Pakistani elementary school
                          children can practice mathematics at the highest
                          contest level and compete on par with the best of
                          their peers worldwide.
                        </p>
                        <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
                          This software is available free of cost; all a student
                          needs is a Chromebook, a tablet, or even a phone,
                          along with a reasonable internet connection. The other
                          essential ingredients are a love for mathematics and a
                          passion to learn and excel.
                        </p>
                        <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
                          It is our hope that somewhere across the country—in a
                          small remote village or a little-known town—a
                          ten-year-old child (boy or girl) will come across ILM
                          and become deeply engaged with it. A few years later,
                          what may emerge is another Khwarizmi, Maryam
                          Mirzakhani, Ramanujan, or Newton. If that happens, all
                          this effort will have been worth it.
                        </p>
                      </div>
                    </div>

                    <div className="text-center">
                      <Link
                        to="/login"
                        className="inline-block bg-gradient-to-bl from-[#996d00] to-[#be901d] px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-bold text-white rounded-xl"
                      >
                        Start Practice Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <NewsSidebar news={news} title="ILM News" theme="ilm" />
            </div>
          </div>
        </PageHeroSlider>

        {/* A Final Note for Students */}
        <section className="py-8 md:py-15 bg-[#FBF6E6]">
          <div className="container px-4">
            <div className="section_mission !m-0 !mb-2 md:!mb-5">
              <span className="font-bold text-xl md:text-2xl text-[#996d00] uppercase block text-center">
                Note for Students
              </span>
            </div>
            <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
              <div>
                <p className="text-base md:text-[21px] text-left">
                  If you can't solve a problem right away, don't rush to look at
                  the answer. Mark the problem and come back to it again later.
                  Try thinking about it over several days. Only after you have
                  truly tried your best should you check the solution.
                  Struggling with a problem helps your brain grow stronger —
                  just like exercise strengthens muscles.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Section (English) */}
        <section className="py-8 md:py-15 text-center bg-white">
          <div className="container px-4">
            <div className="text-white max-w-5xl mx-auto py-10 md:py-[50px] px-6 text-center rounded-4xl bg-gradient-to-bl from-[#996d00] to-[#be901d]">
              <h2 className="text-xl md:text-3xl font-bold mb-6">
                Ready to Begin Your Mathematical Journey?
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/login"
                  className="bg-white w-max mx-auto md:w-auto text-[#996d00] px-7 py-3 text-base md:text-lg font-bold rounded-xl"
                >
                  Start Practice Now
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
      {/* English Content Section End */}

      {/* Urdu Content Section */}
      <div
        className="urdu-content"
        style={{
          display: isEnglish ? "none" : "block",
          direction: isEnglish ? "ltr" : "rtl",
        }}
      >
        <PageHeroSlider
          pageType="ilm"
          as="div"
          className="aboutUs_headings ilm-hero ilm-heading text-center px-4 py-20"
        >
          <div className="max-w-[1400px] mx-auto px-4 md:px-8">
            <div
              className={`hero-with-news-layout hero-with-news-layout-fixed ${news.length === 0 ? "no-news" : ""}`}
            >
              <div className="hero-content-main ilm-content">
                {/* Badge */}
                <div className="flex justify-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-[linear-gradient(to_right,#be901d,#996d00)] text-white px-4 py-2 md:px-6 rounded-3xl">
                    <span className="text-xs md:text-sm">
                      Online Math Practice Platform
                    </span>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[64px] text-center font-bold text-rmc-800 mb-6 !text-black">
                  ILM - I Love Math
                </h1>
                <div className="flex justify-center mb-3 [@media(min-width:769px)]:mb-0">
                  <button
                    onClick={() => setIsEnglish(!isEnglish)}
                    className="inline-flex items-center gap-2 bg-[#f3dfaf] text-sm text-[#845e00] px-3 py-1 rounded-3xl"
                  >
                    {isEnglish ? "Switch to Urdu" : "Switch to English"}
                    <span className="p-1 bg-white rounded-full">
                      <ArrowRight size={14} color="black" />
                    </span>
                  </button>
                </div>
                <div className="max-w-[1400px] mx-auto px-4 md:px-8">
                  <div className="hero-content-main ilm-content mt-5">
                    <div className="mb-8">
                      <div className="text-justify">
                        <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
                          ILM دراصل "I Love Math" (مجھے ریاضی سے محبت ہے) کا
                          مخفف ہے—اور دلچسپ بات یہ ہے کہ اردو میں "علم" کا مطلب
                          بھی دانش و آگہی ہے۔ ILM کا مقصد ایک ایسا پلیٹ فارم
                          مہیا کرنا ہے جہاں پاکستان کے پرائمری سکول کے طلبہ
                          ریاضی کی اعلیٰ ترین مقابلہ جاتی سطح پر مشق کر سکیں،
                          اور دنیا بھر کے بہترین اپنے ہم عمر طلبہ کے شانہ بشانہ
                          مقابلہ کرنے کے قابل ہوں۔
                        </p>
                        <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
                          یہ سافٹ ویئر بالکل مفت دستیاب ہے۔ طالبِ علم کے لیے صرف
                          ایک کروم بُک، ٹیبلیٹ یا عام موبائل فون اور مناسب ا
                          انٹرنیٹ کنیکشن کافی ہے۔ اس کے علاوہ دو چیزیں اور بھی
                          ضروری ہیں: ریاضی سے محبت اور سیکھنے، محنت کرنے اور آگے
                          بڑھنے کا جذبہ۔
                        </p>
                        <p className="text-base md:text-[21px] mb-8 max-w-5xl mx-auto">
                          ہمیں امید ہے کہ ملک کے کسی کونے میں—کسی دور افتادہ
                          گاؤں یا کم معروف قصبے میں—کوئی دس سالہ بچہ یا بچی ILM
                          تک پہنچے، اس میں دلچسپی لے، اور اس پر باقاعدگی سےمشق
                          کرے۔ پھر چند برسوں بعد ممکن ہے کہ ہمیں ایک اور
                          الخوارزمی، مریم مرزاخانی، رامانوجن یا نیوٹن ابھرتا
                          دکھائی دے۔ اگر ایسا ہو گیا تو یہ ساری کوشش یقیناً
                          بھرپور معنی رکھتی ہوگی۔
                        </p>
                      </div>
                    </div>

                    <div className="text-center">
                      <Link
                        to="/login"
                        className="inline-block bg-gradient-to-bl from-[#996d00] to-[#be901d] px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-bold text-white rounded-xl"
                      >
                        ابھی سیکھنا شروع کریں
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ilm-news-sidebar">
                <NewsSidebar news={news} title="ILM خبریں" theme="ilm" />
              </div>
            </div>
          </div>
        </PageHeroSlider>

        {/* A Final Note for Students - Urdu */}
        <section className="py-8 md:py-15 bg-[#FBF6E6]">
          <div className="container px-4">
            <div className="section_mission !m-0 !mb-2 md:!mb-5">
              <span className="font-bold text-xl md:text-2xl text-[#be901d] block text-center">
                طلبہ کے لیے نوٹ
              </span>
            </div>
            <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
              <div className="pb-6">
                <p className="text-base md:text-[21px] text-right">
                  اگر کوئی سوال فوراً حل نہ ہو تو جواب دیکھنے کی جلدی نہ
                  کریں۔اگر کوئی سوال فوراً حل نہ ہو تو جواب دیکھنے کی جلدی نہ
                  کریں۔ سوال پر نشان لگائیں اور کچھ دیر بعد دوبارہ واپس آئیں۔
                  ممکن ہو تو اسے ایک نہیں، کئی دن ذہن میں رکھ کر مختلف زاویوں سے
                  سوچیں۔ جب آپ واقعی اپنی پوری کوشش کر چکیں تب ہی حل دیکھیں۔ کسی
                  مسئلے کے ساتھ جدوجہد کرنا دماغ کو مضبوط کرتا ہے—بالکل ویسے ہی
                  جیسے ورزش پٹھوں کو مضبوط کرتی ہے۔
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Section (Urdu) */}
        <section className="py-8 md:py-16 p-4 md:p-6 text-center bg-white">
          <div className="container px-4">
            <div className="text-white max-w-5xl mx-auto py-10 md:py-[50px] px-6 text-center rounded-4xl bg-gradient-to-bl from-[#996d00] to-[#be901d]">
              <h2 className="text-xl md:text-3xl font-bold mb-6">
                کیا آپ اپنے ریاضی کے سفر کا آغاز کرنے کے لیے تیار ہیں؟
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/login"
                  className="bg-white w-max mx-auto md:w-auto text-[#996d00] px-7 py-3 text-base md:text-lg font-bold rounded-xl"
                >
                  ابھی سیکھنا شروع کریں
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
      {/* Urdu Content Section End */}
    </div>
  );
};

export default ILM;
