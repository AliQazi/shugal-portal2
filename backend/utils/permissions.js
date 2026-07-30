/**
 * Permission utilities for role-based access control
 */

const PERMISSION_ALIASES = {
  view_sub_users: ["manage_sub_users"],
  view_bookings: ["bookings", "dashboard_recent_bookings"],
  manage_bookings: ["bookings_action_buttons"],
  view_group_ticketing: ["view_groups"],
  manage_group_ticketing: ["group_ticketing_action_buttons", "create_group"],
  view_payments: ["view_payment_vouchers"],
  manage_payments: ["view_payment_vouchers"],
  view_users: ["manage_sub_users"],
  manage_users: ["manage_sub_users"],
  view_agencies: ["register_agencies"],
  manage_agencies: ["agencies_top_action_buttons", "agent_action_buttons"],
  view_airlines: ["airline", "add_airline", "manage_airlines"],
  view_banks: ["add_bank", "manage_banks"],
  view_sectors: [
    "sector",
    "add_sector",
    "manage_sectors",
    "manage_sectors_sorting",
    "dashboard_group_category",
    "dashboard_apply_margin",
    "dashboard_copy_sector_data",
    "create_group",
    "view_groups",
    "create_umrah_package",
  ],
  view_hotels: ["hotels", "add_hotel", "manage_hotels"],
  view_transport: ["transport", "add_transport", "manage_transports"],
  manage_transport: ["manage_transports"],
  view_visas: ["visa", "add_visa", "manage_visas"],
  view_packages: ["create_umrah_package", "manage_umrah_packages"],
  manage_packages: ["manage_umrah_packages", "umrah_packages_action_buttons"],
  view_special_offers: ["special_offers", "add_special_offers", "manage_special_offers"],
  view_accounts: ["view_ledger"],
  export_data: ["view_ledger", "view_payment_vouchers"],
};

const permissionMatches = (permissions, permission) => {
  const acceptedPermissions = [permission, ...(PERMISSION_ALIASES[permission] || [])];
  return acceptedPermissions.some((perm) => permissions.includes(perm));
};

// Default permission sets for each role
export const ROLE_PERMISSIONS = {
  "Super Admin": {
    view_dashboard: true,
    view_bookings: true,
    manage_bookings: true,
    approve_bookings: true,
    view_group_ticketing: true,
    manage_group_ticketing: true,
    view_payments: true,
    manage_payments: true,
    view_ledger: true,
    view_users: true,
    manage_users: true,
    manage_sub_users: true,
    manage_user_passwords: true,
    view_agencies: true,
    manage_agencies: true,
    view_airlines: true,
    manage_airlines: true,
    view_banks: true,
    manage_banks: true,
    view_sectors: true,
    manage_sectors: true,
    view_hotels: true,
    manage_hotels: true,
    view_transport: true,
    manage_transport: true,
    view_visas: true,
    manage_visas: true,
    view_packages: true,
    manage_packages: true,
    view_special_offers: true,
    manage_special_offers: true,
    view_accounts: true,
    manage_accounts: true,
    view_reports: true,
    export_data: true,
    view_activity_logs: true,
  },

  Admin: {
    view_dashboard: true,
    view_bookings: true,
    manage_bookings: true,
    approve_bookings: true,
    view_group_ticketing: true,
    manage_group_ticketing: true,
    view_payments: true,
    manage_payments: true,
    view_ledger: true,
    view_users: true,
    manage_users: true,
    manage_sub_users: true,
    manage_user_passwords: true,
    view_agencies: true,
    manage_agencies: true,
    view_airlines: true,
    manage_airlines: true,
    view_banks: true,
    manage_banks: true,
    view_sectors: true,
    manage_sectors: true,
    view_hotels: true,
    manage_hotels: true,
    view_transport: true,
    manage_transport: true,
    view_visas: true,
    manage_visas: true,
    view_packages: true,
    manage_packages: true,
    view_special_offers: true,
    manage_special_offers: true,
    view_accounts: true,
    manage_accounts: true,
    view_reports: true,
    export_data: true,
    view_activity_logs: true,
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
    view_agencies: true,
    view_reports: true,
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
    manage_transport: true,
    view_packages: true,
    manage_packages: true,
  },
};

