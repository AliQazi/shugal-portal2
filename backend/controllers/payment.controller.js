import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import { cloudinary } from "../config/cloudinary.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import RegisterSchema from "../models/Register.js";
import zipAccountsService from "../services/zipAccounts.service.js";
import path from "path";
import { fileURLToPath } from "url";
import ActivityLog from "../models/activitylogs.js";
import {
  sendPaymentCreatedEmails,
  sendPaymentStatusUpdateEmail,
} from "../utils/emailService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const shortId = (id = "") => String(id).slice(-6).toUpperCase();

const hydratePaymentBankNames = async (payments = []) => {
  if (
    !payments.some((payment) => !payment.bankAccountName && payment.bankAccount)
  ) {
    return payments;
  }

  try {
    const accounts = normalizeZipList(
      await zipAccountsService.getAllAccounts(),
    );
    const accountMap = new Map(
      accounts.map((account) => [
        String(account._id),
        account.account_name || account.bankName || account.accountName || "",
      ]),
    );

    return payments.map((payment) => ({
      ...payment,
      bankAccountName:
        payment.bankAccountName ||
        accountMap.get(String(payment.bankAccount || "")) ||
        "",
    }));
  } catch (error) {
    console.error("Failed to hydrate payment bank names:", error.message);
    return payments;
  }
};

