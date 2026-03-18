import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute({ children, path }) {
  const { user, permissions, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in -> redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a specific path is being requested (like /photo-orders)
  // Check if they have permission, OR if they are an admin.
  // We actually seeded the permission table, so checking the permissions array is sufficient.
  if (path && !permissions.includes(path)) {
     // They don't have access to this page. Redirect to their first available page.
     const firstAvailablePath = permissions.length > 0 ? permissions[0] : "/unauthorized";
     return <Navigate to={firstAvailablePath} replace />;
  }

  // Authorized -> render page
  return children;
}
