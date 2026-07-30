import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

const BookingCounter = mongoose.model("BookingCounter", counterSchema);

export default BookingCounter;
