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

// buildPassengers() re-lays-out the passenger array on every count change —
// e.g. adding an Adult inserts before existing Children, shifting their
// array index. Anything keyed by passenger index outside of formData
// (uploaded documents, per-row validation errors, an open scan modal's
// target row, ...) goes stale unless it is remapped through this at the
// same time buildPassengers() runs. Mirrors buildPassengers()'s ordering
// and preserve-by-(type, nth-of-type) logic exactly, so the two must be
// changed together.
export const mapPassengerIndices = ({
  existing = [],
  adults,
  children,
  infants,
  allowChildren,
  allowInfants,
}) => {
  const indexMap = new Map();
  let newIndex = 0;

  const mapType = (type, count) => {
    const existingIndicesOfType = [];
    existing.forEach((p, idx) => {
      if (p.type === type) existingIndicesOfType.push(idx);
    });

    for (let i = 0; i < count; i++) {
      const oldIndex = existingIndicesOfType[i];
      if (oldIndex !== undefined) indexMap.set(oldIndex, newIndex);
      newIndex += 1;
    }
  };

  mapType("Adult", adults);
  if (allowChildren) mapType("Child", children);
  if (allowInfants) mapType("Infant", infants);

  return indexMap;
};
