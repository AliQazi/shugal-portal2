import React, { useState, useEffect } from 'react';
import axiosInstance from '../../Api/axios';
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";

interface Sector {
    _id: string;
    groupType: string;
    sectorTitle: string;
    fullSector: string;
    order: number;
    createdAt: string;
}

interface UnifiedGroup {
    id: string;
    source: string;
    sector: string;
    type: string;
    available_no_of_pax: number;
    price: number;
    dept_date: string;
    airline: {
        airline_name: string;
        short_name: string;
        logo_url: string | null;
    };
    pnr: string;
}

const MONTHS_TITLE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function trimTime(t: string): string {
    if (!t) return "";
    return t.slice(0, 5);
}

function extractIATA(terminal: string): string {
    if (!terminal) return "";
    const match = terminal.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : terminal.trim();
}

// function buildCopyText(groups: UnifiedGroup[]): string {
//     if (!groups.length) return "";

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const header = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;

//     // ── Step A: Build sector-grouped map (preserving API sector order) ──
//     const sectorMap = new Map<string, { group: any; date: Date; price: number; line: string }[]>();
//     const sectorOrder: string[] = [];

//     groups.forEach((g: any) => {
//         if (g.available_no_of_pax !== undefined && g.available_no_of_pax <= 0) return;

//         const sector = g.sector || "UNKNOWN";
//         const price = g.price || 0;

//         if (!sectorMap.has(sector)) {
//             sectorMap.set(sector, []);
//             sectorOrder.push(sector);
//         }

//         if (g.details && g.details.length > 0) {
//             const d = g.details[0];
//             const rawDate = d.dep_date || d.flight_date || g.dept_date;
//             if (!rawDate) return;

//             const date = new Date(rawDate);
//             if (isNaN(date.getTime())) return;

//             const depDay = new Date(date);
//             depDay.setHours(0, 0, 0, 0);
//             if (depDay < today) return;

//             const dd = String(date.getDate()).padStart(2, "0");
//             const mon = MONTHS_TITLE[date.getMonth()];
//             const year = date.getFullYear();
//             const flightNo = (d.flight_no || d.flightNo || "").toUpperCase();
//             const origin = extractIATA(d.origin || d.from || "");
//             const dest = extractIATA(d.destination || d.to || "");
//             const depTime = trimTime(d.dept_time || d.dep_time || d.depTime || "");
//             const arvTime = trimTime(d.arv_time || d.arr_time || d.arrTime || "");
//             const depPart = depTime ? ` (${depTime})` : "";
//             const arvPart = arvTime ? ` (${arvTime})` : "";

//             const line = `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}..... *PKR ${price}*`;

//             sectorMap.get(sector)!.push({ group: g, date, price, line });

//         } else {
//             // Fallback: no details
//             const rawDate = g.dept_date;
//             if (!rawDate) return;

//             const date = new Date(rawDate);
//             if (isNaN(date.getTime())) return;

//             const depDay = new Date(date);
//             depDay.setHours(0, 0, 0, 0);
//             if (depDay < today) return;

//             const dd = String(date.getDate()).padStart(2, "0");
//             const mon = MONTHS_TITLE[date.getMonth()];
//             const year = date.getFullYear();
//             const code = g.airline?.short_name || "";
//             const sec = (g.sector || "").replace("-", " ");

//             const line = `${code} *${dd} ${mon} ${year}* ${sec}..... *PKR ${price}*`;

//             sectorMap.get(sector)!.push({ group: g, date, price, line });
//         }
//     });

//     // ── Step B: Sort each sector's entries by date → then price ──
//     sectorMap.forEach((entries) => {
//         entries.sort((a, b) => {
//             const timeDiff = a.date.getTime() - b.date.getTime();
//             if (timeDiff !== 0) return timeDiff;   // earlier date first
//             return a.price - b.price;              // same date → cheaper first
//         });
//     });

//     // ── Step C: Build final output in sector order ──
//     const lines: string[] = [];
//     sectorOrder.forEach((sector) => {
//         const entries = sectorMap.get(sector)!;
//         entries.forEach((e) => lines.push(e.line));
//     });

//     const footer =
//         `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*
// =======================
// Abid Air Travel & Tours
// Mobile: +923197298467
// Address: Office 36, 37 Jinnah Stadium, Gujranwala, Pakistan +92 55 30 255/56.New Civil lines Faisalabad.
// Website: https://abidairtravels.com/`;

//     return [header, ...lines, "=======================", footer].join("\n");
// }

