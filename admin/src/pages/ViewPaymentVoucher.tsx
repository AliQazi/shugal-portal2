import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import axiosInstance from "../Api/axios";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

interface Payment {
  _id: string;
  voucherId: string;
  date: string;
  description: string;
  bankAccount: {
    _id: string;
    bankName: string;
    accountNo: string;
  };
  user: {
    _id: string;
    name: string;
    email: string;
    companyName?: string;
  };
  amount: number;
  status: string;
  remarks?: string;
  receipt?: string;
  editedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  editedAt?: string;
}

const ViewPaymentVoucher = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, "view_payment_vouchers");
  const navigate = useNavigate();
  
  // Get current year for default date filter
  const getCurrentYearStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  // Filter States
  const [filters, setFilters] = useState({
    dateFrom: getCurrentYearStart(),
    dateTo: new Date().toISOString().split("T")[0],
    status: "",
  });

  // Data States
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Fetch payments based on filters
  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get("/payment", {
        params: {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          status: filters.status,
        },
      });

      if (response.data.success) {
        setPayments(response.data.data);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      console.error("Error fetching payments:", error);
      setError("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchPayments();
    }
  }, [canView]);

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle filter button click
  const handleFilter = () => {
    if (!canView) return;
    fetchPayments();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-GB", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
        You do not have permission to view Payment Vouchers.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">View Payments</h1>
          <div className="text-sm text-gray-600">
            <a href="/" className="text-blue-600 hover:underline">
              Home
            </a>
            <span className="mx-2">/</span>
            <span>View Payments</span>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-blue-600 rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Date From */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Date From
              </label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Date To
              </label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Status</option>
                <option value="Posted">Posted</option>
                <option value="Un Posted">Un Posted</option>
              </select>
            </div>

            {/* Filter Button */}
            <div>
              <button
                onClick={handleFilter}
                disabled={loading}
                className="w-full px-4 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Voucher Id
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Company Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Debit Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Credit Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Receipt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Edited By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          No data available in table
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment, index) => (
                        <tr key={payment._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.voucherId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(payment.date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {payment.user?.companyName || payment.user?.name || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            -
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {payment.description}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {payment.remarks || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            PKR: {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded ${
                                payment.status === "Posted"
                                  ? "bg-green-500 text-white"
                                  : "bg-yellow-500 text-gray-900"
                              }`}
                            >
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {payment.receipt ? (
                              <a
                                href={payment.receipt}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={payment.receipt}
                                  alt="Receipt"
                                  className="w-16 h-16 object-cover rounded"
                                />
                              </a>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">
                                {payment.editedBy?.name || "Not Yet Approved"}
                              </div>
                              {payment.editedAt && (
                                <div className="text-xs text-red-600">
                                  Dated: {formatDate(payment.editedAt)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => navigate(`/view-payment-voucher/edit/${payment._id}`)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Section */}
              <div className="bg-gray-100 px-6 py-4">
                <div className="flex justify-end">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-700 mr-4">
                      Total:
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      PKR: {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewPaymentVoucher;
