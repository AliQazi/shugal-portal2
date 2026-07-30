// import { useState, useEffect } from "react";
// import { useParams, useNavigate } from "react-router";
// import axiosInstance from "../Api/axios";
// import { useAuth } from "../context/AuthContext";
// import { hasPermission } from "../utils/permissions";

// interface Payment {
//   _id: string;
//   voucherId: string;
//   date: string;
//   description: string;
//   bankAccount: {
//     _id: string;
//     bankName: string;
//     accountNo: string;
//   };
//   user: {
//     _id: string;
//     name: string;
//     email: string;
//     companyName?: string;
//   };
//   amount: number;
//   status: string;
//   remarks?: string;
//   receipt?: string;
//   editedBy?: {
//     _id: string;
//     name: string;
//     email: string;
//   };
//   editedAt?: string;
// }

// interface Bank {
//   _id: string;
//   bankName: string;
//   accountNo: string;
// }

// const EditPaymentVoucher = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const canView = hasPermission(user, "view_payment_vouchers");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [banks, setBanks] = useState<Bank[]>([]);

//   const [formData, setFormData] = useState({
//     evoucherAgentCreditAccountName: "",
//     bankName: "",
//     agentName: "",
//     description: "",
//     amount: "",
//     accountNo: "",
//     status: "Posted",
//     remarks: "",
//     date: "",
//   });

//   const [receipt, setReceipt] = useState<string | null>(null);
//   const [receiptFile, setReceiptFile] = useState<File | null>(null);

//   useEffect(() => {
//     if (!canView) return;

//     fetchBanks();
//     if (id) {
//       fetchPaymentDetails();
//     }
//   }, [id, canView]);

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

//   const fetchPaymentDetails = async () => {
//     try {
//       setLoading(true);
//       const response = await axiosInstance.get(`/payment/${id}`);
//       if (response.data.success) {
//         const payment: Payment = response.data.data;
//         setFormData({
//           evoucherAgentCreditAccountName: payment.user?.companyName || payment.user?.name || "",
//           bankName: payment.bankAccount?._id || "",
//           agentName: payment.user?.companyName || payment.user?.name || "",
//           description: payment.description || "",
//           amount: payment.amount?.toString() || "",
//           accountNo: payment.bankAccount?.accountNo || "",
//           status: payment.status || "Posted",
//           remarks: payment.remarks || "",
//           date: payment.date ? new Date(payment.date).toISOString().split("T")[0] : "",
//         });
//         setReceipt(payment.receipt || null);
//       }
//     } catch (error: any) {
//       console.error("Error fetching payment details:", error);
//       setError("Failed to load payment details");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));

//     // Auto-populate account number when bank is selected
//     if (name === "bankName") {
//       const selectedBank = banks.find((bank) => bank._id === value);
//       if (selectedBank) {
//         setFormData((prev) => ({
//           ...prev,
//           accountNo: selectedBank.accountNo,
//         }));
//       }
//     }
//   };

