import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axiosInstance from '../../api/axios'
import { toast } from 'react-toastify'

export default function EditBooking() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [booking, setBooking] = useState(null)
    const [formData, setFormData] = useState({
        contactPersonName: '',
        adultsCount: 0,
        childrenCount: 0,
        infantsCount: 0
    })

    useEffect(() => {
        fetchBooking()
    }, [id])

    const fetchBooking = async () => {
        try {
            const response = await axiosInstance.get(`/bookings/${id}`)
            if (response.data.success) {
                setBooking(response.data.data)
                setFormData({
                    contactPersonName: response.data.data.contactPersonName,
                    adultsCount: response.data.data.adultsCount,
                    childrenCount: response.data.data.childrenCount,
                    infantsCount: response.data.data.infantsCount
                })
            }
        } catch (error) {
            console.error('Error fetching booking:', error)
            toast.error('Failed to load booking')
            navigate('/dashboard/my-bookings')
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'contactPersonName' ? value : parseInt(value) || 0
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate passenger counts
        const totalPassengers = formData.adultsCount + formData.childrenCount + formData.infantsCount
        if (totalPassengers === 0) {
            toast.error('Please select at least one passenger')
            return
        }

        if (formData.adultsCount === 0) {
            toast.error('At least one adult is required')
            return
        }

        try {
            setSubmitting(true)
            const response = await axiosInstance.put(`/bookings/${id}`, formData)

            if (response.data.success) {
                toast.success('Booking updated successfully')
                navigate('/dashboard/my-bookings')
            }
        } catch (error) {
            console.error('Error updating booking:', error)
            toast.error(error.response?.data?.message || 'Failed to update booking')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading booking...</p>
                </div>
            </div>
        )
    }

    if (!booking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600 text-lg">Booking not found</p>
                </div>
            </div>
        )
    }

    // Only allow editing if booking is pending
    if (booking.status !== 'pending') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600 text-lg">Can only edit pending bookings</p>
                    <button
                        onClick={() => navigate('/dashboard/my-bookings')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Back to Bookings
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Booking</h1>
                    <p className="text-gray-600 mt-2">Booking Reference: {booking.bookingReference}</p>
                    <p className="text-sm text-gray-500 mt-1">Sector: {booking.sector}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Contact Person */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Person Name
                        </label>
                        <input
                            type="text"
                            name="contactPersonName"
                            value={formData.contactPersonName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Passenger Counts */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Adults
                            </label>
                            <input
                                type="number"
                                name="adultsCount"
                                value={formData.adultsCount}
                                onChange={handleInputChange}
                                min="1"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Children
                            </label>
                            <input
                                type="number"
                                name="childrenCount"
                                value={formData.childrenCount}
                                onChange={handleInputChange}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Infants
                            </label>
                            <input
                                type="number"
                                name="infantsCount"
                                value={formData.infantsCount}
                                onChange={handleInputChange}
                                min="0"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-2">Booking Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-blue-700">Total Passengers</p>
                                <p className="font-bold text-blue-900">
                                    {formData.adultsCount + formData.childrenCount + formData.infantsCount}
                                </p>
                            </div>
                            <div>
                                <p className="text-blue-700">Status</p>
                                <p className="font-bold text-yellow-600">Pending</p>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/my-bookings')}
                            className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
