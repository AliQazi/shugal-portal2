import React from "react";
import logo from "../../assets/images/logo.png";
import footerbg from "../../assets/images/footerbg1.jpg";
import { CiLogin } from "react-icons/ci";
import { FaPhoneAlt } from "react-icons/fa";
import { IoMail, IoLocationSharp } from "react-icons/io5";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { theme } from "../../theme/theme";
import { Plane, ArrowUpRight } from "lucide-react";
import Lottie from "react-lottie";
import ctaAnimation from "../../assets/animations/cta.json";
import iata from "../../assets/images/iata.avif";
const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=923197298467&text&type=phone_number&app_absent=0";
const lottieOptions = {
  loop: true,
  autoplay: true,
  animationData: ctaAnimation,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};
export default function Footer({ user }) {
  return (
    <>
      {/* --- TOP CTA PANEL (Sleek Geometric Infrastructure) --- */}
      {!user?._id && (
        <div
          /* FIXED: Linear gradient render karne ke liye background use kiya hai */
          style={{ background: theme.colors.primaryDark }}
          className="font-home relative px-6 overflow-hidden"
        >
          {/* Subtle Graphic Grid Lines Layer */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-size[32px_32px]" />

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between relative z-10 gap-10">
            <div className="max-w-2xl text-center md:text-left flex flex-col sm:flex-row items-center md:items-start gap-6">
              {/* Refened Vector Flight Icon Container */}
              <div
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center border border-white/20 shrink-0 text-white"
              >
                <Plane className="w-8 h-8 -rotate-45" />
              </div>

              <div className="text-white">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                  Your Travel Journey Starts Here
                </h2>
                <p className="text-sm opacity-90 max-w-lg leading-relaxed">
                  Sign up to manage parameters, access real-time inventory
                  adjustments, and explore exclusive global business packages.
                </p>
              </div>
            </div>

            {/* Premium Button Blocks */}
            <div className="flex flex-wrap items-center justify-center gap-4 shrink-0">
              <Lottie options={lottieOptions} height={380} width={380} />
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN SYSTEM FOOTER --- */}
      <footer
        className="relative pt-20 text-white border-t border-stone-800"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(28, 25, 23, 0.97), rgba(28, 25, 23, 0.99)), url(${footerbg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 pb-16">
          {/* Brand Panel Column - Span 4 */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-6">
            <div>
              {/* <div className="inline-block p-2.5 bg-white rounded-xl mb-4 shadow-md">
                <img
                  src={logo}
                  alt="Abid Air Travel & Tours LOGO"
                  className="h-20! w-auto object-contain"
                />
              </div> */}
              <h3
                style={{ color: theme.colors.sidebarTextLight }}
                className="text-lg font-bold tracking-tight uppercase"
              >
                Abid Air Travel & Tours
              </h3>
              <p
                style={{ color: theme.colors.sidebarText }}
                className="mt-3 text-sm leading-relaxed max-w-xs opacity-75"
              >
                Engineered for global connectivity. Delivering premium
                operations modules and dynamic inventory management setups
                worldwide.
              </p>
              <img src={iata} alt="" srcset="" />
            </div>
          </div>

          {/* Dynamic Directories Columns - Span 8 */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Nav Links Framework */}
            <div>
              <h4
                style={{ color: theme.colors.sidebarTextLight }}
                className="text-xs font-mono font-bold uppercase tracking-widest mb-6"
              >
                Quick Links
              </h4>
              <div className="flex flex-col space-y-3">
                {["Home", "About", "Packages"].map((item) => {
                  const props =
                    item === "Contact"
                      ? {
                          href: WHATSAPP_URL,
                          target: "_blank",
                          rel: "noopener noreferrer",
                        }
                      : {};
                  const Tag = item === "Contact" ? "a" : "button";

                  return (
                    <Tag
                      key={item}
                      {...props}
                      style={{ color: theme.colors.sidebarText }}
                      className="text-left text-sm transition-all duration-300 hover:text-white hover:translate-x-1 flex items-center gap-1 group"
                    >
                      <span>{item}</span>
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </Tag>
                  );
                })}
              </div>
            </div>

            {/* Module Allocations */}
            <div>
              <h4
                style={{ color: theme.colors.sidebarTextLight }}
                className="text-xs font-mono font-bold uppercase tracking-widest mb-6"
              >
                Groups
              </h4>
              <div className="flex flex-col space-y-3">
                {["Umrah Groups", "UAE Groups", "KSA Groups"].map((item) => (
                  <button
                    key={item}
                    style={{ color: theme.colors.sidebarText }}
                    className="text-left text-sm transition-all duration-300 hover:text-white hover:translate-x-1"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Corporate Endpoint Context */}
            <div>
              <h4
                style={{ color: theme.colors.sidebarTextLight }}
                className="text-xs font-mono font-bold uppercase tracking-widest mb-6"
              >
                Contact Us
              </h4>
              <div className="flex flex-col space-y-4 text-xs">
                <a
                  href="tel:++923197298467"
                  style={{ color: theme.colors.sidebarText }}
                  className="flex items-center gap-3 hover:text-white transition"
                >
                  <FaPhoneAlt className="text-stone-500 shrink-0" />
                  <span className="font-mono text-sm">+92 319 7298467</span>
                </a>

                <a
                  href="tel:++923197298467"
                  style={{ color: theme.colors.sidebarText }}
                  className="flex items-center gap-3 hover:text-white transition"
                >
                  <FaPhoneAlt className="text-stone-500 shrink-0" />
                  <span className="font-mono text-sm">+92 300 7298467</span>
                </a>

                <a
                  href="#"
                  style={{ color: theme.colors.sidebarText }}
                  className="flex items-center gap-3 hover:text-white transition"
                >
                  <FaPhoneAlt className="text-stone-500 shrink-0" />
                  <span className="font-mono text-sm">LANDLINE</span>
                  <span className="font-mono text-sm">041 3421501-4</span>
                </a>

                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=abid_intl@msn.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: theme.colors.sidebarText }}
                  className="flex items-center gap-3 break-all hover:text-white transition"
                >
                  <IoMail className="text-stone-500 shrink-0" />
                  <span className="text-sm">abid_intl@msn.com</span>
                </a>

                {/* <a
                  href="https://www.google.com/maps?q=Office+36,+37+Jinnah+Stadium,+Gujranwala,+Pakistan"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 hover:text-white transition leading-normal"
                  style={{ color: theme.colors.sidebarText }}
                >
                  <IoLocationSharp className="mt-0.5 text-base text-stone-500 shrink-0" />
                  <span>MAIN OFFICE</span>
                  <span className="text-xs opacity-90">
                    Office 36, 37 Jinnah Stadium, Gujranwala, Pakistan +92 55 37
                    30 255/56
                  </span>
                </a> */}
              </div>
            </div>
          </div>
        </div>

        {/* --- SYSTEM METADATA BOTTOM FOOTER --- */}
        <div
          style={{ borderColor: theme.colors.sidebarBorder }}
          className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 py-6 border-t text-xs"
        >
          <a
            href="https://flyingzone.nexagensolution.com/"
            style={{ color: theme.colors.sidebarText }}
            className="hover:text-white font-mono opacity-80"
          >
            &copy; {dayjs().year()} Abid Air Travel & Tours. All rights reserved.
          </a>

          {/* <span
            style={{ color: theme.colors.sidebarText }}
            className="opacity-60 font-mono tracking-tight"
          >
            Designed & Developed by Nexagen Solution
          </span> */}
        </div>
      </footer>
    </>
  );
}
