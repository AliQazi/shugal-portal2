// Extracts the machine-readable-zone (MRZ) text straight out of a photographed
// passport page, so the caller only needs to run it through parseMRZ().
//
// Ported from a sibling project's passport-scanning modal (Tesseract.js based),
// trimmed down to the MRZ-recovery pipeline this project actually needs:
// upload an image -> OCR a handful of crops/variants -> reconstruct the best
// TD3 (2 x 44 char) MRZ pair -> hand the raw MRZ string back to parseMRZ().
import { createWorker } from "tesseract.js";

const COUNTRY_CODES = {
  PAK: "PAKISTANI",
  IND: "INDIAN",
  EGY: "EGYPTIAN",
  GBR: "BRITISH",
  USA: "AMERICAN",
  ARE: "EMIRATI",
  SAU: "SAUDI",
  CAN: "CANADIAN",
  AUS: "AUSTRALIAN",
  BGD: "BANGLADESHI",
  LKA: "SRI LANKAN",
  NPL: "NEPALI",
  AFG: "AFGHAN",
  IDN: "INDONESIAN",
  MYS: "MALAYSIAN",
  PHL: "FILIPINO",
  THA: "THAI",
  BHR: "BAHRAINI",
  CHN: "CHINESE",
  ESP: "SPANISH",
  IRN: "IRANIAN",
  IRQ: "IRAQI",
  ITA: "ITALIAN",
  JOR: "JORDANIAN",
  JPN: "JAPANESE",
  KOR: "SOUTH KOREAN",
  KWT: "KUWAITI",
  LBN: "LEBANESE",
  MAR: "MOROCCAN",
  NLD: "DUTCH",
  DEU: "GERMAN",
  FRA: "FRENCH",
  NZL: "NEW ZEALANDER",
  OMN: "OMANI",
  QAT: "QATARI",
  SGP: "SINGAPOREAN",
  SYR: "SYRIAN",
  TUR: "TURKISH",
  VNM: "VIETNAMESE",
  YEM: "YEMENI",
};

const COUNTRY_CODE_LIST = Object.keys(COUNTRY_CODES);
const MRZ_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";
const VISUAL_NAME_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
const MRZ_WEIGHTS = [7, 3, 1];
const OCR_FILLER_CHARS = new Set(["<", "K", "L", "I", "C", "V", "E", "T", "R", "S", "5"]);
const NAME_SIMILARITY_MIN = 0.66;
const LINE2_ACCEPT_SCORE = 22;
const LINE1_ACCEPT_SCORE = 10;

const VISUAL_NOISE_WORDS = new Set([
  "PASSPORT", "TYPE", "COUNTRY", "CODE", "NUMBER", "PASSPORTNUMBER",
  "SURNAME", "GIVEN", "NAMES", "NAME", "FULL", "NATIONALITY",
  "DATE", "BIRTH", "PLACE", "SEX", "MALE", "FEMALE", "ISSUE",
  "EXPIRY", "EXPIRATION", "AUTHORITY", "OFFICE", "PROFESSION",
  "CITIZENSHIP", "IDENTITY", "PERSONAL", "REPUBLIC", "ISLAMIC",
  "MINISTRY", "GOVERNMENT", "HOLDER", "SIGNATURE", "DOCUMENT",
  "BOOKLET", "REGISTRATION", "TRACKING", "FATHER", "HUSBAND",
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG",
  "SEP", "OCT", "NOV", "DEC",
]);

Object.entries(COUNTRY_CODES).forEach(([code, nationality]) => {
  VISUAL_NOISE_WORDS.add(code);
  String(nationality)
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word) => VISUAL_NOISE_WORDS.add(word));
});

const NUMERIC_OCR_MAP = {
  O: "0",
  Q: "0",
  D: "0",
  I: "1",
  L: "1",
  T: "1",
  Z: "2",
  S: "5",
  G: "6",
  B: "8",
};

const ALPHA_OCR_MAP = {
  0: "O",
  1: "I",
  2: "Z",
  5: "S",
  6: "G",
  8: "B",
};

function normalizeMrzLine(line = "") {
  return String(line)
    .toUpperCase()
    .replace(/[Â«â¹ï¼ã]/g, "<")
    .replace(/[|]/g, "I")
    .replace(/\s/g, "")
    .replace(/[^A-Z0-9<]/g, "");
}

function toNumericMrzChar(char = "") {
  return /[0-9<]/.test(char) ? char : NUMERIC_OCR_MAP[char] || char;
}

function toAlphaMrzChar(char = "") {
  return /[A-Z<]/.test(char) ? char : ALPHA_OCR_MAP[char] || char;
}

