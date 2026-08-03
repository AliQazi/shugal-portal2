import React, { useState, useEffect } from 'react';
import axiosInstance from '../../Api/axios';
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";

interface Sector {
    _id: string;
    groupType: string;
    sectorTitle: string;
    fullSector: string;
    order: number;
    createdAt: string;
}

export default function ManageSectors() {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

    const updateSectorOrder = async (reorderedSectors: Sector[]) => {
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
            // Revert to original order on error
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

        if (draggedIndex === null || draggedIndex === dropIndex) {
            return;
        }

        const newSectors = [...sectors];
        const draggedSector = newSectors[draggedIndex];

        // Remove from old position
        newSectors.splice(draggedIndex, 1);

        // Insert at new position
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
        fetchSectors();
    }, []);

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
                    {updateLoading && (
                        <span className="text-sm text-primary">Updating order...</span>
                    )}
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
                                        <th className="min-w-12.5 px-4 py-4 font-medium text-black dark:text-white">
                                            Sr #
                                        </th>
                                        <th className="min-w-37.5 px-4 py-4 font-medium text-black dark:text-white">
                                            Group Type
                                        </th>
                                        <th className="min-w-30 px-4 py-4 font-medium text-black dark:text-white">
                                            Sector Code
                                        </th>
                                        <th className="px-4 py-4 font-medium text-black dark:text-white">
                                            Full Sector Name
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sectors.length > 0 ? (
                                        sectors.map((sector, index) => (
                                            <tr
                                                key={sector._id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, index)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, index)}
                                                onDragEnter={(e) => handleDragEnter(e, index)}
                                                onDragLeave={handleDragLeave}
                                                className="border-b border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4 cursor-move transition-all"
                                                style={{
                                                    transition: 'background-color 0.2s, border 0.2s',
                                                }}
                                            >
                                                <td className="px-4 py-4 text-gray-400">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                                    </svg>
                                                </td>
                                                <td className="px-4 py-4 text-black dark:text-white">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-4 text-black dark:text-white">
                                                    <span className="inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium bg-primary text-primary">
                                                        {sector.groupType}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-black dark:text-white font-bold">
                                                    {sector.sectorTitle}
                                                </td>
                                                <td className="px-4 py-4 text-black dark:text-white">
                                                    {sector.fullSector}
                                                </td>
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