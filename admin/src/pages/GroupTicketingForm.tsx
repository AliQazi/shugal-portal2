import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import AsyncSelect from "react-select/async";
import Select from "react-select";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import useAccountsList from "../context/useAccountsList";
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

interface Payment {
  amount: number;
  method: "Cash" | "Bank" | "Online";
  status: "Pending" | "Paid" | "Refunded";
  paymentDate?: string;
}

interface Sector {
  _id: string;
  groupType: string;
  sectorTitle: string;
  fullSector: string;
}

interface Airline {
  _id: string;
  airlineCode: string;
  airlineName: string;
  shortCode: string;
  logo: string;
}

const GroupTicketingForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const canCreate = hasPermission(user, "create_group");
  const canManage = hasPermission(user, "group_ticketing_action_buttons");
  const canAccess = id ? canManage : canCreate;
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);
  // ── Accounts ──────────────────────────────────────────────────────────────
  const { data3 = [] } = useAccountsList();
  console.log(data3)
  const [formData, setFormData] = useState({
    user: { name: "", _id: "" },
    evoucherAccount: "",
    sector: "",
    airline: "",
    groupCategory: "",
    groupName: "",
    totalSeats: 0,
    showSeat: false,
    hidePartial: false,
    partialSeats: 0,
    groupType: "" as string,
    flights: [{
      airline: "",
      flightNo: "",
      depDate: "",
      depTime: "",
      arrDate: "",
      arrTime: "",
      sectorFrom: "",
      sectorTo: "",
      fromTerminal: "",
      toTerminal: "",
      flightClass: "",
      baggage: "",
      meal: ""
    }],
    passengers: {
      adults: 0,
      children: 0,
      infants: 0
    },
    price: {
      buyingCurrency: "PKR",
      buyingAdultPrice: 0,
      buyingChildPrice: 0,
      buyingInfantPrice: 0,
      sellingCurrencyB2B: "PKR",
      sellingAdultPriceB2B: 0,
      sellingChildPriceB2B: 0,
      sellingInfantPriceB2B: 0
    },
    pnr: "",
    contactPersonPhone: "",
    contactPersonEmail: "",
    internalStatus: "Public",
    payments: [] as Payment[]
  });

  useEffect(() => {
    if (!canAccess) return;

    fetchSectors();
    fetchAirlines();
    if (id) {
      setEditMode(true);
      fetchBookingDetails(id);
    }

    fetch("/admin-portal/data/cities.json")
      .then((res) => res.json())
      .then((data) => {
        const options = data.map((c: any) => ({
          value: c.airportCode,
          label: `${c.cityEn} (${c.airportCode})`,
        }));
        setCityOptions(options);
      })
      .catch(() => setCityOptions([]));
  }, [id, canAccess]);

  const fetchSectors = async () => {
    try {
      const response = await axiosInstance.get("/sector");
      if (response.data.success) {
        setSectors(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching sectors:", error);
    }
  };

  const fetchAirlines = async () => {
    try {
      const response = await axiosInstance.get("/airline");
      if (response.data.success) {
        setAirlines(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching airlines:", error);
    }
  };

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const response = await axiosInstance.get(`/group-ticketing/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const booking = response.data.data;
        setFormData({
          user: booking.user || { name: "", _id: "" },
          evoucherAccount: booking.evoucherAccount || "",
          sector: booking.sector || "",
          airline: booking.airline || "",
          groupCategory: booking.groupCategory || "",
          groupName: booking.groupName || "",
          totalSeats: booking.totalSeats || 0,
          showSeat: booking.showSeat || false,
          hidePartial: booking.hidePartial || false,
          partialSeats: booking.partialSeats || 0,
          groupType: booking.groupType,
          flights: booking.flights.map((f: Flight) => ({
            ...f,
            airline: f.airline || booking.airline,
            depDate: f.depDate.slice(0, 10),
            arrDate: f.arrDate.slice(0, 10),
            fromTerminal: f.fromTerminal || "",
            toTerminal: f.toTerminal || "",
            flightClass: f.flightClass || "",
            baggage: f.baggage || "",
            meal: f.meal || ""
          })),
          passengers: booking.passengers,
          price: {
            buyingCurrency: booking.price.buyingCurrency,
            buyingAdultPrice: booking.price.buyingAdultPrice,
            buyingChildPrice: booking.price.buyingChildPrice,
            buyingInfantPrice: booking.price.buyingInfantPrice,
            sellingCurrencyB2B: booking.price.sellingCurrencyB2B,
            sellingAdultPriceB2B: booking.price.sellingAdultPriceB2B,
            sellingChildPriceB2B: booking.price.sellingChildPriceB2B,
            sellingInfantPriceB2B: booking.price.sellingInfantPriceB2B
          },
          pnr: booking.pnr || "",
          contactPersonPhone: booking.contactPersonPhone || "",
          contactPersonEmail: booking.contactPersonEmail || "",
          internalStatus: booking.internalStatus || "Public",
          payments: booking.payments
        });
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
      window.alert("❌ Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const getCustomSelectStyles = (hasError: boolean = false) => ({
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: "36px",
      height: "36px",
      fontSize: "0.75rem",
      borderColor: hasError ? "red" : provided.borderColor,
      boxShadow: hasError ? "0 0 0 1px red" : state.isFocused ? provided.boxShadow : "none",
      borderRadius: ".375rem",
      "&:hover": {
        borderColor: hasError ? "red" : provided.borderColor,
      },
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: "0 0.5rem",
    }),
    indicatorsContainer: (provided: any) => ({
      ...provided,
      height: "36px",
    }),
    input: (provided: any) => ({
      ...provided,
      margin: "0",
      padding: "0",
    }),
    menuPortal: (provided: any) => ({
      ...provided,
      zIndex: 9999,
    }),
  });

  const loadCityOptions = (inputValue: string, callback: (options: any[]) => void) => {
    fetch("/admin-portal/data/cities.json")
      .then((res) => res.json())
      .then((data) => {
        const input = inputValue.toLowerCase();
        const filtered = data
          .filter((c: any) => {
            const city = (c.cityEn || "").toLowerCase();
            const code = (c.airportCode || "").toLowerCase();
            const searchTerm = (c.titleKey || "").toLowerCase();
            return (
              !inputValue ||
              city.includes(input) ||
              code.includes(input) ||
              searchTerm.includes(input)
            );
          })
          .map((c: any) => ({
            value: c.airportCode,
            label: `${c.cityEn} (${c.airportCode})`,
          }))
          .slice(0, 50);
        callback(filtered);
      })
      .catch(() => callback([]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAccess) {
      window.alert(id ? "You don't have permission to update groups" : "You don't have permission to create groups");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");

      if (editMode && id) {
        const response = await axiosInstance.put(`/group-ticketing/${id}`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (response.data.success) {
          window.alert("✅ Booking updated successfully!");
          navigate("/group-ticketing");
        }
      } else {
        const response = await axiosInstance.post("/group-ticketing", formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (response.data.success) {
          window.alert("✅ Booking created successfully!");
          navigate("/group-ticketing");
        }
      }
    } catch (error: any) {
      console.error("Error saving booking:", error);
      window.alert("❌ " + (error.response?.data?.message || "Failed to save booking"));
    } finally {
      setLoading(false);
    }
  };

  if (!canAccess) {
    return (
      <>
        <PageMeta title={id ? "Edit Group - Access denied" : "Create Group - Access denied"} description="Access denied" />
        <PageBreadCrumb pageTitle={id ? "Edit Group" : "Create Group"} />
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
          {id ? "You do not have permission to edit groups." : "You do not have permission to create groups."}
        </div>
      </>
    );
  }

  const addFlight = () => {
    setFormData({
      ...formData,
      flights: [
        ...formData.flights,
        {
          airline: formData.airline,
          flightNo: "",
          depDate: "",
          depTime: "",
          arrDate: "",
          arrTime: "",
          sectorFrom: "",
          sectorTo: "",
          fromTerminal: "",
          toTerminal: "",
          flightClass: "",
          baggage: "",
          meal: ""
        }
      ]
    });
  };

  const handleDateMasking = (index: number, field: 'depDate' | 'arrDate', value: string) => {
    let x = value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,2})(\d{0,4})/);
    if (!x) return;
    let maskedValue = !x[2] ? x[1] : x[1] + '-' + x[2] + (x[3] ? '-' + x[3] : '');
    const updatedFlights = [...formData.flights];
    (updatedFlights[index] as any)[field] = maskedValue;
    setFormData({ ...formData, flights: updatedFlights });
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

  const removeFlight = (index: number) => {
    setFormData({
      ...formData,
      flights: formData.flights.filter((_, i) => i !== index)
    });
  };

  // ✅ UPDATED: ek saath multiple fields update karta hai - stale state problem fix
  const updateFlight = (index: number, fields: Record<string, string>) => {
    const updatedFlights = [...formData.flights];
    updatedFlights[index] = { ...updatedFlights[index], ...fields };
    setFormData({ ...formData, flights: updatedFlights });
  };

  if (loading) {
    return (
      <>
        <PageMeta title={editMode ? "Edit Group" : "Create Group"} description="Group ticketing form" />
        <PageBreadCrumb pageTitle={editMode ? "Edit Group" : "Create Group"} />
        <div className="flex justify-center items-center py-20">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title={editMode ? "Edit Group" : "Create Group"} description="Group ticketing form" />
      <PageBreadCrumb pageTitle={editMode ? "Edit Group" : "Create Group"} />

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="bg-[#000] px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-bold text-white">
            {editMode ? "Edit Airline Group" : "Add Airline Group"}
          </h3>
          <p className="text-blue-100 text-sm mt-1">Airline Group Details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Supplier Account
              </label>
              <Select
                required
                value={
                  formData.user._id
                    ? { value: formData.user._id, label: formData.user.name }
                    : null
                }
                onChange={(selectedOption) => {
                  if (selectedOption) {
                    setFormData({
                      ...formData,
                      user: {
                        name: selectedOption.label,
                        _id: selectedOption.value,
                      },
                    });
                  }
                }}
                options={data3.map((account) => ({
                  value: account._id,
                  label: account.account_name,
                }))}
                placeholder="Select Supplier Account"
                isClearable
                isSearchable
                className="react-select-container"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '44px',
                    borderColor: '#d1d5db',
                    '&:hover': {
                      borderColor: '#3b82f6',
                    },
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 9999,
                  }),
                }}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Sector
              </label>
              <select
                value={formData.sector}
                onChange={(e) => {
                  const selectedSector = sectors.find(s => s.sectorTitle === e.target.value);
                  setFormData({
                    ...formData,
                    sector: e.target.value,
                    groupCategory: selectedSector?.groupType || "",
                    groupType: selectedSector?.groupType || ""
                  });
                }}
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Select Sector</option>
                {sectors.map((sector) => (
                  <option key={sector._id} value={sector.sectorTitle}>
                    {sector.sectorTitle} - {sector.fullSector}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Airline, Group Category, Group Name, Total Seats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Airline
              </label>
              <select
                value={formData.airline}
                onChange={(e) => {
                  const selectedAirline = airlines.find(a => a.airlineName === e.target.value);
                  const updatedFlights = formData.flights.map(flight => ({
                    ...flight,
                    airline: e.target.value
                  }));
                  setFormData({
                    ...formData,
                    airline: e.target.value,
                    groupName: selectedAirline ? `${selectedAirline.airlineName}-${formData.sector || 'NULL'}` : formData.groupName,
                    flights: updatedFlights
                  });
                }}
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Select Airline</option>
                {airlines.map((airline) => (
                  <option key={airline._id} value={airline.airlineName}>
                    {airline.airlineName} ({airline.shortCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Group Category
              </label>
              <input
                type="text"
                value={formData.groupCategory}
                readOnly
                className="w-full h-11 rounded border border-gray-300 bg-gray-100 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white/90 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Group Name
              </label>
              <input
                type="text"
                value={formData.groupName}
                readOnly
                placeholder="e.g., AIR SIAL-NULL"
                className="w-full h-11 rounded border border-gray-300 bg-gray-100 px-4 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white/90 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Seats
              </label>
              <input
                type="text"
                value={formData.totalSeats ? formData.totalSeats.toLocaleString() : ''}
                onChange={(e) => setFormData({ ...formData, totalSeats: Number(e.target.value.replace(/,/g, '')) || 0 })}
                placeholder="Enter total seats"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>

          {/* Show Seat */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showSeat}
                  onChange={(e) => setFormData({ ...formData, showSeat: e.target.checked })}
                  className="w-10 h-6 appearance-none bg-gray-300 rounded-full relative cursor-pointer transition-colors checked:bg-blue-600 before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-4"
                />
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Show Seat</span>
              </label>
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hidePartial}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hidePartial: e.target.checked,
                      partialSeats: e.target.checked ? formData.partialSeats : 0,
                    })
                  }
                  className="w-10 h-6 appearance-none bg-gray-300 rounded-full relative cursor-pointer transition-colors checked:bg-blue-600 before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-4"
                />
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hide Partial
                </span>
              </label>
            </div>

            {formData.hidePartial && (
              <div>
                <input
                  type="number"
                  min={0}
                  max={formData.totalSeats || undefined}
                  value={formData.partialSeats}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0;

                    if (value > formData.totalSeats) {
                      alert(`Partial seats cannot be greater than total seats (${formData.totalSeats})`);
                      return;
                    }

                    setFormData({
                      ...formData,
                      partialSeats: value,
                    });
                  }}
                  placeholder="Enter partial seats"
                  className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            )}
          </div>

          {/* Flight Details Table */}
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Flight Details</h4>
              <button
                type="button"
                onClick={addFlight}
                className="rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                + Add More
              </button>
            </div>
            <table className="w-full border border-gray-300 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Flight#</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Dep Date</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Dep Time</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Sector From</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">From Terminal</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Sector To</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">To Terminal</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Class</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Arr Date</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Arr Time</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Baggage</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Meal</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {formData.flights.map((flight, index) => (
                  <tr key={index} className="bg-white dark:bg-gray-800">
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <input
                        type="text"
                        required
                        value={flight.flightNo}
                        onChange={(e) => updateFlight(index, { flightNo: e.target.value })}
                        className="w-full min-w-20 h-9 rounded border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <DatePicker
                        selected={parseISODate(flight.depDate)}
                        onChange={(date: Date | null) => {
                          if (date) updateFlight(index, { depDate: dateToISO(date) });
                        }}
                        dateFormat="dd-MM-yyyy"
                        customInput={
                          <input
                            type="text"
                            placeholder="DD-MM-YYYY"
                            value={flight.depDate}
                            onChange={(e) => handleDateMasking(index, 'depDate', e.target.value)}
                            className="w-full min-w-35 h-9 px-2 text-xs border border-gray-300 rounded bg-white text-gray-900"
                          />
                        }
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <input
                        type="time"
                        required
                        value={flight.depTime}
                        onChange={(e) => updateFlight(index, { depTime: e.target.value })}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        className="w-full min-w-30 h-9 px-2 text-xs border border-gray-300 rounded bg-white text-gray-900"
                      />
                    </td>
                    {/* ✅ Sector From - automatically fromTerminal bhi set karta hai */}
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <AsyncSelect
                        cacheOptions
                        defaultOptions={cityOptions}
                        loadOptions={loadCityOptions}
                        styles={getCustomSelectStyles()}
                        value={cityOptions.find((opt) => opt.value === flight.sectorFrom) || null}
                        onChange={(option: any) =>
                          updateFlight(index, {
                            sectorFrom: option?.value || "",
                            fromTerminal: option?.label || "",
                          })
                        }
                        filterOption={(option, inputValue) => {
                          if (!inputValue) return true;

                          const search = inputValue.toLowerCase().trim();

                          return (
                            option.data.value.toLowerCase() === search ||
                            option.data.label.toLowerCase() === search
                          );
                        }}
                        placeholder="Select city"
                        className="min-w-37.5"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <input
                        type="text"
                        value={flight.fromTerminal}
                        onChange={(e) => updateFlight(index, { fromTerminal: e.target.value })}
                        placeholder="Terminal"
                        className="w-full min-w-20 h-9 rounded border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </td>
                    {/* ✅ Sector To - automatically toTerminal bhi set karta hai */}
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <AsyncSelect
                        cacheOptions
                        defaultOptions={cityOptions}
                        loadOptions={loadCityOptions}
                        styles={getCustomSelectStyles()}
                        value={cityOptions.find((opt) => opt.value === flight.sectorTo) || null}
                        onChange={(option: any) =>
                          updateFlight(index, {
                            sectorTo: option?.value || "",
                            toTerminal: option?.label || "",
                          })
                        }
                        filterOption={(option, inputValue) => {
                          if (!inputValue) return true;

                          const search = inputValue.toLowerCase().trim();

                          return (
                            option.data.value.toLowerCase() === search ||
                            option.data.label.toLowerCase() === search
                          );
                        }}
                        placeholder="Select city"
                        className="min-w-37.5"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <input
                        type="text"
                        value={flight.toTerminal}
                        onChange={(e) => updateFlight(index, { toTerminal: e.target.value })}
                        placeholder="Terminal"
                        className="w-full min-w-20 h-9 rounded border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <select
                        value={flight.flightClass}
                        onChange={(e) => updateFlight(index, { flightClass: e.target.value })}
                        className="w-full min-w-25 h-9 rounded border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select</option>
                        <option value="Economy">Economy</option>
                        <option value="Business">Business</option>
                        <option value="First">First</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <DatePicker
                        selected={parseISODate(flight.arrDate)}
                        onChange={(date: Date | null) => {
                          if (date) updateFlight(index, { arrDate: dateToISO(date) });
                        }}
                        dateFormat="dd-MM-yyyy"
                        customInput={
                          <input
                            type="text"
                            placeholder="DD-MM-YYYY"
                            value={flight.arrDate}
                            onChange={(e) => handleDateMasking(index, 'arrDate', e.target.value)}
                            className="w-full min-w-35 h-9 px-2 text-xs border border-gray-300 rounded bg-white text-gray-900"
                          />
                        }
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <input
                        type="time"
                        required
                        value={flight.arrTime}
                        onChange={(e) => updateFlight(index, { arrTime: e.target.value })}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        className="w-full min-w-30 h-9 px-2 text-xs border border-gray-300 rounded bg-white text-gray-900"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <input
                        type="text"
                        value={flight.baggage}
                        onChange={(e) => updateFlight(index, { baggage: e.target.value })}
                        placeholder="e.g., 30kg"
                        className="w-full min-w-20 h-9 rounded border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      <select
                        value={flight.meal}
                        onChange={(e) => updateFlight(index, { meal: e.target.value })}
                        className="w-full min-w-25 h-9 rounded border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                      {formData.flights.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFlight(index)}
                          className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Buying Currency and Prices */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Buying Currency
              </label>
              <select
                value={formData.price.buyingCurrency}
                onChange={(e) => setFormData({ ...formData, price: { ...formData.price, buyingCurrency: e.target.value } })}
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="PKR">PKR</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Buying Price Per Seat (Adult)
              </label>
              <input
                type="text"
                value={formData.price.buyingAdultPrice ? formData.price.buyingAdultPrice.toLocaleString() : ''}
                onChange={(e) => setFormData({ ...formData, price: { ...formData.price, buyingAdultPrice: Number(e.target.value.replace(/,/g, '')) || 0 } })}
                placeholder="0"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Buying Price Per Seat (Child)
              </label>
              <input
                type="text"
                value={formData.price.buyingChildPrice ? formData.price.buyingChildPrice.toLocaleString() : ''}
                onChange={(e) => setFormData({ ...formData, price: { ...formData.price, buyingChildPrice: Number(e.target.value.replace(/,/g, '')) || 0 } })}
                placeholder="0"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Buying Price Per Seat (Infant)
              </label>
              <input
                type="text"
                value={formData.price.buyingInfantPrice ? formData.price.buyingInfantPrice.toLocaleString() : ''}
                onChange={(e) => setFormData({ ...formData, price: { ...formData.price, buyingInfantPrice: Number(e.target.value.replace(/,/g, '')) || 0 } })}
                placeholder="0"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>

          {/* Selling Currency B2B and Prices */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Selling Currency B2B
              </label>
              <select
                value={formData.price.sellingCurrencyB2B}
                onChange={(e) => setFormData({ ...formData, price: { ...formData.price, sellingCurrencyB2B: e.target.value } })}
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="PKR">PKR</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Selling Price Per Seat B2B(Adult)
              </label>
              <input
                type="text"
                value={formData.price.sellingAdultPriceB2B ? formData.price.sellingAdultPriceB2B.toLocaleString() : ''}
                onChange={(e) => setFormData({ ...formData, price: { ...formData.price, sellingAdultPriceB2B: Number(e.target.value.replace(/,/g, '')) || 0 } })}
                placeholder="0"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Selling Price Per Seat B2B(Child)
              </label>
              <input
                type="text"
                value={formData.price.sellingChildPriceB2B ? formData.price.sellingChildPriceB2B.toLocaleString() : ''}
                onChange={(e) => setFormData({ ...formData, price: { ...formData.price, sellingChildPriceB2B: Number(e.target.value.replace(/,/g, '')) || 0 } })}
                placeholder="0"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Selling Price Per Seat B2B(Infant)
              </label>
              <input
                type="text"
                value={formData.price.sellingInfantPriceB2B ? formData.price.sellingInfantPriceB2B.toLocaleString() : ''}
                onChange={(e) => setFormData({ ...formData, price: { ...formData.price, sellingInfantPriceB2B: Number(e.target.value.replace(/,/g, '')) || 0 } })}
                placeholder="0"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>

          {/* PNR, Contact, Email, Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">PNR</label>
              <input
                type="text"
                value={formData.pnr}
                onChange={(e) => setFormData({ ...formData, pnr: e.target.value })}
                placeholder="Enter PNR"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person Phone</label>
              <input
                type="tel"
                value={formData.contactPersonPhone}
                onChange={(e) => setFormData({ ...formData, contactPersonPhone: e.target.value })}
                placeholder="Phone Number"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person Email</label>
              <input
                type="email"
                value={formData.contactPersonEmail}
                onChange={(e) => setFormData({ ...formData, contactPersonEmail: e.target.value })}
                placeholder="Email Address"
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Internal Status</label>
              <select
                value={formData.internalStatus}
                onChange={(e) => setFormData({ ...formData, internalStatus: e.target.value })}
                className="w-full h-11 rounded border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="Public">Public</option>
                <option value="Private">Private</option>
              </select>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate("/group-ticketing")}
              className="rounded bg-gray-500 px-8 py-3 text-sm font-medium text-white hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canAccess}
              className="rounded bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canAccess ? (id ? "You don't have permission to update groups" : "You don't have permission to create groups") : ""}
            >
              {loading ? "Saving..." : editMode ? "Update Group" : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default GroupTicketingForm;
