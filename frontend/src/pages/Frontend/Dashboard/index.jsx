import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Compass,
  Gift,
  Globe2,
  Landmark,
  MapPinned,
  PackageCheck,
  Plane,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
  Target,
} from "lucide-react";
import axiosInstance from "../../../api/axios";
import { groupTypes } from "../../../data/groupTypes";

import madinaImg from "../../../assets/images/allgroupsbgg.jpg";
import uaeImg from "../../../assets/images/uaebg.jpg";
import jeddahImg from "../../../assets/images/jeddah.webp";
import mascatImg from "../../../assets/images/muscatbg.jpg";
import makkahImg from "../../../assets/images/ummrahbg.png";

const groupImages = {
  "All Groups": madinaImg,
  "UAE (United Arab Emirates)": uaeImg,
  "KSA (Saudia Arabia) one way": jeddahImg,
  "Kuwait (KWI)": mascatImg,
  "Umrah Groups (Only Seats)": makkahImg,
  "Umrah Packages": makkahImg,
};

const groupStyles = {
  "All Groups": {
    accent: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    icon: Globe2,
    tag: "All routes",
  },
  "UAE (United Arab Emirates)": {
    accent: "linear-gradient(135deg,#f59e0b,#ef4444)",
    icon: MapPinned,
    tag: "UAE seats",
  },
  "KSA (Saudia Arabia) one way": {
    accent: "linear-gradient(135deg,#10b981,#0ea5e9)",
    icon: Compass,
    tag: "KSA one way",
  },
  "Kuwait (KWI)": {
    accent: "linear-gradient(135deg,#8b5cf6,#6366f1)",
    icon: Plane,
    tag: "KWI groups",
  },
  "Umrah Groups (Only Seats)": {
    accent: "linear-gradient(135deg,#ef4444,#f97316)",
    icon: Landmark,
    tag: "Only seats",
  },
  "Umrah Packages": {
    accent: "linear-gradient(135deg,#0ea5e9,#6366f1)",
    icon: PackageCheck,
    tag: "Packages",
  },
};

