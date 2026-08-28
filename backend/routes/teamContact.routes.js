import express from "express";
import {
  getTeamContacts,
  addTeamContact,
  updateTeamContact,
  deleteTeamContact,
} from "../controllers/teamContact.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

// Get all team contacts
router.get("/", getTeamContacts);

// Add a new team contact
router.post("/", addTeamContact);

// Update a team contact
router.put("/:id", updateTeamContact);

// Delete a team contact
router.delete("/:id", deleteTeamContact);

export default router;