function mrzCharacterValue(char) {
  if (char === "<") return 0;
  if (/\d/.test(char)) return Number(char);
  if (/[A-Z]/.test(char)) return char.charCodeAt(0) - 55;
  return 0;
}

function calculateMrzCheckDigit(value = "") {
  const total = [...value].reduce(
    (sum, char, index) =>
      sum + mrzCharacterValue(char) * MRZ_WEIGHTS[index % 3],
    0,
  );

  return String(total % 10);
}

function isValidMrzDate(value = "") {
  if (!/^\d{6}$/.test(value)) return false;

  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));

  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function fillerRatio(value = "") {
  const chars = [...String(value).toUpperCase()].filter((char) => /[A-Z<]/.test(char));
  if (!chars.length) return 0;
  return chars.filter((char) => OCR_FILLER_CHARS.has(char)).length / chars.length;
}

function isFillerDominated(value = "", minimumLength = 3) {
  const normalized = normalizeMrzLine(value);
  if (normalized.length < minimumLength) return false;

  const unique = new Set(normalized.replace(/</g, ""));
  return (
    fillerRatio(normalized) >= 0.78 &&
    (unique.size <= 4 || /(.)\1\1/.test(normalized))
  );
}

function trimFillerTail(value = "") {
  const normalized = normalizeMrzLine(value).replace(/</g, "");

  for (let index = 2; index <= normalized.length - 3; index += 1) {
    const suffix = normalized.slice(index);
    if (isFillerDominated(suffix, 3)) return normalized.slice(0, index);
  }

  return normalized;
}

function trimFillerHead(value = "") {
  const normalized = normalizeMrzLine(value).replace(/</g, "");

  for (let index = normalized.length - 2; index >= 3; index -= 1) {
    const prefix = normalized.slice(0, normalized.length - index);
    if (isFillerDominated(prefix, 3)) return normalized.slice(normalized.length - index);
  }

  return normalized;
}

function createTokenVariants(token = "") {
  const value = normalizeMrzLine(token).replace(/</g, "");
  const variants = new Set([value, trimFillerTail(value), trimFillerHead(value)]);

  if (value.length >= 4 && OCR_FILLER_CHARS.has(value[0])) {
    variants.add(value.slice(1));
  }
  if (value.length >= 4 && OCR_FILLER_CHARS.has(value.at(-1))) {
    variants.add(value.slice(0, -1));
  }
  if (
    value.length >= 5 &&
    OCR_FILLER_CHARS.has(value[0]) &&
    OCR_FILLER_CHARS.has(value[1])
  ) {
    variants.add(value.slice(2));
  }
  if (
    value.length >= 5 &&
    OCR_FILLER_CHARS.has(value.at(-1)) &&
    OCR_FILLER_CHARS.has(value.at(-2))
  ) {
    variants.add(value.slice(0, -2));
  }

  return [...variants].filter(
    (variant) =>
      variant.length >= 2 &&
      /^[A-Z]+$/.test(variant) &&
      !isFillerDominated(variant, 3),
  );
}

function levenshteinDistance(left = "", right = "") {
  const a = String(left);
  const b = String(right);
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];

    for (let column = 1; column <= b.length; column += 1) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitutionCost,
      );
    }

    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[b.length];
}

function similarityScore(left = "", right = "") {
  const longest = Math.max(left.length, right.length);
  if (!longest) return 1;
  return 1 - levenshteinDistance(left, right) / longest;
}

function normalizeVisualNameText(value = "") {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z\n]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function createVisualEvidence(attempts = []) {
  const evidence = new Map();

  attempts.forEach((attempt, attemptIndex) => {
    const text = normalizeVisualNameText(
      typeof attempt === "string" ? attempt : attempt?.text || "",
    );
    const confidence = Number.isFinite(Number(attempt?.confidence))
      ? Number(attempt.confidence)
      : 40;
    const seenInAttempt = new Set();

    text
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2 && /^[A-Z]+$/.test(word))
      .forEach((word, wordIndex) => {
        if (VISUAL_NOISE_WORDS.has(word)) return;

        const current = evidence.get(word) || {
          word,
          support: 0,
          confidence: 0,
          firstOrder: attemptIndex * 1000 + wordIndex,
        };

        if (!seenInAttempt.has(word)) {
          current.support += 1;
          seenInAttempt.add(word);
        }

        current.confidence = Math.max(current.confidence, confidence);
        current.firstOrder = Math.min(
          current.firstOrder,
          attemptIndex * 1000 + wordIndex,
        );
        evidence.set(word, current);
      });
  });

  return [...evidence.values()];
}

