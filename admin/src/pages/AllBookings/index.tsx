import { useState, useEffect, memo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { format } from "date-fns"
import axiosInstance from '../../Api/axios'
import MaskedDatePicker from '../../components/maskedDatePicker'
import { toast } from 'react-toastify'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline'
import { printGDSBooking } from '../../utils/bookingPDFService'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../utils/permissions'
import dayjs from 'dayjs'
import Select, { type StylesConfig } from 'react-select'

// Match the brand gradient used across the customer-facing app (frontend/src/theme/theme.js)
const BRAND_GRADIENT = 'linear-gradient(to right, #09B0FF, #0064BC)'

interface Booking {
    _id: string
    bookingReference: string
    contactPersonName: string
    sector: string
    airline?: { id?: string; name: string; logoUrl?: string }
    passengers: { _id: string, type: string; title: string; givenName: string, surName: string, passportNumber: string, dateOfBirth: string, passportExpiry: string, nationality: string, discount?: number }[]
    userId?: string | {
        _id: string;
        name: string;
        email: string;
        companyName: string; // Remove the '?'
        agencyCode?: string
    }
    adultsCount: number
    childrenCount: number
    infantsCount: number
    totalPassengers: number
    confirmedAdults?: number
    confirmedChildren?: number
    confirmedInfants?: number
    departureDate: string
    createdAt: string
    pnr?: string
    pricing: { grandTotal: number }
    status: string,
    passengersLocked?: boolean
    expiresAt: string | null
    cancelledAt?: string | null
    autoCancelled?: boolean
    sabaoonTransactionId?: number | null
    sabaoonBookingStatus?: 'pending' | 'success' | 'failed' | 'not_applicable' | null
    source?: 'admin' | 'al-haider' | 'travel-network' | "mct" | string
    groupTicketData?: {
        buyingAdultPrice: number
        buyingChildPrice: number
        buyingInfantPrice: number
        sellingAdultPriceB2B: number
        sellingChildPriceB2B: number
        sellingInfantPriceB2B: number
    }
}

// const getSourceBadge = (source?: string) => {
//     if (source === "travel-network") {
//         return {
//             label: "Travel Network",
//             className: "border-sky-200 bg-sky-50 text-sky-700",
//         };
//     }
//     if (source === "al-haider") {
//         return {
//             label: "Al-Haider",
//             className: "border-violet-200 bg-violet-50 text-violet-700",
//         };
//     }
//     if (source === "skypass") {
//         return {
//             label: "SkyPass",
//             className: "border-violet-200 bg-violet-50 text-violet-700",
//         };
//     }
//     if (source === "upsky") {
//         return {
//             label: "UpSky",
//             className: "border-amber-200 bg-amber-50 text-amber-700",
//         };
//     }
//     if (source === "mct") {
//         return {
//             label: "MCT",
//             className: "border-violet-200 bg-violet-50 text-violet-700",
//         };
//     }
//     if (source === "ALSABOOR") {
//         return {
//             label: "ALSABOOR",
//             className: "border-violet-200 bg-violet-50 text-violet-700",
//         };
//     }
//     if (source === "amaar-shoaib") {
//         return {
//             label: "amaar-shoaib",
//             className: "border-red-200 bg-red-50 text-red-700",
//         };
//     }
//     return {
//         label: "Own",
//         className: "border-slate-200 bg-slate-50 text-slate-600",
//     };
// };

interface StatusOption {
    value: string
    label: string
    color: string
}

interface FilterOption {
    value: string
    label: string
}

interface BookingStatusCounts {
    'on hold': number
    'partially confirmed': number
    confirmed: number
    cancelled: number
}

const EMPTY_BOOKING_STATUS_COUNTS: BookingStatusCounts = {
    'on hold': 0,
    'partially confirmed': 0,
    confirmed: 0,
    cancelled: 0,
}

const filterSelectStyles: StylesConfig<FilterOption, false> = {
    control: (base, state) => ({
        ...base,
        minHeight: '40px',
        borderRadius: '0px',
        borderColor: state.isFocused ? '#0ea5e9' : '#cbd5e1',
        backgroundColor: '#ffffff',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(14, 165, 233, 0.12)' : 'none',
        cursor: 'pointer',
        transition: 'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
        '&:hover': {
            borderColor: '#38bdf8',
            backgroundColor: '#ffffff',
        },
    }),
    valueContainer: (base) => ({
        ...base,
        padding: '0 12px',
    }),
    singleValue: (base) => ({
        ...base,
        color: '#334155',
        fontSize: '0.875rem',
        fontWeight: 500,
    }),
    input: (base) => ({
        ...base,
        color: '#334155',
        fontSize: '0.875rem',
    }),
    indicatorSeparator: () => ({
        display: 'none',
    }),
    dropdownIndicator: (base, state) => ({
        ...base,
        color: state.isFocused ? '#0284c7' : '#64748b',
        padding: '8px 10px',
        transition: 'transform 150ms ease, color 150ms ease',
        transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : undefined,
        '&:hover': {
            color: '#0284c7',
        },
    }),
    menu: (base) => ({
        ...base,
        zIndex: 30,
        marginTop: '6px',
        padding: '4px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        borderRadius: '0px',
        boxShadow: '0 14px 30px -10px rgba(15, 23, 42, 0.28)',
    }),
    menuList: (base) => ({
        ...base,
        padding: 0,
    }),
    option: (base, state) => ({
        ...base,
        borderRadius: '0px',
        background: state.isSelected
            ? BRAND_GRADIENT
            : state.isFocused
                ? '#e0f2fe'
                : '#ffffff',
        color: state.isSelected ? '#ffffff' : '#334155',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: state.isSelected ? 600 : 500,
        padding: '9px 11px',
        '&:active': {
            backgroundColor: state.isSelected ? '#0284c7' : '#bae6fd',
        },
    }),
    noOptionsMessage: (base) => ({
        ...base,
        color: '#64748b',
        fontSize: '0.875rem',
    }),
}

interface BookingsTableProps {
    bookings: Booking[]
    getStatusBadge: (status: string) => StatusOption
    formatDate: (dateStr: string | undefined) => string
    navigate: (path: string) => void
    timers: { [key: string]: { hours: number; minutes: number; seconds: number; expired: boolean } }
    canSeeProfitLoss: boolean,
    canUseActions: boolean
    togglingLockId: string | null
    onTogglePassengersLock: (bookingId: string, nextLocked: boolean) => void
}

const BookingsTable = memo(({ bookings, getStatusBadge, formatDate, navigate, timers, canSeeProfitLoss, canUseActions, togglingLockId, onTogglePassengersLock }: BookingsTableProps) => {
    // const [deletingId, setDeletingId] = useState<string | null>(null);
    return (
        <table className="min-w-full border-collapse">
            <thead style={{ background: BRAND_GRADIENT }}>
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-100 tracking-wide uppercase">
                        Booking Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-100 tracking-wide uppercase">
                        <div className="flex items-center gap-1">
                            <span>Group</span>
                            <span>✈</span>
                        </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-100 tracking-wide uppercase">
                        <div className="flex items-center gap-1">
                            <span>Passengers</span>
                        </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-100 tracking-wide uppercase">
                        Price (PKR)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-100 tracking-wide uppercase">
                        <span>Status</span>
                    </th>
                    {canSeeProfitLoss &&
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-100 tracking-wide uppercase">
                            Profit / Loss
                        </th>
                    }
                    {/* <th className="px-4 py-3 text-center text-xs font-semibold text-slate-100 tracking-wide uppercase">
                        <span>Source</span>
                    </th> */}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-100 tracking-wide uppercase">
                        Action
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white">
                {bookings.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm border">
                            No bookings found
                        </td>
                    </tr>
                ) : (
                    bookings.map((booking: Booking) => {
                        const statusBadge = getStatusBadge(booking.status)
                        const userId = typeof booking.userId === 'object' ? booking.userId : null
                        const firstPassenger = booking.passengers?.[0]
                        // const sourceBadge = getSourceBadge(booking.source)
                        return (
                            <tr key={booking._id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                {/* Booking Details */}
                                <td className="px-4 py-4 align-top border-r border-slate-200">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block text-white px-3 py-1.5 text-xs font-semibold"
                                                style={{ background: BRAND_GRADIENT, borderRadius: '4px' }}
                                            >
                                                Airline PNR #: {booking.pnr || 'N/A'}
                                            </span>
                                            {/* <span className={`inline-block px-2 py-1 text-[10px] font-bold ${sourceBadge.className}`}>
                                                {sourceBadge.label}
                                            </span> */}
                                        </div>
                                        <div className="text-xs text-slate-600 leading-relaxed">
                                            <span className="font-semibold text-slate-700">Agency:</span> {userId?.companyName || 'N/A'}
                                        </div>
                                        <div className="text-xs text-slate-600 leading-relaxed">
                                            <span className="font-semibold text-slate-700">BK#: {booking.bookingReference}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 pt-0.5">
                                            Created: {dayjs(booking.createdAt).format('DD MMM YYYY, hh:mm A')}
                                        </div>
                                    </div>
                                </td>

                                {/* Group */}
                                <td className="px-4 py-4 align-top border-r border-slate-200">
                                    <div className="space-y-1.5">
                                        <div className="font-semibold text-sm text-slate-800">
                                            {booking.airline?.name || 'N/A'}
                                        </div>
                                        <div className="text-xs text-slate-600 font-medium">
                                            {booking.sector}
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            {formatDate(booking.departureDate)}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium pt-0.5">
                                            <div className="text-xs text-slate-500 font-medium pt-0.5">
                                                {firstPassenger
                                                    ? `${firstPassenger.givenName} ${firstPassenger.surName}`
                                                    : 'N/A'}{' '}
                                                X {booking.totalPassengers || 0}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Passengers */}
                                <td className="px-4 py-4 align-top border-r border-slate-200">
                                    <div className="inline-block w-full">
                                        <table className="w-full text-xs border border-slate-300">
                                            <thead className="bg-slate-100 text-slate-600">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold border-r border-slate-300">
                                                        Status
                                                    </th>
                                                    <th className="px-3 py-2 text-center font-semibold border-r border-slate-300">
                                                        Adults
                                                    </th>
                                                    <th className="px-3 py-2 text-center font-semibold border-r border-slate-300">
                                                        Child
                                                    </th>
                                                    <th className="px-3 py-2 text-center font-semibold border-r border-slate-300">
                                                        Infants
                                                    </th>
                                                    <th className="px-3 py-2 text-center font-semibold">
                                                        Seats
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {[
                                                    { key: 'on hold', label: 'Requested', match: ['on hold', 'pending', 'partially confirmed', 'cancelled'] },
                                                    { key: 'confirmed', label: 'Confirmed', match: ['confirmed'] },
                                                ].map(({ key, label, match }) => {
                                                    const active = match.includes(booking.status)

                                                    const adults = active ? booking.adultsCount || 0 : 0
                                                    const children = active ? booking.childrenCount || 0 : 0
                                                    const infants = active ? booking.infantsCount || 0 : 0
                                                    const seats = adults + children

                                                    return (
                                                        <tr key={key}>
                                                            <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50 border-r border-slate-200">
                                                                {label}
                                                            </td>

                                                            <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-200">
                                                                {adults}
                                                            </td>

                                                            <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-200">
                                                                {children}
                                                            </td>

                                                            <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-200">
                                                                {infants}
                                                            </td>

                                                            <td className="px-3 py-2 text-center font-bold text-slate-800">
                                                                {seats}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </td>

                                {/* Price */}
                                <td className={`px-4 py-4 ${(booking.status === 'on hold' || booking.status === 'pending') ? "align-bottom" : "align-middle"} text-center border-r border-slate-200`}>
                                    {(() => {
                                        const totalDiscount = booking.passengers?.reduce((sum, p) => sum + (Number(p.discount) || 0), 0) || 0;
                                        const adjustedTotal = (booking.pricing?.grandTotal || 0) - totalDiscount;
                                        return (
                                            <div className="font-semibold text-base text-slate-800">
                                                {(booking.status === 'on hold' || booking.status === 'pending') ? (
                                                    <div className="text-xs text-amber-800 font-semibold bg-amber-50 px-2.5 py-1.5 border border-amber-300">
                                                        Admin Review<br />Required
                                                    </div>
                                                ) : (
                                                    <>
                                                        PKR {adjustedTotal.toLocaleString()}
                                                        {/* {totalDiscount > 0 && (
                                                            <div className="text-xs text-rose-600 font-normal mt-0.5">
                                                                -{totalDiscount.toLocaleString()} disc
                                                            </div>
                                                        )} */}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </td>

                                {/* Status */}
                                <td className="px-2 py-4 align-top border-r border-slate-200">
                                    <div className="flex flex-col gap-2 items-center">
                                        {booking.status === 'cancelled' && booking.autoCancelled && booking.cancelledAt ? (
                                            <span className="inline-block px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-800 border border-rose-300 text-center leading-relaxed">
                                                Auto-cancelled on<br />
                                                {dayjs(booking.cancelledAt).format('DD MMM YYYY, hh:mm A')}
                                            </span>
                                        ) : (
                                            <span className={`inline-block px-3 py-1.5 text-xs font-medium ${statusBadge.color}`}>
                                                {statusBadge.label}
                                            </span>
                                        )}
                                        {(booking.status === 'on hold' || booking.status === 'pending' || booking.status === 'partially confirmed') && (
                                            <div className="pt-1.5 flex flex-col items-center gap-1">
                                                <div className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">
                                                    Booking Expiry
                                                </div>
                                                {timers[booking._id] && timers[booking._id].expired ? (
                                                    <span className="text-xs font-semibold text-rose-700">EXPIRED</span>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        {[
                                                            { label: 'HRS', value: timers[booking._id]?.hours || 0 },
                                                            { label: 'MIN', value: timers[booking._id]?.minutes || 0 },
                                                            { label: 'SEC', value: timers[booking._id]?.seconds || 0 },
                                                        ].map(({ label, value }, idx) => (
                                                            <div key={label} className="flex items-center gap-1">
                                                                <div className="flex flex-col items-center">
                                                                    <div className="flex gap-0.5">
                                                                        {String(value).padStart(2, '0').split('').map((digit, di) => (
                                                                            <div
                                                                                key={di}
                                                                                className="bg-[#334155] text-white flex items-center justify-center rounded-sm"
                                                                                style={{ width: 22, height: 30, fontSize: 15 }}
                                                                            >
                                                                                {digit}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="text-[9px] font-semibold text-slate-500 mt-1 uppercase">
                                                                        {label}
                                                                    </div>
                                                                </div>
                                                                {idx < 2 && <span className="text-slate-500 text-xl font-bold pb-3.5">:</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>


                                {/* Profit / Loss */}
                                {canSeeProfitLoss &&
                                    <td className="px-2 align-middle text-center border-r border-slate-200">
                                        {(() => {
                                            const gt = booking.groupTicketData;

                                            if (!gt) {
                                                return <span className="text-xs text-slate-400">N/A</span>;
                                            }

                                            const adultBuy = gt.buyingAdultPrice || 0;
                                            const childBuy = gt.buyingChildPrice || 0;
                                            const infantBuy = gt.buyingInfantPrice || 0;

                                            const adultSell = gt.sellingAdultPriceB2B || 0;
                                            const childSell = gt.sellingChildPriceB2B || 0;
                                            const infantSell = gt.sellingInfantPriceB2B || 0;

                                            const adults = booking.adultsCount || 0;
                                            const children = booking.childrenCount || 0;
                                            const infants = booking.infantsCount || 0;

                                            const totalBuy =
                                                adultBuy * adults +
                                                childBuy * children +
                                                infantBuy * infants;

                                            const totalSellBeforeDiscount =
                                                adultSell * adults +
                                                childSell * children +
                                                infantSell * infants;

                                            // const totalDiscount =
                                            //     booking.passengers?.reduce((sum, passenger) => {
                                            //         return sum + (Number(passenger.discount) || 0);
                                            //     }, 0) || 0;

                                            const totalSell = totalSellBeforeDiscount;

                                            const profitLoss = totalSell - totalBuy;
                                            const isLoss = profitLoss < 0;

                                            return (
                                                <div className="inline-block min-w-42.5 border border-slate-300 bg-white">
                                                    <table className="w-full text-[11px] border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-100">
                                                                <th className="px-2 py-1.5 text-center font-bold text-amber-700 border-r border-slate-200">
                                                                    BUY
                                                                </th>
                                                                <th className="px-2 py-1.5 text-center font-bold text-emerald-700 border-r border-slate-200">
                                                                    SELL
                                                                </th>
                                                                <th className="px-2 py-1.5 text-center font-bold text-slate-700">
                                                                    P/L
                                                                </th>
                                                            </tr>
                                                        </thead>

                                                        <tbody>
                                                            <tr>
                                                                <td className="px-2 py-1.5 text-center font-semibold text-slate-600 border-r border-slate-200">
                                                                    {totalBuy.toLocaleString()}
                                                                </td>

                                                                <td className="px-2 py-1.5 text-center font-semibold text-slate-600 border-r border-slate-200">
                                                                    {totalSell.toLocaleString()}
                                                                </td>

                                                                <td
                                                                    className={`px-2 py-1.5 text-center font-bold ${isLoss ? "text-rose-700" : "text-emerald-700"
                                                                        }`}
                                                                >
                                                                    {isLoss ? "-" : ""}
                                                                    {Math.abs(profitLoss).toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                }

                                {/* <td className="px-3 py-4 align-top text-center border-r border-slate-200">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`inline-block px-2 py-1 text-[10px] font-bold ${sourceBadge.className}`}>
                                            {sourceBadge.label}
                                        </span>
                                        {booking.sabaoonTransactionId && (
                                            <span className="text-[10px] text-slate-500">Txn #{booking.sabaoonTransactionId}</span>
                                        )}
                                    </div>
                                </td> */}

                                {/* Action */}
                                <td className="py-4 align-middle text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        {/* First row: 3 buttons */}
                                        <div className="flex flex-row justify-center items-center gap-2 w-full">
                                            {/* View Details - Available for all bookings */}
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/booking-detail/${booking._id}`,
                                                    )
                                                }
                                                className="p-2.5 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors"
                                                title="View Details"
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
                                            </button>
                                            {/* Edit and Delete only for on hold/pending */}
                                            {(booking.status === "on hold" ||
                                                booking.status === "pending") && (
                                                    <>
                                                        {/* <button
                                                            onClick={() =>
                                                                navigate(
                                                                    `/dashboard/edit-booking/${booking._id}`,
                                                                )
                                                            }
                                                            className="p-2.5 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors"
                                                            title="Edit Booking"
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
                                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                />
                                                            </svg>
                                                        </button> */}
                                                        {/* <button
                                                            onClick={async () => {
                                                                if (!canUseActions) {
                                                                    toast.error("You don't have permission to manage bookings");
                                                                    return;
                                                                }

                                                                const confirmDelete = window.confirm(
                                                                    "Are you sure you want to delete this booking? This action cannot be undone.",
                                                                );
                                                                if (!confirmDelete) return;

                                                                try {
                                                                    setDeletingId(booking._id);

                                                                    await axiosInstance.delete(
                                                                        `/bookings/${booking._id}`,
                                                                    );

                                                                    toast.success(
                                                                        "Booking deleted successfully",
                                                                    );
                                                                    setBookings((prev: Booking[]) =>
                                                                        prev.filter(
                                                                            (b: Booking) => b._id !== booking._id,
                                                                        ),
                                                                    );
                                                                } catch (err: unknown) {
                                                                    toast.error(
                                                                        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
                                                                        "Failed to delete booking",
                                                                    );
                                                                } finally {
                                                                    setDeletingId(null);
                                                                }
                                                            }}
                                                            disabled={deletingId === booking._id || !canUseActions}
                                                            className="p-2.5 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title={canUseActions ? "Delete Booking" : "You don't have permission to manage bookings"}
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
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button> */}
                                                    </>
                                                )}
                                        </div>
                                        {/* Second row: 2 buttons (Print, Download PDF) */}
                                        {(booking.status === "on hold" ||
                                            booking.status === "pending" ||
                                            booking.status === "partially confirmed" ||
                                            booking.status === "confirmed") && (
                                                <div className="flex flex-row justify-center items-center gap-2 w-full mt-2">
                                                    {/* 1. ORIGINAL FULL PDF DOWNLOAD */}
                                                    {/* <button
                                                        onClick={() => {
                                                            generateBookingPDF(booking).catch((err) => {
                                                                console.error("Error generating PDF:", err);
                                                                toast.error("Failed to generate PDF");
                                                            });
                                                        }}
                                                        className="p-2.5 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors"
                                                        title="Download Full Ticket"
                                                    >

                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </button> */}

                                                    {/* <button
                                                        onClick={() => {
                                                            generateClientPDF(booking).catch((err) => {
                                                                console.error("Error generating Client PDF:", err);
                                                                toast.error("Failed to generate Client PDF");
                                                            });
                                                        }}
                                                        className="flex flex-col items-center justify-center p-2.5 text-rose-700 hover:bg-rose-100 border border-rose-300 transition-colors"
                                                        title="Download Client Copy (No Agency Info)"
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
                                                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                            />
                                                        </svg>


                                                        <span className="text-[9px] font-semibold mt-1 leading-none">
                                                            PDF 2
                                                        </span>
                                                    </button> */}
                                                    {/* 3. PRINT TICKET */}
                                                    <button
                                                        onClick={() => printGDSBooking(booking)}
                                                        className="p-2.5 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                                                        title="Print Ticket"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        {/* Agent passenger-edit lock (cancelled bookings can't be edited anyway) */}
                                        {canUseActions && booking.status !== 'cancelled' && (
                                            <button
                                                onClick={() => onTogglePassengersLock(booking._id, !booking.passengersLocked)}
                                                disabled={togglingLockId === booking._id}
                                                title={booking.passengersLocked ? "Passenger edits locked — click to unlock" : "Passenger edits unlocked — click to lock"}
                                                className={`flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-md border transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${booking.passengersLocked ? 'border-red-300 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}
                                            >
                                                <span className={`relative w-6.5 h-3.75 rounded-full shrink-0 transition-colors ${booking.passengersLocked ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                                    <span className={`absolute top-0.5 w-2.75 h-2.75 rounded-full bg-white shadow transition-all ${booking.passengersLocked ? 'left-0.5' : 'left-3.25'}`} />
                                                </span>
                                                {booking.passengersLocked
                                                    ? <LockClosedIcon className="w-3 h-3 text-red-700" />
                                                    : <LockOpenIcon className="w-3 h-3 text-emerald-700" />}
                                                <span className={`text-[11px] font-bold ${booking.passengersLocked ? 'text-red-700' : 'text-emerald-700'}`}>
                                                    {booking.passengersLocked ? "Can't Edit" : "Can Edit"}
                                                </span>
                                            </button>
                                        )}
                                        {/* Cancelled bookings only have View Details (already shown above) */}
                                    </div>
                                </td>
                            </tr>
                        )
                    })
                )}
            </tbody>
        </table>
    )
})

BookingsTable.displayName = 'BookingsTable'

export default function AllBookings() {
    interface Filters {
        sector: string
        airline: string
        fromDate: Date | null
    }

    type Timer = {
        hours: number
        minutes: number
        seconds: number
        expired: boolean
    }

    const { user } = useAuth()
    const canView = hasPermission(user, "view_bookings")
    const canSeeProfitLoss = hasPermission(user, "can_see_profit_loss")
    const canUseActions = hasPermission(user, "bookings_action_buttons")
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [fetching, setFetching] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [bookingStatusCounts, setBookingStatusCounts] = useState<BookingStatusCounts>(EMPTY_BOOKING_STATUS_COUNTS)
    const [filters, setFilters] = useState<Filters>({
        sector: '',
        airline: '',
        fromDate: null,
    })

    const [uniqueSectors, setUniqueSectors] = useState<string[]>([])
    const [uniqueAirlines, setUniqueAirlines] = useState<string[]>([])
    // const [timers, setTimers] = useState<{ [key: string]: { hours: number; minutes: number; seconds: number; expired: boolean } }>({})
    const [timers, setTimers] = useState<Record<string, Timer>>({})
    const [togglingLockId, setTogglingLockId] = useState<string | null>(null)

    const handleTogglePassengersLock = async (bookingId: string, nextLocked: boolean) => {
        if (!canUseActions) { toast.error("No permission"); return }
        try {
            setTogglingLockId(bookingId)
            const res = await axiosInstance.patch(`/bookings/${bookingId}/passengers-lock`, { locked: nextLocked })
            setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, passengersLocked: res.data.data.passengersLocked } : b))
            toast.success(nextLocked ? "Passenger edits locked" : "Passenger edits unlocked")
        } catch (error) {
            toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to update lock")
        } finally {
            setTogglingLockId(null)
        }
    }


    // Get status from URL params
    const activeStatus = searchParams.get('status') || ''

    const statusOptions: StatusOption[] = [
        { value: 'on hold', label: 'On Hold', color: 'bg-amber-50 text-amber-800 border border-amber-300' },
        { value: 'pending', label: 'On Hold', color: 'bg-amber-50 text-amber-800 border border-amber-300' },
        { value: 'confirmed', label: 'Confirmed', color: 'bg-emerald-50 text-emerald-800 border border-emerald-300' },
        { value: 'partially confirmed', label: 'Partially Confirmed', color: 'bg-indigo-50 text-indigo-800 border border-indigo-300' },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-rose-50 text-rose-800 border border-rose-300' }
    ]

    const sectorFilterOptions: FilterOption[] = [
        { value: '', label: 'All Sectors' },
        ...uniqueSectors.map(sector => ({ value: sector, label: sector })),
    ]

    const airlineFilterOptions: FilterOption[] = [
        { value: '', label: 'All Airlines' },
        ...uniqueAirlines.map(airline => ({ value: airline, label: airline })),
    ]

    const formatStatusCount = (count: number) => count > 0 ? String(count).padStart(2, '0') : '0'
    const allBookingStatusCount = Object.values(bookingStatusCounts).reduce((total, count) => total + count, 0)

    const bookingStatusFilterOptions: FilterOption[] = [
        { value: '', label: `All Booking Statuses (${formatStatusCount(allBookingStatusCount)})` },
        { value: 'on hold', label: `On Hold (${formatStatusCount(bookingStatusCounts['on hold'])})` },
        { value: 'partially confirmed', label: `Partially Confirmed (${formatStatusCount(bookingStatusCounts['partially confirmed'])})` },
        { value: 'confirmed', label: `Confirmed (${formatStatusCount(bookingStatusCounts.confirmed)})` },
        { value: 'cancelled', label: `Cancelled (${formatStatusCount(bookingStatusCounts.cancelled)})` },
    ]

    // Calculate remaining time for a booking (2 hours from creation)
    // const calculateRemainingTime = (createdAt: string) => {
    //     const createdDate = new Date(createdAt)
    //     const expiryDate = new Date(createdDate.getTime() + 2 * 60 * 60 * 1000) // Add 2 hours
    //     const now = new Date()
    //     const diff = expiryDate.getTime() - now.getTime()

    //     if (diff <= 0) {
    //         return { hours: 0, minutes: 0, seconds: 0, expired: true }
    //     }

    //     const hours = Math.floor(diff / (1000 * 60 * 60))
    //     const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    //     const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    //     return { hours, minutes, seconds, expired: false }
    // }

    const calculateRemainingTime = (expiresAt: string | null) => {
        if (!expiresAt) return { hours: 0, minutes: 0, seconds: 0, expired: true }

        const diff = new Date(expiresAt).getTime() - new Date().getTime()

        if (diff <= 0) {
            return { hours: 0, minutes: 0, seconds: 0, expired: true }
        }

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        return { hours, minutes, seconds, expired: false }
    }

    useEffect(() => {
        const onHoldBookings = bookings.filter(
            b => (b.status === 'on hold' || b.status === 'pending' || b.status === 'partially confirmed') && b.expiresAt
        )

        if (onHoldBookings.length === 0) return

        const interval = setInterval(() => {
            const newTimers: Record<string, Timer> = {}
            onHoldBookings.forEach(booking => {
                newTimers[booking._id] = calculateRemainingTime(booking.expiresAt)
            })
            setTimers(newTimers)
        }, 1000)

        return () => clearInterval(interval)
    }, [bookings])


    useEffect(() => {
        if (canView) {
            fetchBookings()
        } else {
            setInitialLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, activeStatus, searchQuery, canView])

    useEffect(() => {
        // Extract unique sectors and airlines from bookings
        const sectors = [...new Set(bookings.map(b => b.sector).filter(Boolean))]
        const airlines = [...new Set(bookings.map(b => b.airline?.name).filter((name): name is string => Boolean(name)))]
        setUniqueSectors(sectors.sort())
        setUniqueAirlines(airlines.sort())
    }, [bookings])

    const fetchBookings = async () => {
        try {
            setFetching(true)
            const params = new URLSearchParams({
                limit: '1000',
                ...(activeStatus && { status: activeStatus }),
                ...(filters.sector && { sector: filters.sector }),
                ...(filters.airline && { airline: filters.airline }),
                ...(searchQuery && { search: searchQuery }),
                ...(filters.fromDate && {
                    fromDate: format(filters.fromDate, 'yyyy-MM-dd'),
                }),
            })

            const response = await axiosInstance.get(`/bookings?${params}`)

            if (response.data.success) {
                setBookings(response.data.data)
                setBookingStatusCounts(response.data.statusCounts || EMPTY_BOOKING_STATUS_COUNTS)
            }
        } catch (err) {
            console.error('Error fetching bookings:', err)
        } finally {
            setInitialLoading(false)
            setFetching(false)
        }
    }

    const handleFilterChange = <K extends keyof Filters>(
        filterName: K,
        value: Filters[K]
    ) => {
        setFilters(prev => ({ ...prev, [filterName]: value }))
    }

    const handleStatusFilterChange = (status: string) => {
        const nextSearchParams = new URLSearchParams(searchParams)

        if (status) {
            nextSearchParams.set('status', status)
        } else {
            nextSearchParams.delete('status')
        }

        setSearchParams(nextSearchParams)
    }


    const resetFilters = () => {
        setSearchQuery('')
        setFilters({
            sector: '',
            airline: '',
            fromDate: null
        })
        // Reset status by navigating without status param
        if (activeStatus) {
            navigate('/all-bookings')
        }
    }

    const getStatusBadge = (status: string): StatusOption => {
        const option = statusOptions.find(opt => opt.value === status)
        return option || statusOptions[0]
    }

    const formatDate = (dateStr: string | undefined): string => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    if (initialLoading) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-2 border-slate-300 border-t-slate-700 mx-auto"></div>
                    <p className="mt-4 text-sm text-slate-500 tracking-wide">Loading bookings...</p>
                </div>
            </div>
        )
    }

    if (!canView) {
        return (
            <div className="border border-rose-200 bg-rose-50 px-5 py-8 text-sm text-rose-700">
                You do not have permission to view Bookings.
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">All Bookings</h1>
                <p className="text-slate-500">Manage all customer flight bookings</p>
            </div>

            {/* Search and Filters in One Row */}
            <div className="mb-4 bg-white border border-slate-200 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="flex-1 min-w-50">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by reference, PNR, or customer, agent, or company name..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-500"
                        />
                    </div>

                    {/* Booking Status Filter */}
                    <div className="w-full sm:w-auto min-w-45">
                        <Select<FilterOption, false>
                            aria-label="Filter by booking status"
                            options={bookingStatusFilterOptions}
                            value={bookingStatusFilterOptions.find(option => option.value === activeStatus)}
                            onChange={(option) => handleStatusFilterChange(option?.value || '')}
                            styles={filterSelectStyles}
                            isSearchable={false}
                        />
                    </div>

                    {/* Sector Filter */}
                    <div className="w-full sm:w-auto min-w-37.5">
                        <Select<FilterOption, false>
                            aria-label="Filter by sector"
                            options={sectorFilterOptions}
                            value={sectorFilterOptions.find(option => option.value === filters.sector)}
                            onChange={(option) => handleFilterChange('sector', option?.value || '')}
                            styles={filterSelectStyles}
                            isSearchable
                            noOptionsMessage={() => 'No sectors found'}
                        />
                    </div>

                    {/* Airline Filter */}
                    <div className="w-full sm:w-auto min-w-37.5">
                        <Select<FilterOption, false>
                            aria-label="Filter by airline"
                            options={airlineFilterOptions}
                            value={airlineFilterOptions.find(option => option.value === filters.airline)}
                            onChange={(option) => handleFilterChange('airline', option?.value || '')}
                            styles={filterSelectStyles}
                            isSearchable
                            noOptionsMessage={() => 'No airlines found'}
                        />
                    </div>

                    {/* From Date */}
                    <div className="w-full sm:w-auto min-w-37.5">
                        <MaskedDatePicker
                            value={filters.fromDate}
                            onChange={(date) => handleFilterChange('fromDate', date)}
                            placeholderText="Dept Date"
                            minDate={new Date()}
                            className="rounded-none"
                        />
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 text-sm text-slate-600 font-medium border border-slate-300 hover:transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white border border-slate-200 overflow-hidden relative">
                {fetching && (
                    <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
                        <div className="animate-spin h-8 w-8 border-2 border-slate-300 border-t-slate-700"></div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <BookingsTable
                        bookings={bookings}
                        getStatusBadge={getStatusBadge}
                        formatDate={formatDate}
                        navigate={navigate}
                        timers={timers}
                        canSeeProfitLoss={canSeeProfitLoss}
                        canUseActions={canUseActions}
                        togglingLockId={togglingLockId}
                        onTogglePassengersLock={handleTogglePassengersLock}
                    />
                </div>
            </div>
        </div>
    )
}
