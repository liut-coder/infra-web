import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn(
          "z-50 min-w-40 rounded-md border border-white/70 bg-white/82 p-1 text-sm shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-all duration-200 ease-out data-[state=closed]:scale-95 data-[state=open]:scale-100",
          className,
        )}
        sideOffset={8}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-slate-700 outline-none transition-colors hover:bg-white/70 hover:text-slate-950",
        className,
      )}
      {...props}
    />
  );
}