function findBestVisualMatch(token = "", visualEvidence = []) {
  const variants = createTokenVariants(token);
  let best = null;

  variants.forEach((variant) => {
    visualEvidence.forEach((entry) => {
      const similarity = similarityScore(variant, entry.word);
      const distance = levenshteinDistance(variant, entry.word);
      const lengthDifference = Math.abs(variant.length - entry.word.length);
      const isEligible =
        similarity >= NAME_SIMILARITY_MIN ||
        (distance <= 1 && Math.max(variant.length, entry.word.length) >= 4) ||
        (distance <= 2 && Math.max(variant.length, entry.word.length) >= 7);

      if (!isEligible || lengthDifference > 4) return;

      const score =
        similarity * 100 +
        entry.support * 14 +
        Math.min(8, entry.confidence / 12) -
        lengthDifference * 2;

      if (!best || score > best.score) {
        best = {
          value: entry.word,
          sourceVariant: variant,
          score,
          similarity,
          support: entry.support,
          visualConfidence: entry.confidence,
          verified: similarity >= 0.78 || entry.support >= 2,
        };
      }
    });
  });

  return best;
}

function findIssuerCode(value = "", fallbackIssuerCode = "") {
  const candidates = [...new Set([
    fallbackIssuerCode,
    ...COUNTRY_CODE_LIST,
  ].filter((code) => /^[A-Z]{3}$/.test(code)))];

  let best = null;

  candidates.forEach((code) => {
    const index = value.indexOf(code);
    if (index >= 1 && index <= 8) {
      if (!best || index < best.index) best = { code, index };
    }
  });

  return best;
}

function isLikelyNameLine(value = "") {
  const normalized = normalizeMrzLine(value);
  const letters = (normalized.match(/[A-Z]/g) || []).length;
  const digits = (normalized.match(/\d/g) || []).length;

  return (
    normalized.length >= 8 &&
    letters >= 5 &&
    digits <= Math.max(2, Math.floor(normalized.length * 0.12)) &&
    !/\d{5,}/.test(normalized)
  );
}

function getRawNameSegments(rawNameField = "") {
  const value = normalizeMrzLine(rawNameField);
  const segments = [];
  const matcher = /[A-Z0-9]+/g;
  let match;

  while ((match = matcher.exec(value))) {
    const raw = match[0]
      .split("")
      .map((char) => toAlphaMrzChar(char))
      .join("");

    if (raw.length < 2 || isFillerDominated(raw, 3)) continue;

    const trimmed = trimFillerTail(raw);
    if (trimmed.length < 2 || isFillerDominated(trimmed, 3)) continue;

    segments.push({
      raw,
      value: trimmed,
      start: match.index,
      end: match.index + raw.length,
    });

    if (segments.length >= 8) break;
  }

  return segments;
}

function findRealNameSeparator(nameField = "") {
  let searchFrom = 0;

  while (searchFrom < nameField.length) {
    const index = nameField.indexOf("<<", searchFrom);
    if (index < 0) return -1;

    const surnamePart = nameField.slice(0, index).replace(/</g, "");
    const afterSeparator = nameField.slice(index + 2);
    const firstGivenToken = (afterSeparator.match(/^[A-Z]+/) || [""])[0];

    if (
      surnamePart.length >= 2 &&
      (firstGivenToken.length >= 2 || /^<+$/.test(afterSeparator)) &&
      !isFillerDominated(firstGivenToken, 3)
    ) {
      return index;
    }

    searchFrom = index + 2;
  }

  return -1;
}

function buildProvisionalNameField(rawNameField = "") {
  let value = normalizeMrzLine(rawNameField).slice(0, 70);
  const exactSeparator = findRealNameSeparator(value);

  if (exactSeparator >= 0) {
    const surname = value
      .slice(0, exactSeparator)
      .split(/<+/)
      .filter(Boolean)
      .map(trimFillerTail)
      .filter((token) => token.length >= 2 && !isFillerDominated(token, 3));
    const given = value
      .slice(exactSeparator + 2)
      .split(/<+/)
      .filter(Boolean)
      .map(trimFillerTail)
      .filter((token) => token.length >= 2 && !isFillerDominated(token, 3));

    return `${surname.join("<")}<<${given.join("<")}`
      .slice(0, 39)
      .padEnd(39, "<");
  }

  const segments = getRawNameSegments(value);
  if (!segments.length) return "".padEnd(39, "<");

  const surname = segments[0].value;
  const given = segments.slice(1, 5).map((segment) => segment.value);

  return `${surname}<<${given.join("<")}`
    .slice(0, 39)
    .padEnd(39, "<");
}

