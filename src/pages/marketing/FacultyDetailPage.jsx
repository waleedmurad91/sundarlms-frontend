import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Mail, User, UserRound } from "lucide-react";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";

function FacultyDetailPage() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");
    axios
      .get(`${apiUrl}/api/public/faculty/${id}`)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.data ?? res.data ?? null;
        setMember(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(err);
        setError("Unable to load faculty details. Please try again later.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div
          className="w-8 h-8 rounded-full border-4 animate-spin"
          style={{ borderColor: "#a51c30 transparent #a51c30 #a51c30" }}
        />
      </div>
    );
  }

  return (
    <>
      {/* <div className="aboutUs_headings faculty-hero text-center p-[80px] bg-[#f9f9f9]">
        <h1 className="text-3xl md:text-4xl lg:text-[64px] font-bold text-rmc-800 mb-6 !text-black">
          Faculty
        </h1>
        <p className="text-[21px] text-black mb-4 ">
          Excellence in Education and Research
        </p>
      </div> */}
      <div className="bg-[#f9f9f9] py-8 md:py-12">
        <div className="container">
          <Link
            className="flex items-center gap-2 max-w-4xl mx-auto mb-8 text-gray-500"
            to={"/faculty"}
          >
            {" "}
            <ArrowLeft /> Back to Faculty
          </Link>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-4xl mx-auto overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-stretch">
              {/* Image */}
              <div className="mx-auto md:mx-0 md:max-w-2/5">
                {member.image_url ? (
                  <img
                    src={buildBackendFileUrl(member.image_url)}
                    alt={member?.name ?? "Faculty"}
                    className="w-full md:w-[300px] h-[300px] object-contain "
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="w-full md:w-[300px] h-[300px] flex items-center justify-center">
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: "#ad474b" }}
                    >
                      <UserRound size={70} color="#ffffff" />
                    </div>
                  </div>
                )}
              </div>

              {/* Divider + content */}
              <div className="flex-1 p-6 md:p-0 md:ml-12 md:pt-8 border-b border-gray-300">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {member?.name}
                </h1>
                {member?.title && (
                  <p className="text-xl font-bold text-[#A51C30] mt-1">
                    {member.title}
                  </p>
                )}
                {member?.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-2 text-gray-500  text-lg mt-2 no-underline break-all"
                  >
                    <Mail size={18} />
                    {member.email}
                  </a>
                )}
              </div>
            </div>
            <div className="p-6">
              {member?.description && (
                <div
                  className="news-content ck-editor-text text-gray-500 leading-relaxed mt-6"
                  dangerouslySetInnerHTML={{ __html: member.description }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default FacultyDetailPage;
