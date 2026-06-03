import { Navigate, useLocation } from "react-router-dom";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { useAuthStore } from "@/store/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function ProtectedRoute({
  permission,
  children,
}: {
  permission?: string | string[];
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <PermissionGate permission={permission}>{children}</PermissionGate>
    </RequireAuth>
  );
}
