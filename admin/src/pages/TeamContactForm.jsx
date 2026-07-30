import React, { useState } from 'react';

const TeamContactForm = ({ onSubmit, disabled = false }) => {
  const [form, setForm] = useState({
    name: '',
    designation: '',
    gmail: '',
    number: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;
    onSubmit(form);
    setForm({ name: '', designation: '', gmail: '', number: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-xl shadow">
      <div>
        <label className="block font-semibold mb-1">Name</label>
        <input name="name" value={form.name} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block font-semibold mb-1">Designation</label>
        <input name="designation" value={form.designation} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block font-semibold mb-1">Gmail</label>
        <input name="gmail" type="email" value={form.gmail} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block font-semibold mb-1">Number</label>
        <input name="number" value={form.number} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        title={disabled ? "You don't have permission to add team contacts" : ""}
      >
        Add Team Contact
      </button>
    </form>
  );
};

export default TeamContactForm;
