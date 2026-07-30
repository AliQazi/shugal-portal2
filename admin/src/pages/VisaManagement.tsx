import React, { useEffect, useState } from "react";
import axiosInstance from "../Api/axios";
import currency_list from "../data/currencies";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import {
    IdentificationIcon,
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    TruckIcon,
    NoSymbolIcon,
    ClockIcon,
    CurrencyDollarIcon,
    ArrowTrendingUpIcon,
    CheckCircleIcon,
    XMarkIcon,
    DocumentTextIcon,
    ChartBarIcon,
} from "@heroicons/react/24/outline";

interface VisaType {
    _id?: string;
    visaType: string;
    withTransport: boolean;
    processingTime: number;
    buyingPrice: number;
    buyingRoe: number;
    buyingCurrency: string;
    sellingPrice: number;
    sellingRoe: number;
    sellingCurrency: string;
    currency: string;
    description: string;
}

const visaTypeOptions = [
    { value: "01 PAX", label: "01 PAX" },
    { value: "02 PAX", label: "02 PAX" },
    { value: "03 PAX", label: "03 PAX" },
    { value: "04 PAX", label: "04 PAX" },
    { value: "05 TO 19 PAX", label: "05 TO 19 PAX" },
    { value: "20 TO 29 PAX", label: "20 TO 29 PAX" },
    { value: "30 TO 47 PAX", label: "30 TO 47 PAX" },
    { value: "INFANT", label: "INFANT" },
];

const initialState: VisaType = {
    visaType: "",
    withTransport: false,
    processingTime: 0,
    buyingPrice: 0,
    buyingRoe: 0,
    buyingCurrency: "PKR",
    sellingPrice: 0,
    sellingRoe: 0,
    sellingCurrency: "PKR",
    currency: "PKR",
    description: "",
};

// ─── Stat Card ────────────────────────────────────────────────────
function StatCard({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <div
            style={{
                background: "white",
                borderRadius: "14px",
                padding: "16px 20px",
                border: "1px solid #e8edf5",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                minWidth: "130px",
            }}
        >
            <div
                style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                <Icon style={{ width: "20px", height: "20px", color: "white" }} />
            </div>
            <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0d1b2a", lineHeight: 1 }}>
                    {value}
                </div>
                <div
                    style={{
                        fontSize: "0.68rem",
                        color: "#8fa0b4",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginTop: "4px",
                    }}
                >
                    {label}
                </div>
            </div>
        </div>
    );
}

// ─── Field Wrapper ────────────────────────────────────────────────
function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: string }) {
    return (
        <div style={{ gridColumn: span }}>
            <label
                style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#5c7399",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: "7px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
            >
                {label}
            </label>
            {children}
        </div>
    );
}

