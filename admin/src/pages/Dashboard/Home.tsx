import PageMeta from "../../components/common/PageMeta";
import { ArrowRightIcon, Squares2X2Icon, HomeIcon, UserGroupIcon, CurrencyRupeeIcon, DocumentDuplicateIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import AgentStatusChart from "../../components/charts/AgentStatusChart";
import { useEffect, useState } from "react";
import axiosInstance from "../../Api/axios";
import { Modal } from "../../components/ui/modal";
import { getRecentBookings } from "../../Api/bookingApi";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

// ALL YOUR EXISTING INTERFACES, FUNCTIONS, AND CONSTANTS - UNCHANGED
interface UnifiedGroup {
  id: string;
  source: string;
  sector: string;
  type: string;
  available_no_of_pax: number;
  price: number;
  dept_date: string;
  airline: {
    airline_name: string;
    short_name: string;
    logo_url: string | null;
  };
  pnr: string;
}

const MONTHS_TITLE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DASHBOARD_CATEGORIES = [
  {
    title: "All Groups",
    description: "Fetch all available bookings.",
    category: "all",
    accentClass: "from-slate-500 to-blue-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    title: "UAE",
    description: "Fetch UAE group bookings.",
    category: "uae",
    accentClass: "from-cyan-500 to-sky-600",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    title: "KSA",
    description: "Fetch KSA group bookings.",
    category: "ksa",
    accentClass: "from-emerald-500 to-teal-600",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    title: "Kuwait (KWI)",
    description: "Fetch Kuwait group bookings.",
    category: "kuwait",
    accentClass: "from-violet-500 to-indigo-600",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    title: "Umrah Groups",
    description: "(ONLY SEATS).",
    category: "umrah",
    accentClass: "from-rose-500 to-red-600",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-100",
  },
];

function trimTime(t: string): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function extractIATA(terminal: string): string {
  if (!terminal) return "";
  const match = terminal.match(/\(([A-Z]{3})\)/);
  return match ? match[1] : terminal.trim();
}

function buildCopyText(groups: UnifiedGroup[]): string {
  if (!groups.length) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const header = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;

  type SectorEntry = {
    group: any;
    date: Date;
    price: number;
    lines: string[];
  };

  const sectorMap = new Map<string, SectorEntry[]>();
  const sectorOrder: string[] = [];

  groups.forEach((g: any) => {
    if (g.available_no_of_pax !== undefined && g.available_no_of_pax <= 0) return;

    const sector = g.sector || "UNKNOWN";
    const price = Number(g.price || 0);

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, []);
      sectorOrder.push(sector);
    }

    const flightLines: string[] = [];
    let sortingDate: Date | null = null;

    if (Array.isArray(g.details) && g.details.length > 0) {
      g.details.forEach((d: any, index: number) => {
        const rawDate = d.dep_date || d.flight_date || g.dept_date;
        if (!rawDate) return;

        const date = new Date(rawDate);
        if (isNaN(date.getTime())) return;

        const depDay = new Date(date);
        depDay.setHours(0, 0, 0, 0);

        if (depDay < today) return;

        if (!sortingDate) {
          sortingDate = date;
        }

        const dd = String(date.getDate()).padStart(2, "0");
        const mon = MONTHS_TITLE[date.getMonth()];
        const year = date.getFullYear();

        const flightNo = (d.flight_no || d.flightNo || "").toUpperCase();
        const origin = extractIATA(d.origin || d.from || "");
        const dest = extractIATA(d.destination || d.to || "");

        const depTime = trimTime(d.dept_time || d.dep_time || d.depTime || "");
        const arvTime = trimTime(d.arv_time || d.arr_time || d.arrTime || "");

        const depPart = depTime ? ` (${depTime})` : "";
        const arvPart = arvTime ? ` (${arvTime})` : "";

        const pricePart = index === 0 ? `..... *PKR ${price}*` : "";

        const line = `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}${pricePart}`;

        flightLines.push(line);
      });

      if (flightLines.length > 0 && sortingDate) {
        sectorMap.get(sector)!.push({
          group: g,
          date: sortingDate,
          price,
          lines: flightLines,
        });
      }

    } else {
      const rawDate = g.dept_date;
      if (!rawDate) return;

      const date = new Date(rawDate);
      if (isNaN(date.getTime())) return;

      const depDay = new Date(date);
      depDay.setHours(0, 0, 0, 0);
      if (depDay < today) return;

      const dd = String(date.getDate()).padStart(2, "0");
      const mon = MONTHS_TITLE[date.getMonth()];
      const year = date.getFullYear();

      const code = g.airline?.short_name || "";
      const sec = (g.sector || "").replace(/-/g, " ");

      const line = `${code} *${dd} ${mon} ${year}* ${sec}..... *PKR ${price}*`;

      sectorMap.get(sector)!.push({
        group: g,
        date,
        price,
        lines: [line],
      });
    }
  });

  sectorMap.forEach((entries) => {
    entries.sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.price - b.price;
    });
  });

  const lines: string[] = [];

  sectorOrder.forEach((sector) => {
    const entries = sectorMap.get(sector)!;

    entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        lines.push(line);
      });
    });
  });

  const footer =
    `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*
=======================
Abid Air Travel & Tours
Mobile: +923197298467
Address: Office 36, 37 Jinnah Stadium, Gujranwala, Pakistan +92 55 30 255/56.
Website: https://flyingzone.nexagensolution.com/`;

  return [header, ...lines, "=======================", footer].join("\n");
}

