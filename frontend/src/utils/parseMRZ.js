// --- MRZ PARSER UTILITY ---
export const parseMRZ = (mrzText) => {
  // Clean input: normalize newlines, remove extra spaces
  const lines = mrzText
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  try {
    const line1 = lines[0];
    const line2 = lines[1];

    // Must start with P for passport
    if (!line1.startsWith("P")) return null;

    // --- Parse Names from Line 1 ---
    // Format: P<CCC + NAME_FIELD (rest of line)
    const nameField = line1.substring(5); // skip P<CCC
    const nameParts = nameField.split("<<");
    const surName = (nameParts[0] || "").replace(/</g, " ").trim();
    const givenName = (nameParts.slice(1).join(" ") || "")
      .replace(/</g, " ")
      .trim();

    // --- Parse Line 2 ---
    // Passport No: 0-8 (9 chars)
    const passportNo = line2.substring(0, 9).replace(/</g, "").trim();

    // Nationality: 10-12
    const nationality = line2.substring(10, 13).replace(/</g, "").trim();

    // DOB: 13-18
    const dobRaw = line2.substring(13, 19);

    // Sex: 20
    const sex = line2.charAt(20);

    // Expiry: 21-26
    const expiryRaw = line2.substring(21, 27);

    const parseDate = (raw, isPast = false) => {
      if (!raw || raw.replace(/</g, "").trim() === "") return null;
      const yy = parseInt(raw.substring(0, 2), 10);
      const mm = raw.substring(2, 4);
      const dd = raw.substring(4, 6);
      if (isNaN(yy) || isNaN(parseInt(mm)) || isNaN(parseInt(dd))) return null;

      const currentYY = new Date().getFullYear() % 100;
      let yyyy;
      if (isPast) {
        yyyy = yy > currentYY ? 1900 + yy : 2000 + yy;
      } else {
        // Future date (expiry)
        yyyy = yy >= currentYY ? 2000 + yy : 2100 + yy - 100;
      }

      const date = new Date(`${yyyy}-${mm}-${dd}`);
      return isNaN(date.getTime()) ? null : date;
    };

    const dob = parseDate(dobRaw, true);
    const expiry = parseDate(expiryRaw, false);

    let title = "Mr";
    if (sex === "F") title = "Ms";

    // Validate we got at least passport and name
    if (!passportNo && !surName) return null;

    return {
      surName,
      givenName,
      passport: passportNo,
      nationality,
      dateOfBirth: dob,
      passportExpiry: expiry,
      title,
    };
  } catch (e) {
    console.error("MRZ parse error:", e);
    return null;
  }
};