// ─── Visa Table ───────────────────────────────────────────────────
function VisaTable({
    data,
    title,
    accent,
    icon: Icon,
    onEdit,
    onDelete,
    canManage,
}: {
    data: VisaType[];
    title: string;
    accent: string;
    icon: React.ElementType;
    onEdit: (v: VisaType) => void;
    onDelete: (id?: string) => void;
    canManage: boolean;
}) {
    return (
        <div
            style={{
                background: "white",
                borderRadius: "18px",
                border: "1px solid #e8edf5",
                overflow: "hidden",
                marginBottom: "22px",
                boxShadow: "0 2px 12px rgba(13,27,42,0.04)",
            }}
        >
            <div
                style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid #f0f4fa",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}
            >
                <div
                    style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "10px",
                        background: accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <Icon style={{ width: "17px", height: "17px", color: "white" }} />
                </div>
                <h2
                    style={{
                        margin: 0,
                        fontSize: "0.92rem",
                        fontWeight: 700,
                        color: "#0d1b2a",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                >
                    {title}
                </h2>
                <span
                    style={{
                        marginLeft: "auto",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "#8fa0b4",
                        background: "#f2f5fa",
                        borderRadius: "20px",
                        padding: "3px 11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                    }}
                >
                    {data.length} records
                </span>
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["Visa Type", "Processing", "Buy Price", "Buy ROE", "Buy Currency", "Sell Price", "Sell ROE", "Sell Currency", "Margin", "Actions"].map((c) => (
                                <th
                                    key={c}
                                    style={{
                                        padding: "10px 22px",
                                        textAlign: "left",
                                        fontSize: "0.65rem",
                                        fontWeight: 700,
                                        color: "#8fa0b4",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.07em",
                                        background: "#f8fafd",
                                        borderBottom: "1px solid #f0f4fa",
                                        whiteSpace: "nowrap",
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    }}
                                >
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.length > 0 ? (
                            data.map((visa, i) => {
                                const margin = visa.sellingPrice - visa.buyingPrice;
                                const pct = visa.buyingPrice > 0 ? ((margin / visa.buyingPrice) * 100).toFixed(1) : "0.0";
                                const pos = margin >= 0;
                                const rowBg = i % 2 === 0 ? "white" : "#fafbfd";
                                return (
                                    <tr
                                        key={visa._id}
                                        style={{ borderBottom: "1px solid #f5f7fb", background: rowBg, transition: "background 0.12s" }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f2f6ff")}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
                                    >
                                        <td style={{ padding: "13px 22px", fontWeight: 600, color: "#0d1b2a", fontSize: "0.875rem", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap" }}>
                                            {visa.visaType}
                                        </td>
                                        <td style={{ padding: "13px 22px" }}>
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                    fontSize: "0.78rem",
                                                    fontWeight: 500,
                                                    color: "#5c7399",
                                                    background: "#f0f4fa",
                                                    borderRadius: "8px",
                                                    padding: "4px 10px",
                                                }}
                                            >
                                                <ClockIcon style={{ width: "12px", height: "12px" }} />
                                                {visa.processingTime}d
                                            </span>
                                        </td>
                                        <td style={{ padding: "13px 22px", fontSize: "0.84rem", color: "#3a4f6a", fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                            {visa.buyingPrice.toLocaleString()}
                                        </td>
                                        <td style={{ padding: "13px 22px", fontSize: "0.84rem", color: "#3a4f6a", fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                            {visa.buyingRoe?.toLocaleString() || "0"}
                                        </td>
                                        <td style={{ padding: "13px 22px" }}>
                                            <span
                                                style={{
                                                    fontSize: "0.7rem",
                                                    fontWeight: 700,
                                                    color: "#3730a3",
                                                    background: "#ede9fe",
                                                    borderRadius: "7px",
                                                    padding: "3px 9px",
                                                    letterSpacing: "0.04em",
                                                }}
                                            >
                                                {visa.buyingCurrency || visa.currency || "PKR"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "13px 22px", fontSize: "0.84rem", color: "#0d1b2a", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                            {visa.sellingPrice.toLocaleString()}
                                        </td>
                                        <td style={{ padding: "13px 22px", fontSize: "0.84rem", color: "#0d1b2a", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                            {visa.sellingRoe?.toLocaleString() || "0"}
                                        </td>
                                        <td style={{ padding: "13px 22px" }}>
                                            <span
                                                style={{
                                                    fontSize: "0.7rem",
                                                    fontWeight: 700,
                                                    color: "#3730a3",
                                                    background: "#ede9fe",
                                                    borderRadius: "7px",
                                                    padding: "3px 9px",
                                                    letterSpacing: "0.04em",
                                                }}
                                            >
                                                {visa.sellingCurrency || visa.currency || "PKR"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "13px 22px" }}>
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    fontSize: "0.72rem",
                                                    fontWeight: 700,
                                                    color: pos ? "#065f46" : "#991b1b",
                                                    background: pos ? "#dcfdf1" : "#fee2e2",
                                                    borderRadius: "7px",
                                                    padding: "3px 9px",
                                                }}
                                            >
                                                <ArrowTrendingUpIcon
                                                    style={{
                                                        width: "11px",
                                                        height: "11px",
                                                        transform: pos ? "none" : "rotate(180deg)",
                                                    }}
                                                />
                                                {pos ? "+" : ""}{pct}%
                                            </span>
                                        </td>
                                        <td style={{ padding: "13px 22px" }}>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <button
                                                    onClick={() => onEdit(visa)}
                                                    disabled={!canManage}
                                                    title={!canManage ? "You don't have permission to manage visas" : ""}
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "5px",
                                                        background: "white",
                                                        color: "#1d4ed8",
                                                        border: "1.5px solid #bfdbfe",
                                                        borderRadius: "9px",
                                                        padding: "6px 13px",
                                                        fontSize: "0.77rem",
                                                        fontWeight: 600,
                                                        cursor: canManage ? "pointer" : "not-allowed",
                                                        opacity: canManage ? 1 : 0.45,
                                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                        transition: "all 0.15s",
                                                    }}
                                                    onMouseEnter={(e) => { if (canManage) { e.currentTarget.style.background = "#1d4ed8"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "#1d4ed8"; } }}
                                                    onMouseLeave={(e) => { if (canManage) { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#1d4ed8"; e.currentTarget.style.borderColor = "#bfdbfe"; } }}
                                                >
                                                    <PencilSquareIcon style={{ width: "13px", height: "13px" }} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => onDelete(visa._id)}
                                                    disabled={!canManage}
                                                    title={!canManage ? "You don't have permission to manage visas" : ""}
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "5px",
                                                        background: "white",
                                                        color: "#dc2626",
                                                        border: "1.5px solid #fecaca",
                                                        borderRadius: "9px",
                                                        padding: "6px 13px",
                                                        fontSize: "0.77rem",
                                                        fontWeight: 600,
                                                        cursor: canManage ? "pointer" : "not-allowed",
                                                        opacity: canManage ? 1 : 0.45,
                                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                        transition: "all 0.15s",
                                                    }}
                                                    onMouseEnter={(e) => { if (canManage) { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "#dc2626"; } }}
                                                    onMouseLeave={(e) => { if (canManage) { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fecaca"; } }}
                                                >
                                                    <TrashIcon style={{ width: "13px", height: "13px" }} />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={10}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 20px", gap: "10px" }}>
                                        <IdentificationIcon style={{ width: "34px", height: "34px", color: "#c8d4e6" }} />
                                        <p style={{ color: "#a0b0c8", fontSize: "0.84rem", margin: 0, fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                            No records found
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────
export default function VisaManagement() {
    const { user } = useAuth();
    const canView = hasPermission(user, "view_visas");
    const canAdd = hasPermission(user, "add_visa");
    const canManage = hasPermission(user, "manage_visas");
    const [visas, setVisas] = useState<VisaType[]>([]);
    const [formData, setFormData] = useState<VisaType>(initialState);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const visasWithTransport = visas.filter((v) => v.withTransport);
    const visasWithoutTransport = visas.filter((v) => !v.withTransport);

    const currencyOptions = currency_list.map((curr) => ({
        value: curr.code,
        label: `${curr.code} — ${curr.name}`,
    }));

    const fetchVisas = async () => {
        try {
            const res = await axiosInstance.get("/visas/all");
            setVisas(res.data.data || []);
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        if (canView) {
            fetchVisas();
        }
    }, [canView]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: [
                "processingTime",
                "buyingPrice",
                "buyingRoe",
                "sellingPrice",
                "sellingRoe",
            ].includes(name)
                ? Number(value)
                : value,
        }));
    };

    const handleBuyingCurrencyChange = (opt: any) => {
        setFormData((prev) => ({ ...prev, buyingCurrency: opt?.value || "PKR" }));
    };

    const handleSellingCurrencyChange = (opt: any) => {
        setFormData((prev) => ({ ...prev, sellingCurrency: opt?.value || "PKR" }));
    };

    const handleVisaTypeChange = (opt: any) => {
        setFormData((prev) => ({ ...prev, visaType: opt?.value || "" }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.visaType.trim()) {
            alert("Please select or enter a visa type");
            return;
        }

        const canSave = editId ? canManage : canAdd;
        if (!canSave) {
            alert(editId ? "You don't have permission to update visas" : "You don't have permission to add visas");
            return;
        }

        try {
            setLoading(true);
            if (editId) {
                await axiosInstance.put(`/visas/update/${editId}`, formData);
                alert("Visa updated successfully");
            } else {
                await axiosInstance.post("/visas/create", formData);
                alert("Visa created successfully");
            }
            setFormData(initialState);
            setEditId(null);
            fetchVisas();
        } catch (err) {
            console.log(err);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (visa: VisaType) => {
        if (!canManage) {
            alert("You don't have permission to manage visas");
            return;
        }

        setFormData({
            visaType: visa.visaType,
            withTransport: visa.withTransport,
            processingTime: visa.processingTime,
            buyingPrice: visa.buyingPrice,
            buyingRoe: visa.buyingRoe || 0,
            buyingCurrency: visa.buyingCurrency || visa.currency || "PKR",
            sellingPrice: visa.sellingPrice,
            sellingRoe: visa.sellingRoe || 0,
            sellingCurrency: visa.sellingCurrency || visa.currency || "PKR",
            currency: visa.currency,
            description: visa.description,
        });
        setEditId(visa._id || null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!canManage) {
            alert("You don't have permission to manage visas");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this visa?")) return;
        try {
            await axiosInstance.delete(`/visas/delete/${id}`);
            alert("Visa deleted successfully");
            fetchVisas();
        } catch (err) {
            console.log(err);
            alert("Delete failed");
        }
    };

    const profit = formData.sellingPrice - formData.buyingPrice;
    const profitPct = formData.buyingPrice > 0 ? ((profit / formData.buyingPrice) * 100).toFixed(1) : "0.0";

    const selectStyles = {
        control: (base: any, state: any) => ({
            ...base,
            borderRadius: "10px",
            padding: "1px 4px",
            borderColor: state.isFocused ? "#2563eb" : "#dde4ef",
            boxShadow: state.isFocused ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
            background: "#fafbfd",
            "&:hover": { borderColor: "#2563eb" },
            fontSize: "0.875rem",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
        }),
        option: (base: any, state: any) => ({
            ...base,
            background: state.isSelected ? "#2563eb" : state.isFocused ? "#eff6ff" : "white",
            color: state.isSelected ? "white" : "#0d1b2a",
            fontSize: "0.85rem",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
        }),
        singleValue: (base: any) => ({ ...base, color: "#0d1b2a", fontFamily: "'Plus Jakarta Sans', sans-serif" }),
        placeholder: (base: any) => ({ ...base, color: "#b0bec5" }),
    };

    if (!canView) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
                You do not have permission to view Visas.
            </div>
        );
    }

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; }
                .vm-input {
                    width: 100%;
                    border: 1.5px solid #dde4ef;
                    border-radius: 10px;
                    padding: 10px 14px;
                    font-size: 0.875rem;
                    outline: none;
                    color: #0d1b2a;
                    background: #fafbfd;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .vm-input:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
                    background: white;
                }
                .vm-input::placeholder { color: #b8c8da; }
                .t-card {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 9px 12px;
                    border-radius: 10px;
                    border: 1.5px solid #dde4ef;
                    background: #fafbfd;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #5c7399;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    transition: all 0.15s;
                    user-select: none;
                }
                .t-card.on {
                    border-color: #2563eb;
                    background: #eff6ff;
                    color: #1d4ed8;
                }
            `}</style>

            <div
                style={{
                    minHeight: "100vh",
                    background: "#f1f5fb",
                    padding: "32px 28px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
            >
                <div style={{ maxWidth: "1220px", margin: "0 auto" }}>

                    {/* ── Header ── */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "26px",
                            flexWrap: "wrap",
                            gap: "16px",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <div
                                style={{
                                    width: "46px",
                                    height: "46px",
                                    borderRadius: "14px",
                                    background: "#1d4ed8",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 4px 14px rgba(29,78,216,0.25)",
                                }}
                            >
                                <IdentificationIcon style={{ width: "22px", height: "22px", color: "white" }} />
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#0d1b2a", letterSpacing: "-0.01em" }}>
                                    Visa Management
                                </h1>
                                <p style={{ margin: 0, color: "#8fa0b4", fontSize: "0.8rem", marginTop: "3px" }}>
                                    Manage Umrah visa packages and pricing
                                </p>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <StatCard label="Total" value={visas.length} icon={ChartBarIcon} color="#1d4ed8" />
                            <StatCard label="No Transport" value={visasWithoutTransport.length} icon={NoSymbolIcon} color="#0891b2" />
                            <StatCard label="With Transport" value={visasWithTransport.length} icon={TruckIcon} color="#059669" />
                        </div>
                    </div>

                    {/* ── Form ── */}
                    <div
                        style={{
                            background: "white",
                            borderRadius: "18px",
                            border: "1px solid #e8edf5",
                            boxShadow: "0 2px 12px rgba(13,27,42,0.04)",
                            marginBottom: "22px",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                padding: "15px 24px",
                                borderBottom: "1px solid #f0f4fa",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                background: editId ? "#fffbeb" : "#f8fafd",
                            }}
                        >
                            {editId
                                ? <PencilSquareIcon style={{ width: "17px", height: "17px", color: "#d97706" }} />
                                : <PlusIcon style={{ width: "17px", height: "17px", color: "#1d4ed8" }} />
                            }
                            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0d1b2a" }}>
                                {editId ? "Edit Visa Record" : "Add New Visa"}
                            </span>
                            {editId && (
                                <span style={{ marginLeft: "8px", fontSize: "0.67rem", fontWeight: 700, color: "#92400e", background: "#fde68a", borderRadius: "20px", padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Editing
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: "22px 24px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>

                                <Field label="Visa Type *">
                                    <CreatableSelect
                                        options={visaTypeOptions}
                                        value={formData.visaType ? { value: formData.visaType, label: formData.visaType } : null}
                                        onChange={handleVisaTypeChange}
                                        placeholder="Select a type or type your own..."
                                        isClearable
                                        styles={selectStyles}
                                    />
                                </Field>

                                <Field label="Processing Time (Days)">
                                    <input className="vm-input" type="number" name="processingTime" value={formData.processingTime} onChange={handleChange} placeholder="7" min={0} />
                                </Field>

                                <Field label="Buying Price *">
                                    <input className="vm-input" type="number" name="buyingPrice" value={formData.buyingPrice} onChange={handleChange} placeholder="50000" required min={0} />
                                </Field>

                                <Field label="Buying ROE">
                                    <input className="vm-input" type="number" name="buyingRoe" value={formData.buyingRoe} onChange={handleChange} placeholder="1.00" step="0.01" min={0} />
                                </Field>

                                <Field label="Buying Currency">
                                    <Select options={currencyOptions} value={currencyOptions.find((o) => o.value === formData.buyingCurrency)} onChange={handleBuyingCurrencyChange} placeholder="Select currency..." isSearchable styles={selectStyles} />
                                </Field>

                                <Field label="Selling Price *">
                                    <input className="vm-input" type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} placeholder="60000" required min={0} />
                                </Field>

                                <Field label="Selling ROE">
                                    <input className="vm-input" type="number" name="sellingRoe" value={formData.sellingRoe} onChange={handleChange} placeholder="1.00" step="0.01" min={0} />
                                </Field>

                                <Field label="Selling Currency">
                                    <Select options={currencyOptions} value={currencyOptions.find((o) => o.value === formData.sellingCurrency)} onChange={handleSellingCurrencyChange} placeholder="Select currency..." isSearchable styles={selectStyles} />
                                </Field>

                                {/* Profit preview */}
                                {(formData.buyingPrice > 0 || formData.sellingPrice > 0) && (
                                    <Field label="Profit Preview">
                                        <div
                                            style={{
                                                background: profit >= 0 ? "#f0fdf6" : "#fff1f1",
                                                border: `1.5px solid ${profit >= 0 ? "#a7f3cf" : "#fecaca"}`,
                                                borderRadius: "10px",
                                                padding: "10px 14px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                height: "42px",
                                            }}
                                        >
                                            <CurrencyDollarIcon style={{ width: "16px", height: "16px", color: profit >= 0 ? "#059669" : "#dc2626", flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontSize: "0.9rem", fontWeight: 800, color: profit >= 0 ? "#065f46" : "#991b1b", lineHeight: 1 }}>
                                                    {profit >= 0 ? "+" : ""}{profit.toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: "0.68rem", color: profit >= 0 ? "#059669" : "#dc2626", fontWeight: 600, marginTop: "1px" }}>
                                                    {profitPct}% margin
                                                </div>
                                            </div>
                                        </div>
                                    </Field>
                                )}

                                <Field label="Transport">
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <label className={`t-card ${!formData.withTransport ? "on" : ""}`}>
                                            <input type="radio" style={{ display: "none" }} name="withTransport" checked={!formData.withTransport} onChange={() => setFormData({ ...formData, withTransport: false })} />
                                            <NoSymbolIcon style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                                            Without
                                        </label>
                                        <label className={`t-card ${formData.withTransport ? "on" : ""}`}>
                                            <input type="radio" style={{ display: "none" }} name="withTransport" checked={formData.withTransport} onChange={() => setFormData({ ...formData, withTransport: true })} />
                                            <TruckIcon style={{ width: "14px", height: "14px", flexShrink: 0 }} />
                                            With
                                        </label>
                                    </div>
                                </Field>

                                <Field label="Description" span="1 / -1">
                                    <div style={{ position: "relative" }}>
                                        <DocumentTextIcon style={{ width: "14px", height: "14px", position: "absolute", top: "12px", left: "13px", color: "#b0bec5", pointerEvents: "none" }} />
                                        <textarea className="vm-input" name="description" value={formData.description} onChange={handleChange} placeholder="Additional details, inclusions, restrictions..." rows={3} style={{ paddingLeft: "34px", resize: "vertical" }} />
                                    </div>
                                </Field>
                            </div>

                            <div style={{ display: "flex", gap: "10px", marginTop: "20px", paddingTop: "18px", borderTop: "1px solid #f0f4fa" }}>
                                <button
                                    type="submit"
                                    disabled={loading || (editId ? !canManage : !canAdd)}
                                    title={editId ? (!canManage ? "You don't have permission to update visas" : "") : (!canAdd ? "You don't have permission to add visas" : "")}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "7px",
                                        background: loading || (editId ? !canManage : !canAdd) ? "#93c5fd" : "#1d4ed8",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "11px",
                                        padding: "11px 26px",
                                        fontSize: "0.875rem",
                                        fontWeight: 700,
                                        cursor: loading || (editId ? !canManage : !canAdd) ? "not-allowed" : "pointer",
                                        opacity: loading || (editId ? !canManage : !canAdd) ? 0.55 : 1,
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        boxShadow: loading || (editId ? !canManage : !canAdd) ? "none" : "0 2px 10px rgba(29,78,216,0.22)",
                                        transition: "background 0.15s",
                                    }}
                                >
                                    {editId
                                        ? <CheckCircleIcon style={{ width: "16px", height: "16px" }} />
                                        : <PlusIcon style={{ width: "16px", height: "16px" }} />
                                    }
                                    {loading ? "Processing..." : editId ? "Update Visa" : "Add Visa"}
                                </button>

                                {editId && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditId(null); setFormData(initialState); }}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "7px",
                                            background: "white",
                                            color: "#5c7399",
                                            border: "1.5px solid #dde4ef",
                                            borderRadius: "11px",
                                            padding: "11px 22px",
                                            fontSize: "0.875rem",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        <XMarkIcon style={{ width: "15px", height: "15px" }} />
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* ── Tables ── */}
                    <VisaTable data={visasWithoutTransport} title="Umrah Visa — Without Transport" accent="#0891b2" icon={NoSymbolIcon} onEdit={handleEdit} onDelete={handleDelete} canManage={canManage} />
                    <VisaTable data={visasWithTransport} title="Umrah Visa — With Transport" accent="#059669" icon={TruckIcon} onEdit={handleEdit} onDelete={handleDelete} canManage={canManage} />
                </div>
            </div>
        </>
    );
}
