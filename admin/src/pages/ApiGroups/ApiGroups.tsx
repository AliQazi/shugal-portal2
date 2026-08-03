import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { useSearchParams } from "react-router";
import axiosInstance from "../../Api/axios";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import { streamNdjson } from "../../utils/streamNdjson";
import citiesData from "./cities.json";

interface CityData {
    iata: string;
    lon?: string;
    iso: string;
    status: number;
    name: string;
    continent: string;
    type: string;
    lat?: string;
    size?: string | null;
}

const cityLookupMap = new Map<string, CityData>();

// Build the map with multiple keys for flexible matching
citiesData.forEach((city: any) => {
    // Check if city or city.name is null/undefined before processing
    if (!city || !city.name || typeof city.name !== 'string') return;

    // Store by IATA code (upper)
    cityLookupMap.set(city.iata.toUpperCase(), city);

    // Store by full name uppercase
    cityLookupMap.set(city.name.toUpperCase(), city);

    // Store by name without "International Airport / Intl / Airport" suffix (uppercase)
    const shortName = city.name
        .replace(/\s*(International\s*Airport|International|Intl\.?|Airport)\s*/gi, '')
        .trim()
        .toUpperCase();
    if (shortName && shortName !== city.name.toUpperCase()) {
        // Only set if this short name doesn't already map to a different (larger/preferred) airport
        if (!cityLookupMap.has(shortName)) {
            cityLookupMap.set(shortName, city);
        }
    }
});

// ─── Helper to get IATA code from a city name or IATA code ──────────────────────────────
const getCityIATAFromData = (cityName: string): string | null => {
    if (!cityName) return null;

    // Clean the input
    let cleanName = cityName.trim().toUpperCase();

    // Remove any existing IATA code in parentheses (e.g., "MULTAN (MUX)" -> "MULTAN")
    cleanName = cleanName.replace(/\s*\([A-Z]{3}\)\s*/, '').trim();

    // 1. If it's already a 3-letter IATA code, look it up directly
    if (/^[A-Z]{3}$/.test(cleanName)) {
        const data = cityLookupMap.get(cleanName);
        return data ? data.iata : cleanName; // return as-is if it looks like a valid IATA
    }

    // 2. Exact full name match (uppercase)
    if (cityLookupMap.has(cleanName)) {
        return cityLookupMap.get(cleanName)!.iata;
    }

    // 3. Strip "International Airport / Intl / Airport" and try again
    const stripped = cleanName
        .replace(/\s*(INTERNATIONAL\s*AIRPORT|INTERNATIONAL|INTL\.?|AIRPORT)\s*/gi, '')
        .trim();
    if (stripped && stripped !== cleanName && cityLookupMap.has(stripped)) {
        return cityLookupMap.get(stripped)!.iata;
    }

    // 4. Name-without-spaces match
    const noSpaceName = cleanName.replace(/\s+/g, '');
    if (cityLookupMap.has(noSpaceName)) {
        return cityLookupMap.get(noSpaceName)!.iata;
    }

    // 5. No match — return null
    return null;
};

// ─── Common city name → IATA fallback (for APIs that send plain city names) ──────────────
const CITY_NAME_TO_IATA: Record<string, string> = {
    // Pakistan
    "ISLAMABAD": "ISB", "RAWALPINDI": "ISB",
    "KARACHI": "KHI",
    "LAHORE": "LHE",
    "PESHAWAR": "PEW",
    "QUETTA": "UET",
    "MULTAN": "MUX",
    "FAISALABAD": "LYP",
    "SIALKOT": "SKT",
    "GWADAR": "GWD",
    "TURBAT": "TUK",
    "DERA GHAZI KHAN": "DEA",
    "SUKKUR": "SKZ",
    "BAHAWALPUR": "BHV",
    "RAHIM YAR KHAN": "RYK",
    // Saudi Arabia
    "JEDDAH": "JED", "JEDDA": "JED",
    "RIYADH": "RUH",
    "MECCA": "HEA", "MAKKAH": "HEA",
    "MEDINA": "MED", "MADINAH": "MED",
    "DAMMAM": "DMM",
    "ABHA": "AHB",
    "TAIF": "TIF",
    "TABUK": "TUU",
    "HAIL": "HAS",
    "YANBU": "YNB",
    "NAJRAN": "EAM",
    "JIZAN": "GIZ",
    // UAE
    "DUBAI": "DXB",
    "ABU DHABI": "AUH",
    "SHARJAH": "SHJ",
    // Oman
    "MUSCAT": "MCT",
    "SALALAH": "SLL",
    // Kuwait
    "KUWAIT": "KWI", "KUWAIT CITY": "KWI",
    // Qatar
    "DOHA": "DOH",
    // Bahrain
    "BAHRAIN": "BAH", "MANAMA": "BAH",
    // Other common
    "ISTANBUL": "IST",
    "KUALA LUMPUR": "KUL",
    "BANGKOK": "BKK",
    "LONDON": "LHR",
    "TORONTO": "YYZ",
};

