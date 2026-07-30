import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  X,
  Plus,
  Trash2,
  Scan,
  AlertTriangle,
  Upload,
  Plane,
  Hotel,
  Calendar,
  Clock,
  MapPin,
  Luggage,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import {
  FaPlaneDeparture,
  FaPlaneArrival,
  FaHotel,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaStar as FaStarIcon,
} from "react-icons/fa";
import { theme } from "../../theme/theme";
import { createUmrahBooking } from "../../api/umrahBookingApi";
import { parseMRZ } from "../../utils/parseMRZ";
import { toast } from "react-toastify";

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

const s = {
  label: {
    display: "block",
    marginBottom: "2px",
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "#4a5568",
  },
  input: {
    width: "100%",
    padding: "5px 7px",
    border: "1px solid #cbd5e0",
    borderRadius: "5px",
    fontSize: "0.75rem",
    outline: "none",
    boxSizing: "border-box",
  },
  paxCard: {
    marginBottom: "12px",
    padding: "10px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "8px",
    background: "#f8fafc",
  },
  paxHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    flexWrap: "wrap",
    gap: "6px",
  },
  paxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "6px",
    marginBottom: "6px",
  },
  warn: (bg) => ({
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "4px",
    padding: "4px 7px",
    borderRadius: "5px",
    background: bg,
    border: `1px solid ${bg === "#FEE2E2" ? "#FCA5A5" : "#FCD34D"}`,
  }),
  btn: (bg, disabled) => ({
    padding: "6px 12px",
    background: disabled ? "#cbd5e0" : bg,
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.75rem",
    opacity: disabled ? 0.6 : 1,
  }),
  primary: {
    padding: "10px 20px",
    background: theme.colors.primary,
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  secondary: {
    padding: "8px 20px",
    background: "white",
    color: "#2d3748",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  textarea: {
    width: "100%",
    padding: "6px 8px",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    fontSize: "0.75rem",
    outline: "none",
    minHeight: "50px",
    resize: "vertical",
    boxSizing: "border-box",
  },
  mrzModal: {
    background: "white",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "580px",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  mrzHeader: {
    padding: "18px 22px",
    background: theme.colors.primary,
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mrzBody: { padding: "22px" },
  mrzInfo: {
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: "10px",
    padding: "11px 14px",
    marginBottom: "18px",
    display: "flex",
    gap: "10px",
  },
  mrzTa: {
    width: "100%",
    padding: "11px",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "0.83rem",
    fontFamily: "monospace",
    resize: "vertical",
    outline: "none",
    background: "#F9FAFB",
  },
  mrzErr: {
    marginTop: "7px",
    padding: "9px 11px",
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
  mrzBtns: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    marginTop: "18px",
    flexWrap: "wrap",
  },
  mrzCancel: {
    padding: "9px 18px",
    background: "white",
    color: "#4B5563",
    border: "2px solid #E5E7EB",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
  },
  mrzParse: {
    padding: "9px 22px",
    background: theme.colors.primary,
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },
};

const defaultAdult = {
  type: "Adult",
  title: "Mr",
  givenName: "",
  surName: "",
  passport: "",
  dateOfBirth: "",
  passportExpiry: "",
  nationality: "Pakistan",
  passportFile: null,
  passportFileName: "",
};

const defaultChild = {
  type: "Child",
  title: "Child",
  givenName: "",
  surName: "",
  passport: "",
  dateOfBirth: "",
  passportExpiry: "",
  nationality: "Pakistan",
  passportFile: null,
  passportFileName: "",
};

const defaultInfant = {
  type: "Infant",
  title: "INF",
  givenName: "",
  surName: "",
  passport: "",
  dateOfBirth: "",
  passportExpiry: "",
  nationality: "Pakistan",
  passportFile: null,
  passportFileName: "",
};

export default function UmrahBookingPage({ user }) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const packageData = state?.packageData;
  const selectedRoom = state?.selectedRoom;
  const pricePerPerson = state?.pricePerPerson;
  const childPrice =
    packageData?.packageTotals?.childWithoutBed ||
    packageData?.rooms?.childWithoutPackage ||
    0;
  const infantPrice =
    packageData?.packageTotals?.infant ||
    packageData?.rooms?.InfantWithoutPackage ||
    0;
  const incentive =
    packageData?.packageTotals?.incentive ||
    packageData?.rooms?.IncentiveWithoutPackage ||
    0;

  const [loading, setLoading] = useState(false);
  const [mrzModal, setMrzModal] = useState({
    open: false,
    index: null,
    isChild: false,
  });
  const [mrzInput, setMrzInput] = useState("");
  const [mrzError, setMrzError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Get room capacity (how many pax fit in one room)
  const getRoomCapacity = () => {
    const roomType = selectedRoom?.toLowerCase();
    if (roomType === "double") return 2;
    if (roomType === "triple") return 3;
    if (roomType === "quad") return 4;
    if (roomType === "quint") return 5;
    // sharing: each available room = 1 seat
    return 1;
  };

  const availableRooms = packageData?.availableRooms || 0;
  const roomCapacity = getRoomCapacity();
  const isSharing = selectedRoom?.toLowerCase() === "sharing";

  // Max adults = room capacity for fixed rooms, or availableRooms for sharing
  // Either way, cap at availableRooms (can't book more rooms than available)
  const getMaxAdults = () => {
    if (isSharing) return availableRooms;
    return roomCapacity; // fixed room: exactly roomCapacity adults per booking
  };

  const maxAdults = getMaxAdults();

  const [formData, setFormData] = useState({
    adults: Array(Math.max(1, isSharing ? 1 : roomCapacity))
      .fill(null)
      .map(() => ({ ...defaultAdult })),
    children: [],
    infants: [],
    specialRequests: "",
  });

  const handleAdultChange = (i, field, val) => {
    const adults = [...formData.adults];
    adults[i][field] = val;
    setFormData((f) => ({ ...f, adults }));
  };

  const handleChildChange = (i, field, val) => {
    const children = [...formData.children];
    children[i][field] = val;
    setFormData((f) => ({ ...f, children }));
  };

  const handleInfantChange = (i, field, val) => {
    const infants = [...formData.infants];
    infants[i][field] = val;
    setFormData((f) => ({ ...f, infants }));
  };

  const handlePassportUpload = (type, i, file) => {
    if (!file) return;
    if (type === "adult") {
      const adults = [...formData.adults];
      adults[i].passportFile = file;
      adults[i].passportFileName = file.name;
      setFormData((f) => ({ ...f, adults }));
    } else if (type === "child") {
      const children = [...formData.children];
      children[i].passportFile = file;
      children[i].passportFileName = file.name;
      setFormData((f) => ({ ...f, children }));
    } else if (type === "infant") {
      const infants = [...formData.infants];
      infants[i].passportFile = file;
      infants[i].passportFileName = file.name;
      setFormData((f) => ({ ...f, infants }));
    }
  };

  const addAdult = () => {
    if (!isSharing) {
      toast.warning(
        `${selectedRoom} room requires exactly ${roomCapacity} adult${roomCapacity > 1 ? "s" : ""}. You cannot add more.`,
      );
      return;
    }
    if (formData.adults.length >= maxAdults) {
      toast.warning(
        `Maximum ${maxAdults} seat${maxAdults > 1 ? "s" : ""} available based on ${availableRooms} available room${availableRooms > 1 ? "s" : ""}`,
      );
      return;
    }
    setFormData((f) => ({
      ...f,
      adults: [...f.adults, { ...defaultAdult }],
    }));
  };

  const removeAdult = (i) => {
    if (!isSharing) {
      toast.warning(
        `${selectedRoom} room requires exactly ${roomCapacity} adults. You cannot remove passengers.`,
      );
      return;
    }
    if (formData.adults.length > 1)
      setFormData((f) => ({
        ...f,
        adults: f.adults.filter((_, idx) => idx !== i),
      }));
  };

  const addChild = () => {
    setFormData((f) => ({
      ...f,
      children: [...f.children, { ...defaultChild }],
    }));
  };

  const removeChild = (i) => {
    setFormData((f) => ({
      ...f,
      children: f.children.filter((_, idx) => idx !== i),
    }));
  };

  const addInfant = () => {
    setFormData((f) => ({
      ...f,
      infants: [...f.infants, { ...defaultInfant }],
    }));
  };

  const removeInfant = (i) => {
    setFormData((f) => ({
      ...f,
      infants: f.infants.filter((_, idx) => idx !== i),
    }));
  };

  const getPaxPrice = (p) =>
    p.type === "Infant"
      ? infantPrice
      : p.type === "Child"
        ? childPrice
        : pricePerPerson || 0;

  const adultTotal = formData.adults.length * (pricePerPerson || 0);
  const childrenTotal = formData.children.length * childPrice;
  const infantTotal = formData.infants.length * infantPrice;
  const totalPrice = () => adultTotal + childrenTotal + infantTotal;

  const getAllPassengers = () => [
    ...formData.adults,
    ...formData.children,
    ...formData.infants,
  ];

  const checkExpiry = (d) => {
    if (!d) return null;
    const exp = new Date(d),
      today = new Date(),
      soon = new Date();
    soon.setMonth(today.getMonth() + 7);
    if (exp < today)
      return { type: "expired", message: "Passport has expired" };
    if (exp <= soon)
      return {
        type: "warning",
        message:
          "Passport expires within 7 months - may not be eligible for visa",
      };
    return null;
  };

  const calcAge = (dob) => {
    if (!dob) return "Adult";
    const b = dob instanceof Date ? dob : new Date(dob),
      today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    const md = today.getMonth() - b.getMonth(),
      dd = today.getDate() - b.getDate();
    if (md < 0 || (md === 0 && dd < 0)) age--;
    const months = age * 12 + md + (dd >= 0 ? 0 : -1);
    return months < 24 ? "Infant" : age < 12 ? "Child" : "Adult";
  };

  const fmtDate = (d) =>
    d instanceof Date && !isNaN(d) ? d.toISOString().split("T")[0] : "";

  const handleMrzParse = () => {
    const blocks = mrzInput.trim().split(/\n[ \t]*\n/);
    let results = [];
    if (blocks.length > 1)
      results = blocks.map((b) => parseMRZ(b.trim())).filter(Boolean);
    else {
      const lines = mrzInput
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      for (let i = 0; i + 1 < lines.length; i += 2) {
        const r = parseMRZ(lines[i] + "\n" + lines[i + 1]);
        if (r) results.push(r);
      }
    }
    if (!results.length) {
      setMrzError(
        "Invalid MRZ code. Please paste the complete 2-line MRZ from the passport.",
      );
      return;
    }
    const si = mrzModal.index;
    const isChild = mrzModal.isChild;

    setFormData((prev) => {
      const listKey = isChild
        ? mrzModal.type === "infant"
          ? "infants"
          : "children"
        : "adults";
      const np = [...prev[listKey]];
      results.forEach((r, offset) => {
        const idx = si + offset;
        if (idx >= np.length) return;
        np[idx] = {
          ...np[idx],
          surName: r.surName || np[idx].surName,
          givenName: r.givenName || np[idx].givenName,
          passport: r.passport || np[idx].passport,
          nationality: r.nationality || np[idx].nationality,
          dateOfBirth: fmtDate(r.dateOfBirth) || np[idx].dateOfBirth,
          passportExpiry: fmtDate(r.passportExpiry) || np[idx].passportExpiry,
          title: r.title || np[idx].title,
        };
      });
      return { ...prev, [listKey]: np };
    });
    toast.success(
      `${Math.min(results.length, isChild ? (mrzModal.type === "infant" ? formData.infants.length : formData.children.length) : formData.adults.length - si)} passport(s) scanned!`,
    );
    setMrzModal({ open: false, index: null, isChild: false });
    setMrzInput("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate that all passengers have uploaded passport files
    const allPassengers = getAllPassengers();
    // const missingPassports = allPassengers.filter((p) => !p.passportFile);
    // if (missingPassports.length > 0) {
    //   toast.error("Please upload passport files for all passengers");
    //   return;
    // }

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const confirmAndSubmit = async () => {
    setShowConfirmation(false);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append(
        "packageId",
        packageData._id ||
          packageData.id ||
          packageData.voucher_id ||
          "PKG-" + Date.now(),
      );
      fd.append(
        "packageName",
        packageData.packageName ||
          packageData.title ||
          packageData.name ||
          "Umrah Package",
      );
      fd.append("packageSource", packageData.packageSource || "local-db");
      fd.append("user", user?._id || user || "Guest");
      fd.append("roomType", selectedRoom);
      fd.append("specialRequests", formData.specialRequests);
      fd.append("pricing[pricePerPerson]", pricePerPerson);
      fd.append("pricing[currency]", "PKR");
      fd.append("pricing[incentive]", incentive);
      fd.append("pricing[adultTotal]", adultTotal);
      fd.append("pricing[childTotal]", childrenTotal);
      fd.append("pricing[infantTotal]", infantTotal);
      fd.append("pricing[totalAmount]", totalPrice());
      // For travel-network packages, attach TNT booking fields inside packageData
      let enrichedPackageData = { ...packageData };
      if (packageData.packageSource === "travel-network") {
        enrichedPackageData = {
          ...packageData,
          // TNT IDs — tnt_package_id and tnt_group_id are set by AllGroups mapping from backend
          group_id: packageData.tnt_group_id ?? packageData.group_id ?? packageData.groupId ?? null,
          package_id: packageData.tnt_package_id ?? packageData.package_id ?? null,
          agency_info: {
            agency_name: user?.companyName || "",
            agent_name: user?.name || "",
            created_by_id: user?._id || user || "",
            email: user?.email || "",
            mobile: user?.phone || "",
            adults: formData.adults.length,
            child: formData.children.length,
            infant: formData.infants.length,
            agent_notes: formData.specialRequests || "",
          },
          umrah_package_price_plan: packageData.umrah_package_price_plan ?? {
            id: packageData.price_plan_id ?? packageData.pricePlanId ?? null,
            type: selectedRoom,
            adult: pricePerPerson || 0,
            child: childPrice || 0,
            infant: infantPrice || 0,
          },
        };
      }
      fd.append("packageData", JSON.stringify(enrichedPackageData));

      const allPassengers = getAllPassengers();
      allPassengers.forEach((p, i) => {
        [
          "type",
          "title",
          "givenName",
          "surName",
          "passport",
          "dateOfBirth",
          "passportExpiry",
          "nationality",
        ].forEach((k) => fd.append(`passengers[${i}][${k}]`, p[k]));
        if (p.passportFile)
          fd.append(
            `passportFile_${i}`,
            p.passportFile,
            `passenger-${i}-${p.passportFile.name}`,
          );
      });
      const res = await createUmrahBooking(fd);
      if (res.success) {
        toast.success("Booking submitted! Booking#: " + res.data.bookingNumber);
        setTimeout(() => navigate("/dashboard/umrah-booking"), 1000);
      }
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Render passenger fields
  const renderPaxFields = (pax, i, type, onChange, onRemove) => {
    const expWarn = checkExpiry(pax.passportExpiry);
    const titleOpts =
      type === "adult"
        ? ["Mr", "Mrs", "Ms", "Miss", "Dr"]
        : type === "child"
          ? ["Child"]
          : ["INF"];
    const canRemove = type === "adult" ? isSharing : true;
    const color =
      type === "child" ? "#3B82F6" : type === "infant" ? "#8B5CF6" : "#2d3748";

    return (
      <div
        key={`${type}-${i}`}
        style={{
          ...s.paxCard,
          borderColor: type !== "adult" ? color : "#e2e8f0",
        }}
      >
        <div style={s.paxHeader}>
          <h4
            style={{ margin: 0, color, fontWeight: 600, fontSize: "0.85rem" }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)} {i + 1}
          </h4>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => {
                setMrzModal({
                  open: true,
                  index: i,
                  isChild: type !== "adult",
                  type,
                });
                setMrzInput("");
                setMrzError("");
              }}
              style={s.btn("#3B82F6")}
            >
              <Scan size={12} /> MRZ
            </button>
            {canRemove && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                style={s.btn("#f56565")}
              >
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
        </div>
        <div style={s.paxGrid}>
          {[
            { label: "Title *", key: "title", type: "select", opts: titleOpts },
            {
              label: "Given Name *",
              key: "givenName",
              type: "text",
              placeholder: "First name",
            },
            {
              label: "Surname *",
              key: "surName",
              type: "text",
              placeholder: "Last name",
            },
            {
              label: "Passport *",
              key: "passport",
              type: "text",
              placeholder: "AA1234567",
            },
            { label: "DOB *", key: "dateOfBirth", type: "date" },
            { label: "Nationality *", key: "nationality", type: "text" },
            { label: "Expiry *", key: "passportExpiry", type: "date" },
          ].map(({ label, key, type: inputType, opts, placeholder }) => (
            <div key={key}>
              <label style={s.label}>{label}</label>
              {inputType === "select" ? (
                <select
                  required
                  value={pax[key]}
                  onChange={(e) => onChange(i, key, e.target.value)}
                  style={s.input}
                >
                  {opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={inputType}
                  required
                  value={pax[key]}
                  placeholder={placeholder}
                  onChange={(e) =>
                    onChange(
                      i,
                      key,
                      key === "passport"
                        ? e.target.value.toUpperCase()
                        : e.target.value,
                    )
                  }
                  style={s.input}
                />
              )}
            </div>
          ))}
          <div>
            <label style={s.label}>Passport File</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handlePassportUpload(type, i, e.target.files[0])}
              style={{ display: "none" }}
              id={`pu-${type}-${i}`}
            />
            <label
              htmlFor={`pu-${type}-${i}`}
              style={{
                ...s.input,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                cursor: "pointer",
                color: pax.passportFileName ? "#166534" : "#718096",
                background: pax.passportFileName ? "#F0FDF4" : "white",
                border: pax.passportFileName
                  ? "1px solid #86EFAC"
                  : "1px solid #cbd5e0",
                fontWeight: pax.passportFileName ? 600 : 400,
              }}
            >
              <Upload size={11} />{" "}
              {pax.passportFileName ? "✓ Uploaded" : "Upload"}
            </label>
          </div>
        </div>
        {expWarn && (
          <div
            style={s.warn(expWarn.type === "expired" ? "#FEE2E2" : "#FEF3C7")}
          >
            <AlertTriangle
              size={10}
              color={expWarn.type === "expired" ? "#DC2626" : "#D97706"}
            />
            <span
              style={{
                fontSize: "0.65rem",
                color: expWarn.type === "expired" ? "#DC2626" : "#D97706",
                fontWeight: 500,
              }}
            >
              {expWarn.message}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (!packageData) {
    return (
      <div
        style={{
          padding: "100px",
          textAlign: "center",
          color: theme.colors.textSecondary,
        }}
      >
        <h2>No package data found.</h2>
        <button
          onClick={() => navigate(-1)}
          style={{ ...s.secondary, marginTop: "20px" }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const flights = packageData?.flights || [];
  const hotels = packageData?.hotels || [];
  const pkgName =
    packageData?.packageName || packageData?.title || packageData?.name;

  // Group hotels by city
  const hotelsByCity = {};
  (hotels || []).forEach((hotel) => {
    const city = hotel?.city || "Other";
    if (!hotelsByCity[city]) {
      hotelsByCity[city] = [];
    }
    hotelsByCity[city].push(hotel);
  });

  // Calculate available seats
  const availableFlightSeats =
    flights && flights.length > 0 ? flights[0]?.availableSeats || "N/A" : "N/A";

  // Calculate duration
  const calculateDuration = () => {
    if (packageData?.days) {
      return `${packageData.days} Days`;
    }
    if (flights && flights.length >= 2) {
      const departure = new Date(flights[0]?.depDate);
      const returnFlight = new Date(flights[1]?.depDate);
      const days = Math.ceil(
        (returnFlight - departure) / (1000 * 60 * 60 * 24),
      );
      return days > 0 ? `${days} Days` : "N/A";
    }
    return "N/A";
  };

  return (
    <div
      style={{
        backgroundColor: "#f4f7fe",
        minHeight: "100vh",
        padding: "30px 20px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            background: theme.colors.primary,
            borderRadius: "20px",
            padding: "40px 30px",
            color: "white",
            marginBottom: "30px",
            boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
            textAlign: "center",
            position: "relative",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              ...s.closeBtn,
              display: "flex",
              gap: "8px",
              width: "auto",
              padding: "10px 20px",
              borderRadius: "10px",
            }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: "2.2rem",
              fontWeight: 800,
              letterSpacing: "-0.5px",
            }}
          >
            {packageData?.packageName || "Confirm Your Umrah Package"}
          </h1>
          <p style={{ margin: "0 0 30px 0", opacity: 0.9, fontSize: "1rem" }}>
            Complete your booking details below
          </p>

          {/* Info Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "20px",
              maxWidth: "900px",
              margin: "0 auto",
              padding: "25px",
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: "15px",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  marginBottom: "5px",
                }}
              >
                {packageData.availableRooms}
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  opacity: 0.9,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Available Packages
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  marginBottom: "5px",
                }}
              >
                {packageData.packageDuration}
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  opacity: 0.9,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Duration
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  marginBottom: "5px",
                  textTransform: "capitalize",
                }}
              >
                {selectedRoom}
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  opacity: 0.9,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Accommodation
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 800,
                  marginBottom: "5px",
                }}
              >
                PKR {pricePerPerson?.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  opacity: 0.9,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Per Person
              </div>
            </div>
          </div>
        </div>

        {/* Package Details - 2 Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: "20px",
            marginBottom: "30px",
            alignItems: "start",
          }}
        >
          {/* Flight Details */}
          <div
            style={{
              background: "white",
              padding: "20px",
              height: "100%",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              // height: "fit-content",
            }}
          >
            <h3
              style={{
                margin: "0 0 18px 0",
                fontSize: "1.2rem",
                color: "#1a202c",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <FaPlaneDeparture color={theme.colors.primary} /> Flight Details
              {packageData?.flightLogo && (
                <img
                  src={packageData.flightLogo}
                  alt="Flight Logo"
                  style={{
                    height: "30px",
                    width: "auto",
                    objectFit: "contain",
                    marginLeft: "auto",
                  }}
                />
              )}
            </h3>

            {flights && flights.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "15px",
                }}
              >
                {flights.map((flight, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "14px",
                      background: "#f8fafc",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      minHeight: "150px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#a0aec0",
                          textTransform: "uppercase",
                          marginBottom: "8px",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {index === 0 ? "Departure" : "Return"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: "#2d3748",
                            fontSize: "0.95rem",
                          }}
                        >
                          {formatDate(flight.depDate)}
                        </span>

                        <span
                          style={{
                            fontSize: "0.75rem",
                            background: "#edf2f7",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            whiteSpace: "nowrap",
                            fontWeight: 600,
                          }}
                        >
                          {flight.flightNo}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "0.88rem",
                          color: "#4a5568",
                          lineHeight: "1.5",
                          marginBottom: "8px",
                        }}
                      >
                        {flight.depTime} • {flight.sectorFrom} →{" "}
                        {flight.sectorTo}
                      </div>

                      {(flight.fromTerminal || flight.toTerminal) && (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#718096",
                            marginBottom: "5px",
                          }}
                        >
                          {flight.fromTerminal} → {flight.toTerminal}
                        </div>
                      )}

                      {flight.arrDate && (
                        <div
                          style={{
                            fontSize: "0.82rem",
                            color: "#718096",
                            marginTop: "5px",
                          }}
                        >
                          Arrival: {formatDate(flight.arrDate)} {flight.arrTime}
                        </div>
                      )}

                      {/* Flight Details: Class, Baggage, Meal */}
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        {flight.flightClass && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "#EFF6FF",
                              color: "#1E40AF",
                              padding: "3px 8px",
                              borderRadius: "5px",
                              fontWeight: 600,
                            }}
                          >
                            {flight.flightClass}
                          </span>
                        )}
                        {flight.baggage && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "#F0FDF4",
                              color: "#166534",
                              padding: "3px 8px",
                              borderRadius: "5px",
                              fontWeight: 600,
                            }}
                          >
                            {flight.baggage}kg
                          </span>
                        )}
                        {flight.meal && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "#FEF3C7",
                              color: "#92400E",
                              padding: "3px 8px",
                              borderRadius: "5px",
                              fontWeight: 600,
                            }}
                          >
                            Meal: {flight.meal}
                          </span>
                        )}
                      </div>
                    </div>

                    {flight.availableSeats !== undefined && (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: theme.colors.success,
                          marginTop: "12px",
                          fontWeight: 600,
                          background: "#f0fff4",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          width: "fit-content",
                        }}
                      >
                        {flight.availableSeats} seats available
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#718096" }}>
                No flight information available
              </p>
            )}
          </div>

          {/* Accommodation Details */}
          <div
            style={{
              background: "white",
              padding: "20px",
              height: "100%",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3
              style={{
                margin: "0 0 18px 0",
                fontSize: "1.2rem",
                color: "#1a202c",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <FaHotel color={theme.colors.primary} /> Accommodation Details
            </h3>

            {Object.entries(hotelsByCity).length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "15px",
                }}
              >
                {Object.entries(hotelsByCity).map(([city, cityHotels]) => {
                  // Unique hotels by name (case insensitive)
                  const uniqueHotels = cityHotels.reduce((acc, hotel) => {
                    const hotelName = hotel.name?.trim().toLowerCase();
                    if (
                      hotelName &&
                      !acc.some(
                        (h) => h.name?.trim().toLowerCase() === hotelName,
                      )
                    ) {
                      acc.push(hotel);
                    }
                    return acc;
                  }, []);

                  return uniqueHotels.map((hotel, index) => (
                    <div
                      key={hotel._id || `${city}-${hotel.name || index}`}
                      style={{
                        padding: "14px",
                        background: "#f8fafc",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        minHeight: "140px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <img
                            style={{
                              height: 45,
                              width: 45,
                              objectFit: "contain",
                            }}
                            src={
                              city?.toLowerCase().includes("makkah") ||
                              city?.toLowerCase().includes("mecca")
                                ? "https://www.mtctutorials.com/wp-content/uploads/2022/06/Kaaba-High-Quality-PNG-Image-1.png"
                                : city?.toLowerCase().includes("madinah") ||
                                    city?.toLowerCase().includes("madina") ||
                                    city?.toLowerCase().includes("medina")
                                  ? "https://png.pngtree.com/png-clipart/20220616/original/pngtree-prophet-mohammad-madina-or-madinah-nabawi-mosque-masjid-milad-un-nabi-png-image_8081426.png"
                                  : "https://static.vecteezy.com/system/resources/previews/024/160/410/non_2x/blank-board-with-shop-store-building-icon-in-peach-and-white-color-vector.jpg"
                            }
                            alt={city}
                          />

                          <h4
                            style={{
                              margin: 0,
                              fontSize: "1rem",
                              fontWeight: 700,
                              color: "#2d3748",
                            }}
                          >
                            {city}
                          </h4>
                        </div>

                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "0.92rem",
                            marginBottom: "10px",
                            color: "#2d3748",
                            lineHeight: "1.4",
                          }}
                        >
                          {hotel.name}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                          fontSize: "0.82rem",
                          color: "#718096",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#fff",
                            padding: "5px 8px",
                            borderRadius: "8px",
                          }}
                        >
                          <FaMapMarkerAlt /> {hotel?.distance}m
                        </span>

                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#fff",
                            padding: "5px 8px",
                            borderRadius: "8px",
                          }}
                        >
                          <FaStarIcon color="#ecc94b" /> {hotel.rating}.0
                        </span>
                      </div>
                    </div>
                  ));
                })}
              </div>
            ) : (
              <p style={{ color: "#718096" }}>
                No accommodation information available
              </p>
            )}
          </div>

          {/* Transport Details */}
          {packageData?.transports && packageData.transports.length > 0 && (
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                border: "1px solid #e2e8f0",
                height: "fit-content",
              }}
            >
              <h3
                style={{
                  margin: "0 0 18px 0",
                  fontSize: "1.2rem",
                  color: "#1a202c",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <FaCheckCircle color={theme.colors.primary} /> Transport Details
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "15px",
                }}
              >
                {packageData.transports.map((transport, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "14px",
                      background: "#f8fafc",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      minHeight: "120px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.92rem",
                        marginBottom: "10px",
                        color: "#2d3748",
                      }}
                    >
                      {transport.route}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        fontSize: "0.8rem",
                        color: "#718096",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#4a5568" }}>Type:</strong>{" "}
                        {transport.transportType}
                      </div>
                      <div>
                        <strong style={{ color: "#4a5568" }}>Supplier:</strong>{" "}
                        {transport.supplier}
                      </div>
                      {transport.startDate && transport.endDate && (
                        <div
                          style={{
                            marginTop: "5px",
                            fontSize: "0.75rem",
                            color: "#718096",
                          }}
                        >
                          {formatDate(transport.startDate)} →{" "}
                          {formatDate(transport.endDate)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
            }}
          >
            {/* Adults Section */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  color: "#1a202c",
                  fontWeight: 700,
                }}
              >
                Adult Passengers ({formData.adults.length})
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 400,
                    color: "#718096",
                    marginLeft: "8px",
                  }}
                >
                  (
                  {isSharing
                    ? `Max: ${maxAdults} seat${maxAdults !== 1 ? "s" : ""} — ${availableRooms} room${availableRooms !== 1 ? "s" : ""} available`
                    : `${selectedRoom} room: exactly ${roomCapacity} adult${roomCapacity > 1 ? "s" : ""} required`}
                  )
                </span>
              </h3>
              {isSharing && (
                <button
                  type="button"
                  onClick={addAdult}
                  style={s.btn("#48bb78", formData.adults.length >= maxAdults)}
                  disabled={formData.adults.length >= maxAdults}
                >
                  <Plus size={13} /> Add Adult
                </button>
              )}
            </div>

            {formData.adults.map((pax, i) =>
              renderPaxFields(pax, i, "adult", handleAdultChange, removeAdult),
            )}

            {/* Children/Infants Section */}
            <div
              style={{
                marginTop: "25px",
                paddingTop: "20px",
                borderTop: "2px solid #e2e8f0",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "1rem",
                  color: "#1a202c",
                  fontWeight: 700,
                }}
              >
                Add Child / Infant
              </h3>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "15px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={addChild}
                  style={s.btn("#3B82F6")}
                >
                  <Plus size={13} /> Child (PKR {childPrice.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={addInfant}
                  style={s.btn("#8B5CF6")}
                >
                  <Plus size={13} /> Infant (PKR {infantPrice.toLocaleString()})
                </button>
              </div>

              {formData.children.map((pax, i) =>
                renderPaxFields(
                  pax,
                  i,
                  "child",
                  handleChildChange,
                  removeChild,
                ),
              )}
              {formData.infants.map((pax, i) =>
                renderPaxFields(
                  pax,
                  i,
                  "infant",
                  handleInfantChange,
                  removeInfant,
                ),
              )}
            </div>

            <div style={{ marginTop: "15px" }}>
              <label
                style={{ ...s.label, fontSize: "0.75rem", marginBottom: "4px" }}
              >
                Special Requests (Optional)
              </label>
              <textarea
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData((f) => ({
                    ...f,
                    specialRequests: e.target.value,
                  }))
                }
                style={s.textarea}
                placeholder="Any special requests or notes..."
              />
            </div>
          </div>

          {/* Package Summary */}
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
            }}
          >
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "1.05rem",
                color: "#1a202c",
                fontWeight: 700,
                borderBottom: "1.5px solid #e2e8f0",
                paddingBottom: "10px",
              }}
            >
              Package Summary
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: "0.8rem",
                  color: "#4a5568",
                }}
              >
                <span>Package:</span>
                <strong style={{ textTransform: "capitalize" }}>
                  {pkgName}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: "0.8rem",
                  color: "#4a5568",
                }}
              >
                <span>Room Type:</span>
                <strong style={{ textTransform: "capitalize" }}>
                  {selectedRoom}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: "0.8rem",
                  color: "#4a5568",
                }}
              >
                <span>Adult Price:</span>
                <strong>PKR {pricePerPerson?.toLocaleString()}</strong>
              </div>
              {formData.children.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    fontSize: "0.8rem",
                    color: "#4a5568",
                  }}
                >
                  <span>Child Price:</span>
                  <strong>PKR {childPrice.toLocaleString()}</strong>
                </div>
              )}
              {formData.infants.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    fontSize: "0.8rem",
                    color: "#4a5568",
                  }}
                >
                  <span>Infant Price:</span>
                  <strong>PKR {infantPrice.toLocaleString()}</strong>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: "0.8rem",
                  color: "#4a5568",
                }}
              >
                <span>Total Passengers:</span>
                <strong>
                  {formData.adults.length +
                    formData.children.length +
                    formData.infants.length}
                </strong>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "10px",
                  padding: "10px 0",
                  marginTop: "8px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ color: "#4a5568", fontSize: "0.75rem" }}>
                    Adults
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "6px",
                      fontWeight: 700,
                      color: "#1f2937",
                    }}
                  >
                    <span>{formData.adults.length}</span>
                    <span>PKR {adultTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ color: "#4a5568", fontSize: "0.75rem" }}>
                    Children
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "6px",
                      fontWeight: 700,
                      color: "#1f2937",
                    }}
                  >
                    <span>{formData.children.length}</span>
                    <span>PKR {childrenTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    padding: "12px",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ color: "#4a5568", fontSize: "0.75rem" }}>
                    Infants
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "6px",
                      fontWeight: 700,
                      color: "#1f2937",
                    }}
                  >
                    <span>{formData.infants.length}</span>
                    <span>PKR {infantTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Passenger Breakdown */}
              <div
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#2d3748",
                  }}
                >
                  Passengers
                </h4>
                {formData.adults.map((p, i) => (
                  <div
                    key={`adult-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "5px 0",
                      fontSize: "0.75rem",
                      color: "#718096",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#2d3748" }}>
                        {i + 1}. {p.title}. {p.givenName} {p.surName}
                      </strong>
                      <div style={{ fontSize: "0.68rem", marginTop: "1px" }}>
                        Adult | Passport: {p.passport || "Not provided"}
                      </div>
                    </div>
                    <strong style={{ whiteSpace: "nowrap", color: "#2d3748" }}>
                      PKR {pricePerPerson?.toLocaleString()}
                    </strong>
                  </div>
                ))}
                {formData.children.map((p, i) => (
                  <div
                    key={`child-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "5px 0",
                      fontSize: "0.75rem",
                      color: "#718096",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#3B82F6" }}>
                        {formData.adults.length + i + 1}. {p.title}.{" "}
                        {p.givenName} {p.surName}
                      </strong>
                      <div style={{ fontSize: "0.68rem", marginTop: "1px" }}>
                        Child | Passport: {p.passport || "Not provided"}
                      </div>
                    </div>
                    <strong style={{ whiteSpace: "nowrap", color: "#3B82F6" }}>
                      PKR {childPrice.toLocaleString()}
                    </strong>
                  </div>
                ))}
                {formData.infants.map((p, i) => (
                  <div
                    key={`infant-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "5px 0",
                      fontSize: "0.75rem",
                      color: "#718096",
                    }}
                  >
                    <div>
                      <strong style={{ color: "#8B5CF6" }}>
                        {formData.adults.length +
                          formData.children.length +
                          i +
                          1}
                        . {p.title}. {p.givenName} {p.surName}
                      </strong>
                      <div style={{ fontSize: "0.68rem", marginTop: "1px" }}>
                        Infant | Passport: {p.passport || "Not provided"}
                      </div>
                    </div>
                    <strong style={{ whiteSpace: "nowrap", color: "#8B5CF6" }}>
                      PKR {infantPrice.toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0 0",
                  marginTop: "10px",
                  borderTop: "1.5px solid #e2e8f0",
                }}
              >
                <span style={{ fontSize: "1rem", fontWeight: 600 }}>
                  Total Amount:
                </span>
                <strong
                  style={{
                    fontSize: "1.3rem",
                    color: theme.colors.success,
                    fontWeight: 800,
                  }}
                >
                  PKR {totalPrice().toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div
            style={{ display: "flex", justifyContent: "center", gap: "12px" }}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={s.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || availableRooms <= 0}
              style={{
                ...s.primary,
                opacity: loading || availableRooms <= 0 ? 0.6 : 1,
                cursor:
                  loading || availableRooms <= 0 ? "not-allowed" : "pointer",
              }}
            >
              {loading
                ? "Submitting..."
                : availableRooms <= 0
                  ? "No Rooms Available"
                  : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>

      {/* MRZ Modal */}
      {mrzModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setMrzModal({ open: false, index: null })}
        >
          <div style={s.mrzModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.mrzHeader}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Scan Passport MRZ
              </h3>
              <button
                onClick={() => setMrzModal({ open: false, index: null })}
                style={s.closeBtn}
              >
                <X size={20} />
              </button>
            </div>
            <div style={s.mrzBody}>
              <div style={s.mrzInfo}>
                <Scan size={18} color="#3B82F6" />
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#1E40AF" }}>
                  Paste the 2-line MRZ code from the passport. You can paste
                  multiple passports separated by blank lines.
                </p>
              </div>
              <textarea
                value={mrzInput}
                onChange={(e) => {
                  setMrzInput(e.target.value);
                  setMrzError("");
                }}
                placeholder="P<PAKDOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<&#10;AA1234567<0PAK8901015M3012319<<<<<<<<<<<<08"
                style={s.mrzTa}
                rows={8}
              />
              {mrzError && (
                <div style={s.mrzErr}>
                  <AlertTriangle size={14} color="#DC2626" />
                  <span style={{ fontSize: "0.8rem", color: "#DC2626" }}>
                    {mrzError}
                  </span>
                </div>
              )}
              <div style={s.mrzBtns}>
                <button
                  onClick={() => setMrzModal({ open: false, index: null })}
                  style={s.mrzCancel}
                >
                  Cancel
                </button>
                <button onClick={handleMrzParse} style={s.mrzParse}>
                  <Scan size={16} /> Parse MRZ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setShowConfirmation(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "550px",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "25px 30px",
                background: theme.colors.primary,
                color: "white",
                textAlign: "center",
              }}
            >
              <CheckCircle
                size={48}
                style={{ marginBottom: "10px", margin: "auto" }}
              />
              <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>
                Confirm Your Booking
              </h3>
            </div>
            <div style={{ padding: "30px" }}>
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "1rem",
                  color: "#4a5568",
                  textAlign: "center",
                }}
              >
                Please review your booking details before confirming:
              </p>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "20px",
                  borderRadius: "12px",
                  marginBottom: "25px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#718096" }}>Package:</span>
                  <strong style={{ color: "#2d3748" }}>{pkgName}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#718096" }}>Room Type:</span>
                  <strong
                    style={{ color: "#2d3748", textTransform: "capitalize" }}
                  >
                    {selectedRoom}
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#718096" }}>Total Passengers:</span>
                  <strong style={{ color: "#2d3748" }}>
                    {formData.adults.length +
                      formData.children.length +
                      formData.infants.length}
                    {" ("}
                    {formData.adults.length} Adults
                    {formData.children.length > 0 &&
                      `, ${formData.children.length} Children`}
                    {formData.infants.length > 0 &&
                      `, ${formData.infants.length} Infants`}
                    {")"}
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "15px",
                    marginTop: "15px",
                    borderTop: "2px solid #e2e8f0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "#2d3748",
                    }}
                  >
                    Total Amount:
                  </span>
                  <strong
                    style={{
                      fontSize: "1.3rem",
                      color: theme.colors.success,
                      fontWeight: 800,
                    }}
                  >
                    PKR {totalPrice().toLocaleString()}
                  </strong>
                </div>
              </div>

              <p
                style={{
                  margin: "0 0 25px 0",
                  fontSize: "0.9rem",
                  color: "#718096",
                  textAlign: "center",
                }}
              >
                By confirming, you agree that all information provided is
                correct and complete.
              </p>

              <div style={{ display: "flex", gap: "15px" }}>
                <button
                  onClick={() => setShowConfirmation(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "white",
                    color: "#4a5568",
                    border: "2px solid #e2e8f0",
                    borderRadius: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.95rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAndSubmit}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: theme.colors.primary,
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.95rem",
                  }}
                >
                  Confirm & Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
