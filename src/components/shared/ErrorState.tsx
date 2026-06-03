import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "页面加载失败",
  description = "请稍后重试，或联系系统管理员。",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-white/70 bg-white/72 px-6 py-12 text-center shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="mt-4 text-base font-semibold text-slate-950">{title}</div>
      <div className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </div>
      <Button className="mt-5" variant="secondary" onClick={onRetry}>
        重新加载
      </Button>
    </div>
  );
}
