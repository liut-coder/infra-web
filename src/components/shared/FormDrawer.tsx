import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface FormDrawerProps {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}

export function FormDrawer({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: FormDrawerProps) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted && !open) return null;

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 transition",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-white/48 backdrop-blur-md transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-[min(92vw,520px)] flex-col border-l border-white/80 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        onTransitionEnd={() => {
          if (!open) setMounted(false);
        }}
      >
        <div className="flex items-start justify-between border-b border-white/75 bg-white/45 px-5 py-4">
          <div>
            <div className="text-base font-semibold">{title}</div>
            {description ? (
              <div className="mt-1 text-sm text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
        {footer ? <div className="border-t border-white/75 bg-white/45 p-4">{footer}</div> : null}
      </aside>
    </div>
  );
}
