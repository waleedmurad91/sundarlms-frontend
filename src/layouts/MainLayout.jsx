import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { useAuthStore } from "@/store/auth";
import { rebasePathToRole } from "@/utils/roleRoutes";
import { resolveRoleNavigation } from "@/utils/roleLinks";
import PortalFooter from "@/components/layout/PortalFooter";

const normalizeRole = (role) =>
  typeof role === "string" ? role.toLowerCase() : null;

const PROFILE_PATHS = {
  admin: "/admin/edit-profile",
  staff: "/staff/edit-profile",
  teacher: "/teacher/edit-profile",
  student: "/student/edit-profile",
  school: "/school/edit-profile",
  data_entry: "/data-entry/dashboard",
  reviewer: "/reviewer/dashboard",
};

const MainLayout = ({ role: roleOverride, hideFooter = false }) => {
  const location = useLocation();
  const { role: storeRole, user, navigation } = useAuthStore();
  const authRole = useMemo(() => {
    return normalizeRole(storeRole ?? user?.role) ?? "admin";
  }, [storeRole, user?.role]);
  const layoutRole = useMemo(() => {
    const fallback = user?.role ?? "admin";
    return normalizeRole(roleOverride ?? authRole ?? fallback) ?? "admin";
  }, [authRole, roleOverride, user?.role]);
  const sidebarSections = useMemo(() => {
    return resolveRoleNavigation({
      role: authRole,
      navigation,
    });
  }, [authRole, navigation]);
  const sidebarTitle = useMemo(() => {
    const accessRoleLabel =
      user?.access_role?.label ?? user?.accessRole?.label ?? "";
    const isCustomAdminShellRole = ![
      "admin",
      "staff",
      "teacher",
      "student",
      "school",
      "data_entry",
      "reviewer",
    ].includes(authRole);

    if (
      accessRoleLabel &&
      (["admin", "staff"].includes(layoutRole) ||
        isCustomAdminShellRole) &&
      authRole !== "admin"
    ) {
      return accessRoleLabel;
    }

    if (isCustomAdminShellRole) {
      return authRole.replace(/_/g, " ");
    }

    if (
      ["admin", "staff"].includes(layoutRole) &&
      user?.access_role?.label &&
      authRole !== "admin"
    ) {
      return user?.access_role?.label ?? user?.accessRole?.label ?? "Admin";
    }

    return undefined;
  }, [authRole, layoutRole, user?.access_role?.label, user?.accessRole?.label]);

  const profilePath =
    PROFILE_PATHS[layoutRole] ??
    rebasePathToRole("/admin/edit-profile", authRole ?? layoutRole);
  const showSidebar = layoutRole !== "student";
  const [isDesktop, setIsDesktop] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateLayoutMode = (matches) => {
      setIsDesktop(matches);
      setIsSidebarOpen(matches);
    };
    const handleMediaChange = (event) => {
      updateLayoutMode(event.matches);
    };

    updateLayoutMode(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleMediaChange);
      return () => mediaQuery.removeEventListener("change", handleMediaChange);
    }

    mediaQuery.addListener(handleMediaChange);
    return () => mediaQuery.removeListener(handleMediaChange);
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleSidebarLinkClick = () => {
    if (!isDesktop) {
      setIsSidebarOpen(false);
    }
  };

  const shouldHideFooter =
    hideFooter ||
    location.pathname.includes("/student/challenge/") ||
    location.pathname.includes("/student/practice/");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        role={layoutRole}
        profilePath={profilePath}
        isDesktop={isDesktop}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
      />
      <div className="flex flex-1">
        {showSidebar && (
          <>
            <Sidebar
              role={layoutRole}
              sections={sidebarSections}
              title={sidebarTitle}
              isDesktop={isDesktop}
              isOpen={isSidebarOpen}
              onLinkClick={handleSidebarLinkClick}
            />
            {!isDesktop && isSidebarOpen && (
              <div
                className="sidebar-overlay"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
          </>
        )}
        <main
          className={`bg-[#FAFAFA] flex-1 w-full min-w-0 ${
            !showSidebar ? "w-full" : "p-6"
          }`}
        >
          <Outlet />
        </main>
      </div>
      {!shouldHideFooter && <PortalFooter />}
    </div>
  );
};

export default MainLayout;

