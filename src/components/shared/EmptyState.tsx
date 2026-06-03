import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title = "暂无数据",
  description = "当前筛选条件下没有可展示的记录。",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-white/70 bg-white/70 px-6 py-12 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
        <Inbox className="h-6 w-6" />
      </div>
      <div className="mt-4 text-base font-semibold">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </div>
      {action ? (
        <div className="mt-5">{action}</div>
      ) : (
        <Button className="mt-5">创建资源</Button>
      )}
    </div>
  );
}