const postPaymentJournalToZip = async (payment) => {
  if (payment.zipVoucherId) {
    await zipAccountsService.voidUnvoidVoucher(payment.zipVoucherId, "unvoid");
    await zipAccountsService.postUnpostVoucher(payment.zipVoucherId, "post");

    payment.journalPostedAt = new Date();
    await payment.save();

    return {
      reposted: true,
      zipVoucherId: payment.zipVoucherId,
      zipVoucherNo: payment.zipVoucherNo,
    };
  }

  const user = await RegisterSchema.findById(payment.user);

  if (!user) {
    throw new Error("Payment user not found");
  }

  const agentName = user.companyName || user.name;

  if (!agentName) {
    throw new Error("Agent company name not found");
  }

  const agentAccount = await findZipAccountByName(agentName);

  if (!agentAccount?._id) {
    throw new Error(`ZIP account not found for agent/company: ${agentName}`);
  }

  const bankAccount = await findZipAccountById(payment.bankAccount);

  if (!bankAccount?._id) {
    throw new Error("Selected ZIP bank account not found");
  }

  const bookingRef = payment.booking || payment._id;

  const description =
    payment.description ||
    (bookingRef
      ? `Payment received against Booking ID #${shortId(bookingRef)}`
      : "Payment received from agent");

  const date = new Date(payment.date || Date.now()).toISOString().split("T")[0];
  const amount = Number(payment.amount || 0);

  if (!amount || amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  const transactions = [
    {
      account: bankAccount._id,
      description,
      debit: amount,
      credit: 0,
    },
    {
      account: agentAccount._id,
      description,
      debit: 0,
      credit: amount,
    },
  ];
  const zipResponse = await zipAccountsService.createJournalVoucher({
    date,
    transactions,
  });

  const zipVoucherMongoId = zipResponse?.newVoucher?._id || null;
  const zipVoucherNo = zipResponse?.newVoucher?.voucher_id || null;

  payment.zipVoucherId = zipVoucherMongoId;
  payment.zipVoucherNo = zipVoucherNo;
  payment.description = description;
  payment.bankAccountName =
    bankAccount.account_name || payment.bankAccountName || "";
  payment.journalPostedAt = new Date();

  await payment.save();

  return zipResponse;
};

const syncPaymentVoucherStatus = async (payment, oldStatus) => {
  if (payment.status === oldStatus) return null;

  if (payment.status === "Posted") {
    return postPaymentJournalToZip(payment);
  }

  if (!payment.zipVoucherId) return null;

  if (payment.status === "Un Posted") {
    const response = await zipAccountsService.postUnpostVoucher(
      payment.zipVoucherId,
      "unpost",
    );

    payment.journalPostedAt = null;
    await payment.save();

    return response;
  }

  if (["Cancelled", "Rejected"].includes(payment.status)) {
    const response = await zipAccountsService.voidAndUnpostVoucher(
      payment.zipVoucherId,
    );

    payment.journalPostedAt = null;
    await payment.save();

    return response;
  }

  return null;
};

const normalizeZipList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

const findZipAccountById = async (accountId) => {
  const result = await zipAccountsService.getAllAccounts();
  const accounts = normalizeZipList(result);

  return accounts.find((acc) => String(acc._id) === String(accountId));
};

const findZipAccountByName = async (accountName) => {
  const result = await zipAccountsService.getAllAccounts();
  const accounts = normalizeZipList(result);

  return accounts.find(
    (acc) =>
      String(acc.account_name || "")
        .trim()
        .toLowerCase() ===
      String(accountName || "")
        .trim()
        .toLowerCase(),
  );
};

// ── Shared ledger builder ────────────────────────────────────────────────────
const buildLedgerEntries = async (userId, dateFrom, dateTo) => {
  const user = await RegisterSchema.findById(userId).select("zipId");
  const zipAccountId = user?.zipId;

  if (zipAccountId) {
    // Path 1: ZIP Accounts API
    const data = await zipAccountsService.fetchVouchersWithEntries(
      zipAccountId,
      dateFrom,
      dateTo,
    );

    const vouchers = (data?.items || []).sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (a.voucher_id || "").localeCompare(b.voucher_id || "");
    });

    const entries = [];
    for (const voucher of vouchers) {
      for (const entryCollection of voucher.entries || []) {
        if (entryCollection.accountId !== zipAccountId) continue;
        for (const entry of entryCollection.entries || []) {
          if (entry.isVoid) continue;
          const debit = entry.debit ?? 0;
          const credit = entry.credit ?? 0;
          if (debit === 0 && credit === 0) continue;
          entries.push({
            voucherId: voucher.voucher_id || "-",
            date: entry.date || voucher.date,
            ticketNumber: "",
            description: entry.description || "-",
            debit,
            credit,
          });
        }
      }
    }

    return entries.filter((e) => {
      if (!dateFrom && !dateTo) return true;
      const d = new Date(e.date);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }

  // Path 2: Local models fallback (when zipId not configured)
  const bookingFilter = { userId, status: { $ne: "cancelled" } };
  if (dateFrom || dateTo) {
    bookingFilter.createdAt = {};
    if (dateFrom) bookingFilter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      bookingFilter.createdAt.$lte = to;
    }
  }
  const bookings = await Booking.find(bookingFilter).sort({ createdAt: 1 });

  const debitEntries = bookings.map((booking) => ({
    voucherId: booking.bookingReference || "-",
    date: booking.createdAt,
    ticketNumber: booking.pnr || "",
    description: [
      booking.airline?.name,
      booking.sector,
      booking.departureDate
        ? `Dep: ${new Date(booking.departureDate).toLocaleDateString("en-GB")}`
        : null,
    ]
      .filter(Boolean)
      .join(" | "),
    debit: booking.pricing?.grandTotal || 0,
    credit: 0,
  }));

  const paymentFilter = { user: userId, status: { $ne: "Cancelled" } };
  if (dateFrom || dateTo) {
    paymentFilter.date = {};
    if (dateFrom) paymentFilter.date.$gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      paymentFilter.date.$lte = to;
    }
  }
  const payments = await Payment.find(paymentFilter)
    .populate("booking", "pnr bookingReference")
    .sort({ date: 1 });

  const creditEntries = payments.map((payment) => ({
    voucherId: payment.voucherId || "-",
    date: payment.date,
    ticketNumber: payment.booking?.pnr || "",
    description:
      payment.status === "Un Posted"
        ? `${payment.description} (Pending)`
        : payment.description,
    debit: 0,
    credit: payment.amount,
  }));

  return [...debitEntries, ...creditEntries].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
};

