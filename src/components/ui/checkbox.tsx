import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({
  className,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-white/70 bg-white/70 text-primary accent-[#2563eb] shadow-sm focus:ring-primary/20",
        className,
      )}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  );
}
