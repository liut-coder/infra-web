import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/store/ui";

export function AdminLayout() {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc,#eef4ff)] text-foreground">
      <AppSidebar />
      <div
        className={cn(
          "min-h-screen transition-[padding] duration-200 ease-out",
          sidebarCollapsed ? "lg:pl-[76px]" : "lg:pl-[232px]",
        )}
      >
        <AppHeader />
        <Outlet />
      </div>
    </div>
  );
}
