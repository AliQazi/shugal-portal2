import React, { useState, useEffect } from "react";
import {
  Building2,
  Copy,
  Check,
  Loader2,
  User,
  Hash,
  Globe,
  MapPin,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import axiosInstance from "../../api/axios";
import { theme } from "../../theme/theme";
import TopBar from "../../components/TopBar/TopBar";

const Bank = () => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const fetchBanks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get("/bank");

      if (response.data.success) {
        // Sirf active banks filter kar rahe hain
        const activeBanks = response.data.data.filter(
          (bank) => bank.status === "Active",
        );
        setBanks(activeBanks);
      } else {
        setBanks([]);
      }
    } catch (err) {
      console.error("Error fetching banks:", err);
      setError("Nahi ho saka! Bank details load karne mein masla pesh aya.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // UI state logic for animations
  const cardStyle = (id) => ({
    background: theme.colors.card || "#ffffff",
    borderRadius: "24px",
    border: `1px solid ${hoveredCard === id ? theme.colors.primary : theme.colors.border || "#f1f5f9"}`,
    transform: hoveredCard === id ? "translateY(-8px)" : "translateY(0)",
    boxShadow:
      hoveredCard === id
        ? "0 20px 25px -5px rgb(0 0 0 / 0.1)"
        : "0 4px 6px -1px rgb(0 0 0 / 0.05)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-12 h-12 animate-spin text-[#1CA8CB] mb-4" />
        <p className="text-gray-500 font-medium">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">{error}</h3>
        <button
          onClick={fetchBanks}
          className="flex items-center gap-2 px-6 py-2 bg-[#1CA8CB] text-white rounded-full hover:bg-[#1589a7] transition-all"
        >
          <RefreshCw size={18} /> Retry Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      {/* Header */}
      <TopBar title={"Bank Details"} />
      <div className="mx-auto px-6 relative z-10 mt-10">
        {banks.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl shadow-sm text-center border border-gray-100">
            <Building2 className="mx-auto w-16 h-16 text-gray-200 mb-4" />
            <p className="text-gray-500 text-lg">NO banks accounts .</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {banks.map((bank, index) => (
              <div
                key={bank._id || index}
                onMouseEnter={() => setHoveredCard(bank._id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={cardStyle(bank._id)}
                className="group overflow-hidden relative"
              >
                {/* Decorative Top Bar */}
                <div className="h-1.5 w-full bg-[#1CA8CB]" />

                <div className="p-8">
                  {/* Header: Logo & Bank Name */}
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 p-2 flex items-center justify-center shadow-sm">
                        {bank.logo ? (
                          <img
                            src={bank.logo}
                            alt="bank"
                            className="max-h-full object-contain"
                          />
                        ) : (
                          <Building2 className="text-[#1CA8CB]" size={28} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg leading-tight">
                          {bank.bankName}
                        </h3>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                          Official Partner
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Data Details */}
                  <div className="space-y-5">
                    {/* Account Title */}
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-[#1CA8CB]">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                          Account Title
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          {bank.accountTitle || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-[#1CA8CB]">
                        <Hash size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                          Account Number
                        </p>
                        <div className="flex justify-between items-center group/item">
                          <p className="text-sm font-mono font-bold text-gray-700">
                            {bank.accountNo}
                          </p>
                          <button
                            onClick={() =>
                              handleCopy(bank.accountNo, `${bank._id}-acc`)
                            }
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-[#1CA8CB] transition-colors"
                          >
                            {copiedId === `${bank._id}-acc` ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* IBAN */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-transparent group-hover:border-blue-50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe size={12} className="text-[#1CA8CB]" />
                        <p className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">
                          IBAN (International)
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-mono text-gray-600 truncate mr-2">
                          {bank.ibn || bank.iban || "N/A"}
                        </p>
                        <button
                          onClick={() =>
                            handleCopy(
                              bank.ibn || bank.iban,
                              `${bank._id}-iban`,
                            )
                          }
                          className="text-gray-400 hover:text-[#1CA8CB]"
                        >
                          {copiedId === `${bank._id}-iban` ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Address/Branch */}
                    {(bank.bankAddress || bank.branchCode) && (
                      <div className="flex items-start gap-3 pt-2">
                        <div className="mt-1 text-gray-300">
                          <MapPin size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                            Location / Branch
                          </p>
                          <p className="text-[11px] text-gray-500 italic">
                            {bank.bankAddress ||
                              `Branch Code: ${bank.branchCode}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtle Bottom Decorative Element */}
                <div className="absolute bottom-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                  <Building2 size={80} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .grid > div {
          animation: slideUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Bank;