interface RecentBooking {
  _id: string;
  bookingReference: string;
  contactPersonName: string;
  sector: string;
  status: string;
  totalPassengers: number;
  pricing: {
    grandTotal: number;
  };
  departureDate: string;
  createdAt: string;
  airline?: {
    name?: string;
    airline_name?: string;
  };
}

export default function Home() {
  // ALL YOUR EXISTING STATE AND HOOKS - UNCHANGED
  const { user } = useAuth();
  const [unifiedGroups, setUnifiedGroups] = useState<UnifiedGroup[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [copied, setCopied] = useState(false);
  const [isMarginModalOpen, setIsMarginModalOpen] = useState(false);
  const [marginValue, setMarginValue] = useState("");
  const [marginType, setMarginType] = useState<"percent" | "amount">("percent");
  const [isApplyingMargin, setIsApplyingMargin] = useState(false);
  const [currentMargin, setCurrentMargin] = useState<{ value: number; type: "percent" | "amount" } | null>(null);

  // ALL YOUR EXISTING FUNCTIONS - UNCHANGED
  const fetchUnifiedGroups = async () => {
    try {
      const response = await axiosInstance.get("/sector/getUnifiedGroups");
      if (response.data.success && Array.isArray(response.data.data)) {
        setUnifiedGroups(response.data.data);
      } else {
        console.warn("Data format matches but array not found or success is false");
      }
    } catch (error: any) {
      console.error("Error fetching unified groups:", error);
    }
  };

  const fetchMargin = async () => {
    try {
      const response = await axiosInstance.get("/sector/getMargin");
      if (response.data.success) {
        setCurrentMargin({
          value: response.data.data.value,
          type: response.data.data.type,
        });
      }
    } catch (error: any) {
      console.error("Error fetching margin:", error);
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const response = await getRecentBookings(5);
      if (response.success && Array.isArray(response.data)) {
        setRecentBookings(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching recent bookings:", error);
    }
  };

  const handleCopyData = async () => {
    const text = buildCopyText(unifiedGroups);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleApplyMargin = async () => {
    if (!marginValue || marginValue === "0") {
      alert("Please enter a valid margin value");
      return;
    }

    setIsApplyingMargin(true);
    try {
      const payload = {
        value: parseFloat(marginValue),
        type: marginType,
      };

      const response = await axiosInstance.post("/sector/applyMargin", payload);

      if (response.data.success) {
        alert(`Margin saved: ${marginValue} ${marginType === "percent" ? "%" : "Rs"}`);
        setIsMarginModalOpen(false);
        setMarginValue("");
        setMarginType("percent");
        fetchMargin();
      } else {
        alert(response.data.message || "Failed to save margin");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Error saving margin");
      console.error("Error saving margin:", error);
    } finally {
      setIsApplyingMargin(false);
    }
  };

  // ALL YOUR EXISTING USEFFECT - UNCHANGED
  useEffect(() => {
    if (!hasPermission(user, "view_dashboard")) return;

    if (hasPermission(user, "dashboard_copy_sector_data")) {
      fetchUnifiedGroups();
    }

    if (hasPermission(user, "dashboard_apply_margin")) {
      fetchMargin();
    }

    if (hasPermission(user, "dashboard_recent_bookings")) {
      fetchRecentBookings();
    }
  }, [user]);

  return (
    <>
      <PageMeta
        title="Dashboard | Abid Air Travel & Tours"
        description="Dashboard overview for Abid Air Travel & Tours"
      />

      {hasPermission(user, "view_dashboard") &&
        <>
          {/* ===== NEW DESIGN - ONLY UI CHANGES ===== */}

          {/* Modern Header with Gradient Accent */}
          <div className="relative mb-8 overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 via-blue-500 to-indigo-600 p-6 shadow-lg">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-white/5" />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
                  <HomeIcon className="w-4 h-4" />
                  <span>/</span>
                  <span className="text-white font-medium">Dashboard</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Welcome back! 👋
                </h1>
                <p className="text-white/80 mt-1 text-sm">
                  Here's what's happening with your travel business today.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {hasPermission(user, "dashboard_copy_sector_data") && (
                  <button
                    onClick={handleCopyData}
                    disabled={unifiedGroups.length === 0}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${unifiedGroups.length === 0
                      ? 'bg-white/20 text-white/50 cursor-not-allowed'
                      : copied
                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-900/30'
                        : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm shadow-lg'
                      }`}
                  >
                    {copied ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <DocumentDuplicateIcon className="w-5 h-5" />
                        Copy Sectors ({unifiedGroups.length})
                      </>
                    )}
                  </button>
                )}

                {hasPermission(user, "dashboard_apply_margin") && (
                  <button
                    onClick={() => setIsMarginModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm transition-all duration-200 shadow-lg"
                  >
                    <CurrencyRupeeIcon className="w-5 h-5" />
                    Apply Margin
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group Categories - NEW MODERN CARDS */}
          {hasPermission(user, "dashboard_group_category") && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-1 rounded-full bg-linear-to-b from-blue-500 to-indigo-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Group Categories</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {DASHBOARD_CATEGORIES.map((category) => {
                  const target = category.category === "all"
                    ? "/local-groups"
                    : `/local-groups?category=${encodeURIComponent(category.category === "kuwait" ? "muscat" : category.category)}`;

                  const gradients: Record<string, string> = {
                    "from-slate-500 to-blue-600": "linear-gradient(135deg, #64748b, #2563eb)",
                    "from-cyan-500 to-sky-600": "linear-gradient(135deg, #06b6d4, #0284c7)",
                    "from-emerald-500 to-teal-600": "linear-gradient(135deg, #10b981, #0d9488)",
                    "from-violet-500 to-indigo-600": "linear-gradient(135deg, #8b5cf6, #4f46e5)",
                    "from-rose-500 to-red-600": "linear-gradient(135deg, #f43f5e, #dc2626)",
                  };
                  const bg = gradients[category.accentClass] || "linear-gradient(135deg,#64748b,#2563eb)";

                  return (
                    <div
                      key={category.title}
                      className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      style={{ background: bg }}
                    >
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                      <div className="relative p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-white/20 rounded-xl p-2.5 backdrop-blur-sm">
                              <Squares2X2Icon className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-white font-bold text-base">{category.title}</span>
                          </div>
                          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider bg-white/10 px-2 py-1 rounded-lg">
                            {category.category}
                          </span>
                        </div>
                        <p className="text-white/80 text-xs leading-relaxed">{category.description}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <Link
                            to={target}
                            className="flex-1 flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all duration-200 backdrop-blur-sm"
                          >
                            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                            View
                          </Link>
                          {category.category !== "all" && (
                            <Link
                              to={`group-ticketing/create`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center gap-1.5 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold py-2 px-4 rounded-xl transition-all duration-200 shadow-sm"
                            >
                              <PlusIcon className="w-3 h-3" />
                              Add
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Bookings Section - MODERN DESIGN */}
          {hasPermission(user, "dashboard_recent_bookings") && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 rounded-full bg-linear-to-b from-blue-500 to-indigo-600" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Bookings</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Latest 5 bookings</p>
                  </div>
                </div>
                <Link
                  to="/all-bookings"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  View All
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>

              {recentBookings.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center border border-gray-100 dark:border-gray-700">
                  <div className="text-gray-300 dark:text-gray-600 mb-4">
                    <DocumentDuplicateIcon className="w-16 h-16 mx-auto" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No recent bookings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => {
                    const statusColors = {
                      "on hold": "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
                      "confirmed": "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
                      "cancelled": "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
                      "processing": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
                    };
                    const statusClass = statusColors[booking.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";

                    return (
                      <Link
                        key={booking._id}
                        to={`/all-bookings`}
                        className="block bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-5 border border-gray-100 dark:border-gray-700 group"
                      >
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex-1 min-w-37.5">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {booking.bookingReference}
                              </span>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusClass}`}>
                                {booking.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1.5">
                                <UserGroupIcon className="w-4 h-4" />
                                {booking.contactPersonName}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {booking.totalPassengers} PAX
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-30 text-center hidden sm:block">
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Sector</div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {booking.sector}
                            </div>
                            {booking.airline && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {booking.airline.airline_name || booking.airline.name}
                              </div>
                            )}
                          </div>

                          <div className="text-right min-w-25">
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Total</div>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              PKR {booking.pricing.grandTotal.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {new Date(booking.departureDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>

                          <div className="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <ArrowRightIcon className="w-5 h-5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Agent Status Chart - MODERN CONTAINER */}
          {hasPermission(user, "dashboard_agent_status_graph") && (
            <div className="mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-1 rounded-full bg-linear-to-b from-blue-500 to-indigo-600" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Agent Performance</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Real-time agent status overview</p>
                  </div>
                </div>
                <AgentStatusChart />
              </div>
            </div>
          )}

          {/* Apply Margin Modal - MODERN DESIGN */}
          <Modal
            isOpen={isMarginModalOpen}
            onClose={() => {
              setIsMarginModalOpen(false);
              setMarginValue("");
              setMarginType("percent");
            }}
            className="max-w-md"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-linear-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                  <CurrencyRupeeIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Apply Margin</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add margin to all group prices</p>
                </div>
              </div>

              {currentMargin && currentMargin.value > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong className="font-semibold">Current Margin:</strong> {currentMargin.value} {currentMargin.type === "percent" ? "%" : "Rs"}
                  </p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Margin Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${marginType === "percent"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}>
                      <input
                        type="radio"
                        name="marginType"
                        value="percent"
                        checked={marginType === "percent"}
                        onChange={(e) => setMarginType(e.target.value as "percent" | "amount")}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Percentage (%)</span>
                    </label>
                    <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${marginType === "amount"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}>
                      <input
                        type="radio"
                        name="marginType"
                        value="amount"
                        checked={marginType === "amount"}
                        onChange={(e) => setMarginType(e.target.value as "percent" | "amount")}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fixed Amount (PKR )</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Margin Value
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={marginValue}
                      onChange={(e) => setMarginValue(e.target.value)}
                      placeholder={marginType === "percent" ? "Enter percentage (e.g., 5)" : "Enter amount (e.g., 500)"}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                      {marginType === "percent" ? "%" : "PKR "}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    💡 This margin will be applied at the frontend when displaying prices.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setIsMarginModalOpen(false);
                    setMarginValue("");
                    setMarginType("percent");
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-medium transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  disabled={isApplyingMargin}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyMargin}
                  disabled={isApplyingMargin || !marginValue}
                  className="flex-1 px-4 py-3 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-200 dark:shadow-blue-900/30 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isApplyingMargin ? "Saving..." : "Save Margin"}
                </button>
              </div>
            </div>
          </Modal>
        </>
      }
    </>
  );
}