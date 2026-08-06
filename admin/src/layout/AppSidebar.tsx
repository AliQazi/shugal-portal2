import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import logo from "../../../frontend/src/assets/images/logo.png";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

// Assume these icons are imported from an icon library
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";
import { IoSettingsOutline } from 'react-icons/io5'
import { MdOutlineHistory } from 'react-icons/md'
import { useSidebar } from "../context/SidebarContext";
import { MoonIcon } from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string;
  subItems?: { name: string; path: string; permission?: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
    permission: "view_dashboard",
  },
  {
    icon: <UserCircleIcon />,
    name: "Registered Agencies",
    path: "/registered-agencies",
    permission: "view_register_agencies",
  },
  {
    icon: <ListIcon />,
    name: "Banks",
    path: "/add-bank",
    permission: "view_banks",
  },
  {
    icon: <TableIcon />,
    name: "Umrah Packages",
    subItems: [
      { name: "Hotels", path: "/hotel", permission: "view_hotels", pro: false },
      { name: "Transport", path: "/transport", permission: "view_transports", pro: false },
      { name: "Visa Management", path: "/visaManagement", permission: "view_visas", pro: false },
      { name: "Create Umrah Package", path: "/create-package", permission: "create_umrah_package", pro: false },
      { name: "Manage Umrah Packages", path: "/manage-package", permission: "view_umrah_packages", pro: false },
    ],
  },
  {
    icon: <ListIcon />,
    name: "Umrah Package Bookings",
    path: "/umrah-pkg-bookings",
    permission: "view_umrah_package_bookings",
  },
  {
    icon: <TableIcon />,
    name: "Group Ticketing",
    subItems: [
      { name: "View Groups", path: "/group-ticketing", permission: "view_groups", pro: false },
      { name: "Create Group", path: "/group-ticketing/create", permission: "create_group", pro: false },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Ticket Bookings",
    path: "/all-bookings",
    permission: "view_bookings",
  },
  {
    icon: <TableIcon />,
    name: "XO Report",
    path: "/xo-report",
    permission: "view_bookings",
  },
  {
    icon: <MoonIcon />,
    name: "Umrah Calculator",
    subItems: [
      { name: "Add New Visa", path: "/add-visa" },
      { name: "Transfers Route Rates", path: "/transport-route-rates" },
      { name: "Umrah Calculator Records", path: "/umrah-calculator", pro: false },
      { name: "Umrah Booking Queries", path: "/umrah-booking-queries", pro: false },
    ],
  },
  {
    icon: <TableIcon />,
    name: "Ledger",
    subItems: [
      { name: "View Accounts", path: "/view-accounts", permission: "view_ledger", pro: false },
      { name: "View Payment Vouchers", path: "/view-payment-voucher", permission: "view_payment_vouchers", pro: false },
    ],
  },
  {
    icon: <ListIcon />,
    name: "Sectors",
    path: "/sector",
    permission: "view_sectors",
  },
  {
    icon: <ListIcon />,
    name: "Airline",
    path: "/airline",
    permission: "view_airlines",
  },
  {
    icon: <TableIcon />,
    name: "Special Offers",
    path: "/special-offers",
    permission: "view_special_offers",
  },
  {
    icon: <TableIcon />,
    name: "Sectors Sorting",
    path: "/manage-sectors",
    permission: "manage_sectors_sorting",
  },
  {
    icon: <TableIcon />,
    name: "API Groups",
    path: "/api-groups",
    permission: "api_groups",
  },
  {
    icon: <UserCircleIcon />,
    name: "Team Contacts",
    path: "/team-contacts",
    permission: "view_team_contacts",
  },
  {
    icon: <UserCircleIcon />,
    name: "Manage Sub Users",
    path: "/manage-sub-users",
    permission: "view_sub_users",
  },
  {
    icon: <IoSettingsOutline />,
    name: "Global Settings",
    path: "/global-settings",
    permission: "global_settings",
  },
  {
    icon: <MdOutlineHistory />,
    name: "Activity Logs",
    path: "/activity-logs",
    permission: "view_activity_logs",
  },
];

