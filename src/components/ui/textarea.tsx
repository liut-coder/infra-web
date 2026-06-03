import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-md border border-white/70 bg-white/65 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none backdrop-blur transition-all duration-200 placeholder:text-slate-400 focus:border-blue-200 focus:bg-white/80 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-slate-400",
        className,
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
