import React, { useContext, useEffect, useState } from "react";
import { DashboardUIContext } from "../../../components/Dashboard/DashboardLayout";
import { Ticket, Menu, X, ArrowRight } from "lucide-react";
import { FaSuitcase, FaSearch, FaPlaneDeparture } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { streamNdjson } from "../../../utils/streamNdjson";
import { toast } from "react-toastify";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";
import { groupTypes } from "../../../data/groupTypes";

const TYPE_TO_CATEGORY = {
  "UAE ONE WAY GROUP": "uae",
  "ONE WAY GROUP": "ksa",
  "OMAN ONE WAY GROUP": "muscat",
  UMRAH: "umrah",
  "UMRAH GROUP": "umrah",
  "UMRAH GROUPS": "umrah",
  "UK ONE WAY GROUP": "uk",
};

// Airline name standardization mapping
const AIRLINE_NAME_MAPPING = {
  // Air Sial variations
  airsial: "Air Sial",
  "air sial": "Air Sial",
  "airsial lhe-dxb": "Air Sial",
  "airsial isb-dxb": "Air Sial",
  "airsial lhe-dmm": "Air Sial",
  "airsial lhe-ruh": "Air Sial",

  // Air Arabia variations
  "air arabia": "Air Arabia",
  airarabia: "Air Arabia",
  "air arabia pew-shj": "Air Arabia",
  "air arabia lyp-shj": "Air Arabia",

  // Fly Jinnah variations
  "fly jinnah": "Fly Jinnah",
  flyjinnah: "Fly Jinnah",
  "fly jinnah lhe-dxb": "Fly Jinnah",
  "fly jinnah isb-shj": "Fly Jinnah",
  "fly jinnah lhe-dmm": "Fly Jinnah",
  "fly jinnah isb-dmm": "Fly Jinnah",

  // FlyDubai variations
  flydubai: "FlyDubai",
  "fly dubai": "FlyDubai",
  "flydubai lyp-ruh": "FlyDubai",

  // flyadeal variations
  flyadeal: "flyadeal",
  "fly adeal": "flyadeal",
  "flyadeal skt-ruh": "flyadeal",
  "flyadeal pew-ruh": "flyadeal",
  "flyadeal isb-ruh": "flyadeal",
  "flyadeal lhe-ruh": "flyadeal",

  // Saudi Airline variations
  "saudi airline": "Saudi Airline",
  saudiairline: "Saudi Airline",
  "saudi airline pew-ruh": "Saudi Airline",
  "saudi airline isb-ruh": "Saudi Airline",
  "saudi airline lhe-ruh": "Saudi Airline",
  "saudi airline umrah mux": "Saudi Airline",

  // Flynas variations
  flynas: "Flynas",
  "fly nas": "Flynas",
  "fly nas lhe-ruh": "Flynas",

  // Salam Air variations
  "salam air": "Salam Air",
  salamair: "Salam Air",
  "salam air mux-mct-jed": "Salam Air",
  "salam air lhe-mct-jed": "Salam Air",
  "salam air pew-mct-jed": "Salam Air",
  "salam air isb-mct-jed": "Salam Air",
};

/**
 * Standardizes airline names to a consistent format
 * @param {string} airlineName - The raw airline name from the API
 * @returns {string} - Standardized airline name or original if no mapping found
 */
const standardizeAirlineName = (airlineName) => {
  if (!airlineName || typeof airlineName !== "string") {
    return "Unknown Airline";
  }

  const normalizedInput = airlineName.trim().toLowerCase();

  // Check if we have a direct mapping
  if (AIRLINE_NAME_MAPPING[normalizedInput]) {
    return AIRLINE_NAME_MAPPING[normalizedInput];
  }

  // Try to find partial matches (in case of extra numbers or formatting)
  for (const [key, value] of Object.entries(AIRLINE_NAME_MAPPING)) {
    if (
      normalizedInput.includes(key) ||
      key.includes(normalizedInput.split(" ")[0])
    ) {
      return value;
    }
  }

  // Extract potential airline name from numbered entries (e.g., "01. airsial lhe-dxb")
  const numberedPattern = /^\d+\.\s*(.+)$/i;
  const match = normalizedInput.match(numberedPattern);
  if (match) {
    const extractedName = match[1].split(" ")[0]; // Take the first word after the number
    if (AIRLINE_NAME_MAPPING[extractedName]) {
      return AIRLINE_NAME_MAPPING[extractedName];
    }
  }

  // If no mapping found, return the original capitalized properly
  return airlineName.charAt(0).toUpperCase() + airlineName.slice(1);
};

const getCategoryFromGroup = (group = {}) => {
  const type = String(group?.type || "")
    .toUpperCase()
    .trim();

  return TYPE_TO_CATEGORY[type] || "";
};

const normalizeGroupType = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const isUmrahGroupType = (value) => {
  const type = normalizeGroupType(value);

  return type.includes("UMRAH") && !type.includes("PACKAGE");
};

const getDisplayGroupType = (value) => {
  if (isUmrahGroupType(value)) return "Umrah";

  return String(value || "").trim();
};

const isUmrahSeatsGroup = (group = {}) => {
  return isUmrahGroupType(group.type);
};

