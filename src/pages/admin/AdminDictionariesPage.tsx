import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Layers3, ListPlus, Palette, Plus, Save, ToggleRight, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FilterBar } from "@/components/shared/FilterBar";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { GlassButtonSurface, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createDictionaryItem,
  deleteDictionaryItem,
  dictionariesApi,
  listDictionaries,
  updateDictionaryItem,
} from "@/features/admin/api";
import {
  getColorClass,
  getDictionaryDisplayDescription,
  getDictionaryDisplayName,
  getDictionaryItemDisplayLabel,
} from "@/features/admin/dictionaryLabels";
import type {
  DictionaryItemRecord,
  DictionaryRecord,
} from "@/features/admin/types";
import { asErrorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime, formatJsonValue } from "@/lib/format";

const dictionarySchema = z.object({
  key: z
    .string()
    .min(2, "字典标识至少 2 位")
    .max(120, "字典标识最多 120 位")
    .regex(/^[a-zA-Z0-9_.:-]+$/, "只能包含字母、数字、点、冒号、横线和下划线"),
  name: z.string().min(1, "请输入字典名称"),
  description: z.string().default(""),
  isEnabled: z.boolean().default(true),
});

const itemSchema = z.object({
  label: z.string().min(1, "请输入显示名称"),
  value: z.string().min(1, "请输入取值"),
  color: z.string().optional(),
  sortOrder: z.coerce.number().int("排序必须是整数").default(0),
  isEnabled: z.boolean().default(true),
  meta: z
    .string()
    .default("{}")
    .superRefine((value, ctx) => {
      try {
        const parsed = JSON.parse(value || "{}") as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "扩展数据必须是 JSON 对象",
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "扩展数据必须是合法 JSON",
        });
      }
    }),
});

type DictionaryFormValues = z.infer<typeof dictionarySchema>;
type ItemFormValues = z.infer<typeof itemSchema>;

const dictionaryDefaults: DictionaryFormValues = {
  key: "",
  name: "",
  description: "",
  isEnabled: true,
};

const itemDefaults: ItemFormValues = {
  label: "",
  value: "",
  color: "",
  sortOrder: 0,
  isEnabled: true,
  meta: "{}",
};

