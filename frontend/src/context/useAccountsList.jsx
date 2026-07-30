import { useState, useEffect } from "react";
import axiosInstance from "../api/axios";

const useAccountsList = () => {
  const [data3, setData3] = useState([]);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [supplierAccounts, setSupplierAccounts] = useState([]);
  const [incomeAccounts, setIncomeAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [vendorAccounts, setVendorAccounts] = useState([]);
  const [subheadAccounts, setSubheadAccounts] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [loading3, setLoading3] = useState(true);
  const [error3, setError3] = useState(null);

  const fetchData = async () => {
    try {
      const [accountsResponse, consultantsResponse] = await Promise.all([
        axiosInstance.get("/zip-accounts/accounts/categorized"),
        axiosInstance.get("/zip-accounts/consultants"),
      ]);

      const {
        all,
        customers,
        suppliers,
        incomes,
        expenses,
        vendors,
        subheads,
      } = accountsResponse.data.data;

      setData3(all);
      setCustomerAccounts(customers);
      setSupplierAccounts(suppliers);
      setIncomeAccounts(incomes);
      setExpenseAccounts(expenses);
      setVendorAccounts(vendors);
      setSubheadAccounts(subheads);

      setConsultants(consultantsResponse.data.data || []);
    } catch (err) {
      setError3(
        err.response?.data?.message ||
          err.message ||
          "An unknown error occurred",
      );
    } finally {
      setLoading3(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    data3,
    customerAccounts,
    supplierAccounts,
    incomeAccounts,
    expenseAccounts,
    vendorAccounts,
    subheadAccounts,
    consultants,
    loading3,
    error3,
    refreshAccounts: fetchData,
  };
};

export default useAccountsList;
