import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc,#eef4ff)] text-foreground">
      <AppSidebar />
      <div className="min-h-screen pl-[232px]">
        <AppHeader />
        <Outlet />
      </div>
    </div>
  );
}
