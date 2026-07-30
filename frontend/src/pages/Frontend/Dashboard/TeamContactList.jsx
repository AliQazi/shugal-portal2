import React, { useState, useEffect } from "react";
import { getTeamContacts } from "../../../api/teamContactApi";

const TeamContactList = () => {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTeamContacts();
        setContacts(
          data.map((c) => ({
            name: c.name,
            designation: c.role,
            gmail: c.email,
            number: c.phone,
          })),
        );
      } catch (err) {
        // Optionally show error
      }
    })();
  }, []);

  return (
    <div className="main-container py-8">
      <div className="bg-linear-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-8 mb-8 flex flex-col items-center">
        <h2 className="text-3xl text-white font-bold mb-2 tracking-wide">
          Team Contacts
        </h2>
        <p className="text-white/80 mb-4">
          Contact our team for any assistance or queries.
        </p>
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
          Meet Our Team
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.length === 0 ? (
            <div className="col-span-2 text-center text-gray-400 py-8">
              No team contacts found.
            </div>
          ) : (
            contacts.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-4 bg-blue-50 rounded-lg p-4 shadow hover:shadow-md transition"
              >
                <div className="shrink-0 w-14 h-14 rounded-full bg-linear-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white text-2xl font-bold">
                  {c.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamContactList;
