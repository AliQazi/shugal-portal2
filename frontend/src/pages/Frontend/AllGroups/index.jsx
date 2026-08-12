import React, { useEffect, useState } from "react";
import { FaRegCopy, FaCheck, FaBus } from "react-icons/fa";
import { Menu, Package, Plane } from "lucide-react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import MaskedDatePicker from "../../../components/MaskedDatePicker";
import { theme } from "../../../theme/theme";
import TopBar from "../../../components/TopBar/TopBar";
import { generateUmrahPackagesPDF } from "../../../utils/umrahPDFGen";

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

// packageTotals uses "shared" but the room-selector UI uses "sharing"
const ROOM_TOTALS_KEY_MAP = {
  sharing: "shared",
  quint: "quint",
  quad: "quad",
  triple: "triple",
  double: "double",
  childWithoutBed: "childWithoutBed",
  infant: "infant",
};

const ROOM_ORDER = [
  "sharing",
  "quint",
  "quad",
  "triple",
  "double",
  // "childWithoutBed",
  // "infant",
];

const fmt = (n) => Number(n).toLocaleString();

const formatTime = (time) => {
  if (!time) return "";
  if (time.length === 4 && !time.includes(":"))
    return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
  return time.slice(0, 5);
};

// Room price resolution mirrors the previous card logic: packageTotals wins
// when set, falling back to the raw rooms map saved on the package.
const getRoomPrice = (pkg, key) => {
  const totalsKey = ROOM_TOTALS_KEY_MAP[key] || key;
  const fromTotals = pkg.packageTotals?.[totalsKey];
  if (typeof fromTotals === "number" && fromTotals > 0) return fromTotals;
  const fromRooms = pkg.rooms?.[key];
  return typeof fromRooms === "number" && fromRooms > 0 ? fromRooms : null;
};

const combineHotelsByName = (hotels) =>
  hotels.reduce((combined, hotel) => {
    const hotelName = (hotel.name || "").trim();
    const normalizedName = hotelName.toLowerCase();
    const existing = combined.find(
      (item) => (item.name || "").trim().toLowerCase() === normalizedName,
    );
    if (existing && normalizedName) {
      existing.nightCount += Number(hotel.nightCount) || 0;
      return combined;
    }
    combined.push({
      ...hotel,
      name: hotelName || hotel.name,
      nightCount: Number(hotel.nightCount) || 0,
    });
    return combined;
  }, []);

const getCityHotels = (pkg, cities) =>
  combineHotelsByName(
    (pkg.hotels || []).filter((hotel) =>
      cities.includes((hotel.city || "").toLowerCase()),
    ),
  );

const roomLabel = (key) =>
  key === "childWithoutBed"
    ? "Child"
    : key === "infant"
      ? "Infant"
      : key.charAt(0).toUpperCase() + key.slice(1);

// The room columns rendered for a batch are the union of whatever room
// types any package on that group ticket actually has priced, so the table
// stays aligned across rows instead of guessing a fixed column set.
const getBatchRoomColumns = (packages) =>
  ROOM_ORDER.filter((key) =>
    packages.some((pkg) => getRoomPrice(pkg, key) !== null),
  ).map((key) => ({ key, label: roomLabel(key) }));

