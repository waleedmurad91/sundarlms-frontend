import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import "@/styles/landing-page.css";

const PAGE_TITLES = {
  "/": "Home",
  "/rmc": "RMC",
  "/rmc-school-registration": "RMC School Registration",
  "/pmc": "PMC",
  "/vss": "VSS",
  "/ilm": "ILM",
  "/about-us": "About Us",
  "/pkm-privacy-policy": "Privacy Policy",
  "/certificate": "Certificate Verification",
  "/test": "Test",
  "/result": "Result",
  "/prizes": "Prizes",
};

const WebLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const updateViewportState = () => {
      const desktopView = window.innerWidth >= 768;
      setIsDesktop(desktopView);
      setIsSidebarOpen(desktopView); // keep menu visible on desktop, hidden on mobile by default
    };

    updateViewportState();
    window.addEventListener("resize", updateViewportState);
    return () => window.removeEventListener("resize", updateViewportState);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    const pageTitle = PAGE_TITLES[path] || "Virtual SundarSTEM School";
    document.title = `${pageTitle} - Virtual SundarSTEM School`;
  }, [location.pathname]);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSidebarLinkClick = () => {
    if (!isDesktop) {
      setIsSidebarOpen(false);
    }
  };
  return (
    <div className="landing-wrapper">
      <SiteHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onLinkClick={handleSidebarLinkClick}
      />
      <main className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
};

export default WebLayout;
