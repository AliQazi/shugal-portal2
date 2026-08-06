import React from "react";
import DatePicker from "react-datepicker";
import { formatDateInput, parseMaskedDate } from "../../utils/dateInput";
import "react-datepicker/dist/react-datepicker.css";

interface MaskedDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  size?: "big" | "small";
  minDate?: Date;
  maxDate?: Date;
  placeholderText?: string;
}

export default function MaskedDatePicker({
  value,
  onChange,
  size = "big",
  minDate,
  maxDate,
  placeholderText = "DD/MM/YYYY",
}: MaskedDatePickerProps) {
  return (
    <DatePicker
      selected={value}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholderText}
      minDate={minDate}
      maxDate={maxDate}
      showYearDropdown
      dropdownMode="select"
      portalId="masked-datepicker-portal"
      popperClassName="z-99999!"
      onChange={(date: Date | null) => {
        onChange(date);
      }}
      onChangeRaw={(
        e?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
      ) => {
        if (!e) return;

        const target = e.target;

        if (!(target instanceof HTMLInputElement)) return;

        const formatted = formatDateInput(target.value);
        target.value = formatted;

        const parsed = parseMaskedDate(formatted);
        if (parsed) {
          onChange(parsed);
        }
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        const target = e.target;

        if (!(target instanceof HTMLInputElement)) return;

        const allowedKeys = [
          "Backspace",
          "Tab",
          "ArrowLeft",
          "ArrowRight",
          "Delete",
        ];

        if (!allowedKeys.includes(e.key) && !/\d/.test(e.key)) {
          e.preventDefault();
        }
      }}


      className={`w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${size === "big"
        ? "px-4 py-2 pr-10 rounded-md text-sm"
        : "px-2 py-1 rounded text-xs"
        }`}
    />
  );
}
