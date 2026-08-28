import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import logo from "../assets/images/logo.png";

interface LedgerEntry {
  voucherId: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
}

interface LedgerEntryWithBalance extends LedgerEntry {
  runningBalance: number;
}

interface LedgerMeta {
  openingBalance: number;
  closingBalance: number | null;
  totals: { debit: number; credit: number } | null;
}

const Ledger = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, "view_ledger");
  const canUseActions = hasPermission(user, "ledger_action_buttons");
  const { id } = useParams();
  const location = useLocation();

  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [ledgerMeta, setLedgerMeta] = useState<LedgerMeta>({
    openingBalance: 0,
    closingBalance: null,
    totals: null,
  });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const statementRef = useRef<HTMLDivElement>(null);

  const userName = location.state?.companyname || "User";
  const COMPANY_NAME = "Abid Air Travel & Tours";

  useEffect(() => {
    if (canView && dateFrom && dateTo) {
      fetchLedger();
    } else if (!canView) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");

      const response = await axiosInstance.get(`/payment/ledger/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: { dateFrom, dateTo },
      });

      if (response.data.success) {
        setLedgerData(response.data.data || []);
        setLedgerMeta({
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
      setLedgerData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canView) return;
    fetchLedger();
  };

  // Mirrors the agent-side calculateTotals logic
  const calculateTotals = () => {
    const debit =
      ledgerMeta.totals
        ? Number(ledgerMeta.totals.debit || 0)
        : ledgerData.reduce((sum, e) => sum + Number(e.debit || 0), 0);

    const credit =
      ledgerMeta.totals
        ? Number(ledgerMeta.totals.credit || 0)
        : ledgerData.reduce((sum, e) => sum + Number(e.credit || 0), 0);

    const openingBalance = Number(ledgerMeta.openingBalance || 0);

    const closingBalance =
      ledgerMeta.closingBalance !== null
        ? ledgerMeta.closingBalance
        : openingBalance + debit - credit;

    return { debit, credit, openingBalance, closingBalance };
  };

  const { debit: totalDebit, credit: totalCredit, openingBalance, closingBalance } =
    calculateTotals();

  // Running balance per row — same approach as agent side
  const rowsWithBalance: LedgerEntryWithBalance[] = (() => {
    let running = openingBalance;
    return ledgerData.map((entry) => {
      running += Number(entry.debit || 0) - Number(entry.credit || 0);
      return { ...entry, runningBalance: running };
    });
  })();

  const formatAmount = (amount: number) =>
    Math.abs(Number(amount || 0)).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  // DR = agent owes us (positive), CR = we owe agent (negative)
  const formatBalance = (amount: number) => {
    const n = Number(amount || 0);
    return `${formatAmount(n)} ${n < 0 ? "CR" : "DR"}`;
  };

  const formatPrintDate = (date = new Date()) =>
    date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const handlePrint = () => {
    if (!canView || !canUseActions) return;
    window.print();
  };

  const sanitizeFilename = (value: string) =>
    value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").trim() ||
    "ledger";

  const downloadStatementPdf = async () => {
    const source = statementRef.current;
    if (!source) return;

    const wrapper = document.createElement("div");
    const clone = source.cloneNode(true) as HTMLElement;
    const style = document.createElement("style");

    style.textContent = `
      .ledger-print-page {
        display: block; width: 794px; box-sizing: border-box;
        color: #111827; background: #ffffff;
        font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt;
      }
      * { box-sizing: border-box; }
      .ledger-print-body { padding: 0; }
      .ledger-print-topline { text-align: right; color: #555; font-size: 8pt; margin-bottom: 14px; }
      .ledger-print-company { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
      .ledger-print-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
      .ledger-print-logo { width: 86px; height: auto; object-fit: contain; }
      .ledger-print-company-text { line-height: 1.35; color: #111827; max-width: 430px; }
      .ledger-print-company-text strong { display: inline-block; font-size: 9pt; margin-bottom: 2px; }
      .ledger-print-opening { width: 210px; border: 1px solid #9ca3af; text-align: center; flex: 0 0 auto; }
      .ledger-print-opening div { padding: 7px 10px; font-weight: 700; }
      .ledger-print-opening div:first-child { border-bottom: 1px solid #173a68; background: #173a68; color: #ffffff; }
      .ledger-print-titlebar {
        display: flex; justify-content: space-between; align-items: center;
        width: 100%; background: #0e2a4d; border: none; color: #ffffff;
        font-weight: 700; font-size: 10pt; padding: 10px 16px; margin: 0 0 16px;
      }
      .ledger-print-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8pt; }
      .ledger-print-table th { background: #173a68; color: #ffffff; border: 1px solid #173a68; padding: 5px 4px; font-weight: 700; text-align: left; }
      .ledger-print-table td { border: 1px solid #b6b6b6; color: #1f2937; padding: 5px 4px; vertical-align: top; line-height: 1.3; word-break: break-word; }
      .ledger-print-table .text-right { text-align: right; }
      .ledger-print-table .ledger-print-voucher { color: #0070c0; }
      .ledger-print-table .ledger-print-balance { color: #ff0000; font-weight: 700; white-space: nowrap; }
      .ledger-print-table tfoot td { background: #173a68; color: #ffffff; font-weight: 700; }
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
        pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
        heightLeft -= printableHeight;
      }

      pdf.save(`ledger-${sanitizeFilename(userName)}-${Date.now()}.pdf`);
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const handleExport = async (type: string) => {
    if (!canView || !canUseActions) return;

    try {
      const token = localStorage.getItem("admin_token");

      if (type === "copy") {
        const tableData = rowsWithBalance
          .map(
            (entry) =>
              `${entry.voucherId}\t${new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}\t${entry.description}\t${entry.debit > 0 ? formatAmount(entry.debit) : ""}\t${entry.credit > 0 ? formatAmount(entry.credit) : ""}\t${formatBalance(entry.runningBalance)}`
          )
          .join("\n");

        const header = "Voucher Id\tDate\tDescription\tDebit\tCredit\tBalance\n";
        const totalsLine = `\nTotal\t\t\t${formatAmount(totalDebit)}\t${formatAmount(totalCredit)}\t${formatBalance(closingBalance)}`;
        const fullText = `Ledger of ${userName.toUpperCase()}\nFrom ${dateFrom} To ${dateTo}\n\nOpening Balance: ${formatBalance(openingBalance)}\n\n${header}${tableData}${totalsLine}`;

        await navigator.clipboard.writeText(fullText);
        alert("Table data copied to clipboard!");
        return;
      }

      if (type === "pdf") {
        await downloadStatementPdf();
        return;
      }

      const exportUrl = `/payment/ledger/${id}/export/${type}`;
      const response = await axiosInstance.get(exportUrl, {
        headers: { Authorization: `Bearer ${token}` },
        params: { dateFrom, dateTo, userName },
        responseType: "blob",
      });

      const contentTypeHeader = response.headers["content-type"];
      const contentType =
        typeof contentTypeHeader === "string"
          ? contentTypeHeader
          : Array.isArray(contentTypeHeader)
            ? contentTypeHeader.join(", ")
            : "";

      if (contentType.includes("application/json")) {
        const reader = new FileReader();
        const errorText = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(response.data);
        });
        throw new Error(JSON.parse(errorText).message || "Export failed");
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const extension = type === "csv" ? "csv" : type === "excel" ? "xlsx" : "pdf";
      link.setAttribute("download", `ledger-${userName}-${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(`Error exporting as ${type}:`, error);
      let errorMessage = `Failed to export as ${type.toUpperCase()}.`;

      if (error.response?.data instanceof Blob) {
        try {
          const reader = new FileReader();
          const errorText = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsText(error.response.data);
          });
          errorMessage += ` ${JSON.parse(errorText).message || ""}`;
        } catch {
          errorMessage += ` Server error (Status: ${error.response.status})`;
        }
      } else if (error.response?.data?.message) {
        errorMessage += ` ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage += ` ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  const actionButtonClass = (variant: "gray" | "green" = "gray") => {
    const enabled =
      variant === "green" ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700";
    const disabled =
      variant === "green"
        ? "bg-green-600 opacity-45 cursor-not-allowed"
        : "bg-gray-600 opacity-45 cursor-not-allowed";
    return `${canUseActions ? enabled : disabled} text-white transition-colors`;
  };

  if (!canView) {
    return (
      <>
        <PageMeta title="Ledger - Access denied" description="Access denied" />
        <PageBreadCrumb pageTitle="Ledger" />
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
          You do not have permission to view Ledger.
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title={`Ledger - ${userName}`} description="View agent ledger" />
      <div className="no-print">
        <PageBreadCrumb pageTitle="Ledger" />
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box !important; }
          nav, aside, header, footer, .no-print, .print-hide,
          .ledger-screen-content, [class*="sidebar"], [class*="breadcrumb"] {
            display: none !important;
          }
          body {
            margin: 0 !important; padding: 0 !important; background: white !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .print-only { display: block !important; }
          .ledger-print-page { display: block !important; width: 100% !important; color: #111827 !important; font-family: Arial, Helvetica, sans-serif !important; font-size: 8.5pt !important; }
          .ledger-print-body { padding: 0mm 5mm !important; }
          .ledger-print-topline { text-align: right !important; color: #555 !important; font-size: 8pt !important; margin-bottom: 14px !important; }
          .ledger-print-company { display: flex !important; align-items: flex-start !important; justify-content: space-between !important; gap: 18px !important; margin-bottom: 18px !important; }
          .ledger-print-brand { display: flex !important; align-items: center !important; gap: 12px !important; min-width: 0 !important; }
          .ledger-print-logo { width: 86px !important; height: auto !important; object-fit: contain !important; }
          .ledger-print-company-text { line-height: 1.35 !important; color: #111827 !important; max-width: 430px !important; }
          .ledger-print-company-text strong { display: inline-block !important; font-size: 9pt !important; margin-bottom: 2px !important; }
          .ledger-print-opening { width: 210px !important; border: 1px solid #9ca3af !important; text-align: center !important; flex: 0 0 auto !important; }
          .ledger-print-opening div { padding: 7px 10px !important; font-weight: 700 !important; }
          .ledger-print-opening div:first-child { border-bottom: 1px solid #173a68 !important; background: #173a68 !important; color: #ffffff !important; }
          .ledger-print-titlebar {
            display: flex !important; justify-content: space-between !important; align-items: center !important;
            width: 100% !important; background: #0e2a4d !important; border: none !important; color: #ffffff !important;
            font-weight: 700 !important; font-size: 10pt !important; padding: 10px 10mm !important; margin: 0 0 16px !important;
            margin-inline: -10mm !important;
            margin-top: -10mm !important;
            padding-inline: 10mm !important;
            padding-top: 10mm !important;
            width: 100% !important;
            box-sizing: content-box !important;
          }
          .ledger-print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; font-size: 8pt !important; }
          .ledger-print-table thead { display: table-header-group !important; }
          .ledger-print-table th { background: #173a68 !important; color: #ffffff !important; border: 1px solid #173a68 !important; padding: 5px 4px !important; font-weight: 700 !important; text-align: left !important; }
          .ledger-print-table td { border: 1px solid #b6b6b6 !important; color: #1f2937 !important; padding: 5px 4px !important; vertical-align: top !important; line-height: 1.3 !important; word-break: break-word !important; }
          .ledger-print-table .text-right { text-align: right !important; }
          .ledger-print-table .ledger-print-voucher { color: #0070c0 !important; }
          .ledger-print-table .ledger-print-balance { color: #ff0000 !important; font-weight: 700 !important; white-space: nowrap !important; }
          .ledger-print-table tfoot td { background: #173a68 !important; color: #ffffff !important; font-weight: 700 !important; }
        }
      `}</style>

      {/* Print-only layout */}
      <div className="print-only" style={{ display: "none" }}>
        <div ref={statementRef} className="ledger-print-page">
          <div className="ledger-print-titlebar">
            <span>Account Statement of {userName}</span>
            <span>
              From {formatPrintDate(new Date(dateFrom))} To{" "}
              {formatPrintDate(new Date(dateTo))}
            </span>
          </div>

          <div className="ledger-print-body">
            <div className="ledger-print-topline">Print Date: {formatPrintDate()}</div>
            <div className="ledger-print-company">
              <div className="ledger-print-brand">
                <img src={logo} alt="Company logo" className="ledger-print-logo" />
                <div className="ledger-print-company-text">
                  <strong>{userName.toUpperCase()}</strong>
                  <div>{COMPANY_NAME}</div>
                  <div>Email: abid_intl@msn.com</div>
                  <div>Account statement generated from {COMPANY_NAME} portal</div>
                </div>
              </div>
              <div className="ledger-print-opening">
                <div>Opening Balance</div>
                <div>{formatBalance(openingBalance)}</div>
              </div>
            </div>

            <table className="ledger-print-table">
              <thead>
                <tr>
                  <th style={{ width: "13%" }}>Date</th>
                  <th style={{ width: "9%" }}>V.no</th>
                  <th>Details</th>
                  <th className="text-right" style={{ width: "11%" }}>Debit</th>
                  <th className="text-right" style={{ width: "11%" }}>Credit</th>
                  <th className="text-right" style={{ width: "13%" }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center">No data available</td>
                  </tr>
                ) : (
                  rowsWithBalance.map((entry, index) => (
                    <tr key={index}>
                      <td>{new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="ledger-print-voucher">{entry.voucherId || "-"}</td>
                      <td>{entry.description || "-"}</td>
                      <td className="text-right">{entry.debit > 0 ? formatAmount(entry.debit) : "0"}</td>
                      <td className="text-right">{entry.credit > 0 ? formatAmount(entry.credit) : "0"}</td>
                      <td className="text-right ledger-print-balance">{formatBalance(entry.runningBalance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td className="text-right">{formatAmount(totalDebit)}</td>
                  <td className="text-right">{formatAmount(totalCredit)}</td>
                  <td className="text-right">{formatBalance(closingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Screen layout */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3 ledger-screen-content">
        <div className="px-4 py-6 md:px-6 xl:px-7.5">

          {/* Date filter */}
          <div className="mb-4 no-print">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block mb-2 text-sm font-medium text-white">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="w-full h-11 rounded-lg border border-blue-400 bg-white px-4 py-2.5 text-sm text-gray-800 cursor-pointer shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block mb-2 text-sm font-medium text-white">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="w-full h-11 rounded-lg border border-blue-400 bg-white px-4 py-2.5 text-sm text-gray-800 cursor-pointer shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-8 py-2.5 h-11 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-colors shadow-md"
              >
                Submit
              </button>
            </form>
          </div>

          {/* Export buttons */}
          <div className="mb-4 flex flex-wrap gap-2 no-print">
            {(["copy", "csv", "excel", "pdf"] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleExport(type)}
                disabled={!canUseActions}
                className={`px-4 py-2 text-sm rounded ${actionButtonClass()}`}
              >
                {type === "copy" ? "Copy" : type === "csv" ? "CSV" : type === "excel" ? "Excel" : "PDF"}
              </button>
            ))}
            <button
              onClick={handlePrint}
              disabled={!canUseActions}
              className={`px-4 py-2 text-sm rounded ${actionButtonClass()}`}
            >
              Print
            </button>
          </div>

          {/* Statement card — mirrors the agent-side ledger design */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-[#0e2a4d] text-white font-bold px-4 sm:px-6 py-3 sm:py-3.5 text-base sm:text-lg">
              <span>Account Statement of {userName}</span>
              <span className="text-sm sm:text-base font-semibold">
                From {formatPrintDate(new Date(dateFrom))} To{" "}
                {formatPrintDate(new Date(dateTo))}
              </span>
            </div>

            <div className="p-4 sm:p-6 bg-white dark:bg-white/3">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Company logo" className="w-20 h-auto object-contain shrink-0" />
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                      {userName.toUpperCase()}
                    </h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{COMPANY_NAME}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Email: abid_intl@msn.com</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Account statement generated from {COMPANY_NAME} portal
                    </p>
                  </div>
                </div>

                {/* Opening Balance box */}
                <div className="shrink-0 border border-[#173a68] text-center min-w-45">
                  <div className="bg-[#173a68] px-4 py-2 text-sm font-bold text-white">
                    Opening Balance
                  </div>
                  <div className="px-4 py-2 text-sm font-bold text-[#173a68] dark:text-white">
                    {formatBalance(openingBalance)}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="text-gray-500 dark:text-gray-400">Loading ledger...</div>
                </div>
              ) : (
                <>
                  {/* Table — with Balance column */}
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="bg-[#173a68]">
                          <th className="px-4 py-4 text-left text-sm font-medium text-white">Voucher Id</th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-white">Date</th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-white">Description</th>
                          <th className="px-4 py-4 text-right text-sm font-medium text-white">Debit</th>
                          <th className="px-4 py-4 text-right text-sm font-medium text-white">Credit</th>
                          <th className="px-4 py-4 text-right text-sm font-medium text-white">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800/50">
                        {rowsWithBalance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                              No data available in table
                            </td>
                          </tr>
                        ) : (
                          rowsWithBalance.map((entry, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/80"
                            >
                              <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">
                                {entry.voucherId || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                                {new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                                {entry.description || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-white/90">
                                {entry.debit > 0 ? formatAmount(entry.debit) : ""}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-800 dark:text-white/90">
                                {entry.credit > 0 ? formatAmount(entry.credit) : ""}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                                {formatBalance(entry.runningBalance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#173a68] text-white font-semibold">
                          <td colSpan={3} className="px-4 py-3 text-sm text-right">
                            Total:
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatAmount(totalDebit)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatAmount(totalCredit)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold whitespace-nowrap">
                            {formatBalance(closingBalance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Summary box */}
                  <div className="mt-6 max-w-md ml-auto">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-base">
                        <span className="text-gray-800 dark:text-gray-200 font-bold">Closing Balance</span>
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {formatBalance(closingBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Ledger;