const B2C_BOOKING_LOCK_KEY = "almamorah_b2c_booking_submitted";

export const hasB2CBookingLock = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(B2C_BOOKING_LOCK_KEY) === "true";
};

export const markB2CBookingSubmitted = (bookingReference = "") => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(B2C_BOOKING_LOCK_KEY, "true");
  if (bookingReference) {
    window.localStorage.setItem(
      `${B2C_BOOKING_LOCK_KEY}_reference`,
      bookingReference,
    );
  }
};
