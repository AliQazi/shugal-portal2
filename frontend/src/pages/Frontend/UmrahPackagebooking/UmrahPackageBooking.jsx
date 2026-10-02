import React, { useState, useEffect, useMemo } from "react";
import {
  getMyBookings,
  submitPayment,
  updatePassengerDetails,
} from "../../../api/umrahBookingApi";
import axiosInstance from "../../../api/axios";
import { printGDSBooking } from "../../../utils/bookingPDFService";
import { printUmrahVoucher } from "../../../utils/umrahVoucherPrint";
import {
  Search,
  // RefreshCw,
  Filter,
  X,
  Plus,
  Upload,
  Clock,
  XCircle,
  CheckCircle,
  CreditCard,
  FileCheck,
  Building,
  Printer,
  Eye,
  CalendarDays,
  Users,
  Plane,
  Pencil,
  Lock,
} from "lucide-react";
import { toast } from "react-toastify";
import useAccountsList from "../../../context/useAccountsList";
import { theme } from "../../../theme/theme";

const formatCalendarDate = (value) => {
  if (!value) return "N/A";

  const match = String(value)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parsedDate = match ? null : new Date(value);

  if (!match && Number.isNaN(parsedDate.getTime())) return "N/A";

  const year = match ? Number(match[1]) : parsedDate.getUTCFullYear();
  const month = match ? Number(match[2]) : parsedDate.getUTCMonth() + 1;
  const day = match ? Number(match[3]) : parsedDate.getUTCDate();
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return "N/A";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export default function UmrahBooking() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [visaFilter, setVisaFilter] = useState("All");
  const [hotelFilter, setHotelFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [timers, setTimers] = useState({});
  const [printingTicketId, setPrintingTicketId] = useState(null);
  const [printingVoucherId, setPrintingVoucherId] = useState(null);
  const [detailsPackageData, setDetailsPackageData] = useState(null);
  const [detailsGroupTicket, setDetailsGroupTicket] = useState(null);
  const [loadingDetailsData, setLoadingDetailsData] = useState(false);
  // Group tickets referenced by a package's selectedGroupTicketId, fetched in
  // bulk for the whole table (Flight PNR lives on the group ticket, not on
  // the package itself), keyed by group ticket id.
  const [groupTicketsMap, setGroupTicketsMap] = useState({});

  const { data3, subheadAccounts } = useAccountsList();
  // console.log(subheadAccounts);
  // console.log(data3);

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "",
    receiptNumber: "",
    notes: "",
    selectedBankId: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Edit passengers modal state
  const [editPassengersBooking, setEditPassengersBooking] = useState(null);
  const [editPassengersForm, setEditPassengersForm] = useState([]);
  const [savingPassengers, setSavingPassengers] = useState(false);

  // Bank accounts filter - data3 se sirf bank wale accounts
  const bankAccounts = useMemo(() => {
    // Pehle subheadAccounts mein "Bank" dhundo
    const bankSubhead = subheadAccounts?.find(
      (s) => s.subhead2_name === "Bank",
    );

    if (!bankSubhead) return [];

    // Ab data3 mein se woh accounts filter karo jinka subhead_id bankSubhead._id se match kare
    return (
      data3?.filter((account) => account.subhead_id === bankSubhead._id) || []
    );
  }, [data3, subheadAccounts]);

  const isOnHoldBooking = (booking) =>
    ["On Hold", "Pending"].includes(booking.overallStatus);

  const calculateRemainingTime = (expiresAt) => {
    if (!expiresAt) return { hours: 0, minutes: 0, seconds: 0, expired: true };

    const diff = new Date(expiresAt).getTime() - Date.now();

    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, expired: false };
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatMoney = (amount, currency = "PKR") =>
    `${currency} ${(Number(amount) || 0).toLocaleString()}`;

  // Layers an admin's booking-specific Flights/Hotels/Transport edit
  // (booking.packageDetailsOverride, set from the admin Booking Details modal)
  // on top of the base package details. Per-field: an overridden array wholly
  // replaces the base one; anything not overridden falls through unchanged.
  const applyPackageDetailsOverride = (base, override) => {
    if (!override) return base;
    const merged = { ...(base || {}) };
    // A group ticket re-picked by admin for this booking only.
    if (override.selectedGroupTicketId) {
      merged.selectedGroupTicketId = override.selectedGroupTicketId;
    }
    if (override.flights?.length) merged.flights = override.flights;
    if (override.hotels?.length) merged.hotels = override.hotels;
    if (override.transports?.length) {
      merged.transports = override.transports;
      merged.transport = override.transports;
    }
    return merged;
  };

  const getPackageDetails = (booking) => {
    const base =
      detailsPackageData ||
      (booking?.packageId && typeof booking.packageId === "object"
        ? booking.packageId
        : booking?.packageData || {});
    return applyPackageDetailsOverride(base, booking?.packageDetailsOverride);
  };

  // Same as getPackageDetails, but for a table row rather than the open
  // details modal - never reads detailsPackageData (that's scoped to
  // whichever single booking the modal currently has open).
  const getRowPackageData = (booking) => {
    const base =
      booking?.packageId && typeof booking.packageId === "object"
        ? booking.packageId
        : booking?.packageData || {};
    return applyPackageDetailsOverride(base, booking?.packageDetailsOverride);
  };

  const getPackageSourceInfo = (source) => {
    if (source === "travel-network") {
      return {
        label: "Travel Network",
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    }
    return {
      label: "Local Package",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  };

  const hasTravelDetails = (packageData) =>
    Boolean(
      packageData?.flights?.length ||
      packageData?.hotels?.length ||
      packageData?.days ||
      packageData?.selectedGroupTicketId ||
      packageData?.groupTicket?._id ||
      packageData?.groupTicket?.id,
    );

  const getStatusBadgeClass = (status, type = "general") => {
    if (["Approved", "Confirmed", "Completed", "Received"].includes(status)) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (
      ["On Hold", "Pending", "Applied", "In Process", "Booked"].includes(status)
    ) {
      return type === "visa"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (["Rejected", "Cancelled", "Expired"].includes(status)) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const getDiscountTotal = (booking) =>
    booking?.passengers?.reduce((sum, passenger) => {
      return sum + (Number(passenger.discount) || 0);
    }, 0) || 0;

  const getPayableTotal = (booking) =>
    Math.max(
      0,
      (booking?.pricing?.totalPrice || 0) - getDiscountTotal(booking),
    );

  const getPayableRemainingAmount = (booking) =>
    Math.max(
      0,
      getPayableTotal(booking) -
      (Number(booking?.paymentStatus?.paidAmount) || 0),
    );

  const getId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value._id) return value._id;
    if (value.id) return value.id;
    return "";
  };

  const normalizePrintFlight = (flight = {}) => ({
    ...flight,
    airlineName: flight.airlineName || flight.airline || "",
    flightNo: flight.flightNo || flight.flightNumber || "",
    departureDate: flight.departureDate || flight.depDate || flight.flightDate,
    arrivalDate: flight.arrivalDate || flight.arrDate || flight.depDate,
    depTime: flight.depTime || flight.departureTime || "",
    arrTime: flight.arrTime || flight.arrivalTime || "",
    origin: flight.origin || flight.originCity || flight.sectorFrom || "",
    destination:
      flight.destination || flight.destinationCity || flight.sectorTo || "",
    originCode: flight.originCode || flight.sectorFrom || "",
    destinationCode: flight.destinationCode || flight.sectorTo || "",
  });

  const buildUmrahTicketPrintBooking = (booking, packageData, groupTicket) => {
    const source = { ...(packageData || {}), ...(groupTicket || {}) };
    // Admin's per-booking edit wins, then the live group ticket, then the package's saved copy.
    const rawFlights = booking.packageDetailsOverride?.flights?.length
      ? booking.packageDetailsOverride.flights
      : source.flights || packageData?.flights || [];
    const flights = rawFlights.map(normalizePrintFlight);
    const firstFlight = flights[0] || {};
    const lastFlight = flights[flights.length - 1] || firstFlight;
    const airlineName =
      source.airline ||
      firstFlight.airlineName ||
      packageData?.airlineName ||
      "AIRLINE";

    const sector =
      source.sector ||
      (flights.length
        ? [
          firstFlight.sectorFrom || firstFlight.originCode,
          ...flights.map(
            (flight) => flight.sectorTo || flight.destinationCode,
          ),
        ]
          .filter(Boolean)
          .join("-")
        : "");

    return {
      ...source,
      _id: booking._id,
      bookingReference:
        booking.bookingNumber ||
        source.groupBookingId ||
        source.voucher_id ||
        source._id,
      bookingId: booking.bookingNumber,
      pnr: source.pnr || booking.pnr || booking.bookingNumber,
      status: booking.overallStatus === "Confirmed" ? "confirmed" : "on hold",
      bookingStatus: booking.overallStatus,
      passengers: booking.passengers || [],
      totalPassengers:
        booking.passengerCount?.total || booking.passengers?.length || 0,
      adultsCount: booking.passengerCount?.adults || 0,
      childrenCount: booking.passengerCount?.children || 0,
      infantsCount: booking.passengerCount?.infants || 0,
      airline: {
        name: airlineName,
        logoUrl:
          source.flightLogo ||
          source.airlineLogo ||
          packageData?.flightLogo ||
          "",
      },
      sector,
      flights,
      departureDate:
        firstFlight.departureDate || booking.flightDetails?.departure?.date,
      arrivalDate:
        lastFlight.arrivalDate ||
        booking.flightDetails?.return?.date ||
        booking.flightDetails?.departure?.date,
      pricing: {
        ...booking.pricing,
        grandTotal: getPayableTotal(booking),
      },
      userId: booking.user,
      agencyName: booking.user?.companyName,
      contactPersonName: booking.user?.name,
      phone: booking.user?.phone,
      printType: "umrah-package",
      showPackageDetails: true,
      hideTravelItineraryTitle: true,
      roomType: booking.roomType,
      packageData,
      hotels: packageData?.hotels || [],
      transport:
        (packageData?.transport?.length
          ? packageData.transport
          : packageData?.transports) || [],
      transports:
        (packageData?.transports?.length
          ? packageData.transports
          : packageData?.transport) || [],
    };
  };

  const normalizeTNTFlights = (tntBookingData) => {
    const details = tntBookingData?.group?.details || tntBookingData?.data?.group?.details || [];
    const airlineName = tntBookingData?.group?.airline?.short_name || tntBookingData?.data?.group?.airline?.short_name || "";
    return details.map((d) => ({
      airline: airlineName,
      flightNo: d.flight_no || "",
      depDate: d.flight_date,
      depTime: d.dept_time || "",
      arrDate: d.arv_date || d.arr_date || d.flight_date,
      arrTime: d.arv_time || "",
      sectorFrom: d.origin || "",
      sectorTo: d.destination || "",
      baggage: d.baggage || "",
    }));
  };

  const handlePrintTicket = async (booking) => {
    try {
      setPrintingTicketId(booking._id);

      let packageData =
        typeof booking.packageId === "object"
          ? booking.packageId
          : booking.packageData || null;

      // Admin's booking-specific Flights/Hotels/Transport edit (if any) takes
      // precedence over whatever the base package/source data says.
      packageData = applyPackageDetailsOverride(
        packageData,
        booking.packageDetailsOverride,
      );

      const packageId = getId(booking.packageId || packageData?._id);

      // Travel Network booking: TNT API se live data fetch karo
      if (booking.packageSource === "travel-network") {
        const tntBookingId = booking.travelNetworkBookingId || booking.travelNetworkBookingData?.data?.id;
        let tntFlights = normalizeTNTFlights(booking.travelNetworkBookingData?.data || booking.travelNetworkBookingData);

        // Note: fallback to packageData.flights if stored tnt data has no group.details

        if (!tntFlights.length && packageData?.flights?.length) {
          tntFlights = packageData.flights;
        }

        // Admin's manual flight edit always wins over live TNT data
        if (booking.packageDetailsOverride?.flights?.length) {
          tntFlights = booking.packageDetailsOverride.flights;
        }

        const tntSource = {
          ...(packageData || {}),
          flights: tntFlights,
          sector: packageData?.sector || "",
          airline: packageData?.airlineName || packageData?.airline?.airline_name || "",
          airlineLogo: packageData?.airline?.logo_url || packageData?.logo || "",
          pnr: booking.travelNetworkBookingData?.data?.group?.pnr || "",
        };

        const printBooking = buildUmrahTicketPrintBooking(booking, packageData, tntSource);

        if (!printBooking.flights?.length) {
          toast.error("No flight data found for this Travel Network booking");
          return;
        }

        printGDSBooking(printBooking);
        return;
      }

      const hasPackageDetailsForPrint =
        packageData?.hotels?.length &&
        (packageData?.transport?.length || packageData?.transports?.length);

      if ((!packageData || !hasPackageDetailsForPrint) && packageId) {
        const packageRes = await axiosInstance.get(
          `/umrahpackages/${packageId}`,
        );
        packageData = packageRes.data?.package || packageRes.data?.data;
        // Re-apply the booking's edit on top of the freshly-fetched master package
        packageData = applyPackageDetailsOverride(
          packageData,
          booking.packageDetailsOverride,
        );
      }

      const groupTicketId = getId(
        packageData?.selectedGroupTicketId ||
        packageData?.groupTicket?._id ||
        packageData?.groupTicket?.id,
      );

      let groupTicket = packageData?.groupTicket || null;
      if (!groupTicket && groupTicketId) {
        try {
          const groupRes = await axiosInstance.get(
            `/group-ticketing/${groupTicketId}`,
          );
          groupTicket = groupRes.data?.data || null;
        } catch (error) {
          console.warn(
            "Group ticket fetch failed, using package flights",
            error,
          );
        }
      }

      const printBooking = buildUmrahTicketPrintBooking(
        booking,
        packageData,
        groupTicket,
      );

      if (!printBooking.flights?.length) {
        toast.error("No group ticket flight data found for this Umrah booking");
        return;
      }

      printGDSBooking(printBooking);
    } catch (error) {
      console.error("Error printing Umrah ticket:", error);
      toast.error(error.response?.data?.message || "Failed to print ticket");
    } finally {
      setPrintingTicketId(null);
    }
  };

  // The server only sends voucherData once admin has unlocked the voucher for this agent.
  const handlePrintVoucher = async (booking) => {
    if (!booking.voucherData) return;
    try {
      setPrintingVoucherId(booking._id);
      await printUmrahVoucher(booking, booking.voucherData);
    } catch (error) {
      console.error("Error printing Umrah voucher:", error);
      toast.error("Failed to print voucher");
    } finally {
      setPrintingVoucherId(null);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await getMyBookings();
      setBookings(response.data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetailsModal = async (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
    setDetailsPackageData(null);
    setDetailsGroupTicket(null);

    try {
      setLoadingDetailsData(true);
      let packageData =
        typeof booking.packageId === "object"
          ? booking.packageId
          : booking.packageData || null;

      const packageId = getId(booking.packageId);
      if (
        booking.packageSource !== "travel-network" &&
        (!packageData || !hasTravelDetails(packageData)) &&
        packageId
      ) {
        const packageRes = await axiosInstance.get(
          `/umrahpackages/${packageId}`,
        );
        packageData =
          packageRes.data?.package || packageRes.data?.data || packageData;
      }

      setDetailsPackageData(packageData || null);

      const groupTicketId = getId(
        packageData?.selectedGroupTicketId ||
        packageData?.groupTicket?._id ||
        packageData?.groupTicket?.id,
      );

      if (groupTicketId) {
        try {
          const groupRes = await axiosInstance.get(
            `/group-ticketing/${groupTicketId}`,
          );
          setDetailsGroupTicket(groupRes.data?.data || null);
        } catch (error) {
          console.warn("Group ticket details fetch failed", error);
        }
      } else if (packageData?.groupTicket) {
        setDetailsGroupTicket(packageData.groupTicket);
      }
    } catch (error) {
      console.error("Error loading package details:", error);
      if (booking.packageSource === "travel-network") {
        toast.info("This is a Travel Network booking. Showing stored package details.");
      } else {
        toast.info("Package travel details could not be loaded.");
      }
    } finally {
      setLoadingDetailsData(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedBooking(null);
    setDetailsPackageData(null);
    setDetailsGroupTicket(null);
    setLoadingDetailsData(false);
  };

  const handleOpenPaymentModal = (booking) => {
    const timer = calculateRemainingTime(booking.expiresAt);
    if (isOnHoldBooking(booking) && timer.expired) {
      toast.error("This booking hold has expired");
      return;
    }

    if (booking.overallStatus === "Cancelled") {
      toast.error("This booking is cancelled and cannot accept payments");
      return;
    }

    // Allow multiple payments - only check if there's a pending payment
    const hasPendingPayment = booking.paymentStatus?.paymentHistory?.some(
      (payment) => payment.paymentStatus === "Pending",
    );

    if (hasPendingPayment) {
      toast.info(
        "Please wait for current payment to be reviewed before submitting another",
      );
      return;
    }

    setSelectedBooking(booking);
    setShowPaymentModal(true);
    // Auto-fill amount with remaining amount (partial payments allowed)
    const remainingAmount = getPayableRemainingAmount(booking);
    setPaymentForm({
      amount: remainingAmount.toString(),
      method: "",
      receiptNumber: "",
      notes: "",
      selectedBankId: "",
    });
    setReceiptFile(null);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedBooking(null);
    setPaymentForm({
      amount: "",
      method: "",
      receiptNumber: "",
      notes: "",
      selectedBankId: "",
    });
    setReceiptFile(null);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!receiptFile) {
      toast.error("Please upload a receipt");
      return;
    }

    // Get remaining amount
    const remainingAmount = getPayableRemainingAmount(selectedBooking);
    const submittingAmount = parseFloat(paymentForm.amount);

    // Validate: Amount must not exceed remaining amount
    if (submittingAmount > remainingAmount) {
      toast.error(
        `Payment cannot exceed remaining amount of PKR ${remainingAmount.toLocaleString()}`,
      );
      return;
    }

    // Validate: Amount must be at least 1
    if (submittingAmount < 1) {
      toast.error("Amount must be at least PKR 1");
      return;
    }

    try {
      setSubmittingPayment(true);
      const formData = new FormData();

      formData.append("amount", paymentForm.amount);
      formData.append("method", paymentForm.method);
      formData.append("receiptNumber", paymentForm.receiptNumber);
      formData.append("notes", paymentForm.notes);
      formData.append("receiptFile", receiptFile);
      formData.append("bankAccountId", paymentForm.selectedBankId);

      await submitPayment(selectedBooking._id, formData);
      toast.success(
        "Payment submitted successfully! Waiting for admin review.",
      );
      handleClosePaymentModal();
      fetchBookings();
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error(error.response?.data?.message || "Failed to submit payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenEditPassengersModal = (booking) => {
    if (booking.passengersLocked) {
      toast.error(
        "Passenger editing is locked for this booking. Please contact admin.",
      );
      return;
    }
    setEditPassengersBooking(booking);
    setEditPassengersForm(
      (booking.passengers || []).map((p) => ({
        type: p.type,
        childType: p.childType,
        title: p.title || "",
        givenName: p.givenName || "",
        surName: p.surName || "",
        passport: p.passport || "",
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
        passportExpiry: p.passportExpiry ? p.passportExpiry.split("T")[0] : "",
        nationality: p.nationality || "",
        documentUrl: p.documentUrl || "",
        documentFile: null,
        documentFileName: "",
      })),
    );
  };

  const handleClosePassengersModal = () => {
    setEditPassengersBooking(null);
    setEditPassengersForm([]);
    setSavingPassengers(false);
  };

  const handlePassengerFieldChange = (index, field, value) => {
    setEditPassengersForm((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handlePassengerFileChange = (index, file) => {
    if (!file) return;
    handlePassengerFieldChange(index, "documentFile", file);
    handlePassengerFieldChange(index, "documentFileName", file.name);
  };

  const handleSavePassengers = async (e) => {
    e.preventDefault();
    if (!editPassengersBooking) return;

    try {
      setSavingPassengers(true);

      const fd = new FormData();
      const passengersPayload = editPassengersForm.map((p) => ({
        title: p.title,
        givenName: p.givenName,
        surName: p.surName,
        passport: p.passport,
        dateOfBirth: p.dateOfBirth,
        passportExpiry: p.passportExpiry,
        nationality: p.nationality,
      }));
      fd.append("passengers", JSON.stringify(passengersPayload));
      editPassengersForm.forEach((p, i) => {
        if (p.documentFile) {
          fd.append(`documentFile_${i}`, p.documentFile, p.documentFileName);
        }
      });

      const res = await updatePassengerDetails(
        editPassengersBooking._id,
        fd,
      );
      setBookings((prev) =>
        prev.map((b) => (b._id === editPassengersBooking._id ? res.data : b)),
      );
      toast.success("Passenger details updated successfully");
      handleClosePassengersModal();
    } catch (error) {
      console.error("Error updating passenger details:", error);
      toast.error(
        error.response?.data?.message || "Failed to update passenger details",
      );
    } finally {
      setSavingPassengers(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Fetch the group ticket(s) backing any booking's package, so the table
  // can show its Flight PNR (a GroupTicketing-only field, not stored on the
  // package). Only fetches ids we haven't already cached.
  useEffect(() => {
    const idsNeeded = new Set();
    bookings.forEach((booking) => {
      const rowPackageData = getRowPackageData(booking);
      const groupTicketId = getId(
        rowPackageData?.selectedGroupTicketId ||
        rowPackageData?.groupTicket?._id ||
        rowPackageData?.groupTicket?.id,
      );
      if (groupTicketId && !groupTicketsMap[groupTicketId]) {
        idsNeeded.add(groupTicketId);
      }
    });

    if (idsNeeded.size === 0) return;

    let cancelled = false;
    Promise.all(
      Array.from(idsNeeded).map((id) =>
        axiosInstance
          .get(`/group-ticketing/${id}`)
          .then((res) => [id, res.data?.data || null])
          .catch(() => [id, null]),
      ),
    ).then((results) => {
      if (cancelled) return;
      setGroupTicketsMap((prev) => {
        const next = { ...prev };
        results.forEach(([id, data]) => {
          if (data) next[id] = data;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  useEffect(() => {
    const onHoldBookings = bookings.filter(
      (booking) => isOnHoldBooking(booking) && booking.expiresAt,
    );

    if (onHoldBookings.length === 0) {
      setTimers({});
      return;
    }

    const updateTimers = () => {
      const nextTimers = {};
      onHoldBookings.forEach((booking) => {
        nextTimers[booking._id] = calculateRemainingTime(booking.expiresAt);
      });
      setTimers(nextTimers);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);

    return () => clearInterval(interval);
  }, [bookings]);

  // Filter and Search Logic
  const filteredAndSortedBookings = useMemo(() => {
    let result = [...bookings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((booking) => {
        const passengerName = `${booking.passengers?.[0]?.givenName || ""} ${booking.passengers?.[0]?.surName || ""
          }`.toLowerCase();

        return (
          booking.bookingNumber?.toLowerCase().includes(term) ||
          booking.packageName?.toLowerCase().includes(term) ||
          passengerName.includes(term)
        );
      });
    }

    if (statusFilter !== "All") {
      result = result.filter((b) => b.overallStatus === statusFilter);
    }
    if (paymentFilter !== "All") {
      result = result.filter((b) => b.paymentStatus?.status === paymentFilter);
    }
    if (visaFilter !== "All") {
      result = result.filter((b) => b.visaStatus?.status === visaFilter);
    }
    if (hotelFilter !== "All") {
      result = result.filter((b) => b.hotelStatus?.status === hotelFilter);
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA, valB;

        switch (sortConfig.key) {
          case "bookingNumber":
            valA = a.bookingNumber || "";
            valB = b.bookingNumber || "";
            break;
          case "packageName":
            valA = a.packageName || "";
            valB = b.packageName || "";
            break;
          case "totalPrice":
            valA = a.pricing?.totalPrice || 0;
            valB = b.pricing?.totalPrice || 0;
            break;
          case "createdAt":
            valA = new Date(a.createdAt || 0).getTime();
            valB = new Date(b.createdAt || 0).getTime();
            break;
          case "overallStatus":
            valA = a.overallStatus || "";
            valB = b.overallStatus || "";
            break;
          default:
            return 0;
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    bookings,
    searchTerm,
    statusFilter,
    paymentFilter,
    visaFilter,
    hotelFilter,
    sortConfig,
  ]);

  const handleSort = (key) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === "asc" ? "desc" : "asc",
      });
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPaymentFilter("All");
    setVisaFilter("All");
    setHotelFilter("All");
    setSortConfig({ key: null, direction: "asc" });
  };

  const statusOptions = [
    "All",
    ...new Set(bookings.map((b) => b.overallStatus).filter(Boolean)),
  ];
  const paymentOptions = [
    "All",
    ...new Set(bookings.map((b) => b.paymentStatus?.status).filter(Boolean)),
  ];
  const visaOptions = [
    "All",
    ...new Set(bookings.map((b) => b.visaStatus?.status).filter(Boolean)),
  ];
  const hotelOptions = [
    "All",
    ...new Set(bookings.map((b) => b.hotelStatus?.status).filter(Boolean)),
  ];

  // Stats Cards (Total Bookings / Total Spent / Active Bookings) are
  // commented out above, so these derived totals are unused for now.
  // const totalBookings = bookings.length;
  // const totalSpent = bookings
  //   .filter((b) => b.overallStatus !== "Cancelled")
  //   .reduce((sum, b) => sum + getPayableTotal(b), 0);
  const selectedBookingDiscountTotal = getDiscountTotal(selectedBooking);
  const selectedBookingAfterDiscountTotal = getPayableTotal(selectedBooking);
  const selectedPackageDetails = getPackageDetails(selectedBooking);
  // The admin's booking-specific flight edit always wins, even over a freshly
  // fetched group ticket's own flights.
  const selectedPackageFlights = selectedBooking?.packageDetailsOverride
    ?.flights?.length
    ? selectedBooking.packageDetailsOverride.flights
    : detailsGroupTicket?.flights || selectedPackageDetails?.flights || [];
  const selectedPackageHotels = selectedPackageDetails?.hotels || [];
  const selectedPackageTransports = selectedPackageDetails?.transports || [];
  const selectedPackageVisa = selectedPackageDetails?.visa || null;
  const selectedPackageSource = getPackageSourceInfo(
    selectedBooking?.packageSource,
  );
  const selectedTravelNetworkBookingId =
    selectedBooking?.travelNetworkBookingId ||
    selectedBooking?.travelNetworkBookingData?.data?.id ||
    selectedBooking?.zipBookingId ||
    selectedBooking?.zipBookingData?.data?.id;
  const selectedPaymentHistory =
    selectedBooking?.paymentStatus?.paymentHistory || [];

  // Per-category unit prices for the pricing breakdown / passengers table.
  const selectedPackageTotals = selectedPackageDetails?.packageTotals || {};
  const selectedAdultPrice = selectedBooking?.pricing?.pricePerPerson || 0;
  const selectedChildWithoutBedPrice =
    selectedPackageTotals.childWithoutBed ||
    selectedPackageDetails?.rooms?.childWithoutPackage ||
    0;
  const selectedChildWithBedPrice = selectedPackageTotals.childWithBed || 0;
  const selectedInfantPrice =
    selectedPackageTotals.infant ||
    selectedPackageDetails?.rooms?.InfantWithoutPackage ||
    0;
  const selectedIncentivePerPax =
    Number(
      selectedPackageTotals.incentive ||
      selectedPackageDetails?.rooms?.IncentiveWithoutPackage,
    ) || 0;
  const getPassengerPrice = (passenger) => {
    if (passenger.type === "Adult") return selectedAdultPrice;
    if (passenger.type === "Infant") return selectedInfantPrice;
    if (passenger.type === "Child") {
      return passenger.childType === "withBed"
        ? selectedChildWithBedPrice
        : selectedChildWithoutBedPrice;
    }
    return 0;
  };
  const selectedPassengers = selectedBooking?.passengers || [];
  const selectedAdultCount =
    selectedBooking?.passengerCount?.adults ??
    selectedPassengers.filter((p) => p.type === "Adult").length;
  const selectedChildWithBedCount = selectedPassengers.filter(
    (p) => p.type === "Child" && p.childType === "withBed",
  ).length;
  const selectedChildWithoutBedCount = selectedPassengers.filter(
    (p) => p.type === "Child" && p.childType !== "withBed",
  ).length;
  const selectedInfantCount =
    selectedBooking?.passengerCount?.infants ||
    selectedPassengers.filter((p) => p.type === "Infant").length;
  // One row per passenger category: "<count> × <unit price> = <line total>".
  const selectedPricingLines = [
    {
      label: "Adults",
      count: selectedAdultCount,
      unit: selectedAdultPrice,
    },
    {
      label: "Child (w/ Bed)",
      count: selectedChildWithBedCount,
      unit: selectedChildWithBedPrice,
    },
    {
      label: "Child (w/o Bed)",
      count: selectedChildWithoutBedCount,
      unit: selectedChildWithoutBedPrice,
    },
    {
      label: "Infants",
      count: selectedInfantCount,
      unit: selectedInfantPrice,
    },
  ]
    .filter((line) => line.count > 0)
    .map((line) => ({ ...line, total: line.count * line.unit }));
  const selectedSubtotal = selectedPricingLines.reduce(
    (sum, line) => sum + line.total,
    0,
  );
  const selectedIncentiveCount = selectedAdultCount + selectedChildWithBedCount;
  const selectedTotalIncentive = selectedIncentivePerPax * selectedIncentiveCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">
            Loading your Umrah bookings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-1 font-sans">
      <div>
        {/* Header */}
        {/* <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              My Umrah Bookings
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Track bookings, payments, passengers, travel details, and
              documents.
            </p>
          </div>
          <button
            onClick={fetchBookings}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            Refresh
          </button>
        </div> */}

        {/* Stats Cards */}
        {/* <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Bookings
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              {totalBookings}
            </p>
          </div>
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Spent
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-600">
              PKR {totalSpent.toLocaleString()}
            </p>
          </div>
          <div className="border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Active Bookings
            </p>
            <p className="mt-1 text-3xl font-bold text-amber-600">
              {
                bookings.filter(
                  (b) =>
                    b.overallStatus === "Confirmed" ||
                    b.overallStatus === "On Hold" ||
                    b.overallStatus === "Pending",
                ).length
              }
            </p>
          </div>
        </div> */}

        {/* Table */}
        <div className="overflow-hidden border border-slate-300 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {filteredAndSortedBookings.length} booking
              {filteredAndSortedBookings.length !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm! font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "All" ? "Booking Status" : opt}
                  </option>
                ))}
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm! font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                {paymentOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "All" ? "Payment Status" : opt}
                  </option>
                ))}
              </select>

              <select
                value={visaFilter}
                onChange={(e) => setVisaFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm! font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                {visaOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "All" ? "Visa Status" : opt}
                  </option>
                ))}
              </select>

              <select
                value={hotelFilter}
                onChange={(e) => setHotelFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm! font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                {hotelOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "All" ? "Hotel Status" : opt}
                  </option>
                ))}
              </select>

              <div className="relative w-64 max-w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                onClick={resetFilters}
                title="Clear filters"
                className="flex h-9 items-center justify-center gap-1 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-500 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-295 border-collapse text-sm">
              {/* HEADER */}
              <thead style={{ background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.primaryDark})` }}>
                <tr className="whitespace-nowrap">
                  <th
                    onClick={() => handleSort("bookingNumber")}
                    className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-white cursor-pointer hover:text-emerald-600"
                  >
                    Id{" "}
                    {sortConfig.key === "bookingNumber" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>

                  <th
                    onClick={() => handleSort("packageName")}
                    className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-white cursor-pointer hover:text-emerald-600"
                  >
                    Name{" "}
                    {sortConfig.key === "packageName" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>

                  <th
                    onClick={() => handleSort("totalPrice")}
                    className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-white cursor-pointer hover:text-emerald-600"
                  >
                    Flight Detail{" "}
                    {sortConfig.key === "totalPrice" &&
                      (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>

                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Departure
                  </th>

                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Arrival
                  </th>

                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Dept. Date Time
                  </th>

                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Arr. Date Time
                  </th>

                  <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                    Hotel
                  </th>

                  <th className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-white">
                    Action
                  </th>
                </tr>
              </thead>

              {/* BODY */}
              <tbody>
                {filteredAndSortedBookings.length > 0 ? (
                  filteredAndSortedBookings.map((booking) => {
                    const rowPackageData = getRowPackageData(booking);
                    const rowGroupTicketId = getId(
                      rowPackageData?.selectedGroupTicketId ||
                      rowPackageData?.groupTicket?._id ||
                      rowPackageData?.groupTicket?.id,
                    );
                    const rowGroupTicket =
                      groupTicketsMap[rowGroupTicketId] ||
                      rowPackageData?.groupTicket ||
                      null;
                    // Admin's per-booking edit wins, then the live group ticket, then the package's saved copy.
                    const rowFlights = booking.packageDetailsOverride?.flights
                      ?.length
                      ? booking.packageDetailsOverride.flights
                      : rowGroupTicket?.flights?.length
                        ? rowGroupTicket.flights
                        : rowPackageData?.flights || [];
                    const rowFirstFlight = rowFlights[0] || {};
                    // Flight PNR lives on the group ticket, not the package.
                    const rowPnr =
                      rowPackageData?.pnr ||
                      rowGroupTicket?.pnr ||
                      rowFirstFlight.pnr ||
                      booking.pnr ||
                      "N/A";
                    const rowAirline =
                      rowFirstFlight.airline ||
                      rowFirstFlight.airlineName ||
                      rowPackageData?.airlineName ||
                      rowGroupTicket?.airline ||
                      "N/A";
                    const rowFlightNumbers = rowFlights
                      .map((f) => f.flightNo || f.flightNumber)
                      .filter(Boolean)
                      .join(" / ");
                    const rowHotels = rowPackageData?.hotels || [];
                    const makkahHotel = rowHotels.find((h) =>
                      /makkah|mecca/i.test(h.location?.city || h.city || ""),
                    );
                    const madinaHotel = rowHotels.find((h) =>
                      /madina|medina/i.test(h.location?.city || h.city || ""),
                    );
                    const totalPassengers =
                      booking.passengerCount?.total ||
                      booking.passengers?.length ||
                      0;

                    return (
                      <tr
                        key={booking._id}
                        className="align-top hover:bg-gray-50/80 transition-colors"
                      >
                        {/* Id */}
                        <td className="border border-slate-300 px-3 py-2.5 whitespace-nowrap">
                          <div className="font-mono font-bold text-gray-900">
                            {booking.bookingNumber}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <CalendarDays className="h-3 w-3 text-emerald-600" />
                            {formatDate(booking.createdAt)}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span
                              className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${booking.overallStatus === "Confirmed" ||
                                booking.overallStatus === "Completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : booking.overallStatus === "On Hold" ||
                                  booking.overallStatus === "Pending"
                                  ? "bg-amber-50 text-amber-700"
                                  : booking.overallStatus === "In Progress"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                            >
                              {booking.overallStatus || "N/A"}
                            </span>
                          </div>
                          {isOnHoldBooking(booking) && (
                            <div className="mt-1.5 w-fit rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              {timers[booking._id]?.expired ? (
                                <span className="text-red-600">EXPIRED</span>
                              ) : (
                                <span>
                                  {String(
                                    timers[booking._id]?.hours || 0,
                                  ).padStart(2, "0")}
                                  :
                                  {String(
                                    timers[booking._id]?.minutes || 0,
                                  ).padStart(2, "0")}
                                  :
                                  {String(
                                    timers[booking._id]?.seconds || 0,
                                  ).padStart(2, "0")}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Name */}
                        <td className="border border-slate-300 px-3 py-2.5 min-w-45">
                          <div className="text-xs text-gray-500 leading-relaxed">
                            Package:{" "}
                            <span className="font-semibold text-gray-800">
                              {booking.packageName || "N/A"}
                            </span>
                          </div>
                          {booking.user?.companyName && (
                            <div className="text-xs text-gray-500 leading-relaxed">
                              Agency:{" "}
                              <span className="font-semibold text-gray-800">
                                {booking.user.companyName}
                              </span>
                            </div>
                          )}
                          {rowPackageData?.days && (
                            <div className="text-xs text-gray-500 leading-relaxed">
                              Package Days:{" "}
                              <span className="font-semibold text-gray-800">
                                {rowPackageData.days}
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-gray-500 leading-relaxed">
                            Name:{" "}
                            <span className="font-semibold text-gray-800">
                              {booking.passengers?.[0]?.givenName}{" "}
                              {booking.passengers?.[0]?.surName}{" "}
                              {totalPassengers > 1 && `x ${totalPassengers}`}
                            </span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-gray-700">
                            Persons:
                          </div>
                          <div className="text-xs text-gray-500 leading-relaxed">
                            Adults: {booking.passengerCount?.adults || 0}
                            {booking.passengerCount?.children > 0 &&
                              ` · Children: ${booking.passengerCount.children}`}
                            {booking.passengerCount?.infants > 0 &&
                              ` · Infants: ${booking.passengerCount.infants}`}
                          </div>
                        </td>

                        {/* Flight Detail */}
                        <td className="border border-slate-300 px-3 py-2.5 whitespace-nowrap">
                          <div className="text-xs text-gray-500 leading-relaxed">
                            Flight PNR:{" "}
                            <span className="font-semibold text-gray-800">
                              {rowPnr}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 leading-relaxed">
                            Flight Number:{" "}
                            <span className="font-semibold text-gray-800">
                              {rowFlightNumbers || "N/A"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 leading-relaxed">
                            Airline:{" "}
                            <span className="font-semibold text-gray-800">
                              {rowAirline}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 leading-relaxed">
                            Price:{" "}
                            <span className="font-semibold text-gray-800">
                              {formatMoney(
                                getPayableTotal(booking),
                                booking.pricing?.currency,
                              )}
                            </span>
                          </div>
                          <span
                            className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${booking.paymentStatus?.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : booking.paymentStatus?.status === "Pending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                              }`}
                          >
                            Pay: {booking.paymentStatus?.status || "N/A"}
                          </span>
                        </td>

                        {/* Departure */}
                        <td className="border border-slate-300 px-3 py-2.5 whitespace-nowrap">
                          {rowFlights.length > 0 ? (
                            rowFlights.map((f, idx) => (
                              <div
                                key={`dep-${idx}`}
                                className="font-semibold text-gray-800"
                              >
                                {f.sectorFrom ||
                                  f.origin ||
                                  f.originCode ||
                                  "N/A"}
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>

                        {/* Arrival */}
                        <td className="border border-slate-300 px-3 py-2.5 whitespace-nowrap">
                          {rowFlights.length > 0 ? (
                            rowFlights.map((f, idx) => (
                              <div
                                key={`arr-${idx}`}
                                className="font-semibold text-gray-800"
                              >
                                {f.sectorTo ||
                                  f.destination ||
                                  f.destinationCode ||
                                  "N/A"}
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>

                        {/* Dept Date Time */}
                        <td className="border border-slate-300 px-3 py-2.5 whitespace-nowrap">
                          {rowFlights.length > 0 ? (
                            rowFlights.map((f, idx) => (
                              <div
                                key={`deptdt-${idx}`}
                                className="text-gray-700"
                              >
                                {formatCalendarDate(
                                  f.depDate ||
                                  f.departureDate ||
                                  f.flightDate,
                                )}{" "}
                                {f.depTime || f.departureTime || ""}
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>

                        {/* Arr Date Time */}
                        <td className="border border-slate-300 px-3 py-2.5 whitespace-nowrap">
                          {rowFlights.length > 0 ? (
                            rowFlights.map((f, idx) => (
                              <div
                                key={`arrdt-${idx}`}
                                className="text-gray-700"
                              >
                                {formatCalendarDate(
                                  f.arrDate || f.arrivalDate,
                                )}{" "}
                                {f.arrTime || f.arrivalTime || ""}
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>

                        {/* Hotel */}
                        <td className="border border-slate-300 px-3 py-2.5 min-w-40">
                          {makkahHotel || madinaHotel ? (
                            <>
                              {makkahHotel && (
                                <div className="mb-1">
                                  <div className="text-xs text-gray-500">
                                    Stay in Makkah
                                  </div>
                                  <div className="font-semibold text-gray-800">
                                    {makkahHotel.name}
                                  </div>
                                </div>
                              )}
                              {madinaHotel && (
                                <div>
                                  <div className="text-xs text-gray-500">
                                    Stay in Madina
                                  </div>
                                  <div className="font-semibold text-gray-800">
                                    {madinaHotel.name}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : rowHotels.length > 0 ? (
                            rowHotels.map((hotel, idx) => (
                              <div key={`hotel-${idx}`} className="mb-1">
                                <div className="font-semibold text-gray-800">
                                  {hotel.name || "Hotel N/A"}
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                          <span
                            className={`mt-1 inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${booking.hotelStatus?.status === "Confirmed"
                              ? "bg-purple-50 text-purple-700"
                              : booking.hotelStatus?.status === "Pending"
                                ? "bg-amber-50 text-amber-700"
                                : booking.hotelStatus?.status === "Cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-50 text-gray-600"
                              }`}
                          >
                            {booking.hotelStatus?.status || "N/A"}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="border border-slate-300 px-3 py-2.5 text-center whitespace-nowrap w-75 min-w-87.5">
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenDetailsModal(booking)}
                              className="inline-flex items-center gap-1 px-2! py-1! bg-blue-50 text-blue-700 border border-blue-100 rounded-md hover:bg-blue-100 text-xs! font-medium whitespace-nowrap"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3" />
                              Details
                            </button>

                            {booking.passengersLocked ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 px-2! py-1! bg-gray-100 text-gray-400 border border-gray-200 rounded-md text-xs! font-medium whitespace-nowrap cursor-not-allowed"
                                title="Passenger editing is locked by admin"
                              >
                                <Lock className="w-3 h-3" />
                                Edit
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleOpenEditPassengersModal(booking)
                                }
                                className="inline-flex items-center gap-1 px-2! py-1! bg-amber-50 text-amber-700 border border-amber-100 rounded-md hover:bg-amber-100 text-xs! font-medium whitespace-nowrap"
                                title="Edit Passenger Details"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </button>
                            )}

                            {booking.overallStatus !== "Cancelled" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintTicket(booking);
                                }}
                                disabled={printingTicketId === booking._id}
                                className="inline-flex items-center gap-1 px-2! py-1! bg-slate-100 text-slate-700 border border-gray-200 rounded-md hover:bg-slate-200 text-xs! font-medium whitespace-nowrap disabled:opacity-60"
                                title="Print Ticket"
                              >
                                <Printer className="w-3 h-3" />
                                {printingTicketId === booking._id
                                  ? "Printing..."
                                  : "Print Ticket"}
                              </button>
                            )}

                            {/* Shown only after admin unlocks the voucher for this booking. */}
                            {booking.voucherData &&
                              booking.overallStatus !== "Cancelled" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintVoucher(booking);
                                  }}
                                  disabled={printingVoucherId === booking._id}
                                  className="inline-flex items-center gap-1 px-2! py-1! bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md hover:bg-emerald-100 text-xs! font-medium whitespace-nowrap disabled:opacity-60"
                                  title="Print Voucher"
                                >
                                  <Printer className="w-3 h-3" />
                                  {printingVoucherId === booking._id
                                    ? "Printing..."
                                    : "Print Voucher"}
                                </button>
                              )}

                            {isOnHoldBooking(booking) &&
                              timers[booking._id]?.expired ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 px-2! py-1! bg-red-100 text-red-700 rounded-md text-xs! font-medium whitespace-nowrap"
                              >
                                <XCircle className="w-3 h-3" />
                                Expired
                              </button>
                            ) : booking.overallStatus === "Cancelled" ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 px-2! py-1! bg-red-100 text-red-700 rounded-md text-xs! font-medium whitespace-nowrap"
                              >
                                <XCircle className="w-3 h-3" />
                                Cancelled
                              </button>
                            ) : booking.paymentStatus?.paymentHistory?.some(
                              (p) => p.paymentStatus === "Pending",
                            ) ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 px-2! py-1! bg-yellow-100 text-yellow-700 rounded-md text-xs! font-medium whitespace-nowrap"
                              >
                                <Clock className="w-3 h-3" />
                                Pending Review
                              </button>
                            ) : getPayableRemainingAmount(booking) === 0 ? (
                              <button
                                disabled
                                className="inline-flex items-center gap-1 px-2! py-1! bg-emerald-100 text-emerald-700 rounded-md text-xs! font-medium whitespace-nowrap"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Fully Paid
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPaymentModal(booking);
                                }}
                                className="inline-flex items-center gap-1 px-2! py-1! bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs! font-medium whitespace-nowrap"
                              >
                                <Plus className="w-3 h-3" />
                                {booking.paymentStatus?.paidAmount > 0
                                  ? "Add Payment"
                                  : "Pay"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="9"
                      className="border border-slate-300 px-6 py-16 text-center"
                    >
                      <Filter className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-900">
                        No bookings
                      </p>
                      <p className="text-xs text-gray-500">Adjust filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FIXED MODAL UI */}
      {showPaymentModal && selectedBooking && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Subtle blurred overlay */}
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={handleClosePaymentModal}
          ></div>

          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header - Clean & Modern */}
            <div className="px-8 pt-8 pb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Submit Payment
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Ref:{" "}
                  <span className="font-mono font-medium text-emerald-600">
                    {selectedBooking.bookingNumber}
                  </span>
                </p>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4">
              {/* Amount Display */}
              <div className="bg-emerald-50 rounded-2xl p-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
                      Original Total
                    </p>
                    <p className="text-2xl font-black text-emerald-900">
                      PKR{" "}
                      {selectedBooking.pricing?.totalPrice?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
                      Discount
                    </p>
                    <p className="text-2xl font-black text-amber-900">
                      PKR {selectedBookingDiscountTotal.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">
                      After Discount
                    </p>
                    <p className="text-2xl font-black text-slate-900">
                      PKR {selectedBookingAfterDiscountTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment History - Compact */}
              {selectedBooking.paymentStatus?.paymentHistory?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Previous History
                  </h3>
                  <div className="space-y-2">
                    {selectedBooking.paymentStatus.paymentHistory.map(
                      (payment, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-3">
                            <div className="text-sm flex-1">
                              <p className="font-bold text-gray-800">
                                PKR {payment.amount?.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {new Date(
                                  payment.paymentDate,
                                ).toLocaleDateString()}{" "}
                                • {payment.method}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded-md ${payment.paymentStatus === "Approved" ||
                                payment.paymentStatus === "Received"
                                ? "bg-emerald-100 text-emerald-700"
                                : payment.paymentStatus === "Pending"
                                  ? "bg-blue-100 text-blue-700"
                                  : payment.paymentStatus === "Rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                            >
                              {payment.paymentStatus === "Pending"
                                ? "Pending Review"
                                : payment.paymentStatus === "Received"
                                  ? "Approved"
                                  : payment.paymentStatus || "Pending"}
                            </span>
                          </div>
                          {payment.paymentStatus === "Rejected" &&
                            payment.rejectionReason && (
                              <div className="px-3 pb-3 pt-1">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                  <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1">
                                    Rejection Reason:
                                  </p>
                                  <p className="text-xs text-red-800">
                                    {payment.rejectionReason}
                                  </p>
                                </div>
                              </div>
                            )}
                          {(payment.paymentStatus === "Approved" ||
                            payment.paymentStatus === "Received") &&
                            payment.approvalProofFile && (
                              <div className="px-3 pb-3 pt-1">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                                    Approval Proof:
                                  </p>
                                  <a
                                    href={payment.approvalProofFile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                      />
                                    </svg>
                                    View Proof Document
                                  </a>
                                </div>
                              </div>
                            )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Visa Status Details */}
              {selectedBooking.visaStatus?.status &&
                selectedBooking.visaStatus.status !== "Not Applied" && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Visa Status
                    </h3>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">
                          Status:
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${selectedBooking.visaStatus.status === "Approved"
                            ? "bg-blue-50 text-blue-700"
                            : selectedBooking.visaStatus.status === "Rejected"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                            }`}
                        >
                          {selectedBooking.visaStatus.status}
                        </span>
                      </div>
                      {selectedBooking.visaStatus.applicationNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">
                            Application No:
                          </span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {selectedBooking.visaStatus.applicationNumber}
                          </span>
                        </div>
                      )}
                      {selectedBooking.visaStatus.approvalDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">
                            Approval Date:
                          </span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {formatCalendarDate(
                              selectedBooking.visaStatus.approvalDate,
                            )}
                          </span>
                        </div>
                      )}
                      {selectedBooking.visaStatus.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                            Notes:
                          </p>
                          <p className="text-xs text-gray-700">
                            {selectedBooking.visaStatus.notes}
                          </p>
                        </div>
                      )}
                      {selectedBooking.visaStatus.approvalDocument && (
                        <div className="pt-2">
                          <a
                            href={selectedBooking.visaStatus.approvalDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            View Visa Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Hotel Status Details */}
              {selectedBooking.hotelStatus?.status &&
                selectedBooking.hotelStatus.status !== "Not Booked" && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Hotel Status
                    </h3>
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">
                          Status:
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${selectedBooking.hotelStatus.status === "Confirmed"
                            ? "bg-purple-50 text-purple-700"
                            : selectedBooking.hotelStatus.status ===
                              "Cancelled"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                            }`}
                        >
                          {selectedBooking.hotelStatus.status}
                        </span>
                      </div>
                      {selectedBooking.hotelStatus.confirmationNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">
                            Confirmation No:
                          </span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {selectedBooking.hotelStatus.confirmationNumber}
                          </span>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.bookingDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 font-medium">
                            Booking Date:
                          </span>
                          <span className="text-xs text-gray-800 font-semibold">
                            {formatCalendarDate(
                              selectedBooking.hotelStatus.bookingDate,
                            )}
                          </span>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.notes && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                            Notes:
                          </p>
                          <p className="text-xs text-gray-700">
                            {selectedBooking.hotelStatus.notes}
                          </p>
                        </div>
                      )}
                      {selectedBooking.hotelStatus.confirmationDocument && (
                        <div className="pt-2">
                          <a
                            href={
                              selectedBooking.hotelStatus.confirmationDocument
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                            </svg>
                            View Hotel Confirmation
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Form Controls */}
              <form onSubmit={handleSubmitPayment} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      required
                      readOnly
                      value={paymentForm.amount}
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 cursor-not-allowed"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Method *
                    </label>
                    <select
                      required
                      value={paymentForm.method}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          method: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-xs"
                    >
                      <option value="">Select</option>
                      {/* <option value="Cash">Cash</option> */}
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Online">Online</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 ml-1">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    value={paymentForm.receiptNumber}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        receiptNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-xs"
                    placeholder="TRX-123456"
                  />
                </div>

                {/* Bank Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 ml-1">
                    Select Bank *
                  </label>
                  <select
                    required
                    value={paymentForm.selectedBankId}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        selectedBankId: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-xs"
                  >
                    <option value="">Select Bank</option>
                    {bankAccounts.map((bank) => (
                      <option key={bank._id} value={bank._id}>
                        {bank.account_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 ml-1">
                    Upload Proof *
                  </label>
                  <label
                    htmlFor="receipt-upload"
                    className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 transition-all cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-300 group-hover:text-emerald-500 mb-2" />
                    <span className="text-xs font-medium text-gray-600 group-hover:text-emerald-700">
                      {receiptFile ? receiptFile.name : "Choose receipt file"}
                    </span>
                    <input
                      type="file"
                      required
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        setReceiptFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                      id="receipt-upload"
                    />
                  </label>
                </div>

                <div className="flex gap-3 pt-4 pb-8">
                  <button
                    type="button"
                    onClick={handleClosePaymentModal}
                    className="flex-1 px-6 py-3.5 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="flex-2 px-6 py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                  >
                    {submittingPayment ? "Processing..." : "Confirm Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING DETAILS MODAL */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={handleCloseDetailsModal}
          ></div>

          <div className="relative flex h-[96vh] w-full max-w-340 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 bg-linear-to-r from-slate-900 via-slate-800 to-emerald-800 px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-xl font-bold text-white">
                    {selectedBooking.bookingNumber}
                  </h2>
                  <span
                    className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(
                      selectedBooking.overallStatus,
                    )}`}
                  >
                    {selectedBooking.overallStatus}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-200">
                  <span>{selectedBooking.packageName}</span>
                  <span className="text-slate-500">•</span>
                  <span>Booked {formatDate(selectedBooking.createdAt)}</span>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${selectedPackageSource.className}`}
                  >
                    {selectedPackageSource.label}
                  </span>
                  <span>Room: {selectedBooking.roomType || "N/A"}</span>
                  <span>
                    {selectedPackageDetails?.days
                      ? `${selectedPackageDetails.days} days`
                      : ""}
                  </span>
                  {selectedBooking.packageSource === "travel-network" && (
                    <span>
                      TNT: {selectedTravelNetworkBookingId || "Pending"}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleCloseDetailsModal}
                className="shrink-0 rounded-full bg-white/10 p-2 text-white transition-all hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Flights strip */}
            <div className="shrink-0 border-b border-blue-100 bg-blue-50/70 px-6 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                <Plane className="h-3.5 w-3.5" /> Flights
              </p>
              {loadingDetailsData ? (
                <p className="text-xs font-semibold text-blue-700">
                  Loading flights...
                </p>
              ) : selectedPackageFlights.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedPackageFlights.map((flight, idx) => (
                    <div
                      key={`${flight.flightNo || "flight"}-${idx}`}
                      className="min-w-55 flex-1 rounded-lg border border-blue-100 bg-white px-3 py-2"
                    >
                      <p className="text-xs font-bold text-gray-900">
                        {flight.flightNo || flight.flightNumber || "Flight N/A"}
                        {flight.airline || flight.airlineName
                          ? ` - ${flight.airline || flight.airlineName}`
                          : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
                        <span>
                          {flight.sectorFrom ||
                            flight.originCode ||
                            flight.origin ||
                            "N/A"}{" "}
                          to{" "}
                          {flight.sectorTo ||
                            flight.destinationCode ||
                            flight.destination ||
                            "N/A"}
                        </span>
                        <span>
                          Dep:{" "}
                          {formatCalendarDate(
                            flight.depDate ||
                            flight.departureDate ||
                            flight.flightDate,
                          )}{" "}
                          {flight.depTime || flight.departureTime || ""}
                        </span>
                        <span>
                          Arr:{" "}
                          {formatCalendarDate(
                            flight.arrDate || flight.arrivalDate,
                          )}{" "}
                          {flight.arrTime || flight.arrivalTime || ""}
                        </span>
                        {flight.baggage && <span>Bag: {flight.baggage}</span>}
                        {flight.meal && <span>Meal: {flight.meal}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {selectedBooking.packageSource === "travel-network"
                    ? "Flight details are not available in the stored Travel Network package."
                    : "Flight details are not available for this package."}
                </p>
              )}
            </div>

            {/* Main content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:overflow-hidden">
              <div className="grid grid-cols-1 gap-4 lg:h-full lg:grid-cols-[1fr_320px] lg:overflow-hidden">
                {/* Left column */}
                <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
                  {isOnHoldBooking(selectedBooking) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                      <h3 className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <Clock className="w-3.5 h-3.5" />
                        Booking Expiry
                      </h3>
                      {timers[selectedBooking._id]?.expired ? (
                        <span className="text-sm font-bold text-red-600">
                          EXPIRED
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {[
                            { label: "h", value: timers[selectedBooking._id]?.hours || 0 },
                            { label: "m", value: timers[selectedBooking._id]?.minutes || 0 },
                            { label: "s", value: timers[selectedBooking._id]?.seconds || 0 },
                          ].map((item) => (
                            <span
                              key={item.label}
                              className="rounded-md border border-amber-200 bg-white px-2 py-0.5 text-sm font-black tabular-nums text-gray-900"
                            >
                              {String(item.value).padStart(2, "0")}
                              <span className="ml-0.5 text-[9px] font-bold text-amber-700">
                                {item.label}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="ml-auto text-[11px] font-medium text-amber-800">
                        Expires at: {formatDateTime(selectedBooking.expiresAt)}
                      </span>
                    </div>
                  )}

                  {/* Hotels & Transport */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                      <Building className="h-4 w-4 text-blue-600" />
                      Hotels &amp; Transport
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {/* Hotels */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                          Hotels
                        </p>
                        {selectedPackageHotels.length > 0 ? (
                          <div className="space-y-1.5">
                            {selectedPackageHotels.map((hotel, idx) => (
                              <div
                                key={`${hotel.name || "hotel"}-${idx}`}
                                className="rounded-lg border border-blue-100 bg-white px-2.5 py-1.5"
                              >
                                <p className="text-xs font-bold text-gray-900">
                                  {hotel.name || "Hotel N/A"}
                                </p>
                                <p className="text-[11px] font-medium text-gray-500">
                                  City: {hotel.location?.city || "N/A"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] font-medium text-slate-500">
                            {loadingDetailsData
                              ? "Loading..."
                              : "No hotels available."}
                          </p>
                        )}
                      </div>
                      {/* Transport */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                          Transport
                        </p>
                        {selectedPackageTransports.length > 0 ? (
                          <div className="space-y-1.5">
                            {selectedPackageTransports.map((transport, idx) => (
                              <div
                                key={`${transport.route || "transport"}-${idx}`}
                                className="rounded-lg border border-blue-100 bg-white px-2.5 py-1.5"
                              >
                                <p className="text-xs font-bold text-gray-900">
                                  {transport.route || "Route N/A"}
                                </p>
                                <p className="text-[11px] font-medium text-gray-500">
                                  {transport.transportType ||
                                    transport.type ||
                                    "N/A"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] font-medium text-slate-500">
                            {loadingDetailsData
                              ? "Loading..."
                              : "No transport available."}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedPackageVisa && (
                      <div className="mt-3 rounded-lg border border-blue-100 bg-white px-2.5 py-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                          Package Visa
                        </p>
                        <p className="text-xs font-bold text-gray-900">
                          {selectedPackageVisa.visaType || "N/A"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Passengers */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                      <Users className="w-4 h-4 text-blue-600" />
                      Passengers ({selectedBooking.passengers?.length || 0})
                      <span className="text-[11px] font-semibold text-gray-500">
                        A:{selectedBooking.passengerCount?.adults || 0} C:
                        {selectedBooking.passengerCount?.children || 0} I:
                        {selectedBooking.passengerCount?.infants || 0}
                      </span>
                    </h3>
                    <div className="overflow-auto rounded-lg border border-slate-200">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-blue-100 text-left text-[10px] font-extrabold uppercase tracking-wide text-blue-700">
                            <th className="px-2.5 py-1.5">#</th>
                            <th className="px-2.5 py-1.5">Passenger</th>
                            <th className="px-2.5 py-1.5">Type</th>
                            <th className="px-2.5 py-1.5">Passport</th>
                            <th className="px-2.5 py-1.5">DOB</th>
                            <th className="px-2.5 py-1.5">Nationality</th>
                            <th className="px-2.5 py-1.5 text-right">Discount</th>
                            <th className="px-2.5 py-1.5 text-right">Price</th>
                            <th className="px-2.5 py-1.5 text-center">Doc</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                          {(selectedBooking.passengers || []).map(
                            (passenger, idx) => (
                              <tr
                                key={`${passenger.passport || passenger.givenName}-${idx}`}
                                className="whitespace-nowrap text-gray-600"
                              >
                                <td className="px-2.5 py-1.5 font-bold text-gray-400">
                                  {idx + 1}
                                </td>
                                <td className="px-2.5 py-1.5 font-bold text-gray-900">
                                  {[passenger.title, passenger.givenName, passenger.surName]
                                    .filter(Boolean)
                                    .join(" ") || "Passenger"}
                                </td>
                                <td className="px-2.5 py-1.5">
                                  <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                                    {passenger.type === "Child"
                                      ? `Child (${passenger.childType === "withBed" ? "w/ Bed" : "w/o Bed"})`
                                      : passenger.type || "N/A"}
                                  </span>
                                </td>
                                <td className="px-2.5 py-1.5">{passenger.passport || "N/A"}</td>
                                <td className="px-2.5 py-1.5">{formatCalendarDate(passenger.dateOfBirth)}</td>
                                <td className="px-2.5 py-1.5">{passenger.nationality || "N/A"}</td>
                                <td className="px-2.5 py-1.5 text-right font-semibold text-emerald-700">
                                  {Number(passenger.discount) > 0
                                    ? formatMoney(passenger.discount, selectedBooking.pricing?.currency)
                                    : "—"}
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-bold text-blue-600">
                                  {formatMoney(getPassengerPrice(passenger), selectedBooking.pricing?.currency)}
                                </td>
                                <td className="px-2.5 py-1.5 text-center">
                                  {passenger.documentUrl ? (
                                    <a
                                      href={passenger.documentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-semibold text-blue-600 hover:text-blue-800"
                                      title="View Document"
                                    >
                                      View
                                    </a>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Visa & Hotel status */}
                  {(selectedBooking.visaStatus?.status &&
                    selectedBooking.visaStatus.status !== "Not Applied") ||
                    (selectedBooking.hotelStatus?.status &&
                      selectedBooking.hotelStatus.status !== "Not Booked") ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {selectedBooking.visaStatus?.status &&
                        selectedBooking.visaStatus.status !== "Not Applied" && (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                              <FileCheck className="w-4 h-4 text-blue-600" />
                              Visa Status
                            </h3>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Status:
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${selectedBooking.visaStatus.status === "Approved"
                                    ? "bg-blue-600 text-white"
                                    : selectedBooking.visaStatus.status ===
                                      "Rejected"
                                      ? "bg-red-600 text-white"
                                      : "bg-amber-600 text-white"
                                    }`}
                                >
                                  {selectedBooking.visaStatus.status}
                                </span>
                              </div>
                              {selectedBooking.visaStatus.applicationNumber && (
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-700">
                                    Application No:
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    {
                                      selectedBooking.visaStatus
                                        .applicationNumber
                                    }
                                  </span>
                                </div>
                              )}
                              {selectedBooking.visaStatus.approvalDate && (
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-700">
                                    Approval Date:
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    {formatCalendarDate(
                                      selectedBooking.visaStatus.approvalDate,
                                    )}
                                  </span>
                                </div>
                              )}
                              {selectedBooking.visaStatus.notes && (
                                <p className="border-t border-blue-300 pt-1.5 text-gray-800">
                                  {selectedBooking.visaStatus.notes}
                                </p>
                              )}
                              {selectedBooking.visaStatus.approvalDocument && (
                                <a
                                  href={
                                    selectedBooking.visaStatus.approvalDocument
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 pt-1 font-medium text-blue-700 hover:text-blue-900"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  View Visa Document
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                      {selectedBooking.hotelStatus?.status &&
                        selectedBooking.hotelStatus.status !== "Not Booked" && (
                          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                              <Building className="w-4 h-4 text-purple-600" />
                              Hotel Status
                            </h3>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Status:
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${selectedBooking.hotelStatus.status ===
                                    "Confirmed"
                                    ? "bg-purple-600 text-white"
                                    : selectedBooking.hotelStatus.status ===
                                      "Cancelled"
                                      ? "bg-red-600 text-white"
                                      : "bg-amber-600 text-white"
                                    }`}
                                >
                                  {selectedBooking.hotelStatus.status}
                                </span>
                              </div>
                              {selectedBooking.hotelStatus
                                .confirmationNumber && (
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-700">
                                      Confirmation No:
                                    </span>
                                    <span className="font-bold text-gray-900">
                                      {
                                        selectedBooking.hotelStatus
                                          .confirmationNumber
                                      }
                                    </span>
                                  </div>
                                )}
                              {selectedBooking.hotelStatus.bookingDate && (
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-700">
                                    Booking Date:
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    {formatCalendarDate(
                                      selectedBooking.hotelStatus.bookingDate,
                                    )}
                                  </span>
                                </div>
                              )}
                              {selectedBooking.hotelStatus.notes && (
                                <p className="border-t border-purple-300 pt-1.5 text-gray-800">
                                  {selectedBooking.hotelStatus.notes}
                                </p>
                              )}
                              {selectedBooking.hotelStatus
                                .confirmationDocument && (
                                  <a
                                    href={
                                      selectedBooking.hotelStatus
                                        .confirmationDocument
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 pt-1 font-medium text-purple-700 hover:text-purple-900"
                                  >
                                    <Building className="w-3.5 h-3.5" />
                                    View Hotel Confirmation
                                  </a>
                                )}
                            </div>
                          </div>
                        )}
                    </div>
                  ) : null}
                </div>

                {/* Right column - pricing & payment */}
                <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                      <CalendarDays className="h-4 w-4 text-emerald-600" />
                      Pricing Breakdown
                    </h3>
                    <div className="space-y-2 text-xs">
                      {selectedPricingLines.map(({ label, count, unit, total }) => (
                        <div key={label} className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">{label}</p>
                            <p className="text-[11px] text-gray-500">
                              {count} × {formatMoney(unit, selectedBooking.pricing?.currency)}
                            </p>
                          </div>
                          <p className="whitespace-nowrap font-bold text-gray-700">
                            {formatMoney(total, selectedBooking.pricing?.currency)}
                          </p>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-gray-200 pt-2 font-bold text-gray-900">
                        <span>Subtotal</span>
                        <span>{formatMoney(selectedSubtotal, selectedBooking.pricing?.currency)}</span>
                      </div>
                      {selectedTotalIncentive > 0 && (
                        <div className="flex items-start justify-between gap-2 text-emerald-700">
                          <div>
                            <p className="font-semibold">Incentive (Adults + Child W/ Bed)</p>
                            <p className="text-[11px] opacity-85">
                              {selectedIncentiveCount} × {formatMoney(selectedIncentivePerPax, selectedBooking.pricing?.currency)}
                            </p>
                          </div>
                          <p className="whitespace-nowrap font-bold">
                            -{formatMoney(selectedTotalIncentive, selectedBooking.pricing?.currency)}
                          </p>
                        </div>
                      )}
                      {selectedBookingDiscountTotal > 0 && (
                        <div className="text-emerald-700">
                          <div className="flex items-center justify-between font-semibold">
                            <span>Discount</span>
                            <span className="font-bold">
                              -{formatMoney(selectedBookingDiscountTotal, selectedBooking.pricing?.currency)}
                            </span>
                          </div>
                          {selectedPassengers.map((p, i) =>
                            Number(p.discount) > 0 ? (
                              <div key={i} className="mt-0.5 flex justify-between text-[11px] opacity-85">
                                <span>{[p.title, p.givenName, p.surName].filter(Boolean).join(" ")}</span>
                                <span>-{formatMoney(p.discount, selectedBooking.pricing?.currency)}</span>
                              </div>
                            ) : null,
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-sm font-extrabold text-emerald-700">
                        <span>Payable</span>
                        <span>{formatMoney(selectedBookingAfterDiscountTotal, selectedBooking.pricing?.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-red-700">
                        <span>Remaining</span>
                        <span>{formatMoney(getPayableRemainingAmount(selectedBooking), selectedBooking.pricing?.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Status & History */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Payment Status
                    </h3>
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(
                          selectedBooking.paymentStatus?.status,
                        )}`}
                      >
                        {selectedBooking.paymentStatus?.status || "N/A"}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        Paid{" "}
                        {formatMoney(
                          selectedBooking.paymentStatus?.paidAmount,
                          selectedBooking.pricing?.currency,
                        )}
                      </span>
                    </div>
                    {selectedPaymentHistory.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedPaymentHistory.map((payment, idx) => (
                          <div
                            key={`${payment.receiptNumber || "payment"}-${idx}`}
                            className="rounded-lg border border-gray-100 bg-white p-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-bold text-gray-900">
                                  {formatMoney(
                                    payment.amount,
                                    selectedBooking.pricing?.currency,
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {[payment.method, payment.receiptNumber]
                                    .filter(Boolean)
                                    .join(" | ") || "Payment details N/A"}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {formatDateTime(
                                    payment.paymentDate || payment.createdAt,
                                  )}
                                </p>
                              </div>
                              <span
                                className={`w-fit shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${getStatusBadgeClass(
                                  payment.paymentStatus,
                                )}`}
                              >
                                {payment.paymentStatus === "Received"
                                  ? "Approved"
                                  : payment.paymentStatus || "Pending"}
                              </span>
                            </div>
                            {payment.rejectionReason && (
                              <p className="mt-1.5 rounded-md bg-red-50 p-1.5 text-[10px] font-medium text-red-700">
                                Rejection: {payment.rejectionReason}
                              </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-semibold">
                              {payment.receiptFile && (
                                <a
                                  href={payment.receiptFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  View Receipt
                                </a>
                              )}
                              {payment.approvalProofFile && (
                                <a
                                  href={payment.approvalProofFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-800"
                                >
                                  View Approval Proof
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-emerald-100 bg-white p-2 text-xs font-medium text-gray-500">
                        No payment history submitted yet.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {selectedBooking.paymentStatus?.status !== "Approved" &&
                      !(
                        selectedBooking.paymentStatus?.status === "Pending" &&
                        selectedBooking.paymentStatus?.amount > 0
                      ) && (
                        <button
                          onClick={() => {
                            handleCloseDetailsModal();
                            handleOpenPaymentModal(selectedBooking);
                          }}
                          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
                        >
                          <Plus className="w-4 h-4" />
                          {selectedBooking.paymentStatus?.status === "Rejected"
                            ? "Retry Payment"
                            : "Submit Payment"}
                        </button>
                      )}
                    <button
                      onClick={handleCloseDetailsModal}
                      className="rounded-xl bg-gray-200 px-6 py-2.5 font-semibold text-gray-700 transition-all hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PASSENGERS MODAL */}
      {editPassengersBooking && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={handleClosePassengersModal}
          ></div>

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-6 pt-6 pb-3 flex items-start justify-between border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Edit Passenger Details
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  Ref:{" "}
                  <span className="font-mono font-medium text-emerald-600">
                    {editPassengersBooking.bookingNumber}
                  </span>{" "}
                  · {editPassengersForm.length} passenger
                  {editPassengersForm.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={handleClosePassengersModal}
                className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSavePassengers}
              className="flex-1 overflow-y-auto flex flex-col"
            >
              <div className="flex-1 overflow-auto px-4 py-3">
                <table className="w-full min-w-245 border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-2 text-left border-b border-gray-200 w-10">
                        #
                      </th>
                      <th className="px-2 py-2 text-left border-b border-gray-200">
                        Type
                      </th>
                      <th className="px-2 py-2 text-left border-b border-gray-200 w-20">
                        Title
                      </th>
                      <th className="px-2 py-2 text-left border-b border-gray-200">
                        Given Name
                      </th>
                      <th className="px-2 py-2 text-left border-b border-gray-200">
                        Surname
                      </th>
                      <th className="px-2 py-2 text-left border-b border-gray-200">
                        Passport
                      </th>
                      <th className="px-2 py-2 text-left border-b border-gray-200 w-32">
                        Date of Birth
                      </th>
                      <th className="px-2 py-2 text-left border-b border-gray-200 w-32">
                        Passport Expiry
                      </th>
                      <th className="px-2 py-2 text-left border-b border-gray-200">
                        Nationality
                      </th>
                      <th className="px-2 py-2 text-left border-b border-gray-200 w-32">
                        Document
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {editPassengersForm.map((pax, i) => (
                      <tr key={i} className="hover:bg-gray-50/60">
                        <td className="px-2 py-1.5 align-middle font-semibold text-gray-400">
                          {i + 1}
                        </td>
                        <td className="px-2 py-1.5 align-middle whitespace-nowrap">
                          <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            {pax.type === "Child"
                              ? `Child (${pax.childType === "withBed" ? "w/ Bed" : "w/o Bed"})`
                              : pax.type}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <select
                            value={pax.title}
                            onChange={(e) =>
                              handlePassengerFieldChange(
                                i,
                                "title",
                                e.target.value,
                              )
                            }
                            className="w-16 px-1.5 py-1 bg-white border border-gray-200 rounded text-sm! focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          >
                            {(pax.type === "Adult"
                              ? ["Mr", "Mrs", "Ms", "Miss", "Dr"]
                              : pax.type === "Child"
                                ? ["Child", "Master"]
                                : ["INF", "Baby"]
                            ).map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <input
                            type="text"
                            required
                            value={pax.givenName}
                            onChange={(e) =>
                              handlePassengerFieldChange(
                                i,
                                "givenName",
                                e.target.value,
                              )
                            }
                            className="w-32 px-1.5 py-1 bg-white border border-gray-200 rounded text-sm! focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <input
                            type="text"
                            required
                            value={pax.surName}
                            onChange={(e) =>
                              handlePassengerFieldChange(
                                i,
                                "surName",
                                e.target.value,
                              )
                            }
                            className="w-32 px-1.5 py-1 bg-white border border-gray-200 rounded text-sm! focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <input
                            type="text"
                            required
                            value={pax.passport}
                            onChange={(e) =>
                              handlePassengerFieldChange(
                                i,
                                "passport",
                                e.target.value.toUpperCase(),
                              )
                            }
                            className="w-30 px-1.5 py-1 bg-white border border-gray-200 rounded text-sm! uppercase focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <input
                            type="date"
                            required
                            value={pax.dateOfBirth}
                            onChange={(e) =>
                              handlePassengerFieldChange(
                                i,
                                "dateOfBirth",
                                e.target.value,
                              )
                            }
                            className="w-36 px-1.5 py-1 bg-white border border-gray-200 rounded text-sm! focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <input
                            type="date"
                            required
                            value={pax.passportExpiry}
                            onChange={(e) =>
                              handlePassengerFieldChange(
                                i,
                                "passportExpiry",
                                e.target.value,
                              )
                            }
                            className="w-36 px-1.5 py-1 bg-white border border-gray-200 rounded text-sm! focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <input
                            type="text"
                            required
                            value={pax.nationality}
                            onChange={(e) =>
                              handlePassengerFieldChange(
                                i,
                                "nationality",
                                e.target.value,
                              )
                            }
                            className="w-30 px-1.5 py-1 bg-white border border-gray-200 rounded text-sm! focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5 align-middle">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) =>
                              handlePassengerFileChange(
                                i,
                                e.target.files?.[0],
                              )
                            }
                            style={{ display: "none" }}
                            id={`edit-pax-doc-${i}`}
                          />
                          <label
                            htmlFor={`edit-pax-doc-${i}`}
                            className={`flex items-center justify-center gap-1 px-2 py-1 rounded border text-[10px] font-semibold cursor-pointer whitespace-nowrap ${pax.documentFileName
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                              }`}
                            title={pax.documentFileName || "Upload new document"}
                          >
                            <Upload className="w-3 h-3" />
                            {pax.documentFileName
                              ? "New file selected"
                              : "Replace"}
                          </label>
                          {!pax.documentFileName && pax.documentUrl && (
                            <a
                              href={pax.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block text-center text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                            >
                              View current
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
                <button
                  type="button"
                  onClick={handleClosePassengersModal}
                  className="flex-1 px-6 py-2.5! text-gray-600 font-bold text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassengers}
                  className="flex-1 px-6 py-2.5! bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                >
                  {savingPassengers ? "Saving..." : "Save Passenger Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
