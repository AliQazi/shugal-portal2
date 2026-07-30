import Voucher from "../models/voucher.js";

function getVoucherCode(type) {
  return (
    {
      umrahpackagequery: "UPV",
      groupticketing: "GV",
      umrahcalculator: "UV",
      hajjcalculator: "HV",
      paymentproof: "PV",
      gamkaToken: "GTV",
      GroupTicketingBooking: "GTB",
      VisaBooking: "VBV",
      ksaVoucher: "KSAV",
      omanVoucher: "OV",
      UAEONEWAYVoucher: "UAEONEWAY",
      bahrainVoucher: "BV",
      ukVoucher: "UKV",
      umrahpkg: "URPKG",
      umrahpkgBooking: "UPBK",
    }[type] || "VX"
  );
}

export async function generateVoucher(type, bookingId, modelName) {
  try {
    let nextVoucherNumber = 1;

    // Get last voucher of this type
    const latest = await Voucher.findOne({ type }).sort({ createdAt: -1 });
    console.log("Latest voucher:", latest);

    if (latest && latest.voucher_id) {
      const parts = latest.voucher_id.split("-");
      if (parts.length > 1) {
        const last = parseInt(parts[1]);
        if (!isNaN(last)) nextVoucherNumber = last + 1;
      }
    }

    let voucherCode = getVoucherCode(type);
    console.log("Voucher code for type", type, ":", voucherCode);

    let newVoucherId = `${voucherCode}-${nextVoucherNumber
      .toString()
      .padStart(4, "0")}`;
    console.log("New voucher ID:", newVoucherId);

    // Ensure uniqueness
    let existingVoucher = await Voucher.findOne({ voucher_id: newVoucherId });
    let attempts = 0;

    while (existingVoucher && attempts < 10) {
      console.log("Voucher ID exists, incrementing:", newVoucherId);
      nextVoucherNumber++;
      newVoucherId = `${voucherCode}-${nextVoucherNumber
        .toString()
        .padStart(4, "0")}`;
      existingVoucher = await Voucher.findOne({ voucher_id: newVoucherId });
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error("Could not generate unique voucher ID after 10 attempts");
    }

    // Save to Voucher collection
    console.log("Creating voucher with ID:", newVoucherId);
    const newVoucher = await Voucher.create({
      voucher_id: newVoucherId,
      type,
      booking_ref: bookingId,
      typeRef: modelName,
    });

    console.log("Voucher created successfully:", newVoucher);
    return newVoucherId;
  } catch (err) {
    console.error("Voucher generation error details:", err);
    throw new Error("Voucher generation failed: " + err.message);
  }
}
