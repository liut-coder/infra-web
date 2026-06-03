import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

export function PermissionGate({
  permission,
  children,
  fallback,
}: {
  permission?: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  if (hasPermission(permission)) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return <Navigate to="/403" replace />;
}
