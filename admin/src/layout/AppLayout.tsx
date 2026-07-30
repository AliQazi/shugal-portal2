import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex">
      <div className="relative z-999999">
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${isExpanded || isHovered ? "lg:ml-72.5" : "lg:ml-22.5"
          } ${isMobileOpen ? "ml-0" : ""} min-h-screen flex flex-col`}
      >
        <AppHeader />
        <div className="flex-1 w-full p-4 mx-auto md:p-6">
          <Outlet />
        </div>
        {/* <div className="w-full px-4 pb-4 text-right text-sm text-gray-500 md:px-6 dark:text-gray-400">
          Designed and developed by Nexagen Solution
        </div> */}
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