function buildTd3Line1Candidate(rawLine = "", fallbackIssuerCode = "") {
  const value = normalizeMrzLine(rawLine);
  if (!isLikelyNameLine(value)) return null;

  const issuerMatch = findIssuerCode(value, fallbackIssuerCode);
  let issuerCode = issuerMatch?.code || fallbackIssuerCode;
  let rawNameField = issuerMatch
    ? value.slice(issuerMatch.index + 3)
    : value;

  if (!/^[A-Z]{3}$/.test(issuerCode)) return null;

  if (issuerMatch) {
    rawNameField = rawNameField.replace(/^<+/, "");
  }

  const nameField = buildProvisionalNameField(rawNameField);
  const line = `P<${issuerCode}${nameField}`.slice(0, 44).padEnd(44, "<");
  const rawHasSeparator = findRealNameSeparator(rawNameField) >= 0;
  const segments = getRawNameSegments(rawNameField);

  let score = 0;
  if (issuerMatch) score += 8;
  else score += 1;
  if (rawHasSeparator) score += 10;
  if (segments.length) score += 4;
  if (segments.length >= 2) score += 3;
  if (segments.some((segment) => isFillerDominated(segment.raw, 4))) score -= 4;

  return {
    line,
    score,
    issuerCode,
    rawNameField,
    rawLine: value,
    hadIssuerPrefix: Boolean(issuerMatch),
  };
}

function addSizedLine2Variant(variants, candidate = "") {
  const value = normalizeMrzLine(candidate);
  if (!value) return;

  if (value.length === 44) variants.add(value);

  if (value.length >= 36 && value.length < 44) {
    variants.add(value.padEnd(44, "<"));
  }

  if (value.length > 44) {
    for (let start = 0; start <= value.length - 44; start += 1) {
      variants.add(value.slice(start, start + 44));
    }
  }
}

function createLine2Variants(rawLine = "") {
  const value = normalizeMrzLine(rawLine);
  const variants = new Set();
  addSizedLine2Variant(variants, value);

  for (let index = 0; index <= value.length - 3; index += 1) {
    const code = value
      .slice(index, index + 3)
      .split("")
      .map((char) => toAlphaMrzChar(char))
      .join("");

    if (!/^[A-Z]{3}$/.test(code)) continue;

    let aligned;
    if (index < 10) {
      aligned = `${value.slice(0, index)}${"<".repeat(10 - index)}${code}${value.slice(index + 3)}`;
    } else if (index > 10) {
      aligned = `${value.slice(index - 10, index)}${code}${value.slice(index + 3)}`;
    } else {
      aligned = `${value.slice(0, index)}${code}${value.slice(index + 3)}`;
    }

    addSizedLine2Variant(variants, aligned);
  }

  if (value.length === 43) {
    for (let index = 0; index <= value.length; index += 1) {
      addSizedLine2Variant(
        variants,
        `${value.slice(0, index)}<${value.slice(index)}`,
      );
    }
  }

  if (value.length === 45) {
    for (let index = 0; index < value.length; index += 1) {
      addSizedLine2Variant(
        variants,
        `${value.slice(0, index)}${value.slice(index + 1)}`,
      );
    }
  }

  return [...variants].filter((variant) => variant.length === 44);
}

function normalizeTd3Line2(rawLine = "") {
  if (rawLine.length !== 44) return "";

  const chars = rawLine.split("");
  const numericIndexes = [
    9,
    13, 14, 15, 16, 17, 18, 19,
    21, 22, 23, 24, 25, 26, 27,
    42, 43,
  ];

  numericIndexes.forEach((index) => {
    chars[index] = toNumericMrzChar(chars[index]);
  });

  [10, 11, 12].forEach((index) => {
    chars[index] = toAlphaMrzChar(chars[index]);
  });

  chars[20] = toAlphaMrzChar(chars[20]);
  if (!/[MF<]/.test(chars[20])) chars[20] = "<";

  const expectedPassportCheck = chars[9];
  const passportField = chars.slice(0, 9);
  const replacements = {
    O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2",
    S: "5", G: "6", B: "8",
    0: "O", 1: "I", 2: "Z", 5: "S", 6: "G", 8: "B",
  };

  if (
    /^\d$/.test(expectedPassportCheck) &&
    calculateMrzCheckDigit(passportField.join("")) !== expectedPassportCheck
  ) {
    for (let index = 0; index < passportField.length; index += 1) {
      const replacement = replacements[passportField[index]];
      if (!replacement) continue;
      const candidate = [...passportField];
      candidate[index] = replacement;
      if (calculateMrzCheckDigit(candidate.join("")) === expectedPassportCheck) {
        candidate.forEach((char, candidateIndex) => {
          chars[candidateIndex] = char;
        });
        break;
      }
    }
  }

  return chars.join("");
}

