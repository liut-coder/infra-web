import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  Globe2,
  HardDrive,
  Network,
  Server,
} from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { GlassButtonSurface, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listInfraBillingAssets,
  listInfraDomains,
  listInfraHosts,
  listInfraNetworkProfiles,
  listInfraServices,
} from "@/features/infra/api";
import type {
  InfraBillingAsset,
  InfraDomain,
  InfraHost,
  InfraNetworkProfile,
  InfraService,
} from "@/features/infra/types";

type AnyResource =
  | InfraHost
  | InfraService
  | InfraBillingAsset
  | InfraDomain
  | InfraNetworkProfile;

type ResourceKind = "hosts" | "services" | "billing" | "domains" | "network";

function stateTone(state?: string) {
  if (state === "managed" || state === "adopted") return "success";
  if (state === "draining" || state === "observed") return "warning";
  if (state === "retired") return "offline";
  return "info";
}

function formatCost(asset: InfraBillingAsset) {
  if (asset.cost == null) return "-";
  return `${asset.currency ?? ""} ${asset.cost}`.trim();
}

function daysUntil(date?: string) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil(ms / 86400000);
}

function DetailDialog({
  title,
  description,
  value,
  open,
  onOpenChange,
  inventoryName,
}: {
  title: string;
  description: string;
  value: AnyResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryName: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,760px)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {value ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["ID", value.id],
                ["Inventory", `${inventoryName}.yml`],
                ["闭环入口", "配置 / 生成 / 审计"],
              ].map(([label, item]) => (
                <GlassPanel key={label} className="p-3">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-2 truncate font-semibold text-slate-950">{item}</div>
                </GlassPanel>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="bg-white/70">
                <Link to="/infra/inventory">
                  <FileText className="h-4 w-4" />
                  配置管理
                </Link>
              </Button>
              <Button asChild variant="secondary" className="bg-white/70">
                <Link to="/infra/generated">
                  <ArrowRight className="h-4 w-4" />
                  查看生成物
                </Link>
              </Button>
              <Button asChild variant="secondary" className="bg-white/70">
                <Link to="/admin/audit-logs">
                  <ArrowRight className="h-4 w-4" />
                  审计追踪
                </Link>
              </Button>
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-md border border-white/70 bg-white/58 p-4 text-xs leading-5 text-slate-700 shadow-inner">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
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
        <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-slate-500">{label}</div>
          <div className="truncate text-xl font-semibold text-slate-950">{value}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{hint}</div>
        </div>
      </div>
    </GlassPanel>
  );
}

function ResourceWorkbench<T extends AnyResource>({
  kind,
  title,
  description,
  icon,
  inventoryName,
  data,
  columns,
  stats,
  detailDescription,
}: {
  kind: ResourceKind;
  title: string;
  description: string;
  icon: React.ReactNode;
  inventoryName: string;
  data: T[];
  columns: ColumnDef<T>[];
  stats: Array<{ label: string; value: React.ReactNode; hint: string }>;
  detailDescription: string;
}) {
  const [selected, setSelected] = useState<T | null>(null);
  const detailColumn = useMemo<ColumnDef<T>>(
    () => ({
      id: "detail",
      header: "",
      cell: ({ row }) => (
        <Button variant="secondary" size="sm" onClick={() => setSelected(row.original)}>
          详情
        </Button>
      ),
    }),
    [],
  );
  const mergedColumns = useMemo(() => [...columns, detailColumn], [columns, detailColumn]);

  return (
    <GlassPage>
      <PageContainer>
        <PageHeader
          title={title}
          description={description}
          actions={
            <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
              {icon}
              <span>{data.length} 条记录</span>
            </GlassButtonSurface>
          }
        />

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <StatCard key={item.label} icon={icon} {...item} />
          ))}
        </div>

        <GlassPanel className="mt-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-950">闭环入口</div>
              <div className="mt-1 text-sm text-slate-500">
                从资源快照跳到配置、生成物和审计，形成可复核路径。
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="bg-white/70">
                <Link to="/infra/inventory">编辑 {inventoryName}.yml</Link>
              </Button>
              <Button asChild variant="secondary" className="bg-white/70">
                <Link to="/infra/generated">生成物</Link>
              </Button>
              <Button asChild variant="secondary" className="bg-white/70">
                <Link to="/infra/actions">执行动作</Link>
              </Button>
            </div>
          </div>
        </GlassPanel>

        <div className="mt-5">
          <DataTable
            data={data}
            columns={mergedColumns}
            total={data.length}
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-slate-500">
                  数据来自 infra-control 生成数据包，配置源为 inventory/{inventoryName}.yml
                </span>
                <StatusBadge tone="info">{kind}</StatusBadge>
              </div>
            }
          />
        </div>

        <DetailDialog
          title={`${title}详情`}
          description={detailDescription}
          value={selected}
          open={Boolean(selected)}
          onOpenChange={(open) => !open && setSelected(null)}
          inventoryName={inventoryName}
        />
      </PageContainer>
    </GlassPage>
  );
}

