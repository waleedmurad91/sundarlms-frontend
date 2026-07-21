import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import siteLogo from "@/assets/sundar-logo.webp";
import mobileLogoIcon from "@/assets/logo_icon.png";
import loginbtn from "@/assets/loginLogo-Red.png";
import {
  ChevronDown,
  Facebook,
  Instagram,
  Menu,
  Twitter,
  User,
  X,
  Youtube,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import ilmLogo from "@/assets/ilm-logo.png";
import ilmLogoRed from "@/assets/ilm-logo-red.png";

const SiteHeader = ({
  isSidebarOpen = false,
  onToggleSidebar,
  onLinkClick,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [active, setActive] = useState(false);
  const dropdownRef = useRef(null);
  const [initiativesOpen, setInitiativesOpen] = useState(false);

  const handleAddActiveClass = (e) => {
    e.stopPropagation();
    setActive((prev) => !prev);
  };

  const dropdownInitiativesRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActive(false);
      }
      if (dropdownInitiativesRef.current && !dropdownInitiativesRef.current.contains(e.target)) {
        setInitiativesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setActive(false);
    await logout();
    navigate("/", { replace: true });
  };

  const handleToggleSidebar = () => {
    setActive(false);
    if (onToggleSidebar) {
      onToggleSidebar();
    }
  };

  const handleLinkSelect = () => {
    setInitiativesOpen(false);
    if (onLinkClick) {
      onLinkClick();
    }
  };
  return (
    <header className="site-header">
      <div className="site-logo ml-25">
        <img src={ilmLogoRed} alt="Sundar Logo" />
      </div>
      <div className="header-top">
        <div className="header-top-icons">
          <a href="https://www.facebook.com/sundarstemschool" target="_blank">
            <Facebook
              size={17}
              className="text-[#4b5563] transition-all hover:text-[#A51C30]"
            />
          </a>
          <a href="https://x.com/SundarSschool" target="_blank">
            <Twitter
              size={17}
              className="text-[#4b5563] transition-all hover:text-[#A51C30]"
            />
          </a>
          <a href="https://www.instagram.com/sundarstemschool/" target="_blank">
            <Instagram
              size={17}
              className="text-[#4b5563] transition-all hover:text-[#A51C30]"
            />
          </a>
          <a href="https://www.youtube.com/@sundarstem1600" target="_blank">
            <Youtube
              size={17}
              className="text-[#4b5563] transition-all hover:text-[#A51C30]"
            />
          </a>
        </div>
      </div>

      <div className="header-logo-wrap">
        <div className="hlw-left"></div>
        <div className="hlw-center">
          <h1 className="" >Virtual SundarSTEM</h1>
        </div>
        {/* <div className="hlw-right">
          {user ? (
            <div className={`site-dropdown-header  ${active ? "active" : ""}`}>
              <div className="site-dh-title" onClick={handleAddActiveClass}>
                <span>
                  <User /> <div className="online-dot"></div>
                </span>{" "}
                {user?.name} <ChevronDown size={15} />
              </div>
              {active && (
                <div className="site-dh-menu">
                  <Link to="/admin/dashboard" onClick={() => setActive(false)}>Dashboad</Link>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-ilm">
              <img src={ilmLogo} /> ILM Login
            </Link>
          )}
        </div> */}
      </div>
      <div className="header-link-wrap">
        <div className="mobile-siteHeader-logo">
          <img src={ilmLogo} />
          <span>Virtual SundarSTEM</span>
        </div>

        <div
          className={`site-menulink font-semibold ${isSidebarOpen ? "open" : ""}`}
        >
          <Link to="/" onClick={handleLinkSelect}>
            Home
          </Link>
          <Link to="/about-us" onClick={handleLinkSelect}>
            About Us
          </Link>
          <div className="relative" ref={dropdownInitiativesRef}>
            <button 
              className="font-semibold flex items-center gap-1 site-dropdown-btn"
              onClick={() => setInitiativesOpen(!initiativesOpen)}
            >
              Our Initiatives <ChevronDown size={15} className={`transition-transform ${initiativesOpen ? 'rotate-180' : ''}`} />
            </button>
            {initiativesOpen && (
              <div className="initiatives-dropdown">
                <Link to="/rmc" onClick={handleLinkSelect} className="dropdown-item">
                  RMC
                </Link>
                <Link to="/pmc" onClick={handleLinkSelect} className="dropdown-item">
                  PMC
                </Link>
                <Link to="/vss" onClick={handleLinkSelect} className="dropdown-item">
                  VSS
                </Link>
                <Link to="/ilm" onClick={handleLinkSelect} className="dropdown-item">
                  ILM
                </Link>
              </div>
            )}
          </div>
          {/* <Link to="/privacy-policy" onClick={handleLinkSelect}>
            Privacy Policy
          </Link> */}
          </div>
          {/* <div className="hlw-right">
          {user ? (
            <div className={`site-dropdown-header  ${active ? "active" : ""}`}>
              <div className="site-dh-title" onClick={handleAddActiveClass}>
                <span>
                  <User /> <div className="online-dot"></div>
                </span>{" "}
                {user?.name} <ChevronDown size={15} />
              </div>
              {active && (
                <div className="site-dh-menu">
                  <Link to="/admin/dashboard" onClick={() => setActive(false)}>Dashboad</Link>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-ilm">
              <img src={loginbtn} /> ILM Login
            </Link>
          )}
        </div> */}
        <div className="site-mobile-button site-toggle-button">
          <button
            type="button"
            aria-label={
              isSidebarOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className="header-menu-button"
            onClick={handleToggleSidebar}
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;

