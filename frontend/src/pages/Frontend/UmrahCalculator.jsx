import React, { useState, useEffect, useMemo, useRef } from "react";
import axiosInstance from "../../api/axios";
import {
  hasB2CBookingLock,
  markB2CBookingSubmitted,
} from "../../utils/b2cBookingLock";
import Select from "react-select";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import {
  CarFront,
  Bed,
  TicketsPlane,
  Plus,
  X,
  Calendar,
  Users,
  Plane,
  User,
  Hotel,
  Clock,
  Luggage,
  Coffee,
  Crown,
  Download,
} from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import hotelApi from "../../api/hotelapi";
import { theme } from "../../theme/theme";
import html2canvas from "html2canvas";
import defaultLogo from "../../assets/images/logo.png";

const VISA_TYPE_LABELS = {
  umrahWithTransport: "Umrah With Transport",
  umrahWithoutTransport: "Umrah Without Transport",
  umrahPax01: "01 PAX",
  umrahPax02: "02 PAX",
  umrahPax03: "03 PAX",
  umrahPax04: "04 PAX",
  umrahPax05To19: "05 TO 19 PAX",
  umrahPax20To29: "20 TO 29 PAX",
  umrahPax30To47: "30 TO 47 PAX",
  umrahInfant: "INFANT",
  // legacy values saved before the "umrah" prefix was added to pax-tier types
  pax01: "01 PAX",
  pax02: "02 PAX",
  pax03: "03 PAX",
  pax04: "04 PAX",
  pax05To19: "05 TO 19 PAX",
  pax20To29: "20 TO 29 PAX",
  pax30To47: "30 TO 47 PAX",
  infant: "INFANT",
};

const UMRAH_PAX_TIER_PATTERN = /^pax(0[1-4]|05to19|20to29|30to47)$/i;

const isUmrahVisaOption = (visaName) => {
  const name = (visaName || "").toLowerCase();
  return (
    name.includes("umrah") ||
    UMRAH_PAX_TIER_PATTERN.test(name) ||
    name === "infant"
  );
};

const getVisaTypeLabel = (name) =>
  VISA_TYPE_LABELS[name] ||
  name.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

const formatDate = (date) => {
  if (!date) return "";

  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// Helper: Calculate final price with margin for B2B (logged-in) and B2C (logged-out) users
const calculateFinalPrice = (basePrice, priceType, user, margins) => {
  if (user) {
    const marginType = user.marginType;
    const marginPercent = user.flightMarginPercent;
    const marginAmount = user.flightMarginAmount;

    let finalPrice = basePrice;

    if (marginType === "Percentage" && marginPercent > 0) {
      const marginValue = (basePrice * marginPercent) / 100;
      finalPrice = basePrice + marginValue;
    } else if (marginType === "Amount" && marginAmount > 0) {
      finalPrice = basePrice + marginAmount;
    }

    return Math.round(finalPrice);
  }

  if (!margins || !margins.umrahCalculator) return basePrice;

  const marginAmount = margins.umrahCalculator[priceType] || 0;
  return basePrice + marginAmount;
};

const GOLD = theme.colors.accent || "#7C3AED";
const GOLD_LIGHT = theme.colors.accentLight || "#EDE9FE";
const GOLD_GRADIENT =
  theme.colors.primary ||
  "linear-gradient(90deg, #1E1B4B 0%, #312E81 50%, #6D28D9 100%)";

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "42px",
    borderColor: state.isFocused ? GOLD : "#E5E7EB",
    boxShadow: state.isFocused ? `0 0 0 2px ${GOLD_LIGHT}` : "none",
    "&:hover": {
      borderColor: GOLD,
    },
    borderRadius: "0.5rem",
    backgroundColor: "white",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#111827",
    fontWeight: 500,
  }),
  placeholder: (base) => ({
    ...base,
    color: "#6B7280",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? GOLD
      : state.isFocused
        ? `${GOLD_LIGHT}20`
        : "white",
    color: state.isSelected ? "white" : "#1F2937",
    fontWeight: state.isSelected ? 600 : 500,
    "&:active": {
      backgroundColor: GOLD,
    },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: `${GOLD_LIGHT}20`,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#1F2937",
  }),
  multiValueRemove: (base) => ({
    ...base,
    "&:hover": {
      backgroundColor: GOLD,
      color: "white",
    },
  }),
};

