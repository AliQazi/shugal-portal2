/**
 * Frontend permission utilities for role-based access control
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  userRole?: string;
  companyName: string;
  isSubUser?: boolean;
  parentAdminId?: string;
  permissions?: string[];
}

const PERMISSION_ALIASES: Record<string, string[]> = {
  view_sub_users: ["manage_sub_users"],
  manage_sub_users: ["view_sub_users"],
  view_register_agencies: ["register_agencies", "view_agencies"],
  register_agencies: ["view_register_agencies", "view_agencies"],
  view_agencies: ["view_register_agencies", "register_agencies"],
  view_bookings: ["bookings"],
  bookings: ["view_bookings"],
  manage_bookings: ["bookings_action_buttons"],
  view_group_ticketing: ["view_groups"],
  manage_group_ticketing: ["group_ticketing_action_buttons", "create_group"],
  view_payments: ["view_payment_vouchers"],
  manage_payments: ["view_payment_vouchers"],
  manage_agencies: ["agencies_top_action_buttons", "agent_action_buttons"],
  view_airlines: ["airline"],
  airline: ["view_airlines"],
  view_banks: [],
  view_sectors: [
    "sector",
  ],
  sector: ["view_sectors"],
  view_hotels: ["hotels"],
  hotels: ["view_hotels"],
  view_transport: ["view_transports", "transport"],
  view_transports: ["view_transport", "transport"],
  transport: ["view_transport", "view_transports"],
  manage_transport: ["manage_transports"],
  view_visas: ["visa"],
  visa: ["view_visas"],
  view_packages: ["view_umrah_packages"],
  view_umrah_packages: ["view_packages"],
  manage_packages: ["manage_umrah_packages", "umrah_packages_action_buttons"],
  view_special_offers: ["special_offers"],
  special_offers: ["view_special_offers"],
  view_accounts: ["view_ledger"],
  view_team_contacts: ["team_contacts"],
  team_contacts: ["view_team_contacts"],
  view_umrah_package_bookings: ["umrah_package_bookings"],
  umrah_package_bookings: ["view_umrah_package_bookings"],
  ledger_action_buttons: ["export_data"],
  export_data: ["ledger_action_buttons", "view_payment_vouchers"],
};

const permissionMatches = (permissions: string[], permission: string): boolean => {
  const acceptedPermissions = [permission, ...(PERMISSION_ALIASES[permission] || [])];
  return acceptedPermissions.some((perm) => permissions.includes(perm));
};

// Role-based permission definitions (mirrored from backend)
export const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  "Super Admin": {
    view_dashboard: true,

    dashboard_shortcuts: true,
    dashboard_group_category: true,
    dashboard_recent_bookings: true,
    dashboard_agent_status_graph: true,
    dashboard_apply_margin: true,
    dashboard_copy_sector_data: true,

    view_register_agencies: true,
    register_agencies: true,
    agencies_top_action_buttons: true,
    agent_action_buttons: true,

    view_banks: true,
    add_bank: true,
    manage_banks: true,

    view_umrah_package_bookings: true,
    umrah_package_bookings: true,
    view_umrah_package_booking_details: true,
    manage_umrah_package_booking: true,

    view_sectors: true,
    sector: true,
    add_sector: true,
    manage_sectors: true,
    manage_sectors_sorting: true,

    view_airlines: true,
    airline: true,
    add_airline: true,
    manage_airlines: true,

    view_bookings: true,
    bookings: true,
    bookings_action_buttons: true,
    update_bookings_status: true,
    update_bookings_discount: true,

    view_special_offers: true,
    special_offers: true,
    add_special_offers: true,
    manage_special_offers: true,

    api_groups: true,

    view_team_contacts: true,
    team_contacts: true,
    add_team_contacts: true,
    manage_team_contacts: true,

    view_sub_users: true,
    manage_sub_users: true,
    create_sub_user: true,
    edit_sub_user: true,
    delete_sub_user: true,
    activate_sub_user: true,

    view_hotels: true,
    hotels: true,
    add_hotel: true,
    manage_hotels: true,

    view_transports: true,
    transport: true,
    add_transport: true,
    manage_transports: true,

    view_visas: true,
    visa: true,
    add_visa: true,
    manage_visas: true,

    create_umrah_package: true,
    view_umrah_packages: true,
    manage_umrah_packages: true,
    umrah_packages_action_buttons: true,

    create_group: true,
    view_groups: true,
    group_ticketing_action_buttons: true,

    view_ledger: true,
    ledger_action_buttons: true,
    view_payment_vouchers: true,
  },

  Admin: {
    view_dashboard: true,

    dashboard_shortcuts: true,
    dashboard_group_category: true,
    dashboard_recent_bookings: true,
    dashboard_agent_status_graph: true,
    dashboard_apply_margin: true,
    dashboard_copy_sector_data: true,

    view_register_agencies: true,
    register_agencies: true,
    agencies_top_action_buttons: true,
    agent_action_buttons: true,

    view_banks: true,
    add_bank: true,
    manage_banks: true,

    view_umrah_package_bookings: true,
    umrah_package_bookings: true,
    view_umrah_package_booking_details: true,
    manage_umrah_package_booking: true,

    view_sectors: true,
    sector: true,
    add_sector: true,
    manage_sectors: true,
    manage_sectors_sorting: true,

    view_airlines: true,
    airline: true,
    add_airline: true,
    manage_airlines: true,

    view_bookings: true,
    bookings: true,
    bookings_action_buttons: true,
    update_bookings_status: true,
    update_bookings_discount: true,

    view_special_offers: true,
    special_offers: true,
    add_special_offers: true,
    manage_special_offers: true,

    api_groups: true,

    view_team_contacts: true,
    team_contacts: true,
    add_team_contacts: true,
    manage_team_contacts: true,

    view_sub_users: true,
    manage_sub_users: true,
    create_sub_user: true,
    edit_sub_user: true,
    delete_sub_user: true,
    activate_sub_user: true,

    view_hotels: true,
    hotels: true,
    add_hotel: true,
    manage_hotels: true,

    view_transports: true,
    transport: true,
    add_transport: true,
    manage_transports: true,

    view_visas: true,
    visa: true,
    add_visa: true,
    manage_visas: true,

    create_umrah_package: true,
    view_umrah_packages: true,
    manage_umrah_packages: true,
    umrah_packages_action_buttons: true,

    create_group: true,
    view_groups: true,
    group_ticketing_action_buttons: true,

    view_ledger: true,
    ledger_action_buttons: true,
    view_payment_vouchers: true,
  },

  "Operations Manager": {
    view_dashboard: true,
    view_bookings: true,
    manage_bookings: true,
    approve_bookings: true,
    view_group_ticketing: true,
    manage_group_ticketing: true,
    view_payments: true,
    manage_payments: true,
    view_ledger: true,
    ledger_action_buttons: true,
    view_agencies: true,
    view_reports: true,
    view_sub_users: true,
    edit_sub_user: true,
  },

  "Booking Manager": {
    view_dashboard: true,
    view_bookings: true,
    manage_bookings: true,
    view_group_ticketing: true,
    manage_group_ticketing: true,
    view_reports: true,
  },

  "Finance Manager": {
    view_dashboard: true,
    view_payments: true,
    manage_payments: true,
    view_ledger: true,
    ledger_action_buttons: true,
    view_accounts: true,
    view_reports: true,
    export_data: true,
  },

  "Support Staff": {
    view_dashboard: true,
    view_bookings: true,
    view_group_ticketing: true,
    view_payments: true,
    view_ledger: true,
    view_users: true,
    view_sub_users: true,
  },

  "Data Manager": {
    view_airlines: true,
    manage_airlines: true,
    view_banks: true,
    manage_banks: true,
    view_sectors: true,
    manage_sectors: true,
    view_hotels: true,
    manage_hotels: true,
    view_transport: true,
    view_transports: true,
    manage_transport: true,
    view_packages: true,
    view_umrah_packages: true,
    manage_packages: true,
  },
};

/**
 * Check if a user has a specific permission
 * @param user - User object
 * @param permission - Permission key
 * @returns Boolean
 */