function scoreTd3Line2(line = "") {
  if (line.length !== 44 || !/^[A-Z0-9<]{44}$/.test(line)) {
    return -100;
  }

  let score = 0;

  if (/^[A-Z0-9<]{9}[0-9<][A-Z]{3}\d{6}\d[MF<]\d{6}\d/.test(line)) {
    score += 12;
  }

  const nationality = line.slice(10, 13);
  if (COUNTRY_CODE_LIST.includes(nationality)) score += 8;
  else if (/^[A-Z]{3}$/.test(nationality)) score -= 8;
  if (isValidMrzDate(line.slice(13, 19))) score += 4;
  if (isValidMrzDate(line.slice(21, 27))) score += 4;

  if (calculateMrzCheckDigit(line.slice(0, 9)) === line[9]) score += 7;
  if (calculateMrzCheckDigit(line.slice(13, 19)) === line[19]) score += 8;
  if (calculateMrzCheckDigit(line.slice(21, 27)) === line[27]) score += 8;
  if (calculateMrzCheckDigit(line.slice(28, 42)) === line[42]) score += 3;

  const composite = `${line.slice(0, 10)}${line.slice(13, 20)}${line.slice(21, 43)}`;
  if (calculateMrzCheckDigit(composite) === line[43]) score += 10;

  return score;
}

function getTd3NameParts(line1 = "") {
  const normalized = normalizeMrzLine(line1).slice(0, 44).padEnd(44, "<");
  if (!normalized.startsWith("P<")) return null;

  const nameField = normalized.slice(5);
  const separatorIndex = nameField.indexOf("<<");
  if (separatorIndex < 1) return null;

  return {
    surnameTokens: nameField
      .slice(0, separatorIndex)
      .split(/<+/)
      .filter(Boolean),
    givenTokens: nameField
      .slice(separatorIndex + 2)
      .split(/<+/)
      .filter(Boolean),
  };
}

function isSuspiciousNameLine(line1 = "") {
  const parts = getTd3NameParts(line1);
  if (!parts || !parts.surnameTokens.length) return true;

  const tokens = [...parts.surnameTokens, ...parts.givenTokens];
  const lastSurname = parts.surnameTokens.at(-1) || "";
  const firstGiven = parts.givenTokens[0] || "";
  const lastGiven = parts.givenTokens.at(-1) || "";
  const boundaryArtifactChars = new Set(["K", "C", "L", "I"]);
  const hasPossibleBoundaryArtifact =
    boundaryArtifactChars.has(lastSurname.at(-1)) ||
    boundaryArtifactChars.has(firstGiven[0]) ||
    boundaryArtifactChars.has(lastGiven.at(-1));

  return (
    hasPossibleBoundaryArtifact ||
    tokens.some(
      (token) =>
        token.length > 18 ||
        isFillerDominated(token, 4) ||
        trimFillerTail(token) !== token,
    )
  );
}

function extractMrzDetails(rawText = "") {
  const lines = String(rawText)
    .toUpperCase()
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .filter((line) => line.length >= 8);

  let bestLine2 = "";
  let bestLine2Score = -Infinity;

  lines.forEach((line) => {
    createLine2Variants(line).forEach((variant) => {
      const normalized = normalizeTd3Line2(variant);
      const score = scoreTd3Line2(normalized);

      if (score > bestLine2Score) {
        bestLine2 = normalized;
        bestLine2Score = score;
      }
    });
  });

  const fallbackIssuerCode =
    bestLine2Score >= LINE2_ACCEPT_SCORE && /^[A-Z]{3}$/.test(bestLine2.slice(10, 13))
      ? bestLine2.slice(10, 13)
      : "";

  let bestLine1 = "";
  let bestLine1Score = -Infinity;
  const rawNameCandidates = [];

  lines.forEach((line) => {
    const candidate = buildTd3Line1Candidate(line, fallbackIssuerCode);
    if (!candidate) return;

    rawNameCandidates.push(candidate);

    if (candidate.score > bestLine1Score) {
      bestLine1 = candidate.line;
      bestLine1Score = candidate.score;
    }
  });

  const hasLine2 = bestLine2Score >= LINE2_ACCEPT_SCORE;
  const hasLine1 = bestLine1Score >= LINE1_ACCEPT_SCORE;

  return {
    mrz: hasLine1 && hasLine2 ? `${bestLine1}\n${bestLine2}` : null,
    bestLine1,
    bestLine2,
    bestLine1Score,
    bestLine2Score,
    fallbackIssuerCode,
    rawNameCandidates,
    hasLine1,
    hasLine2,
  };
}

