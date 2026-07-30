// import { useState, useEffect } from "react";
// import axiosInstance from "../../api/axios";
// import MaskedDatePicker from "../../components/MaskedDatePicker";
// import TopBar from "../../components/TopBar/TopBar";

// const Payment = () => {
//   // Get current year for default date filter
//   const getCurrentYearStart = () => {
//     const now = new Date();
//     return `${now.getFullYear()}-01-01`;
//   };

//   // Form States
//   const [formData, setFormData] = useState({
//     date: new Date().toISOString().split("T")[0],
//     description: "",
//     bankAccount: "",
//     amount: "",
//     receipt: null,
//     booking: "",
//   });

//   // Filter States
//   const [filters, setFilters] = useState({
//     dateFrom: getCurrentYearStart(),
//     dateTo: new Date().toISOString().split("T")[0],
//     status: "All",
//   });

//   // Data States
//   const [payments, setPayments] = useState([]);
//   const [banks, setBanks] = useState([]);
//   const [bookings, setBookings] = useState([]);
//   const [initialLoading, setInitialLoading] = useState(true);
//   const [fetching, setFetching] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState(null);
//   const [total, setTotal] = useState(0);

//   // Fetch banks for dropdown
//   const fetchBanks = async () => {
//     try {
//       const response = await axiosInstance.get("/bank");
//       if (response.data.success) {
//         setBanks(response.data.data);
//       }
//     } catch (error) {
//       console.error("Error fetching banks:", error);
//     }
//   };

//   // Fetch user's bookings
//   const fetchBookings = async () => {
//     try {
//       const response = await axiosInstance.get("/bookings");

//       if (response.data.success) {
//         setBookings(response.data.data || []);
//       }
//     } catch (error) {
//       console.error("Error fetching bookings:", error);
//     }
//   };

//   // Fetch payments based on filters
//   const fetchPayments = async () => {
//     try {
//       setFetching(true);
//       setError(null);

//       const response = await axiosInstance.get("/payment", {
//         params: {
//           dateFrom: filters.dateFrom,
//           dateTo: filters.dateTo,
//           status: filters.status,
//         },
//       });

//       if (response.data.success) {
//         setPayments(response.data.data);
//         setTotal(response.data.total);
//       }
//     } catch (error) {
//       console.error("Error fetching payments:", error);
//       setError("Failed to fetch payments");
//     } finally {
//       setFetching(false);
//       setInitialLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchBanks();
//     fetchBookings();
//     fetchPayments();
//   }, []);

//   // Handle form input changes
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;

//     if (name === "amount") {
//       // Remove any non-digit characters except decimal point
//       const numericValue = value.replace(/[^0-9.]/g, "");
//       setFormData((prev) => ({
//         ...prev,
//         [name]: numericValue,
//       }));
//     } else {
//       setFormData((prev) => ({
//         ...prev,
//         [name]: value,
//       }));
//     }
//   };

//   // Handle file upload
//   const handleFileChange = (e) => {
//     setFormData((prev) => ({
//       ...prev,
//       receipt: e.target.files[0],
//     }));
//   };

//   // Handle filter changes
//   const handleFilterChange = (e) => {
//     const { name, value } = e.target;
//     setFilters((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // Validation
//     if (
//       !formData.date ||
//       !formData.description ||
//       !formData.bankAccount ||
//       !formData.amount
//     ) {
//       alert("Please fill in all required fields");
//       return;
//     }

//     try {
//       setSubmitting(true);
//       const submitData = new FormData();
//       submitData.append("date", formData.date);
//       submitData.append("description", formData.description);
//       submitData.append("bankAccount", formData.bankAccount);
//       submitData.append("amount", formData.amount);
//       submitData.append("status", "Un Posted");

//       if (formData.booking) {
//         submitData.append("booking", formData.booking);
//       }

//       if (formData.receipt) {
//         submitData.append("receipt", formData.receipt);
//       }

//       const response = await axiosInstance.post("/payment/add", submitData, {
//         headers: {
//           "Content-Type": "multipart/form-data",
//         },
//       });

