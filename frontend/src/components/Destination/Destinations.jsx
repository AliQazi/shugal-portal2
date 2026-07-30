import React, { useState } from "react";
import {
  Plane,
  Hotel,
  Utensils,
  Camera,
  Sun,
  Mountain,
  Umbrella,
  Ship,
  MapPin,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Globe,
} from "lucide-react";

// Global image variables - change these URLs as needed
const DESTINATION_1 =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800";
const DESTINATION_2 =
  "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?auto=format&fit=crop&q=80&w=800";
const DESTINATION_3 =
  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800";
const DESTINATION_4 =
  "https://www.thetravelmagazine.net/wp-content/uploads/Bodu-1170x878.jpg";
const DESTINATION_5 =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=800";
const DESTINATION_6 =
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=800";

export default function DestinationsSection() {
  const [activeTab, setActiveTab] = useState("all");

  const destinations = [
    {
      id: 1,
      title: "Bali, Indonesia",
      location: "Southeast Asia",
      image: DESTINATION_1,
      price: "$1,299",
      rating: 4.9,
      reviews: 234,
      category: "beach",
      duration: "7 Days",
      groupSize: "12 People",
      tags: ["Beach", "Culture", "Adventure"],
    },
    {
      id: 2,
      title: "Dubai, UAE",
      location: "Middle East",
      image: DESTINATION_2,
      price: "$1,899",
      rating: 4.8,
      reviews: 189,
      category: "luxury",
      duration: "5 Days",
      groupSize: "8 People",
      tags: ["Luxury", "Shopping", "Desert"],
    },
    {
      id: 3,
      title: "Swiss Alps",
      location: "Europe",
      image: DESTINATION_3,
      price: "$2,499",
      rating: 4.9,
      reviews: 312,
      category: "adventure",
      duration: "10 Days",
      groupSize: "10 People",
      tags: ["Mountains", "Snow", "Nature"],
    },
    {
      id: 4,
      title: "Maldives",
      location: "Indian Ocean",
      image: DESTINATION_4,
      price: "$3,299",
      rating: 5.0,
      reviews: 456,
      category: "beach",
      duration: "7 Days",
      groupSize: "6 People",
      tags: ["Island", "Water", "Luxury"],
    },
    {
      id: 5,
      title: "Tokyo, Japan",
      location: "East Asia",
      image: DESTINATION_5,
      price: "$2,199",
      rating: 4.7,
      reviews: 278,
      category: "culture",
      duration: "8 Days",
      groupSize: "14 People",
      tags: ["Culture", "Food", "Tech"],
    },
  ];

  const categories = [
    {
      id: "all",
      label: "All Destinations",
      icon: <Globe className="w-4 h-4" />,
    },
    { id: "beach", label: "Beach", icon: <Umbrella className="w-4 h-4" /> },
    {
      id: "adventure",
      label: "Adventure",
      icon: <Mountain className="w-4 h-4" />,
    },
    { id: "luxury", label: "Luxury", icon: <Star className="w-4 h-4" /> },
    { id: "culture", label: "Culture", icon: <Camera className="w-4 h-4" /> },
  ];

  const filteredDestinations =
    activeTab === "all"
      ? destinations
      : destinations.filter((d) => d.category === activeTab);

  return (
    <section className="relative py-24 md:py-32 bg-white overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#e95432]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1a417a]/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a417a]/5 border border-[#1a417a]/10 mb-4">
            <span className="w-1.5 h-1.5 bg-[#e95432] rounded-full"></span>
            <span className="text-[10px] font-bold text-[#1a417a] uppercase tracking-[0.2em]">
              Top Picks
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1a417a] leading-[1.1] mb-4">
            Popular
            <span className="block text-transparent bg-clip-text bg-linear-to-r from-[#e95432] to-[#f7931e]">
              Destinations
            </span>
          </h2>

          <p className="text-gray-600 text-base md:text-lg">
            Discover the world's most amazing places with our curated selection
            of premium destinations
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${
                activeTab === cat.id
                  ? "bg-[#1a417a] text-white shadow-lg shadow-[#1a417a]/25"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80"
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredDestinations.map((dest) => (
            <div
              key={dest.id}
              className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"></div>

                {/* Rating Badge */}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-gray-800">
                    {dest.rating}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({dest.reviews})
                  </span>
                </div>

                {/* Wishlist Button */}
                <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-[#e95432] hover:text-white transition-all duration-300">
                  <Heart className="w-4 h-4" />
                </button>

                {/* Tags */}
                <div className="absolute bottom-4 left-4 flex gap-1.5">
                  {dest.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium rounded-full uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 md:p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-[#1a417a] group-hover:text-[#e95432] transition-colors">
                      {dest.title}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {dest.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Service Cards */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Plane className="w-5 h-5" />, label: "Flight Booking" },
            { icon: <Hotel className="w-5 h-5" />, label: "Hotel Stays" },
            { icon: <Utensils className="w-5 h-5" />, label: "Fine Dining" },
            { icon: <Ship className="w-5 h-5" />, label: "Cruise Tours" },
          ].map((service, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-4 bg-gray-50/80 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#e95432]/30 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="p-2.5 bg-linear-to-br from-[#1a417a]/10 to-[#e95432]/10 rounded-xl text-[#1a417a] group-hover:scale-110 transition-transform">
                {service.icon}
              </div>
              <span className="text-sm font-bold text-gray-700 group-hover:text-[#1a417a]">
                {service.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