const resolveLedgerUserId = (req) => {
  const requestedUserId = req.params.userId;

  if (
    !requestedUserId ||
    requestedUserId === "me" ||
    requestedUserId === "current"
  ) {
    return req.user?._id || req.user?.id;
  }

  return requestedUserId;
};

// Create new payment
// export const createPayment = async (req, res) => {
//   try {
//     const { date, description, bankAccount, amount, status, remarks, booking } =
//       req.body;
//     const user = req.body.user || req.user?._id || req.user?.id;

//     // Validate required fields
//     if (!date || !description || !bankAccount || !amount || !user) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Date, description, bank account, amount, and user are required",
//       });
//     }

//     // Prepare payment data
//     const paymentData = {
//       date,
//       description,
//       bankAccount,
//       user,
//       amount,
//       status: status || "Un Posted",
//       remarks: remarks || "",
//     };

//     // Add booking if provided
//     if (booking) {
//       paymentData.booking = booking;
//     }

//     // Add receipt if uploaded
//     if (req.file) {
//       paymentData.receipt = req.file.path;
//       paymentData.receiptPublicId = req.file.filename;
//     }

//     // Create new payment
//     const newPayment = await Payment.create(paymentData);

//     // Populate bank account, user, and booking details
//     await newPayment.populate(["bankAccount", "user", "booking"]);

//     await ActivityLog.create({
//       user: req.user._id,
//       type: "Payment",
//       refModel: "Payment",
//       refId: newPayment._id,
//       description: `Payment of ${newPayment.amount} created (${newPayment.status}) - ${newPayment.description}`,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Payment created successfully",
//       data: newPayment,
//     });
//   } catch (error) {
//     console.error("Error creating payment:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error creating payment",
//       error: error.message,
//     });
//   }
// };

export const createPayment = async (req, res) => {
  try {
    const { date, description, bankAccount, amount, remarks, user, booking } =
      req.body;

    if (!date || !bankAccount || !amount || !user) {
      return res.status(400).json({
        success: false,
        message: "Date, bank account, amount, and user are required",
      });
    }

    const bankZipAccount = await findZipAccountById(bankAccount);

    if (!bankZipAccount?._id) {
      return res.status(400).json({
        success: false,
        message: "Selected bank account was not found in ZIP Accounts",
      });
    }

    const bookingRef = booking;
    const finalDescription =
      description ||
      `Payment received against Booking ID #${shortId(bookingRef)}`;

    const paymentData = {
      date,
      description: finalDescription,
      bankAccount,
      bankAccountName: bankZipAccount.account_name || "",
      user,
      amount: Number(amount),
      status: "Un Posted",
      remarks: remarks || "",
    };

    if (booking) paymentData.booking = booking;

    if (req.file) {
      paymentData.receipt = req.file.path;
      paymentData.receiptPublicId = req.file.filename;
    }

    const newPayment = await Payment.create(paymentData);

    let zipJournal = null;

    if (newPayment.status === "Posted") {
      zipJournal = await postPaymentJournalToZip(newPayment);
    }

    await newPayment.populate([
      { path: "user", select: "name email companyName" },
      { path: "booking" },
    ]);

    sendPaymentCreatedEmails({ payment: newPayment }).catch((emailError) => {
      console.error("Payment creation emails failed:", emailError.message);
    });

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: newPayment,
      zipJournal,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating payment",
    });
  }
};

// Get all payments with filters
export const getPayments = async (req, res) => {
  try {
    const { dateFrom, dateTo, status, userId } = req.query;

    // Build filter query
    let filter = {};

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);

        filter.date.$lte = endDate;
      }
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    if (req.user.role !== "Super Admin" && req.user.role !== "Admin") {
      filter.user = req.user._id;
    } else if (userId) {
      filter.user = userId;
    }

    // Fetch payments with populated bank account and user
    const payments = await Payment.find(filter)
      .populate("bankAccount")
      .populate("user", "name email companyName")
      .populate("editedBy", "name email")
      .sort({ date: -1 });

    // console.log(payments);

    // Calculate total amount
    const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
    // console.log("Payments Data:", payments);

    res.status(200).json({
      success: true,
      data: payments,
      total,
      count: payments.length,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payments",
      error: error.message,
    });
  }
};

