import React from "react";
import { BiSolidPlane } from "react-icons/bi";
import { GiFalconMoon } from "react-icons/gi";
import { LuHotel } from "react-icons/lu";
import {
  FaShieldAlt,
  FaHeadset,
  FaPlane,
  FaGlobe,
  FaChevronRight,
} from "react-icons/fa";
import { theme } from "../../theme/theme";

// Import a high-quality travel or texture background image for the fixed parallax panel
import parallaxBg from "../../assets/images/madina.webp";

const features = [
  {
    title: "Global Connectivity",
    desc: "Instant access to 500+ airlines worldwide with competitive pricing and 24/7 dedicated support.",
    icon: <BiSolidPlane className="text-2xl rotate-45" />,
    color: theme?.colors?.primary || "#1a417a",
  },
  {
    title: "High-Success Visas",
    desc: "Our expert documentation handling ensures a seamless approval process for all international destinations.",
    icon: <FaGlobe className="text-2xl" />,
    color: "#22c55e",
  },
  {
    title: "Sacred Journeys",
    desc: "Umrah packages designed with spirituality in mind, featuring premium hotels near the Haram.",
    icon: <GiFalconMoon className="text-2xl" />,
    color: theme?.colors?.accent || "#f15a24",
  },
  {
    title: "Exclusive Stays",
    desc: "From 5-star luxury to boutique comfort, we secure the best rates through our direct hotel partnerships.",
    icon: <LuHotel className="text-2xl" />,
    color: theme?.colors?.primary || "#1a417a",
  },
];

export default function ChooseUsSection() {
  return (
    <section className="w-full flex flex-col lg:flex-row min-h-screen bg-white font-sans overflow-hidden">
      {/* --- LEFT SIDE: Sticky Parallax Background Panel --- */}
      <div className="w-full lg:w-2/5 relative min-h-100 lg:min-h-screen overflow-hidden">
        {/* Parallax Background Engine */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{ backgroundImage: `url(${parallaxBg})` }}
        />
        {/* Dark Tint Cover Overlay for clean content readability */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Content Box Over Background */}
        <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-between z-10 text-white">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 backdrop-blur-md border border-white/10 mb-6">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-[9px] font-bold tracking-widest uppercase text-orange-400">
                The Advantage
              </p>
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
              Why Travelers <br />
              Trust Our <br />
              Expertise
            </h2>
          </div>

          <div className="max-w-sm pt-6 border-t border-white/20">
            <p className="text-white/80 text-sm leading-relaxed font-medium italic">
              "We don't just book trips; we curate life-changing moments. Trust
              the experts who put your journey first."
            </p>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: Core Content & Features Scroll Block --- */}
      <div
        className="w-full lg:w-3/5 p-8 md:p-16 flex flex-col justify-between"
        style={{ backgroundColor: theme?.colors?.lightBg || "#f8fafc" }}
      >
        {/* Simple & Decent Header */}
        <div className="mb-12">
          <h3
            className="text-2xl md:text-3xl font-black tracking-tight uppercase"
            style={{ color: theme?.colors?.primary || "#1a417a" }}
          >
            Abid Air Advantage
          </h3>
          <p className="text-gray-400 text-xs tracking-wider uppercase font-semibold mt-1">
            Premium Travel Solutions & Infrastructure
          </p>
        </div>

        {/* Clean, Non-flashy Features Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {features.map((item, i) => (
            <div
              key={i}
              className="p-6 bg-white rounded-xl border border-neutral-100 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Standard Circle Icon */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white mb-5 shadow-sm"
                  style={{ backgroundColor: item.color }}
                >
                  {item.icon}
                </div>

                <h4
                  className="text-lg font-bold mb-2 tracking-tight"
                  style={{ color: theme?.colors?.primary || "#1a417a" }}
                >
                  {item.title}
                </h4>
                <p className="text-gray-500 text-xs leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* --- PREMIUM COMPACT TRUST BAR --- */}
        <div
          className="p-6 rounded-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          style={{ backgroundColor: theme?.colors?.primaryDark || "#112b4e" }}
        >
          {/* Item 1 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
              <FaShieldAlt className="text-lg text-orange-400" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                Protection
              </p>
              <p className="text-sm font-bold">IATA Licensed</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-white/10" />

          {/* Item 2 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
              <FaHeadset className="text-lg text-green-400" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                Human-First
              </p>
              <p className="text-sm font-bold">24/7 Global Support</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-white/10" />

          {/* Item 3 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
              <FaPlane className="text-lg text-blue-400" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                Expertise
              </p>
              <p className="text-sm font-bold">Seamless Planning</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