export const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user) {
    // console.log("❌ hasPermission: No user object");
    return false;
  }

  if (user.isSubUser) {
    return Array.isArray(user.permissions) && permissionMatches(user.permissions, permission);
  }

  // Check sub-users before the Admin compatibility role.
  const primaryRole = user.userRole || user.role;
  // console.log(`🔍 hasPermission check:`, {
  //   permission,
  //   user_role: user.role,
  //   user_userRole: user.userRole,
  //   primaryRole,
  //   user_permissions: user.permissions,
  // });

  if (primaryRole === "Super Admin" || user.role === "Super Admin") {
    // console.log(`✅ Admin/Super Admin detected for permission: ${permission}`);
    return true;
  }

  // Check in user's permissions array (for sub-users with specific permissions assigned)
  if (Array.isArray(user.permissions)) {
    const hasIt = permissionMatches(user.permissions, permission);
    // console.log(`🔍 Checking permissions array: ${hasIt ? "✅ FOUND" : "❌ NOT FOUND"}`);
    return hasIt;
  }

  return false;

  // Check in ROLE_PERMISSIONS mapping as fallback
  const rolePermissions = ROLE_PERMISSIONS[primaryRole || ""];
  if (rolePermissions) {
    const hasIt = rolePermissions[permission] === true;
    // console.log(`🔍 Checking ROLE_PERMISSIONS: ${hasIt ? "✅ FOUND" : "❌ NOT FOUND"}`);
    return hasIt;
  }

  // console.log(`❌ No permission found for: ${permission}`);
  return false;
};

/**
 * Check if user has any of the specified permissions
 * @param user - User object
 * @param permissions - Array of permission keys
 * @returns Boolean
 */
export const hasAnyPermission = (user: User | null, permissions: string[]): boolean => {
  return permissions.some((perm) => hasPermission(user, perm));
};

/**
 * Check if user has all specified permissions
 * @param user - User object
 * @param permissions - Array of permission keys
 * @returns Boolean
 */
export const hasAllPermissions = (user: User | null, permissions: string[]): boolean => {
  return permissions.every((perm) => hasPermission(user, perm));
};

/**
 * Get user's display role
 * @param user - User object
 * @returns String
 */
export const getUserRole = (user: User | null): string => {
  if (!user) return "Unknown";
  return user.userRole || user.role || "Unknown";
};

/**
 * Check if user is a Super Admin
 * @param user - User object
 * @returns Boolean
 */
export const isAdmin = (user: User | null): boolean => {
  if (!user) return false;
  if (user.isSubUser) return false;
  return user.userRole === "Super Admin" || user.role === "Super Admin";
};

/**
 * Check if user is a sub-user
 * @param user - User object
 * @returns Boolean
 */
export const isSubUser = (user: User | null): boolean => {
  if (!user) return false;
  return user.isSubUser === true;
};

/**
 * Get permission keys for a role
 * @param roleName - Role name
 * @returns Array of permission keys
 */
export const getPermissionKeysForRole = (roleName: string): string[] => {
  const permissions = ROLE_PERMISSIONS[roleName] || {};
  return Object.keys(permissions).filter((key) => permissions[key] === true);
};