export const getMyPayments = async (req, res) => {
  try {
    const { dateFrom, dateTo, status } = req.query;

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const filter = { user: req.user._id };

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .populate("user", "name email companyName agencyCode")
      .populate("editedBy", "name email")
      .populate("booking", "contactPersonName passengers")
      .sort({ createdAt: -1 })
      .lean();

    const paymentsWithBankNames = await hydratePaymentBankNames(payments);
    const total = paymentsWithBankNames.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    res.status(200).json({
      success: true,
      data: paymentsWithBankNames,
      total,
      count: paymentsWithBankNames.length,
    });
  } catch (error) {
    console.error("Error fetching user payments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user payments",
      error: error.message,
    });
  }
};

// Get single payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id)
      .populate("bankAccount")
      .populate("user", "name email companyName");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment",
      error: error.message,
    });
  }
};

// Update payment
// export const updatePayment = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       date,
//       description,
//       bankAccount,
//       amount,
//       status,
//       remarks,
//       editedBy,
//     } = req.body;

//     const payment = await Payment.findById(id);

//     if (!payment) {
//       return res.status(404).json({
//         success: false,
//         message: "Payment not found",
//       });
//     }

//     // Update fields
//     if (date) payment.date = date;
//     if (description) payment.description = description;
//     if (bankAccount) payment.bankAccount = bankAccount;
//     if (amount) payment.amount = amount;
//     if (status) {
//       payment.status = status;
//       // Track who changed the status and when
//       if (editedBy) {
//         payment.editedBy = editedBy;
//         payment.editedAt = new Date();
//       }
//     }
//     if (remarks !== undefined) payment.remarks = remarks;

//     // Update receipt if new file uploaded
//     if (req.file) {
//       // Delete old receipt from Cloudinary
//       if (payment.receiptPublicId) {
//         await cloudinary.uploader.destroy(payment.receiptPublicId);
//       }
//       payment.receipt = req.file.path;
//       payment.receiptPublicId = req.file.filename;
//     }

//     await payment.save();
//     await payment.populate("bankAccount");

//     await ActivityLog.create({
//       user: req.user._id,
//       type: "Payment",
//       refModel: "Payment",
//       refId: payment._id,
//       description: `Payment of ${payment.amount} updated (status: ${payment.status}) - ${payment.description}`,
//     });

//     res.status(200).json({
//       success: true,
//       message: "Payment updated successfully",
//       data: payment,
//     });
//   } catch (error) {
//     console.error("Error updating payment:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error updating payment",
//       error: error.message,
//     });
//   }
// };

export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      description,
      bankAccount,
      amount,
      status,
      remarks,
      editedBy,
    } = req.body;

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const oldStatus = payment.status;

    if (date) payment.date = date;
    if (description) payment.description = description;

    if (bankAccount) {
      const bankZipAccount = await findZipAccountById(bankAccount);

      if (!bankZipAccount?._id) {
        return res.status(400).json({
          success: false,
          message: "Selected bank account was not found in ZIP Accounts",
        });
      }

      payment.bankAccount = bankAccount;
      payment.bankAccountName = bankZipAccount.account_name || "";
    }

    if (amount) payment.amount = Number(amount);

    if (status) {
      payment.status = status;

      if (editedBy) {
        payment.editedBy = editedBy;
        payment.editedAt = new Date();
      }
    }

    if (remarks !== undefined) payment.remarks = remarks;

    if (req.file) {
      if (payment.receiptPublicId) {
        await cloudinary.uploader.destroy(payment.receiptPublicId);
      }

      payment.receipt = req.file.path;
      payment.receiptPublicId = req.file.filename;
    }

    await payment.save();

    const zipJournal = await syncPaymentVoucherStatus(payment, oldStatus);

    await ActivityLog.create({
      user: req.user._id,
      type: "Payment",
      refModel: "Payment",
      refId: payment._id,
      description: `Payment of ${payment.amount} updated (status: ${payment.status}) - ${payment.description}`,
    });

    await payment.populate([
      { path: "user", select: "name email companyName" },
      { path: "booking" },
      { path: "editedBy", select: "name email" },
    ]);

    if (status && oldStatus !== payment.status) {
      try {
        await sendPaymentStatusUpdateEmail({
          payment,
          oldStatus,
          newStatus: payment.status,
        });
      } catch (emailError) {
        console.error("Payment status update email failed:", emailError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: payment,
      zipJournal,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating payment",
    });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Delete receipt from Cloudinary if exists
    if (payment.receiptPublicId) {
      await cloudinary.uploader.destroy(payment.receiptPublicId);
    }

    await Payment.findByIdAndDelete(id);

    await ActivityLog.create({
      user: req.user._id,
      type: "Payment",
      description: `Payment of ${payment.amount} deleted - ${payment.description}`,
    });

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting payment",
      error: error.message,
    });
  }
};

