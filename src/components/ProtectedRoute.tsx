import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type ProductKey, type UserRole } from "@/context/AuthContext";

export function ProtectedRoute({
  children,
  roles,
  product,
  permission = "view",
  requireServiceAccess = false,
}: {
  children: ReactNode;
  roles?: UserRole[];
  product?: ProductKey;
  permission?: "view" | "edit" | "approve" | "delete" | "manage" | "website_builder" | "command_center";
  requireServiceAccess?: boolean;
}) {
  const { user, profile, adminAccess, serviceAccess, loading, configured } = useAuth();
  const location = useLocation();
  if (!configured)
    return (
      <Navigate to="/signin" replace state={{ from: location.pathname + location.search, configurationError: true }} />
    );
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-surface">
        <div
          className="w-10 h-10 rounded-full border-4 border-royal-100 border-t-royal-600 animate-spin"
          aria-label="Checking your account"
        />
      </div>
    );
  if (!user)
    return (
      <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
    );
  if (profile?.status !== "active")
    return <Navigate to="/admin/access-denied" replace />;
  if (roles && (!profile || !roles.includes(profile.role)))
    return <Navigate to="/admin/access-denied" replace />;
  if (product && requireServiceAccess) {
    if (profile?.role === "customer") {
      const access = serviceAccess.find((item) => item.product === product);
      if (access?.status !== "active") return <Navigate to="/admin/access-denied" replace />;
    } else if (profile?.role !== "super_admin") {
      // Administrators enter customer-facing platform workspaces with their
      // assigned admin_product_access permission; they do not need a separate
      // customer_service_access subscription or a second platform login.
      const access = adminAccess.find((item) => item.product === product);
      const allowed = permission === "approve" ? access?.can_approve : permission === "edit" ? access?.can_edit : permission === "delete" ? access?.can_delete : permission === "manage" ? access?.can_manage : permission === "website_builder" ? access?.can_use_website_builder : permission === "command_center" ? access?.can_use_command_center : access?.can_view;
      if (!allowed) return <Navigate to="/admin/access-denied" replace />;
    }
  } else if (product && profile?.role !== "super_admin" && profile?.role !== "customer") {
    const access = adminAccess.find((item) => item.product === product);
    const allowed = permission === "approve" ? access?.can_approve : permission === "edit" ? access?.can_edit : permission === "delete" ? access?.can_delete : permission === "manage" ? access?.can_manage : permission === "website_builder" ? access?.can_use_website_builder : permission === "command_center" ? access?.can_use_command_center : access?.can_view;
    if (!allowed) return <Navigate to="/admin/access-denied" replace />;
  }
  return <>{children}</>;
}