//       if (response.data.success) {
//         alert("Payment added successfully!");
//         // Reset form
//         setFormData({
//           date: new Date().toISOString().split("T")[0],
//           description: "",
//           bankAccount: "",
//           amount: "",
//           receipt: null,
//           booking: "",
//         });
//         // Reset file input
//         document.querySelector('input[type="file"]').value = "";
//         // Refresh payments list
//         fetchPayments();
//       }
//     } catch (error) {
//       console.error("Error adding payment:", error);
//       alert(error.response?.data?.message || "Failed to add payment");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // Handle filter button click
//   const handleFilter = () => {
//     fetchPayments();
//   };

//   // Format currency
//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat("en-PK", {
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(amount);
//   };

//   // Format date
//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     const day = date.getDate();
//     const month = date.toLocaleDateString("en-GB", { month: "short" });
//     const year = date.getFullYear();
//     return `${day} ${month} ${year}`;
//   };

//   if (initialLoading) {
//     return (
//       <div className="w-full min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Loading payments...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full min-h-screen mx-auto px-2 sm:px-4 md:px-0">
//       {/* Header */}
//       <TopBar title={"Add Payments"} />

//       {/* Add Payment Form */}
//       <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
//         <form onSubmit={handleSubmit}>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
//             {/* Date */}
//             <div>
//               <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
//                 Date
//               </label>
//               {/* <input
//                   type="date"
//                   name="date"
//                   value={formData.date}
//                   onChange={handleInputChange}
//                   className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 /> */}

//               <MaskedDatePicker
//                 value={formData.date}
//                 onChange={(date) => setFormData({ ...formData, date })}
//                 minDate={new Date()}
//               />
//             </div>

//             {/* Description */}
//             <div>
//               <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
//                 Description
//               </label>
//               <input
//                 type="text"
//                 name="description"
//                 value={formData.description}
//                 onChange={handleInputChange}
//                 placeholder="Enter description"
//                 className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>

//             {/* Bank Account */}
//             <div>
//               <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
//                 Bank Account
//               </label>
//               <select
//                 name="bankAccount"
//                 value={formData.bankAccount}
//                 onChange={handleInputChange}
//                 className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               >
//                 <option value="">Select Account</option>
//                 {banks.map((bank) => (
//                   <option key={bank._id} value={bank._id}>
//                     {bank.bankName} - {bank.accountNo}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Booking */}
//             <div>
//               <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
//                 Booking
//               </label>
//               <select
//                 name="booking"
//                 value={formData.booking}
//                 onChange={handleInputChange}
//                 className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="">Select Booking</option>
//                 {bookings.map((booking) => (
//                   <option key={booking._id} value={booking._id}>
//                     {booking.bookingReference} - {booking.sector || "N/A"}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Amount */}
//             <div>
//               <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
//                 Amount
//               </label>
//               <input
//                 type="text"
//                 name="amount"
//                 value={
//                   formData.amount
//                     ? parseFloat(formData.amount).toLocaleString("en-US", {
//                         minimumFractionDigits: 0,
//                         maximumFractionDigits: 2,
//                       })
//                     : ""
//                 }
//                 onChange={handleInputChange}
//                 placeholder="Enter amount"
//                 className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//           </div>

//           {/* Upload Image */}
//           <div className="mb-3 sm:mb-4">
//             <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
//               Upload Image
//             </label>
//             <input
//               type="file"
//               accept="image/*"
//               onChange={handleFileChange}
//               className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           {/* Submit Button */}
//           <div className="flex justify-end">
//             <button
//               type="submit"
//               disabled={submitting}
//               className="w-full sm:w-auto px-4 sm:px-8 py-2 sm:py-3 bg-linear-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 hover:scale-105 active:scale-95 transition-all duration-300 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//             >
//               {submitting ? "Submitting..." : "Submit"}
//             </button>
//           </div>
//         </form>
//       </div>