// Enrich getCityIATAFromData with the plain-name fallback
const resolveCityToIATA = (cityName: string): string | null => {
    if (!cityName) return null;
    // Strip trailing/leading punctuation and extra whitespace (e.g. "DAMMAM." → "DAMMAM")
    const cleaned = cityName.trim().replace(/[.\-,;:!?]+$/, '').trim();
    const iata = getCityIATAFromData(cleaned);
    if (iata) return iata;
    // Try plain city name map
    const upper = cleaned.toUpperCase();
    return CITY_NAME_TO_IATA[upper] || null;
};

// ─── Enhanced parseSectorIntoFlights with IATA codes ──────────────────────────────────
const parseSectorIntoFlights = (sector: string): Array<{ origin: string; destination: string; originIATA: string; destIATA: string }> => {
    if (!sector) return [];

    // Split by hyphen to get all cities
    const cities = sector.split('-').map(c => c.trim().toUpperCase());
    if (cities.length < 2) return [];

    // Create pairs: [city1, city2], [city2, city3], etc.
    const flights: Array<{ origin: string; destination: string; originIATA: string; destIATA: string }> = [];
    for (let i = 0; i < cities.length - 1; i++) {
        const origin = cities[i];
        const destination = cities[i + 1];
        const originIATA = resolveCityToIATA(origin) || origin;
        const destIATA = resolveCityToIATA(destination) || destination;
        flights.push({
            origin,
            destination,
            originIATA,
            destIATA
        });
    }
    return flights;
};

// ─── Convert a sector string like "LAHORE-DAMMAM" to "LHE-DMM" ──────────────
const formatSectorToIATA = (sector: string): string => {
    if (!sector) return sector;
    return sector
        .replace(/\.+$/, '')           // strip trailing dots
        .split('-')
        .map(part => {
            const clean = part.trim();
            return resolveCityToIATA(clean) || clean;
        })
        .join('-');
};

const API_GROUP_CATEGORIES = [

    { key: "all", label: "All Groups" },
    { key: "uae", label: "UAE" },
    { key: "ksa", label: "KSA" },
    { key: "muscat", label: "Muscat" },
    { key: "umrah", label: "Umrah" },
];

const SOURCE_LABELS: Record<string, string> = {
    admin: "Admin (Own Groups)",
    "al-haider": "Al-Haider",
    "travel-network": "Travel Network",
    skypass: "SkyPass",
    upsky: "UpSky",
    ALSABOOR: "Al Saboor",
    "amaar-shoaib": "Amaar Shoaib",
};

const MONTHS_TITLE = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// ─── SVG Icons ──────────────────────────────────────────────────────────────────

const PlaneSVG = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
        <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
);

const SuitcaseSVG = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
        <path d="M20 7h-3V6a3 3 0 0 0-3-3H10a3 3 0 0 0-3 3v1H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM9 6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9V6zm11 14H4V9h16v11z" />
    </svg>
);

const RefreshSVG = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="1em" height="1em">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const CopySVG = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012-2H15" />
    </svg>
);

const SearchSVG = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

// ─── Helper Functions ──────────────────────────────────────────────────────────

const extractIATA = (str: string): string => {
    if (!str) return "";
    const match = str.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : str.trim();
};

const trimTime = (time: string): string => {
    if (!time) return "";
    return time.substring(0, 5);
};

// ─── Build Copy Text for a Single Group ──────────────────────────────────────

const buildGroupCopyText = (group: ApiGroup): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const header = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;

    const lines: string[] = [];

    if (group.available_no_of_pax !== undefined && group.available_no_of_pax <= 0) {
        return "";
    }

    const price = Number(group.price || 0);

    if (Array.isArray(group.details) && group.details.length > 0) {
        group.details.forEach((d: any, index: number) => {
            const rawDate = d.dep_date || d.flight_date || group.dept_date;
            if (!rawDate) return;

            const date = new Date(rawDate);
            if (isNaN(date.getTime())) return;

            const depDay = new Date(date);
            depDay.setHours(0, 0, 0, 0);

            if (depDay < today) return;

            const dd = String(date.getDate()).padStart(2, "0");
            const mon = MONTHS_TITLE[date.getMonth()];
            const year = date.getFullYear();

            const flightNo = (d.flight_no || d.flightNo || "").toUpperCase();
            const origin = extractIATA(d.origin || d.from || "");
            const dest = extractIATA(d.destination || d.to || "");

            const depTime = trimTime(d.dept_time || d.dep_time || d.depTime || "");
            const arvTime = trimTime(d.arv_time || d.arr_time || d.arrTime || "");

            const depPart = depTime ? ` (${depTime})` : "";
            const arvPart = arvTime ? ` (${arvTime})` : "";

            const pricePart = index === 0 ? `..... *PKR ${price}*` : "";

            const line = `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}${pricePart}`;
            lines.push(line);
        });
    } else {
        const rawDate = group.dept_date;
        if (!rawDate) return "";

        const date = new Date(rawDate);
        if (isNaN(date.getTime())) return "";

        const depDay = new Date(date);
        depDay.setHours(0, 0, 0, 0);
        if (depDay < today) return "";

        const dd = String(date.getDate()).padStart(2, "0");
        const mon = MONTHS_TITLE[date.getMonth()];
        const year = date.getFullYear();

        const code = group.airline?.short_name || "";
        const sec = (group.sector || "").replace(/-/g, " ");

        const line = `${code} *${dd} ${mon} ${year}* ${sec}..... *PKR ${price}*`;
        lines.push(line);
    }

    const footer =
        `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*
=======================
Abid Air Travel & Tours
Mobile: +923197298467
Address: Office 36, 37 Jinnah Stadium, Gujranwala, Pakistan +92 55 30 255/56.
Website: https://abidairtravels.com/`;

    return [header, ...lines, "=======================", footer].join("\n");
};

