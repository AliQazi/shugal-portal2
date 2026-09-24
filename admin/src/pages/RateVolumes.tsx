import React, { useEffect, useMemo, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import dayjs from "dayjs";
import { FiAlertCircle, FiCalendar, FiChevronDown, FiChevronRight, FiDollarSign, FiEdit2, FiHome, FiMapPin, FiPackage, FiPlus, FiRefreshCw, FiSave, FiTrash2, FiX } from "react-icons/fi";
import axiosInstance from "../Api/axios";
import currency_list from "../data/currencies";
import { emptyRatePricing, normalizeRateVolume, type RatePricing, type RateVolumeDateRate } from "../utils/rateVolumePricing";

interface HotelRef { _id: string; hotelName: string; city: string }
interface DateRangeForm { fromDate: string; toDate: string }
interface HotelRateForm { _id?: string; hotel: string; city: string; dateRates: RateVolumeDateRate[] }
interface RateVolumeForm { volumeName: string; isActive: boolean; dateRanges: DateRangeForm[]; hotelRates: HotelRateForm[] }
interface RateVolumeRecord { _id?: string; volumeName: string; isActive?: boolean; dateRanges?: DateRangeForm[]; hotelRates?: any[];[key: string]: any }
type SelectOption = { value: string; label: string };
type PricingKey = keyof RatePricing;

const emptyDateRange = (): DateRangeForm => ({ fromDate: "", toDate: "" });
const emptyDateRate = (range: DateRangeForm = emptyDateRange()): RateVolumeDateRate => ({ ...range, ...emptyRatePricing() });
const emptyHotelRate = (ranges: DateRangeForm[]): HotelRateForm => ({ hotel: "", city: "", dateRates: ranges.map(emptyDateRate) });
const initialState = (): RateVolumeForm => {
  const dateRanges = [emptyDateRange()];
  return { volumeName: "", isActive: true, dateRanges, hotelRates: [emptyHotelRate(dateRanges)] };
};
const toDateInput = (value?: string) => value ? value.slice(0, 10) : "";
const formatRange = (range: DateRangeForm) => range.fromDate && range.toDate ? `${dayjs(range.fromDate).format("DD MMM YYYY")} - ${dayjs(range.toDate).format("DD MMM YYYY")}` : "Dates not selected";

const validateDateRanges = (ranges: DateRangeForm[]): string | null => {
  for (let index = 0; index < ranges.length; index += 1) {
    const range = ranges[index];
    if (!range.fromDate || !range.toDate) return `Please select both dates in Date Range ${index + 1}`;
    if (range.fromDate > range.toDate) return `From date cannot be after to date in Date Range ${index + 1}`;
  }
  // Bands are half-open per night: [fromDate, toDate). A checkout date equal to the next
  // band's check-in date (e.g. Range 1 ... to 30 Oct, Range 2 30 Oct to ...) is allowed -
  // the night of 30 Oct belongs to Range 2, not both. Only flag it when nights actually
  // overlap, i.e. the ranges' interiors intersect (strict inequality on both ends).
  for (let i = 0; i < ranges.length; i += 1) {
    for (let j = i + 1; j < ranges.length; j += 1) {
      if (ranges[i].fromDate < ranges[j].toDate && ranges[j].fromDate < ranges[i].toDate) return `Date Range ${i + 1} overlaps with Date Range ${j + 1}. Each night may belong to only one pricing band.`;
    }
  }
  return null;
};

const customSelectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({ ...base, minHeight: "42px", borderRadius: "0.75rem", borderColor: state.isFocused ? "#3B82F6" : "#E5E7EB", boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,.1)" : "none" }),
  menu: (base) => ({ ...base, zIndex: 30, borderRadius: "0.75rem" }),
};
const currencyOptions = currency_list.map((currency) => ({ value: currency.code, label: `${currency.code} - ${currency.name}` }));

interface PricingCategoryProps {
  title: string; classes: string; rate: RateVolumeDateRate;
  buyingPriceKey: PricingKey; buyingRoeKey: PricingKey; buyingCurrencyKey: PricingKey;
  sellingPriceKey: PricingKey; sellingRoeKey: PricingKey; sellingCurrencyKey: PricingKey;
  onChange: (key: PricingKey, value: number | string) => void;
}

function PricingCategory(props: PricingCategoryProps) {
  const side = (label: string, priceKey: PricingKey, roeKey: PricingKey, currencyKey: PricingKey, color: string) => (
    <div className="rounded-xl border border-white/80 bg-white/80 p-3">
      <div className={`mb-2 text-xs font-bold uppercase tracking-wide ${color}`}>{label}</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_1.2fr]">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Price</label>
          <input type="number" min={0} step="0.01" value={Number(props.rate[priceKey]) || ""} onChange={(e) => props.onChange(priceKey, Number(e.target.value))} placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">ROE</label>
          <input type="number" min={0} step="0.01" value={Number(props.rate[roeKey])} onChange={(e) => props.onChange(roeKey, Number(e.target.value))} placeholder="1.00" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Currency</label>
          <Select options={currencyOptions} value={currencyOptions.find((item) => item.value === props.rate[currencyKey]) || null} onChange={(option) => props.onChange(currencyKey, option?.value || "PKR")} styles={customSelectStyles} isSearchable />
        </div>
      </div>
    </div>
  );
  return <div className={`rounded-2xl border p-3 ${props.classes}`}><h5 className="mb-3 text-sm font-bold">{props.title}</h5><div className="grid gap-3 xl:grid-cols-2">{side("Buying", props.buyingPriceKey, props.buyingRoeKey, props.buyingCurrencyKey, "text-red-600")}{side("Selling", props.sellingPriceKey, props.sellingRoeKey, props.sellingCurrencyKey, "text-green-600")}</div></div>;
}

