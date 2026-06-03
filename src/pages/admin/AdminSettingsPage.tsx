import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, Edit2, FileText, Save, Settings2, ShieldCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { GlassBackdrop, GlassButtonSurface, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listSettings, updateSetting } from "@/features/admin/api";
import type { SettingRecord } from "@/features/admin/types";
import { asErrorMessage } from "@/lib/api";
import { formatDateTime, formatJsonValue } from "@/lib/format";

const settingSchema = z.object({
  key: z.string(),
  value: z.string().min(1, "请输入配置值"),
  description: z.string().optional(),
});

type SettingFormValues = z.infer<typeof settingSchema>;

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingSetting, setEditingSetting] = useState<SettingRecord | null>(
    null,
  );

  const settingsQuery = useQuery({
    queryKey: ["admin", "settings", page, search],
    queryFn: () => listSettings({ page, pageSize: 10, q: search || undefined }),
  });

  const form = useForm<SettingFormValues>({
    resolver: zodResolver(settingSchema),
    defaultValues: { key: "", value: "", description: "" },
  });

  const updateMutation = useMutation({
    mutationFn: (values: SettingFormValues) =>
      updateSetting(values.key, {
        value: parseSettingValue(values.value),
        description: values.description || "",
      }),
    onSuccess: () => {
      setEditingSetting(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });

  const openEdit = useCallback(
    (setting: SettingRecord) => {
      setEditingSetting(setting);
      form.reset({
        key: setting.key,
        value: formatEditableValue(setting.value),
        description: setting.description,
      });
    },
    [form],
  );

  const rows = settingsQuery.data?.items ?? [];
  const pagination = settingsQuery.data?.pagination;
  const jsonSettings = rows.filter((item) => typeof item.value === "object" && item.value !== null).length;
  const booleanSettings = rows.filter((item) => typeof item.value === "boolean").length;

  const columns = useMemo<ColumnDef<SettingRecord>[]>(
    () => [
      {
        accessorKey: "key",
        header: "配置 Key",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.key}</div>
        ),
      },
      {
        accessorKey: "value",
        header: "值",
        cell: ({ row }) => (
          <code className="rounded bg-white/70 px-2 py-1 text-xs">
            {formatJsonValue(row.original.value)}
          </code>
        ),
      },
      { accessorKey: "description", header: "说明" },
      {
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <PermissionGate permission="setting:update" fallback={null}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(row.original)}
            >
              <Edit2 className="h-4 w-4" />
              编辑
            </Button>
          </PermissionGate>
        ),
      },
    ],
    [openEdit],
  );

  return (
    <GlassPage>
      <GlassBackdrop />
      <PageContainer className="relative z-10">
        <PageHeader
          title="系统设置"
          description="读取和更新后端系统配置，并把设置变更纳入审计闭环。"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary">
                <Link to="/infra/inventory">
                  <FileText className="h-4 w-4" />
                  配置管理
                </Link>
              </Button>
              <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
                <Settings2 className="h-4 w-4" />
                {settingsQuery.isFetching ? "同步中" : `${pagination?.total ?? rows.length} 项配置`}
              </GlassButtonSurface>
            </div>
          }
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["配置来源", "后端优先 / Demo fallback", ShieldCheck],
            ["JSON 配置", jsonSettings.toString(), Settings2],
            ["布尔开关", booleanSettings.toString(), Save],
          ].map(([title, value, Icon]) => (
            <GlassPanel key={title as string} className="p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm text-slate-500">{title as string}</div>
                  <div className="mt-0.5 font-semibold text-slate-950">{value as string}</div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
        <GlassPanel className="mt-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-950">设置闭环</div>
              <div className="mt-1 text-sm text-slate-500">
                系统设置负责运行时开关；infra-control 事实配置仍进入配置管理，所有保存动作进入审计。
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link to="/admin/audit-logs">
                  <ClipboardList className="h-4 w-4" />
                  审计日志
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/admin/dictionaries">数据字典</Link>
              </Button>
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
            placeholder="搜索配置 key 或说明"
          />
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
                  数据来自 /api/v1/settings
                </span>
                {settingsQuery.error ? (
                  <span className="text-sm text-red-600">
                    {asErrorMessage(settingsQuery.error)}
                  </span>
                ) : null}
              </div>
            }
          />
        </div>

        <FormDrawer
          open={Boolean(editingSetting)}
          title="编辑系统设置"
          description="保存后会调用 PUT /api/v1/settings/{key}"
          onClose={() => setEditingSetting(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingSetting(null)}>
                取消
              </Button>
              <Button
                disabled={updateMutation.isPending}
                onClick={form.handleSubmit((values) =>
                  updateMutation.mutate(values),
                )}
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "保存中" : "保存"}
              </Button>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>配置 Key</Label>
              <Input disabled {...form.register("key")} />
            </div>
            <div className="grid gap-2">
              <Label>配置值</Label>
              <Textarea rows={5} {...form.register("value")} />
              {form.formState.errors.value ? (
                <div className="text-xs text-red-600">
                  {form.formState.errors.value.message}
                </div>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label>说明</Label>
              <Textarea rows={3} {...form.register("description")} />
            </div>
            {updateMutation.error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {asErrorMessage(updateMutation.error)}
              </div>
            ) : null}
          </div>
        </FormDrawer>
      </PageContainer>
    </GlassPage>
  );
}

function formatEditableValue(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function parseSettingValue(value: string) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return JSON.parse(trimmed) as unknown;
  }
  return value;
}