function buildCopyText(groups: UnifiedGroup[]): string {
    if (!groups.length) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const header = `                *=====${String(today.getDate()).padStart(2, "0")} ${MONTHS_TITLE[today.getMonth()].toUpperCase()} UPDATES=====*`;

    type SectorEntry = {
        group: any;
        date: Date;
        price: number;
        lines: string[];
    };

    // ── Step A: Build sector-grouped map preserving API sector order ──
    const sectorMap = new Map<string, SectorEntry[]>();
    const sectorOrder: string[] = [];

    groups.forEach((g: any) => {
        if (g.available_no_of_pax !== undefined && g.available_no_of_pax <= 0) return;

        const sector = g.sector || "UNKNOWN";
        const price = Number(g.price || 0);

        if (!sectorMap.has(sector)) {
            sectorMap.set(sector, []);
            sectorOrder.push(sector);
        }

        const flightLines: string[] = [];
        let sortingDate: Date | null = null;

        // ✅ If group has multiple legs, copy every leg
        if (Array.isArray(g.details) && g.details.length > 0) {
            g.details.forEach((d: any, index: number) => {
                const rawDate = d.dep_date || d.flight_date || g.dept_date;
                if (!rawDate) return;

                const date = new Date(rawDate);
                if (isNaN(date.getTime())) return;

                const depDay = new Date(date);
                depDay.setHours(0, 0, 0, 0);

                // Skip past legs
                if (depDay < today) return;

                // Use first valid leg date for sorting the whole group
                if (!sortingDate) {
                    sortingDate = date;
                }

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

                // ✅ Price only on first copied leg
                const pricePart = index === 0 ? `..... *PKR ${price}*` : "";

                const line = `${flightNo} *${dd} ${mon} ${year}* ${origin}${depPart} ${dest}${arvPart}${pricePart}`;

                flightLines.push(line);
            });

            if (flightLines.length > 0 && sortingDate) {
                sectorMap.get(sector)!.push({
                    group: g,
                    date: sortingDate,
                    price,
                    lines: flightLines,
                });
            }

        } else {
            // ✅ Fallback if no details array exists
            const rawDate = g.dept_date;
            if (!rawDate) return;

            const date = new Date(rawDate);
            if (isNaN(date.getTime())) return;

            const depDay = new Date(date);
            depDay.setHours(0, 0, 0, 0);
            if (depDay < today) return;

            const dd = String(date.getDate()).padStart(2, "0");
            const mon = MONTHS_TITLE[date.getMonth()];
            const year = date.getFullYear();

            const code = g.airline?.short_name || "";
            const sec = (g.sector || "").replace(/-/g, " ");

            const line = `${code} *${dd} ${mon} ${year}* ${sec}..... *PKR ${price}*`;

            sectorMap.get(sector)!.push({
                group: g,
                date,
                price,
                lines: [line],
            });
        }
    });

    // ── Step B: Sort each sector by first leg date, then price ──
    sectorMap.forEach((entries) => {
        entries.sort((a, b) => {
            const timeDiff = a.date.getTime() - b.date.getTime();
            if (timeDiff !== 0) return timeDiff;
            return a.price - b.price;
        });
    });

    // ── Step C: Build final output ──
    const lines: string[] = [];

    sectorOrder.forEach((sector) => {
        const entries = sectorMap.get(sector)!;

        entries.forEach((entry) => {
            entry.lines.forEach((line) => {
                lines.push(line);
            });
        });
    });

    const footer =
        `*ALL GROUPS ARE NON REFUNDABLE AND NON CHANGEABLE*
=======================
Abid Air Travel & Tours
Mobile: +923197298467
Address: Office 36, 37 Jinnah Stadium, Gujranwala, Pakistan +92 55 30 255/56.
Website: https://abidairtravels.com/`;

    return [header, ...lines, "=======================", footer].join("\n");
}

