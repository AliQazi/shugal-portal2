import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableBody,
} from "../components/ui/table";
import ComponentCard from "../components/common/ComponentCard";
import axiosInstance from "../Api/axios";
import { PencilIcon, TrashBinIcon } from "../icons";
import { Copy } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import {
  generateUmrahPackagesPDF,
  UmrahPackage,
} from "../utils/umrahPackagepdf";
import { Modal } from "../components/ui/modal";
import { EyeIcon } from "@heroicons/react/24/outline";

interface FlightData {
  airline: string;
  flightNo: string;
  depDate?: string;
  depTime?: string;
  arrDate?: string;
  arrTime?: string;
  sectorFrom?: string;
  sectorTo?: string;
  fromTerminal?: string;
  toTerminal?: string;
  flightClass?: string;
  baggage?: string;
  meal?: string;
}

interface HotelData {
  name: string;
  location?: {
    city?: string;
    distance?: string | number;
    mapUrl?: string;
  };
  distance?: number | string;
}

interface TransportData {
  transportType?: string;
  route?: string;
}

interface PackageData {
  _id: string;
  id?: string;
  packageName: string;
  availableRooms?: number;
  selectedGroupTicketId?: string;
  groupTicket?: {
    _id?: string;
    id?: string;
    totalSeats?: number;
  };
  days?: number;
  flightLogo?: string;
  createdAt: string;
  updatedAt?: string;
  internalStatus?: "Public" | "Private";

  rooms?: {
    sharing: number | null;
    double: number | null;
    triple: number | null;
    quad: number | null;
    quint: number | null;
    childWithoutPackage: number | null;
    InfantWithoutPackage: number | null;
  };

  packageTotals?: {
    double?: number;
    triple?: number;
    quad?: number;
    shared?: number;
    childWithoutBed?: number;
    childWithBed?: number;
    infant?: number;
    incentive?: number;
  };

  flights: FlightData[];
  hotels: HotelData[];
  transports: TransportData[];

  visa?: {
    visaType?: string;
    withTransport?: boolean;
  };

  logo?: string;
}

interface BookedSeatsData {
  groupId: string;
  totalSeats: number;
}

interface GroupTicketSeatsData {
  _id?: string;
  id?: string;
  totalSeats?: number;
  airline?: string;
  sector?: string;
  pnr?: string;
}

interface AirlineData {
  _id?: string;
  airlineName?: string;
  shortCode?: string;
}

interface UmrahBookingData {
  _id?: string;
  bookingNumber?: string;
  packageId?: string | { _id?: string; id?: string };
  packageName?: string;
  overallStatus?: string;
  createdAt?: string;
  roomType?: string;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    agencyCode?: string;
  };
  passengerCount?: {
    adults?: number;
    children?: number;
    infants?: number;
    total?: number;
  };
  pricing?: {
    totalPrice?: number;
    currency?: string;
  };
  paymentStatus?: {
    status?: string;
    paidAmount?: number;
    totalAmount?: number;
  };
}

interface UmrahBookingStatusCounts {
  pending: number;
  cancelled: number;
}

interface PackageTotalsForm {
  double: number;
  triple: number;
  quad: number;
  shared: number;
  childWithoutBed: number;
  childWithBed: number;
  infant: number;
  incentive: number;
}

const emptyPackageTotals: PackageTotalsForm = {
  double: 0,
  triple: 0,
  quad: 0,
  shared: 0,
  childWithoutBed: 0,
  childWithBed: 0,
  infant: 0,
  incentive: 0,
};

const pricingFieldsConfig: Array<{
  key: keyof Omit<PackageTotalsForm, "incentive">;
  label: string;
  subLabel: string;
  headerClass: string;
}> = [
  {
    key: "double",
    label: "Double Package Total (2 Pax)",
    subLabel: "Total Price/Pax (PKR)",
    headerClass: "bg-green-600",
  },
  {
    key: "triple",
    label: "Triple Package Total (3 Pax)",
    subLabel: "Total Price/Pax (PKR)",
    headerClass: "bg-teal-500",
  },
  {
    key: "quad",
    label: "Quad Package Total (4 Pax)",
    subLabel: "Total Price/Pax (PKR)",
    headerClass: "bg-blue-500",
  },
  {
    key: "shared",
    label: "Shared Package Total (5 Pax)",
    subLabel: "Total Price (PKR)",
    headerClass: "bg-yellow-500",
  },
  {
    key: "childWithoutBed",
    label: "Child W/O Bed Package Total",
    subLabel: "Total Price (PKR)",
    headerClass: "bg-violet-500",
  },
  {
    key: "childWithBed",
    label: "Child W/ Bed Package Total",
    subLabel: "Total Price (PKR)",
    headerClass: "bg-fuchsia-500",
  },
  {
    key: "infant",
    label: "Infant Package Total",
    subLabel: "Total Price (PKR)",
    headerClass: "bg-pink-500",
  },
];

const formatDate = (date?: string) => {
  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const formatShortDate = (date?: string) => {
  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const formatMoney = (amount?: number) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "—";
  }

  return Number(amount).toLocaleString("en-PK");
};

