import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, Clock3, Database, FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
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
import { Input } from "@/components/ui/input";
import { listAuditLogs } from "@/features/admin/api";
import type { AuditLogRecord } from "@/features/admin/types";
import { asErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export function AdminAuditLogsPage() {
  const [search, setSearch] = useState("");
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [selected, setSelected] = useState<AuditLogRecord | null>(null);
  const [page, setPage] = useState(1);

  const auditQuery = useQuery({
    queryKey: ["admin", "audit-logs", page, search, resource, action],
    queryFn: () =>
      listAuditLogs({
        page,
        pageSize: 12,
        actorUserId: search || undefined,
        resource: resource || undefined,
        action: action || undefined,
      }),
  });

  const rows = auditQuery.data?.items ?? [];
  const pagination = auditQuery.data?.pagination;
  const infraCount = rows.filter((item) => item.resource.startsWith("infra_")).length;
  const highRiskCount = rows.filter((item) => Boolean(item.metadata?.highRisk)).length;
  const resourcePresets = [
    { label: "全部", value: "" },
    { label: "动作", value: "infra_action" },
    { label: "配置", value: "infra_inventory" },
    { label: "主机", value: "infra_host" },
    { label: "认证", value: "auth" },
  ];

  const columns = useMemo<ColumnDef<AuditLogRecord>[]>(
    () => [
      {
        accessorKey: "action",
        header: "动作",
        cell: ({ row }) => (
          <StatusBadge tone="info">{row.original.action}</StatusBadge>
        ),
      },
      {
        accessorKey: "resource",
        header: "资源",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-950">{row.original.resource}</div>
            {row.original.metadata?.highRisk ? (
              <div className="mt-1 text-xs text-amber-700">high risk</div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "resourceId",
        header: "资源 ID",
        cell: ({ row }) => row.original.resourceId || "-",
      },
      {
        accessorKey: "actorUserId",
        header: "操作者",
        cell: ({ row }) => row.original.actorUserId || "system",
      },
      { accessorKey: "ipAddress", header: "IP" },
      {
        accessorKey: "createdAt",
        header: "时间",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "detail",
        header: "",
        cell: ({ row }) => (
          <Button variant="secondary" size="sm" onClick={() => setSelected(row.original)}>
            详情
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <GlassPage>
      <PageContainer>
      <PageHeader
        title="审计日志"
        description="查看登录、配置保存、infra 动作和高风险操作的追踪记录。"
        actions={
          <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
            <Activity className="h-4 w-4" />
            {auditQuery.isFetching ? "刷新中" : "实时查询"}
          </GlassButtonSurface>
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["审计范围", "登录 / 配置 / infra 动作", ShieldCheck],
          ["当前记录", (pagination?.total ?? rows.length).toString(), Activity],
          ["高风险", `${highRiskCount} / 本页`, ShieldAlert],
        ].map(([title, value, Icon]) => (
          <GlassPanel key={title as string} className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-slate-500">{title as string}</div>
                <div className="truncate font-semibold text-slate-950">{value as string}</div>
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>
      <GlassPanel className="mt-5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {resourcePresets.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setResource(item.value);
                setPage(1);
              }}
              className={`rounded-md border px-3 py-2 text-sm transition-all duration-200 ${
                resource === item.value
                  ? "border-blue-100 bg-white text-blue-700 shadow-sm"
                  : "border-white/70 bg-white/55 text-slate-600 hover:-translate-y-0.5 hover:bg-white/85"
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
            <Database className="h-4 w-4" />
            infra 本页 {infraCount} 条
          </div>
        </div>
      </GlassPanel>
      <div className="mt-5 space-y-5">
        <FilterBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="按操作者 UUID 过滤"
        >
          <Input
            className="w-40 border-white/70 bg-white/65"
            placeholder="资源，如 user"
            value={resource}
            onChange={(event) => {
              setResource(event.target.value);
              setPage(1);
            }}
          />
          <Input
            className="w-40 border-white/70 bg-white/65"
            placeholder="动作，如 login"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          />
        </FilterBar>
        <DataTable
          data={rows}
          columns={columns}
          total={pagination?.total}
          page={pagination?.page}
          pageCount={pagination?.totalPages}
          onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
          onNextPage={() =>
            setPage((value) =>
              Math.min(pagination?.totalPages ?? value, value + 1),
            )
          }
          isPreviousDisabled={(pagination?.page ?? 1) <= 1}
          isNextDisabled={
            (pagination?.page ?? 1) >= (pagination?.totalPages ?? 1)
          }
          toolbar={
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">
                数据来自 /api/v1/audit-logs，infra 动作会自动记录命令结果摘要
              </span>
              {auditQuery.error ? (
                <span className="text-sm text-red-600">
                  {asErrorMessage(auditQuery.error)}
                </span>
              ) : null}
            </div>
          }
        />
      </div>
      <AuditDetailDialog log={selected} onOpenChange={(open) => !open && setSelected(null)} />
      </PageContainer>
    </GlassPage>
  );
}

function metadataList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function AuditDetailDialog({
  log,
  onOpenChange,
}: {
  log: AuditLogRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const artifacts = metadataList(log?.metadata?.artifacts);
  return (
    <Dialog open={Boolean(log)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,760px)]">
        <DialogHeader>
          <DialogTitle>审计详情</DialogTitle>
          <DialogDescription>
            {log ? `${log.resource} / ${log.resourceId || "-"} / ${formatDateTime(log.createdAt)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {log ? (
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <GlassPanel className="p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Activity className="h-4 w-4 text-blue-600" />
                  动作
                </div>
                <div className="mt-2 font-semibold text-slate-950">{log.action}</div>
              </GlassPanel>
              <GlassPanel className="p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  风险
                </div>
                <div className="mt-2 font-semibold text-slate-950">
                  {log.metadata?.highRisk ? "高风险" : "普通"}
                </div>
              </GlassPanel>
              <GlassPanel className="p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 className="h-4 w-4 text-green-600" />
                  Exit
                </div>
                <div className="mt-2 font-semibold text-slate-950">
                  {String(log.metadata?.exitCode ?? "-")}
                </div>
              </GlassPanel>
              <GlassPanel className="p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="h-4 w-4 text-violet-600" />
                  产物
                </div>
                <div className="mt-2 font-semibold text-slate-950">{artifacts.length}</div>
              </GlassPanel>
            </div>
            {artifacts.length ? (
              <div className="rounded-md border border-white/70 bg-white/50 p-3">
                <div className="mb-2 text-xs font-medium text-slate-500">产物</div>
                <div className="flex flex-wrap gap-2">
                  {artifacts.map((artifact) => (
                    <span key={artifact} className="rounded-md border border-white/80 bg-white/70 px-2.5 py-1 text-xs text-slate-600">
                      {artifact}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <pre className="max-h-52 overflow-auto rounded-md border border-white/70 bg-white/55 p-3 text-xs leading-5 text-slate-700">
                {String(log.metadata?.stdoutTail ?? "no stdout")}
              </pre>
              <pre className="max-h-52 overflow-auto rounded-md border border-white/70 bg-white/55 p-3 text-xs leading-5 text-slate-700">
                {String(log.metadata?.stderrTail ?? "no stderr")}
              </pre>
            </div>
            <pre className="max-h-72 overflow-auto rounded-md border border-white/70 bg-white/58 p-4 text-xs leading-5 text-slate-700 shadow-inner">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