// Transport can vary between the different Group Tickets merged into one
// Airline+Sector batch, so collect the union across every package instead
// of assuming it's identical, deduping on route + transport type.
const getBatchTransport = (packages) => {
  const seen = new Set();
  const combined = [];
  packages.forEach((pkg) => {
    (pkg.transport || []).forEach((t) => {
      const dedupeKey = `${(t.route || "").trim().toLowerCase()}|${(t.transportType || "").trim().toLowerCase()}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      combined.push(t);
    });
  });
  return combined;
};

// Falls back to the first room type (in ROOM_ORDER) that has a price when
// the generic "Book Now" button is used instead of a specific price cell —
// mirrors the default selection DetailPage used to make before booking.
const getDefaultRoomSelection = (pkg) => {
  for (const key of ROOM_ORDER) {
    const price = getRoomPrice(pkg, key);
    if (price !== null) return { room: key, price };
  }
  return { room: "sharing", price: 0 };
};

// Short date used inside the combined Schedule column, e.g. "15 AUG" — no
// year, month abbreviation uppercased to match the requested format.
const formatScheduleDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d)) return "-";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_TITLE[d.getMonth()].toUpperCase()}`;
};

// Collapses Departure/Arrival/Dep Date Time/Arr Date Time into one line,
// e.g. "PK 15 AUG LHE-JED 17:30 21:30".
const formatScheduleLine = (fl, airlineCode) => {
  const prefix = airlineCode ? `${airlineCode} ` : "";
  const route = `${fl.sectorFrom || "-"}-${fl.sectorTo || "-"}`;
  const depTime = formatTime(fl.depTime) || "-";
  const arrTime = formatTime(fl.arrTime) || "-";
  return `${prefix}${formatScheduleDate(fl.depDate)} ${route} ${depTime} ${arrTime}`;
};

const HotelCellLines = ({ pkg }) => {
  const makkah = getCityHotels(pkg, ["makkah", "mecca"]);
  const madinah = getCityHotels(pkg, ["madinah", "madina", "medina"]);
  const lines = [
    ...makkah.map((h) => ({ tag: "Makkah", hotel: h })),
    ...madinah.map((h) => ({ tag: "Madina", hotel: h })),
  ];

  if (!lines.length) {
    return <span className="text-xs text-gray-400 italic">No hotels</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {lines.map(({ tag, hotel }, i) => (
        <div key={hotel._id || i} className="text-xs leading-relaxed">
          <span className="font-bold text-gray-800">{tag}:</span>{" "}
          <span className="text-gray-700">{hotel.name || "-"}</span>
          {hotel.distance && hotel.distance !== "-" && (
            <span className="text-gray-500"> ({hotel.distance})</span>
          )}
        </div>
      ))}
    </div>
  );
};

// A batch groups every package that shares the same Airline + Sector,
// regardless of which Group Ticket it was built from — packages from
// different Group Tickets (different flight dates, hotels, etc.) on the
// same route collapse into one card. The shared airline/sector info is
// shown once in the header, and every hotel/room combination — from any
// of the underlying Group Tickets — becomes one row of the table below,
// each keeping its own flight legs, dates and (critically) its own
// Group Ticket's seat availability for booking.
const UmrahBatchCard = ({ batch, index, onBook }) => {
  const packages = batch.packages;
  const headerPkg = packages[0];
  const flights = headerPkg.flights || [];
  const roomColumns = getBatchRoomColumns(packages);
  // Transport can differ between the merged Group Tickets, so the header
  // shows the union (deduped by route + type) instead of just headerPkg's.
  const batchTransport = getBatchTransport(packages);

  return (
    <div
      className="rounded-xl overflow-hidden mb-3 bg-white shadow-sm"
      style={{ border: `1px solid ${theme.colors.border}` }}
    >
      {/* Header Bar: airline logo left, sector centered, badges right */}
      <div
        className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-2 sm:p-3.5"
        style={{ borderBottom: `3px solid ${theme.colors.primary}` }}
      >
        <div className="flex-1 flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
          <div className="w-40 h-8 shrink-0 bg-white rounded-md flex items-center justify-center overflow-hidden">
            <img
              src={
                headerPkg.airline?.logo_url ||
                "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&h=100&fit=crop"
              }
              alt={headerPkg.airlineName}
              className="w-full! h-full! object-contain"
              onError={(e) => {
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&h=100&fit=crop";
              }}
            />
          </div>
          <span className="sm:hidden text-xs font-bold text-gray-400">
            {index !== undefined ? `#${index + 1}` : ""}
          </span>
        </div>

        <div className="shrink-0 flex items-center justify-center gap-2">
          <Plane
            size={16}
            className="shrink-0"
            style={{ color: theme.colors.primary }}
          />
          <span
            className="text-base sm:text-lg font-bold tracking-wide text-center"
            style={{ color: theme.colors.textPrimary }}
          >
            {headerPkg.sector || headerPkg.airlineName || "Group"}
          </span>
        </div>

        <div className="flex-1 flex flex-wrap items-center justify-center sm:justify-end gap-1.5">
          {headerPkg.packageDuration && (
            <span
              className="rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap"
              style={{
                borderColor: theme.colors.border,
                background: theme.colors.background,
                color: theme.colors.primaryDark,
              }}
            >
              {headerPkg.packageDuration} Days
            </span>
          )}
          {headerPkg.nightCount && (
            <span
              className="rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap"
              style={{
                borderColor: theme.colors.border,
                background: theme.colors.background,
                color: theme.colors.primaryDark,
              }}
            >
              {headerPkg.nightCount} Nights
            </span>
          )}
          {/* {headerPkg.availableRooms !== "" &&
            headerPkg.availableRooms !== undefined && (
              <span
                className="rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap"
                style={{
                  borderColor: theme.colors.border,
                  background: theme.colors.background,
                  color: theme.colors.primaryDark,
                }}
              >
                Seats: {headerPkg.availableRooms}
              </span>
            )} */}
          {/* {packages.length > 1 && (
            <span className="rounded-full bg-amber-100 border border-amber-300 text-amber-800 px-2.5 py-1 text-xs font-black whitespace-nowrap">
              {packages.length} Options
            </span>
          )} */}
        </div>
      </div>

      {/* Transport info (union across every merged Group Ticket, shown once) */}
      {batchTransport.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 px-3 sm:px-4 py-2 border-b"
          style={{
            borderColor: theme.colors.border,
            background: theme.colors.background,
          }}
        >
          {batchTransport.map((t, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg font-medium"
            >
              <FaBus size={11} />
              {t.route} ({t.transportType})
            </span>
          ))}
        </div>
      )}

      {/* Flight + hotel + pricing table — one row per hotel/room option */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-190 text-left border-collapse">
          <thead>
            <tr style={{ background: theme.colors.background }}>
              <th className="px-3 sm:px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Hotels
              </th>
              <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Schedule
              </th>
              <th className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Luggage
              </th>
              {roomColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500 text-center whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className="divide-y"
            style={{ borderColor: theme.colors.border }}
          >
            {packages.map((pkg) => {
              const legs = pkg.flights?.length ? pkg.flights : flights;

              return (
                <tr
                  key={pkg.id || pkg._id}
                  className="align-top even:bg-gray-50"
                  style={{ borderColor: theme.colors.border }}
                >
                  <td className="px-3 sm:px-4 py-4 min-w-44">
                    <HotelCellLines pkg={pkg} />
                    {pkg.notes && (
                      <div className="text-[11px] text-amber-700 mt-1.5">
                        📝 {pkg.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-xs font-semibold text-gray-700 whitespace-nowrap leading-relaxed">
                    {legs.map((fl, i) => (
                      <div key={i}>
                        {formatScheduleLine(fl, pkg.airline?.airlineCode)}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-4 text-xs text-gray-700 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {legs.map((fl, i) => {
                        const baggage = fl.baggage || "-";
                        return (
                          <div key={i} className="leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-xs">
                              <svg
                                className="w-3 h-3 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                />
                              </svg>
                              {baggage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  {roomColumns.map((col) => {
                    const price = getRoomPrice(pkg, col.key);
                    return (
                      <td key={col.key} className="px-3 py-4 text-center">
                        {price ? (
                          <button
                            onClick={() => onBook(pkg, col.key, price)}
                            className="group relative inline-flex w-fit flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg px-4 py-2 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                          >
                            {/* Gradient layer only shows on hover — the price
                                stays plain text otherwise */}
                            <span
                              className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                              style={{
                                background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
                              }}
                            />
                            <span
                              className="relative text-sm font-bold whitespace-nowrap transition-colors duration-200 group-hover:text-white"
                            >
                              {fmt(price)}
                            </span>
                            {/* Space is always reserved so hovering never shifts row height */}
                            <span className="relative text-[10px] font-black uppercase tracking-wide text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              Book Now
                            </span>
                          </button>
                        ) : (
                          <span className="flex min-h-14 items-center justify-center text-gray-300">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

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
  //   const footer = `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nAbid Air Travel & Tours`;
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
  //   const text = `${flight.flightNo} *${group.packageName}* ${flight.sectorFrom} → ${flight.sectorTo}..... *PKR ${price.toLocaleString()}*\n=======================\n*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*\n=======================\nAbid Air Travel & Tours`;
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
  // Advanced Search stays collapsed by default until the user opts in.
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [airlines, setAirlines] = useState([]);
  const [sectors, setSectors] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const getId = (value) => String(value || "");

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const [packageRes, groupTicketRes, bookedSeatsRes, airlineRes] =
        await Promise.allSettled([
          axiosInstance.get("/umrahpackages/"),
          axiosInstance.get("/group-ticketing"),
          axiosInstance.get("/bookings/getBookedSeats"),
          axiosInstance.get("/airline"),
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

      // Real-time airline logos from the Airline collection, keyed every way
      // a package's airline field might be stored (full name / short code /
      // IATA code) so a match is found regardless of data source.
      const airlineLogoByKey = {};
      // Same idea, but resolving the airline's short IATA-style code (e.g.
      // "PK") used as the prefix in the Schedule column.
      const airlineCodeByKey = {};
      if (
        airlineRes.status === "fulfilled" &&
        airlineRes.value.data?.success
      ) {
        (airlineRes.value.data.data || []).forEach((airline) => {
          const keys = [
            airline.airlineName,
            airline.shortCode,
            airline.airlineCode,
          ].filter(Boolean);
          keys.forEach((key) => {
            const normalizedKey = key.trim().toLowerCase();
            if (airline.logo) airlineLogoByKey[normalizedKey] = airline.logo;
            if (airline.airlineCode)
              airlineCodeByKey[normalizedKey] = airline.airlineCode;
          });
        });
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

          // Prefer the airline's current logo from the Airline collection
          // (kept up to date by admins) over the snapshot saved on the
          // package at creation time.
          const airlineLogo = airlineName
            ? airlineLogoByKey[airlineName.trim().toLowerCase()]
            : undefined;
          const airlineCode = airlineName
            ? airlineCodeByKey[airlineName.trim().toLowerCase()]
            : undefined;

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
              logo_url: airlineLogo || pkg.flightLogo || null,
              airlineCode: airlineCode || pkg.airlineCode || "",
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

  // Packages are shown as one batch card per Airline + Sector — packages
  // built from different Group Tickets (different flight dates, hotels,
  // etc.) collapse into the same card as long as the airline and sector
  // match exactly, with each hotel/room combination becoming its own
  // option row. Each row still carries its own package object (and thus
  // its own Group Ticket's seat availability/pricing), so booking a
  // specific row always books against the correct Group Ticket — only the
  // card grouping changes, not what gets booked.
  const batchMap = new Map();
  filteredGroups.forEach((group) => {
    const airlineKey = (group.airlineName || "").trim().toLowerCase();
    const sectorKey = (group.sector || "").trim().toUpperCase();
    const key =
      airlineKey && sectorKey
        ? `route-${airlineKey}|${sectorKey}`
        : group.groupTiktId
          ? `ticket-${group.groupTiktId}`
          : `single-${group.id || group._id}`;
    if (!batchMap.has(key)) batchMap.set(key, { key, packages: [] });
    batchMap.get(key).packages.push(group);
  });
  const groupedPackageCards = Array.from(batchMap.values()).map((batch) => ({
    ...batch,
    packages: [...batch.packages].sort(
      (a, b) => (a.price || 0) - (b.price || 0),
    ),
  }));

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
      <div className="w-full min-h-screen umrah-groups-page">
        {/* NEW: Combined Header Row for Tabs and PDF Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 mb-4 gap-4">

          {/* Duration Tabs - overflow-x-auto allows scrolling on tiny screens */}
          <div className="flex overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "All", count: getCountForDuration("all") },
              { id: "14", label: "14 Days", count: getCountForDuration(14) },
              { id: "21", label: "21 Days", count: getCountForDuration(21) },
              { id: "28", label: "28 Days", count: getCountForDuration(28) },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDurationTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeDurationTab === tab.id
                  ? "text-primary border-primary"
                  : "text-gray-600 border-transparent hover:text-gray-800 hover:bg-gray-50"
                  }`}
                style={
                  activeDurationTab === tab.id
                    ? { color: theme.colors.primary, borderColor: theme.colors.primary }
                    : {}
                }
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* PDF Download Button - hidden on mobile if needed, or just shrunk */}
          {headerType === "dashboard" && groups.length > 0 && (
            <div className="pb-2 sm:pb-0 pr-2">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 rounded-lg text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 shadow-sm"
                style={{
                  background: downloadingPDF ? "#94a3b8" : "#dc2626",
                  marginBottom: '2px' // Aligns visually with the tab border
                }}
                disabled={downloadingPDF}
              >
                {downloadingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>
          )}
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
                {groupedPackageCards.map((batch, idx) => (
                  <UmrahBatchCard
                    key={batch.key}
                    batch={batch}
                    index={idx}
                    onBook={(pkg, roomKey, price) => {
                      // A specific price cell was clicked ⇒ book that exact
                      // room; the generic "Book Now" button falls back to
                      // the first priced room, same default DetailPage used
                      // to pick before we cut it out of the booking flow.
                      const selection =
                        roomKey && price
                          ? { room: roomKey, price }
                          : getDefaultRoomSelection(pkg);
                      navigate("/dashboard/book-umrah", {
                        state: {
                          packageData: pkg,
                          selectedRoom: selection.room,
                          pricePerPerson: selection.price,
                        },
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add responsive styles */}
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;800;900&display=swap");
        /* Font is scoped to this page only via .umrah-groups-page — do not
           move this to a global stylesheet, other pages must stay as-is. */
        .umrah-groups-page,
        .umrah-groups-page * {
          font-family: "Roboto", sans-serif;
        }
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