const parseFormattedNumber = (value: string) => {
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "-") return 0;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getDepartureRange = (flights: FlightData[]) => {
  if (!flights || flights.length === 0) {
    return {
      from: "N/A",
      to: "N/A",
    };
  }

  const firstFlight = flights[0];
  const lastFlight = flights[flights.length - 1];

  return {
    from: formatShortDate(firstFlight.depDate),
    to: formatShortDate(lastFlight.depDate || lastFlight.arrDate),
  };
};

// const getSectorText = (flights: FlightData[]) => {
//   if (!flights || flights.length === 0) return "No Sector";

//   const firstAirline = flights[0]?.airline || "AIRLINE";

//   const routeParts: string[] = [];

//   flights.forEach((flight, index) => {
//     if (index === 0 && flight.sectorFrom) {
//       routeParts.push(flight.sectorFrom);
//     }

//     if (flight.sectorTo) {
//       routeParts.push(flight.sectorTo);
//     }
//   });

//   const uniqueRoute = routeParts.filter(Boolean).join("-");

//   return `${firstAirline}-${uniqueRoute}`;
// };

// const hasTransportInPackage = (pkg: PackageData) => {
//   return Boolean(
//     pkg.visa?.withTransport || (pkg.transports && pkg.transports.length > 0)
//   );
// };

const getId = (value?: string | number | null) => String(value || "");

const getBookingPackageId = (booking: UmrahBookingData) => {
  return typeof booking.packageId === "object"
    ? getId(booking.packageId?._id || booking.packageId?.id)
    : getId(booking.packageId);
};

