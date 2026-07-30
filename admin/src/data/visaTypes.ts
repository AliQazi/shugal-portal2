// Common visa types for reference
const visa_types = [
  { type: "Tourist Visa", description: "For tourism and leisure travel" },
  {
    type: "Business Visa",
    description: "For business meetings and conferences",
  },
  {
    type: "Umrah Visa",
    description: "For religious pilgrimage to Saudi Arabia",
  },
  { type: "Hajj Visa", description: "For Hajj pilgrimage to Saudi Arabia" },
  { type: "Work Visa", description: "For employment purposes" },
  { type: "Student Visa", description: "For educational purposes" },
  { type: "Transit Visa", description: "For passing through a country" },
  { type: "Family Visit Visa", description: "For visiting family members" },
  { type: "Medical Visa", description: "For medical treatment" },
  {
    type: "Conference Visa",
    description: "For attending conferences or seminars",
  },
];

// Common visa processing countries
const visa_countries = [
  { name: "Saudi Arabia", code: "SA", currency: "SAR" },
  { name: "United Arab Emirates", code: "AE", currency: "AED" },
  { name: "United Kingdom", code: "GB", currency: "GBP" },
  { name: "United States", code: "US", currency: "USD" },
  { name: "Canada", code: "CA", currency: "CAD" },
  { name: "Australia", code: "AU", currency: "AUD" },
  { name: "Turkey", code: "TR", currency: "TRY" },
  { name: "Malaysia", code: "MY", currency: "MYR" },
  { name: "Singapore", code: "SG", currency: "SGD" },
  { name: "Thailand", code: "TH", currency: "THB" },
  { name: "China", code: "CN", currency: "CNY" },
  { name: "Japan", code: "JP", currency: "JPY" },
  { name: "Germany", code: "DE", currency: "EUR" },
  { name: "France", code: "FR", currency: "EUR" },
  { name: "Italy", code: "IT", currency: "EUR" },
  { name: "Spain", code: "ES", currency: "EUR" },
];

export { visa_types, visa_countries };
export default visa_types;