export function InfraHostsPage() {
  const query = useQuery({ queryKey: ["infra", "hosts"], queryFn: listInfraHosts });
  const rows = query.data ?? [];
  const managed = rows.filter((item) => item.state === "managed" || item.state === "adopted").length;
  const limited = rows.filter((item) => item.traffic?.type === "limited").length;
  const columns = useMemo<ColumnDef<InfraHost>[]>(
    () => [
      { header: "主机", accessorKey: "hostname", cell: ({ row }) => row.original.hostname ?? row.original.id },
      { header: "状态", accessorKey: "state", cell: ({ row }) => <StatusBadge tone={stateTone(row.original.state)}>{row.original.state ?? "unknown"}</StatusBadge> },
      { header: "角色", accessorKey: "role" },
      { header: "区域", accessorKey: "region" },
      { header: "Provider", accessorKey: "provider" },
      { header: "地址", cell: ({ row }) => row.original.vpn_ip ?? row.original.public_ip ?? "-" },
      { header: "线路画像", accessorKey: "network_profile" },
    ],
    [],
  );

  return (
    <ResourceWorkbench
      kind="hosts"
      title="服务器"
      description="来自 hosts inventory 的服务器台账快照。"
      icon={<Server className="h-4 w-4" />}
      inventoryName="hosts"
      data={rows}
      columns={columns}
      stats={[
        { label: "节点总数", value: rows.length, hint: "当前纳入台账的服务器" },
        { label: "已接管", value: managed, hint: "managed / adopted" },
        { label: "限流量", value: limited, hint: "需要关注流量告警" },
      ]}
      detailDescription="查看服务器原始字段，并跳转到配置、生成物和审计追踪。"
    />
  );
}

export function InfraServicesPage() {
  const query = useQuery({ queryKey: ["infra", "services"], queryFn: listInfraServices });
  const rows = query.data ?? [];
  const publicCount = rows.filter((item) => item.visibility === "public").length;
  const managed = rows.filter((item) => item.state === "managed" || item.state === "adopted").length;
  const columns = useMemo<ColumnDef<InfraService>[]>(
    () => [
      { header: "服务", accessorKey: "id" },
      { header: "主机", accessorKey: "host" },
      { header: "类型", accessorKey: "type" },
      { header: "分类", accessorKey: "category" },
      { header: "状态", accessorKey: "state", cell: ({ row }) => <StatusBadge tone={stateTone(row.original.state)}>{row.original.state ?? "unknown"}</StatusBadge> },
      { header: "可见性", accessorKey: "visibility" },
      { header: "URL", accessorKey: "url" },
    ],
    [],
  );

  return (
    <ResourceWorkbench
      kind="services"
      title="服务"
      description="服务清单，串联监控计划、备份关注和访问入口。"
      icon={<HardDrive className="h-4 w-4" />}
      inventoryName="services"
      data={rows}
      columns={columns}
      stats={[
        { label: "服务总数", value: rows.length, hint: "当前纳入服务台账" },
        { label: "已接管", value: managed, hint: "managed / adopted" },
        { label: "公网服务", value: publicCount, hint: "public visibility" },
      ]}
      detailDescription="查看服务部署、监控和可见性上下文。"
    />
  );
}

