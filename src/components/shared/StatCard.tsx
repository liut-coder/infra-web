import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("flex min-h-28 items-center gap-4 p-5", className)}>
      {icon ? (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/80 text-blue-600 shadow-sm ring-1 ring-blue-100">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 truncate text-3xl font-semibold text-foreground">
          {value}
        </div>
        {hint ? (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </div>
    </Card>
  );
}
