import type { ColumnDef } from "@tanstack/react-table";
import { Download, Plus, RefreshCw, Search, ShieldCheck, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { GlassPage, GlassPanel } from "@/components/shared/Glass";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { serverRows } from "@/mocks/data";

type ServerRow = (typeof serverRows)[number];

const stats = [
  { label: "可管节点", value: "18", tone: "text-blue-600" },
  { label: "待巡检", value: "4", tone: "text-amber-600" },
  { label: "异常项", value: "2", tone: "text-red-600" },
  { label: "自动化覆盖", value: "82%", tone: "text-green-600" },
];

export function TableExamplePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => {
    return serverRows.filter((item) => {
      const matchesText =
        `${item.name} ${item.ip} ${item.region} ${item.tags.join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesStatus = status === "all" || item.status === status;
      return matchesText && matchesStatus;
    });
  }, [search, status]);

  const columns: ColumnDef<ServerRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(Boolean(value))
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
    },
    {
      accessorKey: "name",
      header: "节点",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-950">{row.original.name}</div>
          <div className="text-xs text-slate-500">{row.original.id}</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <StatusBadge
          tone={
            row.original.status === "online"
              ? "online"
              : row.original.status === "warning"
                ? "warning"
                : "offline"
          }
        >
          {row.original.status === "online"
            ? "在线"
            : row.original.status === "warning"
              ? "警告"
              : "离线"}
        </StatusBadge>
      ),
    },
    { accessorKey: "ip", header: "公网 IP" },
    {
      accessorKey: "region",
      header: "区域",
      cell: ({ row }) => (
        <span>
          {row.original.flag} {row.original.region}
        </span>
      ),
    },
    {
      accessorKey: "tags",
      header: "闭环标签",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-white/70 bg-white/65 px-2 py-1 text-xs text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "expiresAt",
      header: "续费时间",
      cell: ({ row }) => formatDateTime(row.original.expiresAt),
    },
    {
      id: "actions",
      header: "操作",
      cell: () => (
        <div className="flex gap-3 text-sm">
          <button className="font-medium text-blue-600">详情</button>
          <button className="text-slate-500">巡检</button>
          <button className="text-slate-500">生成</button>
        </div>
      ),
    },
  ];

  return (
    <GlassPage>
      <PageContainer>
        <PageHeader
          title="资源列表工作台"
          description="承接服务器、服务和续费资产的列表型操作体验，作为真实页面的交互样板。"
          actions={
            <>
              <Button variant="secondary" className="bg-white/70">
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
              <Button className="border border-blue-100 bg-white text-blue-700 shadow-sm hover:bg-white/85">
                <Plus className="h-4 w-4" />
                新增资源
              </Button>
            </>
          }
        />

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {stats.map((item) => (
            <GlassPanel key={item.label} className="p-4">
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className={cn("mt-2 text-2xl font-semibold", item.tone)}>{item.value}</div>
            </GlassPanel>
          ))}
        </div>

        <div className="mt-5 space-y-5">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="搜索节点、IP、区域或标签"
          >
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40 border-white/70 bg-white/65">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">状态：全部</SelectItem>
                <SelectItem value="online">在线</SelectItem>
                <SelectItem value="warning">警告</SelectItem>
                <SelectItem value="offline">离线</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
          <DataTable
            data={rows}
            columns={columns}
            toolbar={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Search className="h-4 w-4" />
                  当前筛选 {rows.length} 条资源
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" className="bg-white/70">
                    <Wrench className="h-4 w-4" />
                    批量巡检
                  </Button>
                  <Button variant="secondary" size="sm" className="bg-white/70">
                    <ShieldCheck className="h-4 w-4" />
                    生成预检
                  </Button>
                  <Button variant="secondary" size="sm" className="bg-white/70">
                    <Download className="h-4 w-4" />
                    导出
                  </Button>
                </div>
              </div>
            }
          />
        </div>
      </PageContainer>
    </GlassPage>
  );
}
