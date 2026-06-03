import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-white/70 bg-white/65 px-3 text-sm text-slate-800 shadow-sm outline-none backdrop-blur transition-all duration-200 placeholder:text-slate-400 focus:border-blue-200 focus:bg-white/80 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-white/40 disabled:text-slate-400",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
