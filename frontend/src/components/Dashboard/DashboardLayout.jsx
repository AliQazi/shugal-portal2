import { useState, useMemo, useEffect, useRef, createContext } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Menu,
  X,
  Search,
  LayoutDashboard,
  Users,
  CalendarCheck,
  Building2,
  CreditCard,
  FileText,
  UserCircle,
  Lock,
  Bell,
  List,
  Moon,
  Ticket,
} from "lucide-react";
import logo from "../../assets/images/logo.png";
import { theme } from "../../theme/theme";

/* ─── Ripple ─────────────────────────────────────────────── */
const RippleButton = ({ children, style, onClick, className, to }) => {
  const [ripples, setRipples] = useState([]);

  const createRipple = (event) => {
    const container = event.currentTarget.getBoundingClientRect();
    const size = Math.max(container.width, container.height);
    const x = event.clientX - container.left - size / 2;
    const y = event.clientY - container.top - size / 2;
    const newRipple = { x, y, size, id: Date.now() };
    setRipples((prev) => [...prev, newRipple]);
    if (onClick) onClick(event);
  };

  const cleanUpRipple = (id) =>
    setRipples((prev) => prev.filter((r) => r.id !== id));

  const rippleEls = ripples.map((r) => (
    <span
      key={r.id}
      onAnimationEnd={() => cleanUpRipple(r.id)}
      style={{
        position: "absolute",
        top: r.y,
        left: r.x,
        width: r.size,
        height: r.size,
        background: "rgba(255,122,0,0.2)", // Orange subtle ripple
        borderRadius: "50%",
        pointerEvents: "none",
        transform: "scale(0)",
        animation: "ripple-animation 600ms linear",
      }}
    />
  ));

  const commonProps = {
    className: `ripple-container ${className || ""}`,
    style: {
      ...style,
      position: "relative",
      overflow: "hidden",
      display: "flex",
      width: "100%",
    },
    onClick: createRipple,
  };

  return to ? (
    <Link to={to} {...commonProps}>
      {children}
      {rippleEls}
    </Link>
  ) : (
    <div {...commonProps}>
      {children}
      {rippleEls}
    </div>
  );
};

/* ─── Layout ─────────────────────────────────────────────── */
export const DashboardUIContext = createContext();