export default function AllGroupsPackages({
  headerType,
  header,
  searchParams,
  user,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardUI = useContext(DashboardUIContext);

  const [groups, setGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streamingMore, setStreamingMore] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [dbMargin, setDbMargin] = useState(null);
  const [groupMargins, setGroupMargins] = useState({});
  const [bookedSeatsMap, setBookedSeatsMap] = useState({});
  const [groupBookedSeatsMap, setGroupBookedSeatsMap] = useState({});

  const [filters, setFilters] = useState({
    sectors: [],
    airlines: [],
    searchKeyword: "",
    departDate: null,
    groupTypes: [], // Added groupTypes filter
  });

  const [showAdvancedSearch, setShowAdvancedSearch] = useState(true);
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [uniqueGroupTypes, setUniqueGroupTypes] = useState([]); // Added state for unique group types

  useEffect(() => {
    if (dashboardUI) {
      setShowAdvancedSearch(true);
    }
  }, [dashboardUI]);

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    return value?.substring(0, 5) || "—";
  };

  const calculatePriceAfterMargin = (groupPrice, group = {}) => {
    if (user?.priceOnCall) return null;

    let priceAfterMargin = Number(groupPrice) || 0;
    const originalPrice = Number(groupPrice) || 0;

    const marginType = user?.marginType;
    const marginPercent = Number(user?.flightMarginPercent) || 0;
    const marginAmount = Number(user?.flightMarginAmount) || 0;

    if (marginType === "Percentage" && marginPercent > 0) {
      priceAfterMargin += (priceAfterMargin * marginPercent) / 100;
    } else if (marginType === "Amount" && marginAmount > 0) {
      priceAfterMargin += marginAmount;
    }

    if (priceAfterMargin === originalPrice) {
      const category = getCategoryFromGroup(group);
      const categoryKey = `group-category-${category}`;
      const categoryMargin = groupMargins?.[categoryKey]?.marginAmount;

      if (typeof categoryMargin === "number") {
        priceAfterMargin += categoryMargin;
      }
    }

    if (priceAfterMargin === originalPrice) {
      const indMargin = group?.individualMargin;

      if (indMargin !== null && indMargin !== undefined) {
        priceAfterMargin += Number(indMargin) || 0;
      }
    }

    if (priceAfterMargin === originalPrice && dbMargin) {
      if (dbMargin.type === "percent" && Number(dbMargin.value) > 0) {
        priceAfterMargin += (priceAfterMargin * Number(dbMargin.value)) / 100;
      } else if (dbMargin.type === "amount" && Number(dbMargin.value) > 0) {
        priceAfterMargin += Number(dbMargin.value);
      }
    }

    if (priceAfterMargin < 0) priceAfterMargin = 0;

    return Math.round(priceAfterMargin);
  };

  const getGroupId = (group = {}) => {
    return String(group.id || group._id || group.groupId || "");
  };

  const getAvailableSeats = (group = {}) => {
    const baseSeats = Number(group.available_no_of_pax) || 0;
    const bookedSeats = groupBookedSeatsMap[getGroupId(group)] || 0;

    return Math.max(0, baseSeats - bookedSeats);
  };

  const getBookedSeatsForApiGroup = (group = {}) => {
    const flight = group.details?.[0];

    if (!flight) return 0;

    const flightNo = flight.flight_no || flight.flightNo;
    const rawDate = flight.dep_date || flight.flight_date;

    if (!flightNo || !rawDate) return 0;

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) return 0;

    const dateKey = date.toISOString().split("T")[0];
    const key = `${flightNo}_${dateKey}`;

    return bookedSeatsMap[key] || 0;
  };

  const getSeatCount = (group = {}) => {
    if (Array.isArray(group.seats)) return group.seats.length;
    if (Array.isArray(group.seat)) return group.seat.length;

    const baseSeats = Number(group.available_no_of_pax) || 0;

    if (group.isOwnGroup) {
      return getAvailableSeats(group);
    }

    const bookedSeats = getBookedSeatsForApiGroup(group);

    return Math.max(0, baseSeats - bookedSeats);
  };

  const shouldShowGroup = (group = {}) => {
    return getSeatCount(group) > 0;
  };

  const getDays = (group = {}) => {
    let days = Number(group.days) || 0;

    if (group.details && group.details.length > 1) {
      const firstRaw =
        group.details[0].dep_date || group.details[0].flight_date;
      const lastRaw =
        group.details[group.details.length - 1].dep_date ||
        group.details[group.details.length - 1].flight_date;

      if (firstRaw && lastRaw) {
        const firstDate = new Date(firstRaw);
        const lastDate = new Date(lastRaw);

        if (
          !Number.isNaN(firstDate.getTime()) &&
          !Number.isNaN(lastDate.getTime())
        ) {
          const diff = Math.round(
            (lastDate - firstDate) / (1000 * 60 * 60 * 24),
          );

          if (diff > 0) days = diff;
        }
      }
    }

    return days;
  };

  const getAirlineLogoUrl = (data) => {
    if (data.airline.toLowerCase().includes("saudi")) {
      return "https://mcttravels.com/storage/airlines/1696999724.jpeg";
    }

    if (data.airline.toLowerCase() === "flyadeal") {
      return "https://mcttravels.com/storage/airlines/1761067815.png";
    }

    if (data.airlineLogo) return data.airlineLogo;

    if (data.airlineCode) {
      return `https://img.wway.io/pics/root/${data.airlineCode}@png?exar=1&rs=fit:80:40`;
    }

    return null;
  };

  const applyFilters = (dataToFilter = allGroups) => {
    let filtered = [...dataToFilter];

    if (filters.sectors.length > 0) {
      filtered = filtered.filter((g) =>
        filters.sectors.includes((g.sector || "").toUpperCase().trim()),
      );
    }

    if (filters.airlines.length > 0) {
      // Apply standardization to airline names during filtering
      filtered = filtered.filter((g) => {
        const standardizedAirlineName = g.airline?.airline_name
          ? standardizeAirlineName(g.airline.airline_name)
          : g.airline?.airline_name;
        return filters.airlines.includes(standardizedAirlineName);
      });
    }

    if (filters.groupTypes.length > 0) {
      filtered = filtered.filter((g) =>
        filters.groupTypes.includes(getDisplayGroupType(g.type)),
      );
    }

    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();

      filtered = filtered.filter((g) => {
        // Standardize airline name for search comparison
        const standardizedAirlineName = g.airline?.airline_name
          ? standardizeAirlineName(g.airline.airline_name).toLowerCase()
          : g.airline?.airline_name?.toLowerCase();

        const matchesSector = g.sector?.toLowerCase().includes(keyword);
        const matchesAirline = standardizedAirlineName?.includes(keyword);
        const matchesGroupName = g.groupName?.toLowerCase().includes(keyword);
        const matchesFlightNo = g.details?.some((flight) =>
          flight.flight_no?.toLowerCase().includes(keyword),
        );
        const matchesPnr = g.pnr?.toLowerCase().includes(keyword);
        const matchesType = g.type?.toLowerCase().includes(keyword);

        return (
          matchesSector ||
          matchesAirline ||
          matchesGroupName ||
          matchesFlightNo ||
          matchesPnr ||
          matchesType
        );
      });
    }

    if (filters.departDate) {
      const selectedDate =
        filters.departDate instanceof Date
          ? filters.departDate
          : new Date(filters.departDate);

      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth();
      const selectedDay = selectedDate.getDate();

      filtered = filtered.filter((g) => {
        if (!g.dept_date) return false;

        const [year, month, day] = String(g.dept_date)
          .slice(0, 10)
          .split("-")
          .map(Number);

        return (
          year === selectedYear &&
          month - 1 === selectedMonth &&
          day === selectedDay
        );
      });
    }

    setGroups(filtered);
  };

  const fetchBookedSeats = async () => {
    try {
      const res = await axiosInstance.get("/bookings/getBookedSeats");
      const byGroup = res.data?.data?.breakdown?.byGroup || [];
      const map = {};

      byGroup.forEach((group) => {
        if (!group.groupId) return;
        map[String(group.groupId)] = Number(group.totalSeats) || 0;
      });

      setGroupBookedSeatsMap(map);
    } catch (err) {
      console.error("Error fetching booked seats:", err);
      setGroupBookedSeatsMap({});
    }
  };

  const fetchBookingVoucher = async () => {
    try {
      const res = await axiosInstance.get("/bookings/");
      const map = {};

      const bookings = res.data?.data || [];

      bookings.forEach((booking) => {
        const passengersLength = booking.passengers?.length || 0;

        booking.flights?.forEach((flight) => {
          if (!flight.flightNo || !flight.depDate) return;

          const date = new Date(flight.depDate);

          if (Number.isNaN(date.getTime())) return;

          const key = `${flight.flightNo}_${date.toISOString().split("T")[0]}`;

          if (booking.status !== "cancelled") {
            map[key] = (map[key] || 0) + passengersLength;
          }
        });
      });

      setBookedSeatsMap(map);
    } catch (err) {
      console.error("Error fetching booking voucher:", err);
      setBookedSeatsMap({});
    }
  };

  const fetchGroups = async (signal) => {
    try {
      setLoading(true);
      setStreamingMore(true);

      const groupType = searchParams?.get("group_type") || "";
      const normalizedRouteGroupType = normalizeGroupType(groupType);
      const gtEntry = groupTypes.find(
        (g) => normalizeGroupType(g.value) === normalizedRouteGroupType,
      );

      const filterByGroupType = (items) => {
        if (!groupType) return items;

        if (isUmrahGroupType(groupType)) {
          return items.filter(isUmrahSeatsGroup);
        }

        return items
          .filter((g) => !isUmrahSeatsGroup(g))
          .filter((g) => {
            if (g.isOwnGroup) {
              if (!gtEntry?.ownGroupType) return true;
              return (
                normalizeGroupType(g.type) ===
                normalizeGroupType(gtEntry.ownGroupType)
              );
            }

            return normalizeGroupType(g.type) === normalizeGroupType(groupType);
          });
      };

      // Standardize airline names in the fetched groups
      const standardize = (items) =>
        items.map((group) => ({
          ...group,
          airline: {
            ...group.airline,
            airline_name: group.airline?.airline_name
              ? standardizeAirlineName(group.airline.airline_name)
              : group.airline?.airline_name,
          },
        }));

      const [marginRes, groupMarginRes] = await Promise.allSettled([
        axiosInstance.get("/sector/getMargin"),
        axiosInstance.get("/group-margin/all"),
      ]);

      if (marginRes.status === "fulfilled" && marginRes.value.data?.success) {
        setDbMargin(marginRes.value.data.data);
      }

      if (
        groupMarginRes.status === "fulfilled" &&
        groupMarginRes.value.data?.success
      ) {
        setGroupMargins(groupMarginRes.value.data.data || {});
      }

      const accumulatedGroups = [];
      let gotAnyChunk = false;

      const token = localStorage.getItem("frontend_token");
      const response = await fetch(
        `${axiosInstance.defaults.baseURL}/sector/getUnifiedGroups?stream=true`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
          signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      await streamNdjson(response, (msg) => {
        if (signal?.aborted) return;

        if (msg.type === "chunk" && Array.isArray(msg.data)) {
          const standardizedChunk = standardize(filterByGroupType(msg.data));
          accumulatedGroups.push(...standardizedChunk);
          gotAnyChunk = true;

          const uniqueAirlines = [
            ...new Set(
              accumulatedGroups
                .map((g) => g.airline?.airline_name)
                .filter(Boolean),
            ),
          ];
          const uniqueSectors = [
            ...new Set(
              accumulatedGroups
                .map((g) => (g.sector || "").toUpperCase().trim())
                .filter(Boolean),
            ),
          ];
          const uniqueTypes = [
            ...new Set(
              accumulatedGroups
                .map((g) => getDisplayGroupType(g.type))
                .filter(Boolean),
            ),
          ];

          setAirlines(uniqueAirlines.sort());
          setSectors(uniqueSectors.sort());
          setUniqueGroupTypes(uniqueTypes.sort());
          setAllGroups([...accumulatedGroups]);
          setLoading(false);
        } else if (msg.type === "error") {
          console.error(
            `Unified groups source failed (${msg.source}):`,
            msg.message,
          );
        }
      });

      if (signal?.aborted) return;

      if (!gotAnyChunk) {
        setAllGroups([]);
        setGroups([]);
        setUniqueGroupTypes([]);
      }
    } catch (err) {
      if (err.name === "AbortError") return;

      console.error("Error fetching groups:", err);
      toast.error("Failed to load groups");
      setAllGroups([]);
      setGroups([]);
      setUniqueGroupTypes([]);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setStreamingMore(false);
      }
    }
  };

  const handleFilterChange = (filterType, value) => {
    if (filterType === "sector") {
      setFilters((prev) => ({
        ...prev,
        sectors: prev.sectors.includes(value)
          ? prev.sectors.filter((s) => s !== value)
          : [...prev.sectors, value],
      }));
    } else if (filterType === "airline") {
      // Standardize the airline name when adding to filters
      const standardizedValue = standardizeAirlineName(value);
      setFilters((prev) => ({
        ...prev,
        airlines: prev.airlines.includes(standardizedValue)
          ? prev.airlines.filter((a) => a !== standardizedValue)
          : [...prev.airlines, standardizedValue],
      }));
    } else if (filterType === "groupType") {
      if (!value) {
        setFilters((prev) => ({
          ...prev,
          groupTypes: [],
        }));
        return;
      }

      setFilters((prev) => ({
        ...prev,
        groupTypes: prev.groupTypes.includes(value)
          ? prev.groupTypes.filter((t) => t !== value)
          : [...prev.groupTypes, value],
      }));
    } else {
      setFilters((prev) => ({ ...prev, [filterType]: value }));
    }
  };

  const handleBookNow = (group) => {
    const seatCount = getSeatCount(group);
    const skypassTicketId =
      group.source === "skypass"
        ? String(group.id || "")
          .replace(/^skypass_/, "")
          .split("_")[0]
        : null;

    navigate("/dashboard/booking", {
      state: {
        groupData: {
          ...group,
          available_no_of_pax: seatCount,
          _skypassTicketId: skypassTicketId,
        },
      },
    });
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    const controller = new AbortController();
    fetchGroups(controller.signal);
    fetchBookingVoucher();
    fetchBookedSeats();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, allGroups]);

  // When navigated here with a preset group type (e.g. from the Dashboard's
  // UAE/KSA/Kuwait cards), trigger that filter on the already-loaded groups
  // instead of relying on a URL query param.
  useEffect(() => {
    const presetGroupType = location.state?.presetGroupType;

    if (!presetGroupType) return;

    const expectedDisplay = getDisplayGroupType(presetGroupType);
    const match = uniqueGroupTypes.find(
      (type) => normalizeGroupType(type) === normalizeGroupType(expectedDisplay),
    );

    if (match && !filters.groupTypes.includes(match)) {
      setFilters((prev) => ({ ...prev, groupTypes: [match] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, uniqueGroupTypes]);

  const LoadingSkeleton = () => (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div
            className="h-11 mb-3 w-full"
            style={{
              background: theme.colors.backgroundDark,
              borderRadius: theme.borderRadius.sm,
            }}
          />
          {[1, 2].map((j) => (
            <div
              key={j}
              className="h-16 mb-2"
              style={{
                background: theme.colors.backgroundDark,
                borderRadius: theme.borderRadius.sm,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );

  const sectorFirstSeen = {};

  const groupedData = groups.reduce((acc, group) => {
    const sector = (group.sector || "Unknown").toUpperCase().trim();
    const airlineName = group.airline?.airline_name || "";
    const key = `${sector}|||${airlineName}`;

    if (!(sector in sectorFirstSeen)) {
      sectorFirstSeen[sector] = Object.keys(sectorFirstSeen).length;
    }

    if (!acc[key]) {
      acc[key] = {
        airline: airlineName,
        airlineLogo: group.airline?.logo_url || null,
        airlineCode: group.airline?.short_name || null,
        sector,
        groups: [],
      };
    }

    acc[key].groups.push(group);

    return acc;
  }, {});

  const getMinDate = (card) => {
    const dates = card.groups
      .map((g) => g.dept_date)
      .filter(Boolean)
      .sort();

    return dates[0] || "9999-99-99";
  };

  const sortedGroupedEntries = Object.entries(groupedData).sort(
    ([, a], [, b]) => {
      const sectorOrderA = sectorFirstSeen[a.sector] ?? 999;
      const sectorOrderB = sectorFirstSeen[b.sector] ?? 999;

      if (sectorOrderA !== sectorOrderB) return sectorOrderA - sectorOrderB;

      if (a.airline !== b.airline) return a.airline.localeCompare(b.airline);

      return getMinDate(a).localeCompare(getMinDate(b));
    },
  );

  const visibleGroupedEntries = sortedGroupedEntries
    .map(([key, data]) => {
      const visibleGroups = data.groups.filter(shouldShowGroup);

      return [
        key,
        {
          ...data,
          groups: visibleGroups,
        },
      ];
    })
    .filter(([, data]) => data.groups.length > 0);

  /* ---------- Filter sidebar content ---------- */
  const FilterContent = () => (
    <>
      <h3
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: theme.colors.textPrimary, letterSpacing: "0.04em" }}
      >
        Airlines
      </h3>

      <div
        className="space-y-0.5 max-h-64 overflow-y-auto"
        style={{ paddingRight: theme.spacing.xs }}
      >
        {airlines.map((airline) => {
          const standardizedAirline = standardizeAirlineName(airline);
          return (
            <label
              key={airline}
              className="flex items-center gap-2.5 cursor-pointer transition-colors"
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.sm,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.colors.backgroundDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <input
                type="checkbox"
                checked={filters.airlines.includes(standardizedAirline)}
                onChange={() => handleFilterChange("airline", airline)}
                className="w-3.5 h-3.5"
                style={{
                  accentColor: theme.colors.intermediate,
                  borderRadius: theme.borderRadius.sm,
                }}
              />
              <span
                className="text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {standardizedAirline}
              </span>
            </label>
          );
        })}
      </div>

      <div
        className="my-5"
        style={{ height: "1px", background: theme.colors.border }}
      />

      <h3
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: theme.colors.textPrimary, letterSpacing: "0.04em" }}
      >
        Sectors
      </h3>

      <div
        className="space-y-0.5 max-h-64 overflow-y-auto"
        style={{ paddingRight: theme.spacing.xs }}
      >
        {sectors.map((sector) => (
          <label
            key={sector}
            className="flex items-center gap-2.5 cursor-pointer transition-colors"
            style={{
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.sm,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.colors.backgroundDark;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <input
              type="checkbox"
              checked={filters.sectors.includes(sector)}
              onChange={() => handleFilterChange("sector", sector)}
              className="w-3.5 h-3.5"
              style={{
                accentColor: theme.colors.intermediate,
                borderRadius: theme.borderRadius.sm,
              }}
            />
            <span
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              {sector}
            </span>
          </label>
        ))}
      </div>
    </>
  );

  /* ---------- Group Type Chips for Header ---------- */
  const GroupTypeChips = () => (
    <div className="flex flex-wrap gap-2 mb-3 xl:mb-0">
      <button
        type="button"
        onClick={() => handleFilterChange("groupType", "")}
        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filters.groupTypes.length === 0
            ? "bg-accent"
            : "bg-gray-200 hover:bg-gray-300"
          }`}
        style={{
          background:
            filters.groupTypes.length === 0
              ? theme.colors.primary
              : theme.colors.backgroundDark,
          color: filters.groupTypes.length === 0 ? "#fff" : "#000",
          borderRadius: theme.borderRadius.full,
        }}
      >
        All Types
      </button>
      {uniqueGroupTypes.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => handleFilterChange("groupType", type)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filters.groupTypes.includes(type)
              ? "bg-accent"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          style={{
            background: filters.groupTypes.includes(type)
              ? theme.colors.primary
              : theme.colors.backgroundDark,
            color: filters.groupTypes.includes(type) ? "#fff" : "#000",
            borderRadius: theme.borderRadius.full,
          }}
        >
          {type}
        </button>
      ))}
    </div>
  );

  /* ---------- Fluid geometric route indicator (no fixed widths) ---------- */
  const SectorRoute = ({
    origin,
    destination,
    depTime,
    arvTime,
    isReturn = false,
  }) => {
    const accentColor = isReturn
      ? theme.colors.accent
      : theme.colors.intermediate;

    return (
      <div className="grid w-full max-w-95 items-center gap-1.5 xl:gap-2 grid-cols-[minmax(0,1fr)_minmax(28px,90px)_minmax(0,1fr)]">
        <div className="text-right min-w-0">
          <div
            className="text-xs xl:text-sm font-bold truncate"
            style={{ color: theme.colors.textPrimary }}
          >
            {origin || "—"}
          </div>
          <div
            className="text-[10px] xl:text-xs whitespace-nowrap"
            style={{ color: theme.colors.textTertiary }}
          >
            {formatTime(depTime)}
          </div>
        </div>

        <div className="flex items-center justify-center w-full relative">
          <span
            className="shrink-0 rounded-full"
            style={{
              width: "5px",
              height: "5px",
              background: accentColor,
            }}
          />
          <span
            className="flex-1"
            style={{
              height: "1px",
              background: theme.colors.borderDark,
            }}
          />
          <ArrowRight
            size={12}
            strokeWidth={2.25}
            style={{ color: accentColor, flexShrink: 0 }}
          />
        </div>

        <div className="text-left min-w-0">
          <div
            className="text-xs xl:text-sm font-bold truncate"
            style={{ color: theme.colors.textPrimary }}
          >
            {destination || "—"}
          </div>
          <div
            className="text-[10px] xl:text-xs whitespace-nowrap"
            style={{ color: theme.colors.textTertiary }}
          >
            {formatTime(arvTime)}
          </div>
        </div>
      </div>
    );
  };

  const LegCell = ({ children, index }) => {
    return (
      <div
        className="h-11 flex items-center"
        style={
          index > 0
            ? {
              borderTop: `1px solid ${theme.colors.border}`,
            }
            : undefined
        }
      >
        {children}
      </div>
    );
  };

  /* ---------- Mobile card for a single group (shown < md) ---------- */
  const MobileGroupCard = ({ group, origin, destination }) => {
    const details = group.details || [];
    const flight = details[0];
    const isMultiLeg = details.length > 1;

    return (
      <div
        className="p-3"
        style={{ borderBottom: `1px solid ${theme.colors.border}` }}
      >
        <div className="flex flex-col gap-2">
          {(isMultiLeg ? details : [flight]).filter(Boolean).map((d, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-semibold"
                  style={{ color: theme.colors.textPrimary }}
                >
                  {formatDate(d.dep_date || d.flight_date)}
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {d.flight_no?.toUpperCase() || "—"}
                </span>
              </div>
              <SectorRoute
                origin={d.origin || origin}
                destination={d.destination || destination}
                depTime={d.dept_time}
                arvTime={d.arv_time}
                isReturn={i % 2 !== 0}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {flight?.baggage && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5"
              style={{
                background: theme.colors.backgroundDark,
                color: theme.colors.textSecondary,
                borderRadius: theme.borderRadius.sm,
              }}
            >
              <FaSuitcase /> {flight.baggage}KG
            </span>
          )}

          <span
            className="text-[11px] font-semibold px-2 py-0.5"
            style={
              flight?.meal && flight.meal !== "No"
                ? {
                  background: "#e6efe9",
                  color: "#2f6b4f",
                  borderRadius: theme.borderRadius.sm,
                }
                : {
                  background: theme.colors.backgroundDark,
                  color: theme.colors.textTertiary,
                  borderRadius: theme.borderRadius.sm,
                }
            }
          >
            Meal: {flight?.meal && flight.meal !== "No" ? "Yes" : "No"}
          </span>

          {isMultiLeg && getDays(group) > 0 && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5"
              style={{
                background: theme.colors.backgroundDark,
                color: theme.colors.textPrimary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.sm,
              }}
            >
              {getDays(group)} Days
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 gap-3">
          {user?.priceOnCall ? (
            <span
              className="text-sm font-bold"
              style={{ color: theme.colors.textPrimary }}
            >
              On Call
            </span>
          ) : (
            <span
              className="text-base font-bold"
              style={{ color: theme.colors.textPrimary }}
            >
              PKR{" "}
              {calculatePriceAfterMargin(group.price, group)?.toLocaleString()}
            </span>
          )}

          <button
            type="button"
            onClick={() => handleBookNow(group)}
            disabled={!user?.showHideButton}
            className="flex items-center justify-center gap-1.5 px-3 py-2 font-semibold text-xs whitespace-nowrap"
            style={{
              borderRadius: theme.borderRadius.md,
              background: user?.showHideButton
                ? theme.colors.primary
                : theme.colors.primary,
              color: user?.showHideButton
                ? "#ffffff"
                : theme.colors.textTertiary,
              cursor: user?.showHideButton ? "pointer" : "not-allowed",
            }}
          >
            <Ticket size={13} />
            <span>Book Now</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <TopBar title={"Group Tickets"} />

      {/* Compact cell padding on small/medium laptop screens */}
      <style>{`
        @media (max-width: 1535px) {
          .groups-table th,
          .groups-table td {
            padding: 8px 10px !important;
          }
        }
        @media (max-width: 1279px) {
          .groups-table th,
          .groups-table td {
            padding: 6px 8px !important;
          }
        }
      `}</style>

      <div className="w-full min-h-screen">
        <div
          className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 py-2 ${headerType === "dashboard" ? "rounded-t-2xl" : ""
            }`}
        >
          <div className="w-full xl:w-auto">
            {/* {header} */}
            <GroupTypeChips /> {/* Added group type chips in header */}
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-2 w-full xl:w-auto">
            <div className="flex items-center justify-between w-full lg:w-auto gap-3">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showAdvancedSearch}
                    onChange={(e) => setShowAdvancedSearch(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-8 h-4.5 transition-all"
                    style={{
                      background: showAdvancedSearch
                        ? theme.colors.intermediate
                        : theme.colors.borderDark,
                      borderRadius: theme.borderRadius.full,
                    }}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 transition-transform ${showAdvancedSearch ? "translate-x-3.5" : ""
                        }`}
                      style={{
                        background: theme.colors.card,
                        borderRadius: theme.borderRadius.full,
                        boxShadow: theme.shadows.sm,
                      }}
                    />
                  </div>
                </div>

                <span
                  className="ml-2 text-xs font-medium whitespace-nowrap"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Advanced Search
                </span>
              </label>

              {showAdvancedSearch && (
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden p-1.5"
                  style={{
                    background: theme.colors.backgroundDark,
                    color: theme.colors.textSecondary,
                    borderRadius: theme.borderRadius.sm,
                  }}
                >
                  <Menu size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="w-full sm:w-48">
                <MaskedDatePicker
                  value={filters.departDate}
                  onChange={(date) => handleFilterChange("departDate", date)}
                  placeholderText="Departure Date"
                  minDate={new Date()}
                  size="small"
                />
              </div>

              <div className="flex-1 lg:w-52 relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.searchKeyword}
                  onChange={(e) =>
                    handleFilterChange("searchKeyword", e.target.value)
                  }
                  className="w-full px-3 py-1.5 focus:outline-none text-xs"
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    color: theme.colors.textPrimary,
                    borderRadius: theme.borderRadius.sm,
                    background: theme.colors.card,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.intermediateLight}26`;
                    e.currentTarget.style.borderColor =
                      theme.colors.intermediateLight;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = theme.colors.border;
                  }}
                />
                <FaSearch
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: theme.colors.textTertiary }}
                />
              </div>
            </div>
          </div>
        </div>

        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0"
              style={{ background: "rgba(74, 44, 42, 0.45)" }}
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div
              className="absolute right-0 top-0 h-full w-80 max-w-[85vw] p-6 overflow-y-auto"
              style={{
                background: theme.colors.card,
                boxShadow: theme.shadows.lg,
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2
                  className="text-base font-semibold"
                  style={{ color: theme.colors.textPrimary }}
                >
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  style={{ color: theme.colors.textSecondary }}
                >
                  <X size={18} />
                </button>
              </div>

              <FilterContent />
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 pt-3 pb-6">
          {showAdvancedSearch && (
            <div className="hidden lg:block w-48 xl:w-56 shrink-0">
              <div
                className="sticky top-6"
                style={{
                  background: theme.colors.card,
                  boxShadow: theme.shadows.sm,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.md,
                }}
              >
                <FilterContent />
              </div>
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-hidden min-w-0">
            {!loading && streamingMore && (
              <div
                className="px-3 py-2 text-xs flex items-center gap-2"
                style={{ color: theme.colors.textTertiary }}
              >
                <span
                  className="inline-block h-3 w-3 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: theme.colors.border,
                    borderTopColor: theme.colors.textTertiary,
                  }}
                />
                Loading more groups...
              </div>
            )}
            {loading ? (
              <div
                style={{
                  background: theme.colors.card,
                  boxShadow: theme.shadows.sm,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                }}
              >
                <LoadingSkeleton />
              </div>
            ) : visibleGroupedEntries.length === 0 ? (
              <div
                className="p-8 text-center text-sm"
                style={{
                  background: theme.colors.card,
                  boxShadow: theme.shadows.sm,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  color: theme.colors.textTertiary,
                }}
              >
                No groups available at the moment
              </div>
            ) : (
              visibleGroupedEntries.map(([key, data]) => {
                const sectorParts = data.sector?.split("-") || [];
                const origin = sectorParts[0] || "";
                const destination =
                  sectorParts[sectorParts.length - 1] || data.sector;
                const hasMultiLeg = data.groups.some(
                  (g) => g.details && g.details.length > 1,
                );

                const sortedGroups = [...data.groups].sort((a, b) => {
                  const dateDiff =
                    new Date(a.dept_date) - new Date(b.dept_date);

                  if (dateDiff !== 0) return dateDiff;

                  return (Number(a.price) || 0) - (Number(b.price) || 0);
                });

                return (
                  <div
                    key={key}
                    className="overflow-hidden"
                    style={{
                      background: theme.colors.card,
                      border: `1px solid ${theme.colors.border}`,
                      boxShadow: theme.shadows.sm,
                      borderRadius: theme.borderRadius.lg,
                    }}
                  >
                    {/* Carrier header — flat, minimal */}
                    <div
                      className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap"
                      style={{
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        background: theme.colors.card,
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center min-w-12">
                          {(() => {
                            const logoUrl = getAirlineLogoUrl(data);
                            return logoUrl ? (
                              <img
                                style={{ height: "28px" }}
                                src={logoUrl}
                                alt={data.airlineCode || data.airline}
                                className="object-contain"
                              />
                            ) : (
                              <span
                                className="font-semibold text-sm"
                                style={{ color: theme.colors.textPrimary }}
                              >
                                {data.airline}
                              </span>
                            );
                          })()}
                        </div>

                        <span></span>

                        <div
                          className="hidden sm:block"
                          style={{
                            width: "1px",
                            height: "20px",
                            background: theme.colors.border,
                          }}
                        />

                        <span
                          className="font-semibold text-sm truncate"
                          style={{ color: theme.colors.textPrimary }}
                        >
                          {data.airline}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <FaPlaneDeparture
                          size={11}
                          style={{ color: theme.colors.textTertiary }}
                        />
                        <span
                          className="font-semibold text-xs tracking-wide"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {data.sector}
                        </span>
                      </div>
                    </div>

                    {/* ---- Mobile cards (< md) ---- */}
                    <div className="md:hidden">
                      {sortedGroups.map((group) => (
                        <MobileGroupCard
                          key={group.id || group._id}
                          group={group}
                          origin={origin}
                          destination={destination}
                        />
                      ))}
                    </div>

                    {/* ---- Table (>= md) ---- */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="groups-table w-full border-collapse">
                        <thead>
                          <tr
                            className="text-xs font-semibold"
                            style={{
                              background: theme.colors.intermediate,
                              color: "#ffffff",
                            }}
                          >
                            <th
                              className="text-left whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                              }}
                            >
                              Date
                            </th>
                            <th
                              className="text-left whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                              }}
                            >
                              Flight
                            </th>
                            <th
                              className="text-center whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                              }}
                            >
                              Sector
                            </th>
                            <th
                              className="text-center whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                              }}
                            >
                              Bag
                            </th>
                            <th
                              className="text-center whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                              }}
                            >
                              Meal
                            </th>
                            {hasMultiLeg && (
                              <th
                                className="text-center whitespace-nowrap"
                                style={{
                                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                  borderRight: `1px solid ${theme.colors.intermediateLight}`,
                                }}
                              >
                                Days
                              </th>
                            )}
                            <th
                              className="text-center whitespace-nowrap"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                borderRight: `1px solid ${theme.colors.intermediateLight}`,
                              }}
                            >
                              Fare
                            </th>
                            <th
                              className="w-28 2xl:w-36"
                              style={{
                                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                              }}
                            ></th>
                          </tr>
                        </thead>

                        <tbody>
                          {sortedGroups.map((group, rowIdx) => {
                            const seatCount = getSeatCount(group);
                            const details = group.details || [];
                            const flight = details[0];
                            const lastFlight = details[details.length - 1];
                            const isMultiLeg = details.length > 1;

                            return (
                              <tr
                                key={group.id || group._id}
                                className="transition-colors"
                                style={{
                                  borderBottom: `1px solid ${theme.colors.border}`,
                                  background:
                                    rowIdx % 2 === 0
                                      ? theme.colors.card
                                      : theme.colors.background,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background =
                                    theme.colors.backgroundDark;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background =
                                    rowIdx % 2 === 0
                                      ? theme.colors.card
                                      : theme.colors.background;
                                }}
                              >
                                <td
                                  className="text-xs font-medium whitespace-nowrap align-top"
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    color: theme.colors.textSecondary,
                                    borderRight: `1px solid ${theme.colors.border}`,
                                  }}
                                >
                                  {isMultiLeg ? (
                                    <div className="flex flex-col">
                                      {details.map((d, i) => {
                                        const rawDate =
                                          d.dep_date || d.flight_date;

                                        return (
                                          <LegCell key={i} index={i}>
                                            <span
                                              className="font-semibold text-xs xl:text-sm whitespace-nowrap"
                                              style={{
                                                color: theme.colors.textPrimary,
                                              }}
                                            >
                                              {formatDate(rawDate)}
                                            </span>
                                          </LegCell>
                                        );
                                      })}
                                    </div>
                                  ) : flight ? (
                                    <span
                                      className="font-semibold text-xs xl:text-sm whitespace-nowrap"
                                      style={{
                                        color: theme.colors.textPrimary,
                                      }}
                                    >
                                      {formatDate(
                                        flight.dep_date || flight.flight_date,
                                      )}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>

                                <td
                                  className="align-top"
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    borderRight: `1px solid ${theme.colors.border}`,
                                  }}
                                >
                                  {isMultiLeg ? (
                                    <div className="flex flex-col">
                                      {details.map((d, i) => (
                                        <LegCell key={i} index={i}>
                                          <div className="flex flex-col">
                                            <span
                                              className="font-bold text-xs xl:text-sm whitespace-nowrap leading-tight"
                                              style={{
                                                color: theme.colors.textPrimary,
                                              }}
                                            >
                                              {d.flight_no?.toUpperCase() ||
                                                "—"}
                                            </span>
                                            {i === 0 &&
                                              group.airline?.airline_name && (
                                                <span
                                                  className="text-[10px] whitespace-nowrap leading-tight"
                                                  style={{
                                                    color:
                                                      theme.colors.textTertiary,
                                                  }}
                                                >
                                                  {group.airline.airline_name}
                                                </span>
                                              )}
                                          </div>
                                        </LegCell>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col">
                                      <span
                                        className="font-semibold text-xs xl:text-sm whitespace-nowrap"
                                        style={{
                                          color: theme.colors.textPrimary,
                                        }}
                                      >
                                        {flight?.flight_no?.toUpperCase() ||
                                          "—"}
                                      </span>
                                      {group.airline?.airline_name && (
                                        <span
                                          className="text-[10px] whitespace-nowrap leading-tight"
                                          style={{
                                            color: theme.colors.textTertiary,
                                          }}
                                        >
                                          {group.airline.airline_name}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td
                                  className="align-top min-w-55 xl:min-w-70"
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    borderRight: `1px solid ${theme.colors.border}`,
                                  }}
                                >
                                  {isMultiLeg ? (
                                    <div className="flex flex-col">
                                      {details.map((d, i) => (
                                        <LegCell key={i} index={i}>
                                          <div className="w-full flex justify-center">
                                            <SectorRoute
                                              origin={d.origin}
                                              destination={d.destination}
                                              depTime={d.dept_time}
                                              arvTime={d.arv_time}
                                              isReturn={i % 2 !== 0}
                                            />
                                          </div>
                                        </LegCell>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex justify-center">
                                      <SectorRoute
                                        origin={flight?.origin || origin}
                                        destination={
                                          lastFlight?.destination || destination
                                        }
                                        depTime={flight?.dept_time}
                                        arvTime={
                                          lastFlight?.arv_time ||
                                          flight?.arv_time
                                        }
                                      />
                                    </div>
                                  )}
                                </td>

                                <td
                                  className="text-center align-top"
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    borderRight: `1px solid ${theme.colors.border}`,
                                  }}
                                >
                                  {isMultiLeg ? (
                                    <div className="flex flex-col items-center">
                                      {details.map((d, i) => (
                                        <LegCell key={i} index={i}>
                                          <div className="w-full flex justify-center">
                                            {d.baggage ? (
                                              <div className="inline-flex items-center gap-1 text-xs font-medium">
                                                <FaSuitcase
                                                  className="shrink-0"
                                                  style={{
                                                    color:
                                                      theme.colors.textTertiary,
                                                  }}
                                                />
                                                <span
                                                  style={{
                                                    color:
                                                      theme.colors
                                                        .textSecondary,
                                                  }}
                                                >
                                                  {d.baggage}KG
                                                </span>
                                              </div>
                                            ) : (
                                              <span
                                                className="text-xs"
                                                style={{
                                                  color:
                                                    theme.colors.textTertiary,
                                                }}
                                              >
                                                —
                                              </span>
                                            )}
                                          </div>
                                        </LegCell>
                                      ))}
                                    </div>
                                  ) : flight?.baggage ? (
                                    <div className="inline-flex items-center gap-1 text-xs font-medium">
                                      <FaSuitcase
                                        className="shrink-0"
                                        style={{
                                          color: theme.colors.textTertiary,
                                        }}
                                      />
                                      <span
                                        style={{
                                          color: theme.colors.textSecondary,
                                        }}
                                      >
                                        {flight.baggage}KG
                                      </span>
                                    </div>
                                  ) : (
                                    <span
                                      className="text-xs"
                                      style={{
                                        color: theme.colors.textTertiary,
                                      }}
                                    >
                                      —
                                    </span>
                                  )}
                                </td>

                                <td
                                  className="text-center align-top"
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    borderRight: `1px solid ${theme.colors.border}`,
                                  }}
                                >
                                  {isMultiLeg ? (
                                    <div className="flex flex-col items-center">
                                      {details.map((d, i) => (
                                        <LegCell key={i} index={i}>
                                          <div className="w-full flex justify-center">
                                            <span
                                              className="inline-block text-[11px] font-semibold px-2 py-0.5"
                                              style={
                                                d.meal && d.meal !== "No"
                                                  ? {
                                                    background: "#e6efe9",
                                                    color: "#2f6b4f",
                                                    borderRadius:
                                                      theme.borderRadius.sm,
                                                  }
                                                  : {
                                                    background:
                                                      theme.colors
                                                        .backgroundDark,
                                                    color:
                                                      theme.colors
                                                        .textTertiary,
                                                    borderRadius:
                                                      theme.borderRadius.sm,
                                                  }
                                              }
                                            >
                                              {d.meal && d.meal !== "No"
                                                ? "Yes"
                                                : "No"}
                                            </span>
                                          </div>
                                        </LegCell>
                                      ))}
                                    </div>
                                  ) : (
                                    <span
                                      className="inline-block text-[11px] font-semibold px-2 py-0.5"
                                      style={
                                        flight?.meal && flight.meal !== "No"
                                          ? {
                                            background: "#e6efe9",
                                            color: "#2f6b4f",
                                            borderRadius:
                                              theme.borderRadius.sm,
                                          }
                                          : {
                                            background:
                                              theme.colors.backgroundDark,
                                            color: theme.colors.textTertiary,
                                            borderRadius:
                                              theme.borderRadius.sm,
                                          }
                                      }
                                    >
                                      {flight?.meal && flight.meal !== "No"
                                        ? "Yes"
                                        : "No"}
                                    </span>
                                  )}
                                </td>

                                {hasMultiLeg && (
                                  <td
                                    className="text-center align-middle"
                                    style={{
                                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                      borderRight: `1px solid ${theme.colors.border}`,
                                    }}
                                  >
                                    {isMultiLeg && getDays(group) > 0 ? (
                                      <span
                                        className="inline-block text-xs font-semibold px-2 py-0.5"
                                        style={{
                                          background:
                                            theme.colors.backgroundDark,
                                          color: theme.colors.textPrimary,
                                          border: `1px solid ${theme.colors.border}`,
                                          borderRadius: theme.borderRadius.sm,
                                        }}
                                      >
                                        {getDays(group)}
                                      </span>
                                    ) : (
                                      <span
                                        className="text-xs"
                                        style={{
                                          color: theme.colors.textTertiary,
                                        }}
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>
                                )}

                                <td
                                  className="text-center whitespace-nowrap align-middle"
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    borderRight: `1px solid ${theme.colors.border}`,
                                  }}
                                >
                                  {user?.priceOnCall ? (
                                    <span
                                      className="text-sm font-bold"
                                      style={{
                                        color: theme.colors.textPrimary,
                                      }}
                                    >
                                      On Call
                                    </span>
                                  ) : (
                                    <div
                                      className="text-sm 2xl:text-base font-bold"
                                      style={{
                                        color: theme.colors.textPrimary,
                                      }}
                                    >
                                      PKR{" "}
                                      {calculatePriceAfterMargin(
                                        group.price,
                                        group,
                                      )?.toLocaleString()}
                                    </div>
                                  )}
                                </td>

                                <td
                                  className="w-28 2xl:w-36 align-middle"
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleBookNow(group)}
                                    disabled={!user?.showHideButton}
                                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 2xl:px-3 2xl:py-2 font-semibold text-xs transition-colors whitespace-nowrap w-full"
                                    style={{
                                      borderRadius: theme.borderRadius.md,
                                      background: user?.showHideButton
                                        ? theme.colors.primary
                                        : theme.colors.border,
                                      color: user?.showHideButton
                                        ? "#fff"
                                        : "#000",
                                      cursor: user?.showHideButton
                                        ? "pointer"
                                        : "not-allowed",
                                    }}
                                  // onMouseEnter={(e) => {
                                  //   if (user?.showHideButton) {
                                  //     e.currentTarget.style.background =
                                  //       theme.colors.accentDark;
                                  //   }
                                  // }}
                                  // onMouseLeave={(e) => {
                                  //   if (user?.showHideButton) {
                                  //     e.currentTarget.style.background =
                                  //       theme.colors.accent;
                                  //   }
                                  // }}
                                  >
                                    <Ticket size={13} />
                                    <span>Book Now</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
