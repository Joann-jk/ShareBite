import React from "react";
import { useAuth } from "../lib/AuthContext";
import { Navigate } from "react-router-dom";

const Redirect = () => {
  const { user, userRole, loading } = useAuth();
  console.log("Role",userRole)
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }

  if (!userRole) {
    // Role not found → fallback redirect
    return <Navigate to="/" replace />;
  }

  // ✅ Redirect based on userRole
  switch (userRole.role) {   // because you stored `data` in setUserRole
    case "donor":
      return <Navigate to="/donor" replace />;
    case "recipient":
      return <Navigate to="/recipient" replace />;
    case "volunteer":
      return <Navigate to="/volunteer" replace />;
    default:
      return <Navigate to="/" replace />;
  }
};

export default Redirect;
