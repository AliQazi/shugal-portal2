import { useState, useEffect, memo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { format } from "date-fns"
import axiosInstance from '../../Api/axios'
import MaskedDatePicker from '../../components/maskedDatePicker'
import toast from 'react-hot-toast'

// ─── Types mapped to actual API response ───────────────────────────────────────
interface PackageBooking {
  _id: string
  bookingReference: string
  contactPersonName: string        // ✅ was: contactName
  airline: {                       // ✅ was: groupTicket.airline (string)
    id: string | null
    name: string
    logoUrl: string | null
  }
  pricing: {                       // ✅ was: totalPrice (flat number)
    adultPrice: number
    childPrice: number
    infantPrice: number
    adultTotal: number
    childTotal: number
    infantTotal: number
    grandTotal: number
  }
  sector: string                   // ✅ was: groupTicket.sector
  groupId: string                  // ✅ was: groupTicket._id
  groupType: string                // ✅ replaces: package.name / package.type
  pnr: string
  adultsCount: number              // ✅ direct fields — no need to count from array
  childrenCount: number
  infantsCount: number
  totalPassengers: number
  passengers: {
    _id: string
    type: string
    title: string
    givenName: string
    surName: string                // ✅ was: surname
    passport: string               // ✅ was: passportNo
    dateOfBirth: string            // ✅ was: dob
    passportExpiry: string
    nationality: string
  }[]
  flights: {
    _id?: string
    flightNo: string
    flightDate?: string
    depDate: string
    depTime: string
    origin?: string
    destination?: string
    arrDate: string
    arrTime: string
    baggage: string
    meal: string
  }[]
  departureDate: string
  arrivalDate: string
  status: string
  userId?: {
    _id: string
    name: string
    email: string
    phone?: string
    companyName?: string
    agencyCode?: string
  }
  paymentStatus?: string
  notes?: string
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

interface StatusOption {
  value: string
  label: string
  color: string
}

interface Timer {
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

// ─── Table Component ────────────────────────────────────────────────────────────
interface BookingsTableProps {
  bookings: PackageBooking[]
  getStatusBadge: (status: string) => StatusOption
  formatDate: (dateStr: string | undefined) => string
  navigate: (path: string) => void
  timers: Record<string, Timer>
  setBookings: React.Dispatch<React.SetStateAction<PackageBooking[]>>
}

const BookingsTable = memo(({ bookings, getStatusBadge, formatDate, navigate, timers, setBookings }: BookingsTableProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  return (
    <table className="min-w-full border-collapse">
      <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f]">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8]">
            Booking Details
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8]">
            <div className="flex items-center gap-1">
              <span>Group / Flight</span>
              <span>🕌</span>
            </div>
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-[#3d6fa8]">
            <div className="flex items-center gap-1">
              <span>Passengers</span>
              <span>👥</span>
            </div>
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-white border-r border-[#3d6fa8]">
            Price (PKR)
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-white border-r border-[#3d6fa8]">
            Status
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-white">
            Action
          </th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {bookings.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm border">
              No bookings found
            </td>
          </tr>
        ) : (
          bookings.map((booking) => {
            const statusBadge = getStatusBadge(booking.status)
            const firstPassenger = booking.passengers?.[0]

            // ✅ Use direct count fields from API instead of filtering the array
            const adultsCount = booking.adultsCount ?? 0
            const childrenCount = booking.childrenCount ?? 0
            const infantsCount = booking.infantsCount ?? 0

            return (
              <tr key={booking._id} className="border-b border-gray-300 hover:bg-blue-50/20 transition-colors">

                {/* ── Booking Details ── */}
                <td className="px-4 py-4 align-top border-r border-gray-300">
                  <div className="space-y-1.5">
                    {/* Booking Reference */}
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-linear-to-r from-amber-600 to-amber-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow-md">
                        BK#: {booking.bookingReference}
                      </span>
                    </div>

                    {/* Contact name — ✅ was: booking.contactName */}
                    <div className="text-xs text-gray-700">
                      <span className="font-semibold text-gray-800">Contact:</span>{' '}
                      {booking.contactPersonName || 'N/A'}
                    </div>

                    {/* Customer info */}
                    {booking.userId && (
                      <div className="text-xs text-gray-700">
                        <span className="font-semibold text-gray-800">Customer:</span>{' '}
                        {booking.userId.name}
                        <span className="ml-1 text-gray-500">({booking.userId.email})</span>
                      </div>
                    )}

                    {/* Agency info (if available) */}
                    {booking.userId?.companyName && (
                      <div className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-800">Agency:</span>{' '}
                        {booking.userId.companyName}
                        {booking.userId.agencyCode && (
                          <span className="ml-1 text-gray-500">(#{booking.userId.agencyCode})</span>
                        )}
                      </div>
                    )}

                    {/* Payment status */}
                    {booking.paymentStatus && (
                      <div className="text-xs text-gray-700">
                        <span className="font-semibold text-gray-800">Payment:</span>{' '}
                        <span className={booking.paymentStatus === 'paid' ? 'text-green-600 font-semibold' : 'text-orange-500 font-semibold'}>
                          {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                        </span>
                      </div>
                    )}

                    {/* PNR */}
                    {booking.pnr && (
                      <div className="text-xs text-gray-600">
                        <span className="font-semibold text-gray-800">PNR:</span>{' '}
                        {booking.pnr}
                      </div>
                    )}

                    {/* Notes */}
                    {booking.notes && (
                      <div className="text-xs text-gray-500 italic pt-0.5 max-w-45 truncate" title={booking.notes}>
                        {booking.notes}
                      </div>
                    )}

                    {/* Created date */}
                    <div className="text-xs text-gray-600 pt-0.5">
                      Created: {formatDate(booking.createdAt)}
                    </div>
                  </div>
                </td>

                {/* ── Group / Flight Info ── */}
                <td className="px-4 py-4 align-top border-r border-gray-300">
                  <div className="space-y-1.5">
                    {/* Group type — ✅ was: booking.package?.name */}
                    <div className="font-bold text-sm text-gray-900">
                      {booking.groupType || 'N/A'}
                    </div>

                    {/* Sector — ✅ was: booking.groupTicket?.sector */}
                    <div className="text-xs text-blue-700 font-medium">
                      {booking.sector || 'N/A'}
                    </div>

                    {/* Airline — ✅ was: booking.groupTicket?.airline (string) */}
                    <div className="text-xs text-gray-700 font-medium">
                      ✈ {booking.airline?.name || 'N/A'}
                    </div>

                    {/* Departure → Arrival dates */}
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold">Dep:</span>{' '}
                      {formatDate(booking.departureDate)}
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold">Arr:</span>{' '}
                      {formatDate(booking.arrivalDate)}
                    </div>

                    {/* Flights summary */}
                    {booking.flights && booking.flights.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {booking.flights.map((flight, idx) => (
                          <div key={flight._id || idx} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                            <span className="font-semibold">{flight.flightNo}</span>
                            {flight.origin && flight.destination && (
                              <span className="ml-1 text-gray-500">{flight.origin}→{flight.destination}</span>
                            )}
                            <span className="ml-1">{flight.depTime}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lead passenger x total */}
                    <div className="text-xs text-gray-600 font-medium pt-0.5">
                      {firstPassenger
                        ? `${firstPassenger.givenName} ${firstPassenger.surName}` // ✅ was: surname
                        : 'N/A'}{' '}
                      X {booking.totalPassengers || 0}
                    </div>
                  </div>
                </td>

                {/* ── Passengers breakdown ── */}
                <td className="px-4 py-4 align-top border-r border-gray-300">
                  <div className="inline-block w-full">
                    <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
                      <thead className="bg-[#2d5a8f] text-white">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold border-r border-slate-600">Type</th>
                          <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">Adults</th>
                          <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">Child</th>
                          <th className="px-3 py-2 text-center font-semibold border-r border-slate-600">Infants</th>
                          <th className="px-3 py-2 text-center font-semibold">Seats</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {[
                          {
                            label: 'Requested',
                            match: ['on hold', 'pending', 'cancelled'],
                          },
                          {
                            label: 'Confirmed',
                            match: ['confirmed'],
                          },
                        ].map(({ label, match }) => {
                          const active = match.includes(booking.status)
                          // ✅ Using direct API fields instead of array filtering
                          const a = active ? adultsCount : 0
                          const c = active ? childrenCount : 0
                          const i = active ? infantsCount : 0
                          return (
                            <tr key={label} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2 font-medium text-slate-700 bg-slate-50 border-r border-slate-200">{label}</td>
                              <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">{a}</td>
                              <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">{c}</td>
                              <td className="px-3 py-2 text-center font-semibold border-r border-slate-200">{i}</td>
                              <td className="px-3 py-2 text-center font-bold text-slate-900">{a + c + i}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    {/* Per-type pricing breakdown — ✅ uses booking.pricing object */}
                    <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                      {booking.pricing?.adultPrice > 0 && (
                        <div>Adult: PKR {booking.pricing.adultPrice.toLocaleString()}</div>
                      )}
                      {booking.pricing?.childPrice > 0 && (
                        <div>Child: PKR {booking.pricing.childPrice.toLocaleString()}</div>
                      )}
                      {booking.pricing?.infantPrice > 0 && (
                        <div>Infant: PKR {booking.pricing.infantPrice.toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* ── Price — ✅ was: booking.totalPrice, now: booking.pricing.grandTotal ── */}
                <td className={`px-4 py-4 ${(booking.status === 'on hold' || booking.status === 'pending') ? 'align-bottom' : 'align-middle'} text-center border-r border-gray-300`}>
                  {booking.status === 'on hold' || booking.status === 'pending' ? (
                    <div className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2.5 py-1.5 rounded-md border border-yellow-300">
                      Admin Review<br />Required
                    </div>
                  ) : (
                    <div className="font-bold text-base text-gray-900">
                      {/* ✅ was: booking.totalPrice */}
                      PKR {booking.pricing?.grandTotal?.toLocaleString() || '0'}
                    </div>
                  )}
                  {/* Always show grand total below for on-hold too */}
                  <div className="text-xs text-gray-500 mt-1">
                    Total: PKR {booking.pricing?.grandTotal?.toLocaleString() || '0'}
                  </div>
                </td>

                {/* ── Status + Timer ── */}
                <td className="px-4 py-4 align-top border-r border-gray-300">
                  <div className="flex flex-col gap-2 items-center">
                    <span className={`inline-block px-3 py-1.5 rounded-md text-xs shadow-sm ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>

                    {(booking.status === 'on hold' || booking.status === 'pending') && (
                      <div className="flex flex-col gap-2 items-center text-xs">
                        <div className="font-bold text-gray-800">Booking Expiry Time</div>
                        {timers[booking._id]?.expired ? (
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
                      </div>
                    )}
                  </div>
                </td>

                {/* ── Actions ── */}
                <td className="py-4 align-middle text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex flex-row justify-center items-center gap-2 w-full">
                      {/* View Details */}
                      <button
                        onClick={() => navigate(`/umrah-booking-detail/${booking._id}`)}
                        className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-slate-200"
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>

                      {/* Delete — only for pending / on hold */}
                      {(booking.status === 'on hold' || booking.status === 'pending') && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) return
                            try {
                              setDeletingId(booking._id)
                              await axiosInstance.delete(`/bookings/${booking._id}`)
                              toast.success('Booking deleted successfully')
                              setBookings(prev => prev.filter(b => b._id !== booking._id))
                            } catch (err: any) {
                              toast.error(err.response?.data?.message || 'Failed to delete booking')
                            } finally {
                              setDeletingId(null)
                            }
                          }}
                          disabled={deletingId === booking._id}
                          className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-all shadow-sm hover:shadow-md border border-red-200 disabled:opacity-50"
                          title="Delete Booking"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
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

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function ManageUmrahQueriesN() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [bookings, setBookings] = useState<PackageBooking[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<{ sector: string; airline: string; fromDate: Date | null }>({
    sector: '',
    airline: '',
    fromDate: null,
  })
  const [uniqueSectors, setUniqueSectors] = useState<string[]>([])
  const [uniqueAirlines, setUniqueAirlines] = useState<string[]>([])
  const [timers, setTimers] = useState<Record<string, Timer>>({})

  // ✅ Pagination state — API returns pagination data, now tracked
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalBookings, setTotalBookings] = useState(0)

  const activeStatus = searchParams.get('status') || ''

  const statusOptions: StatusOption[] = [
    { value: 'on hold', label: 'On Hold', color: 'bg-yellow-50 text-yellow-700 border border-yellow-300' },
    { value: 'pending', label: 'Pending', color: 'bg-yellow-50 text-yellow-700 border border-yellow-300' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-green-50 text-green-700 border border-green-300' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-50 text-red-700 border border-red-300' },
  ]

  const getStatusBadge = (status: string): StatusOption =>
    statusOptions.find(o => o.value === status) ?? statusOptions[0]

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // ── Timer logic ──────────────────────────────────────────────────────────
  const calculateRemainingTime = (expiresAt: string | null): Timer => {
    if (!expiresAt) return { hours: 0, minutes: 0, seconds: 0, expired: true }
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true }
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      expired: false,
    }
  }

  useEffect(() => {
    const onHoldBookings = bookings.filter(
      b => (b.status === 'on hold' || b.status === 'pending') && b.expiresAt
    )
    if (onHoldBookings.length === 0) return

    const interval = setInterval(() => {
      const newTimers: Record<string, Timer> = {}
      onHoldBookings.forEach(b => { newTimers[b._id] = calculateRemainingTime(b.expiresAt) })
      setTimers(newTimers)
    }, 1000)

    return () => clearInterval(interval)
  }, [bookings])

  // ── Fetch — reset to page 1 when filters/status/search change ───────────
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, activeStatus, searchQuery])

  useEffect(() => {
    fetchBookings()
  }, [filters, activeStatus, searchQuery, currentPage])

  useEffect(() => {
    // ✅ Derive unique filter options from loaded bookings
    // sector is top-level, airline is nested under airline.name
    const sectors = [...new Set(bookings.map(b => b.sector).filter(Boolean))] as string[]
    const airlines = [...new Set(bookings.map(b => b.airline?.name).filter(Boolean))] as string[]
    setUniqueSectors(sectors.sort())
    setUniqueAirlines(airlines.sort())
  }, [bookings])

  const fetchBookings = async () => {
    try {
      setFetching(true)
      const params = new URLSearchParams({
        ...(activeStatus && { status: activeStatus }),
        ...(filters.sector && { sector: filters.sector }),
        ...(filters.airline && { airline: filters.airline }),
        ...(searchQuery && { search: searchQuery }),
        ...(filters.fromDate && { fromDate: format(filters.fromDate, 'yyyy-MM-dd') }),
        page: String(currentPage),          // ✅ send page param
      })

      const response = await axiosInstance.get('/bookings?groupType=Umrah Groups', { params })
      if (response.data.success) {
        setBookings(response.data.data)
        // ✅ Store pagination info
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages)
          setTotalBookings(response.data.pagination.totalBookings)
        }
      }
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setInitialLoading(false)
      setFetching(false)
    }
  }

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }))

  const resetFilters = () => {
    setSearchQuery('')
    setFilters({ sector: '', airline: '', fromDate: null })
    setCurrentPage(1)
    if (activeStatus) navigate('/all-package-bookings')
  }

  if (initialLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Umrah Bookings</h1>
        <p className="text-gray-600">
          Manage all umrah bookings
          {totalBookings > 0 && (
            <span className="ml-2 text-sm text-gray-400">({totalBookings} total)</span>
          )}
        </p>
      </div>

      {/* Status filter tabs */}
      {/* <div className="mb-4 flex gap-2 flex-wrap">
        {[
          { label: 'All', value: '' },
          ...statusOptions,
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => navigate(opt.value ? `/all-package-bookings?status=${opt.value}` : '/all-package-bookings')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeStatus === opt.value
              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div> */}

      {/* Filters */}
      <div className="mb-4 bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-50">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reference or contact name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ✅ Sector filter now populated from booking.sector */}
          <div className="w-full sm:w-auto min-w-37.5">
            <select
              value={filters.sector}
              onChange={(e) => handleFilterChange('sector', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sectors</option>
              {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* ✅ Airline filter now populated from booking.airline.name */}
          <div className="w-full sm:w-auto min-w-37.5">
            <select
              value={filters.airline}
              onChange={(e) => handleFilterChange('airline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Airlines</option>
              {uniqueAirlines.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="w-full sm:w-auto min-w-37.5">
            <MaskedDatePicker
              value={filters.fromDate}
              onChange={(date) => handleFilterChange('fromDate', date)}
              placeholderText="Dept Date"
              minDate={new Date()}
            />
          </div>

          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-medium border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden relative">
        {fetching && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
          />
        </div>
      </div>

      {/* ✅ Pagination controls — was completely missing */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} &nbsp;·&nbsp; {totalBookings} bookings
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || fetching}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>

            {/* Page number pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    disabled={fetching}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${currentPage === p
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                      : 'border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || fetching}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}