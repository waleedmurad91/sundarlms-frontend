import React, { useEffect, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "../marketing/FacultyPage.css";
import FacultyCard from "@/components/FacultyCard";

const PER_PAGE = 12;

function FacultyPage() {
  const [pageContent, setPageContent] = useState({
    title: "",
    description: "",
  });
  const apiUrl = import.meta.env.VITE_API_URL;
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  //fetching the page title and description
  const fetchPageContent = async (pageKey) => {
    try {
      const res = await axios.get(`${apiUrl}/api/page-content/${pageKey}`);
      return res.data.data; // { id, page_key, title, description }
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  };

  useEffect(() => {
    fetchPageContent("faculty").then((data) => {
      if (data)
        setPageContent({ title: data.title, description: data.description });
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");
    axios
      .get(`${apiUrl}/api/public/faculty`, {
        params: { page, per_page: PER_PAGE },
      })
      .then((res) => {
        if (!isMounted) return;
        const payload = res.data?.data ?? res.data ?? {};
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setFaculty(list);
        setLastPage(Number(payload?.last_page ?? 1) || 1);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(err);
        setError("Unable to load faculty. Please try again later.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page]);

  const goToPage = (next) => {
    if (next < 1 || next > lastPage || next === page) return;
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="aboutUs_headings faculty-hero text-center p-[80px] bg-[#f9f9f9]">
        <h1 className="text-3xl md:text-4xl lg:text-[64px] font-bold text-rmc-800 mb-6 !text-black">
          {pageContent.title}
        </h1>
        <div
          className="text-[21px] text-black mb-4 ck-editor-text"
          dangerouslySetInnerHTML={{
            __html: pageContent.description,
          }}
        />
      </div>
      <section className="faculty-grid py-15">
        <div className="container">
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div
                className="w-8 h-8 rounded-full border-4 animate-spin"
                style={{ borderColor: "#a51c30 transparent #a51c30 #a51c30" }}
              />
            </div>
          ) : error ? (
            <div className="text-center text-lg text-gray-600 py-15">
              {error}
            </div>
          ) : faculty.length === 0 ? (
            <div className="text-center text-lg text-gray-600 py-15">
              No faculty available.
            </div>
          ) : (
            <>
              <div className="faculty-cards flex flex-wrap gap-6 items-stretch justify-center">
                {faculty.map((member) => (
                  <FacultyCard key={member?.id} member={member} />
                ))}
              </div>

              {lastPage > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:border-[#a51c30] hover:text-[#a51c30]"
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>

                  {Array.from({ length: lastPage }, (_, i) => i + 1).map(
                    (num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => goToPage(num)}
                        className={`w-9 h-9 rounded-md border text-sm font-semibold cursor-pointer ${
                          num === page
                            ? "bg-[#a51c30] text-white border-[#a51c30]"
                            : "border-gray-300 hover:border-[#a51c30] hover:text-[#a51c30]"
                        }`}
                      >
                        {num}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page === lastPage}
                    className="flex items-center gap-1 px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:border-[#a51c30] hover:text-[#a51c30]"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default FacultyPage;
