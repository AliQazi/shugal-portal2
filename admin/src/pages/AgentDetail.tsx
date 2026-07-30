import { ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import axiosInstance from "../Api/axios";
import PageMeta from "../components/common/PageMeta";
import PageBreadCrumb from "../components/common/PageBreadCrumb";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

interface Agent {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  agencyCode?: string;
  role: string;
  status: "Active" | "Inactive" | "Pending" | "Suspended";
  city?: string;
  address?: string;
  country?: string;
  marginType?: "Percentage" | "Amount";
  flightMarginPercent?: number;
  flightMarginAmount?: number;
  registeredFrom?: {
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  address: string;
  city: string;
  country: string;
  marginType: "Percentage" | "Amount";
  flightMarginPercent: number;
  flightMarginAmount: number;
  status: "Active" | "Inactive" | "Pending" | "Suspended";
  password: string;
}

const AgentDetail = () => {
  const { user } = useAuth();
  const canView = hasPermission(user, "view_register_agencies");
  const canManage = hasPermission(user, "agent_action_buttons");
  const { id } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const token = useMemo(() => localStorage.getItem("admin_token"), []);

  useEffect(() => {
    const fetchAgent = async () => {
      if (!id || !canView) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/auth/users/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.data?.success) {
          const data: Agent = response.data.data;
          setAgent(data);
          setFormState({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            companyName: data.companyName || "",
            address: data.address || "",
            city: data.city || "",
            country: data.country || "",
            marginType: data.marginType || "Percentage",
            flightMarginPercent: data.flightMarginPercent ?? 0,
            flightMarginAmount: data.flightMarginAmount ?? 0,
            status: (data.status as FormState["status"]) || "Inactive",
            password: "",
          });
        }
      } catch (err: unknown) {
        setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load agent details");
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [id, token, canView]);

  const handleChange = (field: keyof FormState, value: string | number) => {
    if (!formState) return;

    if (field === "marginType") {
      setFormState({
        ...formState,
        marginType: value as FormState["marginType"],
        flightMarginPercent: value === "Percentage" ? formState.flightMarginPercent : 0,
        flightMarginAmount: value === "Amount" ? formState.flightMarginAmount : 0,
      });
      return;
    }

    setFormState({ ...formState, [field]: value });
  };

  const handleUpdate = async () => {
    if (!id || !formState) return;
    if (!canManage) {
      setError("You don't have permission to update agents");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        ...formState,
        flightMarginPercent: Number(formState.flightMarginPercent) || 0,
        flightMarginAmount: Number(formState.flightMarginAmount) || 0,
      };

      if (!payload.password) {
        delete (payload as Partial<FormState>).password;
      }

      const response = await axiosInstance.put(`/auth/users/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data?.success) {
        setAgent(response.data.data);
        setEditMode(false);
        setSuccess("Agent updated successfully");
        setFormState({ ...formState, password: "" });
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update agent");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !agent) return;
    if (!window.confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) return;

    try {
      setDeleting(true);
      const response = await axiosInstance.delete(`/auth/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        navigate(-1);
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to delete agent");
    } finally {
      setDeleting(false);
    }
  };

  const handleRecover = async () => {
    if (!id || !agent) return;
    if (!window.confirm(`Recover "${agent.name}" and restore their account?`)) return;

    try {
      setRecovering(true);
      const response = await axiosInstance.patch(`/auth/users/${id}/recover`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setAgent(response.data.data);
        setSuccess("Agent recovered successfully");
      }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to recover agent");
    } finally {
      setRecovering(false);
    }
  };

  const marginDisplay = useMemo(() => {
    if (!agent) return "0";
    if (agent.marginType === "Amount") {
      return `${agent.flightMarginAmount ?? 0} PKR`;
    }
    return `${agent.flightMarginPercent ?? 0}%`;
  }, [agent]);

  const getStatusBadge = (status: Agent["status"]) => {
    const styles = {
      Active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800/30",
      Inactive: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
      Pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800/30",
      Suspended: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-800/30",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
        <span className="h-1.5 w-1.5 rounded-full current-color bg-current" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-1400">
        <PageMeta title="Agent Detail" description="View and edit agent" />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-3" />
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading agent details...</div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-6">
        <PageMeta title="Agent Detail - Access denied" description="Access denied" />
        <PageBreadCrumb pageTitle="Agent Detail" />
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
          You do not have permission to view Registered Agencies.
        </div>
      </div>
    );
  }

  if (!agent || !formState) {
    return (
      <div className="p-6">
        <PageMeta title="Agent Detail" description="View and edit agent" />
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl dark:border-gray-800">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Agent record not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <PageMeta title="Agent Detail" description="View and edit agent" />
      <PageBreadCrumb pageTitle="Agent Detail" />

      {/* Action Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          ← Back
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && agent.isDeleted ? (
            <button
              onClick={handleRecover}
              disabled={recovering}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
            >
              {recovering ? "Recovering..." : "Recover Agent"}
            </button>
          ) : canManage && agent.status === "Inactive" ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-sm"
            >
              {deleting ? "Deleting..." : "Delete Agent"}
            </button>
          ) : null}
          <button
            onClick={() => canManage && setEditMode(!editMode)}
            disabled={!canManage}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition shadow-sm ${editMode
                ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            title={!canManage ? "You don't have permission to edit agents" : ""}
          >
            {editMode ? "Cancel Edit" : "Edit Agent"}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {(error || success) && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium animate-fade-in ${error
              ? "bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-500/10 dark:border-rose-900/30 dark:text-rose-400"
              : "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-900/30 dark:text-emerald-400"
            }`}
        >
          {error || success}
        </div>
      )}

      {/* Main Profile Showcase Banner */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 -translate-y-12">
          <div className="w-64 h-64 rounded-full bg-white" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
          <div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 text-2xl font-bold uppercase">
            {agent.companyName ? agent.companyName.slice(0, 2) : "AG"}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{agent.companyName || "No Company Specified"}</h1>
              {!editMode && getStatusBadge(agent.status)}
            </div>
            <p className="text-blue-100 text-sm mt-0.5">
              Code: <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded">{agent.agencyCode || "N/A"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Dashboard / Fields Layout */}
      {!editMode ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 1: Agency Profile */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Contact & Agency Profile</h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
              <DetailRow label="Contact Person" value={agent.name} />
              <DetailRow label="Email Address" value={agent.email} />
              <DetailRow label="Phone Number" value={agent.phone} />
              <DetailRow
                label="Registered From"
                value={`${agent.registeredFrom?.ipAddress || "-"} (${agent.registeredFrom?.userAgent ? "Web Device" : "Unknown"})`}
              />
            </div>
          </div>

          {/* Card 2: Margins & Location */}
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Financial Margins</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                <DetailRow label="Margin Type" value={agent.marginType || "Percentage"} />
                <DetailRow label="Flight Ticket Margin" value={marginDisplay} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Location Details</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                <DetailRow label="Street Address" value={agent.address} />
                <DetailRow label="City / Region" value={agent.city} />
                <DetailRow label="Country" value={agent.country} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Form Edit Layout Dashboard Mode */
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Modify Agent Parameters</h3>
            <p className="text-xs text-gray-400 mt-1">Provide up-to-date account details, passwords, and margins below.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormRow label="Contact Person Name">
              <input
                value={formState.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
              />
            </FormRow>

            <FormRow label="Email Address">
              <input
                type="email"
                value={formState.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
              />
            </FormRow>

            <FormRow label="Phone No">
              <input
                value={formState.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
              />
            </FormRow>

            <FormRow label="Agency Name">
              <input
                value={formState.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
              />
            </FormRow>

            <FormRow label="System Status">
              <select
                value={formState.status}
                onChange={(e) => handleChange("status", e.target.value as FormState["status"])}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
            </FormRow>

            <FormRow label="New Password Configuration">
              <input
                type="password"
                value={formState.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Leave blank to keep active credentials"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </FormRow>
          </div>

          {/* Sub Grid Panel for Margins exclusively */}
          <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Margin Allocations</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormRow label="Margin Type">
                <select
                  value={formState.marginType}
                  onChange={(e) => handleChange("marginType", e.target.value as FormState["marginType"])}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
                >
                  <option value="Percentage">Percentage</option>
                  <option value="Amount">Amount</option>
                </select>
              </FormRow>

              <FormRow label="Flight Margin (%)">
                <input
                  type="number"
                  value={formState.flightMarginPercent > 0 ? formState.flightMarginPercent : ""}
                  placeholder="0"
                  onChange={(e) => handleChange("flightMarginPercent", Number(e.target.value))}
                  disabled={formState.marginType !== "Percentage"}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-blue-500/10 ${formState.marginType !== "Percentage"
                      ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800/50 dark:border-gray-700/50 dark:text-gray-600"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500"
                    }`}
                />
              </FormRow>

              <FormRow label="Flight Margin (PKR)">
                <input
                  type="number"
                  value={formState.flightMarginAmount > 0 ? formState.flightMarginAmount : ""}
                  placeholder="0"
                  onChange={(e) => handleChange("flightMarginAmount", Number(e.target.value))}
                  disabled={formState.marginType !== "Amount"}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-4 focus:ring-blue-500/10 ${formState.marginType !== "Amount"
                      ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800/50 dark:border-gray-700/50 dark:text-gray-600"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500"
                    }`}
                />
              </FormRow>
            </div>
          </div>

          {/* Location Area fields */}
          <div className="grid gap-5 sm:grid-cols-3">
            <FormRow label="Address">
              <input
                value={formState.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
              />
            </FormRow>
            <FormRow label="City">
              <input
                value={formState.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
              />
            </FormRow>
            <FormRow label="Country">
              <input
                value={formState.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition outline-none"
              />
            </FormRow>
          </div>

          {/* Bottom Form Actions Drawer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setEditMode(false)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={saving || !canManage}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              title={!canManage ? "You don't have permission to update agents" : ""}
            >
              {saving ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* Redesigned Clean Rows */
const DetailRow = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 transition hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-0">
      {label}
    </span>
    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 break-all sm:text-right max-w-xs">
      {value || "—"}
    </span>
  </div>
);

/* Clean Layout Form row label structure wrapper */
const FormRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</label>
    {children}
  </div>
);

export default AgentDetail;