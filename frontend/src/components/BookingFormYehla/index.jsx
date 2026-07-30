import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import axiosInstance from '../../api/axios'
import { toast } from 'react-toastify'

export default function BookingForm() {
    const navigate = useNavigate()
    const location = useLocation()
    const { id: bookingId } = useParams()
    const isEditMode = !!bookingId

    const [formData, setFormData] = useState({
        contactPersonName: '',
        adults: 1,
        children: 0,
        infants: 0,
        passengers: []
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingBooking, setLoadingBooking] = useState(isEditMode)
    const [existingBooking, setExistingBooking] = useState(null)
    const [groupData, setGroupData] = useState(location.state?.groupData || null)

    console.log('BookingForm loaded with groupData:', groupData, 'editMode:', isEditMode, 'bookingId:', bookingId)

    // Load existing booking if in edit mode
    useEffect(() => {
        if (isEditMode && bookingId) {
            fetchBookingForEdit()
        }
    }, [bookingId, isEditMode])

    const fetchBookingForEdit = async () => {
        try {
            setLoadingBooking(true)
            const response = await axiosInstance.get(`/bookings/${bookingId}`)

            if (response.data.success) {
                const booking = response.data.data

                // Check if booking can be edited
                if (booking.status !== 'pending') {
                    toast.error('Can only edit pending bookings')
                    navigate('/dashboard/my-bookings')
                    return
                }

                setExistingBooking(booking)

                // Reconstruct groupData from booking for display and pricing
                const reconstructedGroupData = {
                    id: booking.groupId,
                    type: booking.groupType,
                    airline: {
                        id: booking.airline?.id || null,
                        airline_name: booking.airline?.name || '',
                        logo_url: booking.airline?.logoUrl || ''
                    },
                    sector: booking.sector,
                    pnr: booking.pnr,
                    price: booking.pricing?.adultPrice || 0,
                    childPrice: booking.pricing?.childPrice || 0,
                    infantPrice: booking.pricing?.infantPrice || 0,
                    dept_date: booking.departureDate,
                    arv_date: booking.arrivalDate,
                    details: booking.flights?.map(flight => ({
                        flight_no: flight.flightNo,
                        flight_date: flight.flightDate,
                        dep_date: flight.depDate,
                        dept_time: flight.depTime,
                        origin: flight.origin,
                        destination: flight.destination,
                        arv_date: flight.arrDate,
                        arv_time: flight.arrTime,
                        baggage: flight.baggage,
                        meal: flight.meal
                    })) || [],
                    available_no_of_pax: 50 // Set a high limit for editing
                }

                setGroupData(reconstructedGroupData)

                // Convert date strings to YYYY-MM-DD format for date inputs
                const formattedPassengers = booking.passengers?.map(passenger => ({
                    ...passenger,
                    dateOfBirth: passenger.dateOfBirth ? new Date(passenger.dateOfBirth).toISOString().split('T')[0] : '',
                    passportExpiry: passenger.passportExpiry ? new Date(passenger.passportExpiry).toISOString().split('T')[0] : ''
                })) || []

                setFormData({
                    contactPersonName: booking.contactPersonName,
                    adults: booking.adultsCount,
                    children: booking.childrenCount,
                    infants: booking.infantsCount,
                    passengers: formattedPassengers
                })
            }
        } catch (error) {
            console.error('Error fetching booking:', error)
            toast.error('Failed to load booking')
            navigate('/dashboard/my-bookings')
        } finally {
            setLoadingBooking(false)
        }
    }

    const totalPassengers = (parseInt(formData.adults) || 0) + (parseInt(formData.children) || 0) + (parseInt(formData.infants) || 0)

    // Helper functions to check if prices are available
    const isChildPriceAvailable = () => {
        const price = groupData?.childPrice
        return price !== null && price !== undefined && price !== 0
    }

    const isInfantPriceAvailable = () => {
        const price = groupData?.infantPrice
        return price !== null && price !== undefined && price !== 0
    }

    // Initialize passenger array when counts change
    useEffect(() => {
        const currentPassengers = formData.passengers || []
        const targetAdults = parseInt(formData.adults) || 0
        const targetChildren = parseInt(formData.children) || 0
        const targetInfants = parseInt(formData.infants) || 0

        const passengers = []

        // Add adults - preserve existing data if available
        for (let i = 0; i < targetAdults; i++) {
            const existing = currentPassengers.find((p, idx) => p.type === 'Adult' && currentPassengers.filter((x, xIdx) => xIdx < idx && x.type === 'Adult').length === i)
            passengers.push(existing || {
                type: 'Adult',
                title: 'Mr',
                givenName: '',
                surName: '',
                passport: '',
                dateOfBirth: '',
                passportExpiry: ''
            })
        }

        // Add children - preserve existing data if available (only if price available in create mode)
        if (!isEditMode || isChildPriceAvailable()) {
            for (let i = 0; i < targetChildren; i++) {
                const existing = currentPassengers.find((p, idx) => p.type === 'Child' && currentPassengers.filter((x, xIdx) => xIdx < idx && x.type === 'Child').length === i)
                passengers.push(existing || {
                    type: 'Child',
                    title: 'Mr',
                    givenName: '',
                    surName: '',
                    passport: '',
                    dateOfBirth: '',
                    passportExpiry: ''
                })
            }
        }

        // Add infants - preserve existing data if available (only if price available in create mode)
        if (!isEditMode || isInfantPriceAvailable()) {
            for (let i = 0; i < targetInfants; i++) {
                const existing = currentPassengers.find((p, idx) => p.type === 'Infant' && currentPassengers.filter((x, xIdx) => xIdx < idx && x.type === 'Infant').length === i)
                passengers.push(existing || {
                    type: 'Infant',
                    title: 'INF',
                    givenName: '',
                    surName: '',
                    passport: '',
                    dateOfBirth: '',
                    passportExpiry: ''
                })
            }
        }

        setFormData(prev => ({ ...prev, passengers }))
    }, [formData.adults, formData.children, formData.infants, isEditMode])

    // Helper function to validate passenger input
    const validatePassengerInput = (name, value) => {
        // Allow empty string during editing
        if (value === '') return true
        
        const numValue = parseInt(value)
        
        // Block negative values
        if (numValue < 0) return false
        
        // Adults must be at least 1
        if (name === 'adults' && numValue === 0) return false
        
        return true
    }

    // Helper function to get default passenger value
    const getDefaultPassengerValue = (name) => {
        return name === 'adults' ? 1 : 0
    }

    // Helper function to validate seat limits
    const validateSeatLimit = (adults, children) => {
        if (isEditMode) return true
        
        const totalSeats = adults + children
        const availableSeats = groupData?.available_no_of_pax || 0
        
        return totalSeats <= availableSeats
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        
        // Validate passenger count fields
        if (['adults', 'children', 'infants'].includes(name)) {
            if (!validatePassengerInput(name, value)) {
                return // Block invalid input
            }
        }
        
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handlePassengerBlur = (e) => {
        const { name, value } = e.target
        
        // Not a passenger field
        if (!['adults', 'children', 'infants'].includes(name)) return
        
        // Set default if empty or invalid
        if (value === '' || parseInt(value) < 0 || (name === 'adults' && parseInt(value) === 0)) {
            const defaultValue = getDefaultPassengerValue(name)
            setFormData(prev => ({ ...prev, [name]: defaultValue }))
            return
        }
        
        // Validate seat limit for adults and children (excluding infants)
        if (!isEditMode && (name === 'adults' || name === 'children')) {
            const adults = name === 'adults' ? parseInt(value) : (parseInt(formData.adults) || 0)
            const children = name === 'children' ? parseInt(value) : (parseInt(formData.children) || 0)
            
            if (!validateSeatLimit(adults, children)) {
                const totalSeats = adults + children
                const availableSeats = groupData?.available_no_of_pax || 0
                
                toast.error(
                    `Seats not available! You selected ${totalSeats} seats but only ${availableSeats} are available.`,
                    { toastId: 'seat-limit-error' }
                )
                
                // Reset to default value
                const defaultValue = getDefaultPassengerValue(name)
                setFormData(prev => ({ ...prev, [name]: defaultValue }))
                e.target.focus()
            }
        }
    }

    const handlePassengerChange = (index, field, value) => {
        setFormData(prev => {
            const newPassengers = [...prev.passengers]
            newPassengers[index] = { ...newPassengers[index], [field]: value }
            return { ...prev, passengers: newPassengers }
        })
    }

    const calculateTotalPrice = () => {
        if (!groupData?.price) return 0
        const adultPrice = groupData.price || 0
        const childPrice = groupData.childPrice || groupData.price || 0
        const infantPrice = groupData.infantPrice || (groupData.price * 0.24) || 0
        
        return (
            (parseInt(formData.adults) || 0) * adultPrice +
            (parseInt(formData.children) || 0) * childPrice +
            (parseInt(formData.infants) || 0) * infantPrice
        )
    }

    const calculateAdultTotal = () => (parseInt(formData.adults) || 0) * (groupData?.price || 0)
    const calculateChildTotal = () => (parseInt(formData.children) || 0) * (groupData?.childPrice || groupData?.price || 0)
    const calculateInfantTotal = () => (parseInt(formData.infants) || 0) * (groupData?.infantPrice || ((groupData?.price || 0) * 0.24))

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (isEditMode) {
            // Edit mode - simplified update
            return handleUpdate()
        }

        // Validate passenger count excluding infants
        const payingPassengers = (parseInt(formData.adults) || 0) + (parseInt(formData.children) || 0)
        if (payingPassengers > (groupData?.available_no_of_pax || 0)) {
            toast.error(`Adults and Children (${payingPassengers}) cannot exceed available seats (${groupData?.available_no_of_pax || 0})`)
            return
        }

        // Validate all passenger details are filled
        const hasEmptyFields = formData.passengers.some(passenger =>
            !passenger.givenName ||
            !passenger.surName ||
            !passenger.passport ||
            !passenger.dateOfBirth ||
            !passenger.passportExpiry
        )

        if (hasEmptyFields) {
            toast.error('Please fill in all passenger details')
            return
        }

        setIsSubmitting(true)

        try {
            // Prepare booking data according to API schema
            const bookingData = {
                groupId: groupData.id,
                groupType: groupData.type,
                airline: {
                    id: groupData.airline?.id || null,
                    name: groupData.airline?.airline_name || '',
                    logoUrl: groupData.airline?.logo_url || ''
                },
                sector: groupData.sector,
                pnr: groupData.pnr || '',
                contactPersonName: formData.contactPersonName,
                adultsCount: parseInt(formData.adults),
                childrenCount: parseInt(formData.children),
                infantsCount: parseInt(formData.infants),
                totalPassengers: totalPassengers,
                pricing: {
                    adultPrice: groupData.price || 0,
                    childPrice: groupData.childPrice || 0,
                    infantPrice: groupData.infantPrice || (groupData.price * 0.24) || 0,
                    adultTotal: calculateAdultTotal(),
                    childTotal: calculateChildTotal(),
                    infantTotal: Math.round(calculateInfantTotal()),
                    grandTotal: Math.round(calculateTotalPrice())
                },
                passengers: formData.passengers,
                flights: groupData.details?.map(flight => ({
                    flightNo: flight.flight_no,
                    flightDate: flight.flight_date,
                    depDate: flight.dep_date,
                    depTime: flight.dept_time,
                    origin: flight.origin,
                    destination: flight.destination,
                    arrDate: flight.arv_date,
                    arrTime: flight.arv_time,
                    baggage: flight.baggage,
                    meal: flight.meal
                })) || [],
                departureDate: groupData.dept_date,
                arrivalDate: groupData.arv_date
            }

            console.log('Submitting booking data:', bookingData)

            const response = await axiosInstance.post('/bookings', bookingData)

            if (response.data.success) {
                toast.success(`Booking confirmed! Reference: ${response.data.data.bookingReference}`)
                // Navigate to bookings page or show confirmation
                setTimeout(() => {
                    navigate('/dashboard/all-groups', {
                        state: {
                            bookingSuccess: true,
                            bookingReference: response.data.data.bookingReference
                        }
                    })
                }, 1500)
            }
        } catch (error) {
            console.error('Error creating booking:', error)
            const errorMessage = error.response?.data?.message || 'Failed to create booking. Please try again.'
            toast.error(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdate = async () => {
        setIsSubmitting(true)

        try {
            const updateData = {
                contactPersonName: formData.contactPersonName,
                adultsCount: parseInt(formData.adults),
                childrenCount: parseInt(formData.children),
                infantsCount: parseInt(formData.infants),
                passengers: formData.passengers,
                // Recalculate pricing based on new passenger counts
                pricing: {
                    adultPrice: groupData?.price || 0,
                    childPrice: groupData?.childPrice || 0,
                    infantPrice: groupData?.infantPrice || 0,
                    adultTotal: calculateAdultTotal(),
                    childTotal: calculateChildTotal(),
                    infantTotal: Math.round(calculateInfantTotal()),
                    grandTotal: Math.round(calculateTotalPrice())
                }
            }

            console.log('Updating booking:', updateData)

            const response = await axiosInstance.put(`/bookings/${bookingId}`, updateData)

            if (response.data.success) {
                toast.success('Booking updated successfully')
                setTimeout(() => {
                    navigate('/dashboard/my-bookings')
                }, 1500)
            }
        } catch (error) {
            console.error('Error updating booking:', error)
            const errorMessage = error.response?.data?.message || 'Failed to update booking'
            toast.error(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!groupData && !isEditMode) {
        return (
            <div className="w-full min-h-screen bg-gray-50 py-8 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">No flight data available</p>
                    <button
                        onClick={() => navigate('/dashboard/all-groups')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Back to Flights
                    </button>
                </div>
            </div>
        )
    }

    if (loadingBooking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading booking...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen">
            <div className="mx-auto p-6">
                {/* Header with close button */}
                <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-white">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                {isEditMode ? 'Edit Booking' : 'Book Seats'}
                            </h2>
                            {!isEditMode && groupData && (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    <span className="text-gray-700">
                                        <span className="font-semibold">Group:</span> <span className="text-blue-600">{groupData.airline?.airline_name}-{groupData.sector}</span>
                                    </span>
                                    {
                                        groupData.showSeat && (
                                            <span className="text-gray-700">
                                                <span className="font-semibold">Available Seats:</span> <span className="text-green-600 font-semibold">{groupData.available_no_of_pax || 0}</span>
                                            </span>
                                        )
                                    }
                                    <span className="text-gray-700">
                                        <span className="font-semibold">Sector:</span> {groupData.sector}
                                    </span>
                                </div>
                            )}
                            {isEditMode && existingBooking && (
                                <div className="text-sm text-gray-600">
                                    <span className="font-semibold">Reference:</span> {existingBooking.bookingReference} |
                                    <span className="font-semibold ml-2">Sector:</span> {existingBooking.sector}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => navigate(isEditMode ? '/dashboard/my-bookings' : '/dashboard/all-groups')}
                            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
                            title="Close"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Airline Info */}
                    {groupData && (
                        <div className="px-6 py-4 flex items-center justify-between bg-linear-to-r from-gray-50 to-white border-b border-gray-200">
                            <div className="flex items-center gap-4">
                                {groupData.airline?.logo_url && (
                                    // <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                                        <img src={groupData.airline.logo_url} alt={groupData.airline.airline_name} className="w-28" />
                                    // </div>
                                )}
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Airline</p>
                                    <p className="font-bold text-gray-900 text-lg">{groupData.airline?.airline_name}</p>
                                </div>
                            </div>
                            <div className="text-right bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Departure Date</p>
                                <p className="font-bold text-green-600 text-base">
                                    {new Date(groupData.dept_date).toLocaleDateString('en-GB', {
                                        weekday: 'short',
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Sector Details */}
                    {groupData && (
                        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
                            <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                                Flight Details <span className="text-green-600">({groupData.sector})</span>
                            </p>
                            {groupData.details && groupData.details.length > 0 && (
                                <div className="space-y-1">
                                    {groupData.details.map((flight, idx) => (
                                        <div key={idx} className="text-sm text-gray-900 bg-white px-3 py-2 rounded shadow-sm">
                                            <span className="font-semibold text-blue-600">{idx + 1})</span> {flight.flight_no} <span className="text-gray-500">•</span> {new Date(flight.flight_date).toLocaleDateString('en-GB').replace(/\//g, '')} <span className="text-gray-500">•</span> {flight.origin} → {flight.destination} <span className="text-gray-500">•</span> {flight.dept_time?.substring(0, 5)} - {flight.arv_time?.substring(0, 5)} <span className="text-gray-500">•</span> {flight.baggage || '20-7'} KG
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white border border-gray-300 rounded-lg shadow-sm mt-6">
                    {/* Contact Person Name */}
                    <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            Contact Person Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="contactPersonName"
                            value={formData.contactPersonName}
                            onChange={handleChange}
                            required
                            className="w-full max-w-md px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                            placeholder="Enter contact person name"
                        />
                    </div>

                    {/* Passengers and Pricing Grid */}
                    <div className="px-6 py-6 border-b border-gray-200">
                        <h3 className="text-base font-bold text-gray-900 mb-4">Passenger & Pricing Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Passengers Column */}
                            <div className="bg-white rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                                <div className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] text-white px-4 py-3 font-semibold text-sm">
                                    👥 Passengers
                                </div>
                                <div>
                                    <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                        <span className="text-sm font-medium text-gray-700">Adults:</span>
                                        <input
                                            type="number"
                                            name="adults"
                                            value={formData.adults}
                                            onChange={handleChange}
                                            onBlur={handlePassengerBlur}
                                            min="1"
                                            className="w-20 px-3 py-1 bg-gray-50 border border-gray-300 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    {(isEditMode || isChildPriceAvailable()) && (
                                        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                            <span className="text-sm font-medium text-gray-700">Children:</span>
                                            <input
                                                type="number"
                                                name="children"
                                                value={formData.children}
                                                onChange={handleChange}
                                                onBlur={handlePassengerBlur}
                                                min="0"
                                                className="w-20 px-3 py-1 bg-gray-50 border border-gray-300 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    )}
                                    {(isEditMode || isInfantPriceAvailable()) && (
                                        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                            <span className="text-sm font-medium text-gray-700">Infants:</span>
                                            <input
                                                type="number"
                                                name="infants"
                                                value={formData.infants}
                                                onChange={handleChange}
                                                onBlur={handlePassengerBlur}
                                                min="0"
                                                className="w-20 px-3 py-1 bg-gray-50 border border-gray-300 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    )}

                                    <div className="px-4 py-3 bg-blue-50 rounded-b-lg">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-900">Total</span>
                                            <span className="text-lg font-black text-blue-600">{totalPassengers}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price/Seat Column */}
                            <div className="bg-white rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                                <div className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] text-white px-4 py-3 font-semibold text-sm">
                                    💰 Price/Seat
                                </div>
                                <div>
                                    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                                        <span className="text-sm font-medium text-gray-700">Adult</span>
                                        <span className="text-sm font-semibold text-gray-900">{groupData?.price?.toLocaleString() || 0}</span>
                                    </div>
                                    {isChildPriceAvailable() && (
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                                            <span className="text-sm font-medium text-gray-700">Child</span>
                                            <span className="text-sm font-semibold text-gray-900">{groupData?.childPrice?.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {isInfantPriceAvailable() && (
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                                            <span className="text-sm font-medium text-gray-700">Infant</span>
                                            <span className="text-sm font-semibold text-gray-900">{groupData?.infantPrice?.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Total Price Column */}
                            <div className="bg-white rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                                <div className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] text-white px-4 py-3 font-semibold text-sm">
                                    📊 Total Price
                                </div>
                                <div>
                                    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                                        <span className="text-sm font-medium text-gray-700">Adults</span>
                                        <span className="text-sm font-bold text-green-600">{calculateAdultTotal().toLocaleString()}</span>
                                    </div>
                                    {isChildPriceAvailable() && (
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                                            <span className="text-sm font-medium text-gray-700">Children</span>
                                            <span className="text-sm font-bold text-green-600">{calculateChildTotal().toLocaleString()}</span>
                                        </div>
                                    )}
                                    {isInfantPriceAvailable() && (
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                                            <span className="text-sm font-medium text-gray-700">Infants</span>
                                            <span className="text-sm font-bold text-green-600">{Math.round(calculateInfantTotal()).toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="px-4 py-3 bg-linear-to-r from-green-50 to-blue-50 border-t-2 border-green-400 rounded-b-lg">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-900">Grand Total</span>
                                            <span className="text-lg font-black text-green-600">{`PKR ${Math.round(calculateTotalPrice()).toLocaleString()}`}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Passenger Details Table */
                        <div className="px-6 py-6">
                            <h3 className="text-base font-bold text-gray-900 mb-4">Passenger Details</h3>
                            <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
                                <table className="w-full border-collapse bg-white">
                                    <thead>
                                        <tr className="bg-linear-to-r from-gray-100 to-gray-50">
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Passenger</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Title</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Given Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Surname</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Passport #</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">Date of Birth</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Passport Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {formData.passengers.map((passenger, index) => {
                                            let passengerLabel = ''
                                            if (passenger.type === 'Adult') {
                                                const adultNum = formData.passengers.slice(0, index + 1).filter(p => p.type === 'Adult').length
                                                passengerLabel = `Adults ${adultNum}`
                                            } else if (passenger.type === 'Child') {
                                                const childNum = formData.passengers.slice(0, index + 1).filter(p => p.type === 'Child').length
                                                passengerLabel = `Child ${childNum}`
                                            } else if (passenger.type === 'Infant') {
                                                const infantNum = formData.passengers.slice(0, index + 1).filter(p => p.type === 'Infant').length
                                                passengerLabel = `Infants ${infantNum}`
                                            }

                                            return (
                                                <tr key={index} className="hover:bg-blue-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200 bg-linear-to-r from-blue-50 to-white">
                                                        {passengerLabel}
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-gray-200">
                                                        <select
                                                            value={passenger.title}
                                                            onChange={(e) => handlePassengerChange(index, 'title', e.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        >
                                                            {passenger.type === 'Infant' ? (
                                                                <option value="INF">INF</option>
                                                            ) : (
                                                                <>
                                                                    <option value="Mr">Mr</option>
                                                                    <option value="Mrs">Mrs</option>
                                                                    <option value="Ms">Ms</option>
                                                                </>
                                                            )}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-gray-200">
                                                        <input
                                                            type="text"
                                                            value={passenger.givenName}
                                                            onChange={(e) => handlePassengerChange(index, 'givenName', e.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="Given name"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-gray-200">
                                                        <input
                                                            type="text"
                                                            value={passenger.surName}
                                                            onChange={(e) => handlePassengerChange(index, 'surName', e.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="Surname"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-gray-200">
                                                        <input
                                                            type="text"
                                                            value={passenger.passport}
                                                            onChange={(e) => handlePassengerChange(index, 'passport', e.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                            placeholder="Passport"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-gray-200">
                                                        <input
                                                            type="date"
                                                            value={passenger.dateOfBirth}
                                                            onChange={(e) => handlePassengerChange(index, 'dateOfBirth', e.target.value)}
                                                            max={new Date().toISOString().split('T')[0]}
                                                            onClick={(e) => e.target.showPicker?.()}
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                                            title="Click to select date of birth"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="date"
                                                            value={passenger.passportExpiry}
                                                            onChange={(e) => handlePassengerChange(index, 'passportExpiry', e.target.value)}
                                                            min={new Date().toISOString().split('T')[0]}
                                                            onClick={(e) => e.target.showPicker?.()}
                                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                                            title="Click to select passport expiry date"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    }
                    {/* Action Buttons */}
                    <div className="px-6 py-5 bg-linear-to-r from-gray-50 to-white border-t border-gray-200 rounded-b-lg flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/all-groups')}
                            disabled={isSubmitting}
                            className={`px-8 py-3 border-2 rounded-lg font-semibold shadow-sm flex items-center gap-2 transform transition-all duration-300
                                ${isSubmitting
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:scale-105 hover:shadow-md active:scale-95'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-10 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transform transition-all duration-300
                                ${isSubmitting
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] text-white hover:from-[#2d5a8f] hover:to-[#1e3a5f] hover:scale-105 hover:shadow-2xl active:scale-95'
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {isEditMode ? 'Update Booking' : 'Confirm Booking'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}