import { cn } from "@/lib/cn";

export function StepHeader({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => (
        <div
          key={step}
          className={cn(
            "rounded-md border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 ease-out",
            index === current
              ? "border-blue-100 bg-white/85 shadow-[0_16px_42px_rgba(37,99,235,0.12)]"
              : "hover:bg-white/75",
          )}
        >
          <div
            className={cn(
              "mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shadow-sm transition-all duration-300",
              index <= current
                ? "bg-white text-blue-700 ring-1 ring-blue-100"
                : "bg-white text-slate-400 ring-1 ring-white/70",
            )}
          >
            {index + 1}
          </div>
          <div className="text-sm font-medium text-slate-950">{step}</div>
        </div>
      ))}
    </div>
  );
}
