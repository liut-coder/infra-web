import {
  Activity,
  Cpu,
  Database,
  FileCode2,
  Globe2,
  HardDrive,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryPanel } from "@/components/shared/SummaryPanel";
import { Button } from "@/components/ui/button";

const relations = [
  { name: "api-gateway", status: "运行中", hint: "public / health check", icon: Globe2 },
  { name: "postgres-main", status: "运行中", hint: "vpn_only / backup required", icon: Database },
  { name: "metrics-agent", status: "运行中", hint: "observed from Komari", icon: Activity },
];

const timeline = [
  "Komari API 刷新系统事实字段",
  "生成 Uptime Kuma monitor preview",
  "续费策略同步到 Wallos 草稿",
  "Ansible inventory 已重新生成",
];

export function DetailExamplePage() {
  return (
    <GlassPage>
      <PageContainer>
        <PageHeader
          title="节点详情工作台"
          description="control-01 / 香港 HK / 203.0.113.12，展示单节点从发现、配置到生成物的闭环视图。"
          actions={
            <>
              <Button variant="secondary" className="bg-white/70">
                <RefreshCw className="h-4 w-4" />
                巡检
              </Button>
              <Button className="border border-blue-100 bg-white text-blue-700 shadow-sm hover:bg-white/85">
                <FileCode2 className="h-4 w-4" />
                编辑 YAML
              </Button>
            </>
          }
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge tone="online">managed</StatusBadge>
          <StatusBadge tone="info">control</StatusBadge>
          <StatusBadge tone="info">vpn_only</StatusBadge>
          <StatusBadge tone="success">monitor ready</StatusBadge>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="CPU"
            value="46%"
            hint="8 核 / Komari API"
            icon={<Cpu className="h-5 w-5" />}
          />
          <StatCard
            label="内存"
            value="31%"
            hint="4.9 GB 使用中"
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="磁盘"
            value="15%"
            hint="120 GB SSD"
            icon={<HardDrive className="h-5 w-5" />}
          />
          <StatCard
            label="安全"
            value="正常"
            hint="最近巡检 5 分钟前"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5">
            <GlassPanel className="p-5">
              <div className="mb-5 text-base font-semibold text-slate-950">服务关系</div>
              {relations.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between border-b border-white/70 py-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-white/80 text-blue-600 shadow-sm ring-1 ring-blue-100">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-950">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.hint}</div>
                    </div>
                  </div>
                  <StatusBadge tone="success">{item.status}</StatusBadge>
                </div>
              ))}
            </GlassPanel>
            <GlassPanel className="p-5">
              <div className="mb-4 text-base font-semibold text-slate-950">闭环时间线</div>
              <div className="space-y-3">
                {timeline.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-md border border-white/70 bg-white/50 p-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-blue-100 bg-white text-xs font-semibold text-blue-700 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="text-sm text-slate-700">{item}</div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
          <SummaryPanel
            title="资源信息"
            items={[
              { label: "公网 IP", value: "203.0.113.12" },
              { label: "VPN IP", value: "10.8.0.1" },
              { label: "区域", value: "香港 HK" },
              { label: "规格", value: "Standard 8C16G" },
              { label: "续费时间", value: "2026-06-20 23:59" },
              { label: "负责人", value: "admin@nax.local" },
            ]}
          />
        </div>
      </PageContainer>
    </GlassPage>
  );
}
