import React, { useState, useEffect } from "react";
import { getTeamContacts } from "../../../api/teamContactApi";

const TeamContactList = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

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
        console.error("Failed to load team contacts:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Generate avatar color based on name
  const getAvatarColor = (name) => {
    const colors = [
      "from-pink-500 to-rose-500",
      "from-purple-500 to-indigo-500",
      "from-cyan-500 to-blue-500",
      "from-emerald-500 to-teal-500",
      "from-orange-500 to-amber-500",
      "from-violet-500 to-purple-500",
    ];
    const index = name?.length % colors.length || 0;
    return colors[index];
  };

  const LoadingSkeleton = () => (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-200"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-blue-600 font-medium text-sm mb-4 shadow-sm border border-blue-100">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            We're here to help
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-linear-to-r from-[#09B0FF] to-indigo-600 bg-clip-text text-transparent">
            Team Contacts
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Connect with our dedicated team members for personalized assistance
            and support.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-blue-200"></div>
            <h2 className="text-sm font-semibold text-gray-800 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-200">
              Meet Our Team
            </h2>
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-blue-200"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <LoadingSkeleton />
            ) : contacts.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-sm mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">No team contacts available</p>
                <p className="text-gray-400 text-sm mt-1">Please check back later</p>
              </div>
            ) : (
              contacts.map((c, i) => (
                <div
                  key={i}
                  className="group bg-white rounded-lg shadow-sm hover:shadow-none transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200 hover:-translate-y-1 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`shrink-0 w-14 h-14 rounded-xl bg-linear-to-br ${getAvatarColor(
                        c.name
                      )} flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      {c.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">
                        {c.name}
                      </h3>
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium mb-3">
                        {c.designation}
                      </span>

                      <div className="space-y-2">
                        <a
                          href={`mailto:${c.gmail}`}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group/link"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 text-gray-400 group-hover/link:text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                            />
                          </svg>
                          <span className="truncate">{c.gmail}</span>
                        </a>

                        <a
                          href={`tel:${c.number}`}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group/link"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 text-gray-400 group-hover/link:text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                            />
                          </svg>
                          <span>{c.number}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamContactList;