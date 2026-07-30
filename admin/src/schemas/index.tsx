import { StylesConfig } from "react-select";
import * as Yup from "yup";

export const destinationSchema = Yup.object({
  name: Yup.string()
    .required("Destination name is required")
    .min(2, "Destination name must be at least 2 characters long")
    .max(50, "Destination name cannot exceed 50 characters"),
  description: Yup.string()
    .required("Description is required")
    .min(10, "Description must be at least 10 characters long")
    .max(500, "Description cannot exceed 500 characters"),
  image: Yup.mixed().required("Image is required"),
});

export const visaSchema = Yup.object({
  name: Yup.string()
    .required("Visa name is required")
    .min(2, "Visa name must be at least 2 characters long")
    .max(50, "Visa name cannot exceed 50 characters"),
  type: Yup.string()
    .required("Visa type is required")
    .min(2, "Visa type must be at least 2 characters long")
    .max(50, "Visa type cannot exceed 50 characters"),
  country: Yup.string()
    .min(2, "Country name must be at least 2 characters long")
    .max(50, "Country name cannot exceed 50 characters")
    .required("Country is required"),
  price: Yup.number().required("Price is required"),
  description: Yup.string()
    .min(2, "description  must be at least 2 characters long")
    .max(50, "description  cannot exceed 50 characters")
    .required("description is required"),
  validity: Yup.string().required("validity is required"),
  image: Yup.mixed().required("Image is required"),
});

export const serviceSchema = Yup.object({
  name: Yup.string()
    .required("Service name is required")
    .min(2, "Service name must be at least 2 characters long")
    .max(50, "Service name cannot exceed 50 characters"),
  country: Yup.string()
    .min(2, "Country name must be at least 2 characters long")
    .max(50, "Country name cannot exceed 50 characters")
    .required("Country is required"),
  price: Yup.number().min(0, "Price must be a positive number"),
  shortdescription: Yup.string()
    .min(10, "Short description must be at least 10 characters long")
    .max(200, "Short description cannot exceed 200 characters"),
  description: Yup.string().min(
    20,
    "Description must be at least 20 characters long"
  ),
  images: Yup.array()
    .of(Yup.mixed().required("Image is required"))
    .min(1, "At least one image is required"),
});

export const teamSchema = Yup.object({
  name: Yup.string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters long"),
  designation: Yup.string()
    .min(2, "Designation name must be at least 2 characters long")
    .required("Designation is required"),
  images: Yup.array()
    .of(Yup.mixed().required("Image is required"))
    .min(1, "At least one image is required"),
});
export const homeBannerFlyerSchema = Yup.object({
  name: Yup.string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters long"),
  url: Yup.string().url("Please provide a valid URL"),
  image: Yup.mixed().required("Image is required"),
});

export const carBookingSchema = Yup.object({
  name: Yup.string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters long"),
  city: Yup.string()
    .required("City is required")
    .min(2, "City must be at least 2 characters long"),
  type: Yup.string()
    .required("Type is required")
    .min(2, "Type must be at least 2 characters long"),
  capacity: Yup.number()
    .required("Capacity is required")
    .min(1, "Capacity must be at least 1"),
  description: Yup.string()
    .required("Description is required")
    .min(5, "Description must be at least 5 characters long"),
  routes: Yup.array()
    .of(
      Yup.object({
        route: Yup.string().required("Route is required"),
        oneWayPrice: Yup.number()
          .typeError("One Way Price must be a number")
          .required("One Way Price is required")
          .min(0, "Must be positive"),
        returnPrice: Yup.number()
          .typeError("Return Price must be a number")
          .required("Return Price is required")
          .min(0, "Must be positive"),
      })
    )
    .min(1, "At least one route is required"),
  images: Yup.array()
    .of(Yup.mixed().required("Image is required"))
    .min(1, "At least one image is required")
    .max(3, "You can upload up to 3 images"),
});

// export const hotelSchema = Yup.object({
//   name: Yup.string()
//     .required("Hotel name is required")
//     .min(2, "Hotel name must be at least 2 characters long")
//     .max(100, "Hotel name cannot exceed 100 characters"),

