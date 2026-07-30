import UmrahCalculator from "../models/umrahCalculator.js";
import { generateVoucher } from "../utils/voucherGenerator.js";
import Voucher from "../models/voucher.js";
import UmrahPackage from "../models/UmrahPackage.js";

// ➕ Create new record

export const createUmrahCalculator = async (req, res) => {
  console.log(req.body);
  // return
  try {
    const user = req.body.userId;
    const { totalCost } = req.body;
    const numericTotalCost = Number(String(totalCost).replace(/,/g, ""));

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }
    const umrahPackage = await UmrahPackage.findById(req.body.selectedGroup);
    if (
      req.body.passengerCounts.adult + req.body.passengerCounts.child >
      umrahPackage.seats
    ) {
      return res.status(400).json({
        success: false,
        message: "Not enough seats available",
      });
    }

    // 🔹 Step 1: generate voucher first
    const voucher_id = await generateVoucher(
      "umrahcalculator",
      null,
      "UmrahCalculator",
    );

    // 🔹 Step 2: create booking with voucher_id
    const umrahCalculator = new UmrahCalculator({
      ...req.body,
      airline: req.body.selectedGroup,

      totalCost: numericTotalCost,
      user,
      voucher_id, // attach voucher id
    });

    await UmrahPackage.updateOne(
      { _id: req.body.selectedGroup },
      {
        $inc: {
          seats: -(
            req.body.passengerCounts.adults + req.body.passengerCounts.children
          ),
        },
      },
    ).exec();

    await umrahCalculator.save();
    const umrahCalculatorTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Umrah Calculator Query Received</title>
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', Arial, sans-serif;
        background-color: #f4f7fa;
        color: #333;
        word-wrap: break-word;
        -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
        padding: 20px;
        background-color: #f4f7fa;
    }
    .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #fff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        border: 1px solid #e2e8f0;
        word-wrap: break-word;
    }
    .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
        padding: 32px 20px;
        text-align: center;
    }
    .header h1 {
        margin: 0;
        font-size: 26px;
        font-weight: 700;
        word-wrap: break-word;
    }
    .content {
        padding: 32px 20px;
    }
    .message {
        font-size: 16px;
        color: #555;
        line-height: 1.6;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    .footer {
        background-color: #f8f9fa;
        padding: 24px 20px;
        text-align: center;
        font-size: 14px;
        color: #6c757d;
        border-top: 1px solid #e2e8f0;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    .footer a {
        color: #667eea;
        text-decoration: none;
        word-wrap: break-word;
    }
    .footer a:hover {
        text-decoration: underline;
    }
    @media (max-width: 600px) {
        .email-container {
            margin: 10px;
            border-radius: 10px;
        }
        .header, .content, .footer {
            padding: 20px 15px;
        }
        .header h1 {
            font-size: 22px;
        }
        .message {
            font-size: 15px;
        }
        .footer {
            font-size: 13px;
        }
    }
    </style>
    </head>
    <body>
    <div class="email-wrapper">
      <div class="email-container">
        <div class="header">
          <h1>Umrah Calculator Query</h1>
        </div>
        <div class="content">
          <p class="message">
            Dear Customer,<br><br>
            We have received your query regarding the Umrah calculator. Our team will contact you shortly with further details.
          </p>
        </div>
        <div class="footer">
          <p>For support, contact <a href="mailto:wasalemadina6@gmail.com">wasalemadina6@gmail.com</a> or call 📞 +92 3092752636</p>
          <p>🌐 www.wasalemadina.com</p>
        </div>
      </div>
    </div>
    </body>
    </html>
    `;
    // sendEmail(
    //   user,
    //   "Umrah Calculator Query Received",
    //   umrahCalculatorTemplate,
    //   true
    // );

    // 🔹 Step 3: update voucher record with booking reference
    await Voucher.findOneAndUpdate(
      { voucher_id },
      { booking_ref: umrahCalculator._id },
      { new: true },
    );

    res.status(201).json({
      success: true,
      message: "Umrah Calculator record created successfully",
      data: umrahCalculator,
    });
  } catch (error) {
    console.error("Error in createUmrahCalculator:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

//  get umrah calculator by userId
export const getUmrahCalculationsByUserId = async (req, res) => {
  console.log(req.params);
  try {
    const { userId } = req.params;

    const calculations = await UmrahCalculator.find({ user: userId }).populate(
      "user",
      "fullName",
    );

    res.json(calculations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching user umrah calculations" });
  }
};

// 📥 Get all records
export const getAllUmrahCalculators = async (req, res) => {
  try {
    const records = await UmrahCalculator.find().populate("user");
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error("Error in getAllUmrahCalculators:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// 📥 Get single record by ID
export const getUmrahCalculatorById = async (req, res) => {
  try {
    const { id } = req.params;
    // Use findById to query by _id
    const record = await UmrahCalculator.findById(id).populate("user");

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("Error in getUmrahCalculatorById:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ✏️ Update record
export const updateUmrahCalculator = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await UmrahCalculator.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    res.status(200).json({
      success: true,
      message: "Record updated successfully",
      data: record,
    });
  } catch (error) {
    console.error("Error in updateUmrahCalculator:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// 🗑 Delete record
export const deleteUmrahCalculator = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await UmrahCalculator.findByIdAndDelete(id);

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUmrahCalculator:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

export const updateUmrahStatusController = async (req, res) => {
  console.log(req.body, req.params, "hello");
  try {
    const { umrahId } = req.params; // Flight ID from URL
    const { status } = req.body; // New status from request body

    // Validate status
    const allowedStatuses = ["On Process", "Cancel", "Confirm", "Pending"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).send({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(
          ", ",
        )}`,
      });
    }

    // Get current record to check previous status
    const currentUmrah = await UmrahCalculator.findById(umrahId);
    if (!currentUmrah) {
      return res.status(404).send({
        success: false,
        message: "Umrah not found",
      });
    }

    const previousStatus = currentUmrah.status;

    // Update flight status
    const updatedUmrah = await UmrahCalculator.findByIdAndUpdate(
      umrahId,
      { status },
      { new: true },
    );

    // Handle credit management for B2B umrah bookings
    if (currentUmrah.user && !currentUmrah.isB2C) {
      const amount = currentUmrah.totalCost || 0;
      let creditDiff = 0;

      // Deduct credit when moving TO Confirm status
      if (status === "Confirm" && previousStatus !== "Confirm") {
        creditDiff = -amount;
      }

      // Refund credit when moving FROM Confirm to any other status
      if (previousStatus === "Confirm" && status !== "Confirm") {
        creditDiff = amount;
      }

      // Update agent credit balance
      if (creditDiff !== 0) {
        const Register = (await import("../models/Register.js")).default;
        await Register.updateOne(
          { _id: currentUmrah.user },
          { $inc: { creditAmount: creditDiff } },
        );
      }
    }

    res.status(200).send({
      success: true,
      message: "Umrah status updated successfully",
      flight: updatedUmrah,
    });
  } catch (error) {
    console.error("Error in updateUmrahStatusController:", error);
    res.status(500).send({
      success: false,
      message: "Error while updating umrah status",
      error: error.message,
    });
  }
};
