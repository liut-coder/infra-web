import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Clipboard, Database, Eye, FileText, FolderOutput, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { GlassButtonSurface, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { Button } from "@/components/ui/button";
import { listFiles, uploadFile } from "@/features/admin/api";
import type { FileRecord } from "@/features/admin/types";
import { asErrorMessage } from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/format";

export function AdminFilesPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);

  const filesQuery = useQuery({
    queryKey: ["admin", "files", page, search],
    queryFn: () => listFiles({ page, pageSize: 10, q: search || undefined }),
  });

  const uploadMutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      if (inputRef.current) inputRef.current.value = "";
      void queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
    },
  });

  const rows = filesQuery.data?.items ?? [];
  const pagination = filesQuery.data?.pagination;

  const columns = useMemo<ColumnDef<FileRecord>[]>(
    () => [
      {
        accessorKey: "originalName",
        header: "文件名",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.originalName}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.storedName}
            </div>
          </div>
        ),
      },
      { accessorKey: "mimeType", header: "类型" },
      {
        accessorKey: "sizeBytes",
        header: "大小",
        cell: ({ row }) => formatBytes(row.original.sizeBytes),
      },
      {
        accessorKey: "uploadedBy",
        header: "上传者",
        cell: ({ row }) => row.original.uploadedBy || "-",
      },
      {
        accessorKey: "createdAt",
        header: "上传时间",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setSelectedFile(row.original)}>
            <Eye className="h-4 w-4" />
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
        title="文件管理"
        description="上传文件、查看生成物索引，并保留文件记录闭环。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" className="bg-white/70">
              <Link to="/infra/generated">
                <FolderOutput className="h-4 w-4" />
                生成物
              </Link>
            </Button>
            <PermissionGate permission="file:upload" fallback={null}>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                }}
              />
              <Button onClick={() => inputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {uploadMutation.isPending ? "上传中" : "上传文件"}
              </Button>
            </PermissionGate>
          </div>
        }
      />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["文件数量", (pagination?.total ?? rows.length).toString(), FileText],
          ["当前体积", formatBytes(rows.reduce((sum, item) => sum + item.sizeBytes, 0)), Database],
          ["上传接口", "POST /files/upload", Upload],
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-950">文件闭环</div>
            <div className="mt-1 text-sm text-slate-500">
              上传文件进入后端记录；生成物仍由 infra-control 产出，可在生成物页复核和下载。
            </div>
          </div>
          <GlassButtonSurface className="flex h-10 items-center gap-2 px-3 text-sm text-slate-700">
            <Database className="h-4 w-4" />
            {filesQuery.isFetching ? "刷新中" : "已同步"}
          </GlassButtonSurface>
        </div>
      </GlassPanel>
      <div className="mt-5 space-y-5">
        <FilterBar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="搜索文件名"
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
                数据来自 /api/v1/files
              </span>
              {filesQuery.error || uploadMutation.error ? (
                <span className="text-sm text-red-600">
                  {asErrorMessage(filesQuery.error || uploadMutation.error)}
                </span>
              ) : null}
            </div>
          }
        />
      </div>

      <FormDrawer
        open={Boolean(selectedFile)}
        title="文件详情"
        description="查看后端文件记录和可复核路径"
        onClose={() => setSelectedFile(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSelectedFile(null)}>
              关闭
            </Button>
            <Button
              onClick={async () => {
                if (selectedFile?.path) await navigator.clipboard.writeText(selectedFile.path);
              }}
            >
              <Clipboard className="h-4 w-4" />
              复制路径
            </Button>
          </div>
        }
      >
        {selectedFile ? (
          <div className="grid gap-4">
            <div className="grid gap-3">
              {[
                ["文件名", selectedFile.originalName],
                ["存储名", selectedFile.storedName],
                ["MIME", selectedFile.mimeType],
                ["大小", formatBytes(selectedFile.sizeBytes)],
                ["路径", selectedFile.path],
                ["上传者", selectedFile.uploadedBy || "-"],
                ["创建时间", formatDateTime(selectedFile.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/70 bg-white/55 p-3">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 break-all text-sm font-medium text-slate-950">{value}</div>
                </div>
              ))}
            </div>
            <pre className="max-h-72 overflow-auto rounded-md border border-white/70 bg-white/58 p-4 text-xs leading-5 text-slate-700 shadow-inner">
              {JSON.stringify(selectedFile, null, 2)}
            </pre>
          </div>
        ) : null}
      </FormDrawer>
      </PageContainer>
    </GlassPage>
  );
}
