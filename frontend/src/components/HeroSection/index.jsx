import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import makkahImg from "../../assets/images/makkah.webp";
import madinaImg from "../../assets/images/madina.webp";
import hero1 from "../../assets/images/hero1.webp";
import hero2 from "../../assets/images/hero2.webp";
import hero3 from "../../assets/images/hero3.webp";
import { theme } from "../../theme/theme";

// ─── Slide content ─────────────────────────────────────────────────────────
const slides = [
  {
    img: makkahImg,
    heading: "Journey to the",
    highlight: "Holy Land",
    sub: "Abid Air Travel & Tours (Pvt. Ltd.)",
  },
  {
    img: madinaImg,
    heading: "Visit the City of",
    highlight: "Madinah",
    sub: "Exclusive Umrah & Hajj Packages from Pakistan",
  },
  {
    img: hero1,
    heading: "Fly with",
    highlight: "Trusted Agents",
    sub: "Group Flights · UAE · KSA · Qatar · Bahrain · Muscat · UK",
  },
  {
    img: hero2,
    heading: "Your",
    highlight: "Sacred Journey",
    sub: "Affordable Group Seats — Booked in Minutes",
  },
  {
    img: hero3,
    heading: "Explore the",
    highlight: "World",
    sub: "Premium Travel Packages Tailored for You",
  },
];

// ─── Nav links (shown for logged-out users) ───────────────────────────────
const navLinks = [
  { label: "Home", href: "/" },
  { label: "Groups", href: "/all-groups" },
  { label: "Umrah", href: "/all-groups?group_type=UMRAH GROUP" },
  { label: "Contact", href: "#contact" },
];

const NAVY = "#050B1E";

// Shared horizontal padding — kept identical on the header and the hero
// content so the logo/nav align perfectly with the headline below them.
const EDGE_PADDING = "px-5 sm:px-8 md:px-10";

// ─── Main Component ────────────────────────────────────────────────────────
export default function HeroSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [current, setCurrent] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const timerRef = useRef(null);

  // Auth check
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("frontend_token"));
  }, []);

  // Slideshow auto-advance
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (i) => {
    clearInterval(timerRef.current);
    setCurrent(i);
    timerRef.current = setInterval(
      () => setCurrent((c) => (c + 1) % slides.length),
      5000,
    );
  };

  return (
    <>
      {/* ══════════ HEADER (logged-out only) ══════════ */}
      {!isLoggedIn && (
        <header
          className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${scrolled
            ? "bg-white/95 backdrop-blur-md shadow-lg"
            : "bg-transparent"
            }`}
        >
          <div className={`w-full ${EDGE_PADDING} flex items-center justify-between gap-4 md:gap-8 py-4`}>
            {/* Logo — shown only on mobile, where the nav pill (with its own logo) is hidden */}
            <Link to="/" className="shrink-0 md:hidden">
              <img
                style={{ height: "60px" }}
                aria-label="Abid Air Travel & Tours"
                src={logo}
                alt="Abid Air Travel & Tours"
                className={`h-12! w-auto object-contain transition-all duration-300 ${scrolled ? "" : "bg-white px-1.5 rounded-xl"
                  }`}
              />
            </Link>

            {/* Desktop nav — stretches to fill the space between the logo and the CTAs */}
            <nav
              className={`hidden md:flex flex-1 items-center gap-4 rounded-full pl-3 pr-8 py-2.5 transition-all duration-300 ${scrolled
                ? "bg-black/5 border border-black/5"
                : "bg-white/10 border border-white/15 backdrop-blur-sm"
                }`}
            >
              <Link to="/" className="shrink-0 flex items-center">
                <img
                  src={logo}
                  alt=""
                  className="h-14! w-auto object-contain bg-white/90 rounded-full px-2.5 py-1"
                />
              </Link>
              <div className="flex-1 flex items-center justify-center gap-10">
                {navLinks.map((l) => (
                  <Link
                    key={l.label}
                    to={l.href}
                    className={`text-sm font-medium tracking-wide transition-colors duration-200 hover:opacity-70 ${scrolled ? "text-gray-800" : "text-white/90"}`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              <Link
                to="/auth/login"
                className={`text-sm font-semibold px-5 py-2.5 rounded-full border transition-all duration-200 ${scrolled
                  ? "border-gray-300 text-gray-800 hover:border-[#1a417a] hover:text-[#1a417a]"
                  : "border-white/40 text-white hover:bg-white/10"
                  }`}
              >
                Login
              </Link>
              <Link
                to="/auth/register"
                style={
                  scrolled
                    ? { background: theme.colors.primary, color: "#fff" }
                    : { background: "#fff", color: NAVY }
                }
                className="text-sm font-bold px-5 py-2.5 rounded-full transition-all duration-200 shadow-lg"
              >
                Register
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setNavOpen((v) => !v)}
              className={`md:hidden flex flex-col gap-1.5 p-2 ${scrolled ? "text-gray-800" : "text-white"
                }`}
              aria-label="Toggle menu"
            >
              <span
                className={`block h-0.5 w-6 rounded bg-current transition-all duration-300 ${navOpen ? "rotate-45 translate-y-2" : ""}`}
              />
              <span
                className={`block h-0.5 w-6 rounded bg-current transition-all duration-300 ${navOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-0.5 w-6 rounded bg-current transition-all duration-300 ${navOpen ? "-rotate-45 -translate-y-2" : ""}`}
              />
            </button>
          </div>

          {/* Mobile menu drawer */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 bg-white/97 backdrop-blur-md ${navOpen ? "max-h-80 shadow-xl" : "max-h-0"
              }`}
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  onClick={() => setNavOpen(false)}
                  className="text-gray-800 font-medium py-1 border-b border-gray-100"
                >
                  {l.label}
                </Link>
              ))}
              <div className="flex gap-3 pt-2">
                <Link
                  to="/auth/login"
                  onClick={() => setNavOpen(false)}
                  className="flex-1 text-center text-sm font-bold py-2.5 rounded-full border-2 border-[#1a417a] text-[#1a417a]"
                >
                  Login
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setNavOpen(false)}
                  style={{ background: theme.colors.primary }}
                  className="flex-1 text-center text-sm font-bold py-2.5 rounded-full text-white"
                >
                  Register
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ══════════ HERO SECTION ══════════ */}
      <section className="relative min-h-screen flex flex-col overflow-hidden">
        {/* ── Backdrop layer ── */}
        <div className="absolute inset-0">
          {/* Base gradient — deep navy fading into the brand blue */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${NAVY} 0%, #0B1D3F 45%, ${theme.colors.primaryDark} 100%)`,
            }}
          />

          {/* Glow orbs, built from the theme palette */}
          <div
            className="absolute -top-32 -right-24 w-[34rem] h-[34rem] rounded-full blur-3xl"
            style={{ background: theme.colors.accent, opacity: 0.28 }}
          />
          <div
            className="absolute bottom-0 -left-16 w-96 h-96 rounded-full blur-3xl"
            style={{ background: theme.colors.primary, opacity: 0.18 }}
          />

          {/* Faint dotted texture */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Destination photo, softly masked into the gradient (desktop only) — the
              mask fades the photo's own alpha to transparent, so the true gradient
              underneath shows through with no hard seam. */}
          {slides.map((s, i) => (
            <div
              key={i}
              className={`hidden md:block absolute inset-0 transition-opacity duration-1000 ${i === current ? "opacity-100" : "opacity-0"
                }`}
              style={{
                WebkitMaskImage:
                  "linear-gradient(to left, black 0%, black 40%, transparent 78%)",
                maskImage:
                  "linear-gradient(to left, black 0%, black 40%, transparent 78%)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to top, black 55%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to top, black 55%, transparent 100%)",
                }}
              >
                <img
                  src={s.img}
                  alt=""
                  className="w-full! h-full! object-cover"
                  style={{
                    opacity: 0.85,
                    animation:
                      i === current ? "kenBurns 9s ease-out forwards" : "none",
                  }}
                />
                {/* colour wash to keep it on-brand */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: theme.colors.primaryDark,
                    mixBlendMode: "color",
                    opacity: 0.45,
                  }}
                />
              </div>
            </div>
          ))}

          {/* Top fade for nav legibility */}
          <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-black/40 to-transparent" />
        </div>

        {/* ── Hero text content (vertically centered) ── */}
        <div className={`relative z-10 flex-1 flex items-center ${EDGE_PADDING} pt-24`}>
          <div className="w-full">
            <div className="max-w-4xl">
              {/* Kicker */}
              <div className="flex items-center gap-2.5 mb-6">
                <span style={{ color: theme.colors.accent }}>✦</span>
                <span className="text-white/70 text-xs font-semibold tracking-[0.25em] uppercase">
                  Trusted Travel Partner
                </span>
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-[5vw] font-bold text-white leading-[1.05]">
                <span className="block">{slides[current].heading}</span>
                <span
                  style={{ color: theme.colors.accent }}
                  className="block"
                >
                  {slides[current].highlight}
                </span>
              </h1>

              <p className="mt-6 text-white/70 text-lg md:text-xl max-w-xl leading-relaxed">
                {slides[current].sub}
              </p>

              {/* CTA buttons */}
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to={isLoggedIn ? "/dashboard/groups" : "/auth/register"}
                  style={{ background: "#fff", color: NAVY }}
                  className="inline-flex items-center gap-2 font-bold text-sm px-7 py-3.5 rounded-full shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <span>Book a Ticket</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
                <Link
                  to="/all-groups"
                  className="inline-flex items-center gap-2 border border-white/30 hover:bg-white/10 text-white font-semibold text-sm px-7 py-3.5 rounded-full transition-all duration-200"
                >
                  View All Groups
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar: scroll indicator + slide dots ── */}
        <div className={`relative z-10 ${EDGE_PADDING} pb-8`}>
          <div className="w-full flex items-center justify-center sm:justify-between">
            <div className="hidden sm:flex items-center gap-3 text-white/60 text-sm font-medium">
              <svg
                className="w-4 h-4 animate-bounce"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25"
                />
              </svg>
              <span>Scroll for more</span>
            </div>

            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`rounded-md transition-all duration-300 ${i === current
                    ? "w-7 h-2 bg-white"
                    : "w-2 h-2 bg-white/30 hover:bg-white/60"
                    }`}
                />
              ))}
            </div>

            {/* spacer to balance the flex row on larger screens */}
            <div className="hidden sm:block w-24" />
          </div>
        </div>

        {/* ── Start Now card — pinned inside the section, no overflow/transform ── */}
        <Link
          to={isLoggedIn ? "/dashboard/groups" : "/auth/register"}
          className="hidden sm:flex absolute z-20 bottom-6 right-6 md:bottom-10 md:right-10 items-center gap-4 bg-white rounded-2xl shadow-2xl px-6 py-5"
        >
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-gray-400">
              Meet Our Travel Team
            </p>
            <p className="font-bold text-gray-900 text-base mt-0.5">
              Start Now
            </p>
          </div>
          <span
            style={{ background: theme.colors.primary }}
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </span>
        </Link>
      </section>
    </>
  );
}
