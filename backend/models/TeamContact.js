import mongoose from "mongoose";

const teamContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const TeamContact = mongoose.model("TeamContact", teamContactSchema);

export default TeamContact;
