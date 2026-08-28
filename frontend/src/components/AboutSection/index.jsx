import React from "react";
import { Star, ArrowUpRight } from "lucide-react";
import madinaImg from "../../assets/images/madina.webp";
import makkahImg from "../../assets/images/makkah.webp";

const NAVY = "#1a417a";

export default function AboutSection() {
  return (
    <section className="relative py-24 md:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-8 md:gap-16">
          {/* LEFT — small label */}
          <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: NAVY }}>
            Our Story
            <ArrowUpRight className="w-4 h-4" />
          </div>

          {/* RIGHT — content */}
          <div>
            {/* Badge */}
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-3.5 h-3.5 fill-[#09B0FF] text-[#09B0FF]" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: NAVY }}>
                Award Winning Travel Agency
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl font-bold leading-[1.2] max-w-3xl mb-10 md:mb-12">
              <span style={{ color: NAVY }}>Our Mission Is Simple</span>{" "}
              <span className="text-gray-400">
                Yet Powerful: To Deliver Journeys That Inspire, Connect, and
                Leave a Lasting Impact!
              </span>
            </h2>

            {/* Description + Image Gallery */}
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {/* Left column — copy on top, image below */}
              <div className="flex flex-col gap-6">
                <p className="text-sm md:text-[15px] leading-relaxed max-w-sm">
                  <span className="font-semibold text-gray-900">
                    Explore a journey
                  </span>{" "}
                  <span className="text-gray-400">
                    where faith and comfort merge to shape what's next.
                  </span>{" "}
                  <span className="font-semibold text-gray-900">
                    This experience isn't just about travel,
                  </span>{" "}
                  <span className="text-gray-400">
                    it's about creating memories that last a lifetime.
                  </span>
                </p>

                <div className="rounded-2xl overflow-hidden h-56 sm:h-64 md:h-90 group">
                  <img
                    src={madinaImg}
                    alt="Masjid an-Nabawi, Madinah"
                    className="w-full h-full! object-cover grayscale-35 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  />
                </div>
              </div>

              {/* Right column — tall companion image */}
              <div className="rounded-2xl overflow-hidden h-72 sm:h-96 md:h-120 group">
                <img
                  src={makkahImg}
                  alt="The Holy Kaaba, Makkah"
                  className="w-full h-full! object-cover grayscale-35 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