// Get ledger for a specific user
export const getLedgerByUser = async (req, res) => {
  try {
    const userId = resolveLedgerUserId(req);
    const { dateFrom, dateTo } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const ledgerEntries = await buildLedgerEntries(userId, dateFrom, dateTo);

    res.status(200).json({
      success: true,
      data: ledgerEntries,
    });
  } catch (error) {
    console.error("Error fetching ledger:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching ledger",
      error: error.message,
    });
  }
};

// Export ledger as CSV
export const exportLedgerCSV = async (req, res) => {
  try {
    const userId = resolveLedgerUserId(req);
    const { dateFrom, dateTo, userName } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const ledgerEntries = await buildLedgerEntries(userId, dateFrom, dateTo);

    // Calculate totals
    const totalDebit = ledgerEntries.reduce(
      (sum, entry) => sum + entry.debit,
      0,
    );
    const totalCredit = ledgerEntries.reduce(
      (sum, entry) => sum + entry.credit,
      0,
    );
    const closingBalance = totalDebit - totalCredit;

    // Generate CSV content
    let csvContent = `Ledger of ${userName || "User"}\n`;
    csvContent += `From ${dateFrom} To ${dateTo}\n\n`;
    csvContent += "Voucher Id,Date,Description,Debit,Credit\n";

    ledgerEntries.forEach((entry) => {
      const formattedDate = new Date(entry.date).toLocaleDateString();
      csvContent += `${entry.voucherId},${formattedDate},"${entry.description}",${entry.debit},${entry.credit}\n`;
    });

    csvContent += `\nTotal,,,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)}\n`;
    csvContent += `\nClosing Balance,,,${closingBalance.toFixed(2)}\n`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ledger-${userId}-${Date.now()}.csv"`,
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Type",
    );
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting CSV",
      error: error.message,
    });
  }
};

