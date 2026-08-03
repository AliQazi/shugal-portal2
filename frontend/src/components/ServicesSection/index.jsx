import React, { useRef, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plane,
  Moon,
  Shield,
  Bed,
  Map,
  Users,
  Star,
  Clock,
  Sparkles,
} from "lucide-react";

// Keeping your image imports
import service1 from "../../assets/images/service1.webp";
import service2 from "../../assets/images/service2.webp";
import service3 from "../../assets/images/service3.webp";
import service4 from "../../assets/images/service4.webp";
import service5 from "../../assets/images/service5.webp";
import service6 from "../../assets/images/service6.webp";
import { theme } from "../../theme/theme";

const services = [
  {
    id: 1,
    title: "Air Tickets",
    icon: <Plane size={20} />,
    description:
      "Global flight bookings with premium lounge access and priority boarding.",
    image: service1,
    tag: "Flight",
    price: "From $299",
    rating: 4.9,
  },
  {
    id: 2,
    title: "Umrah Packages",
    icon: <Moon size={20} />,
    description:
      "Spiritual journeys crafted with luxury stays and private transportation.",
    image: service2,
    tag: "Spiritual",
    price: "From $1,499",
    rating: 4.8,
  },
  {
    id: 3,
    title: "Visa Services",
    icon: <Shield size={20} />,
    description:
      "Fast-track processing with 98% approval rate for all destinations.",
    image: service3,
    tag: "Expertise",
    price: "From $99",
    rating: 4.7,
  },
  {
    id: 4,
    title: "Hotel Packages",
    icon: <Bed size={20} />,
    description:
      "Handpicked 5-star hotels at exclusive rates with complimentary upgrades.",
    image: service4,
    tag: "Comfort",
    price: "From $199/night",
    rating: 4.9,
  },
  {
    id: 5,
    title: "Travel Consultancy",
    icon: <Map size={20} />,
    description:
      "Expert itineraries designed for your budget with 24/7 support.",
    image: service5,
    tag: "Planning",
    price: "From $149",
    rating: 4.6,
  },
  {
    id: 6,
    title: "Meet & Assist",
    icon: <Users size={20} />,
    description:
      "Seamless airport VIP transfers with personal concierge for families.",
    image: service6,
    tag: "VIP",
    price: "From $89",
    rating: 4.9,
  },
];

