import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  FileText,
  Globe2,
  HardDrive,
  LayoutDashboard,
  Network,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

interface CommandItem {
  title: string;
  description: string;
  to: string;
  group: string;
  keywords: string;
  icon: React.ReactNode;
}

const commands: CommandItem[] = [
  { title: "运维总览", description: "查看闭环、风险队列和资源摘要", to: "/dashboard", group: "Infra", keywords: "dashboard overview 总览", icon: <LayoutDashboard className="h-4 w-4" /> },
  { title: "配置管理", description: "可视化维护 inventory，YAML 高级模式", to: "/infra/inventory", group: "Infra", keywords: "inventory yml yaml 配置", icon: <FileText className="h-4 w-4" /> },
  { title: "发现合并", description: "Komari API 发现节点并合并", to: "/infra/discovery", group: "Infra", keywords: "komari discovery merge 发现 合并", icon: <Search className="h-4 w-4" /> },
  { title: "生成任务", description: "执行校验、生成、同步和退役动作", to: "/infra/actions", group: "Infra", keywords: "actions generate sync retire 任务", icon: <Terminal className="h-4 w-4" /> },
  { title: "生成物", description: "查看报告、计划、预览和数据包", to: "/infra/generated", group: "Infra", keywords: "generated report plan artifact 生成物", icon: <Sparkles className="h-4 w-4" /> },
  { title: "服务器", description: "查看 hosts 台账和节点详情", to: "/infra/hosts", group: "Resources", keywords: "hosts servers vps 节点 服务器", icon: <Server className="h-4 w-4" /> },
  { title: "服务", description: "查看服务清单、监控和可见性", to: "/infra/services", group: "Resources", keywords: "services monitor backup 服务", icon: <HardDrive className="h-4 w-4" /> },
  { title: "续费资产", description: "查看成本、续费日期和 Wallos 同步", to: "/infra/billing", group: "Resources", keywords: "billing renew cost wallos 续费", icon: <CalendarClock className="h-4 w-4" /> },
  { title: "域名", description: "查看域名、DNS 和入口映射", to: "/infra/domains", group: "Resources", keywords: "domains dns 域名", icon: <Globe2 className="h-4 w-4" /> },
  { title: "线路画像", description: "查看 TCP-Ping 线路评分", to: "/infra/network-profiles", group: "Resources", keywords: "network profiles probe 线路", icon: <Network className="h-4 w-4" /> },
  { title: "审计日志", description: "追踪配置保存、高风险动作和登录", to: "/admin/audit-logs", group: "Admin", keywords: "audit logs 审计", icon: <ClipboardList className="h-4 w-4" /> },
  { title: "用户管理", description: "管理后台用户与角色", to: "/admin/users", group: "Admin", keywords: "users admin 用户", icon: <Users className="h-4 w-4" /> },
  { title: "角色管理", description: "管理权限和角色绑定", to: "/admin/roles", group: "Admin", keywords: "roles permission 权限 角色", icon: <ShieldCheck className="h-4 w-4" /> },
  { title: "系统设置", description: "查看和维护系统配置", to: "/admin/settings", group: "Admin", keywords: "settings 系统设置", icon: <Settings className="h-4 w-4" /> },
  { title: "健康状态", description: "查看 API 与演示 fallback 状态", to: "/admin/audit-logs", group: "Admin", keywords: "health api status 状态", icon: <Activity className="h-4 w-4" /> },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return commands;
    return commands.filter((item) =>
      `${item.title} ${item.description} ${item.group} ${item.keywords}`.toLowerCase().includes(keyword),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  const run = (item: CommandItem) => {
    navigate(item.to);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[18vh] w-[min(92vw,720px)] translate-y-0 p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="border-b border-white/70 px-5 py-4">
          <DialogTitle>快速跳转</DialogTitle>
          <DialogDescription>输入页面、资源或动作名称，回车进入。</DialogDescription>
        </DialogHeader>
        <div className="border-b border-white/70 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((value) => Math.min(filtered.length - 1, value + 1));
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((value) => Math.max(0, value - 1));
                }
                if (event.key === "Enter" && filtered[active]) {
                  event.preventDefault();
                  run(filtered[active]);
                }
              }}
              className="h-11 border-white/70 bg-white/70 pl-9"
              placeholder="搜索：发现合并、生成物、服务器、审计..."
            />
          </div>
        </div>
        <div className="max-h-[460px] overflow-auto p-3">
          {filtered.length ? (
            <div className="grid gap-1">
              {filtered.map((item, index) => (
                <button
                  key={`${item.group}-${item.title}`}
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => run(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-all duration-150",
                    active === index
                      ? "border border-blue-100 bg-white/90 text-slate-950 shadow-sm"
                      : "border border-transparent text-slate-600 hover:border-white/70 hover:bg-white/70 hover:text-slate-950",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-md ring-1",
                      active === index ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-blue-50 text-blue-700 ring-blue-100",
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{item.title}</span>
                      <span className={cn("text-xs", active === index ? "text-blue-500" : "text-slate-400")}>
                        {item.group}
                      </span>
                    </span>
                    <span className={cn("mt-1 block truncate text-xs", active === index ? "text-slate-500" : "text-slate-500")}>
                      {item.description}
                    </span>
                  </span>
                  <span className={cn("text-xs", active === index ? "text-blue-500" : "text-slate-400")}>
                    Enter
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-md border border-white/70 bg-white/45 px-6 py-12 text-center text-sm text-slate-500">
              没有匹配的入口。
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