export function AdminDictionariesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dictionaryDrawerOpen, setDictionaryDrawerOpen] = useState(false);
  const [editingDictionary, setEditingDictionary] =
    useState<DictionaryRecord | null>(null);
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DictionaryItemRecord | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: "dictionary"; dictionary: DictionaryRecord }
    | { type: "item"; item: DictionaryItemRecord }
    | null
  >(null);

  const dictionariesQuery = useQuery({
    queryKey: ["admin", "dictionaries", page, search, enabled],
    queryFn: () =>
      listDictionaries({
        page,
        pageSize: 20,
        q: search || undefined,
        enabled: enabled === "all" ? undefined : enabled === "true",
      }),
  });

  const rows = useMemo(
    () => dictionariesQuery.data?.items ?? [],
    [dictionariesQuery.data?.items],
  );
  const pagination = dictionariesQuery.data?.pagination;
  const selectedDictionaryId = selectedId || rows[0]?.id;
  const selectedSummary = rows.find((item) => item.id === selectedDictionaryId);

  const detailQuery = useQuery({
    queryKey: ["admin", "dictionaries", "detail", selectedDictionaryId],
    queryFn: () => dictionariesApi.get(selectedDictionaryId || ""),
    enabled: Boolean(selectedDictionaryId),
  });

  const selectedDictionary = detailQuery.data || selectedSummary || null;
  const items = useMemo(
    () => [...(detailQuery.data?.items ?? [])].sort(sortItems),
    [detailQuery.data?.items],
  );
  const enabledCount = rows.filter((item) => item.isEnabled).length;
  const systemCount = rows.filter((item) => item.isSystem).length;

  const dictionaryForm = useForm<DictionaryFormValues>({
    resolver: zodResolver(dictionarySchema),
    defaultValues: dictionaryDefaults,
  });
  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: itemDefaults,
  });

  useEffect(() => {
    if (!selectedId && rows[0]?.id) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  const saveDictionaryMutation = useMutation({
    mutationFn: (values: DictionaryFormValues) => {
      if (editingDictionary) {
        return dictionariesApi.update(editingDictionary.id, {
          name: values.name,
          description: values.description,
          isEnabled: values.isEnabled,
        });
      }
      return dictionariesApi.create(values);
    },
    onSuccess: (dictionary) => {
      setDictionaryDrawerOpen(false);
      setEditingDictionary(null);
      setSelectedId(dictionary.id);
      dictionaryForm.reset(dictionaryDefaults);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "dictionaries"],
      });
    },
  });

  const saveItemMutation = useMutation({
    mutationFn: (values: ItemFormValues) => {
      if (!selectedDictionaryId) throw new Error("请先选择字典");
      const payload = {
        label: values.label,
        value: values.value,
        color: values.color || null,
        sortOrder: values.sortOrder,
        isEnabled: values.isEnabled,
        meta: parseMeta(values.meta),
      };
      if (editingItem) {
        return updateDictionaryItem(editingItem.id, payload);
      }
      return createDictionaryItem(selectedDictionaryId, payload);
    },
    onSuccess: () => {
      setItemDrawerOpen(false);
      setEditingItem(null);
      itemForm.reset(itemDefaults);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "dictionaries"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!deleteTarget) throw new Error("缺少删除对象");
      if (deleteTarget.type === "dictionary") {
        return dictionariesApi.remove(deleteTarget.dictionary.id);
      }
      return deleteDictionaryItem(deleteTarget.item.id);
    },
    onSuccess: () => {
      if (deleteTarget?.type === "dictionary") setSelectedId(null);
      setDeleteTarget(null);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "dictionaries"],
      });
    },
  });

  function openCreateDictionary() {
    setEditingDictionary(null);
    dictionaryForm.reset(dictionaryDefaults);
    setDictionaryDrawerOpen(true);
  }

  function openEditDictionary(dictionary: DictionaryRecord) {
    setEditingDictionary(dictionary);
    dictionaryForm.reset({
      key: dictionary.key,
      name: dictionary.name,
      description: dictionary.description,
      isEnabled: dictionary.isEnabled,
    });
    setDictionaryDrawerOpen(true);
  }

  function openCreateItem() {
    setEditingItem(null);
    itemForm.reset(itemDefaults);
    setItemDrawerOpen(true);
  }

  function openEditItem(item: DictionaryItemRecord) {
    setEditingItem(item);
    itemForm.reset({
      label: item.label,
      value: item.value,
      color: item.color || "",
      sortOrder: item.sortOrder,
      isEnabled: item.isEnabled,
      meta: JSON.stringify(item.meta ?? {}, null, 2),
    });
    setItemDrawerOpen(true);
  }

  return (
    <GlassPage>
      <PageContainer>
      <PageHeader
        title="数据字典"
        description="维护通用枚举、状态、渠道等配置项，页面优先展示中文名称并保留原始 key/value"
        actions={
          <PermissionGate permission="dictionary:create" fallback={null}>
            <Button onClick={openCreateDictionary}>
              <ListPlus className="h-4 w-4" />
              新建字典
            </Button>
          </PermissionGate>
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["字典总数", (pagination?.total ?? rows.length).toString(), Layers3],
          ["启用字典", enabledCount.toString(), ToggleRight],
          ["系统内置", systemCount.toString(), Palette],
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
            <div className="font-semibold text-slate-950">业务枚举闭环</div>
            <div className="mt-1 text-sm text-slate-500">
              字典承接状态、风险、渠道等枚举；页面展示中文名，接口保留 key/value，变更进入审计。
            </div>
          </div>
          <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
            {dictionariesQuery.isFetching ? "同步中" : `${items.length} 个当前条目`}
          </GlassButtonSurface>
        </div>
      </GlassPanel>

      <div className="mt-6 space-y-5">
        <FilterBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="搜索字典标识或名称"
          actions={
            <div className="flex gap-2">
              {[
                ["all", "全部"],
                ["true", "启用"],
                ["false", "停用"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={enabled === value ? "default" : "secondary"}
                  size="sm"
                  onClick={() => {
                    setEnabled(value as "all" | "true" | "false");
                    setPage(1);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-white/70 px-5 py-4">
              <div className="font-semibold text-slate-950">字典列表</div>
              <div className="mt-1 text-xs text-slate-500">
                数据来自 /api/v1/dictionaries
              </div>
            </div>
            <div className="max-h-[620px] overflow-auto p-3">
              {rows.map((dictionary) => {
                const active = dictionary.id === selectedDictionaryId;
                return (
                  <button
                    key={dictionary.id}
                    className={cn(
                      "mb-2 w-full rounded-md border border-white/70 bg-white/45 p-4 text-left transition-all duration-200 ease-out last:mb-0 hover:bg-white/75",
                      active && "border-blue-100 bg-white/90 text-slate-950 shadow-sm",
                    )}
                    onClick={() => setSelectedId(dictionary.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">
                        {getDictionaryDisplayName(dictionary)}
                      </div>
                      {dictionary.isEnabled ? (
                        <StatusBadge tone="success">启用</StatusBadge>
                      ) : (
                        <StatusBadge tone="offline">停用</StatusBadge>
                      )}
                    </div>
                    <div className="mt-1 text-xs opacity-70">
                      {dictionary.key}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm opacity-75">
                      {getDictionaryDisplayDescription(dictionary)}
                    </div>
                  </button>
                );
              })}
              {rows.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  暂无字典数据
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between border-t border-white/70 px-5 py-3 text-sm text-slate-500">
              <span>共 {pagination?.total ?? 0} 条</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={(pagination?.page ?? 1) <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  上一页
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={
                    (pagination?.page ?? 1) >= (pagination?.totalPages ?? 1)
                  }
                  onClick={() =>
                    setPage((value) =>
                      Math.min(pagination?.totalPages ?? value, value + 1),
                    )
                  }
                >
                  下一页
                </Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {selectedDictionary ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/70 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold">
                        {getDictionaryDisplayName(selectedDictionary)}
                      </h2>
                      {selectedDictionary.isSystem ? (
                        <StatusBadge tone="info">系统内置</StatusBadge>
                      ) : (
                        <StatusBadge tone="offline">自定义</StatusBadge>
                      )}
                      {selectedDictionary.isEnabled ? (
                        <StatusBadge tone="success">启用</StatusBadge>
                      ) : (
                        <StatusBadge tone="offline">停用</StatusBadge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {selectedDictionary.key}
                    </div>
                    <div className="mt-2 max-w-3xl text-sm text-slate-500">
                      {getDictionaryDisplayDescription(selectedDictionary)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <PermissionGate
                      permission="dictionary:update"
                      fallback={null}
                    >
                      <Button
                        variant="secondary"
                        onClick={() => openEditDictionary(selectedDictionary)}
                      >
                        <Edit2 className="h-4 w-4" />
                        编辑字典
                      </Button>
                      <Button onClick={openCreateItem}>
                        <Plus className="h-4 w-4" />
                        新建条目
                      </Button>
                    </PermissionGate>
                    <PermissionGate
                      permission="dictionary:delete"
                      fallback={null}
                    >
                      <Button
                        variant="secondary"
                        className="text-red-600"
                        disabled={selectedDictionary.isSystem}
                        onClick={() =>
                          setDeleteTarget({
                            type: "dictionary",
                            dictionary: selectedDictionary,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-white/55 text-left text-xs font-medium text-slate-500">
                      <tr>
                        <th className="border-b border-white/70 px-5 py-3">显示名称</th>
                        <th className="border-b border-white/70 px-5 py-3">原始 Label</th>
                        <th className="border-b border-white/70 px-5 py-3">取值</th>
                        <th className="border-b border-white/70 px-5 py-3">颜色</th>
                        <th className="border-b border-white/70 px-5 py-3">排序</th>
                        <th className="border-b border-white/70 px-5 py-3">状态</th>
                        <th className="border-b border-white/70 px-5 py-3">扩展数据</th>
                        <th className="border-b border-white/70 px-5 py-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-white/60 transition-colors last:border-0 hover:bg-white/55">
                          <td className="px-5 py-4 font-medium">
                            {getDictionaryItemDisplayLabel(
                              selectedDictionary.key,
                              item,
                            )}
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            {item.label}
                          </td>
                          <td className="px-5 py-4">
                            <code className="rounded bg-white/70 px-2 py-1 text-xs">
                              {item.value}
                            </code>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className={cn(
                                  "h-3 w-3 rounded-full",
                                  getColorClass(item.color),
                                )}
                              />
                              {item.color || "-"}
                            </span>
                          </td>
                          <td className="px-5 py-4">{item.sortOrder}</td>
                          <td className="px-5 py-4">
                            {item.isEnabled ? (
                              <StatusBadge tone="success">启用</StatusBadge>
                            ) : (
                              <StatusBadge tone="offline">停用</StatusBadge>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <code className="rounded bg-white/70 px-2 py-1 text-xs">
                              {formatJsonValue(item.meta)}
                            </code>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <PermissionGate
                                permission="dictionary:update"
                                fallback={null}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditItem(item)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                  编辑
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() =>
                                    setDeleteTarget({ type: "item", item })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                  删除
                                </Button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-5 py-12 text-center text-slate-500"
                          >
                            暂无字典条目
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-white/70 px-5 py-3 text-xs text-slate-500">
                  创建时间 {formatDateTime(selectedDictionary.createdAt)}
                  ，更新时间 {formatDateTime(selectedDictionary.updatedAt)}
                </div>
              </>
            ) : (
            <div className="grid min-h-[420px] place-items-center text-sm text-slate-500">
                请选择一个字典
              </div>
            )}
          </Card>
        </div>
      </div>

      <FormDrawer
        open={dictionaryDrawerOpen}
        title={editingDictionary ? "编辑字典" : "新建字典"}
        description="字典标识用于接口和业务代码，创建后不建议修改"
        onClose={() => setDictionaryDrawerOpen(false)}
        footer={
          <DrawerFooter
            pending={saveDictionaryMutation.isPending}
            onCancel={() => setDictionaryDrawerOpen(false)}
            onSave={dictionaryForm.handleSubmit((values) =>
              saveDictionaryMutation.mutate(values),
            )}
          />
        }
      >
        <div className="grid gap-4">
          <Field
            label="字典标识"
            error={dictionaryForm.formState.errors.key?.message}
          >
            <Input
              disabled={Boolean(editingDictionary)}
              placeholder="例如 common.status"
              {...dictionaryForm.register("key")}
            />
          </Field>
          <Field
            label="字典名称"
            error={dictionaryForm.formState.errors.name?.message}
          >
            <Input
              placeholder="例如 通用状态"
              {...dictionaryForm.register("name")}
            />
          </Field>
          <Field label="描述">
            <Textarea rows={3} {...dictionaryForm.register("description")} />
          </Field>
          <label className="flex items-center gap-3 rounded-md border border-white/70 bg-white/55 p-3 text-sm">
            <Checkbox
              checked={dictionaryForm.watch("isEnabled")}
              onCheckedChange={(checked) =>
                dictionaryForm.setValue("isEnabled", checked, {
                  shouldValidate: true,
                })
              }
            />
            启用字典
          </label>
          {saveDictionaryMutation.error ? (
            <ErrorBox error={saveDictionaryMutation.error} />
          ) : null}
        </div>
      </FormDrawer>

      <FormDrawer
        open={itemDrawerOpen}
        title={editingItem ? "编辑字典条目" : "新建字典条目"}
        description="显示名称面向用户，取值面向接口和业务代码"
        onClose={() => setItemDrawerOpen(false)}
        footer={
          <DrawerFooter
            pending={saveItemMutation.isPending}
            onCancel={() => setItemDrawerOpen(false)}
            onSave={itemForm.handleSubmit((values) =>
              saveItemMutation.mutate(values),
            )}
          />
        }
      >
        <div className="grid gap-4">
          <Field
            label="显示名称"
            error={itemForm.formState.errors.label?.message}
          >
            <Input placeholder="例如 启用" {...itemForm.register("label")} />
          </Field>
          <Field label="取值" error={itemForm.formState.errors.value?.message}>
            <Input placeholder="例如 enabled" {...itemForm.register("value")} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="颜色">
              <Input
                placeholder="green / gray / red"
                {...itemForm.register("color")}
              />
            </Field>
            <Field
              label="排序"
              error={itemForm.formState.errors.sortOrder?.message}
            >
              <Input type="number" {...itemForm.register("sortOrder")} />
            </Field>
          </div>
          <label className="flex items-center gap-3 rounded-md border border-white/70 bg-white/55 p-3 text-sm">
            <Checkbox
              checked={itemForm.watch("isEnabled")}
              onCheckedChange={(checked) =>
                itemForm.setValue("isEnabled", checked, {
                  shouldValidate: true,
                })
              }
            />
            启用条目
          </label>
          <Field label="扩展数据 JSON">
            <Textarea rows={5} {...itemForm.register("meta")} />
          </Field>
          {itemForm.formState.errors.meta ? (
            <div className="text-xs text-red-600">
              {itemForm.formState.errors.meta.message}
            </div>
          ) : null}
          {saveItemMutation.error ? (
            <ErrorBox error={saveItemMutation.error} />
          ) : null}
        </div>
      </FormDrawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.type === "dictionary" ? "删除字典" : "删除字典条目"
        }
        description={
          deleteTarget?.type === "dictionary"
            ? `确认删除 ${getDictionaryDisplayName(deleteTarget.dictionary)}？系统内置字典不会允许删除。`
            : `确认删除 ${deleteTarget?.item.label ?? ""}？`
        }
        confirmText={deleteMutation.isPending ? "删除中" : "删除"}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
      </PageContainer>
    </GlassPage>
  );
}

function sortItems(a: DictionaryItemRecord, b: DictionaryItemRecord) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.label.localeCompare(b.label);
}

function parseMeta(value: string) {
  const parsed = JSON.parse(value || "{}") as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("扩展数据必须是 JSON 对象");
  }
  return parsed as Record<string, unknown>;
}

function DrawerFooter({
  pending,
  onCancel,
  onSave,
}: {
  pending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel}>
        取消
      </Button>
      <Button disabled={pending} onClick={onSave}>
        <Save className="h-4 w-4" />
        {pending ? "保存中" : "保存"}
      </Button>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {asErrorMessage(error)}
    </div>
  );
}