export default function ManageSectors() {
    const { user } = useAuth();
    const canView = hasPermission(user, "view_sectors");
    const canSort = hasPermission(user, "manage_sectors_sorting");
    const canCopy = hasPermission(user, "dashboard_copy_sector_data");
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [unifiedGroups, setUnifiedGroups] = useState<UnifiedGroup[]>([]);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchUnifiedGroups = async () => {
        try {
            const response = await axiosInstance.get("/sector/getUnifiedGroups");
            if (response.data.success && Array.isArray(response.data.data)) {
                setUnifiedGroups(response.data.data);
                console.log("✅ Unified groups set successfully:", response.data.data.length);
            } else {
                console.warn("Data format matches but array not found or success is false");
            }
        } catch (error: any) {
            console.error("Error fetching unified groups:", error);
        }
    };

    const fetchSectors = async () => {
        try {
            setFetchLoading(true);
            const response = await axiosInstance.get("/sector");
            if (response.data.success) {
                const sortedSectors = response.data.data.sort((a: Sector, b: Sector) =>
                    (a.order ?? 0) - (b.order ?? 0)
                );
                setSectors(sortedSectors);
            }
        } catch (error: any) {
            console.error("Error fetching sectors:", error);
        } finally {
            setFetchLoading(false);
        }
    };

    const handleCopyData = async () => {
        if (!canCopy) return;

        const text = buildCopyText(unifiedGroups);
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const updateSectorOrder = async (reorderedSectors: Sector[]) => {
        if (!canSort) {
            fetchSectors();
            return;
        }

        try {
            setUpdateLoading(true);
            const sectorsWithOrder = reorderedSectors.map((sector, index) => ({
                _id: sector._id,
                order: index,
            }));
            const response = await axiosInstance.post("/sector/updateSectorOrder", {
                sectors: sectorsWithOrder,
            });
            if (response.data.success) {
                const sortedSectors = response.data.data.sort((a: Sector, b: Sector) =>
                    (a.order ?? 0) - (b.order ?? 0)
                );
                setSectors(sortedSectors);
            }
        } catch (error: any) {
            console.error("Error updating sector order:", error);
            fetchSectors();
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.currentTarget.style.opacity = '1';
        setDraggedIndex(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
        e.preventDefault();
        if (!canSort) return;
        if (draggedIndex === null || draggedIndex === dropIndex) return;
        const newSectors = [...sectors];
        const draggedSector = newSectors[draggedIndex];
        newSectors.splice(draggedIndex, 1);
        newSectors.splice(dropIndex, 0, draggedSector);
        setSectors(newSectors);
        updateSectorOrder(newSectors);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        if (draggedIndex !== null && draggedIndex !== index) {
            e.currentTarget.style.borderTop = '2px solid #3b82f6';
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
        e.currentTarget.style.borderTop = '';
    };

    useEffect(() => {
        if (canView) {
            fetchSectors();
        }
        if (canCopy) {
            fetchUnifiedGroups();
        }
    }, [canView, canCopy]);

    if (!canView) {
        return (
            <>
                <PageMeta title="All Sectors - Access denied" description="Access denied" />
                <PageBreadCrumb pageTitle="All Sectors" />
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
                    You do not have permission to view Sectors.
                </div>
            </>
        );
    }

    return (
        <>
            <PageMeta title="All Sectors - Abid Air Travel & Tours" description="View all sectors list" />

            <div className="mb-6">
                <PageBreadCrumb pageTitle="All Sectors" />
            </div>

            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-6 py-4 dark:border-strokedark flex justify-between items-center">
                    <h3 className="font-medium text-black dark:text-white">
                        Sectors List ({sectors.length})
                    </h3>

                    <div className="flex items-center gap-3">
                        {updateLoading && (
                            <span className="text-sm text-primary">Updating order...</span>
                        )}

                        <button
                            onClick={handleCopyData}
                            disabled={unifiedGroups.length === 0 || !canCopy}
                            title={!canCopy ? "You don't have permission to copy sector data" : unifiedGroups.length === 0 ? "No data available to copy" : "Copy flight data"}
                            style={{
                                backgroundColor: unifiedGroups.length === 0 || !canCopy ? '#d1d5db' : copied ? '#22c55e' : '#3b82f6',
                                color: 'white',
                                opacity: unifiedGroups.length === 0 || !canCopy ? 0.5 : 1
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                            {copied ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy Data ({unifiedGroups.length})
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {fetchLoading ? (
                        <div className="text-center py-8">
                            <p className="text-black dark:text-white">Loading sectors...</p>
                        </div>
                    ) : (
                        <div className="max-w-full overflow-x-auto">
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-meta-4 rounded-lg">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    💡 <strong>Tip:</strong> Drag and drop rows to reorder sectors
                                </p>
                            </div>

                            <table className="w-full table-auto">
                                <thead>
                                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                        <th className="min-w-12.5 px-4 py-4 font-medium text-black dark:text-white">
                                            <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                            </svg>
                                        </th>
                                        <th className="min-w-12.5 px-4 py-4 font-medium text-black dark:text-white">Sr #</th>
                                        <th className="min-w-37.5 px-4 py-4 font-medium text-black dark:text-white">Group Type</th>
                                        <th className="min-w-30 px-4 py-4 font-medium text-black dark:text-white">Sector Code</th>
                                        <th className="px-4 py-4 font-medium text-black dark:text-white">Full Sector Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sectors.length > 0 ? (
                                        sectors.map((sector, index) => (
                                            <tr
                                                key={sector._id}
                                                draggable={canSort}
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, index)}
                                                onDragEnter={(e) => handleDragEnter(e, index)}
                                                onDragLeave={handleDragLeave}
                                                className={`border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 transition-all ${canSort ? "cursor-move" : "cursor-not-allowed opacity-75"}`}
                                                style={{ transition: 'background-color 0.2s, border 0.2s' }}
                                            >
                                                <td className="px-4 py-4 text-gray-400">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                                    </svg>
                                                </td>
                                                <td className="px-4 py-4 text-black dark:text-white">{index + 1}</td>
                                                <td className="px-4 py-4 text-black dark:text-white">
                                                    <span className="inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium bg-primary text-primary">
                                                        {sector.groupType}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-black dark:text-white font-bold">{sector.sectorTitle}</td>
                                                <td className="px-4 py-4 text-black dark:text-white">{sector.fullSector}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="text-center py-10 text-gray-500">
                                                No sectors found in the database.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