//   city: Yup.string()
//     .required("City is required")
//     .min(2, "City must be at least 2 characters long")
//     .max(50, "City cannot exceed 50 characters"),

//   address: Yup.string()
//     .required("Address is required")
//     .min(5, "Address must be at least 5 characters long")
//     .max(200, "Address cannot exceed 200 characters"),

//   description: Yup.string()
//     .required("Description is required")
//     .min(10, "Description must be at least 10 characters long")
//     .max(500, "Description cannot exceed 500 characters"),

//   pricePerNight: Yup.number()
//     .required("Price per night is required")
//     .min(0, "Price must be a positive number"),

//   roomsAvailable: Yup.number()
//     .required("Number of rooms available is required")
//     .min(1, "At least 1 room must be available")
//     .integer("Rooms must be a whole number"),

//   guestsPerRoom: Yup.number()
//     .required("Number of guests per room is required")
//     .min(1, "At least 1 guest per room")
//     .max(10, "Maximum 10 guests per room")
//     .integer("Guests must be a whole number"),

//   rating: Yup.number()
//     .required("Rating is required")
//     .min(0, "Rating must be at least 0")
//     .max(7, "Rating must be at most 7"),

//   image: Yup.mixed()
//     .required("Image is required"),
// });

export const hotelSchema = Yup.object().shape({
  account: Yup.string().required("Account is required"),
  city: Yup.string().required("City is required"),
  name: Yup.string().required("Hotel Name is required"),
  rating: Yup.number()
    .required("Rating is required")
    .min(1, "Rating must be at least 1")
    .max(7, "Rating cannot be more than 7"),
  address: Yup.string().required("Address is required"),
  distanceFromHaram: Yup.number()
    .required("Distance from Haram is required")
    .min(0, "Distance cannot be negative"),
  staffName: Yup.string().required("Staff Name is required"),
  staffNumber: Yup.string()
    .required("Staff Number is required")
    .matches(/^[0-9]+$/, "Only digits are allowed"),
});

