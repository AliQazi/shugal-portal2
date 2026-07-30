import mongoose from "mongoose";

const AirlineSchema = new mongoose.Schema(
  {
    airlineCode: {
      type: String,
      required: [true, "Airline code is required"],
      trim: true,
      uppercase: true
    },
    airlineName: {
      type: String,
      required: [true, "Airline name is required"],
      trim: true
    },
    shortCode: {
      type: String,
      required: [true, "Short code is required"],
      trim: true,
      uppercase: true
    },
    logo: {
      type: String,
      default: ""
    },
    logoPublicId: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["Active", "De-Active"],
      default: "Active"
    }
  },
  { 
    timestamps: true 
  }
);

const Airline = mongoose.model("Airline", AirlineSchema);

export default Airline;
