import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Folder,
  Globe2,
  HardDrive,
  KeyRound,
  Layers3,
  LayoutDashboard,
  ListTree,
  Network,
  Search,
  Settings,
  ShieldCheck,
  Server,
  Table2,
  Terminal,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/store/ui";

const groups = [
  {
    label: "INFRA",
    items: [
      { to: "/dashboard", label: "运维总览", icon: LayoutDashboard },
      { to: "/infra/hosts", label: "服务器", icon: Server },
      { to: "/infra/services", label: "服务", icon: HardDrive },
      { to: "/infra/billing", label: "续费资产", icon: CalendarClock },
      { to: "/infra/domains", label: "域名", icon: Globe2 },
      { to: "/infra/network-profiles", label: "线路画像", icon: Network },
      { to: "/infra/actions", label: "生成任务", icon: Terminal },
      { to: "/infra/inventory", label: "配置管理", icon: FileText },
      { to: "/infra/generated", label: "生成物", icon: FileText },
      { to: "/infra/discovery", label: "发现合并", icon: Search },
    ],
  },
  {
    label: "ADMIN API",
    items: [
      { to: "/admin/users", label: "用户管理", icon: Users },
      { to: "/admin/roles", label: "角色管理", icon: ShieldCheck },
      { to: "/admin/permissions", label: "权限字典", icon: KeyRound },
      { to: "/admin/settings", label: "系统设置", icon: Settings },
      { to: "/admin/dictionaries", label: "数据字典", icon: ListTree },
      { to: "/admin/audit-logs", label: "审计日志", icon: ClipboardList },
      { to: "/admin/files", label: "文件管理", icon: Folder },
    ],
  },
  {
    label: "WORKBENCH",
    items: [
      { to: "/examples/table", label: "资源列表", icon: Table2 },
      { to: "/examples/form", label: "资源表单", icon: FileText },
      { to: "/examples/detail", label: "节点详情", icon: ClipboardList },
      { to: "/examples/wizard", label: "编排流程", icon: Layers3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [{ to: "/403", label: "权限示例", icon: ShieldCheck }],
  },
];

export function AppSidebar() {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileSidebarOpen = useUiStore((state) => state.mobileSidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const closeMobileSidebar = useUiStore((state) => state.closeMobileSidebar);

  return (
    <>
      <button
        type="button"
        aria-label="关闭导航遮罩"
        onClick={closeMobileSidebar}
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          mobileSidebarOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[232px] border-r border-white/70 bg-white/82 shadow-[12px_0_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all duration-200 ease-out",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[76px]" : "lg:w-[232px]",
        )}
      >
        <div
          className={cn(
            "flex h-[64px] items-center justify-between border-b border-white/70 px-5",
            sidebarCollapsed && "lg:justify-center lg:px-4",
          )}
        >
          <img
            src={appConfig.logoHorizontal}
            alt={appConfig.name}
            className={cn("h-8 w-auto", sidebarCollapsed && "lg:hidden")}
          />
          <img
            src={appConfig.logoMark}
            alt={appConfig.name}
            className={cn("hidden h-8 w-8", sidebarCollapsed && "lg:block")}
          />
          <button
            type="button"
            aria-label="关闭导航"
            onClick={closeMobileSidebar}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 transition hover:bg-white/70 hover:text-slate-950 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav
          aria-label="主导航"
          className={cn(
            "flex h-[calc(100vh-64px)] flex-col gap-6 overflow-y-auto py-5",
            sidebarCollapsed ? "px-4 lg:px-3" : "px-4",
          )}
        >
          {groups.map((group) => (
            <div key={group.label}>
              <div
                className={cn(
                  "mb-3 px-2 text-xs font-medium text-muted-foreground",
                  sidebarCollapsed && "lg:sr-only lg:mb-0",
                )}
              >
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={sidebarCollapsed ? item.label : undefined}
                    aria-label={sidebarCollapsed ? item.label : undefined}
                    onClick={closeMobileSidebar}
                    className={({ isActive }) =>
                      cn(
                        "flex h-10 items-center rounded-md border border-transparent text-sm text-slate-500 transition-all duration-200 ease-out hover:border-white/70 hover:bg-white/70 hover:text-slate-950",
                        sidebarCollapsed
                          ? "gap-3 px-3 lg:justify-center lg:gap-0 lg:px-0"
                          : "gap-3 px-3",
                        isActive &&
                          "border-blue-100 bg-white/90 text-slate-950 shadow-sm hover:bg-white hover:text-slate-950",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className={cn(sidebarCollapsed && "lg:sr-only")}>
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
            title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
            className={cn(
              "mt-auto hidden h-10 items-center rounded-md px-3 text-sm text-slate-500 transition hover:bg-white/70 hover:text-slate-950 lg:flex",
              sidebarCollapsed ? "justify-center px-0" : "gap-3",
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            <span className={cn(sidebarCollapsed && "lg:sr-only")}>
              {sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
            </span>
          </button>
        </nav>
      </aside>
    </>
  );
}
