import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { theme } from "../../../theme/theme";
import { FaCar, FaBus } from "react-icons/fa";
import {
  FaPlaneDeparture,
  FaPlaneArrival,
  FaHotel,
  FaCheckCircle,
  FaStar,
  FaMapMarkedAlt,
} from "react-icons/fa";
import { Ticket, Info } from "lucide-react";

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";

  const match = String(dateStr)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);

  let year;
  let month;
  let day;

  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    const parsedDate = new Date(dateStr);

    if (Number.isNaN(parsedDate.getTime())) return "N/A";

    year = parsedDate.getFullYear();
    month = parsedDate.getMonth() + 1;
    day = parsedDate.getDate();
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return "N/A";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const formatTime = (time) => {
  if (!time) return "N/A";
  return time;
};

export default function DetailPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const group = state?.group;

  const totalsKeyMap = {
    sharing: "shared",
    quint: "quint",
    quad: "quad",
    triple: "triple",
    double: "double",
    childWithoutBed: "childWithoutBed",
    infant: "infant",
  };
  const roomOrder = ["sharing", "quint", "quad", "triple", "double"];
  // How many seats booking this room type consumes per room booked —
  // must match the capacity used in UmrahBookingPage's getRoomCapacity.
  const roomCapacityMap = {
    sharing: 1,
    double: 2,
    triple: 3,
    quad: 4,
    quint: 5,
  };
  const getRoomPrice = (key, rooms, packageTotals) => {
    const totalsKey = totalsKeyMap[key] || key;
    const fromTotals = packageTotals?.[totalsKey];
    if (typeof fromTotals === "number" && fromTotals > 0) return fromTotals;
    const fromRooms = rooms?.[key];
    return typeof fromRooms === "number" && fromRooms > 0 ? fromRooms : null;
  };
  const isRoomSelectable = (key, availableRooms) =>
    availableRooms >= (roomCapacityMap[key] || 1);

  const [selectedRoom, setSelectedRoom] = useState(() => {
    const rooms = state?.group?.rooms || {};
    const packageTotals = state?.group?.packageTotals || {};
    const availableRooms = state?.group?.availableRooms || 0;
    return (
      roomOrder.find(
        (k) =>
          getRoomPrice(k, rooms, packageTotals) !== null &&
          isRoomSelectable(k, availableRooms),
      ) || "sharing"
    );
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [])

  if (!group) {
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: theme.colors.textSecondary,
        }}
      >
        <Info size={40} style={{ marginBottom: "8px", opacity: 0.5 }} />
        <h2>No package data found.</h2>
      </div>
    );
  }

  const roomPrices = group.rooms || {};
  const packageTotals = group.packageTotals || {};
  const currentPrice =
    getRoomPrice(selectedRoom, roomPrices, packageTotals) || 0;

  // Group hotels by city
  const hotelsByCity = {};

  (group.hotels || []).forEach((hotel) => {
    const city = hotel.city || "Other";

    if (!hotelsByCity[city]) {
      hotelsByCity[city] = [];
    }

    hotelsByCity[city].push(hotel);
  });

  const includesList = ["Visa", "Tickets", "Hotel", "Transport"];

  return (
    <div
      style={{
        backgroundColor: "#f4f7fe",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .detail-grid { grid-template-columns: 1fr !important; }
          .hotel-grid { grid-template-columns: 1fr 1fr !important; }
          .room-grid { grid-template-columns: 1fr 1fr !important; }
          .header-inner { flex-direction: column !important; align-items: flex-start !important; }
          .header-ref { text-align: left !important; }
          .header-schedule { grid-template-columns: 1fr !important; }
          .sticky-col { position: static !important; }
        }

        @media (max-width: 480px) {
          .header-title { font-size: 1.2rem !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
            borderRadius: "14px",
            padding: isMobile ? "14px" : "16px 22px",
            color: "white",
            marginBottom: "12px",
            boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
          }}
        >
          <div
            className="header-inner"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "2px",
                }}
              >
                <Ticket size={16} />
                <h1
                  className="header-title"
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: 800,
                  }}
                >
                  {group.packageName}
                </h1>
              </div>
            </div>

            <div
              className="header-ref"
              style={{
                textAlign: "right",
                background: "rgba(255,255,255,0.2)",
                padding: "8px 16px",
                borderRadius: "10px",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.9 }}>
                Available Rooms
              </p>

              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                {group.availableRooms}
              </h3>

              {group.availableRooms === 0 && (
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "0.7rem",
                    color: "#fca5a5",
                    fontWeight: 600,
                  }}
                >
                  Fully Booked
                </p>
              )}
            </div>
          </div>

          {/* COMPACT FLIGHT SCHEDULE */}
          <div
            style={{
              marginTop: "10px",
              paddingTop: "10px",
              borderTop: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "7px",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                opacity: 0.9,
              }}
            >
              <FaPlaneDeparture size={12} /> Flight Schedule
            </div>

            {group.flights?.length > 0 ? (
              <div
                className="header-schedule"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(group.flights.length, 2)}, minmax(0, 1fr))`,
                  gap: "7px",
                }}
              >
                {group.flights.map((flight, index) => (
                  <HeaderFlightItem
                    key={flight._id || `${flight.flightNo || "flight"}-${index}`}
                    flight={flight}
                  />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "0.78rem", opacity: 0.8 }}>
                No flights available
              </div>
            )}
          </div>

          {/* PACKAGE INCLUDES */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "8px",
            }}
          >
            {includesList.map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "white",
                  background: "rgba(255,255,255,0.15)",
                  padding: "4px 10px",
                  borderRadius: "999px",
                }}
              >
                <FaCheckCircle size={10} /> {item}
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div
          className="detail-grid"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr",
            gap: "12px",
          }}
        >
          {/* LEFT COLUMN */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                height: isMobile ? "140px" : "180px",
                boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
              }}
            >
              <img
                src={
                  group.logo ||
                  "https://matchlesstravels.com/ht/images/7abe905adf02c849f94a5bab1953a92f.jpg"
                }
                alt="Umrah"
                onError={(e) => {
                  e.target.src =
                    "https://matchlesstravels.com/ht/images/7abe905adf02c849f94a5bab1953a92f.jpg";
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            {/* HOTELS */}
            <div
              className="hotel-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {Object.entries(hotelsByCity).map(([city, hotels]) => {
                // Unique hotels by name (case insensitive)
                const uniqueHotels = hotels.reduce((acc, hotel) => {
                  const hotelName = hotel.name?.trim().toLowerCase();
                  if (
                    hotelName &&
                    !acc.some((h) => h.name?.trim().toLowerCase() === hotelName)
                  ) {
                    acc.push(hotel);
                  }
                  return acc;
                }, []);

                return uniqueHotels.map((hotel, index) => (
                  <HotelCard
                    key={hotel._id || `${city}-${hotel.name || index}`}
                    hotel={hotel}
                    city={city}
                  />
                ));
              })}
            </div>

            <div style={cardStyle}>
              <h3
                style={{
                  ...cardTitleStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FaBus size={14} /> Transport Details
              </h3>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {group?.transport?.map((item, index) => (
                  <TransportPill key={index} transport={item} />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div
            className="sticky-col"
            style={{
              position: isMobile ? "static" : "sticky",
              top: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* Price Selection */}
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Select Room & Book</h3>

              {(() => {
                const filteredRooms = roomOrder.filter(
                  (room) =>
                    getRoomPrice(room, roomPrices, packageTotals) !== null,
                );

                const roomLabel = (key) => {
                  if (key === "childWithoutBed") return "Child (No Bed)";
                  if (key === "infant") return "Infant";
                  return key.charAt(0).toUpperCase() + key.slice(1);
                };

                return (
                  <div
                    className="room-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    {filteredRooms.map((room, index) => {
                      const price = getRoomPrice(
                        room,
                        roomPrices,
                        packageTotals,
                      );
                      const isLastOddItem =
                        filteredRooms.length % 2 !== 0 &&
                        index === filteredRooms.length - 1;
                      const requiredSeats = roomCapacityMap[room] || 1;
                      const selectable = isRoomSelectable(
                        room,
                        group.availableRooms || 0,
                      );

                      return (
                        <button
                          key={room}
                          type="button"
                          onClick={() => selectable && setSelectedRoom(room)}
                          disabled={!selectable}
                          title={
                            selectable
                              ? undefined
                              : `Needs ${requiredSeats} available seat${requiredSeats > 1 ? "s" : ""}, only ${group.availableRooms || 0} left`
                          }
                          style={{
                            padding: "8px 10px",
                            borderRadius: "10px",
                            border: `2px solid ${selectedRoom === room
                              ? theme.colors.primary
                              : "#edf2f7"
                              }`,
                            background: !selectable
                              ? "#f4f4f5"
                              : selectedRoom === room
                                ? "#f0f7ff"
                                : "white",
                            cursor: selectable ? "pointer" : "not-allowed",
                            textAlign: "left",
                            transition: "0.2s",
                            gridColumn: isLastOddItem ? "1 / -1" : "auto",
                            opacity: selectable ? 1 : 0.5,
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.68rem",
                              textTransform: "uppercase",
                              color: "#718096",
                              fontWeight: 700,
                            }}
                          >
                            {roomLabel(room)}
                          </div>

                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "0.88rem",
                              color: "#2d3748",
                            }}
                          >
                            Rs.{price?.toLocaleString()}
                          </div>

                          {!selectable && (
                            <div
                              style={{
                                fontSize: "0.62rem",
                                color: "#e53e3e",
                                fontWeight: 600,
                                marginTop: "2px",
                              }}
                            >
                              {group.availableRooms || 0} seat
                              {(group.availableRooms || 0) === 1 ? "" : "s"}{" "}
                              available
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#718096",
                  }}
                >
                  Selected Price
                </span>

                <div
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: theme.colors.success,
                  }}
                >
                  PKR {currentPrice.toLocaleString()}
                </div>
              </div>

              {/* BOOK BUTTON */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "10px",
                }}
              >
                <button
                  onClick={() =>
                    navigate("/dashboard/book-umrah", {
                      state: {
                        packageData: group,
                        selectedRoom: selectedRoom,
                        pricePerPerson: currentPrice,
                      },
                    })
                  }
                  disabled={
                    !group.availableRooms ||
                    group.availableRooms <= 0 ||
                    !isRoomSelectable(selectedRoom, group.availableRooms || 0)
                  }
                  style={{
                    ...priBtn,
                    opacity:
                      !group.availableRooms ||
                        group.availableRooms <= 0 ||
                        !isRoomSelectable(selectedRoom, group.availableRooms || 0)
                        ? 0.5
                        : 1,
                    cursor:
                      !group.availableRooms ||
                        group.availableRooms <= 0 ||
                        !isRoomSelectable(selectedRoom, group.availableRooms || 0)
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {!group.availableRooms || group.availableRooms <= 0
                    ? "Fully Booked"
                    : "Book Now"}
                </button>
              </div>
            </div>

            {/* TRANSPORTS */}
            {group.transports?.length > 0 && (
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}>Transport Details</h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {group.transports.map((transport, index) => (
                    <div
                      key={index}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #edf2f7",
                        borderRadius: "10px",
                        background: "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          marginBottom: "2px",
                          color: "#2d3748",
                        }}
                      >
                        {transport.route}
                      </div>

                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#718096",
                        }}
                      >
                        {transport.transportType} • {transport.supplier}
                      </div>

                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "#a0aec0",
                          marginTop: "2px",
                        }}
                      >
                        {formatDate(transport.startDate)} -{" "}
                        {formatDate(transport.endDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== HOTEL CARD ==================== */
function HotelCard({ hotel, city }) {
  if (!hotel) return null;

  const getCityImage = () => {
    const cityLower = city?.toLowerCase() || "";
    if (cityLower.includes("makkah") || cityLower.includes("mecca")) {
      return "https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png";
    }
    if (
      cityLower.includes("madinah") ||
      cityLower.includes("madina") ||
      cityLower.includes("medina")
    ) {
      return "https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png";
    }
    return "https://static.vecteezy.com/system/resources/previews/024/160/410/non_2x/blank-board-with-shop-store-building-icon-in-peach-and-white-color-vector.jpg";
  };

  const cardStyle = {
    position: "relative",
    width: "100%",
    background: "white",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 3px 8px rgba(0,0,0,0.06)",
    transition: "all 0.2s ease",
    cursor: "pointer",
    border: "1px solid #f1f1f1",
  };

  return (
    <div
      style={cardStyle}
    >
      {/* Top Right Google Map Link */}
      {hotel.mapUrl && (
        <a
          href={hotel.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            background: "white",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            zIndex: 10,
            color: "#1e88e5",
            textDecoration: "none",
            transition: "all 0.2s ease",
          }}
        >
          <FaMapMarkedAlt size={12} />
        </a>
      )}

      {/* City Image + Name */}
      <div style={{ padding: "8px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "6px",
          }}
        >
          <img
            style={{
              height: 26,
              width: 26,
              objectFit: "contain",
              borderRadius: "6px",
              background: "#f8fafc",
            }}
            src={getCityImage()}
            alt={city}
          />
          <h3
            style={{
              margin: 0,
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "#1e2937",
            }}
          >
            {city}
          </h3>
        </div>

        {/* Hotel Name */}
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.8rem",
            lineHeight: "1.25",
            color: "#0f172a",
            marginBottom: "6px",
          }}
        >
          {hotel?.name}
        </div>

        {/* Info Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.72rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              color: "#64748b",
            }}
          >
            <FaStar color="#facc15" size={11} />
            <span style={{ fontWeight: 600, color: "#1e2937" }}>
              {hotel.rating}.0
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ==================== HEADER FLIGHT SCHEDULE ==================== */
function HeaderFlightItem({ flight }) {
  const routeFrom = flight?.sectorFrom || "N/A";
  const routeTo = flight?.sectorTo || "N/A";

  return (
    <div
      style={{
        minWidth: 0,
        padding: "8px 10px",
        borderRadius: "9px",
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.16)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "5px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            minWidth: 0,
            fontSize: "0.8rem",
            fontWeight: 700,
          }}
        >
          <span>{routeFrom}</span>
          <span style={{ opacity: 0.65 }}>→</span>
          <span>{routeTo}</span>
        </div>

        <span
          style={{
            flexShrink: 0,
            padding: "2px 6px",
            borderRadius: "5px",
            background: "rgba(255,255,255,0.18)",
            fontSize: "0.66rem",
            fontWeight: 700,
          }}
        >
          {flight?.flightNo || "N/A"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          fontSize: "0.69rem",
          lineHeight: 1.35,
          opacity: 0.9,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <FaPlaneDeparture size={10} />
          {formatDate(flight?.depDate)}, {formatTime(flight?.depTime)}
        </span>
        <span style={{ opacity: 0.55 }}>→</span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <FaPlaneArrival size={10} />
          {formatDate(flight?.arrDate)}, {formatTime(flight?.arrTime)}
        </span>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  padding: "12px 14px",
  borderRadius: "12px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  border: "1px solid #e2e8f0",
};

function TransportPill({ transport }) {
  if (!transport) return null;

  const getTransportIcon = (type) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("car")) return <FaCar size={16} />;
    return <FaBus size={16} />;
  };

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "7px 10px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flex: 1,
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#f0f7ff";
        e.currentTarget.style.borderColor = "#bfdbfe";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#f8fafc";
        e.currentTarget.style.borderColor = "#e2e8f0";
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          background: "white",
          borderRadius: "7px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#1e2937",
        }}
      >
        {getTransportIcon(transport.transportType)}
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e2937" }}>
          {transport.route}
        </div>
        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
          {transport.transportType} • Private Transport
        </div>
      </div>
    </div>
  );
}

const cardTitleStyle = {
  marginTop: 0,
  marginBottom: "8px",
  fontSize: "0.9rem",
  color: "#1a202c",
  fontWeight: 700,
};

const priBtn = {
  flex: 1,
  background: theme.colors.primary,
  color: "white",
  border: "none",
  padding: "9px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "0.85rem",
  cursor: "pointer",
};