//   const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       setReceiptFile(file);
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setReceipt(reader.result as string);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!canView) {
//       setError("You don't have permission to update payment vouchers");
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     try {
//       const submitData = new FormData();

//       submitData.append("description", formData.description);
//       submitData.append("amount", formData.amount);
//       submitData.append("status", formData.status);
//       submitData.append("remarks", formData.remarks);
//       submitData.append("date", formData.date);
//       submitData.append("bankAccount", formData.bankName);

//       // Add the current user ID as editedBy
//       if (user?.id) {
//         submitData.append("editedBy", user.id);
//       }

//       if (receiptFile) {
//         submitData.append("receipt", receiptFile);
//       }

//       const response = await axiosInstance.put(`/payment/${id}`, submitData, {
//         headers: {
//           "Content-Type": "multipart/form-data",
//         },
//       });

//       if (response.data.success) {
//         alert("Payment voucher updated successfully!");
//         navigate("/view-payment-voucher");
//       }
//     } catch (error: any) {
//       console.error("Error updating payment:", error);
//       setError(error.response?.data?.message || "Failed to update payment voucher");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading && !formData.date) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
//       </div>
//     );
//   }

//   if (!canView) {
//     return (
//       <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
//         You do not have permission to view Payment Vouchers.
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-3xl font-bold text-gray-900">View Payment Voucher</h1>
//           <div className="text-sm text-gray-600">
//             <a href="/" className="text-blue-600 hover:underline">
//               Home
//             </a>
//             <span className="mx-2">/</span>
//             <span>View Payment</span>
//           </div>
//         </div>

//         {/* Form Section */}
//         <div className="bg-white rounded-lg shadow-md p-6">
//           <h2 className="text-xl font-bold text-gray-900 mb-6">View Payment Vouchers</h2>

//           {error && (
//             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//               {error}
//             </div>
//           )}

//           <form onSubmit={handleSubmit}>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//               {/* Evoucher Agent Credit Account Name */}
//               <div>
//                 <label className="block text-sm font-medium text-green-600 mb-2">
//                   Agent Credit Account Name
//                 </label>
//                 <input
//                   type="text"
//                   name="evoucherAgentCreditAccountName"
//                   value={formData.evoucherAgentCreditAccountName}
//                   onChange={handleChange}
//                   disabled
//                   className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
//                 />
//               </div>

//               {/* Bank Name */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Bank Name
//                 </label>
//                 <input
//                   type="text"
//                   value={banks.find(b => b._id === formData.bankName)?.bankName || ""}
//                   disabled
//                   className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
//               {/* Agent Name */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Agent Name
//                 </label>
//                 <input
//                   type="text"
//                   name="agentName"
//                   value={formData.agentName}
//                   onChange={handleChange}
//                   disabled
//                   className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
//                 />
//               </div>

//               {/* Description */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Description
//                 </label>
//                 <input
//                   type="text"
//                   name="description"
//                   value={formData.description}
//                   onChange={handleChange}
//                   className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>

//               {/* Amount */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Amount
//                 </label>
//                 <input
//                   type="number"
//                   name="amount"
//                   value={formData.amount}
//                   onChange={handleChange}
//                   className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
//               {/* Account # */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Account #
//                 </label>
//                 <input
//                   type="text"
//                   name="accountNo"
//                   value={formData.accountNo}
//                   disabled
//                   className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
//                 />
//               </div>

//               {/* Status */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Status
//                 </label>
//                 <select
//                   name="status"
//                   value={formData.status}
//                   onChange={handleChange}
//                   className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="Posted">Posted</option>
//                   <option value="Un Posted">Un Posted</option>
//                 </select>
//               </div>

//               {/* Date */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Date
//                 </label>
//                 <input
//                   type="date"
//                   name="date"
//                   value={formData.date}
//                   onChange={handleChange}
//                   className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//             </div>

//             {/* Remarks */}
//             <div className="mb-6">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Remarks <span className="text-red-600">(Optional)</span>
//               </label>
//               <input
//                 type="text"
//                 name="remarks"
//                 value={formData.remarks}
//                 onChange={handleChange}
//                 className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             {/* Receipt Image */}
//             <div className="mb-6 flex justify-center">
//               <div className="text-center">
//                 {receipt ? (
//                   <img
//                     src={receipt}
//                     alt="Receipt"
//                     className="max-w-xs max-h-64 object-contain mx-auto mb-4 rounded shadow"
//                   />
//                 ) : (
//                   <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded mb-4 mx-auto">
//                     <span className="text-gray-400">No Receipt</span>
//                   </div>
//                 )}
//                 <input
//                   type="file"
//                   accept="image/*"
//                   onChange={handleReceiptChange}
//                   className="hidden"
//                   id="receipt-upload"
//                 />
//                 <label
//                   htmlFor="receipt-upload"
//                   className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm"
//                 >
//                   Change Receipt
//                 </label>
//               </div>
//             </div>

//             {/* Submit Button */}
//             <div className="flex justify-end">
//               <button
//                 type="submit"
//                 disabled={loading || !canView}
//                 className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                 title={!canView ? "You don't have permission to update payment vouchers" : ""}
//               >
//                 {loading ? "Updating..." : "Update Payment Voucher"}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default EditPaymentVoucher;


import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import axiosInstance from "../Api/axios";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import useAccountsList from "../context/useAccountsList";

interface PaymentBankAccount {
  _id?: string;
  bankName?: string;
  accountNo?: string;
  account_name?: string;
  account_no?: string;
}

interface Payment {
  _id: string;
  voucherId: string;
  date: string;
  description: string;
  bankAccount: string | PaymentBankAccount;
  bankAccountName?: string;
  accountNo?: string;
  user: {
    _id: string;
    name: string;
    email: string;
    companyName?: string;
  };
  amount: number;
  status: string;
  remarks?: string;
  receipt?: string | null;
  editedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  editedAt?: string;
}

interface Bank {
  _id: string;
  bankName: string;
  accountNo: string;
}

interface Account {
  _id: string;
  account_name: string;
  account_no?: string;
  accountNo?: string;
}

const EditPaymentVoucher = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data3: zipAccounts = [] } = useAccountsList();

  const canView = hasPermission(user, "view_payment_vouchers");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [displayBankName, setDisplayBankName] = useState("");

  const [formData, setFormData] = useState({
    evoucherAgentCreditAccountName: "",
    bankName: "",
    agentName: "",
    description: "",
    amount: "",
    accountNo: "",
    status: "Posted",
    remarks: "",
    date: "",
  });

  const [receipt, setReceipt] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    if (!canView) return;

    fetchBanks();

    if (id) {
      fetchPaymentDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canView]);

  const fetchBanks = async () => {
    try {
      const response = await axiosInstance.get("/bank");

      if (response.data?.success) {
        setBanks(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  const getBankAccountId = (bankAccount: Payment["bankAccount"]) => {
    if (!bankAccount) return "";

    if (typeof bankAccount === "string") {
      return bankAccount;
    }

    return bankAccount._id || "";
  };

  const getBankNameFromPayment = (payment: Payment) => {
    if (payment.bankAccountName) {
      return payment.bankAccountName;
    }

    if (
      payment.bankAccount &&
      typeof payment.bankAccount === "object"
    ) {
      return (
        payment.bankAccount.bankName ||
        payment.bankAccount.account_name ||
        ""
      );
    }

    return "";
  };

  const getAccountNoFromPayment = (payment: Payment) => {
    if (payment.accountNo) {
      return payment.accountNo;
    }

    if (
      payment.bankAccount &&
      typeof payment.bankAccount === "object"
    ) {
      return (
        payment.bankAccount.accountNo ||
        payment.bankAccount.account_no ||
        ""
      );
    }

    return "";
  };

  const getZipAccountById = (accountId: string) =>
    (zipAccounts as Account[]).find(
      (account) => String(account._id) === String(accountId),
    );

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/payment/${id}`);

      if (response.data?.success) {
        const payment: Payment = response.data.data;

        const bankAccountId = getBankAccountId(payment.bankAccount);
        const bankName = getBankNameFromPayment(payment);
        const accountNo = getAccountNoFromPayment(payment);

        setDisplayBankName(bankName);

        setFormData({
          evoucherAgentCreditAccountName:
            payment.user?.companyName || payment.user?.name || "",
          bankName: bankAccountId,
          agentName: payment.user?.companyName || payment.user?.name || "",
          description: payment.description || "",
          amount: payment.amount?.toString() || "",
          accountNo,
          status: payment.status || "Posted",
          remarks: payment.remarks || "",
          date: payment.date
            ? new Date(payment.date).toISOString().split("T")[0]
            : "",
        });

        setReceipt(payment.receipt || null);
      }
    } catch (error: any) {
      console.error("Error fetching payment details:", error);
      setError(
        error.response?.data?.message || "Failed to load payment details"
      );
    } finally {
      setLoading(false);
    }
  };

  const getDisplayBankName = () => {
    const zipAccount = getZipAccountById(formData.bankName);
    const localBank = banks.find((bank) => bank._id === formData.bankName);

    return (
      displayBankName ||
      zipAccount?.account_name ||
      localBank?.bankName ||
      ""
    );
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "bankName") {
      const selectedBank = banks.find((bank) => bank._id === value);

      if (selectedBank) {
        setDisplayBankName(selectedBank.bankName);

        setFormData((prev) => ({
          ...prev,
          bankName: value,
          accountNo: selectedBank.accountNo,
        }));
      }
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setReceiptFile(file);

      const reader = new FileReader();

      reader.onloadend = () => {
        setReceipt(reader.result as string);
      };

      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canView) {
      setError("You don't have permission to update payment vouchers");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = new FormData();

      submitData.append("description", formData.description);
      submitData.append("amount", formData.amount);
      submitData.append("status", formData.status);
      submitData.append("remarks", formData.remarks);
      submitData.append("date", formData.date);

      if (formData.bankName) {
        submitData.append("bankAccount", formData.bankName);
      }

      if (displayBankName) {
        submitData.append("bankAccountName", displayBankName);
      }

      if (formData.accountNo) {
        submitData.append("accountNo", formData.accountNo);
      }

      const editedById = user?.id || user?._id;

      if (editedById) {
        submitData.append("editedBy", editedById);
      }

      if (receiptFile) {
        submitData.append("receipt", receiptFile);
      }

      const response = await axiosInstance.put(`/payment/${id}`, submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.success) {
        alert("Payment voucher updated successfully!");
        navigate("/view-payment-voucher");
      }
    } catch (error: any) {
      console.error("Error updating payment:", error);
      setError(
        error.response?.data?.message || "Failed to update payment voucher"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.date) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
        You do not have permission to view Payment Vouchers.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            View Payment Voucher
          </h1>

          <div className="text-sm text-gray-600">
            <a href="/" className="text-blue-600 hover:underline">
              Home
            </a>
            <span className="mx-2">/</span>
            <span>View Payment</span>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            View Payment Vouchers
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Agent Credit Account Name */}
              <div>
                <label className="block text-sm font-medium text-green-600 mb-2">
                  Agent Credit Account Name
                </label>

                <input
                  type="text"
                  name="evoucherAgentCreditAccountName"
                  value={formData.evoucherAgentCreditAccountName}
                  onChange={handleChange}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>

                <input
                  type="text"
                  value={getDisplayBankName()}
                  disabled
                  placeholder="No bank name found"
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Agent Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>

                <input
                  type="text"
                  name="agentName"
                  value={formData.agentName}
                  onChange={handleChange}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>

                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>

                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Account No */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account #
                </label>

                <input
                  type="text"
                  name="accountNo"
                  value={formData.accountNo}
                  disabled
                  placeholder="No account number found"
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none"
                />
              </div> */}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Posted">Posted</option>
                  <option value="Un Posted">Un Posted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>

                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks <span className="text-red-600">(Optional)</span>
              </label>

              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Receipt Image */}
            <div className="mb-6 flex justify-center">
              <div className="text-center">
                {receipt ? (
                  <img
                    src={receipt}
                    alt="Receipt"
                    className="max-w-xs max-h-64 object-contain mx-auto mb-4 rounded shadow"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded mb-4 mx-auto">
                    <span className="text-gray-400">No Receipt</span>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptChange}
                  className="hidden"
                  id="receipt-upload"
                />

                <label
                  htmlFor="receipt-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm"
                >
                  Change Receipt
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !canView}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !canView
                    ? "You don't have permission to update payment vouchers"
                    : ""
                }
              >
                {loading ? "Updating..." : "Update Payment Voucher"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditPaymentVoucher;
