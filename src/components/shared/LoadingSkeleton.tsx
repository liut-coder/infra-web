import { cn } from "@/lib/cn";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="h-8 w-48 animate-pulse rounded-md border border-white/70 bg-white/65 shadow-sm backdrop-blur" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-lg border border-white/70 bg-white/58 shadow-sm backdrop-blur" />
        <div className="h-28 animate-pulse rounded-lg border border-white/70 bg-white/58 shadow-sm backdrop-blur" />
        <div className="h-28 animate-pulse rounded-lg border border-white/70 bg-white/58 shadow-sm backdrop-blur" />
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-white/70 bg-white/58 shadow-sm backdrop-blur" />
    </div>
  );
}