const DashboardLayout = ({ user, handleLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ FIX: ek single boolean ki jagah ab object hai
  // har submenu apna alag key (menuKey) use karta hai isliye
  // ek submenu open/close hone se doosre par asar nahi parta
  const [expandedMenus, setExpandedMenus] = useState({});

  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 769;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && sidebarOpen && isMobile) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [sidebarOpen, isMobile]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const handleMenuClick = () => {
    if (isMobile) setSidebarOpen(false);
  };

  // ✅ FIX: toggle function ab menuKey ke hisaab se sirf usi item ko toggle karta hai
  const toggleSubMenu = (menuKey) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey],
    }));
  };

  const menuItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      exact: true,
    },
    {
      path: "/dashboard/all-groups",
      label: "Umrah Packages",
      icon: <Users size={18} />,
    },
    {
      path: "/dashboard/groups",
      label: "All Groups",
      icon: <Users size={18} />,
    },
    {
      path: "/dashboard/groups?group_type=UMRAH%20GROUP",
      label: "Umrah Seats",
      icon: <Ticket size={18} />,
    },
    {
      path: "/dashboard/umrah-booking",
      label: "Umrah Package Bookings",
      icon: <List size={18} />,
    },
    {
      label: "My Bookings",
      icon: <CalendarCheck size={18} />,
      hasSubMenu: true,
      menuKey: "bookings",
      subItems: [
        { path: "/dashboard/my-bookings?status=on%20hold", label: "On Hold" },
        { path: "/dashboard/my-bookings?status=confirmed", label: "Confirmed" },
        { path: "/dashboard/my-bookings?status=cancelled", label: "Cancelled" },
        { path: "/dashboard/my-bookings", label: "All Bookings" },
      ],
    },
    {
      path: "/dashboard/umrah-calculator",
      label: "Umrah Calculator",
      icon: <Moon size={18} />,
    },
    {
      path: "/dashboard/my-umrah-calculator",
      icon: <Ticket size={20} />,
      label: "Umrah Calculator",
      hasSubMenu: true,
      // ✅ FIX: alag menuKey diya gaya hai is submenu ke liye
      menuKey: "umrahCalculator",
      subItems: [
        {
          path: "/dashboard/my-umrah-calculator?status=pending",
          label: "Pending Ticket",
        },
        {
          path: "/dashboard/my-umrah-calculator?status=confirm",
          label: "Confirmed Ticket",
        },
        {
          path: "/dashboard/my-umrah-calculator?status=cancel",
          label: "Cancelled Ticket",
        },
        { path: "/dashboard/my-umrah-calculator", label: "All Bookings" },
        { path: "/dashboard/my-umrah-calculator-q", label: "Queries" },
      ],
    },
    { path: "/dashboard/banks", label: "Bank", icon: <Building2 size={18} /> },
    {
      path: "/dashboard/payment",
      label: "Payment",
      icon: <CreditCard size={18} />,
    },
    {
      path: "/dashboard/ledger",
      label: "Ledger",
      icon: <FileText size={18} />,
    },
    {
      path: "/dashboard/profile",
      label: "My Profile",
      icon: <UserCircle size={18} />,
    },
    {
      path: "/dashboard/team-contacts",
      label: "Team Contacts",
      icon: <Users size={18} />,
    },
    {
      path: "/dashboard/change-password",
      label: "Change Password",
      icon: <Lock size={18} />,
    },
  ];

  const filteredMenu = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const q = searchQuery.toLowerCase();
    return menuItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subItems?.some((s) => s.label.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const isActive = (path) => location.pathname + location.search === path;

  return (
    <DashboardUIContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        expandedMenus,
        setExpandedMenus,
        setSearchQuery,
      }}
    >
      <>
        {/* ── Keyframes & Refined Custom Styles ── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

          * { box-sizing: border-box; }

          @keyframes ripple-animation {
            to { transform: scale(4); opacity: 0; }
          }

          @keyframes dropdownReveal {
            from { opacity: 0; transform: translateY(-8px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)  scale(1);    }
          }

          @keyframes subMenuSlide {
            from { opacity: 0; transform: translateX(-4px); }
            to   { opacity: 1; transform: translateX(0); }
          }

          .db-layout * { font-family: 'Plus Jakarta Sans', sans-serif; }

          /* Sidebar nav scroll */
          .sidebar-nav { overflow-y: auto; flex: 1; padding: 12px 8px; }
          .sidebar-nav::-webkit-scrollbar { width: 4px; }
          .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
          .sidebar-nav::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 0px; }

          /* Polished Boxy Hover Effect */
          .menu-link {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border-left: 3px solid transparent !important;
          }
          .menu-link:hover { 
            background: rgba(255, 122, 0, 0.05) !important; 
            color: #FF7A00 !important;
            border-left: 3px solid #FF7A00 !important;
          }
          .menu-link:hover .icon-box {
            color: #FF7A00 !important;
          }

          /* Shiny Active Link Look (Glossy Top Highlight) */
          .menu-link-active {
            background: ${theme.colors.primary} !important;
            color: #fff !important;
            border-left: 3px solid #FF7A00 !important;
            box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.15);
            position: relative;
          }
          /* Shiny overlay glare for polished effect */
          .menu-link-active::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 50%;
            background: linear-gradient(to bottom, rgba(255,255,255,0.06), transparent);
            pointer-events: none;
          }

          /* Search focus boxy style */
          .db-search:focus { 
            border-color: #FF7A00 !important; 
            box-shadow: 0 0 0 2px rgba(255,122,0,0.15) !important;
            background: #fff !important;
          }

          /* Dropdown items */
          .dd-item { transition: all 0.15s ease; border-radius: 4px; }
          .dd-item:hover { background: rgba(255, 122, 0, 0.05) !important; color: #FF7A00 !important; }
          .dd-item-danger:hover { background: #fff1f2 !important; color: #be123c !important; }

          .db-sidebar {
            transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
            will-change: width;
            position: fixed !important;
            top: 0; left: 0; height: 100vh; z-index: 200;
          }

          /* Active sub-item orange cube indicators */
          .sub-active-dot {
            width: 5px; height: 5px;
            background: #FF7A00; 
            border-radius: 0px; /* Rigid Boxy design */
            flex-shrink: 0;
            box-shadow: 0 0 6px #FF7A00;
          }

          @media (max-width: 768px) {
            .db-main   { margin-left: 0 !important; }
            .sidebar-close-btn { display: flex !important; }
          }
        `}</style>

        <div
          className="db-layout"
          style={{ display: "flex", minHeight: "100vh", background: "#f4f5f8" }}
        >
          {/* Mobile overlay */}
          {sidebarOpen && isMobile && (
            <div
              onClick={toggleSidebar}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.4)",
                zIndex: 998,
                backdropFilter: "blur(4px)",
                touchAction: "none",
              }}
            />
          )}

          {/* ── Sidebar (Polished Dark Minimalist Structure) ── */}
          <aside
            className="db-sidebar"
            style={{
              width: isMobile ? "280px" : sidebarOpen ? "260px" : "68px",
              background: "#ffffff",
              borderRight: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              boxShadow: isMobile ? "12px 0 40px rgba(0,0,0,0.15)" : "none",
              overflow: "hidden",
              position: "fixed",
              top: 0,
              left: 0,
              height: "100vh",
              zIndex: 999,
              transform:
                isMobile && !sidebarOpen
                  ? "translateX(-100%)"
                  : "translateX(0)",
              transition: isMobile
                ? "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
                : "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Logo Wrapper */}
            <div
              style={{
                padding: "24px 16px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                onClick={() => navigate("/dashboard")}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  overflow: "hidden",
                  width: "100%",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                }}
              >
                <img
                  src={user?.logo || logo}
                  alt="Logo"
                  style={{
                    width: sidebarOpen ? "200px" : "32px",
                    // height: "36px",
                    objectFit: "contain",
                    transition: "width 0.2s ease-in-out",
                    flexShrink: 0,
                  }}
                />
              </div>
              {sidebarOpen && isMobile && (
                <button
                  className="sidebar-close-btn"
                  onClick={toggleSidebar}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px",
                    cursor: "pointer",
                    display: "flex",
                  }}
                >
                  <X size={16} color="#475569" />
                </button>
              )}
            </div>

            {/* Sharp Search Bar */}
            {sidebarOpen && (
              <div style={{ padding: "16px 14px 6px" }}>
                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                  />
                  <input
                    className="db-search"
                    type="text"
                    placeholder="Quick search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 10px 10px 36px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px" /* Boxy */,
                      fontSize: "13px",
                      color: "#1e293b",
                      background: "#f8fafc",
                      outline: "none",
                      transition: "all 0.15s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Nav Links */}
            <nav className="sidebar-nav">
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {filteredMenu.map((item, index) => {
                  // ✅ FIX: ab har item apne menuKey se apni expanded state nikalta hai
                  const isExpanded = item.menuKey
                    ? !!expandedMenus[item.menuKey]
                    : false;

                  return (
                    <li key={index}>
                      {item.hasSubMenu ? (
                        <>
                          <RippleButton
                            onClick={() =>
                              sidebarOpen && toggleSubMenu(item.menuKey)
                            }
                            className="menu-link"
                            style={{
                              alignItems: "center",
                              gap: "12px",
                              padding: sidebarOpen ? "12px 14px" : "12px 0",
                              justifyContent: sidebarOpen
                                ? "flex-start"
                                : "center",
                              borderRadius: "4px" /* Boxy */,
                              color: "#000",
                              fontWeight: "500",
                              fontSize: "14px",
                              cursor: "pointer",
                              textDecoration: "none",
                            }}
                          >
                            <span
                              className="icon-box"
                              style={{
                                flexShrink: 0,
                                color: "#000",
                                display: "flex",
                              }}
                            >
                              {item.icon}
                            </span>
                            {sidebarOpen && (
                              <>
                                <span style={{ flex: 1 }}>{item.label}</span>
                                <ChevronDown
                                  size={14}
                                  style={{
                                    transform: isExpanded
                                      ? "rotate(180deg)"
                                      : "rotate(0deg)",
                                    transition: "transform 0.2s ease",
                                    color: "#94a3b8",
                                  }}
                                />
                              </>
                            )}
                          </RippleButton>

                          {/* Submenu Area */}
                          <div
                            style={{
                              maxHeight:
                                isExpanded && sidebarOpen ? "300px" : "0px",
                              overflow: "hidden",
                              transition:
                                "max-height 0.25s cubic-bezier(0, 0, 0.2, 1)",
                            }}
                          >
                            <ul
                              style={{
                                listStyle: "none",
                                padding: "4px 0 4px 16px",
                                margin: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                                borderLeft: "1px dashed #cbd5e1",
                                marginLeft: "22px",
                                marginTop: "2px",
                              }}
                            >
                              {item.subItems.map((sub, sIdx) => {
                                const active = isActive(sub.path);
                                return (
                                  <li key={sIdx}>
                                    <RippleButton
                                      to={sub.path}
                                      onClick={handleMenuClick}
                                      className={active ? "" : "menu-link"}
                                      style={{
                                        padding: "8px 12px",
                                        borderRadius: "2px",
                                        fontSize: "13px",
                                        fontWeight: active ? "600" : "400",
                                        alignItems: "center",
                                        gap: "8px",
                                        background: active
                                          ? "rgba(255, 122, 0, 0.08)"
                                          : "transparent",
                                        color: active ? "#FF7A00" : "#627d98",
                                        textDecoration: "none",
                                        animation: isExpanded
                                          ? `subMenuSlide 0.2s ease ${sIdx * 30}ms both`
                                          : "none",
                                      }}
                                    >
                                      {active ? (
                                        <span className="sub-active-dot" />
                                      ) : (
                                        <div style={{ width: 5 }} />
                                      )}
                                      {sub.label}
                                    </RippleButton>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </>
                      ) : (
                        (() => {
                          const active = isActive(item.path);
                          return (
                            <RippleButton
                              to={item.path}
                              onClick={handleMenuClick}
                              className={
                                active ? "menu-link-active" : "menu-link"
                              }
                              style={{
                                alignItems: "center",
                                gap: "12px",
                                padding: sidebarOpen ? "12px 14px" : "12px 0",
                                justifyContent: sidebarOpen
                                  ? "flex-start"
                                  : "center",
                                borderRadius: "4px" /* Solid Boxy Shape */,
                                color: active ? "#fff" : "#475569",
                                fontWeight: active ? "600" : "500",
                                fontSize: "14px",
                                textDecoration: "none",
                              }}
                            >
                              <span
                                className={!active ? "icon-box" : ""}
                                style={{
                                  flexShrink: 0,
                                  color: active
                                    ? "#fff"
                                    : "#000" /* Icons glow premium orange when active */,
                                  display: "flex",
                                }}
                              >
                                {item.icon}
                              </span>
                              {sidebarOpen && <span>{item.label}</span>}
                            </RippleButton>
                          );
                        })()
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* ── Main Dashboard Window ── */}
          <div
            className="db-main"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              marginLeft: isMobile ? 0 : sidebarOpen ? "260px" : "68px",
              transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Header Area */}
            <header
              style={{
                background: "#fff",
                padding: "0 24px",
                height: "64px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #e2e8f0",
                position: "sticky",
                top: 0,
                zIndex: 100,
              }}
            >
              {/* Boxy Menu Toggle Button */}
              <button
                onClick={toggleSidebar}
                style={{
                  cursor: "pointer",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  borderRadius: "4px" /* Boxy UI match */,
                  padding: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.borderColor = "#94a3b8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f8fafc";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
              >
                <Menu size={18} color="#334155" />
              </button>

              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {/* Notification Bell */}
                <button
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "8px",
                    display: "flex",
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <Bell size={18} color="#64748b" />
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      width: "6px",
                      height: "6px",
                      background:
                        "#FF7A00" /* Alerts now feature the secondary orange brand tone */,
                      borderRadius: "50%",
                    }}
                  />
                </button>

                {/* User Info Container */}
                <div ref={dropdownRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: userDropdownOpen ? "#f1f5f9" : "#f8fafc",
                      border: "1px solid #cbd5e1",
                      padding: "6px 12px 6px 6px",
                      borderRadius: "4px" /* Uniform Boxy */,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {/* Avatar Container */}
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "2px",
                        background: user?.logo
                          ? `url(${user.logo}) center/cover`
                          : "linear-gradient(135deg, #1e293b 0%, #FF7A00 100%)" /* Premium dark to orange tint */,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "13px",
                        flexShrink: 0,
                      }}
                    >
                      {!user?.logo && (user?.name?.[0]?.toUpperCase() || "U")}
                    </div>

                    <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#1e293b",
                        }}
                      >
                        {user?.name || "User"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {user?.email || ""}
                      </div>
                    </div>

                    <ChevronDown
                      size={14}
                      style={{
                        color: "#94a3b8",
                        transition: "transform 0.2s ease",
                        transform: userDropdownOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        flexShrink: 0,
                      }}
                    />
                  </button>

                  {/* Dropdown Menu Overlay */}
                  {userDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        right: 0,
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px" /* Boxy layout */,
                        minWidth: "210px",
                        boxShadow:
                          "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                        zIndex: 1000,
                        overflow: "hidden",
                        animation:
                          "dropdownReveal 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
                        transformOrigin: "top right",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 14px",
                          borderBottom: "1px solid #f1f5f9",
                          background: "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#1e293b",
                          }}
                        >
                          {user?.name || "User"}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            marginTop: "2px",
                          }}
                        >
                          {user?.email || ""}
                        </div>
                      </div>

                      <div style={{ padding: "4px" }}>
                        <Link
                          to="/dashboard/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="dd-item"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 10px",
                            textDecoration: "none",
                            color: "#334155",
                            fontSize: "13px",
                            fontWeight: "500",
                          }}
                        >
                          <UserCircle size={15} style={{ color: "#FF7A00" }} />
                          My Profile
                        </Link>

                        {/* ─── LOGOUT BUTTON ADDED HERE ─── */}
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleLogout(); // Yeh function call hoga
                          }}
                          className="dd-item dd-item-danger"
                          style={{
                            display: "flex",
                            width: "100%",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 10px",
                            background: "none",
                            border: "none",
                            color: "#334155",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <Lock size={15} style={{ color: "#be123c" }} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Content Body Yield */}
            <main style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
              <Outlet />
            </main>
          </div>
        </div>
      </>
    </DashboardUIContext.Provider>
  );
};

export default DashboardLayout;
