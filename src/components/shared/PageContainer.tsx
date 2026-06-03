import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function PageContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <main
      className={cn("mx-auto w-full max-w-[1440px] px-8 py-7", className)}
      {...props}
    />
  );
}
