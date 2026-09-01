import { useEffect, useRef, useState } from "react";
import { CiMenuFries } from "react-icons/ci";
import { AiOutlineClose } from "react-icons/ai";
import { groupTypes } from "../../data/groupTypes";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import logo from "../../assets/images/logo.png";
import { theme } from "../../theme/theme";

// Sub-Component: Clean, Solid OldHeader 
function OldHeader({ user, handleLogout }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!profileRef.current?.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentGroupType = searchParams.get("group_type")?.trim() || "";

  return (
    <header className={`fixed w-full top-0 left-0 z-50 shadow-sm transition-all duration-500 ${scrolled
      ? "bg-white/95 backdrop-blur-md shadow-lg"
      : "bg-transparent"
      }`}>
      {/* SOLID PROFESSIONAL NAV BAR */}
      <div
      // className="border-b"
      // style={{
      //   background: theme.colors.card,
      //   borderColor: theme.colors.border,
      // }}
      >
        <div className={`px-4 sm:px-6 md:px-10 flex items-center justify-between py-3 transition-all duration-300 ${scrolled
          ? "bg-black/5 border border-black/5"
          : "bg-white/10 border border-white/15 backdrop-blur-sm"
          }`}>

          {/* LEFT: Logo & Navigation Links */}
          <div className="flex items-center gap-8">
            {user && (
              <Link to="/" className="flex items-center">
                <img
                  style={{ height: "60px" }}
                  src={logo}
                  alt="Abid Air Travel & Tours"
                  className="object-contain bg-white/90 rounded-full px-2.5 py-1"
                />
              </Link>
            )}

            {/* CENTRAL NAV LINKS (Ref: image_ee0aa3.png style) */}
            {/* {user && (
              <div className="hidden xl:flex items-center gap-8">
                {groupTypes.map((group) => {
                  const isActive =
                    location.pathname === `/${group.path}` || 
                    (location.pathname === "/all-groups" && currentGroupType === group.value);

                  return (
                    <Link
                      key={group.value}
                      to={`/${group.path}`}
                      className="text-sm font-semibold transition-colors duration-200 py-2 relative"
                      style={{
                        color: isActive
                          ? theme.colors.accent
                          : theme.colors.textPrimary,
                      }}
                    >
                      {group.label}
                      {isActive && (
                        <span 
                          className="absolute bottom-0 left-0 w-full h-0.5 rounded-full"
                          style={{ background: theme.colors.accent }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            )} */}
          </div>

          {/* RIGHT: Profile Trigger / Actions */}
          <div className="flex items-center gap-4">
            {user && (
              <div ref={profileRef} className="relative hidden md:block">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 bg-white/90 px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    borderColor: theme.colors.border,
                  }}
                >
                  <span
                    className="w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shadow-sm"
                    style={{
                      background: theme.colors.primary,
                      color: "#ffffff",
                    }}
                  >
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </span>

                  <span
                    className="hidden lg:block text-sm font-semibold"
                    style={{ color: theme.colors.textPrimary }}
                  >
                    {user.name || "User"}
                  </span>
                </button>

                {profileOpen && (
                  <div
                    className="absolute right-0 top-14 w-56 rounded-xl shadow-lg py-2 border border-neutral-200 z-50 animate-fadeIn"
                    style={{
                      background: theme.colors.card,
                    }}
                  >
                    <div className="px-4 py-2 text-xs border-b border-neutral-200" style={{ color: theme.colors.primaryDark }}>
                      {user.email}
                    </div>

                    {user.role === "Admin" && (
                      <button
                        onClick={() => (window.location.href = "/admin-portal/")}
                        className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                        style={{ color: theme.colors.textPrimary }}
                      >
                        Admin Portal
                      </button>
                    )}

                    <button
                      onClick={() => navigate("/dashboard")}
                      className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                      style={{ color: theme.colors.textPrimary }}
                    >
                      Agent Dashboard
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm font-semibold border-t border-neutral-200 hover:bg-rose-50 transition-colors mt-1"
                      style={{ color: theme.colors.danger }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MOBILE TOGGLE ICON */}
            {user && (
              <button
                onClick={() => setOpen(!open)}
                className="xl:hidden p-2 rounded-lg"
                style={{ color: theme.colors.textPrimary }}
              >
                {open ? <AiOutlineClose size={22} /> : <CiMenuFries size={22} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU PANEL */}
      <div
        className={`fixed top-0 right-0 h-full w-[80%] max-w-sm shadow-xl transition-transform duration-300 ease-in-out z-50 flex flex-col ${open ? "translate-x-0" : "translate-x-full"
          }`}
        style={{ background: theme.colors.card }}
      >
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: theme.colors.border }}>
          <span className="font-bold text-sm" style={{ color: theme.colors.textPrimary }}>Menu</span>
          <button onClick={() => setOpen(false)}>
            <AiOutlineClose size={20} style={{ color: theme.colors.textPrimary }} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          {groupTypes.map((group) => (
            <Link
              key={group.value}
              to={`/${group.path}`}
              onClick={() => setOpen(false)}
              className="text-base font-medium pb-2 border-b"
              style={{
                color: theme.colors.textPrimary,
                borderColor: theme.colors.border
              }}
            >
              {group.label}
            </Link>
          ))}

          <button
            onClick={() => {
              navigate("/dashboard");
              setOpen(false);
            }}
            className="text-left text-base font-medium py-1"
            style={{ color: theme.colors.textPrimary }}
          >
            Agent Dashboard
          </button>

          <button
            onClick={() => {
              handleLogout();
              setOpen(false);
            }}
            className="text-left text-base font-semibold py-2 mt-auto border-t"
            style={{ color: theme.colors.danger }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

// Main Wrapper Component
export default function Header({ user, handleLogout }) {
  const [hasToken, setHasToken] = useState(() => {
    return !!localStorage.getItem("frontend_token");
  });

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("frontend_token");
      setHasToken(!!token);
    };

    checkToken();
    window.addEventListener("storage", checkToken);
    return () => window.removeEventListener("storage", checkToken);
  }, []);

  if (hasToken) {
    return <OldHeader user={user} handleLogout={handleLogout} />;
  }

  return null;
}