import { useState, useEffect } from "react";
import axiosInstance from "../Api/axios";

interface Account {
  _id: string;
  account_name: string;
  subhead_id: string;
  account_debit: number;
  account_credit: number;
  account_credit_other: number;
  account_debit_other: number;
  account_total: number;
  account_status: string;
  added_by?: {
    _id: string;
    user_name: string;
  };
  created_by?: {
    _id: string;
    user_name: string;
  };
  updated_by?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  phone?: string;
  cell?: string;
  email?: string;
  currency?: string;
  address?: string;
  __v?: number;
}

interface Consultant {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

const useAccountsList = () => {
  const [data3, setData3] = useState<Account[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<Account[]>([]);
  const [supplierAccounts, setSupplierAccounts] = useState<Account[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<Account[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [vendorAccounts, setVendorAccounts] = useState<Account[]>([]);
  const [subheadAccounts, setSubheadAccounts] = useState<Account[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading3, setLoading3] = useState(true);
  const [error3, setError3] = useState<string | null>(null);

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
    } catch (err: any) {
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
