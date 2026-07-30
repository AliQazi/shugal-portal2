import { PASSENGER_TEMPLATE } from "../constants/passengerDefaults";

interface BuildPassengersProps {
  adults: number;
  children: number;
  infants: number;
  existing?: any[];
  allowChildren?: boolean;
  allowInfants?: boolean;
}

export const buildPassengers = ({
  adults,
  children,
  infants,
  existing = [],
  allowChildren,
  allowInfants,
}: BuildPassengersProps): any[] => {
  const result: any[] = [];

  const preserve = (type: string, index: number) =>
    existing.filter((p: any) => p.type === type)[index];

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
