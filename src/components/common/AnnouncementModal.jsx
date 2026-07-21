// import { useState, useEffect } from "react";
// import { useLocation } from "react-router-dom";

// const AnnouncementModal = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const location = useLocation();

//   // Show on initial load
//   useEffect(() => {
//     setIsOpen(true);
//   }, []);

//   // Re-show whenever the user navigates to /login
//   useEffect(() => {
//     if (location.pathname === "/login") {
//       setIsOpen(true);
//     }
//   }, [location.pathname]);

//   if (!isOpen) return null;

//   return (
//     <div
//       className="announcement-overlay"
//       onClick={() => setIsOpen(false)}
//       style={{
//         position: "fixed",
//         inset: 0,
//         zIndex: 99999,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         backgroundColor: "rgba(0, 0, 0, 0.65)",
//         padding: "12px",
//         overflowY: "auto",
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           backgroundColor: "#ffffff",
//           borderRadius: "12px",
//           boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
//           maxWidth: "600px",
//           width: "100%",
//           display: "flex",
//           flexDirection: "column",
//           maxHeight: "calc(100vh - 24px)",
//           fontFamily: "inherit",
//           margin: "auto",
//         }}
//       >
//         {/* Header — sticky, never scrolls away */}
//         <div
//           style={{
//             background: "linear-gradient(135deg, #7C1424 0%, #A51C30 100%)",
//             padding: "16px 20px",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             borderRadius: "12px 12px 0 0",
//             flexShrink: 0,
//           }}
//         >
//           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//             <span style={{ fontSize: "20px" }}>📢</span>
//             <h2
//               style={{
//                 color: "#ffffff",
//                 margin: 0,
//                 fontSize: "16px",
//                 fontWeight: "700",
//                 letterSpacing: "0.3px",
//               }}
//             >
//               Important Announcement
//             </h2>
//           </div>
//           <button
//             onClick={() => setIsOpen(false)}
//             aria-label="Close announcement"
//             style={{
//               background: "rgba(255,255,255,0.18)",
//               border: "none",
//               borderRadius: "50%",
//               width: "32px",
//               height: "32px",
//               cursor: "pointer",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               color: "#ffffff",
//               fontSize: "16px",
//               lineHeight: 1,
//               flexShrink: 0,
//               transition: "background 0.2s",
//             }}
//             onMouseEnter={(e) =>
//               (e.currentTarget.style.background = "rgba(255,255,255,0.32)")
//             }
//             onMouseLeave={(e) =>
//               (e.currentTarget.style.background = "rgba(255,255,255,0.18)")
//             }
//           >
//             ✕
//           </button>
//         </div>