function findApproximateSpan(raw = "", target = "", startAt = 0) {
  let best = null;
  const minimumLength = Math.max(2, target.length - 2);
  const maximumLength = Math.min(raw.length - startAt, target.length + 2);

  for (let start = startAt; start < raw.length; start += 1) {
    for (let length = minimumLength; length <= maximumLength; length += 1) {
      const end = start + length;
      if (end > raw.length) break;
      const candidate = raw.slice(start, end).replace(/</g, "");
      if (!candidate) continue;

      const similarity = similarityScore(candidate, target);
      if (!best || similarity > best.similarity) {
        best = { start, end, similarity };
      }
    }
  }

  return best && best.similarity >= 0.55 ? best : null;
}

function alignWordsToRaw(rawNameField = "", words = []) {
  const raw = normalizeMrzLine(rawNameField);
  const spans = [];
  let cursor = 0;

  for (const word of words) {
    const span = findApproximateSpan(raw, word, cursor);
    if (!span) return null;
    spans.push(span);
    cursor = span.end;
  }

  return { raw, spans };
}

function determineNameSplit(words = [], rawNameCandidates = []) {
  if (words.length <= 1) {
    return { splitIndex: 1, confident: true, scores: [] };
  }

  const scores = Array.from({ length: words.length - 1 }, (_, index) => ({
    splitIndex: index + 1,
    score: 0,
    doubleVotes: 0,
    singleVotes: 0,
  }));

  rawNameCandidates.forEach((candidate) => {
    const alignment = alignWordsToRaw(candidate.rawNameField, words);
    if (!alignment) return;

    scores.forEach((entry) => {
      const left = alignment.spans[entry.splitIndex - 1];
      const right = alignment.spans[entry.splitIndex];
      const gap = alignment.raw.slice(left.end, right.start);
      const separatorLike = [...gap].filter((char) => OCR_FILLER_CHARS.has(char));

      if (gap.includes("<<")) {
        entry.score += 14;
        entry.doubleVotes += 1;
      } else if (gap.length >= 2 && separatorLike.length === gap.length) {
        entry.score += 8;
        entry.doubleVotes += 1;
      } else if (gap.length === 1 && separatorLike.length === 1) {
        entry.score -= 2;
        entry.singleVotes += 1;
      }
    });
  });

  scores[0].score += 1;
  scores.sort((left, right) => right.score - left.score);

  const best = scores[0];
  const runnerUp = scores[1];
  return {
    splitIndex: best.splitIndex,
    confident:
      best.doubleVotes > 0 &&
      best.score - (runnerUp?.score ?? -Infinity) >= 3,
    scores,
  };
}

function recoverNameSequence(candidate, visualEvidence = []) {
  const segments = getRawNameSegments(candidate.rawNameField);
  const recovered = [];
  let score = candidate.score;
  let verifiedCount = 0;

  segments.forEach((segment) => {
    const visualMatch = findBestVisualMatch(segment.raw, visualEvidence);
    const fallback = createTokenVariants(segment.raw)[0] || segment.value;
    const value = visualMatch?.value || fallback;

    if (!value || value.length < 2 || isFillerDominated(value, 3)) return;
    if (recovered.at(-1)?.value === value) return;

    recovered.push({
      value,
      raw: segment.raw,
      verified: Boolean(visualMatch?.verified),
      visualMatch,
    });

    if (visualMatch) {
      score += visualMatch.score;
      if (visualMatch.verified) verifiedCount += 1;
    } else {
      score -= 8;
    }
  });

  return {
    candidate,
    words: recovered.map((entry) => entry.value),
    recovered,
    score: score + verifiedCount * 15,
    verifiedCount,
  };
}

function recoverTd3Name({ mrzResult, visualAttempts = [] }) {
  const visualEvidence = createVisualEvidence(visualAttempts);
  const rawCandidates = mrzResult.rawNameCandidates || [];
  const sequences = rawCandidates
    .map((candidate) => recoverNameSequence(candidate, visualEvidence))
    .filter((sequence) => sequence.words.length > 0)
    .sort((left, right) => right.score - left.score);

  const best = sequences[0];
  if (!best) return null;

  const split = determineNameSplit(best.words, rawCandidates);
  const surnameTokens = best.words.slice(0, split.splitIndex);
  const givenTokens = best.words.slice(split.splitIndex);
  const issuerCode =
    best.candidate.issuerCode ||
    mrzResult.fallbackIssuerCode ||
    mrzResult.bestLine2?.slice(10, 13) ||
    "UTO";
  const nameField = `${surnameTokens.join("<")}<<${givenTokens.join("<")}`
    .slice(0, 39)
    .padEnd(39, "<");
  const line1 = `P<${issuerCode}${nameField}`.slice(0, 44).padEnd(44, "<");
  const hasVisualVerification = best.verifiedCount > 0;
  const isMononym = givenTokens.length === 0;

  return {
    line1,
    isMononym,
    needsReview:
      !hasVisualVerification ||
      (!split.confident && best.words.length > 1) ||
      isMononym,
  };
}

