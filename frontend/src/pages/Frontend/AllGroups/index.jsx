import React, { useEffect, useState, useContext } from "react";
import { FaRegCopy, FaCheck } from "react-icons/fa";
import { DashboardUIContext } from "../../../components/Dashboard/DashboardLayout";
import { Menu, Package } from "lucide-react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";
import { generateUmrahPackagesPDF } from "../../../utils/umrahPDFGen";

export default function AllGroups({ headerType, header, searchParams, user }) {
  // const [copiedAll, setCopiedAll] = useState(false);
  // const [copiedRow, setCopiedRow] = useState({});
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [activeDurationTab, setActiveDurationTab] = useState("all"); // 'all', '14', '21', '28'

  const handleDownloadPDF = async () => {
    if (filteredGroups.length === 0) {
      toast.warning("No packages available to download");
      return;
    }

    setDownloadingPDF(true);
    try {
      const userInfo = {
        name: user?.name || "",
        email: user?.email || "",
      };

      await generateUmrahPackagesPDF(filteredGroups, userInfo);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF download failed:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const MONTHS_TITLE = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // const buildCopyText = (groupsList) => {
  //   if (!groupsList.length) return "";
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);
  //   const headerText = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;
  //   const lines = groupsList
  //     .map((g) => {
  //       const flight = g.flights?.[0];
  //       if (!flight) return null;
  //       const minPrice = Math.min(
  //         ...Object.values(g.rooms || {}).filter(Boolean),
  //       );
  //       const price = isFinite(minPrice) ? minPrice : 0;
  //       return `${flight.flightNo} *${g.packageName}* ${flight.sectorFrom} → ${flight.sectorTo}..... *PKR ${price.toLocaleString()}*`;
  //     })
  //     .filter(Boolean);
  //   const footer = `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nAbid Air`;
  //   return [headerText, ...lines, "=======================", footer].join("\n");
  // };

  // const handleCopyAll = async () => {
  //   const text = buildCopyText(groups);
  //   try {
  //     await navigator.clipboard.writeText(text);
  //   } catch {
  //     const el = document.createElement("textarea");
  //     el.value = text;
  //     document.body.appendChild(el);
  //     el.select();
  //     document.execCommand("copy");
  //     document.body.removeChild(el);
  //   }
  //   setCopiedAll(true);
  //   setTimeout(() => setCopiedAll(false), 2000);
  // };

  // const handleCopyRow = async (group) => {
  //   const flight = group.flights?.[0];
  //   if (!flight) return;
  //   const minPrice = Math.min(
  //     ...Object.values(group.rooms || {}).filter(Boolean),
  //   );
  //   const price = isFinite(minPrice) ? minPrice : 0;
  //   const text = `${flight.flightNo} *${group.packageName}* ${flight.sectorFrom} → ${flight.sectorTo}..... *PKR ${price.toLocaleString()}*\n=======================\n*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nAbid Air`;
  //   try {
  //     await navigator.clipboard.writeText(text);
  //   } catch {
  //     const el = document.createElement("textarea");
  //     el.value = text;
  //     document.body.appendChild(el);
  //     el.select();
  //     document.execCommand("copy");
  //     document.body.removeChild(el);
  //   }
  //   setCopiedRow((prev) => ({ ...prev, [group.id]: true }));
  //   setTimeout(
  //     () => setCopiedRow((prev) => ({ ...prev, [group.id]: false })),
  //     2000,
  //   );
  // };

  const dashboardUI = useContext(DashboardUIContext);
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    sectors: [],
    airlines: [],
    searchKeyword: "",
    departDate: null,
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);

  useEffect(() => {
    if (dashboardUI) setShowAdvancedSearch(true);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchGroups();
  }, [searchParams]);

  const formatTime = (time) => {
    if (!time) return "";
    if (time.length === 4 && !time.includes(":"))
      return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
    return time.slice(0, 5);
  };

  const getId = (value) => String(value || "");

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const [packageRes, groupTicketRes, bookedSeatsRes] =
        await Promise.allSettled([
          axiosInstance.get("/umrahpackages/"),
          axiosInstance.get("/group-ticketing"),
          axiosInstance.get("/bookings/getBookedSeats"),
        ]);

      if (packageRes.status !== "fulfilled") {
        throw packageRes.reason;
      }

      const fetchedGroups = packageRes.value.data?.data || [];
      if (fetchedGroups.length === 0) {
        setGroups([]);
        setAirlines([]);
        setSectors([]);
        return;
      }

      const groupTicketTotalSeats = {};
      if (
        groupTicketRes.status === "fulfilled" &&
        groupTicketRes.value.data?.success
      ) {
        (groupTicketRes.value.data.data || []).forEach((ticket) => {
          const ticketId = getId(ticket._id || ticket.id);
          if (!ticketId) return;
          groupTicketTotalSeats[ticketId] = Number(ticket.totalSeats) || 0;
        });
      }

      const bookedSeatsByGroup = {};
      if (
        bookedSeatsRes.status === "fulfilled" &&
        bookedSeatsRes.value.data?.success
      ) {
        (bookedSeatsRes.value.data?.data?.breakdown?.byGroup || []).forEach(
          (group) => {
            const groupId = getId(group.groupId);
            if (!groupId) return;
            bookedSeatsByGroup[groupId] = Number(group.totalSeats) || 0;
          },
        );
      }

      const filtered = fetchedGroups.filter(
        (pkg) => pkg.internalStatus === "Public",
      );

      const formattedGroups = filtered
        .map((pkg) => {
          const flights = pkg.groupTicket?.flights || pkg.flights || [];
          const firstFlight = flights[0] || {};
          const lastFlight = flights[flights.length - 1] || {};

          const airlineName =
            pkg.groupTicket?.airline ||
            firstFlight.airlineName ||
            firstFlight.airline ||
            pkg.airlineName ||
            "";

          const sectorPoints =
            flights.length > 0
              ? [
                  firstFlight.sectorFrom || "",
                  ...flights.map((f) => f.sectorTo || ""),
                ].filter(Boolean)
              : [];
          const sector = sectorPoints.join("-");

          const toDate = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d) ? null : d;
          };

          // const hotels = (pkg.hotels || []).reduce((acc, h) => {
          //   const city = h.location?.city || "";
          //   const nightCount = Number(h?.nightCount ?? h?.nights ?? 0) || 0;
          //   const existingHotel = acc.find((hotel) => hotel.city === city);

          //   if (existingHotel) {
          //     existingHotel.nightCount += nightCount;
          //     return acc;
          //   }

          //   acc.push({
          //     _id: h._id,
          //     name: h.name || "",
          //     city,
          //     distance: h.location?.distance || "0",
          //     nightCount,
          //     rating: h.rating || 0,
          //     mapUrl: h.location?.mapUrl,
          //   });

          //   return acc;
          // }, []);

          const hotels = (pkg.hotels || []).map((h, index) => ({
            _id: h._id || `${h.name}-${index}`,
            name: h.name || "",
            city: h.location?.city || "",
            distance: h.location?.distance || "-",
            nightCount: Number(h?.nightCount ?? h?.nights ?? 0) || 0,
            rating: h.rating || 0,
            mapUrl: h.location?.mapUrl || "",
            originalHotel: h,
          }));

          const rooms = pkg.rooms || {};
          const roomValues = Object.values(rooms).filter(
            (v) => typeof v === "number" && v > 0,
          );
          const minPrice = roomValues.length > 0 ? Math.min(...roomValues) : 0;

          const selectedGroupTicketId = getId(
            pkg.selectedGroupTicketId ||
              pkg.groupTicket?._id ||
              pkg.groupTicket?.id,
          );
          const groupTicketSeats = groupTicketTotalSeats[selectedGroupTicketId];
          const groupTicketBookedSeats =
            bookedSeatsByGroup[selectedGroupTicketId] || 0;
          const remainingGroupTicketSeats =
            typeof groupTicketSeats === "number"
              ? Math.max(0, groupTicketSeats - groupTicketBookedSeats)
              : "";

          const availableRooms =
            selectedGroupTicketId && remainingGroupTicketSeats !== ""
              ? remainingGroupTicketSeats
              : pkg.availableRooms !== undefined && pkg.availableRooms !== ""
                ? pkg.availableRooms
                : (pkg.groupTicket?.totalSeats ?? "");

          return {
            id: pkg._id || pkg.id,
            _id: pkg._id || pkg.id,
            // TNT-specific IDs — preserved explicitly so booking page can send them correctly
            tnt_package_id: pkg.tnt_package_id ?? null,
            tnt_group_id: pkg.tnt_group_id ?? pkg.groupId ?? null,
            // Up Sky-specific IDs/raw snapshot — preserved so the booking page can
            // build the Up Sky booking payload with full fidelity
            upsky_package_id: pkg.upsky_package_id ?? null,
            upsky_group_id: pkg.upsky_group_id ?? null,
            upskyRaw: pkg.upskyRaw ?? null,
            packageName: pkg.packageName || "Umrah Package",
            packageDuration: pkg.days || "",
            sector,
            selectedGroupTicketId,
            groupTiktId: selectedGroupTicketId,
            groupTicketBookedSeats,
            groupTicketTotalSeats:
              typeof groupTicketSeats === "number" ? groupTicketSeats : "",
            airlineName,
            airline: {
              airline_name: airlineName,
              logo_url: pkg.flightLogo || null,
            },
            logo: pkg.logo,
            dept_date: toDate(firstFlight.depDate),
            returnDate: toDate(lastFlight.arrDate),
            depTime: formatTime(firstFlight.depTime || ""),
            arrTime: formatTime(lastFlight.arrTime || ""),
            flightNo: firstFlight.flightNo || "",
            flights,
            hotels,
            rooms,
            packageSource: pkg.packageSource,
            nightCount: pkg.nightCount || "",
            notes: pkg.notes || "",
            availableRooms,
            price: minPrice,
            transport: pkg.transports,
            visa: pkg.visa || null,
            packageTotals: pkg.packageTotals || {},
            metadata: {
              packageName: pkg.packageName,
              flightNumber: firstFlight.flightNo || "",
              departureDate: toDate(firstFlight.depDate),
              arrivalDate: toDate(lastFlight.arrDate),
              packageDuration: pkg.days,
              hotels,
              flights,
            },
          };
        })
        .sort((a, b) => {
          const aTime =
            a.dept_date instanceof Date ? a.dept_date.getTime() : Infinity;
          const bTime =
            b.dept_date instanceof Date ? b.dept_date.getTime() : Infinity;
          return aTime - bTime;
        });

      setAirlines(
        [
          ...new Set(formattedGroups.map((g) => g.airlineName).filter(Boolean)),
        ].sort(),
      );
      setSectors(
        [
          ...new Set(formattedGroups.map((g) => g.sector).filter(Boolean)),
        ].sort(),
      );
      setGroups(formattedGroups);
    } catch (err) {
      console.error("Error fetching groups:", err);
      toast.error("Failed to load Umrah packages. Please try again.");
      setGroups([]);
      setAirlines([]);
      setSectors([]);
    } finally {
      setLoading(false);
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
      setFilters((prev) => ({
        ...prev,
        airlines: prev.airlines.includes(value)
          ? prev.airlines.filter((a) => a !== value)
          : [...prev.airlines, value],
      }));
    } else {
      setFilters((prev) => ({ ...prev, [filterType]: value }));
    }
  };

  // Filter by duration tab
  const durationFilteredGroups = groups.filter((g) => {
    if (activeDurationTab === "all") return true;
    const duration = parseInt(g.packageDuration);
    if (isNaN(duration)) return false;
    if (activeDurationTab === "14") return duration === 14;
    if (activeDurationTab === "21") return duration === 21;
    if (activeDurationTab === "28") return duration === 28;
    return true;
  });

  // Apply search filters on top of duration filter
  const filteredGroups = durationFilteredGroups.filter((g) => {
    const airlineName = g.airlineName || "";
    const sector = (g.sector || "").toUpperCase().trim();
    const keyword = filters.searchKeyword.toLowerCase();
    if (filters.airlines.length && !filters.airlines.includes(airlineName))
      return false;
    if (filters.sectors.length && !filters.sectors.includes(sector))
      return false;
    if (
      keyword &&
      !`${airlineName} ${sector} ${g.flightNo || ""} ${g.packageName || ""}`
        .toLowerCase()
        .includes(keyword)
    )
      return false;
    if (filters.departDate && g.dept_date) {
      const depDate = new Date(g.dept_date);
      const filterDate = new Date(filters.departDate);
      if (
        depDate.getFullYear() !== filterDate.getFullYear() ||
        depDate.getMonth() !== filterDate.getMonth() ||
        depDate.getDate() !== filterDate.getDate()
      )
        return false;
    }
    return true;
  });

  const FilterContent = () => (
    <>
      <h3 className="font-bold text-sm mb-3 text-gray-800">Airlines</h3>
      <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
        {airlines.map((airline) => (
          <label
            key={airline}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors group"
          >
            <input
              type="checkbox"
              checked={filters.airlines.includes(airline)}
              onChange={() => handleFilterChange("airline", airline)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-900 font-medium">
              {airline}
            </span>
          </label>
        ))}
      </div>
      <div className="h-px bg-gray-100 my-4" />
      <h3 className="font-bold text-sm mb-3 text-gray-800">Sectors</h3>
      <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
        {sectors.map((sector) => (
          <label
            key={sector}
            className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors group"
          >
            <input
              type="checkbox"
              checked={filters.sectors.includes(sector)}
              onChange={() => handleFilterChange("sector", sector)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600 group-hover:text-gray-900 font-medium">
              {sector}
            </span>
          </label>
        ))}
      </div>
    </>
  );

  const UmrahPackageCard = ({ group, index }) => {
    const allFlights = group.flights || [];
    // const hotels = group.hotels || [];
    const rooms = group.rooms || {};

    // const makkahHotels = hotels.slice(0, 1);
    // const madinahHotels = hotels.slice(1, 2);
    // const makkahHotels = hotels.filter((hotel) =>
    //   ["makkah", "mecca"].includes((hotel.city || "").toLowerCase())
    // );

    // const madinahHotels = hotels.filter((hotel) =>
    //   ["madinah", "madina", "medina"].includes((hotel.city || "").toLowerCase())
    // );

    const allDisplayHotels = group.hotels || [];

    const combineHotelsByName = (hotels) =>
      hotels.reduce((combinedHotels, hotel) => {
        const hotelName = (hotel.name || "").trim();
        const normalizedName = hotelName.toLowerCase();
        const existingHotel = combinedHotels.find(
          (item) => (item.name || "").trim().toLowerCase() === normalizedName,
        );

        if (existingHotel && normalizedName) {
          existingHotel.nightCount += Number(hotel.nightCount) || 0;
          return combinedHotels;
        }

        combinedHotels.push({
          ...hotel,
          name: hotelName || hotel.name,
          nightCount: Number(hotel.nightCount) || 0,
        });
        return combinedHotels;
      }, []);

    const makkahHotels = combineHotelsByName(
      allDisplayHotels.filter((hotel) =>
        ["makkah", "mecca"].includes((hotel.city || "").toLowerCase()),
      ),
    );

    const madinahHotels = allDisplayHotels.filter((hotel) =>
      ["madinah", "madina", "medina"].includes(
        (hotel.city || "").toLowerCase(),
      ),
    );

    const packageTotals = group.packageTotals || {};
    // packageTotals uses "shared" but display uses "sharing"
    const totalsKeyMap = {
      sharing: "shared",
      quint: "quint",
      quad: "quad",
      triple: "triple",
      double: "double",
      childWithoutBed: "childWithoutBed",
      infant: "infant",
    };

    const roomOrder = [
      "sharing",
      "quint",
      "quad",
      "triple",
      "double",
      "childWithoutBed",
      "infant",
    ];
    const roomColors = {
      sharing: { bg: "#e8f4fd", text: "#1565c0", border: "#90caf9" },
      quad: { bg: "#f3e5f5", text: "#6a1b9a", border: "#ce93d8" },
      triple: { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7" },
      double: { bg: "#fff8e1", text: "#e65100", border: "#ffcc80" },
      quint: { bg: "#fce4ec", text: "#880e4f", border: "#f48fb1" },
      childWithoutBed: { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
      infant: { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
    };

    const getRoomPrice = (key) => {
      const totalsKey = totalsKeyMap[key] || key;
      const fromTotals = packageTotals[totalsKey];
      if (typeof fromTotals === "number" && fromTotals > 0) return fromTotals;
      return rooms[key];
    };

    const availableRoomTypes = roomOrder
      .filter((key) => {
        const price = getRoomPrice(key);
        return typeof price === "number" && price > 0;
      })
      .map((key) => ({
        key,
        label:
          key === "childWithoutBed"
            ? "Child"
            : key === "infant"
              ? "Infant"
              : key.charAt(0).toUpperCase() + key.slice(1),
      }));

    const fmt = (n) => Number(n).toLocaleString();
    const flightRowText = (fl) => {
      const depD = fl.depDate ? new Date(fl.depDate) : null;

      const dateStr = depD
        ? `${String(depD.getDate()).padStart(2, "0")} ${MONTHS_TITLE[depD.getMonth()]}`
        : "";

      const sector =
        fl.sectorFrom && fl.sectorTo ? `${fl.sectorFrom}-${fl.sectorTo}` : "";

      const times = [fl.depTime, fl.arrTime].filter(Boolean).join("–");

      const baggage = fl.baggage ? fl.baggage : "";

      const parts = [];

      if (dateStr) parts.push(dateStr);
      if (sector) parts.push(sector);
      if (fl.flightNo) parts.push(fl.flightNo);
      if (times) parts.push(times);
      if (baggage) parts.push(baggage);

      return parts.join(" • ");
    };

    // const HotelInfo = ({ hotels, icon, alt }) => (
    //   <div className="flex flex-col items-center gap-2 min-w-45 max-w-60">
    //     <img
    //       className="w-12 h-12 object-contain shrink-0"
    //       src={icon}
    //       alt={alt}
    //     />

    //     <div className="flex flex-col gap-1">
    //       {hotels.map((hotel, i) => (
    //         <div key={hotel._id || i} className="text-center">
    //           <div className="text-[10px] md:text-[11px] font-bold text-gray-900 leading-tight uppercase">
    //             {hotel.name || "-"}
    //           </div>

    //           <div className="text-[9px] md:text-[10px] text-red-500 font-bold leading-tight">
    //             {hotel.distance || "-"} - ({hotel.nightCount || 0} Nights)
    //           </div>
    //         </div>
    //       ))}
    //     </div>
    //   </div>
    // );

    const HotelInfo = ({ hotels, icon, alt }) => (
      <div className="flex flex-col items-center gap-2 w-full min-w-0">
        <img
          className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
          src={icon}
          alt={alt}
        />

        <div className="flex flex-col gap-1 w-full min-w-0">
          {hotels.map((hotel, i) => (
            <div key={hotel._id || i} className="text-center min-w-0">
              <div className="text-[10px] md:text-[11px] font-bold text-gray-900 leading-tight uppercase wrap-break-word">
                {hotel.name || "-"}
              </div>

              <div className="text-[9px] md:text-[10px] text-red-500 font-bold leading-tight wrap-break-word">
                {hotel.distance || "-"} - ({hotel.nightCount || 0} Nights)
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    const cream = "#F5F5DC";

    return (
      <div
        className="rounded-xl overflow-hidden mb-4 bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
        style={{
          border: `1px solid ${theme.colors.border}`,
          boxShadow:
            "0 4px 16px -4px rgba(127,29,29,0.12), 0 2px 6px -2px rgba(127,29,29,0.06)",
        }}
      >
        {/* Header Bar */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center p-3 sm:p-4 gap-2 sm:gap-3"
          style={{
            background: `linear-gradient(135deg, #FFFCF7 0%, #F5EEDC 100%)`,
            borderBottom: `3px solid ${theme.colors.primary}`,
          }}
        >
          <div
            className="text-xs sm:text-sm font-bold"
            // style={{ color: theme.colors.primaryDark }}
          >
            {index !== undefined ? `${index + 1} ` : ""}
            <span>★</span> {group.packageName}
          </div>

          <div className="flex-1 flex flex-col items-start sm:items-center gap-1 w-full sm:w-auto">
            {allFlights.map((fl, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold flex-wrap"
                // style={{ color: theme.colors.textSecondary }}
              >
                <span className="text-xs opacity-90">✈</span>
                <span className="break-all">{flightRowText(fl)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {group.packageDuration && (
              <div
                className="rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold whitespace-nowrap shadow-sm text-white"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
                }}
              >
                {group.packageDuration} DAYS
              </div>
            )}
            {group.nightCount && (
              <div
                className="rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold whitespace-nowrap shadow-sm text-white"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
                }}
              >
                {group.nightCount} NIGHTS
              </div>
            )}
            {group.availableRooms !== "" &&
              group.availableRooms !== undefined && (
                <div
                  className="rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold whitespace-nowrap shadow-sm text-white"
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
                  }}
                >
                  Seats: {group.availableRooms}
                </div>
              )}
            {/* {group.visa?.visaType && (
              <div className="bg-white/20 border border-white/40 rounded-full px-2 sm:px-3 py-1 text-white text-[10px] sm:text-xs font-bold whitespace-nowrap">
                🛂 {group.visa.visaType} Visa
              </div>
            )} */}
          </div>
        </div>

        {/* Body */}
        <div className="p-2.5 sm:p-3" style={{ background: "#FFFDF9" }}>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1.15fr)_auto] gap-4 xl:gap-5 items-center">
            {/* LEFT SIDE: Airline + Hotels */}
            <div className="flex flex-col md:flex-row items-center md:items-center justify-center md:justify-start gap-3 md:gap-4 min-w-0">
              {/* Airline Logo */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-white rounded-md flex items-center justify-center">
                <img
                  src={
                    group.airline?.logo_url ||
                    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&h=100&fit=crop"
                  }
                  alt={group.airlineName}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&h=100&fit=crop";
                  }}
                />
              </div>

              {/* Hotels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                {/* Makkah Hotels */}
                <div className="flex items-center justify-center min-w-10">
                  {makkahHotels.length > 0 ? (
                    <HotelInfo
                      hotels={makkahHotels}
                      icon="https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png"
                      alt="Makkah Hotels"
                    />
                  ) : (
                    <div className="text-[10px] text-gray-400 italic text-center">
                      No Makkah hotel
                    </div>
                  )}
                </div>

                {/* Madinah Hotels */}
                <div className="flex items-center justify-center min-w-10">
                  {madinahHotels.length > 0 ? (
                    <HotelInfo
                      hotels={madinahHotels}
                      icon="https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png"
                      alt="Madinah Hotels"
                    />
                  ) : (
                    <div className="text-[10px] text-gray-400 italic text-center">
                      No Madinah hotel
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Pricing + Notes + Transport */}
            <div className="flex flex-col items-center justify-center gap-3 min-w-0 w-full">
              {/* Room Types */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 items-stretch justify-center gap-1 sm:gap-1.5 w-full">
                {availableRoomTypes.length > 0 ? (
                  availableRoomTypes.map(({ key, label }) => {
                    const c = roomColors[key] || {
                      bg: "#f3f4f6",
                      text: "#374151",
                      border: "#d1d5db",
                    };

                    return (
                      <div
                        key={key}
                        className="flex flex-col items-center justify-center gap-0.5 px-0.5 sm:px-1.5 py-1 sm:py-1.5 rounded-md min-w-0"
                        style={{
                          // background: "#FCFAF5",
                          border: `1px solid ${c.border}`,
                          color: "#3A3A3A",
                        }}
                      >
                        <span
                          className="text-[6px] sm:text-[7px] md:text-[8px] font-bold uppercase tracking-wide text-center truncate w-full"
                          // style={{ color: c.text }}
                        >
                          {label}
                        </span>

                        <span
                          className="text-[10px] xs:text-[11px] sm:text-[12px] md:text-[14px] font-bold text-center w-full wrap-break-word leading-tight"
                          style={{ color: c.text }}
                        >
                          Rs {fmt(getRoomPrice(key))}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-gray-400 italic col-span-full">
                    Pricing unavailable
                  </span>
                )}
              </div>

              {/* Notes */}
              {group.notes && (
                <div className="w-full max-w-xl px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <div className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-yellow-600 mt-0.5">📝</span>
                    <span className="font-bold text-yellow-800 shrink-0">
                      Note:
                    </span>
                    <span className="text-yellow-900 font-medium wrap-break-word">
                      {group.notes}
                    </span>
                  </div>
                </div>
              )}

              {/* Transport info */}
              {group.transport && group.transport.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center w-full">
                  {group.transport.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 text-[10px] md:text-[11px] bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-full font-medium max-w-full"
                    >
                      <span>🚌</span>
                      <span className="wrap-break-word">
                        {t.route} ({t.transportType})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ACTION BUTTON */}
            <div className="flex items-center justify-center xl:justify-end w-full xl:w-auto">
              <button
                onClick={() =>
                  navigate("/dashboard/pkg-detail", { state: { group } })
                }
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-white text-xs font-bold whitespace-nowrap hover:brightness-110 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
                  boxShadow: "0 4px 12px -2px rgba(127,29,29,0.35)",
                }}
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LoadingSkeleton = () => (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl overflow-hidden border border-gray-200 animate-pulse"
        >
          <div className="h-12 bg-gray-200" />
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex-1 flex flex-col gap-2">
                <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Get counts for each duration tab
  const getCountForDuration = (duration) => {
    if (duration === "all") return groups.length;
    return groups.filter((g) => {
      const pkgDuration = parseInt(g.packageDuration);
      return !isNaN(pkgDuration) && pkgDuration === duration;
    }).length;
  };

  return (
    <>
      <TopBar
        title={"Umrah Packages"}
        icon={<Package className="text-white w-5 h-5 sm:w-6 sm:h-6" />}
      />
      <div className="w-full min-h-screen bg-gray-50">
        {headerType === "dashboard" && groups.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 mb-3">
            <button
              onClick={handleDownloadPDF}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all"
              style={{ background: downloadingPDF ? "#94a3b8" : "#dc2626" }}
              disabled={downloadingPDF}
            >
              {downloadingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent" />
                  <span className="hidden xs:inline">Generating...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="xs:inline">Download PDF</span>
                  <span className="xs:hidden">PDF</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Duration Tabs */}
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveDurationTab("all")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeDurationTab === "all"
                ? "text-white bg-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
            style={
              activeDurationTab === "all"
                ? { background: theme.colors.primary, color: "white" }
                : {}
            }
          >
            All ({getCountForDuration("all")})
          </button>
          <button
            onClick={() => setActiveDurationTab("14")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeDurationTab === "14"
                ? "text-white bg-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
            style={
              activeDurationTab === "14"
                ? { background: theme.colors.primary, color: "white" }
                : {}
            }
          >
            14 Days ({getCountForDuration(14)})
          </button>
          <button
            onClick={() => setActiveDurationTab("21")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeDurationTab === "21"
                ? "text-white bg-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
            style={
              activeDurationTab === "21"
                ? { background: theme.colors.primary, color: "white" }
                : {}
            }
          >
            21 Days ({getCountForDuration(21)})
          </button>
          <button
            onClick={() => setActiveDurationTab("28")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeDurationTab === "28"
                ? "text-white bg-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            }`}
            style={
              activeDurationTab === "28"
                ? { background: theme.colors.primary, color: "white" }
                : {}
            }
          >
            28 Days ({getCountForDuration(28)})
          </button>
        </div>

        {/* Toolbar */}
        <div
          className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 py-3 ${headerType === "dashboard" ? "rounded-t-2xl" : ""}`}
        >
          <div className="w-full xl:w-auto">{header}</div>
          <div className="flex flex-col lg:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center justify-between w-full lg:w-auto gap-4">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showAdvancedSearch}
                    onChange={(e) => setShowAdvancedSearch(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-9 h-5 rounded-full transition-all"
                    style={{
                      background: showAdvancedSearch
                        ? theme.colors.primary
                        : "#d1d5db",
                    }}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${showAdvancedSearch ? "translate-x-4" : ""}`}
                    />
                  </div>
                </div>
                <span className="ml-2 text-xs font-medium text-gray-700 whitespace-nowrap">
                  Advanced Search
                </span>
              </label>
              {showAdvancedSearch && (
                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden p-2 rounded-lg bg-gray-100 text-gray-700"
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 text-sm"
                />
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile filter drawer */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-80 bg-white p-6 shadow-xl overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Filters</h2>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Menu size={20} />
                </button>
              </div>
              <FilterContent />
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-5 pt-4 pb-8">
          {showAdvancedSearch && (
            <div className="hidden lg:block w-64 shrink-0">
              <div className="bg-white rounded-xl p-5 sticky top-6 border border-gray-100 shadow-sm">
                <FilterContent />
              </div>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <LoadingSkeleton />
            ) : filteredGroups.length === 0 ? (
              <div className="bg-white rounded-xl p-8 sm:p-12 text-center border border-gray-100">
                <div className="text-4xl sm:text-5xl mb-4">✈️</div>
                <p className="text-gray-400 text-sm sm:text-base">
                  No packages available at the moment
                </p>
                <p className="text-gray-300 text-xs sm:text-sm mt-2">
                  Please check back later or adjust your filters
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGroups.map((group, idx) => (
                  <UmrahPackageCard
                    key={group.id || group._id || idx}
                    group={group}
                    index={idx}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add responsive styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          .xs\\:inline {
            display: inline;
          }
        }
        @media (min-width: 641px) {
          .xs\\:hidden {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
