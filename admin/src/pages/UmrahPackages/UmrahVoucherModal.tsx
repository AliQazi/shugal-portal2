import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import CreatableSelect from "react-select/creatable";
import { PlusIcon, PrinterIcon, TrashIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import axiosInstance from "../../Api/axios";
import {
    hotelRowNights,
    printUmrahVoucher,
    rebuildVoucherTransports,
    reflowVoucherStays,
    type StayEdit,
    toVoucherFlightRows,
    voucherSummary,
    type UmrahVoucherBooking,
    type UmrahVoucherData,
    type VoucherFlightRow,
    type VoucherHotelRow,
    type VoucherPackage,
    type VoucherPassengerRow,
    type VoucherTransportRow,
} from "../../utils/umrahVoucherPrint";

const TRANSPORT_TYPES = ["Bus", "Van", "Car", "Coaster", "Hiace", "Mini Bus", "Economy By Bus", "Other"];

interface GroupTicketOption {
    _id: string; label: string; pnr: string; groupNo: string; flights: VoucherFlightRow[];
}

interface HotelOption { value: string; label: string; data: { hotelName: string; city?: string; rating?: number } }

interface Props {
    booking: UmrahVoucherBooking;
    initialVoucher: UmrahVoucherData;
    isEdit: boolean;
    // Package details (already merged with the booking's override) used to re-derive transport legs.
    packageData: VoucherPackage | null;
    onClose: () => void;
    onSave: (voucher: UmrahVoucherData) => Promise<void>;
}

// A native <input type="time"> follows the browser's locale (am/pm for many users), so flight
// times are typed as plain 24-hour "HH:MM" instead.
const clampTime = (digits: string): string => {
  if (!digits) return "";
  const padded = digits.length <= 2 ? `${digits.padStart(2, "0")}00` : digits.length === 3 ? `0${digits}` : digits;
  const hours = Math.min(Number(padded.slice(0, 2)), 23);
  const minutes = Math.min(Number(padded.slice(2, 4)), 59);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

// Nights are applied when the field is left (or Enter is pressed), not per keystroke, so typing
// "10" doesn't first re-flow the stays to 1 night.
function NightsInput({ value, onCommit }: { value: number | null; onCommit: (nights: number) => void }) {
    const [draft, setDraft] = useState<string | null>(null);
    const commit = () => {
        const nights = Math.round(Number(draft));
        if (draft !== null && draft !== "" && nights >= 1 && nights !== value) onCommit(nights);
        setDraft(null);
    };
    return (
        <input
            type="number" min="1" className="uv-in" value={draft ?? value ?? ""}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
        />
    );
}

function TimeInput24({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <input
            className="uv-in" inputMode="numeric" placeholder="HH:MM" maxLength={5} value={value}
            onChange={e => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                onChange(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
            }}
            onBlur={() => onChange(clampTime(value.replace(/\D/g, "")))}
        />
    );
}

const patchRow = <T,>(rows: T[], index: number, patch: Partial<T>): T[] =>
    rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
const dropRow = <T,>(rows: T[], index: number): T[] => rows.filter((_, i) => i !== index);

// Same look as the printed voucher, with every value turned into an input.
const VOUCHER_CSS = `
.uv { color: #172b43; font: 12px Arial, sans-serif; }
.uv-header { display: grid; grid-template-columns: 1.15fr 1fr; gap: 24px; padding: 12px 14px 14px; border-top: 4px solid #153e68; background: #f3f7fb; }
.uv-brand { font-size: 17px; font-weight: 800; color: #153e68; margin-bottom: 8px; }
.uv-line { display: flex; align-items: center; gap: 8px; margin: 5px 0; flex-wrap: wrap; }
.uv-line > span { min-width: 84px; color: #475569; }
.uv-agency { text-align: right; }
.uv-status { font-size: 30px; margin-top: 6px; font-weight: 500; }
.uv-approved { color: #299368; } .uv-pending { color: #b87920; }
.uv h1 { text-align: center; font-size: 15px; color: #153e68; margin: 14px 0 8px; letter-spacing: 1px; }
.uv-ref { display: grid; grid-template-columns: 1.8fr 1fr 1fr; border: 1px solid #b9c9d9; background: #eef4fa; margin-bottom: 12px; }
.uv-ref > label { padding: 7px 8px; border-right: 1px solid #b9c9d9; display: flex; align-items: center; gap: 8px; }
.uv-ref > label:last-child { border: 0; }
.uv-ref > label > span { white-space: nowrap; color: #475569; }
.uv-section { margin-bottom: 14px; }
.uv-scroll { overflow-x: auto; }
.uv-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; min-width: 860px; }
.uv-table th { background: #edf3f9; color: #153e68; padding: 5px 3px; border: 1px solid #b9c9d9; text-align: center; font-weight: 700; }
.uv-table th.uv-bar { background: #dce8f3; font-size: 12px; padding: 6px; letter-spacing: .3px; }
.uv-table td { padding: 3px; border-bottom: 1px dotted #b9c9d9; vertical-align: middle; text-align: center; }
.uv-table tbody tr:nth-child(even) { background: #f8fafc; }
.uv-in { width: 100%; box-sizing: border-box; padding: 4px 5px; border: 1px solid transparent; border-radius: 4px; background: transparent; font: inherit; color: inherit; text-align: inherit; }
.uv-in:hover { border-color: #cbd5e1; background: white; }
.uv-in:focus { outline: none; border-color: #2563eb; background: white; box-shadow: 0 0 0 2px #dbeafe; }
.uv-box { border-color: #cbd5e1; background: white; }
.uv-left { text-align: left; }
.uv-ro { color: #64748b; padding: 4px 5px; }
.uv-del { border: none; background: #fef2f2; border-radius: 5px; padding: 3px; cursor: pointer; display: inline-flex; }
.uv-tools { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.uv-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; background: white; border: 1px solid #bfdbfe; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700; color: #1d4ed8; }
.uv-btn:disabled { opacity: .5; cursor: not-allowed; }
.uv-nights { text-align: right; padding: 6px 8px 0; font-weight: 700; color: #153e68; }
.uv-empty { color: #64748b; padding: 10px; text-align: center; }
.uv-note { font-size: 11px; color: #64748b; }
.uv-card { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 9px; padding: 10px 12px; margin-bottom: 12px; }
`;

const compactSelectStyles = {
    control: (base: object) => ({ ...base, minHeight: "28px", fontSize: "0.72rem" }),
    valueContainer: (base: object) => ({ ...base, padding: "0 6px" }),
    input: (base: object) => ({ ...base, margin: 0, padding: 0 }),
    menu: (base: object) => ({ ...base, fontSize: "0.72rem", minWidth: "260px" }),
    // The dropdown renders in a portal on document.body so the scrollable modal body can't clip it.
    menuPortal: (base: object) => ({ ...base, zIndex: 100000000 }),
};

export default function UmrahVoucherModal({ booking, initialVoucher, isEdit, packageData, onClose, onSave }: Props) {
    const [voucher, setVoucher] = useState<UmrahVoucherData>(initialVoucher);
    const [saving, setSaving] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [groupTicketOptions, setGroupTicketOptions] = useState<GroupTicketOption[]>([]);
    const [hotelOptions, setHotelOptions] = useState<HotelOption[]>([]);
    const [loadingSelectors, setLoadingSelectors] = useState(false);

    useEffect(() => {
        setLoadingSelectors(true);
        Promise.all([axiosInstance.get("/group-ticketing"), axiosInstance.get("/hotels/all")])
            .then(([groupsRes, hotelsRes]) => {
                if (groupsRes.data?.success) {
                    setGroupTicketOptions(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (groupsRes.data.data || []).filter((g: any) => g.groupType === "Umrah Groups").map((g: any) => ({
                            _id: g._id,
                            label: [
                                g.groupName || g.groupBookingId || g.sector || "Untitled Group",
                                `Seats: ${g.totalSeats || 0}`,
                                `PNR: ${g.pnr || "N/A"}`,
                                `Supplier: ${g.user?.name || "N/A"}`,
                            ].join(" | "),
                            pnr: g.pnr || "",
                            groupNo: g.groupNo || "",
                            flights: toVoucherFlightRows(g.flights || []),
                        })),
                    );
                }
                if (hotelsRes.data?.success) {
                    setHotelOptions(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (hotelsRes.data.data || []).map((h: any) => ({
                            value: h._id,
                            label: h.hotelName,
                            data: { hotelName: h.hotelName, city: h.city, rating: h.rating },
                        })),
                    );
                }
            })
            .catch((error) => console.error("Failed to load voucher selectors:", error))
            .finally(() => setLoadingSelectors(false));
    }, []);

    const summary = voucherSummary(voucher);
    const approved = ["Confirmed", "Completed"].includes(booking.overallStatus || "");
    const statusLabel = booking.overallStatus === "Confirmed" ? "Approved" : booking.overallStatus || "Pending";

    const setField = <K extends keyof UmrahVoucherData>(key: K, value: UmrahVoucherData[K]) =>
        setVoucher(v => ({ ...v, [key]: value }));
    const updatePassenger = (i: number, patch: Partial<VoucherPassengerRow>) =>
        setVoucher(v => ({ ...v, passengers: patchRow(v.passengers, i, patch) }));
    const updateHotel = (i: number, patch: Partial<VoucherHotelRow>) =>
        setVoucher(v => ({ ...v, hotels: patchRow(v.hotels, i, patch) }));
    const updateTransport = (i: number, patch: Partial<VoucherTransportRow>) =>
        setVoucher(v => ({ ...v, transports: patchRow(v.transports, i, patch) }));
    const updateFlight = (i: number, patch: Partial<VoucherFlightRow>) =>
        setVoucher(v => ({ ...v, flights: patchRow(v.flights, i, patch) }));


    // Hotels are consecutive stays: editing one's nights / dates re-flows its neighbours, and
    // transport rows on a moved date follow (see reflowVoucherStays).
    const editStay = (i: number, edit: StayEdit) => setVoucher(v => reflowVoucherStays(v, i, edit));

    // The hotel's id / rating travel with the row (saved onto the booking), so they follow the pick.
    const selectHotel = (i: number, option: HotelOption | null) =>
        setVoucher(v => ({
            ...v,
            hotels: v.hotels.map((h, idx) => idx !== i ? h : {
                ...h,
                name: option ? option.data.hotelName || option.label : "",
                city: option ? option.data.city || h.city : h.city,
                extra: { ...h.extra, hotelId: option?.value || "", rating: Number(option?.data.rating || 0) },
            }),
        }));
    const typeHotelName = (i: number, name: string) =>
        setVoucher(v => ({
            ...v,
            hotels: v.hotels.map((h, idx) => idx !== i ? h : { ...h, name, extra: { ...h.extra, hotelId: "", rating: 0 } }),
        }));

    // A group ticket drives the flights, plus the PNR / group number printed against every mutamer.
    const selectGroupTicket = (groupId: string) => {
        const group = groupTicketOptions.find(g => g._id === groupId);
        if (!group) { setField("groupTicketId", ""); return; }
        setVoucher(v => ({
            ...v,
            groupTicketId: group._id,
            flights: group.flights.map(f => ({ ...f })),
            passengers: v.passengers.map(p => ({ ...p, groupNo: group.groupNo, pnr: group.pnr })),
        }));
    };

    const rebuildTransport = () => {
        if (voucher.transports.length && !window.confirm("Replace the current transport rows with ones rebuilt from the package routes and the hotel dates above?")) return;
        const rows = rebuildVoucherTransports(packageData, voucher.hotels);
        if (!rows.length) { toast.info("This package has no transport routes to rebuild from"); return; }
        setField("transports", rows);
    };

    const handleSave = async () => {
        if (!voucher.voucherNo.trim()) { toast.error("Voucher number is required"); return; }
        if (!voucher.voucherDate) { toast.error("Voucher date is required"); return; }
        setSaving(true);
        try { await onSave(voucher); }
        catch { /* the caller already showed the error toast */ }
        finally { setSaving(false); }
    };

    const handlePrintPreview = async () => {
        setPrinting(true);
        try { await printUmrahVoucher(booking, voucher); }
        catch { toast.error("Failed to print voucher"); }
        finally { setPrinting(false); }
    };

    const delButton = (onClick: () => void) => (
        <button type="button" className="uv-del" onClick={onClick} title="Remove row">
            <TrashIcon style={{ width: 12, height: 12, color: "#DC2626" }} />
        </button>
    );

    return (
        <>
            <style>{VOUCHER_CSS}</style>
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999998, backdropFilter: "blur(2px)" }} />
            <div style={{
                position: "fixed", top: "10px", bottom: "10px", left: "50%", transform: "translateX(-50%)",
                width: "96%", maxWidth: "1180px", background: "white", borderRadius: "16px", zIndex: 9999999,
                boxShadow: "0 24px 48px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
                <div style={{ padding: "12px 20px", background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div>
                        <h3 style={{ margin: 0, color: "white", fontSize: "1.05rem", fontWeight: 700 }}>
                            {isEdit ? "Edit Voucher" : "Create Voucher"} • #{booking.bookingNumber}
                        </h3>
                        <div style={{ marginTop: "3px", fontSize: "0.74rem", color: "rgba(255,255,255,0.85)" }}>
                            Saving also updates this booking's group ticket, flights, hotels and transport to match. Pricing is not changed.
                        </div>
                    </div>
                    <button onClick={onClose} disabled={saving} style={{ border: "none", background: "rgba(255,255,255,0.15)", borderRadius: "8px", padding: "7px", cursor: "pointer", display: "flex" }}>
                        <XMarkIcon style={{ width: 18, height: 18, color: "white" }} />
                    </button>
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 20px" }}>
                    <div className="uv">
                        <header className="uv-header">
                            <div>
                                <div className="uv-brand">{booking.user?.companyName || booking.user?.name || "—"}</div>
                                <div className="uv-line"><span>Voucher Date:</span>
                                    <input type="date" className="uv-in uv-box" style={{ width: "150px" }} value={voucher.voucherDate} onChange={e => setField("voucherDate", e.target.value)} />
                                </div>
                                <div className="uv-line"><span>Package:</span>
                                    <input className="uv-in uv-box" style={{ flex: 1, minWidth: "180px" }} value={voucher.packageName} onChange={e => setField("packageName", e.target.value)} />
                                    <input type="number" min="0" className="uv-in uv-box" style={{ width: "64px" }} value={voucher.days ?? ""} placeholder="Days"
                                        onChange={e => setField("days", e.target.value === "" ? null : Number(e.target.value))} />
                                    <b>Days</b>
                                </div>
                                <div className="uv-line"><span>PAX:</span>
                                    <b>{summary.total}</b> (A:{summary.adults}, C:{summary.children}, I:{summary.infants}), Beds={summary.beds}
                                </div>
                            </div>
                            <div className="uv-agency">
                                <div className={`uv-status ${approved ? "uv-approved" : "uv-pending"}`}>{statusLabel}</div>
                                <div className="uv-note">Follows the booking's overall status</div>
                            </div>
                        </header>

                        <h1>HOTEL VOUCHER</h1>
                        <div className="uv-ref">
                            <label><span>Family Head:</span>
                                <input className="uv-in uv-box" value={voucher.familyHead} onChange={e => setField("familyHead", e.target.value)} />
                            </label>
                            <label><span>Voucher #</span>
                                <input className="uv-in uv-box" style={{ textAlign: "center", fontWeight: 700 }} value={voucher.voucherNo} onChange={e => setField("voucherNo", e.target.value)} />
                            </label>
                            <label><span>Manual No:</span>
                                <input className="uv-in uv-box" value={voucher.manualNumber} onChange={e => setField("manualNumber", e.target.value)} />
                            </label>
                        </div>

                        <section className="uv-section uv-scroll">
                            <table className="uv-table">
                                <colgroup>{[4, 12, 27, 5, 9, 6, 13, 14, 12].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                <thead>
                                    <tr><th className="uv-bar" colSpan={9}>Mutamers</th></tr>
                                    <tr>{["SNO", "Passport", "Mutamer Name", "G", "PAX", "Bed", "Group No", "Visa #", "PNR"].map(h => <th key={h}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {voucher.passengers.map((p, i) => (
                                        <tr key={i}>
                                            <td>{i + 1}</td>
                                            <td><input className="uv-in" value={p.passport} onChange={e => updatePassenger(i, { passport: e.target.value })} /></td>
                                            <td><input className="uv-in uv-left" value={p.name} onChange={e => updatePassenger(i, { name: e.target.value })} /></td>
                                            <td>
                                                <select className="uv-in" value={p.gender} onChange={e => updatePassenger(i, { gender: e.target.value })}>
                                                    <option value="">—</option><option value="M">M</option><option value="F">F</option>
                                                </select>
                                            </td>
                                            <td>
                                                <select className="uv-in" value={p.type} onChange={e => updatePassenger(i, { type: e.target.value })}>
                                                    {!["Adult", "Child", "Infant"].includes(p.type) && <option value={p.type}>{p.type || "—"}</option>}
                                                    <option value="Adult">Adult</option><option value="Child">Child</option><option value="Infant">Infant</option>
                                                </select>
                                            </td>
                                            <td>
                                                <select className="uv-in" value={p.bed ? "Yes" : "No"} onChange={e => updatePassenger(i, { bed: e.target.value === "Yes" })}>
                                                    <option value="Yes">Yes</option><option value="No">No</option>
                                                </select>
                                            </td>
                                            <td><input className="uv-in" value={p.groupNo} onChange={e => updatePassenger(i, { groupNo: e.target.value })} /></td>
                                            <td><input className="uv-in" value={p.visaNumber} onChange={e => updatePassenger(i, { visaNumber: e.target.value })} /></td>
                                            <td><input className="uv-in" value={p.pnr} onChange={e => updatePassenger(i, { pnr: e.target.value })} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <section className="uv-section">
                            <div className="uv-scroll">
                                <table className="uv-table">
                                    <colgroup>{[9, 25, 8, 6, 9, 12, 12, 12, 5, 4].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                    <thead>
                                        <tr><th className="uv-bar" colSpan={10}>Accommodation</th></tr>
                                        <tr>{["City", "Hotel Name", "View", "Meal", "Conf #", "Room Type", "Checkin", "Checkout", "Night", ""].map((h, i) => <th key={i}>{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {voucher.hotels.length === 0 && <tr><td className="uv-empty" colSpan={10}>No accommodation added yet.</td></tr>}
                                        {voucher.hotels.map((h, i) => (
                                            <tr key={i}>
                                                <td><input className="uv-in" value={h.city} onChange={e => updateHotel(i, { city: e.target.value })} /></td>
                                                <td>
                                                    <CreatableSelect<HotelOption, false>
                                                        options={hotelOptions}
                                                        value={h.name ? { value: h.name, label: h.name, data: { hotelName: h.name } } : null}
                                                        onChange={option => selectHotel(i, option)}
                                                        onCreateOption={name => typeHotelName(i, name)}
                                                        placeholder={loadingSelectors ? "Loading hotels..." : "Select hotel"}
                                                        isClearable isSearchable isLoading={loadingSelectors}
                                                        styles={compactSelectStyles}
                                                        menuPortalTarget={document.body}
                                                        menuPosition="fixed"
                                                    />
                                                </td>
                                                <td><input className="uv-in" value={h.view} onChange={e => updateHotel(i, { view: e.target.value })} /></td>
                                                <td><input className="uv-in" value={h.meal} onChange={e => updateHotel(i, { meal: e.target.value })} /></td>
                                                <td><input className="uv-in" value={h.confirmationNumber} onChange={e => updateHotel(i, { confirmationNumber: e.target.value })} /></td>
                                                <td><input className="uv-in" value={h.roomType} onChange={e => updateHotel(i, { roomType: e.target.value })} /></td>
                                                <td><input type="date" className="uv-in" value={h.checkIn} onChange={e => editStay(i, { field: "checkIn", value: e.target.value })} /></td>
                                                <td><input type="date" className="uv-in" value={h.checkOut} onChange={e => editStay(i, { field: "checkOut", value: e.target.value })} /></td>
                                                <td><NightsInput value={hotelRowNights(h)} onCommit={nights => editStay(i, { field: "nights", value: nights })} /></td>
                                                <td>{delButton(() => setVoucher(v => ({ ...v, hotels: dropRow(v.hotels, i) })))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="uv-tools" style={{ marginTop: "6px" }}>
                                <button type="button" className="uv-btn" onClick={() => setVoucher(v => ({
                                    ...v, hotels: [...v.hotels, { city: "", name: "", view: "", meal: "", confirmationNumber: "", roomType: v.hotels[0]?.roomType || "", checkIn: v.hotels[v.hotels.length - 1]?.checkOut || "", checkOut: "", nights: null }],
                                }))}><PlusIcon style={{ width: 12, height: 12 }} /> Add Hotel</button>
                                <div className="uv-nights">Total Nights: {summary.totalNights ?? "—"}</div>
                            </div>
                        </section>

                        <section className="uv-section">
                            <div className="uv-scroll">
                                <table className="uv-table">
                                    <colgroup>{[14, 22, 20, 38, 6].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                    <thead>
                                        <tr><th className="uv-bar" colSpan={5}>Transport / Services</th></tr>
                                        <tr>{["Travel Date", "Transporter", "Type", "Description", ""].map((h, i) => <th key={i}>{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {voucher.transports.length === 0 && <tr><td className="uv-empty" colSpan={5}>No transport added yet.</td></tr>}
                                        {voucher.transports.map((t, i) => (
                                            <tr key={i}>
                                                <td><input type="date" className="uv-in" value={t.travelDate} onChange={e => updateTransport(i, { travelDate: e.target.value })} /></td>
                                                <td><input className="uv-in" value={t.transporter} onChange={e => updateTransport(i, { transporter: e.target.value })} /></td>
                                                <td><input className="uv-in" list="uv-transport-types" value={t.transportType} onChange={e => updateTransport(i, { transportType: e.target.value })} /></td>
                                                <td><input className="uv-in uv-left" value={t.description} onChange={e => updateTransport(i, { description: e.target.value })} /></td>
                                                <td>{delButton(() => setVoucher(v => ({ ...v, transports: dropRow(v.transports, i) })))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <datalist id="uv-transport-types">{TRANSPORT_TYPES.map(t => <option key={t} value={t} />)}</datalist>
                            </div>
                            <div className="uv-tools" style={{ marginTop: "6px" }}>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <button type="button" className="uv-btn" onClick={() => setVoucher(v => ({
                                        ...v, transports: [...v.transports, { travelDate: "", transporter: v.transports[0]?.transporter || "", transportType: v.transports[0]?.transportType || "", description: "" }],
                                    }))}><PlusIcon style={{ width: 12, height: 12 }} /> Add Transport</button>
                                    <button type="button" className="uv-btn" onClick={rebuildTransport} disabled={!packageData}>
                                        <ArrowPathIcon style={{ width: 12, height: 12 }} /> Rebuild from package routes &amp; hotel dates
                                    </button>
                                </div>
                                <span className="uv-note">Rows dated on a hotel date you change move with it; edit any other row here or rebuild.</span>
                            </div>
                        </section>

                        <section className="uv-section">
                            <div className="uv-card">
                                <div className="uv-tools" style={{ marginBottom: 0 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 420px" }}>
                                        <b style={{ whiteSpace: "nowrap", color: "#1d4ed8" }}>Umrah Group Ticket</b>
                                        <select className="uv-in uv-box" value={voucher.groupTicketId} disabled={loadingSelectors}
                                            onChange={e => selectGroupTicket(e.target.value)}>
                                            <option value="">{loadingSelectors ? "Loading groups..." : "Select a group ticket to replace flights"}</option>
                                            {voucher.groupTicketId && !groupTicketOptions.some(g => g._id === voucher.groupTicketId) && (
                                                <option value={voucher.groupTicketId} disabled>Current group ticket</option>
                                            )}
                                            {groupTicketOptions.map(g => <option key={g._id} value={g._id}>{g.label}</option>)}
                                        </select>
                                    </label>
                                    <span className="uv-note">Picking one replaces the flights below and the PNR / Group No of every mutamer, and becomes this booking's group ticket.</span>
                                </div>
                            </div>
                            <div className="uv-scroll">
                                <table className="uv-table">
                                    <colgroup>{[14, 12, 12, 18, 12, 18, 10, 4].map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}</colgroup>
                                    <thead>
                                        <tr><th className="uv-bar" colSpan={8}>Flights</th></tr>
                                        <tr>{["Flight", "From", "To", "Dep Date", "Dep Time", "Arr Date", "Arr Time", ""].map((h, i) => <th key={i}>{h}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {voucher.flights.length === 0 && <tr><td className="uv-empty" colSpan={8}>No flights added yet.</td></tr>}
                                        {voucher.flights.map((f, i) => (
                                            <tr key={i}>
                                                <td><input className="uv-in" value={f.flightNo} onChange={e => updateFlight(i, { flightNo: e.target.value })} /></td>
                                                <td><input className="uv-in" value={f.sectorFrom} onChange={e => updateFlight(i, { sectorFrom: e.target.value })} /></td>
                                                <td><input className="uv-in" value={f.sectorTo} onChange={e => updateFlight(i, { sectorTo: e.target.value })} /></td>
                                                <td><input type="date" className="uv-in" value={f.depDate} onChange={e => updateFlight(i, { depDate: e.target.value })} /></td>
                                                <td><TimeInput24 value={f.depTime} onChange={depTime => updateFlight(i, { depTime })} /></td>
                                                <td><input type="date" className="uv-in" value={f.arrDate} onChange={e => updateFlight(i, { arrDate: e.target.value })} /></td>
                                                <td><TimeInput24 value={f.arrTime} onChange={arrTime => updateFlight(i, { arrTime })} /></td>
                                                <td>{delButton(() => setVoucher(v => ({ ...v, flights: dropRow(v.flights, i) })))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="uv-tools" style={{ marginTop: "6px" }}>
                                <button type="button" className="uv-btn" onClick={() => setVoucher(v => ({
                                    ...v, flights: [...v.flights, { airline: "", flightNo: "", sectorFrom: "", sectorTo: "", depDate: "", depTime: "", arrDate: "", arrTime: "" }],
                                }))}><PlusIcon style={{ width: 12, height: 12 }} /> Add Flight</button>
                                <span className="uv-note">The printed voucher lists these as Departure and Arrival automatically (legs leaving Saudi Arabia go under Arrival).</span>
                            </div>
                        </section>

                        <section className="uv-section">
                            <b style={{ color: "#153e68" }}>Special Instructions</b>
                            <textarea className="uv-in uv-box uv-left" rows={3} style={{ marginTop: "4px", resize: "vertical" }}
                                value={voucher.specialInstructions} onChange={e => setField("specialInstructions", e.target.value)} />
                            <div className="uv-note" style={{ marginTop: "6px" }}>The contacts directory is added to the printed voucher automatically.</div>
                        </section>
                    </div>
                </div>

                <div style={{ padding: "12px 20px", borderTop: "1px solid #E2E8F0", display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button type="button" onClick={handlePrintPreview} disabled={saving || printing}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", borderRadius: "9px", border: "1px solid #A7F3D0", background: "#ECFDF5", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "#047857", marginRight: "auto" }}>
                        <PrinterIcon style={{ width: 14, height: 14 }} /> {printing ? "Printing..." : "Print Preview"}
                    </button>
                    <button type="button" onClick={onClose} disabled={saving}
                        style={{ padding: "10px 18px", borderRadius: "9px", border: "1px solid #E2E8F0", background: "white", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>Cancel</button>
                    <button type="button" onClick={handleSave} disabled={saving}
                        style={{ padding: "10px 22px", borderRadius: "9px", border: "none", background: "#0F766E", color: "white", cursor: saving ? "not-allowed" : "pointer", fontSize: "0.82rem", fontWeight: 700, opacity: saving ? 0.7 : 1 }}>
                        {saving ? "Saving..." : isEdit ? "Save Voucher" : "Create Voucher"}
                    </button>
                </div>
            </div>
        </>
    );
}
