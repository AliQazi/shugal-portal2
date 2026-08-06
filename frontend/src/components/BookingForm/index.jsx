import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axiosInstance from "../../api/axios";
import { toast } from "react-toastify";
import { buildPassengers, mapPassengerIndices } from "../../utils/passengerBuilder";
import MaskedDatePicker from "../MaskedDatePicker";
import {
  X,
  CheckCircle,
  Users,
  Calendar,
  Plane,
  CreditCard,
  Upload,
  Scan,
  User,
  Mail,
  Phone,
} from "lucide-react";
import TopBar from "../TopBar/TopBar";
import { parseMRZ } from "../../utils/parseMRZ";
import { scanPassportImageForMrz } from "../../utils/passportImageOcr";
import countryCodes from "../../data/countryCodes.json";
import { theme } from "../../theme/theme";

const nationalityOptions = countryCodes
  .map((item) => item.country)
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b));

export default function BookingForm({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: bookingId } = useParams();
  const isEditMode = !!bookingId;

  const [dbMargin, setDbMargin] = useState(null);

  useEffect(() => {
    axiosInstance
      .get("/sector/getMargin")
      .then((res) => {
        if (res.data?.success) setDbMargin(res.data.data);
      })
      .catch(() => { });
  }, []);

  const calculateB2BPrice = (groupPrice, group = {}) => {
    if (!user) return groupPrice;
    if (user?.priceOnCall) return null;

    let finalPrice = groupPrice;

    const marginType = user.marginType;
    const marginPercent = user.flightMarginPercent;
    const marginAmount = user.flightMarginAmount;

    if (marginType === "Percentage" && marginPercent > 0) {
      finalPrice = groupPrice + (groupPrice * marginPercent) / 100;
    } else if (marginType === "Amount" && marginAmount > 0) {
      finalPrice = groupPrice + marginAmount;
    }

    if (finalPrice === groupPrice) {
      const indMargin = group?.individualMargin;
      if (indMargin !== null && indMargin !== undefined) {
        finalPrice = groupPrice + indMargin;
      }
    }

    if (finalPrice === groupPrice && dbMargin) {
      if (dbMargin.type === "percent" && dbMargin.value > 0) {
        finalPrice = groupPrice + (groupPrice * dbMargin.value) / 100;
      } else if (dbMargin.type === "amount" && dbMargin.value > 0) {
        finalPrice = groupPrice + dbMargin.value;
      }
    }

    return Math.round(finalPrice);
  };

  const [formData, setFormData] = useState({
    contactPersonName: "N/A",
    adults: 1,
    children: 0,
    infants: 0,
    passengers: [],
  });

  const [bookingList, setBookingList] = useState([]);
  const [bookedSeatsMap, setBookedSeatsMap] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(isEditMode);
  const [groupData, setGroupData] = useState(location.state?.groupData || null);
  console.log(groupData);

  const [skypassLiveSeatCount, setSkypassLiveSeatCount] = useState(null);

  const [mrzModal, setMrzModal] = useState({ open: false, index: null });
  const [mrzInput, setMrzInput] = useState("");
  const [mrzError, setMrzError] = useState("");
  const [pendingDocs, setPendingDocs] = useState({});
  const [scanningDocIndex, setScanningDocIndex] = useState(null);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isReviewed, setIsReviewed] = useState(false);

  const [passportExpiryErrors, setPassportExpiryErrors] = useState({});

  useEffect(() => {
    fetchBookingVoucher();
  }, []);

  useEffect(() => {
    const ticketId = groupData?._skypassTicketId;
    if (!ticketId) return;
    const openSeatsSlot =
      groupData?._skypass?.open_seats_slot ??
      groupData?.available_no_of_pax ??
      0;
    axiosInstance
      .post("/sector/holdSkyPassSeats", {
        ticketId,
        quantity: openSeatsSlot,
        openSeatsSlot,
      })
      .then((res) => {
        if (res.data?.bal_seats !== null && res.data?.bal_seats !== undefined) {
          setSkypassLiveSeatCount(res.data.bal_seats);
          setGroupData((prev) => ({
            ...prev,
            available_no_of_pax: res.data.bal_seats,
          }));
        }
      })
      .catch(() => { });
  }, [groupData?._skypassTicketId]);

  useEffect(() => {
    if (isEditMode && bookingId) {
      fetchBookingForEdit();
      fetchBookingVoucher();
    }
  }, [bookingId, isEditMode]);

  const fetchBookingVoucher = async () => {
    try {
      const res = await axiosInstance.get("/bookings/");
      const map = {};

      res.data.data.forEach((booking) => {
        const passengersLength = booking.passengers?.length || 0;
        if (booking.status !== "cancelled") {
          booking.flights?.forEach((flight) => {
            const flightNo = flight.flightNo
              ?.toUpperCase()
              .replace("-", "")
              .trim();
            const depDate = new Date(flight.depDate)
              .toISOString()
              .split("T")[0];
            const key = `${flightNo}_${depDate}`;
            map[key] = (map[key] || 0) + passengersLength;
          });
        }
      });
      setBookedSeatsMap(map);
    } catch (err) {
      console.error("Error fetching seat map:", err);
    }
  };

  const fetchBookingForEdit = async () => {
    try {
      setLoadingBooking(true);
      const response = await axiosInstance.get(`/bookings/${bookingId}`);

      if (response.data.success) {
        let booking = response.data.data;
        if (Array.isArray(booking)) {
          if (booking.length === 0) {
            toast.error("Booking not found");
            navigate("/dashboard/my-bookings");
            return;
          }
          booking = booking[0];
        }

        if (booking.status !== "on hold") {
          toast.error("Can only edit pending bookings");
          navigate("/dashboard/my-bookings");
          return;
        }

        let availableSeats = 0;
        const isLocalGroup = /^[0-9a-fA-F]{24}$/.test(booking.groupId);
        if (isLocalGroup) {
          try {
            const groupRes = await axiosInstance.get(
              `/group-ticketing/${booking.groupId}`,
            );
            if (groupRes.data.success) {
              availableSeats = groupRes.data.data.totalSeats ?? 0;
            }
          } catch {
            // non-fatal — leave as 0
          }
        }

        const reconstructedGroupData = {
          id: booking.groupId,
          type: booking.groupType,
          airline: {
            id: booking.airline?.id || null,
            airline_name: booking.airline?.name || "",
            logo_url: booking.airline?.logoUrl || "",
          },
          sector: booking.sector,
          pnr: booking.pnr,
          price: booking.pricing?.adultPrice || 0,
          childPrice: booking.pricing?.childPrice || 0,
          infantPrice: booking.pricing?.infantPrice || 0,
          dept_date: booking.departureDate,
          arv_date: booking.arrivalDate,
          details:
            booking.flights?.map((flight) => ({
              flight_no: flight.flightNo,
              flight_date: flight.flightDate,
              dep_date: flight.depDate,
              dept_time: flight.depTime,
              origin: flight.origin,
              destination: flight.destination,
              arv_date: flight.arrDate,
              arv_time: flight.arrTime,
              baggage: flight.baggage,
              meal: flight.meal,
            })) || [],
          available_no_of_pax: availableSeats,
        };

        setGroupData(reconstructedGroupData);

        const formattedPassengers =
          booking.passengers?.map((passenger) => ({
            ...passenger,
            dateOfBirth: passenger.dateOfBirth
              ? new Date(passenger.dateOfBirth)
              : "",
            passportExpiry: passenger.passportExpiry
              ? new Date(passenger.passportExpiry)
              : "",
            passportIssue: passenger.passportIssue
              ? new Date(passenger.passportIssue)
              : "",
            documentUrl: passenger.documentUrl || "",
          })) || [];

        setFormData({
          contactPersonName: booking.contactPersonName || "N/A",
          adults: booking.adultsCount,
          children: booking.childrenCount,
          infants: booking.infantsCount,
          passengers: formattedPassengers,
        });

        formattedPassengers.forEach((passenger, index) => {
          if (passenger.passportExpiry) {
            validatePassportExpiry(index, passenger.passportExpiry);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast.error("Failed to load booking");
      navigate("/dashboard/my-bookings");
    } finally {
      setLoadingBooking(false);
    }
  };

  const adultsCount = parseInt(formData.adults) || 0;
  const childrenCount = parseInt(formData.children) || 0;
  const infantsCount = parseInt(formData.infants) || 0;

  const totalPassengers = adultsCount + childrenCount + infantsCount;
  const totalSeatPassengers = adultsCount + childrenCount;

  const isChildPriceAvailable = () => {
    const price = groupData?.childPrice;
    return price !== null && price !== undefined && price !== 0;
  };

  const isInfantPriceAvailable = () => {
    const price = groupData?.infantPrice;
    return price !== null && price !== undefined && price !== 0;
  };

  useEffect(() => {
    const nextAdults = +formData.adults || 0;
    const nextChildren = +formData.children || 0;
    const nextInfants = +formData.infants || 0;

    // Row-keyed state (uploaded docs, expiry errors, an in-flight OCR scan,
    // an open MRZ-scan modal) must be remapped in lockstep with
    // buildPassengers() below, or it silently attaches to the wrong
    // passenger once counts change and the array is reshaped.
    const indexMap = mapPassengerIndices({
      existing: formData.passengers,
      adults: nextAdults,
      children: nextChildren,
      infants: nextInfants,
      allowChildren: true,
      allowInfants: true,
    });

    const remapByIndex = (state) => {
      const next = {};
      Object.entries(state).forEach(([key, value]) => {
        const newIndex = indexMap.get(Number(key));
        if (newIndex !== undefined) next[newIndex] = value;
      });
      return next;
    };

    setPendingDocs((prev) => remapByIndex(prev));
    setPassportExpiryErrors((prev) => remapByIndex(prev));
    setScanningDocIndex((prev) =>
      prev === null ? null : indexMap.get(prev) ?? null,
    );
    setMrzModal((prev) => {
      if (!prev.open || prev.index === null) return prev;
      const mapped = indexMap.get(prev.index);
      return mapped === undefined
        ? { open: false, index: null }
        : { ...prev, index: mapped };
    });

    setFormData((prev) => ({
      ...prev,
      passengers: buildPassengers({
        adults: +prev.adults || 0,
        children: +prev.children || 0,
        infants: +prev.infants || 0,
        existing: prev.passengers,
        allowChildren: true,
        allowInfants: true,
      }),
    }));
  }, [formData.adults, formData.children, formData.infants, isEditMode]);

  const formatDate = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDateInputValue = (date) => {
    if (!date) return "";
    if (typeof date === "object" && date.$date) return date.$date;
    return date;
  };

  const getDateOnly = (date) => {
    const value = getDateInputValue(date);
    if (!value) return "";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    return formatDate(value) || "";
  };

  const addDaysToDate = (date, days) => {
    const dateOnly = getDateOnly(date);
    if (!dateOnly) return "";
    const [year, month, day] = dateOnly.split("-").map(Number);
    const nextDate = new Date(year, month - 1, day);
    nextDate.setDate(nextDate.getDate() + days);
    return formatDate(nextDate);
  };

  const getTimeMinutes = (time) => {
    const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const getResolvedFlightArrivalDate = (flight) => {
    const depDate = getDateOnly(
      flight.dep_date || flight.depDate || flight.flight_date,
    );
    const arrDate = getDateOnly(flight.arv_date || flight.arrDate) || depDate;
    const depMinutes = getTimeMinutes(flight.dept_time || flight.depTime);
    const arrMinutes = getTimeMinutes(flight.arv_time || flight.arrTime);

    if (
      depDate &&
      arrDate === depDate &&
      depMinutes !== null &&
      arrMinutes !== null &&
      arrMinutes < depMinutes
    ) {
      return addDaysToDate(depDate, 1);
    }

    return arrDate;
  };

  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return "";
    if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString("en-GB");
    }
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate)) {
      return parsedDate.toLocaleDateString("en-GB");
    }
    return dateValue;
  };

  const validatePassengerInput = (name, value) => {
    if (value === "") return true;
    const numValue = parseInt(value);
    if (numValue < 0) return false;
    if (name === "adults" && numValue === 0) return false;
    return true;
  };

  const getDefaultPassengerValue = (name) => {
    return name === "adults" ? 1 : 0;
  };

  const validateSeatLimit = (adults, children) => {
    if (isEditMode) return true;
    const totalSeats = adults + children;
    const availableSeats = groupData?.available_no_of_pax || 0;
    return totalSeats <= availableSeats;
  };

  const validateInfantLimit = (adults, infants) => {
    return infants <= adults;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (["adults", "children", "infants"].includes(name)) {
      if (!validatePassengerInput(name, value)) {
        return;
      }
    }

    const updated = {
      ...formData,
      [name]: value,
    };

    const adults = parseInt(updated.adults || 0);
    const children = parseInt(updated.children || 0);
    const infants = parseInt(updated.infants || 0);

    if (!validateInfantLimit(adults, infants)) {
      toast.error(
        `Infants cannot be greater than adults. Max infants allowed: ${adults}`,
      );
      return;
    }

    const totalSeatsRequired = adults + children;
    const availableSeats = groupData?.available_no_of_pax || 0;

    if (!isEditMode && totalSeatsRequired > availableSeats) {
      toast.error("No seats available. You cannot exceed available seats.");
      return;
    }

    setFormData(updated);
  };

  const handlePassengerBlur = (e) => {
    const { name, value } = e.target;
    if (!["adults", "children", "infants"].includes(name)) return;

    if (
      value === "" ||
      parseInt(value) < 0 ||
      (name === "adults" && parseInt(value) === 0)
    ) {
      const defaultValue = getDefaultPassengerValue(name);
      setFormData((prev) => ({ ...prev, [name]: defaultValue }));
      return;
    }

    const adults =
      name === "adults" ? parseInt(value) : parseInt(formData.adults) || 0;
    const children =
      name === "children" ? parseInt(value) : parseInt(formData.children) || 0;
    const infants =
      name === "infants" ? parseInt(value) : parseInt(formData.infants) || 0;

    if (!validateInfantLimit(adults, infants)) {
      toast.error(
        `Infants cannot be greater than adults. Max infants allowed: ${adults}`,
      );
      setFormData((prev) => ({ ...prev, infants: adults }));
      return;
    }

    if (!isEditMode && (name === "adults" || name === "children")) {
      if (!validateSeatLimit(adults, children)) {
        const totalSeats = adults + children;
        const availableSeats = groupData?.available_no_of_pax || 0;
        toast.error(
          `Seats not available! You selected ${totalSeats} seats but only ${availableSeats} are available.`,
          { toastId: "seat-limit-error" },
        );
        const defaultValue = getDefaultPassengerValue(name);
        setFormData((prev) => ({ ...prev, [name]: defaultValue }));
        e.target.focus();
      }
    }
  };

  const handlePassengerChange = (index, field, value) => {
    setFormData((prev) => {
      const newPassengers = [...prev.passengers];
      newPassengers[index] = { ...newPassengers[index], [field]: value };
      return { ...prev, passengers: newPassengers };
    });

    if (field === "passportExpiry") {
      validatePassportExpiry(index, value);
    }
  };

  const validatePassportExpiry = (index, expiryDate) => {
    if (!expiryDate) {
      setPassportExpiryErrors((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      return;
    }

    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);
    const expiry = new Date(expiryDate);

    if (expiry <= sixMonthsFromNow) {
      setPassportExpiryErrors((prev) => ({
        ...prev,
        [index]: `Passport must be valid for at least 6 months from today (until ${sixMonthsFromNow.toLocaleDateString(
          "en-GB",
        )})`,
      }));
    } else {
      setPassportExpiryErrors((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

  const findNationalityMatch = (value) => {
    const typed = (value || "").trim().toLowerCase();
    if (typed.length < 2) return null;

    const exactMatch = nationalityOptions.find(
      (item) => item.toLowerCase() === typed,
    );
    if (exactMatch) return exactMatch;

    const startsWithMatches = nationalityOptions.filter((item) =>
      item.toLowerCase().startsWith(typed),
    );

    if (startsWithMatches.length === 1) return startsWithMatches[0];

    return null;
  };

  const normalizeNationalityValue = (value) => {
    if (!value) return value;
    return findNationalityMatch(value) || value;
  };

  const handleNationalityChange = (index, value) => {
    const matchedNationality = findNationalityMatch(value);
    handlePassengerChange(index, "nationality", matchedNationality || value);
  };

  const handleNationalityBlur = (index, value) => {
    const matchedNationality = findNationalityMatch(value);
    if (matchedNationality) {
      handlePassengerChange(index, "nationality", matchedNationality);
    }
  };

  const handleDocSelect = (index, file) => {
    if (!file) return;
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, or PDF files are allowed");
      return;
    }
    setPendingDocs((prev) => ({ ...prev, [index]: file }));
    handlePassengerChange(index, "documentUrl", "");

    // PDFs have no MRZ to scan visually — only run OCR autofill for images.
    if (file.type !== "application/pdf") {
      autoFillPassengerFromPassportImage(index, file);
    }
  };

  const autoFillPassengerFromPassportImage = async (index, file) => {
    setScanningDocIndex(index);
    try {
      const scanResult = await scanPassportImageForMrz(file);
      const parsed = scanResult?.mrz ? parseMRZ(scanResult.mrz) : null;

      if (!parsed) {
        toast.error(
          "Couldn't read passport details from that image. You can fill the fields manually or use Scan MRZ.",
          { toastId: `doc-ocr-fail-${index}` },
        );
        return;
      }

      setFormData((prev) => {
        if (index >= prev.passengers.length) return prev;
        const newPassengers = [...prev.passengers];
        newPassengers[index] = {
          ...newPassengers[index],
          surName: parsed.surName || newPassengers[index].surName,
          givenName: parsed.givenName || newPassengers[index].givenName,
          passport: parsed.passport || newPassengers[index].passport,
          nationality:
            normalizeNationalityValue(parsed.nationality) ||
            newPassengers[index].nationality,
          dateOfBirth: parsed.dateOfBirth || newPassengers[index].dateOfBirth,
          passportExpiry:
            parsed.passportExpiry || newPassengers[index].passportExpiry,
          title: parsed.title || newPassengers[index].title,
        };
        return { ...prev, passengers: newPassengers };
      });

      if (parsed.passportExpiry) {
        validatePassportExpiry(index, parsed.passportExpiry);
      }

      toast.success(
        scanResult.needsReview
          ? "Passport scanned — please double-check the name before submitting."
          : "Passport details filled from the image.",
        { toastId: `doc-ocr-ok-${index}` },
      );
    } catch (err) {
      console.error("Passport image OCR failed:", err);
      toast.error(
        "Couldn't read passport details from that image. You can fill the fields manually or use Scan MRZ.",
        { toastId: `doc-ocr-fail-${index}` },
      );
    } finally {
      setScanningDocIndex((prev) => (prev === index ? null : prev));
    }
  };

  const handleDocRemove = (index) => {
    setPendingDocs((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    handlePassengerChange(index, "documentUrl", "");
  };

  const uploadPendingDocs = async (passengers) => {
    const updated = passengers.map((p) => ({ ...p }));
    const entries = Object.entries(pendingDocs);
    if (entries.length === 0) return updated;

    await Promise.all(
      entries.map(async ([idxStr, file]) => {
        const idx = parseInt(idxStr, 10);
        if (idx >= updated.length) return;
        const fd = new FormData();
        fd.append("document", file);
        try {
          const res = await axiosInstance.post(
            "/bookings/upload-document",
            fd,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
          if (res.data.success) {
            updated[idx].documentUrl = res.data.url;
          }
        } catch (err) {
          console.error(`Doc upload failed for passenger ${idx}:`, err);
        }
      }),
    );
    return updated;
  };

  const handleMrzScan = (index) => {
    setMrzModal({ open: true, index });
    setMrzInput("");
    setMrzError("");
  };

  const handleMrzParse = () => {
    const rawBlocks = mrzInput.trim().split(/\n[ \t]*\n/);
    let results = [];
    if (rawBlocks.length > 1) {
      results = rawBlocks
        .map((block) => parseMRZ(block.trim()))
        .filter(Boolean);
    } else {
      const lines = mrzInput
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      for (let i = 0; i + 1 < lines.length; i += 2) {
        const result = parseMRZ(lines[i] + "\n" + lines[i + 1]);
        if (result) results.push(result);
      }
    }

    if (results.length === 0) {
      setMrzError(
        "Invalid MRZ code. Please paste the complete 2-line MRZ from the passport.",
      );
      return;
    }

    const startIdx = mrzModal.index;
    setFormData((prev) => {
      const newPassengers = [...prev.passengers];
      results.forEach((result, offset) => {
        const idx = startIdx + offset;
        if (idx >= newPassengers.length) return;
        newPassengers[idx] = {
          ...newPassengers[idx],
          surName: result.surName || newPassengers[idx].surName,
          givenName: result.givenName || newPassengers[idx].givenName,
          passport: result.passport || newPassengers[idx].passport,
          nationality:
            normalizeNationalityValue(result.nationality) ||
            newPassengers[idx].nationality,
          dateOfBirth: result.dateOfBirth || newPassengers[idx].dateOfBirth,
          passportExpiry:
            result.passportExpiry || newPassengers[idx].passportExpiry,
          title: result.title || newPassengers[idx].title,
        };
      });
      return { ...prev, passengers: newPassengers };
    });

    results.forEach((result, offset) => {
      const idx = startIdx + offset;
      if (idx < formData.passengers.length && result.passportExpiry) {
        validatePassportExpiry(idx, result.passportExpiry);
      }
    });

    const filled = Math.min(
      results.length,
      formData.passengers.length - startIdx,
    );
    toast.success(
      `${filled} passport${filled > 1 ? "s" : ""} scanned successfully!`,
    );
    setMrzModal({ open: false, index: null });
    setMrzInput("");
  };

  const calculateAdultTotal = () =>
    (parseInt(formData.adults) || 0) *
    (calculateB2BPrice(groupData?.price, groupData) || 0);

  const calculateChildTotal = () =>
    (parseInt(formData.children) || 0) *
    (calculateB2BPrice(groupData?.childPrice, groupData) || 0);

  const calculateInfantTotal = () =>
    (parseInt(formData.infants) || 0) *
    (calculateB2BPrice(groupData?.infantPrice, groupData) || 0);

  const calculateTotalPrice = () =>
    calculateAdultTotal() + calculateChildTotal() + calculateInfantTotal();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditMode) {
      return handleUpdate();
    }

    const remainingSeats = groupData?.available_no_of_pax || 0;

    const adults = parseInt(formData.adults) || 0;
    const children = parseInt(formData.children) || 0;
    const infants = parseInt(formData.infants) || 0;

    if (infants > adults) {
      toast.error(
        `Infants cannot be greater than adults. Max infants allowed: ${adults}`,
      );
      return;
    }

    const seatPassengers = adults + children;

    if (seatPassengers > remainingSeats) {
      toast.error(
        `Seats required (${seatPassengers}) cannot exceed available seats (${remainingSeats})`,
      );
      return;
    }

    const hasEmptyFields = formData.passengers.some(
      (passenger) =>
        !passenger.givenName ||
        !passenger.surName ||
        !passenger.passport ||
        !passenger.nationality,
    );

    if (hasEmptyFields) {
      toast.error("Please fill in all passenger details");
      return;
    }

    if (Object.keys(passportExpiryErrors).length > 0) {
      toast.error("Please fix passport expiry date errors before submitting");
      return;
    }

    const skypassTicketId = groupData?._skypassTicketId;
    if (skypassTicketId) {
      try {
        const openSeatsSlot =
          groupData?._skypass?.open_seats_slot ??
          groupData?.available_no_of_pax ??
          0;
        const res = await axiosInstance.post("/sector/holdSkyPassSeats", {
          ticketId: skypassTicketId,
          quantity: openSeatsSlot,
          openSeatsSlot,
        });
        const liveSeatCount = res.data?.bal_seats ?? null;
        if (liveSeatCount !== null) {
          setSkypassLiveSeatCount(liveSeatCount);
          setGroupData((prev) => ({
            ...prev,
            available_no_of_pax: liveSeatCount,
          }));
          if (seatPassengers > liveSeatCount) {
            toast.error(
              `Only ${liveSeatCount} seat(s) available on SkyPass. Please reduce passenger count.`,
            );
            return;
          }
        }
      } catch {
        // Non-fatal: proceed if check fails
      }
    }

    setShowReviewModal(true);
    setIsReviewed(false);
  };

  const normalizePassengerDates = (passengers) =>
    passengers.map((p) => ({
      ...p,
      dateOfBirth: getDateOnly(p.dateOfBirth) || p.dateOfBirth,
      passportExpiry: getDateOnly(p.passportExpiry) || p.passportExpiry,
      passportIssue: p.passportIssue
        ? getDateOnly(p.passportIssue) || p.passportIssue
        : p.passportIssue,
    }));

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setShowReviewModal(false);

    try {
      const passengersWithDocs = normalizePassengerDates(
        await uploadPendingDocs(formData.passengers),
      );

      const normalizedFlights =
        groupData.details?.map((flight) => ({
          flightNo: flight.flight_no,
          flightDate: flight.flight_date,
          depDate: getDateOnly(flight.dep_date || flight.flight_date),
          depTime: flight.dept_time,
          origin: flight.origin,
          destination: flight.destination,
          arrDate: getResolvedFlightArrivalDate(flight),
          arrTime: flight.arv_time,
          baggage: flight.baggage,
          meal: flight.meal,
        })) || [];
      const firstFlight = normalizedFlights[0] || {};
      const lastFlight = normalizedFlights[normalizedFlights.length - 1] || {};

      const bookingData = {
        groupId: groupData.id,
        source: groupData.source || "admin",
        ...(groupData.groupPriceDetailId !== undefined &&
          groupData.groupPriceDetailId !== null && {
          groupPriceDetailId: groupData.groupPriceDetailId,
        }),
        groupType: groupData.type,
        airline: {
          id: groupData.airline?.id || null,
          name: groupData.airline?.airline_name || "",
          logoUrl: groupData.airline?.logo_url || "",
        },
        sector: groupData.sector,
        pnr: groupData.pnr || "",
        contactPersonName: "N/A",
        adultsCount,
        childrenCount,
        infantsCount,
        totalPassengers: totalPassengers,
        pricing: {
          adultPrice: calculateB2BPrice(groupData.price, groupData) || 0,
          childPrice: calculateB2BPrice(groupData.childPrice, groupData) || 0,
          infantPrice: calculateB2BPrice(groupData.infantPrice, groupData) || 0,
          adultBasePrice: groupData._supplierPrice ?? groupData.price ?? 0,
          childBasePrice:
            groupData._supplierChildPrice ?? groupData.childPrice ?? 0,
          infantBasePrice:
            groupData._supplierInfantPrice ?? groupData.infantPrice ?? 0,
          adultTotal: calculateAdultTotal(),
          childTotal: calculateChildTotal(),
          infantTotal: Math.round(calculateInfantTotal()),
          grandTotal: Math.round(calculateTotalPrice()),
        },
        passengers: passengersWithDocs,
        flights: normalizedFlights,
        departureDate: firstFlight.depDate || getDateOnly(groupData.dept_date),
        arrivalDate:
          lastFlight.arrDate ||
          getResolvedFlightArrivalDate({
            dep_date: groupData.dept_date,
            arv_date: groupData.arv_date,
          }),
      };

      const response = await axiosInstance.post("/bookings", bookingData);

      if (response.data.success) {
        navigate("/dashboard/my-bookings", {
          state: {
            bookingSuccess: true,
            bookingReference: response.data.data.bookingReference,
            expiresAt: response.data.data.expiresAt,
          },
        });
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to create booking. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);

    try {
      const passengersWithDocs = normalizePassengerDates(
        await uploadPendingDocs(formData.passengers),
      );

      const updateData = {
        contactPersonName: formData.contactPersonName,
        adultsCount,
        childrenCount,
        infantsCount,
        passengers: passengersWithDocs,
        pricing: {
          adultPrice: calculateB2BPrice(groupData?.price, groupData) || 0,
          childPrice: calculateB2BPrice(groupData?.childPrice, groupData) || 0,
          infantPrice:
            calculateB2BPrice(groupData?.infantPrice, groupData) || 0,
          adultBasePrice: groupData?._supplierPrice ?? groupData?.price ?? 0,
          childBasePrice:
            groupData?._supplierChildPrice ?? groupData?.childPrice ?? 0,
          infantBasePrice:
            groupData?._supplierInfantPrice ?? groupData?.infantPrice ?? 0,
          adultTotal: calculateAdultTotal(),
          childTotal: calculateChildTotal(),
          infantTotal: Math.round(calculateInfantTotal()),
          grandTotal: Math.round(calculateTotalPrice()),
        },
      };

      const response = await axiosInstance.put(
        `/bookings/${bookingId}`,
        updateData,
      );

      if (response.data.success) {
        toast.success("Booking updated successfully");
        setTimeout(() => {
          navigate("/dashboard/my-bookings");
        }, 1000);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update booking";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!groupData && !isEditMode) {
    return (
      <div className="w-full min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-8 flex items-center justify-center">
        <div className="text-center bg-white p-12 rounded-2xl shadow-xl border border-slate-200 max-w-md">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plane className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-700 mb-6 text-sm font-medium">
            No flight data available
          </p>
          <button
            onClick={() => navigate("/dashboard/all-groups")}
            className="px-6 py-2.5 bg-linear-to-r from-slate-700 to-slate-900 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          >
            Back to Flights
          </button>
        </div>
      </div>
    );
  }

  if (loadingBooking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
        <div className="text-center bg-white p-12 rounded-2xl shadow-xl">
          <div className="animate-spin h-12 w-12 border-4 border-slate-200 border-t-slate-700 rounded-full mx-auto"></div>
          <p className="mt-6 text-sm text-slate-500 font-medium tracking-wider">
            LOADING BOOKING...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <TopBar title={isEditMode ? "Edit Booking" : "Add New Booking"} />

      <div className="pb-6">
        {/* Flight Details Card - Redesigned */}
        {groupData && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-3 sm:mb-4 transition-shadow duration-300">
            <div className="px-6 py-4 bg-[#f1f1f1] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {groupData.airline?.logo_url && (
                  <div className="p-2 rounded-xl backdrop-blur-sm">
                    <img
                      src={groupData.airline.logo_url}
                      alt={groupData.airline.airline_name}
                      className="w-20 h-20 object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://alhaidertravel.pk/storage/airlines/1721135342.png";
                      }}
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">
                    {groupData.airline?.airline_name || "Airline"}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {groupData.details?.map((flight, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 bg-white/60 text-xs px-3 py-1 rounded-full backdrop-blur-sm"
                      >
                        <Plane className="w-3 h-3" />
                        {flight.flight_no} • {flight.origin} →{" "}
                        {flight.destination}
                        <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                        {flight.dept_time?.substring(0, 5)} -{" "}
                        {flight.arv_time?.substring(0, 5)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-white/60 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wider">
                    Departure
                  </p>
                  <p className="font-semibold text-sm">
                    {new Date(groupData.dept_date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="bg-white/50 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <p className="text-[10px] uppercase tracking-wider text-center">
                    Meal
                  </p>
                  <p className="font-semibold text-sm">
                    {groupData.details?.some(
                      (flight) => flight.meal && flight.meal !== "No",
                    )
                      ? "Included"
                      : "Not Included"}
                  </p>
                </div>
                {groupData?.showSeat === true && (
                  <div className="bg-emerald-500/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-emerald-400/30">
                    <p className="text-[10px] uppercase tracking-wider">
                      Available Seats
                    </p>
                    <p className="font-bold text-sm">
                      {(() => {
                        if (!groupData) return 0;
                        const baseAvailable =
                          groupData.available_no_of_pax || 0;
                        const currentBookingPassengers = isEditMode
                          ? (parseInt(formData.adults) || 0) +
                          (parseInt(formData.children) || 0)
                          : 0;
                        return baseAvailable + currentBookingPassengers;
                      })()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Price Cards */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/50">
              <div className="px-6 py-4 text-center">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  Adult Price
                </p>
                <p
                  className={`${user?.priceOnCall ? "text-rose-600" : "text-slate-800"} text-lg font-bold mt-1`}
                >
                  {user?.priceOnCall
                    ? "📞 Price on Call"
                    : `PKR ${calculateB2BPrice(groupData.price, groupData)?.toLocaleString()}`}
                </p>
              </div>
              <div className="px-6 py-4 text-center">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  Child Price
                </p>
                <p className="text-slate-800 text-lg font-bold mt-1">
                  {isChildPriceAvailable()
                    ? `PKR ${calculateB2BPrice(groupData?.childPrice, groupData)?.toLocaleString()}`
                    : "—"}
                </p>
              </div>
              <div className="px-6 py-4 text-center">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  Infant Price
                </p>
                <p
                  className={`text-lg font-bold mt-1 ${isInfantPriceAvailable() ? "text-slate-800" : "text-rose-600"}`}
                >
                  {isInfantPriceAvailable()
                    ? `PKR ${calculateB2BPrice(groupData.infantPrice, groupData)?.toLocaleString()}`
                    : "📞 Price On Call"}
                </p>
              </div>
            </div> */}
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Passenger Count & Pricing Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-linear-to-r from-indigo-50 to-slate-50 px-6 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Passenger Summary
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800/5">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Passenger Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Adult Row */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                          A
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          Adult
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        name="adults"
                        value={formData.adults}
                        onChange={handleChange}
                        onBlur={handlePassengerBlur}
                        min="1"
                        className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`${user?.priceOnCall ? "text-rose-600" : "text-slate-700"} text-sm font-semibold`}
                      >
                        {user?.priceOnCall
                          ? "📞Price On Call"
                          : `PKR ${calculateB2BPrice(groupData?.price, groupData)?.toLocaleString()}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">
                      {user?.priceOnCall ? (
                        <span className="text-rose-600">📞Price On Call</span>
                      ) : (
                        `PKR ${calculateAdultTotal().toLocaleString()}`
                      )}
                    </td>
                  </tr>

                  {/* Children Row */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">
                          C
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          Children
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        name="children"
                        value={formData.children}
                        onChange={handleChange}
                        onBlur={handlePassengerBlur}
                        min="0"
                        className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700 text-sm font-semibold">
                        {isChildPriceAvailable()
                          ? `PKR ${calculateB2BPrice(groupData?.childPrice, groupData)?.toLocaleString()}`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">
                      {isChildPriceAvailable()
                        ? `PKR ${calculateChildTotal().toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>

                  {/* Infants Row */}
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-rose-700 font-bold text-xs">
                          I
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          Infants
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        name="infants"
                        value={formData.infants}
                        onChange={handleChange}
                        onBlur={handlePassengerBlur}
                        min="0"
                        max={formData.adults}
                        className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-center text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-semibold ${isInfantPriceAvailable() ? "text-slate-700" : "text-rose-600"}`}
                      >
                        {isInfantPriceAvailable()
                          ? `PKR ${calculateB2BPrice(groupData?.infantPrice, groupData)?.toLocaleString()}`
                          : "📞Price On Call"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">
                      {isInfantPriceAvailable()
                        ? `PKR ${Math.round(calculateInfantTotal()).toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>

                  {/* Total Row */}
                  <tr className="bg-neutral-100">
                    <td
                      colSpan="2"
                      className="px-4 py-4 text-sm font-bold text-slate-800"
                    >
                      <span className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Grand Total
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-600">
                      {totalSeatPassengers}{" "}
                      {totalSeatPassengers === 1 ? "Seat" : "Seats"}
                    </td>
                    <td className="px-4 py-4 text-right text-lg font-bold text-slate-800">
                      {user?.priceOnCall ? (
                        <span className="text-rose-600">📞 Price on Call</span>
                      ) : (
                        `PKR ${Math.round(calculateTotalPrice()).toLocaleString()}`
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Passenger Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-linear-to-r from-indigo-50 to-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Passenger Details
              </h3>
              <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                {formData.passengers.length} Passengers
              </span>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ background: "#ececec" }}>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg">
                      #
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">
                      Surname
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">
                      Given Name
                    </th>
                    <th className="px-3 py.2.5 text-left text-xs font-semibold uppercase tracking-wider">
                      Passport
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">
                      DOB
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">
                      Expiry
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider">
                      Nationality
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider rounded-tr-lg">
                      Document
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.passengers.map((passenger, index) => {
                    let passengerLabel = "";
                    if (passenger.type === "Adult") {
                      const adultNum = formData.passengers
                        .slice(0, index + 1)
                        .filter((p) => p.type === "Adult").length;
                      passengerLabel = `Adult ${adultNum}`;
                    } else if (passenger.type === "Child") {
                      const childNum = formData.passengers
                        .slice(0, index + 1)
                        .filter((p) => p.type === "Child").length;
                      passengerLabel = `Child ${childNum}`;
                    } else if (passenger.type === "Infant") {
                      const infantNum = formData.passengers
                        .slice(0, index + 1)
                        .filter((p) => p.type === "Infant").length;
                      passengerLabel = `Infant ${infantNum}`;
                    }

                    return (
                      <tr
                        key={index}
                        className="hover:bg-indigo-50/30 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600">
                              {passengerLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleMrzScan(index)}
                              title="Scan Passport MRZ"
                              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-semibold transition-all hover:shadow-md"
                            >
                              <Scan className="w-3 h-3" />
                              Scan
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={passenger.title}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "title",
                                e.target.value,
                              )
                            }
                            required
                            className="w-full min-w-17.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                          >
                            {passenger.type === "Adult" && (
                              <>
                                <option value="Mr">Mr</option>
                                <option value="Ms">Ms</option>
                                <option value="Mrs">Mrs</option>
                              </>
                            )}
                            {passenger.type === "Child" && (
                              <option value="CHLD">CHLD</option>
                            )}
                            {passenger.type === "Infant" && (
                              <option value="INF">INF</option>
                            )}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={passenger.surName}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "surName",
                                e.target.value,
                              )
                            }
                            required
                            className="w-full min-w-25 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            placeholder="Surname"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={passenger.givenName}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "givenName",
                                e.target.value,
                              )
                            }
                            required
                            className="w-full min-w-25 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            placeholder="Given Name"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={passenger.passport}
                            onChange={(e) =>
                              handlePassengerChange(
                                index,
                                "passport",
                                e.target.value,
                              )
                            }
                            required
                            className="w-full min-w-25 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            placeholder="Passport No"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <MaskedDatePicker
                            value={passenger.dateOfBirth}
                            onChange={(date) =>
                              handlePassengerChange(index, "dateOfBirth", date)
                            }
                            size="small"
                            maxDate={new Date()}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div>
                            <MaskedDatePicker
                              value={passenger.passportExpiry}
                              onChange={(date) =>
                                handlePassengerChange(
                                  index,
                                  "passportExpiry",
                                  date,
                                )
                              }
                              size="small"
                              minDate={new Date()}
                            />
                            {passportExpiryErrors[index] && (
                              <div className="text-rose-600 text-xs mt-1 font-medium flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                                {passportExpiryErrors[index]}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={passenger.nationality || ""}
                            onChange={(e) =>
                              handleNationalityChange(index, e.target.value)
                            }
                            onBlur={(e) =>
                              handleNationalityBlur(index, e.target.value)
                            }
                            autoComplete="off"
                            className="w-full min-w-25 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                            placeholder="Nationality"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1.5 min-w-25">
                            {pendingDocs[index] || passenger.documentUrl ? (
                              <div className="flex items-center gap-2">
                                {pendingDocs[index] ? (
                                  pendingDocs[index].type ===
                                    "application/pdf" ? (
                                    <span className="text-[10px] text-amber-700 font-semibold border border-amber-300 bg-amber-50 px-2 py-0.5 rounded">
                                      📄 PDF
                                    </span>
                                  ) : (
                                    <img
                                      src={URL.createObjectURL(
                                        pendingDocs[index],
                                      )}
                                      alt="doc preview"
                                      className="h-10 w-16 object-cover rounded-lg border border-amber-300"
                                    />
                                  )
                                ) : passenger.documentUrl.match(
                                  /\.(jpg|jpeg|png|webp)/i,
                                ) ? (
                                  <a
                                    href={passenger.documentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <img
                                      src={passenger.documentUrl}
                                      alt="doc"
                                      className="h-10 w-16 object-cover rounded-lg border border-slate-200 hover:border-indigo-400 transition-all"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={passenger.documentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-indigo-600 underline font-medium"
                                  >
                                    📄 PDF
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDocRemove(index)}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-all"
                                  title="Remove"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : null}
                            <label
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-all ${scanningDocIndex === index
                                ? "cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400"
                                : "cursor-pointer bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border-slate-200 text-slate-700"
                                }`}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {pendingDocs[index] || passenger.documentUrl
                                ? "Replace"
                                : "Upload"}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                className="hidden"
                                disabled={scanningDocIndex === index}
                                onChange={(e) =>
                                  handleDocSelect(index, e.target.files?.[0])
                                }
                              />
                            </label>
                            {scanningDocIndex === index && (
                              <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span>
                                Reading passport...
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end bg-white rounded-2xl border border-slate-200 p-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 hover:border-slate-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${isSubmitting
                ? "bg-slate-400 text-white cursor-not-allowed"
                : "bg-linear-to-r from-slate-700 to-slate-900 text-white hover:shadow-lg hover:-translate-y-0.5"
                }`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : isEditMode ? (
                " Update Booking"
              ) : (
                "Confirm Booking"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* MRZ Scan Modal - Enhanced */}
      {mrzModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-linear-to-r from-slate-800 to-slate-900 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-xl">
                  <Scan className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg">
                    Passport MRZ Scanner
                  </h4>
                  <p className="text-white/60 text-xs">
                    Passenger{" "}
                    {mrzModal.index !== null
                      ? formData.passengers[mrzModal.index]?.type
                      : ""}{" "}
                    {(mrzModal.index || 0) + 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMrzModal({ open: false, index: null })}
                className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-3">
                <div className="text-indigo-600 mt-0.5">
                  <span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-bold">
                    i
                  </span>
                </div>
                <div className="text-xs text-indigo-800 leading-relaxed">
                  The MRZ is the two lines of machine-readable text at the
                  bottom of the main passport page. To fill multiple passengers,
                  paste each passport's MRZ one after the other.
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Paste the MRZ code
                </label>
                <textarea
                  autoFocus
                  value={mrzInput}
                  onChange={(e) => {
                    setMrzInput(e.target.value);
                    setMrzError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") handleMrzParse();
                  }}
                  placeholder={`P<PAKNAME<<GIVEN<NAME<<<<<<<<<<<<<<<<<<<<<\nAB1234567PAK8501011M2601014<<<<<<<<<<<<<<<6`}
                  rows={4}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none bg-slate-50 placeholder-slate-300 leading-6"
                />
                {mrzError && (
                  <p className="text-rose-600 text-xs flex items-center gap-1.5 mt-1.5">
                    <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                    {mrzError}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Example MRZ Format
                </p>
                <code className="text-[10px] font-mono text-slate-500 leading-5 block break-all">
                  P&lt;PAKSMITH&lt;&lt;JOHN&lt;WILLIAM&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                  <br />
                  AB1234567PAK8501011M2601014&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;6
                </code>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMrzModal({ open: false, index: null })}
                className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMrzParse}
                disabled={!mrzInput.trim()}
                className={`px-6 py-2 text-sm font-semibold rounded-xl transition-all ${mrzInput.trim()
                  ? "bg-linear-to-r from-indigo-600 to-indigo-700 text-white hover:shadow-lg hover:-translate-y-0.5"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
              >
                Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal - Enhanced */}
      {showReviewModal && (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-4 flex justify-between items-center"
              style={{ background: `linear-gradient(to right, ${theme.colors.primaryDark}, ${theme.colors.intermediate})` }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg">
                    Review Booking
                  </h4>
                  <p className="text-white/70 text-xs">
                    Please verify all passenger details before submission
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-white/80 bg-white/10 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                        Surname
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                        Given Name
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                        Passport
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                        DOB
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                        Expiry
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                        Nationality
                      </th>
                      <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                        Document
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {formData.passengers.map((p, i) => (
                      <tr
                        key={i}
                        className="hover:bg-indigo-50/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-600">
                          {(() => {
                            const passengerNum = formData.passengers
                              .slice(0, i + 1)
                              .filter((item) => item.type === p.type).length;
                            return `${p.type} ${passengerNum}`;
                          })()}
                        </td>
                        <td className="px-4 py-3">{p.title}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {p.surName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {p.givenName}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">
                          {p.passport}
                        </td>
                        <td className="px-4 py-3">
                          {formatDateForDisplay(p.dateOfBirth)}
                        </td>
                        <td className="px-4 py-3">
                          {formatDateForDisplay(p.passportExpiry)}
                        </td>
                        <td className="px-4 py-3">{p.nationality}</td>
                        <td className="px-4 py-3">
                          {pendingDocs[i] ? (
                            pendingDocs[i].type === "application/pdf" ? (
                              <span className="text-xs text-amber-700 font-semibold border border-amber-300 bg-amber-50 px-2 py-0.5 rounded">
                                📄 PDF
                              </span>
                            ) : (
                              <img
                                src={URL.createObjectURL(pendingDocs[i])}
                                alt="doc"
                                className="h-10 w-16 object-cover rounded-lg border border-amber-300"
                              />
                            )
                          ) : p.documentUrl ? (
                            p.documentUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
                              <a
                                href={p.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={p.documentUrl}
                                  alt="doc"
                                  className="h-10 w-16 object-cover rounded-lg border border-slate-200 hover:border-indigo-400 transition-all"
                                />
                              </a>
                            ) : (
                              <a
                                href={p.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-indigo-600 underline font-medium"
                              >
                                📄 PDF
                              </a>
                            )
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <label className="flex items-start sm:items-center gap-3 cursor-pointer group bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-emerald-400 transition-all w-full sm:w-auto">
                <div className="relative flex items-center shrink-0 mt-0.5 sm:mt-0">
                  <input
                    type="checkbox"
                    checked={isReviewed}
                    onChange={(e) => setIsReviewed(e.target.checked)}
                    className="peer w-5 h-5 cursor-pointer appearance-none border border-slate-400 rounded-lg checked:border-emerald-600 checked:bg-emerald-600 transition-all"
                  />
                  <CheckCircle
                    size={14}
                    className="absolute left-0.5 top-0.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                  />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-slate-900 select-none">
                  I confirm all information provided is accurate and complete.
                </span>
              </label>

              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
                  disabled={isSubmitting}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={!isReviewed || isSubmitting}
                  className={`flex-1 sm:flex-none px-8 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${isReviewed && !isSubmitting
                    ? "bg-linear-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-lg hover:-translate-y-0.5"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
