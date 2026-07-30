import { useFormik, FormikHelpers } from "formik";
import * as Yup from "yup";
import { useState, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../Api/axios";
import ComponentCard from "../components/common/ComponentCard";
import { useParams, useNavigate } from "react-router";
import CreatableSelect from "react-select/creatable";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useAccountsList from "../context/useAccountsList";
import currency_list from "../data/currencies";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

interface Flight {
  airline: string;
  flightNo: string;
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
  sectorFrom: string;
  sectorTo: string;
  fromTerminal?: string;
  toTerminal?: string;
  flightClass?: string;
  baggage?: string;
  meal?: string;
}

interface GroupTicketing {
  _id: string;
  groupBookingId: string;
  groupName?: string;
  sector?: string;
  totalSeats: number;
  groupType: string;
  flights: Flight[];
  pnr?: string;
  user?: { name: string; _id: string };
  price?: {
    buyingCurrency: string;
    buyingAdultPrice: number;
    buyingChildPrice: number;
    buyingInfantPrice: number;
    sellingCurrencyB2B: string;
    sellingAdultPriceB2B: number;
    sellingChildPriceB2B: number;
    sellingInfantPriceB2B: number;
  };
}

type GroupTicketPrice = NonNullable<GroupTicketing["price"]>;

interface SupplierAccount {
  name: string;
  _id: string;
}

interface Rooms {
  sharing: string;
  quad: string;
  quint: string;
  triple: string;
  double: string;
  childWithoutPackage: string;
  InfantWithoutPackage: string;
}

interface RoomPricing {
  buyingPrice: number;
  buyingRoe: number;
  buyingCurrency: string;
  sellingPrice: number;
  sellingRoe: number;
  sellingCurrency: string;
}

interface HotelForm {
  name: string;
  supplier: SupplierAccount;
  location: {
    city: string;
    distance?: string;
    mapUrl?: string;
  };
  rating: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  nightCount?: number;
  buyingPrice?: number;
  buyingRoe?: number;
  buyingCurrency?: string;
  sellingPrice?: number;
  sellingRoe?: number;
  sellingCurrency?: string;
  currency?: string;
  doubleRoom: RoomPricing;
  tripleRoom: RoomPricing;
  quadRoom: RoomPricing;
  sharedRoom: RoomPricing;
}

interface Transport {
  route: string;
  supplier: SupplierAccount;
  transportType: string;
}

interface Visa {
  visaId: string;
  visaType: string;
  supplier: SupplierAccount;
  withTransport: boolean;
  buyingPrice: number;
  buyingRoe: number;
  buyingCurrency: string;
  sellingPrice: number;
  sellingRoe: number;
  sellingCurrency: string;
  currency: string;
}

interface HotelOption {
  value: string;
  label: string;
  data?: {
    hotelName: string;
    city?: string;
    distance?: number;
    rating?: number;
    mapUrl?: string;
    buyingPrice?: number;
    buyingRoe?: number;
    buyingCurrency?: string;
    sellingPrice?: number;
    sellingRoe?: number;
    sellingCurrency?: string;
    currency?: string;
  };
}

interface TransportOption {
  value: string;
  label: string;
  data?: {
    route: string;
    transportType?: string;
  };
}

interface VisaOption {
  value: string;
  label: string;
  data?: {
    visaType: string;
    withTransport: boolean;
    buyingPrice: number;
    buyingRoe: number;
    buyingCurrency: string;
    sellingPrice: number;
    sellingRoe: number;
    sellingCurrency: string;
    currency: string;
  };
}

// ✅ Profit Breakdown Interface
interface ProfitBreakdown {
  flightCost: number;
  hotelCost: number;
  transportCost: number;
  visaCost: number;
  totalCost: number;
  sellingPrice: number;
  profit: number;
  profitPercentage: number;
  roomProfitBreakdown: {
    sharing: number;
    double: number;
    triple: number;
    quad: number;
    quint: number;
    childWithoutPackage: number;
    infantWithoutPackage: number;
  };
}

interface FormValues {
  packageName: string;
  selectedGroupTicketId: string;
  logo: string;
  flightLogo: string;
  flights: Flight[];
  hotels: HotelForm[];
  transports: Transport[];
  visa: Visa | null;
  rooms: Rooms;
  availableRooms?: number;
  days?: number;
}

const TRANSPORT_TYPES = [
  "Bus",
  "Van",
  "Car",
  "Coaster",
  "Hiace",
  "Mini Bus",
  "Other",
];

const UpdateUmrahPackage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const canCreate = hasPermission(user, "create_umrah_package");
  const canManage = hasPermission(user, "umrah_packages_action_buttons");
  const canAccess = id ? canManage : canCreate;
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [flightLogoPreview, setFlightLogoPreview] = useState<string>("");
  const [umrahGroups, setUmrahGroups] = useState<GroupTicketing[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hotelOptions, setHotelOptions] = useState<HotelOption[]>([]);
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  const [visaOptions, setVisaOptions] = useState<VisaOption[]>([]);
  const [profitBreakdown, setProfitBreakdown] = useState<ProfitBreakdown | null>(null);
  console.log(profitBreakdown)
  const [editableGroupPrice, setEditableGroupPrice] = useState<GroupTicketPrice | null>(null);
  const [packageTotals, setPackageTotals] = useState({ double: 0, triple: 0, quad: 0, shared: 0, childWithoutBed: 0, infant: 0, incentive: 0 });
  const baseTotalsRef = useRef({ double: 0, triple: 0, quad: 0, shared: 0, childWithoutBed: 0, infant: 0 });
  const originalGroupPriceRef = useRef<GroupTicketPrice | null>(null);
  const packageTotalsAutoSyncLockedRef = useRef(false);
  const [internalStatus, setInternalStatus] = useState<"Public" | "Private">("Public");
  // Tracks how many more sync-effect skips are needed after initial load
  const skipSyncCountRef = useRef(0);
  const { data3 = [] } = useAccountsList();

  const supplierOptions = data3.map((account: any) => ({
    value: account._id,
    label: account.account_name,
  }));

  const toSupplier = (option?: { value: string; label: string } | null): SupplierAccount => ({
    _id: option?.value || "",
    name: option?.label || "",
  });

  const getSupplierSelectValue = (supplier?: SupplierAccount) => {
    if (!supplier?.name && !supplier?._id) return null;
    return { value: supplier._id || supplier.name, label: supplier.name };
  };

  const parseFormattedNumber = (value: string) => {
    const normalized = value.replace(/,/g, "").trim();
    return normalized === "" ? 0 : Number(normalized);
  };

  const lockPackageTotalsAutoSync = () => {
    packageTotalsAutoSyncLockedRef.current = true;
  };

  useEffect(() => {
    fetchUmrahGroups();
    if (id) {
      fetchPackageDetails(id);
    }
    axiosInstance.get("/hotels/all").then((res) => {
      if (res.data.success) {
        setHotelOptions(
          (res.data.data || []).map((h: any) => ({
            value: h._id,
            label: h.hotelName,
            data: {
              hotelName: h.hotelName,
              city: h.city,
              distance: h.distance,
              rating: h.rating,
              mapUrl: h.mapUrl,
              buyingPrice: h.buyingPrice,
              buyingRoe: h.buyingRoe || 1,
              buyingCurrency: h.buyingCurrency || h.currency || "PKR",
              sellingPrice: h.sellingPrice,
              sellingRoe: h.sellingRoe || 1,
              sellingCurrency: h.sellingCurrency || h.currency || "PKR",
              currency: h.currency,
            }
          }))
        );
      }
    }).catch((err) => console.error("Error fetching hotels:", err));

    axiosInstance.get("/transports/all").then((res) => {
      if (res.data.success) {
        setTransportOptions(
          (res.data.data || []).map((t: any) => ({ value: t._id, label: t.route, data: t }))
        );
      }
    }).catch((err) => console.error("Error fetching transports:", err));

    axiosInstance.get("/visas/all").then((res) => {
      if (res.data.success) {
        setVisaOptions(
          (res.data.data || []).map((v: any) => ({
            value: v._id,
            label: `${v.visaType} ${v.withTransport ? '(With Transport)' : '(Without Transport)'}`,
            data: v
          }))
        );
      }
    }).catch((err) => console.error("Error fetching visas:", err));
  }, [id]);

  const fetchUmrahGroups = async () => {
    try {
      setLoadingGroups(true);
      const response = await axiosInstance.get("/group-ticketing");
      if (response.data.success) {
        setUmrahGroups(
          response.data.data.filter(
            (group: GroupTicketing) => group.groupType === "Umrah Groups",
          ),
        );
      }
    } catch (error) {
      console.error("Error fetching Umrah groups:", error);
      toast.error("Failed to load Umrah groups");
    } finally {
      setLoadingGroups(false);
    }
  };

  const getSelectedGroupTicket = (groupId: string) =>
    umrahGroups.find((group) => group._id === groupId) || null;

  const normalizeFlightDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value.slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  };

  const getFlightMatchKey = (flight: Flight) =>
    [
      flight.flightNo || "",
      flight.sectorFrom || "",
      flight.sectorTo || "",
      normalizeFlightDate(flight.depDate),
      normalizeFlightDate(flight.arrDate),
    ].join("|");

  const findMatchingGroupTicketId = (flights: Flight[]) => {
    if (!flights.length) return "";
    const packageKeys = flights.map(getFlightMatchKey).sort().join("##");

    const matchedGroup = umrahGroups.find((group) => {
      const groupKeys = (group.flights || []).map(getFlightMatchKey).sort().join("##");
      return groupKeys === packageKeys;
    });

    return matchedGroup?._id || "";
  };

  const formatFlightDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString("en-GB");
  };

  const formatGroupTicketPrice = (value?: number, currency?: string) => {
    if (typeof value !== "number") return "-";
    if (!currency || currency === "SAR") {
      return value.toLocaleString();
    }
    return `${currency} ${value.toLocaleString()}`;
  };

  const getActiveGroupPrice = (group?: GroupTicketing | null) => editableGroupPrice ?? group?.price ?? null;

  const recalculatePackageTotalsFromCurrentState = (priceOverride?: GroupTicketPrice | null) => {
    const selectedGroup = getSelectedGroupTicket(formik.values.selectedGroupTicketId);
    const activeGroupPrice = priceOverride ?? getActiveGroupPrice(selectedGroup);

    if (!selectedGroup || !activeGroupPrice) {
      return;
    }

    const flightSellingPrice = activeGroupPrice.sellingAdultPriceB2B || 0;
    const childSellingPrice = activeGroupPrice.sellingChildPriceB2B || 0;
    const infantSellingPrice = activeGroupPrice.sellingInfantPriceB2B || 0;
    const visaSellingPKR = formik.values.visa
      ? (formik.values.visa.sellingPrice || 0) * (formik.values.visa.sellingRoe || 1)
      : 0;
    const hotelTotals = { double: 0, triple: 0, quad: 0, shared: 0 };

    formik.values.hotels.forEach((hotel) => {
      const nights = hotel.nights || 0;
      hotelTotals.double += (hotel.doubleRoom.sellingPrice || 0) * (hotel.doubleRoom.sellingRoe || 1) * nights;
      hotelTotals.triple += (hotel.tripleRoom.sellingPrice || 0) * (hotel.tripleRoom.sellingRoe || 1) * nights;
      hotelTotals.quad += (hotel.quadRoom.sellingPrice || 0) * (hotel.quadRoom.sellingRoe || 1) * nights;
      hotelTotals.shared += (hotel.sharedRoom.sellingPrice || 0) * (hotel.sharedRoom.sellingRoe || 1) * nights;
    });

    const base = {
      double: Math.round(flightSellingPrice + hotelTotals.double + visaSellingPKR),
      triple: Math.round(flightSellingPrice + hotelTotals.triple + visaSellingPKR),
      quad: Math.round(flightSellingPrice + hotelTotals.quad + visaSellingPKR),
      shared: Math.round(flightSellingPrice + hotelTotals.shared + visaSellingPKR),
      childWithoutBed: Math.round(childSellingPrice + visaSellingPKR),
      infant: Math.round(infantSellingPrice + visaSellingPKR),
    };

    baseTotalsRef.current = base;
    setPackageTotals((prev) => ({
      double: base.double + prev.incentive,
      triple: base.triple + prev.incentive,
      quad: base.quad + prev.incentive,
      shared: base.shared + prev.incentive,
      childWithoutBed: prev.childWithoutBed === 0 ? prev.childWithoutBed : base.childWithoutBed + prev.incentive,
      infant: prev.infant === 0 ? prev.infant : base.infant + prev.incentive,
      incentive: prev.incentive,
    }));
  };

  const updateEditableGroupPrice = (field: keyof GroupTicketPrice, value: number) => {
    setEditableGroupPrice((prev) => {
      const selectedGroup = getSelectedGroupTicket(formik.values.selectedGroupTicketId);
      const currentPrice = prev ?? selectedGroup?.price;
      if (!currentPrice) return prev;

      const nextPrice: GroupTicketPrice = { ...currentPrice, [field]: value };
      if (field === "sellingAdultPriceB2B") {
        recalculatePackageTotalsFromCurrentState(nextPrice);
      } else if (field === "sellingChildPriceB2B") {
        setPackageTotals((prevTotals) =>
          prevTotals.childWithoutBed === 0
            ? prevTotals
            : {
                ...prevTotals,
                childWithoutBed: Math.round(value + (formik.values.visa ? (formik.values.visa.sellingPrice || 0) * (formik.values.visa.sellingRoe || 1) : 0) + prevTotals.incentive),
              },
        );
      } else if (field === "sellingInfantPriceB2B") {
        setPackageTotals((prevTotals) =>
          prevTotals.infant === 0
            ? prevTotals
            : {
                ...prevTotals,
                infant: Math.round(value + (formik.values.visa ? (formik.values.visa.sellingPrice || 0) * (formik.values.visa.sellingRoe || 1) : 0) + prevTotals.incentive),
              },
        );
      }
      return nextPrice;
    });
  };

  // ✅ Profit Calculation Function
  const calculateProfitBreakdown = (values: FormValues): ProfitBreakdown | null => {
    try {
      // Get selected group for flight cost
      const selectedGroup = getSelectedGroupTicket(values.selectedGroupTicketId);
      const activeGroupPrice = getActiveGroupPrice(selectedGroup);
      if (!selectedGroup || !activeGroupPrice) return null;

      // Flight Cost (from group ticketing) - Using buying adult price as base cost
      const flightCost = activeGroupPrice.buyingAdultPrice || 0;

      // Hotel Cost Calculation - Sum of (nights * buying price per night)
      let hotelBuyingCost = 0;
      let hotelSellingPrice = 0;
      values.hotels.forEach(hotel => {
        const nights = hotel.nights || 0;
        const buyingPrice = hotel.buyingPrice || 0;
        const sellingPrice = hotel.sellingPrice || 0;
        hotelBuyingCost += nights * buyingPrice;
        hotelSellingPrice += nights * sellingPrice;
      });

      // Transport Cost Calculation (placeholder - can be updated based on actual transport pricing)
      let transportCost = 0;
      values.transports.forEach(() => {
        transportCost += 0; // Set to 0 or add actual transport cost if available
      });

      // Visa Cost
      const visaBuyingCost = values.visa?.buyingPrice || 0;
      const visaSellingPrice = values.visa?.sellingPrice || 0;

      // Total Buying Cost per person
      const totalBuyingCostPerPerson = flightCost + hotelBuyingCost + transportCost + visaBuyingCost;


      // Calculate total selling price from ticket, hotel, and visa
      const flightSellingPrice = activeGroupPrice.sellingAdultPriceB2B || 0;
      const totalSellingPricePerPerson = flightSellingPrice + hotelSellingPrice + transportCost + visaSellingPrice;

      // Calculate total cost (buying) for all people
      // Assuming each room type is priced per person
      const totalNumberOfPeople = 1; // Simplified - each room price represents per person package
      const totalCost = totalBuyingCostPerPerson * totalNumberOfPeople;
      const totalSellingPrice = totalSellingPricePerPerson * totalNumberOfPeople;

      // Profit calculation
      const profit = totalSellingPrice - totalCost;
      const profitPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      return {
        flightCost: flightCost,
        hotelCost: hotelBuyingCost,
        transportCost: transportCost,
        visaCost: visaBuyingCost,
        totalCost: totalCost,
        sellingPrice: totalSellingPrice,
        profit: profit,
        profitPercentage: profitPercentage,
        roomProfitBreakdown: {
          sharing: 0,
          double: 0,
          triple: 0,
          quad: 0,
          quint: 0,
          childWithoutPackage: 0,
          infantWithoutPackage: 0,
        },
      };
    } catch (error) {
      console.error("Error calculating profit:", error);
      return null;
    }
  };

  const fetchPackageDetails = async (packageId: string) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/umrahpackages/${packageId}`);
      if (res.data.success) {
        const data = res.data.package;

        const formattedFlights = data.flights?.map((f: any) => ({
          airline: f.airline || "",
          flightNo: f.flightNo || "",
          depDate: f.depDate ? f.depDate.slice(0, 10) : "",
          depTime: f.depTime || "",
          arrDate: f.arrDate ? f.arrDate.slice(0, 10) : "",
          arrTime: f.arrTime || "",
          sectorFrom: f.sectorFrom || "",
          sectorTo: f.sectorTo || "",
          fromTerminal: f.fromTerminal || "",
          toTerminal: f.toTerminal || "",
          flightClass: f.flightClass || "",
          baggage: f.baggage || "",
          meal: f.meal || ""
        })) || [];

        const formattedTransports = data.transports?.map((t: any) => ({
          route: t.route || "",
          supplier: {
            _id: t.supplier?._id || "",
            name: t.supplier?.name || (typeof t.supplier === "string" ? t.supplier : ""),
          },
          transportType: t.transportType || "",
        })) || [];

        const defaultRoom = (): RoomPricing => ({ buyingPrice: 0, buyingRoe: 1, buyingCurrency: "PKR", sellingPrice: 0, sellingRoe: 1, sellingCurrency: "PKR" });

        const formattedHotels = (data.hotels || []).map((h: any) => ({
          name: h.name || "",
          supplier: {
            _id: h.supplier?._id || "",
            name: h.supplier?.name || (typeof h.supplier === "string" ? h.supplier : ""),
          },
          location: {
            city: h.location?.city || "",
            distance: h.location?.distance || "",
            mapUrl: h.location?.mapUrl || "",
          },
          rating: Number(h.rating || 0),
          checkIn: h.checkIn ? h.checkIn.slice(0, 10) : "",
          checkOut: h.checkOut ? h.checkOut.slice(0, 10) : "",
          nights: Number((h.nights ?? h.nightCount) || 0),
          nightCount: Number((h.nights ?? h.nightCount) || 0),
          buyingPrice: h.buyingPrice ?? undefined,
          buyingRoe: h.buyingRoe ?? 1,
          buyingCurrency: h.buyingCurrency || "PKR",
          sellingPrice: h.sellingPrice ?? undefined,
          sellingRoe: h.sellingRoe ?? 1,
          sellingCurrency: h.sellingCurrency || "PKR",
          currency: h.currency || "PKR",
          doubleRoom: h.doubleRoom ? { ...defaultRoom(), ...h.doubleRoom } : defaultRoom(),
          tripleRoom: h.tripleRoom ? { ...defaultRoom(), ...h.tripleRoom } : defaultRoom(),
          quadRoom: h.quadRoom ? { ...defaultRoom(), ...h.quadRoom } : defaultRoom(),
          sharedRoom: h.sharedRoom ? { ...defaultRoom(), ...h.sharedRoom } : defaultRoom(),
        }));

        const formattedVisa = data.visa ? {
          visaId: data.visa.visaId || "",
          visaType: data.visa.visaType || "",
          supplier: {
            _id: data.visa.supplier?._id || "",
            name: data.visa.supplier?.name || "",
          },
          withTransport: data.visa.withTransport || false,
          buyingPrice: data.visa.buyingPrice || 0,
          buyingRoe: data.visa.buyingRoe || 1,
          buyingCurrency: data.visa.buyingCurrency || data.visa.currency || "PKR",
          sellingPrice: data.visa.sellingPrice || 0,
          sellingRoe: data.visa.sellingRoe || 1,
          sellingCurrency: data.visa.sellingCurrency || data.visa.currency || "PKR",
          currency: data.visa.currency || "PKR",
        } : null;

        formik.setValues({
          packageName: data.packageName || "",
          selectedGroupTicketId: data.selectedGroupTicketId || "",
          logo: data.logo || "",
          flightLogo: data.flightLogo || "",
          flights: formattedFlights,
          hotels: formattedHotels.length ? formattedHotels : [],
          transports: formattedTransports,
          visa: formattedVisa,
          rooms: data.rooms || {
            sharing: "", quad: "", quint: "", triple: "", double: "",
            childWithoutPackage: "", InfantWithoutPackage: ""
          },
          availableRooms: data.availableRooms || 0,
          days: data.days || 0
        });

        if (data.packageTotals) {
          const inc = data.packageTotals.incentive || 0;
          const base = {
            double: (data.packageTotals.double || 0) - inc,
            triple: (data.packageTotals.triple || 0) - inc,
            quad: (data.packageTotals.quad || 0) - inc,
            shared: (data.packageTotals.shared || 0) - inc,
            childWithoutBed: (data.packageTotals.childWithoutBed || 0) - inc,
            infant: (data.packageTotals.infant || 0) - inc,
          };
          baseTotalsRef.current = base;
          setPackageTotals({
            double: data.packageTotals.double || 0,
            triple: data.packageTotals.triple || 0,
            quad: data.packageTotals.quad || 0,
            shared: data.packageTotals.shared || 0,
            childWithoutBed: data.packageTotals.childWithoutBed || 0,
            infant: data.packageTotals.infant || 0,
            incentive: inc,
          });
          // Mark initial load as done so the sync effect won't overwrite saved values
          // The effect fires multiple times during load (formik values + umrahGroups arriving),
          // so we skip 2 times to cover both triggers.
          skipSyncCountRef.current = 2;
        }

        if (data.internalStatus) setInternalStatus(data.internalStatus);

        if (data.logo) setLogoPreview(data.logo);
        if (data.flightLogo) setFlightLogoPreview(data.flightLogo);
      }
    } catch (error) {
      console.error("Error fetching package:", error);
      toast.error("Failed to load package details");
    } finally {
      setLoading(false);
    }
  };

  const formik = useFormik<FormValues>({
    initialValues: {
      packageName: "",
      selectedGroupTicketId: "",
      logo: "",
      flightLogo: "",
      flights: [],
      hotels: [],
      transports: [],
      visa: null,
      rooms: {
        sharing: "",
        quad: "",
        quint: "",
        triple: "",
        double: "",
        childWithoutPackage: "",
        InfantWithoutPackage: "",
      },
      availableRooms: 0,
      days: 0,
    },
    validationSchema: Yup.object({
      packageName: Yup.string().required("Package name is required"),
      selectedGroupTicketId: Yup.string().required("Umrah group is required"),
      logo: Yup.string(),
      flightLogo: Yup.string(),
      hotels: Yup.array().min(1, "Select at least one hotel"),
      visa: Yup.object().nullable().required("Visa is required"),
      availableRooms: Yup.number().min(0),
      days: Yup.number().min(0),
    }),
    onSubmit: async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
      if (!canAccess) {
        toast.error(id ? "You don't have permission to update Umrah packages" : "You don't have permission to create Umrah packages");
        return;
      }

      try {
        const selectedGroup = getSelectedGroupTicket(values.selectedGroupTicketId);
        const logoFile = (document.getElementById("logoInput") as HTMLInputElement)?.files?.[0];
        const flightLogoFile = (document.getElementById("flightLogoInput") as HTMLInputElement)?.files?.[0];

        if (!selectedGroup) {
          toast.error("Please select an Umrah group");
          return;
        }
        if (!selectedGroup.flights?.length) {
          toast.error("Selected Umrah group has no flights");
          return;
        }

        const hasEmptyHotel = values.hotels.some(hotel => !hotel.name || !hotel.location.city);
        if (hasEmptyHotel) {
          toast.error("Please fill hotel name and city for all hotels");
          return;
        }

        const hasMissingHotelSupplier = values.hotels.some(
          (hotel) => !hotel.supplier?.name,
        );
        if (hasMissingHotelSupplier) {
          toast.error("Please select supplier for all hotels");
          return;
        }

        const hasMissingTransportSupplier = values.transports.some(
          (transport) => !transport.supplier?.name,
        );
        if (hasMissingTransportSupplier) {
          toast.error("Please select supplier for all transports");
          return;
        }

        const formData = new FormData();
        if (logoFile) {
          formData.append("logo", logoFile);
        }
        if (flightLogoFile) {
          formData.append("flightLogo", flightLogoFile);
        }
        formData.append("packageName", values.packageName);
        formData.append("availableRooms", values.availableRooms?.toString() || "0");
        formData.append("days", values.days?.toString() || "0");
        formData.append("flights", JSON.stringify(selectedGroup.flights));
        formData.append("hotels", JSON.stringify(values.hotels));
        formData.append("transports", JSON.stringify(values.transports));
        formData.append("visa", JSON.stringify(values.visa));
        formData.append("rooms", JSON.stringify(values.rooms));
        formData.append("selectedGroupTicketId", values.selectedGroupTicketId);
        formData.append("packageTotals", JSON.stringify(packageTotals));
        formData.append("internalStatus", internalStatus);

        const res = await (id
          ? axiosInstance.put(`/umrahpackages/${id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          : axiosInstance.post("/umrahpackages/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          }));

        toast.success(id ? "Package updated successfully!" : "Package successfully submitted!");
        console.log(id ? "Package updated:" : "Package created:", res.data.package);

        if (!id) {
          resetForm();
          setLogoPreview("");
          setFlightLogoPreview("");
          const logoInput = document.getElementById("logoInput") as HTMLInputElement;
          const flightLogoInput = document.getElementById("flightLogoInput") as HTMLInputElement;
          if (logoInput) logoInput.value = "";
          if (flightLogoInput) flightLogoInput.value = "";
        } else {
          setTimeout(() => navigate("/manage-package"), 1500);
        }
      } catch (error: any) {
        console.error(error);
        const errorMessage = error.response?.data?.error ||
          error.response?.data?.message ||
          "Error saving package";
        toast.error(errorMessage);
      }
    },
  });

  // ✅ Effect to update profit breakdown when form values change
  useEffect(() => {
    if (formik.values.selectedGroupTicketId && formik.values.hotels.length > 0) {
      const breakdown = calculateProfitBreakdown(formik.values);
      setProfitBreakdown(breakdown);
    }
  }, [
    formik.values.selectedGroupTicketId,
    formik.values.hotels,
    formik.values.transports,
    formik.values.visa,
    formik.values.rooms,
    editableGroupPrice,
  ]);

  useEffect(() => {
    const selectedGroup = getSelectedGroupTicket(formik.values.selectedGroupTicketId);
    if (selectedGroup?.price) {
      const price = { ...selectedGroup.price };
      originalGroupPriceRef.current = price;
      setEditableGroupPrice(price);
    } else {
      originalGroupPriceRef.current = null;
      setEditableGroupPrice(null);
    }
  }, [formik.values.selectedGroupTicketId, umrahGroups]);

  // ✅ Effect to sync packageTotals from form values
  useEffect(() => {
    // Skip recalculation during initial load to preserve saved packageTotals (including incentive).
    // We skip multiple times because the effect fires for each dependency that changes on load
    // (formik values set by fetchPackageDetails, then umrahGroups arriving).
    if (skipSyncCountRef.current > 0) {
      skipSyncCountRef.current -= 1;
      return;
    }
    recalculatePackageTotalsFromCurrentState();
  }, [formik.values.selectedGroupTicketId, formik.values.hotels, formik.values.visa, umrahGroups]);

  useEffect(() => {
    if (!umrahGroups.length || formik.values.selectedGroupTicketId || !formik.values.flights.length) {
      return;
    }

    const matchedGroupId = findMatchingGroupTicketId(formik.values.flights);
    if (matchedGroupId) {
      const matchedGroup = getSelectedGroupTicket(matchedGroupId);
      formik.setFieldValue("selectedGroupTicketId", matchedGroupId);
      if (matchedGroup?.flights?.length) {
        formik.setFieldValue("flights", matchedGroup.flights);
      }
    }
  }, [umrahGroups, formik.values.flights, formik.values.selectedGroupTicketId]);

  const addTransport = () => {
    formik.setFieldValue("transports", [
      ...formik.values.transports,
      { route: "", supplier: { name: "", _id: "" }, transportType: "" },
    ]);
  };

  const removeTransport = (index: number) => {
    const updated = formik.values.transports.filter((_, i) => i !== index);
    formik.setFieldValue("transports", updated);
  };

  const updateTransport = (index: number, fields: Partial<Transport>) => {
    const updated = [...formik.values.transports];
    updated[index] = { ...updated[index], ...fields };
    formik.setFieldValue("transports", updated);
  };

  const parseISODate = (isoDate: string) => {
    if (!isoDate) return null;
    const [y, m, d] = isoDate.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  };

  const dateToISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const calculateNights = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return 0;
    const inDate = parseISODate(checkIn);
    const outDate = parseISODate(checkOut);
    if (!inDate || !outDate) return 0;
    const diff = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const calculateCheckOut = (checkIn?: string, nights?: number) => {
    const inDate = checkIn ? parseISODate(checkIn) : null;
    if (!inDate || !nights || nights <= 0) return "";
    const outDate = new Date(inDate);
    outDate.setDate(outDate.getDate() + nights);
    return dateToISO(outDate);
  };

  const updateHotel = (index: number, fields: Partial<HotelForm>) => {
    const updated = [...formik.values.hotels];
    updated[index] = { ...updated[index], ...fields };
    const row = updated[index];

    if (fields.checkIn !== undefined) {
      if (row.checkIn && row.nights > 0) {
        row.checkOut = calculateCheckOut(row.checkIn, row.nights);
      } else if (row.checkIn && row.checkOut) {
        const nights = calculateNights(row.checkIn, row.checkOut);
        row.nights = nights;
        row.nightCount = nights;
      }
    }

    if (fields.checkOut !== undefined) {
      const nights = calculateNights(row.checkIn, row.checkOut);
      row.nights = nights;
      row.nightCount = nights;
    }

    if (fields.nights !== undefined) {
      const nextNights = Number(row.nights) || 0;
      row.nights = nextNights;
      row.nightCount = nextNights;
      if (row.checkIn && nextNights > 0) {
        row.checkOut = calculateCheckOut(row.checkIn, nextNights);
      }
    }

    formik.setFieldValue("hotels", updated);
  };

  if (loading) {
    return (
      <ComponentCard title={id ? "Edit Umrah Package" : "Create Umrah Package"}>
        <div className="flex justify-center items-center py-20">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </ComponentCard>
    );
  }

  if (!canAccess) {
    return (
      <ComponentCard title={id ? "Edit Umrah Package" : "Create Umrah Package"}>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
          {id ? "You do not have permission to edit Umrah Packages." : "You do not have permission to create Umrah Packages."}
        </div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title={id ? "Edit Umrah Package" : "Create Umrah Package"}>
      <div className="overflow-hidden rounded-xl border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
        <form onSubmit={formik.handleSubmit} className="space-y-3 p-4">
          {/* Package Name and Logos - Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Package Name</label>
              <input
                type="text"
                name="packageName"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.packageName}
                className="border p-2 w-full rounded text-sm h-9"
                placeholder="Enter package name"
              />
              {formik.touched.packageName && formik.errors.packageName && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.packageName}</p>
              )}
            </div>

            {/* Logo */}
            <div>
              <label className="block text-xs font-semibold mb-1">Logo</label>
              <div
                className="border-2 border-dashed border-gray-300 p-2 rounded cursor-pointer text-center h-20"
                onClick={() => document.getElementById("logoInput")?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="mx-auto h-16 object-contain" />
                ) : (
                  <p className="text-xs mt-2">Click to select</p>
                )}
              </div>
              <input
                type="file"
                id="logoInput"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setLogoPreview(reader.result as string);
                      formik.setFieldValue("logo", file.name);
                      formik.setFieldTouched("logo", true);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {formik.touched.logo && formik.errors.logo && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.logo}</p>
              )}
            </div>

            {/* Flight Logo */}
            <div>
              <label className="block text-xs font-semibold mb-1">Flight Logo</label>
              <div
                className="border-2 border-dashed border-gray-300 p-2 rounded cursor-pointer text-center h-20"
                onClick={() => document.getElementById("flightLogoInput")?.click()}
              >
                {flightLogoPreview ? (
                  <img src={flightLogoPreview} alt="Flight Logo" className="mx-auto h-16 object-contain" />
                ) : (
                  <p className="text-xs mt-2">Click to select</p>
                )}
              </div>
              <input
                type="file"
                id="flightLogoInput"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFlightLogoPreview(reader.result as string);
                      formik.setFieldValue("flightLogo", file.name);
                      formik.setFieldTouched("flightLogo", true);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {formik.touched.flightLogo && formik.errors.flightLogo && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.flightLogo}</p>
              )}
            </div>
          </div>

          <div className="border rounded p-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Umrah Group Ticket</label>
              <select
                name="selectedGroupTicketId"
                value={formik.values.selectedGroupTicketId}
                onChange={(e) => {
                  const groupId = e.target.value;
                  const group = getSelectedGroupTicket(groupId);
                  formik.setFieldValue("selectedGroupTicketId", groupId);
                  formik.setFieldValue("flights", group?.flights || []);
                }}
                className="border p-2 w-full rounded text-sm h-9"
                disabled={loadingGroups}
              >
                <option value="">{loadingGroups ? "Loading Umrah groups..." : "Select Umrah group"}</option>
                {umrahGroups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {(group.groupName || group.groupBookingId || group.sector || "Untitled Group") +
                      ` | Seats: ${group.totalSeats || 0}`}
                  </option>
                ))}
              </select>
              {formik.touched.selectedGroupTicketId && formik.errors.selectedGroupTicketId && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.selectedGroupTicketId}</p>
              )}
            </div>

            {formik.values.selectedGroupTicketId && (() => {
              const selectedGroup = getSelectedGroupTicket(formik.values.selectedGroupTicketId);
              return selectedGroup ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Group</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedGroup.groupName || selectedGroup.groupBookingId || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Sector</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedGroup.sector || selectedGroup.flights.map((flight) => `${flight.sectorFrom}-${flight.sectorTo}`).join(", ") || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Available Seats</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedGroup.totalSeats || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">PNR</p>
                      {selectedGroup.pnr ? (
                        <p className="inline-block mt-1 px-3 py-1 bg-linear-to-r from-blue-500 to-blue-600 text-white border-2 border-blue-400 rounded-md text-sm font-mono font-bold shadow-md">
                          {selectedGroup.pnr}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No PNR</p>
                      )}
                    </div>
                  </div>

                  {selectedGroup.price && (() => {
                    const currentPrice = editableGroupPrice || selectedGroup.price;
                    const originalPrice = originalGroupPriceRef.current || selectedGroup.price;

                    return (
                      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Buying Price</p>
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <div>
                              <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300">Adult</label>
                              <input
                                type="number"
                                value={currentPrice.buyingAdultPrice ?? 0}
                                onChange={(e) => updateEditableGroupPrice("buyingAdultPrice", Number(e.target.value || 0))}
                                className="mt-1 h-8 w-full rounded border border-emerald-200 bg-white px-2 text-xs outline-none focus:border-emerald-500 dark:border-emerald-800 dark:bg-gray-900"
                              />
                              <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                Original: {formatGroupTicketPrice(originalPrice.buyingAdultPrice, originalPrice.buyingCurrency)}
                              </p>
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300">Child</label>
                              <input
                                type="number"
                                value={currentPrice.buyingChildPrice ?? 0}
                                onChange={(e) => updateEditableGroupPrice("buyingChildPrice", Number(e.target.value || 0))}
                                className="mt-1 h-8 w-full rounded border border-emerald-200 bg-white px-2 text-xs outline-none focus:border-emerald-500 dark:border-emerald-800 dark:bg-gray-900"
                              />
                              <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                Original: {formatGroupTicketPrice(originalPrice.buyingChildPrice, originalPrice.buyingCurrency)}
                              </p>
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300">Infant</label>
                              <input
                                type="number"
                                value={currentPrice.buyingInfantPrice ?? 0}
                                onChange={(e) => updateEditableGroupPrice("buyingInfantPrice", Number(e.target.value || 0))}
                                className="mt-1 h-8 w-full rounded border border-emerald-200 bg-white px-2 text-xs outline-none focus:border-emerald-500 dark:border-emerald-800 dark:bg-gray-900"
                              />
                              <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                Original: {formatGroupTicketPrice(originalPrice.buyingInfantPrice, originalPrice.buyingCurrency)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-3 dark:border-blue-900/40 dark:bg-blue-900/20">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Selling Price</p>
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <div>
                              <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300">Adult</label>
                              <input
                                type="number"
                                value={currentPrice.sellingAdultPriceB2B ?? 0}
                                onChange={(e) => updateEditableGroupPrice("sellingAdultPriceB2B", Number(e.target.value || 0))}
                                className="mt-1 h-8 w-full rounded border border-blue-200 bg-white px-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-gray-900"
                              />
                              <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                Original: {formatGroupTicketPrice(originalPrice.sellingAdultPriceB2B, originalPrice.sellingCurrencyB2B)}
                              </p>
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300">Child</label>
                              <input
                                type="number"
                                value={currentPrice.sellingChildPriceB2B ?? 0}
                                onChange={(e) => updateEditableGroupPrice("sellingChildPriceB2B", Number(e.target.value || 0))}
                                className="mt-1 h-8 w-full rounded border border-blue-200 bg-white px-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-gray-900"
                              />
                              <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                Original: {formatGroupTicketPrice(originalPrice.sellingChildPriceB2B, originalPrice.sellingCurrencyB2B)}
                              </p>
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-300">Infant</label>
                              <input
                                type="number"
                                value={currentPrice.sellingInfantPriceB2B ?? 0}
                                onChange={(e) => updateEditableGroupPrice("sellingInfantPriceB2B", Number(e.target.value || 0))}
                                className="mt-1 h-8 w-full rounded border border-blue-200 bg-white px-2 text-xs outline-none focus:border-blue-500 dark:border-blue-800 dark:bg-gray-900"
                              />
                              <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                Original: {formatGroupTicketPrice(originalPrice.sellingInfantPriceB2B, originalPrice.sellingCurrencyB2B)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-200">Selected Flights</p>
                    <div className="space-y-2">
                      {selectedGroup.flights?.length ? (
                        selectedGroup.flights.map((flight, index) => (
                          <div
                            key={`${flight.flightNo}-${index}`}
                            className="rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                          >
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <span className="font-semibold">
                                {flight.airline || "Airline"} {flight.flightNo}
                              </span>
                              <span>
                                {flight.sectorFrom} - {flight.sectorTo}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-col gap-1 text-gray-500 dark:text-gray-400 md:flex-row md:gap-4">
                              <span>Departure: {formatFlightDate(flight.depDate)} {flight.depTime || ""}</span>
                              <span>Arrival: {formatFlightDate(flight.arrDate)} {flight.arrTime || ""}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              <span className={`px-2 py-1 rounded font-semibold ${flight.flightClass?.toLowerCase().includes('business')
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400'
                                : flight.flightClass?.toLowerCase().includes('first')
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-400'
                                  : 'bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-900/30 dark:text-gray-400'
                                }`}>
                                ✈️ Class: {flight.flightClass?.trim() || "N/A"}
                              </span>
                              <span className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                                🧳 Baggage: {flight.baggage?.trim() || "N/A"}
                              </span>
                              <span className="px-2 py-1 rounded bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400">
                                🍽️ Meal: {flight.meal?.trim() || "N/A"}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-red-500">No flights found in selected group.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* Available Rooms and Days - Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Available Packages</label>
              <input
                type="number"
                name="availableRooms"
                onChange={formik.handleChange}
                value={formik.values.availableRooms || ""}
                className="border p-2 w-full rounded text-sm h-9"
                min={0}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Package Duration (Days)</label>
              <input
                type="number"
                name="days"
                onChange={formik.handleChange}
                value={formik.values.days || ""}
                className="border p-2 w-full rounded text-sm h-9"
                min={0}
                placeholder="0"
              />
            </div>
          </div>

          {/* Hotels - New Design */}
          <div>
            {formik.values.hotels.length === 0 && (
              <p className="text-gray-500 text-sm mb-2">No hotels added yet</p>
            )}
            {formik.values.hotels.map((hotel, index) => (
              <div key={index} className="border rounded-lg mb-4 overflow-hidden shadow-sm">
                {/* Header */}
                <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center">
                  <h4 className="text-sm font-semibold">Hotel Details</h4>
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newHotels = [...formik.values.hotels];
                        newHotels.splice(index, 1);
                        formik.setFieldValue("hotels", newHotels);
                      }}
                      className="text-white text-xs hover:text-red-200"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {/* Row 1: Supplier, City, Hotel Name */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Select Supplier Account</label>
                      <Select
                        value={getSupplierSelectValue(hotel.supplier)}
                        onChange={(option) => updateHotel(index, { supplier: toSupplier(option as any) })}
                        options={supplierOptions}
                        placeholder="Select Hotel"
                        isClearable
                        isSearchable
                        className="text-xs"
                        styles={{
                          control: (base) => ({ ...base, minHeight: "36px", fontSize: "0.75rem" }),
                          valueContainer: (base) => ({ ...base, padding: "0 8px" }),
                          input: (base) => ({ ...base, margin: "0", padding: "0" }),
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">City</label>
                      <select
                        value={hotel.location.city || ""}
                        onChange={(e) => updateHotel(index, { location: { ...hotel.location, city: e.target.value } })}
                        className="border p-2 w-full rounded text-xs h-9 bg-white"
                      >
                        <option value="">Select City</option>
                        <option value="Makkah">Makkah</option>
                        <option value="Madinah">Madinah</option>
                        <option value="Jeddah">Jeddah</option>
                        <option value="Taif">Taif</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Hotel Name</label>
                      <CreatableSelect
                        options={hotelOptions}
                        onCreateOption={(inputValue) => updateHotel(index, { name: inputValue })}
                        onChange={(option: any) => {
                          const selected = option as HotelOption;
                          if (!selected) {
                            updateHotel(index, { name: "", location: { city: hotel.location.city, distance: "", mapUrl: "" }, rating: 0 });
                            return;
                          }
                          if (selected.data) {
                            updateHotel(index, {
                              name: selected.data.hotelName || selected.label,
                              location: { city: selected.data.city || hotel.location.city, distance: String(selected.data.distance ?? ""), mapUrl: selected.data.mapUrl || "" },
                              rating: Number(selected.data.rating || 0),
                            });
                            return;
                          }
                          updateHotel(index, { name: selected.label || "" });
                        }}
                        value={hotel.name ? { value: hotel.name, label: hotel.name } : null}
                        placeholder="Hotel Name"
                        className="text-xs"
                        styles={{
                          control: (base) => ({ ...base, minHeight: "36px", fontSize: "0.75rem" }),
                          valueContainer: (base) => ({ ...base, padding: "0 8px" }),
                          input: (base) => ({ ...base, margin: "0", padding: "0" }),
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Check-in, Check-out, Nights, Distance, Buying Price/Room, ROE, Currency, Selling Price/Room, Selling ROE */}
                  <div className="grid grid-cols-2 md:grid-cols-10 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Check-in Date</label>
                      <DatePicker
                        selected={parseISODate(hotel.checkIn)}
                        onChange={(date: Date | null) => updateHotel(index, { checkIn: date ? dateToISO(date) : "" })}
                        dateFormat="dd-MM-yyyy"
                        customInput={<input type="text" placeholder="dd-----yyyy" className="border p-2 w-full rounded text-xs h-9" />}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Check-out Date</label>
                      <DatePicker
                        selected={parseISODate(hotel.checkOut)}
                        onChange={(date: Date | null) => updateHotel(index, { checkOut: date ? dateToISO(date) : "" })}
                        dateFormat="dd-MM-yyyy"
                        minDate={hotel.checkIn ? parseISODate(hotel.checkIn) || undefined : undefined}
                        customInput={<input type="text" placeholder="dd-----yyyy" className="border p-2 w-full rounded text-xs h-9" />}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Nights</label>
                      <input
                        type="number"
                        value={hotel.nights || ""}
                        readOnly
                        className="border p-2 w-full rounded text-xs h-9 bg-gray-100"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Distance from Haram (M)</label>
                      <input
                        type="text"
                        value={hotel.location.distance || ""}
                        onChange={(e) => updateHotel(index, { location: { ...hotel.location, distance: e.target.value } })}
                        className="border p-2 w-full rounded text-xs h-9"
                        placeholder=""
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Buying Price/Room</label>
                      <input
                        type="number"
                        value={hotel.buyingPrice ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? undefined : Number(e.target.value);
                          const numVal = val || 0;
                          const roe = hotel.buyingRoe || 1;
                          const selling = parseFloat((numVal * roe).toFixed(2));
                          updateHotel(index, {
                            buyingPrice: val,
                            sellingPrice: selling,
                            doubleRoom: { ...hotel.doubleRoom, buyingPrice: parseFloat((numVal / 2).toFixed(2)), sellingPrice: parseFloat((selling / 2).toFixed(2)) },
                            tripleRoom: { ...hotel.tripleRoom, buyingPrice: parseFloat((numVal / 3).toFixed(2)), sellingPrice: parseFloat((selling / 3).toFixed(2)) },
                            quadRoom: { ...hotel.quadRoom, buyingPrice: parseFloat((numVal / 4).toFixed(2)), sellingPrice: parseFloat((selling / 4).toFixed(2)) },
                            sharedRoom: { ...hotel.sharedRoom, buyingPrice: parseFloat((numVal / 5).toFixed(2)), sellingPrice: parseFloat((selling / 5).toFixed(2)) },
                          });
                        }}
                        className="border p-2 w-full rounded text-xs h-9"
                        placeholder=""
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Buying ROE</label>
                      <input
                        type="number"
                        value={hotel.buyingRoe ?? 1}
                        onChange={(e) => {
                          const roe = Number(e.target.value || 1);
                          const buying = hotel.buyingPrice || 0;
                          const selling = parseFloat((buying * roe).toFixed(2));
                          updateHotel(index, {
                            buyingRoe: roe,
                            sellingPrice: selling,
                            doubleRoom: { ...hotel.doubleRoom, buyingRoe: roe, sellingPrice: parseFloat((selling / 2).toFixed(2)) },
                            tripleRoom: { ...hotel.tripleRoom, buyingRoe: roe, sellingPrice: parseFloat((selling / 3).toFixed(2)) },
                            quadRoom: { ...hotel.quadRoom, buyingRoe: roe, sellingPrice: parseFloat((selling / 4).toFixed(2)) },
                            sharedRoom: { ...hotel.sharedRoom, buyingRoe: roe, sellingPrice: parseFloat((selling / 5).toFixed(2)) },
                          });
                        }}
                        className="border p-2 w-full rounded text-xs h-9"
                        placeholder="1"
                        step="0.01"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Currency</label>
                      <Select
                        options={currency_list.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }))}
                        value={hotel.buyingCurrency ? { value: hotel.buyingCurrency, label: hotel.buyingCurrency } : null}
                        onChange={(opt) => updateHotel(index, { buyingCurrency: opt?.value || "PKR", sellingCurrency: opt?.value || "PKR" })}
                        placeholder="Currency"
                        isSearchable
                        className="text-xs"
                        styles={{
                          control: (base) => ({ ...base, minHeight: "36px", fontSize: "0.75rem" }),
                          valueContainer: (base) => ({ ...base, padding: "0 8px" }),
                          input: (base) => ({ ...base, margin: "0", padding: "0" }),
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Selling Price/Room</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={hotel.sellingPrice ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? undefined : Number(e.target.value);
                            const numVal = val || 0;
                            updateHotel(index, {
                              sellingPrice: val,
                              doubleRoom: { ...hotel.doubleRoom, sellingPrice: parseFloat((numVal / 2).toFixed(2)) },
                              tripleRoom: { ...hotel.tripleRoom, sellingPrice: parseFloat((numVal / 3).toFixed(2)) },
                              quadRoom: { ...hotel.quadRoom, sellingPrice: parseFloat((numVal / 4).toFixed(2)) },
                              sharedRoom: { ...hotel.sharedRoom, sellingPrice: parseFloat((numVal / 5).toFixed(2)) },
                            });
                          }}
                          className="border p-2 w-full rounded text-xs h-9"
                          placeholder=""
                        />
                        {index !== 0 && (
                          <button
                            type="button"
                            className="bg-pink-500 text-white px-2 rounded text-xs h-9 hover:bg-pink-600"
                            onClick={() => {
                              const newHotels = [...formik.values.hotels];
                              newHotels.splice(index, 1);
                              formik.setFieldValue("hotels", newHotels);
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Selling ROE</label>
                      <input
                        type="number"
                        value={hotel.sellingRoe ?? 1}
                        onChange={(e) => {
                          const roe = Number(e.target.value || 1);
                          updateHotel(index, {
                            sellingRoe: roe,
                            doubleRoom: { ...hotel.doubleRoom, sellingRoe: roe },
                            tripleRoom: { ...hotel.tripleRoom, sellingRoe: roe },
                            quadRoom: { ...hotel.quadRoom, sellingRoe: roe },
                            sharedRoom: { ...hotel.sharedRoom, sellingRoe: roe },
                          });
                        }}
                        className="border p-2 w-full rounded text-xs h-9"
                        placeholder="1"
                        step="0.01"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Selling Currency</label>
                      <Select
                        options={currency_list.map((c) => ({ value: c.code, label: `${c.code} - ${c.name}` }))}
                        value={hotel.sellingCurrency ? { value: hotel.sellingCurrency, label: hotel.sellingCurrency } : null}
                        onChange={(opt) => updateHotel(index, { sellingCurrency: opt?.value || "PKR" })}
                        placeholder="Currency"
                        isSearchable
                        className="text-xs"
                        styles={{
                          control: (base) => ({ ...base, minHeight: "36px", fontSize: "0.75rem" }),
                          valueContainer: (base) => ({ ...base, padding: "0 8px" }),
                          input: (base) => ({ ...base, margin: "0", padding: "0" }),
                        }}
                      />
                    </div>
                  </div>

                  {/* Room Type Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {([
                      { key: "doubleRoom", label: "Double Room (2 Pax)", color: "bg-green-600", paxLabel: "Price/Pax" },
                      { key: "tripleRoom", label: "Triple Room (3 Pax)", color: "bg-teal-500", paxLabel: "Price/Pax" },
                      { key: "quadRoom", label: "Quad Room (4 Pax)", color: "bg-blue-500", paxLabel: "Price/Pax" },
                      { key: "sharedRoom", label: "Shared Room (5 Pax)", color: "bg-yellow-500", paxLabel: "Total Price" },
                    ] as const).map(({ key, label, color, paxLabel }) => {
                      const room = hotel[key] as RoomPricing;
                      const updateRoom = (fields: Partial<RoomPricing>) => {
                        updateHotel(index, { [key]: { ...room, ...fields } });
                      };
                      return (
                        <div key={key} className="border rounded overflow-hidden">
                          <div className={`${color} text-white px-3 py-2`}>
                            <span className="text-xs font-bold">{label}</span>
                          </div>
                          <div className="p-3 space-y-3">
                            {/* Buying */}
                            <div>
                              <p className="text-xs font-semibold text-red-500 mb-2">Buying</p>
                              <div className="grid grid-cols-3 gap-1">
                                <div>
                                  <label className="block text-xs mb-1">{paxLabel} ({hotel.buyingCurrency || "PKR"})</label>
                                  <input
                                    type="number"
                                    value={room.buyingPrice || ""}
                                    onChange={(e) => {
                                      const val = Number(e.target.value || 0);
                                      if (key === "doubleRoom") {
                                        updateHotel(index, {
                                          buyingPrice: parseFloat((val * 2).toFixed(2)),
                                          doubleRoom: { ...hotel.doubleRoom, buyingPrice: val },
                                          tripleRoom: { ...hotel.tripleRoom, buyingPrice: parseFloat(((val * 2) / 3).toFixed(2)) },
                                          quadRoom: { ...hotel.quadRoom, buyingPrice: parseFloat(((val * 2) / 4).toFixed(2)) },
                                          sharedRoom: { ...hotel.sharedRoom, buyingPrice: parseFloat(((val * 2) / 5).toFixed(2)) },
                                        });
                                      } else {
                                        updateRoom({ buyingPrice: val });
                                      }
                                    }}
                                    className="border p-1 w-full rounded text-xs h-7"
                                    placeholder="0.00"
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1">ROE</label>
                                  <input
                                    type="number"
                                    value={room.buyingRoe || 1}
                                    onChange={(e) => updateRoom({ buyingRoe: Number(e.target.value || 1) })}
                                    className="border p-1 w-full rounded text-xs h-7"
                                    placeholder="1"
                                    step="0.01"
                                    min={1}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1">PKR</label>
                                  <input
                                    type="number"
                                    value={room.buyingPrice && room.buyingRoe ? (room.buyingPrice * room.buyingRoe).toFixed(2) : "0.00"}
                                    readOnly
                                    className="border p-1 w-full rounded text-xs h-7 bg-gray-100"
                                  />
                                </div>
                              </div>
                            </div>
                            {/* Selling */}
                            <div>
                              <p className="text-xs font-semibold text-green-600 mb-2">Selling</p>
                              <div className="grid grid-cols-3 gap-1">
                                <div>
                                  <label className="block text-xs mb-1">{paxLabel} ({hotel.sellingCurrency || "PKR"})</label>
                                  <input
                                    type="number"
                                    value={room.sellingPrice || ""}
                                    onChange={(e) => {
                                      const val = Number(e.target.value || 0);
                                      if (key === "doubleRoom") {
                                        updateHotel(index, {
                                          sellingPrice: parseFloat((val * 2).toFixed(2)),
                                          doubleRoom: { ...hotel.doubleRoom, sellingPrice: val },
                                          tripleRoom: { ...hotel.tripleRoom, sellingPrice: parseFloat(((val * 2) / 3).toFixed(2)) },
                                          quadRoom: { ...hotel.quadRoom, sellingPrice: parseFloat(((val * 2) / 4).toFixed(2)) },
                                          sharedRoom: { ...hotel.sharedRoom, sellingPrice: parseFloat(((val * 2) / 5).toFixed(2)) },
                                        });
                                      } else {
                                        updateRoom({ sellingPrice: val });
                                      }
                                    }}
                                    className="border p-1 w-full rounded text-xs h-7"
                                    placeholder="0.00"
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1">ROE</label>
                                  <input
                                    type="number"
                                    value={room.sellingRoe || 1}
                                    onChange={(e) => updateRoom({ sellingRoe: Number(e.target.value || 1) })}
                                    className="border p-1 w-full rounded text-xs h-7"
                                    placeholder="1"
                                    step="0.01"
                                    min={1}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1">PKR</label>
                                  <input
                                    type="number"
                                    value={room.sellingPrice && room.sellingRoe ? (room.sellingPrice * room.sellingRoe).toFixed(2) : ""}
                                    readOnly
                                    className="border p-1 w-full rounded text-xs h-7 bg-gray-100"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Add More Hotels */}
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() =>
                  formik.setFieldValue("hotels", [
                    ...formik.values.hotels,
                    {
                      name: "",
                      supplier: { name: "", _id: "" },
                      location: { city: "", distance: "", mapUrl: "" },
                      rating: 0,
                      checkIn: "",
                      checkOut: "",
                      nights: 0,
                      nightCount: 0,
                      buyingPrice: undefined,
                      buyingRoe: 1,
                      buyingCurrency: "PKR",
                      sellingPrice: undefined,
                      sellingRoe: 1,
                      sellingCurrency: "PKR",
                      currency: "PKR",
                      doubleRoom: { buyingPrice: 0, buyingRoe: 1, buyingCurrency: "PKR", sellingPrice: 0, sellingRoe: 1, sellingCurrency: "PKR" },
                      tripleRoom: { buyingPrice: 0, buyingRoe: 1, buyingCurrency: "PKR", sellingPrice: 0, sellingRoe: 1, sellingCurrency: "PKR" },
                      quadRoom: { buyingPrice: 0, buyingRoe: 1, buyingCurrency: "PKR", sellingPrice: 0, sellingRoe: 1, sellingCurrency: "PKR" },
                      sharedRoom: { buyingPrice: 0, buyingRoe: 1, buyingCurrency: "PKR", sellingPrice: 0, sellingRoe: 1, sellingCurrency: "PKR" },
                    },
                  ])
                }
                className="bg-green-600 text-white px-6 py-2 rounded text-sm hover:bg-green-700"
              >
                + Add More Hotels
              </button>
            </div>
          </div>

          {/* Transport Section */}
          <div className="border rounded p-3">
            <h4 className="text-sm font-semibold mb-2">Transport</h4>
            {formik.values.transports.length === 0 && (
              <p className="text-gray-500 text-sm mb-2">No transport added yet</p>
            )}
            {formik.values.transports.map((transport, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 pb-2 border-b last:border-b-0"
              >
                {/* Route */}
                <div>
                  <label className="block text-xs mb-1">Route</label>
                  <CreatableSelect
                    options={transportOptions}
                    onCreateOption={(inputValue) => {
                      updateTransport(index, { route: inputValue });
                    }}
                    onChange={(option: any) => {
                      const selected = option as TransportOption;
                      if (!selected) {
                        updateTransport(index, { route: "", transportType: "" });
                        return;
                      }
                      if (selected.data) {
                        updateTransport(index, {
                          route: selected.data.route || selected.label,
                          transportType: selected.data.transportType || "",
                        });
                        return;
                      }
                      updateTransport(index, { route: selected.label || "" });
                    }}
                    value={transport.route ? { value: transport.route, label: transport.route } : null}
                    placeholder="e.g., LHE-JED-MED"
                    className="text-xs"
                    styles={{
                      control: (base) => ({ ...base, minHeight: "32px", height: "32px", fontSize: "0.75rem" }),
                      valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                      input: (base) => ({ ...base, margin: "0", padding: "0" }),
                    }}
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-xs mb-1">Supplier</label>
                  <Select
                    value={getSupplierSelectValue(transport.supplier)}
                    onChange={(option) => updateTransport(index, { supplier: toSupplier(option as any) })}
                    options={supplierOptions}
                    placeholder="Select supplier"
                    isClearable
                    isSearchable
                    className="text-xs"
                    styles={{
                      control: (base) => ({ ...base, minHeight: "32px", height: "32px", fontSize: "0.75rem" }),
                      valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                      input: (base) => ({ ...base, margin: "0", padding: "0" }),
                    }}
                  />
                </div>

                {/* Transport Type */}
                <div>
                  <label className="block text-xs mb-1">Transport Type</label>
                  <select
                    value={transport.transportType}
                    onChange={(e) => updateTransport(index, { transportType: e.target.value })}
                    className="border p-1.5 w-full rounded text-xs h-8 outline-none focus:border-blue-500"
                  >
                    <option value="">Select type</option>
                    {TRANSPORT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Remove */}
                {index !== 0 && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeTransport(index)}
                      className="text-red-500 text-xs hover:text-red-700 px-2 h-8"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTransport}
              className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 mt-2"
            >
              + Add Transport
            </button>
          </div>

          {/* Visa Section */}
          <div className="border rounded p-3">
            <h4 className="text-sm font-semibold mb-2">Visa</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1">Visa Type</label>
                <Select
                  options={visaOptions}
                  onChange={(option: any) => {
                    if (option && option.data) {
                      formik.setFieldValue("visa", {
                        visaId: option.value,
                        visaType: option.data.visaType,
                        supplier: formik.values.visa?.supplier || { name: "", _id: "" },
                        withTransport: option.data.withTransport,
                        buyingPrice: option.data.buyingPrice,
                        buyingRoe: option.data.buyingRoe || 1,
                        buyingCurrency: option.data.buyingCurrency || option.data.currency || "PKR",
                        sellingPrice: option.data.sellingPrice,
                        sellingRoe: option.data.sellingRoe || 1,
                        sellingCurrency: option.data.sellingCurrency || option.data.currency || "PKR",
                        currency: option.data.currency,
                      });
                    } else {
                      formik.setFieldValue("visa", null);
                    }
                  }}
                  value={formik.values.visa ? {
                    value: formik.values.visa.visaId,
                    label: `${formik.values.visa.visaType} ${formik.values.visa.withTransport ? '(With Transport)' : '(Without Transport)'}`
                  } : null}
                  placeholder="Select visa"
                  className="text-xs"
                  styles={{
                    control: (base) => ({ ...base, minHeight: "32px", height: "32px", fontSize: "0.75rem" }),
                    valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                    input: (base) => ({ ...base, margin: "0", padding: "0" }),
                  }}
                />
                {formik.touched.visa && formik.errors.visa && (
                  <p className="text-red-500 text-xs mt-1">{formik.errors.visa as string}</p>
                )}
              </div>
              <div>
                <label className="block text-xs mb-1">Select Supplier Account</label>
                <Select
                  value={getSupplierSelectValue(formik.values.visa?.supplier)}
                  onChange={(option) =>
                    formik.setFieldValue("visa", {
                      ...formik.values.visa,
                      supplier: toSupplier(option as any),
                    })
                  }
                  options={supplierOptions}
                  placeholder="Select Supplier"
                  isClearable
                  isSearchable
                  className="text-xs"
                  styles={{
                    control: (base) => ({ ...base, minHeight: "32px", height: "32px", fontSize: "0.75rem" }),
                    valueContainer: (base) => ({ ...base, padding: "0 6px" }),
                    input: (base) => ({ ...base, margin: "0", padding: "0" }),
                  }}
                />
              </div>
              {formik.values.visa && (
                <>
                  <div>
                    <label className="block text-xs mb-1">Buying Price</label>
                    <input
                      type="number"
                      value={(formik.values.visa.buyingPrice || 0) * (formik.values.visa.buyingRoe || 1)}
                      readOnly
                      className="border p-1.5 w-full rounded text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Selling Price</label>
                    <input
                      type="number"
                      value={(formik.values.visa.sellingPrice || 0) * (formik.values.visa.sellingRoe || 1)}
                      readOnly
                      className="border p-1.5 w-full rounded text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">Currency</label>
                    <input
                      type="text"
                      value={formik.values.visa.currency}
                      onChange={(e) => formik.setFieldValue("visa.currency", e.target.value)}
                      className="border p-1.5 w-full rounded text-xs h-8"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Profit Breakdown Card - Shown above Submit */}
          {/* {profitBreakdown && (
            <div className="border rounded-lg p-4 bg-linear-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
              <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Package Cost Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white dark:bg-gray-900 p-2 rounded">
                  <p className="text-gray-500 dark:text-gray-400">Flight Cost</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formik.values.visa?.currency || 'PKR'} {profitBreakdown.flightCost.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-2 rounded">
                  <p className="text-gray-500 dark:text-gray-400">Hotel Cost</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      PKR {formik.values.hotels.reduce((sum, h) => sum + (h.buyingPrice || 0) * (h.buyingRoe || 1) * (h.nights || 0), 0).toLocaleString()}
                    </p>
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-2 rounded">
                  <p className="text-gray-500 dark:text-gray-400">Transport Cost</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formik.values.visa?.currency || 'PKR'} {profitBreakdown.transportCost.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-2 rounded">
                  <p className="text-gray-500 dark:text-gray-400">Visa Cost</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formik.values.visa?.currency || 'PKR'} {profitBreakdown.visaCost.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-900 p-2 rounded">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Total Cost</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formik.values.visa?.currency || 'PKR'} {profitBreakdown.totalCost.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-2 rounded">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Selling Price</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formik.values.visa?.currency || 'PKR'} {profitBreakdown.sellingPrice.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-2 rounded">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Profit</p>
                  <p className={`font-bold ${profitBreakdown.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formik.values.visa?.currency || 'PKR'} {profitBreakdown.profit.toLocaleString()} ({profitBreakdown.profitPercentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>
          )} */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-green-600 text-white px-4 py-2">
              <h4 className="text-sm font-semibold">Package Totals (Selling)</h4>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Double */}
                <div className="border rounded overflow-hidden">
                  <div className="bg-green-600 text-white px-3 py-2">
                    <span className="text-xs font-bold">Double Package Total (2 Pax)</span>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs mb-1">Total Price/Pax (PKR)</label>
                    <div className="flex items-center border rounded overflow-hidden h-9">
                      <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={packageTotals.double.toLocaleString()}
                        onChange={(e) => {
                          lockPackageTotalsAutoSync();
                          const val = parseFormattedNumber(e.target.value);
                          const inc = packageTotals.incentive;
                          // ✅ Update baseTotalsRef to store the manual value (without incentive)
                          baseTotalsRef.current = {
                            ...baseTotalsRef.current,
                            double: val - inc
                          };
                          setPackageTotals((prev) => ({ ...prev, double: val }));
                        }}
                        className="flex-1 p-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Triple */}
                <div className="border rounded overflow-hidden">
                  <div className="bg-teal-500 text-white px-3 py-2">
                    <span className="text-xs font-bold">Triple Package Total (3 Pax)</span>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs mb-1">Total Price/Pax (PKR)</label>
                    <div className="flex items-center border rounded overflow-hidden h-9">
                      <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={packageTotals.triple.toLocaleString()}
                        onChange={(e) => {
                          lockPackageTotalsAutoSync();
                          const val = parseFormattedNumber(e.target.value);
                          const inc = packageTotals.incentive;
                          baseTotalsRef.current = {
                            ...baseTotalsRef.current,
                            triple: val - inc
                          };
                          setPackageTotals((prev) => ({ ...prev, triple: val }));
                        }}
                        className="flex-1 p-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Quad */}
                <div className="border rounded overflow-hidden">
                  <div className="bg-blue-500 text-white px-3 py-2">
                    <span className="text-xs font-bold">Quad Package Total (4 Pax)</span>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs mb-1">Total Price/Pax (PKR)</label>
                    <div className="flex items-center border rounded overflow-hidden h-9">
                      <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={packageTotals.quad.toLocaleString()}
                        onChange={(e) => {
                          lockPackageTotalsAutoSync();
                          const val = parseFormattedNumber(e.target.value);
                          const inc = packageTotals.incentive;
                          baseTotalsRef.current = {
                            ...baseTotalsRef.current,
                            quad: val - inc
                          };
                          setPackageTotals((prev) => ({ ...prev, quad: val }));
                        }}
                        className="flex-1 p-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shared */}
                <div className="border rounded overflow-hidden">
                  <div className="bg-yellow-500 text-white px-3 py-2">
                    <span className="text-xs font-bold">Shared Package Total (5 Pax)</span>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs mb-1">Total Price (PKR)</label>
                    <div className="flex items-center border rounded overflow-hidden h-9">
                      <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={packageTotals.shared.toLocaleString()}
                        onChange={(e) => {
                          lockPackageTotalsAutoSync();
                          const val = parseFormattedNumber(e.target.value);
                          const inc = packageTotals.incentive;
                          baseTotalsRef.current = {
                            ...baseTotalsRef.current,
                            shared: val - inc
                          };
                          setPackageTotals((prev) => ({ ...prev, shared: val }));
                        }}
                        className="flex-1 p-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Child W/O Bed */}
                <div className="border rounded overflow-hidden">
                  <div className="bg-violet-500 text-white px-3 py-2">
                    <span className="text-xs font-bold">Child W/O Bed Package Total</span>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs mb-1">Total Price (PKR)</label>
                    <div className="flex items-center border rounded overflow-hidden h-9">
                      <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={packageTotals.childWithoutBed.toLocaleString()}
                        onChange={(e) => {
                          lockPackageTotalsAutoSync();
                          const val = parseFormattedNumber(e.target.value);
                          const inc = packageTotals.incentive;
                          baseTotalsRef.current = {
                            ...baseTotalsRef.current,
                            childWithoutBed: val - inc
                          };
                          setPackageTotals((prev) => ({ ...prev, childWithoutBed: val }));
                        }}
                        className="flex-1 p-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Infant */}
                <div className="border rounded overflow-hidden">
                  <div className="bg-pink-500 text-white px-3 py-2">
                    <span className="text-xs font-bold">Infant Package Total</span>
                  </div>
                  <div className="p-3">
                    <label className="block text-xs mb-1">Total Price (PKR)</label>
                    <div className="flex items-center border rounded overflow-hidden h-9">
                      <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={packageTotals.infant.toLocaleString()}
                        onChange={(e) => {
                          lockPackageTotalsAutoSync();
                          const val = parseFormattedNumber(e.target.value);
                          const inc = packageTotals.incentive;
                          baseTotalsRef.current = {
                            ...baseTotalsRef.current,
                            infant: val - inc
                          };
                          setPackageTotals((prev) => ({ ...prev, infant: val }));
                        }}
                        className="flex-1 p-2 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Incentive - Separate Section */}
              <div className="border-t-2 border-dashed border-orange-300 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="border rounded overflow-hidden">
                    <div className="bg-orange-500 text-white px-3 py-2">
                      <span className="text-xs font-bold">Incentive</span>
                    </div>
                    <div className="p-3">
                      <label className="block text-xs mb-1">Incentive Amount (PKR)</label>
                      <div className="flex items-center border rounded overflow-hidden h-9">
                        <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={packageTotals.incentive.toLocaleString()}
                          onChange={(e) => {
                            lockPackageTotalsAutoSync();
                            const inc = parseFormattedNumber(e.target.value);
                            const base = baseTotalsRef.current;
                            // ✅ Use the stored base values (which now include manual changes)
                            setPackageTotals({
                              double: base.double + inc,
                              triple: base.triple + inc,
                              quad: base.quad + inc,
                              shared: base.shared + inc,
                              childWithoutBed: base.childWithoutBed + inc,
                              infant: base.infant + inc,
                              incentive: inc,
                            });
                          }}
                          className="flex-1 p-2 text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-orange-600 font-semibold mt-2">
                  * Incentive (PKR {packageTotals.incentive.toLocaleString()}) is included in all room totals above
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Internal Status</label>
            <select
              value={internalStatus}
              onChange={(e) => setInternalStatus(e.target.value as "Public" | "Private")}
              className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="Public">Public</option>
              <option value="Private">Private</option>
            </select>
          </div>

          <div className="flex justify-end pt-2 gap-2">
            <button
              type="button"
              onClick={() => navigate("/manage-package")}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canAccess}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canAccess ? (id ? "You don't have permission to update Umrah packages" : "You don't have permission to create Umrah packages") : ""}
            >
              {id ? "Update Package" : "Add Package"}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer style={{ zIndex: 9999999 }} />
    </ComponentCard>
  );
};

export default UpdateUmrahPackage;
