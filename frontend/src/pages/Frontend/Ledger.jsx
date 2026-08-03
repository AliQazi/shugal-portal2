import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import axiosInstance from "../../api/axios";
import MaskedDatePicker from "../../components/MaskedDatePicker";
import TopBar from "../../components/TopBar/TopBar";
import logo from "../../assets/images/logo.png";
import {
  getFrontendUserName,
  getStoredFrontendUser,
} from "../../utils/authUser";
import "./Ledger.css";

const Ledger = () => {
  const getCurrentYearStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  const [filters, setFilters] = useState({
    dateFrom: getCurrentYearStart(),
    dateTo: new Date().toISOString().split("T")[0],
  });

  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerMeta, setLedgerMeta] = useState({
    account: null,
    openingBalance: 0,
    closingBalance: null,
    totals: null,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const statementRef = useRef(null);

  const storedUser = getStoredFrontendUser();
  const userName = getFrontendUserName(storedUser);
  const accountName = ledgerMeta.account?.account_name || userName;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Math.abs(Number(amount || 0)));
  };

  const formatPrintAmount = (amount) =>
    Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  const formatBalance = (amount) => {
    const numericAmount = Number(amount || 0);
    const suffix = numericAmount < 0 ? "CR" : "DR";
    return `${formatCurrency(numericAmount)} ${suffix}`;
  };

  const formatStatementDate = (dateValue) => {
    const date = dateValue ? new Date(dateValue) : new Date();

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrintDate = () => {
    return new Date().toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calculateTotals = (rows = ledgerData) => {
    const isFullStatement = rows.length === ledgerData.length && !searchTerm;
    const debit =
      isFullStatement && ledgerMeta.totals
        ? Number(ledgerMeta.totals.debit || 0)
        : rows.reduce((sum, item) => sum + Number(item.debit || 0), 0);
    const credit =
      isFullStatement && ledgerMeta.totals
        ? Number(ledgerMeta.totals.credit || 0)
        : rows.reduce((sum, item) => sum + Number(item.credit || 0), 0);
    const openingBalance = Number(ledgerMeta.openingBalance || 0);
    const closingBalance =
      isFullStatement && ledgerMeta.closingBalance !== null
        ? ledgerMeta.closingBalance
        : openingBalance + debit - credit;

    return {
      debit,
      credit,
      openingBalance,
      closingBalance: Number(closingBalance || 0),
    };
  };

  const fetchLedger = async () => {
    try {
      setFetching(true);
      setError(null);

      const response = await axiosInstance.get("/payment/ledger/me", {
        params: {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        },
      });

      if (response.data.success) {
        setLedgerData(response.data.data || []);
        setLedgerMeta({
          account: response.data.account || null,
          openingBalance: Number(response.data.openingBalance || 0),
          closingBalance:
            response.data.closingBalance === undefined
              ? null
              : Number(response.data.closingBalance || 0),
          totals: response.data.totals || null,
        });
      }
    } catch (error) {
      console.error("Error fetching ledger:", error);
      setError("Failed to fetch ledger data. Please try again later.");
    } finally {
      setInitialLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [filters.dateFrom, filters.dateTo]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: getCurrentYearStart(),
      dateTo: new Date().toISOString().split("T")[0],
    });
    setSearchTerm("");
  };

  const handlePrint = () => {
    window.print();
  };

  const sanitizeFilename = (value) =>
    value
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .trim() || "ledger";

  const downloadStatementPdf = async () => {
    const source = statementRef.current;
    if (!source) return;

    const wrapper = document.createElement("div");
    const clone = source.cloneNode(true);
    const style = document.createElement("style");

    style.textContent = `
      .ledger-statement {
        width: 794px !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #111827 !important;
        box-shadow: none !important;
        font-family: Arial, Helvetica, sans-serif !important;
        font-size: 8.5pt !important;
      }
      .ledger-fetching,
      .no-print {
        display: none !important;
      }
      .ledger-print-date {
        color: #555 !important;
        font-size: 8pt !important;
        line-height: 1 !important;
        margin-bottom: 14px !important;
        text-align: right !important;
      }
      .ledger-company-row {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 18px !important;
        margin-bottom: 18px !important;
      }
      .ledger-company {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
        min-width: 0 !important;
      }
      .ledger-company img {
        width: 86px !important;
        height: auto !important;
        object-fit: contain !important;
        flex: 0 0 auto !important;
      }
      .ledger-company h1 {
        margin: 0 0 2px !important;
        color: #111827 !important;
        font-size: 9pt !important;
        font-weight: 800 !important;
        line-height: 1.1 !important;
      }
      .ledger-company p {
        margin: 2px 0 !important;
        color: #111827 !important;
        font-size: 8.5pt !important;
        line-height: 1.35 !important;
      }
      .ledger-opening-box {
        width: 210px !important;
        margin-top: 0 !important;
        border: 1px solid #9ca3af !important;
        text-align: center !important;
        color: #111827 !important;
        flex: 0 0 auto !important;
        font-size: 8.5pt !important;
        font-weight: 700 !important;
      }
      .ledger-opening-box div,
      .ledger-opening-box strong {
        display: block !important;
        min-height: 0 !important;
        padding: 7px 10px !important;
      }
      .ledger-opening-box div {
        background: #f9fafb !important;
        border-bottom: 1px solid #9ca3af !important;
      }
      .ledger-opening-box strong {
        border-top: 0 !important;
      }
      .ledger-divider {
        display: none !important;
      }
      .ledger-title-bar {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 18px !important;
        min-height: 0 !important;
        margin-bottom: 0 !important;
        border: 1px solid #111827 !important;
        background: #56b4ee !important;
        padding: 7px 8px !important;
        color: #000 !important;
        font-size: 8.5pt !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
      }
      .ledger-title-bar span {
        flex: 0 0 auto !important;
      }
      .ledger-table-scroll {
        width: 100% !important;
        overflow: visible !important;
      }
      .ledger-report-table {
        width: 100% !important;
        min-width: 0 !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
        color: #111827 !important;
        font-size: 8pt !important;
      }
      .ledger-report-table th,
      .ledger-report-table td {
        border: 1px solid #b6b6b6 !important;
        padding: 5px 4px !important;
        vertical-align: top !important;
        line-height: 1.3 !important;
        word-break: break-word !important;
      }
      .ledger-report-table th {
        background: #d1d5db !important;
        color: #111827 !important;
        border-color: #9ca3af !important;
        text-align: left !important;
        font-weight: 700 !important;
      }
      .ledger-report-table th:nth-child(1) { width: 13% !important; }
      .ledger-report-table th:nth-child(2) { width: 13% !important; }
      .ledger-report-table th:nth-child(4),
      .ledger-report-table th:nth-child(5) { width: 13% !important; }
      .ledger-report-table th:nth-child(6) { width: 15% !important; }
      .ledger-report-table tbody td {
        color: #1f2937 !important;
        font-weight: 400 !important;
      }
      .ledger-report-table tfoot td {
        background: #f3f4f6 !important;
        font-weight: 700 !important;
      }
      .ledger-number {
        text-align: right !important;
        white-space: nowrap !important;
      }
      .ledger-voucher {
        color: #0070c0 !important;
      }
      .ledger-balance {
        color: #ff0000 !important;
        font-weight: 700 !important;
      }
    `;

    Object.assign(wrapper.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "794px",
      background: "#ffffff",
      pointerEvents: "none",
    });

    wrapper.appendChild(style);
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const printableHeight = pageHeight - margin * 2;

      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imageHeight - heightLeft);
        pdf.addImage(
          imageData,
          "PNG",
          margin,
          position,
          imageWidth,
          imageHeight,
        );
        heightLeft -= printableHeight;
      }

      pdf.save(`ledger-${sanitizeFilename(userName)}-${Date.now()}.pdf`);
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return ledgerData;

    const search = searchTerm.toLowerCase();

    return ledgerData.filter((item) => {
      return (
        item.voucherId?.toString().toLowerCase().includes(search) ||
        item.ticketNumber?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      );
    });
  }, [ledgerData, searchTerm]);

  const totals = calculateTotals(filteredData);

  const rowsWithBalance = useMemo(() => {
    let runningBalance = totals.openingBalance;

    return filteredData.map((item) => {
      runningBalance += Number(item.debit || 0) - Number(item.credit || 0);

      return {
        ...item,
        runningBalance,
      };
    });
  }, [filteredData, totals.openingBalance]);

  const handleExport = async (type) => {
    try {
      if (type === "copy") {
        const tableData = rowsWithBalance
          .map(
            (entry) =>
              `${formatStatementDate(entry.date)}\t${entry.voucherId || "-"}\t${entry.description || "-"}\t${entry.debit > 0 ? formatCurrency(entry.debit) : ""}\t${entry.credit > 0 ? formatCurrency(entry.credit) : ""}\t${formatBalance(entry.runningBalance)}`,
          )
          .join("\n");

        const header = "Date\tV.no\tDetails\tDebit\tCredit\tBalance\n";
        const totalLine = `\nTotal\t\t\t${formatCurrency(totals.debit)}\t${formatCurrency(totals.credit)}\t${formatBalance(totals.closingBalance)}`;
        const fullText = `Account Statement of ${accountName}\nFrom ${formatStatementDate(filters.dateFrom)} To ${formatStatementDate(filters.dateTo)}\n\n${header}${tableData}${totalLine}`;

        await navigator.clipboard.writeText(fullText);
        alert("Table data copied to clipboard!");
        return;
      }

      if (type === "pdf") {
        await downloadStatementPdf();
        return;
      }

      const response = await axiosInstance.get(
        `/payment/ledger/me/export/${type}`,
        {
          params: {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            userName,
          },
          responseType: "blob",
        },
      );

      if (response.headers["content-type"]?.includes("application/json")) {
        const reader = new FileReader();
        const errorText = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsText(response.data);
        });
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Export failed");
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const extension =
        type === "csv" ? "csv" : type === "excel" ? "xlsx" : "pdf";
      link.setAttribute(
        "download",
        `ledger-${userName}-${Date.now()}.${extension}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exporting as ${type}:`, error);
      alert(
        `Failed to export as ${type.toUpperCase()}. ${error.message || ""}`,
      );
    }
  };

  if (initialLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ledger...</p>
        </div>
      </div>
    );
  }

  if (error && ledgerData.length === 0) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchLedger}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ledger-page w-full min-h-screen mx-auto">
      <style>{`
        .agent-ledger-print-only {
          display: none;
        }

        @media print {
          @page { size: A4; margin: 10mm; }
          * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body, #root {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          nav, aside, header, footer, .no-print, .dashboard-sidebar, .dashboard-header, .ledger-statement-shell {
            display: none !important;
          }
          .agent-ledger-print-only,
          .agent-ledger-print-only * {
            visibility: visible !important;
          }
          .agent-ledger-print-only {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          .agent-ledger-print-page {
            display: block !important;
            width: 100% !important;
            color: #111827 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 8.5pt !important;
          }
          .agent-ledger-print-topline {
            text-align: right !important;
            color: #555 !important;
            font-size: 8pt !important;
            margin-bottom: 14px !important;
          }
          .agent-ledger-print-company {
            display: flex !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 18px !important;
            margin-bottom: 18px !important;
          }
          .agent-ledger-print-brand {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            min-width: 0 !important;
          }
          .agent-ledger-print-logo {
            width: 86px !important;
            height: auto !important;
            object-fit: contain !important;
          }
          .agent-ledger-print-company-text {
            line-height: 1.35 !important;
            color: #111827 !important;
            max-width: 430px !important;
          }
          .agent-ledger-print-company-text strong {
            display: inline-block !important;
            font-size: 9pt !important;
            margin-bottom: 2px !important;
          }
          .agent-ledger-print-opening {
            width: 210px !important;
            border: 1px solid #9ca3af !important;
            text-align: center !important;
            flex: 0 0 auto !important;
          }
          .agent-ledger-print-opening div {
            padding: 7px 10px !important;
            font-weight: 700 !important;
          }
          .agent-ledger-print-opening div:first-child {
            border-bottom: 1px solid #9ca3af !important;
            background: #f9fafb !important;
          }
          .agent-ledger-print-titlebar {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: #56b4ee !important;
            border: 1px solid #111827 !important;
            color: #000 !important;
            font-weight: 700 !important;
            padding: 7px 8px !important;
            margin-bottom: 0 !important;
          }
          .agent-ledger-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 8pt !important;
          }
          .agent-ledger-print-table thead {
            display: table-header-group !important;
          }
          .agent-ledger-print-table th {
            background: #d1d5db !important;
            color: #111827 !important;
            border: 1px solid #9ca3af !important;
            padding: 5px 4px !important;
            font-weight: 700 !important;
            text-align: left !important;
          }
          .agent-ledger-print-table td {
            border: 1px solid #b6b6b6 !important;
            color: #1f2937 !important;
            padding: 5px 4px !important;
            vertical-align: top !important;
            line-height: 1.3 !important;
            word-break: break-word !important;
          }
          .agent-ledger-print-table .text-right {
            text-align: right !important;
          }
          .agent-ledger-print-table .agent-ledger-print-voucher {
            color: #0070c0 !important;
          }
          .agent-ledger-print-table .agent-ledger-print-balance {
            color: #ff0000 !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
          }
          .agent-ledger-print-table tfoot td {
            background: #f3f4f6 !important;
            font-weight: 700 !important;
          }
            .agent-ledger-print-table tfoot td {
            background: #f3f4f6 !important;
            font-weight: 700 !important;
            border: 1px solid #b6b6b6 !important;
          }
        }
      `}</style>

      <div className="agent-ledger-print-only">
        <div className="agent-ledger-print-page">
          <div className="agent-ledger-print-topline">
            Print Date:{formatPrintDate()}
          </div>

          <div className="agent-ledger-print-company">
            <div className="agent-ledger-print-brand">
              <img
                src={logo}
                alt="Company logo"
                className="agent-ledger-print-logo"
              />
              <div className="agent-ledger-print-company-text">
                <strong>{accountName.toUpperCase()}</strong>
                <div>Abid Air Travel & Tours</div>
                <div>Email: abid_intl@msn.com</div>
                <div>
                  Account statement generated from Abid Air Travel & Tours portal
                </div>
              </div>
            </div>

            <div className="agent-ledger-print-opening">
              <div>Opening Balance</div>
              <div>{formatBalance(totals.openingBalance)}</div>
            </div>
          </div>

          <div className="agent-ledger-print-titlebar">
            <span>Account Statement of Ledger</span>
            <span>
              From {formatStatementDate(filters.dateFrom)} To{" "}
              {formatStatementDate(filters.dateTo)}
            </span>
          </div>

          <table className="agent-ledger-print-table">
            <thead>
              <tr>
                <th style={{ width: "13%" }}>Date</th>
                <th style={{ width: "10%" }}>V.no</th>
                <th>Details</th>
                <th className="text-right" style={{ width: "11%" }}>
                  Debit
                </th>
                <th className="text-right" style={{ width: "11%" }}>
                  Credit
                </th>
                <th className="text-right" style={{ width: "13%" }}>
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">
                    No data available in table
                  </td>
                </tr>
              ) : (
                rowsWithBalance.map((entry, index) => (
                  <tr key={`${entry.voucherId || "print-entry"}-${index}`}>
                    <td>{formatStatementDate(entry.date)}</td>
                    <td className="agent-ledger-print-voucher">
                      {entry.voucherId || "-"}
                    </td>
                    <td>{entry.description || entry.ticketNumber || "-"}</td>
                    <td className="text-right">
                      {entry.debit > 0 ? formatPrintAmount(entry.debit) : "0"}
                    </td>
                    <td className="text-right">
                      {entry.credit > 0 ? formatPrintAmount(entry.credit) : "0"}
                    </td>
                    <td className="text-right agent-ledger-print-balance">
                      {formatBalance(entry.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3">Total</td>
                <td className="text-right">
                  {formatPrintAmount(totals.debit)}
                </td>
                <td className="text-right">
                  {formatPrintAmount(totals.credit)}
                </td>
                <td className="text-right agent-ledger-print-balance">
                  {formatBalance(totals.closingBalance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="no-print">
        <TopBar title={`Ledger of ${userName.toUpperCase()}`} />

        <div className="mb-5 bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Date Range & Export
            </h3>
            <button
              onClick={resetFilters}
              className="text-sm text-red-600 hover:text-red-800 font-medium self-start sm:self-auto"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <MaskedDatePicker
                value={filters.dateFrom}
                onChange={(date) => handleFilterChange("dateFrom", date)}
                placeholderText="From Date"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <MaskedDatePicker
                value={filters.dateTo}
                onChange={(date) => handleFilterChange("dateTo", date)}
                placeholderText="To Date"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by voucher, ticket, or description..."
                className="w-full min-h-10 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["copy", "csv", "excel", "pdf"].map((type) => (
              <button
                key={type}
                onClick={() => handleExport(type)}
                className="px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
              >
                {type === "copy"
                  ? "Copy"
                  : type === "csv"
                    ? "CSV"
                    : type === "pdf"
                      ? "PDF"
                      : "Excel"}
              </button>
            ))}
            <button
              onClick={handlePrint}
              className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="ledger-statement-shell">
        <section ref={statementRef} className="ledger-statement">
          {fetching && (
            <div className="ledger-fetching no-print">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          <div className="ledger-print-date">
            Print Date:{formatPrintDate()}
          </div>

          <div className="ledger-company-row">
            <div className="ledger-company">
              <img src={logo} alt="Company logo" />
              <div>
                <h1>{accountName.toUpperCase()}</h1>
                <p>Abid Air Travel & Tours</p>
                <p>Email: abid_intl@msn.com</p>
                <p>Account statement generated from Abid Air Travel & Tours portal</p>
              </div>
            </div>

            <div className="ledger-opening-box">
              <div>Opening Balance</div>
              <strong>{formatBalance(totals.openingBalance)}</strong>
            </div>
          </div>

          <div className="ledger-divider" />

          <div className="ledger-title-bar">
            <strong>Account Statement of Ledger</strong>
            <span>
              From {formatStatementDate(filters.dateFrom)} To{" "}
              {formatStatementDate(filters.dateTo)}
            </span>
          </div>

          <div className="ledger-table-scroll">
            <table className="ledger-report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>V.no</th>
                  <th>Details</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="ledger-closing-row">
                      Closing Balance as on{" "}
                      {formatStatementDate(filters.dateTo)}
                      <strong>{formatBalance(totals.closingBalance)}</strong>
                    </td>
                  </tr>
                ) : (
                  rowsWithBalance.map((entry, index) => (
                    <tr key={`${entry.voucherId || "entry"}-${index}`}>
                      <td>{formatStatementDate(entry.date)}</td>
                      <td className="ledger-voucher">
                        {entry.voucherId || "-"}
                      </td>
                      <td>{entry.description || entry.ticketNumber || "-"}</td>
                      <td className="ledger-number">
                        {entry.debit ? formatCurrency(entry.debit) : ""}
                      </td>
                      <td className="ledger-number">
                        {entry.credit ? formatCurrency(entry.credit) : ""}
                      </td>
                      <td className="ledger-number ledger-balance">
                        {formatBalance(entry.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3">Total</td>
                  <td className="ledger-number">
                    {formatCurrency(totals.debit)}
                  </td>
                  <td className="ledger-number">
                    {formatCurrency(totals.credit)}
                  </td>
                  <td className="ledger-number">
                    {formatBalance(totals.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>

      <div className="no-print mt-4 text-center text-sm text-gray-600">
        Showing {filteredData.length} of {ledgerData.length} entries
      </div>
    </div>
  );
};

export default Ledger;