export const getSelectStyles = (
  hasError: boolean
): StylesConfig<any, false> => ({
  control: (base, state) => ({
    ...base,
    minHeight: "48px",
    borderRadius: "0.5rem",
    borderWidth: "1px",
    borderColor: hasError
      ? "#ef4444" // Red border if there's an error
      : state.isFocused
        ? "#3b82f6"
        : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.3)" : "none",
    "&:hover": {
      borderColor: hasError
        ? "#ef4444"
        : state.isFocused
          ? "#3b82f6"
          : "#9ca3af",
    },
    backgroundColor: "white",
    fontSize: "0.95rem",
    paddingLeft: "2px",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 8px",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
  }),
  placeholder: (base) => ({
    ...base,
    color: "#6b7280",
  }),
});
export const addHolidayPackageSchema = Yup.object({
  packageName: Yup.string().required("Package name is required"),
  city: Yup.string().required("City is required"),
  packageDescription: Yup.string().required("Package description is required"),
  remarks: Yup.string().required("Remarks are required"),
  adultPackageCost: Yup.number()
    .typeError("Adult package cost must be a number")
    .required("Adult package cost is required"),
  adultPackageSelling: Yup.number()
    .typeError("Adult package selling must be a number")
    .required("Adult package selling is required"),
  childPackageCost: Yup.number()
    .typeError("Child package cost must be a number")
    .required("Child package cost is required"),
  childPackageSelling: Yup.number()
    .typeError("Child package selling must be a number")
    .required("Child package selling is required"),
  pickupLocation: Yup.string().required("Pickup location is required"),
  dropOffLocation: Yup.string().required("Drop-off location is required"),
  operationsDays: Yup.array()
    .of(Yup.string().required("Operation day is required"))
    .min(1, "At least one operation day is required"),
  pickupTime: Yup.string().required("Pickup time is required"),
  dropOffTime: Yup.string().required("Drop-off time is required"),
  packageImage: Yup.mixed().required("Image is required"),
});
export const umrahValidationSchema = Yup.object().shape({
  sector: Yup.string().required("Sector is required"),
  type: Yup.string().required("Type is required"),
  airline: Yup.string().required("Airline is required"),
  groupCategory: Yup.string().required("Group Category is required"),
  groupName: Yup.string().required("Group Name is required"),
  noOfDays: Yup.number()
    .typeError("No of Days must be a number")
    .required("No of Days is required"),
  seats: Yup.number()
    .typeError("Seats must be a number")
    .required("Seats is required"),
  showSeat: Yup.boolean(),
  flights: Yup.array()
    .of(
      Yup.object().shape({
        flightNo: Yup.string().required("Flight No is required"),
        depDate: Yup.string().required("Departure Date is required"),
        depTime: Yup.string().required("Departure Time is required"),
        sectorFrom: Yup.string().required("Sector From is required"),
        fromTerminal: Yup.string().required("From Terminal is required"),
        sectorTo: Yup.string().required("Sector To is required"),
        toTerminal: Yup.string().required("To Terminal is required"),
        flightClass: Yup.string().required("Flight Class is required"),
        arrDate: Yup.string().required("Arrival Date is required"),
        arrTime: Yup.string().required("Arrival Time is required"),
        baggage: Yup.string().required("Baggage is required"),
        meal: Yup.string().required("Meal is required"),
      })
    )
    .min(1, "At least one flight is required"),
});
export const ksaValidationSchema = Yup.object().shape({
  sector: Yup.string().required("Sector is required"),
  type: Yup.string().required("Type is required"),
  airline: Yup.string().required("Airline is required"),
  groupCategory: Yup.string().required("Group Category is required"),
  groupName: Yup.string().required("Group Name is required"),
  noOfDays: Yup.number()
    .typeError("No of Days must be a number")
    .required("No of Days is required"),
  seats: Yup.number()
    .typeError("Seats must be a number")
    .required("Seats is required"),
  showSeat: Yup.boolean(),
  flights: Yup.array()
    .of(
      Yup.object().shape({
        flightNo: Yup.string().required("Flight No is required"),
        depDate: Yup.string().required("Departure Date is required"),
        depTime: Yup.string().required("Departure Time is required"),
        sectorFrom: Yup.string().required("Sector From is required"),
        fromTerminal: Yup.string().required("From Terminal is required"),
        sectorTo: Yup.string().required("Sector To is required"),
        toTerminal: Yup.string().required("To Terminal is required"),
        flightClass: Yup.string().required("Flight Class is required"),
        arrDate: Yup.string().required("Arrival Date is required"),
        arrTime: Yup.string().required("Arrival Time is required"),
        baggage: Yup.string().required("Baggage is required"),
        meal: Yup.string().required("Meal is required"),
      })
    )
    .min(1, "At least one flight is required"),
});
export const OmanValidationSchema = Yup.object().shape({
  sector: Yup.string().required("Sector is required"),
  type: Yup.string().required("Type is required"),
  airline: Yup.string().required("Airline is required"),
  groupCategory: Yup.string().required("Group Category is required"),
  groupName: Yup.string().required("Group Name is required"),
  noOfDays: Yup.number()
    .typeError("No of Days must be a number")
    .required("No of Days is required"),
  seats: Yup.number()
    .typeError("Seats must be a number")
    .required("Seats is required"),
  showSeat: Yup.boolean(),
  flights: Yup.array()
    .of(
      Yup.object().shape({
        flightNo: Yup.string().required("Flight No is required"),
        depDate: Yup.string().required("Departure Date is required"),
        depTime: Yup.string().required("Departure Time is required"),
        sectorFrom: Yup.string().required("Sector From is required"),
        fromTerminal: Yup.string().required("From Terminal is required"),
        sectorTo: Yup.string().required("Sector To is required"),
        toTerminal: Yup.string().required("To Terminal is required"),
        flightClass: Yup.string().required("Flight Class is required"),
        arrDate: Yup.string().required("Arrival Date is required"),
        arrTime: Yup.string().required("Arrival Time is required"),
        baggage: Yup.string().required("Baggage is required"),
        meal: Yup.string().required("Meal is required"),
      })
    )
    .min(1, "At least one flight is required"),
});
export const BahrainValidationSchema = Yup.object().shape({
  sector: Yup.string().required("Sector is required"),
  type: Yup.string().required("Type is required"),
  airline: Yup.string().required("Airline is required"),
  groupCategory: Yup.string().required("Group Category is required"),
  groupName: Yup.string().required("Group Name is required"),
  noOfDays: Yup.number()
    .typeError("No of Days must be a number")
    .required("No of Days is required"),
  seats: Yup.number()
    .typeError("Seats must be a number")
    .required("Seats is required"),
  showSeat: Yup.boolean(),
  flights: Yup.array()
    .of(
      Yup.object().shape({
        flightNo: Yup.string().required("Flight No is required"),
        depDate: Yup.string().required("Departure Date is required"),
        depTime: Yup.string().required("Departure Time is required"),
        sectorFrom: Yup.string().required("Sector From is required"),
        fromTerminal: Yup.string().required("From Terminal is required"),
        sectorTo: Yup.string().required("Sector To is required"),
        toTerminal: Yup.string().required("To Terminal is required"),
        flightClass: Yup.string().required("Flight Class is required"),
        arrDate: Yup.string().required("Arrival Date is required"),
        arrTime: Yup.string().required("Arrival Time is required"),
        baggage: Yup.string().required("Baggage is required"),
        meal: Yup.string().required("Meal is required"),
      })
    )
    .min(1, "At least one flight is required"),
});
export const UKValidationSchema = Yup.object().shape({
  sector: Yup.string().required("Sector is required"),
  type: Yup.string().required("Type is required"),
  airline: Yup.string().required("Airline is required"),
  groupCategory: Yup.string().required("Group Category is required"),
  groupName: Yup.string().required("Group Name is required"),
  noOfDays: Yup.number()
    .typeError("No of Days must be a number")
    .required("No of Days is required"),
  seats: Yup.number()
    .typeError("Seats must be a number")
    .required("Seats is required"),
  showSeat: Yup.boolean(),
  flights: Yup.array()
    .of(
      Yup.object().shape({
        flightNo: Yup.string().required("Flight No is required"),
        depDate: Yup.string().required("Departure Date is required"),
        depTime: Yup.string().required("Departure Time is required"),
        sectorFrom: Yup.string().required("Sector From is required"),
        fromTerminal: Yup.string().required("From Terminal is required"),
        sectorTo: Yup.string().required("Sector To is required"),
        toTerminal: Yup.string().required("To Terminal is required"),
        flightClass: Yup.string().required("Flight Class is required"),
        arrDate: Yup.string().required("Arrival Date is required"),
        arrTime: Yup.string().required("Arrival Time is required"),
        baggage: Yup.string().required("Baggage is required"),
        meal: Yup.string().required("Meal is required"),
      })
    )
    .min(1, "At least one flight is required"),
});
export const UAEONEWAYValidationSchema = Yup.object().shape({
  sector: Yup.string().required("Sector is required"),
  type: Yup.string().required("Type is required"),
  airline: Yup.string().required("Airline is required"),
  groupCategory: Yup.string().required("Group Category is required"),
  groupName: Yup.string().required("Group Name is required"),
  noOfDays: Yup.number()
    .typeError("No of Days must be a number")
    .required("No of Days is required"),
  seats: Yup.number()
    .typeError("Seats must be a number")
    .required("Seats is required"),
  showSeat: Yup.boolean(),
  flights: Yup.array()
    .of(
      Yup.object().shape({
        flightNo: Yup.string().required("Flight No is required"),
        depDate: Yup.string().required("Departure Date is required"),
        depTime: Yup.string().required("Departure Time is required"),
        sectorFrom: Yup.string().required("Sector From is required"),
        fromTerminal: Yup.string().required("From Terminal is required"),
        flightClass: Yup.string().required("Flight Class is required"),
        baggage: Yup.string().required("Baggage is required"),
        meal: Yup.string().required("Meal is required"),
      })
    )
    .min(1, "At least one flight is required"),
});

