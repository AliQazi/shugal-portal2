import { useFormik, FormikHelpers } from "formik";
import * as Yup from "yup";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import axiosInstance from "../Api/axios";
import ComponentCard from "../components/common/ComponentCard";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CreatableSelect from "react-select/creatable";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useAccountsList from "../context/useAccountsList";
import currency_list from "../data/currencies";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import {
  normalizeRateVolume,
  resolveHotelRateForStay,
  type RateVolumeData,
  type RateVolumeHotelRate,
  type RateVolumeOption,
} from "../utils/rateVolumePricing";

interface Rooms {
  sharing: string;
  quad: string;
  quint: string;
  triple: string;
  double: string;
  childWithoutPackage: string;
  InfantWithoutPackage: string;
}

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
  user: {
    name: string;
    _id: string;
  };
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

interface SupplierAccount {
  name: string;
  _id: string;
}

interface RoomPricing {
  buyingPrice: number;
  buyingRoe: number;
  sellingPrice: number;
  sellingRoe: number;
}

interface HotelForm {
  name: string;
  // References the Hotel document this row was picked from (via Hotel Name or Rate
  // Volume selection) - used to look up Rate Volumes scoped to this hotel and to
  // auto-match one by check-in/check-out date range. Empty for freehand-typed hotels.
  hotelId?: string;
  // Name of the Rate Volume that was applied to produce the buying/selling rates below.
  // Persisted so an edit form can hint "these rates came from X" even though the Rate
  // Volume dropdown itself stays unselected until the admin picks one in this session.
  rateVolumeName?: string;
  supplier: SupplierAccount;
  location: {
    city: string;
    mapUrl?: string;
  };
  rating: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  nightCount?: number;
  // legacy single price (kept for backward compat)
  buyingPrice?: number;
  buyingRoe?: number;
  buyingCurrency?: string;
  sellingPrice?: number;
  sellingRoe?: number;
  sellingCurrency?: string;
  currency?: string;
  // per-room-type pricing
  doubleRoom: RoomPricing;
  tripleRoom: RoomPricing;
  quadRoom: RoomPricing;
  sharedRoom: RoomPricing;
}

// ✅ NEW: Transport interface
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

const optionalNonNegativeNumber = Yup.number()
  .transform((value, originalValue) =>
    originalValue === "" || originalValue === null ? null : value
  )
  .nullable()
  .min(0);

