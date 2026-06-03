import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  Database,
  FileText,
  GitMerge,
  Globe2,
  HardDrive,
  Network,
  Radar,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { GlassBackdrop, GlassButtonSurface, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { getInfraOverview } from "@/features/infra/api";

function stateTone(state?: string) {
  if (state === "managed" || state === "adopted") return "success";
  if (state === "draining" || state === "observed") return "warning";
  if (state === "retired") return "offline";
  return "info";
}

function formatMoney(cost?: number, currency?: string, cycle?: string) {
  if (cost == null) return "-";
  return `${currency ?? ""} ${cost}/${cycle ?? "cycle"}`.trim();
}

function daysUntil(date?: string) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil(ms / 86400000);
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <GlassPanel className="p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold text-slate-950">{value}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{hint}</div>
        </div>
      </div>
    </GlassPanel>
  );
}

function FlowStep({
  index,
  title,
  description,
  to,
  icon,
}: {
  index: number;
  title: string;
  description: string;
  to: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group rounded-md border border-white/75 bg-white/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-blue-100 bg-white text-sm font-semibold text-blue-700 shadow-sm">
          {index}
        </div>
        <div className="text-blue-600 transition-transform group-hover:translate-x-1">{icon}</div>
      </div>
      <div className="font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-sm leading-5 text-slate-500">{description}</div>
    </Link>
  );
}

