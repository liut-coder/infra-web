import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  toolbar?: React.ReactNode;
  className?: string;
  total?: number;
  page?: number;
  pageCount?: number;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
}

export function DataTable<TData>({
  data,
  columns,
  toolbar,
  className,
  total,
  page,
  pageCount,
  onPreviousPage,
  onNextPage,
  isPreviousDisabled,
  isNextDisabled,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const usesExternalPagination = page !== undefined || pageCount !== undefined;
  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: usesExternalPagination
      ? undefined
      : getPaginationRowModel(),
    enableRowSelection: true,
    initialState: {
      pagination: {
        pageSize: usesExternalPagination ? data.length || 10 : 6,
      },
    },
  });
  const currentPage = page ?? table.getState().pagination.pageIndex + 1;
  const totalPages = pageCount ?? table.getPageCount();
  const canPrevious = isPreviousDisabled ?? !table.getCanPreviousPage();
  const canNext = isNextDisabled ?? !table.getCanNextPage();

  return (
    <Card className={cn("overflow-hidden", className)}>
      {toolbar ? <div className="border-b border-white/70 px-5 py-3">{toolbar}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead className="bg-white/60 text-left text-xs font-medium text-slate-500 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border-b border-white/70 px-5 py-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/60 transition-all duration-200 last:border-0 hover:bg-white/62"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-4 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-5 py-12 text-center text-sm text-muted-foreground"
                  colSpan={columns.length}
                >
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/70 bg-white/35 px-5 py-3 text-sm text-slate-500 backdrop-blur">
        <div>共 {total ?? data.length} 条</div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={onPreviousPage ?? (() => table.previousPage())}
            disabled={canPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="rounded-md border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm">
            {currentPage} / {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="secondary"
            size="icon"
            onClick={onNextPage ?? (() => table.nextPage())}
            disabled={canNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
