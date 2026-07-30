import React from "react";
import {
  Compass,
  Sparkles,
  Users,
  Clock,
  Shield,
  ChevronRight,
  Globe,
  MapPin,
  Award,
  CheckCircle,
} from "lucide-react";

// Global image variables - change these URLs as needed
const ABOUT_IMAGE_1 =
  "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&q=80&w=1000";
const ABOUT_IMAGE_2 =
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&q=80&w=600";
const ABOUT_IMAGE_3 =
  "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=800";

export default function AboutSection() {
  const features = [
    {
      icon: <Compass className="w-5 h-5" />,
      title: "Curated Journeys",
      desc: "Handpicked experiences designed just for you",
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Expert Guides",
      desc: "Local experts who know every hidden gem",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Safe & Secure",
      desc: "Your safety is our top priority at all times",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "24/7 Support",
      desc: "Round-the-clock assistance wherever you are",
    },
  ];

  const highlights = [
    "Premium travel experiences worldwide",
    "Certified & experienced tour guides",
    "Best price guaranteed for all packages",
    "24/7 customer support assistance",
  ];

  const stats = [
    { number: "12K+", label: "Happy Travelers" },
    { number: "45+", label: "Countries Visited" },
    { number: "98%", label: "Satisfaction Rate" },
    { number: "15+", label: "Awards Won" },
  ];

  return (
    <section className="relative py-24 md:py-32 bg-linear-to-br from-slate-50 via-white to-orange-50/30 overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-[#1a417a]/5 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-linear-to-tr from-[#e95432]/5 to-transparent"></div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#e95432]/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#1a417a]/10 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* LEFT SIDE - Image Composition */}
          <div className="relative order-2 lg:order-1">
            {/* Main Image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-[#1a417a]/10">
              <img
                src={ABOUT_IMAGE_1}
                alt="About Abid Air"
                className="w-full h-112.5 md:h-137.5 object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#1a417a]/40 via-transparent to-transparent"></div>
            </div>

            {/* Small Floating Image */}
            <div className="absolute -bottom-8 -right-8 md:-bottom-12 md:-right-12 w-40 h-52 md:w-52 md:h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src={ABOUT_IMAGE_2}
                alt="Travel Experience"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Experience Badge */}
            <div className="absolute top-8 -left-4 md:top-12 md:-left-8 bg-white rounded-2xl shadow-2xl p-4 md:p-5 border border-gray-100">
              <div className="flex flex-col items-center">
                <span className="text-3xl md:text-4xl font-black text-[#1a417a]">
                  15
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Years
                </span>
                <div className="w-10 h-1 bg-linear-to-r from-[#e95432] to-[#f7931e] rounded-full mt-2"></div>
                <span className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">
                  Of Excellence
                </span>
              </div>
            </div>

            {/* Rating Badge */}
            <div className="absolute bottom-20 -left-4 md:bottom-28 md:-left-6 bg-white/95 backdrop-blur-xl p-3 md:p-4 rounded-2xl shadow-2xl border border-white/50">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-linear-to-br from-[#1a417a] to-[#2a5a9a] flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                    A
                  </div>
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-linear-to-br from-[#e95432] to-[#f7931e] flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                    S
                  </div>
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-linear-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                    M
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1a417a] flex items-center gap-1">
                    4.9⭐
                  </p>
                  <p className="text-xs text-gray-500">1,200+ Reviews</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Content */}
          <div className="order-1 lg:order-2">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a417a]/5 border border-[#1a417a]/10 mb-6">
              <span className="w-1.5 h-1.5 bg-[#e95432] rounded-full"></span>
              <span className="text-[10px] font-bold text-[#1a417a] uppercase tracking-[0.2em]">
                About Us
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1a417a] leading-[1.1] mb-4">
              Best
              <span className="block text-transparent bg-clip-text bg-linear-to-r from-[#e95432] to-[#f7931e]">
                Travel Agency
              </span>
            </h2>

            <p className="text-sm text-gray-400 font-bold uppercase tracking-[0.15em] mb-4">
              Company Since 2008
            </p>

            {/* Description */}
            <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-6">
              We craft personalized travel experiences that go beyond the
              ordinary. From exotic destinations to cultural immersions, every
              journey with us is a story waiting to be told.
            </p>

            {/* Highlights List */}
            <div className="space-y-2.5 mb-8">
              {highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#e95432] shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm md:text-base font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 p-4 md:p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-xl md:text-2xl font-black text-[#1a417a]">
                    {stat.number}
                  </div>
                  <div className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <button className="group relative bg-[#1a417a] text-white px-8 md:px-10 py-3.5 md:py-4 rounded-full font-bold text-sm md:text-base transition-all duration-300 hover:bg-[#e95432] hover:shadow-2xl hover:shadow-[#e95432]/30 overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  Find Tours
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>

              <button className="flex items-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-full border-2 border-[#1a417a]/20 text-[#1a417a] font-bold text-sm md:text-base hover:border-[#e95432] hover:text-[#e95432] transition-all duration-300">
                <MapPin className="w-4 h-4" />
                Find Your Best Destination
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