export function DashboardPage() {
  const infraQuery = useQuery({
    queryKey: ["infra", "overview"],
    queryFn: getInfraOverview,
  });
  const data = infraQuery.data;
  const renewSoon = useMemo(
    () =>
      (data?.billing ?? []).filter((asset) => {
        const days = daysUntil(asset.renewal_date);
        return days != null && days >= 0 && days <= 30;
      }),
    [data?.billing],
  );
  const publicServices = useMemo(
    () => (data?.services ?? []).filter((service) => service.visibility === "public"),
    [data?.services],
  );
  const observedHosts = useMemo(
    () => (data?.hosts ?? []).filter((host) => host.state === "observed"),
    [data?.hosts],
  );
  const riskCount = renewSoon.length + publicServices.length + observedHosts.length;

  return (
    <GlassPage>
      <GlassBackdrop />
      <PageContainer className="relative z-10">
        <div className="mb-6 rounded-lg border border-white/75 bg-white/55 p-6 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          <PageHeader
            title="Infra Control"
            description="从配置、发现、生成、审计串起个人基础设施的完整运维闭环。"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
                  <Activity className="h-4 w-4" />
                  <span>
                    {infraQuery.isLoading
                      ? "同步中"
                      : data?.metadata.generatedAt
                        ? `生成于 ${new Date(data.metadata.generatedAt).toLocaleString()}`
                        : "等待数据"}
                  </span>
                </GlassButtonSurface>
                <Button asChild>
                  <Link to="/infra/actions">
                    <RefreshCw className="h-4 w-4" />
                    执行任务
                  </Link>
                </Button>
              </div>
            }
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="服务器" value={data?.stats.hosts ?? "-"} hint={`${data?.stats.limitedTrafficHosts ?? 0} 台限流`} icon={<Server className="h-5 w-5" />} />
          <MetricCard label="服务" value={data?.stats.services ?? "-"} hint={`${data?.stats.publicServices ?? 0} 个公网服务`} icon={<HardDrive className="h-5 w-5" />} />
          <MetricCard label="续费资产" value={data?.stats.billingAssets ?? "-"} hint={`${data?.stats.criticalRenewals ?? 0} 个关键项`} icon={<CalendarClock className="h-5 w-5" />} />
          <MetricCard label="域名" value={data?.stats.domains ?? "-"} hint="DNS 与入口映射" icon={<Globe2 className="h-5 w-5" />} />
          <MetricCard label="线路画像" value={data?.stats.networkProfiles ?? "-"} hint="TCP-Ping profile" icon={<Network className="h-5 w-5" />} />
        </div>

        {infraQuery.isError ? (
          <div className="mt-6">
            <EmptyState
              title="未读到 infra-control 数据"
              description="请先执行 demo 或 generate，API 会读取 generated/web 或 generated/demo 的数据包。"
              action={
                <Button asChild>
                  <Link to="/infra/actions">去生成数据</Link>
                </Button>
              }
            />
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <GlassPanel className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-950">运维闭环</div>
                <div className="mt-1 text-sm text-slate-500">配置事实、发现节点、生成产物、审计追踪。</div>
              </div>
              <StatusBadge tone={riskCount ? "warning" : "success"}>
                {riskCount ? `${riskCount} 个关注项` : "稳定"}
              </StatusBadge>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <FlowStep index={1} title="配置事实" description="可视化维护 inventory，YAML 作为高级模式。" to="/infra/inventory" icon={<FileText className="h-4 w-4" />} />
              <FlowStep index={2} title="发现合并" description="Komari API 拉取节点，审核后合并。" to="/infra/discovery" icon={<Radar className="h-4 w-4" />} />
              <FlowStep index={3} title="生成同步" description="生成报告、同步预览和外部面板计划。" to="/infra/actions" icon={<GitMerge className="h-4 w-4" />} />
              <FlowStep index={4} title="审计复核" description="高风险动作、配置保存和退役留痕。" to="/admin/audit-logs" icon={<ShieldCheck className="h-4 w-4" />} />
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-950">风险队列</div>
              <StatusBadge tone={riskCount ? "warning" : "success"}>{riskCount}</StatusBadge>
            </div>
            <div className="grid gap-3">
              {renewSoon.slice(0, 3).map((asset) => (
                <Link key={asset.id} to="/infra/billing" className="rounded-md border border-white/70 bg-white/50 p-3 transition hover:bg-white/85">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate font-medium text-slate-950">{asset.id}</div>
                    <StatusBadge tone="danger">{asset.renewal_date ?? "-"}</StatusBadge>
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-500">{asset.provider ?? "-"} / {formatMoney(asset.cost, asset.currency, asset.cycle)}</div>
                </Link>
              ))}
              {publicServices.slice(0, 2).map((service) => (
                <Link key={service.id} to="/infra/services" className="rounded-md border border-white/70 bg-white/50 p-3 transition hover:bg-white/85">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate font-medium text-slate-950">{service.id}</div>
                    <StatusBadge tone="warning">public</StatusBadge>
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-500">{service.host ?? "-"} / {service.url ?? service.description ?? "-"}</div>
                </Link>
              ))}
              {observedHosts.slice(0, 2).map((host) => (
                <Link key={host.id} to="/infra/hosts" className="rounded-md border border-white/70 bg-white/50 p-3 transition hover:bg-white/85">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate font-medium text-slate-950">{host.hostname ?? host.id}</div>
                    <StatusBadge tone="warning">observed</StatusBadge>
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-500">{host.provider ?? "-"} / {host.region ?? "-"}</div>
                </Link>
              ))}
              {!riskCount ? (
                <div className="rounded-md border border-white/70 bg-white/50 p-4 text-sm text-slate-500">
                  当前没有明显关注项。
                </div>
              ) : null}
            </div>
          </GlassPanel>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <GlassPanel className="p-5">
            <PanelHeader title="服务器台账" to="/infra/hosts" />
            {(data?.hosts ?? []).slice(0, 5).map((host) => (
              <Row key={host.id} title={host.hostname ?? host.id} desc={`${host.role ?? "-"} / ${host.region ?? "-"} / ${host.vpn_ip ?? host.public_ip ?? "-"}`}>
                <StatusBadge tone={stateTone(host.state)}>{host.state ?? "unknown"}</StatusBadge>
              </Row>
            ))}
          </GlassPanel>

          <GlassPanel className="p-5">
            <PanelHeader title="服务清单" to="/infra/services" />
            {(data?.services ?? []).slice(0, 5).map((service) => (
              <Row key={service.id} title={service.id} desc={`${service.type ?? "-"} / ${service.host ?? "-"} / ${service.url ?? service.description ?? "-"}`}>
                <StatusBadge tone={service.visibility === "public" ? "warning" : "info"}>{service.visibility ?? "unknown"}</StatusBadge>
              </Row>
            ))}
          </GlassPanel>

          <GlassPanel className="p-5">
            <PanelHeader title="线路画像" to="/infra/network-profiles" />
            {(data?.networkProfiles ?? []).slice(0, 5).map((profile) => (
              <Row key={profile.id} title={profile.id} desc={`中国 ${profile.score?.china_access ?? "-"} / 稳定 ${profile.score?.stability ?? "-"} / 性价比 ${profile.score?.cost_effective ?? "-"}`}>
                <StatusBadge tone="info">{profile.line_type ?? "standard"}</StatusBadge>
              </Row>
            ))}
          </GlassPanel>
        </div>

        <GlassPanel className="mt-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-950">数据来源</div>
                <div className="mt-1 text-sm text-slate-500">
                  {data?.metadata.dataPath ?? "等待 infra-control 数据包"}
                </div>
              </div>
            </div>
            <Button asChild variant="secondary" className="bg-white/70">
              <Link to="/infra/generated">
                <Sparkles className="h-4 w-4" />
                查看生成物
              </Link>
            </Button>
          </div>
        </GlassPanel>
      </PageContainer>
    </GlassPage>
  );
}

function PanelHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="text-base font-semibold text-slate-950">{title}</div>
      <Button asChild variant="ghost" size="sm">
        <Link to={to}>
          查看
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-white/70 py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="truncate font-medium text-slate-950">{title}</div>
        {children}
      </div>
      <div className="mt-1 truncate text-xs text-slate-500">{desc}</div>
    </div>
  );
}