const UmrahPackage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { copyId } = useParams();
  const canCreate = hasPermission(user, "create_umrah_package");
  // Copy mode (arrived via the "Copy" button on Manage Umrah Packages) shows a
  // minimal form - only the Umrah Group Ticket selector and Package Totals are
  // editable. Hotel/Transport/Visa/Days are still carried over in formik state
  // from the source package (see fetchPackageDetails) and submitted as-is,
  // they're just not rendered so the admin isn't tempted to re-edit them here.
  const isCopyMode = Boolean(copyId);
  // Logo/Flight Logo fields are hidden from this form (not currently needed).
  const [umrahGroups, setUmrahGroups] = useState<GroupTicketing[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [hotelOptions, setHotelOptions] = useState<HotelOption[]>([]);
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  const [visaOptions, setVisaOptions] = useState<VisaOption[]>([]);
  const [rateVolumeOptions, setRateVolumeOptions] = useState<RateVolumeOption[]>([]);
  // Tracks which Rate Volume is currently picked per hotel row (by hotel index), purely
  // for displaying the dropdown's selection - not submitted with the package.
  const [selectedRateVolumeByHotel, setSelectedRateVolumeByHotel] = useState<Record<number, string>>({});
  // City choices for the Hotel Details "City" field, extracted from the already-saved
  // Hotels list so it stays in sync with whatever cities are actually in use.
  const cityOptions = useMemo(
    () =>
      Array.from(new Set(hotelOptions.map((h) => h.data?.city).filter((c): c is string => Boolean(c)))).map((c) => ({
        value: c,
        label: c,
      })),
    [hotelOptions]
  );
  const [profitBreakdown, setProfitBreakdown] = useState<ProfitBreakdown | null>(null);
  console.log(profitBreakdown)
  const [packageTotals, setPackageTotals] = useState({ double: 0, triple: 0, quad: 0, shared: 0, childWithoutBed: 0, childWithBed: 0, infant: 0, incentive: 0 });
  const baseTotalsRef = useRef({ double: 0, triple: 0, quad: 0, shared: 0, childWithoutBed: 0, childWithBed: 0, infant: 0 });
  // Skips the packageTotals auto-sync effect while the values it depends on (hotels,
  // visa, selectedGroupTicketId) still match exactly what a copied package's data set
  // them to, so the copied totals (including any manual incentive) aren't clobbered by
  // spurious re-renders while umrahGroups/hotels/etc. are still arriving. Storing a
  // content signature instead of a fixed render count avoids a race where fetchUmrahGroups
  // happens to resolve before fetchPackageDetails: a fixed counter would get consumed by
  // that unrelated render and then skip the user's very first real edit instead.
  const copiedTotalsBaselineRef = useRef<string | null>(null);
  const [internalStatus, setInternalStatus] = useState<"Public" | "Private">("Public");
  // In Copy mode, the Hotels/Transport/Visa sections start read-only (see the summary
  // block below) and only become the full editable sections - identical to Create
  // Umrah Package - once the admin clicks "Edit" there.
  const [editingCopiedSections, setEditingCopiedSections] = useState(false);
  // Snapshot of hotels/transports/visa taken the moment "Edit" is clicked, so
  // "Cancel" can restore exactly what was copied from the source package.
  const copiedSectionsSnapshotRef = useRef<{
    hotels: HotelForm[];
    transports: Transport[];
    visa: Visa | null;
  } | null>(null);
  // Tracks which hotel-row indexes have already been checked to restore their "Rate
  // Volume" dropdown selection (see the effect below), so a row is only ever attempted
  // once - otherwise re-checking on every hotels change would keep re-selecting a
  // volume the admin had deliberately cleared by hand.
  const restoredRateVolumeIndexesRef = useRef<Set<number>>(new Set());
  const { data3 = [] } = useAccountsList();

  const supplierOptions = data3.map((account: { _id: string; account_name: string }) => ({
    value: account._id,
    label: account.account_name,
  }));

  const toSupplier = (option?: { value: string; label: string } | null): SupplierAccount => ({
    _id: option?.value || "",
    name: option?.label || "",
  });

  const getSupplierSelectValue = (supplier?: SupplierAccount) => {
    if (!supplier?.name && !supplier?._id) return null;
    return {
      value: supplier._id || supplier.name,
      label: supplier.name,
    };
  };

  useEffect(() => {
    fetchUmrahGroups();
    if (copyId) {
      fetchPackageDetails(copyId);
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
    }).catch(() => { });
    axiosInstance.get("/rate-volumes/all", { params: { isActive: true } }).then((res) => {
      if (res.data.success) {
        setRateVolumeOptions((res.data.data || []).map(normalizeRateVolume));
      }
    }).catch(() => { });
    axiosInstance.get("/transports/all").then((res) => {
      if (res.data.success) {
        setTransportOptions(
          (res.data.data || []).map((t: any) => ({ value: t._id, label: t.route, data: t }))
        );
      }
      axiosInstance.get("/visas/all").then((res) => {
        if (res.data.success) {
          setVisaOptions(
            (res.data.data || []).map((v: any) => ({
              value: v._id,
              label: `${v.visaType} ${v.withTransport ? '(With Transport)' : '(Without Transport)'}`,
              data: {
                visaType: v.visaType,
                withTransport: v.withTransport,
                buyingPrice: v.buyingPrice,
                buyingRoe: v.buyingRoe || 1,
                buyingCurrency: v.buyingCurrency || v.currency || "PKR",
                sellingPrice: v.sellingPrice,
                sellingRoe: v.sellingRoe || 1,
                sellingCurrency: v.sellingCurrency || v.currency || "PKR",
                currency: v.currency,
              },
            }))
          );
        }
      }).catch(() => { });
    }).catch(() => { });
  }, [copyId]);

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

  // Copy mode: fetch an existing package's saved data and pre-fill this create form with
  // it, so the admin can tweak a few fields and submit it as a brand-new package. Nothing
  // about the source package is touched — submission always POSTs a new record.
  const fetchPackageDetails = async (packageId: string) => {
    try {
      setLoadingCopy(true);
      const res = await axiosInstance.get(`/umrahpackages/${packageId}`);
      if (res.data.success) {
        const data = res.data.package;

        const formattedFlights = (data.flights || []).map((f: any) => ({
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
          meal: f.meal || "",
        }));

        const formattedTransports = (data.transports || []).map((t: any) => ({
          route: t.route || "",
          supplier: {
            _id: t.supplier?._id || "",
            name: t.supplier?.name || (typeof t.supplier === "string" ? t.supplier : ""),
          },
          transportType: t.transportType || "",
        }));

        const defaultRoom = () => ({ buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 });

        const formattedHotels = (data.hotels || []).map((h: any) => ({
          name: h.name || "",
          hotelId: h.hotelId || "",
          rateVolumeName: h.rateVolumeName || "",
          supplier: {
            _id: h.supplier?._id || "",
            name: h.supplier?.name || (typeof h.supplier === "string" ? h.supplier : ""),
          },
          location: {
            city: h.location?.city || "",
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

        const copiedSelectedGroupTicketId = data.selectedGroupTicketId || "";
        const copiedHotels = formattedHotels.length ? formattedHotels : formik.initialValues.hotels;

        formik.setValues({
          packageName: data.packageName || "",
          selectedGroupTicketId: copiedSelectedGroupTicketId,
          logo: "",
          flightLogo: "",
          flights: formattedFlights,
          hotels: copiedHotels,
          transports: formattedTransports.length ? formattedTransports : formik.initialValues.transports,
          visa: formattedVisa,
          rooms: data.rooms || {
            sharing: "", quad: "", quint: "", triple: "", double: "",
            childWithoutPackage: "", InfantWithoutPackage: "",
          },
          availableRooms: data.availableRooms || 0,
          days: data.days || 0,
        });

        if (data.packageTotals) {
          const inc = data.packageTotals.incentive || 0;
          const base = {
            double: (data.packageTotals.double || 0) - inc,
            triple: (data.packageTotals.triple || 0) - inc,
            quad: (data.packageTotals.quad || 0) - inc,
            shared: (data.packageTotals.shared || 0) - inc,
            childWithoutBed: data.packageTotals.childWithoutBed || 0,
            childWithBed: (data.packageTotals.childWithBed || 0) - inc,
            infant: data.packageTotals.infant || 0,
          };
          baseTotalsRef.current = base;
          setPackageTotals({
            double: data.packageTotals.double || 0,
            triple: data.packageTotals.triple || 0,
            quad: data.packageTotals.quad || 0,
            shared: data.packageTotals.shared || 0,
            childWithoutBed: data.packageTotals.childWithoutBed || 0,
            childWithBed: data.packageTotals.childWithBed || 0,
            infant: data.packageTotals.infant || 0,
            incentive: inc,
          });
          // Record what hotels/visa/selectedGroupTicketId looked like right after this
          // copy landed, so the totals-sync effect below can tell a spurious re-render
          // (umrahGroups arriving, etc., in whichever order) apart from the user's first
          // real edit and only recompute once something has actually changed.
          copiedTotalsBaselineRef.current = JSON.stringify({
            selectedGroupTicketId: copiedSelectedGroupTicketId,
            hotels: copiedHotels,
            visa: formattedVisa,
          });
        }

        if (data.internalStatus) setInternalStatus(data.internalStatus);

        toast.info("Package data copied. Review and submit.");
      }
    } catch (error) {
      console.error("Error fetching package to copy:", error);
      toast.error("Failed to load package details to copy");
    } finally {
      setLoadingCopy(false);
    }
  };

  const getSelectedGroupTicket = (groupId: string) =>
    umrahGroups.find((group) => group._id === groupId) || null;

  const formatFlightDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString("en-GB");
  };

  // ✅ Profit Calculation Function
  const calculateProfitBreakdown = (values: FormValues): ProfitBreakdown | null => {
    try {
      // Get selected group for flight cost
      const selectedGroup = getSelectedGroupTicket(values.selectedGroupTicketId);
      if (!selectedGroup) return null;

      // Flight Cost (from group ticketing) - Using buying adult price as base cost
      const flightCost = selectedGroup.price?.buyingAdultPrice || 0;

      // Hotel Cost Calculation - Sum of (nights * buying price per night * ROE)
      let hotelBuyingCost = 0;
      let hotelSellingPrice = 0;
      values.hotels.forEach(hotel => {
        const nights = hotel.nights || 0;
        const buyingPrice = hotel.buyingPrice || 0;
        const buyingRoe = hotel.buyingRoe || 1;
        const sellingPrice = hotel.sellingPrice || 0;
        const sellingRoe = hotel.sellingRoe || 1;
        hotelBuyingCost += nights * buyingPrice * buyingRoe;
        hotelSellingPrice += nights * sellingPrice * sellingRoe;
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

      // Parse room values (removing commas)
      const rooms = values.rooms;
      const sharing = parseInt(String(rooms.sharing).replace(/,/g, '')) || 0;
      const double = parseInt(String(rooms.double).replace(/,/g, '')) || 0;
      const triple = parseInt(String(rooms.triple).replace(/,/g, '')) || 0;
      const quad = parseInt(String(rooms.quad).replace(/,/g, '')) || 0;
      const quint = parseInt(String(rooms.quint).replace(/,/g, '')) || 0;
      const child = parseInt(String(rooms.childWithoutPackage).replace(/,/g, '')) || 0;
      const infant = parseInt(String(rooms.InfantWithoutPackage).replace(/,/g, '')) || 0;

      // Calculate total selling price from ticket, hotel, and visa
      const flightSellingPrice = selectedGroup.price?.sellingAdultPriceB2B || 0;
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
          sharing: sharing - totalBuyingCostPerPerson,
          double: double - totalBuyingCostPerPerson,
          triple: triple - totalBuyingCostPerPerson,
          quad: quad - totalBuyingCostPerPerson,
          quint: quint - totalBuyingCostPerPerson,
          childWithoutPackage: child - (selectedGroup.price?.buyingChildPrice || 0) - hotelBuyingCost - transportCost - visaBuyingCost,
          infantWithoutPackage: infant - (selectedGroup.price?.buyingInfantPrice || 0) - hotelBuyingCost - transportCost - visaBuyingCost,
        }
      };
    } catch (error) {
      console.error("Error calculating profit:", error);
      return null;
    }
  };

  const formik = useFormik<FormValues>({
    initialValues: {
      packageName: "",
      selectedGroupTicketId: "",
      logo: "",
      flightLogo: "",
      flights: [],
      hotels: [{
        name: "",
        supplier: { name: "", _id: "" },
        location: { city: "", mapUrl: "" },
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
        doubleRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
        tripleRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
        quadRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
        sharedRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
      }],
      // ✅ NEW: transports initial value
      transports: [{
        route: "",
        supplier: { name: "", _id: "" },
        transportType: "",
      }],
      visa: null,
      rooms: { sharing: "", quad: "", quint: "", triple: "", double: "", childWithoutPackage: "", InfantWithoutPackage: "" },
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
      rooms: Yup.object({
        sharing: optionalNonNegativeNumber,
        quad: optionalNonNegativeNumber,
        quint: optionalNonNegativeNumber,
        triple: optionalNonNegativeNumber,
        double: optionalNonNegativeNumber,
        childWithoutPackage: optionalNonNegativeNumber,
        InfantWithoutPackage: optionalNonNegativeNumber,
      }),
      availableRooms: Yup.number().min(0),
      days: Yup.number().min(0),
    }),
    onSubmit: async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
      if (!canCreate) {
        toast.error("You don't have permission to create Umrah packages");
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



        // Additional validation for hotels
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
        // In the onSubmit function (around line 463)
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

        const res = await axiosInstance.post("/umrahpackages/", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Package successfully submitted!");
        console.log("Package created:", res.data.package);

        resetForm();

        const logoInput = document.getElementById("logoInput") as HTMLInputElement;
        const flightLogoInput = document.getElementById("flightLogoInput") as HTMLInputElement;
        if (logoInput) logoInput.value = "";
        if (flightLogoInput) flightLogoInput.value = "";

        // Copy mode ("Copy" button on Manage Umrah Packages) is a one-shot flow -
        // once the new package is saved, head back to the manage list instead of
        // leaving the admin on this now-blank form. "Save and Copy" has its own
        // success handling below and deliberately stays on this page.
        if (isCopyMode) {
          navigate("/manage-package");
        }
      } catch (error: any) {
        console.error(error);
        const errorMessage = error.response?.data?.error ||
          error.response?.data?.message ||
          "Error preparing package";
        toast.error(errorMessage);
      }
    },
  });

  // Handle Save and Copy - saves package but only resets package name, logo, and hotels
  const handleSaveAndCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!canCreate) {
      toast.error("You don't have permission to create Umrah packages");
      return;
    }


    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      // Mark all fields as touched to show validation errors
      formik.setTouched({
        packageName: true,
        selectedGroupTicketId: true,
        logo: true,
        flightLogo: true,
        hotels: formik.values.hotels.map(() => ({})),
        rooms: {},
        availableRooms: true,
        days: true,
      });
      toast.error("Please fill all required fields correctly");
      return;
    }

    try {
      const selectedGroup = getSelectedGroupTicket(formik.values.selectedGroupTicketId);
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

      // Additional validation for hotels
      const hasEmptyHotel = formik.values.hotels.some(hotel => !hotel.name || !hotel.location.city);
      if (hasEmptyHotel) {
        toast.error("Please fill hotel name and city for all hotels");
        return;
      }

      const hasMissingHotelSupplier = formik.values.hotels.some(
        (hotel) => !hotel.supplier?.name,
      );
      if (hasMissingHotelSupplier) {
        toast.error("Please select supplier for all hotels");
        return;
      }

      const hasMissingTransportSupplier = formik.values.transports.some(
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
      formData.append("packageName", formik.values.packageName);
      formData.append("availableRooms", formik.values.availableRooms?.toString() || "0");
      formData.append("days", formik.values.days?.toString() || "0");
      formData.append("flights", JSON.stringify(selectedGroup.flights));
      formData.append("hotels", JSON.stringify(formik.values.hotels));
      formData.append("transports", JSON.stringify(formik.values.transports));
      formData.append("visa", JSON.stringify(formik.values.visa));
      formData.append("rooms", JSON.stringify(formik.values.rooms));
      formData.append("selectedGroupTicketId", formik.values.selectedGroupTicketId);
      formData.append("packageTotals", JSON.stringify(packageTotals));
      formData.append("internalStatus", internalStatus);

      const res = await axiosInstance.post("/umrahpackages/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Package successfully submitted and copied!");
      console.log("Package created:", res.data.package);

      // Partial reset - reset package name, logo, hotels, and room pricing
      formik.setFieldValue("packageName", "");
      formik.setFieldValue("logo", "");
      formik.setFieldValue("hotels", [{
        name: "",
        supplier: { name: "", _id: "" },
        location: { city: "", mapUrl: "" },
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
        doubleRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
        tripleRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
        quadRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
        sharedRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
      }]);
      formik.setFieldValue("rooms", { sharing: "", quad: "", quint: "", triple: "", double: "", childWithoutPackage: "", InfantWithoutPackage: "" });

      const logoInput = document.getElementById("logoInput") as HTMLInputElement;
      if (logoInput) logoInput.value = "";

      // Keep flight logo, flights, transports, availableRooms, days as they are
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        "Error preparing package";
      toast.error(errorMessage);
    }
  };

  // Copy mode's "Edit" button on the "Copied From Source Package" panel - snapshots
  // the current hotels/transports/visa so "Cancel" can restore exactly what was
  // copied, then reveals the full editable sections.
  const startEditingCopiedSections = () => {
    copiedSectionsSnapshotRef.current = {
      hotels: JSON.parse(JSON.stringify(formik.values.hotels)),
      transports: JSON.parse(JSON.stringify(formik.values.transports)),
      visa: formik.values.visa ? JSON.parse(JSON.stringify(formik.values.visa)) : null,
    };
    setEditingCopiedSections(true);
  };

  // Reverts hotels/transports/visa back to the snapshot taken when "Edit" was
  // clicked, discarding any changes made in the editable sections.
  const cancelEditingCopiedSections = () => {
    const snapshot = copiedSectionsSnapshotRef.current;
    if (snapshot) {
      formik.setFieldValue("hotels", snapshot.hotels);
      formik.setFieldValue("transports", snapshot.transports);
      formik.setFieldValue("visa", snapshot.visa);
    }
    setSelectedRateVolumeByHotel({});
    setEditingCopiedSections(false);
  };

  // Keeps whatever edits were made and collapses back to the read-only summary.
  const finishEditingCopiedSections = () => {
    setEditingCopiedSections(false);
  };

  // ✅ NEW: Transport helpers
  const addTransport = () => {
    formik.setFieldValue("transports", [
      ...formik.values.transports,
      {
        route: "",
        supplier: { name: "", _id: "" },
        transportType: "",
        startDate: "",
        endDate: "",
      },
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

  const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
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

  const findHotelRateInVolume = (
    volume: RateVolumeData,
    hotelId: string | undefined,
    checkIn?: string,
    checkOut?: string
  ): RateVolumeHotelRate | undefined => {
    return resolveHotelRateForStay(volume, hotelId, checkIn, checkOut);
  };

  // Finds any active root volume containing this hotel and covering the stay.
  const findMatchingRateVolume = (
    hotelId: string | undefined,
    checkIn: string,
    checkOut: string
  ): { option: RateVolumeOption; rate: RateVolumeHotelRate } | undefined => {
    if (!hotelId || !checkIn || !checkOut) return undefined;
    for (const option of rateVolumeOptions) {
      const rate = findHotelRateInVolume(option.data, hotelId, checkIn, checkOut);
      if (rate) return { option, rate };
    }
    return undefined;
  };

  // Builds the hotel-row fields (name/city/rating + buying/selling incl. the
  // per-room-type breakdown) implied by a Rate Volume - pulling the hotel's own details
  // (rating, map URL) from the already-loaded Hotel list via its hotelId.
  const computeVolumeFields = (hotel: HotelForm, volumeName: string, rate: RateVolumeHotelRate): Partial<HotelForm> => {
    const buying = rate.buyingPrice || 0;
    const buyingRoe = rate.buyingRoe ?? 1;
    const selling = rate.sellingPrice || 0;
    const sellingRoe = rate.sellingRoe ?? 1;
    // Shared Room uses its own dedicated rate from the volume (not a split of the
    // buying/selling rate above, which only feeds Double/Triple/Quad).
    const sharedBuying = rate.sharedRoomBuyingPrice || 0;
    const sharedBuyingRoe = rate.sharedRoomBuyingRoe ?? 1;
    const sharedSelling = rate.sharedRoomSellingPrice || 0;
    const sharedSellingRoe = rate.sharedRoomSellingRoe ?? 1;

    const fields: Partial<HotelForm> = {
      rateVolumeName: volumeName,
      buyingPrice: buying,
      buyingRoe,
      buyingCurrency: rate.buyingCurrency,
      sellingPrice: selling,
      sellingRoe,
      sellingCurrency: rate.sellingCurrency,
      doubleRoom: { ...hotel.doubleRoom, buyingPrice: parseFloat((buying / 2).toFixed(2)), buyingRoe, sellingPrice: parseFloat((selling / 2).toFixed(2)), sellingRoe },
      tripleRoom: { ...hotel.tripleRoom, buyingPrice: parseFloat((buying / 3).toFixed(2)), buyingRoe, sellingPrice: parseFloat((selling / 3).toFixed(2)), sellingRoe },
      quadRoom: { ...hotel.quadRoom, buyingPrice: parseFloat((buying / 4).toFixed(2)), buyingRoe, sellingPrice: parseFloat((selling / 4).toFixed(2)), sellingRoe },
      sharedRoom: { ...hotel.sharedRoom, buyingPrice: sharedBuying, buyingRoe: sharedBuyingRoe, sellingPrice: sharedSelling, sellingRoe: sharedSellingRoe },
    };

    const matchedHotelOption = rate.hotelId ? hotelOptions.find((h) => h.value === rate.hotelId) : undefined;
    if (matchedHotelOption) {
      fields.hotelId = matchedHotelOption.value;
      fields.name = matchedHotelOption.data?.hotelName || matchedHotelOption.label;
      fields.location = {
        city: matchedHotelOption.data?.city || rate.city || hotel.location.city,
        mapUrl: matchedHotelOption.data?.mapUrl || hotel.location.mapUrl,
      };
      fields.rating = Number(matchedHotelOption.data?.rating || 0);
    } else if (rate.hotelId) {
      // Hotel list hasn't loaded yet - at least keep the id/city so matching still works.
      fields.hotelId = rate.hotelId;
      if (rate.city) {
        fields.location = { ...hotel.location, city: rate.city };
      }
    }

    return fields;
  };

  // Resets a hotel row's buying/selling fields (and per-room breakdown) back to blank -
  // used when a previously-applied Rate Volume no longer covers the stay dates.
  const emptyRateFields = (): Partial<HotelForm> => ({
    rateVolumeName: "",
    buyingPrice: undefined,
    buyingRoe: 1,
    buyingCurrency: "PKR",
    sellingPrice: undefined,
    sellingRoe: 1,
    sellingCurrency: "PKR",
    doubleRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
    tripleRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
    quadRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
    sharedRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
  });

  const updateHotel = (index: number, fields: Partial<HotelForm>) => {
    const updated = [...formik.values.hotels];
    updated[index] = { ...updated[index], ...fields };

    const row = updated[index];
    if (Object.prototype.hasOwnProperty.call(fields, "checkIn")) {
      if (row.checkIn && row.nights > 0) {
        row.checkOut = calculateCheckOut(row.checkIn, row.nights);
      } else if (row.checkIn && row.checkOut) {
        const nights = calculateNights(row.checkIn, row.checkOut);
        row.nights = nights;
        row.nightCount = nights;
      }
    }

    if (Object.prototype.hasOwnProperty.call(fields, "checkOut")) {
      const nights = calculateNights(row.checkIn, row.checkOut);
      row.nights = nights;
      row.nightCount = nights;
    }

    if (Object.prototype.hasOwnProperty.call(fields, "nights")) {
      const nextNights = Number(row.nights) || 0;
      row.nights = nextNights;
      row.nightCount = nextNights;
      if (row.checkIn && nextNights > 0) {
        row.checkOut = calculateCheckOut(row.checkIn, nextNights);
      }
    }

    // Whenever the stay dates change, auto-apply the Rate Volume (if any) for this
    // hotel whose date range covers the (possibly just-recalculated) check-in/check-out.
    const datesChanged =
      Object.prototype.hasOwnProperty.call(fields, "checkIn") ||
      Object.prototype.hasOwnProperty.call(fields, "checkOut") ||
      Object.prototype.hasOwnProperty.call(fields, "nights");
    const resolvedHotelIdForDates = datesChanged ? resolveHotelId(row) : undefined;
    if (datesChanged && resolvedHotelIdForDates && row.checkIn && row.checkOut) {
      const selectedVolumeId = selectedRateVolumeByHotel[index];
      const selectedOption = selectedVolumeId
        ? rateVolumeOptions.find((option) => option.value === selectedVolumeId)
        : undefined;
      const selectedRate = selectedOption
        ? findHotelRateInVolume(selectedOption.data, resolvedHotelIdForDates, row.checkIn, row.checkOut)
        : undefined;
      const match = selectedOption
        ? selectedRate ? { option: selectedOption, rate: selectedRate } : undefined
        : findMatchingRateVolume(resolvedHotelIdForDates, row.checkIn, row.checkOut);
      if (match) {
        Object.assign(row, computeVolumeFields(row, match.option.data.volumeName, match.rate));
        setSelectedRateVolumeByHotel((prev) => ({ ...prev, [index]: match.option.value }));
      } else if (selectedOption) {
        Object.assign(row, emptyRateFields());
        toast.error(
          `"${selectedOption.data.volumeName}" has no single date band covering every night from ${formatFlightDate(row.checkIn)} to ${formatFlightDate(row.checkOut)}. Rates were cleared. Split the stay into separate hotel rows for each rate band.`
        );
      }
    }

    updated[index] = row;
    formik.setFieldValue("hotels", updated);
  };

  // Applies a manually-picked Hotel Name (not via Rate Volume) - fills its details and,
  // if check-in/check-out are already set, also auto-applies a matching Rate Volume.
  const applyHotelSelection = (index: number, hotel: HotelForm, selected: HotelOption) => {
    const baseFields: Partial<HotelForm> = {
      hotelId: selected.value,
      name: selected.data?.hotelName || selected.label,
      location: {
        city: selected.data?.city || hotel.location.city,
        mapUrl: selected.data?.mapUrl || "",
      },
      rating: Number(selected.data?.rating || 0),
    };

    const selectedVolumeId = selectedRateVolumeByHotel[index];
    const selectedOption = selectedVolumeId
      ? rateVolumeOptions.find((option) => option.value === selectedVolumeId)
      : undefined;

    if (selectedOption) {
      const rate = findHotelRateInVolume(selectedOption.data, selected.value, hotel.checkIn, hotel.checkOut);
      if (rate) {
        Object.assign(baseFields, computeVolumeFields({ ...hotel, ...baseFields } as HotelForm, selectedOption.data.volumeName, rate));
      } else {
        Object.assign(baseFields, emptyRateFields());
        toast.error(
          `"${selectedOption.data.volumeName}" has no ${hotel.checkIn && hotel.checkOut ? "single date band covering the complete stay for " : ""}${selected.label}.${hotel.checkIn && hotel.checkOut ? " Split the stay into separate hotel rows for each rate band." : ""}`
        );
      }
    } else if (hotel.checkIn && hotel.checkOut) {
      const match = findMatchingRateVolume(selected.value, hotel.checkIn, hotel.checkOut);
      if (match) {
        Object.assign(baseFields, computeVolumeFields({ ...hotel, ...baseFields } as HotelForm, match.option.data.volumeName, match.rate));
        setSelectedRateVolumeByHotel((prev) => ({ ...prev, [index]: match.option.value }));
      }
    }

    updateHotel(index, baseFields);
  };

  // Deselects the "Rate Volume" dropdown for a hotel row once any of the 6 pricing
  // fields it filled in gets edited by hand, so the dropdown never shows a volume that
  // no longer matches the actual values.
  const clearSelectedRateVolume = (index: number) => {
    setSelectedRateVolumeByHotel((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  // Rate Volume matching keys off hotelId, but rows carried over from an older/copied
  // package (or typed freehand before this tracking existed) can have it blank even
  // though the name matches a real Hotel - fall back to a name match so those rows
  // still resolve instead of silently failing to apply/validate a Rate Volume.
  const resolveHotelId = (hotel: HotelForm): string | undefined => {
    if (hotel.hotelId) return hotel.hotelId;
    const name = hotel.name?.trim().toLowerCase();
    if (!name) return undefined;
    return hotelOptions.find(
      (option) => (option.data?.hotelName || option.label).trim().toLowerCase() === name
    )?.value;
  };

  const applyRateVolumeToHotel = (index: number, hotel: HotelForm, volume: RateVolumeData) => {
    const hotelId = resolveHotelId(hotel);
    if (!hotelId) {
      toast.error(`Select a Hotel Name for this row first so "${volume.volumeName}" can be matched to it.`);
      return;
    }
    const rate = findHotelRateInVolume(volume, hotelId, hotel.checkIn, hotel.checkOut);
    if (!rate) {
      updateHotel(index, emptyRateFields());
      toast.error(
        `"${volume.volumeName}" has no rate for this hotel${hotel.checkIn && hotel.checkOut ? " within one date band covering the complete stay. Split the stay into separate hotel rows for each rate band" : ""}.`
      );
      return;
    }
    updateHotel(index, computeVolumeFields(hotel.hotelId ? hotel : { ...hotel, hotelId }, volume.volumeName, rate));
  };

  // Manual entry for Buying Price/Room (used when no Rate Volume is picked) - mirrors
  // the previous plain-number-input behaviour, recomputing Selling Price via the ROE.
  const handleManualBuyingPrice = (index: number, hotel: HotelForm, rawValue: string) => {
    clearSelectedRateVolume(index);
    const val = rawValue.trim() === "" ? undefined : Number(rawValue);
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
  };

  // Manual entry for Selling Price/Room (used when no Rate Volume is picked).
  const handleManualSellingPrice = (index: number, hotel: HotelForm, rawValue: string) => {
    clearSelectedRateVolume(index);
    const val = rawValue.trim() === "" ? undefined : Number(rawValue);
    const numVal = val || 0;
    updateHotel(index, {
      sellingPrice: val,
      doubleRoom: { ...hotel.doubleRoom, sellingPrice: parseFloat((numVal / 2).toFixed(2)) },
      tripleRoom: { ...hotel.tripleRoom, sellingPrice: parseFloat((numVal / 3).toFixed(2)) },
      quadRoom: { ...hotel.quadRoom, sellingPrice: parseFloat((numVal / 4).toFixed(2)) },
      sharedRoom: { ...hotel.sharedRoom, sellingPrice: parseFloat((numVal / 5).toFixed(2)) },
    });
  };

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
    formik.values.rooms
  ]);

  // ✅ Effect to sync package totals from computed values
  useEffect(() => {
    // Skip recalculation while hotels/visa/selectedGroupTicketId still match exactly
    // what a copied package's data just set them to, so the copied packageTotals
    // (including any manual incentive) aren't overwritten by a spurious re-render (e.g.
    // umrahGroups arriving) before the user makes a real edit. The moment any of them
    // actually differ, drop the baseline for good and recompute normally from then on.
    if (copiedTotalsBaselineRef.current !== null) {
      const currentSignature = JSON.stringify({
        selectedGroupTicketId: formik.values.selectedGroupTicketId,
        hotels: formik.values.hotels,
        visa: formik.values.visa,
      });
      if (currentSignature === copiedTotalsBaselineRef.current) {
        return;
      }
      copiedTotalsBaselineRef.current = null;
    }
    const selectedGroup = getSelectedGroupTicket(formik.values.selectedGroupTicketId);
    const flightSellingPrice = selectedGroup?.price?.sellingAdultPriceB2B || 0;
    const childSellingPrice = selectedGroup?.price?.sellingChildPriceB2B || 0;
    const infantSellingPrice = selectedGroup?.price?.sellingInfantPriceB2B || 0;
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
      // A child with bed uses the same hotel pricing basis as the shared package.
      childWithBed: Math.round(childSellingPrice + hotelTotals.shared + visaSellingPKR),
      infant: Math.round(infantSellingPrice + visaSellingPKR),
    };
    baseTotalsRef.current = base;
    setPackageTotals((prev) => ({
      double: base.double + prev.incentive,
      triple: base.triple + prev.incentive,
      quad: base.quad + prev.incentive,
      shared: base.shared + prev.incentive,
      childWithoutBed: base.childWithoutBed,
      childWithBed: base.childWithBed + prev.incentive,
      infant: base.infant,
      incentive: prev.incentive,
    }));
  }, [
    formik.values.selectedGroupTicketId,
    formik.values.hotels,
    formik.values.visa,
    umrahGroups,
  ]);

  // Copy mode: a copied hotel only carries the Rate Volume's name (rateVolumeName) -
  // the dropdown selection itself is UI-only state that starts empty. Once the volume
  // list has loaded, resolve each untried hotel row's volume name (and hotel identity,
  // falling back by name via resolveHotelId) back to an actual option so "Rate Volume"
  // shows what was really used instead of appearing blank in Edit mode.
  useEffect(() => {
    if (!isCopyMode || !rateVolumeOptions.length) return;
    setSelectedRateVolumeByHotel((prev) => {
      let changed = false;
      const next = { ...prev };
      formik.values.hotels.forEach((hotel, index) => {
        if (restoredRateVolumeIndexesRef.current.has(index)) return;
        restoredRateVolumeIndexesRef.current.add(index);
        if (!hotel.rateVolumeName) return;
        const hotelId = resolveHotelId(hotel);
        if (!hotelId) return;
        const match = rateVolumeOptions.find(
          (option) =>
            option.data.volumeName === hotel.rateVolumeName &&
            option.data.hotelRates.some((rate) => rate.hotelId === hotelId)
        );
        if (match) {
          next[index] = match.value;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [isCopyMode, rateVolumeOptions, formik.values.hotels]);

  if (!canCreate) {
    return (
      <ComponentCard title={copyId ? "Copy Umrah Package" : "Add Umrah Package"}>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
          You do not have permission to create Umrah Packages.
        </div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title={copyId ? "Copy Umrah Package" : "Add Umrah Package"}>
      <div className="overflow-hidden rounded-xl border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
        {loadingCopy && (
          <div className="flex items-center gap-2 border-b border-gray-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Loading package data to copy...
          </div>
        )}
        <form onSubmit={formik.handleSubmit} className="space-y-3 p-2">
          {(() => {
            const selectedGroup = getSelectedGroupTicket(formik.values.selectedGroupTicketId);

            return (
              <>
                {/* Package Name, Logo and Flight Logo fields are hidden. Package Name is
                    auto-derived from the selected group ticket's sector (see the
                    Umrah Group Ticket onChange below) and still saved with the package;
                    Logo/Flight Logo are not currently needed.
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Package Name</label>
                    <input
                      type="text"
                      name="packageName"
                      onChange={formik.handleChange}
                      value={formik.values.packageName}
                      className="border p-2 w-full rounded text-sm h-9"
                      placeholder="Enter package name"
                    />
                    {formik.touched.packageName && formik.errors.packageName && (
                      <p className="text-red-500 text-xs mt-1">{formik.errors.packageName}</p>
                    )}
                  </div>

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
                */}

                <div className="border rounded-lg p-4 space-y-4 bg-white shadow-sm">
                  <div>
                    <label className="block text-xs font-semibold mb-2 text-gray-700">Umrah Group Ticket</label>
                    <select
                      name="selectedGroupTicketId"
                      value={formik.values.selectedGroupTicketId}
                      onChange={(e) => {
                        const groupId = e.target.value;
                        const group = getSelectedGroupTicket(groupId);
                        formik.setFieldValue("selectedGroupTicketId", groupId);
                        formik.setFieldValue("flights", group?.flights || []);
                        // Package Name and Total Seats are no longer shown as inputs - they
                        // are derived from the selected group ticket's sector and seat count.
                        const sector =
                          group?.sector ||
                          group?.flights?.map((flight) => `${flight.sectorFrom}-${flight.sectorTo}`).join(", ") ||
                          "";
                        formik.setFieldValue("packageName", sector);
                        formik.setFieldValue("availableRooms", group?.totalSeats || 0);

                        // Auto-set the 1st hotel's Check-in Date from the first flight's
                        // arrival date (falls back to its departure date), since that's
                        // when the group actually lands and can check into the hotel.
                        const firstFlight = group?.flights?.[0];
                        const flightDate = firstFlight?.arrDate || firstFlight?.depDate;
                        if (flightDate) {
                          const isoCheckIn = flightDate.slice(0, 10);
                          const updatedHotels = [...formik.values.hotels];
                          if (updatedHotels.length > 0) {
                            const firstHotel = { ...updatedHotels[0], checkIn: isoCheckIn };
                            if (firstHotel.nights > 0) {
                              firstHotel.checkOut = calculateCheckOut(isoCheckIn, firstHotel.nights);
                            }
                            updatedHotels[0] = firstHotel;
                            formik.setFieldValue("hotels", updatedHotels);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors duration-200"
                      disabled={loadingGroups}
                    >
                      <option value="">{loadingGroups ? "Loading Umrah groups..." : "Select Umrah group"}</option>
                      {umrahGroups.map((group) => {
                        const firstFlight = group.flights?.[0];
                        const lastFlight = group.flights?.[group.flights.length - 1];
                        const depLabel = formatFlightDate(firstFlight?.depDate);
                        const arrLabel = formatFlightDate(lastFlight?.arrDate);
                        return (
                          <option key={group._id} value={group._id} className="py-2">
                            {`${group.groupName || group.groupBookingId || group.sector || "Untitled Group"} | Seats: ${group.totalSeats || 0} | PNR: ${group.pnr || "N/A"} | SUPPLIER: ${group.user.name} | Dep: ${depLabel} | Arr: ${arrLabel}`}
                          </option>
                        );
                      })}

                    </select>
                    {formik.touched.selectedGroupTicketId && formik.errors.selectedGroupTicketId && (
                      <p className="text-red-500 text-xs mt-1">{formik.errors.selectedGroupTicketId}</p>
                    )}
                  </div>

                  {selectedGroup && (
                    <div className="rounded-lg border border-gray-200 bg-linear-to-br from-gray-50 to-white p-4 shadow-md transition-all duration-300">
                      {/* <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 mb-4">
                        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Group</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedGroup.groupName || selectedGroup.groupBookingId || "-"}
                          </p>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Sector</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {selectedGroup.sector || selectedGroup.flights.map((flight) => `${flight.sectorFrom}-${flight.sectorTo}`).join(", ") || "-"}
                          </p>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Available Seats</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedGroup.totalSeats || 0}</p>
                        </div>

                        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">PNR</p>
                          {selectedGroup.pnr ? (
                            <p className="inline-flex items-center gap-1 px-2 py-1 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-md text-xs font-mono font-bold shadow-md">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
                              </svg>
                              {selectedGroup.pnr}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No PNR</p>
                          )}
                        </div>
                      </div> */}

                      <div>
                        <p className="text-xs font-bold mb-3 text-gray-700 uppercase tracking-wide flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                          </svg>
                          Selected Flights
                        </p>

                        <div className="grid grid-cols-2 gap-2.5">
                          {selectedGroup.flights?.length ? (
                            selectedGroup.flights.map((flight, index) => (
                              <div
                                key={`${flight.flightNo}-${index}`}
                                className="rounded-lg border border-gray-200 bg-white hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                              >
                                <div className="bg-linear-to-r from-blue-50 to-white px-3 py-2 border-b border-gray-100">
                                  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-bold text-sm text-gray-900">
                                        {flight.airline || "Airline"} {flight.flightNo}
                                      </span>
                                      <span className="text-sm font-medium text-gray-600">
                                        {flight.sectorFrom} ✈ {flight.sectorTo}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                                      <span className={`px-2 py-0.5 rounded-full font-semibold ${flight.flightClass?.toLowerCase().includes('business')
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : flight.flightClass?.toLowerCase().includes('first')
                                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                                        }`}>
                                        ✈️ {flight.flightClass?.trim() || "Economy"}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                                        🧳 {flight.baggage?.trim() || "N/A"}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-semibold">
                                        🍽️ {flight.meal?.trim() || "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-3">
                                  <div className="flex flex-col gap-2 text-xs text-gray-600 md:flex-row md:gap-6">
                                    <span className="flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Departure: {formatFlightDate(flight.depDate)} {flight.depTime || ""}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Arrival: {formatFlightDate(flight.arrDate)} {flight.arrTime || ""}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xs text-red-500 font-medium">No flights found in selected group.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Read-only summary of the Hotel/Transport/Visa carried over from the
                    source package - shown in place of the full editable sections
                    (which are hidden below) so the admin can still see what's implied
                    in this copy without being able to accidentally alter it here. */}
                {isCopyMode && (
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Copied From Source Package</h4>
                      <div className="flex items-center gap-2">
                        {editingCopiedSections ? (
                          <>
                            <button
                              type="button"
                              onClick={cancelEditingCopiedSections}
                              className="rounded-md bg-linear-to-r from-red-500 to-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-red-600 hover:to-red-700 transition-colors duration-200"
                            >
                              ✕ Cancel
                            </button>
                            <button
                              type="button"
                              onClick={finishEditingCopiedSections}
                              className="rounded-md bg-linear-to-r from-green-500 to-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-green-600 hover:to-green-700 transition-colors duration-200"
                            >
                              ✓ Done Editing
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={startEditingCopiedSections}
                            className="rounded-md bg-linear-to-r from-blue-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-blue-600 hover:to-blue-700 transition-colors duration-200"
                          >
                            ✎ Edit
                          </button>
                        )}
                      </div>
                    </div>
                    {!editingCopiedSections && (
                      <div className="p-4 grid grid-cols-1 gap-4 divide-y divide-gray-200 md:grid-cols-3 md:divide-y-0 md:divide-x [&>*:not(:first-child)]:pt-3 [&>*:not(:first-child)]:md:pt-0 [&>*:not(:first-child)]:md:pl-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                            Hotels
                          </p>
                          {formik.values.hotels.length ? (
                            <div className="flex flex-wrap gap-2">
                              {formik.values.hotels.map((hotel, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                                >
                                  {hotel.name || "Unnamed Hotel"}
                                  {hotel.location?.city ? ` - ${hotel.location.city}` : ""}
                                  {hotel.nights ? ` (${hotel.nights}N)` : ""}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs italic text-gray-400">No hotels</p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                            Transport
                          </p>
                          {formik.values.transports.some((t) => t.route) ? (
                            <div className="flex flex-wrap gap-2">
                              {formik.values.transports
                                .filter((t) => t.route)
                                .map((transport, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                                  >
                                    {transport.route}
                                    {transport.transportType ? ` (${transport.transportType})` : ""}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <p className="text-xs italic text-gray-400">No transport</p>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
                            Visa
                          </p>
                          {formik.values.visa ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              {formik.values.visa.visaType || "Visa"}
                              {" "}
                              ({formik.values.visa.withTransport ? "With Transport" : "Without Transport"})
                            </span>
                          ) : (
                            <p className="text-xs italic text-gray-400">No visa</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Available Rooms and Days - Row 2 */}
                {/* Total Seats is hidden - it is auto-filled from the selected group
                    ticket's seat count (see the Umrah Group Ticket onChange above) and
                    still saved with the package.
                <div>
                  <label className="block text-xs font-semibold mb-1">Total Seats</label>
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
                */}
                {!isCopyMode && (
                  <div className="grid grid-cols-1 gap-3">
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
                )}

                {/* Hotels - New Design matching screenshot: hidden in copy mode unless
                    the admin clicked "Edit" on the "Copied From Source Package" panel
                    above - then it's the exact same editable section as Create Umrah
                    Package, operating on the same formik state that was pre-filled
                    from the source package. */}
                {(!isCopyMode || editingCopiedSections) && (
                  <div>
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
                          {/* Row 1: Supplier, Rate Volume, Hotel Name, City */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                              <label className="block text-xs font-semibold mb-1">Rate Volume</label>
                              <Select
                                options={rateVolumeOptions}
                                value={
                                  selectedRateVolumeByHotel[index]
                                    ? rateVolumeOptions.find((v) => v.value === selectedRateVolumeByHotel[index]) ?? null
                                    : null
                                }
                                onChange={(option) => {
                                  if (!option) {
                                    setSelectedRateVolumeByHotel((prev) => {
                                      const next = { ...prev };
                                      delete next[index];
                                      return next;
                                    });
                                    return;
                                  }
                                  setSelectedRateVolumeByHotel((prev) => ({ ...prev, [index]: option.value }));
                                  // applyRateVolumeToHotel resolves the hotel id itself (falling back to
                                  // a Hotel Name match) and always reports an error if it still can't
                                  // find one, so a row missing hotelId never fails to apply silently.
                                  applyRateVolumeToHotel(index, hotel, option.data);
                                }}
                                placeholder="Select Volume"
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
                              <label className="block text-xs font-semibold mb-1">Hotel Name</label>
                              <CreatableSelect
                                options={hotelOptions}
                                onCreateOption={(inputValue) => {
                                  clearSelectedRateVolume(index);
                                  updateHotel(index, { name: inputValue, hotelId: "" });
                                }}
                                onChange={(option: any) => {
                                  const selected = option as HotelOption;
                                  if (!selected) {
                                    clearSelectedRateVolume(index);
                                    updateHotel(index, { name: "", hotelId: "", location: { city: hotel.location.city, mapUrl: "" }, rating: 0 });
                                    return;
                                  }
                                  if (selected.data) {
                                    applyHotelSelection(index, hotel, selected);
                                    return;
                                  }
                                  clearSelectedRateVolume(index);
                                  updateHotel(index, { name: selected.label || "", hotelId: "" });
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
                            <div>
                              <label className="block text-xs font-semibold mb-1">City</label>
                              <CreatableSelect
                                options={cityOptions}
                                value={hotel.location.city ? { value: hotel.location.city, label: hotel.location.city } : null}
                                onChange={(option: any) => updateHotel(index, { location: { ...hotel.location, city: option?.value || "" } })}
                                onCreateOption={(inputValue) => updateHotel(index, { location: { ...hotel.location, city: inputValue } })}
                                placeholder="Select or type City"
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
                          </div>

                          {/* Row 2: Check-in, Check-out, Nights, Buying Price/Room, Buying ROE, Currency, Selling Price/Room, Selling ROE */}
                          <div className="grid grid-cols-2 md:grid-cols-9 gap-3 items-end">
                            <div>
                              <label className="block text-xs font-semibold mb-1">Check-in Date</label>
                              <DatePicker
                                selected={parseISODate(hotel.checkIn)}
                                onChange={(date: Date | null) => updateHotel(index, { checkIn: date ? dateToISO(date) : "" })}
                                dateFormat="dd-MM-yyyy"
                                minDate={getTodayDate()}
                                customInput={<input type="text" placeholder="dd-----yyyy" className="border p-2 w-full rounded text-xs h-9" />}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Check-out Date</label>
                              <DatePicker
                                selected={parseISODate(hotel.checkOut)}
                                onChange={(date: Date | null) => updateHotel(index, { checkOut: date ? dateToISO(date) : "" })}
                                dateFormat="dd-MM-yyyy"
                                minDate={hotel.checkIn ? parseISODate(hotel.checkIn) || getTodayDate() : getTodayDate()}
                                customInput={<input type="text" placeholder="dd-----yyyy" className="border p-2 w-full rounded text-xs h-9" />}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Nights</label>
                              <input
                                type="number"
                                value={hotel.nights || ""}
                                onChange={(e) => updateHotel(index, { nights: Number(e.target.value) || 0 })}
                                className="border p-2 w-full rounded text-xs h-9"
                                placeholder="0"
                                min={0}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Buying Price/Room</label>
                              <input
                                type="number"
                                value={hotel.buyingPrice ?? ""}
                                onChange={(e) => handleManualBuyingPrice(index, hotel, e.target.value)}
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
                                  clearSelectedRateVolume(index);
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
                                onChange={(opt) => {
                                  clearSelectedRateVolume(index);
                                  updateHotel(index, { buyingCurrency: opt?.value || "PKR", sellingCurrency: opt?.value || "PKR" });
                                }}
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
                                  onChange={(e) => handleManualSellingPrice(index, hotel, e.target.value)}
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
                                  clearSelectedRateVolume(index);
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
                                onChange={(opt) => {
                                  clearSelectedRateVolume(index);
                                  updateHotel(index, { sellingCurrency: opt?.value || "PKR" });
                                }}
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

                          {/* Room Type Cards - single row */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {([
                              { key: "doubleRoom", label: "Double Room (2 Pax)", color: "bg-green-600", paxLabel: "Price/Pax" },
                              { key: "tripleRoom", label: "Triple Room (3 Pax)", color: "bg-teal-500", paxLabel: `Price/Pax${""}` },
                              { key: "quadRoom", label: "Quad Room (4 Pax)", color: "bg-blue-500", paxLabel: "Price/Pax" },
                              { key: "sharedRoom", label: "Shared Room", color: "bg-yellow-500", paxLabel: "Total Price" },
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
                        onClick={() => {
                          // The new hotel's Check-in Date starts where the previous
                          // hotel's Check-out Date left off, so consecutive hotel stays
                          // chain together instead of both defaulting to blank.
                          const hotels = formik.values.hotels;
                          const previousHotel = hotels[hotels.length - 1];
                          formik.setFieldValue("hotels", [
                            ...hotels,
                            {
                              name: "",
                              supplier: { name: "", _id: "" },
                              location: { city: "", mapUrl: "" },
                              rating: 0,
                              checkIn: previousHotel?.checkOut || "",
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
                              doubleRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
                              tripleRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
                              quadRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
                              sharedRoom: { buyingPrice: 0, buyingRoe: 1, sellingPrice: 0, sellingRoe: 1 },
                            },
                          ]);
                        }}
                        className="bg-green-600 text-white px-6 py-2 rounded text-sm hover:bg-green-700"
                      >
                        + Add More Hotels
                      </button>
                    </div>
                  </div>
                )}

                {/* ✅ NEW: Transport Section - same pattern as Hotels: hidden in copy
                    mode unless the admin clicked "Edit" above. */}
                {(!isCopyMode || editingCopiedSections) && (
                  <div className="border rounded p-3">
                    <h4 className="text-sm font-semibold mb-2">Transport</h4>
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
                            placeholder="Type route..."
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
                )}

                {/* Visa Selection: hidden in copy mode unless the admin clicked "Edit"
                    above. */}
                {(!isCopyMode || editingCopiedSections) && (
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="px-4 py-2 border-b bg-white">
                      <h4 className="text-sm font-semibold">Visa</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">Visa Type</label>
                          <Select
                            options={visaOptions}
                            value={visaOptions.find((v) => v.value === formik.values.visa?.visaId) ?? null}
                            onChange={(option) => {
                              if (option?.data) {
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
                            placeholder="Select visa..."
                            isClearable
                            isSearchable
                            className="text-xs"
                            styles={{
                              control: (base) => ({ ...base, minHeight: "36px", fontSize: "0.75rem" }),
                              valueContainer: (base) => ({ ...base, padding: "0 8px" }),
                              input: (base) => ({ ...base, margin: "0", padding: "0" }),
                            }}
                          />
                          {formik.errors.visa && formik.touched.visa && (
                            <p className="text-red-500 text-xs mt-1">{String(formik.errors.visa)}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Select Supplier Account</label>
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

                            menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                            menuPosition="fixed"

                            styles={{
                              control: (base) => ({
                                ...base,
                                minHeight: "36px",
                                fontSize: "0.75rem",
                              }),

                              valueContainer: (base) => ({
                                ...base,
                                padding: "0 8px",
                              }),

                              input: (base) => ({
                                ...base,
                                margin: "0",
                                padding: "0",
                              }),

                              menuPortal: (base) => ({
                                ...base,
                                zIndex: 99999,
                              }),

                              menu: (base) => ({
                                ...base,
                                zIndex: 99999,
                              }),
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Buying Price</label>
                          <input
                            type="number"
                            value={formik.values.visa ? (formik.values.visa.buyingPrice || 0) * (formik.values.visa.buyingRoe || 1) : ""}
                            readOnly
                            className="border p-2 w-full rounded text-sm h-9 bg-white"
                            placeholder=""
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Selling Price</label>
                          <input
                            type="number"
                            value={formik.values.visa ? (formik.values.visa.sellingPrice || 0) * (formik.values.visa.sellingRoe || 1) : ""}
                            readOnly
                            className="border p-2 w-full rounded text-sm h-9 bg-white"
                            placeholder=""
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Currency</label>
                          <input
                            type="text"
                            value={formik.values.visa?.currency || formik.values.visa?.sellingCurrency || "PKR"}
                            readOnly
                            className="border p-2 w-full rounded text-sm h-9 bg-white"
                            placeholder=""
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profit Breakdown Card - Shown above Submit */}
                {/* {profitBreakdown && (
                  <div className="border rounded-lg p-4 bg-linear-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700">
                    <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Package Cost Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <p className="text-gray-500 dark:text-gray-400">Flight Cost</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          PKR {profitBreakdown.flightCost.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <p className="text-gray-500 dark:text-gray-400">Hotel Cost</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          PKR {formik.values.hotels.reduce((sum, h) => sum + (h.buyingPrice || 0) * (h.buyingRoe || 1) * (h.nights || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <p className="text-gray-500 dark:text-gray-400">Transport Cost</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          PKR {profitBreakdown.transportCost.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <p className="text-gray-500 dark:text-gray-400">Visa Cost</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          PKR {profitBreakdown.visaCost.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Total Cost</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          PKR {profitBreakdown.totalCost.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Selling Price</p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          PKR {profitBreakdown.sellingPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded">
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Profit</p>
                        <p className={`font-bold ${profitBreakdown.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          PKR {profitBreakdown.profit.toLocaleString()} ({profitBreakdown.profitPercentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                )} */}

                {/* Package Totals Section */}
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-green-600 text-white px-4 py-2">
                    <h4 className="text-sm font-semibold">Package Totals (Selling) - Per Pex (PKR)</h4>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Double */}
                      <div className="border rounded overflow-hidden">
                        <div className="bg-green-600 text-white px-3 py-2">
                          <span className="text-xs font-bold">Double Package Total (2 Pax)</span>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center border rounded overflow-hidden h-9">
                            <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                            <input
                              type="number"
                              value={packageTotals.double}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                baseTotalsRef.current = {
                                  ...baseTotalsRef.current,
                                  double: val + packageTotals.incentive,
                                };
                                setPackageTotals((prev) => ({ ...prev, double: val }));
                              }}
                              className="flex-1 p-2 text-xs bg-white outline-none"
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
                          <div className="flex items-center border rounded overflow-hidden h-9">
                            <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                            <input
                              type="number"
                              value={packageTotals.triple}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                baseTotalsRef.current = {
                                  ...baseTotalsRef.current,
                                  triple: val + packageTotals.incentive,
                                };
                                setPackageTotals((prev) => ({ ...prev, triple: val }));
                              }}
                              className="flex-1 p-2 text-xs bg-white outline-none"
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
                          <div className="flex items-center border rounded overflow-hidden h-9">
                            <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                            <input
                              type="number"
                              value={packageTotals.quad}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                baseTotalsRef.current = {
                                  ...baseTotalsRef.current,
                                  quad: val + packageTotals.incentive,
                                };
                                setPackageTotals((prev) => ({ ...prev, quad: val }));
                              }}
                              className="flex-1 p-2 text-xs bg-white outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Shared */}
                      <div className="border rounded overflow-hidden">
                        <div className="bg-yellow-500 text-white px-3 py-2">
                          <span className="text-xs font-bold">Shared Package Total</span>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center border rounded overflow-hidden h-9">
                            <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                            <input
                              type="number"
                              value={packageTotals.shared}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                baseTotalsRef.current = {
                                  ...baseTotalsRef.current,
                                  shared: val + packageTotals.incentive,
                                };
                                setPackageTotals((prev) => ({ ...prev, shared: val }));
                              }}
                              className="flex-1 p-2 text-xs bg-white outline-none"
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
                          <div className="flex items-center border rounded overflow-hidden h-9">
                            <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                            <input
                              type="number"
                              value={packageTotals.childWithoutBed}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                baseTotalsRef.current = {
                                  ...baseTotalsRef.current,
                                  childWithoutBed: val,
                                };
                                setPackageTotals((prev) => ({ ...prev, childWithoutBed: val }));
                              }}
                              className="flex-1 p-2 text-xs bg-white outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Child W/ Bed */}
                      <div className="border rounded overflow-hidden">
                        <div className="bg-fuchsia-500 text-white px-3 py-2">
                          <span className="text-xs font-bold">Child W/ Bed Package Total</span>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center border rounded overflow-hidden h-9">
                            <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                            <input
                              type="number"
                              value={packageTotals.childWithBed}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                baseTotalsRef.current = {
                                  ...baseTotalsRef.current,
                                  childWithBed: val + packageTotals.incentive,
                                };
                                setPackageTotals((prev) => ({ ...prev, childWithBed: val }));
                              }}
                              className="flex-1 p-2 text-xs bg-white outline-none"
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
                          <div className="flex items-center border rounded overflow-hidden h-9">
                            <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                            <input
                              type="number"
                              value={packageTotals.infant}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                baseTotalsRef.current = {
                                  ...baseTotalsRef.current,
                                  infant: val,
                                };
                                setPackageTotals((prev) => ({ ...prev, infant: val }));
                              }}
                              className="flex-1 p-2 text-xs bg-white outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Incentive */}
                      <div className="border rounded overflow-hidden">
                        <div className="bg-orange-500 text-white px-3 py-2">
                          <span className="text-xs font-bold">Incentive</span>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center border rounded overflow-hidden h-9">
                            <span className="bg-gray-100 border-r px-2 text-xs h-full flex items-center text-gray-600">PKR</span>
                            <input
                              type="number"
                              value={packageTotals.incentive}
                              onChange={(e) => {
                                const inc = Number(e.target.value);
                                const base = baseTotalsRef.current;
                                setPackageTotals({
                                  double: base.double + inc,
                                  triple: base.triple + inc,
                                  quad: base.quad + inc,
                                  shared: base.shared + inc,
                                  childWithoutBed: base.childWithoutBed,
                                  childWithBed: base.childWithBed + inc,
                                  infant: base.infant,
                                  incentive: inc,
                                });
                              }}
                              className="flex-1 p-2 text-xs bg-white outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Incentive Separator */}
                    <div className="border-t-2 border-dashed border-orange-300 pt-3">
                      <p className="text-xs text-orange-600 font-semibold mb-2">* Incentive (PKR {packageTotals.incentive.toLocaleString()}) is included in Double, Triple, Quad, Shared, and Child W/ Bed totals. It is not included in Child W/O Bed or Infant totals.</p>
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

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAndCopy}
                    disabled={!canCreate}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canCreate ? "You don't have permission to create Umrah packages" : ""}
                  >
                    Save and Copy
                  </button>
                  <button
                    type="submit"
                    disabled={!canCreate}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canCreate ? "You don't have permission to create Umrah packages" : ""}
                  >
                    Save
                  </button>
                </div>
              </>
            );
          })()}
        </form>
      </div>
      <ToastContainer style={{ zIndex: 9999999 }} />
    </ComponentCard>
  );
};

export default UmrahPackage;
