import { useState, useEffect, memo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { format } from "date-fns"
import axiosInstance from '../../Api/axios'
import MaskedDatePicker from '../../components/maskedDatePicker'
import { toast } from 'react-toastify'
import { printGDSBooking } from '../../utils/bookingPDFService'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../utils/permissions'
import dayjs from 'dayjs'

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

const getSourceBadge = (source?: string) => {
    if (source === "travel-network") {
        return {
            label: "Travel Network",
            className: "border-sky-200 bg-sky-50 text-sky-700",
        };
    }
    if (source === "al-haider") {
        return {
            label: "Al-Haider",
            className: "border-violet-200 bg-violet-50 text-violet-700",
        };
    }
    if (source === "skypass") {
        return {
            label: "SkyPass",
            className: "border-violet-200 bg-violet-50 text-violet-700",
        };
    }
    if (source === "upsky") {
        return {
            label: "UpSky",
            className: "border-amber-200 bg-amber-50 text-amber-700",
        };
    }
    if (source === "mct") {
        return {
            label: "MCT",
            className: "border-violet-200 bg-violet-50 text-violet-700",
        };
    }
    if (source === "ALSABOOR") {
        return {
            label: "ALSABOOR",
            className: "border-violet-200 bg-violet-50 text-violet-700",
        };
    }
    if (source === "amaar-shoaib") {
        return {
            label: "amaar-shoaib",
            className: "border-red-200 bg-red-50 text-red-700",
        };
    }
    return {
        label: "Own",
        className: "border-slate-200 bg-slate-50 text-slate-600",
    };
};

interface StatusOption {
    value: string
    label: string
    color: string
}

interface BookingsTableProps {
    bookings: Booking[]
    getStatusBadge: (status: string) => StatusOption
    formatDate: (dateStr: string | undefined) => string
    navigate: (path: string) => void
    timers: { [key: string]: { hours: number; minutes: number; seconds: number; expired: boolean } }
    setBookings: React.Dispatch<React.SetStateAction<Booking[]>>
    canUseActions: boolean
}

const BookingsTable = memo(({ bookings, getStatusBadge, formatDate, navigate, timers, setBookings, canUseActions }: BookingsTableProps) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    return (
        <table className="min-w-full border-collapse">
            <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f]">
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white">
                        Booking Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white">
                        <div className="flex items-center gap-1">
                            <span>Group</span>
                            <span>✈</span>
                        </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-white">
                        <div className="flex items-center gap-1">
                            <span>Passengers</span>
                        </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                        Price (PKR)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                        <span>Status</span>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                        Profit / Loss
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                        <span>Source</span>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white">
                        Action
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white">
                {bookings.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm border">
                            No bookings found
                        </td>
                    </tr>
                ) : (
                    bookings.map((booking: Booking) => {
                        const statusBadge = getStatusBadge(booking.status)
                        const userId = typeof booking.userId === 'object' ? booking.userId : null
                        const firstPassenger = booking.passengers?.[0]
                        const sourceBadge = getSourceBadge(booking.source)
                        return (
                            <tr key={booking._id} className="border-b border-gray-300 hover:bg-blue-50/20 transition-colors">
                                {/* Booking Details */}
                                <td className="px-4 py-4 align-top border-r border-gray-300">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block bg-linear-to-r from-amber-600 to-amber-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-md">
                                                Airline PNR #: {booking.pnr || 'N/A'}
                                            </span>
                                            <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold ${sourceBadge.className}`}>
                                                {sourceBadge.label}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-700 leading-relaxed">
                                            <span className="font-semibold text-gray-800">Agency:</span> {userId?.companyName || 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-700 leading-relaxed">
                                            <span className="font-semibold text-gray-800">BK#: {booking.bookingReference}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 pt-0.5">
                                            Created: {dayjs(booking.createdAt).format('DD MMM YYYY, hh:mm A')}
                                        </div>
                                    </div>
                                </td>

                                {/* Group */}
                                <td className="px-4 py-4 align-top border-r border-gray-300">
                                    <div className="space-y-1.5">
                                        <div className="font-bold text-sm text-gray-900">
                                            {booking.airline?.name || 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-700 font-medium">
                                            {booking.sector}
                                        </div>
                                        <div className="text-xs text-gray-700">
                                            {formatDate(booking.departureDate)}
                                        </div>
                                        <div className="text-xs text-gray-600 font-medium pt-0.5">
                                            <div className="text-xs text-gray-600 font-medium pt-0.5">
                                                {firstPassenger
                                                    ? `${firstPassenger.givenName} ${firstPassenger.surName}`
                                                    : 'N/A'}{' '}
                                                X {booking.totalPassengers || 0}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Passengers */}
                                <td className="px-4 py-4 align-top border-r border-gray-300">
                                    <div className="inline-block w-full">
                                        <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
                                            <thead className="bg-[#2d5a8f] text-white">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold border-r border-slate-600">
                                                        Status
                                                    </th>
                                                    <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">
                                                        Adults
                                                    </th>
                                                    <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">
                                                        Child
                                                    </th>
                                                    <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">
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
                                                        <tr
                                                            key={key}
                                                            className="hover:bg-slate-50 transition-colors"
                                                        >
                                                            <td className="px-3 py-2 font-medium text-slate-700 bg-slate-50 border-r border-slate-200">
                                                                {label}
                                                            </td>

                                                            <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">
                                                                {adults}
                                                            </td>

                                                            <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">
                                                                {children}
                                                            </td>

                                                            <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">
                                                                {infants}
                                                            </td>

                                                            <td className="px-3 py-2 text-center font-bold text-slate-900">
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
                                <td className={`px-4 py-4 ${(booking.status === 'on hold' || booking.status === 'pending') ? "align-bottom" : "align-middle"} text-center border-r border-gray-300`}>
                                    {(() => {
                                        const totalDiscount = booking.passengers?.reduce((sum, p) => sum + (Number(p.discount) || 0), 0) || 0;
                                        const adjustedTotal = (booking.pricing?.grandTotal || 0) - totalDiscount;
                                        return (
                                            <div className="font-bold text-base text-gray-900">
                                                {(booking.status === 'on hold' || booking.status === 'pending') ? (
                                                    <div className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2.5 py-1.5 rounded-md border border-yellow-300">
                                                        Admin Review<br />Required
                                                    </div>
                                                ) : (
                                                    <>
                                                        PKR {adjustedTotal.toLocaleString()}
                                                        {/* {totalDiscount > 0 && (
                                                            <div className="text-xs text-red-500 font-normal mt-0.5">
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
                                <td className="px-2 py-4 align-top border-r border-gray-300">
                                    <div className="flex flex-col gap-2 items-center">
                                        {booking.status === 'cancelled' && booking.autoCancelled && booking.cancelledAt ? (
                                            <span className="inline-block px-3 py-1.5 rounded-md text-xs shadow-sm bg-red-50 text-red-700 border border-red-300 text-center leading-relaxed">
                                                Auto-cancelled on<br />
                                                {dayjs(booking.cancelledAt).format('DD MMM YYYY, hh:mm A')}
                                            </span>
                                        ) : (
                                            <span className={`inline-block px-3 py-1.5 rounded-md text-xs shadow-sm ${statusBadge.color}`}>
                                                {statusBadge.label}
                                            </span>
                                        )}
                                        {(booking.status === 'on hold' || booking.status === 'pending' || booking.status === 'partially confirmed') && (
                                            <div className="flex flex-col gap-2 items-center text-xs">
                                                <div className="font-bold text-gray-800">Booking Expiry Time</div>
                                                {/* <div className="flex items-center gap-1.5"> */}
                                                {timers[booking._id] && timers[booking._id].expired ? (
                                                    <div className="text-red-600 font-bold text-xs">EXPIRED</div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="bg-linear-to-br from-rose-500 to-rose-600 text-white px-3 py-2 rounded-lg shadow-md text-center min-w-10">
                                                            <div className="text-xl font-bold leading-none">
                                                                {String(timers[booking._id]?.hours || 0).padStart(2, '0')}
                                                            </div>
                                                            <div className="text-[9px] font-medium mt-1 opacity-90">HOURS</div>
                                                        </div>
                                                        <div className="bg-linear-to-br from-amber-500 to-amber-600 text-white px-3 py-2 rounded-lg shadow-md text-center min-w-10">
                                                            <div className="text-xl font-bold leading-none">
                                                                {String(timers[booking._id]?.minutes || 0).padStart(2, '0')}
                                                            </div>
                                                            <div className="text-[9px] font-medium mt-1 opacity-90">MINS</div>
                                                        </div>
                                                        <div className="bg-linear-to-br from-indigo-500 to-indigo-600 text-white px-3 py-2 rounded-lg shadow-md text-center min-w-10">
                                                            <div className="text-xl font-bold leading-none">
                                                                {String(timers[booking._id]?.seconds || 0).padStart(2, '0')}
                                                            </div>
                                                            <div className="text-[9px] font-medium mt-1 opacity-90">SECS</div>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* </div> */}
                                            </div>
                                        )}
                                    </div>
                                </td>


                                {/* Profit / Loss */}
                                <td className="px-2 align-middle text-center border-r border-gray-300">
                                    {(() => {
                                        const gt = booking.groupTicketData;

                                        if (!gt) {
                                            return <span className="text-xs text-gray-400">N/A</span>;
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
                                            <div className="inline-block min-w-42.5 overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm">
                                                <table className="w-full text-[11px] border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="px-2 py-1.5 text-center font-bold text-amber-600 border-r border-gray-200">
                                                                BUY
                                                            </th>
                                                            <th className="px-2 py-1.5 text-center font-bold text-green-600 border-r border-gray-200">
                                                                SELL
                                                            </th>
                                                            <th className="px-2 py-1.5 text-center font-bold text-gray-800">
                                                                P/L
                                                            </th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        <tr>
                                                            <td className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-200">
                                                                {totalBuy.toLocaleString()}
                                                            </td>

                                                            <td className="px-2 py-1.5 text-center font-semibold text-gray-700 border-r border-gray-200">
                                                                {totalSell.toLocaleString()}
                                                            </td>

                                                            <td
                                                                className={`px-2 py-1.5 text-center font-bold ${isLoss ? "text-red-600" : "text-green-600"
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

                                <td className="px-3 py-4 align-top text-center border-r border-gray-300">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${sourceBadge.className}`}>
                                            {sourceBadge.label}
                                        </span>
                                        {booking.sabaoonTransactionId && (
                                            <span className="text-[10px] text-gray-500">Txn #{booking.sabaoonTransactionId}</span>
                                        )}
                                    </div>
                                </td>

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
                                                className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200"
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
                                                            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200"
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
                                                        <button
                                                            // onClick={() => {
                                                            //     if (window.confirm('Are you sure you want to delete this booking?')) {
                                                            //         // Handle delete booking
                                                            //         toast.info('Delete functionality to be implemented')
                                                            //     }
                                                            // }}

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
                                                            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
                                                        </button>
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
                                                        className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200"
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
                                                        className="flex flex-col items-center justify-center p-2.5 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-red-200"
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
                                                        className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200 cursor-pointer"
                                                        title="Print Ticket"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                        </svg>
                                                    </button>
                                                </div>
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
    const canUseActions = hasPermission(user, "bookings_action_buttons")
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [initialLoading, setInitialLoading] = useState(true)
    const [fetching, setFetching] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [filters, setFilters] = useState<Filters>({
        sector: '',
        airline: '',
        fromDate: null,
    })

    const [uniqueSectors, setUniqueSectors] = useState<string[]>([])
    const [uniqueAirlines, setUniqueAirlines] = useState<string[]>([])
    // const [timers, setTimers] = useState<{ [key: string]: { hours: number; minutes: number; seconds: number; expired: boolean } }>({})
    const [timers, setTimers] = useState<Record<string, Timer>>({})


    // Get status from URL params
    const activeStatus = searchParams.get('status') || ''

    const statusOptions: StatusOption[] = [
        { value: 'on hold', label: 'On Hold', color: 'bg-yellow-50 text-yellow-700 border border-yellow-300' },
        { value: 'pending', label: 'On Hold', color: 'bg-yellow-50 text-yellow-700 border border-yellow-300' },
        { value: 'confirmed', label: 'Confirmed', color: 'bg-green-50 text-green-700 border border-green-300' },
        { value: 'partially confirmed', label: 'Partially Confirmed', color: 'bg-indigo-50 text-indigo-700 border border-indigo-300' },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-red-50 text-red-700 border border-red-300' }
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading bookings...</p>
                </div>
            </div>
        )
    }

    if (!canView) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
                You do not have permission to view Bookings.
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">All Bookings</h1>
                <p className="text-gray-600">Manage all customer flight bookings</p>
            </div>

            {/* Search and Filters in One Row */}
            <div className="mb-4 bg-white rounded-lg shadow p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="flex-1 min-w-50">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by reference, PNR, or customer, agent, or company name..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Sector Filter */}
                    <div className="w-full sm:w-auto min-w-37.5">
                        <select
                            value={filters.sector}
                            onChange={(e) => handleFilterChange('sector', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Sectors</option>
                            {uniqueSectors.map(sector => (
                                <option key={sector} value={sector}>
                                    {sector}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Airline Filter */}
                    <div className="w-full sm:w-auto min-w-37.5">
                        <select
                            value={filters.airline}
                            onChange={(e) => handleFilterChange('airline', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Airlines</option>
                            {uniqueAirlines.map(airline => (
                                <option key={airline} value={airline}>
                                    {airline}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* From Date */}
                    <div className="w-full sm:w-auto min-w-37.5">
                        <MaskedDatePicker
                            value={filters.fromDate}
                            onChange={(date) => handleFilterChange('fromDate', date)}
                            placeholderText="Dept Date"
                            minDate={new Date()}
                        />
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-medium border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden relative">
                {fetching && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <BookingsTable
                        bookings={bookings}
                        getStatusBadge={getStatusBadge}
                        formatDate={formatDate}
                        navigate={navigate}
                        timers={timers}
                        setBookings={setBookings}
                        canUseActions={canUseActions}
                    />
                </div>
            </div>
        </div>
    )
}
