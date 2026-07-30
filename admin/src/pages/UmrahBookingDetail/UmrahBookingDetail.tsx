import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import axiosInstance from '../../Api/axios'

interface Passenger {
    type: string
    title: string
    givenName: string
    surName: string
    passport: string
    passportExpiry?: string
    dateOfBirth: string
    nationality?: string
    _id: string
}

interface Flight {
    flightNo: string
    flightDate: string
    depDate: string
    depTime: string
    origin: string
    destination: string
    arrDate: string
    arrTime: string
    baggage?: string
    meal?: string
    _id: string
}

interface Pricing {
    adultPrice: number
    childPrice: number
    infantPrice: number
    adultTotal: number
    childTotal: number
    infantTotal: number
    grandTotal: number
}

interface Airline {
    id: string | null
    name: string
    logoUrl: string | null
}

interface User {
    _id: string
    name: string
    email: string
    companyName: string
    agencyCode: string
}

interface Booking {
    _id: string
    bookingReference: string
    groupId: string
    groupType: string
    contactPersonName: string
    status: string
    adultsCount: number
    childrenCount: number
    infantsCount: number
    totalPassengers: number
    departureDate: string
    arrivalDate: string
    expiresAt: string | null
    createdAt: string
    updatedAt: string
    sector: string
    pnr: string
    notes: string
    airline: Airline
    pricing: Pricing
    userId: User
    passengers: Passenger[]
    flights: Flight[]
}