// ─── Copy Button Component ──────────────────────────────────────────────────

const CopyButton = memo(({ group, className = "" }: { group: ApiGroup; className?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        const text = buildGroupCopyText(group);
        if (!text) {
            toast.warning("No valid flights to copy");
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success("Flight details copied!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed:", err);
            toast.error("Failed to copy");
        }
    }, [group]);

    return (
        <button
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-all ${copied
                ? "bg-green-500 text-white"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105"
                } ${className}`}
            title="Copy flight details"
        >

            <CopySVG className="w-4 h-4" />

        </button>
    );
});

// ─── MarginHideControl Component ──────────────────────────────────────────────

const MarginHideControl = memo(({
    scope,
    rowKey,
    label,
    compact = false,
    getDraft,
    isDirty,
    ruleKeyOf,
    savingKey,
    setDraft,
    saveRule,
}: {
    scope: Scope;
    rowKey: string;
    label: string;
    compact?: boolean;
    getDraft: (scope: Scope, key: string) => { isHidden: boolean; margin: number };
    isDirty: (scope: Scope, key: string) => boolean;
    ruleKeyOf: (scope: Scope, key: string) => string;
    savingKey: string | null;
    setDraft: (scope: Scope, key: string, patch: Partial<{ isHidden: boolean; margin: number }>) => void;
    saveRule: (scope: Scope, key: string, label?: string) => void;
}) => {
    const draft = getDraft(scope, rowKey);
    const dirty = isDirty(scope, rowKey);
    const dKey = ruleKeyOf(scope, rowKey);
    const isSaving = savingKey === dKey;

    const [localValue, setLocalValue] = useState<string>(draft.margin === 0 ? '' : String(draft.margin));

    useEffect(() => {
        setLocalValue(draft.margin === 0 ? '' : String(draft.margin));
    }, [draft.margin]);

    const handleMarginChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalValue(value);
        if (value === '') {
            setDraft(scope, rowKey, { margin: 0 });
            return;
        }
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            setDraft(scope, rowKey, { margin: numValue });
        }
    }, [scope, rowKey, setDraft]);

    const handleToggleHidden = useCallback(() => {
        setDraft(scope, rowKey, { isHidden: !draft.isHidden });
    }, [scope, rowKey, draft.isHidden, setDraft]);

    const handleSave = useCallback(() => {
        saveRule(scope, rowKey, label);
    }, [scope, rowKey, label, saveRule]);

    return (
        <div className={`flex items-center gap-2 ${compact ? "flex-wrap" : "flex-wrap"}`}>
            <button
                type="button"
                onClick={handleToggleHidden}
                title={draft.isHidden ? "Hidden — click to show" : "Visible — click to hide"}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition shrink-0 ${draft.isHidden ? "bg-gray-300" : "bg-green-500"}`}
            >
                <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${draft.isHidden ? "translate-x-1" : "translate-x-5"}`}
                />
            </button>
            <span className={`text-[11px] font-semibold ${draft.isHidden ? "text-gray-400" : "text-green-600"}`}>
                {draft.isHidden ? "Hidden" : "Visible"}
            </span>
            <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-400">PKR</span>
                <input
                    type="number"
                    value={localValue}
                    onChange={handleMarginChange}
                    onFocus={(e) => e.target.select()}
                    className="w-20 rounded-md border border-gray-300 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="0"
                />
            </div>
            <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || isSaving}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${dirty
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
            >
                {isSaving ? "..." : "Save"}
            </button>
        </div>
    );
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlightDetail {
    flight_no: string;
    flight_date?: string;
    dep_date?: string;
    dept_time: string;
    arv_date: string;
    arv_time: string;
    origin: string;
    destination: string;
    baggage?: string;
    meal?: string;
}

interface ApiAirline {
    airline_name: string;
    logo_url: string | null;
    short_name?: string;
}

interface ApiGroup {
    id: string | number;
    groupName?: string;
    airline: ApiAirline | null;
    sector: string;
    price: number;
    childPrice?: number;
    infantPrice?: number;
    type?: string;
    available_no_of_pax: number;
    dept_date: string;
    arv_date: string;
    pnr?: string;
    details: FlightDetail[];
    source?: string;
    isOwnGroup?: boolean;
}

interface GroupedEntry {
    airline: string;
    airlineCode: string | null;
    airlineLogo: string | null;
    sector: string;
    groups: ApiGroup[];
}

type Scope = "provider" | "sector" | "group";

interface Rule {
    _id?: string;
    scope: Scope;
    key: string;
    isHidden: boolean;
    margin: number;
    label?: string;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ApiGroups() {
    const { user } = useAuth();
    const canView = hasPermission(user, "api_groups");
    const [searchParams] = useSearchParams();
    const [groups, setGroups] = useState<ApiGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [streamingMore, setStreamingMore] = useState(false);

    // ── Filter states ──────────────────────────────────────────────────────
    const [selectedType, setSelectedType] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [dateFilter, setDateFilter] = useState<string>("");

    // ── Pricing rules state ──────────────────────────────────────────────────
    const [rules, setRules] = useState<Rule[]>([]);
    const [drafts, setDrafts] = useState<Record<string, { isHidden: boolean; margin: number }>>({});
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [showProviderPanel, setShowProviderPanel] = useState(true);

    const activeCategory = searchParams.get("category") || "all";
    const activeCategoryLabel =
        API_GROUP_CATEGORIES.find((item) => item.key === activeCategory)?.label || "All Groups";

    // ── Fetch groups ──────────────────────────────────────────────────────────

    const fetchGroups = async () => {
        try {
            setLoading(true);
            setStreamingMore(true);
            // Reset filters for the new fetch
            setSelectedType("all");
            setSearchQuery("");
            setDateFilter("");

            const token = localStorage.getItem("admin_token");
            const categoryQuery =
                activeCategory === "all" ? "" : `&category=${encodeURIComponent(activeCategory)}`;

            const response = await fetch(
                `${axiosInstance.defaults.baseURL}/sector/getUnifiedGroups?stream=true${categoryQuery}`,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                },
            );

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const accumulated: ApiGroup[] = [];
            let gotAnyChunk = false;

            await streamNdjson(response, (msg: any) => {
                if (msg.type === "chunk" && Array.isArray(msg.data)) {
                    accumulated.push(...(msg.data as ApiGroup[]));
                    gotAnyChunk = true;
                    setGroups([...accumulated]);
                    setLoading(false);
                } else if (msg.type === "error") {
                    console.error(`Unified groups source failed (${msg.source}):`, msg.message);
                }
            });

            if (!gotAnyChunk) {
                setGroups([]);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load API groups");
        } finally {
            setLoading(false);
            setStreamingMore(false);
        }
    };

    // ── Fetch existing pricing rules ─────────────────────────────────────────

    const fetchRules = async () => {
        try {
            const res = await axiosInstance.get("/pricing-rules/");
            if (res.data?.success) {
                setRules(res.data.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load pricing rules");
        }
    };

    useEffect(() => {
        if (canView) {
            fetchGroups();
            fetchRules();
        } else {
            setLoading(false);
        }
    }, [activeCategory, canView]);

    // ── Rule helpers ──────────────────────────────────────────────────────────

    const ruleKeyOf = useCallback((scope: Scope, key: string) => `${scope}:${key}`, []);

    const getRule = useCallback((scope: Scope, key: string): Rule | undefined =>
        rules.find((r) => r.scope === scope && r.key === key), [rules]);

    const getDraft = useCallback((scope: Scope, key: string) => {
        const dKey = ruleKeyOf(scope, key);
        if (drafts[dKey]) return drafts[dKey];
        const existing = getRule(scope, key);
        return { isHidden: existing?.isHidden || false, margin: existing?.margin || 0 };
    }, [drafts, getRule, ruleKeyOf]);

    const setDraft = useCallback((scope: Scope, key: string, patch: Partial<{ isHidden: boolean; margin: number }>) => {
        const dKey = ruleKeyOf(scope, key);
        setDrafts((prev) => {
            const current = prev[dKey] || getDraft(scope, key);
            return {
                ...prev,
                [dKey]: { ...current, ...patch },
            };
        });
    }, [getDraft, ruleKeyOf]);

    const isDirty = useCallback((scope: Scope, key: string) => {
        const dKey = ruleKeyOf(scope, key);
        if (!drafts[dKey]) return false;
        const existing = getRule(scope, key);
        const d = drafts[dKey];
        return d.isHidden !== (existing?.isHidden || false) || d.margin !== (existing?.margin || 0);
    }, [drafts, getRule, ruleKeyOf]);

    const saveRule = useCallback(async (scope: Scope, key: string, label?: string) => {
        const draft = getDraft(scope, key);
        const dKey = ruleKeyOf(scope, key);
        try {
            setSavingKey(dKey);
            const res = await axiosInstance.post("/pricing-rules", {
                scope,
                key,
                isHidden: draft.isHidden,
                margin: draft.margin,
                label,
            });
            if (res.data?.success) {
                toast.success(`Saved: ${label || key}`);
                setRules((prev) => {
                    const others = prev.filter((r) => !(r.scope === scope && r.key === key));
                    return [...others, res.data.data];
                });
                setDrafts((prev) => {
                    const copy = { ...prev };
                    delete copy[dKey];
                    return copy;
                });
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to save rule");
        } finally {
            setSavingKey(null);
        }
    }, [getDraft, ruleKeyOf]);

    // Effective (saved or pending-draft) margin/hidden for a scope+key
    const getEffective = useCallback((scope: Scope, key: string) => getDraft(scope, key), [getDraft]);

    // Total margin stacked across provider + sector + group for a given group row
    const getStackedMargin = useCallback((group: ApiGroup, sector: string) => {
        const providerKey = group.source || "admin";
        const groupKey = `${providerKey}:${group.id}`;
        const p = getEffective("provider", providerKey);
        const s = getEffective("sector", sector);
        const g = getEffective("group", groupKey);
        return {
            total: (p.margin || 0) + (s.margin || 0) + (g.margin || 0),
            hidden: p.isHidden || s.isHidden || g.isHidden,
        };
    }, [getEffective]);

    // ── Get unique types from data ──────────────────────────────────────────
    const availableTypes = useMemo(() => {
        const typeSet = new Set<string>();
        groups.forEach(g => {
            if (g.type) {
                typeSet.add(g.type);
            }
        });
        return Array.from(typeSet).sort();
    }, [groups]);

    // ── Filtered groups based on type, search, and date ────────────────────
    const filteredGroups = useMemo(() => {
        let result = groups;

        // Filter by type
        if (selectedType !== "all") {
            result = result.filter(g => g.type === selectedType);
        }

        // Filter by search query (sector)
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            result = result.filter(g =>
                g.sector?.toLowerCase().includes(query) ||
                g.airline?.airline_name?.toLowerCase().includes(query) ||
                g.airline?.short_name?.toLowerCase().includes(query) ||
                g.pnr?.toLowerCase().includes(query)
            );
        }

        // Filter by date
        if (dateFilter) {
            result = result.filter(g => {
                const date = g.dept_date || g.details?.[0]?.dep_date || g.details?.[0]?.flight_date;
                if (!date) return false;
                return date.startsWith(dateFilter);
            });
        }

        return result;
    }, [groups, selectedType, searchQuery, dateFilter]);

    // ── Group by airline × sector × provider ────────────────────────────────
    // Providers stay in their own card even when the sector/airline is
    // identical — merging them made a card's single source badge lie about
    // whichever provider wasn't first in the array.

    const groupedData = useMemo(() => {
        return filteredGroups.reduce<Record<string, GroupedEntry>>((acc, group) => {
            const airlineName = group.airline?.airline_name || "Unknown";
            const airlineCode = group.airline?.short_name || null;
            const airlineLogo = group.airline?.logo_url || null;
            const sector = (group.sector || "Unknown").toUpperCase().trim();
            const source = group.source || "admin";
            const key = `${airlineName}||${sector}||${source}`;
            if (!acc[key]) {
                acc[key] = {
                    airline: airlineName,
                    airlineCode: airlineCode,
                    airlineLogo: airlineLogo,
                    sector,
                    groups: [],
                };
            }
            acc[key].groups.push(group);
            return acc;
        }, {});
    }, [filteredGroups]);

    const groupedEntries = useMemo(() => Object.entries(groupedData), [groupedData]);

    // Distinct providers
    const distinctProviders = useMemo(() => {
        const set = new Set<string>();
        filteredGroups.forEach((g) => set.add(g.source || "admin"));
        return Array.from(set);
    }, [filteredGroups]);

    // ── Helper to get airline logo URL ──────────────────────────────────────

    const getAirlineLogoUrl = useCallback((entry: GroupedEntry) => {
        // console.log(entry)
        if (entry.airline.toLowerCase().includes("flyadeal")) {
            return "https://mcttravels.com/storage/airlines/1761067815.png";
        }
        if (entry.airline.toLowerCase().includes("saudi")) {
            return "https://mcttravels.com/storage/airlines/1696999724.jpeg";
        }
        if (entry.airline.toLowerCase().includes("air sial")) {
            return "https://api.skypass.pk/uploads/airline_images/1702383533.png";
        }
        if (entry.airline.toLowerCase().includes("salam")) {
            return "https://alhaidertravel.pk/storage/airlines/1721135342.png";
        }
        if (entry.airline.toLowerCase().includes("fly jinnah")) {
            return "https://api.skypass.pk/uploads/airline_images/1702383592.png";
        }
        if (entry.airlineLogo) {
            return entry.airlineLogo;
        }
        if (entry.airlineCode) {
            return `https://img.wway.io/pics/root/${entry.airlineCode}@png?exar=1&rs=fit:80:40`;
        }
        return null;
    }, []);

    // ── Helper to get source label and color ────────────────────────────────
    const getSourceInfo = useCallback((source?: string) => {
        switch (source) {
            case "admin":
                return { label: "ADMIN", color: "bg-purple-100 text-purple-700 border-purple-200" };
            case "al-haider":
                return { label: "AL-HAIDER", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
            case "travel-network":
                return { label: "TRAVEL NETWORK", color: "bg-amber-100 text-amber-700 border-amber-200" };
            case "upsky":
                return { label: "UpSky", color: "bg-amber-100 text-amber-700 border-amber-200" };
            case "mct":
                return { label: "MCT", color: "bg-sky-100 text-sky-700 border-sky-200" };
            case "ALSABOOR":
                return { label: "Al Saboor", color: "bg-purple-100 text-purple-700 border-purple-200" };
            case "amaar-shoaib":
                return { label: "Amaar Shoaib", color: "bg-rose-100 text-rose-700 border-rose-200" };
            default:
                return { label: "EXTERNAL", color: "bg-gray-100 text-gray-700 border-gray-200" };
        }
    }, []);

    // ── Helper to get flight date ────────────────────────────────────────────

    const getFlightDate = useCallback((flight: FlightDetail) => {
        return flight.flight_date || flight.dep_date || "";
    }, []);

    // ── Render helpers ────────────────────────────────────────────────────────

    const LoadingSkeleton = useMemo(() => (
        <div className="space-y-6 p-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                    <div className="h-12 rounded-2xl bg-gray-200 mb-4 w-full" />
                    {[1, 2].map((j) => (
                        <div key={j} className="h-24 bg-gray-100 rounded-2xl mb-3" />
                    ))}
                </div>
            ))}
        </div>
    ), []);

    if (!canView) {
        return (
            <>
                <PageMeta title="API Groups - Access denied" description="Access denied" />
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
                    You do not have permission to view API Groups.
                </div>
            </>
        );
    }

    return (
        <>
            <PageMeta
                title={`${activeCategoryLabel} API Groups | Admin`}
                description="View unified API groups"
            />

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 min-h-screen">
                {/* ─── Page header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                            {activeCategoryLabel} API Groups
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Showing {groupedEntries.length} group{groupedEntries.length !== 1 ? 's' : ''}
                            {selectedType !== "all" && ` (${selectedType})`}
                            {searchQuery && ` - filtered by "${searchQuery}"`}
                        </p>
                    </div>

                    <button
                        onClick={() => { fetchGroups(); fetchRules(); }}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition disabled:opacity-50"
                    >
                        <RefreshSVG className={`text-base ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {/* ─── Dynamic Type Filters & Search Bar ────────────────────── */}
                <div className="mb-6 space-y-4">
                    {/* Type Filters */}
                    {availableTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-sm font-semibold text-gray-600 mr-2">Type:</span>
                            <button
                                onClick={() => setSelectedType("all")}
                                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${selectedType === "all"
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600"
                                    }`}
                            >
                                All
                            </button>
                            {availableTypes.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${selectedType === type
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600"
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                            {selectedType !== "all" && (
                                <button
                                    onClick={() => setSelectedType("all")}
                                    className="text-xs text-red-500 hover:text-red-700 ml-1"
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                    )}

                    {/* Search & Date Filter */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-50 max-w-sm">
                            <SearchSVG className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search by sector, airline, PNR..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Departure:</label>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            />
                            {dateFilter && (
                                <button
                                    onClick={() => setDateFilter("")}
                                    className="text-xs text-red-500 hover:text-red-700"
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active filters summary */}
                    {(selectedType !== "all" || searchQuery || dateFilter) && (
                        <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500">
                            <span className="font-medium">Active filters:</span>
                            {selectedType !== "all" && (
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                    Type: {selectedType}
                                </span>
                            )}
                            {searchQuery && (
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                    Search: {searchQuery}
                                </span>
                            )}
                            {dateFilter && (
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                    Date: {new Date(dateFilter).toLocaleDateString()}
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    setSelectedType("all");
                                    setSearchQuery("");
                                    setDateFilter("");
                                }}
                                className="text-red-500 hover:text-red-700 font-medium"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>

                {/* ─── Provider-wise margin/hide panel ────────────────────────── */}
                <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/40">
                    <button
                        onClick={() => setShowProviderPanel((p) => !p)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-blue-800"
                    >
                        <span>Provider-wise Margin & Visibility</span>
                        <span className="text-xs text-blue-500">{showProviderPanel ? "Hide ▲" : "Show ▼"}</span>
                    </button>
                    {showProviderPanel && (
                        <div className="px-4 pb-4 space-y-2">
                            {distinctProviders.length === 0 ? (
                                <div className="text-xs text-gray-400 py-2">No providers loaded yet.</div>
                            ) : (
                                distinctProviders.map((source) => {
                                    const label = SOURCE_LABELS[source] || source.toUpperCase();
                                    return (
                                        <div
                                            key={source}
                                            className="flex items-center justify-between gap-3 flex-wrap bg-white rounded-xl border border-gray-200 px-3 py-2"
                                        >
                                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getSourceInfo(source).color}`}>
                                                {label}
                                            </span>
                                            <MarginHideControl scope="provider" rowKey={source} label={label} getDraft={getDraft} isDirty={isDirty} ruleKeyOf={ruleKeyOf} savingKey={savingKey} setDraft={setDraft} saveRule={saveRule} />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* ─── Category Filters ────────────────────────────────────────── */}
                {/* <div className="mb-6 flex flex-wrap gap-3">
                    {API_GROUP_CATEGORIES.map((category) => {
                        const target = category.key === "all"
                            ? "/api-groups"
                            : `/api-groups?category=${encodeURIComponent(category.key)}`;

                        return (
                            <Link
                                key={category.key}
                                to={target}
                                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${activeCategory === category.key
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                                    }`}
                            >
                                {category.label}
                            </Link>
                        );
                    })}
                </div> */}

                {/* ─── Content ─────────────────────────────────────────────────── */}
                {!loading && streamingMore && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 pb-3">
                        <RefreshSVG className="text-sm animate-spin" />
                        Loading more groups...
                    </div>
                )}
                {loading ? (
                    LoadingSkeleton
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        {groups.length === 0
                            ? `No ${activeCategoryLabel.toLowerCase()} groups available`
                            : "No groups match your filters"}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groupedEntries.map(([key, data]) => {
                            const logoUrl = getAirlineLogoUrl(data);
                            const sectorDraft = getDraft("sector", data.sector);

                            return (
                                <div
                                    key={key}
                                    className={`rounded-2xl overflow-hidden border border-neutral-200 ${sectorDraft.isHidden ? "opacity-60" : ""}`}
                                >
                                    {/* ── Airline / Sector header ─────────────────────── */}
                                    <div className="flex items-center justify-between gap-6 py-2.5 px-4 bg-linear-to-r from-blue-50 via-white to-blue-50 border-b border-neutral-200 flex-wrap">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <div className="flex items-center justify-center min-w-16">
                                                {logoUrl ? (
                                                    <img
                                                        src={logoUrl}
                                                        alt={data.airlineCode || data.airline}
                                                        className="h-20 w-20 object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://alhaidertravel.pk/storage/airlines/1721135342.png';
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-sm text-gray-700">
                                                        {data.airline}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <PlaneSVG className="text-blue-500 text-lg" />
                                                <span className="font-bold text-lg tracking-widest uppercase text-gray-800">
                                                    {formatSectorToIATA(data.sector)}
                                                </span>
                                            </div>

                                            {/* Sector-wise margin/hide control */}
                                            <MarginHideControl scope="sector" rowKey={data.sector} label={data.sector} compact getDraft={getDraft} isDirty={isDirty} ruleKeyOf={ruleKeyOf} savingKey={savingKey} setDraft={setDraft} saveRule={saveRule} />
                                        </div>

                                        {/* Dynamic source badge */}
                                        {data.groups[0] && (
                                            <span className={`text-[10px] font-semibold px-3 py-1 rounded-full border tracking-wide ${getSourceInfo(data.groups[0].source).color}`}>
                                                {getSourceInfo(data.groups[0].source).label}
                                            </span>
                                        )}
                                    </div>

                                    {/* ── Flight Table ─────────────────────────────── */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="text-white text-xs font-bold" style={{ background: "linear-gradient(90deg, #21397C 0%, #2CA3B4 100%)" }}>
                                                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                                                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Flight</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Sector</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Bag</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Meal</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Base Price</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap">Margin & Visibility</th>
                                                    <th className="px-4 py-2.5 text-center whitespace-nowrap w-16">Copy</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.groups
                                                    .sort((a, b) => {
                                                        const da = a.dept_date || a.details?.[0]?.dep_date || a.details?.[0]?.flight_date || "";
                                                        const db = b.dept_date || b.details?.[0]?.dep_date || b.details?.[0]?.flight_date || "";
                                                        return da.localeCompare(db);
                                                    })
                                                    .map((group) => {
                                                        const id = String(group.id);
                                                        const providerKey = group.source || "admin";
                                                        const groupKey = `${providerKey}:${id}`;
                                                        const { total: stackedMargin, hidden: stackedHidden } = getStackedMargin(group, data.sector);
                                                        const finalPrice = group.price + stackedMargin;

                                                        return (
                                                            <tr
                                                                key={groupKey}
                                                                className={`border-b border-gray-100 bg-white hover:bg-blue-50/40 transition-colors ${stackedHidden ? "opacity-50" : ""}`}
                                                            >
                                                                {/* Date */}
                                                                <td className="px-4 py-3 text-xs font-medium text-gray-600 whitespace-nowrap">
                                                                    <div className="flex flex-col gap-3">
                                                                        {group.details.map((leg, idx) => {
                                                                            const d = getFlightDate(leg);
                                                                            return (
                                                                                <div key={idx}>
                                                                                    {d
                                                                                        ? new Date(d).toLocaleDateString("en-GB", {
                                                                                            day: "2-digit",
                                                                                            month: "short",
                                                                                            year: "numeric",
                                                                                        })
                                                                                        : "—"}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>

                                                                {/* Flight */}
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-col gap-3">
                                                                        {group.details.map((leg, idx) => (
                                                                            <div key={idx} className="flex items-center gap-1.5">
                                                                                <PlaneSVG className="text-xs text-blue-500 shrink-0" />
                                                                                <span className="font-semibold text-sm whitespace-nowrap">
                                                                                    {leg.flight_no || "—"}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </td>

                                                                {/* Sector - Enhanced with IATA codes from cities.json */}
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-col gap-3">
                                                                        {group.details && group.details.length > 0 ? (
                                                                            // If we have details array, use those with IATA from data
                                                                            group.details.map((leg, idx) => {
                                                                                const rawOrigin = (leg.origin || "").trim();
                                                                                const rawDest = (leg.destination || "").trim();
                                                                                const originIATA = resolveCityToIATA(rawOrigin) || extractIATA(rawOrigin) || rawOrigin;
                                                                                const destIATA = resolveCityToIATA(rawDest) || extractIATA(rawDest) || rawDest;
                                                                                return (
                                                                                    <div key={idx} className="flex items-center justify-center gap-3">
                                                                                        <div className="text-center">
                                                                                            <div className="text-sm font-bold">{originIATA}</div>
                                                                                            <div className="text-xs text-gray-500 font-medium">
                                                                                                {leg.dept_time?.substring(0, 5) || "—"}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center relative min-w-10 w-16">
                                                                                            <div className="h-0.5 w-full bg-linear-to-r from-blue-400 to-blue-600" />
                                                                                            <div className="absolute left-1/2 -translate-x-1/2 bg-white px-0.5">
                                                                                                <PlaneSVG className="text-xs text-blue-500" />
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="text-center">
                                                                                            <div className="text-sm font-bold">{destIATA}</div>
                                                                                            <div className="text-xs text-gray-500 font-medium">
                                                                                                {leg.arv_time?.substring(0, 5) || "—"}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            // If no details, parse sector string into multiple flights
                                                                            <div className="flex flex-col gap-3">
                                                                                {parseSectorIntoFlights(group.sector || "").map((flight, idx) => (
                                                                                    <div key={idx} className="flex items-center justify-center gap-3">
                                                                                        <div className="text-center">
                                                                                            <div className="text-sm font-bold">{flight.originIATA}</div>
                                                                                            <div className="text-xs text-gray-500 font-medium">—</div>
                                                                                        </div>
                                                                                        <div className="flex items-center relative min-w-10 w-16">
                                                                                            <div className="h-0.5 w-full bg-linear-to-r from-blue-400 to-blue-600" />
                                                                                            <div className="absolute left-1/2 -translate-x-1/2 bg-white px-0.5">
                                                                                                <PlaneSVG className="text-xs text-blue-500" />
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="text-center">
                                                                                            <div className="text-sm font-bold">{flight.destIATA}</div>
                                                                                            <div className="text-xs text-gray-500 font-medium">—</div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* Baggage */}
                                                                <td className="px-4 py-3 text-center">
                                                                    <div className="flex flex-col gap-3 items-center">
                                                                        {group.details.map((leg, idx) =>
                                                                            leg.baggage ? (
                                                                                <div key={idx} className="inline-flex items-center gap-1 text-xs font-medium">
                                                                                    <SuitcaseSVG className="text-xs text-blue-500 shrink-0" />
                                                                                    <span>{leg.baggage}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <span key={idx} className="text-gray-400 text-xs">—</span>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* Meal */}
                                                                <td className="px-4 py-3 text-center">
                                                                    <div className="flex flex-col gap-3 items-center">
                                                                        {group.details.map((leg, idx) => (
                                                                            <span
                                                                                key={idx}
                                                                                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${leg.meal && leg.meal !== "No"
                                                                                    ? "bg-green-100 text-green-700"
                                                                                    : "bg-gray-100 text-gray-500"
                                                                                    }`}
                                                                            >
                                                                                {leg.meal && leg.meal !== "No" ? "Yes" : "No"}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>

                                                                {/* Base Price */}
                                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                                    <div className="text-sm font-bold text-blue-600">
                                                                        PKR {group.price.toLocaleString()}
                                                                    </div>
                                                                    {stackedMargin !== 0 && (
                                                                        <div className="text-[11px] text-green-600 font-semibold mt-0.5">
                                                                            → PKR {finalPrice.toLocaleString()}
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                {/* Margin & Visibility */}
                                                                <td className="px-4 py-3 flex justify-center">
                                                                    <MarginHideControl
                                                                        scope="group"
                                                                        rowKey={groupKey}
                                                                        label={`${data.sector} - ${group.pnr || id}`}
                                                                        compact
                                                                        getDraft={getDraft}
                                                                        isDirty={isDirty}
                                                                        ruleKeyOf={ruleKeyOf}
                                                                        savingKey={savingKey}
                                                                        setDraft={setDraft}
                                                                        saveRule={saveRule}
                                                                    />
                                                                </td>

                                                                {/* ─── Copy Button ─────────────────────────────────── */}
                                                                <td className="px-4 py-3 text-center">
                                                                    <CopyButton group={group} />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}