const UmrahPackageCalculator = ({ user }) => {
  const { margins } = {};
  const notifySuccess = (param) => toast.success(param);
  const notifyError = (param) => toast.error(param);
  const [visaType, setVisaType] = useState("Select Visa Type");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [hasTicket, setHasTicket] = useState(false);
  const datePickersRef = useRef([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [packageSummary, setPackageSummary] = useState(null);
  const [transportList, setTransportList] = useState([
    { type: "", name: "", cost: 0, route: "" },
  ]);
  const [roomType, setRoomType] = useState("Private");
  const [hotelRooms, setHotelRooms] = useState([
    {
      city: "",
      hotel: "",
      rooms: 1,
      occupancy: 1,
      type: "",
      date: "",
      dateRange: {
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
      },
      nights: 0,
      showDatePicker: false,
    },
  ]);
  const [hotels, setHotels] = useState([]);
  const [visaOptions, setVisaOptions] = useState([]);
  const [transportOptions, setTransportOptions] = useState([]);
  const [umrahPackages, setUmrahPackages] = useState([]);
  // console.log(umrahPackages);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupModel, setSelectedGroupModel] = useState(false);
  const [passengerDetailsModalOpen, setPassengerDetailsModalOpen] =
    useState(false);
  const [passengerDetails, setPassengerDetails] = useState([]);
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace("#", "");
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  const [passengerCounts, setPassengerCounts] = useState({
    adults: 0,
    children: 0,
    infants: 0,
  });

  const handleSelectGroup = (groupId) => {
    const group = umrahPackages.find(
      (g) => g._id === groupId || g.id === groupId,
    );
    if (group) {
      setSelectedGroup(group);
      setSelectedGroupId(groupId);
      setHasTicket(true);
      setSelectedGroupModel(true);
    }
  };

  const clearTicketSelection = () => {
    setSelectedGroup(null);
    setSelectedGroupId(null);
    setHasTicket(false);
    setPassengerCounts({
      adults: 0,
      children: 0,
      infants: 0,
    });
    setPassengerDetails([]);
    notifySuccess("Group ticket selection cleared.");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (!user) {
      const nextCounts = {
        ...passengerCounts,
        [name]: Number(value),
      };
      const nextTotal =
        Number(nextCounts.adults || 0) +
        Number(nextCounts.children || 0) +
        Number(nextCounts.infants || 0);

      if (nextTotal > 1) {
        notifyError("Guest bookings are limited to one passenger only.");
        return;
      }
    }

    setPassengerCounts((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const getVisaMargin = () => {
    if (user || !margins?.umrahCalculator) return 0;
    return margins.umrahCalculator.umrahVisa || 0;
  };

  const getTransportMargin = () => {
    if (user || !margins?.umrahCalculator) return 0;
    return margins.umrahCalculator.transport || 0;
  };

  const calculateTransportPrice = (basePrice) => {
    return calculateFinalPrice(basePrice, "transport", user, margins);
  };

  const calculateHotelPrice = (basePrice) => {
    // Calculate the final price per person per night
    return calculateFinalPrice(basePrice, "hotel", user, margins);
  };

  const calculateHotelRoomCost = (room) => {
    const basePrice = Number(room.price) || 0;
    const nights = Number(room.nights) || 0;
    const roomCount = Math.max(1, Number(room.rooms) || 1);
    const paxCount = Math.max(1, Number(room.occupancy) || 1);

    if (!basePrice || !nights || roomCount <= 0 || paxCount <= 0) {
      return 0;
    }

    const pricePerRoomPerNight = calculateHotelPrice(basePrice);
    return pricePerRoomPerNight * nights * roomCount * paxCount;
  };

  const calculateVisaTotalWithMargin = (
    visa,
    adultCount,
    childCount,
    infantCount,
  ) => {
    if (!visa) return 0;
    const baseTotal =
      adultCount * visa.adultVisaSelling +
      childCount * visa.childVisaSelling +
      infantCount * visa.infantVisaSelling;
    return (
      calculateFinalPrice(baseTotal, "umrahVisa", user, margins) || baseTotal
    );
  };

  const calculateGroupTicketTotalWithMargin = (
    adultPrice,
    childPrice,
    adultCount,
    childCount,
  ) => {
    const baseTotal = adultCount * adultPrice + childCount * childPrice;
    return (
      calculateFinalPrice(baseTotal, "groupTicket", user, margins) || baseTotal
    );
  };

  const calculateTotalPrice = () => {
    let total = 0;

    if (hasTicket && selectedGroup) {
      const { sellingPriceAdultB2B = 0, sellingPriceChildB2B = 0 } =
        selectedGroup.metadata || {};
      const groupTicketTotal = calculateGroupTicketTotalWithMargin(
        sellingPriceAdultB2B,
        sellingPriceChildB2B,
        passengerCounts.adults,
        passengerCounts.children,
      );
      total += groupTicketTotal;
    }

    const visa = visaOptions.find((option) => option.visaName === visaType);
    if (visa) {
      const visaTotal = calculateVisaTotalWithMargin(
        visa,
        adults,
        children,
        infants,
      );
      total += visaTotal;
    }

    const transportTotal = transportList.reduce((sum, t) => {
      const baseCost = Number(t.cost) || 0;
      const transportPrice = calculateTransportPrice(baseCost);
      return sum + (transportPrice || baseCost);
    }, 0);
    total += transportTotal;

    const hotelTotal = hotelRooms.reduce((sum, room) => {
      return sum + calculateHotelRoomCost(room);
    }, 0);
    total += hotelTotal;

    return total;
  };

  const calculateNights = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const getCityKey = (city) => {
    if (!city) return "";
    return city.toLowerCase().trim();
  };

  const getUniqueCities = (hotelsData) => {
    if (!Array.isArray(hotelsData)) return [];
    const cityMap = new Map();
    hotelsData.forEach((hotel) => {
      const rawCity = hotel.city || "";
      if (!rawCity) return;
      const cityKey = getCityKey(rawCity);
      if (!cityMap.has(cityKey)) {
        cityMap.set(cityKey, rawCity);
      }
    });
    return Array.from(cityMap.entries()).map(([key, displayName]) => ({
      key: key,
      value: displayName,
      label: displayName,
    }));
  };

  useEffect(() => {
    const fetchVisaOptions = async () => {
      try {
        const response = await axiosInstance.get("/ummrah-visa");
        setVisaOptions(response.data || []);
      } catch (error) {
        console.error("Failed to fetch visa options", error);
      }
    };

    const fetchTranportData = async () => {
      try {
        let response;
        response = await axiosInstance.get("/transport-route-rates");
        const data = Array.isArray(response.data)
          ? response.data
          : response.data.data || [];
        setTransportOptions(data);
      } catch (error) {
        console.error("Failed to fetch transport data", error);
        setTransportOptions([]);
      }
    };

    const fetchHotels = async () => {
      try {
        const data = await hotelApi.getHotels();
        setHotels(data.data || []);
      } catch (error) {
        console.error("Failed to fetch hotels", error);
      }
    };

    const fetchUmrahPackages = async () => {
      try {
        const response = await axiosInstance.get("/sector/getUnifiedGroups");
        const packages = response?.data?.data || [];

        const transformedPackages = packages.map((pkg) => ({
          ...pkg,
          _id: pkg.id,
          flights: pkg.details || [],
          seats: pkg.available_no_of_pax || 0,
          groupCategory: pkg.type,
          noOfDays: calculateDays(pkg.dept_date, pkg.arv_date),
          metadata: {
            sellingPriceAdultB2B: pkg.price || 0,
            sellingPriceChildB2B: pkg.childPrice || 0,
            sellingPriceInfantB2B: pkg.infantPrice || 0,
            sellingCurrencyB2B: "PKR",
          },
        }));

        // const filteredPackages = transformedPackages.filter(
        //   (item) =>
        //     item.type.toLowerCase().includes("umrah") &&
        //     item.source.toLowerCase() === "admin",
        // );
        const filteredPackages = transformedPackages;
        setUmrahPackages(filteredPackages);
      } catch (error) {
        console.error("Error fetching Umrah packages:", error);
      }
    };

    const calculateDays = (deptDate, arvDate) => {
      const dept = new Date(deptDate);
      const arv = new Date(arvDate);
      const diffTime = Math.abs(arv - dept);
      const diffDays = Math.ceil(diffTime / (1001 * 60 * 60 * 24));
      return diffDays;
    };

    fetchHotels();
    fetchTranportData();
    fetchVisaOptions();
    fetchUmrahPackages();
  }, []);

  useEffect(() => {
    datePickersRef.current = hotelRooms.map(
      (_, i) => datePickersRef.current[i] || React.createRef(),
    );
    function handleClickOutside(event) {
      hotelRooms.forEach((room, idx) => {
        if (
          room.showDatePicker &&
          datePickersRef.current[idx] &&
          !datePickersRef.current[idx].contains(event.target)
        ) {
          toggleDatePicker(idx, false);
        }
      });
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [hotelRooms]);

  const handleAddTransport = () => {
    setTransportList([
      { name: "", type: "", cost: "", route: "" },
      ...transportList,
    ]);
  };

  const routeOptions = useMemo(() => {
    if (!Array.isArray(transportOptions) || transportOptions.length === 0)
      return [];
    const routes = transportOptions.map((item) => item.route).filter(Boolean);
    const uniqueRoutes = [...new Set(routes)];
    return uniqueRoutes.map((route) => ({ label: route, value: route }));
  }, [transportOptions]);

  const handleTransportChange = (index, field, value) => {
    setTransportList((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const updatedItem = { ...item, [field]: value };
        const { route, type } = updatedItem;

        if ((field === "route" || field === "type") && route && type) {
          const matched = Array.isArray(transportOptions)
            ? transportOptions.find(
                (opt) => opt.route === route && opt.selectTransport === type,
              )
            : null;
          const baseRate = matched ? matched.sellingRate : 0;
          const transportMargin = getTransportMargin();
          updatedItem.cost = baseRate + transportMargin;
        } else if (field === "route") {
          updatedItem.type = "";
          updatedItem.cost = "";
        }

        return updatedItem;
      }),
    );
  };

  const uniqueCities = useMemo(() => {
    return getUniqueCities(hotels);
  }, [hotels]);

  const handleRoomChange = (index, field, value, availableRoomTypes = []) => {
    const updatedRooms = [...hotelRooms];

    if (field === "dateRange") {
      updatedRooms[index].dateRange = value;
      updatedRooms[index].date =
        `${value.startDate.toLocaleDateString()} to ${value.endDate.toLocaleDateString()}`;
      updatedRooms[index].nights = calculateNights(
        value.startDate,
        value.endDate,
      );
    } else if (field === "occupancy") {
      updatedRooms[index].occupancy = Math.max(1, Number(value) || 1);
    } else {
      updatedRooms[index][field] = value;

      if (field === "city") {
        updatedRooms[index].hotel = "";
        updatedRooms[index].type = "";
        updatedRooms[index].price = "";
      }

      if (field === "hotel") {
        updatedRooms[index].type = "";
        updatedRooms[index].price = "";
      }

      if (field === "type") {
        const selectedType = availableRoomTypes.find(
          (r) => r.roomType === value,
        );
        const basePrice = selectedType?.sellingPrice || 0;
        updatedRooms[index].fullRoomPrice = calculateHotelPrice(basePrice);
        updatedRooms[index].price = basePrice;
      }
    }

    setHotelRooms(updatedRooms);
  };

  const toggleDatePicker = (index, forceValue = null) => {
    const updatedRooms = [...hotelRooms];
    updatedRooms[index].showDatePicker =
      forceValue !== null ? forceValue : !updatedRooms[index].showDatePicker;
    setHotelRooms(updatedRooms);
  };

  const addRoom = () => {
    setHotelRooms([
      ...hotelRooms,
      {
        city: "",
        hotel: "",
        rooms: 1,
        occupancy: 1,
        type: "",
        date: "",
        dateRange: {
          startDate: new Date(),
          endDate: new Date(),
          key: "selection",
        },
        showDatePicker: false,
      },
    ]);
  };

  const handleRemoveTransport = (index) => {
    const newList = [...transportList];
    newList.splice(index, 1);
    setTransportList(newList);
  };

  const selectedVisa = Array.isArray(visaOptions)
    ? visaOptions.find((option) => option.visaName === visaType)
    : undefined;

  const removeRoom = (indexToRemove) => {
    const updatedRooms = hotelRooms.filter((_, i) => i !== indexToRemove);
    setHotelRooms(updatedRooms);
  };

  const generatePackageSummary = () => {
    const visa = visaOptions.find((option) => option.visaName === visaType);
    const totalPassengers = adults + children + infants;

    const summary = {
      hotelDetails: hotelRooms.map((room) => {
        const pricePerRoomPerNight = calculateHotelPrice(room.price || 0);
        const totalRoomCost = calculateHotelRoomCost(room);

        return {
          city: room.city,
          hotel: room.hotel,
          roomType: room.type,
          rooms: room.rooms,
          pax: Math.max(1, Number(room.occupancy || 1)),
          nights: room.nights,
          checkIn: room.dateRange?.startDate,
          checkOut: room.dateRange?.endDate,
          pricePerRoom: pricePerRoomPerNight,
          totalRoomCost,
        };
      }),
      transport: transportList
        .filter((t) => t.route && t.type)
        .map((t) => ({
          route: t.route,
          type: t.type,
          cost: calculateTransportPrice(Number(t.cost) || 0),
        })),
      ticket:
        hasTicket && selectedGroup
          ? {
              airline: selectedGroup.airline?.airline_name,
              adults: passengerCounts.adults,
              children: passengerCounts.children,
              adultPrice: calculateFinalPrice(
                selectedGroup.metadata?.sellingPriceAdultB2B || 0,
                "groupTicket",
                user,
                margins,
              ),
              childPrice: calculateFinalPrice(
                selectedGroup.metadata?.sellingPriceChildB2B || 0,
                "groupTicket",
                user,
                margins,
              ),
              totalTicketCost: calculateGroupTicketTotalWithMargin(
                selectedGroup.metadata?.sellingPriceAdultB2B || 0,
                selectedGroup.metadata?.sellingPriceChildB2B || 0,
                passengerCounts.adults,
                passengerCounts.children,
              ),
            }
          : null,
      visa: {
        type: visaType,
        adults: adults,
        children: children,
        infants: infants,
        adultPrice: visa?.adultVisaSelling || 0,
        childPrice: visa?.childVisaSelling || 0,
        infantPrice: visa?.infantVisaSelling || 0,
        totalVisaCost: visa
          ? calculateVisaTotalWithMargin(visa, adults, children, infants)
          : 0,
      },
      totalPassengers: totalPassengers,
      roomType: roomType,
      totalCost: calculateTotalPrice(),
    };

    setPackageSummary(summary);
    setShowSummaryModal(true);
  };

  const handleProceedToSummary = () => {
    generatePackageSummary();
  };

  const handleSubmit = () => {
    const visa = visaOptions.find((option) => option.visaName === visaType);

    const totalCost = calculateTotalPrice();
    const isB2C = !user;

    if (isB2C && hasB2CBookingLock()) {
      notifyError("You have already submitted one B2C booking.");
      return;
    }

    const totalPassengers =
      Number(passengerCounts.adults || 0) +
      Number(passengerCounts.children || 0) +
      Number(passengerCounts.infants || 0);

    if (isB2C && totalPassengers !== 1) {
      notifyError("Guest bookings are limited to one passenger only.");
      return;
    }

    // Determine endpoint based on user status
    const endpoint = isB2C ? "/umrah-calculator/public" : "/umrah-calculator/";

    const groupTicketTotalWithMargin = calculateGroupTicketTotalWithMargin(
      selectedGroup?.metadata?.sellingPriceAdultB2B || 0,
      selectedGroup?.metadata?.sellingPriceChildB2B || 0,
      passengerCounts.adults,
      passengerCounts.children,
    );

    const baseAdultPrice = selectedGroup?.metadata?.sellingPriceAdultB2B || 0;
    const baseChildPrice = selectedGroup?.metadata?.sellingPriceChildB2B || 0;
    const baseTotal =
      passengerCounts.adults * baseAdultPrice +
      passengerCounts.children * baseChildPrice;

    let adultPriceWithMargin = baseAdultPrice;
    let childPriceWithMargin = baseChildPrice;

    if (baseTotal > 0 && groupTicketTotalWithMargin > 0) {
      const ratio = groupTicketTotalWithMargin / baseTotal;
      adultPriceWithMargin = Math.round(baseAdultPrice * ratio);
      childPriceWithMargin = Math.round(baseChildPrice * ratio);
    }

    const visaTotalWithMargin = calculateVisaTotalWithMargin(
      visa,
      adults,
      children,
      infants,
    );

    const payload = {
      visaType,
      selectedGroup: selectedGroupId,
      passengerDetails,
      passengerCounts,
      totalCost,
      groupTicketPricing: {
        totalPrice: groupTicketTotalWithMargin,
        adultBasePrice: adultPriceWithMargin,
        childBasePrice: childPriceWithMargin,
        infantPrice: 0,
        currency: selectedGroup?.metadata?.sellingCurrencyB2B || "PKR",
      },
      visaDetails: {
        adults,
        children,
        infants,
        adultVisaSelling: visa?.adultVisaSelling || 0,
        childVisaSelling: visa?.childVisaSelling || 0,
        infantVisaSelling: visa?.infantVisaSelling || 0,
        totalVisaCost: visaTotalWithMargin,
      },
      transportList: transportList.map((t) => ({
        route: t.route,
        selectTransport: t.type,
        buyingRate:
          calculateTransportPrice(Number(t.cost) || 0) || Number(t.cost) || 0,
      })),
      roomType,
      hotelRooms: hotelRooms.map((room) => {
        const totalRoomCost = calculateHotelRoomCost(room);
        const perRoomPerNight = calculateHotelPrice(room.price || 0);

        return {
          city: room.city,
          hotel: room.hotel,
          rooms: +room.rooms,
          occupancy: Math.max(1, Number(room.occupancy || 1)),
          type: room.type,
          startDate: formatDate(room.dateRange.startDate),
          endDate: formatDate(room.dateRange.endDate),
          dateFormatVersion: "local",
          pricePerRoom: perRoomPerNight,
          totalCost: totalRoomCost,
          nights: room.nights,
        };
      }),
    };

    if (isB2C && passengerDetails.length > 0) {
      payload.contactEmail = passengerDetails[0].email || "";
      payload.contactPhone = passengerDetails[0].phone || "";
    }

    axiosInstance
      .post(endpoint, payload)
      .then((response) => {
        const message = isB2C
          ? response.data.message ||
            "Booking inquiry submitted! Our team will contact you soon."
          : "Form submitted successfully!";
        notifySuccess(message);
        setSelectedGroupId(null);
        setShowSummaryModal(false);
        if (isB2C) {
          markB2CBookingSubmitted(response.data?.booking?.bookingReference);
        }

        setTimeout(() => {
          if (isB2C) {
            window.location.href = "/umrah-calculator";
          } else {
            window.location.href = "/dashboard/my-umrah-calculator-q";
          }
        }, 2000);
      })
      .catch((error) => {
        if (error.response) {
          notifyError(
            "Save failed: " + (error.response.data?.message || "Unknown error"),
          );
        } else if (error.request) {
          notifyError("No response from server.");
        } else {
          notifyError("Error: " + error.message);
        }
      });
  };

  const brochureRef = useRef(null);
  const brochureLogo = user?.logo || defaultLogo;

  const formatPKR = (amount) =>
    `PKR ${Number(amount || 0).toLocaleString("en-PK")}`;

  const handleDownloadBrochure = async () => {
    if (!brochureRef.current) return;

    try {
      const canvas = await html2canvas(brochureRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `umrah-package-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to capture package brochure", error);
      notifyError("Screenshot download failed. Please take a screen capture.");
    }
  };

  const SummaryModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex flex-wrap justify-between items-center gap-3 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Package Preview</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Brochure snapshot ready
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* <button
              onClick={handleDownloadBrochure}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              <Download size={16} />
              Download Snapshot
            </button> */}
            <button
              onClick={() => setShowSummaryModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 bg-gray-100">
          <div
            ref={brochureRef}
            className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[24px] bg-white shadow-2xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#f59e0b_0,#f59e0b_18%,transparent_19%),radial-gradient(circle_at_bottom_right,#0f766e_0,#0f766e_22%,transparent_23%)] opacity-15" />
            <div className="relative grid min-h-[720px] grid-cols-1 lg:grid-cols-[1.05fr_1.35fr]">
              <div className="relative overflow-hidden bg-slate-950 p-6 text-white">
                <div
                  className="absolute inset-0 opacity-90"
                  style={{ background: GOLD_GRADIENT }}
                />
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-300/30" />
                <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/25" />
                <div className="relative flex h-full flex-col justify-between gap-6">
                  <div>
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div className="flex h-16 w-32 items-center justify-center rounded-2xl bg-white p-2 shadow-lg">
                        <img
                          src={brochureLogo}
                          crossOrigin="anonymous"
                          alt="Agency logo"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      {packageSummary?.ticket && (
                        <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide">
                          Flight Included
                        </div>
                      )}
                    </div>

                    <p className="text-sm font-black uppercase tracking-[0.28em] text-amber-100">
                      Umrah Package
                    </p>
                    <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
                      {selectedGroup?.packageName ||
                        selectedGroup?.groupName ||
                        selectedGroup?.airline?.airline_name ||
                        "Premium Umrah"}
                    </h1>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">
                        {packageSummary?.totalPassengers || 0} Pax
                      </span>
                      <span className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">
                        {packageSummary?.roomType || "Private"}
                      </span>
                      <span className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-slate-950">
                        {selectedGroup?.noOfDays || "Custom"} Days
                      </span>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/20 bg-white/15 p-5 backdrop-blur">
                    <p className="text-sm font-bold uppercase text-white/75">
                      Total Package Cost
                    </p>
                    <p className="mt-1 text-4xl font-black text-white">
                      {formatPKR(packageSummary?.totalCost)}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-white/80">
                      Visa, hotel, transport and selected ticket pricing in one
                      package estimate.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative p-5 md:p-6">
                <div className="mb-4 grid grid-cols-4 gap-2">
                  {[
                    ["Adults", adults],
                    ["Children", children],
                    ["Infants", infants],
                    ["Total", packageSummary?.totalPassengers],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"
                    >
                      <p className="text-[10px] font-black uppercase text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-900">
                        {value || 0}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {packageSummary?.ticket && (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Plane className="h-5 w-5 text-sky-700" />
                        <h3 className="text-sm font-black uppercase text-sky-900">
                          Flight Ticket
                        </h3>
                      </div>
                      <p className="text-lg font-black text-slate-900">
                        {packageSummary.ticket.airline || "Airline"}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                        <span>
                          Adult: {formatPKR(packageSummary.ticket.adultPrice)}
                        </span>
                        <span>
                          Child: {formatPKR(packageSummary.ticket.childPrice)}
                        </span>
                        <span>Adults: {packageSummary.ticket.adults}</span>
                        <span>Children: {packageSummary.ticket.children}</span>
                      </div>
                      <p className="mt-3 rounded-xl bg-sky-700 px-3 py-2 text-sm font-black text-white">
                        Total {formatPKR(packageSummary.ticket.totalTicketCost)}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <TicketsPlane className="h-5 w-5 text-violet-700" />
                      <h3 className="text-sm font-black uppercase text-violet-900">
                        Visa
                      </h3>
                    </div>
                    <p className="text-lg font-black text-slate-900">
                      {getVisaTypeLabel(packageSummary?.visa.type || visaType)}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
                      <span className="rounded-lg bg-white px-2 py-1">
                        A {packageSummary?.visa.adults || 0}
                      </span>
                      <span className="rounded-lg bg-white px-2 py-1">
                        C {packageSummary?.visa.children || 0}
                      </span>
                      <span className="rounded-lg bg-white px-2 py-1">
                        I {packageSummary?.visa.infants || 0}
                      </span>
                    </div>
                    <p className="mt-3 rounded-xl bg-violet-700 px-3 py-2 text-sm font-black text-white">
                      Total {formatPKR(packageSummary?.visa.totalVisaCost)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-amber-700" />
                    <h3 className="text-sm font-black uppercase text-amber-900">
                      Hotels
                    </h3>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {packageSummary?.hotelDetails.map((hotel, idx) => (
                      <div
                        key={`${hotel.hotel}-${idx}`}
                        className="rounded-xl bg-white p-3 text-xs shadow-sm"
                      >
                        <p className="truncate text-sm font-black text-slate-900">
                          {hotel.hotel || "Hotel"}
                        </p>
                        <p className="mt-1 font-bold text-slate-600">
                          {hotel.city || "City"} | {hotel.roomType || "Room"} |{" "}
                          {hotel.nights || 0} Nights
                        </p>
                        <p className="mt-1 font-bold text-slate-600">
                          {hotel.rooms || 0} room(s), {hotel.pax || 1} pax |{" "}
                          {hotel.checkIn?.toLocaleDateString()} to{" "}
                          {hotel.checkOut?.toLocaleDateString()}
                        </p>
                        <p className="mt-2 font-black text-amber-700">
                          {formatPKR(hotel.totalRoomCost)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {packageSummary?.transport.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CarFront className="h-5 w-5 text-emerald-700" />
                      <h3 className="text-sm font-black uppercase text-emerald-900">
                        Transport
                      </h3>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {packageSummary.transport.map((t, idx) => (
                        <div
                          key={`${t.route}-${idx}`}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm"
                        >
                          <span className="block truncate text-slate-950">
                            {t.route || "Route"}
                          </span>
                          <span>
                            {t.type || "Transport"} | {formatPKR(t.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ["Visa", formatPKR(packageSummary?.visa.totalVisaCost)],
                    [
                      "Ticket",
                      formatPKR(packageSummary?.ticket?.totalTicketCost || 0),
                    ],
                    ["Grand Total", formatPKR(packageSummary?.totalCost)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-slate-900 px-3 py-3 text-center text-white"
                    >
                      <p className="text-[10px] font-black uppercase text-white/60">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-black">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex justify-end gap-3">
          <button
            onClick={() => setShowSummaryModal(false)}
            className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg text-white font-medium transition-colors hover:shadow-md"
            style={{ background: GOLD_GRADIENT }}
          >
            Confirm & Submit
          </button>
        </div>
      </div>
    </div>
  );

  /*
  const OldSummaryModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Package Summary</h2>
          <button
            onClick={() => setShowSummaryModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: GOLD }} />
              Passenger Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Passengers</p>
                <p className="font-semibold">
                  {packageSummary?.totalPassengers}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Adults</p>
                <p className="font-semibold">{adults}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Children</p>
                <p className="font-semibold">{children}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Infants</p>
                <p className="font-semibold">{infants}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Room Type</p>
                <p className="font-semibold">{packageSummary?.roomType}</p>
              </div>
            </div>
          </div>

          {packageSummary?.ticket && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Plane className="w-5 h-5" style={{ color: GOLD }} />
                Flight Ticket
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="text-gray-600">Airline:</span>{" "}
                  {packageSummary.ticket.airline}
                </p>
                <p>
                  <span className="text-gray-600">Adults:</span>{" "}
                  {packageSummary.ticket.adults} ×{" "}
                  {packageSummary.ticket.adultPrice.toLocaleString()}
                </p>
                <p>
                  <span className="text-gray-600">Children:</span>{" "}
                  {packageSummary.ticket.children} ×{" "}
                  {packageSummary.ticket.childPrice.toLocaleString()}
                </p>
                <p className="font-semibold mt-2">
                  Ticket Total:{" "}
                  {packageSummary.ticket.totalTicketCost.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <TicketsPlane className="w-5 h-5" style={{ color: GOLD }} />
              Visa Details
            </h3>
            <div className="space-y-2">
              <p>
                <span className="text-gray-600">Type:</span>{" "}
                {packageSummary?.visa.type}
              </p>
              <p>
                <span className="text-gray-600">Adults:</span>{" "}
                {packageSummary?.visa.adults} ×{" "}
                {packageSummary?.visa.adultPrice.toLocaleString()}
              </p>
              <p>
                <span className="text-gray-600">Children:</span>{" "}
                {packageSummary?.visa.children} ×{" "}
                {packageSummary?.visa.childPrice.toLocaleString()}
              </p>
              <p>
                <span className="text-gray-600">Infants:</span>{" "}
                {packageSummary?.visa.infants} ×{" "}
                {packageSummary?.visa.infantPrice.toLocaleString()}
              </p>
              <p className="font-semibold mt-2">
                Visa Total:{" "}
                {packageSummary?.visa.totalVisaCost.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Hotel className="w-5 h-5" style={{ color: GOLD }} />
              Hotel Accommodation
            </h3>
            {packageSummary?.hotelDetails.map((hotel, idx) => (
              <div
                key={idx}
                className="mb-4 pb-4 border-b border-gray-200 last:border-0"
              >
                <p>
                  <span className="text-gray-600">Hotel:</span> {hotel.hotel}
                </p>
                <p>
                  <span className="text-gray-600">City:</span> {hotel.city}
                </p>
                <p>
                  <span className="text-gray-600">Room Type:</span>{" "}
                  {hotel.roomType}
                </p>
                <p>
                  <span className="text-gray-600">Rooms:</span> {hotel.rooms}
                </p>
                <p>
                  <span className="text-gray-600">Pax:</span> {hotel.pax}
                </p>
                <p>
                  <span className="text-gray-600">Nights:</span> {hotel.nights}
                </p>
                <p>
                  <span className="text-gray-600">Check In:</span>{" "}
                  {hotel.checkIn?.toLocaleDateString()}
                </p>
                <p>
                  <span className="text-gray-600">Check Out:</span>{" "}
                  {hotel.checkOut?.toLocaleDateString()}
                </p>
                <p className="font-semibold mt-1">
                  Total: {hotel.totalRoomCost.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {packageSummary?.transport.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <CarFront className="w-5 h-5" style={{ color: GOLD }} />
                Transport
              </h3>
              {packageSummary.transport.map((t, idx) => (
                <div key={idx} className="mb-2">
                  <p>
                    {t.route} - {t.type}: {t.cost.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div
            className="rounded-xl p-6 text-center"
            style={{ background: GOLD_LIGHT }}
          >
            <p className="text-lg text-white mb-2">Total Package Cost</p>
            <p className="text-4xl font-bold" style={{ color: "white" }}>
              PKR {packageSummary?.totalCost.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 flex justify-end gap-3">
          <button
            onClick={() => setShowSummaryModal(false)}
            className="px-6 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg text-white font-medium transition-colors hover:shadow-md"
            style={{ background: GOLD_GRADIENT }}
          >
            Confirm & Submit
          </button>
        </div>
      </div>
    </div>
  );

  */

  return (
    <>
      <div className="min-h-screen bg-linear-to-b from-gray-50 to-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100">
            <div className="h-2" style={{ background: GOLD_GRADIENT }}></div>

            <div className="p-6 md:p-10">
              {/* Visa Details Section */}
              <div className="mb-10 pb-8 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <TicketsPlane
                      className="w-6 h-6"
                      style={{ color: "white" }}
                    />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    Visa Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visa Type
                    </label>
                    <Select
                      styles={customSelectStyles}
                      options={
                        Array.isArray(visaOptions)
                          ? visaOptions
                              .filter((item) =>
                                isUmrahVisaOption(item.visaName),
                              )
                              .map((item) => ({
                                value: item.visaName,
                                label: getVisaTypeLabel(item.visaName),
                              }))
                          : []
                      }
                      value={
                        visaType
                          ? {
                              value: visaType,
                              label: getVisaTypeLabel(visaType),
                            }
                          : null
                      }
                      onChange={(selected) => setVisaType(selected.value)}
                      placeholder="Select Visa Type"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adults
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={adults}
                      onChange={(e) => setAdults(+e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Children
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={children}
                      onChange={(e) => setChildren(+e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Infants
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={infants}
                      onChange={(e) => setInfants(+e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adult (PKR)
                    </label>
                    <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium">
                      {selectedVisa?.adultVisaSelling || 0}
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Child (PKR)
                    </label>
                    <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium">
                      {selectedVisa?.childVisaSelling || 0}
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Infant (PKR)
                    </label>
                    <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium">
                      {selectedVisa?.infantVisaSelling || 0}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Visa Cost (PKR)
                    </label>
                    <div
                      className="px-4 py-2.5 rounded-xl text-white font-semibold"
                      style={{ background: GOLD_GRADIENT }}
                    >
                      {selectedVisa
                        ? calculateVisaTotalWithMargin(
                            selectedVisa,
                            adults,
                            children,
                            infants,
                          )
                        : 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transport Section */}
              <div className="mb-10 pb-8 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <CarFront className="w-6 h-6" style={{ color: "white" }} />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    Private Transport
                  </h3>
                </div>

                <div className="hidden md:grid grid-cols-12 gap-4 mb-2 px-4">
                  <div className="md:col-span-4 text-sm font-medium text-gray-600">
                    Route
                  </div>
                  <div className="md:col-span-4 text-sm font-medium text-gray-600">
                    Transport Type
                  </div>
                  <div className="md:col-span-3 text-sm font-medium text-gray-600">
                    Final Price (PKR)
                  </div>
                  <div className="md:col-span-1"></div>
                </div>

                <div className="space-y-4">
                  {transportList.slice(1).map((item, index) => (
                    <div
                      key={index + 1}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl"
                    >
                      <div className="md:col-span-4">
                        <Select
                          styles={customSelectStyles}
                          options={routeOptions}
                          value={routeOptions.find(
                            (opt) => opt.value === item.route,
                          )}
                          onChange={(selected) =>
                            handleTransportChange(
                              index + 1,
                              "route",
                              selected.value,
                            )
                          }
                          placeholder="Select Route"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Select
                          styles={customSelectStyles}
                          options={transportOptions
                            .filter((opt) => opt.route === item.route)
                            .map((opt) => ({
                              value: opt.selectTransport,
                              label: opt.selectTransport,
                            }))}
                          value={{ value: item.type, label: item.type }}
                          onChange={(selected) =>
                            handleTransportChange(
                              index + 1,
                              "type",
                              selected?.value || "",
                            )
                          }
                          placeholder="Select Transport Type"
                          isDisabled={!item.route}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium text-center">
                          {(
                            calculateTransportPrice(Number(item.cost) || 0) || 0
                          ).toLocaleString()}
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <button
                          onClick={() => handleRemoveTransport(index + 1)}
                          className="w-full bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all duration-200 flex items-center justify-center p-2"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {transportList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl">
                      <div className="md:col-span-4">
                        <Select
                          styles={customSelectStyles}
                          options={routeOptions}
                          value={routeOptions.find(
                            (opt) => opt.value === transportList[0].route,
                          )}
                          onChange={(selected) =>
                            handleTransportChange(0, "route", selected.value)
                          }
                          placeholder="Select Route"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Select
                          styles={customSelectStyles}
                          options={transportOptions
                            .filter(
                              (opt) => opt.route === transportList[0].route,
                            )
                            .map((opt) => ({
                              value: opt.selectTransport,
                              label: opt.selectTransport,
                            }))}
                          value={{
                            value: transportList[0].type,
                            label: transportList[0].type,
                          }}
                          onChange={(selected) =>
                            handleTransportChange(
                              0,
                              "type",
                              selected?.value || "",
                            )
                          }
                          placeholder="Select Transport Type"
                          isDisabled={!transportList[0].route}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <div className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium text-center">
                          {(
                            calculateTransportPrice(
                              Number(transportList[0].cost) || 0,
                            ) || 0
                          ).toLocaleString()}
                        </div>
                      </div>
                      <div className="md:col-span-1">
                        <button
                          onClick={handleAddTransport}
                          className="w-full rounded-xl text-white transition-all duration-200 flex items-center justify-center gap-2 p-2"
                          style={{ background: GOLD_GRADIENT }}
                        >
                          <Plus size={18} />
                          <span className="hidden md:inline">Add</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Group Tickets Button */}
              <div className="mb-8">
                <button
                  onClick={() => setIsOpen(true)}
                  className="group relative px-6 py-3 rounded-xl text-white font-medium overflow-hidden transition-all duration-300 hover:shadow-lg"
                  style={{ background: GOLD_GRADIENT }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Plane className="w-5 h-5" />
                    Browse Group Tickets
                  </span>
                </button>
              </div>

              {/* Selected Group Display */}
              {selectedGroup && (
                <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: GOLD_LIGHT }}
                      >
                        <Crown className="w-5 h-5" style={{ color: GOLD }} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedGroup.airline?.airline_name ||
                          selectedGroup.airline?.airlineName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-gray-200 rounded-full text-sm font-medium">
                        {selectedGroup.noOfDays} Days
                      </span>
                      <span
                        className="text-xl font-bold"
                        // style={{ color: GOLD }}
                      >
                        {selectedGroup.metadata?.sellingCurrencyB2B || "PKR"}{" "}
                        {calculateTotalPrice()}
                      </span>
                      <button
                        onClick={clearTicketSelection}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Flight
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Departure
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Arrival
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Meal
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            Baggage
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(
                          selectedGroup.flights ||
                          selectedGroup.details ||
                          []
                        ).map((flight, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap font-medium">
                              {flight.flight_no || flight.flightNo}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>
                                  {new Date(
                                    flight.dep_date || flight.depDate,
                                  ).toLocaleDateString()}{" "}
                                  {flight.dept_time || flight.depTime}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>
                                  {new Date(
                                    flight.arv_date || flight.arrDate,
                                  ).toLocaleDateString()}{" "}
                                  {flight.arv_time || flight.arrTime}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Coffee className="w-4 h-4 text-gray-400" />
                                <span>
                                  {flight.meal === "Yes"
                                    ? "Included"
                                    : "Not Included"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Luggage className="w-4 h-4 text-gray-400" />
                                <span>{flight.baggage}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Hotel Rooms Section */}
              <div className="mb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: GOLD_GRADIENT }}
                    >
                      <Bed className="w-6 h-6" style={{ color: "white" }} />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900">
                      Hotel Accommodation
                    </h3>
                  </div>
                  <div className="flex gap-3">
                    {["Private", "Sharing"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setRoomType(type)}
                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${roomType === type ? "text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        style={
                          roomType === type ? { background: GOLD_GRADIENT } : {}
                        }
                      >
                        {type} Room
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className="hidden md:grid grid-cols-12 gap-4 items-center text-white text-sm font-semibold px-6 py-3 rounded-lg mb-3"
                  style={{ background: GOLD_GRADIENT }}
                >
                  <div className="col-span-2 text-left">Location</div>
                  <div className="col-span-2 text-left">Hotel</div>
                  <div className="col-span-2 text-center">Select Dates</div>
                  <div className="col-span-1 text-center">Nights</div>
                  <div className="col-span-1 text-center">Rooms</div>
                  <div className="col-span-1 text-center">Pax</div>
                  <div className="col-span-2 text-left">Room Type</div>
                  <div className="col-span-1 text-center">Total (PKR)</div>
                </div>

                <div className="space-y-4">
                  {hotelRooms.map((room, index) => {
                    const hotelsArray = Array.isArray(hotels) ? hotels : [];
                    const filteredHotels = hotelsArray.filter((h) => {
                      const hotelCity = h.city || "";
                      const selectedCityKey = getCityKey(room.city);
                      const hotelCityKey = getCityKey(hotelCity);
                      return (
                        selectedCityKey && hotelCityKey === selectedCityKey
                      );
                    });

                    const selectedHotel = hotelsArray.find((h) => {
                      const hotelName = h.hotelName || h.name || "";
                      return room.hotel && hotelName === room.hotel;
                    });

                    let availableRoomTypes = [];
                    if (
                      selectedHotel &&
                      Array.isArray(selectedHotel.roomOptions)
                    ) {
                      availableRoomTypes = selectedHotel.roomOptions.map(
                        (roomOpt) => ({
                          roomType: roomOpt.name,
                          sellingPrice: roomOpt.sellingPricePerNight,
                          buyingPrice: roomOpt.buyingPricePerNight,
                          capacity: roomOpt.capacity,
                        }),
                      );
                    }

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow items-center"
                      >
                        <div className="md:col-span-2">
                          <Select
                            styles={customSelectStyles}
                            value={
                              uniqueCities.find(
                                (city) => city.value === room.city,
                              ) || null
                            }
                            onChange={(selectedOption) =>
                              handleRoomChange(
                                index,
                                "city",
                                selectedOption?.value || "",
                              )
                            }
                            options={uniqueCities}
                            placeholder="Select City"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Select
                            styles={customSelectStyles}
                            value={
                              filteredHotels
                                .map((hotel) => ({
                                  value: hotel.hotelName || hotel.name,
                                  label: hotel.hotelName || hotel.name,
                                }))
                                .find(
                                  (option) => option.value === room.hotel,
                                ) || null
                            }
                            onChange={(selectedOption) =>
                              handleRoomChange(
                                index,
                                "hotel",
                                selectedOption?.value || "",
                              )
                            }
                            options={filteredHotels.map((hotel) => ({
                              value: hotel.hotelName || hotel.name,
                              label: hotel.hotelName || hotel.name,
                            }))}
                            isDisabled={!room.city}
                            placeholder={
                              !room.city ? "Select city first" : "Select Hotel"
                            }
                          />
                        </div>

                        <div className="md:col-span-2 relative">
                          <button
                            type="button"
                            onClick={() => toggleDatePicker(index)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl text-left flex items-center justify-between hover:border-gray-300 transition-colors"
                          >
                            <span className="truncate text-sm">
                              {room.date ? room.date : "Select dates"}
                            </span>
                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                          </button>
                          {room.showDatePicker && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => toggleDatePicker(index, false)}
                              />
                              <div
                                ref={(el) =>
                                  (datePickersRef.current[index] = el)
                                }
                                className="fixed z-50"
                                style={{
                                  top: "50%",
                                  left: "50%",
                                  transform: "translate(-50%, -50%)",
                                }}
                              >
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      toggleDatePicker(index, false)
                                    }
                                    className="absolute -top-10 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors z-10"
                                  >
                                    <X size={20} />
                                  </button>
                                  <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                                    <DateRange
                                      editableDateInputs={true}
                                      onChange={(item) =>
                                        handleRoomChange(
                                          index,
                                          "dateRange",
                                          item.selection,
                                        )
                                      }
                                      moveRangeOnFirstSelection={false}
                                      ranges={[room.dateRange]}
                                      className="shadow-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="md:col-span-1">
                          <input
                            type="number"
                            value={room.nights || ""}
                            readOnly
                            className="w-full border border-gray-200 rounded-xl bg-gray-50 text-center text-sm p-2"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <input
                            type="number"
                            value={room.rooms}
                            min={1}
                            onChange={(e) =>
                              handleRoomChange(index, "rooms", e.target.value)
                            }
                            className="w-full border border-gray-200 rounded-xl text-center text-sm p-2"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <input
                            type="number"
                            value={room.occupancy || 1}
                            min={1}
                            onChange={(e) =>
                              handleRoomChange(
                                index,
                                "occupancy",
                                e.target.value,
                              )
                            }
                            className="w-full border border-gray-200 rounded-xl text-center text-sm p-2"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Select
                            styles={customSelectStyles}
                            value={
                              availableRoomTypes
                                .map((t) => ({
                                  value: t.roomType,
                                  label: t.roomType,
                                }))
                                .find((o) => o.value === room.type) || null
                            }
                            onChange={(opt) =>
                              handleRoomChange(
                                index,
                                "type",
                                opt?.value || "",
                                availableRoomTypes,
                              )
                            }
                            options={availableRoomTypes.map((t) => ({
                              value: t.roomType,
                              label: t.roomType,
                            }))}
                            isDisabled={
                              !room.hotel || availableRoomTypes.length === 0
                            }
                            placeholder={
                              !room.hotel ? "Select hotel" : "Select room"
                            }
                          />
                        </div>

                        <div className="md:col-span-1 flex items-center gap-2">
                          <div
                            className="w-full p-2 flex items-center justify-center rounded-xl text-white font-medium text-sm"
                            style={{ background: GOLD_GRADIENT }}
                          >
                            {room.price
                              ? calculateHotelRoomCost(room).toLocaleString()
                              : "0"}
                          </div>
                          {index !== 0 && (
                            <button
                              onClick={() => removeRoom(index)}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={addRoom}
                    className="px-6 py-3 rounded-xl text-white font-medium transition-all duration-300 hover:shadow-lg flex items-center gap-2 mt-4"
                    style={{ background: GOLD_GRADIENT }}
                  >
                    <Plus className="w-5 h-5" />
                    Add Another Room
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center mt-10">
                <button
                  onClick={handleProceedToSummary}
                  disabled={!user && hasB2CBookingLock()}
                  className="group relative px-8 py-4 rounded-xl text-white font-semibold text-lg overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1"
                  style={{
                    background:
                      !user && hasB2CBookingLock() ? "#9ca3af" : GOLD_GRADIENT,
                    cursor:
                      !user && hasB2CBookingLock() ? "not-allowed" : "pointer",
                  }}
                >
                  <span className="relative z-10">
                    Review Package & Proceed
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                Available Group Tickets
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {umrahPackages.map((group) => (
                <div
                  key={group._id}
                  className="mb-6 border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span
                        className="font-semibold text-lg"
                        style={{ color: "#000" }}
                      >
                        {group.airline?.airline_name}
                      </span>
                    </div>
                    <span className="px-2 py-1 bg-gray-200 rounded-full text-xs font-medium">
                      UMRAH GROUP
                    </span>
                    <span className="md:ml-auto px-3 py-1 bg-gray-900 text-white rounded-full text-sm">
                      {group.sector || ""}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Days
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Flight
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Sector
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Seats
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.flights.map((flight, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {flight.flight_date
                                ? new Date(
                                    flight.flight_date,
                                  ).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {group.noOfDays || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-mono">
                              {flight.flight_no || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {flight.origin} - {flight.destination}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                                {flight.dept_time || "-"}
                              </span>{" "}
                              →{" "}
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
                                {flight.arv_time || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center font-medium">
                              {group.seats || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {idx === group.flights.length - 1 && (
                                <button
                                  className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-all ${selectedGroupId === group._id ? "bg-gray-400 cursor-not-allowed" : "hover:shadow-md"}`}
                                  style={
                                    selectedGroupId !== group._id
                                      ? { background: GOLD_GRADIENT }
                                      : {}
                                  }
                                  onClick={() => handleSelectGroup(group._id)}
                                  disabled={selectedGroupId === group._id}
                                >
                                  {selectedGroupId === group._id
                                    ? "Selected"
                                    : "Select Now"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedGroupModel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Passenger Details
              </h3>
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setSelectedGroupId(null);
                  setHasTicket(false);
                  setSelectedGroupModel(false);
                  setPassengerCounts({ adults: 0, children: 0, infants: 0 });
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adults
                </label>
                {/* <input
                  type="number"
                  min={0}
                  name="adults"
                  value={passengerCounts.adults}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                /> */}
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    min={0}
                    max={!user ? 1 : undefined}
                    name="adults"
                    value={passengerCounts.adults}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 transition-all"
                    style={{ focusRingColor: GOLD }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Children
                </label>
                {/* <input
                  type="number"
                  min={0}
                  name="children"
                  value={passengerCounts.children}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                /> */}
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    min={0}
                    max={!user ? 0 : undefined}
                    name="children"
                    value={passengerCounts.children}
                    onChange={handleInputChange}
                    disabled={!user}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 transition-all"
                    style={{ focusRingColor: GOLD }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Infants
                </label>
                {/* <input
                  type="number"
                  min={0}
                  name="infants"
                  value={passengerCounts.infants}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                /> */}
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    min={0}
                    max={!user ? 0 : undefined}
                    name="infants"
                    value={passengerCounts.infants}
                    onChange={handleInputChange}
                    disabled={!user}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-opacity-50 transition-all"
                    style={{ focusRingColor: GOLD }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setSelectedGroupId(null);
                  setHasTicket(false);
                  setSelectedGroupModel(false);
                  setPassengerCounts({ adults: 0, children: 0, infants: 0 });
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const totalPax =
                    passengerCounts.adults +
                    passengerCounts.children +
                    passengerCounts.infants;
                  const details = [];
                  for (let i = 0; i < totalPax; i++) {
                    details.push({
                      type:
                        i < passengerCounts.adults
                          ? "Adult"
                          : i <
                              passengerCounts.adults + passengerCounts.children
                            ? "Child"
                            : "Infant",
                      title: "Mr",
                      givenName: "",
                      surName: "",
                      passport: "",
                      dateOfBirth: "",
                      passportExpiry: "",
                      nationality: "",
                    });
                  }
                  setPassengerDetails(details);
                  setSelectedGroupModel(false);
                  setPassengerDetailsModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ background: GOLD_GRADIENT }}
              >
                Next: Passenger Info
              </button>
            </div>
          </div>
        </div>
      )}

      {passengerDetailsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Passenger Information
              </h3>
              <button
                onClick={() => {
                  setPassengerDetailsModalOpen(false);
                  setSelectedGroupModel(true);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {passengerDetails.map((p, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-gray-200 rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold">
                      Passenger {idx + 1} — {p.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Given Name"
                      value={p.givenName}
                      onChange={(e) => {
                        const copy = [...passengerDetails];
                        copy[idx].givenName = e.target.value;
                        setPassengerDetails(copy);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Surname"
                      value={p.surName}
                      onChange={(e) => {
                        const copy = [...passengerDetails];
                        copy[idx].surName = e.target.value;
                        setPassengerDetails(copy);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Passport Number"
                      value={p.passport}
                      onChange={(e) => {
                        const copy = [...passengerDetails];
                        copy[idx].passport = e.target.value;
                        setPassengerDetails(copy);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg"
                    />
                    <input
                      type="date"
                      placeholder="Date of Birth"
                      value={p.dateOfBirth}
                      onChange={(e) => {
                        const copy = [...passengerDetails];
                        copy[idx].dateOfBirth = e.target.value;
                        setPassengerDetails(copy);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg"
                    />
                    <input
                      type="date"
                      placeholder="Passport Expiry"
                      value={p.passportExpiry}
                      onChange={(e) => {
                        const copy = [...passengerDetails];
                        copy[idx].passportExpiry = e.target.value;
                        setPassengerDetails(copy);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Nationality"
                      value={p.nationality}
                      onChange={(e) => {
                        const copy = [...passengerDetails];
                        copy[idx].nationality = e.target.value;
                        setPassengerDetails(copy);
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setPassengerDetailsModalOpen(false);
                  setSelectedGroupModel(true);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium"
              >
                Back
              </button>
              <button
                onClick={() => {
                  setPassengerDetailsModalOpen(false);
                }}
                className="px-6 py-2 rounded-lg text-white font-medium"
                style={{ background: GOLD_GRADIENT }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummaryModal && <SummaryModal />}

      <ToastContainer />
    </>
  );
};

export default UmrahPackageCalculator;