//       {/* Filters Section */}
//       <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
//         <div className="flex justify-between items-center mb-3 sm:mb-4">
//           <h3 className="text-base sm:text-lg font-semibold text-gray-900">
//             Filters
//           </h3>
//           <button
//             onClick={() => {
//               setFilters({
//                 dateFrom: getCurrentYearStart(),
//                 dateTo: new Date().toISOString().split("T")[0],
//                 status: "All",
//               });
//               fetchPayments();
//             }}
//             className="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
//           >
//             Reset All
//           </button>
//         </div>
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//           {/* Date From */}
//           <div>
//             <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
//               Date From
//             </label>
//             {/* <input
//                 type="date"
//                 name="dateFrom"
//                 value={filters.dateFrom}
//                 onChange={handleFilterChange}
//                 className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               /> */}

//             <MaskedDatePicker
//               value={filters.dateFrom}
//               onChange={(date) => setFilters({ ...filters, dateFrom: date })}
//             />
//           </div>

//           {/* Date To */}
//           <div>
//             <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
//               Date To
//             </label>
//             {/* <input
//               type="date"
//               name="dateTo"
//               value={filters.dateTo}
//               onChange={handleFilterChange}
//               className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             /> */}
//             <MaskedDatePicker
//               value={filters.dateTo}
//               onChange={(date) => setFilters({ ...filters, dateTo: date })}
//             />
//           </div>

//           {/* Status */}
//           <div>
//             <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
//               Status
//             </label>
//             <select
//               name="status"
//               value={filters.status}
//               onChange={handleFilterChange}
//               className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="All">All</option>
//               <option value="Posted">Posted</option>
//               <option value="Un Posted">Un Posted</option>
//             </select>
//           </div>

//           {/* Filter Button */}
//           <div className="flex items-end">
//             <button
//               onClick={handleFilter}
//               disabled={fetching}
//               className="w-full px-3 sm:px-4 py-2 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 hover:scale-105 active:scale-95 transition-all duration-300 text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
//             >
//               Apply Filters
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Payments Table */}
//       <div className="bg-white rounded-lg shadow overflow-hidden relative">
//         {error && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//             {error}
//           </div>
//         )}

//         {fetching && (
//           <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
//             <div className="text-center">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
//               <p className="mt-2 text-sm text-gray-600">Loading...</p>
//             </div>
//           </div>
//         )}

