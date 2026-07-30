import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';

interface Offer {
    _id: string;
    title: string;
    image: string;
}

export default function SpecialOffer() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get("/specialOffer/getSpecialOffers");
            if (response.data.success) {
                setOffers(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch offers", error);
        } finally {
            setLoading(false);
        }
    };

    // --- CONDITION: Agar loading khatam ho jaye aur offers khali hon to component render mat karo ---
    if (!loading && offers.length === 0) {
        return null;
    }

    // Handle smooth closing logic
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setPreviewImage(null);
            setIsClosing(false);
        }, 200);
    };

    return (
        <div className="bg-[#FDFCF8] py-16 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Heading Section */}
                <div className='relative w-fit mt-4 mb-12 text-center mx-auto'>
                    <h2 className='relative text-[#2A166D] text-3xl sm:text-4xl z-1 text-center font-bold'>Special Offers</h2>
                    <div className='absolute bottom-1 left-0 w-full h-[35%] bg-[#d6d30b]/50 rounded-md z-0'></div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        // Skeleton Loaders
                        [1, 2, 3].map((n) => (
                            <div key={n} className="bg-white border border-gray-100 p-2 animate-pulse">
                                <div className="aspect-[4/3] bg-gray-200" />
                                <div className="h-12 mt-2 bg-gray-100" />
                            </div>
                        ))
                    ) : (
                        offers.map((offer) => (
                            <div key={offer._id} className="group bg-white border border-gray-100 p-2 transition-all hover:shadow-xl hover:shadow-gray-200/40">
                                <div
                                    className="relative aspect-[4/3] overflow-hidden cursor-zoom-in bg-gray-100"
                                    onClick={() => setPreviewImage(offer.image)}
                                >
                                    <img
                                        src={offer.image}
                                        alt={offer.title}
                                        className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                                    />
                                    {/* Hover Mask */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <svg className="w-8 h-8 text-white scale-90 group-hover:scale-100 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="py-4 px-2 flex justify-between items-center">
                                    <h3 className="text-sm font-medium text-gray-800">{offer.title}</h3>
                                    <button onClick={() => setPreviewImage(offer.image)} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                        VIEW DETAIL
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Lightbox Modal */}
            {previewImage && (
                <div
                    className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 p-4 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={handleClose}
                >
                    <div
                        className={`relative flex items-center justify-center transition-all duration-300 transform ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"} ease-out max-w-[90vw] max-h-[90vh]`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                        />

                        {/* Toolbar */}
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-2 bg-black/80 text-white rounded-full">
                            <button
                                onClick={() => window.open(previewImage)}
                                className="hover:text-blue-400 transition-colors text-sm font-medium"
                            >
                                Download
                            </button>
                            <span className="opacity-30">|</span>
                            <button
                                onClick={handleClose}
                                className="hover:text-red-400 transition-colors text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                body:has([data-modal-open="true"]) {
                    overflow: hidden;
                }
            `}</style>
        </div>
    );
}