const AppSidebar: React.FC = () => {
  const { user } = useAuth();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    key: string;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu({
              type: "main",
              key: nav.name,
            });
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.key}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (key: string, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.key === key
      ) {
        return null;
      }
      return { type: menuType, key };
    });
  };

  // Check if user has access to a menu item
  const canAccessItem = (permission?: string): boolean => {
    if (!permission) return true; // No permission requirement
    return hasPermission(user, permission);
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => {
    // Filter items based on permissions
    // const accessibleItems = items.filter((nav) => canAccessItem(nav.permission));
    const getAccessibleItems = (items: NavItem[]) => {
      return items
        .map((nav) => {
          if (nav.subItems) {
            const accessibleSubItems = nav.subItems.filter((subItem) =>
              canAccessItem(subItem.permission)
            );

            if (accessibleSubItems.length === 0) {
              return null;
            }

            return {
              ...nav,
              subItems: accessibleSubItems,
            };
          }

          if (!canAccessItem(nav.permission)) {
            return null;
          }

          return nav;
        })
        .filter(Boolean) as NavItem[];
    };

    const accessibleItems = getAccessibleItems(items);

    return (
      <ul className="flex flex-col gap-4">
        {accessibleItems.map((nav) => {
          const submenuKey = `${menuType}-${nav.name}`;
          const isSubmenuOpen =
            openSubmenu?.type === menuType && openSubmenu?.key === nav.name;

          return (
            <li key={nav.name}>
              {nav.subItems ? (
                <>
                  <button
                    onClick={() => handleSubmenuToggle(nav.name, menuType)}
                    className={`menu-item group ${isSubmenuOpen
                      ? "menu-item-active"
                      : "menu-item-inactive"
                      } cursor-pointer ${!isExpanded && !isHovered
                        ? "lg:justify-center"
                        : "lg:justify-start"
                      }`}
                  >
                    <span
                      className={`menu-item-icon-size  ${isSubmenuOpen
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                        }`}
                    >
                      {nav.icon}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="menu-item-text">{nav.name}</span>
                    )}
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <ChevronDownIcon
                        className={`ml-auto w-5 h-5 transition-transform duration-200 ${isSubmenuOpen
                          ? "rotate-180 text-brand-500"
                          : ""
                          }`}
                      />
                    )}
                  </button>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <div
                      ref={(el) => {
                        subMenuRefs.current[submenuKey] = el;
                      }}
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        height:
                          isSubmenuOpen
                            ? `${subMenuHeight[submenuKey]}px`
                            : "0px",
                      }}
                    >
                      <ul className="mt-2 space-y-1 ml-9">
                        {nav.subItems
                          .filter((subItem) => canAccessItem(subItem.permission))
                          .map((subItem) => (
                            <li key={subItem.name}>
                              <Link
                                to={subItem.path}
                                className={`menu-dropdown-item ${isActive(subItem.path)
                                  ? "menu-dropdown-item-active"
                                  : "menu-dropdown-item-inactive"
                                  }`}
                              >
                                {subItem.name}
                                <span className="flex items-center gap-1 ml-auto">
                                  {subItem.new && (
                                    <span
                                      className={`ml-auto ${isActive(subItem.path)
                                        ? "menu-dropdown-badge-active"
                                        : "menu-dropdown-badge-inactive"
                                        } menu-dropdown-badge`}
                                    >
                                      new
                                    </span>
                                  )}
                                  {subItem.pro && (
                                    <span
                                      className={`ml-auto ${isActive(subItem.path)
                                        ? "menu-dropdown-badge-active"
                                        : "menu-dropdown-badge-inactive"
                                        } menu-dropdown-badge`}
                                    >
                                      pro
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                nav.path && (
                  <Link
                    to={nav.path}
                    className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                      }`}
                  >
                    <span
                      className={`menu-item-icon-size ${isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                        }`}
                    >
                      {nav.icon}
                    </span>
                    {(isExpanded || isHovered || isMobileOpen) && (
                      <span className="menu-item-text">{nav.name}</span>
                    )}
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-72.5"
          : isHovered
            ? "w-72.5"
            : "w-22.5"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-center"
          }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                src={logo}
                alt="Logo"
                width={150}
                height={40}
              />
              {/* <img
                className="hidden dark:block"
                src="/admin-portal/images/logo/logo-dark.webp"
                alt="Logo"
                width={150}
                height={40}
              /> */}
            </>
          ) : (
            <img
              src={logo}
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar flex-1">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>
      </div>

      {/* Copyright Footer */}
      <div className={`py-4 border-t border-gray-200 dark:border-gray-800 ${!isExpanded && !isHovered ? "lg:text-center" : "text-center"}`}>
        {isExpanded || isHovered || isMobileOpen ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} <a href="https://flyingzone.nexagensolution.com/" target="_blank">Abid Air Travel & Tours</a><br />All rights reserved.
          </p>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()}
          </p>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;