// Export ledger as Excel
export const exportLedgerExcel = async (req, res) => {
  try {
    const userId = resolveLedgerUserId(req);
    const { dateFrom, dateTo, userName } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    console.log("Excel Export Request:", {
      userId,
      dateFrom,
      dateTo,
      userName,
    });

    const ledgerEntries = await buildLedgerEntries(userId, dateFrom, dateTo);

    const totalDebit = ledgerEntries.reduce(
      (sum, entry) => sum + entry.debit,
      0,
    );
    const totalCredit = ledgerEntries.reduce(
      (sum, entry) => sum + entry.credit,
      0,
    );
    const closingBalance = totalDebit - totalCredit;

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ledger");

    // Add title
    worksheet.mergeCells("A1:E1");
    worksheet.getCell("A1").value = `Ledger of ${userName || "User"}`;
    worksheet.getCell("A1").font = {
      bold: true,
      size: 16,
      color: { argb: "FFFF0000" },
    };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    // Add date range
    worksheet.mergeCells("A2:E2");
    worksheet.getCell("A2").value = `From ${dateFrom} To ${dateTo}`;
    worksheet.getCell("A2").font = { bold: true, color: { argb: "FF008000" } };
    worksheet.getCell("A2").alignment = { horizontal: "center" };

    // Add headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow([
      "Voucher Id",
      "Date",
      "Description",
      "Debit",
      "Credit",
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF333333" },
    };
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center" };
    });

    // Add data rows
    ledgerEntries.forEach((entry) => {
      worksheet.addRow([
        entry.voucherId,
        new Date(entry.date).toLocaleDateString(),
        entry.description,
        entry.debit > 0 ? entry.debit.toFixed(2) : "",
        entry.credit > 0 ? entry.credit.toFixed(2) : "",
      ]);
    });

    // Add total row
    const totalRow = worksheet.addRow([
      "",
      "",
      "Total",
      totalDebit.toFixed(2),
      totalCredit.toFixed(2),
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add closing balance
    worksheet.addRow([]);
    const balanceRow = worksheet.addRow([
      "",
      "",
      "Closing Balance",
      closingBalance.toFixed(2),
      "",
    ]);
    balanceRow.font = { bold: true };

    // Set column widths
    worksheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 40 },
      { width: 15 },
      { width: 15 },
    ];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ledger-${userId}-${Date.now()}.xlsx"`,
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Type",
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting Excel:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting Excel",
      error: error.message,
    });
  }
};