function shouldRecoverNames(mrzResult) {
  return (
    mrzResult.hasLine2 &&
    (
      !mrzResult.mrz ||
      !mrzResult.hasLine1 ||
      mrzResult.bestLine1Score < 18 ||
      isSuspiciousNameLine(mrzResult.bestLine1)
    )
  );
}

function loadBrowserImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load the passport image."));
    };

    image.src = url;
  });
}

function calculateOtsuThreshold(grayValues) {
  const histogram = new Uint32Array(256);
  grayValues.forEach((value) => {
    histogram[value] += 1;
  });

  const total = grayValues.length;
  let totalWeighted = 0;
  for (let index = 0; index < 256; index += 1) {
    totalWeighted += index * histogram[index];
  }

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let maximumVariance = -1;
  let threshold = 150;

  for (let index = 0; index < 256; index += 1) {
    backgroundWeight += histogram[index];
    if (!backgroundWeight) continue;

    const foregroundWeight = total - backgroundWeight;
    if (!foregroundWeight) break;

    backgroundSum += index * histogram[index];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean =
      (totalWeighted - backgroundSum) / foregroundWeight;
    const variance =
      backgroundWeight *
      foregroundWeight *
      (backgroundMean - foregroundMean) ** 2;

    if (variance > maximumVariance) {
      maximumVariance = variance;
      threshold = index;
    }
  }

  return threshold;
}

function preprocessCanvas(canvas, variant) {
  if (variant === "original") return;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const grayValues = new Uint8ClampedArray(canvas.width * canvas.height);

  for (
    let pixelIndex = 0, grayIndex = 0;
    pixelIndex < pixels.length;
    pixelIndex += 4, grayIndex += 1
  ) {
    grayValues[grayIndex] = Math.round(
      pixels[pixelIndex] * 0.299 +
      pixels[pixelIndex + 1] * 0.587 +
      pixels[pixelIndex + 2] * 0.114,
    );
  }

  const threshold = calculateOtsuThreshold(grayValues);

  for (
    let pixelIndex = 0, grayIndex = 0;
    pixelIndex < pixels.length;
    pixelIndex += 4, grayIndex += 1
  ) {
    const gray = grayValues[grayIndex];
    let value;

    if (variant === "binary") {
      value = gray < threshold ? 0 : 255;
    } else {
      value = Math.max(0, Math.min(255, (gray - 128) * 1.65 + 128));
    }

    pixels[pixelIndex] = value;
    pixels[pixelIndex + 1] = value;
    pixels[pixelIndex + 2] = value;
    pixels[pixelIndex + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not prepare the MRZ crop."));
    }, "image/png");
  });
}

async function createPassportRegion(
  image,
  {
    startX = 0,
    endX = 1,
    startY = 0,
    endY = 1,
    variant = "original",
    targetWidth = 2200,
  } = {},
) {
  const sourceX = Math.max(0, Math.floor(image.width * startX));
  const sourceRight = Math.min(image.width, Math.ceil(image.width * endX));
  const sourceY = Math.max(0, Math.floor(image.height * startY));
  const sourceBottom = Math.min(image.height, Math.ceil(image.height * endY));
  const sourceWidth = Math.max(1, sourceRight - sourceX);
  const sourceHeight = Math.max(1, sourceBottom - sourceY);
  const scale = Math.max(1.6, Math.min(4, targetWidth / sourceWidth));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = variant !== "original";

  if (variant !== "original") {
    context.imageSmoothingQuality = "high";
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  preprocessCanvas(canvas, variant);
  return canvasToBlob(canvas);
}

async function createPassportCrop(
  image,
  startRatio,
  endRatio,
  variant = "original",
  targetWidth = 2200,
) {
  return createPassportRegion(image, {
    startY: startRatio,
    endY: endRatio,
    variant,
    targetWidth,
  });
}

async function recognizePrintedNames(worker, image) {
  const passes = [
    { label: "visual-right-gray", startX: 0.22, endX: 1, startY: 0.04, endY: 0.78, variant: "gray", psm: 11 },
    { label: "visual-full-original", startX: 0, endX: 1, startY: 0.04, endY: 0.76, variant: "original", psm: 11 },
    { label: "visual-right-block", startX: 0.20, endX: 1, startY: 0.08, endY: 0.78, variant: "gray", psm: 6 },
    { label: "visual-lower-details", startX: 0.16, endX: 1, startY: 0.30, endY: 0.80, variant: "gray", psm: 11 },
  ];

  const attempts = [];

  for (const pass of passes) {
    const blob = await createPassportRegion(image, {
      startX: pass.startX,
      endX: pass.endX,
      startY: pass.startY,
      endY: pass.endY,
      variant: pass.variant,
      targetWidth: 1900,
    });
    const blobUrl = URL.createObjectURL(blob);

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: String(pass.psm),
        tessedit_char_whitelist: VISUAL_NAME_WHITELIST,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });

      const { data } = await worker.recognize(blobUrl);
      attempts.push({
        label: pass.label,
        text: data?.text || "",
        confidence: Number(data?.confidence) || 0,
      });
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  return attempts;
}

