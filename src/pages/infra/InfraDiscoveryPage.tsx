import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCode2,
  GitMerge,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { GlassBackdrop, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { getGeneratedFile, listInfraActionCatalog, runInfraAction } from "@/features/infra/api";
import type {
  InfraAction,
  InfraActionCatalogItem,
  InfraCommandResult,
  InfraGeneratedFile,
} from "@/features/infra/types";
import { cn } from "@/lib/cn";

type TabKey = "new" | "updated" | "skipped" | "yaml";

interface DiscoveredHost {
  id: string;
  hostname?: string;
  region?: string;
  provider?: string;
  role?: string;
  state?: string;
  network_profile?: string;
  traffic?: {
    type?: string;
    monthly_limit_gb?: number;
  };
  source?: {
    type?: string;
    uuid?: string;
    synced_at?: string;
  };
  system?: {
    os?: string;
    arch?: string;
    cpu_cores?: number;
    mem_total_bytes?: number;
    disk_total_bytes?: number;
  };
  komari?: {
    group?: string;
    tags?: string;
    expired_at?: string;
  };
}

interface ParsedGenerated {
  metadata: Record<string, unknown>;
  hosts: DiscoveredHost[];
  raw: string;
}

interface MergeSummary {
  actions: string[];
  created: string[];
  updated: string[];
  skipped: string[];
}

type DiscoveryAction = "discover-komari" | "merge-preview" | "merge-apply";

const discoveryActionKeys: DiscoveryAction[] = ["discover-komari", "merge-preview", "merge-apply"];

const discoveryActionMeta: Record<DiscoveryAction, { icon: React.ReactNode; tone: string }> = {
  "discover-komari": {
    icon: <Search className="h-4 w-4" />,
    tone: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  "merge-preview": {
    icon: <GitMerge className="h-4 w-4" />,
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  "merge-apply": {
    icon: <Upload className="h-4 w-4" />,
    tone: "bg-red-50 text-red-700 ring-red-100",
  },
};

function parseSimpleYaml(content?: string): ParsedGenerated {
  if (!content) {
    return { metadata: {}, hosts: [], raw: "" };
  }

  const hosts: DiscoveredHost[] = [];
  const metadata: Record<string, unknown> = {};
  const lines = content.split("\n");
  let section: "metadata" | "hosts" | null = null;
  let current: DiscoveredHost | null = null;
  const stack: Array<{ indent: number; path: string[] }> = [];

  const setValue = (target: Record<string, unknown>, path: string[], value: unknown) => {
    let cursor = target;
    path.slice(0, -1).forEach((key) => {
      if (!cursor[key] || typeof cursor[key] !== "object") {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    });
    cursor[path[path.length - 1]] = value;
  };

  const parseValue = (value: string) => {
    if (value === "null") return null;
    if (value === "true") return true;
    if (value === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    return value.replace(/^['"]|['"]$/g, "");
  };

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (line === "metadata:") {
      section = "metadata";
      current = null;
      stack.length = 0;
      continue;
    }
    if (line === "hosts:") {
      section = "hosts";
      current = null;
      stack.length = 0;
      continue;
    }

    const match = line.match(/^(\s*)([^:#]+):(?:\s*(.*))?$/);
    if (!match || !section) continue;
    const indent = match[1].length;
    const key = match[2].trim();
    const rawValue = match[3]?.trim() ?? "";

    if (section === "hosts" && indent === 2) {
      current = { id: key };
      hosts.push(current);
      stack.length = 0;
      continue;
    }

    if (section === "metadata" && indent === 2) {
      metadata[key] = rawValue ? parseValue(rawValue) : "";
      continue;
    }

    if (!current || section !== "hosts" || indent < 4) continue;
    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const path = [...stack.flatMap((item) => item.path), key];
    if (!rawValue) {
      stack.push({ indent, path: [key] });
      setValue(current as unknown as Record<string, unknown>, path, {});
    } else {
      setValue(current as unknown as Record<string, unknown>, path, parseValue(rawValue));
    }
  }

  return { metadata, hosts, raw: content };
}

function parseMergeSummary(file?: InfraGeneratedFile): MergeSummary {
  const listValue = (key: keyof MergeSummary) =>
    file?.content.match(new RegExp(`${key}:\\n([\\s\\S]*?)(?:\\n[a-zA-Z_]+:|$)`))?.[1] ?? "";
  const parseList = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim().replace(/^- /, ""))
      .filter(Boolean);
  const actionsList = parseList(listValue("actions"));
  const created = parseList(listValue("created"));
  const updated = parseList(listValue("updated"));
  const skipped = parseList(listValue("skipped"));
  const idsFromActions = (prefix: string) =>
    actionsList
      .filter((item) => item.startsWith(prefix))
      .map((item) => item.match(new RegExp(`^${prefix}\\s+([^\\s]+)`))?.[1])
      .filter(Boolean) as string[];

  return {
    actions: actionsList,
    created: created.length ? created : idsFromActions("add"),
    updated: updated.length ? updated : idsFromActions("update"),
    skipped: skipped.length ? skipped : idsFromActions("skip"),
  };
}

function hostIdSet(ids: string[]) {
  return new Set(
    ids
      .flatMap((item) => item.split(/\s*,\s*/))
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function formatBytes(bytes?: number) {
  if (!bytes) return "N/A";
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`;
}

function HostTable({ hosts, empty }: { hosts: DiscoveredHost[]; empty: string }) {
  if (!hosts.length) {
    return (
      <div className="grid min-h-[220px] place-items-center rounded-md border border-white/70 bg-white/50 text-sm text-slate-500 shadow-inner backdrop-blur">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-blue-500" />
          {empty}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-white/70 bg-white/60 shadow-sm backdrop-blur">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/70 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">节点</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 font-medium">地区</th>
              <th className="px-4 py-3 font-medium">流量</th>
              <th className="px-4 py-3 font-medium">系统</th>
              <th className="px-4 py-3 font-medium">同步</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70">
            {hosts.map((host) => (
              <tr key={host.id} className="text-slate-700">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-950">{host.hostname || host.id}</div>
                  <div className="mt-1 text-xs text-slate-500">{host.source?.uuid || host.id}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone="info">{host.role || "unknown"}</StatusBadge>
                </td>
                <td className="px-4 py-3">{host.region || "unknown"}</td>
                <td className="px-4 py-3">
                  {host.traffic?.type === "limited"
                    ? `${host.traffic.monthly_limit_gb ?? "?"} GB`
                    : host.traffic?.type || "unknown"}
                </td>
                <td className="px-4 py-3">
                  <div>{host.system?.os || "unknown"}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {host.system?.cpu_cores ?? "?"}C / {formatBytes(host.system?.mem_total_bytes)}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {host.source?.synced_at
                    ? new Date(host.source.synced_at).toLocaleString()
                    : "not synced"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OutputPanel({ result }: { result: InfraCommandResult | null }) {
  if (!result) {
    return (
      <div className="rounded-md border border-white/70 bg-white/45 p-4 text-sm text-slate-500">
        等待执行 Komari 发现或合并动作。
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200/80 bg-white/70 p-4 font-mono text-xs text-slate-700 shadow-inner backdrop-blur">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge tone="success">exit {result.exitCode}</StatusBadge>
        <span className="text-slate-500">{result.command.join(" ")}</span>
      </div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap leading-6">
        {result.stdout || result.stderr || "no output"}
      </pre>
    </div>
  );
}

export function InfraDiscoveryPage() {
  const [lastResult, setLastResult] = useState<InfraCommandResult | null>(null);
  const [pendingAction, setPendingAction] = useState<InfraActionCatalogItem | null>(null);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [tab, setTab] = useState<TabKey>("new");
  const queryClient = useQueryClient();
  const catalogQuery = useQuery({
    queryKey: ["infra", "actions", "catalog"],
    queryFn: listInfraActionCatalog,
  });
  const discoveryQuery = useQuery({
    queryKey: ["infra", "generated", "komari-discovery"],
    queryFn: () => getGeneratedFile("komari-discovery"),
  });
  const mergeQuery = useQuery({
    queryKey: ["infra", "generated", "merge-preview"],
    queryFn: () => getGeneratedFile("merge-preview"),
  });
  const mutation = useMutation({
    mutationFn: ({ action, confirmation }: { action: InfraAction; confirmation?: string }) =>
      runInfraAction(action, confirmation),
    onSuccess: async (result) => {
      setLastResult(result);
      await Promise.all([
        discoveryQuery.refetch(),
        mergeQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["infra"] }),
      ]);
    },
  });

  const discovery = useMemo(
    () => parseSimpleYaml(discoveryQuery.data?.content),
    [discoveryQuery.data?.content],
  );
  const merge = useMemo(() => parseMergeSummary(mergeQuery.data), [mergeQuery.data]);
  const actions = useMemo(
    () =>
      discoveryActionKeys
        .map((key) => catalogQuery.data?.find((item) => item.key === key))
        .filter((item): item is InfraActionCatalogItem & { key: DiscoveryAction } => Boolean(item)),
    [catalogQuery.data],
  );
  const createdIds = useMemo(() => hostIdSet(merge.created), [merge.created]);
  const updatedIds = useMemo(() => hostIdSet(merge.updated), [merge.updated]);
  const skippedIds = useMemo(() => hostIdSet(merge.skipped), [merge.skipped]);
  const hasMergeClassification = merge.created.length + merge.updated.length + merge.skipped.length > 0;
  const expectedConfirmation = pendingAction?.confirmationToken ?? "";
  const newHosts = useMemo(
    () =>
      hasMergeClassification
        ? discovery.hosts.filter((host) => createdIds.has(host.id))
        : discovery.hosts.filter((host) => !updatedIds.has(host.id) && !skippedIds.has(host.id)),
    [createdIds, discovery.hosts, hasMergeClassification, skippedIds, updatedIds],
  );
  const updatedHosts = useMemo(
    () => discovery.hosts.filter((host) => updatedIds.has(host.id)),
    [discovery.hosts, updatedIds],
  );
  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: "new", label: "新增", count: newHosts.length },
    { key: "updated", label: "更新", count: updatedHosts.length },
    { key: "skipped", label: "跳过", count: merge.skipped.length },
    { key: "yaml", label: "YAML" },
  ];

  return (
    <GlassPage>
      <GlassBackdrop />
      <PageContainer className="relative z-10">
        <PageHeader
          title="Komari 发现"
          description="从 Komari API 拉取节点，审核后合并到 inventory/hosts.yml，并补齐必要的 network.yml 占位画像。"
          actions={
            <div className="flex h-10 items-center gap-2 rounded-md border border-white/70 bg-white/65 px-3 text-sm text-slate-700 shadow-sm backdrop-blur-xl">
              <RefreshCw className={cn("h-4 w-4", mutation.isPending && "animate-spin")} />
              <span>{mutation.isPending ? "运行中" : "就绪"}</span>
            </div>
          }
        />

        <div className="mt-6 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <GlassPanel className="h-fit p-5 xl:sticky xl:top-20">
            <div className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-950">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              审核流程
            </div>
            <div className="grid gap-3">
              {actions.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.confirmationRequired) {
                      setPendingAction(item);
                      setConfirmationInput("");
                      return;
                    }
                    mutation.mutate({ action: item.key });
                  }}
                  disabled={mutation.isPending || catalogQuery.isLoading}
                  className="group flex w-full items-center gap-3 rounded-md border border-white/75 bg-white/62 p-4 text-left shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md ring-1", discoveryActionMeta[item.key].tone)}>
                    {discoveryActionMeta[item.key].icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium text-slate-950">
                      <span className="text-xs text-slate-400">0{index + 1}</span>
                      {item.title}
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
              {catalogQuery.isLoading ? (
                <div className="rounded-md border border-white/75 bg-white/55 p-3 text-sm text-slate-500 shadow-sm backdrop-blur">
                  正在读取后端动作白名单...
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-md border border-white/75 bg-white/60 p-3 shadow-sm backdrop-blur">
                <div className="text-xl font-semibold text-slate-950">{newHosts.length}</div>
                <div className="mt-1 text-xs text-slate-500">新增</div>
              </div>
              <div className="rounded-md border border-white/75 bg-white/60 p-3 shadow-sm backdrop-blur">
                <div className="text-xl font-semibold text-slate-950">{updatedHosts.length}</div>
                <div className="mt-1 text-xs text-slate-500">更新</div>
              </div>
              <div className="rounded-md border border-white/75 bg-white/60 p-3 shadow-sm backdrop-blur">
                <div className="text-xl font-semibold text-slate-950">{merge.skipped.length}</div>
                <div className="mt-1 text-xs text-slate-500">跳过</div>
              </div>
            </div>

            {mutation.isError ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
                {(mutation.error as Error).message}
              </div>
            ) : null}

            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Clock3 className="h-4 w-4" />
                最近输出
              </div>
              <OutputPanel result={lastResult} />
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  发现结果
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {discoveryQuery.data?.updatedAt
                    ? `发现文件更新时间：${new Date(discoveryQuery.data.updatedAt).toLocaleString()}`
                    : "还没有发现文件"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={discovery.hosts.length ? "success" : "warning"}>
                  {discovery.hosts.length} nodes
                </StatusBadge>
                <StatusBadge tone={merge.actions.length ? "info" : "offline"}>
                  {merge.actions.length} changes
                </StatusBadge>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition",
                    tab === item.key
                      ? "border-blue-100 bg-white text-blue-700 shadow-sm"
                      : "border-white/70 bg-white/55 text-slate-600 hover:bg-white/85 hover:text-slate-950",
                  )}
                >
                  {item.label}
                  {typeof item.count === "number" ? (
                    <span className={cn("text-xs", tab === item.key ? "text-blue-500" : "text-slate-400")}>
                      {item.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {discoveryQuery.isLoading || mergeQuery.isLoading ? (
              <LoadingSkeleton />
            ) : null}
            {!discoveryQuery.isLoading && !mergeQuery.isLoading && tab === "new" ? <HostTable hosts={newHosts} empty="暂无新增节点。" /> : null}
            {!discoveryQuery.isLoading && !mergeQuery.isLoading && tab === "updated" ? <HostTable hosts={updatedHosts} empty="暂无可更新节点。" /> : null}
            {!discoveryQuery.isLoading && !mergeQuery.isLoading && tab === "skipped" ? (
              <div className="rounded-md border border-white/75 bg-white/62 p-4 shadow-sm backdrop-blur">
                {merge.skipped.length ? (
                  <ul className="space-y-2 text-sm text-slate-700">
                    {merge.skipped.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-500">暂无跳过项。</div>
                )}
              </div>
            ) : null}
            {!discoveryQuery.isLoading && !mergeQuery.isLoading && tab === "yaml" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FileCode2 className="h-4 w-4" />
                    hosts.discovered.yml
                  </div>
                  <pre className="max-h-[520px] overflow-auto rounded-md border border-white/75 bg-white/62 p-4 text-xs leading-5 text-slate-700 shadow-inner backdrop-blur">
                    {discoveryQuery.data?.content ?? "暂无内容"}
                  </pre>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FileCode2 className="h-4 w-4" />
                    hosts.merge-preview.yml
                  </div>
                  <pre className="max-h-[520px] overflow-auto rounded-md border border-white/75 bg-white/62 p-4 text-xs leading-5 text-slate-700 shadow-inner backdrop-blur">
                    {mergeQuery.data?.content ?? "暂无内容"}
                  </pre>
                </div>
              </div>
            ) : null}
          </GlassPanel>
        </div>
      </PageContainer>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title="确认应用合并"
        description="该动作会备份并写入 inventory/hosts.yml，必要时初始化 inventory/network.yml。请先查看 merge preview，确认无误后再执行。"
        confirmText={mutation.isPending ? "执行中" : "确认应用"}
        confirmDisabled={
          !pendingAction || !expectedConfirmation || mutation.isPending || confirmationInput.trim() !== expectedConfirmation
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
          <label className="text-sm font-medium text-slate-700" htmlFor="infra-merge-confirmation">
            输入确认令牌
          </label>
          <div className="rounded-md border border-red-200 bg-red-50/80 px-3 py-2 font-mono text-xs text-red-900">
            {expectedConfirmation || "无确认令牌"}
          </div>
          <Input
            id="infra-merge-confirmation"
            value={confirmationInput}
            onChange={(event) => setConfirmationInput(event.target.value)}
            placeholder="逐字输入上方令牌"
            autoComplete="off"
          />
        </div>
      </ConfirmDialog>
    </GlassPage>
  );
}
