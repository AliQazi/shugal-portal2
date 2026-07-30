// models/Hotel.js

import mongoose from "mongoose";

const roomOptionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sellingPricePerNight: {
    type: Number,
    required: true,
    default: 0,
  },
  buyingPricePerNight: {
    type: Number,
    default: 0,
  },
  capacity: {
    type: Number,
    default: 2, // max persons
  },
  amenities: [
    {
      type: String,
    },
  ],
});

const hotelSchema = new mongoose.Schema(
  {
    // Original fields
    hotelName: {
      type: String,
      required: true,
      trim: true,
    },

    // Add 'name' field for compatibility with calculator
    name: {
      type: String,
      trim: true,
      set: function (value) {
        // If name is not provided, use hotelName
        return value || this.hotelName;
      },
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    distance: {
      type: Number,
      required: true,
      default: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    mapUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // NEW: Location object for better structure
    location: {
      city: {
        type: String,
        default: function () {
          return this.city;
        },
      },
      address: {
        type: String,
        default: "",
      },
      latitude: Number,
      longitude: Number,
    },

    // NEW: Room options (most important!)
    roomOptions: [roomOptionSchema],

    // Additional useful fields
    hotelImages: [
      {
        type: String,
        url: String,
        isPrimary: Boolean,
      },
    ],

    contactNumber: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },

    checkInTime: {
      type: String,
      default: "14:00",
    },

    checkOutTime: {
      type: String,
      default: "12:00",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    description: {
      type: String,
      default: "",
    },

    amenities: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for name (fallback)
hotelSchema.virtual("hotelInfo").get(function () {
  return {
    name: this.hotelName,
    city: this.city,
    rating: this.rating,
  };
});

// Pre-save middleware to sync fields
hotelSchema.pre("save", function () {
  // Sync name with hotelName if name not set
  if (!this.name) {
    this.name = this.hotelName;
  }

  // Sync location.city with city
  if (this.location && !this.location.city) {
    this.location.city = this.city;
  }
});

const Hotel = mongoose.model("Hotel", hotelSchema);

export default Hotel;