//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f]">
//               <tr>
//                 <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
//                   #
//                 </th>
//                 <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
//                   Voucher Id
//                 </th>
//                 <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
//                   Date
//                 </th>
//                 <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
//                   Description
//                 </th>
//                 <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
//                   Amount
//                 </th>
//                 <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
//                   Status
//                 </th>
//                 <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
//                   Remarks
//                 </th>
//                 <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
//                   Receipt
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {payments.length === 0 ? (
//                 <tr>
//                   <td
//                     colSpan="8"
//                     className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm text-gray-500"
//                   >
//                     No payments found
//                   </td>
//                 </tr>
//               ) : (
//                 payments.map((payment, index) => (
//                   <tr key={payment._id} className="hover:bg-gray-50">
//                     <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
//                       {index + 1}
//                     </td>
//                     <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
//                       {payment.voucherId}
//                     </td>
//                     <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
//                       {formatDate(payment.date)}
//                     </td>
//                     <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-gray-900">
//                       <div
//                         className="max-w-xs truncate"
//                         title={payment.description}
//                       >
//                         {payment.description}
//                       </div>
//                     </td>
//                     <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
//                       {formatCurrency(payment.amount)}
//                     </td>
//                     <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
//                       <span
//                         className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
//                           payment.status === "Posted"
//                             ? "bg-green-100 text-green-800"
//                             : payment.status === "Pending"
//                               ? "bg-yellow-100 text-yellow-800"
//                               : "bg-red-100 text-red-800"
//                         }`}
//                       >
//                         {payment.status}
//                       </span>
//                     </td>
//                     <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-gray-900">
//                       <div
//                         className="max-w-xs truncate"
//                         title={payment.remarks || "-"}
//                       >
//                         {payment.remarks || "-"}
//                       </div>
//                     </td>
//                     <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
//                       {payment.receipt ? (
//                         <a
//                           href={payment.receipt}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="text-blue-600 hover:underline"
//                         >
//                           View
//                         </a>
//                       ) : (
//                         <span className="text-gray-400">-</span>
//                       )}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Total Section */}
//         <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
//           <div className="flex justify-end">
//             <div className="text-right">
//               <span className="text-xs sm:text-sm font-semibold text-gray-700 mr-2 sm:mr-4">
//                 Total:
//               </span>
//               <span className="text-base sm:text-lg font-bold text-gray-900">
//                 PKR: {formatCurrency(total)}
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Payment;

import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../../api/axios";
import MaskedDatePicker from "../../components/MaskedDatePicker";
import TopBar from "../../components/TopBar/TopBar";
import useAccountsList from "../../context/useAccountsList";
import { getFrontendUserId, getStoredFrontendUser } from "../../utils/authUser";

const Payment = () => {
  const normalizeEmail = (email) => {
    return String(email || "")
      .trim()
      .toLowerCase();
  };

  const getFrontendUserEmail = () => {
    try {
      const storedUser = getStoredFrontendUser?.();

      const emailFromHelper = normalizeEmail(
        storedUser?.email || storedUser?.user?.email || storedUser?.data?.email,
      );

      if (emailFromHelper) return emailFromHelper;

      const rawUser = localStorage.getItem("frontend_user");
      if (!rawUser) return "";

      const parsedUser = JSON.parse(rawUser);

      return normalizeEmail(
        parsedUser?.email || parsedUser?.user?.email || parsedUser?.data?.email,
      );
    } catch (error) {
      console.error("Error reading frontend_user email:", error);
      return "";
    }
  };

  const getCurrentYearStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    bankAccount: "",
    amount: "",
    receipt: null,
    booking: "",
  });

  const [filters, setFilters] = useState({
    dateFrom: getCurrentYearStart(),
    dateTo: new Date().toISOString().split("T")[0],
    status: "All",
  });

  const { data3, subheadAccounts, loading3 } = useAccountsList();

  const bankAccounts = useMemo(() => {
    const bankSubhead = subheadAccounts?.find(
      (subhead) => subhead.subhead2_name === "Bank",
    );

    if (!bankSubhead) return [];

    return (
      data3?.filter((account) => account.subhead_id === bankSubhead._id) || []
    );
  }, [data3, subheadAccounts]);

  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchBookings = async () => {
    try {
      const loggedInEmail = getFrontendUserEmail();

      const response = await axiosInstance.get("/bookings");

      if (response.data.success) {
        const allBookings = response.data.data || [];

        const userBookings = allBookings.filter((booking) => {
          const bookingEmail = normalizeEmail(
            booking?.user?.email ||
              booking?.createdBy?.email ||
              booking?.agency?.email ||
              booking?.frontendUser?.email,
          );

          return !bookingEmail || bookingEmail === loggedInEmail;
        });

        setBookings(userBookings);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const fetchPayments = async (nextFilters = filters) => {
    try {
      setFetching(true);
      setError(null);

      const loggedInEmail = getFrontendUserEmail();

      if (!loggedInEmail) {
        setPayments([]);
        setTotal(0);
        setError("User email not found. Please login again.");
        return;
      }

      const response = await axiosInstance.get("/payment/me", {
        params: {
          dateFrom: nextFilters.dateFrom,
          dateTo: nextFilters.dateTo,
          status: nextFilters.status,
        },
      });

      if (response.data.success) {
        const allPayments = response.data.data || [];

        const loggedInUserPayments = allPayments.filter((payment) => {
          return normalizeEmail(payment?.user?.email) === loggedInEmail;
        });

        const loggedInUserTotal = loggedInUserPayments.reduce(
          (sum, payment) => sum + Number(payment?.amount || 0),
          0,
        );

        setPayments(loggedInUserPayments);
        setTotal(loggedInUserTotal);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError("Failed to fetch payments");
    } finally {
      setFetching(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchPayments();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "amount") {
      const numericValue = value.replace(/[^0-9.]/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      receipt: e.target.files[0],
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.date ||
      !formData.description ||
      !formData.bankAccount ||
      !formData.amount
    ) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);

      const userId = getFrontendUserId(getStoredFrontendUser());

      if (!userId) {
        alert("User not found. Please login again.");
        return;
      }

      const submitData = new FormData();

      submitData.append("date", formData.date);
      submitData.append("description", formData.description);
      submitData.append("bankAccount", formData.bankAccount);
      submitData.append("amount", formData.amount);
      submitData.append("status", "Un Posted");
      submitData.append("user", userId);

      if (formData.booking) {
        submitData.append("booking", formData.booking);
      }

      if (formData.receipt) {
        submitData.append("receipt", formData.receipt);
      }

      const response = await axiosInstance.post("/payment/add", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        alert("Payment added successfully!");

        setFormData({
          date: new Date().toISOString().split("T")[0],
          description: "",
          bankAccount: "",
          amount: "",
          receipt: null,
          booking: "",
        });

        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          fileInput.value = "";
        }

        fetchPayments();
      }
    } catch (error) {
      console.error("Error adding payment:", error);
      alert(error.response?.data?.message || "Failed to add payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilter = () => {
    fetchPayments();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-GB", { month: "short" });
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  };

  if (initialLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen mx-auto px-2 sm:px-4 md:px-0">
      <TopBar title={"Add Payments"} />

      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Date
              </label>

              <MaskedDatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
                minDate={new Date()}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Description
              </label>

              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter description"
                className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Bank Account
              </label>

              <select
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleInputChange}
                className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Account</option>

                {bankAccounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.account_name}
                  </option>
                ))}
              </select>

              {!loading3 && bankAccounts.length === 0 && (
                <p className="mt-1 text-xs text-red-500">
                  No bank accounts found.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Booking
              </label>

              <select
                name="booking"
                value={formData.booking}
                onChange={handleInputChange}
                className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Booking</option>

                {bookings.map((booking) => (
                  <option key={booking._id} value={booking._id}>
                    {booking.bookingReference} - {booking.sector || "N/A"} -{" "}
                    {booking.passengers?.[0]?.givenName || ""}{" "}
                    {booking.passengers?.[0]?.surName || ""} - (Rs.
                    {booking.pricing?.grandTotal || 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Amount
              </label>

              <input
                type="text"
                name="amount"
                value={
                  formData.amount
                    ? parseFloat(formData.amount).toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })
                    : ""
                }
                onChange={handleInputChange}
                placeholder="Enter amount"
                className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mb-3 sm:mb-4">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
              Upload Image
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-4 sm:px-8 py-2 sm:py-3 bg-linear-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 hover:scale-105 active:scale-95 transition-all duration-300 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            Filters
          </h3>

          <button
            onClick={() => {
              const resetFilters = {
                dateFrom: getCurrentYearStart(),
                dateTo: new Date().toISOString().split("T")[0],
                status: "All",
              };

              setFilters(resetFilters);
              fetchPayments(resetFilters);
            }}
            className="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Reset All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>

            <MaskedDatePicker
              value={filters.dateFrom}
              onChange={(date) => setFilters({ ...filters, dateFrom: date })}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>

            <MaskedDatePicker
              value={filters.dateTo}
              onChange={(date) => setFilters({ ...filters, dateTo: date })}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Status
            </label>

            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All</option>
              <option value="Posted">Posted</option>
              <option value="Un Posted">Un Posted</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleFilter}
              disabled={fetching}
              className="w-full px-3 sm:px-4 py-2 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 hover:scale-105 active:scale-95 transition-all duration-300 text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden relative">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {fetching && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f]">
              <tr>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  #
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Voucher Id
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Date
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Description
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Amount
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Remarks
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Receipt
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm text-gray-500"
                  >
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment, index) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {index + 1}
                    </td>

                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {payment.voucherId}
                    </td>

                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {formatDate(payment.date)}
                    </td>

                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-gray-900">
                      <div className="max-w-xs" title={payment.description}>
                        {payment.description}
                      </div>
                    </td>

                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>

                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === "Posted"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>

                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm text-gray-900">
                      <div className="max-w-xs" title={payment.remarks || "-"}>
                        {payment.remarks || "-"}
                      </div>
                    </td>

                    <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                      {payment.receipt ? (
                        <a
                          href={payment.receipt}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex justify-end">
            <div className="text-right">
              <span className="text-xs sm:text-sm font-semibold text-gray-700 mr-2 sm:mr-4">
                Total:
              </span>

              <span className="text-base sm:text-lg font-bold text-gray-900">
                PKR: {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
