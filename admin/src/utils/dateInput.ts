import { parse, isValid } from "date-fns";

/**
 * Formats raw input into DD/MM/YYYY
 */
export const formatDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

/**
 * Parses masked date string into Date object
 */
export const parseMaskedDate = (value: string): Date | null => {
  if (value.length !== 10) return null;

  const parsed = parse(value, "dd/MM/yyyy", new Date());
  return isValid(parsed) ? parsed : null;
};
