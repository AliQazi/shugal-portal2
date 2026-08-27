// import DatePicker from "react-datepicker";
// import { formatDateInput, parseMaskedDate } from "../../utils/dateInput";
// import 'react-datepicker/dist/react-datepicker.css'

// export default function MaskedDatePicker({ value, onChange, size = "big" }) {
//   return (
//     <DatePicker
//       selected={value}
//       dateFormat="dd/MM/yyyy"
//       placeholderText="DD/MM/YYYY"
//       onChange={onChange}
//       onChangeRaw={(e) => {
//         const formatted = formatDateInput(e.target.value);
//         e.target.value = formatted;

//         const parsed = parseMaskedDate(formatted);
//         if (parsed) onChange(parsed);
//       }}
//       onKeyDown={(e) => {
//         const allowed = [
//           "Backspace",
//           "Tab",
//           "ArrowLeft",
//           "ArrowRight",
//           "Delete",
//         ];
//         if (!allowed.includes(e.key) && !/\d/.test(e.key)) {
//           e.preventDefault();
//         }
//       }}
//       // className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
//       className={`w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${size === "big" ? "px-4 py-2 pr-10 rounded-md text-sm" : "px-2 py-1 rounded text-xs"}`}
//     />
//   );
// }


import DatePicker from "react-datepicker"

import { formatDateInput, parseMaskedDate } from "../../utils/dateInput"
import "react-datepicker/dist/react-datepicker.css"

// export default function MaskedDatePicker({ value, onChange, size = "big" }) {
//   return (
//     <DatePicker
//       selected={value}
//       dateFormat="dd/MM/yyyy"
//       placeholderText="DD/MM/YYYY"

//       /* ✅ Calendar selection */
//       onChange={(date) => {
//         onChange(date)
//       }}

//       /* ✅ Mask ONLY keyboard typing */
//       onChangeRaw={(e) => {
//         if (!e.target.value) return

//         const formatted = formatDateInput(e.target.value)

//         // ❗ DO NOT interfere if value already matches calendar format
//         if (formatted.length !== e.target.value.length) {
//           e.target.value = formatted
//         }

//         const parsed = parseMaskedDate(formatted)
//         if (parsed) {
//           onChange(parsed)
//         }
//       }}

//       onKeyDown={(e) => {
//         const allowed = [
//           "Backspace",
//           "Tab",
//           "ArrowLeft",
//           "ArrowRight",
//           "Delete",
//         ]
//         if (!allowed.includes(e.key) && !/\d/.test(e.key)) {
//           e.preventDefault()
//         }
//       }}

//       className={`w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${size === "big"
//           ? "px-4 py-2 pr-10 rounded-md text-sm"
//           : "px-2 py-1 rounded text-xs"
//         }`}
//     />
//   )
// }

export default function MaskedDatePicker({
  value,
  onChange,
  size = "big",
  minDate,
  maxDate,
  placeholderText = "DD/MM/YYYY",
  className = "",
}) {
  return (
    <DatePicker
      selected={value}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholderText}
      minDate={minDate}
      maxDate={maxDate}
      showYearDropdown
      dropdownMode="select"
      onChange={(date) => onChange(date)}
      onChangeRaw={(e) => {
        if (!e.target.value) return

        const formatted = formatDateInput(e.target.value)
        e.target.value = formatted

        const parsed = parseMaskedDate(formatted)
        if (parsed) onChange(parsed)
      }}

      onKeyDown={(e) => {
        const allowed = [
          "Backspace",
          "Tab",
          "ArrowLeft",
          "ArrowRight",
          "Delete",
        ]
        if (!allowed.includes(e.key) && !/\d/.test(e.key)) {
          e.preventDefault()
        }
      }}

      className={`w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${size === "big"
          ? "px-4 py-2 pr-10 rounded-md text-sm"
          : "px-2 py-1.5 rounded-md text-xs"
        } ${className}`}
    />
  )
}

