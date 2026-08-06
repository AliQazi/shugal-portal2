import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import axiosInstance from '../../Api/axios'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../utils/permissions'

const HOLD_EXTENSION_OPTIONS = [
    { label: 'Set remaining hold', value: '' },
    { label: '30 Minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '1:30 hours', value: 90 },
    { label: '2 hours', value: 120 },
    { label: '2:30 hours', value: 150 },
    { label: '3 hours', value: 180 },
    { label: '3:30 hours', value: 210 },
    { label: '4 hours', value: 240 },
]

interface Booking {
    _id: string
    bookingReference: string
    contactPersonName: string
    sector: string
    airline?: {
        id?: string
        name: string
        logoUrl?: string
    }
    pnr?: string
    departureDate: string
    arrivalDate?: string
    userId?: string | { _id: string; name?: string; companyName?: string; agencyCode?: string }
    status: string
    adultsCount: number
    childrenCount: number
    infantsCount: number
    totalPassengers: number
    pricing?: {
        adultPrice: number
        adultBasePrice?: number
        adultTotal: number
        childPrice?: number
        childBasePrice?: number
        childTotal?: number
        infantPrice?: number
        infantBasePrice?: number
        infantTotal?: number
        grandTotal: number
    }
    passengers?: Array<{
        type: string
        title: string,
        givenName: string
        surName: string
        passport: string
        passportExpiry?: string
        dateOfBirth: string
        documentUrl?: string
        discount?: number
        supplierDiscount?: number
    }>
    flights?: Array<{
        flightNo: string
        origin: string
        destination: string
        depDate: string
        depTime: string
        arrDate: string
        arrTime: string
        baggage?: string
        meal?: string
    }>
    createdAt: string
    expiresAt?: string | null
    sabaoonTransactionId?: number | null
    sabaoonBookingStatus?: 'pending' | 'success' | 'failed' | 'not_applicable' | null
    source?: 'admin' | 'al-haider' | 'travel-network' | string
    groupTicketData?: {
        supplierName?: string | null
        groupName?: string
        groupCategory?: string
        buyingAdultPrice?: number
        buyingChildPrice?: number
        buyingInfantPrice?: number
    }
    refundedPassengerIndices?: number[]
}

interface RefundForm {
    partyCredit: string
    partyCC: string
    supplierCC: string
    supplierDebit: string
}

interface Timer {
    hours: number
    minutes: number
    seconds: number
    expired: boolean
}

export default function BookingDetail() {
    const { user } = useAuth()
    const canView = hasPermission(user, "view_bookings")
    const canUpdateStatus = hasPermission(user, "update_bookings_status")
    const canUpdateDiscount = hasPermission(user, "update_bookings_discount")
    const canUseActions = hasPermission(user, "bookings_action_buttons")
    const { id } = useParams()
    const navigate = useNavigate()
    const [booking, setBooking] = useState<Booking | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedStatus, setSelectedStatus] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [discounts, setDiscounts] = useState<number[]>([])
    const [supplierDiscounts, setSupplierDiscounts] = useState<number[]>([])
    const [isSavingDiscounts, setIsSavingDiscounts] = useState(false)
    const [refundModalOpen, setRefundModalOpen] = useState(false)
    const [refundPassengerIndex, setRefundPassengerIndex] = useState<number | null>(null)
    const [refundForm, setRefundForm] = useState<RefundForm>({ partyCredit: '', partyCC: '', supplierCC: '', supplierDebit: '' })
    const [isSubmittingRefund, setIsSubmittingRefund] = useState(false)
    const [refundedPassengers, setRefundedPassengers] = useState<Set<number>>(new Set())
    const [holdTimer, setHoldTimer] = useState<Timer>({ hours: 0, minutes: 0, seconds: 0, expired: true })
    const [isExtendingHold, setIsExtendingHold] = useState(false)

    useEffect(() => {
        if (canView) {
            fetchBookingDetail()
        } else {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, canView])

    useEffect(() => {
        if (!booking?.expiresAt || !['on hold', 'pending', 'partially confirmed'].includes(booking.status)) {
            setHoldTimer({ hours: 0, minutes: 0, seconds: 0, expired: true })
            return
        }

        const updateTimer = () => {
            setHoldTimer(calculateRemainingTime(booking.expiresAt ?? null))
        }

        updateTimer()
        const interval = window.setInterval(updateTimer, 1000)

        return () => window.clearInterval(interval)
    }, [booking?.expiresAt, booking?.status])
    const fetchBookingDetail = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await axiosInstance.get(`/bookings/${id}`)
            console.log(response)

            if (response.data.success) {
                const data = response.data.data

                if (Array.isArray(data) && data.length > 0) {
                    // 1. Agar array hai to pehla element uthao aur baqi states set karo
                    const bookingData = data[0]
                    setBooking(bookingData)
                    setSelectedStatus(bookingData.status)
                    setDiscounts((bookingData.passengers ?? []).map((p: { discount?: number }) => p.discount || 0))
                    setSupplierDiscounts((bookingData.passengers ?? []).map((p: { supplierDiscount?: number }) => p.supplierDiscount || 0))
                    setRefundedPassengers(new Set<number>(bookingData.refundedPassengerIndices ?? []))

                } else if (Array.isArray(data) && data.length === 0) {
                    setError("Booking not found")
                } else if (data) {
                    // 2. Agar single object hai to direct use karo
                    setBooking(data)
                    setSelectedStatus(data.status)
                    setDiscounts((data.passengers ?? []).map((p: { discount?: number }) => p.discount || 0))
                    setSupplierDiscounts((data.passengers ?? []).map((p: { supplierDiscount?: number }) => p.supplierDiscount || 0))
                    setRefundedPassengers(new Set<number>(data.refundedPassengerIndices ?? []))
                } else {
                    setError('Failed to load booking details')
                }
            } else {
                setError('Failed to load booking details')
            }
        } catch (err) {
            console.error('Error fetching booking:', err)
            setError('Failed to load booking details')
            // Agar toast notification chahiye to yahan use kar sakte hain
            // toast.error("Failed to load booking details"); 
        } finally {
            setLoading(false)
        }
    }

    const handleSaveDiscounts = async () => {
        if (!canUpdateDiscount) {
            alert("You don't have permission to update booking discounts")
            return
        }

        try {
            setIsSavingDiscounts(true)
            const response = await axiosInstance.patch(`/bookings/${id}/discounts`, { discounts, supplierDiscounts })
            if (response.data.success) {
                await fetchBookingDetail()
                alert('Discounts saved successfully!')
            }
        } catch (err) {
            console.error('Error saving discounts:', err)
            alert('Failed to save discounts. Please try again.')
        } finally {
            setIsSavingDiscounts(false)
        }
    }

    const getPassengerPrice = (type: string) => {
        if (!booking?.pricing) return 0
        if (type === 'Adult') return booking.pricing.adultPrice || 0
        if (type === 'Child') return booking.pricing.childPrice || 0
        if (type === 'Infant') return booking.pricing.infantPrice || 0
        return 0
    }

    const getPassengerBasePrice = (type: string) => {
        if (!booking?.pricing) return 0
        if (type === 'Adult') return booking.pricing.adultBasePrice || booking.pricing.adultPrice || 0
        if (type === 'Child') return booking.pricing.childBasePrice || booking.pricing.childPrice || 0
        if (type === 'Infant') return booking.pricing.infantBasePrice || booking.pricing.infantPrice || 0
        return 0
    }

    const getPassengerBuyingPrice = (type: string) => {
        if (booking?.groupTicketData) {
            if (type === 'Adult') return booking.groupTicketData.buyingAdultPrice ?? getPassengerBasePrice(type)
            if (type === 'Child') return booking.groupTicketData.buyingChildPrice ?? getPassengerBasePrice(type)
            if (type === 'Infant') return booking.groupTicketData.buyingInfantPrice ?? getPassengerBasePrice(type)
        }
        return getPassengerBasePrice(type)
    }

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatDateTime = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const calculateRemainingTime = (expiresAt: string | null): Timer => {
        if (!expiresAt) return { hours: 0, minutes: 0, seconds: 0, expired: true }

        const diff = new Date(expiresAt).getTime() - Date.now()

        if (diff <= 0) {
            return { hours: 0, minutes: 0, seconds: 0, expired: true }
        }

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        return { hours, minutes, seconds, expired: false }
    }

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            "on hold": 'border border-yellow-200 bg-yellow-50 text-yellow-700',
            pending: 'border border-yellow-200 bg-yellow-50 text-yellow-700',
            confirmed: 'border border-green-200 bg-green-50 text-green-700',
            "partially confirmed": 'border border-indigo-200 bg-indigo-50 text-indigo-700',
            cancelled: 'border border-red-200 bg-red-50 text-red-700'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
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

    const handleStatusChange = async () => {
        if (!canUpdateStatus) {
            alert("You don't have permission to update booking status");
            return;
        }

        const bookingData = Array.isArray(booking) ? booking[0] : booking;

        if (!bookingData || selectedStatus === bookingData.status) {
            return;
        }

        if (bookingData.status === 'cancelled') {
            alert("This booking is cancelled and its status can no longer be changed");
            return;
        }

        try {
            setIsUpdating(true);

            const response = await axiosInstance.patch(
                `/bookings/${id}/status`,
                {
                    status: selectedStatus,
                    booking: bookingData,
                }
            );

            if (response.data.success) {
                setBooking(response.data.data);
                alert("Booking status updated successfully!");
            }
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Failed to update booking status. Please try again.");

            if (bookingData) {
                setSelectedStatus(bookingData.status);
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExtendHold = async (holdMinutes: number) => {
        if (!canUseActions) {
            alert("You don't have permission to manage bookings")
            return
        }

        if (!booking) return

        try {
            setIsExtendingHold(true)
            const response = await axiosInstance.patch(`/bookings/${booking._id}/extend-hold`, {
                holdMinutes,
            })

            if (response.data.success) {
                setBooking(response.data.data)
                setHoldTimer(calculateRemainingTime(response.data.data.expiresAt ?? null))
                alert('Booking hold extended successfully!')
            }
        } catch (err) {
            console.error('Error extending booking hold:', err)
            alert('Failed to extend booking hold. Please try again.')
        } finally {
            setIsExtendingHold(false)
        }
    }

    const openRefundModal = (index: number) => {
        if (!canUseActions) {
            alert("You don't have permission to manage bookings")
            return
        }

        setRefundPassengerIndex(index)
        const pax = booking?.passengers?.[index]
        const sellingPrice = getPassengerPrice(pax?.type ?? '') - (discounts[index] ?? 0)
        const buyingPrice = getPassengerBuyingPrice(pax?.type ?? '')
        setRefundForm({ partyCredit: String(sellingPrice), partyCC: '', supplierCC: '', supplierDebit: String(buyingPrice) })
        setRefundModalOpen(true)
    }

    const closeRefundModal = () => {
        setRefundModalOpen(false)
        setRefundPassengerIndex(null)
    }

    const handleSubmitRefund = async () => {
        if (!canUseActions) {
            alert("You don't have permission to manage bookings")
            return
        }

        const allZero = !Number(refundForm.partyCredit) && !Number(refundForm.partyCC) && !Number(refundForm.supplierCC) && !Number(refundForm.supplierDebit)
        if (allZero) { alert('All amounts are zero.'); return }

        try {
            setIsSubmittingRefund(true)
            await axiosInstance.post(`/bookings/${id}/refund`, {
                passengerIndex: refundPassengerIndex,
                partyCredit: Number(refundForm.partyCredit),
                partyCC: Number(refundForm.partyCC),
                supplierCC: Number(refundForm.supplierCC),
                supplierDebit: Number(refundForm.supplierDebit),
            })
            alert('Refund voucher created successfully!')
            setRefundedPassengers(prev => new Set([...prev, refundPassengerIndex!]))
            closeRefundModal()
        } catch (err) {
            console.error('Error submitting refund:', err)
            alert('Failed to submit refund. Please try again.')
        } finally {
            setIsSubmittingRefund(false)
        }
    }

    if (loading) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading booking details...</p>
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

    if (error || !booking) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 text-lg mb-4">{error || 'Booking not found'}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    const safeBooking = booking as Booking
    const isBookingCancelled = safeBooking.status === 'cancelled'
    const sourceBadge = getSourceBadge(safeBooking.source)

    const refundPassenger = refundPassengerIndex !== null ? safeBooking?.passengers?.[refundPassengerIndex] : null
    const refundPassengerTotal = refundPassengerIndex !== null
        ? getPassengerPrice(refundPassenger?.type ?? '') - (discounts[refundPassengerIndex] ?? 0)
        : 0
    // const refundPartyCCNum = Number(refundForm.partyCC) || 0
    // const refundPartyCreditNum = Number(refundForm.partyCredit) || 0


    const passengerTotals = safeBooking.passengers?.map((p, i) => ({
        type: p.type,
        discount: discounts[i] || 0,
    })) || []

    const adultDiscountSum = passengerTotals.filter(p => p.type === 'Adult').reduce((s, p) => s + p.discount, 0)
    const childDiscountSum = passengerTotals.filter(p => p.type === 'Child').reduce((s, p) => s + p.discount, 0)
    const infantDiscountSum = passengerTotals.filter(p => p.type === 'Infant').reduce((s, p) => s + p.discount, 0)
    const totalDiscountSum = adultDiscountSum + childDiscountSum + infantDiscountSum

    const adjustedAdultTotal = (safeBooking.pricing?.adultTotal || 0) - adultDiscountSum
    const adjustedChildTotal = (safeBooking.pricing?.childTotal || 0) - childDiscountSum
    const adjustedInfantTotal = (safeBooking.pricing?.infantTotal || 0) - infantDiscountSum
    const adjustedGrandTotal = adjustedAdultTotal + adjustedChildTotal + adjustedInfantTotal

    return (
        <div className="w-full min-h-screen bg-gray-50">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
                        <p className="text-gray-600 mt-1">Reference: <span className="font-semibold text-blue-600">{safeBooking.bookingReference}</span></p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Back
                    </button>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Booking Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Card with Update */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Booking Status</h2>
                            </div>
                            <div className="flex items-center gap-4">
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    disabled={!canUpdateStatus || isBookingCancelled}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={isBookingCancelled ? "This booking is cancelled and its status can no longer be changed" : ""}
                                >
                                    <option value="on hold">On Hold</option>
                                    <option value="partially confirmed">Partially Confirmed</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                <button
                                    onClick={handleStatusChange}
                                    disabled={selectedStatus === safeBooking.status || isUpdating || !canUpdateStatus || isBookingCancelled}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title={isBookingCancelled ? "This booking is cancelled and its status can no longer be changed" : (!canUpdateStatus ? "You don't have permission to update booking status" : "")}
                                >
                                    {isUpdating ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                            {isBookingCancelled && (
                                <p className="mt-2 text-sm font-medium text-red-600">This booking is cancelled and its status cannot be changed further.</p>
                            )}
                            <p className="text-gray-600 mt-4 text-sm">Created: {formatDate(safeBooking.createdAt)}</p>
                            {['on hold', 'pending', 'partially confirmed'].includes(safeBooking.status) && (
                                <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-yellow-800">Booking Expiry Time</p>
                                            {holdTimer.expired ? (
                                                <p className="mt-2 text-sm font-bold text-red-600">EXPIRED</p>
                                            ) : (
                                                <div className="mt-2 flex items-center gap-2">
                                                    {[
                                                        { label: 'HOURS', value: holdTimer.hours },
                                                        { label: 'MINS', value: holdTimer.minutes },
                                                        { label: 'SECS', value: holdTimer.seconds },
                                                    ].map(item => (
                                                        <div key={item.label} className="min-w-14 rounded-md bg-white px-3 py-2 text-center shadow-sm">
                                                            <div className="text-xl font-bold leading-none text-gray-900">
                                                                {String(item.value).padStart(2, '0')}
                                                            </div>
                                                            <div className="mt-1 text-[10px] font-semibold text-gray-500">{item.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="mt-2 text-xs text-yellow-700">Expires at: {formatDateTime(safeBooking.expiresAt)}</p>
                                        </div>
                                        {!holdTimer.expired && (
                                            <div className="w-full sm:w-52">
                                                <label className="mb-1 block text-xs font-semibold text-yellow-800">Set hold duration (Reset)</label>
                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        const holdMinutes = Number(e.target.value)
                                                        if (holdMinutes) {
                                                            handleExtendHold(holdMinutes)
                                                        }
                                                    }}
                                                    disabled={!canUseActions || isExtendingHold}
                                                    className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                                                    title={canUseActions ? "Extend booking hold" : "You don't have permission to manage bookings"}
                                                >
                                                    {HOLD_EXTENSION_OPTIONS.map(option => (
                                                        <option key={option.label} value={option.value}>
                                                            {isExtendingHold && option.value === '' ? 'Extending...' : option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Booking Information */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-600">Contact Person</label>
                                    <p className="text-gray-900 font-medium">{(safeBooking?.passengers?.[0]?.givenName + ' ' + safeBooking?.passengers?.[0]?.surName) || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Sector</label>
                                    <p className="text-gray-900 font-medium">{safeBooking.sector}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Airline</label>
                                    <p className="text-gray-900 font-medium">{safeBooking.airline?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">PNR</label>
                                    <p className="text-gray-900 font-medium">{safeBooking.pnr || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Source</label>
                                    <p>
                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${sourceBadge.className}`}>
                                            {sourceBadge.label}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Departure Date</label>
                                    <p className="text-gray-900 font-medium">{formatDate(safeBooking.departureDate)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Arrival Date</label>
                                    <p className="text-gray-900 font-medium">{formatDate(safeBooking.arrivalDate)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Agency Name</label>
                                    <p className="text-gray-900 font-medium">{typeof safeBooking.userId === 'object' ? safeBooking.userId?.companyName || safeBooking.userId?.name || 'N/A' : 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Supplier Name</label>
                                    <p className="text-gray-900 font-medium">{safeBooking.groupTicketData?.supplierName || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Booked By (User ID)</label>
                                    <p className="text-gray-900 font-medium text-xs">{typeof safeBooking.userId === 'string' ? safeBooking.userId : safeBooking.userId?._id || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Passenger Information */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Passenger Breakdown</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-blue-600">{safeBooking.adultsCount || "0"}</p>
                                    <p className="text-sm text-gray-600">Adults</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-green-600">{safeBooking.childrenCount || "0"}</p>
                                    <p className="text-sm text-gray-600">Children</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-purple-600">{safeBooking.infantsCount || "0"}</p>
                                    <p className="text-sm text-gray-600">Infants</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-gray-700"><span className="font-semibold">Total Passengers:</span> {safeBooking.totalPassengers}</p>
                            </div>
                        </div>

                        {/* Pricing Information */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Breakdown</h3>
                            <div className="space-y-3">
                                {/* Adults */}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Adult Base Price (x{safeBooking.adultsCount})</span>
                                    <span className="font-medium">PKR {(safeBooking.pricing?.adultBasePrice || safeBooking.pricing?.adultPrice || 0).toLocaleString()}</span>
                                </div>
                                {safeBooking.pricing?.adultBasePrice !== undefined &&
                                    safeBooking.pricing.adultPrice !== safeBooking.pricing.adultBasePrice && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-amber-700">↑ Margin per Adult</span>
                                            <span className="font-medium text-amber-700">
                                                +PKR {(safeBooking.pricing.adultPrice - safeBooking.pricing.adultBasePrice).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Adult Final Price (x{safeBooking.adultsCount})</span>
                                    <span className="font-medium">PKR {(safeBooking.pricing?.adultPrice || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Adult Total</span>
                                    <span className="font-medium text-blue-600">PKR {(safeBooking.pricing?.adultTotal || 0).toLocaleString()}</span>
                                </div>
                                {adultDiscountSum > 0 && (
                                    <>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-red-500">↓ Discount (Adults)</span>
                                            <span className="font-medium text-red-500">-PKR {adultDiscountSum.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700 font-medium">Adjusted Adult Total</span>
                                            <span className="font-semibold text-blue-700">PKR {adjustedAdultTotal.toLocaleString()}</span>
                                        </div>
                                    </>
                                )}

                                {/* Children */}
                                {safeBooking.childrenCount > 0 && (
                                    <>
                                        <div className="border-t border-gray-100 pt-2" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Child Base Price (x{safeBooking.childrenCount})</span>
                                            <span className="font-medium">PKR {(safeBooking.pricing?.childBasePrice || safeBooking.pricing?.childPrice || 0).toLocaleString()}</span>
                                        </div>
                                        {safeBooking.pricing?.childBasePrice !== undefined &&
                                            (safeBooking.pricing?.childPrice || 0) !== (safeBooking.pricing?.childBasePrice || 0) && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-amber-700">↑ Margin per Child</span>
                                                    <span className="font-medium text-amber-700">
                                                        +PKR {((safeBooking.pricing?.childPrice || 0) - (safeBooking.pricing?.childBasePrice || 0)).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Child Final Price (x{safeBooking.childrenCount})</span>
                                            <span className="font-medium">PKR {(safeBooking.pricing?.childPrice || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Child Total</span>
                                            <span className="font-medium text-green-600">PKR {(safeBooking.pricing?.childTotal || 0).toLocaleString()}</span>
                                        </div>
                                        {childDiscountSum > 0 && (
                                            <>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-red-500">↓ Discount (Children)</span>
                                                    <span className="font-medium text-red-500">-PKR {childDiscountSum.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-700 font-medium">Adjusted Child Total</span>
                                                    <span className="font-semibold text-green-700">PKR {adjustedChildTotal.toLocaleString()}</span>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {/* Infants */}
                                {safeBooking.infantsCount > 0 && (
                                    <>
                                        <div className="border-t border-gray-100 pt-2" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Infant Base Price (x{safeBooking.infantsCount})</span>
                                            <span className="font-medium">PKR {(safeBooking.pricing?.infantBasePrice || safeBooking.pricing?.infantPrice || 0).toLocaleString()}</span>
                                        </div>
                                        {safeBooking.pricing?.infantBasePrice !== undefined &&
                                            (safeBooking.pricing?.infantPrice || 0) !== (safeBooking.pricing?.infantBasePrice || 0) && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-amber-700">↑ Margin per Infant</span>
                                                    <span className="font-medium text-amber-700">
                                                        +PKR {((safeBooking.pricing?.infantPrice || 0) - (safeBooking.pricing?.infantBasePrice || 0)).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Infant Final Price (x{safeBooking.infantsCount})</span>
                                            <span className="font-medium">PKR {(safeBooking.pricing?.infantPrice || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-700">Infant Total</span>
                                            <span className="font-medium text-purple-600">PKR {(safeBooking.pricing?.infantTotal || 0).toLocaleString()}</span>
                                        </div>
                                        {infantDiscountSum > 0 && (
                                            <>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-red-500">↓ Discount (Infants)</span>
                                                    <span className="font-medium text-red-500">-PKR {infantDiscountSum.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-700 font-medium">Adjusted Infant Total</span>
                                                    <span className="font-semibold text-purple-700">PKR {adjustedInfantTotal.toLocaleString()}</span>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                <div className="border-t border-gray-200 pt-3 mt-3">
                                    {totalDiscountSum > 0 && (
                                        <div className="flex justify-between items-center text-sm mb-2">
                                            <span className="text-red-500 font-medium">↓ Total Discounts Applied</span>
                                            <span className="font-semibold text-red-500">-PKR {totalDiscountSum.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gray-900">Grand Total</span>
                                        <span className="text-lg font-bold text-blue-600">PKR {adjustedGrandTotal.toLocaleString()}</span>
                                    </div>
                                    {totalDiscountSum > 0 && (
                                        <p className="text-xs text-gray-400 text-right mt-1">Original: PKR {(safeBooking.pricing?.grandTotal || 0).toLocaleString()}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Passenger List */}
                        {safeBooking.passengers && safeBooking.passengers.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                    <h3 className="text-lg font-semibold  text-gray-900">Passenger List</h3>
                                    <button
                                        onClick={handleSaveDiscounts}
                                        disabled={isSavingDiscounts || !canUpdateDiscount}
                                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title={!canUpdateDiscount ? "You don't have permission to update booking discounts" : ""}
                                    >
                                        {isSavingDiscounts ? 'Saving...' : 'Save Discounts'}
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap hidden md:table-cell">Passport</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap hidden lg:table-cell">Passport Expiry</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap hidden sm:table-cell">DOB</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">C. Price</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">C. Disc</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap hidden xl:table-cell">C. Total</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap hidden lg:table-cell">S. Price</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap hidden xl:table-cell">S. Disc</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Refund</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">Doc</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {safeBooking.passengers.map((passenger, index) => {
                                                const sellingPrice = getPassengerPrice(passenger.type);
                                                const buyingPrice = getPassengerBuyingPrice(passenger.type);
                                                const discount = discounts[index] ?? 0;
                                                const supplierDiscount = supplierDiscounts[index] ?? 0;

                                                return (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{`${passenger.title}. ${passenger.givenName}`}</span>
                                                                <span className="text-xs text-gray-500">{passenger.surName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${passenger.type === 'Adult' ? 'bg-blue-100 text-blue-800' :
                                                                passenger.type === 'Child' ? 'bg-green-100 text-green-800' :
                                                                    'bg-purple-100 text-purple-800'
                                                                }`}>
                                                                {passenger.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap hidden md:table-cell">
                                                            {passenger.passport || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap hidden lg:table-cell">
                                                            {formatDate(passenger.passportExpiry)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap hidden sm:table-cell">
                                                            {formatDate(passenger.dateOfBirth)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700 font-medium whitespace-nowrap">
                                                            {sellingPrice.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={discount}
                                                                disabled={!canUpdateDiscount}
                                                                onChange={(e) => {
                                                                    const updated = [...discounts]
                                                                    updated[index] = Math.max(0, Number(e.target.value))
                                                                    setDiscounts(updated)
                                                                }}
                                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-blue-600 whitespace-nowrap hidden xl:table-cell">
                                                            {(sellingPrice - discount).toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700 font-medium whitespace-nowrap hidden lg:table-cell">
                                                            {buyingPrice.toLocaleString()}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm whitespace-nowrap hidden xl:table-cell">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={supplierDiscount}
                                                                disabled={!canUpdateDiscount}
                                                                onChange={(e) => {
                                                                    const updated = [...supplierDiscounts]
                                                                    updated[index] = Math.max(0, Number(e.target.value))
                                                                    setSupplierDiscounts(updated)
                                                                }}
                                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                            {refundedPassengers.has(index) ? (
                                                                <span className="px-3 py-1 bg-green-50 text-green-600 border border-green-200 rounded text-xs font-medium whitespace-nowrap">
                                                                    Refunded
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => openRefundModal(index)}
                                                                    disabled={!canUseActions}
                                                                    className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title={!canUseActions ? "You don't have permission to manage bookings" : ""}
                                                                >
                                                                    Refund
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                                                            {passenger.documentUrl ? (
                                                                /\.(jpg|jpeg|png|webp)/i.test(passenger.documentUrl) ? (
                                                                    <a href={passenger.documentUrl} target="_blank" rel="noreferrer">
                                                                        <img
                                                                            src={passenger.documentUrl}
                                                                            alt="document"
                                                                            className="h-10 w-16 object-cover rounded border border-gray-300 hover:opacity-80 transition-opacity"
                                                                        />
                                                                    </a>
                                                                ) : (
                                                                    <a
                                                                        href={passenger.documentUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                                                        PDF
                                                                    </a>
                                                                )
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Flight Details */}
                        {safeBooking.flights && safeBooking.flights.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                                <div className="space-y-4">
                                    {safeBooking.flights.map((flight, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <p className="font-semibold text-gray-900">Flight {index + 1}: {flight.flightNo}</p>
                                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                                                <div><span className="font-medium">Origin:</span> {flight.origin}</div>
                                                <div><span className="font-medium">Destination:</span> {flight.destination}</div>
                                                <div><span className="font-medium">Departure:</span> {formatDate(flight.depDate || safeBooking.departureDate)} {flight.depTime}</div>
                                                <div><span className="font-medium">Arrival:</span> {formatDate(flight.arrDate || safeBooking.arrivalDate)} {flight.arrTime}</div>
                                                <div><span className="font-medium">Baggage:</span> {flight.baggage || 'N/A'}</div>
                                                <div><span className="font-medium">Meal:</span> {flight.meal || 'N/A'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Summary */}
                    <div>
                        <div className="bg-white rounded-lg shadow p-6 top-20">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <label className="text-gray-600">Reference</label>
                                    <p className="text-gray-900 font-medium">{safeBooking.bookingReference}</p>
                                </div>
                                <div>
                                    <label className="text-gray-600">Status</label>
                                    <p className={`font-medium px-3 py-1 rounded w-fit text-xs mt-1 ${getStatusColor(safeBooking.status)}`}>
                                        {safeBooking?.status?.charAt(0)?.toUpperCase() + safeBooking?.status?.slice(1)}
                                    </p>
                                </div>
                                {refundedPassengers.size > 0 && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <label className="text-gray-600">Refunds</label>
                                        <p className="mt-1 inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                                            {refundedPassengers.size} pax refunded
                                        </p>
                                    </div>
                                )}
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Total Passengers</label>
                                    <p className="text-2xl font-bold text-gray-900">{safeBooking.totalPassengers}</p>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Grand Total</label>
                                    <p className="text-2xl font-bold text-blue-600">PKR {adjustedGrandTotal.toLocaleString()}</p>
                                    {totalDiscountSum > 0 && (
                                        <p className="text-xs text-red-500 mt-1">-PKR {totalDiscountSum.toLocaleString()} discount applied</p>
                                    )}
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Booked on</label>
                                    <p className="text-gray-900">{formatDate(safeBooking.createdAt)}</p>
                                </div>
                                {safeBooking.sabaoonBookingStatus && safeBooking.sabaoonBookingStatus !== 'not_applicable' && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <label className="text-gray-600">Sabaoon Status</label>
                                        <p className={`mt-1 inline-block px-2 py-1 rounded text-xs font-semibold ${safeBooking.sabaoonBookingStatus === 'success'
                                            ? 'bg-green-100 text-green-700'
                                            : safeBooking.sabaoonBookingStatus === 'failed'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {safeBooking.sabaoonBookingStatus.charAt(0).toUpperCase() + safeBooking.sabaoonBookingStatus.slice(1)}
                                        </p>
                                    </div>
                                )}
                                {safeBooking.sabaoonTransactionId && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <label className="text-gray-600">Sabaoon Transaction ID</label>
                                        <p className="text-gray-900 font-medium text-sm">{safeBooking.sabaoonTransactionId}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Refund Modal */}
            {refundModalOpen && refundPassenger && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-semibold text-gray-900">Refund — {refundPassenger.title}. {refundPassenger.givenName} {refundPassenger.surName}</h2>
                            <button onClick={closeRefundModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>

                        <div className="mb-5 p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                            <span className="text-sm text-gray-600">Passenger Total</span>
                            <span className="font-bold text-blue-600">PKR {refundPassengerTotal.toLocaleString()}</span>
                        </div>

                        <div className="space-y-4">
                            {/* Row 1: Party Credit + Party CC */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Party CC (PKR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={refundForm.partyCC}
                                        onChange={(e) => {
                                            const cc = Math.max(0, Number(e.target.value))
                                            setRefundForm(f => ({
                                                ...f,
                                                partyCC: String(cc),
                                                partyCredit: String(Math.max(0, refundPassengerTotal - cc))
                                            }))
                                        }}
                                        placeholder="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Party Credit (PKR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={refundForm.partyCredit}
                                        onChange={(e) => {
                                            const credit = Math.max(0, Number(e.target.value))
                                            setRefundForm(f => ({
                                                ...f,
                                                partyCredit: String(credit),
                                                partyCC: String(Math.max(0, refundPassengerTotal - credit)),
                                            }))
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                    />
                                </div>
                            </div>



                            {/* Row 2: Supplier CC + Supplier Debit */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier CC (PKR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={refundForm.supplierCC}
                                        onChange={(e) => {
                                            const cc = Math.max(0, Number(e.target.value))
                                            const buyingPrice = getPassengerBuyingPrice(refundPassenger?.type ?? '')
                                            const newSupplierDebit = Math.max(0, buyingPrice - cc)
                                            const excess = Math.max(0, cc - buyingPrice)
                                            setRefundForm(f => ({
                                                ...f,
                                                supplierCC: String(cc),
                                                supplierDebit: String(newSupplierDebit),
                                                partyCredit: String(refundPassengerTotal + excess),
                                            }))
                                        }}
                                        placeholder="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Debit (PKR)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={refundForm.supplierDebit}
                                        onChange={(e) => {
                                            const debit = Math.max(0, Number(e.target.value))
                                            const buyingPrice = getPassengerBuyingPrice(refundPassenger?.type ?? '')
                                            setRefundForm(f => ({
                                                ...f,
                                                supplierDebit: String(debit),
                                                supplierCC: String(Math.max(0, buyingPrice - debit)),
                                            }))
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={closeRefundModal}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitRefund}
                                disabled={isSubmittingRefund || !canUseActions}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title={!canUseActions ? "You don't have permission to manage bookings" : ""}
                            >
                                {isSubmittingRefund ? 'Submitting...' : 'Submit Refund'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
