import axios from "axios";
import React, { useEffect, useState } from "react";
import { programColors, stripHtml } from "@/data/newsData";
import { Link } from "react-router-dom";
import contestIcon from "@/assets/contest-icon.png";
import resourceIcon from "@/assets/resource-icon.png";
import resultsIcon from "@/assets/results-icon.png";
import eventIcon from "@/assets/event-icon.png";
import updateIcon from "@/assets/updates-icon.png";
import { ArrowRight, Calendar, CalendarDays, Clock } from "lucide-react";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

function AllNews() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [typeFilters, setTypeFilters] = useState([]);
  const [allNews, setAllNews] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const newsTypeIcons = {
    contest: contestIcon,
    results: resultsIcon,
    update: updateIcon,
    resource: resourceIcon,
    event: eventIcon,
  };

  // function convertStorageUrl(url) {
  //   return url.replace(
  //     /(https?:\/\/[^/]+\/[^/]+\/)public\/\/storage\//,
  //     "$1storage/app/public/",
  //   );
  // }

  function isImageUrl(url) {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(url);
  }

  function checkUrl(id) {
    const news = allNews.find((news) => news.id === id);
    if (!news) return null;

    const url = news.media_urls.find((url) => isImageUrl(url));
    if (!url) return null;

    // return convertStorageUrl(url);
    return url;
  }

  //fetch news when filter applied
  useEffect(() => {
    setPage(1);
    fetchNews(1, false);
  }, [selectedType, selectedCategory]);

  // fetch the news function
  const fetchNews = async (pageNum, append) => {
    try {
      const params = { page: pageNum };
      if (selectedType) params.category = selectedType;
      if (selectedCategory) params.type = selectedCategory;

      const res = await axios.get(`${apiUrl}/api/news`, { params });
      const newItems = res.data.data.data;
      if (append) {
        setAllNews((prev) => [...prev, ...newItems]);
      } else {
        setAllNews(newItems);
      }
      setCategoryFilters(res.data.filters.options.category);
      setTypeFilters(res.data.filters.options.type);
      const { current_page, last_page } = res.data.data;
      setHasMore(current_page < last_page);
    } catch (err) {
      console.log(err);
    }
  };

  // slice the news
  const sliceDescription = (text, wordLimit = 40) => {
    const plain = stripHtml(text);
    const words = plain.split(" ");
    if (words.length <= wordLimit) return plain;
    return words.slice(0, wordLimit).join(" ") + "....";
  };

  // parse a published_date (handles 6-digit microsecond ISO strings like
  // "2026-06-01T19:00:00.000000Z" which some browsers fail to parse)
  const parseDate = (value) => {
    if (!value) return null;
    // trim fractional seconds to 3 digits so Date can parse it everywhere
    const normalized = value.replace(/(\.\d{3})\d+/, "$1");
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value) => {
    const date = parseDate(value);
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    const date = parseDate(value);
    if (!date) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // pagination function
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, true);
  };

  return (
    <>
      {/* Hero section */}
      <div className="aboutUs_headings  aboutus-hero text-center p-[80px] bg-[#f9f9f9]">
        <h1 className="text-3xl md:text-4xl lg:text-[64px] font-bold text-rmc-800 mb-6 !text-black">
          News & Stories
        </h1>
        <p className="text-[21px] text-black mb-4 ">
          Explore the latest competitions, resources, and updates from Virtual
          SundarSTEM.
        </p>
      </div>

      {/* Filters */}
      <section className="pt-8 md:pt-15">
        <div className="container">
          <div className="flex flex-col max-w-5xl mx-auto md:flex-row justify-between items-start  gap-5 md:gap-0 md:items-center">
            <div className="flex flex-col gap-3 justify-start items-start">
              <h3 className="uppercase font-bold text-xl">Program Type</h3>
              <div className="flex gap-3 flex-wrap">
                <button
                  className={`border border-black px-4 text-sm leading-none py-2 font-semibold text-center   cursor-pointer rounded-full ${selectedType === "" ? "text-white bg-black" : "bg-white text-black"}`}
                  onClick={() => {
                    setSelectedType("");
                  }}
                >
                  All
                </button>
                {categoryFilters.map((e) => {
                  return (
                    <button
                      key={e.value}
                      className={`border border-[${programColors[e.value]}] px-4 text-sm leading-none py-2 font-semibold text-center   cursor-pointer rounded-full 
                    ${selectedType === e.value ? `text-white ` : `text-[${programColors[e.value]}]`}`}
                      style={{
                        borderColor: programColors[e.value],
                        backgroundColor:
                          selectedType === e.value
                            ? programColors[e.value]
                            : "transparent",
                      }}
                      onClick={() => {
                        setSelectedType(e.value);
                      }}
                    >
                      {e.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3 justify-start items-start">
              <h3 className="uppercase font-bold text-xl">Category</h3>
              <div className="flex gap-3 flex-wrap">
                <button
                  className={`border border-gray-400 px-4 text-sm leading-none py-1 font-semibold text-center  cursor-pointer capitalize rounded-full ${selectedCategory === "" ? `text-white bg-black` : `bg-white text-gray-400`}`}
                  onClick={() => {
                    setSelectedCategory("");
                  }}
                >
                  All
                </button>
                {typeFilters.map((e) => {
                  return (
                    <button
                      key={e.value}
                      className={`flex items-center justify-center gap-1 border border-gray-400 px-4 text-sm leading-none py-1 font-semibold text-center  cursor-pointer capitalize rounded-full ${selectedCategory === e.value ? `text-white bg-black` : `bg-white text-gray-400`}`}
                      onClick={() => {
                        setSelectedCategory(e.value);
                      }}
                    >
                      <img
                        src={newsTypeIcons[e.value]}
                        alt={e.label}
                        className={`${selectedCategory === e.value ? "invert" : ""}`}
                      />
                      <span>{e.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News Grid */}
      <section className="pb-8 pt-3 md:pb-15 md:pt-6 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 max-w-5xl mx-auto gap-8">
            {allNews.length > 0 ? (
              allNews.map((news) => {
                const imageUrl =
                  news.media?.length > 0
                    ? buildBackendFileUrl(news.media[0])
                    : null;

                return (
                  <Link to={`/newspage/${news.slug}`} key={news.id}>
                    <div className="flex flex-col md:flex-row items-stretch rounded-xl overflow-hidden group border border-gray-300">
                      {/* Image */}
                      {imageUrl && (
                        <div className="md:w-[35%] h-[220px] overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={`${news.news_type} image`}
                            className="w-full h-full object-contain group-hover:scale-105 transition-all duration-250 ease-in"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex flex-col py-5 px-5 md:px-10 w-full">
                        <div className="flex justify-center md:justify-between items-start md:items-end w-full mb-5 flex-col md:flex-row gap-3 md:gap-0 group-hover:scale-105 transition-all duration-250 ease-in">
                          <div className="flex gap-1 items-stretch">
                            <div
                              className="flex justify-center items-center px-4 font-semibold py-1 text-white text-sm rounded-full"
                              style={{
                                backgroundColor:
                                  programColors[news.enrollment_category] ||
                                  "gray",
                              }}
                            >
                              {news.enrollment_category}
                            </div>
                            <div className="flex justify-center gap-1 items-center text-gray-600 bg-gray-200 px-4 font-semibold py-1 text-sm rounded-full capitalize">
                              <img
                                src={newsTypeIcons[news.news_type]}
                                alt={news.news_type}
                              />
                              {news.news_type}
                            </div>
                          </div>
                          <div className="md:ml-auto text-sm text-right flex gap-2 items-center">
                            <div className="flex items-center gap-1">
                              <Clock size={14} /> {formatTime(news.created_at)}
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarDays size={14} />{" "}
                              {formatDate(news.created_at)}
                            </div>
                          </div>
                        </div>

                        <h3 className="text-xl font-bold mb-2 group-hover:scale-105 transition-all duration-250 ease-in">
                          {news.title}
                        </h3>
                        <p className="text-lg mb-2 group-hover:scale-105 transition-all duration-250 ease-in">
                          {sliceDescription(news.content, 40)}
                        </p>

                        {/* ✅ span instead of Link — the whole card is already a link */}
                        <span className="text-[16px] gap-[5px] mt-auto flex items-center leading-none text-[#a51c30] justify-end w-full">
                          Read More
                          <ArrowRight
                            size={18}
                            strokeWidth={3}
                            className="text-[#a51c30]"
                          />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-xl py-15 md:py-0">No news found</div>
            )}
          </div>
        </div>
      </section>

      {hasMore && (
        <div className="pb-10 flex justify-center items-center">
          <button
            onClick={loadMore}
            className="border-2 border-[#C90016] text-[#C90016] px-8 py-4 rounded text-xl cursor-pointer font-semibold"
          >
            Load More Updates
          </button>
        </div>
      )}
    </>
  );
}

export default AllNews;
