import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import headerLogo from "@/assets/ilm-logo.png";
import { useAuthStore } from "@/store/auth";
import { Bell, ChevronDown, Languages, Menu, UserRound, X } from "lucide-react";
import {
  getAllNotifications,
  readAllNotifications,
  readSingleNotification,
} from "@/api/authApi";
import StudentLanguageSwitcher from "@/components/StudentLanguageSwitcher";
import { rebasePathToRole } from "@/utils/roleRoutes";

const ROLE_PROFILE_PATHS = {
  admin: "/admin/edit-profile",
  staff: "/staff/edit-profile",
  teacher: "/teacher/edit-profile",
  student: "/student/edit-profile",
  school: "/school/edit-profile",
  data_entry: "/data-entry/dashboard",
  reviewer: "/reviewer/dashboard",
};

const ROLE_DASHBOARD_PATHS = {
  admin: "/admin/dashboard",
  staff: "/staff/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  school: "/school/dashboard",
  data_entry: "/data-entry/dashboard",
  reviewer: "/reviewer/dashboard",
};

const STUDENT_PRACTICE_RESOURCES_URL =
  "https://drive.google.com/drive/folders/1yUCPiFhFYiIYwfDEUvhOWdpG7HYbBDjY?usp=drive_link";

const Navbar = ({
  isDesktop = true,
  isSidebarOpen = false,
  onToggleSidebar,
  role = "admin",
  profilePath,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [active, setActive] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const normalizedRole = String(role ?? user?.role ?? "").toLowerCase();
  const resolvedDashboardPath =
    ROLE_DASHBOARD_PATHS[normalizedRole] ??
    rebasePathToRole("/dashboard", normalizedRole);
  const resolvedProfilePath =
    profilePath ??
    ROLE_PROFILE_PATHS[normalizedRole] ??
    rebasePathToRole("/admin/edit-profile", normalizedRole);
  const canShowProfileLink =
    Boolean(resolvedProfilePath) &&
    resolvedProfilePath !== resolvedDashboardPath;
  const canShowPracticeResources = normalizedRole === "student";
  const canShowNotifications = true;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const isMobile = window.innerWidth < 768;

  const normalizeNotifications = (payload) => {
    const container = payload?.data ?? payload ?? {};
    const list = Array.isArray(container?.data)
      ? container.data
      : Array.isArray(container?.notifications)
        ? container.notifications
        : Array.isArray(container)
          ? container
          : [];
    return list
      .map((item, index) => ({
        id: item?.id ?? item?._id ?? `notification-${index}`,
        title: item?.title ?? "",
        message: item?.message ?? item?.body ?? "",
        read: Boolean(item?.read ?? item?.is_read ?? item?.isRead),
        created_at: item?.created_at ?? item?.createdAt ?? "",
        type: item?.type ?? item?.category ?? "",
        data: item?.data ?? item?.payload ?? item?.meta ?? null,
        question_id: item?.question_id ?? item?.questionId ?? null,
      }))
      .filter((item) => item.id !== undefined && item.id !== null);
  };

  const handleAddActiveClass = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    setNotificationOpen(false);
    setActive((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const outsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(e.target);
      const outsideNotifications =
        !notificationRef.current || !notificationRef.current.contains(e.target);
      if (outsideDropdown && outsideNotifications) {
        setActive(false);
        setNotificationOpen(false);
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || !canShowNotifications) return;
    let mounted = true;
    const loadNotifications = async () => {
      setNotificationsLoading(true);
      try {
        const response = await getAllNotifications();
        if (!mounted) return;
        setNotifications(normalizeNotifications(response));
      } catch {
        if (!mounted) return;
        setNotifications([]);
      } finally {
        if (mounted) setNotificationsLoading(false);
      }
    };
    loadNotifications();
    return () => {
      mounted = false;
    };
  }, [user, canShowNotifications]);

  const handleLogout = async () => {
    setActive(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const handleToggleSidebar = () => {
    setActive(false);
    setNotificationOpen(false);
    if (onToggleSidebar) {
      onToggleSidebar();
    }
  };

  const handleToggleNotifications = (e) => {
    e.stopPropagation();
    setActive(false);
    setIsOpen(false);
    setNotificationOpen((prev) => {
      const next = !prev;
      if (next && unreadCount > 0) {
        readAllNotifications()
          .then(() => {
            setNotifications((current) =>
              current.map((item) => ({ ...item, read: true })),
            );
          })
          .catch(() => {});
      }
      return next;
    });
  };

  const handleNotificationClick = (notification) => {
    if (!notification?.id) return;
    const questionId =
      notification?.data?.question_id ??
      notification?.data?.questionId ??
      notification?.question_id ??
      notification?.questionId;
    if (!notification.read) {
      readSingleNotification(notification.id)
        .then(() => {
          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id ? { ...item, read: true } : item,
            ),
          );
        })
        .catch(() => {});
    }
    if (questionId && canShowNotifications) {
      const roleBase =
        normalizedRole === "reviewer" ? "/reviewer" : "/data-entry";
      const path = `${roleBase}/view-question-detail/${questionId}`;
      setNotificationOpen(false);
      navigate(path);
    }
  };

  return (
    <header className="main-header">
      <div className="containerLayout">
        <div className="header-wrap">
          <div className="header-left">
            {normalizedRole === "student" && user && (
              <div className="hidden md:block">
                <StudentLanguageSwitcher />
              </div>
            )}
          </div>

          <Link
            to={"/"}
            className="header-center mblogoposition header-main-logo"
          >
            <img
              src={headerLogo}
              alt="Sundar Stem Logo"
              className="mblogopositionIcon md:!h-[33px]"
            />
            <span className="!mt-0">
              {isMobile ? "VSS" : "Virtual SundarSTEM"}
            </span>
          </Link>

          <div className="header-right dropdown-main" ref={dropdownRef}>
            {user ? (
              <div className="flex items-center gap-1">
                {normalizedRole === "student" && (
                  <div className="relative block md:hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen((prev) => !prev);
                        setActive(false);
                        setNotificationOpen(false);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
                    >
                      <Languages color="white" size={18} />
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          position: "fixed",
                          top: "64px",
                          right: "8px",
                          left: "auto",
                          width: "160px",
                          maxWidth: "calc(100vw - 16px)",
                          zIndex: 9999,
                          background: "#fff",
                          borderRadius: "8px",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 12px",
                            borderBottom: "1px solid #e2e8f0",
                            fontWeight: 600,
                            fontSize: "13px",
                            color: "#1e293b",
                          }}
                        >
                          Language
                        </div>
                        <div style={{ padding: "6px" }}>
                          <StudentLanguageSwitcher />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {canShowNotifications && (
                  <div
                    className="relative"
                    ref={notificationRef}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full hover:bg-white/10"
                      onClick={handleToggleNotifications}
                      aria-label="Open notifications"
                    >
                      <Bell size={18} color="white" />
                      {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {notificationOpen && (
                      <div
                        style={{
                          position: "fixed",
                          top: "64px",
                          right: "8px",
                          left: "auto",
                          width: "240px",
                          maxWidth: "calc(100vw - 16px)",
                          zIndex: 9999,
                          background: "#fff",
                          borderRadius: "8px",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                          border: "1px solid #e2e8f0",
                          ...(window.innerWidth >= 768 && {
                            position: "absolute",
                            top: "48px",
                            left: "auto",
                            right: "0",
                            width: "260px",
                          }),
                        }}
                      >
                        <div
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid #e2e8f0",
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#1e293b",
                          }}
                        >
                          Notifications
                        </div>
                        <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                          {notificationsLoading ? (
                            <div
                              style={{
                                padding: "24px",
                                textAlign: "center",
                                fontSize: "13px",
                                color: "#94a3b8",
                              }}
                            >
                              Loading notifications...
                            </div>
                          ) : notifications.length === 0 ? (
                            <div
                              style={{
                                padding: "24px",
                                textAlign: "center",
                                fontSize: "13px",
                                color: "#94a3b8",
                              }}
                            >
                              No notifications yet.
                            </div>
                          ) : (
                            notifications.map((item) => (
                              <div
                                key={item.id}
                                // type="button"
                                // onClick={() => handleNotificationClick(item)}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "12px 16px",
                                  background: item.read ? "#fff" : "#f8faff",
                                  cursor: "pointer",
                                  border: "none",
                                  borderBottomColor: "#f1f5f9",
                                  borderBottomWidth: "1px",
                                  borderBottomStyle: "solid",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 600,
                                      color: "#1e293b",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {item.title}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "12px",
                                      color: "#64748b",
                                      marginTop: "2px",
                                      overflow: "hidden",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                    }}
                                  >
                                    {item.message}
                                  </div>
                                </div>
                                {!item.read && (
                                  <span
                                    style={{
                                      marginTop: "4px",
                                      height: "8px",
                                      width: "8px",
                                      flexShrink: 0,
                                      borderRadius: "50%",
                                      background: "#3b82f6",
                                      display: "inline-block",
                                    }}
                                  />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className={`dropdown-header ${active ? "active" : ""}`}>
                  <div className="dh-title" onClick={handleAddActiveClass}>
                    <span className="flex md:hidden h-7 w-7 items-center justify-center rounded-full hover:bg-white/10">
                      <UserRound size={18} color="white" />
                    </span>
                    <span className="hidden md:inline">{user?.name}</span>
                    <ChevronDown size={15} className="arrowDown" />
                  </div>
                  {active && (
                    <div className="dh-menu">
                      <h1>My Account</h1>
                      <div className="menu-item">
                        <Link
                          to={resolvedDashboardPath}
                          onClick={() => setActive(false)}
                        >
                          Dashboard
                        </Link>
                        {canShowPracticeResources && (
                          <a
                            href={STUDENT_PRACTICE_RESOURCES_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setActive(false)}
                          >
                            Practice Resources
                          </a>
                        )}
                        {canShowProfileLink && (
                          <Link
                            to={resolvedProfilePath}
                            onClick={() => setActive(false)}
                          >
                            Profile
                          </Link>
                        )}
                        <button onClick={handleLogout}>Logout</button>
                      </div>
                    </div>
                  )}
                </div>

                {normalizedRole !== "student" &&
                  !isDesktop &&
                  onToggleSidebar && (
                    <button
                      type="button"
                      aria-label={
                        isSidebarOpen
                          ? "Close navigation menu"
                          : "Open navigation menu"
                      }
                      className="header-menu-button"
                      onClick={handleToggleSidebar}
                    >
                      {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                  )}
              </div>
            ) : (
              <></>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