export default function ServicesSection() {
  const scrollContainerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const cardWidth = 320; // Card width + gap
      const scrollAmount = direction === "left" ? -cardWidth : cardWidth;

      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });

      // Update current index
      const newIndex =
        direction === "left"
          ? Math.max(0, currentIndex - 1)
          : Math.min(services.length - 1, currentIndex + 1);
      setCurrentIndex(newIndex);
    }
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (!isAutoScrolling || isHovering) return;

    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const maxScroll =
          scrollContainerRef.current.scrollWidth -
          scrollContainerRef.current.clientWidth;
        const currentScroll = scrollContainerRef.current.scrollLeft;

        if (currentScroll >= maxScroll - 10) {
          // Smooth scroll back to start
          scrollContainerRef.current.scrollTo({
            left: 0,
            behavior: "smooth",
          });
          setCurrentIndex(0);
        } else {
          scroll("right");
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoScrolling, isHovering, currentIndex]);

  // Handle scroll events to update index
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardWidth = 320;
      const newIndex = Math.round(scrollLeft / cardWidth);
      if (newIndex !== currentIndex && newIndex < services.length) {
        setCurrentIndex(newIndex);
      }
    }
  };

  return (
    <section className="flex flex-col lg:flex-row w-full min-h-145 bg-white overflow-hidden font-sans relative">
      {/* --- LEFT PANEL: Enhanced Promo Block --- */}
      <div
        className="w-full lg:w-1/4 p-8 md:p-12 flex flex-col justify-between text-white relative shrink-0 overflow-hidden"
        style={{ backgroundColor: theme?.colors?.primaryDark || "#0a1a2f" }}
      >
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/5 rounded-full blur-2xl" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-orange-400" />
            <span className="text-xs uppercase tracking-widest text-orange-400 font-bold">
              Exclusive Rates
            </span>
          </div>

          <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-none">
            Up To <br />
            <span className="text-orange-400">50%</span> <br />
            <span className="text-2xl font-light tracking-normal">OFF</span>
          </h2>

          <p className="text-sm text-white/60 max-w-xs mt-4 leading-relaxed">
            Book now and unlock premium experiences at unbeatable prices.
            Limited time offer.
          </p>
        </div>

        {/* Enhanced Stats */}
        <div className="relative z-10 mt-12 lg:mt-0 grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
          <div className="group cursor-pointer">
            <p className="text-2xl font-bold group-hover:text-orange-400 transition-colors">
              50k+
            </p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">
              Tickets Sold
            </p>
          </div>
          <div className="group cursor-pointer">
            <p className="text-2xl font-bold group-hover:text-orange-400 transition-colors">
              12k+
            </p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">
              Happy Clients
            </p>
          </div>
          <div className="group cursor-pointer">
            <p className="text-2xl font-bold group-hover:text-orange-400 transition-colors">
              98%
            </p>
            <p className="text-[10px] text-white/60 uppercase tracking-wider">
              Satisfaction
            </p>
          </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: Enhanced Carousel --- */}
      <div
        className="w-full lg:w-3/4 p-8 md:p-12 flex flex-col justify-between overflow-hidden relative"
        style={{ backgroundColor: "#f6f6f6" }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, white 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Header with Enhanced Controls */}
        <div className="relative z-10 flex items-end justify-between mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-8 rounded-full" />
              <p className="text-xs uppercase tracking-widest text-black/80 font-semibold">
                Our Offerings
              </p>
            </div>
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-black">
              Incredible{" "}
              <span
                style={{
                  color: theme.colors.accent,
                }}
              >
                Last-Minute
              </span>{" "}
              Offers
            </h3>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => scroll("left")}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white hover:bg-orange-400 text-black hover:text-white transition-all duration-300 hover:scale-105 shadow-md border border-black/5"
              aria-label="Previous items"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white hover:bg-orange-400 text-black hover:text-white transition-all duration-300 hover:scale-105 shadow-md border border-black/5"
              aria-label="Next items"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* Enhanced Scroll Container with Full-Sized Images */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onMouseEnter={() => {
            setIsHovering(true);
            setIsAutoScrolling(false);
          }}
          onMouseLeave={() => {
            setIsHovering(false);
            setIsAutoScrolling(true);
          }}
          className="relative z-10 flex gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {services.map((service, index) => (
            <div
              key={service.id}
              className="min-w-70 md:min-w-85 h-105 rounded-2xl overflow-hidden relative group snap-start shrink-0 shadow-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* Full-Sized Image with Zoom Effect */}
              <div className="absolute inset-0 w-full h-full">
                <img
                  loading="lazy"
                  style={{
                    height: "100%",
                  }}
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>

              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent group-hover:from-black/95 transition-all duration-500" />

              {/* Enhanced Status Tags */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black bg-white/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center gap-1.5">
                  <Star size={12} className="fill-orange-400 text-orange-400" />
                  {service.rating}
                </span>
                <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-black/50 backdrop-blur-sm rounded-lg border border-white/20">
                  {service.tag}
                </span>
              </div>

              {/* Icon Attachment with Animation */}
              <div className="absolute top-20 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:scale-110 transition-transform duration-300">
                {service.icon}
              </div>

              {/* Enhanced Main Content */}
              <div className="absolute bottom-0 inset-x-0 p-6 text-white flex flex-col justify-end">
                <h4 className="text-2xl font-bold tracking-tight mb-2 group-hover:text-orange-300 transition-colors">
                  {service.title}
                </h4>
                <p className="text-sm text-white/80 line-clamp-2 leading-relaxed mb-4">
                  {service.description}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <Clock size={14} className="text-orange-300" />
                  <span className="text-xs text-white/60">
                    Limited time offer • Book now
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Navigation Dots */}
        <div className="relative z-10 flex justify-center gap-2 mt-6">
          {services.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTo({
                    left: index * 340,
                    behavior: "smooth",
                  });
                  setCurrentIndex(index);
                }
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-8 bg-orange-400"
                  : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Auto-scroll indicator */}
        {isAutoScrolling && !isHovering && (
          <div className="absolute bottom-4 right-8 text-xs text-white/40 flex items-center gap-2">
            <span className="animate-pulse">●</span>
            Auto-scrolling
          </div>
        )}
      </div>
    </section>
  );
}
