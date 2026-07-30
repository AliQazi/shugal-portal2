import { useState, useEffect } from "react";
import TeamContactForm from "./TeamContactForm";
import {
  addTeamContact,
  getTeamContacts,
  updateTeamContact,
  deleteTeamContact,
} from "../Api/teamContactApi";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

const TeamContactAdminPage = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, "view_team_contacts");
  const canAdd = hasPermission(user, "add_team_contacts");
  const canManage = hasPermission(user, "manage_team_contacts");
  const [contacts, setContacts] = useState([]);
  const [editingContact, setEditingContact] = useState(null); // { index, contact }
  const [editForm, setEditForm] = useState({
    name: "",
    designation: "",
    gmail: "",
    number: "",
  });
  const [deletingId, setDeletingId] = useState(null);

  const mapFromBackend = (c) => ({
    _id: c._id,
    name: c.name,
    designation: c.role,
    gmail: c.email,
    number: c.phone,
  });

  // Load contacts from backend on mount
  useEffect(() => {
    if (!canView) return;

    (async () => {
      try {
        const data = await getTeamContacts();
        setContacts(data.map(mapFromBackend));
      } catch (err) {
        // Optionally show error
      }
    })();
  }, [canView]);

  const handleAddContact = async (contact) => {
    if (!canAdd) {
      alert("You don't have permission to add team contacts");
      return;
    }

    const payload = {
      name: contact.name,
      email: contact.gmail,
      phone: contact.number,
      role: contact.designation,
    };
    try {
      const saved = await addTeamContact(payload);
      setContacts((prev) => [...prev, mapFromBackend(saved)]);
    } catch (err) {
      alert(
        "Failed to add contact: " +
          (err?.response?.data?.message || err.message),
      );
    }
  };

  const handleEditClick = (contact) => {
    if (!canManage) {
      alert("You don't have permission to manage team contacts");
      return;
    }

    setEditingContact(contact._id);
    setEditForm({
      name: contact.name,
      designation: contact.designation,
      gmail: contact.gmail,
      number: contact.number,
    });
  };

  const handleEditSave = async (id) => {
    if (!canManage) {
      alert("You don't have permission to manage team contacts");
      return;
    }

    const payload = {
      name: editForm.name,
      email: editForm.gmail,
      phone: editForm.number,
      role: editForm.designation,
    };
    try {
      const updated = await updateTeamContact(id, payload);
      setContacts((prev) =>
        prev.map((c) => (c._id === id ? mapFromBackend(updated) : c)),
      );
      setEditingContact(null);
    } catch (err) {
      alert(
        "Failed to update contact: " +
          (err?.response?.data?.message || err.message),
      );
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) {
      alert("You don't have permission to manage team contacts");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this contact?"))
      return;
    setDeletingId(id);
    try {
      await deleteTeamContact(id);
      setContacts((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      alert(
        "Failed to delete contact: " +
          (err?.response?.data?.message || err.message),
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
        You do not have permission to view Team Contacts.
      </div>
    );
  }

  return (
    <div className="main-container py-8">
      <div className="bg-linear-to-r from-blue-400 to-indigo-800 rounded-xl shadow-lg p-8 mb-8 flex flex-col items-center">
        <h2 className="text-3xl text-white font-bold mb-2 tracking-wide">
          Team Contact Management
        </h2>
        <p className="text-white/80 mb-4">
          Add and manage your team contacts easily.
        </p>
        <div className="w-full max-w-lg">
          <TeamContactForm onSubmit={handleAddContact} disabled={!canAdd} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-semibold mb-6 text-blue-700 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-7 h-7 text-blue-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118A7.5 7.5 0 0112 15.75a7.5 7.5 0 017.5 4.368"
            />
          </svg>
          Team Contacts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.length === 0 ? (
            <div className="col-span-2 text-center text-gray-400 py-8">
              No team contacts found.
            </div>
          ) : (
            contacts.map((c) =>
              editingContact === c._id ? (
                // ── Edit Mode ──────────────────────────────────────────
                <div
                  key={c._id}
                  className="bg-blue-50 rounded-lg p-4 shadow border-2 border-blue-300"
                >
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Name
                      </label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Designation
                      </label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={editForm.designation}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            designation: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={editForm.gmail}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, gmail: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Phone
                      </label>
                      <input
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={editForm.number}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, number: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleEditSave(c._id)}
                      disabled={!canManage}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        !canManage
                          ? "You don't have permission to manage team contacts"
                          : ""
                      }
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingContact(null)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // ── View Mode ──────────────────────────────────────────
                <div
                  key={c._id}
                  className="flex items-center gap-4 bg-blue-50 rounded-lg p-4 shadow hover:shadow-md transition"
                >
                  <div className="shrink-0 w-14 h-14 rounded-full bg-linear-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white text-2xl font-bold">
                    {c.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-blue-900">
                      {c.name}
                    </div>
                    <div className="text-sm text-blue-600">{c.designation}</div>
                    <div className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Email:</span> {c.gmail}
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Phone:</span> {c.number}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleEditClick(c)}
                      disabled={!canManage}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        !canManage
                          ? "You don't have permission to manage team contacts"
                          : ""
                      }
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      disabled={deletingId === c._id || !canManage}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        !canManage
                          ? "You don't have permission to manage team contacts"
                          : ""
                      }
                    >
                      {deletingId === c._id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamContactAdminPage;
