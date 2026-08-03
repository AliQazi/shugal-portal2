import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
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
  TicketCheck,
  XCircle,
} from "lucide-react";
import axiosInstance from "../../../api/axios";
import { groupTypes } from "../../../data/groupTypes";
import TopBar from "../../../components/TopBar/TopBar";

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
    accent: "linear-gradient(135deg,#2563eb,#0891b2)",
    icon: Globe2,
    tag: "All routes",
  },
  "UAE (United Arab Emirates)": {
    accent: "linear-gradient(135deg,#f59e0b,#e11d48)",
    icon: MapPinned,
    tag: "UAE seats",
  },
  "KSA (Saudia Arabia) one way": {
    accent: "linear-gradient(135deg,#059669,#0f766e)",
    icon: Compass,
    tag: "KSA one way",
  },
  "Kuwait (KWI)": {
    accent: "linear-gradient(135deg,#7c3aed,#2563eb)",
    icon: Plane,
    tag: "KWI groups",
  },
  "Umrah Groups (Only Seats)": {
    accent: "linear-gradient(135deg,#be123c,#f97316)",
    icon: Landmark,
    tag: "Only seats",
  },
  "Umrah Packages": {
    accent: "linear-gradient(135deg,#0e7490,#2563eb)",
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
        label: "Confirmed Bookings",
        value: summary.confirmed,
        Icon: CircleCheck,
        gradient: "linear-gradient(135deg,#047857,#10b981)",
        shadow: "rgba(4,120,87,0.24)",
      },
      {
        label: "Hold Tickets",
        value: summary.hold,
        Icon: Clock3,
        gradient: "linear-gradient(135deg,#b45309,#f59e0b)",
        shadow: "rgba(180,83,9,0.24)",
      },
      {
        label: "Cancelled",
        value: summary.cancelled,
        Icon: XCircle,
        gradient: "linear-gradient(135deg,#b91c1c,#ef4444)",
        shadow: "rgba(185,28,28,0.22)",
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
      // Trigger the matching group-type filter on the All Groups page
      // directly instead of encoding it into the URL query string.
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
        @keyframes dashboard-marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        @keyframes dashboard-rise {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dashboard-glow {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 1; }
        }
        @keyframes dashboard-sheen {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        .dashboard-marquee {
          display: inline-block;
          animation: dashboard-marquee 30s linear infinite;
          white-space: nowrap;
        }
        .dashboard-rise {
          animation: dashboard-rise 0.55s ease both;
        }
        .dashboard-card-sheen::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.25) 45%, transparent 70%);
          transform: translateX(-120%);
          transition: transform 0.7s ease;
          pointer-events: none;
        }
        .dashboard-card-sheen:hover::after {
          transform: translateX(120%);
        }
      `}</style>

      <div
        className="w-full overflow-hidden relative flex items-center py-2.5"
        style={{
          background:
            "linear-gradient(90deg,#0f172a 0%,#1d4ed8 48%,#0891b2 100%)",
          boxShadow: "0 8px 24px rgba(15,23,42,0.2)",
        }}
      >
        <span className="shrink-0 ml-4 mr-3 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400" />
          </span>
          <span className="text-white/85 text-xs font-bold uppercase tracking-widest">
            Live
          </span>
        </span>
        <div className="flex-1 overflow-hidden">
          <span className="dashboard-marquee text-white text-sm font-medium tracking-wide">
            Welcome to Abid Air Travel & Tours - We book comfort for you - Latest
            Umrah, UAE, KSA and Kuwait seats are waiting - Book smarter and
            travel with confidence
          </span>
        </div>
      </div>

      <div
        className="w-full min-h-screen px-4 md:px-8 pb-12 pt-6"
        style={{
          background:
            "linear-gradient(160deg,#f8fafc 0%,#eef6ff 52%,#f7f3ff 100%)",
        }}
      >
        <TopBar liveTickets={true} title="Agent Dashboard" />

        {/* <section
          className="dashboard-rise relative overflow-hidden rounded-lg min-h-[250px] md:min-h-[300px] mb-6"
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(15,23,42,0.9) 0%,rgba(15,23,42,0.72) 42%,rgba(15,23,42,0.24) 100%), url(${madinaImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            boxShadow: "0 22px 70px rgba(15,23,42,0.2)",
          }}
        >
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_360px] items-end min-h-[250px] md:min-h-[300px] p-5 md:p-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 border border-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md uppercase tracking-widest">
                <Sparkles size={14} />
                Travel Command Center
              </div>
              <h1 className="mt-5 text-3xl md:text-5xl font-black text-white leading-tight">
                Manage bookings with clarity and speed.
              </h1>
              <p className="mt-3 max-w-xl text-sm md:text-base text-white/78 leading-7">
                Track ticket status, open destination groups, and keep special
                offers visible for quick customer decisions.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/15 bg-white/12 backdrop-blur-md p-4 text-white">
                <TicketCheck size={22} />
                <div className="mt-3 text-3xl font-black">{totalBookings}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                  Total
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/12 backdrop-blur-md p-4 text-white">
                <Gift size={22} />
                <div className="mt-3 text-3xl font-black">
                  {loadingCards ? "-" : indexCards.length}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                  Offers
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/12 backdrop-blur-md p-4 text-white">
                <Plane size={22} />
                <div className="mt-3 text-3xl font-black">
                  {groupTypes.length}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">
                  Routes
                </div>
              </div>
            </div>
          </div>
        </section> */}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mb-8">
          {statCards.map(({ label, value, Icon, gradient, shadow }, index) => {
            const progress =
              totalBookings === 0
                ? 0
                : Math.min((value / totalBookings) * 100, 100);

            return (
              <div
                key={label}
                className="dashboard-rise dashboard-card-sheen relative overflow-hidden rounded-lg p-5 text-white"
                style={{
                  animationDelay: `${index * 0.08}s`,
                  background: gradient,
                  boxShadow: `0 16px 42px ${shadow}`,
                }}
              >
                <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/12" />
                <div className="absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-white/10" />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-4xl font-black leading-none">
                      {value}
                    </div>
                    <div className="mt-2 text-xs font-bold uppercase tracking-widest text-white/78">
                      {label}
                    </div>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/15 backdrop-blur-md">
                    <Icon size={24} strokeWidth={2.2} />
                  </div>
                </div>
                <div className="relative z-10 mt-5 h-1.5 overflow-hidden rounded-full bg-white/22">
                  <div
                    className="h-full rounded-full bg-white/80"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-8 items-start">
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2 text-blue-700">
                  <Compass size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">
                    Explore
                  </span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  Destination Groups
                </h2>
              </div>
              <span className="text-sm font-semibold text-slate-500">
                {groupTypes.length} active categories
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              {groupTypes.map((group, index) => {
                const style =
                  groupStyles[group.label] ?? groupStyles["All Groups"];
                const GroupIcon = style.icon;

                return (
                  <button
                    type="button"
                    key={group.value || group.path}
                    onClick={() => handleCategoryClick(group)}
                    className="dashboard-rise group relative h-56 overflow-hidden rounded-lg text-left shadow-sm outline-none ring-1 ring-slate-200/80 transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:ring-4 focus-visible:ring-blue-300"
                    style={{ animationDelay: `${index * 0.06}s` }}
                    aria-label={`Open ${group.label}`}
                  >
                    <img
                      style={{ height: "100%" }}
                      src={groupImages[group.label]}
                      alt={group.label}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-950/88 via-slate-950/38 to-slate-950/8" />
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/20 bg-white/14 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md">
                      <GroupIcon size={15} />
                      {style.tag}
                    </div>
                    <div
                      className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-lg text-white shadow-lg transition duration-300 group-hover:rotate-12"
                      style={{ background: style.accent }}
                    >
                      <ArrowRight size={19} />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="max-w-[82%] text-lg font-black leading-snug text-white drop-shadow">
                        {group.label}
                      </h3>
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/75">
                        View available seats
                        <span className="h-px flex-1 bg-white/25" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="w-full xl:sticky xl:top-6">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 text-amber-600">
                  <Gift size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">
                    Offers
                  </span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  Special Deals
                </h2>
              </div>
              {!loadingCards && indexCards.length > 0 && (
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                  {indexCards.length} Live
                </span>
              )}
            </div>

            {loadingCards ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                <div className="h-72 bg-slate-200 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-4/5" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ) : cardsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-600 shadow-sm">
                <AlertCircle className="mx-auto mb-3" size={26} />
                {cardsError}
              </div>
            ) : indexCards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
                <Gift className="mx-auto mb-3 text-slate-400" size={28} />
                No special offers right now.
                <span className="block text-slate-400">Check back soon.</span>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
                <div className="relative h-80 overflow-hidden">
                  <img
                    key={activeOffer?._id || currentIndex}
                    src={activeOffer?.image}
                    alt={activeOffer?.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

                  <button
                    type="button"
                    onClick={prevSlide}
                    className="p-0 absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                    aria-label="Previous offer"
                  >
                    <ChevronLeft size={21} />
                  </button>
                  <button
                    type="button"
                    onClick={nextSlide}
                    className="p-0 absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                    aria-label="Next offer"
                  >
                    <ChevronRight size={21} />
                  </button>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
                      <Sparkles size={13} />
                      Featured Offer
                    </div>
                    <h3 className="text-xl font-black leading-snug text-white drop-shadow">
                      {activeOffer?.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <CalendarDays size={16} />
                    {activeOffer?.createdAt
                      ? new Date(activeOffer.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )
                      : "Recently added"}
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2">
                    {indexCards.map((offer, index) => (
                      <button
                        type="button"
                        key={offer?._id || index}
                        onClick={() => setCurrentIndex(index)}
                        className="p-0 h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                        style={{
                          width: index === currentIndex ? 28 : 8,
                          background:
                            index === currentIndex
                              ? "linear-gradient(90deg,#2563eb,#0891b2)"
                              : "#cbd5e1",
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
    </>
  );
};

export default Dashboard;