// Export ledger as PDF
export const exportLedgerPDF = async (req, res) => {
  try {
    const userId = resolveLedgerUserId(req);
    const { dateFrom, dateTo, userName } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    console.log("PDF Export Request:", { userId, dateFrom, dateTo, userName });

    const user = await RegisterSchema.findById(userId);

    const ledgerEntries = await buildLedgerEntries(userId, dateFrom, dateTo);

    console.log("Found ledger entries:", ledgerEntries.length);

    // Calculate opening balance (you may need to adjust this logic)
    const openingBalance = 0; // Replace with actual calculation if needed

    const totalDebit = ledgerEntries.reduce(
      (sum, entry) => sum + entry.debit,
      0,
    );
    const totalCredit = ledgerEntries.reduce(
      (sum, entry) => sum + entry.credit,
      0,
    );
    const closingBalance = openingBalance - totalCredit + totalDebit;

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ledger-${userId}-${Date.now()}.pdf"`,
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Type",
    );

    doc.pipe(res);

    // Add print date in top right
    doc
      .fontSize(8)
      .fillColor("black")
      .text(
        `Print Date: ${new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "2-digit" })}`,
        430,
        50,
      );

    // Add company logo (left side)
    try {
      const logoPath = path.join(__dirname, "..", "assests", "logo.png");
      doc.image(logoPath, 50, 65, { width: 100, height: 100 });
    } catch (err) {
      console.error("Logo error:", err);
      // Fallback to text if logo not found
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("black")
        .text("LOGO", 80, 80);
    }

    // Add company details (right side) - Dynamic user data
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("black")
      .text(user.companyName || "N/A", 180, 75);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("black")
      .text(`${user.address || ""}, ${user.city || ""}`, 180, 95, {
        width: 250,
      })
      .text(`Phone: ${user.phone || "N/A"}`, 180, 110, { width: 250 })
      .text(`Email: ${user.email || "N/A"}`, 180, 125, { width: 250 })
      .text(`Agency Code: ${user.agencyCode || "N/A"}`, 180, 140, {
        width: 250,
      });

    // Opening balance box (top right)
    // doc.rect(460, 105, 100, 35).stroke();
    // doc.fontSize(9).text('Opening Balance', 465, 110, { width: 90, align: 'center' });
    // doc.fontSize(11).font('Helvetica-Bold')
    //  .text(`${openingBalance} DR`, 465, 125, { width: 90, align: 'center' });
    //
    // doc.moveDown(4);

    // Blue header bar
    const headerY = 170;
    doc.rect(30, headerY, 550, 25).fillAndStroke("#4472C4", "#4472C4");
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("white")
      .text("Account Statement of Visa Income", 35, headerY + 7)
      .text(
        `From ${new Date(dateFrom).toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })} To ${new Date(dateTo).toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}`,
        350,
        headerY + 7,
        { width: 225, align: "right" },
      );

    // Table header (gray background)
    const tableHeaderY = headerY + 35;
    doc.rect(30, tableHeaderY, 550, 20).fillAndStroke("#D3D3D3", "#000000");

    const col1X = 50;
    const col2X = 110;
    const col3X = 200;
    const col4X = 400;
    const col5X = 470;
    const col6X = 520;

    doc.fontSize(9).font("Helvetica-Bold").fillColor("black");
    doc.text("Date", col1X, tableHeaderY + 5);
    doc.text("V no", col2X, tableHeaderY + 5);
    doc.text("Details", col3X, tableHeaderY + 5);
    doc.text("Debit", col4X, tableHeaderY + 5, { width: 60, align: "right" });
    doc.text("Credit", col5X, tableHeaderY + 5, { width: 40, align: "right" });
    doc.text("Balance", col6X, tableHeaderY + 5, { width: 50, align: "right" });

    // Table rows
    let currentY = tableHeaderY + 25;
    let runningBalance = openingBalance;

    ledgerEntries.forEach((entry, index) => {
      runningBalance = runningBalance - entry.credit + entry.debit;

      doc.fontSize(8).font("Helvetica").fillColor("black");
      doc.text(
        new Date(entry.date).toLocaleDateString("en-GB"),
        col1X,
        currentY,
      );
      doc.text(entry.voucherId.substring(0, 8), col2X, currentY);
      doc.text(entry.description.substring(0, 40), col3X, currentY, {
        width: 190,
      });
      doc.text(
        entry.debit > 0 ? entry.debit.toFixed(0) : "0",
        col4X,
        currentY,
        { width: 60, align: "right" },
      );
      doc.text(
        entry.credit > 0 ? entry.credit.toFixed(0) : "0",
        col5X,
        currentY,
        { width: 40, align: "right" },
      );
      doc
        .fillColor(runningBalance > 0 ? "black" : "red")
        .text(
          `${Math.abs(runningBalance).toFixed(0)} ${runningBalance > 0 ? "DR" : "CR"}`,
          col6X,
          currentY,
          { width: 50, align: "right" },
        );

      currentY += 18;

      if (currentY > 720) {
        doc.addPage();
        currentY = 50;
      }
    });

    // Closing balance row
    doc.rect(30, currentY, 550, 20).stroke("#000000");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("black");
    doc.text(
      "Closing Balance as on " +
        new Date(dateTo).toLocaleDateString("en-US", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      col1X,
      currentY + 5,
    );
    doc
      .fillColor(closingBalance > 0 ? "black" : "red")
      .text(
        `${Math.abs(closingBalance).toFixed(0)} ${closingBalance > 0 ? "DR" : "CR"}`,
        col6X,
        currentY + 5,
        { width: 50, align: "right" },
      );

    // Total row
    currentY += 25;
    doc.rect(30, currentY, 550, 20).stroke("#000000");
    doc.fontSize(9).font("Helvetica-Bold").fillColor("black");
    doc.text("Total", col3X, currentY + 5, { width: 190, align: "right" });
    doc.text(
      totalDebit > 0 ? totalDebit.toFixed(0) : "0",
      col4X,
      currentY + 5,
      { width: 60, align: "right" },
    );
    doc.text(
      totalCredit > 0 ? totalCredit.toFixed(0) : "0",
      col5X,
      currentY + 5,
      { width: 40, align: "right" },
    );
    doc
      .fillColor(closingBalance > 0 ? "black" : "red")
      .text(
        `${Math.abs(closingBalance).toFixed(0)} ${closingBalance > 0 ? "DR" : "CR"}`,
        col6X,
        currentY + 5,
        { width: 50, align: "right" },
      );

    doc.end();
  } catch (error) {
    console.error("Error exporting PDF:", error);
    console.error("Error stack:", error.stack);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Error exporting PDF",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
};
