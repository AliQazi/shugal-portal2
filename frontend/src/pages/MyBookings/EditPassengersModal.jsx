import { useState } from "react";
import { X, Upload } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../api/axios";

const TITLE_OPTIONS = {
  Adult: ["Mr", "Ms", "Mrs"],
  Child: ["CHLD"],
  Infant: ["INF"],
};

const toDateInput = (value) => (value ? String(value).split("T")[0] : "");

const inputClass =
  "px-1.5 py-1 bg-white border border-gray-200 rounded text-sm! focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none";

// Edits identity details of an existing Group Ticket booking's passengers.
// Only passenger details change - status, pricing, seats and ledger entries are
// never touched by this call (see updateBookingPassengerDetails on the API).
export default function EditPassengersModal({ booking, onClose, onSaved }) {
  const [passengers, setPassengers] = useState(() =>
    (booking.passengers || []).map((p) => ({
      type: p.type,
      title: p.title || "",
      givenName: p.givenName || "",
      surName: p.surName || "",
      passport: p.passport || "",
      dateOfBirth: toDateInput(p.dateOfBirth),
      passportExpiry: toDateInput(p.passportExpiry),
      nationality: p.nationality || "",
      documentUrl: p.documentUrl || "",
      newFile: null,
    })),
  );
  const [saving, setSaving] = useState(false);

  const setField = (index, field, value) =>
    setPassengers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);

      // Upload any replaced documents first, then send plain JSON.
      const payload = await Promise.all(
        passengers.map(async ({ newFile, ...p }) => {
          if (!newFile) return p;
          const fd = new FormData();
          fd.append("document", newFile);
          const res = await axiosInstance.post("/bookings/upload-document", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          return { ...p, documentUrl: res.data?.url || p.documentUrl };
        }),
      );

      const res = await axiosInstance.patch(
        `/bookings/${booking._id}/passengers`,
        { passengers: payload },
      );
      toast.success("Passenger details updated successfully");
      onSaved(booking._id, res.data.data.passengers);
      onClose();
    } catch (error) {
      console.error("Error updating passenger details:", error);
      toast.error(
        error.response?.data?.message || "Failed to update passenger details",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-3 flex items-start justify-between border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Edit Passenger Details
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Ref:{" "}
              <span className="font-mono font-medium text-emerald-600">
                {booking.bookingReference}
              </span>{" "}
              · {passengers.length} passenger{passengers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 overflow-auto px-4 py-3">
            <table className="w-full table-fixed border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  {[
                    ["#", "w-[3%]"],
                    ["Type", "w-[7%]"],
                    ["Title", "w-[6%]"],
                    ["Given Name", "w-[14%]"],
                    ["Surname", "w-[14%]"],
                    ["Passport", "w-[11%]"],
                    ["Date of Birth", "w-[13%]"],
                    ["Passport Expiry", "w-[13%]"],
                    ["Nationality", "w-[9%]"],
                    ["Document", "w-[10%]"],
                  ].map(([h, w]) => (
                    <th
                      key={h}
                      className={`${w} px-1.5 py-2 text-left border-b border-gray-200`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {passengers.map((pax, i) => {
                  const titles = TITLE_OPTIONS[pax.type] || [];
                  return (
                    <tr key={i} className="hover:bg-gray-50/60">
                      <td className="px-1.5 py-1.5 align-middle font-semibold text-gray-400">
                        {i + 1}
                      </td>
                      <td className="px-1.5 py-1.5 align-middle ">
                        <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          {pax.type}
                        </span>
                      </td>
                      <td className="px-1.5 py-1.5 align-middle">
                        <select
                          value={pax.title}
                          onChange={(e) => setField(i, "title", e.target.value)}
                          className={`w-full ${inputClass}`}
                        >
                          {(titles.includes(pax.title)
                            ? titles
                            : [pax.title, ...titles].filter(Boolean)
                          ).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1.5 py-1.5 align-middle">
                        <input
                          type="text"
                          required
                          value={pax.givenName}
                          onChange={(e) => setField(i, "givenName", e.target.value)}
                          className={`w-full ${inputClass}`}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 align-middle">
                        <input
                          type="text"
                          required
                          value={pax.surName}
                          onChange={(e) => setField(i, "surName", e.target.value)}
                          className={`w-full ${inputClass}`}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 align-middle">
                        <input
                          type="text"
                          required
                          value={pax.passport}
                          onChange={(e) =>
                            setField(i, "passport", e.target.value.toUpperCase())
                          }
                          className={`w-full uppercase ${inputClass}`}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 align-middle">
                        <input
                          type="date"
                          value={pax.dateOfBirth}
                          onChange={(e) => setField(i, "dateOfBirth", e.target.value)}
                          className={`w-full ${inputClass}`}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 align-middle">
                        <input
                          type="date"
                          value={pax.passportExpiry}
                          onChange={(e) => setField(i, "passportExpiry", e.target.value)}
                          className={`w-full ${inputClass}`}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 align-middle">
                        <input
                          type="text"
                          required
                          value={pax.nationality}
                          onChange={(e) => setField(i, "nationality", e.target.value)}
                          className={`w-full ${inputClass}`}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 align-middle">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) =>
                            setField(i, "newFile", e.target.files?.[0] || null)
                          }
                          style={{ display: "none" }}
                          id={`edit-gt-pax-doc-${i}`}
                        />
                        <label
                          htmlFor={`edit-gt-pax-doc-${i}`}
                          className={`flex items-center justify-center gap-1 px-2 py-1 rounded border text-[10px] font-semibold cursor-pointer ${pax.newFile
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                          title={pax.newFile?.name || "Upload new document"}
                        >
                          <Upload className="w-3 h-3" />
                          {pax.newFile ? "Selected" : "Replace"}
                        </label>
                        {!pax.newFile && pax.documentUrl && (
                          <a
                            href={pax.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block text-center text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                          >
                            View current
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5! text-gray-600 font-bold text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-2.5! bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Passenger Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
