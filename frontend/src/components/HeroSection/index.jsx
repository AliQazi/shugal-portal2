import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/images/logo.png";
import ukImg from "../../assets/images/uk.webp";
import qatarImg from "../../assets/images/qatar.jpg";
import mascatImg from "../../assets/images/mascat.webp";
import uaeImg from "../../assets/images/uae.webp";
import bahrainImg from "../../assets/images/bahrain.webp";
import jeddahImg from "../../assets/images/jeddah.webp";
import madinaImg from "../../assets/images/madina.webp";
import makkahImg from "../../assets/images/makkah.webp";
import hero1 from "../../assets/images/hero1.webp";
import hero2 from "../../assets/images/hero2.webp";
import hero3 from "../../assets/images/hero3.webp";
import { theme } from "../../theme/theme";

// ─── Slide backgrounds ────────────────────────────────────────────────────────
const slides = [
  {
    img: makkahImg,
    heading: "Journey to the",
    highlight: "Holy Land",
    sub: "Abid Air & Tours (Pvt. Ltd.)",
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

// ─── Tour group cards ──────────────────────────────────────────────────────────
const heroGroups = [
  { label: "All Groups", image: madinaImg, icon: "🕌" },
  { label: "UAE Groups", image: uaeImg, icon: "🇦🇪" },
  { label: "KSA Groups", image: jeddahImg, icon: "🇸🇦" },
  { label: "Bahrain Groups", image: bahrainImg, icon: "🇧🇭" },
  { label: "Muscat Groups", image: mascatImg, icon: "🇴🇲" },
  { label: "Qatar Groups", image: qatarImg, icon: "🇶🇦" },
  { label: "UK Groups", image: ukImg, icon: "🇬🇧" },
  { label: "Umrah Packages", image: makkahImg, icon: "🕋" },
];

// ─── Nav links (shown for logged-out users) ───────────────────────────────────
const navLinks = [
  { label: "Home", href: "/" },
  { label: "Groups", href: "/all-groups" },
  { label: "Umrah", href: "/all-groups?group_type=UMRAH GROUP" },
  { label: "Contact", href: "#contact" },
];

// ─── Cloud SVG strip ──────────────────────────────────────────────────────────
function Clouds() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden h-36 z-20">
      {/* Cloud layer 1 – slow */}
      <svg
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        className="absolute bottom-0 w-[200%] h-full animate-cloud-slow"
        fill="white"
        opacity="0.9"
      >
        <path d="M0,80 C60,50 120,110 200,85 C280,60 340,100 420,80 C500,60 560,110 640,90 C720,70 790,115 870,90 C950,65 1010,105 1100,85 C1190,65 1260,105 1340,85 C1380,75 1420,90 1440,80 L1440,140 L0,140 Z" />
      </svg>
      {/* Cloud layer 2 – medium */}
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute bottom-0 w-[200%] h-full animate-cloud-medium"
        fill="white"
        opacity="0.7"
      >
        <path d="M0,100 C80,70 160,115 260,95 C360,75 440,110 540,90 C640,70 720,115 820,95 C920,75 1000,110 1100,90 C1200,70 1300,110 1440,100 L1440,120 L0,120 Z" />
      </svg>
      {/* Cloud layer 3 – fast, full white fill */}
      <svg
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        className="absolute bottom-0 w-[200%] h-full animate-cloud-fast"
        fill="white"
      >
        <path d="M0,85 C100,55 200,100 320,80 C440,60 540,100 660,80 C780,60 880,100 1000,80 C1120,60 1240,100 1360,80 L1440,85 L1440,100 L0,100 Z" />
      </svg>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
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
          className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
            scrolled
              ? "bg-white/95 backdrop-blur-md shadow-lg"
              : "bg-transparent"
          }`}
        >
          <div className="max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="shrink-0">
              <img
                style={{ height: "60px" }}
                aria-label="Abid Air & Tours"
                src={logo}
                alt="Abid Air"
                className={`h-12 w-auto object-contain transition-all duration-300 ${
                  scrolled ? "" : "bg-white px-5 rounded-2xl"
                }`}
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  className={`text-sm font-semibold tracking-wide transition-colors duration-200 hover:text-[#f15a24] ${
                    scrolled ? "text-gray-800" : "text-white drop-shadow"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/auth/login"
                className={`text-sm font-bold px-5 py-2.5 rounded-full border-2 transition-all duration-200 ${
                  scrolled
                    ? "border-[#1a417a] text-[#1a417a] hover:bg-[#1a417a] hover:text-white"
                    : "border-white text-white hover:bg-white hover:text-[#1a417a]"
                }`}
              >
                Login
              </Link>
              <Link
                style={{
                  background: theme?.colors?.primary,
                }}
                to="/auth/register"
                className="text-sm font-bold px-5 py-2.5 rounded-full text-white hover:bg-[#d94e1f] transition-all duration-200 shadow-lg shadow-red-500/30"
              >
                Register
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setNavOpen((v) => !v)}
              className={`md:hidden flex flex-col gap-1.5 p-2 ${
                scrolled ? "text-gray-800" : "text-white"
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
            className={`md:hidden overflow-hidden transition-all duration-300 bg-white/97 backdrop-blur-md ${
              navOpen ? "max-h-80 shadow-xl" : "max-h-0"
            }`}
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  onClick={() => setNavOpen(false)}
                  className="text-gray-800 font-semibold py-1 border-b border-gray-100"
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
                  className="flex-1 text-center text-sm font-bold py-2.5 rounded-full bg-[#f15a24] text-white"
                >
                  Register
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ══════════ HERO SECTION ══════════ */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
        {/* ── Slideshow backgrounds ── */}
        {slides.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={s.img}
              alt=""
              className="w-full h-full object-cover scale-105"
              style={{
                height: "100%",
                animation:
                  i === current ? "kenBurns 8s ease-out forwards" : "none",
              }}
            />
          </div>
        ))}

        {/* ── Gradient overlays ── */}
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/40 to-black/30 z-10" />
        <div className="absolute inset-0 bg-linear-to-r from-black/50 to-transparent z-10" />

        {/* ── Decorative crescent & star ── */}
        <div className="absolute top-28 right-10 z-10 opacity-20 hidden lg:block select-none text-8xl">
          ☪
        </div>

        {/* ── Hero text content ── */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10 w-full pt-28 pb-8">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <span className="text-yellow-400 text-sm">✦</span>
              <span className="text-white/90 text-xs font-semibold tracking-widest uppercase">
                Trusted Travel Partner
              </span>
              <span className="text-yellow-400 text-sm">✦</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-tight drop-shadow-2xl">
              <span className="block">{slides[current].heading}</span>
              <span
                style={{ color: theme.colors.accentDark }}
                className="block"
              >
                {slides[current].highlight}
              </span>
            </h1>

            <p className="mt-5 text-white/80 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
              {slides[current].sub}
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                style={{
                  background: theme.colors.primary,
                }}
                to={isLoggedIn ? "/dashboard/groups" : "/auth/register"}
                className="inline-flex items-center gap-2 hover:bg-[#d94e1f] text-white font-bold text-sm px-7 py-3.5 rounded-full shadow-xl shadow-red-500/40 transition-all duration-200 hover:scale-105"
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
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold text-sm px-7 py-3.5 rounded-full transition-all duration-200"
              >
                View All Groups
              </Link>
            </div>

            {/* Quick stats */}
            <div className="mt-12 flex flex-wrap gap-6 md:gap-10">
              {[
                { num: "10,000+", label: "Happy Travellers" },
                { num: "50+", label: "Group Destinations" },
                { num: "14+", label: "Years Experience" },
              ].map((s) => (
                <div key={s.label} className="text-center md:text-left">
                  <p className="text-2xl font-black text-white">{s.num}</p>
                  <p className="text-white/60 text-xs font-medium tracking-wide mt-0.5">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Slide dots ── */}
        <div className="relative z-20 flex justify-center gap-2 pb-40">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-8 h-2.5 bg-[#f15a24]"
                  : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>

        {/* ── Animated clouds ── */}
        <Clouds />
      </section>

      {/* ══════════ GROUP CARDS STRIP ══════════ */}
      <section className="relative bg-white pt-14 pb-20">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          {/* Section header */}
          <div className="text-center mb-10">
            <p className="text-[#f15a24] text-sm font-bold tracking-widest uppercase mb-2">
              ✦ Our Packages ✦
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">
              Explore Group Travel Packages
            </h2>
            <p className="text-gray-500 mt-3 text-base max-w-xl mx-auto">
              Choose your destination and let us handle the rest. Affordable,
              reliable, and fully managed group flights.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {heroGroups.map((group) => (
              <Link
                key={group.label}
                to={isLoggedIn ? "/dashboard/groups" : "/auth/register"}
                className="group relative h-48 sm:h-56 overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5"
              >
                <img
                  style={{
                    height: "100%",
                  }}
                  src={group.image}
                  alt={group.label}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
                {/* hover shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-t from-[#f15a24]/40 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{group.icon}</span>
                    <span className="text-white font-bold text-sm leading-tight">
                      {group.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-white/70 text-xs font-medium opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span>
                      {isLoggedIn ? "View Groups" : "Register to Book"}
                    </span>
                    <svg
                      className="w-3 h-3"
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
                  </div>
                </div>

                {/* border glow on hover */}
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/30 transition-all duration-500" />
              </Link>
            ))}
          </div>

          {/* Bottom CTA if not logged in */}
          {!isLoggedIn && (
            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm mb-4">
                Create a free account to browse and book group travel packages
              </p>
              <Link
                style={{ backgroundColor: theme?.colors?.primary }}
                to="/auth/register"
                className="inline-flex items-center gap-2 hover:bg-[#153260] text-white font-bold text-sm px-8 py-3.5 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
              >
                Register for Free
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
            </div>
          )}
        </div>
      </section>
    </>
  );
}