/**
 * Runs OCR against a photographed passport image and reconstructs the
 * 2-line TD3 machine-readable-zone text (the same format a user would paste
 * into the "Scan Passport MRZ" box). Returns null when no MRZ could be
 * recovered with reasonable confidence.
 *
 * @param {File} file - the passport image selected by the user
 * @returns {Promise<{ mrz: string, needsReview: boolean } | null>}
 */
export async function scanPassportImageForMrz(file) {
  let worker = null;
  let imageUrl = null;

  try {
    worker = await createWorker(
      "eng",
      1,
      {},
      {
        load_system_dawg: "0",
        load_freq_dawg: "0",
      },
    );

    await worker.setParameters({
      tessedit_char_whitelist: MRZ_WHITELIST,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });

    const { image, url } = await loadBrowserImage(file);
    imageUrl = url;
    const recognizedTexts = [];
    const isOpenBookPhoto = image.height / image.width > 1.1;

    const recognizeCrop = async ({ start, end, variant, psm }) => {
      const blob = await createPassportCrop(image, start, end, variant);
      const blobUrl = URL.createObjectURL(blob);

      try {
        await worker.setParameters({
          tessedit_pageseg_mode: String(psm),
          tessedit_char_whitelist: MRZ_WHITELIST,
        });

        const {
          data: { text },
        } = await worker.recognize(blobUrl);

        recognizedTexts.push(text);
        return text;
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    };

    if (isOpenBookPhoto) {
      await recognizeCrop({ start: 0.86, end: 1, variant: "original", psm: 6 });
      await recognizeCrop({ start: 0.89, end: 1, variant: "gray", psm: 6 });
    }

    await recognizeCrop({ start: 0.76, end: 1, variant: "original", psm: 6 });
    await recognizeCrop({ start: 0.80, end: 1, variant: "original", psm: 6 });
    await recognizeCrop({ start: 0.70, end: 1, variant: "original", psm: 6 });

    let mrzResult = extractMrzDetails(recognizedTexts.join("\n"));
    let mrz = mrzResult?.mrz || null;

    if (!mrzResult?.hasLine2 || !mrzResult?.hasLine1) {
      await recognizeCrop({ start: 0.72, end: 1, variant: "gray", psm: 6 });
      await recognizeCrop({ start: 0.72, end: 1, variant: "binary", psm: 6 });
      await recognizeCrop({ start: 0.65, end: 1, variant: "original", psm: 6 });

      mrzResult = extractMrzDetails(recognizedTexts.join("\n"));
      mrz = mrzResult?.mrz || null;
    }

    let needsReview = false;

    // The name line has no check digit, so a suspicious name result is
    // verified against the printed biographical area before we trust it.
    if (mrzResult && shouldRecoverNames(mrzResult)) {
      let visualAttempts = [];

      try {
        visualAttempts = await recognizePrintedNames(worker, image);
      } catch {
        needsReview = true;
      }

      const nameRecovery = recoverTd3Name({ mrzResult, visualAttempts });

      if (nameRecovery && mrzResult.hasLine2) {
        mrz = `${nameRecovery.line1}\n${mrzResult.bestLine2}`;
        needsReview = needsReview || nameRecovery.needsReview;
      } else if (!mrz) {
        needsReview = true;
      }
    }

    if (!mrz) return null;

    return { mrz, needsReview };
  } finally {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (worker) await worker.terminate();
  }
}