export default function RateVolumes() {
  const [volumes, setVolumes] = useState<RateVolumeRecord[]>([]);
  const [hotels, setHotels] = useState<HotelRef[]>([]);
  const [formData, setFormData] = useState<RateVolumeForm>(initialState);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedVolumeIds, setExpandedVolumeIds] = useState<Set<string>>(new Set());

  const fetchVolumes = async () => { try { const response = await axiosInstance.get("/rate-volumes/all"); setVolumes(response.data.data || []); } catch (error) { console.error("Unable to fetch rate volumes", error); } };
  const fetchHotels = async () => { try { const response = await axiosInstance.get("/hotels/all"); setHotels(response.data.data || []); } catch (error) { console.error("Unable to fetch hotels", error); } };
  useEffect(() => { void fetchVolumes(); void fetchHotels(); }, []);
  const cityOptions = useMemo(() => Array.from(new Set(hotels.map((hotel) => hotel.city).filter(Boolean))).sort().map((city) => ({ value: city, label: city })), [hotels]);

  const updateDateRange = (index: number, field: keyof DateRangeForm, value: string) => setFormData((current) => ({
    ...current,
    dateRanges: current.dateRanges.map((range, i) => i === index ? { ...range, [field]: value } : range),
    hotelRates: current.hotelRates.map((hotelRate) => ({ ...hotelRate, dateRates: hotelRate.dateRates.map((dateRate, i) => i === index ? { ...dateRate, [field]: value } : dateRate) })),
  }));
  const addDateRange = () => setFormData((current) => ({ ...current, dateRanges: [...current.dateRanges, emptyDateRange()], hotelRates: current.hotelRates.map((rate) => ({ ...rate, dateRates: [...rate.dateRates, emptyDateRate()] })) }));
  const removeDateRange = (index: number) => setFormData((current) => ({ ...current, dateRanges: current.dateRanges.filter((_, i) => i !== index), hotelRates: current.hotelRates.map((rate) => ({ ...rate, dateRates: rate.dateRates.filter((_, i) => i !== index) })) }));
  const updateHotel = (index: number, fields: Partial<HotelRateForm>) => setFormData((current) => ({ ...current, hotelRates: current.hotelRates.map((rate, i) => i === index ? { ...rate, ...fields } : rate) }));
  const updateDateRate = (hotelIndex: number, rangeIndex: number, key: PricingKey, value: number | string) => setFormData((current) => ({ ...current, hotelRates: current.hotelRates.map((hotelRate, i) => i !== hotelIndex ? hotelRate : { ...hotelRate, dateRates: hotelRate.dateRates.map((dateRate, j) => j === rangeIndex ? { ...dateRate, [key]: value } : dateRate) }) }));
  const addHotelRate = () => setFormData((current) => ({ ...current, hotelRates: [...current.hotelRates, emptyHotelRate(current.dateRanges)] }));
  const removeHotelRate = (index: number) => setFormData((current) => ({ ...current, hotelRates: current.hotelRates.filter((_, i) => i !== index) }));
  const resetForm = () => { setEditId(null); setFormData(initialState()); setShowForm(false); };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.volumeName.trim()) return alert("Please enter a volume name");
    const dateError = validateDateRanges(formData.dateRanges);
    if (dateError) return alert(dateError);
    const invalidIndex = formData.hotelRates.findIndex((rate) => !rate.hotel || !rate.city);
    if (invalidIndex !== -1) return alert(`Please select city and hotel in Hotel Rate ${invalidIndex + 1}`);
    try {
      setLoading(true);
      const payload = { volumeName: formData.volumeName.trim(), isActive: formData.isActive, dateRanges: formData.dateRanges, hotelRates: formData.hotelRates.map((rate) => ({ hotel: rate.hotel, city: rate.city, dateRates: rate.dateRates })) };
      if (editId) await axiosInstance.put(`/rate-volumes/update/${editId}`, payload); else await axiosInstance.post("/rate-volumes/create", payload);
      alert(`Volume ${editId ? "updated" : "created"} successfully`); resetForm(); await fetchVolumes();
    } catch (error: any) { console.error(error); alert(error.response?.data?.message || "Something went wrong"); } finally { setLoading(false); }
  };

  const handleEdit = (volume: RateVolumeRecord) => {
    const normalized = normalizeRateVolume(volume).data;
    const dateRanges = normalized.dateRanges.map((range) => ({ fromDate: toDateInput(range.fromDate), toDate: toDateInput(range.toDate) }));
    setFormData({ volumeName: volume.volumeName, isActive: volume.isActive !== false, dateRanges, hotelRates: normalized.hotelRates.map((rate, index) => ({ _id: volume.hotelRates?.[index]?._id, hotel: rate.hotelId || "", city: rate.city || "", dateRates: rate.dateRates.map((dateRate) => ({ ...dateRate, fromDate: toDateInput(dateRate.fromDate), toDate: toDateInput(dateRate.toDate) })) })) });
    setEditId(volume._id || null); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleDelete = async (id?: string) => { if (!id || !window.confirm("Are you sure you want to delete this volume?")) return; try { await axiosInstance.delete(`/rate-volumes/delete/${id}`); alert("Volume deleted successfully"); await fetchVolumes(); } catch (error) { console.error(error); alert("Delete failed"); } };
  const toggleDetails = (id?: string) => id && setExpandedVolumeIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  return <div className="min-h-screen p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl">
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-2 flex items-center gap-3"><div className="rounded-lg bg-blue-100 p-2"><FiDollarSign className="h-6 w-6 text-blue-600" /></div><h1 className="text-3xl font-bold text-gray-900">Rate Volumes</h1></div><p className="ml-12 text-gray-600">Date-band hotel pricing for sharing and private rooms</p></div><button onClick={() => showForm ? resetForm() : (setFormData(initialState()), setEditId(null), setShowForm(true))} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-lg hover:bg-blue-700">{showForm ? <><FiX />Close Form</> : <><FiPlus />Add New Volume</>}</button></div>

    {showForm && <form onSubmit={handleSubmit} className="mb-8 space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl sm:p-6">
      <div className="flex items-center gap-3"><div className="rounded-lg bg-blue-100 p-2">{editId ? <FiEdit2 className="text-blue-600" /> : <FiPlus className="text-blue-600" />}</div><h2 className="text-2xl font-bold text-gray-800">{editId ? "Update Volume" : "Create New Volume"}</h2></div>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-end"><div><label className="mb-1.5 block text-xs font-semibold">Volume Name *</label><input value={formData.volumeName} onChange={(e) => setFormData((current) => ({ ...current, volumeName: e.target.value }))} required placeholder="e.g. October 2026 Supplier Rates" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="mb-1.5 block text-xs font-semibold">Status</label><button type="button" role="switch" aria-checked={formData.isActive} onClick={() => setFormData((current) => ({ ...current, isActive: !current.isActive }))} className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-gray-300 bg-white px-3 text-left transition hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"><span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${formData.isActive ? "bg-green-500" : "bg-gray-300"}`}><span className={`absolute left-0 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${formData.isActive ? "translate-x-5" : "translate-x-0.5"}`} /></span><span className={`whitespace-nowrap text-sm font-semibold ${formData.isActive ? "text-green-700" : "text-gray-600"}`}>{formData.isActive ? "Active" : "Inactive"}</span></button></div></div>
      <section className="rounded-2xl border-2 border-purple-200 bg-purple-50/40 p-5"><div className="mb-3 flex items-center gap-2"><FiCalendar className="text-purple-600" /><h3 className="font-bold text-purple-800">Date Bands</h3><span className="text-xs text-gray-500">Each hotel gets separate pricing in every band</span></div><div className="space-y-3">{formData.dateRanges.map((range, index) => <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"><div><label className="mb-1 block text-xs font-semibold">From Date {index + 1} *</label><input type="date" value={range.fromDate} onChange={(e) => updateDateRange(index, "fromDate", e.target.value)} onClick={(e) => e.currentTarget.showPicker?.()} required className="w-full cursor-pointer rounded-lg border bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="mb-1 block text-xs font-semibold">To Date {index + 1} *</label><input type="date" value={range.toDate} min={range.fromDate || undefined} onChange={(e) => updateDateRange(index, "toDate", e.target.value)} onClick={(e) => e.currentTarget.showPicker?.()} required className="w-full cursor-pointer rounded-lg border bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" /></div>{formData.dateRanges.length > 1 && <button type="button" onClick={() => removeDateRange(index)} className="inline-flex h-11 items-center gap-1 px-3 text-sm font-medium text-red-600"><FiTrash2 />Remove</button>}</div>)}</div><button type="button" onClick={addDateRange} className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-purple-300 px-4 py-2 text-sm font-semibold text-purple-700"><FiPlus />Add Date Band</button></section>
      <div className="space-y-5">{formData.hotelRates.map((hotelRate, hotelIndex) => {
        const filteredHotels = hotelRate.city ? hotels.filter((hotel) => hotel.city === hotelRate.city) : hotels;
        const hotelOptions = filteredHotels.map((hotel) => ({ value: hotel._id, label: hotel.hotelName }));
        const selectedHotelName = hotels.find((hotel) => hotel._id === hotelRate.hotel)?.hotelName;
        return <section key={hotelRate._id || hotelIndex} className="overflow-visible rounded-2xl border-2 border-blue-200 bg-blue-50/30"><div className="flex items-center justify-between border-b border-blue-200 px-5 py-3"><div className="flex items-center gap-2"><FiHome className="text-blue-600" /><h3 className="font-bold text-blue-800">Hotel Rate {hotelIndex + 1}{selectedHotelName ? ` - ${selectedHotelName}` : ""}</h3></div>{formData.hotelRates.length > 1 && <button type="button" onClick={() => removeHotelRate(hotelIndex)} className="inline-flex items-center gap-1 text-sm text-red-600"><FiTrash2 />Remove</button>}</div><div className="space-y-5 p-5"><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold">City *</label><Select options={cityOptions} value={hotelRate.city ? { value: hotelRate.city, label: hotelRate.city } : null} onChange={(option) => { const city = option?.value || ""; const selected = hotels.find((hotel) => hotel._id === hotelRate.hotel); updateHotel(hotelIndex, { city, hotel: selected?.city === city ? hotelRate.hotel : "" }); }} isClearable isSearchable styles={customSelectStyles} /></div><div><label className="mb-1 block text-xs font-semibold">Hotel *</label><Select options={hotelOptions} value={hotelOptions.find((option) => option.value === hotelRate.hotel) || null} onChange={(option) => { const hotel = hotels.find((item) => item._id === option?.value); updateHotel(hotelIndex, { hotel: option?.value || "", city: hotel?.city || hotelRate.city }); }} isClearable isSearchable styles={customSelectStyles} /></div></div>
          {hotelRate.dateRates.map((dateRate, rangeIndex) => <div key={rangeIndex} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center gap-2 border-b pb-3"><FiCalendar className="text-purple-600" /><h4 className="font-bold text-gray-800">Band {rangeIndex + 1}: {formatRange(formData.dateRanges[rangeIndex])}</h4></div><div className="space-y-3"><PricingCategory title="Room" classes="border-blue-200 bg-blue-50 text-blue-800" rate={dateRate} buyingPriceKey="buyingPrice" buyingRoeKey="buyingRoe" buyingCurrencyKey="buyingCurrency" sellingPriceKey="sellingPrice" sellingRoeKey="sellingRoe" sellingCurrencyKey="sellingCurrency" onChange={(key, value) => updateDateRate(hotelIndex, rangeIndex, key, value)} /><PricingCategory title="Sharing" classes="border-yellow-200 bg-yellow-50 text-yellow-800" rate={dateRate} buyingPriceKey="sharedRoomBuyingPrice" buyingRoeKey="sharedRoomBuyingRoe" buyingCurrencyKey="sharedRoomBuyingCurrency" sellingPriceKey="sharedRoomSellingPrice" sellingRoeKey="sharedRoomSellingRoe" sellingCurrencyKey="sharedRoomSellingCurrency" onChange={(key, value) => updateDateRate(hotelIndex, rangeIndex, key, value)} /></div></div>)}
        </div></section>;
      })}</div>
      <button type="button" onClick={addHotelRate} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 px-5 py-3 font-semibold text-blue-700"><FiPlus />Add More Hotel</button><div className="flex gap-3 border-t pt-4"><button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white disabled:bg-blue-400">{loading ? <><FiRefreshCw className="animate-spin" />Processing...</> : <><FiSave />{editId ? "Update Volume" : "Save Volume"}</>}</button><button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-xl bg-gray-200 px-6 py-3"><FiX />Cancel</button></div>
    </form>}

    <div className="overflow-hidden rounded-2xl border bg-white shadow-xl"><div className="border-b p-6"><div className="flex items-center gap-3"><FiPackage className="text-purple-600" /><div><h2 className="text-2xl font-bold">All Volumes</h2><p className="text-sm text-gray-500">{volumes.length} total</p></div></div></div><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 text-left text-xs uppercase text-gray-600"><th className="p-4">Volume</th><th className="p-4">Hotels</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>
      {volumes.length ? volumes.map((volume, index) => {
        const normalized = normalizeRateVolume(volume).data; const expanded = Boolean(volume._id && expandedVolumeIds.has(volume._id));
        return <React.Fragment key={volume._id || index}><tr className="border-b hover:bg-blue-50/40"><td className="p-4"><div className="flex items-start gap-3"><button type="button" onClick={() => toggleDetails(volume._id)} className="mt-0.5 rounded-lg border p-2">{expanded ? <FiChevronDown /> : <FiChevronRight />}</button><div><div className="font-semibold">{volume.volumeName}</div><div className="mt-1 space-y-0.5 text-xs text-gray-500">{normalized.dateRanges.map((range, i) => <div key={i} className="flex items-center gap-1"><FiCalendar />{formatRange({ fromDate: range.fromDate || "", toDate: range.toDate || "" })}</div>)}</div></div></div></td><td className="p-4"><button type="button" onClick={() => toggleDetails(volume._id)} className="rounded-lg bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700">{normalized.hotelRates.length} hotel(s)</button></td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${volume.isActive !== false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>{volume.isActive !== false ? "Active" : "Inactive"}</span></td><td className="p-4"><div className="flex gap-2"><button onClick={() => handleEdit(volume)} className="rounded-lg bg-yellow-50 p-2 text-yellow-700"><FiEdit2 /></button><button onClick={() => handleDelete(volume._id)} className="rounded-lg bg-red-50 p-2 text-red-700"><FiTrash2 /></button></div></td></tr>
          {expanded && <tr className="border-b bg-blue-50/30"><td colSpan={4} className="p-4"><div className="space-y-4">{normalized.hotelRates.map((rate, hotelIndex) => <div key={hotelIndex} className="overflow-hidden rounded-xl border bg-white"><div className="flex items-center gap-2 bg-gray-50 px-4 py-3"><FiHome className="text-blue-500" /><span className="font-semibold">{hotels.find((hotel) => hotel._id === rate.hotelId)?.hotelName || "Unknown hotel"}</span><FiMapPin className="ml-2 text-gray-400" /><span className="text-sm text-gray-500">{rate.city || "-"}</span></div><div className="overflow-x-auto"><table className="w-full min-w-160 text-sm"><thead><tr className="border-y bg-gray-50 text-left text-xs uppercase text-gray-500"><th className="p-3">Date band</th><th className="p-3">(Room) Buy / Sell</th><th className="p-3">(Sharing) Buy / Sell</th></tr></thead><tbody>{rate.dateRates.map((band, bandIndex) => <tr key={bandIndex} className="border-b last:border-0"><td className="p-3 font-medium">{formatRange(band)}</td><td className="p-3">{band.buyingPrice.toLocaleString()} / {band.sellingPrice.toLocaleString()} {band.sellingCurrency}</td><td className="p-3">{band.sharedRoomBuyingPrice.toLocaleString()} / {band.sharedRoomSellingPrice.toLocaleString()} {band.sharedRoomSellingCurrency}</td></tr>)}</tbody></table></div></div>)}</div></td></tr>}
        </React.Fragment>;
      }) : <tr><td colSpan={4}><div className="flex flex-col items-center py-16 text-gray-400"><FiAlertCircle className="mb-3 h-10 w-10" /><p>No volumes found</p></div></td></tr>}
    </tbody></table></div></div>
  </div></div>;
}