export const pricingValidationSchema = Yup.object({
  buyingCurrency: Yup.string().required("Buying currency is required"),
  buyingPriceAdult: Yup.number()
    .required("Buying price (Adult) is required")
    .positive(),
  buyingPriceChild: Yup.number()
    .required("Buying price (Child) is required")
    .positive(),
  buyingPriceInfant: Yup.number()
    .required("Buying price (Infant) is required")
    .positive(),
  sellingCurrencyB2B: Yup.string().required(
    "Selling currency (B2B) is required"
  ),
  sellingPriceAdultB2B: Yup.number()
    .required("Selling price B2B (Adult) is required")
    .positive(),
  sellingPriceChildB2B: Yup.number()
    .required("Selling price B2B (Child) is required")
    .positive(),
  sellingPriceInfantB2B: Yup.number()
    .required("Selling price B2B (Infant) is required")
    .positive(),
  contactPersonPhone: Yup.string().required("Contact phone is required"),
  contactPersonEmail: Yup.string()
    .email("Invalid email format")
    .required("Contact email is required"),
  pnr: Yup.string().required("PNR is required"),
  internalStatus: Yup.string().required("Internal status is required"),
});

export const TransportRouteRatesvalidationSchema = Yup.object({
  staffName: Yup.string().required("Staff Name is required"),
  staffNumber: Yup.number()
    .typeError("Staff Number must be a number")
    .required("Staff Number is required"),
  supplier: Yup.string().required("Supplier is required"),
  selectTransport: Yup.string().required("Select Transport is required"),
  route: Yup.string().required("Route is required"),
  buyingRate: Yup.number()
    .typeError("Buying Rate must be a number")
    .required("Buying Rate is required"),
  sellingRate: Yup.number()
    .typeError("Selling Rate must be a number")
    .required("Selling Rate is required"),
});