export function InfraBillingPage() {
  const query = useQuery({ queryKey: ["infra", "billing"], queryFn: listInfraBillingAssets });
  const rows = query.data ?? [];
  const critical = rows.filter((item) => item.importance === "critical").length;
  const renewSoon = rows.filter((item) => {
    const days = daysUntil(item.renewal_date);
    return days != null && days >= 0 && days <= 30;
  }).length;
  const monthlyCost = rows
    .filter((item) => item.cycle === "monthly")
    .reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const columns = useMemo<ColumnDef<InfraBillingAsset>[]>(
    () => [
      { header: "资产", accessorKey: "id" },
      { header: "类型", accessorKey: "type" },
      { header: "Provider", accessorKey: "provider" },
      { header: "关联主机", accessorKey: "linked_host" },
      { header: "费用", cell: ({ row }) => formatCost(row.original) },
      { header: "周期", accessorKey: "cycle" },
      { header: "续费日", accessorKey: "renewal_date" },
      { header: "动作", accessorKey: "action" },
    ],
    [],
  );

  return (
    <ResourceWorkbench
      kind="billing"
      title="续费资产"
      description="VPS、域名和订阅的续费与成本清单。"
      icon={<CalendarClock className="h-4 w-4" />}
      inventoryName="billing"
      data={rows}
      columns={columns}
      stats={[
        { label: "关键资产", value: critical, hint: "importance = critical" },
        { label: "30 天内续费", value: renewSoon, hint: "需要确认续费动作" },
        { label: "月付合计", value: monthlyCost.toFixed(2), hint: "按当前币种混合估算" },
      ]}
      detailDescription="查看续费资产、成本、关联主机与 Wallos 同步上下文。"
    />
  );
}

export function InfraDomainsPage() {
  const query = useQuery({ queryKey: ["infra", "domains"], queryFn: listInfraDomains });
  const rows = query.data ?? [];
  const critical = rows.filter((item) => item.importance === "critical").length;
  const recordCount = rows.reduce((sum, item) => sum + Object.keys(item.records ?? {}).length, 0);
  const columns = useMemo<ColumnDef<InfraDomain>[]>(
    () => [
      { header: "域名", accessorKey: "id" },
      { header: "Provider", accessorKey: "provider" },
      { header: "续费日", accessorKey: "renewal_date" },
      { header: "重要性", accessorKey: "importance", cell: ({ row }) => <StatusBadge tone={row.original.importance === "critical" ? "danger" : "info"}>{row.original.importance ?? "normal"}</StatusBadge> },
      { header: "记录数", cell: ({ row }) => Object.keys(row.original.records ?? {}).length },
    ],
    [],
  );

  return (
    <ResourceWorkbench
      kind="domains"
      title="域名"
      description="域名、DNS 记录和入口可见性台账。"
      icon={<Globe2 className="h-4 w-4" />}
      inventoryName="domains"
      data={rows}
      columns={columns}
      stats={[
        { label: "域名总数", value: rows.length, hint: "纳入续费和 DNS 台账" },
        { label: "关键域名", value: critical, hint: "importance = critical" },
        { label: "DNS 记录", value: recordCount, hint: "所有域名记录合计" },
      ]}
      detailDescription="查看域名续费、DNS 记录和入口可见性上下文。"
    />
  );
}

export function InfraNetworkProfilesPage() {
  const query = useQuery({ queryKey: ["infra", "network-profiles"], queryFn: listInfraNetworkProfiles });
  const rows = query.data ?? [];
  const premium = rows.filter((item) => item.line_type === "premium").length;
  const avgChina = rows.length
    ? Math.round(rows.reduce((sum, item) => sum + (item.score?.china_access ?? 0), 0) / rows.length)
    : 0;
  const columns = useMemo<ColumnDef<InfraNetworkProfile>[]>(
    () => [
      { header: "画像", accessorKey: "id" },
      { header: "主机", accessorKey: "host" },
      { header: "区域", accessorKey: "region" },
      { header: "线路", accessorKey: "line_type" },
      { header: "带宽", cell: ({ row }) => row.original.bandwidth_mbps ? `${row.original.bandwidth_mbps} Mbps` : "-" },
      { header: "中国访问", cell: ({ row }) => row.original.score?.china_access ?? "-" },
      { header: "稳定性", cell: ({ row }) => row.original.score?.stability ?? "-" },
      { header: "性价比", cell: ({ row }) => row.original.score?.cost_effective ?? "-" },
    ],
    [],
  );

  return (
    <ResourceWorkbench
      kind="network"
      title="线路画像"
      description="三网 TCP-Ping 与适用角色画像。"
      icon={<Network className="h-4 w-4" />}
      inventoryName="network"
      data={rows}
      columns={columns}
      stats={[
        { label: "画像总数", value: rows.length, hint: "已建立线路画像" },
        { label: "优质线路", value: premium, hint: "line_type = premium" },
        { label: "中国访问均分", value: avgChina, hint: "按当前 score 估算" },
      ]}
      detailDescription="查看线路评分、用途建议和探针上下文。"
    />
  );
}
