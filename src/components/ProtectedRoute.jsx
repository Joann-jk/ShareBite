import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

/**
 * Usage:
 * <Route element={<ProtectedRoute />}>
 *   <Route path="/dashboard" element={<Dashboard />} />
 *   ...
 * </Route>
 *
 * Or as a wrapper:
 * <ProtectedRoute><Dashboard /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, redirectTo = "/login", requiredRole }) {
  const { user, loading, userRole } = useAuth();

  // While loading auth state, show nothing or a loader
  if (loading) return <div className="text-center py-10">Loading...</div>;

  // Not logged in
  if (!user) return <Navigate to={redirectTo} replace />;

  // Role-based protection
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to={redirectTo} replace />;
  }

  // If used as parent route (with Outlet)
  if (!children) return <Outlet />;

  // If used as wrapper component
  return children;
}