export const updateUmrahValidationSchema = Yup.object().shape({
  evoucherAccount: Yup.string().required("Evoucher Account is required"),
  sector: Yup.string().required("Sector is required"),
  airline: Yup.string().required("Airline is required"),
  groupCategory: Yup.string().required("Group Category is required"),
  noOfDays: Yup.number().required("No of days is required").min(1),
  seats: Yup.number().required("Seats are required").min(1),
  flightNo: Yup.string().required("Flight number is required"),
  depDate: Yup.string().required("Departure date is required"),
  depTime: Yup.string().required("Departure time is required"),
  sectorFrom: Yup.string().required("Sector from is required"),
  fromTerminal: Yup.string().required("From terminal is required"),
  sectorTo: Yup.string().required("Sector to is required"),
  toTerminal: Yup.string().required("To terminal is required"),
  flightClass: Yup.string().required("Flight class is required"),
  arrDate: Yup.string().required("Arrival date is required"),
  arrTime: Yup.string().required("Arrival time is required"),
  baggage: Yup.string().required("Baggage is required"),
  meal: Yup.string().required("Meal is required"),
  metadata: Yup.object().shape({
    buyingCurrency: Yup.string().required("Buying currency is required"),
    buyingPriceAdult: Yup.number().required(
      "Buying price for adult is required"
    ),
    buyingPriceChild: Yup.number().required(
      "Buying price for child is required"
    ),
    buyingPriceInfant: Yup.number().required(
      "Buying price for infant is required"
    ),
    sellingCurrencyB2B: Yup.string().required("Selling currency is required"),
    sellingPriceAdultB2B: Yup.number().required(
      "Selling price for adult (B2B) is required"
    ),
    sellingPriceChildB2B: Yup.number().required(
      "Selling price for child (B2B) is required"
    ),
    sellingPriceInfantB2B: Yup.number().required(
      "Selling price for infant (B2B) is required"
    ),
    contactPersonPhone: Yup.string().required("Contact phone is required"),
    contactPersonEmail: Yup.string()
      .email("Invalid email")
      .required("Contact email is required"),
    internalStatus: Yup.string().required("Internal status is required"),
  }),
});

export const addOfferSchema = Yup.object({
  name: Yup.string().required("Offer name is required"),
  description: Yup.string().required("Description is required"),
  image: Yup.mixed().required("Image is required"),
});

