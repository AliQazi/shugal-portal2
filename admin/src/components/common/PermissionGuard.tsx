import React from "react";
import { useAuth } from "../../context/AuthContext";
import { hasPermission } from "../../utils/permissions";
import NotFound from "../../pages/OtherPage/NotFound";

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render content based on user permissions
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  fallback = <NotFound />,
}) => {
  const { user } = useAuth();

  if (!hasPermission(user, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface PermissionRouteProps {
  permission: string;
  component: React.ComponentType<any>;
  fallback?: React.ComponentType<any>;
}

/**
 * Component for wrapping routes with permission checks
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  permission,
  component: Component,
  fallback: Fallback = NotFound,
}) => {
  const { user } = useAuth();

  if (!hasPermission(user, permission)) {
    return <Fallback />;
  }

  return <Component />;
};

interface ConditionalRenderProps {
  permission: string;
  children: React.ReactNode;
  hideIfNoPermission?: boolean;
}

/**
 * Hides children if user doesn't have permission (useful for UI elements like buttons)
 */
export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  permission,
  children,
  hideIfNoPermission = true,
}) => {
  const { user } = useAuth();

  if (hideIfNoPermission && !hasPermission(user, permission)) {
    return null;
  }

  return <>{children}</>;
};