const getStatusClass = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (["confirmed", "completed", "approved"].includes(normalized)) {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (["cancelled", "rejected"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (["on hold", "pending", "in progress"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-gray-200 bg-gray-50 text-gray-700";
};

const ManageUmrahPackage = () => {
  const { user } = useAuth();

  const canView = hasPermission(user, "view_umrah_packages");
  const canUseActions = hasPermission(user, "umrah_packages_action_buttons");

  const [packages, setPackages] = useState<PackageData[]>([]);
  const [groupTicketTotalSeats, setGroupTicketTotalSeats] = useState<
    Map<string, number>
  >(new Map());
  const [groupTicketDetails, setGroupTicketDetails] = useState<
    Map<string, { airline?: string; sector?: string; pnr?: string }>
  >(new Map());
  const [airlineShortCodeMap, setAirlineShortCodeMap] = useState<
    Map<string, string>
  >(new Map());
  const [bookedSeatsByGroup, setBookedSeatsByGroup] = useState<
    Map<string, BookedSeatsData>
  >(new Map());
  const [umrahBookingStatusCounts, setUmrahBookingStatusCounts] = useState<
    Map<string, UmrahBookingStatusCounts>
  >(new Map());
  const [umrahBookings, setUmrahBookings] = useState<UmrahBookingData[]>([]);
  const [selectedBookingsPackage, setSelectedBookingsPackage] =
    useState<PackageData | null>(null);
  const [packageBookings, setPackageBookings] = useState<UmrahBookingData[]>(
    []
  );
  const [bookingsModalOpen, setBookingsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingPackage, setPricingPackage] = useState<PackageData | null>(
    null
  );
  const [pricingTotals, setPricingTotals] =
    useState<PackageTotalsForm>(emptyPackageTotals);
  const [pricingSaving, setPricingSaving] = useState(false);
  const pricingBaseTotalsRef = useRef({
    double: 0,
    triple: 0,
    quad: 0,
    shared: 0,
    childWithoutBed: 0,
    childWithBed: 0,
    infant: 0,
  });

  const hasFetched = useRef(false);

  const filteredPackages = packages.filter((pkg) => {
    const searchValue = searchTerm.toLowerCase().trim();
    if (!searchValue) return true;

    const packageName = pkg.packageName?.toLowerCase() || "";

    const hotelMatch = pkg.hotels?.some((hotel) => {
      const hotelName = hotel.name?.toLowerCase() || "";
      const city = hotel.location?.city?.toLowerCase() || "";

      return hotelName.includes(searchValue) || city.includes(searchValue);
    });

    const flightMatch = pkg.flights?.some((flight) => {
      const airline = flight.airline?.toLowerCase() || "";
      const flightNo = flight.flightNo?.toLowerCase() || "";
      const sectorFrom = flight.sectorFrom?.toLowerCase() || "";
      const sectorTo = flight.sectorTo?.toLowerCase() || "";

      return (
        airline.includes(searchValue) ||
        flightNo.includes(searchValue) ||
        sectorFrom.includes(searchValue) ||
        sectorTo.includes(searchValue)
      );
    });

    const transportMatch = pkg.transports?.some((transport) => {
      const transportType = transport.transportType?.toLowerCase() || "";
      const route = transport.route?.toLowerCase() || "";

      return (
        transportType.includes(searchValue) || route.includes(searchValue)
      );
    });

    const statusMatch = pkg.internalStatus?.toLowerCase().includes(searchValue);

    return (
      packageName.includes(searchValue) ||
      hotelMatch ||
      flightMatch ||
      transportMatch ||
      statusMatch
    );
  });

  useEffect(() => {
    const fetchPackages = async () => {
      if (!canView) {
        setLoading(false);
        return;
      }

      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        const [
          packageRes,
          groupTicketRes,
          bookedSeatsRes,
          umrahBookingsRes,
          airlineRes,
        ] =
          await Promise.allSettled([
            axiosInstance.get("/umrahpackages/"),
            axiosInstance.get("/group-ticketing"),
            axiosInstance.get("/bookings/getBookedSeats"),
            axiosInstance.get("/umrah-bookings/admin/all"),
            axiosInstance.get("/airline"),
          ]);

        if (packageRes.status !== "fulfilled") {
          throw packageRes.reason;
        }

        const { data } = packageRes.value;

        if (data?.success) {
          setPackages(data.data || []);

          if (!data.data || data.data.length === 0) {
            toast.info("No packages created yet");
          }
        }

        if (
          groupTicketRes.status === "fulfilled" &&
          groupTicketRes.value.data?.success
        ) {
          const seatsMap = new Map<string, number>();
          const detailsMap = new Map<
            string,
            { airline?: string; sector?: string; pnr?: string }
          >();
          (groupTicketRes.value.data.data || []).forEach(
            (ticket: GroupTicketSeatsData) => {
              const ticketId = getId(ticket._id || ticket.id);
              if (!ticketId) return;
              seatsMap.set(ticketId, Number(ticket.totalSeats) || 0);
              detailsMap.set(ticketId, {
                airline: ticket.airline,
                sector: ticket.sector,
                pnr: ticket.pnr,
              });
            }
          );
          setGroupTicketTotalSeats(seatsMap);
          setGroupTicketDetails(detailsMap);
        }

        if (airlineRes.status === "fulfilled") {
          const airlineList =
            airlineRes.value.data?.data || airlineRes.value.data || [];
          const shortCodeMap = new Map<string, string>();
          (airlineList || []).forEach((airline: AirlineData) => {
            if (!airline.airlineName || !airline.shortCode) return;
            shortCodeMap.set(
              airline.airlineName.toLowerCase(),
              airline.shortCode
            );
          });
          setAirlineShortCodeMap(shortCodeMap);
        }

        if (
          bookedSeatsRes.status === "fulfilled" &&
          bookedSeatsRes.value.data?.success
        ) {
          const bookedMap = new Map<string, BookedSeatsData>();
          (
            bookedSeatsRes.value.data?.data?.breakdown?.byGroup || []
          ).forEach((group: BookedSeatsData) => {
            const groupId = getId(group.groupId);
            if (!groupId) return;
            bookedMap.set(groupId, {
              ...group,
              totalSeats: Number(group.totalSeats) || 0,
            });
          });
          setBookedSeatsByGroup(bookedMap);
        }

        if (
          umrahBookingsRes.status === "fulfilled" &&
          umrahBookingsRes.value.data?.success
        ) {
          const fetchedUmrahBookings = umrahBookingsRes.value.data.data || [];
          setUmrahBookings(fetchedUmrahBookings);

          const statusCountMap = new Map<string, UmrahBookingStatusCounts>();
          fetchedUmrahBookings.forEach(
            (booking: UmrahBookingData) => {
              const packageId = getBookingPackageId(booking);

              if (!packageId) return;

              const current = statusCountMap.get(packageId) || {
                pending: 0,
                cancelled: 0,
              };

              if (booking.overallStatus === "Pending") {
                current.pending += 1;
              }

              if (booking.overallStatus === "Cancelled") {
                current.cancelled += 1;
              }

              statusCountMap.set(packageId, current);
            }
          );
          setUmrahBookingStatusCounts(statusCountMap);
        }
      } catch (error) {
        console.error("Error fetching packages:", error);
        toast.error("Failed to fetch packages");
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [canView]);

  const handleTogglePublicStatus = async (
    packageId: string,
    checked: boolean
  ) => {
    if (!canUseActions) {
      toast.error("You don't have permission to manage Umrah packages");
      return;
    }

    const nextStatus: "Public" | "Private" = checked ? "Public" : "Private";
    const previousPackages = packages;

    setPackages((prev) =>
      prev.map((pkg) =>
        pkg._id === packageId ? { ...pkg, internalStatus: nextStatus } : pkg
      )
    );

    try {
      const { data } = await axiosInstance.patch(
        `/umrahpackages/${packageId}/internal-status`,
        { internalStatus: nextStatus }
      );

      if (!data?.success) {
        throw new Error(data?.message || "Failed to update status");
      }

      toast.success(`Package is now ${nextStatus}`);
    } catch (error) {
      console.error("Error updating package status:", error);
      setPackages(previousPackages);
      toast.error("Failed to update package status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!canUseActions) {
      toast.error("You don't have permission to manage Umrah packages");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this package?")) return;

    try {
      await axiosInstance.delete(`/umrahpackages/${id}`);

      setPackages((prev) => prev.filter((pkg) => pkg._id !== id));
      setSelectedPackageIds((prev) => prev.filter((item) => item !== id));

      toast.success("Package deleted successfully");
    } catch (error) {
      console.error("Error deleting package:", error);
      toast.error("Failed to delete package");
    }
  };

  const handleCopyPackage = (pkg: PackageData) => {
    if (!canUseActions) {
      toast.error("You don't have permission to manage Umrah packages");
      return;
    }
    window.open(
      `/admin-portal/create-package/${pkg._id}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleOpenPricingModal = (pkg: PackageData) => {
    if (!canUseActions) {
      toast.error("You don't have permission to manage Umrah packages");
      return;
    }

    const totals = pkg.packageTotals || {};
    const incentive = totals.incentive || 0;

    pricingBaseTotalsRef.current = {
      double: (totals.double || 0) - incentive,
      triple: (totals.triple || 0) - incentive,
      quad: (totals.quad || 0) - incentive,
      shared: (totals.shared || 0) - incentive,
      childWithoutBed: (totals.childWithoutBed || 0) - incentive,
      childWithBed: (totals.childWithBed || 0) - incentive,
      infant: (totals.infant || 0) - incentive,
    };

    setPricingTotals({
      double: totals.double || 0,
      triple: totals.triple || 0,
      quad: totals.quad || 0,
      shared: totals.shared || 0,
      childWithoutBed: totals.childWithoutBed || 0,
      childWithBed: totals.childWithBed || 0,
      infant: totals.infant || 0,
      incentive,
    });

    setPricingPackage(pkg);
    setPricingModalOpen(true);
  };

  const handleClosePricingModal = () => {
    setPricingModalOpen(false);
    setPricingPackage(null);
    setPricingTotals(emptyPackageTotals);
  };

  const handlePricingFieldChange = (
    field: keyof Omit<PackageTotalsForm, "incentive">,
    value: number
  ) => {
    pricingBaseTotalsRef.current = {
      ...pricingBaseTotalsRef.current,
      [field]: value + pricingTotals.incentive,
    };
    setPricingTotals((prev) => ({ ...prev, [field]: value }));
  };

  const handlePricingIncentiveChange = (value: number) => {
    const base = pricingBaseTotalsRef.current;
    setPricingTotals({
      double: base.double + value,
      triple: base.triple + value,
      quad: base.quad + value,
      shared: base.shared + value,
      childWithoutBed: base.childWithoutBed + value,
      childWithBed: base.childWithBed + value,
      infant: base.infant + value,
      incentive: value,
    });
  };

  const handleSavePricing = async () => {
    if (!pricingPackage) return;

    setPricingSaving(true);

    try {
      const { data } = await axiosInstance.patch(
        `/umrahpackages/${pricingPackage._id}/package-totals`,
        { packageTotals: pricingTotals }
      );

      if (!data?.success) {
        throw new Error(data?.message || "Failed to update pricing");
      }

      setPackages((prev) =>
        prev.map((pkg) =>
          pkg._id === pricingPackage._id
            ? { ...pkg, packageTotals: { ...pricingTotals } }
            : pkg
        )
      );

      toast.success("Package pricing updated successfully");
      handleClosePricingModal();
    } catch (error) {
      console.error("Error updating package pricing:", error);
      toast.error("Failed to update package pricing");
    } finally {
      setPricingSaving(false);
    }
  };

  const handleViewBookings = (pkg: PackageData) => {
    const bookingsForPackage = umrahBookings.filter(
      (booking) => getBookingPackageId(booking) === pkg._id
    );
    setSelectedBookingsPackage(pkg);
    setPackageBookings(bookingsForPackage);
    setBookingsModalOpen(true);
  };

  const handleOpenBookingDetails = (bookingId?: string) => {
    if (!bookingId) return;
    window.open(
      `/admin-portal/umrah-pkg-bookings?bookingId=${bookingId}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSelectAll = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedPackageIds(filteredPackages.map((pkg) => pkg._id));
    } else {
      setSelectedPackageIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportPDF = async () => {
    if (selectedPackageIds.length === 0) {
      toast.warning("Please select at least one package to print PDF!");
      return;
    }

    setPdfLoading(true);

    try {
      const selectedData = packages.filter((pkg) =>
        selectedPackageIds.includes(pkg._id)
      );

      const formattedPackagesForPDF: UmrahPackage[] = selectedData.map(
        (pkg) => {
          const seatStats = getPackageSeatStats(pkg);

          return {
            packageName: pkg.packageName,
            logo: pkg.flightLogo || pkg.logo,
            seatSummary: {
              total: seatStats.totalSeats,
              requested: seatStats.pendingBookings,
              confirmed: seatStats.bookedSeats,
              cancelled: seatStats.cancelledBookings,
              remaining: seatStats.remainingSeats,
            },
            packageDuration: pkg.days || 21,
            flights: pkg.flights.map((flight) => ({
              flightNo: flight.flightNo,
              sectorFrom: flight.sectorFrom,
              sectorTo: flight.sectorTo,
              depDate: flight.depDate,
            })),
            hotels: pkg.hotels.map((hotel) => ({
              name: hotel.name,
              city: hotel.location?.city || "-",
              distance: hotel.location?.distance || hotel.distance || "-",
            })),
            packageTotals: {
              double: pkg.packageTotals?.double || 0,
              triple: pkg.packageTotals?.triple || 0,
              quad: pkg.packageTotals?.quad || 0,
              shared: pkg.packageTotals?.shared || 0,
              childWithoutBed: pkg.packageTotals?.childWithoutBed || 0,
              infant: pkg.packageTotals?.infant || 0,
            },
            rooms: {
              sharing: pkg.rooms?.sharing ?? undefined,
              double: pkg.rooms?.double ?? undefined,
              triple: pkg.rooms?.triple ?? undefined,
              quad: pkg.rooms?.quad ?? undefined,
              quint: pkg.rooms?.quint ?? undefined,
            },
          };
        }
      );

      await generateUmrahPackagesPDF(formattedPackagesForPDF);
      toast.success("PDF generated successfully!");
    } catch (error) {
      console.error("Error creating PDF structure:", error);
      toast.error("Failed to compile and download PDF package.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
        You do not have permission to view Umrah Packages.
      </div>
    );
  }

  const isAllSelected =
    filteredPackages.length > 0 &&
    selectedPackageIds.length === filteredPackages.length;

  const getPackageSeatStats = (pkg: PackageData) => {
    const selectedGroupTicketId = getId(
      pkg.selectedGroupTicketId || pkg.groupTicket?._id || pkg.groupTicket?.id
    );
    const linkedTotalSeats =
      groupTicketTotalSeats.get(selectedGroupTicketId) ??
      Number(pkg.groupTicket?.totalSeats || 0);
    const bookedSeats =
      bookedSeatsByGroup.get(selectedGroupTicketId)?.totalSeats || 0;
    const bookingStatusCounts = umrahBookingStatusCounts.get(pkg._id) || {
      pending: 0,
      cancelled: 0,
    };
    const remainingSeats =
      selectedGroupTicketId && linkedTotalSeats >= 0
        ? Math.max(0, linkedTotalSeats - bookedSeats)
        : 0;

    return {
      totalSeats: linkedTotalSeats,
      bookedSeats,
      pendingBookings: bookingStatusCounts.pending,
      cancelledBookings: bookingStatusCounts.cancelled,
      remainingSeats,
    };
  };

  const getPackageGroupTicketInfo = (pkg: PackageData) => {
    const selectedGroupTicketId = getId(
      pkg.selectedGroupTicketId || pkg.groupTicket?._id || pkg.groupTicket?.id
    );
    const ticketInfo = groupTicketDetails.get(selectedGroupTicketId);

    const airlineName = ticketInfo?.airline || pkg.flights?.[0]?.airline || "";
    const airlineShortCode =
      (airlineName && airlineShortCodeMap.get(airlineName.toLowerCase())) ||
      airlineName ||
      "N/A";

    const sector =
      ticketInfo?.sector ||
      (pkg.flights && pkg.flights.length > 0
        ? pkg.flights
          .map((flight) => `${flight.sectorFrom || ""}-${flight.sectorTo || ""}`)
          .join(", ")
        : "") ||
      "N/A";

    const pnr = ticketInfo?.pnr || "N/A";

    return { airlineShortCode, sector, pnr };
  };

  return (
    <ComponentCard title="Manage Umrah Packages">
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Manage Umrah Packages
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Clean package list with pricing, sectors, hotels, transport and
            public status.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:max-w-xl xl:justify-end">
          <button
            onClick={handleExportPDF}
            disabled={pdfLoading || selectedPackageIds.length === 0}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${selectedPackageIds.length === 0
              ? "cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700"
              : "bg-cyan-700 hover:bg-cyan-800 focus:ring-2 focus:ring-cyan-200"
              }`}
          >
            {pdfLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating PDF...
              </span>
            ) : (
              `Export Selected PDF (${selectedPackageIds.length})`
            )}
          </button>

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search packages..."
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20 sm:max-w-sm"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/3">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-200 bg-gray-900 dark:border-white/10 dark:bg-gray-950">
              <TableRow>
                <TableCell isHeader className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableCell>

                {[
                  // "Package Name",
                  "Package Details",
                  "Price",
                  "Hotels",
                  // "Visa Type",
                  // "Public",
                  "Action",
                ].map((header) => (
                  <TableCell
                    key={header}
                    isHeader
                    className={`whitespace-nowrap px-4 py-3 text-start text-sm font-bold text-white ${header === "Action" ? "text-center!" : ""}`}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Loading Packages...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPackages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    {searchTerm.trim()
                      ? "No matching packages found"
                      : "No packages found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPackages.map((pkg) => {
                  const isSelected = selectedPackageIds.includes(pkg._id);
                  const departureRange = getDepartureRange(pkg.flights);
                  // const sectorText = getSectorText(pkg.flights);
                  // const transportAdded = hasTransportInPackage(pkg);
                  const seatStats = getPackageSeatStats(pkg);
                  const groupTicketInfo = getPackageGroupTicketInfo(pkg);

                  return (
                    <TableRow
                      key={pkg._id}
                      className={`border-b border-gray-200 align-top transition last:border-0 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/4 ${isSelected
                        ? "bg-blue-50/60 dark:bg-blue-900/10"
                        : "bg-white dark:bg-transparent"
                        }`}
                    >
                      <TableCell className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(pkg._id)}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </TableCell>

                      {/* <TableCell className="min-w-42.5 px-3 py-4">
                        <div className="flex items-start gap-3">
                          {pkg.logo ? (
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-white/10">
                              <img
                                src={pkg.logo}
                                alt={pkg.packageName}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}

                          <div>
                            <p className="mt-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                              No Of Days
                              <span className="ml-1 font-semibold">
                                {pkg.days || 0}
                              </span>
                            </p>
                          </div>
                        </div>
                      </TableCell> */}

                      <TableCell className="min-w-40 px-3 py-4">
                        <div className="space-y-1 text-sm font-semibold">
                          <p className="text-gray-700 dark:text-gray-300">
                            Sector: {groupTicketInfo.sector}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            Airline: {groupTicketInfo.airlineShortCode}
                          </p>
                          <p className="inline-block px-1.5 py-0.5 bg-linear-to-r from-blue-500 to-blue-600 text-white border-2 border-blue-400 rounded-md text-xs font-mono font-bold">
                            PNR: {groupTicketInfo.pnr}
                          </p>

                          <div className="flex items-start gap-3">
                            {pkg.logo ? (
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-white/10">
                                <img
                                  src={pkg.logo}
                                  alt={pkg.packageName}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : null}

                            <div>
                              <p className="mt-0 text-xs font-bold text-gray-700 dark:text-gray-300">
                                No Of Days
                                <span className="ml-1 font-semibold">
                                  {pkg.days || 0}
                                </span>
                              </p>
                            </div>
                          </div>

                          <p className="text-green-600">
                            Departure: {departureRange.from}
                          </p>
                          <p className="text-red-500">
                            Return: {departureRange.to}
                          </p>

                          <p className="text-xs text-gray-700 dark:text-gray-300">
                            Created At: {formatDate(pkg.createdAt)}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="min-w-90 px-3 py-4">
                        <div className="relative overflow-hidden rounded-md border border-gray-200 dark:border-white/10">
                          <button
                            onClick={() =>
                              canUseActions && handleOpenPricingModal(pkg)
                            }
                            disabled={!canUseActions}
                            className="absolute right-1.5 top-1.5 z-10 flex items-center justify-center rounded-md bg-white p-1 text-blue-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-800 dark:ring-white/10"
                            title={
                              canUseActions
                                ? "Edit Pricing"
                                : "You don't have permission to manage Umrah packages"
                            }
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>

                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-100">
                                <th className="border-b border-gray-200 px-3 py-2 text-left font-extrabold dark:border-white/10">
                                  Type
                                </th>
                                <th className="border-b border-gray-200 px-3 py-2 text-left font-extrabold dark:border-white/10">
                                  Double
                                </th>
                                <th className="border-b border-gray-200 px-3 py-2 text-left font-extrabold dark:border-white/10">
                                  Triple
                                </th>
                                <th className="border-b border-gray-200 px-3 py-2 text-left font-extrabold dark:border-white/10">
                                  Quad
                                </th>
                                <th className="border-b border-gray-200 pl-3 pr-8 py-2 text-left font-extrabold dark:border-white/10">
                                  Shared
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              <tr className="bg-gray-50 dark:bg-white/4">
                                <td className="px-3 py-2 font-extrabold text-green-600">
                                  Selling
                                </td>
                                <td className="px-3 py-2 font-bold text-green-600">
                                  {formatMoney(pkg.packageTotals?.double)}
                                </td>
                                <td className="px-3 py-2 font-bold text-green-600">
                                  {formatMoney(pkg.packageTotals?.triple)}
                                </td>
                                <td className="px-3 py-2 font-bold text-green-600">
                                  {formatMoney(pkg.packageTotals?.quad)}
                                </td>
                                <td className="pl-3 pr-8 py-2 font-bold text-green-600">
                                  {formatMoney(pkg.packageTotals?.shared)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-md border border-gray-200 dark:border-white/10">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-100">
                                <th className="px-3 py-2 text-left font-extrabold">
                                  Tot.
                                </th>
                                {/* <th className="px-3 py-2 text-left font-extrabold">
                                  Req
                                </th> */}
                                <th className="px-3 py-2 text-left font-extrabold text-green-600">
                                  Con
                                </th>
                                <th className="px-3 py-2 text-left font-extrabold text-red-500">
                                  Can
                                </th>
                                <th className="px-3 py-2 text-left font-extrabold">
                                  Rem
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              <tr className="bg-gray-50 text-gray-700 dark:bg-white/4 dark:text-gray-300">
                                <td className="px-3 py-2">
                                  {seatStats.totalSeats}
                                </td>
                                {/* <td className="px-3 py-2">
                                  {seatStats.pendingBookings}
                                </td> */}
                                <td className="px-3 py-2">
                                  {seatStats.bookedSeats}
                                </td>
                                <td className="px-3 py-2">
                                  {seatStats.cancelledBookings}
                                </td>
                                <td className="px-3 py-2">
                                  {seatStats.remainingSeats}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </TableCell>

                      <TableCell className="min-w-105 px-3 py-4">
                        {/* <p className="mb-4 text-sm font-extrabold uppercase text-gray-900 dark:text-gray-100">
                          {sectorText}
                        </p> */}

                        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-white/10">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-100">
                                <th className="border-b border-gray-200 px-3 py-2 text-left font-extrabold dark:border-white/10">
                                  Hotel
                                </th>
                                <th className="border-b border-gray-200 px-3 py-2 text-left font-extrabold dark:border-white/10">
                                  City
                                </th>
                                <th className="border-b border-gray-200 px-3 py-2 text-left font-extrabold dark:border-white/10">
                                  Distance
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {pkg.hotels && pkg.hotels.length > 0 ? (
                                pkg.hotels.map((hotel, index) => (
                                  <tr
                                    key={`${hotel.name}-${index}`}
                                    className={
                                      index % 2 === 0
                                        ? "bg-white dark:bg-transparent"
                                        : "bg-gray-50 dark:bg-white/4"
                                    }
                                  >
                                    <td className="border-b border-gray-200 px-3 py-2 font-bold uppercase text-gray-700 last:border-b-0 dark:border-white/10 dark:text-gray-300">
                                      {hotel.name || "N/A"}
                                    </td>
                                    <td className="border-b border-gray-200 px-3 py-2 font-bold uppercase text-gray-700 last:border-b-0 dark:border-white/10 dark:text-gray-300">
                                      {hotel.location?.city || "N/A"}
                                    </td>
                                    <td className="border-b border-gray-200 px-3 py-2 font-bold text-gray-700 last:border-b-0 dark:border-white/10 dark:text-gray-300">
                                      {hotel.location?.distance ||
                                        hotel.distance ||
                                        "N/A"}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="px-3 py-4 text-center text-gray-500"
                                  >
                                    No hotel data
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>

                      {/* <TableCell className="min-w-32.5 px-3 py-4">
                        <div className="space-y-2">
                          {transportAdded ? (
                            <span className="whitespace-nowrap inline-flex rounded-md bg-gray-800 px-2.5 py-1 text-xs font-extrabold text-white dark:bg-gray-700">
                              With Transport
                            </span>
                          ) : (
                            <span className="inline-flex rounded-md bg-gray-100 px-2.5 py-1 text-xs font-extrabold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                              No Transport
                            </span>
                          )}
                        </div>
                      </TableCell> */}

                      {/* <TableCell className="px-3 py-4">
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={(pkg.internalStatus || "Public") === "Public"}
                            onChange={(event) =>
                              handleTogglePublicStatus(
                                pkg._id,
                                event.target.checked
                              )
                            }
                            disabled={!canUseActions}
                            className="peer sr-only"
                          />

                          <div className="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
                        </label>
                      </TableCell> */}

                      <TableCell className="px-3 py-4">
                        <div className="flex flex-col-reverse gap-2">
                          <div className="flex items-center justify-center gap-2">
                            <label className="relative inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={(pkg.internalStatus || "Public") === "Public"}
                                onChange={(event) =>
                                  handleTogglePublicStatus(
                                    pkg._id,
                                    event.target.checked
                                  )
                                }
                                disabled={!canUseActions}
                                className="peer sr-only"
                              />

                              <div className="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
                            </label>
                            <span
                              className={`text-xs font-semibold ${(pkg.internalStatus || "Public") === "Public"
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500 dark:text-gray-400"
                                }`}
                            >
                              {pkg.internalStatus || "Public"}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              canUseActions &&
                              handleViewBookings(pkg)
                            }
                            className="rounded-lg whitespace-nowrap bg-emerald-600 px-3 py-2 text-xs font-semibold text-white dark:text-emerald-400 transition-colors hover:bg-emerald-700 dark:bg-emerald-500/10"
                            title="View Umrah bookings for this package"
                          >
                            View Bookings
                          </button>

                          <div className="flex flex-1 gap-1">
                            <button
                              onClick={() =>
                                canUseActions &&
                                window.open(
                                  `/admin-portal/update-umrah-package/${pkg._id}`,
                                  "_blank"
                                )
                              }
                              disabled={!canUseActions}
                              className="flex justify-center flex-1 rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-500/10"
                              title={
                                canUseActions
                                  ? "Edit"
                                  : "You don't have permission to manage Umrah packages"
                              }
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleCopyPackage(pkg)}
                              disabled={!canUseActions}
                              className="flex justify-center flex-1 rounded-lg bg-purple-50 p-2 text-purple-600 transition-colors hover:bg-purple-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-purple-500/10"
                              title={
                                canUseActions
                                  ? "Copy Package: open the create form pre-filled with this package's data"
                                  : "You don't have permission to manage Umrah packages"
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(pkg._id)}
                              disabled={!canUseActions}
                              className="flex justify-center flex-1 rounded-lg bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-red-500/10"
                              title={
                                canUseActions
                                  ? "Delete"
                                  : "You don't have permission to manage Umrah packages"
                              }
                            >
                              <TrashBinIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal
        isOpen={bookingsModalOpen}
        onClose={() => {
          setBookingsModalOpen(false);
          setSelectedBookingsPackage(null);
          setPackageBookings([]);
        }}
        className="max-w-7xl"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-5 pr-12">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Umrah Package Bookings
            </p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">
              {selectedBookingsPackage?.packageName || "Package"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {packageBookings.length} booking
              {packageBookings.length === 1 ? "" : "s"} found for this package
            </p>
          </div>

          {packageBookings.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-10 text-center text-sm text-gray-500">
              No Umrah package bookings found for this package.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-230 border-collapse bg-white text-sm">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      {[
                        "Booking",
                        "Booked On",
                        "Agent",
                        "Passengers",
                        "Final Price",
                        "Payment",
                        "Status",
                        "Action",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {packageBookings.map((booking) => {
                      const passengerCount = booking.passengerCount || {};
                      const currency = booking.pricing?.currency || "PKR";
                      const totalPrice =
                        booking.pricing?.totalPrice ??
                        booking.paymentStatus?.totalAmount ??
                        0;

                      return (
                        <tr key={booking._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-900">
                              BK# {booking.bookingNumber || "N/A"}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-gray-500">
                              {booking.roomType || "Package"}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-semibold text-gray-700">
                            {formatDate(booking.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-900">
                              {booking.user?.companyName ||
                                booking.user?.name ||
                                "N/A"}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {booking.user?.email || ""}
                            </div>
                            {booking.user?.phone ? (
                              <div className="mt-0.5 text-xs text-gray-500">
                                {booking.user.phone}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <div className="inline-grid grid-cols-4 overflow-hidden rounded-lg border border-gray-200 text-center text-xs">
                              {[
                                ["Adt", passengerCount.adults || 0],
                                ["Chd", passengerCount.children || 0],
                                ["Inf", passengerCount.infants || 0],
                                ["Tot", passengerCount.total || 0],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  className="min-w-10 border-r border-gray-200 px-2 py-1.5 last:border-r-0"
                                >
                                  <div className="font-bold text-gray-400">
                                    {label}
                                  </div>
                                  <div className="font-black text-gray-800">
                                    {value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-black text-emerald-700">
                            {currency} {Number(totalPrice).toLocaleString("en-PK")}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClass(
                                booking.paymentStatus?.status
                              )}`}
                            >
                              {booking.paymentStatus?.status || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClass(
                                booking.overallStatus
                              )}`}
                            >
                              {booking.overallStatus || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleOpenBookingDetails(booking._id)}
                              className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white"
                            >
                              <EyeIcon className="h-3 w-3" /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={pricingModalOpen}
        onClose={handleClosePricingModal}
        className="max-w-4xl"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-5 pr-12">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              Edit Pricing
            </p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">
              {pricingPackage?.packageName || "Package"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Update the Package Totals (Selling) for this package.
            </p>
          </div>

          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-green-600 text-white px-4 py-2">
              <h4 className="text-sm font-semibold">
                Package Totals (Selling)
              </h4>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {pricingFieldsConfig.map((field) => (
                  <div
                    key={field.key}
                    className="border rounded overflow-hidden"
                  >
                    <div className={`${field.headerClass} text-white px-3 py-2`}>
                      <span className="text-xs font-bold">{field.label}</span>
                    </div>
                    <div className="p-3">
                      <label className="block text-xs mb-1">
                        {field.subLabel}
                      </label>
                      <div className="flex items-center border rounded overflow-hidden h-9">
                        <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">
                          PKR
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={pricingTotals[field.key].toLocaleString(
                            "en-PK"
                          )}
                          onChange={(event) =>
                            handlePricingFieldChange(
                              field.key,
                              parseFormattedNumber(event.target.value)
                            )
                          }
                          className="flex-1 p-2 text-xs bg-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Incentive */}
                <div className="border rounded overflow-hidden">
                  <div className="bg-orange-500 text-white px-3 py-2">
                    <span className="text-xs font-bold">Incentive</span>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs mb-1">
                      Incentive Amount (PKR)
                    </label>
                    <div className="flex items-center border rounded overflow-hidden h-9">
                      <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">
                        PKR
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={pricingTotals.incentive.toLocaleString(
                          "en-PK"
                        )}
                        onChange={(event) =>
                          handlePricingIncentiveChange(
                            parseFormattedNumber(event.target.value)
                          )
                        }
                        className="flex-1 p-2 text-xs bg-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-orange-300 pt-3">
                <p className="text-xs text-orange-600 font-semibold mb-2">
                  * Incentive (PKR {pricingTotals.incentive.toLocaleString()})
                  is included in all room totals above
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={handleClosePricingModal}
              disabled={pricingSaving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePricing}
              disabled={pricingSaving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pricingSaving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </span>
              ) : (
                "Save Pricing"
              )}
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer style={{ zIndex: 9999999 }} />
    </ComponentCard>
  );
};

export default ManageUmrahPackage;