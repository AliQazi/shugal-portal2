import mongoose from "mongoose";

const SubUserRoleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      enum: [
        "Super Admin",
        "Admin",
        "Operations Manager",
        "Booking Manager",
        "Finance Manager",
        "Support Staff",
        "Data Manager",
      ],
      required: true,
      unique: true,
    },

    description: {
      type: String,
      default: "",
    },

    // Feature-based permissions
    permissions: {
      // Dashboard
      view_dashboard: { type: Boolean, default: false },

      // Bookings
      view_bookings: { type: Boolean, default: false },
      manage_bookings: { type: Boolean, default: false },
      approve_bookings: { type: Boolean, default: false },

      // Group Ticketing
      view_group_ticketing: { type: Boolean, default: false },
      manage_group_ticketing: { type: Boolean, default: false },

      // Payments & Ledger
      view_payments: { type: Boolean, default: false },
      manage_payments: { type: Boolean, default: false },
      view_ledger: { type: Boolean, default: false },

      // User Management
      view_users: { type: Boolean, default: false },
      manage_users: { type: Boolean, default: false },
      manage_sub_users: { type: Boolean, default: false },
      manage_user_passwords: { type: Boolean, default: false },

      // Agencies
      view_agencies: { type: Boolean, default: false },
      manage_agencies: { type: Boolean, default: false },

      // Airline Management
      view_airlines: { type: Boolean, default: false },
      manage_airlines: { type: Boolean, default: false },

      // Bank Management
      view_banks: { type: Boolean, default: false },
      manage_banks: { type: Boolean, default: false },

      // Sector Management
      view_sectors: { type: Boolean, default: false },
      manage_sectors: { type: Boolean, default: false },

      // Hotel Management
      view_hotels: { type: Boolean, default: false },
      manage_hotels: { type: Boolean, default: false },

      // Transport Management
      view_transport: { type: Boolean, default: false },
      manage_transport: { type: Boolean, default: false },

      // Visa Management
      view_visas: { type: Boolean, default: false },
      manage_visas: { type: Boolean, default: false },

      // Packages
      view_packages: { type: Boolean, default: false },
      manage_packages: { type: Boolean, default: false },

      // Special Offers
      view_special_offers: { type: Boolean, default: false },
      manage_special_offers: { type: Boolean, default: false },

      // Accounts
      view_accounts: { type: Boolean, default: false },
      manage_accounts: { type: Boolean, default: false },

      // Reports & Exports
      view_reports: { type: Boolean, default: false },
      export_data: { type: Boolean, default: false },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SubUserRole", SubUserRoleSchema);
