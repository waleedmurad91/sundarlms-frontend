import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import footerLogo from "../../assets/ilm-logo.png";
import headerLogo from "../../assets/ilm-logo-red.png";
import { ChevronDown, User } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import "./HeaderNew.css";
import axios from "axios";

const SiteHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [hasFaculty, setHasFaculty] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/public/faculty`);
        const total = res?.data?.data?.total;
        setHasFaculty(total > 0);
      } catch (err) {
        console.log(err);
      }
    };
    fetchFaculty();
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navRef = useRef(null);
  const togglerRef = useRef(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu when clicking anywhere outside the nav AND outside the toggler
  useEffect(() => {
    const handleClickOutsideNav = (e) => {
      if (
        navRef.current &&
        !navRef.current.contains(e.target) &&
        togglerRef.current &&
        !togglerRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideNav);
    return () => document.removeEventListener("mousedown", handleClickOutsideNav);
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-bar">
          {/* Logo */}
          <NavLink to="/" className="header-brand" onClick={closeMenu}>
            <img
              src={headerLogo}
              alt="Virtual SundarSTEM Logo"
              className="header-logo"
            />
            <span className="header-title">
              <span className="header-title-dark">Virtual </span>
              <span className="header-title-red">SundarSTEM</span>
            </span>
          </NavLink>

          {/* Hamburger / Cross toggler */}
          <button
            ref={togglerRef}
            type="button"
            className={`header-toggler ${menuOpen ? "open" : ""}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Nav */}
          <nav className={`header-nav ${menuOpen ? "show" : ""}`} ref={navRef}>
            <ul className="header-nav-links">
              <li>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={closeMenu}
                >
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/vss"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={closeMenu}
                >
                  VSS
                </NavLink>
              </li>
              {/* <li>
                <NavLink
                  to="/all-news"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={closeMenu}
                >
                  News
                </NavLink>
              </li> */}
              {/* {hasFaculty && (
                <li>
                  <NavLink
                    to="/faculty"
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                    onClick={closeMenu}
                  >
                    Faculty
                  </NavLink>
                </li>
              )} */}
              <li>
                <NavLink
                  to="/rmc"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={closeMenu}
                >
                  RMC
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/pmc"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={closeMenu}
                >
                  PMC
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/ilm"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={closeMenu}
                >
                  ILM
                </NavLink>
              </li>
              {/* <li>
                <NavLink
                  to="/pmc-results"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link !text-green-600"
                  }
                  onClick={closeMenu}
                >
                  PMC Results Live!
                </NavLink>
              </li> */}
              <li>
                <NavLink
                  to="/all-news"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={closeMenu}
                >
                  News
                </NavLink>
              </li>
                            {hasFaculty && (
                <li>
                  <NavLink
                    to="/faculty"
                    className={({ isActive }) =>
                      isActive ? "nav-link active" : "nav-link"
                    }
                    onClick={closeMenu}
                  >
                    Faculty
                  </NavLink>
                </li>
              )}
            </ul>

            {/* Auth Buttons / User Dropdown */}
            <div className="header-actions">
              {user ? (
                <div
                  className={`site-dropdown-header ${dropdownOpen ? "active" : ""}`}
                  ref={dropdownRef}
                >
                  <button
                    className="site-dh-title"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                  >
                    <span className="relative inline-flex">
                      <User size={18} />
                      <span className="online-dot"></span>
                    </span>
                    {user?.name}
                    <ChevronDown
                      size={15}
                      className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : "rotate-0"}`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="site-dh-menu">
                      <NavLink
                        to="/admin/dashboard"
                        onClick={() => {
                          setDropdownOpen(false);
                          closeMenu();
                        }}
                      >
                        Dashboard
                      </NavLink>
                      <button onClick={handleLogout}>Logout</button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <NavLink to="/signup" className="btn-register" onClick={closeMenu}>
                    Register
                  </NavLink>
                  <NavLink to="/login" className="btn-login" onClick={closeMenu}>
                    <img
                      src={footerLogo}
                      alt="Sundar Stem Logo"
                      className="footer-logo"
                    />
                    <i className="bi bi-box-arrow-in-right"></i>
                    Log In
                  </NavLink>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;