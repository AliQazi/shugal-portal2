import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null; // Or show spinner

  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" replace />;
}
