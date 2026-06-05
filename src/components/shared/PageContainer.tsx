import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function PageContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-6 sm:py-7 lg:px-8",
        className,
      )}
      {...props}
    />
  );
}