export const updateOfferSchema = Yup.object({
  name: Yup.string().required("Offer name is required"),
  description: Yup.string().required("Description is required"),
  image: Yup.mixed().nullable(), // optional for edit
});

export const addStudentSchema = Yup.object({
  fullName: Yup.string().required("Full name is required"),
  fatherName: Yup.string().required("Father's name is required"),
  passportNumber: Yup.string().required("Passport number is required"),
  dateOfBirth: Yup.string().required("Date of birth is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  phone: Yup.string().required("Phone number is required"),
  country: Yup.string().required("Country is required"),
  city: Yup.string().required("City is required"),
  educationLevel: Yup.string().required("Education level is required"),
  intendedCourse: Yup.string().required("Intended course is required"),
  instituteName: Yup.string().required("Institute name is required"),
  intakeMonth: Yup.string().required("Intake month is required"),
  additionalNotes: Yup.string(), // Optional now
  image: Yup.mixed().required("Image is required"),
});

export const addvisaSchema = Yup.object({
  visaName: Yup.string().required("Visa name is required"),
  supplierAccount: Yup.string().required("Supplier account is required"),
  adultVisaCost: Yup.number()
    .typeError("Adult visa cost must be a number")
    .required("Adult visa cost is required"),
  adultVisaSelling: Yup.number()
    .typeError("Adult visa selling must be a number")
    .required("Adult visa selling is required"),
  infantVisaCost: Yup.number()
    .typeError("Infant visa cost must be a number")
    .required("Infant visa cost is required"),
  infantVisaSelling: Yup.number()
    .typeError("Infant visa selling must be a number")
    .required("Infant visa selling is required"),
});

export const addVisitVisaSchema = Yup.object({
  visaName: Yup.string().required("Visa name is required"),
  adultVisaCost: Yup.number()
    .typeError("Adult visa cost must be a number")
    .required("Adult visa cost is required"),
  adultVisaSelling: Yup.number()
    .typeError("Adult visa selling must be a number")
    .required("Adult visa selling is required"),
  infantVisaCost: Yup.number()
    .typeError("Infant visa cost must be a number")
    .required("Infant visa cost is required"),
  infantVisaSelling: Yup.number()
    .typeError("Infant visa selling must be a number")
    .required("Infant visa selling is required"),
  nightsOfStay: Yup.number()
    .required("Nights of stay is required")
    .min(1, "Minimum 1 night"),
  visaImage: Yup.mixed().required("Image is required"),
});

export const updateVisitVisaSchema = Yup.object({
  visaName: Yup.string().required("Visa name is required"),
  adultVisaCost: Yup.number()
    .typeError("Adult visa cost must be a number")
    .required("Adult visa cost is required"),
  adultVisaSelling: Yup.number()
    .typeError("Adult visa selling must be a number")
    .required("Adult visa selling is required"),
  infantVisaCost: Yup.number()
    .typeError("Infant visa cost must be a number")
    .required("Infant visa cost is required"),
  infantVisaSelling: Yup.number()
    .typeError("Infant visa selling must be a number")
    .required("Infant visa selling is required"),
  nightsOfStay: Yup.number()
    .required("Nights of stay is required")
    .min(1, "Minimum 1 night"),
  image: Yup.mixed().nullable(),
});

export const addStudySchema = Yup.object({
  country: Yup.string().trim().required("Country is required"),
  educationLevel: Yup.string().trim().required("Education level is required"),
  intendedCourse: Yup.string().trim().required("Intended course is required"),
  instituteName: Yup.string().trim().required("Institute name is required"),
  intakeMonth: Yup.string().trim().required("Intake month is required"),
  image: Yup.mixed().required("Image is required"),
});

export const updaeStudySchema = Yup.object({
  country: Yup.string().trim().required("Country is required"),
  educationLevel: Yup.string().trim().required("Education level is required"),
  intendedCourse: Yup.string().trim().required("Intended course is required"),
  instituteName: Yup.string().trim().required("Institute name is required"),
  intakeMonth: Yup.string().trim().required("Intake month is required"),
  image: Yup.mixed().nullable(),
});