export default function UmrahBookingDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [booking, setBooking] = useState<Booking | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedStatus, setSelectedStatus] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        fetchBookingDetail()
    }, [id])

    const fetchBookingDetail = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await axiosInstance.get(`/bookings/${id}`)
            console.log(response)
            // New response structure: response.data.data
            const data = response.data?.data
            if (data) {
                setBooking(data)
                setSelectedStatus(data.status)
            } else {
                setError('Failed to load booking details')
            }
        } catch (err) {
            console.error('Error fetching booking:', err)
            setError('Failed to load booking details')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatTime = (timeStr: string | undefined) => {
        if (!timeStr) return 'N/A'
        return timeStr
    }

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            'on hold': 'border border-yellow-200 bg-yellow-50 text-yellow-700',
            'pending': 'border border-yellow-200 bg-yellow-50 text-yellow-700',
            'confirmed': 'border border-green-200 bg-green-50 text-green-700',
            'cancelled': 'border border-red-200 bg-red-50 text-red-700',
        }
        return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
    }

    const handleStatusChange = async () => {
        if (!booking || selectedStatus === booking.status) return
        try {
            setIsUpdating(true)
            const response = await axiosInstance.patch(`/bookings/${id}/status`, {
                status: selectedStatus,
            })
            const updated = response.data?.data
            if (updated) {
                setBooking(updated)
            } else {
                // If API doesn't return updated booking, just update status locally
                setBooking((prev) => prev ? { ...prev, status: selectedStatus } : prev)
            }
            alert('Booking status updated successfully!')
        } catch (err) {
            console.error('Error updating status:', err)
            alert('Failed to update booking status. Please try again.')
            setSelectedStatus(booking.status)
        } finally {
            setIsUpdating(false)
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

    return (
        <div className="w-full min-h-screen bg-gray-50">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Package Booking Details</h1>
                        <p className="text-gray-600 mt-1">
                            Reference:{' '}
                            <span className="font-semibold text-blue-600">{booking.bookingReference}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Back
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Status Update */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Status</h2>
                            <div className="flex items-center gap-4">
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="on hold">On Hold</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                <button
                                    onClick={handleStatusChange}
                                    disabled={selectedStatus === booking.status || isUpdating}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {isUpdating ? 'Updating...' : 'Update'}
                                </button>
                            </div>
                            <p className="text-gray-600 mt-4 text-sm">Created: {formatDate(booking.createdAt)}</p>
                            <p className="text-gray-600 text-sm">Expires: {formatDate(booking.expiresAt)}</p>
                        </div>

                        {/* Booking Information */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-600">Contact Person</label>
                                    <p className="text-gray-900 font-medium">{booking.contactPersonName || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Group Type</label>
                                    <p className="text-gray-900 font-medium">{booking.groupType || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Sector</label>
                                    <p className="text-gray-900 font-medium">{booking.sector || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Airline</label>
                                    <p className="text-gray-900 font-medium">{booking.airline?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">PNR</label>
                                    <p className="text-gray-900 font-medium">{booking.pnr || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Status</label>
                                    <p className={`font-medium px-3 py-1 rounded w-fit text-xs mt-1 ${getStatusColor(booking.status)}`}>
                                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Departure Date</label>
                                    <p className="text-gray-900 font-medium">{formatDate(booking.departureDate)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Arrival Date</label>
                                    <p className="text-gray-900 font-medium">{formatDate(booking.arrivalDate)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Booked By</label>
                                    <p className="text-gray-900 font-medium">{booking.userId?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Email</label>
                                    <p className="text-gray-900 font-medium">{booking.userId?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Company</label>
                                    <p className="text-gray-900 font-medium">{booking.userId?.companyName || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-600">Agency Code</label>
                                    <p className="text-gray-900 font-medium">{booking.userId?.agencyCode || 'N/A'}</p>
                                </div>
                            </div>
                            {booking.notes && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <label className="text-sm text-gray-600">Notes</label>
                                    <p className="text-gray-900 mt-1">{booking.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Passenger Breakdown */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Passenger Breakdown</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {booking.adultsCount || 0}
                                    </p>
                                    <p className="text-sm text-gray-600">Adults</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-green-600">
                                        {booking.childrenCount || 0}
                                    </p>
                                    <p className="text-sm text-gray-600">Children</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-purple-600">
                                        {booking.infantsCount || 0}
                                    </p>
                                    <p className="text-sm text-gray-600">Infants</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-gray-700">
                                    <span className="font-semibold">Total Passengers:</span> {booking.totalPassengers}
                                </p>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Breakdown</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Adult Price (per person)</span>
                                    <span className="font-medium text-blue-600">
                                        PKR {(booking.pricing?.adultPrice || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Child Price (per person)</span>
                                    <span className="font-medium text-blue-600">
                                        PKR {(booking.pricing?.childPrice || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Infant Price (per person)</span>
                                    <span className="font-medium text-blue-600">
                                        PKR {(booking.pricing?.infantPrice || 0).toLocaleString()}
                                    </span>
                                </div>

                                <div className="border-t border-gray-200 pt-3 mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-700">Adult Total</span>
                                        <span className="font-medium">
                                            PKR {(booking.pricing?.adultTotal || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-gray-700">Child Total</span>
                                        <span className="font-medium">
                                            PKR {(booking.pricing?.childTotal || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-gray-700">Infant Total</span>
                                        <span className="font-medium">
                                            PKR {(booking.pricing?.infantTotal || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-3 mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gray-900">Grand Total</span>
                                        <span className="text-lg font-bold text-blue-600">
                                            PKR {(booking.pricing?.grandTotal || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Passenger List */}
                        {booking.passengers && booking.passengers.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Passenger List</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nationality</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Passport No</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Passport Expiry</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">DOB</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {booking.passengers.map((passenger) => (
                                                <tr key={passenger._id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {passenger.title}. {passenger.givenName} {passenger.surName}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span
                                                            className={`px-2 py-1 rounded text-xs font-medium ${passenger.type?.toLowerCase() === 'adult'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : passenger.type?.toLowerCase() === 'child'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-purple-100 text-purple-800'
                                                                }`}
                                                        >
                                                            {passenger.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{passenger.nationality || 'N/A'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{passenger.passport || 'N/A'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(passenger.passportExpiry)}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(passenger.dateOfBirth)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Flight Details */}
                        {booking.flights && booking.flights.length > 0 && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
                                <div className="space-y-4">
                                    {booking.flights.map((flight, index) => (
                                        <div key={flight._id} className="border border-gray-200 rounded-lg p-4">
                                            <p className="font-semibold text-gray-900">
                                                Flight {index + 1}: {flight.flightNo} — {booking.airline?.name}
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                                                <div><span className="font-medium">From:</span> {flight.origin}</div>
                                                <div><span className="font-medium">To:</span> {flight.destination}</div>
                                                <div><span className="font-medium">Departure:</span> {formatDate(flight.depDate)} {formatTime(flight.depTime)}</div>
                                                <div><span className="font-medium">Arrival:</span> {formatDate(flight.arrDate)} {formatTime(flight.arrTime)}</div>
                                                <div><span className="font-medium">Flight Date:</span> {formatDate(flight.flightDate)}</div>
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
                        <div className="bg-white rounded-lg shadow p-6 sticky top-20">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <label className="text-gray-600">Reference</label>
                                    <p className="text-gray-900 font-medium">{booking.bookingReference}</p>
                                </div>
                                <div>
                                    <label className="text-gray-600">Status</label>
                                    <p className={`font-medium px-3 py-1 rounded w-fit text-xs mt-1 ${getStatusColor(booking.status)}`}>
                                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-gray-600">Group Type</label>
                                    <p className="text-gray-900 font-medium">{booking.groupType || 'N/A'}</p>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Sector</label>
                                    <p className="text-gray-900 font-medium">{booking.sector || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-gray-600">PNR</label>
                                    <p className="text-gray-900 font-medium">{booking.pnr || 'N/A'}</p>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Total Passengers</label>
                                    <p className="text-2xl font-bold text-gray-900">{booking.totalPassengers}</p>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Grand Total</label>
                                    <p className="text-2xl font-bold text-blue-600">
                                        PKR {(booking.pricing?.grandTotal || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Departure</label>
                                    <p className="text-gray-900">{formatDate(booking.departureDate)}</p>
                                </div>
                                <div>
                                    <label className="text-gray-600">Arrival</label>
                                    <p className="text-gray-900">{formatDate(booking.arrivalDate)}</p>
                                </div>
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="text-gray-600">Booked on</label>
                                    <p className="text-gray-900">{formatDate(booking.createdAt)}</p>
                                </div>
                                <div>
                                    <label className="text-gray-600">Expires</label>
                                    <p className="text-gray-900">{formatDate(booking.expiresAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}