const CREATE_EDIT_PERMISSIONS = [
  "view_dashboard",
  "dashboard_shortcuts",
  "dashboard_group_category",
  "dashboard_recent_bookings",
  "dashboard_agent_status_graph",
  "dashboard_apply_margin",
  "dashboard_copy_sector_data",
  "register_agencies",
  "agencies_top_action_buttons",
  "agent_action_buttons",
  "add_bank",
  "manage_banks",
  "umrah_package_bookings",
  "view_umrah_package_booking_details",
  "manage_umrah_package_booking",
  "sector",
  "add_sector",
  "manage_sectors",
  "manage_sectors_sorting",
  "airline",
  "add_airline",
  "manage_airlines",
  "bookings",
  "bookings_action_buttons",
  "update_bookings_status",
  "update_bookings_discount",
  "special_offers",
  "add_special_offers",
  "manage_special_offers",
  "api_groups",
  "team_contacts",
  "add_team_contacts",
  "manage_team_contacts",
  "manage_sub_users",
  "create_sub_user",
  "edit_sub_user",
  "delete_sub_user",
  "activate_sub_user",
  "hotels",
  "add_hotel",
  "manage_hotels",
  "transport",
  "add_transport",
  "manage_transports",
  "visa",
  "add_visa",
  "manage_visas",
  "create_umrah_package",
  "manage_umrah_packages",
  "umrah_packages_action_buttons",
  "create_group",
  "view_groups",
  "group_ticketing_action_buttons",
  "view_ledger",
  "view_payment_vouchers",
];

for (const roleName of ["Super Admin", "Admin"]) {
  ROLE_PERMISSIONS[roleName] = ROLE_PERMISSIONS[roleName] || {};
  CREATE_EDIT_PERMISSIONS.forEach((permission) => {
    ROLE_PERMISSIONS[roleName][permission] = true;
  });
}

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object with userRole and permissions
 * @param {String} permission - Permission key to check
 * @returns {Boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;

  if (user.isSubUser) {
    return Array.isArray(user.permissions) && permissionMatches(user.permissions, permission);
  }

  // Only Super Admin has all permissions.
  if (
    user.userRole === "Super Admin" ||
    user.role === "Super Admin"
  ) {
    return true;
  }

  // Check in user's permissions array
  if (Array.isArray(user.permissions)) {
    return permissionMatches(user.permissions, permission);
  }

  // Check in ROLE_PERMISSIONS mapping
  const rolePermissions = ROLE_PERMISSIONS[user.userRole || user.role];
  if (rolePermissions) {
    return rolePermissions[permission] === true;
  }

  return false;
};

/**
 * Check if a user has any of the specified permissions
 * @param {Object} user - User object
 * @param {Array} permissions - Array of permission keys
 * @returns {Boolean}
 */
export const hasAnyPermission = (user, permissions) => {
  return permissions.some((perm) => hasPermission(user, perm));
};

/**
 * Check if a user has all specified permissions
 * @param {Object} user - User object
 * @param {Array} permissions - Array of permission keys
 * @returns {Boolean}
 */
export const hasAllPermissions = (user, permissions) => {
  return permissions.every((perm) => hasPermission(user, perm));
};

/**
 * Get all permissions for a role
 * @param {String} roleName - Role name
 * @returns {Object}
 */
export const getRolePermissions = (roleName) => {
  return ROLE_PERMISSIONS[roleName] || {};
};

/**
 * Filter permissions object based on role
 * @param {String} roleName - Role name
 * @returns {Array}
 */
export const getPermissionKeysForRole = (roleName) => {
  const permissions = ROLE_PERMISSIONS[roleName] || {};
  return Object.keys(permissions).filter((key) => permissions[key] === true);
};
