import {
  CalendarClock,
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
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/cn";

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
  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-[232px] border-r border-white/70 bg-white/72 shadow-[12px_0_40px_rgba(15,23,42,0.06)] backdrop-blur-2xl">
      <div className="flex h-[64px] items-center border-b border-white/70 px-6">
        <img
          src={appConfig.logoHorizontal}
          alt={appConfig.name}
          className="h-8 w-auto"
        />
      </div>
      <nav className="flex h-[calc(100vh-64px)] flex-col gap-6 overflow-y-auto px-4 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-3 px-2 text-xs font-medium text-muted-foreground">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex h-10 items-center gap-3 rounded-md border border-transparent px-3 text-sm text-slate-500 transition-all duration-200 ease-out hover:border-white/70 hover:bg-white/70 hover:text-slate-950",
                      isActive &&
                        "border-blue-100 bg-white/90 text-slate-950 shadow-sm hover:bg-white hover:text-slate-950",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        <button className="mt-auto flex h-10 items-center gap-3 rounded-md px-3 text-sm text-slate-500 transition hover:bg-white/70">
          收起侧边栏
        </button>
      </nav>
    </aside>
  );
}
