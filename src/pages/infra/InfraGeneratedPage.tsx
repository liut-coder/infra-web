import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileJson,
  FileText,
  FolderOutput,
  Play,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getGeneratedFile, listGeneratedFiles, listInfraActionCatalog, runInfraAction } from "@/features/infra/api";
import type { InfraAction, InfraCommandAction, InfraCommandResult, InfraGeneratedFileSummary, InfraGeneratedName } from "@/features/infra/types";
import { cn } from "@/lib/cn";

type MobileGeneratedView = "list" | "preview";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.split("/").pop() || "infra-generated.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function generatedKind(name: string) {
  if (name.includes("report")) return "报告";
  if (name.includes("plan")) return "计划";
  if (name.includes("preview")) return "预览";
  if (name.includes("index")) return "索引";
  if (name.includes("csv")) return "CSV";
  return "数据";
}

function generatedTone(name: string) {
  if (name.includes("report")) return "bg-blue-50 text-blue-700 ring-blue-100";
  if (name.includes("plan")) return "bg-violet-50 text-violet-700 ring-violet-100";
  if (name.includes("preview")) return "bg-amber-50 text-amber-700 ring-amber-100";
  if (name.includes("csv")) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function contentLanguage(file?: string) {
  if (!file) return "text";
  if (file.endsWith(".json")) return "json";
  if (file.endsWith(".md")) return "markdown";
  if (file.endsWith(".csv")) return "csv";
  if (file.endsWith(".yml") || file.endsWith(".yaml")) return "yaml";
  if (file.endsWith(".ini")) return "ini";
  return "text";
}

function ResultStrip({ result }: { result?: InfraCommandResult }) {
  if (!result) return null;
  return (
    <GlassPanel className="mt-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-green-50 text-green-700 ring-1 ring-green-100">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-950">重新生成完成</div>
            <div className="mt-1 truncate text-xs text-slate-500">
              {result.command.join(" ")}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="success">exit {result.exitCode}</StatusBadge>
          {(result.artifacts ?? []).slice(0, 4).map((artifact) => (
            <span key={artifact} className="rounded-md border border-white/80 bg-white/70 px-2.5 py-1 text-xs text-slate-600">
              {artifact}
            </span>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}

function FileCard({
  item,
  selected,
  onSelect,
}: {
  item: InfraGeneratedFileSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-md border px-3 py-3 text-left text-sm shadow-sm transition-all duration-200 ease-out",
        selected
          ? "border-blue-100 bg-white/90 text-slate-950 shadow-md"
          : "border-white/70 bg-white/55 text-slate-600 hover:-translate-y-0.5 hover:bg-white/85 hover:text-slate-950",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("grid h-7 w-7 place-items-center rounded-md ring-1", generatedTone(item.name))}>
              {item.name === "web-data" ? <FileJson className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            </span>
            <span className="truncate font-medium">{item.label}</span>
          </div>
          <div className="mt-2 truncate text-xs opacity-70">{item.file}</div>
          <div className="mt-2 text-xs opacity-70">
            {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "未生成"}
          </div>
          {item.producers?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.producers.slice(0, 2).map((producer) => (
                <span key={producer} className="rounded bg-white/25 px-1.5 py-0.5 text-[10px] opacity-80 ring-1 ring-white/30">
                  {producer}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <StatusBadge tone={item.exists ? "success" : "warning"}>
          {item.exists ? formatBytes(item.bytes) : "missing"}
        </StatusBadge>
      </div>
    </button>
  );
}

export function InfraGeneratedPage() {
  const [selected, setSelected] = useState<InfraGeneratedName>("network-report");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("全部");
  const [mobileView, setMobileView] = useState<MobileGeneratedView>("list");
  const [pendingProducer, setPendingProducer] = useState<InfraCommandAction | null>(null);
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ["infra", "generated"],
    queryFn: listGeneratedFiles,
  });
  const catalogQuery = useQuery({
    queryKey: ["infra", "actions", "catalog"],
    queryFn: listInfraActionCatalog,
  });
  const fileQuery = useQuery({
    queryKey: ["infra", "generated", selected],
    queryFn: () => getGeneratedFile(selected),
    enabled: Boolean(selected),
  });
  const generateQuery = useQuery({
    queryKey: ["infra", "generated", "refresh"],
    queryFn: () => runInfraAction("generate"),
    enabled: false,
  });
  const producerMutation = useMutation({
    mutationFn: (producer: InfraAction) => runInfraAction(producer),
    onSuccess: async () => {
      await listQuery.refetch();
      await fileQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["infra"] });
    },
  });
  const files = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const existing = files.filter((item) => item.exists);
  const missing = files.filter((item) => !item.exists);
  const totalBytes = existing.reduce((sum, item) => sum + item.bytes, 0);
  const kinds = useMemo(
    () => ["全部", ...Array.from(new Set(files.map((item) => generatedKind(item.name))))],
    [files],
  );
  const filteredFiles = useMemo(
    () =>
      files.filter((item) => {
        const keyword = search.trim().toLowerCase();
        const matchesSearch = keyword
          ? `${item.name} ${item.label} ${item.file}`.toLowerCase().includes(keyword)
          : true;
        const matchesKind = kind === "全部" || generatedKind(item.name) === kind;
        return matchesSearch && matchesKind;
      }),
    [files, kind, search],
  );
  const selectedSummary = files.find((item) => item.name === selected);
  const previewLanguage = contentLanguage(fileQuery.data?.file);
  const producerNames = fileQuery.data?.producers ?? selectedSummary?.producers ?? [];
  const producerCatalog = useMemo(
    () => new Map((catalogQuery.data ?? []).map((item) => [item.key, item])),
    [catalogQuery.data],
  );
  const pendingProducerMeta = pendingProducer ? producerCatalog.get(pendingProducer as InfraAction) : undefined;
  const pendingProducerRunnable = Boolean(pendingProducerMeta);
  const latestResult = producerMutation.data ?? generateQuery.data;
  const actionError = producerMutation.error ?? generateQuery.error;

  const runGenerateAndRefresh = async () => {
    await generateQuery.refetch();
    await listQuery.refetch();
    await fileQuery.refetch();
    await queryClient.invalidateQueries({ queryKey: ["infra"] });
  };

  return (
    <GlassPage>
      <PageContainer>
      <PageHeader
        title="生成物"
        description="查看 infra-control 生成的报告、计划、预览和前端数据包。"
        actions={
          <Button
            variant="secondary"
            className="border-white/70 bg-white/65"
            onClick={runGenerateAndRefresh}
            disabled={generateQuery.isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", generateQuery.isFetching && "animate-spin")} />
            重新生成
          </Button>
        }
      />
      <ResultStrip result={latestResult} />
      {actionError ? (
        <GlassPanel className="mt-5 border-red-100 bg-red-50/70 p-4 text-sm text-red-700">
          {(actionError as Error).message}
        </GlassPanel>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["可用文件", `${existing.length}/${files.length || "-"}`, "generated/* 当前可读取项"],
          ["总体积", formatBytes(totalBytes), "报告、计划、JSON、CSV 合计"],
          ["缺失项", `${missing.length}`, "可通过重新生成补齐"],
        ].map(([label, value, hint]) => (
          <GlassPanel key={label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-slate-500">{label}</div>
                <div className="truncate text-xl font-semibold text-slate-950">{value}</div>
                <div className="mt-0.5 truncate text-xs text-slate-500">{hint}</div>
              </div>
            </div>
          </GlassPanel>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div
          role="tablist"
          aria-label="生成物视图"
          className="grid grid-cols-2 rounded-md border border-white/70 bg-white/55 p-1 shadow-sm backdrop-blur xl:hidden"
        >
          {[
            ["list", "文件列表"],
            ["preview", "预览"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mobileView === value}
              onClick={() => setMobileView(value as MobileGeneratedView)}
              className={cn(
                "h-9 rounded text-sm transition-all duration-200",
                mobileView === value
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-950",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <GlassPanel className={cn("p-3", mobileView === "preview" && "hidden xl:block")}>
          <div className="mb-3 px-2 text-xs font-medium text-slate-500">GENERATED</div>
          <div className="mb-3 grid gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                className="border-white/70 bg-white/65 pl-9"
                placeholder="搜索报告、计划或路径"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {kinds.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setKind(item)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs transition-all duration-200",
                    kind === item
                      ? "border-blue-100 bg-white text-blue-700 shadow-sm"
                      : "border-white/70 bg-white/55 text-slate-600 hover:bg-white/85",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            {filteredFiles.map((item) => (
              <FileCard
                key={item.name}
                item={item}
                selected={selected === item.name}
                onSelect={() => {
                  setSelected(item.name);
                  setMobileView("preview");
                }}
              />
            ))}
            {!filteredFiles.length ? (
              <EmptyState
                title="没有匹配的生成物"
                description="换个关键词，或先重新生成产物。"
                action={
                  <Button variant="secondary" onClick={() => setSearch("")}>
                    清空搜索
                  </Button>
                }
              />
            ) : null}
          </div>
        </GlassPanel>

        <GlassPanel className={cn("p-5", mobileView === "list" && "hidden xl:block")}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <FolderOutput className="h-4 w-4 text-blue-600" />
                {fileQuery.data?.label ?? "生成物"}
              </div>
              <div className="mt-1 text-xs text-slate-500">{selectedSummary?.file ?? "loading"}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone="info">{previewLanguage}</StatusBadge>
              {fileQuery.data?.updatedAt ? (
                <StatusBadge tone="info">{new Date(fileQuery.data.updatedAt).toLocaleString()}</StatusBadge>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                className="border-white/70 bg-white/65"
                disabled={!fileQuery.data?.exists || !fileQuery.data?.content}
                onClick={async () => {
                  if (fileQuery.data?.content) {
                    await navigator.clipboard.writeText(fileQuery.data.content);
                  }
                }}
              >
                <Clipboard className="h-4 w-4" />
                复制
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="border-white/70 bg-white/65"
                disabled={!fileQuery.data?.exists || !fileQuery.data?.content}
                onClick={() => {
                  if (fileQuery.data) {
                    downloadFile(fileQuery.data.file, fileQuery.data.content);
                  }
                }}
              >
                <Download className="h-4 w-4" />
                下载
              </Button>
            </div>
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-white/70 bg-white/50 p-3">
              <div className="text-xs text-slate-500">文件类别</div>
              <div className="mt-1 font-semibold text-slate-950">{generatedKind(selected)}</div>
            </div>
            <div className="rounded-md border border-white/70 bg-white/50 p-3">
              <div className="text-xs text-slate-500">生成动作</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {producerNames.length ? (
                  producerNames.map((producer) => (
                    <button
                      key={producer}
                      type="button"
                      onClick={() => setPendingProducer(producer)}
                      className="inline-flex items-center gap-1 rounded-md bg-white/75 px-2 py-1 text-xs text-slate-700 ring-1 ring-white/80 transition hover:bg-white hover:text-slate-950"
                    >
                      <Play className="h-3 w-3 text-blue-600" />
                      {producer}
                    </button>
                  ))
                ) : (
                  <span className="text-sm font-medium text-slate-800">手动或外部生成</span>
                )}
              </div>
            </div>
            <div className="rounded-md border border-white/70 bg-white/50 p-3">
              <div className="text-xs text-slate-500">闭环状态</div>
              <div className="mt-1 font-semibold text-slate-950">
                {fileQuery.data?.exists ? "可预览 / 可下载" : "等待生成"}
              </div>
            </div>
          </div>
          {fileQuery.isError ? (
            <EmptyState
              title="生成物还不存在"
              description={(fileQuery.error as Error).message}
              action={
                <Button
                  onClick={runGenerateAndRefresh}
                  disabled={generateQuery.isFetching}
                >
                  <RefreshCw className={cn("h-4 w-4", generateQuery.isFetching && "animate-spin")} />
                  重新生成
                </Button>
              }
            />
          ) : (
            <pre className={cn(
              "max-h-[680px] overflow-auto rounded-md border border-white/70 bg-white/58 p-4 text-xs leading-5 text-slate-700 shadow-inner backdrop-blur",
              (previewLanguage === "json" || previewLanguage === "yaml") && "font-mono",
            )}>
              {fileQuery.data?.content ?? "暂无内容"}
            </pre>
          )}
        </GlassPanel>
      </div>
      <ConfirmDialog
        open={Boolean(pendingProducer)}
        title={
          pendingProducerMeta?.highRisk
            ? "高风险动作需要专门确认"
            : pendingProducerRunnable
              ? "重新生成该产物"
              : "专门入口动作"
        }
        description={
          pendingProducerMeta?.highRisk
            ? `${pendingProducerMeta.title} 需要确认 token，请在生成任务或发现合并页执行。`
            : !pendingProducerRunnable
              ? `${pendingProducer ?? ""} 需要在生成任务页的专门入口执行，这里只提供结果复查。`
            : `将执行 ${pendingProducerMeta?.title ?? pendingProducer ?? ""}，并刷新当前生成物预览。`
        }
        confirmText={pendingProducerMeta?.highRisk || !pendingProducerRunnable ? "知道了" : "执行"}
        onOpenChange={(open) => !open && setPendingProducer(null)}
        onConfirm={() => {
          if (!pendingProducer || pendingProducerMeta?.highRisk || !pendingProducerRunnable) return;
          producerMutation.mutate(pendingProducer as InfraAction);
        }}
      />
      </PageContainer>
    </GlassPage>
  );
}