//         {/* Scrollable body */}
//         <div
//           style={{
//             overflowY: "auto",
//             padding: "24px 20px 20px",
//             flex: 1,
//             WebkitOverflowScrolling: "touch",
//           }}
//         >
//           <p
//             style={{
//               margin: "0 0 14px",
//               fontSize: "14px",
//               lineHeight: "1.7",
//               color: "#1e293b",
//             }}
//           >
//             <strong>Dear Parents, Students, and School Administration,</strong>
//           </p>
//           <p
//             style={{
//               margin: "0 0 14px",
//               fontSize: "14px",
//               lineHeight: "1.7",
//               color: "#334155",
//             }}
//           >
//             The Pakistan Math Contest (PMC) will now be held over 4 days to help
//             prevent website overload and to make it easier for participants to
//             choose a suitable test date and time.
//           </p>
//           <p
//             style={{
//               margin: "0 0 14px",
//               fontSize: "14px",
//               lineHeight: "1.7",
//               color: "#334155",
//             }}
//           >
//             The test will be 1 hour long. Students can select their preferred
//             test date and time slot from the options below:
//           </p>
//           <ol
//             style={{
//               margin: "0 0 16px",
//               paddingLeft: "20px",
//               fontSize: "14px",
//               lineHeight: "1.7",
//               color: "#334155",
//             }}
//           >
//             <li style={{ marginBottom: "10px" }}>
//               <strong>1. Saturday, May 30th, 2026</strong>
//               <br />
//               (3 slots): 8:00 AM, 10:00 AM, and 1:00 PM
//             </li>
//             <li style={{ marginBottom: "10px" }}>
//               <strong>2. Wednesday, June 3rd, 2026</strong>
//               <br />
//               (3 slots): 8:00 AM, 10:00 AM, and 1:00 PM
//             </li>
//             <li style={{ marginBottom: "10px" }}>
//               <strong>3. Saturday, June 6th, 2026</strong>
//               <br />
//               (3 slots): 8:00 AM, 10:00 AM, and 1:00 PM
//             </li>
//             <li style={{ marginBottom: "0" }}>
//               <strong>4. Sunday, June 7th, 2026</strong>
//               <br />
//               (1 slot): 1:00 PM
//             </li>
//           </ol>
//           <p
//             style={{
//               margin: "0 0 8px",
//               fontSize: "14px",
//               lineHeight: "1.7",
//               color: "#1e293b",
//             }}
//           >
//             <strong>Important:</strong>
//           </p>
//           <p
//             style={{
//               margin: "0 0 14px",
//               fontSize: "14px",
//               lineHeight: "1.7",
//               color: "#334155",
//             }}
//           >
//             Students are requested to log in to the website below to select
//             their test date and time slot:
//           </p>
//           <p style={{ margin: "0 0 16px" }}>
//             <a
//               href="https://virtual.sundarstem.edu.pk/login"
//               target="_blank"
//               rel="noreferrer"
//               style={{
//                 fontSize: "14px",
//                 color: "#A51C30",
//                 fontWeight: "600",
//                 wordBreak: "break-all",
//               }}
//             >
//               virtual.sundarstem.edu.pk/login
//             </a>
//           </p>
//           <p
//             style={{
//               margin: "0 0 20px",
//               fontSize: "14px",
//               lineHeight: "1.7",
//               color: "#334155",
//             }}
//           >
//             Please use the student&apos;s Form-B number as the User ID and their
//             password to log in.
//           </p>

//           <p
//             style={{
//               fontSize: "14px",
//               lineHeight: "1.7",
//               color: "#334155",
//             }}
//           >
//             Watch this video to learn how to register and select your slot for
//             PMC.
//           </p>

//           <a
//             href="https://www.youtube.com/watch?v=YXLUZWRnIJY&feature=youtu.be"
//             target="_blank"
//             rel="noreferrer"
//             style={{
//               fontSize: "14px",
//               color: "#A51C30",
//               fontWeight: "600",
//               wordBreak: "break-all",
//             }}
//           >
//             https://youtu.be/YXLUZWRnIJY
//           </a>
//           <p
//             style={{
//               marginTop: "15px",
//               fontSize: "14px",
//               lineHeight: "1.6",
//               color: "#1e293b",
//             }}
//           >
//             Thank you,
//             <br />
//             <strong>Pakistan Math Contest Team</strong>
//           </p>
//         </div>

//         {/* Footer — sticky at bottom */}
//         <div
//           style={{
//             padding: "12px 20px 16px",
//             display: "flex",
//             justifyContent: "flex-end",
//             borderTop: "1px solid #f1f5f9",
//             flexShrink: 0,
//             borderRadius: "0 0 12px 12px",
//           }}
//         >
//           <button
//             onClick={() => setIsOpen(false)}
//             style={{
//               background: "linear-gradient(135deg, #7C1424 0%, #A51C30 100%)",
//               color: "#ffffff",
//               border: "none",
//               borderRadius: "8px",
//               padding: "10px 28px",
//               fontSize: "14px",
//               fontWeight: "600",
//               cursor: "pointer",
//               letterSpacing: "0.2px",
//               transition: "opacity 0.2s",
//               width: "100%",
//             }}
//             onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
//             onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AnnouncementModal;








import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Megaphone, X } from "lucide-react";
import axiosInstance from "@/api/axiosInstance";

const PAGE_KEY = "NewsPopUp";

const EXCLUDED_PATH_PREFIXES = [
  "/admin",
  "/staff",
  "/school",
  "/teacher",
  "/student",
  "/data-entry",
  "/reviewer",
];

const AnnouncementModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const isExcludedPath = (pathname) =>
    EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const checkAndShow = async () => {
    // Agar website directly kisi excluded path (admin/dashboard) par open hui, to modal show nahi hoga
    if (isExcludedPath(location.pathname)) {
      setIsOpen(false);
      setLoading(false);
      return;
    }

    try {
      const res = await axiosInstance.get(`/page-content/${PAGE_KEY}`);
      const data = res?.data?.data;
      if (data && Number(data.status) === 1) {
        setContent(data);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.error(err);
      }
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAndShow();
  }, []);

  if (loading || !isOpen || !content) return null;

  return (
    <>
      <style>{`
        .announcement-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.65);
          padding: 12px;
          overflow-y: auto;
        }

        .announcement-card {
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
          max-width: 480px;
          width: 100%;
          display: flex;
          flex-direction: column;
          max-height: 85vh;
          font-family: inherit;
          margin: auto;
        }

        .announcement-header {
          background: linear-gradient(135deg, #7C1424 0%, #A51C30 100%);
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 12px 12px 0 0;
          flex-shrink: 0;
          gap: 10px;
        }

        .announcement-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .announcement-header h2 {
          color: #ffffff;
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.3px;
          overflow-wrap: anywhere;
        }

        .announcement-close-btn {
          background: rgba(255, 255, 255, 0.18);
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .announcement-close-btn:hover {
          background: rgba(255, 255, 255, 0.32);
        }

        .announcement-body {
          overflow-y: auto;
          padding: 16px 20px;
          flex: 1;
          -webkit-overflow-scrolling: touch;
          font-size: 13.5px;
          line-height: 1.5;
          color: #334155;
          word-wrap: break-word;
        }

        .announcement-body::-webkit-scrollbar {
          width: 4px;
        }
        .announcement-body::-webkit-scrollbar-thumb {
          background: transparent;
        }
        .announcement-body:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
        }

        .announcement-body img {
          max-width: 100%;
          height: auto;
        }

        .announcement-body p {
          margin: 0 0 6px;
        }

        .announcement-body ol,
        .announcement-body ul {
          margin: 0 0 6px;
          padding-left: 18px;
        }

        .announcement-body li {
          margin-bottom: 2px;
        }

        .announcement-footer {
          padding: 10px 18px 14px;
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid #f1f5f9;
          flex-shrink: 0;
          border-radius: 0 0 12px 12px;
        }

        .announcement-footer-btn {
          background: linear-gradient(135deg, #7C1424 0%, #A51C30 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 9px 24px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.2px;
          transition: opacity 0.2s;
          width: 100%;
        }

        .announcement-footer-btn:hover {
          opacity: 0.88;
        }

        @media (max-width: 768px) {
          .announcement-card {
            max-width: 90%;
          }
        }

        @media (max-width: 480px) {
          .announcement-overlay {
            padding: 8px;
            align-items: flex-end;
          }

          .announcement-card {
            max-width: 100%;
            width: 100%;
            max-height: 80vh;
            border-radius: 14px 14px 0 0;
          }

          .announcement-header {
            padding: 12px 14px;
            border-radius: 14px 14px 0 0;
          }

          .announcement-header h2 {
            font-size: 14px;
          }

          .announcement-close-btn {
            width: 26px;
            height: 26px;
          }

          .announcement-body {
            padding: 12px 16px;
            font-size: 13px;
          }

          .announcement-footer {
            padding: 8px 14px 12px;
            border-radius: 0;
          }

          .announcement-footer-btn {
            padding: 9px 18px;
            font-size: 13px;
          }
        }

        @media (max-width: 360px) {
          .announcement-header h2 {
            font-size: 13.5px;
          }

          .announcement-body {
            font-size: 12.5px;
          }
        }
      `}</style>

      <div className="announcement-overlay" onClick={() => setIsOpen(false)}>
        <div
          className="announcement-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="announcement-header">
            <div className="announcement-header-left">
              <Megaphone size={18} color="#ffffff" strokeWidth={2.2} />
              <h2>{content.title || "Important Announcement"}</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close announcement"
              className="announcement-close-btn"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          <div
            className="announcement-body"
            dangerouslySetInnerHTML={{ __html: content.description || "" }}
          />

          {/* <div className="announcement-footer">
            <button
              onClick={() => setIsOpen(false)}
              className="announcement-footer-btn"
            >
              Close
            </button>
          </div> */}
        </div>
      </div>
    </>
  );
};

export default AnnouncementModal;