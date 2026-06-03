import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { GlassButtonSurface, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listPermissions } from "@/features/admin/api";
import type { PermissionRecord } from "@/features/admin/types";
import { asErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export function AdminPermissionsPage() {
  const [search, setSearch] = useState("");
  const [resource, setResource] = useState("all");
  const [page, setPage] = useState(1);

  const permissionsQuery = useQuery({
    queryKey: ["admin", "permissions", page, search, resource],
    queryFn: () =>
      listPermissions({
        page,
        pageSize: 12,
        q: search || undefined,
        resource: resource === "all" ? undefined : resource,
      }),
  });

  const rows = permissionsQuery.data?.items ?? [];
  const pagination = permissionsQuery.data?.pagination;
  const resources = Array.from(new Set(rows.map((item) => item.resource)));
  const actions = Array.from(new Set(rows.map((item) => item.action)));
  const grouped = rows.reduce<Record<string, PermissionRecord[]>>((groups, item) => {
    groups[item.resource] ??= [];
    groups[item.resource].push(item);
    return groups;
  }, {});

  const columns = useMemo<ColumnDef<PermissionRecord>[]>(
    () => [
      {
        accessorKey: "key",
        header: "权限 Key",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.key}</div>
        ),
      },
      {
        accessorKey: "resource",
        header: "资源",
        cell: ({ row }) => (
          <StatusBadge tone="info">{row.original.resource}</StatusBadge>
        ),
      },
      {
        accessorKey: "action",
        header: "动作",
        cell: ({ row }) => (
          <StatusBadge tone="offline">{row.original.action}</StatusBadge>
        ),
      },
      { accessorKey: "description", header: "描述" },
      {
        accessorKey: "createdAt",
        header: "创建时间",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <GlassPage>
      <PageContainer>
      <PageHeader
        title="权限字典"
        description="展示后端已注册的权限资源和动作，作为 RBAC 配置基础"
        actions={
          <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
            <KeyRound className="h-4 w-4" />
            只读字典
          </GlassButtonSurface>
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["权限总数", (pagination?.total ?? rows.length).toString(), KeyRound],
          ["资源类型", resources.length.toString(), ShieldCheck],
          ["动作类型", actions.length.toString(), KeyRound],
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-950">权限矩阵</div>
            <div className="mt-1 text-sm text-slate-500">按 resource 聚合，辅助角色配置时确认覆盖边界。</div>
          </div>
          <StatusBadge tone="info">{Object.keys(grouped).length} resources</StatusBadge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(grouped).map(([name, items]) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setResource(name);
                setPage(1);
              }}
              className="rounded-md border border-white/70 bg-white/55 p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/85"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-slate-950">{name}</div>
                <StatusBadge tone="info">{items.length}</StatusBadge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {items.slice(0, 4).map((item) => (
                  <span key={item.id} className="rounded bg-white/70 px-2 py-1 text-xs text-slate-500">
                    {item.action}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </GlassPanel>
      <div className="mt-6 space-y-5">
        <FilterBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="搜索权限 key 或描述"
        >
          <Select
            value={resource}
            onValueChange={(value) => {
              setResource(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">资源：全部</SelectItem>
              {resources.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <span className="text-sm text-muted-foreground">
                数据来自 /api/v1/permissions
              </span>
              {permissionsQuery.error ? (
                <span className="text-sm text-red-600">
                  {asErrorMessage(permissionsQuery.error)}
                </span>
              ) : null}
            </div>
          }
        />
      </div>
      </PageContainer>
    </GlassPage>
  );
}
