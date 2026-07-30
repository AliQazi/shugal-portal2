import { PASSENGER_TEMPLATE } from "../constants/passengerDefaults";

export const buildPassengers = ({
  adults,
  children,
  infants,
  existing = [],
  allowChildren,
  allowInfants,
}) => {
  const result = [];

  const preserve = (type, index) =>
    existing.filter(p => p.type === type)[index];

  for (let i = 0; i < adults; i++) {
    result.push(preserve("Adult", i) || { ...PASSENGER_TEMPLATE.Adult });
  }

  if (allowChildren) {
    for (let i = 0; i < children; i++) {
      result.push(preserve("Child", i) || { ...PASSENGER_TEMPLATE.Child });
    }
  }

  if (allowInfants) {
    for (let i = 0; i < infants; i++) {
      result.push(preserve("Infant", i) || { ...PASSENGER_TEMPLATE.Infant });
    }
  }

  return result;
};
