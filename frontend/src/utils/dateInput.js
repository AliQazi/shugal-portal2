import { parse, isValid } from "date-fns";

export const formatDateInput = (value) => {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 2) return digits;
  if (digits.length <= 4)
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

export const parseMaskedDate = (value) => {
  if (value.length !== 10) return null;
  const parsed = parse(value, "dd/MM/yyyy", new Date());
  return isValid(parsed) ? parsed : null;
};
