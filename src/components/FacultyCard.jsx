import React from "react";
import { Link } from "react-router-dom";
import { Mail, UserRound } from "lucide-react";
import { buildBackendFileUrl } from "@/utils/BuildBackendFileUrl";



function FacultyCard({ member = {} }) {
  return (
    <Link
      to={`/faculty/${member?.id}`}
      className="faculty-card flex flex-col w-[100%] sm:w-[calc(50%-18px)] lg:w-[calc(25%-18px)] rounded-xl overflow-hidden border border-gray-200 no-underline text-inherit transition-transform duration-200 hover:-translate-y-1 hover:shadow-md"
    >
         {member.image_url ? (
        <img
          src={buildBackendFileUrl (member.image_url)}
          alt={member?.name ?? "Faculty"}
          className="w-[100%] h-[260px] object-contain"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.style.display = "none";
            e.currentTarget.nextSibling.style.display = "flex";
          }}
        />
      ) : null}

      <div
        className="w-[100%] h-[260px] items-center justify-center"
        style={{
          display: member.image_url ? "none" : "flex",
          backgroundColor: "#ad474b",
        }}
      >
        <UserRound size={70} color="#ffffff" />
      </div>
      <div className="faculty-card-content p-5  flex-1">
        <h1 className="font-bold text-2xl">{member?.name}</h1>
        {member?.title && (
          <p className="text-[#A51C30] font-semibold text-lg mt-1">{member.title}</p>
        )}
        {member?.email && (
          <p className="text-gray-500 text-[16px] mt-1 flex items-center gap-2 break-all">
            <Mail size={14}/> {member.email}
          </p>
        )}
      </div>
    </Link>
  );
}

export default FacultyCard;