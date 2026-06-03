import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Globe2,
  HardDrive,
  Server,
  ShieldAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listAuditLogs } from "@/features/admin/api";
import { getInfraOverview } from "@/features/infra/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

interface Notice {
  id: string;
  title: string;
  description: string;
  tone: "danger" | "warning" | "info" | "success";
  to: string;
  icon: React.ReactNode;
}

function daysUntil(date?: string) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil(ms / 86400000);
}

const toneClass: Record<Notice["tone"], string> = {
  danger: "bg-red-50 text-red-700 ring-red-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  info: "bg-blue-50 text-blue-700 ring-blue-100",
  success: "bg-green-50 text-green-700 ring-green-100",
};

export function NotificationCenter() {
  const navigate = useNavigate();
  const overviewQuery = useQuery({
    queryKey: ["infra", "overview", "notification-center"],
    queryFn: getInfraOverview,
  });
  const auditQuery = useQuery({
    queryKey: ["admin", "audit-logs", "notification-center"],
    queryFn: async () => {
      const [actions, hosts] = await Promise.all([
        listAuditLogs({
          page: 1,
          pageSize: 5,
          resource: "infra_action",
        }),
        listAuditLogs({
          page: 1,
          pageSize: 5,
          resource: "infra_host",
        }),
      ]);
      return [...actions.items, ...hosts.items]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    },
  });

  const notices = useMemo<Notice[]>(() => {
    const overview = overviewQuery.data;
    const renewSoon = (overview?.billing ?? [])
      .filter((asset) => {
        const days = daysUntil(asset.renewal_date);
        return days != null && days >= 0 && days <= 30;
      })
      .slice(0, 2)
      .map((asset) => ({
        id: `renew-${asset.id}`,
        title: `${asset.id} 即将续费`,
        description: `${asset.renewal_date ?? "-"} / ${asset.provider ?? "unknown"}`,
        tone: "danger" as const,
        to: "/infra/billing",
        icon: <CalendarClock className="h-4 w-4" />,
      }));
    const publicServices = (overview?.services ?? [])
      .filter((service) => service.visibility === "public")
      .slice(0, 2)
      .map((service) => ({
        id: `public-${service.id}`,
        title: `${service.id} 暴露公网`,
        description: service.url ?? service.host ?? "public service",
        tone: "warning" as const,
        to: "/infra/services",
        icon: <HardDrive className="h-4 w-4" />,
      }));
    const observedHosts = (overview?.hosts ?? [])
      .filter((host) => host.state === "observed")
      .slice(0, 2)
      .map((host) => ({
        id: `observed-${host.id}`,
        title: `${host.hostname ?? host.id} 待接管`,
        description: `${host.provider ?? "unknown"} / ${host.region ?? "unknown"}`,
        tone: "info" as const,
        to: "/infra/hosts",
        icon: <Server className="h-4 w-4" />,
      }));
    const highRiskAudits = (auditQuery.data ?? [])
      .filter((log) => Boolean(log.metadata?.highRisk))
      .slice(0, 1)
      .map((log) => ({
        id: `audit-${log.id}`,
        title: "高风险动作已记录",
        description: `${log.resourceId ?? log.action} / ${formatDateTime(log.createdAt)}`,
        tone: "warning" as const,
        to: "/admin/audit-logs",
        icon: <ShieldAlert className="h-4 w-4" />,
      }));

    const merged = [...renewSoon, ...publicServices, ...observedHosts, ...highRiskAudits];
    if (merged.length) return merged;
    return [
      {
        id: "stable",
        title: "当前没有明显待处理项",
        description: "配置、生成和审计链路保持安静。",
        tone: "success",
        to: "/dashboard",
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
    ];
  }, [auditQuery.data, overviewQuery.data]);

  const count = notices.filter((item) => item.tone !== "success").length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative grid h-9 w-9 place-items-center rounded-md text-slate-600 transition hover:bg-white/70 hover:text-slate-950">
          <Bell className="h-4 w-4" />
          {count ? (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-white px-1 text-[10px] text-red-600 shadow-sm ring-1 ring-red-100">
              {count}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-2">
        <div className="px-3 py-2">
          <div className="font-semibold text-slate-950">通知中心</div>
          <div className="mt-1 text-xs text-slate-500">续费、公网服务、待接管节点和高风险审计。</div>
        </div>
        <div className="mt-1 grid gap-1">
          {notices.map((notice) => (
            <button
              key={notice.id}
              type="button"
              onClick={() => navigate(notice.to)}
              className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-all duration-200 hover:bg-white/70"
            >
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md ring-1", toneClass[notice.tone])}>
                {notice.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-950">{notice.title}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">{notice.description}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/70 px-3 pt-3">
          <button
            type="button"
            onClick={() => navigate("/infra/actions")}
            className="rounded-md border border-white/70 bg-white/55 px-3 py-2 text-xs text-slate-600 transition hover:bg-white/85"
          >
            执行动作
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/audit-logs")}
            className="rounded-md border border-white/70 bg-white/55 px-3 py-2 text-xs text-slate-600 transition hover:bg-white/85"
          >
            查看审计
          </button>
        </div>
        {overviewQuery.isError ? (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-700">
            <Globe2 className="h-4 w-4" />
            overview 暂不可用，显示演示提醒。
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