const Dashboard = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    confirmed: 0,
    hold: 0,
    cancelled: 0,
  });
  const [indexCards, setIndexCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const totalBookings = summary.confirmed + summary.hold + summary.cancelled;

  const statCards = useMemo(
    () => [
      {
        label: "Confirmed",
        value: summary.confirmed,
        Icon: CircleCheck,
        color: "#10b981",
        bg: "bg-white",
        border: "border-emerald-200",
        progressBg: "bg-emerald-500",
      },
      {
        label: "On Hold",
        value: summary.hold,
        Icon: Clock3,
        color: "#f59e0b",
        bg: "bg-white",
        border: "border-amber-200",
        progressBg: "bg-amber-500",
      },
      {
        label: "Cancelled",
        value: summary.cancelled,
        Icon: XCircle,
        color: "#ef4444",
        bg: "bg-white",
        border: "border-red-200",
        progressBg: "bg-red-500",
      },
    ],
    [summary],
  );

  useEffect(() => {
    const fetchUserBookings = async () => {
      try {
        const res = await axiosInstance.get("/bookings");
        if (res.data.success && Array.isArray(res.data.data)) {
          const bookings = res.data.data;
          const confirmed = bookings.filter(
            (b) => b.status === "confirmed",
          ).length;
          const hold = bookings.filter(
            (b) => b.status === "on hold" || b.status === "pending",
          ).length;
          const cancelled = bookings.filter(
            (b) => b.status === "cancelled",
          ).length;
          setSummary({ confirmed, hold, cancelled });
        }
      } catch (err) {
        setSummary({ confirmed: 0, hold: 0, cancelled: 0 });
      }
    };
    fetchUserBookings();
  }, []);

  useEffect(() => {
    const fetchIndexCards = async () => {
      setLoadingCards(true);
      setCardsError(null);
      try {
        const res = await axiosInstance.get("/specialOffer/getSpecialOffers");
        if (res.data.success) {
          setIndexCards(res.data.data);
        } else {
          setIndexCards([]);
        }
      } catch (err) {
        console.error(err);
        setCardsError("Failed to load offers.");
      } finally {
        setLoadingCards(false);
      }
    };
    fetchIndexCards();
  }, []);

  useEffect(() => {
    if (indexCards.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === indexCards.length - 1 ? 0 : prev + 1,
      );
    }, 4200);
    return () => clearInterval(interval);
  }, [indexCards]);

  const handleCategoryClick = (group) => {
    const basePath = group.path.split("?")[0];

    if (basePath === "groups") {
      navigate("/dashboard/groups", {
        state: { presetGroupType: group.value },
      });
      return;
    }

    navigate(`/dashboard/${group.path}`);
  };

  const nextSlide = () => {
    if (indexCards.length === 0) return;
    setCurrentIndex((prev) => (prev === indexCards.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    if (indexCards.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? indexCards.length - 1 : prev - 1));
  };

  const activeOffer = indexCards[currentIndex];

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-slide-in {
          animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
        .shimmer {
          position: relative;
          overflow: hidden;
        }
        .shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 2s infinite;
        }
        .glass-effect {
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .gradient-border {
          position: relative;
          background: linear-gradient(white, white) padding-box,
                      linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899) border-box;
          border: 2px solid transparent;
        }
      `}</style>

      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50/50">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-linear-to-r from-[#09B0FF] via-[#018fd1] to-[#1560ec] rounded-lg">
          <div className="absolute inset-0 opacity-10">
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2 glass-effect px-3 py-1.5 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-white/90 text-xs font-semibold">Live Updates</span>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
                  Welcome Back, Agent
                </h1>
              </div>
              <div className="hidden lg:block animate-float">
                <div className="w-22 h-22 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Plane className="w-10 h-10 text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map(({ label, value, Icon, color, bg, border, progressBg }, index) => {
              const progress = totalBookings === 0 ? 0 : Math.min((value / totalBookings) * 100, 100);
              
              return (
                <div
                  key={label}
                  className={`animate-slide-in ${bg} ${border} rounded-lg p-6 backdrop-blur-sm shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer relative overflow-hidden group border`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-3xl font-bold text-slate-900 mb-1">
                          {value}
                        </p>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          {label} Bookings
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white shadow-md">
                        <Icon size={20} style={{ color }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Progress</span>
                        <span className="font-semibold">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${progressBg} rounded-full transition-all duration-1000`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">
            {/* Destination Groups */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <Target size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Explore</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    Popular Destinations
                  </h2>
                </div>
                <div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Only showing "All Groups" and "Umrah Packages" for now.
                    Other destination cards are commented out below (in groupTypes order):
                    - Umrah Groups (Only Seats)
                    - UAE (United Arab Emirates)
                    - KSA (Saudia Arabia) one way
                    - Kuwait (KWI)
                */}
                {groupTypes.slice(0, 2).map((group, index) => {
                  const style = groupStyles[group.label] ?? groupStyles["All Groups"];
                  const GroupIcon = style.icon;

                  return (
                    <button
                      type="button"
                      key={group.value || group.path}
                      onClick={() => handleCategoryClick(group)}
                      className="animate-slide-in p-0! group relative rounded-lg overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-indigo-300"
                      style={{ animationDelay: `${index * 0.08}s` }}
                      aria-label={`Open ${group.label}`}
                    >
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={groupImages[group.label]}
                          alt={group.label}
                          className="w-full h-full! object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
                        
                        {/* Top badges */}
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                          <div className="glass-effect rounded-full px-3 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <GroupIcon size={14} className="text-white" />
                              <span className="text-white text-xs font-semibold">{style.tag}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow icon */}
                        <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 transition-all duration-300 group-hover:bg-white group-hover:text-indigo-600">
                          <ArrowUpRight size={18} className="text-white group-hover:text-indigo-600 transition-colors" />
                        </div>

                        {/* Bottom content */}
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <h3 className="text-start text-lg font-bold text-white mb-2">
                            {group.label}
                          </h3>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Special Offers */}
            <aside className="xl:sticky xl:top-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 text-pink-600 mb-2">
                    <Gift size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Special</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    Exclusive Deals
                  </h2>
                </div>
                {!loadingCards && indexCards.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-pink-50 text-pink-600 px-3 py-1.5 rounded-full">
                    <Sparkles size={14} className="animate-pulse-slow" />
                    <span className="text-xs font-semibold">{indexCards.length} Live</span>
                  </div>
                )}
              </div>

              {loadingCards ? (
                <div className="rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <div className="h-80 bg-linear-to-br from-slate-200 to-slate-300 animate-pulse shimmer" />
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-4/5" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ) : cardsError ? (
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center">
                  <AlertCircle className="mx-auto mb-4 text-red-500" size={32} />
                  <p className="text-sm font-semibold text-red-600">{cardsError}</p>
                </div>
              ) : indexCards.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-10 text-center">
                  <Gift className="mx-auto mb-4 text-slate-400" size={32} />
                  <p className="text-sm font-semibold text-slate-500">No special offers available</p>
                  <p className="text-xs text-slate-400 mt-1">Check back later for exclusive deals</p>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden">
                  <div className="relative h-96 overflow-hidden">
                    <img
                      key={activeOffer?._id || currentIndex}
                      src={activeOffer?.image}
                      alt={activeOffer?.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
                    
                    {/* Navigation buttons */}
                    <button
                      type="button"
                      onClick={prevSlide}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors focus:outline-none focus:ring-4 focus:ring-white/50"
                      aria-label="Previous offer"
                    >
                      <ChevronLeft size={20} className="text-slate-800" />
                    </button>
                    <button
                      type="button"
                      onClick={nextSlide}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors focus:outline-none focus:ring-4 focus:ring-white/50"
                      aria-label="Next offer"
                    >
                      <ChevronRight size={20} className="text-slate-800" />
                    </button>

                    {/* Content */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full mb-3">
                        <Sparkles size={12} className="text-yellow-300" />
                        <span className="text-white text-xs font-semibold uppercase tracking-wider">Featured</span>
                      </div>
                      <h3 className="text-xl font-bold text-white leading-snug">
                        {activeOffer?.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CalendarDays size={16} />
                        <span>
                          {activeOffer?.createdAt
                            ? new Date(activeOffer.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Recently added"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <TrendingUp size={14} />
                        <span>{currentIndex + 1} of {indexCards.length}</span>
                      </div>
                    </div>

                    {/* Dots */}
                    <div className="flex items-center justify-center gap-2">
                      {indexCards.map((offer, index) => (
                        <button
                          type="button"
                          key={offer?._id || index}
                          onClick={() => setCurrentIndex(index)}
                          className="h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          style={{
                            width: index === currentIndex ? 32 : 8,
                            background:
                              index === currentIndex
                                ? "linear-gradient(90deg,#6366f1,#8b5cf6)"
                                : "#e2e8f0",
                          }}
                          aria-label={`Show offer ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;