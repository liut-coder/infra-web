import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FolderOutput,
  Play,
  Radar,
  RefreshCw,
  Send,
  ShieldAlert,
  Terminal,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { GlassButtonSurface, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { listAuditLogs } from "@/features/admin/api";
import type { AuditLogRecord } from "@/features/admin/types";
import { applyInfraRetirement, listInfraActionCatalog, runInfraAction } from "@/features/infra/api";
import type { InfraAction, InfraActionCatalogItem, InfraCommandResult } from "@/features/infra/types";
import { formatDateTime } from "@/lib/format";

const actionGroups = ["准备", "生成", "同步", "生命周期"];

const actionIcons: Partial<Record<InfraAction, React.ReactNode>> = {
  status: <Activity className="h-4 w-4" />,
  validate: <FileCheck2 className="h-4 w-4" />,
  bootstrap: <FileCheck2 className="h-4 w-4" />,
  "bootstrap-new": <FileCheck2 className="h-4 w-4" />,
  demo: <RefreshCw className="h-4 w-4" />,
  generate: <Play className="h-4 w-4" />,
  "discover-komari": <Radar className="h-4 w-4" />,
  "merge-preview": <FolderOutput className="h-4 w-4" />,
  "merge-apply": <ShieldAlert className="h-4 w-4" />,
  "adopt-scan": <Radar className="h-4 w-4" />,
  "retire-check": <Trash2 className="h-4 w-4" />,
  "sync-uptime-kuma-preview": <Send className="h-4 w-4" />,
  "sync-uptime-kuma-apply": <Send className="h-4 w-4" />,
  "sync-wallos-preview": <Send className="h-4 w-4" />,
  "sync-wallos-apply": <Send className="h-4 w-4" />,
};

function formatDuration(startedAt: string, finishedAt: string) {
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function CommandOutput({ result }: { result: InfraCommandResult | null }) {
  if (!result) {
    return (
      <div className="grid min-h-[280px] place-items-center rounded-md border border-white/70 bg-white/45 text-sm text-slate-500">
        选择一个任务运行后，输出会显示在这里。
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/70 bg-white/65 p-4 font-mono text-xs text-slate-700 shadow-inner backdrop-blur">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-slate-500">
        <StatusBadge tone={result.exitCode === 0 ? "success" : "danger"}>exit {result.exitCode}</StatusBadge>
        <span>{result.cwd}</span>
      </div>
      <div className="mb-3 rounded-md border border-white/70 bg-white/70 px-3 py-2 text-slate-950">
        $ {result.command.join(" ")}
      </div>
      <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap leading-6">
        {result.stdout || result.stderr || "no output"}
      </pre>
      {result.stderr ? (
        <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap border-t border-red-100 pt-4 text-red-600">
          {result.stderr}
        </pre>
      ) : null}
    </div>
  );
}

function ResultSummary({ result }: { result: InfraCommandResult | null }) {
  if (!result) {
    return (
      <div className="grid gap-3 rounded-md border border-white/70 bg-white/45 p-4 text-sm text-slate-500">
        <div className="font-medium text-slate-700">闭环状态</div>
        <div>任务运行后这里会展示审计、确认、产物和耗时。</div>
      </div>
    );
  }

  const artifacts = result.artifacts ?? [];
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-md border border-white/70 bg-white/55 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            审计
          </div>
          <div className="mt-2 font-semibold text-slate-950">已记录</div>
        </div>
        <div className="rounded-md border border-white/70 bg-white/55 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            风险
          </div>
          <div className="mt-2 font-semibold text-slate-950">{result.highRisk ? "需确认" : "普通"}</div>
        </div>
        <div className="rounded-md border border-white/70 bg-white/55 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 className="h-4 w-4 text-blue-600" />
            耗时
          </div>
          <div className="mt-2 font-semibold text-slate-950">
            {formatDuration(result.startedAt, result.finishedAt)}
          </div>
        </div>
        <div className="rounded-md border border-white/70 bg-white/55 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FolderOutput className="h-4 w-4 text-violet-600" />
            产物
          </div>
          <div className="mt-2 font-semibold text-slate-950">{artifacts.length}</div>
        </div>
      </div>
      {artifacts.length ? (
        <div className="rounded-md border border-white/70 bg-white/50 p-3">
          <div className="mb-2 text-xs font-medium text-slate-500">预计更新</div>
          <div className="flex flex-wrap gap-2">
            {artifacts.map((artifact) => (
              <span
                key={artifact}
                className="rounded-md border border-white/80 bg-white/70 px-2.5 py-1 text-xs text-slate-600 shadow-sm"
              >
                {artifact}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AuditTimeline({ logs }: { logs: AuditLogRecord[] }) {
  if (!logs.length) {
    return (
      <div className="rounded-md border border-white/70 bg-white/45 p-4 text-sm text-slate-500">
        暂无 infra 审计记录。执行一次任务后会自动刷新。
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {logs.map((log) => {
        const exitCode = log.metadata?.exitCode;
        const highRisk = Boolean(log.metadata?.highRisk);
        return (
          <div
            key={log.id}
            className="rounded-md border border-white/70 bg-white/55 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/80"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <StatusBadge tone={String(log.action).includes("failed") ? "danger" : "info"}>
                  {log.action}
                </StatusBadge>
                <span className="truncate text-sm font-medium text-slate-950">
                  {log.resourceId || log.resource}
                </span>
              </div>
              <span className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{log.resource}</span>
              {typeof exitCode === "number" ? <span>exit {exitCode}</span> : null}
              {highRisk ? <span className="text-amber-700">high risk</span> : null}
              <span>{log.actorUserId || "system"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InfraActionsPage() {
  const [lastResult, setLastResult] = useState<InfraCommandResult | null>(null);
  const [pendingAction, setPendingAction] = useState<InfraActionCatalogItem | null>(null);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [retireOpen, setRetireOpen] = useState(false);
  const [retireHost, setRetireHost] = useState("");
  const [retireForce, setRetireForce] = useState(false);
  const [retireConfirmation, setRetireConfirmation] = useState("");
  const queryClient = useQueryClient();
  const catalogQuery = useQuery({
    queryKey: ["infra", "actions", "catalog"],
    queryFn: listInfraActionCatalog,
  });
  const auditQuery = useQuery({
    queryKey: ["admin", "audit-logs", "infra-actions-recent"],
    queryFn: async () => {
      const [actions, hosts] = await Promise.all([
        listAuditLogs({
          page: 1,
          pageSize: 6,
          resource: "infra_action",
        }),
        listAuditLogs({
          page: 1,
          pageSize: 6,
          resource: "infra_host",
        }),
      ]);
      return [...actions.items, ...hosts.items]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);
    },
  });
  const actions = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const recentAuditLogs = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);
  const mutation = useMutation({
    mutationFn: ({ action, confirmation }: { action: InfraAction; confirmation?: string }) =>
      runInfraAction(action, confirmation),
    onSuccess: (result) => {
      setLastResult(result);
      void queryClient.invalidateQueries({ queryKey: ["infra"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
  const retireMutation = useMutation({
    mutationFn: ({ host, force, confirmation }: { host: string; force: boolean; confirmation: string }) =>
      applyInfraRetirement(host, force, confirmation),
    onSuccess: (result) => {
      setLastResult(result);
      setRetireOpen(false);
      setRetireHost("");
      setRetireForce(false);
      setRetireConfirmation("");
      void queryClient.invalidateQueries({ queryKey: ["infra"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
  const isActionRunning = mutation.isPending || retireMutation.isPending;
  const expectedActionConfirmation = pendingAction?.confirmationToken ?? "";
  const trimmedRetireHost = retireHost.trim();
  const expectedRetireConfirmation = trimmedRetireHost
    ? `CONFIRM:retire-apply${retireForce ? "-force" : ""}:${trimmedRetireHost}`
    : "";

  return (
    <GlassPage>
      <PageContainer>
      <PageHeader
        title="生成任务"
        description="通过 nax-api 执行 infra-control 的白名单命令，覆盖校验、生成和外部同步闭环。"
        actions={
          <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
            <Terminal className="h-4 w-4" />
            <span>{isActionRunning ? "运行中" : "就绪"}</span>
          </GlassButtonSurface>
        }
      />

      <div className="mt-6 grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <GlassPanel className="p-5">
          <div className="mb-4 text-base font-semibold text-slate-950">业务闭环动作</div>
          <div className="grid gap-4">
            {actionGroups.map((group) => (
              <div key={group}>
                <div className="mb-2 px-1 text-xs font-medium text-slate-500">{group}</div>
                <div className="grid gap-2">
                  {actions.filter((item) => item.group === group).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      disabled={isActionRunning || catalogQuery.isLoading}
                      onClick={() => {
                        if (item.confirmationRequired) {
                          setPendingAction(item);
                          setConfirmationInput("");
                          return;
                        }
                        mutation.mutate({ action: item.key });
                      }}
                      className="flex w-full items-center gap-3 rounded-md border border-white/70 bg-white/55 p-3 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                        {actionIcons[item.key] ?? <Terminal className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 font-medium text-slate-950">
                          {item.title}
                          {item.confirmationRequired ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                              confirm
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
                        {item.artifacts.length ? (
                          <div className="mt-2 truncate text-[11px] text-slate-400">
                            {item.artifacts.join(" / ")}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  ))}
                  {catalogQuery.isLoading && group === actionGroups[0] ? (
                    <div className="rounded-md border border-white/70 bg-white/45 p-3 text-sm text-slate-500">
                      正在读取后端动作白名单...
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={isActionRunning}
              onClick={() => {
                setRetireHost("");
                setRetireForce(false);
                setRetireConfirmation("");
                setRetireOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-md border border-red-100 bg-red-50/70 p-3 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-red-700 ring-1 ring-red-100">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-red-950">应用退役</div>
                <div className="mt-1 text-xs text-red-700/80">
                  显式把主机状态改为 retired，并回写续费动作为 cancel。
                </div>
              </div>
            </button>
          </div>
          {mutation.isError || retireMutation.isError ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
              {((mutation.error || retireMutation.error) as Error).message}
            </div>
          ) : null}
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-slate-950">运行输出</div>
            {lastResult ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{new Date(lastResult.finishedAt).toLocaleString()}</span>
              </div>
            ) : null}
          </div>
          <div className="mb-4">
            <ResultSummary result={lastResult} />
          </div>
          <CommandOutput result={lastResult} />
        </GlassPanel>
      </div>

      <GlassPanel className="mt-5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-slate-950">最近 infra 审计</div>
            <div className="mt-1 text-sm text-slate-500">执行动作后自动刷新，便于核对命令、产物和风险记录。</div>
          </div>
          <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
            <Activity className="h-4 w-4" />
            {auditQuery.isFetching ? "刷新中" : `${recentAuditLogs.length} 条`}
          </GlassButtonSurface>
        </div>
        <AuditTimeline logs={recentAuditLogs} />
      </GlassPanel>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title="确认高风险动作"
        description={`将执行 ${pendingAction?.title ?? ""}。该动作会写入本地状态或 inventory，请确认已经查看 preview。`}
        confirmText={isActionRunning ? "执行中" : "确认执行"}
        confirmDisabled={
          !pendingAction ||
          !expectedActionConfirmation ||
          isActionRunning ||
          confirmationInput.trim() !== expectedActionConfirmation
        }
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
            setConfirmationInput("");
          }
        }}
        onConfirm={() => {
          if (pendingAction) {
            mutation.mutate({
              action: pendingAction.key,
              confirmation: confirmationInput.trim(),
            });
          }
        }}
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="infra-action-confirmation">
            输入确认令牌
          </label>
          <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 font-mono text-xs text-amber-900">
            {expectedActionConfirmation || "无确认令牌"}
          </div>
          <Input
            id="infra-action-confirmation"
            value={confirmationInput}
            onChange={(event) => setConfirmationInput(event.target.value)}
            placeholder="逐字输入上方令牌"
            autoComplete="off"
          />
        </div>
      </ConfirmDialog>

      {retireOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/48 px-4 backdrop-blur-md">
          <div className="w-[min(92vw,460px)] rounded-lg border border-white/80 bg-white/88 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
            <div className="mb-4">
              <div className="text-base font-semibold">应用退役</div>
              <div className="mt-1 text-sm text-muted-foreground">
                该动作会修改 inventory/hosts.yml，并把关联续费项 action 改为 cancel。
              </div>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="infra-retire-host">
                  Host ID
                </label>
                <Input
                  id="infra-retire-host"
                  value={retireHost}
                  onChange={(event) => {
                    setRetireHost(event.target.value);
                    setRetireConfirmation("");
                  }}
                  placeholder="例如 us-01"
                />
              </div>
              <label className="flex items-center gap-3 rounded-md border border-white/75 bg-white/58 p-3 text-sm shadow-sm backdrop-blur">
                <Checkbox
                  checked={retireForce}
                  onCheckedChange={(checked) => {
                    setRetireForce(checked === true);
                    setRetireConfirmation("");
                  }}
                />
                强制退役 blocked/review 主机
              </label>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="infra-retire-confirmation">
                  输入确认令牌
                </label>
                <div className="rounded-md border border-red-200 bg-red-50/80 px-3 py-2 font-mono text-xs text-red-900">
                  {expectedRetireConfirmation || "先填写 Host ID"}
                </div>
                <Input
                  id="infra-retire-confirmation"
                  value={retireConfirmation}
                  onChange={(event) => setRetireConfirmation(event.target.value)}
                  placeholder="逐字输入上方令牌"
                  autoComplete="off"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRetireOpen(false);
                    setRetireHost("");
                    setRetireForce(false);
                    setRetireConfirmation("");
                  }}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  disabled={
                    !trimmedRetireHost ||
                    isActionRunning ||
                    retireConfirmation.trim() !== expectedRetireConfirmation
                  }
                  onClick={() =>
                    retireMutation.mutate({
                      host: trimmedRetireHost,
                      force: retireForce,
                      confirmation: retireConfirmation.trim(),
                    })
                  }
                >
                  {retireMutation.isPending ? "执行中" : "确认退役"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </PageContainer>
    </GlassPage>
  );
}
