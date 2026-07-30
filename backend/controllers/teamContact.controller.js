import TeamContact from "../models/TeamContact.js";
import ActivityLog from "../models/activitylogs.js";

// Get all team contacts
export const getTeamContacts = async (req, res) => {
  try {
    const contacts = await TeamContact.find();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add a new team contact
export const addTeamContact = async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    const contact = new TeamContact({ name, email, phone, role });
    await contact.save();

    await ActivityLog.create({
      user: req.user._id,
      type: "Team Contact",
      refId: contact._id,
      description: `Team contact "${contact.name}" (${contact.role}) added`,
    });

    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update a team contact
export const updateTeamContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body;
    const contact = await TeamContact.findByIdAndUpdate(
      id,
      { name, email, phone, role },
      { new: true, runValidators: true }
    );
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    await ActivityLog.create({
      user: req.user._id,
      type: "Team Contact",
      refId: contact._id,
      description: `Team contact "${contact.name}" (${contact.role}) updated`,
    });

    res.json(contact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a team contact
export const deleteTeamContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await TeamContact.findByIdAndDelete(id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    await ActivityLog.create({
      user: req.user._id,
      type: "Team Contact",
      description: `Team contact "${contact.name}" (${contact.role}) deleted`,
    });

    res.json({ message: "Contact deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
